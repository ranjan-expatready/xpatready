import { describe, expect, it } from 'vitest';
import { buildXfaPdf, packet } from '../../__tests__/fixtures/build-xfa-pdf.js';
import { buildSyntheticPdf, SYNTHETIC_PACK, syntheticDatasets, syntheticTemplate } from '../../__tests__/fixtures/synthetic-form.js';
import { openXfaPdf } from '../../xfa-pdf.js';
import { MAX_OPS_PER_OPEN } from '../limits.js';
import { connect, expectKind, loadAskPdf, openBody, REMOVING_PACK, removingValidatePdf, SOM, syntheticPdf, T0, T1, T2, textsOf } from './support.js';

const pdf = syntheticPdf();
const setName = (value: string, at = T0): Record<string, unknown> => ({ kind: 'setValue', som: SOM.name, value, at });

describe('opCount: the length of the op log the session holds (F2b)', () => {
  it('opened carries the ops replayed; every applied op adds one; a refused op adds none', async () => {
    const client = connect();
    const opened = expectKind(await client.send(openBody(pdf, { ops: [setName('A'), setName('B')] })), 'opened');
    expect(opened.opCount).toBe(2);
    expect(expectKind(await client.send({ kind: 'op', op: setName('C') }), 'applied').opCount).toBe(3);
    expectKind(await client.send({ kind: 'op', op: { kind: 'setValue', som: 'no.such', value: 'x', at: T0 } }), 'failed');
    expect(expectKind(await client.send({ kind: 'op', op: setName('D') }), 'applied').opCount).toBe(4);
    expect(expectKind(await client.send(openBody(pdf, {})), 'failed').code).toBe('ALREADY_OPEN');
    await client.send({ kind: 'dispose' });
    expect(expectKind(await client.send(openBody(pdf)), 'opened').opCount).toBe(0);
  });
});

describe('snapshot: the state as PDF bytes, to rebase the op log (F2c)', () => {
  const pack = SYNTHETIC_PACK;
  const synthetic = buildSyntheticPdf();
  const ops = [
    { kind: 'setValue', som: 'Details.Name', value: 'Test Person', at: T1 },
    { kind: 'setValue', som: 'Details.Notes', value: 'a note', at: T2 },
    { kind: 'validate', at: T2 },
  ];

  it('refuses before open and after an abort, like download', async () => {
    const client = connect();
    expect(expectKind(await client.send({ kind: 'snapshot', at: T2 }), 'failed').code).toBe('NOT_OPEN');
  });

  // Data and clock-driven state only: no Validate (see the next test for what a snapshot of a PDF without a `form` packet cannot keep).
  const dataOps = ops.filter((op) => op.kind === 'setValue');

  it('open(snapshot bytes, ops: []) gives the render tree and datasets of the live session; the log starts again at 0', async () => {
    const live = connect();
    expectKind(await live.send(openBody(synthetic, { pack, at: T0 })), 'opened');
    for (const op of [...dataOps, { kind: 'event', som: 'Details.Name', activity: 'exit', at: T2 }]) expectKind(await live.send({ kind: 'op', op }), 'applied');
    const liveTree = expectKind(await live.send({ kind: 'layout' }), 'laidOut').renderTree;
    const snap = expectKind(await live.send({ kind: 'snapshot', at: T2 }), 'snapshotted');
    expect(snap.bytes.length).toBeGreaterThan(0);
    // Verified, not assumed: reopening these bytes (data and clock state only, no form packet needed) reproduces the live session.
    expect(snap.faithful).toBe(true);

    const rebased = connect();
    const reopened = expectKind(await rebased.send(openBody(snap.bytes, { pack, at: T2, ops: [] })), 'opened');
    expect(reopened.opCount).toBe(0);
    expect(reopened.renderTree).toEqual(liveTree);
    const again = expectKind(await rebased.send({ kind: 'snapshot', at: T2 }), 'snapshotted');
    expect((await openXfaPdf(again.bytes)).packet('datasets').text()).toBe((await openXfaPdf(snap.bytes)).packet('datasets').text());
  });

  it('KNOWN LIMIT: a PDF with no `form` packet keeps no script-set UI state in a snapshot, and says faithful:false (the barcode field Validate shows is lost on reopen); the corpus forms have the packet and rebase exactly', async () => {
    const live = connect();
    expectKind(await live.send(openBody(synthetic, { pack, at: T0 })), 'opened');
    for (const op of ops) expectKind(await live.send({ kind: 'op', op }), 'applied');
    const liveTree = expectKind(await live.send({ kind: 'layout' }), 'laidOut').renderTree;
    const snap = expectKind(await live.send({ kind: 'snapshot', at: T2 }), 'snapshotted');
    const reopened = expectKind(await connect().send(openBody(snap.bytes, { pack, at: T2, ops: [] })), 'opened');
    const barcodes = (tree: typeof liveTree): number => tree.pages.flatMap((page) => page.items).filter((item) => item.kind === 'field' && item.widget === 'barcode').length;
    expect(barcodes(liveTree)).toBe(1);
    expect(barcodes(reopened.renderTree)).toBe(0);
    // The reply says so: reopening these bytes does not reproduce this session, so a client must not rebase on them.
    expect(snap.faithful).toBe(false);
    // Everything that is data is kept.
    expect(textsOf(reopened.renderTree)).toContain('Test Person');
  });

  it('does not run the form\'s preSave (no barcode value is written), unlike download; the session stays usable and the engine\'s buffers are not handed over', async () => {
    const client = connect();
    expectKind(await client.send(openBody(synthetic, { pack, at: T0 })), 'opened');
    for (const op of ops) expectKind(await client.send({ kind: 'op', op }), 'applied');
    const first = expectKind(await client.send({ kind: 'snapshot', at: T2 }), 'snapshotted');
    const datasets = (await openXfaPdf(first.bytes)).packet('datasets').text();
    expect(datasets).not.toContain('SAMPLE|');
    const downloaded = expectKind(await client.send({ kind: 'download', at: T2 }), 'downloaded');
    expect((await openXfaPdf(downloaded.bytes)).packet('datasets').text()).toContain('SAMPLE|Test Person');
    const second = expectKind(await client.send({ kind: 'snapshot', at: T2 }), 'snapshotted');
    expect((await openXfaPdf(second.bytes)).packet('datasets').text()).toContain('SAMPLE|Test Person');
    expect(first.bytes.buffer).not.toBe(second.bytes.buffer);
    expectKind(await client.send({ kind: 'op', op: setName('x') }), 'failed');
  });
});

