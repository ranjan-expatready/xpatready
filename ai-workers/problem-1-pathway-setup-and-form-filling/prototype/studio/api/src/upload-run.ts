// S4 slice 2: Upload PDF through the shared run (P-123, P-110; challenge M1, agreed by the founder 27 Oct). Four steps a
// person can watch and stop, all rules in this slice (US$0):
//  1. rules check the file: a PDF, not damaged, at most 25 MB, its fingerprint;
//  2. read what it is, rules first: number, edition and title from the file itself ("Rules read it: no AI call was
//     made"). When the rules cannot read it, AI may read only a file from canada.ca or one a second person approved
//     (the drafting guard, STANDARDS §8), so an unread hand upload waits for a person and no AI call is made;
//  3. compare with canada.ca (is this edition current? is it the very file the form page links, Q-L1?) and list the
//     library's guides that name it;
//  4. add it through the one form intake (P-51): into the library, or held for a second person (P-80), and attached to
//     the combination it was uploaded for when it becomes usable (S5 ask).
import { HttpException, Inject, Injectable, type OnModuleInit } from "@nestjs/common";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { promisify } from "node:util";
import { mentionsOf, officialUrl, pageText, parseFormPage, parseFormsIndex } from "../../engine/canada.ts";
import { normaliseCode } from "../../contracts/form-library.ts";
import { canadaSource, CanadaError, type CanadaSource } from "./canada.ts";
import { ACTORS, Audit, Db, need, PY, ROOT, STUDIO, VAR, Workspace, type Actor } from "./core.ts";
import { INDEX_URL } from "./finder.ts";
import { editionFromManifest, Intake, MAX_BYTES, type EditionFrom } from "./intake.ts";
import { manifest } from "../../engine/import.ts";

const run = promisify(execFile);
const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");
const problem = (status: number, title: string, detail: string) => new HttpException({ type: `https://expatready.local/problems/${title.toLowerCase().replace(/[^a-z]+/g, "-")}`, title, status, detail }, status);
export const UPLOAD_OPERATION = "upload_form";
export const UPLOAD_STEPS = [
  { kind: "upload_check", label: "Rules check the file: a real PDF, not damaged, its fingerprint" },
  { kind: "upload_identity", label: "Read what this file is: rules first, AI only when the rules cannot" },
  { kind: "upload_compare", label: "Compare with canada.ca and find the guides that name it" },
  { kind: "upload_add", label: "Add it to the library" },
] as const;
type Kind = (typeof UPLOAD_STEPS)[number]["kind"];
type Identity = { ok: boolean; kind?: string; code?: string; edition_label?: string; edition_from?: EditionFrom; title?: string; language?: string; error?: string };

/** C2.4 (review of 6c940174, Major 2): an approved file held as a newer or older edition is not a source to verify:
 *  its card says what it waits for and links to its own step (Review impact; the older edition's item), never to
 *  "Record the IRCC page". */
export const HELD_WORDS: Record<string, string> = {
  new_edition_held: "Held as a new edition: nothing changes until a person reviews its impact on To review.",
  older_edition_held: "Kept aside as an older edition: it is not used. See it on To review.",
};

@Injectable()
export class UploadRuns implements OnModuleInit {
  private canada: CanadaSource = canadaSource();
  constructor(@Inject(Db) private readonly db: Db, @Inject(Workspace) private readonly ws: Workspace, @Inject(Audit) private readonly audit: Audit, @Inject(Intake) private readonly intake: Intake) {}

  /** An upload left running by a stopped server can never finish: it says so. */
  async onModuleInit() {
    const open = await this.db.aiBatch.findMany({ where: { operation: UPLOAD_OPERATION, status: { in: ["QUEUED", "RUNNING"] } }, select: { id: true } });
    for (const b of open) {
      await this.db.draftingJob.updateMany({ where: { batchId: b.id, status: { in: ["WAITING", "RUNNING"] } }, data: { status: "CANCELLED", finishedAt: new Date(), message: "The studio server stopped before this step ended." } });
      await this.db.aiBatch.update({ where: { id: b.id }, data: { status: "FAILED", finishedAt: new Date(), message: "The studio server stopped while reading the upload. Upload it again." } });
    }
  }

