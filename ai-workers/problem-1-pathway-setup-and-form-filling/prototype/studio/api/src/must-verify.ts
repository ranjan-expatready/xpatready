// C7.9 (row B142 = L-SA8; P-242, P-237; SA-1B-1 rule 9, SA-1B-261 rule 7): "Must verify before filing", a yes/no flag
// on a library field. Only the content team sets it, with the immigration expert (SA-1B-1 r9): the author proposes it on
// the field with a reason, and the immigration expert (the "sme" duty, never the proposer) approves it on To review; at
// approval the field gets a draft version with the flag, published with the next release that carries it (the path of
// C4.5's "facts a document supplies"). On a case, a flagged fact that a form writes from a client-given value no one on
// staff has checked raises a CRITICAL warning on Ready to file, passable with a reason, never a block
// (engine/runtime/must-verify.ts). Sample until the immigration expert confirms which fields. No AI (US$0).
import { Body, Controller, Get, Headers, HttpException, HttpStatus, Inject, Injectable, Param, Post } from "@nestjs/common";
import { Prisma, type LibraryChange } from "@prisma/client";
import { problemFromZod } from "../../contracts/programs.ts";
import { MUST_VERIFY_ACTION, MUST_VERIFY_KIND, MustVerifyBody } from "../../contracts/must-verify.ts";
import { ACTORS, actorOf, Audit, Db, need, revise, strip, Workspace, type Actor } from "./core.ts";
import { lockItem, refuseRetired } from "./library-items.ts";

type H = string | undefined;
const OPEN = ["WAITING", "RETURNED", "APPROVED"];
const problem = (status: number, title: string, detail: string) =>
  new HttpException({ type: `https://expatready.local/problems/${title.toLowerCase().replace(/[^a-z]+/g, "-")}`, title, status, detail }, status);
const lockKey = (workspaceId: string, key: string) => `${MUST_VERIFY_KIND}:${workspaceId}:${key}`;
const nameOf = (f: { canonicalFieldKey: string; meaning: string | null; label: string | null }) => (f.label ?? f.meaning ?? f.canonicalFieldKey).trim().replace(/\.$/, "");
/** The copy of a field row for a new version (a null Json column is the database's null). */
const copyField = (r: Record<string, unknown>) => strip(r);

/** The newest version of a field that still counts (a draft, else the newest published). */
async function fieldOf(db: Pick<Db, "canonicalField">, workspaceId: string, key: string) {
  const rows = await db.canonicalField.findMany({ where: { workspaceId, canonicalFieldKey: key }, orderBy: { version: "desc" } });
  return { rows, current: rows.find((r) => r.status === "DRAFT") ?? rows.find((r) => r.status === "PUBLISHED") ?? null };
}
export async function openMustVerifyChange(db: Pick<Db, "libraryChange">, workspaceId: string, key: string) {
  return db.libraryChange.findFirst({ where: { workspaceId, kind: MUST_VERIFY_KIND, key, status: { in: OPEN } }, orderBy: { proposedAt: "desc" } });
}
/** SA-1B-1 r9: only the immigration expert approves a must-verify change (the content team proposes it). */
export function refuseNotExpert(actor: Actor, c: Pick<LibraryChange, "kind">) {
  if (c.kind === MUST_VERIFY_KIND && !(actor.duties as readonly string[]).includes("sme"))
    throw problem(403, "The immigration expert decides", `${actor.name} (simulated) does not hold the immigration expert's duty: only the immigration expert approves or returns "must verify before filing".`);
}

