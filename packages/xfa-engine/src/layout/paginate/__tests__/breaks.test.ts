import { describe, expect, it } from 'vitest';
import { block, featuresOf, namesOf, pages, placedBoxes, stackOf } from './helpers.js';

const sub = (name: string, inner: string, attrs = ''): string => `<subform name="${name}" layout="tb" w="100pt" ${attrs}>${inner}</subform>`;
const before = (attrs: string): string => `<breakBefore ${attrs}/>`;
const NEW_PAGE = 'targetType="pageArea" startNew="1"';
const pageNames = (r: ReturnType<typeof pages>): (string | undefined)[] => r.paged.pages.map((p) => p.pageArea?.name);

describe('breakBefore', () => {
  it('startNew 1 on a page area with no target starts a new page of the current page area, and the subform is the first content of it', () => {
    const r = pages(sub('a', block('a1', 20)) + sub('b', before(NEW_PAGE) + block('b1', 20)));
    expect(namesOf(r.paged)).toEqual([[['a']], [['b']]]);
    expect(r.paged.pages[1]?.contentAreas[0]?.boxes[0]?.rect.yPt).toBe(15);
    expect(pageNames(r)).toEqual(['P1', 'PN']);
  });

  it('a break on content that already starts a page makes no blank page: the empty page is dropped (pdf.js hasSomething)', () => {
    const r = pages(sub('a', before(NEW_PAGE) + block('a1', 20)));
    // The first break is not the page-area target of the first page, so it runs; P1 (occur 1/1) is then used up and the page that was empty goes.
    expect(namesOf(r.paged)).toEqual([[['a']]]);
    expect(pageNames(r)).toEqual(['PN']);
  });

  it.each([3, 4, 5, 8])('%i nested breakBefore startNew=1 at the start of the form do not stop pagination: the content after them is laid out', (depth) => {
    const nested = `${'<subform layout="tb" w="100pt">'.repeat(depth)}<breakBefore ${NEW_PAGE}/>${block('first', 20)}${'</subform>'.repeat(depth)}`;
    const r = pages(nested + sub('after', block('after1', 20)));
    expect(r.paged.pages.length).toBeGreaterThan(0);
    expect(r.paged.truncated).toBe(false);
    expect(featuresOf(r.paged).some((f) => f.includes('empty pages in a row'))).toBe(false);
    expect(placedBoxes(r.paged).map((entry) => entry.box.node.name)).toEqual(expect.arrayContaining(['first', 'after1']));
  });

  it.each([4, 5])('%i nested breakAfter startNew=1 that fall due together do not stop pagination: the content after them is laid out', (depth) => {
    const nested = `${'<subform layout="tb" w="100pt">'.repeat(depth)}${block('first', 20)}${`<breakAfter ${NEW_PAGE}/></subform>`.repeat(depth)}`;
    const r = pages(nested + sub('after', block('after1', 20)));
    expect(r.paged.truncated).toBe(false);
    expect(featuresOf(r.paged).some((f) => f.includes('empty pages in a row'))).toBe(false);
    expect(placedBoxes(r.paged).map((entry) => `${entry.page}:${entry.box.node.name}`)).toEqual(expect.arrayContaining(['0:first', '1:after1']));
  });

  it('a target that names a page area on the first subform picks the first page and is used up there', () => {
    const r = pages(sub('a', before('targetType="pageArea" target="PN"') + block('a1', 20)) + sub('b', block('b1', 20)));
    expect(pageNames(r)).toEqual(['PN']);
    expect(namesOf(r.paged)).toEqual([[['a', 'b']]]);
  });

  it('the first subform\'s break that names the first page area is used up choosing it, even with startNew: no blank first page', () => {
    const r = pages(sub('a', before('targetType="pageArea" target="P1" startNew="1"') + block('a1', 20)) + sub('b', block('b1', 20)));
    expect(pageNames(r)).toEqual(['P1']);
    expect(namesOf(r.paged)).toEqual([[['a', 'b']]]);
  });

  it('without startNew a break only moves to a target that is not the current page area', () => {
    const toPn = `${before('targetType="pageArea" target="PN"')}`;
    const r = pages(sub('a', block('a1', 20)) + sub('b', toPn + block('b1', 20)) + sub('c', toPn + block('c1', 20)));
    // b: current is P1, target PN differs: new page. c: current is PN already: no break.
    expect(namesOf(r.paged)).toEqual([[['a']], [['b', 'c']]]);
  });

  it('a page-area target is found by name or by #id', () => {
    const r = pages(sub('a', block('a1', 20)) + sub('b', before('targetType="pageArea" target="#pn" startNew="1"') + block('b1', 20)));
    expect(pageNames(r)).toEqual(['P1', 'PN']);
  });

  it('a target that names nothing is reported and the break is ignored', () => {
    const r = pages(sub('a', block('a1', 20)) + sub('b', before('targetType="pageArea" target="nowhere" startNew="1"') + block('b1', 20)));
    expect(namesOf(r.paged)).toEqual([[['a', 'b']]]);
    expect(featuresOf(r.paged).some((f) => f.includes('names no page area or content area'))).toBe(true);
  });

  it('targetType auto and a hidden subform do nothing', () => {
    const r = pages(sub('a', block('a1', 20)) + sub('b', before('startNew="1"') + block('b1', 20)) + sub('c', before(NEW_PAGE) + block('c1', 20), 'presence="hidden"'));
    expect(namesOf(r.paged)).toEqual([[['a', 'b']]]);
  });

  it('the deprecated break element is read as a breakBefore / breakAfter', () => {
    const legacy = '<break before="pageArea" startNew="1"/>';
    const r = pages(sub('a', block('a1', 20)) + sub('b', legacy + block('b1', 20)));
    expect(namesOf(r.paged)).toEqual([[['a']], [['b']]]);
    const after = pages(sub('a', '<break after="pageArea" startNew="1"/>' + block('a1', 20)) + sub('b', block('b1', 20)));
    expect(namesOf(after.paged)).toEqual([[['a']], [['b']]]);
  });

  it('pageEven / pageOdd are not modelled and say so', () => {
    const r = pages(sub('a', '<break before="pageEven"/>' + block('a1', 20)));
    expect(featuresOf(r.paged).some((f) => f.includes('pageEven'))).toBe(true);
  });

  it('a break inside a block that is placed whole is ignored, reported once per subform', () => {
    const inner = `<subform name="in" layout="tb">${before(NEW_PAGE)}${block('i1', 10)}</subform>`;
    const r = pages(`<subform name="p" layout="position" w="100pt">${inner}</subform>`);
    expect(namesOf(r.paged)).toEqual([[['p']]]);
    expect(featuresOf(r.paged).filter((f) => f.startsWith('break inside a block that is placed whole'))).toHaveLength(1);
  });

  it('a leader or trailer is reported (not applied)', () => {
    const r = pages(sub('a', block('a1', 20)) + sub('b', before(`${NEW_PAGE} leader="x"`) + block('b1', 20)));
    expect(featuresOf(r.paged).some((f) => f.startsWith('leader is not modelled'))).toBe(true);
  });

  it('a break in a container that is cut starts the page at the top, the containers above continue there', () => {
    const r = pages(sub('outer', block('o1', 20) + sub('mid', before(NEW_PAGE) + block('m1', 20)) + block('o2', 20)));
    expect(namesOf(r.paged)).toEqual([[['outer']], [['outer']]]);
    expect(r.paged.pages[0]?.contentAreas[0]?.boxes[0]?.children.map((c) => c.node.name)).toEqual(['o1']);
    expect(r.paged.pages[1]?.contentAreas[0]?.boxes[0]?.children.map((c) => c.node.name)).toEqual(['mid', 'o2']);
  });
});

