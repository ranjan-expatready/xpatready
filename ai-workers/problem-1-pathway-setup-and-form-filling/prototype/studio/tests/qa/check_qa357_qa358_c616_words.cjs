// qa checks for C6.16 (qa capability round, main 1d07807c8, 9 Nov; qa/reports/2026-11-09-c616/). Each fails today and
// passes when fixed. Fresh Visitor visa case per run (Client A, Partner 38, a child of 19); needs Visitor visa released
// on the copy from Demo › Load the configured checkpoint (its release asks "Contact information"). Sample data, no live AI, US$0.
//   QA-357: after the case officer's "Keep private…" tick on an adult who was never sent a link, Client A's card must not
//           say "<person> is answering on their own link".
//   QA-358: on the adult's own link, a part holding Client A's answer must not show staff words ("the officer's
//           'Confirm section'", "fills … forms now and is confirmed before filing").
//   zsh studio/tools/isolated.sh qa_c616 4473 start --ttl 30 && node studio/tests/qa/check_qa357_qa358_c616_words.cjs 4473
const { chromium } = require("../../node_modules/playwright");
const PORT = process.argv[2] ?? "4473", BASE = `http://127.0.0.1:${PORT}`;
const results = [];
const ok = (name, pass, detail = "") => { results.push(pass); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${pass || !detail ? "" : ` — ${String(detail).replace(/\s+/g, " ").slice(0, 400)}`}`); };
const call = async (method, path, body, actor = "user-O") => { const r = await fetch(`${BASE}/api${path}`, { method, headers: { ...(actor ? { "x-actor": actor } : {}), "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) }); let j = null; try { j = await r.json(); } catch { /* not JSON */ } return { status: r.status, body: j }; };
const yearsAgo = (y) => { const d = new Date(); d.setUTCFullYear(d.getUTCFullYear() - y); return d.toISOString().slice(0, 10); };
const T = { timeout: 20000 };
(async () => {
  const vv = ((await call("GET", "/runtime/openable")).body ?? []).find((r) => /Visitor visa/.test(r.combination) && r.startable);
  if (!vv) { console.error("STOP  Visitor visa is not released on this copy"); process.exit(2); }
  const run = Date.now().toString(36), ADDRESS = `partner.${run}@example.com`;
  const c = await call("POST", "/runtime/cases", { combinationId: vv.combination_id, reference: `QA357-${run}`, clientActor: "user-P", principal: { displayName: "Sample Client A" } });
  const id = c.body?.id, P = c.body?.people?.find((x) => x.role === "principal")?.subject_id;
  const add = async (role, displayName) => (await call("POST", `/runtime/cases/${id}/people`, { role, displayName })).body?.subject_id;
  const S = await add("spouse_or_partner", "Sample Partner"), C19 = await add("child", "Sample Child 19");
  for (const [s, d] of [[P, yearsAgo(40)], [S, yearsAgo(38)], [C19, yearsAgo(19)]]) await call("PUT", `/runtime/cases/${id}/answers/${s}/person.date_of_birth`, { value: d, expectedId: null });
  await call("PUT", `/runtime/cases/${id}/answers/${S}/person.email`, { value: `by.client.a.${run}@example.com`, expectedId: null }, "user-P");
  const tick = await call("PUT", `/runtime/cases/${id}/people/${C19}/private`, { reason: "Asked the firm for privacy (Sample, qa)" });
  const sent = await call("POST", `/runtime/cases/${id}/people/${S}/link`, { address: ADDRESS, idempotencyKey: `qa357-${run}` }, "user-P");
  if (!id || tick.status >= 300 || sent.status >= 300) { console.error(`STOP  setup: case ${c.status}, tick ${tick.status}, send ${sent.status}`); process.exit(2); }
  const browser = await chromium.launch(process.platform === "darwin" || require("node:fs").existsSync("/usr/bin/google-chrome") ? { channel: "chrome" } : {});
  try {
    // QA-357: Client A's card for the child of 19 (kept private by staff, no link ever sent)
    const ca = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await ca.addInitScript(() => localStorage.setItem("xr-actor", "user-P"));
    const a = await ca.newPage(); await a.goto(`${BASE}/cases/${id}/questionnaire`);
    const card = a.locator("section", { has: a.getByRole("heading", { name: "About Sample Child 19" }) }).locator("[data-private-progress]");
    await card.waitFor(T);
    const words = await card.innerText();
    ok("QA-357 C6.16: after a staff tick with no link sent, Client A's card does not say the person is answering on their own link", !/answering on their own link/.test(words), words);
    // QA-358: Partner's own link, the part holding Client A's answer
    const cp = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const b = await cp.newPage();
    const inbox = async () => (await call("GET", `/demo/inbox?address=${encodeURIComponent(ADDRESS)}`, undefined, null)).body?.messages ?? [];
    await b.goto(`${BASE}${(await inbox()).find((m) => m.kind === "link")?.link}`);
    await b.getByRole("button", { name: "Send me a code" }).click();
    await b.getByLabel("Code (required)").waitFor(T);
    const code = (/code is (\d{3}) (\d{3})/.exec((await inbox()).find((m) => m.kind === "code")?.body ?? "") ?? []).slice(1).join("");
    await b.getByLabel("Code (required)").fill(code); await b.getByRole("button", { name: "Continue" }).click();
    await b.getByRole("button", { name: "Continue to my questions" }).click();
    await b.getByRole("button", { name: /^Contact information/ }).first().click();
    await b.getByText(/Answered by Client A/).first().waitFor(T);
    const page = await b.locator("main").innerText();
    const staffWords = /Confirm section|the officer's|is confirmed before filing/.exec(page);
    ok("QA-358 C6.16: the adult's own part shows no staff words about Client A's answer (\"the officer's 'Confirm section'\")", !staffWords, staffWords ? page.slice(Math.max(0, staffWords.index - 160), staffWords.index + 60) : "");
    // QA-357, second state (fresh reader): after the officer takes Partner's link back, Client A's card must not say
    // Partner "is answering on their own link" above "The link was taken back".
    const tb = await call("DELETE", `/runtime/cases/${id}/people/${S}/link`, { reason: "Asked by the person (Sample, qa)" });
    await a.reload();
    const pcard = a.locator("section", { has: a.getByRole("heading", { name: "About Sample Partner" }) }).locator("[data-private-progress]");
    await pcard.getByText(/taken back/).first().waitFor(T);
    const pwords = await pcard.innerText();
    ok("QA-357 C6.16: after a take back, Client A's card does not say the person is answering on their own link", tb.status < 300 && !/answering on their own link/.test(pwords), `${tb.status} ${pwords}`);
  } finally { await browser.close(); }
  const passed = results.filter(Boolean).length;
  console.log(`\n${passed}/${results.length} passed`); process.exit(passed === results.length ? 0 : 1);
})().catch((e) => { console.error(`STOP  ${e.message}`); process.exit(2); });
