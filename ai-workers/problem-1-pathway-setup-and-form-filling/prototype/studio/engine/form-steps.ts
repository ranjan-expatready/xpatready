// What the filler must not do on its own, and what a person does on the filled PDF before the form's own Validate
// passes (evidence lane E1b, 23 Oct: IMM 1344 findings F1–F3, IMM 0008 finding F4; F1 slice 2). Rules on the form's
// inventory, no AI:
//  F1 a Canada/US telephone: its number boxes stay hidden until the "Canada/US" switch is clicked, and Validate clears a
//     switch whose boxes are hidden, so a person ticks it (the values are already written);
//  F2 a signature box is never written: the person types their own name, which the form says is their signature, and
//     validates after (IMM 1344; IMM 0008 has none, so no step there);
//  F3 values are written in the form's own format (a Canadian postal code as "A1A 1A1"), so written = saved = encoded;
//  F4 a block the form shows by default with its own "Remove …" button (IMM 0008's first dependant) that receives no
//     value is removed by a person with that button before Validate;
//  F6 the oath block of a solemn declaration (IMM 5409: where it was declared, the title, name and signature of the
//     person who administers it, the date) is completed at the oath, never by the product, and the form's Validate passes
//     only after (F1 slice 2b; whether a representative may pre-fill the place and date is an expert question).
type Box = { data_path?: string | null; som?: string | null; ui?: string | null; caption?: string | null; required?: boolean | null };
export type PersonStep = { finding: "F1" | "F2" | "F4" | "F6"; kind: "tick_canada_us" | "sign" | "remove_empty_block" | "oath"; boxes: string[]; say: string };

const pathOf = (b: Box) => b.data_path ?? b.som ?? "";
const parent = (p: string) => p.replace(/\.[^.]+$/, "");
const last = (p: string) => p.split(".").pop()!.replace(/\[\d+\]$/, "");

/** F2: a box that holds a signature (a typed name the form treats as signing), never a date or a button. */
export function isSignatureBox(b: Box): boolean {
  if (b.ui === "signature") return true; // a signature field, captioned or not (SignatureField1)
  if (b.ui && b.ui !== "textEdit") return false;
  if (/\bdate\b/i.test(b.caption ?? "") || /date$/i.test(last(pathOf(b)))) return false; // "Date of signature" is a date
  return /sig(nature)?(lbl|label)?$/i.test(last(pathOf(b))) || /sign$/i.test(last(pathOf(b))) || /\bsignature\b|\bsign here\b/i.test(b.caption ?? "");
}

/** F3: the value as the form itself stores it, when the form has its own format; otherwise unchanged. */
export function inFormFormat(b: Box, value: string): string {
  if (/post(al)?\s*code|postal\s*\/\s*zip/i.test(b.caption ?? "") || /Post(al)?Code$/i.test(last(pathOf(b)))) {
    const m = /^\s*([A-Za-z]\d[A-Za-z])[\s_\-\u2010-\u2015]*(\d[A-Za-z]\d)\s*$/.exec(value.normalize("NFKC"));
    if (m) return `${m[1]} ${m[2]}`.toUpperCase();
  }
  return value;
}

const OATH_START = /\bdeclared before me\b/i;
/** F6: the boxes of each oath block: from the box captioned "Declared before me at …" to the end of its section, plus any
 *  box about the person who administers the declaration. Buttons (links) are not boxes. */
export function oathBoxes(fields: Box[]): Box[] {
  const out: Box[] = [];
  fields.forEach((f, i) => {
    if (!OATH_START.test(f.caption ?? "")) return;
    const section = parent(pathOf(f));
    for (const g of fields.slice(i)) if (parent(pathOf(g)) === section && g.ui !== "button" && !out.includes(g)) out.push(g);
  });
  for (const f of fields) if (/\badminister(ed|s)? the (solemn )?declaration\b/i.test(f.caption ?? "") && f.ui !== "button" && !out.includes(f)) out.push(f);
  return out;
}
/** Why the product never writes this box (F2 a signature, F6 the oath), or null when it may. */
export function byAPerson(fields: Box[], b: Box): string | null {
  if (isSignatureBox(b)) return "a signature: the person signs it themselves; the product never signs";
  if (isOathBox(fields, b)) return "the oath: completed when the declaration is made, by the person who administers it; the product never fills it";
  return null;
}
/** C-11 (P-171 c): at release, a field map that maps a box of the oath block says that box is completed by a person at
 *  the oath and never filled (fill.ts already never writes it, F6). `fieldsOf` reads a map's form field list (its
 *  inventory, in form order, which the oath block needs); a map with none is skipped. A warning: nothing is filled. */
