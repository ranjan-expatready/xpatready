// C8.3 Representative review (screens lane, B144; P-406, P-412, P-155 (1); concept screens/B144/concept.md r2): the
// routes of the review rounds. The case officer sends filings for review (POST /runtime/cases/:id/reviews); the
// representative of record opens each (POST /runtime/reviews/:id/open; the GET never changes state, m1), ticks its
// checklist (…/checks) and approves it or sends it back (…/decision); after an approval, a fact change withdraws the
// forms it touches and the representative re-approves only those in one click (…/reapprove, P-412 F1). The rules are
// engine/runtime/review.ts: one rule function for currency (stampCurrent, F1) and one permission check (mayDecide, F2).
// Each send freezes every form (B2: its own answer snapshot, facts hash and file); each approval stamps every form and
// still writes C7.6's filing_review row, so Ready to file and the record's "Reviewed by" read it unchanged. The C7.6
// route POST /runtime/filings/:id/review is a one-step round through the same code (oneStep, challenge M1).
// Who: case staff of the case's firm send and read (Runtime.reach "officer"); a client and configuration people: 403;
// another firm: 404. Program review items: the scaffolding port api/src/review-items.ts (Sample). No model call (US$0).
// Legal points: Unconfirmed: no counsel.
import { Body, Controller, Get, Headers, HttpCode, HttpException, HttpStatus, Inject, Injectable, Param, Post } from "@nestjs/common";
import { REPRESENTATIVE, userIn, type Firm } from "../../engine/runtime/team.ts";
import { changedBy, changesOf, checklistOf, valuesOf, CHANGED_TOOLTIP, fileOf, formStateOf, hashesProblem, isOpen, mayDecide, nextStatus, reasonsOf, selfReviewOf, SELF_STATEMENT, sendProblem, stampCurrent, STATE_WORDS, typedSince, untickedProblem, withdrawnForms, withdrawnWords, WITHDRAWN_TOOLTIP, type ChangeLine, type CheckItem, type FileStamp, type Problem, type RowStatus } from "../../engine/runtime/review.ts";
import { dayWords, factPerson } from "../../engine/runtime/out-of-date.ts";
import { caseView, sectionAnswers } from "../../engine/runtime/case.ts";
import { relativeOf } from "../../engine/runtime/relatives.ts";
import { isBarcodeForm } from "../../contracts/forms.ts";
import type { FormFact } from "../../engine/runtime/forms.ts";
import { ReviewDecision, ReviewOpen, ReviewReapprove, ReviewTick, SendForReview, type ChangedSinceReview, type FormStamp, type ReviewRound, type ReviewRoundFiling } from "../../contracts/runtime.ts";
import { problemFromZod } from "../../contracts/programs.ts";
import { actorOf, CaseRead, Db, RUNTIME_ACTORS, type Actor } from "./core.ts";
import { firmByKey } from "./firms.ts";
import { Runtime, type Reached } from "./runtime.ts";
import { CasePrepare, type ReviewBasis, type ReviewBasisForm } from "./case-prepare.ts";
import type { ReadinessView } from "./readiness-inputs.ts";
import { reviewItemsOf } from "./review-items.ts";
import { busyWords } from "./busy.ts";
import { newestPin } from "./stage-scope.ts"; // C6.17 (BR-9)

type H = string | undefined;
type Tx = Parameters<Parameters<Db["$transaction"]>[0]>[0];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TX = { timeout: 20_000, maxWait: 10_000 } as const;
const refuse = (p: Problem): never => {
  const title = p.status === 400 ? "Some details need fixing" : p.status === 403 ? "Not yours to decide" : p.status === 404 ? "Not found" : "Changed by someone else";
  throw new HttpException({ type: "https://expatready.local/problems/representative-review", title, status: p.status, detail: p.detail, ...(p.field ? { errors: [{ field: p.field, message: p.detail }] } : {}) }, p.status);
};
const parsed = <T>(schema: { safeParse: (x: unknown) => { success: true; data: T } | { success: false; error: Parameters<typeof problemFromZod>[0] } }, body: unknown): T => {
  const r = schema.safeParse(body ?? {});
  if (!r.success) throw new HttpException(problemFromZod(r.error), HttpStatus.BAD_REQUEST);
  return r.data;
};
const STATUS_WORDS: Record<RowStatus, string> = { sent: "Sent for review", under_review: "Under review", approved: "Approved", sent_back: "Sent back" };
const FILE_WORDS: Record<FileStamp["kind"], string> = { validated_copy: "the validated copy read back", generated_copy: "the copy made from these facts", none: "its facts (no file for filing matches them yet; an online form has none)", waits: "not stamped: waits for an answer" };
type StoredFacts = { review?: boolean; facts?: FormFact[] };
type FormRow = { id: string; itemId: string; formNumber: string; subjectId: string; snapshotId: string | null; factsHash: string | null; fileKind: string; fileId: string | null; fileSha256: string | null;
  stampSnapshotId: string | null; stampHash: string | null; stampFileKind: string | null; stampFileSha256: string | null; stampedBy: string | null; stampedAt: Date | null };

/** What one send or one approval freezes for one form (B2): computed before the transaction, written inside it. */
type Frozen = { item: string; form: string; subject: string; waits: boolean; hash: string | null; inputHash: string; facts: FormFact[]; channel: string; file: FileStamp };

@Injectable()
export class ReviewRounds {
  constructor(@Inject(Runtime) private readonly r: Runtime, @Inject(Db) private readonly db: Db, @Inject(CasePrepare) private readonly prepare: CasePrepare) {}

  // ---------------------------------------------------------------- shared reads

