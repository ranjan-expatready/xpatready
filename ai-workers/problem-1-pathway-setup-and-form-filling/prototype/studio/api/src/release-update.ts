// C9.5 Adopt a published update on an open case (B145, M3; concept screens/B145/concept.md, challenge.md; SA-1B-253,
// -254, AG-7-56; P-65, P-237, P-316): what a newer release of the case's own combination would change for this case and
// for the work already done (GET, computed, writes nothing), and the one-click move with a reason (POST: a new pin
// revision, insert only, under the case's row lock that Fill also takes). Case staff of the case's firm only: a client
// and configuration people 403, another firm 404 (Runtime.reach). Rules only, identical with AI off; no model call (US$0).
// The rules are engine/runtime/release-update.ts; the case side is api/src/release-context.ts.
import { Body, Controller, Get, Headers, HttpCode, HttpException, HttpStatus, Inject, Injectable, Param, Post } from "@nestjs/common";
import { problemFromZod } from "../../contracts/programs.ts";
import { RELEASE_MOVE_REASON, ReleaseMove, type ReleaseMoved, type ReleaseUpdate } from "../../contracts/runtime.ts";
import { checkValue } from "../../engine/runtime/case.ts";
import { EFFECT_KEYS, effectsOf, moveRefusal, touchedFilings, typeWords, whatChanges, type Effects, type ReleaseDiff, type Work } from "../../engine/runtime/release-update.ts";
import type { Snapshot } from "../../engine/snapshot.ts";
import { actorOf, Audit, CaseRead, Db, type Actor } from "./core.ts";
import { CasePrepare } from "./case-prepare.ts";
import { caseInputs, diffCache, pinReleases, targetRelease, type CaseState } from "./release-context.ts";
import { Runtime, type Reached } from "./runtime.ts";

type H = string | undefined;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const short = (id: string) => id.slice(0, 8);
const FEES = "Fees are not part of a release yet; they come from the fee table.";
const problem = (status: number, title: string, detail: string, extra: Record<string, unknown> = {}): never => {
  throw new HttpException({ type: "https://expatready.local/problems/release-update", title, status, detail, ...extra }, status);
};
const stale = (): never => problem(409, "Changed by someone else", "This case or its release changed while you read the list: read the list again. Nothing was changed.", { code: "stale" });
const emptyEffects = (): Effects => ({ fill_again: [], filed_another_way: [], no_longer_required: [], withdrawn: [], kept_out_of_date: [], unchanged: { count: 0, words: "" } });
type Filing = { id: string; label: string; people: string[] };

@Injectable()
export class ReleaseUpdates {
  constructor(@Inject(Runtime) private readonly r: Runtime, @Inject(Db) private readonly db: Db, @Inject(Audit) private readonly audit: Audit, @Inject(CasePrepare) private readonly prepare: CasePrepare) {}

  /** GET /runtime/cases/:id/release-update: the list, computed; nothing is written by it. */
  async view(actor: Actor, caseId: string): Promise<ReleaseUpdate & { last_move: LastMove | null }> {
    const c = await this.r.reach(actor, UUID.test(caseId) ? caseId : "00000000-0000-0000-0000-000000000000", "officer");
    return this.compute(actor, c);
  }

  private async state(c: Reached): Promise<CaseState> { const { answers, rows, groups } = await this.r.state(c); return { people: this.r.peopleOf(c), answers, rows, groups }; }
  private async combination(c: Reached) { return (await this.db.combination.findUnique({ where: { id: c.combinationId }, select: { combinationKey: true, label: true } }))!; }

  /** The case's filings as the prepare view stores them, each named by its owner, and whether its review counts now. */
  private async filings(actor: Actor, c: Reached): Promise<{ filings: Filing[]; reviewed: Set<string> }> {
    const v = await this.prepare.view(actor, c.id) as { filings: { id: string; owner?: { label: string }; applicants: { subject: string; label: string }[] }[]; readiness: { filing: string; reviewed: unknown }[] };
    return { filings: v.filings.map((f) => ({ id: f.id, label: `${f.owner?.label ?? f.applicants[0]?.label ?? "The"}'s filing`, people: f.applicants.map((a) => a.subject) })),
      reviewed: new Set(v.readiness.filter((x) => x.reviewed).map((x) => x.filing)) };
  }

