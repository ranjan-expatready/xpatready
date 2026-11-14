// Product Studio API (NestJS 11, as the team's backend) and the built web app on one local port.
//   node --tsconfig-raw is not used: run with tsx (see studio/start.sh), http://localhost:4400
import { FactSources, FactSourcesController } from "./fact-sources.ts";
import { LinesBulk, LinesBulkController } from "./lines-bulk.ts";
import { PersonChecklists, PersonChecklistsController } from "./person-checklist.ts";
import { WhoFills, WhoFillsController } from "./who-fills.ts";
import { DocumentSupplies, DocumentSuppliesController } from "./document-supplies.ts"; // C4.5
import { DocumentSets, DocumentSetsController } from "./document-sets.ts"; // C6.15
import { MustVerify, MustVerifyController } from "./must-verify.ts"; // C7.9
import { OfficialPagesController, OfficialPagesService } from "./official-pages.ts";
import "reflect-metadata";
import { oneAtATime } from "./form-uses.ts";
import { Body, Catch, Controller, Delete, Get, Headers, HttpException, Inject, Module, Param, Patch, Post, Query, Res, UploadedFiles, UseInterceptors, type ArgumentsHost, type ExceptionFilter } from "@nestjs/common";
import { APP_GUARD, NestFactory } from "@nestjs/core";
import { AnyFilesInterceptor } from "@nestjs/platform-express";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { actorOf, Audit, CaseRead, ConfigRead, ConfigReadGuard, Db, OpenRead, readerOf, STUDIO, Workspace } from "./core.ts";
import { Ai } from "./ai.ts";
import { Demo } from "./demo.ts";
import { Fill } from "./fill.ts";
import { Forms, FormsController } from "./forms.ts";
import { Intake, MAX_BYTES, MAX_FILES } from "./intake.ts";
import { Programs } from "./programs.ts";
import { ReviewQueueController, ReviewQueueService } from "./review-queue.ts";
import { FormProgressController, FormProgressService } from "./form-progress.ts";
import { Screen02, Screen02Controller } from "./screen02.ts";
import { ReviewProposals, ReviewProposalsController } from "./review-proposals.ts";
import { Impact } from "./impact.ts";
import { Checklists, ChecklistsController } from "./checklist.ts";
import { FormMasters, FormMastersController } from "./form-masters.ts";
import { RuleFacts, RuleFactsController } from "./rule-facts.ts";
import { Runtime, RuntimeController } from "./runtime.ts";
import { Team, TeamController } from "./team.ts";
import { firmOfActor } from "./firms.ts";
import { CaseForms, CaseFormsController, MAX_VALIDATED_MB } from "./fill-case.ts";
import { Sources } from "./sources.ts";
import { Lifecycle } from "./lifecycle.ts";
import { Structure, StructureController } from "./structure.ts";
import { Studio } from "./studio.ts";
import { WorkspaceController, WorkspaceViews } from "./workspace.ts";
import { PeopleFromGuide } from "./people-ai.ts";
import { PqrDrafts, PqrDraftsController } from "./pqr-drafts.ts";
import { DraftQd, DraftQdController } from "./draft-qd.ts";
import { Finder } from "./finder.ts";
import { normaliseCode } from "../../contracts/form-library.ts";
import { FormLibrary, FormLibraryController } from "./form-library.ts";
import { Runs, RunsController } from "./runs.ts";
import { UploadRuns } from "./upload-run.ts";
import { MAX_DOCUMENT_MB } from "../../contracts/documents.ts";
import { StartSetup, StartSetupController } from "./start-setup.ts";
import { LibrarySources, LibrarySourcesController, noFreeAdd } from "./library-sources.ts";
import { registerFeatures } from "./features.ts";
import { FieldScopeController, FieldScopes } from "./field-scope.ts"; // C3.16: the library's "Asked about" choice
import { DocumentProviders, DocumentProvidersController } from "./document-providers.ts"; // C6.14: who provides a shared document

type H = string | undefined;

