// C4.2 acceptance (P-220 pack 2; P-76, P-132): the author marks the combination's PQR questions on its PQR tab; only a
// Client or Document fact that a question asks can be marked; one PQR record per combination; the country PQR is a view
// of released combinations. The API is built (tests/check_pqr.ts); this pack adds the seams qa found: QA-125 (two saves
// at once: the loser must get 409, not 404) and a stale second tab. Fails today on QA-125. Rules only (US$0).
//   zsh studio/tools/isolated.sh accept 4440 start && tsx studio/acceptance/C4.2.test.ts 4440 xr_studio_accept
import { AUTHOR, pack2, run } from "./lib/pack2.ts";

const T = pack2("C4.2");
const { call, sql, ok, words } = T;

run(async () => {
  await T.ready();
  const wp = T.combo("wp.family");
  const fs = (await call("GET", `/combinations/${wp}/fact-sources`)).body;
  const facts = fs?.facts ?? [];
  const client = facts.find((f: any) => f.source === "CLIENT" && f.role === "principal");
  const officer = facts.find((f: any) => f.source === "AGENT");
  ok("setup: Work permit (family) has a client fact and a case-officer fact", !!client && !!officer);
  const put = (f: any, body: Record<string, unknown>, actor = AUTHOR) => call("PUT", `/combinations/${wp}/fact-sources/${f.role}/${encodeURIComponent(f.fact)}`, { version: f.version, ...body }, actor);

  let r = await put(officer, { prequalification: true });
  ok("C4.2 fail: a case-officer fact cannot be a PQR question (422, in words)", r.status === 422 && /case officer/i.test(words(r)), words(r));
  r = await put(client, { prequalification: true }, "user-C");
  ok("C4.2 fail: the content reviewer cannot mark (403)", r.status === 403, r.status);
  // QA-125: two saves of the same row at the same moment: one wins, the other is a 409 in words (never 404).
  const [x, y] = await Promise.all([put(client, { prequalification: true }), put(client, { prequalification: true })]);
  const statuses = [x.status, y.status].sort();
  ok("C4.2 fail (QA-125): two saves at once give one 200 and one 409 in plain words naming the question (never 404, never 'the database')", statuses[0] === 200 && statuses[1] === 409 && !/database/i.test(words(x.status === 409 ? x : y)) && words(x.status === 409 ? x : y).includes(client.label), { statuses, words: words(x.status === 409 ? x : y) });
  r = await put(client, { prequalification: false });
  ok("C4.2 fail: a stale tab (old version) is refused 409 in words (reload)", r.status === 409 && /reload/i.test(words(r)), words(r));
  const one = sql(`select count(distinct combination_id) from fact_source where combination_id='${wp}' and prequalification`);
  ok("C4.2 data: the PQR is the combination's own record (ticks live on its fact-source rows)", one === "1");
  const country = (await call("GET", `/combinations/${wp}/pqr/country`)).body;
  ok("C4.2 pass: the country PQR does not show a draft tick until release (P-132)", !(country?.lines ?? []).some((l: any) => l.fact === client.fact && (l.combinations ?? []).some((c: any) => c.id === wp)) && (country?.thisCombination?.draftAdds ?? []).length >= 1, country?.thisCombination);
  r = await call("GET", `/combinations/${wp}/pqr/country`, undefined, "user-P");
  ok("C4.2 fail: a client cannot read the country PQR view (403)", r.status === 403, r.status);
  T.done();
});
