import { describe, expect, it } from 'vitest';
import { MAX_ISSUES, MAX_PAGES } from '../../limits.js';
import { MAX_EMPTY_PAGES } from '../limits.js';
import { allBoxes, block, featuresOf, namesOf, pages, placedBoxes, stackOf } from './helpers.js';

/**
 * Hostile input (W02-T08 A4). Every case is bounded by counts, never by the clock: the number of pages, boxes and
 * issues is asserted, and a loop that did not end would never reach the assertion.
 */
const NEW_PAGE = '<breakBefore targetType="pageArea" startNew="1"/>';
const boxCount = (r: ReturnType<typeof pages>): number => r.paged.pages.reduce((n, p) => n + p.contentAreas.reduce((m, a) => m + a.boxes.reduce((k, b) => k + allBoxes(b).length, 0), 0), 0);

describe('self-referencing and unresolvable breaks', () => {
  it('a break whose target is the page area it is already in, on every subform, makes one page per subform and no more', () => {
    const body = Array.from({ length: 6 }, (_, i) => `<subform name="s${i}" layout="tb" w="50pt"><breakBefore targetType="pageArea" target="#pn" startNew="1"/>${block(`b${i}`, 10)}</subform>`).join('');
    const r = pages(body);
    // s0 starts a new page (P1 is used up, so PN); every later break starts one more.
    expect(r.paged.pages).toHaveLength(6);
    expect(r.paged.truncated).toBe(false);
  });

  it('a breakAfter that targets the content area it ends in does not loop: it is decided once', () => {
    const body = `<subform name="s" layout="tb" w="50pt">${block('b', 10)}<breakAfter targetType="contentArea" target="#c1" startNew="1"/></subform>${block('after', 10)}`;
    const r = pages(body);
    expect(r.paged.pages.length).toBeLessThanOrEqual(3);
    expect(r.paged.truncated).toBe(false);
  });

  it('a break that names the subform it sits on names no page area or content area and is ignored', () => {
    const body = `<subform name="self" layout="tb" w="50pt"><breakBefore targetType="pageArea" target="self" startNew="1"/>${block('b', 10)}</subform>${block('c', 10)}`;
    const r = pages(body);
    expect(r.paged.pages).toHaveLength(1);
    expect(featuresOf(r.paged).some((f) => f.includes('names no page area or content area'))).toBe(true);
  });
});

describe('page explosion', () => {
  it('10,000 subforms that each start a new page end at the page ceiling, truncated, with the reason', () => {
    const body = Array.from({ length: 10_000 }, (_, i) => `<subform name="s${i}" layout="tb" w="50pt">${NEW_PAGE}${block('b', 1)}</subform>`).join('');
    const r = pages(body);
    expect(r.paged.pages).toHaveLength(MAX_PAGES);
    expect(r.paged.truncated).toBe(true);
    expect(featuresOf(r.paged).some((f) => f.startsWith(`more than ${MAX_PAGES} pages`))).toBe(true);
    // The content that was placed is whole: one block per page.
    expect(boxCount(r)).toBe(MAX_PAGES * 2);
  });

  it('blocks that are each taller than the content area get one page each up to the ceiling, never a loop', () => {
    const r = pages(Array.from({ length: MAX_PAGES + 50 }, (_, i) => block(`t${i}`, 500)).join(''));
    expect(r.paged.pages).toHaveLength(MAX_PAGES);
    expect(r.paged.truncated).toBe(true);
    expect(featuresOf(r.paged).filter((f) => f.startsWith('taller than an empty content area')).length).toBeGreaterThan(0);
  });

  it('a page area with no content area makes empty pages until the empty-page limit, then stops with a page standing', () => {
    const set = '<pageSet><pageArea name="Hollow"><medium short="100pt" long="200pt"/></pageArea></pageSet>';
    const r = pages(block('a', 10), set);
    expect(r.paged.truncated).toBe(true);
    expect(r.paged.pages).toHaveLength(1);
    expect(featuresOf(r.paged).some((f) => f.startsWith(`${MAX_EMPTY_PAGES} empty pages in a row`))).toBe(true);
  });

  it('breaks that all fall due at once leave empty pages that are dropped: the content after them is laid out, not truncated', () => {
    const levels = 20;
    const body = `${'<subform layout="tb" w="50pt">'.repeat(levels)}${block('a', 10)}${'<breakAfter targetType="pageArea" startNew="1"/></subform>'.repeat(levels)}${block('z', 10)}`;
    const r = pages(body);
    expect(r.paged.pages.length).toBeLessThanOrEqual(MAX_PAGES);
    expect(r.paged.truncated).toBe(false);
    expect(featuresOf(r.paged).some((f) => f.includes('empty pages in a row'))).toBe(false);
    // The 20 breaks all fall due before `z`: `a` stays on its page and `z` opens the one page the breaks leave standing.
    expect(namesOf(r.paged).map((page) => page.flat().length)).toEqual([1, 1]);
    expect(placedBoxes(r.paged).map((entry) => `${entry.page}:${entry.box.node.name}`)).toEqual(expect.arrayContaining(['0:a', '1:z']));
  });
});

