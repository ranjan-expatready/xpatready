import { describe, expect, it } from 'vitest';
import { attrWithDefault, getElement, getProperty, type TemplateNode } from '../index.js';
import { firstOfClass, modelOf, must, nodeNamed, tpl } from './helpers.js';

const plainField = tpl(`<field name="plain"><ui><textEdit/></ui></field>`);

/** `field.ui.oneOfChild.border.getElement('edge', 0).color` as the form scripts walk it. */
function edgeColorOf(field: TemplateNode, index = 0): TemplateNode {
  const widget = must(must(field.firstChild('ui')).oneOfChild, 'ui widget');
  const border = must(getProperty(widget, 'border'), 'border');
  const edge = must(getElement(border, 'edge', index), `edge ${index}`);
  return must(getProperty(edge, 'color'), 'edge color');
}

describe('implicit property nodes for absent properties (A3)', () => {
  const model = modelOf(plainField);
  const field = nodeNamed(model, 'field', 'plain');

  it('a field with no <border> still answers ui.oneOfChild.border.getElement("edge", 0).color.value with the default black (a null here crashes the form scripts at load)', () => {
    expect(edgeColorOf(field).attr('value')).toBe('0,0,0');
  });

  it('the implicit border is a frozen, non-listed node owned by the widget: implicit flag set, id -1, not among model.nodes or the owner children', () => {
    const widget = must(must(field.firstChild('ui')).oneOfChild);
    const border = must(getProperty(widget, 'border'));
    expect(border.implicit).toBe(true);
    expect(border.id).toBe(-1);
    expect(border.parent).toBe(widget);
    expect(Object.isFrozen(border)).toBe(true);
    expect(widget.children).toEqual([]);
    expect(model.nodes).not.toContain(border);
  });

  it('an implicit border has four edges and four corners with the default presence, stroke and thickness (scripts loop i < 4 and set them)', () => {
    const widget = must(must(field.firstChild('ui')).oneOfChild);
    const border = must(getProperty(widget, 'border'));
    for (let i = 0; i < 4; i += 1) {
      const edge = must(getElement(border, 'edge', i));
      expect(edge.className).toBe('edge');
      expect([edge.attr('presence'), edge.attr('stroke'), edge.attr('thickness')]).toEqual(['visible', 'solid', '0.5pt']);
      const corner = must(getElement(border, 'corner', i));
      expect([corner.attr('join'), corner.attr('inverted'), corner.attr('radius')]).toEqual(['square', '0', '0in']);
    }
    expect(getElement(border, 'edge', 4)).toBeUndefined();
    expect(getElement(border, 'corner', 4)).toBeUndefined();
  });

  it('the implicit border fill colour is white and an edge or corner colour is black (the card defaults; swapped values would paint the wrong colours)', () => {
    const widget = must(must(field.firstChild('ui')).oneOfChild);
    const border = must(getProperty(widget, 'border'));
    const fillColor = must(getProperty(must(getProperty(border, 'fill')), 'color'));
    expect(fillColor.attr('value')).toBe('255,255,255');
    expect(must(getProperty(must(getElement(border, 'corner', 2)), 'color')).attr('value')).toBe('0,0,0');
  });

  it('the border is reachable from the field itself and from each widget class a script can name (ui.resolveNode("#choiceList").border)', () => {
    const m = modelOf(
      tpl(`<field name="f"><ui><choiceList/></ui></field><subform name="s"/><exclGroup name="g"/><draw name="d"/>`),
    );
    for (const n of [nodeNamed(m, 'field', 'f'), nodeNamed(m, 'subform', 's'), nodeNamed(m, 'exclGroup', 'g'), nodeNamed(m, 'draw', 'd'), firstOfClass(m, 'choiceList')]) {
      expect(getProperty(n, 'border')?.className, n.className).toBe('border');
    }
  });

  it('repeated reads return the same implicit node object (a fresh object per read would lose a script write between two reads)', () => {
    expect(edgeColorOf(field)).toBe(edgeColorOf(field));
    expect(edgeColorOf(field, 1)).not.toBe(edgeColorOf(field, 0));
    const widget = must(must(field.firstChild('ui')).oneOfChild);
    expect(getProperty(widget, 'border')).toBe(getProperty(widget, 'border'));
  });

  it('an explicit border with fewer than four edges answers the missing slots with defaults and keeps its own edge as slot 0', () => {
    const m = modelOf(
      tpl(`<field name="f"><ui><textEdit><border presence="hidden"><edge thickness="2pt"/></border></textEdit></ui></field>`),
    );
    const f = nodeNamed(m, 'field', 'f');
    const border = must(getProperty(must(must(f.firstChild('ui')).oneOfChild), 'border'));
    expect(border.implicit).toBe(false);
    const own = must(getElement(border, 'edge', 0));
    expect(own).toBe(firstOfClass(m, 'edge'));
    expect(own.implicit).toBe(false);
    expect(own.attr('thickness')).toBe('2pt');
    expect(must(getProperty(own, 'color')).attr('value')).toBe('0,0,0');
    const slot3 = must(getElement(border, 'edge', 3));
    expect(slot3.implicit).toBe(true);
    expect(slot3.attr('thickness')).toBe('0.5pt');
    expect(slot3.parent).toBe(border);
    expect(getElement(border, 'edge', 4)).toBeUndefined();
    expect(border.children).toHaveLength(1);
  });

  it('an explicit <fill/> with no colour still answers white, but a font fill is not given a border default (the same class in a different owner)', () => {
    const m = modelOf(tpl(`<field name="f"><border><fill/></border><font><fill/></font></field>`));
    const f = nodeNamed(m, 'field', 'f');
    const borderFill = must(getProperty(must(f.firstChild('border')), 'fill'));
    expect(must(getProperty(borderFill, 'color')).attr('value')).toBe('255,255,255');
    const fontFill = must(must(f.firstChild('font')).firstChild('fill'));
    expect(getProperty(fontFill, 'color')).toBeUndefined();
  });

  it('caption and assist exist implicitly on a field with the spec defaults; an explicit one wins', () => {
    const m = modelOf(tpl(`<field name="a"/><field name="b"><caption placement="top"/><assist role="x"/></field>`));
    const a = nodeNamed(m, 'field', 'a');
    const caption = must(getProperty(a, 'caption'));
    expect(caption.implicit).toBe(true);
    expect([caption.attr('placement'), caption.attr('presence'), caption.attr('reserve')]).toEqual(['left', 'visible', '-1']);
    // The implicit caption value carries an empty default text, so `caption.value.resolveNode("#text")` finds one locally.
    const captionText = must(getProperty(must(getProperty(caption, 'value')), 'text'));
    expect([captionText.className, captionText.implicit, captionText.content]).toEqual(['text', true, '']);
    const assist = must(getProperty(a, 'assist'));
    expect(assist.implicit).toBe(true);
    expect(getProperty(assist, 'toolTip')?.className).toBe('toolTip');

    const b = nodeNamed(m, 'field', 'b');
    expect(getProperty(b, 'caption')).toBe(b.firstChild('caption'));
    expect(getProperty(b, 'assist')).toBe(b.firstChild('assist'));
  });

  it('unknown properties and properties of the wrong owner stay undefined (a blanket default would hide a misspelled script member)', () => {
    const m = modelOf(tpl(`<field name="f"/><subform name="s"/><draw name="d"/>`));
    const f = nodeNamed(m, 'field', 'f');
    expect(getProperty(f, 'nonexistent')).toBeUndefined();
    expect(getProperty(f, 'edge')).toBeUndefined();
    expect(getProperty(nodeNamed(m, 'subform', 's'), 'caption')).toBeUndefined();
    expect(getProperty(nodeNamed(m, 'draw', 'd'), 'caption')).toBeUndefined();
    expect(getElement(f, 'edge', 0)).toBeUndefined();
    expect(getElement(f, 'nonexistent', 0)).toBeUndefined();
  });

  it('a non-repeating property answers index 0 only, and an explicit property is returned as the same node object', () => {
    const m = modelOf(tpl(`<field name="f"><caption/></field>`));
    const f = nodeNamed(m, 'field', 'f');
    expect(getElement(f, 'caption', 0)).toBe(f.firstChild('caption'));
    expect(getElement(f, 'caption', 1)).toBeUndefined();
  });
});

