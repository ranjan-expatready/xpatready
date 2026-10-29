// "Load sample inputs" and "Reset demo" (D274). The loader stands in for a person typing and choosing files: it calls
// the same services as the screens (create pathway/program/combination, attach files through the normal upload
// handler, read forms). It never runs or fakes AI, approves anything or fills a case. The only shortcut is that the
// work-permit sample starts from the reviewed release c1-v3 (imported as Release 1, labelled with its hash and drafting
// runs) instead of re-buying every paid AI draft. Reset removes the disposable workspace's rows and working files and keeps the engine,
// official originals, fixtures, AI run records, the spend ledger and review evidence, which it fingerprints before
// and after so "unchanged" is checked, not asserted.
import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { importConfiguration, sampleFamilyFacts } from "../../engine/import.ts";
import { buildSnapshot } from "../../engine/snapshot.ts";
import { Ai } from "./ai.ts";
import { ACTORS, Audit, Db, fail, need, PROTOTYPE, ROOT, SOLUTION, STUDIO, VAR, VAR_ROOT, Workspace, type Actor } from "./core.ts";
import { Programs } from "./programs.ts";
import { Intake } from "./intake.ts";
import { Finder } from "./finder.ts";
import { SAMPLE_CREATOR } from "./lifecycle.ts";
import { linkSampleGuides } from "./guide-sources.ts";
import { Sources } from "./sources.ts";
import { Studio } from "./studio.ts";

const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
const RELEASE = join(PROTOTYPE, "p3", "releases", "c1-v3");

/** The sample programs (Screen 01): an import file, not constants in code (STANDARDS §3.1). Seven Individual and four
 *  Corporate programs covering the kinds of case in domain/TAXONOMY.md; names are illustrative and shown as Sample.
 *  Rows with a "setup" block get their combination and official files through the normal upload path; one of them
 *  starts from the reviewed work-permit release. Everything else shows as Not started. */
export const SAMPLES = join(STUDIO, "samples", "programs.json");
type SampleSetup = { key: string; participants: any[]; sources: string[]; import?: "release"; note: string };
type SampleNode = { key: string; label: string; locations: string[]; link?: string; setup?: SampleSetup; subcategories?: SampleNode[] };
type SampleFile = { pathways: { key: string; label: string; type: "INDIVIDUAL" | "CORPORATE"; description: string }[]; programs: { pathway: string; key: string; label: string; description: string; categories: SampleNode[] }[] };

