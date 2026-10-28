// S4 slice 1 (W1-06, P-123; challenge.md M2–M7, m1–m6, Q-L1): the form finder and the library API as a scripted journey.
// On the loaded demo's Visitor visa: rules only (lists, attaches nothing) → live AI through the stand-in launcher (two
// rounds, rules on both, attach with no confirm step, download from the recorded canada.ca copies) → replay of saved
// answers → Undo → hand attach and remove → library list, where used, delete and retire (second person) → a hand
// upload equal to canada.ca's file (no second person) and one that is not (held) → a republished same-edition file.
// canada.ca is the recorded copies (official-sources/ircc/canada), plus a test-made folder for two changed files. US$0:
// the AI is tests/fixtures/fake-launch.mjs (honoured only in an isolated copy); nothing calls a model or canada.ca.
//   zsh studio/tools/isolated.sh forms_s4 4455 start STUDIO_FAKE_LAUNCHER=ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tests/fixtures/fake-launch.mjs STUDIO_CANADA_FIXTURES=canada-alt && tsx studio/tests/check_forms_s4_finder.ts 4455 xr_studio_forms_s4
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const PORT = Number(process.argv[2] ?? 4455), DB = process.argv[3] ?? "xr_studio_forms_s4";
const STUDIO = join(import.meta.dirname, ".."), P2 = join(STUDIO, "..", "p2"), OFFICIAL = join(STUDIO, "..", "..", "official-sources", "ircc");
const VAR = join(STUDIO, "var", "isolated-forms_s4");
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely, as in the other API checks
const call = async (method: string, path: string, body?: unknown, actor = "user-A"): Promise<Res> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const upload = async (name: string, bytes: Buffer, actor = "user-A", extra: Record<string, string> = {}) => {
  const fd = new FormData(); fd.append("files", new Blob([new Uint8Array(bytes)], { type: "application/pdf" }), name);
  for (const [k, v] of Object.entries(extra)) fd.append(k, v);
  const r = await fetch(`http://localhost:${PORT}/api/intake`, { method: "POST", headers: { "x-actor": actor }, body: fd });
  return { status: r.status, body: await r.json() as any }; // eslint-disable-line @typescript-eslint/no-explicit-any
};
const jobsBefore = new Set(existsSync(join(P2, "jobs")) ? readdirSync(join(P2, "jobs")) : []);
const madeRuns: string[] = [];

/** The test-made canada.ca folder: the recorded copies, except two changed PDFs (IMM 5645 and IMM 5409). */
function altFixtures() {
  const idx = JSON.parse(readFileSync(join(OFFICIAL, "canada", "index.json"), "utf8"));
  const root = join(VAR, "canada-alt");
  rmSync(root, { recursive: true, force: true });
  const changed: Record<string, Buffer> = {};
  for (const it of idx.items) {
    const src = join(OFFICIAL, it.path), dst = join(root, it.path);
    mkdirSync(dirname(dst), { recursive: true });
    const m = /\/(imm5645|imm5409)\/[^/]+\/[a-z0-9_]+\.pdf$/.exec(it.url);
    if (m) { const b = Buffer.concat([readFileSync(src), Buffer.from(`\n% S4 check: same edition, another file (${m[1]})\n`)]); writeFileSync(dst, b); it.sha256 = sha(b); changed[m[1]] = b; }
    else copyFileSync(src, dst);
  }
  writeFileSync(join(root, "canada", "index.json"), JSON.stringify(idx, null, 1));
  return changed;
}

async function finish(id: string, limit = 90): Promise<Res> {
  let r: Res = { status: 0, body: null };
  for (let i = 0; i < limit * 2; i++) { r = await call("GET", `/form-finder/runs/${id}`); if (!["QUEUED", "RUNNING"].includes(r.body?.status)) return r; await sleep(500); }
  return r;
}
const C5645 = encodeURIComponent("IMM 5645"), C0002 = encodeURIComponent("IRM 0002"), C5257 = encodeURIComponent("IMM 5257");
const lines = (c: string) => sql(`select string_agg(lineage_key || ':' || status || ':' || origin, ',' order by lineage_key) from (select distinct on (lineage_key) * from combination_form where combination_id='${c}' order by lineage_key, version desc) x`);

