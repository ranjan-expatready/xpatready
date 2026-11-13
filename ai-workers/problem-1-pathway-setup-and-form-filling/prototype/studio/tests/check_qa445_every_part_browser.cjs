// QA-445 (Bake walk 1, BK-6; C6.2, QA-441 / P-498): the client's "Save and continue" goes to the next part that is not
// done, on every part, after the hand-off from the case page. Walk 1 found it saving and staying on the part (Visitor visa
// family: parts 1-7; Study permit family: 60 of 66 presses): it worked out its target on the first cached "sqr" view, the
// officer's (the case page's client card reads it), a stale copy. On the configured checkpoint (C10.1), for a Visitor visa
// family (principal, spouse, child) and a Study permit (outside Canada) family (principal, spouse, two children), each
// a brand-new case opened by the case officer through the product's routes:
//   the officer opens the case page and presses "Hand to Client A (simulated)" (in the same tab: the officer's cached view
//   stays); Client A presses Start, then "Save and continue" on every part, its required single questions answered just
//   before through the client's own route (the part passes and is done; a part with a required list of entries keeps the
//   client with its summary: "leave them for now and continue", the same target), until the walk comes back round. After each press: the client is on the part the
//   client's own view says is next not done (first later part not done, wrapping; the overview when none), never the
//   same part; "Part k of N" names the overview's k-th part, and N is the overview's count. US$0, live AI off.
//   COPY_PREFIX=screens zsh studio/tools/isolated.sh screens_q445w 4448 start && node studio/tests/check_qa445_every_part_browser.cjs 4448 xr_studio_screens_q445w
const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const PORT = Number(process.argv[2]), DB = process.argv[3];
if (!PORT || PORT === 4400 || !/^xr_studio_(?!demo)/.test(DB ?? "")) { console.error("usage: <port of an isolated copy, never 4400> <its database>"); process.exit(2); }
const BASE = `http://localhost:${PORT}`;
const BREW = "/opt/homebrew/opt/postgresql@18/bin/psql", PSQL = process.env.PSQL || (fs.existsSync(BREW) ? BREW : "psql");
const sql = (q) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const call = async (method, pth, actor, body) => { const r = await fetch(`${BASE}/api${pth}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined }); const t = await r.text(); return { status: r.status, body: t ? JSON.parse(t) : null }; };
let pass = 0, fail = 0;
const ok = (name, c, detail) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 400)}` : ""}`); };

// The client's own view, in the order the questionnaire shows it (questionnaire.tsx byPerson: person by person in the
// case's order, a relative right after their person) and partState's "done" (a check on the part, an answer needing a
// fix, a required question unanswered, or nothing answered and not passed on this device: not done).
const clientParts = async (caseId, passed) => {
  const v = (await call("GET", `/runtime/cases/${caseId}/questionnaire`, "user-P")).body;
  const at = (id) => { const [own, rel] = id.split("/"); return v.case.people.findIndex((p) => p.subject_id === own) + (rel ? 0.5 : 0); };
  return [...v.sections].sort((a, b) => at(a.subjectId) - at(b.subjectId)).map((s) => {
    const k = `${s.subjectId}|${s.section}`;
    const invalid = s.questions.some((q) => (q.group ? q.rows.some((r) => r.answer?.problems.length) : q.answer?.problems.length));
    const done = !v.checks.some((c) => c.subjectId === s.subjectId && c.section === s.section) && !invalid && !s.missing.length && (s.answered > 0 || passed.has(k));
    return { key: k, title: s.title, done };
  });
};
/** Before a press, the client's required single questions on this part are answered through the client's own route
 *  (as if typed on another device): the press then saves nothing new, the part passes (done) and Save and continue must
 *  move on. A list of entries (a group) is left: that part keeps the client with its summary, the other path. */
const SAMPLE = { yes_no: false, text: "SAMPLE", date: "2000-01-15", number: 1, country: "India", address: { street_number: "1", street_name: "SAMPLE ROAD", city: "NEW DELHI", country: "India" } };
const answerPart = async (caseId, key) => {
  const v = (await call("GET", `/runtime/cases/${caseId}/questionnaire`, "user-P")).body;
  const s = v.sections.find((x) => `${x.subjectId}|${x.section}` === key); if (!s) return 0;
  let n = 0;
  for (const q of s.questions) {
    if (!q.required || q.hidden || q.group || q.answer) continue;
    const o = q.options?.[0], value = o !== undefined ? (typeof o === "object" ? o.value ?? o.code : o) : q.value_type === "code" ? "SAMPLE" : SAMPLE[q.value_type];
    if (value === undefined) continue;
    if ((await call("PUT", `/runtime/cases/${caseId}/answers/${q.subjectId}/${q.fact}`, "user-P", { value, expectedId: null })).status < 300) n++;
  }
  return n;
};
const nextNotDone = (parts, from) => { for (let k = 1; k < parts.length; k++) { const i = (from + k) % parts.length; if (!parts[i].done) return i; } return null; };

(async () => {
  const has = sql("select count(distinct c.combination_key) from config_release r join combination c on c.id=r.combination_id where c.combination_key in ('vv.single','sp.outside')");
  if (Number(has) < 2) { const l = await call("POST", "/demo/load", "user-A", { sample: "configured" }); if (l.status >= 300) { console.log("STOP the configured checkpoint did not load", l.status); process.exit(1); } }
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const errs = [];
  // QA445_ONLY=shift runs only the last scenario (a quick before/after of review M1 and M2).
  for (const [key, label, family] of process.env.QA445_ONLY === "shift" ? [] : [["vv.single", "Visitor visa", [["spouse_or_partner", "Sample Spouse W"], ["child", "Sample Child W"]]], ["sp.outside", "Study permit (outside Canada)", [["spouse_or_partner", "Sample Spouse W"], ["child", "Sample Child S"], ["child", "Sample Child V"]]]]) {
    const ref = `QA445W-${key}-${Date.now() % 100000}`;
    const made = await call("POST", "/runtime/cases", "user-O", { combinationId: sql(`select id from combination where combination_key='${key}'`), reference: ref, clientActor: "user-P", principal: { displayName: "Sample Principal W" }, idempotencyKey: ref });
    const caseId = made.body?.id;
    const added = [];
    for (const [role, name] of family) added.push((await call("POST", `/runtime/cases/${caseId}/people`, "user-O", { role, displayName: name })).status);
    ok(`C6.2 QA-445 ${label}: setup: a family case of ${family.length + 1} opens`, made.status < 300 && !!caseId && added.every((s) => s < 300), { made: made.status, added });
    if (!caseId) continue;
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
    await ctx.addInitScript(() => { try { if (!sessionStorage.getItem("qa445w")) { localStorage.setItem("xr-actor", "user-O"); sessionStorage.setItem("qa445w", "1"); } } catch { /* ignore */ } });
    const p = await ctx.newPage(); p.on("pageerror", (e) => errs.push(e.message));
    // The officer's case page (its client card caches the client's view under the officer), then the hand-off, in-app.
    await p.goto(`${BASE}/cases/${caseId}`);
    await p.locator("[data-client-card-next], [data-handoff=client]").first().waitFor({ timeout: 60000 });
    await p.getByRole("button", { name: "Hand to Client A (simulated)" }).click();
    await p.getByText(/parts done/).waitFor({ timeout: 30000 });
    const main = p.locator("main");
    // The overview's parts, in its order (one list per person), and its count.
    const overview = await p.locator("main section[aria-labelledby^='p-'] li button > span:first-child").allInnerTexts();
    const count = /(\d+) of (\d+) parts done/.exec(await main.innerText());
    const passed = () => p.evaluate((id) => { try { return JSON.parse(localStorage.getItem(`xr-passed-${id}`) ?? "[]"); } catch { return []; } }, caseId).then((x) => new Set(x));
    const first = await clientParts(caseId, new Set());
    ok(`C6.2 QA-445 ${label}: the overview lists the client's ${first.length} parts in the questionnaire's order, "0 of ${first.length} parts done"`, overview.length === first.length && overview.every((t, i) => t === first[i].title) && count?.[1] === "0" && Number(count?.[2]) === first.length, { overview: overview.length, parts: first.length, count: count?.[0] });
    await p.getByRole("button", { name: "Start", exact: true }).click();
    const partOf = async () => { const l = main.getByText(/^Part \d+ of \d+ · /).first(); if (!(await l.count())) return null; const m = /^Part (\d+) of (\d+) · (.*)$/.exec((await l.innerText()).trim()); return m ? { n: Number(m[1]), of: Number(m[2]), title: m[3] } : null; };
    await main.getByText(/^Part 1 of \d+ · /).waitFor({ timeout: 15000 });
    // A part is known by its person and section (a save can add or drop parts: a "number" can name another part).
    let cur = await partOf(), presses = 0, summaries = 0, answered = 0;
    const stuck = [], wrong = [], counter = [];
    let parts = await clientParts(caseId, await passed());
    let curKey = parts[(cur?.n ?? 1) - 1]?.key;
    const seen = new Set([curKey]);
    const agrees = (at, list) => !!at && at.of === list.length && list[at.n - 1]?.title === at.title;
    for (let guard = 0; cur && guard < 200; guard++) {
      if (!agrees(cur, parts)) counter.push({ at: cur, view: parts[cur.n - 1]?.title, of: parts.length });
      const from = cur.n;
      answered += await answerPart(caseId, curKey);
      // The part's title and the line naming whom it is for: a new part, or the overview, changes it. Not its number or
      // the total: a save can add or drop parts before it while the client is still on it (the address is corrected).
      const head = () => p.evaluate(() => { const t = document.querySelector("main")?.innerText ?? ""; const m = /Part (\d+) of \d+ · ([^\n]*)/.exec(t); return m ? `${m[2]} | ${(/Answering for [^\n]*|Answered once for the whole application[^\n]*/.exec(t) ?? [""])[0]}` : "overview"; });
      const was = await head();
      const left = (w, summaryToo) => p.waitForFunction(([w, x]) => { const t = document.querySelector("main")?.innerText ?? ""; const m = /Part (\d+) of \d+ · ([^\n]*)/.exec(t); const h = m ? `${m[2]} | ${(/Answering for [^\n]*|Answered once for the whole application[^\n]*/.exec(t) ?? [""])[0]}` : "overview"; return (h !== w && !document.querySelector("button[aria-busy]")) || (x && /You can fix these now/.test(t)); }, [w, summaryToo], { timeout: 30000 }).then(() => true, () => false);
      await main.getByRole("button", { name: "Save and continue" }).click(); presses++;
      let moved = await left(was, true), viaSummary = false;
      if (moved && await main.getByRole("button", { name: "leave them for now and continue" }).isVisible().catch(() => false)) {
        summaries++; viaSummary = true; await main.getByRole("button", { name: "leave them for now and continue" }).click(); moved = await left(was, false);
      }
      const now = await partOf();
      parts = await clientParts(caseId, await passed());
      const at = parts.findIndex((x) => x.key === curKey), want = nextNotDone(parts, at >= 0 ? at : from - 1);
      const landedKey = now ? parts[now.n - 1]?.key : null;
      if (process.env.QA445_TRAIL) console.log(`  ${presses} (${viaSummary ? "summary" : "direct"}): ${curKey.split("|")[1]}@${from} → ${now ? `${now.n}/${now.of} ${landedKey?.split("|")[1]}` : "overview"} (want ${want === null ? "overview" : `${want + 1} ${parts[want].key.split("|")[1]}`}; at ${at + 1}; url ${new URL(p.url()).search})`);
      if (now && !agrees(now, parts)) counter.push({ at: now, view: parts[now.n - 1]?.title, of: parts.length });
      if (!moved || landedKey === curKey) { stuck.push({ press: presses, part: curKey, at: now, moved, path: viaSummary ? "summary" : "direct" }); break; }
      if ((want === null ? null : parts[want].key) !== landedKey) wrong.push({ press: presses, path: viaSummary ? "summary" : "direct", from: curKey, landed: now, want: want === null ? "the overview" : `${want + 1} ${parts[want].title}` });
      if (!now || seen.has(landedKey)) break; // the overview, or back round to a part already met
      seen.add(landedKey); cur = now; curKey = landedKey;
    }
    const left = parts.filter((x) => !x.done && !seen.has(x.key));
    ok(`C6.2 QA-445 ${label}: Save and continue never stays on the part it was pressed on (${presses} presses: ${presses - summaries} parts passed, ${summaries} left from the summary; ${answered} answers given)`, stuck.length === 0, stuck);
    ok(`C6.2 QA-445 ${label}: both ways out were walked: parts that pass and parts left from the summary`, presses - summaries > 0 && summaries > 0, { presses, summaries });
    ok(`C6.2 QA-445 ${label}: each press lands on the part the client's view says is next not done (the overview when none)`, wrong.length === 0, wrong.slice(0, 3));
    ok(`C6.2 QA-445 ${label}: when the walk came back round, every part not done had been reached (${seen.size} parts met; ${parts.length} now)`, left.length === 0, left.slice(0, 3));
    ok(`C6.2 QA-445 ${label}: "Part k of N" names the k-th part of the client's view and N its count, before and after every press`, counter.length === 0, counter.slice(0, 3));
    // The overview, at the end, lists the same parts in the same order.
    await p.goto(`${BASE}/cases/${caseId}/questionnaire`); await p.getByText(/parts done/).waitFor({ timeout: 30000 });
    const end = await p.locator("main section[aria-labelledby^='p-'] li button > span:first-child").allInnerTexts();
    const endCount = /(\d+) of (\d+) parts done/.exec(await main.innerText());
    ok(`C6.2 QA-445 ${label}: at the end the overview lists the client's ${parts.length} parts in the same order, with ${parts.filter((x) => x.done).length} done`, end.length === parts.length && end.every((t, i) => t === parts[i].title) && Number(endCount?.[2]) === parts.length && Number(endCount?.[1]) === parts.filter((x) => x.done).length, { overview: end.length, parts: parts.length, count: endCount?.[0] });
    await ctx.close();
  }
  // Review M2 (#1671): a press that leaves directly (the part passes, no summary) while parts were added or dropped BEFORE
  // the open part. A Visitor visa case of the principal and a child; Client A opens a child's part from the overview
  // (after the officer's hand-off, in-app), its required questions answered; the principal's Personal details is then
  // answered through the client's route (it decides which of the principal's parts are asked, and they come before the
  // child's); Client A presses Save and continue. Main swapped the open part for another under the same address; a
  // pin left in place on the person's own move (review M1) put the client back on the part just left.
  {
    const ref = `QA445S-${Date.now() % 100000}`;
    const made = await call("POST", "/runtime/cases", "user-O", { combinationId: sql("select id from combination where combination_key='vv.single'"), reference: ref, clientActor: "user-P", principal: { displayName: "Sample Principal S" }, idempotencyKey: ref });
    const caseId = made.body?.id;
    const child = (await call("POST", `/runtime/cases/${caseId}/people`, "user-O", { role: "child", displayName: "Sample Child S" })).body?.subject_id;
    // The child's first part that passes once its required single questions are answered.
    let pick = null;
    for (const x of (await clientParts(caseId, new Set())).filter((y) => y.key.startsWith(`${child}|`))) {
      await answerPart(caseId, x.key);
      if ((await clientParts(caseId, new Set())).find((y) => y.key === x.key)?.done) { pick = x; break; }
    }
    ok("C6.2 QA-445 shift: setup: a Visitor visa case of a principal and a child, with a child's part that passes", made.status < 300 && !!child && !!pick, { made: made.status, child, pick });
    const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
    await ctx.addInitScript(() => { try { if (!sessionStorage.getItem("qa445s")) { localStorage.setItem("xr-actor", "user-O"); sessionStorage.setItem("qa445s", "1"); } } catch { /* ignore */ } });
    const p = await ctx.newPage(); p.on("pageerror", (e) => errs.push(e.message));
    await p.goto(`${BASE}/cases/${caseId}`);
    await p.locator("[data-client-card-next], [data-handoff=client]").first().waitFor({ timeout: 60000 });
    await p.getByRole("button", { name: "Hand to Client A (simulated)" }).click();
    await p.getByText(/parts done/).waitFor({ timeout: 30000 });
    await p.locator(`main section[aria-labelledby='p-${child}'] li button`, { hasText: pick?.title ?? "-" }).first().click();
    const main = p.locator("main"); const line = main.getByText(/^Part \d+ of \d+ · /).first();
    await line.waitFor({ timeout: 15000 });
    const before = /^Part (\d+) of (\d+) · (.*)$/.exec((await line.innerText()).trim());
    // The principal's Personal details answered (as if on another device): marital status and the rest decide which of
    // the principal's parts are asked, and the principal's parts come before the child's.
    const principal = made.body?.people?.find?.((x) => x.role === "principal")?.subject_id ?? (await call("GET", `/runtime/cases/${caseId}`, "user-O")).body?.people?.find((x) => x.role === "principal")?.subject_id;
    const decided = await answerPart(caseId, `${principal}|personal_details`);
    const was = await main.innerText();
    await main.getByRole("button", { name: "Save and continue" }).click();
    const left = await p.waitForFunction((w) => { const t = document.querySelector("main")?.innerText ?? ""; const m = /Part \d+ of \d+ · ([^\n]*)/.exec(t); const a = (/Answering for [^\n]*/.exec(t) ?? [""])[0]; const wm = /Part \d+ of \d+ · ([^\n]*)/.exec(w); const wa = (/Answering for [^\n]*/.exec(w) ?? [""])[0]; return !document.querySelector("button[aria-busy]") && (/You can fix these now/.test(t) || !m || m[1] !== wm?.[1] || a !== wa); }, was, { timeout: 30000 }).then(() => true, () => false);
    const viaSummary = /You can fix these now/.test(await main.innerText());
    const parts = await clientParts(caseId, await p.evaluate((id) => { try { return JSON.parse(localStorage.getItem(`xr-passed-${id}`) ?? "[]"); } catch { return []; } }, caseId).then((x) => new Set(x)));
    const at = parts.findIndex((x) => x.key === pick?.key), want = nextNotDone(parts, at);
    const now = /^Part (\d+) of (\d+) · (.*)$/.exec(((await line.count()) ? await line.innerText() : "").trim());
    const landedKey = now ? parts[Number(now[1]) - 1]?.key : null;
    ok("C6.2 QA-445 shift: the answers moved the open part's place in the list (parts added or dropped before it)", decided > 0 && at >= 0 && at !== Number(before?.[1] ?? 0) - 1, { decided, before: before?.[1], now: at + 1 });
    ok("C6.2 QA-445 shift: the press left directly (the part passed: no summary)", left && !viaSummary, { left, viaSummary });
    ok(`C6.2 QA-445 shift: Save and continue lands on the next part not done (${want === null ? "the overview" : `Part ${want + 1}, ${parts[want].title}`}), never the part just left`, landedKey !== pick?.key && (want === null ? !now : landedKey === parts[want].key) && (!now || Number(now[2]) === parts.length), { landed: now?.[0], want: want === null ? null : `${want + 1} ${parts[want].title}` });
    await ctx.close();
  }
  ok("no page errors", errs.length === 0, errs.slice(0, 3));
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("STOP ", e); process.exit(1); });
