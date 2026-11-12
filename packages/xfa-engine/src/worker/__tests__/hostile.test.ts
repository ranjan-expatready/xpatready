import { describe, expect, it } from 'vitest';
import { MAX_PDF_BYTES } from '../../xfa-pdf.js';
import { MAX_ANSWER_VALUE, MAX_ANSWERS_PER_OP, MAX_OPS_PER_OPEN, MAX_PENDING_REQUESTS, MAX_QUEUED_PDF_BYTES } from '../limits.js';
import { parseResponse, PROTOCOL_VERSION } from '../protocol.js';
import { serveFormSession } from '../session.js';
import { connect, expectKind, fakePort, openBody, SOM, syntheticPdf, T0, T1 } from './support.js';

const pdf = syntheticPdf();
const op = (extra: Record<string, unknown>): Record<string, unknown> => ({ v: PROTOCOL_VERSION, id: 1, kind: 'op', op: { kind: 'setValue', som: SOM.name, value: 'x', at: T0, ...extra } });
const request = (kind: string, extra: Record<string, unknown> = {}): Record<string, unknown> => ({ v: PROTOCOL_VERSION, id: 1, kind, ...extra });
const wide = (n: number): string => 'x'.repeat(n);

/** Messages a peer can post through a real channel but that break the protocol, each with the code it earns. */
const BAD: readonly (readonly [string, string, unknown])[] = [
  ['not an object', 'INVALID_MESSAGE', 'open'],
  ['null', 'INVALID_MESSAGE', null],
  ['a number', 'INVALID_MESSAGE', 5],
  ['an array', 'INVALID_MESSAGE', []],
  ['no version', 'UNSUPPORTED_VERSION', { id: 1, kind: 'layout' }],
  ['a later version', 'UNSUPPORTED_VERSION', { v: PROTOCOL_VERSION + 1, id: 1, kind: 'layout' }],
  ['the version as text', 'UNSUPPORTED_VERSION', { v: String(PROTOCOL_VERSION), id: 1, kind: 'layout' }],
  ['no kind', 'INVALID_MESSAGE', { v: PROTOCOL_VERSION, id: 1 }],
  ['an unknown kind', 'INVALID_MESSAGE', request('eval')],
  ['an id that is text', 'INVALID_MESSAGE', { v: PROTOCOL_VERSION, id: 'a', kind: 'layout' }],
  ['a negative id', 'INVALID_MESSAGE', { v: PROTOCOL_VERSION, id: -1, kind: 'layout' }],
  ['a fractional id', 'INVALID_MESSAGE', { v: PROTOCOL_VERSION, id: 1.5, kind: 'layout' }],
  ['an unknown key', 'INVALID_MESSAGE', request('layout', { extra: 1 })],
  ['an op of an unknown kind', 'INVALID_MESSAGE', op({ kind: 'delete' })],
  ['an unknown key in an op', 'INVALID_MESSAGE', op({ extra: 1 })],
  ['a value of the wrong type', 'INVALID_MESSAGE', op({ value: { a: 1 } })],
  ['a value that is not finite', 'INVALID_MESSAGE', op({ value: Number.POSITIVE_INFINITY })],
  ['a value over the text ceiling', 'INVALID_MESSAGE', op({ value: wide(64 * 1024 + 1) })],
  ['an empty SOM', 'INVALID_MESSAGE', op({ som: '' })],
  ['a SOM over the ceiling', 'INVALID_MESSAGE', op({ som: wide(16 * 1024 + 1) })],
  ['a clock that is not a number', 'INVALID_MESSAGE', op({ at: '2026' })],
  ['a clock that is NaN', 'INVALID_MESSAGE', op({ at: Number.NaN })],
  ['a clock outside the Date range', 'INVALID_MESSAGE', op({ at: 8.64e15 + 1 })],
  ['too many answers', 'INVALID_MESSAGE', op({ answers: new Array<number>(MAX_ANSWERS_PER_OP + 1).fill(1) })],
  ['an answer of 0', 'INVALID_MESSAGE', op({ answers: [0] })],
  ['an answer that is not an integer', 'INVALID_MESSAGE', op({ answers: [1.5] })],
  ['an unknown activity', 'INVALID_MESSAGE', { v: PROTOCOL_VERSION, id: 1, kind: 'op', op: { kind: 'event', som: SOM.name, activity: 'explode', at: T0 } }],
  ['a download without a clock', 'INVALID_MESSAGE', request('download')],
  ['an open without ops', 'INVALID_MESSAGE', { ...openBody(pdf), ops: undefined, v: PROTOCOL_VERSION, id: 1 }],
  ['an open with a pdf that is an ArrayBuffer', 'INVALID_MESSAGE', { ...openBody(pdf), pdf: new ArrayBuffer(8), v: PROTOCOL_VERSION, id: 1 }],
  ['an open with an empty pdf', 'INVALID_MESSAGE', { ...openBody(pdf), pdf: new Uint8Array(0), v: PROTOCOL_VERSION, id: 1 }],
  ['an open with a pdf over the ceiling', 'INVALID_MESSAGE', { ...openBody(pdf), pdf: new Uint8Array(MAX_PDF_BYTES + 1), v: PROTOCOL_VERSION, id: 1 }],
  ['an open with a host that has an extra key', 'INVALID_MESSAGE', { ...openBody(pdf), host: { name: 'a', appType: 'b', version: 'c', variation: 'd', platform: 'e', language: 'f', vendor: 'g' }, v: PROTOCOL_VERSION, id: 1 }],
  ['an open with a timezone that does not exist', 'INVALID_MESSAGE', { ...openBody(pdf), timezone: 'Nowhere/Land', v: PROTOCOL_VERSION, id: 1 }],
  ['an open that carries limits (the page cannot set engine budgets)', 'INVALID_MESSAGE', { ...openBody(pdf), limits: { runBridgeCalls: 5 }, v: PROTOCOL_VERSION, id: 1 }],
  ['an open that carries empty limits', 'INVALID_MESSAGE', { ...openBody(pdf), limits: {}, v: PROTOCOL_VERSION, id: 1 }],
  ['an open with answers above the ceiling', 'INVALID_MESSAGE', { ...openBody(pdf), answers: [MAX_ANSWER_VALUE + 1], v: PROTOCOL_VERSION, id: 1 }],
  ['an open with too many answers', 'INVALID_MESSAGE', { ...openBody(pdf), answers: new Array<number>(MAX_ANSWERS_PER_OP + 1).fill(1), v: PROTOCOL_VERSION, id: 1 }],
  ['an op answer above the ceiling', 'INVALID_MESSAGE', op({ answers: [MAX_ANSWER_VALUE + 1] })],
  ['event fields with a __proto__ key', 'INVALID_MESSAGE', { v: PROTOCOL_VERSION, id: 1, kind: 'op', op: { kind: 'event', som: SOM.name, activity: 'click', fields: JSON.parse('{"__proto__":{"polluted":true}}') as unknown, at: T0 } }],
  ['event fields with a constructor key', 'INVALID_MESSAGE', { v: PROTOCOL_VERSION, id: 1, kind: 'op', op: { kind: 'event', som: SOM.name, activity: 'click', fields: { constructor: { prototype: { polluted: true } } }, at: T0 } }],
  ['an open whose pdf is backed by shared memory', 'INVALID_MESSAGE', { ...openBody(pdf), pdf: new Uint8Array(new SharedArrayBuffer(16)).fill(1), v: PROTOCOL_VERSION, id: 1 }],
  ['an open with too many ops', 'INVALID_MESSAGE', { ...openBody(pdf), ops: new Array(MAX_OPS_PER_OPEN + 1).fill({ kind: 'validate', at: T0 }), v: PROTOCOL_VERSION, id: 1 }],
  [
    'an open whose ops carry more text than the total ceiling',
    'INVALID_MESSAGE',
    { ...openBody(pdf), ops: new Array(200).fill({ kind: 'setValue', som: SOM.name, value: wide(64 * 1024), at: T0 }), v: PROTOCOL_VERSION, id: 1 },
  ],
];

