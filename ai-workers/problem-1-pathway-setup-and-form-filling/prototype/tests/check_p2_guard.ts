// P2 runner guard tests (AIW-D260, AIW-D261, D254 aside). No AI call: the caller is a stub that records
// how often it was invoked. The ledger used here is a temporary one, never the experiment ledger.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { admitInput, admitRun, answerKeyFiles, assertRoute, canaryStrings, isolatedNodeArgs, PolicyRefusal, screenMakerText } from "../p2/guard.ts";
import { buildDigest, findForbidden } from "../p2/screen.ts";
import { BudgetExceeded, SpendLedger } from "../p2/ledger.ts";
import { OFFICIAL, PROTOTYPE, ROUTE_ID, SOLUTION } from "../p2/policy.ts";
import { runDrafting, type Caller } from "../p2/runner.ts";

const results: [string, boolean][] = [];
const t = (name: string, pass: boolean) => results.push([name, pass]);
const refused = (f: () => unknown, why?: string) => { try { f(); return false; } catch (e) { return e instanceof PolicyRefusal && (!why || e.message.includes(why)); } };
const P = (rel: string) => `prototype/${rel}`;

// 1. Inputs: hash-checked allowlist, resolved before checking.
const form = admitInput("official-sources/ircc/forms/imm5707e.pdf");
t("official form admitted with its manifest hash", form.kind === "official" && form.sha256 === "6e59d35048ef3995e1d4583f08c38a710a351e23b1cc0fbfe517d82f38cb20ef");
t("P1 inventory of an official form admitted", admitInput(P("p1/inventory/imm1295e.inventory.json")).kind === "inventory");
t("answer key refused", refused(() => admitInput(P("expected/slice-1-field-map.json")), "forbidden"));
t("answer-key source text refused", refused(() => admitInput(P("expected/source-text/imm5707e.xfa-template.txt")), "forbidden"));
t("family values refused", refused(() => admitInput(P("p1/e5-family-values.json")), "forbidden"));
t("Adobe test values refused", refused(() => admitInput(P("p1/adobe-complete-1295-values.json")), "forbidden"));
t("'..' path into the answer key refused", refused(() => admitInput("official-sources/ircc/forms/../../../prototype/expected/slice-1-field-map.json"), "forbidden"));
t("file outside the allowlist refused (contract code)", refused(() => admitInput(P("contracts/rules.ts")), "allowlist"));
t("inventory summary file refused (not a form inventory)", refused(() => admitInput(P("p1/inventory/summary.json")), "allowlist"));
const tmp = mkdtempSync(join(tmpdir(), "p2-guard-"));
symlinkSync(join(OFFICIAL, "forms", "imm5707e.pdf"), join(tmp, "link.pdf"));
t("symlink to an official form refused", refused(() => admitInput(join(tmp, "link.pdf")), "link"));
t("official form with a different run-record hash refused", refused(() => admitInput("official-sources/ircc/forms/imm5707e.pdf", "0".repeat(64)), "differs"));

