// Screen 01 small FIX (Lead note 24 Oct 20:20): one passing and one failing case per qa finding, on an isolated copy with
// sample inputs loaded. No model call.
//   QA-4  (C2.1, C3.1 · P-64) a stored source file and a filled PDF download when their path has a dot-folder, as every
//         lane copy's does (.claude/worktrees/): two rows point at files under var/…/.lane-copy/; before the fix both 404.
//   QA-20 (C1.6 · EXPERIENCE 400 px) the combination page with the author's "Filed as" selects has no sideways scroll
//         (W1-02, P-102: the Portal select is parked with the browser extension; Online shows its later-wave note).
//   QA-22 (C1.1 · EXPERIENCE feedback and state) while the session request is still on its way the author is never told
//         "A configuration author adds the pathways, programs and categories." and never sees a disabled New combination in the empty state.
//   CHECK 24 Oct fixes: break K1 (keyboard on the "Filed as" select: no save per arrow press, focus stays),
//         m1 (a session that never answers does not hide Programs), m3 + review should 2 (a refused, failed or empty
//         session: the right notice and neutral words), m4 (the combination page's forms wait for the person), m5 (ENOTDIR
//         and a NUL byte in an id are a plain 404), review should 1 (the forms table scrolls by keyboard: axe at 400 px).
//   QA-22 runs first, on the copy's empty catalogue; the test then loads the sample inputs itself (POST /api/demo/load).
//   zsh studio/tools/isolated.sh screens_sf 4445 start && node studio/tests/check_screen01_smallfix.cjs 4445 xr_studio_screens_sf
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4445), DB = process.argv[3] ?? "xr_studio_screens_sf";
const BASE = `http://localhost:${PORT}`;
// QA-270: a filled PDF is a configuration read (the author's header); a stored source file stays an open link.
const AUTHOR_READ = { headers: { "x-actor": "user-A" } };
const ROOT = path.resolve(__dirname, "..", "..", "..", "..", "..");
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0;
const step = (name, ok, detail) => { if (!ok) fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 220)}` : ""}`); };