describe('A4: hostile messages over a real channel never move the session', () => {
  it.each(BAD)('%s is refused with %s', async (_label, code, data) => {
    const client = connect();
    expectKind(await client.send(openBody(pdf)), 'opened');
    expectKind(await client.send({ kind: 'op', op: { kind: 'setValue', som: SOM.name, value: 'KEEP', at: T0 } }), 'applied');
    const before = expectKind(await client.send({ kind: 'layout' }), 'laidOut');
    const reply = (await client.raw(data)) as { kind: string; code: string; id: unknown };
    expect(reply.kind).toBe('failed');
    expect(reply.code).toBe(code);
    expect(parseResponse(reply).success).toBe(true);
    // The session is exactly as it was, and still serves.
    const after = expectKind(await client.send({ kind: 'layout' }), 'laidOut');
    expect(after.renderTree).toEqual(before.renderTree);
    expectKind(await client.send({ kind: 'op', op: { kind: 'setValue', som: SOM.name, value: 'STILL', at: T1 } }), 'applied');
  });

  it('echoes the id of a refused request when it has a readable one, and null when it has none', async () => {
    const client = connect();
    expect(await client.raw({ v: 99, id: 7, kind: 'layout' })).toMatchObject({ id: 7, code: 'UNSUPPORTED_VERSION' });
    expect(await client.raw(null)).toMatchObject({ id: null, code: 'INVALID_MESSAGE' });
  });

  it('a message does not lose its place: an invalid request between two valid ones leaves their replies in order', async () => {
    const client = connect();
    expectKind(await client.send(openBody(pdf)), 'opened');
    expect(expectKind(await client.send({ kind: 'layout' }), 'laidOut')).toBeDefined();
    await client.raw({ v: PROTOCOL_VERSION, id: 99, kind: 'bogus' });
    expect(expectKind(await client.send({ kind: 'layout' }), 'laidOut')).toBeDefined();
  });
});

