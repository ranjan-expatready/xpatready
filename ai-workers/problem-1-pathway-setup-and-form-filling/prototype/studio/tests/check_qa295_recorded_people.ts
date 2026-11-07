// QA-295 (row B126; P-155 (1)): who a filing record names as having prepared and reviewed a filing (engine/runtime/
// submission-record.ts recordedPeople, used by api/src/submission.ts), whoever records it. The review given is the one
// that counts for Ready to file (readiness), or none. Each rule with a passing and a failing case. Pure: no server. US$0.
//   tsx studio/tests/check_qa295_recorded_people.ts
import { recordedPeople } from "../engine/runtime/submission-record.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const t = (h: number) => new Date(Date.UTC(2026, 10, 7, h));
const member = (userId: string, role: string, from: number, to: number | null = null, id = userId) => ({ userId, role, assignedAt: t(from), endedAt: to === null ? null : t(to), id });
const team = [member("user-R", "LEAD_REPRESENTATIVE", 1), member("user-O", "OFFICER", 1)];
const reviewed = { by: "user-R", kind: "reviewed", at: t(5).toISOString() };
const NOW = t(9);
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

ok("QA-295 pass: the representative records a filing the officer prepared and the representative reviewed: Officer · Representative",
  eq(recordedPeople(reviewed, team, "user-R", NOW), { preparedBy: "user-O", reviewedBy: "user-R" }));
ok("QA-295 pass: the officer records it: the same names (whoever records)", eq(recordedPeople(reviewed, team, "user-O", NOW), { preparedBy: "user-O", reviewedBy: "user-R" }));
ok("QA-295 fail: a self-review (the representative was the case's officer, or a solo firm) names the reviewer as preparer too",
  eq(recordedPeople({ ...reviewed, kind: "self_reviewed" }, team, "user-O", NOW), { preparedBy: "user-R", reviewedBy: "user-R" }));
const later = [...team.map((m) => (m.userId === "user-O" ? { ...m, endedAt: t(3) } : m)), member("user-P", "OFFICER", 4)];
ok("QA-295 pass: the officer on the team when the review was made, not one who had left before it", recordedPeople(reviewed, later, "user-R", NOW).preparedBy === "user-P");
ok("QA-295 pass: with two officers at once, the earliest assigned stands in (never the reviewer)", recordedPeople(reviewed, [...team, member("user-Q", "OFFICER", 2)], "user-R", NOW).preparedBy === "user-O");
// Review M1: no review that counts (the review warning was passed with a reason).
ok("QA-295 fail (review M1): with no review, nobody is named as reviewer (never the representative who did not review)",
  eq(recordedPeople(null, team, "user-R", NOW), { preparedBy: "user-O", reviewedBy: null }));
ok("QA-295 fail (review M1): with no review, the representative recording is still not the preparer: the case officer is",
  recordedPeople(null, team, "user-R", NOW).preparedBy === "user-O");
const gone = team.map((m) => (m.userId === "user-O" ? { ...m, endedAt: t(2) } : m));
ok("QA-295 fail (review M1): the only officer left before the review: the officer who left last, never the one recording",
  eq(recordedPeople(reviewed, gone, "user-R", NOW), { preparedBy: "user-O", reviewedBy: "user-R" }));
const afterReview = [member("user-R", "LEAD_REPRESENTATIVE", 1), member("user-O", "OFFICER", 7)];
ok("QA-295 pass (review m3): an officer assigned only after the review (none before): the one on the team now",
  recordedPeople(reviewed, afterReview, "user-R", NOW).preparedBy === "user-O");
ok("QA-295 fail: a case that never had a case officer: the one recording (and no review claimed)",
  eq(recordedPeople(null, [member("user-R", "LEAD_REPRESENTATIVE", 1)], "user-R", NOW), { preparedBy: "user-R", reviewedBy: null }));

process.exit(summary() ? 1 : 0);
