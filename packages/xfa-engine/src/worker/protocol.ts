import { z } from 'zod';
import { renderTreeSchema } from '../layout/render-tree.js';
import { safeText } from '../pdf/safe-text.js';
import { MAX_TIMEZONE_CHARS, timezoneSchema } from '../runtime/timezone.js';
import { activitySchema, clearButtonReportSchema, eventFieldsSchema, hostIdentitySchema, hostRequestSchema, packFormDescriptorSchema, problemListSchema, somTextSchema } from '../runtime/wire-schemas.js';
import { MAX_EVENT_TEXT_CHARS, MAX_RECORDED_ENTRIES, MAX_RECORDED_TEXT_CHARS, pdfBytesSchema } from '../wire-limits.js';
import {
  MAX_ANSWER_VALUE,
  MAX_ANSWERS_PER_OP,
  MAX_FAILURE_MESSAGE_CHARS,
  MAX_INSTANT_MS,
  MAX_OPS_PER_OPEN,
  MAX_OPS_TEXT_CHARS,
} from './limits.js';

/**
 * The worker protocol (W03-T14): transport-neutral messages between a viewer client and the form session that a Web Worker
 * or `worker_thread` hosts (`serveFormSession`). Everything here is plain structured-clone data. Every inbound message,
 * request or response, is parsed with these schemas before it is used.
 *
 * Every request carries the protocol version `v` and a correlation `id` (a non-negative integer the client chooses); the
 * response echoes the `id`, and `id` is null only on a `failed` answering a message whose id could not be read.
 *
 * `failed { code: 'ACCESS_DENIED' }` (E11): a live `setValue` or `event` op aimed at a container whose effective access (its own and its
 * ancestors', the most restrictive) does not allow that user action. The run is kept, the op is not applied, not counted in `opCount`, and the
 * client must not log it, so a replay never meets it. Scripts keep setting such fields.
 *
 * Version 2 (E8 to E10): adds the `problems` request and `problemList` reply, `opened.clearButton`, and `requests` on `opened`, `applied` and
 * `downloaded`, with `pack.clearButton`. Responses are parsed strictly, so a version 1 client could not read them: the version moved, and no version 1 client exists.
 */
export const PROTOCOL_VERSION = 2;

/*
 * The op log, and the client contract for rebasing it (W04-T21).
 *
 * The session keeps no history: the client keeps the log of ops it applied and sends it with `open` to rebuild the run
 * (PA-8). Replaying a log costs about the same as the first run (a layout after every op) and the whole replay is charged
 * against the run's total-time budget, so a log is bounded by `MAX_OPS_PER_OPEN`. Every `opened` and `applied` reply carries
 * `opCount`, the number of ops applied in the run so far (replayed plus live), counted by the session.
 *
 * LOG_FULL. The last slot of the log is RESERVED FOR A DOWNLOAD (so the user can always export). A live edit (`op`: setValue, event,
 * validate, preSave) sent when `opCount` has reached `MAX_OPS_PER_OPEN - 1` is refused: `failed { code: 'LOG_FULL' }`, the run kept and
 * nothing applied. A `download` with a pack (an op, below) is accepted while `opCount < MAX_OPS_PER_OPEN` and refused at the ceiling. The
 * client must have rebased by then (below); `snapshot` still works at the ceiling. An `open` may still replay `MAX_OPS_PER_OPEN` ops.
 *
 * REBASE, only on `faithful: true`. Before `opCount` reaches `MAX_OPS_PER_OPEN` the client rebases: it sends `snapshot` (the state as PDF bytes: the
 * data and the form's UI state written back, WITHOUT the form's `preSave` handling and barcodes, which `download` runs) and
 * then `dispose` and `open` with those bytes, `ops: []`, `at` of the last log entry, and the `answers` of the open that built the run (the reopen
 * takes the same load-time choice-box answers, consumed in order; without them a form that asks while it loads is `answerRequired`). The new run's log starts at 0. A `snapshot` of the run, reopened, shows
 * the render tree and datasets the live run showed (tested on both corpus forms and the synthetic form); scripts that run when
 * a form loads run again under the new `at`.
 *
 * `snapshotted.faithful` means "reopening these bytes reproduces this session's render tree and data", checked by the session with
 * an extra open (the form's UI state comes back only through its own restore script and a saved `form` packet, so a form can fail
 * the check). On `false` the client must NOT rebase; it keeps replaying, and `LOG_FULL` then means the session can take no more
 * edits until the form is reopened from the original file. `snapshot` takes `at`, which MUST be the clock the client will reopen with, and the
 * session runs the live form under it too. That clock is the `at` of the last entry of the client's log (a download's `preSave` entry
 * included; the open's `at` when the log is empty). A form whose layout reads the clock (a `ready:$layout` script) is laid out under the
 * instant of its last log entry, so it is `faithful` only when `at` equals that instant.
 *
 * DOWNLOAD IS AN OP when a pack is given. The form's `preSave` scripts change the live form, so the `downloaded` reply carries
 * `op: { kind: 'preSave', at }`, which the client appends to its log (replaying it runs the same handling, so a rebuild equals the live
 * run). It counts toward `opCount` and is refused with `LOG_FULL` once `opCount` reaches `MAX_OPS_PER_OPEN` (live edits stop one earlier, at `MAX_OPS_PER_OPEN - 1`: the last slot is reserved for a download). Without a pack there is no entry.
 *
 * `opIndex` (in `answerRequired`, `aborted` and `failed`): a number is the index into the `ops` of the `open` that failed;
 * null is the op of this request (a live `op`) or the `open` itself (a message box raised while the form loads). A client
 * that re-opens after such a reply drops that op (when it was a live op), or supplies the answer (see `answers`).
 */

