// C6.15 (row B137; SA-1B-19, SA-1B-20; requirement row B3): document substitute sets in the library, and the set a
// combination's document line picks. Library data used by every combination whose checklist names the type, so sets
// change only as a library change, the same path as "the facts a document supplies" (document-supplies.ts, C4.5): the
// author proposes the type's whole list of sets with a reason; a second person approves it on To review (decideChange:
// never the proposer); at approval the type gets a draft version with the sets (checked again first), published with the
// next release that carries it. A line picks a set by name on the combination's draft (none: "Standard"); a name the type
// does not have is refused here and, if the type changes later, by the release check (engine/validate.ts). Information
// only: a set never blocks anyone. Sample until the immigration expert confirms. No AI (US$0).
import { Body, Controller, Get, Headers, HttpException, HttpStatus, Inject, Injectable, Param, Post, Put } from "@nestjs/common";
import { Prisma, type LibraryChange } from "@prisma/client";
import { problemFromZod } from "../../contracts/programs.ts";
import { MODE_WORDS, PickSetBody, SETS_ACTION, SETS_KIND, SetsBody, setsProblem, STANDARD, type StoredSet } from "../../contracts/document-sets.ts";
import { ACTORS, actorOf, Audit, Db, need, revise, strip, Workspace, type Actor } from "./core.ts";
import { lockItem, refuseRetired } from "./library-items.ts";

type H = string | undefined;
const OPEN = ["WAITING", "RETURNED", "APPROVED"];
const problem = (status: number, title: string, detail: string) =>
  new HttpException({ type: `https://expatready.local/problems/${title.toLowerCase().replace(/[^a-z]+/g, "-")}`, title, status, detail }, status);
const lockKey = (workspaceId: string, key: string) => `${SETS_KIND}:${workspaceId}:${key}`;

/** The newest version of a document type that still counts (a draft, else the newest published). */
async function typeOf(db: Pick<Db, "documentType">, workspaceId: string, key: string) {
  const rows = await db.documentType.findMany({ where: { workspaceId, documentTypeKey: key }, orderBy: { version: "desc" } });
  return { rows, current: rows.find((r) => r.status === "DRAFT") ?? rows.find((r) => r.status === "PUBLISHED") ?? null };
}
const setsOf = (raw: unknown): StoredSet[] => (Array.isArray(raw) ? (raw as StoredSet[]) : []);
const sameSets = (a: StoredSet[], b: StoredSet[]) => JSON.stringify(a) === JSON.stringify(b);
/** A new version copies the row; a Json column that is null is written as the database's null. */
const copyType = (r: Record<string, unknown>) => { const x = strip(r); for (const k of ["readerProfile", "suppliesAbout", "sets"]) if (x[k] === null) x[k] = Prisma.DbNull; return x; };

/** Every document type's newest version, for naming members and the SA-1B-19 checks (retired, sets inside sets). */
async function libraryTypes(db: Pick<Db, "documentType">, workspaceId: string) {
  const rows = await db.documentType.findMany({ where: { workspaceId }, orderBy: { version: "desc" }, select: { documentTypeKey: true, name: true, status: true, sets: true } });
  const out = new Map<string, { name: string; status: string; ownsSets: boolean; sets: StoredSet[] }>();
  for (const r of rows) if (!out.has(r.documentTypeKey)) out.set(r.documentTypeKey, { name: r.name, status: r.status, ownsSets: setsOf(r.sets).length > 0, sets: setsOf(r.sets) });
  return out;
}
/** The whole check on a list for `owner`: SA-1B-19 rules 1 to 6, and no type with sets of its own inside another's. */
function problemOf(owner: string, sets: StoredSet[], types: Awaited<ReturnType<typeof libraryTypes>>): string | null {
  const p = setsProblem(owner, sets, types);
  if (p || !sets.length) return p;
  const holder = [...types].find(([k, t]) => k !== owner && t.status !== "RETIRED" && t.sets.some((s) => s.members.some((m) => m.key === owner)));
  return holder ? `${types.get(owner)?.name ?? owner} is a member of a set of ${holder[1].name}, so it cannot have sets of its own (no sets inside sets).` : null;
}
/** The open (waiting, returned or approved, not released) change of a type's sets: one at a time. */
export async function openSetsChange(db: Pick<Db, "libraryChange">, workspaceId: string, key: string) {
  return db.libraryChange.findFirst({ where: { workspaceId, kind: SETS_KIND, key, status: { in: OPEN } }, orderBy: { proposedAt: "desc" } });
}
const named = (sets: StoredSet[], name: (k: string) => string) => sets.map((s) => ({ name: s.name, mode: s.mode, mode_words: MODE_WORDS[s.mode],
  members: s.members.map((m, i) => ({ key: m.key, name: name(m.key), standard: s.mode === "any_one" && i === 0, when_client: m.whenClient ?? null, when_staff: m.whenStaff ?? m.whenClient ?? null })) }));
