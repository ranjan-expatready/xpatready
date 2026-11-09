// qa probe (Lead 34, 8 Nov): QA-153 (IMM 5645's parents and siblings) and QA-246 (forms listed before their rules are
// answered) on main, configured checkpoint, family case. US$0, no model call. Args: <port> <db>
const L = await import(process.env.LIB!);
const { call, sql, ok, main, OFFICER } = L;
await main("QA-153 / QA-246 probe", "family case on release 2", async () => {
  const vv = L.needVisitorVisa();
  const c = await L.openCase(vv, L.FAMILY);
  const names = Object.keys(c.subjects);
  // QA-246: before any answer, what each person's forms are, against the release's own lines (forms vs waiting on a rule).
  let p = (await L.prepare(c.id, OFFICER)).p;
  const ex = await L.expectedFor(c.id);
  for (const n of names) {
    const items = (L.itemsOf(p, c.subjects[n]) as { form: string; state: string; reason?: string }[]);
    console.log("QA246 " + JSON.stringify({ person: n, listed: items.map((i) => `${i.form}:${i.state}`), releaseForms: ex?.[n]?.forms.map((l: { form: string }) => l.form), releaseWaiting: ex?.[n]?.waiting.map((l: { form: string; waitsOn: string[] | null }) => `${l.form}<-${(l.waitsOn ?? []).join("+")}`) }));
  }
  const pageItems = (await call("GET", `/runtime/cases/${c.id}/forms`, undefined, OFFICER)).body;
  console.log("FORMS-ENDPOINT " + JSON.stringify(pageItems).slice(0, 1500));
  // QA-153: everything answered and confirmed, then the principal's IMM 5645.
  const filled = await L.fillEverything(c.id);
  const P = c.subjects["Sample Client A"];
  const v = await L.agent(c.id);
  const rel = (v?.sections ?? []).filter((s: { subjectId: string }) => /\/(parent|sibling)/.test(s.subjectId)).map((s: { subjectId: string; section: string; title?: string; questions: { fact: string; answer?: unknown }[] }) => ({ about: s.subjectId.split("/")[1], section: s.title ?? s.section, asked: s.questions.length, answered: s.questions.filter((q) => q.answer).length }));
  console.log("RELATIVE-SECTIONS " + JSON.stringify({ filled, rel }));
  p = (await L.prepare(c.id, OFFICER)).p;
  const it = (L.itemsOf(p, P, "IMM 5645") as { id: string; state: string; reason?: string; missing?: unknown }[])[0];
  console.log("IMM5645-ITEM " + JSON.stringify(it).slice(0, 800));
  const copy = await L.generateCopy(c.id, "IMM 5645", P);
  const boxes = JSON.parse(sql(`select coalesce(json_agg(json_build_object('path', b->>'data_path', 'fact', b->>'fact', 'result', b->>'result', 'why', b->>'why')), '[]') from form_instance f, jsonb_array_elements(f.result_json->'boxes') b where f.id='${copy}'`) ?? "[]") as { path: string | null; fact: string | null; result: string; why: string | null }[];
  const fam = (re: RegExp) => boxes.filter((b) => re.test(`${b.path} ${b.fact}`));
  const tally = (xs: typeof boxes) => xs.reduce((m: Record<string, number>, b) => (m[b.result] = (m[b.result] ?? 0) + 1, m), {});
  console.log("COPY " + JSON.stringify({ copy, all: tally(boxes), mother: tally(fam(/mother|parent_1/i)), father: tally(fam(/father|parent_2/i)), siblings: tally(fam(/sibling|brother|sister/i)) }));
  console.log("SIBLING-BOXES " + JSON.stringify(fam(/sibling|brother|sister/i).slice(0, 8)));
  console.log("PARENT-NOT-WRITTEN " + JSON.stringify(fam(/mother|father|parent_/i).filter((b) => b.result !== "written").slice(0, 10)));
  const shown = (await call("GET", `/runtime/form-copies/${copy}`, undefined, OFFICER)).body;
  console.log("COPY-VIEW " + JSON.stringify({ status: shown?.status, by_hand: (shown?.by_hand ?? []).filter((x: { label: string }) => /sibling|brother|sister|mother|father|parent/i.test(x.label)).slice(0, 8), by_hand_n: (shown?.by_hand ?? []).length }).slice(0, 2000));
  p = (await L.prepare(c.id, OFFICER)).p;
  const r = L.readinessOf(p, L.filingOf(p, P)?.id) as { warns?: { code: string; words?: string }[] } | null;
  const lines = (r?.warns ?? []).filter((w) => /IMM 5645/.test(w.words ?? ""));
  console.log("READINESS-5645 " + JSON.stringify({ n: lines.length, family: lines.filter((w) => /sibling|brother|sister|mother|father|parent/i.test(w.words ?? "")).map((w) => w.code + ": " + (w.words ?? "").slice(0, 200)).slice(0, 6), codes: [...new Set(lines.map((w) => w.code))] }));
  ok("probe ran", !!copy);
});
