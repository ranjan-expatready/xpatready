// F2d (forms lane; F2 concept §9 proof script; plan §7 XT-7, BR-3, BR-6, BR-11, BR-13; EXPERIENCE §3 side panel): the
// browser extension end to end, unpacked in Chromium, on the Sample portal screens served locally (Scaffolding). The
// author connects the extension with a Studio code and captures s1 (typed into), s2 and s3 in the side panel; a client
// detail is refused before anything is sent; a second person approves; the screen map, the "You answer this on screen"
// marker and the release go through the API (setup, not under test); the officer connects, fills s1 of a case from its
// confirmed facts, sees what was filled and what needs them, a value the screen refuses, and a changed screen that
// fills nothing and opens "Re-capture needed". Keyboard and axe on each panel state; the production manifest is
// checked. No model call (US$0). Every person and value is Sample.
//   zsh studio/tools/isolated.sh forms_f2d 4458 start && tsx studio/tests/check_forms_f2d.ts 4458 xr_studio_forms_f2d  [--evidence writes screenshots]
/// <reference types="chrome" />
import { execFileSync, spawn } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, type BrowserContext, type Page } from "playwright";
import { buildExtension } from "../extension/build.ts";
import { manifest, productionProblems } from "../extension/manifest.ts";
import { openCase, releaseOnline, setupVisitorVisa, type Call } from "./forms_f2_setup.ts";

const PORT = Number(process.argv[2] ?? 4458), DB = process.argv[3] ?? "xr_studio_forms_f2d", PORTAL = 4459;
const STUDIO = join(import.meta.dirname, "..");
const ID = "ipomjnfjkniidipddghocobgcfecebaf";
const EVIDENCE = process.argv.includes("--evidence");
const SHOTS = join(STUDIO, "..", "..", "product", "screens", "F2-extension", "screenshots", "f2d");
const VARDIR = join(STUDIO, "var", "check-forms-f2d"); rmSync(VARDIR, { recursive: true, force: true }); mkdirSync(VARDIR, { recursive: true });
const log: { name: string; ok: boolean; detail?: unknown }[] = []; let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; log.push({ name, ok: !!c, detail }); console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 260)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely, as in the other API checks
const call: Call = async (method, path, body, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j } as Res;
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
/** A Chromium that loads unpacked extensions (branded Chrome no longer does): STUDIO_EXT_BROWSER, the cloud image's, or Playwright's own. */
const BROWSER = process.env.STUDIO_EXT_BROWSER ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);
// The package is CommonJS with a default export: required, its class is .default.
const AxeBuilder = createRequire(import.meta.url)("@axe-core/playwright").default as typeof import("@axe-core/playwright").default;
const portal = (file: string) => `http://127.0.0.1:${PORTAL}/${file}`;

async function axe(page: Page, state: string) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  ok(`EXPERIENCE §3: axe finds nothing on the panel state "${state}"`, r.violations.length === 0, r.violations.map((v) => `${v.id}: ${v.nodes.length}`));
}
async function shot(page: Page, name: string) { if (EVIDENCE) { mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true }); } }