  private firmOf(c: Reached): Firm | null { return firmByKey(c.firmKey); }
  private nameOf(c: Reached, id: string | null | undefined): string | null {
    if (!id) return null;
    const f = this.firmOf(c);
    return (f ? userIn(f, id)?.name : null) ?? RUNTIME_ACTORS.find((a) => a.id === id)?.name ?? id;
  }
  private async representativeNow(caseId: string, q: Db | Tx = this.db) {
    return (await q.caseTeamMember.findFirst({ where: { caseId, role: "LEAD_REPRESENTATIVE", endedAt: null }, select: { userId: true } }))?.userId ?? null;
  }
  /** The view and every form's basis, worked out in one pass (CasePrepare.reviewBasis). */
  private async basisOf(actor: Actor, c: Reached) {
    const { view, basis } = await this.prepare.reviewBasis(actor, c);
    if (!view.derived || !basis) refuse({ status: 409, detail: "This case's filings are not worked out yet: open Prepare application first." });
    return { view: view as typeof view & { readiness: (ReadinessView & { pin_revision: number })[]; filings: { id: string; label: string; status: string }[]; items: { id: string; kind: string; filing: string; subject: string; document_type?: string }[] }, basis: basis! };
  }
  /** B2: the files of the forms that have one (one query each kind), as fileOf orders them. */
  private async framesOf(forms: ReviewBasisForm[]): Promise<Frozen[]> {
    // QA-345 (review M1): a validated copy's fingerprint is the read-back that counts for filing (validatedSha), the one
    // fileStampCurrent compares with.
    const gIds = forms.map((f) => f.forFiling?.id).filter((x): x is string => !!x);
    const gSha = new Map((gIds.length ? await this.db.formInstance.findMany({ where: { id: { in: gIds } }, select: { id: true, sha256: true } }) : []).map((g) => [g.id, g.sha256]));
    return forms.map((f) => ({ item: f.item, form: f.form, subject: f.subject, waits: f.waits, hash: f.hash, inputHash: f.inputHash, facts: f.facts, channel: f.channel,
      file: fileOf({ waits: f.waits, inputHash: f.inputHash, validated: f.validated ? { id: f.validated.copy, sha256: f.validatedSha, current: f.validated.current } : null, generated: f.forFiling ? { id: f.forFiling.id, sha256: gSha.get(f.forFiling.id) ?? null, hash: f.forFiling.hash } : null }) }));
  }
  /** The forms of one filing a review covers: every form item of it except those the IRCC account asks itself. */
  private formsOf(basis: ReviewBasis, filing: string) { return basis.forms.filter((f) => f.filing === filing && f.channel !== "NOT_NEEDED"); }
  /** BR-2: the checklist copied into the round for one filing. */
  /** QA-446: the officer's Agent view (as Runtime.view works it out), read once per round for the checklist's values. */
  private async agentViewOf(c: Reached) {
    const { answers, rows, groups } = await this.r.state(c);
    return caseView(this.r.snapshotOf(c), this.r.peopleOf(c), answers, rows, "agent", new Date(), groups, { background: this.r.backgroundOf(c) });
  }
  private async checklistFor(c: Reached, view: Awaited<ReturnType<ReviewRounds["basisOf"]>>["view"], basis: ReviewBasis, filing: string, agent?: ReturnType<typeof caseView>): Promise<CheckItem[]> {
    const rd = view.readiness.find((x) => x.filing === filing);
    const docs = view.items.filter((i) => i.kind === "document" && i.filing === filing);
    const verified = docs.length ? await this.db.checklistLine.count({ where: { caseId: c.id, stageId: c.stage.id, state: "approved", OR: docs.map((d) => ({ subjectId: d.subject, documentType: d.document_type ?? "" })) } }) : 0;
    // QA-446 (P-510 (2)): the values of the filing's people and their relatives (their parents' tabs), counted from the
    // officer's own Agent view, answer by answer, so this item agrees with the tabs and sections: declared by whom
    // (no officer confirmation needed), confirmed by whom, and how many still wait for the officer's Confirm section.
    const subjects = new Set(this.formsOf(basis, filing).map((f) => f.subject));
    const mine = (sid: string) => subjects.has(sid) || subjects.has(relativeOf(sid)?.owner ?? "");
    agent ??= await this.agentViewOf(c);
    const answers = agent.sections.filter((s) => mine(s.subjectId)).flatMap((s) => sectionAnswers(s.questions, s.group).map((a) => ({ ...a, about: s.about_label })));
    const pin = c.pins[0], combination = (await this.db.filing.findUnique({ where: { id: filing }, select: { combinationKey: true } }))?.combinationKey ?? "";
    return checklistOf({ critical: (rd?.warns ?? []).filter((w) => w.severity === "critical").length, documents: { verified, required: docs.length },
      program: reviewItemsOf({ id: pin.configReleaseId, version: pin.release.version }, combination),
      values: valuesOf(answers, (a) => a.channel === "own_link" ? a.about : this.nameOf(c, a.by) ?? a.by),
      forms: this.formsOf(basis, filing).map((f) => ({ item: f.item, label: `${f.form} · ${f.person}` })) });
  }
  /** The person who typed each answer now (its origin, not its confirmer, m4), from the answers already read (m6). */
  private typistOf(basis: ReviewBasis) {
    const m = new Map(basis.answers.filter((a) => !a.rowKey).map((a) => [`${a.subjectId}|${a.field}`, a]));
    return (about: string, fact: string) => {
      // Break M1: a fact about the representative comes from the firm record, never typed by a person on the case (a
      // change of representative of record is not a fact the new representative wrote).
      if (about === REPRESENTATIVE || about.startsWith(`${REPRESENTATIVE}/`)) return null;
      const a = m.get(`${about === "case" ? basis.caseSubject ?? about : about}|${fact}`);
      return a ? { by: a.origin?.actor ?? a.actor, at: a.origin?.at ?? a.at } : null;
    };
  }

  /** BR-8 (CI on #1247): whether `actor` typed, after `since`, an answer one of these forms reads (confirmed or not). */
  private typedBy(basis: ReviewBasis, forms: ReviewBasisForm[], actor: string, since: Date) {
    const reads = new Set(forms.filter((f) => !f.waits).flatMap((f) => f.reads));
    const answers = basis.answers.map((a) => ({ key: `${a.subjectId}|${a.field}`, by: a.origin?.actor ?? a.actor, at: a.origin?.at ?? a.at }));
    return typedSince(answers, reads, actor, since.toISOString());
  }

  // ---------------------------------------------------------------- writes shared by every route (the same code, M1)

