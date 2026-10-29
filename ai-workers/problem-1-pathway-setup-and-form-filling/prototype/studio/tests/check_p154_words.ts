// P-154 (29 Oct): "agent" is retired as a role word; people read Document · Client · Case officer and "case view". QA-81's
// two screens-lane places: the Corporate panel on Immigration programs and the Documents "Provided by" choice. Pure: reads
// the page sources; no server, no database, NO model call (US$0). The stored code "agent" may stay; only words change.
//   tsx studio/tests/check_p154_words.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

const PAGES = join(import.meta.dirname, "..", "web", "src", "pages");
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };

/** Words a person reads: JSX text and string literals, minus attribute values that are stored codes (value="agent"). */
const shown = (src: string) => src.replace(/\b(value|mode|key)=["'][^"']*["']/g, "").replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
const agentWords = (file: string) => (shown(readFileSync(join(PAGES, file), "utf8")).match(/[^\n]{0,40}\bagent\b[^\n]{0,40}/gi) ?? []);

const programs = readFileSync(join(PAGES, "programs.tsx"), "utf8"), configuration = readFileSync(join(PAGES, "configuration.tsx"), "utf8");
ok("C11.10 P-154 pass: the Corporate panel says the case officer picks \"relies on employer case\"", /On the worker's case the case officer picks/.test(programs));
ok("C11.6 P-154 pass: Documents \"Provided by\" reads The firm (case officer), stored code unchanged", /<option value="agent">The firm \(case officer\)</.test(configuration));
for (const f of ["programs.tsx", "configuration.tsx"]) {
  const hits = agentWords(f);
  ok(`C11.10 P-154 fail: no user-facing "agent" left in ${f} (QA-81)`, hits.length === 0, hits);
}

console.log(`\n${pass} PASS · ${fail} FAIL`);
process.exit(fail ? 1 : 0);
