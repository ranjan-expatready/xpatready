// G2 (C5.5; concept product/screens/G2-answer-key-gate/concept.md v2 BR-3; the tech lead on #558 and #568): outside
// the demo workspace Sample content never releases. The same Visitor visa content the demo releases as a Demo release
// is, in a copy started as another workspace (STUDIO_WORKSPACE_KEY=firm), a real release: refused, naming each map
// with no passing signed answer-key test; refused again for a key that passes but is not signed; released once both
// maps have signed, passing keys, and the release records them. The IMM 5257 key is hand-written (G4's E1 key); the
// IMM 5707 key comes from tests/lib/release-ready.ts (scaffolding, P-33). US$0; no AI.
//   zsh studio/tools/isolated.sh screens_g2f 4440 start STUDIO_WORKSPACE_KEY=firm && tsx studio/tests/check_g2_answer_key_gate_firm.ts 4440 xr_studio_screens_g2f
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { client, recorder } from "./runtime/api.ts";
import { sourceEveryNumber } from "./fixtures/source-every-number.cjs"; // G1 (#587): numbers without a source refuse first, so each submit answers them
import { e1Keys, sample } from "./g4_e1_key.ts";
import { passEveryAnswerKey } from "./lib/release-ready.ts";

const PORT = Number(process.argv[2] ?? 4440), DB = process.argv[3] ?? "xr_studio_screens_g2f";
const { call, sql } = client(PORT, DB);
const { ok, summary } = recorder();
const STUDIO = join(dirname(fileURLToPath(import.meta.url)), "..");
const AUTHOR = "user-A", EXPERT = "user-C", APPROVER = "user-B";

// The copy is another workspace: refused to run on the demo one (the check would prove nothing there).
const wsKey = sql(`select key from workspace limit 1`);
if (wsKey && wsKey !== "firm") { console.error(`STOP  this copy's workspace is "${wsKey}": start it with STUDIO_WORKSPACE_KEY=firm (see the usage line)`); process.exit(2); }
// The Visitor visa setup ends with a release, which this workspace refuses (that is the point): its own lines say so.
try { execFileSync(join(STUDIO, "node_modules", ".bin", "tsx"), ["--tsconfig", join(STUDIO, "api", "tsconfig.json"), join(STUDIO, "tests", "runtime", "setup_visitor_visa.ts"), String(PORT), DB], { stdio: "ignore" }); } catch { /* the release step fails here by design */ }
const vv = sql(`select id from combination where combination_key = 'vv.single'`);
if (!vv) { console.error("STOP  setup_visitor_visa.ts did not configure the Visitor visa"); process.exit(2); }
ok("C5.5 BR-3: the copy runs as the workspace \"firm\", not the demo", sql(`select key from workspace`) === "firm" && /not the demo/.test(sql(`select label from workspace`)));
ok("C5.5 BR-3 fail: the Visitor visa setup could not release here (no Demo release outside the demo workspace)", sql(`select count(*) from config_release where combination_id = '${vv}'`) === "0");

const view = async () => (await call("GET", `/combinations/${vv}`, undefined, AUTHOR)).body;
const tests = (v: { draft: { problems: { where: string; level: string; label?: string; message: string }[] } }) => v.draft.problems.filter((p) => p.where === "Tests");
let v = await view();
ok("C5.5 BR-3: the same Sample content is a real release here (not a Demo release)", v.draft.answer_keys.demo === false, v.draft.answer_keys);
const errs = tests(v).filter((p) => p.level === "error").map((p) => p.label);
ok("C5.5 Done when, BR-5 E7: both new maps with no test are errors, each named", errs.includes("IMM 5257 field map") && errs.includes("IMM 5707 field map"), tests(v));
await sourceEveryNumber(PORT, vv); let r = await call("POST", `/combinations/${vv}/submit`, {}, AUTHOR);
const named = (r.body?.errors ?? []).filter((x: { where: string }) => x.where === "Tests").map((x: { label: string }) => x.label);
ok("C5.5 Done when, BR-8: Submit is refused (400) and errors[] names IMM 5257 and IMM 5707", r.status === 400 && named.includes("IMM 5257 field map") && named.includes("IMM 5707 field map"), r.body?.errors);

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
const left = (r.body?.errors ?? []).filter((x: { where: string }) => x.where === "Tests").map((x: { label: string }) => x.label);
ok("C5.5 BR-4: signed and passing, IMM 5257 is no longer named; IMM 5707 still is", r.status === 400 && !left.includes("IMM 5257 field map") && left.includes("IMM 5707 field map"), left);

// IMM 5707 made ready by the shared helper (scaffolding), then the real release goes through and records both keys
const ready = await passEveryAnswerKey(call, vv, { author: AUTHOR, expert: EXPERT, familyKey: "release-helper-firm" });
ok("C5.5 helper (P-33): tests/lib/release-ready.ts gives IMM 5707 a signed, passing key through the API", ready.ready.includes("IMM 5707") && !ready.failed.length, ready);
await sourceEveryNumber(PORT, vv); r = await call("POST", `/combinations/${vv}/submit`, {}, AUTHOR);
const rest = (r.body?.errors ?? []).filter((x: { where: string }) => x.where === "Tests");
ok("C5.5 BR-4: with both maps signed and passing, no answer-key line refuses Submit", !rest.length, { status: r.status, tests: rest, other: (r.body?.errors ?? []).slice(0, 3) });
if (r.status === 201) {
  const sub = (await call("GET", `/combinations/${vv}/review`, undefined, AUTHOR)).body.submission;
  await call("POST", `/combinations/${vv}/signoff`, { items: (sub?.changeSummary ?? []).map((x: { kind: string; key: string }) => `${x.kind}|${x.key}`), action: "signed" }, EXPERT);
  r = await call("POST", `/combinations/${vv}/approve`, undefined, APPROVER);
  const summ = JSON.parse(sql(`select summary from config_release where combination_id = '${vv}' order by version desc limit 1`) || "{}");
  ok("C5.5 BR-9: the real release goes through and its summary names both signed keys", r.status === 201 && (summ.answer_keys ?? []).filter((x: { state: string; result: string }) => x.state === "SIGNED" && x.result === "passed").length === 2, r.body?.detail ?? summ.answer_keys);
} else ok("C5.5 BR-9: the real release goes through and its summary names both signed keys", false, r.body);

process.exit(summary() ? 1 : 0);
