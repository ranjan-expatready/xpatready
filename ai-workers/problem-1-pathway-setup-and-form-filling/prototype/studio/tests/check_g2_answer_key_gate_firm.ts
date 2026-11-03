// G2 (C5.5; concept product/screens/G2-answer-key-gate/concept.md v2 BR-3; the tech lead on #558 and #568): outside
// the demo workspace Sample content never releases. The same Visitor visa content the demo releases as a Demo release
// is, in a copy switched to another workspace (STUDIO_WORKSPACE_KEY=firm), a real release: refused, naming each map
// with no passing signed answer-key test; refused again for a key that passes but is not signed; then (Opus re-review
// of #568, M2) refused at Submit and at release while any Sample content remains (the Sample combination, each Sample
// check), each named; released once they are replaced, and labelled a real release. M1: the demo's sample load and
// Reset to the six refuse (409) outside the demo workspace and write nothing. The sample inputs are loaded while the
// copy is still the demo workspace (the only place they load), then it restarts as "firm" on the same database. The
// IMM 5257 key is hand-written (G4's E1 key); the IMM 5707 key comes from tests/lib/release-ready.ts (scaffolding,
// P-33). US$0; no AI.
//   zsh studio/tools/isolated.sh screens_g2f 4440 start && tsx studio/tests/check_g2_answer_key_gate_firm.ts 4440 xr_studio_screens_g2f
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { client, recorder } from "./runtime/api.ts";
import { sourceEveryNumber } from "./fixtures/source-every-number.cjs"; // G1 (#587): numbers without a source refuse first, so each submit answers them
import { e1Keys, sample } from "./g4_e1_key.ts";
import { passEveryAnswerKey } from "./lib/release-ready.ts";

