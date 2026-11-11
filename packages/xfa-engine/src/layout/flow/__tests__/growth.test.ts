import { describe, expect, it } from 'vitest';
import { build, expectLayoutError, find } from '../../box/__tests__/helpers.js';
import { MAX_BOX_DEPTH } from '../../box/limits.js';
import { itemSchema } from '../../render-tree.js';
import { emptyTextContext } from '../../text/__tests__/helpers.js';
import { BODY_OPEN } from '../../text/rich/__tests__/helpers.js';
import { layoutFlow } from '../layout-flow.js';
import { draw, expectBox, featuresOf, named, run, text, textField } from './helpers.js';

/** Fallback font at 10 pt: 6 pt per character, one line 10 pt (ascent 6.27 + descent 3.73), pitch 12, so n lines are (n - 1) x 12 + 10. */
const WORDS = 'aaaa bbbb cccc';

describe('growable field: the height the text needs', () => {
  it('a multiLine field with a given width and no h grows to its 3 wrapped lines', () => {
    const { layout } = run(`<subform name="s" layout="tb">${textField('f', 'w="30pt"', text(WORDS), '<textEdit multiLine="1"/>')}</subform>`);
    expectBox(layout, 'f', 0, 0, 30, 34);
    const lines = layout.texts.find((entry) => entry.box.node.name === 'f')?.value?.lines.map((line) => line.runs[0]?.text);
    expect(lines).toEqual(['aaaa ', 'bbbb ', 'cccc']);
    expectBox(layout, 's', 0, 0, 30, 34);
  });

  it('the widget margin, the field margin and a top caption add to the height', () => {
    const field = textField('f', 'w="30pt"', `${text(WORDS)}<margin topInset="1pt" bottomInset="2pt" leftInset="0pt" rightInset="0pt"/><caption placement="top" reserve="8pt"/>`, '<textEdit multiLine="1"><margin topInset="3pt" bottomInset="0pt" leftInset="0pt" rightInset="0pt"/></textEdit>');
    const { layout } = run(`<subform name="s" layout="tb">${field}</subform>`);
    expectBox(layout, 'f', 0, 0, 30, 34 + 1 + 2 + 3 + 8);
    expect(named(layout, 'f').caption?.reservePt).toBe(8);
    expect(named(layout, 'f').widgetRect.heightPt).toBeCloseTo(37, 2);
  });

  it('a single-line field is one line high however much text it holds, and the overflow is flagged by the text layer', () => {
    const { layout } = run(`<subform name="s" layout="tb">${textField('f', 'w="30pt"', text(WORDS))}</subform>`);
    expectBox(layout, 'f', 0, 0, 30, 10);
    expect(layout.texts.find((entry) => entry.box.node.name === 'f')?.value?.overflow.horizontal).toBe(true);
  });

  it('an empty field is one line of its font high', () => {
    const { layout } = run(`<subform name="s" layout="tb">${textField('f', 'w="30pt"')}</subform>`);
    expectBox(layout, 'f', 0, 0, 30, 10);
  });

  it('minH is the floor and a taller text grows past it', () => {
    const body = (min: string): string => `<subform name="s" layout="tb">${textField('f', `w="30pt" minH="${min}"`, text(WORDS), '<textEdit multiLine="1"/>')}</subform>`;
    expectBox(run(body('50pt')).layout, 'f', 0, 0, 30, 50);
    expectBox(run(body('20pt')).layout, 'f', 0, 0, 30, 34);
  });

  it('maxH caps the height, reported, and a maxH of 0 means no maximum', () => {
    const body = (max: string): string => `<subform name="s" layout="tb">${textField('f', `w="30pt" maxH="${max}"`, text(WORDS), '<textEdit multiLine="1"/>')}</subform>`;
    const capped = run(body('20pt')).layout;
    expectBox(capped, 'f', 0, 0, 30, 20);
    expect(featuresOf(capped)).toContain('content taller than maxH (capped at 20pt; the content overflows)');
    const free = run(body('0pt')).layout;
    expectBox(free, 'f', 0, 0, 30, 34);
    expect(featuresOf(free).filter((f) => f.startsWith('content taller'))).toEqual([]);
  });

  it('an h written by the form is kept, never replaced by the text height', () => {
    const { layout } = run(`<subform name="s" layout="tb">${textField('f', 'w="30pt" h="12pt"', text(WORDS), '<textEdit multiLine="1"/>')}</subform>`);
    expectBox(layout, 'f', 0, 0, 30, 12);
  });
});

