// Forms lane, Lead note 26 Oct Pass B (P-98: one portal, the APR Portal) and Pass A item 3 (PR #27): the browser
// extension end to end on Sample APR-style screens served over https under a made-up portal host, exactly as the
// founder's development build will run on the real APR host (G3). Without a browser: the development build takes a
// pasted host with no code change and refuses anything wider; the production build keeps hosts.json's hosts only. In
// Chromium: the author captures the visitor visa on the APR Portal (the panel's default) with the spouse screen, a
// branch, not seen, so the screen map lists the PDF's spouse questions as "not seen on any captured screen"; markup the
// reader cannot see into (page components, a frame, unlabelled inputs, a custom drop-down) is "not read" and nothing is
// sent; "Check before sending" is dropped when the tab moves on; a capture the second person returns goes on in the
// panel (remove a screen, capture it again, finish); the work permit and a long application (32 screens) are captured;
// the officer fills the APR personal screen of a case and a reworded screen fills nothing and opens one task. A value
// or a tick sent to the API is refused. Keyboard and axe on the new panel states. No model call (US$0); all Sample.
//   zsh studio/tools/isolated.sh forms_apr 4451 start && tsx studio/tests/check_forms_apr.ts 4451 xr_studio_forms_apr  [--evidence writes screenshots]
/// <reference types="chrome" />
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, type BrowserContext, type Page } from "playwright";
import { buildExtension, devApiOrigin } from "../extension/build.ts";
import { devPortalOrigin, manifest, productionProblems } from "../extension/manifest.ts";
import HOSTS from "../extension/hosts.json" with { type: "json" };
import { openCase, releaseOnline, setupVisitorVisa, type Call } from "./forms_f2_setup.ts";

const PORT = Number(process.argv[2] ?? 4451), DB = process.argv[3] ?? "xr_studio_forms_apr", PORTAL = 4453;
const HOST = "apr-portal.sample.test"; // a made-up host (.test never resolves): Chromium maps it to the local Sample server
const STUDIO = join(import.meta.dirname, "..");
const ID = "ipomjnfjkniidipddghocobgcfecebaf";
const EVIDENCE = process.argv.includes("--evidence");
const SHOTS = join(STUDIO, "..", "..", "product", "screens", "F2-extension", "screenshots", "apr");
const VARDIR = join(STUDIO, "var", "check-forms-apr"); rmSync(VARDIR, { recursive: true, force: true }); mkdirSync(VARDIR, { recursive: true });
const log: { name: string; ok: boolean; detail?: unknown }[] = []; let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; log.push({ name, ok: !!c, detail }); console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 260)}` : ""}`); };
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
const throws = (f: () => unknown, rx: RegExp) => { try { f(); return false; } catch (e) { return rx.test((e as Error).message); } };
const BROWSER = process.env.STUDIO_EXT_BROWSER ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);
const AxeBuilder = createRequire(import.meta.url)("@axe-core/playwright").default as typeof import("@axe-core/playwright").default;
const apr = (file: string) => `https://${HOST}/${file}`;
const TSX = join(STUDIO, "node_modules", ".bin", "tsx");

async function axe(page: Page, state: string) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  ok(`EXPERIENCE §3: axe finds nothing on the panel state "${state}"`, r.violations.length === 0, r.violations.map((v) => `${v.id}: ${v.nodes.length}`));
}
async function shot(page: Page, name: string) { if (EVIDENCE) { mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true }); } }

