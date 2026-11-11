import { describe, expect, it } from 'vitest';
import { parseXml } from '../../../xml/parse.js';
import { buildTemplateModel, isContainer, parseTemplate } from '../index.js';
import { expectXfa, firstOfClass, modelOf, must, nodeNamed, NS28, tpl } from './helpers.js';

describe('template model identity and links', () => {
  const model = modelOf(
    tpl(`<field name="a"><ui><textEdit/></ui><value><text>x</text></value></field>
      <subform name="inner"><field name="b"/><field name="b"/><draw name="d"/></subform>`),
  );

  it('every node id equals its index in model.nodes, in document order (a shifted id would make later tasks bind to the wrong node)', () => {
    model.nodes.forEach((node, i) => expect(node.id).toBe(i));
    expect(model.nodes[0]).toBe(model.root);
    expect(model.root.className).toBe('template');
    const order = model.nodes.map((n) => (n.name === '' ? n.className : n.name));
    expect(order.slice(0, 5)).toEqual(['template', 'form1', 'a', 'ui', 'textEdit']);
  });

  it('parent, children and index agree for every node (a one-sided link breaks scope walks that climb parents)', () => {
    expect(model.root.parent).toBeNull();
    for (const node of model.nodes) {
      node.children.forEach((child, i) => {
        expect(child.parent).toBe(node);
        expect(child.index).toBe(i);
      });
      if (node.parent !== null) expect(node.parent.children[node.index]).toBe(node);
    }
  });

  it('same-name siblings keep document order in namedChildren, and an unknown name is an empty list (not undefined)', () => {
    const inner = nodeNamed(model, 'subform', 'inner');
    const bs = inner.namedChildren('b');
    expect(bs).toHaveLength(2);
    expect(bs[0]?.index).toBeLessThan(bs[1]?.index ?? -1);
    expect(inner.namedChildren('nope')).toEqual([]);
    expect(inner.childrenOfClass('field')).toEqual(bs);
    expect(inner.firstChild('draw')?.name).toBe('d');
    expect(inner.firstChild('border')).toBeUndefined();
  });

  it('the same node object is returned on every lookup (identity must be stable for the form DOM to key on it)', () => {
    const inner = nodeNamed(model, 'subform', 'inner');
    expect(inner.namedChildren('b')).toBe(inner.namedChildren('b'));
    expect(model.nodes[nodeNamed(model, 'field', 'a').id]).toBe(nodeNamed(model, 'field', 'a'));
  });
});

describe('container classification', () => {
  it('isContainer is true for the nodes that merge and scope names (subform, field, exclGroup, draw, area, pageSet, pageArea, contentArea) and false for properties and values', () => {
    const model = modelOf(
      tpl(`<pageSet><pageArea name="p"><contentArea/></pageArea></pageSet><area name="ar"><draw name="d"/></area><exclGroup name="g"><field name="f"><ui><textEdit/></ui><value><text/></value></field></exclGroup>`),
    );
    const containers = model.nodes.filter(isContainer).map((n) => n.className);
    expect(containers).toEqual(['subform', 'pageSet', 'pageArea', 'contentArea', 'area', 'draw', 'exclGroup', 'field']);
  });
});

describe('template model is read-only', () => {
  const model = modelOf(tpl('<field name="a"/>'));

  it('nodes and their child lists are frozen (a later task writing into the template would corrupt every form run)', () => {
    const field = nodeNamed(model, 'field', 'a');
    expect(Object.isFrozen(field)).toBe(true);
    expect(Object.isFrozen(field.parent?.children)).toBe(true);
    expect(() => {
      (field as { className: string }).className = 'draw';
    }).toThrow(TypeError);
    expect(() => {
      (field.parent?.children as unknown as unknown[]).push(1);
    }).toThrow(TypeError);
    expect(Object.isFrozen(model.nodes)).toBe(true);
  });

  it('attr() exposes values but no mutable map (assigning through the accessor result cannot change the template)', () => {
    const field = nodeNamed(model, 'field', 'a');
    expect(field.attr('name')).toBe('a');
    expect(field.attributeNames()).toEqual(['name']);
    const names = field.attributeNames() as string[];
    expect(() => names.push('x')).toThrow(TypeError);
  });
});