@Injectable()
export class MustVerify {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Audit) private readonly audit: Audit, @Inject(Workspace) private readonly ws: Workspace) {}

  async view(key: string) {
    const workspaceId = await this.ws.id();
    const { current } = await fieldOf(this.db, workspaceId, key);
    if (!current) throw problem(404, "Not in the library", "That field is not in the shared library.");
    const o = await openMustVerifyChange(this.db, workspaceId, key);
    return { key, name: nameOf(current), on: current.mustVerifyBeforeFiling,
      open: o ? { id: o.id, status: o.status as "WAITING" | "RETURNED" | "APPROVED", by: ACTORS.find((a) => a.id === o.proposedBy)?.name ?? "A person", byId: o.proposedBy, reason: o.reason ?? "", note: o.decisionNote, on: (o.matches as { after?: boolean })?.after === true } : null,
      rule: "A client-given value no one on staff has checked raises a CRITICAL warning on Ready to file, passable with a reason; a staff entry, a staff confirmation or \"Confirm & use\" on its document counts as verified. Set by the content team with the immigration expert (SA-1B-1 rule 9)." };
  }

  async propose(actor: Actor, key: string, body: unknown) {
    need(actor, "author");
    const parsed = MustVerifyBody.safeParse(body);
    if (!parsed.success) throw new HttpException(problemFromZod(parsed.error), HttpStatus.BAD_REQUEST);
    const workspaceId = await this.ws.id();
    const { current } = await fieldOf(this.db, workspaceId, key);
    if (!current) throw problem(404, "Not in the library", "That field is not in the shared library.");
    await refuseRetired(this.db, workspaceId, "field", [key]);
    if (current.mergedIntoKey) throw problem(409, "Merged", `"${nameOf(current)}" was merged into ${current.mergedIntoKey}: set the flag there.`);
    const on = parsed.data.on, name = nameOf(current);
    if (current.mustVerifyBeforeFiling === on) throw problem(409, "Nothing changes", `"${name}" is already ${on ? "marked" : "not marked"} "must verify before filing".`);
    const c = await this.db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`select pg_advisory_xact_lock(hashtext($1))`, lockKey(workspaceId, key));
      const open = await openMustVerifyChange(tx, workspaceId, key);
      // Review M2 on #1282: the words say what the open change is and what to do (a returned one is withdrawn first).
      if (open) throw problem(409, open.status === "RETURNED" ? "Returned" : "Already waiting", open.status === "RETURNED" ? `A change of "must verify before filing" for "${name}" was returned${open.decisionNote ? ` ("${open.decisionNote}")` : ""}. Its proposer withdraws it first (To review › the change › Withdraw it), then proposes it again.` : `A change of "must verify before filing" for "${name}" already ${open.status === "APPROVED" ? "is approved and waits for the next release; to change it before then, its proposer withdraws it" : "waits for the immigration expert on To review"}.`);
      return tx.libraryChange.create({ data: { workspaceId, kind: MUST_VERIFY_KIND, key, label: `${name} · ${on ? "must verify before filing" : "no longer must verify before filing"}, for every combination`.slice(0, 300), action: MUST_VERIFY_ACTION, reason: parsed.data.reason, status: "WAITING", proposedBy: actor.id,
        matches: { field: name, before: current.mustVerifyBeforeFiling, after: on } as unknown as Prisma.InputJsonValue } });
    });
    await this.audit.log(workspaceId, actor.id, "proposed", "field", key, `${actor.name} proposed that "${name}" ${on ? "must be verified before filing" : "no longer must be verified before filing"}, for every combination; waits for the immigration expert. Why: ${parsed.data.reason}`);
    return { id: c.id, status: c.status, label: c.label, must_verify: mustVerifyView(c) };
  }
}

/** What the immigration expert reads on To review. */
export function mustVerifyView(c: Pick<LibraryChange, "matches" | "reason">) {
  const m = (c.matches ?? {}) as { field?: string; before?: boolean; after?: boolean };
  return { field: m.field ?? "", before: m.before === true, after: m.after === true, reason: c.reason ?? "" };
}
export function mustVerifyWords(v: ReturnType<typeof mustVerifyView>) {
  return `"${v.field}", for every combination: ${v.before ? "must verify before filing" : "not marked"} → ${v.after ? "must verify before filing (a client-given value no one on staff checked raises a CRITICAL warning on Ready to file, passable with a reason)" : "not marked"}. The immigration expert approves; it goes out with each combination's next release. Reason: ${v.reason}`;
}

/** At approval (lifecycle afterApprove): the field gets a draft version with the flag. */
export async function applyMustVerify(db: Db, audit: Audit, actor: Actor, seen: LibraryChange) {
  const c = await db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`select pg_advisory_xact_lock(hashtext($1))`, lockKey(seen.workspaceId, seen.key));
    const c = await tx.libraryChange.findUnique({ where: { id: seen.id } });
    if (c?.status !== "APPROVED") return null;
    await lockItem(tx, c.workspaceId, "field", [c.key]);
    await refuseRetired(tx, c.workspaceId, "field", [c.key]);
    const m = c.matches as { before?: boolean; after?: boolean };
    const { rows, current } = await fieldOf(tx, c.workspaceId, c.key);
    if (!current) throw problem(409, "Not in the library", "The field is no longer in the library, so nothing was changed. Return the change.");
    if (current.mustVerifyBeforeFiling !== (m.before === true)) throw problem(409, "Changed since", "The field's flag changed after this was proposed, so nothing was changed. Return it; the author proposes it again.");
    await revise(tx.canonicalField, rows, { mustVerifyBeforeFiling: m.after === true }, actor.id, copyField);
    return c;
  }, { timeout: 30_000, maxWait: 10_000 });
  if (!c) throw problem(409, "Changed meanwhile", "This change was withdrawn at the same moment, so nothing was applied. Refresh to see it.");
  await audit.log(c.workspaceId, actor.id, "approved", "field", c.key, `${actor.name} approved: ${c.label ?? c.key}. Every combination that asks it has it in its draft now; it goes out with each one's next release.`);
}