const envelope = { v: z.literal(PROTOCOL_VERSION), id: z.number().int().min(0) };

const instantSchema = z.number().int().min(-MAX_INSTANT_MS).max(MAX_INSTANT_MS);

/** Like the runtime's `valueSchema`, with the text bounded: a value is untrusted input from the page. */
const opValueSchema = z.union([z.string().max(MAX_EVENT_TEXT_CHARS), z.number().finite(), z.boolean(), z.null()]);

const answersSchema = z.array(z.number().int().min(1).max(MAX_ANSWER_VALUE)).max(MAX_ANSWERS_PER_OP).optional();

/**
 * True when no object in the message has an own `__proto__` key. A strict object schema drops that key silently; a peer that
 * sends one is refused instead. Bounded by depth and by node count, so a message cannot make the walk expensive.
 */
function hasNoProtoKey(root: unknown): boolean {
  const queue: [unknown, number][] = [[root, 0]];
  let visited = 0;
  for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
    const [value, depth] = next;
    if (typeof value !== 'object' || value === null || ArrayBuffer.isView(value) || value instanceof ArrayBuffer) continue;
    visited += 1;
    if (visited > MAX_WALKED_NODES || depth > MAX_WALKED_DEPTH) return false;
    if (!Array.isArray(value) && Object.hasOwn(value, '__proto__')) return false;
    for (const child of Object.values(value)) if (typeof child === 'object' && child !== null) queue.push([child, depth + 1]);
  }
  return true;
}

/**
 * FD-38 exemption (security invariant): the most objects `hasNoProtoKey` walks in one request. A request has at most
 * `MAX_OPS_PER_OPEN` ops of two objects each (the op and its `fields`), plus the host, pack and answers; four times the ops
 * leaves room for that, and a message with more objects is not a request this protocol defines. No firm or operator has a reason to vary it.
 */
const MAX_WALKED_NODES = 4 * MAX_OPS_PER_OPEN + 64;

/**
 * FD-38 exemption (security invariant): the deepest nesting `hasNoProtoKey` walks. The deepest legal request is
 * request, ops array, op, fields: four levels; eight leaves room and refuses a message nested to exhaust the walk. No firm or operator has a reason to vary it.
 */
const MAX_WALKED_DEPTH = 8;

// ---- ops -------------------------------------------------------------------------------------------------------------

/**
 * One user operation. `at` is the instant (ms since the epoch) the form's clock reads while the op runs, so a replay sees
 * the same time the first run did (plan decision D3). `answers` are the buttons the user pressed in the choice message
 * boxes the op raises, consumed in order; a box with the OK button alone needs none.
 */
const setValueOp = z.strictObject({ kind: z.literal('setValue'), som: somTextSchema, value: opValueSchema, at: instantSchema, answers: answersSchema });
const eventOp = z.strictObject({ kind: z.literal('event'), som: somTextSchema, activity: activitySchema, fields: eventFieldsSchema.optional(), at: instantSchema, answers: answersSchema });
const validateOp = z.strictObject({ kind: z.literal('validate'), at: instantSchema, answers: answersSchema });

/**
 * The form's own save handling, exactly as `download` runs it: with the pack, read the validated flag, broadcast `preSave` over the
 * form, read the barcode fields (`runtime.encodeBarcodes`). Nothing else: no save, no bytes. It changes the live form (the `preSave`
 * scripts write), so it is an op: a `download` with a pack applies it to the live run and answers it as `downloaded.op`, which the
 * client appends to its log; a replay then reproduces the live form. It takes no `answers` (a download carries none): a `preSave`
 * choice box ends the run with `ANSWER_REQUIRED`. A `download` without a pack runs no `preSave` handling and has no entry.
 */