describe('A4: input a real channel cannot carry, delivered to the handler directly', () => {
  const cyclic: Record<string, unknown> = { v: PROTOCOL_VERSION, id: 1, kind: 'layout' };
  cyclic['self'] = cyclic;
  const throwing = new Proxy({}, { get: () => { throw new Error('boom'); }, has: () => { throw new Error('boom'); }, ownKeys: () => { throw new Error('boom'); } });
  const getter = { v: PROTOCOL_VERSION, kind: 'layout', get id(): number { throw new Error('boom'); } };
  const JUNK: readonly (readonly [string, unknown])[] = [
    ['a function', () => 1],
    ['a symbol', Symbol('x')],
    ['a bigint', 10n],
    ['undefined', undefined],
    ['an object with a cycle', cyclic],
    ['a proxy that throws on every access', throwing],
    ['an object whose id getter throws', getter],
    ['an object without a prototype', Object.assign(Object.create(null) as Record<string, unknown>, { v: PROTOCOL_VERSION, id: 1, kind: 'bogus' })],
    ['an op whose value is a function', { v: PROTOCOL_VERSION, id: 1, kind: 'op', op: { kind: 'setValue', som: SOM.name, value: () => 1, at: T0 } }],
  ];

  it.each(JUNK)('%s is answered with failed (or nothing the handler can throw out of), and the session still serves', async (_label, data) => {
    const port = fakePort();
    const handle = serveFormSession(port);
    port.deliver({ v: PROTOCOL_VERSION, id: 1, kind: 'open', pdf, host: { name: 'a', appType: 'b', version: 'c', variation: 'd', platform: 'e', language: 'f' }, timezone: 'UTC', at: T0, ops: [] });
    await port.posts(1);
    expect(() => port.deliver(data)).not.toThrow();
    await port.posts(2);
    expect(port.posted[1]?.message).toMatchObject({ kind: 'failed' });
    port.deliver({ v: PROTOCOL_VERSION, id: 2, kind: 'layout' });
    await port.posts(3);
    expect(port.posted[2]?.message).toMatchObject({ kind: 'laidOut', id: 2 });
    handle.close();
  });

  it('an event whose data cannot be read is answered with failed', async () => {
    const port = fakePort();
    serveFormSession(port);
    const handler = port.onmessage as ((event: unknown) => void) | null;
    handler?.({ get data(): unknown { throw new Error('boom'); } });
    await port.posts(1);
    expect(port.posted[0]?.message).toMatchObject({ kind: 'failed', id: null, code: 'INVALID_MESSAGE' });
  });

  it('more requests than the queue holds are refused with BUSY and the rest are answered in order', async () => {
    const port = fakePort();
    const handle = serveFormSession(port);
    const total = MAX_PENDING_REQUESTS + 10;
    for (let id = 1; id <= total; id += 1) port.deliver({ v: PROTOCOL_VERSION, id, kind: 'layout' });
    await port.posts(total);
    const busy = port.posted.filter((p) => (p.message as { code?: string }).code === 'BUSY');
    expect(busy).toHaveLength(10);
    const served = port.posted.filter((p) => (p.message as { code?: string }).code === 'NOT_OPEN');
    expect(served).toHaveLength(MAX_PENDING_REQUESTS);
    expect(served.map((p) => (p.message as { id: number }).id)).toEqual(Array.from({ length: MAX_PENDING_REQUESTS }, (_, i) => i + 1));
    handle.close();
  });

  it('a closed session answers nothing and frees its run; a reply that cannot be posted is retried as failed, then given up without throwing', async () => {
    const port = fakePort();
    const handle = serveFormSession(port);
    port.deliver({ v: PROTOCOL_VERSION, id: 1, kind: 'layout' });
    await port.posts(1);
    handle.close();
    expect(port.onmessage).toBeNull();
    const broken = fakePort();
    const original = broken.postMessage.bind(broken);
    let attempts = 0;
    broken.postMessage = (message: unknown, transfer?: ArrayBuffer[]): void => {
      attempts += 1;
      if (attempts <= 2) throw new Error('cannot clone');
      if (transfer === undefined) original(message);
      else original(message, transfer);
    };
    serveFormSession(broken);
    broken.deliver({ v: PROTOCOL_VERSION, id: 1, kind: 'layout' });
    broken.deliver({ v: PROTOCOL_VERSION, id: 2, kind: 'layout' });
    await broken.posts(1);
    expect(broken.posted[0]?.message).toMatchObject({ id: 2, kind: 'failed' });
  });
});