@Controller("api")
class StudioController {
  constructor(@Inject(Studio) private readonly s: Studio) {}
  @OpenRead("who-am-I before a person is chosen; the copies' health check") @Get("session") session(@Headers("x-actor") a: H) { return this.s.session(actorOf(a)); }
  /** C11.10 (P-115): Cards / List per person, on the server. Any known person keeps their own choice. */
  @Patch("session/preferences") preferences(@Headers("x-actor") a: H, @Body() b: unknown) { return this.s.setPreferences(actorOf(a), b); }
  @Get("combinations/:id") overview(@Param("id") id: string) { return this.s.combination(id); }
  @Patch("combinations/:id") updateComp(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: any) { return this.s.updateCombination(actorOf(a), id, b); }
  @Get("combinations/:id/config") config(@Param("id") id: string, @Query("mode") mode: any) { return this.s.config(id, mode === "published" ? "published" : "draft"); }
  @Get("combinations/:id/preview") preview(@Param("id") id: string, @Query() q: any) { return this.s.preview(id, q); }
  // C3.6 (P-158): a new document type named here waits as a library proposal (202 Accepted, with its id), no line yet.
  @Post("combinations/:id/requirements") addReq(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: any, @Res({ passthrough: true }) res: { status: (code: number) => unknown }) { return this.s.saveRequirement(actorOf(a), id, null, b).then((r) => { if (r && "proposalId" in r) res.status(202); return r; }); }
  @Patch("combinations/:id/requirements/:lineage") updReq(@Headers("x-actor") a: H, @Param("id") id: string, @Param("lineage") l: string, @Body() b: any) { return this.s.saveRequirement(actorOf(a), id, l, b); }
  @Post("combinations/:id/checks") addCheck(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.s.saveCheck(actorOf(a), id, b); }
  @Post("combinations/:id/rules") addRule(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: any) { return this.s.saveRule(actorOf(a), id, null, b); }
  @Patch("combinations/:id/rules/:key") updRule(@Headers("x-actor") a: H, @Param("id") id: string, @Param("key") k: string, @Body() b: any) { return this.s.saveRule(actorOf(a), id, k, b); }
  @Patch("combinations/:id/forms/:form") updForm(@Headers("x-actor") a: H, @Param("id") id: string, @Param("form") f: string, @Body() b: any) { return oneAtATime(id, () => this.s.saveForm(actorOf(a), id, normaliseCode(f), b)); } // S4 round 2 N6: one change at a time
  @Post("combinations/:id/sections/:key") selOn(@Headers("x-actor") a: H, @Param("id") id: string, @Param("key") k: string, @Body() b: any) { return this.s.selectSection(actorOf(a), id, k, true, b); }
  // C4.1 (P-216): the combination's own section order; Move up / Move down, one move at a time per combination.
  @Get("combinations/:id/section-order") secOrder(@Headers("x-actor") a: H, @Param("id") id: string) { readerOf(a); return this.s.sectionOrder(id); }
  @Post("combinations/:id/sections/:key/move") secMove(@Headers("x-actor") a: H, @Param("id") id: string, @Param("key") k: string, @Body() b: unknown) { return oneAtATime(id, () => this.s.moveSection(actorOf(a), id, k, b)); }
  @Delete("combinations/:id/sections/:key") selOff(@Headers("x-actor") a: H, @Param("id") id: string, @Param("key") k: string) { return this.s.selectSection(actorOf(a), id, k, false); }
  @Get("combinations/:id/review") review(@Param("id") id: string) { return this.s.review(id); }
  @Post("combinations/:id/submit") submit(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: any) { return this.s.submit(actorOf(a), id, b?.note); }
  @Post("combinations/:id/signoff") signoff(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: any) { return this.s.signoff(actorOf(a), id, b); }
  @Post("combinations/:id/approve") approve(@Headers("x-actor") a: H, @Param("id") id: string) { return this.s.approve(actorOf(a), id); }
  @Get("library/fields") fields(@Query() q: any) { return this.s.fields(q); }
  @Get("library/fields/:key") field(@Param("key") k: string) { return this.s.field(k); }
  @Get("library/fields/:key/format") fieldFormat(@Param("key") k: string) { return this.s.fieldFormatOf(k); } // P-162 (C3.1)
  @Post("library/fields/:key/format-check") formatCheck(@Headers("x-actor") a: H, @Param("key") k: string, @Body() b: unknown) { actorOf(a); return this.s.checkFieldFormat(k, b); } // P-162 (C3.1)
  @Post("library/fields") addField(@Headers("x-actor") a: H) { actorOf(a); return noFreeAdd("field"); } // P-158: no free add (410)
  @Patch("library/fields/:key") updField(@Headers("x-actor") a: H, @Param("key") k: string, @Body() b: any) { return this.s.updateField(actorOf(a), k, b); }
  @Post("library/fields/:key/placement") place(@Headers("x-actor") a: H, @Param("key") k: string, @Body() b: any) { return this.s.placeField(actorOf(a), k, b); }
  @Get("library/sections") sections() { return this.s.sections(); }
  @Post("library/sections") addSection(@Headers("x-actor") a: H) { actorOf(a); return noFreeAdd("section"); } // P-158: no free add (410)
  @Get("library/document-types") types() { return this.s.documentTypes(); }
  // UX-A part 4 (break R2-M2): the calculated values a condition may read, with their words, so the condition editor
  // offers them by name (age, days until expiry) instead of asking for a key.
  @ConfigRead() @Get("library/derived") derived() { return this.s.derivedValues(); }
  @ConfigRead() @Post("conditions/check") check(@Body() b: any) { return this.s.checkCondition(b); }
  @CaseRead() @Get("releases") releases(@Query("combination") c?: string) { return this.s.releases(c); }
  // Runtime R1a FIX (review Must 1): the activity feed holds case events, so only configuration people and the case
  // officer read it; a client or an unknown caller is refused (STANDARDS §6 deny by default).
  @CaseRead() @Get("activity") activity(@Headers("x-actor") a: H) { const actor = actorOf(a); if (!(actor.duties as readonly string[]).some((d) => d === "review" || d === "case")) throw new HttpException("Activity is for staff.", 403); return this.s.activity(200, (actor.duties as readonly string[]).includes("review") ? null : firmOfActor(actor)?.key ?? "none"); }
}

