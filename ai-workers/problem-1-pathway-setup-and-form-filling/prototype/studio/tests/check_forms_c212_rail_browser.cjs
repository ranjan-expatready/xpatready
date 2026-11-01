// F2 C2.12 slice 3 (forms lane; the agreed F3 board, PDF views only since P-102): the guided path of one form on the
// combination's Forms tab, walked in a browser. The step chip on a form's row says where it stands and opens the rail; the
// rail (?setup=<form>) shows the six steps, the person's next step and what is left, only reads and links (BR-1), resumes
// on reload (BR-4), returns focus to the chip, and tells a person who cannot act who does (BR-4). The chips come in the tab's
// one workspace response (review 28b3bba3 Major 1) and follow row actions and focus (Major 3). axe (WCAG 2.2 AA) at
// 1440, 1024 and 390 px on every state (Major 5); screenshots into product/screens/F3-add-form-wizard/screenshots/c212/. US$0: no AI call.
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
  const axe = async (label) => { const bad = []; for (const w of [1440, 1024, 390]) { await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(150); const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze(); bad.push(...r.violations.map((v) => `${w}px ${v.id}: ${v.nodes.length}`)); } await p.setViewportSize({ width: 1440, height: 900 }); step(`axe (WCAG 2.2 AA) at 1440, 1024 and 390 px: ${label}`, bad.length === 0, bad.join("; ")); };
  // Review Major 1: count the requests the Forms tab makes (one workspace read; no progress read per row).
  const asked = []; p.on("request", (r) => { const u = new URL(r.url()); if (u.pathname.startsWith("/api/")) asked.push(u.pathname + u.search); });
  const as = async (id) => { await p.evaluate((x) => localStorage.setItem("xr-actor", x), id); };
  const wait = async (sel, what, ms = 30_000) => { try { await p.locator(sel).first().waitFor({ timeout: ms }); } catch { throw new Error(`never saw ${what} (${sel})`); } };
  try {
    await api("/demo/reset", { method: "POST", json: { confirm: "RESET" } }); await api("/demo/load", { method: "POST" });
    const sv = sql("select id from combination where combination_key like '%super_visa%' limit 1");
    await p.goto(`${BASE}/`); await as("user-A");
    asked.length = 0;
    await p.goto(`${BASE}/c/${sv}/forms`);
    await wait('[data-step-chip="IMM 5257"][data-current="map"]', "IMM 5257's step chip at step 2");
    const chip = p.locator('[data-step-chip="IMM 5257"]');
    step("C2.12 pass: the form's row says where it stands (Step 2 of 6 · Field map · Your step), from the same path the API gives", /Step 2 of 6 · Field map · Your step/.test(await chip.textContent()), await chip.textContent());
    await wait('[data-step-chip="IMM 5707"][data-current]', "IMM 5707's step chip");
    const rows = await p.locator("[data-step-chip]").count();
    step(`C2.12 fail (review Major 1, STANDARDS §5): ${rows} chips from one workspace read; no progress request per row`, rows >= 2 && asked.filter((u) => /\/progress$/.test(u)).length === 0 && asked.filter((u) => /\/workspace\?tab=forms/.test(u)).length === 1, asked.filter((u) => /progress|workspace/.test(u)).join(" "));
    step("C2.12 fail: a form only attached, its field map in the library, is not 'set up': its chip says step 2 (Add from library)", (await p.locator('[data-step-chip="IMM 5707"]').getAttribute("data-current")) === "map" && !/all 6 steps done/.test(await p.locator('[data-step-chip="IMM 5707"]').textContent()));
    // Keyboard: the chip is a button; Enter opens the rail, addressed as ?setup=IMM 5257.
    await chip.focus(); await p.keyboard.press("Enter");
    await wait('[data-setup-rail="IMM 5257"]', "the rail");
    step("C2.12 BR-4 pass: Enter on the chip opens the rail, addressed as ?setup=IMM 5257", new URL(p.url()).searchParams.get("setup") === "IMM 5257");
    const rail = p.locator('[data-setup-rail="IMM 5257"]');
    step("C2.12 pass: the rail lists the six steps, step 2 marked current (aria-current=step)", (await rail.locator("[data-step]").count()) === 6 && (await rail.locator('[data-step="map"]').getAttribute("aria-current")) === "step" && (await rail.locator('[data-step="attach"]').getAttribute("data-state")) === "done");
    step("C2.12 pass: Your next step names the author's step and links to the Forms tab", /Draft with AI or add from the library/.test(await rail.locator("[data-next-for-you]").textContent()) && (await rail.locator("[data-next-for-you] a").getAttribute("href")) === `/c/${sv}/forms?form=IMM+5257&c=${sv}`);
    const fromApi = (await api(`/combinations/${sv}/forms/${encodeURIComponent("IMM 5257")}/progress`)).body;
    step("C2.12 BR-5 pass: what's left lists the steps not done, as the API gives them", (await rail.locator("[data-whats-left] li").count()) === fromApi.whats_left.length && fromApi.whats_left.length > 0);
    // Review Minor 7: every step's link is the API's (BR-1: it lands where the step is done).
    // The return strip (C2.12): each link also carries ?form=&c= (the way back); without those two it is the API's link.
    const bare = (h) => { if (!h) return h; const u = new URL(h, BASE); const way = u.searchParams.get("form") === "IMM 5257" && u.searchParams.get("c") === sv; u.searchParams.delete("form"); u.searchParams.delete("c"); return way ? `${u.pathname}${u.search}${u.hash}` : `missing the way back: ${h}`; };
    const links = await rail.locator("[data-step]").evaluateAll((ls) => ls.map((l) => l.querySelector("[data-step-link]")?.getAttribute("href") ?? null));
    step("C2.12 BR-1 pass: each step links where the API says it is done (and only those steps), with the way back", JSON.stringify(links.map(bare)) === JSON.stringify(fromApi.steps.map((x) => x.next?.href ?? null)) && links.some(Boolean), JSON.stringify(links));
    step("C2.12 BR-1 pass: the rail has no write action (links and Close only)", (await p.getByRole("dialog").locator("button").evaluateAll((bs) => bs.map((x) => x.textContent?.trim()).filter((t) => t && !/^Close$/.test(t)))).length === 0, await p.getByRole("dialog").locator("button").allTextContents());
    await axe("the guided path of IMM 5257"); await shot("01-rail-author");
    // BR-4 resume: a reload lands on the same form's path.
    await p.reload(); await wait('[data-setup-rail="IMM 5257"]', "the rail after a reload");
    step("C2.12 BR-4 pass: a reload keeps the same form's guided path open", (await p.locator('[data-setup-rail="IMM 5257"] [data-step]').count()) === 6);
    // Close: the address is cleaned and focus returns to the chip.
    await p.keyboard.press("Escape");
    await p.waitForFunction(() => !document.querySelector("[data-setup-rail]"), null, { timeout: 10_000 });
    // A wait that times out fails loudly (WAY-OF-WORKING): the step below then reports where focus went.
    let focused = true; try { await p.waitForFunction(() => document.activeElement?.getAttribute("data-step-chip") === "IMM 5257", null, { timeout: 10_000 }); } catch { focused = false; }
    const after = { setup: new URL(p.url()).searchParams.get("setup"), focus: await p.evaluate(() => `${document.activeElement?.tagName} ${document.activeElement?.getAttribute("data-step-chip") ?? document.activeElement?.textContent?.slice(0, 40)}`) };
    step("C2.12 fail: Escape closes the rail, cleans ?setup= and returns focus to the chip (WCAG 2.4.3)", focused && after.setup === null && /IMM 5257$/.test(after.focus), JSON.stringify(after));
    // Review Minor 6: the number in another spelling (imm5257) opens the same rail, and Escape still finds its chip.
    await p.goto(`${BASE}/c/${sv}/forms?setup=imm5257`); await wait('[data-setup-rail="IMM 5257"]', "the rail from ?setup=imm5257");
    step("C2.12 pass (review Minor 6): ?setup=imm5257 is titled as the library spells it (IMM 5257)", /Set up IMM 5257 on this combination/.test(await p.getByRole("dialog").textContent()));
    await p.keyboard.press("Escape");
    let back = true; try { await p.waitForFunction(() => document.activeElement?.getAttribute("data-step-chip") === "IMM 5257", null, { timeout: 10_000 }); } catch { back = false; }
    step("C2.12 fail (review Minor 6): Escape from ?setup=imm5257 returns focus to the IMM 5257 chip", back);
    // A person who cannot draft (the content reviewer): told who acts, no link to a step they cannot take.
    await as("user-C"); await p.goto(`${BASE}/c/${sv}/forms?setup=${encodeURIComponent("IMM 5257")}`);
    await wait('[data-setup-rail="IMM 5257"]', "the rail for the content reviewer");
    const railC = p.locator('[data-setup-rail="IMM 5257"]');
    step("C2.12 BR-4 fail: the content reviewer is told the configuration author drafts; no next step, no link on step 2", (await railC.locator('[data-next-for-you="none"]').count()) === 1 && /configuration author/.test(await railC.textContent()) && (await railC.locator('[data-step="map"] a').count()) === 0 && (await railC.locator('[data-step="map"]').getAttribute("data-state")) === "waiting_others");
    step("C2.12 BR-4 pass (review Minor 7): step 2 itself says who acts (its own line)", /configuration author/.test(await railC.locator('[data-step="map"] [data-who]').textContent().catch(() => "")));
    await axe("the guided path read by the content reviewer"); await shot("02-rail-reviewer");
    // 390 px: nothing scrolls sideways.
    await p.setViewportSize({ width: 390, height: 900 });
    step("C2.12 pass: at 390 px the page does not scroll sideways with the rail open", await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
    await p.setViewportSize({ width: 1440, height: 900 });
    // An unknown form in the address: the rail says it could not read, in words (no blank panel); no Try again on a 404
    // that cannot change (review Minor 6).
    await as("user-A"); await p.goto(`${BASE}/c/${sv}/forms?setup=${encodeURIComponent("IMM 9999")}`);
    await wait("text=could not be read", "the rail's error words");
    step("C2.12 fail: a form not in the library in ?setup= shows the reason in words, no Try again", /not in the library/.test(await p.getByRole("dialog").textContent()) && (await p.getByRole("button", { name: "Try again" }).count()) === 0);
    await axe("the rail's error state");
    // Review Major 5: axe on the waiting and done rails (no link inside: the scrolling body itself takes focus).
    const vv = sql("select id from combination where label = 'Visitor visa' limit 1"), lmia = sql("select id from combination where label = 'With an LMIA' limit 1");
    await as("user-C"); await p.goto(`${BASE}/c/${vv}/forms?setup=${encodeURIComponent("IMM 5707")}`); await wait('[data-setup-rail="IMM 5707"]', "the waiting rail");
    await axe("a rail waiting on someone else (content reviewer, Visitor visa IMM 5707)");
    await as("user-A"); await p.goto(`${BASE}/c/${lmia}/forms?setup=${encodeURIComponent("IMM 5409")}`); await wait('[data-setup-rail="IMM 5409"]', "the done rail");
    step("C2.12 pass: With an LMIA's IMM 5409 is all done (Every step is done)", /Every step is done/.test(await p.getByRole("dialog").textContent()));
    await axe("a rail with every step done (With an LMIA IMM 5409)");
    await p.keyboard.press("Escape");
    // Review Major 3: a row action refreshes that row's chip (Add from library on the attached IMM 5707 of Super visa).
    await p.goto(`${BASE}/c/${sv}/forms`); await wait('[data-step-chip="IMM 5707"][data-current="map"]', "IMM 5707 at step 2");
    await p.locator('tr[data-pending^="IMM 5707"]').getByRole("button", { name: "Add from library" }).click();
    let moved = true; try { await p.waitForFunction(() => { const c = document.querySelector('[data-step-chip="IMM 5707"]'); return c && c.getAttribute("data-current") !== "map"; }, null, { timeout: 15_000 }); } catch { moved = false; }
    step("C2.12 fail (review Major 3): after Add from library on its row, IMM 5707's chip moves on from step 2 without a reload", moved, await p.locator('[data-step-chip="IMM 5707"]').first().textContent().catch(() => "no chip"));
    // Concept m6: work done elsewhere shows when the person comes back to the page (refetch on focus).
    await p.waitForTimeout(4_000); asked.length = 0; // past the 2 s the app treats a read as fresh
    await p.evaluate(() => { Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true }); window.dispatchEvent(new Event("visibilitychange")); Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true }); window.dispatchEvent(new Event("visibilitychange")); window.dispatchEvent(new Event("focus")); });
    const reread = await (async () => { for (let i = 0; i < 25; i++) { if (asked.some((u) => /\/workspace\?tab=forms/.test(u))) return true; await p.waitForTimeout(200); } return false; })(); // 5 s, then the step fails
    step("C2.12 pass (concept m6): the chips are read again when the page regains focus", reread, asked.join(" "));
    // Review (ed2516cf) Major A: a running AI draft moves the row's chip on when it ends, without a reload (test input: the
    // draft step written straight to the table, US$0; no worker picks up a RUNNING row).
    const focusPage = () => p.evaluate(() => { Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true }); window.dispatchEvent(new Event("visibilitychange")); Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true }); window.dispatchEvent(new Event("visibilitychange")); });
    const until = async (fn, arg, ms) => { try { await p.waitForFunction(fn, arg, { timeout: ms }); return true; } catch { return false; } };
    const att5257 = sql(`select id from source_attachment where combination_id = '${sv}' and edition like 'IMM 5257 (%' limit 1`);
    const job = sql(`insert into drafting_job (id, workspace_id, combination_id, attachment_id, kind, mode, status, started_by) select gen_random_uuid(), workspace_id, combination_id, id, 'field_map', 'REPLAY', 'RUNNING', 'user-A' from source_attachment where id = '${att5257}' returning id`).split("\n")[0];
    await p.waitForTimeout(2_500); await focusPage();
    const runningChip = await until(() => /· Running$/.test(document.querySelector('[data-step-chip="IMM 5257"]')?.textContent ?? ""), null, 8_000);
    step("C2.12 pass (review N1, Minor 7): the chip's words follow the path (Step 2 of 6 · Field map · Running)", runningChip, await p.locator('[data-step-chip="IMM 5257"]').textContent());
    await p.locator('[data-step-chip="IMM 5257"]').click(); await wait('[data-setup-rail="IMM 5257"]', "the running rail");
    step("C2.12 pass (review Minor 3, N1): while the AI draft runs, the rail says so (not 'someone else acts')", /AI draft of the field map is running/.test(await p.locator('[data-next-for-you="running"]').textContent().catch(() => "")));
    await axe("a rail with its AI draft running");
    await p.keyboard.press("Escape");
    sql(`update drafting_job set status = 'COMPLETED', finished_at = now() where id = '${job}'`);
    const ended = await until(() => { const t = document.querySelector('[data-step-chip="IMM 5257"]')?.textContent ?? ""; return !!t && !/Running/.test(t); }, null, 12_000);
    step("C2.12 fail (review Major A): when the AI draft ends, the chip moves on without a reload", ended, await p.locator('[data-step-chip="IMM 5257"]').textContent());
    // Review N1: the rail is read again when the page regains focus (a change made elsewhere: the draft marked failed).
    await p.locator('[data-step-chip="IMM 5257"]').click(); await wait('[data-setup-rail="IMM 5257"] [data-step="map"][data-state="done"]', "the rail with step 2 done");
    sql(`update drafting_job set status = 'FAILED' where id = '${job}'`);
    await p.waitForTimeout(2_500); await focusPage();
    step("C2.12 pass (concept m6, review N1): the open rail is read again when the page regains focus", await until(() => document.querySelector('[data-setup-rail="IMM 5257"] [data-step="map"]')?.getAttribute("data-state") === "needs_you", null, 5_000));
    await p.keyboard.press("Escape");
    step("no page errors", errs.length === 0, errs.join(" | "));
  } catch (e) { fail++; console.log(`FAIL  the check stopped: ${e.stack}`); } finally { await b.close(); }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
