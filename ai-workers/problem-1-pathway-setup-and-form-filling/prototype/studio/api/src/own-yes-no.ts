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

/** B116: a box's own Yes and No codes, from the choices the form prints for it ("*No" = N, "*Yes" = Y on IMM 5257). Null
 *  unless the form prints exactly two choices, one Yes and one No: only then is it a Yes/No form field. */
export function yesNoCodes(b: Box | undefined): { yes: string; no: string } | null {
  const opts = (b?.options ?? []).filter((o) => Array.isArray(o) && o.length === 2 && o[1] !== "");
  const word = (l: string) => l.replace(/[^A-Za-z]/g, "").toLowerCase();
  const yes = opts.find((o) => word(o[0]) === "yes"), no = opts.find((o) => word(o[0]) === "no");
  return opts.length === 2 && yes && no ? { yes: yes[1], no: no[1] } : null;
}

/** B116 (P-170, AGENTS rule 4; review M2): whether `words` are a question the form prints, found as they are in its saved
 *  text (the official file's XFA template, prototype/expected/source-text/<file>.xfa-template.txt, its header line left
 *  out). Only a question is taken: 20 characters or more, ending in "?", starting with a capital, and with none of a
 *  script's marks (; = { } ( ) or a dotted name), so a piece of the form's code or two captions run together never passes.
 *  Spacing and the two apostrophes are read alike; nothing else is. False when the form's text is not saved. */
export function inFormText(officialFile: string | null | undefined, words: string): boolean {
  const stem = /([^/]+)\.pdf$/i.exec(officialFile ?? "")?.[1];
  if (!stem || !/^[\w-]+$/.test(stem)) return false;
  let text: string;
  try { text = readFileSync(join(import.meta.dirname, "..", "..", "..", "expected", "source-text", `${stem}.xfa-template.txt`), "utf8"); } catch { return false; }
  const norm = (t: string) => t.replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, " ").trim();
  const w = norm(words);
  if (w.length < 20 || !/^[A-Z][^?]*\?$/.test(w) || /[;={}()]|\b\w+\.\w+\b/.test(w)) return false;
  const body = norm(text.split("\n").slice(1).join(" ")); // the first line is the file's own header, not the form's words
  return body.includes(w);
}

/** B52 (P-334 (5)): an application form's Yes/No form fields worked out from other answers, each asked as its own question
 *  (api/src/own-question.ts), so the shared placement step asks them and C4.11's conditions land on them. B88 (P-319): the
 *  table is data, studio/samples/own-yes-no.json, with each box's words and the form's own question it quotes (Sample,
 *  Unconfirmed: expert); no combination or form number is in code. */
/** B116: `question`, for a form field nothing fills yet whose reading prints another box's words, is the form's own question
 *  quoted from its saved text (inFormText checks it). */
export type OwnYesNo = { dataPath: string; label: string; meaning: string; question?: string };
type Table = { reason: string; near: string; combinations: Record<string, { application: string; boxes: OwnYesNo[] }> };
const TABLE = JSON.parse(readFileSync(join(import.meta.dirname, "..", "..", "samples", "own-yes-no.json"), "utf8")) as Table;
export const OWN_YES_NO_REASON = TABLE.reason;
/** #1036 (B83): the words for asking a form's own Yes/No question rather than the detail it leads to (sample loader). */
export const OWN_YES_NO_NEAR = TABLE.near;
/** Per combination: the application form whose Yes/No form fields are asked as their own questions. The checkpoint's
 *  table (api/src/form-setup.ts FORM_SETUP) reads its boxes from here, so the packs and the checkpoint ask the same ones. */
export const OWN_YES_NO: Record<string, { application: string; boxes: OwnYesNo[] }> = TABLE.combinations;
