// C6.18 for IMM 5257 Schedule 1 (row B154; P-97, P-244, P-412 F11): the founder ruled that Schedule 1's military
// service, government positions and organisation answers are background answers (Unconfirmed: expert, no counsel). The
// author marks those library sections through the product's own path (Library › Sections › Background answers…, a
// reason), a second person approves on To review, the content reviewer signs off the release's "Background answers"
// lines and the next Visitor visa release carries the mark. Then, on a new case, Schedule 1's questions behave as
// background answers (C6.18): marked background, an officer's answer is marked Officer and waits for the client, the
// officer's Confirm section does not confirm it, and the client re-confirms it. Before the mark they behave as on main.
// Its own file, so C6.18.test.ts stays quick. Visitor visa on the configured checkpoint; Sample people and values; no AI
// (US$0).
// Needs first, on a fresh copy (else it stops with exit 2, "Setup missing"):
//   zsh studio/tools/isolated.sh accept 4440 start
//   tsx studio/tests/runtime/setup_visitor_visa.ts 4440 xr_studio_accept
//   tsx studio/acceptance/lib/setup_vv_m3.ts 4440 xr_studio_accept      (exits 1 on its own known gaps; fine)
//   tsx studio/acceptance/C6.18-schedule1.test.ts 4440 xr_studio_accept
// (Gate B with GATE_B_DATA=checkpoint loads the configured checkpoint instead of those two set-ups.)
import { APPROVER, AUTHOR, CLIENT, call, firms, main, needVisitorVisa, ok, openCase, OFFICER, REVIEWER, sql, yearsAgo } from "./lib/m3.ts";

type A = { id: string; value: unknown; status: string; confirmed: boolean; officer?: { by: string; at: string } | null; awaits_client?: boolean };
type Q = { subjectId: string; fact: string; label: string; value_type: string; section: string; group: string | null; hidden: boolean; background?: boolean; answer: A | null; rows: { row: string; answer: A | null }[] };
type View = { sections: { subjectId: string; section: string; questions: Q[] }[] };
const lit = (s: string) => `'${s.replace(/'/g, "''")}'`;

