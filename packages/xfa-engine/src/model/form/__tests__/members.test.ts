import { describe, expect, it } from 'vitest';
import { parseXml } from '../../../xml/parse.js';
import { loadTemplate } from '../../template/index.js';
import { tpl } from '../../template/__tests__/helpers.js';
import { createFormDom, DataNode, FormNode } from '../index.js';
import { at, build, datasetsXml, expectForm, must, textField } from './helpers.js';

const LOV = '<LOVFile><LOV><L><I lic="a">A</I><I lic="b">B</I></L></LOV></LOVFile>';

describe('node ids and the dispatch table the bridge sits on', () => {
  it('every form node has a unique stable positive id, the id resolves back to the same object, and 0 is left to the xfa root', () => {
    const { dom } = build(`${textField('A')}${textField('B')}`);
    const ids = new Set<number>();
    dom.walk((n) => {
      expect(n.id).toBeGreaterThan(0);
      expect(dom.nodeById(n.id)).toBe(n);
      ids.add(n.id);
    });
    expect(ids.size).toBeGreaterThan(5);
    expect(dom.nodeById(0)).toBeUndefined();
    expect(dom.nodeById(9_999_999)).toBeUndefined();
    expect(dom.nodeById(Number.NaN)).toBeUndefined();
  });

  it('get answers values, methods, deferred members and unsupported members distinctly (a misspelt member must be detectable, never undefined)', () => {
    const { dom } = build(textField('F'), '<form1><F>v</F></form1>');
    const f = at(dom, 'F');
    expect(dom.get(f, 'rawValue')).toEqual({ kind: 'value', value: 'v' });
    expect(dom.get(f, 'className')).toEqual({ kind: 'value', value: 'field' });
    expect(dom.get(f, 'addItem')).toEqual({ kind: 'method' });
    expect(dom.get(f, 'resolveNode')).toEqual({ kind: 'deferred' });
    expect(dom.get(f, 'somExpression')).toEqual({ kind: 'deferred' });
    expect(dom.get(f, 'execEvent')).toEqual({ kind: 'deferred' });
    expect(dom.get(f, 'rawValu')).toEqual({ kind: 'unsupported' });
    expect(dom.get(f, 'selectedIndexx')).toEqual({ kind: 'unsupported' });
    expect(dom.get(f, '__proto__')).toEqual({ kind: 'unsupported' });
    expect(dom.get(f, 'constructor')).toEqual({ kind: 'unsupported' });
  });

  it('members belong to classes: a subform has no rawValue, a draw no mandatory, an edge no rawValue', () => {
    const { dom } = build(`<subform name="S"/><draw name="D"/>`);
    expect(dom.get(at(dom, 'S'), 'rawValue')).toEqual({ kind: 'unsupported' });
    expect(dom.get(at(dom, 'D'), 'mandatory')).toEqual({ kind: 'unsupported' });
    expect(dom.get(at(dom, 'D'), 'rawValue').kind).toBe('value');
  });

  it('a name that is not a member falls back to the named child, which is how Page1.PersonalDetails.Name is walked by plain property access', () => {
    const { dom } = build(`<subform name="S">${textField('F')}</subform>`);
    const s = at(dom, 'S');
    expect(dom.get(s, 'F')).toEqual({ kind: 'value', value: at(dom, 'S.F') });
    expect(dom.get(s, 'Nope')).toEqual({ kind: 'unsupported' });
    expect(dom.namedChildren(s, 'F')).toHaveLength(1);
  });

  it('a child is also reachable by its class when no child has that name (caption.value.text), and a name that is neither stays unsupported', () => {
    const { dom } = build(textField('F', '<caption><value><text>Label</text></value></caption>'));
    const value = must(must(at(dom, 'F').property('caption')).property('value'));
    const viaClass = dom.get(value, 'text');
    expect(viaClass.kind === 'value' && viaClass.value instanceof FormNode && viaClass.value.nodeValue).toBe('Label');
    expect(dom.get(value, 'exData')).toEqual({ kind: 'unsupported' });
  });

  it('items entries expose their text as value, so the off value of a check box is item(1).value', () => {
    const { dom } = build(`<field name="C"><ui><checkButton/></ui><items><integer>1</integer><integer>0</integer></items></field>`);
    const list = must(at(dom, 'C').childrenOfClass('items')[0]);
    const off = dom.call(list.nodes, 'item', [1]);
    expect(off.kind === 'value' && off.value instanceof FormNode && dom.get(off.value, 'value')).toEqual({ kind: 'value', value: '0' });
  });

  it('set and call dispatch by class, validate their arguments with schemas, and report unsupported members', () => {
    const { dom } = build(`<field name="C"><ui><choiceList/></ui><items/><items presence="hidden" save="1"/></field>`, '<form1><C/></form1>');
    const c = at(dom, 'C');
    expect(dom.set(c, 'presence', 'hidden')).toBe('ok');
    expect(c.presence).toBe('hidden');
    // A field is a container: a name the object model lacks is kept on the node as an expando (expando.test.ts), not unsupported.
    expect(dom.set(c, 'nonsense', 1)).toBe('expando');
    expect(dom.set(c, 'className', 'x')).toBe('unsupported');
    expect(dom.call(c, 'addItem', ['Lbl', 'sv'])).toEqual({ kind: 'value', value: undefined });
    expect(c.childrenOfClass('items')[1]?.children[0]?.nodeValue).toBe('sv');
    expect(dom.call(c, 'boundItem', ['Lbl'])).toEqual({ kind: 'value', value: 'sv' });
    expect(dom.call(c, 'nonsense', [])).toEqual({ kind: 'unsupported' });
    expectForm(() => dom.call(c, 'addItem', [{}]), 'INVALID_ARGUMENT');
    expectForm(() => dom.call(c, 'addItem', []), 'INVALID_ARGUMENT');
    expect(dom.set(c, 'selectedIndex', 0)).toBe('ok');
    expect(c.rawValue).toBe('sv');
  });

  it('isPropertySpecified and getElement are methods: written properties are specified, implicit ones are not', () => {
    const { dom } = build(textField('F', '<assist><speak>hi</speak></assist>'));
    const f = at(dom, 'F');
    expect(dom.call(f, 'isPropertySpecified', ['assist'])).toEqual({ kind: 'value', value: true });
    expect(dom.call(f, 'isPropertySpecified', ['border'])).toEqual({ kind: 'value', value: false });
    const border = must(must(must(f.property('ui')).oneOfChild).property('border'));
    expect(dom.call(border, 'getElement', ['edge', 1])).toEqual({ kind: 'value', value: border.element('edge', 1) });
  });

  it('the property chain a script walks, ui.oneOfChild.className and caption.value, is reachable through get', () => {
    const { dom } = build(textField('F', '<caption><value><text>t</text></value></caption>'));
    const f = at(dom, 'F');
    const ui = dom.get(f, 'ui');
    expect(ui.kind).toBe('value');
    const widget = dom.get(must(f.property('ui')), 'oneOfChild');
    expect(widget.kind === 'value' && widget.value instanceof FormNode && widget.value.className).toBe('textEdit');
    const caption = dom.get(f, 'caption');
    expect(caption.kind).toBe('value');
  });
});

