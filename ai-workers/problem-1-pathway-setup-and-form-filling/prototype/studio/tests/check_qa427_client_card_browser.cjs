// QA-427 (P-498; A25 sweep): the case page's Client questionnaire card reads the case, at 1440 px as the case officer.
// Before the fix it said "Next: Client A answers on their phone" at every stage (the household's "required not answered"
// also counts what staff enter, so it never reached 0 for the client). On the finished story (Demo › Load the finished
// story: the Visitor visa family case walked through the product's own routes to a recorded submission, and a thin
// second case only opened) and on a new Visitor visa family case:
//   * a case just opened: "Next: Client A answers…", with the hand-off;
//   * the client has answered every part, answers wait for the officer: "Next: confirm the answers", a link to the Agent view;
//   * every answer confirmed: "Next: prepare the forms and send them for review";
//   * a filing never sent for review (the finished story's family case as it is: three filings recorded, the fourth not
//     reviewed): "Next: prepare the forms and send them for review", never "Ready to file" (review M1 a; "approved" and
//     the order of states: tests/check_qa427_client_card.ts);
//   * submitted: "Nothing more is asked of Client A", no hand-off (the same case, its one remaining filing's status read
//     as submitted in the browser: the one patched field);
//   * a read that fails: "could not be read", with Try again (review m1).
// Fails on main (each "client done" state says "Next: Client A answers" or names no next step; submitted still hands
// over). Loads the finished story when the copy has no recorded submission (a few minutes). No model call (US$0).
//   zsh studio/tools/isolated.sh screens_q427 4467 start && node studio/tests/check_qa427_client_card_browser.cjs 4467 xr_studio_screens_q427 [screenshot-dir]
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");

