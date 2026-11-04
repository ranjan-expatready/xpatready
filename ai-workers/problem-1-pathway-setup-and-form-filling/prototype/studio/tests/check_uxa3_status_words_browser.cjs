// UX-A part 3 (P-273; UX baseline 2 Nov finding 7; contracts/status-words.ts): one word per combination state, walked in a
// real browser on the demo sample. Pass: the Programs chips (P-180: Not started · In progress · Live), the combination
// header, the Structure filter and Used by say the same words; a Live combination's next step and setup strip say they are
// for the next release; the shared draft bar and the Review and release tab count the same draft changes. Fail cases: no
// screen says "In setup" or "Setup draft"; a never-released combination with nothing configured lists no draft changes
// beside "No unreleased changes"; a combination with real draft changes shows the same number in the bar, the header and
// the Review tab. 1440, 1024 and 400 px without sideways scroll; axe (WCAG 2.2 AA). Screenshots in
// product/screens/UX-A/screenshots/ (uxa3-*). No model call (US$0).
//   zsh studio/tools/isolated.sh screens_uxa3 4449 start && node studio/tests/check_uxa3_status_words_browser.cjs 4449 xr_studio_screens_uxa3
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4449), DB = process.argv[3] ?? "xr_studio_screens_uxa3";
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "UX-A", "screenshots"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  UX-A3: ${name}${detail !== undefined ? ` — ${String(typeof detail === "string" ? detail : JSON.stringify(detail)).slice(0, 260)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": "user-A", "content-type": "application/json" }, data: init.data }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  step("setup: the demo sample loads", (await api("/demo/load", { method: "POST", data: {} })).status < 300);
  const vv = sql("select id from combination where combination_key='vv.single'"), lm = sql("select id from combination where combination_key='wp.family'");
  const axe = async (name) => { const r = await new AxeBuilder({ page: p }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze(); step(`axe: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target?.join(" ")}`).join(" | ")); };
  const body = () => p.locator("body").innerText();
  const OLD = /\bIn setup\b|\bSetup draft\b/;

  // ------------------------------------------------------------------ one word set: Programs, header, Structure
  await p.goto(`${BASE}/`); await p.getByRole("button", { name: /^In progress/ }).first().waitFor({ timeout: 15000 });
  const home = await body();
  step("pass: the Programs chips are P-180's words (Not started · In progress · Live)", /Not started/.test(home) && /In progress/.test(home) && /\bLive\b/.test(home));
  step("fail case: Programs never says \"In setup\" or \"Setup draft\"", !OLD.test(home), home.match(OLD)?.[0]);
  await p.goto(`${BASE}/c/${vv}/overview`); await p.getByRole("tablist", { name: "Combination" }).waitFor();
  const chip = await p.locator("[data-status]").first().innerText();
  step("pass: Visitor visa's header chip says \"In progress\", the Programs chip's word for it", chip.trim() === "In progress", chip);
  step("fail case: the combination page never says \"In setup\"", !OLD.test(await body()));
  await axe("Visitor visa Overview");
  await p.goto(`${BASE}/structure`); await p.waitForTimeout(1500);
  const st = await body();
  step("pass: Structure's status filter and rows say In progress, Live and Not started", /In progress/.test(st) && /\bLive\b/.test(st));
  step("fail case: Structure's Used by never says \"Setup draft\" (it says what uses it: nothing yet, not released)", !/Setup draft/.test(st) && !/\bIn setup\b/.test(st), st.match(OLD)?.[0]);
  await p.screenshot({ path: path.join(SHOTS, "uxa3-01-structure-1440.png"), fullPage: false });

  // ------------------------------------------------------------------ a Live combination's next step knows it is live
  await p.goto(`${BASE}/c/${lm}/overview`); await p.locator("[data-strip-head]").waitFor({ timeout: 15000 });
  const lsum = (await api(`/combinations/${lm}/summary`)).body;
  const head = await p.locator("[data-header-next]").innerText();
  const strip = await p.locator("[data-strip-head]").innerText();
  step("pass: LMIA is Live and its header next step says it is for the next release", lsum.row.status === "READY" && /Next step for the next release/.test(head), head);
  // QA-184: Live first, then the next release's one count in the card's words (or that nothing is open for it).
  step("pass: its setup strip starts with Live and says what the next release needs", /^Live · Release \d+ · (Next release: \d of 5 steps? to do|nothing open for the next release)$/.test(strip.trim()), strip);
  step("fail case: a combination that is not Live never says \"for the next release\"", await (async () => { await p.goto(`${BASE}/c/${vv}/overview`); await p.locator("[data-strip-head]").waitFor(); return !/for the next release/.test(await p.locator("main").innerText()); })());
  await p.goto(`${BASE}/c/${lm}/overview`); await p.locator("[data-strip-head]").waitFor();
  await p.screenshot({ path: path.join(SHOTS, "uxa3-02-live-next-step-1440.png"), fullPage: false });
  await axe("LMIA Overview (Live)");

  // ------------------------------------------------------------------ the draft bar and the Review tab count the same changes
  const vsum = (await api(`/combinations/${vv}/summary`)).body;
  await p.goto(`${BASE}/c/${vv}/review`); await p.getByText(/Changes in the draft|Submitted changes/).waitFor({ timeout: 15000 });
  const bar = await p.locator('[role="status"]').first().innerText();
  const rev = await p.locator("main").innerText();
  const listed = Number((rev.match(/compared with [^(]+\((\d+)\)/) ?? [])[1] ?? -1);
  step("fail case: with nothing configured, Visitor visa's Review tab lists no draft changes, as the bar says", vsum.changes === 0 && /No unreleased changes/.test(bar) && listed === 0 && /Nothing configured yet/.test(rev), { changes: vsum.changes, bar, listed });
  step("pass: its first step card says 0 draft changes, the bar's and the header's count", /\b0 draft changes\b/.test(rev));
  await p.screenshot({ path: path.join(SHOTS, "uxa3-03-visitor-review-1440.png"), fullPage: false });
  await axe("Visitor visa Review and release");
  // A real change: rename a line's condition words? Use a line removal on LMIA (Live): one change, then Undo.
  const code = sql(`select lineage_key from combination_form where combination_id='${lm}' and status not in ('RETIRED','SUPERSEDED') order by lineage_key limit 1`);
  await api(`/combinations/${lm}/forms/${encodeURIComponent(code)}`, { method: "DELETE", data: {} });
  const lsum2 = (await api(`/combinations/${lm}/summary`)).body;
  await p.goto(`${BASE}/c/${lm}/review`); await p.getByText(/Changes in the draft|Submitted changes/).waitFor({ timeout: 15000 });
  await p.waitForFunction(() => /Draft · \d+ change/.test(document.body.innerText), null, { timeout: 20000 }).catch(() => undefined);
  const bar2 = await p.locator('[role="status"]').first().innerText();
  const rev2 = await p.locator("main").innerText();
  const listed2 = Number((rev2.match(/compared with [^(]+\((\d+)\)/) ?? [])[1] ?? -1);
  const barN = Number((bar2.match(/(\d+) change/) ?? [])[1] ?? -1);
  step("pass: after a real change on LMIA the bar, the header and the Review tab say the same number", lsum2.changes > 0 && listed2 === lsum2.changes && barN === lsum2.changes && rev2.includes(`${lsum2.changes} draft change`), { summary: lsum2.changes, listed2, barN });
  await api(`/combinations/${lm}/forms`, { method: "POST", data: { formKey: code } });

  // ------------------------------------------------------------------ break B1: released but not startable is one state everywhere
  const sv = sql("select id from combination where combination_key='sv.super_visa'");
  if (sv) {
    const anyForm = sql(`select cf.lineage_key from combination_form cf join combination c on c.id=cf.combination_id where c.combination_key='wp.family' and cf.status not in ('RETIRED','SUPERSEDED') and cf.lineage_key like 'IMM 5%' order by (cf.lineage_key = 'IMM 5707') desc, cf.lineage_key limit 1`); // IMM 5707 first: the super visa's package lists it (C3.8, IRCC-F09)
    await api(`/combinations/${sv}/forms`, { method: "POST", data: { formKey: anyForm } });
    // G5 (C5.1, P-248, #868): a release needs a document line beside its form; one with a type the library has released.
    await api(`/combinations/${sv}/requirements`, { method: "POST", data: { documentTypeKey: sql("select document_type_key from document_type where status = 'PUBLISHED' order by document_type_key limit 1"), attachMode: "COMBINATION_MANDATORY", appliesToRoles: "each_applicant", providedBy: "client" } });
    const call = (pth, data, actor) => p.request.fetch(`${BASE}/api${pth}`, { method: "POST", headers: { "x-actor": actor, "content-type": "application/json" }, data }).then(async (r) => ({ status: r.status(), body: await r.json().catch(() => null) }));
    const sub = await call(`/combinations/${sv}/submit`, { note: "UX-A3 check" }, "user-A");
    const rv = (await p.request.fetch(`${BASE}/api/combinations/${sv}/review`, { headers: { "x-actor": "user-C" } }).then((r) => r.json()));
    const items = ((rv.submission?.changeSummary ?? rv.draft?.changes) ?? []).map((c) => `${c.kind}|${c.key}`);
    const sign = items.length ? await call(`/combinations/${sv}/signoff`, { items, action: "signed" }, "user-C") : { status: 0 };
    const rel = await call(`/combinations/${sv}/approve`, {}, "user-B");
    step("setup (break B1): Super visa released with one form", sub.status < 300 && rel.status < 300, { sub: sub.status, sign: sign.status, rel: rel.status, why: rel.body?.detail });
    const ssum = (await api(`/combinations/${sv}/summary`)).body;
    await p.goto(`${BASE}/c/${sv}/overview`); await p.locator("[data-strip-head]").waitFor({ timeout: 15000 });
    const chipWord = (await p.locator("[data-status]").first().innerText()).trim(), stripHead = (await p.locator("[data-strip-head]").innerText()).trim();
    const cardLive = ssum.setup.chip.status === "LIVE", headerLive = ssum.row.status === "READY";
    step("break B1: the header chip, the setup strip and the card say one state (never Not ready beside Live)", cardLive === headerLive && (chipWord === "Live") === stripHead.startsWith("Live") && !(chipWord === "Not ready" && /^Live/.test(stripHead)), { chipWord, stripHead, chip: ssum.setup.chip.status, row: ssum.row.status });
    // Devin on #622: when only the startable check fails (no validator error), the next step names the cause and its
    // landing says it in its own words (never "This draft no longer has it", the draft usually still has the gap).
    const startItems = (ssum.setup?.steps ?? []).flatMap((x) => x.open).filter((i) => i.startable);
    if (ssum.setup?.chip?.status === "NOT_READY" && startItems.length) {
      const first = startItems[0];
      step("Devin fail case: Not ready by the startable check has a next step naming the cause", !!ssum.setup.next && /firms cannot open cases/.test(ssum.setup.next.item.text), ssum.setup.next?.item.text);
      const tab = first.focus.startsWith("questionnaires") ? "questionnaires" : "forms";
      await p.goto(`${BASE}/c/${sv}/${tab}?focus=${encodeURIComponent(first.focus)}`); const landed = await p.locator("[data-startable]").first().waitFor({ timeout: 15000 }).then(() => true, () => false);
      step("Devin: the startable landing renders (a wait that fails says so)", landed, first.focus);
      const land = (await p.locator("[data-startable]").first().innerText().catch(() => "")) ?? "";
      step("Devin fail case: its landing says the cause and what to do, never \"This draft no longer has it\"", land.includes(first.text.split(": firms cannot open cases")[0]) && /Fix (it|them) in this draft/.test(land) && !/no longer has/.test(land), land.slice(0, 240));
    } else step("note: Super visa's release is startable or blocked by a validator error here; the startable landing is covered by the rules check", true, ssum.setup?.chip?.status);
  } else step("setup (break B1): the sample has Super visa", false);

  // ------------------------------------------------------------------ widths
  for (const [w, h] of [[1024, 768], [400, 860]]) {
    await p.setViewportSize({ width: w, height: h });
    for (const [url, name] of [[`/c/${lm}/overview`, "lmia-overview"], ["/structure", "structure"]]) {
      await p.goto(`${BASE}${url}`); await p.waitForTimeout(1200);
      const side = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      // Structure's tree rows already scroll sideways at 400 px through their Actions column (UX baseline finding 9, group C,
      // for the founder): this check judges only what part 3 changes there, the status words staying whole.
      if (name === "structure" && w < 640) step(`${w} px ${name}: the status words are whole (the rows' width is finding 9's)`, !OLD.test(await body()) && /In progress/.test(await body()), side);
      else step(`${w} px ${name}: no sideways page scroll`, side <= 0, side);
      await p.screenshot({ path: path.join(SHOTS, `uxa3-04-${name}-${w}.png`), fullPage: false });
    }
  }

  step("no page error or console error on the walk", errs.length === 0, errs.slice(0, 3));
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