export type NamedSet = ReturnType<typeof named>[number];

@Injectable()
export class DocumentSets {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Audit) private readonly audit: Audit, @Inject(Workspace) private readonly ws: Workspace) {}

  /** What the panel reads: the sets now (members named), the open change, the document types a member can be. */
  async view(key: string) {
    const workspaceId = await this.ws.id();
    const { current } = await typeOf(this.db, workspaceId, key);
    if (!current) throw problem(404, "Not in the library", "That document type is not in the shared library.");
    const types = await libraryTypes(this.db, workspaceId);
    const name = (k: string) => types.get(k)?.name ?? k;
    const o = await openSetsChange(this.db, workspaceId, key);
    const uses = (await this.db.documentRequirement.findMany({ where: { workspaceId, documentTypeKey: key, status: { not: "RETIRED" } }, distinct: ["combinationId"], select: { combinationId: true } })).length;
    return { key, name: current.name, uses, sets: named(setsOf(current.sets), name),
      open: o ? { id: o.id, status: o.status as "WAITING" | "RETURNED" | "APPROVED", by: ACTORS.find((a) => a.id === o.proposedBy)?.name ?? "A person", byId: o.proposedBy, reason: o.reason ?? "", note: o.decisionNote, sets: setsView(o) } : null,
      // A member is a document type in use, not one with sets of its own (the type itself may be its own standard).
      types: [...types].filter(([k, t]) => t.status !== "RETIRED" && (k === key || !t.ownsSets)).map(([k, t]) => ({ key: k, name: t.name })).sort((a, b) => a.name.localeCompare(b.name)) };
  }

  async propose(actor: Actor, key: string, body: unknown) {
    need(actor, "author");
    const parsed = SetsBody.safeParse(body);
    if (!parsed.success) throw new HttpException(problemFromZod(parsed.error), HttpStatus.BAD_REQUEST);
    const workspaceId = await this.ws.id();
    const { current } = await typeOf(this.db, workspaceId, key);
    if (!current) throw problem(404, "Not in the library", "That document type is not in the shared library.");
    await refuseRetired(this.db, workspaceId, "document_type", [key]);
    const after: StoredSet[] = parsed.data.sets.map((s) => ({ name: s.name, mode: s.mode, members: s.members.map((m) => ({ key: m.key, ...(m.whenClient ? { whenClient: m.whenClient } : {}), ...(m.whenStaff ? { whenStaff: m.whenStaff } : {}) })) }));
    const types = await libraryTypes(this.db, workspaceId);
    const bad = problemOf(key, after, types);
    if (bad) throw problem(400, "Not a valid set", bad);
    const before = setsOf(current.sets);
    if (sameSets(before, after)) throw problem(409, "Nothing changes", `"${current.name}" already has exactly these sets in the library.`);
    const name = (k: string) => types.get(k)?.name ?? k;
    const names: Record<string, string> = {}; for (const s of [...before, ...after]) for (const m of s.members) names[m.key] = name(m.key);
    const uses = (await this.db.documentRequirement.findMany({ where: { workspaceId, documentTypeKey: key, status: { not: "RETIRED" } }, distinct: ["combinationId"], select: { combinationId: true } })).length;
    const words = after.length ? `${after.length} substitute set${after.length === 1 ? "" : "s"}` : "no substitute set";
    const c = await this.db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`select pg_advisory_xact_lock(hashtext($1))`, lockKey(workspaceId, key));
      const open = await openSetsChange(tx, workspaceId, key);
      if (open) throw problem(409, "Already waiting", open.status === "APPROVED" ? `A change of the sets of "${current.name}" is approved and waits for the next release. To change them again first, its proposer withdraws it (the sets go back to what they were).` : `A change of the sets of "${current.name}" already waits on To review.`);
      return tx.libraryChange.create({ data: { workspaceId, kind: SETS_KIND, key, label: `${current.name} · ${words}, for every combination`.slice(0, 300), action: SETS_ACTION, reason: parsed.data.reason, status: "WAITING", proposedBy: actor.id,
        matches: { document: current.name, before, after, names, uses } as unknown as Prisma.InputJsonValue } });
    });
    await this.audit.log(workspaceId, actor.id, "proposed", "document type", key, `${actor.name} proposed that "${current.name}" has ${words} for every combination (used by ${uses}); waits for a second person. Why: ${parsed.data.reason}`);
    return { id: c.id, status: c.status, label: c.label, sets: setsView(c) };
  }

  /** SA-1B-20: the set a combination's document line picks, on its draft (none or "Standard": the standard set). The type
   *  must have that set now (its draft or published version); a line never adds, removes or reorders members. */
  async pickSet(actor: Actor, combinationId: string, lineage: string, body: unknown) {
    need(actor, "author");
    const parsed = PickSetBody.safeParse(body);
    if (!parsed.success) throw new HttpException(problemFromZod(parsed.error), HttpStatus.BAD_REQUEST);
    const c = await this.db.combination.findUnique({ where: { id: combinationId } });
    if (!c) throw problem(404, "Not found", "No such combination.");
    const want = parsed.data.setName && parsed.data.setName.toLowerCase() !== STANDARD.toLowerCase() ? parsed.data.setName : null;
    const row = await this.db.$transaction(async (tx) => {
      const rows = await tx.documentRequirement.findMany({ where: { combinationId, lineageKey: lineage }, orderBy: { version: "desc" } });
      const newest = rows[0];
      if (!newest || newest.status === "RETIRED") throw problem(404, "Not found", "This document line is not on the combination (it may have been removed).");
      if (parsed.data.baseRevision && newest.updatedAt.toISOString() !== parsed.data.baseRevision) throw problem(409, "Changed meanwhile", `Changed by ${ACTORS.find((a) => a.id === newest.updatedBy)?.name ?? newest.updatedBy} while you were editing. Nothing was saved; reopen the line to see it now.`);
      await lockItem(tx, c.workspaceId, "document_type", [newest.documentTypeKey]);
      const { current } = await typeOf(tx, c.workspaceId, newest.documentTypeKey);
      const sets = setsOf(current?.sets);
      const found = want ? sets.find((s) => s.name.toLowerCase() === want.toLowerCase()) : null;
      if (want && !found) throw problem(400, "No such set", `${current?.name ?? "This document type"} has no set named "${want}". ${sets.length ? `Its sets: ${sets.map((s) => s.name).join(", ")}.` : "It has no substitute sets yet: propose them on the document type first."}`);
      const setName = found?.name ?? null;
      if ((newest.setName ?? null) === setName) throw problem(409, "Nothing changes", `The line already uses ${setName ? `the set "${setName}"` : `the standard set`}.`);
      return (await revise(tx.documentRequirement, rows, { setName }, actor.id, (r) => { const x = strip(r); for (const k of ["alternatives", "predicateJson"]) if (x[k] === null) x[k] = Prisma.DbNull; return x; })).row;
    });
    await this.audit.log(c.workspaceId, actor.id, "updated", "document requirement", lineage, `${actor.name} set the document line ${lineage} in "${c.label}" to use ${row.setName ? `the set "${row.setName}"` : "the standard set"} (draft v${row.version})`, undefined, combinationId);
    return { lineage, set_name: row.setName ?? STANDARD, version: row.version, revision: row.updatedAt.toISOString() };
  }
}

