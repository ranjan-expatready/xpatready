// The activity feed across firms (C6.11 review Major 1, P-278; QA-225, the sign and scan leak on main, 4 Nov, #924):
// which lines a firm's staff read (api/src/case-feed.ts). A passing and a failing case per rule, then a sweep of every
// audit line the API writes: each entity is a case or a configuration entity, a dynamic entity is one this file knows,
// and a line whose words name "case <id>" uses a case entity. No server, no database. The same rule through the routes:
// tests/check_c81_signing_api.ts (user-S never reads another firm's sign or scan line; the firm's own staff do).
//   tsx studio/tests/check_case_feed.ts
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { CASE_ENTITIES, CONFIG_ENTITIES, casesOf, firmMayRead, isConfigEntity } from "../api/src/case-feed.ts";

let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined && !c ? ` — ${JSON.stringify(detail).slice(0, 400)}` : ""}`); };
const OURS = "3185450e", THEIRS = "9a1b2c3d", own = new Set([OURS]);
const line = (entity: string, summary: string, entityKey: string | null = null) => ({ entity, entityKey, summary });

// QA-225 on main: another firm's sign and scan lines.
for (const [entity, words] of [["sign step", `Case officer marked IMM 5476 "Signed by hand" on case ${THEIRS}`], ["signed scan", `Case officer uploaded the signed scan of IMM 5476 on case ${THEIRS} (PDF, 1200 bytes)`]]) {
  ok(`fail (QA-225): another firm's "${entity}" line is never read by this firm's staff`, !firmMayRead(line(entity, words), own));
  ok(`pass (QA-225): the firm's own "${entity}" line is read`, firmMayRead(line(entity, words.replace(THEIRS, OURS)), own));
}
// The sweep's other case entities that were missing (C6.4 documents, the checklist, eligibility checks).
for (const entity of ["case document", "checklist line", "assessment", "assessment_override"]) {
  ok(`fail (sweep): another firm's "${entity}" line is never read`, !firmMayRead(line(entity, `x on case ${THEIRS}`), own));
  ok(`pass (sweep): "${entity}" is a case entity`, CASE_ENTITIES.has(entity) && !isConfigEntity(entity));
}
// Break M1 on #948: fail closed. An entity on neither list is read by no firm's staff, whatever its words.
ok("fail (break M1): a line of an entity no list knows is not read, even when its words name no case", !firmMayRead(line("new case thing", "Case officer uploaded a passport for the principal"), own) && !firmMayRead(line("sign step ", "x"), own));
ok("fail: a line of an entity no list knows that names another firm's case is not read", !firmMayRead(line("some new thing", `x did y on case ${THEIRS}`), own));
ok("fail: a case-entity line that names no case is read by no firm's staff", !firmMayRead(line("sign step", "x marked a form"), own) && !firmMayRead(line("section", "Author renamed a section"), own));
ok("fail (break M1): \"Case 9A1B2C3D\", \"case-9a1b2c3d\" and a no-break space name the case too", [`on Case ${THEIRS.toUpperCase()}`, `case-${THEIRS}`, `case ${THEIRS}`].every((w) => !firmMayRead(line("some new thing", w), own) && casesOf(line("form", w)).join() === THEIRS));
ok("fail (break m2): a line that names another firm's case before the firm's own is not read (every case named must be the firm's)", !firmMayRead(line("checklist line", `x requested Proof for case ${THEIRS} for the principal on case ${OURS}`), own));
ok("pass: a case line keyed by the case id is the firm's own", firmMayRead(line("case", "x opened a case", `${OURS}-aaaa-bbbb`), own) && !firmMayRead(line("case", "x opened a case", `${THEIRS}-aaaa`), own));
ok("pass: a configuration line (no case named, a known entity) is read by every firm", firmMayRead(line("form", "Author changed IMM 5257"), own) && firmMayRead(line("library document type", "Approver approved \"Passport\""), own) && firmMayRead(line("release", "Approver released Visitor visa"), own));
ok("pass: \"case\" in other words (\"in case\", \"case officer\") is not a case id", casesOf(line("form", "in case the case officer asks")).length === 0);
ok("the two lists do not overlap", [...CASE_ENTITIES].every((x) => !CONFIG_ENTITIES.has(x)));

