// qa after-merge on the screens S1/S2 FIX (PR #59, main 027174d), 27 Oct: what the two earlier qa checks do not cover.
// Review m1, as of QA-184 (#793, 4 Nov): every card's progress is the setup checklist's five steps (P-157), at the step
// its next item is on, in the card's own words ("n of 5 steps", or "✓ Live · Next release: n of 5 steps to do"). Break m8: every configuration read refuses nobody (401) and case people
// (403) while the configuration people read (STANDARDS §6, deny by default). QA-51: To review names the Pathway type in
// the trail. QA-52: approving a removal of an unused name says it is removed now, not "released with the next release".
// QA-54: a case person who opens a Studio page by its address is told so, not "restart the studio".
// Fails today mark findings. Real PostgreSQL; one saved replay (US$0).
//   zsh studio/tools/isolated.sh qa_fix 4472 start && node studio/tests/qa/check_qa_am_fix_1027.cjs 4472 [xr_studio_qa_fix]
const { chromium } = require("../../node_modules/playwright");
const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const PORT = Number(process.argv[2] ?? 4472), BASE = `http://localhost:${PORT}`, DB = process.argv[3] ?? "xr_studio_qa_fix";
const PSQL = ["/opt/homebrew/opt/postgresql@18/bin/psql", "/usr/local/bin/psql"].find((x) => fs.existsSync(x));
const sql = (q) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).replace(/\s+/g, " ").slice(0, 260)}` : ""}`); };
const STEP_KEYS = ["pages", "people", "forms", "questions_documents", "release"]; // contracts/setup-checklist.ts
const atStep = (setup) => { const k = setup?.next?.step ?? setup?.current; return k ? STEP_KEYS.indexOf(k) + 1 : 5; };
const words = (setup) => (setup?.chip?.status === "LIVE" && setup.bar.next ? `${setup.bar.text} · ${setup.bar.next}` : setup?.bar?.text);

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" })).newPage();
  const api = async (pth, init = {}) => { const h = { "content-type": "application/json" }; if (init.actor !== null) h["x-actor"] = init.actor ?? "user-A"; const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: h, data: init.data, timeout: 240000 }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const cat = async () => (await api("/catalogue?pathway=INDIVIDUAL&filter=all")).body;

  // ======================================================== setup: sample, then two combinations waiting on a person
  await p.goto(BASE); await p.evaluate(() => localStorage.setItem("xr-actor", "user-A"));
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  await api("/demo/load", { method: "POST" });
  const sv = (await cat()).rows.find((x) => x.nodeKey === "individual.visitors.super_visa");
  const att = (await api(`/combinations/${sv.combinationId}/attachments`)).body.find((a) => /IMM 5257 \(/.test(a.edition ?? ""));
  const run = ((await api(`/attachments/${att.id}/draft-options`)).body.saved_runs ?? []).find((x) => x.valid);
  await api(`/attachments/${att.id}/draft`, { method: "POST", data: { mode: "replay", runFile: run.file } });
  for (let i = 0; i < 60; i++) { if ((await cat()).rows.find((x) => x.nodeKey === sv.nodeKey).aiProposals > 0) break; await p.waitForTimeout(500); }
  const ss = (await api("/combinations", { method: "POST", data: { nodeKey: "individual.work_permits.open.spouse_student" } })).body.combination;
  await api(`/combinations/${ss.id}/lines`, { method: "POST", data: { kind: "FORM", formKey: "IMM 1295" } });
  await api(`/combinations/${ss.id}/submit`, { method: "POST", data: {} });
  const sme = ((await api(`/combinations/${ss.id}/review`)).body.submission?.changeSummary ?? []).filter((x) => x.needs_sme).map((x) => `${x.kind}|${x.key}`);
  if (sme.length) await api(`/combinations/${ss.id}/signoff`, { method: "POST", actor: "user-C", data: { items: sme, action: "signed" } });
  await api("/pack/release", { method: "POST", actor: "user-B", data: { expectedChanges: (await api("/draft")).body.changes } });
  const c = await cat();
  const svRow = c.rows.find((r) => r.nodeKey === sv.nodeKey), ssRow = c.rows.find((r) => r.nodeKey === "individual.work_permits.open.spouse_student");
  // 4 Nov: since the release gate refuses a combination with something missing, Spouse of a student stays In setup
  // (not released) rather than released and Not ready; m1 only needs it not Live with something missing.
  step("setup: Super visa has AI proposals to review; Spouse of a student is not Live and has something missing", svRow.aiProposals > 0 && !ssRow.live && ssRow.nextAction?.kind === "see_missing", `${svRow.nextAction?.kind} / ${ssRow.status} ${ssRow.nextAction?.kind}`);

  // ======================================================== review m1 (QA-184): one five-step count, from the checklist
  const started = c.rows.filter((r) => r.combinationId && r.setup);
  const bad = started.filter((r) => r.progress.of !== 5 || r.progress.step !== atStep(r.setup) || r.progress.label !== words(r.setup)).map((r) => `${r.label}: ${r.progress.step} of ${r.progress.of} "${r.progress.label}" vs checklist ${atStep(r.setup)} "${words(r.setup)}"`);
  step("review m1 C11.10 QA-184: for every started combination, /catalogue's progress is out of 5, at the step of the checklist's next item, in the card's words (API)", bad.length === 0, bad.join("; ") || `${started.length} started`);
  step("review m1: Not ready with something missing is not shown as Live (Spouse of a student)", !ssRow.progress.live && !/Live/.test(ssRow.progress.label), `${ssRow.progress.label} / step ${ssRow.progress.step} of ${ssRow.progress.of}`);
  step("review m1: AI proposals to review keep the card off the last step (Super visa)", svRow.progress.step < 5 && /of 5 steps/.test(svRow.progress.label), `${svRow.progress.label} / step ${svRow.progress.step}`);
  await p.goto(BASE); await p.waitForSelector("article[data-node]");
  const seen = await p.evaluate(() => [...document.querySelectorAll("article[data-node]")].map((a) => ({ label: a.getAttribute("data-label"), state: a.getAttribute("data-state"), said: (a.getAttribute("aria-label") ?? "") + " | " + (a.querySelector("[data-progress]")?.textContent ?? "") })));
  const pageBad = seen.filter((x) => /of 4\b|Step \d of/.test(x.said) || x.state === "LIVE" && !/Live/.test(x.said) || x.state !== "LIVE" && /✓ Live/.test(x.said)).map((x) => `${x.label} (${x.state}): "${x.said}"`);
  step("review m1 C11.10: on the page no card names a four-step count, and Live shows only on Live cards", pageBad.length === 0, pageBad.join("; ") || seen.slice(0, 6).map((x) => `${x.label}: ${x.said.split(" | ")[1]}`).join("; "));
  const live = seen.find((x) => x.label === "With an LMIA" && x.state === "LIVE");
  const liveRow = c.rows.find((r) => r.label === "With an LMIA" && r.progress.live);
  step("review m1 QA-184: a Live card says Live first, then its next release's count when anything is open", !!live && /Live/.test(live.said) && (!liveRow?.setup?.bar?.next || live.said.includes(liveRow.setup.bar.next.replace(/^Next release: /, ""))), live?.said);

  // ======================================================== break m8: configuration reads, deny by default
  const id = svRow.combinationId;
  const reads = ["/catalogue?pathway=INDIVIDUAL", "/structure?pathwayType=INDIVIDUAL", "/path-options?pathway=INDIVIDUAL", "/structure/nodes/individual.visitors/uses",
    `/combinations/${id}`, `/combinations/${id}/config`, `/combinations/${id}/review`, `/combinations/${id}/preview`, `/combinations/${id}/attachments`,
    "/library/fields", "/library/forms", "/library/sections", "/library/document-types", "/library/changes", "/review-queue", "/draft", "/masters", "/official-library", "/intake/held", "/ai/batches", "/ledger"];
  const open = [];
  for (const r of reads) {
    const s = { none: (await api(r, { actor: null })).status, officer: (await api(r, { actor: "user-O" })).status, client: (await api(r, { actor: "user-P" })).status, author: (await api(r)).status };
    if (s.author !== 200) open.push(`${r.split("?")[0]} author ${s.author}`);
    else if (s.none !== 401 || s.officer !== 403 || s.client !== 403) open.push(`${r.split("?")[0].replace(id, ":id")} ${s.none}/${s.officer}/${s.client}`);
  }
  step("break m8 C11.10: the five S2 reads (catalogue, structure, path options, where used, name check) refuse nobody 401 and case people 403", !open.some((x) => /^\/(catalogue|structure|path-options)/.test(x)), open.filter((x) => /^\/(catalogue|structure|path-options)/.test(x)).join("; "));
  step("QA-53 STANDARDS §6: every configuration read refuses nobody (401) and case people (403), not only the S2 ones", open.length === 0, `open to nobody/officer/client: ${open.join("; ")}`);
  const refusal = await api("/catalogue?pathway=INDIVIDUAL", { actor: "user-P" });
  step("break m8: the refusal is a Problem Details in plain words", refusal.status === 403 && /works on cases/.test(refusal.body?.detail ?? ""), refusal.body?.detail);
  for (const page of ["/", "/structure"]) {
    await p.evaluate(() => localStorage.setItem("xr-actor", "user-O")); await p.goto(`${BASE}${page}`); await p.waitForTimeout(2500);
    const said = (await p.locator("main").innerText()).replace(/\s+/g, " ");
    step(`QA-54: a case person who opens ${page} by its address is told it is for the configuration people (not 'could not load', Retry or 'restart the studio')`, /works on cases/.test(said) && !/could not load|restart the studio/.test(said), said.match(/could not load.*?Retry/)?.[0] ?? said.slice(0, 160));
  }
  await p.evaluate(() => localStorage.setItem("xr-actor", "user-A"));

  // ======================================================== QA-51, QA-52: To review words for a removal
  const add = await api("/structure/nodes", { method: "POST", data: { pathwayType: "INDIVIDUAL", level: "category", parentKey: "individual.visitors", label: "Visitor record", decision: "add_anyway" } });
  // P-116 amended (28 Oct): an author's own never-approved name is deleted at once; to reach the second person, the name
  // is marked as another author's first (as the screens lane's own checks do).
  sql(`update program_def set created_by='user-C' where program_node_key='${add.body.key}'`);
  const del = await api(`/structure/nodes/${add.body.key}`, { method: "DELETE", data: { reason: "qa: added by mistake" } });
  await p.evaluate(() => localStorage.setItem("xr-actor", "user-B"));
  await p.goto(`${BASE}/review/change/${del.body.id}`); await p.waitForSelector("main h1");
  const title = await p.locator("main h1").innerText();
  step("QA-46: the approver's page says Delete, as the Structure does (P-128)", /^Delete structure name/.test(title), title);
  step("QA-51 BR-7: the To review trail names the Pathway type (Retail and Corporate both have a Temporary residence)", /Retail ›/.test(title), title);
  await p.getByRole("button", { name: "Approve", exact: true }).click();
  const toast = await p.getByText(/approved/).first().innerText({ timeout: 10000 }).catch(() => "");
  const gone = !(await api("/structure?pathwayType=INDIVIDUAL")).body.nodes.some((n) => n.key === add.body.key);
  step("QA-52 P-116: approving the removal of an unused name says it is removed now (it is), not 'released with the next release'", gone && !/next release/.test(toast), `removed at once: ${gone}; message "${toast}"`);

  console.log(`${pass}/${pass + fail} passed`);
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
