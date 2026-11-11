import { describe, expect, it } from 'vitest';
import { buildXfaPdf, packet } from '../../__tests__/fixtures/build-xfa-pdf.js';
import { datasetsXml } from '../../model/form/__tests__/helpers.js';
import { tpl } from '../../model/template/__tests__/helpers.js';
import { esc } from '../../runtime/__tests__/helpers.js';
import type { Op } from '../protocol.js';
import { clockLayoutPdf, connect, expectKind, HOST, loadAskPdf, openBody, REMOVING_PACK, T0, T1, T2, textField, textsOf } from './support.js';
import { ReferenceWatchdog, WatchdogError, type WatchdogOptions } from './watchdog.js';

/**
 * W03-T15 A1 on a real `worker_threads` Worker (see `watchdog.ts` for the contract). Every assertion is about an outcome (the
 * worker was terminated, a fresh one was spawned, the reply kinds, equal trees); the only time in play is the watchdog's own
 * deadline, which is the trigger and is never asserted against.
 */

/** The watchdog's per-request deadline: long enough for a healthy request on this small form, short enough to keep the suite quick. */
const DEADLINE_MS = 2_000;
/** The engine's per-script budget in these tests. Contract rule 3: it is BELOW the watchdog deadline, so the sandbox always has the first chance. */
const RUN_DEADLINE_MS = 300;
/** Deadline of an `open` that is not the trigger: generous, so a slow cold open on a loaded runner is never mistaken for a hang. */
const SLOW_OPEN_MS = 20_000;

/** A client whose engine budget is below its watchdog deadline and whose `open` cannot be killed by a slow machine. */
const newWatchdog = (extra: Partial<WatchdogOptions> = {}): ReferenceWatchdog =>
  new ReferenceWatchdog({ requestDeadlineMs: DEADLINE_MS, openDeadlineMs: SLOW_OPEN_MS, session: { limits: { runDeadlineMs: RUN_DEADLINE_MS } }, ...extra });

/**
 * The hang. A native loop the sandbox cannot interrupt. It was `String.prototype.indexOf` of a 4 Mi-character needle in 8 Mi
 * characters (hours, no JavaScript between the steps); the prelude's string guard now bounds that and its siblings before the
 * native runs (`worker/__tests__/string-limits.test.ts` proves each is a typed script limit), so it can no longer serve here.
 * The hang that remains, found by the same probe, is the COMPILE of a regular-expression literal: QuickJS compiles
 * `/a|a|...|b/` in time quadratic in the number of alternatives and never polls its interrupt while it does (about 6 s at 2^18
 * alternatives, about 25 s at 2^19 on the development machine; extrapolated by the quadratic, minutes at the 4 Mi-character script-source ceiling). A literal
 * is compiled by the engine when `eval` (or `Function`) parses it, which the prelude cannot see, so unlike `new RegExp(...)`
 * (capped by `regexpSourceChars`) it is not guarded. The outcome does not depend on the machine's speed: the watchdog's
 * deadline is 2 s and the compile outlasts it on any machine. When the engine can bound that compile too, this test needs a
 * new native hang, or the test-only seam described in the T15 card.
 */
const HANG = 'eval("/" + "a|".repeat(1 << 19) + "b/");';
const SPIN = 'while (true) {}';

const click = (body: string): string => `<event activity="click"><script contentType="application/x-javascript">${esc(body)}</script></event>`;

/** A fictitious form: a plain field, a stamp the click writes the clock into, a hang button and a spin button. */
function hangForm(): Uint8Array {
  const body = [
    textField('name', 0),
    textField('stamp', 30),
    textField('tick', 60, click('stamp.rawValue = String(new Date().getTime());')),
    textField('hang', 90, click(HANG)),
    textField('spin', 120, click(SPIN)),
  ].join('');
  const template = tpl(body).replace('<subform name="form1">', '<subform name="form1" layout="tb">');
  return buildXfaPdf({ packets: [packet('template', template), packet('datasets', datasetsXml('<form1/>'))] });
}

