// G2 (C5.5; concept product/screens/G2-answer-key-gate/concept.md v2, approved on #568; P-240; SA-1B-296 r3–r5, r8):
// the answer-key release gate. Part A, the pure engine (engine/answer-key-gate.ts) on the Visitor visa and With an LMIA
// drafts: one pass and one fail per rule and per cell of the levels table (BR-5). Part B, the API in the demo
// workspace: the Visitor visa (Sample) still releases as a Demo release, a failing key refuses it, the tests run at
// Submit and again at release, a key unsigned after Submit refuses the release, the release freezes the keys it rests
// on, and With an LMIA (real) is refused naming a new map with no test. The non-demo workspace is
// check_g2_answer_key_gate_firm.ts. The keys are hand-written (G4's E1 key), never copied from a run. US$0; no AI.
//   zsh studio/tools/isolated.sh screens_g2 4449 start && tsx studio/tests/check_g2_answer_key_gate.ts 4449 xr_studio_screens_g2
// (it releases the Visitor visa itself through tests/runtime/setup_visitor_visa.ts when the copy has none)
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { buildSnapshot, snapshotHash, type Snapshot } from "../engine/snapshot.ts";
import { checkExpected, checkFamily, fingerprintOf, inventoryHash, keyBoxes, type MapExpected } from "../engine/answer-keys.ts";
import type { Inventory } from "../engine/form-values.ts";
import { answerKeyGate, evidenceOf, testableItems, type GateItem, type GateKey } from "../engine/answer-key-gate.ts";
import { isDemoSnapshot, sampleContentProblems } from "../engine/validate.ts";
import { client, recorder } from "./runtime/api.ts";
import { sourceEveryNumber } from "./fixtures/source-every-number.cjs"; // G1 (#587): numbers without a source refuse first, so each submit answers them
import { e1Keys, P, sample } from "./g4_e1_key.ts";

const PORT = Number(process.argv[2] ?? 4449), DB = process.argv[3] ?? "xr_studio_screens_g2";
const { call, sql } = client(PORT, DB);
const { ok, summary } = recorder();
const STUDIO = join(dirname(fileURLToPath(import.meta.url)), "..");
const AUTHOR = "user-A", EXPERT = "user-C", APPROVER = "user-B";
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));
type Body = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- API bodies are read loosely, as in the other API checks

if (!sql(`select count(*) from combination where combination_key = 'vv.single'`).startsWith("1"))
  execFileSync(join(STUDIO, "node_modules", ".bin", "tsx"), ["--tsconfig", join(STUDIO, "api", "tsconfig.json"), join(STUDIO, "tests", "runtime", "setup_visitor_visa.ts"), String(PORT), DB], { stdio: "ignore" });
const vv = sql(`select id from combination where combination_key = 'vv.single'`), wp = sql(`select id from combination where combination_key = 'wp.family'`);
if (!vv || !wp) { console.error("STOP  the Visitor visa or With an LMIA is missing on this copy"); process.exit(2); }
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: `postgresql://xr_studio@127.0.0.1:54329/${DB}` }) } as never);
const ws = sql(`select workspace_id from combination where id = '${vv}'`);
const draftOf = async (id: string) => buildSnapshot(db as never, ws, id, "draft");
const releasedOf = (id: string) => JSON.parse(sql(`select snapshot from config_release where combination_id = '${id}' order by version desc limit 1`) || "null") as Snapshot | null;

// ------------------------------------------------------------------------------------------------ Part A: the engine
const { snapshot: s, sha256 } = await draftOf(vv);
const rel = releasedOf(vv)!;
const wpDraft = (await draftOf(wp)).snapshot;
const all = () => true;
const inv5257 = JSON.parse(readFileSync(join(STUDIO, "..", "..", (s.field_maps as { form_number: string; inventory_file: string }[]).find((x) => x.form_number === "IMM 5257")!.inventory_file), "utf8")) as Inventory;
const famE1 = checkFamily(sample, new Set((s.canonical_fields as { id: string }[]).map((f) => f.id)), new Set(["principal", "spouse_or_partner", "child"])).family;

// BR-1 what is tested
const items0 = testableItems(s, rel, all);
ok("C5.5 BR-1: the Visitor visa's testable items are its two PDF field maps (IMM 5257, IMM 5707), no eligibility rules", items0.length === 2 && items0.every((i) => i.item_kind === "field_map") && ["IMM 5257", "IMM 5707"].every((f) => items0.some((i) => i.item_ref === f)), items0.map((i) => i.item_ref));
const online = clone(s); (online.field_maps as { form_number: string; channel?: string }[]).find((m) => m.form_number === "IMM 5707")!.channel = "ONLINE";
ok("C5.5 BR-1 fail: an online map is not an item here (parked; concept §6b)", testableItems(online, rel, all).every((i) => i.item_ref !== "IMM 5707"));
const gates = clone(s); (gates as { eligibility: unknown }).eligibility = { gates: [{ key: "passport_valid", label: "Passport valid (Sample)", condition: { subjectKind: "PERSON", op: "exists", field: "person.passport_number" } }] };
ok("C5.5 BR-1: eligibility rules with gates are one item (the rule set)", testableItems(gates, rel, all).some((i) => i.item_kind === "rule_set" && i.item_ref === "eligibility" && i.changed));

