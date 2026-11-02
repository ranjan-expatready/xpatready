// C5.6 (P-240, row G3): Sample content (a combination of sourceBasis ILLUSTRATIVE) releases as a "Demo release": the
// mark shows on Releases and on the combination's header, and Releases counts it apart from real publishes. Derived on
// read, so the check flips one released combination's basis and reads again (pass and fail). No model call (US$0).
//   zsh studio/tools/isolated.sh screens_g3 4447 start && node studio/tests/check_g3_demo_release_browser.cjs 4447 xr_studio_screens_g3
const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4447), DB = process.argv[3] ?? "xr_studio_screens_g3", BASE = `http://localhost:${PORT}`;
const PSQL = fs.existsSync("/opt/homebrew/opt/postgresql@18/bin/psql") ? "/opt/homebrew/opt/postgresql@18/bin/psql" : "psql";
const sql = (q) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let pass = 0, fail = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(JSON.stringify(detail)).slice(0, 200)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  try {
    const api = async (path, method = "GET") => { const r = await p.request.fetch(`${BASE}/api${path}`, { method, headers: { "x-actor": "user-A" }, timeout: 180000 }); return { status: r.status(), body: await r.json().catch(() => null) }; };
    step("setup: sample inputs loaded", (await api("/demo/load", "POST")).status === 201);
    await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
    let rel = (await api("/releases")).body;
    const one = rel.find((x) => x.status === "RELEASED");
    step("setup: a released combination exists", !!one, rel.map((x) => x.combination));
    const basis = (b2) => sql(`update combination set source_basis='${b2}' where id='${one.combination_id}'`);
    basis("SOURCE_BACKED"); rel = (await api("/releases")).body;
    step("C5.6 fail: a source-backed release is not a Demo release (API)", rel.find((x) => x.id === one.id).demo === false);
    await p.goto(`${BASE}/releases`); await p.locator("[data-release-counts]").waitFor();
    step("C5.6 fail: Releases shows no Demo release mark and counts it as a real release", (await p.locator("[data-demo-release]").count()) === 0 && /^1 real release · 0 demo releases/.test(await p.locator("[data-release-counts]").innerText()), await p.locator("[data-release-counts]").innerText());
    basis("ILLUSTRATIVE"); rel = (await api("/releases")).body;
    step("C5.6 pass: Sample content (sourceBasis ILLUSTRATIVE) makes a Demo release (API, derived on read)", rel.find((x) => x.id === one.id).demo === true);
    await p.goto(`${BASE}/releases`); await p.locator("[data-release-counts]").waitFor();
    step("C5.6 pass: Releases marks it \"Demo release\" and leaves it out of the real-publish count", (await p.locator("[data-demo-release]").count()) === 1 && /^0 real releases · 1 demo release/.test(await p.locator("[data-release-counts]").innerText()), await p.locator("[data-release-counts]").innerText());
    const v = (await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations;
    step("axe: Releases with a Demo release mark has no WCAG A/AA violation", !v.length, v.map((x) => x.id));
    await p.goto(`${BASE}/c/${one.combination_id}`); await p.locator("h1").first().waitFor();
    step("C5.6 pass: the combination's header shows the Demo release mark", (await p.locator("h1 ~ [data-demo-release], [data-demo-release]").first().isVisible()));
    basis("SOURCE_BACKED");
    await p.goto(`${BASE}/c/${one.combination_id}`); await p.locator("h1").first().waitFor(); await p.waitForTimeout(300);
    step("C5.6 fail: a source-backed combination's header has no Demo release mark", (await p.locator("[data-demo-release]").count()) === 0);
    step("no page error", !errs.length, errs);
  } catch (e) { step("ran to the end", false, e.message); }
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
