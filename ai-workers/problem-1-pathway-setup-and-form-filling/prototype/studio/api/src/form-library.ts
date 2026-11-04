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
import { effective } from "../../engine/snapshot.ts";
import { compareEditions, newestEdition } from "../../engine/programs.ts";
import { officialUrl, parseFormPage, parseFormsIndex } from "../../engine/canada.ts";
import { INDEX_URL, libraryType } from "./finder.ts";
import { notFiledWords } from "../../engine/form-type.ts";
import { fileMonth, libraryRows, newerOnIndex, planIndexFill } from "../../engine/library-index.ts";
import { ACCOUNT_WORDS, throughAccount } from "../../contracts/forms.ts";
import { AcceptsBody, acceptsWords, AttachBody, fieldMapState, FORM_ROLE_WORDS, FormRoleBody, LibraryQuery, LifecycleReasonBody, LineVersionBody, normaliseCode, UndoBody } from "../../contracts/form-library.ts";
import { CanadaError, canadaSource, type CanadaSource } from "./canada.ts";
import { ACTORS, actorOf, Audit, ConfigRead, Db, need, readerOf, Workspace, type Actor } from "./core.ts";
import { rowActionOf } from "./form-row-action.ts";
import { fillPublished } from "./edition-published.ts";
import { fileDateOf, ircPublished } from "../../engine/published-date.ts";
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
/** Library type: one rule with the finder (finder.ts libraryType). */
const TYPE_OF = libraryType;
/** P-152 (2): the flag a form held only online carries in the library, in the founder's words. */
const ONLINE_ONLY_WORDS = "Online only · no official PDF";
const ONLINE_ONLY_FIELD_MAP = { kind: "no_edition" as const, decided: 0, total: 0, words: "No PDF: online only", tip: "This form is held only as its online version, with no official PDF: its field map is drafted from IRCC's help pages or saved portal screens, not from a PDF." };

/** P-143 (C-3): a form's records of what IRCC accepts, per IRCC account, for the Form library row (ANY first). A guide
 *  or checklist is read by AI and never filed. */
export function acceptsRow(records: { account: string; channels: string[]; basis: string; quote: string | null; sourceUrl?: string | null }[], filed: boolean) {
  if (!filed) return { accepts: "READ_BY_AI", accepts_basis: null, accepts_quote: null, accepts_accounts: [] };
  const list = [...records].sort((a, b) => (a.account === "ANY" ? -1 : b.account === "ANY" ? 1 : a.account.localeCompare(b.account)))
    .map((r) => ({ account: r.account, account_words: ACCOUNT_WORDS[r.account as "ANY"] ?? r.account, channels: r.channels, words: acceptsWords(r.channels), basis: r.basis === "SAMPLE" ? "AI_SAMPLE" : r.basis, quote: r.quote, source_url: r.sourceUrl ?? null }));
  const first = list[0];
  return { accepts: first ? list.map((r) => (r.account === "ANY" && list.length === 1 ? r.words : `${r.account_words}: ${r.words}`)).join(" · ") : null, accepts_basis: first?.basis ?? null, accepts_quote: first?.quote ?? null, accepts_accounts: list };
}

@Injectable()
export class FormLibrary {
  private canada: CanadaSource = canadaSource();
  constructor(@Inject(Db) private readonly db: Db, @Inject(Workspace) private readonly ws: Workspace, @Inject(Audit) private readonly audit: Audit, @Inject(Studio) private readonly studio: Studio) {}
  useCanada(c: CanadaSource) { this.canada = c; }

  /** The approved editions (manifest, a second person, or an official download), as one set of checksums. */
  /** C2.12 slice 2 (review 514f0d8d M4): one form's current approved edition, the same rule as the Forms list (currentEdition),
   *  read for that form alone (the guided path needs no other row). */
  async currentOf(code: string): Promise<{ edition: string; sha256: string } | null | undefined> {
    return (await this.currentOfMany([code])).get(code);
  }
  /** C2.12 slice 3 (review 28b3bba3 Major 1): the same for several forms in one set of queries (the Forms tab's chips).
   *  A form not in the library has no entry; one with no approved file yet is null. */
  async currentOfMany(codes: string[]): Promise<Map<string, { edition: string; sha256: string } | null>> {
    const workspaceId = await this.ws.id();
    const defs = codes.length ? await this.db.govFormDef.findMany({ where: { workspaceId, formKey: { in: [...new Set(codes)] } }, include: { editions: true } }) : [];
    const shas = defs.flatMap((d) => d.editions.map((e) => e.sha256)).filter((x): x is string => !!x);
    const ok = new Set([...manifest().map((i) => i.sha256), ...(shas.length ? (await this.db.approvedSource.findMany({ where: { workspaceId, sha256: { in: shas } }, select: { sha256: true } })).map((x) => x.sha256) : []), ...(shas.length ? (await this.db.officialDownload.findMany({ where: { workspaceId, sha256: { in: shas } }, select: { sha256: true } })).map((x) => x.sha256) : [])]);
    return new Map(defs.map((def) => { const cur = this.currentEdition(def.editions, ok); return [def.formKey, cur?.sha256 ? { edition: cur.editionLabel, sha256: cur.sha256 } : null] as const; }));
  }

  private async approvedShas(workspaceId: string) {
    const [a, d] = await Promise.all([this.db.approvedSource.findMany({ where: { workspaceId }, select: { sha256: true } }), this.db.officialDownload.findMany({ where: { workspaceId }, select: { sha256: true } })]);
    return { all: new Set([...manifest().map((i) => i.sha256), ...a.map((x) => x.sha256), ...d.map((x) => x.sha256)]), downloaded: new Set(d.map((x) => x.sha256)) };
  }

