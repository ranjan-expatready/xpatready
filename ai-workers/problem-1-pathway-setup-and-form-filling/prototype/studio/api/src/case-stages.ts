// C6.17 A multi-stage case (B139, M3; concept screens/B139/concept.md BR-1..BR-11; challenge B1-B3, M1-M5, m1-m6;
// founder P-412 F13; SA-1B-64, -66, -67, -68 rule 1, -212; AG-7-45 rule 2). One case, stages in sequence: the case's
// stages (GET), one stage's own record read only (GET), what "Start next stage" will do (GET, computed, writes nothing),
// the start itself (POST: one transaction under the case's row lock), and a stage's key details (PUT, done-before stages).
// Case staff of the case's firm only: a client and configuration people 403, another firm 404 (Runtime.reach). Rules
// only, identical with AI off; no model call (US$0). Every route, key detail and deadline is Sample (P-412 F13).
import { Body, Controller, Get, Headers, HttpCode, HttpException, HttpStatus, Inject, Injectable, Param, Post, Put } from "@nestjs/common";
import { z } from "zod";
import { problemFromZod } from "../../contracts/programs.ts";
import { releaseLabel, StageKeyDetails, StartNext, type CaseStages, type CaseStageView, type StartNextPreview } from "../../contracts/runtime.ts";
import { caseView, checkValue, knownOf, shapeOf, type Participant } from "../../engine/runtime/case.ts";
import { caseChecklist } from "../../engine/runtime/case-checklist.ts";
import { checkKeyDetails, deadlineOf, fmtDate, nextOf, STAGE_WORDS, type StageState, type StoredDetail } from "../../engine/runtime/stages.ts";
import type { Snapshot } from "../../engine/snapshot.ts";
import { actorOf, Audit, CaseRead, Db, fail, type Actor } from "./core.ts";
import { Programs } from "./programs.ts";
import { readSpec } from "./routes-data.ts";
import { Runtime, STAGE_RECORD, type Reached } from "./runtime.ts";

type H = string | undefined;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NO_ID = "00000000-0000-0000-0000-000000000000";
const short = (id: string) => id.slice(0, 8);
const parse = <S extends z.ZodType>(schema: S, input: unknown): z.infer<S> => { const r = schema.safeParse(input ?? {}); if (!r.success) throw new HttpException(problemFromZod(r.error), HttpStatus.BAD_REQUEST); return r.data; };
const fieldError = (field: string, message: string): never => { throw new HttpException({ type: "https://expatready.local/problems/validation", title: "Some details need fixing", status: 400, detail: message, errors: [{ field, message }] }, HttpStatus.BAD_REQUEST); };
const problem = (status: number, title: string, detail: string, extra: Record<string, unknown> = {}): never => { throw new HttpException({ type: "https://expatready.local/problems/case-stage", title, status, detail, ...extra }, status); };
const stale = (): never => problem(409, "Changed by someone else", "This case's stages changed since you read them: read the case again. Nothing was changed.", { code: "stale" });
/** A placeholder id for the next stage's application subject while it does not exist yet (the preview only). */
const NEXT_APPLICATION = "00000000-0000-4000-8000-00000000c617";
type StageRowDb = Reached["stages"][number];

@Injectable()
export class CaseStagesService {
  constructor(@Inject(Runtime) private readonly r: Runtime, @Inject(Db) private readonly db: Db, @Inject(Audit) private readonly audit: Audit, @Inject(Programs) private readonly programs: Programs) {}

  private reach(actor: Actor, caseId: string) { return this.r.reach(actor, UUID.test(caseId) ? caseId : NO_ID, "officer"); }

  /** The newest release of a stage's combination and why it cannot start (retired, no release, not startable). */
  private async startability(combinationId: string) {
    const combination = await this.db.combination.findUnique({ where: { id: combinationId }, select: { label: true, retiredAt: true } });
    const release = await this.db.configRelease.findFirst({ where: { combinationId }, orderBy: { version: "desc" }, include: { packVersion: { select: { version: true } } } });
    if (!combination) return { release: null, why: "Cannot start yet: its combination is gone." };
    if (combination.retiredAt) return { release, why: `Cannot start yet: "${combination.label}" was retired by a release.` };
    if (!release) return { release: null, why: `Cannot start yet: "${combination.label}" has no released version.` };
    const missing = await this.programs.startableMissing(combinationId, release);
    return { release, why: missing.length ? `Cannot start yet: its release is not ready for cases (${missing.length === 1 ? "1 item" : `${missing.length} items`}).` : null };
  }