  /** B2: one answer snapshot of a form's facts as the review reads them (a snapshot with no copy). */
  private async snapshot(tx: Tx, c: Reached, f: Frozen) {
    return (await tx.answerSnapshot.create({ data: { workspaceId: c.workspaceId, caseId: c.id, subjectId: f.subject, formNumber: f.form, inputHash: f.inputHash, factsJson: { review: true, facts: f.facts, channel: f.channel } as object } })).id;
  }
  /** BR-1: freezes every form of a filing row (its own snapshot, facts hash and file) and copies its checklist. */
  private async freeze(tx: Tx, c: Reached, row: { id: string; roundId: string; filingId: string }, frames: Frozen[], checks: CheckItem[], carry?: { stamps: Map<string, FormRow>; ticks: Map<string, { by: string | null; at: Date | null }> }) {
    const out = new Map<string, { id: string; snapshotId: string | null }>();
    for (const f of frames) {
      const prev = carry?.stamps.get(f.item);
      // P-412: a form whose stamp is still current keeps its stamped snapshot (nothing it reads changed).
      const snapshotId = f.waits ? null : prev && prev.stampHash === f.hash && prev.stampSnapshotId ? prev.stampSnapshotId : await this.snapshot(tx, c, f);
      const made = await tx.reviewRoundForm.create({ data: { workspaceId: c.workspaceId, caseId: c.id, roundId: row.roundId, roundFilingId: row.id, filingId: row.filingId, itemId: f.item, formNumber: f.form, subjectId: f.subject,
        snapshotId, factsHash: f.waits ? null : f.hash, fileKind: f.file.kind, fileId: f.file.id, fileSha256: f.file.sha256 } });
      out.set(f.item, { id: made.id, snapshotId });
    }
    if (checks.length) await tx.reviewCheck.createMany({ data: checks.map((k) => { const t = carry?.ticks.get(k.key); return { workspaceId: c.workspaceId, caseId: c.id, roundFilingId: row.id, itemKey: k.key, source: k.source, wording: k.wording.slice(0, 300), live: (k.live ?? undefined) as object | undefined, tickedBy: t?.by ?? null, tickedAt: t?.at ?? null }; }) });
    return out;
  }
  /** BR-4: stamps every form of a filing row with the facts the representative approved (the page's hashes, equal to
   *  today's) and its file: the frozen snapshot when nothing changed since it was sent, else a new one. */
  private async stamp(tx: Tx, c: Reached, actor: Actor, rows: { id: string; snapshotId: string | null; factsHash: string | null }[], frames: Frozen[], byItem: (r: { id: string }) => string) {
    for (const r of rows) {
      const f = frames.find((x) => x.item === byItem(r));
      if (!f || f.waits) continue; // m8: a form that waits is never stamped
      const snap = r.factsHash === f.hash && r.snapshotId ? r.snapshotId : await this.snapshot(tx, c, f);
      await tx.reviewRoundForm.update({ where: { id: r.id }, data: { stampSnapshotId: snap, stampHash: f.hash, stampFileKind: f.file.kind === "waits" ? "none" : f.file.kind, stampFileSha256: f.file.sha256, stampedBy: actor.id, stampedAt: new Date() } });
    }
  }
  /** Under the case's row lock: the case must still be on the release the page read (C9.5's rule for the review). */
  private async lockCase(tx: Tx, c: Reached) {
    await tx.$queryRaw`SELECT id FROM runtime_case WHERE id = ${c.id}::uuid FOR UPDATE`;
    // C6.17 (BR-9): the current stage's chain; null when "Start next stage" moved the case meanwhile (refused).
    const newest = await newestPin(tx, c.id, c.combinationId);
    if (newest?.revision !== c.pins[0].revision) refuse({ status: 409, detail: "This case moved to another release meanwhile: nothing was recorded. Reload." });
  }
  private async nextNumbers(tx: Tx, caseId: string, filings: string[]) {
    const n = ((await tx.reviewRound.aggregate({ where: { caseId }, _max: { number: true } }))._max.number ?? 0) + 1;
    const per = new Map<string, number>();
    for (const f of filings) per.set(f, ((await tx.reviewRoundFiling.aggregate({ where: { filingId: f }, _max: { filingRound: true } }))._max.filingRound ?? 0) + 1);
    return { n, per };
  }
  private async audit(tx: Tx, c: Reached, actor: Actor, action: string, entityKey: string, summary: string, detail: unknown) {
    await tx.auditEvent.create({ data: { workspaceId: c.workspaceId, actor: actor.id, action, entity: "review round", entityKey, summary: summary.slice(0, 600), detail: detail as object } });
  }

  // ---------------------------------------------------------------- BR-1 send

  async list(actor: Actor, caseId: string) {
    const c = await this.r.reach(actor, UUID.test(caseId) ? caseId : "00000000-0000-0000-0000-000000000000", "officer");
    const rounds = await this.db.reviewRound.findMany({ where: { caseId: c.id }, orderBy: { number: "desc" }, include: { filings: { select: { filingId: true, status: true, filingRound: true } } } });
    return { case_id: c.id, representative: await this.representativeNow(c.id), rounds: rounds.map((x) => ({ id: x.id, number: x.number, kind: x.kind, sent_by: x.sentBy, sent_at: x.sentAt.toISOString(), filings: x.filings.map((f) => ({ filing: f.filingId, status: f.status, filing_round: f.filingRound })) })) };
  }

  /** POST /runtime/cases/:id/reviews {filings, now?}: one round for the ticked filings (BR-1). `now` (a solo firm's
   *  "Review now", m3): the representative of record sends and opens in one step. */
  async send(actor: Actor, caseId: string, body: unknown) {
    const c = await this.r.reach(actor, UUID.test(caseId) ? caseId : "00000000-0000-0000-0000-000000000000", "officer");
    const b = parsed(SendForReview, body);
    const rep = await this.representativeNow(c.id);
    if (b.now) {
      // Concept m3: "Review now" is the solo firm's one step; a firm with a case officer sends for review instead.
      if (!this.firmOf(c)?.solo) refuse({ status: 400, field: "now", detail: "\"Review now\" is for a solo firm. Send the filings for review instead." });
      const no = mayDecide(actor.id, rep); if (no) refuse({ status: 403, detail: `"Review now" sends and opens the review in one step: ${no}` });
    }
    const { view, basis } = await this.basisOf(actor, c);
    const stored = await this.db.filing.findMany({ where: { caseId: c.id, stageId: c.stage.id }, select: { id: true, status: true, active: true } }) // C6.17: the current stage's filings only;
    const open = new Set((await this.db.reviewRoundFiling.findMany({ where: { caseId: c.id, status: { in: ["sent", "under_review"] } }, select: { filingId: true } })).map((x) => x.filingId));
    // Every filing the case has stored, a removed one too (C6.13: refused in words, 409), labelled as the view labels it.
    const filings = stored.map((s) => ({ id: s.id, label: view.filings.find((f) => f.id === s.id)?.label ?? "That filing", active: s.active && view.filings.some((f) => f.id === s.id), recorded: s.status === "SUBMITTED", inOpenRound: open.has(s.id), openBlocks: view.readiness.find((r) => r.filing === s.id)?.blocks.length ?? 0 }));
    const no = sendProblem(b.filings, filings);
    if (no) refuse(no);
    const plan: { filing: string; frames: Frozen[]; checks: CheckItem[] }[] = [];
    const agent = await this.agentViewOf(c);
    for (const id of b.filings) plan.push({ filing: id, frames: await this.framesOf(this.formsOf(basis, id)), checks: await this.checklistFor(c, view, basis, id, agent) });
    const kind = b.now ? "review_now" : "send";
    const round = await busyWords(() => this.db.$transaction(async (tx) => {
      await this.lockCase(tx, c);
      const again = await tx.reviewRoundFiling.findFirst({ where: { filingId: { in: b.filings }, status: { in: ["sent", "under_review"] } }, select: { filingId: true } });
      if (again) refuse({ status: 409, detail: `${filings.find((f) => f.id === again.filingId)?.label ?? "A filing"} was sent for review meanwhile: open that review instead.` });
      const { n, per } = await this.nextNumbers(tx, c.id, b.filings);
      const made = await tx.reviewRound.create({ data: { workspaceId: c.workspaceId, caseId: c.id, number: n, kind, sentBy: actor.id } });
      for (const p of plan) {
        const row = await tx.reviewRoundFiling.create({ data: { workspaceId: c.workspaceId, caseId: c.id, roundId: made.id, filingId: p.filing, filingRound: per.get(p.filing)!, status: b.now ? "under_review" : "sent", ...(b.now ? { openedBy: actor.id, openedAt: new Date() } : {}) } });
        await this.freeze(tx, c, { id: row.id, roundId: made.id, filingId: p.filing }, p.frames, p.checks);
      }
      await this.audit(tx, c, actor, b.now ? "review_now" : "sent_for_review", made.id, `${actor.name} sent ${b.filings.length} filing${b.filings.length === 1 ? "" : "s"} for review on case ${c.id.slice(0, 8)} (round ${n})`, { case: c.id, filings: b.filings, round: n });
      return made;
    }, TX));
    return { id: round.id, number: round.number, kind: round.kind, filings: plan.map((p) => ({ filing: p.filing, forms: p.frames.length, not_stamped: p.frames.filter((f) => f.waits).length })) };
  }

