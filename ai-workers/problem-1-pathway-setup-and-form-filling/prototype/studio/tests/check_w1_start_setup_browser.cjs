// S3 Start setup in the browser (P-125, P-123, P-110 amended; screens/W1-start-setup/challenge.md, agreed 28 Oct), at
// 1440 and 1024 px (wave 1 is desktop only). A Not started card offers Start setup with its "i" (what it does, an example,
// how cases use it once Live); greyed under a waiting change, the reason is written under it (M3). Start setup creates the
// setup and opens it on "Sources and forms", its place read-only in level colours (m6); with no saved answer nothing runs
// and one button offers "Find forms with AI (about US$…)", the worst case in its tip; the click starts the run and the
// shared run card shows it (M1, M4). The New combination page is gone (M2). Sample inputs; canada.ca is the recorded
// copies and the AI is tests/fixtures/fake-launch.mjs (isolated copy only): US$0. Screenshots into
// product/screens/W1-start-setup/screenshots/, axe (WCAG 2.2 AA) on each.
//   zsh studio/tools/isolated.sh screens_s3b 4437 start STUDIO_FAKE_LAUNCHER=ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tests/fixtures/fake-launch.mjs && node studio/tests/check_w1_start_setup_browser.cjs 4437 xr_studio_screens_s3b
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
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).replace(/\s+/g, " ").slice(0, 260)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" })).newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, data: init.data }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const as = async (id) => { await p.evaluate((x) => { try { localStorage.setItem("xr-actor", x); } catch { /* ignore */ } }, id); };
  const ready = () => p.waitForFunction(() => !document.querySelector('[aria-busy="true"]') && !!document.querySelector("main h1"), null, { timeout: 30000 });
  let n = 0;
  const state = async (name) => {
    n++; const base = `${String(n).padStart(2, "0")}-${name}`;
    for (const [w, h] of [[1440, 900], [1024, 768]]) {
      await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(300);
      await p.screenshot({ path: path.join(SHOTS, `${base}-${w}.png`), fullPage: true });
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

  // ======================================================== the landing: place read-only, the offer, nothing spent
  await go.click();
  await p.waitForURL(/\/c\/[0-9a-f-]+\/sources/); await ready();
  const cid = p.url().split("/c/")[1].split("/")[0];
  await p.locator("[data-finder-start]").waitFor({ timeout: 15000 });
  const place = p.getByRole("navigation", { name: "Path" });
  const colours = await place.locator("[data-place]").evaluateAll((xs) => xs.map((x) => getComputedStyle(x).color));
  step("m6: the place is shown in its level colours, as links back to the lists, with nothing to change it here", (await place.innerText()).includes("Visitors") && new Set(colours).size >= 2 && await p.locator("main").getByRole("textbox", { name: /Program|Category|Pathway/ }).count() === 0, colours.join(" | "));
  const head = p.locator("main [data-next-step]").first();
  step("S3 fix 2: one call to action: the page's Next step is Find forms (no Add sources) while nothing is attached", (await head.innerText()).trim() === "Find forms" && await p.getByText("Add sources").count() === 0, await head.innerText());
  await p.locator("main").click({ position: { x: 5, y: 5 } }); await head.click(); await p.waitForTimeout(800);
  step("S3 fix 2: Find forms takes the person to the finder offer's one button (focused)", await p.evaluate(() => document.activeElement?.hasAttribute("data-find-forms") ?? false));
  const offerBtn = p.locator("[data-find-forms]");
  const label = (await offerBtn.innerText()).trim();
  const offerTip = await tipOf(offerBtn);
  const words = /\((.*)\)$/.exec(label)?.[1] ?? "";
  step("M1 founder (wait for a click): with no saved answer the landing offers one button, 'Find forms with AI (about US$… · at most US$…)', and nothing has run", /^Find forms with AI \(/.test(label) && new RegExp(`^${COST.source}$`).test(words) && (await offerBtn.getAttribute("data-find-forms")) === "live" && sql(`select count(*) from ai_batch where scope_label like '${cid}|%'`) === "0", label);
  step("M1 / S3 fix 4: its tip states the cost in the button's words, before anything is spent", offerTip.toLowerCase().includes(`${words.toLowerCase()}. nothing is spent until you click.`), { words, offerTip });
  fs.writeFileSync(path.join(VAR, "fake-launch.json"), JSON.stringify({ stub: { exit: 1, err: RAW } }));
  await p.evaluate(() => document.activeElement?.blur?.());
  await state("landing-offer");

  // ======================================================== the click: the shared run card
  await offerBtn.click();
  await p.locator("[data-finder-start] [data-run-line]").first().waitFor({ timeout: 15000 }).catch(() => undefined);
  await p.waitForTimeout(1000);
  const batches = sql(`select count(*) from ai_batch where scope_label like '${cid}|%' and mode = 'LIVE'`);
  step("M1 / M4: the click starts the live run (the fake launcher here, US$0) and the shared run card shows it", batches === "1" && /Find this combination's forms|form finder|Find the application page/i.test(await p.locator("[data-finder-start]").innerText()), (await p.locator("[data-finder-start]").innerText()).slice(0, 200));
  for (let i = 0; i < 60 && /Running|Queued|Stopping/i.test(await p.locator("[data-finder-start]").innerText()); i++) await p.waitForTimeout(500);
  const block = p.locator("[data-finder-start]");
  const blockText = await block.innerText();
  step("S3 fix 1: the stand-in launcher answered with raw text (an error code, a server path, a stack line)", fs.readFileSync(path.join(VAR, "fake-launch.log"), "utf8").includes('"mode":"stub"') && TECH.test(RAW));
  step("S3 fix 1: the run card shows none of it: plain words, nothing sent, nothing charged", !TECH.test(await p.locator("main").innerText()) && /could not start on this computer, so nothing was sent and nothing was charged/.test(blockText), blockText.slice(0, 300));
  // The offer is read again once the card sees the run end: under load it arrives a moment after the card (run-suites).
  await block.locator("[data-run-status] [data-find-forms]").waitFor({ timeout: 15000 }).catch(() => undefined);
  const finds = block.locator("[data-find-forms]");
  step("S3 fix 3: after the run there is one find button, on the run card (no second 'Find again' link, no second offer)", await finds.count() === 1 && await block.locator("[data-run-status] [data-find-forms]").count() === 1 && await block.getByRole("link", { name: /Find again/ }).count() === 0 && /^Find again with AI \(/.test((await finds.innerText()).trim()), (await finds.allInnerTexts()).join(" | "));
  const cardCost = (await block.locator("[data-run-cost]").innerText()).trim();
  const againWords = /\((.*)\)$/.exec((await finds.innerText()).trim())?.[1] ?? "";
  step("S3 fix 4: the run card's cost says the button's words (about US$x · at most US$y), then what it spent", cardCost.startsWith(`${words} · US$`) && againWords === words, { cardCost, words, againWords });
  await state("landing-after-run");
  fs.rmSync(path.join(VAR, "fake-launch.json"), { force: true });

  // ======================================================== the end of the New combination page (M2)
  await p.goto(`${BASE}/new`); await p.waitForTimeout(600);
  step("M2: the New combination address is gone ('Page not found', with the way back)", await p.getByText("Page not found").count() === 1);
  step("no script error on any page", errs.length === 0, errs.join(" | "));
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  unexpected", e); process.exit(1); });
