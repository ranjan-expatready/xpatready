// C8.1 signed PDFs (runtime lane, M3-F; r5c BR-8, BR-10, BR-21; P-65, P-136, P-143; M3-CONTRACT C8.1): one form item
// read with who signs and its signing steps; the steps print → signed → scan received → uploaded to IRCC, in order;
// the signed scan, stored append-only with its checksum (as C6.4's documents; stand-in SI-14). The case officer does
// every step; a client cannot (their own upload is the client portal, after M3). There is no "sign for the client"
// action. "Uploaded to IRCC" waits for the filing to be Ready to file, which C7.6 / L-SA3 decides (held, P-251): until
// then it is refused in words. US$0.
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Body, Controller, forwardRef, Get, Headers, HttpCode, HttpStatus, Inject, Injectable, Param, Post, UploadedFiles, UseGuards, UseInterceptors } from "@nestjs/common";
import { AnyFilesInterceptor } from "@nestjs/platform-express";
import { cleanName, MAX_DOCUMENT_BYTES, MAX_DOCUMENT_MB, MEDIA, mediaOf } from "../../contracts/documents.ts";
import { isPenStep, isSignStep, minorFromAnswers, PEN_STEP_WORDS, PEN_STEPS, penRefusal, SIGN_STEP_WORDS, SIGN_STEPS, signersOf, stepRefusal, type PenStepKey, type SignStepKey, type StepsDone } from "../../engine/runtime/signing.ts";
import { channelOf, type FormLine } from "../../engine/runtime/prepare.ts";
import { changedFacts, changedGroups, formCoverage, groupFacts, readiness, type FormFact, type GroupFact } from "../../engine/runtime/forms.ts";
import { caseView } from "../../engine/runtime/case.ts";
import { CaseActorGuard, utf8Name } from "./case-checklist.ts";
import { actorOf, Audit, CaseRead, Db, fail, VAR, WORKSPACE_KEY, type Actor } from "./core.ts";
import { Runtime } from "./runtime.ts";
import { CasePrepare } from "./case-prepare.ts"; // C7.6: Ready to file is read now (case-prepare.ts imports signStepsOf: forwardRef below)
import { refuseIfRecorded } from "./submission-record.ts"; // C8.2-9: a recorded application is read-only
import { addedOn, completedSince } from "../../engine/runtime/added-forms.ts"; // C7.8: a blank added form's completed copy
import { isBarcodeForm } from "../../contracts/forms.ts"; // B132: a barcode form is printed from its validated copy

type H = string | undefined;
type Upload = { fieldname?: string; originalname?: string; buffer?: Buffer; size?: number };
const SCANS = () => VAR(WORKSPACE_KEY);
const short = (id: string) => id.slice(0, 8);
/** The case's row lock, taken first in every write transaction here (review M2), as case-prepare.ts's writes take it. */
const lockCase = (q: Db, caseId: string) => q.$queryRaw`SELECT id FROM runtime_case WHERE id = ${caseId}::uuid FOR UPDATE`;
/** B130: the printed copy a step names ("copy" in its body or form), or undefined when it names none (a scripted
 *  set-up's call keeps today's behaviour; the screen always names it). Anything else named is a copy that is not printed. */
const namedCopy = (body: unknown): string | undefined => {
  const v = (body ?? {}) as { copy?: unknown };
  return v.copy === undefined || v.copy === null || v.copy === "" ? undefined : String(v.copy);
};
/** The words of any recorded step (hand-signed and scanned, or signed in pen on Paper, B132). */
const stepWords = (k: SignStepKey | PenStepKey) => (isSignStep(k) ? SIGN_STEP_WORDS[k] : PEN_STEP_WORDS[k as PenStepKey]);

