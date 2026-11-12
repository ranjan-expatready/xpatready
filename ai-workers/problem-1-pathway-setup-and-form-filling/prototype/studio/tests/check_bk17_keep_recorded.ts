// BK-17 (P-486; BK-15 breaker M3, PR #1591), pure: keepRecorded (api/src/submission-record.ts) reads a filing recorded as
// submitted as it was recorded, whatever a later derivation says. Each rule has a passing and a failing case:
//   * the same owner's filing relabelled by an answer (BK-15's case: "Visitor visa" after "Study permit") keeps its label;
//   * a recorded filing the derivation no longer makes is listed again, in its group; a person on it is on no other filing;
//   * a record made before BK-17 (no stored label) reads the derived label, else "<combination>: <owner>";
//   * an unrecorded filing is the derivation's, unchanged (control), and nothing changes with no record;
//   * break B1: a person an answer would move onto a recorded filing stays on their own (unrecorded) application;
//   * break B3: a recorded group is named by the people on its filings as kept; break B4: a fee line only on its
//     person's filing, and a group that counted someone kept elsewhere says its fees are not worked out.
//   tsx studio/tests/check_bk17_keep_recorded.ts
import { feesOnTheirFilings, keepRecorded, keptRowsOf, recordedLabels, recordedRowsOf, type RecordedRow } from "../api/src/submission-record.ts";
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
ok("BK-17 pass (before BK-17): one no longer derived reads \"<combination>: <owner>\", in its own recorded group", e.filings.find((f) => f.id === "F-k")?.label === "Outside Canada: Child K" && e.groups.some((g) => g.id === "H" && g.filings.join() === "F-k" && /^Recorded as submitted to IRCC/.test(g.why)), [e.filings, e.groups]);

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
// Break B1: the child's own application split out (group H, unrecorded); the student's group G is recorded. "No" moves
// the child onto the student's filing in the derivation: the child's row is kept as stored, as their application.
const stored = [{ id: "F-s", subjectId: "s", submissionGroupId: "G", mode: "files_own", status: "SUBMITTED", active: true, applicants: [{ subjectId: "s", role: "principal", mode: "applying" }] },
  { id: "F-k", subjectId: "k", submissionGroupId: "H", mode: "files_own", status: "READY_TO_FILE", active: true, applicants: [{ subjectId: "k", role: "child", mode: "applying" }] }];