describe('a choice box raised by the open itself (F4)', () => {
  const asking = loadAskPdf();

  it('without answers the open is answerRequired with opIndex null and the box text; the session wants a rebuild', async () => {
    const client = connect();
    const asked = expectKind(await client.send(openBody(asking)), 'answerRequired');
    expect(asked).toMatchObject({ call: { text: 'Load now?', title: 'Confirm', icon: 2, buttons: 1 }, opIndex: null });
    expect(expectKind(await client.send({ kind: 'layout' }), 'failed').code).toBe('NEEDS_REBUILD');
  });

  it('with the answer the open succeeds and the form reads it; the open\'s answers are not the ops\' answers', async () => {
    const client = connect();
    const yes = expectKind(await client.send(openBody(asking, { answers: [1] })), 'opened');
    expect(textsOf(yes.renderTree)).toContain('yes');
    await client.send({ kind: 'dispose' });
    const no = expectKind(await client.send(openBody(asking, { answers: [2] })), 'opened');
    expect(textsOf(no.renderTree)).toContain('no');
  });
});

describe('the pack is probed at open (F6)', () => {
  const synthetic = buildSyntheticPdf();

  it.each(['validateButton', 'validatedFlag', 'firstMissingField', 'barcodes'] as const)('a pack whose %s names no node fails the open, before any op, naming the key', async (key) => {
    const client = connect();
    const failed = expectKind(await client.send(openBody(synthetic, { pack: { ...SYNTHETIC_PACK, [key]: 'No.Such.Node' }, at: T0, ops: [setName('x')] })), 'failed');
    expect(failed.code).toBe('PACK_UNRESOLVED');
    expect(failed.message).toContain(key);
    expect(failed.opIndex).toBeUndefined();
    expect(expectKind(await client.send({ kind: 'layout' }), 'failed').code).toBe('NOT_OPEN');
  });

  it('a pack whose nodes resolve opens, and Validate works', async () => {
    const client = connect();
    expectKind(await client.send(openBody(synthetic, { pack: SYNTHETIC_PACK, at: T0 })), 'opened');
    const applied = expectKind(await client.send({ kind: 'op', op: { kind: 'validate', at: T0 } }), 'applied');
    expect(applied.validation).toMatchObject({ complete: false });
  });

  it('an engine error after the click of a validate op ends the run (aborted, rebuild), never a kept-run failed', async () => {
    const client = connect();
    expectKind(await client.send(openBody(removingValidatePdf(), { pack: REMOVING_PACK, at: T0 })), 'opened');
    const reply = await client.send({ kind: 'op', op: { kind: 'validate', at: T0 } });
    expect(reply.kind).toBe('aborted');
    expect(expectKind(await client.send({ kind: 'layout' }), 'failed').code).toBe('NEEDS_REBUILD');
  });
});