describe('big and deep flows', () => {
  it('10,000 empty (zero-height) subforms fit one page and are all placed', () => {
    const r = pages(Array.from({ length: 10_000 }, (_, i) => `<subform name="e${i}" layout="tb" w="10pt"/>`).join(''));
    expect(r.paged.pages).toHaveLength(1);
    expect(r.paged.pages[0]?.contentAreas[0]?.boxes).toHaveLength(10_000);
  });

  it('10,000 small blocks are cut into pages up to the ceiling with every placed block once, and the rest is reported as not laid out', () => {
    const r = pages(Array.from({ length: 10_000 }, (_, i) => block(`b${i}`, 10)).join(''));
    expect(r.paged.pages).toHaveLength(MAX_PAGES);
    expect(r.paged.truncated).toBe(true);
    expect(boxCount(r)).toBe(MAX_PAGES * 10);
  });

  it('nesting at the depth the box layer allows paginates without recursing past it', () => {
    const depth = 150;
    const body = `${'<subform layout="tb" w="50pt">'.repeat(depth)}${block('leaf', 10)}${'</subform>'.repeat(depth)}`;
    const r = pages(body);
    expect(r.paged.pages).toHaveLength(1);
    expect(boxCount(r)).toBeGreaterThan(100);
  });

  it('a cut container nested 100 deep with enough content for several pages keeps every block once', () => {
    const depth = 100;
    const body = `${'<subform layout="tb" w="50pt">'.repeat(depth)}${Array.from({ length: 20 }, (_, i) => block(`k${i}`, 30)).join('')}${'</subform>'.repeat(depth)}`;
    const r = pages(body);
    const leaves = r.paged.pages.flatMap((p) => p.contentAreas.flatMap((a) => a.boxes.flatMap(allBoxes))).filter((b) => b.node.className === 'draw');
    expect(leaves).toHaveLength(20);
    expect(r.paged.pages.length).toBeGreaterThan(3);
  });

  it('a container with thousands of children split over many pages places each child once', () => {
    const r = pages(stackOf('big', 3_000, 10));
    const leaves = r.paged.pages.flatMap((p) => p.contentAreas.flatMap((a) => a.boxes.flatMap(allBoxes))).filter((b) => b.node.className === 'draw');
    expect(leaves).toHaveLength(3_000);
    expect(r.paged.pages).toHaveLength(3_000 / 10);
  });
});

describe('issues under truncation', () => {
  it('the reason pagination stopped is kept when the flow already filled the issue list, and the ones that no longer fit are counted', () => {
    // Every subform is narrower than its block: one flow issue each, 10,000 of them, then the page ceiling.
    const body = Array.from({ length: MAX_ISSUES + 500 }, (_, i) => `<subform name="s${i}" layout="tb" w="10pt">${NEW_PAGE}${block('b', 1)}</subform>`).join('');
    const r = pages(body);
    expect(r.paged.truncated).toBe(true);
    expect(r.paged.issues).toHaveLength(MAX_ISSUES);
    expect(featuresOf(r.paged).some((f) => f.startsWith(`more than ${MAX_PAGES} pages`))).toBe(true);
    expect(r.paged.droppedIssues).toBeGreaterThan(0);
  });
});
