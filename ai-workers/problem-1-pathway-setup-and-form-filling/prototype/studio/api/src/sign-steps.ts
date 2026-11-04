// C8.1 signed PDFs (runtime lane, M3-F; r5c BR-8, BR-10, BR-21; P-65, P-136, P-143; M3-CONTRACT C8.1): one form item
// read with who signs and its signing steps; the steps print → signed → scan received → uploaded to IRCC, in order;
// the signed scan, stored append-only with its checksum (as C6.4's documents; stand-in SI-14). The case officer does
// every step; a client cannot (their own upload is the client portal, after M3). There is no "sign for the client"
// action. "Uploaded to IRCC" waits for the filing to be Ready to file, which C7.6 / L-SA3 decides (held, P-251): until
// then it is refused in words. US$0.
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Inject, Injectable, Param, Post, UploadedFiles, UseGuards, UseInterceptors } from "@nestjs/common";
import { AnyFilesInterceptor } from "@nestjs/platform-express";
import { cleanName, MAX_DOCUMENT_BYTES, MAX_DOCUMENT_MB, MEDIA, mediaOf } from "../../contracts/documents.ts";
import { isSignStep, minorFromAnswers, SIGN_STEP_WORDS, SIGN_STEPS, signersOf, stepRefusal, type SignStepKey, type StepsDone } from "../../engine/runtime/signing.ts";
import { channelOf, type FormLine } from "../../engine/runtime/prepare.ts";
import { changedFacts, changedGroups, formCoverage, groupFacts, type FormFact, type GroupFact } from "../../engine/runtime/forms.ts";
import { caseView } from "../../engine/runtime/case.ts";
import { CaseActorGuard, utf8Name } from "./case-checklist.ts";
import { actorOf, Audit, CaseRead, Db, fail, VAR, WORKSPACE_KEY, type Actor } from "./core.ts";
import { Runtime } from "./runtime.ts";

type H = string | undefined;
type Upload = { fieldname?: string; originalname?: string; buffer?: Buffer; size?: number };
const SCANS = () => VAR(WORKSPACE_KEY);
const short = (id: string) => id.slice(0, 8);

/** The current steps of each item on a case (C8.1), for the prepare view and the item read. */
export async function signStepsOf(db: Db, caseId: string): Promise<Map<string, StepsDone>> {
  const rows = await db.signStep.findMany({ where: { caseId, supersededAt: null }, orderBy: { doneAt: "asc" } });
  const out = new Map<string, StepsDone>();
  for (const r of rows) if (isSignStep(r.key)) out.set(r.itemId, { ...(out.get(r.itemId) ?? {}), [r.key]: { at: r.doneAt.toISOString(), by: r.doneBy, copy: r.copyId } });
  return out;
}

@Injectable()
export class SignSteps {
  constructor(@Inject(Runtime) private readonly r: Runtime, @Inject(Db) private readonly db: Db, @Inject(Audit) private readonly audit: Audit) {}

  /** A form item the case officer may sign for, with its case and line. */
  private async item(actor: Actor, itemId: string) {
    const item = /^[0-9a-f-]{36}$/i.test(itemId) ? await this.db.filingItem.findUnique({ where: { id: itemId }, include: { filing: { select: { status: true } } } }) : null;
    if (!item) fail("No such item.", HttpStatus.NOT_FOUND);
    const c = await this.r.reach(actor, item!.caseId, "officer");
    if (item!.kind !== "form" || !item!.active) fail("Only a form on this application is signed.", HttpStatus.UNPROCESSABLE_ENTITY);
    const line = (this.r.snapshotOf(c).forms as FormLine[]).find((l) => l.form_number === item!.itemKey);
    // Devin on #617: signing steps belong to a form signed by hand and scanned on this application (its channel today,
    // the officer's choice, else the line's), as the prepare view decides it; any other form has none to do.
    const handScanned = channelOf(line, undefined, null, item!.channel).signature === "HAND_SCANNED";
    return { c, item: item!, line, handScanned };
  }

  /** GET /runtime/items/:id: the item with who signs and its steps (each done with who and when, or not yet). */
  async read(actor: Actor, itemId: string) {
    const { c, item, line } = await this.item(actor, itemId);
    const people = this.r.peopleOf(c).filter((p) => p.role !== "case").map((p) => ({ id: p.subjectId, role: p.role, label: p.label, applies: p.applies }));
    const done = (await signStepsOf(this.db, c.id)).get(item.id) ?? {};
    const scans = await this.db.signedScan.findMany({ where: { itemId: item.id }, orderBy: { uploadedAt: "asc" }, select: { id: true, fileName: true, mediaType: true, sizeBytes: true, sha256: true, uploadedBy: true, uploadedAt: true } });
    return {
      id: item.id, kind: item.kind, form: item.itemKey, filing: item.filingId, subject: item.subjectId, version: item.version,
      signers: signersOf(people, item.subjectId, line?.who ?? "each_applicant", line?.signed_by, minorFromAnswers((await this.r.state(c)).answers, new Date())),
      sign_steps: SIGN_STEPS.map((key) => ({ key, words: SIGN_STEP_WORDS[key], done: done[key] ? { at: done[key]!.at, by: done[key]!.by, ...(key === "print" ? { copy: done[key]!.copy ?? null } : {}) } : null })),
      signed_scans: scans.map((x) => ({ id: x.id, file_name: x.fileName, media_type: x.mediaType, size_bytes: x.sizeBytes, sha256: x.sha256, uploaded_by: x.uploadedBy, uploaded_at: x.uploadedAt.toISOString() })),
    };
  }

