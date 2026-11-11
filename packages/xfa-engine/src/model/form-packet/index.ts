import { XfaPdfError } from '../../pdf/errors.js';
import { parseXml } from '../../xml/parse.js';
import { XfaFormError, type FormDom } from '../form/index.js';
import { formChecksum } from './checksum.js';
import { DeltaReader, type Delta, type DeltaLimits } from './deltas.js';
import { buildFormPacket, emptyFormPacket, type ItemsBaseline, type PacketBudget } from './serialize.js';

/**
 * The XFA `form` packet (W02-T08 follow-up): the UI state of a run that the data does not hold - presence, access,
 * mandatory, captions, colours, item lists, text variables, unbound values - written beside the datasets on save and
 * read back as `delta` objects on load, so a form's own restore script (`getDeltas()` / `restore()`, restoreState
 * manual) brings the state back in the engine and in the desktop viewer alike.
 *
 * - `formPacketText(dom, template, datasets)`: the packet to save, its checksum computed over the template packet and the
 *   datasets packet being saved with it (`checksum.ts`).
 * - `readSavedState(dom, packets)`: the deltas of a saved packet, only when its checksum matches the template and datasets
 *   it was opened with (as the viewer does); a packet that does not verify is ignored whole. A saved packet is untrusted:
 *   only allow-listed classes and settable attributes are read (`classes.ts`), everything else is counted as skipped.
 */
export { formChecksum } from './checksum.js';
export { MAX_SAVED_DELTAS, MAX_SAVED_ELEMENTS, MAX_SAVED_SKIPPED, type Delta, type DeltaLimits } from './deltas.js';
export { captureItemsBaseline, MAX_SAVED_CHARS, type ItemsBaseline, type PacketBudget } from './serialize.js';

export type SavedStateStatus = 'none' | 'rejected' | 'restorable';

export interface SavedFormState {
  /** `none`: no form packet; `rejected`: present but unverified (no or wrong checksum, unreadable, over the ceiling); `restorable`: deltas available. */
  readonly status: SavedStateStatus;
  readonly deltas: number;
  /** Saved entries not read: unmatched nodes, refused classes or attributes, invalid values, values the data owns. */
  readonly skipped: number;
}

export interface SavedState {
  readonly summary: SavedFormState;
  readonly deltas: readonly Delta[];
}

const empty = (status: SavedStateStatus): SavedState => ({ summary: { status, deltas: 0, skipped: 0 }, deltas: [] });

export interface OpenedPackets {
  readonly template: Uint8Array;
  readonly datasets: Uint8Array;
  /** The saved form packet's text, or undefined when the PDF has none. */
  readonly form: string | undefined;
}

export function readSavedState(dom: FormDom, packets: OpenedPackets, limits?: DeltaLimits): SavedState {
  if (packets.form === undefined) return empty('none');
  let root;
  try {
    root = parseXml(packets.form).documentElement;
  } catch (error) {
    if (error instanceof XfaPdfError) return empty('rejected');
    throw error;
  }
  const checksum = root?.getAttribute('checksum') ?? '';
  if (root === null || root.localName !== 'form' || checksum.length !== 28 || checksum !== formChecksum([packets.template, packets.datasets])) {
    return empty('rejected');
  }
  const reader = new DeltaReader(limits);
  try {
    reader.readRoot(dom, root);
  } catch (error) {
    if (error instanceof XfaFormError && error.code === 'LIMIT') return empty('rejected');
    throw error;
  }
  return { summary: { status: 'restorable', deltas: reader.deltas.length, skipped: reader.skipped }, deltas: reader.deltas };
}

/**
 * The form packet to save with `datasets`, as UTF-8 text; re-parsed before it is returned, so the engine never writes one
 * it could not read. `baseline` is `captureItemsBaseline` taken right after the merge. The writer keeps to the reader's
 * ceilings (`buildFormPacket`) and leaves out any unit holding a character XML forbids (text is also cleaned on the way into
 * the form, `cleanXmlText`), so the re-parse is a last resort: should it still fail, the save is not lost with it - the
 * packet is replaced with one that carries no UI state (`emptyFormPacket`), whose checksum verifies against these
 * datasets, rather than failing the whole PDF or leaving the old packet beside datasets it no longer matches. (A save has
 * no result to record it in; the next open reports the empty packet as `restorable` with no deltas.) `budget` may only
 * tighten what the writer is held to, in tests.
 */
export function formPacketText(dom: FormDom, template: Uint8Array, datasets: Uint8Array, baseline: ItemsBaseline, budget?: PacketBudget): string {
  const checksum = formChecksum([template, datasets]);
  const text = buildFormPacket(dom, checksum, baseline, budget);
  try {
    parseXml(text);
    return text;
  } catch (error) {
    if (!(error instanceof XfaPdfError)) throw error;
  }
  const bare = emptyFormPacket(dom, checksum);
  parseXml(bare);
  return bare;
}
