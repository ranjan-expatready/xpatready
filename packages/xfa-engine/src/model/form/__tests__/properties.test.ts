import { describe, expect, it } from 'vitest';
import { at, build, expectForm, must, textField } from './helpers.js';

const plain = textField('F');

describe('property nodes materialise on first write and keep identity (one write path)', () => {
  it('reading border/edge/color does not change the node list; the first write lists the border once and later reads return the same object', () => {
    const { dom } = build(plain);
    const widget = must(must(at(dom, 'F').property('ui')).oneOfChild);
    expect(widget.className).toBe('textEdit');
    const before = widget.nodes.length;
    const border = must(widget.property('border'));
    const edge = must(border.element('edge', 0));
    expect(must(edge.property('color')).attr('value')).toBe('0,0,0');
    expect(widget.nodes.length).toBe(before);
    must(edge.property('color')).setAttr('value', '231, 6, 6');
    expect(widget.nodes.length).toBe(before + 1);
    expect(widget.property('border')).toBe(border);
    expect(border.element('edge', 0)).toBe(edge);
    expect(border.nodes.length).toBeGreaterThanOrEqual(1);
  });

  it('a colour string written by a script reads back verbatim, spaces and all (forms later compare it with ==)', () => {
    const { dom } = build(plain);
    const border = must(must(must(at(dom, 'F').property('ui')).oneOfChild).property('border'));
    const color = must(must(border.element('edge', 2)).property('color'));
    for (const text of ['231, 6, 6', '255,0,0', ' 1 ,2, 3', '0, 0, 0']) {
      color.setAttr('value', text);
      expect(color.attr('value')).toBe(text);
    }
  });

  it('on a border that writes one edge, writing edge 2 first lists edges 1 and 2 after the written one, so getElement("edge", i) keeps meaning slot i', () => {
    const { dom } = build(textField('F').replace('<textEdit/>', '<textEdit><border><edge thickness="1pt"/></border></textEdit>'));
    const border = must(must(must(at(dom, 'F').property('ui')).oneOfChild).property('border'));
    const e2 = must(border.element('edge', 2));
    e2.setAttr('thickness', '2pt');
    const listed = border.childrenOfClass('edge');
    expect(listed).toHaveLength(3);
    expect(listed[2]).toBe(e2);
    expect(border.element('edge', 0)).toBe(listed[0]);
    expect(border.element('edge', 3)?.attr('thickness')).toBe('0.5pt');
  });

  it('removing a materialised border reverts the next read to the template state, and removing an unlisted default is harmless', () => {
    const { dom } = build(textField('F').replace('<textEdit/>', '<textEdit><border presence="hidden"/></textEdit>'));
    const widget = must(must(at(dom, 'F').property('ui')).oneOfChild);
    const border = must(widget.property('border'));
    expect(border.attr('presence')).toBe('hidden');
    border.setAttr('presence', 'visible');
    widget.nodes.remove(border);
    expect(border.parent).toBeNull();
    expect(widget.childrenOfClass('border')).toHaveLength(0);
    expect(must(widget.property('border')).attr('presence')).toBe('hidden');
    const other = build(plain);
    const w2 = must(must(at(other.dom, 'F').property('ui')).oneOfChild);
    const b2 = must(w2.property('border'));
    expect(() => w2.nodes.remove(b2)).not.toThrow();
  });

  it('fill.oneOfChild answers solid by default, and replacing the fill type with a created node works through nodes.remove/append', () => {
    const { dom } = build(plain);
    const border = must(must(must(at(dom, 'F').property('ui')).oneOfChild).property('border'));
    const fill = must(border.property('fill'));
    expect(fill.oneOfChild?.className).toBe('solid');
    const gradient = dom.createNode('linear', '');
    fill.nodes.append(gradient);
    expect(fill.oneOfChild).toBe(gradient);
    expect(gradient.parent).toBe(fill);
    fill.nodes.remove(gradient);
    const solid = dom.createNode('solid', '');
    fill.nodes.append(solid);
    expect(fill.oneOfChild).toBe(solid);
    expect(border.childrenOfClass('fill')).toHaveLength(1);
  });

  it('nodes.append moves a node between parents and refuses to create a cycle; remove of a non-child is a typed error', () => {
    const { dom } = build(`<subform name="A">${plain}</subform><subform name="B"/>`);
    const a = at(dom, 'A');
    const b = at(dom, 'B');
    const f = at(dom, 'A.F');
    b.nodes.append(f);
    expect(f.parent).toBe(b);
    expect(a.children).not.toContain(f);
    expectForm(() => f.nodes.append(b), 'INVALID_OPERATION');
    expectForm(() => a.nodes.remove(f), 'INVALID_OPERATION');
    expect(b.nodes.item(b.nodes.length - 1)).toBe(f);
    expect(b.nodes.item(999)).toBeNull();
  });

  it('createNode makes a detached node of the requested class, bounded in number', () => {
    const { dom } = build(plain);
    const n = dom.createNode('solid', '');
    expect([n.className, n.name, n.parent]).toEqual(['solid', '', null]);
    expect(dom.nodeById(n.id)).toBe(n);
  });
});