describe('implicit validate', () => {
  it('a field, exclGroup and subform without <validate> answer the XFA defaults nullTest disabled, formatTest warning, scriptTest error (the default decides whether a field is mandatory)', () => {
    const m = modelOf(tpl(`<field name="f"/><exclGroup name="g"/><subform name="s"/>`));
    for (const owner of [nodeNamed(m, 'field', 'f'), nodeNamed(m, 'exclGroup', 'g'), nodeNamed(m, 'subform', 's')]) {
      const validate = must(getProperty(owner, 'validate'), owner.className);
      expect(validate.implicit).toBe(true);
      expect([validate.attr('nullTest'), validate.attr('formatTest'), validate.attr('scriptTest')]).toEqual(['disabled', 'warning', 'error']);
    }
  });

  it('a written <validate> wins and a draw has none (draw has no validate property)', () => {
    const m = modelOf(tpl(`<field name="f"><validate nullTest="error"/></field><draw name="d"/>`));
    const f = nodeNamed(m, 'field', 'f');
    expect(getProperty(f, 'validate')).toBe(f.firstChild('validate'));
    expect(getProperty(nodeNamed(m, 'draw', 'd'), 'validate')).toBeUndefined();
  });
});

describe('attribute defaults', () => {
  it('attrWithDefault returns the written value, else the class default, else undefined (an explicit <edge/> must still report thickness 0.5pt)', () => {
    const m = modelOf(tpl(`<field name="f" presence="hidden"><border><edge/><edge thickness="3pt"/></border></field>`));
    const [e0, e1] = nodeNamed(m, 'field', 'f').firstChild('border')?.childrenOfClass('edge') ?? [];
    expect(attrWithDefault(must(e0), 'thickness')).toBe('0.5pt');
    expect(attrWithDefault(must(e1), 'thickness')).toBe('3pt');
    expect(attrWithDefault(must(e0), 'nonsense')).toBeUndefined();
    const f = nodeNamed(m, 'field', 'f');
    expect(attrWithDefault(f, 'presence')).toBe('hidden');
    expect(attrWithDefault(f, 'access')).toBe('open');
  });

  it('presence defaults to visible for a container that does not say (the XFA default)', () => {
    const m = modelOf(tpl(`<field name="f"/>`));
    expect(attrWithDefault(nodeNamed(m, 'field', 'f'), 'presence')).toBe('visible');
  });
});

