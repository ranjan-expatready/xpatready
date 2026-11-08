// C6.5 part 2 (runtime lane, M3 plan row C7; M3-CONTRACT C6.5; r5c BR-4–BR-7; P-133, P-134, P-142, P-242, P-243,
// P-256): documents read into proposed facts, one "Confirm & use" per document, and the typed-versus-document check.
//   * A case-level upload (a document with no checklist line, e.g. a letter of invitation, Sample) is the person's, as a
//     checklist upload is (case_document, checklist_line_id null). Uploading reads nothing (P-134 D4, C6.5-2).
//   * "Fill this from documents" on a section reads the person's current documents that can give a fact of that section,
//     each once (a document's read is stored: document_review and its read_value rows, BR-4: apart from answers), by its
//     reader: a passport by its coded lines, by rules (engine/runtime/mrz.ts; no AI, no OCR, US$0); a letter by AI vision,
//     replayed from a saved read only (US$0; live AI is refused here: P-175, the founder's Go per paid run, P-295). Any
//     other identity document is read by a person, never by AI (P-134, engine/identity-documents.ts).
//   * The cost card ("…/plan", P-110) comes first for AI reads: the live price (usual and worst, priced by the spend
//     ledger's own price table, p2/ledger.ts costUsd), whether live is allowed (never on this copy), and whether a saved
//     read can replay at US$0.
//   * "Confirm & use" (P-242): staff only, once per document, recording who and when. It writes each value that is new
//     or agrees, as VERIFIED with its provenance (source_json channel "document_read", document, page, reader), so it fills
//     at once; a value that differs from a current answer is never written: one open check (answer_check) per person and
//     fact, the typed answer kept (BR-7, documents challenge B1). A fact the release does not ask stays a read value.
//   * A check is resolved only with a reason (C6.5-14), keeping the answer or the document's value; while one is open,
//     Confirm section on its section answers 409 open_checks (runtime.ts) and the filing has a CRITICAL warning
//     (readiness-inputs.ts, C7.6 BR-7).
//   * Staff mark a current answer "checked against the document" (P-142 D3): a new VERIFIED version naming the document.
// Audit lines name the case by its short id, the document type and the facts, never a value or a reason (STANDARDS §5).
import { Body, Controller, Get, Headers, HttpCode, HttpException, HttpStatus, Inject, Injectable, Param, Post, Query, UploadedFiles, UseGuards, UseInterceptors } from "@nestjs/common";
import { AnyFilesInterceptor } from "@nestjs/platform-express";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { z } from "zod";
import { costUsd } from "../../../p2/ledger.ts";
import { MAX_ATTEMPTS, MODELS } from "../../../p2/policy.ts";
import { problemFromZod } from "../../contracts/programs.ts";
import { cleanName, INVISIBLE, MAX_DOCUMENT_BYTES, MAX_DOCUMENT_MB, MAX_REASON, MEDIA, mediaOf } from "../../contracts/documents.ts";
import { CODED_IDENTITY, identityWords, isIdentityName, isPassportPhoto } from "../../engine/identity-documents.ts";
import { MRZ_FACTS, readPassport } from "../../engine/runtime/mrz.ts";
import { isFilingFact } from "../../engine/resolver.ts";
import type { Snapshot } from "../../engine/snapshot.ts";
import { CaseActorGuard, utf8Name } from "./case-checklist.ts";
import { actorOf, Audit, CaseRead, Db, fail, PROTOTYPE, VAR, WORKSPACE_KEY, type Actor } from "./core.ts";
import { aiLive } from "./sources.ts";
import { Runtime, type Reached } from "./runtime.ts";

type H = string | undefined;
type Upload = { fieldname?: string; originalname?: string; buffer?: Buffer; size?: number };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FACT = /^[a-z][a-z0-9_]*\.[a-z0-9_.]+$/;
const short = (id: string) => id.slice(0, 8);
const DOCS = () => VAR(WORKSPACE_KEY);

export const READERS = ["mrz", "ai_vision"] as const;
export type Reader = (typeof READERS)[number];
/** What a read value became at Confirm & use (read_value.state). */
export type ReadState = "proposed" | "used" | "agreed" | "conflict" | "not_asked";

/** Document kinds a person may upload with no checklist line (a case-level document), each with its reader and the facts
 *  it can give. Sample until the immigration expert confirms (ASSUMPTIONS; P-133: Sample documents only). */
export const CASE_KINDS: Record<string, { name: string; reader: Reader; supplies: readonly string[] }> = {
  letter_of_invitation: { name: "Letter of invitation (Sample)", reader: "ai_vision",
    supplies: ["case.visit_contact_name", "case.visit_contact_relationship", "case.visit_contact_address_in_canada", "case.intended_stay_from", "case.intended_stay_to"] },
};

/** A passport whose holder is someone else (the absent parent's copy on a minor's line): its coded lines are never read
 *  as the line's person's (resolver rule R11); a person reads it. */
const ABOUT_ANOTHER = /\babsent\b|\bparents?\b|\bparent's\b|\bguardians?\b|\bguardian's\b/;

/** Which reader reads a document type, by its name and key (P-134: an identity document never goes to AI; a passport's
 *  own information page is read by its coded lines; a case-level kind by its own reader); null: a person reads it. */
