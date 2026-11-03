// C11.16 (Day-0 acceptance, P-220) — One way in: names enter only on Program structure; each combination it defines is a
// card on Immigration programs; Start setup on a card opens its workspace with the place read-only and the finder's saved
// result (US$0), else "Find forms with AI" with its price, run only on a click; a set-up card opens its workspace; one link
// to Program structure; menu in setup order Program structure · Immigration programs · To review.
// Status (CAPABILITIES, 1 Nov): Not built (screens lane). Most of the API under it exists since S3 (check_w1_start_setup);
// what is missing underneath: the place is not read-only (PATCH /combinations/:id still renames the combination outside
// Program structure). The menu order, the one link and the card click are screen-only: journeys/J1 (draft A).
// Decisions: P-125 (amended 28 Oct: saved answer at US$0, else live only on a click), P-128 (5) ("Add combination" opens the
// Program structure pop-up in place), P-123, P-110, P-175 (live AI off on every copy without the switch), P-104.
// US$0: the copy runs without any live switch; the saved answer is replayed; nothing calls a model or canada.ca.
// Scaffolding (P-33, said here): the only saved finder answer is the sample's Visitor visa; to prove Start setup loads a
// saved answer by itself, the check copies it under its own combination's key in p2/runs (the only folder the finder
// reads saved answers from; no per-copy folder exists) with names marked "-pk1<process id>", and removes the copies at
// the end, on an error, on Ctrl-C and SIGTERM, and any left by an earlier run whose process is gone
// (acceptance/lib/pack1.ts plantRun). p2/runs/.gitignore does not cover these names: proposal for the Lead, add
// "*-pk1*.json" to it. The "i" tooltip on Start setup (P-125 (3)) is screen-only: journey J1.
//   zsh tools/isolated.sh acc_a1 4561 start && ./node_modules/.bin/tsx acceptance/C11.16.test.ts 4561 xr_studio_acc_a1
// Expected today (screens C11.16 PR, run 1 Nov 2026 on an isolated copy, US$0): 25 pass. Before it (main 931cb99a): 23
// pass, AT-9 and AT-10 failing (PATCH /combinations/:id renamed or moved the combination with 200); PATCH now refuses
// the name and the place in plain words (api/src/studio.ts updateCombination).
// Exit: 0 all pass · 1 a check failed · 2 setup missing or refused (demo port or database, copy not reachable, sample).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { checkCopy, cleanupRuns, guard, PLANT_MARK, plantRun, RUNS, sqlFor } from "./lib/pack1.ts";

