// C6.16 Adult privacy and "Send to …" (screens lane, B138; concept §4 layout, BR-3..BR-8): the journey by screens on a
// fresh Visitor visa case. Client A (390 px) answers one of Partner's questions, presses "Send to Sample Partner…" under
// "About Sample Partner", sends; Partner (390 px, a separate browser, no simulated person) opens the link from the demo
// inbox (stand-in SI-20): the token leaves the address bar, "Send me a code", a wrong code (error summary), the right
// code, the consent card (Unconfirmed: no counsel), their own parts, and Confirm on Client A's answer. Client A then
// sees progress only, never Partner's answer. The case officer (1440 px) reads "Own links and privacy" and takes the link
// back with a reason; Partner's page then says why. axe-core (WCAG 2.2 A/AA) on each screen; no sideways scroll; every
// wait fails loudly. Sets up Visitor visa itself on an empty copy. Screenshots only with a third argument (a folder),
// so a suite run never rewrites them. Sample data, no live AI, US$0.
//   zsh studio/tools/isolated.sh sc_c616 4447 start && node studio/tests/check_c616_privacy_browser.cjs 4447 xr_studio_sc_c616
const fs = require("node:fs");
const { join } = require("node:path");
const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = process.argv[2] ?? "4447", DB = process.argv[3] ?? "xr_studio_sc_c616", SHOTS = process.argv[4] ?? null, BASE = `http://localhost:${PORT}`;
const STUDIO = join(__dirname, "..");
const results = [];
const ok = (name, pass, detail = "") => { results.push(pass); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${pass || detail === "" ? "" : ` — ${typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 400)}`}`); };
const T = { timeout: 20000 };
const call = async (method, path, body, actor = "user-O") => { const r = await fetch(`${BASE}/api${path}`, { method, headers: { ...(actor ? { "x-actor": actor } : {}), "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) }); return { status: r.status, body: await r.json().catch(() => null) }; };
const shot = async (p, name) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await p.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true }); } };
const yearsAgo = (y) => { const d = new Date(); d.setUTCFullYear(d.getUTCFullYear() - y); return d.toISOString().slice(0, 10); };
const run = Date.now().toString(36), ADDRESS = `partner.${run}@example.com`;

(async () => {
  // Visitor visa released on this copy (the runtime lane's own setup), then a fresh case: Client A, Partner, a child of 19, a child of 10.
  const vvReleased = async () => ((await call("GET", "/runtime/openable")).body ?? []).find((r) => /Visitor visa/.test(r.combination) && r.startable);
  if (!(await vvReleased())) execFileSync(join(STUDIO, "node_modules", ".bin", "tsx"), ["--tsconfig", join(STUDIO, "api", "tsconfig.json"), join(STUDIO, "tests", "runtime", "setup_visitor_visa.ts"), PORT, DB], { stdio: "ignore", timeout: 180000 });
  const vv = await vvReleased();
  if (!vv) { console.error("STOP  Visitor visa is not released on this copy"); process.exit(2); }
  const c = await call("POST", "/runtime/cases", { combinationId: vv.combination_id, reference: `C616-${run}`, clientActor: "user-P", principal: { displayName: "Sample Client A" } });
  const id = c.body?.id;
  const add = async (role, displayName) => (await call("POST", `/runtime/cases/${id}/people`, { role, displayName })).body?.subject_id;
  const S = await add("spouse_or_partner", "Sample Partner"), C19 = await add("child", "Sample Child 19"), C10 = await add("child", "Sample Child 10");
  const P = c.body?.people?.find((x) => x.role === "principal")?.subject_id;
  for (const [subject, dob] of [[P, yearsAgo(40)], [S, yearsAgo(38)], [C19, yearsAgo(19)], [C10, yearsAgo(10)]]) await call("PUT", `/runtime/cases/${id}/answers/${subject}/person.date_of_birth`, { value: dob, expectedId: null });
  const sqr = (await call("GET", `/runtime/cases/${id}/questionnaire`, undefined, "user-P")).body;
  const pq = (sqr?.sections ?? []).flatMap((s) => s.questions).find((q) => q.subjectId === S && !q.answer && !q.group && !q.hidden && q.value_type === "text");
  const byA = pq ? await call("PUT", `/runtime/cases/${id}/answers/${S}/${pq.fact}`, { value: "SAMPLE-BY-CLIENT-A", expectedId: null }, "user-P") : { status: 0 };
  ok("C6.16 walk setup: a fresh case with Client A, Partner, a child of 19 and a child of 10; Client A answered one of Partner's questions", !!id && !!S && !!C19 && !!C10 && byA.status === 200, { case: c.status, byA: byA.status });

  const browser = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const errors = [];
  const axe = async (p, name) => {
    const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    ok(`C6.16 axe: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
  };
  const noSideways = async (p, name) => ok(`C6.16: ${name} has no sideways scroll`, await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  try {
    // ---- Client A, 390 px: Send to Sample Partner… under "About Sample Partner".
    const principal = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
    await principal.addInitScript(() => { localStorage.setItem("xr-actor", "user-P"); });
    const a = await principal.newPage(); a.on("pageerror", (e) => errors.push(e.message));
    await a.goto(`${BASE}/cases/${id}/questionnaire`);
    const about = a.locator("section", { has: a.getByRole("heading", { name: "About Sample Partner" }) });
    await about.getByRole("button", { name: "Send to Sample Partner…" }).waitFor(T);
    ok("C6.16 principal: under \"About Sample Partner\" a Send to Sample Partner… button; none under the child of 10", await about.getByRole("button", { name: "Send to Sample Partner…" }).isVisible() && await a.getByRole("button", { name: /Send to Sample Child 10/ }).count() === 0 && await a.getByRole("button", { name: "Send to Sample Child 19…" }).count() === 1);
    await shot(a, "01-principal-send-390"); await axe(a, "the principal's questionnaire with Send to …"); await noSideways(a, "the principal's questionnaire at 390 px");
    await about.getByRole("button", { name: "Send to Sample Partner…" }).click();
    const dlg = a.getByRole("dialog");
    await dlg.getByText("Sample Partner gets a link and a code by email. Once they open it, you will see how far they have got, not their answers.").waitFor(T);
    await dlg.getByRole("button", { name: "Send to Sample Partner" }).click();
    await dlg.getByText("Enter their email address.").waitFor(T);
    ok("C6.16 principal: Send with no address says what to do on the field", true);
    await dlg.getByLabel("Sample Partner's email").fill(ADDRESS);
    await shot(a, "02-send-dialog-390"); await axe(a, "the Send to dialog");
    await dlg.getByRole("button", { name: "Send to Sample Partner" }).click();
    await about.locator("[data-link-sent]").waitFor(T);
    const sentText = await about.locator("[data-link-sent]").innerText();
    ok("C6.16 principal: the line says sent to the masked address, not opened yet, with Resend and Take back", /Sent to p•••@example\.com on/.test(sentText) && /has not opened it yet; you can still answer/.test(sentText) && /Resend/.test(sentText) && /Take back/.test(sentText), sentText);
    await shot(a, "03-principal-sent-390");

    // ---- Partner, 390 px: a separate browser with no simulated person.
    const adult = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
    const b = await adult.newPage(); b.on("pageerror", (e) => errors.push(e.message));
    const actorHeaders = []; b.on("request", (r) => { if (r.url().includes("/api/link/") && r.headers()["x-actor"]) actorHeaders.push(r.url()); });
    await b.goto(`${BASE}/inbox?address=${encodeURIComponent(ADDRESS)}`);
    await b.getByRole("link", { name: "Open your link" }).waitFor(T);
    await shot(b, "04-demo-inbox-390");
    await b.getByRole("link", { name: "Open your link" }).click();
    await b.getByRole("heading", { name: "Check it's you" }).waitFor(T);
    ok("C6.16 adult: the token leaves the address bar at once; opening the link sent no code", !b.url().includes("#t=") && /\/link$/.test(b.url()) && !((await call("GET", `/demo/inbox?address=${encodeURIComponent(ADDRESS)}`, undefined, null)).body?.messages ?? []).some((m) => m.kind === "code"), b.url());
    await shot(b, "05-link-check-390"); await axe(b, "the link's Check it's you page"); await noSideways(b, "the link page at 390 px");
    await b.getByRole("button", { name: "Send me a code" }).click();
    await b.getByLabel("Code (required)").waitFor(T);
    const code = /code is (\d{3}) (\d{3})/.exec(((await call("GET", `/demo/inbox?address=${encodeURIComponent(ADDRESS)}`, undefined, null)).body?.messages ?? []).find((m) => m.kind === "code")?.body ?? "")?.slice(1).join("") ?? "";
    await b.getByLabel("Code (required)").fill(code === "000000" ? "111111" : "000000");
    await b.getByRole("button", { name: "Continue" }).click();
    await b.getByText("There is a problem").waitFor(T);
    ok("C6.16 adult: a wrong code shows \"There is a problem\" with tries left, on the field too", (await b.getByText("That code is not right. You have 4 tries left.").count()) === 2);
    await shot(b, "06-link-wrong-code-390"); await axe(b, "the wrong-code state");
    await b.getByLabel("Code (required)").fill(`${code.slice(0, 3)} ${code.slice(3)}`);
    await b.getByRole("button", { name: "Continue" }).click();
    await b.getByRole("heading", { name: "Before you start" }).waitFor(T);
    ok("C6.16 adult: the consent card says who sees what, marked Unconfirmed: no counsel", await b.getByText("Your answers go to the firm handling this application. The person who started it will see how far you have got, not your answers. The firm can change this.").isVisible() && await b.getByText("Unconfirmed: no counsel").isVisible());
    await shot(b, "07-consent-390"); await axe(b, "the consent card");
    await b.getByRole("button", { name: "Continue to my questions" }).click();
    await b.getByRole("heading", { name: "Your questions" }).waitFor(T);
    const own = await b.locator("main").innerText();
    ok("C6.16 adult: their own parts only (About you), and the application's answers read-only; nobody else's", /About you/.test(own) && /About the application/.test(own) && !/Sample Client A|Sample Child/.test(own), own.slice(0, 300));
    await shot(b, "08-adult-overview-390"); await axe(b, "the adult's own questions"); await noSideways(b, "the adult's questions at 390 px");
    const part = (sqr?.sections ?? []).find((s) => s.subjectId === S && s.questions.some((q) => q.fact === pq?.fact));
    await b.getByRole("button", { name: new RegExp(`^${part?.title}`) }).first().click();
    const confirmBtn = b.getByRole("button", { name: `Confirm: ${pq?.label}` });
    await confirmBtn.waitFor(T);
    ok("C6.16 adult: Client A's earlier answer says who gave it, with Confirm", await b.getByText("Answered by Client A. Keep it as your answer, or change it above.").isVisible());
    await shot(b, "09-adult-confirm-390"); await axe(b, "a part with Confirm");
    await confirmBtn.click();
    await b.getByText("Confirmed: it is now your own answer.").waitFor(T);
    ok("C6.16 adult: Confirm makes it their own answer (own link)", (await call("GET", `/runtime/cases/${id}/questionnaire?mode=agent`)).body?.sections?.flatMap((s) => s.questions).find((q) => q.subjectId === S && q.fact === pq?.fact)?.answer?.channel === "own_link");
    ok("C6.16 adult: no call on the link ever carried a simulated person (x-actor)", actorHeaders.length === 0, actorHeaders);

    // ---- Client A again: progress only.
    await a.reload();
    await about.locator("[data-private-progress]").waitFor(T);
    const prog = await about.innerText();
    ok("C6.16 principal: Sample Partner shows progress only (parts done of parts asked), never the answers", /Sample Partner is answering on their own link/.test(prog) && /\d+ of \d+ parts? done/.test(prog) && /private to them and the firm/.test(prog) && !(await a.locator("main").innerText()).includes("SAMPLE-BY-CLIENT-A"), prog);
    await shot(a, "10-principal-progress-390"); await axe(a, "the principal's progress-only card");

    // ---- Case officer, 1440 px: Own links and privacy; take back with a reason.
    const staff = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    await staff.addInitScript(() => { localStorage.setItem("xr-actor", "user-O"); });
    const o = await staff.newPage(); o.on("pageerror", (e) => errors.push(e.message));
    await o.goto(`${BASE}/cases/${id}`);
    const panel = o.locator("section", { has: o.getByRole("heading", { name: "Own links and privacy" }) });
    await panel.locator(`[data-person="${S}"]`).waitFor(T);
    const row = await panel.locator(`[data-person="${S}"]`).innerText();
    ok("C6.16 officer: Partner's row says private from Client A and what the code proves (address given by Client A)", /With Sample Partner since .* · private from Client A · answered on the link sent to p•••@example\.com \(address given by Client A\)/.test(row) && /parts? done/.test(row), row);
    ok("C6.16 officer: the child of 10 has no Send and says why; the child of 19 has Send… and Keep private…", /under 18/.test(await panel.locator(`[data-person="${C10}"]`).innerText()) && await panel.locator(`[data-person="${C10}"]`).getByRole("button").count() === 0 && await panel.locator(`[data-person="${C19}"]`).getByRole("button", { name: "Keep private…" }).count() === 1);
    await panel.scrollIntoViewIfNeeded(); await shot(o, "11-officer-people-1440"); await axe(o, "the officer's case page with Own links and privacy"); await noSideways(o, "the officer's case page at 1440 px");
    await panel.locator(`[data-person="${S}"]`).getByRole("button", { name: "Take back…" }).click();
    const tdlg = o.getByRole("dialog");
    await tdlg.getByText("Sample Partner's link stops working now. Their answers stay private.").waitFor(T);
    await tdlg.getByRole("button", { name: "Take back" }).click();
    await tdlg.getByText("Say why the link is taken back (at least 5 characters).").first().waitFor(T);
    ok("C6.16 officer: Take back without a reason is refused on the field", true);
    await tdlg.getByLabel("Why (kept in the case history)").fill("Partner asked the firm (Sample)");
    await shot(o, "12-officer-take-back-1440"); await axe(o, "the Take back dialog");
    await tdlg.getByRole("button", { name: "Take back" }).click();
    await panel.locator(`[data-person="${S}"]`).getByText(/Taken back .* · still private from Client A/).waitFor(T);
    ok("C6.16 officer: the row now reads Taken back · still private", true);

    // ---- Partner's page after take back: says why, naming no person.
    await b.goto(`${BASE}/link`);
    await b.getByRole("heading", { name: "This link no longer works" }).waitFor(T);
    const deadText = await b.locator("main").innerText();
    ok("C6.16 adult: after take back the page says why, naming no person", /This link was taken back on .*Ask whoever sent it for a new one\./.test(deadText) && !/Client A|Partner|officer/i.test(deadText.replace(/no longer works/, "")), deadText);
    await shot(b, "13-link-taken-back-390"); await axe(b, "the dead-link page");
    ok("C6.16: no page error", errors.length === 0, errors);
  } catch (e) { ok(`C6.16 walk ran to its end (stopped: ${e.message.split("\n")[0]})`, false); }
  await browser.close();
  const failed = results.filter((x) => !x).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
})();
