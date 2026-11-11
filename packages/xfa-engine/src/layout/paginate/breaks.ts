import { z } from 'zod';
import type { FormNode } from '../../model/form/index.js';
import { enumAttr } from '../box/attributes.js';
import type { IssueSink } from '../box/issues.js';
import { XfaLayoutError } from '../errors.js';
import type { ContentAreaModel, PageAreaModel, TargetIndex } from './page-set.js';

export type BreakTargetType = 'auto' | 'contentArea' | 'pageArea';
export type BreakSide = 'before' | 'after';

/** A `breakBefore` / `breakAfter` of a subform (a deprecated `break` element is read as one of each side it names). */
export interface BreakRequest {
  /** The element that carries it (the `break` element for a deprecated one): a break is decided once per element and side. */
  readonly element: FormNode;
  readonly side: BreakSide;
  readonly targetType: BreakTargetType;
  readonly target: string;
  readonly startNew: boolean;
}

const targetTypeSchema = z.enum(['auto', 'contentArea', 'pageArea']);
const legacySchema = z.enum(['auto', 'contentArea', 'pageArea', 'pageEven', 'pageOdd']);

function readType(element: FormNode, name: string, schema: z.ZodType<string>, sink: IssueSink): string {
  try {
    return enumAttr(element, name, schema, 'auto');
  } catch (error) {
    if (!(error instanceof XfaLayoutError)) throw error;
    sink.add(element, `${error.message} (the break is ignored)`);
    return 'auto';
  }
}

function checkLeaderTrailer(element: FormNode, names: readonly string[], sink: IssueSink): void {
  for (const name of names) {
    const value = element.attr(name)?.trim();
    if (value !== undefined && value !== '') sink.add(element, `${name} is not modelled (the break is applied without it)`);
  }
}

/**
 * The break of `side` on `node`, or undefined: the first `breakBefore` / `breakAfter` element (a second is reported), else
 * the deprecated `break` element's `before` / `after` when it names a target type or a target. `pageEven` / `pageOdd` are
 * not modelled (reported, the break is ignored). `leader`, `trailer`, `bookend` and `overflow` are not applied.
 *
 * Origin (PA-4): pdf.js v4.10.38 (Apache-2.0) `template.js Subform[$toHTML]` turns `break` into `breakBefore`,
 * `breakAfter` and `overflow` (its targetType and target from `before` / `beforeTarget` or `after` / `afterTarget`, and
 * `startNew`), uses the first `breakBefore` / `breakAfter`, and `Break*` read `startNew` as 1 or 0.
 */
export function breakOf(node: FormNode, side: BreakSide, sink: IssueSink): BreakRequest | undefined {
  const className = side === 'before' ? 'breakBefore' : 'breakAfter';
  const elements = node.childrenOfClass(className);
  const own = elements[0];
  if (elements.length > 1) sink.add(node, `more than one ${className} (only the first is used)`);
  if (own !== undefined) {
    checkLeaderTrailer(own, ['leader', 'trailer'], sink);
    return { element: own, side, targetType: readType(own, 'targetType', targetTypeSchema, sink) as BreakTargetType, target: own.attr('target')?.trim() ?? '', startNew: own.attr('startNew')?.trim() === '1' };
  }
  const legacy = node.childrenOfClass('break')[0];
  if (legacy === undefined) return undefined;
  const type = readType(legacy, side, legacySchema, sink);
  const target = legacy.attr(`${side}Target`)?.trim() ?? '';
  if (type === 'auto' && target === '') return undefined;
  if (type === 'pageEven' || type === 'pageOdd') {
    sink.add(legacy, `${side}="${type}" is not modelled (the break is ignored)`);
    return undefined;
  }
  return { element: legacy, side, targetType: type as BreakTargetType, target, startNew: legacy.attr('startNew')?.trim() === '1' };
}

/** What a break does to the pagination. */
export type BreakDecision =
  | { readonly kind: 'none' }
  /** Start a new page; `target` is the page area to make it from (it may be refused when used up). `startIndex` is the content area to begin in. */
  | { readonly kind: 'page'; readonly target: PageAreaModel; readonly startIndex: number }
  /** Go on in the content area with this index of the current page (past the last one: on the next page). */
  | { readonly kind: 'area'; readonly index: number };

/** Where the layout stands when a break is decided. */
export interface BreakState {
  readonly page: PageAreaModel | undefined;
  readonly area: ContentAreaModel | undefined;
}

const NONE: BreakDecision = { kind: 'none' };

/**
 * Decides what `request` does. Origin (PA-4): pdf.js v4.10.38 (Apache-2.0) `template.js handleBreak`.
 * - `auto`, or a target that names nothing (reported): no break.
 * - `pageArea`: `startNew` makes a new page of the target (the current page area when it names none); without `startNew`
 *   a break only moves to a target that is not the current page area.
 * - `contentArea`: `startNew` goes to the target area (later on this page when it is ahead, else on a new page of its
 *   page area), or to the next area when it names none; without `startNew` only a target other than the current area is used.
 */
export function decideBreak(request: BreakRequest, state: BreakState, targets: TargetIndex | undefined, sink: IssueSink): BreakDecision {
  if (request.targetType === 'auto') return NONE;
  if (targets === undefined || state.page === undefined) {
    sink.add(request.element, `${request.side === 'before' ? 'breakBefore' : 'breakAfter'} ignored: the form has no page set`);
    return NONE;
  }
  const named = request.target !== '';
  const asPage = named ? targets.pageArea(request.target) : undefined;
  const asArea = named ? targets.contentArea(request.target) : undefined;
  if (named && asPage === undefined && asArea === undefined) {
    sink.add(request.element, `break target "${request.target.slice(0, 40)}" names no page area or content area (the break is ignored)`);
    return NONE;
  }
  if (request.targetType === 'pageArea') {
    if (request.startNew) return { kind: 'page', target: asPage ?? state.page, startIndex: 0 };
    return asPage !== undefined && asPage !== state.page ? { kind: 'page', target: asPage, startIndex: 0 } : NONE;
  }
  const areas = state.page.contentAreas;
  const currentIndex = state.area === undefined ? -1 : areas.indexOf(state.area);
  if (request.startNew) {
    if (asArea === undefined) return { kind: 'area', index: currentIndex + 1 };
    const targetIndex = asArea.page.contentAreas.indexOf(asArea.area);
    const here = asArea.page.contentAreas.indexOf(state.area ?? asArea.area);
    const ahead = state.area !== undefined && here !== -1 && here < targetIndex;
    return ahead && asArea.page === state.page ? { kind: 'area', index: targetIndex } : { kind: 'page', target: asArea.page, startIndex: targetIndex };
  }
  if (asArea !== undefined && asArea.area !== state.area) {
    const targetIndex = asArea.page.contentAreas.indexOf(asArea.area);
    return asArea.page === state.page ? { kind: 'area', index: targetIndex } : { kind: 'page', target: asArea.page, startIndex: targetIndex };
  }
  return NONE;
}
