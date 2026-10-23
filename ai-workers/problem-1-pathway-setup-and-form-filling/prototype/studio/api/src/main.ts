// Product Studio API (NestJS 11, as the team's backend) and the built web app on one local port.
//   node --tsconfig-raw is not used: run with tsx (see studio/start.sh), http://localhost:4400
import "reflect-metadata";
import { Body, Catch, Controller, Delete, Get, Headers, HttpException, Inject, Module, Param, Patch, Post, Query, Res, UploadedFiles, UseInterceptors, type ArgumentsHost, type ExceptionFilter } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AnyFilesInterceptor } from "@nestjs/platform-express";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { actorOf, Audit, Db, STUDIO, Workspace } from "./core.ts";
import { Ai } from "./ai.ts";
import { Demo } from "./demo.ts";
import { Fill } from "./fill.ts";
import { Forms, FormsController } from "./forms.ts";
import { Intake, MAX_BYTES, MAX_FILES } from "./intake.ts";
import { Programs } from "./programs.ts";
import { Sources } from "./sources.ts";
import { Studio } from "./studio.ts";

type H = string | undefined;

@Controller("api")
class StudioController {
  constructor(@Inject(Studio) private readonly s: Studio) {}
  @Get("session") session(@Headers("x-actor") a: H) { return this.s.session(actorOf(a)); }
  @Get("combinations/:id") overview(@Param("id") id: string) { return this.s.combination(id); }
  @Patch("combinations/:id") updateComp(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: any) { return this.s.updateCombination(actorOf(a), id, b); }
  @Get("combinations/:id/config") config(@Param("id") id: string, @Query("mode") mode: any) { return this.s.config(id, mode === "published" ? "published" : "draft"); }
  @Get("combinations/:id/preview") preview(@Param("id") id: string, @Query() q: any) { return this.s.preview(id, q); }
  @Post("combinations/:id/requirements") addReq(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: any) { return this.s.saveRequirement(actorOf(a), id, null, b); }
  @Patch("combinations/:id/requirements/:lineage") updReq(@Headers("x-actor") a: H, @Param("id") id: string, @Param("lineage") l: string, @Body() b: any) { return this.s.saveRequirement(actorOf(a), id, l, b); }
  @Post("combinations/:id/rules") addRule(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: any) { return this.s.saveRule(actorOf(a), id, null, b); }
  @Patch("combinations/:id/rules/:key") updRule(@Headers("x-actor") a: H, @Param("id") id: string, @Param("key") k: string, @Body() b: any) { return this.s.saveRule(actorOf(a), id, k, b); }
  @Patch("combinations/:id/forms/:form") updForm(@Headers("x-actor") a: H, @Param("id") id: string, @Param("form") f: string, @Body() b: any) { return this.s.saveForm(actorOf(a), id, f, b); }
  @Post("combinations/:id/sections/:key") selOn(@Headers("x-actor") a: H, @Param("id") id: string, @Param("key") k: string) { return this.s.selectSection(actorOf(a), id, k, true); }
  @Delete("combinations/:id/sections/:key") selOff(@Headers("x-actor") a: H, @Param("id") id: string, @Param("key") k: string) { return this.s.selectSection(actorOf(a), id, k, false); }
  @Get("combinations/:id/review") review(@Param("id") id: string) { return this.s.review(id); }
  @Post("combinations/:id/submit") submit(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: any) { return this.s.submit(actorOf(a), id, b?.note); }
  @Post("combinations/:id/signoff") signoff(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: any) { return this.s.signoff(actorOf(a), id, b); }
  @Post("combinations/:id/approve") approve(@Headers("x-actor") a: H, @Param("id") id: string) { return this.s.approve(actorOf(a), id); }
  @Get("library/fields") fields(@Query() q: any) { return this.s.fields(q); }
  @Get("library/fields/:key") field(@Param("key") k: string) { return this.s.field(k); }
  @Post("library/fields") addField(@Headers("x-actor") a: H, @Body() b: any) { return this.s.createField(actorOf(a), b); }
  @Patch("library/fields/:key") updField(@Headers("x-actor") a: H, @Param("key") k: string, @Body() b: any) { return this.s.updateField(actorOf(a), k, b); }
  @Post("library/fields/:key/placement") place(@Headers("x-actor") a: H, @Param("key") k: string, @Body() b: any) { return this.s.placeField(actorOf(a), k, b); }
  @Get("library/sections") sections() { return this.s.sections(); }
  @Post("library/sections") addSection(@Headers("x-actor") a: H, @Body() b: any) { return this.s.createSection(actorOf(a), b); }
  @Get("library/document-types") types() { return this.s.documentTypes(); }
  @Post("conditions/check") check(@Body() b: any) { return this.s.checkCondition(b); }
  @Get("releases") releases(@Query("combination") c?: string) { return this.s.releases(c); }
  @Get("activity") activity() { return this.s.activity(); }
}

