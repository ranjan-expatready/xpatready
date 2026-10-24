// Screen 01 small FIX (Lead note 24 Oct 20:20): one passing and one failing case per qa finding, on an isolated copy with
// sample inputs loaded. No model call.
//   QA-4  (C2.1, C3.1 · P-64) a stored source file and a filled PDF download when their path has a dot-folder, as every
//         lane copy's does (.claude/worktrees/): two rows point at files under var/…/.lane-copy/; before the fix both 404.
//   QA-20 (C1.6, C1.7 · EXPERIENCE 400 px) the combination page with the author's Portal select has no sideways scroll.
//   QA-22 (C1.1 · EXPERIENCE feedback and state) while the session request is still on its way the author is never told
//         "A configuration author adds combinations here." and never sees a disabled New combination in the empty state.
//   QA-22 runs first, on the copy's empty catalogue; the test then loads the sample inputs itself (POST /api/demo/load).
//   zsh studio/tools/isolated.sh screens_sf 4445 start && node studio/tests/check_screen01_smallfix.cjs 4445 xr_studio_screens_sf
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const PORT = Number(process.argv[2] ?? 4445), DB = process.argv[3] ?? "xr_studio_screens_sf";
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..", "..", "..");
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0;
const step = (name, ok, detail) => { if (!ok) fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 220)}` : ""}`); };


(async () => {
  // A cloud copy has its browser at /opt/pw-browsers/chromium (another Playwright version than the studio's).
  const b = await chromium.launch(fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {});
  try {
    // -------------------------------------------------------------- QA-22: the session arrives late (empty catalogue)
    for (const [who, hold] of [["the author", "user-A"], ["a non-author", "user-C"]]) {
      const c = await b.newContext({ viewport: { width: 1440, height: 900 } }); const q = await c.newPage();
      await q.addInitScript((id) => { try { localStorage.setItem("xr-actor", id); } catch { /* ignore */ } }, hold);
      await q.route("**/api/session**", async (r) => { await new Promise((res) => setTimeout(res, 1500)); await r.continue(); });
      const seen = []; let stop = false;
      await q.goto(`${BASE}/`);
      const looking = (async () => { while (!stop) { seen.push(((await q.innerText("main").catch(() => "")) || "").replace(/\s+/g, " ")); await q.waitForTimeout(50).catch(() => {}); } })();
      await q.getByText(/No combinations in Individual yet/).waitFor({ timeout: 15000 }); await q.waitForTimeout(400); stop = true; await looking;
      const final = (await q.innerText("main")).replace(/\s+/g, " ");
      if (who === "the author") {
        step("C1.1 QA-22: while the session loads, the author never reads the non-author message", !seen.some((t) => /A configuration author adds combinations here/.test(t)), `${seen.length} looks`);
        step("C1.1 QA-22: once the session arrives the author's own message and New combination show", /Create the first one with New combination/.test(final) && !(await q.getByRole("button", { name: "New combination" }).first().isDisabled()), final.slice(0, 160));
      } else {
        step("control QA-22: a non-author still reads the non-author message and New combination stays disabled", /A configuration author adds combinations here/.test(final) && await q.getByRole("button", { name: "New combination" }).first().isDisabled(), final.slice(0, 160));
      }
      await c.close();
    }
    // ---------------------------------------------------------------- the sample inputs (not under test, P-33)
    const ld = await fetch(`${BASE}/api/demo/load`, { method: "POST", headers: { "x-actor": "user-A" } });
    if (!ld.ok) { console.log(`STOP  sample inputs did not load — ${ld.status} ${(await ld.text()).slice(0, 200)}`); process.exit(1); }

    // ---------------------------------------------------------------- QA-4: downloads under a dot-folder
    const rel = path.join("ai-workers", "problem-1-pathway-setup-and-form-filling", "prototype", "studio", "var", `isolated-${DB.replace(/^xr_studio_/, "")}`, ".lane-copy");
    fs.mkdirSync(path.join(ROOT, rel), { recursive: true });
    const body = "%PDF-1.4\n% QA-4 test file\n%%EOF\n";
    fs.writeFileSync(path.join(ROOT, rel, "qa4.pdf"), body);
    const att = sql("select id from source_attachment order by created_at limit 1");
    const was = sql(`select stored_path from source_attachment where id='${att}'`);
    sql(`update source_attachment set stored_path='${path.join(rel, "qa4.pdf")}' where id='${att}'`);
    const ws = sql(`select workspace_id from source_attachment where id='${att}'`);
    const art = sql(`insert into generated_artifact (id, workspace_id, kind, path, sha256, created_by) values (gen_random_uuid(), '${ws}', 'TEST', '${path.join(rel, "qa4.pdf")}', 'x', 'test') returning id`).split("\n")[0];
    try {
      for (const [what, url] of [["a stored source file", `/api/attachments/${att}/file`], ["a filled PDF", `/api/artifacts/${art}/file`]]) {
        const r = await fetch(`${BASE}${url}`); const t = await r.text();
        step(`C3.1 QA-4: ${what} under a dot-folder downloads`, r.status === 200 && t === body && /attachment/.test(r.headers.get("content-disposition") ?? ""), `${r.status} ${r.headers.get("content-disposition")}`);
      }
      let r = await fetch(`${BASE}/api/artifacts/00000000-0000-0000-0000-000000000000/file`);
      step("control: an unknown filled PDF still answers 404", r.status === 404, r.status);
      fs.rmSync(path.join(ROOT, rel, "qa4.pdf"));
      r = await fetch(`${BASE}/api/artifacts/${art}/file`); const j = await r.json().catch(() => ({}));
      step("C3.1 QA-4: a filled PDF whose file is gone answers 404 with the plain reason, not a server error", r.status === 404 && /removed by a reset/.test(j.detail ?? ""), `${r.status} ${j.detail}`);
    } finally {
      sql(`update source_attachment set stored_path='${was}' where id='${att}'`); sql(`delete from generated_artifact where id='${art}'`);
    }

    // -------------------------------------------------------------- QA-20: 400 px, the author's Portal select
    const ctx = await b.newContext({ viewport: { width: 400, height: 900 } }); const p = await ctx.newPage();
    const wp = sql("select id from combination where combination_key='wp.family'");
    for (const w of [400, 390, 1024]) {
      await p.setViewportSize({ width: w, height: 900 });
      await p.goto(`${BASE}/c/${wp}`); await p.locator("main select[id^='portal-']").first().waitFor();
      const sw = await p.evaluate(() => document.documentElement.scrollWidth);
      const sel = await p.locator("main select[id^='portal-']").first().evaluate((e) => Math.round(e.getBoundingClientRect().right));
      step(`C1.7 QA-20: ${w} px, the combination page with the Portal select has no sideways scroll`, sw <= w && sel <= w, `page ${sw} px, select ends at ${sel} px`);
    }
    await p.locator("main select[id^='portal-']").first().selectOption("rep_pr_portal"); await p.waitForTimeout(800);
    await p.setViewportSize({ width: 400, height: 900 }); await p.reload(); await p.locator("main select[id^='portal-']").first().waitFor();
    step("C1.7 QA-20: 400 px with the longest portal chosen, still no sideways scroll", await p.evaluate(() => document.documentElement.scrollWidth) <= 400, await p.evaluate(() => document.documentElement.scrollWidth));
    await p.locator("main select[id^='portal-']").first().selectOption(""); await p.waitForTimeout(800);
    await ctx.close();
  } finally { await b.close(); }
  console.log(fail ? `${fail} FAILED` : "all passed");
  process.exit(fail ? 1 : 0);
})();
