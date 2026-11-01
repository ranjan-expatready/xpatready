// Acceptance C3.14 (P-220, pack 3): the Checks list and Shared library › Rules list, read-only, with where used and
// source (P-37; RULES-MODEL §2, §7; Screen 04 concept BR-14, BR-15). Status today: Not built on main. Open PR #294 builds
// GET /library/checks and GET /library/rules; the tech lead (#295) asked these tests to follow its routes and words:
//   checks: one row per check key across combinations {key, kind, kind_word, group, group_word, about, reads[{key, name}],
//     used_in[{id, key, label}], differs, per_combination[], message, serious, source, unsourced, origin, status};
//     kinds: cross_record and read_back → Consistency, readiness_warning → Document validity, any other group → Other.
//   rules: {id, kind (rule | form_line | checklist_line | question), when, then, lives_on {combination, section, tab},
//     used_in[], reads[], source, unsourced, origin, status}.
// Filtering by kind, origin and combination happens on the screen (J5.2), not in the API. Rules only, US$0.
//   zsh studio/tools/isolated.sh accept 4448 start && tsx studio/tests/runtime/setup_visitor_visa.ts 4448 xr_studio_accept \
//     && tsx studio/acceptance/C3.14.test.ts 4448 xr_studio_accept
import { client, recorder } from "../tests/runtime/api.ts";

const PORT = Number(process.argv[2] ?? 4448), DB = process.argv[3] ?? "xr_studio_accept";
const { call, sql } = client(PORT, DB);
const { ok, summary } = recorder();
type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- loose API rows, as in the other checks
const KIND_WORDS = ["Field validation", "Consistency", "Document validity", "AI review", "Other"];
const rowsOf = (b: unknown) => (Array.isArray(b) ? b : ((b as Row)?.rows ?? [])) as Row[];
const keysIn = (r: Row) => (r.used_in ?? []).map((u: Row) => u.key) as string[];
const count = (q: string) => Number(sql(q) || 0);

