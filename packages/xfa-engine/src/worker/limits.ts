import { MAX_PDF_BYTES } from '../wire-limits.js';

/**
 * Ceilings on what the worker protocol accepts from its peer (W03-T14). The peer is the page that hosts the viewer; the
 * session treats every message as untrusted. Each ceiling guards work or memory the sender could otherwise choose.
 */

/**
 * FD-38 exemption (security invariant): most ops one `open` request may replay, and the length at which a client must
 * rebase its log (see the contract in `protocol.ts`). Every op runs form scripts and a layout, so the count bounds the
 * work one message can ask for, and the run has a total-time budget of 120 s (`formRunDeadlineMs`) that the whole replay,
 * layouts included, is charged against. Measured on the two corpus forms (a count-bounded replay in the session, wall clock
 * read only to report): an op that changes what the form shows costs about 40 ms (500 writes of a changing name: 40.3 ms
 * and 37.6 ms per op), the synthetic-person fill averages 14 to 18 ms per op, and an op that changes nothing about 4 ms.
 * 1,500 ops at the worst measured 40 ms is 60 s, half the budget, so a replay on a machine twice as slow still finishes;
 * the previous 20,000 was unreachable (a replay of about 3,000 such ops already exhausts the budget). A full fill of the
 * largest corpus form is under 500 ops, so 1,500 is three times that, and a longer session rebases through `snapshot`
 * instead of growing the log. No firm or operator has a reason to vary it.
 */
export const MAX_OPS_PER_OPEN = 1_500;

/**
 * FD-38 exemption (security invariant): the worst measured cost of one value-changing op, in ms (see `MAX_OPS_PER_OPEN`: 40.3 ms
 * per op on the two corpus forms, measured on Apple silicon in Node). It is a measurement, not a limit; `MIN_FORM_RUN_DEADLINE_MS`
 * is built from it, and a deployment on a slower device measures its own (W04-T23 acceptance). No firm or operator has a reason to vary it.
 */
export const WORST_MS_PER_OP = 40;

/**
 * FD-38 exemption (security invariant): the slowdown a full-log replay must survive, as a factor over `WORST_MS_PER_OP` (a browser's
 * WebAssembly, or a slower machine than the one measured, may take twice as long). No firm or operator has a reason to vary it.
 */
export const REPLAY_HEADROOM = 2;

/**
 * FD-38 exemption (security invariant): the smallest `formRunDeadlineMs` a session accepts, `MAX_OPS_PER_OPEN` x `WORST_MS_PER_OP` x
 * `REPLAY_HEADROOM` (120,000 ms, the engine's default). The count `MAX_OPS_PER_OPEN` guards a wall-clock budget: below this
 * figure a log at the ceiling can exhaust the budget on its own replay, and the client's rebuild would abort again. A deployment
 * whose slowest supported device is slower than the figure measured must raise `formRunDeadlineMs` above it (sizing rule at
 * `FormSessionOptions.limits`). No firm or operator has a reason to vary it.
 */
export const MIN_FORM_RUN_DEADLINE_MS = MAX_OPS_PER_OPEN * WORST_MS_PER_OP * REPLAY_HEADROOM;

/**
 * FD-38 exemption (security invariant): most message-box answers one op may carry. A click handler raises a handful of
 * boxes (the corpus Clear Form raises two); 32 leaves room for a form that confirms several steps, and a script that raised
 * more is stopped by the recorder ceilings before a person would answer them. No firm or operator has a reason to vary it.
 */
export const MAX_ANSWERS_PER_OP = 32;

/**
 * FD-38 exemption (correctness constant): largest number a message-box answer may be. The form's script reads the answer
 * and the engine only passes it on unchanged; no claim is made here about what any number means. Only 1 is evidenced, by
 * the corpus forms' own scripts (they test for it and call it the OK button). A message-box answer is a button number, so a
 * small positive integer; 16 leaves room for any button numbering a form could use and refuses an absurd value. A different
 * ceiling cannot make a form read a different answer.
 */
export const MAX_ANSWER_VALUE = 16;

/**
 * FD-38 exemption (security invariant): most characters of text in all ops of one `open` together (values, fields, SOM
 * paths). The per-value ceiling alone allows 1,500 ops of 64 KiB characters (about 98 million characters, 188 MiB of UTF-16);
 * this bounds the total at 8 Mi characters (16 MiB), thousands of times the text of a full fill of the largest corpus form. No firm or
 * operator has a reason to vary it.
 */
export const MAX_OPS_TEXT_CHARS = 8 * 1024 * 1024;

/**
 * FD-38 exemption (security invariant): most requests the session holds waiting while it works on an earlier one (an
 * `open` or `download` runs for a while and cannot be interleaved). The platform queues messages without bound; this keeps
 * the session's own queue bounded, and a peer that sends more answers `failed` (`BUSY`) for the surplus. A viewer client
 * sends one request at a time, so 256 is far above any honest use. No firm or operator has a reason to vary it.
 */
export const MAX_PENDING_REQUESTS = 256;

/**
 * FD-38 exemption (security invariant): longest text of a failure message the session sends. The message is built from
 * file- and form-controlled text, so it passes through the engine's safe-text escaping and is clipped here. No firm or
 * operator has a reason to vary it.
 */
export const MAX_FAILURE_MESSAGE_CHARS = 300;

/**
 * FD-38 exemption (correctness constant): the widest instant, in milliseconds from the epoch, that a JavaScript `Date`
 * can hold (ECMAScript 21.4.1.1). An injected clock outside it is not a time at all.
 */
export const MAX_INSTANT_MS = 8.64e15;

/**
 * FD-38 exemption (security invariant): most bytes of PDF the session holds in requests that wait for or are being served
 * (the `pdf` of each queued `open`). The platform queues messages without bound and a PDF is up to `MAX_PDF_BYTES` (50 MiB),
 * so the count ceiling alone (`MAX_PENDING_REQUESTS`, 256) would allow about 12 GiB. Twice `MAX_PDF_BYTES` lets one `open` run
 * while the client already sends the next (a rebase or a reopen after an abort); a peer that sends more answers `failed`
 * (`BUSY`) for the surplus. A viewer client has one form open and one request in flight. No firm or operator has a reason to vary it.
 */
export const MAX_QUEUED_PDF_BYTES = 2 * MAX_PDF_BYTES;