  /** The form's current edition: the newest approved printed one (an online-only screen map or a held file is not). The list,
   *  the fill and the check all judge "newer on canada.ca" by this one edition (X5 break M6). */
  private printedApproved<E extends { channel: string; sha256: string | null; editionLabel: string; published?: string | null }>(editions: E[], approved: Set<string>): E[] {
    return editions.filter((e) => e.channel !== "ONLINE" && !!e.sha256 && approved.has(e.sha256));
  }
  private currentEdition<E extends { channel: string; sha256: string | null; editionLabel: string; published?: string | null }>(editions: E[], approved: Set<string>): E | undefined {
    return newestEdition(this.printedApproved(editions, approved));
  }

  /** GET /library/forms/list: one lean list with type, used-by and status filters and a search (P-123). One query set. */
  async list(query: unknown, actorId?: string) {
    const q = parse(LibraryQuery, query);
    const workspaceId = await this.ws.id();
    await fillPublished(this.db, workspaceId); // C3.12: the file's own date ("File saved") for editions not read yet, once (then kept); waits at most 3 s
    const [forms, approved, held] = await Promise.all([
      this.db.govFormDef.findMany({ where: { workspaceId }, orderBy: { formKey: "asc" }, include: { editions: { include: { accepts: true } }, usedBy: { orderBy: { version: "desc" }, select: { combinationId: true, status: true, version: true, origin: true, combination: { select: { label: true } } } } } }),
      this.approvedShas(workspaceId),
      this.db.intakeItem.findMany({ where: { workspaceId, status: "HELD" }, select: { code: true, outcome: true } }),
    ]);
    // "Re-read with AI (fields and boxes)" drafts from a combination's copy of the file (today's field-map drafting).
    const atts = await this.db.sourceAttachment.findMany({ where: { workspaceId }, select: { id: true, sha256: true, combinationId: true, kind: true }, orderBy: { createdAt: "asc" } });
    // R69-1: a RETURNED change is still open (lifecycle.ts OPEN): the row keeps its state and its author keeps Withdraw.
    const lifecyclePending = await this.db.libraryChange.findMany({ where: { workspaceId, kind: "library_form", status: { in: ["WAITING", "RETURNED", "APPROVED"] } }, select: { id: true, key: true, action: true, status: true, proposedBy: true } });
    const trails = await combinationTrails(this.db, workspaceId);
    const combos = (await this.db.combination.findMany({ where: { workspaceId, retiredAt: null }, select: { id: true, label: true } })).map((c) => ({ id: c.id, label: trails.get(c.id) ?? c.label })).sort((a, b) => a.label.localeCompare(b.label));
    // X5 review M1: what makes a row more than plain, read once for the whole list.
    const lineCodes = new Set((await this.db.combinationForm.findMany({ where: { workspaceId }, distinct: ["lineageKey"], select: { lineageKey: true } })).map((x) => x.lineageKey));
    const releasedCodes = new Set((await this.db.$queryRaw<{ code: string }[]>`SELECT DISTINCT f->>'form_number' AS code FROM config_release r, jsonb_array_elements(COALESCE(r.snapshot->'forms', '[]'::jsonb)) f WHERE r.workspace_id = ${workspaceId}::uuid`).map((x) => x.code));
    const waitingAccepts = new Set((await this.db.libraryChange.findMany({ where: { workspaceId, kind: "form_accepts", status: { in: ["WAITING", "RETURNED"] } }, select: { key: true } })).map((x) => x.key));
    // C3.12: each form's field map on its current edition, read once for the whole list (one query, not one per row).
    const currents = new Map(forms.map((f) => [f.formKey, newestEdition(this.printedApproved(f.editions, approved.all))]));
    const currentIds = [...currents.values()].filter((e) => !!e).map((e) => e!.id);
    const mapRows = currentIds.length ? await this.db.formFieldMap.findMany({ where: { workspaceId, formEditionId: { in: currentIds } }, select: { formEditionId: true, dataPath: true, version: true, status: true, outcome: true } }) : [];
    // AI field-map proposals still waiting on To review, per edition (they are not field-map rows until a person accepts).
    const proposedOf = new Map((await this.db.proposalItem.groupBy({ by: ["formEdition"], where: { workspaceId, status: "waiting", step: "field_map", formEdition: { in: [...currents.values()].filter((e) => !!e).map((e) => e!.editionLabel) } }, _count: { _all: true } })).map((g) => [g.formEdition!, g._count._all]));
    const mapsOf = new Map<string, typeof mapRows>();
    for (const m of mapRows) mapsOf.set(m.formEditionId, [...(mapsOf.get(m.formEditionId) ?? []), m]);
    const rows = forms.map((f) => {
      const editions = this.printedApproved(f.editions, approved.all);
      const current = currents.get(f.formKey);
      const newestPerCombination = new Map<string, (typeof f.usedBy)[number]>();
      for (const u of f.usedBy) if (!newestPerCombination.has(u.combinationId)) newestPerCombination.set(u.combinationId, u);
      const using: { id: string; label: string; picked_by_ai: boolean; as_source?: boolean }[] = [...newestPerCombination.entries()].filter(([, u]) => u.status !== "RETIRED").map(([id, u]) => ({ id, label: trails.get(id) ?? u.combination.label, picked_by_ai: u.origin === "AI_FOUND" }));
      // Review must 1: a combination with one of its files attached as a source uses it too.
      const shas = new Set(f.editions.map((e) => e.sha256).filter(Boolean));
      for (const cid of new Set(atts.filter((a) => shas.has(a.sha256)).map((a) => a.combinationId))) if (!using.some((u) => u.id === cid)) using.push({ id: cid, label: trails.get(cid) ?? "A combination", picked_by_ai: false, as_source: true });
      const pendingChange = lifecyclePending.find((x) => x.key === f.formKey), lifecycle = pendingChange?.action ?? null;
      const needsOk = held.some((h) => h.code === f.formKey);
      // Lead 28 Oct (carried should): "Needs your OK" only when something waits for a person; a form with no file is "No file yet".
      // X5 (P156-2): "Newer edition on canada.ca" when IRCC's index lists a later month than the current edition's.
      // Review / break (e466adb1) M10, M11, automated review (89cccd71): newerOnIndex, the dates plus the date last seen current.
      const month = current ? fileMonth(current) : null;
      const indexNewer = !!current && newerOnIndex(f.indexDateModified, month, current.indexDateSeenCurrent);
      // C11.11 (P-152 (2)): a form held only as its online version has no official PDF to ask for: "Online only · no
      // official PDF", never "No file yet" (its questions come from IRCC's help pages or saved portal screens).
      const onlineOnly = !current && f.editions.length > 0 && f.editions.every((e) => e.channel === "ONLINE");
      const status = f.retiredAt ? "retired" : needsOk ? "needs_ok" : current?.newerFileSha256 || indexNewer ? "newer_file" : current ? "ready" : onlineOnly ? "online_only" : "no_file";
      return { code: f.formKey, title: f.displayName, type: TYPE_OF(f.formKind, f.displayName), edition: current?.editionLabel ?? null, ...(current ? { ...ircPublished(current, TYPE_OF(f.formKind, f.displayName)), ...fileDateOf(current.published) } : { published: null, published_from: null, published_state: "none" as const, file_date: null, file_date_state: "unread" as const }), canada_updated: current?.canadaUpdated ?? null,
        // P-143 (C-3): one record per IRCC account (ANY first); the column says them in words, one line per account.
        ...acceptsRow(current?.accepts ?? [], TYPE_OF(f.formKind, f.displayName) === "form"), accepts_waiting: waitingAccepts.has(f.formKey),
        field_map: onlineOnly ? ONLINE_ONLY_FIELD_MAP : fieldMapState(TYPE_OF(f.formKind, f.displayName), !!current, current ? effective(mapsOf.get(current.id) ?? [], (m) => m.dataPath, "draft") : [], current ? proposedOf.get(current.editionLabel) ?? 0 : 0),
        ...(onlineOnly ? { online_only: ONLINE_ONLY_WORDS } : {}),
        origin: current?.origin ?? (current?.officialFile ? "SAMPLE" : current ? "UPLOADED" : null), downloaded_from: current && approved.downloaded.has(current.sha256!) ? current.sourceUrl : null, checked_at: current?.checkedAt ?? null,
        form_page_url: f.formPageUrl ?? current?.formPageUrl ?? null, fingerprint: current?.sha256 ?? null, attachment_id: current ? atts.find((a) => a.sha256 === current.sha256 && a.kind === "Form")?.id ?? null : null,
        used_by: using, status, listed_by_ircc: !!f.listedOnIndexAt, newer_on_index: indexNewer && !current?.newerFileSha256, plain: !f.retiredAt && !f.editions.length && !lineCodes.has(f.formKey) && !releasedCodes.has(f.formKey) && !held.some((h) => h.code === f.formKey) && !pendingChange, lifecycle_waiting: lifecycle, lifecycle_approved: pendingChange?.status === "APPROVED", lifecycle_returned: pendingChange?.status === "RETURNED", older_editions: editions.filter((e) => e.id !== current?.id).sort((a, b) => compareEditions(b, a)).map((e) => ({ label: e.editionLabel, ...ircPublished(e, TYPE_OF(f.formKind, f.displayName)), ...fileDateOf(e.published) })), retired: !!f.retiredAt, pending: pendingChange ?? null };
    });
    // P-116 amended (28 Oct): one written action per row, decided by the one guard (formUses); greyed with its reason.
    // An earlier edition says what keeps it ("Kept by Release 2 of Visitor visa and 3 open cases"; P-51, never deleted).
    // X5 review M1 / break M4 (STANDARDS §9): a plain row (no file, no line, no release, nothing held or waiting) is
    // nothing anyone uses, so its one action is Delete with no reason (rowActionOf on formUses' answer for it), worked out
    // without formUses' nine queries per row: the list stays fast with IRCC's ~220 listed forms in it.
    const shaped = await Promise.all(rows.map(async ({ older_editions, retired, pending, plain, ...r }) => ({ ...r,
      action: plain ? { kind: "DELETE" as const, why: null, change_id: null } : rowActionOf(retired, await formUses(this.db, workspaceId, r.code), pending, actorId),
      older_editions: await Promise.all(older_editions.map(async (e) => ({ ...e, kept_by: await keptBy(this.db, workspaceId, e.label) }))) })));
    const term = q.q?.toLowerCase(), termCode = q.q ? normaliseCode(q.q).toLowerCase() : undefined;
    // S5's "Add a form from the library" (for=picker): forms a combination may use now, never retired or still waiting.
    const shown = shaped.filter((r) => (q.for !== "picker" || (r.status !== "retired" && !!r.edition)) && (!q.type || r.type === q.type) && (!q.usedBy || r.used_by.some((u) => u.id === q.usedBy)) && (!q.status || r.status === q.status) && (!term || r.code.toLowerCase().includes(term) || r.code.toLowerCase().includes(termCode!) || r.title.toLowerCase().includes(term)));
    const count = (pred: (r: (typeof shaped)[number]) => boolean) => shaped.filter(pred).length;
    return { rows: shown, counts: { all: shaped.length, form: count((r) => r.type === "form"), guide: count((r) => r.type === "guide"), checklist: count((r) => r.type === "checklist"), needs_ok: count((r) => r.status === "needs_ok"), no_file: count((r) => r.status === "no_file"), online_only: count((r) => r.status === "online_only"), ready: count((r) => r.status === "ready"), newer_file: count((r) => r.status === "newer_file"), retired: count((r) => r.status === "retired") },
      // X5 slice c review / break M1: the remembered deletions, each with "List again" (an upload cannot add back a number
      // the file reader does not produce, such as a schedule: this is the one way back that always works).
      remembered_deletions: (await this.db.libraryFormDeletion.findMany({ where: { workspaceId }, orderBy: { formKey: "asc" } })).map((d) => ({ code: d.formKey, deleted_by: nameOf(d.deletedBy), deleted_at: d.deletedAt.toISOString() })),
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
    const def = await this.db.govFormDef.findUnique({ where: { workspaceId_formKey: { workspaceId, formKey: code } }, include: { editions: { include: { accepts: true } } } });
    if (!def) throw problem(404, "Not in the library", `${code} is not in the library.`);
    if (TYPE_OF(def.formKind, def.displayName) !== "form") throw problem(409, "Not filed", `${code} is a ${TYPE_OF(def.formKind, def.displayName)}: it is read by AI and never filed, so IRCC does not accept it in any way.`);
    if (def.retiredAt) throw problem(409, "Retired", `${code} is retired: restore it first.`);
    const current = newestEdition(def.editions.filter((e) => e.channel !== "ONLINE"));
    if (!current) throw problem(409, "No edition yet", `${code} has no edition in the library yet.`);
    const before = current.accepts.find((a) => a.account === b.account) ?? null;
    if (before && [...before.channels].sort().join() === [...b.channels].sort().join() && (before.quote ?? "") === (b.quote ?? "")) throw problem(409, "Nothing changes", "That is already what the library says IRCC accepts for this form and account.");
    if (await this.db.libraryChange.findFirst({ where: { workspaceId, kind: "form_accepts", key: code, status: { in: ["WAITING", "RETURNED", "APPROVED"] } } })) throw problem(409, "Already waiting", `A change to what IRCC accepts for ${code} already waits for a second person on To review.`);
    const label = `${code} · IRCC accepts${b.account === "ANY" ? "" : ` ${throughAccount(b.account)}`}: ${acceptsWords(b.channels)}`;
    const c = await this.db.libraryChange.create({ data: { workspaceId, kind: "form_accepts", key: code, label, action: "SET_ACCEPTS", reason: b.quote ? `canada.ca: "${b.quote}"` : b.reason!, matches: { account: b.account, channels: b.channels, quote: b.quote ?? null, reason: b.reason ?? null, edition: current.editionLabel, before: before?.channels ?? null, form_page: def.formPageUrl ?? current.formPageUrl ?? null } as Prisma.InputJsonValue, status: "WAITING", proposedBy: actor.id } });
    // Break minor: two people proposing at once both pass the check above; the earlier one stays, the later is refused.
    const first = await this.db.libraryChange.findFirst({ where: { workspaceId, kind: "form_accepts", key: code, status: "WAITING" }, orderBy: [{ proposedAt: "asc" }, { id: "asc" }] });
    if (first && first.id !== c.id) { await this.db.libraryChange.delete({ where: { id: c.id } }); throw problem(409, "Already waiting", `A change to what IRCC accepts for ${code} already waits for a second person on To review.`); }
    await this.audit.log(workspaceId, actor.id, "proposed", "form", code, `${actor.name} proposed that IRCC accepts ${code}${b.account === "ANY" ? "" : ` ${throughAccount(b.account)}`} as ${acceptsWords(b.channels)} (${b.quote ? "canada.ca line given" : `reason: ${b.reason}`}); waits for a second person`);
    return { id: c.id, status: c.status, label };
  }

  /** "Replace with a new edition" checked against canada.ca (M6): the form's own page and its PDF, rules only, US$0. A
   *  newer printed edition is held for today's edition impact review; the same edition from a new file is marked for a
   *  person; the same file says so. Downloads go through the form finder's checks (official host, the form's page). */
  /** X5 slice a (P-156 (1), P156-1/2): fills the library from IRCC's forms-and-guides index, US$0 (the recorded copy, or
   *  canada.ca on the Mac): every number becomes a library form, a new one "Listed by IRCC · no file yet"; a form already
   *  there is matched by its number, keeps its file, and is marked "Newer edition on canada.ca" when the index's date for it
   *  changed since the last read. No AI and no PDF download. Rows without an official page are counted, never guessed. */
  async fillFromIndex(actor: Actor) {
    need(actor, "author");
    const workspaceId = await this.ws.id();
    let parsed: ReturnType<typeof parseFormsIndex>;
    try { parsed = parseFormsIndex((await this.canada.get(INDEX_URL, "html")).bytes.toString("utf8")); } catch (e) {
      // X5 break m8: the recorded copies themselves missing is said in words too, never a server error.
      throw problem(409, "IRCC's forms list could not be read", `${e instanceof CanadaError ? e.message : "The recorded copy of canada.ca's forms list could not be opened."} Nothing was added to the library.`);
    }
    if (!parsed.rows.length) throw problem(409, "IRCC's forms list could not be read", "The forms list page has no form rows (its layout may have changed). Nothing was added to the library.");
    // X5 break M1: each number in the library's own spelling (contracts' normaliseCode, as every route and the finder use:
    // "IMM 5373 B", not "IMM 5373B"), so a listed form is found, deleted and attached like any other.
    // Break m15 / review (dc93b60f, e466adb1): rows the library can show (libraryRows: a title, not over 300 characters); a
    // number with no good row is counted as unreadable, once.
    const { rows, unreadable } = libraryRows(parsed.rows.map((r) => ({ ...r, code: normaliseCode(r.code) })), parsed.unreadable);
    // X5 break m9: a file means an edition a combination may file from (an online-only screen map is no file).
    // Review (5a5f0d16) m2 / the outside check: the fill judges a form by the same current edition the list shows (an approved printed
    // edition, the newest; newestEdition), never by a held or older edition's date: one "newer" rule in both.
    const [defs, approved] = await Promise.all([this.db.govFormDef.findMany({ where: { workspaceId }, include: { editions: true } }), this.approvedShas(workspaceId)]);
    const plan = planIndexFill(rows, defs.map((d) => { const current = this.currentEdition(d.editions, approved.all); return { formKey: d.formKey, indexDateModified: d.indexDateModified, hasFile: !!current, formPageUrl: d.formPageUrl, editionMonth: current ? fileMonth(current) : null, currentId: current?.id ?? null, seenCurrent: current?.indexDateSeenCurrent ?? null }; }));
    const now = new Date();
    // X5 break m1: the count is what this fill created (two fills at once no longer both say "221 new").
    // Break m14 / the outside check on #145: the words count what this fill did, not what it planned: a form another fill created meanwhile
    // is "already in the library", one deleted meanwhile is not counted, and "newer" names only the rows this fill marked.
    const { created, already, newer, deleted } = await this.db.$transaction(async (tx) => {
      // X5 slice c (the tech lead on #138): a form a second person approved deleting is not listed again until a person adds
      // it back. Read in this transaction; a delete approved while this fill runs is undone below, after the insert.
      const gone = new Set((await tx.libraryFormDeletion.findMany({ where: { workspaceId }, select: { formKey: true } })).map((d) => d.formKey));
      const toCreate = plan.create.filter((c) => !gone.has(c.formKey));
      let made = toCreate.length ? (await tx.govFormDef.createMany({ data: toCreate.map((c) => ({ workspaceId, formKey: c.formKey, displayName: c.title, formKind: c.kind, formPageUrl: c.pageUrl, listedOnIndexAt: now, indexDateModified: c.dateModified })), skipDuplicates: true })).count : 0;
      // A delete approved meanwhile (its row committed after the read above): this fill's own new row for it goes again.
      const late = (await tx.libraryFormDeletion.findMany({ where: { workspaceId, formKey: { in: toCreate.map((c) => c.formKey) } }, select: { formKey: true } })).map((d) => d.formKey);
      if (late.length) { made -= (await tx.govFormDef.deleteMany({ where: { workspaceId, formKey: { in: late }, listedOnIndexAt: now, editions: { none: {} }, usedBy: { none: {} } } })).count; late.forEach((k) => gone.add(k)); }
      const skipped = plan.create.filter((c) => gone.has(c.formKey)).map((c) => c.formKey);
      let kept = 0; const marked: string[] = [];
      // X5 break m4: a form deleted meanwhile (an approved delete) is skipped, never a failed fill.
      for (const l of plan.listed) {
        const isNewer = plan.newer.includes(l.formKey);
        // Break / review (dc93b60f) m24: "newer" names a form only in the fill that moved its date (another fill that moved it a
        // moment earlier leaves this one's guarded write empty).
        const moved = isNewer && l.dateModified ? (await tx.govFormDef.updateMany({ where: { workspaceId, formKey: l.formKey, indexDateModified: l.before }, data: { indexDateModified: l.dateModified } })).count : 0;
        const n = (await tx.govFormDef.updateMany({ where: { workspaceId, formKey: l.formKey }, data: { listedOnIndexAt: now, ...(l.dateModified ? { indexDateModified: l.dateModified } : {}), ...(l.pageUrl ? { formPageUrl: l.pageUrl } : {}) } })).count;
        // An undated file's baseline, written only where none is (a check or another fill may have set one meanwhile).
        if (n && l.seenCurrent && l.editionId) await tx.formEdition.updateMany({ where: { id: l.editionId, indexDateSeenCurrent: null }, data: { indexDateSeenCurrent: l.seenCurrent } });
        kept += n;
        if (n && moved) marked.push(l.formKey);
      }
      return { created: made, already: kept + (plan.create.length - skipped.length - made), newer: marked, deleted: skipped };
    });
    const words = `${created} new form${created === 1 ? "" : "s"} listed (no file yet), ${already} already in the library${newer.length ? `, ${newer.length} with a newer edition on canada.ca (${newer.slice(0, 5).join(", ")}${newer.length > 5 ? "…" : ""})` : ""}${deleted.length ? `, ${deleted.length} left out that ${deleted.length === 1 ? "was" : "were"} deleted from the library (${deleted.slice(0, 5).join(", ")}${deleted.length > 5 ? "…" : ""}; "List again" under the table brings ${deleted.length === 1 ? "it" : "one"} back)` : ""}${parsed.noPage.length ? `, ${parsed.noPage.length} left out with no canada.ca page` : ""}${unreadable.length ? `, ${unreadable.length} left out whose number or title could not be read` : ""}`;
    await this.audit.log(workspaceId, actor.id, "filled", "form library", null, `${actor.name} filled the form library from IRCC's forms list: ${words}. No AI, no download, US$0.`, { created, listed: already, newer, deleted, no_page: parsed.noPage, unreadable });
    return { created, listed: already, newer, deleted, no_page: parsed.noPage, unreadable, message: `Filled from IRCC's forms list: ${words}.` };
  }

  /** P-319 (founder, 4 Nov: "no combination is hard-coded"): an author sets what a form is to IRCC's rules ([IRCC-F09]
   *  reads the family information role), with a reason, in Activity. It goes out with each combination's next release (its
   *  snapshot carries the role); a release made before keeps its own. */
  async setRole(actor: Actor, code: string, body: unknown) {
    need(actor, "author");
    const b = parse(FormRoleBody, body);
    const workspaceId = await this.ws.id();
    const def = await this.db.govFormDef.findUnique({ where: { workspaceId_formKey: { workspaceId, formKey: code } } });
    if (!def) throw problem(404, "Not in the library", `${code} is not in the library: add it first (Find forms, or Upload PDF).`);
    if (def.retiredAt) throw problem(409, "Retired", `${code} is retired: restore it in the library before you change its role.`);
    // Breaker m3: a role is what a filed form is to IRCC's rules; a guide or a checklist is never filed.
    if (b.role && libraryType(def.formKind, def.displayName) !== "form") throw problem(409, "Not a form", `${code} is a ${libraryType(def.formKind, def.displayName)}, not a form a person files, so it takes no form role.`);
    const word = (r: string | null) => (r ? FORM_ROLE_WORDS[r as keyof typeof FORM_ROLE_WORDS] ?? r : "no role");
    if ((def.formRole ?? null) === b.role) return { code, role: def.formRole, changed: false };
    // Breaker m1: changed only from the role this request read, so two changes at once never both say "changed".
    const moved = await this.db.govFormDef.updateMany({ where: { id: def.id, formRole: def.formRole }, data: { formRole: b.role } });
    if (!moved.count) throw problem(409, "Changed meanwhile", `${code}'s role was changed by someone else just now: reload and look again.`);
    await this.audit.log(workspaceId, actor.id, "updated", "form", code, `${actor.name} set ${code} to ${word(b.role)} (was ${word(def.formRole)}): ${b.reason}`, { from: def.formRole, to: b.role, reason: b.reason });
    return { code, role: b.role, changed: true };
  }

  /** X5 slice c (break / review of 02ca83a5 M1): a person brings a remembered deletion back. The memory is forgotten and the
   *  form is listed again from IRCC's forms list at once (the ordinary fill, US$0: no AI, no download). */
  async listAgain(actor: Actor, code: string) {
    need(actor, "author");
    const workspaceId = await this.ws.id();
    const memory = await this.db.libraryFormDeletion.findUnique({ where: { workspaceId_formKey: { workspaceId, formKey: code } } });
    const gone = await this.db.libraryFormDeletion.deleteMany({ where: { workspaceId, formKey: code } });
    if (!gone.count || !memory) throw problem(404, "Not a deleted form", `${code} is not among the forms deleted from the library.`);
    // Review (00007dd0) 4: a fill that fails puts the memory back, and nothing is audited as listed again.
    let fill: Awaited<ReturnType<FormLibrary["fillFromIndex"]>>;
    try { fill = await this.fillFromIndex(actor); } catch (e) {
      await this.db.libraryFormDeletion.createMany({ data: [{ workspaceId, formKey: code, deletedBy: memory.deletedBy, changeId: memory.changeId, deletedAt: memory.deletedAt }], skipDuplicates: true });
      throw e;
    }
    const back = await this.db.govFormDef.count({ where: { workspaceId, formKey: code } });
    await this.audit.log(workspaceId, actor.id, "restored", "form", code, `${actor.name} listed ${code} again: later fills from IRCC's forms list include it`);
    // Review (00007dd0) 3: the ordinary fill ran, so any other form IRCC added since the last fill is said too.
    const others = fill.created - (back && fill.created ? 1 : 0);
    const more = others > 0 ? ` The fill also listed ${others} other new form${others === 1 ? "" : "s"} from IRCC's forms list.` : "";
    return { code, listed: back > 0, others, message: (back ? `${code} is listed again (no file yet). Find again on a combination, or upload its PDF, to add its file.` : `${code} will be listed again when IRCC's forms list includes it (it is not on the list now).`) + more };
  }

  async checkCanada(actor: Actor, code: string) {
    need(actor, "author");
    try {
      const r = await this.compareWithCanada(code);
      // Review (63d2ba6d): a check that finds the library's file to be canada.ca's own is in the audit trail (it can turn a
      // row from "newer" to Ready).
      if (r.outcome === "current") await this.audit.log(await this.ws.id(), actor.id, "checked", "form", code, `${actor.name} checked ${code} against canada.ca: the library's file (${r.edition}) is canada.ca's current PDF.`, { last_updated: r.last_updated, edition: r.edition, sha256: r.sha256, baseline: r.baseline });
      if (r.outcome === "current") { const { edition: _e, sha256: _s, baseline: _b, ...shown } = r; void _e; void _s; void _b; return shown; }
      return r;
    } catch (e) {
      // canada.ca not answering (or a page not among the recorded copies) is said in words, never a server error.
      if (e instanceof CanadaError) throw problem(409, "canada.ca could not be read", `${code}: ${e.message} Upload its new edition's PDF instead, or try again later.`);
      throw e;
    }
  }

  private async compareWithCanada(code: string) {
    const workspaceId = await this.ws.id();
    const def = await this.db.govFormDef.findUnique({ where: { workspaceId_formKey: { workspaceId, formKey: code } }, include: { editions: true } });
    if (!def) throw problem(404, "Not in the library", `${code} is not in the library.`);
    // Break (6bc5eb72) m40: a guide is not checked (the page's PDF is a form's, not the guide); the API says what the UI does.
    if (TYPE_OF(def.formKind, def.displayName) === "guide") throw problem(409, "Not for guides", `${code} is a guide: the form finder reads it from canada.ca; there is no PDF to check.`);
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
    // X5 break M6: the check judges the same current edition as the list and the fill (approved, printed), so a held file
    // with canada.ca's date never answers the "newer" mark.
    const current = this.currentEdition(def.editions, (await this.approvedShas(workspaceId)).all);
    // Break (63d2ba6d) M13, M14 / review Should 1: the check compares the file itself, not dates or addresses. canada.ca's
    // PDF is downloaded (US$0) and its checksum compared with the library's current file: the same bytes are current, and
    // canada.ca's index date as it stands becomes that file's own date last seen current (never lowered: break m36), so a
    // page edited without a new edition stops reading "newer"; other bytes are not, whatever the dates say. The file is not
    // re-dated from the page (review 6bc5eb72 M: a page month would hide a later edition; fileMonth reads the printed month).
    // The outside check (0796fc0c): with no approved file there is nothing to compare: say so before downloading anything.
    if (!current?.sha256) return { outcome: "check" as const, message: `${code} has no approved file in the library to compare. Find again on a combination that uses it, or upload its PDF.`, last_updated: page.lastUpdated, pdf_url: pdfUrl };
    let pdf: Awaited<ReturnType<CanadaSource["get"]>>;
    try { pdf = await this.canada.get(pdfUrl, "pdf"); } catch (e) {
      // Break (6bc5eb72) m41: the page was read, its PDF was not; said as such, and nothing is recorded as checked (m39).
      if (e instanceof CanadaError) throw problem(409, "canada.ca's PDF could not be read", `${code}: canada.ca's form page was read but its PDF could not be downloaded (${e.message}). Nothing changed; try again later.`);
      throw e;
    }
    await this.db.formEdition.updateMany({ where: { govFormDefId: def.id }, data: { checkedAt: new Date(), formPageUrl: pageUrl } });
    if (current?.sha256 && pdf.sha256 === current.sha256) {
      // The outside check (6bc5eb72): canada.ca serving the library's own bytes again also ends a finder's "new file" marker.
      // Break (0796fc0c) m48: the finder's marker is cleared only if it is still the one this check read.
      await this.db.formEdition.updateMany({ where: { id: current.id }, data: { sourceUrl: pdfUrl } });
      if (current.newerFileSha256) await this.db.formEdition.updateMany({ where: { id: current.id, newerFileSha256: current.newerFileSha256 }, data: { newerFileSha256: null } });
      if (def.indexDateModified) await this.db.formEdition.updateMany({ where: { id: current.id, OR: [{ indexDateSeenCurrent: null }, { indexDateSeenCurrent: { lt: def.indexDateModified } }] }, data: { indexDateSeenCurrent: def.indexDateModified } });
      // Break m45 / review (0796fc0c) 4: the audit names the baseline the file keeps, not only the date this check offered.
      const baseline = (await this.db.formEdition.findUnique({ where: { id: current.id }, select: { indexDateSeenCurrent: true } }))?.indexDateSeenCurrent ?? null;
      return { outcome: "current" as const, message: `${current.editionLabel} is canada.ca's current file: the same PDF${page.lastUpdated ? ` (page last updated ${page.lastUpdated})` : ""}.`, last_updated: page.lastUpdated, edition: current.editionLabel, sha256: pdf.sha256, baseline };
    }
    // Break (6bc5eb72) M15 / review Should 4: what the check found, in words.
    return { outcome: "check" as const, message: `canada.ca now serves a different PDF for ${code} than the library's file (${current.editionLabel})${page.lastUpdated ? `; its page was last updated ${page.lastUpdated}` : ""}. Find again on a combination that uses ${code} downloads it for review (a new edition goes to edition review; the same edition from a new file is marked for you to replace), or upload canada.ca's PDF.`, last_updated: page.lastUpdated, pdf_url: pdfUrl }; // review (521bc9c4) 5: no other branch (no approved file is answered above)
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
    // C11.11 (QA-101): a guide or checklist is never one of a combination's forms (said before any file check).
    const notFiled = notFiledWords(def.formKey, def.formKind, def.displayName);
    if (notFiled) throw problem(409, "Not filed", notFiled, { errors: [{ field: "formKey", message: `A ${TYPE_OF(def.formKind, def.displayName)} is not filed.` }] });
    if (def.retiredAt) throw problem(409, "Retired", `${b.formKey} is retired in the library: restore it there first.`, { errors: [{ field: "formKey", message: "Retired." }] });
    const closing = await closingChange(this.db, c.workspaceId, def.formKey);
    if (closing) throw problem(409, "Being retired", `A request to ${closing.action.toLowerCase()} ${b.formKey} is open on To review: nothing new may use it until it is decided.`, { errors: [{ field: "formKey", message: "Being retired." }] });
    const ok = (await this.approvedShas(c.workspaceId)).all;
    // X5 break m5: a form listed by IRCC with no file at all says so (before: "its file waits for a second person").
    if (!def.editions.some((e) => e.channel !== "ONLINE")) throw problem(409, "No file yet", `${b.formKey} is listed by IRCC but has no file in the library yet: upload its PDF in the Form library, or let the form finder download it.`, { errors: [{ field: "formKey", message: "No file yet." }] });
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
    // QA-69: a release made after the change is never undone (as people Undo, Lead check L6).
    if (await this.db.configRelease.findFirst({ where: { combinationId, releasedAt: { gt: a.at } }, select: { id: true } })) throw problem(409, "Released since", "That change was released meanwhile: a release is never undone. Change it in a new draft.");
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
      await tx.$executeRaw`SET LOCAL lock_timeout = '4s'`;
      try { await tx.$queryRaw`SELECT id FROM combination_form WHERE combination_id = ${combinationId}::uuid AND lineage_key = ANY(${d.codes}) FOR UPDATE`; }
      catch { throw problem(409, "Busy", "These forms are being changed by another request right now. Try again in a moment."); }
      const step = await tx.formLineAction.findUnique({ where: { id: a.id } });
      if (step?.undoneAt) throw problem(409, "Already undone", "That change was undone a moment ago.");
      const now = await snapshotLines(tx, combinationId, d.codes);
      const changed = now.length !== d.after.length || now.some((r) => { const x = d.after.find((y) => y.id === r.id); return !x || x.status !== r.status || x.version !== r.version || (!!x.sig && x.sig !== lineSig(r)); });
      if (changed) throw problem(409, "Changed since", "One of these forms was changed after that step (by you or someone else), so it cannot be undone exactly. Change it by hand.");
      if (now.some((r) => r.status === "PUBLISHED" && !d.before.some((b) => b.id === r.id))) throw problem(409, "Released since", "That change was released meanwhile: a release is never undone. Change it in a new draft.");
      const keep = new Set(d.before.map((r) => r.id));
      await tx.combinationForm.deleteMany({ where: { id: { in: now.filter((r) => !keep.has(r.id)).map((r) => r.id) } } });
      for (const r of d.before) {
        // Lead check L1: every saved line setting comes back (age, signer, rule, channel …), not a fixed few.
        const { updatedAt, predicateJson, id, ...row } = r; void updatedAt; void id;
        // C-8 (P-143): a step recorded before the slice spells the line's channel "SIGNED_PDF_UPLOAD"; it comes back as
        // PDF upload, signed by hand and scanned.
        const old = (row.channel as string) === "SIGNED_PDF_UPLOAD" ? { channel: "PDF_UPLOAD" as const, signature: "HAND_SCANNED" as const } : {};
        const put = { ...row, ...old, predicateJson: predicateJson === null ? Prisma.DbNull : (predicateJson as Prisma.InputJsonValue) };
        await tx.combinationForm.upsert({ where: { id: r.id }, update: put, create: { id: r.id, ...put } });
      }
      await tx.formLineAction.update({ where: { id: a.id }, data: { undoneAt: new Date(), undoneBy: actor.id } });
    });
    const c = await this.db.combination.findUniqueOrThrow({ where: { id: combinationId } });
    await this.audit.log(c.workspaceId, actor.id, "undone", "form", d.codes.join(", ").slice(0, 120), `${actor.name} undid the last change on "${c.label}"'s forms (${a.action === "finder_attach" ? "the form finder's attach" : a.action}: ${d.codes.join(", ")})`, undefined, combinationId);
    return { undone: a.action, codes: d.codes, changeId: a.id };
  }
}

