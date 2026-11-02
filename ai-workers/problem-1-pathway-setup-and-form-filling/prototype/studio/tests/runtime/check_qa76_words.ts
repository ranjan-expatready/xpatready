// QA-76 (runtime lane, X9): the case's Forms tab and the copy routes speak plain words. Their chips, notes and refusals
// never carry a decision code ("(P-65)", "C-9", "QA-76") or a team word ("the evidence lane's fill trial"). The files are
// read with the TypeScript scanner, so only what can be shown is checked: string literals, template text and JSX text,
// never comments or import paths. A pass and a fail per rule; no server, no model call (US$0).
//   tsx studio/tests/runtime/check_qa76_words.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { recorder } from "./api.ts";

const { ok, summary } = recorder();
const ROOT = join(import.meta.dirname, "..", "..");
/** Every piece of text in a source file that can reach a person (review of #225 M2: a parser, not comment regexes). */
const shownText = (name: string, code: string) => {
  const src = ts.createSourceFile(name, code, ts.ScriptTarget.Latest, true, name.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS), out: string[] = [];
  const walk = (n: ts.Node) => {
    if (ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) return;
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n) || ts.isJsxText(n)) out.push(n.text);
    n.forEachChild(walk);
  };
  walk(src);
  return out;
};
const CODE = /\b(?:P|C|D|QA)-\d+\b/, TEAM = /evidence lane|fill trial/i;
for (const rel of ["web/src/runtime/forms.tsx", "api/src/fill-case.ts"]) {
  const texts = shownText(rel, readFileSync(join(ROOT, rel), "utf8"));
  ok(`QA-76 pass: ${rel} shows no decision code to the officer`, texts.length > 20 && !texts.some((t) => CODE.test(t)), texts.filter((t) => CODE.test(t)));
  ok(`QA-76 pass: ${rel} shows no team word ("evidence lane", "fill trial")`, !texts.some((t) => TEAM.test(t)), texts.filter((t) => TEAM.test(t)));
}
// QA-76 slice b: the case page's notes and headings carry no plan stage ("forms slice 2") either.
const PLAN = /\b(?:forms|runtime|screens) slice\b|\bslice \d/i;
for (const rel of ["engine/runtime/case.ts", "web/src/runtime/questionnaire.tsx"]) {
  const texts = shownText(rel, readFileSync(join(ROOT, rel), "utf8"));
  ok(`QA-76 pass: ${rel} shows no plan stage ("forms slice 2") and no decision code`, texts.length > 20 && !texts.some((t) => PLAN.test(t) || CODE.test(t)), texts.filter((t) => PLAN.test(t) || CODE.test(t)));
}
ok("QA-76 fail: the old note's words are caught", PLAN.test("No answer list yet (forms slice 2): the officer checks this answer"));
const forms = shownText("forms.tsx", readFileSync(join(ROOT, "web/src/runtime/forms.tsx"), "utf8"));
ok("QA-76 pass: the checked-copy chip says why in plain words", forms.includes("This form's filling is not proven yet, so the copy is for checking only"));
// The scan must catch what QA-76 saw, and the forms the review of #225 found, while leaving comments and imports alone.
const sample = `import x from "./P-65";\n// (P-65) a comment\nconst a = <Pill title="The evidence lane's fill trial for this form has not passed (P-65)">x</Pill>;\nconst b = "a // b (P-144, P-171 (1))", c = \`P-145 · Sample \${a}\`, d = "Break C-9";\n<p>See QA-76</p>;`;
const caught = shownText("sample.tsx", sample);
ok("QA-76 fail: the old chip words, a code after // in a string, a list of codes, P-145 · Sample, C-9 and JSX text are all caught", ["(P-65)", "P-171", "P-145 ·", "C-9", "QA-76"].every((w) => caught.some((t) => t.includes(w) && CODE.test(t))) && caught.some((t) => TEAM.test(t)), caught);
ok("QA-76 fail-guard: comments and import paths are not read as shown text", !caught.some((t) => t.includes("a comment") || t === "./P-65"), caught);
process.exitCode = summary() ? 1 : 0;
