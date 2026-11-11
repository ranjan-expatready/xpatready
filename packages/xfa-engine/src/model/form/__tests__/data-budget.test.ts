import { describe, expect, it } from 'vitest';
import { MAX_XML_CHARS } from '../../../xml/limits.js';
import { DataBudget } from '../data-budget.js';
import { MAX_LOADED_ELEMENTS } from '../limits.js';
import { XfaFormError } from '../errors.js';

describe('a refused import charges nothing (M2)', () => {
  it('too many elements leaves both the element budget and the saved-size budget untouched', () => {
    const budget = new DataBudget(0);
    expect(() => budget.chargeImported(MAX_LOADED_ELEMENTS + 1, 10)).toThrow(XfaFormError);
    expect(() => budget.chargeLoadedElements(MAX_LOADED_ELEMENTS)).not.toThrow();
  });

  it('a saved size over the document ceiling leaves the element budget untouched', () => {
    const budget = new DataBudget(0);
    expect(() => budget.chargeImported(5, MAX_XML_CHARS)).toThrow(XfaFormError);
    expect(() => budget.chargeLoadedElements(MAX_LOADED_ELEMENTS)).not.toThrow();
    expect(() => budget.chargeSaved(MAX_XML_CHARS - 300)).not.toThrow();
  });
});
