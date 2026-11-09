// C6.14 (row B136, P-406; SA-1B-151 §5 r1, §7; concept product/screens/B136/concept.md BR-1, r2 after challenge M1): a
// document type's default provider roles, "Who provides it when shared": an ordered list of person-role keys from the
// workspace's roles that take part in a case (never the representative, whose documents are not the client's), used only
// on a line asked once for the application or once for the couple (engine/runtime/case-checklist.ts providersFor).
// Library data used by every combination whose checklist names the type, so it changes only as a library change, the
// same path as the type's substitute sets (document-sets.ts, C6.15) and the facts it supplies (document-supplies.ts, C4.5):
// the author proposes the whole ordered list with a reason; a second person approves it on To review (decideChange: never
// the proposer, P-253); at approval the type gets a draft version with the roles (checked again first), published with
// the next release that carries it. A release whose types carry no roles is byte-identical to before (engine/snapshot.ts).
// Sample until the immigration expert confirms. No AI (US$0).
//   GET  /api/library/document-types/:key/providers   { key, name, roles, choices, open, uses, help }
//   POST /api/library/document-types/:key/providers   { roles, reason } → the waiting change
import { Body, Controller, Get, Headers, HttpException, Inject, Injectable, Param, Post } from "@nestjs/common";
import { Prisma, type LibraryChange } from "@prisma/client";
import { z } from "zod";
import { NEVER_PROVIDES } from "../../engine/runtime/case-checklist.ts";
import { INVISIBLE, UNSTORABLE } from "../../contracts/documents.ts";
import { ACTORS, actorOf, Audit, Db, need, readerOf, revise, strip, Workspace, type Actor } from "./core.ts";
import { lockItem, refuseRetired } from "./library-items.ts";

type H = string | undefined;
type Tx = Prisma.TransactionClient;
export const PROVIDERS_KIND = "document_providers", PROVIDERS_ACTION = "SET_PROVIDERS";
const OPEN = ["WAITING", "RETURNED", "APPROVED"];
const problem = (status: number, title: string, detail: string, extra: Record<string, unknown> = {}) =>
  new HttpException({ type: `https://expatready.local/problems/${title.toLowerCase().replace(/[^a-z]+/g, "-")}`, title, status, detail, ...extra }, status);
const lockKey = (workspaceId: string, key: string) => `${PROVIDERS_KIND}:${workspaceId}:${key}`;
const KEY = /^[a-z0-9][a-z0-9_.:-]{0,119}$/i;
const REASON = "Say why (3 to 300 characters): for example the guide's words on who gives this document.";
const Body_ = z.strictObject({
  roles: z.array(z.string().min(1).max(64), { message: "Send \"roles\": the roles in order (an empty list clears them)." }).max(20),
  // Break M1, m4: a character that cannot be stored is refused; invisible ones do not count towards the 3.
  reason: z.string({ message: REASON }).refine((x) => !UNSTORABLE.test(x), "The reason has a character that cannot be stored (a control character or half of an emoji). Retype it.")
    .transform((x) => x.replace(INVISIBLE, "").trim()).pipe(z.string().min(3, REASON).max(300, REASON)),
});
const same = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);
/** A new version copies the row; a Json column that is null is written as the database's null. */
const copyType = (r: Record<string, unknown>) => { const x = strip(r); for (const k of ["readerProfile", "suppliesAbout", "sets"]) if (x[k] === null) x[k] = Prisma.DbNull; return x; };

