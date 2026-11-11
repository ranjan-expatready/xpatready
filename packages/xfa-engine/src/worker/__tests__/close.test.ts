import { describe, expect, it, vi } from 'vitest';
import type { FormRuntime, FormRuntimeOptions } from '../../runtime/options.js';
import type { XfaPdf } from '../../xfa-pdf.js';
import { fakePort, HOST, openBody, syntheticPdf, T0 } from './support.js';
import { PROTOCOL_VERSION } from '../protocol.js';
import { serveFormSession } from '../session.js';

/** Counts the runtimes the session builds and frees; `gate` holds `createFormRuntime` open so a test can close the session while an open is in flight. */
const tracker = vi.hoisted(() => ({
  created: 0,
  live: new Set<object>(),
  entered: undefined as (() => void) | undefined,
  returned: undefined as (() => void) | undefined,
  gate: undefined as Promise<void> | undefined,
}));

vi.mock('../../runtime/runtime.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../runtime/runtime.js')>();
  return {
    ...actual,
    createFormRuntime: async (pdf: XfaPdf, options: FormRuntimeOptions): Promise<FormRuntime> => {
      tracker.entered?.();
      if (tracker.gate !== undefined) await tracker.gate;
      const runtime = await actual.createFormRuntime(pdf, options);
      tracker.created += 1;
      tracker.live.add(runtime);
      const dispose = runtime.dispose.bind(runtime);
      runtime.dispose = (): void => {
        tracker.live.delete(runtime);
        dispose();
      };
      tracker.returned?.();
      return runtime;
    },
  };
});

const flush = async (): Promise<void> => {
  for (let i = 0; i < 20; i += 1) await new Promise<void>((resolve) => setImmediate(resolve));
};

describe('close() while an open is in flight (F3)', () => {
  it('the open that was running when the session closed builds no lasting runtime and posts no reply', async () => {
    tracker.created = 0;
    tracker.live.clear();
    let release: () => void = () => undefined;
    tracker.gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const entered = new Promise<void>((resolve) => {
      tracker.entered = resolve;
    });
    const returned = new Promise<void>((resolve) => {
      tracker.returned = resolve;
    });
    const port = fakePort();
    const handle = serveFormSession(port);
    const ops = Array.from({ length: 50 }, (_, i) => ({ kind: 'setValue', som: 'name', value: `v${i}`, at: T0 }));
    port.deliver({ v: PROTOCOL_VERSION, id: 1, ...openBody(syntheticPdf(), { ops }) });
    await entered;
    handle.close();
    release();
    await returned;
    await flush();
    tracker.gate = undefined;
    tracker.entered = undefined;
    tracker.returned = undefined;
    expect(tracker.live.size).toBe(0);
    expect(port.posted).toHaveLength(0);
  });

  it('requests queued behind the running one never start after close: no runtime is built for them and nothing is posted', async () => {
    tracker.created = 0;
    tracker.live.clear();
    let release: () => void = () => undefined;
    tracker.gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const entered = new Promise<void>((resolve) => {
      tracker.entered = resolve;
    });
    const returned = new Promise<void>((resolve) => {
      tracker.returned = resolve;
    });
    const port = fakePort();
    const handle = serveFormSession(port);
    port.deliver({ v: PROTOCOL_VERSION, id: 1, ...openBody(syntheticPdf()) });
    await entered;
    port.deliver({ v: PROTOCOL_VERSION, id: 2, kind: 'dispose' });
    port.deliver({ v: PROTOCOL_VERSION, id: 3, ...openBody(syntheticPdf()) });
    handle.close();
    release();
    await returned;
    await flush();
    tracker.gate = undefined;
    tracker.entered = undefined;
    tracker.returned = undefined;
    expect(tracker.created).toBeLessThanOrEqual(1);
    expect(tracker.live.size).toBe(0);
    expect(port.posted).toHaveLength(0);
  });

  it('closing while a snapshot\'s check runtime is being built disposes it and posts no reply', async () => {
    tracker.created = 0;
    tracker.live.clear();
    const port = fakePort();
    const handle = serveFormSession(port);
    port.deliver({ v: PROTOCOL_VERSION, id: 1, ...openBody(syntheticPdf()) });
    await port.posts(1);
    let release: () => void = () => undefined;
    tracker.gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const entered = new Promise<void>((resolve) => {
      tracker.entered = resolve;
    });
    const returned = new Promise<void>((resolve) => {
      tracker.returned = resolve;
    });
    port.deliver({ v: PROTOCOL_VERSION, id: 2, kind: 'snapshot', at: T0 });
    await entered;
    handle.close();
    release();
    await returned;
    await flush();
    tracker.gate = undefined;
    tracker.entered = undefined;
    tracker.returned = undefined;
    expect(tracker.live.size).toBe(0);
    expect(port.posted).toHaveLength(1);
  });

  it('a session that was open and idle is freed by close', async () => {
    tracker.created = 0;
    tracker.live.clear();
    const port = fakePort();
    const handle = serveFormSession(port);
    port.deliver({ v: PROTOCOL_VERSION, id: 1, ...openBody(syntheticPdf()) });
    await port.posts(1);
    expect(tracker.live.size).toBe(1);
    handle.close();
    await flush();
    expect(tracker.live.size).toBe(0);
    expect(HOST.name).toBe('TestHost');
  });
});