  // ---------------------------------------------------------------- the round, read safely (m1)

  private async roundOf(actor: Actor, id: string) {
    const round = UUID.test(id) ? await this.db.reviewRound.findUnique({ where: { id } }) : null;
    // Another firm's review is "not found" (Runtime.reach answers 404 for a case of another firm, 403 for a client).
    const c = await this.r.reach(actor, round?.caseId ?? "00000000-0000-0000-0000-000000000000", "officer");
    return { round: round!, c };
  }

  /** GET /runtime/reviews/:id: the round as the page shows it; it never changes the review's state (m1). */
  async read(actor: Actor, id: string): Promise<ReviewRound> {
    const { round, c } = await this.roundOf(actor, id);
    const { view, basis } = await this.basisOf(actor, c);
    return this.compose(actor, c, round, view, basis);
  }

  private async compose(actor: Actor, c: Reached, round: { id: string; number: number; kind: string; sentBy: string; sentAt: Date }, view: Awaited<ReturnType<ReviewRounds["basisOf"]>>["view"], basis: ReviewBasis): Promise<ReviewRound> {
    const rep = await this.representativeNow(c.id), may = mayDecide(actor.id, rep), firm = this.firmOf(c);
    const rows = await this.db.reviewRoundFiling.findMany({ where: { roundId: round.id }, orderBy: [{ filingRound: "asc" }, { id: "asc" }], include: { forms: true, checks: { orderBy: { itemKey: "asc" } } } });
    const filingIds = rows.map((r) => r.filingId);
    // Every row of these filings, for the history, the round before and whether this row is the newest (one query).
    const all = filingIds.length ? await this.db.reviewRoundFiling.findMany({ where: { filingId: { in: filingIds } }, orderBy: [{ filingRound: "asc" }], include: { round: { select: { number: true } }, forms: { select: { itemId: true, snapshotId: true, factsHash: true } } } }) : [];
    // One batched read of every snapshot the page compares (frozen, the round before, stamped; m6).
    const snapIds = [...new Set([...rows.flatMap((r) => r.forms.flatMap((f) => [f.snapshotId, f.stampSnapshotId])), ...all.flatMap((r) => r.forms.map((f) => f.snapshotId))].filter((x): x is string => !!x))];
    const snaps = new Map((snapIds.length ? await this.db.answerSnapshot.findMany({ where: { id: { in: snapIds } }, select: { id: true, factsJson: true } }) : []).map((s) => [s.id, ((s.factsJson ?? {}) as StoredFacts).facts ?? []]));
    const typist = this.typistOf(basis), live = new Map(basis.forms.map((f) => [f.item, f]));
    const day = (at: string | null) => dayWords(at);
    const label = new Map(view.filings.map((f) => [f.id, f.label]));
    const changeView = (cs: ChangeLine[]): ChangedSinceReview[] => cs.map((x) => ({ fact: x.fact, label: x.label, person: x.person, was: x.was, now: x.now, was_words: basis.valueWords(x.fact, x.was), now_words: basis.valueWords(x.fact, x.now), typed_by: x.typed_by, typed_by_name: x.typed_by ? this.nameOf(c, x.typed_by) : null, typed_at: x.typed_at }));
    const filings: ReviewRoundFiling[] = rows.map((row) => {
      const mine = all.filter((x) => x.filingId === row.filingId), prev = mine.find((x) => x.filingRound === row.filingRound - 1) ?? null;
      const latest = !mine.some((x) => x.filingRound > row.filingRound);
      const rd = view.readiness.find((x) => x.filing === row.filingId);
      const checksNow = new Map<string, Record<string, unknown> | null>([["default:no_critical", { open: (rd?.warns ?? []).filter((w) => w.severity === "critical").length }]]);
      // Break m2: only the representative of record's own ticks count (a former representative's do not).
      const ticked = new Set(row.checks.filter((k) => k.tickedBy && k.tickedBy === rep).map((k) => k.itemKey));
      const forms: FormStamp[] = row.forms.map((f) => {
        const now = live.get(f.itemId), liveHash = now ? now.hash : null, waits = f.fileKind === "waits";
        const prevForm = prev?.forms.find((x) => x.itemId === f.itemId);
        // Break B1: an approval with a newer round of its filing no longer counts (stampCurrent's `superseded`).
        // QA-345: and only while the validated copy that counts for filing now is the file it stamped (fileStampCurrent).
        const stamp = f.stampedAt ? { hash: f.stampHash, by: row.representative, superseded: !latest, file: { kind: f.stampFileKind, sha256: f.stampFileSha256 } } : null;
        const st = formStateOf({ status: row.status as RowStatus, waits, checked: ticked.has(`form:${f.itemId}`), frozenHash: f.factsHash, previousHash: prev ? prevForm?.factsHash ?? null : undefined, liveHash, stamp, representative: rep, validatedSha: now?.validatedSha ?? null });
        // BR-6: an approved row compares its stamp with today; an open row compares the round before (else what it froze) with today.
        const base = row.status === "approved" ? snaps.get(f.stampSnapshotId ?? "") ?? [] : prevForm?.snapshotId ? snaps.get(prevForm.snapshotId) ?? [] : snaps.get(f.snapshotId ?? "") ?? [];
        const changes = waits || !now ? [] : changesOf(base, now.facts, basis.words, typist);
        const first = changes[0] ? { label: changes[0].label, by: this.nameOf(c, changes[0].typed_by), at: changes[0].typed_at ?? changes[0].at } : null;
        const facts = (now?.facts ?? []).map((x) => { const t = typist(x.about, x.fact); const a = basis.answers.find((y) => !y.rowKey && y.field === x.fact && y.subjectId === (x.about === "case" ? basis.caseSubject : x.about));
          // Review M3: a relative's fact is named as the relative's (factPerson, the words factChanges gives each change).
          return { label: basis.words.label(x.fact), person: factPerson(x.about, x.row, basis.words), value: x.value, value_words: basis.valueWords(x.fact, x.value), typed_by_name: x.about === REPRESENTATIVE ? "the firm record" : this.nameOf(c, t?.by), confirmed_by_name: a?.origin ? this.nameOf(c, a.actor) : null }; });
        const kind = (f.stampFileKind ?? f.fileKind) as FileStamp["kind"];
        return { item: f.itemId, form: f.formNumber, person: now?.person ?? "", channel: now?.channel ?? "", waits, state: st.state, state_words: STATE_WORDS[st.state],
          tooltip: st.state === "approval_withdrawn" ? WITHDRAWN_TOOLTIP : st.state === "changed_since_review" ? CHANGED_TOOLTIP : null,
          withdrawn_words: st.state === "approval_withdrawn" ? withdrawnWords(st.why, first, day) : null,
          file: { kind, sha256: f.stampFileSha256 ?? f.fileSha256, words: waits ? "Not stamped: waits for an answer" : `${f.stampedAt ? "Stamped" : "Frozen when sent"} with ${FILE_WORDS[kind]}${kind === "none" && f.stampedAt && isBarcodeForm(f.formNumber) && now?.channel !== "ONLINE" ? ". The validated copy read back next for these facts is stamped to this approval" : ""}` },
          stamp: f.stampedAt ? { at: f.stampedAt.toISOString(), by: f.stampedBy!, file_kind: f.stampFileKind!, file_sha256: f.stampFileSha256 } : null,
          live_hash: liveHash, changes: changeView(changes), facts };
      });
      const withdrawn = row.status === "approved" && latest ? withdrawnForms(row.forms.map((f) => ({ item: f.itemId, waits: f.fileKind === "waits", stamp: f.stampedAt ? { hash: f.stampHash, by: row.representative, file: { kind: f.stampFileKind, sha256: f.stampFileSha256 } } : null, liveHash: live.get(f.itemId)?.hash ?? null, validatedSha: live.get(f.itemId)?.validatedSha ?? null })), rep).map((f) => f.item) : [];
      const reasons = (row.reasons ?? null) as { text: string; item?: string; check?: string }[] | null;
      return { filing: row.filingId, label: label.get(row.filingId) ?? "A filing no longer on the application", filing_round: row.filingRound, status: row.status as RowStatus, status_words: STATUS_WORDS[row.status as RowStatus],
        opened: row.openedBy ? { by: row.openedBy, name: this.nameOf(c, row.openedBy)!, at: row.openedAt!.toISOString() } : null,
        decided: row.decidedBy ? { by: row.decidedBy, name: this.nameOf(c, row.decidedBy)!, at: row.decidedAt!.toISOString(), kind: row.reviewKind, reasons, confirmed_unticked: (row.confirmedUnticked ?? null) as string[] | null } : null,
        forms, checks: row.checks.map((k) => ({ key: k.itemKey, source: k.source as "default", wording: k.wording, live: (k.live ?? null) as Record<string, unknown> | null, live_now: checksNow.get(k.itemKey) ?? null, ticked: k.tickedBy ? { by: k.tickedBy, name: this.nameOf(c, k.tickedBy)!, at: k.tickedAt!.toISOString() } : null })),
        unticked: row.checks.filter((k) => k.source !== "form" && !ticked.has(k.itemKey)).length, changed: forms.filter((f) => f.state === "changed_since_review").length, withdrawn,
        latest, reapprovable: row.status === "approved" && latest && withdrawn.length > 0, open_critical: (rd?.warns ?? []).filter((w) => w.severity === "critical").map((w) => w.words),
        history: mine.map((x) => ({ round: x.round.number, filing_round: x.filingRound, status: x.status as RowStatus, at: (x.decidedAt ?? x.openedAt)?.toISOString() ?? "", by: x.decidedBy, reasons: (x.reasons ?? null) as { text: string }[] | null })) };
    });
    const rounds = await this.db.reviewRound.findMany({ where: { caseId: c.id }, orderBy: { number: "desc" }, select: { id: true, number: true, kind: true, sentAt: true } });
    return { id: round.id, case_id: c.id, number: round.number, kind: round.kind as ReviewRound["kind"], sent: { by: round.sentBy, name: this.nameOf(c, round.sentBy)!, at: round.sentAt.toISOString() },
      representative: { id: rep, name: this.nameOf(c, rep) }, can_decide: !may, read_only_words: may, solo: !!firm?.solo, filings, rounds: rounds.map((x) => ({ id: x.id, number: x.number, kind: x.kind, at: x.sentAt.toISOString() })) };
  }

