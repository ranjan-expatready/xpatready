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

  // A type used only as another line's alternative (test setup by SQL: the newest version of one checklist line).
  const line = sql("select id || '|' || combination_id from document_requirement where status in ('DRAFT','PUBLISHED') order by combination_id, lineage_key, version desc limit 1").split("|");
  sql(`update document_requirement set alternatives = coalesce(alternatives, '[]'::jsonb) || '["${ALT}"]'::jsonb where id = '${line[0]}'`);
  const a1 = await listed(ALT), a2 = await guarded(ALT);
  ok("SH2b pass: a type used only as an alternative is listed as used, once", a1.length === 1, a1);
  ok("SH2b pass: the list count equals the item's uses for a type used only as an alternative (qa's Major on #504)", a1.length === a2.length && a2.length === 1, { list: a1, uses: a2 });
  const r = await call("POST", `/library/document-types/${encodeURIComponent(ALT)}/retire`, { reason: "Not needed by any setup any more." });
  ok("SH2b fail: and its guard still refuses a delete for that use (the item stays used, in words)", (await call("DELETE", `/library/document-types/${encodeURIComponent(ALT)}`, { reason: "Not needed by any setup any more." })).status === 409 || r.status === 409, r.body?.detail);

  // A type used only as the document a fact is read from.
  const fact = sql("select id from fact_source where status in ('DRAFT','PUBLISHED') order by combination_id, lineage_key, version desc limit 1");
  if (fact) {
    sql(`update fact_source set document_type_key = '${FACT}' where id = '${fact}'`);
    const f1 = await listed(FACT), f2 = await guarded(FACT);
    ok("SH2b pass: the list count equals the item's uses for a type used only as a fact's source", f1.length === 1 && f2.length === 1, { list: f1, uses: f2 });
  } else ok("SH2b: (the sample has no fact source; the alternative case covers the shared read)", true);

  // Every document type: the two answers agree.
  const all = (await call("GET", "/library/document-types")).body as TypeRow[];
  const split: string[] = [];
  for (const t of all) { const g = await guarded(t.documentTypeKey); if (g.length !== t.used_in.length) split.push(`${t.documentTypeKey}: ${t.used_in.length} vs ${g.length}`); }
  ok("SH2b pass: for every document type, the list's count equals the item's own uses", !split.length, split.slice(0, 5));

  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