// 2. Route: only the AIW-D261 route, approved model, capped budget.
const fixture = JSON.parse(readFileSync(join(PROTOTYPE, "contracts/fixtures/drafting-run.valid.json"), "utf8"));
const S = fixture.settings;
t("the recorded AIW-D261 route is accepted", (() => { assertRoute(S); return S.provider_route === ROUTE_ID; })());
t("another route refused", refused(() => assertRoute({ ...S, provider_route: "not-an-approved-route" }), "route"));
t("another model refused", refused(() => assertRoute({ ...S, model: "claude-sonnet-5-5" }), "model"));
t("per-run budget above US$5 refused", refused(() => assertRoute({ ...S, budget_usd: 6 }), "budget"));
t("more than 2 attempts refused", refused(() => assertRoute({ ...S, max_attempts: 3 }), "max_attempts"));
process.env.ANTHROPIC_BASE_URL = "https://proxy.example.com";
t("base URL redirected by environment refused", refused(() => assertRoute(S), "ANTHROPIC_BASE_URL"));
delete process.env.ANTHROPIC_BASE_URL;
// The reviewer's executed case: the schema accepted a family file plus an unapproved route; the runner does not.
const bad = structuredClone(fixture); bad.settings.provider_route = "not-an-approved-route";
bad.inputs.official_files.push({ file: P("p1/e5-family-values.json"), sha256: "a".repeat(64) });
t("run record with a family file and an unapproved route refused by the runner", refused(() => admitRun(bad)));
const famOnly = structuredClone(fixture); famOnly.inputs.official_files.push({ file: P("p1/e5-family-values.json"), sha256: "a".repeat(64) });
t("run record with a family file refused even on the right route", refused(() => admitRun(famOnly), "forbidden"));
t("valid fixture run admitted (route and hash-checked input)", admitRun(fixture).length === 1);

// 3. Maker-written prompt text: no answer-key box path, no family value.
const keyPath = JSON.parse(readFileSync(join(PROTOTYPE, "expected/slice-1-field-map.json"), "utf8")).instances[0].entries[0].data_path;
t("prompt template naming an answer-key box refused", refused(() => screenMakerText([{ name: "template", text: `Map ${keyPath} to the family name.` }]), "answer key"));
t("prompt template containing a family value refused", refused(() => screenMakerText([{ name: "template", text: "e.g. client.a@example.com" }]), "family"));
const inv5707 = readFileSync(join(PROTOTYPE, "p1/inventory/imm5707e.inventory.json"), "utf8");
t("an AI draft repeating a heading printed on its own official form (MOTHER) passes (D16)", (() => { screenMakerText([{ name: "draft", text: "heading YOUR PARENT 1 (MOTHER OR FATHER)" }], { familyValuesOnly: true, publicText: inv5707 }); return true; })());
t("the same word in maker-written text is still refused (no public-text exemption)", refused(() => screenMakerText([{ name: "template", text: "MOTHER" }]), "family"));
t("an AI draft carrying a family value absent from its form is refused (D16)", refused(() => screenMakerText([{ name: "draft", text: "e.g. client.a@example.com" }], { familyValuesOnly: true, publicText: inv5707 }), "family"));
t("clean prompt template passes", (() => { screenMakerText([{ name: "template", text: "Map each box in the inventory to a case fact or return unresolved with a reason." }]); return true; })());