describe('queued bytes are bounded (F9)', () => {
  it('opens whose pdfs together exceed the queue byte budget are refused with BUSY; the ones within it are served in order', async () => {
    const port = fakePort();
    const handle = serveFormSession(port);
    // Two of these fill the budget exactly; the third does not fit while they hold it.
    const big = new Uint8Array(MAX_QUEUED_PDF_BYTES / 2);
    const body = (id: number): Record<string, unknown> => ({ ...openBody(big), v: PROTOCOL_VERSION, id });
    port.deliver(body(1));
    port.deliver(body(2));
    port.deliver(body(3));
    await port.posts(3);
    const byId = (id: number): { kind: string; code?: string } => (port.posted.map((p) => p.message as { id: number; kind: string; code?: string }).find((m) => m.id === id) ?? { kind: 'missing' });
    expect(byId(3)).toMatchObject({ kind: 'failed', code: 'BUSY' });
    // The first two hold the budget only while they wait: their replies (here: the file is no form) come, and a later open is accepted.
    expect(byId(1).kind).toBe('failed');
    expect(byId(1).code).not.toBe('BUSY');
    expect(byId(2).code).not.toBe('BUSY');
    port.deliver(body(4));
    await port.posts(4);
    expect(byId(4).code).not.toBe('BUSY');
    handle.close();
  });
});