describe('LOG_FULL: the session takes no op beyond the ceiling (F2)', () => {
  it('at MAX_OPS_PER_OPEN an op is refused with the run kept and nothing applied; snapshot works; the rebase resets opCount to 0', async () => {
    const client = connect();
    const ops = Array.from({ length: MAX_OPS_PER_OPEN }, (_, i) => setName(`V${i}`));
    const opened = expectKind(await client.send(openBody(pdf, { ops })), 'opened');
    expect(opened.opCount).toBe(MAX_OPS_PER_OPEN);
    const before = expectKind(await client.send({ kind: 'layout' }), 'laidOut').renderTree;
    const refused = expectKind(await client.send({ kind: 'op', op: setName('ONE-TOO-MANY') }), 'failed');
    expect(refused.code).toBe('LOG_FULL');
    const after = expectKind(await client.send({ kind: 'layout' }), 'laidOut').renderTree;
    expect(after).toEqual(before);
    expect(textsOf(after)).not.toContain('ONE-TOO-MANY');
    const snap = expectKind(await client.send({ kind: 'snapshot', at: T2 }), 'snapshotted');
    expect(snap.bytes.length).toBeGreaterThan(0);
    await client.send({ kind: 'dispose' });
    const rebased = expectKind(await client.send(openBody(snap.bytes, { at: T0, ops: [] })), 'opened');
    expect(rebased.opCount).toBe(0);
    expect(textsOf(rebased.renderTree)).toContain(`V${MAX_OPS_PER_OPEN - 1}`);
    expect(expectKind(await client.send({ kind: 'op', op: setName('AFTER') }), 'applied').opCount).toBe(1);
  }, 120_000);
});

describe('faithful is verified by reopening the bytes (F13)', () => {
  const pack = SYNTHETIC_PACK;
  const validateOps = [
    { kind: 'setValue', som: 'Details.Name', value: 'Test Person', at: T1 },
    { kind: 'validate', at: T2 },
  ];
  /** The synthetic form WITH a `form` packet (the engine rewrites it on save) but with no restore script in the template. */
  const withPacket = buildXfaPdf({
    packets: [
      packet('template', syntheticTemplate()),
      packet('datasets', syntheticDatasets()),
      packet('form', '<?xml version="1.0" encoding="UTF-8"?><form xmlns="http://www.xfa.org/schema/xfa-form/2.8/" checksum=""/>'),
    ],
  });

  it('a form packet without a restore script: the script-set presence is lost on reopen, so faithful is false although the packet is there', async () => {
    const live = connect();
    expectKind(await live.send(openBody(withPacket, { pack, at: T0 })), 'opened');
    for (const op of validateOps) expectKind(await live.send({ kind: 'op', op }), 'applied');
    const snap = expectKind(await live.send({ kind: 'snapshot', at: T2 }), 'snapshotted');
    expect((await openXfaPdf(snap.bytes)).packets.map((p) => p.name)).toContain('form');
    expect(snap.faithful).toBe(false);
  });

  it('the same data ops without the Validate presence change are faithful, form packet or not', async () => {
    const live = connect();
    expectKind(await live.send(openBody(withPacket, { pack, at: T0 })), 'opened');
    expectKind(await live.send({ kind: 'op', op: validateOps[0] ?? {} }), 'applied');
    expect(expectKind(await live.send({ kind: 'snapshot', at: T2 }), 'snapshotted').faithful).toBe(true);
  });

  it('the check opens a separate runtime and leaves the live session as it was (same tree, still usable)', async () => {
    const live = connect();
    expectKind(await live.send(openBody(synthetic(), { pack, at: T0 })), 'opened');
    const before = expectKind(await live.send({ kind: 'layout' }), 'laidOut').renderTree;
    expectKind(await live.send({ kind: 'snapshot', at: T2 }), 'snapshotted');
    expect(expectKind(await live.send({ kind: 'layout' }), 'laidOut').renderTree).toEqual(before);
    expect(expectKind(await live.send({ kind: 'op', op: validateOps[0] ?? {} }), 'applied').opCount).toBe(1);
  });
});

function synthetic(): Uint8Array {
  return buildSyntheticPdf();
}
