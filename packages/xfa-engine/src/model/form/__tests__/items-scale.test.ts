import { describe, expect, it } from 'vitest';
import { parseXml } from '../../../xml/parse.js';
import { loadTemplate } from '../../template/index.js';
import { tpl } from '../../template/__tests__/helpers.js';
import { createFormDom } from '../index.js';
import { MAX_ITEMS_PER_LIST } from '../limits.js';
import { at, build, datasetsXml, find } from './helpers.js';

const choice = (name: string, ref: string): string =>
  `<field name="${name}"><ui><choiceList/></ui><items/><items presence="hidden" save="1"/><bindItems ref="${ref}" labelRef="$" valueRef="$"/></field>`;

describe('clearing choice lists is linear in the list size (N6)', () => {
  it('4 fields of 100,000 generated items remerge 3 times in under 2 seconds in total (clearing used to move the array once per item: 2 fields took 11-20 s)', () => {
    const FIELDS = 4;
    const lov = `<LOV>${Array.from({ length: MAX_ITEMS_PER_LIST }, (_, i) => `<G>t${i}</G>`).join('')}</LOV>`;
    const body = Array.from({ length: FIELDS }, (_, i) => choice(`S${i}`, 'xfa.datasets.LOV.G[*]')).join('');
    const dom = createFormDom(loadTemplate(tpl(body)), parseXml(datasetsXml('<form1/>', lov)));
    const field = find(dom, 'field', 'S2');
    const [display, save] = field.childrenOfClass('items');
    const firstDisplayNode = display?.children[0];
    expect(display?.children).toHaveLength(MAX_ITEMS_PER_LIST);
    const started = performance.now();
    for (let round = 0; round < 3; round += 1) dom.remerge();
    const elapsed = performance.now() - started;
    expect(elapsed).toBeLessThan(2_000);
    expect(display?.children).toHaveLength(MAX_ITEMS_PER_LIST);
    expect(save?.children).toHaveLength(MAX_ITEMS_PER_LIST);
    expect(display?.children[MAX_ITEMS_PER_LIST - 1]?.plainText).toBe(`t${MAX_ITEMS_PER_LIST - 1}`);
    expect(firstDisplayNode?.parent).toBe(display);
  }, 120_000);

  it('clearItems on a 100,000-item field is linear too', () => {
    const { dom } = build(`<field name="Sel"><ui><choiceList/></ui><items/><items presence="hidden" save="1"/></field>`, '<form1><Sel/></form1>');
    const sel = at(dom, 'Sel');
    for (let i = 0; i < MAX_ITEMS_PER_LIST; i += 1) sel.addItem(`d${i}`, `v${i}`);
    const started = performance.now();
    sel.clearItems();
    const elapsed = performance.now() - started;
    expect(sel.childrenOfClass('items').map((b) => b.children.length)).toEqual([0, 0]);
    expect(elapsed).toBeLessThan(1_000);
    sel.addItem('again');
    expect(sel.childrenOfClass('items').map((b) => b.children.map((c) => c.plainText))).toEqual([['again'], ['again']]);
  }, 120_000);
});

describe('which item nodes are released and reused is unchanged by the one-pass clear (N6)', () => {
  const LOV = '<LOV><G>a</G><G>b</G><G>c</G></LOV>';
  const body = `${choice('Sel', 'xfa.datasets.LOV.G[*]')}`;

  it('clearGenerated removes only generated items, keeps written ones in order, and a refill takes the released nodes back last-released first', () => {
    const { dom } = build(body, '<form1/>', LOV);
    const sel = at(dom, 'Sel');
    sel.addItem('mine', 'm');
    const [display] = sel.childrenOfClass('items');
    const [a, b, c, mine] = display?.children ?? [];
    expect(display?.children.map((n) => n.plainText)).toEqual(['a', 'b', 'c', 'mine']);
    dom.remerge();
    expect(display?.children.map((n) => n.plainText)).toEqual(['mine', 'a', 'b', 'c']);
    expect(display?.children[0]).toBe(mine);
    expect([...(display?.children ?? [])].slice(1)).toEqual([c, b, a]);
    expect(a?.parent).toBe(display);
  });

  it('clearItems detaches every item (parent null) and addItem reuses the last released node first', () => {
    const { dom } = build(`<field name="Sel"><ui><choiceList/></ui><items/><items presence="hidden" save="1"/></field>`, '<form1><Sel/></form1>');
    const sel = at(dom, 'Sel');
    sel.addItem('x');
    sel.addItem('y');
    const [display] = sel.childrenOfClass('items');
    const [x, y] = display?.children ?? [];
    sel.clearItems();
    expect(display?.children).toHaveLength(0);
    expect([x?.parent, y?.parent]).toEqual([null, null]);
    sel.addItem('z');
    expect(display?.children[0]).toBe(y);
    expect(display?.children[0]?.plainText).toBe('z');
  });
});
