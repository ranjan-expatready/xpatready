// BK-5 PR 1 (P-447 (2), Bake squeeze S3, P-481; concept rev 2, P-484): Demo › Starting points walked in a real browser
// like a person. Reached from the Demo menu's first item (by keyboard), the page names itself one way (menu, line, tab,
// heading) and shows three starting points. One pass and one fail per business rule:
//   BR-1 each door says what goes (the row count), what comes back, what is kept; the done notice says the kept files
//        were checked unchanged. BR-2 RESET only when the demo has programs: no POST until it is typed; none asked when
//        empty; a double click sends one start. BR-3 as the Approver every door is off with the reason and no /demo POST
//        is sent (the server refuses a direct POST too); a workspace that is not the demo: doors off up front.
//   BR-4 "Last loaded" only from /demo/status: Nothing set up, Pathways released, The finished story, and "Another state"
//        while a load runs in another tab. BR-5 a start while another load runs shows the server's own words; the
//        finished story's progress survives a reload. BR-6 door 2 is two calls: a configured step made to fail after the
//        six loaded (a trigger refusing the checkpoint's last line, dropped in finally) gives the part-way words, RESET
//        stays typed, Try again runs both calls and lands on Immigration programs. BR-7 no live AI route is called.
// Gate A: each door lands on its first step (doors 1-2: Immigration programs; door 3: the family case). 1440 and 375 px,
// no sideways scroll, axe (WCAG 2.2 AA) on the page and the dialog. Screenshots in product/screens/BK-5-start-page/
// screenshots/. Replays only, no model call (US$0).
//   COPY_PREFIX=screens zsh studio/tools/isolated.sh screens_bk5 4451 start && node studio/tests/check_bk5_start_browser.cjs 4451 xr_studio_screens_bk5
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4451), DB = process.argv[3] ?? "xr_studio_screens_bk5", NAME = DB.replace(/^xr_studio_/, "");
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "BK-5-start-page", "screenshots"); fs.mkdirSync(SHOTS, { recursive: true });
const RESET_LOG = path.join(__dirname, "..", "var", `isolated-${NAME}`, "reset-log.jsonl");
const resets = () => (fs.existsSync(RESET_LOG) ? fs.readFileSync(RESET_LOG, "utf8").split("\n").filter(Boolean).length : 0);
const PSQL = ["/opt/homebrew/opt/postgresql@18/bin/psql", "/usr/lib/postgresql/18/bin/psql", "psql"].find((x) => x === "psql" || fs.existsSync(x));
const sql = (q) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const n = (q) => Number(sql(q));
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(typeof detail === "string" ? detail : JSON.stringify(detail)).slice(0, 300)}` : ""}`); };
const LONG = 400000;