  private async views(c: Reached): Promise<CaseStageView[]> {
    const labels = new Map((await this.db.combination.findMany({ where: { id: { in: c.stages.map((s) => s.combinationId) } }, select: { id: true, label: true } })).map((x) => [x.id, x.label]));
    const all = c.stages.map((s) => ({ stage_key: s.stageKey, staff_name: s.staffName, key_details: s.keyDetails as Record<string, StoredDetail>, defs: readSpec(s.spec).key_details }));
    const { next } = nextOf(c.stages.map((s) => ({ ...s, stage_key: s.stageKey, state: s.state as StageState })));
    return Promise.all(c.stages.map(async (s): Promise<CaseStageView> => {
      const spec = readSpec(s.spec), stored = s.keyDetails as Record<string, StoredDetail>;
      const why = s.state === "NOT_STARTED" ? (await this.startability(s.combinationId)).why : null;
      const deadline = s.state === "CURRENT" || s.state === "NOT_STARTED" ? deadlineOf(spec.deadline, all) : null;
      return { id: s.id, key: s.stageKey, name: s.staffName, client_name: s.clientName, combination_id: s.combinationId, combination: labels.get(s.combinationId) ?? s.staffName, ord: s.ord,
        state: s.state as StageState, words: why ? "Cannot start yet" : STAGE_WORDS[s.state as StageState], cannot_start_why: why, started_from: s.startedFrom as CaseStageView["started_from"],
        started_at: s.startedAt?.toISOString() ?? null, ended_at: s.endedAt?.toISOString() ?? null, version: s.version,
        key_details: spec.key_details.map((d) => ({ field: d.field, label: d.label, type: d.type, value: stored[d.field]?.value ?? null, by: stored[d.field] ? "entered by the case officer" : null, same_every_stage: !!d.same_every_stage })),
        deadline };
    }));
  }

  /** GET /runtime/cases/:id/stages: the case's stages, the current one and the next one (if any). */
  async stages(actor: Actor, caseId: string): Promise<CaseStages> {
    const c = await this.reach(actor, caseId);
    const route = c.stage.routeKey ? await this.db.route.findFirst({ where: { workspaceId: c.workspaceId, key: c.stage.routeKey }, select: { key: true, label: true, basis: true } }) : null;
    const { next } = nextOf(c.stages.map((s) => ({ ...s, stage_key: s.stageKey, state: s.state as StageState })));
    return { case_id: c.id, route: route ?? (c.stage.routeKey ? { key: c.stage.routeKey, label: c.stage.routeKey, basis: "SAMPLE" } : null), stages: await this.views(c), current: c.stage.id, next: next?.id ?? null };
  }