describe('breakAfter', () => {
  it('the content after it starts a new page', () => {
    const r = pages(sub('a', block('a1', 20) + '<breakAfter targetType="pageArea" startNew="1"/>') + sub('b', block('b1', 20)));
    expect(namesOf(r.paged)).toEqual([[['a']], [['b']]]);
  });

  it('a break after the last content makes no extra page', () => {
    const r = pages(sub('a', block('a1', 20) + '<breakAfter targetType="pageArea" startNew="1"/>'));
    expect(namesOf(r.paged)).toEqual([[['a']]]);
  });

  it('a break after and a break before in a row make one new page, not two', () => {
    const r = pages(sub('a', block('a1', 20) + '<breakAfter targetType="pageArea" startNew="1"/>') + sub('b', before(NEW_PAGE) + block('b1', 20)));
    expect(namesOf(r.paged)).toEqual([[['a']], [['b']]]);
  });
});

describe('content area breaks', () => {
  const TWO_AREAS = `<pageSet><pageArea name="P" id="p"><contentArea x="0pt" y="0pt" w="200pt" h="50pt" name="A1" id="a1"/><contentArea x="0pt" y="60pt" w="200pt" h="50pt" name="A2" id="a2"/><medium short="220pt" long="300pt"/></pageArea></pageSet>`;
  const AREA = 'targetType="contentArea" startNew="1"';

  it('a flow that fills the first content area goes on in the second, then on a new page', () => {
    const r = pages(block('a', 30) + block('b', 30) + block('c', 30) + block('d', 30), TWO_AREAS);
    expect(namesOf(r.paged)).toEqual([[['a'], ['b']], [['c'], ['d']]]);
    expect(r.paged.pages[0]?.contentAreas.map((a) => a.rect.yPt)).toEqual([0, 60]);
  });

  it('startNew on a content area with no target goes to the next content area of the page, and to a new page from the last', () => {
    const r = pages(sub('a', block('a1', 10)) + sub('b', before(AREA) + block('b1', 10)) + sub('c', before(AREA) + block('c1', 10)), TWO_AREAS);
    expect(namesOf(r.paged)).toEqual([[['a'], ['b']], [['c'], []]]);
  });

  it('a target ahead on the same page jumps to it; the area is found by name', () => {
    const r = pages(sub('a', block('a1', 10)) + sub('b', before('targetType="contentArea" target="A2" startNew="1"') + block('b1', 10)), TWO_AREAS);
    expect(namesOf(r.paged)).toEqual([[['a'], ['b']]]);
  });

  it('a target that is behind starts a new page and begins in that area', () => {
    const r = pages(sub('a', block('a1', 10)) + sub('b', before(AREA) + block('b1', 10)) + sub('c', before('targetType="contentArea" target="A1" startNew="1"') + block('c1', 10)), TWO_AREAS);
    expect(namesOf(r.paged)).toEqual([[['a'], ['b']], [['c'], []]]);
  });
});

