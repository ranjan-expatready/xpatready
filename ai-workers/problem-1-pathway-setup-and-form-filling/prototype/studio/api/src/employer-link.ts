// C1.3 + C11.5 part 2 (P-106; concept product/screens/C1.3-employer-link r2; tech lead's ruling on #1051): on a worker's
// case the case officer picks the employer case it relies on, and the employer facts the worker's pinned release reads
// are copied in once (SA-1B-283 r4 "Copies, not live links"; AG-7-55 r5). Staff of the case's firm only. Copies are
// ordinary answers (Declared, source "linked_file"), confirmed in Confirm section like any other (BR-5); nothing is
// overwritten silently (BR-4); the officer's view is checked fresh by the answer ids seen, under the case's row lock
// (BR-6); a firm sees only its own employer cases (BR-7). Answer values never go into audit text (STANDARDS §5).
import { Body, Controller, Get, Headers, HttpException, HttpStatus, Inject, Injectable, Param, Post } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { carriedFacts, employerLinkOffer, factState, LINKED_FILE, STAND_IN_SI10, type CarriedFact, type FactState } from "../../engine/runtime/employer.ts";
import { inStoredOrder } from "../../engine/runtime/team.ts";
import { checkValue } from "../../engine/runtime/case.ts";
import { problemFromZod } from "../../contracts/programs.ts";
import { actorOf, CaseRead, Db, fail, type Actor } from "./core.ts";
import { employerCasesOf, linkedOf, RELIED_ON, type Linked } from "./employer-cases.ts";
import { Runtime } from "./runtime.ts";

type H = string | undefined;
const LinkBody = z.object({
  employerCase: z.string().min(1).max(100),
  /** The current answer id the officer saw for each fact (null: none yet). */
  seen: z.record(z.string().max(200), z.string().uuid().nullable()).default({}).refine((v) => Object.keys(v).length <= 50, "Send at most 50 seen answers (break m6)."),
  /** Facts shown "Different" whose employer case value the officer chose to use. */
  replace: z.array(z.string().max(200)).max(50).default([]),
}).strict();

const stale = (labels: string[]): never => { throw new HttpException({ type: "https://expatready.local/problems/stale-answer", title: "Changed since you looked", status: 409, detail: `Changed since you looked: ${labels.join(", ")}. Reload to see the case's answers now; nothing was copied.`, errors: labels.map((l) => ({ field: l, message: "Changed since you looked." })) }, HttpStatus.CONFLICT); };
const notPossible = (detail: string): never => { throw new HttpException({ type: "https://expatready.local/problems/not-possible", title: "Not possible now", status: 409, detail }, HttpStatus.CONFLICT); };
const dateWords = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Toronto" });

export type FactLine = CarriedFact & { subject_id: string; state: FactState; current: { answer_id: string; value: unknown } | null; problems: string[] };

