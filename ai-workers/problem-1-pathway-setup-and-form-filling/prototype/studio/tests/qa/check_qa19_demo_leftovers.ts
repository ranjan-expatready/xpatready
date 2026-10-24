// QA-19 (UX, Minor; P-63, QA-5 follow-up): the shared demo (:4400) still shows what was stored before the Screen 01 fixes:
// step results "Read 242 data boxes" (P-63 words) and step times 5 h 30 early (rows written before the QA-5 fix; the
// screens lane declared them, "a demo reset clears it"). READ-ONLY: GET requests only, nothing is changed on :4400.
// FAILS while old rows remain; PASSES after a demo reset (or a data fix).
//   tsx studio/tests/qa/check_qa19_demo_leftovers.ts [port=4400]
const PORT = Number(process.argv[2] ?? 4400), API = `http://localhost:${PORT}/api`;
const get = async (p: string) => (await fetch(`${API}${p}`)).json() as Promise<any>;
const rows: any[] = [];
for (const pw of ["INDIVIDUAL", "CORPORATE"]) rows.push(...((await get(`/catalogue?pathway=${pw}&filter=all`)).rows ?? []).filter((r: any) => r.combinationId));
let boxes = 0; const where: string[] = [];
for (const r of rows) {
  const c = await get(`/combinations/${r.combinationId}`);
  const n = (c.jobs ?? []).filter((j: any) => /\bbox(es)?\b/i.test(`${j.message ?? ""} ${j.result ?? ""}`)).length;
  if (n) { boxes += n; where.push(`${r.label} (${n})`); }
}
console.log(`${boxes ? "FAIL" : "PASS"}  QA-19: no stored step result on :${PORT} says "box" — ${boxes} in ${where.length} combinations${where.length ? `: ${where.slice(0, 6).join(", ")}` : ""}`);
process.exit(boxes ? 1 : 0);