describe('the template and its implicit nodes are never mutated (A3)', () => {
  const xml = tpl(`<field name="plain"><ui><textEdit/></ui></field><field name="own" presence="visible"/>`);

  it('an implicit node is frozen: writing its colour, adding a child or changing its attributes throws, and a re-read still shows the default', () => {
    const model = modelOf(xml);
    const color = edgeColorOf(nodeNamed(model, 'field', 'plain'));
    expect(Object.isFrozen(color)).toBe(true);
    expect(() => {
      (color as { className: string }).className = 'x';
    }).toThrow(TypeError);
    expect(() => {
      (color.parent?.children as unknown as unknown[]).push(1);
    }).toThrow(TypeError);
    expect(() => (color.attributeNames() as string[]).push('x')).toThrow(TypeError);
    expect(edgeColorOf(nodeNamed(model, 'field', 'plain')).attr('value')).toBe('0,0,0');
  });

  it('reading implicit properties leaves model.nodes and every written node unchanged (materialising a default must not grow the template)', () => {
    const model = modelOf(xml);
    const before = model.nodes.map((n) => [n.id, n.className, n.children.length, n.attributeNames().join(',')]);
    for (const field of model.nodes.filter((n) => n.className === 'field')) {
      for (const cls of ['border', 'caption', 'assist', 'validate']) getProperty(field, cls);
      edgeColorOf(nodeNamed(model, 'field', 'plain'), 3);
    }
    expect(model.nodes.map((n) => [n.id, n.className, n.children.length, n.attributeNames().join(',')])).toEqual(before);
    expect(model.nodes.every((n) => !n.implicit)).toBe(true);
  });

  it('each build has its own implicit nodes: the same text parsed twice gives different objects with equal values (no module-level state shared between form runs)', () => {
    const a = edgeColorOf(nodeNamed(modelOf(xml), 'field', 'plain'));
    const b = edgeColorOf(nodeNamed(modelOf(xml), 'field', 'plain'));
    expect(a).not.toBe(b);
    expect(a.attr('value')).toBe(b.attr('value'));
  });
});

