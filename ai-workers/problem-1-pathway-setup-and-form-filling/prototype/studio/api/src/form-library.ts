// S4 Form library, slice 1 API (W1-06, P-123, P-116; challenge.md M6, m2, m6): the one lean list with its filters, where a
// form is used, its lifecycle (delete only when unused and never released, otherwise retire; a second person approves,
// through api/src/lifecycle.ts), "Replace with a new edition" checked against canada.ca, and the hand actions on a
// combination's forms list: attach from the library, remove (stays in the library) and Undo of the last change.
// Buttons for these come with S3/S5 (combination) and slice 3 (library page); every action is server-checked here.
import { Body, Controller, Delete, Get, Headers, HttpException, Inject, Injectable, Param, Post, Query } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { manifest } from "../../engine/import.ts";
import { compareEditions, newestEdition } from "../../engine/programs.ts";
import { officialUrl, parseFormPage } from "../../engine/canada.ts";
import { AttachBody, LibraryQuery, LifecycleReasonBody } from "../../contracts/form-library.ts";
import { canadaSource, type CanadaSource } from "./canada.ts";
import { actorOf, Audit, Db, need, Workspace, type Actor } from "./core.ts";
import { Finder } from "./finder.ts";
import { Lifecycle } from "./lifecycle.ts";
import { addFormLine } from "./form-lines.ts";
import { formUses } from "./form-uses.ts";
import { Studio } from "./studio.ts";

const problem = (status: number, title: string, detail: string, extra: Record<string, unknown> = {}) =>
  new HttpException({ type: `https://expatready.local/problems/${title.toLowerCase().replace(/[^a-z]+/g, "-")}`, title, status, detail, ...extra }, status);
function parse<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  const r = schema.safeParse(input ?? {});
  if (!r.success) throw problem(400, "Check the request", r.error.issues[0]?.message ?? "Some values are not valid.", { errors: r.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })) });
  return r.data;
}
const TYPE_OF = (kind: string) => (kind === "guide" ? "guide" : kind === "checklist" || kind === "document" ? "checklist" : "form");

// ------------------------------------------------------------------ Undo: one change on a forms list
type LineRow = Prisma.CombinationFormGetPayload<object>;
/** Every row of these forms' lines on a combination, as they are now (what Undo puts back). */
export async function snapshotLines(db: Pick<Db, "combinationForm">, combinationId: string, codes: string[]) {
  return (await db.combinationForm.findMany({ where: { combinationId, lineageKey: { in: codes } } })) as LineRow[];
}
/** Records one change with the rows it started from; the rows after it are read again when it is undone. */
export async function recordAction(db: Pick<Db, "formLineAction" | "combinationForm">, a: { workspaceId: string; combinationId: string; action: "attach" | "remove" | "finder_attach"; codes: string[]; before: LineRow[]; by: string; batchId?: string }) {
  const after = await snapshotLines(db, a.combinationId, a.codes);
  await db.formLineAction.create({ data: { workspaceId: a.workspaceId, combinationId: a.combinationId, action: a.action, by: a.by, detail: JSON.parse(JSON.stringify({ codes: a.codes, batch_id: a.batchId ?? null, before: a.before, after: after.map((r) => ({ id: r.id, status: r.status, version: r.version })) })) as Prisma.InputJsonValue } });
}

@Injectable()
export class FormLibrary {
  private canada: CanadaSource = canadaSource();
  constructor(@Inject(Db) private readonly db: Db, @Inject(Workspace) private readonly ws: Workspace, @Inject(Audit) private readonly audit: Audit, @Inject(Studio) private readonly studio: Studio) {}
  useCanada(c: CanadaSource) { this.canada = c; }

  /** The approved editions (manifest, a second person, or an official download), as one set of checksums. */
  private async approvedShas(workspaceId: string) {
    const [a, d] = await Promise.all([this.db.approvedSource.findMany({ where: { workspaceId }, select: { sha256: true } }), this.db.officialDownload.findMany({ where: { workspaceId }, select: { sha256: true } })]);
    return { all: new Set([...manifest().map((i) => i.sha256), ...a.map((x) => x.sha256), ...d.map((x) => x.sha256)]), downloaded: new Set(d.map((x) => x.sha256)) };
  }