  /** POST /runtime/items/:id/sign-steps/:key: one step, in order; "print" names the generated copy printed. */
  async step(actor: Actor, itemId: string, keyIn: string, body: unknown) {
    if (!isSignStep(keyIn)) fail(`No such step: the steps are ${SIGN_STEPS.map((k) => SIGN_STEP_WORDS[k]).join(", ")}.`, HttpStatus.NOT_FOUND);
    const key = keyIn as SignStepKey;
    const { c, item, handScanned } = await this.item(actor, itemId);
    if (!handScanned) fail(`${item.itemKey} is not signed by hand and scanned on this application, so it has no signing steps. Nothing was recorded.`, HttpStatus.CONFLICT);
    const done = (await signStepsOf(this.db, c.id)).get(item.id) ?? {};
    // C9.2 (BR-12, BR-20): a form printed from a copy whose facts changed since (the representative of record among them)
    // is signed again: a new print starts its steps again (the earlier steps superseded, the signed scan kept). Once it is
    // uploaded to IRCC it is not (after filing is C8.2's record).
    const restart = key === "print" && !!done.print && !done.uploaded_to_ircc && !!done.print.copy && (await this.changedSince(c, item, done.print.copy!)).length > 0;
    // Ready to file is C7.6's (L-SA3, held under P-251): the filing's stored status says it once that is built.
    const refusal = restart ? null : stepRefusal(key, done, item.itemKey, { filingReady: item.filing.status.toLowerCase() === "ready_to_file" } /* review m-3 on #617: C7.6's pack reads "ready_to_file"; the column stores upper case (NOT_STARTED) */);
    if (refusal) fail(refusal, HttpStatus.CONFLICT);
    let copyId: string | null = null;
    if (key === "print") {
      const b = (body ?? {}) as { copy?: unknown };
      const copy = typeof b.copy === "string" && /^[0-9a-f-]{36}$/i.test(b.copy) ? await this.db.formInstance.findUnique({ where: { id: b.copy }, select: { snapshot: { select: { factsJson: true } }, id: true, caseId: true, subjectId: true, formNumber: true, status: true } }) : null;
      if (!copy || copy.caseId !== c.id || copy.subjectId !== item.subjectId || copy.formNumber !== item.itemKey || copy.status !== "GENERATED")
        fail(`Print a generated copy of ${item.itemKey} for this person first: generate it, then send its id as "copy".`, HttpStatus.CONFLICT);
      // Break M1 on #617: the copy printed must still say what the case says (C-10: a fact the form reads changed since
      // it was made → out of date), so a person never signs a form with old answers.
      // Devin on #617 (a31b1dfe): and the repeating groups it reads ("none apply" taken back, an entry added), as `lock` does.
      const changed = await this.changedSince(c, item, copy!.id, copy!.snapshot?.factsJson);
      if (changed.length) fail(`This copy of ${item.itemKey} is out of date: ${changed.length} change${changed.length === 1 ? "" : "s"} since it was made. Generate a new copy and print that one. Nothing was recorded.`, HttpStatus.CONFLICT);
      copyId = copy!.id;
    }
    if (restart) {
      await this.db.$transaction(async (tx) => {
        await tx.signStep.updateMany({ where: { itemId: item.id, supersededAt: null }, data: { supersededAt: new Date() } });
        await this.save(c, item, key, actor, copyId, tx as unknown as Db);
      });
      await this.audit.log(c.workspaceId, actor.id, "signed", "sign step", item.id, `${actor.name} printed a new copy of ${item.itemKey} on case ${short(c.id)}: the signed one was out of date, so its signing starts again (the earlier signed scan is kept)`);
    } else await this.save(c, item, key, actor, copyId);
    return this.read(actor, itemId);
  }

  /** The facts and repeating groups a copy of the item's form read that differ from the case now (C-10, C9.2). */
  private async changedSince(c: Awaited<ReturnType<Runtime["reach"]>>, item: { itemKey: string; subjectId: string }, copyId: string, factsJson?: unknown): Promise<string[]> {
    const json = factsJson ?? (await this.db.formInstance.findUnique({ where: { id: copyId }, select: { snapshot: { select: { factsJson: true } } } }))?.snapshot?.factsJson;
    const { answers, rows, groups } = await this.r.state(c);
    const snap = this.r.snapshotOf(c), people = this.r.peopleOf(c);
    const cov = formCoverage(snap, people, answers, rows, item.itemKey, item.subjectId);
    const stored = (json ?? {}) as { facts?: FormFact[]; groups?: GroupFact[] };
    const view = caseView(snap, people, answers, rows, "agent", new Date(), groups);
    return [...changedFacts(stored.facts ?? [], cov?.facts ?? []), ...changedGroups(stored.groups, groupFacts(view, item.itemKey, item.subjectId))];
  }