(async () => {
  const vv = sql(`select id from combination where combination_key = 'vv.single'`);
  if (!vv || !count(`select count(*) from check_def where combination_id = '${vv}' and status = 'PUBLISHED'`)) { console.error("STOP  run tests/runtime/setup_visitor_visa.ts first (it seeds two Visitor visa section checks)"); process.exit(2); }

  // ── Checks list (BR-15) ──
  const c = await call("GET", "/library/checks");
  const checks = rowsOf(c.body);
  ok("C3.14 checks: GET /library/checks answers 200 with rows", c.status === 200 && checks.length > 0, c.status);
  ok("C3.14 checks pass: one row per check key across combinations, as many as the combinations hold", checks.length === count(`select count(distinct d.check_key) from check_def d join combination cb on cb.id = d.combination_id where d.status in ('DRAFT', 'PUBLISHED')`) && new Set(checks.map((r) => r.key)).size === checks.length, checks.length);
  const current = sql(`select d.check_key || '§' || cb.combination_key from check_def d join combination cb on cb.id = d.combination_id where d.status = 'PUBLISHED'`).split("\n").filter(Boolean).map((x) => x.split("§"));
  const missing = current.filter(([key, combo]) => !checks.some((r) => r.key === key && keysIn(r).includes(combo)));
  ok("C3.14 checks pass: every current check of every combination is on the list, with that combination under where used", current.length > 0 && missing.length === 0, missing.slice(0, 5));
  ok("C3.14 checks BR-15: every row says its kind and group in words (no codes), and per combination whether it stops or warns", checks.length > 0 && checks.every((r) => KIND_WORDS.includes(r.kind_word) && !/_/.test(`${r.kind_word}${r.group_word}`) && (r.per_combination ?? []).length === (r.used_in ?? []).length));
  ok("C3.14 checks RULES-MODEL §7 (#294): answers compared and read-backs are Consistency, readiness warnings Document validity, other groups Other with their group named", checks.filter((r) => ["cross_record", "read_back"].includes(r.group)).every((r) => r.kind_word === "Consistency") && checks.filter((r) => r.group === "readiness_warning").every((r) => r.kind_word === "Document validity") && checks.filter((r) => !["cross_record", "read_back", "readiness_warning"].includes(r.group)).every((r) => r.kind_word === "Other" && (r.group_word ?? "").length > 3) && checks.some((r) => r.group === "readiness_warning"));
  ok("C3.14 checks BR-15: each row names the shared fields its condition reads (key and name)", checks.filter((r) => (r.reads ?? []).length).length > 0 && checks.every((r) => (r.reads ?? []).every((f: Row) => typeof f.key === "string" && "name" in f)));
  ok("C3.14 checks P-158/P-170: a check with a source quotes it; one without is flagged (unsourced), never blank", checks.length > 0 && checks.every((r) => r.differs === true || r.unsourced === !r.source));
  ok("C3.14 checks BR-15 \"value per combination\": each combination's copy keeps its own effect, wording and source, and a row whose copies differ says so", checks.length > 0 && checks.every((r) => (r.per_combination ?? []).every((x: Row) => x.combination && typeof x.serious === "boolean" && "message" in x && "source" in x) && (r.differs === true ? r.message === null : true)));
  const vvSeeded = checks.filter((r) => ["VV_VISIT_END_AFTER_START", "VV_FUNDS_ABOVE_ZERO"].includes(r.key));
  ok("C3.14 checks pass: the Visitor visa's two seeded section checks are listed, used by the Visitor visa, unsourced (Sample)", vvSeeded.length === 2 && vvSeeded.every((r) => keysIn(r).includes("vv.single") && r.unsourced === true), vvSeeded.map((r) => [r.key, r.kind_word, r.group_word]));

  // ── Rules list (BR-14) ──
  const ru = await call("GET", "/library/rules");
  const rules = rowsOf(ru.body);
  const by = (k: string) => rules.filter((r) => r.kind === k);
  ok("C3.14 rules: GET /library/rules answers 200 with rows", ru.status === 200 && rules.length > 0, ru.status);
  const preds = count(`select count(distinct (combination_id, predicate_key)) from predicate where status in ('DRAFT', 'PUBLISHED')`);
  ok("C3.14 rules pass: every rule of every combination is listed once (its newest version)", by("rule").length === preds && preds > 0, [by("rule").length, preds]);
  const formConds = count(`select count(distinct (combination_id, lineage_key)) from combination_form where status in ('DRAFT', 'PUBLISHED') and predicate_json is not null`);
  ok("C3.14 rules pass: the conditions on form lines are rules too, each saying what it adds (\"… is needed\"); a line with no condition is not", by("form_line").length === formConds && by("form_line").every((r) => / is needed$/.test(r.then ?? "")), [by("form_line").length, formConds]);
  ok("C3.14 rules BR-14: each rule reads as a sentence (when …, then …), never as raw JSON, and says where it lives (combination or section, and tab)", rules.length > 0 && rules.every((r) => typeof r.then === "string" && r.then.length > 3 && !/[{}]|"op"/.test(`${r.when ?? ""}${r.then}`) && r.lives_on && (r.lives_on.combination || r.lives_on.section)));
  ok("C3.14 rules P-170: every rule with a source quotes it; one without is flagged (unsourced)", rules.length > 0 && rules.every((r) => r.unsourced === !r.source));

  // ── Read-only, and who may read ──
  const before = [count(`select count(*) from check_def`), count(`select count(*) from predicate`), count(`select count(*) from audit_event`)];
  const writes = await Promise.all([call("POST", "/library/checks", { key: "x" }), call("PATCH", `/library/checks/${encodeURIComponent(checks[0]?.key ?? "x")}`, { message: "x" }), call("DELETE", `/library/rules/${encodeURIComponent(rules[0]?.id ?? "x")}`), call("POST", "/library/rules", { key: "x" })]);
  ok("C3.14 fail: the lists are read-only: no write route answers 2xx, and nothing is written", writes.every((w) => w.status >= 400) && JSON.stringify(before) === JSON.stringify([count(`select count(*) from check_def`), count(`select count(*) from predicate`), count(`select count(*) from audit_event`)]), writes.map((w) => w.status));
  const anon = await call("GET", "/library/checks", undefined, null), reviewer = await call("GET", "/library/rules", undefined, "user-C");
  ok("C3.14 pass/fail (#294, QA-65): any simulated person may read the lists; a request naming no one is 401", anon.status === 401 && reviewer.status === 200, [anon.status, reviewer.status]);
  process.exit(summary() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
