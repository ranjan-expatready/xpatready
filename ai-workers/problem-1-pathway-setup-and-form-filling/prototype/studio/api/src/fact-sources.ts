// W1-15 Questions and documents, slice 1 (runtime lane; P-130, challenge M1, M2, M4, m2; Lead response 29 Oct): where the
// answer to each fact comes from, per person role, and the Pre-qualification tick. The rules work out every source
// (engine/sources.ts); a person's choice over it, and each tick, is a FactSource row, versioned like a document
// requirement: a draft until the combination's release publishes it; the author's own draft is undone at once. US$0.
import { randomUUID } from "node:crypto";
import { Body, Controller, Delete, Get, Headers, HttpCode, HttpException, HttpStatus, Inject, Injectable, Param, Post, Put } from "@nestjs/common";
import { z } from "zod";
import { buildSnapshot, type Snapshot } from "../../engine/snapshot.ts";
import { agentRefusal, CASE_OFFICER_NEEDS_REASON, countryPqr, factSourceProblems, factSources, prequalification, SOURCES, type FactSourceView } from "../../engine/sources.ts";
import { problemFromZod } from "../../contracts/programs.ts";
import { actorOf, Audit, Db, need, readerOf, type Actor } from "./core.ts";

type H = string | undefined;
const problem = (status: number, title: string, detail: string, extra: Record<string, unknown> = {}) =>
  new HttpException({ type: `https://expatready.local/problems/${title.toLowerCase().replace(/[^a-z]+/g, "-")}`, title, status, detail, ...extra }, status);

export const SetFactSource = z.object({
  source: z.enum(SOURCES, { message: "Choose where the answer comes from: Document, Client or Case officer." }).nullable().optional(),
  /** P-155(3): why the case officer enters a fact that is not a case officer's own. */
  sourceReason: z.string().trim().max(400, "Keep the reason under 400 characters.").nullable().optional(),
  documentTypeKey: z.string().trim().min(1).max(120).nullable().optional(),
  prequalification: z.boolean({ error: "Say whether this fact is asked for pre-qualification." }).optional(),
  reason: z.string().trim().max(400).nullable().optional(),
  /** The version read (0 when the rules' default was shown): a stale one is a 409. */
  version: z.number({ error: "Reload: the version you read is missing." }).int().min(0),
});
/** Slice 2 (P-147 board v2): one change on the ticked rows. "RULES" goes back to the rules' default for each row. */
export const BulkFactSource = z.object({
  items: z.array(z.object({ role: z.string().min(1).max(80), fact: z.string().min(1).max(200), version: z.number().int().min(0) }), { error: "Tick the rows to change." }).min(1, "Tick the rows to change.").max(500, "At most 500 rows in one change."),
  source: z.enum([...SOURCES, "RULES"], { message: "Choose where the answers come from: Client, Case officer or the rules' default." }).optional(),
  prequalification: z.boolean().optional(),
}).refine((b) => b.source !== undefined || b.prequalification !== undefined, { message: "Choose what to change on the ticked rows.", path: ["source"] });
const UndoBulk = z.object({ batchId: z.string().uuid({ message: "That bulk change is not known. Reload the page." }) });
const NOT_YOURS ="Only the person who made this draft can undo it.";
const UndoFactSource =z.object({ version: z.number({ error: "Reload: the version you read is missing." }).int().min(1) });