const OPEN = { host: HOST, timezone: 'UTC', at: T0 } as const;
const GOOD_OPS: Op[] = [
  { kind: 'setValue', som: 'name', value: 'TEST PERSON', at: T0 },
  { kind: 'event', som: 'tick', activity: 'click', at: T1 },
];
const HANG_OP: Op = { kind: 'event', som: 'hang', activity: 'click', at: T2 };

async function expectWatchdogError(promise: Promise<unknown>): Promise<WatchdogError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof WatchdogError) return error;
    throw error;
  }
  throw new Error('expected the watchdog to surface a WatchdogError');
}

describe('A1: a hung form run is killed from outside and the session is rebuilt by replay', () => {
  it('the hang is a real native hang: the sandbox does not stop it, so only the watchdog can (the sandbox answers `aborted` to a JavaScript spin, and the worker is kept)', async () => {
    // Same client setup as the hang tests (watchdog deadline 2 s, engine budget 300 ms): the ONLY difference is the script.
    const watchdog = newWatchdog();
    expectKind(await watchdog.open({ pdf: hangForm(), ...OPEN }), 'opened');
    const stopped = await watchdog.op({ kind: 'event', som: 'spin', activity: 'click', at: T1 });
    expect(stopped.kind).toBe('aborted');
    expect(stopped.kind === 'aborted' && stopped.reason).toMatchObject({ code: 'SCRIPT_LIMIT', limit: 'deadline' });
    expect(watchdog.spawned).toBe(1);
    expect(watchdog.terminated).toBe(0);
    expect(watchdog.log).toEqual([]);
    // ...and the hang is the opposite: the sandbox does not answer, the watchdog kills. Together the pair proves the hang is native.
    const hanging = newWatchdog();
    expectKind(await hanging.open({ pdf: hangForm(), ...OPEN }), 'opened');
    const killed = await expectWatchdogError(hanging.op(HANG_OP));
    expect(killed.reason).toBe('deadline');
    expect(hanging.terminated).toBe(1);
    expect(hanging.spawned).toBe(2);
  }, 60_000);

  it('kills the hung worker, respawns, replays the log without the failing op, and names the op\'s field SOM; the rebuilt tree equals a session that never ran it', async () => {
    const pdf = hangForm();
    const watchdog = newWatchdog();
    expectKind(await watchdog.open({ pdf, ...OPEN }), 'opened');
    for (const op of GOOD_OPS) expectKind(await watchdog.op(op), 'applied');
    expect(watchdog.spawned).toBe(1);

    const error = await expectWatchdogError(watchdog.op(HANG_OP));

    // The error names the failing op's field and where it would have sat in the log.
    expect(error.reason).toBe('deadline');
    expect(error.requestKind).toBe('op');
    expect(error.opKind).toBe('event');
    expect(error.som).toBe('hang');
    expect(error.opIndex).toBe(GOOD_OPS.length);
    expect(error.message).toContain('hang');
    // The hung worker was terminated and exactly one fresh worker took its place; the failing op is not in the log.
    expect(watchdog.terminated).toBe(1);
    expect(watchdog.spawned).toBe(2);
    expect(watchdog.log).toEqual(GOOD_OPS);
    const rebuilt = expectKind(error.rebuilt as NonNullable<typeof error.rebuilt>, 'opened');
    expect(rebuilt.opCount).toBe(GOOD_OPS.length);

    // The oracle is a session that never saw the failing op, built by a different path (an in-process channel, ops in the open).
    const never = expectKind(await connect().send(openBody(pdf, { ops: GOOD_OPS })), 'opened');
    expect(rebuilt.renderTree).toEqual(never.renderTree);
    expect(rebuilt.report).toEqual(never.report);
    expect(textsOf(rebuilt.renderTree)).toContain('TEST PERSON');
    expect(textsOf(rebuilt.renderTree)).toContain(String(T1));
    // ...and the rebuilt worker is live: the same tree on request, then it takes the next op.
    expect(expectKind(await watchdog.send({ kind: 'layout' }), 'laidOut').renderTree).toEqual(never.renderTree);
    const next: Op = { kind: 'setValue', som: 'name', value: 'OTHER PERSON', at: T2 };
    expectKind(await watchdog.op(next), 'applied');
    expect(watchdog.log).toEqual([...GOOD_OPS, next]);
  }, 60_000);

  it('survives a second hang after the first: each kill terminates one worker and spawns one, the log keeps only what was applied', async () => {
    const watchdog = newWatchdog();
    expectKind(await watchdog.open({ pdf: hangForm(), ...OPEN }), 'opened');
    expectKind(await watchdog.op(GOOD_OPS[0] as Op), 'applied');
    const first = await expectWatchdogError(watchdog.op(HANG_OP));
    expectKind(await watchdog.op(GOOD_OPS[1] as Op), 'applied');
    const second = await expectWatchdogError(watchdog.op(HANG_OP));
    expect([first.opIndex, second.opIndex]).toEqual([1, 2]);
    expect(watchdog.spawned).toBe(3);
    expect(watchdog.terminated).toBe(2);
    expect(watchdog.log).toEqual(GOOD_OPS);
    expectKind(second.rebuilt as NonNullable<typeof second.rebuilt>, 'opened');
  }, 60_000);

  it('a hang in the very first open (no log to fall back on) stops the worker and reports it, with no rebuild; the client is then stopped and spawns nothing', async () => {
    const watchdog = newWatchdog({ openDeadlineMs: DEADLINE_MS }); // here the open IS the trigger
    const hangOnLoad = tpl(textField('go', 0, `<event activity="initialize"><script contentType="application/x-javascript">${esc(HANG)}</script></event>`)).replace('<subform name="form1">', '<subform name="form1" layout="tb">');
    const pdf = buildXfaPdf({ packets: [packet('template', hangOnLoad), packet('datasets', datasetsXml('<form1/>'))] });
    const error = await expectWatchdogError(watchdog.open({ pdf, ...OPEN }));
    expect(error.requestKind).toBe('open');
    expect(error.rebuilt).toBeNull();
    expect(watchdog.terminated).toBe(watchdog.spawned);
    // Contract rule 7: later requests reject at once and start nothing.
    const later = await expectWatchdogError(watchdog.send({ kind: 'layout' }));
    expect(later.reason).toBe('stopped');
    expect(watchdog.spawned).toBe(1);
    expect(watchdog.running).toBe(0);
  }, 60_000);

  it('dispose leaves no worker running: every worker the client started has been terminated', async () => {
    const watchdog = newWatchdog();
    expectKind(await watchdog.open({ pdf: hangForm(), ...OPEN }), 'opened');
    expect(watchdog.running).toBe(1);
    await watchdog.dispose();
    await watchdog.dispose();
    expect(watchdog.terminated).toBe(watchdog.spawned);
    expect(watchdog.running).toBe(0);
  });
});

