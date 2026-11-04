// C4.2 acceptance (P-220 pack 2; P-76, P-132): the author marks the combination's PQR questions on its PQR tab; only a
// Client or Document fact that a question asks can be marked; one PQR record per combination; the country PQR is a view
// of released combinations. The API is built (tests/check_pqr.ts); this pack adds the seams qa found: QA-125 (two saves
// at once: the loser must get 409, not 404) and a stale second tab. QA-125 fixed in #688; the unasked fact follows the
// tech lead's ruling P-294 (B) (forms pull their questions). Rules only (US$0).
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
  // P-76: only a question the SQR asks can be marked. Forms pull their questions (tech lead ruling P-294 (B) on #688:
  // engine/snapshot.ts and render.ts ask what a form needs from any placement), so taking a section out asks nobody less.
  // A truly unasked fact is a form field reading a fact the library has no question for. A person cannot make one at
  // US$0 (no free field add, P-158; a new field arrives only through an AI field-map draft), so the test makes it, as
  // the suites do: one more library fact (test words, Sample), and every form field that read another of the
  // principal's client facts reads it instead.
  const from = facts.find((f: any) => f.source === "CLIENT" && f.role === "principal" && f.placed && f.fact !== client?.fact && f.fact.startsWith("person."));
  const probe = "person.c42_no_question_probe", probeMeaning = "Test fact for C4.2: a form field reads it, but no library question asks it (Sample)";
  if (from) {
    sql(`insert into canonical_field (id, workspace_id, canonical_field_key, version, status, meaning, value_type, data_type, scope, subject_kind, origin, updated_by, label, label_checked) select gen_random_uuid(), workspace_id, '${probe}', 1, 'PUBLISHED', '${probeMeaning}', value_type, data_type, scope, subject_kind, 'HUMAN', 'user-A', 'C4.2 probe', true from canonical_field where canonical_field_key='${from.fact}' order by version desc limit 1`);
    sql(`update form_field_map set canonical_field_key='${probe}' where canonical_field_key='${from.fact}' and outcome='mapped'`);
  }
  const unasked = ((await call("GET", `/combinations/${wp}/fact-sources`)).body?.facts ?? []).find((f: any) => f.fact === probe && f.role === "principal");
  ok("setup: a form field reads a fact no library question asks (the principal's, from the client)", !!unasked && !unasked.placed && unasked.source === "CLIENT", unasked ? { fact: unasked.fact, placed: unasked.placed, source: unasked.source, forms: unasked.forms } : from?.fact ?? "no client fact to copy");
  const put = (f: any, body: Record<string, unknown>, actor = AUTHOR) => call("PUT", `/combinations/${wp}/fact-sources/${f.role}/${encodeURIComponent(f.fact)}`, { version: f.version, ...body }, actor);

  // Refused twice: the release check names it ("nobody is asked for it"), and its PQR tick is a 422 in words.
  const problems = ((await call("GET", `/combinations/${wp}`, undefined, AUTHOR)).body?.draft?.problems ?? []) as { level: string; item: string; message: string }[];
  const gap = problems.find((x) => x.item === probe && x.level === "error" && /nobody is asked for it/.test(x.message) && x.message.includes(probeMeaning));
  let r = await put(unasked ?? officer, { prequalification: true });
  ok("C4.2 fail: a fact no question asks is a release error and cannot be marked (422, 'No question asks …')", !!unasked && !!gap && r.status === 422 && /No question asks/.test(words(r)), { release: gap?.message ?? problems.filter((x) => x.item === probe), tick: words(r) });
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