  // ---------------------------------------------------------------- BR-3 open, BR-2 checks

  private async rowOf(c: Reached, round: { id: string }, filing: string) {
    const row = await this.db.reviewRoundFiling.findUnique({ where: { roundId_filingId: { roundId: round.id, filingId: filing } } });
    if (!row) refuse({ status: 404, detail: "That filing is not in this review." });
    // C6.17 (BR-5, BR-10): an ended stage's filings are history; their review is read, never opened, ticked or decided.
    if ((await this.db.filing.findUnique({ where: { id: filing }, select: { stageId: true } }))?.stageId !== c.stage.id) refuse({ status: 409, detail: "This filing is on an ended stage of the case: its review is history and cannot be changed." });
    return row!;
  }
  /** F2: the one permission check, refused in the page's own words (403). */
  private async mustDecide(actor: Actor, c: Reached) { const rep = await this.representativeNow(c.id), no = mayDecide(actor.id, rep); if (no) refuse({ status: 403, detail: no }); return rep!; }

  /** POST /runtime/reviews/:id/open {filing}: the representative of record opens a filing (Sent → Under review, with
   *  who and when). Already open or decided: nothing changes. Anyone else: 403, nothing changes. */
  async open(actor: Actor, id: string, body: unknown) {
    const { round, c } = await this.roundOf(actor, id);
    const b = parsed(ReviewOpen, body);
    await this.mustDecide(actor, c);
    await this.rowOf(c, round, b.filing);
    // Break m4: a filing removed from the application is not opened (it can still be sent back).
    if (!(await this.db.filing.findUnique({ where: { id: b.filing }, select: { active: true } }))?.active) refuse({ status: 409, detail: "This filing was removed from the application: send it back, or add it back first." });
    const moved = await this.db.$transaction(async (tx) => {
      const [row] = await tx.$queryRaw<{ id: string; status: RowStatus }[]>`SELECT id, status FROM review_round_filing WHERE round_id = ${round.id}::uuid AND filing_id = ${b.filing}::uuid FOR UPDATE`;
      if (nextStatus(row.status, "open") === null) return null;
      await tx.reviewRoundFiling.update({ where: { id: row.id }, data: { status: "under_review", openedBy: actor.id, openedAt: new Date() } });
      await this.audit(tx, c, actor, "review_opened", round.id, `${actor.name} opened a filing's review on case ${c.id.slice(0, 8)} (round ${round.number})`, { case: c.id, filing: b.filing });
      return row.id;
    }, TX);
    const row = await this.rowOf(c, round, b.filing);
    return { filing: b.filing, status: row.status, opened: !!moved, opened_by: row.openedBy, opened_at: row.openedAt?.toISOString() ?? null };
  }