  /** GET /library/forms/list: one lean list with type, used-by and status filters and a search (P-123). One query set. */
  async list(query: unknown) {
    const q = parse(LibraryQuery, query);
    const workspaceId = await this.ws.id();
    const [forms, approved, held] = await Promise.all([
      this.db.govFormDef.findMany({ where: { workspaceId }, orderBy: { formKey: "asc" }, include: { editions: true, usedBy: { orderBy: { version: "desc" }, select: { combinationId: true, status: true, version: true, origin: true, combination: { select: { label: true } } } } } }),
      this.approvedShas(workspaceId),
      this.db.intakeItem.findMany({ where: { workspaceId, status: "HELD" }, select: { code: true, outcome: true } }),
    ]);
    const rows = forms.map((f) => {
      const editions = f.editions.filter((e) => e.channel !== "ONLINE" && e.sha256 && approved.all.has(e.sha256));
      const current = newestEdition(editions);
      const newestPerCombination = new Map<string, (typeof f.usedBy)[number]>();
      for (const u of f.usedBy) if (!newestPerCombination.has(u.combinationId)) newestPerCombination.set(u.combinationId, u);
      const using = [...newestPerCombination.entries()].filter(([, u]) => u.status !== "RETIRED").map(([id, u]) => ({ id, label: u.combination.label, picked_by_ai: u.origin === "AI_FOUND" }));
      const needsOk = held.some((h) => h.code === f.formKey);
      const status = f.retiredAt ? "retired" : needsOk ? "needs_ok" : current?.newerFileSha256 ? "newer_file" : current ? "ready" : "needs_ok";
      return { code: f.formKey, title: f.displayName, type: TYPE_OF(f.formKind), edition: current?.editionLabel ?? null, canada_updated: current?.canadaUpdated ?? null,
        accepts: current?.acceptedChannels ?? (TYPE_OF(f.formKind) === "form" ? null : "READ_BY_AI"), accepts_basis: current?.acceptedBasis ?? "SAMPLE", accepts_quote: current?.acceptedQuote ?? null,
        origin: current?.origin ?? (current?.officialFile ? "SAMPLE" : current ? "UPLOADED" : null), downloaded_from: current && approved.downloaded.has(current.sha256!) ? current.sourceUrl : null, checked_at: current?.checkedAt ?? null,
        used_by: using, status, older_editions: editions.filter((e) => e.id !== current?.id).sort((a, b) => compareEditions(b, a)).map((e) => e.editionLabel) };
    });
    const term = q.q?.toLowerCase();
    const shown = rows.filter((r) => (!q.type || r.type === q.type) && (!q.usedBy || r.used_by.some((u) => u.id === q.usedBy)) && (!q.status || r.status === q.status) && (!term || r.code.toLowerCase().includes(term) || r.title.toLowerCase().includes(term)));
    const count = (pred: (r: (typeof rows)[number]) => boolean) => rows.filter(pred).length;
    return { rows: shown, counts: { all: rows.length, form: count((r) => r.type === "form"), guide: count((r) => r.type === "guide"), checklist: count((r) => r.type === "checklist"), needs_ok: count((r) => r.status === "needs_ok"), newer_file: count((r) => r.status === "newer_file"), retired: count((r) => r.status === "retired") },
      sample_note: "Which forms a combination needs and what IRCC accepts are Sample until the immigration expert confirms." };
  }

  async uses(code: string) { return formUses(this.db, await this.ws.id(), code); }

  /** "Replace with a new edition" checked against canada.ca (M6): the form's own page and its PDF, rules only, US$0. A
   *  newer printed edition is held for today's edition impact review; the same edition from a new file is marked for a
   *  person; the same file says so. Downloads go through the form finder's checks (official host, the form's page). */
  async checkCanada(actor: Actor, code: string) {
    need(actor, "author");
    const workspaceId = await this.ws.id();
    const def = await this.db.govFormDef.findUnique({ where: { workspaceId_formKey: { workspaceId, formKey: code } }, include: { editions: true } });
    if (!def) throw problem(404, "Not in the library", `${code} is not in the library.`);
    if (!def.formPageUrl) throw problem(409, "No canada.ca page", `${code} has no canada.ca form page recorded. Upload the new edition's PDF instead.`);
    const page = parseFormPage((await this.canada.get(def.formPageUrl, "html")).bytes.toString("utf8"));
    const pdfUrl = page.pdfUrls.find((u) => officialUrl(u).ok);
    if (!pdfUrl) throw problem(409, "No PDF on canada.ca", `${code}'s canada.ca page has no PDF to download.`);
    const current = newestEdition(def.editions.filter((e) => e.channel !== "ONLINE"));
    await this.db.formEdition.updateMany({ where: { govFormDefId: def.id }, data: { checkedAt: new Date() } });
    if (current && current.canadaUpdated && page.lastUpdated && current.canadaUpdated === page.lastUpdated && current.sourceUrl === pdfUrl) return { outcome: "current", message: `${current.editionLabel} is still the current edition on canada.ca (last updated ${page.lastUpdated}).`, last_updated: page.lastUpdated };
    return { outcome: "check", message: `canada.ca shows ${code} last updated ${page.lastUpdated ?? "on an unknown date"}. Run "Find again" on a combination that uses it to download it: a newer edition goes to edition review, the same edition from a new file is marked for you to replace.`, last_updated: page.lastUpdated, pdf_url: pdfUrl };
  }

