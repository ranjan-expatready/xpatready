import { sha1 } from '@noble/hashes/legacy.js';

/**
 * The `checksum` attribute of the XFA `form` packet: SHA-1 over a canonical text of the template packet followed by the
 * datasets packet, Base64-encoded (28 characters). A viewer keeps the saved form state only when the checksum matches the
 * packets it opened, so a form packet written after the data changed is discarded.
 *
 * The canonical text is the one the open-source PDFium reader produces with its own SAX tokenizer (BSD licence, origin
 * Foxit, files `xfa_checksum.cpp` and `fgas_sax.cpp`); this is a port of that tokenizer's observable behaviour, and it
 * reproduces the checksums the desktop viewer wrote on real saved forms (corpus test). The rules, all byte-level on UTF-8:
 * - each start tag is re-emitted as `<name attr="value" ...>` (single quotes, spacing and the newline before `>` vanish),
 *   an empty element as `<name ...></name>`, an end tag as `</name>`; processing instructions as `<?target data?>`;
 * - text is kept verbatim, but a run of whitespace-only text directly before a start tag is dropped;
 * - in text and attribute values `&quot;` and `&apos;` are converted, `&amp;`, `&lt;`, `&gt;` and `&#...;` are kept as written;
 * - comments are kept as `<!--...-->`, CDATA as `<![CDATA[...]]>`; a DOCTYPE or other declaration is dropped.
 * The quirks (one byte buffer shared by names and values, the order of the flushes) are reproduced on purpose: they decide
 * the digest. Nothing here parses XML for meaning; the safe parser (`xml/parse.ts`) does that.
 */

// Tokenizer modes (the reference reader's FX_SAXMODE_*).
const TEXT = 0;
const NODE_START = 1;
const DECL_OR_COMMENT = 2;
const DECL_NODE = 3;
const COMMENT = 4;
const COMMENT_CONTENT = 5;
const TAG_NAME = 6;
const ATTR_NAME = 7;
const ATTR_EQUAL = 8;
const ATTR_VALUE = 9;
const MAYBE_CLOSE = 10;
const TAG_END = 12;
const TARGET_DATA = 13;

// Node kinds (FX_SAXNODE_*).
const UNKNOWN = 0;
const INSTRUCTION = 1;
const COMMENT_NODE = 3;
const TAG = 4;

const LT = 0x3c;
const GT = 0x3e;
const SLASH = 0x2f;
const QUESTION = 0x3f;
const BANG = 0x21;
const DASH = 0x2d;
const EQUALS = 0x3d;
const AMP = 0x26;
const SEMI = 0x3b;
const QUOTE = 0x22;
const APOS = 0x27;
const SPACE = 0x20;

const ascii = (text: string): Uint8Array => Uint8Array.from(text, (c) => c.charCodeAt(0));
const CDATA_OPEN = ascii('<![CDATA[');
const CDATA_CLOSE = ascii(']]>');
const CDATA_MARK = ascii('[CDATA[');
/** Entities converted to a character (`&quot;`, `&apos;`); every other entity stays as written. */
const CONVERTED: ReadonlyMap<string, number> = new Map([
  ['quot', QUOTE],
  ['apos', APOS],
]);
/** Length of both converted entity names. */
const ENTITY_NAME_LENGTH = 4;

/** A growable byte buffer. */
class Bytes {
  #data = new Uint8Array(256);
  length = 0;

  get data(): Uint8Array {
    return this.#data;
  }

