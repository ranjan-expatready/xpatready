import { describe, expect, it } from 'vitest';
import { XfaLayoutError } from '../../layout/errors.js';
import { block, pages } from '../../layout/paginate/__tests__/helpers.js';
import { at } from '../../model/form/__tests__/helpers.js';
import { XfaFormError, type FormNode } from '../../model/form/index.js';
import { XfaScriptError } from '../../script/index.js';
import { XfaPdfError } from '../../pdf/errors.js';
import type { XfaPdf } from '../../xfa-pdf.js';
import { LayoutSession, readLayoutFonts, type LayoutBinding } from '../layout-session.js';
import { layoutAccessOf } from '../layout-access.js';
import { makeRuntime, thrown } from './helpers.js';

/**
 * The layout session over a form DOM with a stand-in for the script side (W02-T09): what it asks of the engine and the
 * sandbox, what it answers `xfa.layout` with, and how it treats a layout the layout layer refuses.
 */
const NEW_PAGE = '<breakBefore targetType="pageArea" startNew="1"/>';
const part = (name: string): string => `<subform name="${name}" layout="tb" w="100pt">${name === 'p1' ? '' : NEW_PAGE}${block(`${name}b`, 20)}</subform>`;

function session(body: string, binding?: Partial<LayoutBinding>): { readonly session: LayoutSession; readonly asked: (FormNode | undefined)[]; readonly dom: ReturnType<typeof pages>['dom'] } {
  const { dom } = pages(body);
  const made = new LayoutSession({ dom, model: dom.model, fonts: { faces: [], issues: [] }, maxPasses: 3 });
  const asked: (FormNode | undefined)[] = [];
  made.bind({
    engine: {
      runLayoutReady: (area) => {
        asked.push(area);
        return 1;
      },
    },
    sandbox: { withinRunBudget: (run) => run() },
    ...binding,
  });
  return { session: made, asked, dom };
}

describe('what the session asks of the engine', () => {
  it('runs the body handlers once, then the handlers of each page instance\'s page area in page order (the same area again for each further page)', () => {
    const { session: made, asked, dom } = session(part('p1') + part('p2') + part('p3'));
    expect(made.settle().scripts).toBe(4);
    const pagesSet = dom.root.childrenOfClass('pageSet')[0];
    const [first, next] = pagesSet?.childrenOfClass('pageArea') ?? [];
    expect(asked).toEqual([undefined, first, next, next]);
    expect(made.current?.pages).toHaveLength(3);
  });

  it('is current until the DOM revision moves: a second settle does nothing, a write makes the next one lay out again', () => {
    const { session: made, asked, dom } = session(part('p1') + part('p2'));
    made.settle();
    const count = asked.length;
    expect(made.isCurrent).toBe(true);
    expect(made.settle()).toEqual({ scripts: 0, wrote: false });
    expect(asked).toHaveLength(count);
    at(dom, 'p1.p1b').setAttr('h', '25pt');
    expect(made.isCurrent).toBe(false);
    made.settle();
    expect(made.current?.revision).toBe(dom.revision);
    expect(made.isCurrent).toBe(true);
    expect(asked.length).toBeGreaterThan(count);
  });

  it('a session that is not bound to a runtime cannot settle', () => {
    const { dom } = pages(part('p1'));
    const unbound = new LayoutSession({ dom, model: dom.model, fonts: { faces: [], issues: ['font.program.F1'] }, maxPasses: 2 });
    expect(() => unbound.settle()).toThrow(/not bound/);
    expect(unbound.fontIssues).toEqual(['font.program.F1']);
    expect(unbound.current).toBeUndefined();
    expect(unbound.pageCount()).toBe(0);
  });
});

describe('the writes a master page\'s own scripts make to that page', () => {
  const area = (dom: ReturnType<typeof pages>['dom'], index: number): FormNode | undefined => dom.root.childrenOfClass('pageSet')[0]?.childrenOfClass('pageArea')[index];
  const withHiddenField = (name: string): string => `<pageArea name="${name}" id="${name}"><contentArea x="0pt" y="0pt" w="200pt" h="100pt"/><medium short="220pt" long="300pt"/><field name="Hid" presence="hidden"><ui><textEdit/></ui><bind match="none"/></field></pageArea>`;

  it('are the layout\'s output: they do not ask for another layout, where a write to the body does', () => {
    const set = `<pageSet>${withHiddenField('A')}${withHiddenField('B')}</pageSet>`;
    const built = pages(part('p1') + part('p2'), set);
    let layouts = 0;
    let nth = 0;
    const made = new LayoutSession({ dom: built.dom, model: built.dom.model, fonts: { faces: [], issues: [] }, maxPasses: 3 });
    made.bind({
      engine: {
        runLayoutReady: (page) => {
          nth += 1;
          if (page === undefined) return 0;
          const hid = page.children.find((c) => c.name === 'Hid');
          if (hid !== undefined) hid.rawValue = `page ${nth}`;
          return 1;
        },
      },
      sandbox: {
        withinRunBudget: (run) => {
          layouts += 1;
          return run();
        },
      },
    });
    made.settle();
    // One pagination, then one master page laid out per page instance: nothing was paginated twice.
    expect(layouts).toBe(1 + 2);
    expect(made.current?.passes).toBe(1);
    const values = made.current?.masterValues.map((m) => [...m.values()]);
    expect(values).toEqual([['page 2'], ['page 3']]);
    expect(area(built.dom, 0)).toBeDefined();
    // A later settle, after a write to the body, costs the same.
    layouts = 0;
    nth = 0;
    at(built.dom, 'p1.p1b').setAttr('w', '60pt');
    made.settle();
    expect(layouts).toBe(1 + 2);
  });
});

