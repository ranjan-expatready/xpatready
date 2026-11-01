// C6.12 /prepare (M3-B2, runtime lane; r5c BR-1, BR-8, BR-16, BR-18, contract §6): GET /api/runtime/cases/:id/prepare.
// The case's filings, submission group, form items and fee lines. They are derived from the case's people and pinned
// release as C6.12's /filings does, then stored the first time they appear (submission_group, filing,
// filing_applicant, filing_item), so each keeps its id: a person who stops applying keeps an inactive filing and gets
// the same one back; a form that stops applying keeps its item and channel. Nothing is created by hand (no POST). The
// case officer reads it; a client and configuration people do not (deny by default, as runtime.ts). Visitor visa only
// in this slice; other combinations answer "not derived yet". Amounts Sample until the expert confirms. US$0.
import { randomUUID } from "node:crypto";
import { Controller, Get, Head, Headers, HttpStatus, Inject, Injectable, Param } from "@nestjs/common";
import type { Channel } from "../../contracts/forms.ts";
import { acceptsOf } from "../../engine/channels.ts";
import { checkValue, knownOf } from "../../engine/runtime/case.ts";
import { deriveFilings } from "../../engine/runtime/filings.ts";
import { formItems, prepareView } from "../../engine/runtime/prepare.ts";
import { snapshotHash } from "../../engine/snapshot.ts";
import { actorOf, CaseRead, Db, fail, type Actor } from "./core.ts";
import { Runtime } from "./runtime.ts";

type H = string | undefined;

@Injectable()
export class CasePrepare {
  constructor(@Inject(Runtime) private readonly r: Runtime, @Inject(Db) private readonly db: Db) {}

