import { z } from 'zod';
import type { RenderTree } from '../layout/render-tree.js';
import type { SandboxUsage, SandboxWasmOptions, ScriptClock } from '../script/index.js';
import type { SavedFormState } from '../model/form-packet/index.js';
import { XfaRuntimeError } from './errors.js';
import type { RuntimeLimits } from './limits.js';
import type { PackFormDescriptor } from './pack.js';
import { timezoneSchema } from './timezone.js';
import type { UserAction, UserActionCheck } from './user-access.js';
import { hostIdentitySchema, type clearButtonReportSchema, type formProblemSchema, type hostRequestSchema, type problemListSchema } from './wire-schemas.js';

/**
 * Who the form believes is running it (`xfa.host.*`). Injected by the caller (plan decision D3): the engine has no
 * default, so it cannot impersonate any vendor, and a form that branches on the host sees exactly what the deployment chose.
 */
export interface HostIdentity {
  readonly name: string;
  readonly appType: string;
  readonly version: string;
  readonly variation: string;
  readonly platform: string;
  readonly language: string;
}

/** One `xfa.host.messageBox(text, title, icon, buttons)` call. */
export interface MessageBoxCall {
  readonly text: string;
  readonly title: string;
  readonly icon: number;
  readonly buttons: number;
}

export interface MessageRecord extends MessageBoxCall {
  /** What the script got back (the caller's `messageBoxResult`, default 1 = OK). */
  readonly result: number;
  /** Activity that was running, e.g. `click`. */
  readonly event: string;
  /** Canonical SOM of the node whose script raised it. */
  readonly nodeSom: string;
}

/**
 * A request the form made of its host that changes nothing in the form: `xfa.host.print`, `app.launchURL`, `app.response`.
 * Recorded, never acted on (schema and semantics in `wire-schemas.ts`).
 */
export type HostRequestRecord = z.infer<typeof hostRequestSchema>;

/** A field that fails its declarative validation: see `FormRuntime.problems`. */
export type FormProblem = z.infer<typeof formProblemSchema>;

/** What `FormRuntime.problems` returns; `truncated` when the list was cut at its ceiling. */
export type ProblemList = z.infer<typeof problemListSchema>;

/** What `FormRuntime.clearButton` found: no clear button in the descriptor, its canonical SOM, or a typed issue. */
export type ClearButtonReport = z.infer<typeof clearButtonReportSchema>;

/** A form script touched a member the engine does not model (`class.member`). */
export interface UnsupportedRecord {
  readonly class: string;
  readonly member: string;
}

/**
 * A form script wrote a property the object model does not define on a subform, exclusion group or field (`class.member`).
 * The engine keeps it on that node, readable by scripts, and never writes it to the data or the template. Listed once per
 * class and member. Informational: a note is not a defect of the run.
 */
export interface NoteRecord {
  readonly class: string;
  readonly member: string;
}

export interface FormRuntimeOptions {
  readonly host: HostIdentity;
  /** Injected wall clock (D3). */
  readonly clock: ScriptClock;
  /** Strict: touching an unsupported member is fatal (`UNSUPPORTED_MEMBER`). Default false: record it and carry on. */
  readonly strict?: boolean | undefined;
  /**
   * Where the form's local time is (plan decision D9): `"UTC"`, a fixed offset (`"+05:30"`, `"-08:00"`) or an IANA zone
   * name resolved through `Intl`. The guest `Date`'s local getters, setters, strings and `new Date(y, m, d)` follow it
   * and the injected clock; the process timezone never matters. Default `"UTC"`.
   */
  readonly timezone?: string | undefined;
  readonly limits?: RuntimeLimits | undefined;
  /**
   * The answer a user would give a message box. Default: OK (1). Called synchronously, once per `xfa.host.messageBox` call,
   * and must return the number the form's script receives. The engine does not interpret it: the corpus forms' own scripts
   * test for 1 (their comment calls it the OK button) and that is the only number evidenced here; any other number is passed to the script unchanged.
   *
   * Return `null` for "this box has not been answered": the engine cannot wait for a person (the script engine is
   * synchronous), so it aborts the current run with `ANSWER_REQUIRED` (an `XfaAnswerRequiredError` carrying the
   * `MessageBoxCall`; distinct from a script failure, and no script `try/catch` can absorb it). The box is not recorded in
   * `messages`. The runtime is then `aborted` like after any failure: its state is undefined, the host asks its user and
   * rebuilds the run from the opened PDF, repeating its inputs with the answer supplied (the op-log replay of the worker session).
   * A box with `buttons === 0` (OK only) never needs an answer in practice; the host decides, the engine does not distinguish.
   */
  readonly messageBoxResult?: ((call: MessageBoxCall) => number | null) | undefined;
  /** Where the QuickJS WebAssembly comes from, for hosts that must supply it. */
  readonly wasm?: SandboxWasmOptions | undefined;
}

