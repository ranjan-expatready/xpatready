import { describe, expect, it } from 'vitest';
import type { FormRuntime } from '../../runtime/options.js';
import { must } from '../../model/template/__tests__/helpers.js';
import { createFormRuntime } from '../../runtime/runtime.js';
import { loadPack } from '../fixtures/form-data/apply.js';
import { corpusPdf, FORM_CASES, NOON_UTC, TEST_HOST, type FormCase } from './form-cases.js';

/** A loaded, strict runtime over the blank form that the caller disposes (the shared `blankSession` keeps every runtime alive until the file ends, which 80 sessions cannot afford). */
async function strictSession(c: FormCase): Promise<{ runtime: FormRuntime; pack: ReturnType<typeof loadPack> }> {
  const runtime = await createFormRuntime(await corpusPdf(c.file), { host: TEST_HOST, clock: { now: () => NOON_UTC }, strict: true });
  runtime.load();
  return { runtime, pack: loadPack(c.form) };
}

/** Every container below `som`, depth first (the forms nest subforms and exclusion groups). */
function groupsOf(runtime: FormRuntime, som: string): string[] {
  const found: string[] = [];
  for (const child of runtime.children(som)) {
    const cls = String(runtime.getProperty(child, 'className'));
    if (cls === 'exclGroup') found.push(child);
    if (cls === 'subform' || cls === 'exclGroup') found.push(...groupsOf(runtime, child));
  }
  return found.filter((g, i, all) => all.indexOf(g) === i && String(runtime.getProperty(g, 'className')) === 'exclGroup');
}

/** What a radio button writes to its group when chosen: the text of its first item (`Y`, `N`, ...). */
function onValue(runtime: FormRuntime, radio: string): string {
  const items = must(runtime.children(radio, 'items')[0], 'radio items');
  const text = must(runtime.children(items)[0], 'radio item');
  return String(runtime.getValue(text));
}

interface Click {
  readonly group: string;
  readonly radio: string;
  readonly label: string;
}

async function clicksOf(c: FormCase): Promise<Click[]> {
  const { runtime } = await strictSession(c);
  const root = must(runtime.children('xfa[0].form[0]')[0], 'root subform');
  const clicks = groupsOf(runtime, root).flatMap((group) =>
    runtime.children(group, 'field').map((radio) => ({ group, radio, label: `${group.split('.').slice(-1)[0]}.${String(runtime.getProperty(radio, 'name'))}` })),
  );
  runtime.dispose();
  return clicks;
}

describe.each(FORM_CASES)('radio buttons and the Clear button on real form $file, strict mode', (c) => {
  it('finds the form\'s radio buttons (a form without any would make the checks below vacuous)', async () => {
    const clicks = await clicksOf(c);
    expect(clicks.length).toBeGreaterThanOrEqual(2 * 10);
    expect(clicks.some((k) => k.radio.endsWith('No[0]'))).toBe(true);
    expect(clicks.some((k) => k.radio.endsWith('Yes[0]'))).toBe(true);
  });

  it('clicking every radio button, Yes and No alike, runs without a script error and without one unsupported entry', async () => {
    for (const click of await clicksOf(c)) {
      const { runtime } = await strictSession(c);
      try {
        runtime.setValue(click.group, onValue(runtime, click.radio));
        runtime.event(click.radio, 'click');
        expect(runtime.state, click.label).toBe('loaded');
        expect(runtime.unsupported, click.label).toEqual([]);
      } finally {
        runtime.dispose();
      }
    }
  });

  it('clicking Clear runs to the end, asks for confirmation and reports completion; the write of the actual number to a container is a note, never an unsupported member', async () => {
    const { runtime, pack } = await strictSession(c);
    const clear = pack.validateButton.replace('[0]', '[1]');
    const result = runtime.event(clear, 'click');
    expect(result.scriptsRun).toBeGreaterThan(0);
    expect(runtime.state).toBe('loaded');
    expect(runtime.messages).toHaveLength(2);
    expect(runtime.messages[0]).toMatchObject({ icon: 2, buttons: 1, event: 'click' });
    expect(runtime.unsupported).toEqual([]);
    expect(runtime.notes).toContainEqual({ class: 'subform', member: 'ActualNumber' });
    runtime.dispose();
  });

  it('after Clear the form still validates as incomplete from the first field, so the container write changed nothing a later step reads', async () => {
    const { runtime, pack } = await strictSession(c);
    runtime.event(pack.validateButton.replace('[0]', '[1]'), 'click');
    const result = runtime.validate(pack);
    expect(result.complete).toBe(false);
    runtime.dispose();
  });
});
