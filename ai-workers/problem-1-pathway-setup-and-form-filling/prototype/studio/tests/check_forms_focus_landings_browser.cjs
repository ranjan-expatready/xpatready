// Forms lane (tech lead on #186, from screens #206 finding 6): the setup checklist's step 3 items land on the Forms tab.
// ?focus=forms:sources (Add n forms found) → the "Not set up yet" line; forms:lines (Map n forms) → the forms table;
// forms:problems (Fix n form problems) → the tab's form problems, the same errors the checklist counts; forms:held
// (Review new edition) → the held new editions, with the way to To review. Each lands like the other tabs
// (components/focus-item): scrolled to, focused, outlined 2 s, the address cleared. A passing and a failing case each;
// axe (WCAG 2.2 AA) on the landed states at 1440 and 390 px; screenshots into
// product/screens/F1-setup/screenshots/x1-forms/. Sample inputs, one held edition and one words-only condition made by
// the API or SQL; US$0 (no model call).
//   zsh studio/tools/isolated.sh forms_fl 4450 start && node studio/tests/check_forms_focus_landings_browser.cjs 4450 xr_studio_forms_fl
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4450), DB = process.argv[3] ?? "xr_studio_forms_fl";
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "F1-setup", "screenshots", "x1-forms"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(typeof detail === "string" ? detail : JSON.stringify(detail)).slice(0, 260)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, data: init.data, timeout: 180000 }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const openOf = async (id) => ((await api(`/combinations/${id}/summary`)).body.setup?.steps ?? []).flatMap((s) => s.open.map((i) => ({ ...i, tab: s.tab })));
  const hrefOf = (id, key) => `/c/${id}/forms?focus=${encodeURIComponent(key)}`;
  // Lands: the element is outlined, holds focus, and the address no longer has ?focus= (waits fail loudly).
  const land = async (id, key) => {
    await p.goto(`${BASE}${hrefOf(id, key)}`); await p.getByRole("tablist", { name: "Combination" }).waitFor();
    await p.locator(`[data-focus="${key}"][data-focused]`).waitFor({ timeout: 15000 });
    return p.evaluate((k) => { const el = document.querySelector(`[data-focus="${k}"]`); const r = el?.getBoundingClientRect(); return { outlined: !!el?.hasAttribute("data-focused"), focused: !!el && el === document.activeElement, focusInUrl: new URLSearchParams(location.search).has("focus"), inView: !!r && r.bottom > 0 && r.top < innerHeight, text: el?.textContent?.slice(0, 160) ?? "" }; }, key);
  };
  const ok = (l) => l.outlined && l.focused && !l.focusInUrl && l.inView;
  // Nothing lands (fail cases): wait for the tab's forms to draw, give the landing its chance, then nothing is outlined.
  const noLanding = async (id, key) => {
    await p.goto(`${BASE}${hrefOf(id, key)}`); await p.getByRole("tablist", { name: "Combination" }).waitFor();
    await p.locator('[data-focus="forms:lines"], [data-forms-empty]').first().waitFor({ timeout: 15000 }); await p.waitForTimeout(800);
    return { outlined: await p.locator("[data-focused]").count(), landed: await p.locator(`[data-focus="${key}"]`).count() };
  };
  const axe = async (label) => {
    for (const w of [1440, 390]) {
      await p.setViewportSize({ width: w, height: w > 1100 ? 900 : 812 }); await p.waitForTimeout(200);
      const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      step(`axe (WCAG 2.2 AA) ${label} at ${w} px: no violations`, r.violations.length === 0, r.violations.map((v) => `${v.id}: ${v.nodes.length}`));
      await p.screenshot({ path: path.join(SHOTS, `${label}-${w}.png`), fullPage: false });
    }
    await p.setViewportSize({ width: 1440, height: 900 });
  };

  // ======================================================== setup: the sample
  await p.goto(BASE);
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  const load = await api("/demo/load", { method: "POST" });
  if (load.status !== 201) throw new Error(`sample load failed: ${load.status}`);
  const idOf = (key) => sql(`select id from combination where combination_key='${key}'`);
  const sv = idOf("sv.super_visa"), sp = idOf("sp.student"), wp = idOf("wp.family");
  if (!sv || !sp || !wp) throw new Error("the sample has no Super visa, Study permit or Work permit family combination");

  // ======================================================== forms:sources
  let open = await openOf(sp);
  const src = open.find((i) => i.focus === "forms:sources");
  step("setup: Study permit's checklist has 'Add n forms found' on the Forms tab", !!src && src.tab === "forms", open.map((i) => i.focus));
  let l = await land(sp, "forms:sources");
  step("X1 forms:sources pass: lands on the 'Not set up yet' line: focused, outlined, in view, the address cleared", ok(l) && /^Not set up yet/.test(l.text), l);
  step("X1 forms:sources pass: the line counts the forms the checklist counts", new RegExp(`^Not set up yet: ${src?.count} forms? can be added from the library now`).test(l.text), { text: l.text, count: src?.count });
  await axe("01-sources");
  await p.waitForTimeout(2200);
  step("X1 forms:sources: the outline goes after 2 s", await p.locator("[data-focused]").count() === 0);
  // fail case: nothing is waiting on Work permit family, so forms:sources has nowhere to land.
  open = await openOf(wp);
  let none = await noLanding(wp, "forms:sources");
  step("X1 forms:sources fail case: with no forms found waiting (Work permit family), nothing is outlined and no line is drawn", !open.some((i) => i.focus === "forms:sources") && none.outlined === 0 && none.landed === 0, none);

  // ======================================================== forms:lines
  open = await openOf(sv);
  step("setup: Super visa's checklist has 'Map n forms'", open.some((i) => i.focus === "forms:lines"), open.map((i) => i.focus));
  l = await land(sv, "forms:lines");
  step("X1 forms:lines pass: lands on the forms table: focused, outlined, in view, the address cleared", ok(l) && await p.locator('[data-focus="forms:lines"]').locator("tr[data-line], tr[data-pending]").count() > 0, l);
  await axe("02-lines");
  // fail case: a key the tab does not hold lands nowhere and breaks nothing.
  none = await noLanding(sv, "forms:nothing_here");
  step("X1 fail case: an unknown forms key outlines nothing and keeps the tab working", none.outlined === 0 && await p.locator("tr[data-line], tr[data-pending]").count() > 0, none);

  // ======================================================== forms:problems
  none = await noLanding(wp, "forms:problems");
  step("X1 forms:problems fail case: with no form problems (Work permit family as loaded), nothing is outlined and nothing is a landing (warnings stay listed)", none.outlined === 0 && none.landed === 0 && !(await openOf(wp)).some((i) => i.focus === "forms:problems"), none);
  const lines = (await api(`/combinations/${wp}/workspace?tab=forms`)).body?.lines;
  const target = (lines ?? []).find((x) => !x.document);
  if (!target) throw new Error("Work permit family has no data form line to make a problem on");
  const patch = await api(`/combinations/${wp}/forms/${encodeURIComponent(target.code)}`, { method: "PATCH", data: { who: target.who, minAge: target.minAge, copies: target.copies, signedBy: target.signedBy, baseRevision: target.revision || undefined, attachMode: "ANSWER_CONDITIONAL", conditionPlain: "Only if the applicant has a spouse (words only, test)" } });
  step("setup: one form's condition left in words only (a release-blocking form problem)", patch.status < 300, patch);
  open = await openOf(wp);
  const prob = open.find((i) => i.focus === "forms:problems");
  l = await land(wp, "forms:problems");
  const blocks = await p.locator('[data-focus="forms:problems"] li').filter({ hasText: "Blocks release" }).count();
  step("X1 forms:problems pass: lands on the tab's form problems: focused, outlined, in view, the address cleared", ok(l) && /Turn "Only if the applicant has a spouse/.test(await p.locator('[data-focus="forms:problems"]').innerText()), l);
  step("X1 forms:problems pass: it lists as many release-blocking problems as the checklist counts", !!prob && blocks === prob.count, { blocks, count: prob?.count });
  await axe("03-problems");

  // ======================================================== forms:held
  none = await noLanding(wp, "forms:held");
  step("X1 forms:held fail case: with no new edition held, nothing is outlined and no notice is drawn", none.outlined === 0 && none.landed === 0, none);
  const ws = sql(`select workspace_id from combination where id='${wp}'`);
  sql(`insert into intake_item (id, workspace_id, file_name, stored_path, sha256, bytes, kind, code, title, edition_label, outcome, status, reason, created_by) values (gen_random_uuid(), '${ws}', 'imm5257e-next.pdf', 'var/test/imm5257e-next.pdf', repeat('f', 64), 1, 'form', '${target.code}', 'Test', '${target.code} (01-2099)', 'new_edition_held', 'HELD', 'Newer than the library''s edition (test row)', 'user-A')`);
  open = await openOf(wp);
  const held = open.find((i) => i.focus === "forms:held");
  step("setup: the checklist says 'Review new edition'", !!held && held.count === 1, open.map((i) => i.focus));
  l = await land(wp, "forms:held");
  step("X1 forms:held pass: lands on the held edition: focused, outlined, in view, the address cleared", ok(l) && l.text.includes(`${target.code} (01-2099)`), l);
  const toReview = p.locator('[data-focus="forms:held"]').getByRole("link", { name: /To review/ });
  step("X1 forms:held pass: the notice says the library edition is kept and links to To review", await toReview.count() === 1 && await toReview.getAttribute("href") === "/review" && /keeps using the edition in the library/.test(l.text), l.text);
  await axe("04-held");
  await toReview.click(); await p.waitForURL(/\/review$/);
  step("X1 forms:held pass: the link opens To review", /\/review$/.test(p.url()));

  step("no page errors", errs.length === 0, errs);
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
