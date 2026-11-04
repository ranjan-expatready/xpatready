// C9.2 Out of date (runtime lane, M3-F; r5c BR-12; P-65, P-136): the pure rules of engine/runtime/out-of-date.ts, each
// with a passing and a failing case: which facts changed since a finished item read them (with the old and the new
// value), the words of the item's reason (the fact, the person, the old and new value, the date, the next step), and
// the earlier value Undo restores. The routes are proved by tests/check_c92_undo_api.ts and acceptance/C9.2.test.ts on
// an isolated copy. No database (US$0).
//   tsx studio/tests/check_c92_out_of_date.ts
import { changeWords, dayWords, factChanges, outOfDateReason, representativeWords, restoredFromOf, undoTarget, valueWords, type ChangeWords } from "../engine/runtime/out-of-date.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const W: ChangeWords = { label: (f) => ({ "person.family_name": "Family name", "person.date_of_birth": "Date of birth" })[f] ?? f, person: (a) => ({ A: "Sample Client A", S: "Sample Spouse A", representative: "the representative" })[a] ?? "the application", at: () => "2026-11-04T15:00:00Z" };
const F = (fact: string, about: string, value: unknown, box = `${fact}#1`, row: number | null = null) => ({ box, fact, about, row, value });

// Which facts changed.
const then = [F("person.family_name", "A", "SAMPLE"), F("person.family_name", "A", "SAMPLE", "name#2"), F("person.date_of_birth", "S", "1988-01-01")];
const same = factChanges(then, then, W);
ok("C9.2 changes (fail): nothing changed → no change listed (a draft or an unchanged item stays as it was)", same.length === 0, same);
const c1 = factChanges(then, [F("person.family_name", "A", "SAMPLEDZ"), F("person.family_name", "A", "SAMPLEDZ", "name#2"), F("person.date_of_birth", "S", "1988-01-01")], W);
ok("C9.2 changes: a changed family name is one change (two form fields, one fact), with the old and the new value", c1.length === 1 && c1[0].fact === "person.family_name" && c1[0].was === "SAMPLE" && c1[0].now === "SAMPLEDZ" && c1[0].person === "Sample Client A", c1);
const c2 = factChanges(then, [F("person.family_name", "A", "SAMPLE"), F("person.family_name", "A", "SAMPLE", "name#2")], W);
ok("C9.2 changes: a fact no longer confirmed or read is a change to no answer", c2.length === 1 && c2[0].fact === "person.date_of_birth" && c2[0].now === null, c2);
const c3 = factChanges([F("person.family_name", "A/parent_1", "P")], [F("person.family_name", "A/parent_1", "Q")], W);
ok("C9.2 changes: a relation's fact (a parent on the person's form) is named for the person it is on", c3.length === 1 && c3[0].about === "A", c3);
const c4 = factChanges([F("person.family_name", "representative", "REP ONE")], [F("person.family_name", "representative", "REP TWO")], W);
ok("C9.2 changes (BR-20): a representative's fact from the firm record is about the representative", c4.length === 1 && c4[0].person === "the representative", c4);

const W2: ChangeWords = { ...W, saved: (a, f) => (a === "A" && f === "person.family_name" ? "SAMPLEQ" : null) };
const c5 = factChanges([F("person.family_name", "A", "SAMPLE")], [], W2);
ok("C9.2 changes: a new value saved but not confirmed yet is named, marked not confirmed (never \"no answer\")", c5[0]?.now === "SAMPLEQ" && c5[0]?.confirmed === false && / to "SAMPLEQ" \(not confirmed yet\) on /.test(changeWords(c5[0])), changeWords(c5[0]));
const c6 = factChanges([F("person.date_of_birth", "S", "1988-01-01")], [], W2);
ok("C9.2 changes (fail): an answer taken away entirely is a change to no answer, confirmed (nothing pending)", c6[0]?.now === null && c6[0]?.confirmed === true && / to no answer on /.test(changeWords(c6[0])), changeWords(c6[0]));

const twoParents = (a: string, b: string) => [F("person.family_name", "A/parent_1", a, "p1"), F("person.family_name", "A/parent_2", b, "p2")];
const c7 = factChanges(twoParents("ALPHA", "BETA"), twoParents("GAMMA", "BETA"), W);
ok("C9.2 changes (Devin on #926): one parent's changed name is seen though the other parent's is the same", c7.length === 1 && c7[0].relation === "parent_1" && c7[0].was === "ALPHA" && c7[0].now === "GAMMA" && c7[0].person === "Sample Client A's parent 1", c7);
ok("C9.2 changes (fail): two parents unchanged → no change", factChanges(twoParents("ALPHA", "BETA"), twoParents("ALPHA", "BETA"), W).length === 0);