  /** POST /runtime/reviews/:id/checks {filing, item, ticked}: the representative ticks or unticks one item while the
   *  filing is open (BR-2). */
  async check(actor: Actor, id: string, body: unknown) {
    const { round, c } = await this.roundOf(actor, id);
    const b = parsed(ReviewTick, body);
    await this.mustDecide(actor, c);
    const row = await this.rowOf(c, round, b.filing);
    const item = await this.db.reviewCheck.findUnique({ where: { roundFilingId_itemKey: { roundFilingId: row.id, itemKey: b.item } } });
    if (!item) refuse({ status: 404, detail: "That checklist item is not on this filing's review." });
    const done = await this.db.$transaction(async (tx) => {
      const [r] = await tx.$queryRaw<{ status: RowStatus }[]>`SELECT status FROM review_round_filing WHERE id = ${row.id}::uuid FOR UPDATE`;
      // Break m3: ticks only after the representative opened the filing (BR-3), never on a Sent or decided row.
      if (r.status !== "under_review") return false;
      await tx.reviewCheck.update({ where: { id: item!.id }, data: b.ticked ? { tickedBy: actor.id, tickedAt: new Date() } : { tickedBy: null, tickedAt: null } });
      return true;
    }, TX);
    if (!done) refuse({ status: 409, detail: "This filing's checklist is not open: open the filing first, or it is decided. Reload." });
    return { filing: b.filing, item: b.item, ticked: b.ticked };
  }

  // ---------------------------------------------------------------- BR-4, BR-5 decision

  /** POST /runtime/reviews/:id/decision {filing, verdict, form_hashes, confirm_unticked?, self?, reasons?}. */
  async decision(actor: Actor, id: string, body: unknown) {
    const { round, c } = await this.roundOf(actor, id);
    const b = parsed(ReviewDecision, body);
    const rep = await this.mustDecide(actor, c);
    const row = await this.rowOf(c, round, b.filing);
    const filing = await this.db.filing.findUnique({ where: { id: b.filing }, select: { status: true, active: true } });
    // Break m4: a removed filing can still be sent back (closing its round); it is never approved.
    if (!filing?.active && b.verdict === "approve") refuse({ status: 409, detail: "This filing is no longer on the application (it was removed): send it back instead. Nothing was recorded." });
    if (filing!.status === "SUBMITTED") refuse({ status: 409, detail: "This filing is recorded as submitted: its review is closed. Correct the record instead." });
    if (!isOpen(row.status as RowStatus)) refuse({ status: 409, detail: "This filing was decided meanwhile. Reload." });
    if (row.status === "sent") refuse({ status: 409, detail: "Open this filing's review first (it is not under review yet). Reload." });
    const { view, basis } = await this.basisOf(actor, c);
    const forms = this.formsOf(basis, b.filing), stored = await this.db.reviewRoundForm.findMany({ where: { roundFilingId: row.id } });
    // BR-4 (M4): every form the page loaded, with the hash it loaded; a form added or gone since is a change too.
    const hp = hashesProblem(b.form_hashes, forms.map((f) => ({ item: f.item, hash: f.hash })));
    if (hp) refuse(hp);
    // Break m7: only an approval needs the forms as sent; a send back is always possible.
    if (b.verdict === "approve" && (stored.length !== forms.length || stored.some((s) => !forms.some((f) => f.item === s.itemId)))) refuse({ status: 409, detail: "The forms of this filing changed since it was sent (a form was added or no longer applies): send it back, then send it for review again." });
    if (b.verdict === "send_back") {
      const checks = await this.db.reviewCheck.findMany({ where: { roundFilingId: row.id }, select: { itemKey: true } });
      const rs = reasonsOf(b.reasons, new Set([...forms.map((f) => f.item), ...stored.map((x) => x.itemId)]), new Set(checks.map((k) => k.itemKey)));
      if ("problem" in rs) refuse(rs.problem);
      const reasons = (rs as { reasons: unknown[] }).reasons;
      await busyWords(() => this.db.$transaction(async (tx) => {
        await this.lockCase(tx, c);
        const [r] = await tx.$queryRaw<{ status: RowStatus }[]>`SELECT status FROM review_round_filing WHERE id = ${row.id}::uuid FOR UPDATE`;
        if (nextStatus(r.status, "send_back") === null) refuse({ status: 409, detail: "This filing was decided meanwhile. Reload." });
        await tx.reviewRoundFiling.update({ where: { id: row.id }, data: { status: "sent_back", decidedBy: actor.id, decidedAt: new Date(), reasons: reasons as object } });
        await this.audit(tx, c, actor, "review_sent_back", round.id, `${actor.name} sent a filing back on case ${c.id.slice(0, 8)} (round ${round.number}) with ${reasons.length} reason${reasons.length === 1 ? "" : "s"}`, { case: c.id, filing: b.filing });
      }, TX));
      return { filing: b.filing, status: "sent_back" as const, reasons };
    }
    const checks = await this.db.reviewCheck.findMany({ where: { roundFilingId: row.id } });
    // Break m2: only the deciding representative's own ticks count.
    const un = untickedProblem(checks.map((k) => ({ key: k.itemKey, source: k.source, ticked: k.tickedBy === actor.id })), b.confirm_unticked);
    if (un.problem) refuse(un.problem);
    // BR-8 (M3; review M2): a fact the representative typed since the filing's previous round was frozen (else since this
    // round was sent) makes them an author of the filing: the same base the page compares with (compose).
    const prev = row.filingRound > 1 ? await this.db.reviewRoundFiling.findUnique({ where: { filingId_filingRound: { filingId: b.filing, filingRound: row.filingRound - 1 } }, select: { forms: { select: { itemId: true, snapshotId: true } }, round: { select: { sentAt: true } } } }) : null;
    const baseOf = (s: { itemId: string; snapshotId: string | null }) => prev?.forms.find((x) => x.itemId === s.itemId)?.snapshotId ?? s.snapshotId;
    const snaps = new Map((await this.db.answerSnapshot.findMany({ where: { id: { in: stored.map(baseOf).filter((x): x is string => !!x) } }, select: { id: true, factsJson: true } })).map((s) => [s.id, ((s.factsJson ?? {}) as StoredFacts).facts ?? []]));
    const typist = this.typistOf(basis);
    const since = stored.flatMap((s) => { const f = forms.find((x) => x.item === s.itemId); return f && !f.waits ? changesOf(snaps.get(baseOf(s) ?? "") ?? [], f.facts, basis.words, typist) : []; });
    const frames = await this.framesOf(forms);
    // CI on #1247: an answer the representative typed since then that is not confirmed yet counts too (typedSince).
    const authored = changedBy(since, actor.id) || this.typedBy(basis, forms, actor.id, prev?.round.sentAt ?? round.sentAt);
    const decided = await this.approve(actor, c, { filing: b.filing, rep, self: b.self, changedByReviewer: authored, view },
      async (tx, review, kind) => {
        const [r] = await tx.$queryRaw<{ status: RowStatus }[]>`SELECT status FROM review_round_filing WHERE id = ${row.id}::uuid FOR UPDATE`;
        if (nextStatus(r.status, "approve") === null) refuse({ status: 409, detail: "This filing was decided meanwhile. Reload." });
        await this.stamp(tx, c, actor, stored.map((s) => ({ id: s.id, snapshotId: s.snapshotId, factsHash: s.factsHash })), frames, (x) => stored.find((s) => s.id === x.id)!.itemId);
        await tx.reviewRoundFiling.update({ where: { id: row.id }, data: { status: "approved", decidedBy: actor.id, decidedAt: new Date(), representative: rep, reviewKind: kind, selfStatement: kind === "self_reviewed" ? SELF_STATEMENT : null, confirmedUnticked: un.unticked as object, filingReviewId: review } });
        return round.id;
      });
    return { filing: b.filing, status: "approved" as const, ...decided, confirmed_unticked: un.unticked };
  }