describe('A1: the client serialises requests and ends cleanly (contract rules 4, 6, 7, 8, 9)', () => {
  it('two ops sent without awaiting: the first hangs, the second is `superseded` (not run, no kill of its own); one terminate, one spawn, the rebuilt worker stays usable', async () => {
    const watchdog = newWatchdog();
    expectKind(await watchdog.open({ pdf: hangForm(), ...OPEN }), 'opened');
    const first = watchdog.op(HANG_OP);
    const second = watchdog.op(GOOD_OPS[0] as Op);
    const [a, b] = await Promise.allSettled([first, second]);
    const killed = a.status === 'rejected' && a.reason instanceof WatchdogError ? a.reason : null;
    const dropped = b.status === 'rejected' && b.reason instanceof WatchdogError ? b.reason : null;
    expect(killed?.reason).toBe('deadline');
    expect(killed?.som).toBe('hang');
    expectKind(killed?.rebuilt as NonNullable<WatchdogError['rebuilt']>, 'opened');
    expect(dropped).toMatchObject({ reason: 'superseded', requestKind: 'op', opKind: 'setValue', som: 'name', opIndex: null, rebuilt: null });
    // Exactly one kill: one terminate, one spawn for the rebuild, and the rebuilt worker is the one still alive.
    expect(watchdog.terminated).toBe(1);
    expect(watchdog.spawned).toBe(2);
    expect(watchdog.running).toBe(1);
    expect(watchdog.spawned).toBe(watchdog.terminated + 1);
    // The superseded op was not run: it is not in the log. The rebuilt worker takes it when the caller resends it.
    expect(watchdog.log).toEqual([]);
    expectKind(await watchdog.op(GOOD_OPS[0] as Op), 'applied');
    expect(watchdog.log).toEqual([GOOD_OPS[0]]);
    expect(watchdog.spawned).toBe(2);
  }, 60_000);

  it('requests are answered one at a time, in the order sent', async () => {
    const watchdog = newWatchdog();
    expectKind(await watchdog.open({ pdf: hangForm(), ...OPEN }), 'opened');
    const replies = await Promise.all([watchdog.op(GOOD_OPS[0] as Op), watchdog.send({ kind: 'layout' }), watchdog.op(GOOD_OPS[1] as Op)]);
    expect(replies.map((reply) => reply.kind)).toEqual(['applied', 'laidOut', 'applied']);
    expect(watchdog.log).toEqual(GOOD_OPS);
    expect(watchdog.spawned).toBe(1);
  });

  it('a rebuild that cannot open stops the client: later requests reject as `stopped` at once and no third worker is started', async () => {
    // First open (no ops) gets the generous deadline; the rebuild replays one op and gets 1 ms, which no cold open can meet.
    const watchdog = newWatchdog({ openDeadlineMs: (opCount) => (opCount === 0 ? SLOW_OPEN_MS : 1) });
    expectKind(await watchdog.open({ pdf: hangForm(), ...OPEN }), 'opened');
    expectKind(await watchdog.op(GOOD_OPS[0] as Op), 'applied');
    const error = await expectWatchdogError(watchdog.op(HANG_OP));
    expect(error.reason).toBe('deadline');
    expect(error.rebuilt).toBeNull();
    expect(watchdog.spawned).toBe(2);
    expect(watchdog.terminated).toBe(2);
    expect(watchdog.running).toBe(0);
    const later = await Promise.allSettled([watchdog.op(GOOD_OPS[1] as Op), watchdog.send({ kind: 'layout' })]);
    for (const outcome of later) expect(outcome.status === 'rejected' && outcome.reason instanceof WatchdogError && outcome.reason.reason).toBe('stopped');
    expect(watchdog.spawned).toBe(2);
    // A new `open` is the way out: it starts one worker and works.
    const fresh = newWatchdog();
    expectKind(await fresh.open({ pdf: hangForm(), ...OPEN }), 'opened');
  }, 60_000);

  it('a request queued DURING the rebuild of a kill whose rebuild then fails is `stopped`, not run: no third worker (rule 7)', async () => {
    let later: Promise<unknown> | undefined;
    const watchdog: ReferenceWatchdog = newWatchdog({
      // Called when each `open` starts. The first (no ops) is generous; the rebuild (log length > 0) enqueues a request, then gets 1 ms so it fails.
      openDeadlineMs: (opCount) => {
        if (opCount === 0) return SLOW_OPEN_MS;
        later ??= watchdog.op(GOOD_OPS[1] as Op).then(() => null, (error: unknown) => error);
        return 1;
      },
    });
    expectKind(await watchdog.open({ pdf: hangForm(), ...OPEN }), 'opened');
    expectKind(await watchdog.op(GOOD_OPS[0] as Op), 'applied');
    const error = await expectWatchdogError(watchdog.op(HANG_OP));
    expect(error.rebuilt).toBeNull();
    const outcome = await later;
    expect(outcome).toBeInstanceOf(WatchdogError);
    expect(outcome instanceof WatchdogError && outcome.reason).toBe('stopped');
    expect(watchdog.spawned).toBe(2);
    expect(watchdog.terminated).toBe(2);
    expect(watchdog.running).toBe(0);
  }, 60_000);

  it('a request before any `open` rejects as `stopped` and starts nothing', async () => {
    const watchdog = newWatchdog();
    expect((await expectWatchdogError(watchdog.op(GOOD_OPS[0] as Op))).reason).toBe('stopped');
    expect(watchdog.spawned).toBe(0);
  });

  it('dispose settles what is in flight and what is waiting (reason `disposed`): no kill, no rebuild, nothing left pending', async () => {
    const watchdog = newWatchdog();
    expectKind(await watchdog.open({ pdf: hangForm(), ...OPEN }), 'opened');
    const inFlight = watchdog.op(HANG_OP);
    const waiting = watchdog.op(GOOD_OPS[0] as Op);
    const outcomes = Promise.allSettled([inFlight, waiting]);
    await watchdog.dispose();
    const settled = await outcomes;
    for (const outcome of settled) expect(outcome.status === 'rejected' && outcome.reason instanceof WatchdogError && outcome.reason.reason).toBe('disposed');
    expect(watchdog.spawned).toBe(1);
    expect(watchdog.terminated).toBe(1);
    expect(watchdog.running).toBe(0);
    expect((await expectWatchdogError(watchdog.send({ kind: 'layout' }))).reason).toBe('stopped');
  }, 30_000);
});

