// C9.5 Adopt a published update on an open case (B145): unit tests of engine/runtime/release-update.ts on small
// synthetic releases (no database, no server). Each business rule of the concept has a passing and a failing case, labelled
// "C9.5 BR-n pass/fail". The API, readers and screens are proved by acceptance/C9.5.test.ts on the checkpoint.
//   tsx studio/tests/check_c95_release_update.ts
import { draftNote, effectsOf, moveRefusal, pinChain, releaseDiff, releaseOutOfDate, reviewCounts, targetOf, touchedFilings, typeWords, whatChanges, type CaseInputs, type CaseSide, type SnapshotIn, type Work } from "../engine/runtime/release-update.ts";
import { ReleaseMove } from "../contracts/runtime.ts";
import { recorder } from "./runtime/api.ts";
import { openCasesByRelease } from "../api/src/where-used.ts";
import { waitingFactsKey } from "../api/src/readiness-inputs.ts";

const { ok, summary } = recorder();
const entry = (path: string, fact: string | null, extra: Record<string, unknown> = {}) => ({ data_path: path, fact, outcome: fact ? "mapped" : "not_a_fact", item_version: 1, status: "PUBLISHED", ...extra });
/** Release 1: A on PDF upload (typed name), B family form, C signed by hand, D unchanged; one document line; two fields. */
const r1: SnapshotIn = {
  forms: [{ form_number: "IMM A", title: "Form A", channel: "PDF_UPLOAD", who: "each_applicant" }, { form_number: "IMM B", title: "Family form B", who: "each_applicant", min_age: 18 },
    { form_number: "IMM C", title: "Form C", signature: "TYPED_NAME", who: "each_applicant" }, { form_number: "IMM D", title: "Form D", who: "each_applicant" }],
  field_maps: [{ form_number: "IMM A", form_edition: "IMM A (01-2023)", entries: [entry("a[0]", "person.name")] }, { form_number: "IMM C", form_edition: "IMM C (01-2023)", entries: [entry("c[0]", "person.dob")] },
    { form_number: "IMM D", form_edition: "IMM D (01-2023)", entries: [entry("d[0]", "person.name")] }],
  document_requirements: [{ lineage: "passport:each_applicant", document_type_key: "passport", who: "each_applicant" }, { lineage: "photo:each_applicant", document_type_key: "photo", who: "each_applicant" }],
  canonical_fields: [{ id: "person.name", meaning: "Name", value_type: "text" }, { id: "person.dob", meaning: "Date of birth", value_type: "text" }],
  eligibility: { gates: [{ key: "age", label: "Is 18 or over", condition: { op: "gte" } }], judgement: [] },
};
/** Release 2: A Online; B replaced by E; C's map changed; D only bookkeeping; photo line dropped; dob now a date. */
const r2: SnapshotIn = {
  forms: [{ form_number: "IMM A", title: "Form A", channel: "ONLINE", who: "each_applicant" }, { form_number: "IMM E", title: "Family form E", who: "each_applicant", min_age: 18 },
    { form_number: "IMM C", title: "Form C", signature: "TYPED_NAME", who: "each_applicant" }, { form_number: "IMM D", title: "Form D", who: "each_applicant", status: "always" }],
  field_maps: [{ form_number: "IMM A", form_edition: "IMM A (01-2023)", entries: [entry("a[0]", "person.name")] }, { form_number: "IMM C", form_edition: "IMM C (01-2023)", entries: [entry("c[0]", "person.dob", { transform: "date_ymd" })] },
    { form_number: "IMM D", form_edition: "IMM D (01-2023)", entries: [entry("d[0]", "person.name", { item_version: 2, status: "DRAFT" })] }, { form_number: "IMM E", form_edition: "IMM E (01-2021)", entries: [] }],
  document_requirements: [{ lineage: "passport:each_applicant", document_type_key: "passport", who: "each_applicant" }],
  canonical_fields: [{ id: "person.name", meaning: "Name", value_type: "text" }, { id: "person.dob", meaning: "Date of birth", value_type: "date" }],
  eligibility: { gates: [{ key: "age", label: "Is 18 or over", condition: { op: "gte" } }], judgement: [] },
};

