// C6.12 (M3-B, runtime lane; P-171, P-135; M3 case view r5c BR-1, BR-16, BR-18): a case's filings, submission group and
// fee lines, derived from its pinned release's combination and its people on every read (nothing stored, nothing typed by
// hand). The case officer reads them; a client and configuration people do not (deny by default, as runtime.ts). Any
// combination its release and the fee table describe (P-425). Amounts Sample until the expert confirms. US$0.
import { Controller, Get, Headers, HttpStatus, Inject, Injectable, Param } from "@nestjs/common";
import { checkValue, knownOf } from "../../engine/runtime/case.ts";
import { addedFilings } from "../../engine/runtime/added-filings.ts";
import { releaseModes } from "../../engine/filing-modes.ts";
import { ageOn, deriveFilings, FAMILY_GROUP } from "../../engine/runtime/filings.ts";
import { actorOf, CaseRead, Db, fail, type Actor } from "./core.ts";
import { Runtime, type Reached } from "./runtime.ts";
import type { Participant } from "../../engine/runtime/case.ts";
import { caseName } from "../../contracts/runtime.ts"; // A24-1: the reference, else the case number
import { feesOnTheirFilings, heldBy, keepRecorded, keptRowsOf } from "./submission-record.ts";

type H = string | undefined;

@Injectable()
export class CaseFilings {
  constructor(@Inject(Runtime) private readonly r: Runtime, @Inject(Db) private readonly db: Db) {}

  async list(actor: Actor, caseId: string) {
    const c = await this.r.reach(actor, caseId, "officer");
    return this.deriveFor(c, this.r.peopleOf(c));
  }

  /** C6.13 (M7): the one derivation, for the case's people as they are or as a filing change would make them, so the
   *  change's preview and this view never price a case differently. */
  async deriveFor(c: Reached, people: Participant[]) {
    const s = this.r.snapshotOf(c), pin = c.pins[0];
    // Money follows the combination: the release's snapshot must name the case's own combination (break report M2: a
    // release row edited underneath would otherwise price the case as another combination).
    const own = await this.db.combination.findUnique({ where: { id: c.combinationId }, select: { combinationKey: true } });
    if (!own || s?.combination?.key !== own.combinationKey) fail("This case's release does not describe the case's own combination; no filing or fee was worked out. Ask the Lead.", HttpStatus.CONFLICT);
    // C6.12 (prepare view): the same ages, filing modes and stored submission groups as GET …/prepare, so the two never
    // price a case differently (read only: the prepare view stores the filings).
    const today = new Date();
    const { answers, rows: answerRows } = await this.r.state(c);
    const ages = new Map(people.filter((p) => p.role !== "case").map((p) => [p.subjectId, ageOn(answers.find((a) => a.subjectId === p.subjectId && a.field === "person.date_of_birth" && !a.rowKey && checkValue(s, a.field, a.value, today).length === 0)?.value as string | undefined, today)]));
    const modes = releaseModes(s.combination.participants ?? []); // C11.12: the same reading as GET …/prepare
    // M3-S2: the filings people's lines add, from the same answers as GET …/prepare (an answer its checks reject decides nothing).
    const adds = addedFilings(s, knownOf(s, people, answers.filter((a) => checkValue(s, a.field, a.value, today).length === 0), answerRows, today).known, people);
    const rows = await this.db.filing.findMany({ where: { caseId: c.id, stageId: c.stage.id, active: true }, include: { group: { select: { kind: true, recordedFees: true } }, applicants: true } });
    // Review m5: the stored group's own id, as GET …/prepare shows it ("group-family" only before the first prepare read).
    const groupOf = new Map(rows.map((f) => [f.subjectId, f.submissionGroupId]));
    const kindOf = new Map(rows.map((f) => [f.submissionGroupId, f.group.kind === "FAMILY" ? "family" as const : "separate" as const]));
    const family = rows.find((f) => f.group.kind === "FAMILY")?.submissionGroupId ?? FAMILY_GROUP;
    const d = deriveFilings(own!.combinationKey, people, undefined, { ages, modes, adds, label: s.combination.label, groupOf: (x) => groupOf.get(x) ?? family, groupKind: (g) => kindOf.get(g) ?? "family" });
    // BK-17: a recorded filing reads as recorded here too (its label, people and group), as GET …/prepare reads it.
    const name = new Map(people.map((p) => [p.subjectId, p.label]));
    const keptRows = d.derived ? keptRowsOf(d.filings, rows, rows.map((r) => r.group)) : [];
    const kept = d.derived ? keepRecorded(d, keptRows, { labelOf: (x) => name.get(x) ?? "", combination: own!.combinationKey, combinationLabel: d.label, idOf: (r) => `filing-${r.subjectId}`, kindOf: (g) => kindOf.get(g) ?? "family" }) : null;
    const frozen = new Set(rows.filter((r) => r.group.recordedFees).map((r) => r.submissionGroupId));
    const placed = kept && d.derived ? feesOnTheirFilings(d.fees, kept.groups, kept.filings, { filing: (l) => l.filing, person: (l) => l.person, frozen: (g) => frozen.has(g), labelOf: (x) => name.get(x) ?? "a person", held: heldBy(keptRows) }) : null;
    const shown = kept && placed && d.derived ? { ...d, filings: kept.filings, groups: placed.groups, fees: placed.lines } as typeof d : d;
    return { case_id: c.id, reference: caseName(c), release_version: pin.release.version, ...frozenIn(shown, rows) };
  }
}