// BR-2 new or changed since the last release
ok("C5.5 BR-2: with the draft as released, neither map is new or changed", items0.every((i) => !i.changed));
ok("C5.5 BR-2: with nothing released, every item is new", testableItems(s, null, all).every((i) => i.changed));
const { realBaseline } = await import("../api/src/answer-key-gate.ts");
const wpRel = releasedOf(wp)!;
ok("C5.5 BR-2 (reviewer m1): the baseline is the latest real release: a newer Demo release is passed over", realBaseline([{ snapshot: rel }, { snapshot: wpRel }]) === wpRel && isDemoSnapshot(rel) && !isDemoSnapshot(wpRel));
ok("C5.5 BR-2 fail (reviewer m1): with only Demo releases there is no baseline (every item is new to a real release)", realBaseline([{ snapshot: rel }]) === null);
// C5.5 M2 (Opus re-review of #568): outside the demo workspace the Sample content isDemoSnapshot reads holds a real
// release, each item named (the API asks for it there only; check_g2_answer_key_gate_firm.ts proves the wiring).
const sampleItems = sampleContentProblems(rel), relChecks = (rel.checks as { id: string; illustrative?: boolean }[]).filter((c) => c.illustrative);
ok("C5.5 M2 fail: the Visitor visa's Sample checks are listed as blocking, each by its key (never its Sample basis: breaker F1)",
  isDemoSnapshot(rel) && relChecks.length === 2 && sampleItems.length === relChecks.length && sampleItems.every((p) => p.level === "error" && p.gate === "sample-content" && p.where === "Checks") && relChecks.every((c) => sampleItems.some((p) => p.item === c.id)), sampleItems);
const wpSampled = clone(wpRel); (wpSampled.checks as { illustrative?: boolean }[]).push({ ...clone((wpRel.checks as object[])[0] ?? {}), id: "SC-test", message: "Sample check (test)", illustrative: true } as { illustrative?: boolean });
ok("C5.5 M2 pass: a source-backed draft with no Sample check lists nothing; one Sample check added lists exactly it", sampleContentProblems(wpRel).length === 0 && sampleContentProblems(wpSampled).length === 1 && sampleContentProblems(wpSampled)[0].item === "SC-test");
const moved = clone(s); const e = (moved.field_maps as { form_number: string; entries: { caption?: string | null }[] }[]).find((m) => m.form_number === "IMM 5707")!.entries[0]; e.caption = `${e.caption ?? ""} (moved)`;
const it2 = testableItems(moved, rel, all);
ok("C5.5 BR-2 fail: a changed IMM 5707 map entry makes IMM 5707 changed, and only it", it2.find((i) => i.item_ref === "IMM 5707")?.changed === true && it2.find((i) => i.item_ref === "IMM 5257")?.changed === false);
const edition = clone(s); (edition.field_maps as { form_number: string; form_edition: string }[]).find((m) => m.form_number === "IMM 5257")!.form_edition = "IMM 5257 (01-2027)";
ok("C5.5 BR-2 fail (SA-1B-296 r5): a new edition is a new item", testableItems(edition, rel, all).find((i) => i.item_ref === "IMM 5257")?.changed === true);
ok("C5.5 BR-5 (cannot be tested): a map with no form field list is marked so", testableItems(s, null, (f) => f !== "IMM 5707").find((i) => i.item_ref === "IMM 5707")?.testable === false);

// BR-4, BR-5: the levels table, one cell at a time
const item = (o: Partial<GateItem> = {}): GateItem => ({ item_kind: "field_map", item_ref: "IMM 5707", label: "IMM 5707 field map", edition: "IMM 5707 (01-2023)", form: "IMM 5707", changed: true, testable: true, ...o });
const key = (state: "DRAFT" | "SIGNED", run: "PASSED" | "FAILED" | "NOT_RUN", o: Partial<GateKey> = {}): GateKey => ({ key_id: `k-${state}-${run}-${Math.random()}`, item_kind: "field_map", item_ref: "IMM 5707", edition: "IMM 5707 (01-2023)", family: "E1 household (Sample)", state, version: 1, signed_by: state === "SIGNED" ? "Content reviewer" : null, signed_at: null, change_reason: null,
  run: { state: run, why: run === "NOT_RUN" ? "Not run since the combination changed." : "", passed: run === "FAILED" ? 40 : 50, failed: run === "FAILED" ? 2 : 0, first_failure: run === "FAILED" ? 'Family name (EXAMPLE MOTHER (Sample)): expected "EXAMPLE", got "OTHER".' : null, run_id: "r1" }, ...o });