  // ------------------------------------------------------------------ hand actions on a combination's forms
  /** POST /combinations/:id/forms: attach a library form by hand (also an unmapped one: reading its boxes comes after). */
  async attach(actor: Actor, combinationId: string, body: unknown) {
    need(actor, "author");
    const b = parse(AttachBody, body);
    const c = await this.db.combination.findUnique({ where: { id: combinationId } });
    if (!c) throw problem(404, "Not found", "That combination does not exist.");
    const def = await this.db.govFormDef.findUnique({ where: { workspaceId_formKey: { workspaceId: c.workspaceId, formKey: b.formKey } }, include: { editions: true } });
    if (!def) throw problem(404, "Not in the library", `${b.formKey} is not in the library. Find it with the form finder, or upload its PDF.`, { errors: [{ field: "formKey", message: "Choose a form from the library." }] });
    if (def.retiredAt) throw problem(409, "Retired", `${b.formKey} is retired in the library: restore it there first.`, { errors: [{ field: "formKey", message: "Retired." }] });
    const ok = (await this.approvedShas(c.workspaceId)).all;
    if (!def.editions.some((e) => e.channel !== "ONLINE" && e.sha256 && ok.has(e.sha256))) throw problem(409, "Waiting for a person", `${b.formKey} has no edition a combination may use yet: its file waits for a second person on To review.`);
    const before = await snapshotLines(this.db, combinationId, [b.formKey]);
    const r = await addFormLine(this.db, { workspaceId: c.workspaceId, combinationId, govFormDefId: def.id, formKey: def.formKey, who: b.who, origin: "HUMAN", by: actor.id, sourceQuote: `${def.formKey}: added from the library` });
    if (r === "already") throw problem(409, "Already on this combination", `${b.formKey} is already one of this combination's forms.`, { errors: [{ field: "formKey", message: "Already added." }] });
    await recordAction(this.db, { workspaceId: c.workspaceId, combinationId, action: "attach", codes: [def.formKey], before, by: actor.id });
    await this.audit.log(c.workspaceId, actor.id, "reused", "form", def.formKey, `${actor.name} added ${def.formKey} to "${c.label}" from the library`, undefined, combinationId);
    return { added: def.formKey };
  }

  /** DELETE /combinations/:id/forms/:code: remove from this combination; the form stays in the library. */
  async remove(actor: Actor, combinationId: string, code: string) {
    need(actor, "author");
    const c = await this.db.combination.findUnique({ where: { id: combinationId } });
    if (!c) throw problem(404, "Not found", "That combination does not exist.");
    const before = await snapshotLines(this.db, combinationId, [code]);
    await this.studio.saveForm(actor, combinationId, code, { retire: true });
    await recordAction(this.db, { workspaceId: c.workspaceId, combinationId, action: "remove", codes: [code], before, by: actor.id });
    return { removed: code, in_library: true };
  }

