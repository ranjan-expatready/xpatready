// QA-338 (C6.19 BR-6, BR-1; qa lane 9 Nov): when two earlier cases of the same client disagree on a fact, the card's
// default earlier case (the newest) offers its own copy with no sign that a later confirmation elsewhere says otherwise.
// Case A (Visitor visa): passport number and expiry 2031-05-09 confirmed → case B (With an LMIA) re-confirms both from A
// → A's expiry is corrected to 2025-01-15 and confirmed → case C (With an LMIA): the card's first (default) earlier case
// is B, whose expiry row reads 2031-05-09, New, no flag; A's row reads Expired. Fails today; passes once the stale copy is
// flagged (or not offered) when a later confirmation on another earlier case of the same person differs. API only, US$0.
// Needs the configured checkpoint on the copy (Demo › Load the configured checkpoint).
//   zsh studio/tools/isolated.sh qa_338 4474 start --ttl 30 && trap 'zsh studio/tools/isolated.sh qa_338 4474 stop' EXIT && node studio/tests/qa/check_qa338_earlier_cases_disagree.cjs 4474
const PORT = process.argv[2] ?? "4473", BASE = `http://localhost:${PORT}`;
const api = async (method, url, body, actor = "user-O") => { const r = await fetch(`${BASE}/api${url}`, { method, headers: { "content-type": "application/json", "x-actor": actor }, body: body === undefined ? undefined : JSON.stringify(body) }); let j = null; try { j = await r.json(); } catch { /* empty */ } return { status: r.status, body: j }; };
const results = []; const ok = (n, pass, d = "") => { results.push(pass); console.log(`${pass ? "PASS" : "FAIL"}  ${n}${d === "" ? "" : ` — ${JSON.stringify(d)}`}`); };
(async () => {
  const run = Date.now().toString(36), NAME = `Client Q ${run}`;
  const open = (await api("GET", "/runtime/openable", undefined, "user-R")).body ?? [];
  const vv = open.find((o) => o.combination === "Visitor visa")?.combination_id, wp = open.find((o) => /With an LMIA/.test(o.combination))?.combination_id;
  if (!vv || !wp) { console.log("FAIL  setup: load the configured checkpoint first"); process.exit(2); }
  const mk = async (combo, ref) => (await api("POST", "/runtime/cases", { combinationId: combo, reference: ref, clientActor: "user-P", principal: { displayName: NAME } })).body;
  const qs = async (id) => (await api("GET", `/runtime/cases/${id}/questionnaire?mode=agent`)).body.sections.flatMap((s) => s.questions);
  const confirmAll = async (id, subject) => { const q = (await qs(id)).filter((x) => x.subjectId === subject && x.answer); for (const sec of new Set(q.map((x) => x.section))) await api("POST", `/runtime/cases/${id}/sections/${sec}/confirm`, { subjectId: subject, seen: q.filter((x) => x.section === sec).map((x) => x.answer.id) }); };
  const A = await mk(vv, `QA338-A-${run}`), pa = A.people.find((x) => x.role === "principal").subject_id;
  for (const [f, v] of [["person.passport_number", "Q3310001"], ["person.passport_expiry_date", "2031-05-09"]]) await api("PUT", `/runtime/cases/${A.id}/answers/${pa}/${f}`, { value: v, expectedId: null });
  await confirmAll(A.id, pa);
  const B = await mk(wp, `QA338-B-${run}`), pb = B.people.find((x) => x.role === "principal").subject_id;
  const offerB = (await api("GET", `/runtime/cases/${B.id}/earlier-facts`)).body.earlier.find((e) => e.case_id === A.id);
  const take = offerB.people.flatMap((p) => p.facts.filter((f) => /passport_(number|expiry_date)$/.test(f.fact)).map((f) => ({ subject_id: p.subject_id, fact: f.fact, from: f.from_answer })));
  const seen = Object.fromEntries(take.map((t) => [`${t.subject_id}|${t.fact}`, null]));
  const cp = await api("POST", `/runtime/cases/${B.id}/earlier-facts`, { earlierCase: A.id, take, seen });
  ok("setup: case B re-confirms the passport number and expiry from case A", cp.status < 300 && take.length === 2, cp.status);
  const ea = (await qs(A.id)).find((q) => q.subjectId === pa && q.fact === "person.passport_expiry_date");
  await api("PUT", `/runtime/cases/${A.id}/answers/${pa}/person.passport_expiry_date`, { value: "2025-01-15", expectedId: ea.answer.id });
  await confirmAll(A.id, pa);
  const C = await mk(wp, `QA338-C-${run}`);
  const list = (await api("GET", `/runtime/cases/${C.id}/earlier-facts`)).body.earlier;
  const rowIn = (caseId) => list.find((e) => e.case_id === caseId)?.people.flatMap((p) => p.facts).find((f) => f.fact === "person.passport_expiry_date");
  ok("setup: case A's row on case C reads Expired (its latest confirmed value is 2025-01-15)", rowIn(A.id)?.expiry?.status === "expired", rowIn(A.id));
  ok("setup: the card's default earlier case (the first listed) is case B, the newest", list[0]?.case_id === B.id, list.map((e) => e.reference));
  const b = rowIn(B.id);
  ok("QA-338: case B's stale copy of the expiry (2031-05-09) is flagged or not offered, since case A confirmed 2025-01-15 later for the same person", !b || b.expiry !== null || /differ|later|another earlier case/i.test(JSON.stringify(b)), b);
  const passed = results.filter(Boolean).length; console.log(`\n${passed}/${results.length} passed`); process.exit(passed === results.length ? 0 : 1);
})();
