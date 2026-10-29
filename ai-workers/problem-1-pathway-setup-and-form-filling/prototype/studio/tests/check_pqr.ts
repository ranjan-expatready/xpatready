// M2 queue item 2, PQR (runtime lane; C4.2, C4.8; P-76, P-130, P-132; plan.md "PQR"): the combination's PQR as a set
// (the per-combination tick, slice 1), the country PQR as a view of the newest releases (never a record), and the PQR
// going out in the combination's one review and release. A passing and a failing case per rule: the engine on the
// sample's own snapshots, and the API on an isolated copy with the sample loaded. Rules only: no AI call (US$0).
// C4.7 (AI picks) waits for the Lead's answer on where a pending pick lives (plan.md "PQR", question).
//   zsh studio/tools/isolated.sh runtime_pqr 4436 start && tsx studio/tests/check_pqr.ts 4436 xr_studio_runtime_pqr
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { countryPqr, factSources, prequalification } from "../engine/sources.ts";

const PORT = Number(process.argv[2] ?? 4436), DB = process.argv[3] ?? "xr_studio_runtime_pqr";
const log: any[] = []; let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; log.push({ name, ok: !!c, detail }); console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 220)}` : ""}`); };
const KEYS = /\b[a-z_]+\.[a-z_]+\b|\((principal|spouse_or_partner|child|representative)\)/;
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: any = null; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const words = (r: { body: any }) => String(r.body?.detail ?? r.body?.message ?? "");
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

