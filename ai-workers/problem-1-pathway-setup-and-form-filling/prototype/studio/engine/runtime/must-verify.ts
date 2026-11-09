// C7.9 (row B142 = L-SA8; P-242, P-237; SA-1B-1 rule 9, SA-1B-260 rule 3, SA-1B-261 rule 7): which facts a form writes
// are marked "must verify before filing" in the case's release and rest on a value no one on staff has checked. Verified
// means: confirmed by staff (Confirm section, Confirm & use on its document: status VERIFIED), or entered or corrected
// by staff on the Agent view. Only a client-given value (the client's own, or the principal's for another person) that
// no one on staff checked is unverified, and raises a CRITICAL warning on Ready to file, passable with a reason; the form
// still fills from it meanwhile (P-411). Pure: the release, the case's answers and the facts the form writes.
import type { Snapshot } from "../snapshot.ts";
import type { Answer } from "./case.ts";
import type { FormFact } from "./forms.ts";

/** The answer channel staff write on (api/src/runtime.ts: the Agent view). */
export const STAFF_CHANNEL = "agent_view";
export const isVerified = (a: Pick<Answer, "status" | "channel">) => a.status === "VERIFIED" || a.channel === STAFF_CHANNEL;

/** The release's must-verify facts. */
export const mustVerifyFacts = (s: Snapshot) => new Set(((s.canonical_fields ?? []) as { id: string; must_verify?: boolean }[]).filter((f) => f.must_verify === true).map((f) => f.id));

/** How the case's answers are read: the key each answer's subject is read under (a person's id, "case" for the
 *  application, `<person>/parent_1` for a relative: knownOf's own reading), and the live rows of repeating groups. */
export type AnswerReading = { aboutOf: (subjectId: string) => string; liveRows: Set<string> | null };
/** No case reading given (a unit check): a subject is read under its own id and every row is live. */
const AS_STORED: AnswerReading = { aboutOf: (id) => id, liveRows: null };
/** The must-verify facts this form writes whose answer about that subject (the whole `about`: a person, the application,
 *  or a person's relative; review M1 on #1282) is client-given and unchecked, each with its words and a key naming the
 *  answers by id (a pass covers only the answers it was given for; a new value is a new answer; review S2: never the value
 *  itself). A repeating row is judged by every live row's answer of that fact (a duplicate beats a miss); a removed row's
 *  answers are never read (review S1, as knownOf). */
export function unverifiedOf(s: Snapshot, answers: Answer[], facts: FormFact[], r: AnswerReading = AS_STORED): { fact: string; label: string; key: string }[] {
  const flagged = mustVerifyFacts(s);
  if (!flagged.size) return [];
  const words = (fact: string) => String(((s.placements ?? []) as { fact: string; question_text?: string | null }[]).find((p) => p.fact === fact)?.question_text
    || ((s.canonical_fields ?? []) as { id: string; meaning?: string | null }[]).find((f) => f.id === fact)?.meaning || fact).trim().replace(/[.?:]$/, "");
  const out = new Map<string, { fact: string; label: string; key: string }>();
  for (const f of facts) {
    if (!flagged.has(f.fact)) continue;
    const mine = answers.filter((a) => r.aboutOf(a.subjectId) === f.about && a.field === f.fact && (!a.rowKey || !r.liveRows || r.liveRows.has(a.rowKey)));
    const open = mine.filter((a) => !isVerified(a));
    if (!open.length) continue;
    const rel = f.about.includes("/") ? f.about.split("/").slice(1).join("/").replace(/_/g, " ") : null;
    out.set(`${f.fact}|${f.about}`, { fact: f.fact, label: `${words(f.fact)}${rel ? ` (their ${rel})` : f.about === "case" ? " (the application)" : ""}`, key: `${f.fact}|${f.about}|${open.map((a) => a.id).sort().join("+")}` });
  }
  return [...out.values()];
}
