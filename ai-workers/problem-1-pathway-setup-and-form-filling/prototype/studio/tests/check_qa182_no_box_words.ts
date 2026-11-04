// QA-182 (C3.10, P-63: "every screen and message says form field, shared field and field map; never box"): every message
// the API, the engine, the contracts and the web app can show is read from the source (string literals and on-screen
// text that read as words), and none says box, boxes, box map or canonical in the form-field sense. The same scan as
// acceptance/C3.10.test.ts part 2, without a server, so it runs in the suites. "Search box", "check box", "tick the box"
// (a control of our own screens, not a form field) are not this rule. No database, no model call (US$0).
//   tsx --tsconfig api/tsconfig.json tests/check_qa182_no_box_words.ts
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const STUDIO = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, failed = 0;
const ok = (name: string, cond: boolean, detail?: unknown) => { if (cond) pass++; else failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${name}${cond || detail === undefined ? "" : ` — ${JSON.stringify(detail)}`}`); };

/** The form-field sense: box, boxes, box map, canonical; not a search box, a check box or "tick the box" (a control). */
export const BAD = /(?<!\b(?:search|check|text|dialog|combo|list|select|input|tick the)[ -])\b(box(?:es)?|box maps?|canonical)\b/i;
/** A word built around a value ("box${…}", "box's"), which the literal scan cannot read whole. */
export const BAD_RAW = /\bbox(?:es)?(?:\$\{|'s\b)/;
/** The words a person reads on one source line: string literals and on-screen text, never comments or code. */
export function wordsOn(line: string): string[] {
  if (/^\s*(\*|\/\*|\/\/)/.test(line)) return [];
  const code = line.replace(/\s\/\/ .*$/, "");
  return [...code.matchAll(/"([^"\n]*)"|'([^'\n]*)'|`([^`\n]*)`|>([^<>{}\n]+)</g)].map((m) => (m[1] ?? m[2] ?? m[3] ?? m[4]).replace(/\$\{[^}]*\}/g, "X"))
    .filter((s) => /[A-Za-z]{2,} [A-Za-z]{2,} [A-Za-z]{2,}/.test(s) && !/[;=]>|\)\)|\bconst\b|\breturn\b/.test(s));
}

// The rule itself, on lines the scan must and must not catch.
ok("QA-182 fail: a message saying boxes is caught", wordsOn(`fail(\`\${k} is not a form with boxes\`);`).some((s) => BAD.test(s)));
ok("QA-182 fail: on-screen text saying box is caught", wordsOn(`<p>Write it by hand in this box on the form.</p>`).some((s) => BAD.test(s)));
ok("QA-182 pass: a control of our own screens is not this rule", !wordsOn(`<Tip tip="Type in the search box to find a form field">`).some((s) => BAD.test(s)) && !wordsOn(`"Tick the check box to confirm the declaration"`).some((s) => BAD.test(s)));
ok("QA-182 fail: a plural or possessive built around a value is caught", BAD_RAW.test(`\`for the \${n} reworded box\${n === 1 ? "" : "es"} only\``) && BAD_RAW.test(`\`not one of that box's printed choices\``));
ok("QA-182 pass: comments and code identifiers are not read", !wordsOn(`// the boxes of the form are mapped here`).length && !wordsOn(`const boxes = fieldMap.boxes.filter((b) => b.on);`).some((s) => BAD.test(s)));

const walk = (d: string): string[] => readdirSync(d).flatMap((n) => { const f = join(d, n); return statSync(f).isDirectory() ? walk(f) : /\.(ts|tsx)$/.test(n) && !/\.test\.ts$/.test(n) ? [f] : []; });
const hits: string[] = [];
for (const dir of ["api/src", "engine", "contracts", "web/src"]) for (const f of walk(join(STUDIO, dir)))
  readFileSync(f, "utf8").split("\n").forEach((line, i) => {
    for (const s of wordsOn(line)) if (BAD.test(s)) hits.push(`${relative(STUDIO, f)}:${i + 1}: ${s.trim().slice(0, 110)}`);
    if (!/^\s*(\*|\/\*|\/\/)/.test(line) && BAD_RAW.test(line.replace(/\s\/\/ .*$/, ""))) hits.push(`${relative(STUDIO, f)}:${i + 1}: ${line.trim().slice(0, 110)}`);
  });
ok("QA-182 pass (P-63): no message the API, the engine, the contracts or the web app can show says box, boxes, box map or canonical", hits.length === 0, { count: hits.length });
for (const h of hits) console.log(`      ${h}`);
console.log(`${pass}/${pass + failed} passed`);
process.exit(failed ? 1 : 0);