describe('what the builder keeps and drops', () => {
  it('xhtml inside exData is not modelled as XFA nodes: its exact markup is kept as richContent and its text projected with a newline between blocks (rich text lost or mis-classified otherwise)', () => {
    const model = modelOf(
      tpl(
        `<draw name="d"><value><exData contentType="text/html"><body xmlns="http://www.w3.org/1999/xhtml"><p>Hello <b>big</b> world</p><p>two</p></body></exData></value></draw>`,
      ),
    );
    const exData = firstOfClass(model, 'exData');
    expect(exData.children).toEqual([]);
    expect(exData.richContent).toBe('<body xmlns="http://www.w3.org/1999/xhtml"><p>Hello <b>big</b> world</p><p>two</p></body>');
    expect(exData.content).toBe('Hello big world\ntwo');
    expect(exData.attr('contentType')).toBe('text/html');
    expect(model.nodes.some((n) => n.className === 'body' || n.className === 'p')).toBe(false);
  });

  it('the exData text projection breaks lines at br and block elements, ignores layout whitespace between blocks and does not end in a newline (joined paragraphs would merge words)', () => {
    const model = modelOf(
      tpl(`<draw name="d"><value><exData contentType="text/html"><body xmlns="http://www.w3.org/1999/xhtml">
        <p>one<br/>two</p>
        <div>three</div>
        <ul><li>four</li><li>five <i>six</i></li></ul>
        seven
      </body></exData></value></draw>`),
    );
    expect(firstOfClass(model, 'exData').content).toBe('one\ntwo\nthree\nfour\nfive six\nseven');
  });

  it('inline-only exData keeps its spaces, and richContent is undefined on every other class (only rich text carries markup)', () => {
    const model = modelOf(
      tpl(`<draw name="d"><value><exData contentType="text/html"><body xmlns="http://www.w3.org/1999/xhtml"><span>a </span><b>b</b> c</body></exData></value><desc><text>t</text></desc></draw>`),
    );
    expect(firstOfClass(model, 'exData').content).toBe('a b c');
    expect(model.nodes.filter((n) => n.className !== 'exData').every((n) => n.richContent === undefined)).toBe(true);
  });

  it('comments and processing instructions never become nodes or text (renderer hints inside the template would otherwise leak into script text)', () => {
    const model = modelOf(
      tpl(`<?templateDesigner expand 1?><field name="a"><!-- note --><?formServer x?><value><text>a<!--c-->b</text></value></field>`),
    );
    expect(firstOfClass(model, 'text').content).toBe('ab');
    expect(nodeNamed(model, 'field', 'a').children.map((c) => c.className)).toEqual(['value']);
  });

  it('elements from a foreign namespace are skipped, not modelled as XFA classes (a look-alike element must not become a field)', () => {
    const model = modelOf(tpl(`<field name="a"/><x:field xmlns:x="urn:other" name="evil"/>`));
    expect(model.nodes.filter((n) => n.className === 'field').map((n) => n.name)).toEqual(['a']);
  });

  it('CDATA and entity text of a script is kept whole (a truncated script would run a different program)', () => {
    const model = modelOf(tpl(`<event activity="click"><script contentType="application/x-javascript"><![CDATA[if (a < b && c) { x(); }]]> &amp;&amp; y</script></event>`));
    expect(firstOfClass(model, 'script').content).toBe('if (a < b && c) { x(); } && y');
  });

  it('xsi:nil on a text item is a null item and an empty text element is not (a null save value conflated with the empty string breaks choice lists)', () => {
    const model = modelOf(
      tpl(
        `<field name="f"><items><text xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:nil="true"/><text/><text>x</text></items></field>`,
      ),
    );
    const [nilItem, emptyItem, textItem] = must(firstOfClass(model, 'items')).children;
    expect(nilItem?.nil).toBe(true);
    expect(nilItem?.content).toBe('');
    expect(emptyItem?.nil).toBe(false);
    expect(textItem?.nil).toBe(false);
  });

  it('xmlns declarations are not attributes, and attribute names like __proto__ stay plain data (prototype pollution through names)', () => {
    const model = modelOf(
      `<template xmlns="${NS28}" xmlns:a="urn:a"><subform name="s" __proto__="p" constructor="c" a:q="1"/></template>`,
    );
    const s = nodeNamed(model, 'subform', 's');
    expect(s.attributeNames()).toEqual(['name', '__proto__', 'constructor', 'a:q']);
    expect(s.attr('__proto__')).toBe('p');
    expect(s.attr('constructor')).toBe('c');
    expect(s.attr('toString')).toBeUndefined();
    expect(s.attr('xmlns')).toBeUndefined();
    expect(({} as Record<string, unknown>).p).toBeUndefined();
    expect(Object.getPrototypeOf({})).toBe(Object.prototype);
  });

  it('a node name that collides with Object.prototype members is found by name, not shadowed (namedChildren must not use a plain object map)', () => {
    const model = modelOf(tpl(`<field name="constructor"/><field name="__proto__"/><field name="toString"/>`));
    const form = nodeNamed(model, 'subform', 'form1');
    expect(form.namedChildren('constructor')).toHaveLength(1);
    expect(form.namedChildren('__proto__')).toHaveLength(1);
    expect(form.namedChildren('toString')).toHaveLength(1);
    expect(form.namedChildren('hasOwnProperty')).toEqual([]);
  });
});

