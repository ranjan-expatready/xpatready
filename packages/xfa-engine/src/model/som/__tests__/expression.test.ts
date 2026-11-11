import { describe, expect, it } from 'vitest';
import { DataNode, FormNode } from '../../form/index.js';
import { at, build, expectForm, find, must, textField } from '../../form/__tests__/helpers.js';
import { resolveNode, somExpressionOf } from '../index.js';

describe('somExpressionOf: canonical strings', () => {
  const { dom } = build(
    `<variables><script contentType="application/x-javascript" name="util">function f() {}</script><text name="flag">x</text></variables>
     <subform name="S">${textField('F', '<caption><value><text>Hi</text></value></caption>')}${textField('F')}</subform>
     <subform><field name="Inner"><ui><textEdit/></ui></field></subform>`,
    '<form1><S><F>a</F><F>b</F></S></form1>',
    '<LOVFile><LOV><L><I lic="a">A</I><I lic="b">B</I></L></LOV></LOVFile>',
  );

  it('a form node is the absolute path from xfa.form with an index on every segment, counting same-name siblings', () => {
    expect(somExpressionOf(dom.form)).toBe('xfa[0].form[0]');
    expect(somExpressionOf(dom.root)).toBe('xfa[0].form[0].form1[0]');
    expect(somExpressionOf(at(dom, 'S'))).toBe('xfa[0].form[0].form1[0].S[0]');
    expect(somExpressionOf(at(dom, 'S.F[0]'))).toBe('xfa[0].form[0].form1[0].S[0].F[0]');
    expect(somExpressionOf(at(dom, 'S.F[1]'))).toBe('xfa[0].form[0].form1[0].S[0].F[1]');
  });

  it('unnamed nodes use #class with an index that counts siblings of that class', () => {
    const inner = find(dom, 'field', 'Inner');
    expect(somExpressionOf(inner)).toBe('xfa[0].form[0].form1[0].#subform[1].Inner[0]');
    const text = must(must(at(dom, 'S.F[0]').property('caption')).property('value')).oneOfChild;
    expect(somExpressionOf(must(text))).toBe('xfa[0].form[0].form1[0].S[0].F[0].#caption[0].#value[0].#text[0]');
  });

  it('a script object and a text variable are addressed through their unnamed variables block', () => {
    const util = must(resolveNode(dom.root, 'util'));
    expect(somExpressionOf(util)).toBe('xfa[0].form[0].form1[0].#variables[0].util[0]');
    expect(somExpressionOf(must(resolveNode(dom.root, 'flag')))).toBe('xfa[0].form[0].form1[0].#variables[0].flag[0]');
  });

  it('a template-view node is rooted at xfa.template', () => {
    expect(somExpressionOf(dom.template)).toBe('xfa[0].template[0]');
    const t = must(resolveNode(dom.root, 'xfa.template.form1.S.F[1]'));
    expect(somExpressionOf(t)).toBe('xfa[0].template[0].form1[0].S[0].F[1]');
  });

  it('a data node is rooted at xfa.datasets, an attribute is its element path plus the attribute name', () => {
    expect(somExpressionOf(dom.datasets)).toBe('xfa[0].datasets[0]');
    expect(somExpressionOf(dom.data)).toBe('xfa[0].datasets[0].data[0]');
    const item = must(resolveNode(dom.datasets, 'LOVFile.LOV.L.I[1]'));
    expect(somExpressionOf(item)).toBe('xfa[0].datasets[0].LOVFile[0].LOV[0].L[0].I[1]');
    const lic = must(resolveNode(dom.datasets, 'LOVFile.LOV.L.I[1].lic'));
    expect(somExpressionOf(lic)).toBe('xfa[0].datasets[0].LOVFile[0].LOV[0].L[0].I[1].lic[0]');
  });
});