describe('W3G-2: snapshot and download have their own (heavy) deadline class (contract rule 3)', () => {
  it('the deadline class of each request kind: light (op, layout), open (by the ops it replays), heavy (snapshot, download; defaults to the open deadline of an empty log)', () => {
    const watchdog = newWatchdog({ requestDeadlineMs: 11, openDeadlineMs: (opCount) => 100 + opCount });
    expect(watchdog.deadlineMsFor('op')).toBe(11);
    expect(watchdog.deadlineMsFor('layout')).toBe(11);
    expect(watchdog.deadlineMsFor('open', 5)).toBe(105);
    expect(watchdog.deadlineMsFor('snapshot')).toBe(100);
    expect(watchdog.deadlineMsFor('download')).toBe(100);
    // A live preSave op runs the form's save handling over every node, like a download: the heavy class.
    expect(watchdog.deadlineMsFor('preSave')).toBe(100);
    expect(newWatchdog({ requestDeadlineMs: 11, openDeadlineMs: 77, heavyDeadlineMs: 33 }).deadlineMsFor('snapshot')).toBe(33);
    expect(new ReferenceWatchdog({ requestDeadlineMs: 11 }).deadlineMsFor('download')).toBe(11);
  });

  it('a snapshot and a download that outlast the per-request deadline are not killed while they are inside the heavy one', async () => {
    // The light deadline is 1 ms, which no snapshot (a save plus a second open and load of the form) can meet: only the heavy class lets them finish.
    const watchdog = newWatchdog({ requestDeadlineMs: 1, heavyDeadlineMs: SLOW_OPEN_MS });
    expectKind(await watchdog.open({ pdf: hangForm(), ...OPEN }), 'opened');
    expectKind(await watchdog.send({ kind: 'snapshot', at: T1 }), 'snapshotted');
    expectKind(await watchdog.send({ kind: 'download', at: T1 }), 'downloaded');
    expect(watchdog.spawned).toBe(1);
    expect(watchdog.terminated).toBe(0);
  }, 60_000);
});