@Controller("api")
class SourcesController {
  constructor(@Inject(Sources) private readonly s: Sources, @Inject(Fill) private readonly f: Fill, @Inject(Ai) private readonly ai: Ai, @Inject(Intake) private readonly intake: Intake) {}
  // A combination's files are uploaded through the one intake, POST /intake with combinationId (P-51, P-103); the second
  // door POST /combinations/:id/attachments was removed (DV-bb-8).
  // Not /intake (lead, 31 Oct): it adds a file from the official library, never a person's upload; it still goes through Intake.sample.
  @Post("combinations/:id/attachments/sample") sample(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: any) { return this.intake.sample(actorOf(a), id, b?.officialFile); } // N7 break B5: no body is a 400 in words, never a 500
  @Get("combinations/:id/attachments") list(@Param("id") id: string) { return this.s.attachmentsOf(id); }
  // dotfiles "allow" (QA-4): stored paths are the server's own, and a lane copy under .claude/worktrees/ made every download a 404.
  @OpenRead("a file link the browser opens") @Get("attachments/:id/file") async file(@Param("id") id: string, @Res() res: any) { const d = await this.s.download(id); res.download(d.path, d.name, { dotfiles: "allow" }); }
  @Post("attachments/:id/read") read(@Headers("x-actor") a: H, @Param("id") id: string) { return this.s.read(actorOf(a), id); }
  @Get("attachments/:id/draft-options") opts(@Param("id") id: string) { return this.s.draftOptions(id); }
  @Post("attachments/:id/draft") draft(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: any) { return this.ai.launchSource(actorOf(a), id, b.mode, b.runFile, b.idempotencyKey, b.overrideId); }
  @Post("jobs/:id/recompare") recompare(@Headers("x-actor") a: H, @Param("id") id: string) { return this.s.recompare(actorOf(a), id); }
  @Post("attachments/:id/reuse") reuse(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: any) { return this.s.reuseForm(actorOf(a), id, b ?? {}); }
  @Get("jobs/:id") job(@Param("id") id: string) { return this.s.job(id); }
  @Post("jobs/:id/items/:item") decide(@Headers("x-actor") a: H, @Param("id") id: string, @Param("item") item: string, @Body() b: any) { return this.s.decide(actorOf(a), id, item, b); }
  @Post("jobs/:id/accept-clean") clean(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: any) { return this.s.acceptClean(actorOf(a), id, b?.outcome === "NEW" ? "NEW" : "REUSE"); }
  @Post("jobs/:id/apply") apply(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: any) { return this.s.apply(actorOf(a), id, b ?? {}); }
  @Get("ledger") ledger() { return this.s.ledger(); }
  @Get("official-library") official() { return this.s.officialLibrary(); }
  // QA-270: Preview's filled PDF takes Preview's own check (readerOf, the config read guard's): case people are refused here as on Preview.
  @Post("combinations/:id/fill") fill(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: any) { return this.f.fill(readerOf(a), id, b); }
  // QA-270 (file half): the filled PDF is read like Preview that made it, by the config read guard (no mark): nobody and an
  // unknown name 401, case people (clients, any firm's staff) 403. Preview downloads it with the person header (preview.tsx).
  @Get("artifacts/:id/file") async artifact(@Param("id") id: string, @Res() res: any) { const d = await this.f.artifact(id); res.download(d.path, d.name, { dotfiles: "allow" }); }
}

