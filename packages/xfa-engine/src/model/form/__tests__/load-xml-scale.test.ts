import { describe, expect, it } from 'vitest';
import type { Document, Element } from '@xmldom/xmldom';
import { parseXml } from '../../../xml/parse.js';
import { MAX_LOADED_ELEMENTS } from '../limits.js';
import { at, build, dataText, must, textField } from './helpers.js';

/** Just under the 200,000-element ceiling of one parsed document, which the datasets themselves must still fit in. */
const WIDE = MAX_LOADED_ELEMENTS - 1_000;

const kids = (n: number, name = 'I'): string => `<${name}>x</${name}>`.repeat(n);

describe('loadXML overwrite detaches the old children in one pass (N7)', () => {
  it('overwriting a node of 20,000 children takes well under a second (it took 5 s)', () => {
    const { dom } = build(textField('F'), '<form1><F/></form1>', `<LOVFile>${kids(20_000)}</LOVFile>`);
    const file = must(dom.datasets.child('LOVFile'));
    const started = performance.now();
    dom.call(file, 'loadXML', ['<LOV><L/></LOV>', 0, 1]);
    expect(performance.now() - started).toBeLessThan(1_000);
    expect(file.children.map((c) => c.name)).toEqual(['LOV']);
  }, 120_000);

  it('overwriting a node of 199,000 children completes in under 3 seconds (each removed child used to re-index the whole list: a tenth of that size took 5 s, the full size over 15 minutes)', () => {
    const { dom } = build(textField('F'), '<form1><F/></form1>', `<LOVFile>${kids(WIDE)}</LOVFile>`);
    const file = must(dom.datasets.child('LOVFile'));
    expect(file.children).toHaveLength(WIDE);
    const started = performance.now();
    dom.call(file, 'loadXML', ['<LOV><L/></LOV>', 0, 1]);
    const elapsed = performance.now() - started;
    expect(elapsed).toBeLessThan(3_000);
    expect(file.children.map((c) => c.name)).toEqual(['LOV']);
  }, 120_000);

  it('the same holds for a wide node inside the form data, where the removed nodes are checked against the form bindings', () => {
    const body = `${textField('F')}<subform name="Big"><field name="K"><ui><textEdit/></ui></field></subform>`;
    const { dom } = build(body, `<form1><F>v</F><Big>${kids(WIDE)}</Big></form1>`);
    const big = must(dom.data.child('form1')?.child('Big'));
    const merges = dom.mergeCount;
    const started = performance.now();
    dom.call(big, 'loadXML', ['<w><K>new</K></w>', 1, 1]);
    const elapsed = performance.now() - started;
    expect(elapsed).toBeLessThan(3_000);
    expect(big.children.map((c) => c.name)).toEqual(['K']);
    // K was bound to a removed node, so the form re-merges (F3) and K rebinds to the loaded node.
    expect(dom.mergeCount).toBe(merges + 1);
    expect(at(dom, 'Big.K').rawValue).toBe('new');
    expect(at(dom, 'F').rawValue).toBe('v');
  }, 120_000);

  it('a form with thousands of bound fields and a 199,000-child overwrite elsewhere in the data is not quadratic in fields times removed nodes', () => {
    const FIELDS = 3_000;
    const body = Array.from({ length: FIELDS }, (_, i) => textField(`f${i}`)).join('');
    const { dom } = build(body, `<form1/><Other>${kids(WIDE)}</Other>`);
    const other = must(dom.data.child('Other'));
    const merges = dom.mergeCount;
    const started = performance.now();
    dom.call(other, 'loadXML', ['<w><Z/></w>', 1, 1]);
    const elapsed = performance.now() - started;
    expect(elapsed).toBeLessThan(3_000);
    expect(dom.mergeCount).toBe(merges);
    expect(other.children.map((c) => c.name)).toEqual(['Z']);
  }, 120_000);

  it('the target keeps its identity: the same wrapper, the same element in the document, with its attributes', () => {
    const { dom, datasets } = build(textField('F'), '<form1><F/></form1>', `<LOVFile a="1">${kids(3_000)}</LOVFile>`);
    const file = must(dom.datasets.child('LOVFile'));
    const element = file.element as Element;
    dom.call(file, 'loadXML', ['<n/>', 0, 1]);
    expect(dom.datasets.child('LOVFile')).toBe(file);
    expect(file.element).toBe(element);
    expect(element.parentNode).toBe(datasets.documentElement);
    expect(element.getAttribute('a')).toBe('1');
    expect(dataText(datasets)).toContain('<LOVFile a="1"><n/></LOVFile>');
  });
});