const real = { demo: false, submitted: false }, demo = { demo: true, submitted: false };
const lv = (g: ReturnType<typeof answerKeyGate>) => g.problems.map((p) => `${p.level}:${p.message}`);
// Devin on #568: a snapshot carries every mapped PDF edition of a form (oldest first); each edition is its own item.
const twoEd = clone(s); { const maps = twoEd.field_maps as { form_number: string; form_edition: string; entries: unknown[] }[]; const old = maps.find((x) => x.form_number === "IMM 5257")!; maps.splice(maps.indexOf(old) + 1, 0, { ...clone(old), form_edition: "IMM 5257 (01-2027)" }); }
const itTwo = testableItems(twoEd, rel, all).filter((i) => i.item_ref === "IMM 5257");
ok("C5.5 BR-2 fail (Devin on #568): a second mapped edition added after the released one is its own item, new; the released edition stays unchanged", itTwo.length === 2 && itTwo.find((i) => i.edition === "IMM 5257 (01-2027)")?.changed === true && itTwo.find((i) => i.edition !== "IMM 5257 (01-2027)")?.changed === false, itTwo.map((i) => [i.edition, i.changed]));
const oldKey = key("SIGNED", "PASSED", { item_ref: "IMM 5257", edition: itTwo.find((i) => !i.changed)?.edition ?? null });
const gTwo = answerKeyGate(itTwo, [oldKey], real);
ok("C5.5 (round-2 review m1): the new edition's line names the key that exists for the old edition and why it does not count", gTwo.problems.some((p) => /A key for IMM 5257 \(09-2023\) does not count for IMM 5257 \(01-2027\)/.test(p.message)), gTwo.problems.map((p) => p.message));
ok("C5.5 BR-4 fail (SA-1B-296 r5): a signed passing key for the old edition does not pass the new edition (E7 names it)", gTwo.items.find((i) => i.edition === "IMM 5257 (01-2027)")?.result === "no_test" && gTwo.items.find((i) => i.edition !== "IMM 5257 (01-2027)")?.result === "passed" && gTwo.problems.some((p) => p.level === "error" && /no answer-key test/.test(p.message)), gTwo.items.map((i) => [i.edition, i.result]));
const kbNew = keyBoxes(twoEd, "IMM 5257", inv5257, "IMM 5257 (01-2027)"), kbNone = keyBoxes(twoEd, "IMM 5257", inv5257, "IMM 5257 (01-2099)");
ok("C5.5 (Devin on #568, 2nd pass): the Expected editor's boxes come from the edition asked for; an edition the combination lacks gives none", kbNew?.edition === "IMM 5257 (01-2027)" && kbNone === null);
const ex27 = checkExpected(twoEd, "field_map", "IMM 5257", famE1, { ...e1Keys("IMM 5257 (01-2027)").key }, inv5257);
ok("C5.5 (Devin on #568, 2nd pass): expected values for the new edition are checked against that edition and keep it", !ex27.errors.length && (ex27.expected as MapExpected).edition === "IMM 5257 (01-2027)", ex27.errors.slice(0, 2));
let g = answerKeyGate([item()], [], real);
ok("C5.5 BR-5 E7: a new map with no test on a real release is an error naming it, on Tests, with its form", g.problems.length === 1 && g.problems[0].level === "error" && g.problems[0].where === "Tests" && g.problems[0].label === "IMM 5707 field map" && /^no answer-key test\./.test(g.problems[0].message) && g.problems[0].forms[0] === "IMM 5707" && g.items[0].result === "no_test", lv(g));
g = answerKeyGate([item()], [], demo);
ok("C5.5 BR-5 E7 (Demo release): the same is only a warning", g.problems.length === 1 && g.problems[0].level === "warning" && /allowed only in a Demo release/.test(g.problems[0].message), lv(g));
g = answerKeyGate([item()], [key("SIGNED", "PASSED")], real);
ok("C5.5 BR-4: a signed key that passed on this draft passes the item (no line)", !g.problems.length && g.items[0].result === "passed", lv(g));
g = answerKeyGate([item()], [key("DRAFT", "PASSED")], real);
ok("C5.5 BR-5 fail: a passing key not signed by the expert refuses a real release", g.problems.length === 1 && g.problems[0].level === "error" && /is not signed\. The immigration expert signs it on Tests/.test(g.problems[0].message) && g.items[0].result === "unsigned", lv(g));
g = answerKeyGate([item()], [key("DRAFT", "PASSED")], demo);
ok("C5.5 BR-5 (Demo release): an unsigned passing key is a Sample warning", g.problems.length === 1 && g.problems[0].level === "warning" && /is Sample \(not signed/.test(g.problems[0].message), lv(g));
g = answerKeyGate([item()], [key("SIGNED", "FAILED")], demo);
ok("C5.5 BR-5 fail (Q3): a failing key refuses a Demo release too, naming the values and the first failure", g.problems.length === 1 && g.problems[0].level === "error" && /failed: 2 of 42 values\. Family name/.test(g.problems[0].message) && g.items[0].result === "failed", lv(g));
g = answerKeyGate([item()], [key("DRAFT", "FAILED", { run: { state: "FAILED", why: "", passed: 0, failed: 0, first_failure: null, run_id: "r0" } })], real);
ok("C5.5 BR-5 fail (breaker minor): a key that tests no value fails in words, never \"0 of 0 values\"", g.problems.some((p) => p.level === "error" && /failed: it tests no value\./.test(p.message)) && !g.problems.some((p) => /0 of 0/.test(p.message)), lv(g));
g = answerKeyGate([item()], [key("SIGNED", "PASSED"), key("DRAFT", "FAILED")], real);
ok("C5.5 BR-4 fail: every key must pass: one signed pass and one failing key refuse", g.problems.some((p) => p.level === "error" && /failed/.test(p.message)) && g.items[0].result === "failed", lv(g));
g = answerKeyGate([item()], [key("SIGNED", "PASSED"), key("DRAFT", "PASSED")], real);
ok("C5.5 BR-4: at least one signed key and every key passing passes the item", !g.problems.length && g.items[0].result === "passed", lv(g));
g = answerKeyGate([item()], [key("SIGNED", "NOT_RUN")], real);
ok("C5.5 BR-5: a key not run on this draft, before Submit, is a warning (it runs at Submit)", g.problems.length === 1 && g.problems[0].level === "warning" && /it runs at Submit/.test(g.problems[0].message), lv(g));
g = answerKeyGate([item()], [key("SIGNED", "NOT_RUN")], { demo: false, submitted: true });
ok("C5.5 BR-5 fail (challenge m3): once submitted, a key not run on this draft holds the release (error, run it on Tests)", g.problems.length === 1 && g.problems[0].level === "error" && /run it on Tests/.test(g.problems[0].message), lv(g));
g = answerKeyGate([item({ testable: false })], [], real);
ok("C5.5 BR-5 fail (challenge m6): a map with no form field list cannot be tested: an error on a real release, never a throw", g.problems[0]?.level === "error" && /cannot be tested/.test(g.problems[0].message) && g.items[0].result === "cannot_test", lv(g));
ok("C5.5 BR-5 (Demo release): cannot be tested is a warning", answerKeyGate([item({ testable: false })], [], demo).problems[0]?.level === "warning");
g = answerKeyGate([item({ changed: false })], [], real);
ok("C5.5 BR-2 (the revert path): an unchanged map with no test is not gated: one warning, released before the gate", g.problems.length === 1 && g.problems[0].level === "warning" && /released before the answer-key gate/.test(g.problems[0].message) && !g.items[0].gated, lv(g));
g = answerKeyGate([item({ changed: false })], [key("SIGNED", "FAILED")], real);
ok("C5.5 BR-2 fail: an unchanged map whose key exists is gated: its failing key refuses", g.items[0].gated && g.problems.some((p) => p.level === "error" && /failed/.test(p.message)), lv(g));
g = answerKeyGate([], [], real);
ok("C5.5 W7: a combination with no testable item and no key gets one row-level warning", g.problems.length === 1 && g.problems[0].level === "warning" && g.problems[0].message === "This combination has no answer-key test." && g.problems[0].item === "", lv(g));
ok("C5.5 W7 fail (challenge m1): no W7 line when an item line already says it", !answerKeyGate([item()], [], real).problems.some((p) => /This combination has no answer-key test/.test(p.message)));
const ev = evidenceOf(answerKeyGate([item(), item({ item_ref: "IMM 5257", label: "IMM 5257 field map", form: "IMM 5257", changed: false })], [key("SIGNED", "PASSED")], real).items);
ok("C5.5 BR-9: the evidence names each gated item and its key (version, state, signer, run); an ungated item is left out", ev.length === 1 && ev[0].item_ref === "IMM 5707" && ev[0].state === "SIGNED" && ev[0].run === "PASSED" && ev[0].signed_by === "Content reviewer" && ev[0].key_version === 1, ev);

// BR-3: the kind of release comes from the snapshot, never from key states
ok("C5.5 BR-3: the Visitor visa draft is Sample content (a Demo release in the demo workspace)", isDemoSnapshot(s));
ok("C5.5 BR-3 fail: With an LMIA's draft is not (a real release)", !isDemoSnapshot(wpDraft));
const sampled = clone(wpDraft); (sampled.checks as { illustrative?: boolean }[]).push({ illustrative: true } as never);
ok("C5.5 BR-3: a Sample check makes the draft Sample content (G3, from the snapshot)", isDemoSnapshot(sampled));

// BR-6 (challenge m5): the gate's fingerprints from the hashes it holds are the runner's
const m = (s.field_maps as { form_number: string; inventory_file: string }[]).find((x) => x.form_number === "IMM 5257")!;
const inv = JSON.parse(readFileSync(join(STUDIO, "..", "..", m.inventory_file), "utf8")) as Inventory;
ok("C5.5 BR-6: the draft's sha256 is its snapshot hash, so a stored run's inputs fingerprint matches without hashing again", snapshotHash(s) === sha256);
const fpA = fingerprintOf(s, "field_map", "IMM 5257", inv), fpB = fingerprintOf(s, "field_map", "IMM 5257", inv, { snapshot: sha256, inventory: inventoryHash(inv) });
ok("C5.5 BR-6: a fingerprint from known hashes equals the one worked out", fpA.item === fpB.item && fpA.inputs === fpB.inputs);
ok("C5.5 BR-6 fail: a different snapshot hash gives a different inputs fingerprint (never a stale Passed)", fingerprintOf(s, "field_map", "IMM 5257", inv, { snapshot: "0".repeat(64) }).inputs !== fpA.inputs);

// ------------------------------------------------------------------------------------------------ Part B: the API
const view = async (id: string) => (await call("GET", `/combinations/${id}`, undefined, AUTHOR)).body;
const tests = (v: { draft: { problems: { where: string; level: string; label?: string; message: string; forms: string[] }[] } }) => v.draft.problems.filter((p) => p.where === "Tests");
const runs = () => Number(sql(`select count(*) from answer_key_run where workspace_id = '${ws}'`));
const signAll = async (id: string) => {
  const sub = (await call("GET", `/combinations/${id}/review`, undefined, AUTHOR)).body.submission;
  const refs = (sub?.changeSummary ?? []).map((x: { kind: string; key: string }) => `${x.kind}|${x.key}`);
  return call("POST", `/combinations/${id}/signoff`, { items: refs, action: "signed" }, EXPERT);
};
let n = 0;
const touch = async (id: string, quoted = true) => call("POST", `/combinations/${id}/checks`, { appliesTo: "case.funds_available_cad", condition: { subjectKind: "CASE", op: "lt", field: "case.funds_available_cad", value: 10 + n++ }, message: `The money available looks too low (Sample check ${n}).`, ...(quoted ? { sourceQuote: "Sample quote for a gate test: the applicant must show enough money for the stay." } : {}) }, AUTHOR);

// The Visitor visa (Sample, Demo release) with no key: the maps are as released, so nothing is gated.
let r: Body = await touch(vv);
ok("C5.5 setup: a quoted check changes the Visitor visa draft (author)", r.status < 300, r.body);
const before = runs();
let v = await view(vv);
await call("GET", `/combinations/${vv}/review`, undefined, APPROVER); await call("GET", "/catalogue", undefined, AUTHOR); await call("GET", "/draft", undefined, APPROVER);
ok("C5.5 BR-6 (challenge m4): reading the combination, its review, the catalogue and the shared draft writes no run", runs() === before);
ok("C5.5 BR-3 API: the Visitor visa draft would be a Demo release; the gate judged it", v.draft.answer_keys.demo === true && v.draft.answer_keys.judged === true, v.draft.answer_keys);
ok("C5.5 BR-2 API (reviewer m1): the Visitor visa has only Demo releases, so its maps are new to a real release: two warnings on this Demo release, no error", tests(v).length === 2 && tests(v).every((p) => p.level === "warning" && /no answer-key test: allowed only in a Demo release/.test(p.message)), tests(v));

// A hand-written key (G4's E1 key) for IMM 5257: unsigned (Sample)
const edIMM5257 = (s.field_maps as { form_number: string; form_edition: string }[]).find((x) => x.form_number === "IMM 5257")!.form_edition;
const { key: e1 } = e1Keys(edIMM5257);
const fam = await call("POST", "/answer-keys/families", { ...sample, key: `g2-${Date.now().toString(36)}` }, AUTHOR);
const k = await call("POST", `/combinations/${vv}/answer-keys`, { family_id: fam.body.id, item_kind: "field_map", item_ref: "IMM 5257", expected: e1 }, EXPERT);
ok("C5.5 setup: the expert writes the E1 key for IMM 5257 (Draft, not run)", fam.status === 201 && k.status === 201 && k.body.run.state === "NOT_RUN", k.body?.detail ?? k.body?.run);
const kid: string = k.body.id;
v = await view(vv);
const l5257 = tests(v).filter((p) => p.label === "IMM 5257 field map");
ok("C5.5 BR-2 API: a map with a key is gated even unchanged; before Submit its key 'runs at Submit' and is Sample on a Demo release (warnings)", l5257.length === 2 && l5257.every((p) => p.level === "warning") && l5257.some((p) => /runs at Submit/.test(p.message)) && l5257.some((p) => /is Sample/.test(p.message)), l5257);
ok("C5.5 BR-9 API: the review block lists IMM 5257 with its family and IMM 5707 with no test", v.draft.answer_keys.items.find((i: { item_ref: string }) => i.item_ref === "IMM 5257")?.keys?.[0]?.family === sample.label && v.draft.answer_keys.items.find((i: { item_ref: string }) => i.item_ref === "IMM 5707")?.result === "no_test");

// Submit runs the tests (SA-1B-296 r3); a Demo release goes through with the unsigned passing key
const r0 = runs();
await sourceEveryNumber(PORT, vv); r = await call("POST", `/combinations/${vv}/submit`, { note: "G2 check: Demo release with an unsigned passing key" }, AUTHOR);
ok("C5.5 BR-6: Submit runs every key on the exact draft and stores the run (by the person submitting)", r.status === 201 && runs() === r0 + 1 && sql(`select ran_by || '|' || result from answer_key_run where key_id = '${kid}' order by ran_at desc limit 1`) === `${AUTHOR}|PASSED`, r.body?.detail ?? r.status);
ok("C5.5 BR-6: one audit line for the pass, never one per key", sql(`select count(*) from audit_event where workspace_id = '${ws}' and entity = 'answer-key tests' and action = 'ran' and actor = '${AUTHOR}'`) === "1" && /1 passed, 0 failed/.test(sql(`select summary from audit_event where entity = 'answer-key tests' and actor = '${AUTHOR}' order by at desc limit 1`)));
await signAll(vv);
const a0 = runs();
r = await call("POST", `/combinations/${vv}/approve`, undefined, APPROVER);
const sum1 = JSON.parse(sql(`select summary from config_release where combination_id = '${vv}' order by version desc limit 1`) || "{}");
ok("C5.5 Done when: the Visitor visa Demo release still goes through (an unsigned passing key; IMM 5707 untested as released)", r.status === 201 && runs() === a0 + 1, r.body?.detail ?? r.body);
const s5257 = (sum1.answer_keys ?? []).find((x: { item_ref: string }) => x.item_ref === "IMM 5257"), s5707 = (sum1.answer_keys ?? []).find((x: { item_ref: string }) => x.item_ref === "IMM 5707");
ok("C5.5 BR-9: the release's summary freezes the key it rests on (Draft, passed, its run) and names the item it released untested", Array.isArray(sum1.answer_keys) && sum1.answer_keys.length === 2 && s5257?.key_id === kid && s5257.state === "DRAFT" && s5257.run === "PASSED" && !!s5257.run_id && s5707?.result === "no_test" && !s5707.key_id, sum1.answer_keys);
// BR-6 (Devin on #568): in the release transaction the keys must be exactly those judged: one more, one fewer, or one
// at another version or state is refused.
const { keysUnchanged } = await import("../api/src/answer-key-gate.ts");
const judged = JSON.parse(sql(`select coalesce(json_agg(json_build_object('key_id', id::text, 'version', version, 'state', state)), '[]') from answer_key where combination_id = '${vv}'`)) as { key_id: string; version: number; state: string }[];
const inTx = (j: typeof judged) => db.$transaction((tx) => keysUnchanged(tx as never, vv, j));
ok("C5.5 BR-6: the keys as judged pass the in-transaction check", await inTx(judged));
ok("C5.5 BR-6 fail (Devin on #568): a key added after judging (the judged set is one short) is refused", !(await inTx([])) && judged.length === 1);
ok("C5.5 BR-6 fail: a key at another version or state than judged is refused", !(await inTx(judged.map((x) => ({ ...x, version: x.version + 1 })))) && !(await inTx(judged.map((x) => ({ ...x, state: x.state === "SIGNED" ? "DRAFT" : "SIGNED" })))));
ok("C5.5 BR-9: the release is a Demo release on the Releases list (G3)", (await call("GET", `/releases?combination=${vv}`, undefined, APPROVER)).body.find((x: { version: number }) => x.version === r.body.version)?.demo === true);

// Reviewer m2: Approve on a draft that is not submitted (the cheap refusal) runs no answer-key test.
await touch(vv);
const n0 = runs();
r = await call("POST", `/combinations/${vv}/approve`, undefined, APPROVER);
ok("C5.5 (reviewer m2): Approve on a draft not submitted is refused before any key runs", r.status === 409 && runs() === n0, { status: r.status, runs: runs() - n0, detail: r.body?.detail });

// A failing key refuses even a Demo release (Q3), naming the value
const wrong: MapExpected = clone(e1); const FN = `${P}Page1[0].PersonalDetails[0].Name[0].FamilyName[0]`; wrong.people.mother[FN] = "NOT-THE-NAME";
let cur = (await call("GET", `/answer-keys/${kid}`, undefined, AUTHOR)).body;
r = await call("PUT", `/answer-keys/${kid}`, { expected: wrong, version: cur.version }, EXPERT);
await touch(vv);
await sourceEveryNumber(PORT, vv); r = await call("POST", `/combinations/${vv}/submit`, {}, AUTHOR);
const bad = (r.body?.errors ?? []).find((x: { where: string }) => x.where === "Tests");
ok("C5.5 BR-5 fail (Q3), BR-8: a failing key refuses the Demo release's Submit (400), errors[] naming IMM 5257, the count and the value", r.status === 400 && /^Fix \d+ problem/.test(r.body.detail) && bad?.label === "IMM 5257 field map" && bad.forms?.[0] === "IMM 5257" && /failed: 1 of \d+ values\./.test(bad.message) && /expected "NOT-THE-NAME"/.test(bad.message), r.body);
ok("C5.5 BR-8: the refusal keeps its sentence in message too (older callers)", r.body?.message === r.body?.detail);

// Fixed and signed, submitted; then the key changes: the release is held and Approve re-runs and refuses (BR-6, BR-7)
cur = (await call("GET", `/answer-keys/${kid}`, undefined, AUTHOR)).body;
await call("PUT", `/answer-keys/${kid}`, { expected: e1, version: cur.version }, EXPERT);
cur = (await call("GET", `/answer-keys/${kid}`, undefined, AUTHOR)).body;
r = await call("POST", `/answer-keys/${kid}/sign`, { version: cur.version }, EXPERT);
ok("C5.5 setup: the expert puts the key right and signs it", r.status === 200 && r.body.state === "SIGNED", r.body?.detail);
await sourceEveryNumber(PORT, vv); r = await call("POST", `/combinations/${vv}/submit`, {}, AUTHOR);
ok("C5.5 BR-4: with the signed key passing, Submit is accepted", r.status === 201, r.body?.detail);
await signAll(vv);
cur = (await call("GET", `/answer-keys/${kid}`, undefined, AUTHOR)).body;
r = await call("PUT", `/answer-keys/${kid}`, { expected: wrong, version: cur.version, reason: "G2 check: a wrong family name after Submit" }, EXPERT);
ok("C5.5 setup: after Submit the signed key is changed (back to Draft)", r.status === 200 && r.body.state === "DRAFT", r.body?.detail);
v = await view(vv);
ok("C5.5 BR-5 fail (challenge m3): once submitted, the key not run on this draft is an error on Review", tests(v).some((p) => p.level === "error" && p.label === "IMM 5257 field map" && /run it on Tests/.test(p.message)), tests(v));
const shared = (await call("GET", "/draft", undefined, APPROVER)).body;
ok("C5.5 (reviewer m3): the held reason names the item by its label, never its bare form number", /^IMM 5257 field map: /.test(shared.rows.find((x: { combinationId: string }) => x.combinationId === vv)?.why ?? ""), shared.rows.find((x: { combinationId: string }) => x.combinationId === vv)?.why);
ok("C5.5 BR-5 (m3): the shared Release page holds the Visitor visa with the reason", shared.rows.find((x: { combinationId: string }) => x.combinationId === vv)?.held === true && /IMM 5257/.test(shared.rows.find((x: { combinationId: string }) => x.combinationId === vv)?.why ?? ""), shared.rows.find((x: { combinationId: string }) => x.combinationId === vv));
const a1 = runs();
r = await call("POST", `/combinations/${vv}/approve`, undefined, APPROVER);
const bad2 = (r.body?.errors ?? []).filter((x: { where: string }) => x.where === "Tests");
ok("C5.5 BR-6, BR-7, BR-8: Approve runs the tests again and refuses (409) naming the failing value in errors[]", r.status === 409 && runs() === a1 + 1 && /^Release refused: \d+ problem/.test(r.body.detail) && bad2.some((x: { message: string }) => /expected "NOT-THE-NAME"/.test(x.message)), r.body);
r = await call("POST", "/pack/release", { expectedChanges: shared.changes }, APPROVER);
ok("C5.5 BR-5 (m3), BR-8 (breaker M1): the shared release refuses too, and errors[] names the Visitor visa's failing IMM 5257 value", r.status === 409 && (r.body?.errors ?? []).some((x: { combination: string; where: string; message: string }) => x.combination === "Visitor visa" && x.where === "Tests" && /expected "NOT-THE-NAME"/.test(x.message)), { detail: r.body?.detail, errors: (r.body?.errors ?? []).slice(0, 3) });

// Put right and signed: the release goes through and records the signed key; a later change shows on Review (m7)
cur = (await call("GET", `/answer-keys/${kid}`, undefined, AUTHOR)).body;
await call("PUT", `/answer-keys/${kid}`, { expected: e1, version: cur.version }, EXPERT);
cur = (await call("GET", `/answer-keys/${kid}`, undefined, AUTHOR)).body;
await call("POST", `/answer-keys/${kid}/sign`, { version: cur.version }, EXPERT);
r = await call("POST", `/combinations/${vv}/approve`, undefined, APPROVER);
const sum2 = JSON.parse(sql(`select summary from config_release where combination_id = '${vv}' order by version desc limit 1`) || "{}");
ok("C5.5 BR-6, BR-9: signed and passing again, Approve releases; the summary names the signed key", r.status === 201 && sum2.answer_keys?.[0]?.state === "SIGNED" && sum2.answer_keys[0].signed_by === "Content reviewer" && sum2.answer_keys[0].result === "passed", r.body?.detail ?? sum2.answer_keys);
cur = (await call("GET", `/answer-keys/${kid}`, undefined, AUTHOR)).body;
const changed = clone(e1); changed.people.mother[FN] = e1.people.mother[FN]; // the same values, a new version only through a real change:
changed.people.mother[`${P}Page1[0].PersonalDetails[0].Name[0].GivenName[0]`] = "EXAMPLE-CHANGED";
await call("PUT", `/answer-keys/${kid}`, { expected: changed, version: cur.version, reason: "G2 check: the given name corrected" }, EXPERT);
await touch(vv);
v = (await call("GET", `/combinations/${vv}/review`, undefined, APPROVER)).body;
const ck = v.draft.answer_keys.items.find((i: { item_ref: string }) => i.item_ref === "IMM 5257")?.keys?.[0];
ok("C5.5 BR-9 (challenge m7): a key whose expected values changed since the last release says so, with the reason", ck?.changed_since_release?.reason === "G2 check: the given name corrected", ck);

// With an LMIA (a real release): a new map with no test is refused, naming it; the maps as released only warn
r = await call("POST", `/combinations/${wp}/lines`, { kind: "FORM", formKey: "IMM 5257" }, AUTHOR);
ok("C5.5 setup: the author adds IMM 5257 (a mapped form) to With an LMIA", r.status < 300, r.body?.detail ?? r.body);
v = await view(wp);
const e5257 = tests(v).find((p) => p.label === "IMM 5257 field map");
ok("C5.5 Done when, BR-5 E7: on With an LMIA (real) the new IMM 5257 map with no test is an error naming it", v.draft.answer_keys.demo === false && e5257?.level === "error" && /^no answer-key test\. Write a test family/.test(e5257.message) && e5257.forms[0] === "IMM 5257", tests(v));
ok("C5.5 BR-2: With an LMIA's unchanged untested maps only warn (released before the gate)", tests(v).filter((p) => /released before the answer-key gate/.test(p.message)).every((p) => p.level === "warning") && tests(v).some((p) => /released before/.test(p.message)), tests(v).map((p) => `${p.level} ${p.label}`));
await sourceEveryNumber(PORT, wp); r = await call("POST", `/combinations/${wp}/submit`, {}, AUTHOR);
ok("C5.5 Done when, BR-8: With an LMIA's Submit is refused (400) and errors[] names IMM 5257 field map", r.status === 400 && (r.body.errors ?? []).some((x: { where: string; label: string; message: string }) => x.where === "Tests" && x.label === "IMM 5257 field map" && /no answer-key test/.test(x.message)), { status: r.status, errors: (r.body?.errors ?? []).filter((x: { where: string }) => x.where === "Tests") });
r = await touch(wp, false);
v = await view(wp);
ok("C5.5 BR-3: a Sample check makes With an LMIA's draft a Demo release (from the snapshot); its untested map is then a warning", r.status < 300 && v.draft.answer_keys.demo === true && tests(v).find((p) => p.label === "IMM 5257 field map")?.level === "warning", tests(v).find((p) => p.label === "IMM 5257 field map"));

await db.$disconnect();
process.exit(summary() ? 1 : 0);
