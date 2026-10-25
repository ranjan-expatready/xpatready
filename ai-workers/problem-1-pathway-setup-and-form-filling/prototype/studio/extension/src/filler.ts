// The extension's writer for one open portal screen (F2c; BR-6, BR-11, BR-12; challenge M6). It runs only when the
// person clicks "Fill this screen", for the inputs of the plan the server returned for this screen (which matched the
// approved version). Fill mode reads values on the page, but only of the plan's inputs and only to see whether an
// input is empty and whether the screen kept what was written; it never sends them anywhere. It never logs in, never
// touches a password or hidden input, never clicks Next, Save or Submit, and never submits the form: values are set
// through each input's own setter, followed by the input and change events a person's typing would fire.
export type PlanInput = { id: string; type: string; label: string; value: string | null; status: string; source?: string };
export type Outcome = { id: string; label: string; outcome: "filled" | "not_accepted" | "left_alone" | "not_filled"; reason?: string };

const NEVER = new Set(["password", "hidden", "submit", "button", "reset", "image", "file"]);
const setter = (el: Element, prop: "value" | "checked") => Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), prop)?.set;

/** The input the plan names by the page's own element id or name (a radio group by its name). */
function find(doc: Document, id: string, type: string): HTMLElement[] {
  if (type === "radio") return Array.from(doc.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${CSS.escape(id)}"]`));
  const el = doc.getElementById(id) ?? doc.querySelector(`[name="${CSS.escape(id)}"]`);
  return el ? [el as HTMLElement] : [];
}

/** Empty for each kind of input (M6): text is ""; a select is on its placeholder (or nothing); a radio group has
 *  nothing ticked; an unticked checkbox counts as empty. */
function isEmpty(els: HTMLElement[]): boolean {
  const el = els[0];
  if (el instanceof HTMLSelectElement) return el.selectedIndex < 0 || el.value === "" || (el.selectedIndex === 0 && !el.options[0]?.value);
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
    if (!el || NEVER.has((el.getAttribute("type") ?? "").toLowerCase()) || el.disabled || (el as HTMLInputElement).readOnly) return { id: p.id, label: p.label, outcome: "not_filled", reason: "not_on_screen" };
    if (!isEmpty(els)) return { id: p.id, label: p.label, outcome: "left_alone", reason: "already_answered" };
    return write(els, p.value) ? { id: p.id, label: p.label, outcome: "filled" } : { id: p.id, label: p.label, outcome: "not_accepted", reason: "read_back_differs" };
  });
}