async function typeOf(db: Pick<Db, "documentType"> | Tx, workspaceId: string, key: string) {
  const rows = await db.documentType.findMany({ where: { workspaceId, documentTypeKey: key }, orderBy: { version: "desc" } });
  return { rows, current: rows.find((r) => r.status === "DRAFT") ?? rows.find((r) => r.status === "PUBLISHED") ?? null };
}
/** The roles that may be chosen: the workspace's roles on cases, not retired, never one that does not provide. */
async function choicesOf(db: Pick<Db, "personRole"> | Tx, workspaceId: string) {
  const rows = await db.personRole.findMany({ where: { workspaceId, takesPartInCase: true, retiredAt: null }, orderBy: [{ displayOrder: "asc" }, { roleKey: "asc" }] });
  return rows.filter((r) => !NEVER_PROVIDES.has(r.roleKey)).map((r) => ({ key: r.roleKey, label: r.label }));
}
/** Why a list cannot be stored, or null. */
function problemOf(roles: string[], choices: { key: string; label: string }[]): string | null {
  const unknown = roles.filter((k) => !choices.some((c) => c.key === k));
  if (unknown.length) return `${unknown.map((k) => `"${k}"`).join(", ")} ${unknown.length === 1 ? "is" : "are"} not a role that provides documents. Choose from: ${choices.map((c) => c.label).join(", ")}.`;
  if (new Set(roles).size !== roles.length) return "Each role once: the order says who is named first.";
  return null;
}
export async function openProvidersChange(db: Pick<Db, "libraryChange"> | Tx, workspaceId: string, key: string) {
  return db.libraryChange.findFirst({ where: { workspaceId, kind: PROVIDERS_KIND, key, status: { in: OPEN } }, orderBy: { proposedAt: "desc" } });
}

@Injectable()
export class DocumentProviders {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Workspace) private readonly ws: Workspace, @Inject(Audit) private readonly audit: Audit) {}

  private uses(workspaceId: string, key: string) {
    return this.db.documentRequirement.findMany({ where: { workspaceId, documentTypeKey: key, status: { not: "RETIRED" } }, distinct: ["combinationId"], select: { combinationId: true } }).then((x) => x.length);
  }

  async view(key: string) {
    if (!KEY.test(key)) throw problem(404, "Not in the library", `${key} is not a document type.`);
    const workspaceId = await this.ws.id();
    const { current } = await typeOf(this.db, workspaceId, key);
    if (!current) throw problem(404, "Not in the library", "That document type is not in the shared library (it may have been deleted or reset).");
    const choices = await choicesOf(this.db, workspaceId), label = (k: string) => choices.find((c) => c.key === k)?.label ?? k;
    const o = await openProvidersChange(this.db, workspaceId, key);
    return { key, name: current.name, roles: current.defaultProviderRoles.map((k) => ({ key: k, label: label(k) })), choices, uses: await this.uses(workspaceId, key),
      open: o ? { id: o.id, status: o.status as "WAITING" | "RETURNED" | "APPROVED", by: ACTORS.find((a) => a.id === o.proposedBy)?.name ?? "A person", byId: o.proposedBy, reason: o.reason ?? "", note: o.decisionNote, change: providersView(o) } : null,
      help: "Used only on a line asked once for the application or once for the couple. Nobody under 18 provides; if no one on the case matches, the person the item is for provides it." };
  }

  async propose(actor: Actor, key: string, body: unknown) {
    need(actor, "author"); // the author proposes; a second person approves (P-253)
    if (!KEY.test(key)) throw problem(404, "Not in the library", `${key} is not a document type.`);
    const b = Body_.safeParse(body);
    if (!b.success) throw problem(400, "Choose the roles", b.error.issues[0]?.message ?? REASON);
    const workspaceId = await this.ws.id();
    const { rows, current } = await typeOf(this.db, workspaceId, key);
    if (rows.length) await refuseRetired(this.db, workspaceId, "document_type", [key]); // break m2: a retired type says so (409), not "deleted"
    if (!current) throw problem(404, "Not in the library", "That document type is not in the shared library (it may have been deleted or reset).");
    const choices = await choicesOf(this.db, workspaceId);
    const bad = problemOf(b.data.roles, choices);
    if (bad) throw problem(400, "Not a provider role", bad);
    const before = current.defaultProviderRoles, after = b.data.roles;
    if (same(before, after)) throw problem(409, "Nothing changes", `"${current.name}" already has exactly these provider roles in the library.`);
    const labels: Record<string, string> = Object.fromEntries(choices.map((c) => [c.key, c.label]));
    const uses = await this.uses(workspaceId, key);
    const words = (xs: string[]) => (xs.length ? xs.map((k) => labels[k] ?? k).join(", ") : "not set");
    const c = await this.db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`select pg_advisory_xact_lock(hashtext($1))`, lockKey(workspaceId, key));
      const open = await openProvidersChange(tx, workspaceId, key);
      if (open) throw problem(409, "Already waiting", open.status === "APPROVED" ? `A change of who provides "${current.name}" is approved and waits for the next release. To change it again first, its proposer withdraws it (the roles go back to what they were).` : `A change of who provides "${current.name}" already waits on To review.`);
      return tx.libraryChange.create({ data: { workspaceId, kind: PROVIDERS_KIND, key, label: `${current.name} · provided by ${words(after)} when shared, for every combination`.slice(0, 300), action: PROVIDERS_ACTION, reason: b.data.reason, status: "WAITING", proposedBy: actor.id,
        matches: { document: current.name, before, after, labels, uses } as unknown as Prisma.InputJsonValue } });
    });
    await this.audit.log(workspaceId, actor.id, "proposed", "document type", key, `${actor.name} proposed that "${current.name}" is provided by ${words(after)} when shared, for every combination (was ${words(before)}; used by ${uses}); waits for a second person. Why: ${b.data.reason}`);
    return { id: c.id, status: c.status, label: c.label, change: providersView(c) };
  }
}

