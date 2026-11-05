// C10.1 row 9 (Lead 10's ruling (c') on #1009; review M2, R2-1): the configured checkpoint's words while Visitor visa's
// release 2 waits for row B81 say the draft is left as released and come from the problems Submit would list for the
// family form (never fixed text): counted by kind, in plain words (no form field codes, none of the error words the C10.1
// pack refuses), and row B81 only for a value a form field has no code for. Offline (no database, no AI):
// api/src/checkpoint-words.ts. The 13 problems are the ones a fresh copy of the configured checkpoint gave on 5 Nov (11 with
// no code, 2 with no option map yet).
//   tsx studio/tests/check_c101_release_two_words.ts
import { releaseTwoWords, type Listed } from "../api/src/checkpoint-words.ts";

let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
const field = (words: string): Listed => ({ message: `Marital status: (person.marital_status): ${words}.` });
const FORM = { application: "IMM 5257", form: "IMM 5645" };
const problems: Listed[] = [
  ...[0, 1].map(() => field("it has no option map yet")),
  ...[0, 1, 2, 3].map(() => field('no code for "annulled_marriage", "common_law", "legally_separated", "unknown" (filling would refuse them)')),
  ...[0, 1, 2, 3, 4, 5, 6].map(() => field('no code for "unknown" (filling would refuse it)')),
];
const words = releaseTwoWords(FORM, problems);
ok("C10.1 row 9: every problem is counted (13), by kind (11 with no code for some values, 2 with no option map yet)", /13 problems/.test(words) && /11 form fields have no code/.test(words) && /2 have no option map yet/.test(words), words);
ok("C10.1 row 9: it names the form and says the draft is left as released, never that it holds release 2's changes", /IMM 5645's choice form fields/.test(words) && /left as released/.test(words) && !/keeps/.test(words));
ok("C10.1 row 9: it says what Submit would do, not that Submit refused", /Submit would refuse it/.test(words) && !/Submit refused/.test(words));
ok("C10.1 row 9: plain words for a person: no form field code, and none of the words the C10.1 pack refuses (Error, undefined, null, prisma, [0])", !/\[0\]|person\.|ChildMStatus|IMM_5645/.test(words) && !/Error|undefined|null|prisma|\[0\]/i.test(words), words);
ok("C10.1 row 9: a value a form field has no code for waits for row B81", /Waits for row B81/.test(words));
const other = releaseTwoWords(FORM, [{ message: "IMM 5645 reads a list nobody keeps." }]);
ok("C10.1 row 9 fail: another problem keeps its own words, is counted as itself and is never blamed on B81", /1 problem/.test(other) && /1 other problem: IMM 5645 reads a list nobody keeps/.test(other) && !/B81/.test(other) && !/choice form fields/.test(other), other);
const none = releaseTwoWords(FORM, []);
ok("C10.1 row 9 fail: no problem listed is said as none, with the draft still left as released, never a count", /shows no problem/.test(none) && /left as released/.test(none) && !/Submit would refuse/.test(none), none);
const unread = releaseTwoWords(FORM, null);
ok("C10.1 row 9 fail: a family form with no edition read is said so, and no count is made up", /no PDF edition read/.test(unread) && !/Submit would refuse/.test(unread), unread);

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
