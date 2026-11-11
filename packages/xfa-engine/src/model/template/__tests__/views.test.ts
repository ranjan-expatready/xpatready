import { describe, expect, it } from 'vitest';
import { bindItemsOf, bindOf, itemsOf, pictureOf, validateOf, valueContentOf } from '../index.js';
import { modelOf, nodeNamed, tpl } from './helpers.js';

describe('validate view', () => {
  const model = modelOf(
    tpl(`<field name="a"><validate nullTest="error" scriptTest="warning">
        <message><text name="nullTest">Required</text><text name="scriptTest">Bad value</text><text name="formatTest">Bad format</text></message>
        <script contentType="application/x-javascript">this.rawValue != "";</script>
        <picture>num{99}</picture>
      </validate></field>
      <field name="b"><validate/></field><field name="c"/>`),
  );

  it('reports the written tests and the messages by name (mandatory maps from nullTest, messages are read by test)', () => {
    const v = validateOf(nodeNamed(model, 'field', 'a'));
    expect(v).toMatchObject({ nullTest: 'error', scriptTest: 'warning', formatTest: 'warning' });
    expect(v?.messages).toEqual({ nullTest: 'Required', scriptTest: 'Bad value', formatTest: 'Bad format' });
    expect(v?.script?.text).toBe('this.rawValue != "";');
    expect(v?.picture).toBe('num{99}');
  });

  it('an empty <validate/> uses the XFA defaults: nullTest disabled, formatTest warning, scriptTest error (a wrong default would make every field mandatory or never)', () => {
    expect(validateOf(nodeNamed(model, 'field', 'b'))).toMatchObject({ nullTest: 'disabled', formatTest: 'warning', scriptTest: 'error', messages: {} });
  });

  it('a field without <validate> reads the same implicit defaults (one source for validateOf and getProperty), and a draw has no validate view', () => {
    const c = validateOf(nodeNamed(model, 'field', 'c'));
    expect(c).toMatchObject({ nullTest: 'disabled', formatTest: 'warning', scriptTest: 'error', messages: {}, script: undefined, picture: undefined });
    expect(c?.node.implicit).toBe(true);
    const m = modelOf(tpl(`<draw name="d"/>`));
    expect(validateOf(nodeNamed(m, 'draw', 'd'))).toBeUndefined();
  });

  it('a message text without a name is keyed under the empty string, not dropped (a default message must stay reachable)', () => {
    const m = modelOf(tpl(`<field name="a"><validate><message><text>Generic</text></message></validate></field>`));
    expect(validateOf(nodeNamed(m, 'field', 'a'))?.messages).toEqual({ '': 'Generic' });
  });

  it('a hostile message name such as __proto__ is plain data on a null-prototype record', () => {
    const m = modelOf(tpl(`<field name="a"><validate><message><text name="__proto__">x</text></message></validate></field>`));
    const messages = validateOf(nodeNamed(m, 'field', 'a'))?.messages;
    expect(Object.getPrototypeOf(messages)).toBeNull();
    expect(messages?.['__proto__']).toBe('x');
  });
});

