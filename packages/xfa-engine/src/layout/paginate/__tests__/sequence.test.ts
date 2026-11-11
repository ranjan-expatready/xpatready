import { describe, expect, it } from 'vitest';
import { IssueSink } from '../../box/issues.js';
import { readPageModel, type PageAreaModel, type PageModel, type PageSetModel } from '../page-set.js';
import { PageSequence } from '../sequence.js';
import { pages } from './helpers.js';

const area = (name: string, extra = ''): string => `<pageArea name="${name}"><contentArea x="0pt" y="0pt" w="100pt" h="50pt"/><medium short="100pt" long="200pt"/>${extra}</pageArea>`;

/** `set` rebuilt as a new model with the `occur` max of areas replaced by name (the template gate admits only 1, which the model does not): nothing is patched in place. */
function copyOf(set: PageSetModel, parent: PageSetModel | null, limits: Readonly<Record<string, number>>, areas: PageAreaModel[]): PageSetModel {
  const pageAreas: PageAreaModel[] = [];
  const pageSets: PageSetModel[] = [];
  const copy: PageSetModel = { ...set, pageAreas, pageSets, parent };
  for (const page of set.pageAreas) {
    const rebuilt: PageAreaModel = { ...page, occurMax: limits[page.name] ?? page.occurMax, parent: copy };
    pageAreas.push(rebuilt);
    areas.push(rebuilt);
  }
  for (const child of set.pageSets) pageSets.push(copyOf(child, copy, limits, areas));
  return copy;
}

/** The page model of a form with this page set; `limits` gives the `occur` max of areas by name. */
function modelOf(set: string, limits: Readonly<Record<string, number>> = {}): PageModel {
  const read = readPageModel(pages('', set).dom.root, new IssueSink());
  if (read === undefined) throw new Error('no page model');
  const areas: PageAreaModel[] = [];
  const root = copyOf(read.root, null, limits, areas);
  return { root, pageAreas: areas, pageSetCount: read.pageSetCount };
}

/** The names of the next `count` pages after the first (the first page area of the root set is the first page). */
function run(model: PageModel, count: number): string[] {
  const sequence = new PageSequence(model);
  const first: PageAreaModel | undefined = model.root.pageAreas[0];
  if (first === undefined) throw new Error('no first page area');
  sequence.start(first);
  const out = [first.name];
  for (let n = 2; n <= count; n += 1) out.push(sequence.next(n)?.name ?? '-');
  return out;
}

describe('PageSequence', () => {
  it('walks the areas in document order, one use per area per pass (pdf.js; the template gate admits only occur 1/1, so a larger max is not reachable from a form)', () => {
    const model = modelOf(`<pageSet>${area('A')}${area('B')}${area('C')}</pageSet>`, { A: 1, B: 1 });
    expect(run(model, 6)).toEqual(['A', 'B', 'C', 'C', 'C', 'C']);
  });

  it('an area with no limit is used until the pages end', () => {
    expect(run(modelOf(`<pageSet>${area('A')}${area('B')}</pageSet>`, { A: 1 }), 5)).toEqual(['A', 'B', 'B', 'B', 'B']);
  });

  it('a set whose every area is used up starts over instead of ending or recursing without end', () => {
    expect(run(modelOf(`<pageSet>${area('A')}</pageSet>`, { A: 1 }), 4)).toEqual(['A', 'A', 'A', 'A']);
    expect(run(modelOf(`<pageSet>${area('A')}${area('B')}</pageSet>`, { A: 1, B: 1 }), 5)).toEqual(['A', 'B', 'A', 'B', 'A']);
  });

  it('the first question about an area says yes whatever its limit (pdf.js creates the count then)', () => {
    const model = modelOf(`<pageSet>${area('A')}${area('B')}</pageSet>`, { B: 0 });
    const sequence = new PageSequence(model);
    const b = model.root.pageAreas[1];
    if (b === undefined) throw new Error('no B');
    expect([sequence.isUsable(b), sequence.isUsable(b)]).toEqual([true, false]);
  });

  it('an explicit target uses up one occurrence', () => {
    const model = modelOf(`<pageSet>${area('A')}${area('B')}</pageSet>`, { B: 1 });
    const sequence = new PageSequence(model);
    const b = model.root.pageAreas[1];
    if (b === undefined) throw new Error('no B');
    sequence.isUsable(b);
    sequence.use(b);
    expect(sequence.isUsable(b)).toBe(false);
  });

  it('a nested set that runs out neither loops nor ends the pages', () => {
    const set = `<pageSet>${area('A')}<pageSet>${area('N1')}${area('N2')}</pageSet></pageSet>`;
    expect(run(modelOf(set, { A: 1, N1: 1, N2: 1 }), 7)).toEqual(['A', 'N1', 'N2', 'A', 'N1', 'N2', 'A']);
  });
});
