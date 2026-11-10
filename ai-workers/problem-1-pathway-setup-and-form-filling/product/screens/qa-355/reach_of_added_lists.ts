// QA-355 (a) evidence (screens lane, 9 Nov): on the configured checkpoint, which release facts read with no list (and no
// answer list) could be closed by a real value list on another library form, if that form were added. Inputs: the
// published library maps (form, fact, transform) as TSV and each config_release snapshot as one JSON line.
//   tsx reach_of_added_lists.ts <lib-lists.tsv> <releases.jsonl>
import { readFileSync } from "node:fs";
import { namesNoValues } from "../../../prototype/studio/engine/options.ts";
const [libF, relF] = process.argv.slice(2);
const note = (t: string) => /^code_list:\S+ \(([^)]*)\)/.exec(t)?.[1];
const lib = readFileSync(libF, "utf8").split("\n").filter(Boolean).map((l) => l.split("\t")).map(([form, fact, t]) => ({ form, fact, n: note(t) }));
const realLib = lib.filter((r) => r.n && !namesNoValues(r.n));
const leftover = [...new Set(lib.filter((r) => r.n && !r.n.includes("=") && !namesNoValues(r.n)).map((r) => r.n))];
console.log("notes without '=' still read as lists:", leftover);
for (const line of readFileSync(relF, "utf8").split("\n").filter(Boolean)) {
  const s = JSON.parse(line);
  const held = new Set([...s.forms, ...s.field_maps].map((f: any) => f.form_number));
  const listed = new Map<string, boolean>();
  for (const m of s.field_maps) for (const e of m.entries) if (e.fact) { const n = note(e.transform ?? ""); listed.set(e.fact, (listed.get(e.fact) ?? false) || !!(n && !namesNoValues(n))); }
  const answerList = new Set(s.canonical_fields.filter((f: any) => f.answer_list?.values?.length).map((f: any) => f.id));
  const hits = realLib.filter((r) => !held.has(r.form) && listed.has(r.fact) && !listed.get(r.fact) && !answerList.has(r.fact));
  const byFact = new Map<string, Set<string>>(); for (const h of hits) byFact.set(h.fact, new Set([...(byFact.get(h.fact) ?? []), `${h.form}: ${h.n}`]));
  console.log(`release ${[...held].slice(0, 3).join(",")}…: ${byFact.size} release facts an addable form's real list could close`, Object.fromEntries([...byFact].map(([k, v]) => [k, [...v]])));
}