const preSaveOp = z.strictObject({ kind: z.literal('preSave'), at: instantSchema });

export const opSchema = z.discriminatedUnion('kind', [setValueOp, eventOp, validateOp, preSaveOp]);
export type Op = z.infer<typeof opSchema>;

/** Characters of text an op carries; the sum over an `open` is bounded by `MAX_OPS_TEXT_CHARS`. */
export function opTextChars(op: Op): number {
  if (op.kind === 'validate' || op.kind === 'preSave') return 0;
  const fields = op.kind === 'event' && op.fields !== undefined ? Object.values(op.fields).reduce<number>((n, v) => n + (typeof v === 'string' ? v.length : 0), 0) : 0;
  const value = op.kind === 'setValue' && typeof op.value === 'string' ? op.value.length : 0;
  return op.som.length + value + fields;
}

// ---- requests --------------------------------------------------------------------------------------------------------

/**
 * The PDF bytes of an `open`. A view onto shared memory is refused: the page could change the bytes while the session reads
 * them (length checked, content swapped), and the session's copy-on-need cannot be relied on.
 */
const pdfSchema = pdfBytesSchema.refine((bytes) => bytes.buffer instanceof ArrayBuffer, { error: 'pdf must not be backed by shared memory' });

const timezoneTextSchema = z
  .string()
  .min(1)
  .max(MAX_TIMEZONE_CHARS)
  .refine((text) => timezoneSchema.safeParse(text).success, { error: 'timezone is not UTC, a fixed offset or an IANA zone name' });

const openRequest = z
  .strictObject({
    ...envelope,
    kind: z.literal('open'),
    /** The PDF to run. The session copies what it needs; the page keeps its own buffer if it did not transfer it. */
    pdf: pdfSchema,
    /** The form's Pack descriptor; without it `validate` ops and barcode encoding on download are refused. */
    pack: packFormDescriptorSchema.optional(),
    host: hostIdentitySchema,
    timezone: timezoneTextSchema,
    /** The instant the form's clock reads while the form loads (the same role as `at` of an op). */
    at: instantSchema,
    /** The buttons the user pressed in choice message boxes the form raises while it loads (and in the first layout), consumed in order. Engine budgets are the deployment's (`serveFormSession` options), not the page's. */
    answers: answersSchema,
    /** The op log to replay, in order, on the fresh runtime (PA-8); empty for a first open. */
    ops: z.array(opSchema).max(MAX_OPS_PER_OPEN),
  })
  .refine((request) => request.ops.reduce((sum, op) => sum + opTextChars(op), 0) <= MAX_OPS_TEXT_CHARS, { error: `the ops carry more than ${MAX_OPS_TEXT_CHARS} characters of text` });

const opRequest = z.strictObject({ ...envelope, kind: z.literal('op'), op: opSchema });
/** The current render tree, in full. */
const layoutRequest = z.strictObject({ ...envelope, kind: z.literal('layout') });
/** The form's own `preSave` handling (when a pack was given) and the PDF with the data written back. `at` is the clock it reads. */
const downloadRequest = z.strictObject({ ...envelope, kind: z.literal('download'), at: instantSchema });
/** The state as PDF bytes, to rebase the op log (see the contract above). Runs no `preSave` handling and no barcode encoding. `at` is the clock the client will reopen the bytes with. */
const snapshotRequest = z.strictObject({ ...envelope, kind: z.literal('snapshot'), at: instantSchema });
/**
 * Every field that fails its own declarative validation right now, in document order (`FormRuntime.problems`). Not an op: it reads
 * the form, runs no script and changes nothing, so it has no `at`, is not logged, does not count toward `opCount`, and a replay
 * never needs it. Answered `problemList`.
 */
const problemsRequest = z.strictObject({ ...envelope, kind: z.literal('problems') });
const disposeRequest = z.strictObject({ ...envelope, kind: z.literal('dispose') });

export const requestSchema = z.discriminatedUnion('kind', [openRequest, opRequest, layoutRequest, downloadRequest, snapshotRequest, problemsRequest, disposeRequest]);
export type Request = z.infer<typeof requestSchema>;
export type OpenRequest = z.infer<typeof openRequest>;

// ---- responses -------------------------------------------------------------------------------------------------------

const clipped = z.string().max(MAX_RECORDED_TEXT_CHARS);

