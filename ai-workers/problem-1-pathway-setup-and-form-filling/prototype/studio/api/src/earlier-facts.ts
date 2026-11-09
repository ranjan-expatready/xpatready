// C6.19 (P-419; concept product/screens/C6.19/concept.md): facts from a returning client's earlier case, offered on
// their next case, re-confirmed before use, never copied silently. Staff of the case's firm only (BR-7). The offer reads
// the earlier case and writes nothing (BR-4); "Re-confirm and use" copies only the ticked facts onto this case's people
// as new answers confirmed by that officer (VERIFIED, source "earlier_case", BR-3: copies, not links, P-65), checked
// fresh by the answer ids the officer saw under the case's row lock (BR-5), refusing an expired value (BR-6) and a case
// recorded as submitted (BR-7). The earlier case is read only, never written. Answer values never go into audit text
// (STANDARDS §5). No migration: copies are answer rows and the reuse is an audit event, as C1.3 does.
import { Body, Controller, Get, Headers, HttpException, HttpStatus, Inject, Injectable, Param, Post } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { EARLIER_CASE, offerFrom, sameName, type EarlierAnswer, type OfferPerson } from "../../engine/runtime/earlier-facts.ts";
import { knownOf } from "../../engine/runtime/case.ts";
import { FIRM_RECORD } from "../../engine/runtime/team.ts";
import { problemFromZod } from "../../contracts/programs.ts";
import { actorOf, CaseRead, Db, fail, type Actor } from "./core.ts";
import { Runtime, type Reached } from "./runtime.ts";

type H = string | undefined;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** How many earlier cases of one client are read (newest first): enough for any returning family, bounded per request. */
const EARLIER_MAX = 5;
export const REUSED_FACTS = "reused_facts";

const ReconfirmBody = z.object({
  earlierCase: z.string().uuid(),
  /** The facts the officer ticked: whose, which, and the earlier answer id shown. */
  take: z.array(z.object({ subject_id: z.string().uuid(), fact: z.string().min(1).max(200), from: z.string().uuid() }).strict()).min(1, "Tick at least one fact to re-confirm.").max(200),
  /** "<subject_id>|<fact>" → this case's current answer id the officer saw (null: none yet). */
  seen: z.record(z.string().max(300), z.string().uuid().nullable()).default({}).refine((v) => Object.keys(v).length <= 200, "Send at most 200 seen answers."),
}).strict();

const stale = (labels: string[]): never => { throw new HttpException({ type: "https://expatready.local/problems/stale-answer", title: "Changed since you looked", status: 409, detail: `Changed since you looked: ${labels.join(", ")}. Reload to see the facts now; nothing was copied.`, errors: labels.map((l) => ({ field: l, message: "Changed since you looked." })) }, HttpStatus.CONFLICT); };
const notPossible = (detail: string): never => { throw new HttpException({ type: "https://expatready.local/problems/not-possible", title: "Not possible now", status: 409, detail }, HttpStatus.CONFLICT); };
const day = (d: Date) => d.toISOString().slice(0, 10);

export type EarlierOffer = { case_id: string; reference: string; combination: string; opened_at: string; people: OfferPerson[]; unmatched: { label: string; role: string }[] };

