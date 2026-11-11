import type { PageAreaModel, PageModel, PageSetModel } from './page-set.js';

interface SetState {
  numberOfUse: number;
  pageIndex: number;
  pageSetIndex: number;
}

/**
 * Which page area the next page is an instance of. A semantic port of the page selection of pdf.js v4.10.38
 * (Apache-2.0) `template.js`: `PageArea[$isUsable]` / `[$getNextPage]` and `PageSet[$isUsable]` / `[$getNextPage]`.
 *
 * `orderedOccurrence` (the default, and the only relation in the corpus): the page areas in document order, each as many
 * times as its `occur` allows (no `occur`: without limit), then the nested page sets, then the set again from the start. So
 * IMM5257's `Page1` (`occur` 1/1) is used once and `OverFlowPage` (no `occur`) for every page after it.
 * `simplexPaginated` / `duplexPaginated`: the page area whose `oddOrEven` fits the number of the page about to be made and
 * whose `pagePosition` is `rest` (the first page is chosen by `start`), else the first `any`, else the first area.
 *
 * Differences from pdf.js: the walk is bounded (it can never recurse without end), and a page set whose every area is used
 * up starts over with all counts cleared, as pdf.js does at the top set (`PageSet[$cleanPage]`); pdf.js recurses without
 * end for a nested set that runs out.
 */
export class PageSequence {
  readonly #model: PageModel;
  readonly #uses = new Map<PageAreaModel, number>();
  readonly #sets = new Map<PageSetModel, SetState>();
  #budget = 0;

  constructor(model: PageModel) {
    this.#model = model;
  }

  /** Marks `first` as the page area of the first page (pdf.js `Template[$toPages]` step 6). */
  start(first: PageAreaModel): void {
    this.#uses.set(first, 1);
    this.#sets.set(first.parent, { numberOfUse: 1, pageIndex: first.parent.pageAreas.indexOf(first), pageSetIndex: 0 });
  }

  /**
   * Whether `page` may be used once more. As in pdf.js, the first question about an area answers yes whatever its `occur`
   * (it creates the area's count).
   */
  isUsable(page: PageAreaModel): boolean {
    const used = this.#uses.get(page);
    if (used === undefined) {
      this.#uses.set(page, 0);
      return true;
    }
    return page.occurMax === -1 || used < page.occurMax;
  }

  /** Counts one more use of `page` (an explicit break target that `isUsable` accepted). */
  use(page: PageAreaModel): void {
    this.#uses.set(page, (this.#uses.get(page) ?? 0) + 1);
  }

  /** The page area of the page numbered `pageNumber` (1-based), or undefined when the walk finds none. */
  next(pageNumber: number): PageAreaModel | undefined {
    const walk = (): PageAreaModel | undefined => {
      this.#budget = 4 * (this.#model.pageAreas.length + this.#model.pageSetCount) + 8;
      return this.#nextOfSet(this.#model.root, pageNumber);
    };
    const found = walk();
    if (found !== undefined) return found;
    // Every area is used up: the page set starts over.
    this.#uses.clear();
    this.#sets.clear();
    return walk();
  }

  #stateOf(set: PageSetModel): SetState {
    let state = this.#sets.get(set);
    if (state === undefined) {
      state = { numberOfUse: 1, pageIndex: -1, pageSetIndex: -1 };
      this.#sets.set(set, state);
    }
    return state;
  }

  #setUsable(set: PageSetModel, state: SetState): boolean {
    return set.occurMax === -1 || state.numberOfUse < set.occurMax;
  }

  #nextOfArea(page: PageAreaModel, pageNumber: number): PageAreaModel | undefined {
    if (page.parent.relation === 'orderedOccurrence' && this.isUsable(page)) {
      this.use(page);
      return page;
    }
    return this.#nextOfSet(page.parent, pageNumber);
  }

  #nextOfSet(set: PageSetModel, pageNumber: number): PageAreaModel | undefined {
    this.#budget -= 1;
    if (this.#budget <= 0) return undefined;
    const state = this.#stateOf(set);
    if (set.relation !== 'orderedOccurrence') return this.#byParity(set, pageNumber);
    if (state.pageIndex + 1 < set.pageAreas.length) {
      state.pageIndex += 1;
      const page = set.pageAreas[state.pageIndex];
      return page === undefined ? undefined : this.#nextOfArea(page, pageNumber);
    }
    if (state.pageSetIndex + 1 < set.pageSets.length) {
      state.pageSetIndex += 1;
      const child = set.pageSets[state.pageSetIndex];
      return child === undefined ? undefined : this.#nextOfSet(child, pageNumber);
    }
    if (this.#setUsable(set, state)) {
      state.numberOfUse += 1;
      state.pageIndex = -1;
      state.pageSetIndex = -1;
      return this.#nextOfSet(set, pageNumber);
    }
    return set.parent === null ? undefined : this.#nextOfSet(set.parent, pageNumber);
  }

  /** The page area for a simplex / duplex set: pdf.js `PageSet[$getNextPage]` for a relation other than `orderedOccurrence`. */
  #byParity(set: PageSetModel, pageNumber: number): PageAreaModel | undefined {
    const parity = pageNumber % 2 === 0 ? 'even' : 'odd';
    return (
      set.pageAreas.find((p) => p.oddOrEven === parity && p.pagePosition === 'rest') ??
      set.pageAreas.find((p) => p.oddOrEven === 'any' && p.pagePosition === 'rest') ??
      set.pageAreas.find((p) => p.oddOrEven === 'any' && p.pagePosition === 'any') ??
      set.pageAreas[0]
    );
  }
}
