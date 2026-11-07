// B107 (QA-296, QA-299, QA-300): the representative's parts by screens at 1440 px on the configured checkpoint, after J-A2
// (tests/runtime/check_c611_ja2_browser.cjs, 19/19): the Agent view's "The representative" tab answers every line from
// the firm record (question 7's office address, phone and e-mail included) and has no "designated individual" section;
// Prepare application makes an IMM 5476 copy and an IMM 5475 copy by its own button. The PDFs' values are checked field
// by field by tests/check_b107_representative_copies.ts. Sample data, US$0, no model call; every wait fails loudly.
//   node product/screens/B107/walk-b107-1440.cjs <port> [shots folder]
const fs = require("node:fs");
const path = require("node:path");
const STUDIO = path.join(__dirname, "..", "..", "..", "prototype", "studio");
const { chromium } = require(path.join(STUDIO, "node_modules", "playwright"));

const PORT = process.argv[2] ?? "4450", BASE = `http://localhost:${PORT}`, SHOTS = process.argv[3] ?? null;
const results = [];
const ok = (name, pass, detail = "") => { results.push(pass); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail === "" ? "" : ` — ${typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 400)}`}`); };
const T = { timeout: 30000 };
const route = async (method, p, actor, body) => {
  const r = await fetch(`${BASE}/api${p}`, { method, headers: { "x-actor": actor, ...(body ? { "content-type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  let b = null; try { b = await r.json(); } catch { /* not JSON */ }
  return { status: r.status, body: b };
};

(async () => {
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { if (!localStorage.getItem("xr-actor")) localStorage.setItem("xr-actor", "user-O"); });
  const r = await ctx.newPage();
  r.on("pageerror", (e) => errors.push(e.message));
  let n = 0;
  const shot = async (name) => { if (SHOTS) await r.screenshot({ path: path.join(SHOTS, `${String(++n).padStart(2, "0")}-${name}-1440.png`), fullPage: false }); };
  try {
    // A Visitor visa case opened by screens, as J-A2 does: the case officer, the representative of record by default.
    await r.goto(`${BASE}/cases`);
    await r.getByRole("button", { name: "Open a case" }).click(T);
    const dlg = r.getByRole("dialog");
    await dlg.getByLabel("Representative of record").waitFor(T);
    const vv = dlg.locator("select option", { hasText: "Visitor visa" }).first();
    await vv.waitFor({ state: "attached", ...T });
    await dlg.locator("select").first().selectOption(await vv.getAttribute("value"));
    await dlg.getByLabel("Case reference").fill(`B107-${Date.now().toString(36)}`);
    await dlg.getByLabel("Principal applicant's name").fill("Client A");
    await dlg.getByRole("button", { name: "Open case" }).click();
    await r.waitForURL(/\/cases\/[0-9a-f-]{36}$/, T);
    const caseId = r.url().split("/").pop();

    // The representative's tab: every line from the firm record; question 7 answered; no designated individual.
    await r.locator("#agent-view").getByRole("tab", { name: /^The representative/ }).click(T);
    const pane = r.locator("#agent-view [role='tabpanel']").first();
    await pane.getByText(/From the firm record/).first().waitFor(T);
    const text = (await pane.innerText()).replace(/\s+/g, " ");
    ok("B107 walk (QA-300): the representative's tab shows the office's city, street and e-mail from the firm record", /Toronto/.test(text) && /Example Street/.test(text) && /representative@sample-firm\.example\.com/.test(text), text.slice(0, 600));
    ok("B107 walk (QA-300): no line on the tab is \"Not answered\" (nothing nobody can answer)", !/Not answered/.test(text), (text.match(/[^.]{0,80}Not answered[^.]{0,80}/g) ?? []).slice(0, 4));
    ok("B107 walk (QA-296): the tab has no \"designated individual\" section (IMM 5475 does not read the representative)", !/designated individual/i.test(text));
    ok("B107 walk (QA-300): the law society's province, the uncompensated part, the student-at-law and fax lines are not asked", !/law society the representative belongs to|unpaid representative|supervising lawyer|fax number/i.test(text));
    await shot("representative-tab-firm-record");
    await r.locator("#agent-view").getByText(/Example Street/).first().scrollIntoViewIfNeeded();
    await shot("representative-tab-question-7");

    // Prepare application: a copy of IMM 5476 and one of IMM 5475, by their own buttons.
    const forms = r.locator("section[aria-labelledby='forms-h']");
    for (const form of ["IMM 5476", "IMM 5475"]) {
      const card = forms.locator("article, li, section").filter({ has: r.getByRole("heading", { name: new RegExp(`^${form} for Client A$`) }) }).last();
      await card.waitFor(T);
      await card.scrollIntoViewIfNeeded();
      const make = card.getByRole("button", { name: /Generate a copy|Make a new copy|Generate a new copy/ }).first();
      await make.click(T);
      await card.getByText(/form fields? written/).first().waitFor(T);
      const words = (await card.innerText()).replace(/\s+/g, " ");
      ok(`B107 walk: Prepare application makes a copy of ${form} by its button and says how many form fields it wrote`, /\d+ form fields? written/.test(words), words.slice(0, 300));
      await shot(`prepare-${form.replace(" ", "").toLowerCase()}-copy`);
    }
    // What the copies hold (the screen shows counts; the values are read from the PDF by the check named above).
    const p = await route("GET", `/runtime/cases/${caseId}/prepare`, "user-O");
    const i5476 = (p.body?.items ?? []).find((i) => i.form === "IMM 5476");
    ok("B107 walk: the IMM 5476 item still names the representative of record", i5476?.representative === "user-R", i5476?.representative);
    ok("B107 walk: no page errors", errors.length === 0, errors);
  } catch (e) {
    ok("B107 walk: ran to the end", false, String(e.message ?? e).slice(0, 400));
    await shot("failed").catch(() => undefined);
  } finally { await browser.close(); }
  const passed = results.filter(Boolean).length;
  console.log(`\n${passed}/${results.length} passed`);
  process.exit(passed === results.length && results.length ? 0 : 1);
})();
