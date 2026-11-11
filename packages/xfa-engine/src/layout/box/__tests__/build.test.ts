import { describe, expect, it } from 'vitest';
import { RENDER_TREE_VERSION, renderTreeSchema } from '../../render-tree.js';
import { MAX_BOX_DEPTH } from '../limits.js';
import { layoutBoxes } from '../build.js';
import type { LayoutBox } from '../types.js';
import { build, expectRect, field, find, ORIGIN, rect } from './helpers.js';

const sub = (attrs: string, children = ''): string => `<subform name="s" ${attrs}>${children}</subform>`;
const f = (name: string, attrs: string, children = ''): string => `<field name="${name}" ${attrs}><ui><textEdit/></ui>${children}</field>`;
const d = (name: string, attrs: string): string => `<draw name="${name}" ${attrs}/>`;

function laid(body: string, className = 'subform', name = 's', options?: Parameters<typeof layoutBoxes>[2]): ReturnType<typeof layoutBoxes> {
  return layoutBoxes(find(build(body).dom, className, name), ORIGIN, options);
}
const child = (box: LayoutBox, i: number): LayoutBox => {
  const c = box.children[i];
  if (c === undefined) throw new Error(`no child ${i}`);
  return c;
};

describe('layoutBoxes: nesting and margins', () => {
  it('places a child relative to the content region of its positioned parent (parent origin plus parent margin plus x, y)', () => {
    const { box } = laid(sub('x="10pt" y="20pt" w="100pt" h="80pt"', '<margin leftInset="5pt" topInset="4pt" rightInset="1pt" bottomInset="2pt"/>' + f('a', 'x="3pt" y="6pt" w="10pt" h="8pt"')));
    expectRect(box.rect, rect(10, 20, 100, 80));
    expectRect(box.contentRect, rect(15, 24, 94, 74));
    expectRect(child(box, 0).rect, rect(18, 30, 10, 8));
    expect(box.children).toHaveLength(1);
  });

  it('lays out subforms, exclGroups, fields and draws, and ignores properties and master-page elements', () => {
    const { box } = laid(
      sub(
        'x="0pt" y="0pt" w="100pt" h="100pt"',
        `<pageSet/><border/>${f('a', 'x="1pt" y="1pt" w="5pt" h="5pt"')}${d('b', 'x="2pt" y="2pt" w="5pt" h="5pt"')}<exclGroup name="g" x="3pt" y="3pt" w="9pt" h="9pt">${f('r', 'x="1pt" y="1pt" w="2pt" h="2pt"')}</exclGroup>`,
      ),
    );
    expect(box.children.map((c) => c.node.className)).toEqual(['field', 'draw', 'exclGroup']);
    expectRect(child(child(box, 2), 0).rect, rect(4, 4, 2, 2));
  });

  it('keeps the field border, the widget border and relevant on the box', () => {
    const { box } = laid(
      sub('w="50pt" h="50pt"', f('a', 'x="0pt" y="0pt" w="9pt" h="9pt" relevant="-print"', '<border><edge thickness="2pt"/></border>').replace('<textEdit/>', '<textEdit><border><edge thickness="1pt"/></border></textEdit>')),
    );
    const a = child(box, 0);
    expect(a.borderStyle?.edges[0]?.thicknessPt).toBe(2);
    expect(a.widgetBorderStyle?.edges[0]?.thicknessPt).toBe(1);
    expect(a.relevant).toBe('-print');
  });

  it('splits a field caption with the fixed reserve and hands an automatic one to the hook', () => {
    const body = sub('w="100pt" h="100pt"', f('a', 'x="10pt" y="10pt" w="60pt" h="20pt"', '<caption placement="left" reserve="15pt"/>') + f('b', 'x="10pt" y="40pt" w="60pt" h="20pt"', '<caption placement="top"/>'));
    const { box, issues } = laid(body, 'subform', 's', { captionReserve: () => 6 });
    expectRect(child(box, 0).captionRect, rect(10, 10, 15, 20));
    expectRect(child(box, 0).widgetRect, rect(25, 10, 45, 20));
    expectRect(child(box, 1).captionRect, rect(10, 40, 60, 6));
    expect(issues).toEqual([]);
  });

  it('without a hook, an automatic caption is reported and keeps no space', () => {
    const { box, issues } = laid(sub('w="100pt" h="100pt"', f('b', 'x="10pt" y="40pt" w="60pt" h="20pt"', '<caption placement="top"/>')));
    expect(child(box, 0).caption).toMatchObject({ auto: true, reservePt: 0 });
    expect(issues.map((i) => i.feature)).toEqual([expect.stringContaining('caption reserve is automatic')]);
  });
});

