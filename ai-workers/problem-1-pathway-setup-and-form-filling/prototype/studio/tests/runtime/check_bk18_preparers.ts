// BK-18 (QA-448, from qa's walk 1 step S8 W5; P-525 (1), P-510 (4), P-154, P-155 (1)): engine/runtime/preparers.ts —
// who really prepared a case's filings, and what the filing's record says. Each rule has a passing and a failing case.
// No database, no server, no model call (US$0). Sample values only.
//   tsx studio/tests/runtime/check_bk18_preparers.ts
import { preparersOf, reviewRecordOf } from "../../engine/runtime/preparers.ts";
import { selfReviewOf } from "../../engine/runtime/review.ts";
import { recorder } from "./api.ts";

const { ok, summary } = recorder();
const REP = "user-R", OFF = "user-O", REP2 = "user-T", CLIENT = "user-P", AUTHOR = "user-A";
const staff = (id: string) => [REP, OFF, REP2].includes(id);
const at = (m: number) => new Date(`2026-11-13T10:${String(m).padStart(2, "0")}:00Z`);

// Who prepared it: the work record, never the case team.
ok("BK-18 pass: the people whose work the case holds are its preparers, earliest act first",
  preparersOf([{ actor: OFF, at: at(5) }, { actor: REP, at: at(1) }, { actor: REP, at: at(9) }], staff).join() === `${REP},${OFF}`);
ok("BK-18 fail (QA-448): a case officer named on the team who did nothing is not a preparer — only acts count",
  preparersOf([{ actor: REP, at: at(1) }], staff).join() === REP);
ok("BK-18 fail: the client's own answers and a configuration person's acts are never the firm's preparation (P-242)",
  preparersOf([{ actor: CLIENT, at: at(1) }, { actor: AUTHOR, at: at(2) }, { actor: REP, at: at(3) }], staff).join() === REP);
ok("BK-18 pass: a case nobody's work names has no preparer (never guessed from the case team)",
  preparersOf([{ actor: CLIENT, at: at(1) }], staff).length === 0);
ok("BK-18 pass: an act with no time still counts, and each person is named once",
  preparersOf([{ actor: OFF, at: null }, { actor: OFF, at: at(4) }], staff).join() === OFF);

// What the record says.
ok("BK-18 pass (P-510 (4), P-154): the one person who prepared it and reviewed it reads Self-reviewed, nobody else named",
  JSON.stringify(reviewRecordOf({ preparers: [REP], reviewedBy: REP, kind: "reviewed" })) === JSON.stringify({ self: true, preparedBy: [] }));
ok("BK-18 fail (QA-448, walk 1 S8): a record never shows a second person's review when one person did the work",
  reviewRecordOf({ preparers: [REP], reviewedBy: REP, kind: "reviewed" }).preparedBy.includes(OFF) === false);
ok("BK-18 pass: two people who worked on it are both named, the reviewer among them, and it is not a self-review",
  JSON.stringify(reviewRecordOf({ preparers: [OFF, REP], reviewedBy: REP, kind: "reviewed" })) === JSON.stringify({ self: false, preparedBy: [OFF, REP] }));
ok("BK-18 pass: the case officer who prepared it and the representative who reviewed it read as two people",
  JSON.stringify(reviewRecordOf({ preparers: [OFF], reviewedBy: REP, kind: "reviewed" })) === JSON.stringify({ self: false, preparedBy: [OFF] }));
ok("BK-18 pass (P-155 (1)): a review logged with the representative's own statement reads Self-reviewed even when the case holds no work of theirs",
  reviewRecordOf({ preparers: [], reviewedBy: REP, kind: "self_reviewed" }).self === true);
ok("BK-18 fail: nobody recorded as preparing it is not read as a self-review",
  reviewRecordOf({ preparers: [], reviewedBy: REP, kind: "reviewed" }).self === false);

// BR-8 with the work record (api/src/readiness.ts, api/src/review-rounds.ts pass it in).
ok("BK-18 pass (walk 1 S8): the representative who did the work, with a case officer on the team who did nothing, is asked for the statement, then logged Self-reviewed",
  (selfReviewOf({ actor: REP, prepared: new Set([REP]), solo: false, changedByReviewer: false, self: undefined }) as { problem: { status: number } }).problem.status === 400
  && JSON.stringify(selfReviewOf({ actor: REP, prepared: new Set([REP]), solo: false, changedByReviewer: false, self: true })) === JSON.stringify({ kind: "self_reviewed" }));
ok("BK-18 fail (N4 stands): a representative whose case officer really worked on it too cannot review it as a second person (409)",
  (selfReviewOf({ actor: REP, prepared: new Set([REP, OFF]), solo: false, changedByReviewer: false, self: true }) as { problem: { status: number } }).problem.status === 409);
ok("BK-18 pass: the representative who prepared nothing reviews it as a second person",
  JSON.stringify(selfReviewOf({ actor: REP2, prepared: new Set([OFF]), solo: false, changedByReviewer: false, self: undefined })) === JSON.stringify({ kind: "reviewed" }));

process.exit(summary() ? 1 : 0);
