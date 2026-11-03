// The one form intake (P-51; Screen 01 early look items 8 and 9). Every upload goes through here: a combination's
// sources, "+ Add form" on the combination page, the sample loader (standing in for a person) and, at Screen 04, the
// Forms library's own "Add forms" (no combination). One or many files; one result per file. What a file is (code,
// title, printed edition, published date, kind) is read from the file without AI (tools/read_form_identity.py); its
// checksum decides identity:
//   identical file already in the library → "in_library" (attached to the combination; a form whose boxes are already
//     mapped is then one click away, "Add N forms from the library": the intake never edits a configuration itself)
//   a form or checklist the library does not have → "added" to the library, then attached ("used by" follows from that)
//   a guide (a saved web page or a guide PDF, no edition) → "attached" to the combination as a source; not a library form
//   the same code with a newer edition (printed month and year) → "new_edition_held": never attached or used
//     silently; it waits for the impact review (P-32, P-38; the review itself is Screen 02)
//   the same code with an older edition → "older_edition_held": "Older edition: not used" (review #5)
//   an identical file that is in the library only as an older edition (a newer one was accepted since, P-123) →
//     "older_in_library": "Older edition: not used", naming the edition in use; never attached, never "Already in the library"
//   a code and edition that cannot be read, or the same edition printed on a different file → "held" for a person
//   a French version (same code and edition as the English one, "IMM 5257 (09-2023) F") → "held": never taken for the
//     English edition, never approved into the library as one (PDF hardening, 26 Oct)
//   a readable form/checklist whose checksum is not on the approved source manifest → held before library, attachment,
//     edition-impact review or AI use; source verification must come first
//   not a PDF or a saved web page → "refused" before anything reads it
//   anything unexpected → "failed" for that file only; a batch never fails as a whole (review #2, break M2)
// AI maps a form's boxes only later, once, when the form is first used in a combination (Sources → Draft with AI).
import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import type { IntakeItem } from "@prisma/client";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { promisify } from "node:util";
import { manifest } from "../../engine/import.ts";
import { editionMonth, newestEdition } from "../../engine/programs.ts";
import { ACTORS, Audit, Db, fail, need, OFFICIAL, PY, ROOT, STUDIO, VAR, Workspace, type Actor } from "./core.ts";
import { recordApproval, Sources } from "./sources.ts";
import { Finder } from "./finder.ts";
import { forgetDeletion } from "./library-deletions.ts";

const run = promisify(execFile);
const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");
export const MAX_FILES = 20, MAX_BYTES = 25 * 1024 * 1024;
export type IntakeFile = { originalname: string; buffer: Buffer };
export type IntakeOutcome = "in_library" | "older_in_library" | "added" | "attached" | "new_edition_held" | "older_edition_held" | "held" | "refused" | "failed";
export type IntakeResult = {
  file: string; outcome: IntakeOutcome; message: string; kind: string; code: string | null; title: string | null; edition: string | null; published: string | null; sha256: string | null;
  /** Set when the file was attached to the combination it was uploaded on. */
  attachmentId?: string; attachmentStatus?: string;
  /** C11.7 (P-297 (2)): where the edition came from: printed next to the code, the form template's Version variable, or
   *  the official source list (only when the file's SHA-256 is that entry's). */
  editionFrom?: EditionFrom;
};
export type EditionFrom = "printed" | "form_template" | "manifest";
type ManifestItem = { file: string; edition?: string; sha256: string };
/** What the reader said about one file (tools/read_form_identity.py's JSON line). */
type ReadId = { ok: boolean; kind?: string; code?: string | null; edition?: string; edition_label?: string; edition_from?: EditionFrom; error?: string; title?: string | null; published?: string | null; language?: string };

/** C11.7 (P-297 (2)): a form whose code the reader found but whose edition it could not read. The official source list's
 *  recorded edition is taken only when this exact file is that entry (same SHA-256) and the entry names the same code
 *  with a plain "CODE (MM-YYYY)" edition; otherwise nothing is taken. A file whose code IS on the list under a different
 *  checksum is "mismatched": refused, never held as if a person could approve it. Pure, so every path is tested alone. */
export function editionFromManifest(id: ReadId, hash: string, items: ManifestItem[]): { use: ReadId } | { mismatch: ManifestItem } | null {
  if (id.ok || !id.code || !/no edition date/.test(id.error ?? "")) return null;
  const parse = (e?: string) => /^([A-Z]{2,4} \d{4}(?: [A-Z0-9]+)?) \((\d{2}-\d{4})\)$/.exec((e ?? "").trim());
  const entry = items.find((i) => i.sha256 === hash);
  const p = entry ? parse(entry.edition) : null;
  if (entry && p && p[1] === id.code) return { use: { ...id, ok: true, edition: p[2], edition_label: `${p[1]} (${p[2]})`, edition_from: "manifest", language: "en" } };
  if (entry) return null; // on the list, but its recorded edition is not a plain one for this code: a person decides
  const listed = items.find((i) => parse(i.edition)?.[1] === id.code);
  return listed ? { mismatch: listed } : null;
}
const FRENCH = "French-language version of an English edition";
/** C11.7: the audit line says which way the edition was found (P-297 (2): "record which way was used"). */
const EDITION_WORDS: Record<EditionFrom, string> = { printed: "code, title, edition and kind read from the file", form_template: "code, title and kind read from the file; the edition from the form template's own Version variable (none printed next to the code)", manifest: "code, title and kind read from the file; the edition from the official source list, because the file does not carry it and its SHA-256 is that entry's" };
const KIND_WORD: Record<string, string> = { form: "form", checklist: "document checklist", guide: "guide", portal_screen: "saved portal screen", unknown: "file" };

