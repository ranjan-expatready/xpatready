// S6 slice 1b (P-149 one door; screens/W1-shared-library/plan-slice1.md): the review queue's routes. GET /review/proposals
// lists what waits, grouped by form edition or combination, in Ready · Check · Decide, with what the side panel shows;
// decide and undo call the one door (proposals.ts), which checks every rule again. The second person approves or
// returns what one decision landed on the library together, each row through decideChange's guards (BR-9).
import { Body, Controller, Get, Headers, HttpException, HttpStatus, Inject, Injectable, Param, Post, Query } from "@nestjs/common";
import type { ProposalItem as Row } from "@prisma/client";
import { z } from "zod";
import { problemFromZod } from "../../contracts/programs.ts";
import { AGREEMENT_WORDS, BANDS, BatchDecisionBody, DecideBody, PROPOSAL_KIND_WORDS, ProposalsQuery, type Band, type ChangeBatch, type ProposalGroup, type ProposalsView, type QueueProposal, type Reading } from "../../contracts/review-proposals.ts";
import { ACTORS, actorOf, Audit, Db, fail, need, STARTING_ROLES, Workspace, type Actor } from "./core.ts";
import { changeView, decideChange, nearOf, type NearView } from "./library-changes.ts";
import { acceptWhy, BATCH_MAX, bulkWhy, decide, lineTitle, ON_ITS_PAGE, undo, UNDO_SECONDS } from "./proposals.ts";
import { Screen02 } from "./screen02.ts";
import { STEP_KEYS } from "../../contracts/setup-checklist.ts";
import { KIND_STEP } from "../../engine/setup-checklist.ts";

type H = string | undefined;
const nameOf = (id: string | null | undefined) => (id ? ACTORS.find((a) => a.id === id)?.name ?? "A person" : null);
function parse<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  const r = schema.safeParse(input ?? {});
  if (!r.success) fail(problemFromZod(r.error).detail ?? "The request is not valid.");
  return r.data as z.infer<S>;
}
/** QA-196: an item that cannot be accepted on the queue (acceptWhy) waits in Decide, never Ready, whatever the readings say. */
const bandOf = (r: Pick<Row, "kind" | "landsOn" | "confidence">): Band => (acceptWhy(r) ? "decide" : (r.confidence as Band));
/** The group an item belongs to: its form edition (S6, one draft per edition), else its combination (W1-10), else its run. */
export const groupOf = (r: Pick<Row, "formEdition" | "combinationId" | "runId">) => (r.formEdition ? `edition:${r.formEdition}` : r.combinationId ? `combination:${r.combinationId}` : `run:${r.runId}`);
/** C4.7: "Ask in pre-qualification: Date of birth (Principal applicant)". */
const pickTitle = (p: { factKey?: string; role?: string }, facts: Map<string, string>) => {
  const m = facts.get(p.factKey ?? "") ?? "an answer this combination's forms need", fact = m.length > 110 ? `${m.slice(0, 109).trimEnd()}…` : m;
  return `Ask in the Prospect questionnaire (PQR): ${fact} (${p.role === "case" ? "The application" : STARTING_ROLES.find((x) => x.key === p.role)?.label ?? "a person in the application"})`;
};
const titleOf = (p: Record<string, any>) => String(p.label ?? p.name ?? p.condition?.sentence ?? p.sentence ?? p.target?.key ?? p.kind ?? "A proposal").slice(0, 160);
const readingOf = (x: unknown): Reading => { const r = x as { reading?: string; from?: "live" | "replay"; payload?: unknown } | null; return r ? { text: r.reading ?? "", from: r.from ?? "replay", payload: r.payload ?? null } : null; };

