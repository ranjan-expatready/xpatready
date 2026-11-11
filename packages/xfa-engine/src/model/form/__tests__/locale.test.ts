import { describe, expect, it } from 'vitest';
import { build, expectXfa } from './helpers.js';

const withPicture = (locale: string, picture: string, where = 'field'): string => {
  const attr = locale === '' ? '' : ` locale="${locale}"`;
  return where === 'field'
    ? `<field name="F"${attr}><ui><textEdit/></ui><format><picture>${picture}</picture></format></field>`
    : `<subform name="S"${attr}><field name="F"><ui><textEdit/></ui><format><picture>${picture}</picture></format></field></subform>`;
};

describe('locale of number and date pictures (F6)', () => {
  it('an English locale or none is accepted for num and date pictures', () => {
    expect(() => build(withPicture('en_CA', 'num{99}'))).not.toThrow();
    expect(() => build(withPicture('en', 'date{YYYY-MM-DD}'))).not.toThrow();
    expect(() => build(withPicture('en-GB', 'num{99}'))).not.toThrow();
    expect(() => build(withPicture('', 'num{99}'))).not.toThrow();
  });

  it('a non-English locale on the field fails closed at load, naming the locale (the engine only implements English symbols)', () => {
    expectXfa(() => build(withPicture('fr_CA', 'num{$zz9.99}')), 'UNSUPPORTED_FEATURE', /locale "fr_CA"/);
    expectXfa(() => build(withPicture('de_DE', 'date{YYYY-MM-DD}')), 'UNSUPPORTED_FEATURE', /locale/);
    expectXfa(() => build(withPicture('ambient', 'null{}|num{99}')), 'UNSUPPORTED_FEATURE', /locale/);
  });

  it('an inherited locale counts: a field with no locale of its own takes the nearest ancestor that has one', () => {
    expectXfa(() => build(withPicture('fr_CA', 'num{99}', 'subform')), 'UNSUPPORTED_FEATURE', /locale "fr_CA"/);
    const nested = `<subform name="S" locale="fr_CA"><subform name="T" locale="en_US"><field name="F"><ui><textEdit/></ui><format><picture>num{99}</picture></format></field></subform></subform>`;
    expect(() => build(nested)).not.toThrow();
  });

  it('text pictures and fields without a picture do not depend on the locale', () => {
    expect(() => build(withPicture('fr_CA', 'text{99999}'))).not.toThrow();
    expect(() => build(`<field name="F" locale="fr_CA"><ui><textEdit/></ui></field>`)).not.toThrow();
  });
});