/** What the second person compares on To review: before → after, by name, and the reason. */
export function setsView(c: Pick<LibraryChange, "matches" | "reason">) {
  const m = (c.matches ?? {}) as { document?: string; before?: StoredSet[]; after?: StoredSet[]; names?: Record<string, string>; uses?: number };
  const name = (k: string) => m.names?.[k] ?? k;
  return { document: m.document ?? "", before: named(m.before ?? [], name), after: named(m.after ?? [], name), uses: m.uses ?? 0, reason: c.reason ?? "" };
}
/** The one line To review and History read. */
export function setsWords(v: ReturnType<typeof setsView>) {
  const one = (s: NamedSet) => `${s.name}: ${s.mode_words.toLowerCase()} ${s.members.map((m) => `${m.name}${m.when_client ? ` (when acceptable: ${m.when_client})` : ""}`).join(s.mode === "any_one" ? ", or " : ", and ")}`;
  const list = (xs: NamedSet[]) => (xs.length ? xs.map(one).join("; ") : "none (the document is its own only member)");
  return `Substitute sets of ${v.document}, for every combination: ${list(v.before)} → ${list(v.after)} (used by ${v.uses} combination${v.uses === 1 ? "" : "s"}: at approval it changes each one's draft, and goes out with each one's next release; Sample until the immigration expert confirms). Reason: ${v.reason}`;
}

