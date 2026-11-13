// BK-3 PR 2 (P-447 (2), Bake plan row 3; qa baseline 11 Nov §2.2 dead end 2): a released combination and its cases link
// both ways, walked in a real browser at 1440 and 375 px on the configured checkpoint (C10.1). As the Studio person: a
// released combination's header offers "Open a case on Release N"; one click opens the Open a case dialog with that
// combination chosen; opening the case lands on it, and the case's "Release N" pill opens the combination in the Studio.
// A combination with no release offers no such button, and asked for by address the dialog says so instead of choosing
// another. Cancel drops the address's choice. axe (WCAG 2.2 AA) on the button, the dialog and the pill at both widths.
// Screenshots into product/screens/BK-3-one-frame/screenshots/ (pr2-*). No model call (US$0).
//   COPY_PREFIX=screens zsh studio/tools/isolated.sh screens_bk3l 4442 start && node studio/tests/check_bk3_links_browser.cjs 4442
const path = require("node:path"); const fs = require("node:fs");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4442);
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "BK-3-one-frame", "screenshots"); fs.mkdirSync(SHOTS, { recursive: true });
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined && !ok ? ` — ${String(typeof detail === "string" ? detail : JSON.stringify(detail)).slice(0, 300)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, ...(init.data ? { data: init.data } : {}), timeout: 600000 }); let body = null; try { body = await r.json(); } catch { /* no body */ } return { status: r.status(), body }; };
  const axe = async (name, sel) => {
    const r = await new AxeBuilder({ page: p }).include(sel).withTags(TAGS).analyze();
    step(`${name}: axe finds no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
  };

  await p.goto(BASE);
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  const loaded = await api("/demo/load", { method: "POST", data: { sample: "configured" } });
  step("setup: the configured checkpoint loads", loaded.status < 300, loaded.status);
  const combos = loaded.body?.combinations ?? [];
  const openable = (await api("/runtime/openable", { actor: "user-O" })).body ?? [];
  const released = openable.find((r) => r.startable && /visitor visa/i.test(r.combination)) ?? openable.find((r) => r.startable);
  const views = await Promise.all(combos.map(async (c) => ({ id: c.id, label: c.label, v: (await api(`/combinations/${c.id}`)).body })));
  const none = views.find((x) => Array.isArray(x.v?.releases) && x.v.releases.length === 0);
  const rel = views.find((x) => x.id === released?.combination_id)?.v?.releases?.[0]?.release;
  step("setup: a released combination a case can open on, its release number, and a combination with no release", !!(released && rel && none), { released, rel, none: none?.id });

  const as = async (actor) => { await p.goto(`${BASE}/inbox`); await p.evaluate((a) => { try { localStorage.setItem("xr-actor", a); } catch { /* ignore */ } }, actor); };
  const header = (id) => p.locator("h1").first().waitFor({ timeout: 30000 }).then(() => p.waitForFunction(() => !!document.querySelector("[data-status], [data-header-next]"), null, { timeout: 30000 })).then(() => p.waitForTimeout(300));

  for (const width of [1440, 375]) {
    await p.setViewportSize({ width, height: width === 375 ? 812 : 900 });
    const W = `BK-3 PR 2 ${width}`;
    // (a) From a released combination, one click opens the Open a case dialog with it chosen.
    await as("user-A"); await p.goto(`${BASE}/c/${released.combination_id}`); await header();
    const btn = p.locator("[data-open-case]");
    await btn.waitFor({ timeout: 15000 }).catch(() => {});
    const text = (await btn.textContent().catch(() => ""))?.trim();
    step(`${W}: a released combination offers "Open a case on Release ${rel}" (${text})`, text === `Open a case on Release ${rel}`, text);
    const box = await btn.boundingBox().catch(() => null);
    step(`${W}: the button fits the screen and is at least 24 px high`, !!box && box.x >= 0 && box.x + box.width <= width + 1 && box.height >= 24, box);
    await axe(`${W} the combination's header`, "[data-open-case]");
    await p.screenshot({ path: path.join(SHOTS, `pr2-combination-open-a-case-${width}.png`) });
    // Review m1: a Ctrl/Cmd-click opens the case list in a new tab and leaves this tab as the Studio person.
    if (width === 1440) {
      const [tab] = await Promise.all([ctx.waitForEvent("page", { timeout: 15000 }), btn.click({ modifiers: ["ControlOrMeta"] })]);
      await tab.close(); await p.waitForTimeout(300);
      step(`${W}: a Ctrl/Cmd-click opens a new tab and this tab stays the Studio person's`, new URL(p.url()).pathname === `/c/${released.combination_id}` && await p.evaluate(() => localStorage.getItem("xr-actor")) === "user-A" && !/for the configuration people/.test(await p.locator("main").innerText()), await p.evaluate(() => localStorage.getItem("xr-actor")));
      await as("user-A"); await p.goto(`${BASE}/c/${released.combination_id}`); await header(); await btn.waitFor({ timeout: 15000 });
    }
    await btn.click();
    const dlg = p.getByRole("dialog", { name: "Open a case" });
    await dlg.waitFor({ timeout: 15000 }).catch(() => {});
    const sel = dlg.getByLabel("Combination (released)");
    await sel.waitFor({ timeout: 15000 }).catch(() => {});
    const url = new URL(p.url());
    step(`${W}: the click lands on the case list with the Open a case dialog (${url.pathname}${url.search})`, url.pathname === "/cases" && url.searchParams.get("open") === released.combination_id && await dlg.isVisible(), p.url());
    step(`${W}: the dialog has that combination chosen`, (await sel.inputValue().catch(() => "")) === released.combination_id, await sel.inputValue().catch(() => ""));
    step(`${W}: acting as the case officer there`, await p.evaluate(() => localStorage.getItem("xr-actor")) === "user-O", await p.evaluate(() => localStorage.getItem("xr-actor")));
    step(`${W}: no "not ready" notice for a combination a case can open on`, await dlg.locator("[data-asked-off]").count() === 0);
    // The dialog's open animation ends first (axe measured a half-faded footer button), and the pointer is moved off it.
    await p.mouse.move(0, 0); await p.waitForFunction(() => document.querySelector('[role="dialog"]')?.getAnimations({ subtree: true }).every((a) => a.playState !== "running") ?? false, null, { timeout: 10000 });
    await axe(`${W} the Open a case dialog`, '[role="dialog"]');
    await p.screenshot({ path: path.join(SHOTS, `pr2-dialog-chosen-${width}.png`) });
    // Opening the case lands on it, on that combination.
    const reference = `BK3-L-${width}`;
    await dlg.getByLabel("Your own reference (optional)").fill(reference);
    await dlg.getByLabel("Principal applicant's name").fill("Sample Applicant");
    await dlg.getByRole("button", { name: "Open case" }).click();
    await p.waitForURL((u) => /^\/cases\/[0-9a-f-]{36}$/.test(u.pathname), { timeout: 30000 }).catch(() => {});
    const caseId = new URL(p.url()).pathname.split("/")[2];
    await p.locator("[data-case-release]").waitFor({ timeout: 30000 }).catch(() => {});
    const made = (await api(`/runtime/cases/${caseId}/questionnaire?mode=agent`, { actor: "user-O" })).body?.case;
    step(`${W}: opening the case lands on it (${reference})`, made?.reference === reference && (await p.locator("h1").first().textContent())?.includes(reference), { url: p.url(), made: made?.reference });
    step(`${W}: the case is on the combination chosen`, made?.combination_id === released.combination_id, made?.combination_id);
    // (b) The case's release pill opens its combination in the Studio.
    const pill = p.locator("[data-case-release]");
    const pillText = (await pill.textContent().catch(() => ""))?.trim();
    step(`${W}: the case's pill says Release ${rel}, as the button did (${pillText})`, pillText === `Release ${rel} (as Configuration author)` /* BK-4a: the pill names who you become */, pillText);
    step(`${W}: the pill's name says where it goes`, (await pill.getAttribute("aria-label")) === `Release ${rel} (as Configuration author): open its set-up in Product Studio` /* BK-4a: it names who you become */, await pill.getAttribute("aria-label"));
    const pbox = await pill.boundingBox().catch(() => null);
    step(`${W}: the pill link is at least 24 px high`, !!pbox && pbox.height >= 24, pbox);
    await axe(`${W} the case's release pill`, "[data-case-release]");
    await p.screenshot({ path: path.join(SHOTS, `pr2-case-release-pill-${width}.png`) });
    await pill.click();
    await p.waitForURL((u) => u.pathname === `/c/${released.combination_id}`, { timeout: 15000 }).catch(() => {});
    await p.locator('[data-where="studio"]').waitFor({ timeout: 15000 }).catch(() => {});
    step(`${W}: the pill opens the combination in the Studio`, new URL(p.url()).pathname === `/c/${released.combination_id}` && await p.locator('[data-where="studio"]').count() === 1, p.url());
    step(`${W}: acting as the Studio person there`, await p.evaluate(() => localStorage.getItem("xr-actor")) === "user-A", await p.evaluate(() => localStorage.getItem("xr-actor")));
    await header();
    step(`${W}: the combination's page loaded (its name in the heading)`, ((await p.locator("h1").first().textContent()) ?? "").length > 0 && await p.locator("[data-open-case]").count() === 1);

    // Review m2: browser Back from there passes the case and reaches the case list, never the Open a case dialog again.
    await p.goBack(); await p.locator("[data-case-release]").waitFor({ timeout: 30000 }).catch(() => {});
    step(`${W}: browser Back from the Studio returns to the case`, new URL(p.url()).pathname === `/cases/${caseId}`, p.url());
    await p.goBack(); await p.locator("h1").first().waitFor({ timeout: 30000 }).catch(() => {}); await p.waitForTimeout(500);
    step(`${W}: Back again lands on the case list without ?open and without the dialog`, new URL(p.url()).pathname === "/cases" && new URL(p.url()).search === "" && await p.getByRole("dialog").count() === 0, p.url());

    // A combination with no release offers no such button.
    await as("user-A"); await p.goto(`${BASE}/c/${none.id}`); await header();
    step(`${W}: a combination with no release (${none.label}) offers no Open a case button`, await p.locator("[data-open-case]").count() === 0 && /Not released yet/.test(await p.locator("main").innerText()));
    // Asked for by address, the dialog says so and never swaps silently; Cancel drops the address's choice.
    await as("user-O"); await p.goto(`${BASE}/cases?open=${none.id}`);
    await p.getByRole("dialog", { name: "Open a case" }).waitFor({ timeout: 15000 }).catch(() => {});
    await p.locator("[data-asked-off]").waitFor({ timeout: 15000 }).catch(() => {});
    step(`${W}: /cases?open=<no release> says no case can open on it`, /no release a case can open on/.test((await p.locator("[data-asked-off]").textContent().catch(() => "")) ?? ""));
    await p.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
    await p.getByRole("dialog").waitFor({ state: "detached", timeout: 15000 }).catch(() => {});
    step(`${W}: Cancel closes the dialog and drops ?open from the address`, await p.getByRole("dialog").count() === 0 && new URL(p.url()).search === "", p.url());
    await p.reload(); await p.locator("h1").first().waitFor({ timeout: 30000 }); await p.waitForTimeout(500);
    step(`${W}: a reload after Cancel does not reopen the dialog`, await p.getByRole("dialog").count() === 0);
    // Review m3: a released combination that is not ready for new cases (the server's startable check, here answered so
    // by the test) is named in the dialog's notice, never swapped silently.
    await p.route("**/api/runtime/openable", async (r) => { const res = await r.fetch(); const rows = await res.json(); await r.fulfill({ response: res, json: rows.map((x) => x.combination_id === released.combination_id ? { ...x, startable: false, items: 1, why: `"${x.combination}" is not ready for new cases: 1 item to fix.` } : x) }); });
    await p.goto(`${BASE}/cases?open=${released.combination_id}`);
    await p.locator("[data-asked-off]").waitFor({ timeout: 15000 }).catch(() => {});
    const off = (await p.locator("[data-asked-off]").textContent().catch(() => "")) ?? "";
    step(`${W}: /cases?open=<released, not ready> says that combination is not ready for new cases`, off.includes(`"${released.combination}" is not ready for new cases`), off);
    step(`${W}: and the dialog does not offer it`, !(await p.getByRole("dialog").getByLabel("Combination (released)").locator("option").allTextContents().catch(() => [])).some((o) => o.startsWith(`${released.combination} ·`)));
    await p.unroute("**/api/runtime/openable");
    await p.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
    await p.getByRole("dialog").waitFor({ state: "detached", timeout: 15000 }).catch(() => {});
    step(`${W}: no sideways scroll on the case list`, await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  }
  step("no page error on the way", errs.length === 0, errs.join(" | "));
  await b.close();
  console.log(`${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
