// C6.19 (P-419; concept product/screens/C6.19/concept.md): facts from a returning client's earlier case, offered on
// their next case, re-confirmed before use, never copied silently. Staff of the case's firm only (BR-7). The offer reads
// the earlier case and writes nothing (BR-4); "Re-confirm and use" copies only the ticked facts onto this case's people
// as new answers that keep the status they had there, with the officer's re-confirmation recorded beside it (challenge
// B1; BR-3: copies, not links, C1.3 BR-3 and SA-1B-283 r4), the earlier answer still current (challenge M2), checked
// fresh by the answer ids the officer saw under the case's row lock (BR-5), refusing an expired value (BR-6) and a case
// recorded as submitted (BR-7). The earlier case is read only, never written. Answer values never go into audit text
// (STANDARDS §5). No migration: copies are answer rows and the reuse is an audit event, as C1.3 does.
import { Body, Controller, Get, Headers, HttpException, HttpStatus, Inject, Injectable, Param, Post } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { latestConfirmed, matchPeople, offerFrom, sameName, type EarlierAnswer, type OfferPerson } from "../../engine/runtime/earlier-facts.ts";
import { knownOf } from "../../engine/runtime/case.ts";
import { FIRM_RECORD } from "../../engine/runtime/team.ts";
import { problemFromZod } from "../../contracts/programs.ts";
import { actorOf, CaseRead, Db, fail, type Actor } from "./core.ts";
import { Runtime, type Reached } from "./runtime.ts";
import { caseName } from "../../contracts/runtime.ts"; // A24-1: the reference, else the case number

type H = string | undefined;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** How many earlier cases of one client are read (newest first): enough for any returning family, bounded per request. */
const EARLIER_MAX = 5, EARLIER_READ = 20;
/** Breaker m8: "today" is the firm's calendar day (the Sample firms work in Toronto time, as the database does), so an
 *  expiry date is compared with the day the officer sees, never the UTC day. */
const FIRM_ZONE = "America/Toronto";
export const firmToday = (now = new Date()) => new Date(`${new Intl.DateTimeFormat("en-CA", { timeZone: FIRM_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now)}T00:00:00Z`);
export const REUSED_FACTS = "reused_facts";

const ReconfirmBody = z.object({
  earlierCase: z.string().uuid(),
  /** The facts the officer ticked: whose, which, and the earlier answer id shown. */
  take: z.array(z.object({ subject_id: z.string().uuid(), fact: z.string().min(1).max(200), from: z.string().uuid() }).strict()).min(1, "Tick at least one fact to re-confirm.").max(200)
    .refine((t) => new Set(t.map((x) => `${x.subject_id}|${x.fact}`)).size === t.length, "Each fact once: the same fact of the same person is ticked twice (breaker m1)."),
  /** "<subject_id>|<fact>" → this case's current answer id the officer saw (null: none yet). */
  seen: z.record(z.string().max(300), z.string().uuid().nullable()).default({}).refine((v) => Object.keys(v).length <= 200, "Send at most 200 seen answers."),
}).strict();

const stale = (labels: string[]): never => { throw new HttpException({ type: "https://expatready.local/problems/stale-answer", title: "Changed since you looked", status: 409, detail: `Changed since you looked: ${labels.join(", ")}. Reload to see the facts now; nothing was copied.`, errors: labels.map((l) => ({ field: l, message: "Changed since you looked." })) }, HttpStatus.CONFLICT); };
const notPossible = (detail: string): never => { throw new HttpException({ type: "https://expatready.local/problems/not-possible", title: "Not possible now", status: 409, detail }, HttpStatus.CONFLICT); };
const day = (d: Date) => d.toISOString().slice(0, 10);
/** QA-338 (review m3): a copy counts from its re-confirmation on the case that holds it, not its first giving. */
const seenAt = (a: { at: string; copiedFrom?: { at: string } | null }) => a.copiedFrom?.at && a.copiedFrom.at > a.at ? a.copiedFrom.at : a.at;

export type EarlierOffer = { case_id: string; reference: string; combination: string; opened_at: string; people: OfferPerson[]; unmatched: { label: string; role: string }[] };