@Controller("api/demo")
class DemoController {
  constructor(@Inject(Demo) private readonly d: Demo) {}
  @Get("status") status() { return this.d.status(); }
  @Post("load") load(@Headers("x-actor") a: H, @Body() b: { sample?: string } | null) { return this.d.load(actorOf(a), b); }
  @Post("reset") reset(@Headers("x-actor") a: H, @Body() b: any) { return this.d.reset(actorOf(a), b?.confirm); }
  @Post("release-with-sources") releaseWithSources(@Headers("x-actor") a: H) { return this.d.releaseWithSources(actorOf(a)); }
}

@Controller("api")
class AiController {
  constructor(@Inject(Ai) private readonly ai: Ai, @Inject(Studio) private readonly studio: Studio, @Inject(Finder) private readonly finder: Finder) {}
  @Get("masters") masters() { return this.studio.masters(); }
  /** P-179: a person's Continue past a cost limit, for the start they looked at (contracts/cost-check.ts). */
  @Post("ai/overrides") override(@Headers("x-actor") a: H, @Body() b: any) { return this.ai.override(actorOf(a), b, (s) => this.finder.plan(s.combinationId, { mode: s.mode, pageUrl: s.pageUrl, only: s.only })); }
  @ConfigRead() @Post("ai/plan") plan(@Body() b: any) { return this.ai.plan(b.scope, b.mode, { draftAgain: !!b.draftAgain }); }
  @Post("ai/batches") launch(@Headers("x-actor") a: H, @Body() b: any) { return this.ai.launch(actorOf(a), b); }
  @Get("ai/batches") batches() { return this.ai.batches(); }
  @Get("ai/batches/:id") batch(@Param("id") id: string) { return this.ai.batch(id); }
  @Post("ai/batches/:id/cancel") cancel(@Headers("x-actor") a: H, @Param("id") id: string) { return this.ai.cancel(actorOf(a), id); }
  @Post("ai/batches/:id/retry") retry(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: any) { return this.ai.retry(actorOf(a), id, b ?? {}); }
}

/** Screen 01 (Programs): contract in contracts/programs.ts. */
@Controller("api")
class ProgramsController {
  constructor(@Inject(Programs) private readonly p: Programs, @Inject(Sources) private readonly sources: Sources, @Inject(Intake) private readonly intake: Intake) {}
  @Get("catalogue") catalogue(@Headers("x-actor") a: H, @Query() q: any) { return this.p.catalogue(q, readerOf(a)); }
  @Get("draft") draft(@Headers("x-actor") a: H, @Query("summary") summary?: string) { return this.p.draft(actorOf(a), summary === "1"); }
  @Post("pack/release") release(@Headers("x-actor") a: H, @Body() b: any) { return this.p.release(actorOf(a), b); }
  @Post("program-nodes") node(@Headers("x-actor") a: H, @Body() b: any) { return this.p.createNode(actorOf(a), b); }
  @Post("combinations") create(@Headers("x-actor") a: H, @Body() b: any, @Res({ passthrough: true }) res: any) { return this.p.createCombination(actorOf(a), b).then((r) => { res.status(r.created ? 201 : 200); return r; }); }
  @Get("path-options") pathOptions(@Headers("x-actor") a: H, @Query("pathway") pw: string) { readerOf(a); return this.p.pathOptions(pw); }
  @Get("combinations/:id/summary") summary(@Headers("x-actor") a: H, @Param("id") id: string) { return this.p.summary(id, readerOf(a)); }
  @Post("combinations/:id/lines") line(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: any) { return this.p.addLine(actorOf(a), id, b); }
  @Get("library/forms") forms() { return this.sources.libraryForms(); }
  /** The one form intake (P-51): one or many files; with combinationId they are attached to it (door 1), without it
   *  they go to the library only (door 2, Screen 04). One result per file. */
  @Post("intake") @UseInterceptors(AnyFilesInterceptor({ limits: { fileSize: MAX_BYTES, files: MAX_FILES } }))
  upload(@Headers("x-actor") a: H, @UploadedFiles() files: any[], @Body() b: any) { return this.intake.intake(actorOf(a), files, b?.combinationId || undefined, "MANUAL", b?.forCombination && b?.forCode ? { combinationId: String(b.forCombination), code: normaliseCode(String(b.forCode)) } : undefined); }
  @Get("intake/held") held(@Query("combination") c?: string) { return this.intake.held(c || undefined); }
}