  /** Writes `byte` at `at`, growing as needed (the reference writes at its shared position, not always at the end). */
  set(at: number, byte: number): void {
    if (at >= this.#data.length) {
      const grown = new Uint8Array(Math.max(this.#data.length * 2, at + 1));
      grown.set(this.#data);
      this.#data = grown;
    }
    this.#data[at] = byte;
  }

  push(byte: number): void {
    this.set(this.length, byte);
    this.length += 1;
  }

  pushAll(bytes: Uint8Array): void {
    for (const b of bytes) this.push(b);
  }

  view(from: number, to: number): Uint8Array {
    return this.#data.subarray(from, to);
  }
}

type Hash = ReturnType<typeof sha1.create>;

/** The reference reader's checksum handler: rebuilds the canonical text and feeds it to the digest in the same chunks. */
class Canonical {
  readonly #hash: Hash;
  readonly #out = new Bytes();
  #kind = UNKNOWN;
  #tagName: Uint8Array = new Uint8Array(0);

  constructor(hash: Hash) {
    this.#hash = hash;
  }

  flush(skipBlank: boolean): void {
    const n = this.#out.length;
    if (n < 1) return;
    const text = this.#out.view(0, n);
    if (!skipBlank || text.some((b) => b > SPACE)) this.#hash.update(text);
    this.#out.length = 0;
  }

  enter(name: Uint8Array, kind: number): boolean {
    this.flush(true);
    if (kind !== TAG && kind !== INSTRUCTION) return false;
    this.#kind = kind;
    this.#out.push(LT);
    if (kind === INSTRUCTION) this.#out.push(QUESTION);
    this.#out.pushAll(name);
    this.#tagName = name.slice();
    return true;
  }

  attribute(name: Uint8Array, value: Uint8Array): void {
    this.#out.push(SPACE);
    this.#out.pushAll(name);
    this.#out.push(EQUALS);
    this.#out.push(QUOTE);
    this.#out.pushAll(value);
    this.#out.push(QUOTE);
  }

  tagBreak(): void {
    this.#out.push(GT);
    this.flush(false);
  }

  text(data: Uint8Array, cdata: boolean): void {
    if (cdata) this.#out.pushAll(CDATA_OPEN);
    this.#out.pushAll(data);
    if (cdata) this.#out.pushAll(CDATA_CLOSE);
  }

  close(): void {
    if (this.#kind === INSTRUCTION) {
      this.#out.push(QUESTION);
      this.#out.push(GT);
    } else if (this.#kind === TAG) {
      this.#out.push(GT);
      this.#out.push(LT);
      this.#out.push(SLASH);
      this.#out.pushAll(this.#tagName);
      this.#out.push(GT);
    }
    this.flush(false);
  }

  end(name: Uint8Array): void {
    this.#out.push(LT);
    this.#out.push(SLASH);
    this.#out.pushAll(name);
    this.#out.push(GT);
    this.flush(false);
  }

  comment(data: Uint8Array): void {
    this.#out.pushAll(ascii('<!--'));
    this.#out.pushAll(data);
    this.#out.pushAll(ascii('-->'));
    this.flush(false);
  }

  instructionData(data: Uint8Array): void {
    this.#out.push(SPACE);
    this.#out.pushAll(data);
  }
}

interface Item {
  kind: number;
  /** True once the handler accepted the node (the reference keeps a context pointer, null for nodes it ignores). */
  active: boolean;
}

/** The reference reader's SAX tokenizer, restricted to the parse mode the checksum uses. */
class Tokenizer {
  readonly #h: Canonical;
  readonly #data = new Bytes();
  readonly #name = new Bytes();
  /** One position shared by the data and the name buffer, as in the reference. */
  #pos = 0;
  #entityStart = -1;
  #nameLength = 0;
  #dataLength = 0;
  #skipChar = 0;
  readonly #skipStack: number[] = [];
  readonly #stack: Item[] = [{ kind: UNKNOWN, active: false }];
  #mode = TEXT;
  #prevMode = TEXT;
  #cdata = false;
  #tail = 0;
  #byte = 0;

  constructor(handler: Canonical) {
    this.#h = handler;
  }

  run(input: Uint8Array): void {
    for (const byte of input) {
      this.#byte = byte;
      this.#step();
    }
  }

  get #cur(): Item {
    return this.#stack[this.#stack.length - 1] ?? { kind: UNKNOWN, active: false };
  }

  #push(): void {
    this.#stack.push({ kind: UNKNOWN, active: false });
  }

  #pop(): void {
    if (this.#stack.length > 1) this.#stack.pop();
  }

  #appendData(byte: number): void {
    this.#data.set(this.#pos, byte);
    this.#pos += 1;
  }