describe('W3G-3: an `open` that replaces a live session keeps the prior session until `opened` arrives (contract rule 7)', () => {
  /** A form whose load hangs the worker natively. */
  const hangOnLoadPdf = (): Uint8Array => {
    const template = tpl(textField('go', 0, `<event activity="initialize"><script contentType="application/x-javascript">${esc(HANG)}</script></event>`)).replace('<subform name="form1">', '<subform name="form1" layout="tb">');
    return buildXfaPdf({ packets: [packet('template', template), packet('datasets', datasetsXml('<form1/>'))] });
  };
  /** The initial open replays two ops (generous deadline); the rebase open replays none (the short trigger); the restore replays the log again (generous). */
  const rebaseWatchdog = (): ReferenceWatchdog => newWatchdog({ openDeadlineMs: (opCount) => (opCount === 0 ? DEADLINE_MS : SLOW_OPEN_MS), heavyDeadlineMs: SLOW_OPEN_MS });

  it('a rebase open that succeeds replaces the base and starts the log again at 0', async () => {
    const watchdog = rebaseWatchdog();
    expectKind(await watchdog.open({ pdf: hangForm(), ...OPEN }, GOOD_OPS), 'opened');
    const snap = expectKind(await watchdog.send({ kind: 'snapshot', at: T2 }), 'snapshotted');
    expect(snap.faithful).toBe(true);
    const rebased = expectKind(await watchdog.open({ pdf: snap.bytes, ...OPEN, at: T2 }, []), 'opened');
    expect(rebased.opCount).toBe(0);
    expect(watchdog.log).toEqual([]);
    expect(textsOf(rebased.renderTree)).toContain('TEST PERSON');
    const next: Op = { kind: 'setValue', som: 'name', value: 'OTHER PERSON', at: T2 };
    expectKind(await watchdog.op(next), 'applied');
    expect(watchdog.log).toEqual([next]);
  }, 60_000);

  it('a rebase open that hangs: the prior session is rebuilt from the prior base and log, the log is intact, and the error says so', async () => {
    const pdf = hangForm();
    const watchdog = rebaseWatchdog();
    expectKind(await watchdog.open({ pdf, ...OPEN }, GOOD_OPS), 'opened');
    const error = await expectWatchdogError(watchdog.open({ pdf: hangOnLoadPdf(), ...OPEN }, []));
    expect(error).toMatchObject({ reason: 'deadline', requestKind: 'open' });
    const restored = expectKind(error.rebuilt as NonNullable<typeof error.rebuilt>, 'opened');
    expect(restored.opCount).toBe(GOOD_OPS.length);
    expect(watchdog.log).toEqual(GOOD_OPS);
    // The prior session, not the hanging form: the oracle is a session that replays the same log.
    const never = expectKind(await connect().send(openBody(pdf, { ops: GOOD_OPS })), 'opened');
    expect(restored.renderTree).toEqual(never.renderTree);
    // initial worker, the rebase worker (killed), the restoring worker.
    expect(watchdog.spawned).toBe(3);
    expect(watchdog.terminated).toBe(2);
    expect(watchdog.running).toBe(1);
    // ...and it is live and not stopped.
    const next: Op = { kind: 'setValue', som: 'name', value: 'OTHER PERSON', at: T2 };
    expectKind(await watchdog.op(next), 'applied');
    expect(watchdog.log).toEqual([...GOOD_OPS, next]);
  }, 60_000);

  it('a rebase open answered `failed`: the failure is returned as received, the prior session is reopened on the same worker, the log is intact', async () => {
    const pdf = hangForm();
    const watchdog = rebaseWatchdog();
    expectKind(await watchdog.open({ pdf, ...OPEN }, GOOD_OPS), 'opened');
    const failed = expectKind(await watchdog.open({ pdf: new Uint8Array([1, 2, 3]), ...OPEN }, []), 'failed');
    expect(failed.code).toBe('MALFORMED');
    const restored = expectKind(watchdog.lastRestore as NonNullable<typeof watchdog.lastRestore>, 'opened');
    expect(restored.opCount).toBe(GOOD_OPS.length);
    expect(watchdog.log).toEqual(GOOD_OPS);
    const never = expectKind(await connect().send(openBody(pdf, { ops: GOOD_OPS })), 'opened');
    expect(restored.renderTree).toEqual(never.renderTree);
    // initial worker and the rebase worker; the restore reused the rebase worker.
    expect(watchdog.spawned).toBe(2);
    expect(watchdog.terminated).toBe(1);
    expect(watchdog.running).toBe(1);
    const next: Op = { kind: 'setValue', som: 'name', value: 'OTHER PERSON', at: T2 };
    expectKind(await watchdog.op(next), 'applied');
    expect(watchdog.log).toEqual([...GOOD_OPS, next]);
  }, 60_000);

  it('only a FIRST open (no live session before it) stops when it fails: later requests are `stopped`, and no prior session is invented', async () => {
    const watchdog = newWatchdog({ openDeadlineMs: DEADLINE_MS });
    const error = await expectWatchdogError(watchdog.open({ pdf: hangOnLoadPdf(), ...OPEN }));
    expect(error.rebuilt).toBeNull();
    expect(watchdog.log).toEqual([]);
    expect((await expectWatchdogError(watchdog.send({ kind: 'layout' }))).reason).toBe('stopped');
    expect(watchdog.spawned).toBe(1);
    // After a stop, an open is a first open again: its failure does not resurrect the session that was stopped.
    const again = await expectWatchdogError(watchdog.open({ pdf: hangOnLoadPdf(), ...OPEN }));
    expect(again.rebuilt).toBeNull();
    expect(watchdog.running).toBe(0);
  }, 60_000);
});