/** The current steps of each item on a case (C8.1), for the prepare view and the item read. */
export async function signStepsOf(db: Db, caseId: string): Promise<Map<string, StepsDone>> {
  const rows = await db.signStep.findMany({ where: { caseId, supersededAt: null }, orderBy: { doneAt: "asc" } });
  const out = new Map<string, StepsDone>();
  for (const r of rows) if (isSignStep(r.key) || isPenStep(r.key)) out.set(r.itemId, { ...(out.get(r.itemId) ?? {}), [r.key]: { at: r.doneAt.toISOString(), by: r.doneBy, copy: r.copyId } });
  return out;
}

@Injectable()
export class SignSteps {
  constructor(@Inject(Runtime) private readonly r: Runtime, @Inject(Db) private readonly db: Db, @Inject(Audit) private readonly audit: Audit,
    @Inject(forwardRef(() => CasePrepare)) private readonly prepare: CasePrepare) {}

  /** A form item the case officer may sign for, with its case and line. */
  private async item(actor: Actor, itemId: string) {
    const item = /^[0-9a-f-]{36}$/i.test(itemId) ? await this.db.filingItem.findUnique({ where: { id: itemId }, include: { filing: { select: { status: true } } } }) : null;
    if (!item) fail("No such item.", HttpStatus.NOT_FOUND);
    const c = await this.r.reach(actor, item!.caseId, "officer");
    if (item!.kind !== "form" || !item!.active) fail("Only a form on this application is signed.", HttpStatus.UNPROCESSABLE_ENTITY);
    const line = (this.r.snapshotOf(c).forms as FormLine[]).find((l) => l.form_number === item!.itemKey);
    // Devin on #617: signing steps belong to a form signed by hand and scanned on this application (its channel today,
    // the officer's choice, else the line's), as the prepare view decides it; any other form has none to do.
    // B132: a form signed in pen on Paper (P-380 Q3) has its own steps, Printed then Signed in pen.
    const signature = channelOf(line, undefined, null, item!.channel).signature;
    // C7.8 (B141 BR-7, M5): a blank official PDF the case officer added takes one upload, its completed copy (the signed
    // one when it is signed), with no printing step: nothing on it is made by the product.
    const blank = addedOn(this.r.snapshotOf(c), item!.itemKey, item!.subjectId)?.kind === "blank";
    return { c, item: item!, line, handScanned: signature === "HAND_SCANNED", pen: signature === "PEN", blank };
  }

  /** GET /runtime/items/:id: the item with who signs and its steps (each done with who and when, or not yet). */
  async read(actor: Actor, itemId: string) {
    const { c, item, line, pen, blank } = await this.item(actor, itemId);
    const people = this.r.peopleOf(c).filter((p) => p.role !== "case").map((p) => ({ id: p.subjectId, role: p.role, label: p.label, applies: p.applies }));
    const done = (await signStepsOf(this.db, c.id)).get(item.id) ?? {};
    const scans = await this.db.signedScan.findMany({ where: { itemId: item.id }, orderBy: { uploadedAt: "asc" }, select: { id: true, fileName: true, mediaType: true, sizeBytes: true, sha256: true, uploadedBy: true, uploadedAt: true } });
    return {
      id: item.id, kind: item.kind, form: item.itemKey, filing: item.filingId, subject: item.subjectId, version: item.version,
      signers: signersOf(people, item.subjectId, line?.who ?? "each_applicant", line?.signed_by, minorFromAnswers((await this.r.state(c)).answers, new Date())),
      // C7.8 (breaker m7): a blank added form has only "Uploaded to IRCC" after its completed copy.
      sign_steps: (blank ? (["uploaded_to_ircc"] as SignStepKey[]) : pen ? PEN_STEPS : SIGN_STEPS).map((key: SignStepKey | PenStepKey) => ({ key, words: stepWords(key), done: done[key] ? { at: done[key]!.at, by: done[key]!.by, ...(key === "print" ? { copy: done[key]!.copy ?? null } : {}) } : null })),
      signed_scans: scans.map((x) => ({ id: x.id, file_name: x.fileName, media_type: x.mediaType, size_bytes: x.sizeBytes, sha256: x.sha256, uploaded_by: x.uploadedBy, uploaded_at: x.uploadedAt.toISOString() })),
    };
  }

