import { describe, expect, it } from 'vitest';
import { MIN_FORM_RUN_DEADLINE_MS, MAX_OPS_PER_OPEN, WORST_MS_PER_OP, REPLAY_HEADROOM } from '../limits.js';
import { serveFormSession } from '../session.js';
import { clockLayoutPdf, connect, expectKind, fakePort, loadAskPdf, openBody, preSavePdf, REMOVING_PACK, removingValidatePdf, T0, T1, T2, textsOf } from './support.js';
import { openXfaPdf } from '../../xfa-pdf.js';

/** W03 wave-gate fixes (W3G-1, -4, -5, -8, -9): the session's download, snapshot and creation checks. Counts and outcomes only, never time. */

describe('W3G-1: once the form\'s save handling has started, an error ends the run', () => {
  it('a preSave script that removes the barcode container makes `download` abort (rebuild needed), never a kept-run failed', async () => {
    const client = connect();
    expectKind(await client.send(openBody(preSavePdf('xfa.form.form1.nodes.remove(bcs);'), { pack: REMOVING_PACK, at: T0 })), 'opened');
    const reply = await client.send({ kind: 'download', at: T1 });
    expect(reply.kind).toBe('aborted');
    expect(expectKind(await client.send({ kind: 'layout' }), 'failed').code).toBe('NEEDS_REBUILD');
  });

  it('control: a preSave script that removes only a barcode child is no error (downloaded), and the run stays healthy', async () => {
    const client = connect();
    expectKind(await client.send(openBody(preSavePdf('bcs.nodes.remove(bcs.bc1);'), { pack: REMOVING_PACK, at: T0 })), 'opened');
    expectKind(await client.send({ kind: 'download', at: T1 }), 'downloaded');
    expectKind(await client.send({ kind: 'layout' }), 'laidOut');
  });
});

describe('W3G-9: a choice box raised by preSave during download', () => {
  it('cannot be answered: the run ends with `aborted` and the reason code ANSWER_REQUIRED', async () => {
    const client = connect();
    expectKind(await client.send(openBody(preSavePdf('xfa.host.messageBox("Save now?", "Confirm", 2, 1);'), { pack: REMOVING_PACK, at: T0 })), 'opened');
    const reply = expectKind(await client.send({ kind: 'download', at: T1 }), 'aborted');
    expect(reply.reason.code).toBe('ANSWER_REQUIRED');
    expect(reply.opIndex).toBeNull();
    expect(expectKind(await client.send({ kind: 'layout' }), 'failed').code).toBe('NEEDS_REBUILD');
  });
});

describe('W3G-5: the snapshot check answers the load-time choice box with the open\'s answers', () => {
  it('open with answers [1], snapshot: faithful true (the reopen takes the same answer)', async () => {
    const client = connect();
    const opened = expectKind(await client.send(openBody(loadAskPdf(), { answers: [1] })), 'opened');
    expect(textsOf(opened.renderTree)).toContain('yes');
    const snap = expectKind(await client.send({ kind: 'snapshot', at: T0 }), 'snapshotted');
    expect(snap.faithful).toBe(true);
  });
});

describe('W3G-8: a snapshot runs the live form under its own `at`', () => {
  // NOTE: no protocol sequence leaves the layout stale at `snapshot` (every op and every download settles it), so this guards the
  // clock rule the code now states, rather than reproducing a failure of the one-line fix.
  it('after a download whose preSave changed the form, a snapshot at the same instant is faithful on a form that reads the clock in ready:$layout', async () => {
    const client = connect();
    expectKind(await client.send(openBody(clockLayoutPdf(), { pack: REMOVING_PACK, at: T0 })), 'opened');
    expectKind(await client.send({ kind: 'op', op: { kind: 'setValue', som: 'name', value: 'A', at: T1 } }), 'applied');
    expectKind(await client.send({ kind: 'download', at: T2 }), 'downloaded');
    const live = expectKind(await client.send({ kind: 'layout' }), 'laidOut').renderTree;
    expect(textsOf(live)).toContain(String(T2));
    expect(textsOf(live)).toContain('saved');
    expect(expectKind(await client.send({ kind: 'snapshot', at: T2 }), 'snapshotted').faithful).toBe(true);
  });

  it('a snapshot at an instant other than the last layout\'s is not faithful on such a form (the client passes the instant of its last op)', async () => {
    const client = connect();
    expectKind(await client.send(openBody(clockLayoutPdf(), { at: T0 })), 'opened');
    expectKind(await client.send({ kind: 'op', op: { kind: 'setValue', som: 'name', value: 'A', at: T1 } }), 'applied');
    expect(expectKind(await client.send({ kind: 'snapshot', at: T1 }), 'snapshotted').faithful).toBe(true);
    expect(expectKind(await client.send({ kind: 'snapshot', at: T2 }), 'snapshotted').faithful).toBe(false);
  });
});

