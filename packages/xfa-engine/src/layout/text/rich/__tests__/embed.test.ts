import { describe, expect, it } from 'vitest';
import { layoutBoxes } from '../../../box/build.js';
import { createCaptionReserve } from '../../caption-reserve.js';
import { layoutBoxTexts } from '../../box-text.js';
import { createTextContext } from '../../context.js';
import { build, find, rect } from '../../__tests__/helpers.js';
import { BODY_OPEN } from './helpers.js';

/** Without embedded fonts every typeface is the fixed-pitch Courier fallback: 6 pt a character at 10 pt. */
const FRAME = rect(0, 0, 0, 0);

const embed = (id: string, mode?: string): string => `<span xfa:embedType="uri"${mode === undefined ? '' : ` xfa:embedMode="${mode}"`} xfa:embed="#${id}"></span>`;
const pageDraw = (inner: string): string =>
  `<draw name="pages" w="300pt" h="20pt"><value><exData contentType="text/html">${BODY_OPEN}<p>${inner}</p></body></exData></value></draw>`;
/** A hidden master-page style field: a page counter and a page total (a picture makes the formatted value differ from the raw one). */
const counters = `
  <field name="CurrentPage" id="floatingField1" presence="hidden"><ui><numericEdit/></ui><value><integer>3</integer></value></field>
  <field name="PageCount" id="floatingField2" presence="hidden"><ui><numericEdit/></ui><value><text/></value><format><picture>num{99}</picture></format><bind><picture>num{99}</picture></bind></field>`;

function textOf(body: string, data = '<form1><PageCount>07</PageCount></form1>'): { lines: string[]; issues: string[] } {
  const { dom } = build(body, data);
  const ctx = createTextContext([], [], dom);
  const { box } = layoutBoxes(find(dom, 'draw', 'pages'), FRAME, { captionReserve: createCaptionReserve(ctx) });
  const texts = layoutBoxTexts(box, ctx);
  return { lines: texts[0]?.value?.lines.map((l) => l.runs.map((r) => r.text).join('')) ?? [], issues: ctx.sink.issues.map((i) => i.feature).filter((f) => !f.startsWith('font.')) };
}

describe('xfa:embed', () => {
  it('PAGE <CurrentPage> OF <PageCount> shows the two fields\' current formatted values inline, in the draw\'s style', () => {
    const body = counters + pageDraw(`PAGE<span style="xfa-spacerun:yes"> </span>${embed('floatingField1', 'formatted')} OF<span style="xfa-spacerun:yes"> </span>${embed('floatingField2', 'formatted')}`);
    expect(textOf(body)).toEqual({ lines: ['PAGE 3 OF 07'], issues: [] });
  });

  it('embedMode raw shows the stored value, formatted the picture\'s; both fields are hidden and still resolve', () => {
    expect(textOf(counters + pageDraw(embed('floatingField2', 'raw'))).lines).toEqual(['7']);
    expect(textOf(counters + pageDraw(embed('floatingField2', 'formatted'))).lines).toEqual(['07']);
  });

  it('an embed with no embedMode shows the formatted value (the one a viewer shows; the specification page is not cited)', () => {
    expect(textOf(counters + pageDraw(embed('floatingField2'))).lines).toEqual(['07']);
  });

  it('an embed whose id is missing is reported and contributes an empty run; the rest of the line stays', () => {
    const out = textOf(counters + pageDraw(`A${embed('nope', 'raw')}B`));
    expect(out.lines).toEqual(['AB']);
    expect(out.issues).toEqual(['rich.embed.missing: #nope']);
  });

  it('an id that is not a #reference is reported and shows nothing', () => {
    const out = textOf(counters + pageDraw('A<span xfa:embed="floatingField1"></span>B'));
    expect(out.lines).toEqual(['AB']);
    expect(out.issues).toEqual(['rich.embed: id is not a #reference (floatingField1)']);
  });

  it('an embed attribute outside the xfa namespace is reported, not read, and shows nothing', () => {
    const plain = textOf(counters + pageDraw('A<span embed="#floatingField1"></span>B'));
    expect(plain.lines).toEqual(['AB']);
    expect(plain.issues).toEqual(['rich.embed: attribute embed is not in the xfa namespace (ignored)']);
    const other = textOf(counters + pageDraw('A<span xmlns:foo="urn:example:other" foo:embed="#floatingField1" foo:embedMode="raw"></span>B'));
    expect(other.lines).toEqual(['AB']);
    expect(other.issues).toEqual(['rich.embed: attribute foo:embed is not in the xfa namespace (ignored)', 'rich.embed: attribute foo:embedMode is not in the xfa namespace (ignored)']);
  });

  it('the value is read each time from the form: a script-written value is what the next layout shows', () => {
    const { dom } = build(counters + pageDraw(embed('floatingField1', 'raw')), '<form1/>');
    const ctx = createTextContext([], [], dom);
    const draw = find(dom, 'draw', 'pages');
    const shown = (): string | undefined => layoutBoxTexts(layoutBoxes(draw, FRAME).box, ctx)[0]?.value?.lines[0]?.runs[0]?.text;
    expect(shown()).toBe('3');
    find(dom, 'field', 'CurrentPage').rawValue = '9';
    expect(shown()).toBe('9');
  });

  it('with no form given to the text context every embed is reported missing', () => {
    const { dom } = build(counters + pageDraw(embed('floatingField1', 'raw')));
    const ctx = createTextContext([], []);
    layoutBoxTexts(layoutBoxes(find(dom, 'draw', 'pages'), FRAME).box, ctx);
    expect(ctx.sink.issues.map((i) => i.feature).filter((f) => !f.startsWith('font.'))).toEqual(['rich.embed.missing: #floatingField1']);
  });
});
