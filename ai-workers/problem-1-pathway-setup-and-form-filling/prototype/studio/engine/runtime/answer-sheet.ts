// C7.3 (M3-E, runtime lane; r5c §6, P-62 §6, P-72, P-65): the answer sheet of an Online form item: the answers the case
// officer types into the IRCC portal, section by section, each with its person, its source and the text to copy. Until
// the portal's own screen order is recorded (W6, parked) the sections are the PDF twin's (contracts/pdf-sections.json),
// in that file's order; a form field outside them is left out. Every declared or confirmed answer fills it at once,
// each with its mark and whether it is still to confirm (P-242, P-411; B150 review M2: was confirmed only, P-72); an
// answer that needs a fix, or none, is listed as what the section waits for. "Entered in the portal" freezes a section's answers; a later change marks it out
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
export type SheetSection = { key: string; title: string; version: string; entered: { at: string; by: string } | null; out_of_date: boolean; answers: SheetAnswer[]; waiting: { fact: string; subject: string; person: string; label: string }[] };
export type Sheet = { order_basis: "pdf_twin"; order_note: string; sections: SheetSection[] };
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

/** The sheet for one form and person, from the form's boxes for that person (formCoverage), the twin's sections and the
 *  entered ticks (each with the fingerprint of the answers it froze). */
export function answerSheet(sections: Record<string, string>, boxes: BoxRow[], origin: Origin, labels: Map<string, string>, entered: Map<string, { at: string; by: string; hash: string }>, markOf: MarkOf = () => undefined): Sheet {
  const out: SheetSection[] = Object.entries(sections).map(([key, title]) => ({ key, title, version: "", entered: null, out_of_date: false, answers: [], waiting: [] }));
  const byKey = new Map(out.map((x) => [x.key, x]));
  for (const b of boxes) {
    if (!b.fact || b.coverage === "not needed") continue; // B86 BR-5: nothing to enter, nothing to wait for
    const sec = byKey.get(sectionGroupOf(b.box.split(".").slice(1).join(".")) ?? "");
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
  for (const sec of out) {
    sec.version = sectionHash(sec.answers);
    const e = entered.get(sec.key);
    if (e) { sec.entered = { at: e.at, by: e.by }; sec.out_of_date = e.hash !== sec.version; }
  }
  return { order_basis: "pdf_twin", order_note: "In the PDF form's section order until the portal's own screens are recorded (W6).", sections: out };
}