/** What the second person compares on To review: before → after, by name, and the reason. */
export function providersView(c: Pick<LibraryChange, "matches" | "reason">) {
  const m = (c.matches ?? {}) as { document?: string; before?: string[]; after?: string[]; labels?: Record<string, string>; uses?: number };
  const name = (k: string) => m.labels?.[k] ?? k;
  return { document: m.document ?? "", before: (m.before ?? []).map(name), after: (m.after ?? []).map(name), uses: m.uses ?? 0, reason: c.reason ?? "" };
}
/** The one line To review and History read. */
export function providersWords(v: ReturnType<typeof providersView>) {
  const list = (xs: string[]) => (xs.length ? xs.join(", then ") : "not set (the person the item is for provides it)");
  return `Who provides ${v.document} when it is asked once for the application or the couple, for every combination: ${list(v.before)} → ${list(v.after)} (used by ${v.uses} combination${v.uses === 1 ? "" : "s"}: at approval it changes each one's draft, and goes out with each one's next release; nobody under 18 provides; Sample until the immigration expert confirms). Reason: ${v.reason}`;
}

/** At approval (lifecycle afterApprove): the type gets a draft version with the roles, checked again first. */
export async function applyProviders(db: Db, audit: Audit, actor: Actor, seen: LibraryChange) {
  const c = await db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`select pg_advisory_xact_lock(hashtext($1))`, lockKey(seen.workspaceId, seen.key));
    const c = await tx.libraryChange.findUnique({ where: { id: seen.id } });
    if (c?.status !== "APPROVED") return null;
    const m = c.matches as { before?: string[]; after?: string[] };
    await lockItem(tx, c.workspaceId, "document_type", [c.key]);
    const { rows, current } = await typeOf(tx, c.workspaceId, c.key);
    if (!current || !m.after) throw problem(409, "Not in the library", "The document type is no longer in the library, so nothing was changed. Return the change.");
    await refuseRetired(tx, c.workspaceId, "document_type", [c.key]);
    const bad = problemOf(m.after, await choicesOf(tx, c.workspaceId));
    if (bad) throw problem(409, "No longer valid", `${bad} Nothing was changed. Return the change; the author proposes it again.`);
    if (!same(current.defaultProviderRoles, m.before ?? [])) throw problem(409, "Changed since", "Who provides this document type changed after it was proposed, so nothing was changed. Return it; the author proposes it again.");
    await revise(tx.documentType, rows, { defaultProviderRoles: m.after }, actor.id, copyType);
    return c;
  }, { timeout: 30_000, maxWait: 10_000 });
  if (!c) throw problem(409, "Changed meanwhile", "This change was withdrawn at the same moment, so nothing was applied. Refresh to see it.");
  await audit.log(c.workspaceId, actor.id, "approved", "document type", c.key, `${actor.name} approved: ${c.label ?? c.key}. Every combination that names it has the roles in its draft now; they go out with each one's next release.`);
}