@Injectable()
export class FactSources {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Audit) private readonly audit: Audit) {}

  private async combination(id: string, writing = true) {
    const c = /^[0-9a-f-]{36}$/i.test(id) ? await this.db.combination.findUnique({ where: { id } }) : null;
    if (!c) throw problem(404, "Not found", "That combination does not exist (it may have been removed by a reset).");
    if (writing && c.retiredAt) throw problem(409, "Retired", `"${c.label}" is retired: where its answers come from is not changed. Restore it on Structure first; open cases keep their release.`);
    return c;
  }

  /** Each fact with its source (rules or a person's choice), its version, and the pre-qualification set. */
  async list(id: string) {
    const c = await this.combination(id, false);
    const { snapshot } = await buildSnapshot(this.db, c.workspaceId, id, "draft");
    const rows = await this.db.factSource.findMany({ where: { combinationId: id }, orderBy: { version: "desc" } });
    const newest = new Map<string, (typeof rows)[number]>(); for (const r of rows) if (!newest.has(r.lineageKey)) newest.set(r.lineageKey, r);
    // Slice 2: the row's status is its newest saved choice: none (the rules), a draft (Changed here, its author may
    // undo it at once) or published (released in an earlier release).
    const facts = factSources(snapshot).map((f) => { const n = newest.get(`${f.role}|${f.fact}`); return { ...f, version: n?.version ?? 0, change: n ? { status: n.status === "DRAFT" ? "DRAFT" as const : "PUBLISHED" as const, by: n.updatedBy, at: n.updatedAt.toISOString(), batchId: n.batchId } : null }; });
    const counts = { facts: facts.length, document: facts.filter((f) => f.source === "DOCUMENT").length, client: facts.filter((f) => f.source === "CLIENT").length, agent: facts.filter((f) => f.source === "AGENT").length, prequalification: facts.filter((f) => f.prequalification).length };
    return { counts, facts, prequalification: prequalification(snapshot), problems: factSourceProblems(snapshot), basis: "Sample until the immigration expert confirms" };
  }

  /** A person's choice over the rules for one fact of one role (P-130), or the tick; checked now, and again at release. */
  async set(actor: Actor, id: string, role: string, fact: string, body: unknown) {
    need(actor, "author");
    const parsed = SetFactSource.safeParse(body);
    if (!parsed.success) throw new HttpException(problemFromZod(parsed.error), HttpStatus.BAD_REQUEST);
    const b = parsed.data;
    const c = await this.combination(id);
    const lineageKey = `${role}|${fact}`;
    const rows = await this.db.factSource.findMany({ where: { combinationId: id, lineageKey }, orderBy: { version: "desc" } });
    const newest = rows[0];
    const { snapshot } = await buildSnapshot(this.db, c.workspaceId, id, "draft");
    const f = factSources(snapshot).find((x) => x.role === role && x.fact === fact);
    // QA-94: messages name the question in words; the system name stays behind the library link.
    if ((newest?.version ?? 0) !== b.version) throw problem(409, "Changed since", `Someone changed where ${f ? `"${f.label}"` : "this answer"} comes from after you looked. Reload, then choose again.`, { version: newest?.version ?? 0 });
    if (!f) throw problem(404, "Not needed", `No form of "${c.label}" needs this answer for this person, so there is nothing to choose.`);
    const source = b.source === undefined ? (newest?.source ?? null) : b.source;
    const documentTypeKey = source === "DOCUMENT" ? (b.documentTypeKey ?? (b.source === undefined ? newest?.documentTypeKey : null) ?? null) : null;
    const tick = b.prequalification ?? newest?.prequalification ?? false;
    // P-155(3): a reason is kept only for the case officer on a fact that is not a case officer's own.
    const sourceReason = source === "AGENT" && f.ruleSource !== "AGENT" ? ((b.sourceReason === undefined ? newest?.sourceReason : b.sourceReason) ?? null) : null;
    const errors = refusals(f, source as FactSourceView["source"] | null, documentTypeKey, tick, sourceReason);
    if (errors.length) throw problem(422, "Not possible", errors[0].message, { errors });
    // The rules' own source is not stored as a choice (challenge M1): only what differs, and the tick.
    const keep = source && !(source === f.ruleSource && (source !== "DOCUMENT" || documentTypeKey === f.ruleDocument?.key)) ? source : null;
    const data = { source: keep, documentTypeKey: keep === "DOCUMENT" ? documentTypeKey : null, prequalification: tick, reason: b.reason ?? newest?.reason ?? null, sourceReason: keep === "AGENT" ? sourceReason : null };
    const published = rows.find((r) => r.status === "PUBLISHED");
    await this.db.$transaction(async (tx) => {
      if (newest?.status === "DRAFT") await tx.factSource.delete({ where: { id: newest.id } });
      await tx.factSource.create({ data: { workspaceId: c.workspaceId, combinationId: id, lineageKey, role, canonicalFieldKey: fact, ...data, version: (newest?.version ?? 0) + 1, status: "DRAFT", supersedesId: published?.id ?? null, origin: "HUMAN", updatedBy: actor.id } });
    });
    await this.audit.log(c.workspaceId, actor.id, "changed", "fact source", lineageKey, `${actor.name} set where "${f.label}" (${role}) comes from in "${c.label}": ${keep ? `${keep === "DOCUMENT" ? `Document · ${documentTypeKey}` : keep === "CLIENT" ? "Client" : `Case officer (why: ${sourceReason})`}` : "as the rules say"}${tick ? ", pre-qualification" : ""}`, { before: newest ? { source: newest.source, document: newest.documentTypeKey, prequalification: newest.prequalification } : null }, id);
    return (await this.list(id)).facts.find((x) => x.role === role && x.fact === fact);
  }

  /** Undo: the author's own draft choice goes at once (P-116 amended); a published one stays until the next release. */
  async undo(actor: Actor, id: string, role: string, fact: string, body: unknown) {
    // Lead check W2: the refusal says who may undo, not which duty is missing.
    if (!(actor.duties as readonly string[]).includes("author")) throw problem(403, "Not yours", NOT_YOURS);
    const parsed = UndoFactSource.safeParse(body);
    if (!parsed.success) throw new HttpException(problemFromZod(parsed.error), HttpStatus.BAD_REQUEST);
    const c = await this.combination(id);
    const newest = await this.db.factSource.findFirst({ where: { combinationId: id, lineageKey: `${role}|${fact}` }, orderBy: { version: "desc" } });
    if (!newest || newest.status !== "DRAFT") throw problem(409, newest ? "Released since" : "Nothing to undo", newest ? "That choice was released meanwhile: a release is never undone. Change it in a new draft." : "There is no choice on this fact to undo.");
    if (newest.version !== parsed.data.version) throw problem(409, "Changed since", "Someone changed this fact's source after you looked. Reload first.", { version: newest.version });
    if (newest.updatedBy !== actor.id) throw problem(409, "Not yours", NOT_YOURS);
    await this.db.factSource.delete({ where: { id: newest.id } });
    await this.audit.log(c.workspaceId, actor.id, "undone", "fact source", `${role}|${fact}`, `${actor.name} undid their choice of where "${fact}" (${role}) comes from in "${c.label}"`, undefined, id);
    return (await this.list(id)).facts.find((x) => x.role === role && x.fact === fact) ?? null;
  }

  /** P-132: the country PQR, assembled from the newest release of every combination in this combination's country pack
   *  that is not retired; this combination's draft ticks are counted apart, as "goes in at its next release". */
  async country(id: string) {
    const c = await this.combination(id, false);
    const rows = await this.db.configRelease.findMany({ where: { workspaceId: c.workspaceId, combination: { retiredAt: null } }, select: { combinationId: true, version: true, snapshot: true }, orderBy: { version: "desc" } });
    const newest = new Map<string, (typeof rows)[number]>(); for (const r of rows) if (!newest.has(r.combinationId)) newest.set(r.combinationId, r);
    const view = countryPqr([...newest.values()].map((r) => ({ combinationId: r.combinationId, version: r.version, snapshot: r.snapshot as unknown as Snapshot })));
    const { snapshot } = await buildSnapshot(this.db, c.workspaceId, id, "draft");
    const asked = new Set(view.lines.filter((l) => l.combinations.some((x) => x.id === id)).map((l) => `${l.role}|${l.fact}`));
    const draft = prequalification(snapshot).filter((t) => !asked.has(`${t.role}|${t.fact}`)).map((t) => ({ role: t.role, fact: t.fact, label: t.label }));
    const gone = view.lines.filter((l) => l.combinations.some((x) => x.id === id) && !prequalification(snapshot).some((t) => t.role === l.role && t.fact === l.fact)).map((l) => ({ role: l.role, fact: l.fact, label: l.label }));
    return { ...view, released: newest.size, thisCombination: { draftAdds: draft, draftRemoves: gone }, basis: "Sample until the immigration expert confirms" };
  }

  async bulk(actor: Actor, id: string, body: unknown) {
    need(actor, "author");
    return bulkSet(this.db, this.audit, actor, await this.combination(id), body);
  }

  async bulkUndo(actor: Actor, id: string, body: unknown) {
    if (!(actor.duties as readonly string[]).includes("author")) throw problem(403, "Not yours", NOT_YOURS);
    return bulkUndo(this.db, this.audit, actor, await this.combination(id), body);
  }
}