describe('layout defaults answer through attrWithDefault (W01-T01 A2)', () => {
  /** [class, attribute, default]: the XFA values a template that says nothing gets; layout reads these, so a wrong one moves every box. */
  const LAYOUT_DEFAULTS: readonly (readonly [string, string, string])[] = [
    ['subform', 'layout', 'position'],
    ['exclGroup', 'layout', 'position'],
    ['subform', 'anchorType', 'topLeft'],
    ['field', 'anchorType', 'topLeft'],
    ['draw', 'anchorType', 'topLeft'],
    ['exclGroup', 'anchorType', 'topLeft'],
    ['para', 'hAlign', 'left'],
    ['para', 'vAlign', 'top'],
    ['para', 'marginLeft', '0pt'],
    ['para', 'marginRight', '0pt'],
    ['para', 'spaceAbove', '0pt'],
    ['para', 'spaceBelow', '0pt'],
    ['para', 'textIndent', '0pt'],
    ['para', 'lineHeight', '0pt'],
    ['font', 'typeface', 'Courier'],
    ['font', 'size', '10pt'],
    ['font', 'weight', 'normal'],
    ['font', 'posture', 'normal'],
    ['font', 'baselineShift', '0pt'],
    ['font', 'letterSpacing', '0'],
    ['font', 'underline', '0'],
    ['font', 'lineThrough', '0'],
    ['font', 'overline', '0'],
    ['margin', 'topInset', '0in'],
    ['margin', 'rightInset', '0in'],
    ['margin', 'bottomInset', '0in'],
    ['margin', 'leftInset', '0in'],
    ['keep', 'intact', 'none'],
    ['keep', 'next', 'none'],
    ['keep', 'previous', 'none'],
    ['breakBefore', 'startNew', '0'],
    ['breakBefore', 'targetType', 'auto'],
  ];

  const model = modelOf(
    tpl(
      `<subform name="s"/><exclGroup name="g"/><field name="f"/><draw name="d"/><para name="p"/><font name="t"/><margin name="m"/><keep name="k"/><breakBefore name="b"/>`,
    ),
  );
  const nodeOf = (className: string): TemplateNode => must(model.nodes.filter((n) => n.className === className).at(-1), className);

  it.each(LAYOUT_DEFAULTS)('%s without %s answers %j (XFA 3.3 property default)', (className, attribute, expected) => {
    expect(attrWithDefault(nodeOf(className), attribute)).toBe(expected);
  });

  it('a value the template writes always wins over the default (a form that sets 12pt Arial must not read Courier 10pt)', () => {
    const written = modelOf(
      tpl(
        `<field name="f" anchorType="bottomRight"><font typeface="Arial" size="12pt" weight="bold" posture="italic"/><para hAlign="center" vAlign="middle" lineHeight="14pt"/><margin leftInset="1mm"/></field>` +
          `<subform name="s" layout="tb"><keep intact="contentArea"/><breakBefore startNew="1" targetType="pageArea"/></subform>`,
      ),
    );
    const one = (className: string): TemplateNode => must(written.nodes.find((n) => n.className === className), className);
    expect(attrWithDefault(one('field'), 'anchorType')).toBe('bottomRight');
    expect(['typeface', 'size', 'weight', 'posture'].map((a) => attrWithDefault(one('font'), a))).toEqual(['Arial', '12pt', 'bold', 'italic']);
    expect(['hAlign', 'vAlign', 'lineHeight'].map((a) => attrWithDefault(one('para'), a))).toEqual(['center', 'middle', '14pt']);
    expect(attrWithDefault(one('margin'), 'leftInset')).toBe('1mm');
    expect(attrWithDefault(one('margin'), 'topInset')).toBe('0in');
    const inner = must(written.nodes.filter((n) => n.className === 'subform').at(-1), 'inner subform');
    expect(attrWithDefault(inner, 'layout')).toBe('tb');
    expect(attrWithDefault(inner, 'anchorType')).toBe('topLeft');
    expect(attrWithDefault(one('keep'), 'intact')).toBe('contentArea');
    expect([attrWithDefault(one('breakBefore'), 'startNew'), attrWithDefault(one('breakBefore'), 'targetType')]).toEqual(['1', 'pageArea']);
  });

  it('classes and names the engine does not model still answer undefined (a blanket default would hide a misspelt attribute)', () => {
    expect(attrWithDefault(nodeOf('font'), 'colour')).toBeUndefined();
    expect(attrWithDefault(nodeOf('para'), 'typeface')).toBeUndefined();
    expect(attrWithDefault(nodeOf('draw'), 'layout')).toBeUndefined();
    expect(attrWithDefault(nodeOf('field'), 'layout')).toBeUndefined();
  });

  it('the new defaults add no implicit property node: font, para, margin, keep and breakBefore stay undefined for getProperty', () => {
    const field = nodeOf('field');
    for (const className of ['font', 'para', 'margin', 'keep', 'breakBefore']) expect(getProperty(field, className), className).toBeUndefined();
  });
});

