// S4 Form library, slice 1 API (W1-06, P-123, P-116; challenge.md M6, m2, m6): the one lean list with its filters, where a
// form is used, its lifecycle (delete only when unused and never released, otherwise retire; a second person approves,
// through api/src/lifecycle.ts), "Replace with a new edition" checked against canada.ca, and the hand actions on a
// combination's forms list: attach from the library, remove (stays in the library) and Undo of the last change.
// Buttons for these come with S3/S5 (combination) and slice 3 (library page); every action is server-checked here.
import { Body, Controller, Delete, Get, Headers, HttpException, Inject, Injectable, Param, Post, Query, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { AnyFilesInterceptor } from "@nestjs/platform-express";
import { MAX_BYTES, MAX_FILES } from "./intake.ts";
import { UploadRuns } from "./upload-run.ts";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { manifest } from "../../engine/import.ts";
import { compareEditions, newestEdition } from "../../engine/programs.ts";
import { officialUrl, parseFormPage, parseFormsIndex } from "../../engine/canada.ts";
import { INDEX_URL } from "./finder.ts";
import { AcceptsBody, ACCEPTS_WORD, AttachBody, LibraryQuery, LifecycleReasonBody, LineVersionBody, normaliseCode, UndoBody } from "../../contracts/form-library.ts";
import { CanadaError, canadaSource, type CanadaSource } from "./canada.ts";
import { ACTORS, actorOf, Audit, Db, need, Workspace, type Actor } from "./core.ts";
import { Finder } from "./finder.ts";
import { Lifecycle } from "./lifecycle.ts";
import { addFormLine } from "./form-lines.ts";
import { closingChange, combinationTrails, formUses, lineSig, oneAtATime, recordAction, snapshotLines, type LineRow } from "./form-uses.ts";
import { Studio } from "./studio.ts";

const problem = (status: number, title: string, detail: string, extra: Record<string, unknown> = {}) =>
  new HttpException({ type: `https://expatready.local/problems/${title.toLowerCase().replace(/[^a-z]+/g, "-")}`, title, status, detail, ...extra }, status);
function parse<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  const r = schema.safeParse(input ?? {});
  if (!r.success) throw problem(400, "Check the request", r.error.issues[0]?.message ?? "Some values are not valid.", { errors: r.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })) });
  return r.data;
}
const nameOf = (id: string) => ACTORS.find((a) => a.id === id)?.name ?? "another person";
/** Library type. Rows made before S4 say only "document": a filed form when its title says so (IMM 5802, an employer's
 *  offer of employment form; review major 9), otherwise a checklist or instructions, read by AI and never filed (IMM 5881,
 *  IMM 5905; round 2 major 4). */
