import { describe, expect, it } from 'vitest';
import { at, build, datasetsXml } from '../../form/__tests__/helpers.js';
import { FormNode } from '../../form/index.js';
import { resolveNode } from '../../som/index.js';
import { tpl } from '../../template/__tests__/helpers.js';
import { captureItemsBaseline, formChecksum, readSavedState, type SavedState } from '../index.js';
import { buildFormPacket, type PacketBudget } from '../serialize.js';

const enc = (s: string): Uint8Array => new TextEncoder().encode(s);

/** `Name[i]` chain from the root: `i` counts the siblings of the same class and name, which is how the reader (and Acrobat) match them. */
function label(root: FormNode, node: FormNode): string {
  const parts: string[] = [];
  for (let at_: FormNode | null = node; at_ !== null && at_ !== root && at_.parent !== null; at_ = at_.parent) {
    const same = at_.parent.children.filter((c) => c.className === at_?.className && c.name === at_?.name);
    parts.unshift(`${at_.name}[${same.indexOf(at_)}]`);
  }
  return parts.join('.');
}

interface Result {
  readonly form: string;
  readonly state: SavedState;
  readonly deltas: readonly (readonly [string, string, string])[];
}

/** Changes a form, writes the packet the engine would save, and reads it back against a fresh copy of the form. */
function roundTrip(body: string, change: (dom: ReturnType<typeof build>['dom']) => void, budget?: PacketBudget): Result {
  const { dom } = build(body);
  const baseline = captureItemsBaseline(dom);
  change(dom);
  const template = enc(tpl(body));
  const datasets = enc(datasetsXml('<form1/>'));
  const form = buildFormPacket(dom, formChecksum([template, datasets]), baseline, budget);
  const fresh = build(body).dom;
  const state = readSavedState(fresh, { template, datasets, form }, budget);
  return { form, state, deltas: state.deltas.map((d) => [label(fresh.root, d.container), d.target, d.savedValue] as const) };
}

function nodeAt(dom: ReturnType<typeof build>['dom'], path: string): FormNode {
  const found = resolveNode(dom.root, path);
  if (!(found instanceof FormNode)) throw new Error(`no form node ${path}`);
  return found;
}

const R = '<subform name="R"><field name="X"><ui><textEdit/></ui></field></subform>';
const THREE = R.repeat(3);
const PLACEHOLDER = '<subform name="R"\n/>';
const count = (text: string, part: string): number => text.split(part).length - 1;

