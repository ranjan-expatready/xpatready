import { z } from 'zod';
import { MAX_EVENT_TEXT_CHARS, MAX_PROBLEMS, MAX_RECORDED_TEXT_CHARS, MAX_SOM_CHARS } from '../wire-limits.js';

/**
 * The schemas of what a caller hands the runtime that the worker protocol also puts on the wire: SOM text, event
 * activities and fields, the host identity, the Pack descriptor, and what the runtime reports back (host requests, problems,
 * pack issues). They import only `zod` and `wire-limits.ts`, so the
 * protocol (and the page that bundles it) does not reach the engine (W03-T14, F7). `options.ts` and `pack.ts` re-export them.
 */
export const somTextSchema = z.string().min(1).max(MAX_SOM_CHARS);

/** The XFA event activities (XFA 3.3 "Event Model"). */
export const ACTIVITIES = [
  'calculate', 'change', 'click', 'docClose', 'docReady', 'enter', 'exit', 'full', 'indexChange', 'initialize', 'mouseDown',
  'mouseEnter', 'mouseExit', 'mouseUp', 'postExecute', 'postPrint', 'postSave', 'postSign', 'postSubmit', 'preExecute',
  'preOpen', 'prePrint', 'preSave', 'preSign', 'preSubmit', 'ready', 'validationState',
] as const;
export type Activity = (typeof ACTIVITIES)[number];
export const activitySchema = z.enum(ACTIVITIES);

const text = z.string().max(MAX_EVENT_TEXT_CHARS);
export const eventFieldsSchema = z
  .strictObject({
    newText: text,
    prevText: text,
    change: text,
    fullText: text,
    selStart: z.number().int().nonnegative(),
    selEnd: z.number().int().nonnegative(),
    shift: z.boolean(),
    modifier: z.boolean(),
    keyDown: z.boolean(),
  })
  .partial();

const identityText = z.string().max(64);
export const hostIdentitySchema = z.strictObject({
  name: identityText,
  appType: identityText,
  version: identityText,
  variation: identityText,
  platform: identityText,
  language: identityText,
});

export const packFormDescriptorSchema = z.strictObject({
  validateButton: somTextSchema,
  validatedFlag: somTextSchema,
  validatedValue: z.string().min(1).max(256),
  firstMissingField: somTextSchema,
  barcodes: somTextSchema,
  /**
   * Optional: the form's own clear (erase) button, a SOM from the root subform. The engine does nothing with it except check it
   * on open (`FormRuntime.clearButton`) and hand its canonical SOM back, so a viewer can warn before the click reaches the form.
   * The name is the pack's, never the engine's.
   */
  clearButton: somTextSchema.optional(),
});

// ---- what the runtime reports back --------------------------------------------------------------------------------

const clipped = z.string().max(MAX_RECORDED_TEXT_CHARS);
const where = { event: clipped, nodeSom: clipped };

/**
 * A request the form made of its host that has no effect on the form: the viewer decides what to show. Recorded in order, never
 * acted on by the engine (no printing, no navigation, no prompt). Each carries the activity that was running and the canonical
 * SOM of the node whose script made it, like a message box.
 * - `print`: `xfa.host.print(bUI, nStart, nEnd, bNoCancelDialog, bShrinkToFit, bPrintAsImage, bReverse, bAnnotations)`.
 * - `launchURL`: `app.launchURL(cURL, bNewFrame)`.
 * - `response`: `app.response(cQuestion, cTitle, cDefault, bPassword, cLabel)`; the script was told the user cancelled (null).
 */
export const hostRequestSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('print'),
    ui: z.boolean(),
    start: z.number().int(),
    end: z.number().int(),
    noCancelDialog: z.boolean(),
    shrinkToFit: z.boolean(),
    asImage: z.boolean(),
    reverse: z.boolean(),
    annotations: z.boolean(),
    ...where,
  }),
  z.strictObject({ kind: z.literal('launchURL'), url: clipped, newFrame: z.boolean(), ...where }),
  z.strictObject({ kind: z.literal('response'), question: clipped, title: clipped, default: clipped, password: z.boolean(), label: clipped, ...where }),
]);

/**
 * A field that fails its declarative XFA validation (`FormRuntime.problems`). `som` is the canonical SOM of the field or
 * exclusion group; `kind` is the test that failed; `severity` is that test's setting (`error` or `warning`); `access` is the container's access; `message` is the
 * form's own text for that test (`validate/message/text[name=<kind>]`) or null when the template gives none.
 */
export const formProblemSchema = z.strictObject({
  som: clipped,
  kind: z.enum(['nullTest', 'formatTest']),
  severity: z.enum(['error', 'warning']),
  message: clipped.nullable(),
  /** The container's effective `access` (its own, made at least as restrictive as every ancestor's): a `readOnly`, `protected` or `nonInteractive` field stays in the list (the form may need it), but the user cannot type in it, so the viewer decides how to show it. */
  access: z.enum(['open', 'nonInteractive', 'protected', 'readOnly']),
});

export const problemListSchema = z.strictObject({ problems: z.array(formProblemSchema).max(MAX_PROBLEMS), truncated: z.boolean() });

/** Why the pack's clear button was not handed back: it names nothing in the form, or a node that is not a button field. */
export const PACK_ISSUE_CODES = ['CLEAR_BUTTON_UNRESOLVED', 'CLEAR_BUTTON_NOT_A_BUTTON'] as const;

/**
 * The outcome of checking the pack's optional `clearButton` against the opened form. A typed result, never a thrown error: a
 * pack whose clear button does not fit is a pack mistake, and the form is still usable without the warning.
 */
export const clearButtonReportSchema = z.discriminatedUnion('status', [
  z.strictObject({ status: z.literal('absent') }),
  z.strictObject({ status: z.literal('found'), som: clipped }),
  z.strictObject({ status: z.literal('issue'), code: z.enum(PACK_ISSUE_CODES), message: clipped }),
]);