(async () => {
  // ──────────────────────────────────────────── XT-7 the manifest (no browser)
  const prod = manifest("production"), dev = manifest("development", { api: `http://127.0.0.1:${PORT}`, portal: `http://127.0.0.1:${PORTAL}` });
  ok("C7.4: XT-7 the production manifest: sidePanel and storage only, exact https portal hosts and the API, no wildcard, no local host, no externally_connectable, no eval, a fixed key", productionProblems(prod).length === 0 && JSON.stringify(prod.permissions) === JSON.stringify(["sidePanel", "storage"]), productionProblems(prod));
  ok("C7.4: XT-7 fail: the development manifest fails the production check (its local hosts)", productionProblems(dev).some((p) => /local host/.test(p)), productionProblems(dev));
  ok("C7.4: XT-7 fail: a wildcard host or another permission is caught", productionProblems({ ...prod, host_permissions: ["https://*.gc.ca/*"] }).some((p) => /wildcard/.test(p)) && productionProblems({ ...prod, permissions: ["sidePanel", "storage", "tabs"] }).length === 1 && productionProblems({ ...prod, host_permissions: ["<all_urls>"] }).length > 0);

  // ──────────────────────────────────────────── setup (not under test)
  setupVisitorVisa(PORT, DB);
  const vv = sql("select id from combination where combination_key='vv.single'");
  const out = join(VARDIR, "extension");
  await buildExtension("development", out, { api: `http://127.0.0.1:${PORT}`, portal: `http://127.0.0.1:${PORTAL}` });
  const server = spawn(process.execPath, [join(STUDIO, "tests", "fixtures", "portal-server.mjs"), String(PORTAL)], { stdio: "ignore" });
  await new Promise((r) => setTimeout(r, 800));
  const profile = mkdtempSync(join(tmpdir(), "xr-ext-"));
  let ctx: BrowserContext | null = null;
  try {
    ctx = await chromium.launchPersistentContext(profile, { headless: true, executablePath: BROWSER, ...(BROWSER ? {} : { channel: "chromium" }), viewport: { width: 1100, height: 900 }, args: [`--disable-extensions-except=${out}`, `--load-extension=${out}`] });
    let [sw] = ctx.serviceWorkers(); if (!sw) sw = await ctx.waitForEvent("serviceworker", { timeout: 20_000 });
    ok("setup: the unpacked extension loads with its fixed id (from the manifest key)", sw.url().startsWith(`chrome-extension://${ID}/`), sw.url());
    const tab = await ctx.newPage();
    const panel = await ctx.newPage(); await panel.setViewportSize({ width: 360, height: 760 });
    panel.on("pageerror", (e) => console.log(`panel error: ${e.message}`)); panel.on("console", (m) => { if (m.type() === "error") console.log(`panel console: ${m.text()}`); });
    await panel.goto(`chrome-extension://${ID}/panel.html`);
    await panel.getByText("Connect the browser extension").waitFor();
    await axe(panel, "not connected"); await shot(panel, "01-not-connected-360");

    // ──────────────────────────────────────────── capture mode: the author
    // The author gets the code on the Studio's "Browser extension" page (S-3), shown once, with its 5 minutes.
    const studio = await ctx.newPage();
    const asPerson = async (actor: string) => { await studio.goto(`http://localhost:${PORT}/`); await studio.evaluate((a) => localStorage.setItem("xr-actor", a), actor); await studio.goto(`http://localhost:${PORT}/extension`); };
    await asPerson("user-A");
    await studio.getByRole("heading", { name: "Browser extension", level: 1 }).waitFor();
    await studio.getByRole("button", { name: "Get a code" }).click();
    const code = (await studio.locator("p.font-mono").innerText()).trim();
    ok("C2.9: Q1 the Studio page gives a one-time code, shown once, with the minutes it lasts and its mode", /^[A-HJ-NP-Z2-9]{8}$/.test(code) && /enter this code in the extension within 5 minutes/.test(await studio.locator("main").innerText()) && /For Capture · ends in 4:5\d|For Capture · ends in 5:00/.test(await studio.locator("main").innerText()), code);
    const studioAxe = await new AxeBuilder({ page: studio }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    ok("EXPERIENCE: axe finds nothing on the Studio's Browser extension page", studioAxe.violations.length === 0, studioAxe.violations.map((v) => `${v.id}: ${v.nodes.length}`));
    await shot(studio, "00-studio-code-1440");
    await panel.getByLabel("Code from the Studio").fill(code);
    await panel.getByLabel("Code from the Studio").press("Enter"); // keyboard: the form submits on Enter
    await panel.getByText("Configuration author · Capture").waitFor();
    ok("C2.9: Q1 the author connects the extension with the Studio's code (by keyboard): capture mode, no mode switch (one duty)", (await panel.getByRole("tablist").count()) === 0);
    const stored = await sw.evaluate(async () => ({ session: Object.keys(await chrome.storage.session.get(null)), local: Object.keys(await chrome.storage.local.get(null)) }));
    ok("C2.9: M7 the token is kept in session storage (memory) only; local storage is empty", stored.session.join() === "token" && stored.local.length === 0, stored);
    await panel.getByLabel("Form code").fill("IMM 5257"); await panel.getByLabel("Title as the portal shows it").fill("Application for a visitor visa (online)"); await panel.getByLabel("Application type (optional)").fill("Visitor visa");
    await panel.getByRole("button", { name: "Start capture" }).click();
    await panel.getByText("IMM 5257 · 0 screens captured").waitFor();
    await axe(panel, "capture started");
    // s1 during real work: a person has typed into it (BR-1: the extension never reads an answer).
    await tab.goto(portal("imm5257-online-s1-personal.html")); await tab.fill("#familyName", "SAMPLE-TYPED"); await tab.fill("#uci", "12345678"); await tab.selectOption("#sex", "FEMALE");
    await panel.getByRole("button", { name: "Capture this screen" }).click();
    await panel.getByText(/^Check before sending: \d+ questions? go to ExpatReady/).waitFor();
    const sent = await panel.getByRole("region", { name: "Check before sending" }).innerText();
    ok("C2.9: BR-3 every text the screen will send is listed before sending; none of the typed answers is among them", /Personal details/.test(sent) && /Family name/.test(sent) && !/SAMPLE-TYPED|12345678/.test(sent), sent.slice(0, 200));
    await axe(panel, "check before sending"); await shot(panel, "02-check-before-sending-360");
    await panel.getByRole("button", { name: "Send this screen" }).click();
    await panel.getByText("Screen 1 captured · go to the next screen in the portal.").waitFor();
    for (const f of ["imm5257-online-s2-marital.html", "imm5257-online-s3-language.html"]) {
      await tab.goto(portal(f)); await panel.getByRole("button", { name: "Capture this screen" }).click();
      await panel.getByRole("button", { name: "Send this screen" }).click(); await panel.getByText(/Screen [23] captured/).waitFor();
    }
    // F3 X3: the same screen again is "already captured" in the panel before anything is read for sending (the server's
    // own "already captured" answer stays, for a screen sent by another way: f2a_api).
    await tab.goto(portal("imm5257-online-s3-language.html")); await panel.getByRole("button", { name: "Capture this screen" }).click();
    await panel.getByText(/It is screen 3\. Nothing was sent/).waitFor();
    ok("C2.9: BR-4 the same screen again is \"already captured\" (screen 3); no check opens and nothing is sent", (await panel.getByRole("region", { name: "Check before sending" }).count()) === 0 && (JSON.parse(sql("select record::text from portal_capture where way='extension' and status='OPEN'")).screens as unknown[]).length === 3);
    // Review Major 1: the panel is closed or reloaded in the middle of a capture: it offers to continue it.
    await panel.reload();
    await panel.getByRole("button", { name: "Continue IMM 5257 · 3 screens so far" }).waitFor();
    await axe(panel, "continue a capture"); await shot(panel, "03a-continue-capture-360");
    await panel.getByRole("button", { name: "Continue IMM 5257 · 3 screens so far" }).click();
    await panel.getByText("IMM 5257 · 3 screens captured").waitFor();
    ok("C2.9: review Major 1 a reloaded panel continues the open capture (3 screens kept), never starts it again", sql("select count(*) from portal_capture where way='extension' and status='OPEN'") === "1");
    await tab.goto(portal("hostile-option-passport.html")); await panel.getByRole("button", { name: "Capture this screen" }).click();
    await panel.getByText(/^Refused: /).first().waitFor();
    ok("C2.9: BR-1 BR-3 fail: a screen whose text looks like a client's detail is refused in the panel; nothing is sent", /passport-like code/.test(await panel.locator("main").innerText()) && sql("select count(*) from audit_event where action='refused' and entity='portal screen'") === "0", (await panel.locator("main").innerText()).slice(0, 200));
    await shot(panel, "03-refused-client-detail-360");
    await panel.getByRole("button", { name: "Finish capture" }).click();
    await panel.getByText(/Held for a second person/).waitFor();
    await axe(panel, "held for a second person"); await shot(panel, "04-held-360");
    const capId = sql("select id from portal_capture where way='extension' order by created_at desc limit 1");
    const rec = sql(`select record::text from portal_capture where id='${capId}'`);
    ok("C2.9: BR-1 the captured record holds three screens and none of the typed answers", JSON.parse(rec).screens.length === 3 && !/SAMPLE-TYPED|12345678/.test(rec));

    // ──────────────────────────────────────────── setup: a second person approves; screen map, Q3, release; a case
    await call("POST", `/captures/${capId}/approve`, undefined, "user-C");
    const ed = sql(`select form_edition_id from portal_capture where id='${capId}'`);
    const rel = await releaseOnline(call, sql, vv, ed, { note: "F2d: IMM 5257 filed Online from the extension's capture" });
    ok("setup: the extension's capture, approved by a second person, is the online version a new release files", rel.status < 300 && sql(`select count(*) from config_release where combination_id='${vv}'`) === "2", rel.body?.message ?? rel.status);
    await openCase(call, vv, "F2D-CASE-1", [["person.family_name", "SAMPLE"], ["person.sex", "x_another_gender"], ["person.date_of_birth", "1990-05-17"], ["person.place_of_birth_city", "Sample City"]], ["person.family_name", "person.date_of_birth", "person.sex"]);

    // ──────────────────────────────────────────── fill mode: the officer
    await panel.getByRole("button", { name: "Sign out of the extension" }).click();
    await panel.getByText("Connect the browser extension").waitFor();
    const code2 = (await call("POST", "/extension/pairings", {}, "user-O")).body.code as string;
    await panel.getByLabel("Code from the Studio").fill(code2); await panel.getByRole("button", { name: "Connect" }).click();
    await panel.getByText("Case officer · Fill").waitFor().catch(async (e) => { console.log(`panel shows: ${(await panel.locator("body").innerText()).slice(0, 400)}`); throw e; });
    await panel.getByLabel("Case").selectOption({ label: "F2D-CASE-1 · Visitor visa · release 2" });
    ok("C7.4: fill mode lists the case, its person and its online form", (await panel.getByLabel("Online form").inputValue()) === "IMM 5257" && (await panel.getByLabel("Person").locator("option").count()) >= 1);
    await axe(panel, "ready to fill"); await shot(panel, "05-ready-360");
    await tab.goto(portal("imm5257-online-s1-personal.html"));
    await panel.getByRole("button", { name: "Fill this screen" }).focus(); await panel.keyboard.press("Enter"); // keyboard
    await panel.getByText(/^Filled \d of 9/).waitFor();
    const result = await panel.getByRole("region", { name: "What was filled" }).innerText();
    const onPage = await tab.evaluate(() => Object.fromEntries(["familyName", "givenNames", "uci", "sex", "dobYear", "dobMonth", "dobDay", "birthCity"].map((id) => [id, (document.getElementById(id) as HTMLInputElement).value])));
    ok("C7.4: BR-6 \"Fill this screen\" (by keyboard) fills the open screen from the confirmed facts: \"Filled 6 of 9 · 3 need you\"", /Filled 6 of 9 · 3 need you/.test(result) && onPage.familyName === "SAMPLE" && onPage.sex === "ANOTHER" && onPage.dobYear === "1990" && onPage.dobMonth === "05" && onPage.birthCity === "Sample City" && onPage.uci === "" && onPage.givenNames === "", { onPage, head: result.slice(0, 80) });
    ok("C7.4: the panel says where each value came from and what needs the person (\"You answer this on screen\", \"No answer yet\")", /From the case \(Client A, confirmed\): /.test(result) && !/person\.family_name/.test(result) && /You answer this on screen/.test(result) && /No answer yet/.test(result));
    await axe(panel, "filled with sources"); await shot(panel, "06-filled-360");
    const after = await sw.evaluate(async () => Object.keys(await chrome.storage.local.get(null)));
    ok("C7.4: BR-13 nothing of the plan is stored: local storage is still empty", after.length === 0, after);

    await tab.goto(portal("imm5257-online-s1-rejects-code.html"));
    await panel.getByText(/^Filled/).waitFor({ state: "detached" }); // the plan is dropped when the tab moves on (BR-13)
    ok("C7.4: BR-13 the plan and its values are dropped when the portal tab moves on", true);
    await panel.getByRole("button", { name: "Fill this screen" }).click();
    await panel.getByText(/^Filled \d of 9/).waitFor();
    const rejected = await panel.getByRole("region", { name: "What was filled" }).innerText();
    const marked = await tab.evaluate(() => (document.getElementById("sex") as HTMLElement).dataset.xrNotAccepted === "1");
    ok("C7.4: BR-11 a value the screen refuses: \"Not accepted by the screen\" in the panel and marked on the page", /Filled 5 of 9/.test(rejected) && /Not accepted by the screen/.test(rejected) && marked, rejected.slice(0, 120));
    ok("C7.4: BR-6 the screen's own submit never ran", (await tab.evaluate(() => (window as unknown as { __submitted?: number }).__submitted ?? 0)) === 0);
    await shot(panel, "07-not-accepted-360");

    await tab.goto(portal("imm5257-online-s1-personal-reworded.html"));
    await panel.getByRole("button", { name: "Fill this screen" }).click();
    await panel.getByText("This screen looks different").first().waitFor();
    const diff = await panel.locator("main").innerText();
    const untouched = await tab.evaluate(() => (document.getElementById("familyName") as HTMLInputElement).value);
    ok("C9.3: BR-7 a changed screen fills nothing; the panel says so and names what differs; \"Re-capture needed\" is open", /Nothing was filled/.test(diff) && /Re-capture needed is open/.test(diff) && untouched === "" && sql("select count(*) from recapture_task where status='OPEN'") === "1", diff.slice(0, 220));
    ok("C9.3: Lead note: after \"This screen looks different\" the panel says what to do instead, and its button is \"Check this screen again\"", /Enter this screen's answers yourself/.test(diff) && (await panel.getByRole("button", { name: "Check this screen again" }).count()) === 1 && (await panel.getByRole("button", { name: "Fill this screen" }).count()) === 0);
    await axe(panel, "screen looks different"); await shot(panel, "08-looks-different-360");
    await tab.goto(`http://127.0.0.1:${PORT}/`);
    await panel.getByRole("button", { name: "Fill this screen" }).click();
    await panel.getByText(/Not a portal page/).first().waitFor();
    ok("C7.4: not a portal page: the panel says to open the portal screen; nothing is read", true);
    await shot(panel, "09-not-a-portal-page-360");
    // The content team sees the task in the Studio; the officer disconnects the extension there.
    await asPerson("user-C");
    await studio.getByRole("heading", { name: "Re-capture needed" }).waitFor();
    ok("C9.3: the Studio page lists \"Re-capture needed\" for the content team, with the screen and what differs", /Personal details/.test(await studio.locator("main").innerText()) && /reworded/.test(await studio.locator("main").innerText()));
    await shot(studio, "10-studio-recapture-1440");
    await asPerson("user-O");
    await studio.getByRole("button", { name: "Disconnect" }).click();
    await studio.getByText("signed out").waitFor();
    await tab.goto(portal("imm5257-online-s1-personal.html"));
    await panel.getByRole("button", { name: "Fill this screen" }).click();
    await panel.getByText("Connect the browser extension").waitFor();
    ok("C7.4: session ended (disconnected in the Studio): the panel goes back to Connect and says why", /session ended/.test(await panel.locator("main").innerText()));

    // ──────────────────────────────────────────── plan §9's end, in the panel (review m7): re-capture → approve → a new case fills
    await asPerson("user-A"); await studio.getByRole("button", { name: "Get a code" }).click();
    await panel.getByLabel("Code from the Studio").fill((await studio.locator("p.font-mono").innerText()).trim()); await panel.getByRole("button", { name: "Connect" }).click();
    await panel.getByText("Configuration author · Capture").waitFor();
    await panel.getByLabel("Form code").fill("IMM 5257"); await panel.getByLabel("Title as the portal shows it").fill("Application for a visitor visa (online)");
    await panel.getByRole("button", { name: "Start capture" }).click();
    await tab.goto(portal("imm5257-online-s1-personal-reworded.html"));
    await panel.getByRole("button", { name: "Capture this screen" }).click(); await panel.getByRole("button", { name: "Send this screen" }).click();
    await panel.getByText("Screen 1 captured · go to the next screen in the portal.").waitFor();
    await panel.getByRole("button", { name: "Finish capture" }).click();
    await panel.getByText("IMM 5257 · held for a second person").waitFor();
    const held = await panel.locator("main").innerText();
    ok("C9.3: the re-capture of the changed screen is held with its difference, the screens not seen kept (review m1, m2: no \"3 screens captured\", a next action)", /1 changed\); 2 not seen this time/.test(held) && !/3 screens captured/.test(held) && (await panel.getByRole("button", { name: "Start another capture" }).count()) === 1, held.slice(0, 200));
    const cap2 = sql("select id from portal_capture where way='extension' order by created_at desc limit 1");
    await call("POST", `/captures/${cap2}/approve`, undefined, "user-C");
    ok("C9.3: approving the re-capture closes \"Re-capture needed\"", sql("select count(*) from recapture_task where status='OPEN'") === "0");
    const rel2 = await releaseOnline(call, sql, vv, sql(`select form_edition_id from portal_capture where id='${cap2}'`), { unused: ["UNSPECIFIED"], note: "F2d: the re-captured screen" });
    await openCase(call, vv, "F2D-CASE-2", [["person.family_name", "SAMPLE"], ["person.sex", "f_female"], ["person.date_of_birth", "1990-05-17"], ["person.place_of_birth_city", "Sample City"]], ["person.family_name", "person.date_of_birth", "person.sex"]);
    await panel.getByRole("button", { name: "Sign out of the extension" }).click();
    await asPerson("user-O"); await studio.getByRole("button", { name: "Get a code" }).click();
    await panel.getByLabel("Code from the Studio").fill((await studio.locator("p.font-mono").innerText()).trim()); await panel.getByRole("button", { name: "Connect" }).click();
    await panel.getByLabel("Search by reference").fill("F2D-CASE-2");
    await panel.getByLabel("Case").selectOption({ label: "F2D-CASE-2 · Visitor visa · release 3" });

    await tab.goto(portal("imm5257-online-s1-personal-reworded.html"));
    await panel.getByRole("button", { name: "Fill this screen" }).click();
    await panel.getByText(/^Filled \d of 9/).waitFor();
    ok("C7.4: plan §9 ends: a new case on the new release fills the re-captured screen from the panel", rel2.status < 300 && /Filled 6 of 9/.test(await panel.getByRole("region", { name: "What was filled" }).innerText()) && (await tab.inputValue("#familyName")) === "SAMPLE", rel2.status);
  } finally {
    await ctx?.close(); server.kill(); rmSync(profile, { recursive: true, force: true });
  }
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`FAIL  the check stopped: ${String((e as Error)?.message ?? e).slice(0, 300)}`); console.error(e); process.exit(1); });
