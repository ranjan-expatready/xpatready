import { describe, expect, it } from 'vitest';
import { createFormRuntime } from '../../runtime/runtime.js';
import type { EventFields } from '../../runtime/options.js';
import { openXfaPdf } from '../../xfa-pdf.js';
import type { Op } from '../../worker/protocol.js';
import { connect, expectKind, openBody, textsOf } from '../../worker/__tests__/support.js';
import { applyFixture, loadFixture, loadPack } from '../fixtures/form-data/apply.js';
import { canonicalSom, corpusPdf, FORM_CASES, NOON_UTC, TEST_HOST, type FormCase } from './form-cases.js';

/** W03-T14 on the real forms, over a `MessageChannel`: the fixture as an op log, Validate, download, Clear Form by answer, replay. */

const AT = NOON_UTC;
/** Vitest's per-test timeout is a budget for slow machines, never an assertion about speed. */
const BUDGET_MS = 300_000;
const CLEAR_FORM_TEXT = 'Clearing Form will erase all data entered on the form, do you wish to continue?';
/**
 * The Clear Form button of both corpus forms. Read from the templates (template packet, `Page1.ButtonsHeader`): the subform
 * holds two fields that are both named `ValidateButton` (at x = 86.36mm and x = 172.72mm); only the second one's click
 * script calls `messageBox(Clear_Form_ENU, Confirmation_ENU, 2, 1)` and clears the form, so its SOM is the index [1]. The
 * Pack's `validateButton` is the first one, [0]; this constant does not derive from it.
 */
const CLEAR_FORM_BUTTON = 'Page1.ButtonsHeader.ValidateButton[1]';

/** The fixture as the ops a viewer would log: `applyFixture` drives a recording stand-in, so the sequence is the fixture helper's own. */
async function fixtureOps(c: FormCase): Promise<Op[]> {
  const pdf = await corpusPdf(c.file);
  const runtime = await createFormRuntime(pdf, { host: TEST_HOST, clock: { now: () => AT } });
  runtime.load();
  const ops: Op[] = [];
  const recording = new Proxy(runtime, {
    get(target, member) {
      if (member === 'setValue') {
        return (som: string, value: string | number | boolean | null) => {
          ops.push({ kind: 'setValue', som, value, at: AT });
          return target.setValue(som, value);
        };
      }
      if (member === 'event') {
        return (som: string, activity: string, fields?: EventFields) => {
          ops.push({ kind: 'event', som, activity: activity as Extract<Op, { kind: 'event' }>['activity'], ...(fields === undefined ? {} : { fields }), at: AT });
          return target.event(som, activity, fields);
        };
      }
      const value: unknown = Reflect.get(target, member);
      return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(target) : value;
    },
  });
  applyFixture(recording, loadFixture(c.form));
  runtime.dispose();
  return ops;
}

const pdfBytes = async (c: FormCase): Promise<Uint8Array> => (await corpusPdf(c.file)).source;

