// Screen 02 slice 2, board view 7 (P-32, P-38, C9.1, BR-12): a new edition of a form already in the library is compared
// with the library's edition form field by form field, with no AI. Unchanged form fields carry their map; new and
// reworded ones are left for a person (K1: mapped, not a fact, or filled by hand). The review lists the shared fields
// and every combination the change touches; nothing changes until a person accepts, and nothing reaches firms until
// release. Open cases stay on the release they started on.
import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { manifest } from "../../engine/import.ts";
import { newestEdition } from "../../engine/programs.ts";
import { effective } from "../../engine/snapshot.ts";
import { ACTORS, Audit, Db, fail, need, PY, ROOT, SOLUTION, STUDIO, Workspace, type Actor } from "./core.ts";

const run = promisify(execFile);
type InvField = { data_path?: string; caption?: string; section?: string };
type Row = { dataPath: string; caption: string; section: string | null; change: "unchanged" | "reworded" | "new" | "removed"; was?: string; field?: string | null; outcome?: string };
const norm = (s: string | undefined) => (s ?? "").replace(/\s+/g, " ").trim().toLowerCase();

@Injectable()
export class Impact {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Workspace) private readonly ws: Workspace, @Inject(Audit) private readonly audit: Audit) {}

  /** The comparison and its impact for one held new edition (no AI, US$0). */
  async review(id: string) {
    const { h, item, def, old } = await this.held(id);
    const inventory = await this.readInventory(item.file);
    const fresh = (JSON.parse(readFileSync(join(SOLUTION, inventory), "utf8")).fields as InvField[]).filter((f) => f.data_path);
    // The library edition's form fields: its stored inventory, or read from its official file (an edition added through
    // the intake has none stored yet).
    const oldInventory = old?.inventoryFile ?? (old?.officialFile ? await this.readInventory(old.officialFile).catch(() => null) : null);
    const oldFields = oldInventory ? (JSON.parse(readFileSync(join(SOLUTION, oldInventory), "utf8")).fields as InvField[]).filter((f) => f.data_path) : [];
    const oldMaps = old ? new Map(effective(await this.db.formFieldMap.findMany({ where: { formEditionId: old.id } }), (m) => m.dataPath, "draft").map((m) => [m.dataPath, m])) : new Map();
    const before = new Map(oldFields.map((f) => [f.data_path!, f]));
    const rows: Row[] = fresh.map((f) => {
      const o = before.get(f.data_path!), m = oldMaps.get(f.data_path!);
      const change = !o ? "new" : norm(o.caption) === norm(f.caption) ? "unchanged" : "reworded";
      return { dataPath: f.data_path!, caption: (f.caption || f.data_path!).slice(0, 300), section: f.section ?? null, change, ...(change === "reworded" ? { was: (o!.caption ?? "").slice(0, 300) } : {}), field: m?.canonicalFieldKey ?? null, outcome: m?.outcome };
    });
    const now = new Set(fresh.map((f) => f.data_path!));
    for (const o of oldFields) if (!now.has(o.data_path!)) { const m = oldMaps.get(o.data_path!); rows.push({ dataPath: o.data_path!, caption: (o.caption || o.data_path!).slice(0, 300), section: o.section ?? null, change: "removed", field: m?.canonicalFieldKey ?? null, outcome: m?.outcome }); }
    const count = (c: Row["change"]) => rows.filter((r) => r.change === c).length;
    // Impact on the library: the shared fields read by form fields that were removed or reworded.
    const touchedKeys = [...new Set(rows.filter((r) => (r.change === "removed" || r.change === "reworded") && r.field).map((r) => r.field!))];
    const fields = touchedKeys.length ? await this.db.canonicalField.findMany({ where: { workspaceId: h.workspaceId, canonicalFieldKey: { in: touchedKeys } }, orderBy: { version: "desc" }, distinct: ["canonicalFieldKey"], select: { canonicalFieldKey: true, label: true, meaning: true } }) : [];
    const uses = await this.db.combinationForm.findMany({ where: { workspaceId: h.workspaceId, govFormDefId: def.id, status: { not: "RETIRED" } }, include: { combination: { select: { id: true, label: true } } } });
    const combos = [...new Map(uses.map((u) => [u.combination.id, u.combination])).values()];
    const cases = combos.length ? await this.db.case.count({ where: { combinationId: { in: combos.map((c) => c.id) } } }).catch(() => 0) : 0;
    return {
      id: h.id, form: def.formKey, title: def.displayName, edition: h.editionLabel, library_edition: old?.editionLabel ?? null, uploaded_by: ACTORS.find((a) => a.id === h.createdBy)?.name ?? "A person", at: h.createdAt,
      counts: { form_fields: fresh.length, unchanged: count("unchanged"), reworded: count("reworded"), new: count("new"), removed: count("removed") },
      rows: rows.filter((r) => r.change !== "unchanged").concat(rows.filter((r) => r.change === "unchanged")),
      library: fields.map((f) => ({ key: f.canonicalFieldKey, label: f.label ?? f.canonicalFieldKey, meaning: f.meaning, form_fields: rows.filter((r) => r.field === f.canonicalFieldKey && r.change !== "unchanged").length })),
      combinations: combos.map((c) => ({ id: c.id, label: c.label })), open_cases: cases,
      ai: { used: false, cost_usd: 0, note: "Compared form field by form field without AI. New and reworded form fields are left for a person: map each, or mark it not a fact or filled by hand." },
    };
  }

  /** Accept (an author): the new edition joins the library with its unchanged form fields' maps carried as draft rows and
   *  the rest left for a person; every combination using the form shows the change in the shared draft until release. */
  async accept(actor: Actor, id: string, body: { expected?: number }) {
    need(actor, "author");
    const r = await this.review(id);
    if (body.expected !== undefined && body.expected !== r.counts.form_fields) fail("The comparison changed since you opened it. Look at it again, then accept.", HttpStatus.CONFLICT);
    const { h, item, def, old } = await this.held(id);
    const inventory = await this.readInventory(item.file);
    const oldMaps = old ? new Map(effective(await this.db.formFieldMap.findMany({ where: { formEditionId: old.id } }), (m) => m.dataPath, "draft").map((m) => [m.dataPath, m])) : new Map();
    const res = await this.db.$transaction(async (tx) => {
      const claimed = await tx.intakeItem.updateMany({ where: { id, status: "HELD", outcome: "new_edition_held" }, data: { status: "DONE", outcome: "added", reason: `Accepted after impact review by ${actor.name}` } });
      if (!claimed.count) fail("Someone decided this edition at the same moment. Refresh to see it.", HttpStatus.CONFLICT);
      const ed = await tx.formEdition.create({ data: { workspaceId: h.workspaceId, govFormDefId: def.id, editionLabel: h.editionLabel!, officialFile: item.file, sha256: h.sha256, storedPath: h.storedPath || null, inventoryFile: inventory, dataBoundBoxes: r.counts.form_fields } });
      const data: Prisma.FormFieldMapCreateManyInput[] = r.rows.filter((x) => x.change !== "removed").map((x) => {
        const m = x.change === "unchanged" ? oldMaps.get(x.dataPath) : undefined;
        return m ? { workspaceId: h.workspaceId, formEditionId: ed.id, dataPath: x.dataPath, caption: x.caption, heading: x.section, outcome: m.outcome, person: m.person, row: m.row, canonicalFieldKey: m.canonicalFieldKey, transform: m.transform, condition: m.condition, confidence: m.confidence,
          evidenceQuote: `Unchanged from ${old!.editionLabel}`, reason: m.reason, version: 1, status: "DRAFT" as const, origin: "CODE_MATCH" as const, optionMap: m.optionMap === null ? Prisma.DbNull : (m.optionMap as Prisma.InputJsonValue), updatedBy: actor.id }
          : { workspaceId: h.workspaceId, formEditionId: ed.id, dataPath: x.dataPath, caption: x.caption, heading: x.section, outcome: "unresolved", reason: x.change === "reworded" ? `Reworded in ${h.editionLabel}: was "${x.was}"` : `New in ${h.editionLabel}`, version: 1, status: "DRAFT" as const, origin: "CODE_MATCH" as const, updatedBy: actor.id };
      });
      await tx.formFieldMap.createMany({ data });
      return { edition: ed.editionLabel, carried: data.filter((d) => d.outcome !== "unresolved").length, for_a_person: data.filter((d) => d.outcome === "unresolved").length };
    });
    await this.audit.log(h.workspaceId, actor.id, "accepted", "new edition", def.formKey, `${actor.name} accepted ${res.edition} after its impact review: ${res.carried} form fields carried from ${old?.editionLabel ?? "no earlier edition"}, ${res.for_a_person} left for a person; ${r.combinations.length} combinations show the change until release (no AI)`, undefined, h.combinationId ?? undefined);
    return { ...res, combinations: r.combinations };
  }

  private async held(id: string) {
    const h = await this.db.intakeItem.findUnique({ where: { id } }).catch(() => null);
    if (!h) fail("This held edition does not exist (the demo may have been reset).", HttpStatus.NOT_FOUND);
    if (h!.status !== "HELD" || h!.outcome !== "new_edition_held") fail("This file is not a new edition waiting for its impact review.", HttpStatus.CONFLICT);
    const item = manifest().find((i) => i.sha256 === h!.sha256);
    if (!item) fail("Only an approved official file is compared.", HttpStatus.CONFLICT);
    const def = await this.db.govFormDef.findUnique({ where: { workspaceId_formKey: { workspaceId: h!.workspaceId, formKey: h!.code! } }, include: { editions: true } });
    if (!def) fail(`${h!.code} is not in the library.`, HttpStatus.NOT_FOUND);
    const old = newestEdition(def!.editions.filter((e) => e.channel === "PDF")) ?? null;
    return { h: h!, item: item!, def: def!, old };
  }

  private async readInventory(file: string) {
    const { stdout } = await run(PY, ["-I", join(STUDIO, "tools", "read_form.py"), file], { cwd: ROOT, timeout: 120_000 });
    const r = JSON.parse(stdout.trim().split("\n").pop()!);
    if (!r.inventory_file) fail(`The new edition's form fields could not be read: ${r.error ?? r.status}.`, HttpStatus.UNPROCESSABLE_ENTITY);
    return r.inventory_file as string;
  }
}
