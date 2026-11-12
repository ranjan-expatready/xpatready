// F3c-1 (forms lane, F3 plan slice 3; concept X1, X3, X5, X6; D6, BR-15): start an APR capture from the Studio's "Add an
// online form" panel and make it in the browser extension. Through the API: one open extension capture per person, form
// and portal (two starts at the same moment, the Studio then the panel, a returned capture: always the same one, with the
// combination it was started for); another person's capture is never in my panel. In Chromium, on the Sample APR
// screens over https under a made-up host (as the founder's G3 build runs): the Studio button starts it; the panel lists
// it first as "Started in the Studio · Visitor visa"; each new portal page is named ("New screen: …") with no request,
// an already captured one says so and sends nothing; "Check before sending" lists each question with its kind and
// choices, and a screen carrying a client's detail is refused naming the question and the fix; Finish shows screens,
// questions, the PDF sections not seen yet and that a second person approves it. Keyboard and axe on the new states.
// No model call (US$0); all Sample.
//   zsh studio/tools/isolated.sh forms_f3c 4457 start && tsx studio/tests/check_forms_f3c.ts 4457 xr_studio_forms_f3c  [--evidence writes screenshots]
/// <reference types="chrome" />
import { execFileSync, spawn } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, type BrowserContext, type Page } from "playwright";
import { buildExtension } from "../extension/build.ts";
import { setupVisitorVisa } from "./forms_f2_setup.ts";

const PORT = Number(process.argv[2] ?? 4457), DB = process.argv[3] ?? "xr_studio_forms_f3c", PORTAL = 4453;
const HOST = "apr-portal.sample.test"; // a made-up host (.test never resolves): Chromium maps it to the local Sample server
const STUDIO = join(import.meta.dirname, "..");
const ID = "ipomjnfjkniidipddghocobgcfecebaf";
const EVIDENCE = process.argv.includes("--evidence");
const SHOTS = join(STUDIO, "..", "..", "product", "screens", "F3-add-form-wizard", "screenshots", "f3c");
const VARDIR = join(STUDIO, "var", "check-forms-f3c"); rmSync(VARDIR, { recursive: true, force: true }); mkdirSync(VARDIR, { recursive: true });
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely, as in the other API checks
const call = async (method: string, path: string, body?: unknown, actor = "user-A"): Promise<Res> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
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
  ok(`EXPERIENCE §3: axe finds nothing on the state "${state}"`, r.violations.length === 0, r.violations.map((v) => `${v.id}: ${v.nodes.length}`));
}
async function shot(page: Page, name: string) { if (EVIDENCE) { mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true }); } }
const START = { way: "extension", portal: "apr_portal", form: "imm 5257", title: "Application for a visitor visa" };
const openOf = (form: string) => sql(`select count(*) from portal_capture where way='extension' and captured_by='user-A' and form_key='${form}' and portal_key='apr_portal' and status in ('OPEN','RETURNED')`);

