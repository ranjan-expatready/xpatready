// B52 (P-334 (5)): the forms' Yes/No form fields asked as their own questions, in the forms' own words, and how a
// box's printed question is read. No Nest decorators here: the acceptance packs (acceptance/lib/pack2.ts) import it
// with plain tsx, as the checkpoint (api/src/demo.ts FORM_SETUP) and the route (api/src/own-question.ts) do.

export type Box = { data_path?: string; heading?: string | null; caption?: string | null; options?: [string, string][] };
/** The form's printed question for a Yes/No box (P-170: never words that are not its question): the reading's heading
 *  when it is a question (the caption of IMM 5257's US card box repeats the national identity question, so the heading
 *  comes first), else the caption's question without its number ("Question 8 A. During the past 5 years …?"; the
 *  heading there is a neighbour's, "* Date of birth"). Null when neither is a question: the box is then refused. */
export function printedQuestion(b: Box | undefined): string | null {
  const tidy = (t: string | null | undefined) => (t ?? "").replace(/\s+/g, " ").trim();
  const asks = (t: string) => /\?$/.test(t);
  const heading = tidy(b?.heading), caption = tidy(b?.caption).replace(/^(?:.*?\bSection\s+)?Question\s+\d+\s*[A-Za-z]?\.?\s+/i, "");
  return asks(heading) ? heading : asks(caption) ? caption : null;
}

/** B52 (P-334 (5)): IMM 5257's three Yes/No form fields worked out from other answers, each asked as its own question
 *  (api/src/own-question.ts), so the shared placement step asks them and C4.11's conditions land on them. The words are
 *  the form's: IMM 5257 (09-2023) p. 1 Question 2 A "Have you ever used any other name such as a nickname, maiden name
 *  or alias?"; p. 2 "Do you have a national identity document?"; p. 2 "Are you a lawful Permanent Resident of the United
 *  States with a valid alien registration card (green card)?". The library field of the same name is used when there is
 *  one (IMM 0008's and IMM 1294's field maps name them so). Sample, Unconfirmed: expert. */
export type OwnYesNo = { dataPath: string; label: string; meaning: string };
export const IMM5257_YES_NO: OwnYesNo[] = [
  { dataPath: "form1[0].Page1[0].PersonalDetails[0].AliasName[0].AliasNameIndicator[0].AliasNameIndicator[0]", label: "Has used other name", meaning: "Whether the person has ever used any other name, such as a nickname, maiden name or alias (IMM 5257 p. 1, Question 2 A)." },
  { dataPath: "form1[0].Page2[0].natID[0].q1[0].natIDIndicator[0]", label: "Has national ID", meaning: "Whether the person has a national identity document (IMM 5257 p. 2, National identity document, Question 1)." },
  { dataPath: "form1[0].Page2[0].USCard[0].q1[0].usCardIndicator[0]", label: "US permanent resident", meaning: "Whether the person is a lawful permanent resident of the United States with a valid alien registration card (green card) (IMM 5257 p. 2, US PR card, Question 1)." },
];
export const OWN_YES_NO_REASON = "The form asks this Yes/No itself before its details: asked as its own question in the form's words (sample loader, B52; Sample)";
/** Per combination: the application form whose Yes/No form fields are asked as their own questions. The checkpoint's
 *  table (api/src/demo.ts FORM_SETUP) reads its boxes from here, so the packs and the checkpoint ask the same ones. */
export const OWN_YES_NO: Record<string, { application: string; boxes: OwnYesNo[] }> = {
  "vv.single": { application: "IMM 5257", boxes: IMM5257_YES_NO },
};
