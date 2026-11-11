import { describe, expect, it } from 'vitest';
import { MAX_XML_ATTRIBUTE_CHARS } from '../../../xml/limits.js';
import { parseXml } from '../../../xml/parse.js';
import { at, build, dataText, expectForm, must, textField } from './helpers.js';

const MIB = 1024 * 1024;

describe('writes the saved datasets could not hold (F5)', () => {
  it.each([['vertical tab', 'a\u000Bb', 'a\nb'], ['lone high surrogate', 'a\uD800', 'a'], ['lone low surrogate', '\uDC00b', 'b'], ['non-character U+FFFE', 'x\uFFFEy', 'xy']])(
    'a value with a %s written to a bound field is cleaned (L5-F1), and the datasets serialize',
    (_what, text, cleaned) => {
      const { dom, datasets } = build(textField('F'), '<form1><F>v</F></form1>');
      at(dom, 'F').rawValue = text;
      expect(at(dom, 'F').rawValue).toBe(cleaned);
      expect(dom.call(dom.data, 'saveXML', [])).toMatchObject({ kind: 'value' });
      expect(dataText(datasets)).toContain(`<F>${cleaned}</F>`);
    },
  );

  it('a script write to a data value node and to a data attribute node cleans the same characters', () => {
    const { dom, datasets } = build(textField('F'), '<form1 lic="x"><F>v</F></form1>');
    const form1 = must(dom.data.child('form1'));
    const value = must(form1.child('F'));
    const attribute = must(form1.child('lic'));
    dom.set(value, 'value', 'a\u000Bb');
    dom.set(attribute, 'value', 'a\u0001b\uD800');
    expect(value.value).toBe('a\nb');
    expect(attribute.value).toBe('ab');
    expect(() => dataText(datasets)).not.toThrow();
  });
});

describe('write ceilings never exceed the ceilings the saved datasets are re-parsed with (F10)', () => {
  it('a data attribute value over the XML attribute ceiling is refused as LIMIT, and one at the ceiling is written and re-opens', () => {
    const { dom, datasets } = build(textField('F'), '<form1 lic="x"><F/></form1>');
    const attribute = must(must(dom.data.child('form1')).child('lic'));
    expectForm(() => dom.set(attribute, 'value', 'y'.repeat(MAX_XML_ATTRIBUTE_CHARS + 1)), 'LIMIT');
    expect(attribute.value).toBe('x');
    expect(dom.set(attribute, 'value', 'y'.repeat(MAX_XML_ATTRIBUTE_CHARS))).toBe('ok');
    expect(() => parseXml(dataText(datasets))).not.toThrow();
  });

  // The saved datasets are re-opened counting the ESCAPED attribute text (prescan), so the ceiling applies to what is written, not to the raw characters.
  it.each([
    ['&', 5],
    ['<', 4],
    ['>', 4],
    ['"', 6],
    ['\r', 5],
    ['\n', 5],
    ['\t', 4],
  ])('a data attribute of %j is limited by its escaped length (%i characters each): the most that fits re-opens, one more is LIMIT (1 MiB of "&" used to pass and then fail parseXml)', (char, unit) => {
    const { dom, datasets } = build(textField('F'), '<form1 lic="x"><F/></form1>');
    const attribute = must(must(dom.data.child('form1')).child('lic'));
    const fits = Math.floor(MAX_XML_ATTRIBUTE_CHARS / unit);
    expect(dom.set(attribute, 'value', char.repeat(fits))).toBe('ok');
    expect(() => parseXml(dataText(datasets))).not.toThrow();
    expectForm(() => dom.set(attribute, 'value', char.repeat(fits + 1)), 'LIMIT');
    expect(attribute.value).toBe(char.repeat(fits));
  });

  it('values that together would make the datasets too large to re-open are refused as LIMIT part-way, and what was saved before still re-opens', () => {
    const names = ['A', 'B', 'C', 'D', 'E'];
    const { dom, datasets } = build(names.map((n) => textField(n)).join(''));
    const big = 'x'.repeat(3.5 * MIB);
    let refused: unknown;
    for (const name of names) {
      try {
        at(dom, name).rawValue = big;
      } catch (e) {
        refused = e;
        break;
      }
    }
    expect(refused, 'the fifth 3.5 MiB value passes 16 MiB of datasets').toBeDefined();
    expectForm(() => {
      throw refused;
    }, 'LIMIT');
    expect(() => parseXml(dataText(datasets))).not.toThrow();
  });

  it('ampersands count at their escaped size: one 4 MiB value of them is refused because it would serialize past the document ceiling', () => {
    const { dom, datasets } = build(textField('F'));
    expectForm(() => (at(dom, 'F').rawValue = '&'.repeat(4 * MIB)), 'LIMIT');
    expect(() => parseXml(dataText(datasets))).not.toThrow();
  });
});
