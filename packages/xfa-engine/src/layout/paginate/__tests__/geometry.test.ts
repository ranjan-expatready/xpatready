import { describe, expect, it } from 'vitest';
import { layoutPages } from '../index.js';
import { geometryOf, sameGeometry } from '../geometry.js';
import { emptyTextContext } from '../../text/__tests__/helpers.js';
import { at } from '../../../model/form/__tests__/helpers.js';
import { block, pages, stackOf } from './helpers.js';

/** Whether two paginations of a form put every box in the same place: the runtime's test for a re-layout (W02-T09). */
describe('sameGeometry', () => {
  const body = block('a', 30) + stackOf('b', 2, 20) + block('c', 30);

  it('is true for two paginations of the same form, and for a text that changed what a box says but not where anything sits', () => {
    const r = pages(`<draw name="t" w="50pt" h="20pt"><value><text>one</text></value></draw>${body}`);
    const first = r.paged;
    const text = at(r.dom, 't').children.find((n) => n.className === 'value')?.children[0];
    expect(text).toBeDefined();
    text?.setPlainText('another');
    const second = layoutPages(r.dom, emptyTextContext());
    expect(sameGeometry(first, second)).toBe(true);
    expect(geometryOf(first)).toEqual(geometryOf(second));
  });

  it('is false when a box moves, when a box leaves the flow, and when a page break moves', () => {
    const r = pages(body);
    const base = r.paged;
    at(r.dom, 'a').setAttr('h', '35pt');
    expect(sameGeometry(base, layoutPages(r.dom, emptyTextContext()))).toBe(false);
    at(r.dom, 'a').setAttr('h', '30pt');
    expect(sameGeometry(base, layoutPages(r.dom, emptyTextContext()))).toBe(true);
    at(r.dom, 'c').presence = 'hidden';
    expect(sameGeometry(base, layoutPages(r.dom, emptyTextContext()))).toBe(false);
    at(r.dom, 'c').presence = 'visible';
    const pushed = pages(block('a', 60) + block('b', 60)).paged;
    const fits = pages(block('a', 30) + block('b', 30)).paged;
    expect(pushed.pages.length).not.toBe(fits.pages.length);
    expect(sameGeometry(pushed, fits)).toBe(false);
  });
});
