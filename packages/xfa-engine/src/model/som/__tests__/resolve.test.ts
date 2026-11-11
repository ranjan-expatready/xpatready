import { describe, expect, it } from 'vitest';
import { DataNode, FormNode, NodeListNode } from '../../form/index.js';
import { at, build, expectForm, find, must, textField } from '../../form/__tests__/helpers.js';
import { resolveNode, resolveNodes } from '../index.js';

const form = (node: unknown): FormNode => {
  expect(node).toBeInstanceOf(FormNode);
  return node as FormNode;
};
const data = (node: unknown): DataNode => {
  expect(node).toBeInstanceOf(DataNode);
  return node as DataNode;
};

describe('scope: an unqualified name resolves in the nearest scope that has it', () => {
  const { dom } = build(
    `<subform name="A">${textField('Name')}${textField('Probe')}<subform name="Inner">${textField('Probe2')}</subform></subform>
     <subform name="B">${textField('Name')}${textField('Probe')}</subform>
     ${textField('Top')}`,
  );

  it('the same name in two sibling subforms resolves to the one in the caller\'s own subform', () => {
    expect(resolveNode(at(dom, 'A.Probe'), 'Name')).toBe(at(dom, 'A.Name'));
    expect(resolveNode(at(dom, 'B.Probe'), 'Name')).toBe(at(dom, 'B.Name'));
  });

  it('a name absent from the caller\'s scope is looked for in each ancestor scope outward', () => {
    expect(resolveNode(at(dom, 'A.Inner.Probe2'), 'Name')).toBe(at(dom, 'A.Name'));
    expect(resolveNode(at(dom, 'A.Inner.Probe2'), 'Top')).toBe(at(dom, 'Top'));
    expect(resolveNode(at(dom, 'B.Probe'), 'A.Inner.Probe2')).toBe(at(dom, 'A.Inner.Probe2'));
  });

  it('from the root subform a name that lives only inside a sibling subform is not found, and the root itself is found through the form model', () => {
    expect(resolveNode(dom.root, 'Name')).toBeNull();
    expect(resolveNode(dom.root, 'form1.A.Name')).toBe(at(dom, 'A.Name'));
    expect(resolveNode(at(dom, 'A.Inner.Probe2'), 'form1.B.Probe')).toBe(at(dom, 'B.Probe'));
  });

  it('a path that matches its first name in a nearer scope but cannot continue is null, not a match in an outer scope', () => {
    const shadow = build(`<subform name="Page"><subform name="Sub">${textField('Probe')}</subform></subform><subform name="Sub">${textField('Deep')}</subform>`);
    // `Sub` is found in Page's scope first; its child `Deep` does not exist there.
    expect(resolveNode(at(shadow.dom, 'Page.Sub.Probe'), 'Sub.Deep')).toBeNull();
    expect(resolveNode(at(shadow.dom, 'Page.Sub.Probe'), 'Sub.Probe')).toBe(at(shadow.dom, 'Page.Sub.Probe'));
  });

  it('the caller itself is not a member of its own scope: a name equal to the caller\'s name is found in the parent', () => {
    expect(resolveNode(at(dom, 'A.Name'), 'Name')).toBe(at(dom, 'A.Name'));
    expect(resolveNode(at(dom, 'A'), 'A.Name')).toBe(at(dom, 'A.Name'));
  });

  it('the nodes list and the template view are scoped like any node', () => {
    expect(resolveNode(at(dom, 'A.Probe').nodes, 'Name')).toBe(at(dom, 'A.Name'));
  });
});

