import { afterEach } from 'vitest';
import type { RenderTree } from '../../layout/render-tree.js';
import { datasetsXml } from '../../model/form/__tests__/helpers.js';
import { tpl } from '../../model/template/__tests__/helpers.js';
import { buildXfaPdf, packet } from '../../__tests__/fixtures/build-xfa-pdf.js';
import { esc } from '../../runtime/__tests__/helpers.js';
import { parseResponse, PROTOCOL_VERSION, type Response } from '../protocol.js';
import type { FormSessionOptions } from '../form-session.js';
import { serveFormSession, type FormSessionHandle, type SessionPort } from '../session.js';

/** A neutral identity that names no real product (plan decision D3). */
export const HOST = { name: 'TestHost', appType: 'TestApp', version: '1.0', variation: 'Test', platform: 'TestOS', language: 'XX' };

/** Instants the form's clock reads; far from any day boundary. */
export const T0 = Date.UTC(2026, 5, 15, 12, 0, 0);
export const T1 = Date.UTC(2026, 5, 16, 9, 30, 0);
export const T2 = Date.UTC(2026, 5, 17, 18, 45, 0);

export const textField = (name: string, y: number, events = ''): string => `<field name="${name}" w="100pt" h="20pt" y="${y}pt"><ui><textEdit/></ui>${events}</field>`;
export const on = (activity: string, body: string, attrs = ''): string => `<event activity="${activity}"${attrs}><script contentType="application/x-javascript">${esc(body)}</script></event>`;

/** The SOM paths of the synthetic form's fields (from the root subform). */
export const SOM = { name: 'name', stamp: 'stamp', tick: 'tick', ask: 'ask', spin: 'spin', quiet: 'quiet' } as const;

/**
 * A small fictitious form with the behaviours the session has to carry: a field the load stamps with the clock, a button that
 * stamps it again (the per-op clock), a choice message box (Yes-style confirm, answer 1 clears `name`), a script that spends
 * bridge calls without end (a count-based limit), and a field with no handlers at all (an event that changes nothing).
 */
export function syntheticPdf(): Uint8Array {
  const body = [
    textField('name', 0),
    textField('stamp', 30, on('initialize', 'this.rawValue = String(new Date().getTime());')),
    textField('tick', 60, on('click', 'stamp.rawValue = String(new Date().getTime());')),
    textField('ask', 90, on('click', 'var b = xfa.host.messageBox("Clear?", "Confirm", 2, 1); if (b == 1) { name.rawValue = "cleared"; }')),
    textField('spin', 120, on('click', 'for (var i = 0; i < 100000; i++) { var x = name.rawValue; }')),
    textField('quiet', 150),
  ].join('');
  const template = tpl(body).replace('<subform name="form1">', '<subform name="form1" layout="tb">');
  return buildXfaPdf({ packets: [packet('template', template), packet('datasets', datasetsXml('<form1/>'))] });
}

/**
 * A form whose load raises a choice message box (the `initialize` script asks, and takes the answer 1 as "yes"): the box is
 * raised by the open itself, not by an op. `choice` shows what the script read.
 */
export function loadAskPdf(): Uint8Array {
  const ask = on('initialize', 'var b = xfa.host.messageBox("Load now?", "Confirm", 2, 1); this.rawValue = b == 1 ? "yes" : "no";');
  const template = tpl(textField('choice', 0, ask)).replace('<subform name="form1">', '<subform name="form1" layout="tb">');
  return buildXfaPdf({ packets: [packet('template', template), packet('datasets', datasetsXml('<form1/>'))] });
}

/**
 * A form whose Validate button, after it has set its flag, deletes the flag node from the form: the click succeeds and the
 * engine's next read of the flag fails. For "an engine error after the click ends the run".
 */
export const REMOVING_PACK = { validateButton: 'btn', validatedFlag: 'flag', validatedValue: 'Yes', firstMissingField: 'fm', barcodes: 'bcs' } as const;
export function removingValidatePdf(): Uint8Array {
  const body = [
    textField('btn', 0, on('click', 'flag.rawValue = "Yes"; xfa.form.form1.nodes.remove(flag);')),
    textField('flag', 30),
    textField('fm', 60),
    '<subform name="bcs" layout="tb"><field name="bc1" w="100pt" h="20pt"><ui><textEdit/></ui></field></subform>',
  ].join('');
  const template = tpl(body).replace('<subform name="form1">', '<subform name="form1" layout="tb">');
  return buildXfaPdf({ packets: [packet('template', template), packet('datasets', datasetsXml('<form1/>'))] });
}

/**
 * A form with the Validate-pack nodes of `REMOVING_PACK` and a `hook` field whose `preSave` handler runs `preSaveScript`: for
 * "what a `download` does when the form's own save handling fails, removes a barcode node or asks the user".
 */
export function preSavePdf(preSaveScript: string): Uint8Array {
  const body = [
    textField('btn', 0),
    textField('flag', 30),
    textField('fm', 60),
    '<subform name="bcs" layout="tb"><field name="bc1" w="100pt" h="20pt"><ui><textEdit/></ui></field></subform>',
    textField('hook', 120, on('preSave', preSaveScript)),
  ].join('');
  const template = tpl(body).replace('<subform name="form1">', '<subform name="form1" layout="tb">');
  return buildXfaPdf({ packets: [packet('template', template), packet('datasets', datasetsXml('<form1/>'))] });
}

