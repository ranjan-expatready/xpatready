/**
 * Pagination (W02-T08): the flowed form cut into pages. Internal to the engine until W02-T12 decides the public surface.
 *
 * - `paginate(flow, dom)`: `layoutFlow`'s result poured into the content areas of the page set, with `breakBefore` /
 *   `breakAfter`, `keep intact` and container splitting; the master page of each page attached.
 * - `layoutPages(dom, text)`: `layoutFlow` then `paginate`.
 * - `geometryOf` / `sameGeometry`: whether two paginations of a form put every box in the same place (the runtime's re-layout test, W02-T09).
 */
import type { FormDom } from '../../model/form/index.js';
import { layoutFlow } from '../flow/index.js';
import type { TextContext } from '../text/index.js';
import { paginate } from './paginate.js';
import type { PagedLayout } from './types.js';

export { geometryOf, sameGeometry } from './geometry.js';
export { paginate } from './paginate.js';
export { MAX_EMPTY_PAGES, FIT_TOLERANCE_PT } from './limits.js';
export type { ContentAreaLayout, LaidOutForm, MasterValues, PagedLayout, PageLayout } from './types.js';

/** The whole form of `dom` laid out and cut into pages (see `layoutFlow` and `paginate`). */
export const layoutPages = (dom: FormDom, text: TextContext): PagedLayout => paginate(layoutFlow(dom, text), dom);