describe('indexes', () => {
  const { dom } = build(`${textField('X', '<caption><value><text>first</text></value></caption>')}${textField('Y')}${textField('X', '<caption><value><text>second</text></value></caption>')}<draw name="X"/>`);

  it('[n] counts same-name siblings only', () => {
    const xs = dom.root.children.filter((c) => c.name === 'X');
    expect(xs).toHaveLength(3);
    expect(resolveNode(dom.root, 'X')).toBe(xs[0]);
    expect(resolveNode(dom.root, 'X[0]')).toBe(xs[0]);
    expect(resolveNode(dom.root, 'X[1]')).toBe(xs[1]);
    expect(resolveNode(dom.root, 'X[2]')).toBe(xs[2]);
    expect(resolveNode(dom.root, 'X[3]')).toBeNull();
    expect(resolveNode(dom.root, 'Y[1]')).toBeNull();
  });

  it('[*] through resolveNodes returns every same-name sibling in order, and resolveNode returns the first of them', () => {
    const xs = dom.root.children.filter((c) => c.name === 'X');
    expect(resolveNodes(dom.root, 'X[*]')).toEqual(xs);
    expect(resolveNode(dom.root, 'X[*]')).toBe(xs[0]);
    expect(resolveNodes(dom.root, 'X')).toEqual([xs[0]]);
    expect(resolveNodes(dom.root, 'Nope[*]')).toEqual([]);
  });

  it('[*] in the middle of a path fans out and keeps document order', () => {
    const wide = build(`<subform name="S">${textField('F')}${textField('G')}</subform><subform name="S">${textField('F')}</subform>`);
    const found = resolveNodes(wide.dom.root, 'S[*].F');
    expect(found).toEqual([at(wide.dom, 'S[0].F'), at(wide.dom, 'S[1].F')]);
    expect(resolveNodes(wide.dom.root, 'S[*].G')).toEqual([at(wide.dom, 'S[0].G')]);
  });

  it('an unqualified [*] stops at the first scope that has the name, like a single match', () => {
    const wide = build(`<subform name="S">${textField('F')}${textField('F')}<subform name="In">${textField('Probe')}</subform></subform>${textField('F')}`);
    const fs = resolveNodes(at(wide.dom, 'S.In.Probe'), 'F[*]');
    expect(fs).toHaveLength(2);
    expect(fs.every((n) => form(n).parent === at(wide.dom, 'S'))).toBe(true);
  });
});

describe('#class selectors', () => {
  const { dom } = build(
    `<subform><field name="Inner"><ui><textEdit/></ui></field></subform>
     <subform name="Named">${textField('Probe')}</subform>
     <field name="C1"><ui><choiceList/></ui><items><text>a</text></items><items save="1"><text>b</text></items></field>
     <draw name="D"><value><text>draw text</text></value></draw>`,
  );

  it('#class matches children by class whatever their name, [n] counts that class', () => {
    expect(resolveNode(dom.root, '#subform[0]')?.className).toBe('subform');
    expect(form(resolveNode(dom.root, '#subform[0]')).name).toBe('');
    expect(form(resolveNode(dom.root, '#subform[1]')).name).toBe('Named');
    expect(resolveNode(dom.root, '#subform[2]')).toBeNull();
    expect(resolveNodes(dom.root, '#field[*]').map((n) => form(n).name)).toEqual(['C1']);
  });

  it('an unnamed subform is addressed by its class and its named children are below it', () => {
    expect(resolveNode(dom.root, '#subform.Inner')).toBe(find(dom, 'field', 'Inner'));
    expect(resolveNode(dom.root, 'Inner')).toBeNull();
  });

  it('an unnamed property node answers to its class name as a plain name (ui.#textEdit, caption.value)', () => {
    const inner = find(dom, 'field', 'Inner');
    expect(resolveNode(inner, 'ui.#textEdit')?.className).toBe('textEdit');
    expect(resolveNode(inner, 'ui.textEdit')?.className).toBe('textEdit');
    expect(resolveNode(inner, '#ui.#textEdit')?.className).toBe('textEdit');
    expect(resolveNode(find(dom, 'field', 'C1'), 'ui.#textEdit')).toBeNull();
  });

  it('resolveNodes("#items[*]") from a field returns its items children in order (without [*] the index defaults to 0), and a #class path from a ui finds the widget', () => {
    const c1 = find(dom, 'field', 'C1');
    expect(resolveNodes(c1, '#items')).toEqual([c1.childrenOfClass('items')[0]]);
    const items = resolveNodes(c1, '#items[*]');
    expect(items.map((n) => form(n).className)).toEqual(['items', 'items']);
    expect(items).toEqual(c1.childrenOfClass('items'));
    expect(resolveNode(must(c1.property('ui')), '#choiceList')?.className).toBe('choiceList');
  });

  it('a draw value reaches its text through #text from the value', () => {
    const value = must(find(dom, 'draw', 'D').property('value'));
    expect(form(resolveNode(value, '#text')).nodeValue).toBe('draw text');
  });
});