describe('same-named siblings keep their position in the packet (L4-F2)', () => {
  it('only R[1] of three is dirty: the state comes back on R[1], not R[0]', () => {
    const { form, state, deltas } = roundTrip(THREE, (dom) => at(dom, 'R[1]').setAttr('presence', 'invisible'));
    expect(deltas).toEqual([['R[1]', 'presence', 'invisible']]);
    expect(state.summary).toEqual({ status: 'restorable', deltas: 1, skipped: 0 });
    // One placeholder for R[0] (an instance manager and a bare subform); nothing for R[2], which comes after the last one written.
    expect(count(form, PLACEHOLDER)).toBe(1);
    expect(count(form, '<instanceManager name="_R"\n/>')).toBe(2);
  });

  it('R[0] and R[2] are dirty and R[1] is clean: both land on their own node', () => {
    const { form, deltas, state } = roundTrip(THREE, (dom) => {
      at(dom, 'R[0]').setAttr('presence', 'hidden');
      at(dom, 'R[2]').setAttr('access', 'readOnly');
    });
    expect(deltas).toEqual([
      ['R[0]', 'presence', 'hidden'],
      ['R[2]', 'access', 'readOnly'],
    ]);
    expect(state.summary.skipped).toBe(0);
    expect(count(form, PLACEHOLDER)).toBe(1);
  });

  it('a dirty child below a clean-looking instance is placed on the right instance too', () => {
    const { deltas } = roundTrip(THREE, (dom) => at(dom, 'R[2].X').setAttr('presence', 'hidden'));
    expect(deltas).toEqual([['R[2].X[0]', 'presence', 'hidden']]);
  });

  it('writes no placeholder when no earlier sibling is skipped (the packet is as before)', () => {
    const { form } = roundTrip(THREE, (dom) => {
      at(dom, 'R[0]').setAttr('presence', 'hidden');
      at(dom, 'R[1]').setAttr('presence', 'hidden');
    });
    expect(form).not.toContain(PLACEHOLDER);
    expect(roundTrip(THREE, (dom) => at(dom, 'R[0]').setAttr('presence', 'hidden')).form).not.toContain(PLACEHOLDER);
  });

  it('fields and other containers of the same name are positioned the same way', () => {
    const body = '<field name="F"><ui><textEdit/></ui></field>'.repeat(3);
    const { deltas, state } = roundTrip(body, (dom) => at(dom, 'F[2]').setAttr('access', 'protected'));
    expect(deltas).toEqual([['F[2]', 'access', 'protected']]);
    expect(state.summary.skipped).toBe(0);
  });

  it('a second variables block is matched to the second block when the first is clean', () => {
    const body = '<variables><text name="a">1</text></variables><variables><text name="b">2</text></variables>' + THREE;
    const { form, deltas, state } = roundTrip(body, (dom) => {
      nodeAt(dom, 'b').setPlainText('changed');
    });
    expect(deltas).toEqual([['', 'b', 'changed']]);
    expect(state.summary.skipped).toBe(0);
    expect(form).toContain('<variables\n/>');
  });

  it('a variables block taken back for want of delta budget leaves a placeholder for the block after it', () => {
    const body =
      '<variables><text name="a">1</text><text name="b">2</text></variables><variables><text name="c">3</text></variables>' + THREE;
    const change = (dom: ReturnType<typeof build>['dom']): void => {
      for (const [name, value] of [['a', 'A'], ['b', 'B'], ['c', 'C']] as const) {
        nodeAt(dom, name).setPlainText(value);
      }
    };
    // The first block makes two deltas and does not fit in one; the second makes one and does.
    const { deltas, state } = roundTrip(body, change, { maxDeltas: 1 });
    expect(deltas).toEqual([['', 'c', 'C']]);
    expect(state.summary.skipped).toBe(0);
  });
});

describe('a unit left out for want of budget still holds its place (L4-F2)', () => {
  // R[0] holds a changed caption (3 elements) in a field that has nothing else to say: when the caption does not fit,
  // the field and the instance are empty shells and are taken back. R[1] and R[2] are 2 elements each.
  const CAPTIONED = '<subform name="R"><field name="X"><ui><textEdit/></ui><caption><value><text>c</text></value></caption></field></subform>';
  const body = CAPTIONED.repeat(3);
  const change = (dom: ReturnType<typeof build>['dom']): void => {
    nodeAt(dom, 'R[0].X.caption.value.text').setPlainText('changed');
    at(dom, 'R[1]').setAttr('presence', 'invisible');
    at(dom, 'R[2]').setAttr('access', 'readOnly');
  };

  it('R[0] is taken back for want of elements and R[1] with its placeholder fits: the state comes back on R[1]', () => {
    // Root (1) + R[0] (2) + field (1) + caption (3) is 7; root (1) + placeholder (2) + R[1] (2) is exactly 5; R[2] (2 more) is not.
    const { deltas, state } = roundTrip(body, change, { maxElements: 5 });
    expect(deltas).toEqual([['R[1]', 'presence', 'invisible']]);
    expect(state.summary).toEqual({ status: 'restorable', deltas: 1, skipped: 0 });
  });

  it('when even the placeholder does not fit, the later instances are left out rather than written in the wrong place', () => {
    const { deltas, state } = roundTrip(body, change, { maxElements: 4 });
    expect(deltas).toEqual([]);
    expect(state.summary).toEqual({ status: 'restorable', deltas: 0, skipped: 0 });
  });

  it('with room for all of it, all of it comes back on its own node', () => {
    const { deltas } = roundTrip(body, change);
    expect(deltas).toEqual([
      ['R[0].X[0]', 'caption.value.text', 'changed'],
      ['R[1]', 'presence', 'invisible'],
      ['R[2]', 'access', 'readOnly'],
    ]);
  });

  it('R[0] does not fit for want of deltas, R[1] does: the state comes back on R[1]', () => {
    const twoAttributes = (dom: ReturnType<typeof build>['dom']): void => {
      at(dom, 'R[0]').setAttr('presence', 'hidden');
      at(dom, 'R[0]').setAttr('access', 'readOnly');
      at(dom, 'R[1]').setAttr('presence', 'invisible');
    };
    const { deltas, state } = roundTrip(body, twoAttributes, { maxDeltas: 1 });
    expect(deltas).toEqual([['R[1]', 'presence', 'invisible']]);
    expect(state.summary.skipped).toBe(0);
  });

  it('whatever budget the writer is held to, every delta it writes lands on the node it came from', () => {
    const expected = new Set(['R[0].X[0]|caption.value.text|changed', 'R[1]|presence|invisible', 'R[2]|access|readOnly']);
    for (let maxElements = 0; maxElements <= 14; maxElements += 1) {
      for (let maxDeltas = 0; maxDeltas <= 4; maxDeltas += 1) {
        const { deltas, state } = roundTrip(body, change, { maxElements, maxDeltas });
        expect(state.summary.skipped, `${maxElements}/${maxDeltas}`).toBe(0);
        for (const [where, target, value] of deltas) expect(expected, `${maxElements}/${maxDeltas}`).toContain(`${where}|${target}|${value}`);
      }
    }
  });
});