describe('a split container and a break together', () => {
  it('a container that is cut keeps its own break: the break applies once, not again on the continuation', () => {
    const r = pages(stackOf('s', 3, 40, '', before(NEW_PAGE)));
    expect(namesOf(r.paged)).toEqual([[['s']], [['s']]]);
    expect(r.paged.pages).toHaveLength(2);
  });
});

describe('the root subform\'s own break', () => {
  it('a root breakBefore that names no page area runs: the empty first page is dropped and the first page is the next page area (pdf.js root[$toHTML])', () => {
    const r = pages(`${before(NEW_PAGE)}${block('a', 20)}`);
    expect(pageNames(r)).toEqual(['PN']);
    expect(namesOf(r.paged)).toEqual([[['a']]]);
  });

  it('a root breakBefore that names a page area picks it for the first page and is used up there', () => {
    const r = pages(`${before('targetType="pageArea" target="PN" startNew="1"')}${block('a', 20)}`);
    expect(pageNames(r)).toEqual(['PN']);
    expect(r.paged.pages).toHaveLength(1);
  });

  it('a break reported once is reported once: the first-page rule and the flow read the same break', () => {
    const r = pages(sub('a', before(`${NEW_PAGE} leader="x"`) + block('a1', 20)));
    expect(featuresOf(r.paged).filter((f) => f.startsWith('leader is not modelled'))).toHaveLength(1);
  });
});

