// UX-A part 3 (P-273; contracts/status-words.ts): the shared draft bar's words, a pass and a fail case each (review round 2
// M1: the bar counted a library change into "N changes across 1 combination", one more than that combination's header).
// No server, no database, no model call (US$0).
//   tsx studio/tests/check_uxa3_words_rules.ts
import { draftBarWords, STATE_WORDS, STATUS_WORDS } from "../contracts/status-words.ts";

let pass = 0, fail = 0;
const ok = (name: string, cond: boolean, detail?: unknown) => { cond ? pass++ : fail++; console.log(`${cond ? "PASS" : "FAIL"}  UX-A3: ${name}${detail !== undefined ? ` — ${JSON.stringify(detail)}` : ""}`); };

ok("bar pass: one combination's changes read as that combination's count", draftBarWords(72, 1, 0) === "72 changes across 1 combination");
ok("bar fail case (review r2 M1): a library change is never counted into the combinations' number", draftBarWords(73, 1, 1) === "72 changes across 1 combination · 1 in the shared library", draftBarWords(73, 1, 1));
ok("bar pass: library-only reads as the shared library's (never \"across 0 combinations\")", draftBarWords(1, 0, 1) === "1 change in the shared library, released with the next release");
ok("bar pass: plurals", draftBarWords(1, 1, 0) === "1 change across 1 combination" && draftBarWords(5, 2, 2) === "3 changes across 2 combinations · 2 in the shared library");
ok("words: P-180's chip words, In progress for a combination in setup", STATUS_WORDS.IN_SETUP === "In progress" && STATE_WORDS.NOT_STARTED === "Not started" && STATUS_WORDS.READY === "Live" && STATE_WORDS.RETIRED === "Retired");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