describe.each(FORM_CASES)('A1: the fixture as ops over a MessageChannel on real form $file', (c) => {
  it('opens, applies the synthetic person op by op, Validate completes with the form\'s own flag, the download reopens with every value and the same barcodes', async () => {
    const client = connect();
    const pack = loadPack(c.form);
    const ops = await fixtureOps(c);
    expect(ops.length).toBeGreaterThan(Object.keys(loadFixture(c.form)).length);
    const opened = expectKind(await client.send(openBody(await pdfBytes(c), { pack, at: AT })), 'opened');
    expect(opened.renderTree.pages.length).toBeGreaterThan(1);
    expect(opened.renderTree.resources.fonts.some((font) => font.bytes.length > 0)).toBe(true);
    for (const op of ops) expectKind(await client.send({ kind: 'op', op }), 'applied');
    const validated = expectKind(await client.send({ kind: 'op', op: { kind: 'validate', at: AT } }), 'applied');
    expect(validated.validation).toMatchObject({ complete: true, flag: pack.validatedValue, firstMissingField: null });

    const downloaded = expectKind(await client.send({ kind: 'download', at: AT }), 'downloaded');
    expect(downloaded.validated).toBe(true);
    const again = await createFormRuntime(await openXfaPdf(downloaded.bytes), { host: TEST_HOST, clock: { now: () => AT } });
    try {
      again.load();
      for (const [som, value] of Object.entries(loadFixture(c.form))) expect(String(again.getValue(`${canonicalSom(som)}.dataNode`)), som).toBe(String(value));
      expect(again.getValue(pack.validatedFlag)).toBe(pack.validatedValue);
      const encoded = again.encodeBarcodes(pack);
      expect(encoded.validated).toBe(true);
      expect(encoded.payloads.map((p) => String(p).length)).toEqual(c.payloadLengths);
    } finally {
      again.dispose();
    }
  }, BUDGET_MS);

  it('the incomplete form: Validate reports the form\'s own first missing field and the form\'s message', async () => {
    const client = connect();
    const pack = loadPack(c.form);
    expectKind(await client.send(openBody(await pdfBytes(c), { pack, at: AT })), 'opened');
    const validated = expectKind(await client.send({ kind: 'op', op: { kind: 'validate', at: AT } }), 'applied');
    expect(validated.validation).toMatchObject({ complete: false });
    expect(validated.validation?.firstMissingField).toContain(c.firstMissingBlank.split('.').slice(-1)[0] ?? '');
    expect(validated.messages.length).toBeGreaterThan(0);
  }, BUDGET_MS);
});

describe.each(FORM_CASES)('A2: Clear Form on real form $file is a choice box answered by replay', (c) => {
  const pack = loadPack(c.form);
  const clear = CLEAR_FORM_BUTTON;
  const fill: Op[] = [{ kind: 'setValue', som: 'Page1.PersonalDetails.Name.FamilyName', value: 'TESTPERSON', at: AT }];

  it('without an answer the op is answerRequired with the form\'s own text and the Confirmation title; the session then wants a rebuild', async () => {
    const client = connect();
    expectKind(await client.send(openBody(await pdfBytes(c), { pack, at: AT })), 'opened');
    const asked = expectKind(await client.send({ kind: 'op', op: { kind: 'event', som: clear, activity: 'click', at: AT } }), 'answerRequired');
    expect(asked.opIndex).toBeNull();
    // Oracle: the form's own script and message table (both corpus templates): messageBox(Clear_Form_ENU, Confirmation_ENU, 2, 1), and `button == 1` ("1 is the OK Button") clears.
    expect(asked.call).toEqual({ text: CLEAR_FORM_TEXT, title: 'Confirmation', icon: 2, buttons: 1 });
    expect(expectKind(await client.send({ kind: 'layout' }), 'failed').code).toBe('NEEDS_REBUILD');
  }, BUDGET_MS);

  it('replayed with answers [1] (the number the form\'s own script tests for) the form clears and raises its completion box; with [2] (any other number) it takes its other branch and nothing is cleared', async () => {
    const bytes = await pdfBytes(c);
    const client = connect();
    const asked = expectKind(await client.send(openBody(bytes, { pack, at: AT, ops: [...fill, { kind: 'event', som: clear, activity: 'click', at: AT }] })), 'answerRequired');
    expect(asked.opIndex).toBe(1);

    const cleared = expectKind(await client.send(openBody(bytes, { pack, at: AT, ops: [...fill, { kind: 'event', som: clear, activity: 'click', at: AT, answers: [1] }] })), 'opened');
    const kept = expectKind(await connect().send(openBody(bytes, { pack, at: AT, ops: [...fill, { kind: 'event', som: clear, activity: 'click', at: AT, answers: [2] }] })), 'opened');
    expect(textsOf(kept.renderTree)).toContain('TESTPERSON');
    expect(textsOf(cleared.renderTree)).not.toContain('TESTPERSON');

    // The same, live: the boxes and their results are what the op raised. OK-only boxes need no answer.
    const live = connect();
    expectKind(await live.send(openBody(bytes, { pack, at: AT, ops: fill })), 'opened');
    const ok = expectKind(await live.send({ kind: 'op', op: { kind: 'event', som: clear, activity: 'click', at: AT, answers: [1] } }), 'applied');
    expect(ok.messages.map((m) => [m.text, m.buttons, m.result])).toEqual([[CLEAR_FORM_TEXT, 1, 1], ['Clear Form Complete', 0, 1]]);
    const other = connect();
    expectKind(await other.send(openBody(bytes, { pack, at: AT, ops: fill })), 'opened');
    const cancel = expectKind(await other.send({ kind: 'op', op: { kind: 'event', som: clear, activity: 'click', at: AT, answers: [2] } }), 'applied');
    expect(cancel.messages.map((m) => [m.text, m.buttons, m.result])).toEqual([[CLEAR_FORM_TEXT, 1, 2]]);
  }, BUDGET_MS);
});