describe('variables: script objects and text variables are in scope for every container below', () => {
  const { dom } = build(
    `<variables><script contentType="application/x-javascript" name="util">function f() {}</script><text name="flag">false</text><text name="second">other</text></variables>
     <subform name="Page"><subform name="Deep">${textField('Probe')}</subform></subform>
     <field name="WithText"><ui><textEdit/></ui><caption><value><text>Hello</text></value></caption></field>
     <field name="WithRich"><ui><textEdit/></ui><caption><value><exData contentType="text/html"><body xmlns="http://www.w3.org/1999/xhtml"><p>Hi</p></body></exData></value></caption></field>`,
  );

  it('a script object resolves by name from any depth and is the script node of the variables block', () => {
    const util = form(resolveNode(at(dom, 'Page.Deep.Probe'), 'util'));
    expect(util.className).toBe('script');
    expect(util.parent?.className).toBe('variables');
    expect(resolveNode(dom.root, 'util')).toBe(util);
    expect(resolveNode(at(dom, 'Page.Deep.Probe'), 'form1.util')).toBe(util);
  });

  it('a text variable resolves by name and by class', () => {
    const flag = form(resolveNode(at(dom, 'Page.Deep.Probe'), 'flag'));
    expect(flag.nodeValue).toBe('false');
    expect(form(resolveNode(at(dom, 'Page.Deep.Probe'), '#text[1]')).name).toBe('second');
  });

  it('#text from a caption value that has text finds that text', () => {
    const value = must(must(find(dom, 'field', 'WithText').property('caption')).property('value'));
    expect(form(resolveNode(value, '#text')).nodeValue).toBe('Hello');
  });

  it('#text from a caption value that holds rich text is not found locally and falls back to the form\'s first text variable (the "false" the form\'s getCaption tests for), while #exData finds the rich text', () => {
    const value = must(must(find(dom, 'field', 'WithRich').property('caption')).property('value'));
    const fallback = form(resolveNode(value, '#text'));
    expect(fallback.name).toBe('flag');
    expect(fallback.nodeValue).toBe('false');
    expect(form(resolveNode(value, '#exData')).className).toBe('exData');
  });
});

