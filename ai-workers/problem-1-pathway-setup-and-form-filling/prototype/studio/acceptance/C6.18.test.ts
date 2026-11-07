// C6.18 Officer entry for background answers (row B140 = L-SA10; P-244 amends P-97 and C4.9; P-406). Staff may record
// a client's background answer taken by phone or in person: it is marked "Officer" with who and when; declarations
// refuse staff entry; no blank is ever defaulted; before signing, the client sees and re-confirms every background
// answer an officer recorded (until then it is not confirmed, so no form writes it and the form is not ready to sign
// or file, P-71, P-72). Visitor visa on the configured checkpoint: which answers are background ones comes from data,
// IMM 5257's own "BACKGROUND INFORMATION" block as its reading lists it (IRCC-F08, compliance-trace.md) or a section the
// library marks client-only (P-97). Sample people and values only; no AI (US$0).
// Needs first, on a fresh copy, in this order (else it stops with exit 2, "Setup missing"):
//   zsh studio/tools/isolated.sh accept 4440 start
//   tsx studio/tests/runtime/setup_visitor_visa.ts 4440 xr_studio_accept
//   tsx studio/acceptance/lib/setup_vv_m3.ts 4440 xr_studio_accept      (exits 1 on its own known gaps; fine)
//   tsx studio/acceptance/C6.18.test.ts 4440 xr_studio_accept
import { CLIENT, CLIENT_B, call, firms, main, needVisitorVisa, ok, openCase, OFFICER, sql, yearsAgo } from "./lib/m3.ts";

type A = { id: string; value: unknown; status: string; channel: string; by: string; at: string; confirmed: boolean; why: string; officer?: { by: string; at: string } | null; awaits_client?: boolean };
type Q = { subjectId: string; fact: string; label: string; value_type: string; section: string; group: string | null; hidden: boolean; background?: boolean; answer: A | null; fills: { form: string }[] };
type View = { sections: { subjectId: string; section: string; questions: Q[] }[] };