// Words.
ok("C9.2 words: a date reads \"4 Nov 2026\"", dayWords("2026-11-04T15:00:00Z") === "4 Nov 2026", dayWords("2026-11-04T15:00:00Z"));
ok("C9.2 words (fail): no date or a date that is not one gives no date words", dayWords(null) === null && dayWords("not a date") === null);
ok("C9.2 words: values read as a person reads them", valueWords("SAMPLE") === '"SAMPLE"' && valueWords(true) === "Yes" && valueWords(false) === "No" && valueWords(null) === "no answer" && valueWords({ city: "Sample City", country: "Canada" }) === '"Sample City Canada"');
ok("C9.2 words: a long value is cut at 60 characters", valueWords("x".repeat(80)).length === 62);
const w1 = changeWords(c1[0]);
ok("C9.2 words: the change names the fact, the person, the old and new value and the date", w1 === 'family name of Sample Client A changed from "SAMPLE" to "SAMPLEDZ" on 4 Nov 2026', w1);
const r1 = outOfDateReason("validated_copy", "IMM 5257", "2026-11-03T15:00:00Z", c1);
ok("C9.2 reason: a validated copy says what is out of date, the change and the next step (prepare again or undo)", /^The validated copy of IMM 5257 read back 3 Nov 2026 is out of date: family name of Sample Client A changed from "SAMPLE" to "SAMPLEDZ" on 4 Nov 2026\. Make a new copy of IMM 5257, validate it and read it back, or undo the change before filing\.$/.test(r1), r1);
const r2 = outOfDateReason("signed_scan", "IMM 5476", null, c4, [representativeWords(null, null, "2026-11-04T15:00:00Z")]);
ok("C9.2 reason (BR-20): a signed form names the change of representative of record and asks for a new signed one", /The signed IMM 5476 is out of date: the representative of record changed on 4 Nov 2026; family name of the representative/.test(r2) && /A new signed IMM 5476 is needed/.test(r2), r2);
const r3 = outOfDateReason("entered", "IMM 5707 (Section A)", null, []);
ok("C9.2 reason (fail): with no change it can name, it still says a fact changed (never a silent Out of date)", /a fact it reads changed since/.test(r3) && /tick the section again/.test(r3), r3);
const many = ["a", "b", "c", "d", "e"].map((x) => ({ ...c1[0], fact: x, label: x.toUpperCase() }));
ok("C9.2 reason: a caller's own next step replaces the default (a Paper line's new barcode page)", / Press Validate again\.$/.test(outOfDateReason("validated_copy", "F", null, c1, [], "Press Validate again.")));
ok("C9.2 reason: more than three changes are counted, not spelt out", /and 2 more changes\./.test(outOfDateReason("entered", "F", null, many)));

// Undo's earlier value.
const cur = { id: "3", value: "SAMPLEDZ" };
ok("C9.2 undo: the earlier value is the newest earlier answer that differs (a confirmation of the same value is skipped)", undoTarget(cur, [{ id: "2b", value: "SAMPLEDZ" }, { id: "2", value: "SAMPLE" }, { id: "1", value: "FIRST" }])?.id === "2");
ok("C9.2 undo (fail): an answer never changed has nothing to undo", undoTarget(cur, [{ id: "2", value: "SAMPLEDZ" }]) === null && undoTarget(cur, []) === null);
const hist = [{ id: "u1", value: "SAMPLE", restoredFrom: "2" }, { id: "3", value: "SAMPLEDZ" }, { id: "2", value: "SAMPLE" }, { id: "1", value: "FIRST" }];
ok("C9.2 undo: a second Undo goes further back from the answer the first one restored (never a redo)", undoTarget(hist[0], hist.slice(1))?.id === "1");
ok("C9.2 undo (fail): a second Undo with nothing further back has nothing to undo (it never puts the change back)", undoTarget({ id: "u1", value: "FIRST", restoredFrom: "1" }, [{ id: "2", value: "SAMPLE" }, { id: "1", value: "FIRST" }]) === null);
const conf = [{ id: "k", value: "B", restoredFrom: "u" }, { id: "u", value: "B", restoredFrom: "b" }, { id: "c", value: "C" }, { id: "b", value: "B" }, { id: "a", value: "A" }];
ok("C9.2 undo (Devin on #926): Undo → Confirm section → Undo goes further back (to A), never redoes C", undoTarget(conf[0], conf.slice(1))?.id === "a");
ok("C9.2 undo: a confirmation stands on the answer it confirmed; a restore on the one it put back", restoredFromOf({ channel: "confirm_section", from: "x" }) === "x" && restoredFromOf({ from: "x", restored: { from: "y" } }) === "y" && restoredFromOf({ channel: "agent_view" }) === null);
ok("C9.2 undo: values compare by content (an address object)", undoTarget({ id: "2", value: { city: "B" } }, [{ id: "1b", value: { city: "B" } }, { id: "1", value: { city: "A" } }])?.id === "1");

process.exitCode = summary() ? 1 : 0;