describe('rooted expressions', () => {
  const { dom } = build(`<subform name="A">${textField('F')}</subform>`, '<form1><A><F>v</F></A></form1>', '<LOVFile><LOV><L><I lic="a">A</I><I lic="b">B</I></L></LOV></LOVFile>');
  const f = at(dom, 'A.F');

  it('xfa.form and the absolute somExpression shape resolve into the form tree from any node', () => {
    expect(resolveNode(f, 'xfa.form.form1.A.F')).toBe(f);
    expect(resolveNode(dom.root, 'xfa[0].form[0].form1[0].A[0].F[0]')).toBe(f);
    expect(resolveNode(dom.datasets, 'xfa[0].form[0].form1[0].A[0].F[0]')).toBe(f);
    expect(resolveNode(f, 'xfa.form')).toBe(dom.form);
    expect(resolveNode(f, 'xfa[0].form[0]')).toBe(dom.form);
  });

  it('xfa.datasets and xfa.datasets.data reach the data DOM', () => {
    expect(resolveNode(f, 'xfa.datasets')).toBe(dom.datasets);
    expect(resolveNode(f, 'xfa.datasets.data')).toBe(dom.data);
    expect(resolveNode(f, 'xfa.data')).toBe(dom.data);
    expect(data(resolveNode(f, 'xfa.datasets.data.form1')).name).toBe('form1');
    expect(resolveNode(f, 'xfa.datasets.data.form1.A.F')).toBe(f.dataNode);
    expect(data(resolveNode(f, 'xfa.datasets.LOVFile.LOV.L.I[1]')).value).toBe('B');
    expect(resolveNodes(f, 'xfa.datasets.LOVFile.LOV.L.I[*]').map((n) => data(n).value)).toEqual(['A', 'B']);
  });

  it('xfa.template resolves into the read-only template view', () => {
    const t = form(resolveNode(f, 'xfa[0].template[0].form1[0].A[0].F[0]'));
    expect(t.readOnly).toBe(true);
    expect(t).not.toBe(f);
    expect(dom.template).toBe(resolveNode(f, 'xfa.template'));
    let top: FormNode = t;
    while (top.parent !== null) top = top.parent;
    expect(top).toBe(dom.template);
  });

  it('only index 0 of the root models exists, and an unknown root child or the bare root resolves to nothing', () => {
    expect(resolveNode(f, 'xfa[1].form')).toBeNull();
    expect(resolveNode(f, 'xfa.form[1]')).toBeNull();
    expect(resolveNode(f, 'xfa.nothing')).toBeNull();
    expect(resolveNode(f, 'xfa')).toBeNull();
    expect(resolveNode(f, 'xfa[0]')).toBeNull();
    expect(resolveNodes(f, 'xfa[*].form')).toEqual([dom.form]);
  });

  it('a form node named xfa does not capture the root: xfa always means the root', () => {
    const odd = build(textField('xfa'));
    expect(resolveNode(odd.dom.root, 'xfa.form.form1')).toBe(odd.dom.root);
  });
});

describe('the data DOM', () => {
  const lov = '<LOVFile><LOV><L><I lic="a">A</I><I lic="b">B</I></L></LOV></LOVFile>';
  const { dom } = build(textField('F'), '<form1><F>v</F></form1>', lov);

  it('an unqualified name searches the data scope outward from a data node', () => {
    expect(data(resolveNode(dom.datasets, 'LOVFile')).name).toBe('LOVFile');
    const item = data(resolveNode(dom.datasets, 'LOVFile.LOV.L.I[1]'));
    expect(item.value).toBe('B');
    expect(resolveNode(item, 'LOV.L')).toBe(item.parent);
    expect(resolveNode(item, 'data.form1')).toBe(dom.data.child('form1'));
  });

  it('an attribute is reachable by name as the data value it is', () => {
    const item = data(resolveNode(dom.datasets, 'LOVFile.LOV.L.I[1]'));
    expect(data(resolveNode(item, 'lic')).value).toBe('b');
    expect(data(resolveNode(dom.datasets, 'LOVFile.LOV.L.I[0].lic')).value).toBe('a');
  });

  it('#class selectors select data groups and values', () => {
    expect(resolveNodes(dom.datasets, '#dataGroup[*]').map((n) => data(n).name)).toEqual(['LOVFile', 'data']);
    expect(resolveNodes(dom.datasets, 'LOVFile.LOV.L.#dataValue[*]')).toHaveLength(2);
  });
});

