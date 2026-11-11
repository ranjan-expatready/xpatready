import { z } from 'zod';
import type { Rect } from '../../box/types.js';
import { XfaLayoutError } from '../../errors.js';
import { MAX_LINES_PER_TEXT, MAX_RUNS_PER_LINE, MAX_TEXT_CHARS } from '../../limits.js';
import { blockTop, glyphIssue, regionSchema, reportJustification } from '../block.js';
import type { TextDeps } from '../layout.js';
import { textStyleSchema, type LaidOutLine, type LaidOutRun, type LaidOutText } from '../types.js';
import { breakRanges, FIT_EPSILON_PT } from '../wrap.js';
import { buildFlow, type Flow, type FlowBudget } from './flow.js';
import { DEFAULT_TAB_INTERVAL_PT } from './limits.js';
import { styleInfos, type StyleInfo } from './metrics.js';
import { parseRich } from './parse.js';
import type { EmbedResolver, RichParagraph } from './types.js';

export interface LayoutRichInput {
  /** The exact exData markup (`body ...`), as `FormNode.nodeValue` holds it. */
  readonly markup: string;
  /** The `font` and `para` of the node that owns the text: the bottom of the cascade. */
  readonly style: z.infer<typeof textStyleSchema>;
  /** The region the text fills, in the local frame of the owning box. */
  readonly region: Rect;
  readonly wrap: boolean;
  /** `para tabDefault` in points; the default tab interval when absent or not positive. */
  readonly tabIntervalPt?: number;
}

const inputSchema = z.strictObject({
  markup: z.string(),
  style: textStyleSchema,
  region: regionSchema,
  wrap: z.boolean(),
  tabIntervalPt: z.number().finite().gt(0).optional(),
});

interface Piece {
  readonly text: string;
  readonly info: StyleInfo;
  readonly xPt: number;
  readonly widthPt: number;
  readonly tab: boolean;
}

/** A line as the viewer sees it: pieces on one baseline (a tab starts a new piece), x relative to the region's left edge before alignment. */
interface VisualLine {
  readonly pieces: readonly Piece[];
  readonly startPt: number;
  readonly widthPt: number;
  readonly fitWidthPt: number;
  readonly ascentPt: number;
  readonly descentPt: number;
  readonly pitchPt: number;
  readonly gapPt: number;
  /** The room the line had; what alignment shares out. */
  readonly roomPt: number;
  readonly paragraph: RichParagraph;
  readonly lastOfParagraph: boolean;
  readonly firstOfParagraph: boolean;
  /** True when the line ends in a space the layout added (a `br` or paragraph end), or was broken by width: trailing spaces hang. */
  readonly hangs: boolean;
}

/**
 * Lays out exData rich text as lines of styled runs, as Acrobat does on the two government forms: the style cascade
 * (owner `font`/`para`, body, p, span), runs split where the resolved font, size or spacing changes (not at span edges),
 * a closing space after every paragraph but the last and after every `br` (in the style of the element that ends the line),
 * the tab rule fitted to the one oracle record that has a tab (see `limits.ts`), paragraph spacing per `p`.
 *
 * Origin (PA-4): semantic port of pdf.js v4.10.38 (Apache-2.0) `src/core/xfa/text.js` (`TextMeasure.compute`, via `breakRanges`) and
 * `xhtml.js` (see `parse.ts`). pdf.js keeps no per-line positions and widens every width by 1.02; the oracle decides both.
 * Block height and placement are those of `layoutText` (`layout.ts`), generalised to lines of mixed fonts: a line is as tall as its
 * tallest run, its baseline is its top plus that run's ascent, and `spaceAbove` / `spaceBelow` apply to each paragraph.
 *
 * Throws `XfaPdfError` for malformed markup (see `parseRich`) and `XfaLayoutError` `INVALID_ARGUMENT` for a line that needs more
 * render lines than a text item may hold (tabs); the caller catches both per draw. Lines are cut, with an issue, at
 * `MAX_LINES_PER_TEXT` EMITTED render lines (a tab starts a new one), and the runs of a render line at `MAX_RUNS_PER_LINE`.
 */
