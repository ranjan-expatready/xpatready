// C1.6 forms channel slice (P-61, P-62, P-143, P-208): the Programs row (card and List) shows each form's channel, an
// Online line with its portal (the combination's IRCC account), next to the filing method tag; the combination page's
// Forms tab says which portal an Online line is typed into, or that none is set. No decision ids on these screens
// (QA-134). Walked in a real browser on the demo data (Reset to the six), 1440 px and 400 px, axe (WCAG 2.2 AA). The
// channel values set here are Sample (test input, the author's own choices through the API), never IRCC's word.
// No model call (US$0).
//   zsh studio/tools/isolated.sh forms_c16p 4452 start && node studio/tests/check_c16_portal_browser.cjs 4452 [screenshot folder]
const fs = require("node:fs");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4452), BASE = `http://localhost:${PORT}`, OUT = process.argv[3] ?? null;
if (PORT === 4400) { console.log("refused: :4400 is the demo, never used for tests"); process.exit(2); }
if (OUT) fs.mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail !== undefined ? ` — ${(typeof detail === "string" ? detail : JSON.stringify(detail)).slice(0, 300)}` : ""}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const LEAKS = /\(P-\d{2,3}[^)]*\)|\bP-\d{2,3}\b|IRCC_SECURE_ACCOUNT|PDF_UPLOAD|NOT_NEEDED/;

