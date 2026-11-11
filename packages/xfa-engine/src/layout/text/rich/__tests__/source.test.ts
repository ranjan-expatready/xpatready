import { describe, expect, it } from 'vitest';
import { layoutBoxes } from '../../../box/build.js';
import { itemSchema } from '../../../render-tree.js';
import { layoutBoxTexts, toPlaceholderItem } from '../../box-text.js';
import { createCaptionReserve } from '../../caption-reserve.js';
import type { FormDom, FormNode } from '../../../../model/form/index.js';
import { build, emptyTextContext, find, rect } from '../../__tests__/helpers.js';
import { BODY_OPEN } from './helpers.js';

const FRAME = rect(0, 0, 0, 0);
const exData = (inner: string): string => `<exData contentType="text/html">${BODY_OPEN}${inner}</body></exData>`;
const BAD = '<body xmlns="http://www.w3.org/1999/xhtml"><p>never closed</body>';
const DOCTYPE = '<!DOCTYPE b [<!ENTITY e "boom">]><body xmlns="http://www.w3.org/1999/xhtml"><p>&e;</p></body>';

/** Markup a template cannot hold (the template is parsed as XML) but a script can assign: the value of the first rich node under `owner`. */
function script(owner: FormNode, markup: string): void {
  let rich: FormNode | undefined;
  const visit = (n: FormNode): void => {
    if (rich === undefined && n.className === 'exData') rich = n;
    n.children.forEach(visit);
  };
  visit(owner);
  if (rich === undefined) throw new Error('no exData under the node');
  rich.nodeValue = markup;
}
const draw = (name: string, y: number, value: string): string => `<draw name="${name}" x="0pt" y="${y}pt" w="100pt" h="20pt"><value>${value}</value></draw>`;

function layoutAll(body: string, names: string[], writes: Readonly<Record<string, string>> = {}): { texts: ReturnType<typeof layoutBoxTexts>[]; ctx: ReturnType<typeof emptyTextContext>; dom: FormDom } {
  const { dom } = build(`<subform name="page" layout="position" w="200pt" h="200pt">${body}</subform>`);
  for (const [name, markup] of Object.entries(writes)) script(find(dom, 'draw', name), markup);
  const ctx = emptyTextContext();
  const texts = names.map((name) => layoutBoxTexts(layoutBoxes(find(dom, 'draw', name), FRAME, { captionReserve: createCaptionReserve(ctx) }).box, ctx));
  return { texts, ctx, dom };
}

describe('a rich block that cannot be laid out', () => {
  it('malformed markup becomes a placeholder with an issue; the draws around it still lay out', () => {
    const body = draw('before', 0, exData('<p>ok</p>')) + draw('bad', 20, exData('<p>x</p>')) + draw('after', 40, exData('<p>fine</p>'));
    const { texts, ctx } = layoutAll(body, ['before', 'bad', 'after'], { bad: BAD });
    expect(texts[0]?.[0]?.value?.lines[0]?.runs[0]?.text).toBe('ok');
    expect(texts[2]?.[0]?.value?.lines[0]?.runs[0]?.text).toBe('fine');
    const failed = texts[1]?.[0];
    expect(failed?.value).toBeUndefined();
    expect(failed?.failures).toHaveLength(1);
    expect(failed?.failures?.[0]?.part).toBe('value');
    expect(failed?.failures?.[0]?.reason).toContain('rich text could not be laid out');
    const feature = ctx.sink.issues.filter((i) => i.feature.startsWith('rich text could not'));
    expect(feature).toHaveLength(1);
    expect(feature[0]?.som).toContain('bad');
  });

  it('the placeholder item sits on the draw\'s text region in the layout frame and is a valid render-tree item', () => {
    const { texts, dom } = layoutAll(draw('bad', 20, exData('<p>x</p>')), ['bad'], { bad: BAD });
    const box = layoutBoxes(find(dom, 'draw', 'bad'), FRAME).box;
    const failure = texts[0]?.[0]?.failures?.[0];
    expect(failure).toBeDefined();
    const item = toPlaceholderItem(box, failure ?? (undefined as never));
    expect(item.rect).toEqual({ xPt: box.rect.xPt + failure!.region.xPt, yPt: box.rect.yPt + failure!.region.yPt, widthPt: 100, heightPt: 20 });
    expect(() => itemSchema.parse(item)).not.toThrow();
  });

  it('a DOCTYPE in the markup is refused (no entity is expanded) and the draw becomes a placeholder', () => {
    const { texts, ctx } = layoutAll(draw('evil', 0, exData('<p>x</p>')), ['evil'], { evil: DOCTYPE });
    expect(texts[0]?.[0]?.failures).toHaveLength(1);
    expect(ctx.sink.issues.some((i) => i.feature.includes('could not be laid out'))).toBe(true);
  });
});