const movedOn = { filings: [filing("s", "Outside Canada: Student", ["s", "k"])], groups: [group("G", ["F-s"])] };
const kr = keptRowsOf(movedOn.filings, stored, [{ recordedFees: { labels: { "F-s": "Outside Canada: Student" } } }]);
ok("BK-17 pass (break B1): the unrecorded application of a person moved onto a recorded filing is kept as stored (not recorded)", kr.length === 2 && kr.some((r) => r.id === "F-k" && r.recorded === false && r.label === null), kr);
const b1 = keepRecorded(movedOn, kr, { ...opts, kindOf: (g: string) => (g === "H" ? "separate" as const : "family" as const) });
ok("BK-17 pass (break B1): the child stays on their own application, in its own group", b1.filings.some((f) => f.id === "F-k" && f.applicants.map((x) => x.subject).join() === "k") && b1.groups.some((g) => g.id === "H" && g.filings.join() === "F-k"), [b1.filings.map((f) => [f.id, f.applicants.map((x) => x.subject)]), b1.groups]);
ok("BK-17 fail (break B1): the person is never left on no filing, and the recorded one never gains them", b1.filings.find((f) => f.id === "F-s")?.applicants.map((x) => x.subject).join() === "s" && b1.filings.filter((f) => f.applicants.some((x) => x.subject === "k")).length === 1);
ok("BK-17 fail (break B1, control): with the student's group unrecorded nothing is kept, and the derivation moves the child", keptRowsOf(movedOn.filings, stored.map((r) => ({ ...r, status: "READY_TO_FILE" })), []).length === 0);
// Break B3: the recorded group's header counts the people on its filings as kept, and says it reads as recorded.
ok("BK-17 pass (break B3): a recorded group with one person reads \"One submission\" and says it is recorded", b1.groups.find((g) => g.id === "G")?.label === "One submission" && /^Recorded as submitted to IRCC/.test(b1.groups.find((g) => g.id === "G")?.why ?? ""), b1.groups.find((g) => g.id === "G"));
ok("BK-17 fail (break B3): the kept unrecorded application's group is never called recorded; it says why it is kept", b1.groups.find((g) => g.id === "H")?.label === "One submission" && /^Kept as prepared/.test(b1.groups.find((g) => g.id === "H")?.why ?? ""), b1.groups.find((g) => g.id === "H"));
// Break B4: the derivation charges the child (kept on the recorded filing F-s) on the spouse's unrecorded group H too.
const lines = [{ filing: "F-j", person: "j", amount: 100 }, { filing: "F-j", person: "k", amount: 100 }, { filing: "F-s", person: "s", amount: 150 }];
const gs = [{ ...group("G", ["F-s"]), total_cents: 15000 }, { ...group("H", ["F-j"]), total_cents: 20000, totals: [{ line: "x" }] }];
const fs = [{ id: "F-s", owner: { subject: "s" }, applicants: [{ subject: "s" }, { subject: "k" }] }, { id: "F-j", owner: { subject: "j" }, applicants: [{ subject: "j" }] }];
const fe = feesOnTheirFilings(lines, gs, fs, { filing: (l) => l.filing, person: (l) => l.person, frozen: (g) => g === "G", labelOf: (x) => names[x] ?? x, held: new Set(["s", "k"]) });
ok("BK-17 pass (break B4): the group that counted a person kept on a recorded filing shows no total, in words naming them", fe.groups.find((g) => g.id === "H")?.total_cents === null && /Child K is on an application already recorded/.test(fe.groups.find((g) => g.id === "H")?.why ?? "") && !fe.lines.some((l) => l.filing === "F-j"), [fe.groups, fe.lines]);
ok("BK-17 fail (break B4): the recorded group and its lines are unchanged", fe.groups.find((g) => g.id === "G")?.total_cents === 15000 && fe.lines.some((l) => l.filing === "F-s" && l.person === "s"));
const clean = feesOnTheirFilings(lines.filter((l) => l.person !== "k"), gs, fs, { filing: (l) => l.filing, person: (l) => l.person, frozen: () => false, labelOf: (x) => x, held: new Set(["s", "k"]) });
ok("BK-17 fail (break B4, control): with every line on its person's filing, lines and totals are as derived", clean.lines.length === 2 && clean.groups.find((g) => g.id === "H")?.total_cents === 20000);
// Break re-check: with nobody held (nothing recorded), a line for a person on no filing is left as derived (no total blanked).
const none = feesOnTheirFilings(lines, gs, fs.filter((f) => f.id === "F-j"), { filing: (l) => l.filing, person: (l) => l.person, frozen: () => false, labelOf: (x) => x, held: new Set() });
ok("BK-17 fail (re-check): with nothing recorded, no group's total is blanked and the derived lines stand", none.groups.find((g) => g.id === "H")?.total_cents === 20000 && none.lines.filter((l) => l.filing === "F-j").length === 2, none);
// Break re-check: the mirror of B1. The child's split-out group H is recorded; "No" puts the child on the student's
// unrecorded filing in the derivation (group G says 2 people): the child is taken off it, so G is named for 1 person.
const mirror = keepRecorded({ filings: [filing("s", "Outside Canada: Student", ["s", "k"])], groups: [{ ...group("G", ["F-s"]), label: "One submission for 2 people applying", why: "One application for the family." }] }, [row("k", ["k"], "Study permit: Child K", "H")], opts);
ok("BK-17 pass (re-check, B3 mirror): an unrecorded group someone kept on a recorded filing was taken off is named for the people on it", mirror.groups.find((g) => g.id === "G")?.label === "One submission" && mirror.groups.find((g) => g.id === "G")?.why === "One application for the family.", mirror.groups);
ok("BK-17 fail (re-check, B3 mirror): a group whose people are the derivation's keeps the derived header", keepRecorded({ filings: [filing("s", "Outside Canada: Student", ["s", "j"])], groups: [{ ...group("G", ["F-s"]), label: "One submission for 2 people applying" }] }, [row("k", ["k"], "Study permit: Child K", "H")], opts).groups.find((g) => g.id === "G")?.label === "One submission for 2 people applying");
// Break re-check (new Minor): a kept unrecorded application says no document is decided for it, never the combination's name.
ok("BK-17 pass (re-check): the kept unrecorded application reads \"Application kept as prepared: Child K\"", b1.filings.find((f) => f.id === "F-k")?.label === "Application kept as prepared: Child K", b1.filings.find((f) => f.id === "F-k")?.label);
process.exitCode = summary() ? 1 : 0;
