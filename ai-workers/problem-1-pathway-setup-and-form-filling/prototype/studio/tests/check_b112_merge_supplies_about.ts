// B112 (QA-256, Major, holds C4.5): merging one field into another moves what a document supplies, and whom each fact is
// about moves with it: a fact about the holder's spouse never reads as the holder's own after a merge. Through the routes
// a person uses, on the suites' fixture. Test words, not immigration values. Rules only, no AI (US$0).
//   zsh studio/tools/isolated.sh forms_b112 4411 start && tsx studio/tests/check_b112_merge_supplies_about.ts 4411 xr_studio_forms_b112
import { execFileSync } from "node:child_process";

const PORT = Number(process.argv[2]), DB = process.argv[3];
if (!PORT || !/^xr_studio_(?!demo)/.test(DB ?? "")) { console.error("usage: <port> <isolated database>"); process.exit(2); }
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 400)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely, as in the other API checks
const call = async (method: string, path: string, body?: unknown, actor = "user-A"): Promise<Res> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "content-type": "application/json", "x-actor": actor }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let parsed: unknown = t; try { parsed = JSON.parse(t); } catch { /* words */ }
  return { status: r.status, body: parsed };
};
const sql = (q: string) => execFileSync("psql", ["-h", "127.0.0.1", "-p", "54329", "-U", "xr_studio", "-d", DB, "-Atc", q], { encoding: "utf8" }).trim();
const today = new Date().toISOString().slice(0, 10);
const cite = (fact: string, about: string) => ({ fact, about, source: "Test words (fixture), page 1", quote: `Test: the document shows ${fact}`, readOn: today });
const newest = (key: string) => sql(`select array_to_string(supplies_facts, ',') || '|' || coalesce(supplies_about::text, '') from document_type where document_type_key = '${key}' order by version desc limit 1`);
const supplies = async (key: string, facts: { fact: string; about: string }[]) => {
  const p = await call("POST", `/library/document-types/${key}/supplies`, { facts: facts.map((f) => cite(f.fact, f.about)), reason: "Test: whom each fact is about (B112)." });
  if (p.status >= 300) { console.error("STOP  the change was not proposed", p.body); process.exit(2); }
  const a = await call("POST", `/library/changes/${p.body.id}/approve`, { note: "Second person (B112 check)." }, "user-B");
  if (a.status >= 300) { console.error("STOP  the change was not approved", a.body); process.exit(2); }
};
const merge = async (keep: string, gone: string) => {
  const m = await call("POST", "/library/merges", { keep, merge: gone, reason: "Test: these two mean the same for this check only (B112)." });
  return m.status < 300 ? call("POST", `/library/merges/${m.body?.id ?? m.body?.merge?.id}/approve`, { note: "Second person (B112 check)." }, "user-B") : m;
};

const load = await call("POST", "/demo/load");
if (load.status >= 300) { console.error("STOP  the fixture did not load", load.body); process.exit(2); }
const types = sql(`select distinct document_type_key from document_type where status = 'PUBLISHED' order by 1 limit 2`).split("\n");
const fields = sql(`select distinct f.canonical_field_key from canonical_field f where f.status = 'PUBLISHED' and f.merged_into_key is null and f.canonical_field_key like 'person.%' and f.value_type = 'text' and f.answer_list_key is null and not exists (select 1 from document_type t where f.canonical_field_key = any(t.supplies_facts)) order by 1 limit 4`).split("\n");
if (types.length < 2 || fields.length < 4) { console.error("STOP  the fixture has too few document types or fields", { types, fields }); process.exit(2); }
const [typeA, typeB] = types, [keepA, goneA, keepB, goneB] = fields;

// A fact about the spouse, merged into a field this document does not supply yet.
await supplies(typeA, [{ fact: goneA, about: "holder.spouse" }]);
let r = await merge(keepA, goneA);
ok("B112 setup: the merge is approved", r.status < 300, r);
const view = (await call("GET", `/library/document-types/${typeA}/supplies`)).body;
const moved = view?.facts?.find((f: { fact: string }) => f.fact === keepA);
ok("B112 fail on main (QA-256): after the merge the fact still says it is about the holder's spouse, never the holder's own", moved?.about === "holder.spouse", { moved, facts: view?.facts?.map((f: { fact: string; about: string }) => [f.fact, f.about]) });
const row = newest(typeA);
ok("B112: whom-it-is-about is stored under the field that stays, and nothing is left under the merged field", row.includes(`"${keepA}": "holder.spouse"`) && !row.includes(`"${goneA}"`), row);

// The document supplies both, about different people: the merge would lose whom one is about.
await supplies(typeB, [{ fact: keepB, about: "holder" }, { fact: goneB, about: "holder.spouse" }]);
const before = newest(typeB);
r = await merge(keepB, goneB);
ok("B112 fail: a merge that would make one fact about two people is refused in words, naming the document", r.status === 409 && /about different people/.test(r.body?.message ?? ""), r);
ok("B112 fail: the refused merge changes nothing", newest(typeB) === before && sql(`select count(*) from canonical_field where canonical_field_key = '${goneB}' and merged_into_key is not null`) === "0", newest(typeB));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
