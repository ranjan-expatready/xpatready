// C10.1 row 9 (Lead 10's ruling (c') on #1009; review M2, R2-1): the configured checkpoint's words when Visitor visa's
// release 2 is not made come from the refusal itself: for Submit, every problem in its errors[] (its text names only the
// first three, studio.ts refuse()), counted by kind, in plain words (no form field codes, none of the error words the
// C10.1 pack refuses), where the draft stands, and row B81 only for a value a box has no code for; for another step, that
// step and its own words. Offline (no database, no AI): api/src/checkpoint-words.ts. The 13 problems are the ones a
// fresh copy of the configured checkpoint gave on 5 Nov (11 with no code, 2 with no option map yet).
//   tsx studio/tests/check_c101_release_two_words.ts
import { RELEASE_TWO_CHANGES, releaseTwoWords, type Listed } from "../api/src/checkpoint-words.ts";

let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
const box = (path: string, words: string): Listed => ({ item: `IMM_5645[0].page1[0].${path}[0].ChildMStatus[0]`, message: `Marital status: (person.marital_status): ${words}` });
const errors: Listed[] = [
  box("SectionA[0].Father", "it has no option map yet"), box("SectionA[0].Mother", "it has no option map yet"),
  ...[0, 1, 2, 3].map((i) => box(`SectionB[0].Child[${i}]`, 'no code for "annulled_marriage", "common_law", "legally_separated", "unknown" (filling would refuse them)')),
  ...[0, 1, 2, 3, 4, 5, 6].map((i) => box(`SectionC[0].Child[${i}]`, 'no code for "unknown" (filling would refuse it)')),
];
// Submit's own text: the count, then only the first three problems (studio.ts refuse()).
const detail = `Fix ${errors.length} problems before submitting: ${errors.slice(0, 3).map((p) => p.message).join(" · ")}`;
const words = releaseTwoWords("submit", { detail, errors });
ok("C10.1 row 9: every problem Submit listed is counted (13), by kind (11 with no code for some values, 2 with no option map yet), from errors[], not the text that names 3", /13 problems/.test(words) && /11 form fields have no code/.test(words) && /2 have no option map yet/.test(words), words);
const fromText = releaseTwoWords("submit", { detail, errors: errors.slice(0, 3) });
ok("C10.1 row 9 fail: counting only the three the text names would say 3 (so the 13 above can only come from errors[])", /3 problems/.test(fromText) && !/13 problems/.test(fromText), fromText);
ok("C10.1 row 9: it names the form and says where the draft stands, not submitted", /IMM 5645's choice form fields/.test(words) && words.includes(RELEASE_TWO_CHANGES) && /not submitted/.test(words));
ok("C10.1 row 9: plain words for a person: no form field code, and none of the words the C10.1 pack refuses (Error, undefined, null, prisma, [0])", !/\[0\]|person\.|ChildMStatus|IMM_5645/.test(words) && !/Error|undefined|null|prisma|\[0\]/i.test(words), words);
ok("C10.1 row 9: a value a box has no code for waits for row B81", /Waits for row B81/.test(words));
const other = releaseTwoWords("submit", { detail: "Fix 1 problem before submitting: IMM 5476 is filed as PDF upload, signed by hand and scanned, but nobody signs it.", errors: [{ item: "IMM 5476", message: "IMM 5476 is filed as PDF upload, signed by hand and scanned, but nobody signs it." }] });
ok("C10.1 row 9 fail: another problem keeps its own words, is counted as itself and is never blamed on B81", /1 problem/.test(other) && /1 other problem: IMM 5476 is filed as PDF upload/.test(other) && !/B81/.test(other) && !/choice form fields/.test(other), other);
const signoff = releaseTwoWords("signoff", { detail: "This change is already signed." });
ok("C10.1 row 9 fail: a step after Submit is named, with its own words, and never said to be Submit's refusal or an unsubmitted draft", /the SME's sign-off refused it: This change is already signed\./.test(signoff) && !/Submit refused/.test(signoff) && !/not submitted/.test(signoff), signoff);
const forms = releaseTwoWords("forms", { detail: "IMM 5645 is retired in the library: restore it there first." });
ok("C10.1 row 9 fail: a step before Submit is named, with its own words", /setting release 2's channels and forms on the Forms tab refused it: IMM 5645 is retired/.test(forms) && !/Submit refused/.test(forms), forms);

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