(async () => {
  const served = (await call("GET", "/session")).body?.workspace?.id;
  const inDb = (() => { try { return sql(`select id from workspace where id='${served}'`); } catch { return ""; } })();
  if (!served || !inDb) { console.error(`STOP  the database ${DB} is not the one the server on port ${PORT} uses. Pass the copy's database: tsx <check> ${PORT} xr_studio_<name>.`); process.exit(2); }
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const l = await call("POST", "/demo/load", {});
  if (l.status >= 300) { console.error("STOP  the sample did not load", l.body); process.exit(2); }
  const wp = sql(`select id from combination where combination_key='wp.family'`);
  const S0 = (await call("GET", `/combinations/${wp}/config?mode=published`)).body.snapshot;

  // ---------------------------------------------------------------- engine: the country PQR is a view of releases
  const tick = (s: any, ticks: [string, string][]) => { const x = clone(s); x.fact_sources = ticks.map(([role, fact]) => ({ role, fact, source: null, document_type: null, prequalification: true, reason: null, origin: "HUMAN" })); return x; };
  const other = factSources(S0).find((f) => f.role === "principal" && f.placed && f.source === "CLIENT")!;
  const A = tick(S0, [["principal", "person.date_of_birth"], ["principal", other.fact]]);
  const B = tick(S0, [["principal", "person.date_of_birth"]]); B.combination.label = "Second combination (test)";
  const C = clone(S0); C.combination.label = "No PQR (test)";
  const v = countryPqr([{ combinationId: "a", version: 2, snapshot: A }, { combinationId: "b", version: 1, snapshot: B }, { combinationId: "c", version: 1, snapshot: C }]);
  const dob = v.lines.find((x) => x.role === "principal" && x.fact === "person.date_of_birth");
  ok("C4.2 P-132 pass: one country line per fact and person, with every released combination that asks it", v.lines.length === 2 && dob?.combinations.length === 2 && dob.combinations.map((x) => x.id).sort().join() === "a,b", v.lines.map((x) => `${x.label}: ${x.combinations.map((c) => c.id).join("+")}`));
  ok("C4.2 P-132: the line most combinations ask comes first; the count is the combinations that ask any", v.lines[0].fact === "person.date_of_birth" && v.combinations === 2, v.combinations);
  ok("C4.2 P-132 fail-guard: the country lines say the question and the person in words, never a system key", v.lines.every((x) => !KEYS.test(`${x.label} ${x.roleLabel}`)), v.lines.map((x) => `${x.label} / ${x.roleLabel}`));
  const rep = clone(A); rep.fact_sources = [{ role: "representative", fact: "representative.family_name", source: null, document_type: null, prequalification: true, reason: null, origin: "HUMAN" }];
  ok("C4.2 fail: a tick that release refuses (a case officer fact) is never in the country PQR", countryPqr([{ combinationId: "r", version: 1, snapshot: rep }]).lines.length === 0 && prequalification(rep).length === 0);
  ok("C4.2 fail: a combination with no tick adds nothing", countryPqr([{ combinationId: "c", version: 1, snapshot: C }]).lines.length === 0);

  // ---------------------------------------------------------------- API: draft tick, release, country view
  const country = async () => (await call("GET", `/combinations/${wp}/pqr/country`)).body;
  let K = await country();
  ok("C4.2 API read: the country PQR after Load sample: no question yet, one released combination (Sample)", K.lines.length === 0 && K.released === 1 && /Sample/.test(K.basis), { lines: K.lines.length, released: K.released });
  const put = (role: string, fact: string, b: any) => call("PUT", `/combinations/${wp}/fact-sources/${role}/${encodeURIComponent(fact)}`, b);
  let r = await put("principal", "person.date_of_birth", { prequalification: true, reason: "Sample: decides the family rows", version: 0 });
  ok("C4.2 pass: the author ticks Date of birth for pre-qualification (a draft row of the one per-combination record)", r.status === 200 && r.body?.prequalification === true && sql(`select count(*) from fact_source where combination_id='${wp}' and prequalification`) === "1", r.body?.prequalification ?? words(r));
  const L = (await call("GET", `/combinations/${wp}/fact-sources`)).body;
  ok("C4.2 pass: the combination's PQR set lists exactly the ticked questions, with how each is asked", L.counts.prequalification === 1 && L.prequalification.length === 1 && L.prequalification[0].fact === "person.date_of_birth" && L.prequalification[0].source === "DOCUMENT", L.prequalification);
  K = await country();
  ok("C4.2 P-132 fail: a draft tick is not in the country PQR until its combination releases; it is named as a draft change", K.lines.length === 0 && K.thisCombination.draftAdds.length === 1 && !KEYS.test(K.thisCombination.draftAdds[0].label), K.thisCombination);
  r = await call("GET", `/pqr/country`);
  ok("C4.2 P-132 fail: there is no country PQR record to read or write on its own (only the view per combination)", r.status === 404, r.status);

  // ---------------------------------------------------------------- C4.8: one review and release, no PQR-only approval
  let c = (await call("GET", `/combinations/${wp}`)).body;
  const line = (c.draft.changes as any[]).find((x) => x.kind === "Where an answer comes from" && /pre-qualification/.test(x.label));
  ok("C4.8 pass: the tick is one named line among the combination's changes, for the immigration expert's sign-off", !!line && line.needs_sme === true && !KEYS.test(line.label), line?.label);
  for (const path of [`/combinations/${wp}/pqr/approve`, `/combinations/${wp}/pqr/release`, `/combinations/${wp}/pqr/submit`]) {
    r = await call("POST", path, {});
    ok(`C4.8 fail: no separate PQR approval route (${path.split("/").pop()} is 404)`, r.status === 404, r.status);
  }
  r = await call("POST", `/combinations/${wp}/submit`, {});
  ok("C4.8 pass: the combination is submitted with its PQR, sources, forms and documents together", r.status === 201 || r.status === 200, words(r) || r.status);
  const review = (await call("GET", `/combinations/${wp}/review`)).body;
  const sme = ((review.submission?.changeSummary ?? []) as any[]).filter((x) => x.needs_sme).map((x) => `${x.kind}|${x.key}`);
  ok("C4.8: the submitted summary carries the PQR line", sme.some((x) => x.startsWith("Where an answer comes from|principal|person.date_of_birth")), sme);
  r = await call("POST", `/combinations/${wp}/approve`, {}, "user-B");
  ok("C4.8 fail: approval waits for the immigration expert's sign-off of the PQR line", r.status >= 400, `${r.status} ${words(r).slice(0, 140)}`);
  if (sme.length) await call("POST", `/combinations/${wp}/signoff`, { items: sme, action: "signed" }, "user-C");
  r = await call("POST", `/combinations/${wp}/approve`, {}, "user-B");
  ok("C4.8 pass: one release (Release 2) publishes the PQR with everything else", r.status === 201 && r.body?.version === 2, words(r) || r.body?.version);
  const rel = (await call("GET", `/combinations/${wp}/config?mode=published`)).body.snapshot;
  ok("C4.8 pass: the released snapshot carries the tick", (rel.fact_sources ?? []).some((x: any) => x.role === "principal" && x.fact === "person.date_of_birth" && x.prequalification));
  K = await country();
  ok("C4.2 P-132 pass: once released, the country PQR asks it, naming the combination and its release", K.lines.length === 1 && K.lines[0].combinations[0].release === 2 && K.combinations === 1 && !K.thisCombination.draftAdds.length, K.lines.map((x: any) => `${x.label} · ${x.roleLabel} · ${x.combinations.map((c: any) => `${c.label} r${c.release}`).join()}`));

  // ---------------------------------------------------------------- untick after release; retired combinations
  const v1 = Number(sql(`select max(version) from fact_source where combination_id='${wp}' and lineage_key='principal|person.date_of_birth'`));
  r = await put("principal", "person.date_of_birth", { prequalification: false, version: v1 });
  K = await country();
  ok("C4.2 P-132: an untick in the draft keeps the released line and names it as leaving at the next release", r.status === 200 && K.lines.length === 1 && K.thisCombination.draftRemoves.length === 1, K.thisCombination);
  c = (await call("GET", `/combinations/${wp}`)).body;
  ok("C4.8: the untick is itself a named change for the next release", (c.draft.changes as any[]).some((x) => x.kind === "Where an answer comes from" && x.key === "principal|person.date_of_birth"), (c.draft.changes as any[]).map((x) => `${x.kind}: ${x.label}`).slice(0, 4));
  sql(`update combination set retired_at=now() where id='${wp}'`);
  K = await country();
  ok("C4.2 P-132 fail: a retired combination's release is not in the country PQR (prospects are not asked for it)", K.lines.length === 0 && K.released === 0, { lines: K.lines.length, released: K.released });
  sql(`update combination set retired_at=null where id='${wp}'`);
  r = await call("GET", `/combinations/not-a-combination/pqr/country`);
  ok("C4.2 fail: an unknown combination is 404 in words (never a 500)", r.status === 404 && /does not exist/.test(words(r)), r.status);
  r = await call("GET", `/combinations/${wp}/pqr/country`, undefined, "nobody");
  ok("C4.2 roles fail: an unknown person cannot read it", r.status === 401 || r.status === 403, r.status);

  const out = join(import.meta.dirname, "..", "..", "..", "product", "screens", "W1-questions-and-documents", "tests");
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "check_pqr.json"), JSON.stringify({ at: new Date().toISOString(), port: PORT, pass, fail, log }, null, 2));
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
