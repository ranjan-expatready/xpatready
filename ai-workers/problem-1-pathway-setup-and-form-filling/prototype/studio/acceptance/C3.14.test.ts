// Acceptance C3.14 (P-220, pack 3): the Checks list and Shared library › Rules list, read-only, with where used and
// source (P-37; RULES-MODEL §7; Screen 04 concept BR-14, BR-15; contract §6 names GET /library/checks and
// GET /library/rules). Status today: Not built (no API route; the web has an empty /library/checks page). Checks and
// rules are stored per combination (check_def, predicate); the lists gather them across combinations. Rules only, US$0.
//   zsh studio/tools/isolated.sh accept 4440 start && tsx studio/tests/runtime/setup_visitor_visa.ts 4440 xr_studio_accept \
//     && tsx studio/acceptance/C3.14.test.ts 4440 xr_studio_accept
import { client, recorder } from "../tests/runtime/api.ts";

const PORT = Number(process.argv[2] ?? 4440), DB = process.argv[3] ?? "xr_studio_accept";
const { call, sql } = client(PORT, DB);
const { ok, summary } = recorder();
type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- loose API rows, as in the other checks
const KINDS = ["Field validation", "Consistency", "Document validity", "AI review"];
const rowsOf = (b: any) => (Array.isArray(b) ? b : (b?.rows ?? [])) as Row[]; // eslint-disable-line @typescript-eslint/no-explicit-any
const usedIn = (r: Row) => (r.whereUsed ?? r.used_in ?? []).map((u: any) => (typeof u === "string" ? u : u.label ?? u.combination)) as string[]; // eslint-disable-line @typescript-eslint/no-explicit-any
const plainWords = (s: unknown) => typeof s === "string" && s.length > 10 && !/[{}]|"op"|_[a-z]+\./.test(s);
const count = (q: string) => Number(sql(q) || 0);

(async () => {
  const vv = sql(`select id from combination where combination_key = 'vv.single'`);
  if (!vv || !count(`select count(*) from check_def where combination_id = '${vv}' and status = 'PUBLISHED'`)) { console.error("STOP  run tests/runtime/setup_visitor_visa.ts first (it seeds two Visitor visa section checks)"); process.exit(2); }
  const auditBefore = count(`select count(*) from audit_event`);

  // ── Checks list (BR-15) ──
  const c = await call("GET", "/library/checks");
  const checks = rowsOf(c.body);
  ok("C3.14 checks: GET /library/checks answers 200 with rows", c.status === 200 && checks.length > 0, c.status);
  const current = sql(`select d.check_key || '§' || cb.label from check_def d join combination cb on cb.id = d.combination_id where d.status = 'PUBLISHED' and cb.retired_at is null`).split("\n").filter(Boolean).map((x) => x.split("§"));
  const missing = current.filter(([key, combo]) => !checks.some((r) => (r.key ?? r.check_key) === key && usedIn(r).includes(combo)));
  ok("C3.14 checks pass: every current check of every combination is on the list, with that combination under where used", current.length > 0 && missing.length === 0, missing.slice(0, 5));
  ok("C3.14 checks BR-15: every row has a kind (Field validation · Consistency · Document validity · AI review)", checks.length > 0 && checks.every((r) => KINDS.includes(r.kind)), [...new Set(checks.map((r) => r.kind))]);
  ok("C3.14 checks BR-15: every row says what it reads and when it runs, in words", checks.length > 0 && checks.every((r) => plainWords(r.reads ?? r.applies_to) && typeof (r.runs ?? r.when) === "string" && (r.runs ?? r.when).length > 3), checks.find((r) => !plainWords(r.reads ?? r.applies_to))?.key);
  ok("C3.14 checks P-158/P-170: every row shows its source passage, or \"No source recorded\" when it has none", checks.length > 0 && checks.every((r) => (typeof r.source === "string" && r.source.length > 5) || r.unsourced === true), checks.filter((r) => !r.source && !r.unsourced).length);
  ok("C3.14 checks: every row's origin reads AI, Person or From a reviewed release (no enum)", checks.length > 0 && checks.every((r) => /^(AI|Person|From a reviewed release)\b/.test(String(r.origin_words ?? r.origin ?? "")) && !/_/.test(String(r.origin_words ?? r.origin ?? ""))));
  const kindOf = (key: string) => checks.find((r) => (r.key ?? r.check_key) === key && usedIn(r).includes("Visitor visa"))?.kind;
  ok("C3.14 checks pass (RULES-MODEL §7): of the Visitor visa's two seeded checks, visit end before start is Consistency (two values) and funds above 0 is Field validation (one value)", kindOf("VV_VISIT_END_AFTER_START") === "Consistency" && kindOf("VV_FUNDS_ABOVE_ZERO") === "Field validation", [kindOf("VV_VISIT_END_AFTER_START"), kindOf("VV_FUNDS_ABOVE_ZERO")]);
  const byKind = rowsOf((await call("GET", `/library/checks?kind=${encodeURIComponent("Consistency")}`)).body);
  ok("C3.14 checks filter: ?kind=Consistency returns only Consistency checks", byKind.length > 0 && byKind.every((r) => r.kind === "Consistency") && byKind.length < checks.length);
  const byCombo = rowsOf((await call("GET", `/library/checks?combination=${vv}`)).body);
  ok("C3.14 checks filter: ?combination= returns only the checks that combination uses", byCombo.length === count(`select count(distinct check_key) from check_def where combination_id = '${vv}' and status = 'PUBLISHED'`) && byCombo.every((r) => usedIn(r).includes("Visitor visa")), byCombo.length);

  // ── Rules list (BR-14) ──
  const ru = await call("GET", "/library/rules");
  const rules = rowsOf(ru.body);
  ok("C3.14 rules: GET /library/rules answers 200 with rows", ru.status === 200 && rules.length > 0, ru.status);
  const preds = count(`select count(*) from predicate p join combination c on c.id = p.combination_id where p.status = 'PUBLISHED' and c.retired_at is null`);
  ok("C3.14 rules pass: every current rule is on the list once per combination it serves (where used counted)", rules.reduce((s, r) => s + usedIn(r).length, 0) === preds && preds > 0, { listed: rules.reduce((s, r) => s + usedIn(r).length, 0), preds });
  ok("C3.14 rules BR-14: each rule reads as a sentence (when … then …, for whom), never as raw JSON", rules.length > 0 && rules.every((r) => plainWords(r.when ?? r.when_plain) && plainWords(r.then ?? r.then_plain ?? r.when ?? r.when_plain)), rules.find((r) => !plainWords(r.when ?? r.when_plain))?.key);
  ok("C3.14 rules P-170: each rule shows its source passage or \"No source recorded\"", rules.length > 0 && rules.every((r) => (typeof r.source === "string" && r.source.length > 5) || r.unsourced === true));

  // ── Read-only ──
  const writes = await Promise.all([call("POST", "/library/checks", { key: "x" }), call("PATCH", `/library/checks/${encodeURIComponent(checks[0]?.key ?? "x")}`, { message: "x" }), call("DELETE", `/library/rules/${encodeURIComponent(rules[0]?.key ?? "x")}`), call("POST", "/library/rules", { key: "x" })]);
  ok("C3.14 fail: the lists are read-only: no write route answers 2xx, and nothing is written", writes.every((w) => w.status >= 400) && count(`select count(*) from audit_event`) === auditBefore, writes.map((w) => w.status));
  process.exit(summary() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