// 4. Spend: every attempt reserves its worst case before the call; retries count; the cap stops calls.
let calls = 0;
const failing: Caller = async () => { calls++; throw new Error("simulated provider error"); };
const ok: Caller = async () => { calls++; return { text: "{}", usage: { input_tokens: 1000, output_tokens: 1000 } }; };
const build = () => ({ system: "s", user: "u" });
const run = (id: string, max_attempts = 2) => ({ run_id: id, inputs: fixture.inputs, settings: { ...S, max_output_tokens: 16000, max_attempts } });
// Worst case per attempt: (about 2,024 input tokens x $4 + 16,000 output x $20) / 1e6 = about US$0.328; cap US$0.90 allows two.
const ledger = new SpendLedger(mkdtempSync(join(tmpdir(), "p2-ledger-")), 0.9);
const r1 = await runDrafting(run("run-1"), build, failing, ledger);
t("failed attempts and the retry are both charged at worst case", r1.status === "provider_error" && r1.attempts.length === 2 && Math.abs(ledger.committed() - 2 * r1.attempts[0].worst_usd) < 1e-9);
const before = calls;
const r2 = await runDrafting(run("run-2"), build, ok, ledger);
t("third attempt across runs refused before the call when the experiment cap would be passed", r2.status === "budget_exceeded" && calls === before && r2.attempts[0].outcome === "refused_before_call");
const rejected: Caller = async () => { calls++; throw Object.assign(new Error("400 invalid_request_error: compiled grammar is too large"), { status: 400 }); };
const c0 = calls;
const r400 = await runDrafting(run("run-400"), build, rejected, new SpendLedger(mkdtempSync(join(tmpdir(), "p2-ledger-")), 40));
t("a request the API rejects as invalid (400) is not retried (D17)", r400.status === "provider_error" && r400.attempts.length === 1 && calls === c0 + 1);
const busy: Caller = async () => { calls++; throw Object.assign(new Error("429 rate limited"), { status: 429 }); };
const r429 = await runDrafting(run("run-429"), build, busy, new SpendLedger(mkdtempSync(join(tmpdir(), "p2-ledger-")), 40));
t("a rate-limited request (429) is retried within max_attempts", r429.attempts.length === 2);
const roomy = new SpendLedger(mkdtempSync(join(tmpdir(), "p2-ledger-")), 40);
const r3 = await runDrafting(run("run-3"), build, ok, roomy);
t("a successful attempt settles at its reported usage", r3.status === "completed" && Math.abs(roomy.committed() - (1000 * 4 + 1000 * 20) / 1e6) < 1e-9);
t("drafted output carries the AIW-D260 label", r3.label.startsWith("AI-drafted under a prototype-only exception"));
const runCap = new SpendLedger(mkdtempSync(join(tmpdir(), "p2-ledger-")), 40);
const id = runCap.reserve("run-4", 1, 4.9, 5);
t("an unsettled reservation (crash) stays counted at worst case", runCap.committed("run-4") === 4.9 && !!id);
t("per-run cap refuses an attempt that would pass US$5", (() => { try { runCap.reserve("run-4", 2, 0.2, 5); return false; } catch (e) { return e instanceof BudgetExceeded; } })());
const locked = new SpendLedger(mkdtempSync(join(tmpdir(), "p2-ledger-")), 40);
let second = "";
await locked.withLock(async () => { await locked.withLock(async () => 0).catch((e) => { second = e.message; }); });
t("a second runner is refused while the ledger is locked", second.includes("locked"));

// 5. Isolation: the drafting process cannot read the answer key or the family values (Node permission model).
const ledgerDir = mkdtempSync(join(tmpdir(), "p2-iso-"));
const targets = {
  official: join(OFFICIAL, "forms", "imm5707e.pdf"),
  inventory: join(PROTOTYPE, "p1/inventory/imm1295e.inventory.json"),
  key: join(PROTOTYPE, "expected/slice-1-field-map.json"),
  family: join(PROTOTYPE, "p1/e5-family-values.json"),
  adobe: join(PROTOTYPE, "p1/adobe-complete-1295-values.json"),
  decisions: join(SOLUTION, "..", "decisions.md"),
};
const probe = spawnSync(process.execPath, [...isolatedNodeArgs(ledgerDir), join(PROTOTYPE, "p2/isolation_probe.ts"), ...Object.values(targets)], { encoding: "utf8" });
const seen = (() => { try { return JSON.parse(probe.stdout.trim().split("\n").pop() ?? "{}"); } catch { return {}; } })();
t("isolated process reads the official form", seen[targets.official] === "read");
t("isolated process reads the inventory", seen[targets.inventory] === "read");
t("isolated process cannot read the answer key", seen[targets.key] === "ERR_ACCESS_DENIED");
t("isolated process cannot read the family values", seen[targets.family] === "ERR_ACCESS_DENIED" && seen[targets.adobe] === "ERR_ACCESS_DENIED");
t("isolated process cannot read other project records", seen[targets.decisions] === "ERR_ACCESS_DENIED");
const load = spawnSync(process.execPath, [...isolatedNodeArgs(ledgerDir), "--input-type=module", "-e",
  `const r = await import(${JSON.stringify(join(PROTOTYPE, "p2/runner.ts"))}); console.log(typeof r.runDrafting + "," + typeof r.sdkCaller)`], { encoding: "utf8" });