/** Slice 2 (P-147): one change on the ticked rows. Each row is re-checked against the same locks as a single save;
 *  a refused row is listed in words and the rest are saved together under one batch id (one Undo). */
export async function bulkSet(db: Db, audit: Audit, actor: Actor, c: { id: string; workspaceId: string; label: string }, body: unknown) {
  const parsed = BulkFactSource.safeParse(body);
  if (!parsed.success) throw new HttpException(problemFromZod(parsed.error), HttpStatus.BAD_REQUEST);
  const b = parsed.data;
  const { snapshot } = await buildSnapshot(db, c.workspaceId, c.id, "draft");
  const views = new Map(factSources(snapshot).map((f) => [`${f.role}|${f.fact}`, f]));
  const keys = [...new Set(b.items.map((x) => `${x.role}|${x.fact}`))];
  const rows = await db.factSource.findMany({ where: { combinationId: c.id, lineageKey: { in: keys } }, orderBy: { version: "desc" } });
  const refused: { role: string; fact: string; label: string; message: string }[] = [];
  type Row = (typeof rows)[number];
  const save: { key: string; f: FactSourceView; newest: Row | undefined; published: Row | undefined; data: { source: string | null; documentTypeKey: string | null; prequalification: boolean; reason: string | null; sourceReason: string | null } }[] = [];
  const seen = new Set<string>();
  for (const it of b.items) {
    const key = `${it.role}|${it.fact}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const f = views.get(key);
    const mine = rows.filter((r) => r.lineageKey === key), newest = mine[0];
    if (!f) { refused.push({ role: it.role, fact: it.fact, label: "", message: `One ticked answer is no longer needed by any form of "${c.label}" for this person. Reload.` }); continue; }
    if ((newest?.version ?? 0) !== it.version) { refused.push({ role: f.role, fact: f.fact, label: f.label, message: `"${f.label}": changed by someone else after you looked. Reload, then choose again.` }); continue; }
    const source = b.source === undefined ? (newest?.source ?? null) : b.source === "RULES" ? f.ruleSource : b.source;
    const documentTypeKey = b.source === undefined ? (newest?.documentTypeKey ?? null) : b.source === "RULES" ? (f.ruleDocument?.key ?? null) : null;
    const tick = b.prequalification ?? newest?.prequalification ?? false;
    // A bulk change carries no reason: the case officer on a fact that is not theirs keeps an earlier written reason, or is
    // refused here and set one at a time in its details (P-155(3)).
    const sourceReason = source === "AGENT" && f.ruleSource !== "AGENT" ? (newest?.source === "AGENT" ? newest?.sourceReason ?? null : null) : null;
    const errors = refusals(f, source as FactSourceView["source"] | null, documentTypeKey, tick, sourceReason);
    if (errors.length) { refused.push({ role: f.role, fact: f.fact, label: f.label, message: errors[0].message === CASE_OFFICER_NEEDS_REASON ? `${CASE_OFFICER_NEEDS_REASON} Open its details to write why: a bulk change cannot.` : errors[0].message }); continue; }
    const keep = source && !(source === f.ruleSource && (source !== "DOCUMENT" || documentTypeKey === f.ruleDocument?.key)) ? source : null;
    const data = { source: keep, documentTypeKey: keep === "DOCUMENT" ? documentTypeKey : null, prequalification: tick, reason: newest?.reason ?? null, sourceReason: keep === "AGENT" ? sourceReason : null };
    // Already as chosen: not a change, so neither saved nor undone.
    if ((newest?.source ?? null) === data.source && (newest?.documentTypeKey ?? null) === data.documentTypeKey && (newest?.prequalification ?? false) === data.prequalification) continue;
    save.push({ key, f, newest, published: mine.find((r) => r.status === "PUBLISHED"), data });
  }
  const batchId = save.length ? randomUUID() : null;
  if (save.length) await db.$transaction(async (tx) => {
    for (const x of save) {
      if (x.newest?.status === "DRAFT") await tx.factSource.delete({ where: { id: x.newest.id } });
      await tx.factSource.create({ data: { workspaceId: c.workspaceId, combinationId: c.id, lineageKey: x.key, role: x.f.role, canonicalFieldKey: x.f.fact, ...x.data, version: (x.newest?.version ?? 0) + 1, status: "DRAFT", supersedesId: x.published?.id ?? null, origin: "HUMAN", updatedBy: actor.id, batchId } });
    }
  });
  const what = [b.source ? `where the answer comes from set to ${b.source === "RULES" ? "the rules' default" : b.source === "CLIENT" ? "the client" : b.source === "AGENT" ? "the case officer" : "a document"}` : "", b.prequalification === undefined ? "" : `pre-qualification ${b.prequalification ? "on" : "off"}`].filter(Boolean).join(", ");
  if (save.length) await audit.log(c.workspaceId, actor.id, "changed", "fact source", `bulk:${batchId}`, `${actor.name} changed ${save.length} question${save.length === 1 ? "" : "s"} in "${c.label}": ${what}`, { batchId, rows: save.map((x) => x.key) }, c.id);
  return { saved: save.length, batchId, what, refused };
}

/** One Undo for one bulk change: the author's own draft rows of that batch go at once; a row released or changed since
 *  stays, and is listed. */
export async function bulkUndo(db: Db, audit: Audit, actor: Actor, c: { id: string; workspaceId: string; label: string }, body: unknown) {
  const parsed = UndoBulk.safeParse(body);
  if (!parsed.success) throw new HttpException(problemFromZod(parsed.error), HttpStatus.BAD_REQUEST);
  const rows = await db.factSource.findMany({ where: { combinationId: c.id, batchId: parsed.data.batchId } });
  if (!rows.length) throw problem(409, "Nothing to undo", "That bulk change is not there any more: it was undone or released.");
  if (rows.some((r) => r.updatedBy !== actor.id)) throw problem(403, "Not yours", NOT_YOURS);
  const all = await db.factSource.findMany({ where: { combinationId: c.id, lineageKey: { in: rows.map((r) => r.lineageKey) } }, orderBy: { version: "desc" } });
  const top = new Map<string, string>(); for (const r of all) if (!top.has(r.lineageKey)) top.set(r.lineageKey, r.id);
  const go = rows.filter((r) => r.status === "DRAFT" && top.get(r.lineageKey) === r.id);
  const kept = rows.filter((r) => !go.includes(r)).map((r) => ({ role: r.role, fact: r.canonicalFieldKey, message: r.status === "DRAFT" ? "Changed again since: kept." : "Released since: a release is never undone." }));
  if (!go.length) throw problem(409, "Released since", "That bulk change was released or changed again meanwhile: a release is never undone. Change it in a new draft.", { kept });
  await db.factSource.deleteMany({ where: { id: { in: go.map((r) => r.id) } } });
  await audit.log(c.workspaceId, actor.id, "undone", "fact source", `bulk:${parsed.data.batchId}`, `${actor.name} undid their change to ${go.length} question${go.length === 1 ? "" : "s"} in "${c.label}"`, { rows: go.map((r) => r.lineageKey) }, c.id);
  return { undone: go.length, kept };
}

/** The same rules release applies (engine/sources.ts factSourceProblems), said at save for this one fact. */
function refusals(f: FactSourceView, source: FactSourceView["source"] | null, documentTypeKey: string | null, tick: boolean, sourceReason: string | null = null): { field: string; message: string }[] {
  const out: { field: string; message: string }[] = [];
  const s = source ?? f.ruleSource;
  if (f.clientOnly && s !== "CLIENT") out.push({ field: "source", message: `"${f.label}" is a declaration or background answer: only the client gives it.` });
  if (source === "DOCUMENT") {
    if (!documentTypeKey) out.push({ field: "documentTypeKey", message: "Choose which document supplies it." });
    else if (![f.ruleDocument, ...f.also].some((x) => x?.key === documentTypeKey)) out.push({ field: "documentTypeKey", message: `That document is not on this person's checklist, or it does not supply "${f.label}". Add it on the Documents tab first.` });
  }
  // P-155(3): the one rule for the case officer as a source (engine/sources.ts agentRefusal).
  const officer = source === "AGENT" ? agentRefusal(f, sourceReason) : null;
  if (officer) out.push({ field: "sourceReason", message: officer });
  if (source === "CLIENT" && !f.placed) out.push({ field: "source", message: `No question asks "${f.label}", so the client cannot give it. Add the question first.` });
  if (tick && s === "AGENT") out.push({ field: "prequalification", message: `"${f.label}" comes from the case officer: a prospect is asked only what they can answer.` });
  if (tick && !f.placed) out.push({ field: "prequalification", message: `No question asks "${f.label}", so a prospect cannot be asked it.` });
  return out;
}