describe('value, items, bindItems, picture views', () => {
  const model = modelOf(
    tpl(`<field name="t"><value><text>hello</text></value><format><picture>date{YYYY-MM-DD}</picture></format><bind match="none"><picture>num{99}</picture></bind></field>
      <field name="i"><value><integer>7</integer></value></field>
      <field name="d"><value><date>2024-01-02</date></value></field>
      <field name="x"><caption><value><exData contentType="text/html"><body xmlns="http://www.w3.org/1999/xhtml"><p>rich</p></body></exData></value></caption></field>
      <field name="e"><value/></field>
      <field name="none"/>
      <field name="list"><ui><choiceList/></ui>
        <items><text>One</text><text>Two</text></items>
        <items save="1" presence="hidden"><text xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:nil="true"/><text>b</text><integer>3</integer></items>
        <bindItems ref="xfa.datasets.LOVFile.LOV.L.I[*]" labelRef="$" valueRef="lic"/>
      </field>`),
  );

  it('valueContentOf reports the content kind and text of a value child (T03 reads rawValue from it)', () => {
    expect(valueContentOf(nodeNamed(model, 'field', 't'))).toMatchObject({ kind: 'text', content: 'hello' });
    expect(valueContentOf(nodeNamed(model, 'field', 'i'))).toMatchObject({ kind: 'integer', content: '7' });
    expect(valueContentOf(nodeNamed(model, 'field', 'd'))).toMatchObject({ kind: 'date', content: '2024-01-02' });
    expect(valueContentOf(nodeNamed(model, 'field', 'e'))).toBeUndefined();
    expect(valueContentOf(nodeNamed(model, 'field', 'none'))).toBeUndefined();
  });

  it('a caption value holds rich text as exData content (caption.value.#exData must not be dropped)', () => {
    const caption = nodeNamed(model, 'field', 'x').firstChild('caption');
    expect(valueContentOf(caption)).toMatchObject({ kind: 'exData', content: 'rich' });
  });

  it('pictureOf reads the picture of a format, a bind and a validate, and is undefined where none is written', () => {
    const t = nodeNamed(model, 'field', 't');
    expect(pictureOf(t.firstChild('format'))).toBe('date{YYYY-MM-DD}');
    expect(pictureOf(t.firstChild('bind'))).toBe('num{99}');
    expect(pictureOf(nodeNamed(model, 'field', 'i').firstChild('format'))).toBeUndefined();
    expect(pictureOf(undefined)).toBeUndefined();
  });

  it('itemsOf lists each items block with its save flag, presence and values; a nil item is null, not the empty string', () => {
    const items = itemsOf(nodeNamed(model, 'field', 'list'));
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ save: false, presence: 'visible', values: ['One', 'Two'] });
    expect(items[1]).toMatchObject({ save: true, presence: 'hidden', values: [null, 'b', '3'] });
    expect(itemsOf(nodeNamed(model, 'field', 't'))).toEqual([]);
  });

  it('bindItemsOf returns ref, labelRef and valueRef as written', () => {
    expect(bindItemsOf(nodeNamed(model, 'field', 'list'))).toMatchObject([{ ref: 'xfa.datasets.LOVFile.LOV.L.I[*]', labelRef: '$', valueRef: 'lic' }]);
    expect(bindItemsOf(nodeNamed(model, 'field', 't'))).toEqual([]);
  });

  it('oneOfChild picks the widget of a ui, the content of a value, and nothing when empty', () => {
    const list = nodeNamed(model, 'field', 'list');
    expect(list.firstChild('ui')?.oneOfChild?.className).toBe('choiceList');
    expect(nodeNamed(model, 'field', 't').firstChild('value')?.oneOfChild?.className).toBe('text');
    expect(nodeNamed(model, 'field', 'e').firstChild('value')?.oneOfChild).toBeUndefined();
    expect(list.oneOfChild).toBeUndefined();
  });
});

describe('bind view', () => {
  const model = modelOf(
    tpl(`<field name="a"/><field name="b"><bind match="none"/></field><field name="c"><bind match="once"><picture>num{99}</picture></bind></field><field name="d"><bind ref="$.x" match="dataRef"/></field>`),
  );

  it('bindOf defaults match to once (implicit binding) and reports none, the picture and any ref as written (T03 skips match="none" containers)', () => {
    expect(bindOf(nodeNamed(model, 'field', 'a'))).toBeUndefined();
    expect(bindOf(nodeNamed(model, 'field', 'b'))).toMatchObject({ match: 'none', ref: '', picture: undefined });
    expect(bindOf(nodeNamed(model, 'field', 'c'))).toMatchObject({ match: 'once', picture: 'num{99}' });
    expect(bindOf(nodeNamed(model, 'field', 'd'))).toMatchObject({ match: 'dataRef', ref: '$.x' });
    const bare = modelOf(tpl(`<field name="e"><bind/></field>`));
    expect(bindOf(nodeNamed(bare, 'field', 'e'))?.match).toBe('once');
  });
});
