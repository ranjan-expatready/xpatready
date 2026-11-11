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
import { NOTHING_RECORDED, type BoxRow } from "../render.ts";
import { sectionGroupOf } from "../twin.ts";
import type { AnswerMark, QuestionnaireView, Readiness } from "../../contracts/runtime.ts";

/** `mark`, `to_confirm`, `why` (P-411): who gave the answer ("answered by the principal for <name>", "entered by staff"),
 *  and whether it still waits for the officer's Confirm section; null and false where the case view has no such answer. */
export type SheetAnswer = { label: string; fact: string; subject: string; person: string; row: number | null; value: unknown; copy_text: string; source: "Document" | "Client" | "Case officer"; mark: AnswerMark | null; to_confirm: boolean; why: string | null };
/** The mark of the current answer behind a box (the case view's), by its whole "about", fact and row. */
export type MarkOf = (about: string, fact: string, row: number | null) => { mark: AnswerMark; confirmed: boolean; why: string } | undefined;
/** `version`: the section's fingerprint now; a tick sends the one it read, so it freezes what the officer saw. */
export type SheetSection = { key: string; title: string; /** false: a part not named yet (To review, B78) */ named?: false; version: string; entered: { at: string; by: string } | null; out_of_date: boolean; answers: SheetAnswer[]; waiting: { fact: string; subject: string; person: string; label: string }[];
  /** C7.3 (P-401): on an out-of-date section, each answer that differs from what its tick froze (null: none then, or none now). */
  changes?: SheetChange[];
  /** C7.3 (P-401): on a section not ticked now, its last untick: who, when and the reason they gave. */
  unticked?: { at: string; by: string; reason: string } | null };
/** One answer of a ticked section that changed since the tick: its label, its person, the text then and now. */
export type SheetChange = { label: string; person: string; was: string | null; now: string | null };
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
export const sourceOf = (channel: string | null | undefined): SheetAnswer["source"] => (/document/.test(channel ?? "") ? "Document" : channel === "questionnaire" || channel === "own_link" ? "Client" : "Case officer");
/** A section's fingerprint over what it shows: changes when any answer's value changes. */
export const sectionHash = (answers: { fact: string; subject: string; row: number | null; value: unknown }[]) =>
  createHash("sha256").update(JSON.stringify(answers.map((a) => [a.subject, a.fact, a.row, a.value]).sort((x, y) => JSON.stringify(x).localeCompare(JSON.stringify(y))))).digest("hex");

/** The sheet for one form and person, in the twin's sections (kept for its callers): see `sheetOf`. */
export function answerSheet(sections: Record<string, string>, boxes: BoxRow[], origin: Origin, labels: Map<string, string>, entered: Map<string, { at: string; by: string; hash: string }>, markOf: MarkOf = () => undefined): Sheet {
  return sheetOf({ basis: "pdf_twin", sections }, boxes, origin, labels, entered, markOf);
}

/** QA-309: whether a box with no answer to show still waits, by its whole "about" and fact: the form's readiness names it
 *  (a required question not answered or confirmed, a "none apply" not answered, a fix, a fired check). */
export type Waits = (about: string, fact: string) => boolean;
/** QA-317 (review M1): a choice's words in the release (its option's label, as the portal lists it), or undefined. */
export type ChoiceWords = (fact: string, value: unknown) => string | undefined;

/** The sheet for one form and person, from the form's boxes for that person (formCoverage), its layout (the form's own
 *  parts, else the twin's sections) and the entered ticks (each with the fingerprint of the answers it froze). With
 *  `waits` (QA-309), a box with no answer to show waits only when readiness still names its fact: a fact held as "none
 *  apply", a row fact answered on its rows (the form's spare rows stay empty) or one the release never asks does not;
 *  its section stays on the sheet to tick all the same. Without it, every such box waits. With `wordsOf` (QA-317), a
 *  choice is copied as its option's label (the portal lists labels), its value and the fingerprint staying the key. */
