// C4.8 acceptance (P-220 pack 2; P-76): PQR and SQR changes go out only in the combination's one review and release,
// with its forms, documents and rules; there is no separate questionnaire approval. tests/check_c48_sqr_release.ts
// (22/22) covers a section choice; this pack adds the PQR tick, the section move (C4.1) and the "no side door" check.
// Fails today on the section move. Rules only (US$0).
//   zsh studio/tools/isolated.sh accept 4440 start && tsx studio/acceptance/C4.8.test.ts 4440 xr_studio_accept
import { AUTHOR, APPROVER, REVIEWER, pack2, run } from "./lib/pack2.ts";

const T = pack2("C4.8");
const { call, sql, ok, words } = T;

run(async () => {
  await T.ready();
  const wp = T.combo(T.key("wp.family"));
  const releases = () => Number(sql(`select count(*) from config_release where combination_id='${wp}'`));
  const r0 = releases();
  const fs = (await call("GET", `/combinations/${wp}/fact-sources`)).body?.facts ?? [];
  const client = fs.find((f: any) => f.source === "CLIENT" && f.role === "principal" && !f.prequalification);
  let r = await call("PUT", `/combinations/${wp}/fact-sources/${client?.role}/${encodeURIComponent(client?.fact ?? "x")}`, { version: client?.version, prequalification: true }, AUTHOR);
  ok("setup: one PQR tick on the draft", r.status === 200, words(r));
  const sec = sql(`select section_key from sqr_section_selection where combination_id='${wp}' order by section_order offset 1 limit 1`);
  r = await call("POST", `/combinations/${wp}/sections/${encodeURIComponent(sec)}/move`, { direction: "up" }, AUTHOR);
  ok("setup: one section moved up (C4.1)", r.status < 300, words(r));

  for (const path of [`/combinations/${wp}/pqr/approve`, `/combinations/${wp}/pqr/release`, `/combinations/${wp}/questionnaire/release`]) {
    r = await call("POST", path, {}, APPROVER);
    ok(`C4.8 pass: no side door — ${path} does not exist (404)`, r.status === 404, r.status);
  }
  ok("C4.8 pass: nothing is released by the tick or the move", releases() === r0);
  r = await call("POST", `/combinations/${wp}/submit`, { note: "PQR tick and section order (acceptance)" }, AUTHOR);
  ok("C4.8 pass: the author submits the combination for its one review", r.status < 300, words(r));
  const changes = (r.body?.changeSummary ?? []) as any[];
  const said = changes.map((c) => `${c.kind}|${c.key}|${c.label}`);
  ok("C4.8 pass: the review lists the PQR tick as a change, in words", changes.some((c) => String(c.key).includes(client?.fact ?? "§") && /pre-?qualification|PQR/i.test(String(c.label))), said.slice(0, 5));
  ok("C4.8 pass: the review lists the section order as a change, in words", changes.some((c) => /section/i.test(c.kind) && /order|moved/i.test(String(c.label))), said.slice(0, 5));
  for (const c of changes) await call("POST", `/combinations/${wp}/signoff`, { items: [`${c.kind}|${c.key}`], action: "signed" }, REVIEWER); // the content reviewer holds both duties (review, sme)
  r = await call("POST", `/combinations/${wp}/approve`, {}, APPROVER);
  ok("C4.8 pass: the approver releases the combination, questionnaire changes with it", r.status < 300 && releases() === r0 + 1, words(r));
  const country = (await call("GET", `/combinations/${wp}/pqr/country`)).body;
  ok("C4.8 pass: after release the tick is in the country PQR (P-132)", (country?.lines ?? []).some((l: any) => l.fact === client?.fact && (l.combinations ?? []).some((c: any) => c.id === wp)));
  T.done();
});