/** S4 slice 1 routes (contract: contracts/form-library.ts). Kept in this lane's own file so shared API edits stay small. */

/** An earlier edition is kept by the releases that file it and the open cases pinned to them (P-51: never deleted). */
async function keptBy(db: Db, workspaceId: string, edition: string): Promise<string> {
  const releases = await db.$queryRaw<{ id: string; version: number; label: string }[]>`SELECT cr.id, cr.version, c.label FROM config_release cr JOIN combination c ON c.id = cr.combination_id WHERE cr.workspace_id = ${workspaceId}::uuid AND jsonb_path_exists(cr.snapshot, '$.**.form_edition ? (@ == $e)', jsonb_build_object('e', ${edition}::text)) ORDER BY c.label, cr.version`;
  if (!releases.length) return "Kept for the record: no release or open case files it now. Never deleted.";
  const open = await db.$queryRaw<{ n: bigint }[]>`SELECT count(DISTINCT p.case_id) AS n FROM pack_work_pin p JOIN runtime_case k ON k.id = p.case_id WHERE p.config_release_id = ANY(${releases.map((r) => r.id)}::uuid[]) AND k.status = 'OPEN'`;
  const named = [...new Map(releases.map((r) => [r.label, r])).values()].map((r) => `Release ${releases.filter((x) => x.label === r.label).map((x) => x.version).join(", ")} of ${r.label}`);
  const cases = Number(open[0]?.n ?? 0);
  return `Kept by ${named.join(", ")}${cases ? ` and ${cases} open case${cases === 1 ? "" : "s"}` : ""}. Never deleted.`;
}

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
    for (const f of files) f.originalname = Buffer.from(f.originalname ?? "", "latin1").toString("utf8"); // round 4 R4-5
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
  @ConfigRead() @Post("combinations/:id/forms/find/plan") plan(@Param("id") id: string, @Body() b: unknown) { return this.finder.plan(id, b); }
  @Post("combinations/:id/forms/find") find(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.finder.launch(actorOf(a), id, b); }
  @Get("combinations/:id/forms/find") latest(@Param("id") id: string) { return this.finder.latest(id); }
  @Get("form-finder/runs/:id") run(@Param("id") id: string) { return this.finder.view(id); }
  @Post("form-finder/runs/:id/stop") stop(@Headers("x-actor") a: H, @Param("id") id: string) { return this.finder.stop(actorOf(a), id); }
  @Post("combinations/:id/forms/undo") undo(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.lib.undo(actorOf(a), id, b); }
  @Get("combinations/:id/forms/find/latest") latestForms(@Param("id") id: string) { return this.finder.latestForms(id); }
  @Post("combinations/:id/forms/:code/replace") replace(@Headers("x-actor") a: H, @Param("id") id: string, @Param("code", { transform: normaliseCode }) code: string, @Body() b: unknown) { return this.lib.replace(actorOf(a), id, code, b); }
  @Post("combinations/:id/forms") attach(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.lib.attach(actorOf(a), id, b); }
  @Delete("combinations/:id/forms/:code") remove(@Headers("x-actor") a: H, @Param("id") id: string, @Param("code", { transform: normaliseCode }) code: string, @Body() b: unknown) { return this.lib.remove(actorOf(a), id, code, b); }
  @Post("library/forms/fill-from-index") fill(@Headers("x-actor") a: H) { return this.lib.fillFromIndex(actorOf(a)); }
  @Post("library/forms/:code/role") role(@Headers("x-actor") a: H, @Param("code", { transform: normaliseCode }) code: string, @Body() b: unknown) { return this.lib.setRole(actorOf(a), code, b); }
  @Post("library/forms/:code/list-again") listAgain(@Headers("x-actor") a: H, @Param("code", { transform: normaliseCode }) code: string) { return this.lib.listAgain(actorOf(a), code); }
  @Get("library/forms/list") list(@Headers("x-actor") a: H, @Query() q: unknown) { return this.lib.list(q, readerOf(a).id); }
  @Get("library/forms/:code/uses") uses(@Param("code", { transform: normaliseCode }) code: string) { return this.lib.uses(code); }
  @Post("library/forms/:code/accepts") accepts(@Headers("x-actor") a: H, @Param("code", { transform: normaliseCode }) code: string, @Body() b: unknown) { return this.lib.proposeAccepts(actorOf(a), code, b); }
  @Post("library/forms/:code/check-canada") check(@Headers("x-actor") a: H, @Param("code", { transform: normaliseCode }) code: string) { return this.lib.checkCanada(actorOf(a), code); }
  @Delete("library/forms/:code") del(@Headers("x-actor") a: H, @Param("code", { transform: normaliseCode }) code: string, @Body() b: unknown) { return this.lifecycle.propose(actorOf(a), "library_form", code, "DELETE", parse(LifecycleReasonBody, b).reason); }
  @Post("library/forms/:code/retire") retire(@Headers("x-actor") a: H, @Param("code", { transform: normaliseCode }) code: string, @Body() b: unknown) { return this.lifecycle.propose(actorOf(a), "library_form", code, "RETIRE", parse(LifecycleReasonBody, b).reason); }
  @Post("library/forms/:code/restore") restore(@Headers("x-actor") a: H, @Param("code", { transform: normaliseCode }) code: string, @Body() b: unknown) { return this.lifecycle.propose(actorOf(a), "library_form", code, "RESTORE", parse(LifecycleReasonBody, b).reason); }
}
type H = string | undefined;