@Controller("api")
class SourcesController {
  constructor(@Inject(Sources) private readonly s: Sources, @Inject(Fill) private readonly f: Fill, @Inject(Ai) private readonly ai: Ai, @Inject(Intake) private readonly intake: Intake) {}
  // A combination's sources go through the one intake (P-51), one or many files.
  @Post("combinations/:id/attachments") @UseInterceptors(AnyFilesInterceptor({ limits: { fileSize: MAX_BYTES, files: MAX_FILES } }))
  upload(@Headers("x-actor") a: H, @Param("id") id: string, @UploadedFiles() files: any[]) { return this.intake.intake(actorOf(a), files, id); }
  @Post("combinations/:id/attachments/sample") sample(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: any) { return this.intake.sample(actorOf(a), id, b.officialFile); }
  @Get("combinations/:id/attachments") list(@Param("id") id: string) { return this.s.attachmentsOf(id); }
  @Get("attachments/:id/file") async file(@Param("id") id: string, @Res() res: any) { const d = await this.s.download(id); res.download(d.path, d.name); }
  @Post("attachments/:id/read") read(@Headers("x-actor") a: H, @Param("id") id: string) { return this.s.read(actorOf(a), id); }
  @Get("attachments/:id/draft-options") opts(@Param("id") id: string) { return this.s.draftOptions(id); }
  @Post("attachments/:id/draft") draft(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: any) { return this.ai.launchSource(actorOf(a), id, b.mode, b.runFile, b.idempotencyKey); }
  @Post("jobs/:id/recompare") recompare(@Headers("x-actor") a: H, @Param("id") id: string) { return this.s.recompare(actorOf(a), id); }
  @Post("attachments/:id/reuse") reuse(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: any) { return this.s.reuseForm(actorOf(a), id, b ?? {}); }
  @Get("jobs/:id") job(@Param("id") id: string) { return this.s.job(id); }
  @Post("jobs/:id/items/:item") decide(@Headers("x-actor") a: H, @Param("id") id: string, @Param("item") item: string, @Body() b: any) { return this.s.decide(actorOf(a), id, item, b); }
  @Post("jobs/:id/accept-clean") clean(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: any) { return this.s.acceptClean(actorOf(a), id, b?.outcome === "NEW" ? "NEW" : "REUSE"); }
  @Post("jobs/:id/apply") apply(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: any) { return this.s.apply(actorOf(a), id, b ?? {}); }
  @Get("ledger") ledger() { return this.s.ledger(); }
  @Get("official-library") official() { return this.s.officialLibrary(); }
  @Post("combinations/:id/fill") fill(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: any) { return this.f.fill(actorOf(a), id, b); }
  @Get("artifacts/:id/file") async artifact(@Param("id") id: string, @Res() res: any) { const d = await this.f.artifact(id); res.download(d.path, d.name); }
}

@Controller("api/demo")
class DemoController {
  constructor(@Inject(Demo) private readonly d: Demo) {}
  @Get("status") status() { return this.d.status(); }
  @Post("load") load(@Headers("x-actor") a: H) { return this.d.load(actorOf(a)); }
  @Post("reset") reset(@Headers("x-actor") a: H, @Body() b: any) { return this.d.reset(actorOf(a), b?.confirm); }
}