const PORT = Number(process.argv[2] ?? 4440), DB = process.argv[3] ?? "xr_studio_screens_g2f", NAME = DB.replace(/^xr_studio_/, "");
const { call, sql } = client(PORT, DB);
const { ok, summary } = recorder();
const STUDIO = join(dirname(fileURLToPath(import.meta.url)), "..");
const AUTHOR = "user-A", EXPERT = "user-C", APPROVER = "user-B";
const restart = (...env: string[]) => execFileSync("zsh", [join(STUDIO, "tools", "isolated.sh"), NAME, String(PORT), "restart", ...env], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
type Err = { where: string; item: string; label?: string; message: string; gate?: string };
const errorsOf = (x: { body?: { errors?: Err[] } }) => x.body?.errors ?? [];
const sampled = (x: { body?: { errors?: Err[] } }) => errorsOf(x).filter((e) => e.gate === "sample-content");
const SEEDED = ["VV_VISIT_END_AFTER_START", "VV_FUNDS_ABOVE_ZERO"]; // tests/runtime/setup_visitor_visa.ts 4.5b, Sample
const SCAFFOLD_QUOTE = "Test scaffolding (P-33): the official source quote of this check, written through the database because no screen edits a check yet.";

try {
// The copy starts as the demo workspace: the sample inputs load only there (M1), so it loads them, then switches.
const wsKey = sql(`select key from workspace limit 1`);
if (wsKey && wsKey !== "demo") { console.error(`STOP  this copy's workspace is "${wsKey}": start a fresh copy (see the usage line)`); process.exit(2); }
let r = await call("POST", "/demo/load", undefined, AUTHOR);
ok("C5.5 M1 pass: in the demo workspace the sample load still works (the Visitor visa row is there)", r.status < 300 && !!sql(`select id from combination where combination_key = 'vv.single'`), r.body?.detail ?? r.status);
sql(`update workspace set key='firm' where key='demo'`);
restart("STUDIO_WORKSPACE_KEY=firm");
const sess = (await call("GET", "/session")).body;
ok("C5.5 BR-3: the copy runs as the workspace \"firm\", not the demo", sql(`select key from workspace`) === "firm" && sess?.workspace?.key === "firm" && sess.workspace.demo === false, sess?.workspace);

// M1 fail: no sample load and no Reset to the six outside the demo workspace, and nothing written (the copy already has
// names, so a 409 for that reason would prove nothing: the words are the demo-only ones).
const counts = () => sql(`select (select count(*) from program_def)||'/'||(select count(*) from combination)||'/'||(select count(*) from config_release)||'/'||(select count(*) from pack_version)`);
const before = counts();
const demoOnly = (x: { status: number; body?: { detail?: string } }) => x.status === 409 && /works only in the demo workspace/.test(x.body?.detail ?? "");
const load = await call("POST", "/demo/load", undefined, AUTHOR), six = await call("POST", "/demo/load", { sample: "six" }, AUTHOR), reset6 = await call("POST", "/demo/reset-to-six", { confirm: "RESET" }, AUTHOR);
ok("C5.5 M1 fail: outside the demo workspace Load sample (the fixture and the six) and Reset to the six answer 409 \"works only in the demo workspace\", and write nothing", demoOnly(load) && demoOnly(six) && demoOnly(reset6) && counts() === before, { load: [load.status, load.body?.detail], six: [six.status, six.body?.detail], reset: [reset6.status, reset6.body?.detail], before, after: counts() });

// The Visitor visa setup ends with a release, which this workspace refuses (that is the point): its own lines say so.
// Its own sample load (4.1) is refused here too; the row is already loaded above.
try { execFileSync(join(STUDIO, "node_modules", ".bin", "tsx"), ["--tsconfig", join(STUDIO, "api", "tsconfig.json"), join(STUDIO, "tests", "runtime", "setup_visitor_visa.ts"), String(PORT), DB], { stdio: "ignore" }); } catch { /* the release step fails here by design */ }
const vv = sql(`select id from combination where combination_key = 'vv.single'`);
if (!vv || sql(`select count(*) from drafting_job where combination_id = '${vv}' and status = 'APPLIED'`) === "0") { console.error("STOP  setup_visitor_visa.ts did not configure the Visitor visa"); process.exit(2); }
ok("C5.5 BR-3 fail: the Visitor visa setup could not release here (no Demo release outside the demo workspace)", sql(`select count(*) from config_release where combination_id = '${vv}'`) === "0");

const view = async () => (await call("GET", `/combinations/${vv}`, undefined, AUTHOR)).body;
const tests = (v: { draft: { problems: { where: string; level: string; label?: string; message: string }[] } }) => v.draft.problems.filter((p) => p.where === "Tests");
let v = await view();
ok("C5.5 BR-3: the same Sample content is a real release here (not a Demo release)", v.draft.answer_keys.demo === false, v.draft.answer_keys);
const errs = tests(v).filter((p) => p.level === "error").map((p) => p.label);
ok("C5.5 Done when, BR-5 E7: both new maps with no test are errors, each named", errs.includes("IMM 5257 field map") && errs.includes("IMM 5707 field map"), tests(v));
await sourceEveryNumber(PORT, vv); r = await call("POST", `/combinations/${vv}/submit`, {}, AUTHOR);
// errors[] names each item by its item (the shared refusal, api/src/refusal.ts, words it in message; C5.5: the Sample
// content lines are a gate, so this refusal is the shared one).
const named = (r.body?.errors ?? []).filter((x: { where: string }) => x.where === "Tests").map((x: { item: string }) => x.item);
ok("C5.5 Done when, BR-8: Submit is refused (400) and errors[] names IMM 5257 and IMM 5707", r.status === 400 && named.includes("IMM 5257") && named.includes("IMM 5707"), r.body?.errors);

// The hand-written E1 key for IMM 5257, passing but not signed
const ed = v.draft.answer_keys.items.find((i: { item_ref: string }) => i.item_ref === "IMM 5257")?.edition as string;
const fam = await call("POST", "/answer-keys/families", { ...sample, key: "e1-firm" }, AUTHOR);
const k = await call("POST", `/combinations/${vv}/answer-keys`, { family_id: fam.body.id, item_kind: "field_map", item_ref: "IMM 5257", expected: e1Keys(ed).key }, EXPERT);
ok("C5.5 setup: the expert writes the E1 key for IMM 5257", fam.status === 201 && k.status === 201, k.body?.detail ?? k.body);
await sourceEveryNumber(PORT, vv); r = await call("POST", `/combinations/${vv}/submit`, {}, AUTHOR);
const msgs = (r.body?.errors ?? []).filter((x: { where: string }) => x.where === "Tests").map((x: { message: string }) => x.message);
ok("C5.5 Done when, BR-5: a passing key not signed refuses a real release, naming it; IMM 5707 still has no test", r.status === 400 && msgs.some((m: string) => /^IMM 5257 field map: the answer-key test for ".*" is not signed\./.test(m)) && msgs.some((m: string) => /^IMM 5707 field map: no answer-key test/.test(m)) && !msgs.some((m: string) => /IMM 5257.*failed/.test(m)), msgs);
ok("C5.5 BR-6: that Submit ran the key (stored, passed) before refusing", sql(`select result from answer_key_run where key_id = '${k.body.id}' order by ran_at desc limit 1`) === "PASSED");
const cur = (await call("GET", `/answer-keys/${k.body.id}`, undefined, AUTHOR)).body;
r = await call("POST", `/answer-keys/${k.body.id}/sign`, { version: cur.version }, EXPERT);
ok("C5.5 setup: the expert signs the IMM 5257 key", r.status === 200 && r.body.state === "SIGNED", r.body?.detail);
await sourceEveryNumber(PORT, vv); r = await call("POST", `/combinations/${vv}/submit`, {}, AUTHOR);
const left = (r.body?.errors ?? []).filter((x: { where: string }) => x.where === "Tests").map((x: { item: string }) => x.item);
ok("C5.5 BR-4: signed and passing, IMM 5257 is no longer named; IMM 5707 still is", r.status === 400 && !left.includes("IMM 5257") && left.includes("IMM 5707"), left);

// IMM 5707 made ready by the shared helper (scaffolding), then the real release goes through and records both keys
const ready = await passEveryAnswerKey(call, vv, { author: AUTHOR, expert: EXPERT, familyKey: "release-helper-firm" });
ok("C5.5 helper (P-33): tests/lib/release-ready.ts gives IMM 5707 a signed, passing key through the API", ready.ready.includes("IMM 5707") && !ready.failed.length, ready);
await sourceEveryNumber(PORT, vv); r = await call("POST", `/combinations/${vv}/submit`, {}, AUTHOR);
const rest = (r.body?.errors ?? []).filter((x: { where: string }) => x.where === "Tests");
ok("C5.5 BR-4: with both maps signed and passing, no answer-key line refuses Submit", !rest.length, { status: r.status, tests: rest, other: (r.body?.errors ?? []).slice(0, 3) });

// M2 (P-240, BR-3): the Sample content still in the draft refuses the real release at Submit, each item named.
const items = sampled(r);
ok("C5.5 M2 fail: Submit is refused (400) while Sample content remains, naming the Sample combination and both Sample checks, with the count sentence",
  r.status === 400 && items.length === 3 && items.some((e) => e.where === "Release" && /is a Sample combination/.test(e.message)) && SEEDED.every((k) => items.some((e) => e.where === "Checks" && e.item === k && /Sample/.test(e.message))) && /3 items are Sample content, which releases only in the demo workspace/.test(r.body?.detail ?? ""), { status: r.status, detail: r.body?.detail, items });
v = await view();
ok("C5.5 M2: Review and release lists the same three Sample items, and the draft is not a Demo release here", v.draft.problems.filter((p: Err) => p.gate === "sample-content").length === 3 && v.draft.answer_keys.demo === false, v.draft.problems.filter((p: Err) => p.gate === "sample-content"));

// Replaced (scaffolding, P-33: no screen edits a check or a combination's basis yet): each check gets its official
// source quote and the combination is source-backed. Then Submit goes through.
sql(`update check_def set source_quote = '${SCAFFOLD_QUOTE}', illustrative = false where combination_id = '${vv}' and illustrative`);
sql(`update combination set source_basis = 'SOURCE_BACKED' where id = '${vv}'`);
await sourceEveryNumber(PORT, vv); r = await call("POST", `/combinations/${vv}/submit`, {}, AUTHOR);
ok("C5.5 M2 pass: with the Sample content replaced, Submit goes through (201)", r.status === 201 && !sampled(r).length, { status: r.status, errors: errorsOf(r).slice(0, 3) });

// M2 at release: a Sample check added after Submit (the add-check form saves one with no quote as Sample) refuses the
// release (409), named, before the review gate.
const added = await call("POST", `/combinations/${vv}/checks`, { appliesTo: "case.funds_available_cad", condition: { subjectKind: "CASE", op: "lt", field: "case.funds_available_cad", value: 100 }, message: "The money for the stay looks very low. Check the amount." }, AUTHOR);
r = await call("POST", `/combinations/${vv}/approve`, undefined, APPROVER);
ok("C5.5 M2 fail: a Sample check added after Submit refuses the release (409), naming it", added.status === 201 && added.body?.illustrative === true && r.status === 409 && sampled(r).length === 1 && sampled(r)[0].item === added.body?.key && /1 item is Sample content/.test(r.body?.detail ?? "") && sql(`select count(*) from config_release where combination_id = '${vv}'`) === "0", { added: added.body, status: r.status, detail: r.body?.detail });

sql(`update check_def set source_quote = '${SCAFFOLD_QUOTE}', illustrative = false where combination_id = '${vv}' and illustrative`);
await sourceEveryNumber(PORT, vv); r = await call("POST", `/combinations/${vv}/submit`, {}, AUTHOR);
if (r.status === 201) {
  const sub = (await call("GET", `/combinations/${vv}/review`, undefined, AUTHOR)).body.submission;
  await call("POST", `/combinations/${vv}/signoff`, { items: (sub?.changeSummary ?? []).map((x: { kind: string; key: string }) => `${x.kind}|${x.key}`), action: "signed" }, EXPERT);
  r = await call("POST", `/combinations/${vv}/approve`, undefined, APPROVER);
  const summ = JSON.parse(sql(`select summary from config_release where combination_id = '${vv}' order by version desc limit 1`) || "{}");
  ok("C5.5 BR-9: the real release goes through and its summary names both signed keys", r.status === 201 && (summ.answer_keys ?? []).filter((x: { state: string; result: string }) => x.state === "SIGNED" && x.result === "passed").length === 2, r.body?.detail ?? summ.answer_keys);
  const rel = ((await call("GET", "/releases", undefined, AUTHOR)).body as { combination_id: string; demo: boolean }[]).find((x) => x.combination_id === vv);
  ok("C5.5 M2 pass: it froze no Sample content and is labelled a real release (History and the combination page)", rel?.demo === false && (await view()).releases?.[0]?.demo === false && sql(`select count(*) from config_release r, jsonb_array_elements(r.snapshot->'checks') c where r.combination_id = '${vv}' and (c->>'illustrative')::boolean`) === "0", rel);
  // BR-3 label (C5.5, shared with G3): a firm release that froze Sample content before this gate existed (written here
  // through the database) is still a real release outside the demo workspace, never a "Demo release".
  sql(`update config_release set snapshot = jsonb_set(snapshot, '{combination,source_basis}', '"ILLUSTRATIVE"') where combination_id = '${vv}'`);
  const legacy = ((await call("GET", "/releases", undefined, AUTHOR)).body as { combination_id: string; demo: boolean }[]).find((x) => x.combination_id === vv);
  ok("C5.5 BR-3 label: outside the demo workspace a release whose snapshot holds Sample content still reads as a real release", legacy?.demo === false && (await view()).releases?.[0]?.demo === false, legacy);
} else ok("C5.5 BR-9: the real release goes through and its summary names both signed keys", false, r.body);
} catch (e) { ok("ran to the end", false, (e as Error).message); }
// Back to the demo workspace, so the copy ends as it started.
try { sql(`update workspace set key='demo' where key<>'demo'`); restart(); } catch { /* the copy may be gone */ }
process.exit(summary() ? 1 : 0);