  async view(actor: Actor, caseId: string) {
    // Everything but the stored rows is read first, on the shared client, outside any transaction (review round 2 M1:
    // a transaction that also reads through the shared client holds two connections and starves the pool).
    const got = await this.context(await this.r.reach(actor, caseId, "officer"));
    if (!got.ready) return got.head;
    const ctx = got.ready;
    // Break B1: a read with nothing new to store takes no transaction and no lock. Only a read that has something to
    // store takes the per-case lock and, under it, reads the stored rows again before writing (only through tx).
    const fast = await this.rows(this.db, ctx, false);
    if (fast) return fast;
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`select pg_advisory_xact_lock(hashtext(${"prepare:" + ctx.c.id}))`;
      return (await this.rows(tx, ctx, true))!;
    }, { timeout: 15_000, maxWait: 10_000 });
  }

  /** What the case's release, people and answers say, and what IRCC accepts: read once, before any lock. */
  private async context(c: Reached) {
    const s = this.r.snapshotOf(c), pin = c.pins[0];
    // Money and filings follow the combination: the release must describe the case's own combination (as /filings),
    // and (break B2) be the snapshot its release fingerprinted: a row edited underneath is never stored from.
    const own = await this.db.combination.findUnique({ where: { id: c.combinationId }, select: { combinationKey: true } });
    if (!own || s?.combination?.key !== own.combinationKey) fail("This case's release does not describe the case's own combination; nothing was prepared. Ask the Lead.", HttpStatus.CONFLICT);
    if (snapshotHash(s) !== pin.release.sha256) fail("This case's release no longer matches its fingerprint (it was changed after release); nothing was prepared. Ask the Lead.", HttpStatus.CONFLICT);
    const people = this.r.peopleOf(c);
    const derived = deriveFilings(own!.combinationKey, people);
    const head = { case_id: c.id, reference: c.reference, release_version: pin.release.version };
    if (!derived.derived) return { head: { ...head, ...derived }, ready: null };
    const today = new Date();
    const { answers, rows } = await this.r.state(c);
    // As the checklist (C6.4 B-M2): an answer its own checks reject never decides which forms a person files.
    const { known } = knownOf(s, people, answers.filter((x) => checkValue(s, x.field, x.value, today).length === 0), rows, today);
    return { head, ready: { c, s, head, people, derived, needs: formItems(s, people, known, today), accepts: await acceptsOf(this.db, c.workspaceId) } };
  }

  /** The stored rows for the case's view. write=false: null when something new would be stored (the caller retries
   *  under the lock). write=true: stores only what is new or changed (review M1: no write at all when nothing changed). */
  private async rows(q: Tx, ctx: NonNullable<Awaited<ReturnType<CasePrepare["context"]>>["ready"]>, write: boolean) {
    const { c, s, head, people, derived, needs, accepts } = ctx;
    const roles = new Map(people.map((p) => [p.subjectId, p.role]));
    const ws = c.workspaceId;

    let groups = await q.submissionGroup.findMany({ where: { caseId: c.id }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
    let filings = await q.filing.findMany({ where: { caseId: c.id }, select: { id: true, subjectId: true, active: true } });
    const items = await q.filingItem.findMany({ where: { filing: { caseId: c.id } }, select: { id: true, filingId: true, formKey: true, subjectId: true, active: true } });
    const filers = new Set(derived.filings.map((f) => f.applicants[0].subject));
    const missing = derived.filings.filter((f) => !filings.some((x) => x.subjectId === f.applicants[0].subject));
    const filingsOn = filings.filter((f) => !f.active && filers.has(f.subjectId)).map((f) => f.id), filingsOff = filings.filter((f) => f.active && !filers.has(f.subjectId)).map((f) => f.id);
    let filingOf = new Map(filings.filter((f) => filers.has(f.subjectId)).map((f) => [f.subjectId, f.id]));
    const key = (i: { filingId: string; formKey: string; subjectId: string }) => `${i.filingId}|${i.formKey}|${i.subjectId}`;
    const itemPlan = () => {
      const wanted = new Set(needs.filter((n) => filingOf.has(n.subject)).map((n) => `${filingOf.get(n.subject)}|${n.form}|${n.subject}`));
      return { add: needs.filter((n) => filingOf.has(n.subject) && !items.some((i) => key(i) === `${filingOf.get(n.subject)}|${n.form}|${n.subject}`)),
        on: items.filter((i) => !i.active && wanted.has(key(i))).map((i) => i.id), off: items.filter((i) => i.active && !wanted.has(key(i))).map((i) => i.id) };
    };
    let plan = itemPlan();
    const changes = (!groups.length && derived.filings.length) || missing.length || filingsOn.length || filingsOff.length || plan.add.length || plan.on.length || plan.off.length;
    if (changes && !write) return null;
    if (changes) {
      if (!groups.length && derived.filings.length) groups = [await q.submissionGroup.create({ data: { workspaceId: ws, caseId: c.id, kind: "family" } })];
      const fresh = missing.map((f) => ({ id: randomUUID(), workspaceId: ws, caseId: c.id, submissionGroupId: groups[0].id, subjectId: f.applicants[0].subject, combinationKey: f.combination, mode: f.mode }));
      if (fresh.length) {
        await q.filing.createMany({ data: fresh });
        await q.filingApplicant.createMany({ data: fresh.map((f) => ({ filingId: f.id, subjectId: f.subjectId, role: roles.get(f.subjectId) ?? "principal", mode: "applying" })), skipDuplicates: true });
        filings = [...filings, ...fresh.map((f) => ({ id: f.id, subjectId: f.subjectId, active: true }))];
        filingOf = new Map(filings.filter((f) => filers.has(f.subjectId)).map((f) => [f.subjectId, f.id]));
        plan = itemPlan();
      }
      if (filingsOn.length) await q.filing.updateMany({ where: { id: { in: filingsOn } }, data: { active: true } });
      if (filingsOff.length) await q.filing.updateMany({ where: { id: { in: filingsOff } }, data: { active: false } });
      if (plan.add.length) await q.filingItem.createMany({ data: plan.add.map((n) => ({ workspaceId: ws, filingId: filingOf.get(n.subject)!, kind: "form", formKey: n.form, subjectId: n.subject, channel: n.channel })), skipDuplicates: true });
      if (plan.on.length) await q.filingItem.updateMany({ where: { id: { in: plan.on } }, data: { active: true } });
      if (plan.off.length) await q.filingItem.updateMany({ where: { id: { in: plan.off } }, data: { active: false } });
    }
    // Review round 2 m1: filings in the order of the people on the case (new filings share one created_at).
    const order = new Map(people.map((p, i) => [p.subjectId, i]));
    const [allFilings, allItems] = await Promise.all([
      q.filing.findMany({ where: { caseId: c.id }, include: { applicants: true }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] }).then((xs) => xs.sort((x, y) => (order.get(x.subjectId) ?? 99) - (order.get(y.subjectId) ?? 99))),
      q.filingItem.findMany({ where: { filing: { caseId: c.id } }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] }),
    ]);
    const view = prepareView({ derived, portal: s.combination.portal ?? null, needs, labels: new Map(people.map((p) => [p.subjectId, p.label])), accepts: (form) => accepts.get(form),
      filings: allFilings.map((f) => ({ ...f, applicants: f.applicants.map((a) => ({ subjectId: a.subjectId, role: a.role, mode: a.mode })) })),
      groups, items: allItems.map((i) => ({ ...i, channel: i.channel as Channel })) });
    return { ...head, ...view };
  }
}

type Tx = Pick<Db, "submissionGroup" | "filing" | "filingApplicant" | "filingItem">;
type Reached = Awaited<ReturnType<Runtime["reach"]>>;

@CaseRead()
@Controller("api/runtime")
export class CasePrepareController {
  constructor(@Inject(CasePrepare) private readonly x: CasePrepare) {}
  // Break B4: HEAD would run the GET handler and store rows; it is refused (405), never answered from a write.
  @Head("cases/:id/prepare") head() { fail("HEAD is not offered on /prepare: use GET.", HttpStatus.METHOD_NOT_ALLOWED); }
  @Get("cases/:id/prepare") view(@Headers("x-actor") a: H, @Param("id") id: string) { return this.x.view(actorOf(a), id); }
}
