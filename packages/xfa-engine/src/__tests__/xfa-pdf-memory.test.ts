import { describe, expect, it } from 'vitest';
import { DecodeBudget } from '../pdf/filters.js';
import { expectMalformed } from '../pdf/__tests__/expect-malformed.js';
import type { PdfReader } from '../pdf/reader.js';
import { openXfaPdfInternal } from '../xfa-pdf.js';
import { buildXfaPdf, packet } from './fixtures/build-xfa-pdf.js';

describe('openXfaPdf memory amplification (F2)', () => {
  it('an /XFA array of 2,000 pairs pointing at the same stream is MALFORMED (duplicate), quickly', async () => {
    const pairs = Array.from({ length: 2000 }, (_, i) => `(p${i}) 10 0 R`).join(' ');
    const pdf = buildXfaPdf({ packets: [packet('a', 'x'.repeat(100))], rawXfaArray: `[${pairs}]` });
    const started = performance.now();
    const err = await expectMalformed(openXfaPdfInternal(pdf, {}));
    expect(err.message).toMatch(/duplicate/i);
    expect(performance.now() - started).toBeLessThan(1000);
  });

  it('many DISTINCT unfiltered packets whose total exceeds the injected budget are MALFORMED', async () => {
    const packets = Array.from({ length: 10 }, (_, i) => packet(`p${i}`, 'x'.repeat(1000)));
    const pdf = buildXfaPdf({ packets });
    await expectMalformed(openXfaPdfInternal(pdf, { budget: new DecodeBudget(4500) }));
    const ok = await openXfaPdfInternal(pdf, { budget: new DecodeBudget(20_000) });
    expect(ok.packets).toHaveLength(10);
  });
});

describe('openXfaPdf releases the reader cache after reading (L2-F3)', () => {
  it('the handle keeps no resolved objects alive, and withPacket still works', async () => {
    let observed: PdfReader | undefined;
    const pdf = await openXfaPdfInternal(buildXfaPdf({ perms: 'ur3', needsRendering: 'true' }), {
      observeReader: (r) => {
        observed = r;
      },
    });
    expect(observed?.cacheSize).toBe(0);
    const out = await pdf.withPacket('datasets', new TextEncoder().encode('<d/>'));
    const again = await openXfaPdfInternal(out, {});
    expect(again.packet('datasets').text()).toBe('<d/>');
    expect(pdf.isDynamic).toBe(true);
    expect(pdf.hasUsageRights).toBe(true);
  });
});