export const messageBoxCallSchema = z.strictObject({ text: clipped, title: clipped, icon: z.number().finite(), buttons: z.number().finite() });

const messageRecordSchema = z.strictObject({ ...messageBoxCallSchema.shape, result: z.number().int(), event: clipped, nodeSom: clipped });

const loadReportSchema = z.strictObject({
  scriptObjects: z.number().int().min(0),
  scriptsRun: z.number().int().min(0),
  byPhase: z.record(z.string().max(64), z.number().int().min(0)),
  calcPasses: z.number().int().min(0),
  savedState: z.strictObject({ status: z.enum(['none', 'rejected', 'restorable']), deltas: z.number().int().min(0), skipped: z.number().int().min(0) }),
});

/** What the form's own Validate button found (a `validate` op). */
const validationSchema = z.strictObject({
  complete: z.boolean(),
  flag: z.union([z.string(), z.number(), z.null()]),
  firstMissingField: z.string().max(MAX_RECORDED_TEXT_CHARS).nullable(),
  notes: z.array(z.string().max(MAX_RECORDED_TEXT_CHARS)),
  barcodesPresence: z.string().max(64),
});

/** Why a run ended: the engine's error code, the budget (for `SCRIPT_LIMIT`) and a message already escaped by safe-text. */
const reasonSchema = z.strictObject({ code: z.string().max(64), limit: z.string().max(64).optional(), message: z.string().max(MAX_FAILURE_MESSAGE_CHARS * 6 + 3) });

const messageList = z.array(messageRecordSchema).max(MAX_RECORDED_ENTRIES);
const requestList = z.array(hostRequestSchema).max(MAX_RECORDED_ENTRIES);

/** `opCount` is the number of ops applied in this run so far (the `ops` of the open, then each live op). */
const opCountSchema = z.number().int().min(0);
/**
 * `clearButton` is present when the `open` carried a pack: what the engine found for the pack's optional `clearButton` in the form as
 * it stands after the replay (`absent`, `found` with the canonical SOM of the button field, or a typed `issue`). An issue never fails the open.
 */
const opened = z.strictObject({
  ...envelope,
  kind: z.literal('opened'),
  renderTree: renderTreeSchema,
  report: loadReportSchema,
  opCount: opCountSchema,
  clearButton: clearButtonReportSchema.optional(),
  /** Requests with no effect on the form that its scripts made while it loaded and laid out (not those of replayed ops, which the client already showed); present only when there are some. */
  requests: requestList.optional(),
});
/**
 * The op ran. `renderTree` is present only when the op changed what the form shows (the engine answers the same tree object
 * when nothing changed); `issues` is always the current tree's. `messages` and `focus` are what this op raised. `requests` (present only
 * when there are some) are the requests with no effect on the form that the op's scripts made of the host (print, launch a URL, a text
 * prompt): the viewer shows them, nothing was done, and a replay changes nothing because they are not state.
 */
const applied = z.strictObject({
  ...envelope,
  kind: z.literal('applied'),
  renderTree: renderTreeSchema.optional(),
  messages: messageList,
  focus: z.array(clipped).max(MAX_RECORDED_ENTRIES),
  requests: requestList.optional(),
  issues: renderTreeSchema.shape.issues,
  validation: validationSchema.optional(),
  opCount: opCountSchema,
});
/**
 * A choice message box has no answer yet. The run is gone: the client asks its user and sends `open` again with the op log and
 * the answer (the op's `answers`, or the open's `answers` when `opIndex` is null and the request was an `open`). `opIndex` is the
 * index into the replayed `ops`; null is the op of this request, or the open itself.
 */
const answerRequired = z.strictObject({ ...envelope, kind: z.literal('answerRequired'), call: messageBoxCallSchema, opIndex: z.number().int().min(0).nullable() });
/**
 * A script or runtime failure ended the run. The run is gone: the client sends `open` again with the op log less the op named
 * here. `opIndex` is the index into the replayed `ops`, or null: the op of this request (a live `op`), or no op at all (a layout, snapshot or download).
 */
const aborted = z.strictObject({ ...envelope, kind: z.literal('aborted'), reason: reasonSchema, som: z.string().max(MAX_RECORDED_TEXT_CHARS).optional(), opIndex: z.number().int().min(0).nullable() });
/** `op` is present when the download ran the form's `preSave` handling (a pack was given): the client MUST append it to its op log (it counts toward `opCount` and `LOG_FULL`). Absent: nothing to append. */
const downloaded = z.strictObject({
  ...envelope,
  kind: z.literal('downloaded'),
  bytes: z.instanceof(Uint8Array),
  validated: z.boolean().nullable(),
  op: preSaveOp.optional(),
  /** Requests with no effect on the form that the `preSave` handling made (see `applied.requests`); present only when there are some. */
  requests: requestList.optional(),
});
/**
 * `faithful` is a verified fact: reopening these bytes (in a separate runtime, with the same host, timezone and limits, under the
 * request's `at`, no ops, the open's own answers) reproduced this session's render tree and data exactly. It costs one extra open per snapshot.
 * Anything else, including a check that needed a message-box answer or failed, is false.
 */
