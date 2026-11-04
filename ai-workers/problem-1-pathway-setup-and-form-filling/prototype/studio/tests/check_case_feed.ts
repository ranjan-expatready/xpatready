// The activity feed across firms (C6.11 review Major 1, P-278; the sign and scan leak on main, 4 Nov, #924): which lines
// a firm's staff read (api/src/case-feed.ts). A passing and a failing case per rule, then a sweep of every audit line the
// API writes: one whose words name "case <id>" must use a case entity, so the list and the words agree. No server, no
// database. The same rule through the routes: tests/check_c81_signing_api.ts (user-S never reads another firm's sign or
// scan line).
//   tsx studio/tests/check_case_feed.ts
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { CASE_ENTITIES, caseOf, firmMayRead } from "../api/src/case-feed.ts";

let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined && !c ? ` — ${JSON.stringify(detail).slice(0, 400)}` : ""}`); };
const OURS = "3185450e", THEIRS = "9a1b2c3d", own = new Set([OURS]);
const line = (entity: string, summary: string, entityKey: string | null = null) => ({ entity, entityKey, summary });

// The leak on main (#924): another firm's sign and scan lines.
for (const [entity, words] of [["sign step", `Case officer marked IMM 5476 "Signed by hand" on case ${THEIRS}`], ["signed scan", `Case officer uploaded the signed scan of IMM 5476 on case ${THEIRS} (PDF, 1200 bytes)`]]) {
  ok(`fail (#924): another firm's "${entity}" line is never read by this firm's staff`, !firmMayRead(line(entity, words), own));
  ok(`pass: the firm's own "${entity}" line is read`, firmMayRead(line(entity, words.replace(THEIRS, OURS)), own));
}
// The sweep's other case entities that were missing (C6.4 documents, the checklist, eligibility checks).
for (const entity of ["case document", "checklist line", "assessment", "assessment_override"]) {
  ok(`fail (sweep): another firm's "${entity}" line is never read`, !firmMayRead(line(entity, `x on case ${THEIRS}`), own));
  ok(`pass (sweep): "${entity}" is a case entity`, CASE_ENTITIES.has(entity));
}
ok("fail: a line of an entity no list knows that names another firm's case is not read (a new case entity never leaks)", !firmMayRead(line("some new thing", `x did y on case ${THEIRS}`), own));
ok("fail: a case-entity line that names no case is read by no firm's staff", !firmMayRead(line("sign step", "x marked a form"), own) && caseOf(line("sign step", "x")) === "");
ok("pass: a case line keyed by the case id is the firm's own", firmMayRead(line("case", "x opened a case", `${OURS}-aaaa-bbbb`), own) && !firmMayRead(line("case", "x opened a case", `${THEIRS}-aaaa`), own));
ok("pass: a configuration line (no case named) is read by every firm", firmMayRead(line("form", "Author changed IMM 5257"), own) && caseOf(line("release", "Approver released Visitor visa")) === null);
ok("pass: \"case\" in other words (\"in case\", \"case officer\") is not a case id", caseOf(line("form", "in case the case officer asks")) === null);

// The sweep: every audit line written in api/src whose words name "case ${…}" uses a case entity (a literal one).
const API = join(import.meta.dirname, "..", "api", "src");
const files = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((x) => (x.isDirectory() ? files(join(d, x.name)) : x.name.endsWith(".ts") ? [join(d, x.name)] : []));
const found: { file: string; entity: string }[] = [], wrong: string[] = [];
for (const f of files(API)) {
  const src = ts.createSourceFile(f, readFileSync(f, "utf8"), ts.ScriptTarget.Latest, true);
  const visit = (n: ts.Node) => {
    if (ts.isCallExpression(n)) {
      const callee = n.expression.getText(src);
      let entity: ts.Expression | undefined, words: ts.Expression | undefined;
      if (/\baudit\.log$/.test(callee)) { entity = n.arguments[3]; words = n.arguments[5]; }
      else if (/\bauditEvent\.create$/.test(callee)) {
        const data = (n.arguments[0] && ts.isObjectLiteralExpression(n.arguments[0]) ? n.arguments[0].properties.find((p) => p.name?.getText(src) === "data") : undefined) as ts.PropertyAssignment | undefined;
        const obj = data && ts.isObjectLiteralExpression(data.initializer) ? data.initializer : undefined;
        const prop = (k: string) => (obj?.properties.find((p) => p.name?.getText(src) === k) as ts.PropertyAssignment | undefined)?.initializer;
        entity = prop("entity"); words = prop("summary");
      }
      if (entity && words && /\bcase \$\{/.test(words.getText(src))) {
        const where = `${f.slice(API.length + 1)}:${src.getLineAndCharacterOfPosition(n.getStart(src)).line + 1}`;
        if (!ts.isStringLiteral(entity)) wrong.push(`${where} (entity ${entity.getText(src)} is not a literal)`);
        else { found.push({ file: where, entity: entity.text }); if (!CASE_ENTITIES.has(entity.text)) wrong.push(`${where} "${entity.text}"`); }
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(src);
}
ok(`the sweep reads the API's case audit lines (${found.length} lines, ${new Set(found.map((x) => x.entity)).size} entities)`, found.length >= 20 && found.some((x) => x.entity === "sign step") && found.some((x) => x.entity === "signed scan"), found.length);
ok("every audit line whose words name a case uses a case entity from case-feed.ts", wrong.length === 0, wrong);
console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
