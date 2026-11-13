// QA-417 (P-497; P-72 and P-78 kept): one count, and the officer can find where it lives. On a Visitor visa and a Study
// permit family case (principal, spouse where the release lists one, child; Client A answers every question it is shown, as in the walk-1 rehearsal
// §2-§3), at 1440 px as the case officer, before and after Confirm section:
//   * the household line's "to confirm" = the sum of the people's tabs ("N to confirm") = the sum of every section's pill;
//   * the household line names each tab with something to confirm, and its link opens that tab;
//   * a section with nothing to confirm says so: in words beside its disabled button when there is nothing to send, or
//     from the server's reply to Confirm section; in true words (review m1, m2): a firm-record section's answers are
//     confirmed, and an answer the officer recorded waits for the client.
// Before the fix the tabs carry no count and the household line names no tab, so this fails there.
// When the copy has no Visitor visa or Study permit combination it loads the configured checkpoint (POST /demo/load), as
// the rehearsal did. No model call (US$0).
//   zsh studio/tools/isolated.sh screens_q417 4457 start && node studio/tests/check_qa417_counts_browser.cjs 4457 xr_studio_screens_q417 [screenshot-dir]
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");

const PORT = Number(process.argv[2] ?? 4457), DB = process.argv[3] ?? "xr_studio_screens_q417", BASE = `http://localhost:${PORT}`, SHOTS = process.argv[4] ?? null;
const PSQL = process.env.PSQL || (fs.existsSync("/opt/homebrew/opt/postgresql@18/bin/psql") ? "/opt/homebrew/opt/postgresql@18/bin/psql" : "psql");
const sql = (q) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const T = { timeout: 20000 };
let pass = 0, fail = 0;
const ok = (name, cond, detail) => { if (cond) { pass++; console.log(`PASS  ${name}`); } else { fail++; console.log(`FAIL  ${name}${detail === undefined ? "" : ` — ${JSON.stringify(detail).slice(0, 400)}`}`); } };
const call = async (method, p, body, actor = "user-O") => { const r = await fetch(`${BASE}/api${p}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined }); const t = await r.text(); let b; try { b = JSON.parse(t); } catch { b = t; } return { status: r.status, body: b }; };
const yearsAgo = (y) => { const d = new Date(); d.setUTCFullYear(d.getUTCFullYear() - y); return d.toISOString().slice(0, 10); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const comboId = (key) => sql(`select id from combination where combination_key='${key}'`);

/** A plain value of the question's kind (the rehearsal's filler: first option, a date, a number, "Sample"). */
const valueOf = (q) => (q.options?.length ? (q.options[0].code ?? q.options[0].value ?? q.options[0]) : q.value_type === "date" ? "1990-01-01" : /number|money|integer|amount/.test(q.value_type) ? "1" : q.value_type === "boolean" || q.value_type === "yes_no" ? true : q.value_type === "country" ? "India" : "Sample");

/** A family case on one combination: principal, spouse (where its release lists one), child; Client A answers every question it is shown. */
async function familyCase(key, tag) {
  const firm = (await call("GET", "/runtime/firm")).body;
  const rep = (firm?.users ?? []).find((u) => (u.duties ?? []).includes("represent"))?.id ?? null;
  const open = await call("POST", "/runtime/cases", { combinationId: comboId(key), reference: `QA417-${tag}-${Date.now().toString(36)}`, clientActor: "user-P", principal: { displayName: "Sample Client A" }, ...(rep ? { representative: rep } : {}), caseOfficers: ["user-O"] });
  const id = open.body?.id;
  ok(`${tag} setup: a family case opens on ${key}`, !!id, open.body);
  const principal = (open.body?.people ?? []).find((p) => p.role === "principal")?.subject_id;
  await call("PUT", `/runtime/cases/${id}/answers/${principal}/person.date_of_birth`, { value: yearsAgo(40), expectedId: null });
  // The people its release lets a case add (the configured Study permit lists an accompanying child only).
  const can = new Set((open.body?.can_add ?? []).map((x) => x.role));
  for (const [role, name, age] of [["spouse_or_partner", "Sample Spouse A", 38], ["child", "Sample Child A1", 10]].filter(([role]) => can.has(role))) {
    const a = await call("POST", `/runtime/cases/${id}/people`, { role, displayName: name });
    ok(`${tag} setup: ${role} added`, !!a.body?.subject_id, a.body);
    await call("PUT", `/runtime/cases/${id}/answers/${a.body?.subject_id}/person.date_of_birth`, { value: yearsAgo(age), expectedId: null });
  }
  let saved = 0;
  for (let pass_ = 0; pass_ < 3; pass_++) {
    const v = (await call("GET", `/runtime/cases/${id}/questionnaire`, null, "user-P")).body;
    for (const s of v?.sections ?? []) for (const q of s.questions) { if (q.group || q.answer || q.hidden) continue; const r = await call("PUT", `/runtime/cases/${id}/answers/${q.subjectId}/${q.fact}`, { value: valueOf(q), expectedId: null }, "user-P"); if (r.status < 300) saved++; }
  }
  ok(`${tag} setup: Client A answered the questions it is shown`, saved > 20, saved);
  return id;
}

/** The three counts as the officer sees them: the household line, each tab's "N to confirm", and every section's pill
 *  (each tab opened in turn: the Agent view shows one person at a time). */
async function counts(p) {
  // Read from the words the officer reads (the line under the heading), so the check runs on code from before the fix too.
  const line = await p.getByText(/questions for this household/).first().innerText();
  const household = Number(/(\d+) to confirm/.exec(line)?.[1] ?? NaN);
  const tabs = p.locator('[role="tablist"][aria-label="Whose answers"] [role="tab"]');
  const n = await tabs.count(), byTab = {}, bySections = {};
  for (let i = 0; i < n; i++) {
    const tab = tabs.nth(i), id = await tab.getAttribute("data-tab"), label = (await tab.innerText()).split("\n")[0];
    const c = await tab.locator("[data-tab-to-confirm]");
    byTab[id ?? label] = (await c.count()) ? Number(await c.getAttribute("data-tab-to-confirm")) : 0;
    await tab.click();
    await p.waitForFunction((who) => document.querySelector(`[role="tab"][data-state="active"]`)?.getAttribute("data-tab") === who, id, T);
    const pills = await p.locator('#agent-view section[aria-labelledby^="h-"] header').allInnerTexts();
    bySections[id ?? label] = pills.reduce((sum, t) => sum + Number(/(\d+) answered · (\d+) to confirm/.exec(t)?.[2] ?? 0), 0);
  }
  const links = await p.locator("[data-household-tabs] a[data-household-tab]").evaluateAll((as) => as.map((a) => ({ id: a.getAttribute("data-household-tab"), text: a.textContent })));
  const linked = links.reduce((sum, l) => sum + Number(/\((\d+)\)$/.exec(l.text ?? "")?.[1] ?? 0), 0);
  const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  return { household, tabs: sum(byTab), sections: sum(bySections), linked, byTab, bySections, links };
}

async function walk(p, id, tag, shot) {
  await p.goto(`${BASE}/cases/${id}`);
  await p.getByText(/questions for this household/).first().waitFor(T);
  await p.locator('[role="tablist"][aria-label="Whose answers"]').waitFor(T);
  const before = await counts(p);
  ok(`${tag} before: the household has answers to confirm`, before.household > 0, before);
  ok(`${tag} before: household ${before.household} = the sum of the people's tabs`, before.household === before.tabs, before);
  ok(`${tag} before: household = the sum of every section's "to confirm"`, before.household === before.sections, before);
  ok(`${tag} before: each tab's count = its own sections`, Object.keys(before.byTab).every((k) => before.byTab[k] === before.bySections[k]), before);
  ok(`${tag} before: the household line names every tab with something to confirm, with its count`, before.linked === before.household && before.links.length === Object.values(before.byTab).filter((x) => x > 0).length, before);

  // The household line's link opens that person's tab and brings the tabs into view.
  // The tab with the most to confirm (the rehearsal's count sat in the parents' tabs, not Client A's).
  const firstTab = await p.locator('[role="tab"]').first().getAttribute("data-tab");
  const target = [...before.links].filter((l) => l.id !== firstTab).sort((a, b) => before.byTab[b.id] - before.byTab[a.id])[0] ?? before.links[0];
  await p.locator('[role="tab"]').first().click();
  await p.evaluate(() => window.scrollTo(0, 0));
  await shot(`${tag}-00-household-line`);
  // Re-review m3: the household line wraps; no sideways scroll at 375 and 1024 px, no "·" alone at a line's start.
  for (const width of [375, 1024]) {
    await p.setViewportSize({ width, height: 900 });
    await p.waitForTimeout(300);
    const fit = await p.evaluate(() => { const el = document.querySelector("[data-household-tabs]"); return { line: el ? el.scrollWidth <= el.clientWidth + 1 : false, page: document.documentElement.scrollWidth <= window.innerWidth + 1 }; });
    ok(`${tag} at ${width} px: the household line wraps inside its column and the page does not scroll sideways`, fit.line && fit.page, fit);
  }
  await p.setViewportSize({ width: 1440, height: 900 });
  await p.waitForTimeout(300);
  await p.locator(`[data-household-tabs] a[data-household-tab="${target.id}"]`).click();
  await p.waitForFunction((who) => document.querySelector(`[role="tab"][data-state="active"]`)?.getAttribute("data-tab") === who, target.id, T);
  // The page scrolls and focuses two frames after the tab opens: wait for it (up to 5 s), never a fixed pause.
  const inView = await p.waitForFunction((who) => { const el = document.querySelector(`[role="tab"][data-tab="${CSS.escape(who)}"]`), r = el?.getBoundingClientRect(); return !!r && r.top >= 0 && r.bottom <= window.innerHeight && document.activeElement === el; }, target.id, { timeout: 5000 }).then(() => true, () => false);
  ok(`${tag}: "${target.text}" on the household line opens that tab, in view and focused`, inView, target);
  ok(`${tag}: the address is cleared once used (a later render does not jump back)`, !(await p.evaluate(() => window.location.hash)), await p.evaluate(() => window.location.hash));
  await shot(`${tag}-01-household-line-and-tab`);

  // Confirm section on every section of that tab with something to confirm.
  const sections = p.locator('#agent-view section[aria-labelledby^="h-"]');
  const ns = await sections.count();
  let confirmed = 0;
  for (let i = 0; i < ns; i++) {
    const s = sections.nth(i), pill = /(\d+) answered · (\d+) to confirm/.exec(await s.locator("header").innerText());
    if (!pill || Number(pill[2]) === 0) continue;
    const reply = p.waitForResponse((r) => /\/sections\/[^/]+\/confirm$/.test(r.url()) && r.request().method() === "POST", T);
    await s.getByRole("button", { name: "Confirm section" }).click();
    const r = await reply;
    if (r.ok()) confirmed++;
    await p.waitForFunction(([idx]) => { const h = document.querySelectorAll('#agent-view section[aria-labelledby^="h-"]')[idx]?.querySelector("header")?.textContent ?? ""; return / 0 to confirm/.test(h); }, [i], T).catch(() => {});
  }
  ok(`${tag}: Confirm section confirmed the tab's sections`, confirmed > 0, confirmed);
  await p.waitForFunction(([who]) => !document.querySelector(`[data-household-tab="${CSS.escape(who)}"]`), [target.id], T).catch(() => {});
  const after = await counts(p);
  ok(`${tag} after: household ${after.household} = the sum of the tabs`, after.household === after.tabs, after);
  ok(`${tag} after: household = the sum of every section's "to confirm"`, after.household === after.sections, after);
  ok(`${tag} after: the household went down by that tab's count, and the tab is off the household line`, after.household === before.household - before.byTab[target.id] && !after.links.some((l) => l.id === target.id), { before: before.household, tab: before.byTab[target.id], after: after.household });
  ok(`${tag} after: the household line still names every tab with something to confirm`, after.linked === after.household, after);

  // A section whose answers are all confirmed: Confirm section asks the server and says "nothing to confirm" from its
  // reply (the page may not hold the latest answers yet: CI on 7042c1612, check_runtime_r1c's "None apply").
  await p.locator(`[role="tab"][data-tab="${target.id}"]`).click();
  const done = p.locator('#agent-view section[aria-labelledby^="h-"]').filter({ hasText: / 0 to confirm/ }).filter({ has: p.locator('button:not([disabled])', { hasText: "Confirm section" }) }).first();
  ok(`${tag}: the tab has a confirmed section whose Confirm section can still be pressed`, (await done.count()) === 1);
  const toast = (re) => p.getByText(re).last();
  if (await done.count()) {
    const reply = p.waitForResponse((r) => /\/sections\/[^/]+\/confirm$/.test(r.url()) && r.request().method() === "POST", T);
    await done.getByRole("button", { name: "Confirm section" }).click();
    const r = await reply.then((x) => x.json()).catch(() => null);
    ok(`${tag}: the server confirms none of them`, r?.confirmed === 0, r);
    const said = toast(/: nothing to confirm\. Every answer here is confirmed already\./);
    await said.waitFor(T).catch(() => {});
    ok(`${tag}: Confirm section on it says "nothing to confirm", every answer confirmed already`, await said.isVisible().catch(() => false));
  }
  await shot(`${tag}-02-nothing-to-confirm`);

  // Rehearsal §4 and review m1: a section with no answer for the officer to send (the representative's firm-record
  // answers: given and confirmed) says so in words beside its disabled button, never a silent dead button or "No answer".
  const repTab = p.locator('[role="tab"]', { hasText: /^The representative/ });
  ok(`${tag} m1 setup: the case has the representative's tab`, (await repTab.count()) > 0);
  if (await repTab.count()) {
    await repTab.first().click();
    const firm = p.locator('#agent-view section[aria-labelledby^="h-"]').filter({ hasText: /[1-9]\d* answered · 0 to confirm/ }).filter({ has: p.locator("[data-nothing-to-confirm]") }).first();
    ok(`${tag} m1: a firm-record section says beside its button that there is nothing to confirm`, (await firm.count()) === 1);
    if (await firm.count()) {
      const words = await firm.locator("[data-nothing-to-confirm]").innerText();
      ok(`${tag} m1: its words are "every answer here is confirmed already", never "no answer yet"`, /every answer here is confirmed already/i.test(words) && !/no answer/i.test(words), words);
      ok(`${tag} m1: and its Confirm section is disabled (nothing to send)`, await firm.getByRole("button", { name: "Confirm section" }).isDisabled());
    }
  }

  // Review m2: a background answer the officer recorded waits for the client: Confirm section never says "confirmed already".
  const view = (await call("GET", `/runtime/cases/${id}/questionnaire?mode=agent`)).body;
  const bg = (view?.sections ?? []).filter((x) => x.subjectId === target.id && !x.group).flatMap((x) => x.questions.filter((q) => q.background && q.answer && !q.group && q.answer.status === "VERIFIED" && !q.answer.awaits_client).map((q) => ({ x, q })))[0];
  if (tag === "vv") ok(`${tag} m2 setup: the tab has a confirmed background answer`, !!bg, target);
  if (bg) {
    const { x, q } = bg, other = (q.options ?? []).map((o) => o.code ?? o.value ?? o).find((v) => JSON.stringify(v) !== JSON.stringify(q.answer.value));
    const put = await call("PUT", `/runtime/cases/${id}/answers/${q.subjectId}/${q.fact}`, { value: other ?? (q.value_type === "date" ? "1991-02-02" : "Sample recorded by phone"), expectedId: q.answer.id });
    ok(`${tag} m2 setup: the officer records it again (it now waits for the client)`, put.status < 300, put.body);
    await p.reload();
    await p.locator('[role="tablist"][aria-label="Whose answers"]').waitFor(T);
    await p.locator(`[role="tab"][data-tab="${target.id}"]`).click();
    const sec = p.locator(`section[id="s-${x.subjectId}-${x.section}"]`);
    await sec.waitFor(T);
    await sec.getByRole("button", { name: "Confirm section" }).click();
    const said = toast(/: nothing to confirm\..*wait/);
    await said.waitFor(T).catch(() => {});
    const text = await said.innerText().catch(() => "");
    ok(`${tag} m2: it says what waits for the client, never "confirmed already"`, /1 recorded by staff waits for the client to re-confirm\./.test(text) && !/confirmed already/.test(text), text);
  }
}

(async () => {
  if (!sql("select count(*) from combination where combination_key in ('vv.single','sp.outside')").startsWith("2")) {
    const r = await call("POST", "/demo/load", { sample: "configured" }, "user-A");
    ok("setup: the configured checkpoint loads (Visitor visa and Study permit released)", r.status < 300 && sql("select count(*) from combination where combination_key in ('vv.single','sp.outside')") === "2", r.body);
  }
  const vv = await familyCase("vv.single", "vv"), sp = await familyCase("sp.outside", "sp");
  const browser = await chromium.launch({ headless: true, ...(fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: SHOTS ? 2 : 1 });
  await ctx.addInitScript(() => { localStorage.setItem("xr-actor", "user-O"); });
  const p = await ctx.newPage();
  const shot = async (n) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await p.screenshot({ path: path.join(SHOTS, `qa417-${n}-1440.png`), fullPage: false }); } };
  try {
    await walk(p, vv, "vv", shot);
    await walk(p, sp, "sp", shot);
  } catch (e) { ok("the walk ran to the end", false, String(e?.message ?? e)); }
  await browser.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