describe('growable width', () => {
  it('a field with no w is as wide as its text, plus margins and the caption strip on the left', () => {
    const field = textField('f', 'h="20pt"', `${text('abcde')}<margin leftInset="2pt" rightInset="3pt" topInset="0pt" bottomInset="0pt"/><caption placement="left" reserve="18pt"/>`);
    const { layout } = run(`<subform name="s" layout="tb">${field}</subform>`);
    expectBox(layout, 'f', 0, 0, 2 + 3 + 18 + 30, 20);
    expect(named(layout, 'f').widgetRect.widthPt).toBeCloseTo(30, 2);
  });

  it('a caption with no reserve is measured once and the strip is the width of its text', () => {
    const field = textField('f', 'h="20pt"', `${text('abcde')}<caption placement="left"><value><text>Name</text></value></caption>`);
    const { layout } = run(`<subform name="s" layout="tb">${field}</subform>`);
    expectBox(layout, 'f', 0, 0, 24 + 30, 20);
    expect(named(layout, 'f').caption).toMatchObject({ reservePt: 24, auto: false, clamped: false });
  });

  it('a draw with no w and no h is as large as its text plus its margin; its text is laid out unwrapped in it', () => {
    const d = draw('d', '', `<value><text>abcde fgh</text></value><margin leftInset="1pt" rightInset="2pt" topInset="3pt" bottomInset="4pt"/>`);
    const { layout } = run(`<subform name="s" layout="tb">${d}${draw('below', 'w="5pt" h="5pt"')}</subform>`);
    expectBox(layout, 'd', 0, 0, 1 + 2 + 54, 3 + 4 + 10);
    expectBox(layout, 'below', 0, 17, 5, 5);
    expect(layout.texts[0]?.value?.lines.map((line) => line.runs[0]?.text)).toEqual(['abcde fgh']);
  });

  it('minW is the floor and maxW the cap of a growable width', () => {
    const d = (attrs: string): string => `<subform name="s" layout="tb">${draw('d', `h="10pt" ${attrs}`, text('abcde'))}</subform>`;
    expectBox(run(d('minW="80pt"')).layout, 'd', 0, 0, 80, 10);
    const capped = run(d('maxW="20pt"')).layout;
    expectBox(capped, 'd', 0, 0, 20, 10);
    expect(featuresOf(capped)).toContain('content wider than maxW (capped at 20pt; the content overflows)');
  });

  it('a draw with a given w and no h wraps to that width and takes the height of its lines', () => {
    const { layout } = run(`<subform name="s" layout="tb">${draw('d', 'w="30pt"', text(WORDS))}</subform>`);
    expectBox(layout, 'd', 0, 0, 30, 34);
    expect(layout.texts[0]?.value?.lines).toHaveLength(3);
  });

  it('a draw with rich text and no h takes the height of its paragraphs', () => {
    const rich = `<exData contentType="text/html">${BODY_OPEN}<p>one</p><p>two</p></body></exData>`;
    const { layout } = run(`<subform name="s" layout="tb">${draw('d', 'w="60pt"', `<value>${rich}</value>`)}</subform>`);
    expectBox(layout, 'd', 0, 0, 60, 22);
  });

  it('a check button with no size asked is the default 10 pt, and its own size when it gives one', () => {
    const { layout } = run(`<subform name="s" layout="tb"><field name="plain"><ui><checkButton/></ui></field><field name="big"><ui><checkButton size="14pt"/></ui></field></subform>`);
    expectBox(layout, 'plain', 0, 0, 10, 10);
    expectBox(layout, 'big', 0, 10, 14, 14);
  });
});