  private async save(c: { id: string; workspaceId: string }, item: { id: string; itemKey: string }, key: (typeof SIGN_STEPS)[number], actor: Actor, copyId: string | null = null, tx: Db = this.db) {
    try { await tx.signStep.create({ data: { workspaceId: c.workspaceId, caseId: c.id, itemId: item.id, key, copyId, doneBy: actor.id } }); }
    catch (e) { if ((e as { code?: string }).code === "P2002") fail(`${SIGN_STEP_WORDS[key]} was just done for ${item.itemKey} by someone else: read the item again.`, HttpStatus.CONFLICT); throw e; }
    if (tx === this.db) await this.audit.log(c.workspaceId, actor.id, "signed", "sign step", item.id, `${actor.name} marked ${item.itemKey} "${SIGN_STEP_WORDS[key]}" on case ${short(c.id)}`);
  }

  /** POST /runtime/items/:id/signed-scan: the signed scan (one PDF, JPEG or PNG, judged by its bytes), stored with its
   *  checksum, never changed in place; it marks "Signed scan received". */
  async scan(actor: Actor, itemId: string, files: Upload[] | undefined) {
    const { c, item, handScanned } = await this.item(actor, itemId);
    if (!handScanned) fail(`${item.itemKey} is not signed by hand and scanned on this application, so it takes no signed scan. Nothing was stored.`, HttpStatus.CONFLICT);
    const f = (files ?? []).filter((x) => x.buffer);
    if (f.length !== 1 || f[0].fieldname !== "file") fail(`Send one file, in the field "file". Nothing was stored.`);
    const bytes = f[0].buffer!;
    if (!bytes.length) fail("The file is empty. Nothing was stored.");
    if (bytes.length > MAX_DOCUMENT_BYTES) fail(`The file is larger than ${MAX_DOCUMENT_MB} MB. Nothing was stored.`, HttpStatus.PAYLOAD_TOO_LARGE);
    const media = mediaOf(bytes);
    if (!media) fail("Send the signed scan as a PDF, JPEG or PNG (judged by the file itself, not its name). Nothing was stored.", HttpStatus.UNPROCESSABLE_ENTITY);
    const done = (await signStepsOf(this.db, c.id)).get(item.id) ?? {};
    const refusal = stepRefusal("scan_received", done, item.itemKey, { viaUpload: true });
    if (refusal) fail(`${refusal} Nothing was stored.`, HttpStatus.CONFLICT);
    const id = randomUUID(), sha256 = createHash("sha256").update(bytes).digest("hex");
    const rel = join("cases", c.id, "signed-scans", `${id}.${MEDIA[media!]}`), abs = join(SCANS(), rel);
    try {
      mkdirSync(dirname(abs), { recursive: true }); writeFileSync(abs, bytes);
      await this.db.$transaction(async (tx) => {
        await tx.signedScan.create({ data: { id, workspaceId: c.workspaceId, caseId: c.id, itemId: item.id, fileName: cleanName(utf8Name(f[0].originalname)), mediaType: media!, sizeBytes: bytes.length, sha256, path: rel, uploadedBy: actor.id } });
        await this.save(c, item, "scan_received", actor, null, tx as unknown as Db);
      });
    } catch (e) { rmSync(abs, { force: true }); throw e; } // a refused upload leaves no file behind
    await this.audit.log(c.workspaceId, actor.id, "uploaded", "signed scan", id, `${actor.name} uploaded the signed scan of ${item.itemKey} on case ${short(c.id)} (${MEDIA[media!].toUpperCase()}, ${bytes.length} bytes)`);
    return this.read(actor, itemId);
  }
}

@CaseRead()
@Controller("api/runtime")
export class SignStepsController {
  constructor(@Inject(SignSteps) private readonly s: SignSteps) {}
  @Get("items/:id") read(@Headers("x-actor") a: H, @Param("id") id: string) { return this.s.read(actorOf(a), id); }
  @Post("items/:id/sign-steps/:key") @HttpCode(200) step(@Headers("x-actor") a: H, @Param("id") id: string, @Param("key") key: string, @Body() b: unknown) { return this.s.step(actorOf(a), id, key, b); }
  // One byte over 20 MB so a file of exactly 20 MB is taken (as C6.4); the route's own check refuses more.
  @Post("items/:id/signed-scan") @UseGuards(CaseActorGuard) @UseInterceptors(AnyFilesInterceptor({ limits: { fileSize: MAX_DOCUMENT_BYTES + 1, files: 1 } }))
  scan(@Headers("x-actor") a: H, @Param("id") id: string, @UploadedFiles() files: Upload[]) { return this.s.scan(actorOf(a), id, files); }
}