/** mulberry32: a small seeded generator, so a failing pattern can be replayed. */
function random(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('every delta lands on its original node, over random patterns of dirty instances (L4-F2)', () => {
  const PRESENCE = ['hidden', 'invisible', 'inactive'] as const;

  it('3 to 5 instances of one name, mixed with another name, any subset dirty, at any budget', () => {
    for (let seed = 1; seed <= 150; seed += 1) {
      const next = random(seed);
      const pick = (n: number): number => Math.floor(next() * n);
      // A random order of R and S instances (3-5 of each), each holding a field of the same name, so the groups interleave.
      const names = [...Array<string>(3 + pick(3)).fill('R'), ...Array<string>(2 + pick(3)).fill('S')].sort(() => next() - 0.5);
      const body = names.map((n) => `<subform name="${n}"><field name="X"><ui><textEdit/></ui></field></subform>`).join('');
      // The pattern is drawn once, so every budget below changes the same form.
      const plan: { path: string; attr: string; value: string }[] = [];
      const seen = new Map<string, number>();
      for (const name of names) {
        const index = seen.get(name) ?? 0;
        seen.set(name, index + 1);
        if (pick(3) !== 0) plan.push({ path: `${name}[${index}]`, attr: 'presence', value: PRESENCE[pick(PRESENCE.length)] ?? 'hidden' });
        if (pick(4) === 0) plan.push({ path: `${name}[${index}].X`, attr: 'access', value: 'readOnly' });
      }
      const change = (dom: ReturnType<typeof build>['dom']): void => {
        for (const p of plan) at(dom, p.path).setAttr(p.attr, p.value);
      };
      const expected = plan.map((p) => `${p.path.replace(/\.X$/, '.X[0]')}|${p.attr}|${p.value}`);

      const full = roundTrip(body, change);
      expect(full.state.summary.skipped, `seed ${seed}`).toBe(0);
      expect(full.deltas.map(([w, t, v]) => `${w}|${t}|${v}`).sort(), `seed ${seed}`).toEqual([...expected].sort());

      // A tight budget may drop instances, never move one.
      const maxElements = pick(expected.length * 3 + 2);
      const tight = roundTrip(body, change, { maxElements });
      expect(tight.state.summary.skipped, `seed ${seed} at ${maxElements}`).toBe(0);
      for (const [w, t, v] of tight.deltas) expect(expected, `seed ${seed} at ${maxElements}`).toContain(`${w}|${t}|${v}`);
    }
  });
});