/** Keystroke-level fields of `xfa.event`, settable per dispatch. */
export interface EventFields {
  readonly newText?: string | undefined;
  readonly prevText?: string | undefined;
  readonly change?: string | undefined;
  readonly fullText?: string | undefined;
  readonly selStart?: number | undefined;
  readonly selEnd?: number | undefined;
  readonly shift?: boolean | undefined;
  readonly modifier?: boolean | undefined;
  readonly keyDown?: boolean | undefined;
}

export type { SavedFormState };

export interface LoadReport {
  /** Script objects defined (JavaScript libraries and data objects). */
  readonly scriptObjects: number;
  /** Event and calculate scripts executed. */
  readonly scriptsRun: number;
  /** Scripts executed per phase (`initialize`, `calculate`, `ready:$form`, `ready:$layout`, `docReady`). `calculate` includes the scripts of the settles that follow a `ready:$form` / `docReady` that changed a value (the form's own restore). */
  readonly byPhase: Readonly<Record<string, number>>;
  /** Calculate passes made by the initial settle and by the settles after a `ready:$form` / `docReady` that changed a value (the form's own restore); 0 when the form has no calculate scripts. Passes re-run after a layout script wrote are not counted here. */
  readonly calcPasses: number;
  readonly elapsedMs: number;
  /** The UI state saved in the PDF's form packet: whether it verified, and how many deltas the form's restore script can apply. */
  readonly savedState: SavedFormState;
}

export interface EventResult {
  // Writes a script makes to `xfa.event` are not reported here: no corpus script writes it (see `EventState`).
  /** Event scripts executed, `execEvent` dispatches included; the `ready:$layout` scripts of the layout that follows are not counted (they are the layout's). */
  readonly scriptsRun: number;
  /** Calculate passes of the settle that followed (0 when nothing changed). */
  readonly calcPasses: number;
}

export interface SetValueResult {
  readonly calcPasses: number;
}

/** What clicking a form's own Validate button produced (W02-T07). */
export interface ValidateResult {
  /** True when the form's validated flag holds the descriptor's `validatedValue` after the click. */
  readonly complete: boolean;
  /** The validated flag's value after the click. */
  readonly flag: string | number | null;
  /**
   * Canonical SOM of the first missing or invalid field the form found, as the form stored it; null when it found none.
   * INVARIANT: `complete` implies `firstMissingField` is null. A form that contradicts itself (stores a field and still
   * sets its validated flag) is returned as complete with null here, and `notes` says what was dropped.
   */
  readonly firstMissingField: string | null;
  /** Diagnostics about the form's own behaviour (currently only the contradiction above). Empty for a well-behaved form. */
  readonly notes: readonly string[];
  /** The message boxes this click raised, in order. */
  readonly messages: readonly MessageRecord[];
  /** The focus requests this click made (canonical SOMs), in order. */
  readonly focus: readonly string[];
  /** `presence` of the barcode container after the click (`hidden` while the form is incomplete). */
  readonly barcodesPresence: string;
  readonly scriptsRun: number;
  readonly calcPasses: number;
}

/** The barcode fields after the form's own `preSave` handling (W02-T07). */
export interface BarcodePayloads {
  /** True when the validated flag held `validatedValue` before the save: only then does a form encode. */
  readonly validated: boolean;
  /** One entry per barcode field in order; null for a field the form left empty. */
  readonly payloads: readonly (string | null)[];
  /** Handlers the `preSave` broadcast ran. */
  readonly scriptsRun: number;
}

export type RuntimeState = 'created' | 'loaded' | 'aborted' | 'disposed';

/**
 * One form run: a merged form DOM, a sandbox holding the form's script objects, and the recorders for what the form
 * asked of its host. One run per runtime; a failure in a script aborts the run (its state is undefined afterwards),
 * a caller mistake (bad argument, unknown node) does not.
 */