describe.each(FORM_CASES)('F2c: a snapshot rebases the op log on real form $file', (c) => {
  it('open(snapshot bytes, ops: []) reproduces the live session\'s render tree and datasets, and its log starts again at 0', async () => {
    const pack = loadPack(c.form);
    const bytes = await pdfBytes(c);
    const ops = await fixtureOps(c);
    const live = connect();
    expectKind(await live.send(openBody(bytes, { pack, at: AT })), 'opened');
    for (const op of ops) expectKind(await live.send({ kind: 'op', op }), 'applied');
    const liveTree = expectKind(await live.send({ kind: 'layout' }), 'laidOut').renderTree;
    const snapped = expectKind(await live.send({ kind: 'snapshot', at: AT }), 'snapshotted');
    // Verified by the session: reopening these bytes reproduced its render tree and datasets, so a client may rebase on them.
    expect(snapped.faithful).toBe(true);
    const snapshot = snapped.bytes;

    const rebased = connect();
    const reopened = expectKind(await rebased.send(openBody(snapshot, { pack, at: AT, ops: [] })), 'opened');
    expect(reopened.opCount).toBe(0);
    expect(reopened.renderTree).toEqual(liveTree);
    const again = expectKind(await rebased.send({ kind: 'snapshot', at: AT }), 'snapshotted').bytes;
    expect((await openXfaPdf(again)).packet('datasets').text()).toBe((await openXfaPdf(snapshot)).packet('datasets').text());
    // Further ops on the rebased session agree with the same ops on the live one.
    const next: Op = { kind: 'setValue', som: 'Page1.PersonalDetails.Name.FamilyName', value: 'OTHERPERSON', at: AT };
    expect(textsOf(expectKind(await rebased.send({ kind: 'op', op: next }), 'applied').renderTree ?? liveTree)).toEqual(textsOf(expectKind(await live.send({ kind: 'op', op: next }), 'applied').renderTree ?? liveTree));
  }, BUDGET_MS);
});