export function readerOf(type: { key: string; name: string }): { reader: Reader; supplies: readonly string[] } | null {
  const kind = CASE_KINDS[type.key];
  if (kind) return { reader: kind.reader, supplies: kind.supplies };
  const w = identityWords(`${type.name} ${type.key}`);
  if (CODED_IDENTITY.test(w) && !isPassportPhoto(type.name) && !ABOUT_ANOTHER.test(w)) return { reader: "mrz", supplies: MRZ_FACTS };
  if (isIdentityName(type.name)) return null; // P-134: read by a person, never by AI
  return null;
}

// ── The cost card for an AI read (P-110, P-295) ───────────────────────────────────────────────────────────────────────
/** One letter read by AI vision, priced by the spend ledger (p2/ledger.ts costUsd) on the project's one model. Token
 *  counts are estimates until the first saved read measures them (FQ-10): usual = a one-page letter (about 1,600 image
 *  tokens and 300 of text, 1,500 of instructions and the fact list) answered in about 500 tokens; worst = five pages
 *  (the reader's page cap) at 2,500 tokens each plus 2,000 of instructions, answered in up to 2,000 tokens, on every
 *  attempt the policy allows (MAX_ATTEMPTS). */
export const LETTER_READ_CARD = { model: MODELS[0], pages: { usual: 1, worst: 5 }, usual: { input: 3_400, output: 500 }, worst: { input: 5 * 2_500 + 2_000, output: 2_000 } } as const;
const cents = (n: number) => Math.ceil(n * 100) / 100;
export function letterReadUsd(documents = 1): { usual_usd: number; worst_usd: number; model: string; attempts: number } {
  const c = LETTER_READ_CARD;
  return { model: c.model, attempts: MAX_ATTEMPTS,
    usual_usd: cents(documents * costUsd(c.model, c.usual.input, c.usual.output)),
    worst_usd: cents(documents * MAX_ATTEMPTS * costUsd(c.model, c.worst.input, c.worst.output)) };
}

/** A saved AI read (FQ-10: one live read with the founder's Go, saved, then replayed by the document's checksum at US$0). */
export type SavedRead = { document_sha256: string; reader: "ai_vision"; model?: string; cost_usd?: number;
  proposals: { fact: string; value: unknown; page?: number; confidence?: number; note?: string }[]; unreadable?: { fact: string; reason: string }[] };
const SAVED_READS = () => process.env.STUDIO_SAVED_READS_DIR || join(PROTOTYPE, "p2", "runs");
/** The saved read of a document's bytes, by checksum (studio-document-read-<sha256>[-…].json), or null. A file that does
 *  not hold a read of these bytes is ignored, never trusted. */
export function savedRead(sha256: string, dir = SAVED_READS()): SavedRead | null {
  if (!/^[0-9a-f]{64}$/.test(sha256) || !existsSync(dir)) return null;
  for (const f of readdirSync(dir).filter((x) => x.startsWith(`studio-document-read-${sha256}`) && x.endsWith(".json")).sort()) {
    try {
      const r = JSON.parse(readFileSync(join(dir, f), "utf8")) as SavedRead;
      if (r?.document_sha256 === sha256 && r.reader === "ai_vision" && Array.isArray(r.proposals) && r.proposals.every((p) => typeof p?.fact === "string" && FACT.test(p.fact))) return r;
    } catch { /* not a read: ignored */ }
  }
  return null;
}

// ── Requests ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const SubjectBody = z.object({ subjectId: z.string({ message: "Name the person (subjectId)." }).regex(UUID, "Name the person (subjectId)."), mode: z.enum(["replay", "live"], { message: "mode is replay or live." }).optional() });
const CaseUpload = z.object({ subjectId: z.string({ message: "Name the person the document belongs to (subjectId)." }).regex(UUID, "Name the person the document belongs to (subjectId)."),
  documentType: z.string({ message: "Name the document type (documentType)." }).regex(/^[a-z0-9_]{1,120}$/, "Name the document type (documentType).") });
const Resolve = z.object({
  keep: z.enum(["answer", "document"], { message: "Say which value to keep: answer or document." }),
  reason: z.string({ message: "Give a reason for keeping this value." }).transform((x) => x.replace(INVISIBLE, "").trim())
    .pipe(z.string().min(1, "Give a reason for keeping this value.").max(MAX_REASON, `A reason is at most ${MAX_REASON} characters.`).regex(/[\p{L}\p{N}]/u, "Give a reason in words.")),
  answerId: z.string().regex(UUID).nullable().optional(),
});
const Checked = z.object({ document: z.string({ message: "Name the document it was checked against." }).regex(UUID, "Name the document it was checked against.") });
function parse<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  const r = schema.safeParse(input ?? {});
  if (!r.success) throw new HttpException(problemFromZod(r.error), HttpStatus.BAD_REQUEST);
  return r.data;
}
const problem = (status: number, code: string, title: string, detail: string, extra: Record<string, unknown> = {}): never => {
  throw new HttpException({ type: `https://expatready.local/problems/${code.replace(/_/g, "-")}`, title, status, code, detail, ...extra }, status);
};

/** Names compare without case and repeated spaces (the coded line is upper case); every other value as written. */
export function sameValue(fact: string, a: unknown, b: unknown): boolean {
  const s = (v: unknown) => (typeof v === "string" ? v : JSON.stringify(v ?? null)).trim();
  const name = /_names?$/.test(fact);
  return name ? s(a).toUpperCase().replace(/\s+/g, " ") === s(b).toUpperCase().replace(/\s+/g, " ") : s(a) === s(b);
}

type Placement = { fact: string; section_id: string; repeats: string; scope?: string; question_text?: string };
const placementsOf = (s: Snapshot) => s.placements as Placement[];
const labelOf = (s: Snapshot, fact: string) => placementsOf(s).find((p) => p.fact === fact)?.question_text || fact.split(".").pop()!.replace(/_/g, " ");