(async () => {
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  // Every POST the page sends (BR-2, BR-3, BR-6, BR-7).
  const posts = []; p.on("request", (r) => { if (r.method() === "POST") posts.push(new URL(r.url()).pathname); });
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, ...(init.data ? { data: init.data } : {}), timeout: 600000 }); let body = null; try { body = await r.json(); } catch { /* no body */ } return { status: r.status(), body }; };
  const as = async (actor) => { await p.evaluate((a) => { try { localStorage.setItem("xr-actor", a); } catch { /* ignore */ } }, actor); };
  const dialog = () => p.getByRole("dialog");
  const door = (k) => p.locator(`[data-door="${k}"]`);
  const lastLoaded = async () => { await p.locator("[data-last-loaded] b").waitFor({ timeout: 30000 }); return p.locator("[data-last-loaded]").innerText(); };
  const openStart = async () => { await p.goto(`${BASE}/start`); await p.locator("[data-start-doors]").waitFor({ timeout: 30000 }); return lastLoaded(); };
  const sideways = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const axe = async (name, include) => { const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).include(include).analyze(); step(`axe (WCAG 2.2 AA) on ${name}: no violations`, r.violations.length === 0, r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`).join("; ")); };
  const shot = (name) => p.screenshot({ path: path.join(SHOTS, `${name}.png`) });
  const toastText = async (re) => { const t = p.locator("[data-toaster] > *").filter({ hasText: re }).first(); await t.waitFor({ timeout: 15000 }); return t.innerText(); };

  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  await p.goto(BASE); await p.waitForLoadState("networkidle");

  // ---- Reached from the Demo menu, by keyboard; one name everywhere.
  await p.getByRole("button", { name: "Demo" }).focus(); await p.keyboard.press("Enter");
  await p.getByRole("menu").waitFor();
  await p.waitForFunction(() => !!document.activeElement?.closest("[role=menu]"), null, { timeout: 5000 });
  const first = await p.evaluate(() => (document.activeElement?.textContent ?? "").trim());
  const items = await p.getByRole("menuitem").allInnerTexts();
  step("BK-5: Starting points… is the Demo menu's first item, focused on opening, and avoids Reset, Load and configured checkpoint", first === "Starting points…" && items[0] === "Starting points…" && !/Reset|Load|configured checkpoint/.test(items[0]), items);
  await p.keyboard.press("Enter");
  await p.waitForURL(`${BASE}/start`, { timeout: 10000 });
  const ll0 = await lastLoaded();
  const line = (await p.locator("[data-where]").first().innerText()).replace(/\s+/g, " ");
  step("BK-5: one name: the line says Demo › Starting points, the tab and the heading say Starting points, with a Demo pill", /Demo › Starting points/.test(line) && (await p.title()) === "Starting points · Product Studio" && (await p.getByRole("heading", { level: 1 }).innerText()).replace(/\s+/g, " ") === "Starting points Demo", { line, title: await p.title() });
  step("BR-4: an empty demo reads \"Last loaded: Nothing set up\" and that card says Last loaded", /Last loaded: Nothing set up/.test(ll0) && await door("blank").getByText("Last loaded").count() === 1, ll0);
  const filledButtons = await p.locator("[data-start-doors] .bg-primary").count();
  step("P-473: one filled button on the page, E1's door \"Start here\"", filledButtons === 1 && /bg-primary/.test(await door("configured").getByRole("button", { name: "Start here" }).getAttribute("class")), filledButtons);
  await shot("bk5-01-start-empty-1440");
  await axe("the start page", "main");

  // ---- BR-2 pass (empty): no RESET asked; BR-7 and BR-1: the dialog's words. Cancel sends nothing.
  await door("configured").getByRole("button", { name: "Start here" }).click();
  await dialog().getByText("Empty the demo and start from Pathways released, ready to walk?").waitFor();
  const dt = await dialog().innerText();
  step("BR-1: the confirm says what goes (with the row count), what comes back and what is kept, checked byte-identical", /Goes/.test(dt) && /No programs: only \d+ record lines?/.test(dt) && /Comes back/.test(dt) && /Kept/.test(dt) && /checked byte-identical/.test(dt), dt.slice(0, 300));
  step("BR-6: door 2 says to keep this page open until it finishes", /Keep this page open until it finishes/.test(dt));
  step("BR-2 pass: an empty demo asks for no RESET and the destructive button is ready", await p.getByLabel("Type RESET to confirm").count() === 0 && await dialog().getByRole("button", { name: "Empty and start" }).isEnabled() && /bg-danger/.test(await dialog().getByRole("button", { name: "Empty and start" }).getAttribute("class")));
  await shot("bk5-02-confirm-empty-1440");
  await axe("the confirm dialog", "[role=dialog]");
  await p.setViewportSize({ width: 375, height: 800 });
  step("375 px: the dialog fits with no sideways scroll", (await sideways()) <= 0);
  await shot("bk5-03-confirm-375");
  await p.setViewportSize({ width: 1440, height: 900 });
  const before = posts.length;
  await p.keyboard.press("Escape"); await dialog().waitFor({ state: "detached" });
  step("Cancel (Escape) sends nothing", posts.length === before);
  await p.waitForFunction(() => document.activeElement?.getAttribute("data-start-door") === "configured", null, { timeout: 3000 }).catch(() => undefined);
  step("Keyboard (break m4): closing the confirm puts focus back on the door that opened it", await p.evaluate(() => document.activeElement?.getAttribute("data-start-door")) === "configured");

  // ---- Review M1: the page never sends RESET for the person on a state it has not read, or that changed meanwhile.
  await p.route("**/api/demo/status", async (r) => { await new Promise((res) => setTimeout(res, 3000)); await r.continue().catch(() => undefined); });
  await p.goto(`${BASE}/start`); await p.locator("[data-start-doors]").waitFor();
  const offUnread = await p.locator("[data-start-door]").evaluateAll((bs) => bs.length === 3 && bs.every((x) => x.disabled));
  await p.unroute("**/api/demo/status");
  step("BR-2 fail (review M1): until the demo's state is read every door is off", offUnread);
  await openStart();
  await door("blank").getByRole("button", { name: /Start from nothing|Start again from here/ }).click();
  await dialog().getByText(/Empty the demo and start from Nothing set up/).waitFor();
  const noResetAsked = await p.getByLabel("Type RESET to confirm").count() === 0;
  const six = await api("/demo/load", { method: "POST", data: { sample: "six" } }); // "another tab" loads the six meanwhile
  const pm = posts.length, rm = resets();
  await dialog().getByRole("button", { name: "Empty and start" }).click();
  await p.locator("[data-start-failed]").waitFor({ timeout: 30000 });
  const changed = await p.locator("[data-start-failed]").innerText();
  const askedNow = await p.getByLabel("Type RESET to confirm").waitFor({ timeout: 10000 }).then(() => true, () => false);
  step("BR-2 fail (review M1): programs loaded in another tab after the dialog opened: no reset is sent, nothing emptied, RESET is asked", noResetAsked && six.status < 300 && !posts.slice(pm).includes("/api/demo/reset") && resets() === rm && n("select count(*) from program_def") > 0 && /nothing was emptied/.test(changed) && askedNow, { six: six.status, sent: posts.slice(pm), changed });
  const dFull = await dialog().innerText();
  step("BR-1: with programs the confirm counts the rows that go", /All configuration, releases and cases: [1-9]\d* rows/.test(dFull), dFull.slice(0, 200));
  await p.keyboard.press("Escape"); await dialog().waitFor({ state: "detached" });
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } }); // back to empty for what follows

  // ---- BR-3: the Approver sees every door off with the reason; nothing is sent; the server refuses a direct POST.
  await as("user-B"); await openStart();
  const offWords = await p.locator("[data-start-doors]").locator("..").innerText();
  const doorsOff = await p.locator("[data-start-door]").evaluateAll((bs) => bs.every((x) => x.disabled));
  const p0 = posts.length;
  await door("configured").getByRole("button", { name: "Start here" }).click({ force: true }).catch(() => undefined);
  await p.waitForTimeout(500);
  step("BR-3 fail: as the Approver every door is off, the reason is said, and a click sends no /demo POST", doorsOff && /Only the Configuration author loads a starting point/.test(offWords) && posts.slice(p0).every((x) => !x.startsWith("/api/demo")) && await dialog().count() === 0, { doorsOff, sent: posts.slice(p0) });
  const direct = await api("/demo/reset", { method: "POST", actor: "user-B", data: { confirm: "RESET" } });
  step("BR-3 fail (server): a direct reset as the Approver is refused (403)", direct.status === 403, direct.status);
  await shot("bk5-04-not-author-1440");
  // BK-5 PR 2: the disabled state links to the sign-in page (the one place a person is chosen, BK-4a BR-1); the author's
  // card brings the walk back here with the doors on.
  const asAuthor = p.getByRole("link", { name: "Sign in as the Configuration author" });
  step("BK-5 PR 2: \"Sign in as the Configuration author\" is a link to the sign-in page and changes nobody by itself", await asAuthor.getAttribute("href") === "/sign-in" && await p.getByRole("button", { name: "Sign in as the Configuration author" }).count() === 0);
  await asAuthor.click(); await p.waitForURL((u) => u.pathname === "/sign-in", { timeout: 15000 });
  step("BK-5 PR 2 fail side: following it, the person is still the Approver until a card is chosen", await p.evaluate(() => localStorage.getItem("xr-actor")) === "user-B");
  await p.locator('[data-sign-in-as="user-A"]').click(); await p.waitForURL((u) => u.pathname === "/start", { timeout: 15000 });
  await p.waitForFunction(() => [...document.querySelectorAll("[data-start-door]")].some((x) => !x.disabled), null, { timeout: 10000 });
  step("BR-3 pass: signing in as the Configuration author lands back on Starting points and the doors come on", await door("configured").getByRole("button", { name: "Start here" }).isEnabled());
  // Not the demo workspace (the session's answer changed in the browser only; the server's own guard is check_d1/C5.5's).
  await p.route("**/api/session", async (r) => { const res = await r.fetch(); const j = await res.json(); j.workspace = { ...j.workspace, demo: false }; await r.fulfill({ response: res, json: j }); });
  await openStart();
  const nd = await p.locator("main").innerText();
  step("BR-3 fail: a workspace that is not the demo has every door off up front, with the reason", await p.locator("[data-start-door]").evaluateAll((bs) => bs.every((x) => x.disabled)) && /This workspace is not the demo: starting points would empty real work, so they are off/.test(nd));
  await p.unroute("**/api/session");

  // ---- BR-4 "Another state" and BR-5: a load runs in another tab; a start meanwhile shows the server's own words.
  const other = api("/demo/load", { method: "POST", data: { sample: "configured" } });
  for (let i = 0; i < 240 && n("select count(*) from program_def") === 0; i++) await p.waitForTimeout(250);
  const llOther = await openStart();
  step("BR-4 fail: while a configured load runs in another tab the page says Another state, not a door", /Another state \(for example the six, or a load not finished\)/.test(llOther) && await p.locator("[data-last]").count() === 0, llOther);
  await door("blank").getByRole("button", { name: "Start from nothing" }).click();
  await dialog().getByText(/Empty the demo and start from Nothing set up/).waitFor();
  const go = dialog().getByRole("button", { name: "Empty and start" });
  step("BR-2 fail: with programs the destructive button stays off until RESET is typed (lower case does not count)", await go.isDisabled() && await (async () => { await p.getByLabel("Type RESET to confirm").fill("reset"); return go.isDisabled(); })());
  const r1 = resets(), p1 = posts.length;
  await go.click({ force: true }).catch(() => undefined); await p.waitForTimeout(400);
  step("BR-2 fail: nothing is sent before RESET is typed", posts.length === p1 && resets() === r1);
  await p.getByLabel("Type RESET to confirm").fill("RESET"); await go.click();
  await p.locator("[data-start-failed]").waitFor({ timeout: 30000 });
  const busy = await p.locator("[data-start-failed]").innerText();
  step("BR-5 fail: a start while another load runs shows the server's own words, nothing emptied", /running: wait for it to finish/.test(busy) && resets() === r1 && /Not started/.test(await dialog().innerText()), busy);
  await shot("bk5-05-busy-1440");
  await p.keyboard.press("Escape"); await dialog().waitFor({ state: "detached" });
  const otherDone = await other;
  step("setup: the other tab's configured load finished", otherDone.status < 300, otherDone.status);
  const llConf = await openStart();
  step("BR-4 pass: after a configured load, \"Last loaded: Pathways released, ready to walk\"; its filled button continues, the reload is secondary", /Last loaded: Pathways released, ready to walk/.test(llConf) && /bg-primary/.test(await door("configured").getByRole("link", { name: "Continue to Immigration programs" }).getAttribute("class")) && await door("configured").getByRole("button", { name: "Start again from here" }).count() === 1, llConf);
  await shot("bk5-06-last-loaded-1440");
  await p.setViewportSize({ width: 375, height: 800 });
  step("375 px: the doors stack with no sideways scroll", (await sideways()) <= 0 && (await door("configured").boundingBox()).y > (await door("blank").boundingBox()).y);
  await shot("bk5-07-start-375");
  await axe("the start page at 375 px", "main");
  await p.setViewportSize({ width: 1440, height: 900 });

  // ---- BR-6: door 2 stops part way after the six loaded; Try again runs both calls and lands on Immigration programs.
  sql(`create or replace function bk5_refuse_last() returns trigger language plpgsql as $$ begin if new.action = 'loaded' and new.entity = 'configured checkpoint' then raise exception 'bk5 test: the checkpoint''s last step is refused'; end if; return new; end $$`);
  sql(`create trigger bk5_refuse_last before insert on audit_event for each row execute function bk5_refuse_last()`);
  let failedWords = "";
  const p2 = posts.length, r2 = resets();
  try {
    await door("configured").getByRole("button", { name: "Start again from here" }).click();
    await p.getByLabel("Type RESET to confirm").fill("RESET");
    await dialog().getByRole("button", { name: "Empty and start" }).click();
    await p.locator("[data-start-running]").waitFor({ timeout: 10000 });
    const runWords = await p.locator("[data-start-running]").innerText();
    step("BR-5: running shows the step and real elapsed seconds", /(Reading the demo's state…|Emptying…|Loading the configured checkpoint…) \d+ s/.test(runWords), runWords);
    await p.locator("[data-start-failed]").waitFor({ timeout: LONG });
    failedWords = await p.locator("[data-start-failed]").innerText();
  } finally { sql(`drop trigger if exists bk5_refuse_last on audit_event`); sql(`drop function if exists bk5_refuse_last()`); }
  const sent2 = posts.slice(p2).filter((x) => x.startsWith("/api/demo"));
  step("BR-6 fail: a configured step failing after the six loaded gives the part-way words with the server's words", /^Emptied; the configured load stopped part way: Loading stopped after: .+ Start again empties it first\.$/s.test(failedWords) && n("select count(*) from program_def") > 0 && !/prisma|invocation|\.ts:\d|\/home\//i.test(failedWords), failedWords);
  step("BR-6: door 2 was two calls, reset then load", JSON.stringify(sent2) === JSON.stringify(["/api/demo/reset", "/api/demo/load"]) && resets() === r2 + 1, sent2);
  step("BR-6: RESET stays typed and the button reads Try again", (await p.getByLabel("Type RESET to confirm").inputValue()) === "RESET" && await dialog().getByRole("button", { name: "Try again" }).isEnabled());
  await shot("bk5-08-part-way-1440");
  await axe("the part-way failure", "[role=dialog]");
  const p3 = posts.length, t0 = Date.now();
  await dialog().getByRole("button", { name: "Try again" }).dblclick();
  await p.waitForURL(`${BASE}/`, { timeout: LONG });
  const door2Secs = (Date.now() - t0) / 1000;
  const done2 = await toastText(/Pathways released, ready to walk: loaded in/);
  const sent3 = posts.slice(p3).filter((x) => x.startsWith("/api/demo"));
  step("BR-6 pass: Try again (double clicked) runs both calls once and lands on Immigration programs", JSON.stringify(sent3) === JSON.stringify(["/api/demo/reset", "/api/demo/load"]) && await p.getByRole("heading", { level: 1, name: /Immigration programs/ }).count() === 1, sent3);
  step("BR-1 pass: the done notice gives the measured seconds and the kept-files check, and the next step", /loaded in \d+ s\. Kept files checked unchanged\. Pick the pathway to change, then Review and release\./.test(done2), done2);
  console.log(`INFO  door 2 end to end (reset + configured load): ${door2Secs.toFixed(1)} s`);
  await shot("bk5-09-door2-landed-1440");
  // Gate A, door 2: the walk's first step: Visitor visa is listed, released, on Immigration programs.
  const vvShown = await p.getByText("Visitor visa").first().waitFor({ timeout: 30000 }).then(() => true, () => false);
  step("Gate A (door 2): Immigration programs lists Visitor visa, the pathway E1 changes (P-484 (1))", vvShown && n("select count(*) from config_release r join combination c on c.id = r.combination_id where c.label = 'Visitor visa'") >= 1);

  // ---- Door 3: the finished story; its progress survives a reload; then Last loaded and its first step.
  await openStart();
  await door("story").getByRole("button", { name: "Load the finished story" }).click();
  await p.getByLabel("Type RESET to confirm").fill("RESET");
  await dialog().getByRole("button", { name: "Empty and start" }).click();
  await p.locator("[data-story-running]").first().waitFor({ timeout: 30000 });
  await p.keyboard.press("Escape").catch(() => undefined);
  await p.reload(); await p.locator("[data-start-doors]").waitFor();
  const runningAfterReload = await p.locator("[data-door=story] [data-story-running]").waitFor({ timeout: 30000 }).then(() => true, () => false);
  const llRun = await lastLoaded();
  step("BR-5 pass: the finished story's progress shows on its card after a reload; the page says Another state meanwhile", runningAfterReload && /Another state/.test(llRun), llRun);
  await shot("bk5-10-story-running-1440");
  await door("blank").getByRole("button", { name: /Start from nothing|Start again from here/ }).click();
  await p.getByLabel("Type RESET to confirm").fill("RESET"); await dialog().getByRole("button", { name: "Empty and start" }).click();
  await p.locator("[data-start-failed]").waitFor({ timeout: 30000 });
  step("BR-5 fail: a reset while the story runs shows the server's own words", /running: wait for it to finish/.test(await p.locator("[data-start-failed]").innerText()), await p.locator("[data-start-failed]").innerText());
  await p.keyboard.press("Escape"); await dialog().waitFor({ state: "detached" });
  await p.waitForFunction(() => !document.querySelector("[data-door=story] [data-story-running]"), null, { timeout: LONG, polling: 2000 });
  // Without a reload: the page reads the demo again when the job stops (GET /demo/status can answer "done" with the
  // checkpoint from before the job's last line; review of this check's run 2).
  await p.locator("[data-last-loaded]").filter({ hasText: "Last loaded: The finished story" }).waitFor({ timeout: 15000 }).catch(() => undefined);
  const storyState = await api("/demo/status");
  const llStory = await lastLoaded();
  step("BR-4 pass: after the story, without a reload, \"Last loaded: The finished story\"", /Last loaded: The finished story/.test(llStory), { llStory, story: storyState.body?.story?.state, error: storyState.body?.story?.error, checkpoint: storyState.body?.checkpoint });
  const famLink = door("story").getByRole("link", { name: "Open the family case" });
  step("Gate A (door 3): its card opens the family case", await famLink.count() === 1);
  let caseShown = false;
  if (await famLink.count()) {
    await famLink.click(); await p.waitForURL(/\/cases\/[^/]+$/, { timeout: 30000 });
    // Review m3: the case's own page, read (no loading placeholders), not only its address.
    caseShown = await p.waitForFunction(() => { const m = document.querySelector("main"); return !!m && /Case/.test(m.innerText) && m.innerText.length > 200 && !document.querySelector('main [aria-busy="true"], main .animate-pulse, main .animate-spin'); }, null, { timeout: 30000 }).then(() => true, () => false);
    await p.waitForTimeout(300);
  }
  step("Gate A (door 3): the family case opens and shows its page", caseShown);
  await shot("bk5-11-door3-landed-1440");
  await as("user-A"); // the case area acts as a case person; the Studio's author again

  // ---- Door 1 from a full workspace: the reset; lands on Immigration programs, emptied, kept files checked.
  await openStart();
  await door("blank").getByRole("button", { name: "Start from nothing" }).click();
  await p.getByLabel("Type RESET to confirm").fill("RESET");
  await dialog().getByRole("button", { name: "Empty and start" }).click();
  await p.waitForURL(`${BASE}/`, { timeout: 60000 });
  const done1 = await toastText(/Nothing set up: emptied in/);
  step("Door 1 pass: the reset empties the demo and lands on Immigration programs, kept files checked", n("select count(*) from program_def") === 0 && /Kept files checked unchanged/.test(done1), done1);
  const ll1 = await openStart();
  step("BR-4 pass: after door 1, \"Last loaded: Nothing set up\"", /Last loaded: Nothing set up/.test(ll1), ll1);

  // ---- BR-7: the page sent only demo starts (and the session's own reads); no live AI route.
  const aiPosts = posts.filter((x) => /\/api\/(ai|finder|draft|jobs)/.test(x));
  const unexpected = posts.filter((x) => x.startsWith("/api/") && !/^\/api\/demo\/(reset|load|checkpoints\/finished-story)$/.test(x));
  step("BR-7: no live AI route was called; the page's only POSTs were demo starts", aiPosts.length === 0 && unexpected.length === 0, { aiPosts, unexpected });
  step("no page errors", errs.length === 0, errs);
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("STOP ", e); process.exit(1); });
