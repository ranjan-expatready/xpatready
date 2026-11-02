// C11.8 (P-110): a failed field-map run says what went wrong in words, and names its latest attempt (review m4). The
// pure parts of the run view (api/src/run-words.ts). A passing and a failing case per rule. No server, no database, US$0.
//   C11.8 a failed run's error line is the step's own words, never only a count or "see the details"
//   cd prototype/studio && npx tsx tests/check_forms_c118_words.ts
// (by hand: tsx --tsconfig studio/api/tsconfig.json …, as run-suites.sh does)
import { errorWhat, latestFailed } from "../api/src/run-words.ts";

let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };

const step = { label: "AI drafts the form's field map", message: "The stand-in launcher's stub step failed on purpose." };
const count = "0 done, 1 failed, 0 cancelled · spent US$0.00";
ok("C11.8 AT-3 fail: a run whose message is only a count says the failed step's own words, with its name", errorWhat(count, step) === `${step.label}: ${step.message}`, errorWhat(count, step));
ok("C11.8 AT-3 pass: a run with its own words keeps them", errorWhat("Stopped by a person: nothing was sent.", step) === "Stopped by a person: nothing was sent.");
ok("C11.8 AT-3 fail: the run's message repeating the step's is not said twice", errorWhat(step.message, step) === `${step.label}: ${step.message}`);
ok("C11.8 AT-3 fail: a step with no words says it did not finish, never only \"see the details\"", /did not finish/.test(errorWhat(null, { label: step.label, message: null })) && !/see the details/i.test(errorWhat(null, { label: step.label, message: null })));

// One form, two attempts: attempt 1 failed, attempt 2 failed with other words → attempt 2's words.
const jobs = [{ attachmentId: "a", kind: "field_map", attempt: 1 }, { attachmentId: "a", kind: "field_map", attempt: 2 }];
const steps = [{ status: "FAILED", message: "attempt 1" }, { status: "FAILED", message: "attempt 2" }];
ok("C11.8 review m4 pass: after a retry the run names its latest attempt's failure (before: attempt 1's)", latestFailed(jobs, steps)?.message === "attempt 2", latestFailed(jobs, steps));
ok("C11.8 review m4 fail: a failure whose retry then finished is no error of the run", latestFailed(jobs, [{ status: "FAILED", message: "attempt 1" }, { status: "COMPLETED", message: "done" }]) === undefined);
// Two forms: one done, the other failed → the failed one.
ok("C11.8 review m4 pass: with two forms, the one whose latest attempt failed is named", latestFailed([{ attachmentId: "a", kind: "field_map", attempt: 1 }, { attachmentId: "b", kind: "field_map", attempt: 1 }], [{ status: "COMPLETED" }, { status: "NEEDS_PERSON" }])?.status === "NEEDS_PERSON");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
