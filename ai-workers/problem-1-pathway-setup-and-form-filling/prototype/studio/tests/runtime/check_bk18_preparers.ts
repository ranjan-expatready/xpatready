// BK-18 (QA-448, from qa's walk 1 step S8 W5; P-525 (1), P-510 (4), P-154, P-155 (1)): engine/runtime/preparers.ts —
// who really prepared a case's filings, and what the filing's record says. Each rule has a passing and a failing case.
// Proves C7.6's record and C8.3's BR-8 author rule. No database, no server, no model call (US$0). Sample values only.
//   tsx studio/tests/runtime/check_bk18_preparers.ts
import { authorsFor, behindOf, ownTypingLeftToForms, preparersOf, reviewRecordOf } from "../../engine/runtime/preparers.ts";
import { selfReviewOf } from "../../engine/runtime/review.ts";
import { recordedPeople } from "../../engine/runtime/submission-record.ts";
import { recorder } from "./api.ts";

const { ok, summary } = recorder();
const REP = "user-R", OFF = "user-O", REP2 = "user-T", CLIENT = "user-P", AUTHOR = "user-A";
const staff = (id: string) => [REP, OFF, REP2].includes(id);
const at = (m: number) => new Date(`2026-11-13T10:${String(m).padStart(2, "0")}:00Z`);

// C7.6 / C8.3: who prepared it — the work record, never the case team.
ok("C7.6 BK-18 pass: the people whose work the case holds are its preparers, earliest act first",
  preparersOf([{ actor: OFF, at: at(5) }, { actor: REP, at: at(1) }, { actor: REP, at: at(9) }], staff).join() === `${REP},${OFF}`);
ok("C7.6 BK-18 fail (QA-448): a case officer named on the team who did nothing is not a preparer — only acts count",
  preparersOf([{ actor: REP, at: at(1) }], staff).join() === REP);
ok("C7.6 BK-18 fail: the client's own answers and a configuration person's acts are never the firm's preparation (P-242)",
  preparersOf([{ actor: CLIENT, at: at(1) }, { actor: AUTHOR, at: at(2) }, { actor: REP, at: at(3) }], staff).join() === REP);
ok("C7.6 BK-18 pass: a case nobody's work names has no preparer (never guessed from the case team)",
  preparersOf([{ actor: CLIENT, at: at(1) }], staff).length === 0);
ok("C7.6 BK-18 pass: an act with no time still counts, and each person is named once",
  preparersOf([{ actor: OFF, at: null }, { actor: OFF, at: at(4) }], staff).join() === OFF);

// C7.6 (review 2 B1, M1): opening a case and sending a filing for review never name a preparer.
const opened = { actor: OFF, at: at(1), weak: true };
ok("C7.6 BK-18 fail (review B1, M1): a person who only opened the case is not its preparer when somebody else did the work",
  preparersOf([opened, { actor: REP, at: at(6) }], staff).join() === REP);
ok("C7.6 BK-18 fail (review 2 B1): a person who only opened the case is named as preparer by nobody, however little the rest did",
  preparersOf([opened], staff).length === 0 && behindOf([opened], staff).join() === OFF);
ok("C7.6 BK-18 fail: a representative who only sent a filing another person prepared is not its preparer (never refused as a second person)",
  preparersOf([{ actor: OFF, at: at(2) }, { actor: REP, at: at(8), weak: true }], staff).join() === OFF);
ok("C7.6 BK-18 pass: a weak act and real work by the same person name them once, by their real act",
  preparersOf([opened, { actor: OFF, at: at(9) }], staff).join() === OFF);
ok("C7.6 BK-18 pass (walk 1 S8): with nobody's work on the case, a review by the person who opened it and sent it for review is their own",
  reviewRecordOf({ preparers: [], behind: [REP], reviewedBy: REP, kind: "reviewed" }).self === true);
