// C7.5 part 1 Review findings (runtime lane, M3-E; r5c BR-19; AG-11-69, -70, -71; P-71, P-168; stand-in SI-6): the case
// officer reads a case's findings, acknowledges, waives (CRITICAL only, the representative of record) or dismisses one
// with a reason, and adds one by hand. The rules cross-checks (engine/runtime/cross-checks.ts) run on every read, US$0,
// no model call, on the case's current facts: a new disagreement is a new Open finding, a fixed fact resolves its
// finding by itself, a dismissed finding does not come back for the same facts. With AI off (or before part 2 builds the
// replayed AI review) the rules and hand-added findings still work (AG-11-71). Findings warn; they never block "Ready to
// file" (P-71, P-168): the warning on the filing's readiness comes with part 2 (C7.5-9). Audit lines name the case and
// the finding's severity and source, never a fact's value or a reason someone typed (STANDARDS §5).
import { Body, Controller, Get, Headers, HttpCode, HttpException, HttpStatus, Inject, Injectable, Param, Post, Query } from "@nestjs/common";
import { createHash } from "node:crypto";
import type { z } from "zod";
import { FindingReason, FindingsQuery, NewFinding, SOURCE_WORDS, STATE, type Finding, type Findings, type FindingState } from "../../contracts/findings.ts";
import { problemFromZod } from "../../contracts/programs.ts";
import { crossChecks, ruleWords, type Fact, type Hit } from "../../engine/runtime/cross-checks.ts";
import { actorOf, Audit, CaseRead, Db, fail, type Actor } from "./core.ts";
import { Runtime, type Reached } from "./runtime.ts";
import { ReviewRuns } from "./review-runs.ts";

