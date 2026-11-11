import { describe, expect, it } from 'vitest';
import type { FormRuntime } from '../options.js';
import { loaded, onEvent } from './helpers.js';

/** E11: effective access (own and ancestors', most restrictive) in problems(), the render tree and the user-action check. */

const ROOT = 'xfa[0].form[0].form1[0]';
const box = (name: string, y: number, attrs = '', inner = '<ui><textEdit/></ui>', extra = ''): string => `<field name="${name}" w="100pt" h="20pt" y="${y}pt" ${attrs}>${inner}${extra}</field>`;
const needed = '<validate nullTest="error"/>';
const check = '<ui><checkButton/></ui><items><text>on</text></items>';
const press = '<ui><button/></ui>';

const BODY = [
  `<subform name="lock" access="protected" layout="tb">${box('inner', 0, '', undefined, needed)}${box('tick', 30, '', check)}${box('btn', 60, '', press)}</subform>`,
  `<subform name="ro" access="readOnly" layout="tb">${box('text', 0, '', undefined, needed)}${box('tick', 30, '', check)}${box('btn', 60, '', press, onEvent('click', 'free.rawValue = "pressed";'))}`
    + `<subform name="deep" layout="tb">${box('own', 0, 'access="protected"', undefined, needed)}${box('plain', 30)}</subform></subform>`,
  `<subform name="ni" access="nonInteractive" layout="tb">${box('own', 0, 'access="protected"', undefined, needed)}</subform>`,
  `<subform name="wide" access="protected" layout="tb"><subform name="mid" access="readOnly" layout="tb">${box('leaf', 0)}</subform></subform>`,
  `<exclGroup name="grpRo" access="readOnly" w="40pt" h="20pt" y="200pt"><field name="yes" w="20pt" h="20pt">${check}</field></exclGroup>`,
  `<exclGroup name="grpPr" access="protected" w="40pt" h="20pt" y="230pt"><field name="yes" w="20pt" h="20pt">${check}</field></exclGroup>`,
  box('free', 90, '', undefined, needed),
  box('script', 120, '', undefined, ''),
  `<subform name="locked" access="protected" layout="tb">${box('target', 0)}</subform>`,
  box('writer', 150, '', press, onEvent('click', 'locked.target.rawValue = "by script";')),
].join('');

const accessOf = (rt: FormRuntime): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const page of rt.layout().pages) for (const item of page.items) if (item.kind === 'field') out[item.som.replace(`${ROOT}.`, '')] = item.access;
  return out;
};

describe('E11: effective access', () => {
  it('a protected subform makes a field inside it protected in the render tree and in problems(), though the field itself is open', async () => {
    const rt = await loaded(BODY, { rootAttrs: 'layout="tb"' });
    expect(accessOf(rt)['lock[0].inner[0]']).toBe('protected');
    expect(accessOf(rt)['free[0]']).toBe('open');
    expect(rt.problems().problems.find((p) => p.som === `${ROOT}.lock[0].inner[0]`)).toMatchObject({ access: 'protected', kind: 'nullTest' });
    expect(rt.problems().problems.find((p) => p.som === `${ROOT}.free[0]`)).toMatchObject({ access: 'open' });
  });

  it('nesting: the most restrictive wins, in either order (readOnly parent over a protected child is protected; protected parent over a readOnly child is protected; nonInteractive beats protected)', async () => {
    const rt = await loaded(BODY, { rootAttrs: 'layout="tb"' });
    const seen = accessOf(rt);
    expect(seen['ro[0].deep[0].own[0]']).toBe('protected');
    expect(seen['ro[0].deep[0].plain[0]']).toBe('readOnly');
    expect(seen['wide[0].mid[0].leaf[0]']).toBe('protected');
    expect(seen['ni[0].own[0]']).toBe('nonInteractive');
    expect(seen['ro[0].text[0]']).toBe('readOnly');
  });

  it('the effective access follows a script that locks a subform', async () => {
    const rt = await loaded(`${BODY}${box('locker', 180, '', press, onEvent('click', 'free2.access = "readOnly";'))}<subform name="free2" layout="tb">${box('a', 0)}</subform>`, { rootAttrs: 'layout="tb"' });
    expect(accessOf(rt)['free2[0].a[0]']).toBe('open');
    rt.event('locker', 'click');
    expect(accessOf(rt)['free2[0].a[0]']).toBe('readOnly');
  });
});

describe('E11: members of an exclusion group', () => {
  it('a radio button inherits its group\'s access in the render tree, and the user-action check follows', async () => {
    const rt = await loaded(BODY, { rootAttrs: 'layout="tb"' });
    expect(accessOf(rt)['grpRo[0].yes[0]']).toBe('readOnly');
    expect(accessOf(rt)['grpPr[0].yes[0]']).toBe('protected');
    expect(rt.checkUserAction('grpPr.yes', { kind: 'event', activity: 'click' }).allowed).toBe(false);
    expect(rt.checkUserAction('grpRo.yes', { kind: 'setValue' }).allowed).toBe(false);
  });
});