@Injectable()
export class CaseDocuments {
  constructor(@Inject(Runtime) private readonly r: Runtime, @Inject(Db) private readonly db: Db, @Inject(Audit) private readonly audit: Audit) {}

  private person(c: Reached, subjectId: string) {
    const p = c.participants.find((x) => x.subjectId === subjectId.toLowerCase());
    if (!p) fail("That person is not on this case.", HttpStatus.NOT_FOUND);
    return p!;
  }
  private typesOf(c: Reached) { return (this.r.snapshotOf(c).document_types ?? []) as { key: string; name: string }[]; }
  private typeName(c: Reached, key: string) { return CASE_KINDS[key]?.name ?? this.typesOf(c).find((t) => t.key === key)?.name ?? key.replace(/_/g, " "); }

  /** POST /runtime/cases/:id/documents: one file with no checklist line, the person's (the officer or the case's client). */
  async upload(actor: Actor, caseId: string, files: Upload[] | undefined, body: unknown) {
    const c = await this.r.reach(actor, caseId, "answer");
    const b = parse(CaseUpload, body);
    const who = this.person(c, b.subjectId);
    if (!CASE_KINDS[b.documentType] && !this.typesOf(c).some((t) => t.key === b.documentType)) fail(`This case's release has no document type "${b.documentType}". Nothing was stored.`, HttpStatus.UNPROCESSABLE_ENTITY);
    const f = (files ?? []).filter((x) => x.buffer);
    if (f.length !== 1 || f[0].fieldname !== "file") fail(`Send one file, in the field "file". Nothing was stored.`);
    const bytes = f[0].buffer!;
    if (!bytes.length) fail("The file is empty. Nothing was stored.");
    if (bytes.length > MAX_DOCUMENT_BYTES) fail(`The file is larger than ${MAX_DOCUMENT_MB} MB. Nothing was stored.`, HttpStatus.PAYLOAD_TOO_LARGE);
    const media = mediaOf(bytes);
    if (!media) fail("Send a PDF, JPEG or PNG file (judged by the file itself, not its name). Nothing was stored.", HttpStatus.UNSUPPORTED_MEDIA_TYPE);
    const docId = randomUUID(), sha256 = createHash("sha256").update(bytes).digest("hex");
    const rel = join("people", who.subjectId, "documents", `${docId}.${MEDIA[media!]}`), abs = join(DOCS(), rel);
    const now = new Date();
    try {
      mkdirSync(dirname(abs), { recursive: true }); writeFileSync(abs, bytes);
      await this.db.$transaction(async (tx) => {
        // One current file per person and type (case_document_one_current): the earlier one is kept as history.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`case-document|${who.subjectId}|${b.documentType}`}))`;
        await tx.caseDocument.updateMany({ where: { subjectId: who.subjectId, documentType: b.documentType, current: true }, data: { current: false, supersededAt: now } });
        await tx.caseDocument.create({ data: { id: docId, workspaceId: c.workspaceId, subjectId: who.subjectId, documentType: b.documentType, checklistLineId: null, fileName: cleanName(utf8Name(f[0].originalname)),
          mediaType: media!, sizeBytes: bytes.length, sha256, path: rel, uploadedBy: actor.id, uploadedAt: now } });
      });
    } catch (e) { rmSync(abs, { force: true }); throw e; }
    await this.audit.log(c.workspaceId, actor.id, "uploaded", "case document", docId, `${actor.name} uploaded ${this.typeName(c, b.documentType)} for the ${who.role.replace(/_/g, " ")} on case ${short(c.id)} (${MEDIA[media!].toUpperCase()}, ${bytes.length} bytes; no checklist line)`);
    return { document: { id: docId, subject: who.subjectId, document_type: b.documentType, document_name: this.typeName(c, b.documentType), current: true, file_name: cleanName(utf8Name(f[0].originalname)),
      media_type: media, size_bytes: bytes.length, sha256, uploaded_by: actor.id, uploaded_at: now.toISOString() } };
  }

  /** The section's facts and the person's current documents that can give one of them, each with its reader. */
  private async scope(c: Reached, section: string, subjectId: string) {
    const s = this.r.snapshotOf(c);
    const facts = new Set(placementsOf(s).filter((p) => p.section_id === section).map((p) => p.fact));
    if (!facts.size) fail("No such section in this case's release.", HttpStatus.NOT_FOUND);
    const who = this.person(c, subjectId);
    const docs = await this.db.caseDocument.findMany({ where: { subjectId: who.subjectId, current: true }, orderBy: [{ uploadedAt: "asc" }, { id: "asc" }] });
    const read = docs.map((d) => ({ d, by: readerOf({ key: d.documentType, name: this.typeName(c, d.documentType) }) }));
    const inScope = read.filter((x) => x.by && x.by.supplies.some((f) => facts.has(f)));
    // An identity document a person reads (P-134) is named, so the officer knows why nothing was proposed from it.
    const byPerson = read.filter((x) => !x.by).map((x) => ({ document: x.d.id, document_name: this.typeName(c, x.d.documentType), why: "Read by a person: an identity document is never sent to AI, and this one has no coded lines the rules read (P-134)." }));
    return { s, facts, who, docs: inScope.map((x) => ({ ...x.d, reader: x.by!.reader })), byPerson };
  }

