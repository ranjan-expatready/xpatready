import { describe, expect, it } from 'vitest';
import { must } from '../../model/template/__tests__/helpers.js';
import { canonicalSom, filledOutcome, FORM_CASES, type InvalidCase } from './form-cases.js';

const COMPLETION_MESSAGE = 'Validation completed successfully.';

describe.each(FORM_CASES)('A4: each section validator can be failed on its own, on real form $file', (c) => {
  it.each(c.invalid)('$label: the form\'s own message is recorded', async (failure: InvalidCase) => {
    const { session, validated } = await filledOutcome(c, {
      afterFixture: (runtime) => {
        runtime.setValue(failure.som, failure.value);
        runtime.event(failure.som, 'exit');
      },
    });
    const { runtime } = session;
    const first = canonicalSom(failure.first);
    const texts = validated.messages.map((m) => m.text);
    // Every needle is in the form's own words for this failure (one failure can raise several messages).
    for (const needle of failure.needles) expect(texts.some((t) => t.includes(needle)), `${needle} in ${JSON.stringify(texts)}`).toBe(true);
    const message = must(texts.find((t) => t.includes(must(failure.needles[0]))));
    // The message is built from the failing field's own texts when it has plain ones (a radio button's carry a line break the form splits on).
    const own = runtime.getProperty(first, 'validationMessage');
    if (typeof own === 'string' && own !== '' && !own.includes('\r')) expect(message, 'the field\'s own validationMessage').toContain(own);

    if (failure.blocks === false) {
      // The form's own validator reported it and let Validate pass: reproduced as it is.
      expect(validated).toMatchObject({ complete: true, flag: 'Yes', firstMissingField: null });
      expect(texts.at(-1)?.startsWith(COMPLETION_MESSAGE)).toBe(true);
      return;
    }
    expect(validated).toMatchObject({ complete: false, flag: 'No', firstMissingField: first, barcodesPresence: 'hidden' });
    expect(texts.some((t) => t.startsWith(COMPLETION_MESSAGE))).toBe(false);
    expect(validated.focus.at(-1)).toBe(first);
    // A form that did not validate encodes nothing.
    expect(runtime.encodeBarcodes(session.pack).payloads).toEqual([null, null, null, null, null]);
  });

  it('putting the value back makes the same runtime complete again: Validate is repeatable and flips the flag back', async () => {
    const failure = must(c.invalid.find((f) => f.blocks !== false), 'a blocking case');
    const original = String(must(await filledValue(c, failure.som)));
    const { session, validated } = await filledOutcome(c, {
      afterFixture: (runtime) => {
        runtime.setValue(failure.som, failure.value);
        runtime.event(failure.som, 'exit');
      },
    });
    expect(validated.complete).toBe(false);
    session.runtime.setValue(failure.som, original);
    session.runtime.event(failure.som, 'exit');
    const again = session.runtime.validate(session.pack);
    expect(again).toMatchObject({ complete: true, flag: 'Yes', firstMissingField: null, barcodesPresence: 'visible' });
  });
});

async function filledValue(c: (typeof FORM_CASES)[number], som: string): Promise<string | number | null> {
  const { session } = await filledOutcome(c);
  return session.runtime.getValue(canonicalSom(som));
}