describe('E11: an own access the schema does not know', () => {
  it('reads as open for the field itself but the ancestors\' restriction still applies, in the render tree and in problems() alike', async () => {
    const body = `<subform name="lock" access="protected" layout="tb">${box('odd', 0, 'access="bogus"', undefined, needed)}</subform>${box('lone', 40, 'access="bogus"', undefined, needed)}`;
    const rt = await loaded(body, { rootAttrs: 'layout="tb"' });
    expect(accessOf(rt)['lock[0].odd[0]']).toBe('protected');
    expect(accessOf(rt)['lone[0]']).toBe('open');
    const listed = Object.fromEntries(rt.problems().problems.map((p) => [p.som.replace(`${ROOT}.`, ''), p.access]));
    expect(listed).toEqual({ 'lock[0].odd[0]': 'protected', 'lone[0]': 'open' });
    expect(rt.layout().issues.some((i) => i.feature.includes('access'))).toBe(true);
  });
});

describe('E11: checkUserAction', () => {
  const allowed = (rt: FormRuntime, som: string, action: Parameters<FormRuntime['checkUserAction']>[1]): boolean => rt.checkUserAction(som, action).allowed;
  const event = (activity: 'click' | 'change' | 'enter' | 'exit' | 'mouseDown'): { kind: 'event'; activity: typeof activity } => ({ kind: 'event', activity });

  it('open: everything is allowed', async () => {
    const rt = await loaded(BODY, { rootAttrs: 'layout="tb"' });
    for (const action of [{ kind: 'setValue' } as const, event('click'), event('change'), event('enter')]) expect(allowed(rt, 'free', action)).toBe(true);
  });

  it('protected and nonInteractive: nothing a user does is allowed (protected containers generate no events), buttons included', async () => {
    const rt = await loaded(BODY, { rootAttrs: 'layout="tb"' });
    for (const som of ['lock.inner', 'lock.btn', 'lock.tick', 'ni.own', 'wide.mid.leaf', 'ro.deep.own']) {
      for (const action of [{ kind: 'setValue' } as const, event('click'), event('change'), event('enter'), event('exit'), event('mouseDown')]) {
        expect(allowed(rt, som, action), `${som} ${JSON.stringify(action)}`).toBe(false);
      }
    }
    expect(rt.checkUserAction('lock.inner', { kind: 'setValue' })).toMatchObject({ allowed: false, access: 'protected' });
    expect(rt.checkUserAction('ni.own', { kind: 'setValue' })).toMatchObject({ allowed: false, access: 'nonInteractive' });
  });

  it('readOnly: no typed value, no change event, no click on a check or radio button; entering, leaving, the mouse and a button click are allowed', async () => {
    const rt = await loaded(BODY, { rootAttrs: 'layout="tb"' });
    expect(allowed(rt, 'ro.text', { kind: 'setValue' })).toBe(false);
    expect(allowed(rt, 'ro.text', event('change'))).toBe(false);
    // A click changes the content only where it toggles: a check or radio button. A click on a text field or a button changes nothing.
    expect(allowed(rt, 'ro.text', event('click'))).toBe(true);
    expect(allowed(rt, 'ro.tick', event('click'))).toBe(false);
    expect(allowed(rt, 'grpRo.yes', event('click'))).toBe(false);
    expect(allowed(rt, 'ro.text', event('enter'))).toBe(true);
    expect(allowed(rt, 'ro.text', event('exit'))).toBe(true);
    expect(allowed(rt, 'ro.text', event('mouseDown'))).toBe(true);
    expect(allowed(rt, 'ro.btn', event('click'))).toBe(true);
    expect(allowed(rt, 'ro.deep.plain', { kind: 'setValue' })).toBe(false);
  });

  it('a SOM that names nothing is allowed (the action then fails in the usual way); a malformed action is an argument error', async () => {
    const rt = await loaded(BODY, { rootAttrs: 'layout="tb"' });
    expect(allowed(rt, 'nothing.here', { kind: 'setValue' })).toBe(true);
    expect(() => rt.checkUserAction('free', { kind: 'event', activity: 'explode' } as never)).toThrowError(/user action is not valid/);
  });

  it('the runtime itself does not enforce it: scripts and replays keep writing locked fields', async () => {
    const rt = await loaded(BODY, { rootAttrs: 'layout="tb"' });
    rt.event('writer', 'click');
    expect(rt.getValue('locked.target')).toBe('by script');
    rt.setValue('lock.inner', 'replayed');
    expect(rt.getValue('lock.inner')).toBe('replayed');
  });
});