const d = releaseDiff(r1, r2);
ok("C9.5 BR-3 pass: the difference names A filed another way (PDF upload → Online), B removed, E added, C on a changed map", d.forms.get("IMM A")?.kinds.includes("channel") && /Online/.test(d.forms.get("IMM A")!.after) && d.forms.get("IMM B")?.kinds[0] === "removed" && d.forms.get("IMM E")?.kinds[0] === "added" && d.forms.get("IMM C")?.kinds.includes("map") && !d.forms.get("IMM C")?.kinds.includes("channel"), [...d.forms.values()]);
ok("C9.5 BR-3 fail: a form whose only difference is bookkeeping (item version, status) is not a change", !d.forms.has("IMM D"));
ok("C9.5 BR-3 pass: a field whose answer type changed (text → date) and the dropped document line are found", d.types.get("person.dob")?.after === "date" && d.documents.removed.has("photo") && !d.documents.removed.has("passport"));
const same = releaseDiff(r1, structuredClone(r1));
ok("C9.5 BR-3 fail: the same release against itself changes nothing", same.forms.size === 0 && same.types.size === 0 && same.eligibility.length === 0 && same.documents.added.size === 0 && same.documents.removed.size === 0);
ok("C9.5 BR-3 pass: a signing change alone is filed another way", releaseDiff(r1, { ...r1, forms: r1.forms.map((f) => f.form_number === "IMM C" ? { ...f, signature: "HAND_SCANNED" } : f) }).forms.get("IMM C")?.kinds.join() === "signing");

const people = [{ id: "pA", label: "Client A" }, { id: "pB", label: "Client B" }, { id: "pC", label: "Client C" }];
const side = (forms: Record<string, string[]>, docs: Record<string, string[]>, qs: Record<string, string[]>): CaseSide => ({
  forms: new Map(Object.entries(forms).map(([p, f]) => [p, new Set(f)])),
  documents: new Map(Object.entries(docs).map(([p, ds]) => [p, new Map(ds.map((k) => [k, k === "photo" ? "Photo" : "Passport"]))])),
  questions: new Map(Object.entries(qs).map(([p, fs]) => [p, new Map(fs.map((f) => [f, f === "person.dob" ? "Date of birth" : f]))])) });
const x: CaseInputs = { people,
  from: side({ pA: ["IMM A", "IMM B", "IMM C", "IMM D"], pB: ["IMM A", "IMM B", "IMM D"], pC: ["IMM D"] }, { pA: ["passport", "photo"], pB: ["passport"], pC: ["passport"] }, { pA: ["person.name", "person.dob"], pB: ["person.name"], pC: ["person.name"] }),
  to: side({ pA: ["IMM A", "IMM E", "IMM C", "IMM D"], pB: ["IMM A", "IMM E", "IMM D"], pC: ["IMM D"] }, { pA: ["passport"], pB: ["passport"], pC: ["passport"] }, { pA: ["person.name", "person.dob", "person.new"], pB: ["person.name"], pC: ["person.name"] }),
  answered: [{ subject: "pA", fact: "person.dob" }, { subject: "pA", fact: "person.name" }] };
const ch = whatChanges(d, x);
ok("C9.5 BR-3 pass: each line names the people it touches and old against new (A for Client A and B; the photo for Client A; one new question for Client A)",
  ch.forms.find((l) => l.what.startsWith("IMM A"))?.who.join() === "Client A,Client B" && ch.documents.some((l) => l.what === "Photo" && l.who.join() === "Client A" && l.kind === "No longer asked") && ch.questions.some((l) => l.what === "person.new" && l.who.join() === "Client A") && ch.questions.some((l) => l.kind === "Answer type changed" && l.who.join() === "Client A"), ch);
ok("C9.5 BR-3 fail: a form line nobody on the case holds is not listed for this case", whatChanges(d, { ...x, from: side({}, {}, {}), to: side({}, {}, {}) }).forms.length === 0);

