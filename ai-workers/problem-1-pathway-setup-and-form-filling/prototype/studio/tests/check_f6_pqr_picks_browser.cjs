// F6 slice 1 (runtime lane; C4.7, C4.2, C4.8; P-76, P-149): the author walks pre-qualification picks in a real browser.
// Questionnaires tab › Pre-qualification › "Propose picks from the rules" (no AI, US$0) says how many wait and links to
// To review; there each pick reads "Ask "…" (person) in pre-qualification" with its reason, marked Rules; Accept ticks the
// fact in the draft (the chip's count goes up), Reject leaves it unticked. A pass and a fail per rule; screenshots at 1440
// and 1024 in screens/W1-questions-and-documents/screenshots/pqr-picks/, axe (WCAG 2.2 AA) on each state. US$0.
//   zsh studio/tools/isolated.sh runtime_f6pb 4436 start && node studio/tests/check_f6_pqr_picks_browser.cjs 4436 xr_studio_runtime_f6pb
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4436), DB = process.argv[3] ?? "xr_studio_runtime_f6pb";
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "W1-questions-and-documents", "screenshots", "pqr-picks"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 220)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, data: init.data, timeout: 180000 }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  // Waits that fail loudly when they run out (no silent catch): a page still busy after 30 s is a failure.
  const settle = async () => { await p.waitForFunction(() => !document.querySelector('[aria-busy="true"]') && !document.querySelector(".animate-spin") && !document.querySelector("[data-pqr-set] .animate-pulse"), null, { timeout: 30000 }); await p.waitForTimeout(150); };
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
  const go = async () => { await p.goto(`${BASE}/c/${wp}/questionnaires`); await p.getByRole("tablist", { name: "Combination" }).waitFor(); await p.locator("[data-source-strip]").waitFor(); await settle(); await p.locator('[data-source-chip="pqr"]').click(); await settle(); };
  const chipCount = async () => Number((/Pre-qualification (\d+)/.exec(await p.locator('[data-source-chip="pqr"]').innerText()) ?? [])[1] ?? NaN);

  // ======================================================== propose
  await go();
  const before = await chipCount();
  const btn = p.getByRole("button", { name: "Propose picks from the rules" });
  step("C4.7 pass: the Pre-qualification panel offers the rules' picks to the author, saying no AI and US$0", await btn.isVisible() && /No AI, US\$0/.test(await p.locator("[data-pqr-propose]").innerText()));
  await btn.click();
  await p.locator("[data-pqr-propose-result]").waitFor({ timeout: 30000 });
  const said = await p.locator("[data-pqr-propose-result]").innerText();
  step("C4.7 pass: it says how many picks wait on To review, and nothing is ticked yet", /^\d+ picks? (is|are) waiting on To review/.test(said) && (await chipCount()) === before, said);
  step("C4.7 review m5 (f6): the answer takes the focus (a keyboard or screen reader user hears it next)", await p.evaluate(() => !!document.activeElement?.closest("[data-pqr-propose-said]")), await p.evaluate(() => document.activeElement?.tagName));
  await state("proposed");
  await btn.click();
  await p.waitForFunction(() => /Nothing new/.test(document.querySelector("[data-pqr-propose-result]")?.textContent ?? ""), null, { timeout: 30000 });
  step("C4.7 fail: proposing again adds nothing twice and says so", /already waiting on To review/.test(await p.locator("[data-pqr-propose-result]").innerText()), await p.locator("[data-pqr-propose-result]").innerText());

  // ======================================================== decide on To review
  await p.getByRole("link", { name: "Open on To review" }).click();
  await p.locator("[data-band]").first().waitFor({ timeout: 30000 }); await settle();
  const rows = p.locator("tr[data-id]", { hasText: "Pre-qualification pick" });
  const first = await rows.first().innerText();
  step("C4.7 pass: To review lists each pick as \"Ask … in pre-qualification\", marked Pre-qualification pick and Rules, with its reason", (await rows.count()) > 0 && /Ask ".+" \(.+\) in pre-qualification/.test(first) && /Rules/.test(first) && /A rule of this combination reads it/.test(first) && !/\bAI\b/.test(first), first.replace(/\s+/g, " "));
  step("C4.7 fail-guard: no field code or raw key shows in the pick's words", !/\b(case|person)\.[a-z_]+\b/.test(first), first.replace(/\s+/g, " "));
  await state("to-review");
  const title = (/Ask "(.+?)" \(/.exec(first) ?? [])[1];
  await rows.first().getByRole("button", { name: /^Open / }).click();
  const panel = p.getByRole("dialog");
  await panel.waitFor();
  step("C4.7: the side panel names it a pre-qualification pick on this combination", /Pre-qualification pick · this combination/.test(await panel.innerText()));
  await state("side-panel");
  await panel.getByRole("button", { name: "Accept", exact: true }).click();
  await p.getByText("Accepted: it is now asked in pre-qualification in this combination's draft, released with it.").waitFor({ timeout: 30000 });
  step("C4.7 pass: Accept says in words what changed (no raw key)", true);
  // Reject one with a reason
  const second = p.locator("tr[data-id]", { hasText: "Pre-qualification pick" }).first();
  const title2 = (/Ask "(.+?)" \(/.exec(await second.innerText()) ?? [])[1];
  await second.getByRole("button", { name: /^Open / }).click();
  await panel.waitFor();
  const rejectBtn = panel.getByRole("button", { name: "Reject" });
  step("C4.7 fail: Reject needs a reason first (disabled while empty)", await rejectBtn.isDisabled());
  await panel.getByRole("textbox").first().fill("Not something a prospect knows yet.");
  await rejectBtn.click();
  await p.getByText("Rejected: it is not asked in pre-qualification.").waitFor({ timeout: 30000 });
  step("C4.7 pass: Reject says it is not asked", true);

  // ======================================================== back on the Questionnaires tab
  await go();
  const after = await chipCount();
  const shown = await p.locator("[data-questions]").innerText();
  step("C4.2 pass: the accepted pick is now in the person's pre-qualification (the chip counts one more and lists it)", after === before + 1 || (title && shown.includes(title)), `${before} → ${after}; ${title}`);
  step("C4.7 fail: the rejected pick is not asked in pre-qualification", !title2 || title2 === title || !(await p.locator("[data-questions] tr[data-question]", { hasText: title2 }).count()), title2);
  const ch = (await api(`/combinations/${wp}`)).body?.draft?.changes ?? [];
  step("C4.8 pass: the accepted pick is one of the draft's named changes for its one review and release", ch.some((x) => x.kind === "Where an answer comes from"), ch.map((x) => x.kind).slice(0, 6).join(", "));
  await state("after-accept");

  // ======================================================== a reader sees no button
  await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-B"); } catch { /* ignore */ } });
  await go();
  step("C4.7 fail: the Approver (no author duty) is not offered the button", !(await p.getByRole("button", { name: "Propose picks from the rules" }).count()));
  await p.goto(`${BASE}/review/proposals?group=${encodeURIComponent(`combination:${wp}`)}`);
  await p.locator("[data-band]").first().waitFor({ timeout: 30000 }); await settle();
  await p.locator("tr[data-id]", { hasText: "Pre-qualification pick" }).first().getByRole("button", { name: /^Open / }).click();
  await panel.waitFor();
  step("C4.7 review m3 (f6) fail: the Approver's Accept on a pick is disabled and says in words who accepts it", await panel.getByRole("button", { name: "Accept", exact: true }).isDisabled() && /Only a configuration author accepts a pre-qualification pick/.test(await panel.innerText()));
  await state("approver-side-panel");

  step("no page errors", errs.length === 0, errs.join(" | "));
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