ok("C7.6 BK-18 fail (review 2 B1): with nobody's work on the case, a review by someone who did not stand behind it names no preparer",
  JSON.stringify(reviewRecordOf({ preparers: [], behind: [OFF], reviewedBy: REP, kind: "reviewed" })) === JSON.stringify({ self: false, preparedBy: [] }));

// C8.3 BR-8 (review 2 M1): what counts as this person's own authorship.
ok("C8.3 BK-18 pass (review 2 M1): with nobody's work on the case, the person who stood behind it is its only author — never a second person's refusal",
  [...authorsFor(REP, [], [REP, OFF])].join() === REP && authorsFor(OFF, [], [REP]).size === 0);
ok("C8.3 BK-18 pass: once somebody really worked on it, only the real work counts",
  [...authorsFor(REP, [OFF], [REP])].join() === OFF);

// C7.6 (review B2, breaker B3): the record says what was true when the review was made.
const after = [{ actor: REP, at: at(10) }, { actor: OFF, at: at(30) }];
ok("C7.6 BK-18 fail (review B2): work done after the review never joins the record that review made",
  preparersOf(after, staff, at(20)).join() === REP && reviewRecordOf({ preparers: preparersOf(after, staff, at(20)), reviewedBy: REP, kind: "self_reviewed" }).self === true);
ok("C7.6 BK-18 pass: with no moment given, the record names everyone who has worked on it",
  preparersOf(after, staff).join() === `${REP},${OFF}`);
ok("C7.6 BK-18 pass: a person who worked both before and after the review is named by their first act",
  preparersOf([{ actor: OFF, at: at(5) }, { actor: OFF, at: at(40) }], staff, at(20)).join() === OFF);

// C7.6: what the record says.
ok("C7.6 BK-18 pass (P-510 (4), P-154): the one person who prepared it and reviewed it reads Self-reviewed, nobody else named",
  JSON.stringify(reviewRecordOf({ preparers: [REP], reviewedBy: REP, kind: "reviewed" })) === JSON.stringify({ self: true, preparedBy: [] }));
ok("C7.6 BK-18 fail (QA-448, walk 1 S8): a record never shows a second person's review when one person did the work",
  reviewRecordOf({ preparers: [REP], reviewedBy: REP, kind: "reviewed" }).preparedBy.includes(OFF) === false);
ok("C7.6 BK-18 pass: two people who worked on it are both named, the reviewer among them, and it is not a self-review",
  JSON.stringify(reviewRecordOf({ preparers: [OFF, REP], reviewedBy: REP, kind: "reviewed" })) === JSON.stringify({ self: false, preparedBy: [OFF, REP] }));
ok("C7.6 BK-18 pass: the case officer who prepared it and the representative who reviewed it read as two people",
  JSON.stringify(reviewRecordOf({ preparers: [OFF], reviewedBy: REP, kind: "reviewed" })) === JSON.stringify({ self: false, preparedBy: [OFF] }));
ok("C7.6 BK-18 pass (P-155 (1)): a review logged with the representative's own statement, on a case holding nobody else's work, reads Self-reviewed",
  reviewRecordOf({ preparers: [], reviewedBy: REP, kind: "self_reviewed" }).self === true);
ok("C7.6 BK-18 fail (review B2): a review logged Self-reviewed never hides a second person the work record names",
  reviewRecordOf({ preparers: [OFF, REP], reviewedBy: REP, kind: "self_reviewed" }).self === false);
ok("C7.6 BK-18 fail: nobody recorded as preparing it is not read as a self-review",
  reviewRecordOf({ preparers: [], reviewedBy: REP, kind: "reviewed" }).self === false);

