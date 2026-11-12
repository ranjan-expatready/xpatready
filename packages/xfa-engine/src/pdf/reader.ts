import { malformed, XfaPdfError } from './errors.js';
import { DecodeBudget } from './filters.js';
import { PdfLexer } from './lexer.js';
import { MAX_FILTER_CHAIN, MAX_PARAM_REF_HOPS } from './limits.js';
import { PARSE_NODE_COST, parseIndirectAt, parseValue, tokenIndex } from './object-parser.js';
import { decryptIndirect } from './security/decrypt-object.js';
import { createStandardHandler, type SecurityHandler } from './security/standard-handler.js';
import { readXrefChain, type XrefEntry } from './xref.js';
import { asNonNegInt, isPdfName, isPdfRef, isPdfStream, isPdfString, type PdfDict, type PdfRef, type PdfStream, type PdfValue } from './types.js';

interface ObjStm {
  readonly data: Uint8Array;
  readonly first: number;
  readonly nums: readonly number[];
  readonly offsets: readonly number[];
}

/**
 * How an object is being loaded:
 * - `object`: a normal resolve; an indirect /Length is resolved via a nested `length-target` load.
 * - `length-target`: the object IS a /Length value, so it must be a plain integer object; it is parsed
 *   WITHOUT a length resolver, which makes length chains and self-referencing lengths fail at the first hop.
 * - `container`: an object stream; ISO 32000-1 §7.5.7 forbids its /Length value from being compressed.
 * - `container-target`: an object a container's /Filter or /DecodeParms refers to. Parsed WITHOUT a length resolver
 *   and never cached (like `length-target`, but decrypted): a stream there fails at once, whereas resolving its
 *   indirect /Length could await the very object stream being decoded.
 */
type LoadMode = 'object' | 'length-target' | 'container' | 'container-target';

/** Internal signal: parsing a stream needs its indirect /Length resolved (asynchronously). */
class NeedLength extends Error {
  readonly ref: PdfRef;
  constructor(ref: PdfRef) {
    super('indirect /Length');
    this.ref = ref;
  }
}

/**
 * Resolves indirect objects: classic/stream xref, `/Prev` updates, object streams. Documents encrypted with
 * the Standard handler (V4/R4/AESV2, empty user password) are decrypted transparently; stream `raw` bytes are
 * returned decrypted, still filter-encoded. Anything else encrypted is rejected at `open`.
 */
export class PdfReader {
  readonly trailer: PdfDict;
  /** Offset of the newest xref section: the `/Prev` of an incremental update appended to this file. */
  readonly startxref: number;
  /** Highest object number with an xref entry (free entries included), whatever the trailer /Size claims. */
  readonly maxObjectNumber: number;
  private readonly bytes: Uint8Array;
  private readonly entries: Map<number, XrefEntry>;
  private readonly budget: DecodeBudget;
  private readonly objStms = new Map<number, Promise<ObjStm>>();
  /** Resolved top-level objects by object number, so a repeated reference neither re-parses nor re-copies stream bytes. */
  private readonly objects = new Map<number, Promise<PdfValue | PdfStream>>();
  /** Charges parsed structure to the reader budget (handed to the object parser). */
  private readonly charge = (bytes: number): void => this.budget.charge(bytes);
  private security: SecurityHandler | undefined;
  /** Object number of an indirect /Encrypt dictionary, whose strings are never decrypted. */
  private encryptNum: number | undefined;

  private constructor(bytes: Uint8Array, entries: Map<number, XrefEntry>, trailer: PdfDict, startxref: number, budget: DecodeBudget) {
    this.bytes = bytes;
    this.entries = entries;
    this.trailer = trailer;
    this.startxref = startxref;
    let max = 0;
    for (const num of entries.keys()) if (num > max) max = num;
    this.maxObjectNumber = max;
    this.budget = budget;
  }

  /** `budget` caps total decoded bytes for this reader (xref streams included); injectable for tests only. */
  static async open(bytes: Uint8Array, budget: DecodeBudget = new DecodeBudget()): Promise<PdfReader> {
    const chain = await readXrefChain(bytes, budget);
    const reader = new PdfReader(bytes, chain.entries, chain.trailer, chain.startxref, budget);
    await reader.initSecurity();
    return reader;
  }