@Injectable()
export class Demo {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Workspace) private readonly ws: Workspace, @Inject(Audit) private readonly audit: Audit, @Inject(Studio) private readonly studio: Studio, @Inject(Sources) private readonly sources: Sources, @Inject(Ai) private readonly ai: Ai, @Inject(Programs) private readonly programs: Programs, @Inject(Intake) private readonly intake: Intake, @Inject(Finder) private readonly finder: Finder) {}

  async status() {
    const workspaceId = await this.ws.id();
    // loaded: the sample inputs are in this workspace; programsExist: something blocks loading them (QA-12).
    const [sample, programs] = await Promise.all([this.db.auditEvent.count({ where: { workspaceId, action: "loaded", entity: "sample inputs" } }), this.db.programDef.count({ where: { workspaceId } })]);
    // programsExist: any name in the Structure, Pathways included (W1-03: a read or a reset creates none).
    return { loaded: sample > 0, programsExist: programs > 0, scope: await this.scope(workspaceId), preserved: this.preserved() };
  }

  async load(actor: Actor) {
    need(actor, "author");
    const workspaceId = await this.ws.id();
    // One load at a time (break round 3): claimed before anything awaits, so a second click while loading is told so,
    // never a half-load and a 500.
    if (this.loading) fail("The sample inputs are already loading: wait for them to finish.", HttpStatus.CONFLICT);
    this.loading = true;
    const t0 = Date.now();
    const log: string[] = [];
    try {
      if (await this.db.programDef.count({ where: { workspaceId } })) fail("The Structure already has names in this workspace. Reset the demo first to load the sample inputs.", HttpStatus.CONFLICT);
      return await this.loadSteps(actor, workspaceId, t0, log);
    }
    catch (e) {
      if (e instanceof HttpException && e.getStatus() === HttpStatus.CONFLICT && !log.length) throw e;
      await this.audit.log(workspaceId, actor.id, "failed", "sample inputs", null, `Loading the sample inputs stopped: ${(e as Error).message.slice(0, 300)}`, { log });
      fail(`Loading stopped after: ${log.slice(-1)[0] ?? "the start"}. Reason: ${(e as Error).message.slice(0, 240)}. Reset the demo, then load again.`, HttpStatus.INTERNAL_SERVER_ERROR);
    } finally { this.loading = false; }
  }
  private loading = false;

  private async loadSteps(actor: Actor, workspaceId: string, t0: number, log: string[]) {
    const config = JSON.parse(readFileSync(join(RELEASE, "configuration.json"), "utf8"));
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
      const counts = await importConfiguration(this.db, workspaceId, comp.id, config, { by: actor.id, releaseLabel: "the reviewed work-permit release", releaseSha: rel.configuration_sha256 });
      const { snapshot, sha256 } = await buildSnapshot(this.db, workspaceId, comp.id, "published");
      const authors = [rel.author.user_id];
      const pack = await this.db.packVersion.create({ data: { workspaceId, version: 1, authorIds: authors, approverId: rel.approver.user_id, summary: { rows: 1, via: "imported reviewed release", imported_from: "p3/releases/c1-v3" } } });
      await this.db.configRelease.create({ data: { workspaceId, combinationId: comp.id, version: 1, status: "RELEASED", snapshot: snapshot as any, sha256, packVersionId: pack.id, summary: { imported_from: "p3/releases/c1-v3", c1_v3_sha256: rel.configuration_sha256, drafting_runs: rel.drafting_run_ids, counts }, authorId: rel.author.user_id, submitterId: rel.submitter.user_id, approverId: rel.approver.user_id, basis: "Imported reviewed release: AI-drafted under the guarded path, reviewed and approved by a second person. Prototype only; not specialist-confirmed." } });
      for (const a of await this.db.sourceAttachment.findMany({ where: { combinationId: comp.id, status: { in: ["READ", "RECOGNISED"] } } })) await this.db.sourceAttachment.update({ where: { id: a.id }, data: { status: "IN_LIBRARY", statusDetail: `${a.edition}: its field map from the reviewed release is in the library.` } });
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
    await this.db.sampleFact.createMany({ data: fam.facts.map((f) => ({ workspaceId, profileId: prof.id, personId: f.personId, canonicalFieldKey: f.key, row: f.row, value: f.value as any, status: "confirmed", source: f.source })) });
    log.push(`sample profile "${prof.label}": ${fam.facts.length} confirmed facts for ${fam.people.length} people`);
    const filled = await this.finder.fillSample(workspaceId); // S4: canada.ca pages and what IRCC accepts (US$0)
    const guides = await linkSampleGuides(this.db, workspaceId); // S5 slice 3: each guide is a source of its combinations
    log.push(`IRCC guides linked to their combinations as sources: ${guides}`);
    log.push(`library forms: ${filled.pages} canada.ca pages recorded, what IRCC accepts set for ${filled.accepts} (${filled.acceptsSaved} from saved finder answers, ${filled.accepts - filled.acceptsSaved} from the Sample fixtures), ${filled.guides} guide${filled.guides === 1 ? "" : "s"} added${filled.noGuide.length ? ` (no guide, Sample: ${filled.noGuide.join("; ")})` : ""}${filled.notUsed.length ? `; Sample fixtures not used: ${filled.notUsed.join("; ")}` : ""}${filled.note ? ` (${filled.note})` : ""}`);
    await this.audit.log(workspaceId, actor.id, "loaded", "sample inputs", null, `${actor.name} loaded the sample inputs in ${((Date.now() - t0) / 1000).toFixed(1)} s: ${sample.programs.length} programs, ${nodes} names in the Program structure, ${rows} combinations set up, official files through the upload path, the reviewed work-permit release imported as Release 1, 1 sample profile`, { log });
    return { ok: true, seconds: (Date.now() - t0) / 1000, log };
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
      "AI and reading steps": await t.draftingJob.count({ where: ws }), "AI proposals and decisions": await t.normalizationItem.count({ where: ws }),
      "Reviews, sign-offs and releases": (await t.reviewSubmission.count({ where: ws })) + (await t.reviewSignoff.count({ where: ws })) + (await t.configRelease.count({ where: ws })),
      "Sample profiles and facts": (await t.sampleProfile.count({ where: ws })) + (await t.sampleFact.count({ where: ws })), "Generated PDFs and reports": await t.generatedArtifact.count({ where: ws }), "Activity entries": await t.auditEvent.count({ where: ws }),
      // Runtime lane (R1): cases, the people on them and their answers (all versions)
      Cases: await t.case.count({ where: ws }), "People on cases": await t.party.count({ where: ws }), "Case answers (all versions) and rows": (await t.clientCanonicalAnswer.count({ where: ws })) + (await t.clientFactRecord.count({ where: ws })),
      // F1 (forms lane): answer lists and field merges (rows parked by W1-02 on an older database are removed too)
      "Answer lists and merges": (await t.answerList.count({ where: ws })) + (await t.fieldMerge.count({ where: ws })),
      "Library changes and sources approved in the product": (await t.libraryChange.count({ where: ws })) + (await t.approvedSource.count({ where: ws })),
      // DV-bb-6b: person roles someone added are removed; the built-in ones (S5) are counted apart, since a new workspace starts with them.
      "Person roles added here": await t.personRole.count({ where: { ...ws, builtIn: false } }),
      // S7 (P-108): Reset empties everything, these two included
      "canada.ca files saved by the finder and form line changes": (await t.officialDownload.count({ where: ws })) + (await t.formLineAction.count({ where: ws })),
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
      fp("Spend ledger and launch tickets (append-only)", under(join(PROTOTYPE, "p2", "ledger"))),
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
    if (confirm !== "RESET") fail('Type RESET to confirm.');
    const workspaceId = await this.ws.id();
    this.ai.forgetQueue(); // queued AI steps of this workspace must not start; running ones find their rows gone and stop
    const before = { scope: await this.scope(workspaceId), preserved: this.preserved() };
    const t0 = Date.now();
    const ws = { workspaceId };
    await this.db.$transaction(async (tx) => {
      // Children first; every table is scoped to the demo workspace id.
      await tx.case.deleteMany({ where: ws }); await tx.party.deleteMany({ where: ws }); // runtime lane (R1): cases (with their pins and participants), then people with their answers and rows
      await tx.normalizationItem.deleteMany({ where: ws }); await tx.draftingJob.deleteMany({ where: ws }); await tx.aiBatch.deleteMany({ where: ws });
      await tx.reviewSignoff.deleteMany({ where: ws }); await tx.reviewSubmission.deleteMany({ where: ws }); await tx.configRelease.deleteMany({ where: ws }); await tx.packVersion.deleteMany({ where: ws });
      await tx.formFieldMap.deleteMany({ where: ws }); await tx.combinationForm.deleteMany({ where: ws }); await tx.formEdition.deleteMany({ where: ws }); await tx.govFormDef.deleteMany({ where: ws });
      await tx.sqrSectionSelection.deleteMany({ where: ws }); await tx.documentRequirement.deleteMany({ where: ws }); await tx.predicate.deleteMany({ where: ws }); await tx.check.deleteMany({ where: ws });
      await tx.intakeItem.deleteMany({ where: ws }); await tx.sourceAttachment.deleteMany({ where: ws }); await tx.combination.deleteMany({ where: ws }); await tx.programDef.deleteMany({ where: ws });
      await tx.canonicalField.deleteMany({ where: ws }); await tx.logicalSection.deleteMany({ where: ws }); await tx.sectionQuestion.deleteMany({ where: ws }); await tx.documentType.deleteMany({ where: ws }); await tx.derivedField.deleteMany({ where: ws });
      await tx.sampleFact.deleteMany({ where: ws }); await tx.sampleProfile.deleteMany({ where: ws }); await tx.generatedArtifact.deleteMany({ where: ws }); await tx.auditEvent.deleteMany({ where: ws });
      await tx.portalCapture.deleteMany({ where: ws }); await tx.answerList.deleteMany({ where: ws }); await tx.fieldMerge.deleteMany({ where: ws }); // F1 (forms lane)
      await tx.libraryChange.deleteMany({ where: ws }); await tx.approvedSource.deleteMany({ where: ws }); // Screen 02 slice 2
      await tx.recaptureTask.deleteMany({ where: ws }); await tx.extensionSession.deleteMany({ where: ws }); await tx.extensionPairing.deleteMany({ where: ws }); // F2 (forms lane, parked by W1-02): the browser extension's tasks, sessions and codes left from before the park; a reset signs every extension out
      await tx.personRole.deleteMany({ where: ws }); // S5 (Lead check L9): person roles have no foreign key to the workspace
      await tx.officialDownload.deleteMany({ where: ws }); await tx.formLineAction.deleteMany({ where: ws }); // S7 (P-108): canada.ca files the finder saved and Forms tab line changes have no foreign key either
      await tx.workspace.delete({ where: { id: workspaceId } });
      // L9: and any left by a reset made before this fix.
      await tx.$executeRaw`DELETE FROM person_role r WHERE NOT EXISTS (SELECT 1 FROM workspace w WHERE w.id = r.workspace_id)`;
    });
    const dir = VAR("demo");
    if (dir.startsWith(join(VAR_ROOT, "workspaces")) && existsSync(dir)) rmSync(dir, { recursive: true, force: true });
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

  actors() { return ACTORS; }
}
export { sha };
