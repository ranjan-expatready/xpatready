// QA-421 (A25 UX sweep Major, P-498; EXPERIENCE §2.5 one next action, P-473 one filled button): on the shared Review and
// release page, while a change the Configuration author can submit is not submitted, the page's one next step is
// "Submit <combination> for review →" (to its Review and release tab), and there is no "Hand to the Approver": a release
// then would leave the author's change out. Once it is submitted the hand-off comes back. Walked in a real browser on the
// configured checkpoint (C10.1) at 1440 px (never submitted; returned to the author) and 375 px (changed after it was
// submitted), as the author;
// also: the Content reviewer (no author duty) is offered no Submit; axe (WCAG 2.2 AA) on the step; no sideways scroll at
// 375 px. Fails on main 3ea36a0d3 (the author sees "Hand to the Approver →" and no Submit). The draft change is made through
// the API as the author (scaffolding: the Documents tab is not this row). No model call (US$0).
// Screenshots: product/screens/QA-421-release-submit-first/screenshots/.
//   COPY_PREFIX=screens zsh studio/tools/isolated.sh screens_qa421 4473 start && node studio/tests/check_qa421_release_submit_first_browser.cjs 4473
const path = require("node:path"); const fs = require("node:fs");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4473);
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "QA-421-release-submit-first", "screenshots"); fs.mkdirSync(SHOTS, { recursive: true });
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  C5.1 (QA-421): ${name}${detail !== undefined && !ok ? ` — ${String(typeof detail === "string" ? detail : JSON.stringify(detail)).slice(0, 300)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, ...(init.data ? { data: init.data } : {}), timeout: 300000 }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  const axe = async (name, sel) => {
    if (!await p.locator(sel).count()) return step(`${name}: axe (the step is on the page)`, false, `no ${sel}`);
    const r = await new AxeBuilder({ page: p }).include(sel).withTags(TAGS).analyze();
    step(`${name}: axe finds no WCAG A/AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
  };
  const shot = (n) => p.screenshot({ path: path.join(SHOTS, `${n}.png`), fullPage: false });
  const as = (a) => p.evaluate((x) => localStorage.setItem("xr-actor", x), a);
  const releasePage = async () => { await p.goto(`${BASE}/release`); await p.getByRole("heading", { name: "Review and release", level: 1 }).waitFor({ timeout: 30000 }); await p.locator("table").first().waitFor({ timeout: 30000 }); };
  /** Filled (brand blue) buttons and button-links on the page that a person can press now (P-473: at most one). */
  const filled = () => p.locator('main [data-slot="button"]').evaluateAll((els) => els.filter((e) => /(^|\s)bg-primary(\s|$)/.test(e.className) && !e.disabled && e.getAttribute("aria-disabled") !== "true").map((e) => e.textContent.trim()));
  const nextStep = p.locator('[data-next-step="submit"]');

  // Setup (as test data): the configured checkpoint, and one draft change on the released Visitor visa (a document line
  // now provided by staff), made as the author and not submitted.
  await p.goto(`${BASE}/inbox`);
  await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
  const loaded = await api("/demo/load", { method: "POST", data: { sample: "configured" } });
  step("setup: the configured checkpoint loads", loaded.status < 300, loaded.status);
  // P-598 (tech lead on #1747, option 1): the configured load leaves another combination's pending change not submitted (the
  // LMIA's IMM 5707 marriage question, which it takes at its next release). Scaffolding, as this walk's own draft edit is:
  // the author submits it first, so the walk starts with nothing else waiting on the author.
  const pending = ((await api("/draft")).body?.rows ?? []).filter((r) => r.held && /^Not submitted for review/.test(r.why ?? ""));
  const submitted = [];
  for (const r of pending) submitted.push((await api(`/combinations/${r.combinationId}/submit`, { method: "POST", data: { note: "Submitted by QA-421's setup as scaffolding (P-598): the configured load's pending change." } })).status);
  const left = ((await api("/draft")).body?.rows ?? []).filter((r) => r.held && /^Not submitted for review/.test(r.why ?? "")).map((r) => r.label);
  step("setup (P-598): the configured load's pending change on another combination is submitted first, so nothing else waits on the author", submitted.every((x) => x < 300) && left.length === 0, { pending: pending.map((r) => r.label), submitted, left });
  const vv = (loaded.body?.combinations ?? []).find((c) => /Visitor visa/.test(c.label));
  const ID = vv?.id;
  const req = (await api(`/combinations/${ID}/config?mode=draft`)).body?.snapshot?.document_requirements?.find((r) => r.provided_by === "client");
  const patch = (by) => api(`/combinations/${ID}/requirements/${encodeURIComponent(req?.lineage ?? "")}`, { method: "PATCH", data: { documentTypeKey: req?.document_type_key, attachMode: "COMBINATION_MANDATORY", appliesToRoles: req?.who, providedBy: by } });
  const edit = await patch("staff");
  const draft = (await api("/draft")).body;
  const row = (draft?.rows ?? []).find((r) => r.combinationId === ID);
  const LABEL = row?.label; // the combination's own name, as the page lists it ("Visitor visa")
  const others = (draft?.rows ?? []).filter((r) => !r.held).length + (draft?.library ?? []).filter((l) => l.will_release !== false).length;
  step("setup: the Visitor visa is held back as not submitted, and something else would be released (so main offers the hand-off)", edit.status < 300 && row?.held && /^Not submitted for review/.test(row?.why ?? "") && others > 0, { edit: edit.status, why: row?.why, others });

  // 1. 1440 px, the author, never submitted: Submit first, no hand-off.
  await as("user-A"); await releasePage();
  const s1 = await nextStep.count() ? await nextStep.innerText() : "";
  const link = nextStep.getByRole("link", { name: `Submit ${LABEL} for review →`, exact: true });
  step(`1. 1440 px, author, not submitted: the next step is "Submit ${LABEL} for review →"`, await link.count() === 1 && /Next: submit/.test(s1), s1 || await p.locator("main").innerText());
  step("1. 1440 px: no hand-off to the Approver while the author's change is not submitted", await p.locator('[data-handoff="approver"]').count() === 0 && !/Hand to the Approver/.test(await p.locator("main").innerText()), await p.locator("[data-handoff]").allInnerTexts());
  step("1. 1440 px: the Submit step comes before the list of combinations", await nextStep.count() === 1 && await p.evaluate(() => { const a = document.querySelector('[data-next-step="submit"]'), t = document.querySelector("main table"); return !!a && !!t && !!(a.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_FOLLOWING); }));
  const f1 = await filled();
  step("1. 1440 px (P-473): one filled button, the Submit", f1.length === 1 && f1[0] === `Submit ${LABEL} for review →`, f1);
  await axe("1. the Submit step", '[data-next-step="submit"]');
  await shot("1-author-not-submitted-1440");

  // 2. The Submit goes to the combination's own Review and release tab, where the author submits.
  await link.click();
  await p.waitForURL((u) => u.pathname === `/c/${ID}/review`, { timeout: 15000 });
  const submit = p.getByRole("button", { name: "Submit for review", exact: true });
  await submit.waitFor({ timeout: 30000 });
  step("2. the Submit step opens the combination's Review and release tab, with Submit for review", new URL(p.url()).pathname === `/c/${ID}/review`, p.url());
  await submit.click();
  await p.locator('[data-handoff="content-reviewer"]').waitFor({ timeout: 30000 });

  // 3. Submitted: the Submit step goes, and the release page's hand-off is back (BR-3: the approve duty).
  await releasePage();
  await p.locator('[data-handoff="approver"]').waitFor({ timeout: 30000 });
  step("3. after Submit: no Submit step; the hand-off to the Approver is back", await nextStep.count() === 0 && await p.locator('[data-handoff="approver"] [data-handoff-to="user-B"]').count() === 1, await p.locator("main").innerText());
  await shot("3-author-submitted-1440");

  // 4. 375 px: the draft changes after it was submitted, so it must be submitted again: Submit first again.
  const edit2 = await patch("client");
  const why2 = ((await api("/draft")).body?.rows ?? []).find((r) => r.combinationId === ID)?.why ?? "";
  step("setup: the author changes the Visitor visa again after submitting", edit2.status < 300 && /changed after it was submitted/.test(why2), { status: edit2.status, why2 });
  await p.setViewportSize({ width: 375, height: 812 });
  await releasePage();
  const link4 = nextStep.getByRole("link", { name: `Submit ${LABEL} for review →`, exact: true });
  step(`4. 375 px, author, changed after submitting: the next step is "Submit ${LABEL} for review →", no hand-off`, await link4.count() === 1 && await p.locator('[data-handoff="approver"]').count() === 0, await p.locator("main").innerText());
  const box = await link4.boundingBox();
  step("4. 375 px: the Submit is fully on screen, at least 24 px tall, and the page does not scroll sideways", !!box && box.x >= 0 && box.x + box.width <= 375 && box.height >= 24 && await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), { box, sw: await p.evaluate(() => document.documentElement.scrollWidth) });
  const f4 = await filled();
  step("4. 375 px (P-473): one filled button, the Submit", f4.length === 1 && f4[0] === `Submit ${LABEL} for review →`, f4);
  await axe("4. the Submit step at 375 px", '[data-next-step="submit"]');
  await shot("4-author-changed-after-submit-375");

  // 4b. Returned to the author (review m1): the Content reviewer returns it (through the API: the Return on screen is
  // BK-4b's), so the author must submit it again: Submit first again, no hand-off.
  const items = (((await api(`/combinations/${ID}/review`, { actor: "user-C" })).body?.submission?.changeSummary) ?? []).map((c) => `${c.kind}|${c.key}`);
  const ret = await api(`/combinations/${ID}/signoff`, { method: "POST", actor: "user-C", data: { action: "returned", items, note: "Please say which officer provides it (QA-421 check)." } });
  const why4b = ((await api("/draft")).body?.rows ?? []).find((r) => r.combinationId === ID)?.why ?? "";
  step("setup: the Content reviewer returns the Visitor visa to the author", ret.status < 300 && items.length > 0 && /^Returned to the author/.test(why4b), { status: ret.status, items: items.length, why4b, detail: ret.body?.detail });
  await p.setViewportSize({ width: 1440, height: 900 });
  await releasePage();
  step(`4b. 1440 px, author, returned: the next step is "Submit ${LABEL} for review →", no hand-off`, await nextStep.getByRole("link", { name: `Submit ${LABEL} for review →`, exact: true }).count() === 1 && await p.locator('[data-handoff="approver"]').count() === 0, await p.locator("main").innerText());

  // 5. A person without the author duty cannot submit, so is never offered it (audit D-2).
  await p.setViewportSize({ width: 1440, height: 900 });
  await as("user-C"); await releasePage();
  step("5. Content reviewer (no author duty): no Submit step", await nextStep.count() === 0, await p.locator("main").innerText());

  step("no page error during the walk", errs.length === 0, errs);
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