@Controller("api")
export class FactSourcesController {
  constructor(@Inject(FactSources) private readonly f: FactSources) {}
  @Get("combinations/:id/fact-sources") list(@Headers("x-actor") a: H, @Param("id") id: string) { readerOf(a); return this.f.list(id); }
  @Get("combinations/:id/pqr/country") country(@Headers("x-actor") a: H, @Param("id") id: string) { readerOf(a); return this.f.country(id); }
  @Put("combinations/:id/fact-sources/:role/:fact") set(@Headers("x-actor") a: H, @Param("id") id: string, @Param("role") role: string, @Param("fact") fact: string, @Body() b: unknown) { return this.f.set(actorOf(a), id, role, fact, b); }
  @Post("combinations/:id/fact-sources/bulk") @HttpCode(200) bulk(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.f.bulk(actorOf(a), id, b); }
  @Post("combinations/:id/fact-sources/bulk/undo") @HttpCode(200) bulkUndo(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.f.bulkUndo(actorOf(a), id, b); }
  @Delete("combinations/:id/fact-sources/:role/:fact") undo(@Headers("x-actor") a: H, @Param("id") id: string, @Param("role") role: string, @Param("fact") fact: string, @Body() b: unknown) { return this.f.undo(actorOf(a), id, role, fact, b); }
}