export interface FormRuntime {
  readonly state: RuntimeState;
  /**
   * Defines the script objects, then runs the XFA load sequence: initialize, calculate settle, ready ($form), layout, ready ($layout), docReady.
   * The layout (W02-T09) is the real one: `xfa.layout.page(node)` and `pageCount()` answer from it, the master-page `ready:$layout`
   * scripts run once per page instance. The layout is brought up to date lazily, only when the form changed since the last one
   * (a value, a presence, a size, the data): before any script event or broadcast is dispatched, on the layout being read, on
   * `save()` / `saveDatasets()`, and at the end of `load()` (after docReady). `setValue` itself does not lay out, so a value a
   * `ready:$layout` script writes (page numbers, master-page headers) is stale after `setValue` until one of those points.
   * Each settle runs `ready:$layout` again, up to the `maxLayoutPasses` limit.
   * Validate scripts do NOT run during load: the XFA processing model runs a validate pass between the calculate settle
   * and `ready`, but whether Acrobat runs the forms' own `validate` scripts at that point is unconfirmed, and running
   * them could raise message boxes or colour fields before a user acts. The forms' Validate button is the only caller
   * (`validate()`). Plan 3 golden-corpus checklist item: confirm against the viewer, then decide.
   */
  load(): LoadReport;
  /**
   * The form as it looks now: pages of positioned items (borders, text, images, field overlays; points from each page's
   * top-left corner, in paint order) and the fonts and images they use, once (W02-T12). Brings the layout up to date first
   * when the form changed since the last one (the settle points of `load`), so a batch of writes costs one layout; asking
   * again with no write in between answers the same object. Needs `load()` (`NOT_LOADED`). Like any call that runs
   * scripts, a failure in a form script aborts the run.
   *
   * When the settle reached its pass ceiling with the form still changing, the tree is flagged `settled: false` (with an `issues` entry) and its `text` items may lag a calculated field's overlay `value`: the last calculate wrote after the layout was made.
   *
   * The tree is shared, not copied: treat it as read-only. Its resource `bytes` are shared with the engine's font and image
   * caches: copy or structured-clone them, never transfer (detach) them. Layout features the engine does not model, and
   * fallbacks it took, are in `issues`; the tree always passes `renderTreeSchema`.
   */
  layout(): RenderTree;
  /** Writes a value as the user's input would (`rawValue`) and settles the calculates. Does not lay out (see `load`). */
  setValue(som: string, value: string | number | boolean | null): SetValueResult;
  /** Runs the node's scripts for `activity` with `xfa.event` populated, then settles the calculates if a value changed. */
  event(som: string, activity: string, fields?: EventFields): EventResult;
  /** A field's or exclusion group's raw value, a text variable's or text node's value, or a data node's value. */
  getValue(som: string): string | number | null;
  /** A scalar member (`presence`, `className`, `selectedIndex`, ...) of any node. */
  getProperty(som: string, member: string): string | number | boolean | null;
  /**
   * Runs every node's handlers for `activity` in document order, as a host does for document-level events (`preSave`,
   * `prePrint`, `postSave`, `docClose`), then settles the calculates if a value changed.
   */
  broadcast(activity: string): EventResult;
  /** Canonical SOMs of a form node's children, in order, optionally only those of one class (`field`, `subform`, ...). */
  children(som: string, className?: string): readonly string[];
  /**
   * Clicks the form's own Validate button, named by the Pack descriptor, and reports the outcome (complete or not, the
   * first missing field, the messages and focus of that click). The form's scripts decide everything; the engine reads.
   */
  validate(pack: PackFormDescriptor): ValidateResult;
  /** Runs the form's own `preSave` handling and returns the barcode fields' payloads (all null when the form did not validate). */
  encodeBarcodes(pack: PackFormDescriptor): BarcodePayloads;
  /**
   * Every field or exclusion group that fails its own declarative XFA validation right now, in document order, independently of
   * the form's Validate button (which stops at its first missing field). Read-only: no script runs, nothing is flagged or
   * recorded, no barcode changes, the layout is not touched.
   *
   * What is tested, per XFA 3.3 (the `validate` element): `nullTest` (`error` or `warning`) fails an empty field or exclusion
   * group; `formatTest` (`error` or `warning`) fails a non-empty field whose value does not fit the `validate` picture, when it
   * has one. `scriptTest` is NOT evaluated: a validate script is arbitrary form code that raises message boxes, moves focus,
   * recolours and writes other fields, so running it would change the form (and the form's own Validate button is where it runs).
   * The settings are the live ones (a script may have set `mandatory` since the template was read, and the saved form state
   * restores it). A container is considered only when it and every ancestor is `visible` (a hidden, invisible, inactive or
   * print-only container hides its subtree: the user cannot see it, so cannot fix it). A container that is `readOnly`, `protected` or `nonInteractive` stays listed, with its `access`. Buttons and barcodes hold no entered
   * value and fields of an exclusion group are covered by the group.
   *
   * Reads the form as it stands: layout scripts that have not run since the last write are not run here (`layout()` or any
   * dispatch settles them first).
   */
  problems(): ProblemList;
  /**
   * Checks the descriptor's optional `clearButton` against the form: `absent` when the descriptor has none, `found` with the
   * canonical SOM when it names a button field, else `issue` (`CLEAR_BUTTON_UNRESOLVED`, `CLEAR_BUTTON_NOT_A_BUTTON`). Reads only.
   */
  clearButton(pack: PackFormDescriptor): ClearButtonReport;
  /**
   * Whether a USER action (typing or picking a value, or an event such as a click) on the node is allowed by the node's effective
   * access (its own and its ancestors', the most restrictive). Reads only; a SOM that names nothing is `allowed` (the action itself
   * then fails in the usual way). The runtime does not enforce it: `setValue` and `event` serve scripts and replays too, which keep
   * writing locked fields. The worker session asks before it applies a live user op.
   */
  checkUserAction(som: string, action: UserAction): UserActionCheck;
  /** The datasets packet (LOV and data) as XML text, as the form's data stands now. Read-only: nothing is written to the PDF (`save()` does that). */
  saveDatasets(): string;
  /**
   * The PDF with the form's data written back: the original bytes unchanged, followed by one incremental update that
   * replaces the `datasets` packet with the data as it stands now (UTF-8, re-parsed under the XML ceilings before it is
   * written) and, when the PDF has a `form` packet, that packet with the UI state scripts set (presence, access,
   * mandatory, captions, colours, item lists, text variables, unbound values) and a checksum over the template and the
   * new datasets, through `XfaPdf.withPackets`; the form's own restore script brings that state back on the next open.
   * Run `validate()` and `encodeBarcodes()` first when the form is to be saved as a complete form: this writes the data as
   * it is, it does not run the form's own save handling. Properties stored on containers beyond the object model
   * (expandos), notes and messages are never written. The run stays usable.
   */
  save(): Promise<Uint8Array>;
  readonly messages: readonly MessageRecord[];
  /** Canonical SOMs the form asked to focus, in order. */
  readonly focus: readonly string[];
  readonly unsupported: readonly UnsupportedRecord[];
  /** What the form asked of its host that changes nothing in the form (print, launch a URL, a text prompt), in order. Recorded, never done. */
  readonly requests: readonly HostRequestRecord[];
  /** Properties scripts stored on containers beyond the object model (expandos), once each. Not an error and not saved. */
  readonly notes: readonly NoteRecord[];
  /** Lines the form printed with `console.println`. */
  readonly console: readonly string[];
  readonly usage: SandboxUsage;
  dispose(): void;
}