  /** GET /runtime/cases/:id/stages/:stage: one stage's own record, read only (BR-6, m2): its key details, its filings with
   *  their numbers and records, and its own documents (uploaded on its lines, before it ended; never later uploads). */
  async stage(actor: Actor, caseId: string, stageId: string) {
    const c = await this.reach(actor, caseId);
    const s = c.stages.find((x) => x.id === stageId);
    if (!s) fail("No such stage on this case.", HttpStatus.NOT_FOUND);
    const view = (await this.views(c)).find((x) => x.id === stageId)!;
    const people = new Map(c.participants.map((p) => [p.subjectId, p.subject.label]));
    const filings = await this.db.filing.findMany({ where: { caseId: c.id, stageId: s!.id }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], include: { record: { select: { submittedOn: true, applicationNumber: true } } } });
    const lines = await this.db.checklistLine.findMany({ where: { caseId: c.id, stageId: s!.id }, orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      include: { documents: { where: s!.endedAt ? { uploadedAt: { lte: s!.endedAt } } : {}, orderBy: { uploadedAt: "asc" }, select: { id: true, fileName: true, documentType: true, uploadedAt: true } } } });
    return { ...view, read_only: s!.state !== "CURRENT",
      filings: filings.map((f) => ({ id: f.id, person: people.get(f.subjectId) ?? "A person", status: f.status, active: f.active, application_number: f.record?.applicationNumber ?? f.applicationNumber ?? null, recorded_on: f.record?.submittedOn?.toISOString().slice(0, 10) ?? null })),
      documents: lines.flatMap((l) => l.documents.map((d) => ({ id: d.id, person: people.get(l.subjectId) ?? "A person", document_type: d.documentType, file_name: d.fileName, uploaded_at: d.uploadedAt.toISOString() }))),
      lines: lines.map((l) => ({ person: people.get(l.subjectId) ?? "A person", document_type: l.documentType, state: l.state })) };
  }

  /** BR-4: what "Start next stage" will do, worked out before the click (writes nothing). */
  async preview(actor: Actor, caseId: string): Promise<StartNextPreview> { const c = await this.reach(actor, caseId); return this.compute(c); }

  private async compute(c: Reached): Promise<StartNextPreview & { _release?: { id: string; packVersionId: string | null; sha256: string; version: number } }> {
    const rows = c.stages.map((s) => ({ ...s, stage_key: s.stageKey, state: s.state as StageState }));
    const { current, next } = nextOf(rows);
    const views = await this.views(c), curView = views.find((v) => v.id === c.stage.id)!;
    const base = { from: { stage: c.stage.id, name: c.stage.staffName, version: c.stage.version }, key_details: curView.key_details };
    const unrecorded = await this.unrecorded(c);
    if (!current || !next) return { ...base, to: null, refused: "This is the last stage of the case's route: there is no next stage.", people: [], counts: { person_answers_used: 0, asked_again: 0, new_questions: 0, forms: 0, documents: 0 }, forms: [], documents: [], deadline: null, unrecorded, words: "" };
    const st = await this.startability(next.combinationId);
    const nextView = views.find((v) => v.id === next.id)!;
    if (st.why || !st.release) return { ...base, to: { stage: next.id, name: next.staffName, release_version: st.release?.version ?? 0, release: st.release ? releaseLabel(st.release) : "" }, refused: `Can't start ${next.staffName}: ${st.why!.replace(/^Cannot start yet: /, "")} Nothing was changed.`, people: [], counts: { person_answers_used: 0, asked_again: 0, new_questions: 0, forms: 0, documents: 0 }, forms: [], documents: [], deadline: nextView.deadline, unrecorded, words: "" };
    const snap = st.release.snapshot as unknown as Snapshot;
    // Who comes along: everyone on the case; a person whose role the next release lacks stays and files nothing in it.
    const roles = new Set(((snap.combination.participants ?? []) as { role: string; max?: number }[]).filter((p) => (p.max ?? 1) > 0).map((p) => p.role));
    const peopleNow = this.r.peopleOf(c);
    const people = peopleNow.filter((p) => p.role !== "case").map((p) => ({ subject: p.subjectId, label: p.label, role: p.role, comes: roles.has(p.role), words: roles.has(p.role) ? null : `${p.label} stays on the case and files nothing in this stage (the ${next.staffName} has no ${p.role.replace(/_/g, " ")}).` }));
    // What carries (BR-5, challenge B3): person answers are read where they are; the application's are asked again.
    const { answers, rows: groupRows } = await this.r.state(c);
    const nextPeople: Participant[] = [...peopleNow.filter((p) => p.role !== "case" && roles.has(p.role)), { subjectId: NEXT_APPLICATION, role: "case" as Participant["role"], label: "The application", applies: true }];
    const personAnswers = answers.filter((a) => a.subjectId !== c.stage.applicationSubjectId);
    const today = new Date();
    const qv = caseView(snap, nextPeople, personAnswers, groupRows, "agent", today);
    let used = 0, again = 0, fresh = 0;
    for (const sec of qv.sections) for (const q of sec.questions) {
      if (q.hidden) continue;
      if (q.subjectId === NEXT_APPLICATION) again++; else if (q.answer) used++; else fresh++;
    }
    const forms = [...new Set(qv.forms.filter((f) => f.applies === true).map((f) => f.form))].sort();
    const { known } = knownOf(snap, nextPeople, personAnswers.filter((x) => checkValue(snap, x.field, x.value, today).length === 0), groupRows, today);
    const cl = caseChecklist(snap, (await this.db.combination.findUnique({ where: { id: next.combinationId }, select: { combinationKey: true } }))!.combinationKey, nextPeople, known, today);
    const documents = cl.derived ? [...new Set(cl.people.flatMap((p) => p.lines.map((l) => l.document.name)))].sort() : [];
    const deadline = nextView.deadline;
    const n = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`;
    const principal = people.find((p) => p.role === "principal")?.label ?? "the client";
    const words = `${next.staffName} started. ${n(used, `answer about ${principal} used`, `answers about ${principal} and the family used`)}; ${n(again, "question about this application asked again", "questions about this application asked again")}; ${n(fresh, "new question", "new questions")}; ${n(forms.length, "form", "forms")} and ${n(documents.length, "document", "documents")} added${deadline?.due ? `; deadline ${fmtDate(deadline.due)} (Sample)` : deadline ? `; deadline: ${deadline.why}` : ""}.`;
    return { ...base, to: { stage: next.id, name: next.staffName, release_version: st.release.version, release: releaseLabel(st.release) }, refused: null, people,
      counts: { person_answers_used: used, asked_again: again, new_questions: fresh, forms: forms.length, documents: documents.length }, forms, documents, deadline, unrecorded, words,
      _release: { id: st.release.id, packVersionId: st.release.packVersionId, sha256: st.release.sha256, version: st.release.version } };
  }

  /** P-237: the ending stage's filings with no record of their submission (a warning; a reason is then required). */
  private async unrecorded(c: Reached) {
    const filings = await this.db.filing.findMany({ where: { caseId: c.id, stageId: c.stage.id, active: true }, include: { record: { select: { id: true } } }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
    const label = new Map(c.participants.map((p) => [p.subjectId, p.subject.label]));
    return filings.filter((f) => !f.record).map((f) => ({ filing: f.id, person: label.get(f.subjectId) ?? "A person" }));
  }

  /** BR-4: Start next stage. Checks first (refusals change nothing), then one transaction under the case's row lock:
   *  the request names the current stage and its version; the next combination is not retired and its newest release is
   *  startable and the one previewed; pin revision 1 for it; a new application subject; the states move; the case's
   *  combination follows; one audit line (never key-detail values or the reason, SA-1B-212 §10). */
  async start(actor: Actor, caseId: string, body: unknown) {
    const c = await this.reach(actor, caseId);
    const b = parse(StartNext, body);
    if (b.from_stage !== c.stage.id || b.stage_version !== c.stage.version) stale();
    const p = await this.compute(c);
    if (!p.to) problem(409, "Not possible now", p.refused!, { code: "last_stage" });
    if (p.refused || !p._release) problem(409, "Not possible now", p.refused!, { code: "cannot_start" });
    const spec = readSpec(c.stage.spec);
    const checked = checkKeyDetails(spec.key_details, b.key_details ?? {}, "key_details");
    if ("field" in checked) fieldError(checked.field, checked.message);
    const snapNow = this.r.snapshotOf(c);
    for (const [field, v] of Object.entries((checked as { values: Record<string, string> }).values)) {
      const d = spec.key_details.find((x) => x.field === field)!;
      if (d.same_every_stage && shapeOf(snapNow, field)) { const probs = checkValue(snapNow, field, v, new Date()); if (probs.length) fieldError(`key_details.${field}`, `${d.label}: ${probs[0]}`); }
    }
    const reason = b.reason?.trim() ?? "";
    if (p.unrecorded.length && reason.length < 3) fieldError("reason", `${p.unrecorded.map((u) => `${u.person}'s ${c.stage.clientName.toLowerCase()}`).join(" and ")} ${p.unrecorded.length === 1 ? "has" : "have"} no filing record. Say why you are starting the next stage anyway (at least 3 characters).`);
    const values = (checked as { values: Record<string, string> }).values, at = new Date();
    const rel = p._release!;
    const outcome = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM runtime_case WHERE id = ${c.id}::uuid FOR UPDATE`;
      const cur = await tx.caseStage.findFirst({ where: { caseId: c.id, state: "CURRENT" } });
      if (!cur || cur.id !== b.from_stage || cur.version !== b.stage_version) return "stale" as const;
      const nxt = await tx.caseStage.findFirst({ where: { caseId: c.id, ord: cur.ord + 1 } });
      if (!nxt || nxt.id !== p.to!.stage || nxt.state !== "NOT_STARTED") return "stale" as const;
      const combo = await tx.combination.findUnique({ where: { id: nxt.combinationId }, select: { retiredAt: true } });
      const newest = await tx.configRelease.findFirst({ where: { combinationId: nxt.combinationId }, orderBy: { version: "desc" }, select: { id: true } });
      if (combo?.retiredAt || newest?.id !== rel.id) return "stale" as const;
      const oldApp = await tx.answerSubject.findUnique({ where: { id: cur.applicationSubjectId! }, select: { partyId: true } });
      const pinNow = await tx.packWorkPin.findFirst({ where: { caseId: c.id, combinationId: cur.combinationId }, orderBy: { revision: "desc" }, select: { partyId: true } });
      const app = await tx.answerSubject.create({ data: { workspaceId: c.workspaceId, partyId: oldApp!.partyId, subjectKind: "case", label: "The application" } });
      const order = ((await tx.caseParticipant.aggregate({ where: { caseId: c.id }, _max: { order: true } }))._max.order ?? 0) + 1;
      await tx.caseParticipant.create({ data: { workspaceId: c.workspaceId, caseId: c.id, subjectId: app.id, role: "case", order } });
      const stored = { ...(cur.keyDetails as Record<string, StoredDetail>) };
      for (const d of spec.key_details) { const v = values[d.field]; if (v !== undefined && stored[d.field]?.value !== v) stored[d.field] = { value: v, by: actor.id, at: at.toISOString() }; else if (v === undefined && b.key_details && d.field in b.key_details) delete stored[d.field]; }
      await tx.caseStage.update({ where: { id: cur.id }, data: { state: "ENDED_NEXT_STARTED", endedBy: actor.id, endedAt: at, keyDetails: stored as object, reason: reason || null, version: { increment: 1 } } });
      await tx.caseStage.update({ where: { id: nxt.id }, data: { state: "CURRENT", startedFrom: "NEXT_STAGE", applicationSubjectId: app.id, startedBy: actor.id, startedAt: at, version: { increment: 1 } } });
      await tx.packWorkPin.create({ data: { workspaceId: c.workspaceId, caseId: c.id, combinationId: nxt.combinationId, partyId: pinNow!.partyId, packVersionId: rel.packVersionId, configReleaseId: rel.id, contentHash: rel.sha256, actorId: actor.id } });
      await tx.case.update({ where: { id: c.id }, data: { combinationId: nxt.combinationId } });
      return { next: nxt.id };
    }, { timeout: 15_000, maxWait: 10_000 });
    if (outcome === "stale") stale();
    await this.audit.log(c.workspaceId, actor.id, "started_stage", "case", c.id, `${actor.name} started the next stage on case ${short(c.id)}: "${p.to!.name}" on release ${rel.version} (${rel.sha256.slice(0, 12)}), ending "${c.stage.staffName}"${p.unrecorded.length ? `; ${p.unrecorded.length} filing(s) without a record, reason given` : ""}`);
    const after = await this.stages(actor, c.id);
    return { ...after, words: p.words, counts: p.counts };
  }

  /** BR-3: a done-before stage's key details, edited later on its panel (typed by their field; the same-at-every-stage
   *  detail is also written as the principal's answer, by the officer, channel "stage record"). */
  async keyDetails(actor: Actor, caseId: string, stageId: string, body: unknown) {
    const c = await this.reach(actor, caseId);
    const s = c.stages.find((x) => x.id === stageId);
    if (!s) fail("No such stage on this case.", HttpStatus.NOT_FOUND);
    if (s!.state !== "DONE_BEFORE") problem(409, "Not possible now", s!.state === "CURRENT" ? "The current stage's key details are recorded when the next stage starts." : "Only a stage done before we started has its details edited here; an ended stage is kept as it was.", { code: "not_done_before" });
    const b = parse(StageKeyDetails, body);
    if (b.stage_version !== s!.version) stale();
    const spec = readSpec(s!.spec), checked = checkKeyDetails(spec.key_details, b.key_details, "key_details");
    if ("field" in checked) fieldError(checked.field, checked.message);
    const values = (checked as { values: Record<string, string> }).values, snap = this.r.snapshotOf(c), at = new Date();
    for (const [field, v] of Object.entries(values)) { const d = spec.key_details.find((x) => x.field === field)!; if (d.same_every_stage && shapeOf(snap, field)) { const probs = checkValue(snap, field, v, at); if (probs.length) fieldError(`key_details.${field}`, `${d.label}: ${probs[0]}`); } }
    const principal = c.participants.find((p) => p.role === "principal");
    await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM runtime_case WHERE id = ${c.id}::uuid FOR NO KEY UPDATE`;
      const now = await tx.caseStage.findUnique({ where: { id: s!.id } });
      if (!now || now.version !== b.stage_version) stale();
      const stored = { ...(now!.keyDetails as Record<string, StoredDetail>) };
      for (const d of spec.key_details) { if (!(d.field in b.key_details)) continue; const v = values[d.field]; if (v === undefined) delete stored[d.field]; else if (stored[d.field]?.value !== v) stored[d.field] = { value: v, by: actor.id, at: at.toISOString() }; }
      await tx.caseStage.update({ where: { id: s!.id }, data: { keyDetails: stored as object, recordedBy: actor.id, recordedAt: at, version: { increment: 1 } } });
      for (const d of spec.key_details.filter((x) => x.same_every_stage && values[x.field] !== undefined)) {
        const item = (snap.canonical_fields as { id: string; item_version: number }[]).find((f) => f.id === d.field);
        const def = item && principal ? await tx.canonicalField.findFirst({ where: { workspaceId: c.workspaceId, canonicalFieldKey: d.field, version: item.item_version } }) : null;
        if (!def || !principal) continue;
        const cur = await tx.clientCanonicalAnswer.findFirst({ where: { subjectId: principal.subjectId, canonicalFieldKey: d.field, rowKey: null, supersededById: null } });
        if (cur && cur.valueJson === values[d.field]) continue;
        const made = await tx.clientCanonicalAnswer.create({ data: { workspaceId: c.workspaceId, partyId: principal.subject.partyId, subjectId: principal.subjectId, canonicalFieldId: def.id, canonicalFieldKey: d.field, valueJson: values[d.field], status: "DECLARED", sourceJson: { channel: STAGE_RECORD, actor: actor.id, at: at.toISOString() } } });
        if (cur) await tx.clientCanonicalAnswer.update({ where: { id: cur.id }, data: { supersededById: made.id } });
      }
    });
    await this.audit.log(c.workspaceId, actor.id, "changed", "case stage", c.id, `${actor.name} changed the key details of "${s!.staffName}" (done before we started) on case ${short(c.id)}`);
    return this.stage(actor, c.id, s!.id);
  }
}

@CaseRead()
@Controller("api/runtime")
export class CaseStagesController {
  constructor(@Inject(CaseStagesService) private readonly s: CaseStagesService) {}
  @Get("cases/:id/stages") list(@Headers("x-actor") a: H, @Param("id") id: string) { return this.s.stages(actorOf(a), id); }
  @Get("cases/:id/stages/next") preview(@Headers("x-actor") a: H, @Param("id") id: string) { return this.s.preview(actorOf(a), id).then(({ _release, ...p }: StartNextPreview & { _release?: unknown }) => p); }
  @Post("cases/:id/stages/next") @HttpCode(HttpStatus.CREATED) start(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.s.start(actorOf(a), id, b); }
  @Get("cases/:id/stages/:stage") one(@Headers("x-actor") a: H, @Param("id") id: string, @Param("stage") st: string) { return this.s.stage(actorOf(a), id, st); }
  @Put("cases/:id/stages/:stage/key-details") keys(@Headers("x-actor") a: H, @Param("id") id: string, @Param("stage") st: string, @Body() b: unknown) { return this.s.keyDetails(actorOf(a), id, st, b); }
}