/** Every error reaches the person as RFC 9457 Problem Details (type, title, status, detail, field errors) with
 *  `message` kept for the older screens. A database rule that refuses a write (a duplicate, a level trigger) is a 409
 *  with a plain reason, never a server error. */
@Catch()
class ProblemErrors implements ExceptionFilter {
  catch(e: any, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    const send = (status: number, title: string, detail: string, extra: Record<string, unknown> = {}) =>
      res.status(status).type("application/problem+json").json({ type: extra.type ?? `https://expatready.local/problems/${status}`, title, status, detail, message: detail, ...extra });
    if (e instanceof HttpException) {
      const body = e.getResponse() as any, status = e.getStatus();
      // Upload limits fire before the intake sees the files (break m9): say which limit, in plain words.
      if (status === 413 || /^(File too large|Too many files)$/.test(String(body?.message ?? ""))) {
        const many = /files/i.test(String(body?.message));
        // QA-126: a validated copy (C-9) takes one PDF of up to 20 MB, so it is worded with its own limits, not the intake's.
        // C6.4 (break m5): a checklist line takes one PDF, JPEG or PNG of up to 20 MB, worded with its own limits.
        if (/\/checklist-lines\/[^/]+\/documents\/?$/.test(String(host.switchToHttp().getRequest()?.path ?? "")))
          return send(413, "Too large", many ? "Send one file at a time. Nothing was stored." : `The file is larger than ${MAX_DOCUMENT_MB} MB. Nothing was stored.`);
        // B149 (review M2, break m1): IRCC's Transaction Approved page, one PDF, JPEG or PNG of up to 20 MB (any letter case, as Express routes).
        if (/\/filings\/[^/]+\/record\/fee-receipt\/?$/i.test(String(host.switchToHttp().getRequest()?.path ?? "")))
          return send(413, "Too large", many ? "Send one file: the Transaction Approved page. Nothing was stored." : `The file is larger than ${MAX_DOCUMENT_MB} MB: save the Transaction Approved page as a smaller PDF, JPEG or PNG. Nothing was stored.`);
        if (/\/form-copies\/[^/]+\/validated\/?$/.test(String(host.switchToHttp().getRequest()?.path ?? "")))
          return send(413, "Too large", many ? "Send only the one validated PDF you saved from Adobe. Nothing was recorded." : `The file is larger than ${MAX_VALIDATED_MB} MB: send the validated PDF of this form. Nothing was recorded.`);
        const files = MAX_FILES, mb = MAX_BYTES / 1024 / 1024;
        return send(413, "Too large", many ? `Add at most ${files} files at a time. Nothing was added.` : `A file is larger than ${mb} MB. Nothing was added; add files up to ${mb} MB each.`);
      }
      if (typeof body === "object" && body.detail) return send(status, body.title ?? "Request refused", body.detail, body);
      const detail = typeof body === "object" ? (Array.isArray(body.message) ? body.message.join("; ") : body.message ?? e.message) : String(body);
      return send(status, status === 403 ? "Not allowed" : status === 404 ? "Not found" : status === 409 ? "Conflict" : "Request refused", detail, typeof body === "object" && body.existingId ? { existingId: body.existingId } : {});
    }
    // P-179 break m6: a JSON body over the 5 MB limit is refused by the body parser before any route: say so (it was a 500).
    if (e?.type === "entity.too.large" || e?.status === 413) return send(413, "Too large", "This request is larger than the 5 MB the server takes. Nothing was saved or started.");
    // C4.2 (QA-125, QA-13): plain words, never "the database": a duplicate is someone else's save at the same moment, or the thing exists already.
    if (e?.code === "P2002") return send(409, "Already exists", "This already exists, or someone else saved the same thing at the same moment. Reload to see the current state.");
    // A malformed id (not a UUID, or with a NUL byte) is simply not found (review #4, break m5); so is a stored file that
    // is gone or whose folder is not a folder (a download: QA-4, break m5).
    if (e?.code === "P2025" || (/^(ENOENT|ENOTDIR)$/.test(String(e?.code)) && e?.status === 404) || e?.code === "P2023" || e?.name === "NotFoundError" || /Error creating UUID|invalid input syntax for type uuid|invalid byte sequence for encoding/i.test(String(e?.message))) return send(404, "Not found", "Not found (it may have been removed by a reset).");
    // C6.17 (BR-5, BR-10): a write on a stage that has ended (its rows are kept as they were), or a case whose current
    // stage moved under it, is refused by the database: a 409 with plain words, nothing changed.
    if (/case_stage_ended|case_stage_current|case_stage_one_current|case_stage_forward/.test(String(e?.message ?? ""))) return send(409, "Changed since you read it", "This case moved to its next stage: the earlier stage's filings, documents and findings are kept as they were and can no longer be changed. Read the case again. Nothing was changed.", { code: "stage_ended" });
    const db = String(e?.message ?? "").match(/combination_level: ([^\n"]+)/);
    if (db) return send(409, "Not allowed at this level", `${db[1].trim()} (refused by the database).`);
    // The detail goes to the server log only: never a database call, a stack or a server path in the browser (review #4).
    console.error(e);
    return send(500, "Server error", "Something went wrong on the server. Refresh to see the current state, then try again.");
  }
}

@Module({ controllers: [FieldScopeController, DocumentProvidersController, TeamController, StudioController, SourcesController, DemoController, AiController, ProgramsController, FormsController, RuntimeController, CaseFormsController, ReviewQueueController, FormProgressController, Screen02Controller, ReviewProposalsController, ChecklistsController, FormMastersController, StructureController, FormLibraryController, RunsController, WorkspaceController, FactSourcesController, StartSetupController, PersonChecklistsController, WhoFillsController, DocumentSuppliesController, DocumentSetsController, MustVerifyController, LibrarySourcesController, OfficialPagesController, LinesBulkController, PqrDraftsController, DraftQdController, RuleFactsController], providers: [FieldScopes, DocumentProviders, LinesBulk, PqrDrafts, DraftQd, FormProgressService, OfficialPagesService, FactSources, PersonChecklists, FormMasters, WhoFills, DocumentSupplies, DocumentSets, MustVerify, LibrarySources, { provide: APP_GUARD, useClass: ConfigReadGuard }, WorkspaceViews, PeopleFromGuide, Db, Workspace, Audit, StartSetup, Studio, Sources, Intake, Fill, Demo, Ai, Programs, Forms, Runtime, Team, CaseForms, ReviewQueueService, Screen02, ReviewProposals, Impact, Checklists, Lifecycle, Structure, Finder, FormLibrary, UploadRuns, Runs, RuleFacts] })
class AppModule {}

async function main() {
  const port = Number(process.env.STUDIO_PORT ?? 4400);
  // P-214: a new feature registers itself in api/src/features/<feature>.ts, not in the @Module list above.
  await registerFeatures(AppModule);
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: ["error", "warn"] });
  (await import("./platform/observability/hook.ts")).observe(app); // PF-23: one JSON logger with redaction, request lines and metrics (NFR5-14, BR-16)
  app.useBodyParser("json", { limit: "5mb" });
  app.useGlobalFilters(new ProblemErrors());
  const web = join(STUDIO, "web", "dist");
  if (existsSync(web)) {
    // dotfiles "allow": lane copies live under .claude/worktrees/, and a hidden folder in the path made every page a 404.
    app.useStaticAssets(web, { index: false, dotfiles: "allow" });
    const index = join(web, "index.html");
    // C6.16 (challenge m1): the adult's link page sends no referrer (its token lives in the fragment, never sent anyway).
    app.getHttpAdapter().getInstance().get(/^\/(?!api\/).*/, (req: any, res: any) => { if (req.path === "/link") res.setHeader("Referrer-Policy", "no-referrer"); res.sendFile(index, { dotfiles: "allow" }); });
  }
  await app.listen(port, "127.0.0.1");
  console.log(`Product Studio on http://localhost:${port}`);
}
void main();