describe('W3G-R1: a download joins the log on `downloaded` (contract rule 2)', () => {
  it('with a pack the download\'s preSave entry is appended, and a kill after it rebuilds the form the download saved', async () => {
    const pdf = clockLayoutPdf();
    const watchdog = newWatchdog();
    const open = { pdf, ...OPEN, pack: REMOVING_PACK };
    expectKind(await watchdog.open(open), 'opened');
    const set: Op = { kind: 'setValue', som: 'name', value: 'A', at: T1 };
    expectKind(await watchdog.op(set), 'applied');
    const downloaded = expectKind(await watchdog.send({ kind: 'download', at: T2 }), 'downloaded');
    expect(downloaded.op).toEqual({ kind: 'preSave', at: T2 });
    expect(watchdog.log).toEqual([set, { kind: 'preSave', at: T2 }]);
    const live = expectKind(await watchdog.send({ kind: 'layout' }), 'laidOut').renderTree;
    // Rebuild from the log: the replayed worker shows what the live one showed after the download.
    const rebuilt = expectKind(await watchdog.open(open, watchdog.log), 'opened');
    expect(rebuilt.opCount).toBe(2);
    expect(rebuilt.renderTree).toEqual(live);
    expect(textsOf(rebuilt.renderTree)).toContain('saved');
  }, 60_000);
});

