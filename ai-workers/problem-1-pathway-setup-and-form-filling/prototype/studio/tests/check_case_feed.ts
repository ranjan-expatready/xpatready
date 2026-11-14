// The activity feed across firms (C6.11 review Major 1, P-278; QA-225, the sign and scan leak on main, 4 Nov, #924):
// which lines a firm's staff read (api/src/case-feed.ts). A passing and a failing case per rule, then a sweep of every
// audit line the API writes: each entity is a case or a configuration entity, a dynamic entity is one this file knows,
// and a line whose words name "case <id>" uses a case entity. No server, no database. The same rule through the routes:
// tests/check_c81_signing_api.ts (user-S never reads another firm's sign or scan line; the firm's own staff do).
//   tsx studio/tests/check_case_feed.ts
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { CASE_ENTITIES, CONFIG_ENTITIES, PLATFORM_ENTITIES, caseOf, firmMayRead, isConfigEntity } from "../api/src/case-feed.ts";

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
for (const entity of ["case document", "answer check", "checklist line", "assessment", "assessment_override"]) {
  ok(`fail (sweep): another firm's "${entity}" line is never read`, !firmMayRead(line(entity, `x on case ${THEIRS}`), own));
  ok(`pass (sweep): "${entity}" is a case entity`, CASE_ENTITIES.has(entity) && !isConfigEntity(entity));
}
// C7.8 (B141, #1248): a form the case officer added to one filing, or removed from it, is a case line: another firm's
// is never read; the firm's own is.
for (const words of [`Case officer added IMM 5532 (Blank official PDF) for the principal on a filing of case ${THEIRS} (reason given)`, `Case officer removed IMM 5532 for the principal from a filing of case ${THEIRS} (reason given)`]) {
  ok("fail (C7.8): another firm's \"filing form\" line is never read by this firm's staff", !firmMayRead(line("filing form", words), own));
  ok("pass (C7.8): the firm's own \"filing form\" line is read, and \"filing form\" is a case entity", firmMayRead(line("filing form", words.replace(THEIRS, OURS)), own) && CASE_ENTITIES.has("filing form") && !isConfigEntity("filing form"));
}
// #861 (C7.6) on main since: the filing's readiness and review lines, entity "filing".
ok("fail (#861, C7.6): another firm's \"filing\" line (reviewed, Ready to file reopened) is never read by user-S's firm", !firmMayRead(line("filing", `Representative A reviewed a filing on case ${THEIRS} (licence R000000)`), own) && !firmMayRead(line("filing", "A filing is no longer Ready to file"), own));
ok("pass (#861): the firm's own \"filing\" line is read, and \"filing\" is a case entity", firmMayRead(line("filing", `A filing on case ${OURS} is no longer Ready to file`), own) && CASE_ENTITIES.has("filing") && !isConfigEntity("filing"));
// Break M1 on #948: fail closed. An entity on neither list is read by no firm's staff, whatever its words.
ok("fail (break M1): a line of an entity no list knows is not read, even when its words name no case", !firmMayRead(line("new case thing", "Case officer uploaded a passport for the principal"), own) && !firmMayRead(line("sign step ", "x"), own));
ok("fail: a line of an entity no list knows that names another firm's case is not read", !firmMayRead(line("some new thing", `x did y on case ${THEIRS}`), own));
ok("fail: a case-entity line that names no case is read by no firm's staff", !firmMayRead(line("sign step", "x marked a form"), own) && !firmMayRead(line("section", "Author renamed a section"), own));
ok("fail (break M1): \"Case 9A1B2C3D\", \"case-9a1b2c3d\" and a no-break space name the case too", [`on Case ${THEIRS.toUpperCase()}`, `case-${THEIRS}`, `case ${THEIRS}`].every((w) => !firmMayRead(line("some new thing", w), own) && caseOf(line("form", w)) === THEIRS));
ok("pass (#553, spoof-proof marker): the first case marker wins, so a typed name after it (\"Sample case ffffffff\") never takes the line from its firm", firmMayRead(line("application number", `On case ${OURS}, Case officer changed the number for Sample case ffffffff`), own) && !firmMayRead(line("application number", `On case ${THEIRS}, x for Sample case ${OURS}`), own));
ok("pass: a case line keyed by the case id is the firm's own", firmMayRead(line("case", "x opened a case", `${OURS}-aaaa-bbbb`), own) && !firmMayRead(line("case", "x opened a case", `${THEIRS}-aaaa`), own));
ok("pass: a configuration line (no case named, a known entity) is read by every firm", firmMayRead(line("form", "Author changed IMM 5257"), own) && firmMayRead(line("library document_type", "Approver approved \"Passport\""), own) && firmMayRead(line("release", "Approver released Visitor visa"), own));
ok("pass: \"case\" in other words (\"in case\", \"case officer\") is not a case id", caseOf(line("form", "in case the case officer asks")) === null);
// B102 (A6): "Work it out instead" writes a configuration line (a worked-out value of the shared library, like "rule
// fact"): its words name no case, so every firm's staff read it, as any configuration line.
ok("pass (B102): a worked-out value is a configuration line, read by every firm", isConfigEntity("worked-out value") && !CASE_ENTITIES.has("worked-out value") && firmMayRead(line("worked-out value", "Configuration author worked out person.age_years as \"Age in whole years from Date Of Birth, on Application date.\" (Sample)"), own));
ok("fail (B102): a worked-out value line that named another firm's case would still not be read", !firmMayRead(line("worked-out value", `x on case ${THEIRS}`), own));
ok("the two lists do not overlap", [...CASE_ENTITIES].every((x) => !CONFIG_ENTITIES.has(x)));
// PF-3 (#1728, merge batch run 43546321596): a firm's setting line is a platform line: on the platform list, read by no
// firm's case feed (a configuration line would reach every firm; the platform's own timeline reads it by firm).
ok("pass (PF-3): \"platform_firm_setting\" is on the platform list only", PLATFORM_ENTITIES.has("platform_firm_setting") && !CASE_ENTITIES.has("platform_firm_setting") && !isConfigEntity("platform_firm_setting"));
ok("fail (PF-3): another firm's setting line is never read by this firm's staff, nor by any firm's (it names no case)", !firmMayRead(line("platform_firm_setting", "Firm sample-solo: setting platform.currency changed", "x:platform.currency"), own) && !firmMayRead(line("platform_firm_setting", "Firm sample-firm: setting platform.language changed"), new Set([OURS, THEIRS])));
ok("fail (PF-3 review m11): a setting line of a firm whose key reads like a case (\"case-deadbeef\") is not read by the firm whose case id it matches", !firmMayRead(line("platform_firm_setting", "Firm case-deadbeef: setting platform.currency changed"), new Set(["deadbeef"])) && firmMayRead(line("sign step", "x marked a form on case deadbeef"), new Set(["deadbeef"])));
ok("the platform list overlaps neither other list", [...PLATFORM_ENTITIES].every((x) => !CASE_ENTITIES.has(x) && !CONFIG_ENTITIES.has(x) && !x.startsWith("library ")));

