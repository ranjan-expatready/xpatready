// UX-A part 2 (Devin review on #616): a To review setup row's words count the released version's problems apart from
// the draft's, so a Not ready combination whose draft is clean never reads a bare "." with no count. Pure rules: no
// server, no database, no model call (US$0).
//   tsx studio/tests/check_uxa2_row_words_rules.ts
import { releasedProblems, setupRowWords } from "../api/src/review-queue.ts";

let pass = 0, fail = 0;
const ok = (name: string, cond: boolean, detail?: unknown) => { cond ? pass++ : fail++; console.log(`${cond ? "PASS" : "FAIL"}  UX-A2 rows: ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 220)}` : ""}`); };
const fix = (count: number, fromRelease: boolean) => ({ kind: "fix_problems", count, fromRelease });
const setup = (...open: { kind: string; count: number; fromRelease?: boolean }[]) => ({ steps: [{ open }] });

// Fail case (the finding): the released version has 2 problems, the draft none.
const relOnly = { live: true, blockers: { n: 0, first: null }, setup: setup(fix(2, true)) };
const w1 = setupRowWords(relOnly, null);
ok("fail case: only the released version has problems: the row says how many and why it matters, never a bare \".\"", w1 === "2 problems in the released version: firms cannot open cases until they are fixed.", w1);
ok("the released count reads the fix items marked fromRelease only", releasedProblems(setup(fix(2, true), fix(3, false), { kind: "unasked", count: 1 })) === 2);

// Pass: the draft's blockers as before, with the first one named.
const draftOnly = { live: false, blockers: { n: 3, first: "IMM 5257: no edition" }, setup: setup(fix(3, false)) };
ok("pass: a draft's blockers read as before", setupRowWords(draftOnly, "Next step · Forms: Add a form") === "3 problems to fix before release (first: IMM 5257: no edition). Next step · Forms: Add a form.");

// Both: each said apart, released first.
const both = { live: true, blockers: { n: 1, first: null }, setup: setup(fix(2, true), fix(1, false)) };
ok("pass: released and draft problems are said apart", setupRowWords(both, null) === "2 problems in the released version: firms cannot open cases until they are fixed. 1 problem to fix before release of its next version.", setupRowWords(both, null));

// Nothing to say: a short sentence, never ".".
ok("fail case: nothing counted and no next step a screen offers: never a bare \".\"", setupRowWords({ live: false, blockers: { n: 0, first: null }, setup: setup() }, null) === "Open its setup to see what is left.");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
