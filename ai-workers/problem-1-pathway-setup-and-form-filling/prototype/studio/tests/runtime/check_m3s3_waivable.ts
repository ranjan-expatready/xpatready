// M3-S3 checks (P-171 (6), P-380, P-425): a document line configured as waivable, on any combination. Each rule has a
// passing and a failing case: the line carries `waivable` from the release (engine/runtime/case-checklist.ts), a line
// merged from two requirements is waivable only when both are, the "not derived yet" guard narrows to releases with no
// waivable line, and the waiver's request needs a reason (contracts/documents.ts Waive) from the states Not applicable
// takes. Made-up combination key ("x.pr_any", not the fee table's): no pathway is named. No database, no server, no
// model call (US$0). The route itself (POST /runtime/checklist-lines/:id/waive) is api/src/case-checklist.ts waive.
//   tsx studio/tests/runtime/check_m3s3_waivable.ts
import { LINE_STATES, NOT_APPLICABLE_FROM, REQUEST_FROM, STATE_WORDS, WAIVE_FROM, Waive } from "../../contracts/documents.ts";
import type { Known } from "../../engine/render.ts";
import { caseChecklist, DERIVED_FOR, type CaseChecklist } from "../../engine/runtime/case-checklist.ts";
import type { Participant } from "../../engine/runtime/case.ts";
import type { Snapshot } from "../../engine/snapshot.ts";
import { recorder } from "./api.ts";

const { ok, summary } = recorder();
const TODAY = new Date("2026-11-11T12:00:00Z");
const KEY = "x.pr_any";
const req = (lineage: string, type: string, who: string, waiver?: string) => ({ lineage, document_type: type, document_type_key: type, who, provided_by: "client", base_or_conditional: "base", condition: null, condition_plain: null, source_quote: null, ...(waiver ? { waiver } : {}) });
const snap = (reqs: unknown[]) => ({ combination: { key: KEY }, canonical_fields: [{ id: "person.date_of_birth", value_type: "date" }], field_maps: [], derived_fields: [], placements: [], checks: [],
  document_types: [{ key: "police", name: "Police certificate" }, { key: "passport", name: "Passport" }], document_requirements: reqs }) as unknown as Snapshot;
const P = (id: string, role: Participant["role"]): Participant => ({ subjectId: id, role, label: `Client ${id}`, applies: true });
const PEOPLE = [P("case", "case"), P("A", "principal"), P("B", "spouse_or_partner")];
const known: Known = new Map([["A|person.date_of_birth", { value: "1985-01-01", status: "answered", source: "test" }], ["B|person.date_of_birth", { value: "1986-01-01", status: "answered", source: "test" }]] as never);
type D = Extract<CaseChecklist, { derived: true }>;
const line = (r: CaseChecklist, who: string, doc: string) => r.derived ? r.people.find((p) => p.subject === who)?.lines.find((l) => l.document.key === doc) : undefined;

ok("setup: the made-up combination is not marked derived in the fee table", !DERIVED_FOR.has(KEY));

// (1) The guard narrows: a release with a waivable line has its checklist worked out, on any combination.
{
  const withWaiver = caseChecklist(snap([req("police:each", "police", "each_applicant", "waivable"), req("passport:each", "passport", "each_applicant")]), KEY, PEOPLE, known, TODAY);
  ok("guard pass: a release with a line marked waivable has its per-person checklist worked out (not the fee table's)", withWaiver.derived === true && (withWaiver as D).people.length === 2, withWaiver.derived ? undefined : withWaiver.why);
  const without = caseChecklist(snap([req("police:each", "police", "each_applicant"), req("passport:each", "passport", "each_applicant")]), KEY, PEOPLE, known, TODAY);
  ok("guard fail: with no waivable line, the combination is still not derived, in words", without.derived === false && /not derived yet/.test(without.why), without);
  const bad = caseChecklist(snap([req("police:each", "police", "each_applicant", "maybe")]), KEY, PEOPLE, known, TODAY);
  ok("guard fail: a waiver value other than waivable does not count", bad.derived === false);

  // (2) The line carries whether it may be waived.
  ok("line pass: the line marked waivable is waivable for each person", line(withWaiver, "A", "police")?.waivable === true && line(withWaiver, "B", "police")?.waivable === true);
  ok("line fail: a line not marked waivable is not", line(withWaiver, "A", "passport")?.waivable === false);
  // (3) Merged: two requirements for one document on one person are one line, waivable only when both are.
  const merged = caseChecklist(snap([req("police:each", "police", "each_applicant", "waivable"), req("police:main", "police", "principal_applicant"), req("passport:x", "passport", "each_applicant", "waivable")]), KEY, PEOPLE, known, TODAY);
  ok("merge fail: the principal's police line merged from a waivable and a not-waivable requirement is not waivable", line(merged, "A", "police")?.waivable === false && (line(merged, "A", "police")?.also_from.length ?? 0) === 1, line(merged, "A", "police"));
  ok("merge pass: the spouse's line from the waivable requirement alone stays waivable", line(merged, "B", "police")?.waivable === true);
}

// (4) The waiver's request and states (contracts/documents.ts).
{
  ok("state pass: Waived is a state with the team-style words", LINE_STATES.includes("waived") && STATE_WORDS.waived === "Waived");
  ok("from pass: a line may be waived from the states Not applicable takes, and requested again after (taking the waiver back)", WAIVE_FROM.join() === NOT_APPLICABLE_FROM.join() && REQUEST_FROM.includes("waived"));
  ok("from fail: a waived line cannot be waived again or marked not applicable", !WAIVE_FROM.includes("waived") && !NOT_APPLICABLE_FROM.includes("waived"));
  const empty = Waive.safeParse({ reason: "  ​ " });
  ok("reason fail: a waiver without a reason (or only invisible characters) is refused in words", !empty.success && /reason for waiving/.test(JSON.stringify(empty.error?.issues)));
  const good = Waive.safeParse({ reason: " Lives abroad; no certificate can be obtained (Sample) ", version: 2 });
  ok("reason pass: a waiver with a reason is accepted, trimmed", good.success && good.data.reason === "Lives abroad; no certificate can be obtained (Sample)" && good.data.version === 2);
}

process.exitCode = summary() ? 1 : 0;