type H = string | undefined;
type Row = Awaited<ReturnType<Db["reviewFinding"]["findMany"]>>[number];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** A person moves an Open finding once; a finding resolved, waived or dismissed already says so (409). */
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
  constructor(@Inject(Runtime) private readonly r: Runtime, @Inject(Db) private readonly db: Db, @Inject(Audit) private readonly audit: Audit, @Inject(ReviewRuns) private readonly reviews: ReviewRuns) {}

  /** GET /runtime/cases/:id/findings[?source=&state=]: the rules run first, then every finding of the case. */
  async list(actor: Actor, caseId: string, query: unknown): Promise<Findings> {
    const q = parse(FindingsQuery, query);
    const c = await this.r.reach(actor, caseId, "officer");
    await this.runRules(actor, c);
    // C7.5 part 2 (challenge M6): an AI finding whose quoted words left the form is resolved now, as a rules finding is.
    await this.reviews.resolveMoved(c);
    const rows = await this.db.reviewFinding.findMany({ where: { caseId: c.id }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
    const { labels } = await this.factsOf(actor, c);
    const all = rows.map((x) => this.shape(c, x, labels));
    const counts = Object.fromEntries(STATE.map((s) => [s, all.filter((f) => f.state === s).length])) as Findings["counts"];
    return { case_id: c.id, findings: all.filter((f) => (!q.source || f.source === q.source) && (!q.state || f.state === q.state)), counts,
      ai: { available: false, words: "Rules checks run on every form at every read (US$0). The independent AI review of a filled form runs from the Review page: Saved replays its checked run at US$0." },
      may_waive: (await this.representative(c.id)) === actor.id };
  }

  private async representative(caseId: string) {
    return (await this.db.caseTeamMember.findFirst({ where: { caseId, role: "LEAD_REPRESENTATIVE", endedAt: null } }))?.userId ?? null;
  }

  /** The rules cross-checks on the case's current facts, reconciled with the stored rules findings: a new disagreement
   *  becomes an Open finding; one no longer seen is Resolved (by the rules, keeping who acknowledged or waived it);
   *  acknowledged and waived findings stay as they are while their facts are unchanged; a dismissed one stays dismissed
   *  for the same facts. Findings read before Prepare worked out the filings get their filing once it exists. */
  private async runRules(actor: Actor, c: Reached) {
    const people = this.r.peopleOf(c);
    const { answers } = await this.r.state(c);
    const facts: Fact[] = answers.filter((a) => a.rowKey === null).map((a) => ({ subject: a.subjectId, field: a.field, value: a.value }));
    const hits = crossChecks(facts, people.map((p) => ({ subject: p.subjectId, role: p.role, label: p.label, applies: p.applies })));
    const live = await this.db.reviewFinding.findMany({ where: { caseId: c.id, NOT: { state: "resolved" } } });
    const rules = live.filter((x) => x.source === "rules");
    const seen = new Set(hits.map((h) => h.fingerprint));
    const gone = rules.filter((x) => !seen.has(x.fingerprint ?? "") && x.state !== "dismissed");
    const fresh = hits.filter((h) => !rules.some((x) => x.fingerprint === h.fingerprint));
    const unplaced = live.filter((x) => !x.filingId && !gone.some((g) => g.id === x.id));
    if (!gone.length && !fresh.length && !unplaced.length) return;
    const where = await this.placeOf(actor, c, fresh.length > 0);
    const placed = unplaced.map((x) => ({ id: x.id, filing: where.filing(x.subjectId) })).filter((x) => x.filing);
    if (!gone.length && !fresh.length && !placed.length) return;
    let resolved = 0;
    await this.db.$transaction(async (tx) => {
      // Breaker m1: only a finding still open, acknowledged or waived is resolved; a dismiss made meanwhile stays.
      if (gone.length) resolved = (await tx.reviewFinding.updateMany({ where: { id: { in: gone.map((x) => x.id) }, state: { in: ["open", "acknowledged", "waived"] } }, data: { state: "resolved", resolvedBy: "rules", resolvedAt: new Date() } })).count;
      // Two reads at once: the partial unique index keeps one row per fingerprint; the second insert is skipped.
      if (fresh.length) await tx.reviewFinding.createMany({ skipDuplicates: true, data: fresh.map((h) => ({ workspaceId: c.workspaceId, caseId: c.id, subjectId: h.subject, filingId: where.filing(h.subject), form: where.form(h), field: h.field, severity: h.severity, source: "rules", ruleKey: h.rule, fingerprint: h.fingerprint, quote: h.quote, createdBy: "rules" })) });
      for (const x of placed) await tx.reviewFinding.updateMany({ where: { id: x.id, filingId: null }, data: { filingId: x.filing } });
    }).catch((e) => { if (!unique(e)) throw e; });
    if (resolved) await this.audit.log(c.workspaceId, "rules", "resolved", "case", c.id, `The rules resolved ${resolved === 1 ? "1 finding" : `${resolved} findings`} on case ${c.id.slice(0, 8)}: the facts now agree`, { findings: gone.map((x) => x.id) });
  }

  /** Where a finding sits: the person's own filing (a case fact: the principal's), and the first form the fact fills
   *  for that person (read only when a new rules finding needs it). */
  private async placeOf(actor: Actor, c: Reached, forms: boolean) {
    const filings = await this.db.filing.findMany({ where: { caseId: c.id, active: true }, include: { applicants: true } });
    const people = this.r.peopleOf(c), principal = people.find((p) => p.role === "principal")?.subjectId;
    const caseSubject = people.find((p) => p.role === "case")?.subjectId;
    const fills = forms ? (await this.factsOf(actor, c)).fills : new Map<string, string[]>();
    const who = (subject: string) => subject === caseSubject ? principal ?? subject : subject;
    return {
      filing: (subject: string) => filings.find((f) => f.applicants.some((a) => a.subjectId === who(subject)))?.id ?? null,
      form: (h: Hit) => fills.get(`${h.subject}|${h.field}`)?.[0] ?? null,
    };
  }

  /** Each fact asked on this case, per person: the forms it fills and its question's words (the Agent view of the pinned
   *  release). Keyed "<subject>|<fact>". */
  private async factsOf(actor: Actor, c: Reached) {
    const view = await this.r.view(actor, c.id, "agent");
    const fills = new Map<string, string[]>(), labels = new Map<string, string>();
    for (const s of view.sections) for (const q of s.questions) { fills.set(`${q.subjectId}|${q.fact}`, q.fills.map((f) => f.form)); labels.set(`${q.subjectId}|${q.fact}`, q.label); }
    return { fills, labels };
  }

  private shape(c: Reached, x: Row, labels: Map<string, string> = new Map()): Finding {
    const label = new Map(this.r.peopleOf(c).map((p) => [p.subjectId, p.label]));
    return { id: x.id, filing: x.filingId, subject: x.subjectId, person: label.get(x.subjectId) ?? "", form: x.form, field: x.field, fact_label: x.field ? labels.get(`${x.subjectId}|${x.field}`) ?? null : null,
      severity: x.severity as Finding["severity"], source: x.source as Finding["source"], state: x.state as Finding["state"], quote: x.quote,
      rule: x.ruleKey ? ruleWords(x.ruleKey) : null, agreement: (x.agreement as Finding["agreement"]) ?? null, reasons: Array.isArray(x.reasons) ? x.reasons as string[] : [], replayed: x.replayed,
      state_reason: x.stateReason, state_by: x.stateBy, state_by_name: nameOf(x.stateBy), state_at: x.stateAt?.toISOString() ?? null,
      resolved_by: x.resolvedBy, resolved_by_name: nameOf(x.resolvedBy), resolved_at: x.resolvedAt?.toISOString() ?? null,
      created_by: x.createdBy, created_at: x.createdAt.toISOString() };
  }

  /** POST /runtime/findings/:id/{acknowledge · waive · dismiss} { reason }: an Open finding moves once, with who, when and
   *  why. A CRITICAL finding is only waived, and only by the case's representative of record (403); acknowledging or
   *  dismissing it is refused (422), so no other move passes it. Waive below CRITICAL is refused (422). */
  async move(actor: Actor, findingId: string, to: "acknowledge" | "waive" | "dismiss", body: unknown) {
    // Breaker m5: who is checked before the finding is looked up, so a person who works no case learns nothing of it.
    if (!(actor.duties as readonly string[]).includes("case")) fail("Only the case officer can do this.", HttpStatus.FORBIDDEN);
    const x = UUID.test(findingId) ? await this.db.reviewFinding.findUnique({ where: { id: findingId } }) : null;
    if (!x) fail("No such finding.", HttpStatus.NOT_FOUND);
    const c = await this.r.reach(actor, x!.caseId, "officer");
    // The finding's own rules first (a waive below CRITICAL is refused whatever the reason), then who, then the reason.
    if (to === "waive" && x!.severity !== "CRITICAL") refused(`Only a CRITICAL finding is waived; this one is ${x!.severity}: acknowledge it with a reason instead.`, HttpStatus.UNPROCESSABLE_ENTITY);
    if (to !== "waive" && x!.severity === "CRITICAL") refused(`A CRITICAL finding is not ${OPEN_TO[to]}: the representative of record waives it with a reason.`, HttpStatus.UNPROCESSABLE_ENTITY);
    if (to === "waive" && (await this.representative(c.id)) !== actor.id) fail("Only the representative of record of this case waives a CRITICAL finding.", HttpStatus.FORBIDDEN);
    const { reason } = parse(FindingReason, body);
    if (x!.state !== "open") refused(`This finding is ${x!.state} already, so it cannot be ${OPEN_TO[to]} now.`);
    const n = await this.db.reviewFinding.updateMany({ where: { id: x!.id, state: "open" }, data: { state: OPEN_TO[to], stateReason: reason, stateBy: actor.id, stateAt: new Date() } });
    if (n.count !== 1) refused("Someone changed this finding after you read it: read the findings again. Nothing was saved.");
    await this.audit.log(c.workspaceId, actor.id, OPEN_TO[to], "case", c.id, `${actor.name} ${OPEN_TO[to]} a ${x!.severity} ${SOURCE_WORDS[x!.source as Finding["source"]]} finding on case ${c.id.slice(0, 8)}`, { finding: x!.id, from: "open", to: OPEN_TO[to] });
    return this.shape(c, (await this.db.reviewFinding.findUnique({ where: { id: x!.id } }))!);
  }

  /** POST /runtime/cases/:id/findings: staff add a finding by hand (source "manual") about a person on the case; a filing
   *  given is one this person is on (else their own filing is used once it exists); a fact given is one asked of this
   *  person on this case. */
  async add(actor: Actor, caseId: string, body: unknown) {
    const c = await this.r.reach(actor, caseId, "officer");
    const b = parse(NewFinding, body);
    const { idempotencyKey: key, ...request } = b;
    const fingerprint = createHash("sha256").update(JSON.stringify(request)).digest("hex");
    // Reviewer M2 (STANDARDS §4): the same key again returns the finding already stored; with another request, 409.
    const replay = async () => {
      const x = key ? await this.db.reviewFinding.findFirst({ where: { caseId: c.id, idempotencyKey: key } }) : null;
      if (x && x.idempotencyFingerprint !== fingerprint) refused("This request key was already used for a different finding; nothing was added. Open Add finding again.");
      return x ? this.shape(c, x, (await this.factsOf(actor, c)).labels) : null;
    };
    const earlier = await replay();
    if (earlier) return earlier;
    const person = this.r.peopleOf(c).find((p) => p.subjectId === b.subject);
    if (!person || person.role === "case") fail("Choose a person on this case.", HttpStatus.UNPROCESSABLE_ENTITY);
    if (b.filing && !(await this.db.filing.findFirst({ where: { id: b.filing, caseId: c.id, applicants: { some: { subjectId: b.subject } } } }))) fail("That filing is not this person's filing on this case.", HttpStatus.UNPROCESSABLE_ENTITY);
    const { labels } = await this.factsOf(actor, c);
    if (b.field && !labels.has(`${b.subject}|${b.field}`)) fail("That fact is not asked of this person on this case.", HttpStatus.UNPROCESSABLE_ENTITY);
    const filingId = b.filing ?? (await this.placeOf(actor, c, false)).filing(b.subject);
    let x: Row;
    try {
      x = await this.db.reviewFinding.create({ data: { workspaceId: c.workspaceId, caseId: c.id, filingId, subjectId: b.subject, form: b.form || null, field: b.field || null, severity: b.severity, source: "manual", quote: b.note, idempotencyKey: key ?? null, idempotencyFingerprint: key ? fingerprint : null, createdBy: actor.id } });
    } catch (e) {
      if (!unique(e)) throw e;
      return (await replay())!; // two clicks at once: the first stored it
    }
    await this.audit.log(c.workspaceId, actor.id, "added", "case", c.id, `${actor.name} added a ${b.severity} finding by hand on case ${c.id.slice(0, 8)}`, { finding: x.id });
    return this.shape(c, x, labels);
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