describe('growable width inside a container that gives a width: the text wraps at it', () => {
  /** 40 words of 5 characters: 6 pt per character, 3 words (84 pt) fit in 100 pt, so 14 lines of up to 3 words and a height of 13 x 12 + 10 = 166 pt. */
  const LONG = 'word '.repeat(40);

  it('a draw with no w and no h in a tb of w 100 wraps inside 100 pt, takes the width of its widest line, and raises no overflow issue', () => {
    const { layout } = run(`<subform name="s" layout="tb" w="100pt">${draw('d', '', text(LONG))}${draw('below', 'w="5pt" h="5pt"')}</subform>`);
    expectBox(layout, 'd', 0, 0, 84, 166);
    expect(layout.texts[0]?.value?.lines).toHaveLength(14);
    expect(layout.texts[0]?.value?.lines.every((line) => line.fitWidthPt <= 100)).toBe(true);
    expect(layout.texts[0]?.value?.overflow).toEqual({ horizontal: false, vertical: false });
    expectBox(layout, 'below', 0, 166, 5, 5);
    expect(featuresOf(layout).filter((feature) => feature.startsWith('flowed children reach'))).toEqual([]);
  });

  it('the container margin is taken off the width on offer', () => {
    const body = `<subform name="s" layout="tb" w="100pt"><margin leftInset="10pt" rightInset="10pt" topInset="0pt" bottomInset="0pt"/>${draw('d', '', text(LONG))}</subform>`;
    const { layout } = run(body);
    // 80 pt on offer: 2 words (54 pt) per line, 3 would be 84 pt.
    expectBox(layout, 'd', 10, 0, 54, 19 * 12 + 10);
  });

  it('a field with no w that is multiLine wraps at the width on offer, one that is not stays on one line', () => {
    const multi = run(`<subform name="s" layout="tb" w="100pt">${textField('f', '', text(LONG), '<textEdit multiLine="1"/>')}</subform>`).layout;
    expectBox(multi, 'f', 0, 0, 84, 166);
    expect(multi.texts[0]?.value?.lines).toHaveLength(14);
    const single = run(`<subform name="s" layout="tb" w="100pt">${textField('f', '', text(LONG))}</subform>`).layout;
    expect(named(single, 'f').rect.heightPt).toBeCloseTo(10, 2);
    expect(single.texts[0]?.value?.lines).toHaveLength(1);
  });

  it('a position container with a given width offers it too, and one with an open width offers nothing: the text is not wrapped', () => {
    const fixed = run(`<subform name="p" layout="position" w="100pt" h="200pt">${draw('d', 'x="0pt" y="0pt"', text(LONG))}</subform>`).layout;
    expectBox(fixed, 'd', 0, 0, 84, 166);
    const open = run(`<subform name="p" layout="position">${draw('d', 'x="0pt" y="0pt"', text(LONG))}</subform>`).layout;
    expect(named(open, 'd').rect.widthPt).toBeCloseTo(1194, 2);
    expect(open.texts[0]?.value?.lines).toHaveLength(1);
  });

  it('a nested growable container passes on what its parent offers, less its own margin', () => {
    const body = `<subform name="s" layout="tb" w="100pt"><subform name="in" layout="tb"><margin leftInset="10pt" rightInset="10pt" topInset="0pt" bottomInset="0pt"/>${draw('d', '', text(LONG))}</subform></subform>`;
    expectBox(run(body).layout, 'd', 10, 0, 54, 19 * 12 + 10);
  });
});

describe('growable container', () => {
  const stack = (attrs: string, content: string): string => `<subform name="s" layout="tb" ${attrs}>${content}</subform>`;

  it('minH is not a floor for a growable container: it is as tall as its content (pdf.js bbox; the corpus page count needs it, W02-T08)', () => {
    expectBox(run(stack('minH="100pt"', draw('a', 'w="10pt" h="30pt"'))).layout, 's', 0, 0, 10, 30);
    expectBox(run(stack('minH="100pt"', draw('a', 'w="10pt" h="150pt"'))).layout, 's', 0, 0, 10, 150);
  });

  it('maxH caps a growable container, reported, and its content overflows', () => {
    const { layout } = run(stack('maxH="40pt"', draw('a', 'w="10pt" h="150pt"')));
    expectBox(layout, 's', 0, 0, 10, 40);
    expect(featuresOf(layout)).toContain('content taller than maxH (capped at 40pt; the content overflows)');
    expectBox(layout, 'a', 0, 0, 10, 150);
  });

  it('a position container with maxW caps in the same way', () => {
    const { layout } = run(`<subform name="p" maxW="30pt">${draw('a', 'x="0pt" y="0pt" w="50pt" h="5pt"')}</subform>`);
    expectBox(layout, 'p', 0, 0, 30, 5);
    expect(featuresOf(layout)).toContain('content wider than maxW (capped at 30pt; the content overflows)');
  });

  it('a container that holds nothing is no taller than nothing, whatever its minH', () => {
    const { layout } = run(`${stack('minH="12pt"', '')}`);
    expectBox(layout, 's', 0, 0, 0, 0);
  });
});