@Injectable()
export class Intake {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Workspace) private readonly ws: Workspace, @Inject(Audit) private readonly audit: Audit, @Inject(Sources) private readonly sources: Sources, @Inject(Finder) private readonly finder: Finder) {}

  /** POST /intake: one or many files, optionally on a combination. Files are handled one after the other, so two copies
   *  of the same new form in one batch give "added" then "in_library", never two forms. */
  async intake(actor: Actor, files: IntakeFile[] | undefined, combinationId?: string, via: "MANUAL" | "SAMPLE" = "MANUAL", forForm?: { combinationId: string; code: string }) {
    need(actor, "author");
    if (!files?.length) fail("Choose at least one file.");
    if (files!.length > MAX_FILES) fail(`Add at most ${MAX_FILES} files at a time.`, HttpStatus.PAYLOAD_TOO_LARGE);
    const workspaceId = await this.ws.id();
    const combination = combinationId ? await this.db.combination.findUnique({ where: { id: combinationId } }) : null;
    if (combinationId && !combination) fail("That combination does not exist (it may have been removed by a reset).", HttpStatus.NOT_FOUND);
    if (forForm && !(await this.db.combination.findUnique({ where: { id: forForm.combinationId } }))) fail("That combination does not exist (it may have been removed by a reset).", HttpStatus.NOT_FOUND);
    const results: IntakeResult[] = [];
    for (const f of files!) {
      const r = await this.oneSafely(actor, workspaceId, f, combination, via);
      results.push(forForm ? await this.forForm(actor, workspaceId, forForm, r) : r);
    }
    const n = (o: IntakeOutcome) => results.filter((r) => r.outcome === o).length;
    return { results, summary: { files: results.length, in_library: n("in_library"), older_in_library: n("older_in_library"), added: n("added"), attached: n("attached"), held: n("new_edition_held") + n("older_edition_held") + n("held"), refused: n("refused"), failed: n("failed") } };
  }

  /** One file, never the whole batch: two uploads of the same file at the same moment race to one database record
   *  (unique form edition; one held record per checksum). The loser's write is refused (P2002); the file is then
   *  looked at again and gets the winner's answer ("already in the library", "already waiting"). Anything else fails
   *  this file only, with a plain reason. */
  private async oneSafely(actor: Actor, workspaceId: string, f: IntakeFile, combination: { id: string; label: string } | null, via: "MANUAL" | "SAMPLE"): Promise<IntakeResult> {
    for (let attempt = 0; ; attempt++) {
      try { return await this.one(actor, workspaceId, f, combination, via); }
      catch (e) {
        if ((e as { code?: string } | null)?.code === "P2002" && attempt < 3) continue;
        console.error(e);
        const file = basename(f.originalname || "upload").replace(/[^A-Za-z0-9._-]/g, "_").slice(-80) || "upload.bin";
        return { file, outcome: "failed", kind: "unknown", code: null, title: null, edition: null, published: null, sha256: f.buffer?.length ? sha(f.buffer) : null, message: "This file could not be added just now; nothing was changed for it. Try it again." };
      }
    }
  }

  /** The sample loader's files (scaffolding): the same intake with an official file's bytes, as a person's upload. */
  async sample(actor: Actor, combinationId: string, officialFile: string) {
    const item = manifest().find((i) => i.file === officialFile);
    if (!item) fail("That sample is not in the official library.");
    const r = (await this.intake(actor, [{ originalname: item!.file, buffer: readFileSync(join(OFFICIAL, item!.path)) }], combinationId, "SAMPLE")).results[0];
    return r;
  }

  /** S4 (S5 ask): an upload from a combination's "Not found" row. Usable now (in the library, approved, or equal to
   *  canada.ca's file) → attached to that combination as one change for Undo; held → remembered and attached when a second
   *  person approves it; another form's file is added to the library, never attached in its place. */
  private async forForm(actor: Actor, workspaceId: string, t: { combinationId: string; code: string }, r: IntakeResult): Promise<IntakeResult> {
    if (r.outcome === "held" || r.outcome === "new_edition_held" || r.outcome === "older_edition_held") {
      if (r.sha256) await this.db.intakeItem.updateMany({ where: { workspaceId, sha256: r.sha256, status: "HELD" }, data: { forCombinationId: t.combinationId, forCode: t.code } });
      return { ...r, message: `${r.message} It is attached to the combination once a second person approves it.` };
    }
    if (r.outcome !== "added" && r.outcome !== "in_library") return r;
    if (r.code && r.code !== t.code) return { ...r, message: `${r.message} This file is ${r.code}, not ${t.code}, so it was not attached in its place.` };
    const def = await this.db.govFormDef.findUnique({ where: { workspaceId_formKey: { workspaceId, formKey: t.code } } });
    if (!def) return r;
    const { addFormLine } = await import("./form-lines.ts");
    const { snapshotLines, recordAction } = await import("./form-uses.ts");
    const before = await snapshotLines(this.db, t.combinationId, [t.code]);
    let added: "added" | "already";
    try { added = await addFormLine(this.db, { workspaceId, combinationId: t.combinationId, govFormDefId: def.id, formKey: t.code, origin: "HUMAN", by: actor.id, sourceQuote: `${r.edition ?? t.code}: uploaded for this combination` }); }
    catch (e) { return { ...r, message: `${r.message} Not attached to the combination: ${(e as Error).message}` }; }
    if (added === "added") await recordAction(this.db, { workspaceId, combinationId: t.combinationId, action: "attach", codes: [t.code], before, by: actor.id });
    return { ...r, message: `${r.message} ${added === "added" ? "Attached to the combination." : "Already on the combination."}` };
  }

  private async approvedInProduct(workspaceId: string, hash: string) {
    const a = await this.db.approvedSource.findUnique({ where: { workspaceId_sha256: { workspaceId, sha256: hash } } });
    if (a) return { approval: `Approved in the product by ${ACTORS.find((x) => x.id === a.approvedBy)?.name ?? "a second person"} (IRCC page ${a.irccPage})` };
    // S4 (M2, Q-L1): downloaded from canada.ca by the form finder, or a hand upload equal to canada.ca's file.
    const d = await this.db.officialDownload.findUnique({ where: { workspaceId_sha256: { workspaceId, sha256: hash } } });
    return d ? { approval: `${d.basis === "download" ? "Downloaded from canada.ca" : "Same file as canada.ca's"} (${d.formPageUrl})` } : undefined;
  }

  /** P-80: the uploader records the IRCC page a held file came from, for the second person to compare. */
  async recordPage(actor: Actor, id: string, body: { irccPage?: string }) {
    need(actor, "author");
    const h = await this.heldFile(id);
    if (h.createdBy !== actor.id) fail("The person who uploaded the file records the IRCC page it came from.", HttpStatus.FORBIDDEN);
    const page = String(body?.irccPage ?? "").trim();
    if (!/^https:\/\/(www\.)?canada\.ca\/\S+$/.test(page)) fail("Paste the canada.ca page the file came from (it starts with https://www.canada.ca/).");
    if (page.length > 500) fail("That page address is longer than 500 characters: paste the page itself, not a search result.");
    await this.db.intakeItem.update({ where: { id }, data: { irccPage: page } });
    await this.audit.log(h.workspaceId, actor.id, "recorded", "held file", h.code ?? h.fileName, `${actor.name} recorded the IRCC page of ${h.editionLabel ?? h.fileName}: ${page}`, undefined, h.combinationId ?? undefined);
    return view((await this.db.intakeItem.findUniqueOrThrow({ where: { id } })));
  }

  /** P-80: a second person (never the uploader) compares the file with the IRCC page and approves it: its checksum joins
   *  the approved list, and the stored file goes through the intake again for the uploader. Or rejects it, with a reason. */
  async decideHeld(actor: Actor, id: string, decision: "approve" | "reject", body: { note?: string; irccPage?: string }) {
    need(actor, "review");
    const h = await this.heldFile(id, decision === "reject");
    if (h.createdBy === actor.id) fail("You uploaded this file, so a different person checks its source.", HttpStatus.FORBIDDEN);
    if (decision === "reject") {
      if (!body?.note?.trim()) fail("Say why it is rejected, so the uploader knows.");
      if (body.note!.length > 300) fail("Keep the reason under 300 characters.");
      const done = await this.db.intakeItem.updateMany({ where: { id, status: "HELD" }, data: { status: "DONE", outcome: "refused", reason: `${h.outcome === "held" ? "Rejected" : "Set aside"} by ${actor.name}: ${body.note!.trim()}` } });
      if (!done.count) fail("Someone decided this file at the same moment. Refresh to see it.", HttpStatus.CONFLICT);
      // #300 m4: an approved older or new edition is set aside, not rejected as a source (its approval stays on record).
      const setAside = h.outcome !== "held";
      // C9.1 break M4: the waiting AI proposals drafted for this held edition go with it; none can be accepted later.
      const jobs = (await this.db.draftingJob.findMany({ where: { workspaceId: h.workspaceId, kind: "field_map_impact", detail: { path: ["held"], equals: id } }, select: { id: true } })).map((j) => j.id);
      if (jobs.length) await this.db.proposalItem.updateMany({ where: { runId: { in: jobs }, status: "waiting" }, data: { status: "rejected", decidedBy: actor.id, decidedAt: new Date(), decisionReason: `The edition was set aside by ${actor.name}: ${body.note!.trim()}`.slice(0, 500) } });
      await this.audit.log(h.workspaceId, actor.id, setAside ? "set aside" : "rejected", "held file", h.code ?? h.fileName, setAside ? `${actor.name} set aside ${h.editionLabel ?? h.fileName} (an edition not used): ${body.note!.trim()}` : `${actor.name} rejected ${h.editionLabel ?? h.fileName} as a source: ${body.note!.trim()}`, undefined, h.combinationId ?? undefined);
      return { outcome: setAside ? "set aside" : "rejected" };
    }
    if (!h.irccPage) fail("The uploader records the IRCC page the file came from first; then compare and approve.", HttpStatus.CONFLICT);
    // Break m5: what is approved is the page the second person saw, not one changed after they opened it.
    if (body?.irccPage !== undefined && body.irccPage !== h.irccPage) fail("The IRCC page changed after you opened this file. Look at it again, then approve.", HttpStatus.CONFLICT);
    const no = (await this.cannotApprove([h])).get(h.id);
    if (no) fail(no, HttpStatus.CONFLICT);
    // The claim and the approved list change together (break M4: a refused second write left the row decided).
    const bytes = h.storedPath ? readFileSync(h.storedPath.startsWith("/") ? h.storedPath : join(ROOT, h.storedPath)) : null;
    if (bytes && sha(bytes) !== h.sha256) fail("The held file is no longer stored as it was uploaded. Reject it and upload the official PDF again.", HttpStatus.CONFLICT);
    const row = await this.db.$transaction(async (tx) => {
      const claimed = await tx.intakeItem.updateMany({ where: { id, status: "HELD" }, data: { status: "DONE", reason: `Approved as a source by ${actor.name}` } });
      if (!claimed.count) fail("Someone decided this file at the same moment. Refresh to see it.", HttpStatus.CONFLICT);
      if (await tx.approvedSource.findUnique({ where: { workspaceId_sha256: { workspaceId: h.workspaceId, sha256: h.sha256 } } })) fail("This file is already on the approved list.", HttpStatus.CONFLICT);
      return tx.approvedSource.create({ data: { workspaceId: h.workspaceId, sha256: h.sha256, kind: h.kind, code: h.code, edition: h.editionLabel, fileName: h.fileName, irccPage: h.irccPage!, intakeItemId: h.id, uploadedBy: h.createdBy, approvedBy: actor.id } });
    });
    // The drafting guard cannot see the database: the approval and the approved bytes go where it checks them (P-80). A
    // file held without its bytes (already in the library) gets them when it is read from an attachment (sources.ts).
    if (bytes) recordApproval(row, bytes);
    await this.audit.log(h.workspaceId, actor.id, "approved", "held file", h.code ?? h.fileName, `${actor.name} approved ${h.editionLabel ?? h.fileName} as a source (IRCC page ${h.irccPage}); uploaded by ${ACTORS.find((x) => x.id === h.createdBy)?.name ?? "a person"}`, { sha256: h.sha256 }, h.combinationId ?? undefined);
    // The file goes through the one intake again, for the uploader, now that it is approved.
    const uploader = ACTORS.find((x) => x.id === h.createdBy);
    let result: IntakeResult | null = null;
    if (uploader && bytes) {
      const combination = h.combinationId ? await this.db.combination.findUnique({ where: { id: h.combinationId } }) : null;
      try { result = await this.oneSafely(uploader, h.workspaceId, { originalname: h.fileName, buffer: bytes }, combination, "MANUAL"); } catch { result = null; }
      if (result && h.forCombinationId && h.forCode) result = await this.forForm(uploader, h.workspaceId, { combinationId: h.forCombinationId, code: h.forCode }, result);
    }
    return { outcome: "approved", result };
  }

  /** A held file waiting for its source check; with `anyHold`, also a held new or older edition, which a second person
   *  may set aside with a reason (break M5: an edition approved in the product could never be compared or removed). */
  private async heldFile(id: string, anyHold = false) {
    const h = await this.db.intakeItem.findUnique({ where: { id } }).catch(() => null);
    if (!h) fail("This held file does not exist (the demo may have been reset).", HttpStatus.NOT_FOUND);
    const kinds = anyHold ? ["held", "new_edition_held", "older_edition_held"] : ["held"];
    if (h!.status !== "HELD" || !kinds.includes(h!.outcome)) fail("This file is not waiting for a source check.", HttpStatus.CONFLICT);
    return h!;
  }

  /** M6: the held file itself, for the second person to compare with the IRCC page (opened in the browser, never run). */
  async heldBytes(id: string) {
    const h = await this.db.intakeItem.findUnique({ where: { id } }).catch(() => null);
    if (!h || h.status !== "HELD" || !h.storedPath) fail("This held file is not stored (or it is decided).", HttpStatus.NOT_FOUND);
    const path = h!.storedPath.startsWith("/") ? h!.storedPath : join(ROOT, h!.storedPath);
    const bytes = readFileSync(path);
    if (!bytes.subarray(0, 5).toString("latin1").startsWith("%PDF-")) fail("Only a held PDF is shown here.", HttpStatus.NOT_FOUND);
    return { bytes, name: h!.fileName };
  }

  /** Files waiting for a person (held), newest first; with a combination, only those uploaded on it or for its forms. */
  async held(combinationId?: string) {
    const workspaceId = await this.ws.id();
    let rows = await this.db.intakeItem.findMany({ where: { workspaceId, status: "HELD" }, orderBy: { createdAt: "desc" } });
    if (combinationId) {
      const codes = new Set((await this.db.combinationForm.findMany({ where: { combinationId, status: { not: "RETIRED" } }, include: { form: true } })).map((f) => f.form.formKey));
      for (const a of await this.db.sourceAttachment.findMany({ where: { combinationId }, select: { edition: true } })) if (a.edition) codes.add(a.edition.split(" (")[0]);
      rows = rows.filter((r) => r.combinationId === combinationId || (r.code && codes.has(r.code)));
    }
    // Review-4 Minor 2: the page says before anyone clicks when approval would be refused, and offers Reject instead.
    const no = await this.cannotApprove(rows);
    return rows.map((r) => ({ ...view(r), cannotApprove: no.get(r.id) ?? null }));
  }

  /** Why each held file can never become an official source (approving it is refused), or nothing when it can. */
  private async cannotApprove(rows: IntakeItem[]) {
    const labels = [...new Set(rows.map((r) => r.editionLabel).filter((x): x is string => !!x))];
    const held = labels.length ? await this.db.formEdition.findMany({ where: { workspaceId: { in: [...new Set(rows.map((r) => r.workspaceId))] }, editionLabel: { in: labels } }, select: { workspaceId: true, editionLabel: true, sha256: true, officialFile: true } }) : [];
    const why = new Map<string, string>();
    for (const h of rows) {
      // Break M4: only a file whose form code and edition were read from it becomes an official source.
      if (h.reason === FRENCH) why.set(h.id, "This is a French version: it has the English edition's code and edition, so it cannot become that edition's source. Reject it, or upload the English PDF.");
      else if (!h.code || !h.editionLabel || !["form", "checklist"].includes(h.kind)) why.set(h.id, "Its form code and edition could not be read from the file, so it cannot become an official source. Reject it and upload the official PDF.");
      else {
        // Review-3 Major 1: a copy of an edition the library already holds from another file can never be used (one
        // edition, one file), so approving it would only send it round the intake to be held again.
        const already = held.find((e) => e.workspaceId === h.workspaceId && e.editionLabel === h.editionLabel);
        if (already && already.sha256 !== h.sha256) why.set(h.id, `The library already holds ${h.editionLabel} from ${already.officialFile ? "the official file" : "another file"}, so this copy is not needed: reject it with that reason, and add ${h.code} from the library.`);
      }
    }
    return why;
  }

  private async one(actor: Actor, workspaceId: string, file: IntakeFile, combination: { id: string; label: string } | null, via: "MANUAL" | "SAMPLE"): Promise<IntakeResult> {
    const name = basename(file.originalname || "upload").replace(/[^A-Za-z0-9._-]/g, "_").slice(-80) || "upload.bin";
    const base = { file: name, kind: "unknown", code: null, title: null, edition: null, published: null, sha256: null } as const;
    if (!file.buffer?.length) return { ...base, outcome: "refused", message: "The file is empty." };
    if (file.buffer.length > MAX_BYTES) return { ...base, outcome: "refused", message: "The file is larger than 25 MB." };
    const head = file.buffer.subarray(0, 512).toString("latin1");
    if (!head.startsWith("%PDF-") && !/^\s*(<!doctype html|<html)/i.test(head)) return { ...base, outcome: "refused", message: "Only PDF files and saved web pages (HTML) can be added. Nothing was read." };
    const hash = sha(file.buffer);
    const attach = async (r: IntakeResult): Promise<IntakeResult> => {
      if (!combination) return r;
      // S4 round 4 R4-1 (P-116): a retired library form, or one whose retire or delete is open, gets no new use as a source.
      if (r.code) {
        const def = await this.db.govFormDef.findUnique({ where: { workspaceId_formKey: { workspaceId, formKey: r.code } }, select: { retiredAt: true } });
        const closing = def ? await this.db.libraryChange.findFirst({ where: { workspaceId, kind: "library_form", key: r.code, action: { in: ["RETIRE", "DELETE"] }, status: { in: ["WAITING", "APPROVED"] } } }) : null;
        if (def?.retiredAt || closing) return { ...r, message: `${r.message} Not attached to ${combination.label}: ${def?.retiredAt ? `${r.code} is retired in the library (restore it there first).` : `a request to ${closing!.action.toLowerCase()} ${r.code} is open on To review.`}` };
      }
      const a = await this.sources.attach(actor, combination.id, file, via);
      return { ...r, attachmentId: a.attachment.id, attachmentStatus: a.attachment.status, message: `${r.message} ${a.duplicate ? `Already attached to ${combination.label}.` : `Attached to ${combination.label}.`}` };
    };

    // Approved: on the official manifest, or approved in the product by a second person (P-80, ApprovedSource).
    const approved = manifest().find((i) => i.sha256 === hash) ?? await this.approvedInProduct(workspaceId, hash);
    // A matching old library record does not override source verification. Never attach an unapproved
    // checksum just because it was present in a workspace before this gate existed.
    const same = await this.db.formEdition.findFirst({ where: { workspaceId, sha256: hash }, include: { form: true, _count: { select: { maps: true } } } });
    if (same) {
      const kind = same.form.formKind === "data_form" ? "form" : "checklist";
      if (!approved) {
        const r: IntakeResult = { file: name, outcome: "held", kind, code: same.form.formKey, title: same.form.displayName, edition: same.editionLabel, published: null, sha256: hash, message: `Held for source verification: ${same.editionLabel} is not on the approved source list. It was not attached or sent to AI.` };
        await this.record(actor, workspaceId, combination?.id ?? null, name, null, hash, file.buffer.length, r, "HELD", "checksum not on approved source manifest");
        return r;
      }
      // C2.4 AT-9: the library holds this file only as an older edition (a newer printed one was accepted since): it is said to
      // be older and not used, naming the edition in use, and it is never attached as if it were the one in the library.
      const inUse = same.channel === "ONLINE" ? undefined : newestEdition(await this.db.formEdition.findMany({ where: { workspaceId, govFormDefId: same.govFormDefId, channel: { not: "ONLINE" } }, select: { id: true, editionLabel: true, published: true } }));
      if (inUse && inUse.id !== same.id && editionMonth(inUse.editionLabel) > editionMonth(same.editionLabel)) {
        const older: IntakeResult = { file: name, outcome: "older_in_library", kind, code: same.form.formKey, title: same.form.displayName, edition: same.editionLabel, published: null, sha256: hash, message: `Older edition: not used. ${same.editionLabel} is kept in the library only as an older edition; the library uses ${inUse.editionLabel}. Nothing duplicated${combination ? `, and not attached to ${combination.label}` : ""}.` };
        await this.record(actor, workspaceId, combination?.id ?? null, name, null, hash, file.buffer.length, older, "DONE");
        return older;
      }
      let r: IntakeResult = { file: name, outcome: "in_library", kind, code: same.form.formKey, title: same.form.displayName, edition: same.editionLabel, published: null, sha256: hash, message: `Already in the library: ${same.editionLabel}. Nothing duplicated.` };
      r = await attach(r);
      // Boxes already mapped: no AI needed. The person adds it with one click (the row's next step, "Add N forms from the
      // library"); the intake never changes a combination's configuration by itself.
      if (combination && kind === "form" && same._count.maps) r = { ...r, message: `${r.message} Its form fields are already mapped, so no AI is needed: add it from the library (next step).` };
      await this.record(actor, workspaceId, combination?.id ?? null, name, null, hash, file.buffer.length, r, "DONE");
      return r;
    }
    const waiting = await this.db.intakeItem.findFirst({ where: { workspaceId, sha256: hash, status: "HELD" } });
    if (waiting) return { file: name, outcome: waiting.outcome as IntakeOutcome, kind: waiting.kind, code: waiting.code, title: waiting.title, edition: waiting.editionLabel, published: waiting.published, sha256: hash, message: `Already waiting for a person: ${waiting.reason ?? "held"}. Nothing duplicated.` };

    const dir = join(VAR("demo"), "intake"); mkdirSync(dir, { recursive: true });
    const stored = join(dir, `${hash.slice(0, 12)}-${name}`);
    writeFileSync(stored, file.buffer);
    const { stdout } = await run(PY, ["-I", join(STUDIO, "tools", "read_form_identity.py"), stored], { cwd: ROOT, timeout: 60_000 });
    let id = JSON.parse(stdout.trim().split("\n").pop()!) as ReadId;
    // C11.7 (P-297 (2)): no edition in the file → the official list's, only for exactly its file; a mismatched file is refused.
    const listed = editionFromManifest(id, hash, manifest() as ManifestItem[]);
    if (listed && "mismatch" in listed) {
      const r: IntakeResult = { file: name, outcome: "refused", kind: id.kind ?? "unknown", code: id.code ?? null, title: id.title ?? null, edition: null, published: id.published ?? null, sha256: hash,
        message: `Refused: we could not read the edition of ${id.code} from this file, and it is not the official ${listed.mismatch.file} on the source list (${listed.mismatch.edition}): its checksum is different. Nothing was added or attached. Upload the official PDF from IRCC; if this is a newer edition, it needs its own row on the source list first.` };
      await this.record(actor, workspaceId, combination?.id ?? null, name, "", hash, file.buffer.length, r, "DONE", "edition not readable and checksum not the source list's file");
      rmSync(stored, { force: true });
      return r;
    }
    if (listed) id = listed.use;
    const editionFrom: EditionFrom | undefined = id.ok && id.edition_label ? id.edition_from ?? "printed" : undefined;
    const read = { kind: id.kind ?? "unknown", code: id.code ?? null, title: id.title ?? null, edition: id.edition_label ?? null, published: id.published ?? null, sha256: hash };

    if (!id.ok) {
      // The reader's own words when they are plain ("no form code … found"); never an error class name.
      const why = id.error && !/error|exception|traceback/i.test(id.error) ? id.error : "the file could not be opened as a PDF";
      const what = id.code ? `the edition of ${id.code}` : "the form code and edition";
      const r: IntakeResult = { file: name, outcome: "held", ...read, message: `Held for a person: we could not read ${what} from this file (${why}). Nothing was added or attached.` };
      await this.record(actor, workspaceId, combination?.id ?? null, name, stored, hash, file.buffer.length, r, "HELD", `We could not read ${what} from this file`);
      return r;
    }
    // A French version prints the English edition's code and edition: held, so it is never filed as the English edition.
    if (id.language === "fr" && (read.kind === "form" || read.kind === "checklist")) {
      const r: IntakeResult = { file: name, outcome: "held", ...read, message: `Held for a person: this is the French version of ${read.edition}. The library keeps each form's English edition, so it was not added to the library, attached or sent to AI.` };
      await this.record(actor, workspaceId, combination?.id ?? null, name, stored, hash, file.buffer.length, r, "HELD", FRENCH);
      return r;
    }
    // S4 (Q-L1): a hand upload whose checksum equals the PDF behind the canada.ca form page's link is an official
    // download (P-123's own fallback): no second person. canada.ca not answering leaves it held, as before.
    const matched = (read.kind === "form" || read.kind === "checklist") && !approved && id.code ? await this.finder.fingerprintMatch(workspaceId, String(id.code), hash, stored, name, file.buffer.length, actor.id) : null;
    const official = approved ?? (matched ? { approval: `Same file as canada.ca's (${matched})` } : undefined);
    // Readable form identity is not proof of an official source. Hold before library creation,
    // combination attachment, edition-impact processing, or any downstream AI mapping.
    if ((read.kind === "form" || read.kind === "checklist") && !official) {
      // Said at once when the library already has this edition from another file: the second person rejects the copy.
      const have = id.edition_label ? await this.db.formEdition.findUnique({ where: { workspaceId_editionLabel: { workspaceId, editionLabel: id.edition_label } } }) : null;
      const r: IntakeResult = { file: name, outcome: "held", ...read, message: `Held for source verification: ${read.edition ?? read.code ?? "This form"} is not on the approved source list. It was not added to the library, attached, or sent to AI.${have ? ` The library already holds ${id.edition_label} from ${have.officialFile ? "the official file" : "another file"}, so this copy is not needed: use the library's.` : ""}` };
      await this.record(actor, workspaceId, combination?.id ?? null, name, stored, hash, file.buffer.length, r, "HELD", "checksum not on approved source manifest");
      await this.audit.log(workspaceId, actor.id, "held", "form", read.code ?? name, `${actor.name} uploaded an unverified form source; held before library, attachment or AI use`, { sha256: hash }, combination?.id);
      return r;
    }
    // F1 (challenge point 1), W1-02 (P-102): a saved portal screen is never kept as a guide; forms come in only as their
    // official PDF (an online-only form is read from its PDF twin).
    if (read.kind === "portal_screen") {
      const r: IntakeResult = { file: name, outcome: "refused", ...read, message: "This is a saved portal screen, not a form or a guide: forms come in only as their official PDF. Add the form's PDF from IRCC instead. Nothing was added or attached." };
      await this.record(actor, workspaceId, combination?.id ?? null, name, "", hash, file.buffer.length, r, "DONE", "saved portal screen: forms come in only as PDFs");
      rmSync(stored, { force: true });
      return r;
    }
    if (read.kind === "guide") {
      const r: IntakeResult = { file: name, outcome: "attached", ...read, message: combination ? `A guide (${read.title}): kept as a source of this combination; guides are not library forms.` : "A guide is kept as a source of a combination: add it on that combination's Sources. Nothing was added." };
      if (!combination) return { ...r, outcome: "refused" };
      const out = await attach(r);
      await this.record(actor, workspaceId, combination.id, name, stored, hash, file.buffer.length, out, "DONE");
      return out;
    }

    // A form or checklist with a code and an edition read from the file.
    // ok, with a code and an edition (the reader's or the source list's, above): said once for the type checker.
    const known = id as ReadId & { code: string; edition_label: string };
    const def = await this.db.govFormDef.findUnique({ where: { workspaceId_formKey: { workspaceId, formKey: known.code } }, include: { editions: true } });
    const sameLabel = await this.db.formEdition.findUnique({ where: { workspaceId_editionLabel: { workspaceId, editionLabel: known.edition_label } } });
    if (sameLabel?.sha256 === hash) throw Object.assign(new Error("same file added at the same moment"), { code: "P2002" }); // look again: in_library
    if (sameLabel) {
      const r: IntakeResult = { file: name, outcome: "held", ...read, message: `Held for a person: ${known.edition_label} is already in the library from a different file. Check this is the official PDF; a changed form has a new edition date.` };
      await this.record(actor, workspaceId, combination?.id ?? null, name, stored, hash, file.buffer.length, r, "HELD", "same edition, different file");
      return r;
    }
    // W1-02 (break m2): an online version (parked, on an older database) is not an edition the PDF is compared with.
    const pdfEditions = (def?.editions ?? []).filter((e) => e.channel !== "ONLINE");
    if (pdfEditions.length) {
      const current = newestEdition(pdfEditions)!;
      const newer = editionMonth(known.edition_label) > editionMonth(current.editionLabel);
      const r: IntakeResult = newer
        ? { file: name, outcome: "new_edition_held", ...read, message: `New edition: impact review needed. ${known.edition_label} is newer than the library's ${current.editionLabel}. It is held: not added to the library, not attached and not used until a person reviews what changed.` }
        : { file: name, outcome: "older_edition_held", ...read, message: `Older edition: not used. ${known.edition_label} is not newer than the library's ${current.editionLabel}, so it is kept aside: not added to the library, not attached and not used.` };
      await this.record(actor, workspaceId, combination?.id ?? null, name, stored, hash, file.buffer.length, r, "HELD", newer ? `Newer than the library's ${current.editionLabel}` : `Not newer than the library's ${current.editionLabel}`);
      await this.audit.log(workspaceId, actor.id, "held", "form", known.code, `${actor.name} uploaded ${known.edition_label}: ${newer ? "held as a new edition for impact review" : "kept aside as an older edition, not used"} (the library has ${current.editionLabel})`, { sha256: hash }, combination?.id);
      return r;
    }
    const item = approved;
    const page = await this.db.officialDownload.findFirst({ where: { workspaceId, sha256: hash }, select: { formPageUrl: true, sourceUrl: true } });
    await this.db.$transaction(async (tx) => {
      const d = def ?? (await tx.govFormDef.create({ data: { workspaceId, formKey: known.code, displayName: known.title || known.code, formKind: read.kind === "form" ? "data_form" : "document" } }));
      await forgetDeletion(tx, workspaceId, known.code); // X5 slice c: a person added it back
      // S4 round 6 (D18): where it came from (a person's upload, or the sample load) and the canada.ca page it matched.
      await tx.formEdition.create({ data: { workspaceId, govFormDefId: d.id, editionLabel: known.edition_label, published: file.buffer.subarray(0, 5).toString("latin1") === "%PDF-" ? known.published ?? "" : "", officialFile: item?.file ?? null, sha256: hash, storedPath: stored.replace(`${ROOT}/`, ""), origin: via === "SAMPLE" ? "SAMPLE" : "UPLOADED", formPageUrl: page?.formPageUrl ?? null, sourceUrl: page?.sourceUrl ?? null, checkedAt: page ? new Date() : null } });
      if (page?.formPageUrl && !d.formPageUrl) await tx.govFormDef.update({ where: { id: d.id }, data: { formPageUrl: page.formPageUrl } });
    });
    await this.audit.log(workspaceId, actor.id, "created", "form", known.code, `${actor.name} added ${known.edition_label} (${KIND_WORD[read.kind]}) to the library; ${EDITION_WORDS[editionFrom ?? "printed"]}`, { sha256: hash, approved_source: item?.approval ?? null, via, edition_from: editionFrom ?? "printed" }, combination?.id);
    let r: IntakeResult = { file: name, outcome: "added", ...read, editionFrom, message: `${known.edition_label} added to the library as a new ${KIND_WORD[read.kind]} (${editionFrom === "manifest" ? "edition from the official source list: the file does not print it, and its checksum is that entry's" : editionFrom === "form_template" ? "read from the file; the edition from the form's own template" : "read from the file"}).` };
    r = await attach(r);
    await this.record(actor, workspaceId, combination?.id ?? null, name, stored, hash, file.buffer.length, r, "DONE");
    return r;
  }

  private async record(actor: Actor, workspaceId: string, combinationId: string | null, fileName: string, stored: string | null, hash: string, bytes: number, r: IntakeResult, status: "HELD" | "DONE", reason?: string) {
    await this.db.intakeItem.create({ data: { workspaceId, combinationId, fileName, storedPath: stored ? stored.replace(`${ROOT}/`, "") : "", sha256: hash, bytes, kind: r.kind, code: r.code, title: r.title, editionLabel: r.edition, published: r.published, outcome: r.outcome, status, reason: reason ?? null, createdBy: actor.id } });
  }
}

const view = (r: IntakeItem) => ({ id: r.id, file: r.fileName, kind: r.kind, code: r.code, title: r.title, edition: r.editionLabel, published: r.published, outcome: r.outcome, reason: r.reason, combinationId: r.combinationId, at: r.createdAt, irccPage: r.irccPage, uploadedBy: r.createdBy, sha256: r.sha256, stored: !!r.storedPath });