describe('somExpressionOf: names the grammar cannot spell fall back to #class and still resolve back', () => {
  it('a template name with a dot, a space, a leading digit or more than the name ceiling resolves back through #class[n]', () => {
    const longName = 'n'.repeat(300);
    const { dom } = build(['a.b', 'has space', '1st', longName, 'plain'].map((name) => `<draw name="${name}"/>`).join(''));
    for (const name of ['a.b', 'has space', '1st', longName, 'plain']) {
      const node = find(dom, 'draw', name);
      const expression = somExpressionOf(node);
      expect(resolveNode(dom.root, expression), name).toBe(node);
    }
    expect(somExpressionOf(find(dom, 'draw', 'a.b'))).toBe('xfa[0].form[0].form1[0].#draw[0]');
    expect(somExpressionOf(find(dom, 'draw', 'plain'))).toBe('xfa[0].form[0].form1[0].plain[0]');
    expect(somExpressionOf(find(dom, 'draw', longName))).toBe('xfa[0].form[0].form1[0].#draw[3]');
  });

  it('a child named like a property class keeps a unique, resolvable expression whichever comes first', () => {
    const { dom } = build(
      `<exclGroup name="G"><field name="caption"><ui><checkButton/></ui></field><caption><value><text>t</text></value></caption><field name="caption"><ui><checkButton/></ui></field></exclGroup>`,
    );
    const group = find(dom, 'exclGroup', 'G');
    const kids = group.children;
    expect(kids.map((k) => k.className)).toEqual(['field', 'caption', 'field']);
    for (const node of kids) expect(resolveNode(dom.root, somExpressionOf(node)), node.className).toBe(node);
    expect(somExpressionOf(kids[1] as FormNode)).toMatch(/#caption\[0\]$/);
  });

  it('a non-ASCII letter name is spelled as it is', () => {
    const { dom } = build('<draw name="Prénom"/>');
    expect(somExpressionOf(find(dom, 'draw', 'Prénom'))).toBe('xfa[0].form[0].form1[0].Prénom[0]');
  });
});

describe('round trip: resolveNode(somExpressionOf(n)) is n for every node', () => {
  it('on a form with repeated names, unnamed containers, variables, property nodes, items and data, for the form, the template view and the data DOM', () => {
    const { dom } = build(
      `<variables><script contentType="application/x-javascript" name="u">1</script><script contentType="application/x-javascript" name="u">2</script><text name="t"/></variables>
       <subform name="P"><subform name="Q">${textField('X')}${textField('X')}<exclGroup name="G"><field name="R"><ui><checkButton/></ui><items><integer>1</integer><integer>0</integer></items></field><field name="R"><ui><checkButton/></ui></field></exclGroup></subform><subform name="Q">${textField('X')}</subform></subform>
       <subform><subform>${textField('Y')}</subform><field name="Z"><ui><choiceList/></ui></field></subform>
       <draw name="D"><value><text>t</text></value></draw>`,
      '<form1><P><Q><X>1</X><X>2</X><G>R</G></Q><Q><X>3</X></Q></P></form1>',
      '<LOVFile><LOV><L><I lic="a">A</I><I lic="b">B</I><I lic="c">C</I></L></LOV></LOVFile>',
    );
    let formNodes = 0;
    dom.walk((n) => {
      formNodes += 1;
      expect(resolveNode(dom.root, somExpressionOf(n)), somExpressionOf(n)).toBe(n);
    });
    let templateNodes = 0;
    dom.walk((n) => {
      templateNodes += 1;
      expect(resolveNode(dom.root, somExpressionOf(n)), somExpressionOf(n)).toBe(n);
    }, dom.template);
    let dataNodes = 0;
    const visitData = (n: DataNode): void => {
      dataNodes += 1;
      expect(resolveNode(dom.root, somExpressionOf(n)), somExpressionOf(n)).toBe(n);
      for (const c of n.children) visitData(c);
    };
    visitData(dom.datasets);
    expect(formNodes).toBeGreaterThan(30);
    expect(templateNodes).toBeGreaterThan(30);
    expect(dataNodes).toBeGreaterThan(10);
  });
});

describe('somExpressionOf: nodes with no place in the model, and ceilings', () => {
  const { dom } = build(textField('F'));

  it('a node created at run time and not appended, a removed node and a node list have no expression (typed, catchable)', () => {
    const created = dom.createNode('field', 'Made');
    expectForm(() => somExpressionOf(created), 'INVALID_OPERATION');
    const f = at(dom, 'F');
    dom.root.nodes.remove(f);
    expectForm(() => somExpressionOf(f), 'INVALID_OPERATION');
    expectForm(() => somExpressionOf(dom.root.nodes), 'INVALID_OPERATION');
    const detached = dom.createDataNode('dataGroup', 'Loose');
    expectForm(() => somExpressionOf(detached), 'INVALID_OPERATION');
  });

  it('an appended created node gets an expression that resolves to it', () => {
    const made = dom.createNode('field', 'Made');
    dom.root.nodes.append(made);
    expect(somExpressionOf(made)).toBe('xfa[0].form[0].form1[0].Made[0]');
    expect(resolveNode(dom.root, somExpressionOf(made))).toBe(made);
  });

  it('an unlisted default property (never written) has no expression until it is listed', () => {
    const field = find(build(textField('Only')).dom, 'field', 'Only');
    const border = must(field.property('border'));
    expect(field.children.includes(border)).toBe(false);
    expectForm(() => somExpressionOf(border), 'INVALID_OPERATION');
    border.setAttr('presence', 'visible');
    expect(resolveNode(field.dom.root, somExpressionOf(border))).toBe(border);
  });

  it('a non-node argument is an invalid argument', () => {
    expectForm(() => somExpressionOf({} as unknown as FormNode), 'INVALID_ARGUMENT');
  });

  it('an expression longer than the character ceiling is a LIMIT error, never a truncated string', () => {
    const depth = 160;
    const name = (i: number): string => `L${i}${'x'.repeat(100)}`;
    const open = Array.from({ length: depth }, (_, i) => `<subform name="${name(i)}">`).join('');
    const deep = build(`${open}${textField('Leaf')}${'</subform>'.repeat(depth)}`);
    expectForm(() => somExpressionOf(find(deep.dom, 'field', 'Leaf')), 'LIMIT');
  });
});
