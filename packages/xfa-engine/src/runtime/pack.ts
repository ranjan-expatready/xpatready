import type { BarcodePayloads, EventResult, MessageRecord, ValidateResult } from './options.js';
import { packFormDescriptorSchema } from './wire-schemas.js';
import { safeText } from '../pdf/safe-text.js';
import { XfaRuntimeError } from './errors.js';

/**
 * What the engine needs to know about one form to run its own Validate button and read its barcodes: node names, as
 * DATA a Pack supplies (never code, and never a form name in the engine). Every SOM resolves from the root subform.
 */
export interface PackFormDescriptor {
  /** The node whose `click` handler is the form's Validate button. */
  readonly validateButton: string;
  /** The field the form sets when Validate finishes (its own record of whether the form validated). */
  readonly validatedFlag: string;
  /** What `validatedFlag` holds when the form validated (the form's own word, e.g. its "Yes"). */
  readonly validatedValue: string;
  /** The text variable in which the form keeps the SOM of the first missing or invalid field (it clears it itself before Validate returns). */
  readonly firstMissingField: string;
  /** The container whose field children are the barcode fields, in the order the form fills them. */
  readonly barcodes: string;
  /**
   * The form's own clear (erase) button, when the pack names one: a SOM from the root subform of a button field. Optional. The engine
   * only checks it (`FormRuntime.clearButton`) and hands back its canonical SOM; it never runs it specially.
   */
  readonly clearButton?: string | undefined;
}

export { packFormDescriptorSchema };

/** Parses a caller's descriptor; anything else is `INVALID_ARGUMENT`. */
export function parsePackDescriptor(input: unknown): PackFormDescriptor {
  const parsed = packFormDescriptorSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue === undefined ? '' : ` (${issue.path.join('.') || '<root>'}: ${issue.message})`;
    throw new XfaRuntimeError('INVALID_ARGUMENT', `the pack form descriptor is not valid${where}`, { cause: parsed.error });
  }
  return parsed.data;
}

/** The part of a runtime the descriptor-driven calls are built on (the public runtime implements it). */
export interface PackHost {
  event(som: string, activity: string): EventResult;
  broadcast(activity: string): EventResult;
  getValue(som: string): string | number | null;
  getProperty(som: string, member: string): string | number | boolean | null;
  children(som: string, className?: string): readonly string[];
  readonly messages: readonly MessageRecord[];
  readonly focus: readonly string[];
  /** Starts recording the first non-empty text written to the node's `value`; the returned function stops it and returns what was recorded. */
  watchFirstWrite(som: string): () => string | null;
}

const isValidated = (flag: string | number | null, pack: PackFormDescriptor): boolean => flag !== null && String(flag) === pack.validatedValue;

/** Clicks the form's Validate button and reports the outcome as data (W02-T07). */
export function runValidate(host: PackHost, pack: PackFormDescriptor): ValidateResult {
  const messagesBefore = host.messages.length;
  const focusBefore = host.focus.length;
  const stopWatching = host.watchFirstWrite(pack.firstMissingField);
  let clicked: EventResult;
  let firstMissingField: string | null;
  try {
    clicked = host.event(pack.validateButton, 'click');
  } finally {
    firstMissingField = stopWatching();
  }
  const flag = host.getValue(pack.validatedFlag);
  const presence = host.getProperty(pack.barcodes, 'presence');
  const complete = isValidated(flag, pack);
  const notes: string[] = [];
  if (complete && firstMissingField !== null) {
    // The form's own record (the flag) wins; the contradiction is kept visible rather than reported as a missing field.
    notes.push(`the form set its validated flag but also stored a first missing field (${safeText(firstMissingField)}); reported as complete`);
    firstMissingField = null;
  }
  return {
    complete,
    flag,
    firstMissingField,
    notes,
    messages: host.messages.slice(messagesBefore),
    focus: host.focus.slice(focusBefore),
    barcodesPresence: String(presence),
    scriptsRun: clicked.scriptsRun,
    calcPasses: clicked.calcPasses,
  };
}

/** Runs the form's own `preSave` handling and reads the barcode fields (W02-T07). The form decides whether it encodes anything. */
export function runEncodeBarcodes(host: PackHost, pack: PackFormDescriptor): BarcodePayloads {
  const validated = isValidated(host.getValue(pack.validatedFlag), pack);
  const saved = host.broadcast('preSave');
  const payloads = host.children(pack.barcodes, 'field').map((som): string | null => {
    const value = host.getValue(som);
    return value === null ? null : String(value);
  });
  return { validated, payloads, scriptsRun: saved.scriptsRun };
}