  /** Each piece of work done on the case: the newest copy of each form for each person (a draft, or finished when read
   *  back validated or locked), each signed scan, each form entered in the portal, each document uploaded. `before`:
   *  only work made before that moment (the last move). */
  private async work(c: Reached, people: Map<string, string>, before?: Date, onRelease?: (releaseId: string) => boolean): Promise<Work[]> {
    const at = before ? { lt: before } : undefined;
    const copies = await this.db.formInstance.findMany({ where: { caseId: c.id, status: "GENERATED" }, orderBy: [{ createdAt: "desc" }, { id: "asc" }], select: { id: true, formNumber: true, subjectId: true, lockedAt: true, configReleaseId: true, createdAt: true } });
    const validated = new Set((await this.db.validatedCopy.findMany({ where: { copy: { caseId: c.id } }, select: { formInstanceId: true } })).map((v) => v.formInstanceId));
    const seen = new Set<string>(), out: Work[] = [];
    for (const x of copies) {
      const k = `${x.formNumber}|${x.subjectId}`;
      if (seen.has(k)) continue; seen.add(k);
      if ((before && x.createdAt >= before) || (onRelease && !onRelease(x.configReleaseId))) continue;
      const finished = !!x.lockedAt || validated.has(x.id);
      out.push({ id: x.id, kind: "copy", form: x.formNumber, subject: x.subjectId, finished, release: x.configReleaseId, label: `${x.formNumber} ${x.lockedAt ? "filed copy" : validated.has(x.id) ? "validated copy" : "draft copy"}` });
    }
    const items = new Map((await this.db.filingItem.findMany({ where: { caseId: c.id, kind: "form" }, select: { id: true, itemKey: true, subjectId: true } })).map((i) => [i.id, i]));
    const scans = await this.db.signedScan.findMany({ where: { caseId: c.id, ...(at ? { uploadedAt: at } : {}) }, orderBy: [{ uploadedAt: "desc" }, { id: "asc" }], select: { id: true, itemId: true } });
    const scanned = new Set<string>();
    for (const s of scans) { const i = items.get(s.itemId); if (!i || scanned.has(i.id)) continue; scanned.add(i.id); out.push({ id: s.id, kind: "signed_scan", form: i.itemKey, subject: i.subjectId, finished: true, label: `${i.itemKey} signed scan` }); }
    const entered = await this.db.enteredSection.findMany({ where: { caseId: c.id, supersededAt: null, ...(at ? { enteredAt: at } : {}) }, select: { itemId: true } });
    for (const id of new Set(entered.map((e) => e.itemId))) { const i = items.get(id); if (i) out.push({ id, kind: "entered", form: i.itemKey, subject: i.subjectId, finished: true, label: `${i.itemKey} entered in the portal` }); }
    const docs = await this.db.caseDocument.findMany({ where: { subjectId: { in: [...people.keys()] }, current: true, ...(at ? { uploadedAt: at } : {}) }, select: { id: true, subjectId: true, documentType: true, fileName: true } });
    for (const d of docs) out.push({ id: d.id, kind: "upload", document: d.documentType, subject: d.subjectId, finished: true, label: `${d.documentType.replace(/_/g, " ")} upload` });
    return out;
  }

  private async compute(actor: Actor, c: Reached): Promise<ReleaseUpdate & { last_move: LastMove | null }> {
    const pins = pinReleases(c), cur = pins[0];
    const combo = await this.combination(c);
    const base = { case_id: c.id, combination: combo.label, current: { version: cur.version, label: cur.label, revision: cur.revision, pinned_at: cur.pinnedAt.toISOString() }, fees: FEES,
      can_move: (actor.duties as readonly string[]).includes("case"), reason_default: RELEASE_MOVE_REASON };
    const target = await targetRelease(this.db, c);
    const st = await this.state(c), today = new Date(), diffOf = diffCache();
    const names = new Map(st.people.filter((p) => p.role !== "case").map((p) => [p.subjectId, p.label]));
    const last = cur.revision > 1 ? await this.lastMove(actor, c, st, names, diffOf) : null;
    if (!target) return { ...base, target: null, changes: { forms: [], documents: [], questions: [], eligibility: [] }, effects: emptyEffects(), touched: [], refused: null, last_move: last };
    const diff = diffOf(cur.id, cur.snapshot, target.id, target.snapshot);
    const inputs = caseInputs(cur.snapshot, target.snapshot, combo.combinationKey, st, today, true);
    const { filings, reviewed } = await this.filings(actor, c);
    const labels = { to: target.label };
    const touched = touchedFilings(diff, inputs, filings, labels);
    const work = await this.work(c, names);
    const effects = effectsOf(diff, inputs, work, filings.map((f) => ({ filing: f.id, label: f.label, counts: reviewed.has(f.id) })), touched, labels);
    const refused = await this.refusal(c, st, diff, target.snapshot, cur.label, names, askedOf(inputs));
    return { ...base, target: { version: target.version, label: target.label, released_at: target.releasedAt.toISOString(), demo: target.demo },
      changes: whatChanges(diff, inputs), effects, touched: filings.filter((f) => (touched.get(f.id) ?? []).length).map((f) => ({ filing: f.id, label: f.label, words: touched.get(f.id)! })), refused, last_move: last };
  }