  /** POST …/sections/:s/fill-from-documents/plan: the cost card before any AI read (P-110). */
  async plan(actor: Actor, caseId: string, section: string, body: unknown) {
    const c = await this.r.reach(actor, caseId, "officer");
    const b = parse(SubjectBody, body);
    const { docs } = await this.scope(c, section, b.subjectId);
    const ai = docs.filter((d) => d.reader === "ai_vision");
    const replay = ai.map((d) => ({ document: d.id, document_name: this.typeName(c, d.documentType), replay_available: !!savedRead(d.sha256) }));
    const live = letterReadUsd(ai.length);
    return { section, subject: b.subjectId,
      documents: docs.map((d) => ({ document: d.id, document_name: this.typeName(c, d.documentType), reader: d.reader, cost_usd: 0 })),
      estimate: { live_usd: live.worst_usd, usual_usd: live.usual_usd, worst_usd: live.worst_usd, replay_usd: 0, model: live.model, attempts: live.attempts, basis: "Estimate until the first saved read is measured (FQ-10); priced by the spend ledger (p2/ledger.ts)." },
      // A live read needs live AI on and the founder's Go for this run (P-295); this copy never makes one (P-175).
      live_allowed: false,
      live_why: aiLive() ? "A live document read needs the founder's Go for this run, with this cost stated first (P-295); the live reader is not built here (C6.5 part 3)." : "Live AI is off on this copy (the founder's switch). Nothing is sent; a saved read replays at US$0.",
      replay_available: ai.length > 0 && replay.every((x) => x.replay_available), replay };
  }

  /** The stored read of a document, made once (later calls return it as stored). */
  private async readOnce(actor: Actor, c: Reached, d: { id: string; subjectId: string; sha256: string; documentType: string; reader: Reader }, mode: "replay" | "live" | undefined) {
    const have = await this.db.documentReview.findUnique({ where: { documentId: d.id } });
    if (have) return have;
    let proposals: { fact: string; value: unknown; page: number; confidence: number; review: "collapsed" | "expanded"; checked: boolean; note?: string }[];
    let unreadable: { fact: string; reason: string }[], replayed = false;
    if (d.reader === "mrz") {
      const pdf = await this.bytesOf(d.id);
      const r = readPassport(d.id, pdf);
      proposals = r.proposals.map((p) => ({ fact: p.fact, value: p.value, page: p.source.page, confidence: p.confidence, review: p.review, checked: p.checked, ...(p.note ? { note: p.note } : {}) }));
      unreadable = r.unreadable;
    } else {
      if (mode === "live") problem(409, "live_refused", "Not possible now", aiLive() ? "A live document read needs the founder's Go for this run, with its cost stated first (P-295); it is not built here (C6.5 part 3). Nothing was read: US$0." : "Live AI is off on this copy (the founder's switch). Nothing was read: US$0.");
      if (mode !== "replay") problem(409, "cost_first", "See the cost first", `${this.typeName(c, d.documentType)} is read by AI: see its cost first (…/fill-from-documents/plan), then replay a saved read at US$0. Nothing was read.`);
      const saved = savedRead(d.sha256);
      if (!saved) problem(409, "no_saved_read", "No saved read", `There is no saved read of this ${this.typeName(c, d.documentType)} (FQ-10: one live read with the founder's Go is saved first). Nothing was read: US$0.`);
      const supplies = new Set(readerOf({ key: d.documentType, name: this.typeName(c, d.documentType) })?.supplies ?? []);
      proposals = saved!.proposals.filter((p) => supplies.has(p.fact)).map((p) => ({ fact: p.fact, value: p.value, page: Math.max(1, Math.trunc(Number(p.page ?? 1)) || 1), confidence: Math.min(1, Math.max(0, Number(p.confidence ?? 0.5) || 0)), review: "expanded" as const, checked: false, ...(p.note ? { note: String(p.note).slice(0, 300) } : {}) }));
      unreadable = (saved!.unreadable ?? []).filter((u) => supplies.has(u.fact)).map((u) => ({ fact: u.fact, reason: String(u.reason).slice(0, 300) }));
      replayed = true;
    }
    try {
      return await this.db.$transaction(async (tx) => {
        const review = await tx.documentReview.create({ data: { workspaceId: c.workspaceId, caseId: c.id, subjectId: d.subjectId, documentId: d.id, reader: d.reader, replayed, unreadable, readBy: actor.id } });
        if (proposals.length) await tx.readValue.createMany({ data: proposals.map((p) => ({ workspaceId: c.workspaceId, caseId: c.id, reviewId: review.id, documentId: d.id, subjectId: d.subjectId, fact: p.fact, valueJson: p.value as object, page: p.page, reader: d.reader, confidence: p.confidence, review: p.review, checked: p.checked, note: p.note ?? null })) });
        return review;
      });
    } catch (e) {
      // The same document read twice at the same moment: one read is stored; the other takes it.
      if ((e as { code?: string }).code === "P2002") { const again = await this.db.documentReview.findUnique({ where: { documentId: d.id } }); if (again) return again; }
      throw e;
    }
  }

  /** A stored document's bytes, checked against its sha256. */
  private async bytesOf(documentId: string): Promise<Buffer> {
    const d = await this.db.caseDocument.findUnique({ where: { id: documentId } });
    if (!d) fail("No such document.", HttpStatus.NOT_FOUND);
    const b = readFileSync(join(DOCS(), d!.path));
    if (createHash("sha256").update(b).digest("hex") !== d!.sha256) fail("This document's file changed on disk since it was uploaded; upload it again.", HttpStatus.CONFLICT);
    return b;
  }

