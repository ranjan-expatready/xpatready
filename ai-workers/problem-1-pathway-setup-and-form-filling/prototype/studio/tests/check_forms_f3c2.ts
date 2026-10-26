// F3c-2 (forms lane, F3 plan slice 4; concept X8, X9, X10, X12; D8): the extension after capture. The case officer
// fills the Sample APR personal screen of a case and sees the results grouped (Filled · Confirm in the case first, with
// a link to the case · You answer on screen), each with its source; the inputs it wrote are outlined on the page (no
// ExpatReady text in the page) and "Undo this fill" clears only what it wrote and nobody changed, and is gone once the
// portal moves on; the panel says when the connection ends. A reworded screen opens a re-capture task, which a person
// capturing sees in the panel ("Capture Personal details again") through a capture-token route that shows no case; a
// fill-only token is refused there, and the Studio's own task list is unchanged. Sample APR screens over https under a
// made-up host, in Chromium. No model call (US$0); all Sample.
//   zsh studio/tools/isolated.sh forms_f3c2 4456 start && tsx studio/tests/check_forms_f3c2.ts 4456 xr_studio_forms_f3c2  [--evidence writes screenshots]
/// <reference types="chrome" />
import { execFileSync, spawn } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, type BrowserContext, type Page } from "playwright";
import { buildExtension } from "../extension/build.ts";
import { openCase, releaseOnline, setupVisitorVisa, type Call } from "./forms_f2_setup.ts";

const PORT = Number(process.argv[2] ?? 4456), DB = process.argv[3] ?? "xr_studio_forms_f3c2", PORTAL = 4453;
const HOST = "apr-portal.sample.test"; // a made-up host (.test never resolves): Chromium maps it to the local Sample server
const STUDIO = join(import.meta.dirname, "..");
const ID = "ipomjnfjkniidipddghocobgcfecebaf";
const EVIDENCE = process.argv.includes("--evidence");
const SHOTS = join(STUDIO, "..", "..", "product", "screens", "F3-add-form-wizard", "screenshots", "f3c2");
const VARDIR = join(STUDIO, "var", "check-forms-f3c2"); rmSync(VARDIR, { recursive: true, force: true }); mkdirSync(VARDIR, { recursive: true });
const APR_DIR = join(STUDIO, "tests", "fixtures", "portal-apr");
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely, as in the other API checks
const call: Call = async (method, path, body, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j } as Res;
};
const extCall = async (token: string, method: string, path: string, body?: unknown): Promise<Res> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { authorization: `Bearer ${token}`, origin: `chrome-extension://${ID}`, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
};
/** The extension's own calls, with a token (written .call(...) so the graph check sees which routes a test reaches). */
const as = (token: string) => ({ call: (method: string, path: string, body?: unknown) => extCall(token, method, path, body) });
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const BROWSER = process.env.STUDIO_EXT_BROWSER ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);
const AxeBuilder = createRequire(import.meta.url)("@axe-core/playwright").default as typeof import("@axe-core/playwright").default;
const apr = (file: string) => `https://${HOST}/${file}`;
async function axe(page: Page, state: string) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  ok(`EXPERIENCE §3: axe finds nothing on the panel state "${state}"`, r.violations.length === 0, r.violations.map((v) => `${v.id}: ${v.nodes.length}`));
}
async function shot(page: Page, name: string) { if (EVIDENCE) { mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true }); } }
const tokenFor = async (actor: string) => (await extCall("", "POST", "/extension/sessions", { code: (await call("POST", "/extension/pairings", {}, actor)).body.code, extensionId: ID })).body.token as string;

