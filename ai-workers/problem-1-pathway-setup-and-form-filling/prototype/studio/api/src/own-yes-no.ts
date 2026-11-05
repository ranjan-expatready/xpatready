// B52 (P-334 (5)): the forms' Yes/No form fields asked as their own questions, in the forms' own words, and how a
// box's printed question is read. No Nest decorators here: the acceptance packs (acceptance/lib/pack2.ts) import it
// with plain tsx, as the checkpoint (api/src/demo.ts FORM_SETUP) and the route (api/src/own-question.ts) do.
import { readFileSync } from "node:fs";
import { join } from "node:path";

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

/** B52 (P-334 (5)): an application form's Yes/No form fields worked out from other answers, each asked as its own question
 *  (api/src/own-question.ts), so the shared placement step asks them and C4.11's conditions land on them. B88 (P-319): the
 *  table is data, studio/samples/own-yes-no.json, with each box's words and the form's own question it quotes (Sample,
 *  Unconfirmed: expert); no combination or form number is in code. */
export type OwnYesNo = { dataPath: string; label: string; meaning: string };
type Table = { reason: string; near: string; combinations: Record<string, { application: string; boxes: OwnYesNo[] }> };
const TABLE = JSON.parse(readFileSync(join(import.meta.dirname, "..", "..", "samples", "own-yes-no.json"), "utf8")) as Table;
export const OWN_YES_NO_REASON = TABLE.reason;
/** #1036 (B83): the words for asking a form's own Yes/No question rather than the detail it leads to (sample loader). */
export const OWN_YES_NO_NEAR = TABLE.near;
/** Per combination: the application form whose Yes/No form fields are asked as their own questions. The checkpoint's
 *  table (api/src/form-setup.ts FORM_SETUP) reads its boxes from here, so the packs and the checkpoint ask the same ones. */
export const OWN_YES_NO: Record<string, { application: string; boxes: OwnYesNo[] }> = TABLE.combinations;
