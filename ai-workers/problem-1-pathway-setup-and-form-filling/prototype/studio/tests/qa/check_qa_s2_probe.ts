// qa lane, /qa capability (F1 slice 2 drafting): independent API probes of the screen_map job, A4 drafting in parts
// and A4 reuse, with what a real author or a hostile input does that the builders' suite (tests/check_forms_slice2.ts)
// does not: every refusal is RFC 9457 Problem Details in plain words; the wrong person on each endpoint; malformed
// bodies; five starts at once; a stale confirmed worst case and a stale plan; a cancel mid-run and what follows it
// (cancel again, retry, draft again); a server restart while a screen_map job runs; reuse when the earlier edition's
// codes or kind of box differ; and the Lead's open finding D3 (a new screen-map start while a completed draft's
// proposals are undecided pays again). US$0: STUB and saved-run replay only. A LIVE request is only ever sent with no
// or a deliberately wrong confirmWorstUsd, so it is refused before anything runs; the spend ledger is compared
// before and after. An accepted AI proposal here is hand-written (said so in its check). Its own isolated copy.
//   tsx studio/tests/qa/check_qa_s2_probe.ts [port=4472]
// (starts and stops `isolated.sh qa_s2 <port> start STUDIO_PART_PAUSE_MS=3000`; the pause lets a cancel land mid-run)
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, openSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { factKeyProblem } from "../../../contracts/fact-key.ts";
import { screenMapProposals } from "../../engine/twin.ts";

