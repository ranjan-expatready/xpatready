// qa (2 Nov, Visitor visa M3 round 2 on main 2c6cb092, #358): C7.3 answer sheet probes beyond pack 4 — the officer on a
// filled family case: words on the sheet, ticks at once, unknown section, a PDF item, whether IMM 5707 can reach Done.
//   tsx studio/tests/qa/check_qa_vv_1102_c73.ts <port> <db>   (copy prepared by setup_visitor_visa.ts + setup_vv_m3.ts)
// Today 6/7: the one FAIL is QA-153 (IMM 5707 waits for 16 parent facts no question on the release asks).
import { CLIENT, FAMILY, OFFICER, call, fillEverything, itemsOf, main, needVisitorVisa, ok, openCase, prepare } from "../../acceptance/lib/m3.ts";

await main("qa-vv-1102-c73", "C7.3 answer sheet probes (Visitor visa)", async () => {
  const c = await openCase(needVisitorVisa(), FAMILY);
  const P = c.subjects["Sample Client A"];
  await fillEverything(c.id);
  const { p } = await prepare(c.id);
  const it = itemsOf(p, P, "IMM 5707")[0] as unknown as { id: string; channel: string; state?: string; status?: string } | undefined;
  ok("C7.3 probe: the principal's IMM 5707 is an Online item", it?.channel === "ONLINE", it);
  const sh = (await call("GET", `/runtime/items/${it?.id}/answer-sheet`, undefined, OFFICER)).body;
  const sections = (sh?.sections ?? []) as { key: string; title: string; version: unknown; lines?: { label?: string; copy?: string; text?: string }[]; waiting?: { label?: string; question?: string }[] }[];
  console.log("sections:", sections.map((s) => `${s.key}:${s.title} lines=${s.lines?.length ?? "?"} waiting=${s.waiting?.length ?? "?"}`).join(" | "));
  const words = JSON.stringify(sections.map((s) => [s.title, (s.lines ?? []).map((l) => [l.label]), (s.waiting ?? []).map((w) => [w.label ?? w.question])]));
  ok("C7.3 probe: titles and labels on the sheet are in words (no field keys like person.x or derived:)", sections.length > 0 && !/\b(person|case|organisation)\.[a-z_]+|derived:/.test(words), words.slice(0, 400));
  const waits = sections.flatMap((s) => (s.waiting ?? []).map((w) => w.label ?? w.question ?? ""));
  console.log("waiting after every question is answered and confirmed:", waits.slice(0, 8));
  ok("C7.3 probe (Gap): after every question on the case is answered and confirmed, the sheet waits for nothing (so IMM 5707 can reach Done)", waits.length === 0, waits.slice(0, 6));
  const s0 = sections[0];
  const r404 = await call("POST", `/runtime/items/${it?.id}/screens/no_such_section/entered`, { version: s0?.version }, OFFICER);
  ok("C7.3 probe: ticking a section that is not on the sheet is refused 404 in words", r404.status === 404 && typeof r404.body?.detail === "string", [r404.status, r404.body?.detail]);
  const [a, b] = await Promise.all([1, 2].map(() => call("POST", `/runtime/items/${it?.id}/screens/${s0?.key}/entered`, { version: s0?.version }, OFFICER)));
  ok("C7.3 probe: two ticks of one section at once: one 201, the other 200 or 409, never two 201", [a.status, b.status].filter((x) => x === 201).length === 1 && [a.status, b.status].every((x) => [200, 201, 409].includes(x)), [a.status, b.status]);
  const pdf = itemsOf(p, P, "IMM 5257")[0] as unknown as { id: string } | undefined;
  const rp = await call("GET", `/runtime/items/${pdf?.id}/answer-sheet`, undefined, OFFICER);
  ok("C7.3 probe: a PDF upload item has no answer sheet (refused in words, 404/409/422)", [404, 409, 422].includes(rp.status) && typeof rp.body?.detail === "string", [rp.status, rp.body?.detail]);
  const rc = await call("GET", `/runtime/items/${it?.id}/answer-sheet`, undefined, CLIENT);
  ok("C7.3 probe: the client cannot read it (403)", rc.status === 403, rc.status);
});
