import { deflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { XfaPdfError } from '../errors.js';
import { DecodeBudget } from '../filters.js';
import { PdfReader } from '../reader.js';

const te = new TextEncoder();

/** Deterministic generator so a failure reproduces. */
function rng(seed: number): (n: number) => number {
  let s = seed >>> 0;
  return (n) => {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    return s % n;
  };
}

const NUMBERS = [0, 1, 2, 7, 255, 65_535, 1_000_000, 1_000_001, 16_777_215, 16_777_216, 4_294_967_295, 67_108_864, 9_007_199_254_740_991];

function xrefStreamFile(rnd: (n: number) => number): Uint8Array {
  const pick = (): number => NUMBERS[rnd(NUMBERS.length)] ?? 0;
  const w = [rnd(5), rnd(5), rnd(5)];
  const index = Array.from({ length: 2 * (1 + rnd(3)) }, pick);
  const size = pick();
  const body = deflateSync(new Uint8Array(rnd(2) === 0 ? rnd(64) : rnd(1 << 20)));
  const header = `%PDF-1.7\n1 0 obj\n<</Type/XRef/W[${w.join(' ')}]/Index[${index.join(' ')}]/Size ${size}/Root 1 0 R/Filter/FlateDecode/Length ${body.length}>>\nstream\n`;
  const head = te.encode(header);
  const tail = te.encode(`\nendstream\nendobj\nstartxref\n9\n%%EOF\n`);
  const out = new Uint8Array(head.length + body.length + tail.length);
  out.set(head);
  out.set(body, head.length);
  out.set(tail, head.length + body.length);
  return out;
}

/** Cached Flate bodies of `n` zero bytes (an xref stream whose data really is as long as its rows claim). */
const zeroBodies = new Map<number, Buffer>();
function sizedXrefStreamFile(rnd: (n: number) => number): Uint8Array {
  const claims = [1_000_001, 2_000_000, 16_777_217, 20_000_000, 67_108_864];
  const rows = claims[rnd(claims.length)] ?? 1_000_001;
  let body = zeroBodies.get(rows);
  if (body === undefined) {
    body = deflateSync(new Uint8Array(rows));
    zeroBodies.set(rows, body);
  }
  const head = te.encode(`%PDF-1.7\n1 0 obj\n<</Type/XRef/W[1 0 0]/Index[0 ${rows}]/Size ${rows}/Root 1 0 R/Filter/FlateDecode/Length ${body.length}>>\nstream\n`);
  const tail = te.encode('\nendstream\nendobj\nstartxref\n9\n%%EOF\n');
  const out = new Uint8Array(head.length + body.length + tail.length);
  out.set(head);
  out.set(body, head.length);
  out.set(tail, head.length + body.length);
  return out;
}

/**
 * A packet-like stream whose /Filter, /DecodeParms and /DP are random shapes (names, huge arrays, references to
 * arrays or dictionaries, dictionaries fanning out to shared arrays), the n x m expansion class.
 */
function paramShapeFile(rnd: (n: number) => number): Uint8Array {
  const big = (): number => (rnd(3) === 0 ? rnd(30_000) : rnd(5));
  const repeat = (unit: string, n: number): string => unit.repeat(n);
  const object = (i: number): string => {
    switch (rnd(5)) {
      case 0: return `[${repeat('/A ', big())}]`;
      case 1: return `[${repeat(`${5 + rnd(4)} 0 R `, big())}]`;
      case 2: return `<<${Array.from({ length: big() % 2000 }, (_, k) => `/K${k} ${5 + rnd(4)} 0 R`).join('')}>>`;
      case 3: return rnd(2) === 0 ? '/FlateDecode' : String(i);
      default: return 'null';
    }
  };
  const value = (): string => {
    const r = 5 + rnd(4);
    switch (rnd(6)) {
      case 0: return `${r} 0 R`;
      case 1: return `[${repeat(`${5 + rnd(4)} 0 R `, rnd(6))}]`;
      case 2: return `[${repeat('/FlateDecode ', rnd(4))}]`;
      case 3: return `<<${Array.from({ length: rnd(40) }, (_, k) => `/K${k} ${rnd(2) === 0 ? `${r} 0 R` : '7'}`).join('')}>>`;
      case 4: return '/FlateDecode';
      default: return `[${repeat(`${r} 0 R `, big())}]`;
    }
  };
  const head = '%PDF-1.7\n';
  let body = '';
  const offsets: number[] = [];
  const add = (num: number, text: string): void => {
    offsets[num] = head.length + body.length;
    body += `${num} 0 obj\n${text}\nendobj\n`;
  };
  add(1, '<</Type/Catalog>>');
  add(3, `<</Filter ${value()}/DecodeParms ${value()}/DP ${value()}/Length 0>>\nstream\n\nendstream`);
  for (let i = 5; i < 9; i++) add(i, object(i));
  const at = head.length + body.length;
  const row = (num: number): string => (offsets[num] === undefined ? '0000000000 65535 f \n' : `${String(offsets[num]).padStart(10, '0')} 00000 n \n`);
  let table = 'xref\n0 9\n';
  for (let n = 0; n < 9; n++) table += n === 0 ? '0000000000 65535 f \n' : row(n);
  return te.encode(`${head}${body}${table}trailer\n<</Size 9/Root 1 0 R>>\nstartxref\n${at}\n%%EOF\n`);
}

function classicFile(rnd: (n: number) => number): Uint8Array {
  const pick = (): number => NUMBERS[rnd(NUMBERS.length)] ?? 0;
  let s = '%PDF-1.7\nxref\n';
  for (let k = 0, sections = 1 + rnd(3); k < sections; k++) {
    s += `${pick()} ${pick()}\n${'0000000000 65535 f \n'.repeat(rnd(40))}`;
  }
  s += `trailer\n<</Size ${pick()}/Root 1 0 R>>\nstartxref\n9\n%%EOF\n`;
  return te.encode(s);
}

function bodyFile(rnd: (n: number) => number): Uint8Array {
  const atoms = ['[', ']', '<<', '>>', '1 0 R', '7', '/N', '(s)', '<4142>', 'null', 'true', '%c\n', '#', '{', '}'];
  let body = '';
  for (let i = 0, n = rnd(400); i < n; i++) body += `${atoms[rnd(atoms.length)] ?? ''} `;
  const head = '%PDF-1.7\n';
  const obj = `2 0 obj\n${body}\nendobj\n`;
  const xref = `xref\n0 3\n0000000000 65535 f \n${String(head.length).padStart(10, '0')} 00000 n \n${String(head.length).padStart(10, '0')} 00000 n \n`;
  const at = head.length + obj.length;
  return te.encode(`${head}${obj}${xref}trailer\n<</Size 3/Root 2 0 R>>\nstartxref\n${at}\n%%EOF\n`);
}

describe('hostile structure only ever fails with XfaPdfError (L2-F4/F5)', () => {
  it('random xref-stream, classic-table and object-body shapes: no RangeError, TypeError or hang', async () => {
    const rnd = rng(20260101);
    const leaks: string[] = [];
    let rejected = 0;
    let accepted = 0;
    for (let i = 0; i < 300; i++) {
      const kind = i % 5;
      const bytes =
        kind === 0 ? xrefStreamFile(rnd) : kind === 1 ? classicFile(rnd) : kind === 2 ? bodyFile(rnd) : kind === 3 ? sizedXrefStreamFile(rnd) : paramShapeFile(rnd);
      try {
        const reader = await PdfReader.open(bytes, new DecodeBudget(512 * 1024 * 1024));
        for (let n = 0; n < 9; n++) {
          const v = await reader.get(n);
          if (v !== null && typeof v === 'object' && 'raw' in v) await reader.decodedStream(v);
        }
        accepted += 1;
      } catch (e) {
        if (e instanceof XfaPdfError) rejected += 1;
        else leaks.push(`#${i}/kind${kind}: ${e instanceof Error ? `${e.name}: ${e.message}` : String(e)}`);
      }
    }
    expect(leaks).toEqual([]);
    expect(rejected).toBeGreaterThan(50);
    expect(accepted).toBeGreaterThanOrEqual(0);
  }, 60_000);
});