const PORT = Number(process.argv[2] ?? 4472), NAME = "qa_s2", DB = `xr_studio_${NAME}`;
const STUDIO = join(import.meta.dirname, "..", ".."), PROTOTYPE = join(STUDIO, ".."), SOLUTION = join(PROTOTYPE, "..");
const FIX = join(STUDIO, "tests", "fixtures", "portal"), SCRATCH = join(STUDIO, "var", `isolated-${NAME}`, "qa-probe");
const SETTINGS = ["STUDIO_PART_PAUSE_MS=3000"];
let pass = 0, fail = 0;
const note = (name: string, detail?: unknown) => console.log(`NOTE  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`);
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
type Res = { status: number; body: any; ctype: string };
const call = async (method: string, path: string, body?: unknown, actor: string | null = "user-A"): Promise<Res> => {
  const headers: Record<string, string> = { "content-type": "application/json" }; if (actor) headers["x-actor"] = actor;
  const init = { method, headers, body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body) };
  // sent again once when a kept-alive connection was closed before any reply (after the restart probe)
  const r = await fetch(`http://localhost:${PORT}/api${path}`, init).catch((e) => { if (!/EPIPE|ECONNRESET|UND_ERR_SOCKET/.test(e?.cause?.code ?? "")) throw e; return fetch(`http://localhost:${PORT}/api${path}`, init); });
  const t = await r.text(); let j: any = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j, ctype: r.headers.get("content-type") ?? "" };
};
const upload = async (path: string, names: string[]) => {
  const fd = new FormData(); for (const n of names) fd.append("files", new Blob([new Uint8Array(readFileSync(join(FIX, n)))]), n);
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method: "POST", headers: { "x-actor": "user-A" }, body: fd }); return r.json();
};
const sql = (q: string) => execFileSync("/usr/local/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
/** start: isolated.sh (fresh database). restart and stop kill only the process LISTENING on the port: isolated.sh kills
 *  every process with a connection to the port, which includes this check's own kept-alive connection. */
const listener = () => { try { return execFileSync("lsof", ["-ti", `tcp:${PORT}`, "-sTCP:LISTEN"], { encoding: "utf8" }).trim().split("\n").filter(Boolean).map(Number); } catch { return []; } };
const killServer = () => { for (const pid of listener()) try { process.kill(pid); } catch { /* gone */ } for (let i = 0; i < 40 && listener().length; i++) execFileSync("sleep", ["0.25"]); };
const iso = (action: string) => {
  if (action === "start") return execFileSync("zsh", [join(STUDIO, "tools", "isolated.sh"), NAME, String(PORT), "start", ...SETTINGS], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  killServer(); if (action === "stop") return "";
  const ROOT = join(SOLUTION, "..", ".."), VARDIR = join(STUDIO, "var", `isolated-${NAME}`);
  const env = { ...process.env, PATH: `${join(ROOT, ".tools", "node-v24.21.0", "bin")}:${process.env.PATH}`, DATABASE_URL: `postgresql://xr_studio@127.0.0.1:54329/${DB}`, STUDIO_PORT: String(PORT), STUDIO_VAR: VARDIR, ...Object.fromEntries(SETTINGS.map((x) => x.split("="))) };
  const out = openSync(join(VARDIR, "api.log"), "a");
  spawn(join(STUDIO, "node_modules", ".bin", "tsx"), ["--tsconfig", "api/tsconfig.json", "api/src/main.ts"], { cwd: STUDIO, env, detached: true, stdio: ["ignore", out, out] }).unref();
  for (let i = 0; i < 120; i++) { try { execFileSync("curl", ["-s", "-o", "/dev/null", `localhost:${PORT}/api/session`]); return "restarted"; } catch { execFileSync("sleep", ["0.5"]); } }
  throw new Error("the copy did not restart");
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const until = async (fn: () => Promise<boolean>, ms = 300_000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return true; await sleep(1000); } return false; };
const finished = async (id: string) => { let j: any = null; await until(async () => { j = (await call("GET", `/jobs/${id}`)).body; return !["QUEUED", "RUNNING"].includes(j?.status); }); return j; };
/** RFC 9457 shape, and words a person can read: no stack, server path, database call or validator jargon. */
const JARGON = /\/home\/|\/Users\/|node_modules|prisma|Invalid `|TypeError|Cannot read|undefined|\bnull\b|NaN|\[object|expected \w+, received|Invalid input|Too small|Too big/i;
const problem = (r: Res, status: number) => r.status === status && r.ctype.includes("application/problem+json") && typeof r.body?.type === "string" && !!r.body?.title && r.body?.status === status && typeof r.body?.detail === "string" && r.body.detail.length > 10 && !JARGON.test(r.body.detail);
const said = (r: Res) => ({ status: r.status, detail: typeof r.body === "object" ? r.body?.detail : String(r.body).slice(0, 120) });
const ledger = () => { const lines = readFileSync(join(PROTOTYPE, "p2", "ledger", "spend.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  return { paid_usd: Math.round(lines.filter((l) => l.type === "settle").reduce((a, l) => a + (Number(l.actual_usd) || 0), 0) * 1e6) / 1e6, non_stub_reserves: lines.filter((l) => l.type === "reserve" && l.caller !== "stub").length }; };

(async () => {
  const before = ledger(); console.log(`ledger before: ${JSON.stringify(before)}`);
  iso("start"); mkdirSync(SCRATCH, { recursive: true });
  ok("setup: sample inputs load", (await call("POST", "/demo/load")).status < 300);
  const comb = (k: string) => sql(`select id from combination where combination_key='${k}'`);
  const vv = comb("vv.single"), sv = comb("sv.super_visa"), fs = comb("fs.outside");
  const att = (c: string, f: string) => sql(`select id from source_attachment where combination_id='${c}' and file_name='${f}'`);
  const smJobs = () => Number(sql("select count(*) from drafting_job where kind='screen_map'"));

  // ─────────────────────────────── A4 draft: malformed, double launch, cancel mid-run and what follows
  const vvAtt = att(vv, "imm5257e.pdf"), svAtt = att(sv, "imm5257e.pdf");
  for (const who of ["user-B", "user-C"]) { const x = await call("POST", `/attachments/${vvAtt}/draft`, { mode: "stub" }, who); ok(`roles: ${who} cannot start an A4 draft of a form (403)`, problem(x, 403), said(x)); }
  let r = await call("POST", `/attachments/${vvAtt}/draft`, {});
  ok("A4 malformed: a draft request with no mode → 400 in plain words (not a server error)", problem(r, 400), said(r));
  r = await call("POST", `/attachments/${vvAtt}/draft`, { mode: "bogus" });
  ok("A4 malformed: an unknown mode → 400 naming the choices", problem(r, 400) && /live, replay or stub/.test(r.body.detail), said(r));
  r = await call("POST", "/attachments/not-an-id/draft", { mode: "stub" });
  ok("A4 malformed: an attachment id that is not an id → 404 plain", problem(r, 404), said(r));
  const four = await Promise.all([1, 2, 3, 4].map(() => call("POST", `/attachments/${vvAtt}/draft`, { mode: "stub" })));
  const a4Jobs = Number(sql(`select count(*) from drafting_job where attachment_id='${vvAtt}' and kind='field_map'`));
  ok("A4 double launch: four stub drafts of one form at once make one step; the rest are 409 in plain words", four.filter((x) => x.status === 201).length === 1 && a4Jobs === 1 && four.filter((x) => x.status !== 201).every((x) => problem(x, 409)), { statuses: four.map((x) => x.status), jobs: a4Jobs, refused: four.find((x) => x.status !== 201)?.body?.detail });
  const vvJob = four.find((x) => x.status === 201)!.body;
  const batchOf = (id: string) => sql(`select batch_id from drafting_job where id='${id}'`);
  await until(async () => ((await call("GET", `/jobs/${vvJob.id}`)).body.detail?.a4?.parts ?? []).some((p: { status: string }) => p.status !== "queued"), 120_000);
  r = await call("POST", `/ai/batches/${batchOf(vvJob.id)}/cancel`, {}, "user-C");
  ok("A4 cancel: the reviewer cannot cancel the author's drafting (403)", problem(r, 403), said(r));
  const c1 = await call("POST", `/ai/batches/${batchOf(vvJob.id)}/cancel`, {});
  const c2 = await call("POST", `/ai/batches/${batchOf(vvJob.id)}/cancel`, {});
  const stopped = await finished(vvJob.id);
  ok("A4 cancel mid-run: a cancel, then a second cancel at once, end in one CANCELLED step with the parts not sent", c1.status === 201 && c2.status < 500 && stopped.status === "CANCELLED" && (stopped.detail?.a4?.parts ?? []).some((p: { status: string }) => p.status === "not started"), { c1: c1.status, c2: said(c2), status: stopped.status, message: stopped.message?.slice(0, 140) });
  r = await call("POST", `/ai/batches/${batchOf(vvJob.id)}/cancel`, {});
  ok("A4 cancel: cancelling finished work → 409 plain", problem(r, 409), said(r));
  r = await call("POST", `/attachments/${vvAtt}/draft`, { mode: "stub" });
  ok("A4 after a cancel: a new draft of the same form starts at once (the cancelled step does not block it)", r.status === 201, said(r));
  const vv2 = r.body; await call("POST", `/ai/batches/${batchOf(vv2.id)}/cancel`, {});
  const vv2done = await finished(vv2.id);
  ok("A4 cancel before any part started (within the pause): CANCELLED, every part 'not started', US$0", vv2done.status === "CANCELLED" && (vv2done.detail?.a4?.parts ?? []).every((p: { status: string }) => p.status === "not started" || p.status === "queued") && (vv2done.costUsd ?? 0) === 0, { status: vv2done.status, parts: vv2done.detail?.a4?.parts?.map((p: { status: string }) => p.status), message: vv2done.message?.slice(0, 120) });
  // After the new draft is settled (Lead note 24 Oct 21:10: a retry first would make the new draft meet it, 409, correctly).
  r = await call("POST", `/ai/batches/${batchOf(vvJob.id)}/retry`, {});
  ok("A4 retry after a mid-run cancel (QA-32): the parts not sent can be retried, or the refusal says to draft again (on 12e7207 the retry runs)", r.status < 300 || /draft (it )?again|not sent/i.test(r.body?.detail ?? ""), said(r));

  // ─────────────────────────────── A4 reuse: an earlier edition from the saved real answer (replay, US$0), then stale plans
  // The retry above starts a new step (stub, US$0): a replay of the same form waits for it (409 "already queued or running").
  for (let k = 0; k < 60; k++) { r = await call("POST", `/attachments/${vvAtt}/draft`, { mode: "replay" }); if (r.status !== 409) break; await new Promise((res) => setTimeout(res, 1000)); }
  ok("A4 after the retried step finishes, a replay of the same form starts", r.status === 201, said(r));
  const rep = await finished(r.body.id);
  await call("POST", `/jobs/${rep.id}/accept-clean`, { outcome: "REUSE" }); await call("POST", `/jobs/${rep.id}/accept-clean`, { outcome: "NEW" });
  for (const i of (await call("GET", `/jobs/${rep.id}`)).body.items.filter((x: { decision: string }) => x.decision === "PENDING")) await call("POST", `/jobs/${rep.id}/items/${i.id}`, { decision: "ACCEPTED" });
  r = await call("POST", `/jobs/${rep.id}/apply`, {}, "user-C");
  ok("roles: the reviewer cannot apply a drafted field map (author duty, 403)", problem(r, 403), said(r));
  r = await call("POST", `/jobs/${rep.id}/apply`, {});
  ok("setup: IMM 5257's field map from the saved real answer is in the library (replay, US$0)", r.status === 201, said(r));
  // (the replay above put IMM 5257 into the Visitor visa, so the screen_map job can be drafted for it)
  // ─────────────────────────────── screen_map setup: an approved online version, code-drafted map accepted
  const cap = (await call("POST", "/captures", { portal: "ircc_portal", form: "IMM 5257", title: "Visitor visa (Sample)" })).body;
  await upload(`/captures/${cap.id}/screens`, ["imm5257-online-s1-personal.html", "imm5257-online-s2-marital.html", "imm5257-online-s3-language.html"]);
  await call("POST", `/captures/${cap.id}/finish`);
  const ed = (await call("POST", `/captures/${cap.id}/approve`, undefined, "user-C")).body.edition.id as string;
  await call("POST", `/online-versions/${ed}/screen-map/draft`); await call("POST", `/online-versions/${ed}/screen-map/accept`, {}, "user-C");
  const open = () => sql(`select string_agg(data_path, ',' order by data_path) from (select distinct on (data_path) data_path, outcome from form_field_map where form_edition_id='${ed}' order by data_path, version desc) x where outcome='unresolved'`).split(",").filter(Boolean);
  ok("setup: the online version has inputs left open for the screen_map job", open().length >= 3, open().length);
  const SM = `/online-versions/${ed}/screen-map/ai`;

  // ─────────────────────────────── wrong person on each endpoint (Problem Details, plain words, nothing created)
  for (const who of ["user-B", "user-C", "user-O", "user-P"]) { const r = await call("POST", SM, { combinationId: vv, mode: "STUB" }, who); ok(`roles: ${who} cannot start a screen-map draft (403 Problem Details, plain words)`, problem(r, 403), said(r)); }
  r = await call("POST", SM, { combinationId: vv, mode: "STUB" }, null);
  ok("roles: no person named → 401 Problem Details, nothing started", problem(r, 401) && smJobs() === 0, said(r));
  r = await call("POST", SM, { combinationId: vv, mode: "STUB" }, "user-Z");
  ok("roles: an unknown person → 401", problem(r, 401), said(r));
  for (const who of ["user-O", "user-P"]) { r = await call("POST", `${SM}/accept`, { jobId: "00000000-0000-4000-8000-000000000000" }, who); ok(`roles: ${who} (runtime person) cannot accept AI proposals (403)`, problem(r, 403), said(r)); }

  // ─────────────────────────────── malformed bodies and ids on the screen_map start
  const bad: [string, unknown, number, RegExp][] = [
    ["an empty body", {}, 400, /Name the combination/],
    ["a combination that is not an id", { combinationId: "vv.single", mode: "STUB" }, 400, /Name the combination/],
    ["mode in lower case", { combinationId: vv, mode: "stub" }, 400, /Choose STUB or LIVE/],
    ["a worst case sent as text", { combinationId: vv, mode: "LIVE", confirmWorstUsd: "0.50" }, 400, /./],
    ["a negative worst case", { combinationId: vv, mode: "LIVE", confirmWorstUsd: -1 }, 400, /./],
    ["a JSON array instead of an object", "[]", 400, /./],
  ];
  for (const [what, body, st, words] of bad) { r = await call("POST", SM, body); ok(`malformed: ${what} → ${st}, Problem Details in plain words`, problem(r, st) && words.test(r.body.detail), said(r)); }
  r = await call("POST", "/online-versions/not-an-id/screen-map/ai", { combinationId: vv, mode: "STUB" });
  ok("malformed: an online version id that is not an id → 404 plain", problem(r, 404), said(r));
  r = await call("POST", SM, { combinationId: "00000000-0000-4000-8000-000000000000", mode: "STUB" });
  ok("malformed: a combination that does not exist → 404 plain", problem(r, 404), said(r));
  r = await call("POST", SM, { combinationId: fs, mode: "STUB" });
  ok("malformed: a combination that does not file IMM 5257 → 404 naming both", problem(r, 404) && /IMM 5257/.test(r.body.detail), said(r));
  ok("malformed: none of these created a job", smJobs() === 0, smJobs());

  // ─────────────────────────────── five starts at the same moment, and a LIVE start mixed in
  const five = await Promise.all([1, 2, 3, 4, 5].map(() => call("POST", SM, { combinationId: vv, mode: "STUB" })));
  const won = five.filter((x) => x.status === 201), lost = five.filter((x) => x.status !== 201);
  ok("double launch: five STUB starts at once make exactly one job; the other four are 409 in plain words", won.length === 1 && smJobs() === 1 && lost.every((x) => problem(x, 409) && /already running/.test(x.body.detail)), five.map((x) => x.status));
  r = await call("POST", SM, { combinationId: vv, mode: "LIVE" });
  ok("double launch: a LIVE start while the stub runs is refused (cost not confirmed) and creates nothing", problem(r, 409) && smJobs() === 1, said(r));
  const worstMsg = r.body.detail as string;
  const worst1 = Number(/US\$([0-9.]+)/.exec(worstMsg)?.[1]);
  const sm1 = await finished(won[0].body.id);
  ok("screen_map STUB finished at US$0", sm1.status === "COMPLETED" && sm1.costUsd === 0, { status: sm1.status, message: sm1.message?.slice(0, 120) });

  // ─────────────────────────────── accept: malformed and wrong job
  for (const [what, body, st] of [["no job id", {}, 400], ["inputs as text, not a list", { jobId: sm1.id, inputs: "birthCity" }, 400], ["a job that does not exist", { jobId: "00000000-0000-4000-8000-000000000000" }, 404]] as [string, unknown, number][]) {
    r = await call("POST", `${SM}/accept`, body, "user-C"); ok(`accept malformed: ${what} → ${st}, Problem Details in plain words`, problem(r, st), said(r));
  }
  r = await call("POST", `${SM}/accept`, { jobId: sm1.id }, "user-C");
  ok("accept: a stub pass has nothing to accept (409 plain)", problem(r, 409) && /stub/.test(r.body.detail), said(r));

  // ─────────────────────────────── D3 (Lead, open for slice 2b): a completed draft with undecided proposals, then a new start
  const opened = open();
  const answer = { canonical_fields: [], entries: opened.slice(0, 2).map((i) => ({ input: i, outcome: "not_a_fact", person: "none", fact: null, transform: null, confidence: "medium", unresolved_reason: "asked only by the portal (hand-written check answer)", evidence_quote: i })) };
  const props = screenMapProposals(answer, opened.map((i) => ({ input: i, type: "text", part: null, label: i })), [], factKeyProblem);
  sql(`update drafting_job set run_id = 'qa-hand-written-answer', detail = detail || '${JSON.stringify(props).replace(/'/g, "''")}'::jsonb where id = '${sm1.id}'`);
  // D3 as fixed on 12e7207 (forms.ts reuseDraft, one of the Lead's two options): a LIVE start returns the waiting draft at US$0.
  const ledgerLines = () => readFileSync(join(STUDIO, "..", "p2", "ledger", "spend.jsonl"), "utf8").split("\n").filter(Boolean).length;
  const smBefore = smJobs(), ledgerBefore = ledgerLines();
  r = await call("POST", SM, { combinationId: vv, mode: "LIVE", confirmWorstUsd: Math.round((worst1 + 1.37) * 100) / 100 }); // a wrong amount on purpose: nothing may be paid either way
  ok("D3: with a completed draft's proposals undecided, a LIVE start makes no new AI call: the waiting draft is returned (reused, US$0), no new job, no ledger line", (r.status === 201 && r.body?.reused === true && r.body?.id === sm1.id || problem(r, 409)) && smJobs() === smBefore && ledgerLines() === ledgerBefore, { status: r.status, reused: r.body?.reused, same: r.body?.id === sm1.id, message: r.body?.reused_message ?? r.body?.detail, jobs: [smBefore, smJobs()], ledger: [ledgerBefore, ledgerLines()] });
  r = await call("POST", SM, { combinationId: vv, mode: "STUB" });
  note("D3: a STUB start with proposals waiting starts a second (free) pass", { status: r.status, jobs: smJobs() });
  if (r.status === 201) await finished(r.body.id);
  r = await call("POST", `${SM}/accept`, { jobId: sm1.id, inputs: [] }, "user-C");
  ok("accept: an empty list of inputs accepts nothing (409 plain)", problem(r, 409), said(r));
  r = await call("POST", `${SM}/accept`, { jobId: sm1.id, inputs: [opened[0]] }, "user-A");
  ok("accept: the author (who also holds review) may accept a proposal; it becomes a draft version, origin AI_PROPOSAL", r.status === 201 && r.body.accepted === 1 && sql(`select origin from form_field_map where form_edition_id='${ed}' and data_path='${opened[0]}' order by version desc limit 1`) === "AI_PROPOSAL", said(r));

  // Decide the draft's other waiting proposal, so a LIVE start is priced again instead of reusing it (D3).
  await call("POST", `${SM}/accept`, { jobId: sm1.id, inputs: [opened[1]] }, "user-A");
  // ─────────────────────────────── stale: a worst case confirmed before the open inputs changed
  r = await call("POST", SM, { combinationId: vv, mode: "LIVE" });
  const worstA = Number(/US\$([0-9.]+)/.exec(r.body.detail)?.[1]);
  await call("PATCH", `/online-versions/${ed}/screen-map`, { input: open()[0], notAFact: true, reason: "qa probe: the portal asks this only for its own steps (Sample)" }, "user-C");
  r = await call("POST", SM, { combinationId: vv, mode: "LIVE" });
  const worstB = Number(/US\$([0-9.]+)/.exec(r.body.detail)?.[1]);
  const jobsBefore = smJobs();
  if (Number.isFinite(worstA) && Number.isFinite(worstB) && worstA !== worstB) { // never send an amount that equals the current worst case (that would be a paid call)
    r = await call("POST", SM, { combinationId: vv, mode: "LIVE", confirmWorstUsd: worstA });
    ok("stale: a worst case confirmed before a person closed an input is refused with the new amount; nothing is created", problem(r, 409) && r.body.detail.includes(worstB.toFixed(2)) && smJobs() === jobsBefore, { ...said(r), worstA, worstB });
  } else ok("stale: the worst case changes when an open input is closed (needed to probe a stale confirmation)", false, { worstA, worstB });

  // ─────────────────────────────── a server restart while a screen_map job runs; cancel
  r = await call("POST", SM, { combinationId: vv, mode: "STUB" });
  const runningId = r.body?.id;
  iso("restart");
  const afterRestart = (await call("GET", `/jobs/${runningId}`)).body;
  ok("restart: a screen_map job running when the server stopped is closed in plain words, not left RUNNING", r.status === 201 && ["FAILED", "COMPLETED"].includes(afterRestart?.status) && (afterRestart.status === "COMPLETED" || /server stopped/.test(afterRestart.message)), { status: afterRestart?.status, message: afterRestart?.message });
  r = await call("POST", SM, { combinationId: vv, mode: "STUB" });
  ok("restart: a new start is possible afterwards (the old job does not block it)", r.status === 201, said(r));
  const smRun = r.body?.id;
  // QA-31 as fixed on 12e7207: only a LIVE draft is AI work with a batch and the one cancel; a STUB pass (no AI, US$0) has nothing to stop.
  // The LIVE cancel is covered by the builders' check_ai_launch_paths.ts (fake launcher), not here (it would need a paid call or that launcher).
  note("cancel: a STUB screen-map job has no AI work entry to cancel (by design, break m5)", { batchId: (await call("GET", `/jobs/${runningId}`)).body?.batchId ?? null });
  await finished(smRun);

  sql("update form_edition set sha256 = repeat('0', 64), edition_label = 'IMM 5257 (01-2020)' where edition_label = 'IMM 5257 (09-2023)' and channel = 'PDF'");
  const scope = { kind: "source", ids: [svAtt] };
  const plan1 = (await call("POST", "/ai/plan", { scope, mode: "STUB", draftAgain: true })).body;
  sql("update form_field_map set status = 'PUBLISHED' where form_edition_id = (select id from form_edition where edition_label = 'IMM 5257 (01-2020)')");
  const plan2 = (await call("POST", "/ai/plan", { scope, mode: "STUB", draftAgain: true })).body;
  ok("stale plan: releasing the earlier edition changes the plan (reuse now applies)", plan1.plan_sha256 !== plan2.plan_sha256 && plan2.targets[0].a4?.reused > 0, { reused1: plan1.targets?.[0]?.a4?.reused, reused2: plan2.targets?.[0]?.a4?.reused });
  const svSteps = () => Number(sql(`select count(*) from drafting_job where attachment_id='${svAtt}'`)), svBefore = svSteps();
  r = await call("POST", "/ai/batches", { scope, mode: "STUB", idempotencyKey: "qa-s2-stale-0001", planSha256: plan1.plan_sha256, draftAgain: true });
  ok("stale plan: launching the plan seen before the release → 409 'review the updated plan', nothing queued", problem(r, 409) && /changed since you reviewed/.test(r.body.detail) && svSteps() === svBefore, { ...said(r), steps: [svBefore, svSteps()] });
  const [l1, l2] = await Promise.all([1, 2].map(() => call("POST", "/ai/batches", { scope, mode: "STUB", idempotencyKey: "qa-s2-same-key-01", planSha256: plan2.plan_sha256, draftAgain: true })));
  ok("double launch: the same launch key sent twice at once gives one batch and one step", l1.status === 201 && l2.status === 201 && l1.body.id === l2.body.id && svSteps() === svBefore + 1, [l1.status, l2.status, l1.body?.id === l2.body?.id, svBefore, svSteps()]);
  const svJob = await finished(l1.body.jobs[0].id);
  ok("A4 reuse stub run: the reused fields are not sent; only the left-over parts run, US$0", svJob.status === "COMPLETED" && (svJob.costUsd ?? 0) === 0 && svJob.detail?.a4?.reused === plan2.targets[0].a4.reused, { status: svJob.status, reused: svJob.detail?.a4?.reused, message: svJob.message?.slice(0, 160) });

  // ─────────────────────────────── A4 reuse when the earlier edition differs: codes, kind of box, no inventory
  const earlier = sql("select id || '|' || inventory_file from form_edition where edition_label = 'IMM 5257 (01-2020)'").split("|");
  const inv = JSON.parse(readFileSync(join(SOLUTION, earlier[1]), "utf8"));
  const mapped = new Set(sql(`select data_path from form_field_map where form_edition_id='${earlier[0]}' and outcome='mapped'`).split("\n"));
  const coded = inv.fields.find((f: any) => f.data_path && mapped.has(f.data_path) && Array.isArray(f.options_resolved) && f.options_resolved.length > 1);
  const texty = inv.fields.find((f: any) => f.data_path && mapped.has(f.data_path) && f.ui === "textEdit" && !f.options_resolved?.length);
  const reusedNow = () => (call("POST", "/ai/plan", { scope, mode: "STUB", draftAgain: true }) as Promise<Res>).then((x) => x.body.targets?.[0]?.a4?.reused as number);
  const base = await reusedNow();
  const variant = (name: string, change: (f: any[]) => void) => { const copy = JSON.parse(JSON.stringify(inv)); change(copy.fields); const p = join(SCRATCH, name); writeFileSync(p, JSON.stringify(copy, null, 1)); sql(`update form_edition set inventory_file='${relative(SOLUTION, p)}' where id='${earlier[0]}'`); };
  variant("codes-changed.inventory.json", (fs) => { const f = fs.find((x) => x.data_path === coded.data_path); f.options_resolved = f.options_resolved.map(([l, c]: [string, string], i: number) => [l, i === 1 ? `${c}9` : c]); });
  const withCodes = await reusedNow();
  ok("A4 reuse (API): a choice field whose code changed between editions is not reused; every other field still is", withCodes === base - 1, { base, withCodes, field: coded?.caption });
  variant("codes-reordered.inventory.json", (fs) => { const f = fs.find((x) => x.data_path === coded.data_path); f.options_resolved = [...f.options_resolved].reverse(); });
  console.log(`      info: the same codes listed in another order: reused ${await reusedNow()} of base ${base} (order is treated as a difference: conservative)`);
  variant("box-kind-changed.inventory.json", (fs) => { const f = fs.find((x) => x.data_path === texty.data_path); f.ui = "dateTimeEdit"; f.max_chars = 10; });
  const withKind = await reusedNow();
  ok("A4 reuse (API): a form field that was a date box in the earlier edition and is a text box now is not reused (review 4 asked 'compare choices and type too'; engine/parts.ts planDraft compares caption and choices only)", withKind === base - 1, { base, withKind, field: texty?.caption });
  sql(`update form_edition set inventory_file='prototype/p1/inventory/does-not-exist.inventory.json' where id='${earlier[0]}'`);
  const noInv = await reusedNow();
  ok("A4 reuse (API): an earlier edition whose inventory cannot be read gives no reuse (nothing to compare codes with)", noInv === 0 || noInv === undefined, { noInv });
  sql(`update form_edition set inventory_file='${earlier[1]}' where id='${earlier[0]}'`);

  await call("POST", "/demo/reset", { confirm: "RESET" });
  const after = ledger(); console.log(`ledger after: ${JSON.stringify(after)}`);
  ok("US$0: the spend ledger's paid total and its non-stub reservations are unchanged", after.paid_usd === before.paid_usd && after.non_stub_reserves === before.non_stub_reserves, { before, after });
  console.log(`\n${pass} pass, ${fail} fail`);
  iso("stop");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); try { iso("stop"); } catch { /* already stopped */ } process.exit(2); });
