// qa gate A walk of C3.16 (QA-325): setup NOT under test, through the people's steps the screens call (pack2.ts), never
// SQL writes. Live AI off, US$0.  tsx setup_c316.mts <port> <db> <phase>
//   prep    : Demo › Reset to the six; Visitor visa's people (each filing their own) and questions, and the LMIA work
//             permit's questions, from their forms (fields are drafts). Prints the two field keys the walk scopes.
//   release : release 1 of Visitor visa and of the LMIA work permit through their own steps (checklist, sources, submit,
//             the SME's sign-off, a different person approves), after the author's scope choice made by screens.
const P2 = await import("../../../../../prototype/studio/acceptance/lib/pack2.ts");
const { AUTHOR, APPROVER, REVIEWER, VV_PEOPLE, pack2 } = P2;
const phase = process.argv[4]; process.argv[4] = undefined as unknown as string; // pack2 reads argv[4] as a combination key
const T = pack2("C3.16-walk");
const { call, sql, words } = T;
const unionKey = () => sql("select m.canonical_field_key from form_field_map m where m.person = 'subject_spouse_or_partner' and m.caption = 'Date' and m.canonical_field_key like 'relationship.%' order by 1 limit 1") ?? "";
await T.ready();
if (phase === "prep") {
  const r0 = await call("POST", "/demo/reset-to-six", { confirm: "RESET" }, AUTHOR);
  console.log("reset-to-six", r0.status, words(r0).slice(0, 120));
}
const vv = T.combo("vv.single"), wp = T.combo("wp.lmia_inside");
if (phase === "prep") {
  let r;
  r = await T.people(vv, VV_PEOPLE.map((p: any) => ({ ...p, ...(p.applies ? { filingMode: "files_own" } : {}) })));
  console.log("vv people", r.status, words(r).slice(0, 120));
  await T.needQuestions(vv);
  await T.needQuestions(wp);
  const U = unionKey();
  console.log("VV", vv, "WP", wp, "UNION", U, sql(`select scope||'/'||status from canonical_field where canonical_field_key='${U}' order by version desc limit 1`),
    "EMPLOYER", sql(`select scope||'/'||status from canonical_field where canonical_field_key='organisation.employer_name' order by version desc limit 1`),
    "releases", sql(`select count(*) from config_release`), "spent", T.spent());
}
if (phase === "release") {
  for (const [name, c] of ([["Visitor visa", vv], ["LMIA work permit", wp]] as const).filter(([n]) => !process.env.ONLY || n === process.env.ONLY)) {
    const docs = await T.documentsBySteps(c);
    await T.sourceGate(c);
    const before = Number(sql(`select coalesce(max(version),0) from config_release where combination_id='${c}'`));
    let r = await call("POST", `/combinations/${c}/submit`, { note: `qa C3.16 gate A walk: release with the scope chosen by screens` }, AUTHOR);
    const refused = r.status >= 300 ? JSON.stringify(r.body?.errors ?? words(r)).slice(0, 600) : "";
    let s = r, a = r;
    if (r.status < 300) {
      const sub = (await call("GET", `/combinations/${c}/review`, undefined, REVIEWER)).body?.submission;
      s = await call("POST", `/combinations/${c}/signoff`, { items: ((sub?.changeSummary ?? sub?.change_summary ?? []) as { kind: string; key: string }[]).map((x) => `${x.kind}|${x.key}`), action: "signed", note: "qa C3.16 walk: signed as the SME (test)" }, REVIEWER);
      a = await call("POST", `/combinations/${c}/approve`, {}, APPROVER);
    }
    const rel = Number(sql(`select coalesce(max(version),0) from config_release where combination_id='${c}'`));
    console.log(name, "docs refused", JSON.stringify(docs.refused), "submit", r.status, refused, "signoff", s.status, "approve", a.status, words(a).slice(0, 200), "release", before, "->", rel,
      "who", sql(`select submitter_id||' '||approver_id from config_release where combination_id='${c}' and version=${rel}`),
      "marks", sql(`select string_agg(p->>'fact'||':'||(p->>'scope'), ',') from config_release r, jsonb_array_elements(r.snapshot->'placements') p where r.combination_id='${c}' and r.version=${rel} and p ? 'scope'`));
  }
  console.log("spent", T.spent());
}
