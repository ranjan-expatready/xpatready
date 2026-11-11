import { describe, expect, it } from 'vitest';
import { datasetsXml } from '../../model/form/__tests__/helpers.js';
import { tpl } from '../../model/template/__tests__/helpers.js';
import { buildXfaPdf, packet } from '../../__tests__/fixtures/build-xfa-pdf.js';
import { connect, expectKind, on, openBody, T0, T1 } from './support.js';

/** E11 over the protocol: a live user op on a locked container is refused, not applied, not counted; scripts keep writing. */
const field = (name: string, y: number, attrs = '', inner = '<ui><textEdit/></ui>'): string => `<field name="${name}" w="100pt" h="20pt" y="${y}pt" ${attrs}>${inner}</field>`;

const pdf = ((): Uint8Array => {
  const body = [
    `<subform name="lock" access="protected" layout="tb">${field('inner', 0)}</subform>`,
    `<subform name="ro" access="readOnly" layout="tb">${field('text', 0)}${field('btn', 30, '', '<ui><button/></ui>')}${field('tick', 120, '', '<ui><checkButton/></ui><items><text>on</text></items>')}</subform>`,
    `<subform name="later" layout="tb">${field('a', 150)}</subform>`,
    `<field name="locker" w="100pt" h="20pt" y="180pt"><ui><button/></ui>${on('click', 'later.access = \'readOnly\';')}</field>`,
    field('free', 60),
    `<field name="writer" w="100pt" h="20pt" y="90pt"><ui><button/></ui>${on('click', 'lock.inner.rawValue = "by script";')}</field>`,
  ].join('');
  const template = tpl(body).replace('<subform name="form1">', '<subform name="form1" layout="tb">');
  return buildXfaPdf({ packets: [packet('template', template), packet('datasets', datasetsXml('<form1/>'))] });
})();

const set = (som: string, value: string, at = T0): Record<string, unknown> => ({ kind: 'op', op: { kind: 'setValue', som, value, at } });
const fire = (som: string, activity: string, at = T0): Record<string, unknown> => ({ kind: 'op', op: { kind: 'event', som, activity, at } });

describe('E11: ACCESS_DENIED', () => {
  it('a typed value on a field inside a protected subform is refused with a failed reply; the run is kept, nothing changed, and opCount does not move', async () => {
    const client = connect();
    await client.send(openBody(pdf));
    const first = expectKind(await client.send(set('free', 'a')), 'applied');
    const tree = expectKind(await client.send({ kind: 'layout' }), 'laidOut').renderTree;
    const refused = expectKind(await client.send(set('lock.inner', 'typed')), 'failed');
    expect(refused.code).toBe('ACCESS_DENIED');
    expect(refused.message).toContain('protected');
    expect(expectKind(await client.send({ kind: 'layout' }), 'laidOut').renderTree).toEqual(tree);
    const next = expectKind(await client.send(set('free', 'b', T1)), 'applied');
    expect(next.opCount).toBe(first.opCount + 1);
  });

  it('events: any event on a protected field is refused; on a readOnly field a typed value, a change and a click on a check button are, entering and clicking a text field or a button are not', async () => {
    const client = connect();
    await client.send(openBody(pdf));
    for (const body of [fire('lock.inner', 'click'), fire('lock.inner', 'enter'), set('ro.text', 'x'), fire('ro.text', 'change'), fire('ro.tick', 'click')]) {
      expect(expectKind(await client.send(body), 'failed').code).toBe('ACCESS_DENIED');
    }
    expect(expectKind(await client.send(fire('ro.text', 'enter')), 'applied').opCount).toBe(1);
    expect(expectKind(await client.send(fire('ro.text', 'click')), 'applied').opCount).toBe(2);
    expect(expectKind(await client.send(fire('ro.btn', 'click')), 'applied').opCount).toBe(3);
  });

  it('the render tree the client draws from says protected and readOnly, so the viewer need not guess', async () => {
    const opened = expectKind(await connect().send(openBody(pdf)), 'opened');
    const access: Record<string, string> = {};
    for (const page of opened.renderTree.pages) for (const item of page.items) if (item.kind === 'field') access[item.som.split('form1[0].')[1] ?? item.som] = item.access;
    expect(access).toMatchObject({ 'lock[0].inner[0]': 'protected', 'ro[0].text[0]': 'readOnly', 'free[0]': 'open' });
  });

  it('form scripts keep setting a locked field: a click on an open button writes it, the value shows, and it counts as an op', async () => {
    const client = connect();
    await client.send(openBody(pdf));
    const applied = expectKind(await client.send(fire('writer', 'click')), 'applied');
    expect(applied.opCount).toBe(1);
    expect(JSON.stringify(applied.renderTree)).toContain('by script');
  });

  it('a log that holds only accepted ops replays to the same form; a refused op was never logged, so nothing in the replay refers to it', async () => {
    const live = connect();
    await live.send(openBody(pdf));
    const ops = [{ kind: 'setValue', som: 'free', value: 'kept', at: T0 }, { kind: 'event', som: 'writer', activity: 'click', at: T0 }];
    expectKind(await live.send(set('lock.inner', 'refused')), 'failed');
    for (const op of ops) expectKind(await live.send({ kind: 'op', op }), 'applied');
    const tree = expectKind(await live.send({ kind: 'layout' }), 'laidOut').renderTree;
    const replay = expectKind(await connect().send(openBody(pdf, { ops })), 'opened');
    expect(replay.renderTree).toEqual(tree);
    expect(replay.opCount).toBe(2);
  });
});

describe('E11: a script that locks a subform mid-log', () => {
  const ops = [
    { kind: 'setValue', som: 'later.a', value: 'before the lock', at: T0 },
    { kind: 'event', som: 'locker', activity: 'click', at: T0 },
  ];

  it('the value typed before the lock is accepted live and replays unchanged; after the lock the same op is refused', async () => {
    const live = connect();
    await live.send(openBody(pdf));
    for (const op of ops) expectKind(await live.send({ kind: 'op', op }), 'applied');
    expect(expectKind(await live.send(set('later.a', 'after the lock')), 'failed').code).toBe('ACCESS_DENIED');
    const tree = expectKind(await live.send({ kind: 'layout' }), 'laidOut').renderTree;
    const replay = expectKind(await connect().send(openBody(pdf, { ops })), 'opened');
    expect(replay.renderTree).toEqual(tree);
    expect(replay.opCount).toBe(2);
    expect(JSON.stringify(replay.renderTree)).toContain('before the lock');
    const fieldAccess = replay.renderTree.pages.flatMap((p) => p.items).flatMap((i) => (i.kind === 'field' && i.som.endsWith('later[0].a[0]') ? [i.access] : []));
    expect(fieldAccess).toEqual(['readOnly']);
  });

  it('a snapshot taken after a refused op is faithful: the refusal changed nothing, so reopening the bytes shows the same form', async () => {
    const client = connect();
    await client.send(openBody(pdf));
    expectKind(await client.send(set('free', 'kept')), 'applied');
    expect(expectKind(await client.send(set('lock.inner', 'refused')), 'failed').code).toBe('ACCESS_DENIED');
    const shot = expectKind(await client.send({ kind: 'snapshot', at: T0 }), 'snapshotted');
    expect(shot.faithful).toBe(true);
    const reopened = expectKind(await connect().send(openBody(shot.bytes, { ops: [] })), 'opened');
    expect(JSON.stringify(reopened.renderTree)).toContain('kept');
    expect(JSON.stringify(reopened.renderTree)).not.toContain('refused');
  });
});