@Injectable()
export class EarlierFacts {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Runtime) private readonly runtime: Runtime) {}

  /** BR-1: this firm's cases opened before this one, for the same client login (breaker M2: another client's answers
   *  never reach this case) and a principal of the same name, newest first; with `only`, that one case if it qualifies. */
  private async candidates(c: Reached, only?: string) {
    const principal = c.participants.find((p) => p.role === "principal");
    if (!principal) return [];
    const rows = await this.db.caseParticipant.findMany({ where: { workspaceId: c.workspaceId, role: "principal", caseId: only ?? { not: c.id }, case: { firmKey: c.firmKey, clientActorId: c.clientActorId, createdAt: { lt: c.createdAt } } },
      include: { subject: { select: { label: true } }, case: { select: { id: true, reference: true, caseNumber: true, createdAt: true, combination: { select: { label: true } } } } }, orderBy: { case: { createdAt: "desc" } }, take: 1000 });
    return rows.filter((r) => r.caseId !== c.id && sameName(r.subject.label, principal.subject.label));
  }

  /** This case's current single answers about its people (never a relative's, a row's or the firm record's). */
  private current(answers: Awaited<ReturnType<Runtime["state"]>>["answers"]) {
    return answers.filter((a) => !a.rowKey && UUID.test(a.subjectId) && UUID.test(a.id)).map((a) => ({ id: a.id, subjectId: a.subjectId, field: a.field, value: a.value }));
  }

  /** One earlier case read as the same staff member (BR-4: nothing is written): its people and current answers about them. */
  private async readEarlier(actor: Actor, cand: Awaited<ReturnType<EarlierFacts["candidates"]>>[number], today: Date) {
    const e = await this.runtime.reach(actor, cand.case.id, "read");
    const es = this.runtime.snapshotOf(e), ePeople = this.runtime.peopleOf(e), st = await this.runtime.state(e);
    const { confirm } = knownOf(es, ePeople, st.answers, st.rows, today);
    const earlierAnswers: EarlierAnswer[] = st.answers.filter((a) => !a.rowKey && UUID.test(a.subjectId) && UUID.test(a.id) && a.channel !== FIRM_RECORD)
      .map((a) => ({ id: a.id, subjectId: a.subjectId, field: a.field, value: a.value, confirmed: !!confirm.get(a.id)?.confirmed, confirmedAt: a.at, confirmedBy: a.actor, seenAt: seenAt(a) }));
    return { cand, e, ePeople, earlierAnswers };
  }

  /** Each earlier case's offer to this case (BR-2, BR-5, BR-6). QA-338: every case is read first, so a fact one of them
   *  holds is judged against the newest value confirmed for the same person on any of them (latestConfirmed). */
  private async offersOf(actor: Actor, c: Reached, cands: Awaited<ReturnType<EarlierFacts["candidates"]>>, today: Date, here?: Awaited<ReturnType<Runtime["state"]>>): Promise<EarlierOffer[]> {
    const reads = [];
    for (const cand of cands) reads.push(await this.readEarlier(actor, cand, today));
    const herePeople = this.runtime.peopleOf(c);
    const all = reads.map((r) => ({ case_id: r.e.id, reference: caseName(r.e), match: matchPeople(herePeople, r.ePeople), answers: r.earlierAnswers }));
    const latest = latestConfirmed(all), latestAny = latestConfirmed(all, false);
    const mine = here ?? await this.runtime.state(c), current = this.current(mine.answers), snapshot = this.runtime.snapshotOf(c), background = this.runtime.backgroundOf(c);
    const combinationKey = (await this.db.combination.findUnique({ where: { id: c.combinationId }, select: { combinationKey: true } }))?.combinationKey;
    return reads.map((r) => ({ case_id: r.e.id, reference: caseName(r.e), combination: r.cand.case.combination.label, opened_at: r.cand.case.createdAt.toISOString(),
      ...offerFrom({ combinationKey, snapshot, here: herePeople, current, earlier: r.ePeople, earlierAnswers: r.earlierAnswers, background, today, caseId: r.e.id, latest, latestAny }) }));
  }

  /** GET: the earlier cases of this client and what each offers (BR-1, BR-2). An empty list shows no card. */
  async list(actor: Actor, caseId: string) {
    const c = await this.runtime.reach(actor, caseId, "officer");
    const today = firmToday(), here = await this.runtime.state(c);
    const read = await this.offersOf(actor, c, (await this.candidates(c)).slice(0, EARLIER_READ), today, here);
    // Breaker M1: the cases that offer something come first, so empty ones never crowd out the one holding the facts.
    const offers = (e: EarlierOffer) => e.people.some((p) => p.facts.length);
    const earlier = [...read.filter(offers), ...read.filter((e) => !offers(e))].slice(0, EARLIER_MAX);
    const principal = c.participants.find((p) => p.role === "principal");
    // Review m5: a case recorded as submitted is read-only; the card says so before anyone ticks.
    // C6.17 (review, merge check 2): only a record on the case's current stage makes it read-only, as submission-record.ts.
    const recorded = (await this.db.filingRecord.count({ where: { caseId: c.id, filing: { stage: { state: "CURRENT" } } } })) > 0;
    return { case_id: c.id, principal: principal?.subject.label ?? null, today: day(today), recorded, earlier };
  }

  /** POST: re-confirm the ticked facts and copy them onto this case (BR-3 to BR-7). */
  async reconfirm(actor: Actor, caseId: string, body: unknown) {
    const c = await this.runtime.reach(actor, caseId, "officer"); // who may, before what was sent (a client gets 403, never 400)
    const parsed = ReconfirmBody.safeParse(body ?? {});
    if (!parsed.success) throw new HttpException(problemFromZod(parsed.error), HttpStatus.BAD_REQUEST);
    const b = parsed.data;
    const cands = await this.candidates(c), cand = cands.find((x) => x.case.id === b.earlierCase);
    if (!cand) fail("No earlier case of this client with that id.", HttpStatus.NOT_FOUND); // BR-1: another firm's or another person's case is never named
    const today = firmToday(), at = new Date().toISOString();
    // QA-338: the chosen case is judged against the others read for the card, so a value confirmed differently later
    // elsewhere is refused here as it is shown there.
    // Review m4: the same cases the card reads (the chosen one added when it is beyond them).
    const shown = cands.slice(0, EARLIER_READ), read = shown.includes(cand!) ? shown : [...shown.slice(0, EARLIER_READ - 1), cand!];
    const offer = (await this.offersOf(actor, c, read, today)).find((o) => o.case_id === cand!.case.id)!;
    const s = this.runtime.snapshotOf(c);
    const fields = (s.canonical_fields ?? []) as { id: string; item_version: number }[];
    const lines = b.take.map((t) => {
      const person = offer.people.find((p) => p.subject_id === t.subject_id);
      const line = person?.facts.find((f) => f.fact === t.fact);
      return { t, person, line, label: line?.label ?? t.fact };
    });
    // Breaker m2: a take is checked against the offer before anything is read or locked (a subject not on this case, or a
    // fact not offered, never touches another case's rows).
    const missing = lines.filter((l) => !l.line);
    if (missing.length) notPossible(`Not offered from this earlier case now: ${missing.map((l) => l.label).join(", ")}. Reload to see what it offers; nothing was copied.`);
    const written = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM runtime_case WHERE id = ${c.id}::uuid FOR UPDATE`; // BR-5: one re-confirm at a time
      if (await tx.filingRecord.count({ where: { caseId: c.id, filing: { stage: { state: "CURRENT" } } } })) notPossible("This application is recorded as submitted to IRCC, so it is read-only: no facts are copied from an earlier case.");
      const subjects = [...new Set(b.take.map((t) => t.subject_id))], keys = [...new Set(b.take.map((t) => t.fact))];
      // An answer save takes no case lock: the current answers of the ticked facts are locked here before they are compared
      // with what the officer saw (as C1.3). A fact with no answer yet is guarded by the unique current-answer index.
      await tx.$queryRaw`SELECT id FROM client_canonical_answer WHERE subject_id = ANY(${subjects}::uuid[]) AND canonical_field_key = ANY(${keys}::text[]) AND row_key IS NULL AND superseded_by_id IS NULL FOR UPDATE`;
      const now = await tx.clientCanonicalAnswer.findMany({ where: { subjectId: { in: subjects }, canonicalFieldKey: { in: keys }, rowKey: null, supersededById: null } });
      const changed = lines.filter((l) => (now.find((x) => x.subjectId === l.t.subject_id && x.canonicalFieldKey === l.t.fact)?.id ?? null) !== (b.seen[`${l.t.subject_id}|${l.t.fact}`] ?? null));
      if (changed.length) stale(changed.map((l) => l.label));
      const moved = lines.filter((l) => l.line!.from_answer !== l.t.from);
      if (moved.length) stale(moved.map((l) => `${l.label} (on the earlier case)`));
      const blocked = lines.filter((l) => !l.line!.usable);
      if (blocked.length) { const l = blocked[0].line!; const why = l.newer ? l.newer.words : l.expiry?.blocks ? `${l.expiry.words} (${"sample" in l.expiry.source ? "Sample rule" : `canada.ca, ${l.expiry.source.page}, recorded ${l.expiry.source.recorded}`})` : l.problems[0]; notPossible(`${blocked[0].label} cannot be re-confirmed: ${why} Nothing was copied.`); }
      // Challenge M2: the earlier answer shown must still be current there (append-only rows never change their value, so
      // the value copied is exactly the one the officer saw), read under a share lock so it cannot move during the copy.
      const froms = [...new Set(b.take.map((t) => t.from))];
      await tx.$queryRaw`SELECT id FROM client_canonical_answer WHERE id = ANY(${froms}::uuid[]) FOR SHARE`;
      const earlierRows = await tx.clientCanonicalAnswer.findMany({ where: { id: { in: froms }, supersededById: null } });
      const gone = lines.filter((l) => !earlierRows.some((x) => x.id === l.t.from));
      if (gone.length) stale(gone.map((l) => `${l.label} (on the earlier case)`));
      const out: { subject: string; fact: string }[] = [];
      for (const l of lines) {
        const ver = fields.find((f) => f.id === l.t.fact)?.item_version;
        const def = ver ? await tx.canonicalField.findFirst({ where: { workspaceId: c.workspaceId, canonicalFieldKey: l.t.fact, version: ver } }) : null;
        if (!def) fail(`The library has no version ${ver ?? "?"} of ${l.label}.`, HttpStatus.CONFLICT);
        const who = c.participants.find((p) => p.subjectId === l.t.subject_id)!;
        const cur = now.find((x) => x.subjectId === l.t.subject_id && x.canonicalFieldKey === l.t.fact);
        const from = earlierRows.find((x) => x.id === l.t.from)!, src = from.sourceJson as { channel: string; actor: string; at: string; from?: string };
        const id = randomUUID();
        if (cur) { const n = await tx.clientCanonicalAnswer.updateMany({ where: { id: cur.id, supersededById: null }, data: { supersededById: id } }); if (n.count !== 1) stale([l.label]); }
        // Challenge B1 (SA-1B-266 rule 3, BR-39, P-411 (2)): the copy keeps the status, the giver and the verifier it had on
        // the earlier case; the officer's press is recorded beside them (reconfirmed_by, reconfirmed_at), never as a new
        // Verified. A client's own answer stays the client's (its channel), so Confirm section treats it as it did there.
        await tx.clientCanonicalAnswer.create({ data: { id, workspaceId: c.workspaceId, partyId: who.subject.partyId, subjectId: who.subjectId, canonicalFieldId: def!.id, canonicalFieldKey: l.t.fact, rowKey: null, valueJson: from.valueJson as object, status: from.status,
          sourceJson: { channel: src.channel, actor: src.actor, at: src.at, ...(src.from ? { from: src.from } : {}), earlier_case: offer.case_id, earlier_reference: offer.reference, earlier_answer: from.id, reconfirmed_by: actor.id, reconfirmed_at: at }, verifiedBy: from.verifiedBy, verifiedAt: from.verifiedAt } });
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
