// qa lane, /qa after-merge on main 38722933 (28 Oct, PR #69 = 368b8c32): QA-53 deny by default on every configuration
// read, the Form library on the shared lifecycle components, and the resend of a returned form change; R69-1..3 from the
// PR #69 review. Pass steps guard what works; fail steps mark findings and pass when fixed: QA-65 (reads made by POST, and
// the releases list, answer nobody), QA-66 (a returned form change: the row loses Withdraw and names the wrong action,
// R69-1), QA-67 (row actions stale after a person switch, R69-2), QA-68 (Send again on a returned form change offers
// Name and Meaning and drops them). Resets the copy and loads the sample itself. No model call (US$0).
//   zsh studio/tools/isolated.sh qa_r69 4471 start
//   node studio/tests/qa/check_qa_am_r69_1028.cjs 4471 xr_studio_qa_r69        (QA_HEADED=1 shows the browser)
const { execFileSync } = require("node:child_process");
const path = require("node:path"); const fs = require("node:fs");
const { chromium } = require("../../node_modules/playwright");
const [PORT, DB] = [process.argv[2] ?? "4471", process.argv[3] ?? "xr_studio_qa_r69"];
const B = `http://localhost:${PORT}`;
const SHOTS = path.join(__dirname, "../../../../product/qa/reports/2026-10-28-after-merge-69");
fs.mkdirSync(SHOTS, { recursive: true });
let pass = 0, fail = 0;
const ok = (name, c, detail) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const call = async (m, p, a, body) => { const r = await fetch(B + p, { method: m, headers: { ...(a ? { "x-actor": a } : {}), "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(240_000) }); const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; } return { s: r.status, j }; };
const row = async (code, a = "user-A") => (await call("GET", `/api/library/forms/list?q=${encodeURIComponent(code)}`, a)).j.rows.find((r) => r.code === code);

(async () => {
  await call("POST", "/api/demo/reset", "user-A", { confirm: "RESET" });
  const load = await call("POST", "/api/demo/load", "user-A");
  ok("setup: reset and Load sample", load.s < 300, load.s);
  const vv = sql(`select id from combination where label = 'Visitor visa' limit 1`);

  // ── QA-53: deny by default on GET (pass) ─────────────────────────────────────────────────────────────────────────────
  const people = { nobody: null, unknown: "user-Z", officer: "user-O", client: "user-P", author: "user-A", approver: "user-B", sme: "user-C" };
  const grid = async (m, p, body) => Object.fromEntries(await Promise.all(Object.entries(people).map(async ([k, a]) => [k, (await call(m, p, a, body)).s])));
  const configGets = ["/api/ledger", "/api/LEDGER", "/api/ledger/", "/api/library/forms", `/api/combinations/${vv}/config`, "/api/masters", "/api/review-queue", "/api/ai/batches", "/api/library/forms/list", `/api/library/forms/${encodeURIComponent("IMM 5257")}/uses`];
  const wrong = [];
  for (const p of configGets) { const g = await grid("GET", p); if (g.nobody !== 401 || g.unknown !== 401 || g.officer !== 403 || g.client !== 403 || g.author !== 200 || g.approver !== 200 || g.sme !== 200) wrong.push(`${p} ${JSON.stringify(g)}`); }
  ok("C11.10 QA-53 pass: configuration GETs (also upper case and a trailing slash) refuse nobody and unknown (401), officer and client (403), answer the three Studio people", !wrong.length, wrong);
  const head = await grid("HEAD", "/api/ledger");
  ok("C11.10 QA-53 pass: HEAD is guarded like GET", head.nobody === 401 && head.officer === 403 && head.author === 200, head);
  const act = await grid("GET", "/api/activity");
  ok("C11.10 QA-53 pass: the activity feed keeps its own rule (officer yes, client no, nobody 401)", act.nobody === 401 && act.officer === 200 && act.client === 403, act);
  const cases = await grid("GET", "/api/runtime/cases");
  ok("C6.1 QA-53 pass: case people's own reads are untouched and still refuse nobody", cases.nobody === 401 && cases.officer === 200, cases);

  // ── QA-65: configuration reads that skip the guard ───────────────────────────────────────────────────────────────────
  const rel = await grid("GET", "/api/releases");
  ok("C11.10 QA-65 fail: the releases list (a case read) still refuses nobody and an unknown name (401)", rel.nobody === 401 && rel.unknown === 401 && rel.officer === 200, rel);
  const findPlan = await grid("POST", `/api/combinations/${vv}/forms/find/plan`, { mode: "rules" });
  ok("C11.15 QA-65 fail: the form finder's plan (combination, trail, AI spend ledger) refuses nobody (401) and case people (403)", findPlan.nobody === 401 && findPlan.officer === 403 && findPlan.client === 403 && findPlan.author < 300, findPlan);
  const aiPlan = await grid("POST", "/api/ai/plan", { scope: { kind: "combination", ids: [vv] }, mode: "REPLAY" });
  ok("C4 QA-65 fail: the AI plan (combinations, sources, attachment ids) refuses nobody (401) and case people (403)", aiPlan.nobody === 401 && aiPlan.officer === 403 && aiPlan.client === 403 && aiPlan.author < 300, aiPlan);
  const cond = await grid("POST", "/api/conditions/check", { condition: { all: [] } });
  ok("C3 QA-65 fail: the condition check (names library fields) refuses nobody (401) and case people (403)", cond.nobody === 401 && cond.officer === 403 && cond.author < 300, cond);
  const planBody = (await call("POST", "/api/ai/plan", null, { scope: { kind: "combination", ids: [vv] }, mode: "REPLAY" })).j;
  const attId = planBody?.targets?.[0]?.attachmentId;
  const file = attId ? (await fetch(`${B}/api/attachments/${attId}/file`)).status : null;
  ok("C11.10 QA-65 fail: nobody cannot chain the open AI plan to a source file download (the file id is reached only from a guarded page)", !attId || file !== 200, { attId: !!attId, file });

  // ── Form library on the shared lifecycle components (pass) and R69-1 / QA-66 ─────────────────────────────────────────
  const CODE = "Guide 5269", enc = encodeURIComponent(CODE);
  const before = await row(CODE);
  ok("C11.9 pass: an unused, released-file guide offers Retire (one written action, not greyed)", before?.action?.kind === "RETIRE" && before.action.why === null, before?.action);
  const p = await call("POST", `/api/library/forms/${enc}/retire`, "user-A", { reason: "Replaced by a newer guide" });
  ok("C11.9 pass: Retire with a written reason goes to the second person (201)", p.s === 201 && !!p.j.id, p.s);
  const id = p.j.id;
  const w = await row(CODE);
  ok("C11.9 pass: while it waits, the proposer's row offers Withdraw", w?.action?.kind === "WITHDRAW" && w.action.change_id === id, w?.action);
  ok("C11.9 pass: Send again is refused while the change waits (409)", (await call("POST", `/api/library/changes/${id}/resubmit`, "user-A", { reason: "again" })).s === 409);
  const ret = await call("POST", `/api/library/changes/${id}/return`, "user-B", { note: "Which newer guide? Name it." });
  ok("C11.9 pass: the second person returns it with a note", ret.s < 300 && ret.j.status === "RETURNED", ret.j.status);
  const r1 = await row(CODE);
  ok("C11.9 QA-66 fail (R69-1): a returned change still shows on the proposer's row — Withdraw (or Send again), not a greyed action", r1?.action?.kind === "WITHDRAW" && r1.action.change_id === id, r1?.action);
  ok("C11.9 QA-66 fail (R69-1): the row never names an action nobody proposed (it was a Retire, the row says Delete)", r1?.action?.kind !== "DELETE", r1?.action);
  ok("C11.9 QA-66 fail: the row says the change was returned (lifecycle state shown)", !!r1?.lifecycle_waiting || /return/i.test(JSON.stringify(r1)), { lifecycle_waiting: r1?.lifecycle_waiting });

  // ── The resend of a returned form change (pass) and QA-68 ────────────────────────────────────────────────────────────
  const by = { approver: (await call("POST", `/api/library/changes/${id}/resubmit`, "user-B", { reason: "I send it" })).s, sme: (await call("POST", `/api/library/changes/${id}/resubmit`, "user-C", { reason: "I send it" })).s, officer: (await call("POST", `/api/library/changes/${id}/resubmit`, "user-O", { reason: "I send it" })).s, nobody: (await call("POST", `/api/library/changes/${id}/resubmit`, null, { reason: "I send it" })).s };
  ok("C11.9 pass: only an author sends again (approver, SME, officer 403; nobody 401)", by.approver === 403 && by.sme === 403 && by.officer === 403 && by.nobody === 401, by);
  const short = await call("POST", `/api/library/changes/${id}/resubmit`, "user-A", { reason: "x" });
  ok("C11.9 pass: a reason under 3 characters is refused in words (400)", short.s === 400 && /3 to 300/.test(short.j.detail ?? ""), short.j.detail);
  const twice = await Promise.all([1, 2].map(() => call("POST", `/api/library/changes/${id}/resubmit`, "user-A", { reason: "Named: Guide 5269 (2026)", label: "Guide 5269 (2026 edition)" })));
  ok("C11.9 pass: Send again twice at once: one waits again, the other is told (409)", twice.map((x) => x.s).sort().join(",") === "201,409", twice.map((x) => x.s));
  const ch = await call("GET", `/api/library/changes/${id}`, "user-A");
  ok("C11.9 pass: the change waits again with the new reason and the earlier note kept", ch.j.status === "WAITING" && /Named/.test(ch.j.reason) && /Which newer guide/.test(JSON.stringify(ch.j)), { status: ch.j.status, reason: ch.j.reason });
  ok("C11.9 QA-68 fail: a Name sent with a form change's resend is applied or refused, never silently dropped", ch.j.label === "Guide 5269 (2026 edition)" || twice.every((x) => x.s >= 400), { label: ch.j.label });
  const ap = await call("POST", `/api/library/changes/${id}/approve`, "user-B", { note: "ok" });
  ok("C11.9 pass: the second person approves the resent change", ap.s < 300 && ap.j.status === "APPROVED", ap.j.status ?? ap.j.detail);

  // ── R69-3: both delete and retire refused → the one action is greyed with its reason (pass) ──────────────────────────
  const both = await row("IMM 1295");
  const uses = (await call("GET", `/api/library/forms/${encodeURIComponent("IMM 1295")}/uses`, "user-A")).j;
  ok("C11.9 pass (R69-3 not reproduced): with delete and retire both refused, the row's action carries the reason (greyed)", !!uses.can?.delete && !!uses.can?.retire && !!both?.action?.why, { can: uses.can, action: both?.action });

  // ── Browser: the walk, R69-2 / QA-67, QA-68 page, R69-3 greyed ──────────────────────────────────────────────────────
  const browser = await chromium.launch({ headless: !process.env.QA_HEADED });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript(() => { try { if (!sessionStorage.getItem("qa-init")) { localStorage.setItem("xr-actor", "user-A"); sessionStorage.setItem("qa-init", "1"); } } catch {} });
  const rowEl = (code) => page.locator("tr", { hasText: code }).first();
  const actionOf = async (code) => rowEl(code).locator("button", { hasText: /Retire|Delete|Restore|Withdraw/ }).first().evaluate((b) => ({ text: b.innerText.replace(/\s+/g, " ").trim(), greyed: b.getAttribute("aria-disabled") === "true" || b.disabled }));
  const settle = async (code, re) => { for (let i = 0; i < 20; i++) { if (re.test((await actionOf(code)).text)) return true; await page.waitForTimeout(500); } return false; };
  await page.goto(`${B}/library/forms`); await rowEl("IMM 1295").waitFor({ timeout: 30_000 });
  const g = await actionOf("IMM 1295");
  await rowEl("IMM 1295").locator("button", { hasText: /Retire/ }).first().click({ force: true });
  ok("C11.9 pass (R69-3): IMM 1295's Retire is greyed and a click opens no panel; the reason shows under the row", g.greyed && !(await page.locator("aside[aria-label]").count()) && await page.getByText(/Still used:/).first().isVisible(), g);
  // Walk: Retire with a reason in the panel, the toast, Withdraw from the row with a reason.
  await rowEl("Guide 5289").locator("button", { hasText: /Retire/ }).first().click();
  const panel = page.locator("aside[aria-label]");
  await panel.waitFor();
  ok("C11.9 pass: the Retire panel names who approves and asks why (send greyed until a reason)", /second person/i.test(await panel.innerText()) && await panel.getByRole("button", { name: "Send for approval" }).isDisabled());
  await panel.locator("textarea").fill("Superseded guide; IRCC now points to the 2026 edition");
  await panel.getByRole("button", { name: "Send for approval" }).click();
  await page.getByText(/Sent for approval: Retire/).first().waitFor({ timeout: 15_000 });
  ok("C11.9 pass: sent, the toast offers Undo and the row offers Withdraw", await settle("Guide 5289", /^Withdraw/));
  await page.screenshot({ path: path.join(SHOTS, "01-retire-sent-withdraw.png") });
  // R69-2 / QA-67: switch to the approver without a reload; the row must follow the person.
  await page.getByRole("combobox").first().selectOption({ label: "Approver · Content publisher · second person" });
  await page.waitForTimeout(2500);
  const asApprover = await actionOf("Guide 5289");
  ok("C11.9 QA-67 fail (R69-2): after switching to the approver, the row no longer offers the author's Withdraw", !asApprover.text.startsWith("Withdraw"), asApprover);
  await page.reload(); await rowEl("Guide 5289").waitFor();
  const fresh = await actionOf("Guide 5289");
  await page.getByRole("combobox").first().selectOption({ label: "Configuration author · Super Admin · content publisher" });
  await page.waitForTimeout(2500);
  const back = await actionOf("Guide 5289");
  await page.screenshot({ path: path.join(SHOTS, "02-r69-2-author-sees-approver-row.png") });
  ok("C11.9 QA-67 fail (R69-2): switching back to the author brings their Withdraw back without a reload", back.text.startsWith("Withdraw") && !back.greyed, { approverFresh: fresh, authorAfterSwitch: back });
  await page.reload(); await rowEl("Guide 5289").waitFor();
  await rowEl("Guide 5289").locator("button", { hasText: /Withdraw/ }).first().click();
  await panel.waitFor();
  ok("C11.9 pass: Withdraw asks why (greyed until written)", await panel.getByRole("button", { name: "Withdraw" }).isDisabled());
  await panel.locator("textarea").fill("Wrong guide picked");
  await panel.getByRole("button", { name: "Withdraw" }).click();
  await page.getByText(/Withdrawn:/).first().waitFor({ timeout: 15_000 });
  ok("C11.9 pass: withdrawn, the row offers Retire again", await settle("Guide 5289", /^Retire/));
  // QA-68 on the page: a returned form change offers Name and Meaning on Send again.
  const c2 = await call("POST", `/api/library/forms/${encodeURIComponent("Guide 5289")}/retire`, "user-A", { reason: "Superseded by the 2026 guide" });
  await call("POST", `/api/library/changes/${c2.j.id}/return`, "user-B", { note: "Name the 2026 guide, please." });
  await page.goto(`${B}/review/change/${c2.j.id}`);
  await page.getByText("Send again").first().waitFor({ timeout: 30_000 });
  const fields = await page.locator("main input, main textarea").evaluateAll((els) => els.map((e) => e.labels?.[0]?.innerText?.trim()));
  await page.screenshot({ path: path.join(SHOTS, "03-qa68-resend-offers-name-meaning.png"), fullPage: true });
  ok("C11.9 QA-68 fail: Send again on a returned form retire asks only what changed (no Name or Meaning that would be dropped)", !fields.includes("Name") && !fields.includes("Meaning"), fields);
  await browser.close();

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`FAIL  the check stopped: ${e.stack}`); process.exit(1); });