describe('.dataNode at the end of a reference', () => {
  const { dom } = build(
    `<subform name="S">${textField('F')}<field name="Unbound"><bind match="none"/><ui><textEdit/></ui></field></subform>`,
    '<form1><S><F>v</F></S></form1>',
  );

  it('a trailing dataNode answers the bound data node of the container (the shape of the barcode manifest references)', () => {
    const f = at(dom, 'S.F');
    expect(resolveNode(dom.root, 'xfa[0].form[0].form1[0].S[0].F[0].dataNode')).toBe(f.dataNode);
    expect(resolveNode(f, 'S.F.dataNode')).toBe(f.dataNode);
    expect(resolveNode(dom.root, 'S.dataNode')).toBe(at(dom, 'S').dataNode);
  });

  it('a container with no bound data answers nothing, and dataNode is not a name to resolve on its own', () => {
    expect(resolveNode(dom.root, 'S.Unbound.dataNode')).toBeNull();
    expect(resolveNode(dom.root, 'dataNode')).toBeNull();
    expect(resolveNode(dom.root, 'S.Missing.dataNode')).toBeNull();
  });

  it('dataNode in the middle of a path is not a pseudo-property (the bridge owns value access)', () => {
    expect(resolveNode(dom.root, 'S.F.dataNode.value')).toBeNull();
  });

  it('a template-view node has no bound data', () => {
    expect(resolveNode(dom.root, 'xfa.template.form1.S.F.dataNode')).toBeNull();
  });
});

describe('unsupported grammar and bad arguments', () => {
  const { dom } = build(textField('F'));
  it('descendant search, shortcuts and predicates are refused as a catchable INVALID_ARGUMENT that says the feature is unsupported (the parser keeps UNSUPPORTED_FEATURE for the load-time gate)', () => {
    for (const text of ['F..x', '$data.form1', '$.rawValue', '!form1', 'F.[x=1]', 'F[+1]', 'F.*']) {
      expectForm(() => resolveNode(dom.root, text), 'INVALID_ARGUMENT', /Unsupported XFA feature/);
      expectForm(() => resolveNodes(dom.root, text), 'INVALID_ARGUMENT', /Unsupported XFA feature/);
    }
  });

  it('an empty or non-string expression is an invalid argument and a hostile one is a LIMIT error, fast', () => {
    const started = Date.now();
    expectForm(() => resolveNode(dom.root, ''), 'INVALID_ARGUMENT');
    expectForm(() => resolveNode(dom.root, 7 as unknown as string), 'INVALID_ARGUMENT');
    expectForm(() => resolveNode(dom.root, 'a.'.repeat(5000)), 'LIMIT');
    expectForm(() => resolveNodes(dom.root, 'a'.repeat(1_000_000)), 'LIMIT');
    expect(Date.now() - started).toBeLessThan(500);
  });

  it('a start node that is not a node of a form is an invalid argument', () => {
    expectForm(() => resolveNode({} as unknown as FormNode, 'F'), 'INVALID_ARGUMENT');
    expectForm(() => resolveNode(null as unknown as FormNode, 'F'), 'INVALID_ARGUMENT');
  });

  it('a node list start resolves from its owner', () => {
    const list = dom.root.nodes;
    expect(list).toBeInstanceOf(NodeListNode);
    expect(resolveNode(list, 'F')).toBe(at(dom, 'F'));
  });
});

describe('bounded work', () => {
  it('a wildcard over more nodes than the result ceiling is a LIMIT error, not an unbounded list', () => {
    const many = Array.from({ length: 100_005 }, () => '<i>x</i>').join('');
    const { dom } = build(textField('F'), `<form1><F>v</F>${many}</form1>`);
    expectForm(() => resolveNodes(dom.root, 'xfa.datasets.data.form1.i[*]'), 'LIMIT');
    expect(resolveNodes(dom.root, 'xfa.datasets.data.form1.i[5]')).toHaveLength(1);
  }, 30_000);

  it('a deeply nested form resolves a path through every level without recursion', () => {
    const depth = 200;
    const open = Array.from({ length: depth }, (_, i) => `<subform name="L${i}">`).join('');
    const close = '</subform>'.repeat(depth);
    const { dom } = build(`${open}${textField('Leaf')}${close}`);
    const path = `${Array.from({ length: depth }, (_, i) => `L${i}`).join('.')}.Leaf`;
    expect(form(resolveNode(dom.root, path)).name).toBe('Leaf');
    expect(form(resolveNode(dom.root, `xfa.template.form1.${path}`)).name).toBe('Leaf');
  });
});