// C8.3 BR-8 with the work record (api/src/readiness.ts and api/src/review-rounds.ts pass it in).
ok("C8.3 BK-18 pass (walk 1 S8): the representative who did the work, with a case officer on the team who did nothing, is asked for the statement, then logged Self-reviewed",
  (selfReviewOf({ actor: REP, prepared: new Set([REP]), solo: false, changedByReviewer: false, self: undefined }) as { problem: { status: number } }).problem.status === 400
  && JSON.stringify(selfReviewOf({ actor: REP, prepared: new Set([REP]), solo: false, changedByReviewer: false, self: true })) === JSON.stringify({ kind: "self_reviewed" }));
ok("C8.3 BK-18 fail (N4 stands): a representative whose case officer really worked on it too cannot review it as a second person (409)",
  (selfReviewOf({ actor: REP, prepared: new Set([REP, OFF]), solo: false, changedByReviewer: false, self: true }) as { problem: { status: number } }).problem.status === 409);
ok("C8.3 BK-18 pass: the representative who prepared nothing reviews it as a second person",
  JSON.stringify(selfReviewOf({ actor: REP2, prepared: new Set([OFF]), solo: false, changedByReviewer: false, self: undefined })) === JSON.stringify({ kind: "reviewed" }));

// C8.2 (breaker B4): the recorded filing names the same preparer as Ready to file.
const REVIEW = { by: REP, kind: "reviewed", at: at(20) };
const team = [{ userId: OFF, role: "OFFICER", assignedAt: at(1), endedAt: null, id: "m1" }];
ok("C8.2 BK-18 pass (breaker B4): the recorded filing names the person the work record names, not a case officer who did nothing",
  recordedPeople(REVIEW, team, REP, at(50), [REP2]).preparedBy === REP2);
ok("C8.2 BK-18 fail: the reviewer is never named as the other person who prepared it when someone else did the work",
  recordedPeople(REVIEW, team, REP, at(50), [REP, REP2]).preparedBy === REP2);
ok("C8.2 BK-18 pass: with nobody's work on the case the earlier rule stands (QA-295: the case team's officer)",
  recordedPeople(REVIEW, team, REP, at(50), []).preparedBy === OFF);

// C8.3 BR-8 (#1691's merge check, C8.3-18): the reviewer's own typing since the round's base is judged form by form
// (changedByReviewer), never case-wide; their earlier typing, their other work and everyone else's still count.
const SENT = at(20), RE = [{ actor: OFF, at: at(2), fact: true }, { actor: REP, at: at(25), fact: true }];
const authorsAt = (acts: typeof RE, since: Date | null) => { const a = ownTypingLeftToForms(acts, REP, since); return authorsFor(REP, preparersOf(a, staff), behindOf(a, staff)); };
ok("C8.3 BK-18 pass (C8.3-18): a fact the representative typed after the round's base (on another filing of the case) leaves them no author: the officer's change is re-approved as a second person's",
  !authorsAt(RE, SENT).has(REP) && "kind" in selfReviewOf({ actor: REP, prepared: authorsAt(RE, SENT), solo: false, changedByReviewer: false, self: undefined, after: "approval" }));
ok("C8.3 BK-18 fail: without the base (C7.6's one-step route) the same typing is case-wide work: the representative is an author with the officer (409)",
  authorsAt(RE, null).has(REP) && "problem" in selfReviewOf({ actor: REP, prepared: authorsAt(RE, null), solo: false, changedByReviewer: false, self: true }));
ok("C8.3 BK-18 fail (13b): typing before the base still counts case-wide: author with the officer",
  authorsAt([{ actor: OFF, at: at(2), fact: true }, { actor: REP, at: at(15), fact: true }], SENT).has(REP));
ok("C8.3 BK-18 fail: only the reviewer's own typing is left to the forms — their other work after the base, and the officer's typing after it, still count",
  authorsAt([{ actor: OFF, at: at(2), fact: true }, { actor: REP, at: at(25) }], SENT).has(REP) && preparersOf(ownTypingLeftToForms([{ actor: OFF, at: at(25), fact: true }], REP, SENT), staff).join() === OFF);

process.exit(summary() ? 1 : 0);