describe('layoutFlow', () => {
  it('lays the root subform out whole: every container, field and draw of the form has a finite box', () => {
    const { layout } = run(`<subform name="s" layout="tb">${draw('a', 'w="10pt" h="5pt"')}${textField('f', 'w="20pt" h="9pt"')}</subform>`);
    const all: unknown[] = [];
    const visit = (box: (typeof layout)['root']): void => {
      all.push(box);
      expect([box.rect.xPt, box.rect.yPt, box.rect.widthPt, box.rect.heightPt].every(Number.isFinite)).toBe(true);
      box.children.forEach(visit);
    };
    visit(layout.root);
    expect(all).toHaveLength(4);
  });

  it('refuses a first argument that is not a form DOM and a second that is not a text context, typed', () => {
    const { dom } = build(draw('a', 'w="1pt" h="1pt"'));
    expectLayoutError(() => layoutFlow({} as never, emptyTextContext()), 'INVALID_ARGUMENT', /layoutFlow: dom/);
    expectLayoutError(() => layoutFlow(dom, {} as never), 'INVALID_ARGUMENT', /layoutFlow: text/);
  });

  it('a rich block a script wrote that cannot be parsed is a placeholder in the result, and the draws around it lay out', () => {
    const rich = `<exData contentType="text/html">${BODY_OPEN}<p>ok</p></body></exData>`;
    const { dom } = build(`<subform name="s" layout="tb">${draw('before', 'w="50pt" h="20pt"', `<value>${rich}</value>`)}${draw('bad', 'w="50pt" h="20pt"', `<value>${rich}</value>`)}${draw('after', 'w="50pt" h="20pt"', `<value>${rich}</value>`)}</subform>`);
    const badNode = find(dom, 'draw', 'bad');
    const exDataUnder = (n: typeof badNode): typeof badNode | undefined => (n.className === 'exData' ? n : n.children.map(exDataUnder).find((found) => found !== undefined));
    const exData = exDataUnder(badNode);
    if (exData === undefined) throw new Error('no exData');
    exData.nodeValue = `${BODY_OPEN}<p>never closed</body>`;
    const layout = layoutFlow(dom, emptyTextContext());
    expect(layout.failedBlocks).toHaveLength(1);
    expect(layout.failedBlocks[0]?.rect).toEqual({ xPt: 0, yPt: 20, widthPt: 50, heightPt: 20 });
    expect(() => itemSchema.parse(layout.failedBlocks[0])).not.toThrow();
    expect(layout.texts.filter((entry) => entry.value !== undefined).map((entry) => entry.box.node.name)).toEqual(['before', 'after']);
    expect(layout.issues.some((issue) => issue.feature.startsWith('rich text could not be laid out'))).toBe(true);
  });

  it('nesting deeper than the ceiling becomes a placeholder with an issue, without overflowing the stack', () => {
    const levels = MAX_BOX_DEPTH + 40;
    const body = `${'<subform layout="tb">'.repeat(levels)}${draw('leaf', 'w="1pt" h="1pt"')}${'</subform>'.repeat(levels)}`;
    const { layout } = run(body);
    expect(featuresOf(layout)).toContain(`nesting deeper than ${MAX_BOX_DEPTH} levels`);
    let depth = 0;
    for (let box = layout.root; box.children[0] !== undefined; box = box.children[0]) depth += 1;
    expect(depth).toBe(MAX_BOX_DEPTH);
  });

  it('a long stack lays out every child once: the box count equals the child count', () => {
    const count = 3000;
    const children = Array.from({ length: count }, (_, i) => draw(`d${i}`, 'w="4pt" h="2pt"')).join('');
    const { layout } = run(`<subform name="s" layout="tb">${children}</subform>`);
    const s = named(layout, 's');
    expect(s.children).toHaveLength(count);
    expect(s.rect.heightPt).toBeCloseTo(count * 2, 2);
  });
});
