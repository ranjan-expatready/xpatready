// M3-S4 checks (P-172, P-380, P-425): a document line configured as never waivable blocks "Ready to file" until it is
// received, on any combination. Each rule has a passing and a failing case: the line carries `never_waivable` from the
// release (engine/runtime/case-checklist.ts; merged from two requirements it is never waivable when either is), the
// checklist is worked out for every combination from its release (the "not derived yet" guard is gone, P-425), a never
// waivable line not received is a block that cannot be passed while any other missing document stays a warning
// (engine/runtime/readiness.ts), and release review names the change in words (engine/validate.ts diff). Combination
// keys are made up ("x.any", "y.other"), so no pathway is named. No database, no server, no model call (US$0). The
// routes (waive and Not applicable refused, Ready to file refused then allowed) are tests/check_m3s4_blocking_api.ts.
//   tsx studio/tests/check_m3s4_never_waivable.ts
import { Waiver } from "../contracts/documents.ts";
import type { Known } from "../engine/render.ts";
import { caseChecklist, type CaseChecklist } from "../engine/runtime/case-checklist.ts";
import type { Participant } from "../engine/runtime/case.ts";
import { BLOCK_CODES, cannotPass, CODE_WORDS, filingReadiness, type DocumentItem } from "../engine/runtime/readiness.ts";
import { readinessFigure } from "../engine/runtime/readiness-figure.ts";
import type { Snapshot } from "../engine/snapshot.ts";
import { diff } from "../engine/validate.ts";
import { releaseDiff, touchedFilings, whatChanges, type CaseInputs } from "../engine/runtime/release-update.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const TODAY = new Date("2026-11-11T12:00:00Z");
const req = (lineage: string, type: string, who: string, waiver?: string) => ({ lineage, document_type: type, document_type_key: type, who, provided_by: "client", base_or_conditional: "base", condition: null, condition_plain: null, source_quote: null, ...(waiver ? { waiver } : {}) });
const snap = (key: string, reqs: unknown[]) => ({ combination: { key }, canonical_fields: [{ id: "person.date_of_birth", value_type: "date" }], field_maps: [], derived_fields: [], placements: [], checks: [],
  document_types: [{ key: "police", name: "Police certificate" }, { key: "medical", name: "Medical exam confirmation" }, { key: "passport", name: "Passport" }], document_requirements: reqs }) as unknown as Snapshot;
const P = (id: string, role: Participant["role"]): Participant => ({ subjectId: id, role, label: `Client ${id}`, applies: true });
const PEOPLE = [P("case", "case"), P("A", "principal"), P("B", "spouse_or_partner")];
const known: Known = new Map([["A|person.date_of_birth", { value: "1985-01-01", status: "answered", source: "test" }], ["B|person.date_of_birth", { value: "1986-01-01", status: "answered", source: "test" }]] as never);
type D = Extract<CaseChecklist, { derived: true }>;
const line = (r: CaseChecklist, who: string, doc: string) => r.derived ? r.people.find((p) => p.subject === who)?.lines.find((l) => l.document.key === doc) : undefined;

// (1) P-425: the checklist is worked out for any combination from its release's lines; no combination list decides it.
{
  const any = caseChecklist(snap("x.any", [req("police:each", "police", "each_applicant", "never"), req("passport:each", "passport", "each_applicant")]), "x.any", PEOPLE, known, TODAY);
  ok("C6.4 M3-S4: guard gone pass: a combination no table names gets its checklist from its release (two people, two lines each)", any.derived === true && (any as D).people.length === 2 && (any as D).people.every((p) => p.lines.length === 2));
  const none = caseChecklist(snap("y.other", []), "y.other", PEOPLE, known, TODAY);
  ok("C6.4 M3-S4: guard gone fail: a release with no document lines gives empty lists and says the release is empty, never a guessed line", none.derived === true && (none as D).empty_release === true && (none as D).people.every((p) => p.lines.length === 0));
}

