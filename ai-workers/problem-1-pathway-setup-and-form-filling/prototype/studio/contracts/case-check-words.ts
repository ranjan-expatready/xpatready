// B148 (P-236, P-316 (1), P-408; C6.9): the words a person reads for the case check, in one place for the API, the
// engine's change summary and the web. The page is "Case check from confirmed facts" (staff only), and its three
// outcomes are the team's words: Qualifies · Can't tell yet · Does not qualify. The codes stay AG-03's
// (AssessmentProgramResult, §7: LIKELY_ELIGIBLE, POSSIBLY_ELIGIBLE, NOT_ELIGIBLE), so stored runs, overrides and answer
// keys read as before; only the words change. P-236 drops the fourth, below the cut-off (P-164): the stand-in never
// gives it. No imports, so the web, the API and the engine all read this file. Unconfirmed: no counsel on the wording.

export const CASE_CHECK = "Case check from confirmed facts";
/** The page's short name, in a sentence ("Open case check", "Run case check"). */
export const CASE_CHECK_SHORT = "case check";

export type OutcomeCode = "LIKELY_ELIGIBLE" | "ELIGIBLE_BELOW_CUTOFF" | "POSSIBLY_ELIGIBLE" | "NOT_ELIGIBLE";
export const OUTCOME_WORDS: Record<OutcomeCode, string> = {
  LIKELY_ELIGIBLE: "Qualifies",
  POSSIBLY_ELIGIBLE: "Can't tell yet",
  NOT_ELIGIBLE: "Does not qualify",
  ELIGIBLE_BELOW_CUTOFF: "Below the cut-off (not used: P-236)",
};
/** An outcome code in words; an unknown code is shown as it is, never guessed. */
export const outcomeWord = (code: string) => (Object.prototype.hasOwnProperty.call(OUTCOME_WORDS, code) ? OUTCOME_WORDS[code as OutcomeCode] : code);

