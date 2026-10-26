// The extension's writer for one open portal screen (F2c; BR-6, BR-11, BR-12; challenge M6). It runs only when the
// person clicks "Fill this screen", for the inputs of the plan the server returned for this screen (which matched the
// approved version). Fill mode reads values on the page, but only of the plan's inputs and only to see whether an
// input is empty and whether the screen kept what was written; it never sends them anywhere. It never logs in, never
// touches a password or hidden input, never clicks Next, Save or Submit, and never submits the form: values are set
// through each input's own setter, followed by the input and change events a person's typing would fire.
import RULES from "../../contracts/portal-reader-rules.json";
import { readScreen, searchForm, type ReadScreen } from "./reader.ts";

export type PlanInput = { id: string; type: string; label: string; value: string | null; status: string; source?: string };
export type Outcome = { id: string; label: string; outcome: "filled" | "not_accepted" | "left_alone" | "not_filled"; reason?: string };

const NEVER = new Set(["password", "hidden", "submit", "button", "reset", "image", "file"]);
const PLACEHOLDER = new RegExp(RULES.placeholder.pattern, "i");
/** The readers' placeholder rule: a first option with no label, or "Please select…", "-- Choose --", whatever its value. */
const isPlaceholder = (o: HTMLOptionElement | undefined) => !!o && (!o.text.replace(/^[ -]+|[ -]+$/g, "") || PLACEHOLDER.test(o.text));
const setter = (el: Element, prop: "value" | "checked") => Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), prop)?.set;

const FIELD = "input, select, textarea";
const attrsOf = (e: Element) => Object.fromEntries(Array.from(e.attributes).map((x) => [x.name.toLowerCase(), x.value]));
/** A question the reader would have read: a form field, not in a search form (break M3: a search box of the same name). */
const question = (e: Element) => e.matches(FIELD) && !(e.closest("form") && searchForm(attrsOf(e.closest("form")!)));
/** The input the plan names, found as the reader found it: by the element id, else by the name; only a form field
 *  outside a search form, and only when exactly one matches (break M3, m4: a div with the id, two of the same name).
 *  A radio group is all the radios of its name. Anything else is "not on the screen": nothing is written. */