type Recorded = { at: string; totals: unknown[]; total_cents: number | null; fees: { filing: string; subject: string; payer: string; key: string; line: string; amount_cents: number; exempt: boolean; reason: string; waiting?: string; source_detail?: unknown }[] };
/** B152 (break M1, review m2): a recorded group reads its fees as recorded here too, so GET …/filings and GET …/prepare
 *  never price a case differently. The snapshot holds the prepare view's lines (stored filing ids); this route names a
 *  filing "filing-<owner>" and a line in the engine's words, so each line is mapped back. */
function frozenIn<D extends ReturnType<typeof deriveFilings>>(d: D, rows: { id: string; subjectId: string; submissionGroupId: string; group: { recordedFees: unknown } }[]): D {
  if (!d.derived) return d;
  const snap = new Map(rows.filter((r) => r.group.recordedFees).map((r) => [r.submissionGroupId, r.group.recordedFees as Recorded]));
  if (!snap.size) return d;
  const derivedId = new Map(rows.map((r) => [r.id, `filing-${r.subjectId}`]));
  const frozenGroups = d.groups.filter((g) => snap.has(g.id)), frozenFilings = new Set(frozenGroups.flatMap((g) => g.filings));
  const lines = frozenGroups.flatMap((g) => snap.get(g.id)!.fees.map((l) => ({ filing: derivedId.get(l.filing) ?? l.filing, person: l.subject, payer: l.payer, line: l.key, label: l.line, amount_cents: l.amount_cents, exempt: l.exempt, why: l.reason,
    ...(l.waiting ? { waiting: l.waiting } : {}), ...((l.exempt || l.waiting) && l.source_detail ? { source: l.source_detail } : {}) })));
  return { ...d, groups: d.groups.map((g) => { const f = snap.get(g.id); return f ? { ...g, totals: f.totals, total_cents: f.total_cents, fees_recorded: { at: f.at } } : g; }), fees: [...d.fees.filter((l) => !frozenFilings.has(l.filing)), ...lines] } as D;
}

@CaseRead()
@Controller("api/runtime")
export class CaseFilingsController {
  constructor(@Inject(CaseFilings) private readonly f: CaseFilings) {}
  @Get("cases/:id/filings") list(@Headers("x-actor") a: H, @Param("id") id: string) { return this.f.list(actorOf(a), id); }
}