describe('layoutBoxes: presence', () => {
  const body = sub(
    'w="100pt" h="100pt"',
    f('v', 'x="0pt" y="0pt" w="5pt" h="5pt"') + f('i', 'x="0pt" y="10pt" w="5pt" h="5pt" presence="invisible"') + f('h', 'x="0pt" y="20pt" w="5pt" h="5pt" presence="hidden"'),
  );

  it('visible is drawn and takes space, invisible takes space without being drawn, hidden takes none', () => {
    const { box } = laid(body);
    expect(box.children.map((c) => [c.presence, c.occupiesSpace, c.drawn])).toEqual([
      ['visible', true, true],
      ['invisible', true, false],
      ['hidden', false, false],
    ]);
  });

  it('a hidden subform hides its whole subtree; an invisible one makes it invisible', () => {
    const hiddenParent = laid(sub('w="50pt" h="50pt" presence="hidden"', f('a', 'x="0pt" y="0pt" w="5pt" h="5pt"'))).box;
    expect(child(hiddenParent, 0)).toMatchObject({ presence: 'hidden', drawn: false, occupiesSpace: false });
    const invisibleParent = laid(sub('w="50pt" h="50pt" presence="invisible"', f('a', 'x="0pt" y="0pt" w="5pt" h="5pt"'))).box;
    expect(child(invisibleParent, 0)).toMatchObject({ presence: 'invisible', drawn: false, occupiesSpace: true });
  });

  it('keeps the geometry of an invisible or hidden box (its rectangle is still computed)', () => {
    const { box } = laid(body);
    expectRect(child(box, 2).rect, rect(0, 20, 5, 5));
  });
});

describe('layoutBoxes: the form DOM, not the template, is what is read (A3)', () => {
  it('sees a script-set h and a script-set presence', () => {
    const dom = build(sub('w="100pt" h="100pt"', f('a', 'x="5pt" y="5pt" w="10pt" h="10pt"'))).dom;
    const a = find(dom, 'field', 'a');
    a.setAttr('h', '33pt');
    a.setAttr('x', '8pt');
    a.presence = 'hidden';
    const { box } = layoutBoxes(find(dom, 'subform', 's'), ORIGIN);
    expectRect(child(box, 0).rect, rect(8, 5, 10, 33));
    expect(child(box, 0).presence).toBe('hidden');
  });
});

describe('layoutBoxes: growable position containers fit their children', () => {
  const grow = (attrs: string): string =>
    sub(attrs, '<margin leftInset="2pt" topInset="2pt" rightInset="2pt" bottomInset="2pt"/>' + f('a', 'x="10pt" y="5pt" w="20pt" h="10pt"') + f('b', 'x="40pt" y="30pt" w="5pt" h="5pt"') + f('h', 'x="400pt" y="400pt" w="5pt" h="5pt" presence="hidden"'));

  it('a subform with no w or h takes the bounding box of the children that take space, plus its insets', () => {
    const { box } = laid(grow('x="100pt" y="100pt"'));
    expectRect(box.rect, rect(100, 100, 49, 39));
    expect(box).toMatchObject({ growableWidth: true, growableHeight: true });
    expectRect(child(box, 0).rect, rect(112, 107, 20, 10));
  });

  it('a given width stays; a minH is not a floor for a container (pdf.js bbox, and the page-count oracle of W02-T08)', () => {
    const { box } = laid(grow('x="0pt" y="0pt" w="80pt" minH="60pt"'));
    expectRect(box.rect, rect(0, 0, 80, 39));
  });

  it('the anchor uses the grown size, and the children follow the final position', () => {
    const { box } = laid(grow('x="100pt" y="100pt" anchorType="middleCenter"'));
    expectRect(box.rect, rect(75.5, 80.5, 49, 39));
    expectRect(child(box, 0).rect, rect(87.5, 87.5, 20, 10));
  });

  it('a container with no children is as large as its floors', () => {
    expectRect(laid(sub('x="1pt" y="1pt" minW="7pt"')).box.rect, rect(1, 1, 7, 0));
  });
});

