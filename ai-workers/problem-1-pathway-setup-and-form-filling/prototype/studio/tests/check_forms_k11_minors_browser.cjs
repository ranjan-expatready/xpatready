// K11 (C11.15 Minors, forms): QA-78, QA-105, QA-107, QA-110 and QA-111 on the loaded demo's Study permit and Visitor
// visa, like a person, each with a passing and a failing case. The words rules alone are in check_forms_k11_words.ts.
// * QA-111: a live find the Forms tab did not start itself (the tab was reloaded while it ran) ends → the lines, the count
//   and Next step refresh without a reload.
// * QA-110: Find again → the plan dialog → Escape or Cancel puts focus back on Find again.
// * QA-105: the dialog's description says what the chosen way does (Rules only: no AI, nothing attached).
// * QA-107: "Last find … p.m." ends with one full stop; IRCC's words never keep "(opens in a new tab)".
// * QA-78: the channel choice says "Online (typed in by hand for now)", never "later wave"; attached forms not yet lines
//   show their edition, never a file name (imm5257e.pdf).
// US$0: the AI is tests/fixtures/fake-launch.mjs (honoured only in an isolated copy); canada.ca is the recorded copies.
//   zsh studio/tools/isolated.sh forms_k11 4453 start STUDIO_AI_LIVE=approved STUDIO_FAKE_LAUNCHER=ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tests/fixtures/fake-launch.mjs && node studio/tests/check_forms_k11_minors_browser.cjs 4453 xr_studio_forms_k11
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4453), DB = process.argv[3] ?? "xr_studio_forms_k11";
const BASE = `http://localhost:${PORT}`;
const VAR = path.join(__dirname, "..", "var", `isolated-${DB.replace(/^xr_studio_/, "")}`);
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail !== undefined ? ` — ${String(typeof detail === "string" ? detail : JSON.stringify(detail)).slice(0, 300)}` : ""}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const call = async (method, pth, body, actor = "user-A") => {
  const r = await fetch(`${BASE}/api${pth}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
};
const finish = async (id) => {
  let r;
  for (let i = 0; i < 180; i++) { r = await call("GET", `/form-finder/runs/${id}`); if (!["QUEUED", "RUNNING"].includes(r.body?.status)) return r.body; await sleep(500); }
  throw new Error(`the find did not end in 90 s: ${JSON.stringify(r?.body?.steps).slice(0, 300)}`);
};
const start = async (combo, mode, key) => {
  const plan = (await call("POST", `/combinations/${combo}/forms/find/plan`, { mode })).body;
  const run = await call("POST", `/combinations/${combo}/forms/find`, { mode, planSha256: plan.plan_sha256, idempotencyKey: key });
  if (run.status >= 300) throw new Error(`find: ${JSON.stringify(run.body).slice(0, 300)}`);
  return run.body.id;
};
const focused = (p) => p.evaluate(() => { const a = document.activeElement; return a ? `${a.tagName}${a.getAttribute("data-find-forms") ? `[data-find-forms=${a.getAttribute("data-find-forms")}]` : ""}` : "none"; });

(async () => {
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const load = await call("POST", "/demo/load");
  if (load.status >= 300) throw new Error(`demo load: ${JSON.stringify(load.body).slice(0, 300)}`);
  const sp = sql("select id from combination where label='Study permit' limit 1"), vv = sql("select id from combination where label='Visitor visa' limit 1");

  // Rules first: the numbers printed on Study permit's pages, each with its sentence (the quotes the rounds use).
  const rules = await finish(await start(sp, "rules", "k11-rules-1"));
  const printed = rules.result?.rules_only ?? [];
  const q = (c) => printed.find((p) => p.code === c)?.sentence;
  step("setup: Study permit's pages print IMM 1294 and IMM 5707", ["IMM 1294", "IMM 5707"].every((c) => !!q(c)), printed.map((p) => p.code));
  const added = await call("POST", `/combinations/${sp}/forms`, { formKey: "IMM 5707" });
  step("setup: a person attaches IMM 5707 to Study permit (the tab has lines and a Find again)", added.status < 300, added.body);

  // Safety first: the stand-in launcher must answer, or no live step runs.
  fs.mkdirSync(VAR, { recursive: true }); fs.rmSync(path.join(VAR, "fake-launch.log"), { force: true });
  fs.writeFileSync(path.join(VAR, "fake-launch.json"), JSON.stringify({ stub: { exit: 1, err: "K11 check: stand-in probe" } }));
  const probeAtt = sql(`select id from source_attachment where combination_id='${vv}' and edition like 'IMM 5257 (%' limit 1`);
  await call("POST", `/attachments/${probeAtt}/draft`, { mode: "stub" });
  for (let i = 0; i < 120 && !fs.existsSync(path.join(VAR, "fake-launch.log")); i++) await sleep(500);
  const standIn = fs.existsSync(path.join(VAR, "fake-launch.log"));
  step("safety: the stand-in launcher answers (nothing is ever sent to a model)", standIn);
  if (!standIn) throw new Error("the stand-in launcher is not active: start the copy as the usage line says");
  // Both rounds name IMM 1294 (downloaded from the recorded canada.ca and attached); each round takes 4 s, so the
  // tab can be reloaded while the find runs (QA-111's path: the run card comes from the latest read, not a click here).
  const P = (code) => ({ code, title: null, applies: "always", condition: null, who: "each_applicant", quote: q(code), filed_note: null });
  const answer = { forms: [P("IMM 1294"), P("IMM 5707")], unresolved: [] };
  const rec = { label: "K11 check", caller: "live", drafting_run: { run_id: "fake", status: "completed", usage: { cost_usd: 0.04, input_tokens: 9000, output_tokens: 800 } }, contract_valid: true, raw_output: JSON.stringify(answer) };
  const slow = { stub: { exit: 0, out: { exit: 0, status: "completed" } }, live: { exit: 0, sleep_ms: 4000, record: rec } };
  fs.writeFileSync(path.join(VAR, "fake-launch.json"), JSON.stringify({ jobs: { "studio-finder-forms-check-": slow, "studio-finder-forms-": slow } }));

  const b = await chromium.launch({ channel: "chrome", headless: true });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce", locale: "en-CA" })).newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  try {
    await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
    await p.goto(`${BASE}/c/${sp}/forms`); await p.getByRole("tablist", { name: "Combination" }).waitFor();
    await p.locator('[data-line="IMM 5707"]').waitFor({ timeout: 15_000 });

    // QA-78: the channel choice.
    const options = await p.getByRole("combobox", { name: "How IMM 5707 is filed" }).locator("option").allInnerTexts();
    step("C11.15 QA-78 pass (page): the Online choice says 'Online (typed in by hand for now)'", options.some((o) => /^Online \(typed in by hand for now\)/.test(o)), options);
    step("C11.15 QA-78 fail (page): no channel choice says 'later wave'", options.length > 0 && !options.some((o) => /later wave/i.test(o)), options);

    // QA-110 and QA-105: the plan dialog from Find again.
    const again = p.locator('[data-find-forms="again"]');
    await again.focus(); await p.keyboard.press("Enter");
    const dlg = p.getByRole("dialog"); await dlg.waitFor();
    const descId = await dlg.getAttribute("aria-describedby");
    const descOf = async () => (descId ? await p.locator(`[id="${descId}"]`).innerText() : "");
    await dlg.locator('[data-mode="rules"] input').check();
    // Each wait ends in a step: a timeout is reported as that step's FAIL, never skipped.
    const rulesShown = await p.waitForFunction((id) => /No AI, nothing is attached/.test(document.getElementById(id)?.textContent ?? ""), descId, { timeout: 5000 }).then(() => true, () => false);
    const rulesDesc = await descOf();
    step("C11.15 QA-105 pass (page): with Rules only the dialog's description says no AI and nothing is attached", rulesShown && /No AI, nothing is attached, US\$0/.test(rulesDesc) && /Sample until the immigration expert confirms/.test(rulesDesc), rulesDesc);
    step("C11.15 QA-105 fail (page): with Rules only it never says AI reads the pages or attaches what both rounds agree on", !/AI reads|attaches the ones both rounds agree on/.test(rulesDesc), rulesDesc);
    await dlg.locator('[data-mode="replay"] input').check();
    const savedShown = await p.waitForFunction((id) => /replayed at US\$0/.test(document.getElementById(id)?.textContent ?? ""), descId, { timeout: 5000 }).then(() => true, () => false);
    step("C11.15 QA-105 pass (page): with Saved it says the earlier answers are replayed at US$0", savedShown && /replayed at US\$0/.test(await descOf()), await descOf());
    await p.keyboard.press("Escape"); await dlg.waitFor({ state: "detached" });
    const backAfterEscape = await p.waitForFunction(() => document.activeElement?.getAttribute("data-find-forms") === "again", null, { timeout: 3000 }).then(() => true, () => false);
    step("C11.15 QA-110 pass (page): Escape closes the dialog and focus is back on Find again", backAfterEscape, await focused(p));
    await again.focus(); await p.keyboard.press("Enter"); await dlg.waitFor();
    await dlg.getByRole("button", { name: "Cancel" }).click(); await dlg.waitFor({ state: "detached" });
    const backAfterCancel = await p.waitForFunction(() => document.activeElement?.getAttribute("data-find-forms") === "again", null, { timeout: 3000 }).then(() => true, () => false);
    step("C11.15 QA-110 fail (page): Cancel also puts focus back on Find again, never the page body", backAfterCancel, await focused(p));

    // Review m1: "Redo with AI" from a line's menu: the menu item is gone when the dialog closes, so focus goes to the
    // line's menu button (Actions for IMM 5707).
    const menuBtn = p.getByRole("button", { name: "Actions for IMM 5707" });
    await menuBtn.focus(); await p.keyboard.press("Enter");
    await p.getByRole("menuitem", { name: /Redo with AI/ }).waitFor(); await p.getByRole("menuitem", { name: /Redo with AI/ }).focus(); await p.keyboard.press("Enter");
    await dlg.waitFor(); await p.keyboard.press("Escape"); await dlg.waitFor({ state: "detached" });
    const backOnMenu = await p.waitForFunction(() => document.activeElement?.getAttribute("aria-label") === "Actions for IMM 5707", null, { timeout: 3000 }).then(() => true, () => false);
    step("C11.15 QA-110 pass (page, review m1): Redo with AI from a line's menu, then Escape: focus is on that line's menu button", backOnMenu, await p.evaluate(() => `${document.activeElement?.tagName} ${document.activeElement?.getAttribute("aria-label") ?? ""}`));

    // QA-111: a live find started elsewhere; the tab is reloaded while it runs, then left alone until it ends.
    step("C11.15 QA-111 setup: IMM 1294 is not a line yet", (await p.locator('[data-line="IMM 1294"]').count()) === 0);
    const runId = await start(sp, "live", "k11-live-1");
    // qa saw it once: a race between the run card's own poll and the latest read. The run card is held on "running" here
    // (its poll answers the real run with its status kept RUNNING), so only the latest read can see the end: before the
    // fix, the card then unmounted without refreshing the lines; with it, the strip refreshes them itself.
    const cardPoll = new RegExp(`/api/runs/${runId}$`);
    await p.route(cardPoll, async (route) => { const r = await route.fetch(); const j = await r.json(); await route.fulfill({ response: r, json: { ...j, status: "RUNNING" } }); });
    await p.reload(); await p.locator('[data-line="IMM 5707"]').waitFor({ timeout: 15_000 });
    const statusWhileRunning = await p.locator("[data-finder-status]").innerText();
    const run = await finish(runId);
    step("C11.15 QA-111 setup: the live find (stand-in AI) attached IMM 1294", run.status === "SUCCEEDED" || (run.result?.attach ?? []).some((a) => a.code === "IMM 1294"), { status: run.status, attach: run.result?.attach, steps: run.steps?.map((s) => s.message) });
    const appeared = await p.locator('[data-line="IMM 1294"]').waitFor({ timeout: 10_000 }).then(() => true, () => false);
    step("C11.15 QA-111 pass (page): when the find ends the new line shows without a reload", appeared, { statusWhileRunning });
    await p.unroute(cardPoll);
    const header = (await p.locator("[data-finder]").innerText()).replace(/\s+/g, " ");
    step("C11.15 QA-111 fail (page): the finder's strip no longer says the find is running", !/running now/.test(header) && /Last find today at/.test(header), header.slice(0, 300));

    // QA-107: one full stop after the time; IRCC's words without link text.
    const status = await p.locator("[data-finder-status]").innerText();
    step("C11.15 QA-107 pass (page): 'Last find today at … a.m./p.m.' ends with one full stop", /Last find today at \d{1,2}:\d\d [ap]\.m\. /.test(status) && !/\.\./.test(status), status);
    // Review m2: the recorded pages carry no link text, so the quote the page reader kept on 29 Oct is put on IMM 1294's
    // line as it was read ("… (opens in a new tab) . Pages 1 to 3 …"); the stored quote stays as read, the page drops it.
    const seeded = "Application for a study permit (IMM 1294) (opens in a new tab) . Pages 1 to 3 must be completed.";
    sql(`update combination_form set source_quote='${seeded}' where id=(select id from combination_form where combination_id='${sp}' and lineage_key='IMM 1294' order by version desc limit 1)`);
    await p.reload(); await p.locator('[data-line="IMM 1294"]').waitFor({ timeout: 15_000 });
    const lineText = (await p.locator('[data-line="IMM 1294"]').innerText()).replace(/\s+/g, " ");
    step("C11.15 QA-107 pass (page): the line shows IRCC's sentence without the link text", /Application for a study permit \(IMM 1294\)\. Pages 1 to 3 must be completed\./.test(lineText), lineText.slice(0, 300));
    step("C11.15 QA-107 fail (page): '(opens in a new tab)' is never shown, though it is stored as read", !/opens in a new tab/i.test(lineText) && sql(`select count(*) from combination_form where combination_id='${sp}' and lineage_key='IMM 1294' and source_quote like '%(opens in a new tab)%'`) !== "0", lineText.slice(0, 300));

    const ax = await new AxeBuilder({ page: p }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    step("axe (WCAG 2.2 AA): Study permit's Forms tab after the find", ax.violations.length === 0, ax.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`).join(" ; "));

    // QA-78: attached forms not yet lines name their edition, never the file.
    await p.goto(`${BASE}/c/${vv}/forms`); await p.getByRole("tablist", { name: "Combination" }).waitFor();
    await p.locator("[data-line], [data-pending], [data-forms-empty]").first().waitFor({ timeout: 15_000 });
    const pend = await p.locator("[data-pending]").allInnerTexts();
    step("C11.15 QA-78 pass (page): Visitor visa's forms not yet lines name their edition", pend.length > 0 && pend.every((t) => /IMM \d{4} \(/.test(t)), pend.map((t) => t.slice(0, 80)));
    step("C11.15 QA-78 fail (page): no file name (imm5257e.pdf) on those rows", pend.length > 0 && !pend.some((t) => /\.pdf\b/i.test(t)), pend.map((t) => t.slice(0, 120)));
    step("no page errors", errs.length === 0, errs.join(" | "));
  } finally { await b.close(); }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