  /** BR-4 with C7.6: the licence, the self-review rule (BR-8) and the filing_review row C7.6 and C8.2 read, written
   *  under the case's row lock with the round's own writes (`write`). Shared by decision, reapprove and oneStep (M1). */
  private async approve(actor: Actor, c: Reached, x: { filing: string; rep: string; self: unknown; changedByReviewer: boolean; view: { readiness: ReadinessView[] }; after?: "send" | "approval" }, write: (tx: Tx, reviewId: string, kind: "reviewed" | "self_reviewed") => Promise<string>) {
    const everyone = await this.db.caseTeamMember.findMany({ where: { caseId: c.id } }); // break N4: ended officer rows too
    const firm = this.firmOf(c), licence = firm ? userIn(firm, actor.id)?.licence ?? null : null;
    const sr = selfReviewOf({ actor: actor.id, officers: new Set(everyone.filter((m) => m.role === "OFFICER").map((m) => m.userId)), solo: !!firm?.solo, changedByReviewer: x.changedByReviewer, self: x.self, after: x.after });
    if ("problem" in sr) refuse(sr.problem);
    const kind = (sr as { kind: "reviewed" | "self_reviewed" }).kind;
    if (!licence) refuse({ status: 409, detail: "An approval needs the representative's licence number on the firm record; none is set." });
    const rd = x.view.readiness.find((r) => r.filing === x.filing);
    if (!rd) refuse({ status: 409, detail: "This filing's readiness could not be worked out (it is not on the application now)." });
    const out = await busyWords(() => this.db.$transaction(async (tx) => {
      await this.lockCase(tx, c);
      const review = await tx.filingReview.create({ data: { workspaceId: c.workspaceId, filingId: x.filing, reviewedBy: actor.id, kind, licenceNumber: licence!.number, note: null, factsHash: rd!.facts_hash } });
      const roundId = await write(tx, review.id, kind);
      await tx.auditEvent.create({ data: { workspaceId: c.workspaceId, actor: actor.id, action: kind, entity: "filing", entityKey: x.filing, summary: `${actor.name} ${kind === "self_reviewed" ? "self-reviewed" : "reviewed"} a filing on case ${c.id.slice(0, 8)} (licence ${licence!.number}), each form stamped`.slice(0, 600), detail: { case: c.id, round: roundId } } });
      return review;
    }, TX));
    const name = this.nameOf(c, actor.id) ?? actor.name;
    return { review: out.id, kind, licence_number: licence!.number, at: out.reviewedAt.toISOString(), words: kind === "self_reviewed" ? `Self-reviewed by ${name} (licence ${licence!.number})` : `Reviewed by ${name} (licence ${licence!.number})` };
  }

  // ---------------------------------------------------------------- P-412 one-click re-approve of the changed forms

  /** POST /runtime/reviews/:id/reapprove {filing, form_hashes, self?}: after an approval, the forms a fact change
   *  withdrew are re-approved in one click (P-412 F1). A new round (kind reapprove) with the filing approved at once:
   *  forms still current keep their stamp; the changed ones are stamped with today's facts. */
  async reapprove(actor: Actor, id: string, body: unknown) {
    const { round, c } = await this.roundOf(actor, id);
    const b = parsed(ReviewReapprove, body);
    const rep = await this.mustDecide(actor, c);
    const row = await this.rowOf(c, round, b.filing);
    const filing = await this.db.filing.findUnique({ where: { id: b.filing }, select: { status: true, active: true } });
    if (!filing?.active || filing.status === "SUBMITTED") refuse({ status: 409, detail: "This filing is recorded as submitted or no longer on the application: its review is closed." });
    if (row.status !== "approved") refuse({ status: 409, detail: "Only an approved filing is re-approved; this one is not approved. Reload." });
    if (await this.db.reviewRoundFiling.findFirst({ where: { filingId: b.filing, filingRound: { gt: row.filingRound } }, select: { id: true } })) refuse({ status: 409, detail: "A newer round of this filing exists: open that one. Reload." });
    const { view, basis } = await this.basisOf(actor, c);
    const forms = this.formsOf(basis, b.filing), stored = await this.db.reviewRoundForm.findMany({ where: { roundFilingId: row.id } });
    const hp = hashesProblem(b.form_hashes, forms.map((f) => ({ item: f.item, hash: f.hash })));
    if (hp) refuse(hp);
    const changed = withdrawnForms(forms.map((f) => { const s = stored.find((x) => x.itemId === f.item); return { item: f.item, waits: f.waits, liveHash: f.hash, validatedSha: f.validatedSha, stamp: s?.stampedAt ? { hash: s.stampHash, by: row.representative, file: { kind: s.stampFileKind, sha256: s.stampFileSha256 } } : null }; }), rep);
    if (!changed.length) refuse({ status: 409, detail: "Nothing changed since this filing was approved: its approval stands. Reload." });
    // BR-8: a changed fact the representative typed themself makes them an author.
    const snaps = new Map((await this.db.answerSnapshot.findMany({ where: { id: { in: stored.map((s) => s.stampSnapshotId).filter((x): x is string => !!x) } }, select: { id: true, factsJson: true } })).map((s) => [s.id, ((s.factsJson ?? {}) as StoredFacts).facts ?? []]));
    const typist = this.typistOf(basis);
    const since = changed.flatMap((w) => { const s = stored.find((x) => x.itemId === w.item), f = forms.find((x) => x.item === w.item)!; return changesOf(snaps.get(s?.stampSnapshotId ?? "") ?? [], f.facts, basis.words, typist); });
    const frames = await this.framesOf(forms), checks = await this.db.reviewCheck.findMany({ where: { roundFilingId: row.id } });
    // Review m5, break m2: ticks carry only when the representative of record made them (a new representative's round
    // starts with their own); the items not ticked by them are recorded as confirmed unticked by this one click.
    const mine = checks.filter((k) => k.tickedBy === rep);
    const carry = { stamps: new Map(stored.filter((s) => stampCurrent(s.stampedAt ? { hash: s.stampHash, by: row.representative, file: { kind: s.stampFileKind, sha256: s.stampFileSha256 } } : null, { hash: forms.find((f) => f.item === s.itemId)?.hash ?? null, representative: rep, validatedSha: forms.find((f) => f.item === s.itemId)?.validatedSha ?? null }).current).map((s) => [s.itemId, s])), ticks: new Map(mine.map((k) => [k.itemKey, { by: k.tickedBy, at: k.tickedAt }])) };
    const unticked = checks.filter((k) => k.source !== "form" && k.tickedBy !== rep).map((k) => k.itemKey);
    let made: { id: string; number: number } | null = null;
    const authored = changedBy(since, actor.id) || this.typedBy(basis, forms.filter((f) => changed.some((w) => w.item === f.item)), actor.id, row.decidedAt ?? round.sentAt);
    const decided = await this.approve(actor, c, { filing: b.filing, rep, self: b.self, changedByReviewer: authored, view, after: "approval" }, async (tx, review, kind) => {
      if (await tx.reviewRoundFiling.findFirst({ where: { filingId: b.filing, OR: [{ filingRound: { gt: row.filingRound } }, { status: { in: ["sent", "under_review"] } }] }, select: { id: true } })) refuse({ status: 409, detail: "This filing was sent or re-approved meanwhile. Reload." });
      const { n, per } = await this.nextNumbers(tx, c.id, [b.filing]);
      const r2 = await tx.reviewRound.create({ data: { workspaceId: c.workspaceId, caseId: c.id, number: n, kind: "reapprove", sentBy: actor.id } });
      const now = new Date();
      const nr = await tx.reviewRoundFiling.create({ data: { workspaceId: c.workspaceId, caseId: c.id, roundId: r2.id, filingId: b.filing, filingRound: per.get(b.filing)!, status: "approved", openedBy: actor.id, openedAt: now, decidedBy: actor.id, decidedAt: now,
        representative: rep, reviewKind: kind, selfStatement: kind === "self_reviewed" ? SELF_STATEMENT : null, confirmedUnticked: unticked as object, filingReviewId: review } });
      const out = await this.freeze(tx, c, { id: nr.id, roundId: r2.id, filingId: b.filing }, frames, checks.map((k) => ({ key: k.itemKey, source: k.source as CheckItem["source"], wording: k.wording, live: (k.live ?? null) as Record<string, unknown> | null })), carry);
      await this.stamp(tx, c, actor, [...out].map(([item, x]) => ({ id: x.id, snapshotId: x.snapshotId, factsHash: frames.find((f) => f.item === item)?.hash ?? null })), frames, (x) => [...out].find(([, y]) => y.id === x.id)![0]);
      made = { id: r2.id, number: n };
      return r2.id;
    });
    return { filing: b.filing, status: "approved" as const, round: made, reapproved: changed.map((x) => x.item), ...decided };
  }

