import { FormSession, type FormSessionOptions } from './form-session.js';
import { MAX_PENDING_REQUESTS, MAX_QUEUED_PDF_BYTES } from './limits.js';
import { PROTOCOL_VERSION, parseRequest, peekId, type Request, type Response, type ResponseBody } from './protocol.js';

/**
 * The part of a message port the session needs, written so that no DOM or Node type is required: a `MessagePort` of a
 * `MessageChannel`, a worker's `self`, and `worker_threads`' `parentPort` all have this shape. `onmessage` is a property
 * (assigned a handler, or null to detach), `data` is whatever the peer posted, and `transfer` lists buffers handed over.
 */
export interface SessionPort {
  postMessage(message: unknown, transfer: ArrayBuffer[]): void;
  postMessage(message: unknown): void;
  // Ports declare `onmessage` with their own event type; the session reads only its `data` member, so any handler type that accepts one fits.
  onmessage: ((event: never) => void) | null;
}

export interface FormSessionHandle {
  /**
   * Stops listening and answers nothing more. A request that is being served finishes without a reply and the form run is freed
   * when it does; requests still queued are dropped unread. Nothing the session built outlives the close.
   */
  close(): void;
}

/** What the handler reads of an event. */
interface Incoming {
  readonly data: unknown;
}

/**
 * Serves the form protocol on `port`: one `FormRuntime` for the port's lifetime (plan decision D8), requests answered one
 * at a time in arrival order (an `open` or `download` takes a while and must not interleave with the next request). This
 * function is transport glue only: it parses (`parseRequest`), hands the request to the session, wraps the reply with the
 * protocol version and the request's `id`, and posts it. It never throws out of the handler and never leaves a rejected promise.
 *
 * `options.limits` (the engine budgets) is validated here, when the session is created: a limit the engine refuses throws
 * `INVALID_OPTIONS` to the host that wrote it, instead of failing every open later.
 */
export function serveFormSession(port: SessionPort, options: FormSessionOptions = {}): FormSessionHandle {
  const session = new FormSession(options);
  let queue: Promise<void> = Promise.resolve();
  let pending = 0;
  /** Bytes of PDF in the requests that wait or run: the queue's second bound (see `MAX_QUEUED_PDF_BYTES`). */
  let queuedBytes = 0;
  let closed = false;

  const post = (id: number | null, body: ResponseBody): void => {
    if (closed) return;
    const message = { v: PROTOCOL_VERSION, id, ...body } as Response;
    try {
      if ((message.kind === 'downloaded' || message.kind === 'snapshotted') && message.bytes.buffer instanceof ArrayBuffer) port.postMessage(message, [message.bytes.buffer]);
      else port.postMessage(message);
    } catch {
      // The reply could not be posted (the peer is gone, or the reply is not cloneable): tell the peer that, if it can still hear.
      try {
        port.postMessage({ v: PROTOCOL_VERSION, id, kind: 'failed', code: 'INTERNAL', message: 'the reply could not be posted' });
      } catch {
        // Nobody is listening.
      }
    }
  };

  const serve = async (request: Request): Promise<void> => {
    // The session closed while this request waited: it is not served and nothing is built for it.
    if (closed) return;
    try {
      post(request.id, await session.handle(request));
    } catch {
      // The session turns every failure into a reply; reaching here is a defect in it. The run's state is unknown: free it.
      session.dispose();
      post(request.id, { kind: 'failed', code: 'INTERNAL', message: 'the session failed unexpectedly; send open again' });
    }
  };

  /**
   * Parses before queueing, so a message that is not a valid request is answered at once and holds no place in the queue; the
   * byte budget counts the whole buffer behind the `open`'s `pdf` (a view of one byte can keep a large buffer alive).
   */
  const receive = (data: unknown): void => {
    if (pending >= MAX_PENDING_REQUESTS) {
      post(peekId(data), { kind: 'failed', code: 'BUSY', message: 'too many requests are waiting' });
      return;
    }
    const parsed = parseRequest(data);
    if (!parsed.ok) {
      post(parsed.id, { kind: 'failed', code: parsed.code, message: parsed.message });
      return;
    }
    const request = parsed.request;
    const bytes = request.kind === 'open' ? request.pdf.buffer.byteLength : 0;
    if (queuedBytes + bytes > MAX_QUEUED_PDF_BYTES) {
      post(request.id, { kind: 'failed', code: 'BUSY', message: 'too many bytes of PDF are waiting' });
      return;
    }
    pending += 1;
    queuedBytes += bytes;
    queue = queue.then(() => serve(request)).catch(() => undefined).finally(() => {
      pending -= 1;
      queuedBytes -= bytes;
    });
  };

  port.onmessage = (event: never): void => {
    let data: unknown;
    try {
      data = (event as Incoming).data;
    } catch {
      post(null, { kind: 'failed', code: 'INVALID_MESSAGE', message: 'the message could not be read' });
      return;
    }
    receive(data);
  };

  return {
    close(): void {
      if (closed) return;
      closed = true;
      port.onmessage = null;
      // An open that is awaiting the PDF or the runtime frees what it builds at its next step (cancel); the run it may hold is
      // freed when that request has finished, because disposing under a running request would pull the run out from under it.
      session.cancel();
      queue = queue.then(() => session.dispose());
    },
  };
}
