// qa after-merge 6b424941 (1 Nov, round 5): C2.12 slice 3 (#241), one form's guided path on the Forms tab, walked as
// an author would: every form row's step chip, the rail it opens, each step's link, resume by ?setup=, a form that is
// gone, the wrong role by URL, keyboard and Escape, three widths, axe, and To review by ?form=.
//   zsh studio/tools/isolated.sh qa_wk 4472 start && node studio/tests/qa/check_qa_am_1101d_c212_walk.cjs 4472
// Sample data (Load sample; C2.12 does not load it), no STUDIO_*_LIVE, US$0.
const { chromium } = require("playwright");
const { default: AxeBuilder } = require("@axe-core/playwright");
const fs = require("fs"), path = require("path");
const PORT = Number(process.argv[2] ?? 4472), BASE = `http://localhost:${PORT}`;
const SHOTS = path.resolve(__dirname, "..", "..", "..", "..", "product", "qa", "reports", "2026-11-01-after-merge-5"); fs.mkdirSync(SHOTS, { recursive: true });
let pass = 0, fail = 0;
const step = (n, ok, d) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${n}${d === undefined ? "" : ` — ${(typeof d === "string" ? d : JSON.stringify(d)).slice(0, 500)}`}`); };
const api = async (url, actor = "user-A", method = "GET", body) => { const r = await fetch(`${BASE}/api${url}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined }); let j = null; try { j = await r.json(); } catch {} return { status: r.status, body: j }; };
const norm = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