await main("C6.18-schedule1", "IMM 5257 Schedule 1's parts are background answers once the author marks them, with a second person", async () => {
  const vv = needVisitorVisa();
  const f = await firms();
  const officer = f.officer ?? OFFICER;
  // Schedule 1's own parts by their own names (P-412 F11): the library sections whose questions Schedule 1's form fields read.
  const parts = (sql(`select distinct s.section_key || '|' || s.title from logical_section s join section_question q on q.section_key=s.section_key and q.workspace_id=s.workspace_id
    join form_field_map m on m.canonical_field_key=q.canonical_field_key join form_edition e on e.id=m.form_edition_id join gov_form_def g on g.id=e.gov_form_def_id
    where g.form_key='IMM 5257 SCH1' and s.title ~* '(military|government|organi[sz]ation)' order by 1`) ?? "").split("\n").filter(Boolean).map((x) => { const [key, title] = x.split("|"); return { key, title }; });
  ok("C6.18-S1-0 setup: Schedule 1's three parts are library sections (military service, government positions, organisations)", parts.length === 3, parts.map((p) => p.title));
  if (parts.length !== 3) return;
  const keys = new Set(parts.map((p) => p.key));
  const people = [{ role: "principal" as const, name: "Sample Client A", dob: yearsAgo(40) }];
  const view = async (caseId: string, actor: string, mode: "agent" | "sqr") => (await call("GET", `/runtime/cases/${caseId}/questionnaire?mode=${mode}`, undefined, actor)).body as View;
  const sch1 = (v: View, subject: string) => (v?.sections ?? []).filter((s) => s.subjectId === subject && keys.has(s.section)).flatMap((s) => s.questions);

  // Before the mark: as on main, Schedule 1's questions are ordinary ones.
  const c0 = await openCase(vv, people, { representative: f.rep, caseOfficers: [officer] });
  const before = sch1(await view(c0.id, officer, "agent"), c0.subjects["Sample Client A"]);
  ok("C6.18-S1-1 fail: before the author marks them, Schedule 1's questions are not background answers (as on main)", before.length >= 5 && before.every((q) => !q.background), before.map((q) => `${q.label.slice(0, 30)}:${!!q.background}`).slice(0, 4));

  // The author marks each part, with a reason; a second person approves on To review.
  for (const p of parts) {
    const r = await call("POST", `/library/sections/${encodeURIComponent(p.key)}/background`, { on: true, reason: "The founder's ruling for IMM 5257 Schedule 1 (P-412 F11). Sample, Unconfirmed: expert." }, AUTHOR);
    const self = r.body?.id ? await call("POST", `/library/changes/${r.body.id}/approve`, {}, AUTHOR) : { status: 0, body: null };
    const ap = r.body?.id ? await call("POST", `/library/changes/${r.body.id}/approve`, {}, APPROVER) : { status: 0, body: null };
    ok(`C6.18-S1-2 pass: "${p.title}" marked as background answers by the author, refused to the proposer's own approval, approved by a second person`, r.status === 201 && self.status === 403 && ap.status < 300 && ap.body?.status === "APPROVED", { propose: r.status, self: self.status, approve: ap.status, detail: r.body?.detail ?? ap.body?.detail });
  }
  const c1 = await openCase(vv, people, { representative: f.rep, caseOfficers: [officer] });
  ok("C6.18-S1-3 fail: approved but not released, a new case still gets the released Visitor visa (no background mark yet)", sch1(await view(c1.id, officer, "agent"), c1.subjects["Sample Client A"]).every((q) => !q.background));

  // The next release: Review names each part once for the immigration expert; signed off; approved by a different person.
  await call("POST", `/combinations/${vv}/sources/sample`, undefined, AUTHOR);
  let rel = { status: 0, body: null as any }, lines: { kind: string; key: string; label: string }[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    await call("POST", `/combinations/${vv}/submit`, { note: "C6.18-schedule1: Schedule 1's parts are background answers (Sample, Unconfirmed: expert)" }, AUTHOR);
    const sub = (await call("GET", `/combinations/${vv}/review`, undefined, REVIEWER)).body?.submission;
    const summary = (sub?.changeSummary ?? []) as { kind: string; key: string; label: string; needs_sme: boolean }[];
    lines = summary.filter((x) => x.kind === "Background answers");
    const refs = summary.filter((x) => x.needs_sme).map((x) => `${x.kind}|${x.key}`);
    if (refs.length) await call("POST", `/combinations/${vv}/signoff`, { items: refs, action: "signed" }, REVIEWER);
    rel = await call("POST", `/combinations/${vv}/approve`, undefined, APPROVER);
    if (!/changed while it was being released/.test(rel.body?.detail ?? "")) break;
  }
  ok("C6.18-S1-4 pass: the release's review names each Schedule 1 part once as background answers, for the immigration expert", lines.length === 3 && parts.every((p) => lines.some((l) => l.key === p.key && l.label.includes(p.title))), lines.map((l) => l.label.slice(0, 80)));
  ok("C6.18-S1-5 pass: the next Visitor visa release goes out with the mark", rel.status < 300 && sql(`select count(*) from library_change where kind='section_background' and status='RELEASED'`) === "3", rel.body?.detail ?? rel.status);

  // A new case: Schedule 1's questions are background answers (C6.18).
  const c = await openCase(vv, people, { representative: f.rep, caseOfficers: [officer] });
  const P = c.subjects["Sample Client A"];
  const qs = sch1(await view(c.id, officer, "agent"), P);
  ok("C6.18-S1-6 pass: on a new case, every Schedule 1 military service, government position and organisation question is a background answer", qs.length >= 15 && qs.every((q) => q.background === true), qs.filter((q) => !q.background).map((q) => q.label.slice(0, 40)));
  const name = ((await view(c.id, officer, "agent"))?.sections ?? []).flatMap((s) => s.questions).find((q) => q.subjectId === P && q.fact === "person.family_name");
  ok("C6.18-S1-7 fail: a question outside those parts (family name) is not a background answer", !!name && !name.background, name?.background);
  const q = qs.find((x) => !x.hidden && x.value_type === "text") ?? qs.find((x) => !x.hidden && x.value_type !== "yes_no");
  ok("C6.18-S1-8 setup: a Schedule 1 detail question the officer can answer on this case", !!q, qs.map((x) => `${x.label.slice(0, 30)}:${x.value_type}:${x.hidden}`).slice(0, 6));
  if (!q) return;
  const value = q.value_type === "country" ? "IND" : q.value_type === "date" ? "2005-06-01" : "Sample: answer taken by phone";
  // Schedule 1's parts repeat (one row per position, service or organisation): the officer adds the row the client named.
  const row = q.group ? (await call("POST", `/runtime/cases/${c.id}/groups/${P}/rows`, { group: q.group }, officer)).body?.row as string | undefined : undefined;
  const answerOf = (v: View) => { const x = sch1(v, P).find((y) => y.fact === q.fact); return row ? x?.rows.find((y) => y.row === row)?.answer ?? null : x?.answer ?? null; };
  let r = await call("PUT", `/runtime/cases/${c.id}/answers/${P}/${q.fact}`, { value, expectedId: null, ...(row ? { row } : {}) }, officer);
  let a = answerOf(await view(c.id, officer, "agent"));
  ok("C6.18-S1-9 pass: the officer records it, taken by phone: marked Officer with who and when, waiting for the client, not confirmed", r.status === 200 && a?.officer?.by === officer && !!a?.officer?.at && a?.awaits_client === true && a?.confirmed === false, { status: r.status, detail: r.body?.detail, a });
  const sec = (await view(c.id, officer, "agent")).sections.find((s) => s.subjectId === P && s.section === q.section)!;
  r = await call("POST", `/runtime/cases/${c.id}/sections/${q.section}/confirm`, { subjectId: P, seen: sec.questions.flatMap((x) => [x.answer?.id, ...(x.rows ?? []).map((y) => y.answer?.id)]).filter(Boolean) }, officer);
  a = answerOf(await view(c.id, officer, "agent"));
  ok("C6.18-S1-10 fail: the officer's Confirm section leaves it waiting for the client", r.status < 300 && a?.awaits_client === true && a?.confirmed === false, { status: r.status, a });
  const mine = answerOf(await view(c.id, CLIENT, "sqr"));
  r = await call("POST", `/runtime/cases/${c.id}/answers/${mine?.id}/reconfirm`, { value: mine?.value }, officer);
  ok("C6.18-S1-11 fail: staff cannot re-confirm it for the client (403)", r.status === 403, r.status);
  r = await call("POST", `/runtime/cases/${c.id}/answers/${mine?.id}/reconfirm`, { value: mine?.value }, CLIENT);
  a = answerOf(await view(c.id, officer, "agent"));
  ok("C6.18-S1-12 pass: the client sees it with who recorded it and re-confirms it: it counts as their own, still showing the officer", mine?.officer?.by === officer && r.status < 300 && a?.confirmed === true && a?.awaits_client === false && a?.officer?.by === officer, { status: r.status, detail: r.body?.detail, a });
  ok("C6.18-S1-13 (data): stored as the client's re-confirmation of the officer's answer", sql(`select source_json->>'channel' from client_canonical_answer where subject_id=${lit(P)} and canonical_field_key=${lit(q.fact)} and superseded_by_id is null${row ? ` and row_key=${lit(row)}` : ""}`) === "client_reconfirm");
});
