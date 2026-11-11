import { describe, expect, it } from 'vitest';
import { connect, expectKind, openBody, SOM, syntheticPdf, T0, T1 } from './support.js';
import { serveFormSession } from '../session.js';
import { fakePort } from './support.js';

describe('the engine budgets are the deployment\'s, set in the hosting options (F1)', () => {
  it('serveFormSession options.limits reach the runtime: a tight bridge-call budget ends the spin script', async () => {
    const client = connect({ limits: { runBridgeCalls: 200 } });
    await client.send(openBody(syntheticPdf()));
    const aborted = expectKind(await client.send({ kind: 'op', op: { kind: 'event', som: SOM.spin, activity: 'click', at: T1 } }), 'aborted');
    expect(aborted.reason).toMatchObject({ code: 'SCRIPT_LIMIT', limit: 'run-bridge-calls' });
  });

  it('without options.limits the default budgets apply (the same click is a normal op)', async () => {
    const client = connect();
    await client.send(openBody(syntheticPdf()));
    expectKind(await client.send({ kind: 'op', op: { kind: 'event', som: SOM.quiet, activity: 'enter', at: T0 } }), 'applied');
  });

  it('options.limits are validated with the runtime\'s limits schema when the session is created: an unknown key or a value over a ceiling throws INVALID_OPTIONS', () => {
    expect(() => serveFormSession(fakePort(), { limits: { maxCalcPasses: 1_000_000 } })).toThrow(/limits/);
    expect(() => serveFormSession(fakePort(), { limits: { notALimit: 1 } as never })).toThrow(/limits/);
  });
});
