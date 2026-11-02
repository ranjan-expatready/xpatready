// SH2b (P-258; qa's Major on PR #504, tech lead's ruling there): where a document type is used has one answer. The
// shared library's Document types list ("Used in") and the item's own uses (its retire and delete guard) both come from
// the one where-used service, so a type used only as another line's alternative, or only as the document a fact is read
// from, is counted the same in both. Through the API on an isolated copy with the sample loaded; US$0, no browser.
//   zsh studio/tools/isolated.sh forms_sh2b 4458 start && tsx studio/tests/check_sh2b_doc_type_uses.ts 4458 xr_studio_forms_sh2b
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

const PORT = Number(process.argv[2] ?? 4458), DB = process.argv[3] ?? "xr_studio_forms_sh2b";
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 400)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely, as in the other API checks
const call = async (method: string, path: string, body?: unknown, actor = "user-A"): Promise<Res> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
};
const PSQL = existsSync("/opt/homebrew/opt/postgresql@18/bin/psql") ? "/opt/homebrew/opt/postgresql@18/bin/psql" : "psql";
const sql = (q: string) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
type TypeRow = { documentTypeKey: string; used_in: string[]; status: string };
const listed = async (key: string) => ((await call("GET", "/library/document-types")).body as TypeRow[]).find((t) => t.documentTypeKey === key)?.used_in ?? [];
const guarded = async (key: string) => ((await call("GET", `/library/document-types/${encodeURIComponent(key)}/uses`)).body?.uses ?? []).filter((u: { kind: string }) => u.kind === "combination").map((u: { label: string }) => u.label);

