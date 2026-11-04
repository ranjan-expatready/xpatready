// C4.5 walk at 1440 px (screens lane, P-312: a walk like a person before the label), on a copy of the six where the
// author has proposed the passport's facts (acceptance/C4.5.test.ts steps 1-6, or its setup): the approver finds it on
// To review and approves it; then the Smart questionnaire tab reads "from documents", the Documents tab's passport line
// names its facts, Preview shows the passport filling them, and tried as missing they are asked. Screenshots in
// product/screens/C4.5-document-supplies/screenshots/. No model call (US$0).
//   node studio/tests/walk_c45_supplies_browser.cjs 4452 <combination id>
const path = require("node:path"); const fs = require("node:fs");
const { chromium } = require("../node_modules/playwright");

const PORT = Number(process.argv[2] ?? 4452), VV = process.argv[3], BASE = `http://localhost:${PORT}`;
const ROOT = path.join(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "C4.5-document-supplies", "screenshots"); fs.mkdirSync(SHOTS, { recursive: true });
let pass = 0, fail = 0;
const ok = (name, c, detail) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 200)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage();
  const as = async (who) => { await p.goto(BASE); await p.evaluate((w) => { try { localStorage.setItem("xr-actor", w); } catch { /* ignore */ } }, who); };
  const shot = async (name) => p.screenshot({ path: path.join(SHOTS, `${name}-1440.png`), fullPage: false });
  const text = async () => (await p.locator("main").innerText()).replace(/\s+/g, " ");

  // Before: the Smart questionnaire tab reads 0 from documents.
  await as("user-A");
  await p.goto(`${BASE}/c/${VV}/questionnaires`); await p.locator("[data-coverage]").waitFor({ timeout: 60000 });
  await p.waitForFunction(() => !/working out where/.test(document.querySelector("[data-coverage]")?.textContent ?? ""), null, { timeout: 60000 });
  const before = await p.locator("[data-coverage]").innerText();
  ok("before: the SQR tab reads 0 from documents", /\b0 from documents/.test(before), before);
  await p.locator("[data-coverage]").scrollIntoViewIfNeeded(); await shot("01-sqr-before");

  // The approver finds the change on To review and approves it.
  await as("user-B");
  await p.goto(`${BASE}/review`); await p.getByText(/Passport information page copy · supplies 9 facts/).first().waitFor({ timeout: 60000 });
  const row = await text();
  ok("To review: the approver sees the change with before → after, the official words' sources and Sample", /no fact → 9 facts/.test(row) && /IMM 5484 \(05-2026\), page 1 \(read 2026-11-05\)/.test(row) && /Sample/.test(row), row.slice(row.indexOf("Facts it supplies"), row.indexOf("Facts it supplies") + 200));
  await p.getByText(/Passport information page copy · supplies 9 facts/).first().scrollIntoViewIfNeeded(); await shot("02-to-review");
  await p.getByRole("link", { name: /Approve or return/ }).first().click();
  await p.getByRole("button", { name: "Approve", exact: true }).waitFor({ timeout: 60000 });
  const page = await p.locator("[data-change-supplies]").innerText().catch(() => "");
  ok("the change page shows the second person each fact with its official words, source and date read", (page.match(/read 2026-11-05/g) ?? []).length === 9 && /“The passport number;”/.test(page) && /No fact: filed as is/.test(page), page.slice(0, 200));
  await shot("03-change-page");
  const [res] = await Promise.all([p.waitForResponse((r) => /\/library\/changes\/[^/]+\/approve$/.test(r.url()), { timeout: 60000 }), p.getByRole("button", { name: "Approve", exact: true }).click()]);
  const body = await res.json().catch(() => ({}));
  await p.waitForTimeout(800); await shot("04-approved");
  ok("the approver approves it on the change page", res.status() < 300 && body.status === "APPROVED", { status: res.status(), change: body.status });

  // After: the SQR tab, the Documents drawer, Preview, Preview with the passport tried as missing.
  await as("user-A");
  await p.goto(`${BASE}/c/${VV}/questionnaires`); await p.locator("[data-coverage]").waitFor({ timeout: 60000 });
  await p.waitForFunction(() => !/working out where/.test(document.querySelector("[data-coverage]")?.textContent ?? ""), null, { timeout: 60000 });
  const after = await p.locator("[data-coverage]").innerText();
  ok("after: the SQR tab reads N from documents > 0 for the principal", /\b([1-9]\d*) from documents/.test(after), after);
  await p.locator("[data-coverage]").scrollIntoViewIfNeeded(); await shot("05-sqr-after");
  await p.goto(`${BASE}/c/${VV}/documents`); await p.locator("[data-doc-supplies]").first().waitFor({ timeout: 60000 });
  const pp = p.locator("tr", { hasText: "Passport information page copy" }).first();
  ok("Documents tab: the passport line says it supplies 9 facts", /9 facts/.test(await pp.innerText()), await pp.innerText());
  await pp.getByRole("button").first().click().catch(() => undefined);
  await p.locator("[data-doc-drawer]").waitFor({ timeout: 30000 }).catch(() => undefined);
  const drawer = (await p.locator("[data-doc-drawer]").count()) ? await p.locator("[data-doc-drawer]").innerText() : "";
  ok("Documents drawer: each of the passport's facts is taken out of the questionnaire", (drawer.match(/\bYes\b/g) ?? []).length >= 9, drawer.slice(0, 200));
  await shot("06-documents-drawer");
  await p.goto(`${BASE}/c/${VV}/preview?person=principal`); await p.locator("[data-from-documents]").waitFor({ timeout: 60000 });
  const fromDocs = await p.locator("[data-from-documents]").innerText();
  ok("Preview: the principal's passport fills 9 answers, not asked while on the checklist", /fills 9 answers/.test(fromDocs), fromDocs);
  await p.locator("[data-from-documents]").scrollIntoViewIfNeeded(); await shot("07-preview");
  const asked = async () => (await p.locator("[data-set='sqr']").innerText());
  const s0 = await asked();
  await p.goto(`${BASE}/c/${VV}/preview?person=principal&tweaks=${encodeURIComponent(JSON.stringify({ "missing:principal|passport_information_page_copy": true }))}`);
  await p.locator("[data-set='sqr']").waitFor({ timeout: 60000 });
  await p.waitForTimeout(500);
  const s1 = await asked();
  const n = (t) => Number(/Client questionnaire · (\d+) of/.exec(t)?.[1] ?? NaN);
  ok("Preview, the passport tried as missing: no passport box, and its 9 answers are asked instead (the client's count goes up by 9)", !/fills 9 answers/.test(s1) && n(s1) === n(s0) + 9, { before: n(s0), after: n(s1) });
  await p.locator("[data-set='sqr']").scrollIntoViewIfNeeded(); await shot("08-preview-missing");
  await p.goto(`${BASE}/library/documents`); await p.getByText("Passport information page copy").first().waitFor({ timeout: 60000 }); await shot("09-library-document-types");
  ok("Library › Document types: the passport lists its facts", /Passport information page copy[\s\S]*Passport number|Number of the passport/i.test(await text()));
  await b.close();
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  unexpected", e); process.exit(1); });
