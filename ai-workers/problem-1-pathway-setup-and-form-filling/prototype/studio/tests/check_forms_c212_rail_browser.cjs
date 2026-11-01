// F2 C2.12 slice 3 (forms lane; the agreed F3 board, PDF views only since P-102): the guided path of one form on the
// combination's Forms tab, walked in a browser. The step chip on a form's row says where it stands and opens the rail; the
// rail (?setup=<form>) shows the six steps, the person's next step and what is left, only reads and links (BR-1), resumes
// on reload (BR-4), returns focus to the chip, and tells a person who cannot act who does (BR-4). axe (WCAG 2.2 AA) at
// 1440, 1024 and 390 px; screenshots into product/screens/F3-add-form-wizard/screenshots/c212/. US$0: no AI call.
//   zsh studio/tools/isolated.sh forms_c212r 4452 start && node studio/tests/check_forms_c212_rail_browser.cjs 4452 xr_studio_forms_c212r
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4452), DB = process.argv[3] ?? "xr_studio_forms_c212r";
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "F3-add-form-wizard", "screenshots", "c212"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail !== undefined ? ` — ${String(detail).slice(0, 260)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, data: init.json !== undefined ? JSON.stringify(init.json) : undefined }); let body = null; try { body = await r.json(); } catch { /* none */ } return { status: r.status(), body }; };
  const shot = async (name) => { for (const w of [1440, 1024, 390]) { await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(150); await p.screenshot({ path: path.join(SHOTS, `${name}-${w}.png`), fullPage: true }); } await p.setViewportSize({ width: 1440, height: 900 }); };
  const axe = async (label) => { const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze(); step(`axe (WCAG 2.2 AA): ${label}`, r.violations.length === 0, r.violations.map((v) => `${v.id}: ${v.nodes.length}`).join("; ")); };
  const as = async (id) => { await p.evaluate((x) => localStorage.setItem("xr-actor", x), id); };
  const wait = async (sel, what, ms = 30_000) => { try { await p.locator(sel).first().waitFor({ timeout: ms }); } catch { throw new Error(`never saw ${what} (${sel})`); } };
  try {
    await api("/demo/reset", { method: "POST", json: { confirm: "RESET" } }); await api("/demo/load", { method: "POST" });
    const sv = sql("select id from combination where combination_key like '%super_visa%' limit 1");
    await p.goto(`${BASE}/`); await as("user-A");
    await p.goto(`${BASE}/c/${sv}/forms`);
    await wait('[data-step-chip="IMM 5257"][data-current="map"]', "IMM 5257's step chip at step 2");
    const chip = p.locator('[data-step-chip="IMM 5257"]');
    step("C2.12 pass: the form's row says where it stands (Step 2 of 6 · Your step), from the same path the API gives", /Step 2 of 6 · Your step/.test(await chip.textContent()));
    await wait('[data-step-chip="IMM 5707"][data-current]:not([data-current=""])', "IMM 5707's step chip");
    step("C2.12 fail: a form only attached, its field map in the library, is not 'set up': its chip says step 2 (Add from library)", (await p.locator('[data-step-chip="IMM 5707"]').getAttribute("data-current")) === "map" && !/all 6 steps done/.test(await p.locator('[data-step-chip="IMM 5707"]').textContent()));
    // Keyboard: the chip is a button; Enter opens the rail, addressed as ?setup=IMM 5257.
    await chip.focus(); await p.keyboard.press("Enter");
    await wait('[data-setup-rail="IMM 5257"]', "the rail");
    step("C2.12 BR-4 pass: Enter on the chip opens the rail, addressed as ?setup=IMM 5257", new URL(p.url()).searchParams.get("setup") === "IMM 5257");
    const rail = p.locator('[data-setup-rail="IMM 5257"]');
    step("C2.12 pass: the rail lists the six steps, step 2 marked current (aria-current=step)", (await rail.locator("[data-step]").count()) === 6 && (await rail.locator('[data-step="map"]').getAttribute("aria-current")) === "step" && (await rail.locator('[data-step="attach"]').getAttribute("data-state")) === "done");
    step("C2.12 pass: Your next step names the author's step and links to the Forms tab", /Draft with AI or add from the library/.test(await rail.locator("[data-next-for-you]").textContent()) && (await rail.locator("[data-next-for-you] a").getAttribute("href")) === `/c/${sv}/forms`);
    const fromApi = (await api(`/combinations/${sv}/forms/${encodeURIComponent("IMM 5257")}/progress`)).body;
    step("C2.12 BR-5 pass: what's left lists the steps not done, as the API gives them", (await rail.locator("[data-whats-left] li").count()) === fromApi.whats_left.length && fromApi.whats_left.length > 0);
    step("C2.12 BR-1 pass: the rail has no write action (links and Close only)", (await p.getByRole("dialog").locator("button").evaluateAll((bs) => bs.map((x) => x.textContent?.trim()).filter((t) => t && !/^Close$/.test(t)))).length === 0, await p.getByRole("dialog").locator("button").allTextContents());
    await axe("the guided path of IMM 5257"); await shot("01-rail-author");
    // BR-4 resume: a reload lands on the same form's path.
    await p.reload(); await wait('[data-setup-rail="IMM 5257"]', "the rail after a reload");
    step("C2.12 BR-4 pass: a reload keeps the same form's guided path open", (await p.locator('[data-setup-rail="IMM 5257"] [data-step]').count()) === 6);
    // Close: the address is cleaned and focus returns to the chip.
    await p.keyboard.press("Escape");
    await p.waitForFunction(() => !document.querySelector("[data-setup-rail]"), null, { timeout: 10_000 });
    await p.waitForFunction(() => document.activeElement?.getAttribute("data-step-chip") === "IMM 5257", null, { timeout: 10_000 }).catch(() => undefined);
    const after = { setup: new URL(p.url()).searchParams.get("setup"), focus: await p.evaluate(() => `${document.activeElement?.tagName} ${document.activeElement?.getAttribute("data-step-chip") ?? document.activeElement?.textContent?.slice(0, 40)}`) };
    step("C2.12 fail: Escape closes the rail, cleans ?setup= and returns focus to the chip (WCAG 2.4.3)", after.setup === null && /IMM 5257$/.test(after.focus), JSON.stringify(after));
    // A person who cannot draft (the content reviewer): told who acts, no link to a step they cannot take.
    await as("user-C"); await p.goto(`${BASE}/c/${sv}/forms?setup=${encodeURIComponent("IMM 5257")}`);
    await wait('[data-setup-rail="IMM 5257"]', "the rail for the content reviewer");
    const railC = p.locator('[data-setup-rail="IMM 5257"]');
    step("C2.12 BR-4 fail: the content reviewer is told the configuration author drafts; no next step, no link on step 2", (await railC.locator('[data-next-for-you="none"]').count()) === 1 && /configuration author/.test(await railC.textContent()) && (await railC.locator('[data-step="map"] a').count()) === 0 && (await railC.locator('[data-step="map"]').getAttribute("data-state")) === "waiting_others");
    await axe("the guided path read by the content reviewer"); await shot("02-rail-reviewer");
    // 390 px: nothing scrolls sideways.
    await p.setViewportSize({ width: 390, height: 900 });
    step("C2.12 pass: at 390 px the page does not scroll sideways with the rail open", await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
    await p.setViewportSize({ width: 1440, height: 900 });
    // An unknown form in the address: the rail says it could not read, in words, with Try again (no blank panel).
    await as("user-A"); await p.goto(`${BASE}/c/${sv}/forms?setup=${encodeURIComponent("IMM 9999")}`);
    await wait("text=could not be read", "the rail's error words");
    step("C2.12 fail: a form not in the library in ?setup= shows the reason in words and Try again", /not in the library/.test(await p.getByRole("dialog").textContent()) && (await p.getByRole("button", { name: "Try again" }).count()) === 1);
    step("no page errors", errs.length === 0, errs.join(" | "));
  } catch (e) { fail++; console.log(`FAIL  the check stopped: ${e.stack}`); } finally { await b.close(); }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
