// qa probe (QA-309 cause d, 8 Nov): IMM 5257 marks the visit contact's Name and Address in Canada mandatory. Release 2, one
// principal: are the visit-contact facts asked, answered and shown on the Online answer sheet? US$0, no model call. Args: <port> <db>
const L = await import(process.env.LIB!);
const { call, ok, main, OFFICER, yearsAgo } = L;
await main("QA-309 cause (d) probe", "the visit contact on release 2's questionnaire and answer sheet", async () => {
  const vv = L.needVisitorVisa();
  const c = await L.openCase(vv, [{ role: "principal", name: "Sample Client A", dob: yearsAgo(40) }]);
  const P = c.subjects["Sample Client A"], officer = c.officer || OFFICER;
  const q0 = ((await call("GET", `/runtime/cases/${c.id}/questionnaire?mode=agent`, undefined, officer)).body?.sections ?? []) as { section: string; title?: string; subjectId: string; questions: { fact: string; answer?: unknown }[] }[];
  const asked = q0.flatMap((s) => s.questions.filter((x) => /visit_contact/.test(x.fact)).map((x) => ({ section: s.title ?? s.section, fact: x.fact })));
  console.log("ASKED-BEFORE " + JSON.stringify(asked));
  await L.fillEverything(c.id);
  const q1 = ((await call("GET", `/runtime/cases/${c.id}/questionnaire?mode=agent`, undefined, officer)).body?.sections ?? []) as typeof q0;
  console.log("ANSWERED " + JSON.stringify(q1.flatMap((s) => s.questions.filter((x) => /visit_contact/.test(x.fact)).map((x) => ({ fact: x.fact, answered: !!x.answer })))));
  const p = (await L.prepare(c.id, officer)).p;
  const it = (L.itemsOf(p, P, "IMM 5257") as { id: string }[])[0];
  const sheet = (await call("GET", `/runtime/items/${it.id}/answer-sheet`, undefined, officer)).body;
  const sec = (sheet.sections as { title: string; waiting: unknown[]; answers: { fact: string; label: string; value: unknown; subject: string }[] }[]).find((s) => /Details of visit/.test(s.title))!;
  console.log("SHEET-DETAILS-OF-VISIT " + JSON.stringify({ waiting: sec.waiting, answers: sec.answers.map((a) => ({ fact: a.fact, label: a.label, value: a.value })) }).slice(0, 2500));
  const copy = await L.generateCopy(c.id, "IMM 5257", P);
  const { sql } = L;
  const boxes = JSON.parse(sql(`select coalesce(json_agg(json_build_object('path', b->>'data_path', 'fact', b->>'fact', 'result', b->>'result', 'why', b->>'why')), '[]') from form_instance f, jsonb_array_elements(f.result_json->'boxes') b where f.id='${copy}'`) ?? "[]") as { path: string; fact: string; result: string; why: string | null }[];
  console.log("COPY-BOXES " + JSON.stringify(boxes.filter((b) => /visit_contact/.test(b.fact ?? ""))));
  ok("the visit contact's facts appear on the Online sheet", sec.answers.some((a) => /visit_contact_name/.test(a.fact)) && sec.answers.some((a) => /visit_contact_address/.test(a.fact)));
});