  /** POST /api/library/forms/upload (one PDF): starts the run and answers at once with its id; the card follows it. */
  async start(actor: Actor, file: { originalname: string; buffer: Buffer } | undefined, forForm?: { combinationId: string; code: string }) {
    need(actor, "author");
    if (!file) throw problem(400, "Choose a file", "Choose one or more PDFs to upload.");
    if (!file.buffer?.length) throw problem(400, "Empty file", `${file.originalname || "The file"} is empty (0 bytes): nothing was read. Download it again from canada.ca.`);
    const workspaceId = await this.ws.id();
    if (forForm && !(await this.db.combination.findUnique({ where: { id: forForm.combinationId } }))) throw problem(404, "Not found", "That combination does not exist (it may have been removed by a reset).");
    const name = basename(file.originalname || "upload.pdf").replace(/[^A-Za-z0-9._-]/g, "_").slice(-80) || "upload.pdf";
    const dir = join(VAR("demo"), "uploads"); mkdirSync(dir, { recursive: true });
    const stored = join(dir, `${Date.now().toString(36)}-${name}`);
    writeFileSync(stored, file.buffer);
    const batch = await this.db.aiBatch.create({ data: { workspaceId, idempotencyKey: `upload-${sha(file.buffer).slice(0, 16)}-${Date.now()}`, operation: UPLOAD_OPERATION, scopeKind: "library", scopeLabel: name, mode: "RULES", status: "QUEUED", planSha256: sha(file.buffer), plan: { operation: UPLOAD_OPERATION, file: name, stored: stored.replace(`${ROOT}/`, ""), for: forForm ?? null, steps: UPLOAD_STEPS.map((s) => ({ kind: s.kind, uses_ai: false })), totals: { worst_usd: 0, expected_usd: 0 } }, spendLimitUsd: 0.01, worstCaseUsd: 0, expectedUsd: 0, startedBy: actor.id, message: "Reading the upload" } });
    await this.db.draftingJob.createMany({ data: UPLOAD_STEPS.map((s, i) => ({ workspaceId, combinationId: null, batchId: batch.id, kind: s.kind, mode: "LOCAL", status: "WAITING", message: "Waits for the step before it", startedBy: actor.id, startedAt: new Date(Date.now() + i) })) });
    void this.execute(batch.id, actor, stored, name, forForm).catch(async (e) => {
      await this.db.aiBatch.updateMany({ where: { id: batch.id, status: { in: ["QUEUED", "RUNNING"] } }, data: { status: "FAILED", finishedAt: new Date(), message: `The upload stopped: ${(e as Error).message.slice(0, 300)}` } });
    });
    return { runId: batch.id };
  }

  async stop(actor: Actor, id: string) {
    need(actor, "author");
    await this.db.aiBatch.update({ where: { id }, data: { cancelRequested: true, message: "Stopping" } });
    await this.audit.log((await this.ws.id()), actor.id, "stopped", "upload", id, `${actor.name} stopped reading an uploaded PDF`);
  }

  private async step(batchId: string, kind: Kind, fn: () => Promise<{ status: string; message: string }>): Promise<string | null> {
    const b = await this.db.aiBatch.findUnique({ where: { id: batchId } });
    const job = await this.db.draftingJob.findFirst({ where: { batchId, kind } });
    if (!b || !job) return null;
    if (b.cancelRequested) { await this.db.draftingJob.updateMany({ where: { batchId, status: "WAITING" }, data: { status: "CANCELLED", finishedAt: new Date(), message: "Stopped before it started." } }); return null; }
    await this.db.draftingJob.update({ where: { id: job.id }, data: { status: "RUNNING", startedAt: new Date(), message: "Running" } });
    try {
      const r = await fn();
      await this.db.draftingJob.update({ where: { id: job.id }, data: { status: r.status, message: r.message, costUsd: 0, finishedAt: new Date() } });
      return r.status;
    } catch (e) {
      await this.db.draftingJob.update({ where: { id: job.id }, data: { status: "FAILED", message: e instanceof CanadaError ? e.message : `This step stopped: ${(e as Error).message.slice(0, 300)}`, finishedAt: new Date() } });
      return "FAILED";
    }
  }

  private async finish(batchId: string, status: string, message: string) {
    await this.db.draftingJob.updateMany({ where: { batchId, status: "WAITING" }, data: { status: "SKIPPED", finishedAt: new Date(), message: "Not needed after the step before it." } });
    const b = await this.db.aiBatch.findUnique({ where: { id: batchId } });
    await this.db.aiBatch.update({ where: { id: batchId }, data: { status: b?.cancelRequested ? "CANCELLED" : status, finishedAt: new Date(), message: b?.cancelRequested ? `Stopped by a person. ${message}` : message } });
  }