t("isolated process can still load the runner and the SDK", load.stdout.trim().endsWith("function,function"));

// 9. R4-M1: the drafting process's hashed screen (screen.ts) finds exactly what the launcher's plain screen finds.
{
  const c = canaryStrings();
  const d = buildDigest(c, { run_id: "guard-test", job_id: "guard-test", mode: "stub", template_sha256: "0".repeat(64), schema_sha256: "0".repeat(64) });
  const plainFinds = (text: string, familyValuesOnly = false, publicText?: string) => { try { screenMakerText([{ name: "x", text }], { familyValuesOnly, publicText }); return null; } catch (e) { return (e as Error).message; } };
  let agree = 0, total = 0;
  const filler = "Map each box to a case fact or return unresolved with a reason. ";
  for (const s of [...c.box_paths, ...c.family_values]) {
    for (const fam of [false, true]) {
      total++;
      const text = filler + s + filler;
      const hashed = findForbidden(d, text, fam);
      const plain = plainFinds(text, fam);
      // Both refuse or both pass (where one forbidden string contains another, each may name a different one).
      if ((hashed === null) === (plain === null)) agree++;
    }
  }
  t(`hashed screen agrees with the plain screen on every forbidden string, both modes (${c.box_paths.length} box paths, ${c.family_values.length} family values)`, agree === total && total > 0);
  t("hashed screen passes clean text", findForbidden(d, filler.repeat(50)) === null && plainFinds(filler.repeat(50)) === null);
  t("hashed screen honours the public-text exemption like the plain screen (D16: MOTHER on its own form)",
    findForbidden(d, "heading YOUR PARENT 1 (MOTHER OR FATHER)", true, inv5707) === plainFinds("heading YOUR PARENT 1 (MOTHER OR FATHER)", true, inv5707));
  t("hashed screen refuses a family value absent from the form's public text", findForbidden(d, "e.g. client.a@example.com", true, inv5707) === "client.a@example.com");
  t("the digest contains no forbidden string in plain text", (() => { const j = JSON.stringify(d); return [...c.box_paths, ...c.family_values].every((s) => !j.includes(s)); })());
}

// 10. R4-R2-M1 (Codex 15:36Z): every answer-key version is a screening source, found rather than listed.
{
  const c = canaryStrings();
  const v2Only = "form1[0].Page1[0].MaritalStatus[0].SectionA[0].DateOfMarriage[0]";
  t("screening sources are every answer-key version plus the family values, each with its hash",
    JSON.stringify(answerKeyFiles()) === JSON.stringify(["expected/slice-1-field-map.json", "expected/slice-1-field-map.v2.json"])
    && c.sources.map((x) => x.file).join(",") === "prototype/expected/slice-1-field-map.json,prototype/expected/slice-1-field-map.v2.json,prototype/p1/e5-family-values.json,prototype/p1/adobe-complete-1295-values.json"
    && c.sources.every((x) => /^[0-9a-f]{64}$/.test(x.sha256)));
  t("the v2 key's new DateOfMarriage path is screened (the reviewer's active-key case)", c.box_paths.includes(v2Only)
    && (() => { try { screenMakerText([{ name: "template", text: "Map " + v2Only }]); return false; } catch (e) { return /answer key/.test((e as Error).message); } })());
  t("... and the hashed screen finds it too", findForbidden(buildDigest(c, { run_id: "g", job_id: "g", mode: "stub", template_sha256: "0".repeat(64), schema_sha256: "0".repeat(64) }), "Map " + v2Only) === v2Only);
}

for (const [n, p] of results) console.log(`${p ? "PASS" : "FAIL"}  ${n}`);
const failed = results.filter(([, p]) => !p).length;
console.log(`${results.length - failed}/${results.length} passed`);
if (failed && probe.stderr) console.log(probe.stderr.slice(0, 500));
process.exit(failed ? 1 : 0);