@Injectable()
export class EmployerLinks {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Runtime) private readonly runtime: Runtime) {}

  /** The case, reached as staff of its firm (the client and configuration people get 403; another firm's case 404),
   *  with its offer: a case whose release reads no employer facts, or a Corporate case, is refused with the reason. */
  private async reachOffered(actor: Actor, caseId: string) {
    const c = await this.runtime.reach(actor, caseId, "officer");
    const s = this.runtime.snapshotOf(c);
    const offer = employerLinkOffer(s);
    if (!offer.offered) notPossible(offer.reason);
    const principal = c.participants.find((p) => p.role === "principal"), filing = c.participants.find((p) => p.role === "case");
    if (!principal || !filing) fail("This case has no principal applicant.", HttpStatus.CONFLICT);
    return { c, s, offer, principal: principal!, filing: filing! };
  }

  /** Each carried fact of one employer case against the case's answers now (BR-2, BR-4). */
  private lines(r: Awaited<ReturnType<EmployerLinks["reachOffered"]>>, current: { id: string; subjectId: string; field: string; value: unknown }[], ec: Parameters<typeof carriedFacts>[1]): FactLine[] {
    return carriedFacts(r.s, ec).map((f) => {
      const subject_id = f.on === "case" ? r.filing.subjectId : r.principal.subjectId;
      const a = current.find((x) => x.subjectId === subject_id && x.field === f.fact) ?? null;
      return { ...f, subject_id, state: factState(f.value, a), current: a ? { answer_id: a.id, value: inStoredOrder(a.value) } : null, problems: checkValue(r.s, f.fact, f.value) };
    });
  }

  private async currentAnswers(q: Pick<Db, "clientCanonicalAnswer">, subjects: string[], facts: string[]) {
    const rows = await q.clientCanonicalAnswer.findMany({ where: { subjectId: { in: subjects }, canonicalFieldKey: { in: facts }, rowKey: null, supersededById: null } });
    return rows.map((x) => ({ id: x.id, subjectId: x.subjectId, field: x.canonicalFieldKey, value: x.valueJson as unknown }));
  }

  /** GET: the firm's employer cases, each fact with what would happen to it (new · same · different), and the link. */
  async list(actor: Actor, caseId: string) {
    const r = await this.reachOffered(actor, caseId);
    const cases = employerCasesOf(r.c.firmKey);
    const facts = [...new Set(cases.flatMap((e) => Object.keys(e.facts)))];
    const current = await this.currentAnswers(this.db, [r.principal.subjectId, r.filing.subjectId], facts);
    return { case_id: r.c.id, principal: r.principal.subject.label, offer: r.offer, stand_in: STAND_IN_SI10, linked: await linkedOf(this.db, r.c.workspaceId, r.c.id),
      employer_cases: cases.map((e) => ({ key: e.key, label: e.label, facts: this.lines(r, current, e) })) };
  }

  /** POST: link once and copy (BR-3 to BR-6). */
  async link(actor: Actor, caseId: string, body: unknown) {
    const r = await this.reachOffered(actor, caseId); // who may, before what was sent (break m6: a client gets 403, never 400)
    const parsed = LinkBody.safeParse(body ?? {});
    if (!parsed.success) throw new HttpException(problemFromZod(parsed.error), HttpStatus.BAD_REQUEST);
    const b = parsed.data;
    const ec = employerCasesOf(r.c.firmKey).find((e) => e.key === b.employerCase);
    if (!ec) fail("No such employer case.", HttpStatus.NOT_FOUND); // BR-7: another firm's case is not found, never named
    const fields = (r.s.canonical_fields ?? []) as { id: string; item_version: number }[];
    const at = new Date().toISOString();
    const written = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM runtime_case WHERE id = ${r.c.id}::uuid FOR UPDATE`; // BR-6: one link at a time
      // Break m7: in this capability's own words (the C8.2 refusal speaks of people).
      if (await tx.filingRecord.count({ where: { caseId: r.c.id, filing: { stage: { state: "CURRENT" } } } })) // C6.17 (review M1): the current stage's record only
        notPossible("This application is recorded as submitted to IRCC, so it is read-only: no employer case is linked and no employer facts are copied.");
      const before = await linkedOf(tx, r.c.workspaceId, r.c.id);
      if (before) notPossible(`This case already relies on ${before.label} (linked ${dateWords(before.created_at)}). Its facts were copied then; edit a copied value on this case.`);
      // outside review on #1051: an answer save takes no case lock, so the current answers of the carried facts are locked
      // here before they are compared with what the officer saw. A save that committed first is read below and refused
      // as changed; one that comes later waits for this link (its own supersede then runs after it). A fact with no
      // answer yet is guarded by the unique current-answer index (a save at the same moment fails one of the two).
      const subjects = [r.principal.subjectId, r.filing.subjectId], keys = Object.keys(ec!.facts);
      await tx.$queryRaw`SELECT id FROM client_canonical_answer WHERE subject_id = ANY(${subjects}::uuid[]) AND canonical_field_key = ANY(${keys}::text[]) AND row_key IS NULL AND superseded_by_id IS NULL FOR UPDATE`;
      const lines = this.lines(r, await this.currentAnswers(tx, subjects, keys), ec!);
      const changed = lines.filter((l) => (l.current?.answer_id ?? null) !== (b.seen[l.fact] ?? null));
      if (changed.length) stale(changed.map((l) => l.label));
      const bad = lines.filter((l) => l.problems.length && (l.state === "new" || (l.state === "different" && b.replace.includes(l.fact))));
      if (bad.length) notPossible(`The employer case's ${bad.map((l) => l.label).join(", ")} cannot be copied: ${bad[0].problems[0]}`);
      const out: string[] = [];
      for (const l of lines) {
        if (l.state === "same" || (l.state === "different" && !b.replace.includes(l.fact))) continue; // BR-4: nothing overwritten silently
        const ver = fields.find((f) => f.id === l.fact)?.item_version;
        const def = ver ? await tx.canonicalField.findFirst({ where: { workspaceId: r.c.workspaceId, canonicalFieldKey: l.fact, version: ver } }) : null;
        if (!def) fail(`The library has no version ${ver ?? "?"} of ${l.label}.`, HttpStatus.CONFLICT);
        const id = randomUUID(), party = (l.on === "case" ? r.filing : r.principal).subject.partyId;
        if (l.current) { const n = await tx.clientCanonicalAnswer.updateMany({ where: { id: l.current.answer_id, supersededById: null }, data: { supersededById: id } }); if (n.count !== 1) stale([l.label]); }
        await tx.clientCanonicalAnswer.create({ data: { id, workspaceId: r.c.workspaceId, partyId: party, subjectId: l.subject_id, canonicalFieldId: def!.id, canonicalFieldKey: l.fact, rowKey: null, valueJson: l.value as object, status: "DECLARED",
          sourceJson: { channel: LINKED_FILE, employer_case: ec!.key, employer_label: ec!.label, actor: actor.id, at } } });
        out.push(l.fact);
      }
      const linked: Linked = { from_case: r.c.id, to_case: ec!.key, label: ec!.label, kind: "worker_permit", status: "ACTIVE", created_by: actor.id, created_at: at, facts: out };
      await tx.auditEvent.create({ data: { workspaceId: r.c.workspaceId, actor: actor.id, action: RELIED_ON, entity: "case", entityKey: r.c.id, combinationId: r.c.combinationId, detail: linked as object,
        summary: `${actor.name} linked case ${r.c.id.slice(0, 8)} to the employer case ${ec!.key} and copied ${out.length} fact${out.length === 1 ? "" : "s"} (${out.join(", ") || "none"}); later changes there are not copied` } });
      return out;
    }).catch((e: unknown) => { if ((e as { code?: string }).code === "P2002") stale(["an answer saved at the same moment"]); throw e; });
    return { ...(await this.list(actor, caseId)), copied: written,
      message: written.length ? `Copied ${written.length === 1 ? "1 fact" : `${written.length} facts`} from ${ec!.label}. Confirm ${written.length === 1 ? "it" : "them"} in ${written.length === 1 ? "its" : "their"} section.` : `Linked to ${ec!.label}; nothing was copied (this case already had these values, or you kept its own).` };
  }
}

@CaseRead()
@Controller("api/runtime")
export class EmployerLinksController {
  constructor(@Inject(EmployerLinks) private readonly e: EmployerLinks) {}
  @Get("cases/:id/employer-cases") list(@Headers("x-actor") a: H, @Param("id") id: string) { return this.e.list(actorOf(a), id); }
  @Post("cases/:id/employer-link") link(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.e.link(actorOf(a), id, b); }
}