const work: Work[] = [
  { id: "w1", kind: "copy", form: "IMM A", label: "IMM A draft", subject: "pA", finished: false }, { id: "w2", kind: "copy", form: "IMM A", label: "IMM A validated", subject: "pB", finished: true },
  { id: "w3", kind: "copy", form: "IMM B", label: "IMM B draft", subject: "pA", finished: false }, { id: "w4", kind: "copy", form: "IMM C", label: "IMM C draft", subject: "pA", finished: false },
  { id: "w5", kind: "signed_scan", form: "IMM C", label: "IMM C signed", subject: "pA", finished: true }, { id: "w6", kind: "copy", form: "IMM D", label: "IMM D draft", subject: "pC", finished: false },
  { id: "w7", kind: "upload", document: "photo", label: "Photo", subject: "pA", finished: true }, { id: "w8", kind: "upload", document: "passport", label: "Passport", subject: "pC", finished: true },
];
const filings = [{ id: "fA", people: ["pA"] }, { id: "fB", people: ["pB"] }, { id: "fC", people: ["pC"] }];
const touched = touchedFilings(d, x, filings, { to: "Release 2" });
const e = effectsOf(d, x, work, [{ filing: "fA", label: "Client A's filing", counts: true }, { filing: "fC", label: "Client C's filing", counts: true }, { filing: "fB", label: "Client B's filing", counts: false }], touched, { to: "Release 2" });
const ids = (k: keyof Omit<typeof e, "unchanged">) => e[k].map((l) => l.id).sort().join();
ok("C9.5 BR-4 pass: each piece of work in its group: a draft on a changed map to fill again; A filed another way (draft and validated copy); B's draft no longer required with the dropped photo upload; C's signed scan stays, marked out of date",
  ids("fill_again") === "w4" && ids("filed_another_way") === "w1,w2" && ids("no_longer_required") === "w3,w7" && ids("kept_out_of_date") === "w5", e);
ok("C9.5 BR-4 fail: work the release does not touch (D's draft, the passport upload, an untouched filing's review) is never moved into a group", e.unchanged.count === 3 && !Object.values(e).some((g) => Array.isArray(g) && g.some((l: { id: string }) => ["w6", "w8", "fC"].includes(l.id))), e.unchanged);
ok("C9.5 BR-4 pass: the representative's review is withdrawn on the touched filing only (Client A), never on Client C's, and a review that no longer counts is not listed", ids("withdrawn") === "fA");
ok("C9.5 BR-8 pass: touched filings name what they touch; an untouched filing has no line", (touched.get("fA") ?? []).some((w) => /Release 2 files IMM A as Online/.test(w)) && (touched.get("fB") ?? []).length > 0 && (touched.get("fC") ?? []).length === 0, Object.fromEntries(touched));

ok("C9.5 BR-6 pass: a review made after the move counts; one made before counts only when the move touched nothing on its filing",
  reviewCounts({ hashEqual: true, reviewedAt: new Date(2000), pinnedAt: new Date(1000), revision: 2, touched: true }) && reviewCounts({ hashEqual: true, reviewedAt: new Date(500), pinnedAt: new Date(1000), revision: 2, touched: false }) && reviewCounts({ hashEqual: true, reviewedAt: new Date(500), pinnedAt: new Date(1000), revision: 1, touched: true }));
ok("C9.5 BR-6 fail: a review made before a move that touched its filing, or for other facts, no longer counts",
  !reviewCounts({ hashEqual: true, reviewedAt: new Date(500), pinnedAt: new Date(1000), revision: 2, touched: true }) && !reviewCounts({ hashEqual: false, reviewedAt: new Date(2000), pinnedAt: new Date(1000), revision: 2, touched: false }));
const words = releaseOutOfDate(d.forms.get("IMM A"), { from: "Release 1", to: "Release 2" }, "validated copy");
ok("C9.5 BR-6 pass: a copy made on an earlier release whose form changed is out of date because of the release, naming both releases and what changed",
  !!words && /because of the release/.test(words) && /Release 1/.test(words) && /Release 2 files IMM A as Online/.test(words) && !/changed from/.test(words), words);
ok("C9.5 BR-6 fail: a copy of a form the release does not touch (or only adds) is not out of date because of it", releaseOutOfDate(undefined, { from: "Release 1", to: "Release 2" }, "copy") === null && releaseOutOfDate(d.forms.get("IMM E"), { from: "Release 1", to: "Release 2" }, "copy") === null);
ok("C9.5 BR-6 pass (challenge B1): a draft made on the earlier release is marked to fill again or filed another way, and the officer presses Fill (the move fills nothing)",
  /^To fill again: the copy was made on Release 1/.test(draftNote(d.forms.get("IMM C"), { from: "Release 1", to: "Release 2" }) ?? "") && /^Filed another way now: .*Online.*is not filed/.test(draftNote(d.forms.get("IMM A"), { from: "Release 1", to: "Release 2" }) ?? ""));
ok("C9.5 BR-6 fail: no mark on a draft of a form the release does not change, or one it removes (that is No longer required)", draftNote(undefined, { from: "Release 1", to: "Release 2" }) === null && draftNote(d.forms.get("IMM B"), { from: "Release 1", to: "Release 2" }) === null);