describe('presence, access, mandatory and messages', () => {
  it('presence and access read the effective value, accept only the XFA enumerations, and keep the written text', () => {
    const { dom } = build(plain);
    const f = at(dom, 'F');
    expect([f.presence, f.access]).toEqual(['visible', 'open']);
    f.presence = 'hidden';
    f.access = 'readOnly';
    expect([f.presence, f.access]).toEqual(['hidden', 'readOnly']);
    expectForm(() => {
      f.presence = 'Hidden';
    }, 'INVALID_ARGUMENT');
  });

  it('mandatory is validate.nullTest: writes show in validate.nullTest and the reverse, on a field with and without a validate element', () => {
    const { dom } = build(`${plain}${textField('G', '<validate nullTest="error"/>')}`);
    const g = at(dom, 'G');
    expect(g.mandatory).toBe('error');
    g.mandatory = 'disabled';
    expect(must(g.property('validate')).attr('nullTest')).toBe('disabled');
    const f = at(dom, 'F');
    expect(f.mandatory).toBe('disabled');
    f.mandatory = 'error';
    expect(must(f.property('validate')).attr('nullTest')).toBe('error');
    expectForm(() => {
      f.mandatory = 'required';
    }, 'INVALID_ARGUMENT');
  });

  it('validationMessage is the scriptTest text, formatMessage the formatTest text, mandatoryMessage the nullTest text; all writable', () => {
    const body = textField('F', '<validate><message><text name="formatTest">fmt</text><text name="scriptTest">val</text></message></validate>');
    const { dom } = build(body);
    const f = at(dom, 'F');
    expect([f.validationMessage, f.formatMessage, f.mandatoryMessage]).toEqual(['val', 'fmt', '']);
    f.mandatoryMessage = 'need';
    f.validationMessage = 'changed';
    expect([f.validationMessage, f.formatMessage, f.mandatoryMessage]).toEqual(['changed', 'fmt', 'need']);
  });
});

describe('caption text and rich text round trip', () => {
  const rich = `<exData contentType="text/html"><body xmlns="http://www.w3.org/1999/xhtml"><p>Req <span style="font-style:italic">now</span></p></body></exData>`;

  it('exData value is the exact XHTML markup, so read, prefix with a star, strip the star and write back restores the caption byte for byte', () => {
    const { dom } = build(textField('F', `<caption><value>${rich}</value></caption>`));
    const exData = must(must(must(at(dom, 'F').property('caption')).property('value')).childrenOfClass('exData')[0]);
    const original = exData.nodeValue;
    expect(original).toBe('<body xmlns="http://www.w3.org/1999/xhtml"><p>Req <span style="font-style:italic">now</span></p></body>');
    exData.nodeValue = `*${String(original)}`;
    expect(exData.nodeValue).toBe(`*${String(original)}`);
    exData.nodeValue = String(exData.nodeValue).replace(/^\*+|\*+$/g, '');
    expect(exData.nodeValue).toBe(original);
  });

  it('plain text caption values read and write as text', () => {
    const { dom } = build(textField('F', '<caption><value><text>Name</text></value></caption>'));
    const text = must(must(must(at(dom, 'F').property('caption')).property('value')).childrenOfClass('text')[0]);
    expect(text.nodeValue).toBe('Name');
    text.nodeValue = '*Name';
    expect(text.nodeValue).toBe('*Name');
  });

  it('a caption with no written value still has a value node, and the template model is never modified by any of these writes', () => {
    const { dom } = build(textField('F', '<caption/>'));
    const snapshot = (): string => JSON.stringify(dom.model.nodes.map((n) => [n.className, n.content, n.attributeNames().map((a) => n.attr(a))]));
    const before = snapshot();
    const value = must(must(at(dom, 'F').property('caption')).property('value'));
    value.setAttr('override', '1');
    at(dom, 'F').rawValue = 'changed';
    at(dom, 'F').presence = 'hidden';
    expect(snapshot()).toBe(before);
  });
});