describe('W3G-4(b): the deployment\'s total-time budget must cover a full log', () => {
  it('refuses to create a session whose formRunDeadlineMs is below MAX_OPS_PER_OPEN x the measured worst ms/op x the headroom', () => {
    expect(MIN_FORM_RUN_DEADLINE_MS).toBe(MAX_OPS_PER_OPEN * WORST_MS_PER_OP * REPLAY_HEADROOM);
    expect(() => serveFormSession(fakePort(), { limits: { formRunDeadlineMs: MIN_FORM_RUN_DEADLINE_MS - 1 } })).toThrow(/formRunDeadlineMs.*MAX_OPS_PER_OPEN \(1500\) x 40 ms x 2/);
    expect(() => serveFormSession(fakePort(), { limits: { formRunDeadlineMs: MIN_FORM_RUN_DEADLINE_MS } }).close()).not.toThrow();
  });

  it('the default budget (120 s) is not refused, and a session with no limits is created', () => {
    expect(() => serveFormSession(fakePort()).close()).not.toThrow();
    expect(() => serveFormSession(fakePort(), { limits: { runBridgeCalls: 200 } }).close()).not.toThrow();
  });
});

const setName = (value: string, at: number): Record<string, unknown> => ({ kind: 'setValue', som: 'name', value, at });

describe('W3G-R1: a download\'s preSave handling is an op of the log', () => {
  const pdf = clockLayoutPdf();
  const datasetsOf = async (bytes: Uint8Array): Promise<string> => (await openXfaPdf(bytes)).packet('datasets').text();

  it('the `downloaded` reply carries the log entry; replaying ops + that entry on a fresh session equals the live session (tree and datasets), and the snapshot at the reopen clock is faithful', async () => {
    const live = connect();
    expectKind(await live.send(openBody(pdf, { pack: REMOVING_PACK, at: T0 })), 'opened');
    expectKind(await live.send({ kind: 'op', op: setName('A', T1) }), 'applied');
    const downloaded = expectKind(await live.send({ kind: 'download', at: T2 }), 'downloaded');
    expect(downloaded.op).toEqual({ kind: 'preSave', at: T2 });
    const liveTree = expectKind(await live.send({ kind: 'layout' }), 'laidOut').renderTree;
    expect(textsOf(liveTree)).toContain('saved');
    const liveSnap = expectKind(await live.send({ kind: 'snapshot', at: T2 }), 'snapshotted');
    expect(liveSnap.faithful).toBe(true);

    const replayed = connect();
    const opened = expectKind(await replayed.send(openBody(pdf, { pack: REMOVING_PACK, at: T0, ops: [setName('A', T1), downloaded.op ?? {}] })), 'opened');
    expect(opened.opCount).toBe(2);
    expect(opened.renderTree).toEqual(liveTree);
    const replaySnap = expectKind(await replayed.send({ kind: 'snapshot', at: T2 }), 'snapshotted');
    expect(await datasetsOf(replaySnap.bytes)).toBe(await datasetsOf(liveSnap.bytes));
    expect(Buffer.compare(replaySnap.bytes, liveSnap.bytes)).toBe(0);
  });

  it('the download counts toward opCount: the next live op reports it', async () => {
    const live = connect();
    expectKind(await live.send(openBody(pdf, { pack: REMOVING_PACK, at: T0 })), 'opened');
    expectKind(await live.send({ kind: 'download', at: T1 }), 'downloaded');
    expect(expectKind(await live.send({ kind: 'op', op: setName('B', T2) }), 'applied').opCount).toBe(2);
  });

  it('a download with no pack runs no preSave handling, changes nothing, and has no log entry', async () => {
    const live = connect();
    expectKind(await live.send(openBody(pdf, { at: T0 })), 'opened');
    const downloaded = expectKind(await live.send({ kind: 'download', at: T1 }), 'downloaded');
    expect(downloaded.op).toBeUndefined();
    expect(textsOf(expectKind(await live.send({ kind: 'layout' }), 'laidOut').renderTree)).not.toContain('saved');
    expect(expectKind(await live.send({ kind: 'op', op: setName('B', T2) }), 'applied').opCount).toBe(1);
  });

  it('at MAX_OPS_PER_OPEN a download with a pack is refused (LOG_FULL, run kept; the reserved last slot is taken); snapshot still works', async () => {
    const live = connect();
    const ops = Array.from({ length: MAX_OPS_PER_OPEN }, (_, i) => setName(`V${i}`, T1));
    expectKind(await live.send(openBody(pdf, { pack: REMOVING_PACK, at: T0, ops })), 'opened');
    expect(expectKind(await live.send({ kind: 'download', at: T2 }), 'failed').code).toBe('LOG_FULL');
    expectKind(await live.send({ kind: 'snapshot', at: T1 }), 'snapshotted');
  }, 120_000);

  it('a preSave op is refused without a pack (NO_PACK, run kept), as a validate op is', async () => {
    const noPack = connect();
    expectKind(await noPack.send(openBody(pdf, { at: T0 })), 'opened');
    expect(expectKind(await noPack.send({ kind: 'op', op: { kind: 'preSave', at: T1 } }), 'failed').code).toBe('NO_PACK');
    expectKind(await noPack.send({ kind: 'layout' }), 'laidOut');
  });
});