(async () => {
  const changed = altFixtures();
  let r = await call("POST", "/demo/load");
  ok("setup: the demo loads", r.status < 300, r.status);
  const vv = sql(`select id from combination where label = 'Visitor visa' limit 1`);
  ok("setup: the Visitor visa combination exists", !!vv);
  const fiveFiveBefore = sql(`select count(*) from gov_form_def where form_key='IMM 5645'`);
  ok("setup: IMM 5645 is not in the library yet (the finder must download it)", fiveFiveBefore === "0");

  // --- Guards on plan and launch
  r = await call("POST", `/combinations/${vv}/forms/find/plan`, { mode: "rules", pageUrl: "https://www.example.com/guide.html" });
  ok("C11.15: a chosen page off canada.ca is refused before anything runs (400, in words)", r.status === 400 && /canada\.ca/.test(r.body.detail), r.body.detail);
  r = await call("POST", `/combinations/${vv}/forms/find/plan`, { mode: "turbo" });
  ok("C11.15: an unknown mode is refused (400)", r.status === 400);
  const rulesPlan = (await call("POST", `/combinations/${vv}/forms/find/plan`, { mode: "rules" })).body;
  ok("C11.8: the rules plan costs US$0 and lists six steps", rulesPlan.totals?.worst_usd === 0 && rulesPlan.steps?.length === 6, rulesPlan.totals);
  r = await call("POST", `/combinations/${vv}/forms/find`, { mode: "rules", planSha256: rulesPlan.plan_sha256, idempotencyKey: "s4-check-approver" }, "user-B");
  ok("C11.15: a person without the author duty cannot start the finder (403)", r.status === 403, r.status);
  r = await call("POST", `/combinations/${vv}/forms/find`, { mode: "rules", planSha256: "0".repeat(64), idempotencyKey: "s4-check-badplan" });
  ok("C11.8: a launch whose plan fingerprint differs is refused (409 \"Look at the plan again\")", r.status === 409, r.body.title);

  // --- Rules only: the printed numbers are listed, nothing is attached
  const before = lines(vv);
  r = await call("POST", `/combinations/${vv}/forms/find`, { mode: "rules", planSha256: rulesPlan.plan_sha256, idempotencyKey: "s4-check-rules" });
  let run = (await finish(r.body.id)).body;
  ok("C11.15: rules found the application page by a sure match, with no AI call", run.steps?.[0]?.status === "COMPLETED" && /Rules found a sure match/.test(run.steps[0].message) && run.usd.spent === 0, run.steps?.[0]?.message);
  ok("C11.15: the guide it links (Guide 5256) is read and stored once in the library as a guide (M5)", run.result?.pages?.some((p: any) => p.kind === "guide" && /5256/.test(p.url)) && sql(`select form_kind from gov_form_def where form_key='Guide 5256'`) === "guide", run.result?.pages);
  const printed: { code: string; sentence: string }[] = run.result?.rules_only ?? [];
  ok("C11.15: rules list every form number printed on the pages, each with its sentence (IMM 5257, IMM 5645, IMM 5409 …)", ["IMM 5257", "IMM 5645", "IMM 5409", "IMM 5476", "IMM 5782"].every((c) => printed.some((p) => p.code === c)), printed.map((p) => p.code));
  ok("C11.15: rules only attach nothing (AI did not decide which apply)", lines(vv) === before && run.result.attach.length === 0);
  r = await call("POST", `/combinations/${vv}/forms/find`, { mode: "rules", planSha256: rulesPlan.plan_sha256, idempotencyKey: "s4-check-rules" });
  ok("C11.8: the same launch key returns the same run (idempotent)", r.body.id === run.id, [r.body.id, run.id]);

  // --- Live AI (stand-in launcher): two rounds, rules on both, agreement decides, attach with no confirm step.
  // Safety first: a stub pass (free with any launcher) must reach the stand-in, or no live step runs at all (a wrong
  // STUDIO_FAKE_LAUNCHER path makes the server use the real guarded launcher, which spends money).
  rmSync(join(VAR, "fake-launch.log"), { force: true });
  writeFileSync(join(VAR, "fake-launch.json"), JSON.stringify({ stub: { exit: 1, err: "S4 check: stand-in probe" } }));
  const probeAtt = sql(`select id from source_attachment where combination_id='${vv}' and edition like 'IMM 5257 (%' limit 1`);
  await call("POST", `/attachments/${probeAtt}/draft`, { mode: "stub" });
  for (let i = 0; i < 120 && !existsSync(join(VAR, "fake-launch.log")); i++) await sleep(500);
  const standIn = existsSync(join(VAR, "fake-launch.log"));
  ok("safety: the stand-in launcher answers (no live step runs otherwise; nothing is ever sent to a model)", standIn);
  if (!standIn) throw new Error("the stand-in launcher is not active: start the copy with STUDIO_FAKE_LAUNCHER as the usage line says; live steps skipped");
  const q = (c: string) => printed.find((p) => p.code === c)!.sentence;
  const P = (code: string, applies: string, quote: string, condition: string | null = null, who = "each_applicant") => ({ code, title: null, applies, condition, who, quote, filed_note: null });
  const draft = { forms: [P("IMM 5257", "always", q("IMM 5257")), P("IMM 5409", "condition", q("IMM 5409"), "If you are in a common-law union", "principal_applicant"), P("IMM 5645", "alternative", q("IMM 5645"), "The version in your country's package"),
    P("IRM 0002", "condition", q("IRM 0002"), "If your gender identifier differs"), P("IMM 5782", "separate_application", q("IMM 5782")), P("IMM 5476", "condition", "You must always appoint a representative to apply.", "Has a representative", "principal_applicant"),
    P("IMM 9999", "always", q("IMM 5257")), P("IMM 5707", "always", q("IMM 5707")), P("IMM 5256", "always", q("IMM 5257"))], unresolved: [] };
  const check = { forms: [P("IMM 5257", "always", q("IMM 5257")), P("IMM 5409", "condition", q("IMM 5409"), "Common-law partner", "principal_applicant"), P("IMM 5645", "alternative", q("IMM 5645"), "Visa office package"),
    P("IRM 0002", "condition", q("IRM 0002"), "Gender identifier differs"), P("IMM 5782", "separate_application", q("IMM 5782")), P("IMM 5476", "condition", q("IMM 5476"), "Has a representative", "principal_applicant"),
    P("IMM 5707", "condition", q("IMM 5707"), "Each applicant 18 or older")], unresolved: [] };
  const rec = (o: unknown, usd = 0.04) => ({ label: "S4 check", caller: "live", drafting_run: { run_id: "fake", status: "completed", usage: { cost_usd: usd, input_tokens: 9000, output_tokens: 800 } }, contract_valid: true, raw_output: JSON.stringify(o) });
  const scenario = (extra: Record<string, unknown> = {}) => writeFileSync(join(VAR, "fake-launch.json"), JSON.stringify({ jobs: {
    "studio-finder-forms-check-": { stub: { exit: 0, out: { exit: 0, status: "completed" } }, live: { exit: 0, record: rec(check) } },
    "studio-finder-forms-": { stub: { exit: 0, out: { exit: 0, status: "completed" } }, live: { exit: 0, record: rec(draft), ...extra } } } }));
  scenario();
  const livePlan = (await call("POST", `/combinations/${vv}/forms/find/plan`, { mode: "live" })).body;
  ok("C11.8: the live plan states its worst case first (above US$0, within the run cap) and uses the remembered page (no guide AI round)", livePlan.totals.worst_usd > 0 && livePlan.totals.worst_usd <= 5 && livePlan.totals.ai_rounds === 2 && /apply-visitor-visa/.test(livePlan.page_url ?? ""), livePlan.totals);
  r = await call("POST", `/combinations/${vv}/forms/find`, { mode: "live", planSha256: livePlan.plan_sha256, idempotencyKey: "s4-check-live" });
  run = (await finish(r.body.id)).body;
  const res = run.result ?? {};
  ok("C11.14: both AI rounds ran through the guarded route and their cost is recorded (US$0.08 stand-in)", run.steps?.[2]?.status === "COMPLETED" && run.steps?.[3]?.status === "COMPLETED" && Math.abs(run.usd.spent - 0.08) < 1e-9, run.steps?.map((s: any) => `${s.kind}:${s.status}`));
  const codes = (xs: any[]) => (xs ?? []).map((x: any) => x.code).sort();
  ok("C11.15: forms both rounds read the same way are attached automatically, no confirm step (IMM 5257, 5409, 5645, IRM 0002)", JSON.stringify(codes(res.attach)) === JSON.stringify(["IMM 5257", "IMM 5409", "IMM 5645", "IRM 0002"]), codes(res.attach));
  ok("C11.15: the attached lines are marked Picked by AI (AI_FOUND), conditions kept in plain words", /IMM 5409:DRAFT:AI_FOUND/.test(lines(vv)) && sql(`select attach_mode || '|' || coalesce(condition_plain,'') from combination_form where combination_id='${vv}' and lineage_key='IMM 5409' order by version desc limit 1`).startsWith("ANSWER_CONDITIONAL|If you are"), lines(vv));
  ok("C11.15: the guide itself named in form style (\"IMM 5256\", as both live rounds did) is recognised: neither dropped nor attached", !res.dropped?.some((d: any) => d.code === "IMM 5256") && !codes(res.attach).includes("IMM 5256"), res.dropped);
  ok("C11.14: a number not printed on the pages is dropped and listed (IMM 9999)", res.dropped?.some((d: any) => d.code === "IMM 9999" && /not printed/.test(d.why)), res.dropped);
  ok("C11.14: a quote not on the page is dropped and listed (IMM 5476 first round), so only one round stands: Decide", res.dropped?.some((d: any) => d.code === "IMM 5476" && /quoted line/.test(d.why)) && res.decide?.some((d: any) => d.code === "IMM 5476" && /Only one AI round/.test(d.why)), res.decide);
  ok("C11.14: the two rounds disagree (IMM 5707 always / condition): Decide, not attached", res.decide?.some((d: any) => d.code === "IMM 5707" && /read it differently/.test(d.why)) && !codes(res.attach).includes("IMM 5707"));
  ok("C11.15: a separate application the guide mentions is listed, never attached (IMM 5782)", res.not_for?.some((n: any) => n.code === "IMM 5782") && !/IMM 5782/.test(lines(vv)));
  ok("C11.2: IRM 0002 was downloaded from canada.ca (recorded copy) into the library once, with its page, PDF link and Last updated (M2)", sql(`select origin || '|' || form_page_url || '|' || source_url || '|' || coalesce(canada_updated,'') from form_edition where edition_label='IRM 0002 (03-2021)'`).startsWith("DOWNLOADED|https://www.canada.ca/") && res.attach.find((a: any) => a.code === "IRM 0002")?.source === "downloaded", sql(`select origin, source_url from form_edition where edition_label='IRM 0002 (03-2021)'`));
  ok("C11.2: a canada.ca download needs no second person: no held file, recorded as an official download (M2)", sql(`select count(*) from intake_item where code='IRM 0002' and status='HELD'`) === "0" && sql(`select basis from official_download where code='IRM 0002'`) === "download");
  ok("C11.2: IMM 5645 came from the test-made copy as a download too (the library had none)", res.attach.find((a: any) => a.code === "IMM 5645")?.source === "downloaded" && sql(`select sha256 from form_edition where edition_label like 'IMM 5645 (%'`) === sha(changed.imm5645));
  ok("C11.2 (M6): IMM 5409 is in the library, but canada.ca now serves another file of the same edition: the library's edition stays, marked for a person", res.attach.find((a: any) => a.code === "IMM 5409")?.source === "newer_file" && sql(`select newer_file_sha256 from form_edition where edition_label='IMM 5409 (01-2023)'`) === sha(changed.imm5409), res.attach.find((a: any) => a.code === "IMM 5409"));
  ok("C11.11: forms already in the library are used as they are (IMM 5257 from the library, compared with canada.ca: same file)", res.attach.find((a: any) => a.code === "IMM 5257")?.source === "library" && sql(`select checked_at is not null from form_edition where edition_label='IMM 5257 (09-2023)'`) === "t");
  ok("C11.15: the run ends \"Done with problems\" (PARTIAL), with what was attached, missing and to decide", run.status === "PARTIAL" && /attached or already there/.test(run.message), run.message);
  const liveJobs = readFileSync(join(VAR, "fake-launch.log"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l).job as string).filter((j) => j.startsWith("studio-finder-forms-"));
  ok("break M5: each finder job id carries the trail's fingerprint, so two sibling combinations never share one (Stop ends only its own run)", liveJobs.length >= 2 && liveJobs.every((j) => /-[0-9a-f]{8}$/.test(j)), liveJobs.slice(0, 2));
  ok("review M7: no job file is left in the source tree after the rounds (the run record keeps it)", !(existsSync(join(P2, "jobs")) ? readdirSync(join(P2, "jobs")) : []).some((f) => f.startsWith("studio-finder-") && !jobsBefore.has(f)));
  ok("break minor: step 1 used the remembered page (no AI call), so it is not tagged AI", (await call("GET", `/runs/${run.id}`)).body.steps?.[0]?.uses === "rules");
  ok("review M7: the run records the pages the AI read (their files and fingerprints)", Array.isArray(res.ai_inputs) && res.ai_inputs.length >= 1 && res.ai_inputs.every((x: any) => x.file && /^[0-9a-f]{64}$/.test(x.sha256)), res.ai_inputs);

  r = await call("GET", `/combinations/${vv}/forms/find`);
  ok("C11.15: the combination's newest finder run is served (what S5's Forms tab reads)", r.status === 200 && r.body.id === run.id && r.body.result?.attach?.length === 4, r.body?.id);
  r = await call("GET", `/combinations/${vv}/forms/find/latest`);
  const st = (c: string) => r.body.forms?.find((f: any) => f.code === c);
  ok("C11.15 (S5 ask 1): one read gives every proposed form with its state now: downloaded, newer file, attached, to decide, not for this application", st("IRM 0002")?.state === "DOWNLOADED_ATTACHED" && st("IMM 5409")?.state === "NEWER_FILE_SAME_EDITION" && st("IMM 5257")?.state === "ATTACHED" && st("IMM 5707")?.state === "TO_DECIDE" && st("IMM 5782")?.state === "NOT_FOR_THIS_APPLICATION", r.body.forms?.map((f: any) => `${f.code}:${f.state}`));
  ok("C11.15 (S5 ask 1): each attached form carries its line id and version, the quote, who and the run id", !!st("IMM 5409")?.lineId && st("IMM 5409")?.lineVersion === 1 && /common-law/.test(st("IMM 5409")?.quote) && st("IMM 5409")?.who === "principal_applicant" && st("IMM 5409")?.runId === run.id, st("IMM 5409"));
  r = await call("POST", `/combinations/${vv}/forms/${C5257}/replace`, { version: 9 });
  ok("C11.15 (S5 ask 4): Replace on a line with a stale version is refused (409)", r.status === 409, r.body.title);
  r = await call("POST", `/combinations/${vv}/forms/${C5257}/replace`, { version: 1 });
  ok("C11.15: Replace on a line compares the form with canada.ca (still the current edition: nothing to replace)", r.status < 300 && r.body.outcome === "current", r.body);
  r = await call("POST", `/library/forms/${C5257}/check-canada`);
  ok("C11.2 (m5): Check canada.ca on a library form compares it with its own canada.ca page (US$0): still current", r.status < 300 && r.body.outcome === "current", r.body);
  r = await call("POST", `/library/forms/${encodeURIComponent("IMM 5488")}/check-canada`);
  ok("C11.2: Check canada.ca on a form with no recorded canada.ca page says what to do instead (409)", r.status === 409 && /Upload/.test(r.body.detail), r.body.detail);

  // --- Library list (one lean list, filters), freshness, Sample basis
  r = await call("GET", "/library/forms/list");
  const row = (c: string) => r.body.rows.find((x: any) => x.code === c);
  ok("C11.11: the library is one list with type counts, guides and checklists in it (P-118 Q3)", r.status === 200 && r.body.counts.guide >= 1 && r.body.counts.checklist >= 1 && row("Guide 5256")?.type === "guide" && row("IMM 5484")?.type === "checklist", r.body.counts);
  ok("C11.11: a downloaded form shows where it came from and when canada.ca was checked; IRCC accepts stays unset when the page says nothing about it (never invented)", row("IRM 0002")?.origin === "DOWNLOADED" && /^https:\/\/www\.canada\.ca\//.test(row("IRM 0002")?.downloaded_from ?? "") && !!row("IRM 0002")?.checked_at && row("IRM 0002")?.accepts === null && row("IRM 0002")?.accepts_basis === null, row("IRM 0002"));
  ok("C11.11: \"Used by\" names the combinations whose draft lists it, marked picked by AI", row("IRM 0002")?.used_by?.some((u: any) => /(^| › )Visitor visa$/.test(u.label) && u.picked_by_ai), row("IRM 0002")?.used_by);
  ok("C11.11 (M6): the status filter shows \"Newer file on canada.ca\" for IMM 5409", (await call("GET", "/library/forms/list?status=newer_file")).body.rows.map((x: any) => x.code).includes("IMM 5409"));
  ok("C11.11: filters combine: type=guide lists guides only; search finds by number", (await call("GET", "/library/forms/list?type=guide")).body.rows.every((x: any) => x.type === "guide") && (await call("GET", "/library/forms/list?q=5645")).body.rows.length === 1);
  ok("C11.11: a filter value outside the list is refused (400)", (await call("GET", "/library/forms/list?status=lost")).status === 400);

  // --- Replay of saved answers: a saved real run of exactly these pages and prompt, US$0; none saved → stops with why
  // Another application page (the study permit's): no answer was ever saved for those pages.
  const otherPage = "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/apply.html";
  const nonePlan = (await call("POST", `/combinations/${vv}/forms/find/plan`, { mode: "replay", pageUrl: otherPage })).body;
  r = await call("POST", `/combinations/${vv}/forms/find`, { mode: "replay", pageUrl: otherPage, planSha256: nonePlan.plan_sha256, idempotencyKey: "s4-check-replay-none" });
  run = (await finish(r.body.id)).body;
  ok("C11.8: replay with no saved answer for these pages stops with the reason and attaches nothing (US$0)", run.status === "FAILED" && /No saved AI answer/.test(run.steps[2].message) && run.usd.spent === 0, run.steps?.[2]?.message);
  // Break M7, round 2 N4: saved answers are found by everything the AI was given (pages, prompt, trail), not by file name.
  const vvTrail = sql(`select split_part(scope_label, '|', 2) from ai_batch where id='${run.id}'`).replace(/^[^›]+›/, "Individual ›"); // round 3 R3-2: a renamed upper level still replays
  // Lead decision 28 Oct: an answer belongs to the combination itself, by its key (the job's combination), not its names.
  const vvKey = sql(`select combination_key from combination where id='${vv}'`);
  const empty = { forms: [], unresolved: [] };
  for (const [prefix, out, tpl] of [["studio-finder-forms-check-", check, "find-forms-check.v1.md"], ["studio-finder-forms-", draft, "find-forms.v1.md"]] as const) {
    const saved = (o: unknown, combination: string) => ({ ...rec(o), drafting_run: { ...rec(o).drafting_run, inputs: { official_files: res.ai_inputs, combination } }, launch_evidence: { template_sha256: sha(readFileSync(join(P2, "prompts", tpl))), known: { combination_trail: vvTrail } } });
    const file = join(P2, "runs", `${prefix}an-older-name-of-this-place-live-29991231t000000000z-s4check.json`);
    writeFileSync(file, JSON.stringify(saved(out, vvKey)));
    // Newer decoys with the same pages, prompt and names but no answer: a same-named combination elsewhere (its own key), and names only.
    const decoyKey = join(P2, "runs", `${prefix}same-names-elsewhere-live-30001231t000000000z-s4check.json`), decoyNames = join(P2, "runs", `${prefix}names-only-live-30001230t000000000z-s4check.json`);
    writeFileSync(decoyKey, JSON.stringify(saved(empty, "xx.same_names_elsewhere")));
    writeFileSync(decoyNames, JSON.stringify(saved(empty, vvTrail)));
    // Break R5-1: a stub pass of a place whose own name holds "live" ends "-stub-…": never replayed as the AI's answer.
    const decoyStub = join(P2, "runs", `${prefix}a-live-place-stub-30001231t000000000z-s4check.json`);
    writeFileSync(decoyStub, JSON.stringify(saved(empty, vvKey)));
    // Lead check 28 Oct (minor): the record's own mode is read too: a stub record named like a live run is not the AI's answer.
    const decoyMode = join(P2, "runs", `${prefix}stub-mode-live-30001227t000000000z-s4check.json`);
    writeFileSync(decoyMode, JSON.stringify({ ...saved(empty, vvKey), caller: "stub" }));
    madeRuns.push(file, decoyKey, decoyNames, decoyStub, decoyMode);
  }
  r = await call("DELETE", `/combinations/${vv}/forms/${C5257}`, { version: 7 });
  ok("C11.15 (S5 ask 4): Remove with a stale line version is refused (409, reload)", r.status === 409 && /Changed since/.test(r.body.title), r.body.detail);
  ok("break round 2 m-c: a version ahead of the line is said plainly (the line is at version 1, not 7)", /is at version 1 on this combination, not 7/.test(r.body.detail), r.body.detail);
  const otherCombo = sql(`select id from combination where label = 'Super visa' limit 1`);
  const op = (await call("POST", `/combinations/${otherCombo}/forms/find/plan`, { mode: "replay", pageUrl: livePlan.page_url })).body;
  r = await call("POST", `/combinations/${otherCombo}/forms/find`, { mode: "replay", pageUrl: livePlan.page_url, planSha256: op.plan_sha256, idempotencyKey: "s4-check-replay-other" });
  const otherRun = (await finish(r.body.id)).body;
  ok("break round 2 N4: replay on another combination reading the same pages never reuses this one's answer (the AI was given the trail)", /No saved AI answer/.test(otherRun.steps?.[2]?.message ?? "") && !otherRun.result?.attach?.length, otherRun.steps?.[2]?.message);
  r = await call("DELETE", `/combinations/${vv}/forms/${C5257}`, { version: 1 });
  ok("C11.15: Remove with the line's version takes IMM 5257 off (it stays in the library)", r.status < 300 && /IMM 5257:RETIRED/.test(lines(vv)), lines(vv));
  const replayPlan = (await call("POST", `/combinations/${vv}/forms/find/plan`, { mode: "replay" })).body;
  r = await call("POST", `/combinations/${vv}/forms/find`, { mode: "replay", planSha256: replayPlan.plan_sha256, idempotencyKey: "s4-check-replay" });
  run = (await finish(r.body.id)).body;
  ok("C11.8: replay reuses the saved answers of exactly these pages and prompt: same result, US$0, nothing attached twice", run.usd.spent === 0 && run.result?.attach?.filter((a: any) => a.code !== "IMM 5257").every((a: any) => a.line === "already") && run.result.attach.length === 4, run.result?.attach?.map((a: any) => `${a.code}:${a.line}`));
  ok("C11.8 (Lead 28 Oct), break R5-1: replay is keyed by the combination itself: newer saved answers with the same pages and names but another combination's key, names only, or a stub pass of this combination (by its file name or its own mode) are never used", run.result?.attach?.length === 4 && /29991231t/.test(sql(`select detail->>'run_file' from drafting_job where batch_id='${run.id}' and kind='finder_propose'`)), sql(`select detail->>'run_file' from drafting_job where batch_id='${run.id}' and kind='finder_propose'`));
  ok("C11.15 (S5 ask 2): Find again never attaches back a form a person removed (IMM 5257 stays removed; shown \"Add back\")", run.result?.attach?.find((a: any) => a.code === "IMM 5257")?.line === "removed_by_person" && /IMM 5257:RETIRED/.test(lines(vv)) && (await call("GET", `/combinations/${vv}/forms/find/latest`)).body.forms.find((f: any) => f.code === "IMM 5257")?.state === "REMOVED_BY_PERSON", lines(vv));
  r = await call("POST", `/combinations/${vv}/forms/undo`, { changeId: "00000000-0000-4000-8000-000000000000" });
  ok("C11.15 (S5 ask 4): Undo naming a change that is no longer the last is refused (409)", r.status === 409, r.body.detail);
  const lastChange = sql(`select id from form_line_action where combination_id='${vv}' and undone_at is null order by at desc limit 1`);
  r = await call("POST", `/combinations/${vv}/forms/undo`, { changeId: lastChange });
  ok("C11.15: Undo of the removal brings IMM 5257 back (the one Undo covers removals too)", r.status < 300 && r.body.undone === "remove" && /IMM 5257:DRAFT/.test(lines(vv)), lines(vv));
  r = await call("PATCH", `/combinations/${vv}/forms/${C5257}`, { who: "principal_applicant" });
  ok("C11.15 (S5 ask 4): a line setting saved on the Forms tab is one change for the same Undo", r.status < 300 && sql(`select action from form_line_action where combination_id='${vv}' and undone_at is null order by at desc limit 1`) === "edit");
  r = await call("POST", `/combinations/${vv}/forms/undo`);
  ok("C11.15: Undo reverses that setting exactly", r.status < 300 && r.body.undone === "edit" && sql(`select who from combination_form where combination_id='${vv}' and lineage_key='IMM 5257' order by version desc limit 1`) === "each_applicant", r.body);
  for (let round = 0; round < 4; round++) {
    await call("PATCH", `/combinations/${vv}/forms/${C5257}`, { who: "principal_applicant" });
    const mine = sql(`select id from form_line_action where combination_id='${vv}' and undone_at is null order by at desc limit 1`);
    const [u, e] = await Promise.all([call("POST", `/combinations/${vv}/forms/undo`, { changeId: mine }), call("PATCH", `/combinations/${vv}/forms/${C5257}`, { who: "spouse_or_partner" })]);
    const who = sql(`select who from combination_form where combination_id='${vv}' and lineage_key='IMM 5257' order by version desc limit 1`);
    if (round === 0 || who !== "spouse_or_partner" || u.status >= 500 || e.status >= 500) ok(`break round 2 N6: an edit and an Undo at the same moment: one after the other, the edit is never lost (round ${round + 1})`, who === "spouse_or_partner" && u.status < 500 && e.status < 300, { undo: u.status, edit: e.status, who });
    while (sql(`select action from form_line_action where combination_id='${vv}' and undone_at is null order by at desc limit 1`) === "edit") if ((await call("POST", `/combinations/${vv}/forms/undo`)).status >= 300) break;
  }
  ok("setup: the edits made by the race are undone again (who back to each applicant)", sql(`select who from combination_form where combination_id='${vv}' and lineage_key='IMM 5257' order by version desc limit 1`) === "each_applicant");

  // --- Undo the finder's attach; hand attach and remove; Undo again
  r = await call("POST", `/combinations/${vv}/forms/undo`);
  ok("C11.15: Undo reverses the finder's attach exactly (IRM 0002 and IMM 5645 off the combination)", r.status < 300 && r.body.undone === "finder_attach" && !/IRM 0002:DRAFT|IMM 5645:DRAFT/.test(lines(vv)), lines(vv));
  ok("C11.15: after Undo the forms stay in the library", sql(`select count(*) from gov_form_def where form_key in ('IRM 0002','IMM 5645')`) === "2");
  r = await call("POST", `/combinations/${vv}/forms/undo`);
  ok("C11.15: Undo with nothing left to undo says so (409)", r.status === 409, r.body.title);
  r = await call("POST", `/combinations/${vv}/forms`, { formKey: "imm5645" });
  ok("C11.15: a library form is attached by hand (its number written loosely is understood)", r.status < 300 && /IMM 5645:DRAFT:HUMAN/.test(lines(vv)), r.body);
  r = await call("POST", `/combinations/${vv}/forms`, { formKey: "IMM 5645" });
  ok("C11.15: attaching it again is refused (409, already on this combination)", r.status === 409);
  r = await call("POST", `/combinations/${vv}/forms`, { formKey: "IMM 1294" });
  ok("C11.15: a form not in the library cannot be attached (404, find or upload it)", r.status === 404 && /not in the library/.test(r.body.detail), r.body.detail);
  r = await call("POST", `/combinations/${vv}/forms`, { formKey: "IMM 5645" }, "user-B");
  ok("C11.15: attaching needs the author duty (403)", r.status === 403);
  const v5645 = Number(sql(`select version from combination_form where combination_id='${vv}' and lineage_key='IMM 5645' order by version desc limit 1`));
  const both = await Promise.all(Array.from({ length: 10 }, () => call("DELETE", `/combinations/${vv}/forms/${C5645}`, { version: v5645 })));
  ok("break m12, round 2 N5: ten Removes at the same moment: one wins, the nine others get a plain 409 (no 500), one Undo step recorded", both.filter((x) => x.status < 300).length === 1 && both.filter((x) => x.status === 409 && /Already removed/.test(x.body.title)).length === 9 && sql(`select count(*) from form_line_action where combination_id='${vv}' and action='remove' and undone_at is null and detail->'codes' ? 'IMM 5645'`) === "1", both.map((x) => `${x.status} ${x.body?.title ?? ""}`));
  r = both.find((x) => x.status < 300) ?? both[0];
  ok("C11.15: Remove takes it off this combination; it stays in the library", r.status < 300 && r.body.in_library && !/IMM 5645:DRAFT/.test(lines(vv)) && sql(`select count(*) from gov_form_def where form_key='IMM 5645'`) === "1", lines(vv));
  r = await call("POST", `/combinations/${vv}/forms/undo`);
  ok("C11.15: Undo brings the removed line back", r.status < 300 && /IMM 5645:DRAFT/.test(lines(vv)), lines(vv));
  r = await call("PATCH", `/combinations/${vv}/forms/${C5645}`, { who: "principal_applicant" });
  sql(`update combination_form set condition_plain = 'Edited by someone else' where combination_id='${vv}' and lineage_key='IMM 5645' and status='DRAFT'`);
  r = await call("POST", `/combinations/${vv}/forms/undo`);
  ok("break M4: Undo refuses when the line was edited since, even with the same status and version (409)", r.status === 409 && /changed after/.test(r.body.detail), r.body.detail);
  sql(`update combination_form set who='principal_applicant' where combination_id='${vv}' and lineage_key='IMM 5645'`);
  sql(`insert into form_line_action (id, workspace_id, combination_id, action, detail, by) select gen_random_uuid(), workspace_id, id, 'attach', jsonb_build_object('codes', jsonb_build_array('IMM 5645'), 'before', '[]'::jsonb, 'after', '[]'::jsonb), 'user-A' from combination where id='${vv}'`);
  r = await call("POST", `/combinations/${vv}/forms/undo`);
  ok("C11.15: Undo refuses when the line changed since that step (409, change it by hand)", r.status === 409 && /changed after/.test(r.body.detail), r.body.detail);

  // --- Lifecycle (P-116): where used; delete only unused and never released; retire only released; a second person
  r = await call("GET", `/library/forms/${C5645}/uses`);
  ok("C11.11: where used lists the Visitor visa draft and blocks delete", r.status === 200 && r.body.uses.some((u: any) => /(^| › )Visitor visa$/.test(u.label) && u.blocks) && /Still used|never deleted/.test(r.body.can.delete), r.body.can);
  r = await call("DELETE", `/library/forms/${C5645}`, { reason: "Not needed" });
  ok("C11.11: delete of a used form is refused with each use (409)", r.status === 409 && r.body.uses?.length > 0, r.body.detail);
  // Review must 1 (P-51): IRM 0002 came from canada.ca (an official download): kept, retired, never deleted.
  r = await call("GET", `/library/forms/${C0002}/uses`);
  ok("review must 1: an unused official download may be retired, never deleted", r.body.can?.retire === null && /never deleted: retire it instead/.test(r.body.can?.delete ?? ""), r.body.can);
  r = await call("DELETE", `/library/forms/${C0002}`, { reason: "Not used by any combination" });
  ok("review must 1: delete of an official download is refused in words (409)", r.status === 409 && /retire it instead/.test(r.body.detail), r.body.detail);
  // A form never released, with no approved file (test-made): the delete path.
  const madeForm = (key: string) => sql(`insert into gov_form_def select (jsonb_populate_record(null::gov_form_def, to_jsonb(d) || jsonb_build_object('id', gen_random_uuid(), 'form_key', '${key}', 'display_name', 'S4 check form', 'form_page_url', null, 'retired_at', null, 'retired_by', null))).* from gov_form_def d where form_key='IMM 5488'`);
  madeForm("IMM 0100");
  const C0100 = encodeURIComponent("IMM 0100");
  r = await call("POST", `/library/forms/${C0100}/retire`, { reason: "Old" });
  ok("C11.11: retire of a never-released form with no approved file is refused: delete it instead (409)", r.status === 409 && /never released/.test(r.body.detail), r.body.detail);
  r = await call("DELETE", `/library/forms/${C0100}`, { reason: "x" });
  ok("C11.11: a reason is required (400)", r.status === 400);
  r = await call("DELETE", `/library/forms/${C0100}`, { reason: "Not used by any combination" });
  ok("C11.11: delete of an unused, never-released form waits for a second person", r.status < 300 && r.body.status === "WAITING", r.body);
  const change = r.body.id;
  // P-123 with QA-46: a library form is Deleted (it leaves the library); a structure name or field is Removed.
  r = await call("GET", `/library/changes/${change}`);
  ok("C11.11: the approval page names it Delete library form (P-123)", r.body.action_word === "Delete" && r.body.kind_word === "library form", r.body.action_word);
  const queued = ((await call("GET", "/review-queue?filter=all&kind=library_change", undefined, "user-B")).body.items as any[]).find((i) => i.id === `change:${change}`); // eslint-disable-line @typescript-eslint/no-explicit-any
  ok("C11.11: To review says Delete the library form, never Remove", /^Delete the library form/.test(queued?.what ?? "") && !/Remove/.test(queued?.what ?? ""), queued?.what);
  const other = sql(`insert into library_change (id, workspace_id, kind, key, action, status, proposed_by, reason) select gen_random_uuid(), workspace_id, 'structure_node', 's4-word-check', 'DELETE', 'WAITING', 'user-A', 'Word check' from library_change where id='${change}' returning id`).split("\n")[0];
  const otherWhat = ((await call("GET", "/review-queue?filter=all&kind=library_change", undefined, "user-B")).body.items as any[]).find((i) => i.id === `change:${other}`)?.what; // eslint-disable-line @typescript-eslint/no-explicit-any
  ok("C11.11: fail case: a structure name delete still says Remove (QA-46), not Delete", /^Remove the structure name/.test(otherWhat ?? ""), otherWhat);
  sql(`delete from library_change where id='${other}'`);
  r = await call("POST", `/library/changes/${change}/approve`, { note: "ok" }, "user-A");
  ok("C11.11: the author cannot approve their own delete (author ≠ approver)", r.status >= 400, r.status);
  r = await call("POST", `/library/changes/${change}/approve`, { note: "Checked: unused" }, "user-B");
  const deleteLines = sql(`select string_agg(summary, ' | ' order by at) from audit_event where entity_key='IMM 0100'`);
  ok("break R5-2: History says the form was deleted (it left the library), never removed", /proposed to delete "/.test(deleteLines) && /approved deleting "[^"]+": it left the library/.test(deleteLines) && !/remov/i.test(deleteLines), deleteLines);
  ok("C11.11: a second person approves: the form leaves the library", r.status < 300 && sql(`select count(*) from gov_form_def where form_key='IMM 0100'`) === "0" && sql(`select status from library_change where id='${change}'`) === "RELEASED", r.body);
  r = await call("POST", `/library/forms/${C5257}/restore`, { reason: "Needed again" });
  ok("C11.11: restore of a form that is not retired is refused (409)", r.status === 409 && /not retired/.test(r.body.detail), r.body.detail);
  sql(`update gov_form_def set retired_at = now(), retired_by = 'user-A' where form_key = 'IMM 5488'`);
  r = await call("POST", `/library/forms/${encodeURIComponent("IMM 5488")}/restore`, { reason: "Needed again for a combination" });
  ok("C11.11: restore of a retired form waits for a second person (P-116)", r.status < 300 && r.body.status === "WAITING" && r.body.action === "RESTORE", r.body);
  ok("C11.11 (S5 ask 5): the picker list leaves out retired forms (the library list still shows them, marked Retired)", !(await call("GET", "/library/forms/list?for=picker")).body.rows.some((x: any) => x.code === "IMM 5488") && (await call("GET", "/library/forms/list?status=retired")).body.rows.some((x: any) => x.code === "IMM 5488"));
  ok("C11.11: a retired form is not attached by hand (409, restore it first)", (await call("POST", `/combinations/${vv}/forms`, { formKey: "IMM 5488" })).status === 409);
  const released = sql(`select r.combination_id from config_release r where r.snapshot->'forms' @> '[{"form_number":"IMM 5257"}]' limit 1`);
  r = await call("GET", `/library/forms/${C5257}/uses`);
  ok("C11.11: a released form is never deleted (retire it instead)", !released || /never deleted/.test(r.body.can.delete), r.body.can);

  madeForm("IMM 0102");
  r = await call("DELETE", `/library/forms/${encodeURIComponent("IMM 0102")}`, { reason: "Never used anywhere" });
  const del2 = r.body.id;
  sql(`insert into form_edition select (jsonb_populate_record(null::form_edition, to_jsonb(e) || jsonb_build_object('id', gen_random_uuid(), 'gov_form_def_id', (select id from gov_form_def where form_key='IMM 0102'), 'edition_label', 'IMM 0102 (01-2026)', 'sha256', repeat('ab', 32), 'content_sha256', null))).* from form_edition e where gov_form_def_id=(select id from gov_form_def where form_key='IMM 5488') limit 1`);
  sql(`insert into official_download select (jsonb_populate_record(null::official_download, to_jsonb(o) || jsonb_build_object('id', gen_random_uuid(), 'sha256', repeat('ab', 32), 'code', 'IMM 0102'))).* from official_download o limit 1`); // its file is now an official download (approved)
  r = await call("POST", `/library/changes/${del2}/approve`, { note: "Checked" }, "user-B");
  ok("break round 2 N1: a file approved after the delete was asked keeps the form: the approval is refused in words (409), nothing deleted", r.status === 409 && /approved meanwhile/.test(r.body.detail) && sql(`select count(*) from gov_form_def where form_key='IMM 0102'`) === "1", r.body.detail);
  sql(`delete from library_change where key='IMM 0102'`); sql(`delete from form_edition where edition_label='IMM 0102 (01-2026)'`); sql(`delete from official_download where code='IMM 0102'`); sql(`delete from gov_form_def where form_key='IMM 0102'`);
  // N2: nothing new may use a form while a retire or delete of it is open
  r = await call("POST", `/combinations/${vv}/forms`, { formKey: "IRM 0002" });
  r = await call("DELETE", `/combinations/${vv}/forms/${C0002}`, { version: Number(sql(`select version from combination_form where combination_id='${vv}' and lineage_key='IRM 0002' order by version desc limit 1`)) });
  ok("setup: IRM 0002 attached by hand, then removed again (its Undo would bring it back)", r.status < 300, r.body?.detail);
  r = await call("POST", `/library/forms/${C0002}/retire`, { reason: "Replaced by a newer process" });
  ok("setup: retire of the unused IRM 0002 waits for a second person", r.status < 300 && r.body.status === "WAITING", r.body);
  r = await call("POST", `/combinations/${vv}/forms`, { formKey: "IRM 0002" });
  ok("break round 2 N2: a form being retired cannot be attached meanwhile (409, in words)", r.status === 409 && /Being retired/.test(r.body.title), r.body.detail);
  r = await call("POST", `/combinations/${vv}/lines`, { kind: "FORM", formKey: "IRM 0002" });
  ok("round 3 R3-1: the workspace's \"+ Add\" refuses it too (409, in words): every attach path goes through one guard", r.status === 409 && /open on To review/.test(r.body.detail ?? r.body.message ?? ""), r.body?.detail ?? r.body);
  r = await call("POST", `/combinations/${vv}/forms/undo`);
  ok("round 3 major: Undo never brings back a form whose retire is open (409, in words); the line stays removed", r.status === 409 && /Being retired/.test(r.body.title) && /IRM 0002:RETIRED/.test(lines(vv)), r.body.detail);
  // The release checks again: a draft listing the form again (made by hand here) keeps it, and the retire goes back.
  const retireId = sql(`select id from library_change where key='IRM 0002' and status='WAITING'`);
  r = await call("POST", `/library/changes/${retireId}/approve`, { note: "Checked" }, "user-B");
  sql(`update combination_form set status='DRAFT' where combination_id='${vv}' and lineage_key='IRM 0002' and version=(select max(version) from combination_form where combination_id='${vv}' and lineage_key='IRM 0002')`);
  const shared = (await call("GET", "/draft")).body;
  r = await call("POST", "/pack/release", { expectedChanges: shared.changes }, "user-B");
  ok("round 3 major: the release re-checks: a retire whose form a draft lists again is handed back, the form is not retired", sql(`select retired_at is null from gov_form_def where form_key='IRM 0002'`) === "t" && sql(`select status from library_change where id='${retireId}'`) === "RETURNED", { release: r.status, change: sql(`select status from library_change where id='${retireId}'`) });
  ok("round 4 R4-3: the hand-back is written in History (the release did not retire it, and why)", Number(sql(`select count(*) from audit_event where entity_key='IRM 0002' and summary like 'The release did not retire IRM 0002%'`)) >= 1);
  sql(`delete from library_change where key='IRM 0002'`);
  r = await call("DELETE", `/combinations/${vv}/forms/${C0002}`, { version: Number(sql(`select version from combination_form where combination_id='${vv}' and lineage_key='IRM 0002' order by version desc limit 1`)) });
  madeForm("IMM 0101");
  r = await call("DELETE", `/library/forms/${encodeURIComponent("IMM 0101")}`, { reason: "Never used anywhere" });
  ok("setup: delete of an unused, never-released form waits for a second person", r.status < 300 && r.body.status === "WAITING", r.body);
  const del = r.body.id;
  sql(`insert into combination_form select (jsonb_populate_record(null::combination_form, to_jsonb(f) || jsonb_build_object('id', gen_random_uuid(), 'lineage_key', 'IMM 0101', 'gov_form_def_id', (select id from gov_form_def where form_key='IMM 0101'), 'status', 'RETIRED', 'version', 1))).* from combination_form f where combination_id='${vv}' order by version desc limit 1`);
  ok("setup: a retired line now points to IMM 0101", sql(`select count(*) from combination_form where lineage_key='IMM 0101' and status='RETIRED'`) === "1");
  r = await call("POST", `/library/changes/${del}/approve`, { note: "Checked" }, "user-B");
  ok("break round 2 N8: the approve answer says what happened (RETURNED with the reason), never \"approved\"", r.body?.status === "RETURNED" && /^Not deleted/.test(r.body.decision_note ?? ""), r.body?.status ?? r.body);
  ok("break M1: a delete approved while a retired line still points to the form is not marked done: the form stays and the change is handed back", sql(`select count(*) from gov_form_def where form_key='IMM 0101'`) === "1" && sql(`select status from library_change where id='${del}'`) !== "RELEASED", { status: r.status, change: sql(`select status || ' ' || coalesce(decision_note,'') from library_change where id='${del}'`) });
  sql(`delete from library_change where key='IMM 0101'`); // the handed-back change, so where used shows the rule itself
  r = await call("GET", `/library/forms/${encodeURIComponent("IMM 0101")}/uses`);
  ok("break M1: where used says why it cannot be deleted (a retired line points to it: retire it instead)", /retired line/.test(r.body.can?.delete ?? ""), r.body.can);
  sql(`delete from combination_form where lineage_key='IMM 0101'`); sql(`delete from library_change where key='IMM 0101'`); sql(`delete from gov_form_def where form_key='IMM 0101'`);

  // --- Q-L1: a hand upload equal to canada.ca's file is an official download; a different file is held
  sql(`delete from combination_form where lineage_key='IMM 5645'`); sql(`delete from form_line_action where detail->'codes' ? 'IMM 5645'`);
  sql(`delete from official_download where code='IMM 5645'`); sql(`delete from gov_form_def where form_key='IMM 5645'`);
  let u = await upload("imm5645e.pdf", changed.imm5645, "user-A", { forCombination: vv, forCode: "IMM 5645" });
  ok("C11.2 (Q-L1): a hand upload whose checksum equals the PDF behind canada.ca's form page goes into the library with no second person", u.status < 300 && u.body.results?.[0]?.outcome === "added" && sql(`select basis from official_download where sha256='${sha(changed.imm5645)}'`) === "fingerprint_match", u.body.results?.[0]);
  ok("C11.15 (S5 ask 3): uploaded from the combination's row for IMM 5645 and usable at once: attached to that combination", /IMM 5645:DRAFT:HUMAN/.test(lines(vv)) && /Attached to the combination/.test(u.body.results?.[0]?.message), u.body.results?.[0]?.message);
  sql(`delete from combination_form where lineage_key='IMM 5645'`);
  sql(`delete from official_download where code='IMM 5645'`); sql(`delete from gov_form_def where form_key='IMM 5645'`); sql(`delete from intake_item where code='IMM 5645'`);
  u = await upload("imm5645e.pdf", Buffer.concat([changed.imm5645, Buffer.from("% one byte more\n")]), "user-A", { forCombination: vv, forCode: "IMM 5645" });
  ok("C11.2 (Q-L1): an upload that differs from canada.ca's file is held for a second person, as before (P-80)", u.status < 300 && u.body.results?.[0]?.outcome === "held" && sql(`select count(*) from official_download where code='IMM 5645'`) === "0", u.body.results?.[0]?.message);
  const heldId = sql(`select id from intake_item where code='IMM 5645' and status='HELD' and for_code='IMM 5645' and for_combination_id='${vv}'`);
  ok("C11.15 (S5 ask 3): the held upload remembers the combination's row it came from, and is not attached yet", !!heldId && !/IMM 5645:DRAFT/.test(lines(vv)));
  await call("PATCH", `/intake/held/${heldId}`, { irccPage: "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/imm5645.html" });
  r = await call("POST", `/intake/held/${heldId}/approve`, {}, "user-B");
  ok("C11.15 (S5 ask 3): once a second person approves it, it is attached to that combination", r.status < 300 && /IMM 5645:DRAFT:HUMAN/.test(lines(vv)), lines(vv));

  // --- Break M2, M3, minor 1: an answer with a snippet for a quote, an unknown person, or the wrong shape is never used
  const bad = { forms: [P("IMM 5707", "always", "Form"), P("IMM 5476", "always", q("IMM 5476"), null, "the_manager")], unresolved: [] };
  writeFileSync(join(VAR, "fake-launch.json"), JSON.stringify({ jobs: {
    "studio-finder-forms-check-": { stub: { exit: 0, out: { exit: 0, status: "completed" } }, live: { exit: 0, record: rec(bad) } },
    "studio-finder-forms-": { stub: { exit: 0, out: { exit: 0, status: "completed" } }, live: { exit: 0, record: rec(bad) } } } }));
  let bp = (await call("POST", `/combinations/${vv}/forms/find/plan`, { mode: "live", only: ["IMM 5707", "IMM 5476"] })).body;
  r = await call("POST", `/combinations/${vv}/forms/find`, { mode: "live", only: ["IMM 5707", "IMM 5476"], planSha256: bp.plan_sha256, idempotencyKey: "s4-check-bad-quote" });
  run = (await finish(r.body.id)).body;
  ok("break M2: a quote of a few letters (\"Form\") is no evidence: dropped, never attached", run.result?.dropped?.some((d: any) => d.code === "IMM 5707" && /does not speak about it/.test(d.why)) && !run.result?.attach?.some((a: any) => a.code === "IMM 5707"), run.result?.dropped);
  ok("break M3: an answer naming a person the studio does not know is dropped, never attached", run.result?.dropped?.some((d: any) => d.code === "IMM 5476" && /names a person/.test(d.why)) && !run.result?.attach?.some((a: any) => a.code === "IMM 5476"), run.result?.dropped);
  writeFileSync(join(VAR, "fake-launch.json"), JSON.stringify({ jobs: { "studio-finder-forms-": { stub: { exit: 0, out: { exit: 0, status: "completed" } }, live: { exit: 0, record: rec({ forms: "IMM 5257" }) } } } }));
  bp = (await call("POST", `/combinations/${vv}/forms/find/plan`, { mode: "live" })).body;
  r = await call("POST", `/combinations/${vv}/forms/find`, { mode: "live", planSha256: bp.plan_sha256, idempotencyKey: "s4-check-bad-shape" });
  run = (await finish(r.body.id)).body;
  ok("break minor 1: an AI answer of the wrong shape stops the step in words; nothing crashes, nothing is attached", ["FAILED", "NEEDS_PERSON", "PARTIAL"].includes(run.status) && /expected shape/.test(run.steps?.[2]?.message ?? ""), run.steps?.[2]?.message);
  r = await call("POST", `/combinations/${sql(`select id from combination where id <> '${vv}' limit 1`)}/forms/find`, { mode: "live", planSha256: bp.plan_sha256, idempotencyKey: "s4-check-bad-shape" });
  const suffixes = new Set(readFileSync(join(VAR, "fake-launch.log"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l).job as string).filter((j) => j.startsWith("studio-finder-forms-") && !j.startsWith("studio-finder-forms-check-")).map((j) => j.slice(-8)));
  ok("break round 2 N3: each run has its own job id, even on the same combination (so a same-named combination elsewhere never shares one)", suffixes.size >= 3, [...suffixes]);
  ok("break minor: a launch key already used on another combination is refused (409), never answered with that run", r.status === 409, r.body?.title);

  // --- Two runs at once on one combination; Stop
  scenario({ sleep_ms: 4000 });
  const p2 = (await call("POST", `/combinations/${vv}/forms/find/plan`, { mode: "live" })).body;
  const first = await call("POST", `/combinations/${vv}/forms/find`, { mode: "live", planSha256: p2.plan_sha256, idempotencyKey: "s4-check-race-1" });
  const second = await call("POST", `/combinations/${vv}/forms/find`, { mode: "live", planSha256: p2.plan_sha256, idempotencyKey: "s4-check-race-2" });
  ok("C11.8: a second run on the same combination while one runs is refused (409 \"Already finding\")", first.status < 300 && second.status === 409 && /already running/.test(second.body.detail), second.body);
  await sleep(800);
  r = await call("POST", `/form-finder/runs/${first.body.id}/stop`);
  ok("C11.8: Stop is accepted while it runs", r.status < 300, r.status);
  run = (await finish(first.body.id)).body;
  ok("C11.8: a stopped run ends Stopped: no step starts after Stop and nothing is attached by it", run.status === "CANCELLED" && run.steps.slice(4).every((s: any) => ["CANCELLED", "SKIPPED", "WAITING"].includes(s.status)) && sql(`select count(*) from combination_form where finder_batch_id='${first.body.id}'`) === "0", run.steps?.map((s: any) => `${s.kind}:${s.status}`));
  r = await call("POST", `/form-finder/runs/${first.body.id}/stop`);
  ok("C11.8: Stop on an ended run says so (409)", r.status === 409);
  r = await call("POST", `/ai/batches/${first.body.id}/retry`, {});
  ok("C11.8: a finder run is not retried through the field-map retry (409, find again instead)", r.status === 409, r.body?.message ?? r.body);
})().catch((e) => { fail++; console.log(`FAIL  the check stopped: ${(e as Error).stack}`); }).finally(() => {
  for (const f of madeRuns) rmSync(f, { force: true });
  for (const f of existsSync(join(P2, "jobs")) ? readdirSync(join(P2, "jobs")) : []) if (f.startsWith("studio-finder-") && !jobsBefore.has(f)) rmSync(join(P2, "jobs", f), { force: true });
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
});
