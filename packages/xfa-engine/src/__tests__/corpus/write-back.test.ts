import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { parseXml } from '../../xml/parse.js';
import { createFormRuntime } from '../../runtime/runtime.js';
import type { FormRuntime } from '../../runtime/options.js';
import { openXfaPdf, type XfaPdf } from '../../xfa-pdf.js';
import { loadFixture } from '../fixtures/form-data/apply.js';
import { blankSession, canonicalSom, corpusPdf, filledOutcome, FORM_CASES, NOON_UTC, TEST_HOST, type FormCase, type Outcome } from './form-cases.js';

const scratch = mkdtempSync(join(tmpdir(), 'xfa-writeback-'));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

/** `qpdf --check` on the bytes: exit status, and the text it printed (warnings go to stderr, the verdict to stdout). */
function qpdfCheck(name: string, bytes: Uint8Array): { status: number; text: string } {
  const path = join(scratch, name);
  writeFileSync(path, bytes);
  try {
    return { status: 0, text: execFileSync('qpdf', ['--check', path], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (error) {
    const failed = error as { status?: number; stdout?: string; stderr?: string };
    return { status: failed.status ?? 1, text: `${failed.stdout ?? ''}${failed.stderr ?? ''}` };
  }
}

const reopened: FormRuntime[] = [];
afterAll(() => {
  for (const rt of reopened.splice(0)) rt.dispose();
});

async function reload(c: FormCase, bytes: Uint8Array): Promise<FormRuntime> {
  const runtime = await createFormRuntime(await openXfaPdf(bytes), { host: TEST_HOST, clock: { now: () => NOON_UTC }, strict: c.strict });
  reopened.push(runtime);
  runtime.load();
  return runtime;
}

const childNames = (xml: string): string[] => Array.from(parseXml(xml).documentElement?.childNodes ?? []).filter((n) => n.nodeType === 1).map((n) => n.nodeName);

describe.each(FORM_CASES)('A1: write-back on real form $file', (c) => {
  const fixture = loadFixture(c.form);
  let outcome: Outcome;
  let saved: Uint8Array;
  let source: XfaPdf;
  const run = async (): Promise<void> => {
    if (saved !== undefined) return;
    source = await corpusPdf(c.file);
    outcome = await filledOutcome(c);
    saved = await outcome.session.runtime.save();
  };

  it('qpdf --check is clean on the original and on the written file, and the original bytes are an exact prefix', async () => {
    await run();
    const before = qpdfCheck(`${c.form}-original.pdf`, source.source);
    const after = qpdfCheck(`${c.form}-filled.pdf`, saved);
    console.log(`${c.file}: ${source.source.length} -> ${saved.length} bytes; qpdf original=${before.status}, filled=${after.status}`);
    expect(before.status, before.text).toBe(0);
    expect(after.status, after.text).toBe(0);
    expect(after.text).toContain('No syntax or stream encoding errors found');
    expect(after.text).not.toMatch(/warning/i);
    expect(saved.length).toBeGreaterThan(source.source.length);
    expect(Buffer.compare(saved.subarray(0, source.source.length), source.source)).toBe(0);
  });

  it('only the datasets and form packets changed: every other packet is byte-equal and keeps its object', async () => {
    await run();
    const again = await openXfaPdf(saved);
    expect(again.packets.map((p) => p.name)).toEqual(source.packets.map((p) => p.name));
    for (const p of source.packets) {
      if (p.name === 'datasets' || p.name === 'form') continue;
      expect(Buffer.compare(again.packet(p.name).bytes, p.bytes), p.name).toBe(0);
      expect(again.packet(p.name).ref).toEqual(p.ref);
    }
    expect(again.packet('datasets').ref).toEqual(source.packet('datasets').ref);
    expect(again.packet('form').ref).toEqual(source.packet('form').ref);
    expect(Buffer.compare(again.packet('form').bytes, source.packet('form').bytes)).not.toBe(0);
  });

  it('the saved datasets re-parse within the XML ceilings, keep the packet structure (list of values first, then the data), and hold the fixture values', async () => {
    await run();
    const text = (await openXfaPdf(saved)).packet('datasets').text();
    expect(() => parseXml(text)).not.toThrow();
    expect(childNames(text)).toEqual(childNames(source.packet('datasets').text()));
    for (const value of Object.values(fixture)) expect(text).toContain(String(value));
  });

  it('reopening and running load() gives the fixture values back and the validated flag "Yes", with the form loading as cleanly as the blank form', async () => {
    await run();
    const again = await reload(c, saved);
    for (const [som, value] of Object.entries(fixture)) {
      expect(String(again.getValue(`${canonicalSom(som)}.dataNode`)), som).toBe(String(value));
    }
    expect(again.getValue(outcome.session.pack.validatedFlag)).toBe('Yes');
    expect(again.unsupported).toEqual((await blankSession(c)).runtime.unsupported);
    expect(again.state).toBe('loaded');
  });

  it('the reopened form encodes the same five barcode payloads from the saved data alone: the flag is in the data, so the form\'s own preSave handling builds them again', async () => {
    await run();
    const again = await reload(c, saved);
    const { pack } = outcome.session;
    const encoded = again.encodeBarcodes(pack);
    expect(encoded.validated).toBe(true);
    expect(encoded.payloads).toEqual(outcome.encoded.payloads);
    expect(encoded.payloads.map((p) => String(p).length)).toEqual(c.payloadLengths);
    expect(again.children(pack.barcodes, 'field').map((som) => again.getValue(som))).toEqual(outcome.encoded.payloads);
  });

  it('is deterministic: a second save of the same run is byte-identical', async () => {
    await run();
    expect(Buffer.compare(await outcome.session.runtime.save(), saved)).toBe(0);
  });
});
