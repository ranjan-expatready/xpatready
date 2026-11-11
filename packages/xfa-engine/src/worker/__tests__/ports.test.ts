import { MessageChannel as NodeMessageChannel } from 'node:worker_threads';
import { describe, expect, it } from 'vitest';
import { PROTOCOL_VERSION, parseResponse } from '../protocol.js';
import { serveFormSession, type SessionPort } from '../session.js';
import { openBody, syntheticPdf } from './support.js';

/** The same session on the two port kinds a host has: a `worker_threads` port (Node worker) and the web `MessagePort` (browser worker; `support.ts`). */
describe('the session port fits a worker_threads MessagePort as it is', () => {
  it('serves open and layout over a Node MessageChannel, and the engine\'s render tree reaches the peer as a copy', async () => {
    const { port1, port2 } = new NodeMessageChannel();
    // The assignment is the proof that no adapter is needed.
    const port: SessionPort = port2;
    const handle = serveFormSession(port);
    const replies: unknown[] = [];
    const arrived = new Promise<void>((resolve) => {
      port1.on('message', (message: unknown) => {
        replies.push(message);
        if (replies.length === 2) resolve();
      });
    });
    port1.postMessage({ v: PROTOCOL_VERSION, id: 1, ...openBody(syntheticPdf()) });
    port1.postMessage({ v: PROTOCOL_VERSION, id: 2, kind: 'layout' });
    await arrived;
    const [opened, laid] = replies.map((reply) => parseResponse(reply));
    expect(opened?.success && opened.data.kind).toBe('opened');
    expect(laid?.success && laid.data.kind).toBe('laidOut');
    handle.close();
    port1.close();
  });
});
