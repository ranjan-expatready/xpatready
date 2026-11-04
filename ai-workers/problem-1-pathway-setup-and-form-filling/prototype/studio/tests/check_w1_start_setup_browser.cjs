// S3 Start setup in the browser (P-125, P-123, P-110 amended; screens/W1-start-setup/challenge.md, agreed 28 Oct), at
// 1440 and 1024 px (wave 1 is desktop only). Item 5: the landing is S5's Forms tab and the offer is its "No form find yet"
// slot; a run that could not pick the application page leads to choosing it there (QA-63); a saved answer loads by itself. A Not started card offers Start setup with its "i" (what it does, an example,
// how cases use it once Live); greyed under a waiting change, the reason is written under it (M3). Start setup creates the
// setup and opens it on "Sources and forms", its place read-only in level colours (m6); with no saved answer nothing runs
// and one button offers "Find forms with AI (about US$…)", the worst case in its tip; the click starts the run and the
// shared run card shows it (M1, M4). The New combination page is gone (M2). Sample inputs; canada.ca is the recorded
// copies and the AI is tests/fixtures/fake-launch.mjs (isolated copy only): US$0. Screenshots into
// product/screens/W1-start-setup/screenshots/, axe (WCAG 2.2 AA) on each.
//   zsh studio/tools/isolated.sh screens_s3b 4437 start STUDIO_AI_LIVE=approved STUDIO_FAKE_LAUNCHER=ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tests/fixtures/fake-launch.mjs && node studio/tests/check_w1_start_setup_browser.cjs 4437 xr_studio_screens_s3b
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4437), BASE = `http://localhost:${PORT}`, DB = process.argv[3] ?? "xr_studio_screens_s3b";
const SHOTS = path.join(__dirname, "..", "..", "..", "product", "screens", "W1-start-setup", "screenshots"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
// Fix pass (S3 early look): the stand-in launcher's answer, in this copy's own folder: the raw text a real launcher failure
// prints (an error code, a server path, a stack line), which the page must never show (fix 1).
const VAR = path.join(__dirname, "..", "var", `isolated-${DB.replace(/^xr_studio_/, "")}`);
const RAW = "Error: ENOENT: no such file or directory, open '/Users/someone/studio/var/fake-launch.json'\n    at Object.openSync (node:fs:573:18) { errno: -2, syscall: 'open' } Node.js v24.21.0";
const TECH = /ENOENT|errno|syscall|\/Users\/|node:fs|Node\.js v/;
const COST = /(about US\$\d+\.\d\d · )?at most US\$\d+\.\d\d/;
// Scaffolding (P-33, said here): the only saved finder answer is the sample's Visitor visa; to show a saved answer loading
// by itself, the check copies it under its own combination's key, then removes the copies.
const RUNS = path.join(__dirname, "..", "..", "p2", "runs");
const SAVED = ["studio-finder-forms-individual-visitors-visitor-visa-live-20261027t072426546z-4d8a0d.json", "studio-finder-forms-check-individual-visitors-visitor-visa-live-20261027t072500006z-a569fb.json"];
const copies = [];
const saveFor = (key) => SAVED.forEach((f, i) => {
  const r = JSON.parse(fs.readFileSync(path.join(RUNS, f), "utf8")); r.drafting_run.inputs.combination = key;
  const name = `${i ? "studio-finder-forms-check" : "studio-finder-forms"}-s3browser-live-20261029t00000000${i}z-s3brw${process.pid}.json`;
  fs.writeFileSync(path.join(RUNS, name), JSON.stringify(r)); copies.push(name);
});
const removeCopies = () => { for (const f of copies.splice(0)) fs.rmSync(path.join(RUNS, f), { force: true }); };
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${(typeof detail === "string" ? detail : JSON.stringify(detail)).replace(/\s+/g, " ").slice(0, 260)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" })).newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, data: init.data }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const as = async (id) => { await p.evaluate((x) => { try { localStorage.setItem("xr-actor", x); } catch { /* ignore */ } }, id); };
  const ready = () => p.waitForFunction(() => !document.querySelector('[aria-busy="true"]') && !!document.querySelector("main h1"), null, { timeout: 30000 });
  // P-214 (#785, run 41777750324, both attempts on GitHub): the Forms panel first says "Counting the forms on this
  // combination…" and only then shows its slot and buttons; read it after that text is gone (at most 30 s).
  const formsCounted = () => p.waitForFunction(() => !(document.querySelector("main")?.innerText ?? "").includes("Counting the forms on this combination"), null, { timeout: 30000 }).catch(() => undefined);
  let n = 0;
  const state = async (name, full = true) => {
    n++; const base = `${String(n).padStart(2, "0")}-${name}`;
    for (const [w, h] of [[1440, 900], [1024, 768]]) {
      await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(300);
      await p.screenshot({ path: path.join(SHOTS, `${base}-${w}.png`), fullPage: full });
      step(`${w} px: ${name} has no sideways scroll`, !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
    }
    await p.setViewportSize({ width: 1440, height: 900 }); await p.waitForTimeout(200);
    const v = (await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations;
    step(`axe: ${name} has no WCAG A/AA violation`, !v.length, v.map((x) => `${x.id} (${x.nodes.length}): ${x.nodes[0]?.target?.join(" ")}`).join(" | "));
  };
  const tipOf = async (loc) => { await loc.hover(); await p.waitForTimeout(700); const t = await p.locator("[role=tooltip]").first().innerText().catch(() => ""); await p.mouse.move(0, 0); await p.waitForTimeout(200); return t; };

  await p.goto(BASE); await as("user-A");
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  step("setup: sample inputs loaded", (await api("/demo/load", { method: "POST" })).status === 201);
  // A Not started combination to start, and one under a Program whose deletion waits for a second person (M3).
  const add = async (level, parentKey, label) => (await api("/structure/nodes", { method: "POST", data: { pathwayType: "INDIVIDUAL", level, parentKey, label, decision: "add_anyway" } })).body.key;
  const fresh = await add("category", "individual.visitors", "Transit visa (S3)");
  const closing = await add("program", "retail.temporary_residence", "Closing program (S3)"), held = await add("category", closing, "Held visa (S3)");
  sql(`update program_def set created_by = 'user-C' where program_node_key in ('${closing}', '${held}')`);
  const del = await api(`/structure/nodes/${encodeURIComponent(closing)}`, { method: "DELETE", data: { reason: "Not offered (Sample)" } });
  step("setup: two Not started names, one under a waiting deletion", !!fresh && !!held && del.body?.status === "WAITING", del.body?.status);

  // ======================================================== the card: Start setup with its "i"; greyed with the reason
  await p.goto(`${BASE}/?v=cards&f=all`); await ready(); await p.waitForTimeout(400);
  const card = (key) => p.locator(`article[data-node="${key}"]`);
  const go = card(fresh).locator("[data-start-setup]");
  const tip = await tipOf(go);
  step("m5 / P-125 (3): a Not started card's next step is Start setup; its 'i' says what it does, with an example and how cases use it once Live", (await go.innerText()).trim() === "Start setup" && /Creates the setup of "Transit visa \(S3\)" and opens it/.test(tip) && /Once released and Live, new cases for Transit visa \(S3\) use this setup/.test(tip), tip);
  const heldText = (await card(held).innerText()).replace(/\s+/g, " ");
  step("M3: under a waiting deletion Start setup is greyed and the reason is written under it", (await card(held).locator("[data-start-setup]").getAttribute("aria-disabled")) === "true" && heldText.includes(`Can't start setup: a change to "Closing program (S3)" waits for a second person.`), heldText.slice(-200));
  await card(held).locator("[data-start-setup]").click({ force: true }); await p.waitForTimeout(500);
  step("M3 fail: clicking the greyed Start setup starts nothing", new URL(p.url()).pathname === "/" && sql(`select count(*) from combination c join program_def d on d.id=c.program_def_id where d.program_node_key='${held}'`) === "0");
  await state("card-start-setup");

  // ======================================================== item 5: the landing is S5's Forms tab; its slot holds the one offer
  await go.click();
  await p.waitForURL(/\/c\/[0-9a-f-]+\/forms/); await ready();
  const cid = p.url().split("/c/")[1].split("/")[0];
  const panel = p.locator("[data-finder]");
  await panel.locator("[data-finder-start] [data-find-forms]").waitFor({ timeout: 15000 });
  const place = p.getByRole("navigation", { name: "Path" });
  const colours = await place.locator("[data-place]").evaluateAll((xs) => xs.map((x) => getComputedStyle(x).color));
  step("m6: the place is shown in its level colours, as links back to the lists, with nothing to change it here", (await place.innerText()).includes("Visitors") && new Set(colours).size >= 2 && await p.locator("main").getByRole("textbox", { name: /Program|Category|Pathway/ }).count() === 0, colours.join(" | "));
  await formsCounted();
  step("item 5: Start setup lands on S5's Forms tab; the Start setup block is the finder's 'No form find yet' slot, one block with one find button", (await p.getByRole("tab", { selected: true }).innerText()).replace(/\s*\d+ to (do|fix)( \d+ to fix)?$/, "").replace(/\d+$/, "").trim() === "Forms" /* X1: the tab may carry its setup count; UX-A part 1: "4 to do" */ && /No form find yet/.test(await panel.innerText()) && await p.locator("main [data-find-forms]").count() === 1 && await p.locator("main [data-finder-start]").count() === 1 && await p.locator("main [data-finder]").count() === 1, { tab: await p.getByRole("tab", { selected: true }).innerText().catch(() => ""), panel: (await panel.innerText()).slice(0, 200) });
  // QA-119: the header's Next step is the setup checklist's next item (step 2 here: the people list, the immigration
  // expert's), not "Find forms"; the one find button stays the finder slot's.
  const head = p.locator("[data-header-next]");
  const nx = (await api(`/combinations/${cid}/summary`)).body.setup.next;
  await p.waitForFunction((f) => document.querySelector("[data-header-next]")?.getAttribute("data-header-next") === f, nx.item.focus, { timeout: 15000 });
  step("S3 fix 2 (QA-119): one call to action: the header names the checklist's next item, with no Add sources and no second find button", (await head.innerText()).includes(nx.item.text) && await p.getByText("Add sources").count() === 0 && await p.locator("[data-find-forms]").count() === 1, await head.innerText());
  const offerBtn = panel.locator("[data-find-forms]");
  const label = (await offerBtn.innerText()).trim();
  const offerTip = await tipOf(offerBtn);
  const words = /\((.*)\)$/.exec(label)?.[1] ?? "";
  step("M1 founder (wait for a click): with no saved answer the slot offers 'Find forms with AI (about US$… · at most US$…)', and nothing has run", /^Find forms with AI \(/.test(label) && new RegExp(`^${COST.source}$`).test(words) && (await offerBtn.getAttribute("data-find-forms")) === "live" && sql(`select count(*) from ai_batch where scope_label like '${cid}|%'`) === "0", label);
  step("M1 / S3 fix 4: its tip states the cost in the button's words, before anything is spent", offerTip.toLowerCase().includes(`${words.toLowerCase()} (`) && /\. Nothing is spent until you click\.$/.test(offerTip), { words, offerTip });
  // QA-98: one run, one stated cost: the tip names what each AI step reserves, and those add up to the button's "at most".
  const usdOf = (t) => Number(/at most US\$(\d+\.\d\d)/.exec(t)?.[1] ?? NaN);
  const tipSteps = [...offerTip.matchAll(/([^(·]+?): at most US\$(\d+\.\d\d)/g)].map((m) => ({ label: m[1].trim(), usd: Number(m[2]) }));
  const cents = (a) => Math.round(a.reduce((s, x) => s + x, 0) * 100);
  const buttonWorst = usdOf(words);
  step("C11.15: QA-98: the button's tip lists each AI step's reserve (the page pick and both forms rounds), and they add up to its 'at most'", tipSteps.length === 3 && cents(tipSteps.map((s) => s.usd)) === Math.round(buttonWorst * 100), { tipSteps, buttonWorst });
  fs.writeFileSync(path.join(VAR, "fake-launch.json"), JSON.stringify({ stub: { exit: 1, err: RAW, sleep_ms: 5000 } })); // the run stays active long enough for its card to be read
  await p.evaluate(() => document.activeElement?.blur?.());
  await state("just-started");

  // ======================================================== the click: the run on the Forms tab's card, then the page choice
  await offerBtn.click();
  // The card shows only while the run is active, and a stand-in that fails at once could end before the card's first
  // fetch on GitHub's 2-core machine (cardCost "" in #111, #120): the stand-in above now takes 5 s, and the cost line is
  // waited for (up to 30 s, with text) and read from that same element; a timeout is a named failure, never swallowed.
  const costEl = panel.locator("[data-run-cost]").filter({ hasText: /\S/ }).first();
  const costWait = await costEl.waitFor({ state: "visible", timeout: 30000 }).then(() => "", (e) => e.message.split("\n")[0]);
  step("S3 fix 4: the run card shows its cost line within 30 s of the click", !costWait, costWait || "shown");
  const batches = sql(`select count(*) from ai_batch where scope_label like '${cid}|%' and mode = 'LIVE'`);
  const runId = sql(`select id from ai_batch where scope_label like '${cid}|%' order by started_at desc limit 1`);
  step("M1 / M4: the click starts the live run (the fake launcher here, US$0) and the Forms tab's run card shows it", batches === "1" && !!runId, batches);
  const cardCost = costWait ? "" : (await costEl.innerText({ timeout: 5000 }).catch(() => "")).trim();
  step("S3 fix 4: the run card's cost says the button's words (about US$x · at most US$y), then what it spent", cardCost.startsWith(`${words} · US$`), { cardCost, words });
  await panel.locator('[data-find-forms="page"]').waitFor({ timeout: 30000 }).catch(() => undefined);
  await formsCounted();
  const panelText = await panel.innerText();
  step("S3 fix 1: the stand-in launcher answered with raw text (an error code, a server path, a stack line)", fs.readFileSync(path.join(VAR, "fake-launch.log"), "utf8").includes('"mode":"stub"') && TECH.test(RAW));
  step("S3 fix 1: the page shows none of it", !TECH.test(await p.locator("main").innerText()), panelText.slice(0, 200));
  step("item 5 / fix 3: a run that attached nothing waits for the application page; the one call to action is choosing it (no second find button, no dead end)", /Waiting for you: choose the application page/.test(panelText) && await p.locator("main [data-find-forms]").count() === 1 && (await panel.locator("[data-find-forms]").innerText()).trim() === "Choose the page and find again", panelText.slice(0, 260));
  await state("after-run-nothing-attached");

  await panel.locator('[data-find-forms="page"]').click();
  const dlg = p.locator("[data-find-dialog]"); await dlg.waitFor();
  const PAGE = "https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/apply-visitor-visa.html";
  await dlg.locator("[data-page-other]").fill(PAGE);
  await dlg.locator("[data-find-plan]").waitFor({ timeout: 15000 }).catch(() => undefined);
  await formsCounted();
  const planCost = (await dlg.locator("[data-find-cost]").innerText().catch(() => "")).trim();
  step("item 5: 'Choose the page and find again' opens the page choice; a canada.ca page is taken and the plan reads only it (no AI round to pick the page)", await dlg.locator("[data-page-choice]").count() === 1 && !/AI picks the application package/.test(await dlg.innerText()) && !!planCost, planCost);
  step("S3 fix 4: the Find dialog says the cost in the same words", planCost.toLowerCase().startsWith(words.toLowerCase().replace(/ · at most.*/, "")), { planCost, words });
  // QA-98: the dialog states its own plan the same way: each AI step's reserve beside it, the sum its "at most". With the
  // page chosen, the page-pick step has no AI round and no reserve, so this run states less than the button's run did,
  // by exactly the page pick's reserve: two plans, each stating one cost, never one run with two.
  const dlgSteps = await dlg.locator("[data-step-reserve]").allInnerTexts();
  const dialogWorst = usdOf(planCost);
  const pagePick = tipSteps[0]?.usd ?? NaN;
  step("C11.15: QA-98: the dialog lists each AI step's reserve; they add up to its 'at most'; the forms rounds reserve what the tip said", dlgSteps.length === 2 && cents(dlgSteps.map(usdOf)) === Math.round(dialogWorst * 100) && JSON.stringify(dlgSteps.map(usdOf)) === JSON.stringify(tipSteps.slice(1).map((s) => s.usd)), { dlgSteps, dialogWorst, tipSteps });
  step("C11.15: QA-98 fail: with the page chosen the page pick reserves nothing and is not an AI step; the dialog's 'at most' is the button's less the page pick", /Use the application page already chosen \(no AI round\)/.test(await dlg.innerText()) && Math.round((buttonWorst - pagePick) * 100) === Math.round(dialogWorst * 100) && dialogWorst < buttonWorst, { buttonWorst, pagePick, dialogWorst });
  const noPage = (await api(`/combinations/${cid}/forms/find/plan`, { method: "POST", data: { mode: "live" } })).body ?? {};
  const crossed = await api(`/combinations/${cid}/forms/find`, { method: "POST", data: { mode: "live", pageUrl: PAGE, planSha256: noPage.plan_sha256 ?? "x", idempotencyKey: `qa98-${process.pid}` } });
  step("C11.15: QA-98 fail: a run is never started on another plan than the one whose cost was stated (the no-page plan's fingerprint with a chosen page is refused)", !!noPage.plan_sha256 && crossed.status === 409 && sql(`select count(*) from ai_batch where scope_label like '${cid}|%' and mode = 'LIVE'`) === "1", { status: crossed.status, title: crossed.body?.title });
  await state("page-choice");
  await dlg.locator("[data-page-other]").fill("https://example.com/forms.html"); await p.waitForTimeout(1200);
  step("item 5 fail: a page outside canada.ca is refused in plain words; Start stays off", /canada\.ca/.test(await dlg.innerText()) && await p.getByRole("button", { name: "Start" }).isDisabled(), (await dlg.innerText()).slice(-200));
  await p.keyboard.press("Escape"); await dlg.waitFor({ state: "detached" }).catch(() => undefined);
  fs.rmSync(path.join(VAR, "fake-launch.json"), { force: true });

  // The run card elsewhere (AI work) leads here, to the page choice (QA-63: never the card itself).
  await p.goto(`${BASE}/ai/${runId}`); await p.getByRole("link", { name: "Choose the application page" }).waitFor({ timeout: 20000 }).catch(() => undefined);
  const link = p.getByRole("link", { name: "Choose the application page" });
  step("item 5 (QA-63): the run's own card links to choosing the page, on the combination's Forms tab", (await link.getAttribute("href")) === `/c/${cid}/forms?find=page`, await link.getAttribute("href").catch(() => null));
  await link.click(); await p.locator("[data-page-choice]").waitFor({ timeout: 15000 }).catch(() => undefined);
  step("item 5 (QA-63): following it opens the page choice there", await p.locator("[data-page-choice]").count() === 1 && /\/forms$/.test(new URL(p.url()).pathname) && !new URL(p.url()).searchParams.has("find"));
  await p.keyboard.press("Escape");

  // ======================================================== a saved answer: Start setup loads it at US$0 by itself
  const visits = await add("program", "retail.temporary_residence", "Visitors (S3 saved)");
  const savedKey = await add("category", visits, "Visitor visa");
  saveFor(savedKey);
  await p.goto(`${BASE}/?v=cards&f=all`); await ready(); await p.waitForTimeout(400);
  await card(savedKey).locator("[data-start-setup]").click();
  await p.waitForURL(/\/c\/[0-9a-f-]+\/forms/); await ready();
  const sid = p.url().split("/c/")[1].split("/")[0];
  for (let i = 0; i < 60 && !/AI found [1-9]/.test(await panel.innerText().catch(() => "")); i++) await p.waitForTimeout(500);
  for (let i = 0; i < 120 && /QUEUED|RUNNING/.test(sql(`select status from ai_batch where scope_label like '${sid}|%' order by started_at desc limit 1`)); i++) await p.waitForTimeout(500);
  await p.reload(); await ready(); await panel.waitFor(); await p.waitForTimeout(800);
  const savedText = await panel.innerText();
  step("M1: a saved answer is loaded by itself at US$0: the Forms tab says what AI found from saved answers, with no offer to pay", /AI found [1-9]\d* forms? for this combination/.test(savedText) && /· Saved, US\$0/.test(savedText) && await p.locator('main [data-find-forms="live"]').count() === 0 && sql(`select count(*) from ai_batch where scope_label like '${sid}|%' and mode = 'REPLAY'`) === "1", savedText.slice(0, 200));
  await p.evaluate(() => window.scrollTo(0, 0));
  await state("after-saved-replay", false); // a long page: the window (a full-page shot splits its fixed header)
  removeCopies();

  // ======================================================== the end of the New combination page (M2)
  await p.goto(`${BASE}/new`); await p.waitForTimeout(600);
  step("M2: the New combination address is gone ('Page not found', with the way back)", await p.getByText("Page not found").count() === 1);
  step("no script error on any page", errs.length === 0, errs.join(" | "));
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { removeCopies(); console.error("FAIL  unexpected", e); process.exit(1); });