// The sweep: every audit write in api/src (any `.log(` call with five or more arguments, auditEvent.create and
// createMany). Its entity is a case or a configuration entity; a dynamic entity is one known below with its values; a
// line whose words name "case …" uses a case entity.
const DYNAMIC: Record<string, string[]> = {
  "L.name.toLowerCase()": ["pathway", "program", "category", "sub-category"],
  "LEVEL_WORD[c.level].toLowerCase()": ["pathway", "program", "category", "sub-category"],
  "`library ${c.kind}`": ["library field", "library document_type", "library section", "library structure_node", "library check"],   // any library change kind: all "library …"
  "entityOf(c.kind)": ["structure", "form", "field", "document type", "section", "combination"],
  "entityOf(kind)": ["structure", "form", "field", "document type", "section", "combination"],
  "kind": ["field", "section"],
  "kind === \"field\" ? \"field\" : \"document type\"": ["field", "document type"],
  "kind === \"form\" ? \"form\" : \"document requirement\"": ["form", "document requirement"],
  "line.kind === \"form\" ? \"form\" : \"document requirement\"": ["form", "document requirement"],
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
        // core.ts's own Audit.log passes on the entity it is given (its callers are what the sweep reads).
        const values = ts.isStringLiteral(entity) || ts.isNoSubstitutionTemplateLiteral(entity) ? [entity.text] : f.endsWith("/core.ts") && entity.getText(src) === "entity" ? [] : DYNAMIC[entity.getText(src)];
        if (!values) wrong.push(`${where} (entity ${entity.getText(src)} is dynamic and not known to this check: list its values)`);
        else for (const v of values) {
          found.push({ where, entity: v, names });
          if (!CASE_ENTITIES.has(v) && !isConfigEntity(v) && !PLATFORM_ENTITIES.has(v)) wrong.push(`${where} "${v}" is on no list`);
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