describe('building from untrusted text', () => {
  it('a root element that is not <template> is MALFORMED_XML (a different XFA packet must not be modelled as a template)', () => {
    expectXfa(() => modelOf(`<datasets xmlns="${NS28}"/>`), 'MALFORMED_XML', /template/);
  });

  it('a template with a foreign namespace builds (so the gate can name it) but records that namespace', () => {
    const model = modelOf(`<template xmlns="urn:something-else"><subform name="x"/></template>`);
    expect(model.namespace).toBe('urn:something-else');
    expect(model.root.children.map((c) => c.className)).toEqual(['subform']);
  });

  it('parseTemplate surfaces a DOCTYPE as UNSUPPORTED_FEATURE and bad XML as MALFORMED_XML (the typed XML errors must pass through unchanged)', () => {
    expectXfa(() => parseTemplate(`<!DOCTYPE t [<!ENTITY a "b">]><template xmlns="${NS28}"/>`), 'UNSUPPORTED_FEATURE');
    expectXfa(() => parseTemplate(`<template xmlns="${NS28}"><subform></template>`), 'MALFORMED_XML');
  });

  it('250 levels of nesting build without a stack overflow (a recursive builder would throw RangeError on hostile depth)', () => {
    const depth = 250;
    const xml = `<template xmlns="${NS28}">${'<subform name="s">'.repeat(depth)}${'</subform>'.repeat(depth)}</template>`;
    const model = buildTemplateModel(parseXml(xml));
    expect(model.nodes).toHaveLength(depth + 1);
  });

  it('60,000 sibling fields build in linear time and name lookup stays cheap (a quadratic index would hang on a hostile template)', () => {
    const count = 60_000;
    const xml = tpl(`<field name="same"/>`.repeat(count));
    const started = performance.now();
    const model = modelOf(xml);
    const form = nodeNamed(model, 'subform', 'form1');
    expect(form.namedChildren('same')).toHaveLength(count);
    expect(performance.now() - started).toBeLessThan(10_000);
  });
});
