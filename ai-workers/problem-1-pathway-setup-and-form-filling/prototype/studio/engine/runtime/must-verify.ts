// C7.9 (row B142 = L-SA8; P-242, P-237; SA-1B-1 rule 9, SA-1B-260 rule 3, SA-1B-261 rule 7): which facts a form writes
// are marked "must verify before filing" in the case's release and rest on a value no one on staff has checked. Verified
// means: confirmed by staff (Confirm section, Confirm & use on its document: status VERIFIED), or entered or corrected
// by staff on the Agent view. Only a client-given value (the client's own, or the principal's for another person) that
// no one on staff checked is unverified, and raises a CRITICAL warning on Ready to file, passable with a reason; the form
// still fills from it meanwhile (P-411). Pure: the release, the case's answers and the facts the form writes.
import { createHash } from "node:crypto";
import type { Snapshot } from "../snapshot.ts";
import type { Answer } from "./case.ts";
import type { FormFact } from "./forms.ts";

/** The answer channel staff write on (api/src/runtime.ts: the Agent view). */
export const STAFF_CHANNEL = "agent_view";
export const isVerified = (a: Pick<Answer, "status" | "channel">) => a.status === "VERIFIED" || a.channel === STAFF_CHANNEL;

/** The release's must-verify facts. */
export const mustVerifyFacts = (s: Snapshot) => new Set(((s.canonical_fields ?? []) as { id: string; must_verify?: boolean }[]).filter((f) => f.must_verify === true).map((f) => f.id));

/** The must-verify facts this form writes whose answer about that person is client-given and unchecked, each with its
 *  words and a key naming the value (a pass covers only the value it was given for). A repeating row is judged by every
 *  answer of that fact for the person (a duplicate beats a miss). */
export function unverifiedOf(s: Snapshot, answers: Answer[], facts: FormFact[]): { fact: string; label: string; key: string }[] {
  const flagged = mustVerifyFacts(s);
  if (!flagged.size) return [];
  const words = (fact: string) => String(((s.placements ?? []) as { fact: string; question_text?: string | null }[]).find((p) => p.fact === fact)?.question_text
    || ((s.canonical_fields ?? []) as { id: string; meaning?: string | null }[]).find((f) => f.id === fact)?.meaning || fact).trim().replace(/[.?:]$/, "");
  const out = new Map<string, { fact: string; label: string; key: string }>();
  for (const f of facts) {
    if (!flagged.has(f.fact)) continue;
    const subject = f.about.split("/")[0];
    const mine = answers.filter((a) => a.subjectId === subject && a.field === f.fact);
    if (!mine.length || mine.every(isVerified)) continue;
    const value = createHash("sha256").update(JSON.stringify(mine.filter((a) => !isVerified(a)).map((a) => [a.rowKey, a.value]))).digest("hex").slice(0, 12);
    out.set(`${f.fact}|${subject}`, { fact: f.fact, label: words(f.fact), key: `${f.fact}|${subject}|${value}` });
  }
  return [...out.values()];
}