const TYPE_OF = (kind: string, title = "") => (kind === "guide" ? "guide" : kind === "checklist" || (kind === "document" && !(/\bform\b/i.test(title) && !/checklist/i.test(title))) ? "checklist" : "form");

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
    // "Re-read with AI (fields and boxes)" drafts from a combination's copy of the file (today's field-map drafting).
    const atts = await this.db.sourceAttachment.findMany({ where: { workspaceId }, select: { id: true, sha256: true, combinationId: true, kind: true }, orderBy: { createdAt: "asc" } });
    const lifecyclePending = await this.db.libraryChange.findMany({ where: { workspaceId, kind: "library_form", status: { in: ["WAITING", "RETURNED", "APPROVED"] } }, select: { key: true, action: true, status: true } });
    const trails = await combinationTrails(this.db, workspaceId);
    const combos = (await this.db.combination.findMany({ where: { workspaceId, retiredAt: null }, select: { id: true, label: true } })).map((c) => ({ id: c.id, label: trails.get(c.id) ?? c.label })).sort((a, b) => a.label.localeCompare(b.label));
    const waitingAccepts = new Set((await this.db.libraryChange.findMany({ where: { workspaceId, kind: "form_accepts", status: { in: ["WAITING", "RETURNED"] } }, select: { key: true } })).map((x) => x.key));
    const rows = forms.map((f) => {
      const editions = f.editions.filter((e) => e.channel !== "ONLINE" && e.sha256 && approved.all.has(e.sha256));
      const current = newestEdition(editions);
      const newestPerCombination = new Map<string, (typeof f.usedBy)[number]>();
      for (const u of f.usedBy) if (!newestPerCombination.has(u.combinationId)) newestPerCombination.set(u.combinationId, u);
      const using: { id: string; label: string; picked_by_ai: boolean; as_source?: boolean }[] = [...newestPerCombination.entries()].filter(([, u]) => u.status !== "RETIRED").map(([id, u]) => ({ id, label: trails.get(id) ?? u.combination.label, picked_by_ai: u.origin === "AI_FOUND" }));
      // Review must 1: a combination with one of its files attached as a source uses it too.
      const shas = new Set(f.editions.map((e) => e.sha256).filter(Boolean));
      for (const cid of new Set(atts.filter((a) => shas.has(a.sha256)).map((a) => a.combinationId))) if (!using.some((u) => u.id === cid)) using.push({ id: cid, label: trails.get(cid) ?? "A combination", picked_by_ai: false, as_source: true });
      const pendingChange = lifecyclePending.find((x) => x.key === f.formKey), lifecycle = pendingChange?.action ?? null;
      const needsOk = held.some((h) => h.code === f.formKey);
      const status = f.retiredAt ? "retired" : needsOk ? "needs_ok" : current?.newerFileSha256 ? "newer_file" : current ? "ready" : "needs_ok";
      return { code: f.formKey, title: f.displayName, type: TYPE_OF(f.formKind, f.displayName), edition: current?.editionLabel ?? null, canada_updated: current?.canadaUpdated ?? null,
        accepts: current?.acceptedChannels ?? (TYPE_OF(f.formKind, f.displayName) === "form" ? null : "READ_BY_AI"), accepts_basis: current?.acceptedBasis === "SAMPLE" ? "AI_SAMPLE" : current?.acceptedBasis ?? null, accepts_quote: current?.acceptedQuote ?? null, accepts_waiting: waitingAccepts.has(f.formKey),
        origin: current?.origin ?? (current?.officialFile ? "SAMPLE" : current ? "UPLOADED" : null), downloaded_from: current && approved.downloaded.has(current.sha256!) ? current.sourceUrl : null, checked_at: current?.checkedAt ?? null,
        form_page_url: f.formPageUrl ?? current?.formPageUrl ?? null, fingerprint: current?.sha256 ?? null, attachment_id: current ? atts.find((a) => a.sha256 === current.sha256 && a.kind === "Form")?.id ?? null : null,
        used_by: using, status, lifecycle_waiting: lifecycle, lifecycle_approved: pendingChange?.status === "APPROVED", older_editions: editions.filter((e) => e.id !== current?.id).sort((a, b) => compareEditions(b, a)).map((e) => e.editionLabel) };
    });
    const term = q.q?.toLowerCase(), termCode = q.q ? normaliseCode(q.q).toLowerCase() : undefined;
    // S5's "Add a form from the library" (for=picker): forms a combination may use now, never retired or still waiting.
    const shown = rows.filter((r) => (q.for !== "picker" || (r.status !== "retired" && !!r.edition)) && (!q.type || r.type === q.type) && (!q.usedBy || r.used_by.some((u) => u.id === q.usedBy)) && (!q.status || r.status === q.status) && (!term || r.code.toLowerCase().includes(term) || r.code.toLowerCase().includes(termCode!) || r.title.toLowerCase().includes(term)));
    const count = (pred: (r: (typeof rows)[number]) => boolean) => rows.filter(pred).length;
    return { rows: shown, counts: { all: rows.length, form: count((r) => r.type === "form"), guide: count((r) => r.type === "guide"), checklist: count((r) => r.type === "checklist"), needs_ok: count((r) => r.status === "needs_ok"), newer_file: count((r) => r.status === "newer_file"), retired: count((r) => r.status === "retired") },
      combinations: combos, sample_note: "Which forms a combination needs and what IRCC accepts are Sample until the immigration expert confirms." };
  }

  async uses(code: string) { return formUses(this.db, await this.ws.id(), code); }

  /** C11.18 (P-123, founder 27 Oct): a person sets or corrects what IRCC accepts for a form, with the canada.ca line it
   *  comes from or a reason. It waits for a second person on To review (P-79, P-116 pattern) and, once approved, applies to
   *  the form's current edition, marked "Set by a person · Sample" until the immigration expert confirms. */
  async proposeAccepts(actor: Actor, code: string, body: unknown) {
    need(actor, "author");
    const b = parse(AcceptsBody, body);
    const workspaceId = await this.ws.id();
    const def = await this.db.govFormDef.findUnique({ where: { workspaceId_formKey: { workspaceId, formKey: code } }, include: { editions: true } });
    if (!def) throw problem(404, "Not in the library", `${code} is not in the library.`);
    if (TYPE_OF(def.formKind, def.displayName) !== "form") throw problem(409, "Not filed", `${code} is a ${TYPE_OF(def.formKind, def.displayName)}: it is read by AI and never filed, so IRCC does not accept it in any way.`);
    if (def.retiredAt) throw problem(409, "Retired", `${code} is retired: restore it first.`);
    const current = newestEdition(def.editions.filter((e) => e.channel !== "ONLINE"));
    if (!current) throw problem(409, "No edition yet", `${code} has no edition in the library yet.`);
    if (current.acceptedChannels === b.channels && (current.acceptedQuote ?? "") === (b.quote ?? "")) throw problem(409, "Nothing changes", "That is already what the library says IRCC accepts for this form.");
    if (await this.db.libraryChange.findFirst({ where: { workspaceId, kind: "form_accepts", key: code, status: { in: ["WAITING", "RETURNED", "APPROVED"] } } })) throw problem(409, "Already waiting", `A change to what IRCC accepts for ${code} already waits for a second person on To review.`);
    const label = `${code} · IRCC accepts: ${ACCEPTS_WORD[b.channels]}`;
    const c = await this.db.libraryChange.create({ data: { workspaceId, kind: "form_accepts", key: code, label, action: "SET_ACCEPTS", reason: b.quote ? `canada.ca: "${b.quote}"` : b.reason!, matches: { channels: b.channels, quote: b.quote ?? null, reason: b.reason ?? null, edition: current.editionLabel, before: current.acceptedChannels ?? null, form_page: def.formPageUrl ?? current.formPageUrl ?? null } as Prisma.InputJsonValue, status: "WAITING", proposedBy: actor.id } });
    // Break minor: two people proposing at once both pass the check above; the earlier one stays, the later is refused.
    const first = await this.db.libraryChange.findFirst({ where: { workspaceId, kind: "form_accepts", key: code, status: "WAITING" }, orderBy: [{ proposedAt: "asc" }, { id: "asc" }] });
    if (first && first.id !== c.id) { await this.db.libraryChange.delete({ where: { id: c.id } }); throw problem(409, "Already waiting", `A change to what IRCC accepts for ${code} already waits for a second person on To review.`); }
    await this.audit.log(workspaceId, actor.id, "proposed", "form", code, `${actor.name} proposed that IRCC accepts ${code} as ${ACCEPTS_WORD[b.channels]} (${b.quote ? "canada.ca line given" : `reason: ${b.reason}`}); waits for a second person`);
    return { id: c.id, status: c.status, label };
  }

  /** "Replace with a new edition" checked against canada.ca (M6): the form's own page and its PDF, rules only, US$0. A
   *  newer printed edition is held for today's edition impact review; the same edition from a new file is marked for a
   *  person; the same file says so. Downloads go through the form finder's checks (official host, the form's page). */
  async checkCanada(actor: Actor, code: string) {
    need(actor, "author");
    try { return await this.compareWithCanada(code); } catch (e) {
      // canada.ca not answering (or a page not among the recorded copies) is said in words, never a server error.
      if (e instanceof CanadaError) throw problem(409, "canada.ca could not be read", `${code}: ${e.message} Upload its new edition's PDF instead, or try again later.`);
      throw e;
    }
  }

  private async compareWithCanada(code: string) {
    const workspaceId = await this.ws.id();
    const def = await this.db.govFormDef.findUnique({ where: { workspaceId_formKey: { workspaceId, formKey: code } }, include: { editions: true } });
    if (!def) throw problem(404, "Not in the library", `${code} is not in the library.`);
    // A form without a recorded page (a sample copy, an upload) is looked up in canada.ca's list of forms (rules, US$0).
    let pageUrl = def.formPageUrl;
    if (!pageUrl) {
      const row = parseFormsIndex((await this.canada.get(INDEX_URL, "html")).bytes.toString("utf8")).rows.find((r) => normaliseCode(r.code) === normaliseCode(code));
      if (!row) throw problem(409, "Not on canada.ca's list", `${code} is not on canada.ca's list of forms (it may be a visa-office document). Upload its new edition's PDF instead.`);
      pageUrl = row.pageUrl;
      await this.db.govFormDef.update({ where: { id: def.id }, data: { formPageUrl: pageUrl } });
    }
    const page = parseFormPage((await this.canada.get(pageUrl, "html")).bytes.toString("utf8"));
    const pdfUrl = page.pdfUrls.find((u) => officialUrl(u).ok);
    if (!pdfUrl) throw problem(409, "No PDF on canada.ca", `${code}'s canada.ca page has no PDF to download.`);
    const current = newestEdition(def.editions.filter((e) => e.channel !== "ONLINE"));
    await this.db.formEdition.updateMany({ where: { govFormDefId: def.id }, data: { checkedAt: new Date(), formPageUrl: pageUrl } });
    if (current && current.canadaUpdated && page.lastUpdated && current.canadaUpdated === page.lastUpdated && current.sourceUrl === pdfUrl) return { outcome: "current", message: `${current.editionLabel} is still the current edition on canada.ca (last updated ${page.lastUpdated}).`, last_updated: page.lastUpdated };
    return { outcome: "check", message: `canada.ca shows ${code} last updated ${page.lastUpdated ?? "on an unknown date"}. Run "Find again" on a combination that uses it to download it: a newer edition goes to edition review, the same edition from a new file is marked for you to replace.`, last_updated: page.lastUpdated, pdf_url: pdfUrl };
  }

  // ------------------------------------------------------------------ hand actions on a combination's forms
  /** POST /combinations/:id/forms: attach a library form by hand (also an unmapped one: reading its boxes comes after). */
  attach(actor: Actor, combinationId: string, body: unknown) { return oneAtATime(combinationId, () => this.attachNow(actor, combinationId, body)); }
  private async attachNow(actor: Actor, combinationId: string, body: unknown) {
    need(actor, "author");
    const b = parse(AttachBody, body);
    const c = await this.db.combination.findUnique({ where: { id: combinationId } });
    if (!c) throw problem(404, "Not found", "That combination does not exist.");
    const def = await this.db.govFormDef.findUnique({ where: { workspaceId_formKey: { workspaceId: c.workspaceId, formKey: b.formKey } }, include: { editions: true } });
    if (!def) throw problem(404, "Not in the library", `${b.formKey} is not in the library. Find it with the form finder, or upload its PDF.`, { errors: [{ field: "formKey", message: "Choose a form from the library." }] });
    if (def.retiredAt) throw problem(409, "Retired", `${b.formKey} is retired in the library: restore it there first.`, { errors: [{ field: "formKey", message: "Retired." }] });
    const closing = await closingChange(this.db, c.workspaceId, def.formKey);
    if (closing) throw problem(409, "Being retired", `A request to ${closing.action.toLowerCase()} ${b.formKey} is open on To review: nothing new may use it until it is decided.`, { errors: [{ field: "formKey", message: "Being retired." }] });
    const ok = (await this.approvedShas(c.workspaceId)).all;
    if (!def.editions.some((e) => e.channel !== "ONLINE" && e.sha256 && ok.has(e.sha256))) throw problem(409, "Waiting for a person", `${b.formKey} has no edition a combination may use yet: its file waits for a second person on To review.`);
    const before = await snapshotLines(this.db, combinationId, [b.formKey]);
    const r = await addFormLine(this.db, { workspaceId: c.workspaceId, combinationId, govFormDefId: def.id, formKey: def.formKey, who: b.who, origin: "HUMAN", by: actor.id, sourceQuote: `${def.formKey}: added from the library` });
    if (r === "already") throw problem(409, "Already on this combination", `${b.formKey} is already one of this combination's forms.`, { errors: [{ field: "formKey", message: "Already added." }] });
    await recordAction(this.db, { workspaceId: c.workspaceId, combinationId, action: "attach", codes: [def.formKey], before, by: actor.id });
    await this.audit.log(c.workspaceId, actor.id, "reused", "form", def.formKey, `${actor.name} added ${def.formKey} to "${c.label}" from the library`, undefined, combinationId);
    return { added: def.formKey };
  }

  /** The newest version of a form's line on a combination must be the one the person saw (S5: 409 when stale). */
  private async sameVersion(combinationId: string, code: string, version: number | undefined) {
    if (version === undefined) return;
    const newest = await this.db.combinationForm.findFirst({ where: { combinationId, lineageKey: code }, orderBy: { version: "desc" } });
    if (newest && version > newest.version) throw problem(409, "Changed since", `${code} is at version ${newest.version} on this combination, not ${version}. Reload to see it.`, { version: newest.version });
    if (newest && newest.version !== version) throw problem(409, "Changed since", `${code} was changed by ${nameOf(newest.updatedBy)} at ${newest.updatedAt.toISOString().slice(11, 16)} UTC after you opened it (now version ${newest.version}). Reload to see it.`, { version: newest.version });
  }

  /** DELETE /combinations/:id/forms/:code: remove from this combination; the form stays in the library. The removal is
   *  one change for Undo (written by saveForm, the one line-settings route), and Find again never attaches it back. */
  remove(actor: Actor, combinationId: string, code: string, body: unknown) { return oneAtATime(combinationId, () => this.removeNow(actor, combinationId, code, body)); }
  private async removeNow(actor: Actor, combinationId: string, code: string, body: unknown) {
    need(actor, "author");
    const b = parse(LineVersionBody, body);
    const c = await this.db.combination.findUnique({ where: { id: combinationId } });
    if (!c) throw problem(404, "Not found", "That combination does not exist.");
    // Break m12, round 2 N5: Removes on one combination run one after the other (oneAtATime); the second sees the line
    // already removed and is refused, so only one removal and one Undo step are recorded.
    {
      const newest = await this.db.combinationForm.findFirst({ where: { combinationId, lineageKey: code }, orderBy: { version: "desc" } });
      if (newest?.status === "RETIRED") throw problem(409, "Already removed", `${code} was just removed from this combination by ${nameOf(newest.updatedBy) ?? "someone"}. Reload to see it.`);
      await this.sameVersion(combinationId, code, b.version);
      await this.studio.saveForm(actor, combinationId, code, { retire: true });
      return { removed: code, in_library: true };
    }
  }

  /** POST /combinations/:id/forms/:code/replace: "Replace with a new edition" from a combination's line: compares the
   *  form with canada.ca (rules, US$0). A newer edition goes to edition review, the same edition from a new file is
   *  marked for a person; the line itself always files the library's current edition (lines point at the form). */
  async replace(actor: Actor, combinationId: string, code: string, body: unknown) {
    need(actor, "author");
    const b = parse(LineVersionBody, body);
    if (!(await this.db.combination.findUnique({ where: { id: combinationId }, select: { id: true } }).catch(() => null))) throw problem(404, "Not found", "This combination no longer exists.");
    await this.sameVersion(combinationId, code, b.version);
    return this.checkCanada(actor, code);
  }

  /** POST /combinations/:id/forms/undo: reverses the last change on this combination's forms list, exactly, while the
   *  draft is open: refused when one of its lines changed since (someone else edited it) or was released meanwhile. */
  undo(actor: Actor, combinationId: string, body: unknown) { return oneAtATime(combinationId, () => this.undoNow(actor, combinationId, body)); }
  private async undoNow(actor: Actor, combinationId: string, body: unknown) {
    need(actor, "author");
    const b = parse(UndoBody, body);
    const a = await this.db.formLineAction.findFirst({ where: { combinationId, undoneAt: null }, orderBy: { at: "desc" } });
    if (!a) throw problem(409, "Nothing to undo", "There is no change on this combination's forms to undo.");
    if (b.changeId && b.changeId !== a.id) throw problem(409, "Changed since", `The last change on these forms is now ${nameOf(a.by)}'s (${a.action}), not the one you saw. Reload, then undo.`, { changeId: a.id });
    const d = a.detail as unknown as { codes: string[]; before: LineRow[]; after: { id: string; status: string; version: number; sig?: string }[] };
    // Round 3 major: Undo never brings back a form that is retired, or whose retire or delete is open (P-116).
    for (const code of d.codes.filter((k) => d.before.some((r) => r.lineageKey === k && r.status !== "RETIRED"))) {
      const def = await this.db.govFormDef.findUnique({ where: { workspaceId_formKey: { workspaceId: a.workspaceId, formKey: code } } });
      if (def?.retiredAt) throw problem(409, "Retired", `${code} is retired in the library, so this Undo would bring it back: restore it in the library first.`);
      const closing = await closingChange(this.db, a.workspaceId, code);
      if (closing) throw problem(409, "Being retired", `A request to ${closing.action.toLowerCase()} ${code} is open on To review, so this Undo would bring it back. Decide that request first.`);
    }
    // Break M4: the check and the put-back run in one transaction with the lines locked, so an edit that lands between
    // them is either seen (refused) or waits for the Undo to finish.
    await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM combination_form WHERE combination_id = ${combinationId}::uuid AND lineage_key = ANY(${d.codes}) FOR UPDATE`;
      const step = await tx.formLineAction.findUnique({ where: { id: a.id } });
      if (step?.undoneAt) throw problem(409, "Already undone", "That change was undone a moment ago.");
      const now = await snapshotLines(tx, combinationId, d.codes);
      const changed = now.length !== d.after.length || now.some((r) => { const x = d.after.find((y) => y.id === r.id); return !x || x.status !== r.status || x.version !== r.version || (!!x.sig && x.sig !== lineSig(r)); });
      if (changed) throw problem(409, "Changed since", "One of these forms was changed after that step (by you or someone else), so it cannot be undone exactly. Change it by hand.");
      if (now.some((r) => r.status === "PUBLISHED" && !d.before.some((b) => b.id === r.id))) throw problem(409, "Released since", "That change was released meanwhile: a release is never undone. Change it in a new draft.");
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
    return { undone: a.action, codes: d.codes, changeId: a.id };
  }
}

/** S4 slice 1 routes (contract: contracts/form-library.ts). Kept in this lane's own file so shared API edits stay small. */
@Controller("api")
export class FormLibraryController {
  constructor(@Inject(FormLibrary) private readonly lib: FormLibrary, @Inject(Finder) private readonly finder: Finder, @Inject(Lifecycle) private readonly lifecycle: Lifecycle, @Inject(UploadRuns) private readonly uploads: UploadRuns) {}
  /** Upload PDF through the shared run (one file; rules first, M1); optional forCombination + forCode (S5 ask). */
  @Post("library/forms/upload") @UseInterceptors(AnyFilesInterceptor({ limits: { fileSize: MAX_BYTES, files: MAX_FILES } }))
  async upload(@Headers("x-actor") a: H, @UploadedFiles() files: { originalname: string; buffer: Buffer }[] | undefined, @Body() b: { forCombination?: string; forCode?: string } | undefined) {
    const actor = actorOf(a), forForm = b?.forCombination && b?.forCode ? { combinationId: String(b.forCombination), code: normaliseCode(String(b.forCode)) } : undefined;
    if (!files?.length) return this.uploads.start(actor, undefined, forForm);
    // One run per file, so each file has its own card, steps and Stop (one way in, many files: Lead 27 Oct).
    const runs: { runId: string }[] = [], refused: { file: string; why: string }[] = [];
    for (const f of files) {
      try { runs.push(await this.uploads.start(actor, f, forForm)); } catch (e) {
        const r = e instanceof HttpException ? (e.getResponse() as { detail?: string }) : null;
        if (!r?.detail || (e as HttpException).getStatus() !== 400) throw e;
        refused.push({ file: f.originalname || "A file", why: r.detail });
      }
    }
    if (!runs.length) throw problem(400, "Nothing uploaded", refused.map((x) => x.why).join(" "));
    return { runId: runs[0].runId, runIds: runs.map((r) => r.runId), refused };
  }
  @Post("combinations/:id/forms/find/plan") plan(@Param("id") id: string, @Body() b: unknown) { return this.finder.plan(id, b); }
  @Post("combinations/:id/forms/find") find(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.finder.launch(actorOf(a), id, b); }
  @Get("combinations/:id/forms/find") latest(@Param("id") id: string) { return this.finder.latest(id); }
  @Get("form-finder/runs/:id") run(@Param("id") id: string) { return this.finder.view(id); }
  @Post("form-finder/runs/:id/stop") stop(@Headers("x-actor") a: H, @Param("id") id: string) { return this.finder.stop(actorOf(a), id); }
  @Post("combinations/:id/forms/undo") undo(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.lib.undo(actorOf(a), id, b); }
  @Get("combinations/:id/forms/find/latest") latestForms(@Param("id") id: string) { return this.finder.latestForms(id); }
  @Post("combinations/:id/forms/:code/replace") replace(@Headers("x-actor") a: H, @Param("id") id: string, @Param("code", { transform: normaliseCode }) code: string, @Body() b: unknown) { return this.lib.replace(actorOf(a), id, code, b); }
  @Post("combinations/:id/forms") attach(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.lib.attach(actorOf(a), id, b); }
  @Delete("combinations/:id/forms/:code") remove(@Headers("x-actor") a: H, @Param("id") id: string, @Param("code", { transform: normaliseCode }) code: string, @Body() b: unknown) { return this.lib.remove(actorOf(a), id, code, b); }
  @Get("library/forms/list") list(@Query() q: unknown) { return this.lib.list(q); }
  @Get("library/forms/:code/uses") uses(@Param("code", { transform: normaliseCode }) code: string) { return this.lib.uses(code); }
  @Post("library/forms/:code/accepts") accepts(@Headers("x-actor") a: H, @Param("code", { transform: normaliseCode }) code: string, @Body() b: unknown) { return this.lib.proposeAccepts(actorOf(a), code, b); }
  @Post("library/forms/:code/check-canada") check(@Headers("x-actor") a: H, @Param("code", { transform: normaliseCode }) code: string) { return this.lib.checkCanada(actorOf(a), code); }
  @Delete("library/forms/:code") del(@Headers("x-actor") a: H, @Param("code", { transform: normaliseCode }) code: string, @Body() b: unknown) { return this.lifecycle.propose(actorOf(a), "library_form", code, "DELETE", parse(LifecycleReasonBody, b).reason); }
  @Post("library/forms/:code/retire") retire(@Headers("x-actor") a: H, @Param("code", { transform: normaliseCode }) code: string, @Body() b: unknown) { return this.lifecycle.propose(actorOf(a), "library_form", code, "RETIRE", parse(LifecycleReasonBody, b).reason); }
  @Post("library/forms/:code/restore") restore(@Headers("x-actor") a: H, @Param("code", { transform: normaliseCode }) code: string, @Body() b: unknown) { return this.lifecycle.propose(actorOf(a), "library_form", code, "RESTORE", parse(LifecycleReasonBody, b).reason); }
}
type H = string | undefined;