describe('xfa.layout answers', () => {
  it('the page of the first box of a body node, 0 for a node with no box, and the first instance of its page area for a master-page node', () => {
    const hidden = '<subform name="gone" presence="hidden" layout="tb" w="10pt"><field name="g" w="5pt" h="5pt"><ui><textEdit/></ui></field></subform>';
    const { session: made, dom } = session(hidden + part('p1') + part('p2') + part('p3'));
    made.settle();
    expect(made.pageCount()).toBe(3);
    expect([at(dom, 'p1'), at(dom, 'p2.p2b'), at(dom, 'p3')].map((n) => made.page(n))).toEqual([1, 2, 3]);
    expect(made.page(at(dom, 'gone'))).toBe(0);
    const area = dom.root.childrenOfClass('pageSet')[0]?.childrenOfClass('pageArea')[1];
    expect(area).toBeDefined();
    if (area !== undefined) expect(made.page(area)).toBe(2);
  });

  it('is 0 / 0 before the first layout', () => {
    const { session: made, dom } = session(part('p1'));
    expect([made.page(at(dom, 'p1')), made.pageCount()]).toEqual([0, 0]);
  });
});

describe('a layout the layout layer refuses', () => {
  it('is a form with no pages and one issue naming why; the run goes on and the refusal is not repeated until the form changes', () => {
    let calls = 0;
    const { session: made, dom } = session(part('p1'), {
      sandbox: {
        withinRunBudget: () => {
          calls += 1;
          throw new XfaLayoutError('LAYOUT_UNSUPPORTED', 'unit not supported (3px)');
        },
      },
    });
    expect(made.settle().scripts).toBe(0);
    const laid = made.current;
    expect(laid?.pages).toEqual([]);
    expect(laid?.issues.map((i) => i.feature)).toEqual(['layout failed (LAYOUT_UNSUPPORTED: unit not supported (3px)); the form has no pages']);
    expect(laid?.settled).toBe(true);
    expect(made.pageCount()).toBe(0);
    made.settle();
    expect(calls).toBe(1);
    at(dom, 'p1.p1b').setAttr('h', '25pt');
    made.settle();
    expect(calls).toBe(2);
  });

  it('a form-size LIMIT of the DOM during layout ends the run as the same SCRIPT_LIMIT a script that hit it gets', () => {
    const { session: made } = session(part('p1'), {
      sandbox: {
        withinRunBudget: () => {
          throw new XfaFormError('LIMIT', 'more than 5 nodes in one form');
        },
      },
    });
    const error = thrown(() => made.settle());
    expect(error).toBeInstanceOf(XfaScriptError);
    expect(error).toMatchObject({ code: 'SCRIPT_LIMIT', limit: 'form-size' });
  });

  it('anything else is a bug or a run-budget limit and propagates unchanged', () => {
    const { session: made } = session(part('p1'), {
      sandbox: {
        withinRunBudget: () => {
          throw new Error('boom');
        },
      },
    });
    expect(thrown(() => made.settle())).toMatchObject({ message: 'boom' });
  });
});

describe('release', () => {
  it('frees the layout and what is built from it: nothing is answered afterwards, and a later settle makes the layout again', () => {
    const { session: made, dom } = session(part('p1') + part('p2'));
    made.settle();
    expect(made.page(at(dom, 'p2'))).toBe(2);
    made.release();
    expect(made.current).toBeUndefined();
    expect([made.page(at(dom, 'p2')), made.pageCount(), made.isCurrent]).toEqual([0, 0, false]);
    made.settle();
    expect(made.page(at(dom, 'p2'))).toBe(2);
  });

  it('a disposed runtime holds no layout', async () => {
    const runtime = await makeRuntime(part('p1'), { rootAttrs: 'layout="tb"' });
    runtime.load();
    runtime.dispose();
    expect(thrown(() => layoutAccessOf(runtime).layout())).toMatchObject({ code: 'DISPOSED' });
  });
});

describe('the fonts the layout measures with', () => {
  const pdfWith = (fonts: () => ReturnType<XfaPdf['fonts']>): XfaPdf => ({ fonts }) as unknown as XfaPdf;

  it('a document with no embedded fonts has no faces and no issues', async () => {
    expect(await readLayoutFonts(pdfWith(() => Promise.resolve({ fonts: [], issues: [] })))).toEqual({ faces: [], issues: [] });
  });

  it('fonts the engine refuses cost the layout its embedded faces, not the run: no faces and one issue naming the code', async () => {
    const refused = await readLayoutFonts(pdfWith(() => Promise.reject(new XfaPdfError('MALFORMED', 'damaged /FontDescriptor'))));
    expect(refused).toEqual({ faces: [], issues: ['font.resources.unreadable.MALFORMED'] });
  });

  it('every runtime over one document shares one parse of its fonts: the same faces object', async () => {
    const embedded = { fonts: [], issues: ['font.resources: more than 64 embedded fonts (the first 64 are listed)'] };
    let reads = 0;
    const pdf = pdfWith(() => {
      reads += 1;
      return Promise.resolve(embedded);
    });
    const first = await readLayoutFonts(pdf);
    const second = await readLayoutFonts(pdf);
    expect(second).toBe(first);
    expect(first.issues).toEqual(embedded.issues);
    expect(reads).toBe(2);
  });

  it('a failure that is not a typed refusal of the document is not swallowed', async () => {
    await expect(readLayoutFonts(pdfWith(() => Promise.reject(new Error('disk gone'))))).rejects.toThrow('disk gone');
  });
});