@Injectable()
export class EarlierFacts {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Runtime) private readonly runtime: Runtime) {}

  /** BR-1: this firm's other cases whose principal has this case's principal's name, newest first. */
  private async candidates(c: Reached) {
    const principal = c.participants.find((p) => p.role === "principal");
    if (!principal) return [];
    const rows = await this.db.caseParticipant.findMany({ where: { workspaceId: c.workspaceId, role: "principal", caseId: { not: c.id }, case: { firmKey: c.firmKey } },
      include: { subject: { select: { label: true } }, case: { select: { id: true, reference: true, createdAt: true, combination: { select: { label: true } } } } }, orderBy: { case: { createdAt: "desc" } }, take: 500 });
    return rows.filter((r) => sameName(r.subject.label, principal.subject.label)).slice(0, EARLIER_MAX);
  }

  /** This case's current single answers about its people (never a relative's, a row's or the firm record's). */
  private current(answers: Awaited<ReturnType<Runtime["state"]>>["answers"]) {
    return answers.filter((a) => !a.rowKey && UUID.test(a.subjectId) && UUID.test(a.id)).map((a) => ({ id: a.id, subjectId: a.subjectId, field: a.field, value: a.value }));
  }

  /** One earlier case's offer to this case (BR-2, BR-5, BR-6), read as the same staff member; nothing is written. */
  private async offerOf(actor: Actor, c: Reached, cand: Awaited<ReturnType<EarlierFacts["candidates"]>>[number], today: Date, here?: Awaited<ReturnType<Runtime["state"]>>): Promise<EarlierOffer> {
    const e = await this.runtime.reach(actor, cand.case.id, "read");
    const es = this.runtime.snapshotOf(e), ePeople = this.runtime.peopleOf(e), st = await this.runtime.state(e);
    const { confirm } = knownOf(es, ePeople, st.answers, st.rows, today);
    const earlierAnswers: EarlierAnswer[] = st.answers.filter((a) => !a.rowKey && UUID.test(a.subjectId) && UUID.test(a.id) && a.channel !== FIRM_RECORD)
      .map((a) => ({ id: a.id, subjectId: a.subjectId, field: a.field, value: a.value, confirmed: !!confirm.get(a.id)?.confirmed, confirmedAt: a.at, confirmedBy: a.actor }));
    const mine = here ?? await this.runtime.state(c);
    const o = offerFrom({ snapshot: this.runtime.snapshotOf(c), here: this.runtime.peopleOf(c), current: this.current(mine.answers), earlier: ePeople, earlierAnswers, background: this.runtime.backgroundOf(c), today });
    return { case_id: e.id, reference: e.reference, combination: cand.case.combination.label, opened_at: cand.case.createdAt.toISOString(), ...o };
  }

  /** GET: the earlier cases of this client and what each offers (BR-1, BR-2). An empty list shows no card. */
  async list(actor: Actor, caseId: string) {
    const c = await this.runtime.reach(actor, caseId, "officer");
    const today = new Date(), here = await this.runtime.state(c);
    const earlier: EarlierOffer[] = [];
    for (const cand of await this.candidates(c)) earlier.push(await this.offerOf(actor, c, cand, today, here));
    const principal = c.participants.find((p) => p.role === "principal");
    return { case_id: c.id, principal: principal?.subject.label ?? null, today: day(today), earlier };
  }

  /** POST: re-confirm the ticked facts and copy them onto this case (BR-3 to BR-7). */
  async reconfirm(actor: Actor, caseId: string, body: unknown) {
    const c = await this.runtime.reach(actor, caseId, "officer"); // who may, before what was sent (a client gets 403, never 400)
    const parsed = ReconfirmBody.safeParse(body ?? {});
    if (!parsed.success) throw new HttpException(problemFromZod(parsed.error), HttpStatus.BAD_REQUEST);
    const b = parsed.data;
    const cand = (await this.candidates(c)).find((x) => x.case.id === b.earlierCase);
    if (!cand) fail("No earlier case of this client with that id.", HttpStatus.NOT_FOUND); // BR-1: another firm's or another person's case is never named
    const today = new Date();
    const offer = await this.offerOf(actor, c, cand!, today);
    const s = this.runtime.snapshotOf(c);
    const fields = (s.canonical_fields ?? []) as { id: string; item_version: number }[];
    const at = today.toISOString();
    const lines = b.take.map((t) => {
      const person = offer.people.find((p) => p.subject_id === t.subject_id);
      const line = person?.facts.find((f) => f.fact === t.fact);
      return { t, person, line, label: line?.label ?? t.fact };
    });
    const written = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM runtime_case WHERE id = ${c.id}::uuid FOR UPDATE`; // BR-5: one re-confirm at a time
      if (await tx.filingRecord.count({ where: { caseId: c.id } })) notPossible("This application is recorded as submitted to IRCC, so it is read-only: no facts are copied from an earlier case.");
      const subjects = [...new Set(b.take.map((t) => t.subject_id))], keys = [...new Set(b.take.map((t) => t.fact))];
      // An answer save takes no case lock: the current answers of the ticked facts are locked here before they are compared
      // with what the officer saw (as C1.3). A fact with no answer yet is guarded by the unique current-answer index.
      await tx.$queryRaw`SELECT id FROM client_canonical_answer WHERE subject_id = ANY(${subjects}::uuid[]) AND canonical_field_key = ANY(${keys}::text[]) AND row_key IS NULL AND superseded_by_id IS NULL FOR UPDATE`;
      const now = await tx.clientCanonicalAnswer.findMany({ where: { subjectId: { in: subjects }, canonicalFieldKey: { in: keys }, rowKey: null, supersededById: null } });
      const changed = lines.filter((l) => (now.find((x) => x.subjectId === l.t.subject_id && x.canonicalFieldKey === l.t.fact)?.id ?? null) !== (b.seen[`${l.t.subject_id}|${l.t.fact}`] ?? null));
      if (changed.length) stale(changed.map((l) => l.label));
      const missing = lines.filter((l) => !l.line);
      if (missing.length) notPossible(`Not offered from this earlier case now: ${missing.map((l) => l.label).join(", ")}. Reload to see what it offers; nothing was copied.`);
      const moved = lines.filter((l) => l.line!.from_answer !== l.t.from);
      if (moved.length) stale(moved.map((l) => `${l.label} (on the earlier case)`));
      const blocked = lines.filter((l) => !l.line!.usable);
      if (blocked.length) { const l = blocked[0].line!; notPossible(`${blocked[0].label} cannot be re-confirmed: ${l.expiry?.blocks ? l.expiry.words : l.problems[0]} Nothing was copied.`); }
      const out: { subject: string; fact: string }[] = [];
      for (const l of lines) {
        const ver = fields.find((f) => f.id === l.t.fact)?.item_version;
        const def = ver ? await tx.canonicalField.findFirst({ where: { workspaceId: c.workspaceId, canonicalFieldKey: l.t.fact, version: ver } }) : null;
        if (!def) fail(`The library has no version ${ver ?? "?"} of ${l.label}.`, HttpStatus.CONFLICT);
        const who = c.participants.find((p) => p.subjectId === l.t.subject_id)!;
        const cur = now.find((x) => x.subjectId === l.t.subject_id && x.canonicalFieldKey === l.t.fact);
        const id = randomUUID();
        if (cur) { const n = await tx.clientCanonicalAnswer.updateMany({ where: { id: cur.id, supersededById: null }, data: { supersededById: id } }); if (n.count !== 1) stale([l.label]); }
        await tx.clientCanonicalAnswer.create({ data: { id, workspaceId: c.workspaceId, partyId: who.subject.partyId, subjectId: who.subjectId, canonicalFieldId: def!.id, canonicalFieldKey: l.t.fact, rowKey: null, valueJson: l.line!.value as object, status: "VERIFIED",
          sourceJson: { channel: EARLIER_CASE, actor: actor.id, at, earlier_case: offer.case_id, earlier_reference: offer.reference, earlier_answer: l.line!.from_answer, earlier_confirmed_at: l.line!.confirmed_at }, verifiedBy: actor.id, verifiedAt: today } });
        out.push({ subject: who.subjectId, fact: l.t.fact });
      }
      await tx.auditEvent.create({ data: { workspaceId: c.workspaceId, actor: actor.id, action: REUSED_FACTS, entity: "case", entityKey: c.id, combinationId: c.combinationId, detail: { from_case: offer.case_id, facts: out } as object,
        summary: `${actor.name} re-confirmed ${out.length} fact${out.length === 1 ? "" : "s"} from the earlier case ${offer.reference} on case ${c.id.slice(0, 8)} (${[...new Set(out.map((x) => x.fact))].join(", ")}); copies: later changes on either case do not reach the other` } });
      return out;
    }).catch((e: unknown) => { if ((e as { code?: string }).code === "P2002") stale(["an answer saved at the same moment"]); throw e; });
    const n = written.length;
    return { ...(await this.list(actor, caseId)), copied: written, message: `Re-confirmed ${n === 1 ? "1 fact" : `${n} facts`} from ${offer.reference}. ${n === 1 ? "It is" : "They are"} on this case now; the earlier case did not change.` };
  }
}

@CaseRead()
@Controller("api/runtime")
export class EarlierFactsController {
  constructor(@Inject(EarlierFacts) private readonly e: EarlierFacts) {}
  @Get("cases/:id/earlier-facts") list(@Headers("x-actor") a: H, @Param("id") id: string) { return this.e.list(actorOf(a), id); }
  @Post("cases/:id/earlier-facts") reconfirm(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.e.reconfirm(actorOf(a), id, b); }
}
