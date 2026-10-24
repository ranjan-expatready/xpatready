// What the filler must not do on its own, and what a person does on the filled PDF before the form's own Validate
// passes (evidence lane E1b, 23 Oct: IMM 1344 findings F1–F3, IMM 0008 finding F4; F1 slice 2). Rules on the form's
// inventory, no AI:
//  F1 a Canada/US telephone: its number boxes stay hidden until the "Canada/US" switch is clicked, and Validate clears a
//     switch whose boxes are hidden, so a person ticks it (the values are already written);
//  F2 a signature box is never written: the person types their own name, which the form says is their signature, and
//     validates after (IMM 1344; IMM 0008 has none, so no step there);
//  F3 values are written in the form's own format (a Canadian postal code as "A1A 1A1"), so written = saved = encoded;
//  F4 a block the form shows by default with its own "Remove …" button (IMM 0008's first dependant) that receives no
//     value is removed by a person with that button before Validate.
type Box = { data_path?: string | null; som?: string | null; ui?: string | null; caption?: string | null; required?: boolean | null };
export type PersonStep = { finding: "F1" | "F2" | "F4"; kind: "tick_canada_us" | "sign" | "remove_empty_block"; boxes: string[]; say: string };

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
    if (filedNA) steps.push({ finding: "F1", kind: "tick_canada_us", boxes: [pathOf(sw), ...na], say: `${question}: after the form's first Validate, tick "Canada/US" again. The number is already written and the switch is written ticked, but Validate clears the switch while the number boxes are hidden; the click shows them with the number in place.` });
  }
  // F2: every required signature box: the person types their own name, then validates.
  const sigs = fields.filter((f) => isSignatureBox(f) && f.required);
  if (sigs.length) steps.push({ finding: "F2", kind: "sign", boxes: sigs.map(pathOf), say: `Sign: each signer types their own name in ${sigs.map((s) => `"${s.caption ?? last(pathOf(s))}"`).join(" and ")} (the form treats the typed name as the signature), then runs the form's Validate. The product never types a signature.` });
  // F4: a block the form shows by default (not a repeating group that starts with no rows, such as IMM 0008's
  // "dependants") with its own "Remove …" button, required boxes and no value written.
  const startsEmpty = new Set(groups.filter((g) => g.data_path && g.occur && String(g.occur.min ?? "") === "0").map((g) => g.data_path!));
  for (const btn of fields.filter((f) => f.ui === "button" && /^remove\b/i.test(f.caption ?? ""))) {
    const block = parent(parent(pathOf(btn)));
    if (startsEmpty.has(block)) continue;
    const inside = fields.filter((f) => pathOf(f).startsWith(`${block}.`) && f.ui !== "button");
    if (inside.some((f) => f.required) && !paths.some((p) => p.startsWith(`${block}.`))) steps.push({ finding: "F4", kind: "remove_empty_block", boxes: [pathOf(btn)], say: `Remove the empty block ${last(block)} with the form's own "${btn.caption}" button (and confirm) before Validate: the form shows it by default, its boxes are mandatory, and nothing in this application goes there.` });
  }
  return steps;
}
