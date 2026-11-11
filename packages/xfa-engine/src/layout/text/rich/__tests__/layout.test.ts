import { describe, expect, it } from 'vitest';
import { XfaLayoutError } from '../../../errors.js';
import { XfaPdfError } from '../../../../pdf/errors.js';
import { MAX_RUNS_PER_LINE } from '../../../limits.js';
import { layoutRich } from '../layout.js';
import { MAX_RICH_ISSUES } from '../limits.js';
import { body, regionOf, rich, runsOf, styled, styleDeps, textsOf } from './helpers.js';

/** At 10 pt on the synthetic font: character 5 pt, space 2.5 pt, ascent 7.5, descent 2.5, pitch 12, one-line block 10. */
describe('layoutRich: styles and runs', () => {
  it('nested spans cascade: bold inside the paragraph, italic inside the bold span, then back to the paragraph style', () => {
    const { out } = rich('<p>ab<span style="font-weight:bold">cd<span style="font-style:italic">ef</span></span>gh</p>');
    expect(runsOf(out)).toEqual([['normal:normal|ab', 'bold:normal|cd', 'bold:italic|ef', 'normal:normal|gh']]);
    expect(out.lines[0]?.xPt).toBe(0);
    expect(out.lines[0]?.widthPt).toBe(40);
  });

  it('two spans that resolve to the same font, size and colour are one run', () => {
    const { out } = rich('<p>ab<span>cd</span><span style="font-weight:normal">ef</span></p>');
    expect(runsOf(out)).toEqual([['normal:normal|abcdef']]);
  });

  it('the paragraph cascade starts at the owner font and para: size, bold and colour come from the owner', () => {
    const { out } = rich('<p>ab</p>', { weight: 'bold', sizePt: 20, colour: [1, 2, 3] });
    expect(out.lines[0]?.runs[0]).toMatchObject({ fontId: 'f:bold:normal', sizePt: 20, colour: [1, 2, 3] });
    expect(out.lines[0]?.yBaselinePt).toBe(15);
  });

  it('a link is plain text in the link colour and its href is not followed', () => {
    const { out } = rich('<p>a<a href="https://example.test/x">link</a></p>');
    expect(out.lines[0]?.runs.map((r) => [r.text, r.colour])).toEqual([['a', [0, 0, 0]], ['link', [0, 0, 255]]]);
  });

  it('a line is as tall as its tallest run: a bigger span lifts the baseline and the pitch', () => {
    const { out } = rich('<p>a<span style="font-size:20pt">b</span></p><p>c</p>');
    expect(out.lines.map((l) => l.yBaselinePt)).toEqual([15, 24 + 7.5]);
    expect(out.extent.heightPt).toBe(24 + 10);
  });

  it('letter-spacing is applied and kept on the run only when it is not zero', () => {
    const { out } = rich('<p>ab<span style="letter-spacing:1pt">cd</span></p>');
    expect(out.lines[0]?.runs.map((r) => r.letterSpacingPt)).toEqual([undefined, 1]);
    expect(out.lines[0]?.widthPt).toBe(10 + 12);
  });
});

describe('layoutRich: breaks, blank lines and paragraphs', () => {
  it('br ends a line and leaves a space in the style of the element that carries it', () => {
    const { out } = rich('<p>ab<span style="font-weight:bold"><br/>cd</span></p>');
    expect(runsOf(out)).toEqual([['normal:normal|ab', 'bold:normal| '], ['bold:normal|cd']]);
    expect(out.lines.map((l) => l.yBaselinePt)).toEqual([7.5, 19.5]);
  });

  it('a paragraph ends with a space in the paragraph\'s own style, not that of its last span; the last paragraph has none', () => {
    const { out } = rich('<p style="font-weight:bold">a<span style="font-weight:normal">b</span></p><p>c</p>');
    expect(runsOf(out)).toEqual([['bold:normal|a', 'normal:normal|b', 'bold:normal| '], ['normal:normal|c']]);
  });

  it('an empty paragraph is a blank line: a closing space between paragraphs, no run at the end', () => {
    expect(textsOf(rich('<p>a</p><p/><p>b</p>').out)).toEqual(['a ', ' ', 'b']);
    const last = rich('<p>a</p><p/>').out;
    expect(textsOf(last)).toEqual(['a ', '']);
    expect(last.lines[1]?.runs).toEqual([]);
    expect(last.lines[1]?.yBaselinePt).toBe(12 + 7.5);
  });

  it('a block with nothing to draw (an empty paragraph, an embed of an empty field) has no lines, as empty plain text has none', () => {
    expect(rich('<p/>').out.lines).toEqual([]);
    expect(rich('').out.lines).toEqual([]);
  });

  it('spaceAbove and spaceBelow apply to every paragraph, and the block is the last line\'s ascent + descent plus them', () => {
    const { out } = rich('<p>a</p><p>b</p>', { spaceAbovePt: 2, spaceBelowPt: 3 });
    expect(out.lines.map((l) => l.yBaselinePt)).toEqual([2 + 7.5, 2 + 12 + 3 + 2 + 7.5]);
    expect(out.extent.heightPt).toBe(2 + 12 + 3 + 2 + 10 + 3);
  });

  it('vAlign middle centres the block of mixed lines', () => {
    const { out } = rich('<p>a</p><p>b</p>', { vAlign: 'middle' }, regionOf(200, 100));
    expect(out.lines[0]?.yBaselinePt).toBe((100 - 22) / 2 + 7.5);
  });

  it('text directly in the body is a paragraph of its own, and white space between paragraphs is not text', () => {
    expect(textsOf(rich('x<p>y</p>\n  <p>z</p>').out)).toEqual(['x ', 'y ', 'z']);
  });
});