  /** After a move, what it did to the work made before it that still waits (a copy filled again on the new release
   *  leaves "to fill again"), so Prepare can show the groups. */
  private async lastMove(actor: Actor, c: Reached, st: CaseState, names: Map<string, string>, diffOf: ReturnType<typeof diffCache>): Promise<LastMove> {
    const pins = pinReleases(c), [cur, prev] = pins;
    const combo = await this.combination(c);
    const diff = diffOf(prev.id, prev.snapshot, cur.id, cur.snapshot);
    const inputs = caseInputs(prev.snapshot, cur.snapshot, combo.combinationKey, st, new Date(), false);
    const { filings } = await this.filings(actor, c);
    const labels = { to: cur.label };
    const touched = touchedFilings(diff, inputs, filings, labels);
    const work = await this.work(c, names, cur.pinnedAt, (rel) => rel !== cur.id);
    const reviews = await this.db.filingReview.findMany({ where: { filingId: { in: filings.map((f) => f.id) }, reviewedAt: { lt: cur.pinnedAt } }, orderBy: [{ reviewedAt: "desc" }], select: { filingId: true } });
    const had = new Set(reviews.map((r) => r.filingId));
    const effects = effectsOf(diff, inputs, work, filings.map((f) => ({ filing: f.id, label: f.label, counts: had.has(f.id) })), touched, labels);
    return { from: { version: prev.version, label: prev.label, revision: prev.revision }, to: { version: cur.version, label: cur.label, revision: cur.revision }, at: cur.pinnedAt.toISOString(), reason: cur.reason, effects };
  }

  /** BR-7: why the move is refused now (null: it may go ahead), read from the database as it is. */
  private async refusal(c: Reached | { id: string }, st: CaseState, diff: ReleaseDiff, to: Snapshot, currentLabel: string, names: Map<string, string>, asked: Set<string>, tx: Pick<Db, "filingRecord" | "formInstance" | "filing"> = this.db) {
    const recorded = await tx.filingRecord.findMany({ where: { caseId: c.id }, select: { filingId: true } });
    const owners = recorded.length ? await tx.filing.findMany({ where: { id: { in: recorded.map((x) => x.filingId) } }, select: { subjectId: true } }) : [];
    const running = await tx.formInstance.findMany({ where: { caseId: c.id, status: { in: ["QUEUED", "RUNNING"] } }, select: { formNumber: true, subjectId: true } });
    const today = new Date();
    const mismatches = st.answers.filter((a) => diff.types.has(a.field) && asked.has(`${a.subjectId}|${a.field}`) && checkValue(to, a.field, a.value, today).length > 0)
      .map((a) => ({ label: diff.types.get(a.field)!.label, person: names.get(a.subjectId) ?? "The application", expects: typeWords(diff.types.get(a.field)!.after) }));
    return moveRefusal({ recorded: owners.map((o) => names.get(o.subjectId) ?? "A person"), running: running.map((x) => ({ form: x.formNumber, person: names.get(x.subjectId) ?? "a person" })), mismatches, current: currentLabel });
  }

