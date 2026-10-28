// S3 Start setup (P-125, P-123, P-110 amended; screens/W1-start-setup/challenge.md, agreed 28 Oct), against the server
// and the database. Start setup creates the combination of a last-level name, once (a second call returns it); with a
// saved AI answer for its trail it loads it at US$0 by itself (M1); without one nothing runs until the person clicks
// "Find forms with AI", whose offer names the usual and the worst cost (founder: wait for a click). The one guard (M3)
// refuses a retired name, a name under a retired one and a name under a waiting change, with the same words on the
// Program structure row, the Immigration programs card and the API (409). The New combination page's two endpoints are
// gone (M2). canada.ca is the recorded copies and the AI is tests/fixtures/fake-launch.mjs (isolated copy only): US$0.
//   zsh studio/tools/isolated.sh screens_s3 4436 start STUDIO_FAKE_LAUNCHER=ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tests/fixtures/fake-launch.mjs && tsx studio/tests/check_w1_start_setup.ts 4436 xr_studio_screens_s3
import { execFileSync } from "node:child_process";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PORT = Number(process.argv[2] ?? 4436), DB = process.argv[3] ?? "xr_studio_screens_s3";
let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 260)}` : ""}`); };
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: any = null; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ended = async (runId: string) => { for (let i = 0; i < 120; i++) { const v = (await call("GET", `/form-finder/runs/${runId}`)).body; if (!["QUEUED", "RUNNING"].includes(v?.status)) return v; await wait(500); } return null; };
const nodes = async () => (await call("GET", "/structure?pathwayType=INDIVIDUAL")).body.nodes as any[];
// Scaffolding (P-33, said here): the only saved finder answer is the sample's Visitor visa (key vv.single). To prove that
// Start setup loads a saved answer by itself, the check copies it under its own combination's key, then removes the copies.
const RUNS = join(import.meta.dirname, "..", "..", "p2", "runs");
// Fix pass (S3 early look 1): the stand-in launcher's answer, written to this copy's own folder; it answers with the kind
// of raw text a real launcher failure prints (an error code, a server path, a stack line), which must never be shown.
const VAR = join(import.meta.dirname, "..", "var", `isolated-${DB.replace(/^xr_studio_/, "")}`);
const RAW = "Error: ENOENT: no such file or directory, open '/Users/someone/studio/var/fake-launch.json'\n    at Object.openSync (node:fs:573:18) { errno: -2, syscall: 'open' } Node.js v24.21.0";
const TECH = /ENOENT|errno|syscall|\/Users\/|node:fs|Node\.js v/;
const COST = /^(about US\$\d+\.\d\d · )?at most US\$\d+\.\d\d$/;
const SAVED = ["studio-finder-forms-individual-visitors-visitor-visa-live-20261027t072426546z-4d8a0d.json", "studio-finder-forms-check-individual-visitors-visitor-visa-live-20261027t072500006z-a569fb.json"];
const copies: string[] = [];
const saveFor = (key: string) => SAVED.forEach((f, i) => {
  const r = JSON.parse(readFileSync(join(RUNS, f), "utf8")); r.drafting_run.inputs.combination = key;
  const name = `${i ? "studio-finder-forms-check" : "studio-finder-forms"}-s3check-live-20261028t00000000${i}z-s3chk${process.pid}.json`;
  writeFileSync(join(RUNS, name), JSON.stringify(r)); copies.push(name);
});
const card = async (key: string) => ((await call("GET", "/catalogue?pathway=INDIVIDUAL&filter=all")).body.rows as any[]).find((r) => r.nodeKey === key);

