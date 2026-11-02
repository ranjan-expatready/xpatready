// G-CORE B2 (P-253, P-266, P-96; concept screens/G-CORE-guarded-change/concept.md v2 BR-1, BR-4, BR-5, BR-6): a rename
// of a shared field or a section goes through the change-set door. The fixed rules check runs first (ChangeSets.guard:
// any problem refuses in words, a stale `expected` answers "look again"); its tier then decides:
//   direct: the rename applies now as a draft version, logged, with its before-image kept for "Undo rename";
//   second person (a released combination uses it, P-266): a WAITING library change (action RENAME) on To review; the
//   approver's click checks everything again (the name, the rules) and applies it then; nothing changes before.
// "Undo rename" is itself a rename through the same door (so a name taken since is refused by R3, and a roll-back of a
// released item waits for a second person too); a newer change to the item since refuses it in words. Releases are
// never touched (L2). Merge and AI-landing roll-back are M3 (P-266 Q2).
import { Body, Controller, Get, Headers, HttpException, HttpStatus, Inject, Injectable, Param, Post, Res, type OnModuleInit } from "@nestjs/common";
import type { Response } from "express";
import type { LibraryChange, Prisma } from "@prisma/client";
import { z } from "zod";
import type { ChangeItem, MadeBy } from "../../contracts/change-set.ts";
import { problemFromZod } from "../../contracts/programs.ts";
import { ChangeSets } from "./change-sets.ts";
import { ACTORS, actorOf, Audit, Db, need, readerOf, revise, strip, Workspace, type Actor } from "./core.ts";
import { APPROVAL_HOOKS } from "./lifecycle.ts";

type H = string | undefined;
type Kind = "field" | "section";
type Tx = Prisma.TransactionClient;
const problem = (status: number, title: string, detail: string) =>
  new HttpException({ type: `https://expatready.local/problems/${title.toLowerCase().replace(/[^a-z]+/g, "-")}`, title, status, detail }, status);
const nameOf = (id: string | null | undefined) => ACTORS.find((a) => a.id === id)?.name ?? "another person";
const NOUN: Record<Kind, string> = { field: "field", section: "section" };

/** What a rename puts back on a roll-back: the item's own name columns, exactly as they were. */
type Restore = { label: string | null; labelChecked: boolean } | { title: string };
/** A rename's before-image (change_set.before, BR-6): the name before and the row the rename wrote. */
export type RenameImage = { before: { shown: string; restore: Restore; version: number }; after: { id: string; version: number; name: string; at: string } };
type Current = { rows: { id: string; version: number; status: string; updatedAt: Date }[]; newest: { id: string; version: number; status: string; updatedAt: Date; mergedIntoKey?: string | null }; group: string; shown: string; restore: Restore };
export type RenameResult = { key: string; kind: Kind; name: string; applied: boolean; status: string; version: number | null; tier: string; words: string; change_set: string; change_id: string | null };