/** At approval (lifecycle afterApprove): the type gets a draft version with the sets, checked again first. */
export async function applySets(db: Db, audit: Audit, actor: Actor, seen: LibraryChange) {
  const c = await db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`select pg_advisory_xact_lock(hashtext($1))`, lockKey(seen.workspaceId, seen.key));
    const c = await tx.libraryChange.findUnique({ where: { id: seen.id } });
    if (c?.status !== "APPROVED") return null;
    const m = c.matches as { before?: StoredSet[]; after?: StoredSet[] };
    const { rows, current } = await typeOf(tx, c.workspaceId, c.key);
    if (!current || !m.after) throw problem(409, "Not in the library", "The document type is no longer in the library, so nothing was changed. Return the change.");
    const keys = [c.key, ...m.after.flatMap((s) => s.members.map((x) => x.key))];
    await lockItem(tx, c.workspaceId, "document_type", keys);
    await refuseRetired(tx, c.workspaceId, "document_type", keys);
    const bad = problemOf(c.key, m.after, await libraryTypes(tx, c.workspaceId));
    if (bad) throw problem(409, "No longer valid", `${bad} Nothing was changed. Return the change; the author proposes it again.`);
    if (!sameSets(setsOf(current.sets), m.before ?? [])) throw problem(409, "Changed since", "The sets of this document type changed after it was proposed, so nothing was changed. Return it; the author proposes it again.");
    await revise(tx.documentType, rows, { sets: m.after.length ? (m.after as unknown as Prisma.InputJsonValue) : Prisma.DbNull }, actor.id, copyType);
    return c;
  }, { timeout: 30_000, maxWait: 10_000 });
  if (!c) throw problem(409, "Changed meanwhile", "This change was withdrawn at the same moment, so nothing was applied. Refresh to see it.");
  await audit.log(c.workspaceId, actor.id, "approved", "document type", c.key, `${actor.name} approved: ${c.label ?? c.key}. Every combination that names it has the sets in its draft now; they go out with each one's next release.`);
}

/** An approved change no release has carried yet is withdrawn by its proposer: the type's draft goes back to the sets it
 *  had (refused when the draft changed since). Called by withdrawChange (library-changes.ts) in its transaction. */
