// C7.5 part 1 Review findings (runtime lane, M3-E; r5c BR-19; AG-11-69, -70, -71; P-71, P-168; stand-in SI-6): the case
// officer reads a case's findings, acknowledges, waives (CRITICAL only, the representative of record) or dismisses one
// with a reason, and adds one by hand. The rules cross-checks (engine/runtime/cross-checks.ts) run on every read, US$0,
// no model call, on the case's current facts: a new disagreement is a new Open finding, a fixed fact resolves its
// finding by itself, a dismissed finding does not come back for the same facts. With AI off (or before part 2 builds the
// replayed AI review) the rules and hand-added findings still work (AG-11-71). Findings warn; they never block "Ready to
// file" (P-71, P-168): the warning on the filing's readiness comes with part 2 (C7.5-9). Audit lines name the case and
// the finding's severity and source, never a fact's value or a reason someone typed (STANDARDS §5).
import { Body, Controller, Get, Headers, HttpCode, HttpException, HttpStatus, Inject, Injectable, Param, Post, Query } from "@nestjs/common";
import type { z } from "zod";
import { FindingReason, FindingsQuery, NewFinding, SOURCE_WORDS, STATE, type Finding, type Findings, type FindingState } from "../../contracts/findings.ts";
import { problemFromZod } from "../../contracts/programs.ts";
import { crossChecks, ruleWords, type Fact, type Hit } from "../../engine/runtime/cross-checks.ts";
import { actorOf, Audit, CaseRead, Db, fail, type Actor } from "./core.ts";
import { Runtime, type Reached } from "./runtime.ts";

type H = string | undefined;
type Row = Awaited<ReturnType<Db["reviewFinding"]["findMany"]>>[number];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** The rules findings resolve themselves; a person never sets them back: nothing is acknowledged, waived or dismissed
 *  once resolved, and a finding already in that state says so. */
const OPEN_TO: Record<"acknowledge" | "waive" | "dismiss", FindingState> = { acknowledge: "acknowledged", waive: "waived", dismiss: "dismissed" };
/** A stored actor id in words; "rules" when the rules resolved it. */
const nameOf = (id: string | null) => { if (!id) return null; if (id === "rules") return "the rules"; try { return actorOf(id).name; } catch { return id; } };
const unique = (e: unknown) => (e as { code?: string }).code === "P2002";

function parse<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  const r = schema.safeParse(input ?? {});
  if (!r.success) throw new HttpException(problemFromZod(r.error), HttpStatus.BAD_REQUEST);
  return r.data;
}
const refused = (detail: string, status = HttpStatus.CONFLICT): never => { throw new HttpException({ type: "https://expatready.local/problems/not-possible", title: "Not possible now", status, detail }, status); };

@Injectable()
export class FindingsService {
  constructor(@Inject(Runtime) private readonly r: Runtime, @Inject(Db) private readonly db: Db, @Inject(Audit) private readonly audit: Audit) {}

