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
  const w = norm(words);
  if (w.length < 20 || !/^[A-Z][^?]*\?$/.test(w) || /[;={}()]|\b\w+\.\w+\b/.test(w)) return false;
  return savedTextHas(officialFile, w);
}
const norm = (t: string) => t.replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, " ").trim();
/** Whether the form's saved text (prototype/expected/source-text/<file>.xfa-template.txt, its header line left out) holds
 *  `w` as it is; false when the form's text is not saved. */
function savedTextHas(officialFile: string | null | undefined, w: string): boolean {
  const stem = /([^/]+)\.pdf$/i.exec(officialFile ?? "")?.[1];
  if (!stem || !/^[\w-]+$/.test(stem)) return false;
  let text: string;
  try { text = readFileSync(join(import.meta.dirname, "..", "..", "..", "expected", "source-text", `${stem}.xfa-template.txt`), "utf8"); } catch { return false; }
  const body = norm(text.split("\n").slice(1).join(" ")); // the first line is the file's own header, not the form's words
  return body.includes(norm(w));
}
/** BK-25 (P-170, AGENTS rule 4): a Yes/No box the form prints as a statement the person answers YES or NO, not as a
 *  question (IMM 5707's "I was physically present at the marriage ceremony", YES 1 / NO 2): its reading's own heading, taken
 *  only when it is a whole sentence of the form's words (20 characters or more and under the reading's 120-character cut,
 *  a capital first, no "?", none of a script's marks) and the form's saved text shows it whole: the words, then at once the
 *  box's own first printed choice (review M2 on #1747: a heading the reading cut, such as background question 5's "…or
 *  organization which has", runs on into more words in the saved text, so it is refused). Null otherwise. */
export function printedStatement(b: Box | undefined, officialFile: string | null | undefined): string | null {
  const h = norm(b?.heading ?? ""), first = (b?.options ?? []).find((o) => Array.isArray(o) && o[0])?.[0];
  if (h.length < 20 || h.length >= 120 || !first || !/^[A-Z][^?]*[A-Za-z.]$/.test(h) || /^Question\b|[;={}()*]|\b\w+\.\w+\b/.test(h)) return null;
  return savedTextHas(officialFile, `${h} ${norm(first)} `) ? h : null;
}

/** BK-25: the people the mapped form fields of a box's row name: the nearest block above the box that holds any mapped form
 *  field (IMM 5707's "…Spouse[0].PaddedEntry[0]"), each person once. Pure. */
export function rowPeople(rows: { dataPath: string; outcome: string; person: string | null; status?: string }[], dataPath: string): string[] {
  const parts = dataPath.split(".");
  for (let n = parts.length - 1; n > 1; n--) {
    const block = `${parts.slice(0, n).join(".")}.`;
    const mapped = rows.filter((r) => r.dataPath !== dataPath && r.dataPath.startsWith(block) && r.outcome === "mapped" && r.status !== "RETIRED" && r.person);
    if (mapped.length) return [...new Set(mapped.map((r) => r.person!))];
  }
  return [];
}
/** BK-25 (review M3 on #1747): whether asking a box nothing fills yet about `person` (none: the form's subject) goes against
 *  what its row's mapped form fields name (rowPeople): a named person must be the row's one person; no name is refused only
 *  where the row names one other person (IMM 5707's spouse row), since a page of mixed rows does not say. Pure. */
export function rowPersonRefused(named: string[], person?: string): boolean {
  return person ? named.length !== 1 || named[0] !== person : named.length === 1 && named[0] !== "form_subject";
}
/** B52 (P-334 (5)): an application form's Yes/No form fields worked out from other answers, each asked as its own question
 *  (api/src/own-question.ts), so the shared placement step asks them and C4.11's conditions land on them. B88 (P-319): the
 *  table is data, studio/samples/own-yes-no.json, with each box's words and the form's own question it quotes (Sample,
 *  Unconfirmed: expert); no combination or form number is in code. */
/** B116: `question`, for a form field nothing fills yet whose reading prints another box's words, is the form's own question
 *  quoted from its saved text (inFormText checks it). */
/** B116 (tech lead's ruling on #1123, option (a)): `checkpointOnly`, asked by the configured checkpoint's loader but not on
 *  the six by the packs' people's steps (acceptance/lib/pack2.ts), so the six's question list, and the saved AI pairs that
 *  read it, stay as they are. Data, never code (P-319). */
/** QA-165: `followUps`, the questions the form asks only after a Yes to this box (the configured checkpoint's step 230 gives
 *  each the condition "show only when <this question> is Yes"; followUpGround says why each is the form's own). */
/** QA-165's last two (IMM 5257's Taiwan PIN and National Israeli passport): `askedWhen`, the answer that makes the form
 *  ask this question at all (its own script requires the form field only then); step 230 gives it the condition "show only
 *  when <fact> is <equals>" when askedWhenGround finds that rule in the form's own script. */
export type AskedWhen = { fact: string; equals: string };
/** `form`: another form the combination files (QA-318: IMM 5257 SCH1), when the box is not on its application form.
 *  `field`: the library Yes/No field it asks, when another form already asks the same question of the person (review M1 on
 *  #1272: one answer fills both forms); else the field of the same label, else a new one. */
/** BK-25: `person`, for a box in a row about another person of the case (IMM 5707's spouse row), that person's role on the
 *  form, as the row's other form fields name it (the door checks it). */
