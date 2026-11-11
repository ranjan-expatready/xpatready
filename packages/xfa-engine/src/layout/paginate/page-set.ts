import { z } from 'zod';
import type { FormNode } from '../../model/form/index.js';
import { enumAttr, lengthAttr } from '../box/attributes.js';
import type { IssueSink } from '../box/issues.js';
import { XfaLayoutError } from '../errors.js';
import type { Rect } from '../box/types.js';
import { MAX_PAGE_AREAS, MAX_PAGE_SET_DEPTH } from './limits.js';

/** The master-page structure of a form (`pageSet`, `pageArea`, `contentArea`, `medium`), read once from the form DOM. */
export interface ContentAreaModel {
  readonly node: FormNode;
  readonly name: string;
  readonly id: string;
  readonly rect: Rect;
}

export interface PageAreaModel {
  readonly node: FormNode;
  readonly name: string;
  readonly id: string;
  /** Most instances the page set may use of this area; -1 for no limit. */
  readonly occurMax: number;
  readonly oddOrEven: 'any' | 'even' | 'odd';
  readonly pagePosition: 'any' | 'first' | 'last' | 'only' | 'rest';
  readonly contentAreas: readonly ContentAreaModel[];
  readonly widthPt: number;
  readonly heightPt: number;
  readonly parent: PageSetModel;
}

export interface PageSetModel {
  readonly node: FormNode;
  readonly relation: 'orderedOccurrence' | 'duplexPaginated' | 'simplexPaginated';
  readonly occurMax: number;
  readonly pageAreas: readonly PageAreaModel[];
  readonly pageSets: readonly PageSetModel[];
  readonly parent: PageSetModel | null;
}

/** Everything pagination needs from the master pages. */
export interface PageModel {
  readonly root: PageSetModel;
  readonly pageAreas: readonly PageAreaModel[];
  readonly pageSetCount: number;
}

const relationSchema = z.enum(['orderedOccurrence', 'duplexPaginated', 'simplexPaginated']);
const oddOrEvenSchema = z.enum(['any', 'even', 'odd']);
const positionSchema = z.enum(['any', 'first', 'last', 'only', 'rest']);
const orientationSchema = z.enum(['portrait', 'landscape']);
const WHOLE_NUMBER = /^-?\d{1,9}$/;

/** A read that fails with a typed layout error is reported against `node` and answers `fallback`; anything else is a bug and propagates. */
function reading<T>(node: FormNode, sink: IssueSink, fallback: T, read: () => T): T {
  try {
    return read();
  } catch (error) {
    if (!(error instanceof XfaLayoutError)) throw error;
    sink.add(node, `${error.message} (read as the default)`);
    return fallback;
  }
}

/**
 * The most instances an `occur` allows. Origin (PA-4): pdf.js v4.10.38 (Apache-2.0) `template.js Occur[$clean]` for a
 * `pageArea` or `pageSet` parent: min defaults to 0; max defaults to -1 (unlimited) when min is absent too, else to min;
 * and a max below min is read as min. No `occur` element means no limit.
 */
function occurMaxOf(parent: FormNode, sink: IssueSink): number {
  const occur = parent.childrenOfClass('occur')[0];
  if (occur === undefined) return -1;
  const number = (name: string): number | undefined => {
    const text = occur.attr(name)?.trim();
    if (text === undefined || text === '') return undefined;
    if (!WHOLE_NUMBER.test(text)) {
      sink.add(occur, `${name}="${text.slice(0, 20)}" is not a whole number (read as absent)`);
      return undefined;
    }
    return Number(text);
  };
  const min = number('min');
  const max = number('max');
  const effectiveMin = min ?? 0;
  const effectiveMax = max ?? (min === undefined ? -1 : effectiveMin);
  return effectiveMax !== -1 && effectiveMax < effectiveMin ? effectiveMin : effectiveMax;
}

function contentAreaOf(node: FormNode, sink: IssueSink): ContentAreaModel {
  const read = (name: string): number => reading(node, sink, 0, () => lengthAttr(node, name) ?? 0);
  const rect: Rect = { xPt: read('x'), yPt: read('y'), widthPt: Math.max(0, read('w')), heightPt: Math.max(0, read('h')) };
  if (rect.heightPt === 0) sink.add(node, 'contentArea has no height (anything placed in it overflows)');
  return { node, name: node.name, id: node.attr('id') ?? '', rect };
}

/**
 * The page size of a `pageArea` from its `medium`: `short` x `long`, swapped for `landscape`. A page area with no usable
 * medium is as large as its content areas reach, so it still has a size (reported).
 */
