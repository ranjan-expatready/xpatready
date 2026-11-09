// qa probe 2 (Lead 34, 8 Nov): the raw shapes behind QA-246 (unnamed items) and QA-153 (IMM 5645's family boxes). US$0.
const L = await import(process.env.LIB!);
const { call, sql, ok, main, OFFICER } = L;
await main("QA-153 / QA-246 probe 2", "raw shapes", async () => {
  const vv = L.needVisitorVisa();
  const c = await L.openCase(vv, L.FAMILY);
  const P = c.subjects["Sample Client A"], K = c.subjects["Sample Child A1"];
  let p = (await L.prepare(c.id, OFFICER)).p;
  for (const [n, s] of [["A", P], ["child", K]] as const) for (const i of (L.itemsOf(p, s) as Record<string, unknown>[])) if (!i.form) console.log("UNNAMED-" + n + " " + JSON.stringify(i).slice(0, 700));
  const f = (await call("GET", `/runtime/cases/${c.id}/forms`, undefined, OFFICER)).body?.forms ?? [];
  console.log("FORMS-BY-PERSON " + JSON.stringify(Object.entries(f.reduce((m: Record<string, string[]>, x: { person: string; form: string; applies?: boolean; readiness?: { missing?: unknown[] } }) => ((m[x.person] ??= []).push(`${x.form}${x.applies === false ? "(not applying)" : ""}:${x.readiness?.missing?.length ?? "?"} missing`), m), {}))));
  const html = (await call("GET", `/runtime/cases/${c.id}`, undefined, OFFICER)).body;
  console.log("CASE-KEYS " + JSON.stringify(Object.keys(html ?? {})));
  await L.fillEverything(c.id);
  const copy = await L.generateCopy(c.id, "IMM 5645", P);
  const rj = JSON.parse(sql(`select result_json::text from form_instance where id='${copy}'`) ?? "{}");
  console.log("RESULT-KEYS " + JSON.stringify(Object.keys(rj)) + " BOX0 " + JSON.stringify((rj.boxes ?? [])[0]));
  const fam = (rj.boxes ?? []).filter((b: unknown) => /mother|father|sibling|brother|sister|parent/i.test(JSON.stringify(b)));
  const tally = fam.reduce((m: Record<string, number>, b: { result: string }) => (m[b.result] = (m[b.result] ?? 0) + 1, m), {});
  console.log("FAMILY-BOXES " + JSON.stringify({ n: fam.length, tally }));
  for (const b of fam.filter((b: { result: string }) => b.result !== "written").slice(0, 14)) console.log("FAM-NOT-WRITTEN " + JSON.stringify(b).slice(0, 400));
  for (const b of fam.filter((b: { result: string }) => b.result === "written").slice(0, 4)) console.log("FAM-WRITTEN " + JSON.stringify(b).slice(0, 300));
  ok("probe 2 ran", !!copy);
});