  /** The proposals and reviews of a person's current documents (or of the given ones), as the contract shows them. */
  private async shown(c: Reached, subjectId: string, documents?: string[]) {
    const s = this.r.snapshotOf(c);
    const current = await this.db.caseDocument.findMany({ where: { subjectId, current: true, ...(documents ? { id: { in: documents } } : {}) }, select: { id: true, documentType: true, fileName: true } });
    const ids = current.map((d) => d.id);
    const reviews = ids.length ? await this.db.documentReview.findMany({ where: { documentId: { in: ids } }, include: { values: { orderBy: [{ fact: "asc" }] } }, orderBy: [{ readAt: "asc" }, { id: "asc" }] }) : [];
    const order = (f: string) => { const i = (MRZ_FACTS as readonly string[]).indexOf(f); return i < 0 ? 100 : i; };
    const proposals = reviews.flatMap((r) => [...r.values].sort((a, b) => order(a.fact) - order(b.fact) || a.fact.localeCompare(b.fact)).map((v) => ({
      id: v.id, fact: v.fact, label: labelOf(s, v.fact), value: v.valueJson, subject: v.subjectId,
      source: { document: v.documentId, page: v.page, reader: v.reader as Reader }, confidence: v.confidence, state: v.state as ReadState,
      review: v.review as "collapsed" | "expanded", checked: v.checked, replayed: r.replayed, ...(v.note ? { note: v.note } : {}),
      asked: placementsOf(s).some((p) => p.fact === v.fact), answer_id: v.answerId })));
    return {
      proposals,
      reviews: reviews.map((r) => { const d = current.find((x) => x.id === r.documentId)!; return {
        id: r.id, document: r.documentId, document_name: this.typeName(c, d.documentType), file_name: d.fileName, reader: r.reader as Reader, replayed: r.replayed,
        confirm: "one_per_document" as const, collapsed: r.values.filter((v) => v.review === "collapsed").map((v) => v.fact), expanded: r.values.filter((v) => v.review === "expanded").map((v) => v.fact),
        read: { by: r.readBy, at: r.readAt.toISOString() }, confirmed: r.confirmedBy ? { by: r.confirmedBy, at: r.confirmedAt!.toISOString() } : null }; }),
      unreadable: reviews.flatMap((r) => (r.unreadable as { fact: string; reason: string }[]).map((u) => ({ ...u, label: labelOf(s, u.fact), document: r.documentId }))),
    };
  }

  /** POST …/sections/:s/fill-from-documents: reads the section's documents (each once) and shows their proposals. */
  async fill(actor: Actor, caseId: string, section: string, body: unknown) {
    const c = await this.r.reach(actor, caseId, "officer");
    const b = parse(SubjectBody, body);
    const { docs, byPerson, who } = await this.scope(c, section, b.subjectId);
    let fresh = 0;
    for (const d of docs) { const had = await this.db.documentReview.count({ where: { documentId: d.id } }); await this.readOnce(actor, c, d, b.mode); if (!had) fresh++; }
    if (fresh) await this.audit.log(c.workspaceId, actor.id, "read", "case document", section, `${actor.name} read ${fresh} document${fresh === 1 ? "" : "s"} for the ${who.role.replace(/_/g, " ")} in ${section} on case ${short(c.id)} (${[...new Set(docs.map((d) => d.reader))].join(", ")}; US$0)`);
    const out = await this.shown(c, who.subjectId, docs.map((d) => d.id));
    return { section, subject: who.subjectId, ...out, not_read: byPerson, cost_usd: 0,
      message: docs.length ? `${out.proposals.length} value${out.proposals.length === 1 ? "" : "s"} proposed from ${docs.length} document${docs.length === 1 ? "" : "s"}: nothing is an answer until you Confirm & use each document.` : "No document of this person can give a fact of this section yet: upload it on the person's checklist line." };
  }

  /** GET /runtime/cases/:id/proposals?subject=: the person's (or every person's) read values and reviews. */
  async proposals(actor: Actor, caseId: string, q: { subject?: string }) {
    const c = await this.r.reach(actor, caseId, "officer");
    const subjects = q.subject ? [this.person(c, q.subject).subjectId] : c.participants.map((p) => p.subjectId);
    const all = await Promise.all(subjects.map((s) => this.shown(c, s)));
    return { proposals: all.flatMap((x) => x.proposals), reviews: all.flatMap((x) => x.reviews), unreadable: all.flatMap((x) => x.unreadable) };
  }

