import { describe, expect, it } from 'vitest';
import { createFormDom } from '../../../model/form/index.js';
import { datasetsXml } from '../../../model/form/__tests__/helpers.js';
import { buildTemplateModel } from '../../../model/template/index.js';
import { NS28 } from '../../../model/template/__tests__/helpers.js';
import { parseXml } from '../../../xml/parse.js';
import { XfaLayoutError } from '../../errors.js';
import { layoutFlow } from '../../flow/index.js';
import { emptyTextContext } from '../../text/__tests__/helpers.js';
import { paginate } from '../paginate.js';
import { IssueSink } from '../../box/issues.js';
import { MAX_PAGE_AREAS, MAX_PAGE_SET_DEPTH } from '../limits.js';
import { readPageModel } from '../page-set.js';
import { block, featuresOf, namesOf, pages } from './helpers.js';

const area = (h = 50, extra = ''): string => `<contentArea x="0pt" y="0pt" w="100pt" h="${h}pt"/><medium short="100pt" long="200pt" ${extra}/>`;
const names = (r: ReturnType<typeof pages>): (string | undefined)[] => r.paged.pages.map((p) => p.pageArea?.name);
const flow = (n: number): string => Array.from({ length: n }, (_, i) => block(`b${i + 1}`, 50)).join('');

describe('which page area each page is made from (orderedOccurrence)', () => {
  it('an area with no occur has no limit', () => {
    const set = `<pageSet><pageArea name="A">${area()}<occur min="1" max="1"/></pageArea><pageArea name="B">${area()}</pageArea></pageSet>`;
    expect(names(pages(flow(4), set))).toEqual(['A', 'B', 'B', 'B']);
  });

  it('a nested page set is used after the areas of the set that holds it', () => {
    const set = `<pageSet><pageArea name="A">${area()}<occur min="1" max="1"/></pageArea><pageSet><pageArea name="N1">${area()}<occur min="1" max="1"/></pageArea><pageArea name="N2">${area()}<occur min="1" max="1"/></pageArea></pageSet></pageSet>`;
    expect(names(pages(flow(4), set))).toEqual(['A', 'N1', 'N2', 'A']);
  });

  it('a simplex set picks by odd / even page number (the number of the page being made), then any', () => {
    const set = `<pageSet relation="simplexPaginated"><pageArea name="Odd" oddOrEven="odd" pagePosition="rest">${area()}</pageArea><pageArea name="Even" oddOrEven="even" pagePosition="rest">${area()}</pageArea></pageSet>`;
    // The first page is the first area of the set; the pages after it follow the parity of their number.
    expect(names(pages(flow(4), set))).toEqual(['Odd', 'Even', 'Odd', 'Even']);
  });

  it('an unusable relation or position is reported and read as the default', () => {
    const set = `<pageSet relation="nonsense"><pageArea name="A" pagePosition="middle">${area()}</pageArea></pageSet>`;
    const features = featuresOf(pages(flow(1), set).paged);
    expect(features.some((f) => f.startsWith('relation: value not supported'))).toBe(true);
    expect(features.some((f) => f.startsWith('pagePosition: value not supported'))).toBe(true);
  });

  it('the page is as large as its medium, swapped for landscape; a page area with no medium takes the reach of its content areas and says so', () => {
    const set = `<pageSet><pageArea name="A"><contentArea x="0pt" y="0pt" w="100pt" h="50pt"/><medium short="100pt" long="200pt" orientation="landscape"/></pageArea><pageArea name="B"><contentArea x="10pt" y="20pt" w="100pt" h="50pt"/></pageArea></pageSet>`;
    const r = pages(flow(2), set);
    expect(r.paged.pages.map((p) => [p.widthPt, p.heightPt])).toEqual([[200, 100], [110, 70]]);
    expect(featuresOf(r.paged).some((f) => f.startsWith('pageArea has no usable medium'))).toBe(true);
  });

  it('a content area without a height is reported (whatever is placed in it overflows)', () => {
    const set = `<pageSet><pageArea name="A"><contentArea x="0pt" y="0pt" w="100pt"/><medium short="100pt" long="200pt"/></pageArea></pageSet>`;
    expect(featuresOf(pages(block('a', 10), set).paged).some((f) => f.startsWith('contentArea has no height'))).toBe(true);
  });
});

