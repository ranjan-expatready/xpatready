// C3.14 (screens lane, swarm builder J5; Screen 04 BR-15 and view 10, RULES-MODEL §7, P-37): the Checks list and Shared
// library › Rules, read-only, with where used and source. One row per check across combinations (its newest version in
// each), a source or "none recorded", the fields it reads; every rule as a sentence with where it lives (a combination's
// rules, the conditions on its form and checklist lines, the conditions on questions). Nothing can be written through
// either list. A passing and a failing case per rule, through the API on an isolated copy with the sample inputs loaded
// (the demo is never touched). No browser, NO model call (US$0).
//   zsh studio/tools/isolated.sh screens_rules 4450 start && tsx studio/tests/check_c314_rules.ts 4450 xr_studio_screens_rules
import { execFileSync } from "node:child_process";

const PORT = Number(process.argv[2] ?? 4450), DB = process.argv[3] ?? "xr_studio_screens_rules";
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely, as in the other API checks
const call = async (method: string, path: string, body?: unknown, actor: string | null = "user-A"): Promise<Res> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { ...(actor ? { "x-actor": actor } : {}), "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const n = (q: string) => Number(sql(q));
type Check = { key: string; kind: string; kind_word: string; about: string | null; message: string | null; stops: boolean; reads: { key: string; name: string | null }[]; used_in: { key: string; label: string }[]; source: string | null; unsourced: boolean; origin: string; status: string };
type Rule = { id: string; kind: string; when: string | null; then: string; lives_on: { combination: { key: string } | null; section: string | null; tab: string }; used_in: { key: string }[]; reads: unknown[]; source: string | null; unsourced: boolean };

(async () => {
  const loaded = await call("POST", "/demo/load");
  ok("setup: the sample inputs load", loaded.status === 201, loaded.body?.message);

  // ─────────────────── Checks: one row per check, its kind, what it reads, where used, its source
  let checks = (await call("GET", "/library/checks")).body as Check[];
  const keys = n("select count(distinct check_key) from check_def where status in ('PUBLISHED','DRAFT')");
  ok("C3.14 BR-15 pass: the Checks list has one row per check across combinations, as many as the setup holds", Array.isArray(checks) && checks.length === keys && new Set(checks.map((c) => c.key)).size === checks.length, [checks.length, keys]);
  ok("C3.14 BR-15 pass: each row says its kind in words, whether it stops or warns, and where it is used", checks.every((c) => c.kind_word && !/_/.test(c.kind_word) && typeof c.stops === "boolean" && c.used_in.length >= 1) && checks.some((c) => c.stops) && checks.some((c) => !c.stops), checks.find((c) => !c.kind_word || !c.used_in.length));
  const withPred = checks.find((c) => c.key === "CR_LMIA_AND_EXEMPT")!;
  ok("C3.14 BR-15 pass: a check names the shared fields its condition reads", withPred?.reads.map((r) => r.key).join() === "case.employer_obtained_lmia,case.offer_lmia_exempt", withPred?.reads);
  ok("C3.14 pass: a check with a source quotes it", !withPred.unsourced && /labour market impact assessment/.test(withPred.source ?? ""), withPred.source);
  // The same check in a second combination: still one row, used by both.
  const vv = sql("select id from combination where combination_key='vv.single'");
  sql(`insert into check_def (id, workspace_id, combination_id, check_key, check_group, applies_to, predicate_json, severity, message, source_quote, version, status, origin, updated_by) select gen_random_uuid(), workspace_id, '${vv}', check_key, check_group, applies_to, predicate_json, severity, message, source_quote, 1, 'DRAFT', origin, 'user-A' from check_def where check_key='CR_LMIA_AND_EXEMPT' and status='PUBLISHED' limit 1`);
  checks = (await call("GET", "/library/checks")).body as Check[];
  const twice = checks.filter((c) => c.key === "CR_LMIA_AND_EXEMPT");
  ok("C3.14 BR-15 pass: a check two combinations hold is one row, used by both (and Draft while one copy is a draft)", twice.length === 1 && twice[0].used_in.map((c) => c.key).sort().join() === "vv.single,wp.family" && twice[0].status === "DRAFT", twice);
  // A newer version replaces the older; a newest retired version takes the check off that combination.
  const lmia = sql("select id from combination where combination_key='wp.family'");
  sql(`update check_def set status='SUPERSEDED' where combination_id='${vv}' and check_key='CR_LMIA_AND_EXEMPT'`);
  sql(`insert into check_def (id, workspace_id, combination_id, check_key, check_group, applies_to, predicate_json, severity, message, version, status, origin, updated_by) select gen_random_uuid(), workspace_id, '${vv}', check_key, check_group, applies_to, predicate_json, severity, 'C314 newer wording', 2, 'RETIRED', 'HUMAN', 'user-A' from check_def where check_key='CR_LMIA_AND_EXEMPT' and combination_id='${lmia}' limit 1`);
  checks = (await call("GET", "/library/checks")).body as Check[];
  const after = checks.find((c) => c.key === "CR_LMIA_AND_EXEMPT")!;
  ok("C3.14 BR-15 fail: a check whose newest version in a combination is retired is no longer used there (older versions are not shown)", after.used_in.map((c) => c.key).join() === "wp.family" && after.message !== "C314 newer wording" && after.status === "PUBLISHED", after);
  // A check with no source is flagged, never blank.
  sql(`insert into check_def (id, workspace_id, combination_id, check_key, check_group, applies_to, severity, message, version, status, origin, updated_by) select gen_random_uuid(), workspace_id, id, 'C314_NO_SOURCE', 'cross_record', 'A test check', 'warn', 'A check written without a source.', 1, 'DRAFT', 'HUMAN', 'user-A' from combination where combination_key='wp.family'`);
  const bare = ((await call("GET", "/library/checks")).body as Check[]).find((c) => c.key === "C314_NO_SOURCE");
  ok("C3.14 fail: a check with no source is flagged (unsourced), with no field read and its origin", bare?.unsourced === true && bare.source === null && bare.reads.length === 0 && bare.origin === "HUMAN", bare);

  // ─────────────────── Rules: every rule as a sentence, where it lives, its source
  let rules = (await call("GET", "/library/rules")).body as Rule[];
  const by = (k: string) => rules.filter((r) => r.kind === k);
  const preds = n("select count(distinct (combination_id, predicate_key)) from predicate where status in ('PUBLISHED','DRAFT')");
  const formConds = n("select count(*) from combination_form where status in ('PUBLISHED','DRAFT') and (predicate_json is not null or condition_plain is not null)");
  const formAll = n("select count(*) from combination_form where status in ('PUBLISHED','DRAFT')");
  const docConds = n("select count(*) from document_requirement where status in ('PUBLISHED','DRAFT') and (predicate_json is not null or condition_plain is not null)");
  ok("C3.14 pass: Rules lists every rule of every combination (one per rule, its newest version)", by("rule").length === preds && preds > 0, [by("rule").length, preds]);
  ok("C3.14 pass: the conditions on form lines and checklist lines are listed too, each with what it adds", by("form_line").length === formConds && by("checklist_line").length === docConds && by("form_line").every((r) => / is needed$/.test(r.then)) && by("checklist_line").every((r) => / is needed$/.test(r.then)), [by("form_line").length, formConds, by("checklist_line").length, docConds]);
  ok("C3.14 fail: a form line with no condition is not a rule (not listed)", formAll > formConds && by("form_line").length < formAll, [formAll, formConds]);
  const r01 = rules.find((r) => r.kind === "rule" && /IMM 5707/.test(r.then));
  ok("C3.14 pass: a rule reads as a sentence (then … when …) and says where it lives: its combination and tab", !!r01?.when && r01.lives_on.combination?.key === "wp.family" && r01.lives_on.tab === "questionnaires" && r01.used_in.length === 1 && r01.reads.length > 0, r01);
  ok("C3.14 pass: every rule with a source quotes it; one without is flagged, never blank", rules.filter((r) => r.kind !== "question").some((r) => !r.unsourced && !!r.source) && rules.every((r) => r.unsourced === !r.source));
  ok("C3.14 fail: before any question has a condition, no question rule is listed", by("question").length === 0, by("question").length);
  // A condition on a question: listed once, used by every combination that picks its section.
  const q = sql("select id||'|'||section_key from section_question where status='PUBLISHED' order by lineage_key limit 1").split("|");
  sql(`update section_question set condition_plain='Only when the person has a spouse.', predicate_json='{"op":"eq","field":"person.marital_status","value":"married"}'::jsonb, condition_effect='SHOW' where id='${q[0]}'`);
  await call("POST", `/combinations/${vv}/sections/${q[1]}`, {});
  rules = (await call("GET", "/library/rules")).body as Rule[];
  const qr = rules.filter((r) => r.kind === "question");
  ok("C3.14 pass: a condition on a question is one rule, living on its section, used by each combination that picks the section", qr.length === 1 && !!qr[0].lives_on.section && qr[0].lives_on.combination === null && qr[0].used_in.map((c) => c.key).sort().join() === "vv.single,wp.family" && /^Ask /.test(qr[0].then), qr[0]);

  // ─────────────────── Read-only, and who may read
  const before = [n("select count(*) from check_def"), n("select count(*) from predicate"), n("select count(*) from library_change")];
  const writes = await Promise.all([call("POST", "/library/checks", { key: "X" }), call("PATCH", "/library/checks", {}), call("DELETE", "/library/checks"), call("POST", "/library/rules", { then: "X" }), call("PATCH", "/library/rules", {}), call("DELETE", "/library/rules")]);
  ok("C3.14 fail: nothing can be added, changed or removed through either list (404 for every write), and nothing is written", writes.every((w) => w.status === 404) && JSON.stringify(before) === JSON.stringify([n("select count(*) from check_def"), n("select count(*) from predicate"), n("select count(*) from library_change")]), writes.map((w) => w.status));
  const [nobody, reviewer] = await Promise.all([call("GET", "/library/checks", undefined, null), call("GET", "/library/rules", undefined, "user-B")]);
  ok("C3.14 pass/fail: any simulated person may read the lists (the reviewer: 200); a request naming no one is 401 (QA-65)", nobody.status === 401 && reviewer.status === 200, [nobody.status, reviewer.status]);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
