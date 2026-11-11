import { describe, expect, it } from 'vitest';
import { PROTOCOL_VERSION } from '../protocol.js';
import { createFormRuntime } from '../../runtime/runtime.js';
import { openXfaPdf } from '../../xfa-pdf.js';
import { connect, expectKind, HOST, openBody, SOM, syntheticPdf, T0, T1, T2, textsOf } from './support.js';

const pdf = syntheticPdf();
const setName = (value: string, at = T0): Record<string, unknown> => ({ kind: 'setValue', som: SOM.name, value, at });
const click = (som: string, at: number, answers?: number[]): Record<string, unknown> => ({ kind: 'event', som, activity: 'click', at, ...(answers === undefined ? {} : { answers }) });

describe('open, op, layout, download, dispose (synthetic form)', () => {
  it('opens a form: the render tree (schema-checked by the client parse), a load report without wall-clock time', async () => {
    const client = connect();
    const opened = expectKind(await client.send(openBody(pdf)), 'opened');
    expect(opened.renderTree.pages).toHaveLength(1);
    expect(opened.report.scriptsRun).toBeGreaterThan(0);
    expect(Object.keys(opened.report)).not.toContain('elapsedMs');
    // The load runs under the open's own clock.
    expect(textsOf(opened.renderTree)).toContain(String(T0));
  });

  it('applies an op: the tree comes back changed; an op that changes nothing returns no tree; messages and focus are what that op raised', async () => {
    const client = connect();
    await client.send(openBody(pdf));
    const first = expectKind(await client.send({ kind: 'op', op: setName('TESTNAME') }), 'applied');
    expect(first.renderTree).toBeDefined();
    expect(textsOf(first.renderTree ?? { version: 2, pages: [], resources: { fonts: [], images: [] }, issues: [] })).toContain('TESTNAME');
    expect(first.messages).toEqual([]);
    expect(first.focus).toEqual([]);
    const quiet = expectKind(await client.send({ kind: 'op', op: { kind: 'event', som: SOM.quiet, activity: 'enter', at: T1 } }), 'applied');
    expect(quiet.renderTree).toBeUndefined();
    expect(quiet.issues).toEqual(first.renderTree?.issues);
    expect(quiet.issues.length).toBeGreaterThan(0);
  });

  it('the clock of an op is its own `at`: the form reads the instant of the op that runs, not of the open or of the previous op', async () => {
    const client = connect();
    await client.send(openBody(pdf));
    const one = expectKind(await client.send({ kind: 'op', op: click(SOM.tick, T1) }), 'applied');
    expect(textsOf(one.renderTree ?? expectNever())).toContain(String(T1));
    const two = expectKind(await client.send({ kind: 'op', op: click(SOM.tick, T2) }), 'applied');
    expect(textsOf(two.renderTree ?? expectNever())).toContain(String(T2));
  });

  it('layout answers the current tree in full; download answers the PDF with the data written back, which reopens with the value; both leave the session usable', async () => {
    const client = connect();
    await client.send(openBody(pdf));
    const applied = expectKind(await client.send({ kind: 'op', op: setName('TESTNAME') }), 'applied');
    const laid = expectKind(await client.send({ kind: 'layout' }), 'laidOut');
    expect(laid.renderTree).toEqual(applied.renderTree);
    const first = expectKind(await client.send({ kind: 'download', at: T1 }), 'downloaded');
    expect(first.validated).toBeNull();
    const reopened = await createFormRuntime(await openXfaPdf(first.bytes), { host: HOST, clock: { now: () => T1 } });
    reopened.load();
    expect(reopened.getValue('xfa[0].form[0].form1[0].name[0]')).toBe('TESTNAME');
    reopened.dispose();
    // The engine's own buffers were not handed over: a second download of the unchanged form is identical, and ops still work.
    const second = expectKind(await client.send({ kind: 'download', at: T1 }), 'downloaded');
    expect(Buffer.compare(first.bytes, second.bytes)).toBe(0);
    expectKind(await client.send({ kind: 'op', op: setName('AGAIN') }), 'applied');
  });

  it('dispose frees the run; everything but open then fails with NOT_OPEN; dispose is idempotent; a new open works', async () => {
    const client = connect();
    await client.send(openBody(pdf));
    expectKind(await client.send({ kind: 'dispose' }), 'disposed');
    expectKind(await client.send({ kind: 'dispose' }), 'disposed');
    for (const body of [{ kind: 'op', op: setName('x') }, { kind: 'layout' }, { kind: 'download', at: T0 }]) {
      expect(expectKind(await client.send(body), 'failed').code).toBe('NOT_OPEN');
    }
    expectKind(await client.send(openBody(pdf)), 'opened');
  });
});