(async () => {
  const served = (await call("GET", "/session")).body?.workspace?.id;
  const inDb = (() => { try { return sql(`select id from workspace where id='${served}'`); } catch { return ""; } })();
  if (!served || !inDb) { console.error(`STOP  the database ${DB} is not the one the server on port ${PORT} uses. Pass the copy's database: tsx <check> ${PORT} xr_studio_<name>.`); process.exit(2); }
  await call("POST", "/demo/reset", { confirm: "RESET" });
  // Names come from Program structure only (P-125 (1)): one branch with a saved finder answer (Visitor visa), one without.
  let r = await call("POST", "/structure/path", { pathwayType: "INDIVIDUAL", pathway: { label: "Temporary residence (S3 check)" }, program: { label: "Visitors" }, category: { label: "Visitor visa" }, subCategory: null, allowedLocations: ["outside_canada"] });
  const tr = r.body.created?.find((c: any) => c.level === "pathway")?.key, vis = r.body.created?.find((c: any) => c.level === "program")?.key, vv = r.body.leaf?.key;
  r = await call("POST", "/structure/path", { pathwayType: "INDIVIDUAL", pathway: { key: tr }, program: { key: vis }, category: { label: "Transit visa" }, subCategory: null });
  const tv = r.body.leaf?.key;
  ok("setup: Visitors › Visitor visa and Transit visa added on Program structure, both Not started", !!vv && !!tv && sql("select count(*) from combination") === "0", { vv, tv });

  // ---------------------------------------------------------------- M1: a saved answer loads by itself, free
  saveFor(vv);
  r = await call("POST", "/combinations/start", { nodeKey: vv });
  const vvId = r.body?.combination?.id;
  ok("M1 pass: Start setup creates the combination and, with a saved answer for its trail, loads it at once (replay, US$0)", r.status === 201 && r.body.created === true && r.body.saved === true && !!r.body.run, r.body);
  const v1 = r.body.run ? await ended(r.body.run) : null;
  ok("M1 pass: the saved answer attached the forms, and nothing was spent", v1?.mode === "replay" && v1?.usd?.spent === 0 && Number(sql(`select count(*) from combination_form where combination_id='${vvId}'`)) > 0, { status: v1?.status, mode: v1?.mode, usd: v1?.usd, forms: sql(`select count(*) from combination_form where combination_id='${vvId}'`) });
  r = await call("POST", "/combinations/start", { nodeKey: vv });
  ok("m5: a second Start setup (double click) returns the same combination and run; nothing doubles", r.status === 200 && r.body.created === false && r.body.combination.id === vvId && sql(`select count(*) from combination c join program_def p on p.id=c.program_def_id where p.program_node_key='${vv}'`) === "1" && sql(`select count(*) from ai_batch where scope_label like '${vvId}|%'`) === "1", r.body);
  const offerVv = (await call("GET", `/combinations/${vvId}/start-setup`)).body;
  ok("M4: once forms are attached the landing shows the run, with no offer", offerVv.run === v1?.id && offerVv.offer === null, offerVv);

  // ---------------------------------------------------------------- M1: no saved answer, nothing runs until the click
  r = await call("POST", "/combinations/start", { nodeKey: tv });
  const tvId = r.body?.combination?.id;
  ok("M1 founder (wait for a click): with no saved answer Start setup creates the combination and starts no run", r.status === 201 && r.body.created === true && r.body.saved === false && r.body.run === null && sql(`select count(*) from ai_batch where scope_label like '${tvId}|%'`) === "0", r.body);
  const offer = (await call("GET", `/combinations/${tvId}/start-setup`)).body;
  const words = /\((.*)\)$/.exec(offer.offer?.label ?? "")?.[1] ?? "";
  ok("M1: the landing offers one button 'Find forms with AI (about US$… · at most US$…)', the worst case in its tip", offer.run === null && offer.offer?.mode === "live" && /^Find forms with AI \(/.test(offer.offer.label) && COST.test(words) && /at most US\$\d+\.\d\d\. Nothing is spent until you click\./i.test(offer.offer.tip) && /^[0-9a-f]{64}$/.test(offer.offer.planSha256), offer.offer);
  ok("fix 4: the button and its tip say the cost in the same words (about US$x · at most US$y)", offer.offer.tip.toLowerCase().includes(`${words.toLowerCase()}.`), { words, tip: offer.offer.tip });
  writeFileSync(join(VAR, "fake-launch.json"), JSON.stringify({ stub: { exit: 1, err: RAW } }));
  r = await call("POST", `/combinations/${tvId}/forms/find`, { mode: "live", planSha256: offer.offer.planSha256, idempotencyKey: `check-s3-${Date.now()}` });
  const v2 = r.body?.id ? await ended(r.body.id) : null;
  const after = (await call("GET", `/combinations/${tvId}/start-setup`)).body;
  const formsTv = Number(sql(`select count(*) from combination_form where combination_id='${tvId}'`));
  ok("M1: the click starts the live run (the fake launcher here, US$0); the landing then shows that run", r.status < 300 && v2?.mode === "live" && after.run === v2?.id, { status: r.status, run: v2?.status, after });
  ok("M1 fail-guard: a run that attached nothing shows the offer again under it; one that attached forms does not", formsTv ? after.offer === null && after.ended === false : after.ended === true && !!after.offer, { forms: formsTv, ended: after.ended, offer: after.offer?.label });
  const runView = (await call("GET", `/runs/${v2?.id}`)).body;
  const shown = JSON.stringify([runView.message, runView.error, runView.steps?.map((s: any) => s.message)]);
  ok("fix 1: the launcher really answered with raw text (an error code, a server path, a stack line)", TECH.test(RAW) && /"mode":"stub"/.test(readFileSync(join(VAR, "fake-launch.log"), "utf8")));
  ok("fix 1: the run card shows none of it: plain words, nothing sent, nothing charged", !TECH.test(shown) && /could not start on this computer, so nothing was sent and nothing was charged/.test(shown), shown);
  sql(`update drafting_job set message = 'AI could not pick the page: ${RAW.replace(/'/g, "''")}' where batch_id = '${v2?.id}' and kind = (select kind from drafting_job where batch_id = '${v2?.id}' order by started_at limit 1)`);
  const runView2 = JSON.stringify((await call("GET", `/runs/${v2?.id}`)).body);
  ok("fix 1 fail-guard: raw text already stored on a run (an older run) is replaced by plain words when shown", !TECH.test(runView2) && /Something went wrong on this computer/.test(runView2), runView2.slice(0, 300));
  ok("fix 3: after a run that attached nothing there is one find button: the offer reads Find again, and the run's own link leads to it (QA-63)", /^Find again with AI \(/.test(after.offer?.label ?? "") && runView.error?.next?.href === `/c/${tvId}/sources`, { label: after.offer?.label, next: runView.error?.next });
  ok("fix 4: the run card's cost words equal the button's (about US$x · at most US$y)", runView.usd?.worst === Number(/at most US\$(\d+\.\d\d)/.exec(words)?.[1]) && (/about US\$(\d+\.\d\d)/.exec(words)?.[1] ?? null) === (runView.usd?.about == null ? null : runView.usd.about.toFixed(2)), { words, usd: runView.usd });
  rmSync(join(VAR, "fake-launch.json"), { force: true });

  // ---------------------------------------------------------------- M3: the start guard, same words everywhere
  r = await call("POST", "/structure/path", { pathwayType: "INDIVIDUAL", pathway: { key: tr }, program: { label: "Old visits (test)" }, category: { label: "Old visit (test)" }, subCategory: null });
  const oldProg = r.body.created?.find((c: any) => c.level === "program")?.key, oldCat = r.body.leaf?.key;
  r = await call("POST", "/structure/path", { pathwayType: "INDIVIDUAL", pathway: { key: tr }, program: { key: vis }, category: { label: "Gone visa (test)" }, subCategory: null });
  const gone = r.body.leaf?.key;
  sql(`update program_def set retired_at = now() where program_node_key = '${gone}'`);
  r = await call("POST", "/combinations/start", { nodeKey: gone });
  const goneRow = (await call("GET", "/structure?pathwayType=INDIVIDUAL&retired=1")).body.nodes.find((n: any) => n.key === gone);
  ok("M3 fail: a retired name can't start setup (409, plain words); its row says the same", r.status === 409 && r.body.detail === "Can't start setup: it is retired. Restore it first." && goneRow?.combination?.startWhy === r.body.detail && sql(`select count(*) from combination c join program_def p on p.id=c.program_def_id where p.program_node_key='${gone}'`) === "0", { status: r.status, detail: r.body.detail, row: goneRow?.combination?.startWhy });
  sql(`update program_def set retired_at = now() where program_node_key = '${oldProg}'`);
  r = await call("POST", "/combinations/start", { nodeKey: oldCat });
  ok("M3 fail: a name under a retired one can't start setup, naming it", r.status === 409 && r.body.detail === `Can't start setup: "Old visits (test)" above it is retired.`, r.body.detail);
  sql(`update program_def set retired_at = null where program_node_key = '${oldProg}'`);
  sql(`update program_def set created_by = 'user-C' where program_node_key in ('${oldProg}', '${oldCat}')`);
  r = await call("DELETE", `/structure/nodes/${encodeURIComponent(oldProg)}`, { reason: "Not offered (Sample)" });
  const del = r.body;
  r = await call("POST", "/combinations/start", { nodeKey: oldCat });
  const rowW = (await nodes()).find((n) => n.key === oldCat), cardW = await card(oldCat);
  ok("M3 fail: a name under a waiting deletion can't start setup (409); the Program structure row and the Immigration programs card say the same", del.status === "WAITING" && r.status === 409 && r.body.detail === `Can't start setup: a change to "Old visits (test)" waits for a second person. Withdraw it, or wait for the decision.` && rowW?.combination?.startWhy === r.body.detail && cardW?.startWhy === r.body.detail, { status: r.status, detail: r.body.detail, row: rowW?.combination?.startWhy, card: cardW?.startWhy });
  await call("POST", `/library/changes/${del.id}/withdraw`, { note: "Kept (Sample)." });
  r = await call("POST", "/combinations/start", { nodeKey: oldCat });
  const cardOk = await card(tv);
  ok("M3 pass-guard: withdrawn, the same name starts; a Not started card with nothing in the way has no reason", r.status === 201 && r.body.created === true && (await card(oldCat))?.combinationId === r.body.combination.id && (cardOk?.startWhy ?? null) === null, { status: r.status });
  r = await call("POST", "/combinations", { nodeKey: gone });
  ok("M3 fail: the older POST /combinations is held to the same guard", r.status === 409 && /it is retired/.test(r.body.detail), r.body.detail);

  // ---------------------------------------------------------------- who, and the end of the New combination page (M2)
  r = await call("POST", "/combinations/start", { nodeKey: oldCat }, "user-B");
  ok("BR-15: only a configuration author starts setup (403 in plain words)", r.status === 403 && !!r.body.detail, `${r.status} ${r.body.detail}`);
  r = await call("POST", "/combinations/start", {});
  ok("contract: Start setup without a name is 400, in plain words", r.status === 400 && /Choose a category or sub-category/.test(JSON.stringify(r.body)), r.body.detail);
  const pathGone = await call("POST", "/combinations/path", { pathway: "INDIVIDUAL", program: { create: "X" }, category: { create: "Y" } });
  const propGone = await call("POST", "/path-proposal", { pathway: "INDIVIDUAL", description: "visitor visa" });
  ok("M2: the New combination page's endpoints are gone (POST /combinations/path and POST /path-proposal: 404)", pathGone.status === 404 && propGone.status === 404, [pathGone.status, propGone.status]);

  for (const f of copies) rmSync(join(RUNS, f), { force: true });
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { for (const f of copies) rmSync(join(RUNS, f), { force: true }); console.error("FAIL  unexpected", e); process.exit(1); });