describe('para tabDefault', () => {
  const tabbed = (para: string): string => draw('t', 0, exData('<p style="margin-left:20pt"><span style="xfa-tab-count:1"> </span>a</p>')).replace('</draw>', `${para}</draw>`);
  const textStart = (para: string): { x: number | undefined; issues: string[] } => {
    const { texts, ctx } = layoutAll(tabbed(para), ['t']);
    return { x: texts[0]?.[0]?.value?.lines[1]?.xPt, issues: ctx.sink.issues.map((i) => i.feature).filter((f) => !f.startsWith('font.')) };
  };

  it('is the tab interval: points when written with a unit, TEMPLATE_LENGTH_UNIT (inches) when bare, 36 pt when absent', () => {
    expect(textStart('<para tabDefault="10pt"/>').x).toBe(20 + 10);
    expect(textStart('<para tabDefault="1"/>').x).toBe(20 + 72);
    expect(textStart('<para/>').x).toBe(20 + 36);
  });

  it('a value that is not a length is reported against the para and the default interval is used', () => {
    const { x, issues } = textStart('<para tabDefault="abc"/>');
    expect(x).toBe(20 + 36);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatch(/^para tabDefault: /);
  });

  it('a value that is not positive is reported and the default interval is used', () => {
    const { x, issues } = textStart('<para tabDefault="0pt"/>');
    expect(x).toBe(20 + 36);
    expect(issues).toEqual(['para tabDefault 0pt is not positive (the default tab interval is used)']);
  });
});

describe('rich captions', () => {
  const field = (caption: string, attrs = 'w="200pt" h="40pt"'): string => `<field name="f" ${attrs}><ui><textEdit/></ui>${caption}</field>`;
  const richCaption = (placement: string, inner: string): string => `<caption placement="${placement}"><value>${exData(inner)}</value></caption>`;

  it('reserve the room their runs need: the widest line for left / right, the block height for top / bottom', () => {
    const ctx = emptyTextContext();
    const hook = createCaptionReserve(ctx);
    const ask = (caption: string, placement: 'left' | 'top'): number | 'auto' => hook(find(build(field(caption)).dom, 'field', 'f'), placement, rect(0, 0, 200, 40));
    expect(ask(richCaption('left', '<p>* Ye<span style="font-style:italic">s</span></p>'), 'left')).toBe(6 * 5);
    expect(ask(richCaption('top', '<p>one</p><p>two</p>'), 'top')).toBe(12 + 10);
  });

  it('a caption with empty markup or an empty paragraph reserves nothing, like an empty plain caption', () => {
    const hook = createCaptionReserve(emptyTextContext());
    for (const inner of ['', '<p/>']) {
      const node = find(build(field(richCaption('left', inner))).dom, 'field', 'f');
      expect(hook(node, 'left', rect(0, 0, 200, 40)), inner).toBe(0);
      expect(hook(node, 'top', rect(0, 0, 200, 40)), inner).toBe(0);
    }
  });

  it('are laid out in the caption strip with their runs, and a malformed one reserves nothing and is a placeholder', () => {
    const good = build(field(richCaption('left', '<p>ab<span style="font-size:8pt">cd</span></p>'))).dom;
    const ctx = emptyTextContext();
    const { box } = layoutBoxes(find(good, 'field', 'f'), FRAME, { captionReserve: createCaptionReserve(ctx) });
    expect(box.caption?.reservePt).toBeCloseTo(12 + 9.6, 6);
    const caption = layoutBoxTexts(box, ctx)[0]?.caption;
    expect(caption?.lines[0]?.runs.map((r) => r.text)).toEqual(['ab', 'cd']);

    const bad = build(field(richCaption('left', '<p>x</p>'))).dom;
    script(find(bad, 'field', 'f'), BAD);
    const ctx2 = emptyTextContext();
    const laid = layoutBoxes(find(bad, 'field', 'f'), FRAME, { captionReserve: createCaptionReserve(ctx2) }).box;
    expect(laid.caption?.reservePt).toBe(0);
    expect(layoutBoxTexts(laid, ctx2)[0]?.failures?.[0]?.part).toBe('caption');
  });
});
