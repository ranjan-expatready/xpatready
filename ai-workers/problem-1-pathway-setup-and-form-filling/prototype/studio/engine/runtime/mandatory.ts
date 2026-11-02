// QA-165 part 2 (P-237, P-238; C7.2, C7.6): "each mandatory form field is either written from a fact or listed as
// 'needs an answer' before the file is offered". A field IRCC's form marks mandatory (the inventory's `required`) that a
// copy made now would leave empty is listed, with why, so the officer sees it before the file is generated or downloaded
// rather than in Adobe's Validate. Signatures and the oath are left out: they are the person steps already listed
// (engine/form-steps.ts byAPerson, F2/F6). Pure (P-249 lift-ready): the caller passes the form's field list, its field
// map's entries and what the value step would write (engine/form-values.ts formValues); no database, file or clock.
import { byAPerson } from "../form-steps.ts";
import type { BoxResult, Inventory } from "../form-values.ts";

/** Why a mandatory form field is still empty, in the officer's words:
 *  - "needs an answer": a question fills it, and its answer is missing, not confirmed or has a problem;
 *  - "no question asks it yet": nothing in the configuration fills it (the forms lane maps it), or it is a derived Yes/No
 *    whose No no answer can write;
 *  - "fill it in Adobe": the configuration decided it is not a fact the case keeps (IRCC's form may ask it only for some
 *    answers, such as a Taiwan passport number), so the person completes it in Adobe if the form asks for it;
 *  - "filled by hand": the value cannot be written in the form's own code, so it is typed in Adobe. */
export type OpenReason = "needs an answer" | "no question asks it yet" | "fill it in Adobe" | "filled by hand";
export type OpenField = { box: string; label: string; reason: OpenReason; why: string };
type MapEntry = { data_path: string; fact?: string | null; outcome?: string | null; caption?: string | null; evidence_quote?: string | null };
/** The form's own words for a field: the map's evidence quote (the text the field answers) before the inventory caption,
 *  which is the nearest text on the page and can belong to another question (IMM 5257's US card box carries the
 *  national ID question's caption); cut at the first sentence end or 140 characters. */
const wordsOf = (e: MapEntry | undefined, caption: string | null | undefined, path: string) => {
  // The form's own "*" (mandatory) mark is left off: every line here is mandatory.
  const t = ((e?.evidence_quote ?? "").trim() || (caption ?? "").trim() || (e?.caption ?? "").trim()).replace(/^\*\s*/, "");
  if (!t) return path.split(".").slice(-2, -1)[0]?.replace(/\[\d+\]$/, "") || "A form field";
  // The first sentence end after 25 characters ("Question 1d." alone is a number, not the question).
  const m = /[.?!](\s|$)/g; let end = -1;
  for (let r = m.exec(t); r; r = m.exec(t)) if (r.index >= 25) { end = r.index; break; }
  const one = end > 0 && end < 140 ? t.slice(0, end + 1) : t.slice(0, 140);
  return one.length < t.length && !/[.?!]$/.test(one) ? `${one.trimEnd()}…` : one;
};

export function mandatoryOpen(inv: Inventory, entries: MapEntry[], boxes: BoxResult[], values: Record<string, string>): OpenField[] {
  const entryOf = new Map(entries.map((e) => [e.data_path, e]));
  const boxOf = new Map(boxes.map((b) => [b.box, b]));
  const out: OpenField[] = [];
  for (const f of inv.fields) {
    const path = f.data_path;
    if (!f.required || !path || f.ui === "button" || byAPerson(inv.fields, f)) continue;
    if ((values[path] ?? "") !== "") continue; // written from a fact
    const e = entryOf.get(path), b = boxOf.get(path), label = wordsOf(e, f.caption, path);
    if (e?.outcome === "not_a_fact") out.push({ box: path, label, reason: "fill it in Adobe", why: "not a fact the case keeps: complete it in Adobe if the form asks for it" });
    else if (b?.result === "by hand") out.push({ box: path, label, reason: "filled by hand", why: b.why ?? "type it in Adobe" });
    // A derived "is anything recorded?" Yes/No (C7.2 cause 3): an answer can only make it Yes; its No needs a question
    // that records "none" (a confirmed "none apply" group does; other names, the national ID and the US card have none yet).
    else if (b && /^derived:.*\brecorded\b/.test(b.transform ?? "") && !b.nothing_recorded) out.push({ box: path, label, reason: "no question asks it yet", why: "the form's Yes/No: Yes is written when the answer is recorded, and no question records a No yet" });
    // A mapped fact can be answered, whichever source the release names for it (a document reading the case has not
    // got is typed by the officer: r1c's walk), so it "needs an answer"; only an unmapped field has no question.
    else if (b && e?.fact) out.push({ box: path, label, reason: "needs an answer", why: b.coverage === "answered on screen" ? "answered, not confirmed yet" : b.coverage === "unresolved" ? `not answered yet (${b.about_label})` : `not answered yet (${b.about_label}: ${b.detail})` });
    else out.push({ box: path, label, reason: "no question asks it yet", why: "nothing in this release fills it" });
  }
  return out;
}