const PORT = Number(process.argv[2] ?? 4467), DB = process.argv[3] ?? "xr_studio_screens_q427", BASE = `http://localhost:${PORT}`, SHOTS = process.argv[4] ?? null;
const PSQL = process.env.PSQL || (fs.existsSync("/opt/homebrew/opt/postgresql@18/bin/psql") ? "/opt/homebrew/opt/postgresql@18/bin/psql" : "psql");
const sql = (q) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const T = { timeout: 30000 };
let pass = 0, fail = 0;
const ok = (name, cond, detail) => { if (cond) { pass++; console.log(`PASS  ${name}`); } else { fail++; console.log(`FAIL  ${name}${detail === undefined ? "" : ` — ${JSON.stringify(detail).slice(0, 400)}`}`); } };
const call = async (method, p, body, actor = "user-O") => { const r = await fetch(`${BASE}/api${p}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined }); const t = await r.text(); let b; try { b = JSON.parse(t); } catch { b = t; } return { status: r.status, body: b }; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const yearsAgo = (y) => { const d = new Date(); d.setUTCFullYear(d.getUTCFullYear() - y); return d.toISOString().slice(0, 10); };
/** A plain value of the question's kind (the walk-1 rehearsal's filler). */
const valueOf = (q) => (q.options?.length ? (q.options[0].code ?? q.options[0].value ?? q.options[0]) : q.value_type === "date" ? "1990-01-01" : /number|money|integer|amount/.test(q.value_type) ? "1" : q.value_type === "boolean" || q.value_type === "yes_no" ? true : q.value_type === "country" ? "India" : "Sample");
const owesOf = async (id) => ((await call("GET", `/runtime/cases/${id}/questionnaire`)).body?.sections ?? []).reduce((n, s) => n + s.missing.length, 0);

/** The finished story, loaded once: its cases (the recorded family case, and the thin case). */
async function story() {
  const recorded = () => sql("select count(*) from filing_record").replace(/\D/g, "") !== "0";
  let has = false; try { has = recorded(); } catch { has = false; }
  if (!has) {
    const r = await call("POST", "/demo/checkpoints/finished-story", { confirm: "RESET" }, "user-A");
    ok("setup: the finished story starts", r.status === 202 || r.status === 200, r.body);
    for (let i = 0; i < 180; i++) { const st = (await call("GET", "/demo/status", null, "user-A")).body; if (st?.story && st.story.state !== "running") { ok("setup: the finished story ends", !/fail/i.test(String(st.story.state)), st.story); break; } await sleep(5000); }
  }
  const cases = (await call("GET", "/runtime/cases")).body?.cases ?? [];
  let submitted = null, thin = null;
  for (const c of cases) {
    const prep = (await call("GET", `/runtime/cases/${c.id}/prepare`)).body;
    const fs_ = prep?.filings ?? [];
    if (!submitted && fs_.some((f) => String(f.status).toLowerCase() === "submitted")) submitted = c;
    else if (!thin && !fs_.some((f) => String(f.status).toLowerCase() === "submitted") && (await owesOf(c.id)) > 0) thin = c;
  }
  ok("setup: the finished story has a case with a submission recorded", !!submitted, cases.map((c) => c.reference));
  ok("setup: and a case where the client still owes answers", !!thin, cases.map((c) => c.reference));
  return { submitted, thin };
}

/** A new family case on the story's Visitor visa release; Client A answers every part (lists: "none apply"). */
async function answeredFamily() {
  const combinationId = sql("select id from combination where combination_key='vv.single'");
  const firm = (await call("GET", "/runtime/firm")).body;
  const rep = (firm?.users ?? []).find((u) => (u.duties ?? []).includes("represent"))?.id ?? null;
  const open = await call("POST", "/runtime/cases", { combinationId, reference: `QA427-${Date.now().toString(36)}`, clientActor: "user-P", principal: { displayName: "Sample Client A" }, ...(rep ? { representative: rep } : {}), caseOfficers: ["user-O"] });
  const id = open.body?.id;
  ok("setup: a Visitor visa family case opens", !!id, open.body);
  const can = new Set((open.body?.can_add ?? []).map((x) => x.role));
  for (const [role, name] of [["spouse_or_partner", "Sample Spouse A"], ["child", "Sample Child A1"]].filter(([r]) => can.has(r))) await call("POST", `/runtime/cases/${id}/people`, { role, displayName: name });
  for (let pass_ = 0; pass_ < 5; pass_++) {
    const v = (await call("GET", `/runtime/cases/${id}/questionnaire`, null, "user-P")).body;
    for (const s of v?.sections ?? []) {
      for (const q of s.questions) {
        if (q.group || q.answer || q.hidden) continue;
        const value = q.fact.endsWith("date_of_birth") ? yearsAgo(s.about_label.includes("Child") ? 10 : 38) : valueOf(q);
        await call("PUT", `/runtime/cases/${id}/answers/${q.subjectId}/${q.fact}`, { value, expectedId: null }, "user-P");
      }
      if (s.group?.required && s.group.rows === 0 && !s.group.none_apply?.value) await call("PUT", `/runtime/cases/${id}/groups/${s.subjectId}/${s.section}/none-apply`, { noneApply: true, expectedId: s.group.none_apply?.id ?? null }, "user-P");
    }
    if ((await owesOf(id)) === 0) break;
  }
  const owes = await owesOf(id);
  ok("setup: Client A has answered every part (their own questionnaire owes nothing)", owes === 0, owes);
  return id;
}

/** The officer confirms every section with something to confirm (the answers shown, as the Agent view sends them). */
async function confirmAll(id) {
  for (let i = 0; i < 3; i++) {
    const v = (await call("GET", `/runtime/cases/${id}/questionnaire?mode=agent`)).body;
    for (const s of v?.sections ?? []) {
      const answers = s.questions.flatMap((q) => (q.group ? q.rows.map((r) => r.answer) : [q.answer])).filter((a) => a && a.channel !== "firm_record");
      const na = s.group && s.group.rows === 0 ? s.group.none_apply : null;
      const seen = [...answers.map((a) => a.id), ...(na ? [na.id] : [])];
      if (s.answered - s.confirmed > 0 && seen.length) await call("POST", `/runtime/cases/${id}/sections/${s.section}/confirm`, { subjectId: s.subjectId, seen });
    }
    const after = (await call("GET", `/runtime/cases/${id}/questionnaire?mode=agent`)).body?.summary;
    if (after && after.answered - after.confirmed === 0) return 0;
  }
  const after = (await call("GET", `/runtime/cases/${id}/questionnaire?mode=agent`)).body?.summary;
  return after ? after.answered - after.confirmed : -1;
}

(async () => {
  const { submitted, thin } = await story();
  const family = await answeredFamily();
  const browser = await chromium.launch({ headless: true, ...(fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: SHOTS ? 2 : 1 });
  await ctx.addInitScript(() => { localStorage.setItem("xr-actor", "user-O"); });
  const p = await ctx.newPage();
  const shot = async (n) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await p.screenshot({ path: path.join(SHOTS, `qa427-${n}-1440.png`), fullPage: false }); } };
  const card = () => p.locator("p.font-medium", { hasText: /^Client questionnaire$/ }).locator("xpath=..");
  const open = async (id) => { await p.goto(`${BASE}/cases/${id}`); await card().waitFor(T); await card().locator("[data-client-card], [data-handoff=client], p.text-xs").first().waitFor(T).catch(() => {}); await card().locator("[data-slot=skeleton]").waitFor({ state: "detached", timeout: 30000 }).catch(() => {}); await p.waitForTimeout(500); return (await card().innerText()).replace(/\s+/g, " "); };
  try {
    // 1. A case where the client still owes answers.
    if (thin) {
      const t = await open(thin.id);
      ok("opened, the client owes answers: \"Next: <the client> answers…\" with the hand-off", /Next: Client [A-Z] answers on their phone/.test(t) && (await card().locator("[data-handoff=client] button").count()) === 1, t);
      await shot("01-client-answers");
    }
    // 2. The client has answered every part; answers wait for the officer.
    let t = await open(family);
    ok("client done: never \"Next: Client A answers\"", !/Next: Client A answers/.test(t), t);
    ok("client done: it says so (\"has answered every part and can still check the answers\"), with the hand-off still there", /Client A has answered every part and can still check the answers/.test(t) && (await card().locator("[data-handoff=client] button").count()) === 1, t);
    ok("answers to confirm: \"Next: confirm the answers (N to confirm, in the Agent view)\"", /Next: confirm the answers \(\d+ to confirm, in the Agent view\)\./.test(t) && (await p.locator("[data-client-card=confirm]").count()) === 1, t);
    await shot("02-confirm-the-answers");
    await card().getByRole("link", { name: "confirm the answers" }).click();
    const inView = await p.waitForFunction(() => { const r = document.getElementById("agent-view")?.getBoundingClientRect(); return !!r && r.top >= -2 && r.top < window.innerHeight; }, null, { timeout: 5000 }).then(() => true, () => false);
    ok("its link brings the Agent view into view", inView);
    // 3. Every answer confirmed.
    const left = await confirmAll(family);
    ok("setup: the officer confirmed every answer", left === 0, left);
    t = await open(family);
    ok("everything confirmed: \"Next: prepare the forms and send them for review\"", /Next: prepare the forms and send them for review\./.test(t) && (await p.locator("[data-client-card=prepare]").count()) === 1 && !/Next: Client A answers/.test(t), t);
    await shot("03-prepare");
    if (submitted) {
      // 4. Review M1 (a): the story's real state: three filings recorded, the fourth ("Child 18 or over") never sent for
      //    review. Never "Ready to file" (a filing not reviewed is not approved); its next step is to send it. ("Approved"
      //    and the other orderings are proved by the rule's own check, tests/check_qa427_client_card.ts.)
      t = await open(submitted.id);
      ok("review M1 (a): a filing never sent for review: \"Next: prepare the forms and send them for review\", never \"Ready to file\"", /Next: prepare the forms and send them for review\./.test(t) && !/Ready to file/.test(t) && !/Next: Client A answers/.test(t), t);
      await shot("04-a-filing-not-reviewed");
      // 5. Submitted: the same case with its one remaining filing read as submitted in the browser (the one patched field).
      await p.route(`**/api/runtime/cases/${submitted.id}/prepare`, async (route) => { const r = await route.fetch(); const b = await r.json(); for (const f of b.filings ?? []) f.status = "submitted"; await route.fulfill({ response: r, json: b }); });
      t = await open(submitted.id);
      ok("submitted: \"Nothing more is asked of Client A on this case\", no hand-off", /Submitted to IRCC\. Nothing more is asked of Client A on this case\./.test(t) && (await card().locator("[data-handoff=client]").count()) === 0, t);
      await shot("05-submitted");
      await p.unrouteAll({ behavior: "ignoreErrors" });
    }
    // 6. Review m1: a read that fails says so, with Try again (never a placeholder for ever).
    await p.route(`**/api/runtime/cases/${family}/questionnaire`, (route) => route.fulfill({ status: 500, json: { message: "Sample failure" } }));
    await p.goto(`${BASE}/cases/${family}`);
    const failed = p.locator("[data-client-card=failed]");
    await failed.waitFor(T).catch(() => {});
    ok("review m1: a failed read says the case could not be read, with Try again", (await failed.count()) === 1 && /could not be read/.test(await failed.innerText()) && (await failed.getByRole("button", { name: "Try again" }).count()) === 1);
    await p.unrouteAll({ behavior: "ignoreErrors" });
    await failed.getByRole("button", { name: "Try again" }).click().catch(() => {});
    await p.locator("[data-client-card=prepare]").waitFor(T).catch(() => {});
    ok("review m1: Try again reads it again and the card comes back", (await p.locator("[data-client-card=prepare]").count()) === 1);
  } catch (e) { ok("the walk ran to the end", false, String(e?.message ?? e)); }
  await p.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await browser.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
