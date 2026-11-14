// "Load sample inputs" and "Reset demo" (D274). The loader stands in for a person typing and choosing files: it calls
// the same services as the screens (create pathway/program/combination, attach files through the normal upload
// handler, read forms). It never runs or fakes AI, approves anything or fills a case. The only shortcut is that the
// work-permit sample starts from the reviewed release c1-v3 (imported as Release 1, labelled with its hash and drafting
// runs) instead of re-buying every paid AI draft. Reset removes the disposable workspace's rows and working files and keeps the engine,
// official originals, fixtures, AI run records, the spend ledger and review evidence, which it fingerprints before
// and after so "unchanged" is checked, not asserted.
import { HttpException, HttpStatus, Inject, Injectable, type OnModuleInit } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import type { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { applySampleFormRoles, importConfiguration, sampleFamilyFacts } from "../../engine/import.ts";
import { buildSnapshot } from "../../engine/snapshot.ts";
import { LEDGER_DIR } from "../../../p2/policy.ts";
import { Ai } from "./ai.ts";
import { ACTORS, Audit, Db, fail, isDemoWorkspace, need, PROTOTYPE, ROOT, SOLUTION, STUDIO, VAR, VAR_ROOT, Workspace, type Actor } from "./core.ts";
import { FEATURES_DIR, featureSteps } from "./features.ts";
import type { CheckpointContext, CheckpointRow, CheckpointStep } from "./features/checkpoint/_context.ts";
import { RELEASE, SAMPLES } from "./features/checkpoint/_constants.ts";
import { Intake } from "./intake.ts";
import { Finder } from "./finder.ts";
import { SAMPLE_CREATOR } from "./lifecycle.ts";
import { linkSampleGuides } from "./guide-sources.ts";
import { Sources } from "./sources.ts";
import { Studio } from "./studio.ts";
import { draftSourceProblems } from "./source-register.ts";
import { Forms } from "./forms.ts";
import { FormLibrary } from "./form-library.ts";
import { releaseFillTrials } from "./fill-trials.ts"; // BK-11: each form's fill trial in the release
export { BY_HAND_REASON, RELEASE, SAMPLES } from "./features/checkpoint/_constants.ts";

const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
export type { CheckpointRow };
/** What the loaders read from the reviewed release's release.json (p3/releases/c1-v3). */
type ReviewedRelease = { configuration_sha256: string; drafting_run_ids: string[]; author: { user_id: string }; submitter: { user_id: string }; approver: { user_id: string } };
/** The six's "With an LMIA – inside Canada" (samples/wave1.json), the combination Demo › Start With an LMIA from its
 *  reviewed release starts (C5.4). */
export const SIX_LMIA = "wp.lmia_inside";
/** The combination's basis note once Demo › Start With an LMIA has loaded the reviewed setup as its draft (runs once). */
export const STARTED_FROM_RELEASE = "Sample: from the outside-Canada release c1-v3 (p3/releases/c1-v3: a work permit applied for from outside Canada), loaded by Demo › Start With an LMIA into this inside-Canada combination. It is not this combination's source-backed setup. A draft until its sources are answered, submitted, signed and approved.";
/** The demo controls (load, Reset, Reset to the six, Start With an LMIA; forms-demo.ts's forms story) refuse (409)
 *  outside the demo workspace (P-240, G2 BR-3): they write sample content or releases, or empty the workspace. */
export const DEMO_ONLY = "This demo control works only in the demo workspace.";

type SampleSetup = { key: string; participants: any[]; sources: string[]; import?: "release"; note: string; drop_documents?: { document_type: string; why: string }[] };
type SampleNode = { key: string; label: string; locations: string[]; link?: string; setup?: SampleSetup; subcategories?: SampleNode[] };
/** S7 (P-148): the six agreed combinations the Demo menu loads (samples/wave1.json). */
export const SAMPLES_SIX = join(STUDIO, "samples", "wave1.json");
type SixSetup = SampleSetup & { page: string | null; missing: { code: string; title: string; why: string }[]; lines?: SixLines };
/** C11.7 part B (P-109, P-171 (3)): what a person does on a combination's Forms and Documents tabs when no saved finder
 *  answer sets them up. Library forms by their code and whose form each is (the channel when not a PDF upload); each
 *  document line by its type's name (a new name waits as a library proposal, C3.6). Data in the sample file (P-319). */
type SixLines = { basis: string; forms: { code: string; who?: string; channel?: "ONLINE" | "PAPER" }[]; documents?: { name: string; who: string; always: true; proves: string; quote: string }[] };
const officialFiles = (): string[] => JSON.parse(readFileSync(join(SOLUTION, "official-sources", "ircc", "manifest.json"), "utf8")).items.map((i: { file: string }) => i.file);
type SampleFile = { pathways: { key: string; label: string; type: "INDIVIDUAL" | "CORPORATE"; description: string }[]; programs: { pathway: string; key: string; label: string; description: string; categories: SampleNode[] }[] };

/** C10.2: GET /demo/status `checkpoint`, by the audit line each load writes (Reset removes them). */
const CHECKPOINT_OF: Record<string, "finished_story" | "configured"> = { "finished story": "finished_story", "configured checkpoint": "configured" };
/** C10.2: the finished story's job, as GET /demo/status `story` shows it. */
type StoryJob = { state: "idle" | "running" | "done" | "failed"; started_at?: string; finished_at?: string; by?: string; seconds?: number; error?: string;
  stages?: { key: string; title: string; status: string; shows: string; why: string | null }[]; rows?: CheckpointRow[]; log?: string[]; cases?: { family: string | null; thin: string | null } };

@Injectable()
export class Demo implements OnModuleInit {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Workspace) private readonly ws: Workspace, @Inject(Audit) private readonly audit: Audit, @Inject(Studio) private readonly studio: Studio, @Inject(Sources) private readonly sources: Sources, @Inject(Ai) private readonly ai: Ai, @Inject(Intake) private readonly intake: Intake, @Inject(Finder) private readonly finder: Finder, @Inject(Forms) private readonly forms: Forms, @Inject(FormLibrary) private readonly formLibrary: FormLibrary, @Inject(ModuleRef) private readonly moduleRef: ModuleRef) {}
  /** B120: the configured checkpoint's steps (features/checkpoint/), read once at start-up so a bad step file stops it. */
  private steps: CheckpointStep[] = [];
  async onModuleInit() {
    this.steps = await featureSteps<CheckpointStep>(join(FEATURES_DIR, "checkpoint"));
    if (!this.steps.length) throw new Error("api/src/features/checkpoint: no step file, so the configured checkpoint would load the six and nothing else.");
  }
  async status() {
    const workspaceId = await this.ws.id();
    // loaded: the sample inputs are in this workspace; programsExist: something blocks loading them (QA-12).
    const [sample, programs] = await Promise.all([this.db.auditEvent.count({ where: { workspaceId, action: "loaded", entity: "sample inputs" } }), this.db.programDef.count({ where: { workspaceId } })]);
    // programsExist: any name in the Structure, Pathways included (W1-03: a read or a reset creates none).
    // C10.2: `checkpoint`, the last checkpoint loaded since the last reset (Reset removes the audit lines it reads), and
    // `story`, the finished story's job (running, done with its stages, or failed with its words).
    const last = await this.db.auditEvent.findFirst({ where: { workspaceId, action: "loaded", entity: { in: Object.keys(CHECKPOINT_OF) } }, orderBy: { at: "desc" }, select: { entity: true } });
    return { loaded: sample > 0, programsExist: programs > 0, scope: await this.scope(workspaceId), preserved: this.preserved(), checkpoint: last ? CHECKPOINT_OF[last.entity] : null, story: this.story };
  }

  /** C10.2 the finished story (DEMO.md checkpoint 3; Demo › Load the finished story): a job. Empties the demo when it has
   *  anything (only with "RESET" typed, as Reset), loads the configured checkpoint with its finished-story steps
   *  (features/checkpoint/125, 200: the family case to a recorded submission through the product's own routes, and a thin
   *  case left on release 1). One load at a time: the claim is taken before anything awaits. Loading twice gives the
   *  same story: each load starts from empty. US$0. */
  async finishedStory(actor: Actor, body?: { confirm?: unknown } | null) {
    need(actor, "author");
    if (!isDemoWorkspace()) fail(DEMO_ONLY, HttpStatus.CONFLICT);
    if (this.loading) fail("A sample load, a reset or the finished story is already running: wait for it to finish.", HttpStatus.CONFLICT);
    this.loading = true;
    let wipeFirst = false;
    try {
      wipeFirst = (await this.db.programDef.count({ where: { workspaceId: await this.ws.id() } })) > 0;
      if (wipeFirst && body?.confirm !== "RESET") fail('The demo has content: loading the finished story empties it first. Type RESET to confirm.');
    } catch (e) { this.loading = false; throw e; }
    const started_at = new Date().toISOString();
    this.story = { state: "running", started_at, by: actor.id };
    void this.runStory(actor, wipeFirst, started_at).finally(() => { this.loading = false; });
    return { state: "running", started_at, emptied_first: wipeFirst, words: "Loading the finished story: the configured checkpoint, then the family case to a recorded submission. This takes a few minutes; Demo › Load the finished story shows when it is done." };
  }
  private story: StoryJob = { state: "idle" };
  private storyAsked = false;
  private async runStory(actor: Actor, wipeFirst: boolean, started_at: string) {
    const t0 = Date.now();
    try {
      if (wipeFirst) await this.wipe(actor);
      this.storyAsked = true;
      const out = await this.loadClaimed(actor, await this.ws.id(), true, true, "Choose Demo › Load the finished story again: it empties the demo first.");
      const stages = ((out as { story?: StoryJob["stages"] } | undefined)?.story ?? []);
      const seconds = (Date.now() - t0) / 1000, count = (st: string) => (stages ?? []).filter((x) => x.status === st).length;
      await this.audit.log(await this.ws.id(), actor.id, "loaded", "finished story", null, `${actor.name} loaded the finished story in ${seconds.toFixed(1)} s: ${count("done")} stages done, ${count("partial")} partly, ${count("waiting")} waiting`);
      this.story = { state: "done", started_at, finished_at: new Date().toISOString(), by: actor.id, seconds, stages, rows: (out as { checkpoint?: CheckpointRow[] } | undefined)?.checkpoint ?? [], log: out?.log ?? [], cases: (out as { story_cases?: StoryJob["cases"] } | undefined)?.story_cases };
    } catch (e) {
      const said = e instanceof HttpException ? (e.getResponse() as { detail?: string; message?: string } | string) : null;
      const error = typeof said === "string" ? said : said?.detail ?? said?.message ?? "an unexpected error on the server (the details are in the server log)";
      if (!said) console.error("[demo] the finished story stopped", e);
      // Break m: the story's own words first, then the refusal (a load's "Reset the demo first" alone misleads here).
      this.story = { state: "failed", started_at, finished_at: new Date().toISOString(), by: actor.id, seconds: (Date.now() - t0) / 1000, error: `The finished story stopped: ${String(error)}`.slice(0, 600) };
    } finally { this.storyAsked = false; }
  }

  /** body.sample "six" (the Demo menu, S7): the six agreed combinations (P-148). No body: the suites' fixture, today's
   *  older sample kept as test data only so the other lanes' suites keep running until each moves to the six (plan step 6). */
  async load(actor: Actor, body?: { sample?: string } | null) {
    need(actor, "author");
    // C5.5 (Opus re-review of #568, M1): the no-body fixture writes the reviewed release as Release 1 directly, past every
    // gate; outside the demo workspace that would be a real release, so no sample load runs there (as releaseWithSources).
    if (!isDemoWorkspace()) fail(DEMO_ONLY, HttpStatus.CONFLICT);
    const configured = body?.sample === "configured", six = body?.sample === "six" || configured;
    if (body?.sample !== undefined && !six) fail('Say which sample to load: "six" or "configured".');
    const workspaceId = await this.ws.id();
    // One load at a time (break round 3): claimed before anything awaits, so a second click while loading is told so,
    // never a half-load and a 500.
    if (this.loading) fail("The sample inputs are already loading: wait for them to finish.", HttpStatus.CONFLICT);
    this.loading = true;
    try { return await this.loadClaimed(actor, workspaceId, configured, six); } finally { this.loading = false; }
  }
  private loading = false;

  /** The load itself, once the one-load-at-a-time claim is held (by load, or by resetToSix for its whole run). */
  private async loadClaimed(actor: Actor, workspaceId: string, configured: boolean, six: boolean, again = "Reset the demo, then load again.") {
    const t0 = Date.now();
    const log: string[] = [];
    try {
      if (await this.db.programDef.count({ where: { workspaceId } })) fail("The Structure already has names in this workspace. Reset the demo first to load the sample inputs.", HttpStatus.CONFLICT);
      const out = configured ? await this.loadConfigured(actor, workspaceId, t0, log) : six ? await this.loadSix(actor, workspaceId, t0, log) : await this.loadSteps(actor, workspaceId, t0, log);
      await applySampleFormRoles(this.db, workspaceId); // P-319: the demo's form roles on the forms the load added (the form intake adds them)
      return out;
    }
    catch (e) {
      if (e instanceof HttpException && e.getStatus() === HttpStatus.CONFLICT && !log.length) throw e;
      // A problem response (a service's own words in an object) is told in those words, never "Http Exception".
      const said = e instanceof HttpException ? (e.getResponse() as { detail?: string; message?: string | string[] }) : null;
      if (said && typeof said === "object" && (said.detail || said.message)) (e as Error).message = String(said.detail ?? [said.message].flat().join("; "));
      // D1 review (m1): only a service's own words reach the person; anything else (a database or file error, with its
      // code locations and server paths) goes to the server log, and the person reads plain words.
      if (!said) console.error(`[demo] loading the sample inputs stopped after: ${log.slice(-1)[0] ?? "the start"}`, e);
      const reason = said ? (e as Error).message.slice(0, 240) : "an unexpected error on the server (the details are in the server log)";
      await this.audit.log(workspaceId, actor.id, "failed", "sample inputs", null, `Loading the sample inputs stopped: ${reason}`, { log }).catch(() => undefined); // the workspace may be gone (a reset meanwhile)
      fail(`Loading stopped after: ${log.slice(-1)[0] ?? "the start"}. Reason: ${reason}. ${again}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /** D1 (P-226) "Reset to the six": one action, one confirmation. Empties all configuration exactly as Reset does (the
   *  same code), then loads the six P-148 combinations exactly as Load sample "six" does (the same code). Saved AI
   *  results are files Reset never touches (preserved(), checked byte-identical), so the six's saved answers replay.
   *  One run at a time: the load's claim is taken before anything awaits, so a second click or a Load sample meanwhile
   *  is refused (409). A failure in the reset part changes nothing (one transaction); a failure in the load part leaves
   *  the configuration emptied with part of the six, and its message says so: choosing Reset to the six again starts clean. */
  async resetToSix(actor: Actor, confirm: unknown) {
    need(actor, "author");
    if (!isDemoWorkspace()) fail(DEMO_ONLY, HttpStatus.CONFLICT); // C5.5 M1: it loads the six, as load does
    if (confirm !== "RESET") fail("Type RESET to confirm.");
    if (this.loading) fail("Reset to the six or a sample load is already running: wait for it to finish.", HttpStatus.CONFLICT);
    this.loading = true;
    try {
      const reset = await this.wipe(actor);
      const six = await this.loadClaimed(actor, await this.ws.id(), false, true, "The configuration was emptied but the six did not fully load: choose Demo › Reset to the six again to start clean.");
      return { ...six, sample: "six", reset };
    } finally { this.loading = false; }
  }

  /** The reviewed work-permit release (p3/releases/c1-v3) as a combination's Release 1: its configuration imported
   *  (engine/import.ts, which writes the source entries the release's own quotes state, "From the sample load"), the
   *  frozen snapshot recorded with the release's own author, submitter and approver, and the combination's read files
   *  marked as in the library. Used only by the suites' fixture (loadSteps), which the Demo menu never loads; Demo ›
   *  "Start With an LMIA from its reviewed release" releases nothing (releaseWithSources, P-322). */
  private async fromReviewedRelease(actor: Actor, workspaceId: string, combinationId: string, cfg: Record<string, unknown>, rel: ReviewedRelease) {
    const counts = await importConfiguration(this.db, workspaceId, combinationId, cfg, { by: actor.id, releaseLabel: "the reviewed work-permit release", releaseSha: rel.configuration_sha256 });
    const { snapshot, sha256 } = await buildSnapshot(this.db, workspaceId, combinationId, "published");
    const authors = [rel.author.user_id];
    const last = await this.db.packVersion.findFirst({ where: { workspaceId }, orderBy: { version: "desc" }, select: { version: true } });
    const pack = await this.db.packVersion.create({ data: { workspaceId, version: (last?.version ?? 0) + 1, authorIds: authors, approverId: rel.approver.user_id, summary: { rows: 1, via: "imported reviewed release", imported_from: "p3/releases/c1-v3" } } });
    await this.db.configRelease.create({ data: { workspaceId, combinationId, version: 1, status: "RELEASED", snapshot: snapshot as any, sha256, packVersionId: pack.id, summary: { imported_from: "p3/releases/c1-v3", c1_v3_sha256: rel.configuration_sha256, drafting_runs: rel.drafting_run_ids, counts, fill_trials: releaseFillTrials(snapshot) }, authorId: rel.author.user_id, submitterId: rel.submitter.user_id, approverId: rel.approver.user_id, basis: "Imported reviewed release: AI-drafted under the guarded path, reviewed and approved by a second person. Prototype only; not specialist-confirmed." } });
    for (const a of await this.db.sourceAttachment.findMany({ where: { combinationId, status: { in: ["READ", "RECOGNISED"] } } })) await this.db.sourceAttachment.update({ where: { id: a.id }, data: { status: "IN_LIBRARY", statusDetail: `${a.edition}: its field map from the reviewed release is in the library.` } });
    return counts;
  }

  /** C5.4 on the six (F6, 3 Nov; re-test of 1a79dbf9: the release with its sources was reachable only on the suites'
   *  fixture, which the Demo menu never loads). Demo › "Start With an LMIA from its reviewed release": after Reset to the
   *  six, "With an LMIA – inside Canada" gets the reviewed work-permit release's configuration (p3/releases/c1-v3) as its
   *  draft, so its Review and release tab lists the published numbers that have no source entry, each with Add source,
   *  and Submit waits for them (G1, P-240, P-279). QA-214 (tech lead ruling, P-294): c1-v3 is a work permit applied for
   *  from outside Canada and the six have no outside-Canada With an LMIA, so the combination stays Sample (illustrative),
   *  never labelled source-backed, and says where its setup came from. P-322 (tech lead ruling, 4 Nov): nothing is released
   *  here. Release 1 comes only through the product's own steps: a person answers the sources, the author submits, the
   *  SME signs and a different person approves. Scaffolding (P-33, P-35): the author, in the demo workspace, once, on
   *  the six only; no AI call (US$0), nothing approved past the rules. */
  async releaseWithSources(actor: Actor) {
    need(actor, "author");
    if (!isDemoWorkspace()) fail(DEMO_ONLY, HttpStatus.CONFLICT);
    if (this.loading) fail("A sample load or a reset is running: wait for it to finish.", HttpStatus.CONFLICT);
    this.loading = true;
    try {
      const workspaceId = await this.ws.id();
      const c = await this.db.combination.findFirst({ where: { workspaceId, combinationKey: SIX_LMIA } });
      if (!c) fail("The six are not loaded: choose Demo › Reset to the six first.", HttpStatus.CONFLICT);
      if (c!.retiredAt) fail(`"${c!.label}" is retired: choose Demo › Reset to the six to start again.`, HttpStatus.CONFLICT);
      if (await this.db.configRelease.count({ where: { combinationId: c!.id } })) fail(`"${c!.label}" already has a release: choose Demo › Reset to the six to start again.`, HttpStatus.CONFLICT);
      if (c!.basisNote === STARTED_FROM_RELEASE) fail(`"${c!.label}" already has the reviewed setup as its draft (or part of it, if loading stopped): carry on on Review and release, or choose Demo › Reset to the six to start again.`, HttpStatus.CONFLICT);
      const config = JSON.parse(readFileSync(join(RELEASE, "configuration.json"), "utf8")) as Record<string, unknown>;
      const rel = JSON.parse(readFileSync(join(RELEASE, "release.json"), "utf8")) as ReviewedRelease;
      // The run-once mark first, so a load that stops part way is never loaded over (review m1): the guard above then
      // sends the person to Reset to the six.
      await this.db.combination.update({ where: { id: c!.id }, data: { sourceBasis: "ILLUSTRATIVE", basisNote: STARTED_FROM_RELEASE } });
      // Its forms, documents, rules and checks as draft rows by the author, who submits them. The one shortcut (review
      // M1, said in the dialog and the audit line): the shared library rows (fields, sections, placements, document
      // types, the field maps) and the numbers its own quotes state come in as the reviewed release's, already in the
      // library (engine/import.ts), so no paid AI drafting runs again.
      const counts = await importConfiguration(this.db, workspaceId, c!.id, config, { by: actor.id, releaseLabel: "the reviewed work-permit release", releaseSha: rel.configuration_sha256, combinationStatus: "DRAFT" })
        // D1 (m1): the details go to the server log, the person reads plain words.
        .catch((e) => { console.error(`[demo] loading the reviewed setup into "${c!.label}" stopped`, e); return fail(`Loading the reviewed setup into "${c!.label}" stopped part way (the details are in the server log): choose Demo › Reset to the six to start again.`, HttpStatus.INTERNAL_SERVER_ERROR); });
      for (const a of await this.db.sourceAttachment.findMany({ where: { combinationId: c!.id, status: { in: ["READ", "RECOGNISED"] } } })) await this.db.sourceAttachment.update({ where: { id: a.id }, data: { status: "IN_LIBRARY", statusDetail: `${a.edition}: its field map from the reviewed release is in the library.` } });
      const { snapshot } = await buildSnapshot(this.db, workspaceId, c!.id, "draft");
      const held = draftSourceProblems(snapshot, isDemoWorkspace()).length;
      const said = Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(", ");
      await this.audit.log(workspaceId, actor.id, "loaded", "reviewed release", c!.combinationKey, `${actor.name} loaded the outside-Canada release c1-v3 (a work permit applied for from outside Canada) into "${c!.label}" as a Sample draft, not its source-backed setup (${said}); its shared library items came in as the reviewed release's, already in the library; ${held} number${held === 1 ? "" : "s"} wait for a source before it can be submitted; its field maps have no signed answer-key test, so its release is a Demo release`, { counts, held }, c!.id);
      return { combinationId: c!.id, label: c!.label, release: null, held, counts };
    } finally { this.loading = false; }
  }

  private async loadSteps(actor: Actor, workspaceId: string, t0: number, log: string[]) {
    // The reviewed release as engine/import.ts reads it; the sample loader itself reads only its document lines (QA-115).
    const config = JSON.parse(readFileSync(join(RELEASE, "configuration.json"), "utf8")) as Record<string, unknown> & { document_requirements: { document_type: string }[] };
    const rel = JSON.parse(readFileSync(join(RELEASE, "release.json"), "utf8"));
    const sample = JSON.parse(readFileSync(SAMPLES, "utf8")) as SampleFile;
    let rows = 0, nodes = 0;
    // W1-03 (B1): Pathways are names in the sample file, added like a person adds them on the Structure (W1-11 renames
    // them to the P-112 names); the Pathway type is a fixed value and never a row.
    for (const p of sample.pathways) {
      await this.studio.createNode(actor, { kind: "PATHWAY", label: p.label, key: p.key, clientType: p.type, description: p.description, sourceBasis: "ILLUSTRATIVE" });
      nodes++;
      log.push(`pathway "${p.label}" (Sample)`);
    }
    const setUp = async (node: any, path: string, c: SampleSetup) => {
      const comp = await this.studio.createCombination(actor, { programKey: node.programNodeKey, label: node.label, key: c.key, participants: c.participants, description: c.note, sourceBasis: c.import ? "SOURCE_BACKED" : "ILLUSTRATIVE", basisNote: c.note });
      rows++;
      for (const f of c.sources) { const r = await this.intake.sample(actor, comp.id, f); if (r.attachmentStatus === "RECOGNISED") await this.sources.read(actor, r.attachmentId!); }
      log.push(`  ${path}: ${c.sources.length} official files through the form intake`);
      if (c.import !== "release") return;
      // QA-115 (Lead, 30 Oct): a sub-category lists only the document lines that can apply to it; the sample names each
      // line it leaves out of the release, with why. A name that matches no line stops the load (never a silent miss).
      const drop = c.drop_documents ?? [];
      const missed = drop.filter((x) => !config.document_requirements.some((d) => d.document_type === x.document_type));
      if (missed.length) throw new Error(`Sample ${c.key}: no release line named ${missed.map((x) => `"${x.document_type}"`).join(", ")}`);
      const cfg = drop.length ? { ...config, document_requirements: config.document_requirements.filter((d) => !drop.some((x) => x.document_type === d.document_type)) } : config;
      const counts = await this.fromReviewedRelease(actor, workspaceId, comp.id, cfg, rel);
      if (drop.length) log.push(`  ${path}: left out ${drop.length} document lines that cannot apply here (${drop.map((x) => x.why).join("; ")})`);
      log.push(`  ${path}: started from the reviewed work-permit release (${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(", ")}); recorded as Release 1`);
    };
    for (const p of sample.programs) {
      const prog = await this.studio.createNode(actor, { kind: "PROGRAM", label: p.label, parentKey: p.pathway, key: p.key, description: p.description, sourceBasis: "ILLUSTRATIVE" });
      nodes++;
      log.push(`program "${prog.label}" (Sample)`);
      for (const cat of p.categories) {
        const node = await this.studio.createNode(actor, { kind: "STREAM", label: cat.label, parentKey: prog.programNodeKey, key: cat.key, sourceBasis: "ILLUSTRATIVE", allowedLocations: cat.locations, linkLabel: cat.link });
        nodes++;
        for (const sub of cat.subcategories ?? []) {
          const leaf = await this.studio.createNode(actor, { kind: "CATEGORY", label: sub.label, parentKey: node.programNodeKey, key: sub.key, sourceBasis: "ILLUSTRATIVE", allowedLocations: sub.locations, linkLabel: sub.link });
          nodes++;
          if (sub.setup) await setUp(leaf, `${cat.label} › ${sub.label}`, sub.setup);
        }
        if (cat.setup) await setUp(node, cat.label, cat.setup);
      }
    }
    // Every name here came from the sample file (loading refuses a structure that already has names): they are the
    // sample's, not the loading person's own drafts (P-116 amended), so deleting one goes to a second person.
    await this.db.programDef.updateMany({ where: { workspaceId }, data: { createdBy: SAMPLE_CREATOR } });
    const fam = sampleFamilyFacts();
    const prof = await this.db.sampleProfile.create({ data: { workspaceId, profileKey: "client-a-family", label: "Client A family (existing sample record, made-up)", basis: "expected/p5-case-c1.json: made-up family prepared by the Lead; confirmed facts for previews and the PDF proof; never an AI result, never sent to a model", people: fam.people } });
    await this.db.sampleFact.createMany({ data: fam.facts.map((f) => ({ workspaceId, profileId: prof.id, personId: f.personId, canonicalFieldKey: f.key, row: f.row, value: f.value as Prisma.InputJsonValue, status: "confirmed", source: f.source })) });
    log.push(`sample profile "${prof.label}": ${fam.facts.length} confirmed facts for ${fam.people.length} people`);
    const filled = await this.finder.fillSample(workspaceId); // S4: canada.ca pages and what IRCC accepts (US$0)
    const guides = await linkSampleGuides(this.db, workspaceId); // S5 slice 3: each guide is a source of its combinations
    log.push(`IRCC guides linked to their combinations as sources: ${guides}`);
    log.push(`library forms: ${filled.pages} canada.ca pages recorded, what IRCC accepts set for ${filled.accepts} (${filled.acceptsSaved} from saved finder answers, ${filled.accepts - filled.acceptsSaved} from the Sample fixtures), ${filled.guides} guide${filled.guides === 1 ? "" : "s"} added${filled.noGuide.length ? ` (no guide, Sample: ${filled.noGuide.join("; ")})` : ""}${filled.notUsed.length ? `; Sample fixtures not used: ${filled.notUsed.join("; ")}` : ""}${filled.note ? ` (${filled.note})` : ""}`);
    await this.audit.log(workspaceId, actor.id, "loaded", "sample inputs", null, `${actor.name} loaded the sample inputs in ${((Date.now() - t0) / 1000).toFixed(1)} s: ${sample.programs.length} programs, ${nodes} names in the Program structure, ${rows} combinations set up, official files through the upload path, the reviewed work-permit release imported as Release 1, 1 sample profile`, { log });
    return { ok: true, seconds: (Date.now() - t0) / 1000, log };
  }

  /** S7 Load sample (P-108, P-148, P-120/P-121): the six combinations through the same services as the screens, and
   *  nothing past the rules. Names through the Structure services; each official file through the normal intake (forms
   *  read on this computer, no AI); the form finder replayed on each combination's recorded canada.ca page (saved AI
   *  answers, US$0; a combination with none stops with the reason, for a person); each read form's saved AI field-map
   *  answer replayed through the one door (insertProposals) as waiting proposals. No live AI call, no release, no
   *  library row written directly: the library fills only when people accept and a second person approves. */
  private async loadSix(actor: Actor, workspaceId: string, t0: number, log: string[], opts: { swap?: Record<string, string> } = {}) {
    const sample = JSON.parse(readFileSync(SAMPLES_SIX, "utf8")) as SampleFile;
    // C10.1: where the load's time goes, step by step (seconds per kind of step, summed), returned with the result.
    const timings: Record<string, number> = {};
    const timed = async <T>(step: string, f: () => Promise<T>): Promise<T> => { const t = Date.now(); try { return await f(); } finally { timings[step] = Math.round(((timings[step] ?? 0) + (Date.now() - t) / 1000) * 10) / 10; } };
    let nodes = 0;
    const made: { id: string; label: string; page: string | null; missing: { code: string; why: string }[]; files: number; absent: string[]; lines?: SixLines }[] = [];
    for (const p of sample.pathways) {
      await this.studio.createNode(actor, { kind: "PATHWAY", label: p.label, key: p.key, clientType: p.type, description: p.description, sourceBasis: "ILLUSTRATIVE" });
      nodes++;
      log.push(`pathway "${p.label}" (${p.type === "CORPORATE" ? "Corporate" : "Retail"}, Sample)`);
    }
    const official = new Set(officialFiles());
    const setUp = async (node: { programNodeKey: string; label: string }, path: string, c: SixSetup) => {
      const comp = await this.studio.createCombination(actor, { programKey: node.programNodeKey, label: node.label, key: c.key, participants: c.participants, description: c.note, sourceBasis: "ILLUSTRATIVE", basisNote: c.note });
      // QA-207: the configured checkpoint may file another edition of a form (ROW17, features/checkpoint/170-new-edition.ts),
      // by its own official file.
      const sources = c.sources.map((f) => opts.swap?.[f] ?? f);
      const absent = sources.filter((f) => !official.has(f));
      const refused: { code: string; why: string }[] = [];
      for (const f of sources.filter((x) => official.has(x))) {
        const r = await timed("form intake (read code, edition, checksum)", () => this.intake.sample(actor, comp.id, f));
        if (!r.attachmentId) refused.push({ code: f, why: r.message }); // the intake's own words: shown, never hidden
        else if (r.attachmentStatus === "RECOGNISED") await timed("form read (form fields)", () => this.sources.read(actor, r.attachmentId!));
      }
      const missing = [...(c.missing ?? []).map((m) => ({ code: m.code, why: m.why })), ...refused];
      made.push({ id: comp.id, label: path, page: c.page ?? null, missing, files: sources.length - absent.length - refused.length, absent, lines: c.lines });
      const out = [...absent, ...missing.map((m) => m.code)];
      log.push(`  ${path}: ${sources.length - absent.length - refused.length} official files through the form intake${out.length ? `; Not found · Upload PDF: ${out.join(", ")}` : ""}`);
    };
    for (const p of sample.programs) {
      const prog = await this.studio.createNode(actor, { kind: "PROGRAM", label: p.label, parentKey: p.pathway, key: p.key, description: p.description, sourceBasis: "ILLUSTRATIVE" });
      nodes++;
      log.push(`program "${prog.label}" (Sample)`);
      for (const cat of p.categories) {
        const node = await this.studio.createNode(actor, { kind: "STREAM", label: cat.label, parentKey: prog.programNodeKey, key: cat.key, sourceBasis: "ILLUSTRATIVE", allowedLocations: cat.locations, linkLabel: cat.link });
        nodes++;
        for (const sub of cat.subcategories ?? []) {
          const leaf = await this.studio.createNode(actor, { kind: "CATEGORY", label: sub.label, parentKey: node.programNodeKey, key: sub.key, sourceBasis: "ILLUSTRATIVE", allowedLocations: sub.locations, linkLabel: sub.link });
          nodes++;
          if (sub.setup) await setUp(leaf, `${p.label} › ${cat.label} › ${sub.label}`, sub.setup as SixSetup);
        }
        if (cat.setup) await setUp(node, `${p.label} › ${cat.label}`, cat.setup as SixSetup);
      }
    }
    await this.db.programDef.updateMany({ where: { workspaceId }, data: { createdBy: SAMPLE_CREATOR } });
    // The sample family stays: preview test data, never configuration (plan "Technical choices").
    const fam = sampleFamilyFacts();
    const prof = await this.db.sampleProfile.create({ data: { workspaceId, profileKey: "client-a-family", label: "Client A family (existing sample record, made-up)", basis: "expected/p5-case-c1.json: made-up family prepared by the Lead; confirmed facts for previews and the PDF proof; never an AI result, never sent to a model", people: fam.people } });
    await this.db.sampleFact.createMany({ data: fam.facts.map((f) => ({ workspaceId, profileId: prof.id, personId: f.personId, canonicalFieldKey: f.key, row: f.row, value: f.value as Prisma.InputJsonValue, status: "confirmed", source: f.source })) });
    log.push(`sample profile "${prof.label}": ${fam.facts.length} confirmed facts for ${fam.people.length} people`);
    const filled = await timed("library forms and guides", () => this.finder.fillSample(workspaceId));
    const guides = await linkSampleGuides(this.db, workspaceId);
    log.push(`library forms: ${filled.pages} canada.ca pages recorded, what IRCC accepts set for ${filled.accepts}; IRCC guides linked as sources: ${guides}`);
    // The form finder, replayed (saved AI answers, US$0) from each combination's recorded application page.
    const finder: { combination: string; status: string; message: string }[] = [];
    for (const c of made) {
      if (!c.page) { finder.push({ combination: c.label, status: "NO_PAGE", message: "No canada.ca application page: an employer files it online (Sample)." }); continue; }
      const plan = await this.finder.plan(c.id, { mode: "replay", pageUrl: c.page });
      const run = await this.finder.launch(actor, c.id, { mode: "replay", pageUrl: c.page, planSha256: plan.plan_sha256, idempotencyKey: `sample-six-finder-${c.id}` });
      const done = await timed("form finder replay", () => this.settled(run.id));
      finder.push({ combination: c.label, status: done.status, message: done.message ?? "" });
      log.push(`  form finder (saved AI answers, US$0) on ${c.label}: ${done.status.toLowerCase()}${done.message ? `: ${done.message.slice(0, 200)}` : ""}`);
    }
    // Library drafts (P-108, P-138): each read form with a saved AI field-map answer on exactly that file is replayed
    // through the one door; a form without one waits for "Draft with AI" (a paid click, never here).
    const plan = await timed("field-map plan", () => this.ai.plan({ kind: "catalogue", ids: made.map((m) => m.id) }, "REPLAY"));
    const replay = plan.targets.filter((t) => t.action === "reuse_saved_output");
    const waiting = plan.targets.filter((t) => t.action !== "reuse_saved_output" && t.action !== "skip").map((t) => t.source);
    let drafts: { status: string; message: string } = { status: "NONE", message: "No saved AI answer matched these forms." };
    if (replay.length) {
      const b = await this.ai.launch(actor, { scope: { kind: "catalogue", ids: made.map((m) => m.id) }, mode: "REPLAY", idempotencyKey: `sample-six-drafts-${workspaceId}`, planSha256: plan.plan_sha256 });
      drafts = await timed("field-map replay (review queue)", () => this.settled(b.id!));
    }
    const proposals = await this.db.proposalItem.count({ where: { workspaceId, status: "waiting" } });
    // C11.7 part B: the lines a person adds by hand where the finder's replay set none up (after the drafts, as a person
    // would: the field-map replay above reads the library's forms, not these lines). Counted after the AI proposals, so
    // "proposals waiting" stays the replayed AI answers; a document type named here is the person's own proposal.
    const byHand: { combination: string; combination_id: string; forms_added: string[]; online: string[]; documents: { name: string; who: string; quote: string; status: string }[] }[] = [];
    for (const c of made) if (c.lines) byHand.push(await timed("form and document lines (as a person adds them)", () => this.linesByHand(actor, c as { id: string; label: string; lines: SixLines }, log)));
    log.push(`library drafts: ${replay.length} saved AI field-map answers replayed through the review queue (US$0): ${proposals} proposals waiting for review; ${[...new Set(waiting)].length} forms wait for "Draft with AI"${waiting.length ? ` (${[...new Set(waiting)].join(", ")})` : ""}`);
    const missing = made.flatMap((c) => [...c.absent.map((f) => ({ combination: c.label, code: f, why: "No saved copy." })), ...c.missing.map((m) => ({ combination: c.label, code: m.code, why: m.why }))]);
    await this.audit.log(workspaceId, actor.id, "loaded", "sample inputs", null, `${actor.name} loaded the sample starting point in ${((Date.now() - t0) / 1000).toFixed(1)} s: ${made.length} combinations (5 Retail, 1 Corporate Sample), ${nodes} names in the Structure, official files through the form intake, the form finder replayed (US$0), ${proposals} AI proposals waiting for review; nothing released`, { log });
    return { ok: true, sample: "six", seconds: (Date.now() - t0) / 1000, combinations: made.map((m) => ({ id: m.id, label: m.label, files: m.files })), finder, drafts: { replayed: replay.length, proposals_waiting: proposals, waiting_for_draft_with_ai: [...new Set(waiting)], status: drafts.status }, lines_by_hand: byHand, missing, cost_usd: 0, timings, log };
  }

  /** C11.7 part B (P-109, P-171 (3)): a combination's sample lines, through the screens' own services as the loading
   *  person (the author): each library form added from the library (FormLibrary.attach: refused in its own words when the
   *  library does not hold it or no approved edition is there, which stops the load), its channel set on the Forms tab
   *  (Forms.setChannel: refused where the library records that IRCC does not accept it), and each document line added on
   *  the Documents tab (Studio.saveRequirement: a type the library does not hold waits as one library proposal for a
   *  second person, so the load writes no document type itself, P-108). A form a replayed finder answer already put on
   *  the combination is left as it is. No AI, US$0. */
  private async linesByHand(actor: Actor, c: { id: string; label: string; lines: SixLines }, log: string[]) {
    const rows = await this.db.combinationForm.findMany({ where: { combinationId: c.id }, orderBy: { version: "desc" }, select: { lineageKey: true, status: true, channel: true } });
    const newest = new Map<string, (typeof rows)[number]>();
    for (const r of rows) if (!newest.has(r.lineageKey)) newest.set(r.lineageKey, r);
    const added: string[] = [], online: string[] = [], documents: { name: string; who: string; quote: string; status: string }[] = [];
    for (const f of c.lines.forms) {
      const had = newest.get(f.code);
      if (!had || had.status === "RETIRED") { await this.formLibrary.attach(actor, c.id, { formKey: f.code, who: f.who }); added.push(f.code); }
      if (f.channel && (had?.status === "RETIRED" || had?.channel !== f.channel)) {
        await this.forms.setChannel(actor, c.id, f.code, { channel: f.channel });
        if (f.channel === "ONLINE") online.push(f.code);
      }
    }
    for (const d of c.lines.documents ?? []) {
      const r = await this.studio.saveRequirement(actor, c.id, null, { newTypeName: d.name, proves: d.proves, attachMode: "COMBINATION_MANDATORY", appliesToRoles: d.who, providedBy: "client", sourceQuote: d.quote });
      documents.push({ name: d.name, who: d.who, quote: d.quote, status: "status" in r && r.status === "waiting" ? "waiting for a second person" : "line added" });
    }
    log.push(`  ${c.label}: by hand (Sample, ${c.lines.basis.split(":")[0]}): ${added.length} library forms added (${added.join(", ") || "none"})${online.length ? `, Online: ${online.join(", ")}` : ""}${documents.length ? `; document lines: ${documents.map((d) => `${d.name} (${d.status})`).join(", ")}` : ""}`);
    return { combination: c.label, combination_id: c.id, forms_added: added, online, documents };
  }

  /** C10.1 the configured checkpoint (the M2 gate, DEMO.md "Checkpoints" 2): Load sample six, then each DEMO.md row
   *  through the same services as the screens, as the people who hold each duty: the author (user-A) decides the
   *  replayed field-map proposals and applies them, a second person (user-B) approves the new library items, the author
   *  submits, the SME (user-C) signs and user-B releases. Nothing is faked: a step a rule refuses stays undone and its row
   *  says the rule's own words; a row whose function another lane has not merged says "not built yet". New saved AI
   *  answers drop in with no code change (the six load replays whatever saved answer matches). US$0, no live AI call. */
  /*  B120 (P-376 (3)): each row is a step file of api/src/features/checkpoint/, run in its file-name order (features.ts
   *  featureSteps), so a new row step adds a file and edits no line here. This runner only loads the six, gives every
   *  step one context (features/checkpoint/_context.ts), then sorts the rows and writes the audit line. It catches
   *  nothing and times nothing itself: a step's refusal stops the load as before ("Loading stopped after: …"). */
  private async loadConfigured(actor: Actor, workspaceId: string, t0: number, log: string[]) {
    if (!this.steps.length) throw new Error("the configured checkpoint has no steps (Demo.onModuleInit did not read api/src/features/checkpoint)"); // review m7
    const ctx = { actor, workspaceId, t0, log, db: this.db, audit: this.audit, result: {}, story: this.storyAsked ? "finished" : undefined,
      get: <T>(cls: new (...a: never[]) => T) => this.moduleRef.get(cls, { strict: false }), settled: (id: string) => this.settled(id) } as CheckpointContext;
    // Before anything is written, a step may swap an official file in the six's load (row 17's IMM 5476 2021).
    const swap: Record<string, string> = {};
    for (const s of this.steps) Object.assign(swap, (await s.prepare?.(ctx))?.swap);
    const six = await this.loadSix(actor, workspaceId, t0, log, Object.keys(swap).length ? { swap } : {});
    const person = (id: string) => ACTORS.find((a) => a.id === id)!;
    const timings: Record<string, number> = { ...six.timings };
    const rows: CheckpointRow[] = [];
    Object.assign(ctx, {
      six, author: person("user-A"), sme: person("user-C"), approver: person("user-B"),
      timed: async <T>(step: string, f: () => Promise<T>): Promise<T> => { const t = Date.now(); try { return await f(); } finally { timings[step] = Math.round(((timings[step] ?? 0) + (Date.now() - t) / 1000) * 10) / 10; } },
      said: (e: unknown) => { const r = e instanceof HttpException ? (e.getResponse() as { detail?: string; message?: string | string[] }) : null; return String((r && typeof r === "object" ? r.detail ?? [r.message].flat().join("; ") : null) ?? (e as Error).message).slice(0, 400); },
      row: (r: CheckpointRow) => { rows.push(r); log.push(`  row ${r.row} ${r.title}: ${r.status}${r.why ? ` (${r.why.slice(0, 200)})` : ""}`); },
    });
    log.push("configured checkpoint (C10.1): each DEMO.md row through the screens' services");
    ctx.keyOf = new Map((await this.db.combination.findMany({ where: { workspaceId }, select: { id: true, combinationKey: true } })).map((x) => [x.id, x.combinationKey]));
    ctx.vvId = six.combinations.find((c) => ctx.keyOf.get(c.id) === "vv.single")?.id;
    for (const s of this.steps) await s.run(ctx);
    rows.sort((a, b) => Number(a.row) - Number(b.row));
    const count = (s: CheckpointRow["status"]) => rows.filter((r) => r.status === s).length;
    await this.audit.log(workspaceId, actor.id, "loaded", "configured checkpoint", null, `${actor.name} loaded the configured checkpoint in ${((Date.now() - t0) / 1000).toFixed(1)} s: ${count("done")} rows done, ${count("partial")} partly, ${count("waiting")} waiting, ${count("not built yet")} not built yet`);
    return { ...six, sample: "configured", seconds: (Date.now() - t0) / 1000, checkpoint: rows, ...ctx.result, timings, log };
  }

  /** Waits for a background run (form finder or AI batch) to end; a run still going after 3 minutes is reported as such. */
  private async settled(batchId: string): Promise<{ status: string; message: string }> {
    for (const until = Date.now() + 180_000; Date.now() < until;) {
      const b = await this.db.aiBatch.findUnique({ where: { id: batchId }, select: { status: true, message: true } });
      if (!b || !["QUEUED", "RUNNING"].includes(b.status)) return { status: b?.status ?? "GONE", message: b?.message ?? "" };
      await new Promise((r) => setTimeout(r, 400));
    }
    return { status: "RUNNING", message: "Still running: watch it on the AI work page." };
  }

  /** What reset will remove (rows of the demo workspace, working files) and what it keeps. */
  async scope(workspaceId: string) {
    const ws = { workspaceId };
    const t = this.db;
    const rows: Record<string, number> = {
      "Pathways and programs": await t.programDef.count({ where: ws }), Combinations: await t.combination.count({ where: ws }), Releases: await t.packVersion.count({ where: ws }), "Source attachments": await t.sourceAttachment.count({ where: ws }), "Form intake records": await t.intakeItem.count({ where: ws }),
      "Field definitions (all versions)": await t.canonicalField.count({ where: ws }), Sections: await t.logicalSection.count({ where: ws }), "Question placements": await t.sectionQuestion.count({ where: ws }),
      "Forms and editions": (await t.govFormDef.count({ where: ws })) + (await t.formEdition.count({ where: ws })), "Field map entries (form fields)": await t.formFieldMap.count({ where: ws }),
      "Forms in combinations": await t.combinationForm.count({ where: ws }), "Document types and requirements": (await t.documentType.count({ where: ws })) + (await t.documentRequirement.count({ where: ws })),
      "Rules (conditions)": await t.predicate.count({ where: ws }), Checks: await t.check.count({ where: ws }), "Derived fields": await t.derivedField.count({ where: ws }),
      "AI and reading steps": await t.draftingJob.count({ where: ws }), "AI proposals and decisions": await t.proposalItem.count({ where: ws }),
      "Reviews, sign-offs and releases": (await t.reviewSubmission.count({ where: ws })) + (await t.reviewSignoff.count({ where: ws })) + (await t.configRelease.count({ where: ws })),
      "Sample profiles and facts": (await t.sampleProfile.count({ where: ws })) + (await t.sampleFact.count({ where: ws })), "Generated PDFs and reports": await t.generatedArtifact.count({ where: ws }), "Activity entries": await t.auditEvent.count({ where: ws }),
      // Runtime lane (R1): cases, the people on them and their answers (all versions)
      Cases: await t.case.count({ where: ws }), "People on cases": await t.party.count({ where: ws }), "Case answers (all versions) and rows": (await t.clientCanonicalAnswer.count({ where: ws })) + (await t.clientFactRecord.count({ where: ws })),
      // C6.12 /prepare (runtime lane, M3-B2; break B6): the filings and items stored per case (removed with their cases)
      "Filings, groups and filed items": (await t.submissionGroup.count({ where: ws })) + (await t.filing.count({ where: ws })) + (await t.filingItem.count({ where: ws })),
      "Official pages confirmed": await t.officialPagesRecord.count({ where: ws }), // F2 (forms lane, N8)
      "Library forms remembered as deleted": await t.libraryFormDeletion.count({ where: ws }), // X5 slice c (forms lane)
      // F1 (forms lane): answer lists and field merges (rows parked by W1-02 on an older database are removed too)
      "Answer lists and merges": (await t.answerList.count({ where: ws })) + (await t.fieldMerge.count({ where: ws })),
      "Library changes and sources approved in the product": (await t.libraryChange.count({ where: ws })) + (await t.approvedSource.count({ where: ws })),
      // DV-bb-6b: person roles someone added are removed; the built-in ones (S5) are counted apart, since a new workspace starts with them.
      "Person roles added here": await t.personRole.count({ where: { ...ws, builtIn: false } }),
      // S7 (P-108): Reset empties everything, these two included
      "canada.ca files saved by the finder and form line changes": (await t.officialDownload.count({ where: ws })) + (await t.formLineAction.count({ where: ws })),
      // G4 (forms lane): test families, their answer keys and runs
      "Answer-key families, keys and runs": (await t.testFamily.count({ where: ws })) + (await t.answerKey.count({ where: ws })) + (await t.answerKeyRun.count({ where: ws })),
      // G1 (screens lane): the source entries of published numbers
      "Source entries of published numbers": await t.sourceEntry.count({ where: ws }),
    };
    const builtIn = await t.personRole.count({ where: { ...ws, builtIn: true } });
    const dir = VAR("demo");
    const files = existsSync(dir) ? this.walk(dir) : [];
    return { rows, total_rows: Object.values(rows).reduce((a, b) => a + b, 0), built_in_rows: builtIn, files: files.length, bytes: files.reduce((a, f) => a + statSync(f).size, 0), folder: dir.replace(`${ROOT}/`, ""), generated_scripts: "none: rules and conditions are stored as data and evaluated by the engine; nothing generates executable code" };
  }

  walk(dir: string): string[] { return readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? this.walk(join(dir, d.name)) : [join(dir, d.name)])); }

  /** Fingerprints of what reset must never touch. */
  preserved() {
    const fp = (label: string, paths: string[]) => { const h = createHash("sha256"); let n = 0; for (const p of paths.sort()) { if (!existsSync(p)) continue; h.update(p.replace(ROOT, "")); h.update(readFileSync(p)); n++; } return { label, files: n, sha256: h.digest("hex") }; };
    const under = (d: string, f: (x: string) => boolean = () => true) => (existsSync(d) ? this.walk(d).filter(f) : []);
    return [
      fp("Spend ledger and launch tickets (append-only)", under(LEDGER_DIR)),
      fp("AI run records (P2 drafting and P5 reader)", [...under(join(PROTOTYPE, "p2", "runs")), ...under(join(PROTOTYPE, "p5", "reader", "runs"))]),
      fp("AI job definitions and form inventories (inputs of the saved runs)", [...under(join(PROTOTYPE, "p2", "jobs")), ...under(join(PROTOTYPE, "p1", "inventory"))]),
      fp("Official source originals and manifest", under(join(SOLUTION, "official-sources"))),
      fp("Released configurations and review evidence (P3/P4)", [...under(join(PROTOTYPE, "p3", "releases")), ...under(join(PROTOTYPE, "p3", "evidence")), ...under(join(PROTOTYPE, "p4", "evidence"))]),
      fp("Fixtures and independent answer keys", under(join(PROTOTYPE, "expected"))),
      fp("Engine and application source", [...under(join(PROTOTYPE, "contracts")), ...under(join(PROTOTYPE, "p5"), (x) => /\.(ts|py)$/.test(x)), ...under(join(STUDIO, "api", "src")), ...under(join(STUDIO, "engine")), ...under(join(STUDIO, "web", "src")), ...under(join(STUDIO, "prisma"))]),
    ];
  }

  async reset(actor: Actor, confirm: string) {
    need(actor, "author");
    if (!isDemoWorkspace()) fail(DEMO_ONLY, HttpStatus.CONFLICT); // C5.5 (breaker F3): it would empty a real workspace, releases included
    if (confirm !== "RESET") fail('Type RESET to confirm.');
    // D1 break M1 (the one change to the blank Reset, P-226): it takes the same one-at-a-time claim as Load sample and
    // Reset to the six, so it never empties a workspace that a load is still writing to (rows of a deleted workspace).
    if (this.loading) fail("A sample load or Reset to the six is running: wait for it to finish, then reset.", HttpStatus.CONFLICT);
    this.loading = true;
    try { return await this.wipe(actor); } finally { this.loading = false; }
  }

  /** Reset's work, once the one-at-a-time claim is held (by reset, or by resetToSix for its whole run). */
  private async wipe(actor: Actor) {
    const workspaceId = await this.ws.id();
    if (this.story.state !== "running") this.story = { state: "idle" }; // C10.2: a reset forgets the last story's result
    this.ai.forgetQueue(); // queued AI steps of this workspace must not start; running ones find their rows gone and stop
    const before = { scope: await this.scope(workspaceId), preserved: this.preserved() };
    const t0 = Date.now();
    const ws = { workspaceId };
    await this.db.$transaction(async (tx) => {
      // Children first; every table is scoped to the demo workspace id.
      await tx.case.deleteMany({ where: ws }); await tx.party.deleteMany({ where: ws }); // runtime lane (R1): cases (with their pins and participants), then people with their answers and rows
      await tx.firmCaseCounter.deleteMany({ where: ws }); // A24-1 (CS-7): every case went, so numbering starts again at 00001
      await tx.route.deleteMany({ where: ws }); // C6.17: the Sample routes (no foreign key to the workspace); a case's stages went with its case
      await tx.proposalItem.deleteMany({ where: ws }); await tx.draftingJob.deleteMany({ where: ws }); await tx.aiBatch.deleteMany({ where: ws });
      await tx.testFamily.deleteMany({ where: ws }); // G4 (forms lane): test families; their keys and runs go with them
      await tx.reviewSignoff.deleteMany({ where: ws }); await tx.reviewSubmission.deleteMany({ where: ws }); await tx.configRelease.deleteMany({ where: ws }); await tx.packVersion.deleteMany({ where: ws });
      await tx.formFieldMap.deleteMany({ where: ws }); await tx.combinationForm.deleteMany({ where: ws }); await tx.formEdition.deleteMany({ where: ws }); await tx.govFormDef.deleteMany({ where: ws });
      await tx.sqrSectionSelection.deleteMany({ where: ws }); await tx.documentRequirement.deleteMany({ where: ws }); await tx.predicate.deleteMany({ where: ws }); await tx.check.deleteMany({ where: ws });
      await tx.intakeItem.deleteMany({ where: ws }); await tx.sourceAttachment.deleteMany({ where: ws }); await tx.combination.deleteMany({ where: ws }); await tx.programDef.deleteMany({ where: ws });
      await tx.canonicalField.deleteMany({ where: ws }); await tx.logicalSection.deleteMany({ where: ws }); await tx.sectionQuestion.deleteMany({ where: ws }); await tx.documentType.deleteMany({ where: ws }); await tx.derivedField.deleteMany({ where: ws });
      await tx.sampleFact.deleteMany({ where: ws }); await tx.sampleProfile.deleteMany({ where: ws }); await tx.generatedArtifact.deleteMany({ where: ws }); await tx.auditEvent.deleteMany({ where: ws });
      await tx.portalCapture.deleteMany({ where: ws }); await tx.answerList.deleteMany({ where: ws }); await tx.fieldMerge.deleteMany({ where: ws }); // F1 (forms lane)
      await tx.libraryChange.deleteMany({ where: ws }); await tx.approvedSource.deleteMany({ where: ws }); // Screen 02 slice 2
      await tx.changeSet.deleteMany({ where: ws }); // G-CORE (P-253)
      await tx.officialPagesRecord.deleteMany({ where: ws }); // F2 (forms lane, N8)
      await tx.libraryFormDeletion.deleteMany({ where: ws }); // X5 slice c (forms lane): remembered library deletions
      await tx.lineBatch.deleteMany({ where: ws }); // X2b slice (b) (screens lane): one copy or removal across many combinations
      await tx.recaptureTask.deleteMany({ where: ws }); await tx.extensionSession.deleteMany({ where: ws }); await tx.extensionPairing.deleteMany({ where: ws }); // F2 (forms lane, parked by W1-02): the browser extension's tasks, sessions and codes left from before the park; a reset signs every extension out
      await tx.personRole.deleteMany({ where: ws }); // S5 (Lead check L9): person roles have no foreign key to the workspace
      await tx.officialDownload.deleteMany({ where: ws }); await tx.formLineAction.deleteMany({ where: ws }); // S7 (P-108): canada.ca files the finder saved and Forms tab line changes have no foreign key either
      await tx.sourceEntry.deleteMany({ where: ws }); // G1 BR-11 (challenge m7): source entries have no foreign key; never re-attached to the re-imported keys
      await tx.workspace.delete({ where: { id: workspaceId } });
      // L9: and any left by a reset made before this fix.
      await tx.$executeRaw`DELETE FROM person_role r WHERE NOT EXISTS (SELECT 1 FROM workspace w WHERE w.id = r.workspace_id)`;
    });
    await this.sweepOrphans();
    const dir = VAR("demo");
    if (dir.startsWith(join(VAR_ROOT, "workspaces")) && existsSync(dir)) rmSync(dir, { recursive: true, force: true });
    await (await import("./platform/identity/demo-reset.ts")).resetSampleFirmSettings(this.db);   // P-571 (1), PF-4: Sample firm settings back to seed through the settings write path (each change audited; platform audit lines are never deleted)
    this.ws.forget();
    const fresh = await this.ws.id();
    const after = { scope: await this.scope(fresh), preserved: this.preserved() };
    const unchanged = before.preserved.every((p, i) => p.sha256 === after.preserved[i].sha256);
    const result = { removed_rows: before.scope.total_rows, removed_files: before.scope.files, remaining_rows: after.scope.total_rows, remaining_built_in: after.scope.built_in_rows, remaining_files: after.scope.files, preserved_unchanged: unchanged, preserved: after.preserved, seconds: (Date.now() - t0) / 1000, new_workspace: fresh };
    mkdirSync(VAR_ROOT, { recursive: true });
    appendFileSync(join(VAR_ROOT, "reset-log.jsonl"), JSON.stringify({ at: new Date().toISOString(), by: actor.id, old_workspace: workspaceId, ...result, removed: before.scope.rows }) + "\n");
    await this.audit.log(fresh, actor.id, "reset", "demo workspace", null, `${actor.name} reset the demo: ${result.removed_rows} rows and ${result.removed_files} working files removed; ${result.remaining_rows} rows remain; preserved evidence ${unchanged ? "byte-identical" : "CHANGED"} (${after.preserved.map((p) => p.files).reduce((a, b) => a + b, 0)} files fingerprinted)`, result);
    return result;
  }

  /** D1 break M1: rows of a workspace that no longer exists (left by a reset that raced a load before the claim above),
   *  in every table with a workspace id, read from the database's own column list. A row another table still points at
   *  is removed on a later pass, once that row is gone; one query per table per pass, normally one pass and no rows. */
  private async sweepOrphans() {
    const tables = (await this.db.$queryRaw<{ t: string }[]>`SELECT table_name AS t FROM information_schema.columns WHERE table_schema = current_schema() AND column_name = 'workspace_id' AND table_name <> 'workspace'`).map((r) => r.t);
    for (let pass = 0, left = tables; pass < 4 && left.length; pass++) {
      const blocked: string[] = [];
      for (const t of left) {
        try { await this.db.$executeRawUnsafe(`DELETE FROM "${t.replace(/"/g, "")}" x WHERE NOT EXISTS (SELECT 1 FROM workspace w WHERE w.id = x.workspace_id)`); }
        catch { blocked.push(t); } // still pointed at by an orphan row elsewhere: tried again on the next pass
      }
      left = blocked;
    }
  }

  actors() { return ACTORS; }
}
export { sha };