@Injectable()
export class Renames implements OnModuleInit {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Workspace) private readonly ws: Workspace, @Inject(Audit) private readonly audit: Audit, @Inject(ChangeSets) private readonly sets: ChangeSets) {}

  /** The approval of a waiting rename is checked and applied here (lifecycle.ts asks the hook; no import cycle). */
  onModuleInit() { APPROVAL_HOOKS.set("RENAME", { check: (c) => this.recheck(c).then(() => undefined), apply: (actor, c) => this.applyApproved(actor, c) }); }

  /** The item's versions, its name as shown and what a roll-back would put back; null when there is no such item. */
  private async current(db: Db | Tx, kind: Kind, workspaceId: string, key: string): Promise<Current | null> {
    if (kind === "field") {
      const rows = await db.canonicalField.findMany({ where: { workspaceId, canonicalFieldKey: key }, orderBy: { version: "desc" } });
      const n = rows[0]; if (!n) return null;
      return { rows, newest: n, group: n.groupKey ?? key.split(".")[0], shown: (n.labelChecked && n.label) || key, restore: { label: n.label, labelChecked: n.labelChecked } };
    }
    const rows = await db.logicalSection.findMany({ where: { workspaceId, sectionKey: key }, orderBy: { version: "desc" } });
    const n = rows[0]; if (!n) return null;
    return { rows, newest: n, group: "", shown: n.title, restore: { title: n.title } };
  }

  /** C3.15 through the door (BR-1). The caller has checked the duty, the body, and that the item exists and is active. */
  async rename(actor: Actor, kind: Kind, key: string, name: string, expected?: string | null, undo?: { of: string; restore: Restore }): Promise<RenameResult> {
    const workspaceId = await this.ws.id();
    const cur = await this.current(this.db, kind, workspaceId, key);
    if (!cur) throw problem(404, "Not found", `${key} is not in the shared library.`);
    // One rename of an item waits at a time: the second person decides it first (as one pending merge per field).
    const pending = await this.db.libraryChange.findFirst({ where: { workspaceId, kind, key, action: "RENAME", status: "WAITING" } });
    if (pending) throw problem(409, "Already waiting", `A rename of "${cur.shown}" to "${pending.label}" is already waiting for a second person on To review. It is decided or withdrawn first.`);
    const items: ChangeItem[] = [{ action: "rename", kind, key, name }];
    const r = await this.sets.guard(items, "person", expected, workspaceId);
    const restore = undo?.restore ?? (kind === "field" ? { label: name, labelChecked: true } : { title: name });
    if (r.tier.tier === "direct") {
      const { row, set } = await this.db.$transaction(async (tx) => {
        const row = await this.write(tx, kind, cur, restore, actor.id);
        const image: RenameImage = { before: { shown: cur.shown, restore: cur.restore, version: cur.newest.version }, after: { id: row.id, version: row.version, name, at: row.updatedAt.toISOString() } };
        const set = await this.sets.record(tx, workspaceId, actor.id, items, "person", r, "applied", { before: image as unknown as Prisma.InputJsonValue });
        if (undo) await this.rolledBack(tx, undo.of, set.id);
        return { row, set };
      }).catch((e) => { if (/canonical_field_name_unique|Unique constraint/.test(String(e))) throw problem(409, "Same name", `"${name}" is already a field's name in this group.`); throw e; });
      const what = kind === "field" ? `renamed field ${key} from "${cur.shown}" to "${name}"` : `renamed section "${cur.shown}" to "${name}"`;
      await this.audit.log(workspaceId, actor.id, "renamed", kind, key, `${actor.name} ${undo ? "undid a rename: " : ""}${what} (draft v${row.version})`, { change_set: set.id });
      return { key, kind, name, applied: true, status: row.status, version: row.version, tier: "direct", words: r.tier.words, change_set: set.id, change_id: null };
    }
    // P-266: a released combination uses it, so a second person approves it on To review; nothing changes now. One open
    // change per item (library_change_one_open): another change still open on it is decided first, said in words.
    const open = await this.db.libraryChange.findFirst({ where: { workspaceId, kind, key, status: { in: ["WAITING", "APPROVED"] } } });
    if (open) throw problem(409, "Already waiting", `"${cur.shown}" has another change open on To review (${open.action.toLowerCase().replace(/_/g, " ")}, ${open.status.toLowerCase()}): it is decided first.`);
    const { change, set } = await this.db.$transaction(async (tx) => {
      const change = await tx.libraryChange.create({ data: { workspaceId, kind, key, label: name, action: "RENAME", status: "WAITING", proposedBy: actor.id,
        reason: undo ? `Undo the rename to "${cur.shown}": back to "${name}".` : `Rename "${cur.shown}" to "${name}".`,
        matches: { before: cur.shown, after: name, restore, undo_of: undo?.of ?? null } as Prisma.InputJsonValue } });
      const set = await this.sets.record(tx, workspaceId, actor.id, items, "person", r, "waiting", { libraryChangeId: change.id });
      return { change, set };
    });
    await this.audit.log(workspaceId, actor.id, "proposed", kind, key, `${actor.name} proposed ${undo ? "undoing a rename: " : ""}renaming ${NOUN[kind]} "${cur.shown}" to "${name}": a released combination uses it, so it waits for a second person`, { change_set: set.id, change: change.id });
    return { key, kind, name: cur.shown, applied: false, status: "WAITING", version: null, tier: "second_person", words: r.tier.words, change_set: set.id, change_id: change.id };
  }

  /** The rename's own write: a draft version (an existing draft row is updated in place, as every library edit). */
  private async write(tx: Tx, kind: Kind, cur: Current, restore: Restore, by: string) {
    if (kind === "field") return (await revise(tx.canonicalField, cur.rows, { ...restore, groupKey: cur.group }, by, strip)).row as { id: string; version: number; status: string; updatedAt: Date };
    return (await revise(tx.logicalSection, cur.rows, restore, by, strip)).row as { id: string; version: number; status: string; updatedAt: Date };
  }
  private async rolledBack(tx: Tx, of: string, by: string) {
    const done = await tx.changeSet.updateMany({ where: { id: of, status: "applied" }, data: { status: "rolled_back", rolledBackBy: by } });
    if (!done.count) throw problem(409, "Already rolled back", "This rename was rolled back at the same moment. Refresh to see it.");
  }

  /** BR-2 at approval: the item is still as it was when proposed, still active, and the rules check passes again. */
  private async recheck(c: LibraryChange) {
    const kind = c.kind as Kind, m = (c.matches ?? {}) as { before?: string; restore?: Restore; undo_of?: string | null };
    const cur = await this.current(this.db, kind, c.workspaceId, c.key);
    if (!cur) throw problem(409, "No longer there", `${c.key} is no longer in the shared library, so nothing was changed. Return this rename.`);
    if (cur.newest.status === "RETIRED" || cur.newest.mergedIntoKey) throw problem(409, "No longer active", `"${cur.shown}" was ${cur.newest.mergedIntoKey ? "merged" : "retired"} after this rename was proposed, so nothing was changed. Return this rename.`);
    if (cur.shown !== m.before) throw problem(409, "Changed since", `The name changed after this rename was proposed ("${m.before}" is now "${cur.shown}"), so nothing was changed. Return this rename; rename it again if it is still needed.`);
    const set = await this.db.changeSet.findFirst({ where: { libraryChangeId: c.id } });
    const items: ChangeItem[] = [{ action: "rename", kind, key: c.key, name: c.label ?? "" }];
    const r = await this.sets.guard(items, (set?.madeBy ?? "person") as MadeBy, null, c.workspaceId);
    return { cur, set, items, r, m };
  }

  /** At approval (lifecycle afterApprove, after decideChange's second-person guards): checked again, then applied. */
  async applyApproved(actor: Actor, c: LibraryChange) {
    const { cur, set, items, r, m } = await this.recheck(c);
    const kind = c.kind as Kind, name = c.label ?? "";
    const restore = m.restore ?? (kind === "field" ? { label: name, labelChecked: true } : { title: name });
    const row = await this.db.$transaction(async (tx) => {
      const row = await this.write(tx, kind, cur, restore, actor.id);
      const image: RenameImage = { before: { shown: cur.shown, restore: cur.restore, version: cur.newest.version }, after: { id: row.id, version: row.version, name, at: row.updatedAt.toISOString() } };
      if (set) await tx.changeSet.update({ where: { id: set.id }, data: { status: "applied", before: image as unknown as Prisma.InputJsonValue, fingerprint: r.fingerprint } });
      else await this.sets.record(tx, c.workspaceId, c.proposedBy, items, "person", r, "applied", { libraryChangeId: c.id, before: image as unknown as Prisma.InputJsonValue });
      if (m.undo_of && set) await this.rolledBack(tx, m.undo_of, set.id);
      // Applied at approval, as an approved delete or a form's retire (RELEASED, with no pack): the item's one open change
      // (library_change_one_open) is free again. Its draft version goes out with the next release that carries it.
      await tx.libraryChange.update({ where: { id: c.id }, data: { status: "RELEASED", decisionNote: c.decisionNote ?? `Applied at approval as a draft version (v${row.version}); it goes out with the next release.` } });
      return row;
    }).catch((e) => { if (/canonical_field_name_unique|Unique constraint/.test(String(e))) throw problem(409, "Same name", `"${name}" is already a field's name in this group, so nothing was changed. Return this rename.`); throw e; });
    await this.audit.log(c.workspaceId, actor.id, "renamed", kind, c.key, `${actor.name} approved renaming ${NOUN[kind]} ${kind === "field" ? `${c.key} ` : ""}from "${cur.shown}" to "${name}" (proposed by ${nameOf(c.proposedBy)}; draft v${row.version})`, { change_set: set?.id ?? null });
  }

  /** BR-6: "Undo rename" of an applied rename, through the door (R1–R8 and the tier), by an author. */
  async undo(actor: Actor, id: string, expected?: string | null): Promise<RenameResult> {
    need(actor, "author");
    const set = await this.db.changeSet.findUnique({ where: { id } }).catch(() => null);
    if (!set) throw problem(404, "Not found", "This change does not exist (the demo may have been reset).");
    const items = set.items as unknown as ChangeItem[];
    const it = items.length === 1 && items[0].action === "rename" ? items[0] : null;
    if (!it) throw problem(409, "Not a rename", "Only a rename is rolled back here. A merge or an AI landing is not rolled back yet.");
    if (set.status === "rolled_back") throw problem(409, "Already rolled back", "This rename was already rolled back.");
    if (set.status !== "applied") throw problem(409, "Not applied", "This rename has not been applied: a rename waiting for a second person is withdrawn on To review, not rolled back.");
    const img = set.before as unknown as RenameImage | null;
    if (!img?.before || !img.after) throw problem(409, "Nothing to put back", "This rename kept no earlier name, so it is not rolled back.");
    const kind = it.kind as Kind;
    const cur = await this.current(this.db, kind, set.workspaceId, it.key);
    if (!cur) throw problem(404, "Not found", `${it.key} is no longer in the shared library.`);
    if (cur.newest.status === "RETIRED" || cur.newest.mergedIntoKey) throw problem(409, "No longer active", `"${cur.shown}" was ${cur.newest.mergedIntoKey ? "merged" : "retired"} since, so the rename is not rolled back.`);
    // A newer rename since (or a newer version of the item) is never undone silently. A release of the renamed draft is
    // not a change of it: the roll-back then makes a new draft version.
    if (cur.newest.id !== img.after.id || cur.shown !== img.after.name)
      throw problem(409, "Changed since", `"${img.after.name}" was changed again after this rename (it is now "${cur.shown}", version ${cur.newest.version}), so the rename is not rolled back. Rename it from its page instead.`);
    return this.rename(actor, kind, it.key, img.before.shown, expected, { of: set.id, restore: img.before.restore });
  }

  /** The newest applied rename of one item, for "Undo rename" on its page; null when there is none. */
  async latest(kind: Kind, key: string) {
    const workspaceId = await this.ws.id();
    const sets = await this.db.changeSet.findMany({ where: { workspaceId, status: { in: ["applied", "waiting"] } }, orderBy: { createdAt: "desc" }, take: 500 });
    const set = sets.find((s) => { const its = s.items as unknown as ChangeItem[]; return its.length === 1 && its[0].action === "rename" && its[0].kind === kind && its[0].key === key; });
    if (!set) return null;
    const img = set.before as unknown as RenameImage | null;
    return { id: set.id, status: set.status, made_by: set.madeBy, by: nameOf(set.actor), at: set.createdAt, before: img?.before.shown ?? null, after: img?.after.name ?? (set.items as unknown as { name: string }[])[0].name, change_id: set.libraryChangeId };
  }
}