await main("C6.18", "Officer entry for background answers; the client re-confirms before signing", async () => {
  const vv = needVisitorVisa();
  const f = await firms();
  const officer = f.officer ?? OFFICER;
  const c = await openCase(vv, [{ role: "principal", name: "Sample Client A", dob: yearsAgo(40) }, { role: "spouse_or_partner", name: "Sample Spouse A", dob: yearsAgo(38) }], { representative: f.rep, caseOfficers: [officer] });
  const P = c.subjects["Sample Client A"], S = c.subjects["Sample Spouse A"];
  const view = async (actor: string, mode: "agent" | "sqr") => (await call("GET", `/runtime/cases/${c.id}/questionnaire?mode=${mode}`, undefined, actor)).body as View;
  const qs = (v: View) => (v?.sections ?? []).flatMap((s) => s.questions);
  const q = async (actor: string, mode: "agent" | "sqr", subject: string, fact: string) => qs(await view(actor, mode)).find((x) => x.subjectId === subject && x.fact === fact);
  const put = async (subject: string, fact: string, value: unknown, actor: string) => {
    const cur = await q(actor, actor === CLIENT ? "sqr" : "agent", subject, fact);
    return call("PUT", `/runtime/cases/${c.id}/answers/${subject}/${fact}`, { value, expectedId: cur?.answer?.id ?? null }, actor);
  };

  // Which questions are background ones: from the release's data (IMM 5257's own Background information block).
  const bg = qs(await view(officer, "agent")).filter((x) => x.subjectId === P && x.background && !x.group && !x.hidden && x.value_type === "yes_no");
  const crime = bg.find((x) => /criminal/i.test(x.label)) ?? bg[0], refused = bg.find((x) => x !== crime && /refused/i.test(x.label)) ?? bg.find((x) => x !== crime);
  ok("C6.18-1 pass: the case's view marks the Background information questions (IMM 5257's own block, by its reading): the criminal-history question and at least five more yes/no questions", !!crime && /criminal/i.test(crime.label) && bg.length >= 6, bg.map((x) => x.label.slice(0, 50)));
  const notBg = qs(await view(officer, "agent")).find((x) => x.subjectId === P && x.fact === "person.family_name");
  ok("C6.18-1b fail: a question outside the Background block (family name) is not marked background", !!notBg && !notBg.background, notBg?.background);
  if (!crime || !refused) return;

  // Officer entry: allowed, marked Officer with who and when.
  let r = await put(P, crime.fact, false, officer);
  const stored = sql(`select source_json->>'channel' || '|' || (source_json->>'actor') from client_canonical_answer where subject_id='${P}' and canonical_field_key='${crime.fact}' and superseded_by_id is null`);
  ok("C6.18-2 pass: the case officer records a background answer taken by phone (No); the reply says it is marked Officer and the client re-confirms it", r.status === 200 && /Officer/.test(r.body?.message ?? "") && /re-confirm/i.test(r.body?.message ?? ""), r.body?.message ?? r.status);
  ok("C6.18-3 pass (data): it is stored as an Agent view answer by that officer, never as the client's", stored === `agent_view|${officer}`, stored);
  let a = (await q(officer, "agent", P, crime.fact))?.answer;
  ok("C6.18-4 pass: the Agent view shows it marked Officer with who and when, waiting for the client, not confirmed", a?.officer?.by === officer && !!a?.officer?.at && a?.awaits_client === true && a?.confirmed === false && /re-confirm/i.test(a?.why ?? ""), a);

  // The officer's own "Confirm section" never confirms it.
  const sec = (await view(officer, "agent")).sections.find((s) => s.subjectId === P && s.section === crime.section)!;
  const seen = sec.questions.map((x) => x.answer?.id).filter(Boolean);
  r = await call("POST", `/runtime/cases/${c.id}/sections/${crime.section}/confirm`, { subjectId: P, seen }, officer);
  a = (await q(officer, "agent", P, crime.fact))?.answer;
  ok("C6.18-5 fail: the officer's Confirm section leaves it waiting for the client (counted, not confirmed)", r.status < 300 && r.body?.awaiting_client >= 1 && a?.awaits_client === true && a?.confirmed === false && a?.status === "DECLARED", { status: r.status, awaiting: r.body?.awaiting_client, a });

  // Declarations refuse staff entry (P-97, P-130).
  const decl = qs(await view(officer, "agent")).find((x) => x.subjectId === P && x.value_type === "declaration");
  // On the checkpoint IRCC's declarations are signed on the forms (their boxes are "never filled" or "by hand"), so no
  // release asks one as a question; the refusal itself is proved on a Sample declaration in the runtime suite
  // (tests/check_c618_officer_background.ts, C6.18-API-6). setup_c44_types.ts's Sample declaration is not used
  // here: on the checkpoint it leaves Visitor visa not ready for new cases (a release check item).
  if (!decl) console.log("PENDING  C6.18-6 fail: a declaration refuses staff entry — this release asks no declaration as a question; proved in tests/check_c618_officer_background.ts");
  else {
    r = await put(P, decl.fact, true, officer);
    ok("C6.18-6 fail: the officer cannot make a declaration for the client (403, in words); nothing is stored", r.status === 403 && /declaration/i.test(r.body?.detail ?? "") && sql(`select count(*) from client_canonical_answer where subject_id='${P}' and canonical_field_key='${decl.fact}'`) === "0", r.body?.detail ?? r.status);
  }

  // No blank is defaulted.
  const before = sql(`select count(*) from client_canonical_answer where subject_id='${P}' and canonical_field_key='${refused.fact}'`);
  const blanks = await Promise.all([null, "", "   ", [], {}].map(async (v) => (await call("PUT", `/runtime/cases/${c.id}/answers/${P}/${refused.fact}`, { value: v, expectedId: null }, officer)).status));
  ok("C6.18-7 fail: an empty, missing or blank-in-any-shape background answer (spaces, [], {}) is refused (400) and nothing is stored", blanks.every((s) => s === 400) && sql(`select count(*) from client_canonical_answer where subject_id='${P}' and canonical_field_key='${refused.fact}'`) === before, blanks);
  ok("C6.18-8 fail: a background question nobody answered stays unanswered after the officer's Confirm section (no answer is made up)", (await q(officer, "agent", P, refused.fact))?.answer === null);

  // Before signing: not confirmed, so the form does not write it and is not ready.
  const forms = async () => ((await call("GET", `/runtime/cases/${c.id}/forms`, undefined, officer)).body?.forms ?? []) as { form: string; person: string; subject?: string; applies: boolean; readiness: { ready: boolean; facts?: { fact: string; state?: string; why?: string }[] } & Record<string, unknown> }[];
  const imm5257 = (await forms()).find((x) => x.form === "IMM 5257" && (x.subject ?? x.person) === P) ?? (await forms()).find((x) => x.form === "IMM 5257");
  ok("C6.18-9 fail: IMM 5257 is not ready to sign or file while the officer's background answer waits for the client, and says so", !!imm5257 && imm5257.readiness.ready === false && /re-confirm/i.test(JSON.stringify(imm5257.readiness)), imm5257?.readiness);

  // The client sees each officer-recorded answer and re-confirms it; only the client can.
  const mine = await q(CLIENT, "sqr", P, crime.fact);
  ok("C6.18-10 pass: the client's questionnaire shows the answer with who on the staff recorded it and when, waiting for them", mine?.answer?.officer?.by === officer && mine?.answer?.awaits_client === true, mine?.answer);
  const id = mine?.answer?.id ?? "";
  r = await call("POST", `/runtime/cases/${c.id}/answers/${id}/reconfirm`, {}, officer);
  ok("C6.18-11 fail: staff cannot re-confirm for the client (403, in words)", r.status === 403 && /client/i.test(r.body?.detail ?? ""), r.body?.detail ?? r.status);
  r = await call("POST", `/runtime/cases/${c.id}/answers/${id}/reconfirm`, {}, CLIENT_B);
  ok("C6.18-12 fail: another client cannot reach it (404)", r.status === 404, r.status);
  // A stale view: the officer changes the answer after the client opened it.
  await put(P, crime.fact, true, officer);
  r = await call("POST", `/runtime/cases/${c.id}/answers/${id}/reconfirm`, {}, CLIENT);
  ok("C6.18-13 fail: re-confirming the version the client saw after the officer changed it is refused (409) and names the newer answer", r.status === 409 && !!r.body?.current?.id && r.body.current.id !== id, r.body?.detail ?? r.status);
  await put(P, crime.fact, false, officer);
  const now = (await q(CLIENT, "sqr", P, crime.fact))?.answer;
  r = await call("POST", `/runtime/cases/${c.id}/answers/${now?.id}/reconfirm`, {}, CLIENT);
  a = (await q(CLIENT, "sqr", P, crime.fact))?.answer;
  const row = sql(`select source_json->>'channel' || '|' || (source_json->>'actor') || '|' || (select source_json->>'channel' from client_canonical_answer o where o.id::text = n.source_json->>'from') from client_canonical_answer n where subject_id='${P}' and canonical_field_key='${crime.fact}' and superseded_by_id is null`);
  ok("C6.18-14 pass: the client re-confirms it: it counts as their own answer, still shows who on the staff recorded it", r.status < 300 && a?.awaits_client === false && a?.confirmed === true && a?.officer?.by === officer && a?.value === false, a);
  ok("C6.18-15 pass (data): a new version by the client, naming the officer's answer (history kept)", row === `client_reconfirm|${CLIENT}|agent_view`, row);
  r = await call("POST", `/runtime/cases/${c.id}/answers/${a?.id}/reconfirm`, {}, CLIENT);
  ok("C6.18-16 fail: nothing is re-confirmed twice (409, in words)", r.status === 409 && /nothing to re-confirm/i.test(r.body?.detail ?? ""), r.body?.detail ?? r.status);
  const after = (await forms()).find((x) => x.form === imm5257?.form && (x.subject ?? x.person) === (imm5257?.subject ?? imm5257?.person));
  ok("C6.18-17 pass: once re-confirmed, IMM 5257 no longer waits on the client for it", !!after && !/re-confirm/i.test(JSON.stringify(after.readiness)), after?.readiness);

  // Change instead of re-confirm: the client answers again; their own answer replaces the officer's.
  await put(P, refused.fact, false, officer);
  r = await put(P, refused.fact, true, CLIENT);
  a = (await q(officer, "agent", P, refused.fact))?.answer;
  ok("C6.18-18 pass: the client changes an officer-recorded answer by answering it: their own answer, no longer marked Officer", r.status === 200 && a?.value === true && a?.awaits_client === false && !a?.officer && a?.confirmed === true, a);

  // Another adult on the case: the principal re-confirms for them; then it is "answered by the principal" until the
  // officer confirms the section (P-78), as any answer the principal gives for an adult.
  await put(S, crime.fact, false, officer);
  const sp = (await q(CLIENT, "sqr", S, crime.fact))?.answer;
  r = await call("POST", `/runtime/cases/${c.id}/answers/${sp?.id}/reconfirm`, {}, CLIENT);
  let sa = (await q(officer, "agent", S, crime.fact))?.answer;
  ok("C6.18-19 pass: the client re-confirms the spouse's officer-recorded answer; it waits only for the usual confirmation of an adult's answer", r.status < 300 && sa?.awaits_client === false && /principal/i.test(sa?.why ?? ""), sa);
  const sSec = (await view(officer, "agent")).sections.find((s) => s.subjectId === S && s.section === crime.section)!;
  r = await call("POST", `/runtime/cases/${c.id}/sections/${crime.section}/confirm`, { subjectId: S, seen: sSec.questions.map((x) => x.answer?.id).filter(Boolean) }, officer);
  sa = (await q(officer, "agent", S, crime.fact))?.answer;
  ok("C6.18-20 pass: then the officer's Confirm section confirms it (the officer mark stays)", r.status < 300 && sa?.confirmed === true && sa?.status === "VERIFIED" && sa?.officer?.by === officer, sa);
});