describe('renderCache processing instructions are kept on the owning node (W01-T01 A3)', () => {
  const NS = 'http://www.xfa.org/schema/xfa-template/2.8/';
  const withPis = modelOf(
    `<?xml version="1.0" encoding="UTF-8"?><template xmlns="${NS}"><subform name="form1">` +
      `<draw name="a"><?renderCache.bounds 100 200 0 0 0 0 0 0?><?renderCache.textRun 2 Hi 0 0 6000 0 0 0 "Face" 0 0 6000 ISO-8859-1?><?other.pi keep-out?><ui><textEdit/></ui></draw>` +
      `<draw name="b"/><?renderCache.subset "Face" 0 0 ISO-8859-1 4 4 1 0003 ?></subform></template>`,
  );

  it('the node that owns the PIs lists them in document order, with the processing-instruction target and data joined by one space', () => {
    expect(nodeNamed(withPis, 'draw', 'a').renderCache).toEqual(['bounds 100 200 0 0 0 0 0 0', 'textRun 2 Hi 0 0 6000 0 0 0 "Face" 0 0 6000 ISO-8859-1']);
  });

  it('a node with no renderCache PI has the shared empty list, and a PI of another target is not kept', () => {
    expect(nodeNamed(withPis, 'draw', 'b').renderCache).toEqual([]);
    expect(nodeNamed(withPis, 'draw', 'a').renderCache.some((pi) => pi.includes('keep-out'))).toBe(false);
  });

  it('a PI written under the root subform belongs to that subform, and the model stays otherwise unchanged (same node count, ids and children)', () => {
    expect(nodeNamed(withPis, 'subform', 'form1').renderCache).toEqual(['subset "Face" 0 0 ISO-8859-1 4 4 1 0003 ']);
    const plain = modelOf(
      `<?xml version="1.0" encoding="UTF-8"?><template xmlns="${NS}"><subform name="form1"><draw name="a"><ui><textEdit/></ui></draw><draw name="b"/></subform></template>`,
    );
    expect(withPis.nodes.map((n) => [n.id, n.className, n.name, n.children.length])).toEqual(plain.nodes.map((n) => [n.id, n.className, n.name, n.children.length]));
  });

  it('the kept list is frozen, and implicit nodes carry an empty one', () => {
    const list = nodeNamed(withPis, 'draw', 'a').renderCache;
    expect(Object.isFrozen(list)).toBe(true);
    const caption = must(getProperty(nodeNamed(modelOf(plainField), 'field', 'plain'), 'caption'));
    expect(caption.renderCache).toEqual([]);
  });
});