  private async execute(batchId: string, actor: Actor, stored: string, name: string, forForm?: { combinationId: string; code: string }) {
    await this.db.aiBatch.update({ where: { id: batchId }, data: { status: "RUNNING" } });
    const bytes = readFileSync(stored);
    let id: Identity = { ok: false };
    let mismatch: string | null = null; // C11.7: the source-list entry this file pretends to be, when it is not that file
    const s1 = await this.step(batchId, "upload_check", async () => {
      if (bytes.length > MAX_BYTES) return { status: "FAILED", message: "The file is larger than 25 MB. Nothing was read." };
      if (!bytes.length) return { status: "FAILED", message: "The file is empty (0 bytes). Nothing was read." };
      if (!bytes.subarray(0, 5).toString("latin1").startsWith("%PDF-")) return { status: "FAILED", message: "This is not a PDF file. Only IRCC PDFs can be uploaded here. Nothing was read." };
      // Not damaged: the PDF opens (pages and structure readable); the same read gives step 2 its answer.
      const { stdout } = await run(PY, ["-I", join(STUDIO, "tools", "read_form_identity.py"), stored], { cwd: ROOT, timeout: 60_000 });
      id = JSON.parse(stdout.trim().split("\n").pop()!) as Identity;
      // C11.7 (review m1): the same source-list rule as the intake, so the card never says otherwise than the result.
      const listed = editionFromManifest(id, sha(bytes), manifest() as { file: string; edition?: string; sha256: string }[]);
      if (listed && "use" in listed) id = listed.use as Identity;
      else if (listed) mismatch = `${listed.mismatch.file} (${listed.mismatch.edition})`;
      if (!id.ok && /could not be (read|opened)|PdfReadError|EmptyFile|damaged/i.test(id.error ?? "")) return { status: "FAILED", message: "This PDF is damaged or incomplete: it could not be opened. Download it again from canada.ca and upload that file. Nothing was read." };
      const size = bytes.length < 1024 ? `${bytes.length} bytes` : bytes.length < 1024 * 1024 ? `${Math.round(bytes.length / 1024)} KB` : `${(bytes.length / 1024 / 1024).toFixed(1)} MB`;
      return { status: "COMPLETED", message: `A PDF of ${size} that opens; its fingerprint is recorded. US$0.`, detail: { sha256: sha(bytes) } };
    });
    if (s1 !== "COMPLETED") return this.finish(batchId, s1 === null ? "CANCELLED" : "FAILED", "The file could not be used.");
    const s2 = await this.step(batchId, "upload_identity", async () => {
      if (id.ok && id.code && id.edition_label) return { status: "COMPLETED", message: `Rules read it: ${id.edition_label}${id.title ? ` · ${id.title}` : ""}.${id.edition_from === "manifest" ? " The file does not print its edition; it is the official source list's, because this file's checksum is that entry's." : id.edition_from === "form_template" ? " The edition is the one the form's own template records (none is printed next to the form number)." : ""} No AI call was made.` };
      if (mismatch) return { status: "FAILED", message: `Rules found ${id.code} but no edition in the file, and this is not the official ${mismatch} on the source list: its checksum is different. It will be refused; no AI call was made.` };
      return { status: "NEEDS_PERSON", message: "Rules could not read its form number and edition. AI may read only a file from canada.ca or one a second person approved, so this file waits for a person to check it; no AI call was made." };
    });
    if (s2 === null) return this.finish(batchId, "CANCELLED", "Stopped.");
    let matched: { formPage: string; pdfUrl: string; lastUpdated: string | null } | null = null; // round 6 should 1 (D18)
    const s3 = await this.step(batchId, "upload_compare", async () => {
      if (!id.code) return { status: "SKIPPED", message: "Not compared: the form number is not known." };
      const code = normaliseCode(id.code);
      const guides = await this.guidesNaming(code);
      const named = guides.length ? ` Named by ${guides.join(", ")}.` : " No guide in the library names it yet.";
      try {
        const row = parseFormsIndex((await this.canada.get(INDEX_URL, "html")).bytes.toString("utf8")).rows.find((r) => normaliseCode(r.code) === code);
        if (!row) return { status: "COMPLETED", message: `${code} is not on canada.ca's list of forms (it may be a visa-office document).${named}` };
        const page = parseFormPage((await this.canada.get(row.pageUrl, "html")).bytes.toString("utf8"));
        const pdfUrl = page.pdfUrls.find((u) => officialUrl(u).ok);
        const same = pdfUrl ? (await this.canada.get(pdfUrl, "pdf")).sha256 === sha(bytes) : false;
        if (same && pdfUrl) matched = { formPage: row.pageUrl, pdfUrl, lastUpdated: page.lastUpdated ?? null };
        return { status: "COMPLETED", message: `${same ? "The very file canada.ca's form page links: no second person is needed." : `canada.ca shows ${code} last updated ${page.lastUpdated ?? "on an unknown date"}; this file is not the one its page links.`}${named}` };
      } catch (e) {
        if (!(e instanceof CanadaError)) throw e;
        return { status: "COMPLETED", message: `canada.ca could not be compared (${e.message})${named}` };
      }
    });
    if (s3 === null) return this.finish(batchId, "CANCELLED", "Stopped.");
    let outcome = "";
    let unread = false;
    const s4 = await this.step(batchId, "upload_add", async () => {
      const r = await this.intake.intake(ACTORS.find((a) => a.id === actor.id) ?? actor, [{ originalname: name, buffer: bytes }], undefined, "MANUAL", forForm);
      const one = r.results[0];
      outcome = one?.outcome ?? "failed";
      // Review major 6: a held file's card links to its own To review item, where the uploader records the IRCC page first.
      const held = outcome.includes("held") ? await this.db.intakeItem.findFirst({ where: { sha256: sha(bytes), status: "HELD" }, orderBy: { createdAt: "desc" }, select: { id: true, code: true } }) : null;
      if (held) { const b = await this.db.aiBatch.findUnique({ where: { id: batchId } }); await this.db.aiBatch.update({ where: { id: batchId }, data: { plan: { ...(b!.plan as object), held_id: held.id, held_unread: !held.code, held_outcome: outcome } } }); }
      unread = !!held && !held.code;
      return { status: outcome === "refused" || outcome === "failed" ? "FAILED" : outcome.includes("held") ? "NEEDS_PERSON" : "COMPLETED", message: one?.message ?? "Nothing was added." };
    });
    if (s4 === null) return this.finish(batchId, "CANCELLED", "Stopped.");
    // Round 6 should 1 (D18): the edition this upload added says which canada.ca page its file is (it matched, step 3).
    const m = matched as { formPage: string; pdfUrl: string; lastUpdated: string | null } | null;
    if (m && (outcome === "added" || outcome === "attached")) {
      const ed = await this.db.formEdition.findFirst({ where: { sha256: sha(bytes) }, select: { id: true, govFormDefId: true, formPageUrl: true } });
      if (ed && !ed.formPageUrl) {
        await this.db.formEdition.update({ where: { id: ed.id }, data: { formPageUrl: m.formPage, sourceUrl: m.pdfUrl, canadaUpdated: m.lastUpdated, checkedAt: new Date() } });
        await this.db.govFormDef.updateMany({ where: { id: ed.govFormDefId, formPageUrl: null }, data: { formPageUrl: m.formPage } });
      }
    }
    const done: Record<string, string> = { added: "Added to the library.", in_library: "Already in the library: nothing was added twice.", older_in_library: "In the library only as an older edition: it is not used.", attached: "Added to the library." };
    await this.finish(batchId, s4 === "COMPLETED" ? "COMPLETED" : s4 === "NEEDS_PERSON" ? "NEEDS_PERSON" : "FAILED", s4 === "COMPLETED" ? done[outcome] ?? "In the library." : s4 === "NEEDS_PERSON" ? (unread ? "Held: the rules could not read its form number, so it cannot be approved. Upload the official PDF from canada.ca instead." : HELD_WORDS[outcome] ?? "Held: record the IRCC page it came from on To review; then a second person compares and approves it.") : "Not added.");
  }

  /** The library's guides whose page text prints this form number (rules, US$0). */
  private async guidesNaming(code: string): Promise<string[]> {
    const workspaceId = await this.ws.id();
    const guides = await this.db.govFormDef.findMany({ where: { workspaceId, formKind: "guide", retiredAt: null }, include: { editions: { orderBy: { checkedAt: "desc" }, take: 1 } } });
    const out: string[] = [];
    for (const g of guides) {
      const p = g.editions[0]?.storedPath;
      if (!p) continue;
      try { if (mentionsOf(pageText(readFileSync(join(ROOT, p), "utf8"))).some((m) => normaliseCode(m.code) === code)) out.push(g.formKey); } catch { /* file gone after a reset */ }
    }
    return out;
  }
}
