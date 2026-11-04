// C10.1 row 9 (Lead 10's ruling (c') on #1009): what the configured checkpoint says when Submit refuses Visitor visa's
// release 2, built from the refusal itself (never fixed text): how many problems, of which kind, in plain words for a
// person (no form field codes), and where the draft stands. Pure: no database, no Nest (a check reads it directly).

/** The draft's release-2 changes the loader made before Submit (they stay on the draft, not submitted). */
export const RELEASE_TWO_CHANGES = "IMM 5257 filed Online, IMM 5645 as the family information form in place of IMM 5707, IMM 5476 a PDF upload signed by hand and scanned";

/** "Fix 13 problems before submitting: a · b · c" → the problems, one each (the refusal's own split). */
export function refusalProblems(refusal: string): string[] {
  const body = refusal.replace(/^[^:]*?problems? before submitting:\s*/i, "");
  return body === refusal && !/ · /.test(refusal) ? [refusal] : body.split(" · ").map((x) => x.trim()).filter(Boolean);
}

/** Row 9's reason when Submit refuses release 2. */
export function releaseTwoWords(refusal: string): string {
  const all = refusalProblems(refusal);
  const noCode = all.filter((p) => /no code for/.test(p)).length, noMap = all.filter((p) => /no option map yet/.test(p)).length;
  const other = all.length - noCode - noMap;
  const form = /IMM_?(\d{4})/.exec(all.find((p) => /no code for|no option map yet/.test(p)) ?? "")?.[1];
  const parts = [
    noCode ? `${noCode} form field${noCode === 1 ? " has" : "s have"} no code for some values of the answer list ${noCode === 1 ? "it reads" : "they read"} (filling would refuse them)` : null,
    noMap ? `${noMap} ${noMap === 1 ? "has" : "have"} no option map yet` : null,
    other ? `${other} other problem${other === 1 ? "" : "s"}` : null,
  ].filter(Boolean);
  const where = `Visitor visa's draft keeps the release-2 changes (${RELEASE_TWO_CHANGES}), not submitted; its Review and release tab lists each problem.`;
  const waits = noCode ? " Waits for row B81: a person marks a list value a form box does not print, so filling refuses it in words." : "";
  return `Release 2 was not made: Submit refused it with ${all.length} problem${all.length === 1 ? "" : "s"}${form ? ` on IMM ${form}'s choice boxes` : ""}: ${parts.join("; ")}. ${where}${waits}`;
}