describe('W3G-R4: only an error after the preSave broadcast started ends the download\'s run', () => {
  it('a validated flag that cannot be read before the broadcast is a kept-run failure, not an abort', async () => {
    const client = connect();
    expectKind(await client.send(openBody(removingValidatePdf(), { pack: REMOVING_PACK, at: T0 })), 'opened');
    // An event op (not Validate) runs the button's script, which removes the flag node: nothing reads the flag yet.
    expectKind(await client.send({ kind: 'op', op: { kind: 'event', som: 'btn', activity: 'click', at: T0 } }), 'applied');
    const reply = await client.send({ kind: 'download', at: T1 });
    expect(reply.kind).toBe('failed');
    expectKind(await client.send({ kind: 'layout' }), 'laidOut');
  });
});

describe('W3G-S1: the last log slot is reserved for a download', () => {
  const pdf = clockLayoutPdf();
  const sets = (count: number): Record<string, unknown>[] => Array.from({ length: count }, (_, i) => setName(`V${i}`, T1));

  it('at MAX_OPS_PER_OPEN - 1 live edits are refused LOG_FULL (nothing applied), a download is accepted and takes the last slot, a second download is refused', async () => {
    const client = connect();
    expectKind(await client.send(openBody(pdf, { pack: REMOVING_PACK, at: T0, ops: sets(MAX_OPS_PER_OPEN - 1) })), 'opened');
    for (const op of [setName('X', T2), { kind: 'event', som: 'btn', activity: 'click', at: T2 }, { kind: 'validate', at: T2 }, { kind: 'preSave', at: T2 }]) {
      expect(expectKind(await client.send({ kind: 'op', op }), 'failed').code).toBe('LOG_FULL');
    }
    const downloaded = expectKind(await client.send({ kind: 'download', at: T2 }), 'downloaded');
    expect(downloaded.op).toEqual({ kind: 'preSave', at: T2 });
    const liveTree = expectKind(await client.send({ kind: 'layout' }), 'laidOut').renderTree;
    expect(expectKind(await client.send({ kind: 'download', at: T2 }), 'failed').code).toBe('LOG_FULL');
    const entry = downloaded.op;
    expect(entry).toBeDefined();

    // The log (MAX_OPS_PER_OPEN - 1 edits + the download entry) reopens in a fresh session to exactly MAX_OPS_PER_OPEN ops and the live tree.
    const reopened = connect();
    const opened = expectKind(await reopened.send(openBody(pdf, { pack: REMOVING_PACK, at: T0, ops: [...sets(MAX_OPS_PER_OPEN - 1), entry ?? {}] })), 'opened');
    expect(opened.opCount).toBe(MAX_OPS_PER_OPEN);
    expect(opened.renderTree).toEqual(liveTree);
    expectKind(await client.send({ kind: 'snapshot', at: T2 }), 'snapshotted');
  }, 120_000);

  it('one below that, a live edit is still accepted (and then the reserved slot is all that is left)', async () => {
    const client = connect();
    expectKind(await client.send(openBody(pdf, { pack: REMOVING_PACK, at: T0, ops: sets(MAX_OPS_PER_OPEN - 2) })), 'opened');
    expect(expectKind(await client.send({ kind: 'op', op: setName('LAST', T2) }), 'applied').opCount).toBe(MAX_OPS_PER_OPEN - 1);
    expect(expectKind(await client.send({ kind: 'op', op: setName('ONE-TOO-MANY', T2) }), 'failed').code).toBe('LOG_FULL');
    expectKind(await client.send({ kind: 'download', at: T2 }), 'downloaded');
  }, 120_000);
});

describe('W3G-S2: a preSave op can never ask for an answer', () => {
  const asking = (): Uint8Array => preSavePdf('xfa.host.messageBox("Save now?", "Confirm", 2, 1);');

  it('live: aborted ANSWER_REQUIRED (not answerRequired), the run needs a rebuild', async () => {
    const client = connect();
    expectKind(await client.send(openBody(asking(), { pack: REMOVING_PACK, at: T0 })), 'opened');
    const reply = expectKind(await client.send({ kind: 'op', op: { kind: 'preSave', at: T1 } }), 'aborted');
    expect(reply.reason.code).toBe('ANSWER_REQUIRED');
    expect(expectKind(await client.send({ kind: 'layout' }), 'failed').code).toBe('NEEDS_REBUILD');
  });

  it('in a replay: aborted ANSWER_REQUIRED naming the op by its index in the log', async () => {
    const client = connect();
    const reply = expectKind(await client.send(openBody(asking(), { pack: REMOVING_PACK, at: T0, ops: [{ kind: 'setValue', som: 'fm', value: 'A', at: T1 }, { kind: 'preSave', at: T2 }] })), 'aborted');
    expect(reply.reason.code).toBe('ANSWER_REQUIRED');
    expect(reply.opIndex).toBe(1);
  });
});
