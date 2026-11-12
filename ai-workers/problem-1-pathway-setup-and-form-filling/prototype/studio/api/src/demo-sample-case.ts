// BK-12 (P-448, P-449, P-452; Bake plan row 26): Demo › open a combination's Sample case, POST /api/demo/sample-case
// { combinationId }. Which Sample case a combination opens is data (samples/sample-cases.json, by its key): this route
// names no combination, so a new pathway's Sample case needs a data entry only. The author duty only, as every demo
// control (anyone else 403); only in the demo workspace (409). The case opens on the combination's newest release
// through the case officer's own steps (api/src/sample-case.ts openSampleCase); opening it again gives the same case.
// Made-up people (Sample), nothing filed, no AI (US$0).
import { Body, Controller, Headers, HttpStatus, Inject, Injectable, Post } from "@nestjs/common";
import { actorOf, Db, fail, isDemoWorkspace, need, Workspace, type Actor } from "./core.ts";
import { DEMO_ONLY } from "./demo.ts";
import { CaseForms } from "./fill-case.ts";
import { Runtime } from "./runtime.ts";
import { NO_SAMPLE_CASE, openSampleCase, SAMPLE_CASES } from "./sample-case.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class DemoSampleCase {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Workspace) private readonly ws: Workspace, @Inject(Runtime) private readonly runtime: Runtime, @Inject(CaseForms) private readonly forms: CaseForms) {}
  async open(actor: Actor, body?: { combinationId?: unknown } | null) {
    need(actor, "author");
    if (!isDemoWorkspace()) fail(DEMO_ONLY, HttpStatus.CONFLICT);
    const id = body?.combinationId;
    if (typeof id !== "string" || !UUID.test(id)) fail("Say which combination: combinationId, the combination's id.");
    const comb = await this.db.combination.findFirst({ where: { id: id as string, workspaceId: await this.ws.id() }, select: { combinationKey: true, label: true } });
    if (!comb) fail("No such combination in this workspace.", HttpStatus.NOT_FOUND);
    if (!SAMPLE_CASES.cases[comb!.combinationKey]) fail(NO_SAMPLE_CASE(comb!.label), HttpStatus.CONFLICT);
    const out = await openSampleCase(this.db, this.runtime, this.forms, id as string);
    // A case the release refused to open (no release yet, say) is said in its own words, never as opened.
    if (!out.caseId) fail(`The Sample case was not opened: ${out.refused.join(" · ")}`, HttpStatus.CONFLICT);
    return { ...out, label: comb!.label };
  }
}

@Controller("api/demo")
export class DemoSampleCaseController {
  constructor(@Inject(DemoSampleCase) private readonly d: DemoSampleCase) {}
  @Post("sample-case") open(@Headers("x-actor") a: string | undefined, @Body() b: { combinationId?: unknown } | null) { return this.d.open(actorOf(a), b); }
}