// (2) The line carries whether it is never waivable.
const blocking = caseChecklist(snap("x.any", [req("police:each", "police", "each_applicant", "never"), req("medical:each", "medical", "each_applicant", "waivable"), req("passport:each", "passport", "each_applicant")]), "x.any", PEOPLE, known, TODAY);
{
  ok("C6.4 M3-S4: line pass: the line configured never waivable says so for each person, and is not waivable", line(blocking, "A", "police")?.never_waivable === true && line(blocking, "B", "police")?.never_waivable === true && line(blocking, "A", "police")?.waivable === false);
  ok("C6.4 M3-S4: line fail: a waivable line and a plain line are not never waivable", line(blocking, "A", "medical")?.never_waivable === false && line(blocking, "A", "passport")?.never_waivable === false);
  const odd = caseChecklist(snap("x.any", [req("police:each", "police", "each_applicant", "Never ")]), "x.any", PEOPLE, known, TODAY);
  ok("C6.4 M3-S4: line fail: a waiver value other than never does not block", line(odd, "A", "police")?.never_waivable === false);
  const merged = caseChecklist(snap("x.any", [req("police:each", "police", "each_applicant", "waivable"), req("police:main", "police", "principal_applicant", "never")]), "x.any", PEOPLE, known, TODAY);
  ok("C6.4 M3-S4: merge pass: the principal's line merged from a waivable and a never-waivable requirement is never waivable, and not waivable", line(merged, "A", "police")?.never_waivable === true && line(merged, "A", "police")?.waivable === false, line(merged, "A", "police"));
  ok("C6.4 M3-S4: merge fail: the spouse's line from the waivable requirement alone stays waivable, not blocking", line(merged, "B", "police")?.never_waivable === false && line(merged, "B", "police")?.waivable === true);
  // Review M2: a never waivable requirement whose condition does not hold for the person never makes the line blocking.
  const cond = { ...req("police:old", "police", "each_applicant", "never"), base_or_conditional: "conditional", condition: { subjectKind: "PERSON", op: "eq", field: "person.date_of_birth", value: "1900-01-01" }, condition_plain: "born on 1 January 1900" };
  const notApplying = caseChecklist(snap("x.any", [req("police:each", "police", "each_applicant"), cond]), "x.any", PEOPLE, known, TODAY);
  ok("C6.4 M3-S4: merge fail (review M2): merged with a never waivable requirement that does not apply to the person, the needed line is not never waivable", line(notApplying, "A", "police")?.never_waivable === false && line(notApplying, "A", "police")?.need === "needed", line(notApplying, "A", "police"));
  const applying = caseChecklist(snap("x.any", [req("police:each", "police", "each_applicant"), { ...cond, condition: { ...cond.condition, value: "1985-01-01" } }]), "x.any", PEOPLE, known, TODAY);
  ok("C6.4 M3-S4: merge pass (review M2): when that requirement does apply, the line is never waivable", line(applying, "A", "police")?.never_waivable === true);
}

// (3) The setting's values (contracts/documents.ts Waiver).
{
  ok("C6.4 M3-S4: value pass: the line's waiver setting takes waivable, never or none", Waiver.safeParse("waivable").success && Waiver.safeParse("never").success && Waiver.safeParse(null).success);
  ok("C6.4 M3-S4: value fail: any other value is refused in words", !Waiver.safeParse("blocking").success && /waivable.*never/.test(JSON.stringify(Waiver.safeParse("blocking").error?.issues)));
}

// (4) Ready to file: a never waivable line not received is a block; any other missing document stays a warning.
{
  const doc = (label: string, o: Partial<DocumentItem>): DocumentItem => ({ item: label, label, subject: "A", person: "Client A", required: true, received: false, owes: "client", ...o });
  const at = (documents: DocumentItem[]) => filingReadiness({ filing: "F", forms: [], documents, reviewed: true, today: "2026-11-11" });
  const missing = at([doc("Police certificate", { never_waivable: true }), doc("Passport", {})]);
  ok("C7.6 M3-S4: block pass: the never waivable line not received blocks Ready to file, with its words, owed by the client", !missing.ready && missing.blocks.length === 1 && missing.blocks[0].code === "document_never_waivable" && missing.blocks[0].severity === "block" && missing.blocks[0].owes === "client" && /Client A: Police certificate not received/.test(missing.blocks[0].words) && /never be waived/.test(missing.blocks[0].words), missing.blocks);
  ok("C7.6 M3-S4: block fail: the plain missing line stays a warning (passed with a reason), never a block", missing.warns.some((w) => w.code === "missing_document" && w.item === "Passport") && !missing.warns.some((w) => w.item === "Police certificate"));
  const got = at([doc("Police certificate", { never_waivable: true, received: true })]);
  ok("C7.6 M3-S4: block fail: once received, the never waivable line no longer blocks, and Ready to file is allowed", got.ready && got.blocks.length === 0 && got.warns.length === 0, got);
  const notRequired = at([doc("Police certificate", { never_waivable: true, required: false })]);
  ok("C7.6 M3-S4: block pass: a never waivable line blocks even when its state made it not required (marked not applicable or waived before the release said never)", !notRequired.ready && notRequired.blocks.some((b) => b.code === "document_never_waivable"));
  // Review M1: the readiness figure counts the never waivable document as an item, open while it is not received.
  const fig = (documents: DocumentItem[]) => { const input = { filing: "F", forms: [], documents, reviewed: true, today: "2026-11-11" }; return readinessFigure(input, filingReadiness(input)); };
  const open = fig([doc("Police certificate", { never_waivable: true }), doc("Passport", { received: true })]).items.find((i) => i.kind === "document" && /Police certificate/.test(i.label));
  ok("C7.6 M3-S4: figure fail (review M1): the never waivable document not received is its document item, not done", !!open && open.done === false, fig([doc("Police certificate", { never_waivable: true })]).items);
  const was = fig([doc("Police certificate", { never_waivable: true, required: false })]).items.filter((i) => i.kind === "document");
  ok("C7.6 M3-S4: figure fail (review M1): marked not applicable before the release said never, it is still counted, not done", was.length === 1 && was[0].done === false, was);
  const done = fig([doc("Police certificate", { never_waivable: true, received: true })]).items.find((i) => i.kind === "document");
  ok("C7.6 M3-S4: figure pass (review M1): once received, it is done", !!done && done.done === true);
  // Break M1: a never waivable line that may be needed (its condition waits for an answer) blocks until that is known.
  const waiting = at([doc("Police certificate", { never_waivable: true, required: false, waiting: "Date of birth" })]);
  ok("C7.6 M3-S4: block pass (break M1): a never waivable line still waiting for an answer blocks, naming what to answer", !waiting.ready && waiting.blocks.length === 1 && waiting.blocks[0].code === "document_never_waivable" && /may be needed: answer Date of birth first/.test(waiting.blocks[0].words), waiting.blocks);
  const plainWaiting = at([doc("Passport", { required: false, waiting: "Date of birth" })]);
  ok("C7.6 M3-S4: block fail (break M1): a plain line waiting for an answer neither blocks nor warns (as before)", plainWaiting.ready && plainWaiting.warns.length === 0);
  ok("C7.6 M3-S4: pass refused: the block cannot be passed with a reason, in words", BLOCK_CODES.includes("document_never_waivable") && /cannot be passed/.test(cannotPass("document_never_waivable") ?? "") && !!CODE_WORDS.document_never_waivable);
}