function find(doc: Document, id: string, type: string): HTMLElement[] {
  if (type === "radio") return Array.from(doc.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${CSS.escape(id)}"]`)).filter(question);
  const byId = doc.getElementById(id);
  if (byId && question(byId)) return [byId];
  const byName = Array.from(doc.querySelectorAll(`[name="${CSS.escape(id)}"]`)).filter(question);
  return byName.length === 1 ? [byName[0] as HTMLElement] : [];
}
/** Plan §7 (review m9): the element is the kind of input the approved twin recorded; another kind is never written. */
function sameKind(el: HTMLElement, type: string) {
  if (type === "select") return el instanceof HTMLSelectElement;
  if (type === "textarea") return el instanceof HTMLTextAreaElement;
  if (!(el instanceof HTMLInputElement)) return false;
  const t = (el.getAttribute("type") ?? "text").toLowerCase();
  if (type === "radio" || type === "checkbox") return t === type;
  return !["radio", "checkbox"].includes(t);
}
/** Shown on the screen: a field hidden by the page (a question that does not apply yet) is never written (break m5). */
const shown = (els: HTMLElement[]) => els.some((e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== "hidden");

/** Empty for each kind of input (M6): text is ""; a select is on its placeholder (or nothing); a radio group has
 *  nothing ticked; an unticked checkbox counts as empty. */
function isEmpty(els: HTMLElement[]): boolean {
  const el = els[0];
  if (el instanceof HTMLSelectElement) return el.selectedIndex < 0 || el.value === "" || (el.selectedIndex === 0 && isPlaceholder(el.options[0]));
  if (el instanceof HTMLInputElement && el.type === "radio") return !(els as HTMLInputElement[]).some((r) => r.checked);
  if (el instanceof HTMLInputElement && el.type === "checkbox") return !el.checked;
  return (el as HTMLInputElement | HTMLTextAreaElement).value === "";
}

function fire(el: HTMLElement) { el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); }

/** Writes one value the way the input expects it and reads it back. */
function write(els: HTMLElement[], value: string): boolean {
  const el = els[0];
  if (el instanceof HTMLInputElement && el.type === "radio") {
    const r = (els as HTMLInputElement[]).find((x) => x.value === value);
    if (!r) return false;
    setter(r, "checked")!.call(r, true); fire(r);
    return r.checked;
  }
  if (el instanceof HTMLInputElement && el.type === "checkbox") { setter(el, "checked")!.call(el, value === "true"); fire(el); return el.checked === (value === "true"); }
  setter(el, "value")!.call(el, value); fire(el);
  return (el as HTMLInputElement).value === value;
}

/** Fills the plan's inputs that are empty, one screen, one click; returns what happened to each (no values). */
export function fillScreen(doc: Document, plan: PlanInput[]): Outcome[] {
  return plan.map((p): Outcome => {
    if (p.status !== "fill" || p.value == null) return { id: p.id, label: p.label, outcome: "not_filled", reason: p.status };
    const els = find(doc, p.id, p.type);
    const el = els[0] as HTMLInputElement | undefined;
    if (!el || NEVER.has((el.getAttribute("type") ?? "").toLowerCase()) || el.disabled || (el as HTMLInputElement).readOnly || !shown(els)) return { id: p.id, label: p.label, outcome: "not_filled", reason: "not_on_screen" };
    if (!els.every((e) => sameKind(e, p.type))) return { id: p.id, label: p.label, outcome: "not_filled", reason: "not_the_same_kind_of_input" };
    if (!isEmpty(els)) return { id: p.id, label: p.label, outcome: "left_alone", reason: "already_answered" };
    // Break m5: "not ticked" on a box already not ticked writes nothing, so it is never counted as filled (or undone).
    if (el instanceof HTMLInputElement && el.type === "checkbox" && p.value !== "true") return { id: p.id, label: p.label, outcome: "left_alone", reason: "already_answered" };
    return write(els, p.value) ? { id: p.id, label: p.label, outcome: "filled" } : { id: p.id, label: p.label, outcome: "not_accepted", reason: "read_back_differs" };
  });
}

/** F3 X10: what one fill wrote, kept in the page's memory only (gone when the page changes), so "Undo this fill" clears
 *  exactly that. */
export type Written = { id: string; type: string; value: string };
/** The inputs a fill wrote, for the page's outline. */
export function filledElements(doc: Document, written: Written[]): HTMLElement[] {
  return written.flatMap((w) => { const els = find(doc, w.id, w.type); return w.type === "radio" ? (els as HTMLInputElement[]).filter((r) => r.value === w.value) : els.slice(0, 1); });
}
/** Still the value this fill wrote: a person who changed it since keeps their answer. */
function holds(els: HTMLElement[], value: string) {
  const el = els[0];
  if (el instanceof HTMLInputElement && el.type === "radio") return (els as HTMLInputElement[]).some((r) => r.checked && r.value === value);
  if (el instanceof HTMLInputElement && el.type === "checkbox") return el.checked === (value === "true");
  return (el as HTMLInputElement).value === value;
}
/** Empties one input the way a person would: through its own setter, with the events typing fires. */
function clear(els: HTMLElement[]) {
  const el = els[0];
  if (el instanceof HTMLInputElement && (el.type === "radio" || el.type === "checkbox")) { for (const r of els as HTMLInputElement[]) if (r.checked) { setter(r, "checked")!.call(r, false); fire(r); } return; }
  if (el instanceof HTMLSelectElement) { const blank = Array.from(el.options).findIndex((o) => o.value === "" || isPlaceholder(o)); el.selectedIndex = blank; fire(el); return; }
  setter(el, "value")!.call(el, ""); fire(el);
}
/** F3 X10: "Undo this fill" clears the values this fill wrote that nobody changed since; never anything else. */
export function undoFill(doc: Document, written: Written[]): { cleared: number; kept: number } {
  let cleared = 0, kept = 0;
  for (const w of written) {
    const els = find(doc, w.id, w.type);
    if (!els.length || !holds(els, w.value)) { kept++; continue; }
    clear(els); cleared++;
  }
  return { cleared, kept };
}

/** Break B2: the page is still the screen the plan was made for (read again, compared input by input): a screen the
 *  person moved to while the plan was on its way is never filled. */
export function sameScreen(doc: Document, expect: ReadScreen): boolean {
  const now = readScreen(doc);
  return now.ok && JSON.stringify(now.screens[0]) === JSON.stringify(expect);
}