function pageSizeOf(page: FormNode, areas: readonly ContentAreaModel[], sink: IssueSink): { widthPt: number; heightPt: number } {
  const medium = page.childrenOfClass('medium')[0];
  const short = medium === undefined ? undefined : reading(medium, sink, undefined, () => lengthAttr(medium, 'short'));
  const long = medium === undefined ? undefined : reading(medium, sink, undefined, () => lengthAttr(medium, 'long'));
  if (medium !== undefined && short !== undefined && long !== undefined && short > 0 && long > 0) {
    const landscape = reading(medium, sink, 'portrait' as const, () => enumAttr(medium, 'orientation', orientationSchema, 'portrait')) === 'landscape';
    return landscape ? { widthPt: long, heightPt: short } : { widthPt: short, heightPt: long };
  }
  sink.add(medium ?? page, 'pageArea has no usable medium (the page is as large as its content areas reach)');
  const reach = (pick: (area: ContentAreaModel) => number): number => Math.max(1, ...areas.map(pick));
  return { widthPt: reach((a) => a.rect.xPt + a.rect.widthPt), heightPt: reach((a) => a.rect.yPt + a.rect.heightPt) };
}

interface Counter {
  pageAreas: number;
  pageSets: number;
}

function readSet(node: FormNode, parent: PageSetModel | null, depth: number, counter: Counter, sink: IssueSink): PageSetModel {
  counter.pageSets += 1;
  const relation = reading(node, sink, 'orderedOccurrence' as const, () => enumAttr(node, 'relation', relationSchema, 'orderedOccurrence'));
  // The arrays are filled below and read-only to everyone else: the model is not patched after it is built.
  const pageAreas: PageAreaModel[] = [];
  const pageSets: PageSetModel[] = [];
  const model: PageSetModel = { node, relation, occurMax: occurMaxOf(node, sink), pageAreas, pageSets, parent };
  for (const child of node.children) {
    if (child.className === 'pageArea') {
      if (counter.pageAreas >= MAX_PAGE_AREAS) {
        sink.add(child, `more than ${MAX_PAGE_AREAS} page areas (this one and the rest are ignored)`);
        continue;
      }
      counter.pageAreas += 1;
      const areas = child.childrenOfClass('contentArea').slice(0, MAX_PAGE_AREAS).map((area) => contentAreaOf(area, sink));
      const size = pageSizeOf(child, areas, sink);
      pageAreas.push({
        node: child,
        name: child.name,
        id: child.attr('id') ?? '',
        occurMax: occurMaxOf(child, sink),
        oddOrEven: reading(child, sink, 'any' as const, () => enumAttr(child, 'oddOrEven', oddOrEvenSchema, 'any')),
        pagePosition: reading(child, sink, 'any' as const, () => enumAttr(child, 'pagePosition', positionSchema, 'any')),
        contentAreas: areas,
        ...size,
        parent: model,
      });
    } else if (child.className === 'pageSet') {
      if (depth + 1 >= MAX_PAGE_SET_DEPTH) sink.add(child, `pageSet nested deeper than ${MAX_PAGE_SET_DEPTH} levels (ignored)`);
      else pageSets.push(readSet(child, model, depth + 1, counter, sink));
    }
  }
  return model;
}

function collect(set: PageSetModel, into: PageAreaModel[]): void {
  into.push(...set.pageAreas);
  for (const child of set.pageSets) collect(child, into);
}

/**
 * The page set of the form (`pageSet` child of the root subform), or undefined when the form has none or it holds no page
 * area. A malformed attribute is reported and read as its default. Origin (PA-4): pdf.js v4.10.38 (Apache-2.0) `template.js`
 * `PageSet` / `PageArea` / `ContentArea` / `Medium` (the page is `medium.short` x `medium.long`, swapped for landscape).
 */
export function readPageModel(root: FormNode, sink: IssueSink): PageModel | undefined {
  const node = root.childrenOfClass('pageSet')[0];
  if (node === undefined) {
    sink.add(root, 'no pageSet: the form is laid out on one page');
    return undefined;
  }
  if (root.childrenOfClass('pageSet').length > 1) sink.add(root, 'more than one pageSet (only the first is used)');
  const counter: Counter = { pageAreas: 0, pageSets: 0 };
  const model = readSet(node, null, 0, counter, sink);
  const all: PageAreaModel[] = [];
  collect(model, all);
  if (all.length === 0) {
    sink.add(node, 'pageSet holds no pageArea (the form is laid out on one page)');
    return undefined;
  }
  return { root: model, pageAreas: all, pageSetCount: counter.pageSets };
}

/** The page area or content area a break `target` names: `#id`, or an id or a name. SOM expressions are not resolved. */
export class TargetIndex {
  readonly #pageAreas = new Map<string, PageAreaModel>();
  readonly #contentAreas = new Map<string, { readonly area: ContentAreaModel; readonly page: PageAreaModel }>();

  constructor(model: PageModel) {
    for (const page of model.pageAreas) {
      for (const key of [page.id, page.name]) if (key !== '' && !this.#pageAreas.has(key)) this.#pageAreas.set(key, page);
      for (const area of page.contentAreas) for (const key of [area.id, area.name]) if (key !== '' && !this.#contentAreas.has(key)) this.#contentAreas.set(key, { area, page });
    }
  }

  pageArea(target: string): PageAreaModel | undefined {
    return this.#pageAreas.get(target.startsWith('#') ? target.slice(1) : target);
  }

  contentArea(target: string): { readonly area: ContentAreaModel; readonly page: PageAreaModel } | undefined {
    return this.#contentAreas.get(target.startsWith('#') ? target.slice(1) : target);
  }
}