const PORT = Number(process.argv[2] ?? 4561), DB = process.argv[3] ?? "xr_studio_acc_a1";
guard(PORT, DB); // before anything reads the database or calls the copy (never the demo)
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 260)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- responses are read loosely, as in tests/check_*.ts
const call = async (method: string, path: string, body?: unknown, actor = "user-A"): Promise<Res> => {
  try {
    const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
    return { status: r.status, body: j ?? {} };
  } catch (e) { return { status: 0, body: { detail: String(e) } }; }
};
const sql = sqlFor(DB);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ended = async (runId: string) => { for (let i = 0; i < 120; i++) { const v = (await call("GET", `/form-finder/runs/${runId}`)).body; if (!["QUEUED", "RUNNING"].includes(v?.status)) return v; await wait(500); } return null; };
const TECH = /ENOENT|errno|syscall|\/Users\/|node:|Prisma|at [A-Za-z.]+ \(|Error:/;
const plain = (b: any) => typeof b?.detail === "string" && b.detail.length > 10 && !TECH.test(b.detail); // eslint-disable-line @typescript-eslint/no-explicit-any
const cards = async (t = "INDIVIDUAL") => ((await call("GET", `/catalogue?pathway=${t}&filter=all`)).body?.rows ?? []) as any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
const card = async (key: string) => (await cards()).find((r) => r.nodeKey === key);
const committed = async () => (await call("GET", "/ledger")).body?.committed_usd;
const combosOf = (key: string) => sql(`select count(*) from combination c join program_def p on p.id=c.program_def_id where p.program_node_key='${key}'`);

const SAVED = ["studio-finder-forms-individual-visitors-visitor-visa-live-20261027t072426546z-4d8a0d.json", "studio-finder-forms-check-individual-visitors-visitor-visa-live-20261027t072500006z-a569fb.json"];
const saveFor = (key: string) => SAVED.forEach((f, i) => {
  const r = JSON.parse(readFileSync(join(RUNS, f), "utf8")); r.drafting_run.inputs.combination = key;
  plantRun(`${i ? "studio-finder-forms-check" : "studio-finder-forms"}-pk1c1116-live-20261101t00000000${i}z-${PLANT_MARK}.json`, r);
});
const cleanup = cleanupRuns;

(async () => {
  await checkCopy(PORT, DB);
  const reset = await call("POST", "/demo/reset", { confirm: "RESET" });
  if (reset.status >= 300) { console.error("STOP  setup missing: the demo reset failed", reset.status); process.exit(2); }
  const usd0 = await committed();

  // ------------------------------------------------ names enter only on Program structure; each combination is a card
  let r = await call("POST", "/structure/path", { pathwayType: "INDIVIDUAL", pathway: { label: "Temporary residence" }, program: { label: "Visitors" }, category: { label: "Visitor visa" }, subCategory: null, allowedLocations: ["outside_canada"] });
  const tr = r.body?.created?.find((c: any) => c.level === "pathway")?.key, vis = r.body?.created?.find((c: any) => c.level === "program")?.key, vv = r.body?.leaf?.key; // eslint-disable-line @typescript-eslint/no-explicit-any
  r = await call("POST", "/structure/path", { pathwayType: "INDIVIDUAL", pathway: { key: tr }, program: { key: vis }, category: { label: "Transit visa" }, subCategory: null });
  const tv = r.body?.leaf?.key;
  r = await call("POST", "/structure/path", { pathwayType: "INDIVIDUAL", pathway: { key: tr }, program: { label: "Study permits" }, category: { label: "Study permit" }, subCategory: { label: "Outside Canada" } });
  const sp = r.body?.created?.find((c: any) => c.level === "category")?.key, spOut = r.body?.leaf?.key, studies = r.body?.created?.find((c: any) => c.level === "program")?.key; // eslint-disable-line @typescript-eslint/no-explicit-any
  r = await call("POST", "/structure/path", { pathwayType: "INDIVIDUAL", pathway: { key: tr }, program: { key: studies }, category: { key: sp }, subCategory: { label: "Inside Canada" } });
  const spIn = r.body?.leaf?.key;
  if (!vv || !tv || !spOut || !spIn) { console.error("STOP  setup missing: Program structure did not take the names", { vv, tv, spOut, spIn }); cleanup(); process.exit(2); }
  const cVv = await card(vv);
  ok("C11.16 AT-1 a last-level name added on Program structure is at once its own Not started card, with the five-part trail and Start setup",
    cVv?.statusText === "Not started" && cVv?.combinationId === null && cVv?.nextAction?.label === "Start setup" && JSON.stringify(cVv?.trail) === JSON.stringify(["Retail", "Temporary residence", "Visitors", "Visitor visa", "No sub-category"]) && combosOf(vv) === "0", { status: cVv?.statusText, trail: cVv?.trail, next: cVv?.nextAction });
  const all = await cards();
  ok("C11.16 AT-2 a category with sub-categories is not a card; each of its sub-categories is one (Study permit › Outside / Inside Canada)",
    !all.some((x) => x.nodeKey === sp) && all.some((x) => x.nodeKey === spOut) && all.some((x) => x.nodeKey === spIn), all.map((x) => x.nodeKey));
  r = await call("POST", "/combinations/start", { nodeKey: sp });
  ok("C11.16 AT-2 refusal: Start setup on that category is refused in plain words (400) and creates nothing", r.status === 400 && plain(r.body) && combosOf(sp) === "0", { status: r.status, detail: r.body?.detail });
  const rowsBefore = sql("select count(*) from program_def");
  const pathGone = await call("POST", "/combinations/path", { pathway: "INDIVIDUAL", program: { create: "X" }, category: { create: "Y" } });
  const propGone = await call("POST", "/path-proposal", { pathway: "INDIVIDUAL", description: "visitor visa" });
  ok("C11.16 AT-3 no second way to place a name: the New combination page's endpoints are gone (404)", pathGone.status === 404 && propGone.status === 404, [pathGone.status, propGone.status]);
  const byLabel = await call("POST", "/combinations/start", { label: "Super visa" });
  const unknown = await call("POST", "/combinations/start", { nodeKey: "individual.nowhere.made_up" });
  ok("C11.16 AT-3 refusal: Start setup with a new name or an unknown key is refused in plain words (400, 404) and no name is created",
    byLabel.status === 400 && unknown.status === 404 && plain(byLabel.body) && plain(unknown.body) && sql("select count(*) from program_def") === rowsBefore, [byLabel.status, byLabel.body?.detail, unknown.status, unknown.body?.detail]);

  // ------------------------------------------------ roles before anything is created
  const asB = await call("POST", "/combinations/start", { nodeKey: vv }, "user-B");
  const asC = await call("POST", "/combinations/start", { nodeKey: vv }, "user-C");
  const asNobody = await call("POST", "/combinations/start", { nodeKey: vv }, "nobody");
  ok("C11.16 AT-4 refusal: only a configuration author starts setup (approver and content reviewer 403, nobody 401), nothing created",
    asB.status === 403 && asC.status === 403 && asNobody.status === 401 && plain(asB.body) && combosOf(vv) === "0", [asB.status, asC.status, asNobody.status]);

  // ------------------------------------------------ a saved answer loads by itself, US$0
  saveFor(vv);
  r = await call("POST", "/combinations/start", { nodeKey: vv });
  const vvId = r.body?.combination?.id;
  ok("C11.16 AT-5 Start setup on a card with a saved finder answer creates the setup and loads that answer at once (replay)", r.status === 201 && r.body?.created === true && r.body?.saved === true && !!r.body?.run, r.body);
  const v1 = r.body?.run ? await ended(r.body.run) : null;
  const formsVv = vvId ? Number(sql(`select count(*) from combination_form where combination_id='${vvId}'`)) : 0;
  ok("C11.16 AT-5 the saved answer attached the forms and spent nothing (US$0, ledger unchanged)", v1?.mode === "replay" && v1?.usd?.spent === 0 && formsVv > 0 && (await committed()) === usd0, { mode: v1?.mode, usd: v1?.usd, forms: formsVv });
  const landVv = (await call("GET", `/combinations/${vvId}/start-setup`)).body;
  ok("C11.16 AT-5 its workspace landing shows that run and no offer to pay for another", landVv?.run === v1?.id && landVv?.offer === null, landVv);
  const setUp = await card(vv);
  const ws = await call("GET", `/combinations/${vvId}/workspace?tab=forms`);
  ok("C11.16 AT-6 the set-up card now names its setup (In progress) and its workspace opens (Forms tab answers with its lines)",
    setUp?.combinationId === vvId && setUp?.statusText !== "Not started" && ws.status === 200 && Array.isArray(ws.body?.lines) && ws.body.lines.length > 0, { card: setUp?.statusText, ws: ws.status, lines: ws.body?.lines?.length });
  r = await call("POST", "/combinations/start", { nodeKey: vv });
  ok("C11.16 AT-6 a second Start setup on the same card (double click) opens the same setup; nothing doubles, no second run",
    r.status === 200 && r.body?.created === false && r.body?.combination?.id === vvId && combosOf(vv) === "1" && sql(`select count(*) from ai_batch where scope_label like '${vvId}|%'`) === "1", r.body);

  // ------------------------------------------------ no saved answer: the price first, a run only on a click
  const before = sql("select count(*) from ai_batch") + "/" + sql("select count(*) from drafting_job");
  r = await call("POST", "/combinations/start", { nodeKey: tv });
  const tvId = r.body?.combination?.id;
  ok("C11.16 AT-7 with no saved answer Start setup creates the setup and starts nothing", r.status === 201 && r.body?.saved === false && r.body?.run === null && sql("select count(*) from ai_batch") + "/" + sql("select count(*) from drafting_job") === before, r.body);
  const land = (await call("GET", `/combinations/${tvId}/start-setup`)).body;
  const plan = (await call("POST", `/combinations/${tvId}/forms/find/plan`, { mode: "live" })).body;
  ok("C11.16 AT-7 the landing has exactly one offer; on this copy (AI switched off) it says so in plain words and offers the free rules",
    land?.run === null && land?.offer?.mode === "rules" && /switched off on this copy/.test(land?.offer?.why ?? "") && /free/.test(land?.offer?.label ?? "") && /^[0-9a-f]{64}$/.test(land?.offer?.planSha256 ?? ""), land?.offer);
  ok("C11.16 AT-7 the AI price is stated before any click: the live plan names its usual and worst cost (above US$0), reading it spends nothing",
    plan?.totals?.worst_usd > 0 && (plan?.totals?.about_usd === null || plan?.totals?.about_usd > 0) && plan?.live?.on === false && sql("select count(*) from ai_batch") + "/" + sql("select count(*) from drafting_job") === before, { totals: plan?.totals, live: plan?.live?.on });
  r = await call("POST", `/combinations/${tvId}/forms/find`, { mode: "live", planSha256: plan?.plan_sha256, idempotencyKey: `acc-1116-live-${process.pid}` });
  ok("C11.16 AT-8 refusal: a live click on a copy without the live switch is refused in plain words (409); no run, nothing spent",
    r.status === 409 && plain(r.body) && sql("select count(*) from ai_batch") + "/" + sql("select count(*) from drafting_job") === before && (await committed()) === usd0, { status: r.status, detail: r.body?.detail });

  // ------------------------------------------------ the place is read-only in the workspace
  const ov = (await call("GET", `/combinations/${vvId}`)).body;
  const placeShown = [ov?.pathway?.client_type, ...(ov?.path ?? []).map((p: any) => p.label)]; // eslint-disable-line @typescript-eslint/no-explicit-any
  ok("C11.16 AT-9 the workspace reads its place from Program structure: Pathway type, Pathway, Program, Category (and sub-category when there is one)",
    JSON.stringify(placeShown) === JSON.stringify(["INDIVIDUAL", "Temporary residence", "Visitors", "Visitor visa"]), placeShown);
  const labelBefore = sql(`select label from program_def where program_node_key='${vv}'`) + "|" + sql(`select label from combination where id='${vvId}'`);
  r = await call("PATCH", `/combinations/${vvId}`, { label: "Visitor visa (renamed in setup)" });
  const labelAfter = sql(`select label from program_def where program_node_key='${vv}'`) + "|" + sql(`select label from combination where id='${vvId}'`);
  if (r.status < 300) await call("PATCH", `/combinations/${vvId}`, { label: "Visitor visa" }); // put it back for the checks below
  ok("C11.16 AT-9 refusal: the place cannot be renamed in the setup (rename it on Program structure): refused in plain words, names unchanged",
    r.status >= 400 && r.status < 500 && plain(r.body) && labelAfter === labelBefore, { status: r.status, detail: r.body?.detail, before: labelBefore, after: labelAfter });
  const progBefore = sql(`select program_def_id from combination where id='${vvId}'`);
  r = await call("PATCH", `/combinations/${vvId}`, { programKey: tv, nodeKey: tv, programDefId: sql(`select id from program_def where program_node_key='${tv}'`) });
  ok("C11.16 AT-10 refusal: the setup cannot be moved to another place: refused in plain words (4xx, as AT-9), nothing changes underneath", sql(`select program_def_id from combination where id='${vvId}'`) === progBefore && r.status >= 400 && r.status < 500 && plain(r.body), { status: r.status, detail: r.body?.detail });

  // ------------------------------------------------ the one start guard, the same words on card and API
  r = await call("POST", "/structure/path", { pathwayType: "INDIVIDUAL", pathway: { key: tr }, program: { key: vis }, category: { label: "Old visit (test)" }, subCategory: null });
  const gone = r.body?.leaf?.key;
  sql(`update program_def set retired_at = now() where program_node_key = '${gone}'`);
  r = await call("POST", "/combinations/start", { nodeKey: gone });
  const goneRow = ((await call("GET", "/structure?pathwayType=INDIVIDUAL&retired=1")).body?.nodes ?? []).find((n: any) => n.key === gone); // eslint-disable-line @typescript-eslint/no-explicit-any
  ok("C11.16 AT-11 refusal: a retired name cannot start setup (409, plain words); its row gives the same reason; nothing created",
    r.status === 409 && plain(r.body) && goneRow?.combination?.startWhy === r.body?.detail && combosOf(gone) === "0", { status: r.status, detail: r.body?.detail, row: goneRow?.combination?.startWhy });
  const cTv = await card(spIn);
  ok("C11.16 AT-11 a Not started card with nothing in the way carries no reason (its Start setup is offered)", cTv?.startWhy === null && cTv?.nextAction?.label === "Start setup", { why: cTv?.startWhy, next: cTv?.nextAction });

  // ------------------------------------------------ two clicks at once: one setup
  const three = await Promise.all([0, 1, 2].map(() => call("POST", "/combinations/start", { nodeKey: spOut })));
  ok("C11.16 AT-12 three Start setup requests at the same moment make one setup: one 201, the others return it (no 500)",
    three.filter((x) => x.status === 201).length === 1 && three.every((x) => x.status === 201 || x.status === 200) && new Set(three.map((x) => x.body?.combination?.id)).size === 1 && combosOf(spOut) === "1", three.map((x) => x.status));

  // ------------------------------------------------ reads need a known person
  const ssNobody = await call("GET", `/combinations/${tvId}/start-setup`, undefined, "nobody");
  const catNobody = await call("GET", "/catalogue?pathway=INDIVIDUAL", undefined, "nobody");
  ok("C11.16 AT-13 refusal: the landing and the cards are not read by an unknown caller (401)", ssNobody.status === 401 && catNobody.status === 401, [ssNobody.status, catNobody.status]);
  const ssB = await call("GET", `/combinations/${tvId}/start-setup`, undefined, "user-B");
  ok("C11.16 AT-13 the approver may read the landing (read-only), but not start or launch", ssB.status === 200 && (await call("POST", `/combinations/${tvId}/forms/find`, { mode: "rules", planSha256: land?.offer?.planSha256, idempotencyKey: `acc-1116-b-${process.pid}` }, "user-B")).status === 403);

  // ------------------------------------------------ the Corporate tab: same rule
  r = await call("POST", "/structure/path", { pathwayType: "CORPORATE", pathway: { label: "Temporary residence" }, program: { label: "Labour market impact assessment" }, category: { label: "High-wage position" }, subCategory: null });
  const hw = r.body?.leaf?.key;
  const cHw = (await cards("CORPORATE")).find((x) => x.nodeKey === hw);
  ok("C11.16 AT-14 a Corporate and employers name is a card on its own tab, with its trail, and never on Retail",
    JSON.stringify(cHw?.trail) === JSON.stringify(["Corporate and employers", "Temporary residence", "Labour market impact assessment", "High-wage position", "No sub-category"]) && !(await cards()).some((x) => x.nodeKey === hw), cHw?.trail);

  ok("C11.16 AT-15 US$0: the whole file spent nothing (ledger unchanged, no live AI job)", (await committed()) === usd0 && sql("select count(*) from drafting_job where mode='LIVE'") === "0", { before: usd0, after: await committed() });

  cleanup();
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { cleanup(); console.error("FAIL  unexpected", e); process.exit(1); });
