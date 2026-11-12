// BK-4a (P-447 (2), P-456 (3), P-484; product/screens/BK-4-sign-in-hand-offs/concept.md §4, §8) walked in a real browser:
// sign in by role and one person picker. On the configured checkpoint (C10.1), each scenario in a fresh browser (its own
// stored person): the sign-in page (four cards, More people, signing in lands on the person's first page and the notice
// names them); the one picker in both areas (choosing someone of the other area goes there); BR-6 (an unknown stored
// person → sign-in; no stored person → the Configuration author, as before); BR-8 (a chosen Studio person opening the case
// area is never switched silently: one named button; Back after "Product Studio (as Configuration author)" changes
// nobody; a browser with no person still arrives as the case officer, QA-35); the frame links name who they act as and a
// Ctrl-click changes nobody; BR-5 (a client from the picker reaches no Studio page and no case list). axe (WCAG 2.2 AA),
// 1440 and 375 px, no sideways scroll. Screenshots into product/screens/BK-4-sign-in-hand-offs/screenshots/. US$0.
//   COPY_PREFIX=screens zsh studio/tools/isolated.sh screens_bk4a 4442 start && node studio/tests/check_bk4a_browser.cjs 4442
const path = require("node:path"); const fs = require("node:fs");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4442);
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "BK-4-sign-in-hand-offs", "screenshots"); fs.mkdirSync(SHOTS, { recursive: true });
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined && !ok ? ` — ${String(typeof detail === "string" ? detail : JSON.stringify(detail)).slice(0, 300)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const errs = [];
  /** A fresh browser: its own stored person (none, unless `who` is given before the first page). */
  const fresh = async (who, width = 1440) => {
    const ctx = await b.newContext({ viewport: { width, height: width === 375 ? 812 : 900 }, colorScheme: "light", reducedMotion: "reduce" });
    if (who) await ctx.addInitScript((a) => { try { if (!sessionStorage.getItem("bk4a-set")) { localStorage.setItem("xr-actor", a); sessionStorage.setItem("bk4a-set", "1"); } } catch { /* ignore */ } }, who);
    const p = await ctx.newPage(); p.on("pageerror", (e) => errs.push(e.message)); return p;
  };
  const stored = (p) => p.evaluate(() => localStorage.getItem("xr-actor"));
  const where = (p) => p.locator("[data-where]").first().waitFor({ timeout: 30000 });
  const said = async (p, re) => { try { await p.locator("[data-toaster]").getByText(re).first().waitFor({ timeout: 8000 }); return true; } catch { return false; } };
  const picker = (p) => p.locator('header select[aria-label="Simulated person"]');
  const axe = async (p, name) => { const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze(); step(`axe: ${name} has no WCAG 2.2 AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target?.join(" ")}`).join(" | ")); };
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);

  // Set-up: the configured checkpoint, for a real case.
  const setup = await fresh();
  const api = async (pth, init = {}) => { const r = await setup.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, ...(init.data ? { data: init.data } : {}), timeout: 600000 }); let body = null; try { body = await r.json(); } catch { /* none */ } return { status: r.status(), body }; };
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  const loaded = await api("/demo/load", { method: "POST", data: { sample: "configured" } });
  const caseId = (await api("/runtime/cases", { actor: "user-O" })).body?.cases?.[0]?.id;
  step("setup: the configured checkpoint loads, with a case", loaded.status < 300 && !!caseId, { status: loaded.status, caseId });
  await setup.context().close();

  // 1. The sign-in page; signing in lands on the person's first page and the notice names them.
  let p = await fresh();
  await p.goto(`${BASE}/sign-in`); await where(p);
  const cards = await p.locator("[data-sign-in] > div.grid [data-sign-in-as]").evaluateAll((xs) => xs.map((x) => x.getAttribute("data-sign-in-as")));
  step("sign-in: four cards, the first person of each stage (author, Approver, Case officer, Representative)", JSON.stringify(cards) === JSON.stringify(["user-A", "user-B", "user-O", "user-R"]), cards);
  step("sign-in: the heading asks who you are; the line is the page's own (no Back)", await p.getByRole("heading", { level: 1, name: "Who are you today?" }).isVisible() && await p.locator("[data-where-back]").count() === 0);
  step("sign-in: the other five are under More people (closed)", /More people \(5\)/.test(await p.locator("[data-sign-in-more] summary").innerText()) && !(await p.locator('[data-sign-in-as="user-C"]').isVisible()));
  step("sign-in: no person picker and no Studio menu on the sign-in page", await picker(p).count() === 0 && await p.locator("[data-menu-column]").count() === 0);
  await axe(p, "the sign-in page");
  await p.screenshot({ path: path.join(SHOTS, "bk4a-sign-in-1440.png") });
  await p.locator("[data-sign-in-more] summary").click();
  step("sign-in: More people opens to Content reviewer, the representatives and the clients, in their groups", await p.locator('[data-sign-in-as="user-C"]').isVisible() && await p.locator('[data-sign-in-as="user-P"]').isVisible() && await p.getByRole("region", { name: "Clients" }).isVisible());
  await p.locator('[data-sign-in-as="user-B"]').click();
  step("BR-1: signing in as the Approver says so once (Now: Approver (simulated))", await said(p, /Now: Approver \(simulated\)/));
  await where(p);
  step("sign-in: the Approver lands on Immigration programs, signed in", new URL(p.url()).pathname === "/" && await stored(p) === "user-B" && await picker(p).inputValue() === "user-B", { url: p.url(), stored: await stored(p) });

  // 2. One picker, in both areas; another area's person goes there.
  step("picker: one person picker in the Studio header, in three groups", await picker(p).count() === 1 && JSON.stringify(await picker(p).locator("optgroup").evaluateAll((g) => g.map((x) => x.label))) === JSON.stringify(["Expat Ready staff", "Firm", "Clients"]));
  await picker(p).selectOption("user-O");
  await p.waitForURL((u) => u.pathname === "/cases", { timeout: 15000 }).catch(() => {});
  step("picker: choosing the Case officer in the Studio opens the case list as them", new URL(p.url()).pathname === "/cases" && await stored(p) === "user-O", p.url());
  step("BR-1: the change is said (Now: Case officer (simulated))", await said(p, /Now: Case officer \(simulated\)/));
  await where(p);
  step("picker: the same one picker in the case area", await picker(p).count() === 1 && await picker(p).inputValue() === "user-O");
  await picker(p).selectOption("user-C");
  await p.waitForURL((u) => u.pathname === "/", { timeout: 15000 }).catch(() => {});
  step("picker: choosing the Content reviewer in the case area opens the Studio as them", new URL(p.url()).pathname === "/" && await stored(p) === "user-C", p.url());
  await picker(p).selectOption("sign-in");
  await p.waitForURL((u) => u.pathname === "/sign-in", { timeout: 15000 }).catch(() => {});
  step("picker: its last option opens the sign-in page and changes nobody", new URL(p.url()).pathname === "/sign-in" && await stored(p) === "user-C", p.url());
  await p.context().close();

  // 3. BR-6: an unknown stored person → sign-in; no stored person → the Configuration author, as before.
  p = await fresh("user-Z");
  await p.goto(`${BASE}/`); await p.waitForURL((u) => u.pathname === "/sign-in", { timeout: 15000 }).catch(() => {});
  step("BR-6: a stored person this workspace does not know opens the sign-in page, which says why", new URL(p.url()).pathname === "/sign-in" && await p.locator("[data-sign-in-unknown]").getByText("Choose who you are").isVisible(), p.url());
  step("BR-6 fail side: no red refusal (\"did not accept the simulated person\") on the way", !/did not accept the simulated person/.test(await p.locator("body").innerText()));
  await p.goto(`${BASE}/cases/${caseId}`); await p.waitForURL((u) => u.pathname === "/sign-in", { timeout: 15000 }).catch(() => {});
  step("BR-6: the case area too sends an unknown stored person to sign in", new URL(p.url()).pathname === "/sign-in", p.url());
  await p.context().close();
  p = await fresh();
  await p.goto(`${BASE}/`); await where(p);
  step("BR-6: a browser with no stored person is the Configuration author (a page, not a gate, P-484 (3))", new URL(p.url()).pathname === "/" && await picker(p).inputValue() === "user-A" && await stored(p) === null);
  await p.goto(`${BASE}/cases`); await where(p);
  await p.getByRole("button", { name: "Open a case" }).waitFor({ timeout: 15000 }).catch(() => {});
  step("QA-35 kept: a browser with no person chosen opens the case area as the case officer (its first person)", await stored(p) === "user-O" && await p.getByRole("button", { name: "Open a case" }).isVisible());
  await p.context().close();

  // 4. BR-8: a chosen Studio person is never switched silently in the case area.
  p = await fresh("user-A");
  await p.goto(`${BASE}/cases/${caseId}`); await p.locator("[data-not-case-person]").waitFor({ timeout: 15000 }).catch(() => {});
  step("BR-8: the Configuration author opening a case address sees \"Cases are worked by the firm\" and one named button", await p.getByText("Cases are worked by the firm").isVisible() && await p.locator("[data-continue-as-officer]").isVisible());
  step("BR-8 fail side: nobody was switched (still the Configuration author)", await stored(p) === "user-A", await stored(p));
  await axe(p, "the case area's notice for a Studio person");
  await p.screenshot({ path: path.join(SHOTS, "bk4a-not-case-person-1440.png") });
  await p.locator("[data-continue-as-officer]").click();
  step("BR-8: Continue as Case officer changes the person, said once", await said(p, /Now: Case officer \(simulated\)/) && await stored(p) === "user-O");
  await p.locator("[data-handoff=client]").first().waitFor({ timeout: 30000 }).catch(() => {}); // BK-4c: the case page's hand-off to its client
  step("BR-8: the case page then opens as the case officer", await p.locator("[data-not-case-person]").count() === 0 && new URL(p.url()).pathname === `/cases/${caseId}`);
  // Review M2 (BR-1): the case's release pill says on screen who you become in the Studio.
  const pill = p.locator("[data-case-release]");
  step("review M2: the release pill shows \"(as Configuration author)\" on screen, and its name starts with its words", /\(as Configuration author\)/.test(await pill.innerText()) && (await pill.getAttribute("aria-label")).startsWith((await pill.innerText()).replace(/\s+/g, " ").trim().replace(/ ?→$/, "")), { text: await pill.innerText(), name: await pill.getAttribute("aria-label") });
  // The frame link names who it acts as; Back afterwards changes nobody.
  const toStudio = p.locator("[data-where-area]");
  step("frame: the case area's link to the Studio names who it acts as", (await toStudio.innerText()).trim() === "Product Studio (as Configuration author)", await toStudio.innerText());
  await toStudio.click(); await p.waitForURL((u) => u.pathname === "/", { timeout: 15000 }).catch(() => {});
  step("frame: it opens the Studio as the Configuration author, said once", new URL(p.url()).pathname === "/" && await stored(p) === "user-A" && await said(p, /Now: Configuration author \(simulated\)/));
  await p.goBack(); await p.locator("[data-not-case-person]").waitFor({ timeout: 15000 }).catch(() => {});
  step("BR-8: browser Back to the case changes nobody (the notice, not a silent switch)", await stored(p) === "user-A" && await p.locator("[data-not-case-person]").isVisible(), await stored(p));
  await p.goto(`${BASE}/`); await where(p);
  const toCases = p.locator("[data-where-area]");
  step("frame: the Studio's link to the cases names who it acts as", (await toCases.innerText()).trim() === "Cases (as Case officer)", await toCases.innerText());
  const [tab] = await Promise.all([p.context().waitForEvent("page"), toCases.click({ modifiers: [process.platform === "darwin" ? "Meta" : "Control"] })]);
  await tab.waitForLoadState("domcontentloaded"); await p.waitForTimeout(500);
  step("frame: a Ctrl-click opens a new tab and changes nobody", await stored(p) === "user-A", await stored(p));
  await tab.close();
  await toCases.click(); await p.waitForURL((u) => u.pathname === "/cases", { timeout: 15000 }).catch(() => {});
  step("frame: a plain click opens the case list as the case officer, said once", await stored(p) === "user-O" && await said(p, /Now: Case officer \(simulated\)/) && await p.getByRole("button", { name: "Open a case" }).isVisible().catch(() => false));
  await p.context().close();

  // 4b. The breaker's findings (break-report-4a.md), each with its fail side.
  p = await fresh("user-B");
  await p.goto(`${BASE}/cases/${caseId}`); await p.locator("[data-not-case-person]").waitFor({ timeout: 15000 }).catch(() => {});
  const plain = p.locator("[data-where-area]");
  step("break M1: for the Approver the case area's link reads only \"Product Studio\" (it changes nobody)", (await plain.innerText()).trim() === "Product Studio", await plain.innerText());
  await plain.click(); await p.waitForURL((u) => u.pathname === "/", { timeout: 15000 }).catch(() => {});
  step("break M1 fail side: the Approver stays the Approver in the Studio (not silently the Configuration author)", new URL(p.url()).pathname === "/" && await stored(p) === "user-B", await stored(p));
  await p.context().close();
  p = await fresh("user-A");
  await p.goto(`${BASE}/`); await where(p);
  const sel = picker(p);
  step("break m4: the picker's options are names only (the group says the area)", JSON.stringify(await sel.locator("option").evaluateAll((o) => o.slice(0, 3).map((x) => x.textContent))) === JSON.stringify(["Configuration author", "Content reviewer", "Approver"]));
  await sel.focus(); await p.keyboard.press("ArrowDown"); await p.waitForTimeout(600);
  step("break M2 fail side (WCAG 3.2.2): an arrow key on the picker changes nobody and stays on the page", await stored(p) === "user-A" && new URL(p.url()).pathname === "/", { stored: await stored(p), url: p.url() });
  await p.keyboard.press("Tab"); await p.waitForTimeout(400);
  step("break M2: leaving the picker without Enter keeps the person and shows them again", await stored(p) === "user-A" && await sel.inputValue() === "user-A", { stored: await stored(p), shown: await sel.inputValue() });
  await sel.focus(); await p.keyboard.press("ArrowDown"); await p.keyboard.press("Enter");
  step("break M2: Enter makes the keyboard choice, said once", await said(p, /Now: Content reviewer \(simulated\)/) && await stored(p) === "user-C");
  await p.context().close();
  p = await fresh();
  await p.goto(`${BASE}/cases`); await where(p);
  step("break m1: a browser with no person that opens the case area is told it is now the case officer", await said(p, /Now: Case officer \(simulated\)/) && await stored(p) === "user-O");
  await p.context().close();
  p = await fresh("user-Z");
  await p.goto(`${BASE}/`); await p.waitForURL((u) => u.pathname === "/sign-in", { timeout: 15000 }).catch(() => {});
  await p.locator('[data-sign-in-as="user-A"]').click(); await p.waitForURL((u) => u.pathname === "/start", { timeout: 15000 }).catch(() => {});
  // BK-5 PR 2 (concept §9, challenge m4): the author duty starts a walk on Starting points; other Studio people land on
  // Immigration programs (the Approver above), never on doors they cannot open.
  const startHeading = p.getByRole("heading", { level: 1, name: /Starting points/ }); await startHeading.waitFor({ timeout: 15000 }).catch(() => {});
  step("BK-5 PR 2: the Configuration author lands on Starting points, signed in", new URL(p.url()).pathname === "/start" && await stored(p) === "user-A" && await startHeading.isVisible(), p.url());
  // Break m1 (PR 2), fail side: outside the demo workspace every door is off for the author too (start.tsx BR-3), so the
  // author's card lands on Immigration programs, not on a page with nothing to do (the session's answer changed in the
  // browser only, as check_bk5_start_browser does).
  await p.route("**/api/session", async (r) => { const res = await r.fetch(); const j = await res.json(); j.workspace = { ...j.workspace, demo: false }; await r.fulfill({ response: res, json: j }); });
  await p.goto(`${BASE}/sign-in`); await p.locator("[data-sign-in]").waitFor({ timeout: 15000 });
  await p.waitForResponse((r) => new URL(r.url()).pathname === "/api/session", { timeout: 15000 }).catch(() => {});
  await p.locator('[data-sign-in-as="user-A"]').click(); await p.waitForURL((u) => u.pathname !== "/sign-in", { timeout: 15000 });
  step("BK-5 PR 2 fail side (break m1): outside the demo workspace the author lands on Immigration programs, not Starting points", new URL(p.url()).pathname === "/" && await stored(p) === "user-A", p.url());
  await p.unroute("**/api/session");
  await p.goBack(); await p.locator("[data-sign-in]").waitFor({ timeout: 15000 }).catch(() => {});
  step("break m3 fail side: Back to the sign-in page after choosing no longer says the person is unknown", new URL(p.url()).pathname === "/sign-in" && await p.locator("[data-sign-in-unknown]").count() === 0, p.url());
  await p.context().close();

  // 5. BR-5: a client from the picker reaches no Studio page and no case list.
  p = await fresh("user-P");
  await p.goto(`${BASE}/`); await where(p);
  await p.getByText("This page is for the configuration people").waitFor({ timeout: 15000 }).catch(() => {});
  step("BR-5: Client A on a Studio address is told it is for the configuration people (no Studio menu)", await p.getByText("This page is for the configuration people").isVisible() && await p.locator("[data-menu-column]").isVisible() === false);
  await p.goto(`${BASE}/cases`); await where(p);
  await p.getByText("Cases are for the case officer").waitFor({ timeout: 15000 }).catch(() => {});
  const listText = await p.locator("main").innerText();
  step("BR-5: Client A at the case list reads the firm's notice, with no case and no \"switch to\" words", /Cases are for the case officer/.test(listText) && !/switch to/i.test(listText) && !/Open a case/.test(listText), listText.slice(0, 200));
  await p.context().close();

  // 6. 375 px: the sign-in page and the header picker.
  p = await fresh(undefined, 375);
  await p.goto(`${BASE}/sign-in`); await where(p);
  step("375: the sign-in page has no sideways scroll", !(await sideways(p)));
  await p.screenshot({ path: path.join(SHOTS, "bk4a-sign-in-375.png"), fullPage: true });
  await p.locator('[data-sign-in-as="user-O"]').click(); await p.waitForURL((u) => u.pathname === "/cases", { timeout: 15000 }).catch(() => {}); await where(p);
  await picker(p).waitFor({ timeout: 15000 }).catch(() => {});
  step("375: the picker is in the header and the case list has no sideways scroll", new URL(p.url()).pathname === "/cases" && await picker(p).isVisible() && !(await sideways(p)), { url: p.url(), picker: await picker(p).count(), sideways: await sideways(p) });
  await p.screenshot({ path: path.join(SHOTS, "bk4a-case-list-375.png") });
  await p.context().close();
  p = await fresh("user-B");
  await p.goto(`${BASE}/`); await where(p);
  await p.screenshot({ path: path.join(SHOTS, "bk4a-studio-header-1440.png") });
  await axe(p, "the Studio with the one picker");
  await p.context().close();

  step("no page error on the way", errs.length === 0, errs.join(" | "));
  await b.close();
  console.log(`${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