describe('a mistake of the client leaves the run alone', () => {
  it('a request before open, a second open, an unknown node, a validate without a pack: failed, the state unchanged', async () => {
    const client = connect();
    expect(expectKind(await client.send({ kind: 'layout' }), 'failed').code).toBe('NOT_OPEN');
    await client.send(openBody(pdf));
    expectKind(await client.send({ kind: 'op', op: setName('KEEP') }), 'applied');
    const before = expectKind(await client.send({ kind: 'layout' }), 'laidOut');
    expect(expectKind(await client.send(openBody(pdf)), 'failed').code).toBe('ALREADY_OPEN');
    expect(expectKind(await client.send({ kind: 'op', op: { kind: 'setValue', som: 'no.such.field', value: 'x', at: T0 } }), 'failed').code).toBe('NODE_NOT_FOUND');
    expect(expectKind(await client.send({ kind: 'op', op: { kind: 'validate', at: T0 } }), 'failed').code).toBe('NO_PACK');
    const after = expectKind(await client.send({ kind: 'layout' }), 'laidOut');
    expect(after.renderTree).toEqual(before.renderTree);
    expectKind(await client.send({ kind: 'op', op: setName('STILL') }), 'applied');
  });

  it('a file that is not a form fails the open with the engine\'s code and no run is left behind', async () => {
    const client = connect();
    const failed = expectKind(await client.send(openBody(new Uint8Array([1, 2, 3]))), 'failed');
    expect(failed.code).toBe('MALFORMED');
    expect(expectKind(await client.send({ kind: 'layout' }), 'failed').code).toBe('NOT_OPEN');
    expectKind(await client.send(openBody(pdf)), 'opened');
  });

  it('the page cannot send engine budgets: an open that carries `limits` is refused unread (the deployment sets them in the session options)', async () => {
    const client = connect();
    for (const limits of [{}, { runBridgeCalls: 1 }, { runDeadlineMs: 3_600_000 }]) {
      const reply = (await client.raw({ v: PROTOCOL_VERSION, id: 1, ...openBody(pdf, { limits }) })) as { kind: string; code: string };
      expect(reply).toMatchObject({ kind: 'failed', code: 'INVALID_MESSAGE' });
    }
    expect(expectKind(await client.send(openBody(pdf, { timezone: 'Nowhere/Land' })), 'failed').code).toBe('INVALID_MESSAGE');
  });
});

describe('ANSWER_REQUIRED and replay (PA-8)', () => {
  it('a choice box with no answer asks for one and ends the run; the session then wants a rebuild', async () => {
    const client = connect();
    await client.send(openBody(pdf));
    const asked = expectKind(await client.send({ kind: 'op', op: click(SOM.ask, T1) }), 'answerRequired');
    // null = the op of this request (a live op has no index in the log).
    expect(asked).toMatchObject({ call: { text: 'Clear?', title: 'Confirm', icon: 2, buttons: 1 }, opIndex: null });
    for (const body of [{ kind: 'op', op: setName('x') }, { kind: 'layout' }, { kind: 'download', at: T0 }]) {
      expect(expectKind(await client.send(body), 'failed').code).toBe('NEEDS_REBUILD');
    }
    expect(expectKind(await client.send({ kind: 'dispose' }), 'disposed')).toBeDefined();
  });

  it('replaying the log with the answer: 1 (the number this form\'s script tests for) runs its branch, 2 (any other number) does not; the box is recorded with its result', async () => {
    const client = connect();
    for (const [answer, expected] of [[1, 'cleared'], [2, 'KEEP']] as const) {
      const ops = [setName('KEEP'), click(SOM.ask, T1, [answer])];
      const opened = expectKind(await client.send(openBody(pdf, { ops })), 'opened');
      expect(textsOf(opened.renderTree)).toContain(expected);
      expectKind(await client.send({ kind: 'dispose' }), 'disposed');
    }
  });

  it('an unanswered box in a replay names the op by its index in the log, and a box needs one answer per call, consumed in order', async () => {
    const client = connect();
    const asked = expectKind(await client.send(openBody(pdf, { ops: [setName('KEEP'), setName('TWO'), click(SOM.ask, T1)] })), 'answerRequired');
    expect(asked.opIndex).toBe(2);
    // Surplus answers are ignored.
    const surplus = expectKind(await client.send(openBody(pdf, { ops: [click(SOM.ask, T1, [2, 1, 1])] })), 'opened');
    expect(textsOf(surplus.renderTree)).not.toContain('cleared');
  });

  it('a live op with the answer in hand works without a rebuild', async () => {
    const client = connect();
    await client.send(openBody(pdf));
    const applied = expectKind(await client.send({ kind: 'op', op: click(SOM.ask, T1, [1]) }), 'applied');
    expect(applied.messages).toEqual([expect.objectContaining({ text: 'Clear?', buttons: 1, result: 1, event: 'click' })]);
    expect(textsOf(applied.renderTree ?? expectNever())).toContain('cleared');
  });
});