describe('data nodes and the datasets root', () => {
  it('data nodes have ids, class names by kind, names, parents, child nodes and attributes reachable by name (lic) but not listed as child nodes', () => {
    const { dom } = build(textField('F'), '<form1><F>v</F></form1>', LOV);
    const list = must(dom.datasets.child('LOVFile')?.child('LOV')?.child('L'));
    expect(list.className).toBe('dataGroup');
    expect(list.nodes.length).toBe(2);
    const first = must(list.nodes.item(0));
    if (!(first instanceof DataNode)) throw new Error('expected a data node');
    expect([first.className, first.name, first.value]).toEqual(['dataValue', 'I', 'A']);
    expect(first.child('lic')?.value).toBe('a');
    expect(first.parent).toBe(list);
    expect(dom.nodeById(first.id)).toBe(first);
    expect(dom.data.name).toBe('data');
    expect(dom.datasets.child('data')).toBe(dom.data);
    expect(dom.dataNodeFor(first.element as never)).toBe(first);
  });

  it('an empty data value reads as null to a script (the libraries test item.value == null and key on String(item.lic.value)), and null writes the empty string', () => {
    const { dom } = build(textField('F'), '<form1><F/></form1>', LOV);
    const blank = must(dom.data.child('form1')?.child('F'));
    expect(dom.get(blank, 'value')).toEqual({ kind: 'value', value: null });
    expect(dom.set(blank, 'value', ' ')).toBe('ok');
    expect(dom.get(blank, 'value')).toEqual({ kind: 'value', value: ' ' });
    expect(dom.set(blank, 'value', null)).toBe('ok');
    expect(blank.value).toBe('');
  });

  it('a data group has no value for a script (null), and createNode and message setters reject non-string arguments with typed errors', () => {
    const { dom } = build(textField('F'), '<form1><F>v</F></form1>');
    expect(dom.get(must(dom.data.child('form1')), 'value')).toEqual({ kind: 'value', value: null });
    expect(dom.get(dom.data, 'value')).toEqual({ kind: 'value', value: null });
    expectForm(() => dom.createNode('text', 5 as never), 'INVALID_ARGUMENT');
    expectForm(() => dom.createNode('draw', 'd\u000B'), 'INVALID_ARGUMENT');
    expect(dom.createNode('draw', 'd').name).toBe('d');
    expectForm(() => dom.createDataNode('dataValue', 5 as never), 'INVALID_ARGUMENT');
    expectForm(() => {
      at(dom, 'F').validationMessage = 5 as never;
    }, 'INVALID_ARGUMENT');
  });

  it('data node get/set go through the same dispatch, value setters validate, and removing a data node detaches it from the datasets DOM', () => {
    const { dom, datasets } = build(textField('F'), '<form1><F>v</F></form1>', LOV);
    const item = must(must(dom.datasets.child('LOVFile')?.child('LOV')?.child('L')).nodes.item(1));
    if (!(item instanceof DataNode)) throw new Error('expected a data node');
    expect(dom.get(item, 'value')).toEqual({ kind: 'value', value: 'B' });
    expect(dom.set(item, 'value', 'Z')).toBe('ok');
    expect(item.value).toBe('Z');
    expect(dom.set(item, 'nonsense', 1)).toBe('unsupported');
    const list = must(item.parent);
    list.nodes.remove(item);
    expect(list.nodes.length).toBe(1);
    expect(datasets.getElementsByTagName('I')).toHaveLength(1);
  });

  it('createDataNode makes a detached group or value that can be appended to the datasets root (xfa.datasets.createNode + nodes.append)', () => {
    const { dom, datasets } = build(textField('F'), '<form1><F>v</F></form1>');
    const group = dom.createDataNode('dataGroup', 'Extra');
    dom.datasets.nodes.append(group);
    expect(group.parent).toBe(dom.datasets);
    expect(datasets.documentElement?.lastChild?.nodeName).toBe('Extra');
  });
});

describe('node ceiling', () => {
  it('createNode in a loop stops at the form ceiling with a typed LIMIT error instead of exhausting memory', () => {
    const datasets = parseXml(datasetsXml('<form1/>'));
    const dom = createFormDom(loadTemplate(tpl('')), datasets, { limits: { maxNodes: 50 } });
    expectForm(() => {
      for (let i = 0; i < 1000; i += 1) dom.createNode('text', '');
    }, 'LIMIT', /50/);
  });
});

describe('template view', () => {
  it('xfa.template is a read-only node tree over the same classes and names, and every write is refused', () => {
    const { dom } = build(textField('F'));
    const tf = must(dom.template.children[0]?.children.find((c) => c.name === 'F'));
    expect(tf.className).toBe('field');
    expect(tf.readOnly).toBe(true);
    expectForm(() => tf.setAttr('presence', 'hidden'), 'INVALID_OPERATION');
    expectForm(() => {
      tf.rawValue = 'x';
    }, 'INVALID_OPERATION');
    expect(at(dom, 'F').readOnly).toBe(false);
    expect(dom.template).toBe(dom.template);
  });
});
