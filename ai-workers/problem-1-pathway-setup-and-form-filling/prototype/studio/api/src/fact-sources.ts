// W1-15 Questions and documents, slice 1 (runtime lane; P-130, challenge M1, M2, M4, m2; Lead response 29 Oct): where the
// answer to each fact comes from, per person role, and the Pre-qualification tick. The rules work out every source
// (engine/sources.ts); a person's choice over it, and each tick, is a FactSource row, versioned like a document
// requirement: a draft until the combination's release publishes it; the author's own draft is undone at once. US$0.
import { Body, Controller, Delete, Get, Headers, HttpException, HttpStatus, Inject, Injectable, Param, Put } from "@nestjs/common";
import { z } from "zod";
import { buildSnapshot } from "../../engine/snapshot.ts";
import { factSources, prequalification, SOURCES, type FactSourceView } from "../../engine/sources.ts";
import { problemFromZod } from "../../contracts/programs.ts";
import { actorOf, Audit, Db, need, readerOf, type Actor } from "./core.ts";

type H = string | undefined;
const problem = (status: number, title: string, detail: string, extra: Record<string, unknown> = {}) =>
  new HttpException({ type: `https://expatready.local/problems/${title.toLowerCase().replace(/[^a-z]+/g, "-")}`, title, status, detail, ...extra }, status);

export const SetFactSource = z.object({
  source: z.enum(SOURCES, { message: "Choose where the answer comes from: Document, Client or Agent." }).nullable().optional(),
  documentTypeKey: z.string().trim().min(1).max(120).nullable().optional(),
  prequalification: z.boolean({ error: "Say whether this fact is asked for pre-qualification." }).optional(),
  reason: z.string().trim().max(400).nullable().optional(),
  /** The version read (0 when the rules' default was shown): a stale one is a 409. */
  version: z.number({ error: "Reload: the version you read is missing." }).int().min(0),
});
const NOT_YOURS = "Only the person who made this draft can undo it.";
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
    const version = new Map<string, number>(); for (const r of rows) if (!version.has(r.lineageKey)) version.set(r.lineageKey, r.version);
    const facts = factSources(snapshot).map((f) => ({ ...f, version: version.get(`${f.role}|${f.fact}`) ?? 0 }));
    const counts = { facts: facts.length, document: facts.filter((f) => f.source === "DOCUMENT").length, client: facts.filter((f) => f.source === "CLIENT").length, agent: facts.filter((f) => f.source === "AGENT").length, prequalification: facts.filter((f) => f.prequalification).length };
    return { counts, facts, prequalification: prequalification(snapshot), basis: "Sample until the immigration expert confirms" };
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
    if ((newest?.version ?? 0) !== b.version) throw problem(409, "Changed since", `Someone changed where "${fact}" comes from after you looked. Reload, then choose again.`, { version: newest?.version ?? 0 });
    const { snapshot } = await buildSnapshot(this.db, c.workspaceId, id, "draft");
    const f = factSources(snapshot).find((x) => x.role === role && x.fact === fact);
    if (!f) throw problem(404, "Not needed", `No form of "${c.label}" needs "${fact}" for this person, so there is nothing to choose.`);
    const source = b.source === undefined ? (newest?.source ?? null) : b.source;
    const documentTypeKey = source === "DOCUMENT" ? (b.documentTypeKey ?? (b.source === undefined ? newest?.documentTypeKey : null) ?? null) : null;
    const tick = b.prequalification ?? newest?.prequalification ?? false;
    const errors = refusals(f, source as FactSourceView["source"] | null, documentTypeKey, tick);
    if (errors.length) throw problem(422, "Not possible", errors[0].message, { errors });
    // The rules' own source is not stored as a choice (challenge M1): only what differs, and the tick.
    const keep = source && !(source === f.ruleSource && (source !== "DOCUMENT" || documentTypeKey === f.ruleDocument?.key)) ? source : null;
    const data = { source: keep, documentTypeKey: keep === "DOCUMENT" ? documentTypeKey : null, prequalification: tick, reason: b.reason ?? newest?.reason ?? null };
    const published = rows.find((r) => r.status === "PUBLISHED");
    await this.db.$transaction(async (tx) => {
      if (newest?.status === "DRAFT") await tx.factSource.delete({ where: { id: newest.id } });
      await tx.factSource.create({ data: { workspaceId: c.workspaceId, combinationId: id, lineageKey, role, canonicalFieldKey: fact, ...data, version: (newest?.version ?? 0) + 1, status: "DRAFT", supersedesId: published?.id ?? null, origin: "HUMAN", updatedBy: actor.id } });
    });
    await this.audit.log(c.workspaceId, actor.id, "changed", "fact source", lineageKey, `${actor.name} set where "${f.label}" (${role}) comes from in "${c.label}": ${keep ? `${keep === "DOCUMENT" ? `Document · ${documentTypeKey}` : keep === "CLIENT" ? "Client" : "Agent"}` : "as the rules say"}${tick ? ", pre-qualification" : ""}`, { before: newest ? { source: newest.source, document: newest.documentTypeKey, prequalification: newest.prequalification } : null }, id);
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
}

/** The same rules release applies (engine/sources.ts factSourceProblems), said at save for this one fact. */
function refusals(f: FactSourceView, source: FactSourceView["source"] | null, documentTypeKey: string | null, tick: boolean): { field: string; message: string }[] {
  const out: { field: string; message: string }[] = [];
  const s = source ?? f.ruleSource;
  if (f.clientOnly && s !== "CLIENT") out.push({ field: "source", message: `"${f.label}" is a declaration or background answer: only the client gives it.` });
  if (source === "DOCUMENT") {
    if (!documentTypeKey) out.push({ field: "documentTypeKey", message: "Choose which document supplies it." });
    else if (![f.ruleDocument, ...f.also].some((x) => x?.key === documentTypeKey)) out.push({ field: "documentTypeKey", message: `That document is not on this person's checklist, or it does not supply "${f.label}". Add it on the Documents tab first.` });
  }
  if (source === "CLIENT" && !f.placed) out.push({ field: "source", message: `No question asks "${f.label}", so the client cannot give it. Add the question first.` });
  if (tick && s === "AGENT") out.push({ field: "prequalification", message: `"${f.label}" comes from the agent: a prospect is asked only what they can answer.` });
  if (tick && !f.placed) out.push({ field: "prequalification", message: `No question asks "${f.label}", so a prospect cannot be asked it.` });
  return out;
}

@Controller("api")
export class FactSourcesController {
  constructor(@Inject(FactSources) private readonly f: FactSources) {}
  @Get("combinations/:id/fact-sources") list(@Headers("x-actor") a: H, @Param("id") id: string) { readerOf(a); return this.f.list(id); }
  @Put("combinations/:id/fact-sources/:role/:fact") set(@Headers("x-actor") a: H, @Param("id") id: string, @Param("role") role: string, @Param("fact") fact: string, @Body() b: unknown) { return this.f.set(actorOf(a), id, role, fact, b); }
  @Delete("combinations/:id/fact-sources/:role/:fact") undo(@Headers("x-actor") a: H, @Param("id") id: string, @Param("role") role: string, @Param("fact") fact: string, @Body() b: unknown) { return this.f.undo(actorOf(a), id, role, fact, b); }
}