describe('layoutBoxes: a growable exclGroup with a caption (the caption strip is part of its size)', () => {
  const group = (caption: string): string => sub('w="200pt" h="200pt"', `<exclGroup name="g" x="0pt" y="0pt">${caption}${f('a', 'x="0pt" y="0pt" w="10pt" h="10pt"')}</exclGroup>`);
  const grown = (caption: string): LayoutBox => child(laid(group(caption)).box, 0);

  it('left: the box is wider by the reserve and the child sits after the strip', () => {
    const g = grown('<caption placement="left" reserve="20pt"/>');
    expectRect(g.rect, rect(0, 0, 30, 10));
    expectRect(g.captionRect, rect(0, 0, 20, 10));
    expectRect(child(g, 0).rect, rect(20, 0, 10, 10));
  });

  it('right: the strip is after the child', () => {
    const g = grown('<caption placement="right" reserve="20pt"/>');
    expectRect(g.rect, rect(0, 0, 30, 10));
    expectRect(g.captionRect, rect(10, 0, 20, 10));
    expectRect(child(g, 0).rect, rect(0, 0, 10, 10));
  });

  it('top: the box is taller by the reserve and the child sits below the strip', () => {
    const g = grown('<caption placement="top" reserve="8pt"/>');
    expectRect(g.rect, rect(0, 0, 10, 18));
    expectRect(child(g, 0).rect, rect(0, 8, 10, 10));
  });

  it('bottom: the strip is below the child', () => {
    const g = grown('<caption placement="bottom" reserve="8pt"/>');
    expectRect(g.rect, rect(0, 0, 10, 18));
    expectRect(g.captionRect, rect(0, 10, 10, 8));
  });

  it('a hidden caption adds nothing, and no caption leaves the box as large as its children', () => {
    expectRect(grown('<caption placement="left" reserve="20pt" presence="hidden"/>').rect, rect(0, 0, 10, 10));
    expectRect(grown('').rect, rect(0, 0, 10, 10));
  });

  it('an automatic reserve adds nothing yet, is reported once, and the hook is consulted for the size when it answers', () => {
    const plain = laid(group('<caption placement="left"/>'));
    expectRect(child(plain.box, 0).rect, rect(0, 0, 10, 10));
    expect(plain.issues.filter((i) => i.feature.includes('caption reserve is automatic'))).toHaveLength(1);
    const hooked = laid(group('<caption placement="left"/>'), 'subform', 's', { captionReserve: () => 7 });
    expectRect(child(hooked.box, 0).rect, rect(0, 0, 17, 10));
    expect(hooked.issues).toEqual([]);
  });

  it('a hook whose answer depends on the region is asked once, so the strip is the room added for it and the child stays inside', () => {
    let calls = 0;
    const wrapToRegion = (_field: unknown, _placement: unknown, region: { readonly widthPt: number }): number => {
      calls += 1;
      return Math.min(50, region.widthPt);
    };
    const g = child(laid(group('<caption placement="left"/>'), 'subform', 's', { captionReserve: wrapToRegion }).box, 0);
    expect(calls).toBe(1);
    expectRect(g.rect, rect(0, 0, 20, 10));
    expectRect(g.captionRect, rect(0, 0, 10, 10));
    expectRect(child(g, 0).rect, rect(10, 0, 10, 10));
  });
});

