// QA-441 (P-498; C6.2, the client questionnaire one part per screen): on a second pass, Save and continue goes to the
// first later part that is not done, wrapping round, or to the overview when every other part is done; it never walks
// through the parts already done. Walked in a real browser as Client A (user-P) at 1440 px on the finished story (C10.2:
// its family case has every part answered), each "comes back" a fresh browser (nothing passed on this device):
//   (1) every part done → edit part 1, Save and continue → the overview, "Every part is answered" (main: Part 2);
//   (2) one later part needs a fix (an answer saved earlier that fails its check, put through the client's own route)
//       → edit part 1, Save and continue → that part, past the done parts between (main: Part 2);
//   (3) wrapping: from the last part, Save and continue → that same part (main: the overview);
//   (4) on that part, Save and continue keeps the client with the summary; "leave them for now and continue" → the
//       overview, as no other part is left (main: the next part, done).
// axe (WCAG 2.2 AA) on the landing states; data checked underneath through the API (part 1's edit is saved). US$0.
// Screenshots into product/screens/qa-441/screenshots/.
//   COPY_PREFIX=screens zsh studio/tools/isolated.sh screens_qa441 4446 start && node studio/tests/check_qa441_next_not_done_browser.cjs 4446
const path = require("node:path"); const fs = require("node:fs");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4446);
const BASE = `http://localhost:${PORT}`;
const ROOT = path.resolve(__dirname, "..", "..", "..");
const SHOTS = path.join(ROOT, "product", "screens", "qa-441", "screenshots"); fs.mkdirSync(SHOTS, { recursive: true });
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined && !ok ? ` — ${String(typeof detail === "string" ? detail : JSON.stringify(detail)).slice(0, 300)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const errs = [];
  const api = async (pth, init = {}) => { const r = await fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, ...(init.data ? { body: JSON.stringify(init.data) } : {}) }); const t = await r.text(); return { status: r.status, body: t ? JSON.parse(t) : null }; };
  /** Client A comes back: a fresh browser, nothing passed on this device. */
  const comeBack = async () => {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
    await ctx.addInitScript(() => { try { if (!sessionStorage.getItem("qa441-set")) { localStorage.setItem("xr-actor", "user-P"); sessionStorage.setItem("qa441-set", "1"); } } catch { /* ignore */ } });
    const p = await ctx.newPage(); p.on("pageerror", (e) => errs.push(e.message));
    return p;
  };
  // The part shown, or null on the overview (review m3: no wait when there is no part line).
  const partOf = async (p) => { const l = p.getByText(/^Part \d+ of \d+/).first(); const t = (await l.count()) ? await l.innerText() : ""; const m = /^Part (\d+) of (\d+) · (.*)$/.exec(t.trim()); return m ? { n: Number(m[1]), of: Number(m[2]), title: m[3] } : null; };
  const openPart = async (p, caseId, n) => { await p.goto(`${BASE}/cases/${caseId}/questionnaire?part=${n}`); await p.getByText(new RegExp(`^Part ${n} of \\d+`)).waitFor({ timeout: 30000 }); };
  /** Press Save and continue and wait until the client has left part `from` (another part, or the overview), or the
   *  summary shows; a wait that times out is a failed step naming it (review m2), never silent. */
  const settled = (p, why) => p.waitForFunction(() => !document.querySelector("button[aria-busy]"), undefined, { timeout: 15000 }).then(() => true, () => { step(`${why}: the page settles (no busy button)`, false); return false; });
  const saveAndContinue = async (p, from) => {
    await p.getByRole("button", { name: "Save and continue" }).click();
    const left = await p.waitForFunction((n) => { const t = document.querySelector("main")?.innerText ?? ""; return !new RegExp(`(^|\\n)Part ${n} of \\d+`).test(t) || /You can fix these now/.test(t); }, from, { timeout: 30000 }).then(() => true, () => false);
    if (!left) step(`Save and continue on Part ${from}: the client leaves the part or sees the summary within 30 s`, false);
    await settled(p, `Save and continue on Part ${from}`);
  };
  const overview = async (p) => /Every part is answered/.test(await p.locator("main").innerText()) && (await partOf(p)) === null;
  const axe = async (p, name) => { const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).include("main").analyze(); step(`axe: ${name} has no WCAG 2.2 AA violation`, r.violations.length === 0, r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)); };
  const funds = (p) => p.getByLabel("Funds available for the stay, in Canadian dollars");

  // Set-up: the finished story (every part of the family case answered by its people, C10.2).
  const started = await api("/demo/checkpoints/finished-story", { method: "POST", data: { confirm: "RESET" } });
  let story = null;
  for (let i = 0; i < 200; i++) { story = (await api("/demo/status")).body?.story; if (story?.state !== "running") break; await new Promise((ok) => setTimeout(ok, 3000)); }
  const fam = story?.cases?.family;
  step("setup: the finished story loads, with its family case", started.status === 202 && story?.state === "done" && !!fam, { started: started.status, state: story?.state, error: story?.error });
  if (!fam) { await b.close(); console.log(`\n${pass} passed, ${fail} failed`); process.exit(1); }

  // (1) Every part done: Client A comes back, edits part 1, Save and continue → the overview.
  let p = await comeBack();
  await p.goto(`${BASE}/cases/${fam}/questionnaire`); await p.getByText(/parts done/).waitFor({ timeout: 30000 });
  const done = /(\d+) of (\d+) parts done/.exec(await p.locator("main").innerText());
  const total = Number(done?.[2] ?? 0);
  step("(1) Client A comes back: every part is answered (N of N parts done)", !!done && done[1] === done[2] && total > 3 && await overview(p), done?.[0]);
  await openPart(p, fam, 1);
  const first = await partOf(p);
  const before = await funds(p).inputValue();
  const edited = String(Number(before || 0) + 500);
  await funds(p).fill(edited);
  await saveAndContinue(p, 1);
  step("(1) QA-441: edit part 1, Save and continue → the overview, \"Every part is answered\" (not Part 2, already done)", await overview(p), await partOf(p));
  await p.screenshot({ path: path.join(SHOTS, "qa441-1-overview-after-part-1-1440.png"), fullPage: false });
  await axe(p, "(1) the overview after Save and continue");
  const sec1 = (await api(`/runtime/cases/${fam}/questionnaire`, { actor: "user-P" })).body?.sections ?? [];
  const fundsNow = sec1.flatMap((s) => s.questions).find((q) => q.fact === "case.funds_available_cad")?.answer?.value;
  step("(1) underneath: part 1's edit is saved", String(fundsNow) === edited, { fundsNow, edited });
  await p.context().close();

  // (2) A later part needs a fix: Client A's own email, saved earlier and failing its check (stored and flagged, P-47).
  const view = (await api(`/runtime/cases/${fam}/questionnaire`, { actor: "user-P" })).body;
  const clientA = view.case.people.find((x) => x.role === "principal")?.subject_id;
  const contact = view.sections.find((s) => s.subjectId === clientA && s.section === "contact_information");
  const email = contact?.questions.find((q) => q.fact === "person.email");
  const put = await api(`/runtime/cases/${fam}/answers/${clientA}/person.email`, { method: "PUT", actor: "user-P", data: { value: "not-an-email", expectedId: email?.answer?.id ?? null } });
  step("(2) setup: Client A's email saved earlier, failing its check", put.status === 200 && (put.body?.answer?.problems ?? []).length > 0, { status: put.status });
  p = await comeBack();
  await p.goto(`${BASE}/cases/${fam}/questionnaire`); await p.getByText(/parts done/).waitFor({ timeout: 30000 });
  // The part that needs fixing, by its place in the client's own order (the overview's "Continue where you left off").
  await p.getByRole("button", { name: /Continue where you left off/ }).click(); await p.getByText(/^Part \d+ of \d+/).waitFor({ timeout: 30000 });
  const target = await partOf(p);
  step("(2) the part that needs fixing is Client A's Contact information, with done parts between part 1 and it", target?.title === "Contact information" && target.n > 2, target);
  await openPart(p, fam, 1);
  await funds(p).fill(String(Number(edited) + 500));
  await saveAndContinue(p, 1);
  const landed = await partOf(p);
  step(`(2) QA-441: edit part 1, Save and continue → the first part not done (Part ${target?.n}, Contact information), past ${(target?.n ?? 2) - 2} done parts`, !!landed && landed.n === target?.n && landed.title === "Contact information", landed);
  await p.screenshot({ path: path.join(SHOTS, "qa441-2-next-not-done-1440.png"), fullPage: false });
  await axe(p, "(2) the part not done, reached by Save and continue");

  // (3) Wrapping: from the last part (done), Save and continue → the part not done, before it.
  await openPart(p, fam, total);
  await saveAndContinue(p, total);
  const wrapped = await partOf(p);
  step(`(3) QA-441: from the last part (${total}), Save and continue wraps round to Part ${target?.n} (not the overview)`, !!wrapped && wrapped.n === target?.n, wrapped);

  // (4) On that part, Save and continue keeps the client with the summary; leaving anyway → the overview, nothing else left.
  await saveAndContinue(p, target?.n ?? 0);
  const summary = p.getByRole("button", { name: "leave them for now and continue" });
  step("(4) the part that needs fixing keeps the client, with the summary (P-47, QA-36)", (await partOf(p))?.n === target?.n && await summary.isVisible().catch(() => false));
  await summary.click();
  const left4 = await p.waitForFunction(() => !/(^|\n)Part \d+ of \d+/.test(document.querySelector("main")?.innerText ?? ""), undefined, { timeout: 15000 }).then(() => true, () => false);
  if (!left4) step("(4) \"leave them for now and continue\": the client leaves the part within 15 s", false, await partOf(p));
  const main4 = await p.locator("main").innerText();
  step("(4) QA-441: \"leave them for now and continue\" → the overview, as no other part is left (not the next part, done)", (await partOf(p)) === null && new RegExp(`${total - 1} of ${total} parts done`).test(main4), (await partOf(p)) ?? main4.slice(0, 200));
  await p.screenshot({ path: path.join(SHOTS, "qa441-4-overview-one-left-1440.png"), fullPage: false });
  await p.context().close();

  step("no page errors", errs.length === 0, errs);
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("STOP ", e); process.exit(1); });
