// C6.12 /prepare (M3-B2, runtime lane; r5c BR-1, BR-8, BR-16, BR-18, contract §6): GET /api/runtime/cases/:id/prepare.
// The case's filings, submission group, form items and fee lines. They are derived from the case's people and pinned
// release as C6.12's /filings does, then stored the first time they appear (submission_group, filing,
// filing_applicant, filing_item), so each keeps its id: a person who stops applying keeps an inactive filing and gets
// the same one back; a form that stops applying keeps its item and channel. Nothing is created by hand (no POST). The
// case officer reads it; a client and configuration people do not (deny by default, as runtime.ts). Visitor visa only
// in this slice; other combinations answer "not derived yet". Amounts Sample until the expert confirms. US$0.
import { randomUUID } from "node:crypto";
import { Controller, Get, Headers, HttpStatus, Inject, Injectable, Param } from "@nestjs/common";
import type { Channel } from "../../contracts/forms.ts";
import { acceptsOf } from "../../engine/channels.ts";
import { checkValue, knownOf } from "../../engine/runtime/case.ts";
import { deriveFilings } from "../../engine/runtime/filings.ts";
import { formItems, prepareView } from "../../engine/runtime/prepare.ts";
import { actorOf, CaseRead, Db, fail, type Actor } from "./core.ts";
import { Runtime } from "./runtime.ts";

type H = string | undefined;

@Injectable()
export class CasePrepare {
  constructor(@Inject(Runtime) private readonly r: Runtime, @Inject(Db) private readonly db: Db) {}

  async view(actor: Actor, caseId: string) {
    const first = await this.r.reach(actor, caseId, "officer");
    // Review m2: the people and answers are read under the per-case lock, so a read racing a change never stores flags
    // from before it. Review M1: a read writes only what is new or changed (no write at all when nothing changed).
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`select pg_advisory_xact_lock(hashtext(${"prepare:" + first.id}))`;
      const c = await this.r.reach(actor, caseId, "officer");
      const s = this.r.snapshotOf(c), pin = c.pins[0];
      // Money and filings follow the combination: the release must describe the case's own combination (as /filings).
      const own = await this.db.combination.findUnique({ where: { id: c.combinationId }, select: { combinationKey: true } });
      if (!own || s?.combination?.key !== own.combinationKey) fail("This case's release does not describe the case's own combination; nothing was prepared. Ask the Lead.", HttpStatus.CONFLICT);
      const people = this.r.peopleOf(c);
      const derived = deriveFilings(own!.combinationKey, people);
      const head = { case_id: c.id, reference: c.reference, release_version: pin.release.version };
      if (!derived.derived) return { ...head, ...derived };
      const today = new Date();
      const { answers, rows } = await this.r.state(c);
      // As the checklist (C6.4 B-M2): an answer its own checks reject never decides which forms a person files.
      const { known } = knownOf(s, people, answers.filter((x) => checkValue(s, x.field, x.value, today).length === 0), rows, today);
      const needs = formItems(s, people, known, today);
      const roles = new Map(people.map((p) => [p.subjectId, p.role]));
      const ws = c.workspaceId;

      let groups = await tx.submissionGroup.findMany({ where: { caseId: c.id }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
      if (!groups.length && derived.filings.length) groups = [await tx.submissionGroup.create({ data: { workspaceId: ws, caseId: c.id, kind: "family" } })];
      let filings = await tx.filing.findMany({ where: { caseId: c.id }, select: { id: true, subjectId: true, active: true } });
      const filers = new Set(derived.filings.map((f) => f.applicants[0].subject));
      const newFilings = derived.filings.filter((f) => !filings.some((x) => x.subjectId === f.applicants[0].subject))
        .map((f) => ({ id: randomUUID(), workspaceId: ws, caseId: c.id, submissionGroupId: groups[0].id, subjectId: f.applicants[0].subject, combinationKey: f.combination, mode: f.mode }));
      if (newFilings.length) {
        await tx.filing.createMany({ data: newFilings });
        await tx.filingApplicant.createMany({ data: newFilings.map((f) => ({ filingId: f.id, subjectId: f.subjectId, role: roles.get(f.subjectId) ?? "principal", mode: "applying" })), skipDuplicates: true });
        filings = [...filings, ...newFilings.map((f) => ({ id: f.id, subjectId: f.subjectId, active: true }))];
      }
      const flip = async (on: string[], off: string[], m: "filing" | "filingItem") => {
        if (on.length) await (tx[m] as typeof tx.filing).updateMany({ where: { id: { in: on } }, data: { active: true } });
        if (off.length) await (tx[m] as typeof tx.filing).updateMany({ where: { id: { in: off } }, data: { active: false } });
      };
      await flip(filings.filter((f) => !f.active && filers.has(f.subjectId)).map((f) => f.id), filings.filter((f) => f.active && !filers.has(f.subjectId)).map((f) => f.id), "filing");
      const filingOf = new Map(filings.filter((f) => filers.has(f.subjectId)).map((f) => [f.subjectId, f.id]));
      const items = await tx.filingItem.findMany({ where: { filing: { caseId: c.id } }, select: { id: true, filingId: true, formKey: true, subjectId: true, active: true } });
      const wanted = new Set(needs.filter((n) => filingOf.has(n.subject)).map((n) => `${filingOf.get(n.subject)}|${n.form}|${n.subject}`));
      const key = (i: { filingId: string; formKey: string; subjectId: string }) => `${i.filingId}|${i.formKey}|${i.subjectId}`;
      const newItems = needs.filter((n) => filingOf.has(n.subject) && !items.some((i) => key(i) === `${filingOf.get(n.subject)}|${n.form}|${n.subject}`))
        .map((n) => ({ workspaceId: ws, filingId: filingOf.get(n.subject)!, kind: "form", formKey: n.form, subjectId: n.subject, channel: n.channel }));
      if (newItems.length) await tx.filingItem.createMany({ data: newItems, skipDuplicates: true });
      await flip(items.filter((i) => !i.active && wanted.has(key(i))).map((i) => i.id), items.filter((i) => i.active && !wanted.has(key(i))).map((i) => i.id), "filingItem");

      const [allFilings, allItems, accepts] = await Promise.all([
        tx.filing.findMany({ where: { caseId: c.id }, include: { applicants: true }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] }),
        tx.filingItem.findMany({ where: { filing: { caseId: c.id } }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] }),
        acceptsOf(this.db, ws),
      ]);
      const view = prepareView({ derived, portal: s.combination.portal ?? null, needs, labels: new Map(people.map((p) => [p.subjectId, p.label])), accepts: (form) => accepts.get(form),
        filings: allFilings.map((f) => ({ ...f, applicants: f.applicants.map((a) => ({ subjectId: a.subjectId, role: a.role, mode: a.mode })) })),
        groups, items: allItems.map((i) => ({ ...i, channel: i.channel as Channel })) });
      return { ...head, ...view };
    }, { timeout: 15_000 });
  }
}

@CaseRead()
@Controller("api/runtime")
export class CasePrepareController {
  constructor(@Inject(CasePrepare) private readonly x: CasePrepare) {}
  @Get("cases/:id/prepare") view(@Headers("x-actor") a: H, @Param("id") id: string) { return this.x.view(actorOf(a), id); }
}
