// C4.2 acceptance (P-220 pack 2; P-76, P-132): the author marks the combination's PQR questions on its PQR tab; only a
// Client or Document fact that a question asks can be marked; one PQR record per combination; the country PQR is a view
// of released combinations. The API is built (tests/check_pqr.ts); this pack adds the seams qa found: QA-125 (two saves
// at once: the loser must get 409, not 404) and a stale second tab. Fails today on QA-125. Rules only (US$0).
// Runs on Visitor visa of the six; needs first: Visitor visa has questions (J3 / C4.11) — until then exit 2, and meanwhile
// on the suites' fixture with `wp.family` as 4th argument.
//   zsh studio/tools/isolated.sh accept 4440 start && tsx studio/acceptance/C4.2.test.ts 4440 xr_studio_accept [wp.family]
import { AUTHOR, pack2, run } from "./lib/pack2.ts";

const T = pack2("C4.2");
const { call, sql, ok, words } = T;

run(async () => {
  await T.ready();
  const wp = T.combo(T.key("vv.single"));
  await T.needQuestions(wp);
  const fs = (await call("GET", `/combinations/${wp}/fact-sources`)).body;
  const facts = fs?.facts ?? [];
  const client = facts.find((f: any) => f.source === "CLIENT" && f.role === "principal");
  const officer = facts.find((f: any) => f.source === "AGENT");
  ok("setup: the combination has a client fact and a case-officer fact", !!client && !!officer);
  // P-76: only a question the SQR asks can be marked. Taking a section out of the questionnaire leaves its client facts
  // asked by no question; ticking one of them is refused in words. The section is put back after.
  const qv = (await call("GET", `/combinations/${wp}/workspace?tab=questionnaires&role=principal`)).body?.questionnaire;
  const sec = (qv?.sections ?? []).find((x: any) => (x.questions ?? []).some((y: any) => facts.some((f: any) => f.fact === y.fact && f.role === "principal" && f.source === "CLIENT")));
  const unaskedFact = sec?.questions?.find((y: any) => facts.some((f: any) => f.fact === y.fact && f.role === "principal" && f.source === "CLIENT"))?.fact;
  const order0 = Number(sql(`select section_order from sqr_section_selection where combination_id='${wp}' and section_key='${sec?.id}'`) || 0);
  const out = sec ? await call("DELETE", `/combinations/${wp}/sections/${encodeURIComponent(sec.id)}`, undefined, AUTHOR) : { status: 0, body: null };
  ok("setup: one questionnaire section is taken out, so its client facts are asked by no question", out.status < 300 && !!unaskedFact, out.status >= 300 ? words(out) : unaskedFact);
  const unasked = ((await call("GET", `/combinations/${wp}/fact-sources`)).body?.facts ?? []).find((f: any) => f.fact === unaskedFact && f.role === "principal");
  const put = (f: any, body: Record<string, unknown>, actor = AUTHOR) => call("PUT", `/combinations/${wp}/fact-sources/${f.role}/${encodeURIComponent(f.fact)}`, { version: f.version, ...body }, actor);

  let r = await put(unasked ?? officer, { prequalification: true });
  ok("C4.2 fail: a fact no question asks cannot be marked (422, 'No question asks …')", !!unasked && r.status === 422 && /No question asks/.test(words(r)), words(r));
  if (sec) await call("POST", `/combinations/${wp}/sections/${encodeURIComponent(sec.id)}`, { sectionOrder: order0 }, AUTHOR);
  r = await put(officer, { prequalification: true });
  ok("C4.2 fail: a case-officer fact cannot be a PQR question (422, in words)", r.status === 422 && /case officer/i.test(words(r)), words(r));
  r = await put(client, { prequalification: true }, "user-C");
  ok("C4.2 fail: the content reviewer cannot mark (403)", r.status === 403, r.status);
  // QA-125: two saves of the same row at the same moment: one wins, the other is a 409 in words (never 404).
  const rows = () => Number(sql(`select count(*) from fact_source where combination_id='${wp}' and canonical_field_key='${client.fact}' and role='${client.role}'`));
  const rows0 = rows();
  const [x, y] = await Promise.all([put(client, { prequalification: true }), put(client, { prequalification: true })]);
  const statuses = [x.status, y.status].sort();
  // A build that treats an identical second save as a no-op (200 twice, one new version) is also right.
  if (statuses[0] === 200 && statuses[1] === 200) ok("C4.2 pass (QA-125): two identical saves at once are one change (no second version)", rows() === rows0 + 1, { rows0, now: rows() });
  else ok("C4.2 fail (QA-125): two saves at once give one 200 and one 409 in plain words naming the question (never 404, never 'the database')", statuses[0] === 200 && statuses[1] === 409 && !/database/i.test(words(x.status === 409 ? x : y)) && words(x.status === 409 ? x : y).includes(client.label), { statuses, words: words(x.status === 409 ? x : y) });
  r = await put(client, { prequalification: false });
  ok("C4.2 fail: a stale tab (old version) is refused 409 in words (reload)", r.status === 409 && /reload/i.test(words(r)), words(r));
  // One PQR record per combination (P-132): the tick is on this combination's rows only, no other combination gains one.
  const others = sql(`select count(*) from fact_source where combination_id<>'${wp}' and prequalification`);
  const mine = sql(`select count(*) from fact_source where combination_id='${wp}' and prequalification and canonical_field_key='${client.fact}'`);
  ok("C4.2 data: the PQR is the combination's own record (the tick is on its rows, no other combination's)", Number(mine) >= 1 && others === "0", { mine, others });
  const country = (await call("GET", `/combinations/${wp}/pqr/country`)).body;
  ok("C4.2 pass: the country PQR does not show a draft tick until release (P-132)", !(country?.lines ?? []).some((l: any) => l.fact === client.fact && (l.combinations ?? []).some((c: any) => c.id === wp)) && (country?.thisCombination?.draftAdds ?? []).length >= 1, country?.thisCombination);
  r = await call("GET", `/combinations/${wp}/pqr/country`, undefined, "user-P");
  ok("C4.2 fail: a client cannot read the country PQR view (403)", r.status === 403, r.status);
  T.done();
});
