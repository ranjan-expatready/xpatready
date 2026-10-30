// C3.11 (runtime lane; P-62 §3, P-143): the signed-scan lines on the Documents tab, walked in a real browser. A form line
// filed as Signed PDF upload shows "<form> signed by hand and scanned" on each signer's checklist, with why and an
// "Added by the form line" status; its ⋯ menu greys Move and Remove with the reason and offers the Forms tab; the drawer
// says why; filed as PDF upload again, the line is gone. A pass and a fail per rule; screenshots at 1440 and 1024 in
// screens/W1-questions-and-documents/screenshots/c3-11/, axe (WCAG 2.2 AA) on each state. US$0.
//   zsh studio/tools/isolated.sh runtime_c311b 4433 start && node studio/tests/check_c3_11_browser.cjs 4433 xr_studio_runtime_c311b
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4433), DB = process.argv[3] ?? "xr_studio_runtime_c311b";
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "W1-questions-and-documents", "screenshots", "c3-11"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 220)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, data: init.data, timeout: 180000 }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const settle = async () => { await p.waitForFunction(() => !document.querySelector('[aria-busy="true"]') && !document.querySelector(".animate-spin"), null, { timeout: 30000 }).catch(() => {}); await p.waitForTimeout(400); };
  let n = 0;
  const state = async (name) => {
    n++; const base = `${String(n).padStart(2, "0")}-${name}`;
    await settle();
    await p.screenshot({ path: path.join(SHOTS, `${base}-1440.png`) });
    const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    step(`axe: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
    await p.setViewportSize({ width: 1024, height: 768 }); await p.waitForTimeout(250);
    await p.screenshot({ path: path.join(SHOTS, `${base}-1024.png`) });
    step(`1024 px: ${name} has no sideways page scroll`, !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
    await p.setViewportSize({ width: 1440, height: 900 });
  };

  await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  step("setup: the sample inputs load", (await api("/demo/load", { method: "POST" })).status === 201);
  const wp = sql("select id from combination where combination_key='wp.family'");
  const F = "IMM 1295";
  const setChannel = (channel, from) => api(`/combinations/${wp}/forms/${encodeURIComponent(F)}/channel`, { method: "PATCH", data: { channel, from } });
  const go = async () => { await p.goto(`${BASE}/c/${wp}/documents?role=principal`); await p.locator("[data-documents]").waitFor({ timeout: 120000 }); await settle(); };
  const scanRow = () => p.locator(`[data-doc-line="signed_scan:${F}:principal"]`);

  await go();
  step("C3.11 fail-guard: filed as PDF upload, no signed-scan row on the principal's checklist", (await scanRow().count()) === 0);
  step("C3.11 setup: IMM 1295 set to Signed PDF upload", (await setChannel("SIGNED_PDF_UPLOAD", "PDF_UPLOAD")).status === 200);
  await go();
  step("C3.11 pass: the principal's checklist shows \"IMM 1295 signed by hand and scanned\"", (await scanRow().count()) === 1 && /IMM 1295 signed by hand and scanned/.test(await scanRow().innerText()));
  step("C3.11 pass: the row says why (filed as Signed PDF upload: printed, signed by hand, scanned and uploaded)", /filed as Signed PDF upload/.test(await scanRow().locator("[data-doc-reason]").innerText()));
  step("C3.11 pass: its status reads \"Added by the form line\"", /Added by the form line/.test(await scanRow().locator('[data-doc-status="automatic"]').innerText()));
  const rows = await p.locator("[data-documents] tbody tr").evaluateAll((t) => t.map((r) => r.getAttribute("data-doc-line")));
  step("C3.11 pass: it comes after the person's own documents", rows.at(-1) === `signed_scan:${F}:principal`, rows.slice(-2).join(" | "));
  await p.goto(`${BASE}/c/${wp}/documents?role=spouse_or_partner`); await p.locator("[data-documents]").waitFor({ timeout: 120000 }); await settle();
  step("C3.11 pass: the spouse or partner's checklist has their own signed scan", (await p.locator(`[data-doc-line="signed_scan:${F}:spouse_or_partner"]`).count()) === 1);
  await go();
  await state("signed-scan-row");

  // ⋯ menu: Move and Remove greyed with the reason, the Forms tab offered
  await scanRow().getByRole("button").last().click();
  const menu = p.getByRole("menu");
  await menu.waitFor();
  const mtext = await menu.innerText();
  step("C3.11 fail: Move and Remove are greyed with the reason in words (change the form line on the Forms tab)", /Follows the IMM 1295 form line/.test(mtext) && (await menu.getByRole("menuitem", { name: /Remove from checklist/ }).getAttribute("aria-disabled")) === "true", mtext.replace(/\n/g, " | "));
  step("C3.11 pass: the menu offers the Forms tab", /Open the Forms tab/.test(mtext));
  await state("signed-scan-menu");
  await p.keyboard.press("Escape");

  // drawer
  await scanRow().getByRole("button", { name: `Details of: ${F} signed by hand and scanned` }).click();
  const drawer = p.locator("[data-doc-drawer-automatic]");
  await drawer.waitFor();
  step("C3.11 pass: the drawer says why and that it goes away when filed another way", /filed as Signed PDF upload/.test(await drawer.innerText()) && /goes away at once/.test(await drawer.innerText()));
  step("C3.11 fail-guard: the drawer offers no Edit or Remove for it", (await p.locator("[data-drawer-edit], [data-drawer-remove]").count()) === 0);
  await state("signed-scan-drawer");
  await p.keyboard.press("Escape");

  // channel back → gone
  step("C3.11 setup: IMM 1295 filed as PDF upload again", (await setChannel("PDF_UPLOAD", "SIGNED_PDF_UPLOAD")).status === 200);
  await go();
  step("C3.11 pass: filed as PDF upload, the signed-scan row is gone", (await scanRow().count()) === 0);
  step("no page error", errs.length === 0, errs.join(" | "));
  await b.close();
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