  /** POST …/documents/:doc/confirm-and-use (P-242): one review per document, staff only. */
  async confirmAndUse(actor: Actor, caseId: string, documentId: string, body: unknown) {
    const c = await this.r.reach(actor, caseId, "officer");
    const b = parse(SubjectBody, body);
    if (!UUID.test(documentId)) fail("No such document.", HttpStatus.NOT_FOUND);
    const who = this.person(c, b.subjectId);
    const doc = await this.db.caseDocument.findFirst({ where: { id: documentId.toLowerCase(), subjectId: { in: c.participants.map((p) => p.subjectId) } } });
    if (!doc) fail("No such document on this case.", HttpStatus.NOT_FOUND);
    if (doc!.subjectId !== who.subjectId) fail("This document is not this person's: confirm it on its own person.", HttpStatus.UNPROCESSABLE_ENTITY);
    if (!doc!.current) problem(409, "not_current", "Not possible now", "A newer file of this document was uploaded: read and confirm that one. Nothing was written.");
    const review = await this.db.documentReview.findUnique({ where: { documentId: doc!.id }, include: { values: true } });
    if (!review) problem(409, "not_read", "Not possible now", "This document has not been read yet: run \"Fill this from documents\" first. Nothing was written.");
    if (review!.confirmedBy) problem(409, "already_confirmed", "Already confirmed", `This document was already confirmed and used by ${nameOf(review!.confirmedBy)} on ${review!.confirmedAt!.toISOString()}: one Confirm & use per document (P-242). Nothing was written.`, { confirmed: { by: review!.confirmedBy, at: review!.confirmedAt!.toISOString() } });
    const s = this.r.snapshotOf(c), caseRole = who.role === "case";
    const fields = s.canonical_fields as { id: string; item_version: number; value_type?: string }[];
    const at = new Date();
    const out = { used: [] as string[], agreed: [] as string[], checks: [] as { id: string; fact: string }[], not_asked: [] as string[] };
    await this.db.$transaction(async (tx) => {
      // One Confirm & use per document: the review row is the lock (a second one at the same moment writes nothing).
      const n = await tx.documentReview.updateMany({ where: { id: review!.id, confirmedBy: null }, data: { confirmedBy: actor.id, confirmedAt: at } });
      if (n.count !== 1) problem(409, "already_confirmed", "Already confirmed", "This document was confirmed by someone else at the same moment: one Confirm & use per document (P-242). Nothing was written.");
      for (const v of review!.values) {
        const place = placementsOf(s).find((p) => p.fact === v.fact), field = fields.find((f) => f.id === v.fact);
        const def = place && field && place.repeats !== "per_row" && field.value_type !== "declaration" && isFilingFact(v.fact, place) === caseRole
          ? await tx.canonicalField.findFirst({ where: { workspaceId: c.workspaceId, canonicalFieldKey: v.fact, version: field.item_version } }) : null;
        if (!def) { await tx.readValue.update({ where: { id: v.id }, data: { state: "not_asked" } }); out.not_asked.push(v.fact); continue; }
        const source = { channel: "document_read", actor: actor.id, at: at.toISOString(), document: doc!.id, page: v.page, reader: v.reader, read_value: v.id };
        const current = await tx.clientCanonicalAnswer.findFirst({ where: { subjectId: who.subjectId, canonicalFieldKey: v.fact, rowKey: null, supersededById: null } });
        if (current && !sameValue(v.fact, current.valueJson, v.valueJson)) {
          // BR-7 (P-242): never settled silently: one open check, the typed answer kept.
          const open = await tx.answerCheck.findFirst({ where: { subjectId: who.subjectId, fact: v.fact, state: "open" } });
          const id = open?.id ?? randomUUID();
          if (!open) await tx.answerCheck.create({ data: { id, workspaceId: c.workspaceId, caseId: c.id, subjectId: who.subjectId, fact: v.fact, readValueId: v.id, documentId: doc!.id, answerId: current.id, typedValueJson: current.valueJson as object, documentValueJson: v.valueJson as object, openedBy: actor.id, openedAt: at } });
          await tx.readValue.update({ where: { id: v.id }, data: { state: "conflict", answerId: current.id } });
          out.checks.push({ id, fact: v.fact });
          continue;
        }
        if (current?.status === "VERIFIED") { await tx.readValue.update({ where: { id: v.id }, data: { state: "agreed", answerId: current.id } }); out.agreed.push(v.fact); continue; }
        // New, or agrees with an answer not yet confirmed: written VERIFIED with the document's provenance (it fills at
        // once, P-242). An agreeing answer keeps its own value (a name typed in lower case stays as typed).
        const id = randomUUID();
        if (current) { const m = await tx.clientCanonicalAnswer.updateMany({ where: { id: current.id, supersededById: null }, data: { supersededById: id } }); if (m.count !== 1) problem(409, "changed", "Changed by someone else", "An answer changed while confirming; nothing was written. Read the proposals again and confirm."); }
        await tx.clientCanonicalAnswer.create({ data: { id, workspaceId: c.workspaceId, partyId: who.subject.partyId, subjectId: who.subjectId, canonicalFieldId: def.id, canonicalFieldKey: v.fact, rowKey: null,
          valueJson: (current ? current.valueJson : v.valueJson) as object, status: "VERIFIED", sourceJson: current ? { ...source, from: current.id } : source, verifiedBy: actor.id, verifiedAt: at } });
        await tx.readValue.update({ where: { id: v.id }, data: { state: current ? "agreed" : "used", answerId: id } });
        (current ? out.agreed : out.used).push(v.fact);
      }
    });
    await this.audit.log(c.workspaceId, actor.id, "confirmed and used", "case document", doc!.id, `${actor.name} confirmed and used ${this.typeName(c, doc!.documentType)} for the ${who.role.replace(/_/g, " ")} on case ${short(c.id)}: ${out.used.length} written, ${out.agreed.length} agreed, ${out.checks.length} check${out.checks.length === 1 ? "" : "s"} opened (${out.checks.map((x) => x.fact).join(", ") || "none"})`);
    return { document: doc!.id, confirmed: { by: actor.id, at: at.toISOString() }, ...out,
      message: `Confirmed and used: ${out.used.length + out.agreed.length} value${out.used.length + out.agreed.length === 1 ? "" : "s"} now fill the forms.${out.checks.length ? ` ${out.checks.length} differ${out.checks.length === 1 ? "s" : ""} from a typed answer: resolve ${out.checks.length === 1 ? "that check" : "those checks"} (the typed answer is kept until then).` : ""}` };
  }