  /** GET /runtime/cases/:id/findings[?source=&state=]: the rules run first, then every finding of the case. */
  async list(actor: Actor, caseId: string, query: unknown): Promise<Findings> {
    const q = parse(FindingsQuery, query);
    const c = await this.r.reach(actor, caseId, "officer");
    await this.runRules(actor, c);
    const rows = await this.db.reviewFinding.findMany({ where: { caseId: c.id }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
    const all = rows.map((x) => this.shape(c, x));
    const counts = Object.fromEntries(STATE.map((s) => [s, all.filter((f) => f.state === s).length])) as Findings["counts"];
    return { case_id: c.id, findings: all.filter((f) => (!q.source || f.source === q.source) && (!q.state || f.state === q.state)), counts,
      ai: { available: false, words: "Today: rules checks on every form. The AI review of the Visitor visa forms comes next (a saved run, replayed at US$0)." } };
  }

  /** The rules cross-checks on the case's current facts, reconciled with the stored rules findings: a new disagreement
   *  becomes an Open finding; one no longer seen is Resolved (by the rules); acknowledged and waived findings stay as
   *  they are while their facts are unchanged; a dismissed one stays dismissed for the same facts. */
  private async runRules(actor: Actor, c: Reached) {
    const people = this.r.peopleOf(c);
    const { answers } = await this.r.state(c);
    const facts: Fact[] = answers.filter((a) => a.rowKey === null).map((a) => ({ subject: a.subjectId, field: a.field, value: a.value }));
    const hits = crossChecks(facts, people.map((p) => ({ subject: p.subjectId, role: p.role, label: p.label })));
    const live = await this.db.reviewFinding.findMany({ where: { caseId: c.id, source: "rules", NOT: { state: "resolved" } } });
    const seen = new Set(hits.map((h) => h.fingerprint));
    const gone = live.filter((x) => !seen.has(x.fingerprint ?? "") && x.state !== "dismissed");
    const fresh = hits.filter((h) => !live.some((x) => x.fingerprint === h.fingerprint));
    if (!gone.length && !fresh.length) return;
    const where = await this.placeOf(actor, c, fresh);
    await this.db.$transaction(async (tx) => {
      if (gone.length) await tx.reviewFinding.updateMany({ where: { id: { in: gone.map((x) => x.id) }, NOT: { state: "resolved" } }, data: { state: "resolved", stateBy: "rules", stateAt: new Date() } });
      // Two reads at once: the partial unique index keeps one row per fingerprint; the second insert is skipped.
      if (fresh.length) await tx.reviewFinding.createMany({ skipDuplicates: true, data: fresh.map((h) => ({ workspaceId: c.workspaceId, caseId: c.id, subjectId: h.subject, filingId: where.filing(h.subject), form: where.form(h), field: h.field, severity: h.severity, source: "rules", ruleKey: h.rule, fingerprint: h.fingerprint, quote: h.quote, createdBy: "rules" })) });
    }).catch((e) => { if (!unique(e)) throw e; });
  }

  /** Where a rules finding sits: the person's own filing (a case fact: the principal's), and the first form the fact
   *  fills for that person. Read once per run. */
  private async placeOf(actor: Actor, c: Reached, hits: Hit[]) {
    if (!hits.length) return { filing: () => null, form: () => null };
    const filings = await this.db.filing.findMany({ where: { caseId: c.id, active: true }, include: { applicants: true } });
    const people = this.r.peopleOf(c), principal = people.find((p) => p.role === "principal")?.subjectId;
    const caseSubject = people.find((p) => p.role === "case")?.subjectId;
    const view = await this.r.view(actor, c.id, "agent");
    const fills = new Map<string, string[]>();
    for (const s of view.sections) for (const q of s.questions) fills.set(`${q.subjectId}|${q.fact}`, q.fills.map((f) => f.form));
    const who = (subject: string) => subject === caseSubject ? principal ?? subject : subject;
    return {
      filing: (subject: string) => filings.find((f) => f.applicants.some((a) => a.subjectId === who(subject)))?.id ?? null,
      form: (h: Hit) => fills.get(`${h.subject}|${h.field}`)?.[0] ?? null,
    };
  }

  private shape(c: Reached, x: Row): Finding {
    const label = new Map(this.r.peopleOf(c).map((p) => [p.subjectId, p.label]));
    return { id: x.id, filing: x.filingId, subject: x.subjectId, person: label.get(x.subjectId) ?? "", form: x.form, field: x.field,
      severity: x.severity as Finding["severity"], source: x.source as Finding["source"], state: x.state as Finding["state"], quote: x.quote,
      rule: x.ruleKey ? ruleWords(x.ruleKey) : null, agreement: (x.agreement as Finding["agreement"]) ?? null, reasons: Array.isArray(x.reasons) ? x.reasons as string[] : [], replayed: x.replayed,
      state_reason: x.stateReason, state_by: x.stateBy, state_by_name: nameOf(x.stateBy), state_at: x.stateAt?.toISOString() ?? null, created_by: x.createdBy, created_at: x.createdAt.toISOString() };
  }

  /** POST /runtime/findings/:id/{acknowledge · waive · dismiss} { reason }: an Open finding moves once, with who, when and
   *  why. Waive is for a CRITICAL finding only (422 otherwise) and only by the case's representative of record (403);
   *  a CRITICAL finding is waived, never dismissed. */
  async move(actor: Actor, findingId: string, to: "acknowledge" | "waive" | "dismiss", body: unknown) {
    const x = UUID.test(findingId) ? await this.db.reviewFinding.findUnique({ where: { id: findingId } }) : null;
    if (!x) fail("No such finding.", HttpStatus.NOT_FOUND);
    const c = await this.r.reach(actor, x!.caseId, "officer");
    // The finding's own rules first (a waive below CRITICAL is refused whatever the reason), then who, then the reason.
    if (to === "waive" && x!.severity !== "CRITICAL") refused(`Only a CRITICAL finding is waived; this one is ${x!.severity}: acknowledge it with a reason instead.`, HttpStatus.UNPROCESSABLE_ENTITY);
    if (to === "dismiss" && x!.severity === "CRITICAL") refused("A CRITICAL finding is not dismissed: the representative of record waives it with a reason.", HttpStatus.UNPROCESSABLE_ENTITY);
    if (to === "waive") {
      const rep = await this.db.caseTeamMember.findFirst({ where: { caseId: c.id, role: "LEAD_REPRESENTATIVE", endedAt: null } });
      if (rep?.userId !== actor.id) fail("Only the representative of record of this case waives a CRITICAL finding.", HttpStatus.FORBIDDEN);
    }
    const { reason } = parse(FindingReason, body);
    if (x!.state !== "open") refused(`This finding is ${x!.state} already, so it cannot be ${OPEN_TO[to]} now.`);
    const n = await this.db.reviewFinding.updateMany({ where: { id: x!.id, state: "open" }, data: { state: OPEN_TO[to], stateReason: reason, stateBy: actor.id, stateAt: new Date() } });
    if (n.count !== 1) refused("Someone changed this finding after you read it: read the findings again. Nothing was saved.");
    await this.audit.log(c.workspaceId, actor.id, OPEN_TO[to], "case", c.id, `${actor.name} ${OPEN_TO[to]} a ${x!.severity} ${SOURCE_WORDS[x!.source as Finding["source"]]} finding on case ${c.id.slice(0, 8)}`, { finding: x!.id, from: "open", to: OPEN_TO[to] });
    return this.shape(c, (await this.db.reviewFinding.findUnique({ where: { id: x!.id } }))!);
  }

  /** POST /runtime/cases/:id/findings: staff add a finding by hand (source "manual"), about a person on the case and,
   *  when given, one of the case's filings. */
  async add(actor: Actor, caseId: string, body: unknown) {
    const c = await this.r.reach(actor, caseId, "officer");
    const b = parse(NewFinding, body);
    if (!this.r.peopleOf(c).some((p) => p.subjectId === b.subject)) fail("That person is not on this case.", HttpStatus.UNPROCESSABLE_ENTITY);
    if (b.filing && !(await this.db.filing.findFirst({ where: { id: b.filing, caseId: c.id } }))) fail("That filing is not on this case.", HttpStatus.UNPROCESSABLE_ENTITY);
    const x = await this.db.reviewFinding.create({ data: { workspaceId: c.workspaceId, caseId: c.id, filingId: b.filing ?? null, subjectId: b.subject, form: b.form || null, field: b.field || null, severity: b.severity, source: "manual", quote: b.note, createdBy: actor.id } });
    await this.audit.log(c.workspaceId, actor.id, "added", "case", c.id, `${actor.name} added a ${b.severity} finding by hand on case ${c.id.slice(0, 8)}`, { finding: x.id });
    return this.shape(c, x);
  }
}

@CaseRead()
@Controller("api/runtime")
export class FindingsController {
  constructor(@Inject(FindingsService) private readonly x: FindingsService) {}
  @Get("cases/:id/findings") list(@Headers("x-actor") a: H, @Param("id") id: string, @Query() q: unknown) { return this.x.list(actorOf(a), id, q); }
  @Post("cases/:id/findings") add(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.x.add(actorOf(a), id, b); }
  @Post("findings/:id/acknowledge") @HttpCode(200) acknowledge(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.x.move(actorOf(a), id, "acknowledge", b); }
  @Post("findings/:id/waive") @HttpCode(200) waive(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.x.move(actorOf(a), id, "waive", b); }
  @Post("findings/:id/dismiss") @HttpCode(200) dismiss(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.x.move(actorOf(a), id, "dismiss", b); }
}
