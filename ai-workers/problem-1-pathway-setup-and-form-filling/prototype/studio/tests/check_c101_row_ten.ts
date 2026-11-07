// C10.1 row 10 (Lead 14's ruling on #1052, option A): a combination with forms that the loader could not release keeps
// row 10 partial; a combination with no form on it (the six's Corporate sample, P-239) does not, and is still named in the
// row's words, in its own sentence. Offline (no database, no AI): api/src/checkpoint-words.ts releaseRowTen. The real
// load is proved by check_c10_1_configured.ts and the C10.1 pack.
//   tsx studio/tests/check_c101_row_ten.ts
import { releaseRowTen } from "../api/src/checkpoint-words.ts";

let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
const released = ["Visitors › Visitor visa", "Family sponsorship › Spouse or common-law partner"];
const formless = "Labour market impact assessment › High-wage position";
const refusedOne = "Provincial nominees › Express Entry stream: Fix 3 problems before submitting: …";

const today = releaseRowTen(released, [], [formless]);
ok("C10.1 row 10 pass: every combination with forms released, the formless one left: done", today.status === "done", today);
ok("C10.1 row 10 fail-guard: the formless combination is still named in the row's words when the row reads done, in its own sentence", today.why === `${formless}: not submitted, no form is on it yet (the form finder has no saved answer for its canada.ca page, or none was confirmed).`, today.why);
const both = releaseRowTen(released, [refusedOne], [formless]);
ok("C10.1 row 10 fail: a combination with forms that is refused makes the row partial, a formless one beside it or not", both.status === "partial" && releaseRowTen(released, [refusedOne], []).status === "partial", both);
ok("C10.1 row 10 fail: the refusal's own words and the formless sentence are both said, apart", both.why === `${refusedOne} · ${formless}: not submitted, no form is on it yet (the form finder has no saved answer for its canada.ca page, or none was confirmed).`, both.why);
const none = releaseRowTen([], [refusedOne], [formless]);
ok("C10.1 row 10 fail: nothing released is waiting, never done, even when the only others have no form", none.status === "waiting" && releaseRowTen([], [], [formless]).status === "waiting" && none.shows === "No combination can be released yet", none);
ok("C10.1 row 10 pass: all released and nothing left: done, with no words to add", JSON.stringify(releaseRowTen(released, [], [])) === JSON.stringify({ status: "done", shows: `Release 1 of ${released.join(", ")}`, why: null }));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