  #appendName(byte: number): void {
    this.#name.set(this.#pos, byte);
    this.#pos += 1;
  }

  #dataBytes(): Uint8Array {
    return this.#data.view(0, this.#dataLength);
  }

  #step(): void {
    switch (this.#mode) {
      case TEXT:
        return this.#text();
      case NODE_START:
        return this.#nodeStart();
      case DECL_OR_COMMENT:
        return this.#declOrComment();
      case DECL_NODE:
        return this.#skipNode();
      case COMMENT:
        this.#mode = COMMENT_CONTENT;
        return;
      case COMMENT_CONTENT:
        return this.#commentContent();
      case TAG_NAME:
        return this.#tagName();
      case ATTR_NAME:
        return this.#attrName();
      case ATTR_EQUAL:
        return this.#attrEqual();
      case ATTR_VALUE:
        return this.#attrValue();
      case MAYBE_CLOSE:
        return this.#maybeClose();
      case TAG_END:
        return this.#tagEnd();
      default:
        return this.#targetData();
    }
  }

  /** Stores a text or value byte, converting `&quot;` / `&apos;` once their `;` arrives. */
  #char(byte: number): void {
    this.#data.set(this.#pos, byte);
    if (this.#entityStart > -1 && byte === SEMI) {
      const start = this.#entityStart;
      // Only a four-letter name can be converted; anything longer is never decoded (no unbounded string building).
      const named = this.#pos - start - 1 === ENTITY_NAME_LENGTH ? String.fromCharCode(...this.#data.view(start + 1, this.#pos)) : '';
      const converted = CONVERTED.get(named);
      this.#entityStart = -1;
      if (converted !== undefined) {
        this.#data.set(start, converted);
        this.#pos = start + 1;
      } else {
        this.#pos += 1;
      }
      return;
    }
    if (this.#entityStart < 0 && byte === AMP) this.#entityStart = this.#pos;
    this.#pos += 1;
  }

  #text(): void {
    if (this.#byte === LT) {
      if (this.#pos > 0) {
        this.#dataLength = this.#pos;
        this.#pos = 0;
        this.#notifyData();
      }
      this.#push();
      this.#mode = NODE_START;
      return;
    }
    this.#char(this.#byte);
  }

  #nodeStart(): void {
    const b = this.#byte;
    if (b === QUESTION) {
      this.#cur.kind = INSTRUCTION;
      this.#mode = TAG_NAME;
    } else if (b === BANG) {
      this.#mode = DECL_OR_COMMENT;
    } else if (b === SLASH) {
      this.#mode = TAG_END;
    } else if (b === GT) {
      this.#pop();
      this.#mode = TEXT;
    } else if (b > SPACE) {
      this.#cur.kind = TAG;
      this.#mode = TAG_NAME;
      this.#appendData(b);
    }
  }

  #declOrComment(): void {
    if (this.#byte === DASH) {
      this.#mode = COMMENT;
      this.#cur.kind = COMMENT_NODE;
      this.#tail = 0;
      return;
    }
    this.#mode = DECL_NODE;
    this.#skipChar = GT;
    this.#skipStack.push(GT);
    this.#skipNode();
  }

  #commentContent(): void {
    const b = this.#byte;
    if (b === DASH) {
      this.#tail += 1;
    } else if (b === GT && this.#tail === 2) {
      this.#dataLength = this.#pos;
      this.#pos = 0;
      if (this.#cur.kind === COMMENT_NODE) this.#h.comment(this.#dataBytes());
      this.#pop();
      this.#mode = TEXT;
    } else {
      for (; this.#tail > 0; this.#tail -= 1) this.#appendData(DASH);
      this.#appendData(b);
    }
  }

  #tagName(): void {
    const b = this.#byte;
    if (b <= SPACE || b === SLASH || b === GT || b === QUESTION) {
      this.#dataLength = this.#pos;
      this.#pos = 0;
      this.#notifyEnter();
      if (b <= SPACE) {
        this.#mode = ATTR_NAME;
      } else if (b === SLASH || b === QUESTION) {
        this.#prevMode = this.#mode;
        this.#mode = MAYBE_CLOSE;
      } else {
        this.#notifyBreak();
        this.#mode = TEXT;
      }
      return;
    }
    this.#appendData(b);
  }

  #attrName(): void {
    const b = this.#byte;
    if (b <= SPACE || b === EQUALS) {
      if (this.#pos < 1 && b <= SPACE) return;
      this.#nameLength = this.#pos;
      this.#pos = 0;
      this.#skipChar = 0;
      this.#mode = b === EQUALS ? ATTR_VALUE : ATTR_EQUAL;
      return;
    }
    if (b === SLASH || b === GT || b === QUESTION) {
      if (b === GT) {
        this.#notifyBreak();
        this.#mode = TEXT;
      } else {
        this.#prevMode = this.#mode;
        this.#mode = MAYBE_CLOSE;
      }
      return;
    }
    this.#appendName(b);
  }

  #attrEqual(): void {
    if (this.#byte === EQUALS) {
      this.#skipChar = 0;
      this.#mode = ATTR_VALUE;
    } else if (this.#cur.kind === INSTRUCTION) {
      this.#pos = this.#nameLength;
      this.#appendName(SPACE);
      this.#mode = TARGET_DATA;
      this.#targetData();
    }
  }

  #attrValue(): void {
    const b = this.#byte;
    if (this.#skipChar !== 0) {
      if (b === this.#skipChar) {
        this.#dataLength = this.#pos;
        this.#pos = 0;
        const item = this.#cur;
        if (item.active && (item.kind === TAG || item.kind === INSTRUCTION)) this.#h.attribute(this.#name.view(0, this.#nameLength), this.#dataBytes());
        this.#skipChar = 0;
        this.#mode = ATTR_NAME;
        return;
      }
      this.#char(b);
      return;
    }
    if (b <= SPACE) return;
    if (this.#pos < 1 && (b === APOS || b === QUOTE)) this.#skipChar = b;
  }

  #maybeClose(): void {
    const b = this.#byte;
    if (b === GT) {
      if (this.#cur.kind === INSTRUCTION) {
        this.#nameLength = this.#pos;
        this.#pos = 0;
        if (this.#cur.active) this.#h.instructionData(this.#name.view(0, this.#nameLength));
      }
      const item = this.#cur;
      if (item.active && (item.kind === TAG || item.kind === INSTRUCTION)) this.#h.close();
      this.#pop();
      this.#mode = TEXT;
    } else if (this.#prevMode === TAG_NAME) {
      this.#appendData(SLASH);
      this.#mode = TAG_NAME;
      this.#prevMode = TEXT;
      this.#tagName();
    } else if (this.#prevMode === ATTR_NAME) {
      this.#appendName(SLASH);
      this.#mode = ATTR_NAME;
      this.#prevMode = TEXT;
      this.#attrName();
    } else if (this.#prevMode === TARGET_DATA) {
      this.#appendName(QUESTION);
      this.#mode = TARGET_DATA;
      this.#prevMode = TEXT;
      this.#targetData();
    }
  }

  #tagEnd(): void {
    const b = this.#byte;
    if (b <= SPACE) return;
    if (b === GT) {
      this.#pop();
      this.#dataLength = this.#pos;
      this.#pos = 0;
      const item = this.#cur;
      if (item.active && item.kind === TAG) this.#h.end(this.#dataBytes().slice());
      this.#pop();
      this.#mode = TEXT;
      return;
    }
    this.#char(b);
  }

  #targetData(): void {
    if (this.#byte === QUESTION) {
      this.#prevMode = this.#mode;
      this.#mode = MAYBE_CLOSE;
    } else {
      this.#appendName(this.#byte);
    }
  }

  /** Declarations (`<!DOCTYPE ...>`, `<![CDATA[...]]>`): skipped with bracket matching; a CDATA section is reported as text. */
  #skipNode(): void {
    const b = this.#byte;
    let depth = this.#skipStack.length;
    if (this.#skipChar === APOS || this.#skipChar === QUOTE) {
      if (b !== this.#skipChar) return;
      this.#skipStack.pop();
      depth -= 1;
      this.#skipChar = this.#skipStack[depth - 1] ?? 0;
      return;
    }
    const opener = b === LT ? GT : b === 0x5b ? 0x5d : b === 0x28 ? 0x29 : b === APOS || b === QUOTE ? b : 0;
    if (opener !== 0) {
      this.#skipChar = opener;
      this.#skipStack.push(opener);
    } else if (b === this.#skipChar) {
      this.#skipStack.pop();
      depth -= 1;
      this.#skipChar = this.#skipStack[depth - 1] ?? 0;
      if (depth === 0 && b === GT) {
        this.#dataLength = this.#pos;
        this.#pos = 0;
        this.#endDeclaration();
        this.#mode = TEXT;
      }
    }
    if (depth > 0) this.#char(b);
  }

  #endDeclaration(): void {
    const data = this.#dataBytes();
    const n = data.length;
    const isCdata = n >= 9 && CDATA_MARK.every((c, i) => data[i] === c) && data[n - 2] === 0x5d && data[n - 1] === 0x5d;
    this.#pop();
    if (!isCdata) return;
    this.#dataLength = n - 9;
    this.#data.data.copyWithin(0, 7, 7 + this.#dataLength);
    this.#cdata = true;
    this.#notifyData();
    this.#cdata = false;
  }

  #notifyData(): void {
    const item = this.#cur;
    if (item.kind === TAG && item.active) this.#h.text(this.#dataBytes(), this.#cdata);
  }

  #notifyEnter(): void {
    const item = this.#cur;
    if (item.kind === TAG || item.kind === INSTRUCTION) item.active = this.#h.enter(this.#dataBytes(), item.kind);
  }

  #notifyBreak(): void {
    const item = this.#cur;
    if (item.kind === TAG && item.active) this.#h.tagBreak();
  }
}

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0;
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    const n = (a << 16) | ((b ?? 0) << 8) | (c ?? 0);
    out += BASE64.charAt((n >> 18) & 63) + BASE64.charAt((n >> 12) & 63);
    out += b === undefined ? '=' : BASE64.charAt((n >> 6) & 63);
    out += c === undefined ? '=' : BASE64.charAt(n & 63);
  }
  return out;
}

/** The form packet checksum over `packets` (the template packet, then the datasets packet), as the viewer computes it. */
export function formChecksum(packets: readonly Uint8Array[]): string {
  const hash = sha1.create();
  for (const packet of packets) new Tokenizer(new Canonical(hash)).run(packet);
  return base64(hash.digest());
}
