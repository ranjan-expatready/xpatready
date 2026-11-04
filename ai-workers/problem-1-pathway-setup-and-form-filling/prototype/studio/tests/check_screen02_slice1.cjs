// Screen 02 slice 1 (Lead note 25 Oct 06:10): the To review page (C5.3, P-79) and the AI work log on today's data, and
// qa's QA-41 (dialogs open on their first field, not Close) and QA-42 (the sample note on a combination a person has
// changed). Isolated copy, empty first; the test loads the sample inputs itself, then makes one item of each kind
// through the same endpoints the screens use (a saved AI answer replayed: no model call, US$0). Screenshots of every
// state at 1440 and 1024 px into product/screens/02-ai-work/screenshots/slice1/, axe (WCAG 2.2 AA) on each.
//   zsh studio/tools/isolated.sh screens_s02 4441 start && node studio/tests/check_screen02_slice1.cjs 4441 xr_studio_screens_s02
const { setFilingModes } = require("./fixtures/steps-before-forms.cjs");
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const { speed } = require("./speed_budget.cjs"); // P-184: speed budgets judged only when the Mac is not busy
const PORT = Number(process.argv[2] ?? 4441), DB = process.argv[3] ?? "xr_studio_screens_s02";
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "02-ai-work", "screenshots", "slice1"); fs.mkdirSync(SHOTS, { recursive: true });
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
let fail = 0, lastStep = "(before the first step)";
const step = (name, ok, detail) => { lastStep = name; if (!ok) fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 220)}` : ""}`); };
/** A minimal one-page PDF whose title and text carry a form code and edition (synthetic test input, not on the manifest). */
function pdf(title, text) {
  const objs = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>", "", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", `<< /Title (${title}) >>`];
  const stream = `BT /F1 12 Tf 72 720 Td (${text}) Tj ET`;
  objs[3] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  let out = "%PDF-1.4\n"; const offs = [];
  objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const x = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${x}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|status of 4\d\d/.test(m.text())) errs.push(m.text()); });
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", ...(init.multipart ? {} : { "content-type": "application/json" }) }, data: init.data, multipart: init.multipart, timeout: init.timeout ?? 30000 }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const queue = (actor, qs = "") => api(`/review-queue${qs}`, { actor }).then((r) => r.body);
  const as = async (id) => { await p.evaluate((x) => { try { localStorage.setItem("xr-actor", x); } catch { /* ignore */ } }, id); };
  /** The page has its list (or its empty state), not the loading skeleton. */
  const ready = () => p.waitForFunction(() => !document.querySelector('[aria-label="Loading items to review"]') && (document.querySelector('table[aria-label="Items to review"]') || /Nothing (waits|matches|to review)|No AI work/.test(document.querySelector("main")?.textContent ?? "")), null, { timeout: 30000 });
  const open = async (qs = "") => { await p.goto(`${BASE}/review${qs}`); await ready(); };
  const row = (id) => p.locator(`tr[data-item="${id}"]`);
  let n = 0;
  const state = async (name) => {
    n++; const base = `${String(n).padStart(2, "0")}-${name}`;
    await p.screenshot({ path: path.join(SHOTS, `${base}-1440.png`), fullPage: true });
    const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    step(`axe: ${name} has no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
    await p.setViewportSize({ width: 1024, height: 768 });
    await p.screenshot({ path: path.join(SHOTS, `${base}-1024.png`), fullPage: true });
    step(`1024 px: ${name} has no sideways scroll`, !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
    // QA-113: the To review table fits its own box too (it was 760 px in about 735, scrolled sideways, "Item" cut to "em").
    const box = await p.evaluate(() => { const t = document.querySelector('table[aria-label="Items to review"]'); return t ? { table: t.scrollWidth, box: t.parentElement.clientWidth } : null; });
    if (box) step(`C5.3 QA-113: 1024 px: ${name}: the To review table fits its box, no sideways scroll inside it`, box.table <= box.box + 1, `${box.table} in ${box.box}`);
    await p.setViewportSize({ width: 1440, height: 900 });
  };

  // ======================================================== empty workspace: nothing waits
  await p.goto(BASE); await as("user-A");
  await open();
  step("C5.3: an empty workspace says nothing waits for you, with a way to Immigration programs", /Nothing waits for you/.test(await p.locator("main").textContent()) && await p.getByRole("link", { name: "Open Immigration programs" }).count() === 1);
  const navText = await p.getByRole("navigation", { name: "Studio" }).textContent();
  step("C5.3 P-79 P-125: To review is under Configure, after Program structure and Immigration programs (setup order)", /Configure\s*Program structure\s*Immigration programs\s*To review/.test(navText), navText.slice(0, 80));
  await state("empty");

  // ======================================================== setup (scaffolding): sample inputs + one item of each kind
  let r = await api("/demo/load", { method: "POST", timeout: 180000 });
  step("setup: sample inputs load through the form intake", r.status === 201, r.body?.seconds);
  const cat = (q) => api(`/catalogue?${q}`).then((x) => x.body);
  const sv = (await cat("pathway=INDIVIDUAL&filter=all")).rows.find((x) => x.nodeKey === "individual.visitors.super_visa");
  const att = (await api(`/combinations/${sv.combinationId}/attachments`)).body.find((a) => /IMM 5257 \(/.test(a.edition ?? ""));
  const run = ((await api(`/attachments/${att.id}/draft-options`)).body.saved_runs ?? []).find((x) => x.valid);
  r = await api(`/attachments/${att.id}/draft`, { method: "POST", data: { mode: "replay", runFile: run.file } });
  let svRow; for (let i = 0; i < 60; i++) { svRow = (await cat("pathway=INDIVIDUAL&filter=all")).rows.find((x) => x.nodeKey === sv.nodeKey); if (svRow.aiProposals > 0) break; await p.waitForTimeout(500); }
  step("setup: one replay of a saved AI answer on Super visa (no model call, US$0)", r.status < 300 && svRow.aiProposals > 0, svRow.aiProposals);
  // A combination submitted by the author (waiting for the reviewer or the approver).
  const ss = (await api("/combinations", { method: "POST", data: { nodeKey: "individual.work_permits.open.spouse_student" } })).body.combination;
  await api(`/combinations/${ss.id}/lines`, { method: "POST", data: { kind: "FORM", formKey: "IMM 1295" } });
  // G5 (C5.1, P-248, #868): a release needs a document line beside its form; one with a type the library has released.
  await api(`/combinations/${ss.id}/requirements`, { method: "POST", data: { documentTypeKey: sql("select document_type_key from document_type where status = 'PUBLISHED' order by document_type_key limit 1"), attachMode: "COMBINATION_MANDATORY", appliesToRoles: "each_applicant", providedBy: "client" } });
  await setFilingModes(api, ss.id); // C11.12 BR-7: a new release needs each applicant role's filing, as the author sets it
  r = await api(`/combinations/${ss.id}/submit`, { method: "POST", data: {} });
  const smeItems = ((await api(`/combinations/${ss.id}/review`)).body.submission?.changeSummary ?? []).filter((x) => x.needs_sme).length;
  step("setup: Spouse of a student submitted for review by the author", r.status === 201, `${smeItems} change(s) need the SME duty`);
  // W1-02 (P-102): portal captures are parked with the browser extension; the merge below is the second-person example.
  // A merge proposed by the author (two active text fields).
  const [keep, merge] = sql("select canonical_field_key from canonical_field where value_type='text' and status='PUBLISHED' and merged_into_key is null group by canonical_field_key order by canonical_field_key limit 2").split("\n");
  r = await api("/library/merges", { method: "POST", data: { keep, merge, reason: "Test input: the same meaning under two keys." } });
  step("setup: a merge proposed by the author waits for a second person", r.status < 300, r.body?.detail ?? `${merge} → ${keep}`);
  // A file that is not on the approved source list, uploaded by the author (held).
  r = await api("/intake", { method: "POST", multipart: { files: { name: "imm5476-next.pdf", mimeType: "application/pdf", buffer: pdf("IMM 5476 E: Use of a representative (test edition)", "IMM 5476 (01-2027) E") }, combinationId: ss.id } });
  step("setup: an unapproved file uploaded by the author is held", r.body?.results?.[0]?.outcome === "held", r.body?.results?.[0]?.outcome);

  // ======================================================== the queue for each person (API)
  const qa = await queue("user-A", "?filter=all"), qc = await queue("user-C", "?filter=all"), qb = await queue("user-B", "?filter=all");
  const item = (q, id) => q.items.find((i) => i.id === id);
  const svJob = sql(`select id from drafting_job where combination_id='${sv.combinationId}' and kind='field_map' order by started_at desc limit 1`);
  const ai = item(qa, `job:${svJob}`);
  step("C5.3: the AI proposals row says the same count as the Programs row (one count, two places)", ai?.state === "needs" && ai.next.label === `Review ${svRow.aiProposals} AI proposals` && ai.next.href === `/c/${sv.combinationId}/jobs/${svJob}`, ai?.next?.label);
  step("C5.3 BR-16: the AI proposals row names the form, the counts and the person, never a run id or a model", /^IMM 5257: \d+ form fields/.test(ai?.what ?? "") && !/run|studio-fieldmap|gpt|claude|user-A/i.test(`${ai?.what} ${ai?.by}`) && ai?.by === "Configuration author" && ai?.cost_usd === 0, `${ai?.what} · ${ai?.by}`);
  const subA = item(qa, `submission:${sql(`select id from review_submission where combination_id='${ss.id}' order by submitted_at desc limit 1`)}`);
  const subId = subA?.id;
  step("C5.3 BR-9: the person who submitted a combination waits; it says a different person acts", subA?.state === "waiting" && /not the person who submitted it/.test(subA.waiting_on) && subA.next === null, subA?.waiting_on);
  const subOther = smeItems ? item(qc, subId) : item(qb, subId);
  step(`C5.3: the ${smeItems ? "content reviewer signs" : "approver releases"} the submitted combination from To review (its Review and release tab)`, subOther?.state === "needs" && subOther.next.href === `/c/${ss.id}/review` && subOther.next.label === (smeItems ? "Review and sign" : "Release"), subOther?.next?.label);
  const mid = sql("select id from field_merge where status='PROPOSED' limit 1");
  const mA = item(qa, `merge:${mid}`), mC = item(qc, `merge:${mid}`);
  step("C5.3 BR-9: the proposer of a merge waits (\"You proposed it; a different person approves or rejects it.\"); no step offered", mA?.state === "waiting" && /You proposed it/.test(mA.waiting_on) && mA.next === null, mA?.waiting_on);
  step("C5.3: a second person sees Approve or reject the merge, linked to the merge review page (slice 2)", mC?.state === "needs" && mC.next.label === "Approve or reject the merge" && mC.next.href === `/review/merge/${mid}`, mC?.next?.href);
  step("C5.3 P-102: no portal capture or screen map item is ever listed (parked with the browser extension)", [qa, qb, qc].every((q) => q.items.every((i) => i.kind !== "capture" && i.kind !== "screen_map")));
  step("C5.3 BR-9: the proposer of a merge waits; a second person sees the merge to decide", item(qa, `merge:${mid}`)?.state === "waiting" && item(qc, `merge:${mid}`)?.state === "needs", item(qc, `merge:${mid}`)?.what);
  const heldId = sql("select id from intake_item where status='HELD' and outcome='held' order by created_at desc limit 1");
  // FIX (review Must 6): before the IRCC page is recorded, the uploader has the step and the second person waits.
  step("C5.3 C2.3: the uploader of a held file records its IRCC page on its page; the second person waits for it", item(qa, `held:${heldId}`)?.state === "needs" && item(qa, `held:${heldId}`)?.next?.label === "Record the IRCC page" && item(qa, `held:${heldId}`)?.next?.href === `/review/held/${heldId}` && item(qc, `held:${heldId}`)?.state === "waiting", item(qa, `held:${heldId}`)?.next);
  step("C5.3: the counts add up (Needs you + Waiting for others + Running = All) for each person", [qa, qb, qc].every((q) => q.counts.needs + q.counts.waiting + q.counts.running === q.counts.all && q.items.length === q.counts.all), JSON.stringify(qa.counts));
  const wa = await queue("user-A", "?filter=waiting");
  step("C5.3: Waiting for others lists only waiting items, oldest first", wa.items.length === qa.counts.waiting && wa.items.every((i) => i.state === "waiting") && wa.items.every((i, k, a) => k === 0 || a[k - 1].at <= i.at), wa.items.length);
  const kq = await queue("user-C", "?filter=all&kind=merge");
  step("C5.3: the Kind filter keeps only that kind", kq.items.length >= 1 && kq.items.every((i) => i.kind === "merge"), kq.items.length);
  r = await api("/review-queue?filter=all&kind=capture");
  step("C5.3 P-102 fail: the parked kind is no longer a filter (plain 400)", r.status === 400, r.body?.detail);
  const sq = await queue("user-A", "?filter=all&q=spouse"), fq = await queue("user-A", "?filter=all&q=imm%205257");
  step("C5.3: search finds items by combination name and by form code", sq.items.length >= 1 && sq.items.every((i) => /spouse/i.test(`${i.title} ${i.what}`)) && fq.items.length >= 1 && fq.items.every((i) => /IMM 5257/.test(`${i.title} ${i.what}`)), `${sq.items.length} · ${fq.items.length}`);
  r = await api("/review-queue?filter=everything");
  step("C5.3 fail: an unknown view is refused with a plain 400 Problem Details", r.status === 400 && r.body?.status === 400, r.body?.detail);
  r = await api("/review-queue", { actor: "nobody" });
  step("C5.3 fail: an unknown person is refused (401), never shown someone's queue", r.status === 401, r.body?.title);

  // ======================================================== the page (author)
  await as("user-A");
  let t0 = Date.now(); await open(); const firstView = Date.now() - t0;
  { const s = speed("performance: To review first view under 1 s with the sample data", firstView < 1000, `${firstView} ms`); step(s.label, s.ok, s.detail); }
  const chips = await p.getByRole("group", { name: "Show items" }).textContent();
  step("C5.3: four views with counts: Needs you · Waiting for others · Running · All", new RegExp(`Needs you · ${qa.counts.needs}.*Waiting for others · ${qa.counts.waiting}.*Running · ${qa.counts.running}.*All · ${qa.counts.all}`).test(chips), chips);
  await p.waitForFunction((x) => [...document.querySelectorAll('nav[aria-label="Studio"] a')].some((a) => a.textContent.startsWith("To review") && a.textContent.includes(String(x))), qa.counts.needs, { timeout: 20000 }).catch(() => {}); // the menu asks on its own
  const badge = await p.getByRole("navigation", { name: "Studio" }).getByRole("link", { name: /To review/ }).textContent();
  step("C5.3: the menu item carries the Needs you count", badge.includes(String(qa.counts.needs)), badge);
  step("C5.3: the author's AI proposals row links to its review page", (await row(`job:${svJob}`).locator("[data-next] a").textContent()) === ai.next.label);
  await state("needs-you-author");
  await p.getByRole("button", { name: /^Waiting for others/ }).click(); await p.waitForURL(/f=waiting/); await ready();
  step("C5.3: Waiting for others shows the merge as the proposer's, with no step", /You proposed it; a different person approves or rejects it/.test(await row(`merge:${mid}`).textContent()) && /No step for you/.test(await row(`merge:${mid}`).textContent()));
  await state("waiting-for-others-proposer");
  // Keyboard: the AI proposals step is reachable by Tab and opens its review page with Enter.
  await open();
  const link = row(`job:${svJob}`).locator("[data-next] a");
  // #119 review (EXPERIENCE [M]12, WCAG 2.4.7): reached by Tab, the next-step link shows a focus ring.
  await link.focus(); await p.keyboard.press("Shift+Tab"); await p.keyboard.press("Tab");
  const ring = await p.evaluate(() => { const a = document.activeElement; const cs = getComputedStyle(a); return { link: a?.tagName === "A" && !!a.closest("[data-next]"), ring: cs.boxShadow !== "none" || cs.outlineStyle !== "none", shadow: cs.boxShadow }; });
  step("C5.3 keyboard: a row's next step reached by Tab shows a focus ring", ring.link && ring.ring, JSON.stringify(ring));
  await p.keyboard.press("Enter"); await p.waitForURL(/\/jobs\//);
  step("C5.3 keyboard: Enter on a row's next step opens its review page", new URL(p.url()).pathname === ai.next.href, p.url());

  // ======================================================== the page (second person)
  await as("user-C"); await open();
  const mRow = await row(`merge:${mid}`).textContent();
  step("C5.3: the second person sees the merge as Needs you with Approve or reject the merge", /Needs you/.test(mRow) && /Approve or reject the merge/.test(mRow), mRow.slice(0, 160));
  const mHref = await row(`merge:${mid}`).locator("[data-next] a").getAttribute("href");
  step("C5.3: the merge step is a link to its review page", mHref === `/review/merge/${mid}`, mHref);
  await state("needs-you-second-person");
  await p.getByLabel("Kind of item").selectOption("merge"); await p.waitForURL(/kind=merge/);
  await p.waitForFunction(() => { const k = [...document.querySelectorAll("tr[data-kind]")].map((x) => x.getAttribute("data-kind")); return k.length > 0 && k.every((x) => x === "merge"); }, null, { timeout: 10000 }).catch(() => {}); // the check below decides
  step("C5.3: choosing a kind in the page shows only that kind", (await p.locator("tr[data-kind]").evaluateAll((rs) => rs.map((x) => x.getAttribute("data-kind")))).every((k) => k === "merge"));
  await open("?q=zzzz");
  step("C5.3: nothing matches: an empty state with Show all", /Nothing matches/.test(await p.locator("main").textContent()) && await p.getByRole("button", { name: "Show all" }).count() === 1);
  await state("nothing-matches");
  // Loading and error states.
  await p.route("**/api/review-queue?filter=all**", async (x) => { await new Promise((res) => setTimeout(res, 1500)); await x.continue(); });
  await p.goto(`${BASE}/review?f=all`);
  await p.locator('[aria-label="Loading items to review"]').waitFor({ timeout: 5000 });
  step("C5.3: while the list loads, a skeleton says so to screen readers", await p.getByRole("status").filter({ hasText: "Loading items to review" }).count() === 1);
  await p.screenshot({ path: path.join(SHOTS, `${String(++n).padStart(2, "0")}-loading-1440.png`) });
  await ready(); await p.unroute("**/api/review-queue?filter=all**");
  await p.route("**/api/review-queue?filter=all**", (x) => x.fulfill({ status: 500, contentType: "application/problem+json", body: JSON.stringify({ status: 500, title: "Server error", detail: "Something went wrong on the server.", message: "Something went wrong on the server." }) }));
  await p.goto(`${BASE}/review?f=all`);
  await p.getByText("The list could not be loaded").waitFor({ timeout: 30000 });
  step("C5.3: a failed load says so, keeps decisions, and offers Try again", /Your decisions so far are saved/.test(await p.locator("main").textContent()) && await p.getByRole("button", { name: "Try again" }).count() === 1);
  await state("error");
  await p.unroute("**/api/review-queue?filter=all**");

  // ======================================================== AI work log (board view 10)
  await as("user-A"); await p.goto(`${BASE}/ai`); await p.getByRole("heading", { name: "AI work" }).waitFor();
  const log = await p.locator("main").textContent();
  step("C5.3 BR-16: AI work names the person who started each run, never an internal id", /Configuration author/.test(log) && !/user-[A-Z]\b/.test(log), log.slice(0, 160));
  step("C5.3: AI work says decisions happen in To review, with the link", await p.locator("main").getByRole("link", { name: "To review" }).count() === 1);
  await state("ai-work-log");

  // ======================================================== QA-41: dialogs open on their first field, not Close
  const focusIn = () => p.evaluate(() => { const a = document.activeElement; return { tag: a?.tagName, label: a?.getAttribute("aria-label") ?? (a?.id ? document.querySelector(`label[for="${a.id}"]`)?.textContent : null), inDialog: !!a?.closest('[role="dialog"]') }; });
  await as("user-O"); await p.goto(`${BASE}/cases`); await p.getByRole("button", { name: "Open a case" }).click(); await p.getByRole("dialog").waitFor();
  await p.waitForFunction(() => document.activeElement?.closest('[role="dialog"]'), null, { timeout: 5000 }).catch(() => {});
  const caseFocus = await focusIn();
  step("C6.1 QA-41: Open a case opens with focus on its first field, not on Close", caseFocus.inDialog && ["INPUT", "SELECT"].includes(caseFocus.tag) && caseFocus.label !== "Close", JSON.stringify(caseFocus));
  await p.keyboard.press("Enter");
  step("C6.1 QA-41 fail case: Enter right after opening does not throw the form away (the dialog stays open)", await p.getByRole("dialog").count() === 1);
  await p.keyboard.press("Escape"); await p.getByRole("dialog").waitFor({ state: "detached" });
  await as("user-A"); await p.goto(BASE); await p.getByRole("button", { name: /^Demo/ }).click(); await p.getByRole("menuitem", { name: /Reset demo/ }).click();
  await p.getByRole("dialog").waitFor();
  await p.waitForFunction(() => document.activeElement?.closest('[role="dialog"]'), null, { timeout: 5000 }).catch(() => {});
  const resetFocus = await focusIn();
  step("C6.3 QA-41: a dialog whose field is still loading opens on itself (its title is read), never on Close", resetFocus.inDialog && resetFocus.label !== "Close", JSON.stringify(resetFocus));
  await p.keyboard.press("Escape"); await p.getByRole("dialog").waitFor({ state: "detached" });
  // S5 (P-118 Q2): "+ Add form" left the Overview; the Forms tab's "Add a form from the library" is the right panel now.
  await p.goto(`${BASE}/c/${ss.id}/forms`); await p.getByRole("button", { name: "Add a form from the library" }).click(); await p.getByRole("dialog").waitFor();
  await p.waitForFunction(() => document.activeElement?.closest('[role="dialog"]'), null, { timeout: 5000 }).catch(() => {});
  const panel = await p.evaluate(() => ({ label: document.activeElement?.getAttribute("aria-label"), tag: document.activeElement?.tagName, close: document.activeElement?.getAttribute("aria-label") === "Close" }));
  step("C6.1 QA-41: the right panel (Add a form from the library) opens on its first field, not on Close", !panel.close && ["INPUT", "SELECT", "TEXTAREA"].includes(panel.tag), JSON.stringify(panel));
  await p.keyboard.press("Escape");

  // ======================================================== QA-42: the sample note on a combination a person changed
  const vv = (await cat("pathway=INDIVIDUAL&filter=all")).rows.find((x) => x.nodeKey === "individual.visitors.visitor_visa");
  let note = (await api(`/combinations/${vv.combinationId}`)).body.combination.basis_note;
  step("C1.4 QA-42 control: as loaded, Visitor visa keeps the sample's own note", /not set up yet/.test(note ?? ""), note);
  r = await api(`/combinations/${vv.combinationId}/lines`, { method: "POST", data: { kind: "FORM", formKey: "IMM 1295" } });
  step("setup: a person adds a form line to Visitor visa", r.status < 300, r.body?.detail);
  note = (await api(`/combinations/${vv.combinationId}`)).body.combination.basis_note;
  await p.goto(`${BASE}/c/${vv.combinationId}`); await p.getByRole("heading", { level: 1, name: "Visitor visa" }).waitFor();
  const page = await p.locator("main").textContent();
  step("C1.4 QA-42: once a person changed it, the page no longer says \"not set up yet\" and still says Sample", !/not set up yet/.test(page) && /Sample: from the sample inputs; its setup has changed since they were loaded\./.test(page), note);

  step("no page errors in the browser", errs.length === 0, errs.slice(0, 3).join(" | "));
  await b.close();
  console.log(`${fail ? `${fail} failed` : "all passed"}`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); console.log(`STOPPED after "${lastStep}": ${String(e?.message ?? e).split("\n")[0].slice(0, 160)}`); process.exit(2); });
