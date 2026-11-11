// BK-3 PR 3 (P-447 (2), Bake plan row 3; concept product/screens/BK-3-client-page/concept.md, approved by the tech lead):
// a small client page, linked both ways with its cases, walked in a real browser at 1440 and 375 px on the configured
// checkpoint (C10.1). A client is the simulated login that answers a case. One pass and one fail side per rule:
// BR-1 staff only (a client is refused, no case read sent) · BR-2 firm scope (the solo firm's case of the same login never
// shows at the Sample firm) · BR-3 only this client's cases · BR-4 names and roles only · BR-5 one read per page view and
// an honest count · BR-6 links both ways, neither changes the simulated person · BR-7 unknown login: "No such client", no
// read · BR-8 "Open a case for Client B" opens the dialog with Client B chosen; Cancel stays on the page. axe (WCAG 2.2
// AA) on the page and the case header's link at both widths. Screenshots into product/screens/BK-3-client-page/screenshots/.
// No model call (US$0).
//   COPY_PREFIX=screens zsh studio/tools/isolated.sh screens_bk3c 4443 start && node studio/tests/check_bk3_client_browser.cjs 4443
const path = require("node:path"); const fs = require("node:fs");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4443);
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "BK-3-client-page", "screenshots"); fs.mkdirSync(SHOTS, { recursive: true });
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined && !ok ? ` — ${String(typeof detail === "string" ? detail : JSON.stringify(detail)).slice(0, 300)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  // Every read of the case list (not of one case) the page sends, for BR-1, BR-5 and BR-7.
  const listReads = [];
  p.on("request", (r) => { const u = new URL(r.url()); if (u.pathname === "/api/runtime/cases" && r.method() === "GET") listReads.push(u.search); });
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, ...(init.data ? { data: init.data } : {}), timeout: 600000 }); let body = null; try { body = await r.json(); } catch { /* no body */ } return { status: r.status(), body }; };
  const axe = async (name, sel) => {
    const r = await new AxeBuilder({ page: p }).include(sel).withTags(TAGS).analyze();
    step(`${name}: axe finds no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
  };
  const actorNow = () => p.evaluate(() => { try { return localStorage.getItem("xr-actor"); } catch { return null; } });
  const as = async (actor) => { await p.goto(`${BASE}/inbox`); await p.evaluate((a) => { try { localStorage.setItem("xr-actor", a); } catch { /* ignore */ } }, actor); };
  const settled = () => p.waitForLoadState("networkidle", { timeout: 30000 }).then(() => p.waitForTimeout(300));

  await p.goto(BASE);
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  const loaded = await api("/demo/load", { method: "POST", data: { sample: "configured" } });
  step("setup: the configured checkpoint loads", loaded.status < 300, loaded.status);
  const openable = (await api("/runtime/openable", { actor: "user-O" })).body ?? [];
  const released = openable.find((r) => r.startable && /visitor visa/i.test(r.combination)) ?? openable.find((r) => r.startable);
  const open = async (actor, reference, clientActor, principal) => (await api("/runtime/cases", { method: "POST", actor, data: { combinationId: released?.combination_id, reference, clientActor, principal: { displayName: principal }, idempotencyKey: `${reference}-${Date.now()}` } })).body;
  const a1 = await open("user-O", "BK3C-A1", "user-P", "Sample Principal One");
  const a2 = await open("user-O", "BK3C-A2", "user-P", "Sample Principal Two");
  const b1 = await open("user-O", "BK3C-B1", "user-Q", "Sample Principal Three");
  const s1 = await open("user-S", "BK3C-S1", "user-P", "Sample Principal Four");
  step("setup: two Sample-firm cases for Client A, one for Client B, one solo-firm case for Client A", [a1, a2, b1, s1].every((c) => c?.id), [a1, a2, b1, s1].map((c) => c?.id ?? c));

  // The read underneath (B1 fix (a)): one filtered list, inside the firm.
  const lp = await api("/runtime/cases?client=user-P&take=100", { actor: "user-O" });
  const refsA = (lp.body?.cases ?? []).map((c) => c.reference);
  step("BR-3 API: ?client=user-P lists Client A's cases and every row is Client A's", refsA.includes("BK3C-A1") && refsA.includes("BK3C-A2") && (lp.body?.cases ?? []).every((c) => c.client === "user-P"), lp.body);
  step("BR-3 API fail side: Client B's case is not on Client A's list", !refsA.includes("BK3C-B1"), refsA);
  step("BR-2 API fail side: the solo firm's case of the same login is not on the Sample firm's list", !refsA.includes("BK3C-S1"), refsA);
  const ls = await api("/runtime/cases?client=user-P", { actor: "user-S" });
  step("BR-2 API: the solo representative sees only the solo firm's case of Client A", JSON.stringify((ls.body?.cases ?? []).map((c) => c.reference)) === JSON.stringify(["BK3C-S1"]), ls.body);
  const rowA1 = (lp.body?.cases ?? []).find((c) => c.reference === "BK3C-A1");
  step("BR-4 API: each row lists its people by name and role", JSON.stringify(rowA1?.people) === JSON.stringify([{ label: "Sample Principal One", role: "principal" }]), rowA1);
  step("BR-4 API fail side: no answer, progress or privacy key in a row", !/keep_?private|answer|progress|summary/i.test(JSON.stringify(lp.body)), Object.keys(rowA1 ?? {}));
  const refused = await api("/runtime/cases?client=user-P", { actor: "user-P" });
  step("BR-1 API: a client asking for a client's cases is refused (403)", refused.status === 403, refused.status);
  const plain = await api("/runtime/cases", { actor: "user-O" });
  step("API: without ?client the list is as before, each row naming its client, with no people", (plain.body?.cases ?? []).length >= 3 && plain.body.cases.every((c) => typeof c.client === "string" && !("people" in c)), plain.body?.cases?.[0]);

  for (const width of [1440, 375]) {
    await p.setViewportSize({ width, height: width === 375 ? 812 : 900 });
    const W = `BK-3 PR 3 ${width}`;
    // BR-6: case → client, as the case officer; the person acting stays the same.
    await as("user-O"); await p.goto(`${BASE}/cases/${a1.id}`);
    const link = p.locator("[data-case-client]");
    await link.waitFor({ timeout: 30000 });
    step(`${W}: the case header names its client "Client A"`, (await link.textContent())?.trim() === "Client A", await link.textContent());
    await axe(`${W} the case header's client link`, "[data-case-client]");
    if (width === 1440) await p.screenshot({ path: path.join(SHOTS, `pr3-case-client-link-${width}.png`) });
    listReads.length = 0;
    await link.click(); await p.waitForURL(/\/cases\/clients\/user-P$/, { timeout: 15000 }); await p.locator("[data-client-case]:visible").first().waitFor({ timeout: 30000 }); await settled();
    step(`${W}: the client link leaves the person acting as the case officer (BR-6)`, (await actorNow()) === "user-O", await actorNow());
    const line = (await p.locator('nav[aria-label="Path"]').innerText()).replace(/\s+/g, " ").trim();
    step(`${W}: the line reads "Cases › Client A"`, line === "Cases › Client A", line);
    step(`${W}: Back goes to Cases`, (await p.locator("[data-where-back]").getAttribute("href")) === "/cases", await p.locator("[data-where-back]").getAttribute("href"));
    step(`${W}: one read of the case list for the page view (BR-5, STANDARDS §5)`, listReads.length === 1 && /client=user-P/.test(listReads[0]), listReads);
    const shown = await p.locator("[data-client-case]:visible").evaluateAll((rs) => rs.map((r) => r.getAttribute("data-client-case")));
    step(`${W}: the page lists exactly Client A's Sample-firm cases (BR-3)`, JSON.stringify([...shown].sort()) === JSON.stringify([...refsA].sort()), { shown, refsA });
    step(`${W}: fail side: neither Client B's case nor the solo firm's case shows (BR-2, BR-3)`, !shown.includes("BK3C-B1") && !shown.includes("BK3C-S1"), shown);
    const lineText = await p.locator("[data-client-line]").innerText();
    step(`${W}: the count says what it counts ("${shown.length} cases shown") and says the client is a simulated login (BR-5)`, lineText.includes(`${shown.length} case${shown.length === 1 ? "" : "s"} shown at`) && /Simulated client login/.test(lineText), lineText);
    const rowText = await p.locator('[data-client-case="BK3C-A1"]:visible').innerText();
    step(`${W}: a case's people by name and role (BR-4)`, /Sample Principal One · Principal applicant/.test(rowText), rowText);
    step(`${W}: ${width < 640 ? "one card per case" : "one table row per case"}`, (await p.locator(width < 640 ? "li[data-client-case]:visible" : "tr[data-client-case]:visible").count()) === shown.length);
    const pageText = await p.locator("[data-client-page]").innerText();
    step(`${W}: fail side: no answers, progress or privacy words on the page (BR-4)`, !/keep private|answered|to confirm|required not answered/i.test(pageText), pageText.slice(0, 200));
    const filled = await p.locator("main button.bg-primary, main [data-client-open-case]").count();
    step(`${W}: one filled button, "Open a case for Client A"`, (await p.locator("[data-client-open-case]").innerText()).trim() === "Open a case for Client A", filled);
    const sw = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    step(`${W}: no sideways scroll`, sw <= 0, sw);
    await axe(`${W} the client page`, "main");
    await p.screenshot({ path: path.join(SHOTS, `pr3-client-page-${width}.png`), fullPage: true });
    // BR-6: client → another case, and back.
    await p.locator('[data-client-case="BK3C-A2"]:visible a').first().click(); await p.waitForURL(new RegExp(`/cases/${a2.id}$`), { timeout: 15000 });
    await p.locator("[data-case-client]").waitFor({ timeout: 30000 });
    step(`${W}: a row opens its case, which names the same client (round trip)`, (await p.locator("h1").first().innerText()).includes("BK3C-A2") && (await p.locator("[data-case-client]").innerText()).trim() === "Client A");
    step(`${W}: the row's link leaves the person acting as the case officer`, (await actorNow()) === "user-O", await actorNow());

    // BR-8: Open a case for Client B, in place, with Client B chosen; Cancel stays.
    await p.goto(`${BASE}/cases/clients/user-Q`); await p.locator("[data-client-open-case]").waitFor({ timeout: 30000 }); await settled();
    await p.locator("[data-client-open-case]").click();
    const sel = p.getByLabel("Client login that answers");
    await sel.waitFor({ timeout: 15000 });
    step(`${W}: Open a case for Client B opens the dialog with Client B chosen (BR-8, challenge M1)`, (await sel.inputValue()) === "user-Q", await sel.inputValue());
    if (width === 1440) await p.screenshot({ path: path.join(SHOTS, `pr3-open-a-case-for-client-b-${width}.png`) });
    await p.getByRole("button", { name: "Cancel" }).click(); await p.waitForTimeout(300);
    step(`${W}: Cancel stays on Client B's page`, new URL(p.url()).pathname === "/cases/clients/user-Q" && (await p.getByLabel("Client login that answers").count()) === 0, p.url());
    if (width === 1440) {
      await p.locator("[data-client-open-case]").click(); await p.getByLabel("Client login that answers").waitFor({ timeout: 15000 });
      await p.getByLabel("Case reference").fill("BK3C-B2"); await p.getByLabel("Principal applicant's name").fill("Sample Principal Five");
      await p.getByRole("button", { name: "Open case" }).click();
      await p.waitForURL(/\/cases\/[0-9a-f-]{36}$/, { timeout: 30000 });
      const made = await api(`/runtime/cases/${p.url().split("/").pop()}`, { actor: "user-O" });
      step(`${W}: the case opened from Client B's page is Client B's (BR-8)`, made.body?.reference === "BK3C-B2" && made.body?.client === "user-Q", { ref: made.body?.reference, client: made.body?.client });
      // m1: the existing "Open it as Client A" still switches the person (the one link that does).
      await p.goto(`${BASE}/cases/${a1.id}`); await p.getByRole("link", { name: /Open it as Client A/ }).click(); await p.waitForURL(/questionnaire$/, { timeout: 15000 });
      step(`${W}: "Open it as Client A" still acts as Client A (the one link that switches)`, (await actorNow()) === "user-P", await actorNow());
    }

    // BR-7: an unknown login: "No such client", no read.
    await as("user-O"); listReads.length = 0;
    await p.goto(`${BASE}/cases/clients/user-Z`); await p.getByText("No such client", { exact: true }).waitFor({ timeout: 30000 }); await settled();
    step(`${W}: an unknown login reads "No such client" with Back to Cases (BR-7)`, (await p.locator("[data-where-back]").getAttribute("href")) === "/cases");
    step(`${W}: fail side: no case list read for an unknown login`, listReads.length === 0, listReads);
    // A bare /cases/clients goes to Cases.
    await p.goto(`${BASE}/cases/clients`); await p.waitForURL(/\/cases$/, { timeout: 15000 });
    step(`${W}: /cases/clients goes to Cases`, new URL(p.url()).pathname === "/cases", p.url());

    // BR-1: a client at the address is refused, with no read and no case named.
    await as("user-P"); listReads.length = 0;
    await p.goto(`${BASE}/cases/clients/user-P`); await p.getByText("This page is for the firm's staff", { exact: true }).waitFor({ timeout: 30000 }); await settled();
    step(`${W}: Client A at a client page is refused, told how to see it (BR-1)`, /Switch to the case officer/.test(await p.locator("main").innerText()));
    step(`${W}: fail side: no case list read, no case reference on screen, no Back to a case address`, listReads.length === 0 && !/BK3C-/.test(await p.locator("main").innerText()) && (await p.locator("[data-where-back]").count()) === 0, { listReads, back: await p.locator("[data-where-back]").count() });
    await axe(`${W} the refusal`, "main");
    if (width === 1440) await p.screenshot({ path: path.join(SHOTS, `pr3-client-refused-${width}.png`) });

    // BR-2 in the browser: the solo representative's page for Client A holds only the solo case.
    await as("user-S"); await p.goto(`${BASE}/cases/clients/user-P`); await p.locator("[data-client-case]:visible").first().waitFor({ timeout: 30000 });
    const solo = await p.locator("[data-client-case]:visible").evaluateAll((rs) => rs.map((r) => r.getAttribute("data-client-case")));
    step(`${W}: the solo representative sees only the solo firm's case of Client A (BR-2)`, JSON.stringify(solo) === JSON.stringify(["BK3C-S1"]), solo);
  }
  step("no page error in the walk", errs.length === 0, errs);
  await b.close();
  console.log(`${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