// (6) Break M3: moving a case to a release that makes a line never waivable says so before the move, and touches the filing.
{
  const r = (waiver?: string) => ({ forms: [], document_requirements: [{ lineage: "passport:each", document_type_key: "passport", document_type: "Passport", who: "each_applicant", ...(waiver ? { waiver } : {}) }, { lineage: "photo:each", document_type_key: "photo", document_type: "Photo", who: "each_applicant" }] });
  const side = { forms: new Map(), documents: new Map([["A", new Map([["passport", "Passport"], ["photo", "Photo"]])]]), questions: new Map() };
  const x: CaseInputs = { people: [{ id: "A", label: "Client A" }], from: side, to: side, answered: [] };
  const d = releaseDiff(r() as never, r("never") as never), back = releaseDiff(r("never") as never, r() as never);
  const line = whatChanges(d, x).documents.find((l) => l.what === "Passport");
  ok("C6.4 M3-S4: move pass (break M3): what changes names the passport as never waivable now, for Client A", !!line && /never waivable/i.test(line.kind) && line.who.join() === "Client A" && /blocks Ready to file until received/i.test(line.after), whatChanges(d, x).documents);
  const t = touchedFilings(d, x, [{ id: "F", people: ["A"] }], { to: "Release 7" }).get("F") ?? [];
  ok("C6.4 M3-S4: move pass (break M3): the filing is touched, in words", t.some((w) => /Release 7 makes Passport never waivable/.test(w)), t);
  const off = whatChanges(back, x).documents.find((l) => l.what === "Passport");
  ok("C6.4 M3-S4: move pass (break M3): the other way, it says the line no longer blocks", !!off && /blocks Ready to file until received/i.test(off.before) && !/blocks/i.test(off.after), off);
  const same = releaseDiff(r("never") as never, r("never") as never);
  ok("C6.4 M3-S4: move fail (break M3): a release with the same setting changes nothing for the case", whatChanges(same, x).documents.length === 0 && (touchedFilings(same, x, [{ id: "F", people: ["A"] }], { to: "Release 7" }).get("F") ?? []).length === 0);
}

// (5) The second person sees the setting at release review, in words (engine/validate.ts diff).
{
  const before = snap("x.any", [req("police:each", "police", "each_applicant"), req("passport:each", "passport", "each_applicant")]);
  const after = snap("x.any", [req("police:each", "police", "each_applicant", "never"), req("passport:each", "passport", "each_applicant")]);
  const on = diff(before, after).find((c) => c.key === "police:each"), off = diff(after, before).find((c) => c.key === "police:each");
  ok("C6.4 M3-S4: review pass: making a line never waivable shows in its change, in words", on?.change === "changed" && /now never waivable: it blocks Ready to file until received/.test(on.label), on);
  ok("C6.4 M3-S4: review pass: taking it off shows too", off?.change === "changed" && /no longer blocks Ready to file/.test(off.label), off);
  const added = diff(before, snap("x.any", [req("police:each", "police", "each_applicant"), req("passport:each", "passport", "each_applicant"), req("medical:each", "medical", "each_applicant", "never")])).find((c) => c.key === "medical:each");
  ok("C6.4 M3-S4: review pass: a new never waivable line says so when added", added?.change === "added" && /never waivable/.test(added.label), added);
  ok("C6.4 M3-S4: review fail: a line whose waiver did not change says nothing about it", !diff(before, after).some((c) => c.key === "passport:each"));
}

process.exitCode = summary() ? 1 : 0;
