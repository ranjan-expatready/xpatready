import type { LayoutBox } from '../../box/types.js';
import { createFormDom, type FormDom, type FormNode } from '../../../model/form/index.js';
import { datasetsXml } from '../../../model/form/__tests__/helpers.js';
import { buildTemplateModel, loadTemplate } from '../../../model/template/index.js';
import { NS28 } from '../../../model/template/__tests__/helpers.js';
import { parseXml } from '../../../xml/parse.js';
import { emptyTextContext } from '../../text/__tests__/helpers.js';
import { layoutPages } from '../index.js';
import type { PagedLayout } from '../types.js';

/**
 * Without embedded fonts every typeface is the fixed-pitch Courier fallback, but these forms give every box its size, so no
 * text decides a height. The page set: `P1` (occur 1/1) then `PN` (no occur), both 100 pt of content area.
 */
export const PAGE_SET = `<pageSet><pageArea name="P1" id="p1"><contentArea x="10pt" y="20pt" w="200pt" h="100pt" name="C1" id="c1"/><medium short="220pt" long="300pt"/><occur min="1" max="1"/></pageArea><pageArea name="PN" id="pn"><contentArea x="5pt" y="15pt" w="200pt" h="100pt" name="CN" id="cn"/><medium short="220pt" long="300pt"/></pageArea></pageSet>`;

export interface Form {
  readonly dom: FormDom;
  readonly paged: PagedLayout;
}

/** The synthetic form `body` (children of the root subform `form1`, flowed `tb`) paginated; the page set is `PAGE_SET` unless given. `gated: false` keeps constructs the template gate refuses (a repeating `occur`). */
export function pages(body: string, pageSet: string = PAGE_SET, options: { readonly gated?: boolean; readonly rootAttrs?: string } = {}): Form {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><template xmlns="${NS28}"><subform name="form1" layout="tb" ${options.rootAttrs ?? ''}>${pageSet}${body}</subform></template>`;
  const model = options.gated === false ? buildTemplateModel(parseXml(xml)) : loadTemplate(xml);
  const dom = createFormDom(model, parseXml(datasetsXml('<form1/>')));
  return { dom, paged: layoutPages(dom, emptyTextContext()) };
}

/** A draw of `h` points high (and 50 pt wide) in the flow. */
export const block = (name: string, h: number, attrs = '', inner = ''): string => `<draw name="${name}" w="50pt" h="${h}pt" ${attrs}>${inner}</draw>`;

/** A flowed `tb` subform of `h` points of blocks (`parts` each `each` points high). */
export const stackOf = (name: string, parts: number, each: number, attrs = '', inner = ''): string =>
  `<subform name="${name}" layout="tb" w="100pt" ${attrs}>${inner}${Array.from({ length: parts }, (_, i) => block(`${name}${i + 1}`, each)).join('')}</subform>`;

/** The names of the top-level boxes of every content area of every page: `[page][area] -> names`. */
export const namesOf = (paged: PagedLayout): string[][][] => paged.pages.map((page) => page.contentAreas.map((area) => area.boxes.map((box) => box.node.name)));

/** Every box under `box` (itself included), depth first. */
export function allBoxes(box: LayoutBox): LayoutBox[] {
  const out: LayoutBox[] = [];
  const pending = [box];
  for (let next = pending.pop(); next !== undefined; next = pending.pop()) {
    out.push(next);
    pending.push(...[...next.children].reverse());
  }
  return out;
}

/** Every box of the flowed content, anywhere in a page's content areas, with the page it is on (document order). */
export function placedBoxes(paged: PagedLayout): { readonly page: number; readonly box: LayoutBox }[] {
  return paged.pages.flatMap((page) => page.contentAreas.flatMap((area) => area.boxes.flatMap((top) => allBoxes(top).map((box) => ({ page: page.index, box })))));
}

/** The boxes of `node` on each page (page index to boxes), anywhere in the page's content. */
export function boxesOf(paged: PagedLayout, node: FormNode): { readonly page: number; readonly box: LayoutBox }[] {
  return placedBoxes(paged).filter((entry) => entry.box.node === node);
}

export const featuresOf = (paged: PagedLayout): string[] => paged.issues.map((issue) => issue.feature);