  private checkOut(s: Snapshot, x: Awaited<ReturnType<Db["answerCheck"]["findMany"]>>[number], current?: { id: string; valueJson: unknown } | null) {
    return { id: x.id, subject: x.subjectId, fact: x.fact, label: labelOf(s, x.fact), state: x.state, typed: x.typedValueJson, document_value: x.documentValueJson, document: x.documentId,
      answer_id: x.answerId, current: current ? { answer_id: current.id, value: current.valueJson } : null,
      opened: { by: x.openedBy, at: x.openedAt.toISOString() }, kept: x.kept, reason: x.reason, resolved: x.resolvedBy ? { by: x.resolvedBy, at: x.resolvedAt!.toISOString() } : null };
  }

  /** GET /runtime/cases/:id/checks?subject=&state=: typed-versus-document checks (staff). */
  async checks(actor: Actor, caseId: string, q: { subject?: string; state?: string }) {
    const c = await this.r.reach(actor, caseId, "officer");
    const subject = q.subject ? this.person(c, q.subject).subjectId : undefined;
    const rows = await this.db.answerCheck.findMany({ where: { caseId: c.id, ...(subject ? { subjectId: subject } : {}), ...(q.state === "open" || q.state === "resolved" ? { state: q.state } : {}) }, orderBy: [{ openedAt: "asc" }, { id: "asc" }] });
    const answers = rows.length ? await this.db.clientCanonicalAnswer.findMany({ where: { subjectId: { in: [...new Set(rows.map((x) => x.subjectId))] }, canonicalFieldKey: { in: [...new Set(rows.map((x) => x.fact))] }, rowKey: null, supersededById: null }, select: { id: true, subjectId: true, canonicalFieldKey: true, valueJson: true } }) : [];
    const s = this.r.snapshotOf(c);
    return { checks: rows.map((x) => this.checkOut(s, x, answers.find((a) => a.subjectId === x.subjectId && a.canonicalFieldKey === x.fact))) };
  }

  /** POST /runtime/checks/:id/resolve {keep, reason}: only with a reason (C6.5-14); keeping the document writes its value. */
  async resolve(actor: Actor, checkId: string, body: unknown) {
    if (!UUID.test(checkId)) fail("No such check.", HttpStatus.NOT_FOUND);
    const row = await this.db.answerCheck.findUnique({ where: { id: checkId.toLowerCase() } });
    if (!row) fail("No such check.", HttpStatus.NOT_FOUND);
    const c = await this.r.reach(actor, row!.caseId, "officer");
    const b = parse(Resolve, body);
    if (row!.state !== "open") problem(409, "already_resolved", "Already resolved", `This check was resolved by ${nameOf(row!.resolvedBy)}: it kept the ${row!.kept === "document" ? "document's value" : "typed answer"}. Nothing changed.`);
    const who = this.person(c, row!.subjectId), s = this.r.snapshotOf(c), at = new Date();
    const read = await this.db.readValue.findUnique({ where: { id: row!.readValueId } });
    await this.db.$transaction(async (tx) => {
      const current = await tx.clientCanonicalAnswer.findFirst({ where: { subjectId: row!.subjectId, canonicalFieldKey: row!.fact, rowKey: null, supersededById: null } });
      // The answer the officer looked at, when sent, must still be the current one (never resolve over a newer answer).
      if (b.answerId !== undefined && (current?.id ?? null) !== b.answerId) problem(409, "changed", "Changed by someone else", "The answer changed after you opened this check: read it again, then resolve. Nothing changed.", { current: current ? { answer_id: current.id, value: current.valueJson } : null });
      const n = await tx.answerCheck.updateMany({ where: { id: row!.id, state: "open" }, data: { state: "resolved", kept: b.keep, reason: b.reason, resolvedBy: actor.id, resolvedAt: at } });
      if (n.count !== 1) problem(409, "already_resolved", "Already resolved", "Someone resolved this check at the same moment. Nothing changed.");
      if (b.keep === "answer" || (current && sameValue(row!.fact, current.valueJson, row!.documentValueJson))) return;
      const id = randomUUID();
      if (current) { const m = await tx.clientCanonicalAnswer.updateMany({ where: { id: current.id, supersededById: null }, data: { supersededById: id } }); if (m.count !== 1) problem(409, "changed", "Changed by someone else", "The answer changed while resolving; nothing changed. Read the check again."); }
      const def = current ? { id: current.canonicalFieldId } : await tx.canonicalField.findFirst({ where: { workspaceId: c.workspaceId, canonicalFieldKey: row!.fact, version: (s.canonical_fields as { id: string; item_version: number }[]).find((f) => f.id === row!.fact)?.item_version ?? -1 } });
      if (!def) problem(409, "not_asked", "Not possible now", "This case's release no longer asks this fact. Nothing changed.");
      await tx.clientCanonicalAnswer.create({ data: { id, workspaceId: c.workspaceId, partyId: who.subject.partyId, subjectId: row!.subjectId, canonicalFieldId: def!.id, canonicalFieldKey: row!.fact, rowKey: null,
        valueJson: row!.documentValueJson as object, status: "VERIFIED", sourceJson: { channel: "document_read", actor: actor.id, at: at.toISOString(), document: row!.documentId, page: read?.page ?? 1, reader: read?.reader ?? null, read_value: row!.readValueId, check: row!.id, ...(current ? { from: current.id } : {}) }, verifiedBy: actor.id, verifiedAt: at } });
      await tx.readValue.update({ where: { id: row!.readValueId }, data: { state: "used", answerId: id } });
    });
    await this.audit.log(c.workspaceId, actor.id, "resolved", "answer check", row!.id, `${actor.name} resolved the check on ${row!.fact} for the ${who.role.replace(/_/g, " ")} on case ${short(c.id)}, keeping the ${b.keep === "document" ? "document's value" : "typed answer"} (with a reason)`);
    const after = await this.db.answerCheck.findUnique({ where: { id: row!.id } });
    const current = await this.db.clientCanonicalAnswer.findFirst({ where: { subjectId: row!.subjectId, canonicalFieldKey: row!.fact, rowKey: null, supersededById: null }, select: { id: true, valueJson: true } });
    return { check: this.checkOut(s, after!, current) };
  }