@Controller("api")
class AiController {
  constructor(@Inject(Ai) private readonly ai: Ai, @Inject(Studio) private readonly studio: Studio) {}
  @Get("masters") masters() { return this.studio.masters(); }
  @Post("ai/plan") plan(@Body() b: any) { return this.ai.plan(b.scope, b.mode, { draftAgain: !!b.draftAgain }); }
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
  @Get("catalogue") catalogue(@Query() q: any) { return this.p.catalogue(q); }
  @Get("draft") draft() { return this.p.draft(); }
  @Post("pack/release") release(@Headers("x-actor") a: H, @Body() b: any) { return this.p.release(actorOf(a), b); }
  @Post("program-nodes") node(@Headers("x-actor") a: H, @Body() b: any) { return this.p.createNode(actorOf(a), b); }
  @Post("combinations") create(@Headers("x-actor") a: H, @Body() b: any, @Res({ passthrough: true }) res: any) { return this.p.createCombination(actorOf(a), b).then((r) => { res.status(r.created ? 201 : 200); return r; }); }
  @Get("path-options") pathOptions(@Query("pathway") pw: string) { return this.p.pathOptions(pw); }
  @Post("combinations/path") path(@Headers("x-actor") a: H, @Body() b: any, @Res({ passthrough: true }) res: any) { return this.p.createPath(actorOf(a), b).then((r) => { res.status(r.created ? 201 : 200); return r; }); }
  @Get("combinations/:id/summary") summary(@Param("id") id: string) { return this.p.summary(id); }
  @Post("combinations/:id/lines") line(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: any) { return this.p.addLine(actorOf(a), id, b); }
  @Get("library/forms") forms() { return this.sources.libraryForms(); }
  /** The one form intake (P-51): one or many files; with combinationId they are attached to it (door 1), without it
   *  they go to the library only (door 2, Screen 04). One result per file. */
  @Post("intake") @UseInterceptors(AnyFilesInterceptor({ limits: { fileSize: MAX_BYTES, files: MAX_FILES } }))
  upload(@Headers("x-actor") a: H, @UploadedFiles() files: any[], @Body() b: any) { return this.intake.intake(actorOf(a), files, b?.combinationId || undefined); }
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
      if (status === 413 || /^(File too large|Too many files)$/.test(String(body?.message ?? ""))) return send(413, "Too large", /files/i.test(String(body?.message)) ? "Add at most 20 files at a time. Nothing was added." : "A file is larger than 25 MB. Nothing was added; add files up to 25 MB each.");
      if (typeof body === "object" && body.detail) return send(status, body.title ?? "Request refused", body.detail, body);
      const detail = typeof body === "object" ? (Array.isArray(body.message) ? body.message.join("; ") : body.message ?? e.message) : String(body);
      return send(status, status === 403 ? "Not allowed" : status === 404 ? "Not found" : status === 409 ? "Conflict" : "Request refused", detail, typeof body === "object" && body.existingId ? { existingId: body.existingId } : {});
    }
    if (e?.code === "P2002") return send(409, "Already exists", "Already in progress or already exists: the database refused a duplicate. Refresh to see the current state.");
    // A malformed id (not a UUID) is simply not found (review #4).
    if (e?.code === "P2025" || e?.code === "P2023" || e?.name === "NotFoundError" || /Error creating UUID|invalid input syntax for type uuid/i.test(String(e?.message))) return send(404, "Not found", "Not found (it may have been removed by a reset).");
    const db = String(e?.message ?? "").match(/combination_level: ([^\n"]+)/);
    if (db) return send(409, "Not allowed at this level", `${db[1].trim()} (refused by the database).`);
    // The detail goes to the server log only: never a database call, a stack or a server path in the browser (review #4).
    console.error(e);
    return send(500, "Server error", "Something went wrong on the server. Refresh to see the current state, then try again.");
  }
}

@Module({ controllers: [StudioController, SourcesController, DemoController, AiController, ProgramsController, FormsController], providers: [Db, Workspace, Audit, Studio, Sources, Intake, Fill, Demo, Ai, Programs, Forms] })
class AppModule {}

async function main() {
  const port = Number(process.env.STUDIO_PORT ?? 4400);
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: ["error", "warn"] });
  app.useBodyParser("json", { limit: "5mb" });
  app.useGlobalFilters(new ProblemErrors());
  const web = join(STUDIO, "web", "dist");
  if (existsSync(web)) {
    // dotfiles "allow": lane copies live under .claude/worktrees/, and a hidden folder in the path made every page a 404.
    app.useStaticAssets(web, { index: false, dotfiles: "allow" });
    const index = join(web, "index.html");
    app.getHttpAdapter().getInstance().get(/^\/(?!api\/).*/, (_req: any, res: any) => res.sendFile(index, { dotfiles: "allow" }));
  }
  await app.listen(port, "127.0.0.1");
  console.log(`Product Studio on http://localhost:${port}`);
}
void main();
