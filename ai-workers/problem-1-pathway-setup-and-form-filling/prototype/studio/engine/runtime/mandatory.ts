// QA-165 part 2 (P-237, P-238; C7.2, C7.6): "each mandatory form field is either written from a fact or listed as
// 'needs an answer' before the file is offered". A field IRCC's form marks mandatory (the inventory's `required`) that a
// copy made now would leave empty is listed, with why, so the officer sees it before the file is generated or downloaded
// rather than in Adobe's Validate. Signatures and the oath are left out: they are the person steps already listed
// (engine/form-steps.ts byAPerson, F2/F6). Pure (P-249 lift-ready): the caller passes the form's field list, its field
// map's entries and what the value step would write (engine/form-values.ts formValues); no database, file or clock.
import { byAPerson } from "../form-steps.ts";
import { recordedDerivation } from "../../../p5/transforms.ts";
import type { BoxResult, Inventory } from "../form-values.ts";

/** Why a mandatory form field is still empty, in the officer's words:
 *  - "needs an answer": a question fills it, and its answer is missing, not confirmed or has a problem;
 *  - "no question asks it yet": nothing in the configuration fills it (the forms lane maps it), or it is a derived Yes/No
 *    whose No no answer can write;
 *  - "fill it in Adobe": the configuration decided it is not a fact the case keeps (IRCC's form may ask it only for some
 *    answers, such as a Taiwan passport number), so the person completes it in Adobe if the form asks for it;
 *  - "filled by hand": the value cannot be written in the form's own code, so it is typed in Adobe. */
export type OpenReason = "needs an answer" | "no question asks it yet" | "fill it in Adobe" | "filled by hand" | "not on this form";
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
  // Review M-1 on #592: nor at a question's own number ("Education Section Question 1." is not the question).
  for (let r = m.exec(t); r; r = m.exec(t)) if (r.index >= 25 && !/\b(Question|Section)\s*\d+[A-Za-z]?$/i.test(t.slice(0, r.index))) { end = r.index; break; }
  const one = end > 0 && end < 140 ? t.slice(0, end + 1) : t.slice(0, 140);
  return one.length < t.length && !/[.?!]$/.test(one) ? `${one.trimEnd()}…` : one;
};

/** render's "unresolved" details that no answer on this case can fill (engine/render.ts coverage). */
const UNASKABLE = /no question placement|not in the library|not part of this combination/;

/** What the case knows about its own questions (review M-1, M-2 on #592): the question's label for a fact (the officer's
 *  words, where the map's quote can be another question's), and the facts of a repeating group whose "none apply" is
 *  confirmed for a person (`${about}|${fact}` → the group's title). */
export type CaseWords = { labelOf?: (fact: string) => string | undefined; noneApply?: Map<string, string>;
  /** QA-165: the Yes/No question a fact is asked under (engine/runtime/forms.ts gateOf), in the case's words. */
  gateOf?: (fact: string) => string | undefined };

