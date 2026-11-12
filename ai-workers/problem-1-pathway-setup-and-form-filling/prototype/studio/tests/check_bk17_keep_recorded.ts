// BK-17 (P-486; BK-15 breaker M3, PR #1591), pure: keepRecorded (api/src/submission-record.ts) reads a filing recorded as
// submitted as it was recorded, whatever a later derivation says. Each rule has a passing and a failing case:
//   * the same owner's filing relabelled by an answer (BK-15's case: "Visitor visa" after "Study permit") keeps its label;
//   * a recorded filing the derivation no longer makes is listed again, in its group; a person on it is on no other filing;
//   * a record made before BK-17 (no stored label) reads the derived label, else "<combination>: <owner>";
//   * an unrecorded filing is the derivation's, unchanged (control), and nothing changes with no record.
//   tsx studio/tests/check_bk17_keep_recorded.ts
import { keepRecorded, recordedLabels, recordedRowsOf, type RecordedRow } from "../api/src/submission-record.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const names: Record<string, string> = { s: "Student", k: "Child K", j: "Child J" };
const opts = { labelOf: (x: string) => names[x] ?? "", combination: "sp.outside", combinationLabel: "Outside Canada", idOf: (r: RecordedRow) => r.id, kindOf: () => "family" as const };
const filing = (owner: string, label: string, people: string[], group = "G") => ({ id: `F-${owner}`, combination: "sp.outside", label, mode: "files_own", owner: { subject: owner, label: names[owner], role: owner === "s" ? "principal" : "child" },
  applicants: people.map((p) => ({ subject: p, label: names[p], role: p === "s" ? "principal" : "child", mode: "applying" })), group, status: "NOT_STARTED", number: null });
const group = (id: string, filings: string[]) => ({ id, kind: "family" as const, label: "One submission", filings, splittable: false, why: "", totals: [], total_cents: null });
const row = (owner: string, people: string[], label: string | null, groupId = "G"): RecordedRow => ({ id: `F-${owner}`, subjectId: owner, submissionGroupId: groupId, mode: "files_own", label, applicants: people.map((p) => ({ subjectId: p, role: p === "s" ? "principal" : "child", mode: "applying" })) });

// BK-15's case: the same owner's filing, relabelled by the answer (the row is keyed by its owner).
const relabelled = { filings: [filing("s", "Outside Canada: Student", ["s"]), filing("k", "Visitor visa: Child K", ["k"])], groups: [group("G", ["F-s", "F-k"])] };
const a = keepRecorded(relabelled, [row("s", ["s"], "Outside Canada: Student"), row("k", ["k"], "Study permit: Child K")], opts);
ok("BK-17 pass: a recorded filing relabelled by a later answer reads its label as recorded (\"Study permit: Child K\")", a.filings.find((f) => f.id === "F-k")?.label === "Study permit: Child K", a.filings.map((f) => f.label));
ok("BK-17 fail: the derived new label (\"Visitor visa\") is never shown for a recorded filing", !a.filings.some((f) => /Visitor visa/.test(f.label)));

// Main's case: the child moved onto the student's application; the child's recorded filing is no longer derived.
const moved = { filings: [filing("s", "Outside Canada: Student", ["s", "k"])], groups: [group("G", ["F-s"])] };
const b = keepRecorded(moved, [row("s", ["s"], "Outside Canada: Student"), row("k", ["k"], "Study permit: Child K")], opts);
ok("BK-17 pass: a recorded filing the derivation no longer makes is listed again, as recorded, in its group", b.filings.find((f) => f.id === "F-k")?.label === "Study permit: Child K" && b.groups[0]?.filings.join() === "F-s,F-k", [b.filings.map((f) => f.id), b.groups]);
ok("BK-17 fail: the student's recorded filing never gains the child (its people are those recorded)", b.filings.find((f) => f.id === "F-s")?.applicants.map((x) => x.subject).join() === "s");

// The other way: recorded with the child on the student's; the derivation now makes the child their own filing.
const split = { filings: [filing("s", "Outside Canada: Student", ["s"]), filing("k", "Study permit: Child K", ["k"])], groups: [group("G", ["F-s", "F-k"])] };
const c = keepRecorded(split, [row("s", ["s", "k"], "Outside Canada: Student")], opts);
ok("BK-17 pass: a person on a recorded filing stays on it (the child on the student's recorded application)", c.filings.length === 1 && c.filings[0].applicants.map((x) => x.subject).join() === "s,k", c.filings);
ok("BK-17 fail: no new filing is made for a person on a recorded filing, and an emptied group is not listed", !c.filings.some((f) => f.owner?.subject === "k") && c.groups.length === 1 && c.groups[0].filings.join() === "F-s", [c.filings.map((f) => f.id), c.groups]);

// A record made before BK-17 has no label: the derived one, else "<combination>: <owner>".
const d = keepRecorded(relabelled, [row("k", ["k"], null)], opts);
ok("BK-17 pass (before BK-17): a recorded filing with no stored label reads the derived label", d.filings.find((f) => f.id === "F-k")?.label === "Visitor visa: Child K");
const e = keepRecorded({ filings: [filing("s", "Outside Canada: Student", ["s", "k"])], groups: [group("G", ["F-s"])] }, [row("k", ["k"], null, "H")], opts);
ok("BK-17 pass (before BK-17): one no longer derived reads \"<combination>: <owner>\", in its own recorded group", e.filings.find((f) => f.id === "F-k")?.label === "Outside Canada: Child K" && e.groups.some((g) => g.id === "H" && g.filings.join() === "F-k" && g.why === "Recorded as submitted to IRCC."), [e.filings, e.groups]);

// Controls.
const j = keepRecorded({ filings: [filing("s", "Outside Canada: Student", ["s"]), filing("j", "Visitor visa: Child J", ["j", "k"], "H")], groups: [group("G", ["F-s"]), group("H", ["F-j"])] }, [row("s", ["s"], "Outside Canada: Student")], opts);
ok("BK-17 fail (control): an unrecorded filing is the derivation's (label and people unchanged)", j.filings.find((f) => f.id === "F-j")?.label === "Visitor visa: Child J" && j.filings.find((f) => f.id === "F-j")?.applicants.length === 2);
ok("BK-17 fail (control): with no recorded filing the derivation is returned as it is", keepRecorded(moved, [], opts) === moved);

// What the record stores and reads back.
const rows = [{ id: "F-s", subjectId: "s", submissionGroupId: "G", mode: "files_own", status: "SUBMITTED", applicants: [{ subjectId: "s", role: "principal", mode: "applying" }] },
  { id: "F-j", subjectId: "j", submissionGroupId: "H", mode: "files_own", status: "READY_TO_FILE", applicants: [{ subjectId: "j", role: "child", mode: "applying" }] }];
const rec = recordedRowsOf(rows, [{ recordedFees: { labels: { "F-s": "Outside Canada: Student" } } }, { recordedFees: null }]);
ok("BK-17 pass: only filings recorded as submitted are kept, each with its stored label", rec.length === 1 && rec[0].id === "F-s" && rec[0].label === "Outside Canada: Student", rec);
ok("BK-17 fail: a group recorded before BK-17 (no labels) or not recorded gives no label", recordedLabels([{ recordedFees: { at: "x", fees: [] } }, { recordedFees: null }]).size === 0);
process.exitCode = summary() ? 1 : 0;