describe('a break whose target page area cannot be used again', () => {
  it('falls back to the next page area in sequence (P1 has occur 1/1 and is used by the first page)', () => {
    const r = pages(sub('a', block('a1', 20)) + sub('b', before('targetType="pageArea" target="P1" startNew="1"') + block('b1', 20)));
    expect(pageNames(r)).toEqual(['P1', 'PN']);
    expect(namesOf(r.paged)).toEqual([[['a']], [['b']]]);
  });
});

describe('content area targets across page areas', () => {
  const area = (name: string, y: number): string => `<contentArea x="0pt" y="${y}pt" w="200pt" h="50pt" name="${name}" id="${name.toLowerCase()}"/>`;
  const SET = `<pageSet><pageArea name="PA" id="pa">${area('A1', 0)}<medium short="220pt" long="300pt"/></pageArea><pageArea name="PB" id="pb">${area('B1', 0)}${area('B2', 60)}${area('B3', 120)}<medium short="220pt" long="300pt"/></pageArea></pageSet>`;
  const AREA = (target: string, startNew = 1): string => `<breakBefore targetType="contentArea" target="${target}" startNew="${startNew}"/>`;

  it('a target in another page area starts a new page of it, beginning in that content area (index above 0)', () => {
    const r = pages(sub('a', block('a1', 20)) + sub('b', AREA('B2') + block('b1', 20)), SET);
    expect(pageNames(r)).toEqual(['PA', 'PB']);
    expect(namesOf(r.paged)).toEqual([[['a']], [[], ['b'], []]]);
    expect(r.paged.pages[1]?.contentAreas[1]?.rect.yPt).toBe(60);
  });

  it('a target that is behind on this page, without startNew, starts a new page beginning in that area (the index is kept)', () => {
    const body = sub('a', block('a1', 20)) + sub('b', AREA('B3') + block('b1', 20)) + sub('c', AREA('B2', 0) + block('c1', 20));
    const r = pages(body, SET);
    // b: a new page of PB, area B3. c: B2 is behind the current area B3 on the same page: a new page of PB, in B2.
    expect(pageNames(r)).toEqual(['PA', 'PB', 'PB']);
    expect(namesOf(r.paged)).toEqual([[['a']], [[], [], ['b']], [[], ['c'], []]]);
  });

  it('a used-up target page area is replaced by the next in sequence, and the start index is clamped to that area\'s content areas', () => {
    const set = `<pageSet><pageArea name="PX">${area('X1', 0)}${area('X2', 60)}<medium short="220pt" long="300pt"/><occur min="1" max="1"/></pageArea><pageArea name="PY">${area('Y1', 0)}<medium short="220pt" long="300pt"/><occur min="1" max="1"/></pageArea><pageArea name="PZ">${area('Z1', 0)}<medium short="220pt" long="300pt"/><occur min="1" max="1"/></pageArea></pageSet>`;
    const body = sub('a', block('a1', 20)) + sub('c', before(NEW_PAGE) + block('c1', 20)) + sub('d', AREA('X2') + block('d1', 20));
    const r = pages(body, set);
    // d asks for X2 (index 1) of PX, which is used up: the next page area in sequence is PZ, which has one content area, so d starts in Z1.
    // (Unclamped, the index would be past PZ's last area, PZ would be dropped as empty and the walk would come round to PX again.)
    expect(pageNames(r)).toEqual(['PX', 'PY', 'PZ']);
    expect(namesOf(r.paged)).toEqual([[['a'], []], [['c']], [['d']]]);
  });
});