(async () => {
  // ──────────────────────────────────────────── P-98 G3: the development build takes the real host; nothing wider
  ok("C2.9: P-98 the development build takes the APR host as the address bar shows it (a bare host, an https address, a trailing slash)",
    devPortalOrigin("apr.example.gc.ca") === "https://apr.example.gc.ca" && devPortalOrigin("https://apr.example.gc.ca/") === "https://apr.example.gc.ca" && devPortalOrigin(" APR.Example.gc.ca ") === "https://apr.example.gc.ca" && devPortalOrigin("http://127.0.0.1:4459") === "http://127.0.0.1:4459");
  ok("C2.9: P-98 fail: a wildcard, plain http to a real host, a path, a port, a sign-in, a single word or nothing is refused, in words",
    ["*.gc.ca", "https://*.cic.gc.ca", "http://apr.example.gc.ca", "apr.example.gc.ca/apr/dashboard", "apr.example.gc.ca:8443", "user@apr.example.gc.ca", "apr", "", "apr.example.gc.ca?x=1", "<all_urls>"].every((h) => throws(() => devPortalOrigin(h), /cannot be used: .+ Paste only the host/)));
  const dev = manifest("development", { api: "http://localhost:4400", portal: "apr.example.gc.ca" });
  ok("C2.9: P-98 the development manifest runs on that one host only (content script and host permission), https",
    JSON.stringify(dev.host_permissions) === JSON.stringify(["https://apr.example.gc.ca/*"]) && JSON.stringify(dev.content_scripts[0].matches) === JSON.stringify(["https://apr.example.gc.ca/*"]) && !dev.content_scripts[0].all_frames);
  ok("C2.9: P-98 the Studio address of a development build is a local one; fail: another server is refused (a token never leaves the Mac)",
    devApiOrigin("http://localhost:4400") === "http://localhost:4400" && throws(() => devApiOrigin("https://studio.example.com"), /local one/) && throws(() => devApiOrigin("http://localhost:4400/api"), /local one/));
  const prod = manifest("production");
  ok("C7.4: XT-7 P-98 the production manifest names hosts.json's portal hosts only and passes its own check",
    productionProblems(prod).length === 0 && JSON.stringify(prod.host_permissions) === JSON.stringify(HOSTS.portal_hosts.map((h) => `https://${h}/*`)));
  ok("C7.4: XT-7 P-98 fail: a production manifest with any other host (the founder's real host added by hand) is refused",
    productionProblems({ ...prod, host_permissions: [...prod.host_permissions, "https://apr.example.gc.ca/*"] }).some((p) => /not one of the portal hosts listed/.test(p)));
  let refused = "";
  try { await buildExtension("production", join(VARDIR, "prod-refused"), { api: "http://localhost:4400", portal: "apr.example.gc.ca" }); } catch (e) { refused = (e as Error).message; }
  ok("C7.4: XT-7 P-98 fail: the production build takes no host from the command line", /production build takes its hosts from hosts.json only/.test(refused), refused);
  // The founder's own command (build-notes §"Founder capture"), as typed: npm run extension:dev <Studio> <host>.
  const cli = spawnSync(TSX, [join(STUDIO, "extension", "build.ts"), "development", "http://localhost:4400", "apr.example.gc.ca", join(VARDIR, "cli-dev")], { encoding: "utf8", timeout: 300_000 });
  const cliManifest = existsSync(join(VARDIR, "cli-dev", "manifest.json")) ? JSON.parse(readFileSync(join(VARDIR, "cli-dev", "manifest.json"), "utf8")) : null;
  ok("C2.9: P-98 G3 the founder's command builds for a pasted host with no code change and says where it runs",
    cli.status === 0 && /runs on: https:\/\/apr\.example\.gc\.ca\/\*/.test(cli.stdout) && cliManifest?.content_scripts?.[0]?.matches?.[0] === "https://apr.example.gc.ca/*", { status: cli.status, out: cli.stdout.slice(-200), err: cli.stderr.slice(-200) });
  const bad = spawnSync(TSX, [join(STUDIO, "extension", "build.ts"), "development", "http://localhost:4400", "*.gc.ca", join(VARDIR, "cli-bad")], { encoding: "utf8", timeout: 120_000 });
  ok("C2.9: P-98 G3 fail: a wildcard pasted by mistake builds nothing and says why, with the usage line", bad.status === 2 && /not built: The portal "\*\.gc\.ca" cannot be used/.test(bad.stderr) && /usage: npm run extension:dev/.test(bad.stderr) && !existsSync(join(VARDIR, "cli-bad", "manifest.json")), bad.stderr.slice(0, 200));

  // Break: the founder's addresses typed after the production command (or an address as the out folder) build nothing
  // and make no folder named after the address (run from this check's own folder: a child keeps tsx's --tsconfig path).
  const wrongBuild = spawnSync(TSX, [join(STUDIO, "extension", "build.ts"), "production", "http://localhost:4400", "apr.example.gc.ca"], { encoding: "utf8", timeout: 120_000 });
  const urlOut = spawnSync(TSX, [join(STUDIO, "extension", "build.ts"), "development", "http://localhost:4400", "apr.example.gc.ca", "http://localhost:4400"], { encoding: "utf8", timeout: 120_000 });
  ok("C7.4: XT-7 fail: addresses given to the production build, or an address as the out folder, build nothing, say why, and make no \"http:\" folder",
    wrongBuild.status === 2 && /takes its hosts from hosts.json only/.test(wrongBuild.stderr) && urlOut.status === 2 && /is an address, not a folder/.test(urlOut.stderr) && !existsSync(join(process.cwd(), "http:")), [wrongBuild.status, wrongBuild.stderr.slice(-300), urlOut.status, urlOut.stderr.slice(-300)]);

  const keep = mkdtempSync(join(tmpdir(), "xr-apr-keep-")); writeFileSync(join(keep, "notes.txt"), "a person's own file");
  const wipe = spawnSync(TSX, [join(STUDIO, "extension", "build.ts"), "development", "http://localhost:4400", "apr.example.gc.ca", keep], { encoding: "utf8", timeout: 120_000 });
  ok("C7.4: break (26 Oct) fail: a build into a folder that holds other files builds nothing and deletes nothing", wipe.status === 2 && /already holds other files/.test(wipe.stderr) && existsSync(join(keep, "notes.txt")), wipe.stderr.slice(0, 160));
  rmSync(keep, { recursive: true, force: true });
  // PR #34 review: a folder holding only build-like names (an assets folder with a person's picture) and no manifest of
  // this extension is not an earlier build: refused, left untouched.
  const look = mkdtempSync(join(tmpdir(), "xr-apr-assets-")); mkdirSync(join(look, "assets")); writeFileSync(join(look, "assets", "user-photos.png"), "a person's own picture");
  const lookAlike = spawnSync(TSX, [join(STUDIO, "extension", "build.ts"), "development", "http://localhost:4400", "apr.example.gc.ca", look], { encoding: "utf8", timeout: 120_000 });
  ok("C7.4: PR #34 review fail case: a folder holding only an assets folder with a file (no manifest of this extension) is refused and left untouched",
    lookAlike.status === 2 && /already holds other files/.test(lookAlike.stderr) && existsSync(join(look, "assets", "user-photos.png")) && !existsSync(join(look, "manifest.json")), [lookAlike.status, lookAlike.stderr.slice(0, 160)]);
  rmSync(look, { recursive: true, force: true });
  // PR #35 review: our own manifest beside someone's file is not an earlier build either: refused, left untouched.
  const mixed = mkdtempSync(join(tmpdir(), "xr-apr-mixed-")); writeFileSync(join(mixed, "manifest.json"), JSON.stringify({ name: "ExpatReady portal assistant (development)" })); writeFileSync(join(mixed, "notes.txt"), "a person's own notes");
  const mixedBuild = spawnSync(TSX, [join(STUDIO, "extension", "build.ts"), "development", "http://localhost:4400", "apr.example.gc.ca", mixed], { encoding: "utf8", timeout: 120_000 });
  ok("C7.4: PR #35 review fail case: a folder holding this extension's manifest and a notes.txt is refused and left untouched",
    mixedBuild.status === 2 && /already holds other files/.test(mixedBuild.stderr) && existsSync(join(mixed, "notes.txt")) && JSON.parse(readFileSync(join(mixed, "manifest.json"), "utf8")).name === "ExpatReady portal assistant (development)", [mixedBuild.status, mixedBuild.stderr.slice(0, 160)]);
  rmSync(mixed, { recursive: true, force: true });
  // Review-4 Minor 5: inside the Studio's working folder too (`var/workspaces` holds the demo's approval records).
  const inVar = join(VARDIR, "records"); mkdirSync(inVar, { recursive: true }); writeFileSync(join(inVar, "approved.json"), "{}");
  const varWipe = spawnSync(TSX, [join(STUDIO, "extension", "build.ts"), "development", "http://localhost:4400", "apr.example.gc.ca", inVar], { encoding: "utf8", timeout: 120_000 });
  const varAgain = spawnSync(TSX, [join(STUDIO, "extension", "build.ts"), "development", "http://localhost:4400", "apr.example.gc.ca", join(VARDIR, "cli-dev")], { encoding: "utf8", timeout: 120_000 });
  ok("C7.4: review-4 Minor 5 fail case: a build into a folder of the working folder that holds files builds nothing and deletes nothing; an earlier build there is built over",
    varWipe.status === 2 && /already holds other files/.test(varWipe.stderr) && existsSync(join(inVar, "approved.json")) && varAgain.status === 0, [varWipe.status, varWipe.stderr.slice(0, 160), varAgain.status, varAgain.stderr.slice(-200)]);

  // ──────────────────────────────────────────── setup (not under test)
  setupVisitorVisa(PORT, DB);
  const vv = sql("select id from combination where combination_key='vv.single'");
  const out = join(VARDIR, "extension");
  await buildExtension("development", out, { api: `http://127.0.0.1:${PORT}`, portal: HOST });
  // A certificate for the made-up host, made here, used once (the browser is told to accept it; nothing is installed).
  execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", join(VARDIR, "key.pem"), "-out", join(VARDIR, "cert.pem"), "-days", "1", "-subj", `/CN=${HOST}`], { stdio: "ignore" });
  const server = spawn(process.execPath, [join(STUDIO, "tests", "fixtures", "portal-server.mjs"), String(PORTAL), "--tls", join(VARDIR, "key.pem"), join(VARDIR, "cert.pem")], { stdio: "ignore" });
  await new Promise((r) => setTimeout(r, 800));
  const profile = mkdtempSync(join(tmpdir(), "xr-apr-"));
  let ctx: BrowserContext | null = null;
  try {
    ctx = await chromium.launchPersistentContext(profile, { headless: true, executablePath: BROWSER, ...(BROWSER ? {} : { channel: "chromium" }), viewport: { width: 1100, height: 900 }, ignoreHTTPSErrors: true,
      args: [`--disable-extensions-except=${out}`, `--load-extension=${out}`, `--host-resolver-rules=MAP ${HOST}:443 127.0.0.1:${PORTAL}`, "--ignore-certificate-errors"] });
    let [sw] = ctx.serviceWorkers(); if (!sw) sw = await ctx.waitForEvent("serviceworker", { timeout: 20_000 });
    ok("setup: the development build for the made-up APR host loads with its fixed id", sw.url().startsWith(`chrome-extension://${ID}/`), sw.url());
    const tab = await ctx.newPage();
    const panel = await ctx.newPage(); await panel.setViewportSize({ width: 360, height: 760 });
    panel.on("pageerror", (e) => console.log(`panel error: ${e.message}`));
    await panel.goto(`chrome-extension://${ID}/panel.html`);
    await panel.getByText("Connect the browser extension").waitFor();
    const connect = async (actor: string, who: string) => {
      const code = (await call("POST", "/extension/pairings", {}, actor)).body.code as string;
      await panel.getByLabel("Code from the Studio").fill(code); await panel.getByLabel("Code from the Studio").press("Enter");
      await panel.getByText(who).waitFor();
    };
    await connect("user-A", "Configuration author · Capture");

    // ──────────────────────────────────────────── capture the visitor visa on the APR Portal (the default)
    const portalSelect = panel.getByRole("combobox", { name: /^Portal/ });
    ok("C2.9: P-98 the panel's capture starts on the APR Portal, listed first", (await portalSelect.inputValue()) === "apr_portal" && (await portalSelect.locator("option").first().innerText()) === "APR Portal (Authorized Paid Representatives)");
    const start = async (form: string, title: string, type?: string) => {
      await panel.getByLabel("Form code").fill(form); await panel.getByLabel("Title as the portal shows it").fill(title);
      if (type) await panel.getByLabel("Application type (optional)").fill(type);
      await panel.getByRole("button", { name: "Start capture" }).click();
      await panel.getByText(`${form} · 0 screens captured`).waitFor();
    };
    const capture = async (file: string, n: number) => {
      await tab.goto(apr(file)); await panel.getByRole("button", { name: "Capture this screen" }).click();
      await panel.getByRole("button", { name: "Send this screen" }).click(); await panel.getByText(`Screen ${n} captured`).waitFor();
    };
    await start("IMM 5257", "Application for a visitor visa", "Visitor visa");
    await capture("apr-vv-s01-application.html", 1);
    // During real work the person has typed and ticked on the screen: the reader never reads it (BR-1).
    await tab.goto(apr("apr-vv-s02-personal.html")); await tab.fill("#familyName", "SAMPLE-TYPED"); await tab.fill("#uci", "87654321"); await tab.selectOption("#sex", "MALE");
    await panel.getByRole("button", { name: "Capture this screen" }).click();
    const sent = await panel.getByRole("region", { name: "Check before sending" }).innerText();
    ok("C2.9: BR-3 on the APR screen every text it sends is listed (labels named by aria-labelledby too); no typed answer is among them",
      /Family name \(as shown on your passport or travel document\)/.test(sent) && /City or town/.test(sent) && !/SAMPLE-TYPED|87654321/.test(sent), sent.slice(0, 220));
    await panel.getByRole("button", { name: "Send this screen" }).click(); await panel.getByText("Screen 2 captured").waitFor();
    await capture("apr-vv-s03-marital.html", 3);
    // The person answers Single on the portal, so the spouse screen (a branch) never opens: s04 is not captured.
    await capture("apr-vv-s05-language.html", 4);
    // PR #27: "Check before sending" is for the screen that was read; the tab moves on before sending: nothing is sent.
    await tab.goto(apr("apr-vv-s06-passport.html")); await panel.getByRole("button", { name: "Capture this screen" }).click();
    await panel.getByRole("region", { name: "Check before sending" }).waitFor();
    const capId = sql("select id from portal_capture where way='extension' order by created_at desc limit 1");
    const screensNow = () => (JSON.parse(sql(`select record::text from portal_capture where id='${capId}'`)).screens as unknown[]).length;
    await tab.goto(apr("apr-vv-s05-language.html"));
    await panel.getByText("The portal moved to another screen: nothing was sent.").waitFor();
    ok("C2.9: PR #27 the panel drops \"Check before sending\" when the portal tab moves on; nothing was sent", (await panel.getByRole("region", { name: "Check before sending" }).count()) === 0 && screensNow() === 4);
    await shot(panel, "01-moved-on-360");
    await capture("apr-vv-s06-passport.html", 5);

    // ──────────────────────────────────────────── markup the reader cannot see into: "not read", nothing sent (P-98)
    for (const [file, why] of [["live-unknown-shadow.html", /inside page components the reader cannot see into/], ["live-unknown-frame.html", /inside a frame/], ["live-unknown-unlabelled.html", /no label the reader can find \(mat-input-0, mat-input-1\)/], ["live-unknown-combobox.html", /custom control \(role="combobox"\)/],
      ["live-unknown-closed-shadow.html", /inside page components the reader cannot see into/], ["live-unknown-nested-shadow.html", /inside page components the reader cannot see into/],
      ["live-unknown-foreign-frame.html", /a frame from another site the reader cannot look into/], ["live-unknown-object.html", /inside a frame/]] as const) {
      await tab.goto(apr(file)); await panel.getByRole("button", { name: "Capture this screen" }).click();
      await panel.getByText(/^Not read: /).first().waitFor();
      const said = await panel.locator("main").innerText();
      ok(`C2.9: P-98 fail: unknown markup (${file.replace(/^live-unknown-|\.html$/g, "")}) is "not read", the reason in words, nothing sent`, why.test(said) && /Nothing was sent/.test(said) && screensNow() === 5 && (await panel.getByRole("region", { name: "Check before sending" }).count()) === 0, said.slice(0, 200));
    }
    await axe(panel, "not read"); await shot(panel, "02-not-read-360");
    // Break 26 Oct (minor): a label whose words equal its input's id, and an input moved off the page as a trap for
    // robots, are ordinary markup: the screen reads.
    await tab.goto(apr("live-ok-label-is-id.html")); await panel.getByRole("button", { name: "Capture this screen" }).click();
    await panel.getByRole("region", { name: "Check before sending" }).waitFor();
    ok("C2.9: P-98 a label equal to its input's id and an off-page trap input do not stop a real screen (it reads; nothing sent yet)", /city/.test(await panel.getByRole("region", { name: "Check before sending" }).innerText()) && screensNow() === 5);
    await tab.goto(apr("apr-vv-s05-language.html")); await panel.getByText("The portal moved to another screen: nothing was sent.").waitFor();

    // ──────────────────────────────────────────── a returned capture goes on in the panel (PR #27)
    await panel.getByRole("button", { name: "Finish capture" }).click();
    await panel.getByText("IMM 5257 · held for a second person").waitFor();
    let r = await call("POST", `/captures/${capId}/return`, { note: "The passport screen was captured from the wrong application" }, "user-C");
    ok("setup: the second person returns the capture with a note", r.status < 300, r.body?.message ?? r.status);
    await panel.reload();
    await panel.getByRole("button", { name: "Returned to you: IMM 5257 · 5 screens" }).click();
    await panel.getByText("IMM 5257 · returned to you").waitFor();
    const ret = await panel.locator("main").innerText();
    ok("C2.9: PR #27 a returned capture resumes in the panel with the second person's note and its screens; Finish waits for a change",
      /wrong application/.test(ret) && (await panel.getByRole("list", { name: "Screens captured" }).locator("li").count()) === 5 && await panel.getByRole("button", { name: "Finish capture" }).isDisabled());
    await axe(panel, "returned to you"); await shot(panel, "03-returned-360");
    await panel.getByRole("button", { name: "Remove screen 2, Personal details" }).focus(); await panel.keyboard.press("Enter"); // keyboard
    await panel.getByText("Screen 2 removed: capture it again in the portal.").waitFor();
    ok("C2.9: PR #27 the wrong screen is removed in the panel (by keyboard); the capture is open again", screensNow() === 4 && sql(`select status from portal_capture where id='${capId}'`) === "OPEN");
    await tab.goto(apr("apr-vv-s02-personal.html")); await panel.getByRole("button", { name: "Capture this screen" }).click();
    await panel.getByRole("button", { name: "Send this screen" }).click(); await panel.getByText('"Personal details" captured again as screen 2, before "Marital status"').waitFor();
    const order = (JSON.parse(sql(`select record::text from portal_capture where id='${capId}'`)).screens as { title: string }[]).map((x) => x.title).join(" / ");
    ok("C2.9: review-3 Minor 1 the screen captured again goes back into its place: portal order kept", order === "Application details / Personal details / Marital status / Languages / Passport", order);
    await panel.getByRole("button", { name: "Finish capture" }).click();
    await panel.getByText("IMM 5257 · held for a second person").waitFor();
    r = await call("POST", `/captures/${capId}/approve`, undefined, "user-C");
    const ed = sql(`select form_edition_id from portal_capture where id='${capId}'`);
    ok("C2.8: the second person approves the APR capture: an online version of IMM 5257 on the APR Portal", r.status < 300 && sql(`select portal_key || '|' || channel from form_edition where id='${ed}'`) === "apr_portal|ONLINE", r.body?.message ?? r.status);
    const rec = sql(`select record::text from portal_capture where id='${capId}'`);
    ok("C2.9: BR-1 the approved record holds 5 screens, not the spouse branch, and no typed answer", JSON.parse(rec).screens.length === 5 && !/Spouse|SAMPLE-TYPED|87654321/.test(rec));
    const draft = (await call("POST", `/online-versions/${ed}/screen-map/draft`)).body;
    const unseen = (draft.pdf_not_on_portal ?? []) as { caption: string; fact: string }[];
    ok("C2.9: P-98 branches not seen: the PDF's spouse questions are listed as not on any captured screen (the spouse screen opens only after some answers)",
      unseen.some((u) => /spouse|partner|marri/i.test(`${u.fact} ${u.caption}`)), unseen.slice(0, 4));
    ok("C2.9: P-98 fail: a question the captured screens do ask is not listed as unseen (family name)", !unseen.some((u) => u.fact === "person.family_name"), unseen.map((u) => u.fact).slice(0, 8));

    // ──────────────────────────────────────────── the work permit, and a long application
    await panel.getByRole("button", { name: "Start another capture" }).click();
    await start("IMM 1295", "Application for a work permit made outside of Canada", "Work permit");
    let n = 0;
    for (const f of ["apr-wp-s01-application.html", "apr-wp-s02-personal.html", "apr-wp-s03-job.html", "apr-wp-s05-education.html"]) await capture(f, ++n);
    await panel.getByRole("button", { name: "Finish capture" }).click(); await panel.getByText("IMM 1295 · held for a second person").waitFor();
    ok("C2.9: P-98 the work permit is captured on the APR Portal (4 screens, the past-employment branch not seen) and held for a second person",
      sql("select portal_key || '|' || status || '|' || jsonb_array_length(record->'screens') from portal_capture where form_key='IMM 1295' and way='extension'") === "apr_portal|HELD|4");
    await panel.getByRole("button", { name: "Start another capture" }).click();
    await start("TEST LONG", "A long Sample application");
    for (n = 1; n <= 32; n++) await capture(`apr-long-s${String(n).padStart(2, "0")}.html`, n);
    await panel.getByRole("button", { name: "Finish capture" }).click(); await panel.getByText("TEST LONG · held for a second person").waitFor();
    const long = JSON.parse(sql("select record::text from portal_capture where form_key='TEST LONG'"));
    ok("C2.9: hardening a long application: 32 screens captured in portal order, 96 questions, held", long.screens.length === 32 && long.screens.reduce((a: number, s: { inputs: unknown[] }) => a + s.inputs.length, 0) === 96 && long.screens[31].title === "Additional details, part 32");

    // ──────────────────────────────────────────── a value or a tick sent to the API is refused (never trusted)
    const tok = (await call("POST", "/extension/pairings", {}, "user-A")).body.code as string;
    const token = (await fetch(`http://localhost:${PORT}/api/extension/sessions`, { method: "POST", headers: { origin: `chrome-extension://${ID}`, "content-type": "application/json" }, body: JSON.stringify({ code: tok, extensionId: ID }) }).then((x) => x.json())).token as string;
    const open = (await as(token).call("POST", "/extension/captures", { portal: "apr_portal", form: "IMM 5257", title: "Value probe" })).body;
    const screen = (extra: Record<string, unknown>) => ({ screen: { title: "Personal details", inputs: [{ id: "familyName", label: "Family name", type: "text", required: true, order: 1, ...extra }] }, revision: open.revision });
    const v = await as(token).call("POST", `/extension/captures/${open.id}/screens`, screen({ value: "SAMPLE" }));
    const t = await as(token).call("POST", `/extension/captures/${open.id}/screens`, screen({ type: "checkbox", checked: true }));
    ok("C2.9: BR-1 fail: a screen sent with a value, or with a tick, is refused (400) and nothing is kept", v.status === 400 && t.status === 400 && /answer/.test(`${v.body.message} ${t.body.message}`) && (await as(token).call("GET", `/extension/captures/${open.id}`)).body.screens.length === 0, [v.body.message, t.body.message]);
    const good = await as(token).call("POST", `/extension/captures/${open.id}/screens`, screen({}));
    ok("C2.9: BR-1 the same screen with structure only is added", good.status < 300 && good.body.result?.outcome === "added", good.body.result);
    const officerTok = (await fetch(`http://localhost:${PORT}/api/extension/sessions`, { method: "POST", headers: { origin: `chrome-extension://${ID}`, "content-type": "application/json" }, body: JSON.stringify({ code: (await call("POST", "/extension/pairings", {}, "user-O")).body.code, extensionId: ID }) }).then((x) => x.json())).token as string;
    const notMine = await as(officerTok).call("DELETE", `/extension/captures/${open.id}/screens/1?revision=${good.body.capture.revision}`);
    ok("C2.9: PR #27 fail: a token without the capture duty cannot remove a screen of someone's capture (403), nothing removed", notMine.status === 403 && (await as(token).call("GET", `/extension/captures/${open.id}`)).body.screens.length === 1, notMine.status);
    const stale = await as(token).call("DELETE", `/extension/captures/${open.id}/screens/1?revision=${open.revision}`);
    const bare = await as(token).call("DELETE", `/extension/captures/${open.id}/screens/1`);
    ok("C2.9: break (26 Oct) fail: a remove sent from an older list (stale revision: 409) or with no revision (400) removes nothing", stale.status === 409 && /changed since you last saw it/.test(stale.body.message) && bare.status === 400 && (await as(token).call("GET", `/extension/captures/${open.id}`)).body.screens.length === 1, [stale.status, bare.status]);
    const removed = await as(token).call("DELETE", `/extension/captures/${open.id}/screens/1?revision=${good.body.capture.revision}`);
    ok("C2.9: PR #27 the capturer's token removes a screen of their own capture (the route the panel's Remove uses)", removed.status === 200 && removed.body.screens.length === 0, removed.status);
    // Review-4 Minor 1: five screens A–E; B and D removed, then captured again (D first): portal order A B C D E; a screen
    // never seen before goes at the end, not into a removed screen's place.
    let rev = removed.body.revision as number;
    const send = async (title: string) => { const x = await as(token).call("POST", `/extension/captures/${open.id}/screens`, { screen: { title, inputs: [{ id: `q-${title.replace(/\W+/g, "-")}`, label: `Question on ${title}`, type: "text", required: false, order: 1 }] }, revision: rev }); rev = x.body.capture?.revision ?? rev; return x; };
    const drop = async (n: number) => { const x = await as(token).call("DELETE", `/extension/captures/${open.id}/screens/${n}?revision=${rev}`); rev = x.body.revision ?? rev; return x; };
    const titles = async () => ((await as(token).call("GET", `/extension/captures/${open.id}`)).body.screens as { title: string }[]).map((x) => x.title.slice(-1)).join("");
    for (const t of ["A", "B", "C", "D", "E"]) await send(`Order screen ${t}`);
    await drop(2); await drop(3); // B, then D (now third)
    const dAgain = await send("Order screen D"), bAgain = await send("Order screen B");
    const fresh = await send("Order screen F");
    ok("C2.9: review-4 Minor 1 two removals keep portal order (B and D captured again: A B C D E), a new screen goes at the end, and the message says where it went, not \"in its place\"",
      (await titles()) === "ABCDEF" && /captured again as screen 3, before "Order screen E"/.test(dAgain.body.result?.message) && /captured again as screen 2, before "Order screen C"/.test(bAgain.body.result?.message) && /^Screen 6 captured/.test(fresh.body.result?.message) && !/in its place/.test(`${dAgain.body.result?.message}${bAgain.body.result?.message}`),
      { order: await titles(), d: dAgain.body.result?.message, b: bAgain.body.result?.message, f: fresh.body.result?.message });
    const mine = await as(token).call("GET", "/extension/captures");
    ok("C2.9: review Major 1 the panel's list of captures to continue holds this person's open capture (the route a reloaded panel reads)", mine.status === 200 && mine.body.some((c: { id: string }) => c.id === open.id), mine.status);

    // ──────────────────────────────────────────── fill on the APR Portal; a reworded screen fills nothing, one task
    const rel = await releaseOnline(call, sql, vv, ed, { note: "P-98: IMM 5257 filed Online on the APR Portal" });
    ok("setup: Visitor visa released with IMM 5257 filed Online on the APR Portal", rel.status < 300 && sql(`select portal_key from combination where id='${vv}'`) === "apr_portal", rel.body?.message ?? rel.status);
    await openCase(call, vv, "APR-CASE-1", [["person.family_name", "SAMPLE"], ["person.sex", "f_female"], ["person.date_of_birth", "1990-05-17"], ["person.place_of_birth_city", "Sample City"]], ["person.family_name", "person.date_of_birth", "person.sex"]);
    await panel.getByRole("button", { name: "Start another capture" }).click();
    await panel.getByRole("button", { name: "Sign out of the extension" }).click(); await panel.getByText("Connect the browser extension").waitFor();
    await connect("user-O", "Case officer · Fill");
    await panel.getByLabel("Search by reference").fill("APR-CASE-1");
    await panel.getByLabel("Case").selectOption({ label: `APR-CASE-1 · Visitor visa · release ${sql(`select max(version) from config_release where combination_id='${vv}'`)}` });
    await tab.goto(apr("apr-vv-s02-personal.html"));
    await panel.getByRole("button", { name: "Fill this screen" }).click();
    await panel.getByText(/^Filled \d+ of 9/).waitFor();
    const filled = await panel.getByRole("region", { name: "What was filled" }).innerText();
    const onPage = await tab.evaluate(() => ({ fam: (document.getElementById("familyName") as HTMLInputElement).value, sex: (document.getElementById("sex") as HTMLSelectElement).value, year: (document.getElementById("dobYear") as HTMLInputElement).value }));
    ok("C7.4: P-98 \"Fill this screen\" fills the APR personal screen from the case's confirmed facts, with sources", /Filled [1-9] of 9/.test(filled) && onPage.fam === "SAMPLE" && onPage.sex === "FEMALE" && onPage.year === "1990" && /From the case/.test(filled), { filled: filled.slice(0, 120), onPage });
    await tab.goto(apr("apr-vv-s02-personal-reworded.html"));
    await panel.getByRole("button", { name: "Fill this screen" }).click();
    await panel.getByText("This screen looks different").first().waitFor();
    await panel.getByRole("button", { name: "Check this screen again" }).click();
    await panel.getByText("This screen looks different").first().waitFor();
    const untouched = await tab.evaluate(() => (document.getElementById("familyName") as HTMLInputElement).value);
    ok("C9.3: P-98 a reworded APR screen fills nothing and opens one \"Re-capture needed\" (seen twice: one task, counted)", untouched === "" && sql("select count(*) || '|' || max(times) from recapture_task where status='OPEN' and kind='changed'") === "1|2");
    await axe(panel, "APR screen looks different"); await shot(panel, "04-looks-different-360");
  } finally {
    await ctx?.close(); server.kill(); rmSync(profile, { recursive: true, force: true });
  }
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`FAIL  the check stopped: ${String((e as Error)?.message ?? e).slice(0, 300)}`); console.error(e); process.exit(1); });