/** An approved change no release carried yet, withdrawn by its proposer: the field's draft goes back. */
export async function withdrawApprovedMustVerify(tx: Prisma.TransactionClient, actor: Actor, c: LibraryChange, why: string) {
  await tx.$executeRawUnsafe(`select pg_advisory_xact_lock(hashtext($1))`, lockKey(c.workspaceId, c.key));
  const now = await tx.libraryChange.findUnique({ where: { id: c.id } });
  if (now?.status !== "APPROVED") throw problem(409, "Already decided", `This change is already ${String(now?.status ?? "gone").toLowerCase()}. Refresh to see it.`);
  const m = c.matches as { before?: boolean; after?: boolean };
  const draft = (await tx.canonicalField.findMany({ where: { workspaceId: c.workspaceId, canonicalFieldKey: c.key, status: "DRAFT" }, orderBy: { version: "desc" }, take: 1 }))[0];
  if (!draft || draft.mustVerifyBeforeFiling !== (m.after === true)) throw problem(409, "Changed since", "The field's flag changed after this was approved, so nothing was withdrawn. Refresh to see it.");
  await tx.canonicalField.update({ where: { id: draft.id }, data: { mustVerifyBeforeFiling: m.before === true, updatedBy: actor.id } });
  const note = `${c.decisionNote ? `Approved: ${c.decisionNote.replace(/\.$/, "")}. ` : ""}Withdrawn by ${actor.name}: ${why}`.slice(0, 300);
  const done = await tx.libraryChange.updateMany({ where: { id: c.id, status: "APPROVED" }, data: { status: "WITHDRAWN", decisionNote: note } });
  if (!done.count) throw problem(409, "Already decided", "Someone released or withdrew this at the same moment. Refresh to see it.");
  await tx.auditEvent.create({ data: { workspaceId: c.workspaceId, actor: actor.id, action: "withdrawn", entity: "field", entityKey: c.key, summary: `${actor.name} withdrew the approved change "${c.label ?? c.key}"; the flag went back. Why: ${why}`.slice(0, 600), detail: { change: c.id } } });
}

/** At a release: an approved change whose field the release published with the flag is released. */
export async function releaseMustVerify(tx: Prisma.TransactionClient, workspaceId: string, pack: number) {
  const out: { kind: string; key: string; label: string; action: string }[] = [];
  for (const c of await tx.libraryChange.findMany({ where: { workspaceId, kind: MUST_VERIFY_KIND, status: "APPROVED" } })) {
    if (await tx.canonicalField.count({ where: { workspaceId, canonicalFieldKey: c.key, status: "DRAFT" } })) continue;
    const pub = (await tx.canonicalField.findMany({ where: { workspaceId, canonicalFieldKey: c.key, status: "PUBLISHED" }, orderBy: { version: "desc" }, take: 1 }))[0];
    if (!pub || pub.mustVerifyBeforeFiling !== ((c.matches as { after?: boolean }).after === true)) continue;
    await tx.libraryChange.update({ where: { id: c.id }, data: { status: "RELEASED", releasedIn: pack } });
    out.push({ kind: c.kind, key: c.key, label: c.label ?? c.key, action: c.action });
  }
  return out;
}

@Controller("api")
export class MustVerifyController {
  constructor(@Inject(MustVerify) private readonly s: MustVerify) {}
  @Get("library/fields/:key/must-verify") view(@Param("key") key: string) { return this.s.view(key); }
  @Post("library/fields/:key/must-verify") propose(@Headers("x-actor") a: H, @Param("key") key: string, @Body() b: unknown) { return this.s.propose(actorOf(a), key, b); }
}