export type OwnYesNo = { form?: string; field?: string; person?: string; dataPath: string; label: string; meaning: string; question?: string; checkpointOnly?: boolean; followUps?: string[]; askedWhen?: AskedWhen };

/** QA-165 (AGENTS rule 4, P-170: nothing guessed): why the form asks the Yes/No form field `dataPath` only when `when.fact`
 *  is `when.equals`, or null when its own script does not say so. The script's rule (samples/form-script-requirements.json)
 *  requires the form field only when another form field holds one of its codes; that form field must be the one the map
 *  fills from `when.fact`, and one of those codes must be the form's own choice for `when.equals` (its country list prints
 *  "TWN (Taiwan)" for 203). */
export function askedWhenGround(dataPath: string, when: AskedWhen, rules: { box: string; requiredWhen: { box: string; equals: string[] } }[], entries: { data_path: string; fact?: string | null }[], choices: [string, string][] | null | undefined): string | null {
  const rule = rules.find((r) => r.box === dataPath);
  if (!rule) return null;
  const reads = entries.find((e) => e.data_path === rule.requiredWhen.box);
  if (!reads || reads.fact !== when.fact) return null;
  const code = rule.requiredWhen.equals.find((c) => (choices ?? []).some(([label, v]) => v === c && label.trim().split(/\s+/)[0] === when.equals));
  if (!code) return null;
  const label = (choices ?? []).find(([, v]) => v === code)![0];
  return `its own script requires it only when ${rule.requiredWhen.box} holds ${code}, the form's choice "${label}", which the map fills from ${when.fact}`;
}
type ScriptRules = { editions: { inventory: string; fields: { box: string; requiredWhen: { box: string; equals: string[] } }[] }[] };
const SCRIPT_RULES = (JSON.parse(readFileSync(join(import.meta.dirname, "..", "..", "samples", "form-script-requirements.json"), "utf8")) as ScriptRules).editions;
/** QA-165 (#1318 M1): the form fields an edition's own script requires only for some answers (samples/form-script-requirements.json). */
export const scriptRulesOf = (inventoryFile: string | null | undefined) => SCRIPT_RULES.find((e) => (inventoryFile ?? "").split("/").pop() === e.inventory)?.fields ?? [];
/** QA-165's last two (P-170): a script rule in the form's own words for its map ("when it is filled"): the form field it
 *  reads, by its last name in the form (which the door shows as that form field's question), and each code with the choice
 *  the form prints for it. Null without a rule. */
export function scriptWords(rule: { requiredWhen: { box: string; equals: string[] } } | undefined, reading: Map<string, unknown>): string | null {
  if (!rule) return null;
  const choices = (reading.get(rule.requiredWhen.box) as { options_resolved?: [string, string][] } | undefined)?.options_resolved ?? [];
  const codes = rule.requiredWhen.equals.map((c) => { const l = choices.find(([, v]) => v === c)?.[0]; return l ? `${c} ("${l}")` : c; });
  return `Only when ${rule.requiredWhen.box.split(".").pop()} holds ${codes.join(" or ")}: the form's own script requires it only then.`;
}
/** The question condition "show only when <fact> is <equals>", as Questionnaires › the question's condition saves it. */
export const equalsGate = (when: AskedWhen) => ({ subjectKind: "PERSON", op: "eq", field: when.fact, value: when.equals });

/** QA-165 (AGENTS rule 4: nothing guessed): why `fact` follows the Yes/No box `gate` on the form, or null when the form does
 *  not say so. Either the box's own "worked out" step names it ("derived:any(person.other_family_name, …) recorded"), or the
 *  fact's form field sits inside the box's own block (the box's path without its last two parts: IMM 5257's
 *  "…natID[0].q1[0].natIDIndicator[0]" → "…natID[0]", which holds natIDdocs[0]'s country, number and dates). */
export function followUpGround(gate: { data_path: string; transform?: string | null }, entries: { data_path: string; fact?: string | null }[], fact: string): string | null {
  const step = /^derived:(.*?)->/.exec(gate.transform ?? "")?.[1] ?? "";
  if (step.split(/[^\w.]+/).includes(fact)) return `the Yes/No form field's own step names it ("${gate.transform}")`;
  const block = gate.data_path.split(".").slice(0, -2).join(".");
  const inside = entries.find((e) => e.fact === fact && block && e.data_path.startsWith(`${block}.`) && e.data_path !== gate.data_path);
  return inside ? `its form field ${inside.data_path} is inside the Yes/No form field's block ${block}` : null;
}
/** QA-165: the question condition "show only when <gate> is Yes", as Questionnaires › the question's condition saves it. */
export const yesGate = (gate: string) => ({ subjectKind: "PERSON", op: "eq", field: gate, value: true });
type Table = { reason: string; near: string; combinations: Record<string, { application: string; boxes: OwnYesNo[] }> };
const TABLE = JSON.parse(readFileSync(join(import.meta.dirname, "..", "..", "samples", "own-yes-no.json"), "utf8")) as Table;
export const OWN_YES_NO_REASON = TABLE.reason;
/** #1036 (B83): the words for asking a form's own Yes/No question rather than the detail it leads to (sample loader). */
export const OWN_YES_NO_NEAR = TABLE.near;
/** Per combination: the application form whose Yes/No form fields are asked as their own questions. The checkpoint's
 *  table (api/src/form-setup.ts FORM_SETUP) reads its boxes from here, so the packs and the checkpoint ask the same ones. */
export const OWN_YES_NO: Record<string, { application: string; boxes: OwnYesNo[] }> = TABLE.combinations;
