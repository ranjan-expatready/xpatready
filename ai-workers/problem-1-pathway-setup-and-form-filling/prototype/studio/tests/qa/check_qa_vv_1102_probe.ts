// qa (2 Nov, Visitor visa M3 path on main 54019473): probes beyond pack 4 for C6.4, C6.12 and C11.6 — roles, ids,
// concurrency, and the case page against /prepare. US$0.
//   tsx studio/tests/qa/check_qa_vv_1102_probe.ts <port> <db>   (copy prepared by setup_visitor_visa.ts + setup_vv_m3.ts)
// Today 11/12: the one FAIL is QA-151 (a body that is not JSON is answered in the parser's words).
import { AUTHOR, CLIENT, CLIENT_B, FAMILY, OFFICER, call, main, needVisitorVisa, ok, openCase, prepare } from "../../acceptance/lib/m3.ts";

await main("qa-vv-1102", "Visitor visa M3 probes (C6.4, C6.12, C11.6)", async () => {
  const c = await openCase(needVisitorVisa(), FAMILY);
  const P = c.subjects["Sample Client A"], S = c.subjects["Sample Spouse A"];
  // C6.4 roles and ids
  for (const [who, a] of [["client", CLIENT], ["other client", CLIENT_B], ["author", AUTHOR]] as const) {
    const r = await call("GET", `/runtime/cases/${c.id}/checklist`, undefined, a);
    ok(`C6.4 probe: the ${who} cannot read the checklist (403/404), Problem Details in words`, [403, 404].includes(r.status) && typeof r.body?.detail === "string", [r.status, r.body?.detail]);
  }
  let r = await call("GET", `/runtime/cases/not-a-case/checklist`, undefined, OFFICER);
  ok("C6.4 probe: a case id that is not one answers 404 in words (not 500)", r.status === 404 && typeof r.body?.detail === "string", [r.status, r.body?.detail]);
  r = await call("GET", `/runtime/cases/${c.id}/checklist`, undefined, OFFICER);
  const lines = (r.body?.people ?? []).flatMap((p: { lines: { id: string; reason: string }[] }) => p.lines);
  ok("C6.4 probe: every needed line names its reason in words, no engine keys", lines.length >= 5 && lines.every((l: { reason: string }) => !/[a-z]+\.[a-z_]+|derived:|\bundefined\b/.test(l.reason)), lines.map((l: { reason: string }) => l.reason));
  // C6.12 / C11.6
  const { p } = await prepare(c.id);
  ok("C6.12 probe: the author (configuration) cannot read /prepare (403)", (await call("GET", `/runtime/cases/${c.id}/prepare`, undefined, AUTHOR)).status === 403);
  r = await call("GET", `/runtime/cases/00000000-0000-0000-0000-000000000000/prepare`, undefined, OFFICER);
  ok("C6.12 probe: an unknown case answers 404 in words", r.status === 404 && typeof r.body?.detail === "string", [r.status, r.body?.detail]);
  const items = (p as unknown as { items: { id: string; form: string; subject: string; channel: string | { key: string }; accepted?: unknown }[]; version: unknown }).items;
  const i5257 = items.find((i) => i.subject === S && i.form === "IMM 5257");
  const ver = (p as unknown as { version: unknown }).version;
  // two changes at once from the same read: exactly one wins, the other is a 409
  const [a, b] = await Promise.all([
    call("PATCH", `/runtime/items/${i5257?.id}/channel`, { channel: "PAPER", reason: "Sample: cannot use a computer", version: ver }, OFFICER),
    call("PATCH", `/runtime/items/${i5257?.id}/channel`, { channel: "PAPER", reason: "Sample: second tab", version: ver }, OFFICER),
  ]);
  ok("C11.6 probe: two channel changes at once from one read: one saved, the other 409 Reload", [a.status, b.status].sort().join() === "200,409", [a.status, b.status, a.body?.detail ?? b.body?.detail]);
  r = await call("PATCH", `/runtime/items/not-an-item/channel`, { channel: "PAPER", reason: "x", version: ver }, OFFICER);
  ok("C11.6 probe: an item id that is not one answers 404 in words", r.status === 404, [r.status, r.body?.detail]);
  r = await call("PATCH", `/runtime/items/${i5257?.id}/channel`, "not json", OFFICER);
  ok("QA-151 fail today: a body that is not JSON answers 400 in our words, not the JSON parser's (\"Unexpected token …\")", r.status === 400 && !/expected object|received|Unexpected token|in JSON at position|not valid JSON/i.test(JSON.stringify(r.body)), [r.status, r.body?.detail]);
  const sv = (await prepare(c.id)).p as unknown as { items: { id: string; channel: unknown }[]; version: unknown };
  r = await call("PATCH", `/runtime/items/${i5257?.id}/channel`, { channel: "PAPER", reason: "x".repeat(401), version: sv.version }, OFFICER);
  ok("C11.6 probe: a reason over 400 characters is refused on the field", r.status === 400 && /400 characters/.test(JSON.stringify(r.body)), [r.status, r.body?.detail]);
  // the case page's form panel against /prepare for IMM 5476
  const i5476 = items.filter((i) => i.form === "IMM 5476");
  ok("C11.6 probe: IMM 5476 items are PDF upload only (IRCC accepts nothing else for it on the APR account, Sample)", i5476.length >= 1 && i5476.every((i) => i.channel === "PDF_UPLOAD"), i5476.map((i) => i.channel));
});
