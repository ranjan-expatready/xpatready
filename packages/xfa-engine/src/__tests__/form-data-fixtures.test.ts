import { describe, expect, it } from 'vitest';
import { loadFixture, loadPack } from './fixtures/form-data/apply.js';

const FORMS = ['imm1295', 'imm5257'] as const;

/**
 * EVERY value a fixture holds that is not TEST-prefixed free text, by exact text. Nothing is accepted by shape: a date,
 * a code or a number that is not on this list fails, because a well-formed value could be somebody's real one.
 */
const ALLOWED_VALUES: ReadonlyMap<string, string> = new Map([
  // Yes/No answers, check box on, and choices from the forms' own lists (service language, status, sex, marital status, ...).
  ...['N', 'Y', '1', '01', '02', '03', '09', 'Unknown', 'English', 'VisitorVisa', 'ELMO'].map((v): [string, string] => [v, 'a listed choice or answer']),
  // Codes of list entries (country, language, city) and the fixed fake birth year, day and employment start.
  ...['252', '089', '7004'].map((v): [string, string] => [v, 'a list code']),
  ['1985', 'fixed fake year of birth'],
  ['20', 'fixed fake day of birth'],
  ['2012', 'fixed fake employment start year'],
  // Fixed fake dates.
  ...['2020-01-15', '2021-03-21', '2031-03-20', '2035-01-15', '2035-02-15', '2036-01-15'].map((v): [string, string] => [v, 'fixed fake date']),
  // Telephone: 555 numbers only. Street number and funds are small invented numbers.
  ...['555', '0123'].map((v): [string, string] => [v, '555 telephone part']),
  ['100', 'invented street number'],
  ['5000', 'invented funds amount'],
  ['A1234567', 'invented offer number in the shape the form requires'],
  ['test.person@example.com', 'example.com address'],
]);

/** Free text must be TEST-prefixed capitals, digits and spaces: TESTPERSON, TEST12345, TEST STREET. */
const TEST_TEXT = /^TEST[A-Z0-9 ]*$/;

/** Why a value cannot sit in a fixture, or undefined when it is TEST text or exactly one of the allowed values. */
export function whyNotFictitious(value: string | number): string | undefined {
  const text = String(value);
  if (TEST_TEXT.test(text) || ALLOWED_VALUES.has(text)) return undefined;
  return 'is neither TEST-prefixed capitals nor one of the exactly listed fake values';
}

describe('the fictitiousness guard bites (it checks the values, not their shape)', () => {
  it.each(['SMITH', 'AB1234567', '4165551234', '1985-03-21', 'test.person@example.org', 'someone@example.com', 'Test', 'TESTperson', '05', 'ZZ'])('rejects %s', (value) => {
    expect(whyNotFictitious(value)).toBeDefined();
  });

  it('rejects a number that is not listed, and accepts a listed one in either type', () => {
    expect(whyNotFictitious(4165551234)).toBeDefined();
    expect(whyNotFictitious(5000)).toBeUndefined();
    expect(whyNotFictitious('TESTPERSON')).toBeUndefined();
  });

  it('every allowed value is in use by some fixture, so the list cannot quietly grow beyond what the fixtures need', () => {
    const used = new Set(FORMS.flatMap((form) => Object.values(loadFixture(form)).map(String)));
    const unused = [...ALLOWED_VALUES.keys()].filter((v) => !used.has(v));
    expect(unused).toEqual([]);
  });
});

describe.each(FORMS)('fixture data for %s is fictitious and well formed (owner decision O-2)', (form) => {
  const fixture = loadFixture(form);

  it('holds only TEST text and exactly listed fake values', () => {
    const offenders = Object.entries(fixture).flatMap(([som, value]) => {
      const why = whyNotFictitious(value);
      return why === undefined ? [] : [`${som} = ${JSON.stringify(value)} ${why}`];
    });
    expect(offenders).toEqual([]);
  });

  it('keys are SOM paths from the root subform, with no absolute prefix and no empty segment', () => {
    for (const som of Object.keys(fixture)) {
      expect(som, som).toMatch(/^[A-Za-z][A-Za-z0-9_]*(\[\d+\])?(\.[A-Za-z][A-Za-z0-9_]*(\[\d+\])?)*$/);
      expect(som, som).not.toMatch(/^xfa/);
    }
  });

  it('carries the usual stand-ins for a person: TESTPERSON as family name, an example.com address, a 555 telephone number, a TEST passport number', () => {
    const values = Object.values(fixture).map(String);
    expect(values).toContain('TESTPERSON');
    expect(values).toContain('test.person@example.com');
    expect(values).toContain('555');
    expect(values).toContain('TEST12345');
  });

  it('has a Pack descriptor next to it that passes the engine\'s own schema', () => {
    expect(loadPack(form)).toMatchObject({ validatedValue: 'Yes' });
  });
});
