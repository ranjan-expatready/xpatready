import { describe, expect, it } from 'vitest';
import { at, build, dataText, expectForm, expectXfa } from './helpers.js';

const LOV =
  '<LOVFile><LOV><ColorList><Color lic=""/><Color lic="R">Red</Color><Color lic="G">Green &amp; Teal</Color></ColorList><PlainList><Item>One</Item><Item>Two</Item></PlainList></LOV></LOVFile>';

const bound = (ref: string, labelRef = '$', valueRef = 'lic'): string =>
  `<field name="Sel"><ui><choiceList/></ui><items/><items presence="hidden" save="1"/><bindItems ref="${ref}" labelRef="${labelRef}" valueRef="${valueRef}"/></field>`;

describe('choice lists from bindItems (A4)', () => {
  it('bindItems fills the display list with element text and the hidden save list with the lic attribute, in data order including the blank first entry', () => {
    const { dom } = build(bound('xfa.datasets.LOVFile.LOV.ColorList.Color[*]'), '<form1><Sel>G</Sel></form1>', LOV);
    const sel = at(dom, 'Sel');
    const [display, save] = sel.childrenOfClass('items');
    expect(display?.children.map((c) => c.nodeValue)).toEqual(['', 'Red', 'Green & Teal']);
    expect(save?.children.map((c) => c.nodeValue)).toEqual(['', 'R', 'G']);
  });

  it('rawValue is the save code and formattedValue the display label (region lookups key on the label)', () => {
    const { dom } = build(bound('xfa.datasets.LOVFile.LOV.ColorList.Color[*]'), '<form1><Sel>G</Sel></form1>', LOV);
    const sel = at(dom, 'Sel');
    expect(sel.rawValue).toBe('G');
    expect(sel.formattedValue).toBe('Green & Teal');
    expect(sel.selectedIndex).toBe(2);
    sel.rawValue = 'R';
    expect(sel.formattedValue).toBe('Red');
    sel.rawValue = 'unlisted';
    expect(sel.formattedValue).toBe('unlisted');
    expect(sel.selectedIndex).toBe(-1);
  });

  it('a value reference to element text works too, and a missing attribute yields an empty save value rather than a crash', () => {
    const { dom } = build(bound('xfa.datasets.LOVFile.LOV.PlainList.Item[*]', '$', '$'), '<form1><Sel/></form1>', LOV);
    const [display, save] = at(dom, 'Sel').childrenOfClass('items');
    expect(display?.children.map((c) => c.nodeValue)).toEqual(['One', 'Two']);
    expect(save?.children.map((c) => c.nodeValue)).toEqual(['One', 'Two']);
    const missing = build(bound('xfa.datasets.LOVFile.LOV.PlainList.Item[*]', '$', 'lic'), '<form1><Sel/></form1>', LOV);
    expect(at(missing.dom, 'Sel').childrenOfClass('items')[1]?.children.map((c) => c.nodeValue)).toEqual(['', '']);
  });

  it('a ref that does not exist gives an empty list; a ref outside the supported grammar is refused at load (fail closed)', () => {
    const none = build(bound('xfa.datasets.LOVFile.LOV.Nope.Item[*]'), '<form1><Sel/></form1>', LOV);
    expect(at(none.dom, 'Sel').childrenOfClass('items')[0]?.children).toHaveLength(0);
    expectXfa(() => build(bound('$data.form1.Item[*]'), '<form1><Sel/></form1>', LOV), 'UNSUPPORTED_FEATURE', /bindItems/);
    expectXfa(() => build(bound('xfa.datasets..Item'), '<form1><Sel/></form1>', LOV), 'UNSUPPORTED_FEATURE');
    expectXfa(() => build(bound('xfa.datasets.LOVFile.LOV.ColorList.Color[*]', 'a.b'), '<form1><Sel/></form1>', LOV), 'UNSUPPORTED_FEATURE');
  });

  it('a field with only a hidden save list or only a display list is created with its missing partner so the two lists stay index-aligned', () => {
    const body = `<field name="Sel"><ui><choiceList/></ui><items><text>x</text></items><bindItems ref="xfa.datasets.LOVFile.LOV.ColorList.Color[*]" labelRef="$" valueRef="lic"/></field>`;
    const { dom } = build(body, '<form1><Sel/></form1>', LOV);
    const [display, save] = at(dom, 'Sel').childrenOfClass('items');
    expect(display?.children).toHaveLength(4);
    expect(save?.attr('save')).toBe('1');
    expect(save?.children).toHaveLength(4);
  });
});