const isPdfLike = (value: unknown): boolean =>
  typeof value === 'object' &&
  value !== null &&
  typeof Reflect.get(value, 'packet') === 'function' &&
  typeof Reflect.get(value, 'withPacket') === 'function' &&
  typeof Reflect.get(value, 'withPackets') === 'function' &&
  Array.isArray(Reflect.get(value, 'packets'));

/** The first argument of `createFormRuntime` must be an opened `XfaPdf` (from `openXfaPdf`). */
export function parsePdf(pdf: unknown): void {
  if (!isPdfLike(pdf)) throw new XfaRuntimeError('INVALID_ARGUMENT', 'the first argument must be an opened XfaPdf (from openXfaPdf)');
}

export { ACTIVITIES, activitySchema, eventFieldsSchema, hostIdentitySchema, somTextSchema } from './wire-schemas.js';
export type { Activity } from './wire-schemas.js';

export const valueSchema = z.union([z.string(), z.number().finite(), z.boolean(), z.null()]);

const isFunction = (value: unknown): value is (...args: never[]) => unknown => typeof value === 'function';

/** Everything `createFormRuntime` accepts except `limits` (validated by `resolveRuntimeLimits`). */
const optionsSchema = z.strictObject({
  host: hostIdentitySchema,
  clock: z.custom<ScriptClock>((v) => typeof v === 'object' && v !== null && isFunction(Reflect.get(v, 'now')), 'clock must have a now() function'),
  strict: z.boolean().optional(),
  timezone: timezoneSchema.optional(),
  limits: z.unknown().optional(),
  messageBoxResult: z.custom<(call: MessageBoxCall) => number | null>(isFunction, 'messageBoxResult must be a function').optional(),
  wasm: z.custom<SandboxWasmOptions>((v) => typeof v === 'object' && v !== null, 'wasm must be an object').optional(),
});

export type ParsedOptions = z.output<typeof optionsSchema>;

export function parseOptions(options: unknown): ParsedOptions {
  const parsed = optionsSchema.safeParse(options);
  if (parsed.success) return parsed.data;
  const issue = parsed.error.issues[0];
  const where = issue === undefined ? '' : ` (${issue.path.join('.') || '<root>'}: ${issue.message})`;
  throw new XfaRuntimeError('INVALID_OPTIONS', `invalid form runtime options${where}`, { cause: parsed.error });
}