export function mandatoryOpen(inv: Inventory, entries: MapEntry[], boxes: BoxResult[], values: Record<string, string>, words: CaseWords = {}): OpenField[] {
  const entryOf = new Map(entries.map((e) => [e.data_path, e]));
  const boxOf = new Map(boxes.map((b) => [b.box, b]));
  const out: OpenField[] = [];
  for (const f of inv.fields) {
    const path = f.data_path;
    if (!f.required || !path || f.ui === "button" || byAPerson(inv.fields, f)) continue;
    if ((values[path] ?? "") !== "") continue; // written from a fact
    const e = entryOf.get(path), b = boxOf.get(path);
    if (b?.coverage === "not needed") continue; // B86 BR-5: its own condition is not true, so the form leaves it empty
    // Review M-1 on #592: a line a question fills is named by that question, as the case asks it; only a field no
    // question fills keeps the form's own words.
    const asked = e?.fact ? words.labelOf?.(e.fact) : undefined;
    const label = asked && !/^derived:/.test(b?.transform ?? "") ? asked : wordsOf(e, f.caption, path);
    // Review R2-m1 on #592: only the group's row fields; a question asked once outside its rows still needs its answer.
    const settled = b?.about && e?.fact && b.row !== null && b.row !== undefined ? words.noneApply?.get(`${b.about.split("/")[0]}|${e.fact}`) : undefined;
    if (e?.outcome === "not_a_fact") out.push({ box: path, label, reason: "fill it in Adobe", why: "not a fact the case keeps: complete it in Adobe if the form asks for it" });
    else if (b?.result === "by hand") out.push({ box: path, label, reason: "filled by hand", why: b.why ?? "type it in Adobe" });
    else if (b?.result === "not on this form") out.push({ box: path, label, reason: "not on this form", why: b.why ?? "the form has no such choice" });
    // A derived "is anything recorded?" Yes/No (C7.2 cause 3): an answer can only make it Yes; its No needs a question
    // that records "none" (a confirmed "none apply" group does; other names, the national ID and the US card have none yet).
    // Devin on #715: a box held back by a fix (a confirmed answer with a problem, or a gate answered No with a detail
    // recorded) needs that fix, in its words, before anything else.
    else if (b && (b as { fix?: string }).fix && e?.fact) out.push({ box: path, label, reason: "needs an answer", why: (b as { fix?: string }).fix! });
    // QA-165: when its facts are asked under their own Yes/No question, that question's answer writes it: a "No",
    // confirmed, writes "N"; so the box needs that answer.
    // B52: a box asked as its own question (its fact is that Yes/No question, not one of the facts its step names) needs
    // the same answer; a box still reading a detail keeps "no question asks it yet" (review M1).
    else if (b && /^derived:.*\brecorded\b/.test(b.transform ?? "") && !b.nothing_recorded && !(b as { fix?: string }).fix && e?.fact && (words.gateOf?.(e.fact) ?? (b.coverage === "client question" && !recordedDerivation(b.transform)?.facts.includes(e.fact) ? asked : undefined))) out.push({ box: path, label, reason: "needs an answer", why: `answer "${words.gateOf?.(e.fact) ?? asked}" and confirm it: No writes No, Yes needs the details` });
    else if (b && /^derived:.*\brecorded\b/.test(b.transform ?? "") && !b.nothing_recorded) out.push({ box: path, label, reason: "no question asks it yet", why: "the form's Yes/No: Yes is written when the answer is recorded, and no question records a No yet" });
    // Review M-2 on #592: a row field of a group whose "none apply" is confirmed has no answer to give: IRCC's form still
    // requires it, so the person completes it in Adobe, or the officer takes back "none apply" and adds the entry.
    else if (settled) out.push({ box: path, label, reason: "fill it in Adobe", why: `"none apply" is confirmed for ${settled}, but IRCC's form requires this field: complete it in Adobe, or take back "none apply" and add the entry` });
    // Break M-2 on #592: a confirmed answer with a problem (QA-122) says that problem, as the copy does.
    // A mapped fact can be answered, whichever source the release names for it (a document reading the case has not
    // got is typed by the officer: r1c's walk), so it "needs an answer"; only an unmapped field has no question.
    // Devin on #592: a mapped fact that no question asks (no placement), that is not in the library, or about a person
    // not on the case cannot be answered: "no question asks it yet", with render's own words.
    else if (b && b.coverage === "unresolved" && UNASKABLE.test(b.detail ?? "")) out.push({ box: path, label, reason: "no question asks it yet", why: b.detail });
    else if (b && e?.fact) out.push({ box: path, label, reason: "needs an answer", why: (b as { fix?: string }).fix ? (b as { fix?: string }).fix! : b.coverage === "answered on screen" ? "answered, not confirmed yet" : b.coverage === "unresolved" ? `not answered yet (${b.about_label})` : `not answered yet (${b.about_label}: ${b.detail})` });
    else out.push({ box: path, label, reason: "no question asks it yet", why: "nothing in this release fills it" });
  }
  return out;
}