describe('the xmldom tree stays consistent after a bulk detach (N7)', () => {
  function bulk(): { datasets: Document; file: Element; old: Element[]; dom: ReturnType<typeof build>['dom'] } {
    const lov = `<LOVFile xfa:dataNode="dataGroup">text${Array.from({ length: 2_500 }, (_, i) => `<I n="${i}">v</I>`).join('<!--c-->')}tail</LOVFile>`;
    const { dom, datasets } = build(textField('F'), '<form1><F/></form1>', lov);
    const file = must(dom.datasets.child('LOVFile')).element as Element;
    const old = Array.from(file.getElementsByTagName('I'));
    return { datasets, file, old, dom };
  }

  it('the old children (elements, text and comments) are fully unlinked, the live lists are updated and the node can be appended to and removed from again', () => {
    const { datasets, file, old, dom } = bulk();
    expect(old).toHaveLength(2_500);
    const live = file.getElementsByTagName('I');
    const before = file.childNodes.length;
    expect(before).toBeGreaterThan(2_500);
    const first = file.firstChild;
    const last = file.lastChild;
    dom.call(must(dom.datasets.child('LOVFile')), 'loadXML', ['<w><a/><b/></w>', 1, 1]);
    expect([file.firstChild?.nodeName, file.lastChild?.nodeName]).toEqual(['a', 'b']);
    expect(file.childNodes.length).toBe(2);
    expect(Object.keys(file.childNodes).filter((k) => /^\d+$/.test(k))).toEqual(['0', '1']);
    expect(file.childNodes.item(2)).toBeNull();
    expect(live.length).toBe(0);
    expect(file.getElementsByTagName('I').length).toBe(0);
    for (const gone of [...old, first, last]) {
      expect(gone?.parentNode).toBeNull();
      expect(gone?.previousSibling).toBeNull();
      expect(gone?.nextSibling).toBeNull();
    }
    expect(file.firstChild?.previousSibling).toBeNull();
    expect(file.lastChild?.nextSibling).toBeNull();
    file.appendChild(datasets.createElement('c'));
    file.removeChild(must(file.firstChild));
    expect(Array.from(file.childNodes, (n) => n.nodeName)).toEqual(['b', 'c']);
    expect(dataText(datasets)).toContain('<LOVFile xfa:dataNode="dataGroup"><b/><c/></LOVFile>');
  });

  it('overwriting with nothing to import leaves an empty node, and overwriting an already empty node is a no-op that still works', () => {
    const { datasets, file, dom } = bulk();
    const node = must(dom.datasets.child('LOVFile'));
    dom.call(node, 'loadXML', ['<w/>', 1, 1]);
    expect(file.firstChild).toBeNull();
    expect(file.lastChild).toBeNull();
    expect(file.childNodes.length).toBe(0);
    dom.call(node, 'loadXML', ['<w/>', 1, 1]);
    dom.call(node, 'loadXML', ['<w><q/></w>', 1, 1]);
    expect(dataText(datasets)).toContain('<LOVFile xfa:dataNode="dataGroup"><q/></LOVFile>');
    expect(parseXml(dataText(datasets)).documentElement).not.toBeNull();
  });
});

describe('what the overwrite triggers is unchanged (N7)', () => {
  const body = `${textField('F')}<subform name="Big"><field name="K"><ui><textEdit/></ui></field></subform>`;

  it('a bound field below the overwritten node re-merges the form, and the field rebinds to the loaded data', () => {
    const { dom } = build(body, `<form1><F>keep</F><Big><K>old</K>${kids(4_000)}</Big></form1>`);
    const big = must(dom.data.child('form1')?.child('Big'));
    const merges = dom.mergeCount;
    dom.call(big, 'loadXML', ['<w><K>fresh</K></w>', 1, 1]);
    expect(dom.mergeCount).toBe(merges + 1);
    expect(at(dom, 'Big.K').rawValue).toBe('fresh');
    expect(at(dom, 'F').rawValue).toBe('keep');
  });

  it('overwriting the datasets root re-merges when it removes xfa:data, and not when only the list of values is replaced', () => {
    const { dom } = build(textField('F'), '<form1><F>v</F></form1>', `<LOVFile>${kids(4_000)}</LOVFile>`);
    const merges = dom.mergeCount;
    dom.call(must(dom.datasets.child('LOVFile')), 'loadXML', ['<n/>', 0, 1]);
    expect(dom.mergeCount).toBe(merges);
    dom.call(dom.datasets, 'loadXML', ['<empty/>', 1, 1]);
    expect(dom.mergeCount).toBe(merges + 1);
  });

  it('a refused load (rich text, budget) removes nothing', () => {
    const { dom } = build(body, `<form1><F/><Big>${kids(3_000)}</Big></form1>`);
    const big = must(dom.data.child('form1')?.child('Big'));
    const before = big.children.length;
    expect(before).toBeGreaterThanOrEqual(3_000);
    expect(() => dom.call(big, 'loadXML', [`<w xmlns:xfa="http://www.xfa.org/schema/xfa-data/1.0/"><K xfa:contentType="text/html"/></w>`, 1, 1])).toThrow();
    expect(big.children).toHaveLength(before);
  });

  it('the loaded elements are still charged, so a loop of overwrites hits the ceiling and the refused load removes nothing', () => {
    const { dom } = build(body, `<form1><F/><Big>${kids(10)}</Big></form1>`);
    const big = must(dom.data.child('form1')?.child('Big'));
    for (let i = 0; i < 3; i += 1) dom.call(big, 'loadXML', [`<w>${kids(60_000, 'Z')}</w>`, 1, 0]);
    const before = big.children.length;
    expect(() => dom.call(big, 'loadXML', [`<w>${kids(60_000, 'Z')}</w>`, 1, 1])).toThrow(/elements loaded/);
    expect(big.children).toHaveLength(before);
  });
});
