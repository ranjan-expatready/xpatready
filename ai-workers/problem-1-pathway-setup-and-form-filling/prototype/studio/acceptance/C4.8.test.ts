// C4.8 acceptance (P-220 pack 2; P-76): PQR and SQR changes go out only in the combination's one review and release,
// with its forms, documents and rules; there is no separate questionnaire approval. tests/check_c48_sqr_release.ts
// (22/22) covers a section choice on the suites' fixture; this pack adds the PQR tick with a section choice on Visitor visa
// of the six, and the "no side door" check over the API's own routes. Independent of C4.1 (the section move's own review
// line is checked in C4.1). C4.8 is Works: this should pass on any copy where the combination has questions.
// P-279 (source gate): before the submit, Submit is checked refused while a published number has no source entry, then
// every number is answered "None published" (test words) through the API, as the suites do.
// Needs first: Visitor visa has questions (J3 / C4.11) — until then exit 2; meanwhile `wp.family` as 4th argument.
//   zsh studio/tools/isolated.sh accept 4440 start && tsx studio/acceptance/C4.8.test.ts 4440 xr_studio_accept [wp.family]
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { AUTHOR, APPROVER, REVIEWER, pack2, run } from "./lib/pack2.ts";

const T = pack2("C4.8");
const { call, sql, ok, words } = T;

run(async () => {
  await T.ready();
  const wp = T.combo(T.key("vv.single"));
  await T.needQuestions(wp);
  // B82 (QA-233; #868's P-248 rule refuses Submit with "No document line yet"): on the six the lines come from the
  // people's own steps too, with the facts their conditions read. The checkpoint already has its lines, so nothing runs.
  if (sql(`select count(*) from document_requirement where combination_id='${wp}' and status <> 'RETIRED'`) === "0") {
    const docs = await T.documentsBySteps(wp);
    console.log(`SETUP document lines through the people's steps: ${JSON.stringify(docs).slice(0, 300)}`);
  }
  const releases = () => Number(sql(`select count(*) from config_release where combination_id='${wp}'`));
  const r0 = releases();
  const fs = (await call("GET", `/combinations/${wp}/fact-sources`)).body?.facts ?? [];
  const client = fs.find((f: any) => f.source === "CLIENT" && f.role === "principal" && !f.prequalification);
  let r = await call("PUT", `/combinations/${wp}/fact-sources/${client?.role}/${encodeURIComponent(client?.fact ?? "x")}`, { version: client?.version, prequalification: true }, AUTHOR);
  ok("setup: one PQR tick on the draft", r.status === 200, words(r));
  const sec = sql(`select section_key from sqr_section_selection where combination_id='${wp}' order by section_order desc limit 1`);
  r = await call("DELETE", `/combinations/${wp}/sections/${encodeURIComponent(sec)}`, undefined, AUTHOR);
  ok("setup: one section taken out of the questionnaire (an SQR change)", !!sec && r.status < 300, words(r));

  // No side door: no API route approves or releases a questionnaire or a PQR on its own (read from the controllers).
  const src = join(import.meta.dirname, "..", "api", "src");
  const routes = readdirSync(src).filter((f) => f.endsWith(".ts")).flatMap((f) => [...readFileSync(join(src, f), "utf8").matchAll(/@(?:Post|Put|Patch)\("([^"]+)"\)/g)].map((m) => `${f}: ${m[1]}`));
  const side = routes.filter((x) => /(pqr|sqr|questionnaire|prequal|fact-sources|sections)[^"]*\/(approve|release|publish|signoff)/i.test(x));
  ok("C4.8 pass: no route approves, signs off or releases a PQR or questionnaire on its own", routes.length > 20 && side.length === 0, side);
  ok("C4.8 pass: nothing is released by the tick or the section change", releases() === r0);
  // P-279: the source gate refuses Submit and release while a published number (a date counts) has no source entry.
  await T.sourceGate(wp);
  r = await call("POST", `/combinations/${wp}/submit`, { note: "PQR tick and section order (acceptance)" }, AUTHOR);
  ok("C4.8 pass: the author submits the combination for its one review", r.status < 300, words(r));
  const changes = (r.body?.changeSummary ?? []) as any[];
  const said = changes.map((c) => `${c.kind}|${c.key}|${c.label}`);
  ok("C4.8 pass: the review lists the PQR tick as a change, in words", changes.some((c) => String(c.key).includes(client?.fact ?? "§") && /pre-?qualification|PQR/i.test(String(c.label))), said.slice(0, 5));
  ok("C4.8 pass: the review lists the section change as a change, in words", changes.some((c) => /section/i.test(c.kind) && String(c.key).includes(sec)), said.slice(0, 5));
  const signed: number[] = [];
  for (const c of changes) signed.push((await call("POST", `/combinations/${wp}/signoff`, { items: [`${c.kind}|${c.key}`], action: "signed" }, REVIEWER)).status); // the content reviewer holds both duties (review, sme)
  ok("C4.8 pass: the content reviewer signs every line (each 2xx)", signed.length === changes.length && signed.every((x) => x < 300), signed);
  r = await call("POST", `/combinations/${wp}/approve`, {}, APPROVER);
  ok("C4.8 pass: the approver releases the combination, questionnaire changes with it", r.status < 300 && releases() === r0 + 1, words(r));
  const country = (await call("GET", `/combinations/${wp}/pqr/country`)).body;
  ok("C4.8 pass: after release the tick is in the country PQR (P-132)", (country?.lines ?? []).some((l: any) => l.fact === client?.fact && (l.combinations ?? []).some((c: any) => c.id === wp)));
  T.done();
});
