// BK-4c (P-447 (2), P-456 (3), P-484; product/screens/BK-4-sign-in-hand-offs/concept.md §4, §5 "4c", §8) walked in a real
// browser: case work changes hands by named buttons. On the configured checkpoint (C10.1), the family case on Visitor visa:
//   the case officer's case page → "Hand to Client A (simulated)" → the questionnaire as Client A, ?from=the officer, the
//   notice once (BR-1, BR-4, BR-7); a Ctrl-click changes nobody; Client B's case hands to Client B and the questionnaire
//   address's hand-off uses the case's own client (no literal id); the client's "Hand back to the Case officer" only when
//   every part is answered, from a firm person, onto the case page (BR-2); "Send for review" → "Hand to the
//   Representative" → the round as the representative of record, hidden for the representative themself and before any
//   round (BR-2, BR-3); rights stay on the server (BR-5: the client reaches no officer page). axe (WCAG 2.2 AA) on each
//   hand-off, 1440 and 400 px with no sideways scroll on the hand-off's page. The walk counts person changes made other
//   than by a hand-off: 0. Screenshots into product/screens/BK-4-sign-in-hand-offs/screenshots/ (bk4c-*). US$0.
//   "Every part is answered" needs a fully answered case: the configured checkpoint has none (the family case is part
//   answered), so the hand back runs last, on the finished story (C10.2: its family case has every part answered).
//   COPY_PREFIX=screens zsh studio/tools/isolated.sh screens_bk4c 4453 start && node studio/tests/check_bk4c_browser.cjs 4453
const path = require("node:path"); const fs = require("node:fs");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4453);
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "BK-4-sign-in-hand-offs", "screenshots"); fs.mkdirSync(SHOTS, { recursive: true });
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined && !ok ? ` — ${String(typeof detail === "string" ? detail : JSON.stringify(detail)).slice(0, 300)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const errs = [];
  /** A fresh browser with its own stored person (set once, before the first page). */
  const fresh = async (who, width = 1440) => {
    const ctx = await b.newContext({ viewport: { width, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
    if (who) await ctx.addInitScript((a) => { try { if (!sessionStorage.getItem("bk4c-set")) { localStorage.setItem("xr-actor", a); sessionStorage.setItem("bk4c-set", "1"); } } catch { /* ignore */ } }, who);
    const p = await ctx.newPage(); p.on("pageerror", (e) => errs.push(e.message));
    // Every write of xr-actor, so the walk can count person changes not made by a hand-off (P-456 (3)).
    await p.addInitScript(() => { const set = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k === "xr-actor") { const w = (window.__writes = window.__writes || []); w.push({ to: v, by: document.activeElement?.closest("[data-handoff-button]") ? "handoff" : "other" }); try { sessionStorage.setItem("bk4c-writes", JSON.stringify([...(JSON.parse(sessionStorage.getItem("bk4c-writes") || "[]")), w[w.length - 1]])); } catch { /* ignore */ } } return set.call(this, k, v); }; });
    return p;
  };
  const stored = (p) => p.evaluate(() => localStorage.getItem("xr-actor"));
  const writes = (p) => p.evaluate(() => JSON.parse(sessionStorage.getItem("bk4c-writes") || "[]"));
  const said = async (p, re) => { try { await p.locator("[data-toaster]").getByText(re).first().waitFor({ timeout: 8000 }); return true; } catch { return false; } };
  const axe = async (p, name, include) => { const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).include(include).analyze(); step(`axe: ${name} has no WCAG 2.2 AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)); };
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  /** The hand-off's words keep a readable width (not squeezed beside the button; 400 px). */
  const roomy = async (p, sel) => { const w = await p.locator(sel).first().locator("p").first().evaluate((x) => x.getBoundingClientRect().width); return w >= Math.min(256, p.viewportSize().width - 64); };
  const fits = async (p, sel) => { const box = await p.locator(sel).first().boundingBox(); const w = p.viewportSize().width; return !!box && box.x >= 0 && box.x + box.width <= w + 1; };

  // Set-up: the configured checkpoint, its family case (Client A), and a new Client B case through the officer's route.
  const setup = await fresh();
  const api = async (pth, init = {}) => { const r = await setup.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, ...(init.data ? { data: init.data } : {}), timeout: 600000 }); let body = null; try { body = await r.json(); } catch { /* none */ } return { status: r.status(), body }; };
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  const loaded = await api("/demo/load", { method: "POST", data: { sample: "configured" } });
  const family = (await api("/runtime/cases", { actor: "user-O" })).body?.cases?.[0]?.id;
  const vv = (loaded.body?.combinations ?? []).find((c) => /Visitor visa/.test(c.label))?.id;
  const caseB = (await api("/runtime/cases", { method: "POST", actor: "user-O", data: { combinationId: vv, reference: "BK4C-CLIENT-B", clientActor: "user-Q", principal: { displayName: "Sample Client B" } } })).body?.id;
  step("setup: the configured checkpoint loads, with the family case, and a Client B case opens", loaded.status < 300 && !!family && !!caseB, { status: loaded.status, family, caseB });
  await setup.context().close();

  // 1. Case officer → Client A by the case page's hand-off (BR-1, BR-2, BR-4, BR-7).
  let p = await fresh("user-O");
  await p.goto(`${BASE}/cases/${family}`);
  const toClient = p.locator("[data-handoff=client]");
  await toClient.waitFor({ timeout: 60000 });
  const tc = await toClient.innerText();
  step("BR-2: the case page names who takes over and what they do (Client A answers on their phone)", /Next: Client A answers on their phone, for everyone travelling\./.test(tc) && (await toClient.getAttribute("data-handoff-to")) === "user-P", tc);
  step("BR-7: the hand-off is a button named \"Hand to Client A (simulated)\", not a link", await toClient.getByRole("button", { name: /^Hand to Client A \(simulated\)/ }).count() === 1 && await toClient.getByRole("link").count() === 0);
  await axe(p, "the case page's hand-off to the client", "[data-handoff=client]");
  await toClient.scrollIntoViewIfNeeded(); await p.screenshot({ path: path.join(SHOTS, "bk4c-case-to-client-1440.png") });
  // Fail side (build notes 4a): a Ctrl-click (or Cmd, Shift) changes nobody and opens nothing.
  const pagesBefore = p.context().pages().length;
  await toClient.getByRole("button").click({ modifiers: ["Control"] }); await toClient.getByRole("button").click({ modifiers: ["Shift"] }); await p.waitForTimeout(600);
  step("BR-7 fail side: a Ctrl-click or Shift-click on the hand-off changes nobody, stays on the page, opens no tab", await stored(p) === "user-O" && new URL(p.url()).pathname === `/cases/${family}` && p.context().pages().length === pagesBefore, { stored: await stored(p), url: p.url() });
  // By keyboard: Enter on the focused button hands over.
  await toClient.getByRole("button").focus(); await p.keyboard.press("Enter");
  await p.waitForURL((u) => u.pathname === `/cases/${family}/questionnaire`, { timeout: 15000 }).catch(() => {});
  const u1 = new URL(p.url());
  step("BR-4: the hand-off lands on the client's questionnaire, carrying from=the Case officer", u1.pathname === `/cases/${family}/questionnaire` && u1.searchParams.get("from") === "user-O", p.url());
  step("BR-1: the person is now Client A, said once (Now: Client A (simulated))", await stored(p) === "user-P" && await said(p, /Now: Client A \(simulated\)/));
  await p.getByRole("heading", { level: 1, name: "Client questionnaire" }).waitFor({ timeout: 30000 });
  step("BR-2 fail side: parts remain, so no hand back yet (the family case is part answered)", await p.locator("[data-handoff=back]").count() === 0 && /parts done/.test(await p.locator("main").innerText()));
  // Moving between parts keeps who hands back.
  await p.getByRole("button", { name: /Continue where you left off|Start/ }).first().click(); await p.waitForTimeout(800);
  const uPart = new URL(p.url());
  step("from is kept while the client moves between parts", uPart.searchParams.get("part") !== null && uPart.searchParams.get("from") === "user-O", p.url());
  // BR-5: rights stay on the server: the client reaches no officer page.
  await p.goto(`${BASE}/cases/${family}`); await p.waitForTimeout(1500);
  step("BR-5 fail side: Client A opening the case page is told it is the officer's (no officer view)", /This page is for the case officer/.test(await p.locator("main").innerText()) && await p.locator("[data-handoff=client]").count() === 0);
  const w1 = await writes(p);
  step("P-456 (3): in this walk every person change was a hand-off (0 by anything else)", w1.length === 1 && w1.every((w) => w.by === "handoff"), w1);
  await p.context().close();

  // 2. Client B's case targets Client B; the questionnaire address's hand-off uses the case's own client.
  p = await fresh("user-O");
  await p.goto(`${BASE}/cases/${caseB}`); await p.locator("[data-handoff=client]").waitFor({ timeout: 60000 });
  step("BR-3: Client B's case hands to Client B, from the case's own client", (await p.locator("[data-handoff=client]").getAttribute("data-handoff-to")) === "user-Q" && /Hand to Client B \(simulated\)/.test(await p.locator("[data-handoff=client]").innerText()));
  await p.goto(`${BASE}/cases/${caseB}/questionnaire`); await p.locator("[data-handoff=client]").waitFor({ timeout: 30000 });
  step("BR-3: the questionnaire address, opened as the officer, hands to the case's own client (Client B), never a literal Client A", (await p.locator("[data-handoff=client]").getAttribute("data-handoff-to")) === "user-Q" && !/Act as Client A/.test(await p.locator("main").innerText()));
  await p.locator("[data-handoff=client] button").click();
  await p.waitForURL((u) => u.searchParams.get("from") === "user-O", { timeout: 15000 }).catch(() => {});
  step("BR-4: …and it lands on that questionnaire as Client B, from the officer", await stored(p) === "user-Q" && new URL(p.url()).pathname === `/cases/${caseB}/questionnaire`);
  await p.context().close();

  // 4. Send for review → the representative of record (BR-2, BR-3, BR-4).
  p = await fresh("user-O");
  await p.goto(`${BASE}/cases/${family}`); await p.locator("[data-send-for-review]").waitFor({ timeout: 60000 });
  step("BR-2 fail side: before any round, no hand-off to the representative", await p.locator("[data-handoff=representative]").count() === 0);
  await p.locator("[data-send-for-review]").click(); await p.locator("[data-send-dialog]").waitFor();
  await p.locator("[data-send-dialog] input[type=checkbox]").first().check(); await p.locator("[data-confirm-send]").click();
  const toRep = p.locator("[data-handoff=representative]");
  await toRep.waitFor({ timeout: 30000 });
  const tr = await toRep.innerText();
  step("BR-2: after Send for review, the panel names who takes over: \"Sent for review (round 1) · Next: Representative … checks each form\"", /Sent for review \(round 1\)/.test(tr) && /Next: the Representative checks each form and approves it or sends it back\./.test(tr) && /Hand to the Representative \(simulated\)/.test(tr), tr);
  step("BR-3: the target is the case's representative of record (user-R), not the officer", (await toRep.getAttribute("data-handoff-to")) === "user-R");
  await axe(p, "the hand-off to the representative", "[data-handoff=representative]");
  await toRep.scrollIntoViewIfNeeded(); await p.screenshot({ path: path.join(SHOTS, "bk4c-to-representative-1440.png") });
  await toRep.getByRole("button").click({ modifiers: ["Control"] }); await p.waitForTimeout(500);
  step("BR-7 fail side: a Ctrl-click on the representative hand-off changes nobody", await stored(p) === "user-O");
  await toRep.getByRole("button").click();
  await p.waitForURL(/\/representative-review\/[^/?]+/, { timeout: 15000 }).catch(() => {});
  step("BR-4: it lands on that round as the Representative, said once", /\/cases\/[^/]+\/representative-review\/[^/?]+/.test(new URL(p.url()).pathname) && await stored(p) === "user-R" && await said(p, /Now: Representative \(simulated\)/), p.url());
  await p.getByText(/Representative's review · Round 1/).first().waitFor({ timeout: 30000 }).catch(() => {});
  step("BR-4: the round opens with the representative's own checklist (To check)", /Representative's review · Round 1/.test(await p.locator("main").innerText()) && /To check/.test(await p.locator("main").innerText()));
  await p.screenshot({ path: path.join(SHOTS, "bk4c-representative-round-1440.png") });
  await p.goto(`${BASE}/cases/${family}`); await p.locator("[data-readiness]").waitFor({ timeout: 60000 }); await p.waitForTimeout(1500);
  step("BR-2 fail side: the representative themself sees no hand-off to themself", await p.locator("[data-handoff=representative]").count() === 0);
  // Break M1 (BR-2): with a round waiting, the client card shows no second "Next" and no button to the client.
  const card = p.locator("[data-client-card=in-review]");
  step("break M1: while round 1 waits, the client card says the round is with the representative, with no hand-off to the client", await card.count() === 1 && /Round 1 is with the representative of record now\./.test(await card.innerText()) && await p.locator("[data-handoff=client]").count() === 0);
  const w4 = await writes(p);
  step("P-456 (3): officer → representative by the hand-off only (0 other person changes)", w4.length === 1 && w4.every((w) => w.by === "handoff" && w.to === "user-R"), w4);
  await p.context().close();

  // 5. 400 px: the hand-offs fit, no sideways scroll on the questionnaire page.
  p = await fresh("user-O", 400);
  await p.goto(`${BASE}/cases/${caseB}/questionnaire`); await p.locator("[data-handoff=client]").waitFor({ timeout: 30000 });
  step("400 px: the questionnaire address's hand-off fits the screen, no sideways scroll", await fits(p, "[data-handoff=client] button") && !(await sideways(p)));
  await p.screenshot({ path: path.join(SHOTS, "bk4c-questionnaire-handoff-400.png") });
  await p.goto(`${BASE}/cases/${caseB}`); await p.locator("[data-handoff=client]").waitFor({ timeout: 60000 });
  step("400 px: the case page's hand-off to the client fits, its words keep a readable width (button under them)", await fits(p, "[data-handoff=client] button") && await roomy(p, "[data-handoff=client]"));
  await p.locator("[data-handoff=client]").scrollIntoViewIfNeeded(); await p.screenshot({ path: path.join(SHOTS, "bk4c-case-to-client-400.png") });
  await p.goto(`${BASE}/cases/${family}`); await p.locator("[data-handoff=representative]").waitFor({ timeout: 60000 });
  step("400 px: the hand-off to the representative fits, its words keep a readable width", await fits(p, "[data-handoff=representative] button") && await roomy(p, "[data-handoff=representative]"));
  // Review r2 (records): the shot waits for the scrolled panel to paint (one run saved a blank frame).
  await p.locator("[data-handoff=representative]").scrollIntoViewIfNeeded(); await p.locator("[data-handoff=representative] button").waitFor({ state: "visible" }); await p.waitForTimeout(800);
  await p.screenshot({ path: path.join(SHOTS, "bk4c-case-handoffs-400.png") });
  await axe(p, "the case page's hand-offs at 400 px", "[data-handoff]");
  await p.context().close();

  // 3. The client hands back to whoever handed over, once every part is answered (finished story, C10.2).
  const setup2 = await fresh();
  const api2 = async (pth, init = {}) => { const r = await setup2.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, ...(init.data ? { data: init.data } : {}), timeout: 600000 }); let body = null; try { body = await r.json(); } catch { /* none */ } return { status: r.status(), body }; };
  const started = await api2("/demo/checkpoints/finished-story", { method: "POST", data: { confirm: "RESET" } });
  let story = null;
  for (let i = 0; i < 200; i++) { story = (await api2("/demo/status")).body?.story; if (story?.state !== "running") break; await setup2.waitForTimeout(3000); }
  const fam2 = story?.cases?.family;
  step("setup: the finished story loads, with its family case", started.status === 202 && story?.state === "done" && !!fam2, { started: started.status, state: story?.state, error: story?.error });
  const sum = (await api2(`/runtime/cases/${fam2}/questionnaire?mode=agent`, { actor: "user-O" })).body?.summary ?? {}; // for review m1, below
  // QA-427: what the client owes is their own questionnaire's (the household's summary also counts what staff enter);
  // read here, while this context is open.
  const owes = ((await api2(`/runtime/cases/${fam2}/questionnaire`, { actor: "user-O" })).body?.sections ?? []).reduce((n, x) => n + x.missing.length, 0);
  await setup2.context().close();
  p = await fresh("user-O");
  await p.goto(`${BASE}/cases/${fam2}`); await p.locator("[data-handoff=client]").waitFor({ timeout: 60000 });
  // Review m1 (BR-2): the case page's words follow the case's own summary (every required question answered, or not).
  const allAnswered = owes === 0, ct = await p.locator("[data-handoff=client]").innerText();
  step(`review m1, break M1: the case page's words match the case (${allAnswered ? "every part answered: no \"Next\" for the client" : "questions left: Next"})`, allAnswered ? /has answered every part and can still check the answers/.test(ct) && !/Next:/.test(ct) : /Next: Client A answers on their phone/.test(ct), { owes, sum, ct });
  // Review m2: the tip shows on keyboard focus.
  await p.locator("[data-handoff=client] button").focus(); await p.keyboard.press("Shift"); 
  const tipShown = await p.locator("[data-handoff-tip]").first().waitFor({ timeout: 3000 }).then(() => true, () => false);
  step("review m2: the hand-off's tip shows on keyboard focus (\"You act as Client A (simulated) in this tab…\")", tipShown && /You act as Client A \(simulated\) in this tab/.test(await p.locator("[data-handoff-tip]").first().innerText()));
  await p.locator("[data-handoff=client] button").click();
  await p.waitForURL((u) => u.pathname === `/cases/${fam2}/questionnaire`, { timeout: 15000 }).catch(() => {});
  // Review m4: Back to the officer's page as the client, then the link back keeps the hand back.
  await p.locator("[data-handoff=back]").waitFor({ timeout: 30000 }).catch(() => {});
  await p.goBack(); await p.getByText("This page is for the case officer").waitFor({ timeout: 15000 }).catch(() => {});
  await p.getByRole("link", { name: "your Client questionnaire" }).click();
  await p.locator("[data-handoff=back]").waitFor({ timeout: 30000 }).catch(() => {});
  step("review m4: Back to the officer's page, then \"your Client questionnaire\": the hand back is still there (from kept)", new URL(p.url()).searchParams.get("from") === "user-O" && await p.locator("[data-handoff=back]").count() === 1, p.url());
  const back = p.locator("[data-handoff=back]");
  await back.waitFor({ timeout: 30000 }).catch(() => {});
  const bt = await back.innerText().catch(() => "");
  step("BR-2: every part answered → \"Next: the Case officer picks up from here.\" and \"Hand back to the Case officer (simulated)\"", /Every part is answered/.test(await p.locator("main").innerText()) && /Next: the Case officer picks up from here\./.test(bt) && /Hand back to the Case officer \(simulated\)/.test(bt) && (await back.getAttribute("data-handoff-to")) === "user-O", bt);
  await axe(p, "the client's hand back", "[data-handoff=back]");
  await p.screenshot({ path: path.join(SHOTS, "bk4c-client-hand-back-1440.png") });
  await p.setViewportSize({ width: 400, height: 900 });
  step("400 px: the hand back fits the screen, no sideways scroll", await fits(p, "[data-handoff=back] button") && !(await sideways(p)));
  await p.screenshot({ path: path.join(SHOTS, "bk4c-client-hand-back-400.png") });
  await p.setViewportSize({ width: 1440, height: 900 });
  await back.getByRole("button").click({ modifiers: ["Control"] }); await p.waitForTimeout(500);
  step("BR-7 fail side: a Ctrl-click on the hand back changes nobody", await stored(p) === "user-P");
  await back.getByRole("button").click();
  await p.waitForURL((u) => u.pathname === `/cases/${fam2}`, { timeout: 15000 }).catch(() => {});
  step("BR-4: the hand back lands on the case page as the Case officer, said once", new URL(p.url()).pathname === `/cases/${fam2}` && await stored(p) === "user-O" && await said(p, /Now: Case officer \(simulated\)/), p.url());
  await p.locator("[data-handoff=client]").waitFor({ timeout: 60000 }).catch(() => {});
  step("BR-4: the case page opens for the officer (its own hand-off to the client is there again)", await p.locator("[data-handoff=client]").count() === 1);
  const w3 = await writes(p);
  step("P-456 (3): officer → Client A → officer by hand-offs only (0 other person changes)", w3.length === 2 && w3.every((w) => w.by === "handoff") && w3.map((w) => w.to).join(",") === "user-P,user-O", w3);
  await p.context().close();
  // Fail sides: no `from`, a Studio person, an unknown id: no hand back (today's words only).
  for (const [q, why] of [["", "no from"], ["?from=user-B", "from a Studio person (the Approver)"], ["?from=user-Z", "from an unknown id"], ["?from=user-P", "from a client"], ["?from=user-S", "a hand-typed firm person who did not hand it over (review m3)"], ["?from=user-O", "the case's officer typed by hand, no hand-off in this tab (review m3)"]]) {
    p = await fresh("user-P");
    await p.goto(`${BASE}/cases/${fam2}/questionnaire${q}`); await p.getByText("Every part is answered").waitFor({ timeout: 30000 }).catch(() => {});
    step(`BR-2 fail side: every part answered but ${why}: no hand back`, /Every part is answered/.test(await p.locator("main").innerText()) && await p.locator("[data-handoff=back]").count() === 0);
    await p.context().close();
  }

  step("no page errors", errs.length === 0, errs);
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("STOP ", e); process.exit(1); });
