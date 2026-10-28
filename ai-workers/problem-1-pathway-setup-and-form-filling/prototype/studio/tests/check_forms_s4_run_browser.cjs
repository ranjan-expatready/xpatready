// S4 slice 2 (W1-07, P-110): the shared run card and the top-bar chip walked in a real browser. Shared library › Forms →
// Upload PDF → the card follows the run to Done ("Rules read it … No AI call was made") → an unreadable PDF waits for a
// person → a live form-finder run (stand-in launcher, its AI call hangs) shows in the top-bar chip on any page → the
// chip opens the run's card → Stop ends it → Stopped. Screenshots at 1440 and 1024 px into
// product/screens/W1-form-library/screenshots/slice2/, axe (WCAG 2.2 AA) on each state. US$0 (no model call).
//   zsh studio/tools/isolated.sh forms_s4b 4457 start STUDIO_FAKE_LAUNCHER=ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tests/fixtures/fake-launch.mjs && node studio/tests/check_forms_s4_run_browser.cjs 4457 xr_studio_forms_s4b
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4457), DB = process.argv[3] ?? "xr_studio_forms_s4b";
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const VAR = path.join(__dirname, "..", "var", `isolated-${DB.replace(/^xr_studio_/, "")}`); // the copy's own folder, whatever its name
const SHOTS = path.join(ROOT, "product", "screens", "W1-form-library", "screenshots", "slice2"); fs.mkdirSync(SHOTS, { recursive: true });
const PDF = path.join(ROOT, "official-sources", "ircc", "forms", "imm5604e.pdf");
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 220)}` : ""}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, data: init.json !== undefined ? JSON.stringify(init.json) : undefined }); let body = null; try { body = await r.json(); } catch { /* none */ } return { status: r.status(), body }; };
  const shot = async (name) => { for (const w of [1440, 1024, 390]) { await p.setViewportSize({ width: w, height: 900 }); await sleep(150); await p.screenshot({ path: path.join(SHOTS, `${name}-${w}.png`), fullPage: true }); } await p.setViewportSize({ width: 1440, height: 900 }); };
  const axe = async (label) => { const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze(); step(`axe (WCAG 2.2 AA): ${label}`, r.violations.length === 0, r.violations.map((v) => `${v.id}: ${v.nodes.length} (${v.nodes.map((n) => `${n.target.join(" ")} ${(n.any[0]?.message ?? "").slice(0, 120)}`).join(" | ")})`).join("; ")); };
  try {
    await api("/demo/load", { method: "POST" });
    await p.goto(`${BASE}/`); await p.evaluate(() => localStorage.setItem("xr-actor", "user-A"));
    await p.goto(`${BASE}/library/forms`);
    await p.getByRole("button", { name: "Upload PDF" }).waitFor();
    step("C11.11: Shared library › Forms offers Upload PDF to an author", true);
    await p.setInputFiles('input[aria-label="Choose PDFs to upload"]', PDF);
    const card = p.locator("section[data-run-status]").first();
    await card.waitFor();
    await p.locator('section[data-run-status="done"]').waitFor({ timeout: 60_000 });
    const text = await card.textContent();
    step("C11.8: the run card shows every step with its kind, and ends Done", /Reading an uploaded PDF/.test(text) && /Done/.test(text) && (await card.locator("[data-step]").count()) === 4, text.slice(0, 200));
    step("C11.11 (M1): the card says the rules read it and no AI call was made", /Rules read it: IMM 5604 .*No AI call was made\./.test(text));
    step("C11.8: cost is shown in words on the card (US$0 · rules only, no AI)", /US\$0 · rules only, no AI/.test(text));
    await axe("upload run, done"); await shot("01-upload-done");
    await p.reload(); await p.getByRole("button", { name: "Upload PDF" }).waitFor();
    step("C11.11 (Lead fix 4): the Forms page has one way in (no second \"Choose files\" box)", (await p.getByText("Add forms to the library").count()) === 0 && (await p.getByRole("button", { name: "Upload PDF" }).count()) === 1);
    execFileSync(path.join(ROOT, "..", "..", ".tools", "solution-1-prototype", ".venv", "bin", "python"), ["-I", "-c", "import pypdf,sys; w=pypdf.PdfWriter(); w.add_blank_page(200,200); w.write(sys.argv[1])", path.join(require("node:os").tmpdir(), "s4-scan.pdf")]); // a real PDF with no form on it
    await p.setInputFiles('input[aria-label="Choose PDFs to upload"]', path.join(require("node:os").tmpdir(), "s4-scan.pdf"));
    await p.locator('section[data-run-status="needs_person"]').waitFor({ timeout: 60_000 });
    const waitText = await p.locator('section[data-run-status="needs_person"]').first().textContent();
    step("C11.11 (M1): a PDF whose number the rules cannot read: \"Waiting for you\", no AI call", /Waiting for you/.test(waitText) && /no AI call was made/.test(waitText));
    step("C11.11 (Lead fix 2): the waiting reason appears once on the card", (waitText.match(/Rules could not read its form number/g) ?? []).length === 1, waitText.slice(0, 300));
    await axe("upload run, waiting for a person"); await shot("02-upload-needs-person");

    // Live finder run through the stand-in launcher, whose AI call hangs (safety probe first: a stub pass only).
    fs.writeFileSync(path.join(VAR, "fake-launch.json"), JSON.stringify({ stub: { exit: 1, err: "S4 browser check: stand-in probe" } }));
    fs.rmSync(path.join(VAR, "fake-launch.log"), { force: true });
    const vv = sql(`select id from combination where label='Visitor visa' limit 1`);
    const att = sql(`select id from source_attachment where combination_id='${vv}' and edition like 'IMM 5257 (%' limit 1`);
    await api(`/attachments/${att}/draft`, { method: "POST", json: { mode: "stub" } });
    for (let i = 0; i < 120 && !fs.existsSync(path.join(VAR, "fake-launch.log")); i++) await sleep(500);
    if (!fs.existsSync(path.join(VAR, "fake-launch.log"))) throw new Error("the stand-in launcher is not active: start the copy as the usage line says; live steps skipped");
    step("safety: the stand-in launcher answers (nothing is sent to a model)", true);
    fs.writeFileSync(path.join(VAR, "fake-launch.json"), JSON.stringify({ jobs: { "studio-finder-": { stub: { exit: 0, out: { exit: 0, status: "completed" } }, live: { exit: 0, sleep_ms: 60_000, out: { exit: 0 } } } } }));
    const plan = (await api(`/combinations/${vv}/forms/find/plan`, { method: "POST", json: { mode: "live" } })).body;
    const run = (await api(`/combinations/${vv}/forms/find`, { method: "POST", json: { mode: "live", planSha256: plan.plan_sha256, idempotencyKey: `s4b-${Date.now()}` } })).body;
    await p.goto(`${BASE}/structure`);
    const chip = p.locator("[data-run-chip]");
    await chip.waitFor({ timeout: 30_000 });
    for (let i = 0; i < 40 && !/step 3 of 6/.test(await chip.textContent()); i++) await sleep(500);
    step("C11.8: the top-bar chip follows the person to another page: \"Finding forms · step 3 of 6\"", /Finding forms · step 3 of 6/.test(await chip.textContent()), await chip.textContent());
    // The mouse is left where the last click was; on the Structure page a button may sit there in its hover state. The check
    // is about the chip, so the pointer moves off the page first (the shared button's hover contrast is reported to the Lead).
    await p.mouse.move(0, 0); await sleep(150);
    await axe("top-bar chip on another page"); await shot("03-chip-on-structure");
    await p.setViewportSize({ width: 390, height: 900 }); await sleep(200);
    step("review M8: below 768 px the chip stays, compact, with its words for screen readers", await chip.isVisible() && /Finding forms/.test((await chip.getAttribute("aria-label")) ?? ""), await chip.getAttribute("aria-label"));
    await p.setViewportSize({ width: 1440, height: 900 }); await sleep(200);
    await chip.click();
    await p.waitForURL(`**/ai/${run.id}`);
    const live = p.locator('section[data-run-status="running"]');
    await live.waitFor();
    step("C11.8: the chip opens the run's card: running, step 3 of 6, the AI step marked, Stop offered", /Step 3 of 6/.test(await live.textContent()) && (await live.getByRole("button", { name: "Stop" }).count()) === 1 && /AI/.test(await live.locator('[data-step="finder_propose"]').textContent()));
    await axe("run card, running"); await shot("04-run-card-running");
    const t0 = Date.now();
    await live.getByRole("button", { name: "Stop" }).click();
    await p.locator('section[data-run-status="stopped"]').waitFor({ timeout: 20_000 });
    step("C11.8 (M7): Stop ends the run (Stopped within seconds; the stand-in call would have taken 60 s)", Date.now() - t0 < 15_000, `${Date.now() - t0} ms`);
    step("C11.8 (M7): the AI step says the call was ended and how it is counted", /Stopped while the AI call ran/.test(await p.locator('[data-step="finder_propose"]').textContent()));
    await axe("run card, stopped"); await shot("05-run-card-stopped");
    await p.goto(`${BASE}/structure`); await sleep(2500);
    step("C11.8: with nothing running, the chip is gone", (await p.locator("[data-run-chip]").count()) === 0);
    step("no page errors", errs.length === 0, errs.join(" | "));
  } catch (e) { fail++; console.log(`FAIL  unexpected ${e.stack}`); } finally { await b.close(); }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
