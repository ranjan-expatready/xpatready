// C6.12 /prepare (M3-B2, runtime lane; r5c BR-1, BR-8, BR-16, BR-18, contract §6): GET /api/runtime/cases/:id/prepare.
// The case's filings, submission group, form items and fee lines. They are derived from the case's people and pinned
// release as C6.12's /filings does, then stored the first time they appear (submission_group, filing,
// filing_applicant, filing_item), so each keeps its id: a person who stops applying keeps an inactive filing and gets
// the same one back; a form that stops applying keeps its item and channel. Nothing is created by hand (no POST). The
// case officer reads it; a client and configuration people do not (deny by default, as runtime.ts). Visitor visa only
// in this slice; other combinations answer "not derived yet". Amounts Sample until the expert confirms. US$0.
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

    // Store what is new; keep ids. One transaction, one per case at a time; the unique keys keep rows single.
    await this.db.$transaction(async (tx) => {
      // Two first reads at once must not make two groups: one prepare per case at a time (released at commit).
      await tx.$executeRaw`select pg_advisory_xact_lock(hashtext(${"prepare:" + c.id}))`;
      let group = await tx.submissionGroup.findFirst({ where: { caseId: c.id, kind: "family" }, orderBy: { createdAt: "asc" } });
      if (!group && derived.filings.length) group = await tx.submissionGroup.create({ data: { workspaceId: ws, caseId: c.id, kind: "family" } });
      const filers = new Set(derived.filings.map((f) => f.applicants[0].subject));
      for (const f of derived.filings) {
        const subjectId = f.applicants[0].subject;
        const row = await tx.filing.upsert({ where: { caseId_subjectId: { caseId: c.id, subjectId } },
          create: { workspaceId: ws, caseId: c.id, submissionGroupId: group!.id, subjectId, combinationKey: f.combination, mode: f.mode },
          update: { active: true } });
        await tx.filingApplicant.createMany({ data: [{ filingId: row.id, subjectId, role: roles.get(subjectId) ?? f.applicants[0].role, mode: "applying" }], skipDuplicates: true });
      }
      await tx.filing.updateMany({ where: { caseId: c.id, active: true, subjectId: { notIn: [...filers] } }, data: { active: false } });
      const filingOf = new Map((await tx.filing.findMany({ where: { caseId: c.id, active: true }, select: { id: true, subjectId: true } })).map((f) => [f.subjectId, f.id]));
      const keep: string[] = [];
      for (const n of needs) {
        const filingId = filingOf.get(n.subject);
        if (!filingId) continue;
        const item = await tx.filingItem.upsert({ where: { filingId_kind_formKey_subjectId: { filingId, kind: "form", formKey: n.form, subjectId: n.subject } },
          create: { workspaceId: ws, filingId, kind: "form", formKey: n.form, subjectId: n.subject, channel: n.channel },
          update: { active: true } });
        keep.push(item.id);
      }
      await tx.filingItem.updateMany({ where: { filing: { caseId: c.id }, active: true, id: { notIn: keep } }, data: { active: false } });
    });

    const [filings, groups, items, accepts] = await Promise.all([
      this.db.filing.findMany({ where: { caseId: c.id }, include: { applicants: true }, orderBy: { createdAt: "asc" } }),
      this.db.submissionGroup.findMany({ where: { caseId: c.id }, orderBy: { createdAt: "asc" } }),
      this.db.filingItem.findMany({ where: { filing: { caseId: c.id } } }),
      acceptsOf(this.db, ws),
    ]);
    const view = prepareView({ derived, portal: s.combination.portal ?? null, needs, labels: new Map(people.map((p) => [p.subjectId, p.label])), accepts: (form) => accepts.get(form),
      filings: filings.map((f) => ({ ...f, applicants: f.applicants.map((a) => ({ subjectId: a.subjectId, role: a.role, mode: a.mode })) })),
      groups, items: items.map((i) => ({ ...i, channel: i.channel as Channel })) });
    return { ...head, ...view };
  }
}

@CaseRead()
@Controller("api/runtime")
export class CasePrepareController {
  constructor(@Inject(CasePrepare) private readonly x: CasePrepare) {}
  @Get("cases/:id/prepare") view(@Headers("x-actor") a: H, @Param("id") id: string) { return this.x.view(actorOf(a), id); }
}