describe('layoutBoxes: areas, inactive and print-only boxes', () => {
  it('boxes an area as a positioned group: it fits its children and carries them with it', () => {
    const { box } = laid(sub('w="100pt" h="100pt"', `<area name="ar" x="10pt" y="10pt">${f('a', 'x="5pt" y="5pt" w="10pt" h="10pt"')}</area>`));
    const area = child(box, 0);
    expect(area.node.className).toBe('area');
    expect(area.layoutMode).toBe('position');
    expectRect(area.rect, rect(10, 10, 15, 15));
    expectRect(child(area, 0).rect, rect(15, 15, 10, 10));
  });

  it('presence="inactive" takes no room and is not drawn, and passes that to its subtree', () => {
    const { box } = laid(sub('w="50pt" h="50pt"', `<subform name="i" x="0pt" y="0pt" w="9pt" h="9pt" presence="inactive">${f('a', 'x="0pt" y="0pt" w="5pt" h="5pt"')}</subform>`));
    expect(child(box, 0)).toMatchObject({ presence: 'inactive', occupiesSpace: false, drawn: false });
    expect(child(child(box, 0), 0)).toMatchObject({ presence: 'inactive', occupiesSpace: false, drawn: false });
  });

  it('relevant="print" is print-only: kept on the box, hidden on screen, no issue; -print stays drawn', () => {
    const { box, issues } = laid(sub('w="50pt" h="50pt"', f('p', 'x="0pt" y="0pt" w="5pt" h="5pt" relevant="print"') + f('n', 'x="0pt" y="10pt" w="5pt" h="5pt" relevant="-print"')));
    expect(child(box, 0)).toMatchObject({ relevant: 'print', presence: 'hidden', occupiesSpace: false, drawn: false });
    expect(child(box, 1)).toMatchObject({ relevant: '-print', presence: 'visible', drawn: true });
    expect(issues).toEqual([]);
  });

  it('a negative w is reported by the layout and the box is 0 wide', () => {
    const { box, issues } = laid(sub('w="50pt" h="50pt"', f('a', 'x="0pt" y="0pt" w="-5pt" h="5pt"')));
    expectRect(child(box, 0).rect, rect(0, 0, 0, 5));
    expect(issues.map((i) => i.feature)).toEqual(['w is negative (read as 0)']);
  });

  it('layout="rl-row" is an unsupported layout like lr-tb', () => {
    const { box, issues } = laid(sub('w="50pt" h="50pt" layout="rl-row"'));
    expect(box.placeholder).toContain('rl-row');
    expect(issues[0]?.feature).toContain('rl-row');
  });
});

describe('layoutBoxes: unsupported features are reported and drawn as placeholders (A4)', () => {
  const placeholder = (body: string, className = 'subform', name = 's'): { box: LayoutBox; features: string[] } => {
    const { box, issues } = laid(body, className, name);
    return { box, features: issues.map((i) => i.feature) };
  };

  it.each(['lr-tb', 'rl-tb'])('layout="%s" is a placeholder with no children and an issue naming the node', (mode) => {
    const body = sub(`x="5pt" y="5pt" w="50pt" h="50pt" layout="${mode}"`, f('a', 'w="5pt" h="5pt"'));
    const { box, issues } = laid(body);
    expect(box.placeholder).toContain(mode);
    expect(box.children).toEqual([]);
    expectRect(box.rect, rect(5, 5, 50, 50));
    expect(issues).toHaveLength(1);
    expect(issues[0]?.som).toBe('xfa[0].form[0].form1[0].s[0]');
    expect(issues[0]?.feature).toContain(mode);
  });

  it('colSpan other than 1', () => {
    const { box, features } = placeholder(sub('w="50pt" h="50pt"', f('a', 'x="0pt" y="0pt" w="5pt" h="5pt" colSpan="2"')));
    expect(child(box, 0).placeholder).toContain('colSpan');
    expect(features).toEqual([expect.stringContaining('colSpan')]);
  });

  it('colSpan="1" is the default and is fine', () => {
    expect(laid(sub('w="50pt" h="50pt"', f('a', 'x="0pt" y="0pt" w="5pt" h="5pt" colSpan="1"'))).issues).toEqual([]);
  });

  it('a comb field', () => {
    const body = sub('w="50pt" h="50pt"', '<field name="a" x="0pt" y="0pt" w="9pt" h="5pt"><ui><textEdit><comb numberOfCells="5"/></textEdit></ui></field>');
    const { box, features } = placeholder(body);
    expect(child(box, 0).placeholder).toContain('comb');
    expect(features).toEqual([expect.stringContaining('comb')]);
  });

  it('an overflow element', () => {
    const { box, features } = placeholder(sub('w="50pt" h="50pt"', '<overflow leader="x"/>'));
    expect(box.placeholder).toContain('overflow');
    expect(features).toEqual([expect.stringContaining('overflow')]);
  });

  it('a rotation that is not a multiple of 90, and a rotated container with children', () => {
    const odd = placeholder(sub('w="50pt" h="50pt"', f('a', 'x="0pt" y="0pt" w="5pt" h="5pt" rotate="45"')));
    expect(child(odd.box, 0).placeholder).toContain('rotate');
    const turned = placeholder(sub('w="50pt" h="50pt"', `<subform name="t" x="0pt" y="0pt" w="9pt" h="9pt" rotate="90">${f('a', 'x="0pt" y="0pt" w="5pt" h="5pt"')}</subform>`));
    expect(child(turned.box, 0).placeholder).toContain('rotate');
    expect(child(turned.box, 0).children).toEqual([]);
  });

  it('a length in an unsupported unit leaves a zero-size placeholder at the parent origin, with the attribute named', () => {
    const { box, features } = placeholder(sub('w="50pt" h="50pt"', f('a', 'x="3px" y="0pt" w="5pt" h="5pt"')));
    expectRect(child(box, 0).rect, rect(0, 0, 0, 0));
    expect(child(box, 0).placeholder).toContain('x:');
    expect(features).toEqual([expect.stringContaining('x:')]);
  });

  it('an unknown layout value', () => {
    const { box } = placeholder(sub('w="50pt" h="50pt" layout="sideways"'));
    expect(box.placeholder).toContain('layout');
  });

  it('the issues are accepted by the render tree schema', () => {
    const { issues } = laid(sub('w="50pt" h="50pt" layout="lr-tb"'));
    expect(renderTreeSchema.safeParse({ version: RENDER_TREE_VERSION, pages: [], resources: { fonts: [], images: [] }, issues }).success).toBe(true);
  });
});