/** An approved change no release has carried yet is withdrawn by its proposer: the type's draft goes back to the roles it
 *  had (refused when the draft changed since). Called by withdrawChange (library-changes.ts) in its transaction. */
export async function withdrawApprovedProviders(tx: Tx, actor: Actor, c: LibraryChange, why: string) {
  await tx.$executeRawUnsafe(`select pg_advisory_xact_lock(hashtext($1))`, lockKey(c.workspaceId, c.key));
  const now = await tx.libraryChange.findUnique({ where: { id: c.id } });
  if (now?.status !== "APPROVED") throw problem(409, "Already decided", `This change is already ${String(now?.status ?? "gone").toLowerCase()}. Refresh to see it.`);
  const m = c.matches as { before?: string[]; after?: string[] };
  const draft = (await tx.documentType.findMany({ where: { workspaceId: c.workspaceId, documentTypeKey: c.key, status: "DRAFT" }, orderBy: { version: "desc" }, take: 1 }))[0];
  if (!draft || !same(draft.defaultProviderRoles, m.after ?? [])) throw problem(409, "Changed since", "Who provides this document type changed after this was approved, so nothing was withdrawn. Refresh to see it.");
  await tx.documentType.update({ where: { id: draft.id }, data: { defaultProviderRoles: m.before ?? [], updatedBy: actor.id } });
  const note = `${c.decisionNote ? `Approved: ${c.decisionNote.replace(/\.$/, "")}. ` : ""}Withdrawn by ${actor.name}: ${why}`.slice(0, 300);
  const done = await tx.libraryChange.updateMany({ where: { id: c.id, status: "APPROVED" }, data: { status: "WITHDRAWN", decisionNote: note } });
  if (!done.count) throw problem(409, "Already decided", "Someone released or withdrew this at the same moment. Refresh to see it.");
  await tx.auditEvent.create({ data: { workspaceId: c.workspaceId, actor: actor.id, action: "withdrawn", entity: "document type", entityKey: c.key, summary: `${actor.name} withdrew the approved change "${c.label ?? c.key}"; its provider roles went back to what they were. Why: ${why}`.slice(0, 600), detail: { change: c.id } } });
}

/** At a release (publishLibraryChanges): an approved change whose type the release published with these roles is released. */
export async function releaseProviders(tx: Tx, workspaceId: string, pack: number) {
  const out: { kind: string; key: string; label: string; action: string }[] = [];
  for (const c of await tx.libraryChange.findMany({ where: { workspaceId, kind: PROVIDERS_KIND, status: "APPROVED" } })) {
    if (await tx.documentType.count({ where: { workspaceId, documentTypeKey: c.key, status: "DRAFT" } })) continue;
    const pub = (await tx.documentType.findMany({ where: { workspaceId, documentTypeKey: c.key, status: "PUBLISHED" }, orderBy: { version: "desc" }, take: 1 }))[0];
    if (!pub || !same(pub.defaultProviderRoles, (c.matches as { after?: string[] }).after ?? [])) continue;
    await tx.libraryChange.update({ where: { id: c.id }, data: { status: "RELEASED", releasedIn: pack } });
    out.push({ kind: c.kind, key: c.key, label: c.label ?? c.key, action: c.action });
  }
  return out;
}

@Controller("api/library/document-types")
export class DocumentProvidersController {
  constructor(@Inject(DocumentProviders) private readonly s: DocumentProviders) {}
  @Get(":key/providers") view(@Headers("x-actor") a: H, @Param("key") key: string) { readerOf(a); return this.s.view(key); }
  @Post(":key/providers") propose(@Headers("x-actor") a: H, @Param("key") key: string, @Body() b: unknown) { return this.s.propose(actorOf(a), key, b); }
}