  /** POST /runtime/items/:id/sign-steps/:key: one step, in order; "print" names the generated copy printed. */
  async step(actor: Actor, itemId: string, keyIn: string, body: unknown) {
    if (!isSignStep(keyIn) && !isPenStep(keyIn)) fail(`No such step: a form signed by hand and scanned takes ${SIGN_STEPS.map((k) => SIGN_STEP_WORDS[k]).join(", ")}; a form signed in pen on Paper takes ${PEN_STEPS.map((k) => PEN_STEP_WORDS[k]).join(", ")}.`, HttpStatus.NOT_FOUND);
    const { c, item, handScanned, pen, blank } = await this.item(actor, itemId);
    // C7.8 (B141 M5): a blank added form has no printing steps: its one upload is the completed (signed) copy. Its one step
    // after that (breaker m7) is "Uploaded to IRCC", once the completed copy is in and the filing is Ready to file.
    if (blank) {
      if (keyIn !== "uploaded_to_ircc") fail(`${item.itemKey} is the blank official PDF the case officer added: it has no printing steps. Fill it by hand, have it signed if it is signed, and upload the completed copy. Nothing was recorded.`, HttpStatus.CONFLICT);
      await refuseIfRecorded(this.db, [item.filingId], `the signing of ${item.itemKey}`);
      const a = addedOn(this.r.snapshotOf(c), item.itemKey, item.subjectId)!;
      const scans = await this.db.signedScan.findMany({ where: { itemId: item.id }, select: { uploadedAt: true } });
      if (!completedSince(scans, a)) fail(`Upload the completed copy of ${item.itemKey} first. Nothing was recorded.`, HttpStatus.CONFLICT);
      const ready = ((await this.prepare.view(actor, c.id)) as { filings: { id: string; status: string }[] }).filings.find((x) => x.id === item.filingId)?.status === "ready_to_file";
      if (!ready) fail(`Uploaded to IRCC waits for the filing to be Ready to file. Nothing was recorded.`, HttpStatus.CONFLICT);
      if ((await signStepsOf(this.db, c.id)).get(item.id)?.uploaded_to_ircc) fail(`${item.itemKey} is already marked uploaded to IRCC.`, HttpStatus.CONFLICT);
      await this.save(c, item, "uploaded_to_ircc", actor);
      return this.read(actor, itemId);
    }
    // B129 (B3 challenge M2, break M3 on #1221): once the submission is recorded nothing on it is signed again, not even a
    // new print after a fact changed (the restart below); the read-only words come first, as for the channel and "entered".
    await refuseIfRecorded(this.db, [item.filingId], `the signing of ${item.itemKey}`);
    if (!handScanned && !pen) fail(`${item.itemKey} is not signed by hand and scanned, nor signed in pen on Paper, on this application, so it has no signing steps. Nothing was recorded.`, HttpStatus.CONFLICT);
    // B132: each way of signing takes its own steps; the other's are refused in words.
    if (handScanned && !isSignStep(keyIn)) fail(`${item.itemKey} is signed by hand and scanned: its steps are ${SIGN_STEPS.map((k) => SIGN_STEP_WORDS[k]).join(", ")}. Nothing was recorded.`, HttpStatus.CONFLICT);
    if (pen && !isPenStep(keyIn)) fail(`${item.itemKey} is signed in pen on Paper: its steps are ${PEN_STEPS.map((k) => PEN_STEP_WORDS[k]).join(", ")}. Nothing was recorded.`, HttpStatus.CONFLICT);
    const key = keyIn as SignStepKey | PenStepKey;
    const done = (await signStepsOf(this.db, c.id)).get(item.id) ?? {};
    // C9.2 (BR-12, BR-20): a form printed from a copy whose facts changed since (the representative of record among them)
    // is signed again: a new print starts its steps again (the earlier steps superseded, the signed scan kept). Once it is
    // uploaded to IRCC it is not (after filing is C8.2's record).
    // Ready to file is C7.6's (L-SA3, P-315). Break B1 on #861: it is read now, from the prepare view (which takes a
    // filing that is no longer ready back to Not started), never from the stored status alone.
    const filingReady = key === "uploaded_to_ircc"
      ? ((await this.prepare.view(actor, c.id)) as { filings: { id: string; status: string }[] }).filings.find((x) => x.id === item.filingId)?.status === "ready_to_file"
      : item.filing.status.toLowerCase() === "ready_to_file";
    // B132: on Paper a barcode form (isBarcodeForm, review m1: never judged from a step that may be missing) is printed only
    // from its validated copy read back for today's facts, as the prepare view's Paper line reads it (paperLine), on a
    // first print and on a re-print after a fact changed alike (review M1).
    const barcode = pen && isBarcodeForm(item.itemKey);
    let validated: { copy: string; current: boolean } | null = null;
    if (barcode && (key === "print" || key === "sign_in_pen")) {
      const v = (await this.prepare.view(actor, c.id)) as { items: { id: string; record?: string; validated?: { copy: string; current: boolean } | null }[] };
      validated = v.items.find((x) => x.id === item.id && !x.record)?.validated ?? null;
    }
    const paper = { barcode, validated: !!validated?.current };
    // B132: the same for a form signed in pen (a signed copy whose facts changed is signed again); and (Devin on #1278) a
    // barcode form whose printed copy is no longer its current validated copy (a newer one was read back) is printed again.
    const restart = key === "print" && !!done.print && !done.uploaded_to_ircc && !!done.print.copy
      && ((barcode && done.print.copy !== validated?.copy) || (await this.changedSince(c, item, done.print.copy!)).length > 0);
    const notValidated = barcode && key === "print" && !paper.validated ? penRefusal("print", {}, item.itemKey, paper) : null;
    const refusal = notValidated ?? (restart ? null : pen ? penRefusal(key as PenStepKey, done, item.itemKey, paper) : stepRefusal(key as SignStepKey, done, item.itemKey, { filingReady }));
    if (refusal) fail(refusal, HttpStatus.CONFLICT);
    // P-244 with P-411 (B150 merge check M1; Lead 31, 16:18 IST on #1246): an officer-recorded background answer is on the
    // draft at once, but nothing is printed or signed until the client re-confirms it, so a signed copy never carries
    // an answer the client has not seen.
    if (key === "print" || key === "signed" || key === "sign_in_pen") {
      const waiting = await this.awaitingClient(c, item);
      if (waiting.length) fail(`${item.itemKey} is printed and signed only once the client re-confirms what the case officer recorded: ${waiting.join(", ")}. The client checks it on their questionnaire ("This is right" or Change). Nothing was recorded.`, HttpStatus.CONFLICT);
    }
    // Devin on #1278 (red): Signed in pen signs the validated copy printed now, never an earlier print once a newer
    // validated copy was read back (the Paper line and readiness count only steps done on the current validated copy).
    if (barcode && key === "sign_in_pen" && (!validated?.current || done.print?.copy !== validated.copy))
      fail(`Signed in pen is for the validated copy of ${item.itemKey} printed now: a newer validated copy was read back since it was printed. Print the validated copy, then have it signed in pen. Nothing was recorded.`, HttpStatus.CONFLICT);
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
      // B132 review M1: the copy printed is the validated one itself (it holds the barcode page), never another copy.
      if (barcode && copy!.id !== validated?.copy) fail(`Print the validated copy of ${item.itemKey}: the copy read back after Validate in Adobe, which holds its barcode page, not another copy. Nothing was recorded.`, HttpStatus.CONFLICT);
      copyId = copy!.id;
    }
    // B130 (B3 challenge m5): a step after Printed may name the printed copy it signs; when it does, it must be the copy
    // printed now (checked again under the case lock in save), so a page read before a new print never signs the new one.
    const signs = key === "print" ? undefined : namedCopy(body);
    if (restart) {
      await this.db.$transaction(async (tx) => {
        await lockCase(tx as unknown as Db, c.id); // review M2: the case row first, as case-prepare.ts's writes take it
        await tx.signStep.updateMany({ where: { itemId: item.id, supersededAt: null }, data: { supersededAt: new Date() } });
        await this.save(c, item, key, actor, copyId, tx as unknown as Db);
      });
      await this.audit.log(c.workspaceId, actor.id, "signed", "sign step", item.id, `${actor.name} printed a new copy of ${item.itemKey} on case ${short(c.id)}: the signed one was out of date, so its signing starts again (the earlier signed scan is kept)`);
    } else await this.save(c, item, key, actor, copyId, undefined, signs);
    return this.read(actor, itemId);
  }

  /** The facts and repeating groups a copy of the item's form read that differ from the case now (C-10, C9.2). */
  /** P-244 (B150 merge check M1): the facts this form reads for this person that wait for the client to re-confirm what an
   *  officer recorded, by their question (readiness, C6.18's reason). */
  private async awaitingClient(c: Awaited<ReturnType<Runtime["reach"]>>, item: { itemKey: string; subjectId: string }): Promise<string[]> {
    const { answers, rows, groups } = await this.r.state(c);
    const view = caseView(this.r.snapshotOf(c), this.r.peopleOf(c), answers, rows, "agent", new Date(), groups);
    return [...new Set(readiness(view, item.itemKey, item.subjectId).missing.filter((m) => m.reason === "waits for the client to re-confirm").map((m) => m.label))];
  }

  private async changedSince(c: Awaited<ReturnType<Runtime["reach"]>>, item: { itemKey: string; subjectId: string }, copyId: string, factsJson?: unknown): Promise<string[]> {
    const json = factsJson ?? (await this.db.formInstance.findUnique({ where: { id: copyId }, select: { snapshot: { select: { factsJson: true } } } }))?.snapshot?.factsJson;
    const { answers, rows, groups } = await this.r.state(c);
    const snap = this.r.snapshotOf(c), people = this.r.peopleOf(c);
    const cov = formCoverage(snap, people, answers, rows, item.itemKey, item.subjectId);
    const stored = (json ?? {}) as { facts?: FormFact[]; groups?: GroupFact[] };
    const view = caseView(snap, people, answers, rows, "agent", new Date(), groups);
    return [...changedFacts(stored.facts ?? [], cov?.facts ?? []), ...changedGroups(stored.groups, groupFacts(view, item.itemKey, item.subjectId))];
  }

  private async save(c: { id: string; workspaceId: string }, item: { id: string; itemKey: string; filingId: string }, key: SignStepKey | PenStepKey, actor: Actor, copyId: string | null = null, tx?: Db, signs?: string) {
    // B129 review Minor: the read-only lock is checked again under the case's row lock, as case-prepare.ts's writes do, so
    // a step never lands just after the submission is recorded.
    const write = async (q: Db) => {
      await lockCase(q, c.id);
      await refuseIfRecorded(q, [item.filingId], `the signing of ${item.itemKey}`);
      if (signs !== undefined) {
        const now = await q.signStep.findFirst({ where: { itemId: item.id, key: "print", supersededAt: null }, select: { copyId: true } });
        if (now?.copyId !== signs) fail(`${stepWords(key)} names a printed copy of ${item.itemKey} that is not the one printed now: it was printed again since this page was read. Read the item again and sign the copy printed now. ${key === "scan_received" ? "Nothing was stored." : "Nothing was recorded."}`, HttpStatus.CONFLICT);
      }
      try { await q.signStep.create({ data: { workspaceId: c.workspaceId, caseId: c.id, itemId: item.id, key, copyId, doneBy: actor.id } }); }
      catch (e) { if ((e as { code?: string }).code === "P2002") fail(`${stepWords(key)} was just done for ${item.itemKey} by someone else: read the item again.`, HttpStatus.CONFLICT); throw e; }
    };
    if (tx) return write(tx);
    await this.db.$transaction(async (t) => write(t as unknown as Db));
    await this.audit.log(c.workspaceId, actor.id, "signed", "sign step", item.id, `${actor.name} marked ${item.itemKey} "${stepWords(key)}" on case ${short(c.id)}`);
  }

  /** POST /runtime/items/:id/signed-scan: the signed scan (one PDF, JPEG or PNG, judged by its bytes), stored with its
   *  checksum, never changed in place; it marks "Signed scan received". */
  async scan(actor: Actor, itemId: string, files: Upload[] | undefined, body?: unknown) {
    const { c, item, handScanned, blank } = await this.item(actor, itemId);
    await refuseIfRecorded(this.db, [item.filingId], `the signing of ${item.itemKey}`); // B129: before the file is stored
    if (!handScanned && !blank) fail(`${item.itemKey} is not signed by hand and scanned on this application, so it takes no signed scan. Nothing was stored.`, HttpStatus.CONFLICT);
    const f = (files ?? []).filter((x) => x.buffer);
    if (f.length !== 1 || f[0].fieldname !== "file") fail(`Send one file, in the field "file". Nothing was stored.`);
    const bytes = f[0].buffer!;
    if (!bytes.length) fail("The file is empty. Nothing was stored.");
    if (bytes.length > MAX_DOCUMENT_BYTES) fail(`The file is larger than ${MAX_DOCUMENT_MB} MB. Nothing was stored.`, HttpStatus.PAYLOAD_TOO_LARGE);
    const media = mediaOf(bytes);
    if (!media) fail("Send the signed scan as a PDF, JPEG or PNG (judged by the file itself, not its name). Nothing was stored.", HttpStatus.UNPROCESSABLE_ENTITY);
    const done = (await signStepsOf(this.db, c.id)).get(item.id) ?? {};
    const refusal = blank ? null : stepRefusal("scan_received", done, item.itemKey, { viaUpload: true });
    if (refusal) fail(`${refusal} Nothing was stored.`, HttpStatus.CONFLICT);
    const id = randomUUID(), sha256 = createHash("sha256").update(bytes).digest("hex");
    const rel = join("cases", c.id, "signed-scans", `${id}.${MEDIA[media!]}`), abs = join(SCANS(), rel);
    try {
      mkdirSync(dirname(abs), { recursive: true }); writeFileSync(abs, bytes);
      await this.db.$transaction(async (tx) => {
        await lockCase(tx as unknown as Db, c.id); // review M2: before the insert (whose share lock on the case row deadlocked a second upload)
        await tx.signedScan.create({ data: { id, workspaceId: c.workspaceId, caseId: c.id, itemId: item.id, fileName: cleanName(utf8Name(f[0].originalname)), mediaType: media!, sizeBytes: bytes.length, sha256, path: rel, uploadedBy: actor.id } });
        if (!blank) await this.save(c, item, "scan_received", actor, null, tx as unknown as Db, namedCopy(body)); // B130: the printed copy it scans
      });
    } catch (e) { rmSync(abs, { force: true }); throw e; } // a refused upload leaves no file behind
    await this.audit.log(c.workspaceId, actor.id, "uploaded", "signed scan", id, `${actor.name} uploaded the ${blank ? "completed copy" : "signed scan"} of ${item.itemKey} on case ${short(c.id)} (${MEDIA[media!].toUpperCase()}, ${bytes.length} bytes)`);
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
  scan(@Headers("x-actor") a: H, @Param("id") id: string, @UploadedFiles() files: Upload[], @Body() b: unknown) { return this.s.scan(actorOf(a), id, files, b); }
}
