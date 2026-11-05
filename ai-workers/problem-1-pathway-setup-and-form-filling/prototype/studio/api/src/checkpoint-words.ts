// C10.1 row 9 (Lead 10's ruling (c') on #1009): what the configured checkpoint says when Visitor visa's release 2 is not
// made, built from the refusal itself (never fixed text): the step that refused it; for Submit, every problem it listed
// (its `errors`, not its text, which names only the first three), counted by kind, in plain words for a person (no form
// field codes), and where the draft stands. Pure: no database, no Nest (a check reads it directly).

/** The draft's release-2 changes the loader made before Submit (they stay on the draft, not submitted). */
export const RELEASE_TWO_CHANGES = "IMM 5257 filed Online, IMM 5645 as the family information form in place of IMM 5707, IMM 5476 a PDF upload signed by hand and scanned";

/** The loader's steps for release 2, in order, and their words. */
export const RELEASE_TWO_STEPS = { forms: "setting release 2's channels and forms on the Forms tab", submit: "Submit", signoff: "the SME's sign-off", approve: "the approval by a different person" } as const;
export type ReleaseTwoStep = keyof typeof RELEASE_TWO_STEPS;

/** One problem as Submit lists it (studio.ts refuse(): `errors[]`, each with its item and its words). */
export type Listed = { item?: string | null; message: string };
/** A refusal as the loader catches it: its text, and every problem it listed when it lists them. */
export type Refusal = { detail: string; errors?: Listed[] };

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Row 9's reason when release 2 is not made. */
export function releaseTwoWords(step: ReleaseTwoStep, refusal: Refusal): string {
  if (step !== "submit" || !refusal.errors?.length) {
    const where = step === "forms" ? " Visitor visa's draft may keep part of the release-2 changes; its Forms tab shows them." : step === "submit" ? "" : " Release 2 was submitted and waits on To review.";
    return `Release 2 was not made: ${RELEASE_TWO_STEPS[step]} refused it: ${refusal.detail}${where}`;
  }
  const all = refusal.errors;
  const noCode = all.filter((p) => /no code for/.test(p.message)), noMap = all.filter((p) => /no option map yet/.test(p.message));
  const other = all.filter((p) => !noCode.includes(p) && !noMap.includes(p));
  const forms = [...new Set([...noCode, ...noMap].map((p) => { const m = /(IMM|IRM)[_ ]?(\d{4})/.exec(`${p.item ?? ""} ${p.message}`); return m ? `${m[1]} ${m[2]}` : null; }).filter(Boolean))];
  const parts = [
    noCode.length ? `${plural(noCode.length, "form field has", "form fields have")} no code for some values of the answer list ${noCode.length === 1 ? "it reads" : "they read"} (filling would refuse them)` : null,
    noMap.length ? `${noMap.length} ${noMap.length === 1 ? "has" : "have"} no option map yet` : null,
    // Review R2 m2: any other problem keeps its own words (at most three, then how many more).
    other.length ? `${plural(other.length, "other problem", "other problems")}: ${other.slice(0, 3).map((p) => p.message).join(" · ")}${other.length > 3 ? ` · and ${other.length - 3} more` : ""}` : null,
  ].filter(Boolean);
  const on = forms.length && !other.length ? ` on ${forms.join(" and ")}'s choice form fields` : "";
  const where = `Visitor visa's draft keeps the release-2 changes (${RELEASE_TWO_CHANGES}), not submitted; its Review and release tab lists each problem.`;
  const waits = noCode.length ? " A person sets it on the form's panel on the Forms tab (Choices this form prints): an answer the form does not print is marked there, so filling refuses it in words." : "";
  return `Release 2 was not made: Submit refused it with ${plural(all.length, "problem", "problems")}${on}: ${parts.join("; ")}. ${where}${waits}`;
}