(async () => {
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" || !fs.existsSync("/opt/pw-browsers/chromium") ? { channel: "chrome" } : { executablePath: "/opt/pw-browsers/chromium" }) });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, data: init.data }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const shot = async (name) => { if (OUT) await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: true }); };
  const groupsOf = async (scope) => scope.locator("[data-form-channels] li").evaluateAll((ls) => ls.map((l) => ({ channel: l.dataset.channel, text: l.textContent.trim(), title: l.title })));
  try {
    await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
    const six = await api("/demo/reset-to-six", { method: "POST", data: { confirm: "RESET" } });
    if (six.status >= 300) { step("setup: Reset to the six", false, six); throw new Error("no demo data"); }
    const rows = (await api("/catalogue?pathway=INDIVIDUAL&filter=all")).body.rows.filter((r) => r.combinationId);
    const vv = rows.find((r) => r.label === "Visitor visa"), empty = rows.find((r) => !r.forms.some((f) => f.channel));
    if (!vv || !vv.forms.some((f) => f.channel === "PDF_UPLOAD")) { step("setup: Visitor visa has PDF upload lines after Reset to the six", false, vv?.forms); throw new Error("no lines"); }
    const filed = vv.forms.filter((f) => !f.document && f.channel);
    // The catalogue carries the combination's IRCC account for the row (null on the six: not set).
    step("C1.6 pass: the Programs row data carries the IRCC account (not set on the six)", "account" in vv && vv.account === null, vv.account);

    // ── Programs card: every filed form under its channel, PDF only.
    const card = () => p.locator(`article[data-label="Visitor visa"]`);
    await p.goto(`${BASE}/?f=all&v=cards`); await card().waitFor({ timeout: 20000 });
    let g = await groupsOf(card());
    step("C1.6 pass: the Visitor visa card names each form's channel: one group 'PDF upload' with every filed form", g.length === 1 && g[0].channel === "PDF_UPLOAD" && filed.every((f) => g[0].title.includes(f.code)) && /^PDF upload: /.test(g[0].title), g);
    step("C1.6 fail case: a combination with no form lines shows no channels on its card", !empty || (await p.locator(`article[data-label="${empty.label}"] [data-form-channels]`).count()) === 0, empty?.label);

    // ── The author files the family form online through the IRCC secure account (Sample, test input).
    const id = vv.combinationId, fam = filed.find((f) => f.code === "IMM 5645") ?? filed[filed.length - 1];
    const acc = await api(`/combinations/${id}/account`, { method: "PATCH", data: { account: "IRCC_SECURE_ACCOUNT", from: null } });
    const on = await api(`/combinations/${id}/forms/${encodeURIComponent(fam.code)}/channel`, { method: "PATCH", data: { channel: "ONLINE", from: "PDF_UPLOAD" } });
    step("setup: the account is set and one line is filed Online (API, as the author)", acc.status < 300 && on.status === 200, [acc.status, on.status, on.body?.detail]);
    await p.goto(`${BASE}/?f=all&v=cards`); await card().waitFor({ timeout: 20000 }); await sleep(300);
    g = await groupsOf(card());
    const online = g.find((x) => x.channel === "ONLINE");
    step("C1.6 pass: the card's Online group names its portal: 'Online · IRCC secure account: <form>'", !!online && online.title === `Online · IRCC secure account: ${fam.code}`, g);
    step("C1.6 pass: the PDF upload group no longer lists that form", !!g.find((x) => x.channel === "PDF_UPLOAD") && !g.find((x) => x.channel === "PDF_UPLOAD").title.includes(fam.code), g);
    const tag = await card().locator("[data-filing-tag]").getAttribute("data-filing-tag");
    step("C1.6 pass (P-208): the filing tag says Mixed beside the channels", tag === "Mixed", tag);
    const cardText = (await card().innerText()).replace(/\s+/g, " ");
    step("C1.6 PRODUCT §4: the card shows no decision ids or system names", !LEAKS.test(cardText), cardText.match(LEAKS)?.[0]);
    await shot("c16-programs-card-mixed-1440");

    // ── List view: the same row, the tag and the channels.
    await p.goto(`${BASE}/?f=all&v=list`); const lr = p.locator(`[role=row][data-label="Visitor visa"]`); await lr.waitFor({ timeout: 20000 });
    const lg = await groupsOf(lr);
    step("C1.6 pass: the List row shows the filing tag and each form's channel, Online with its portal", (await lr.locator("[data-filing-tag]").getAttribute("data-filing-tag")) === "Mixed" && lg.some((x) => x.title === `Online · IRCC secure account: ${fam.code}`) && lg.some((x) => x.channel === "PDF_UPLOAD"), lg);
    const ax = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    step("C1.6: axe on the Programs List is clean", ax.violations.length === 0, ax.violations.map((v) => `${v.id}: ${v.nodes.length}`).join("; "));
    await shot("c16-programs-list-mixed-1440");

    // ── Combination page, Forms tab: the Online line says which portal it is typed into.
    await p.goto(`${BASE}/c/${id}/forms`); const line = p.locator(`tr[data-line="${fam.code}"]`); await line.waitFor({ timeout: 30000 });
    const words = (await line.locator("[data-online-words]").innerText()).trim();
    step("C1.6 pass: the Forms tab's Online line says 'Typed into the IRCC secure account from the answer sheet'", /^Typed into the IRCC secure account from the answer sheet/.test(words), words);
    const head = (await p.locator("[data-filing]").first().innerText()).replace(/\s+/g, " ");
    step("C1.6 pass: the combination page names the filing method (Mixed: online and PDF)", /Filing: Mixed: online and PDF/.test(head), head);
    const mainText = (await p.locator("main").innerText()).replace(/\s+/g, " ");
    step("C1.6 PRODUCT §4: the Forms tab shows no decision ids or system names", !LEAKS.test(mainText), mainText.match(LEAKS)?.[0]);
    await shot("c16-forms-tab-online-portal-1440");

    // ── Fail case: the account taken away, the Online line says no portal is set, on the card and on the line.
    const un = await api(`/combinations/${id}/account`, { method: "PATCH", data: { account: null, from: "IRCC_SECURE_ACCOUNT" } });
    await p.reload(); await line.waitFor({ timeout: 30000 }); await sleep(300);
    const words2 = (await line.locator("[data-online-words]").innerText()).trim();
    step("C1.6 fail case: with no IRCC account the Online line says so ('IRCC account not set'), never a portal", un.status < 300 && /^IRCC account not set/.test(words2) && !/secure account/.test(words2), words2);
    await p.goto(`${BASE}/?f=all&v=cards`); await card().waitFor({ timeout: 20000 }); await sleep(300);
    const g2 = await groupsOf(card());
    step("C1.6 fail case: the card's Online group says 'Online · IRCC account not set'", g2.some((x) => x.title === `Online · IRCC account not set: ${fam.code}`), g2);
    await p.setViewportSize({ width: 400, height: 900 }); await sleep(300);
    const sw = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    step("C1.6: 400 px: the Programs cards with channels have no sideways page scroll", sw <= 1, `${sw} px`);
    await p.setViewportSize({ width: 1440, height: 900 });

    // ── Roles: an approver cannot change the channel the row shows (403), the row is unchanged.
    const asB = await api(`/combinations/${id}/forms/${encodeURIComponent(fam.code)}/channel`, { method: "PATCH", data: { channel: "PDF_UPLOAD", from: "ONLINE" }, actor: "user-B" });
    const after = (await api("/catalogue?pathway=INDIVIDUAL&filter=all")).body.rows.find((r) => r.combinationId === id);
    step("C1.6 fail case: an approver's channel change is 403 and the Programs row still shows the line Online", asB.status === 403 && after.forms.find((f) => f.code === fam.code)?.channel === "ONLINE", [asB.status]);

    // ── QA-134: the library's "what IRCC accepts" panel names no decision id.
    // A form with a current edition (the panel is offered only on one): the library says which.
    const lib = (await api("/library/forms/list")).body.rows.find((r) => r.edition && filed.some((f) => f.code === r.code));
    if (!lib) { step("setup: a Visitor visa form in the library has a current edition", false); throw new Error("no edition"); }
    await p.goto(`${BASE}/library/forms`); await p.getByRole("button", { name: `Actions for ${lib.code}` }).first().waitFor({ timeout: 30000 });
    await p.locator("tr", { hasText: lib.code }).first().getByRole("button", { name: new RegExp(`Open|${lib.code}`) }).first().click();
    const drawer = p.locator("[role=dialog]").first(); await drawer.waitFor({ timeout: 10000 });
    // Not set yet: the panel is open at once; once set, "Set/Correct what IRCC accepts" opens it.
    const set = drawer.getByRole("button", { name: /what IRCC accepts/ });
    if (await set.count()) await set.first().click();
    await drawer.getByRole("combobox", { name: "For which IRCC account" }).waitFor({ timeout: 10000 });
    const dt = (await drawer.innerText()).replace(/\s+/g, " ");
    step("C1.6 QA-134: the accepts panel's hint names no decision id", /the one account this applies to\./.test(dt) && !/\(P-\d+\)/.test(dt), dt.match(/.{0,60}\(P-\d+\).{0,10}/)?.[0] ?? dt.slice(0, 200));
    step("C1.6: no script error on any page", errs.length === 0, errs.join(" | "));
  } catch (e) { step("the walk finished", false, e.stack ?? String(e)); }
  finally { await b.close(); console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0); }
})();