describe('items scripting API (A4)', () => {
  const field = `<field name="Sel"><ui><choiceList/></ui><items/><items presence="hidden" save="1"/></field>`;

  it('addItem appends a display/save pair, selectedIndex follows the value, and clearItems empties both lists', () => {
    const { dom, datasets } = build(field, '<form1><Sel/></form1>');
    const sel = at(dom, 'Sel');
    sel.addItem('Alberta', 'AB');
    sel.addItem('Ontario', 'ON');
    sel.addItem('Same');
    expect(sel.childrenOfClass('items').map((i) => i.children.map((c) => c.nodeValue))).toEqual([['Alberta', 'Ontario', 'Same'], ['AB', 'ON', 'Same']]);
    sel.selectedIndex = 1;
    expect(sel.rawValue).toBe('ON');
    expect(sel.formattedValue).toBe('Ontario');
    expect(dataText(datasets)).toContain('<Sel>ON</Sel>');
    sel.selectedIndex = -1;
    expect(sel.rawValue).toBeNull();
    expect(sel.selectedIndex).toBe(-1);
    sel.clearItems();
    expect(sel.childrenOfClass('items').map((i) => i.children.length)).toEqual([0, 0]);
  });

  it('boundItem maps a display text to its save value and returns the text itself when it is not a listed label', () => {
    const { dom } = build(field, '<form1><Sel/></form1>');
    const sel = at(dom, 'Sel');
    sel.addItem('Alberta', 'AB');
    expect(sel.boundItem('Alberta')).toBe('AB');
    expect(sel.boundItem('Elsewhere')).toBe('Elsewhere');
  });

  it('an out-of-range or non-integer selectedIndex is a typed error, not a silent clear', () => {
    const { dom } = build(field, '<form1><Sel/></form1>');
    const sel = at(dom, 'Sel');
    sel.addItem('A', 'a');
    expectForm(() => {
      sel.selectedIndex = 5;
    }, 'INVALID_ARGUMENT');
    expectForm(() => {
      sel.selectedIndex = 0.5;
    }, 'INVALID_ARGUMENT');
  });

  it('addItem on a field with a single display-only list uses that list for both labels and values, and items past the ceiling are refused', () => {
    const body = `<field name="S"><ui><choiceList/></ui><items><text>x</text><text>y</text></items></field>`;
    const { dom } = build(body, '<form1><S>y</S></form1>');
    const s = at(dom, 'S');
    expect(s.selectedIndex).toBe(1);
    expect(s.formattedValue).toBe('y');
    const big = build(field, '<form1><Sel/></form1>');
    const sel = at(big.dom, 'Sel');
    expectForm(() => {
      for (let i = 0; i <= 100_000; i += 1) sel.addItem('i', 'v');
    }, 'LIMIT');
  });

  it('a null value is no selection: selectedIndex is -1 and formattedValue empty even when the first entry is a blank item with a one-space label', () => {
    const { dom } = build(`<field name="S"><ui><choiceList/></ui><items/><items presence="hidden" save="1"/></field>`, '<form1><S/></form1>');
    const s = at(dom, 'S');
    s.addItem(' ', '');
    s.addItem('A', 'a');
    expect(s.rawValue).toBeNull();
    expect(s.selectedIndex).toBe(-1);
    expect(s.formattedValue).toBe('');
    s.rawValue = 'a';
    expect(s.selectedIndex).toBe(1);
    expect(s.formattedValue).toBe('A');
  });
});
