// C7.3 (M3-E, runtime lane; r5c §6, P-62 §6, P-72, P-65): the answer sheet of an Online form item: the answers the case
// officer types into the IRCC portal, section by section, each with its person, its source and the text to copy. Until
// the portal's own screen order is recorded (W6, parked) the sections follow the form's own parts: those the
// configuration holds for the form's edition (the C3.4 rules pass's sections, each grouping form fields of that edition
// under its printed heading or a name a person gave it; P-319: from the configuration, never a table of form numbers),
// in the order the form prints them; a form field none of them groups goes in a last "Other questions" section. A form
// whose edition has no such parts falls back to the PDF twin's (contracts/pdf-sections.json, Sample), in that file's
// order, where a form field outside them is left out. Every declared or confirmed answer fills it at once, each with its
// mark and whether it is still to confirm (P-242, P-411; B150 review M2: was confirmed only, P-72); an answer that needs
// a fix, or none, is listed as what the section waits for. "Entered in the portal" freezes a section's answers; a later change marks it out
// of date and shows the new value. Pure: no database, no clock. tests/check_vv_answer_sheet.ts.
import { createHash } from "node:crypto";
import type { BoxRow } from "../render.ts";
import { sectionGroupOf } from "../twin.ts";
import type { AnswerMark } from "../../contracts/runtime.ts";

/** `mark`, `to_confirm`, `why` (P-411): who gave the answer ("answered by the principal for <name>", "entered by staff"),
 *  and whether it still waits for the officer's Confirm section; null and false where the case view has no such answer. */
export type SheetAnswer = { label: string; fact: string; subject: string; person: string; row: number | null; value: unknown; copy_text: string; source: "Document" | "Client" | "Case officer"; mark: AnswerMark | null; to_confirm: boolean; why: string | null };
/** The mark of the current answer behind a box (the case view's), by its whole "about", fact and row. */
export type MarkOf = (about: string, fact: string, row: number | null) => { mark: AnswerMark; confirmed: boolean; why: string } | undefined;
/** `version`: the section's fingerprint now; a tick sends the one it read, so it freezes what the officer saw. */
export type SheetSection = { key: string; title: string; /** false: a part not named yet (To review, B78) */ named?: false; version: string; entered: { at: string; by: string } | null; out_of_date: boolean; answers: SheetAnswer[]; waiting: { fact: string; subject: string; person: string; label: string }[] };
export type Sheet = { order_basis: "form_parts" | "pdf_twin"; order_note: string; sections: SheetSection[] };
/** A part of a form as the configuration holds it: its key, its title and the form fields (data paths) it groups.
 *  `named: false`: a part with no printed heading still waiting on To review for a person to name it (B78). */
export type FormPart = { key: string; title: string; named: boolean; fieldKeys: string[] };
/** How a sheet is laid out: the form's own parts, or the PDF twin's section groups. */
export type Layout = { basis: "form_parts"; parts: FormPart[] } | { basis: "pdf_twin"; sections: Record<string, string> };
/** The key of the section that holds the form fields no part groups. */
export const OTHER_PART = "_other";
/** The length the C3.4 rules pass keeps of a form field's data path in a part (api/src/form-masters.ts). */
const KEY_CUT = 120;

/** The form's own parts in the order the form prints them: by the first of their form fields in the form's field list
 *  (`order`, its data paths in the form's order); a part none of whose fields is in it goes last, in the order given.
 *  Two parts that group the same first field are one part, a named one kept before one still waiting (review m5 on
 *  #1075), else the first: a part is never shown twice. */
export function partsInFormOrder(parts: FormPart[], order: string[]): FormPart[] {
  const at = new Map(order.map((k, i) => [k, i] as const));
  const first = (p: FormPart) => Math.min(...p.fieldKeys.map((k) => at.get(k) ?? Number.MAX_SAFE_INTEGER), Number.MAX_SAFE_INTEGER);
  const seen = new Set<string>();
  return parts.map((p, i) => ({ p, i, f: first(p) })).sort((a, b) => a.f - b.f || Number(b.p.named) - Number(a.p.named) || a.i - b.i).map((x) => x.p)
    .filter((p) => { const k = p.fieldKeys[0] ?? `#${p.key}`; if (seen.has(k) || seen.has(`#${p.key}`)) return false; seen.add(k); seen.add(`#${p.key}`); return true; });
}
/** Where an answer came from, by the channel that first gave it. */
export type Origin = (subject: string, fact: string) => string | null | undefined;

/** The text a person pastes into the portal: dates as YYYY-MM-DD, yes/no as Yes or No, an address on one line. */
export function copyText(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if ("number" in o && "country_code" in o) return `+${o.country_code} ${o.number}${o.extension ? ` ext. ${o.extension}` : ""}`;
    return ["apt_unit", "street_number", "street_name", "po_box", "city", "district", "province", "postal_code", "country"].map((k) => o[k]).filter((x) => x !== undefined && x !== null && x !== "").join(", ");
  }
  return String(v);
}
/** The person-facing source of an answer (its first channel): a document read, the client, or the case officer. */
export const sourceOf = (channel: string | null | undefined): SheetAnswer["source"] => (/document/.test(channel ?? "") ? "Document" : channel === "questionnaire" ? "Client" : "Case officer");
/** A section's fingerprint over what it shows: changes when any answer's value changes. */
export const sectionHash = (answers: { fact: string; subject: string; row: number | null; value: unknown }[]) =>
  createHash("sha256").update(JSON.stringify(answers.map((a) => [a.subject, a.fact, a.row, a.value]).sort((x, y) => JSON.stringify(x).localeCompare(JSON.stringify(y))))).digest("hex");