/** 200 when the rename applied now, 202 when it waits for a second person (nothing changed yet). */
export const renameAnswer = (res: Response, r: RenameResult) => { res.status(r.applied ? HttpStatus.OK : HttpStatus.ACCEPTED); return r; };
const UndoBody = z.object({ expected: z.string().max(64).nullish() }).strict();
const KIND = z.enum(["field", "section"]);

@Controller("api")
export class RenamesController {
  constructor(@Inject(Renames) private readonly r: Renames) {}
  /** BR-6: roll back a rename (a new change set through the same door). 200 applied, 202 waiting for a second person. */
  @Post("change-sets/:id/undo-rename") async undo(@Headers("x-actor") a: H, @Param("id") id: string, @Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const b = UndoBody.safeParse(body ?? {});
    if (!b.success) throw new HttpException(problemFromZod(b.error), HttpStatus.BAD_REQUEST);
    return renameAnswer(res, await this.r.undo(actorOf(a), id, b.data.expected));
  }
  @Get("change-sets/renames/:kind/:key") latest(@Headers("x-actor") a: H, @Param("kind") kind: string, @Param("key") key: string) {
    readerOf(a);
    const k = KIND.safeParse(kind);
    if (!k.success) throw problem(404, "Not found", "Only fields and sections are renamed.");
    return this.r.latest(k.data, key);
  }
}
