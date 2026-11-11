import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createFormRuntime } from '../../runtime/runtime.js';
import { parseXml } from '../../xml/parse.js';
import { openXfaPdf } from '../../xfa-pdf.js';
import { datasetsLeaves, leafDifferences } from '../datasets-leaves.js';
import { NOON_UTC, TEST_HOST } from './form-cases.js';

/**
 * The calculates settle again after the form's own restore (`ready:$form`). The oracle is the Acrobat-saved, validated copies of
 * both IRCC forms: `Page5.TextField1[n]` are bound fields whose calculate copies a barcode field that has no data binding, and
 * the PDF's own `datasets` packet stores what Acrobat wrote for each. Expectations are read from that packet's XML, never from the
 * engine. Without the settle, the calculates run (at load) while the barcode fields are still empty and blank the saved values.
 */
const acrobatDir = process.env.XFA_ACROBAT_DIR;
if (acrobatDir === undefined || acrobatDir === '') throw new Error('NOT EXECUTED: XFA_ACROBAT_DIR unset (point it at the directory of Acrobat-saved copies, .superpowers/xfa-acrobat)');

describe.each(['imm1295-adobe-validated.pdf', 'imm5257-adobe-validated.pdf'])('barcode copies after the restore on %s', (file) => {
  it('each Page5.TextField1[n] equals the value in the PDF\'s own datasets packet', async () => {
    const pdf = await openXfaPdf(new Uint8Array(readFileSync(join(acrobatDir, file))));
    const doc = parseXml(pdf.packet('datasets').text());
    const stored: string[] = [];
    const page5 = doc.getElementsByTagName('Page5').item(0);
    for (let node = page5?.firstChild ?? null; node !== null; node = node.nextSibling) {
      if (node.nodeType === 1 && node.nodeName === 'TextField1') stored.push(node.textContent ?? '');
    }
    expect(stored.length).toBeGreaterThan(0);
    expect(stored.every((value) => value.length > 0)).toBe(true);

    const runtime = await createFormRuntime(pdf, { host: TEST_HOST, clock: { now: () => NOON_UTC } });
    try {
      runtime.load();
      const loaded = stored.map((_, n) => runtime.getValue(`Page5.TextField1[${n}]`));
      expect(loaded).toEqual(stored);
    } finally {
      runtime.dispose();
    }
  }, 120_000);
});

/**
 * Every data leaf, not only the barcode copies: after `load()` the runtime's `saveDatasets()` holds exactly the data the PDF's own
 * `datasets` packet holds (Acrobat saved these copies after the form's restore and calculates settled). The expectation is the packet;
 * the comparison itself is proven able to fail in `__tests__/datasets-leaves.test.ts`.
 */
describe.each(['imm1295-adobe-validated.pdf', 'imm5257-adobe-validated.pdf', 'imm5257-filled-acrobat-saved.pdf'])('every data leaf after load on %s', (file) => {
  it('saveDatasets() has the same leaf set and the same trimmed text as the PDF\'s own datasets packet', async () => {
    const pdf = await openXfaPdf(new Uint8Array(readFileSync(join(acrobatDir, file))));
    const stored = datasetsLeaves(pdf.packet('datasets').text());
    expect(stored.size).toBeGreaterThan(0);

    const runtime = await createFormRuntime(pdf, { host: TEST_HOST, clock: { now: () => NOON_UTC } });
    try {
      runtime.load();
      const saved = datasetsLeaves(runtime.saveDatasets());
      expect(saved.size).toBeGreaterThan(0);
      expect(leafDifferences(stored, saved)).toEqual([]);
    } finally {
      runtime.dispose();
    }
  }, 120_000);
});
