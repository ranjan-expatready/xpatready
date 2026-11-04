// C10.1 row 9 (Lead 10's ruling (c') on #1009; review M2): the configured checkpoint's words when Submit refuses Visitor
// visa's release 2 come from the refusal itself, in plain words for a person (no form field codes, none of the error
// words the C10.1 pack refuses), say where the draft stands, and name row B81 only for a value a box has no code for.
// Offline (no database, no AI): api/src/checkpoint-words.ts. The refusal below is the one a fresh copy gave on 5 Nov.
//   tsx studio/tests/check_c101_release_two_words.ts
import { refusalProblems, releaseTwoWords, RELEASE_TWO_CHANGES } from "../api/src/checkpoint-words.ts";

let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
const box = (path: string, words: string) => `IMM_5645[0].page1[0].${path}[0].ChildMStatus[0]: Marital status: (person.marital_status): ${words}.`;
const refusal = `Fix 13 problems before submitting: ${[
  box("SectionA[0].Father", "it has no option map yet"), box("SectionA[0].Mother", "it has no option map yet"),
  ...[0, 1, 2, 3].map((i) => box(`SectionB[0].Child[${i}]`, 'no code for "annulled_marriage", "common_law", "legally_separated", "unknown" (filling would refuse them)')),
  ...[0, 1, 2, 3, 4, 5, 6].map((i) => box(`SectionC[0].Child[${i}]`, 'no code for "unknown" (filling would refuse it)')),
].join(" · ")}`;
const words = releaseTwoWords(refusal);
ok("C10.1 row 9: the refusal's own 13 problems are counted, by kind (11 with no code for some values, 2 with no option map yet)", refusalProblems(refusal).length === 13 && /13 problems/.test(words) && /11 form fields have no code/.test(words) && /2 have no option map yet/.test(words), words);
ok("C10.1 row 9: it names the form and says where the draft stands, not submitted", /IMM 5645's choice boxes/.test(words) && words.includes(RELEASE_TWO_CHANGES) && /not submitted/.test(words));
ok("C10.1 row 9: plain words for a person: no form field code, and none of the words the C10.1 pack refuses (Error, undefined, null, prisma, [0])", !/\[0\]|person\.|ChildMStatus|IMM_5645/.test(words) && !/Error|undefined|null|prisma|\[0\]/i.test(words), words);
ok("C10.1 row 9: a value a box has no code for waits for row B81", /Waits for row B81/.test(words));
const other = releaseTwoWords("Fix 1 problem before submitting: IMM 5476 is filed as PDF upload, signed by hand and scanned, but \"Signed by\" says nobody.");
ok("C10.1 row 9 fail: another refusal is counted as itself and never blamed on B81", /1 problem/.test(other) && /1 other problem/.test(other) && !/B81/.test(other), other);
const plain = releaseTwoWords("Release 2 is refused: something unexpected.");
ok("C10.1 row 9 fail: a refusal without the usual heading is still one problem, never zero", /1 problem/.test(plain), plain);

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