(async () => {
  const loaded = await call("POST", "/demo/load");
  ok("setup: the sample inputs load", loaded.status === 201, loaded.body?.message);
  // Two published document types no line lists yet (test setup by SQL, as the C11.9 suite adds its own).
  const [ALT, FACT] = ["sh2b_alternative_only", "sh2b_fact_source_only"];
  for (const k of [ALT, FACT]) sql(`insert into document_type (id, workspace_id, document_type_key, name, category, version, status, origin, updated_by) select gen_random_uuid(), id, '${k}', 'SH2b test ${k} (Sample)', 'client', 1, 'PUBLISHED', 'HUMAN', 'user-A' from workspace where key='demo'`);
  const types = (await call("GET", "/library/document-types")).body as TypeRow[];
  ok("setup: the two test types are in the library, used nowhere", [ALT, FACT].every((k) => types.find((t) => t.documentTypeKey === k)?.used_in.length === 0));

  // Before: neither type is used anywhere; both answers agree on nothing.
  ok("SH2b pass: a type used nowhere is used nowhere in the list and in its own uses", !(await listed(ALT)).length && !(await guarded(ALT)).length);

  // Review m5: the setup goes through the product's own routes (as the C11.9 suite sets its alternatives).
  const comboId = sql("select id from combination where retired_at is null order by label limit 1");
  const line = { attachMode: "COMBINATION_MANDATORY", appliesToRoles: "principal_applicant", providedBy: "client" };
  const anyType = sql("select document_type_key from document_type where status = 'PUBLISHED' and document_type_key not like 'sh2b_%' order by 1 limit 1");
  // A type used only as another line's alternative.
  let r = await call("POST", `/combinations/${comboId}/requirements`, { ...line, documentTypeKey: anyType, alternatives: [ALT] });
  ok("setup: a checklist line names the test type as its alternative", r.status < 300, r.body?.detail);
  const a1 = await listed(ALT), a2 = await guarded(ALT);
  ok("SH2b pass: a type used only as an alternative is listed as used, once", a1.length === 1, a1);
  ok("SH2b pass: the list count equals the item's uses for a type used only as an alternative (qa's Major on #504)", a1.length === a2.length && a2.length === 1, { list: a1, uses: a2 });
  // Review m1: the retire alone is refused, naming the combination that uses it.
  r = await call("POST", `/library/document-types/${encodeURIComponent(ALT)}/retire`, { reason: "Not needed by any setup any more." });
  // (The list names a combination by its label, the guard by its trail, Program › Category › Sub-category.)
  ok("SH2b fail: retiring a type used only as an alternative is refused (409), naming the combination", r.status === 409 && (r.body?.uses ?? []).filter((u: { kind: string; label: string }) => u.kind === "combination" && u.label.endsWith(a1[0] ?? "\u0000")).length === 1, [r.status, r.body?.uses, a1]);
  // Review m4: the refusal says how it is used (an alternative), never "the checklist lists it" when no line does.
  ok("SH2b pass: the refusal says it is another line's alternative, so the person knows what to change", (r.body?.uses ?? []).some((u: { why: string }) => /alternative/.test(u.why)), r.body?.uses);

  // Review Major: a type used only as the document a fact is read from, set up through the product (a line for a type
  // that supplies date of birth, the principal's date of birth read from it, then that line retired).
  sql(`update document_type set supplies_facts = array['person.date_of_birth'] where document_type_key = '${FACT}'`);
  // A combination whose form reads the principal's date of birth (a fact source is chosen only where a form needs it).
  const factCombo = sql("select cf.combination_id from combination_form cf join form_edition e on e.gov_form_def_id = cf.gov_form_def_id join form_field_map m on m.form_edition_id = e.id join combination c on c.id = cf.combination_id where m.canonical_field_key = 'person.date_of_birth' and m.outcome = 'mapped' and cf.status in ('DRAFT','PUBLISHED') and c.retired_at is null order by c.label limit 1");
  ok("setup: a combination's form reads the date of birth", /^[0-9a-f-]{36}$/.test(factCombo), factCombo);
  r = await call("POST", `/combinations/${factCombo}/requirements`, { ...line, documentTypeKey: FACT });
  ok("setup: a checklist line asks for the fact-source type", r.status < 300, r.body?.detail);
  const lineage = r.body?.lineageKey ?? r.body?.lineage_key ?? r.body?.lineage ?? sql(`select lineage_key from document_requirement where combination_id = '${factCombo}' and document_type_key = '${FACT}' order by version desc limit 1`);
  r = await call("PUT", `/combinations/${factCombo}/fact-sources/principal/person.date_of_birth`, { source: "DOCUMENT", documentTypeKey: FACT, version: 0 });
  ok("setup: the principal's date of birth is read from that type", r.status < 300, r.body?.detail);
  r = await call("PATCH", `/combinations/${factCombo}/requirements/${encodeURIComponent(lineage)}`, { ...line, documentTypeKey: FACT, retire: true });
  ok("setup: the checklist line is retired, so the type is used only as the fact's source", r.status < 300 && sql(`select count(*) from document_requirement d where combination_id = '${factCombo}' and document_type_key = '${FACT}' and status in ('DRAFT','PUBLISHED') and version = (select max(version) from document_requirement x where x.combination_id = d.combination_id and x.lineage_key = d.lineage_key)`) === "0", r.body?.detail);
  const f1 = await listed(FACT), f2 = await guarded(FACT);
  ok("SH2b pass: the list count equals the item's uses for a type used only as a fact's source", f1.length === 1 && f2.length === 1 && f2[0].endsWith(f1[0]), { list: f1, uses: f2 });
  r = await call("POST", `/library/document-types/${encodeURIComponent(FACT)}/retire`, { reason: "Not needed by any setup any more." });
  ok("SH2b fail: retiring a type a fact is read from is refused (409), saying a fact is read from it", r.status === 409 && (r.body?.uses ?? []).some((u: { why: string }) => /fact/.test(u.why)), [r.status, r.body?.uses]);

  // Every document type: the two answers agree.
  const all = (await call("GET", "/library/document-types")).body as TypeRow[];
  const split: string[] = [];
  for (const t of all) { const g = await guarded(t.documentTypeKey); if (g.length !== t.used_in.length) split.push(`${t.documentTypeKey}: ${t.used_in.length} vs ${g.length}`); }
  ok("SH2b pass: for every document type, the list's count equals the item's own uses", !split.length, split.slice(0, 5));

  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