(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true }); // as the other browser suites: CI, Mac and cloud
  try {
    // -------------------------------------------------------------- QA-22: the session arrives late (empty catalogue)
    for (const [who, hold] of [["the author", "user-A"], ["a non-author", "user-C"]]) {
      const c = await b.newContext({ viewport: { width: 1440, height: 900 } }); const q = await c.newPage();
      await q.addInitScript((id) => { try { localStorage.setItem("xr-actor", id); } catch { /* ignore */ } }, hold);
      await q.route("**/api/session**", async (r) => { await new Promise((res) => setTimeout(res, 1500)); await r.continue(); });
      const seen = []; let stop = false;
      await q.goto(`${BASE}/`);
      const looking = (async () => { while (!stop) { seen.push(((await q.innerText("main").catch(() => "")) || "").replace(/\s+/g, " ")); await q.waitForTimeout(50).catch(() => {}); } })();
      await q.getByText(/Nothing set up in Retail yet/).waitFor({ timeout: 15000 }); await q.waitForTimeout(400); stop = true; await looking;
      const final = (await q.innerText("main")).replace(/\s+/g, " ");
      if (who === "the author") {
        step("C1.1 QA-22: while the session loads, the author never reads the non-author message", !seen.some((t) => /A configuration author adds the pathways, programs and categories/.test(t)), `${seen.length} looks`);
        step("C1.1 QA-22: once the session arrives the author's own message and Add combination show (P-128 (5))", /Start with the Program structure/.test(final) && !(await q.getByRole("button", { name: "Add combination" }).first().isDisabled()), final.slice(0, 160));
      } else {
        step("control QA-22: a non-author still reads the non-author message and Add combination stays disabled", /A configuration author adds the pathways, programs and categories/.test(final) && await q.getByRole("button", { name: "Add combination" }).first().isDisabled(), final.slice(0, 160));
      }
      await c.close();
    }
    // -------------------------------------------------------------- break m1, m3: a session that hangs, is refused or fails
    const sessionAs = async (route, wait = 15000) => {
      const c = await b.newContext({ viewport: { width: 1440, height: 900 } }); const q = await c.newPage();
      await q.route("**/api/session**", route);
      await q.goto(`${BASE}/`);
      await q.getByText(/Nothing set up in Retail yet/).waitFor({ timeout: wait }).catch(() => {});
      const text = (await q.innerText("body")).replace(/\s+/g, " "); await c.close().catch(() => {}); return text;
    };
    let tx = await sessionAs(() => { /* never answers */ }, 9000);
    step("C1.1 break m1: a session that never answers does not hide Immigration programs (the empty page shows within 9 s)", /Nothing set up in Retail yet/.test(tx), tx.slice(0, 160));
    for (const [what, status, body, notice] of [["refused (401)", 401, JSON.stringify({ detail: "Unknown person" }), /did not accept the simulated person/], ["failed (500)", 500, "{}", /server is not answering/], ["an answer with no person (200, not JSON)", 200, "<html>proxy</html>", /answered without a person/]]) {
      tx = await sessionAs((r) => r.fulfill({ status, contentType: status === 200 ? "text/html" : "application/json", body }));
      step(`C1.1 break m3: a session ${what} shows its own notice and neutral words, not the non-author's`, notice.test(tx) && !/A configuration author adds the pathways, programs and categories/.test(tx) && /could not tell who you are/.test(tx), tx.slice(0, 200));
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
        const r = await fetch(`${BASE}${url}`, AUTHOR_READ); const t = await r.text();
        step(`C3.1 QA-4: ${what} under a dot-folder downloads`, r.status === 200 && t === body && /attachment/.test(r.headers.get("content-disposition") ?? ""), `${r.status} ${r.headers.get("content-disposition")}`);
      }
      let r = await fetch(`${BASE}/api/artifacts/00000000-0000-0000-0000-000000000000/file`, AUTHOR_READ);
      step("control: an unknown filled PDF still answers 404", r.status === 404, r.status);
      fs.rmSync(path.join(ROOT, rel, "qa4.pdf"));
      r = await fetch(`${BASE}/api/artifacts/${art}/file`, AUTHOR_READ); const j = await r.json().catch(() => ({}));
      step("C3.1 QA-4: a filled PDF whose file is gone answers 404 with the plain reason, not a server error", r.status === 404 && /removed by a reset/.test(j.detail ?? ""), `${r.status} ${j.detail}`);
      fs.writeFileSync(path.join(ROOT, rel, "qa4.pdf"), body);
      sql(`update generated_artifact set path='${path.join(rel, "qa4.pdf", "inside.pdf")}' where id='${art}'`);
      r = await fetch(`${BASE}/api/artifacts/${art}/file`, AUTHOR_READ); const k = await r.json().catch(() => ({}));
      step("C3.1 break m5: a stored path through a file (ENOTDIR) answers the plain 404, not a server error", r.status === 404 && /removed by a reset/.test(k.detail ?? ""), `${r.status} ${k.detail}`);
      r = await fetch(`${BASE}/api/artifacts/abc%00def/file`, AUTHOR_READ);
      step("C3.1 break m5: an id with a NUL byte answers 404, not a server error", r.status === 404, r.status);
    } finally {
      sql(`update source_attachment set stored_path='${was}' where id='${att}'`); sql(`delete from generated_artifact where id='${art}'`);
    }

    // -------------------------------------------------------------- QA-20: 400 px, the author's "Filed as" selects
    const ctx = await b.newContext({ viewport: { width: 400, height: 900 } }); const p = await ctx.newPage();
    const wp = sql("select id from combination where combination_key='wp.family'");
    const filedAs = () => p.getByRole("combobox", { name: /^How .* is filed$/ }).first();
    for (const w of [400, 390, 1024]) {
      await p.setViewportSize({ width: w, height: 900 });
      await p.goto(`${BASE}/c/${wp}/forms`); await filedAs().waitFor();
      const sw = await p.evaluate(() => document.documentElement.scrollWidth);
      step(`C1.6 QA-20: ${w} px, the combination page with the "Filed as" selects has no sideways scroll`, sw <= w, `page ${sw} px`);
    }
    await filedAs().dispatchEvent("pointerdown"); await filedAs().selectOption("ONLINE"); await p.waitForTimeout(800);
    await p.setViewportSize({ width: 400, height: 900 }); await p.reload(); await filedAs().waitFor();
    step("C1.6 QA-20 P-107: 400 px with a line filed Online (its later-wave note shown), still no sideways scroll", await p.evaluate(() => document.documentElement.scrollWidth) <= 400 && await p.locator("[data-online-later]").count() >= 1, await p.evaluate(() => document.documentElement.scrollWidth));
    await filedAs().dispatchEvent("pointerdown"); await filedAs().selectOption("PDF_UPLOAD"); await p.waitForTimeout(800);

    // -------------------------------------------------------------- review should 1: the forms table scrolls by keyboard
    await p.setViewportSize({ width: 400, height: 900 }); await p.goto(`${BASE}/c/${wp}/forms`); await filedAs().waitFor();
    const ax = await new AxeBuilder({ page: p }).withRules(["scrollable-region-focusable"]).analyze();
    step("C1.6 review should 1: at 400 px every sideways-scrolling area takes keyboard focus (axe scrollable-region-focusable)", ax.violations.length === 0, ax.violations.map((v) => v.nodes.map((n) => n.target.join(" ")).join("; ")).join(" | ") || "none");

    // -------------------------------------------------------------- break K1: keyboard on the "Filed as" select
    await p.setViewportSize({ width: 1440, height: 900 }); await p.goto(`${BASE}/c/${wp}/forms`); await filedAs().waitFor();
    const patches = []; p.on("request", (rq) => { if (rq.method() === "PATCH") patches.push(rq.url()); });
    const chan = p.getByRole("combobox", { name: /^How .* is filed$/ }).first(); const n0 = patches.filter((u) => /\/channel$/.test(u)).length;
    // Headless Chrome on the Mac opens a closed select's popup on ArrowDown instead of changing it, so each arrow press is
    // a key event on the select followed by the change it makes (what a person's arrow press does in a real browser).
    const arrow = async (v) => { await chan.dispatchEvent("keydown", { key: "ArrowDown" }); await chan.selectOption(v); await p.waitForTimeout(80); };
    await chan.focus(); await arrow("ONLINE"); await arrow("PAPER");
    const cDuring = patches.filter((u) => /\/channel$/.test(u)).length - n0, cFocus = await p.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? "");
    await p.keyboard.press("Tab"); await p.waitForTimeout(900);
    step("C1.6 break K1: arrow presses on Filed as save nothing until focus leaves, then once; focus stayed on it", cDuring === 0 && /is filed$/.test(cFocus) && patches.filter((u) => /\/channel$/.test(u)).length - n0 === 1, `while pressing ${cDuring}, focus "${cFocus}", after Tab ${patches.filter((u) => /\/channel$/.test(u)).length - n0}`);
    await ctx.close();

    // -------------------------------------------------------------- break m4: the combination page's forms wait for the person
    {
      const c = await b.newContext({ viewport: { width: 1440, height: 900 } }); const q = await c.newPage();
      await q.route("**/api/session**", async (r) => { await new Promise((res) => setTimeout(res, 1500)); await r.continue(); });
      await q.goto(`${BASE}/c/${wp}/forms`); // S5: the channels are on the Forms tab
      let readOnly = 0; const until = Date.now() + 3000;
      const filed = () => q.getByRole("combobox", { name: /^How .* is filed$/ });
      while (Date.now() < until) { if (await q.locator('[data-line]').count() && !(await filed().count())) readOnly++; await q.waitForTimeout(50); }
      step("C1.6 break m4: while the session loads, the author never sees the forms' channels as read-only words", readOnly === 0 && await filed().count() >= 1, `read-only looks ${readOnly}`);
      await c.close();
    }
  } finally { await b.close(); }
  console.log(fail ? `${fail} FAILED` : "all passed");
  process.exit(fail ? 1 : 0);
})();