export function layoutRich(input: LayoutRichInput, deps: TextDeps, embed?: EmbedResolver): LaidOutText {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) throw new XfaLayoutError('INVALID_ARGUMENT', `layoutRich: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  const { style, region, wrap } = parsed.data;
  const tabPt = parsed.data.tabIntervalPt ?? DEFAULT_TAB_INTERVAL_PT;
  const empty: LaidOutText = { region, lines: [], extent: { widthPt: 0, heightPt: 0 }, overflow: { horizontal: false, vertical: false } };
  const document = parseRich(parsed.data.markup, style, deps.report);
  if (document.paragraphs.length === 0) return empty;

  const missing = new Set<number>();
  const infos = styleInfos(document.styles, style, deps, missing);
  const budget: FlowBudget = { remaining: MAX_TEXT_CHARS, cut: false };
  const visual: VisualLine[] = [];
  let cut = false;
  for (const [index, paragraph] of document.paragraphs.entries()) {
    if (visual.length >= MAX_LINES_PER_TEXT) {
      cut = true;
      break;
    }
    const flow = buildFlow(paragraph, index === document.paragraphs.length - 1, infos, embed, tabPt, budget, deps.report);
    cut = composeParagraph(paragraph, index === document.paragraphs.length - 1, flow, infos, style, region.widthPt, wrap, tabPt, MAX_LINES_PER_TEXT - visual.length, visual, deps.report) || cut;
  }
  // The render tree caps the lines of one text item, and a tab starts a line of its own: count the lines that will be EMITTED.
  let emitted = 0;
  for (const [index, line] of visual.entries()) {
    const groups = Math.max(1, groupPieces(line.pieces).length);
    if (groups > MAX_LINES_PER_TEXT) throw new XfaLayoutError('INVALID_ARGUMENT', `rich text line needs more than ${MAX_LINES_PER_TEXT} render lines (tabs)`);
    if (emitted + groups > MAX_LINES_PER_TEXT) {
      visual.length = index;
      cut = true;
      break;
    }
    emitted += groups;
  }
  if (cut) deps.report(`text has more than ${MAX_LINES_PER_TEXT} lines (cut)`);
  for (const codePoint of missing) deps.report(glyphIssue(codePoint));

  // Vertical stacking: each paragraph adds spaceAbove before and spaceBelow after its lines; a line advances by its pitch,
  // the last line of the text by its ascent + descent only.
  const tops: number[] = [];
  let y = 0;
  visual.forEach((line, i) => {
    if (line.firstOfParagraph) y += style.spaceAbovePt;
    tops.push(y);
    const lastLine = i === visual.length - 1;
    y += lastLine ? line.ascentPt + line.descentPt : Math.max(line.pitchPt, style.lineHeightPt);
    if (line.lastOfParagraph) y += style.spaceBelowPt;
  });
  const blockPt = y;
  const finalLine = visual[visual.length - 1];
  // As `layoutText` (`blockTop`): an explicit lineHeight below the natural pitch shifts where middle / bottom placement puts the block.
  const last = finalLine === undefined ? undefined : { naturalPitchPt: finalLine.pitchPt, ascentPt: finalLine.ascentPt, descentPt: finalLine.descentPt, lineGapPt: finalLine.gapPt };
  const top = blockTop({ vAlign: style.vAlign, lineHeightPt: style.lineHeightPt, blockPt, last, region }, deps.report);

  // Nothing to draw (an empty block, or only embeds whose fields hold nothing): no lines, as for empty plain text.
  if (visual.every((line) => line.pieces.length === 0)) return empty;

  let widest = 0;
  let overflowsAcross = false;
  const lines: LaidOutLine[] = [];
  visual.forEach((line, i) => {
    widest = Math.max(widest, line.fitWidthPt);
    // Each line is held to the room of its own paragraph (its margin-left and indent), not to the owner's.
    overflowsAcross ||= line.fitWidthPt > line.roomPt + FIT_EPSILON_PT;
    const alignWidth = line.hangs ? line.fitWidthPt : line.widthPt;
    const spare = Math.max(0, line.roomPt - alignWidth);
    const shift = line.paragraph.hAlign === 'center' ? spare / 2 : line.paragraph.hAlign === 'right' ? spare : 0;
    const baseline = top + (tops[i] ?? 0) + line.ascentPt - style.baselineShiftPt;
    lines.push(...toLines(line, region.xPt + shift, baseline, deps.report));
  });
  return {
    region,
    lines,
    extent: { widthPt: widest, heightPt: blockPt },
    overflow: { horizontal: overflowsAcross, vertical: blockPt > region.heightPt + FIT_EPSILON_PT },
  };
}

/**
 * Where a tab is drawn: the first stop at or after `cursorPt`, the stops being the margin and then every `tabPt`, measured
 * from the region's left edge. A tab then spans one interval, so a second tab follows the first without a gap and a tab at
 * the margin leaves the text one interval in. Fitted to the one renderCache tab (hanging indent: the line starts 18 pt left
 * of the 54 pt margin, the tab is drawn at the margin and the text resumes 36 pt after it); no other case is verified.
 */
function nextStop(cursorPt: number, marginPt: number, tabPt: number): number {
  if (cursorPt <= marginPt + FIT_EPSILON_PT) return marginPt;
  return marginPt + Math.ceil((cursorPt - marginPt - FIT_EPSILON_PT) / tabPt) * tabPt;
}

/** Breaks one paragraph into lines and composes each; returns true when `maxLines` cut it. */
function composeParagraph(paragraph: RichParagraph, last: boolean, flow: Flow, infos: readonly StyleInfo[], owner: z.infer<typeof textStyleSchema>, regionWidthPt: number, wrap: boolean, tabPt: number, maxLines: number, out: VisualLine[], report: (feature: string) => void): boolean {
  const base = Math.max(0, regionWidthPt - paragraph.marginLeftPt - owner.marginRightPt);
  const firstRoom = Math.max(0, base - paragraph.textIndentPt);
  const blank = infos[paragraph.style] as StyleInfo;
  const startOfParagraph = out.length;
  let segmentStart = 0;
  let cut = false;
  for (const segmentEnd of flow.hardEnds) {
    const budgetLines = maxLines - (out.length - startOfParagraph);
    if (budgetLines < 1) {
      cut = true;
      break;
    }
    const first = segmentStart === 0;
    const broken = breakRanges(flow.text.slice(segmentStart, segmentEnd), (a, b) => (flow.prefix[segmentStart + b] ?? 0) - (flow.prefix[segmentStart + a] ?? 0), wrap ? (first ? firstRoom : base) : Number.POSITIVE_INFINITY, wrap ? base : Number.POSITIVE_INFINITY, wrap, budgetLines);
    cut ||= broken.truncated;
    broken.ranges.forEach((range, at) => {
      const from = segmentStart + range.start;
      const to = segmentStart + range.end;
      const firstLine = first && at === 0;
      const lastInSegment = at === broken.ranges.length - 1;
      const startPt = paragraph.marginLeftPt + (firstLine ? paragraph.textIndentPt : 0);
      const roomPt = firstLine ? firstRoom : base;
      out.push(composeLine(flow, infos, blank, from, to, startPt, roomPt, tabPt, paragraph, !lastInSegment || segmentEnd < flow.text.length || !last || flow.endsWithBreak, startOfParagraph === out.length));
    });
    segmentStart = segmentEnd;
  }
  const lastLine = out[out.length - 1];
  if (lastLine !== undefined && out.length > startOfParagraph) out[out.length - 1] = { ...lastLine, lastOfParagraph: true };
  reportJustification(paragraph.hAlign, out.length - startOfParagraph, report);
  return cut;
}

function composeLine(flow: Flow, infos: readonly StyleInfo[], blank: StyleInfo, from: number, to: number, startPt: number, roomPt: number, tabPt: number, paragraph: RichParagraph, hangs: boolean, firstOfParagraph: boolean): VisualLine {
  const pieces: Piece[] = [];
  let cursor = startPt;
  let ascentPt = from === to ? blank.ascentPt : 0;
  let descentPt = from === to ? blank.descentPt : 0;
  let pitchPt = from === to ? blank.pitchPt : 0;
  let gapPt = from === to ? blank.lineGapPt : 0;
  let at = from;
  while (at < to) {
    const styleId = flow.styleAt[at] ?? 0;
    const info = infos[styleId] as StyleInfo;
    const isTab = flow.text.charCodeAt(at) === 9;
    let end = at + 1;
    if (!isTab) {
      while (end < to && flow.text.charCodeAt(end) !== 9 && (infos[flow.styleAt[end] ?? 0] as StyleInfo).runKey === info.runKey) end += 1;
    }
    ascentPt = Math.max(ascentPt, info.ascentPt);
    descentPt = Math.max(descentPt, info.descentPt);
    if (info.pitchPt > pitchPt) {
      pitchPt = info.pitchPt;
      gapPt = info.lineGapPt;
    }
    if (isTab) {
      const x = nextStop(cursor, paragraph.marginLeftPt, tabPt);
      pieces.push({ text: ' ', info, xPt: x, widthPt: tabPt, tab: true });
      cursor = x + tabPt;
    } else {
      const widthPt = (flow.prefix[end] ?? 0) - (flow.prefix[at] ?? 0);
      pieces.push({ text: flow.text.slice(at, end), info, xPt: cursor, widthPt, tab: false });
      cursor += widthPt;
    }
    at = end;
  }
  let spaces = to;
  while (spaces > from && flow.text.charCodeAt(spaces - 1) === 32) spaces -= 1;
  const widthPt = cursor - startPt;
  const fitWidthPt = pieces[pieces.length - 1]?.tab === true ? widthPt : widthPt - ((flow.prefix[to] ?? 0) - (flow.prefix[spaces] ?? 0));
  return { pieces, startPt, widthPt, fitWidthPt, ascentPt, descentPt, pitchPt, gapPt, roomPt, paragraph, lastOfParagraph: false, firstOfParagraph, hangs };
}

/** The pieces of a visual line grouped into render-tree lines: runs are contiguous, so a tab (which jumps) starts a new line on the same baseline. */
function groupPieces(pieces: readonly Piece[]): Piece[][] {
  const groups: Piece[][] = [];
  for (const piece of pieces) {
    const current = groups[groups.length - 1];
    if (current === undefined || piece.tab || current[0]?.tab === true) groups.push([piece]);
    else current.push(piece);
  }
  return groups;
}

/** The render-tree lines of one visual line. A group of more than `MAX_RUNS_PER_LINE` pieces keeps the first of them and says so (a render-tree line may hold no more). */
function toLines(line: VisualLine, originPt: number, baselinePt: number, report: (feature: string) => void): LaidOutLine[] {
  const groups = groupPieces(line.pieces);
  if (groups.length === 0) return [{ xPt: originPt + line.startPt, yBaselinePt: baselinePt, widthPt: 0, fitWidthPt: 0, runs: [] }];
  return groups.map((whole, index) => {
    const cut = whole.length > MAX_RUNS_PER_LINE;
    if (cut) report(`rich text line has more than ${MAX_RUNS_PER_LINE} runs (cut)`);
    const group = cut ? whole.slice(0, MAX_RUNS_PER_LINE) : whole;
    const widthPt = group.reduce((sum, piece) => sum + piece.widthPt, 0);
    const lastGroup = index === groups.length - 1;
    const runs: LaidOutRun[] = group.map((piece) => ({
      text: piece.text,
      fontId: piece.info.fontId,
      sizePt: piece.info.style.sizePt,
      colour: piece.info.style.colour,
      ...(piece.info.style.letterSpacingPt === 0 ? {} : { letterSpacingPt: piece.info.style.letterSpacingPt }),
    }));
    // The spaces that hang past the end of the line are on its last piece, which a cut line no longer has.
    const trailing = lastGroup && !cut ? line.widthPt - line.fitWidthPt : 0;
    return { xPt: originPt + (group[0]?.xPt ?? line.startPt), yBaselinePt: baselinePt, widthPt, fitWidthPt: widthPt - trailing, runs };
  });
}