(async () => {
  // ──────────────────────────────────────────── setup (not under test): IMM 5257 on the APR Portal, released, a case
  setupVisitorVisa(PORT, DB);
  const vv = sql("select id from combination where combination_key='vv.single'");
  const cap = (await call("POST", "/captures", { portal: "apr_portal", form: "IMM 5257", title: "Application for a visitor visa", combinationId: vv })).body;
  const fd = new FormData();
  for (const f of ["apr-vv-s01-application.html", "apr-vv-s02-personal.html", "apr-vv-s03-marital.html", "apr-vv-s05-language.html", "apr-vv-s06-passport.html"]) fd.append("files", new Blob([readFileSync(join(APR_DIR, f))]), f);
  await fetch(`http://localhost:${PORT}/api/captures/${cap.id}/screens`, { method: "POST", headers: { "x-actor": "user-A" }, body: fd });
  await call("POST", `/captures/${cap.id}/finish`);
  await call("POST", `/captures/${cap.id}/approve`, undefined, "user-C");
  const ed = sql(`select form_edition_id from portal_capture where id='${cap.id}'`);
  const rel = await releaseOnline(call, sql, vv, ed, { note: "F3c-2: IMM 5257 filed Online on the APR Portal" });
  ok("setup: Visitor visa released with IMM 5257 filed Online on the APR Portal (Sample screens captured from saved pages, approved by a second person)", rel.status < 300 && !!ed, rel.body?.message ?? rel.status);
  await openCase(call, vv, "APR-F3C2-1", [["person.family_name", "SAMPLE"], ["person.sex", "f_female"], ["person.date_of_birth", "1990-05-17"], ["person.place_of_birth_city", "Sample City"]], ["person.family_name", "person.date_of_birth", "person.sex"]);
  const caseId = sql("select id from runtime_case where reference='APR-F3C2-1'");

  const out = join(VARDIR, "extension");
  await buildExtension("development", out, { api: `http://127.0.0.1:${PORT}`, portal: HOST });
  execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", join(VARDIR, "key.pem"), "-out", join(VARDIR, "cert.pem"), "-days", "1", "-subj", `/CN=${HOST}`], { stdio: "ignore" });
  const server = spawn(process.execPath, [join(STUDIO, "tests", "fixtures", "portal-server.mjs"), String(PORTAL), "--tls", join(VARDIR, "key.pem"), join(VARDIR, "cert.pem")], { stdio: "ignore" });
  await new Promise((res) => setTimeout(res, 800));
  const profile = mkdtempSync(join(tmpdir(), "xr-f3c2-"));
  let ctx: BrowserContext | null = null;
  try {
    ctx = await chromium.launchPersistentContext(profile, { headless: true, executablePath: BROWSER, ...(BROWSER ? {} : { channel: "chromium" }), viewport: { width: 1100, height: 900 }, ignoreHTTPSErrors: true,
      args: [`--disable-extensions-except=${out}`, `--load-extension=${out}`, `--host-resolver-rules=MAP ${HOST}:443 127.0.0.1:${PORTAL}`, "--ignore-certificate-errors"] });
    let [sw] = ctx.serviceWorkers(); if (!sw) sw = await ctx.waitForEvent("serviceworker", { timeout: 20_000 });
    const tab = await ctx.newPage();
    const panel = await ctx.newPage(); await panel.setViewportSize({ width: 360, height: 760 });
    panel.on("pageerror", (e) => console.log(`panel error: ${e.message}`));
    await panel.goto(`chrome-extension://${ID}/panel.html`);
    const connect = async (actor: string, who: string) => {
      await panel.getByText("Connect the browser extension").waitFor();
      await panel.getByLabel("Code from the Studio").fill((await call("POST", "/extension/pairings", {}, actor)).body.code); await panel.getByLabel("Code from the Studio").press("Enter");
      await panel.getByText(who).waitFor();
    };
    await connect("user-O", "Case officer · Fill");
    // X12: when the connection ends.
    const until = await panel.locator("footer").innerText();
    const ends = sql("select to_char(max(expires_at) at time zone current_setting('TimeZone'), 'HH24:MI') from extension_session where person='user-O'");
    ok("C2.9: X12 the panel says when the connection ends (\"Connected until HH:MM\", the session's own end)", /Connected until \d{1,2}:\d{2}/.test(until), { until, ends });

    // ──────────────────────────────────────────── X9: results grouped, each with its source; X10: outline and Undo
    await panel.getByLabel("Search by reference").fill("APR-F3C2-1");
    await panel.getByLabel("Case").selectOption({ label: `APR-F3C2-1 · Visitor visa · release ${sql(`select max(version) from config_release where combination_id='${vv}'`)}` });
    await tab.goto(apr("apr-vv-s02-personal.html"));
    await panel.getByRole("button", { name: "Fill this screen" }).click();
    await panel.getByText(/^Filled \d+ of 9/).waitFor();
    const groups = panel.getByRole("region", { name: "What was filled" });
    const filledG = await groups.getByRole("group", { name: "Filled" }).innerText();
    const confirmG = await groups.getByRole("group", { name: "Confirm in the case first" }).innerText();
    const screenG = await groups.getByRole("group", { name: "You answer on screen" }).innerText();
    ok("C7.4: X9 the results are grouped: Filled (each with its source from the case), Confirm in the case first, You answer on screen (the UCI)",
      /^FILLED \(\d+\)|^Filled \(\d+\)/i.test(filledG) && /From the case/.test(filledG) && /Family name/.test(filledG) && /City or town/.test(filledG) && /Given name/.test(confirmG) && /No answer yet/.test(confirmG) && /UCI|client identifier/i.test(screenG) && /You answer this on screen/.test(screenG), { filledG: filledG.slice(-120), confirmG: confirmG.slice(-120), screenG: screenG.slice(0, 160) });
    const link = await groups.getByRole("link", { name: "Open the case to confirm it" }).first().getAttribute("href");
    ok("C7.4: X9 an answer still to give or confirm links to its case in the Studio (fail case: the given names, with no answer, are not filled)",
      link === `http://127.0.0.1:${PORT}/cases/${caseId}` && (await tab.evaluate(() => (document.getElementById("givenNames") as HTMLInputElement).value)) === "", link);
    await axe(panel, "fill results grouped"); await shot(panel, "01-fill-grouped-360");
    const nFilled = Number(/Filled (\d+) of 9/.exec(await groups.innerText())![1]);
    const page = await tab.evaluate(() => ({ outlined: document.querySelectorAll("[data-xr-filled]").length, text: document.body.innerText, fam: (document.getElementById("familyName") as HTMLInputElement).value, year: (document.getElementById("dobYear") as HTMLInputElement | null)?.value ?? null }));
    ok("C7.4: X10 every input the fill wrote is outlined on the page, and the page carries no ExpatReady text", page.outlined === nFilled && nFilled > 1 && !/ExpatReady|Expat Ready/i.test(page.text), { outlined: page.outlined, nFilled });
    // A person corrects one filled answer, then undoes the fill: their correction stays, the rest is cleared.
    await tab.fill("#familyName", "CHANGED-BY-ME");
    await panel.getByRole("button", { name: "Undo this fill" }).click();
    await panel.getByText(/^Cleared \d+ values? this fill wrote/).waitFor();
    const after = await tab.evaluate(() => ({ fam: (document.getElementById("familyName") as HTMLInputElement).value, sex: (document.getElementById("sex") as HTMLSelectElement).value, year: (document.getElementById("dobYear") as HTMLInputElement | null)?.value ?? null, outlined: document.querySelectorAll("[data-xr-filled]").length }));
    const said = await groups.innerText();
    ok("C7.4: X10 Undo clears only what the fill wrote and nobody changed: the person's correction stays, the others are empty again, no outline left",
      after.fam === "CHANGED-BY-ME" && after.sex === "" && (after.year === null || after.year === "") && after.outlined === 0 && new RegExp(`Cleared ${nFilled - 1} values? this fill wrote; 1 you changed since stays as you left it`).test(said), { after, said: said.slice(-160) });
    await axe(panel, "after undo"); await shot(panel, "02-undo-360");
    // Break M1: the portal swaps another screen in place (same page, no new address): Undo clears nothing and goes.
    await tab.goto(apr("apr-vv-s02-personal.html"));
    await panel.getByRole("button", { name: "Fill this screen" }).click(); await panel.getByText(/^Filled \d+ of 9/).waitFor();
    await tab.evaluate(() => { document.querySelector("h1")!.textContent = "Spouse or common-law partner"; });
    await panel.getByRole("button", { name: "Undo this fill" }).click();
    await panel.getByText(/The portal shows another screen now: nothing was cleared/).waitFor();
    const kept = await tab.evaluate(() => ({ fam: (document.getElementById("familyName") as HTMLInputElement).value, sex: (document.getElementById("sex") as HTMLSelectElement).value }));
    ok("C7.4: X10 break M1 fail case: another screen swapped in place: Undo clears nothing, says so, and is gone", kept.fam === "SAMPLE" && kept.sex === "FEMALE" && (await panel.getByRole("button", { name: "Undo this fill" }).count()) === 0, kept);
    // Break m5: the page's own outline on an input is put back after Undo.
    await tab.goto(apr("apr-vv-s02-personal.html"));
    const own = await tab.evaluate(() => { const el = document.getElementById("familyName") as HTMLInputElement; el.style.outline = "1px dashed rgb(0, 128, 0)"; return el.style.outline; });
    await panel.getByRole("button", { name: "Fill this screen" }).click(); await panel.getByText(/^Filled \d+ of 9/).waitFor();
    await panel.getByRole("button", { name: "Undo this fill" }).click(); await panel.getByText(/^Cleared \d+ values? this fill wrote/).waitFor();
    const back = await tab.evaluate(() => (document.getElementById("familyName") as HTMLInputElement).style.outline);
    ok("C7.4: X10 break m5 the page's own outline on an input comes back after Undo", !!own && back === own, { own, back });
    // Undo is gone once the portal moves on (the fill's memory went with the page).
    await tab.fill("#familyName", "");
    await panel.getByRole("button", { name: "Fill this screen" }).click(); await panel.getByText(/^Filled \d+ of 9/).waitFor();
    ok("setup: filled again, Undo offered", (await panel.getByRole("button", { name: "Undo this fill" }).count()) === 1);
    await tab.goto(apr("apr-vv-s03-marital.html"));
    await panel.getByRole("button", { name: "Undo this fill" }).waitFor({ state: "detached" });
    ok("C7.4: X10 fail case: after the portal moves to another screen, Undo is gone (nothing on another page can be cleared)", (await panel.getByRole("button", { name: "Undo this fill" }).count()) === 0);

    // ──────────────────────────────────────────── X8: a reworded screen, then its task in capture mode
    await tab.goto(apr("apr-vv-s02-personal-reworded.html"));
    await panel.getByRole("button", { name: "Fill this screen" }).click();
    await panel.getByText("This screen looks different").first().waitFor();
    ok("setup: the reworded screen opened one re-capture task", sql("select count(*) from recapture_task where status='OPEN'") === "1");
    const capTok = await tokenFor("user-A"), fillTok = await tokenFor("user-O");
    const tasks = await as(capTok).call("GET", "/extension/capture/recapture-tasks");
    ok("C9.3: D8 X8 a capture token lists the open task: form, portal, screen and what changed, never the cases it affects",
      tasks.status === 200 && tasks.body.length === 1 && tasks.body[0].form === "IMM 5257" && tasks.body[0].screen === "Personal details" && tasks.body[0].portal === "apr_portal" && !("affected" in tasks.body[0]) && !JSON.stringify(tasks.body).includes("APR-F3C2-1"), tasks.body);
    ok("C9.3: D8 break m6 no element id reaches a capture token: each change is the approved question's words and what changed", (tasks.body[0].differences as Record<string, unknown>[]).length > 0 && (tasks.body[0].differences as Record<string, unknown>[]).every((d) => !("input" in d) && typeof d.question === "string"), tasks.body[0].differences);
    const refused = await as(fillTok).call("GET", "/extension/capture/recapture-tasks");
    ok("C9.3: D8 fail case: a fill-only token is refused on the capture-mode task list (403)", refused.status === 403, refused.status);
    const studioTasks = await call("GET", "/extension/recapture-tasks", undefined, "user-C");
    ok("C9.3: D8 the Studio's own task list is unchanged (the review duty sees the affected cases)", studioTasks.status === 200 && "affected" in studioTasks.body[0], studioTasks.status);
    await panel.getByRole("button", { name: "Sign out of the extension" }).click();
    await connect("user-A", "Configuration author · Capture");
    const again = panel.getByRole("region", { name: "Screens to capture again" });
    await again.waitFor();
    ok("C9.3: X8 the panel in capture mode lists \"Capture Personal details again · IMM 5257\", with the portal and what changed", /Capture Personal details again · IMM 5257/.test(await again.innerText()) && /APR Portal \(Authorized Paid Representatives\): \d+ questions? changed/.test(await again.innerText()), await again.innerText());
    await axe(panel, "screens to capture again"); await shot(panel, "03-capture-again-360");
    await again.getByRole("button", { name: "Capture Personal details again · IMM 5257" }).click();
    await panel.getByText(/Go to "Personal details" in the APR Portal \(Authorized Paid Representatives\) and capture it again/).waitFor();
    ok("C9.3: X8 choosing the task opens a capture of IMM 5257 on the APR Portal and says which screen to capture", sql("select count(*) from portal_capture where way='extension' and status='OPEN' and form_key='IMM 5257' and portal_key='apr_portal'") === "1");
  } finally {
    await ctx?.close(); server.kill(); rmSync(profile, { recursive: true, force: true });
  }
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`FAIL  the check stopped: ${String((e as Error)?.message ?? e).slice(0, 300)}`); console.error(e); process.exit(1); });
