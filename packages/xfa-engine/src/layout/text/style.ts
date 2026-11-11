import type { FormNode } from '../../model/form/index.js';
import { enumAttr, lengthAttr, sizeAttr } from '../box/attributes.js';
import { guarded, parseColour } from '../box/border.js';
import type { IssueSink } from '../box/issues.js';
import { MAX_FONT_NAME_CHARS } from '../font/limits.js';
import { hAlignSchema, textStyleSchema, vAlignSchema, type TextStyle } from './types.js';

const weightSchema = textStyleSchema.shape.weight;
const postureSchema = textStyleSchema.shape.posture;

/**
 * The XFA 3.3 defaults of an owner with no `font` or no `para` element at all (the template models no implicit `font` or
 * `para` property node, W01-T01). They are the same values `model/template/implicit.ts` answers for a written element
 * that leaves an attribute out; a test holds the two together.
 * FD-38 exemption (correctness constant): defaults of the XFA format, not settings.
 */
export const DEFAULT_TEXT_STYLE: TextStyle = {
  weight: 'normal',
  posture: 'normal',
  sizePt: 10,
  letterSpacingPt: 0,
  baselineShiftPt: 0,
  colour: [0, 0, 0],
  hAlign: 'left',
  vAlign: 'top',
  marginLeftPt: 0,
  marginRightPt: 0,
  textIndentPt: 0,
  spaceAbovePt: 0,
  spaceBelowPt: 0,
  lineHeightPt: 0,
};

/** The font colour: `font > fill > color value="r,g,b"`; black when none is written or the text is not a colour (reported). */
function colourOf(font: FormNode, sink: IssueSink): TextStyle['colour'] {
  const text = font.childrenOfClass('fill')[0]?.childrenOfClass('color')[0]?.attr('value');
  if (text === undefined) return DEFAULT_TEXT_STYLE.colour;
  const [r, g, b] = guarded(font, sink, 'font colour', () => parseColour(text), DEFAULT_TEXT_STYLE.colour);
  return [r, g, b];
}

function fontStyleOf(font: FormNode, sink: IssueSink): Pick<TextStyle, 'typeface' | 'weight' | 'posture' | 'sizePt' | 'letterSpacingPt' | 'baselineShiftPt' | 'colour'> {
  const size = guarded(font, sink, 'font size', () => lengthAttr(font, 'size'), undefined);
  const named = font.attr('typeface')?.trim();
  const tooLong = named !== undefined && named.length > MAX_FONT_NAME_CHARS;
  if (tooLong) sink.add(font, `font typeface: longer than ${MAX_FONT_NAME_CHARS} characters (the default typeface is used)`);
  const typeface = tooLong ? undefined : named;
  if (size !== undefined && !(size > 0)) sink.add(font, `font size ${size}pt is not positive (read as ${DEFAULT_TEXT_STYLE.sizePt}pt)`);
  return {
    ...(typeface === undefined || typeface === '' ? {} : { typeface }),
    weight: guarded(font, sink, 'font weight', () => enumAttr(font, 'weight', weightSchema, 'normal'), 'normal'),
    posture: guarded(font, sink, 'font posture', () => enumAttr(font, 'posture', postureSchema, 'normal'), 'normal'),
    sizePt: size !== undefined && size > 0 ? size : DEFAULT_TEXT_STYLE.sizePt,
    letterSpacingPt: guarded(font, sink, 'font letterSpacing', () => lengthAttr(font, 'letterSpacing') ?? 0, 0),
    baselineShiftPt: guarded(font, sink, 'font baselineShift', () => lengthAttr(font, 'baselineShift') ?? 0, 0),
    colour: colourOf(font, sink),
  };
}

function paraStyleOf(para: FormNode, sink: IssueSink): Pick<TextStyle, 'hAlign' | 'vAlign' | 'marginLeftPt' | 'marginRightPt' | 'textIndentPt' | 'spaceAbovePt' | 'spaceBelowPt' | 'lineHeightPt'> {
  const length = (name: string): number => guarded(para, sink, `para ${name}`, () => sizeAttr(para, name, sink) ?? 0, 0);
  return {
    hAlign: guarded(para, sink, 'para hAlign', () => enumAttr(para, 'hAlign', hAlignSchema, 'left'), 'left'),
    vAlign: guarded(para, sink, 'para vAlign', () => enumAttr(para, 'vAlign', vAlignSchema, 'top'), 'top'),
    marginLeftPt: length('marginLeft'),
    marginRightPt: length('marginRight'),
    textIndentPt: guarded(para, sink, 'para textIndent', () => lengthAttr(para, 'textIndent') ?? 0, 0),
    spaceAbovePt: length('spaceAbove'),
    spaceBelowPt: length('spaceBelow'),
    lineHeightPt: length('lineHeight'),
  };
}

/**
 * The look of the text `owner` (a draw, a field or a caption) shows: its own `font` and `para` elements, read from the
 * form DOM (so a script-set attribute is what is used), else the XFA defaults. A value the engine does not model (an
 * unsupported unit, an unknown enumeration, a size that is not positive) is reported against the node and replaced by the
 * default, never silently. A `font` is not inherited from an enclosing container: neither real form puts one on a
 * container, and pdf.js's walk up to the nearest ancestor `font` has no oracle here.
 */
export function textStyleOf(owner: FormNode, sink: IssueSink): TextStyle {
  const font = owner.childrenOfClass('font')[0];
  const para = owner.childrenOfClass('para')[0];
  return {
    ...DEFAULT_TEXT_STYLE,
    ...(font === undefined ? {} : fontStyleOf(font, sink)),
    ...(para === undefined ? {} : paraStyleOf(para, sink)),
  };
}
