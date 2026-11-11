import { z } from 'zod';

/**
 * Ceilings and the byte schema that both the engine and the worker protocol's wire schemas use. This module imports only
 * `zod`, so the page that speaks the protocol can bundle the schemas without bundling the engine (W03-T14, F7). Each
 * constant is re-exported by the module that used to declare it.
 */

/**
 * FD-38 exemption (security invariant): largest PDF accepted by `openXfaPdf`. A denial-of-service
 * ceiling on uploaded input, applied before any parsing; real XFA forms are a few MiB, and no firm or operator has a
 * reason to vary it. `withPacket` output is held to the same ceiling so the engine can always reopen what it writes.
 */
export const MAX_PDF_BYTES = 50 * 1024 * 1024;

/** The PDF bytes `openXfaPdf` and the worker's `open` accept: a non-empty `Uint8Array` of at most `MAX_PDF_BYTES`. */
export const pdfBytesSchema = z
  .instanceof(Uint8Array, { error: 'PDF input must be a Uint8Array' })
  .refine((b) => b.length > 0, { error: 'PDF input is empty' })
  .refine((b) => b.length <= MAX_PDF_BYTES, { error: `PDF input exceeds ${MAX_PDF_BYTES} bytes` });

/**
 * FD-38 exemption (security invariant): longest SOM expression, in characters, `parseSom` accepts or `somExpressionOf`
 * produces. A script chooses the text, so it is refused by length before it is scanned. The longest expression either
 * real form uses is about 120 characters and the absolute path of the deepest real node about 350; this leaves more
 * than forty times that, and no firm or operator has a reason to vary it.
 */
export const MAX_SOM_CHARS = 16 * 1024;

/**
 * FD-38 exemption (security invariant): most entries each recorder keeps (message boxes, focus requests, console
 * lines, unsupported-member records). The recorders live as long as the run, so a script looping over `messageBox`
 * would otherwise grow memory without bound; the real forms record a few dozen entries. A caller may only tighten it.
 */
export const MAX_RECORDED_ENTRIES = 100_000;

/**
 * FD-38 exemption (security invariant): longest text, in characters, one `xfa.event` string field may carry in or out
 * (`newText`, `prevText`, `change`, `fullText`). A keystroke event carries one field's text; the longest real field
 * holds a few thousand characters.
 */
export const MAX_EVENT_TEXT_CHARS = 64 * 1024;

/**
 * FD-38 exemption (security invariant): longest text, in characters, the recorders keep of one message, focus target or
 * console line. A script chooses these strings and the recorders live as long as the run, so an entry is clipped; the
 * real forms' longest message is a few thousand characters.
 */
export const MAX_RECORDED_TEXT_CHARS = 64 * 1024;

/**
 * FD-38 exemption (security invariant): most problems one `problems()` call lists. A problem is one field of the form, so the
 * list is bounded by the form's own size; this keeps a
 * hostile template with a huge number of mandatory empty fields from producing a reply of unbounded size. The real forms
 * have under 200 required fields; ten thousand leaves fifty times that, and no firm or operator has a reason to vary it. A
 * list cut at this ceiling says so (`truncated`).
 */
export const MAX_PROBLEMS = 10_000;
