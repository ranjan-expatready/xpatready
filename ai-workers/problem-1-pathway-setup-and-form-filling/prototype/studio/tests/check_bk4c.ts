// BK-4c (P-447 (2), P-456 (3), P-484; product/screens/BK-4-sign-in-hand-offs/concept.md §5 "4c", §8): hand-offs where case
// work changes hands. Reads the source only: no server, no database, no model call (US$0). The browser walk is
// check_bk4c_browser.cjs. Concept §8: 4c guards its own scope, web/src/runtime/.
// (1) The case area changes the person by one hand-off button (runtime/hand-off.tsx) besides BK-4a's two BR-8 places;
//     no runtime file names a person by a literal id in a person change, and no "switch to" or "Act as" words are left.
// (2) BR-7 and build notes 4a: the hand-off is a button; a modified click (Ctrl, Cmd, Shift, Alt) changes nobody
//     (plainClick, as the frame's links); it moves after the change (BR-4).
// (3) Each hand-off of the concept is wired: the case page and the questionnaire address to the case's own client with
//     ?from=; the client's "Every part is answered" back to `from` (a firm person only, never on a person's own link);
//     the readiness panel to the representative of record while a round waits, not on a solo firm.
//   tsx --tsconfig api/tsconfig.json tests/check_bk4c.ts
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { personOf } from "../web/src/lib/simulated-people.ts";

const RUNTIME = join(dirname(fileURLToPath(import.meta.url)), "..", "web/src/runtime");
let pass = 0, failed = 0;
const ok = (name: string, cond: boolean, detail?: unknown) => { if (cond) pass++; else failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${name}${cond || detail === undefined ? "" : ` — ${JSON.stringify(detail)}`}`); };
const read = (f: string) => readFileSync(join(RUNTIME, f), "utf8");
const files = readdirSync(RUNTIME).filter((f) => /\.tsx?$/.test(f));

// (1)
const literal = files.filter((f) => /setActor\(\s*["'`]/.test(read(f)));
ok("BK-4c (1): no runtime file changes the person to a literal id (targets come from data)", literal.length === 0, literal);
const sites = Object.fromEntries(files.map((f) => [f, (read(f).match(/\bsetActor\(/g) ?? []).length]).filter(([, n]) => n));
ok("BK-4c (1): in the case area only the hand-off button and BK-4a's two BR-8 places change the person", JSON.stringify(sites) === JSON.stringify({ "cases.tsx": 2, "hand-off.tsx": 1 }), sites);
const words = files.filter((f) => /switch to|"Act as|>Act as|Open it as/i.test(read(f).replace(/\/\/.*$/gm, "")));
ok("BK-4c (1): no \"switch to\", \"Act as\" or \"Open it as\" words left in the case area (comments aside)", words.length === 0, words);
// (1) fail side: the same reading catches a literal id.
ok("BK-4c (1) fail side: a literal person change is caught by the same reading", /setActor\(\s*["'`]/.test('onClick={() => setActor("user-P")}'));

// (2)
const h = read("hand-off.tsx");
ok("BK-4c (2): the hand-off is a Button (BR-7), not a link", /<Button[^>]*data-handoff-button|data-handoff-button/.test(h) && !/<Link\b/.test(h));
ok("BK-4c (2): a modified click changes nobody (plainClick guards the change), then it moves", /if \(!plainClick\(e\)\) return;\s+if \(handsCase\) rememberFrom\(handsCase\.caseId, handsCase\.from\);[\s\S]{0,250}React\.startTransition\(\(\) => \{ setActor\(p\.id\); nav\(go\); \}\);/.test(h));
ok("BK-4c (2), review m2: the tip shows on keyboard focus too (a Tooltip, not only a title)", /<TooltipTrigger asChild>/.test(h) && !/title=\{`You act as/.test(h));
ok("BK-4c (2): the button names the person and says Simulated", /Hand to \$\{who\} \(simulated\)/.test(h));
ok("BK-4c: a client is named, a role reads with \"the\"; an unknown id names nobody (no button)", /return p\.group === "client" \? p\.name : `the \$\{p\.name\}`;/.test(h) && /if \(!p\) return null;/.test(h) && personOf("user-Q")?.group === "client" && personOf("user-Z") === undefined);

// (3)
const cases = read("cases.tsx"), q = read("questionnaire.tsx"), r = read("readiness.tsx");
ok("BK-4c (3): the case page hands to the case's own client with ?from=<who hands over>", /const handToClient = \{ to: c\.client, go: `\/cases\/\$\{c\.id\}\/questionnaire\?from=\$\{encodeURIComponent\(actor\)\}`, handsCase: \{ caseId: c\.id, from: actor \}/.test(cases) && /<HandOff[^>]*\{\.\.\.handToClient\}/.test(cases));
ok("BK-4c (3), break M1: on the case page \"Next: <client>\" only while required answers are owed and no round waits (no second Next)", /cardState === "in-review" && inReview \? <p[^>]*data-client-card="in-review"/.test(cases) && /cardState === "client-answers" \? <div data-client-card="client-answers"><HandOff[^>]*next=\{/.test(cases) && /line=\{<>\{client\.name\} has answered every part/.test(cases)); // QA-427: what the client owes, from their own questionnaire
ok("BK-4c (3): the questionnaire address hands to the case's own client (was a literal \"Act as Client A\")", /<HandOff[^>]*to=\{view\.data\.case\.client\}/.test(cases));
ok("BK-4c (3), review m3: the client hands back to `from` only when it is a firm person who handed it over in this tab, never on a person's own link", /\{!link && from && isFirmStaff\(from\) && handedFrom\(view\.case\.id\) === from \? <HandOff[^>]*to=\{from\} go=\{`\/cases\/\$\{view\.case\.id\}`\}/.test(q));
ok("BK-4c review m4: a client back on the officer's page returns to the questionnaire with who handed it over", /handedFrom\(id!\)[\s\S]{0,200}questionnaire\$\{from \? `\?from=/.test(cases));
ok("BK-4c (3): moving between parts keeps `from`", /\.\.\.\(from \? \{ from \} : \{\}\)/.test(q));
ok("BK-4c (3): the representative hand-off shows while a round waits and the representative is someone else (solo: none)", /const handTo = rep && rep !== actor && waiting \? rep : null;/.test(r) && /<HandOff[^>]*to=\{handTo\} go=\{`\/cases\/\$\{caseId\}\/representative-review\/\$\{waiting\.id\}`\}/.test(r));

console.log(`\n${pass} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
