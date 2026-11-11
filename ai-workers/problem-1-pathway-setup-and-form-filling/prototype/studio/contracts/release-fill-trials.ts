// BK-11 (Bake M3.5 Track 2 row 25, P-448, P-460): a released pathway says which of its forms have a passed fill trial.
// At release, each form line's trial (api/src/fill-trials.ts trialFor: the edition in use, its field map, the evidence
// lane's verdict) is frozen into the release row's summary as `fill_trials`, one entry per form line, so set-up and qa
// read which forms are proven from the release itself. Kept out of the snapshot, so the release fingerprint and the
// draft-against-release changes stay as they were. Names no pathway and no form (P-319, P-452). Pure.

/** Why a form has no passed trial, in the release's words (api/src/fill-trials.ts TrialAnswer.reason). */
export type FillTrialReason = "no_edition" | "other_file" | "none" | "other_map" | "not_passed" | "filed_online";

/** One form line of a release and its fill trial at the moment of release. */
export type ReleaseFillTrial = {
  form: string;
  title: string | null;
  /** "passed": a recorded trial of this edition and field map passed; "not_yet": anything else. */
  status: "passed" | "not_yet";
  /** The PDF edition the release fills (P-32: the edition in use), or null when it has none. */
  edition: string | null;
  /** Passed only: the day the trial was recorded (YYYY-MM-DD) and its evidence record (path from the repository root). */
  recorded_on: string | null;
  evidence: string | null;
  /** Not yet only: why, as a code and in words. */
  reason: FillTrialReason | null;
  why: string | null;
};

export const FILL_TRIAL_WORDS = {
  passed: "Passed",
  not_yet: "Not yet",
  /** A line filed Online fills no PDF: no fill trial applies to it (review m3). */
  filed_online: "Filed online",
  /** Review m2: the list is as at release; a case's lock reads the trial register as it is now. */
  as_at_release: "As at release. A trial recorded later counts for cases at once and shows here from the next release.",
  evidence: "evidence record",
  /** A release made before BK-11 carries no fill-trial status: never shown as "Not yet", which would claim a fact. */
  not_recorded: "Not recorded in this release: it was released before fill-trial status was carried",
  heading: "Fill trials",
  reason: {
    no_edition: (edition: string | null) => `No PDF edition${edition ? ` (${edition})` : ""} with a known file in this release, so no fill trial can count.`,
    other_file: (edition: string | null) => `The file of edition ${edition ?? "in use"} is not the file the fill trial ran on.`,
    none: (edition: string | null) => `No fill trial is recorded for edition ${edition ?? "in use"}.`,
    other_map: (edition: string | null) => `The fill trial of edition ${edition ?? "in use"} ran on an earlier version of its field map.`,
    not_passed: (edition: string | null) => `The fill trial of edition ${edition ?? "in use"} did not pass from the product's file.`,
    filed_online: (_edition: string | null) => "Filed online: IRCC's portal takes the answers, so no PDF is filled and no fill trial applies.",
  } satisfies Record<FillTrialReason, (edition: string | null) => string>,
} as const;

/** "k of n forms have a passed fill trial", or the not-recorded words for a release made before BK-11. */
export function fillTrialCount(trials: readonly ReleaseFillTrial[] | null | undefined): string {
  if (!Array.isArray(trials)) return FILL_TRIAL_WORDS.not_recorded;
  const passed = trials.filter((t) => t.status === "passed").length;
  return `At release: ${passed} of ${trials.length} form${trials.length === 1 ? "" : "s"} with a passed fill trial`;
}
