import { describe, expect, it } from 'vitest';
import { parseXml } from '../../../xml/parse.js';
import { at, build, dataAt, dataText, expectForm, textField } from './helpers.js';

const typed = (name: string, kind: string, extra = ''): string => `<field name="${name}"><ui><textEdit/></ui><value><${kind}/></value>${extra}</field>`;

describe('rawValue and the data DOM (A2)', () => {
  it('writing rawValue updates the bound data node text and the serialized datasets show it (a form-only write would be lost on save)', () => {
    const { dom, datasets } = build(`<subform name="Name">${textField('FamilyName')}</subform>`, '<form1><Name><FamilyName/></Name></form1>');
    const f = at(dom, 'Name.FamilyName');
    expect(f.rawValue).toBeNull();
    expect(f.isNull).toBe(true);
    f.rawValue = 'Rivera <&> Co';
    expect(f.rawValue).toBe('Rivera <&> Co');
    expect(f.isNull).toBe(false);
    expect(dataAt(dom, 'Name.FamilyName').value).toBe('Rivera <&> Co');
    expect(dataText(datasets)).toContain('<FamilyName>Rivera &lt;&amp;&gt; Co</FamilyName>');
    expect(parseXml(dataText(datasets)).getElementsByTagName('FamilyName')[0]?.textContent).toBe('Rivera <&> Co');
  });

  it('a write to the data node shows in the bound field (the two views must not drift)', () => {
    const { dom } = build(textField('F'), '<form1><F>a</F></form1>');
    const data = dataAt(dom, 'F');
    data.value = 'b';
    expect(at(dom, 'F').rawValue).toBe('b');
  });

  it('empty string and null both read back as null and isNull, and carriage returns in values survive a serialize round trip', () => {
    const { dom, datasets } = build(textField('F'), '<form1><F>x</F></form1>');
    const f = at(dom, 'F');
    f.rawValue = '';
    expect([f.rawValue, f.isNull]).toEqual([null, true]);
    f.rawValue = 'a\r\nb';
    expect(parseXml(dataText(datasets)).getElementsByTagName('F')[0]?.textContent).toBe('a\r\nb');
    f.rawValue = null;
    expect(f.rawValue).toBeNull();
  });

  it('numeric value types read as numbers and accept numbers or numeric strings; text fields stringify numbers', () => {
    const { dom, datasets } = build(`${typed('I', 'integer')}${typed('D', 'decimal')}${typed('T', 'text')}`, '<form1><I>3</I><D/><T/></form1>');
    expect(at(dom, 'I').rawValue).toBe(3);
    at(dom, 'I').rawValue = '12';
    expect(at(dom, 'I').rawValue).toBe(12);
    at(dom, 'D').rawValue = 1.5;
    expect(at(dom, 'D').rawValue).toBe(1.5);
    at(dom, 'T').rawValue = 7;
    expect(at(dom, 'T').rawValue).toBe('7');
    expect(dataText(datasets)).toContain('<I>12</I><D>1.5</D><T>7</T>');
  });

  it('a non-numeric string written to a numeric field is kept verbatim and read back as that string (silently turning it into 0 would lose data)', () => {
    const { dom } = build(typed('I', 'integer'), '<form1><I/></form1>');
    at(dom, 'I').rawValue = '**';
    expect(at(dom, 'I').rawValue).toBe('**');
  });

  it('rawValue rejects values a script cannot legitimately assign, as a typed form error, and over-long strings', () => {
    const { dom } = build(textField('F'), '<form1><F/></form1>');
    expectForm(() => {
      (at(dom, 'F') as unknown as { rawValue: unknown }).rawValue = { evil: true };
    }, 'INVALID_ARGUMENT');
    expectForm(() => {
      at(dom, 'F').rawValue = 'x'.repeat(4 * 1024 * 1024 + 1);
    }, 'LIMIT');
  });

  it('unbound fields keep their value in the form and the default comes from the template', () => {
    const { dom } = build(`<field name="U"><bind match="none"/><ui><textEdit/></ui></field>`, '<form1/>');
    const u = at(dom, 'U');
    expect(u.rawValue).toBeNull();
    u.rawValue = 'v';
    expect(u.rawValue).toBe('v');
    expect(u.property('value')?.children[0]?.nodeValue).toBe('v');
  });

  it('a draw exposes its static text as rawValue and a write shows in the text node (setCaption on a draw goes through the node)', () => {
    const { dom } = build(`<draw name="D"><value><text>hello</text></value></draw>`, '<form1/>');
    const d = at(dom, 'D');
    expect(d.rawValue).toBe('hello');
    d.rawValue = 'bye';
    expect(d.property('value')?.children[0]?.nodeValue).toBe('bye');
  });
});