(async () => {
  if (!(await api("/demo/status")).body?.loaded) step("setup: Load sample", (await api("/demo/load", "user-A", "POST")).status === 201);
  const b = await chromium.launch({ headless: true, ...(fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : { channel: "chrome" }) });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errors = []; p.on("pageerror", (e) => errors.push(String(e)));
  const actAs = async (a) => { await p.goto(BASE); await p.evaluate((x) => localStorage.setItem("xr-actor", x), a); };
  await actAs("user-A");
  const rows = (await api("/catalogue?pathway=INDIVIDUAL&filter=all")).body.rows.filter((r) => r.combinationId);

  // ---- 1. every form row's chip says what /progress says (one truth, P-157)
  const chipMismatch = [], chipSeen = []; let firstCombo = null, firstCode = null;
  for (const r of rows) {
    await p.goto(`${BASE}/c/${r.combinationId}/forms`); await p.waitForLoadState("networkidle");
    const chips = p.locator("[data-step-chip]");
    for (let i = 0; i < await chips.count(); i++) {
      const code = await chips.nth(i).getAttribute("data-step-chip"), text = norm(await chips.nth(i).innerText());
      const pr = await api(`/combinations/${r.combinationId}/forms/${encodeURIComponent(code)}/progress`);
      const cur = pr.body?.steps?.find((s) => s.key === pr.body.current);
      const ok = pr.status === 200 && (pr.body.current === null ? /all 6 steps done/.test(text) : text.includes(`Step ${cur.n} of 6`));
      chipSeen.push(`${r.label} ${code}: ${text}`); if (!ok) chipMismatch.push(`${r.label} ${code}: chip "${text}" · progress ${pr.status} ${pr.body?.current}`);
      if (!firstCombo) { firstCombo = r.combinationId; firstCode = code; }
    }
  }
  step("C2.12 slice 3: each form row on a Forms tab shows a step chip", chipSeen.length > 0, chipSeen.length);
  step("C2.12 slice 3 (P-157): every chip names the same step as GET …/progress", chipMismatch.length === 0, chipMismatch.length ? chipMismatch : chipSeen.slice(0, 6));

  // ---- 2. open the rail from a chip like a person, by keyboard
  await p.goto(`${BASE}/c/${firstCombo}/forms`); await p.waitForLoadState("networkidle");
  const chip = p.locator(`[data-step-chip="${firstCode}"]`).first();
  await chip.focus(); await p.keyboard.press("Enter");
  const rail = p.locator("[data-setup-rail]");
  await rail.waitFor({ timeout: 10000 }).catch(() => {});
  step("C2.12 keyboard: Enter on the chip opens the guided path", await rail.count() === 1);
  step("C2.12 BR-4: the address carries ?setup=<form>", new URL(p.url()).searchParams.get("setup") === firstCode, p.url());
  const stepsShown = await p.locator("[data-setup-rail] [data-step]").count();
  step("C2.12 BR-3: the path shows six steps", stepsShown === 6, stepsShown);
  const currentCount = await p.locator('[data-setup-rail] [aria-current="step"]').count();
  const prog = (await api(`/combinations/${firstCombo}/forms/${encodeURIComponent(firstCode)}/progress`)).body;
  step("C2.12: exactly one step is marked current, or none when all are done", currentCount === (prog.current === null ? 0 : 1), { currentCount, current: prog.current });
  const nfy = p.locator("[data-next-for-you]");
  step("C2.12: the panel says the person's next step or why there is none, in words", (await nfy.count()) > 0 || prog.current === null, norm(await nfy.first().innerText().catch(() => "")));
  await p.screenshot({ path: path.join(SHOTS, "01-c212-rail-1440.png") });
  const ax = await new AxeBuilder({ page: p }).include("[role=dialog]").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  step("axe: the guided path panel is clean", ax.violations.length === 0, ax.violations.map((v) => `${v.id}: ${v.nodes.length}`));

  // ---- 2b. a person clicks "Your next step": where do they land, and is the action in front of them?
  if (await p.locator("[data-next-for-you] a").count()) {
    const said = norm(await p.locator("[data-next-for-you] a").innerText());
    await p.locator("[data-next-for-you] a").click(); await p.waitForLoadState("networkidle"); await p.waitForTimeout(400);
    const land = await p.evaluate(() => ({ url: location.pathname + location.search, focus: (document.activeElement?.textContent || document.activeElement?.tagName || "").trim().slice(0, 60), dialog: !!document.querySelector("[data-setup-rail]") }));
    const words = said.split(" or ").map((w) => w.trim().toLowerCase());
    step(`C2.12 "Your next step" (${said}): the click lands on that action (focused or the only thing in view), not just the same tab`, words.some((w) => land.focus.toLowerCase().includes(w)), land);
    await p.screenshot({ path: path.join(SHOTS, "03-c212-after-next-step-click-1440.png") });
    await p.goto(`${BASE}/c/${firstCombo}/forms?setup=${encodeURIComponent(firstCode)}`); await p.waitForLoadState("networkidle"); await rail.waitFor({ timeout: 10000 }).catch(() => {});
  }
  // ---- 3. reload and Back: resume (BR-4)
  await p.reload(); await p.waitForLoadState("networkidle");
  step("C2.12 BR-4 reload: the same form's path is open again", await p.locator(`[data-setup-rail]`).count() === 1);
  await p.keyboard.press("Escape"); await p.waitForTimeout(300);
  step("C2.12 Escape closes the path and drops ?setup=", (await rail.count()) === 0 && !new URL(p.url()).searchParams.get("setup"), p.url());
  const back = await p.evaluate(() => document.activeElement?.getAttribute("data-step-chip"));
  step("C2.12 focus returns to the chip that opened it", back === firstCode, back);

  // ---- 4. every step link and "what's left" link lands on a real screen
  const links = [...(prog.steps ?? []).filter((s) => s.next).map((s) => [s.key, s.next.href]), ...(prog.whats_left ?? []).filter((w) => w.href).map((w) => [`left:${w.step}`, w.href]), ...(prog.next_for_you ? [["next_for_you", prog.next_for_you.href]] : [])];
  const dead = [];
  for (const [k, href] of links) {
    await p.goto(`${BASE}${href}`); await p.waitForLoadState("networkidle");
    const t = norm(await p.locator("main").innerText().catch(() => ""));
    if (!t || /not found|could not be read|Something went wrong|Page not found/i.test(t.slice(0, 400))) dead.push(`${k} ${href}: ${t.slice(0, 120)}`);
  }
  step("C2.12 BR-1: every step and what's-left link opens a screen that exists", dead.length === 0, dead.length ? dead : links.map((l) => l.join(" ")));

  // ---- 5. To review by ?form= (slice 1 said the screen ignored it)
  await p.goto(`${BASE}/review?form=${encodeURIComponent(firstCode)}`); await p.waitForLoadState("networkidle");
  const trText = norm(await p.locator("main").innerText());
  // Not built yet on purpose: the screen's ?form= is a later slice (F3 build-notes.md:74, slices 5–8); the API has it (#179). Information, not a fail.
  console.log(`INFO  C2.12 To review ?form= on the screen (later slice): ${trText.includes(firstCode) ? "now shows one form's items: count it as a check" : "still shows every item"}`);

  // ---- 6. a form that is gone, a nonsense value, the wrong role
  await p.goto(`${BASE}/c/${firstCombo}/forms?setup=IMM%209999`); await p.waitForLoadState("networkidle");
  await p.locator("[role=dialog]").getByText(/Reading where this form stands/).waitFor({ state: "detached", timeout: 10000 }).catch(() => {});
  const goneText = norm(await p.locator("[role=dialog]").innerText().catch(() => ""));
  step("C2.12 ?setup= a form not in the library: says so in words, no Try again", /not in the library|not on this combination/i.test(goneText) && !/Try again/.test(goneText), goneText.slice(0, 200));
  await p.goto(`${BASE}/c/${firstCombo}/forms?setup=${encodeURIComponent("<script>x</script>".repeat(5))}`); await p.waitForLoadState("networkidle");
  await p.locator("[role=dialog]").getByText(/Reading where this form stands/).waitFor({ state: "detached", timeout: 10000 }).catch(() => {});
  const longText = norm(await p.locator("[role=dialog]").innerText().catch(() => ""));
  step("C2.12 ?setup= nonsense 90 chars: title cut to 40, a plain message, no page error", /Set up .{1,41} on this combination/.test(longText) && errors.length === 0, longText.slice(0, 200));
  for (const who of ["user-O", "user-P"]) {
    await actAs(who); await p.goto(`${BASE}/c/${firstCombo}/forms?setup=${encodeURIComponent(firstCode)}`); await p.waitForLoadState("networkidle");
    step(`C2.12 wrong role (${who}) by URL: no guided path`, (await p.locator("[data-setup-rail]").count()) === 0);
    const pr = await api(`/combinations/${firstCombo}/forms/${encodeURIComponent(firstCode)}/progress`, who);
    step(`C2.12 wrong role (${who}) API: refused with a Problem Details message`, pr.status === 403 && !!(pr.body?.detail || pr.body?.message), `${pr.status} ${pr.body?.detail ?? ""}`);
  }
  await actAs("user-A");

  // ---- 7. widths: no sideways scroll with the rail open
  for (const [w, h] of [[400, 800], [1024, 768], [1440, 900]]) {
    await p.setViewportSize({ width: w, height: h });
    await p.goto(`${BASE}/c/${firstCombo}/forms?setup=${encodeURIComponent(firstCode)}`); await p.waitForLoadState("networkidle");
    const side = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const chipOver = await p.locator(`[data-step-chip]`).first().evaluate((e) => e.scrollWidth - e.clientWidth).catch(() => 0);
    step(`C2.12 ${w} px: no sideways scroll with the path open`, side <= 0, side);
    step(`C2.12 ${w} px: the chip's words wrap inside it`, chipOver <= 1, chipOver);
    await p.screenshot({ path: path.join(SHOTS, `02-c212-rail-${w}.png`) });
  }
  // ---- 8. QA-77 retest (#245): one way to say each person on every page of a combination
  await p.setViewportSize({ width: 1440, height: 900 });
  const vv = rows.find((r) => r.nodeKey === "individual.visitors.visitor_visa")?.combinationId;
  const said = {};
  for (const tab of ["overview", "forms", "documents", "questionnaires", "preview", "review"]) {
    await p.goto(`${BASE}/c/${vv}/${tab}`); await p.waitForLoadState("networkidle");
    const t = await p.locator("body").innerText();
    said[tab] = [...new Set((t.match(/\b(Principal applicant|Main applicant|Applicant|Spouse or partner(?: \(travelling\))?|Spouse|Partner|Child(?: \(travelling\))?|Dependent child|Dependant)\b/g) ?? []))].sort();
  }
  const principal = new Set(Object.values(said).flat().filter((w) => /applicant/i.test(w)));
  step("QA-77 retest C11.12 (PRODUCT §4): the principal person has one name on every tab of Visitor visa", principal.size <= 1, said);
  const spouse = new Set(Object.values(said).flat().filter((w) => /spouse|partner/i.test(w)));
  step("QA-77 retest C11.12: the spouse or partner has one name on every tab of Visitor visa", spouse.size <= 1, [...spouse]);
  step("no page error on the way", errors.length === 0, errors.slice(0, 3));
  await b.close();
  console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