/** The sheet for one form and person, in the twin's sections (kept for its callers): see `sheetOf`. */
export function answerSheet(sections: Record<string, string>, boxes: BoxRow[], origin: Origin, labels: Map<string, string>, entered: Map<string, { at: string; by: string; hash: string }>, markOf: MarkOf = () => undefined): Sheet {
  return sheetOf({ basis: "pdf_twin", sections }, boxes, origin, labels, entered, markOf);
}

/** The sheet for one form and person, from the form's boxes for that person (formCoverage), its layout (the form's own
 *  parts, else the twin's sections) and the entered ticks (each with the fingerprint of the answers it froze). */
export function sheetOf(layout: Layout, boxes: BoxRow[], origin: Origin, labels: Map<string, string>, entered: Map<string, { at: string; by: string; hash: string }>, markOf: MarkOf = () => undefined): Sheet {
  const parts = layout.basis === "form_parts" ? layout.parts : [];
  const out: SheetSection[] = layout.basis === "form_parts"
    ? parts.map((p) => ({ key: p.key, title: p.title, ...(p.named ? {} : { named: false as const }), version: "", entered: null, out_of_date: false, answers: [], waiting: [] }))
    : Object.entries(layout.sections).map(([key, title]) => ({ key, title, version: "", entered: null, out_of_date: false, answers: [], waiting: [] }));
  const byKey = new Map(out.map((x) => [x.key, x]));
  const partOf = new Map(parts.flatMap((p) => p.fieldKeys.map((k) => [k, p.key] as const)).reverse()); // the first part wins
  let other: SheetSection | null = null;
  // Review m3 on #1075: "Other questions" never takes a part's key.
  let otherKey = OTHER_PART; while (byKey.has(otherKey)) otherKey = `${otherKey}_`;
  const sectionOf = (box: string): SheetSection | undefined => {
    if (layout.basis === "pdf_twin") return byKey.get(sectionGroupOf(box.split(".").slice(1).join(".")) ?? "");
    // Review m1 on #1075: the rules pass keeps a form field's data path to 120 characters, so a longer one is found by them.
    const k = partOf.get(box) ?? (box.length > KEY_CUT ? partOf.get(box.slice(0, KEY_CUT)) : undefined);
    if (k) return byKey.get(k);
    if (!other) { other = { key: otherKey, title: "Other questions", version: "", entered: null, out_of_date: false, answers: [], waiting: [] }; out.push(other); byKey.set(otherKey, other); }
    return other;
  };
  for (const b of boxes) {
    if (!b.fact || b.coverage === "not needed") continue; // B86 BR-5: nothing to enter, nothing to wait for
    const sec = sectionOf(b.box);
    if (!sec) continue;
    // Review N1: keyed by the whole "about" (a person, or a person's relation such as "<id>/parent_1"), so a parent's
    // answers are never folded into the applicant's.
    const subject = b.about ?? "", label = labels.get(b.fact) ?? b.meaning ?? b.caption ?? b.fact;
    if (!subject.split("/")[0]) continue; // a box about nobody on this case (for example the spouse's, with no spouse) is not asked for
    if (b.coverage === "confirmed fact") {
      if (sec.answers.some((a) => a.subject === subject && a.fact === b.fact && a.row === b.row)) continue;
      const m = markOf(subject, b.fact, b.row);
      sec.answers.push({ label, fact: b.fact, subject, person: b.about_label, row: b.row, value: b.value, copy_text: copyText(b.value), source: sourceOf(origin(subject.split("/")[0], b.fact)), mark: m?.mark ?? null, to_confirm: !!m && !m.confirmed, why: m?.why ?? null });
    } else if (!sec.waiting.some((w) => w.subject === subject && w.fact === b.fact)) sec.waiting.push({ fact: b.fact, subject, person: b.about_label, label });
  }
  // A part of the form with nothing to type for this person (a signature block, the spouse's part on a case with no
  // spouse) is not a portal step for them: it is left out, unless it was ticked (its tick stays visible).
  const shown = layout.basis === "form_parts" ? out.filter((x) => x.answers.length || x.waiting.length || entered.has(x.key)) : out;
  for (const sec of shown) {
    sec.version = sectionHash(sec.answers);
    const e = entered.get(sec.key);
    if (e) { sec.entered = { at: e.at, by: e.by }; sec.out_of_date = e.hash !== sec.version; }
  }
  return layout.basis === "form_parts"
    ? { order_basis: "form_parts", order_note: "In the order the form prints its parts, as this release's configuration names them, until the portal's own screens are recorded (W6).", sections: shown }
    : { order_basis: "pdf_twin", order_note: "In the PDF form's section order until the portal's own screens are recorded (W6).", sections: shown };
}
