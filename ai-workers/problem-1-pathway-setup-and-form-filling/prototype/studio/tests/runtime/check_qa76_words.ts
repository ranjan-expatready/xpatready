// QA-76 (runtime lane, X9): the case's Forms tab and the copy routes speak plain words. Their chips, notes and refusals
// never carry a decision code ("(P-65)") or a team word ("the evidence lane's fill trial"): comments are stripped, then
// every string literal and JSX text that is left is read. A pass and a fail per rule; no server, no model call (US$0).
//   tsx studio/tests/runtime/check_qa76_words.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { recorder } from "./api.ts";

const { ok, summary } = recorder();
const ROOT = join(import.meta.dirname, "..", "..");
const shown = (rel: string) => readFileSync(join(ROOT, rel), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1") // comments are for the team
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
const CODE = /\(P-\d+\)|\bP-\d+\)/g, TEAM = /evidence lane|fill trial/gi;
for (const rel of ["web/src/runtime/forms.tsx", "api/src/fill-case.ts"]) {
  const s = shown(rel);
  ok(`QA-76 pass: ${rel} shows no decision code to the officer`, !s.match(CODE), s.match(CODE));
  ok(`QA-76 pass: ${rel} shows no team word ("evidence lane", "fill trial")`, !s.match(TEAM), s.match(TEAM));
}
const forms = shown("web/src/runtime/forms.tsx");
ok("QA-76 pass: the checked-copy chip says why in plain words", /This form's filling is not proven yet, so the copy is for checking only/.test(forms));
// The scan itself must catch what QA-76 saw (a guard against a check that passes on anything).
const old = `title="The evidence lane's fill trial for this form has not passed (P-65)"`;
ok("QA-76 fail: the old chip words would be caught", !!old.match(CODE) && !!old.match(TEAM));
process.exitCode = summary() ? 1 : 0;