  /** Number of cached resolved objects (internal; lets tests prove the cache was released). */
  get cacheSize(): number {
    return this.objects.size;
  }

  /**
   * Drops the resolved-object and object-stream caches so a long-lived handle does not keep decrypted stream bytes
   * alive. Later resolves still work: they re-parse (and are charged to the budget again).
   */
  releaseCache(): void {
    this.objects.clear();
    this.objStms.clear();
  }

  /** The document's security handler (undefined when unencrypted); the incremental writer re-encrypts with it. */
  get securityHandler(): SecurityHandler | undefined {
    return this.security;
  }

  private async initSecurity(): Promise<void> {
    const raw = this.trailer.get('Encrypt');
    if (raw === undefined || raw === null) return;
    let dict: PdfValue | PdfStream = raw;
    if (isPdfRef(raw)) {
      if (this.entries.get(raw.num)?.type === 'compressed') {
        throw new XfaPdfError('MALFORMED', '/Encrypt dictionary is stored in an object stream (ISO 32000-1 7.6.1)');
      }
      dict = await this.resolve(raw);
      this.encryptNum = raw.num;
    }
    if (!(dict instanceof Map)) throw new XfaPdfError('MALFORMED', '/Encrypt is not a dictionary');
    this.security = await createStandardHandler(dict, this.documentId());
  }

  /** First element of the trailer /ID (Alg. 2 input); absent means empty, which cannot verify against a real /U. */
  private documentId(): Uint8Array {
    const id = this.trailer.get('ID');
    if (id === undefined || id === null) return new Uint8Array(0);
    const first = Array.isArray(id) ? id[0] : undefined;
    if (!isPdfString(first)) throw new XfaPdfError('MALFORMED', 'Trailer /ID must be an array of strings');
    return first.bytes;
  }

  /** Resolves a reference. Missing/free objects and generation mismatches are `null` (ISO 32000-1 §7.3.10). */
  resolve(ref: PdfRef): Promise<PdfValue | PdfStream> {
    return this.load(ref.num, ref.gen, 'object');
  }

  /** Resolves by object number using the generation recorded in the xref. */
  get(num: number): Promise<PdfValue | PdfStream> {
    return this.load(num, undefined, 'object');
  }

  async decodedStream(target: PdfRef | PdfStream): Promise<Uint8Array> {
    const value = isPdfStream(target) ? target : await this.resolve(target);
    if (!isPdfStream(value)) throw new XfaPdfError('MALFORMED', 'Object is not a stream');
    return this.decode(value, false);
  }

  /**
   * Decodes with indirect /Filter and /DecodeParms resolved first (ISO 32000-1 Table 5 allows them), charging the budget.
   * For an object-stream container such refs must not be compressed: resolving one would await the very
   * object stream being decoded (deadlock), mirroring the §7.5.7 rule already applied to the container's /Length.
   */
  private async decode(stream: PdfStream, container: boolean): Promise<Uint8Array> {
    const dict: PdfDict = new Map(stream.dict);
    for (const key of ['Filter', 'DecodeParms', 'DP']) {
      const v = stream.dict.get(key);
      if (v !== undefined) dict.set(key, key === 'Filter' ? await this.filterParam(v, container) : await this.parmsParam(v, container));
    }
    return this.budget.decode({ dict, raw: stream.raw });
  }

  /**
   * Follows references (at most 3 hops) to the value they stand for WITHOUT copying it; each hop is charged. A missing
   * or stream target is rejected. The returned value is the reader's cached object: callers must not mutate it.
   */
  private async deref(v: PdfValue, container: boolean): Promise<PdfValue> {
    let cur = v;
    for (let hop = 0; isPdfRef(cur); hop++) {
      if (hop >= MAX_PARAM_REF_HOPS) throw new XfaPdfError('MALFORMED', 'Stream dictionary references nest too deeply');
      this.charge(PARSE_NODE_COST);
      if (container && this.entries.get(cur.num)?.type === 'compressed') {
        throw new XfaPdfError('MALFORMED', 'Object stream has a /Filter or /DecodeParms stored in an object stream');
      }
      const target = await this.load(cur.num, cur.gen, container ? 'container-target' : 'object');
      if (target === null || isPdfStream(target)) {
        throw new XfaPdfError('MALFORMED', `Stream dictionary references object ${cur.num}, which is missing or a stream`);
      }
      cur = target;
    }
    return cur;
  }