const rf = (o: Partial<Parameters<typeof moveRefusal>[0]>) => moveRefusal({ recorded: [], running: [], mismatches: [], current: "Release 1", ...o });
ok("C9.5 BR-7 pass: nothing in the way → the move may go ahead", rf({}) === null);
ok("C9.5 BR-7 fail: a recorded filing, a fill job waiting, an answer that no longer fits its type each refuse the move, naming it and saying nothing was changed",
  rf({ recorded: ["Client A"] })?.code === "recorded" && /Client A's filing is recorded as submitted; this case's filings stay on Release 1/.test(rf({ recorded: ["Client A"] })!.reason)
  && rf({ running: [{ form: "IMM A", person: "Client A" }] })?.code === "fill_running" && /Nothing was changed/.test(rf({ running: [{ form: "IMM A", person: "Client A" }] })!.reason)
  && /Client A's answer to "Date of birth" does not fit the new release \(it expects a date\)/.test(rf({ mismatches: [{ label: "Date of birth", person: "Client A", expects: typeWords("date") }] })?.reason ?? ""));
ok("C9.5 BR-7 pass: the first reason is named (recorded before a running fill)", rf({ recorded: ["Client A"], running: [{ form: "IMM A", person: "Client A" }] })?.code === "recorded");

const chain = pinChain([{ revision: 1, version: 1, id: "old" }, { revision: 2, version: 6, id: "new" }]), reversed = pinChain([{ revision: 2, version: 6, id: "new" }, { revision: 1, version: 1, id: "old" }]);
ok("C9.5 BR-1 pass: revisions read in either order give the newest (revision 2), and the chain holds", chain.current?.id === "new" && reversed.current?.id === "new" && chain.ok && reversed.ok);
ok("C9.5 BR-1 fail: a gap in the revisions or a move backwards breaks the chain (refused, never read)", !pinChain([{ revision: 3, version: 6 }, { revision: 1, version: 1 }]).ok && !pinChain([{ revision: 2, version: 1 }, { revision: 1, version: 6 }]).ok && !pinChain([]).ok);
// Challenge M1: where-used keeps one row per case, its newest revision. A stand-in for the database answers the query as
// asked (its orderBy honoured), with the pins stored in reverse order of revision.
// C6.17 (BR-9): a pin names its combination (every stored pin does); where-used counts only the case's current one's.
const pinsStored = [{ caseId: "k1", configReleaseId: "rel6", revision: 2, combinationId: "vv" }, { caseId: "k1", configReleaseId: "rel1", revision: 1, combinationId: "vv" }, { caseId: "k2", configReleaseId: "rel1", revision: 1, combinationId: "vv" }];
const fakeDb = {
  case: { findMany: async () => [{ id: "k1", combinationId: "vv" }, { id: "k2", combinationId: "vv" }] },
  packWorkPin: { findMany: async (q: { orderBy?: { caseId?: string; revision?: string }[] }) => [...pinsStored].sort((a, b) => (q.orderBy?.length ? a.caseId.localeCompare(b.caseId) || a.revision - b.revision : 0)) },
  configRelease: { findMany: async () => [{ id: "rel1", version: 1 }, { id: "rel6", version: 2 }] },
};
const byRelease = await openCasesByRelease(fakeDb as never, ["vv"]);
ok("C9.5 BR-1 pass (where-used, challenge M1): a moved case is counted once, on its newest release, whatever order its pins are stored in", JSON.stringify(byRelease) === JSON.stringify([{ combinationId: "vv", release: 1, cases: 1 }, { combinationId: "vv", release: 2, cases: 1 }]), byRelease);
ok("C9.5 BR-1 fail (where-used): an unmoved case stays counted on its release (never on the newer one)", byRelease.find((r) => r.release === 1)?.cases === 1);
ok("C9.5 BR-2 pass: the target is the newest release with a higher version", targetOf([{ version: 1 }, { version: 3 }, { version: 2 }], 1)?.version === 3);
ok("C9.5 BR-2 fail: on the newest release there is no target (forward only)", targetOf([{ version: 1 }, { version: 2 }], 2) === null && targetOf([{ version: 1 }], 3) === null);

ok("C9.5 BR-5 pass: the pre-filled reason is accepted with the revision and release read", ReleaseMove.safeParse({ target_version: 2, from_revision: 1, reason: "Adopting the current release" }).success);
ok("C9.5 BR-5 fail: no reason, a blank or 2-character reason, a 501-character reason, or no revision read is refused",
  !ReleaseMove.safeParse({ target_version: 2, from_revision: 1 }).success && !ReleaseMove.safeParse({ target_version: 2, from_revision: 1, reason: "   " }).success && !ReleaseMove.safeParse({ target_version: 2, from_revision: 1, reason: "ok" }).success
  && !ReleaseMove.safeParse({ target_version: 2, from_revision: 1, reason: "x".repeat(501) }).success && !ReleaseMove.safeParse({ target_version: 2, reason: "Adopting the current release" }).success);

// Break m1 (round 1): a copy of a form neither release asks of the person (an earlier move dropped it) is in no group.
const gone = effectsOf(d, x, [{ id: "w9", kind: "copy", form: "IMM Z", label: "IMM Z draft", subject: "pA", finished: false }], [], touched, { to: "Release 2" });
ok("C9.5 BR-4 fail (break m1): a copy of a form an earlier move already dropped is not listed again as no longer required, nor counted", !Object.values(gone).some((g) => Array.isArray(g) && g.length) && gone.unchanged.count === 0, gone);
ok("C9.5 BR-4 pass (review m9): a draft to fill again, and one filed another way on a PDF line, have Fill as their next step; an Online one does not",
  e.fill_again.every((l) => l.fillable) && e.filed_another_way.filter((l) => l.form === "IMM A").every((l) => !l.fillable && /IRCC account/.test(l.why)));
// Review m1 (round 1), build discovery D1: the order the answers are read in never changes the facts fingerprint.
const miss = [{ fact: "person.name", about: "pA", reason: "not confirmed" }];
const ans = [{ field: "person.name", subjectId: "pA", rowKey: null, value: "A" }, { field: "person.name", subjectId: "pB", rowKey: null, value: "B" }];
ok("C9.5 D1 pass: the same answers read in another order give the same waiting-facts key", waitingFactsKey(miss, ans) === waitingFactsKey(miss, [...ans].reverse()));
ok("C9.5 D1 fail: a changed answer gives another key", waitingFactsKey(miss, ans) !== waitingFactsKey(miss, [ans[0], { ...ans[1], value: "C" }]));

// Devin on #1252 (finding 3): a form whose only change is who needs it (who, minimum age, condition) touches a filing whose
// person it newly applies to, or no longer applies to; never one whose applicability stays the same.
const ruleFrom: SnapshotIn = { forms: [{ form_number: "IMM R", title: "Form R", who: "each_applicant", min_age: 18 }, { form_number: "IMM S", title: "Form S", who: "each_applicant" }, { form_number: "IMM T", title: "Form T", who: "each_applicant", min_age: 18 }] };
const ruleTo: SnapshotIn = { forms: [{ form_number: "IMM R", title: "Form R", who: "each_applicant" }, { form_number: "IMM S", title: "Form S", who: "each_applicant", min_age: 18 }, { form_number: "IMM T", title: "Form T", who: "each_applicant", min_age: 16 }] };
const rd = releaseDiff(ruleFrom, ruleTo);
const ruleCase: CaseInputs = { people: [{ id: "adult", label: "Client A" }, { id: "kid", label: "Client C" }],
  from: side({ adult: ["IMM R", "IMM S", "IMM T"], kid: ["IMM S"] }, {}, {}), to: side({ adult: ["IMM R", "IMM S", "IMM T"], kid: ["IMM R"] }, {}, {}), answered: [] };
const rt = touchedFilings(rd, ruleCase, [{ id: "fAdult", people: ["adult"] }, { id: "fKid", people: ["kid"] }], { to: "Release 2" });
ok("C9.5 BR-8 pass (Devin finding 3): a rule-only change touches the filing of the person a form now applies to, and of the one it no longer applies to, naming both",
  (rt.get("fKid") ?? []).some((w) => /Release 2 now asks for IMM R/.test(w)) && (rt.get("fKid") ?? []).some((w) => /Release 2 no longer asks for IMM S/.test(w)), Object.fromEntries(rt));
ok("C9.5 BR-8 fail (Devin finding 3): a rule-only change that leaves who needs the form as it was touches nothing (IMM T for both; the adult's filing)", (rt.get("fAdult") ?? []).length === 0 && !(rt.get("fKid") ?? []).some((w) => /IMM T/.test(w)), Object.fromEntries(rt));

process.exit(summary() ? 1 : 0);