export function oathMappedProblems(maps: { form_number: string; form_edition: string; channel?: string; inventory_file?: string | null; entries: { data_path: string; caption?: string | null; outcome?: string; fact?: string | null }[] }[], fieldsOf: (inventoryFile: string) => Box[] | null): { level: "warning"; where: string; item: string; message: string }[] {
  const out: { level: "warning"; where: string; item: string; message: string }[] = [];
  for (const m of maps) {
    if (m.channel === "ONLINE" || !m.inventory_file) continue;
    const fields = fieldsOf(m.inventory_file);
    if (!fields) continue;
    const oath = new Set(oathBoxes(fields).map(pathOf));
    for (const e of m.entries) if (e.outcome === "mapped" && e.fact && oath.has(e.data_path))
      out.push({ level: "warning", where: `Field map ${m.form_edition}`, item: e.data_path, message: `${m.form_number}: the form field "${e.caption || e.data_path}" is mapped to ${e.fact}, but it belongs to the oath. By a person: it is completed when the declaration is made, by the person who administers it; the product never fills it.` });
  }
  return out;
}
/** F6: true when the box belongs to the oath block of its form (see oathBoxes). */
export function isOathBox(fields: Box[], b: Box): boolean {
  return oathBoxes(fields).some((o) => pathOf(o) === pathOf(b));
}

type Group = { data_path?: string | null; occur?: { min?: string | number | null } | null };
/** The steps a person takes on this filled form, from its inventory (form fields and row groups) and the values written
 *  (box path → value). */
export function personSteps(fields: Box[], written: Record<string, string>, groups: Group[] = []): PersonStep[] {
  const steps: PersonStep[] = [];
  const paths = Object.keys(written);
  // F1: a phone block (a subform with a Canada/US switch and North American number boxes) that received a number.
  for (const sw of fields.filter((f) => last(pathOf(f)) === "CanadaUS" && f.ui === "checkButton")) {
    const block = parent(pathOf(sw));
    // Only when the writer actually filed the number as Canada/US: the switch written ticked, or the North American
    // boxes written. A country code alone is not enough ("+1" left as an international number; break M4).
    const na = paths.filter((p) => p.startsWith(`${block}.NANumber`));
    const filedNA = written[pathOf(sw)] === "1" || na.length > 0;
    // Name the question by its telephone caption ("Question 3 Telephone number"), not the first box's ("No.").
    const question = fields.find((f) => pathOf(f).startsWith(`${block}.`) && /telephone|phone|fax/i.test(f.caption ?? ""))?.caption ?? "this telephone number";
    if (filedNA) steps.push({ finding: "F1", kind: "tick_canada_us", boxes: [pathOf(sw), ...na], say: `${question}: after the form's first Validate, tick "Canada/US" again. The number is already written and the switch is written ticked, but Validate clears the switch while the number form fields are hidden; the click shows them with the number in place.` });
  }
  // F2: every required signature box: the person types their own name, then validates. A form that marks nothing
  // required (the static IMM 5409 and IMM 5476) still has signatures: each one is listed, signed by the person on the
  // printed form (review 2 of slice 2b). The oath's own signature is the F6 step's.
  const oathPaths = new Set(oathBoxes(fields).map(pathOf));
  const marksRequired = fields.some((f) => f.required);
  const sigs = fields.filter((f) => isSignatureBox(f) && (marksRequired ? f.required : true) && !oathPaths.has(pathOf(f)));
  const named = sigs.map((s) => `"${s.caption || last(pathOf(s))}"`).join(" and ");
  if (sigs.length) steps.push({ finding: "F2", kind: "sign", boxes: sigs.map(pathOf), say: marksRequired
    ? `Sign: each signer types their own name in ${named} (the form treats the typed name as the signature), then runs the form's Validate. The product never types a signature.`
    : `Sign: each signer signs ${named} themselves, by hand on the printed form. The product never signs.` });
  // F4: a block the form shows by default (not a repeating group that starts with no rows, such as IMM 0008's
  // "dependants") with its own "Remove …" button, required boxes and no value written.
  const startsEmpty = new Set(groups.filter((g) => g.data_path && g.occur && String(g.occur.min ?? "") === "0").map((g) => g.data_path!));
  for (const btn of fields.filter((f) => f.ui === "button" && /^remove\b/i.test(f.caption ?? ""))) {
    const block = parent(parent(pathOf(btn)));
    if (startsEmpty.has(block)) continue;
    const inside = fields.filter((f) => pathOf(f).startsWith(`${block}.`) && f.ui !== "button");
    if (inside.some((f) => f.required) && !paths.some((p) => p.startsWith(`${block}.`))) steps.push({ finding: "F4", kind: "remove_empty_block", boxes: [pathOf(btn)], say: `Remove the empty block ${last(block)} with the form's own "${btn.caption}" button (and confirm) before Validate: the form shows it by default, its form fields are mandatory, and nothing in this application goes there.` });
  }
  // F6: the oath block, whatever was mapped to it: the person who administers the declaration completes it at the oath.
  const oath = oathBoxes(fields);
  if (oath.length) steps.push({ finding: "F6", kind: "oath", boxes: oath.map(pathOf), say: `At the oath: the place where it is declared, the title, name and signature of the person who administers the declaration, and the date (${oath.map((o) => `"${o.caption || last(pathOf(o))}"`).join(", ")}) are completed when the declaration is made, then the form's Validate passes. The product never fills them.` });
  return steps;
}
