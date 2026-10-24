// qa lane, /qa after-merge on 1cb174a6: the forms decisions on Screen 01 walked as people would (C1.6 channel per line,
// C1.7 portal, C2.7 add an online form, C2.10 what drafting reads), in a real browser on an isolated copy with sample
// inputs loaded (loading is not under test, P-33). Portal pages are the forms lane's Sample fixtures, never IRCC screens.
// No model call. Run on a FRESH copy:
//   zsh studio/tools/isolated.sh qa_walk 4471 start && curl -X POST -H 'x-actor: user-A' localhost:4471/api/demo/load
//   QA_HEADED=1 node studio/tests/qa/check_qa_s01_channels.cjs http://localhost:4471 xr_studio_qa_walk
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../../node_modules/playwright");
const AxeBuilder = require("../../node_modules/@axe-core/playwright").default;
const BASE = process.argv[2] ?? "http://localhost:4471", DB = process.argv[3] ?? "xr_studio_qa_walk";
const FIX = path.join(__dirname, "..", "fixtures", "portal");
const OUT = path.join(__dirname, "..", "..", "..", "..", "product", "qa", "reports", `${new Date().toISOString().slice(0, 10)}-${process.env.QA_MODE ?? "after-merge"}`); fs.mkdirSync(OUT, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const log = []; const step = (name, ok, detail) => { log.push({ name, ok: ok === null ? null : !!ok, detail: detail === undefined ? undefined : String(detail).slice(0, 400) }); console.log(`${ok === null ? "NOTE" : ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 240)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: process.env.QA_HEADED !== "1", slowMo: process.env.QA_HEADED === "1" ? 80 : 0 });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  const idle = async () => { await p.waitForLoadState("networkidle").catch(() => {}); await p.waitForTimeout(200); };
  const main = async () => (await p.innerText("main")).replace(/\s+/g, " ");
  const as = async (id) => { await p.getByLabel("Simulated person").selectOption(id); await idle(); };
  const api = async (pth, method = "GET", data, actor = "user-A") => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, data }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const axe = async () => (await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations.map((v) => `${v.id}(${v.nodes.length})`);
  const wp = sql("select id from combination where combination_key='wp.family'");
  const go = async (u) => { await p.goto(`${BASE}${u}`); await idle(); };
  try {
    // ------------------------------------------------ C1.7 portal and C1.6 channel as the author
    await go(`/c/${wp}`);
    await p.locator("main select[id^='portal-']").first().selectOption("ircc_portal"); await idle();
    await p.getByText(/\b1 draft change\b/).first().waitFor({ timeout: 15000 }).catch(() => {});
    await p.getByLabel("How IMM 1295 is filed").selectOption("ONLINE"); await idle();
    await p.getByText(/Filing: Mixed/).first().waitFor({ timeout: 15000 }).catch(() => {});
    let t = await main();
    step("C1.7 the author picks the portal; C1.6 IMM 1295 set to Online; filing reads 'Mixed: online and PDF'", /Filing: Mixed: online and PDF/.test(t), t.match(/Filing: [^P]*/)?.[0]);
    step("C1.6 an Online line with no approved online version 'Blocks release' and says how to fix it", /Blocks release IMM 1295 is filed Online, but the library has no approved online version/.test(t));
    step("C1.6/C1.7 both are draft changes the review will show", /\b2 draft changes\b/.test(t), t.match(/\d+ draft changes?/)?.[0]);
    step("axe: combination page with channels", !(await axe()).length, (await axe()).join(" ") || "clean");
    // ------------------------------------------------ C2.7 add an online form
    const panel = async () => { await p.getByRole("button", { name: "Add an online form" }).click(); await p.getByRole("dialog").waitFor(); };
    await panel();
    const dlg = p.getByRole("dialog");
    step("C2.7 the panel pre-fills this combination's portal and the Online line's form code", (await dlg.getByRole("combobox", { name: "Portal" }).inputValue()) === "ircc_portal" && /IMM 1295/.test(await dlg.getByLabel("Form code").inputValue()), await dlg.getByLabel("Form code").inputValue());
    await dlg.getByLabel("Form code").fill("imm 1295");
    await dlg.getByLabel("Title as the portal shows it").fill("Application for a work permit (Sample)");
    await dlg.getByLabel("Choose blank screens").setInputFiles(path.join(FIX, "imm5257-online-s1-personal-with-answers.html"));
    await dlg.getByRole("button", { name: /Add and send for approval/ }).click(); await idle(); await p.waitForTimeout(1500);
    t = (await dlg.innerText()).replace(/\s+/g, " ");
    step("C2.7 a lower-case code in the panel ('imm 1295') is accepted or explained on the field (QA-15)", !/A form code in capitals/.test(t) || /Form code[^.]*capitals/.test(t), (t.match(/[^.]*capitals[^.]*\./) ?? ["no code message"])[0]);
    await dlg.getByLabel("Form code").fill("IMM 1295");
    await dlg.getByRole("button", { name: /Add and send for approval/ }).click(); await idle(); await p.waitForTimeout(2000);
    t = (await dlg.innerText()).replace(/\s+/g, " ");
    const open = sql("select count(*) from portal_capture where status in ('OPEN','RETURNED')");
    step("C2.7 a screen holding an answer is refused, nothing kept, no half-made capture left open", /nothing was kept|Refused/.test(t) && open === "0", `${open} open; ${(t.match(/(Refused|nothing was kept)[^.]*\./) ?? [""])[0].slice(0, 160)}`);
    await p.screenshot({ path: path.join(OUT, "C2.7-refused.png") });
    await dlg.getByLabel("Choose blank screens").setInputFiles(["imm5257-online-s1-personal.html", "imm5257-online-s2-marital.html", "imm5257-online-s3-language.html"].map((f) => path.join(FIX, f)));
    await dlg.getByRole("button", { name: /Add and send for approval/ }).click();
    await dlg.getByText(/Awaiting a second person/).first().waitFor({ timeout: 60000 }).catch(() => {});
    await dlg.getByRole("button", { name: "Close" }).first().click().catch(() => {});
    await p.locator("[data-online-forms]").getByText(/Awaiting a second person/).first().waitFor({ timeout: 15000 }).catch(() => {});
    t = (await p.locator("[data-online-forms]").textContent().catch(() => "")).replace(/\s+/g, " ");
    step("C2.7 blank screens are captured; after closing the panel the combination lists the form 'Awaiting a second person'", /IMM 1295.*Awaiting a second person/.test(t), t.slice(0, 160));
    await p.screenshot({ path: path.join(OUT, "C2.7-awaiting.png"), fullPage: true });
    const cap = sql("select id from portal_capture where status='HELD' order by created_at desc limit 1");
    let r = await api(`/captures/${cap}/approve`, "POST", undefined, "user-A");
    step("C2.7 the author who captured it cannot approve (server)", r.status === 403, r.body?.detail);
    r = await api(`/captures/${cap}/approve`, "POST", undefined, "user-C");
    step("C2.7 a second person approves (review screen is Screen 02: by API)", r.status < 300, r.body?.status ?? r.body?.detail);
    await go(`/c/${wp}`); t = await main();
    step("C2.7 after approval the page no longer says 'Awaiting'; the Online line's problem changes to the next step", !/Awaiting a second person/.test(t), (t.match(/Blocks release[^.]*\./) ?? ["no blocking line"])[0].slice(0, 200));
    // ------------------------------------------------ C2.10 what drafting reads
    await go(`/c/${wp}/sources`);
    const sel = p.getByLabel("What drafting reads for IMM 1295");
    step("C2.10 the Sources tab says what drafting reads for each form, 'PDF first (default)'", (await sel.count()) === 1 && /PDF first/.test(await sel.locator("option:checked").innerText()), await sel.count() ? await sel.locator("option:checked").innerText() : "no choice shown");
    if (await sel.count()) { const opts = await sel.locator("option").allInnerTexts(); await sel.selectOption({ label: opts.find((o) => /Online screens only/.test(o)) }); await idle(); }
    step("C2.10 the author changes it to 'Online screens only'; stored on the library form", sql("select draft_from from gov_form_def where form_key='IMM 1295'") !== "" && !/PDF/.test(sql("select coalesce(draft_from,'') from gov_form_def where form_key='IMM 1295'")), sql("select coalesce(draft_from,'(null)') from gov_form_def where form_key='IMM 1295'"));
    step("axe: sources tab", !(await axe()).length, (await axe()).join(" ") || "clean");
    await as("user-B");
    step("C2.10 the approver sees the choice read-only (no select)", (await p.getByLabel("What drafting reads for IMM 1295").count()) === 0 || await p.getByLabel("What drafting reads for IMM 1295").isDisabled());
    await go(`/c/${wp}`);
    step("C1.6 the approver cannot change how a form is filed", (await p.getByLabel("How IMM 1295 is filed").count()) === 0 || await p.getByLabel("How IMM 1295 is filed").isDisabled());
    await as("user-A");
    for (const w of [1024, 400]) { await p.setViewportSize({ width: w, height: 900 }); await go(`/c/${wp}`); const sw = await p.evaluate(() => document.documentElement.scrollWidth); step(`${w} px: combination page with channels has no sideways scroll`, sw <= w + 1, `page ${sw} px wide`); await p.screenshot({ path: path.join(OUT, `C1.6-${w}px.png`) }); }
  } catch (e) { step("journey stopped", false, e.message.split("\n")[0]); }
  step("no page errors", !errs.length, errs.slice(0, 2).join(" | ") || "none");
  fs.writeFileSync(path.join(OUT, "s01-channels-log.json"), JSON.stringify(log, null, 2));
  const fails = log.filter((x) => x.ok === false).length;
  console.log(`\n${log.filter((x) => x.ok).length} pass, ${fails} fail`);
  await b.close(); process.exit(fails ? 1 : 0);
})();
