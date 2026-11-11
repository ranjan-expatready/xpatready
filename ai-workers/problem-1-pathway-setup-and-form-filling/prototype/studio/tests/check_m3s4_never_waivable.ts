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
import type { Snapshot } from "../engine/snapshot.ts";
import { diff } from "../engine/validate.ts";
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
  ok("guard gone pass: a combination no table names gets its checklist from its release (two people, two lines each)", any.derived === true && (any as D).people.length === 2 && (any as D).people.every((p) => p.lines.length === 2), any.derived ? undefined : any.why);
  const none = caseChecklist(snap("y.other", []), "y.other", PEOPLE, known, TODAY);
  ok("guard gone fail: a release with no document lines gives empty lists and says the release is empty, never a guessed line", none.derived === true && (none as D).empty_release === true && (none as D).people.every((p) => p.lines.length === 0));
}

// (2) The line carries whether it is never waivable.
const blocking = caseChecklist(snap("x.any", [req("police:each", "police", "each_applicant", "never"), req("medical:each", "medical", "each_applicant", "waivable"), req("passport:each", "passport", "each_applicant")]), "x.any", PEOPLE, known, TODAY);
{
  ok("line pass: the line configured never waivable says so for each person, and is not waivable", line(blocking, "A", "police")?.never_waivable === true && line(blocking, "B", "police")?.never_waivable === true && line(blocking, "A", "police")?.waivable === false);
  ok("line fail: a waivable line and a plain line are not never waivable", line(blocking, "A", "medical")?.never_waivable === false && line(blocking, "A", "passport")?.never_waivable === false);
  const odd = caseChecklist(snap("x.any", [req("police:each", "police", "each_applicant", "Never ")]), "x.any", PEOPLE, known, TODAY);
  ok("line fail: a waiver value other than never does not block", line(odd, "A", "police")?.never_waivable === false);
  const merged = caseChecklist(snap("x.any", [req("police:each", "police", "each_applicant", "waivable"), req("police:main", "police", "principal_applicant", "never")]), "x.any", PEOPLE, known, TODAY);
  ok("merge pass: the principal's line merged from a waivable and a never-waivable requirement is never waivable, and not waivable", line(merged, "A", "police")?.never_waivable === true && line(merged, "A", "police")?.waivable === false, line(merged, "A", "police"));
  ok("merge fail: the spouse's line from the waivable requirement alone stays waivable, not blocking", line(merged, "B", "police")?.never_waivable === false && line(merged, "B", "police")?.waivable === true);
}

// (3) The setting's values (contracts/documents.ts Waiver).
{
  ok("value pass: the line's waiver setting takes waivable, never or none", Waiver.safeParse("waivable").success && Waiver.safeParse("never").success && Waiver.safeParse(null).success);
  ok("value fail: any other value is refused in words", !Waiver.safeParse("blocking").success && /waivable.*never/.test(JSON.stringify(Waiver.safeParse("blocking").error?.issues)));
}

// (4) Ready to file: a never waivable line not received is a block; any other missing document stays a warning.
{
  const doc = (label: string, o: Partial<DocumentItem>): DocumentItem => ({ item: label, label, subject: "A", person: "Client A", required: true, received: false, owes: "client", ...o });
  const at = (documents: DocumentItem[]) => filingReadiness({ filing: "F", forms: [], documents, reviewed: true, today: "2026-11-11" });
  const missing = at([doc("Police certificate", { never_waivable: true }), doc("Passport", {})]);
  ok("block pass: the never waivable line not received blocks Ready to file, with its words, owed by the client", !missing.ready && missing.blocks.length === 1 && missing.blocks[0].code === "document_never_waivable" && missing.blocks[0].severity === "block" && missing.blocks[0].owes === "client" && /Client A: Police certificate not received/.test(missing.blocks[0].words) && /never be waived/.test(missing.blocks[0].words), missing.blocks);
  ok("block fail: the plain missing line stays a warning (passed with a reason), never a block", missing.warns.some((w) => w.code === "missing_document" && w.item === "Passport") && !missing.warns.some((w) => w.item === "Police certificate"));
  const got = at([doc("Police certificate", { never_waivable: true, received: true })]);
  ok("block fail: once received, the never waivable line no longer blocks, and Ready to file is allowed", got.ready && got.blocks.length === 0 && got.warns.length === 0, got);
  const notRequired = at([doc("Police certificate", { never_waivable: true, required: false })]);
  ok("block pass: a never waivable line blocks even when its state made it not required (marked not applicable or waived before the release said never)", !notRequired.ready && notRequired.blocks.some((b) => b.code === "document_never_waivable"));
  ok("pass refused: the block cannot be passed with a reason, in words", BLOCK_CODES.includes("document_never_waivable") && /cannot be passed/.test(cannotPass("document_never_waivable") ?? "") && !!CODE_WORDS.document_never_waivable);
}

// (5) The second person sees the setting at release review, in words (engine/validate.ts diff).
{
  const before = snap("x.any", [req("police:each", "police", "each_applicant"), req("passport:each", "passport", "each_applicant")]);
  const after = snap("x.any", [req("police:each", "police", "each_applicant", "never"), req("passport:each", "passport", "each_applicant")]);
  const on = diff(before, after).find((c) => c.key === "police:each"), off = diff(after, before).find((c) => c.key === "police:each");
  ok("review pass: making a line never waivable shows in its change, in words", on?.change === "changed" && /now never waivable: it blocks Ready to file until received/.test(on.label), on);
  ok("review pass: taking it off shows too", off?.change === "changed" && /no longer blocks Ready to file/.test(off.label), off);
  const added = diff(before, snap("x.any", [req("police:each", "police", "each_applicant"), req("passport:each", "passport", "each_applicant"), req("medical:each", "medical", "each_applicant", "never")])).find((c) => c.key === "medical:each");
  ok("review pass: a new never waivable line says so when added", added?.change === "added" && /never waivable/.test(added.label), added);
  ok("review fail: a line whose waiver did not change says nothing about it", !diff(before, after).some((c) => c.key === "passport:each"));
}

process.exitCode = summary() ? 1 : 0;