describe.each(FORM_CASES)('A3: replay determinism on real form $file', (c) => {
  it('the same ops on two fresh sessions give a deep-equal render tree and identical datasets text; a live session that applied them op by op agrees', async () => {
    const pack = loadPack(c.form);
    const bytes = await pdfBytes(c);
    const ops = await fixtureOps(c);
    const first = expectKind(await connect().send(openBody(bytes, { pack, at: AT, ops })), 'opened');
    const second = expectKind(await connect().send(openBody(bytes, { pack, at: AT, ops })), 'opened');
    expect(second.renderTree).toEqual(first.renderTree);
    expect(second.report).toEqual(first.report);

    const live = connect();
    await live.send(openBody(bytes, { pack, at: AT }));
    for (const op of ops) await live.send({ kind: 'op', op });
    const laid = expectKind(await live.send({ kind: 'layout' }), 'laidOut');
    expect(laid.renderTree).toEqual(first.renderTree);

    // Identical datasets text: the data the download writes back is the same bytes for the replayed and the live session.
    const replayed = connect();
    await replayed.send(openBody(bytes, { pack, at: AT, ops }));
    const a = expectKind(await replayed.send({ kind: 'download', at: AT }), 'downloaded').bytes;
    const b = expectKind(await live.send({ kind: 'download', at: AT }), 'downloaded').bytes;
    const [pa, pb] = [await openXfaPdf(a), await openXfaPdf(b)];
    expect(pa.packet('datasets').text()).toBe(pb.packet('datasets').text());
    expect(Buffer.compare(a, b)).toBe(0);
  }, BUDGET_MS);

  it('the render tree\'s shared resource bytes survive every reply: two layouts after a download still carry the same font bytes', async () => {
    const client = connect();
    const bytes = await pdfBytes(c);
    expectKind(await client.send(openBody(bytes, { at: AT })), 'opened');
    const one = expectKind(await client.send({ kind: 'layout' }), 'laidOut').renderTree;
    expectKind(await client.send({ kind: 'download', at: AT }), 'downloaded');
    const two = expectKind(await client.send({ kind: 'layout' }), 'laidOut').renderTree;
    expect(two.resources.fonts.map((f) => f.bytes.length)).toEqual(one.resources.fonts.map((f) => f.bytes.length));
    expect(one.resources.fonts.some((f) => f.bytes.length > 0)).toBe(true);
  }, BUDGET_MS);
});

describe.each(FORM_CASES)('W3G-R1: the download\'s preSave handling is in the log, on real form $file', (c) => {
  it('ops + validate + the preSave entry the download returned, replayed on a fresh session, give the live session\'s render tree and datasets; a snapshot after it is faithful', async () => {
    const pack = loadPack(c.form);
    const bytes = await pdfBytes(c);
    const ops: Op[] = [...(await fixtureOps(c)), { kind: 'validate', at: AT }];
    const live = connect();
    expectKind(await live.send(openBody(bytes, { pack, at: AT, ops })), 'opened');
    const downloaded = expectKind(await live.send({ kind: 'download', at: AT }), 'downloaded');
    expect(downloaded.op).toEqual({ kind: 'preSave', at: AT });
    const liveTree = expectKind(await live.send({ kind: 'layout' }), 'laidOut').renderTree;
    const liveSnap = expectKind(await live.send({ kind: 'snapshot', at: AT }), 'snapshotted');

    const replayed = connect();
    const opened = expectKind(await replayed.send(openBody(bytes, { pack, at: AT, ops: [...ops, downloaded.op as Op] })), 'opened');
    expect(opened.opCount).toBe(ops.length + 1);
    expect(opened.renderTree).toEqual(liveTree);
    const replaySnap = expectKind(await replayed.send({ kind: 'snapshot', at: AT }), 'snapshotted');
    expect((await openXfaPdf(replaySnap.bytes)).packet('datasets').text()).toBe((await openXfaPdf(liveSnap.bytes)).packet('datasets').text());
    expect(Buffer.compare(replaySnap.bytes, liveSnap.bytes)).toBe(0);
    // The form's own restore puts the barcode values back and the calculates settle after it, so a snapshot after a download reopens exactly.
    expect(liveSnap.faithful).toBe(true);
    expect(replaySnap.faithful).toBe(liveSnap.faithful);
    // Both sessions download the same file from here on.
    const again = expectKind(await replayed.send({ kind: 'download', at: AT }), 'downloaded');
    const liveAgain = expectKind(await live.send({ kind: 'download', at: AT }), 'downloaded');
    expect(Buffer.compare(again.bytes, liveAgain.bytes)).toBe(0);
  }, BUDGET_MS);
});
