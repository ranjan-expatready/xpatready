// W1-10 slice 1 channels on S5's Forms tab, walked like a person (plan-slice1-channels.md §5, §7; P-143, C-2, C-3, C-4):
// the "Filed as" picker offers only what IRCC accepts through the combination's IRCC account, each refused way greyed
// with its reason; the Signature column offers only the signatures that fit the way it is filed; a Not needed line
// stays visible, greyed, with the reason. axe (WCAG 2.2 AA) on every state, 1440 and 1024 px, and 200 % zoom (720 CSS px
// on a 1440 screen) without sideways page scroll. Sample data; the accepts records are test rows (set_by 'test'), as in
// check_forms_channels.ts. No model call, US$0.
//   zsh studio/tools/isolated.sh forms_chb 4473 start && node studio/tests/check_forms_channels_browser.cjs 4473 xr_studio_forms_chb
const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4473), DB = process.argv[3] ?? "xr_studio_forms_chb", BASE = `http://localhost:${PORT}`;
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let pass = 0, fail = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${(typeof detail === "string" ? detail : JSON.stringify(detail)).slice(0, 240)}` : ""}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" })).newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, data: init.data }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const axe = async (label) => { const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze(); step(`C1.6: axe (WCAG 2.2 AA): ${label}`, r.violations.length === 0, r.violations.map((v) => `${v.id}: ${v.nodes.length}`).join("; ")); };
  const sizes = async (label) => {
    for (const w of [1024, 720]) { await p.setViewportSize({ width: w, height: 900 }); await sleep(200);
      const sw = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      step(`C1.6: ${w === 720 ? "200 % zoom (720 CSS px)" : "1024 px"}: ${label} has no sideways page scroll`, sw <= 1, `${sw} px`); }
    await p.setViewportSize({ width: 1440, height: 900 }); await sleep(150);
  };
  const state = async (label) => { await axe(label); await sizes(label); };
  try {
    await p.goto(`${BASE}/`); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
    await api("/demo/load", { method: "POST" });
    // The sample's combination with form lines (all PDF upload): With an LMIA.
    const vv = sql("select id from combination where label='With an LMIA' limit 1"), ws = sql(`select workspace_id from combination where id='${vv}'`);
    const lines = (await api(`/combinations/${vv}/workspace?tab=forms`)).body?.lines ?? [];
    const pdfLine = lines.find((l) => l.code === "IMM 1295");
    step("set-up: the sample's With an LMIA has IMM 5707, IMM 5475 and IMM 1295 as PDF upload lines", ["IMM 5707", "IMM 5475", "IMM 1295"].every((c) => lines.find((l) => l.code === c)?.channel === "PDF_UPLOAD"), lines.map((l) => `${l.code}:${l.channel}`));
    // Test rows, Sample: through the IRCC secure account IMM 5707 is Online only; IMM 5475 is asked by the account
    // itself (Not needed, which is always an account's only record: the migration's database check).
    const ed = (code) => sql(`select e.id from form_edition e join gov_form_def d on d.id=e.gov_form_def_id where d.form_key='${code}' and e.channel='PDF' order by e.edition_label desc limit 1`);
    const accept = (code, channels) => sql(`insert into form_edition_accept (workspace_id, form_edition_id, account, channels, basis, quote, set_by) values ('${ws}', '${ed(code)}', 'IRCC_SECURE_ACCOUNT', '{${channels}}', 'PERSON_SAMPLE', 'Test line for the IRCC secure account', 'test') on conflict do nothing`);
    accept("IMM 5707", "ONLINE"); accept("IMM 5475", "NOT_NEEDED");
    await api(`/combinations/${vv}/forms/IMM 5707/channel`, { method: "PATCH", data: { channel: "ONLINE" } });
    await p.goto(`${BASE}/c/${vv}/forms`);
    const row = (code) => p.locator(`tr[data-line="${code}"]`);
    await row("IMM 5707").waitFor({ timeout: 30000 });
    const main = p.locator("main");
    // Review M2: the author sets the combination's IRCC account on the Forms tab (no raw API).
    const accountBox = main.getByRole("combobox", { name: "IRCC account this combination files through" });
    const portalOf = () => sql(`select coalesce(portal_key,'') from combination where id='${vv}'`);
    const waitPortal = async (want) => { for (let i = 0; i < 40 && portalOf() !== want; i++) await p.waitForTimeout(250); return portalOf(); };
    step("C1.6 Q1 pass: the Forms tab offers the IRCC account as a choice, 'Not set' first", await accountBox.count() === 1 && (await accountBox.inputValue()) === "" && (await accountBox.locator("option").count()) === 7);
    await accountBox.selectOption("IRCC_SECURE_ACCOUNT");
    step("C1.6 Q1 pass: picking the IRCC secure account on the screen saves it", (await waitPortal("IRCC_SECURE_ACCOUNT")) === "IRCC_SECURE_ACCOUNT", portalOf());
    await p.reload(); await row("IMM 5707").waitFor({ timeout: 30000 });
    const head = await main.locator("thead").innerText();
    step("C1.6 P-143: a Signature column beside 'Filed as by default'", /Filed as by default/.test(head) && /Signature/.test(head), head.replace(/\s+/g, " "));
    const filed = row("IMM 5707").getByRole("combobox", { name: "How IMM 5707 is filed" });
    const opts = await filed.locator("option").evaluateAll((os) => os.map((o) => ({ v: o.value, off: o.disabled, text: o.textContent, why: o.title })));
    const o = (v) => opts.find((x) => x.v === v) ?? {};
    step("C1.6 C-3 pass: the picker offers what the account accepts (Online); Not needed is greyed (the account does not ask it itself)", !o("ONLINE").off && o("NOT_NEEDED").off, opts);
    step("C1.6 C-3 fail: PDF upload and Paper stay in the list, greyed, saying IRCC does not accept them, the reason on each", o("PDF_UPLOAD").off && o("PAPER").off && /IRCC does not accept it/.test(o("PDF_UPLOAD").text) && /IRCC secure account|only as/i.test(o("PAPER").why), opts);
    const other = row(pdfLine.code).getByRole("combobox", { name: `How ${pdfLine.code} is filed` });
    const otherOpts = await other.locator("option").evaluateAll((os) => os.map((x) => ({ v: x.value, off: x.disabled })));
    step(`C1.6 C-3 pass: a form with no record for the account (${pdfLine.code}) offers Online, PDF upload and Paper (Sample), never Not needed`, ["ONLINE", "PDF_UPLOAD", "PAPER"].every((v) => !otherOpts.find((x) => x.v === v)?.off) && !!otherOpts.find((x) => x.v === "NOT_NEEDED")?.off, otherOpts);
    const sig = row(pdfLine.code).getByRole("combobox", { name: `How ${pdfLine.code} is signed` });
    const sigs = await sig.locator("option").evaluateAll((os) => os.map((x) => x.value));
    step("C1.6 C-2 pass: a PDF upload line offers only the signatures that fit (typed name, signed by hand and scanned, none), never pen", sigs.includes("HAND_SCANNED") && !sigs.includes("PEN"), sigs);
    await state("channels on the IRCC secure account");

    // Paper on the other line: its signature becomes pen, the only fit (C-2), shown as words, not a picker.
    await other.selectOption("PAPER"); await sleep(1200);
    const paperSig = (await row(pdfLine.code).locator("td").nth(5).innerText()).trim();
    step("C1.6 C-2 pass: once filed on Paper the line is signed in pen, the only fit (no choice offered)", /pen/i.test(paperSig) && await row(pdfLine.code).getByRole("combobox", { name: `How ${pdfLine.code} is signed` }).count() === 0, paperSig);
    const bad = await api(`/combinations/${vv}/forms/${encodeURIComponent(pdfLine.code)}/channel`, { method: "PATCH", data: { channel: "PAPER", signature: "NONE", from: "PAPER" } });
    step("C1.6 C-2 fail: Paper with no signature is refused in words", bad.status === 400 && /pen|sign/i.test(JSON.stringify(bad.body)), bad.body?.detail ?? bad.status);

    // Not needed: offered for IMM 5475 because this account's record says it asks the form itself (C-4).
    const nnPick = row("IMM 5475").getByRole("combobox", { name: "How IMM 5475 is filed" });
    const nnOpts = await nnPick.locator("option").evaluateAll((os) => os.map((x) => ({ v: x.value, off: x.disabled })));
    step("C1.6 C-4 pass: IMM 5475's picker offers Not needed (the account asks it itself); Online and Paper are greyed", !nnOpts.find((x) => x.v === "NOT_NEEDED")?.off && !!nnOpts.find((x) => x.v === "ONLINE")?.off && !!nnOpts.find((x) => x.v === "PAPER")?.off, nnOpts);
    await nnPick.selectOption("NOT_NEEDED"); await sleep(1200);
    const nn = row("IMM 5475");
    const chOf = (code) => sql(`select cf.channel from combination_form cf join gov_form_def d on d.id=cf.gov_form_def_id where cf.combination_id='${vv}' and d.form_key='${code}' and cf.status='DRAFT'`);
    step("C1.6 C-4 pass: Not needed is saved for IMM 5475", chOf("IMM 5475") === "NOT_NEEDED", chOf("IMM 5475"));
    step("C1.6 C-4: the Not needed line stays visible, greyed, with the reason, and is not signed", await nn.count() === 1 && (await nn.getAttribute("data-line-not-needed")) !== null && await nn.evaluate((e) => /text-text-muted/.test(e.className)) && await nn.locator("[data-not-needed]").count() === 1 && /No signature|none/i.test(await nn.locator("td").nth(5).innerText()), (await nn.innerText()).replace(/\s+/g, " ").slice(0, 200));
    await state("a Not needed line");

    // Fail: another account's record never applies. Moved to the PR Portal, Not needed has no record there: an error in words.
    // Break M3 fail: a save from an account the person no longer sees is refused (409) and leaves the account as it is.
    const stale = await api(`/combinations/${vv}/account`, { method: "PATCH", data: { account: "PR_PORTAL", from: null } });
    step("C1.6 Q1 fail: a stale account save (from 'not set') is refused in words and nothing changes", stale.status === 409 && /was changed to IRCC secure account while you were choosing/.test(JSON.stringify(stale.body)) && portalOf() === "IRCC_SECURE_ACCOUNT", stale.body?.detail ?? stale.status);
    await accountBox.selectOption("PR_PORTAL");
    const moved = { status: (await waitPortal("PR_PORTAL")) === "PR_PORTAL" ? 200 : 0 };
    await p.reload(); await row("IMM 5475").waitFor({ timeout: 30000 });
    const nnNote = (await row("IMM 5475").locator("[role=note]").allInnerTexts()).join(" ");
    step("C1.6 C-4 fail: on an account with no record that it asks the form itself, the Not needed line says why it cannot stay (never changed silently)", moved.status === 200 && /Not needed/.test(nnNote) && chOf("IMM 5475") === "NOT_NEEDED", nnNote || moved.status);
    const refuse = await api(`/combinations/${vv}/forms/${encodeURIComponent(pdfLine.code)}/channel`, { method: "PATCH", data: { channel: "NOT_NEEDED", from: "PAPER" } });
    step("C1.6 C-4 fail: Not needed with no record for the account is refused on save", refuse.status === 400 && /Not needed/.test(JSON.stringify(refuse.body)), refuse.body?.detail ?? refuse.status);
    await state("Not needed on an account without its record");
    step("C1.6: no script error on any state", errs.length === 0, errs.join(" | "));
  } catch (e) { step("the walk finished", false, e.stack ?? String(e)); }
  finally {
    try { sql("delete from form_edition_accept where set_by='test'"); } catch { /* the copy is dropped at its next start */ }
    await b.close();
    console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
  }
})();