describe('a form without a usable page set', () => {
  it('is laid out on one page as large as the flow, and says so', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?><template xmlns="${NS28}"><subform name="form1" layout="tb">${block('a', 300)}${block('b', 300)}</subform></template>`;
    const dom = createFormDom(buildTemplateModel(parseXml(xml)), parseXml(datasetsXml('<form1/>')));
    const paged = paginate(layoutFlow(dom, emptyTextContext()), dom);
    expect(paged.pages).toHaveLength(1);
    expect(paged.pages[0]?.pageArea).toBeUndefined();
    expect(paged.pages[0]?.contentAreas[0]?.boxes.map((b) => b.rect.yPt)).toEqual([0, 300]);
    expect(featuresOf(paged)).toContain('no pageSet: the form is laid out on one page');
  });

  it('a page set with no page area is the same', () => {
    const r = pages(block('a', 10), '<pageSet/>');
    expect(r.paged.pages).toHaveLength(1);
    expect(featuresOf(r.paged).some((f) => f.startsWith('pageSet holds no pageArea'))).toBe(true);
  });

  it('a break in such a form is ignored and says so', () => {
    const r = pages(`<subform name="b" layout="tb"><breakBefore targetType="pageArea" startNew="1"/>${block('b1', 10)}</subform>`, '<pageSet/>');
    expect(r.paged.pages).toHaveLength(1);
    expect(featuresOf(r.paged).some((f) => f.includes('the form has no page set'))).toBe(true);
  });
});

describe('master pages and text', () => {
  it('each page carries the master page of its page area (shared by all its instances), and the texts of master and flow are by node', () => {
    const set = `<pageSet><pageArea name="A"><contentArea x="0pt" y="0pt" w="100pt" h="50pt"/><medium short="100pt" long="200pt"/><draw name="mA" x="0pt" y="190pt" w="50pt" h="10pt"><value><text>master</text></value></draw><occur min="1" max="1"/></pageArea><pageArea name="B"><contentArea x="0pt" y="0pt" w="100pt" h="50pt"/><medium short="100pt" long="200pt"/><draw name="mB" x="0pt" y="190pt" w="50pt" h="10pt"><value><text>m</text></value></draw></pageArea></pageSet>`;
    const r = pages(`<draw name="f1" w="60pt" h="50pt"><value><text>one</text></value></draw>${block('f2', 50, '', '<value><text>two</text></value>')}${block('f3', 50)}`, set);
    expect(r.paged.pages.map((p) => p.master?.boxes.map((b) => b.node.name))).toEqual([['mA'], ['mB'], ['mB']]);
    expect(r.paged.pages[1]?.master).toBe(r.paged.pages[2]?.master);
    const textNames = [...r.paged.texts.keys()].map((n) => n.name).sort();
    expect(textNames).toEqual(['f1', 'f2', 'mA', 'mB']);
    expect(r.paged.pages[0]?.pageArea).toBe(r.dom.root.childrenOfClass('pageSet')[0]?.childrenOfClass('pageArea')[0]);
  });
});

describe('arguments', () => {
  it('a flow or form that is not what paginate takes is a typed INVALID_ARGUMENT', () => {
    const { dom } = pages(block('a', 10));
    const flow = layoutFlow(dom, emptyTextContext());
    for (const bad of [() => paginate({} as never, dom), () => paginate(flow, {} as never), () => paginate(null as never, dom)]) {
      expect(bad).toThrow(XfaLayoutError);
      expect(bad).toThrow(/paginate:/);
    }
  });

  it('what a flow and a form give is the same result however often it is asked', () => {
    const { dom } = pages(block('a', 60) + block('b', 60));
    const flow = layoutFlow(dom, emptyTextContext());
    expect(namesOf(paginate(flow, dom))).toEqual(namesOf(paginate(flow, dom)));
  });
});

describe('occur', () => {
  /** The `occur` of the first page area after a script wrote `attrs` on it (the template gate admits only 1 / 1, a script is not gated). */
  function occurMax(attrs: Readonly<Record<string, string>>, template = '<occur min="1" max="1"/>'): { readonly max: number | undefined; readonly features: string[] } {
    const set = `<pageSet><pageArea name="A">${area()}${template}</pageArea></pageSet>`;
    const { dom } = pages('', set);
    const occur = dom.root.childrenOfClass('pageSet')[0]?.childrenOfClass('pageArea')[0]?.childrenOfClass('occur')[0];
    for (const [name, value] of Object.entries(attrs)) occur?.setAttr(name, value);
    const sink = new IssueSink();
    return { max: readPageModel(dom.root, sink)?.pageAreas[0]?.occurMax, features: sink.issues.map((i) => i.feature) };
  }

  it('max reads as the limit; a max below min reads as min; min alone makes max = min; neither means no limit', () => {
    expect(occurMax({ max: '5' }).max).toBe(5);
    expect(occurMax({ min: '3', max: '2' }).max).toBe(3);
    expect(occurMax({ min: '4', max: '' }).max).toBe(4);
    expect(occurMax({ min: '', max: '' }).max).toBe(-1);
    expect(occurMax({ max: '-1' }).max).toBe(-1);
  });

  it('a max that is not a whole number is reported and read as absent (min 1 stays: max = min)', () => {
    const r = occurMax({ max: 'abc' });
    expect(r.max).toBe(1);
    expect(r.features.some((f) => f.startsWith('max="abc" is not a whole number'))).toBe(true);
  });
});

describe('the ceilings on the master-page structure', () => {
  it(`page areas past ${MAX_PAGE_AREAS} are reported and ignored`, () => {
    const set = `<pageSet>${Array.from({ length: MAX_PAGE_AREAS + 3 }, (_, i) => `<pageArea name="A${i}">${area()}</pageArea>`).join('')}</pageSet>`;
    const { dom } = pages('', set);
    const sink = new IssueSink();
    const model = readPageModel(dom.root, sink);
    expect(model?.pageAreas).toHaveLength(MAX_PAGE_AREAS);
    expect(sink.issues.filter((i) => i.feature.startsWith(`more than ${MAX_PAGE_AREAS} page areas`))).toHaveLength(3);
  });

  it(`a page set nested deeper than ${MAX_PAGE_SET_DEPTH} levels is reported and ignored`, () => {
    const depth = MAX_PAGE_SET_DEPTH + 4;
    const set = `${'<pageSet>'.repeat(depth)}<pageArea name="Deep">${area()}</pageArea>${'</pageSet>'.repeat(depth)}`;
    const { dom } = pages('', set);
    const sink = new IssueSink();
    const model = readPageModel(dom.root, sink);
    // The outermost set holds no page area of its own and every set below the ceiling is read; the page area sits below it and is not.
    expect(model).toBeUndefined();
    expect(sink.issues.some((i) => i.feature.startsWith(`pageSet nested deeper than ${MAX_PAGE_SET_DEPTH} levels`))).toBe(true);
  });
});