/**
 * A form whose layout-ready handler stamps the clock into `stamp` (so its laid-out state is the clock of its last layout), with the
 * pack nodes of `REMOVING_PACK` and a `hook` whose `preSave` handler writes `name` (so a download changes the live form).
 */
export function clockLayoutPdf(): Uint8Array {
  const body = [
    textField('name', 0),
    textField('stamp', 30, on('ready', 'this.rawValue = String(new Date().getTime());', ' ref="$layout"')),
    textField('btn', 60),
    textField('flag', 90),
    textField('fm', 120),
    '<subform name="bcs" layout="tb"><field name="bc1" w="100pt" h="20pt"><ui><textEdit/></ui></field></subform>',
    textField('hook', 150, on('preSave', 'name.rawValue = "saved";')),
  ].join('');
  const template = tpl(body).replace('<subform name="form1">', '<subform name="form1" layout="tb">');
  return buildXfaPdf({ packets: [packet('template', template), packet('datasets', datasetsXml('<form1/>'))] });
}

/** Every string a render tree draws, in paint order, one per text item. */
export function textsOf(tree: RenderTree): string[] {
  return tree.pages.flatMap((page) => page.items.flatMap((item) => (item.kind === 'text' ? [item.lines.map((line) => line.runs.map((run) => run.text).join('')).join('\n')] : [])));
}

/** The common part of an `open` request. */
export function openBody(pdf: Uint8Array, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { kind: 'open', pdf, host: HOST, timezone: 'UTC', at: T0, ops: [], ...extra };
}

export interface Client {
  /** Sends a request (version and id are added) and waits for the reply with that id; the reply is parsed with the protocol's own schema. */
  send(body: Record<string, unknown>): Promise<Response>;
  /** Posts anything as it is and waits for the next message the session posts. */
  raw(data: unknown): Promise<unknown>;
  close(): void;
}

const clients: Client[] = [];
afterEach(() => {
  for (const client of clients.splice(0)) client.close();
});

/** A client and a session joined by a real `MessageChannel` (structured clone both ways). */
export function connect(options: FormSessionOptions = {}): Client {
  const { port1, port2 } = new MessageChannel();
  const handle: FormSessionHandle = serveFormSession(port2, options);
  const inbox: unknown[] = [];
  const waiting: ((message: unknown) => void)[] = [];
  port1.onmessage = (event: MessageEvent): void => {
    const waiter = waiting.shift();
    if (waiter === undefined) inbox.push(event.data);
    else waiter(event.data);
  };
  const next = (): Promise<unknown> => {
    const queued = inbox.shift();
    return queued === undefined ? new Promise((resolve) => waiting.push(resolve)) : Promise.resolve(queued);
  };
  let id = 0;
  const client: Client = {
    async send(body) {
      id += 1;
      port1.postMessage({ v: PROTOCOL_VERSION, id, ...body });
      const message = await next();
      const parsed = parseResponse(message);
      if (!parsed.success) throw new Error(`the session replied with a message that breaks the protocol: ${JSON.stringify(parsed.error.issues[0])}`);
      if (parsed.data.id !== id) throw new Error(`reply id ${String(parsed.data.id)} for request ${id}`);
      return parsed.data;
    },
    async raw(data) {
      port1.postMessage(data);
      return next();
    },
    close() {
      handle.close();
      port1.close();
      port2.close();
    },
  };
  clients.push(client);
  return client;
}

/** The kinds of reply, narrowed: a test that expects one fails with the reply it got. */
export function expectKind<K extends Response['kind']>(response: Response, kind: K): Extract<Response, { kind: K }> {
  if (response.kind !== kind) throw new Error(`expected ${kind}, got ${JSON.stringify(response).slice(0, 400)}`);
  return response as Extract<Response, { kind: K }>;
}

/** A port that delivers synchronously and records what the session posts: for hostile input, which a real channel would refuse to send. */
export interface FakePort extends SessionPort {
  readonly posted: { readonly message: unknown; readonly transfer: ArrayBuffer[] | undefined }[];
  deliver(data: unknown): void;
  /** Resolves with the message posted after `count` messages had been posted. */
  posts(count: number): Promise<void>;
}

export function fakePort(): FakePort {
  const posted: FakePort['posted'][number][] = [];
  const watchers: { count: number; resolve: () => void }[] = [];
  const port: FakePort = {
    posted,
    onmessage: null,
    postMessage(message: unknown, transfer?: ArrayBuffer[]): void {
      posted.push({ message, transfer });
      for (const watcher of watchers.filter((w) => w.count <= posted.length)) watcher.resolve();
    },
    deliver(data) {
      (port.onmessage as ((event: { data: unknown }) => void) | null)?.({ data });
    },
    posts(count) {
      return posted.length >= count ? Promise.resolve() : new Promise((resolve) => watchers.push({ count, resolve }));
    },
  };
  return port;
}
