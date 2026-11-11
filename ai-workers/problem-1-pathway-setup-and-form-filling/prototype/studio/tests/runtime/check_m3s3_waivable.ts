// M3-S3 checks (P-171 (6), P-380, P-425): a document line configured as waivable, on any combination. Each rule has a
// passing and a failing case: the line carries `waivable` from the release (engine/runtime/case-checklist.ts), a line
// merged from two requirements is waivable only when both are, a waiver never switches the "not derived yet" guard (the
// fee table's data mark; review M1), the waiver's request needs a reason (contracts/documents.ts Waive) from the states
// Not applicable takes, and release review names a change of waiver in words (engine/validate.ts diff; break M3).
// Combination keys: a made-up one ("x.pr_any") and the fee table's first marked non-Visitor one, read from the data, so
// no pathway is named. No database, no server, no
// model call (US$0). The route itself (POST /runtime/checklist-lines/:id/waive) is api/src/case-checklist.ts waive.
//   tsx studio/tests/runtime/check_m3s3_waivable.ts
import { LINE_STATES, NOT_APPLICABLE_FROM, REQUEST_FROM, STATE_WORDS, WAIVE_FROM, Waive } from "../../contracts/documents.ts";
import type { Known } from "../../engine/render.ts";
import { caseChecklist, DERIVED_FOR, type CaseChecklist } from "../../engine/runtime/case-checklist.ts";
import type { Participant } from "../../engine/runtime/case.ts";
import type { Snapshot } from "../../engine/snapshot.ts";
import { diff } from "../../engine/validate.ts";
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
// A combination the fee table marks derived other than the Visitor visa (a non-Visitor line), read from the data.
const ON = [...DERIVED_FOR].find((k) => k !== "vv.single") ?? "";
ok("setup: the fee table marks a non-Visitor combination derived", !!ON, [...DERIVED_FOR]);

// (1) Review M1 / break M1: the waiver never switches the checklist on or off; that stays the fee table's data mark.
{
  const reqs = [req("police:each", "police", "each_applicant", "waivable"), req("passport:each", "passport", "each_applicant")];
  const off = caseChecklist(snap(reqs), KEY, PEOPLE, known, TODAY);
  ok("guard fail: a waivable line does not work out the checklist of a combination the fee table does not mark", off.derived === false && /not derived yet/.test(off.why), off.derived);
  const unticked = caseChecklist(snap([req("police:each", "police", "each_applicant"), req("passport:each", "passport", "each_applicant")]), ON, PEOPLE, known, TODAY);
  ok("guard pass: with no waivable line, a marked combination's checklist is still worked out (unticking never hides it)", unticked.derived === true && (unticked as D).people.length === 2);
}
const withWaiver = caseChecklist(snap([req("police:each", "police", "each_applicant", "waivable"), req("passport:each", "passport", "each_applicant")]), ON, PEOPLE, known, TODAY);
{
  // (2) The line carries whether it may be waived.
  ok("line pass: the line marked waivable is waivable for each person", line(withWaiver, "A", "police")?.waivable === true && line(withWaiver, "B", "police")?.waivable === true);
  ok("line fail: a line not marked waivable is not", line(withWaiver, "A", "passport")?.waivable === false);
  const odd = caseChecklist(snap([req("police:each", "police", "each_applicant", "maybe")]), ON, PEOPLE, known, TODAY);
  ok("line fail: a waiver value other than waivable does not count", line(odd, "A", "police")?.waivable === false);
  // (3) Merged: two requirements for one document on one person are one line, waivable only when both are.
  const merged = caseChecklist(snap([req("police:each", "police", "each_applicant", "waivable"), req("police:main", "police", "principal_applicant"), req("passport:x", "passport", "each_applicant", "waivable")]), ON, PEOPLE, known, TODAY);
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

// (5) Break M3: the second person sees the waiver at release review, in words (engine/validate.ts diff).
{
  const before = snap([req("police:each", "police", "each_applicant"), req("passport:each", "passport", "each_applicant")]);
  const after = snap([req("police:each", "police", "each_applicant", "waivable"), req("passport:each", "passport", "each_applicant")]);
  const on = diff(before, after).find((c) => c.key === "police:each"), off = diff(after, before).find((c) => c.key === "police:each");
  ok("review pass: marking a line waivable shows in its change, in words", on?.change === "changed" && /now waivable by the case officer/.test(on.label), on);
  ok("review pass: taking it off shows too", off?.change === "changed" && /no longer waivable/.test(off.label), off);
  ok("review fail: a line whose waiver did not change says nothing about it", !diff(before, after).some((c) => c.key === "passport:each"));
}

process.exitCode = summary() ? 1 : 0;