  /**
   * /Filter: null, a name, or an array of at most MAX_FILTER_CHAIN names, each possibly indirect. The shape (and the
   * array length) is checked on the resolved-but-uncopied value BEFORE any element is visited, so a reference to a huge
   * array, or many references to one, can never be expanded.
   */
  private async filterParam(v: PdfValue, container: boolean): Promise<PdfValue> {
    const top = await this.deref(v, container);
    if (top === null || isPdfName(top)) return top;
    if (!Array.isArray(top) || top.length > MAX_FILTER_CHAIN) {
      throw new XfaPdfError('MALFORMED', `Stream /Filter must be a name or an array of at most ${MAX_FILTER_CHAIN} names`);
    }
    const out: PdfValue[] = [];
    for (const e of top) {
      this.charge(PARSE_NODE_COST);
      const name = await this.deref(e, container);
      if (!isPdfName(name)) throw new XfaPdfError('MALFORMED', 'Stream /Filter array entries must be names');
      out.push(name);
    }
    return out;
  }

  /** /DecodeParms and /DP: null, a dictionary, or an array of at most MAX_FILTER_CHAIN of those; dictionary values are scalars. */
  private async parmsParam(v: PdfValue, container: boolean): Promise<PdfValue> {
    const top = await this.deref(v, container);
    if (top === null) return null;
    if (top instanceof Map) return this.parmsDict(top, container);
    if (!Array.isArray(top) || top.length > MAX_FILTER_CHAIN) {
      throw new XfaPdfError('MALFORMED', `Stream /DecodeParms must be a dictionary or an array of at most ${MAX_FILTER_CHAIN} dictionaries`);
    }
    const out: PdfValue[] = [];
    for (const e of top) {
      this.charge(PARSE_NODE_COST);
      const d = await this.deref(e, container);
      if (d !== null && !(d instanceof Map)) throw new XfaPdfError('MALFORMED', 'Stream /DecodeParms array entries must be dictionaries or null');
      out.push(d === null ? null : await this.parmsDict(d, container));
    }
    return out;
  }

  private async parmsDict(dict: PdfDict, container: boolean): Promise<PdfDict> {
    const out: PdfDict = new Map();
    for (const [key, e] of dict) {
      this.charge(PARSE_NODE_COST);
      const value = await this.deref(e, container);
      if (Array.isArray(value) || value instanceof Map) throw new XfaPdfError('MALFORMED', 'Stream /DecodeParms values must be scalars');
      out.set(key, value);
    }
    return out;
  }

  private load(num: number, gen: number | undefined, mode: LoadMode): Promise<PdfValue | PdfStream> {
    const entry = this.entries.get(num);
    if (entry === undefined || entry.type === 'free') return Promise.resolve(null);
    if (entry.type === 'compressed' && gen !== undefined && gen !== 0) return Promise.resolve(null);
    if (entry.type === 'offset' && gen !== undefined && gen !== entry.gen) return Promise.resolve(null);
    if (mode !== 'object') return this.loadTop(num, entry, mode);
    let cached = this.objects.get(num);
    if (cached === undefined) {
      cached = this.loadTop(num, entry, mode);
      this.objects.set(num, cached);
    }
    return cached;
  }

  private loadTop(num: number, entry: Exclude<XrefEntry, { type: 'free' }>, mode: LoadMode): Promise<PdfValue | PdfStream> {
    return entry.type === 'compressed' ? this.loadCompressed(num, entry) : this.loadAt(num, entry.offset, mode);
  }

