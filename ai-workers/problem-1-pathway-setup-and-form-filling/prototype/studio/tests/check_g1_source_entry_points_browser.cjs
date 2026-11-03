// G1 PR 2c (C5.4, P-240; concept screens/G1-source-register/concept.md v2 §4, board 2 "In the rule dialog"): the Source
// panel also opens where an item is edited. The rule dialog shows "Sources of its numbers" (each number with its chip)
// and opens the panel on the rule; a check row that holds a number offers "Sources (n)", and an illustrative check's
// panel says it stays Sample; a form line's saved "From age" reads "Needs a source before release." with a "Source" link
// that opens the panel on that number. Focus returns to the control that opened the panel; axe (WCAG 2.2 AA) on each.
// Sample inputs; no AI call (US$0). Screenshots into product/screens/G1-source-register/screenshots/.
//   zsh studio/tools/isolated.sh screens_g1ep 4453 start && node studio/tests/check_g1_source_entry_points_browser.cjs 4453
const path = require("node:path"); const fs = require("node:fs");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4453), BASE = `http://localhost:${PORT}`;
const SHOTS = path.join(__dirname, "..", "..", "..", "product", "screens", "G1-source-register", "screenshots"); fs.mkdirSync(SHOTS, { recursive: true });
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail !== undefined ? ` — ${String(typeof detail === "string" ? detail : JSON.stringify(detail)).replace(/\s+/g, " ").slice(0, 300)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" })).newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  const api = async (method, u, data, actor = "user-A") => { const r = await p.request.fetch(`${BASE}/api${u}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, data: data === undefined ? undefined : JSON.stringify(data) }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const settle = async () => { await p.waitForLoadState("networkidle"); await p.waitForTimeout(250); };
  const axe = async (name, include) => { const v = (await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).include(include).analyze()).violations; step(`axe: ${name} has no WCAG A/AA violation`, v.length === 0, v.map((x) => `${x.id}: ${x.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`).join("; ")); };
  const panel = () => p.locator("[data-source-panel]");
  const closePanel = async () => { await p.keyboard.press("Escape"); await panel().waitFor({ state: "detached" }); await p.waitForTimeout(200); };
  try {
    await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
    step("setup: Reset, then the sample inputs loaded", (await api("POST", "/demo/reset", { confirm: "RESET" })).status < 300 && (await api("POST", "/demo/load")).status === 201);
    let wp = null;
    for (const m of JSON.stringify((await api("GET", "/catalogue")).body).matchAll(/"combinationId":"([0-9a-f-]{36})"/g)) { const s = (await api("GET", `/combinations/${m[1]}/sources`)).body; if (s?.combination?.key === "wp.family") { wp = m[1]; break; } }
    step("setup: With an LMIA (wp.family) found", !!wp);
    const s0 = (await api("GET", `/combinations/${wp}/sources`)).body;
    const r01 = s0.numbers.filter((n) => n.key === "wp.family/R-01");
    const chk = s0.numbers.find((n) => n.kind === "check" && !n.passes);

    // ------------------------------------------------------------------ the rule dialog: "Sources of its numbers"
    await p.goto(`${BASE}/c/${wp}/questionnaires`); await settle();
    await p.locator("[data-rules] summary").click();
    await p.locator("[data-rules] tr", { hasText: "R-01" }).getByRole("button", { name: "Edit" }).click();
    const sec = p.locator(`[role=dialog] [data-item-sources="wp.family/R-01"]`);
    await sec.waitFor({ timeout: 15000 });
    const st = await sec.innerText();
    step(`C5.4 §4 (PR 2c): the rule dialog lists "Sources of its numbers": each of R-01's ${r01.length} numbers with its chip, as saved in the draft`, st.includes("Sources of its numbers") && r01.every((n) => st.includes(n.words)) && /Official source/.test(st) && /as saved in the draft/.test(st), st);
    await axe("the rule dialog with its sources", "[role=dialog]");
    await p.screenshot({ path: path.join(SHOTS, "rule-dialog-sources-1440.png") });
    const openBtn = sec.getByRole("button", { name: /sources$/i });
    await openBtn.click(); await panel().locator("[data-source-number]").first().waitFor();
    step("C5.4 §4 (PR 2c): its button opens the Source panel on the rule, over the dialog", (await panel().locator("[data-source-number]").count()) === r01.length);
    await closePanel();
    step("C5.4 (PR 2c, WCAG 2.4.3): closing the panel returns focus to the button that opened it, and the rule dialog stays open", await p.evaluate(() => /sources$/i.test(document.activeElement?.textContent ?? "")) && await p.getByRole("dialog", { name: /Edit rule R-01/ }).count() === 1);
    await p.keyboard.press("Escape"); await settle();

    // ------------------------------------------------------------------ a check row: "Sources (n)"
    await p.locator("[data-checks] summary").click();
    const cb = p.locator(`[data-checks] [data-item-sources="${chk.key}"]`);
    await cb.scrollIntoViewIfNeeded();
    const label = await cb.getAttribute("aria-label");
    step("C5.4 §4 (PR 2c): a check that holds a number offers \"Sources (n)\", named by its check and saying how many lack a source", /^Sources \(1\) 1 no source: check .+$/.test(label ?? "") && /Sources \(1\)/.test(await cb.innerText()), label);
    await axe("the checks table with its Sources actions", "[data-checks]");
    await cb.click(); await panel().locator(`[data-source-number="${chk.address}"]`).waitFor();
    step("C5.4 §4 (PR 2c): it opens the Source panel on that check's number", await panel().locator(`[data-source-number="${chk.address}"][data-state="missing"]`).count() === 1);
    await closePanel();
    step("C5.4 (PR 2c): focus returns to the check's Sources button", await p.evaluate((k) => document.activeElement?.getAttribute("data-item-sources") === k, chk.key));
    // m3: a check added without a source quote is Sample (illustrative); its panel says it stays Sample.
    const added = await api("POST", `/combinations/${wp}/checks`, { condition: { subjectKind: "PERSON", op: "gte", field: "person.caregiver_persons_requiring_care", value: 3 }, message: "Test data: three or more people need this caregiver; check the care letter (Sample check)." });
    step("setup: a section check with a number and no source quote added (Sample)", added.status < 300 && added.body.illustrative === true, added.body);
    await p.reload(); await settle(); await p.locator("[data-checks] summary").click();
    const ib = p.locator(`[data-checks] [data-item-sources="wp.family/${added.body.key}"]`);
    await ib.scrollIntoViewIfNeeded(); await ib.click(); await panel().locator("[data-source-number]").first().waitFor();
    step("C5.4 m3 (PR 2c): an illustrative check's panel says it stays Sample, above its number", (await panel().locator("[data-source-note]").innerText()) === "This check stays Sample: it has no source quote of its own. A number's source does not change that." && /at least 3/.test(await panel().innerText()));
    await p.screenshot({ path: path.join(SHOTS, "check-sources-sample-1440.png") });
    await closePanel();

    // ------------------------------------------------------------------ "From age" on a form line
    const lines = (await api("GET", `/combinations/${wp}/workspace?tab=forms`)).body;
    const code = JSON.stringify(lines).includes("IMM 5707") ? "IMM 5707" : null;
    step("setup: With an LMIA has the IMM 5707 form line", !!code);
    step("setup: its \"From age\" set to 18 in the draft", (await api("PATCH", `/combinations/${wp}/forms/${encodeURIComponent(code)}`, { minAge: 18 })).status < 300);
    await p.goto(`${BASE}/c/${wp}/forms`); await settle();
    await p.getByRole("button", { name: `Change ${code}` }).click();
    const link = p.locator(`[role=dialog] [data-item-sources="wp.family/form:${code}"]`);
    await link.waitFor({ timeout: 15000 });
    const dt = await p.locator("[role=dialog]").innerText();
    step("C5.4 §4 m3 (PR 2c): a saved \"From age\" reads \"Needs a source before release.\" with a chip and a Source link", dt.includes("Needs a source before release.") && !/Leave empty for any age\. Sample\./.test(dt) && /No source/.test(await link.innerText()) && await link.getByRole("button", { name: "Source of From age: 18" }).count() === 1, dt.slice(0, 300));
    await axe("the form line's From age with its Source link", "[role=dialog]");
    await p.screenshot({ path: path.join(SHOTS, "from-age-source-1440.png") });
    await link.getByRole("button", { name: "Source of From age: 18" }).click(); await panel().locator('[data-source-number="min_age"]').waitFor();
    step("C5.4 §4 (PR 2c): the Source link opens the panel on \"From age: 18\"", (await panel().innerText()).includes("From age: 18"));
    const c = panel().locator('[data-source-number="min_age"]');
    await c.getByRole("radio", { name: "None published – set by ExpatReady" }).check();
    await c.getByLabel("Why ExpatReady set this number", { exact: false }).fill("Test data: ExpatReady's own reading of who fills the form.");
    await c.getByRole("button", { name: "Save source" }).click();
    step("C5.4 BR-3 pass (PR 2c): saved from the form line, the number reads None published", await panel().locator('[data-source-number="min_age"][data-state="none_published"]').waitFor({ timeout: 15000 }).then(() => true, () => false));
    await closePanel();
    await p.waitForTimeout(300);
    step("C5.4 (PR 2c): back in the line drawer, the chip reads None published", /None published – set by ExpatReady/.test(await link.innerText()));
    step("C5.4 (Devin on #627): once answered, the From age hint no longer asks for a source", (await p.locator("[role=dialog]").innerText()).includes("Its source is recorded: see Source below.") && !(await p.locator("[role=dialog]").innerText()).includes("Needs a source before release."));
    // Devin on #627: a failed sources list never reads as "answered"; it says so, with Try again.
    await p.keyboard.press("Escape"); await settle();
    await p.route("**/api/combinations/*/sources", (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ title: "Unavailable", status: 503, detail: "down (test)" }) }));
    await p.reload(); await settle();
    await p.getByRole("button", { name: `Change ${code}` }).click(); await p.locator("[role=dialog] [data-item-sources-error]").waitFor({ timeout: 30000 });
    const fd = await p.locator("[role=dialog]").innerText();
    step("C5.4 (Devin on #627): with the sources list failing, From age says it needs a source (never \"recorded\") and the Source place says the list could not be loaded, with Try again", fd.includes("Needs a source before release.") && !fd.includes("Its source is recorded") && fd.includes("Sources could not be loaded.") && await p.locator("[role=dialog]").getByRole("button", { name: "Try again" }).count() === 1, fd.slice(0, 400));
    await p.unroute("**/api/combinations/*/sources");
    step("no page errors", errs.length === 0, errs.join(" | "));
  } catch (e) { step("ran to the end", false, e.stack ?? e.message); }
  await b.close();
  console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
})();
