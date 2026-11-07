// QA-295 (row B126; P-155 (1)): who a filing record names as having prepared and reviewed a filing (engine/runtime/submission-record.ts
// recordedPeople, used by api/src/submission.ts), whoever records it. Each rule with a passing and a failing case. Pure: no server. US$0.
//   tsx studio/tests/check_qa295_recorded_people.ts
import { recordedPeople } from "../engine/runtime/submission-record.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const t = (h: number) => new Date(Date.UTC(2026, 10, 7, h));
const member = (userId: string, role: string, from: number, to: number | null = null, id = userId) => ({ userId, role, assignedAt: t(from), endedAt: to === null ? null : t(to), id });
const team = [member("user-R", "LEAD_REPRESENTATIVE", 1), member("user-O", "OFFICER", 1)];
const reviewed = { reviewedBy: "user-R", kind: "reviewed", reviewedAt: t(5) };

ok("QA-295 pass: the representative records a filing the officer prepared and the representative reviewed: Officer · Representative",
  JSON.stringify(recordedPeople(reviewed, team, "user-R", "user-R")) === JSON.stringify({ preparedBy: "user-O", reviewedBy: "user-R" }));
ok("QA-295 pass: the officer records it: the same names (whoever records)",
  JSON.stringify(recordedPeople(reviewed, team, "user-O", "user-R")) === JSON.stringify({ preparedBy: "user-O", reviewedBy: "user-R" }));
ok("QA-295 fail: a self-review (the representative was the case's officer, or a solo firm) names the reviewer as preparer too",
  JSON.stringify(recordedPeople({ ...reviewed, kind: "self_reviewed" }, team, "user-O", "user-R")) === JSON.stringify({ preparedBy: "user-R", reviewedBy: "user-R" }));
ok("QA-295 pass: the reviewer comes from the review, not from today's representative of record (changed since)",
  recordedPeople(reviewed, team, "user-T", "user-T").reviewedBy === "user-R");
const later = [...team.map((m) => (m.userId === "user-O" ? { ...m, endedAt: t(3) } : m)), member("user-P", "OFFICER", 4)];
ok("QA-295 pass: the officer on the team when the review was made, not one who had left before it",
  recordedPeople(reviewed, later, "user-R", "user-R").preparedBy === "user-P");
const two = [...team, member("user-Q", "OFFICER", 2)];
ok("QA-295 pass: with two officers, the earliest assigned (never the reviewer)", recordedPeople(reviewed, two, "user-R", "user-R").preparedBy === "user-O");
ok("QA-295 fail: no review (a filing recorded before reviews existed): the one recording, and the representative of record, as before",
  JSON.stringify(recordedPeople(null, team, "user-O", "user-R")) === JSON.stringify({ preparedBy: "user-O", reviewedBy: "user-R" }));

process.exit(summary() ? 1 : 0);