  private async loadAt(num: number, offset: number, mode: LoadMode): Promise<PdfValue | PdfStream> {
    let parsed;
    if (mode === 'length-target' || mode === 'container-target') {
      parsed = parseIndirectAt(this.bytes, offset, undefined, this.charge);
    } else {
      try {
        parsed = parseIndirectAt(
          this.bytes,
          offset,
          (ref) => {
            throw new NeedLength(ref);
          },
          this.charge,
        );
      } catch (e) {
        if (!(e instanceof NeedLength)) throw e;
        if (mode === 'container' && this.entries.get(e.ref.num)?.type === 'compressed') {
          throw malformed(`Object stream ${num} has a /Length stored in an object stream (ISO 32000-1 7.5.7)`, offset);
        }
        const length = await this.load(e.ref.num, e.ref.gen, 'length-target');
        if (typeof length !== 'number') throw malformed(`Object ${num} has an unresolvable /Length`, offset);
        parsed = parseIndirectAt(this.bytes, offset, () => length, this.charge);
      }
    }
    if (parsed.num !== num) throw malformed(`Xref points at object ${parsed.num}, expected ${num}`, offset);
    // The parser copied the stream's bytes out of the file: charge them (decode never charges unfiltered raw bytes again).
    if (isPdfStream(parsed.value)) this.budget.charge(parsed.value.raw.length);
    if (this.security === undefined || num === this.encryptNum || mode === 'length-target') return parsed.value;
    const decrypted = await decryptIndirect(this.security, parsed.num, parsed.gen, parsed.value);
    // Decryption made a second copy of the stream bytes.
    if (isPdfStream(decrypted) && isPdfStream(parsed.value) && decrypted.raw !== parsed.value.raw) this.budget.charge(decrypted.raw.length);
    return decrypted;
  }

  private async loadCompressed(num: number, entry: Extract<XrefEntry, { type: 'compressed' }>): Promise<PdfValue> {
    const stm = await this.objStm(entry.objStm);
    const i = entry.index;
    const memberNum = stm.nums[i];
    const memberOffset = stm.offsets[i];
    if (memberNum === undefined || memberOffset === undefined) {
      throw new XfaPdfError('MALFORMED', `Object stream ${entry.objStm} has no index ${i}`);
    }
    if (memberNum !== num) {
      throw new XfaPdfError('MALFORMED', `Object stream ${entry.objStm} index ${i} holds object ${memberNum}, expected ${num}`);
    }
    const at = stm.first + memberOffset;
    if (at >= stm.data.length) throw new XfaPdfError('MALFORMED', `Object stream ${entry.objStm} member offset is outside the stream`);
    return parseValue(new PdfLexer(stm.data, at), this.charge);
  }

  /** Each object stream is decoded and indexed once; concurrent first readers share the same promise. */
  private objStm(num: number): Promise<ObjStm> {
    let p = this.objStms.get(num);
    if (p === undefined) {
      p = this.readObjStm(num);
      this.objStms.set(num, p);
    }
    return p;
  }

  private async readObjStm(num: number): Promise<ObjStm> {
    const entry = this.entries.get(num);
    if (entry === undefined || entry.type !== 'offset') {
      throw new XfaPdfError('MALFORMED', `Object stream ${num} is missing or not stored as a top-level object`);
    }
    const container = await this.loadAt(num, entry.offset, 'container');
    if (!isPdfStream(container)) throw malformed(`Object ${num} is not a stream`, entry.offset);
    const n = asNonNegInt(container.dict.get('N'));
    const first = asNonNegInt(container.dict.get('First'));
    if (n === undefined || first === undefined) throw malformed(`Object stream ${num} has invalid /N or /First`, entry.offset);
    const data = await this.decode(container, true);
    // Each header pair needs at least 4 bytes ("n o "), so N is bounded by the decoded length.
    if (first > data.length || n * 4 > data.length) throw malformed(`Object stream ${num} /N or /First exceeds its data`, entry.offset);
    // The header tables below cost two array slots per member: charge them before building them.
    this.budget.charge(n * PARSE_NODE_COST);
    const lexer = new PdfLexer(data, 0);
    const nums: number[] = [];
    const offsets: number[] = [];
    for (let i = 0; i < n; i++) {
      const objNum = tokenIndex(lexer.nextToken());
      const objOffset = tokenIndex(lexer.nextToken());
      if (objNum === undefined || objOffset === undefined) throw malformed(`Object stream ${num} header is truncated`, entry.offset);
      nums.push(objNum);
      offsets.push(objOffset);
    }
    return { data, first, nums, offsets };
  }
}
