import { z } from 'zod';

/**
 * FD-38 exemption (security invariant): most nodes (form nodes, data wrappers, list nodes) one form run may register.
 * Counted at every registration, so a script that loops `createNode`, `addItem` or `resolveNodes` cannot exhaust
 * memory. The two real forms register about 30,000 (template, implicit properties, choice-list items); this leaves
 * more than thirty times that, and no firm or operator has a reason to vary it.
 */
export const MAX_FORM_NODES = 1_000_000;

/**
 * FD-38 exemption (security invariant): longest value, in characters, a script may write to a field, data node or
 * text node. Equal to the sandbox bridge payload ceiling, so nothing the bridge can carry is refused here and nothing
 * larger is ever stored. The largest legitimate value is a ~500 KB lookup string; no firm or operator has a reason to vary it.
 * A data write is further bound by what the saved datasets can be re-opened with: an attribute by `MAX_XML_ATTRIBUTE_CHARS`
 * and the whole serialized datasets by `MAX_XML_CHARS` (see `DataBudget`), both of which are smaller than a sum of these.
 */
export const MAX_VALUE_CHARS = 4 * 1024 * 1024;

/**
 * FD-38 exemption (security invariant): longest attribute value, in characters, a script may write (colours, lengths,
 * enumeration words). Real values are under 20 characters.
 */
export const MAX_ATTRIBUTE_CHARS = 4096;

/**
 * FD-38 exemption (security invariant): most items in one choice list. The largest real list is a few hundred
 * entries; a hostile `addItem` loop is stopped here.
 */
export const MAX_ITEMS_PER_LIST = 100_000;

/**
 * FD-38 exemption (security invariant): most characters of XML a form's scripts may load with `loadXML` over one run. The
 * form libraries load one list of values (measured about 500,000 characters) once or, with the Clear button, a few times;
 * this leaves about eight real loads. Every loaded character stays in memory as DOM nodes (ten 0.8 MB loads were measured
 * keeping 1.5 GB), so the ceiling is the memory bound, not a convenience. No firm or operator has a reason to vary it.
 */
export const MAX_LOADED_CHARS = 4 * 1024 * 1024;

/**
 * FD-38 exemption (security invariant): most elements a form's scripts may import with `loadXML` over one run. Element
 * count, not text, is what costs memory (an element is a DOM node, a wrapper and registry slot), so it is charged on its
 * own: a hostile `<b/>` repeated 4 MiB over would otherwise be a million nodes. The real list of values holds about 9,000
 * elements, so this leaves more than twenty real loads; it equals the elements one parsed document may hold
 * (`MAX_XML_ELEMENTS`). No firm or operator has a reason to vary it.
 */
export const MAX_LOADED_ELEMENTS = 200_000;

/**
 * FD-38 exemption (security invariant): most properties, over the whole form, that scripts may store on subforms,
 * exclusion groups and fields beyond the ones the object model defines (expandos; see `members.ts`). Real forms write
 * one or two such properties; a hostile loop over `node["p" + i] = ...` is stopped here. Names are at most 128
 * characters (the bridge's member-name ceiling), so the names alone stay under 1.3 million characters. No firm or
 * operator has a reason to vary it.
 */
export const MAX_EXPANDOS = 10_000;

/**
 * FD-38 exemption (security invariant): most characters of string values, over the whole form, held in expandos at
 * one time (an overwritten value stops counting). Real forms store short words and numbers; no firm or operator has a
 * reason to vary it.
 */
export const MAX_EXPANDO_CHARS = 1024 * 1024;

/** FD-38 exemption (correctness constant): most path segments in a `bindItems` reference; the real references have eight. */
export const MAX_REF_SEGMENTS = 64;

/** FD-38 exemption (security invariant): longest `bindItems` reference or picture-bearing name echoed or parsed, in characters. */
export const MAX_REF_CHARS = 1024;

/** FD-38 exemption (security invariant): longest data element name created from a template or script name, in characters. */
export const MAX_NAME_CHARS = 256;

/**
 * FD-38 exemption (security invariant): most child elements one merge (or one `remerge`) may visit while it indexes data
 * and reads `bindItems` references, counted at every index build, rebuild and child read. It makes the merge's work a
 * fixed bound whatever shape a hostile template and data take (without it, fields times siblings reached minutes). The
 * two real forms visit about 5,000 (measured on both, merge and remerge alike); this leaves a thousand times that, and no firm or operator has a
 * reason to vary it.
 */
export const MAX_MERGE_CHILD_VISITS = 5_000_000;

export interface FormLimits {
  readonly maxNodes: number;
  readonly maxMergeVisits: number;
}

export const DEFAULT_FORM_LIMITS: FormLimits = Object.freeze({ maxNodes: MAX_FORM_NODES, maxMergeVisits: MAX_MERGE_CHILD_VISITS });

/** A caller may only tighten a ceiling. */
const optionsSchema = z
  .strictObject({
    limits: z.strictObject({ maxNodes: z.int().min(1).max(MAX_FORM_NODES).optional(), maxMergeVisits: z.int().min(1).max(MAX_MERGE_CHILD_VISITS).optional() }).optional(),
  })
  .optional();

export interface FormOptions {
  /** Tightens a ceiling for this form (tests, stricter callers); a value above the default is rejected. */
  readonly limits?: Partial<FormLimits>;
}

export function resolveLimits(options: FormOptions | undefined): FormLimits {
  // A ZodError here is a bug in the calling code, not document content, so it is not wrapped.
  const given = optionsSchema.parse(options)?.limits;
  return Object.freeze({ maxNodes: given?.maxNodes ?? DEFAULT_FORM_LIMITS.maxNodes, maxMergeVisits: given?.maxMergeVisits ?? DEFAULT_FORM_LIMITS.maxMergeVisits });
}
