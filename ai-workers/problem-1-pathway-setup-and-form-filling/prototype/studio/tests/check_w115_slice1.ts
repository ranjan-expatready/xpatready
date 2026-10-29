// W1-15 Questions and documents, slice 1 (runtime lane; P-130–P-132; challenge.md M1–M6, m1, m2 and the Lead response,
// 29 Oct): where the answer to each fact comes from per person role (document › client › agent), the per-role coverage
// fix, a person's choice over the rules and the Pre-qualification tick (FactSource), and the release rules (C4.10).
// A passing and a failing case per rule: the engine on the sample's own draft snapshot (changed in memory), and the API
// on an isolated copy with the sample loaded. Rules only: no AI call (US$0).
//   zsh studio/tools/isolated.sh runtime_w115 4434 start && tsx studio/tests/check_w115_slice1.ts 4434 xr_studio_runtime_w115
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { coverageGaps } from "../engine/coverage.ts";
import { peopleFor } from "../engine/render.ts";
import { documentFacts, factSourceProblems, factSources, suppliesOf } from "../engine/sources.ts";
import { diff } from "../engine/validate.ts";

const PORT = Number(process.argv[2] ?? 4434), DB = process.argv[3] ?? "xr_studio_runtime_w115";
const log: any[] = []; let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; log.push({ name, ok: !!c, detail }); console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 220)}` : ""}`); };
/** Lead check W1: a system key (person.date_of_birth) or a role key ("(principal)") in words meant for people. */
const KEYS = /\b[a-z_]+\.[a-z_]+\b|\((principal|spouse_or_partner|child|representative)\)/;
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: any = null; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const words = (r: { body: any }) => String(r.body?.detail ?? r.body?.message ?? "");
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));
const PASSPORT = "passport_or_travel_document_information_page_photocopy";