@Injectable()
export class ReviewProposals {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Workspace) private readonly ws: Workspace, @Inject(Audit) private readonly audit: Audit, @Inject(Screen02) private readonly s02: Screen02) {}

  /** The combination paths (Pathway › Program › … › Combination), for group titles. */
  private async paths(workspaceId: string, ids: string[]) {
    if (!ids.length) return new Map<string, string>();
    const [nodes, combos] = await Promise.all([
      this.db.programDef.findMany({ where: { workspaceId }, select: { id: true, programNodeKey: true, parentNodeKey: true, label: true } }),
      this.db.combination.findMany({ where: { id: { in: ids } }, select: { id: true, programDefId: true } }),
    ]);
    const byKey = new Map(nodes.map((n) => [n.programNodeKey, n])), byId = new Map(nodes.map((n) => [n.id, n]));
    return new Map(combos.map((c) => { const out: string[] = []; for (let n = byId.get(c.programDefId); n; n = n.parentNodeKey ? byKey.get(n.parentNodeKey) : undefined) out.unshift(n.label); return [c.id, out.join(" › ") || "A combination"]; }));
  }

  /** Waiting items, grouped, oldest group first; the asked group's items in their three bands. */
  async list(query: unknown): Promise<ProposalsView> {
    const q = parse(ProposalsQuery, query);
    const workspaceId = await this.ws.id();
    const rows = await this.db.proposalItem.findMany({ where: { workspaceId, status: "waiting" }, orderBy: { createdAt: "asc" }, take: 5000 });
    const paths = await this.paths(workspaceId, [...new Set(rows.map((r) => r.combinationId).filter(Boolean) as string[])]);
    const groups = new Map<string, ProposalGroup>();
    for (const r of rows) {
      const id = groupOf(r);
      let g = groups.get(id);
      if (!g) {
        g = r.formEdition ? { id, kind: "edition", title: r.formEdition, sub: "Form edition: drafted once, reused by every combination that files it", counts: { ready: 0, check: 0, decide: 0 }, total: 0, oldest: r.createdAt.toISOString() }
          : r.combinationId ? { id, kind: "combination", title: paths.get(r.combinationId) ?? "A combination", sub: "Combination", counts: { ready: 0, check: 0, decide: 0 }, total: 0, oldest: r.createdAt.toISOString() }
          : { id, kind: "run", title: `${r.step.replace(/_/g, " ")} run`, sub: "One run with no form or combination", counts: { ready: 0, check: 0, decide: 0 }, total: 0, oldest: r.createdAt.toISOString() };
        groups.set(id, g);
      }
      g.counts[bandOf(r)]++; g.total++;
    }
    const chosen = q.group ? groups.get(q.group) : q.c ? await this.groupFor(workspaceId, rows, groups, q.c, q.step) : undefined;
    if (q.group && !chosen) fail("Nothing waits in this group any more: it may have been decided, or the demo was reset.", HttpStatus.NOT_FOUND);
    let group: ProposalsView["group"] = null;
    if (chosen) {
      const bands: Record<Band, QueueProposal[]> = { ready: [], check: [], decide: [] };
      // C4.7: a pre-qualification pick is read in words (the fact's meaning, the person), never its keys.
      const picks = rows.filter((r) => r.kind === "pqr_pick" && groupOf(r) === chosen.id);
      const facts = picks.length ? new Map((await this.db.canonicalField.findMany({ where: { workspaceId, canonicalFieldKey: { in: picks.map((r) => String((r.payload as { factKey?: string }).factKey)) } }, orderBy: { version: "desc" }, select: { canonicalFieldKey: true, meaning: true } })).reverse().map((f) => [f.canonicalFieldKey, f.meaning.trim().replace(/\.$/, "")])) : new Map<string, string>();
      for (const r of rows) if (groupOf(r) === chosen.id) bands[bandOf(r)].push(this.view(r, facts));
      group = { ...chosen, bands };
    }
    return { groups: [...groups.values()], group, batch_max: BATCH_MAX, undo_seconds: UNDO_SECONDS };
  }

  /** PR #108 minor (c): the oldest group with this combination's proposals (its own, or its forms' editions), one for
   *  the asked step first; none → no group chosen (the page opens the oldest, as without a link). */
  private async groupFor(workspaceId: string, rows: Row[], groups: Map<string, ProposalGroup>, c: string, step?: number) {
    const codes = new Set((await this.db.combinationForm.findMany({ where: { workspaceId, combinationId: c, status: { not: "RETIRED" } }, select: { form: { select: { formKey: true } } } })).map((l) => l.form.formKey));
    const mine = rows.filter((r) => r.combinationId === c || (!r.combinationId && r.formEdition && (codes.has(r.formEdition) || codes.has(r.formEdition.split(" (")[0]))));
    const want = step ? STEP_KEYS[step - 1] : null;
    const r = (want && mine.find((x) => KIND_STEP[x.kind as keyof typeof KIND_STEP]?.step === want)) || mine[0];
    return r ? groups.get(groupOf(r)) : undefined;
  }

  private view(r: Row, facts = new Map<string, string>()): QueueProposal {
    const p = r.payload as Record<string, any>, src = r.source as Record<string, any> | null, rounds = r.rounds as { draft?: unknown; check?: unknown }, id = r.identity as { near?: string[]; nearReason?: string | null };
    const reuse = r.reuse as { match: "reuse" | "new"; existingKey: string | null };
    return { id: r.id, kind: r.kind, kind_word: PROPOSAL_KIND_WORDS[r.kind] ?? r.kind, title: r.kind === "pqr_pick" ? pickTitle(p, facts) : r.kind === "requirement_line" && !p.label ? lineTitle(p) : titleOf(p), meaning: p.meaning ?? p.proves ?? (r.kind === "pqr_pick" ? p.reason : null) ?? null, values: Array.isArray(p.values) ? p.values : null, band: bandOf(r), agreement: r.agreement, agreement_word: AGREEMENT_WORDS[r.agreement] ?? r.agreement,
      reason: r.reason, lands_on: r.landsOn as "library" | "combination", reuse: { match: reuse.match, existing_key: reuse.existingKey }, origin: r.origin as "ai" | "rules", step: r.step,
      readings: { draft: readingOf(rounds?.draft), check: readingOf(rounds?.check) },
      source: src ? { file: src.file, edition: src.edition ?? null, page: src.page ?? null, quote: src.quote, quote_found: !!src.quoteFound, rule: src.rule ?? null } : null,
      rules: (r.rules as QueueProposal["rules"]) ?? [], near: id.near ?? [], near_reason: id.nearReason ?? null, basis: r.basis as "SAMPLE" | "EXPERT",
      bulk_why: bulkWhy(r), accept_why: acceptWhy(r), decide_on: ON_ITS_PAGE.has(r.step) && r.combinationId ? `/c/${r.combinationId}/jobs/${r.runId}` : null, created_at: r.createdAt.toISOString() };
  }

  async decide(actor: Actor, body: unknown) {
    const b = parse(DecideBody, body);
    return decide(this.db, this.audit, actor, await this.ws.id(), [...new Set(b.ids)], { action: b.action, reason: b.reason ?? null, payload: b.payload });
  }
  async undo(actor: Actor, batchId: string) {
    if (!z.string().uuid().safeParse(batchId).success) fail("No decision with this id.", HttpStatus.NOT_FOUND);
    return undo(this.db, this.audit, actor, await this.ws.id(), batchId);
  }

  // ------------------------------------------------------------------ grouped second-person approval

  /** What each decision landed on the library and still waits for a second person, one entry per batch. */
  async batches(actor: Actor, group: string | undefined): Promise<{ batches: ChangeBatch[] }> {
    if (group !== "batch") fail("Ask for the changes grouped by decision: group=batch.");
    const workspaceId = await this.ws.id();
    const rows = await this.db.libraryChange.findMany({ where: { workspaceId, status: "WAITING", batchId: { not: null } }, orderBy: { proposedAt: "asc" } });
    const by = new Map<string, typeof rows>();
    for (const c of rows) by.set(c.batchId!, [...(by.get(c.batchId!) ?? []), c]);
    const near = await nearOf(this.db, workspaceId, rows);
    return { batches: [...by.entries()].map(([id, list]) => this.batchView(actor, id, list, near)) };
  }
  async batch(actor: Actor, id: string): Promise<ChangeBatch> {
    if (!z.string().uuid().safeParse(id).success) fail("No decision with this id.", HttpStatus.NOT_FOUND);
    const workspaceId = await this.ws.id();
    const list = await this.db.libraryChange.findMany({ where: { workspaceId, batchId: id }, orderBy: { proposedAt: "asc" } });
    if (!list.length) fail("No library changes from this decision (it may have been undone, or the demo was reset).", HttpStatus.NOT_FOUND);
    return this.batchView(actor, id, list, await nearOf(this.db, workspaceId, list));
  }
  private batchView(actor: Actor, id: string, list: Awaited<ReturnType<Db["libraryChange"]["findMany"]>>, near: Map<string, NearView>): ChangeBatch {
    const waiting = list.filter((c) => c.status === "WAITING");
    const mine = list.some((c) => c.proposedBy === actor.id || c.appliedBy === actor.id);
    const why = !(actor.duties as readonly string[]).includes("review") ? `${actor.name} (simulated) does not hold the review duty.`
      : mine ? "You accepted these proposals, so a different person approves or returns them." : !waiting.length ? "Every item of this decision is already decided." : null;
    return { id, by: nameOf(list[0].proposedBy), by_id: list[0].proposedBy, at: list[0].proposedAt.toISOString(), count: waiting.length, items: list.map((c) => ({ ...changeView(c), near: near.get(c.id) ?? null })) as unknown as ChangeBatch["items"], can_decide: !why, why_not: why };
  }

  /** Approve or return every waiting item of one decision, all or nothing in one transaction (Lead review of PR #96
   *  (2)): checked as a whole first (the same person never approves their own batch; a return needs its reason), then
   *  each row goes through decideChange's guards; one refusal rolls every row back and says which item and why. A
   *  batch holds only the ADDs a lander wrote, so the lifecycle steps of a single approval never apply here. */
  async decideBatch(actor: Actor, id: string, body: unknown) {
    const b = parse(BatchDecisionBody, body);
    need(actor, "review");
    const view = await this.batch(actor, id);
    if (!view.can_decide) fail(view.why_not!, /different person|review duty/.test(view.why_not!) ? HttpStatus.FORBIDDEN : HttpStatus.CONFLICT);
    const note = b.note?.trim() || undefined;
    if (b.decision === "return" && (!note || note.length < 3)) fail("Say why they go back (3 characters or more), so the person who accepted them can correct them.");
    const workspaceId = await this.ws.id(), word = b.decision === "approve" ? "approved" : "returned";
    const out = await this.db.$transaction(async (tx) => {
      const rows = await tx.libraryChange.findMany({ where: { workspaceId, batchId: id, status: "WAITING" }, orderBy: { proposedAt: "asc" } });
      const odd = rows.find((c) => c.action !== "ADD");
      if (odd) fail(`"${odd.label ?? odd.key}" is not a new library item; it is decided on its own. Nothing was ${word}.`, HttpStatus.CONFLICT);
      const done: { id: string; status: string; label: string | null; key: string; kind: string; combinationId: string | null }[] = [];
      for (const c of rows) {
        try { const r = await decideChange(tx, actor, c.id, b.decision, note); done.push({ id: c.id, status: r.status, label: c.label, key: c.key, kind: c.kind, combinationId: c.combinationId }); }
        catch (e) {
          const status = e instanceof HttpException ? e.getStatus() : HttpStatus.CONFLICT;
          const why = String((e as { getResponse?: () => { detail?: string } }).getResponse?.()?.detail ?? (e as { message?: string }).message ?? e);
          fail(`Nothing was ${word}: "${c.label ?? c.key}" could not be (${why}). Every item of this decision still waits.`, status);
        }
      }
      return done;
    });
    for (const c of out) await this.audit.log(workspaceId, actor.id, word, `library ${c.kind}`, c.key, `${actor.name} ${word} "${c.label ?? c.key}" (add)${note ? `: ${note}` : ""}`, undefined, c.combinationId ?? undefined);
    await this.audit.log(workspaceId, actor.id, word, "library batch", id, `${actor.name} ${word} ${out.length} library item${out.length === 1 ? "" : "s"} from one decision${note ? `: ${note}` : ""}`);
    return { decided: out.map(({ id: x, status }) => ({ id: x, status })), refused: [] as { id: string; label: string; why: string }[] };
  }
}

@Controller("api")
export class ReviewProposalsController {
  constructor(@Inject(ReviewProposals) private readonly s: ReviewProposals) {}
  @Get("review/proposals") list(@Query() q: unknown) { return this.s.list(q); }
  @Post("review/proposals/decide") decide(@Headers("x-actor") a: H, @Body() b: unknown) { return this.s.decide(actorOf(a), b); }
  @Post("review/proposals/undo/:batch") undo(@Headers("x-actor") a: H, @Param("batch") id: string) { return this.s.undo(actorOf(a), id); }
  @Get("review/changes") changes(@Headers("x-actor") a: H, @Query("group") group?: string) { return this.s.batches(actorOf(a), group); }
  @Get("review/changes/batch/:id") batch(@Headers("x-actor") a: H, @Param("id") id: string) { return this.s.batch(actorOf(a), id); }
  @Post("review/changes/batch/:id") decideBatch(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.s.decideBatch(actorOf(a), id, b); }
}
