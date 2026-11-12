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
    step(`${W}: the case header links to its client's cases ("Client A's cases"; A24-3 review m2)`, (await link.textContent())?.trim() === "Client A's cases", await link.textContent());
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
    step(`${W}: a row opens its case, which names the same client (round trip)`, (await p.locator("h1").first().innerText()).includes("BK3C-A2") && (await p.locator("[data-case-client]").innerText()).trim() === "Client A's cases");
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
      // m1: the case page's hand-off to the client still switches the person (BK-4c: "Hand to Client A (simulated)", a
      // button, replaced the "Open it as Client A" link; the client page's links never switch).
      await p.goto(`${BASE}/cases/${a1.id}`); await p.locator("[data-handoff=client]").getByRole("button", { name: /^Hand to Client A \(simulated\)/ }).click(); await p.waitForURL(/\/questionnaire(\?|$)/, { timeout: 15000 });
      step(`${W}: the case page's "Hand to Client A (simulated)" still acts as Client A (the one control that switches)`, (await actorNow()) === "user-P", await actorNow());
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
    step(`${W}: Client A at a client page is refused, told how to see it (BR-1)`, /Choose a firm person under Acting as to see this client's cases\./.test(await p.locator("main").innerText()));
    step(`${W}: fail side: no case list read, no case reference on screen, no Back to a case address`, listReads.length === 0 && !/BK3C-/.test(await p.locator("main").innerText()) && (await p.locator("[data-where-back]").count()) === 0, { listReads, back: await p.locator("[data-where-back]").count() });
    await axe(`${W} the refusal`, "main");
    if (width === 1440) await p.screenshot({ path: path.join(SHOTS, `pr3-client-refused-${width}.png`) });

    // BR-2 in the browser: the solo representative's page for Client A holds only the solo case.
    await as("user-S"); await p.goto(`${BASE}/cases/clients/user-P`); await p.locator("[data-client-case]:visible").first().waitFor({ timeout: 30000 });
    const solo = await p.locator("[data-client-case]:visible").evaluateAll((rs) => rs.map((r) => r.getAttribute("data-client-case")));
    step(`${W}: the solo representative sees only the solo firm's case of Client A (BR-2)`, JSON.stringify(solo) === JSON.stringify(["BK3C-S1"]), solo);
  }
  // Break m5: ?client= names one login; an empty value or a list is refused (400), never read as "every client".
  for (const bad of ["client=", "client=user-P&client=user-Q"]) { // ("client[]=" is another parameter name to this server: ignored like any unknown one, the plain firm list)
    const r = await api(`/runtime/cases?${bad}`, { actor: "user-O" });
    step(`API fail side: ?${bad} is refused (400), not the firm's whole list`, r.status === 400, { status: r.status, n: r.body?.cases?.length });
  }

  await p.setViewportSize({ width: 1440, height: 900 });
  // Break m2: an answer that is not a list (a proxy's page) reads as "could not load", never "no cases".
  await as("user-O");
  await p.route(/\/api\/runtime\/cases\?client=/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: "<html>proxy</html>" }));
  await p.goto(`${BASE}/cases/clients/user-P`); await p.getByText("This client's cases could not be loaded", { exact: true }).waitFor({ timeout: 30000 }).catch(() => {});
  const proxyText = await p.locator("main").innerText();
  step("break m2: a non-list answer says the cases could not be loaded, and never \"no cases\" or \"0 cases shown\"", /could not be loaded/.test(proxyText) && !/no cases|0 cases shown/.test(proxyText), proxyText.slice(0, 200));
  await p.unroute(/\/api\/runtime\/cases\?client=/);
  // Review m4: the notice offers Try again, and it loads the cases once the answer is right.
  await p.getByRole("button", { name: "Try again" }).click(); await p.locator("[data-client-case]:visible").first().waitFor({ timeout: 30000 }).catch(() => {});
  step("review m4: Try again on the could-not-load notice loads the cases", (await p.locator("[data-client-case]:visible").count()) > 0);

  // Break M1: more than one page of Client A's cases; Load more, then switch "Acting as" to the solo firm: the Sample
  // firm's later page is dropped, never shown beside the solo firm's case. Break m1: a failed Load more says so.
  const extra = [];
  for (let i = 0; i < 100; i += 5) extra.push(...await Promise.all([0, 1, 2, 3, 4].map((k) => open("user-O", `BK3C-M${String(i + k).padStart(3, "0")}`, "user-P", `Sample Principal M${i + k}`))));
  step("setup: 100 more Sample-firm cases for Client A (two pages)", extra.every((c) => c?.id), extra.filter((c) => !c?.id).slice(0, 2));
  await p.goto(`${BASE}/cases/clients/user-P`); await p.locator("[data-client-case]:visible").first().waitFor({ timeout: 30000 });
  await p.route(/after=/, (r) => r.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ title: "Server error", status: 500, detail: "Broken on purpose" }) }));
  step("no page error in the walk so far", errs.length === 0, errs);
  errs.length = 0;
  await p.getByRole("button", { name: "Load more" }).click(); await p.getByText("More cases could not be loaded", { exact: true }).waitFor({ timeout: 15000 }).catch(() => {});
  step("break m1: a failed Load more says so, with no page error", (await p.getByText("More cases could not be loaded", { exact: true }).count()) === 1 && errs.length === 0, errs);
  await p.unroute(/after=/);
  await p.getByRole("button", { name: "Load more" }).click();
  await p.waitForFunction(() => document.querySelectorAll("tr[data-client-case]").length > 100, null, { timeout: 30000 }).catch(() => {});
  const before = await p.locator("tr[data-client-case]").count();
  step("Load more adds Client A's next page", before > 100, before);
  await p.locator('select[aria-label="Simulated person"]').selectOption("user-S");
  await p.waitForFunction(() => document.querySelectorAll("[data-client-case]").length > 0 && [...document.querySelectorAll("tr[data-client-case]")].every((r) => r.getAttribute("data-client-case") === "BK3C-S1"), null, { timeout: 30000 }).catch(() => {});
  const after = await p.locator("tr[data-client-case]").evaluateAll((rs) => rs.map((r) => r.getAttribute("data-client-case")));
  const lineAfter = await p.locator("[data-client-line]").innerText();
  step("break M1: after switching to the solo firm, only the solo firm's case shows and the count says 1 (BR-2, BR-5)", JSON.stringify(after) === JSON.stringify(["BK3C-S1"]) && /1 case shown at/.test(lineAfter), { n: after.length, first: after.slice(0, 3), lineAfter });
  // The same on the firm's case list (the pattern this page copied).
  await as("user-O"); await p.goto(`${BASE}/cases`); await p.getByRole("button", { name: "Load more" }).waitFor({ timeout: 30000 });
  await p.getByRole("button", { name: "Load more" }).click();
  await p.waitForFunction(() => document.querySelectorAll("tbody tr").length > 50, null, { timeout: 30000 }).catch(() => {});
  await p.locator('select[aria-label="Simulated person"]').selectOption("user-S");
  await p.waitForFunction(() => document.querySelectorAll("tbody tr").length > 0 && document.querySelectorAll("tbody tr").length < 10, null, { timeout: 30000 }).catch(() => {});
  const soloList = await p.locator("tbody tr td:first-child").allInnerTexts();
  step("break M1 on Cases: after Load more and a switch to the solo firm, no Sample-firm case stays listed", soloList.length > 0 && soloList.every((r) => !/^BK3C-(A|B|M)/.test(r.trim()) && r.trim() !== "SAMPLE-VV-FAMILY-1"), soloList.slice(0, 5));
  step("no page error in the walk", errs.length === 0, errs);
  await b.close();
  console.log(`${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