export async function withdrawApprovedSets(tx: Prisma.TransactionClient, actor: Actor, c: LibraryChange, why: string) {
  await tx.$executeRawUnsafe(`select pg_advisory_xact_lock(hashtext($1))`, lockKey(c.workspaceId, c.key));
  const now = await tx.libraryChange.findUnique({ where: { id: c.id } });
  if (now?.status !== "APPROVED") throw problem(409, "Already decided", `This change is already ${String(now?.status ?? "gone").toLowerCase()}. Refresh to see it.`);
  const m = c.matches as { before?: StoredSet[]; after?: StoredSet[] };
  const draft = (await tx.documentType.findMany({ where: { workspaceId: c.workspaceId, documentTypeKey: c.key, status: "DRAFT" }, orderBy: { version: "desc" }, take: 1 }))[0];
  if (!draft || !sameSets(setsOf(draft.sets), m.after ?? [])) throw problem(409, "Changed since", "The document type's sets changed after this was approved, so nothing was withdrawn. Refresh to see them.");
  await tx.documentType.update({ where: { id: draft.id }, data: { sets: m.before?.length ? (m.before as unknown as Prisma.InputJsonValue) : Prisma.DbNull, updatedBy: actor.id } });
  const note = `${c.decisionNote ? `Approved: ${c.decisionNote.replace(/\.$/, "")}. ` : ""}Withdrawn by ${actor.name}: ${why}`.slice(0, 300);
  const done = await tx.libraryChange.updateMany({ where: { id: c.id, status: "APPROVED" }, data: { status: "WITHDRAWN", decisionNote: note } });
  if (!done.count) throw problem(409, "Already decided", "Someone released or withdrew this at the same moment. Refresh to see it.");
  await tx.auditEvent.create({ data: { workspaceId: c.workspaceId, actor: actor.id, action: "withdrawn", entity: "document type", entityKey: c.key, summary: `${actor.name} withdrew the approved change "${c.label ?? c.key}"; its sets went back to what they were. Why: ${why}`.slice(0, 600), detail: { change: c.id } } });
}

/** At a release (publishLibraryChanges): an approved change whose type the release published with these sets is released. */
export async function releaseSets(tx: Prisma.TransactionClient, workspaceId: string, pack: number) {
  const out: { kind: string; key: string; label: string; action: string }[] = [];
  for (const c of await tx.libraryChange.findMany({ where: { workspaceId, kind: SETS_KIND, status: "APPROVED" } })) {
    if (await tx.documentType.count({ where: { workspaceId, documentTypeKey: c.key, status: "DRAFT" } })) continue;
    const pub = (await tx.documentType.findMany({ where: { workspaceId, documentTypeKey: c.key, status: "PUBLISHED" }, orderBy: { version: "desc" }, take: 1 }))[0];
    if (!pub || !sameSets(setsOf(pub.sets), (c.matches as { after?: StoredSet[] }).after ?? [])) continue;
    await tx.libraryChange.update({ where: { id: c.id }, data: { status: "RELEASED", releasedIn: pack } });
    out.push({ kind: c.kind, key: c.key, label: c.label ?? c.key, action: c.action });
  }
  return out;
}

@Controller("api")
export class DocumentSetsController {
  constructor(@Inject(DocumentSets) private readonly s: DocumentSets) {}
  @Get("library/document-types/:key/sets") view(@Param("key") key: string) { return this.s.view(key); }
  @Post("library/document-types/:key/sets") propose(@Headers("x-actor") a: H, @Param("key") key: string, @Body() b: unknown) { return this.s.propose(actorOf(a), key, b); }
  @Put("combinations/:id/requirements/:lineage/set") pick(@Headers("x-actor") a: H, @Param("id") id: string, @Param("lineage") l: string, @Body() b: unknown) { return this.s.pickSet(actorOf(a), id, l, b); }
}