describe('a run that ends: aborted, and recovery by replay', () => {
  // The deployment's engine budgets (a hosting option; the page cannot send them): a count, never a time.
  const limits = { runBridgeCalls: 200 };

  it('a script limit mid-op is `aborted` with the budget (opIndex null: the op of this request); the session wants a rebuild; replay without that op recovers', async () => {
    const client = connect({ limits });
    await client.send(openBody(pdf));
    expectKind(await client.send({ kind: 'op', op: setName('KEEP') }), 'applied');
    const aborted = expectKind(await client.send({ kind: 'op', op: click(SOM.spin, T1) }), 'aborted');
    expect(aborted).toMatchObject({ reason: { code: 'SCRIPT_LIMIT', limit: 'run-bridge-calls' }, opIndex: null });
    expect(expectKind(await client.send({ kind: 'op', op: setName('x') }), 'failed').code).toBe('NEEDS_REBUILD');
    // The client drops the failing op and replays the rest.
    const recovered = expectKind(await client.send(openBody(pdf, { ops: [setName('KEEP')] })), 'opened');
    expect(textsOf(recovered.renderTree)).toContain('KEEP');
  });

  it('the same failure inside a replay reports the index of the failing op in the log', async () => {
    const client = connect({ limits });
    const aborted = expectKind(await client.send(openBody(pdf, { ops: [setName('A'), setName('B'), click(SOM.spin, T1), setName('C')] })), 'aborted');
    expect(aborted.opIndex).toBe(2);
    expect(aborted.reason.limit).toBe('run-bridge-calls');
    expectKind(await client.send(openBody(pdf, { ops: [setName('A'), setName('B'), setName('C')] })), 'opened');
  });

  it('a bad op in a replay (unknown node) fails the open with the index and leaves no run, not a rebuild state', async () => {
    const client = connect();
    const failed = expectKind(await client.send(openBody(pdf, { ops: [setName('A'), { kind: 'setValue', som: 'no.such', value: 'x', at: T0 }] })), 'failed');
    expect(failed).toMatchObject({ code: 'NODE_NOT_FOUND', opIndex: 1 });
    expect(expectKind(await client.send({ kind: 'layout' }), 'failed').code).toBe('NOT_OPEN');
  });
});

describe('A3 on the synthetic form: replay determinism', () => {
  it('the same ops on a fresh session give the same tree and the same data, whether applied live or replayed', async () => {
    const ops = [setName('ONE'), click(SOM.tick, T1), click(SOM.ask, T2, [1]), setName('TWO', T2)];
    const live = connect();
    await live.send(openBody(pdf));
    let last = expectKind(await live.send({ kind: 'layout' }), 'laidOut').renderTree;
    for (const op of ops) last = expectKind(await live.send({ kind: 'op', op }), 'applied').renderTree ?? last;
    const replayed = expectKind(await connect().send(openBody(pdf, { ops })), 'opened');
    expect(replayed.renderTree).toEqual(last);
    const again = expectKind(await connect().send(openBody(pdf, { ops })), 'opened');
    expect(again).toEqual(replayed);
    const bytesLive = expectKind(await live.send({ kind: 'download', at: T2 }), 'downloaded').bytes;
    const other = connect();
    await other.send(openBody(pdf, { ops }));
    expect(Buffer.compare(bytesLive, expectKind(await other.send({ kind: 'download', at: T2 }), 'downloaded').bytes)).toBe(0);
  });
});

function expectNever(): never {
  throw new Error('the reply should have carried a render tree');
}