describe('W3G-R2: an `open` answered with anything but `opened` (contract rule 7)', () => {
  const garbage = (): Uint8Array => new Uint8Array([1, 2, 3]);

  it('over a live session, with a restore that fails too: the client stops and the caller gets a WatchdogError (rebuilt null); a request queued behind is superseded', async () => {
    // Initial open replays no ops and the garbage open is answered at once (generous); the restore replays the log (> 0 ops) with 1 ms, which no cold open meets.
    const watchdog = newWatchdog({ openDeadlineMs: (opCount) => (opCount === 0 ? SLOW_OPEN_MS : 1) });
    expectKind(await watchdog.open({ pdf: hangForm(), ...OPEN }), 'opened');
    expectKind(await watchdog.op(GOOD_OPS[0] as Op), 'applied');
    const refused = watchdog.open({ pdf: garbage(), ...OPEN }, []);
    const queued = watchdog.send({ kind: 'layout' });
    const [a, b] = await Promise.allSettled([refused, queued]);
    const error = a.status === 'rejected' && a.reason instanceof WatchdogError ? a.reason : null;
    expect(error).toMatchObject({ reason: 'refused', requestKind: 'open', rebuilt: null });
    expect(b.status === 'rejected' && b.reason instanceof WatchdogError && b.reason.reason).toBe('superseded');
    expect(watchdog.running).toBe(0);
    expect((await expectWatchdogError(watchdog.send({ kind: 'layout' }))).reason).toBe('stopped');
  }, 60_000);

  it('as a FIRST open (nothing to restore): the reply is returned as received, the client stops, and a request queued behind is superseded', async () => {
    const watchdog = newWatchdog();
    const first = watchdog.open({ pdf: garbage(), ...OPEN });
    const queued = watchdog.send({ kind: 'layout' });
    const [a, b] = await Promise.allSettled([first, queued]);
    expect(a.status === 'fulfilled' && expectKind(a.value, 'failed').code).toBe('MALFORMED');
    expect(b.status === 'rejected' && b.reason instanceof WatchdogError && b.reason.reason).toBe('superseded');
    expect(watchdog.running).toBe(0);
    expect((await expectWatchdogError(watchdog.send({ kind: 'layout' }))).reason).toBe('stopped');
    // A new open is the way out.
    expectKind(await watchdog.open({ pdf: hangForm(), ...OPEN }), 'opened');
  }, 60_000);
});