export function sheetOf(layout: Layout, boxes: BoxRow[], origin: Origin, labels: Map<string, string>, entered: Map<string, { at: string; by: string; hash: string }>, markOf: MarkOf = () => undefined, waits?: Waits, wordsOf?: ChoiceWords): Sheet {
  const parts = layout.basis === "form_parts" ? layout.parts : [];
  const out: SheetSection[] = layout.basis === "form_parts"
    ? parts.map((p) => ({ key: p.key, title: p.title, ...(p.named ? {} : { named: false as const }), version: "", entered: null, out_of_date: false, answers: [], waiting: [] }))
    : Object.entries(layout.sections).map(([key, title]) => ({ key, title, version: "", entered: null, out_of_date: false, answers: [], waiting: [] }));
  const byKey = new Map(out.map((x) => [x.key, x]));
  const partOf = new Map(parts.flatMap((p) => p.fieldKeys.map((k) => [k, p.key] as const)).reverse()); // the first part wins
  let other: SheetSection | null = null;
  const asked = new Set<string>(); // QA-309: the sections with a box for this person, whether it waits or not
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
    asked.add(sec.key);
    // QA-392: a Yes/No box the PDF copy writes as No because nothing is recorded (engine/runtime/forms.ts
    // markNothingRecorded, the one rule the copy and this sheet both read) is typed as that No, in the form's own question.
    if (b.coverage === "confirmed fact" || b.nothing_recorded) {
      if (sec.answers.some((a) => a.subject === subject && a.fact === b.fact && a.row === b.row)) continue;
      const m = markOf(subject, b.fact, b.row), value = b.nothing_recorded ? NOTHING_RECORDED : b.value;
      sec.answers.push({ label: b.nothing_recorded ? b.caption || label : label, fact: b.fact, subject, person: b.about_label, row: b.row, value, copy_text: wordsOf?.(b.fact, value) ?? copyText(value), source: sourceOf(origin(subject.split("/")[0], b.fact)), mark: m?.mark ?? null, to_confirm: !!m && !m.confirmed, why: m?.why ?? null });
    } else if ((!waits || waits(subject, b.fact)) && !sec.waiting.some((w) => w.subject === subject && w.fact === b.fact)) sec.waiting.push({ fact: b.fact, subject, person: b.about_label, label });
  }
  // A part of the form with nothing to type for this person (a signature block, the spouse's part on a case with no
  // spouse) is not a portal step for them: it is left out, unless it was ticked (its tick stays visible).
  const shown = layout.basis === "form_parts" ? out.filter((x) => asked.has(x.key) || entered.has(x.key)) : out;
  for (const sec of shown) {
    sec.version = sectionHash(sec.answers);
    const e = entered.get(sec.key);
    if (e) { sec.entered = { at: e.at, by: e.by }; sec.out_of_date = e.hash !== sec.version; }
  }
  return layout.basis === "form_parts"
    ? { order_basis: "form_parts", order_note: "In the order the form prints its parts, as this release's configuration names them, until the portal's own screens are recorded (W6).", sections: shown }
    : { order_basis: "pdf_twin", order_note: "In the PDF form's section order until the portal's own screens are recorded (W6).", sections: shown };
}

/** QA-309 (C7.3, P-401): the facts an Online form's sheet still waits on, by subject: each fact the form's readiness names
 *  (a required answer missing or not confirmed, one that needs a fix, the fact a fired section check reads) and, for a
 *  repeating group whose "none apply" is not answered or confirmed, every fact of that group. A fact held as "none apply",
 *  a row fact answered on its rows, or a fact the release never asks is never among them. A group or check line is matched
 *  to its person by id (review m2: never by the name shown, which two people can share). */
export function waitsOf(view: Pick<QuestionnaireView, "sections" | "checks">, missing: Readiness["missing"], subjectId: string, caseSubject?: string | null): Waits {
  const keys = new Set<string>();
  for (const m of missing) {
    if (m.fact.startsWith("group:")) {
      for (const sec of view.sections.filter((x) => x.section === m.fact.slice(6) && (m.subject ? x.subjectId === m.subject : x.about_label === m.about))) for (const q of sec.questions) keys.add(`${q.subjectId}|${q.fact}`);
    } else if (m.fact.startsWith("check:")) {
      const c = view.checks.find((x) => x.id === m.fact.slice(6) && (m.subject ? x.subjectId === m.subject : x.about_label === m.about));
      if (c?.fact) keys.add(`${c.subjectId}|${c.fact}`);
    } else keys.add(`${m.subject ?? subjectId}|${m.fact}`);
  }
  // A box about the application is "case" on the form; readiness names it by the case's own subject.
  return (about, fact) => keys.has(`${about === "case" && caseSubject ? caseSubject : about}|${fact}`);
}

/** QA-309: an Online form item's reason while it is not Done: the facts its readiness still names (the first three by
 *  label and person), else the sections not yet ticked "Entered in the portal". Never "Every fact it reads is confirmed"
 *  over a sheet that is not finished. */
export function sheetWords(sheet: Sheet, missing: Readiness["missing"]): string {
  if (missing.length) {
    const named = missing.slice(0, 3).map((m) => `${m.label} (${m.about})`), more = missing.length - named.length;
    return `Waiting for ${missing.length} fact${missing.length === 1 ? "" : "s"} to answer or confirm: ${named.join("; ")}${more ? `; and ${more} more` : ""}.`;
  }
  const left = sheet.sections.filter((x) => !x.entered || x.out_of_date), n = sheet.sections.length;
  if (!n) return "Its answer sheet has no section to enter yet.";
  return `Every answer is ready to enter in the portal; ${left.length} of ${n} section${n === 1 ? "" : "s"} still to tick "Entered in the portal": ${left.map((x) => x.title).join(", ")}.`;
}

/** C7.3 (P-401): what changed in a ticked section since its tick froze its answers: each answer, by person, fact and row,
 *  whose copy text differs, was added or is gone, in the order the section shows them now, then the gone ones. */
export function changesOf(frozen: Pick<SheetAnswer, "label" | "person" | "subject" | "fact" | "row" | "copy_text">[], now: Pick<SheetAnswer, "label" | "person" | "subject" | "fact" | "row" | "copy_text">[]): SheetChange[] {
  const k = (a: { subject: string; fact: string; row: number | null }) => `${a.subject}|${a.fact}|${a.row ?? ""}`;
  const then = new Map(frozen.map((a) => [k(a), a] as const)), seen = new Set<string>(), out: SheetChange[] = [];
  for (const a of now) {
    seen.add(k(a));
    const b = then.get(k(a));
    if (!b || b.copy_text !== a.copy_text) out.push({ label: a.label, person: a.person, was: b?.copy_text ?? null, now: a.copy_text });
  }
  for (const b of frozen) if (!seen.has(k(b))) out.push({ label: b.label, person: b.person, was: b.copy_text, now: null });
  return out;
}
