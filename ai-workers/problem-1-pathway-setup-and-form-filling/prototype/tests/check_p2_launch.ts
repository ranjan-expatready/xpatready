// Tests the trusted P2 launch path end to end with a stub caller (P1 revision 4; answers P1R2-M2; section 8 answers R4-M1;
// section 9 answers R4-R2-M1): the
// launcher screens the template, starts p2/draft.ts under the Node permission model, the child checks its
// own isolation and the screened hashes, and uses the one experiment ledger at its fixed cap. No network,
// no key, no AI. Runs in a temporary copy of the solution folder, so the project's own experiment ledger
// and run records are not touched; every path below is the copy's own fixed path.
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, renameSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SpendLedger } from "../p2/ledger.ts";
import { EXPERIMENT_CAP_USD, PROTOTYPE, SOLUTION } from "../p2/policy.ts";
import { runDrafting, type Caller } from "../p2/runner.ts";

const results: [string, boolean][] = [];
const t = (name: string, pass: boolean) => results.push([name, pass]);

// --- A temporary copy: <tmp>/ai-workers/<solution>/{official-sources, prototype}; no key file in <tmp>/.tools.
const root = realpathSync(mkdtempSync(join(tmpdir(), "p2-launch-")));
const sol = join(root, "ai-workers", "problem-1-pathway-setup-and-form-filling");
const proto = join(sol, "prototype");
mkdirSync(join(proto, "p1"), { recursive: true });
cpSync(join(SOLUTION, "official-sources"), join(sol, "official-sources"), { recursive: true });
for (const d of ["contracts", "expected"]) cpSync(join(PROTOTYPE, d), join(proto, d), { recursive: true });
cpSync(join(PROTOTYPE, "p1", "inventory"), join(proto, "p1", "inventory"), { recursive: true });
for (const f of ["e5-family-values.json", "adobe-complete-1295-values.json"]) cpSync(join(PROTOTYPE, "p1", f), join(proto, "p1", f));
for (const f of ["package.json", "tsconfig.json"]) cpSync(join(PROTOTYPE, f), join(proto, f));
cpSync(join(PROTOTYPE, "p2"), join(proto, "p2"), { recursive: true, filter: (s) => !/\/p2\/(runs|ledger)(\/|$)/.test(s) });
symlinkSync(realpathSync(join(PROTOTYPE, "node_modules")), join(proto, "node_modules"));
const P2 = join(proto, "p2");
const LEDGER = join(P2, "ledger", "spend.jsonl");
const env: Record<string, string> = { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "" };
const launch = (job: string, mode: "--stub" | "--live") => {
  const r = spawnSync(process.execPath, [join(P2, "launch.ts"), "--job", job, mode], { encoding: "utf8", env });
  try { return { code: r.status, ...JSON.parse(r.stdout.trim().split("\n").pop() ?? "{}") }; } catch { return { code: r.status, refused: r.stderr.slice(0, 300) }; }
};
const ledgerLines = () => (existsSync(LEDGER) ? readFileSync(LEDGER, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
const job = JSON.parse(readFileSync(join(P2, "jobs", "c1-fieldmap-imm5707.json"), "utf8"));
const writeJob = (id: string, change: (j: any) => void) => { const j = structuredClone(job); j.job_id = id; change(j); writeFileSync(join(P2, "jobs", `${id}.json`), JSON.stringify(j)); };

// 1. The reviewer's executed case: maker text with a family value. Refused at screening, before any process starts.
writeFileSync(join(P2, "prompts", "leaky.v1.md"), readFileSync(join(P2, "prompts", job.template), "utf8") + "\nFor example: e.g. client.a@example.com\n");
writeJob("leaky", (j) => { j.template = "leaky.v1.md"; });
const leaky = launch("leaky", "--stub");
t("template carrying a family value is refused by the launcher (the reviewer's case)", leaky.code === 2 && /family values/.test(leaky.refused ?? ""));
t("... and no drafting process ran: the ledger has no line and no run record exists", ledgerLines().length === 0 && !existsSync(join(P2, "runs")));

// 2. Inputs and route are refused before any process starts.
writeJob("family-input", (j) => { j.inputs.push({ file: "prototype/p1/e5-family-values.json", sha256: "a".repeat(64) }); });
t("job listing the family values as an input is refused before the drafting process", /forbidden/.test(launch("family-input", "--stub").refused ?? "") && ledgerLines().length === 0);
writeJob("other-route", (j) => { j.settings.provider_route = "not-an-approved-route"; });
t("job naming another route is refused before the drafting process", /route/.test(launch("other-route", "--stub").refused ?? ""));

// 3. A live call before any stub pass is refused.
t("live call with no stub pass of this path is refused", /no stub pass/.test(launch("c1-fieldmap-imm5707", "--live").refused ?? ""));

// 4. The exact path with the stub caller.
const ok = launch("c1-fieldmap-imm5707", "--stub");
const env4 = ok.run_file ? JSON.parse(readFileSync(ok.run_file, "utf8")) : {};
const ev = env4.launch_evidence ?? {};
t("stub run through the launch path completes and its record meets the drafting-run contract", ok.code === 0 && env4.contract_valid === true);
t("the drafting process ran under the Node permission model as p2/draft.ts", ev.isolation?.permission_model === true && ev.isolation?.entry_is_draft_ts === true);
t("... could not read the answer key or family values, write outside the ledger, or start processes",
  ev.isolation?.forbidden_readable?.length === 0 && ev.isolation?.writable_outside_ledger?.length === 0 && ev.isolation?.child_process_allowed === false && ev.isolation?.worker_allowed === false);
t("the stub caller was invoked exactly once", ev.stub_calls === 1);
t(`the one experiment ledger at the fixed policy cap (US$${EXPERIMENT_CAP_USD}, AIW-D282) was used`, ev.ledger?.file === LEDGER && ev.ledger?.cap_usd === EXPERIMENT_CAP_USD);
const lines = ledgerLines();
// P-179 break B1, QA-90 §9: the stub never spends, so it reserves US$0 (before, the paid worst case, which blocked a Continue).
t("the attempt reserved before the call, at US$0 (a stub never spends), and settled at zero (stub)", lines.length === 2 && lines[0].type === "reserve" && lines[0].caller === "stub" && lines[0].worst_usd === 0 && lines[1].type === "settle" && lines[1].actual_usd === 0);
t("the record carries the screened template hash and the AIW-D260 label", ev.screened === true && ev.template_sha256?.length === 64 && /prototype-only exception/.test(env4.label ?? ""));
t("a stub pass bound to this exact path code is recorded", JSON.parse(readFileSync(join(P2, "runs", "stub-pass", "c1-fieldmap-imm5707.json"), "utf8")).path_code_sha256 === ev.path_code_sha256);

// 5. After the stub pass, a live call gets past the gate and stops at the missing key (no key in the copy).
t("live call after a stub pass stops at the missing key, before any process starts", /key file missing/.test(launch("c1-fieldmap-imm5707", "--live").refused ?? "") && ledgerLines().length === 2);
// ... and a changed launch path needs a new stub pass.
writeFileSync(join(P2, "prompt.ts"), readFileSync(join(P2, "prompt.ts"), "utf8") + "\n// changed\n");
t("changing the prompt builder invalidates the stub pass for live calls", /no stub pass/.test(launch("c1-fieldmap-imm5707", "--live").refused ?? ""));

// 6. The drafting process refuses to run outside the launcher's isolation, or on unscreened text.
const tpl = join(P2, "prompts", job.template), sch = join(P2, "prompts", job.output_schema);
const sha = (f: string) => spawnSync("shasum", ["-a", "256", f], { encoding: "utf8" }).stdout.slice(0, 64);
const childArgs = ["--job", "c1-fieldmap-imm5707", "--run-id", "direct-1", "--caller", "stub", "--template-sha", sha(tpl), "--schema-sha", sha(sch)];
const direct = spawnSync(process.execPath, [join(P2, "draft.ts"), ...childArgs], { encoding: "utf8", env });
t("draft.ts started without the permission model refuses", direct.status === 2 && /permission model is not active/.test(direct.stdout));
// The copy's own isolation arguments, computed by the copy's guard (its paths are fixed to its location).
writeFileSync(join(P2, "iso_args.ts"), `import { isolatedNodeArgs } from "./guard.ts"; import { LEDGER_DIR } from "./policy.ts"; console.log(JSON.stringify(isolatedNodeArgs(LEDGER_DIR)));`);
const isoArgs: string[] = JSON.parse(spawnSync(process.execPath, [join(P2, "iso_args.ts")], { encoding: "utf8", env }).stdout);
const iso = (extra: string[], args = childArgs) => spawnSync(process.execPath, [...isoArgs, ...extra, join(P2, "draft.ts"), ...args], { encoding: "utf8", env });
// R4-R2-M1: a direct start needs the single-use launch ticket for exactly that start. The copy's own issueTicket
// (the function launch() uses) writes it, from the copy's current screening sources, without the plain screen,
// so each case below tests the screen inside the drafting process.
writeFileSync(join(P2, "ticket_helper.ts"), `import { readFileSync } from "node:fs"; import { join } from "node:path"; import { canaryStrings } from "./guard.ts"; import { issueTicket } from "./launch.ts"; import { JOBS_DIR, PROMPTS_DIR } from "./policy.ts";
const [jobId, mode, runId] = process.argv.slice(2); const job = JSON.parse(readFileSync(join(JOBS_DIR, jobId + ".json"), "utf8"));
const r = issueTicket(canaryStrings(), job, mode as "stub" | "live", runId, readFileSync(join(PROMPTS_DIR, job.template)), readFileSync(join(PROMPTS_DIR, job.output_schema)));
console.log(JSON.stringify({ digest_sha256: r.digestSha, nonce: r.digest.ticket.nonce }));`);
const ticket = (jobId: string, mode: "stub" | "live", runId: string) => JSON.parse(spawnSync(process.execPath, [join(P2, "ticket_helper.ts"), jobId, mode, runId], { encoding: "utf8", env }).stdout.trim() || "{}");
const wide = iso([`--allow-fs-read=${join(proto, "expected")}`]);
t("draft.ts with read access to the answer key refuses", wide.status === 2 && /can read/.test(wide.stdout));
const badSha = iso([], childArgs.map((a) => (a === sha(tpl) ? "0".repeat(64) : a)));
t("draft.ts given a template hash other than the screened one refuses", badSha.status === 2 && /differs from the text the launcher screened/.test(badSha.stdout));
const before = ledgerLines().length;
ticket("c1-fieldmap-imm5707", "stub", "direct-1");
const good = iso([]);
t("draft.ts started with exactly the launcher's isolation runs (control)", good.status === 0 && ledgerLines().length === before + 2);

// 7. A paid caller cannot be used outside the isolated drafting process, whatever the caller supplies.
const paid = (async () => { throw new Error("must never be called"); }) as unknown as Caller; paid.kind = "paid";
let refusedPaid = "";
try { await runDrafting({ run_id: "x", inputs: job.inputs.length ? { official_files: job.inputs } : { official_files: [] }, settings: job.settings }, () => ({ system: "", user: "" }), paid, new SpendLedger(mkdtempSync(join(tmpdir(), "p2-l-")), 100)); } catch (e) { refusedPaid = (e as Error).message; }
t("a paid caller with an injected ledger in an ordinary process is refused", /not an isolated drafting process/.test(refusedPaid));
const probe = join(P2, "paid_probe.ts");
writeFileSync(probe, `import { sdkCaller } from "./runner.ts"; try { sdkCaller(); console.log("made"); } catch (e) { console.log((e as Error).message); }`);
const other = spawnSync(process.execPath, [...isoArgs, probe], { encoding: "utf8", env });
t("sdkCaller() in an isolated process whose entry is not p2/draft.ts is refused", /entry script is .*paid_probe\.ts/.test(other.stdout));

// 8. R4-M1 (Codex 05:23Z, reproduced 08:23Z): the drafting process started DIRECTLY, under the launcher's exact
// isolation, with the true hashes of unscreened text. The hash is identity, not evidence of screening; the
// drafting process must screen what it sends itself, and check the live stub gate itself.
const parse = (r: ReturnType<typeof iso>) => { try { return JSON.parse(r.stdout.trim().split("\n").pop() ?? "{}"); } catch { return {}; } };
const shaOf = (f: string) => sha(f);
const directArgs = (jobId: string, caller: "stub" | "live", runId: string) => {
  const j = JSON.parse(readFileSync(join(P2, "jobs", `${jobId}.json`), "utf8"));
  return ["--job", jobId, "--run-id", runId, "--caller", caller, "--template-sha", shaOf(join(P2, "prompts", j.template)), "--schema-sha", shaOf(join(P2, "prompts", j.output_schema))];
};
const l8 = ledgerLines().length;
// Each direct start below gets its own current ticket (R4-R2-M1), so what is tested is the screen inside the process.
const isoT = (jobId: string, caller: "stub" | "live", runId: string) => { ticket(jobId, caller, runId); return iso([], directArgs(jobId, caller, runId)); };
const leakyDirect = isoT("leaky", "stub", "direct-leaky");
const ld = parse(leakyDirect);
t("R4-M1 exact case: draft.ts started directly with the matching hashes of the family-email template is refused",
  leakyDirect.status === 2 && ld.ok === false && ld.refused === true && /client\.a@example\.com.*family values.*inside the drafting process/.test(ld.error ?? ""));
t("... before any request or call: no ledger line, no stub call, nothing written", ledgerLines().length === l8 && ld.stub_calls === undefined);
// The same bypass with an answer-key box path in the output schema.
const keyPath = JSON.parse(readFileSync(join(proto, "expected", "slice-1-field-map.json"), "utf8")).instances[0].entries[0].data_path;
const schemaObj = JSON.parse(readFileSync(join(P2, "prompts", job.output_schema), "utf8")); schemaObj.description = `Map ${keyPath} first.`;
writeFileSync(join(P2, "prompts", "leaky-schema.v1.schema.json"), JSON.stringify(schemaObj));
writeJob("leaky-schema", (j) => { j.output_schema = "leaky-schema.v1.schema.json"; });
const lsd = parse(isoT("leaky-schema", "stub", "direct-leaky-schema"));
t("draft.ts started directly with an output schema naming an answer-key box is refused", lsd.ok === false && lsd.refused === true && /schema .*answer key/.test(lsd.error ?? "") && ledgerLines().length === l8);
// The same bypass with an earlier AI draft (AIW-D263 input) that carries a family value: an otherwise valid
// stub draft whose output gains the family email, its recorded output hash updated so the guard admits it.
const parent = JSON.parse(readFileSync(ok.run_file, "utf8"));
const out8 = JSON.parse(parent.raw_output);
const firstString = (o: any): boolean => { for (const k of Object.keys(o)) { if (typeof o[k] === "string") { o[k] += " client.a@example.com"; return true; } if (o[k] && typeof o[k] === "object" && firstString(o[k])) return true; } return false; };
firstString(out8);
parent.raw_output = JSON.stringify(out8);
parent.launch_evidence.output_sha256 = createHash("sha256").update(parent.raw_output).digest("hex");
const leakyDraftFile = join(P2, "runs", "leaky-parent-stub.json");
writeFileSync(leakyDraftFile, JSON.stringify(parent));
const reqJob = JSON.parse(readFileSync(join(P2, "jobs", "c1-requirements.json"), "utf8"));
writeFileSync(join(P2, "jobs", "leaky-chain.json"), JSON.stringify({ ...reqJob, job_id: "leaky-chain",
  inputs: [...reqJob.inputs.filter((f: any) => f.file.startsWith("prototype/p1/")), { file: "prototype/p2/runs/leaky-parent-stub.json", sha256: createHash("sha256").update(readFileSync(leakyDraftFile)).digest("hex") }] }));
t("a reused AI draft carrying a family value is refused by the launcher", /draft prototype\/p2\/runs\/leaky-parent-stub\.json contains "client\.a@example\.com"/.test(launch("leaky-chain", "--stub").refused ?? ""));
const lcd = parse(isoT("leaky-chain", "stub", "direct-leaky-chain"));
t("... and by the drafting process when started directly (screened inside it)", lcd.ok === false && /leaky-parent-stub\.json contains "client\.a@example\.com".*inside the drafting process/.test(lcd.error ?? "") && ledgerLines().length === l8);
// The live gate inside the drafting process: the prompt builder changed in step 5, so no stub pass matches.
const liveDirect = parse(isoT("c1-fieldmap-imm5707", "live", "direct-live"));
t("draft.ts started directly for a live call without a stub pass of this exact path is refused inside it", liveDirect.ok === false && /no stub pass .*inside the drafting process/.test(liveDirect.error ?? "") && ledgerLines().length === l8);
// No digest, or an empty one: refuse rather than screen against nothing.
const DIG = join(P2, "screening", "canary-digest.json");
ticket("c1-fieldmap-imm5707", "stub", "direct-emptydigest");
const RUNDIG = join(P2, "screening", "tickets", "direct-emptydigest.json"); // the drafting process reads its own run's ticket
const digestBytes = readFileSync(RUNDIG);
renameSync(DIG, DIG + ".away");
const noDig = parse(iso([], directArgs("c1-fieldmap-imm5707", "stub", "direct-nodigest")));
t("draft.ts with no screening digest refuses", noDig.ok === false && /no screening digest/.test(noDig.error ?? ""));
const emptyDig = JSON.parse(digestBytes.toString("utf8")); emptyDig.family_values = { lengths: [], prefixes: [], hashes: [], count: 0 };
writeFileSync(RUNDIG, JSON.stringify(emptyDig));
const eDig = parse(iso([], directArgs("c1-fieldmap-imm5707", "stub", "direct-emptydigest")));
t("draft.ts with an emptied digest refuses rather than screening against nothing", eDig.ok === false && /no family_values/.test(eDig.error ?? "") && ledgerLines().length === l8);
renameSync(DIG + ".away", DIG);
// Clean controls: the same direct start on clean text, and the launcher path, both still run and record the screen.
const cleanTicket = ticket("c1-fieldmap-imm5707", "stub", "direct-clean");
const cleanDirect = iso([], directArgs("c1-fieldmap-imm5707", "stub", "direct-clean"));
const cd = parse(cleanDirect);
t("clean control: draft.ts started directly on clean text with its own ticket runs, screened inside the process, one stub call",
  cleanDirect.status === 0 && cd.ok === true && cd.stub_calls === 1 && cd.screening?.request_screened === true && cd.screening?.digest_sha256 === cleanTicket.digest_sha256 && cd.screening?.ticket_nonce === cleanTicket.nonce && ledgerLines().length === l8 + 2);
const clean2 = launch("c1-fieldmap-imm5707", "--stub");
const env8 = clean2.run_file ? JSON.parse(readFileSync(clean2.run_file, "utf8")) : {};
const scr = env8.launch_evidence?.screening ?? {};
t("clean control: the launcher path completes and its record carries the in-process screening evidence",
  clean2.code === 0 && env8.contract_valid === true && scr.request_screened === true && scr.items_screened === 2 && scr.digest_sha256?.length === 64 && scr.digest_sources?.length === 4 && scr.ticket_nonce?.length === 32);
t("... the digest the launcher writes holds salted hashes only: no family value or box path in plain text",
  (() => { const d = readFileSync(DIG, "utf8"); return !d.includes("client.a@example.com") && !d.includes(keyPath); })());

// 8b. F1 slice 2: each launch writes and reads its own ticket, so two launches at the same moment both run (the parts of
// one form, or two forms in the queue); before, the second launch overwrote the first one's ticket ("another start").
{
  const start = () => new Promise<{ code: number | null; out: string }>((res) => { const p = spawn(process.execPath, [join(P2, "launch.ts"), "--job", "c1-fieldmap-imm5707", "--stub"], { env }); let out = ""; p.stdout.on("data", (d) => (out += d)); p.on("close", (code) => res({ code, out })); });
  const both = await Promise.all([start(), start(), start()]);
  const recs = both.map((x) => { try { return JSON.parse(x.out.trim().split("\n").pop() ?? "{}"); } catch { return {}; } });
  // The experiment ledger itself admits one runner at a time and refuses the others ("ledger locked", before any call);
  // what must never happen is a launch refused for another launch's ticket.
  const passed = recs.filter((r) => r.exit === 0), locked = recs.filter((r) => /ledger locked/i.test(String(r.refused ?? "")));
  t("three launches of the same job at the same moment: none is refused for another launch's ticket; each that runs has its own run", passed.length >= 1 && passed.length + locked.length === 3 && !recs.some((r) => /launch ticket|screening digest/.test(String(r.refused ?? ""))) && new Set(passed.map((r) => r.run_file)).size === passed.length);
  ticket("c1-fieldmap-imm5707", "stub", "direct-own-ticket"); // writes the shared file too
  const noOwn = parse(iso([], directArgs("c1-fieldmap-imm5707", "stub", "direct-without-ticket")));
  t("a drafting process never takes the shared digest in place of its own run's ticket", noOwn.ok === false && /no screening digest/.test(noOwn.error ?? ""));
}

// 9. R4-R2-M1 (Codex 15:36Z): current screening and launch eligibility on every supported entry.
// (a) The reviewer's exact sequence: a clean template passes; then its example email is added to the family
// values; the launcher refuses it; the unchanged draft.ts started directly with the matching hashes and the
// digest left by the earlier launch must refuse too (before R4-R2-M1 it ran: exit 0, one stub call).
const fresh = "reviewer.pending@example.invalid";
writeFileSync(join(P2, "prompts", "stale.v1.md"), readFileSync(join(P2, "prompts", job.template), "utf8") + "\nExample: " + fresh + "\n");
writeJob("stale", (j) => { j.template = "stale.v1.md"; });
const staleClean = launch("stale", "--stub");
t("R4-R2-M1 clean control: the template is clean before the source change and runs through the launcher", staleClean.code === 0);
const FAM = join(proto, "p1", "e5-family-values.json");
const famOriginal = readFileSync(FAM, "utf8");
const fam = JSON.parse(famOriginal); (fam.values ?? fam.forms).reviewer_added_email = fresh; writeFileSync(FAM, JSON.stringify(fam));
t("after the email is added to the family values the launcher refuses the template", /stale\.v1\.md contains "reviewer\.pending@example\.invalid"/.test(launch("stale", "--stub").refused ?? ""));
const l9 = ledgerLines().length;
const leftover = parse(iso([], directArgs("stale", "stub", "reviewer-stale")));
// Since F1 slice 2 a run reads only its own ticket, so the digest an earlier launch left is never even read.
t("R4-R2-M1 exact case: draft.ts started directly with matching hashes and the digest an earlier launch left is refused",
  leftover.ok === false && leftover.refused === true && /launch ticket|no screening digest/.test(leftover.error ?? "") && leftover.stub_calls === undefined && ledgerLines().length === l9);
const reuse = parse(iso([], directArgs("c1-fieldmap-imm5707", "stub", (env8.drafting_run?.run_id as string) ?? "x")));
// Since F1 slice 2 the launcher also removes a run's ticket file after the run, so a reused run id finds none.
t("... and so is a direct start that reuses the run id of a ticket the launcher already used", reuse.ok === false && /launch ticket (already used|is for another start)|no screening digest/.test(reuse.error ?? ""));
// (b) With a ticket that is current for this start, the screen inside the process sees the new family value.
const freshTicketStale = parse(isoT("stale", "stub", "direct-stale-current"));
t("with a current ticket, draft.ts started directly refuses the template: the new family value is screened inside the process",
  freshTicketStale.ok === false && /reviewer\.pending@example\.invalid.*inside the drafting process/.test(freshTicketStale.error ?? "") && ledgerLines().length === l9);
// (c) A ticket is single-use, bound to its start, and short-lived.
ticket("c1-fieldmap-imm5707", "stub", "direct-once");
const once1 = parse(iso([], directArgs("c1-fieldmap-imm5707", "stub", "direct-once")));
const once2 = parse(iso([], directArgs("c1-fieldmap-imm5707", "stub", "direct-once")));
t("a ticket runs once (clean control) and its second use is refused", once1.ok === true && once2.ok === false && /already used/.test(once2.error ?? ""));
const TK = (run: string) => join(P2, "screening", "tickets", `${run}.json`);
ticket("c1-fieldmap-imm5707", "stub", "direct-for-a");
writeFileSync(TK("direct-for-b"), readFileSync(TK("direct-for-a"))); // a's ticket put where b's would be
t("a ticket issued for another run id is refused", /another start \(run_id differs\)/.test(parse(iso([], directArgs("c1-fieldmap-imm5707", "stub", "direct-for-b"))).error ?? ""));
ticket("c1-fieldmap-imm5707", "stub", "direct-mode");
t("a stub ticket cannot start a live call", /another start \(mode differs\)/.test(parse(iso([], directArgs("c1-fieldmap-imm5707", "live", "direct-mode"))).error ?? ""));
ticket("c1-fieldmap-imm5707", "stub", "direct-old");
const oldD = JSON.parse(readFileSync(TK("direct-old"), "utf8")); oldD.ticket.issued_at = new Date(Date.now() - 600_000).toISOString(); oldD.ticket.expires_at = new Date(Date.now() - 480_000).toISOString(); writeFileSync(TK("direct-old"), JSON.stringify(oldD));
t("a ticket past its two-minute lifetime is refused", /expired/.test(parse(iso([], directArgs("c1-fieldmap-imm5707", "stub", "direct-old"))).error ?? ""));
const noTicket = JSON.parse(readFileSync(TK("direct-old"), "utf8")); delete noTicket.ticket; writeFileSync(TK("direct-old"), JSON.stringify(noTicket));
t("a digest without a ticket is refused", /no launch ticket/.test(parse(iso([], directArgs("c1-fieldmap-imm5707", "stub", "direct-old"))).error ?? "") && ledgerLines().length === l9 + 2);
// (d) The live gate follows the screening sources: the stub pass made before the change no longer opens it.
writeFileSync(join(P2, "gate_helper.ts"), `import { readFileSync } from "node:fs"; import { join } from "node:path"; import { canaryStrings } from "./guard.ts"; import { hasStubPass } from "./pathcode.ts"; import { JOBS_DIR } from "./policy.ts";
console.log(JSON.stringify(hasStubPass(JSON.parse(readFileSync(join(JOBS_DIR, process.argv[2] + ".json"), "utf8")), canaryStrings().sources)));`);
const gateNow = (id: string) => JSON.parse(spawnSync(process.execPath, [join(P2, "gate_helper.ts"), id], { encoding: "utf8", env }).stdout.trim() || "{}");
const g1 = gateNow("c1-fieldmap-imm5707");
t("the stub gate is closed once the screening sources change (it stayed open before R4-R2-M1)", g1.ok === false && g1.sources_current === false);
t("the launcher refuses a live call: the stub pass predates the current screening sources", /against the current screening sources/.test(launch("c1-fieldmap-imm5707", "--live").refused ?? ""));
const liveStale = parse(isoT("c1-fieldmap-imm5707", "live", "direct-live-stale"));
t("draft.ts started directly for a live call with a current ticket refuses inside it for the same reason", liveStale.ok === false && /against the current screening sources.*inside the drafting process/.test(liveStale.error ?? "") && ledgerLines().length === l9 + 2);
// (e) The active v2 answer key: its new DateOfMarriage path is screened on both entries.
const v2path = "form1[0].Page1[0].MaritalStatus[0].SectionA[0].DateOfMarriage[0]";
writeFileSync(join(P2, "prompts", "v2key.v1.md"), readFileSync(join(P2, "prompts", job.template), "utf8") + "\nMap this known answer-key input: " + v2path + "\n");
writeJob("v2key", (j) => { j.template = "v2key.v1.md"; });
t("a template naming the v2 key's DateOfMarriage path is refused by the launcher", /v2key\.v1\.md contains "form1\[0\]\.Page1\[0\]\.MaritalStatus\[0\]\.SectionA\[0\]\.DateOfMarriage\[0\]"/.test(launch("v2key", "--stub").refused ?? ""));
const v2d = parse(isoT("v2key", "stub", "direct-v2key"));
t("... and by draft.ts started directly with a current ticket", v2d.ok === false && /DateOfMarriage.*answer key.*inside the drafting process/.test(v2d.error ?? "") && ledgerLines().length === l9 + 2);
// (f) Clean controls after the change: a fresh stub pass reopens the gate; a clean direct start runs.
const reStub = launch("c1-fieldmap-imm5707", "--stub");
const reEnv = reStub.run_file ? JSON.parse(readFileSync(reStub.run_file, "utf8")) : {};
const pass9 = JSON.parse(readFileSync(join(P2, "runs", "stub-pass", "c1-fieldmap-imm5707.json"), "utf8"));
t("clean control: a new stub pass records the current screening sources (4 files, the changed family file's new hash)",
  reStub.code === 0 && pass9.screening_sources?.length === 4 && pass9.screening_sources.find((x: any) => x.file.endsWith("e5-family-values.json"))?.sha256 === createHash("sha256").update(readFileSync(FAM)).digest("hex") && reEnv.launch_evidence?.screening?.digest_sources?.length === 4);
t("... and the live gate opens again: the live call stops only at the missing key", gateNow("c1-fieldmap-imm5707").ok === true && /key file missing/.test(launch("c1-fieldmap-imm5707", "--live").refused ?? ""));
const clean9 = parse(isoT("c1-fieldmap-imm5707", "stub", "direct-clean-after"));
t("clean control: draft.ts started directly on clean text with a current ticket runs after the change", clean9.ok === true && clean9.stub_calls === 1 && clean9.screening?.digest_sources?.length === 4);
writeFileSync(FAM, famOriginal);
t("restoring the family values closes the gate again until a new stub pass (sources must match exactly)", gateNow("c1-fieldmap-imm5707").ok === false);

// 10. QA-90 (8): with P2_LEDGER_DIR set, the launcher and the drafting process use that one shared folder, never the copy's own.
const shared = join(root, "shared-ledger"), copyBefore = ledgerLines().length;
const launchShared = (dir: string) => {
  const r = spawnSync(process.execPath, [join(P2, "launch.ts"), "--job", "c1-fieldmap-imm5707", "--stub"], { encoding: "utf8", env: { ...env, P2_LEDGER_DIR: dir } });
  try { return { code: r.status, ...JSON.parse(r.stdout.trim().split("\n").pop() ?? "{}") }; } catch { return { code: r.status, refused: r.stderr.slice(0, 300) }; }
};
const sh = launchShared(shared);
const shEv = sh.run_file ? JSON.parse(readFileSync(sh.run_file, "utf8")).launch_evidence ?? {} : {};
const shLines = existsSync(join(shared, "spend.jsonl")) ? readFileSync(join(shared, "spend.jsonl"), "utf8").split("\n").filter(Boolean) : [];
t("C11.8 QA-90 pass: with P2_LEDGER_DIR set, the drafting process reserves and settles in the shared ledger (2 lines there, its used ticket too)",
  sh.code === 0 && shEv.ledger?.file === join(shared, "spend.jsonl") && shLines.length === 2 && existsSync(join(shared, "used-launch-tickets")) && readdirSync(join(shared, "used-launch-tickets")).length === 1);
t("C11.8 QA-90 fail: ... and writes nothing to the copy's own ledger", ledgerLines().length === copyBefore);
t("C11.8 QA-90 fail: a relative P2_LEDGER_DIR is refused before any process starts", launchShared("shared-ledger").code !== 0 && ledgerLines().length === copyBefore && shLines.length === 2);

// 11. P-179: an override id and run key reach the drafting process's reservation; anything but plain words is refused.
const launchArgs = (extra: string[]) => {
  const r = spawnSync(process.execPath, [join(P2, "launch.ts"), "--job", "c1-fieldmap-imm5707", "--stub", ...extra], { encoding: "utf8", env });
  try { return { code: r.status, ...JSON.parse(r.stdout.trim().split("\n").pop() ?? "{}") }; } catch { return { code: r.status, refused: r.stderr.slice(0, 300) }; }
};
const l11 = ledgerLines().length;
const ov = launchArgs(["--override-id", "override-1-abc", "--run-key", "field_map:LIVE:source:x"]);
t("C11.8 P-179 pass: the launcher passes --override-id and --run-key to the drafting process, whose reservation names the override",
  ov.code === 0 && ledgerLines().length === l11 + 2 && ledgerLines()[l11]?.override_id === "override-1-abc");
t("C11.8 P-179 fail: an override id that is not a plain word, or one without its run key, is refused before any process starts",
  /plain words/.test(launchArgs(["--override-id", "x --live", "--run-key", "k"]).refused ?? "") && /go together/.test(launchArgs(["--override-id", "override-1"]).refused ?? "") && ledgerLines().length === l11 + 2);

for (const [n, p] of results) console.log(`${p ? "PASS" : "FAIL"}  ${n}`);
const failed = results.filter(([, p]) => !p).length;
if (failed) console.log(JSON.stringify({ wide: wide.stdout + wide.stderr.slice(0, 300), badSha: badSha.stdout, good: good.stdout.slice(0, 300) + good.stderr.slice(0, 300), other: other.stdout + other.stderr.slice(0, 300) }));
console.log(`${results.length - failed}/${results.length} passed  (copy: ${root}; run files: ${existsSync(join(P2, "runs")) ? readdirSync(join(P2, "runs")).length : 0})`);
process.exit(failed ? 1 : 0);