  /** POST /runtime/cases/:id/release-update {target_version, from_revision, reason}: one new pin revision on the newest
   *  release, all or nothing. Checked under the case's row lock (Fill takes it too): the revision and release read, a
   *  recorded filing, a copy being filled, an answer that no longer fits its type. */
  async move(actor: Actor, caseId: string, body: unknown): Promise<ReleaseMoved> {
    const c = await this.r.reach(actor, UUID.test(caseId) ? caseId : "00000000-0000-0000-0000-000000000000", "officer");
    const parsed = ReleaseMove.safeParse(body ?? {});
    if (!parsed.success) throw new HttpException(problemFromZod(parsed.error), HttpStatus.BAD_REQUEST);
    const b = parsed.data;
    const before = await this.compute(actor, c);
    if (!before.target) problem(409, "Not possible now", `This case is on the newest release of ${before.combination} (${before.current.label}): there is nothing to move to. Nothing was changed.`, { code: "newest" });
    if (b.from_revision !== before.current.revision || b.target_version !== before.target!.version) stale();
    if (before.refused) problem(409, "Not possible now", before.refused.reason, { code: before.refused.code, item: before.refused.item ?? null });
    const target = (await targetRelease(this.db, c))!;
    const st = await this.state(c), names = new Map(st.people.filter((p) => p.role !== "case").map((p) => [p.subjectId, p.label]));
    const pin = c.pins[0];
    const diff = diffCache()(pin.configReleaseId, this.r.snapshotOf(c), target.id, target.snapshot);
    const combo = await this.combination(c), asked = askedOf(caseInputs(this.r.snapshotOf(c), target.snapshot, combo.combinationKey, st, new Date(), true));
    const made = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM runtime_case WHERE id = ${c.id}::uuid FOR UPDATE`;
      const newest = await tx.packWorkPin.findFirst({ where: { caseId: c.id }, orderBy: { revision: "desc" }, select: { revision: true } });
      const latest = await tx.configRelease.findFirst({ where: { combinationId: c.combinationId }, orderBy: { version: "desc" }, select: { id: true, version: true } });
      if (newest?.revision !== b.from_revision || latest?.id !== target.id) return "stale" as const;
      // The answers read again under the lock (a change made since the list was read is judged as it is now).
      const now = { ...st, answers: (await this.r.state(c)).answers };
      const why = await this.refusal(c, now, diff, target.snapshot, before.current.label, names, asked, tx);
      if (why) return why;
      return tx.packWorkPin.create({ data: { workspaceId: c.workspaceId, caseId: c.id, combinationId: c.combinationId, partyId: pin.partyId, packVersionId: target.packVersionId ?? null, configReleaseId: target.id, contentHash: target.sha256, revision: b.from_revision + 1, actorId: actor.id, reason: b.reason } });
    }, { timeout: 15_000, maxWait: 10_000 });
    if (made === "stale") return stale();
    if ("code" in made) return problem(409, "Not possible now", made.reason, { code: made.code, item: made.item ?? null });
    const pinRow = made;
    const counts = Object.fromEntries(EFFECT_KEYS.map((k) => [k, before.effects[k].length])) as ReleaseMoved["counts"];
    await this.audit.log(c.workspaceId, actor.id, "moved_release", "case", c.id, `${actor.name} moved case ${short(c.id)} from ${before.current.label} (pin revision ${before.current.revision}) to ${target.label} (pin revision ${pinRow.revision}) of ${before.combination}; reason given`,
      { case: c.id, from: { version: before.current.version, revision: before.current.revision }, to: { version: target.version, revision: pinRow.revision }, counts }, c.combinationId);
    return { case_id: c.id, revision: pinRow.revision, version: target.version, label: target.label, from: { version: before.current.version, label: before.current.label, revision: before.current.revision }, counts, words: movedWords(target.label, counts) };
  }
}

/** The answers the new release asks of each person ("subject|fact"): only these can refuse a move by their type. */
const askedOf = (x: { answered: { subject: string; fact: string }[] }) => new Set(x.answered.map((a) => `${a.subject}|${a.fact}`));

type LastMove = { from: { version: number; label: string; revision: number }; to: { version: number; label: string; revision: number }; at: string; reason: string | null; effects: Effects };

/** The toast after the move (concept §4): what it did, counted, never "re-filled". */
export function movedWords(label: string, n: ReleaseMoved["counts"]): string {
  const part = (k: number, one: string, many: string) => (k ? `${k} ${k === 1 ? one : many}` : null);
  const parts = [part(n.fill_again, "form to fill again (press Fill)", "forms to fill again (press Fill)"), part(n.filed_another_way, "item filed another way now", "items filed another way now"),
    part(n.no_longer_required, "item no longer required", "items no longer required"), part(n.withdrawn, "review withdrawn", "reviews withdrawn"),
    n.kept_out_of_date ? `${n.kept_out_of_date} finished item${n.kept_out_of_date === 1 ? "" : "s"} marked out of date, not changed` : "nothing finished was changed"].filter(Boolean);
  return `Moved to ${label}. ${parts.join("; ")}.`;
}

@CaseRead()
@Controller("api/runtime")
export class ReleaseUpdatesController {
  constructor(@Inject(ReleaseUpdates) private readonly x: ReleaseUpdates) {}
  @Get("cases/:id/release-update") view(@Headers("x-actor") a: H, @Param("id") id: string) { return this.x.view(actorOf(a), id); }
  @Post("cases/:id/release-update") @HttpCode(HttpStatus.OK) move(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.x.move(actorOf(a), id, b); }
}