(async () => {
  const served = (await call("GET", "/session")).body?.workspace?.id;
  const inDb = (() => { try { return sql(`select id from workspace where id='${served}'`); } catch { return ""; } })();
  if (!served || !inDb) { console.error(`STOP  the database ${DB} is not the one the server on port ${PORT} uses. Pass the copy's database: tsx <check> ${PORT} xr_studio_<name>.`); process.exit(2); }
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const l = await call("POST", "/demo/load", {});
  if (l.status >= 300) { console.error("STOP  the sample did not load", l.body); process.exit(2); }
  const wp = sql(`select id from combination where combination_key='wp.family'`);
  const draft = async () => (await call("GET", `/combinations/${wp}/config?mode=draft`)).body;
  const S0 = (await draft()).snapshot;

  // ---------------------------------------------------------------- M5 fingerprints: nothing changes without a choice
  let c = (await call("GET", `/combinations/${wp}`)).body;
  ok("C4.10 M5 pass: after Load sample, With an LMIA's draft still equals its release (the sample library data is inside Release 1)", c.draft.matches_release === true && c.draft.changes.length === 0, { matches: c.draft.matches_release, changes: c.draft.changes.length });
  ok("C4.10 M5: no fact_sources key in a snapshot with no choice", !("fact_sources" in S0));

  // ---------------------------------------------------------------- M6 subjects (engine)
  ok("C4.10 M6 (rule): a supplied fact is about the holder unless the library says otherwise", JSON.stringify(suppliesOf({ key: "m", name: "M", supplies_facts: ["person.family_name", "relationship.start_date"], supplies_about: { "person.family_name": "holder.spouse" } })) === JSON.stringify([{ fact: "person.family_name", about: "holder.spouse" }, { fact: "relationship.start_date", about: "holder" }]));
  const fam = peopleFor([{ role: "principal", label: "Principal", min: 1, max: 1 }, { role: "spouse_or_partner", label: "Spouse", min: 1, max: 1 }, { role: "child", label: "Child", min: 1, max: 1 }]);
  const subj: any = { ...clone(S0), document_requirements: [{ document_type: "Marriage", document_type_key: "m", who: "principal_applicant", base_or_conditional: "base" }, { document_type: "Birth", document_type_key: "b", who: "each_dependent_child", base_or_conditional: "conditional" }],
    document_types: [{ key: "m", name: "Marriage", supplies_facts: ["person.family_name", "relationship.start_date"], supplies_about: { "person.family_name": "holder.spouse" } }, { key: "b", name: "Birth", supplies_facts: ["person.date_of_birth", "person.family_name"], supplies_about: { "person.family_name": "holder.parent" } }] };
  const df = documentFacts(subj, fam);
  ok("C4.10 M6 pass: the principal's marriage certificate supplies the spouse's family name (holder.spouse), and the date of the relationship for the principal", df.get("spouse_or_partner")?.has("person.family_name") === true && df.get("principal")?.has("relationship.start_date") === true);
  ok("C4.10 M6 fail: it does not supply the principal's own family name", !df.get("principal")?.has("person.family_name"));
  ok("C4.10 M6 pass: a child's birth certificate supplies the child's date of birth and the parents' family name (holder.parent)", df.get("child-1")?.has("person.date_of_birth") === true && df.get("child-1/parent_1")?.has("person.family_name") === true && !df.get("child-1")?.has("person.family_name"));

  // ---------------------------------------------------------------- M3 coverage per role (engine)
  const gapsOf = (s: any) => coverageGaps(s).filter((g) => g.fact === "person.passport_number");
  const each = clone(S0); const principalOnly = clone(S0);
  for (const r of principalOnly.document_requirements) if (r.document_type_key === PASSPORT) r.who = "principal_applicant";
  // Take the question away so only the document can cover the fact (as with a fact no section asks).
  for (const s of [each, principalOnly]) s.placements = s.placements.filter((p: any) => p.fact !== "person.passport_number");
  ok("C4.10 M3 pass: a passport asked of each applicant covers each one's passport number (no gap)", gapsOf(each).length === 0, gapsOf(each));
  ok("C4.10 M3 fail: a passport asked of the principal only leaves the spouse's passport number uncovered (a coverage gap, release refused)", gapsOf(principalOnly).some((g) => g.role === "spouse_or_partner"), gapsOf(principalOnly).map((g) => g.role));

  // ---------------------------------------------------------------- precedence (engine, on the sample)
  const fs0 = factSources(S0);
  const get = (fs: any[], role: string, fact: string) => fs.find((f) => f.role === role && f.fact === fact);
  ok("C4.10 precedence pass: the principal's date of birth comes from the passport (Document, by Rules)", get(fs0, "principal", "person.date_of_birth")?.source === "DOCUMENT" && /Passport/.test(get(fs0, "principal", "person.date_of_birth")?.document?.name ?? "") && get(fs0, "principal", "person.date_of_birth")?.proposedBy === "Rules");
  const rep = fs0.find((f) => f.fact.startsWith("representative."));
  ok("C4.10 precedence pass: a representative's fact comes from the case officer", rep?.source === "AGENT", rep && `${rep.role}|${rep.fact}`);
  const decl = fs0.find((f) => f.clientOnly);
  ok("C4.10 m2 (P-97) pass: a declaration or background answer comes from the client", !!decl && decl.source === "CLIENT", decl && `${decl.role}|${decl.fact}`);
  const noDoc = fs0.find((f) => f.source === "CLIENT" && !f.clientOnly && !f.also.length);
  ok("C4.10 precedence fail-guard: a fact no checklist document supplies comes from the client", !!noDoc, noDoc && `${noDoc.role}|${noDoc.fact}`);
  const two = clone(S0); two.document_types.push({ key: "zz_national_id", name: "National identity card", supplies_facts: ["person.date_of_birth"] }); two.document_requirements.push({ document_type: "National identity card", document_type_key: "zz_national_id", who: "each_applicant", base_or_conditional: "conditional" });
  const dob2 = get(factSources(two), "principal", "person.date_of_birth");
  ok("C4.10 m1 pass: with two documents supplying it, the always-needed passport is the source and the identity card is 'also supplied by'", /Passport/.test(dob2?.document?.name ?? "") && dob2?.also.some((x: any) => x.key === "zz_national_id"), { doc: dob2?.document?.name, also: dob2?.also?.map((x: any) => x.key) });

  // ---------------------------------------------------------------- M2 release rules (engine)
  const conditional = clone(S0); const always = clone(S0);
  for (const s of [conditional, always]) { s.placements = s.placements.filter((p: any) => p.fact !== "person.passport_number"); }
  for (const r of conditional.document_requirements) if (r.document_type_key === PASSPORT) { r.base_or_conditional = "conditional"; }
  const probs = (s: any) => factSourceProblems(s).filter((p) => p.item === "person.passport_number");
  ok("C4.10 M2 (Q3) warning: a fact from an always-needed passport with no fallback question is a warning", probs(always).length > 0 && probs(always).every((p) => p.level === "warning") && /fallback/.test(probs(always)[0].message), probs(always).map((p) => p.message));
  ok("C4.10 M2 (Q3) fail: the same fact from a passport asked only in some cases is an error (nobody would give it)", probs(conditional).some((p) => p.level === "error" && /asked only in some cases/.test(p.message)), probs(conditional).map((p) => p.level));
  ok("C4.10 M2 pass: on the sample as loaded, no source problem blocks release", !factSourceProblems(S0).some((p) => p.level === "error"), factSourceProblems(S0).filter((p) => p.level === "error").map((p) => p.message).slice(0, 2));
  const lockedDoc = clone(S0); lockedDoc.fact_sources = [{ role: decl!.role, fact: decl!.fact, source: "AGENT", document_type: null, prequalification: false, reason: null, origin: "HUMAN" }];
  ok("C4.10 m2 (P-97) fail: Agent on a client-only fact is refused at release", factSourceProblems(lockedDoc).some((p) => p.level === "error" && p.item === decl!.fact && /only the client gives it/.test(p.message)));
  const pqAgent = clone(S0); pqAgent.fact_sources = [{ role: rep!.role, fact: rep!.fact, source: null, document_type: null, prequalification: true, reason: null, origin: "HUMAN" }];
  ok("C4.2 M4 fail: a pre-qualification tick on an agent fact is refused at release", factSourceProblems(pqAgent).some((p) => p.level === "error" && /prospect is asked only what they can answer/.test(p.message)));
  const pqDoc = clone(S0); pqDoc.fact_sources = [{ role: "principal", fact: "person.date_of_birth", source: null, document_type: null, prequalification: true, reason: null, origin: "HUMAN" }];
  ok("C4.2 M4 (Q1) pass: a tick on the passport's date of birth (it has a question) is allowed", !factSourceProblems(pqDoc).some((p) => p.item === "person.date_of_birth" && p.level === "error") && get(factSources(pqDoc), "principal", "person.date_of_birth")?.prequalification === true);
  const d1 = diff(S0 as any, pqDoc);
  ok("C4.10 M5: a tick is one named line on Review, needing the immigration expert's sign-off", d1.filter((x) => x.kind === "Where an answer comes from").length === 1 && d1.find((x) => x.kind === "Where an answer comes from")!.needs_sme === true && !d1.some((x) => x.kind === "Configuration"), d1.map((x) => `${x.kind}: ${x.label}`));
  { const t = d1.find((x) => x.kind === "Where an answer comes from")!.label;
    ok("Lead check W1 pass: the tick's Review line uses the fact's words and the role's label (\"…: pre-qualification\")", /^[A-Z][^:]* \([A-Z][^)]*\): pre-qualification$/.test(t), t);
    ok("Lead check W1 fail: the tick's Review line shows no system key or role key", !KEYS.test(t), t); }

  // ---------------------------------------------------------------- API: list, choose, refuse, undo, release
  let L = (await call("GET", `/combinations/${wp}/fact-sources`)).body;
  ok("C4.10 API read: the list says where each fact comes from, with counts (Sample)", L.counts.facts > 100 && L.counts.document > 0 && L.counts.client > 0 && L.counts.agent > 0 && L.counts.prequalification === 0 && /Sample/.test(L.basis), L.counts);
  const item = (role: string, fact: string) => L.facts.find((f: any) => f.role === role && f.fact === fact);
  const dob = item("principal", "person.date_of_birth");
  const put = (role: string, fact: string, b: any, actor = "user-A") => call("PUT", `/combinations/${wp}/fact-sources/${role}/${encodeURIComponent(fact)}`, b, actor);
  let r = await put("principal", "person.date_of_birth", { source: "CLIENT", version: 0 }, "user-O");
  ok("C4.10 roles fail: a case officer cannot change where an answer comes from (403)", r.status === 403, r.status);
  r = await put("principal", "person.date_of_birth", { source: "CLIENT", reason: "Sample: asked on the form as well", version: 0 });
  ok("C4.10 M1 pass: the author chooses Client over the passport; saved as a draft choice by a person", r.status === 200 && r.body?.source === "CLIENT" && r.body?.proposedBy === "Person" && r.body?.ruleSource === "DOCUMENT" && sql(`select status || '|v' || version from fact_source where combination_id='${wp}' and lineage_key='principal|person.date_of_birth'`) === "DRAFT|v1", r.body ?? words(r));
  r = await put("principal", "person.date_of_birth", { source: "AGENT", version: 0 });
  ok("C4.10 M1 fail: a choice sent from an old version is 409 (someone changed it)", r.status === 409 && /changed/.test(words(r)), words(r));
  c = (await call("GET", `/combinations/${wp}`)).body;
  ok("C4.10 M5: the choice is one named change on Review (needs the immigration expert); the draft no longer equals the release", c.draft.matches_release === false && c.draft.changes.some((x: any) => x.kind === "Where an answer comes from" && x.needs_sme), c.draft.changes.map((x: any) => `${x.kind}: ${x.label}`));
  { const lines = c.draft.changes.filter((x: any) => x.kind === "Where an answer comes from").map((x: any) => x.label);
    ok("Lead check W1 pass: the Review line reads \"Date of birth (<role label>): comes from the client\"", lines.some((t: string) => /^Date of birth \([A-Z][^)]*\): comes from the client$/.test(t)), lines);
    ok("Lead check W1 fail: no Review line shows a system key (person.date_of_birth) or a role key (principal)", lines.length > 0 && !lines.some((t: string) => KEYS.test(t)), lines); }
  r = await call("DELETE", `/combinations/${wp}/fact-sources/principal/${encodeURIComponent("person.date_of_birth")}`, { version: 1 }, "user-B");
  ok("C4.10 Undo fail: someone else cannot undo the author's draft choice", r.status === 403 || (r.status === 409 && /Only the person/.test(words(r))), `${r.status} ${words(r)}`);
  ok("Lead check W2 pass: the refusal says \"Only the person who made this draft can undo it.\"", words(r).includes("Only the person who made this draft can undo it."), words(r));
  ok("Lead check W2 fail: the refusal does not talk about duties or \"(simulated)\"", !/duty|simulated/i.test(words(r)), words(r));
  r = await call("DELETE", `/combinations/${wp}/fact-sources/principal/${encodeURIComponent("person.date_of_birth")}`, { version: 1 });
  c = (await call("GET", `/combinations/${wp}`)).body;
  ok("C4.10 Undo pass: the author undoes it at once: back to the passport, and the draft equals the release again", r.status === 200 && r.body?.source === "DOCUMENT" && r.body?.proposedBy === "Rules" && c.draft.matches_release === true, { status: r.status, src: r.body?.source, matches: c.draft.matches_release });
  r = await put("principal", "person.date_of_birth", { source: "DOCUMENT", documentTypeKey: "proof_of_fee_payment_processing_fee_and_other_applicable_fee", version: 0 });
  ok("C4.10 M2 fail: a document that does not supply the fact is refused at save (422, on its field)", r.status === 422 && r.body?.errors?.[0]?.field === "documentTypeKey", words(r));
  r = await put(decl!.role, decl!.fact, { source: "AGENT", version: 0 });
  ok("C4.10 m2 (P-97) fail: Agent on a declaration is refused at save (422)", r.status === 422 && /only the client gives it/.test(words(r)), words(r));
  ok("Lead check W3 fail: the refusal at save carries no decision code (P-…)", !/\(P-\d+\)|\bP-\d+\b/.test(JSON.stringify(r.body)), words(r));
  r = await put(rep!.role, rep!.fact, { prequalification: true, version: 0 });
  ok("C4.2 M4 fail: a pre-qualification tick on an agent fact is refused at save (422)", r.status === 422 && r.body?.errors?.some((e: any) => e.field === "prequalification"), words(r));
  const unplaced = L.facts.find((f: any) => !f.placed && f.source !== "AGENT" && !f.clientOnly);
  if (unplaced) { r = await put(unplaced.role, unplaced.fact, { prequalification: true, version: 0 }); ok("C4.2 M4 fail: a tick on a fact no question asks is refused at save (422)", r.status === 422 && /No question asks/.test(words(r)), `${unplaced.fact}: ${words(r)}`); }
  r = await put("principal", "person.date_of_birth", { prequalification: true, reason: "Sample: the guide's age test", version: 0 });
  L = (await call("GET", `/combinations/${wp}/fact-sources`)).body;
  ok("C4.2 M4 (Q1) pass: the passport's date of birth is ticked for pre-qualification; it stays a Document fact and is in the PQR", r.status === 200 && r.body?.source === "DOCUMENT" && r.body?.prequalification === true && L.counts.prequalification === 1 && L.prequalification.some((x: any) => x.fact === "person.date_of_birth" && x.source === "DOCUMENT"), L.prequalification);
  ok("C4.10 M1: the rules' own source is not stored as a choice (only the tick)", sql(`select coalesce(source,'-') || '|' || prequalification from fact_source where combination_id='${wp}' and lineage_key='principal|person.date_of_birth' order by version desc limit 1`) === "-|true");
  // Release: a choice nobody can reach blocks it (set in the data, as an older save would be).
  sql(`insert into fact_source (workspace_id, combination_id, lineage_key, role, canonical_field_key, source, version, status, origin, updated_by) values ('${served}', '${wp}', '${decl!.role}|${decl!.fact}', '${decl!.role}', '${decl!.fact}', 'AGENT', 1, 'DRAFT', 'HUMAN', 'user-A')`);
  c = (await call("GET", `/combinations/${wp}`)).body;
  ok("C4.10 fail: release is refused while a client-only fact says Agent (an error on the page, in words)", c.draft.problems.some((p: any) => p.level === "error" && p.item === decl!.fact && /only the client gives it/.test(p.message)), c.draft.problems.filter((p: any) => p.item === decl!.fact).map((p: any) => p.message));
  ok("Lead check W3 pass: the release check says it in words and carries no decision code; no source check on the page does", c.draft.problems.some((p: any) => p.item === decl!.fact && /Set Comes from to Client/.test(p.message)) && !c.draft.problems.some((p: any) => p.where === "Questions" && /\bP-\d+\b/.test(p.message)), c.draft.problems.filter((p: any) => p.where === "Questions").map((p: any) => p.message).slice(0, 3));
  r = await call("POST", `/combinations/${wp}/submit`, {});
  ok("C4.10 fail: submitting for review is refused with that error", r.status === 400 && /only the client gives it/.test(words(r)), words(r).slice(0, 160));
  sql(`delete from fact_source where combination_id='${wp}' and lineage_key='${decl!.role}|${decl!.fact}'`);
  r = await call("POST", `/combinations/${wp}/submit`, {});
  const review = (await call("GET", `/combinations/${wp}/review`)).body;
  const sme = ((review.submission?.changeSummary ?? []) as any[]).filter((x) => x.needs_sme).map((x) => `${x.kind}|${x.key}`);
  if (sme.length) await call("POST", `/combinations/${wp}/signoff`, { items: sme, action: "signed" }, "user-C");
  r = await call("POST", `/combinations/${wp}/approve`, {}, "user-B");
  ok("C4.10 pass: with the tick only, it is submitted, signed off and released (Release 2)", r.status === 201 && r.body?.version === 2, words(r) || r.body?.version);
  const rel = (await call("GET", `/combinations/${wp}/config?mode=published`)).body.snapshot;
  ok("C4.2 pass: Release 2 carries the pre-qualification tick", (rel.fact_sources ?? []).some((x: any) => x.fact === "person.date_of_birth" && x.prequalification === true), rel.fact_sources);
  r = await call("DELETE", `/combinations/${wp}/fact-sources/principal/${encodeURIComponent("person.date_of_birth")}`, { version: 1 });
  ok("C4.10 Undo fail: a released choice is not undone (409 Released since)", r.status === 409 && /Released since|released meanwhile/.test(`${r.body?.title} ${words(r)}`), `${r.status} ${words(r)}`);
  sql(`update combination set retired_at=now() where id='${wp}'`);
  r = await put("principal", "person.date_of_birth", { prequalification: false, version: 1 });
  ok("C4.10 fail: a retired combination's sources are not changed (409, restore it first)", r.status === 409 && /is retired/.test(words(r)), words(r));
  sql(`update combination set retired_at=null where id='${wp}'`);
  r = await call("GET", `/combinations/not-a-combination/fact-sources`);
  ok("C4.10 fail: an unknown combination is 404 in words (never a 500)", r.status === 404, r.status);

  const out = join(import.meta.dirname, "..", "..", "..", "product", "screens", "W1-questions-and-documents", "tests");
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "check_w115_slice1.json"), JSON.stringify({ at: new Date().toISOString(), port: PORT, pass, fail, log }, null, 2));
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