describe('the byte budget counts what is held, and only valid requests are queued (F14)', () => {
  it('a 1-byte view onto a large buffer counts the whole buffer', async () => {
    const port = fakePort();
    const handle = serveFormSession(port);
    const buffer = new ArrayBuffer(MAX_QUEUED_PDF_BYTES / 2);
    const view = (id: number): Record<string, unknown> => ({ ...openBody(new Uint8Array(buffer, 0, 1)), v: PROTOCOL_VERSION, id });
    port.deliver(view(1));
    port.deliver(view(2));
    port.deliver(view(3));
    await port.posts(3);
    const byId = (id: number): { code?: string } => (port.posted.map((p) => p.message as { id: number; code?: string }).find((m) => m.id === id) ?? {});
    expect(byId(3).code).toBe('BUSY');
    expect(byId(1).code).not.toBe('BUSY');
    handle.close();
  });

  it('a message with bytes under an unknown key is refused at once and holds no budget', async () => {
    const port = fakePort();
    const handle = serveFormSession(port);
    const hidden = new Uint8Array(MAX_QUEUED_PDF_BYTES);
    for (let id = 1; id <= 3; id += 1) port.deliver({ v: PROTOCOL_VERSION, id, kind: 'layout', extra: hidden });
    expect(port.posted.map((p) => (p.message as { code: string }).code)).toEqual(['INVALID_MESSAGE', 'INVALID_MESSAGE', 'INVALID_MESSAGE']);
    port.deliver({ v: PROTOCOL_VERSION, id: 4, kind: 'layout' });
    await port.posts(4);
    expect((port.posted[3]?.message as { code: string }).code).toBe('NOT_OPEN');
    handle.close();
  });
});

describe('snapshot bytes are transferred like download bytes (F16)', () => {
  it('the snapshotted reply lists its buffer as transferred', async () => {
    const port = fakePort();
    const handle = serveFormSession(port);
    port.deliver({ v: PROTOCOL_VERSION, id: 1, ...openBody(pdf) });
    port.deliver({ v: PROTOCOL_VERSION, id: 2, kind: 'snapshot', at: T0 });
    await port.posts(2);
    const reply = port.posted[1];
    const bytes = (reply?.message as { kind: string; bytes: Uint8Array }).bytes;
    expect((reply?.message as { kind: string }).kind).toBe('snapshotted');
    expect(reply?.transfer).toEqual([bytes.buffer]);
    handle.close();
  });
});

describe('A4: after an abort only open or dispose is accepted (a hostile or stale client)', () => {
  it('every other request is NEEDS_REBUILD, repeatedly, and the session is unchanged by them', async () => {
    const client = connect();
    await client.send(openBody(pdf));
    expectKind(await client.send({ kind: 'op', op: { kind: 'event', som: SOM.ask, activity: 'click', at: T1 } }), 'answerRequired');
    for (let i = 0; i < 3; i += 1) {
      expect(expectKind(await client.send({ kind: 'op', op: { kind: 'setValue', som: SOM.name, value: 'x', at: T1 } }), 'failed').code).toBe('NEEDS_REBUILD');
      expect(expectKind(await client.send({ kind: 'layout' }), 'failed').code).toBe('NEEDS_REBUILD');
      expect(expectKind(await client.send({ kind: 'download', at: T1 }), 'failed').code).toBe('NEEDS_REBUILD');
    }
    expectKind(await client.send(openBody(pdf)), 'opened');
  });
});