  // ---------------------------------------------------------------- M1: the C7.6 route as a one-step round

  /** What the C7.6 route needs before its transaction: the filing's readiness (its facts hash) and each form's frame and
   *  checklist, from one pass of the view. A filing in an open round is decided on the Review page instead (409). */
  async oneStepBasis(actor: Actor, c: Reached, filing: string) {
    if (await this.db.reviewRoundFiling.findFirst({ where: { filingId: filing, status: { in: ["sent", "under_review"] } }, select: { id: true } }))
      refuse({ status: 409, detail: "This filing is sent for review: approve it or send it back on the Review page (Open the review)." });
    const { view, basis } = await this.basisOf(actor, c);
    return { rd: view.readiness.find((x) => x.filing === filing) ?? null, frames: await this.framesOf(this.formsOf(basis, filing)), checks: await this.checklistFor(c, view, basis, filing) };
  }
  /** Inside the C7.6 route's transaction, after its filing_review row: one round, sent, opened and approved by the
   *  representative of record in one step, every form frozen and stamped by the same code as a send and an approval. */
  async oneStep(tx: Tx, c: Reached, actor: Actor, x: { filing: string; reviewId: string; kind: "reviewed" | "self_reviewed"; frames: Frozen[]; checks: CheckItem[] }) {
    // Break M3: under the case's row lock (the caller took it), a send that committed meanwhile is seen: refused, and the
    // caller's transaction (its filing_review row too) is rolled back.
    if (await tx.reviewRoundFiling.findFirst({ where: { filingId: x.filing, status: { in: ["sent", "under_review"] } }, select: { id: true } }))
      refuse({ status: 409, detail: "This filing was sent for review meanwhile: approve it or send it back on the Review page (Open the review). Nothing was recorded." });
    const { n, per } = await this.nextNumbers(tx, c.id, [x.filing]);
    const r = await tx.reviewRound.create({ data: { workspaceId: c.workspaceId, caseId: c.id, number: n, kind: "one_step", sentBy: actor.id } });
    const now = new Date();
    const row = await tx.reviewRoundFiling.create({ data: { workspaceId: c.workspaceId, caseId: c.id, roundId: r.id, filingId: x.filing, filingRound: per.get(x.filing)!, status: "approved", openedBy: actor.id, openedAt: now, decidedBy: actor.id, decidedAt: now,
      representative: actor.id, reviewKind: x.kind, selfStatement: x.kind === "self_reviewed" ? SELF_STATEMENT : null, confirmedUnticked: x.checks.filter((k) => k.source !== "form").map((k) => k.key) as object, filingReviewId: x.reviewId } });
    const out = await this.freeze(tx, c, { id: row.id, roundId: r.id, filingId: x.filing }, x.frames, x.checks);
    await this.stamp(tx, c, actor, [...out].map(([item, y]) => ({ id: y.id, snapshotId: y.snapshotId, factsHash: x.frames.find((f) => f.item === item)?.hash ?? null })), x.frames, (y) => [...out].find(([, z]) => z.id === y.id)![0]);
    return r.id;
  }
}

@CaseRead()
@Controller("api/runtime")
export class ReviewRoundsController {
  constructor(@Inject(ReviewRounds) private readonly x: ReviewRounds) {}
  @Get("cases/:id/reviews") list(@Headers("x-actor") a: H, @Param("id") id: string) { return this.x.list(actorOf(a), id); }
  @Post("cases/:id/reviews") @HttpCode(201) send(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.x.send(actorOf(a), id, b); }
  @Get("reviews/:id") read(@Headers("x-actor") a: H, @Param("id") id: string) { return this.x.read(actorOf(a), id); }
  @Post("reviews/:id/open") @HttpCode(200) open(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.x.open(actorOf(a), id, b); }
  @Post("reviews/:id/checks") @HttpCode(200) check(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.x.check(actorOf(a), id, b); }
  @Post("reviews/:id/decision") @HttpCode(200) decision(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.x.decision(actorOf(a), id, b); }
  @Post("reviews/:id/reapprove") @HttpCode(200) reapprove(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.x.reapprove(actorOf(a), id, b); }
}