  /** POST /combinations/:id/forms/undo: reverses the last change on this combination's forms list, exactly, while the
   *  draft is open: refused when one of its lines changed since (someone else edited it) or was released meanwhile. */
  async undo(actor: Actor, combinationId: string) {
    need(actor, "author");
    const a = await this.db.formLineAction.findFirst({ where: { combinationId, undoneAt: null }, orderBy: { at: "desc" } });
    if (!a) throw problem(409, "Nothing to undo", "There is no change on this combination's forms to undo.");
    const d = a.detail as unknown as { codes: string[]; before: LineRow[]; after: { id: string; status: string; version: number }[] };
    const now = await snapshotLines(this.db, combinationId, d.codes);
    const changed = now.length !== d.after.length || now.some((r) => { const x = d.after.find((y) => y.id === r.id); return !x || x.status !== r.status || x.version !== r.version; });
    if (changed) throw problem(409, "Changed since", "One of these forms was changed after that step (by you or someone else), so it cannot be undone exactly. Change it by hand.");
    if (now.some((r) => r.status === "PUBLISHED" && !d.before.some((b) => b.id === r.id))) throw problem(409, "Released since", "That change was released meanwhile: a release is never undone. Change it in a new draft.");
    await this.db.$transaction(async (tx) => {
      const keep = new Set(d.before.map((r) => r.id));
      await tx.combinationForm.deleteMany({ where: { id: { in: now.filter((r) => !keep.has(r.id)).map((r) => r.id) } } });
      for (const r of d.before) {
        const { updatedAt, predicateJson, ...row } = r; void updatedAt;
        await tx.combinationForm.upsert({ where: { id: r.id }, update: { status: r.status, who: r.who, attachMode: r.attachMode, conditionPlain: r.conditionPlain, origin: r.origin, finderBatchId: r.finderBatchId ?? null }, create: { ...row, predicateJson: predicateJson === null ? Prisma.DbNull : (predicateJson as Prisma.InputJsonValue) } });
      }
      await tx.formLineAction.update({ where: { id: a.id }, data: { undoneAt: new Date(), undoneBy: actor.id } });
    });
    const c = await this.db.combination.findUniqueOrThrow({ where: { id: combinationId } });
    await this.audit.log(c.workspaceId, actor.id, "undone", "form", d.codes.join(", ").slice(0, 120), `${actor.name} undid the last change on "${c.label}"'s forms (${a.action === "finder_attach" ? "the form finder's attach" : a.action}: ${d.codes.join(", ")})`, undefined, combinationId);
    return { undone: a.action, codes: d.codes };
  }
}

/** S4 slice 1 routes (contract: contracts/form-library.ts). Kept in this lane's own file so shared API edits stay small. */
@Controller("api")
export class FormLibraryController {
  constructor(@Inject(FormLibrary) private readonly lib: FormLibrary, @Inject(Finder) private readonly finder: Finder, @Inject(Lifecycle) private readonly lifecycle: Lifecycle) {}
  @Post("combinations/:id/forms/find/plan") plan(@Param("id") id: string, @Body() b: unknown) { return this.finder.plan(id, b); }
  @Post("combinations/:id/forms/find") find(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.finder.launch(actorOf(a), id, b); }
  @Get("combinations/:id/forms/find") latest(@Param("id") id: string) { return this.finder.latest(id); }
  @Get("form-finder/runs/:id") run(@Param("id") id: string) { return this.finder.view(id); }
  @Post("form-finder/runs/:id/stop") stop(@Headers("x-actor") a: H, @Param("id") id: string) { return this.finder.stop(actorOf(a), id); }
  @Post("combinations/:id/forms/undo") undo(@Headers("x-actor") a: H, @Param("id") id: string) { return this.lib.undo(actorOf(a), id); }
  @Post("combinations/:id/forms") attach(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.lib.attach(actorOf(a), id, b); }
  @Delete("combinations/:id/forms/:code") remove(@Headers("x-actor") a: H, @Param("id") id: string, @Param("code") code: string) { return this.lib.remove(actorOf(a), id, code); }
  @Get("library/forms/list") list(@Query() q: unknown) { return this.lib.list(q); }
  @Get("library/forms/:code/uses") uses(@Param("code") code: string) { return this.lib.uses(code); }
  @Post("library/forms/:code/check-canada") check(@Headers("x-actor") a: H, @Param("code") code: string) { return this.lib.checkCanada(actorOf(a), code); }
  @Delete("library/forms/:code") del(@Headers("x-actor") a: H, @Param("code") code: string, @Body() b: unknown) { return this.lifecycle.propose(actorOf(a), "library_form", code, "DELETE", parse(LifecycleReasonBody, b).reason); }
  @Post("library/forms/:code/retire") retire(@Headers("x-actor") a: H, @Param("code") code: string, @Body() b: unknown) { return this.lifecycle.propose(actorOf(a), "library_form", code, "RETIRE", parse(LifecycleReasonBody, b).reason); }
  @Post("library/forms/:code/restore") restore(@Headers("x-actor") a: H, @Param("code") code: string, @Body() b: unknown) { return this.lifecycle.propose(actorOf(a), "library_form", code, "RESTORE", parse(LifecycleReasonBody, b).reason); }
}
type H = string | undefined;
