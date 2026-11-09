// The C6.5 part 2c correction rule (P-243, L-SA9; rows.md Q1, confirmed by Lead 36), as a plain function with no Nest
// decorators: the route (document-review-counts.ts) and the counts pack (run by tsx without the API's tsconfig, as gate
// B runs it) both import it from here.
import { OFFICER_ENTRY } from "../../engine/runtime/background.ts";
import { sameValue } from "./document-values.ts";

type Mode = "collapsed" | "expanded";
export type ModeCount = { read: number; corrected: number; rate: number | null; left: number };
export type ReviewCounts = { case_id: string; by_mode: Record<Mode, ModeCount>; corrections: { fact: string; review: Mode; document: string; how: "staff_answer" | "kept_answer"; by: string; at: string }[]; rule: string };

export const CORRECTION_RULE = "A correction is a staff answer saved after the document was read (and before a newer file replaced it) that differs from what it read, or a check resolved by keeping the answer instead of the document's value. A client's own change, an answer equal to the document, and a check a newer file closed are not corrections. A value the reader could not give in the question's terms (a country only as a code) is left for a person: it is counted apart, never as read or corrected.";
/** The reason case-documents.ts writes when a newer file closes a replaced file's check (not a person's judgement). */
export const REPLACED = /^Its file was replaced by a newer /;

/** The counts from plain rows (no database), so the rule is tested on its own. */
export function countCorrections(values: { id: string; subjectId: string; fact: string; review: string; valueJson: unknown; documentId: string; readAt: Date;
    /** Review M1 on c774e63b6: the reader gave it, but not in the question's terms (notWritable): left for a person. */
    left?: boolean;
    /** Review m1: when a newer file replaced this document (an answer typed after it is about the newer file). */
    replacedAt?: Date | null }[],
  answers: { subjectId: string; fact: string; valueJson: unknown; channel: string; actor: string; at: Date }[],
  kept: { readValueId: string; by: string; at: Date; reason?: string | null }[]): Omit<ReviewCounts, "case_id" | "rule"> {
  const by_mode: Record<Mode, ModeCount> = { collapsed: { read: 0, corrected: 0, rate: null, left: 0 }, expanded: { read: 0, corrected: 0, rate: null, left: 0 } };
  const corrections: ReviewCounts["corrections"] = [];
  for (const v of values) {
    const mode: Mode = v.review === "collapsed" ? "collapsed" : "expanded";
    if (v.left) { by_mode[mode].left++; continue; } // answering it by hand is the expected path, not a reader error
    by_mode[mode].read++;
    const until = v.replacedAt ?? null;
    const staff = answers.filter((a) => a.subjectId === v.subjectId && a.fact === v.fact && a.channel === OFFICER_ENTRY && a.at > v.readAt && (!until || a.at < until) && !sameValue(v.fact, a.valueJson, v.valueJson)).sort((a, b) => a.at.getTime() - b.at.getTime())[0];
    const keptAnswer = kept.filter((k) => k.readValueId === v.id && !REPLACED.test(k.reason ?? "")).sort((a, b) => a.at.getTime() - b.at.getTime())[0];
    const first = [staff && { how: "staff_answer" as const, by: staff.actor, at: staff.at }, keptAnswer && { how: "kept_answer" as const, by: keptAnswer.by, at: keptAnswer.at }].filter((x): x is { how: "staff_answer" | "kept_answer"; by: string; at: Date } => !!x).sort((a, b) => a.at.getTime() - b.at.getTime())[0];
    if (!first) continue;
    by_mode[mode].corrected++;
    corrections.push({ fact: v.fact, review: mode, document: v.documentId, how: first.how, by: first.by, at: first.at.toISOString() });
  }
  for (const m of Object.values(by_mode)) m.rate = m.read ? Math.round((m.corrected / m.read) * 1000) / 1000 : null;
  return { by_mode, corrections };
}