const snapshotted = z.strictObject({ ...envelope, kind: z.literal('snapshotted'), bytes: z.instanceof(Uint8Array), faithful: z.boolean() });
const laidOut = z.strictObject({ ...envelope, kind: z.literal('laidOut'), renderTree: renderTreeSchema });
/** The answer to `problems`: `truncated` when the list was cut at its ceiling. */
const problemList = z.strictObject({ ...envelope, kind: z.literal('problemList'), ...problemListSchema.shape });
const disposed = z.strictObject({ ...envelope, kind: z.literal('disposed') });
/** The request was refused or failed without ending a healthy run; `opIndex` names the op of an `open` replay that failed. */
const failed = z.strictObject({
  v: z.literal(PROTOCOL_VERSION),
  id: z.number().int().min(0).nullable(),
  kind: z.literal('failed'),
  code: z.string().max(64),
  message: z.string().max(MAX_FAILURE_MESSAGE_CHARS * 6 + 3),
  opIndex: z.number().int().min(0).optional(),
});

export const responseSchema = z.discriminatedUnion('kind', [opened, applied, answerRequired, aborted, downloaded, snapshotted, laidOut, problemList, disposed, failed]);
export type Response = z.infer<typeof responseSchema>;
export type FailedResponse = z.infer<typeof failed>;
export type MessageBoxCallData = z.infer<typeof messageBoxCallSchema>;
/** A response without its envelope (`v`, `id`): what the session computes, the transport wraps. */
export type ResponseBody = Response extends infer R ? (R extends unknown ? Omit<R, 'v' | 'id'> : never) : never;

// ---- inbound parsing -------------------------------------------------------------------------------------------------

const headSchema = z.looseObject({ v: z.unknown().optional(), id: envelope.id.optional() });

/** The correlation id of a message, or null when it has none; reads nothing else, so it is cheap for a message that is to be refused unread. */
export function peekId(data: unknown): number | null {
  try {
    const head = headSchema.safeParse(data);
    return head.success ? (head.data.id ?? null) : null;
  } catch {
    // An object that throws when it is read (a hostile getter or proxy) has no id we can trust.
    return null;
  }
}

export type ParsedRequest =
  | { readonly ok: true; readonly request: Request }
  | { readonly ok: false; readonly id: number | null; readonly code: 'INVALID_MESSAGE' | 'UNSUPPORTED_VERSION'; readonly message: string };

/** The ONE gate for inbound requests: shape, version, then the request itself. Never throws for any input a hostile peer can send. */
export function parseRequest(data: unknown): ParsedRequest {
  try {
    return parseUnguarded(data);
  } catch {
    // Reading the message threw (a getter or proxy of a same-realm caller; a structured clone cannot carry one).
    return { ok: false, id: null, code: 'INVALID_MESSAGE', message: 'the message could not be read' };
  }
}

function parseUnguarded(data: unknown): ParsedRequest {
  const head = headSchema.safeParse(data);
  if (!head.success) return { ok: false, id: null, code: 'INVALID_MESSAGE', message: 'the message is not an object' };
  const id = head.data.id ?? null;
  const version = envelope.v.safeParse(head.data.v);
  if (!version.success) return { ok: false, id, code: 'UNSUPPORTED_VERSION', message: `protocol version ${PROTOCOL_VERSION} is required` };
  if (!hasNoProtoKey(data)) return { ok: false, id, code: 'INVALID_MESSAGE', message: 'the request is not valid (a __proto__ key is not allowed)' };
  const parsed = requestSchema.safeParse(data);
  if (parsed.success) return { ok: true, request: parsed.data };
  const issue = parsed.error.issues[0];
  const where = issue === undefined ? '' : ` (${safeText(issue.path.join('.') || '<root>', 80)}: ${safeText(issue.message, 120)})`;
  return { ok: false, id, code: 'INVALID_MESSAGE', message: `the request is not valid${where}` };
}

/** Parses a response the client received from the worker (the client's own gate). */
export function parseResponse(data: unknown): z.ZodSafeParseResult<Response> {
  return responseSchema.safeParse(data);
}