describe('W3G-R3: the rebase reopens with the answers of the open that built the run', () => {
  it('rebase(at) snapshots and reopens with the same answers: a form that asks while it loads is rebased, not `answerRequired`', async () => {
    const watchdog = newWatchdog();
    const opened = expectKind(await watchdog.open({ pdf: loadAskPdf(), ...OPEN, answers: [1] }), 'opened');
    expect(textsOf(opened.renderTree)).toContain('yes');
    const rebased = expectKind(await watchdog.rebase(T0), 'opened');
    expect(rebased.opCount).toBe(0);
    expect(textsOf(rebased.renderTree)).toContain('yes');
    expect(watchdog.log).toEqual([]);
    // ...and the rebased run snapshots faithfully again (the answers stay with the new base).
    expect(expectKind(await watchdog.send({ kind: 'snapshot', at: T0 }), 'snapshotted').faithful).toBe(true);
  }, 60_000);

  it('the reopen without the answers is `answerRequired` (why the contract says to carry them)', async () => {
    const watchdog = newWatchdog();
    expectKind(await watchdog.open({ pdf: loadAskPdf(), ...OPEN, answers: [1] }), 'opened');
    const snap = expectKind(await watchdog.send({ kind: 'snapshot', at: T0 }), 'snapshotted');
    expect(snap.faithful).toBe(true);
    expectKind(await watchdog.open({ pdf: snap.bytes, ...OPEN }, []), 'answerRequired');
  }, 60_000);

  it('a snapshot that is not faithful is returned as received and nothing is rebased (the log and the session stay)', async () => {
    const watchdog = newWatchdog();
    expectKind(await watchdog.open({ pdf: clockLayoutPdf(), ...OPEN }), 'opened');
    const set: Op = { kind: 'setValue', som: 'name', value: 'A', at: T1 };
    expectKind(await watchdog.op(set), 'applied');
    // The form stamps the clock of its last layout (T1): reopening under T2 differs.
    expect(expectKind(await watchdog.rebase(T2), 'snapshotted').faithful).toBe(false);
    expect(watchdog.log).toEqual([set]);
    expect(watchdog.spawned).toBe(1);
    expectKind(await watchdog.send({ kind: 'layout' }), 'laidOut');
  }, 60_000);
});