(async () => {
  setupVisitorVisa(PORT, DB);
  const vv = sql("select id from combination where combination_key='vv.single'");
  ok("setup: the runtime lane's Visitor visa is released, with IMM 5257's PDF field map in the library", !!vv && Number(sql("select count(*) from form_field_map m join form_edition e on e.id = m.form_edition_id where e.edition_label like 'IMM 5257 (%' and e.channel = 'PDF'")) > 0);

  // ──────────────────────────────────────────── D6: one open extension capture per person, form and portal (API)
  const twice = await Promise.all([call("POST", "/captures", { ...START, combinationId: vv }), call("POST", "/captures", { ...START, combinationId: vv })]);
  ok("C2.9: D6 BR-15 fail case: two starts from the Studio at the same moment (a double click) make one capture: 201 then 200 (reused), the same id",
    twice.map((x) => x.status).sort().join() === "200,201" && twice[0].body.id === twice[1].body.id && twice.some((x) => x.body.reused === true) && openOf("IMM 5257") === "1", twice.map((x) => [x.status, x.body.reused, x.body.message]));
  const capId = twice[0].body.id as string;
  ok("C2.9: X1 the capture carries the combination it was started for, and the form code as the library writes it", twice[0].body.combination?.label === "Visitor visa" && twice[0].body.form === "IMM 5257" && twice[0].body.way === "extension");
  const code = (await call("POST", "/extension/pairings", {})).body.code as string;
  const token = (await extCall("", "POST", "/extension/sessions", { code, extensionId: ID })).body.token as string;
  let r = await as(token).call("POST", "/extension/captures", { portal: "apr_portal", form: "IMM-5257", title: "Visitor visa (typed in the panel)" });
  ok("C2.9: D6 a start in the panel for the same form and portal continues the Studio's capture (200, reused), keeping its combination; nothing new", r.status === 200 && r.body.id === capId && r.body.reused === true && r.body.combination?.label === "Visitor visa" && openOf("IMM 5257") === "1", [r.status, r.body.id === capId, r.body.combination]);
  r = await as(token).call("POST", "/extension/captures", { portal: "ircc_portal", form: "IMM 5257", title: "On another portal" });
  ok("C2.9: D6 another portal is another capture (201)", r.status === 201 && r.body.id !== capId && r.body.reused === false, r.status);
  sql(`update portal_capture set status='ABANDONED' where id='${r.body.id}'`);
  // A returned capture is the open one too (it goes on in the panel; PR #27).
  sql(`update portal_capture set status='RETURNED' where id='${capId}'`);
  r = await call("POST", "/captures", { ...START, combinationId: vv });
  ok("C2.9: D6 fail case: a returned capture is returned again, never a second one", r.status === 200 && r.body.id === capId && r.body.status === "RETURNED", [r.status, r.body.status]);
  sql(`update portal_capture set status='OPEN' where id='${capId}'`);
  // Another person's capture (the content reviewer's, made here as data: only the author may capture in the Sample roles).
  sql(`insert into portal_capture (id, workspace_id, portal_key, form_key, title, way, status, status_detail, record, combination_id, captured_by, files) select gen_random_uuid(), workspace_id, 'apr_portal', 'IMM 5257', 'Another person''s capture', 'extension', 'OPEN', 'check', '{"screens":[]}', id, 'user-C', '[]' from combination where id='${vv}'`);
  const mine = (await as(token).call("GET", "/extension/captures")).body as { id: string; captured_by: string }[];
  ok("C2.9: BR-15 fail case: another person's open capture of the same form is never in my panel's list", mine.every((x) => x.captured_by === "user-A") && mine.some((x) => x.id === capId), mine.map((x) => x.captured_by));
  // A capture started in the panel without a combination, newer than the Studio's: the Studio's is still listed first.
  r = await as(token).call("POST", "/extension/captures", { portal: "apr_portal", form: "IMM 5707", title: "Family information" });
  const list = ((await as(token).call("GET", "/extension/captures")).body as { id: string }[]).map((x) => x.id);
  ok("C2.9: X1 the capture started in the Studio is listed first, before a newer one started in the panel", list[0] === capId && list.includes(r.body.id), list);
  sql(`update portal_capture set status='ABANDONED' where id='${r.body.id}'`);
  sql(`update portal_capture set status='ABANDONED' where id='${capId}'`); // the journey below starts it again from the Studio's page
  // Break M2: a capture held for the second person is the open one too: a new start returns it, so a later return never
  // leaves two open captures of one form.
  const held = (await as(token).call("POST", "/extension/captures", { portal: "apr_portal", form: "IMM 1295", title: "Work permit" })).body.id as string;
  sql(`update portal_capture set status='HELD' where id='${held}'`);
  r = await call("POST", "/captures", { ...START, form: "IMM 1295", title: "Work permit", combinationId: vv });
  await call("POST", `/captures/${held}/return`, { note: "check: returned while a new start was tried" }, "user-C");
  ok("C2.9: D6 break M2 fail case: a start while the capture is held returns the held one (200, reused); after the second person returns it there is one open capture, not two",
    r.status === 200 && r.body.id === held && r.body.status === "HELD" && sql(`select count(*) from portal_capture where way='extension' and captured_by='user-A' and form_key='IMM 1295' and status in ('OPEN','RETURNED','HELD')`) === "1", [r.status, r.body.status]);
  sql(`update portal_capture set status='ABANDONED' where id='${held}'`);
  // Break m2: a form the library does not hold, written with and without its space, is one capture.
  const abc = await Promise.all(["ABC 123", "ABC123"].map((form) => as(token).call("POST", "/extension/captures", { portal: "apr_portal", form, title: "A form not in the library" })));
  ok("C2.9: D6 break m2 fail case: \"ABC 123\" and \"ABC123\" are one capture", abc[0].body.id === abc[1].body.id && abc.some((x) => x.status === 200), abc.map((x) => [x.status, x.body.form]));
  sql(`update portal_capture set status='ABANDONED' where id='${abc[0].body.id}'`);
  // Break M3: a capture started in the panel (no combination) takes the combination of a Studio start; a start from
  // another combination continues it and keeps the first one's.
  const pan = (await as(token).call("POST", "/extension/captures", { portal: "apr_portal", form: "IMM 5476", title: "Use of a representative" })).body.id as string;
  r = await call("POST", "/captures", { ...START, form: "IMM 5476", title: "Use of a representative", combinationId: vv });
  const sv = sql("select id from combination where combination_key <> 'vv.single' limit 1");
  const other = sv ? await call("POST", "/captures", { ...START, form: "IMM 5476", title: "Use of a representative", combinationId: sv }) : null;
  ok("C2.9: D6 break M3 a panel capture with no combination takes the Studio start's (Visitor visa); a start from another combination continues it and keeps Visitor visa",
    r.status === 200 && r.body.id === pan && r.body.combination?.label === "Visitor visa" && (!other || (other.body.id === pan && other.body.combination?.label === "Visitor visa")), [r.body.combination, other?.body.combination]);
  // Break m8: an element id or a format that carries a client's detail is refused like a text, and nothing is kept.
  const rev = (await as(token).call("GET", `/extension/captures/${pan}`)).body.revision;
  const byId = await as(token).call("POST", `/extension/captures/${pan}/screens`, { screen: { title: "Representative", inputs: [{ id: "X1234567", label: "Representative's name", type: "text", required: false, order: 1 }] }, revision: rev });
  const byPattern = await as(token).call("POST", `/extension/captures/${pan}/screens`, { screen: { title: "Representative", inputs: [{ id: "repEmail", label: "Email", type: "text", required: false, order: 1, pattern: "^jane.client@example.com$" }] }, revision: rev });
  ok("C2.9: BR-3 break m8 fail case: a passport-like element id, or an email inside an input's format, is refused (422, in words); nothing kept",
    byId.status === 422 && /element id of "Representative's name" looks like a client's detail/.test(byId.body.message) && byPattern.status === 422 && /format of "Email"/.test(byPattern.body.message) && (await as(token).call("GET", `/extension/captures/${pan}`)).body.screens.length === 0, [byId.status, byId.body.message, byPattern.status, byPattern.body.message]);
  sql(`update portal_capture set status='ABANDONED' where id='${pan}'`);

  // ──────────────────────────────────────────── in Chromium: the Studio button, then the panel on the APR screens
  const out = join(VARDIR, "extension");
  await buildExtension("development", out, { api: `http://127.0.0.1:${PORT}`, portal: HOST });
  execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", join(VARDIR, "key.pem"), "-out", join(VARDIR, "cert.pem"), "-days", "1", "-subj", `/CN=${HOST}`], { stdio: "ignore" });
  const server = spawn(process.execPath, [join(STUDIO, "tests", "fixtures", "portal-server.mjs"), String(PORTAL), "--tls", join(VARDIR, "key.pem"), join(VARDIR, "cert.pem")], { stdio: "ignore" });
  await new Promise((res) => setTimeout(res, 800));
  const profile = mkdtempSync(join(tmpdir(), "xr-f3c-"));
  let ctx: BrowserContext | null = null;
  try {
    ctx = await chromium.launchPersistentContext(profile, { headless: true, executablePath: BROWSER, ...(BROWSER ? {} : { channel: "chromium" }), viewport: { width: 1280, height: 900 }, ignoreHTTPSErrors: true,
      args: [`--disable-extensions-except=${out}`, `--load-extension=${out}`, `--host-resolver-rules=MAP ${HOST}:443 127.0.0.1:${PORTAL}`, "--ignore-certificate-errors"] });
    let [sw] = ctx.serviceWorkers(); if (!sw) sw = await ctx.waitForEvent("serviceworker", { timeout: 20_000 });

    // The Studio: "Add an online form" › "Start the capture in the extension" (X1, BR-15; the page never messages the extension).
    const studio = await ctx.newPage();
    await studio.goto(`http://localhost:${PORT}/`); await studio.evaluate(() => localStorage.setItem("xr-actor", "user-A"));
    await studio.goto(`http://localhost:${PORT}/c/${vv}`);
    const forms = studio.getByRole("region", { name: "Forms" });
    await forms.getByRole("button", { name: "Add an online form" }).click();
    const op = studio.getByRole("dialog", { name: "Add an online form" }); await op.waitFor();
    ok("C2.9: P-98 the Studio panel starts on the APR Portal", (await op.getByRole("combobox", { name: "Portal" }).inputValue()) === "apr_portal");
    await op.getByLabel("Form code").fill("IMM 5257"); await op.getByLabel("Title as the portal shows it").fill("Application for a visitor visa");
    await axe(studio, "Studio: Add an online form, with the extension's way");
    await op.getByRole("button", { name: "Start the capture in the extension" }).focus(); await studio.keyboard.press("Enter"); // keyboard
    await op.getByText("IMM 5257 capture in the extension").waitFor();
    const said = await op.innerText();
    const started = sql(`select id from portal_capture where way='extension' and captured_by='user-A' and form_key='IMM 5257' and status='OPEN'`);
    ok("C2.9: BR-15 X1 the Studio button starts the capture for this combination and says what to do next, in words (no files needed)", !!started && /open the ExpatReady extension on the APR Portal/.test(said) && /"Started in the Studio · Visitor visa"/.test(said) && sql(`select combination_id from portal_capture where id='${started}'`) === vv, said.slice(0, 240));
    await shot(studio, "01-studio-started-1280");
    await op.getByRole("button", { name: "Close", exact: true }).last().click();
    await forms.getByRole("button", { name: "Add an online form" }).click(); await op.waitFor();
    await op.getByLabel("Form code").fill("IMM 5257"); await op.getByLabel("Title as the portal shows it").fill("Application for a visitor visa");
    await op.getByRole("button", { name: "Start the capture in the extension" }).click();
    await op.getByText(/Already started in the extension \(0 screens so far\)/).waitFor();
    ok("C2.9: D6 fail case: a second click in the Studio says it is already started; still one open capture", openOf("IMM 5257") === "1");

    const tab = await ctx.newPage();
    const panel = await ctx.newPage(); await panel.setViewportSize({ width: 360, height: 760 });
    panel.on("pageerror", (e) => console.log(`panel error: ${e.message}`));
    await panel.goto(`chrome-extension://${ID}/panel.html`);
    await panel.getByText("Connect the browser extension").waitFor();
    await panel.getByLabel("Code from the Studio").fill((await call("POST", "/extension/pairings", {})).body.code); await panel.getByLabel("Code from the Studio").press("Enter");
    await panel.getByText("Configuration author · Capture").waitFor();
    const first = panel.getByRole("region", { name: "Captures to continue" }).getByRole("button").first();
    ok("C2.9: X1 the panel lists the Studio's capture first: \"Started in the Studio · Visitor visa\"", /^Started in the Studio · Visitor visa: IMM 5257 · 0 screens so far$/.test(await first.innerText()), await first.innerText());
    await axe(panel, "panel: captures to continue"); await shot(panel, "02-started-in-studio-360");
    await first.click();
    await panel.getByText("Started in the Studio · Visitor visa").waitFor();

    // X3: the step prompt names each new portal page; nothing is sent by it.
    const revision = () => sql(`select revision from portal_capture where id='${started}'`);
    const rev0 = revision();
    await tab.goto(apr("apr-vv-s01-application.html"));
    await panel.getByText("New screen: Application details").waitFor();
    ok("C2.9: X3 a new portal page is named in the panel (\"New screen: Application details\") and nothing is sent by it", revision() === rev0 && sql(`select count(*) from audit_event where entity='portal screens' and summary like '%Application details%'`) === "0");
    await axe(panel, "panel: new screen"); await shot(panel, "03-new-screen-360");
    await panel.getByRole("button", { name: "Capture this screen" }).click();
    const check = panel.getByRole("region", { name: "Check before sending" });
    await check.waitFor();
    await panel.getByRole("button", { name: "Send this screen" }).click(); await panel.getByText("Screen 1 captured").waitFor();
    await tab.goto(apr("apr-vv-s02-personal.html"));
    await panel.getByText("New screen: Personal details").waitFor();
    // X5: per question: its label, kind and choices.
    await panel.getByRole("button", { name: "Capture this screen" }).click(); await check.waitFor();
    const qs = await check.innerText();
    ok("C2.9: X5 \"Check before sending\" lists each question with its kind and choices (a text question, a date, a choice with its options), as structure only",
      /Family name \(as shown on your passport or travel document\)\s*Text, required/.test(qs) && /Choose one(, required)?: [^\n]*(Female|Male)/.test(qs) && /question[s]? go to ExpatReady, as structure only/.test(qs), qs.slice(0, 400));
    ok("C2.9: PR #36 review fail case: everything the screen sends is shown before sending: each element id, help text and choice code",
      /Element id: familyName/.test(qs) && /Element id: givenNames/.test(qs) && /Help: Leave blank if you have no given name on your passport\./.test(qs) && /FEMALE = Female/.test(qs), qs.slice(0, 500));
    await axe(panel, "panel: check before sending, per question"); await shot(panel, "04-check-per-question-360");
    await panel.getByRole("button", { name: "Send this screen" }).click(); await panel.getByText("Screen 2 captured").waitFor();
    // X3: back to a screen already captured: it says so, before anything is read for sending; nothing is sent.
    const rev2 = revision();
    await tab.goto(apr("apr-vv-s01-application.html"));
    await panel.getByText("Already captured: Application details").waitFor();
    await panel.getByRole("button", { name: "Capture this screen" }).click();
    await panel.getByText(/It is screen 1\. Nothing was sent/).waitFor();
    ok("C2.9: X3 fail case: a screen already captured says \"Already captured\" (screen 1); Capture opens no check and sends nothing", (await check.count()) === 0 && revision() === rev2);
    // X5: a screen that carries a client's detail is refused naming the question and the fix; nothing is sent.
    await tab.goto(apr("apr-vv-hostile-option.html"));
    await panel.getByText("New screen: Citizenship").waitFor();
    await panel.getByRole("button", { name: "Capture this screen" }).click();
    await panel.getByText(/^Refused: /).first().waitFor();
    const refusal = await panel.locator("main").innerText();
    ok("C2.9: X5 BR-3 fail case: a choice carrying a passport number is refused, naming the question (\"Country of citizenship\") and the fix; nothing sent",
      /Refused: "Country of citizenship" shows a passport-like code\./.test(refusal) && /Fix: open a blank application with no client's details/.test(refusal) && /Nothing was sent/.test(refusal) && (await check.count()) === 0 && revision() === rev2, refusal.slice(0, 300));
    await axe(panel, "panel: refused per question"); await shot(panel, "05-refused-question-360");
    for (const [file, n] of [["apr-vv-s03-marital.html", 3], ["apr-vv-s05-language.html", 4], ["apr-vv-s06-passport.html", 5]] as const) {
      await tab.goto(apr(file)); await panel.getByRole("button", { name: "Capture this screen" }).click(); await check.waitFor();
      await panel.getByRole("button", { name: "Send this screen" }).click(); await panel.getByText(`Screen ${n} captured`).waitFor();
    }
    // X6: the finish summary.
    await panel.getByRole("button", { name: "Finish capture" }).click();
    const summary = panel.getByRole("region", { name: "Capture summary" }); await summary.waitFor();
    const sum = await summary.innerText();
    const questions = Number(sql(`select sum(jsonb_array_length(s->'inputs')) from portal_capture, jsonb_array_elements(record->'screens') s where id='${started}'`));
    ok("C2.9: X6 BR-9 Finish shows the screens and questions captured, that a second person approves it, and the PDF form fields no captured question matches (the spouse branch)",
      new RegExp(`^5 screens captured · ${questions} questions`).test(sum) && /A second person approves it in the Studio before anything uses it/.test(sum) && /PDF form fields no captured question matches yet \(IMM 5257 \(09-2023\)\)/.test(sum) && /Marital status and spouse: \d+ of \d+ form fields/.test(sum), sum.slice(0, 500));
    ok("C2.9: review Major 1 a section partly asked says how much (\"x of y form fields\"), never \"not seen\": Personal details was captured", !/not seen/.test(sum) && /Personal details: \d+ of \d+ form fields|^(?![\s\S]*Personal details:)/.test(sum), sum.slice(0, 500));
    ok("C2.9: X6 the summary links to the capture in the Studio", (await summary.getByRole("link", { name: "Open it in the Studio" }).getAttribute("href")) === `http://127.0.0.1:${PORT}/review/capture/${started}`);
    ok("C2.9: BR-12 the sections listed carry plain labels, never a form path or key (BR-16)", !/Page\d|\.|_|canonical|person\./.test(sum.split("matches yet")[1]?.split("The rest belong")[0]?.split(/question[s]? on the captured screens/)[0] ?? ""), sum);
    await axe(panel, "panel: finish summary"); await shot(panel, "06-finish-summary-360");
    ok("C2.9: X6 the capture is held for a second person, as the summary says", sql(`select status from portal_capture where id='${started}'`) === "HELD");

    // Lead check Minor 1: a one-screen re-capture after the screen map is decided counts only its own screen's questions
    // that nobody has decided yet (here none), never the whole version's.
    await call("POST", `/captures/${started}/approve`, undefined, "user-C");
    const ed = sql(`select form_edition_id from portal_capture where id='${started}'`);
    await call("POST", `/online-versions/${ed}/screen-map/draft`);
    await call("POST", `/online-versions/${ed}/screen-map/accept`, {}, "user-C");
    for (const input of sql(`select data_path from form_field_map where form_edition_id='${ed}' and outcome='unresolved'`).split("\n").filter(Boolean))
      await call("PATCH", `/online-versions/${ed}/screen-map`, { input, notAFact: true, reason: "Sample: decided for this check" }, "user-C");
    ok("setup: the approved version's screen map is decided (nothing open)", !!ed && sql(`select count(*) from form_field_map where form_edition_id='${ed}' and outcome='unresolved'`) === "0");
    await panel.getByRole("button", { name: "Start another capture" }).click();
    await panel.getByLabel("Form code").fill("IMM 5257"); await panel.getByLabel("Title as the portal shows it").fill("Application for a visitor visa");
    await panel.getByRole("button", { name: "Start capture" }).click(); await panel.getByText("IMM 5257 · 0 screens captured").waitFor();
    await tab.goto(apr("apr-vv-s02-personal.html")); await panel.getByRole("button", { name: "Capture this screen" }).click(); await check.waitFor();
    await panel.getByRole("button", { name: "Send this screen" }).click(); await panel.getByText("Screen 1 captured").waitFor();
    await panel.getByRole("button", { name: "Finish capture" }).click(); await summary.waitFor();
    const again = await summary.innerText();
    ok("C2.9: Lead check Minor 1 fail case: a one-screen re-capture counts its own screen (1 screen, of the version's 5) and no question already decided on the screen map",
      /^1 screen captured · \d+ questions? \(the version holds 5 screens\)/.test(again) && !/not matched yet: a person maps/.test(again), again.slice(0, 400));
    const split = /Matched by the screens captured now: (\d+) form fields?; only by the screens kept from the approved version: (\d+)\./.exec(again);
    ok("C2.9: PR #36 review fail case: after a re-capture the sections are said to be worked out over the whole version (1 screen captured now, 4 kept), and the form fields matched now are kept apart from those only the kept screens match",
      /no question of the version matches yet \(IMM 5257 \(09-2023\); its 5 screens: 1 captured now, 4 kept from the approved version\)/.test(again) && !!split && Number(split[1]) > 0 && Number(split[2]) > 0, again.slice(0, 500));
  } finally {
    await ctx?.close(); server.kill(); rmSync(profile, { recursive: true, force: true });
  }
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`FAIL  the check stopped: ${String((e as Error)?.message ?? e).slice(0, 300)}`); console.error(e); process.exit(1); });