describe('layoutRich: white space and tabs', () => {
  it('white space collapses to one space, line ends inside text are dropped, and xfa-spacerun:yes keeps every space', () => {
    expect(textsOf(rich('<p>a   b\nc</p>').out)).toEqual(['a bc']);
    expect(textsOf(rich('<p>a<span style="xfa-spacerun:yes">   </span>b</p>').out)).toEqual(['a   b']);
  });

  it('the no-break spaces Acrobat writes into a spacerun are ordinary spaces in the run', () => {
    expect(textsOf(rich('<p>a<span style="xfa-spacerun:yes">  </span>b</p>').out)).toEqual(['a  b']);
  });

  it('xfa-tab-count: the first tab goes to the margin, then one interval; a hanging indent starts the line left of the margin', () => {
    const { out } = rich('<p style="margin-left:20pt;text-indent:-10pt"><span style="xfa-tab-count:1">    </span>ab</p>', {}, regionOf(200, 100), undefined, 30);
    expect(out.lines.map((l) => [l.xPt, l.yBaselinePt, l.runs.map((r) => r.text)])).toEqual([
      [20, 7.5, [' ']],
      [50, 7.5, ['ab']],
    ]);
  });

  it('two tabs land on the next stop after the first', () => {
    const { out } = rich('<p style="margin-left:20pt"><span style="xfa-tab-count:2"> </span>a</p>', {}, regionOf(200, 100), undefined, 30);
    expect(out.lines.map((l) => l.xPt)).toEqual([20, 50, 80]);
  });
});

describe('layoutRich: alignment and wrapping', () => {
  it('text-align on the paragraph overrides the owner hAlign; the owner\'s applies to other paragraphs', () => {
    const { out } = rich('<p style="text-align:center">ab</p><p>cd</p>', { hAlign: 'right' }, regionOf(100, 100));
    expect(out.lines.map((l) => l.xPt)).toEqual([45, 90]);
  });

  it('wraps at spaces across style changes, and the spaces after a wrapped line hang past its right edge', () => {
    const { out } = rich('<p>aaa <span style="font-weight:bold">bbb ccc</span></p>', {}, regionOf(30, 100));
    expect(textsOf(out)).toEqual(['aaa ', 'bbb ', 'ccc']);
    expect(runsOf(out)[1]).toEqual(['bold:normal|bbb ']);
  });

  it('a word that spans runs is not broken at the style change', () => {
    const { out } = rich('<p>Ye<span style="font-style:italic">s</span> no</p>', {}, regionOf(100, 100));
    expect(runsOf(out)).toEqual([['normal:normal|Ye', 'normal:italic|s', 'normal:normal| no']]);
  });

  it('a wrapped line is aligned by its width without the hanging spaces; a line ended by a break counts them', () => {
    const wrapped = rich('<p>ab cd</p>', { hAlign: 'right' }, regionOf(15, 100)).out;
    expect(wrapped.lines.map((l) => l.xPt)).toEqual([5, 5]);
    const broken = rich('<p>ab<br/>cd</p>', { hAlign: 'right' }, regionOf(40, 100)).out;
    expect(broken.lines.map((l) => l.xPt)).toEqual([40 - 10, 40 - 10]);
  });

  it('justify is laid out as left and reported', () => {
    const { out, reports } = rich('<p>ab cd</p>', { hAlign: 'justify' }, regionOf(15, 100));
    expect(out.lines.map((l) => l.xPt)).toEqual([0, 0]);
    expect(reports).toEqual(['hAlign="justify" (laid out as left)']);
  });

  it('marginLeft, marginRight and textIndent narrow the room and move the line, per paragraph', () => {
    const { out } = rich('<p style="margin-left:10pt;text-indent:5pt">aaaa bbbb</p>', { marginRightPt: 5 }, regionOf(60, 100));
    expect(out.lines.map((l) => l.xPt)).toEqual([15, 10]);
    expect(textsOf(out)).toEqual(['aaaa ', 'bbbb']);
  });

  it('a paragraph is held to the room of its own margin-left: text that fits the owner\'s width but not the paragraph\'s overflows', () => {
    const lay = (inner: string): boolean => layoutRich({ markup: body(inner), style: styled(), region: regionOf(100, 100), wrap: false }, styleDeps()).overflow.horizontal;
    expect(lay('<p style="margin-left:50pt">abcdefghijkl</p>')).toBe(true);
    expect(lay('<p>abcdefghijkl</p>')).toBe(false);
  });

  it('the closing space of a last paragraph that ends in br hangs for alignment like any other br line', () => {
    const { out } = rich('<p>ab<br/></p>', { hAlign: 'right' }, regionOf(40, 100));
    expect(textsOf(out)).toEqual(['ab ']);
    expect(out.lines[0]?.xPt).toBe(40 - 10);
  });

  it('overflow is kept and flagged, not clipped', () => {
    const { out } = rich('<p>abcdefghij</p>', {}, regionOf(100, 5));
    expect(out.overflow).toEqual({ horizontal: false, vertical: true });
  });
});