describe('exclusion groups and check buttons (A2)', () => {
  const group = `<exclGroup name="G"><field name="No"><ui><checkButton/></ui><items><text>N</text></items></field><field name="Yes"><ui><checkButton/></ui><items><text>Y</text></items></field></exclGroup>`;

  it('group rawValue is the selected child on-value, writes select by on-value and round trip through the data, and a non-matching value clears the selection', () => {
    const { dom, datasets } = build(group, '<form1><G/></form1>');
    const g = at(dom, 'G');
    expect(g.rawValue).toBeNull();
    g.rawValue = 'Y';
    expect(g.rawValue).toBe('Y');
    expect(dataText(datasets)).toContain('<G>Y</G>');
    g.rawValue = 'N';
    expect(g.rawValue).toBe('N');
    g.rawValue = 'maybe';
    expect(g.rawValue).toBeNull();
    expect(dataText(datasets)).toContain('<G/>');
  });

  it('a radio child reads its own on-value when selected and nothing otherwise; selecting a child deselects its sibling', () => {
    const { dom } = build(group, '<form1><G>Y</G></form1>');
    expect(at(dom, 'G.Yes').rawValue).toBe('Y');
    expect(at(dom, 'G.No').rawValue).toBeNull();
    at(dom, 'G.No').rawValue = 'N';
    expect(at(dom, 'G').rawValue).toBe('N');
    expect(at(dom, 'G.Yes').rawValue).toBeNull();
    at(dom, 'G.No').rawValue = null;
    expect(at(dom, 'G').rawValue).toBeNull();
  });

  it('a stand-alone check button holds its on or off value as written', () => {
    const { dom } = build(`<field name="C"><ui><checkButton/></ui><items><integer>1</integer><integer>0</integer></items></field>`, '<form1><C>0</C></form1>');
    const c = at(dom, 'C');
    expect(c.rawValue).toBe('0');
    c.rawValue = '1';
    expect(c.rawValue).toBe('1');
  });
});

describe('bind and format pictures', () => {
  const dated = `<field name="Mo"><ui><textEdit/></ui><value><text/></value><format><picture>num{99}</picture></format><bind><picture>num{99}</picture></bind></field>`;

  it('data is parsed with the bind picture (rawValue is the canonical "3" for stored "03", which the form scripts pad themselves) and written back through it', () => {
    const { dom, datasets } = build(dated, '<form1><Mo>03</Mo></form1>');
    const m = at(dom, 'Mo');
    expect(m.rawValue).toBe('3');
    m.rawValue = '9';
    expect(dataAt(dom, 'Mo').value).toBe('09');
    expect(m.rawValue).toBe('9');
    expect(dataText(datasets)).toContain('<Mo>09</Mo>');
  });

  it('formattedValue applies the format picture; a value the picture cannot parse stays unformatted and is flagged (stars in a month must not be turned into 00)', () => {
    const { dom } = build(dated, '<form1><Mo>03</Mo></form1>');
    const m = at(dom, 'Mo');
    expect(m.formattedValue).toBe('03');
    expect(m.isFormatted).toBe(true);
    m.rawValue = '**';
    expect(m.rawValue).toBe('**');
    expect(dataAt(dom, 'Mo').value).toBe('**');
    expect(m.formattedValue).toBe('**');
    expect(m.isFormatted).toBe(false);
  });

  it('commitInput parses typed text with the edit-picture alternatives, first match wins, and reports acceptance', () => {
    const body = `<field name="Dt"><ui><dateTimeEdit/><picture>date{YYYY-MM-DD}|date{YYYYMMDD}|date{YYYY/MM/DD}</picture></ui><value><date/></value><format><picture>date{YYYY/MM/DD}</picture></format></field>`;
    const { dom } = build(body, '<form1><Dt/></form1>');
    const d = at(dom, 'Dt');
    expect(d.commitInput('20240315')).toBe(true);
    expect(d.rawValue).toBe('2024-03-15');
    expect(d.formattedValue).toBe('2024/03/15');
    expect(d.commitInput('2024/03/16')).toBe(true);
    expect(d.rawValue).toBe('2024-03-16');
    expect(d.commitInput('15-03-2024')).toBe(false);
    expect(d.rawValue).toBe('15-03-2024');
    expect(d.isFormatted).toBe(false);
  });

  it('a null{} then num{} format shows the empty string for a null value and the currency text otherwise', () => {
    const body = `<field name="Fd"><ui><textEdit/></ui><value><text/></value><format><picture>null{}|num{$zzz,zzz,zzz,zz9.zz}</picture></format></field>`;
    const { dom } = build(body, '<form1><Fd/></form1>');
    const f = at(dom, 'Fd');
    expect(f.formattedValue).toBe('');
    f.rawValue = '1234.5';
    expect(f.formattedValue).toBe('$1,234.5');
    f.rawValue = '1234';
    expect(f.formattedValue).toBe('$1,234');
  });

  it('an unsupported picture anywhere in the template fails at load, naming the picture (a new form version must be caught at upload)', () => {
    const body = `<field name="X"><ui><textEdit/></ui><format><picture>time{HH:MM}</picture></format></field>`;
    let message = '';
    try {
      build(body);
    } catch (e) {
      message = e instanceof Error ? e.message : '';
    }
    expect(message).toMatch(/time/);
  });

  it('an empty <picture/> means no picture: the template loads and the value is shown as it is', () => {
    const body = `<field name="E"><ui><textEdit/><picture/></ui><format><picture>  </picture></format><bind><picture/></bind></field>`;
    const { dom } = build(body, '<form1><E>7</E></form1>');
    expect(at(dom, 'E').formattedValue).toBe('7');
    expect(at(dom, 'E').commitInput('8')).toBe(true);
    expect(at(dom, 'E').rawValue).toBe('8');
  });
});

describe('nil data values', () => {
  const NIL = `<F xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:nil="true"/>`;

  it('writing a value to an xsi:nil data node removes the nil marker, so the saved data does not claim null for a filled field', () => {
    const { dom, datasets } = build(textField('F'), `<form1>${NIL}</form1>`);
    expect(at(dom, 'F').rawValue).toBeNull();
    at(dom, 'F').rawValue = 'x';
    expect(dataText(datasets)).not.toContain('nil');
    expect(dataText(datasets)).toContain('>x</F>');
    const second = build(textField('F'), `<form1>${NIL}</form1>`);
    dataAt(second.dom, 'F').value = 'y';
    expect(dataText(second.datasets)).not.toContain('nil');
  });
});
