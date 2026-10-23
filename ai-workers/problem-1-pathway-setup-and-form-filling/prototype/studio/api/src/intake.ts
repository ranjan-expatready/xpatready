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
//   a code and edition that cannot be read, or the same edition printed on a different file → "held" for a person
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
import { Audit, Db, fail, need, OFFICIAL, PY, ROOT, STUDIO, VAR, Workspace, type Actor } from "./core.ts";
import { Sources } from "./sources.ts";

const run = promisify(execFile);
const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");
export const MAX_FILES = 20, MAX_BYTES = 25 * 1024 * 1024;
export type IntakeFile = { originalname: string; buffer: Buffer };
export type IntakeOutcome = "in_library" | "added" | "attached" | "new_edition_held" | "older_edition_held" | "held" | "refused" | "failed";
export type IntakeResult = {
  file: string; outcome: IntakeOutcome; message: string; kind: string; code: string | null; title: string | null; edition: string | null; published: string | null; sha256: string | null;
  /** Set when the file was attached to the combination it was uploaded on. */
  attachmentId?: string; attachmentStatus?: string;
};
const KIND_WORD: Record<string, string> = { form: "form", checklist: "document checklist", guide: "guide", portal_screen: "saved portal screen", unknown: "file" };

@Injectable()
export class Intake {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Workspace) private readonly ws: Workspace, @Inject(Audit) private readonly audit: Audit, @Inject(Sources) private readonly sources: Sources) {}

  /** POST /intake: one or many files, optionally on a combination. Files are handled one after the other, so two copies
   *  of the same new form in one batch give "added" then "in_library", never two forms. */
  async intake(actor: Actor, files: IntakeFile[] | undefined, combinationId?: string, via: "MANUAL" | "SAMPLE" = "MANUAL") {
    need(actor, "author");
    if (!files?.length) fail("Choose at least one file.");
    if (files!.length > MAX_FILES) fail(`Add at most ${MAX_FILES} files at a time.`, HttpStatus.PAYLOAD_TOO_LARGE);
    const workspaceId = await this.ws.id();
    const combination = combinationId ? await this.db.combination.findUnique({ where: { id: combinationId } }) : null;
    if (combinationId && !combination) fail("That combination does not exist (it may have been removed by a reset).", HttpStatus.NOT_FOUND);
    const results: IntakeResult[] = [];
    for (const f of files!) results.push(await this.oneSafely(actor, workspaceId, f, combination, via));
    const n = (o: IntakeOutcome) => results.filter((r) => r.outcome === o).length;
    return { results, summary: { files: results.length, in_library: n("in_library"), added: n("added"), attached: n("attached"), held: n("new_edition_held") + n("older_edition_held") + n("held"), refused: n("refused"), failed: n("failed") } };
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

  /** Files waiting for a person (held), newest first; with a combination, only those uploaded on it or for its forms. */
  async held(combinationId?: string) {
    const workspaceId = await this.ws.id();
    const rows = await this.db.intakeItem.findMany({ where: { workspaceId, status: "HELD" }, orderBy: { createdAt: "desc" } });
    if (!combinationId) return rows.map(view);
    const codes = new Set((await this.db.combinationForm.findMany({ where: { combinationId, status: { not: "RETIRED" } }, include: { form: true } })).map((f) => f.form.formKey));
    for (const a of await this.db.sourceAttachment.findMany({ where: { combinationId }, select: { edition: true } })) if (a.edition) codes.add(a.edition.split(" (")[0]);
    return rows.filter((r) => r.combinationId === combinationId || (r.code && codes.has(r.code))).map(view);
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
      const a = await this.sources.attach(actor, combination.id, file, via);
      return { ...r, attachmentId: a.attachment.id, attachmentStatus: a.attachment.status, message: `${r.message} ${a.duplicate ? `Already attached to ${combination.label}.` : `Attached to ${combination.label}.`}` };
    };

    const approved = manifest().find((i) => i.sha256 === hash);
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
    const id = JSON.parse(stdout.trim().split("\n").pop()!);
    const read = { kind: id.kind ?? "unknown", code: id.code ?? null, title: id.title ?? null, edition: id.edition_label ?? null, published: id.published ?? null, sha256: hash };

    if (!id.ok) {
      // The reader's own words when they are plain ("no form code … found"); never an error class name.
      const why = id.error && !/error|exception|traceback/i.test(id.error) ? id.error : "the file could not be opened as a PDF";
      const what = id.code ? `the edition of ${id.code}` : "the form code and edition";
      const r: IntakeResult = { file: name, outcome: "held", ...read, message: `Held for a person: we could not read ${what} from this file (${why}). Nothing was added or attached.` };
      await this.record(actor, workspaceId, combination?.id ?? null, name, stored, hash, file.buffer.length, r, "HELD", `We could not read ${what} from this file`);
      return r;
    }
    // Readable form identity is not proof of an official source. Hold before library creation,
    // combination attachment, edition-impact processing, or any downstream AI mapping.
    if ((read.kind === "form" || read.kind === "checklist") && !approved) {
      const r: IntakeResult = { file: name, outcome: "held", ...read, message: `Held for source verification: ${read.edition ?? read.code ?? "This form"} is not on the approved source list. It was not added to the library, attached, or sent to AI.` };
      await this.record(actor, workspaceId, combination?.id ?? null, name, stored, hash, file.buffer.length, r, "HELD", "checksum not on approved source manifest");
      await this.audit.log(workspaceId, actor.id, "held", "form", read.code ?? name, `${actor.name} uploaded an unverified form source; held before library, attachment or AI use`, { sha256: hash }, combination?.id);
      return r;
    }
    // F1 (challenge point 1): a saved portal screen is never kept as a guide. It belongs in a portal capture, where a
    // screen holding an answer is refused and a second person approves the rest (P-66).
    if (read.kind === "portal_screen") {
      const r: IntakeResult = { file: name, outcome: "refused", ...read, message: "This is a saved portal screen, not a guide: add it to a portal capture (with its portal), where it is checked for answers and approved by a second person. Nothing was added or attached." };
      await this.record(actor, workspaceId, combination?.id ?? null, name, "", hash, file.buffer.length, r, "DONE", "saved portal screen: belongs in a portal capture");
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
    const def = await this.db.govFormDef.findUnique({ where: { workspaceId_formKey: { workspaceId, formKey: id.code } }, include: { editions: true } });
    const sameLabel = await this.db.formEdition.findUnique({ where: { workspaceId_editionLabel: { workspaceId, editionLabel: id.edition_label } } });
    if (sameLabel?.sha256 === hash) throw Object.assign(new Error("same file added at the same moment"), { code: "P2002" }); // look again: in_library
    if (sameLabel) {
      const r: IntakeResult = { file: name, outcome: "held", ...read, message: `Held for a person: ${id.edition_label} is already in the library from a different file. Check this is the official PDF; a changed form has a new edition date.` };
      await this.record(actor, workspaceId, combination?.id ?? null, name, stored, hash, file.buffer.length, r, "HELD", "same edition, different file");
      return r;
    }
    if (def?.editions.length) {
      const current = newestEdition(def.editions)!;
      const newer = editionMonth(id.edition_label) > editionMonth(current.editionLabel);
      const r: IntakeResult = newer
        ? { file: name, outcome: "new_edition_held", ...read, message: `New edition: impact review needed. ${id.edition_label} is newer than the library's ${current.editionLabel}. It is held: not added to the library, not attached and not used until a person reviews what changed.` }
        : { file: name, outcome: "older_edition_held", ...read, message: `Older edition: not used. ${id.edition_label} is not newer than the library's ${current.editionLabel}, so it is kept aside: not added to the library, not attached and not used.` };
      await this.record(actor, workspaceId, combination?.id ?? null, name, stored, hash, file.buffer.length, r, "HELD", newer ? `Newer than the library's ${current.editionLabel}` : `Not newer than the library's ${current.editionLabel}`);
      await this.audit.log(workspaceId, actor.id, "held", "form", id.code, `${actor.name} uploaded ${id.edition_label}: ${newer ? "held as a new edition for impact review" : "kept aside as an older edition, not used"} (the library has ${current.editionLabel})`, { sha256: hash }, combination?.id);
      return r;
    }
    const item = approved;
    await this.db.$transaction(async (tx) => {
      const d = def ?? (await tx.govFormDef.create({ data: { workspaceId, formKey: id.code, displayName: id.title || id.code, formKind: read.kind === "form" ? "data_form" : "document" } }));
      await tx.formEdition.create({ data: { workspaceId, govFormDefId: d.id, editionLabel: id.edition_label, officialFile: item?.file ?? null, sha256: hash, storedPath: stored.replace(`${ROOT}/`, "") } });
    });
    await this.audit.log(workspaceId, actor.id, "created", "form", id.code, `${actor.name} added ${id.edition_label} (${KIND_WORD[read.kind]}) to the library; code, title, edition and kind read from the file`, { sha256: hash, approved_source: item?.approval ?? null, via }, combination?.id);
    let r: IntakeResult = { file: name, outcome: "added", ...read, message: `${id.edition_label} added to the library as a new ${KIND_WORD[read.kind]} (read from the file).` };
    r = await attach(r);
    await this.record(actor, workspaceId, combination?.id ?? null, name, stored, hash, file.buffer.length, r, "DONE");
    return r;
  }

  private async record(actor: Actor, workspaceId: string, combinationId: string | null, fileName: string, stored: string | null, hash: string, bytes: number, r: IntakeResult, status: "HELD" | "DONE", reason?: string) {
    await this.db.intakeItem.create({ data: { workspaceId, combinationId, fileName, storedPath: stored ? stored.replace(`${ROOT}/`, "") : "", sha256: hash, bytes, kind: r.kind, code: r.code, title: r.title, editionLabel: r.edition, published: r.published, outcome: r.outcome, status, reason: reason ?? null, createdBy: actor.id } });
  }
}

const view = (r: IntakeItem) => ({ id: r.id, file: r.fileName, kind: r.kind, code: r.code, title: r.title, edition: r.editionLabel, published: r.published, outcome: r.outcome, reason: r.reason, combinationId: r.combinationId, at: r.createdAt });