describe('layoutRich: unsupported markup is reported and its text kept', () => {
  it('an element outside the subset and a property outside it are reported once each, the text stays', () => {
    const { out, reports } = rich('<p><b>x</b><b>w</b><span style="color:red;font-size:8pt;margin:3pt">y</span></p>');
    expect(textsOf(out)).toEqual(['xwy']);
    expect(reports).toEqual(['rich.element.b', 'rich.css.color', 'rich.css.margin']);
    expect(out.lines[0]?.runs.map((r) => r.sizePt)).toEqual([10, 8]);
  });

  it('a value that is not understood is reported and the rest of the attribute still applies', () => {
    const { out, reports } = rich('<p><span style="font-weight:heavy;font-style:italic">y</span></p>');
    expect(runsOf(out)).toEqual([['normal:italic|y']]);
    expect(reports).toEqual(['rich.css.font-weight: value not understood (heavy)']);
  });

  it('text-align on a span has no effect and is reported', () => {
    const { reports } = rich('<p><span style="text-align:center">y</span></p>');
    expect(reports).toEqual(['rich.css: text-align, margin-left and text-indent have no effect on <span>']);
  });

  it('a glyph the font lacks is measured as .notdef and reported once', () => {
    const { reports } = rich('<p>éé</p>');
    expect(reports).toEqual(['glyph.U+00E9']);
  });
});

describe('layoutRich: reports are bounded', () => {
  it('a flood of distinct unknown CSS properties lists MAX_RICH_ISSUES features and one summary, not one entry each', () => {
    const spans = Array.from({ length: 5000 }, (_, i) => `<span style="prop${i}:x">y</span>`).join('');
    const { reports } = rich(`<p>${spans}</p>`);
    expect(reports).toHaveLength(MAX_RICH_ISSUES + 1);
    expect(reports[MAX_RICH_ISSUES]).toBe(`rich: more than ${MAX_RICH_ISSUES} distinct features reported (the rest are not listed)`);
  });

  it('a content cut is still reported after the feature cap is reached', () => {
    const spans = Array.from({ length: 150 }, (_, i) => `<span style="prop${i}:x">y</span>`).join('');
    const paragraphs = '<p>z</p>'.repeat(2100);
    const { reports } = rich(`<p>${spans}</p>${paragraphs}`);
    // The parser and the line layout may both see the cut; the box's issue sink keeps one entry per feature.
    expect(reports).toContain('text has more than 2000 lines (cut)');
  });
});

describe('layoutRich: failures are typed', () => {
  it('malformed markup, an undeclared DOCTYPE and a closing tag out of order throw the engine\'s typed error', () => {
    for (const markup of ['<body><p>unclosed</body>', '<!DOCTYPE x [<!ENTITY a "b">]><body/>', '<body><p></q></body>']) {
      expect(() => layoutRich({ markup, style: styled(), region: regionOf(), wrap: true }, styleDeps()), markup).toThrow(XfaPdfError);
    }
  });

  it('a hostile argument is INVALID_ARGUMENT', () => {
    expect(() => layoutRich({ markup: body('<p/>'), style: styled({ sizePt: 0 }), region: regionOf(), wrap: true }, styleDeps())).toThrow(XfaLayoutError);
  });

  it(`a line of more than ${MAX_RUNS_PER_LINE} runs is cut at the ceiling and reported, not thrown and not handed to the render tree whole`, () => {
    const spans = Array.from({ length: MAX_RUNS_PER_LINE + 1 }, (_, i) => `<span style="font-weight:${i % 2 === 0 ? 'bold' : 'normal'}">x</span>`).join('');
    const reports: string[] = [];
    const out = layoutRich({ markup: body(`<p>${spans}</p>`), style: styled(), region: regionOf(10000, 100), wrap: true }, { ...styleDeps(), report: (f) => void reports.push(f) });
    expect(out.lines).toHaveLength(1);
    expect(out.lines[0]?.runs).toHaveLength(MAX_RUNS_PER_LINE);
    expect(reports).toEqual([`rich text line has more than ${MAX_RUNS_PER_LINE} runs (cut)`]);
  });
});
