import { describe, expect, it, vi } from 'vitest';
import { layoutFlow } from '../../flow/layout-flow.js';
import { limitExceeded, XfaFormError } from '../../../model/form/errors.js';
import { XfaLayoutError } from '../../errors.js';
import { boxOf, findBox } from '../../flow/__tests__/helpers.js';
import { build, emptyTextContext } from './helpers.js';

/** SF-1: one box whose text cannot be read or laid out must not take the rest of the form down with it. */
const GOOD = '<field name="good" x="0pt" y="30pt" w="100pt" h="20pt"><ui><textEdit/></ui><value><text>fine</text></value></field>';

describe('layoutFlow: a text-layer failure stays in its own box', () => {
  it('a widget margin with an unsupported unit becomes an issue against that field, and the form still lays out', () => {
    const bad = '<field name="bad" x="0pt" y="0pt" w="100pt" h="20pt"><ui><textEdit><margin leftInset="1px"/></textEdit></ui><value><text>kept</text></value></field>';
    const { dom } = build(`${bad}${GOOD}`);
    const layout = layoutFlow(dom, emptyTextContext());
    const features = layout.issues.filter((i) => i.som.includes('bad')).map((i) => i.feature);
    expect(features.some((f) => f.startsWith('widget margin') && f.includes('leftInset'))).toBe(true);
    const names = layout.texts.map((t) => t.box.node.name);
    expect(names).toContain('good');
    // The unreadable margin is read as none: the field's own text is still drawn.
    expect(layout.texts.find((t) => t.box.node.name === 'bad')?.value?.lines[0]?.runs[0]?.text).toBe('kept');
    expect(layout.texts.find((t) => t.box.node.name === 'good')?.value?.lines[0]?.runs[0]?.text).toBe('fine');
  });

  it('a caption margin with an unsupported unit, next to an explicit reserve, is reported and the caption is still laid out', () => {
    const bad = '<field name="bad" x="0pt" y="0pt" w="100pt" h="20pt"><ui><textEdit/></ui><caption placement="left" reserve="30pt"><margin leftInset="1px"/><value><text>cap</text></value></caption></field>';
    const { dom } = build(`${bad}${GOOD}`);
    const layout = layoutFlow(dom, emptyTextContext());
    expect(layout.issues.some((i) => i.som.includes('bad') && i.feature.startsWith('caption margin') && i.feature.includes('leftInset'))).toBe(true);
    expect(layout.texts.find((t) => t.box.node.name === 'bad')?.caption?.lines[0]?.runs[0]?.text).toBe('cap');
    expect(layout.texts.map((t) => t.box.node.name)).toContain('good');
  });

  it('a caption with an automatic reserve and a bad margin is an issue and a zero inset, not a placeholder field', () => {
    const bad = '<field name="bad" x="0pt" y="0pt" w="100pt" h="20pt"><ui><textEdit/></ui><caption placement="left"><margin leftInset="1px"/><value><text>cap</text></value></caption></field>';
    const { dom } = build(`${bad}${GOOD}`);
    const layout = layoutFlow(dom, emptyTextContext());
    const box = boxOf(layout.root, 'field', 'bad');
    expect(box.placeholder).toBeUndefined();
    expect(box.caption?.auto).toBe(false);
    // Read as no margin: the reserve is the width of "cap" (3 x 6 pt at the fallback Courier), nothing more.
    expect(box.caption?.reservePt).toBeCloseTo(18, 2);
    expect(layout.issues.filter((i) => i.som.includes('bad') && i.feature.startsWith('caption margin') && i.feature.includes('leftInset'))).toHaveLength(1);
    expect(layout.texts.find((t) => t.box.node.name === 'bad')?.caption?.lines[0]?.runs[0]?.text).toBe('cap');
  });

  it('a growable field (no w) with a bad widget margin is an issue and a zero inset, not a placeholder field', () => {
    const bad = '<field name="bad" x="0pt" y="0pt"><ui><textEdit><margin leftInset="1px"/></textEdit></ui><value><text>abcd</text></value></field>';
    const { dom } = build(`${bad}${GOOD}`);
    const layout = layoutFlow(dom, emptyTextContext());
    const box = boxOf(layout.root, 'field', 'bad');
    expect(box.placeholder).toBeUndefined();
    // Four characters at 6 pt, no inset.
    expect(box.rect.widthPt).toBeCloseTo(24, 2);
    expect(layout.issues.filter((i) => i.som.includes('bad') && i.feature.startsWith('widget margin') && i.feature.includes('leftInset'))).toHaveLength(1);
    expect(layout.texts.find((t) => t.box.node.name === 'bad')?.value?.lines[0]?.runs[0]?.text).toBe('abcd');
  });

  it('a typed engine error while laying out one box is a failure entry (a placeholder) for that box only', () => {
    const { dom } = build(`<draw name="bad" x="0pt" y="0pt" w="100pt" h="20pt"><value><text>x</text></value></draw>${GOOD}`);
    const ctx = emptyTextContext();
    const real = ctx.resolve.bind(ctx);
    vi.spyOn(ctx, 'resolve').mockImplementation((node, style) => {
      if (node.name === 'bad') throw new XfaLayoutError('INVALID_ARGUMENT', 'layoutText: simulated');
      return real(node, style);
    });
    const layout = layoutFlow(dom, ctx);
    const entry = layout.texts.find((t) => t.box.node.name === 'bad');
    expect(entry?.value).toBeUndefined();
    expect(entry?.failures).toHaveLength(1);
    expect(entry?.failures?.[0]).toMatchObject({ part: 'value' });
    expect(entry?.failures?.[0]?.reason).toContain('simulated');
    expect(layout.failedBlocks).toHaveLength(1);
    expect(layout.issues.some((i) => i.som.includes('bad') && i.feature.includes('simulated'))).toBe(true);
    expect(layout.texts.find((t) => t.box.node.name === 'good')?.value?.lines).toHaveLength(1);
    expect(boxOf(layout.root, 'field', 'good').placeholder).toBeUndefined();
    expect(findBox(layout.root, (b) => b.node.name === 'bad').placeholder).toBeUndefined();
  });

  it('a non-engine error still propagates (it is a bug, not a form problem)', () => {
    const { dom } = build(`<draw name="bad" x="0pt" y="0pt" w="100pt" h="20pt"><value><text>x</text></value></draw>`);
    const ctx = emptyTextContext();
    vi.spyOn(ctx, 'resolve').mockImplementation(() => {
      throw new TypeError('bug');
    });
    expect(() => layoutFlow(dom, ctx)).toThrow(TypeError);
  });

  it('a document-wide form LIMIT stops the layout, in plain text and in a rich block, instead of becoming one box\'s failure', () => {
    const plain = build('<draw name="d" x="0pt" y="0pt" w="100pt" h="20pt"><value><text>x</text></value></draw>').dom;
    const rich = build('<draw name="d" x="0pt" y="0pt" w="100pt" h="20pt"><value><exData contentType="text/html"><body xmlns="http://www.w3.org/1999/xhtml"><p>x</p></body></exData></value></draw>').dom;
    for (const dom of [plain, rich]) {
      const ctx = emptyTextContext();
      vi.spyOn(ctx, 'resolve').mockImplementation(() => {
        throw limitExceeded('too many nodes');
      });
      expect(() => layoutFlow(dom, ctx)).toThrow(XfaFormError);
    }
  });
});