  /** POST /runtime/cases/:id/answers/:subject/:fact/checked-against-document {document} (P-142 D3): staff only. */
  async checkedAgainst(actor: Actor, caseId: string, subjectId: string, fact: string, body: unknown) {
    const c = await this.r.reach(actor, caseId, "officer");
    if (!FACT.test(fact)) fail("No such question.", HttpStatus.NOT_FOUND);
    const b = parse(Checked, body);
    const who = this.person(c, subjectId);
    const doc = await this.db.caseDocument.findFirst({ where: { id: b.document.toLowerCase(), subjectId: who.subjectId } });
    if (!doc) fail("No such document for this person.", HttpStatus.NOT_FOUND);
    if (await this.db.answerCheck.count({ where: { subjectId: who.subjectId, fact, state: "open" } })) problem(409, "open_checks", "Not possible now", "This answer and a document differ (an open check): resolve the check first. Nothing changed.");
    const at = new Date(), id = randomUUID();
    await this.db.$transaction(async (tx) => {
      const current = await tx.clientCanonicalAnswer.findFirst({ where: { subjectId: who.subjectId, canonicalFieldKey: fact, rowKey: null, supersededById: null } });
      if (!current) problem(409, "no_answer", "Not possible now", "There is no answer to check against the document yet. Nothing changed.");
      const n = await tx.clientCanonicalAnswer.updateMany({ where: { id: current!.id, supersededById: null }, data: { supersededById: id } });
      if (n.count !== 1) problem(409, "changed", "Changed by someone else", "The answer changed at the same moment; read it again. Nothing changed.");
      await tx.clientCanonicalAnswer.create({ data: { id, workspaceId: current!.workspaceId, partyId: current!.partyId, subjectId: current!.subjectId, canonicalFieldId: current!.canonicalFieldId, canonicalFieldKey: fact, rowKey: null, valueJson: current!.valueJson as object, status: "VERIFIED",
        sourceJson: { channel: "checked_against_document", actor: actor.id, at: at.toISOString(), from: current!.id, checked_against: { document: doc!.id, by: actor.id, at: at.toISOString() } }, verifiedBy: actor.id, verifiedAt: at } });
    });
    await this.audit.log(c.workspaceId, actor.id, "checked against a document", "case fact", fact, `${actor.name} checked ${fact} for the ${who.role.replace(/_/g, " ")} against ${this.typeName(c, doc!.documentType)} on case ${short(c.id)}`);
    return { answer: { id, fact, subject: who.subjectId, status: "VERIFIED", verified_by: actor.id, verified_at: at.toISOString(), checked_against: { document: doc!.id, by: actor.id, at: at.toISOString() } } };
  }
}

const nameOf = (id: string | null) => { if (!id) return "someone"; try { return actorOf(id).name; } catch { return id; } };

@CaseRead()
@Controller("api/runtime")
export class CaseDocumentsController {
  constructor(@Inject(CaseDocuments) private readonly x: CaseDocuments) {}
  @Post("cases/:id/documents") @UseGuards(CaseActorGuard) @UseInterceptors(AnyFilesInterceptor({ limits: { fileSize: MAX_DOCUMENT_BYTES + 1, files: 1 } }))
  upload(@Headers("x-actor") a: H, @Param("id") id: string, @UploadedFiles() files: Upload[], @Body() b: unknown) { return this.x.upload(actorOf(a), id, files, b); }
  @Post("cases/:id/sections/:s/fill-from-documents/plan") @HttpCode(200) plan(@Headers("x-actor") a: H, @Param("id") id: string, @Param("s") s: string, @Body() b: unknown) { return this.x.plan(actorOf(a), id, s, b); }
  @Post("cases/:id/sections/:s/fill-from-documents") @HttpCode(200) fill(@Headers("x-actor") a: H, @Param("id") id: string, @Param("s") s: string, @Body() b: unknown) { return this.x.fill(actorOf(a), id, s, b); }
  @Get("cases/:id/proposals") proposals(@Headers("x-actor") a: H, @Param("id") id: string, @Query() q: { subject?: string }) { return this.x.proposals(actorOf(a), id, q); }
  @Post("cases/:id/documents/:doc/confirm-and-use") @HttpCode(200) confirm(@Headers("x-actor") a: H, @Param("id") id: string, @Param("doc") d: string, @Body() b: unknown) { return this.x.confirmAndUse(actorOf(a), id, d, b); }
  @Get("cases/:id/checks") checks(@Headers("x-actor") a: H, @Param("id") id: string, @Query() q: { subject?: string; state?: string }) { return this.x.checks(actorOf(a), id, q); }
  @Post("checks/:id/resolve") @HttpCode(200) resolve(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.x.resolve(actorOf(a), id, b); }
  @Post("cases/:id/answers/:subject/:fact/checked-against-document") @HttpCode(200) checked(@Headers("x-actor") a: H, @Param("id") id: string, @Param("subject") s: string, @Param("fact") f: string, @Body() b: unknown) { return this.x.checkedAgainst(actorOf(a), id, s, f, b); }
}