// The sweep: every audit write in api/src (any `.log(` call with an audit's six arguments, auditEvent.create and
// createMany). Its entity is a case or a configuration entity; a dynamic entity is one known below with its values; a
// line whose words name "case …" uses a case entity.
const DYNAMIC: Record<string, string[]> = {
  "L.name.toLowerCase()": ["pathway", "program", "category", "sub-category"],
  "LEVEL_WORD[c.level].toLowerCase()": ["pathway", "program", "category", "sub-category"],
  "`library ${c.kind}`": ["library field"],
  "entityOf(c.kind)": ["structure", "form", "field", "document type", "section", "combination"],
  "entityOf(kind)": ["structure", "form", "field", "document type", "section", "combination"],
  "kind": ["field", "section"],
  "kind === \"field\" ? \"field\" : \"document type\"": ["field", "document type"],
  "kind === \"form\" ? \"form\" : \"document requirement\"": ["form", "document requirement"],
  "line.kind === \"form\" ? \"form\" : \"document requirement\"": ["form", "document requirement"],
  "entity": [],   // core.ts's own audit.log writes the entity it is given
};
const API = join(import.meta.dirname, "..", "api", "src");
const files = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((x) => (x.isDirectory() ? files(join(d, x.name)) : x.name.endsWith(".ts") ? [join(d, x.name)] : []));
const found: { where: string; entity: string; names: boolean }[] = [], wrong: string[] = [];
for (const f of files(API)) {
  const src = ts.createSourceFile(f, readFileSync(f, "utf8"), ts.ScriptTarget.Latest, true);
  const visit = (n: ts.Node) => {
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)) {
      const name = n.expression.name.text, callee = n.expression.getText(src), where = `${f.slice(API.length + 1)}:${src.getLineAndCharacterOfPosition(n.getStart(src)).line + 1}`;
      let entity: ts.Expression | undefined, words: ts.Expression | undefined, isWrite = false;
      if (name === "log" && !/^console\b/.test(callee) && n.arguments.length >= 5) { isWrite = true; entity = n.arguments[3]; words = n.arguments[5]; }
      else if ((name === "create" || name === "createMany") && /auditEvent$/.test(n.expression.expression.getText(src))) {
        isWrite = true;
        const arg = n.arguments[0];
        const data = arg && ts.isObjectLiteralExpression(arg) ? arg.properties.find((p) => p.name?.getText(src) === "data") : undefined;
        const obj = data && ts.isPropertyAssignment(data) && ts.isObjectLiteralExpression(data.initializer) ? data.initializer : undefined;
        const prop = (k: string) => { const p = obj?.properties.find((x) => x.name?.getText(src) === k); return p && ts.isPropertyAssignment(p) ? p.initializer : p && ts.isShorthandPropertyAssignment(p) ? p.name : undefined; };
        entity = prop("entity"); words = prop("summary");
        if (!obj) wrong.push(`${where} (an audit write whose data the sweep cannot read: ${arg?.getText(src).slice(0, 60)})`);
      }
      if (isWrite && entity) {
        const names = !!words && /\bcase[\s-]*\$\{/i.test(words.getText(src));
        const values = ts.isStringLiteral(entity) || ts.isNoSubstitutionTemplateLiteral(entity) ? [entity.text] : DYNAMIC[entity.getText(src)];
        if (!values) wrong.push(`${where} (entity ${entity.getText(src)} is dynamic and not known to this check: list its values)`);
        else for (const v of values) {
          found.push({ where, entity: v, names });
          if (!CASE_ENTITIES.has(v) && !isConfigEntity(v)) wrong.push(`${where} "${v}" is on neither list`);
          if (names && !CASE_ENTITIES.has(v)) wrong.push(`${where} "${v}" names a case but is not a case entity`);
        }
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(src);
}
const naming = found.filter((x) => x.names);
ok(`the sweep reads the API's audit writes (${found.length} entity uses; ${naming.length} name a case, incl. filing-record.ts's new Audit(tx).log)`, naming.length >= 30 && naming.some((x) => x.entity === "sign step") && naming.some((x) => x.entity === "signed scan") && naming.some((x) => x.where.startsWith("filing-record.ts")), { naming: naming.length });
ok("every audit entity is on one list, and every line whose words name a case uses a case entity", wrong.length === 0, wrong);
console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