describe('layoutBoxes: flowed layouts belong to W01-T07', () => {
  it.each(['tb', 'row', 'table'])('layout="%s": the container gets its own box, its children are left to the flow, and an issue says so', (mode) => {
    const { box, issues } = laid(sub(`x="5pt" y="5pt" w="50pt" h="50pt" layout="${mode}"`, f('a', 'w="5pt" h="5pt"')));
    expectRect(box.rect, rect(5, 5, 50, 50));
    expect(box.children).toEqual([]);
    expect(box.layoutMode).toBe(mode);
    expect(box.placeholder).toBeUndefined();
    expect(issues[0]?.feature).toContain(`layout="${mode}"`);
  });

  it('a positioned container has layoutMode position; a field has none', () => {
    const { box } = laid(sub('w="50pt" h="50pt"', f('a', 'x="0pt" y="0pt" w="5pt" h="5pt"')));
    expect(box.layoutMode).toBe('position');
    expect(child(box, 0).layoutMode).toBeUndefined();
  });
});

describe('layoutBoxes: hostile nesting', () => {
  it('stops at MAX_BOX_DEPTH with a placeholder and an issue instead of overflowing the stack', () => {
    const depth = MAX_BOX_DEPTH + 5;
    const body = `${'<subform name="n" w="10pt" h="10pt">'.repeat(depth)}${'</subform>'.repeat(depth)}`;
    const { box, issues } = laid(body, 'subform', 'n');
    let deepest = box;
    let levels = 0;
    while (deepest.children[0] !== undefined) {
      deepest = deepest.children[0];
      levels += 1;
    }
    expect(levels).toBe(MAX_BOX_DEPTH);
    expect(deepest.placeholder).toContain('nesting');
    expect(issues.some((i) => i.feature.includes('nesting'))).toBe(true);
  });
});

describe('layoutBoxes: a bare field', () => {
  it('can be laid out on its own', () => {
    const dom = build(field('x="4pt" y="5pt" w="6pt" h="7pt"')).dom;
    const { box } = layoutBoxes(find(dom, 'field', 'f'), rect(10, 10, 0, 0));
    expectRect(box.rect, rect(14, 15, 6, 7));
    expect(box.children).toEqual([]);
  });
});
