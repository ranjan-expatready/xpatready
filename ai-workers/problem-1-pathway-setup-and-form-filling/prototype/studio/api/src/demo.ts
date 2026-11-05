// "Load sample inputs" and "Reset demo" (D274). The loader stands in for a person typing and choosing files: it calls
// the same services as the screens (create pathway/program/combination, attach files through the normal upload
// handler, read forms). It never runs or fakes AI, approves anything or fills a case. The only shortcut is that the
// work-permit sample starts from the reviewed release c1-v3 (imported as Release 1, labelled with its hash and drafting
// runs) instead of re-buying every paid AI draft. Reset removes the disposable workspace's rows and working files and keeps the engine,
// official originals, fixtures, AI run records, the spend ledger and review evidence, which it fingerprints before
// and after so "unchanged" is checked, not asserted.
import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { applySampleFormRoles, importConfiguration, sampleFamilyFacts } from "../../engine/import.ts";
import { buildSnapshot } from "../../engine/snapshot.ts";
import { LEDGER_DIR } from "../../../p2/policy.ts";
import { Ai } from "./ai.ts";
import { ACTORS, Audit, Db, fail, isDemoWorkspace, need, OFFICIAL, PROTOTYPE, ROOT, SOLUTION, STUDIO, VAR, VAR_ROOT, Workspace, type Actor } from "./core.ts";
import { releaseTwoWords } from "./checkpoint-words.ts";
import { Programs } from "./programs.ts";
import { Intake } from "./intake.ts";
import { Finder } from "./finder.ts";
import { ReviewProposals } from "./review-proposals.ts";
import { SAMPLE_CREATOR } from "./lifecycle.ts";
import { linkSampleGuides } from "./guide-sources.ts";
import { libraryRevision, Sources } from "./sources.ts";
import { Screen02 } from "./screen02.ts";
import { Studio } from "./studio.ts";
import { Checklists } from "./checklist.ts";
import { draftSourceProblems, seedSampleSources } from "./source-register.ts";
import { FormMasters } from "./form-masters.ts";
import { Forms } from "./forms.ts";
import { keepChosenEveryones, placeFromFormParts } from "./form-part-placements.ts";
import { decide } from "./proposals.ts";
import { RuleFacts } from "./rule-facts.ts";
import { OwnQuestions } from "./own-question.ts";
import { OWN_YES_NO_REASON } from "./own-yes-no.ts";
import { normalizeLabel } from "../../contracts/programs.ts";
import { FormLibrary } from "./form-library.ts";
import { CaseForms } from "./fill-case.ts";
import { Runtime } from "./runtime.ts";
import { openSampleFamilyCase, SAMPLE_CASE } from "./sample-case.ts";
/** QA-144 slices 1–3 (tech lead on #798): the combinations the configured checkpoint sets up from their forms' own parts.
 *  The others follow, one slice each. */
const SET_UP_FROM_FORMS = new Set(["vv.single", "wp.lmia_inside", "sp.outside"]);
import { type CitedDocumentLine, FAMILY_FORM_BY_CHANNEL, FORM_SETUP, GENDER_FACT, LMIA_FORM_RULES, MINOR_FACT, SP_FORM_RULES, VV_FORM_RULES } from "./form-setup.ts";
export { FAMILY_FORM_BY_CHANNEL, FORM_SETUP, GENDER_FACT, LMIA_FORM_RULES, MINOR_FACT, SP_FORM_RULES, VV_FORM_RULES }; // B71: kept for the callers that read them from here
/** QA-144 slice 1 (ruling 2): a form field no saved answer proposed is filled by hand, never "not a fact". */
export const BY_HAND_REASON = "Not proposed by the saved AI answer, so it is filled by hand on the PDF until a person maps it on this form's field map (sample loader rule, QA-144; Sample)";
/** C10.1 row 1 (X9a): the off-list file the configured checkpoint uploads (Sample): IMM 5257's previous edition (the
 *  official-sources/ircc manifest's previous-editions/imm5257e-pre-2023.pdf, P-32), saved again so its checksum is on no
 *  list; its IRCC page on canada.ca. Not IMM 5476 2021 since QA-207: row 17 makes that the library's edition. */
export const OFF_LIST_COPY = { official: "previous-editions/imm5257e-pre-2023.pdf", name: "imm5257e-pre-2023-from-email.pdf", page: "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/imm5257.html", library: "IMM 5257 (09-2023)" };
/** C10.1 row 17 (QA-207, tech lead's ruling (a), 4 Nov): the library uses IMM 5476's 2021 edition on every combination
 *  that files it, and the current edition arrives as a new edition, held, so C9.1's comparison and impact can be reached
 *  on the demo data. Only once a saved field map of the 2021 edition is recorded (the paid runner's): without it the
 *  2021 edition would leave IMM 5476 unmapped and QA-180's rule refuses the releases. The current edition, cited (P-170):
 *  canada.ca "Use of a Representative Form (IMM 5476)" (official-sources/ircc/web-pages/page-imm5476.html, modified
 *  2025-12-12, saved 19 Oct 2026): "A new version of this form is available (11-2025). Make sure you are using the most
 *  recent version." The 2021 file is IRCC's own, from the web archive (manifest: imm5476e-2021.pdf). */
export const ROW17 = { previous: "imm5476e-2021.pdf", previousInventory: "prototype/p1/inventory/imm5476e-2021.inventory.json", current: "imm5476e.pdf", previousLabel: "IMM 5476 (11-2021)", currentLabel: "IMM 5476 (11-2025)" };

const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
/** C10.1: one DEMO.md row of the configured checkpoint, as the Demo menu shows it. */
export type CheckpointRow = { row: string; title: string; status: "done" | "partial" | "waiting" | "not built yet" | "out"; shows: string; why: string | null };
/** How many proposals a field-map step reported (its detail counts). */
const counted = (detail: unknown) => (detail as { counts?: { proposed_fields?: number } } | null)?.counts?.proposed_fields ?? 0;
const RELEASE = join(PROTOTYPE, "p3", "releases", "c1-v3");
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

/** The sample programs (Screen 01): an import file, not constants in code (STANDARDS §3.1). Seven Individual and four
 *  Corporate programs covering the kinds of case in domain/TAXONOMY.md; names are illustrative and shown as Sample.
 *  Rows with a "setup" block get their combination and official files through the normal upload path; one of them
 *  starts from the reviewed work-permit release. Everything else shows as Not started. */
export const SAMPLES = join(STUDIO, "samples", "programs.json");
/** C6.4 (tech lead on #1073, Q1 option 1): conditional document lines per combination, with the facts their conditions read
 *  (Sample, cited word for word, Unconfirmed: expert). Data, not code (P-319). */
export const CONDITIONAL_DOCUMENTS = join(STUDIO, "samples", "conditional-documents.json");
type ConditionalDocuments = { lines: { type: string; who: string; condition: unknown; conditionPlain: string; sourceQuote: string; sourceFile: string }[]; facts: { fact: string; label: string; meaning: string; values: string[]; question: string; beside: string[] }[] };
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

@Injectable()
export class Demo {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Workspace) private readonly ws: Workspace, @Inject(Audit) private readonly audit: Audit, @Inject(Studio) private readonly studio: Studio, @Inject(Sources) private readonly sources: Sources, @Inject(Ai) private readonly ai: Ai, @Inject(Programs) private readonly programs: Programs, @Inject(Intake) private readonly intake: Intake, @Inject(Finder) private readonly finder: Finder, @Inject(Screen02) private readonly library: Screen02, @Inject(FormMasters) private readonly masters: FormMasters, @Inject(Forms) private readonly forms: Forms, @Inject(RuleFacts) private readonly ruleFacts: RuleFacts, @Inject(FormLibrary) private readonly formLibrary: FormLibrary, @Inject(ReviewProposals) private readonly proposals: ReviewProposals, @Inject(Runtime) private readonly runtime: Runtime, @Inject(CaseForms) private readonly caseForms: CaseForms, @Inject(Checklists) private readonly checklists: Checklists) {}
  /** B52: the form-field step a person takes on To review › Form fields, as the same service (no extra provider). */
  private get ownQuestions() { return new OwnQuestions(this.db, this.audit); }

  /** QA-144: the family information form a combination of FORM_SETUP files, by its application form's channel. */
  private async familyForm(combinationId: string, key: string | undefined) {
    const setup = FORM_SETUP[key ?? ""];
    if (!setup) return null;
    const filed = (await this.db.combinationForm.findFirst({ where: { combinationId, lineageKey: setup.application }, orderBy: { version: "desc" }, select: { channel: true } }))?.channel;
    return FAMILY_FORM_BY_CHANNEL[filed === "ONLINE" ? "online" : "paper"];
  }

  async status() {
    const workspaceId = await this.ws.id();
    // loaded: the sample inputs are in this workspace; programsExist: something blocks loading them (QA-12).
    const [sample, programs] = await Promise.all([this.db.auditEvent.count({ where: { workspaceId, action: "loaded", entity: "sample inputs" } }), this.db.programDef.count({ where: { workspaceId } })]);
    // programsExist: any name in the Structure, Pathways included (W1-03: a read or a reset creates none).
    return { loaded: sample > 0, programsExist: programs > 0, scope: await this.scope(workspaceId), preserved: this.preserved() };
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
    await this.db.configRelease.create({ data: { workspaceId, combinationId, version: 1, status: "RELEASED", snapshot: snapshot as any, sha256, packVersionId: pack.id, summary: { imported_from: "p3/releases/c1-v3", c1_v3_sha256: rel.configuration_sha256, drafting_runs: rel.drafting_run_ids, counts }, authorId: rel.author.user_id, submitterId: rel.submitter.user_id, approverId: rel.approver.user_id, basis: "Imported reviewed release: AI-drafted under the guarded path, reviewed and approved by a second person. Prototype only; not specialist-confirmed." } });
    for (const a of await this.db.sourceAttachment.findMany({ where: { combinationId, status: { in: ["READ", "RECOGNISED"] } } })) await this.db.sourceAttachment.update({ where: { id: a.id }, data: { status: "IN_LIBRARY", statusDetail: `${a.edition}: its field map from the reviewed release is in the library.` } });
    return counts;
  }

  /** G5 (#868, Lead 8's option 1 for the Study permit): document lines from an official checklist's own words, each cited
   *  with its page and quote (P-170), through the Documents route as the author. A `reuse` line takes the library's
   *  type of that name (a draft one too: the Visitor visa's types publish with its release) (refused in words if there is none); a new one waits as a proposal the content reviewer accepts, and the Approver approves its ADD (BR-7). */
  private async citedDocumentLines(author: Actor, reviewer: Actor, workspaceId: string, combinationId: string, lines: CitedDocumentLine[], refused: string[], say: (e: unknown) => string) {
    let n = 0;
    for (const l of lines) {
      const line = { attachMode: "COMBINATION_MANDATORY" as const, appliesToRoles: l.who, providedBy: "client", sourceQuote: l.quote };
      try {
        if (l.reuse) {
          const t = await this.db.documentType.findFirst({ where: { workspaceId, name: l.type, status: { in: ["DRAFT", "PUBLISHED"] } }, orderBy: { version: "desc" }, select: { documentTypeKey: true } });
          if (!t) { refused.push(`${l.type}: the library has no type of that name to reuse`); continue; }
          await this.studio.saveRequirement(author, combinationId, null, { ...line, documentTypeKey: t.documentTypeKey } as Parameters<Studio["saveRequirement"]>[3]);
          n++; continue;
        }
        const r = (await this.studio.saveRequirement(author, combinationId, null, { ...line, documentTypeName: l.type } as Parameters<Studio["saveRequirement"]>[3])) as { proposalId?: string } | null;
        if (r && r.proposalId) {
          const key = ((await decide(this.db, this.audit, reviewer, workspaceId, [r.proposalId], { action: "accept", reason: "Accepted by the sample loader: a document the official checklist asks for, cited (Sample, Unconfirmed: expert)." })).items[0] as { landedAs?: string } | undefined)?.landedAs;
          if (!key) { refused.push(`${l.type}: its document type was not accepted`); continue; }
          await this.studio.saveRequirement(author, combinationId, null, { ...line, documentTypeKey: key } as Parameters<Studio["saveRequirement"]>[3]);
        }
        n++;
      } catch (e) { refused.push(`${l.type}: ${say(e)}`); }
    }
    return n;
  }

  /** G5 (C5.1, P-248; tech lead's ruling on #868, option 1 for the Visitor visa): a combination's document lines from its
   *  official document checklist (`checklist`, a source the six load), through C2.6: the saved AI reading of that
   *  edition is replayed (US$0) into proposals on To review, and the author decides each one there. A line IRCC always
   *  asks for, or whose condition reads only facts this library holds and asks, is accepted (its new type lands with it
   *  and waits for the Approver, BR-7); any other is rejected with its reason, so the release never carries a line that
   *  cannot work yet, and a type left without a line is rejected too. Sample, from the official checklist, with quotes. */
  private async checklistDocumentLines(author: Actor, workspaceId: string, combinationId: string, checklist: string, refused: string[], say: (e: unknown) => string) {
    const rejected: string[] = [];
    const att = await this.db.sourceAttachment.findFirst({ where: { combinationId, kind: "Document checklist", recognised: true, edition: { startsWith: `${checklist} (` } }, select: { id: true } });
    if (!att) { refused.push(`${checklist}: not among this combination's sources, so no document line was drafted from it`); return { n: 0, rejected }; }
    let job: { id: string };
    try { job = await this.checklists.draft(author, att.id, { mode: "replay" }); } catch (e) { refused.push(`${checklist}: ${say(e)}`); return { n: 0, rejected }; }
    const factsOf = (x: unknown, out = new Set<string>()): Set<string> => { if (Array.isArray(x)) x.forEach((v) => factsOf(v, out)); else if (x && typeof x === "object") for (const [k, v] of Object.entries(x)) { if (k === "field" && typeof v === "string") out.add(v); else factsOf(v, out); } return out; };
    const asked = new Set((await this.db.sectionQuestion.findMany({ where: { workspaceId, status: { in: ["DRAFT", "PUBLISHED"] } }, select: { canonicalFieldKey: true } })).map((q) => q.canonicalFieldKey));
    const inLibrary = new Set((await this.db.canonicalField.findMany({ where: { workspaceId, status: { not: "RETIRED" } }, select: { canonicalFieldKey: true } })).map((f) => f.canonicalFieldKey));
    const reject = async (id: string, label: string, why: string) => {
      try { await decide(this.db, this.audit, author, workspaceId, [id], { action: "reject", reason: why.slice(0, 480) }); rejected.push(`${label} (${why})`); } catch (e) { refused.push(`${label}: ${say(e)}`); }
    };
    let n = 0;
    const lines = await this.db.proposalItem.findMany({ where: { runId: job.id, kind: "requirement_line", status: "waiting" }, orderBy: [{ createdAt: "asc" }, { identityKey: "asc" }], select: { id: true, payload: true, work: true } });
    for (const l of lines) {
      const p = l.payload as { always?: boolean; condition?: { tree?: unknown } | null }, label = String((l.work as { label?: unknown } | null)?.label ?? "a document line");
      const missing = p.always ? [] : [...factsOf(p.condition?.tree)].filter((f) => !inLibrary.has(f) || !asked.has(f));
      if (!p.always && !p.condition?.tree) { await reject(l.id, label, `${checklist} leaves it to the visa office and gives no condition: a person adds it by hand on Documents if needed`); continue; }
      if (missing.length) { await reject(l.id, label, `its condition reads ${missing.join(", ")}, which this library does not hold and ask yet`); continue; }
      try { await decide(this.db, this.audit, author, workspaceId, [l.id], { action: "accept", reason: `Accepted by the sample loader: a document line ${checklist} asks for, in its own words (Sample; P-248).` }); n++; } catch (e) { await reject(l.id, label, `not accepted: ${say(e)}`); }
    }
    for (const t of await this.db.proposalItem.findMany({ where: { runId: job.id, kind: "document_type", status: "waiting" }, select: { id: true, payload: true } }))
      await reject(t.id, String((t.payload as { name?: unknown }).name ?? "a document type"), "no accepted line uses it");
    return { n, rejected };
  }

  /** C6.4 (tech lead on #1073, Q1 option 1): a combination's conditional document lines and the facts they read
   *  (samples/conditional-documents.json), through the services the screens call, as acceptance/lib/setup_vv_m3.ts S6
   *  and S6a do by route. Each line on Documents as the author (Configuration › Documents); a type the library lacks waits
   *  as a proposal the content reviewer accepts (C3.6). Then each fact a line reads is added for that line's rule with its
   *  answer values (Questionnaires › "Facts a rule needs"), accepted by the content reviewer and approved into the library
   *  by the Approver, and asked per person beside the fact it is about (Library › Fields › placement). A step a rule
   *  refuses is named in `refused`, never dropped. Returns how many lines went in. */
  private async conditionalDocumentLines(author: Actor, reviewer: Actor, approver: Actor, workspaceId: string, combinationId: string, spec: ConditionalDocuments, parts: Awaited<ReturnType<typeof placeFromFormParts>>, placed: string[], refused: string[], say: (e: unknown) => string) {
    type Save = Parameters<Studio["saveRequirement"]>[3];
    let n = 0;
    // A line goes in only when each fact its condition reads is in the library, is a calculated fact, or is one this step
    // adds; otherwise the release would be refused ("reads …, which is not in the library"), so the line waits and is named.
    const factsOf = (x: unknown, out = new Set<string>()): Set<string> => { if (Array.isArray(x)) x.forEach((v) => factsOf(v, out)); else if (x && typeof x === "object") for (const [k, v] of Object.entries(x)) { if (k === "field" && typeof v === "string") out.add(v); else factsOf(v, out); } return out; };
    const known = new Set([...(await this.db.canonicalField.findMany({ where: { workspaceId, status: { in: ["DRAFT", "PUBLISHED"] } }, select: { canonicalFieldKey: true } })).map((f) => f.canonicalFieldKey),
      ...(await this.db.derivedField.findMany({ where: { workspaceId }, select: { derivedKey: true } })).map((d) => d.derivedKey), ...spec.facts.map((f) => f.fact)]);
    const waiting: string[] = [];
    for (const l of spec.lines) {
      const missing = [...factsOf(l.condition)].filter((f) => !known.has(f));
      if (missing.length) { waiting.push(`${l.type} (its condition reads ${missing.join(", ")}, which this library neither holds nor calculates)`); continue; }
      const line = { attachMode: "ANSWER_CONDITIONAL" as const, appliesToRoles: l.who, providedBy: "client", condition: l.condition, conditionPlain: l.conditionPlain, sourceQuote: l.sourceQuote, sourceFile: l.sourceFile };
      try {
        const r = (await this.studio.saveRequirement(author, combinationId, null, { ...line, documentTypeName: l.type } as Save)) as { proposalId?: string } | null;
        if (r && r.proposalId) {
          const key = ((await decide(this.db, this.audit, reviewer, workspaceId, [r.proposalId], { action: "accept", reason: "Accepted by the sample loader: a document line the official words call for, cited (Sample, Unconfirmed: expert; C6.4)." })).items[0] as { landedAs?: string } | undefined)?.landedAs;
          if (!key) { refused.push(`${l.type}: its document type was not accepted`); continue; }
          await this.studio.saveRequirement(author, combinationId, null, { ...line, documentTypeKey: key } as Save);
        }
        n++;
      } catch (e) { refused.push(`${l.type}: ${say(e)}`); }
    }
    if (waiting.length) refused.push(`${waiting.length} conditional document line${waiting.length === 1 ? " waits" : "s wait"}: ${waiting.join("; ")}`);
    if (!n) return n; // no line reads the facts, so they are not added (C3.6 adds a fact only for a rule that reads it)
    const needed = (await this.ruleFacts.list(combinationId)).facts;
    for (const f of spec.facts) {
      try {
        if (!(await this.db.canonicalField.count({ where: { workspaceId, canonicalFieldKey: f.fact, status: { in: ["DRAFT", "PUBLISHED"] } } }))) {
          const rule = needed.find((x) => x.fact === f.fact)?.rules[0]?.key;
          if (!rule) { refused.push(`${f.fact}: no rule on this combination reads it, so it is not added`); continue; }
          const { proposalId } = await this.ruleFacts.add(author, combinationId, { fact: f.fact, rule, label: f.label, meaning: f.meaning, valueType: "code", values: f.values });
          await decide(this.db, this.audit, reviewer, workspaceId, [proposalId], { action: "accept", reason: "Accepted by the sample loader: the fact a document line reads, with its answer values (Sample; C6.4)." });
          for (const ch of await this.db.libraryChange.findMany({ where: { workspaceId, status: "WAITING", kind: "field", key: f.fact }, select: { id: true } }))
            await this.library.decideLibraryChange(approver, ch.id, "approve", "Approved by the sample loader as the second person (C6.4, a fact a document line reads).");
        }
        // A fact another combination asked already keeps its one placement (QA-227: the library's questions are shared).
        if (await this.db.sectionQuestion.count({ where: { workspaceId, canonicalFieldKey: f.fact, status: { not: "RETIRED" } } })) continue;
        const near = await this.db.sectionQuestion.findMany({ where: { workspaceId, canonicalFieldKey: { in: f.beside } }, select: { canonicalFieldKey: true, sectionKey: true } });
        const beside = f.beside.map((k) => near.find((x) => x.canonicalFieldKey === k)).find(Boolean);
        if (!beside) { refused.push(`${f.fact}: none of ${f.beside.join(", ")} is asked in a section`); continue; }
        await this.studio.placeField(author, f.fact, { sectionKey: beside.sectionKey, collectedFrom: "client_questionnaire", repeats: "per_person", tier: "case", questionText: f.question });
        placed.push(f.fact);
        await keepChosenEveryones(this.db, this.studio, author, combinationId, new Set([beside.sectionKey]), parts);
      } catch (e) { refused.push(`${f.fact}: ${say(e)}`); }
    }
    // A line whose fact did not reach the library is taken back, so the release is never refused over it (break m6).
    const inLib = new Set((await this.db.canonicalField.findMany({ where: { workspaceId, canonicalFieldKey: { in: spec.facts.map((f) => f.fact) }, status: { in: ["DRAFT", "PUBLISHED"] } }, select: { canonicalFieldKey: true } })).map((f) => f.canonicalFieldKey));
    const lost = spec.facts.map((f) => f.fact).filter((f) => !inLib.has(f));
    if (lost.length) {
      for (const r of await this.db.documentRequirement.findMany({ where: { combinationId, status: { in: ["DRAFT", "PUBLISHED"] } }, select: { lineageKey: true, predicateJson: true } })) {
        if (![...factsOf(r.predicateJson)].some((f) => lost.includes(f))) continue;
        try { await this.studio.saveRequirement(author, combinationId, r.lineageKey, { retire: true } as Save); n--; refused.push(`${r.lineageKey}: taken back, its condition reads ${lost.join(", ")}, which did not reach the library`); }
        catch (e) { refused.push(`${r.lineageKey}: ${say(e)}`); }
      }
    }
    return n;
  }

  /** G5 (C5.1, P-248; tech lead's ruling on #868, option 1): the configured checkpoint's With an LMIA gets its document
   *  lines from the reviewed work-permit release (p3/releases/c1-v3), the lines Demo › "Start With an LMIA from its
   *  reviewed release" loads: every line the release did not dismiss, less the QA-115 lines an LMIA job cannot have
   *  (samples/programs.json, wp.family's drop_documents, each with its why). Each goes in through the Documents route as
   *  the author, with the release's own condition and source quote; a type the library lacks waits as a proposal that
   *  the content reviewer accepts (C3.6), and the Approver approves its library ADD with the others (BR-7). Sample, as
   *  the release is. Returns how many lines went in and the conditional ones left waiting for their facts (named in the
   *  load's log); a refused line is named in `refused`, never dropped silently. */
  private async reviewedDocumentLines(author: Actor, reviewer: Actor, workspaceId: string, combinationId: string, refused: string[], say: (e: unknown) => string) {
    type Line = { document_type: string; status: string; who: string; provided_by?: string | null; condition?: unknown; condition_plain?: string | null; source_quote?: string | null };
    const config = JSON.parse(readFileSync(join(RELEASE, "configuration.json"), "utf8")) as { document_requirements: Line[] };
    const dropOf = (x: unknown): { document_type: string }[] | null => {
      if (Array.isArray(x)) { for (const v of x) { const r = dropOf(v); if (r) return r; } return null; }
      if (x && typeof x === "object") { const o = x as Record<string, unknown>; if (o.key === "wp.family" && Array.isArray(o.drop_documents)) return o.drop_documents as { document_type: string }[]; for (const v of Object.values(o)) { const r = dropOf(v); if (r) return r; } }
      return null;
    };
    const drop = new Set((dropOf(JSON.parse(readFileSync(SAMPLES, "utf8"))) ?? []).map((d) => d.document_type));
    // A condition reads facts; a line comes over only when each fact it reads is in this library and asked in a section
    // (else the release would hold on "not in the library" or "asked of nobody"). The others are left out and named:
    // they wait for their facts (checkpoint row 7 and the questionnaire work), never written half-working.
    const factsOf = (x: unknown, out = new Set<string>()): Set<string> => { if (Array.isArray(x)) x.forEach((v) => factsOf(v, out)); else if (x && typeof x === "object") for (const [k, v] of Object.entries(x)) { if (k === "field" && typeof v === "string") out.add(v); else factsOf(v, out); } return out; };
    const asked = new Set((await this.db.sectionQuestion.findMany({ where: { workspaceId, status: { in: ["DRAFT", "PUBLISHED"] } }, select: { canonicalFieldKey: true } })).map((q) => q.canonicalFieldKey));
    const inLibrary = new Set((await this.db.canonicalField.findMany({ where: { workspaceId, status: { not: "RETIRED" } }, select: { canonicalFieldKey: true } })).map((f) => f.canonicalFieldKey));
    let n = 0;
    const waiting: string[] = [];
    for (const d of config.document_requirements.filter((x) => x.status !== "dismissed" && !drop.has(x.document_type))) {
      const missing = [...factsOf(d.condition)].filter((f) => !inLibrary.has(f) || !asked.has(f));
      if (missing.length) { waiting.push(`${d.document_type} (its condition reads ${missing.join(", ")})`); continue; }
      const line = { attachMode: (d.condition ? "ANSWER_CONDITIONAL" : "COMBINATION_MANDATORY") as "ANSWER_CONDITIONAL" | "COMBINATION_MANDATORY", appliesToRoles: d.who, providedBy: d.provided_by ?? "client",
        ...(d.source_quote ? { sourceQuote: d.source_quote } : {}), ...(d.condition ? { condition: d.condition, conditionPlain: d.condition_plain ?? undefined } : {}) };
      try {
        const r = (await this.studio.saveRequirement(author, combinationId, null, { ...line, documentTypeName: d.document_type } as Parameters<Studio["saveRequirement"]>[3])) as { proposalId?: string } | null;
        if (r && r.proposalId) {
          const key = ((await decide(this.db, this.audit, reviewer, workspaceId, [r.proposalId], { action: "accept", reason: "Accepted by the sample loader: a document line of the reviewed work-permit release c1-v3 (Sample)." })).items[0] as { landedAs?: string } | undefined)?.landedAs;
          if (!key) { refused.push(`${d.document_type}: its document type was not accepted`); continue; }
          await this.studio.saveRequirement(author, combinationId, null, { ...line, documentTypeKey: key } as Parameters<Studio["saveRequirement"]>[3]);
        }
        n++;
      } catch (e) { refused.push(`${d.document_type}: ${say(e)}`); }
    }
    return { n, waiting };
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
      // QA-207: the configured checkpoint may file another edition of a form (ROW17), by its own official file.
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
  /** C10.1 row 1 (X9a): an off-list copy of IMM 5257's previous edition, as a person would have saved it from an email (its
   *  bytes differ from the official file, so its checksum is on no approved list; Sample). The author uploads it on the
   *  Visitor visa (held for source verification), records the IRCC page it came from, and the approver, a second person,
   *  compares and approves it on the intake's own route (P-80). The library holds IMM 5257 (09-2023), not the older
   *  edition, so the copy is not a duplicate (review-3 Major 1). Once approved it goes through the intake again: an edition older than the
   *  library's is set aside by the Approver, never used, which the row says. */
  private async heldFileApproved(author: Actor, approver: Actor, workspaceId: string): Promise<{ ok: true; shows: string } | { ok: false; why: string }> {
    const vv = await this.db.combination.findFirst({ where: { workspaceId, combinationKey: "vv.single" }, select: { id: true } });
    if (!vv) return { ok: false, why: "The Visitor visa combination is not in the sample, so the off-list copy has nowhere to be uploaded." };
    const copy = Buffer.concat([readFileSync(join(OFFICIAL, OFF_LIST_COPY.official)), Buffer.from("\n% Sample: a copy saved from an email (C10.1 row 1, X9a)\n")]);
    const up = (await this.intake.intake(author, [{ originalname: OFF_LIST_COPY.name, buffer: copy }], vv.id)).results[0];
    const item = await this.db.intakeItem.findFirst({ where: { workspaceId, sha256: up.sha256 ?? "", status: "HELD", outcome: "held" } });
    if (!item) return { ok: false, why: `The off-list copy of IMM 5257's previous edition was not held for a source check: ${up.message}` };
    await this.intake.recordPage(author, item.id, { irccPage: OFF_LIST_COPY.page });
    const done = await this.intake.decideHeld(approver, item.id, "approve", { note: "Sample: compared with the IRCC page", irccPage: OFF_LIST_COPY.page });
    // Review m2 (f7): the re-intake holds it as an older edition; the Approver sets it aside with that reason, so nothing is
    // left waiting on To review (a second person may set aside an older edition: Intake.heldFile anyHold).
    let after = done.result ? ` Then the intake: ${done.result.message}` : "";
    if (done.result?.outcome === "older_edition_held") {
      const older = await this.db.intakeItem.findFirst({ where: { workspaceId, sha256: item.sha256, status: "HELD", outcome: "older_edition_held" }, select: { id: true } });
      // #300 n2: say "set it aside" only when there was a held row to set aside.
      if (older) await this.intake.decideHeld(approver, older.id, "reject", { note: `Sample: older than the library's ${OFF_LIST_COPY.library}, so it is not used.` });
      after = older ? ` Then the intake found it older than the library's ${OFF_LIST_COPY.library}, and ${approver.name} set it aside: not used.` : ` Then the intake found it older than the library's ${OFF_LIST_COPY.library}: not used.`;
    }
    return { ok: true, shows: `an off-list copy of ${item.editionLabel ?? "IMM 5257's previous edition"} (${OFF_LIST_COPY.name}) held for a source check, its IRCC page recorded by ${author.name}, approved by ${approver.name}.${after}` };
  }

  private async loadConfigured(actor: Actor, workspaceId: string, t0: number, log: string[]) {
    // Row 17 (QA-207): IMM 5476 2021 in the library only when its saved field map is recorded (see ROW17).
    // The same reading as the six's replay (ai.ts plan: the job id and the inventory's checksum), so a map recorded for
    // an older reading of the 2021 file never swaps the edition in (review m1).
    const inv2021 = join(SOLUTION, ROW17.previousInventory);
    const row17 = existsSync(inv2021) && this.sources.savedRuns(this.sources.jobIdFor(ROW17.previous), createHash("sha256").update(readFileSync(inv2021)).digest("hex")).some((r) => r.valid);
    const six = await this.loadSix(actor, workspaceId, t0, log, row17 ? { swap: { [ROW17.current]: ROW17.previous } } : {});
    const person = (id: string) => ACTORS.find((a) => a.id === id)!;
    const author = person("user-A"), sme = person("user-C"), approver = person("user-B");
    const timings: Record<string, number> = { ...six.timings };
    const timed = async <T>(step: string, f: () => Promise<T>): Promise<T> => { const t = Date.now(); try { return await f(); } finally { timings[step] = Math.round(((timings[step] ?? 0) + (Date.now() - t) / 1000) * 10) / 10; } };
    const said = (e: unknown) => { const r = e instanceof HttpException ? (e.getResponse() as { detail?: string; message?: string | string[] }) : null; return String((r && typeof r === "object" ? r.detail ?? [r.message].flat().join("; ") : null) ?? (e as Error).message).slice(0, 400); };
    const rows: CheckpointRow[] = [];
    const row = (r: CheckpointRow) => { rows.push(r); log.push(`  row ${r.row} ${r.title}: ${r.status}${r.why ? ` (${r.why.slice(0, 200)})` : ""}`); };
    log.push("configured checkpoint (C10.1): each DEMO.md row through the screens' services");
    const keyOf0 = new Map((await this.db.combination.findMany({ where: { workspaceId }, select: { id: true, combinationKey: true } })).map((x) => [x.id, x.combinationKey]));

    // Row 1: every official file through the intake (the six load), then one off-list file with a readable edition, held
    // and approved by a second person through the intake's own steps (X9a; the forms lane's demo story does the same).
    const files = six.combinations.reduce((t, c) => t + c.files, 0);
    // Only a file held because its edition could not be read (outcome "held"); a new edition held for row 17 is another
    // kind of held file, said on row 17 (QA-207 review m5).
    const unread = await this.db.intakeItem.findMany({ where: { workspaceId, status: "HELD", outcome: "held" }, select: { fileName: true } });
    const offList = await timed("held file approved by a second person", () => this.heldFileApproved(author, approver, workspaceId).catch((e) => ({ ok: false as const, why: said(e) })));
    const unreadWords = unread.length ? ` ${unread.length} official file${unread.length === 1 ? " stays" : "s stay"} held because the form's edition could not be read from the file (${unread.map((h) => h.fileName).join(", ")}): such a file cannot become a source.` : "";
    row({ row: "1", title: "Ingest PDF forms; a held file approved by a second person", status: offList.ok ? "done" : "partial",
      shows: `${files} official files read on the six combinations (code, edition, checksum; no AI)${offList.ok ? `; ${offList.shows}` : ""}`,
      why: offList.ok ? (unreadWords.trim() || null) : `${offList.why}${unreadWords}` });
    row({ row: "2", title: "Online forms captured with the browser extension", status: "out", shows: "Parked (P-102, W6)", why: null });

    // QA-144 slice 1 (#840): the Visitor visa's IRM 0002 line has no file in the sample. The author attaches the library's
    // official file to it, the form is read, and its saved AI field-map answer (a draft and a blind checker round, #840)
    // replays through the review queue at US$0, so rows 3–4 decide and apply it with the others. Nothing runs live.
    const vvId = six.combinations.find((c) => keyOf0.get(c.id) === "vv.single")?.id;
    let irmWhy: string | null = null; // review m4: a failed attach is said on row 3, never only logged
    if (vvId) await timed("IRM 0002 attached and its saved answer replayed", async () => {
      const r = await this.intake.sample(author, vvId, "irm0002e.pdf");
      if (!r.attachmentId) { irmWhy = `IRM 0002 was not attached to the Visitor visa: ${r.message}`; log.push(`  ${irmWhy}`); return; }
      if (r.attachmentStatus === "RECOGNISED") await this.sources.read(author, r.attachmentId);
      const plan = await this.ai.plan({ kind: "source", ids: [r.attachmentId] }, "REPLAY");
      if (!plan.targets.some((t) => t.action === "reuse_saved_output")) { irmWhy = `IRM 0002's saved AI answer does not replay (${plan.targets.map((t) => t.why ?? t.action).join("; ").slice(0, 200)})`; log.push(`  ${irmWhy}`); return; }
      const b = await this.ai.launch(author, { scope: { kind: "source", ids: [r.attachmentId] }, mode: "REPLAY", idempotencyKey: `configured-irm0002-${workspaceId}`, planSha256: plan.plan_sha256 });
      await this.settled(b.id!);
    });

    // Rows 3–4: the replayed field-map drafts, decided by the author on each draft's own page, then applied to the draft.
    const jobs = await this.db.draftingJob.findMany({ where: { workspaceId, kind: "field_map", status: "COMPLETED" }, orderBy: { startedAt: "asc" } });
    const fileOf = new Map((await this.db.sourceAttachment.findMany({ where: { workspaceId }, select: { id: true, fileName: true } })).map((x) => [x.id, x.fileName]));
    let accepted = 0, edited = 0, returned = 0, applied = 0;
    const refused: string[] = [];
    // One edit and one return stay visible (DEMO.md row 4), on the form with the most proposals.
    const showcase = [...jobs].sort((a, b) => counted(b.detail) - counted(a.detail))[0]?.id;
    for (const j of jobs) {
      const form = fileOf.get(j.attachmentId ?? "") ?? "a form";
      try {
        await timed("field-map review and apply", async () => {
          // A draft compared with an older library is compared again first (D280), as its page asks a person to.
          const at = (j.detail as { library_revision?: { sha256?: string } } | null)?.library_revision?.sha256;
          if (at && at !== (await libraryRevision(this.db, workspaceId)).sha256) await this.sources.recompare(author, j.id);
          const items = await this.db.proposalItem.findMany({ where: { runId: j.id, status: "waiting" }, orderBy: { identityKey: "asc" } });
          for (const [n, it] of items.entries()) {
            const meaning = (it.payload as { meaning?: string }).meaning ?? "";
            if (j.id === showcase && n === 0) { await this.sources.decide(author, j.id, it.id, { decision: "RETURNED", note: "Returned by the sample loader to show a return: decide it again on this form's page." }); returned++; }
            else if (j.id === showcase && n === 1 && meaning.length >= 8) { await this.sources.decide(author, j.id, it.id, { decision: "ACCEPTED", meaning: `${meaning.replace(/\.?\s*$/, "")} (as asked on ${form}).`.slice(0, 500), note: "Edited by the sample loader: the meaning names the form it was read from." }); edited++; }
            else { await this.sources.decide(author, j.id, it.id, { decision: "ACCEPTED", note: "Accepted by the sample loader as the saved AI answer proposed it; check it on this form's page." }); accepted++; }
          }
          await this.sources.apply(author, j.id, {});
          applied++;
        });
      } catch (e) { refused.push(`${form}: ${said(e)}`); }
    }
    const waitingForAi = six.drafts.waiting_for_draft_with_ai;
    row({ row: "3", title: "AI maps form fields to shared fields (saved answers, US$0)", status: !jobs.length ? "waiting" : waitingForAi.length || irmWhy ? "partial" : "done", shows: `${jobs.length} saved AI answers replayed (US$0)`,
      why: [waitingForAi.length ? `${waitingForAi.length} forms have no saved AI answer and wait for Draft with AI, a paid run the founder approves: ${waitingForAi.join(", ")}.` : "", irmWhy ?? ""].filter(Boolean).join(" ") || null });
    // Review m1: the Sample loader also accepts the items where the draft and the checker rounds differ; the row says how many.
    const differ = jobs.length ? await this.db.proposalItem.count({ where: { runId: { in: jobs.map((j) => j.id) }, agreement: "differ", choice: "ACCEPTED" } }) : 0;
    row({ row: "4", title: "A person reviews: accept with a reason, edit, reject", status: !jobs.length ? "waiting" : refused.length ? "partial" : "done", shows: `${accepted} accepted, ${edited} edited, ${returned} returned with a reason; ${applied} of ${jobs.length} drafts applied to their combinations${differ ? `; ${differ} where the two AI rounds differ were accepted by the sample loader (Sample: check them on To review)` : ""}`,
      why: refused.length ? `Refused by a rule: ${refused.join(" · ")}` : null });

    // C11.7 part B: a document type the sample named on a combination's Documents tab (the nomination certificate) is
    // decided on To review › Proposals by the author, as the author decides every replayed proposal (row 4); the author
    // then adds its line, as the Documents tab says ("Once it is accepted, choose it here and save the line"); the new
    // type then waits for the approver, a second person, in row 5 (BR-7, P-80).
    for (const c of six.lines_by_hand) for (const d of c.documents.filter((x) => x.status !== "line added")) {
      const p = await this.db.proposalItem.findFirst({ where: { workspaceId, combinationId: c.combination_id, kind: "document_type", status: "waiting", payload: { path: ["name"], equals: d.name } }, select: { id: true } });
      if (!p) { log.push(`  ${c.combination}: "${d.name}" is not waiting on To review, so its line was not added`); continue; }
      // r2-m2: the two steps are told apart, so an accepted type whose line was refused never reads "stays waiting".
      let key: string | undefined;
      try {
        // r2-m1: decided with a reason, as every proposal of the checkpoint is.
        const r = (await this.proposals.decide(author, { ids: [p.id], action: "accept", reason: `Accepted by the sample loader: ${d.quote}`.slice(0, 300) })) as { items?: { landedAs?: string }[] };
        key = r.items?.[0]?.landedAs;
        if (!key) throw new Error(`accepting "${d.name}" gave no library key`);
      } catch (e) { log.push(`  ${c.combination}: "${d.name}" stays waiting on To review: ${said(e)}`); continue; }
      try {
        await this.studio.saveRequirement(author, c.combination_id, null, { documentTypeKey: key, attachMode: "COMBINATION_MANDATORY", appliesToRoles: d.who, providedBy: "client", sourceQuote: d.quote });
        log.push(`  ${c.combination}: ${author.name} accepted "${d.name}" on To review and added it as a required line; the new type waits for ${approver.name}`);
      } catch (e) { log.push(`  ${c.combination}: "${d.name}" was accepted, but its required line was not added: ${said(e)}`); }
    }

    // Row 7 (QA-144 slice 1): sections from each form's own parts, by the C3.4 rules pass (no AI, US$0), accepted by the
    // author on To review; the approver approves them with the other new items below (row 5).
    const keyOf = keyOf0;
    const fromForms = six.combinations.filter((c) => SET_UP_FROM_FORMS.has(keyOf.get(c.id) ?? ""));
    // sectionsHeld (QA-206): sections the forms print no heading over, left waiting on To review for a person to name.
    const sectionsMade: string[] = [], sectionsReused: string[] = [], sectionsRefused: string[] = [], sectionsHeld: string[] = [];
    let maritalList: string | null = null;
    await timed("sections from the forms' parts (rules)", async () => {
      for (const c of fromForms) {
        // The family information form the channel takes off (FAMILY_FORM_BY_CHANNEL) gives no sections (review m2).
        const notFiled = (await this.familyForm(c.id, keyOf.get(c.id)))?.other ?? null;
        const forms = (await this.db.sourceAttachment.findMany({ where: { combinationId: c.id, kind: "Form" }, orderBy: { createdAt: "asc" }, select: { id: true, fileName: true, edition: true } }))
          .filter((a) => !notFiled || !(a.edition ?? "").startsWith(`${notFiled} (`));
        for (const a of forms) { try { await this.masters.draft(author, a.id, { mode: "rules" }); } catch (e) { sectionsRefused.push(`${a.fileName}: ${said(e)}`); } }
        const runs = (await this.db.draftingJob.findMany({ where: { combinationId: c.id, kind: "masters_edition" }, select: { id: true } })).map((j) => j.id);
        // The sections, and the marital status list IMM 5409's rule reads (ruling 3); the other answer lists stay on To review.
        const take = (await this.db.proposalItem.findMany({ where: { runId: { in: runs }, status: "waiting", kind: { in: ["section", "answer_list"] } }, orderBy: [{ createdAt: "asc" }, { identityKey: "asc" }], select: { id: true, kind: true, payload: true, work: true, reason: true } }))
          .filter((p) => p.kind === "section" || (p.payload as { label?: string }).label === "Marital status");
        // One at a time, as on its own page: a rules item is not Ready, so it is never accepted in a batch.
        for (const p of take) {
          // QA-206 (tech lead on #883; AGENTS rule 4: Sample, never guessed): a section the rules pass holds for a name is
          // named only by print, through the same naming edit a person uses: with the heading that edition prints over it
          // (another part prints it too). With no printed heading it stays waiting on To review and is listed as refused.
          const held = p.kind === "section" ? (p.work as { unnamed?: boolean; heading?: string; printed?: string } | null) : null;
          if (held?.unnamed && !held.heading) { sectionsHeld.push((p.payload as { label?: string }).label ?? "section"); continue; }
          try {
            const landed = (await decide(this.db, this.audit, author, workspaceId, [p.id], held?.unnamed
              ? { action: "edit", payload: { ...(p.payload as object), label: held.heading }, reason: `Named by the sample loader from the heading the form prints over it, "${held.printed ?? held.heading}" (Sample); rename it on Shared library if a person words it better.` }
              : { action: "accept", reason: "Accepted by the sample loader: drafted from the form's own parts (rules, US$0); rename it on Shared library if a person words it better." })).items[0] as { landedAs?: string } | undefined;
            if (p.kind === "section") sectionsMade.push(landed?.landedAs ?? ""); else maritalList ??= landed?.landedAs ?? null;
          } catch (e) {
            // The card's own words: a section the library already holds is rejected here and that section reused (the
            // placement step reads its boxes into it).
            const same = /already in the library as (\S+?)[ )]/.exec(said(e))?.[1];
            if (!same) { sectionsRefused.push(`${(p.payload as { label?: string }).label ?? p.kind}: ${said(e)}`); continue; }
            await decide(this.db, this.audit, author, workspaceId, [p.id], { action: "reject", reason: `The library already holds this ${p.kind === "section" ? "section" : "list"} (${same}): reused, not added again.` });
            if (p.kind === "section") sectionsReused.push(same);
          }
        }
      }
    });

    // Row 5: every new library item waits for a second person (BR-7); the approver approves them on To review.
    const adds = await this.db.libraryChange.findMany({ where: { workspaceId, status: "WAITING" }, select: { id: true, label: true, key: true } });
    const notApproved: string[] = [];
    await timed("library approvals (second person)", async () => {
      for (const c of adds) { try { await this.library.decideLibraryChange(approver, c.id, "approve", "Approved by the sample loader as the second person (C10.1 checkpoint)."); } catch (e) { notApproved.push(`${c.label ?? c.key}: ${said(e)}`); } }
    });
    row({ row: "5", title: "New shared fields approved by a second person", status: !adds.length ? "waiting" : notApproved.length ? "partial" : "done", shows: `${adds.length - notApproved.length} of ${adds.length} new library items approved by the ${approver.name}, not by the author`,
      why: notApproved.length ? notApproved.slice(0, 3).join(" · ") : adds.length ? null : "No new library item: no draft was applied." });
    row({ row: "6", title: "Reset returns to a blank workspace", status: "done", shows: "Demo › Reset demo", why: null });

    // QA-144 slice 1, after the second person's approval: each needed fact placed in the section of its form box (the
    // shared rules step), each form field no saved answer proposed filled by hand (ruling 2), each form line set by IRCC's
    // words (ruling 3). All as the author, through the screens' own services.
    const placedFacts: string[] = [], setUpRefused: string[] = [], unchosen: string[] = [];
    let byHand = 0, lines = 0, documentLines = 0;
    await timed("questions, form fields and form rules (rules)", async () => {
      for (const c of fromForms) {
        // The form lines first: a form whose rule is in words only is not read by the coverage check, so its facts would
        // be missed by the placement step.
        const setup = FORM_SETUP[keyOf.get(c.id) ?? ""];
        if (setup) {
          // A form IRCC's words name for the combination with no line yet is added from the Form library, as the Forms
          // tab's "add one from the Form library" does (QA-144 slice 2: With an LMIA's IMM 5707, 5409, 5476 and 5475).
          const family = (await this.familyForm(c.id, keyOf.get(c.id)))!;
          const has = new Set((await this.db.combinationForm.findMany({ where: { combinationId: c.id }, select: { lineageKey: true } })).map((x) => x.lineageKey));
          for (const form of [...setup.rules.filter((r) => !r.retire).map((r) => r.form), family.form].filter((f) => !has.has(f))) {
            try { await this.formLibrary.attach(author, c.id, { formKey: form }); has.add(form); } catch (e) { setUpRefused.push(`${form}: ${said(e)}`); }
          }
          for (const r of setup.rules) {
            const body = r.retire ? { retire: true } : r.condition ? { attachMode: "ANSWER_CONDITIONAL" as const, condition: r.condition } : { attachMode: "COMBINATION_MANDATORY" as const, minAge: r.minAge, ...(r.who ? { who: r.who } : {}) };
            try { await this.studio.saveForm(author, c.id, r.form, body); lines++; } catch (e) { setUpRefused.push(`${r.form}: ${said(e)}`); }
          }
          // The shared field takes the list once (the first combination's), for every combination after it.
          if (maritalList) { try { await this.forms.linkAnswerList(author, "person.marital_status", { list: maritalList }); maritalList = null; } catch (e) { setUpRefused.push(`person.marital_status list: ${said(e)}`); } }
          // The family information form by how the application form is filed (paper or PDF upload: IMM 5707; online:
          // IMM 5645); the other one is taken off only where it is a line.
          for (const [form, body] of [[family.form, { attachMode: "COMBINATION_MANDATORY" as const, minAge: 18 }], ...(has.has(family.other) ? [[family.other, { retire: true }]] as const : [])] as const) {
            try { await this.studio.saveForm(author, c.id, form, body); lines++; } catch (e) { setUpRefused.push(`${form}: ${said(e)}`); }
          }
          // Each fact only a rule reads (IRM 0002's, IMM 5476's, …), added for its rule (C3.6), accepted by the author; the
          // Approver approves it below. One another combination added already is read as it is.
          for (const rf of setup.ruleFacts ?? []) {
            if (await this.db.canonicalField.count({ where: { workspaceId, canonicalFieldKey: rf.fact, status: { in: ["DRAFT", "PUBLISHED"] } } })) continue;
            try {
              const { proposalId } = await this.ruleFacts.add(author, c.id, { fact: rf.fact, rule: rf.rule, label: rf.label, meaning: rf.meaning, valueType: rf.valueType });
              await decide(this.db, this.audit, author, workspaceId, [proposalId], { action: "accept", reason: `Accepted by the sample loader: the fact ${rf.rule}'s rule reads (${rf.cite}; Sample).` });
            } catch (e) { setUpRefused.push(`${rf.label}: ${said(e)}`); }
          }
          // B52: the application form's Yes/No form fields worked out from other answers, each asked as its own question in
          // the form's words (To review › Form fields), with the library's field of the same name when it has one.
          for (const y of setup.ownYesNo ?? []) {
            const ed = await this.db.formEdition.findFirst({ where: { workspaceId, channel: "PDF", form: { formKey: setup.application } }, orderBy: { editionLabel: "desc" }, select: { id: true } });
            const same = (await this.db.canonicalField.findMany({ where: { workspaceId, status: { in: ["DRAFT", "PUBLISHED"] }, valueType: "yes_no", groupKey: "person" }, select: { canonicalFieldKey: true, label: true } })).find((f) => f.label && normalizeLabel(f.label) === normalizeLabel(y.label));
            try { if (!ed) throw new Error(`${setup.application} has no PDF edition in the library`); await this.ownQuestions.ask(author, ed.id, { dataPath: y.dataPath, reason: OWN_YES_NO_REASON, ...(same ? { field: same.canonicalFieldKey } : { label: y.label, meaning: y.meaning }) }); } catch (e) { setUpRefused.push(`${y.label}: ${said(e)}`); }
          }
          for (const ch of await this.db.libraryChange.findMany({ where: { workspaceId, status: "WAITING" }, select: { id: true, label: true, key: true } })) {
            try { await this.library.decideLibraryChange(approver, ch.id, "approve", "Approved by the sample loader as the second person (QA-144 slice 1)."); } catch (e) { setUpRefused.push(`${ch.label ?? ch.key}: ${said(e)}`); }
          }
        }
        const p = await placeFromFormParts(this.db, this.studio, author, c.id);
        placedFacts.push(...p.placed.map((x) => x.fact));
        // A fact only a rule reads is asked beside the fact it is about (IRM 0002's, beside the person's sex or gender as
        // the forms read it, else their date of birth; IMM 5646's, beside the date of birth).
        for (const rf of FORM_SETUP[keyOf.get(c.id) ?? ""]?.ruleFacts ?? []) {
          // QA-227: a fact another combination asked already keeps its one placement (the library's questions are shared).
          if (await this.db.sectionQuestion.count({ where: { workspaceId, canonicalFieldKey: rf.fact, status: { not: "RETIRED" } } })) continue;
          const at = rf.beside ?? ["person.sex", "person.gender", "person.date_of_birth"];
          const near = await this.db.sectionQuestion.findMany({ where: { workspaceId, canonicalFieldKey: { in: at } }, select: { canonicalFieldKey: true, sectionKey: true } });
          const beside = at.map((k) => near.find((x) => x.canonicalFieldKey === k)).find(Boolean);
          // R2-m1 after it too (review R1-m4): its section may be a chosen one, and only a conditional form reads the fact.
          if (beside) { try { await this.studio.placeField(author, rf.fact, { sectionKey: beside.sectionKey, collectedFrom: "client_questionnaire", repeats: rf.fact.startsWith("case.") ? "once_per_case" : "per_person", tier: "case" }); placedFacts.push(rf.fact); await keepChosenEveryones(this.db, this.studio, author, c.id, new Set([beside.sectionKey]), p); } catch (e) { setUpRefused.push(`${rf.fact}: ${said(e)}`); } }
          else setUpRefused.push(`${rf.fact}: none of ${at.join(", ")} is asked in a section`);
        }
        setUpRefused.push(...p.refused, ...p.noSection.map((f) => `${f}: no section groups a form field that reads it`));
        unchosen.push(...p.unselected);
        // G5 (P-248, #868): the document lines after the questions are placed, so a conditional line whose facts the
        // forms' questions now ask can be kept; the Approver approves each new document type as the second person (BR-7).
        if (setup) {
          // G5 (C5.1, P-248; tech lead's ruling on #868, option 1): a release needs a document line, so With an LMIA's
          // document lines come from the reviewed work-permit release p3/releases/c1-v3, the same lines Demo › "Start With
          // an LMIA from its reviewed release" loads, less the ones it dismissed and the QA-115 lines an LMIA job cannot
          // have (samples/programs.json, wp.family's drop_documents). Through the Documents route as the author; a type
          // the library lacks waits as a proposal that the content reviewer accepts, and the Approver approves its ADD
          // just below. Sample, as the release is (its source quotes kept).
          if (setup.documentsFromReviewedRelease) { const d = await this.reviewedDocumentLines(author, sme, workspaceId, c.id, setUpRefused, said); documentLines += d.n; log.push(`  ${keyOf.get(c.id)}: ${d.n} document lines from the reviewed work-permit release c1-v3 (Sample; P-248); ${d.waiting.length} conditional lines wait for the facts their condition reads: ${d.waiting.join("; ")}`); }
          // G5 (P-248; tech lead's ruling on #868, option 1 for the Visitor visa): its document lines from its official
          // document checklist (IMM 5484), by the product's own steps: C2.6 replays the saved AI reading of that edition
          // (US$0), the author decides each proposed line on To review, and the Approver approves a new type below.
          if (setup.documentsFromChecklist) { const d = await this.checklistDocumentLines(author, workspaceId, c.id, setup.documentsFromChecklist, setUpRefused, said); documentLines += d.n; log.push(`  ${keyOf.get(c.id)}: ${d.n} document lines from ${setup.documentsFromChecklist}'s saved reading (Sample; P-248); ${d.rejected.length} rejected with their reason: ${d.rejected.join("; ")}`); }
          // G5 (#868, Lead 8's option 1 for the Study permit): its always-needed lines from its checklist's own words, cited.
          if (setup.documentsCited) { const d = await this.citedDocumentLines(author, sme, workspaceId, c.id, setup.documentsCited, setUpRefused, said); documentLines += d; log.push(`  ${keyOf.get(c.id)}: ${d} document lines from its document checklist, cited with page and quote (Sample, Unconfirmed: expert; P-248)`); }
          // C6.4 (tech lead on #1073): the conditional lines and the facts they read, after the checklist's own lines.
          let conditional: ConditionalDocuments | string | undefined;
          try { conditional = (JSON.parse(readFileSync(CONDITIONAL_DOCUMENTS, "utf8")) as Record<string, ConditionalDocuments | string>)[keyOf.get(c.id) ?? ""]; }
          catch (e) { setUpRefused.push(`samples/conditional-documents.json could not be read, so no conditional document line was added: ${(e as Error).message.slice(0, 200)}`); }
          if (conditional && typeof conditional === "object") { const d = await this.conditionalDocumentLines(author, sme, approver, workspaceId, c.id, conditional, p, placedFacts, setUpRefused, said); documentLines += d; log.push(`  ${keyOf.get(c.id)}: ${d} conditional document lines and the facts they read (samples/conditional-documents.json; Sample, Unconfirmed: expert)`); }
          for (const ch of await this.db.libraryChange.findMany({ where: { workspaceId, status: "WAITING", kind: "document_type" }, select: { id: true, label: true, key: true } })) {
            try { await this.library.decideLibraryChange(approver, ch.id, "approve", "Approved by the sample loader as the second person (G5, a document line's type)."); } catch (e) { setUpRefused.push(`${ch.label ?? ch.key}: ${said(e)}`); }
          }
        }
        const editions = ((await buildSnapshot(this.db, workspaceId, c.id, "draft")).snapshot.field_maps as { form_edition: string; channel?: string }[]).filter((m) => m.channel !== "ONLINE").map((m) => m.form_edition);
        for (const ed of await this.db.formEdition.findMany({ where: { workspaceId, editionLabel: { in: editions } }, select: { id: true } })) {
          for (const f of (await this.library.formFields(ed.id)).fields.filter((x: { outcome: string }) => x.outcome === "unresolved")) {
            try { await this.library.decideFormField(author, ed.id, { dataPath: f.dataPath, decision: "by_hand", reason: BY_HAND_REASON }); byHand++; } catch (e) { setUpRefused.push(`${f.dataPath}: ${said(e)}`); }
          }
          // A choice field's list values matched to the form's own codes (no AI), as the Form library's button does.
          try { await this.forms.draftOptionMaps(author, ed.id); } catch (e) { setUpRefused.push(`option maps: ${said(e)}`); }
        }
      }
    });
    // QA-206 (tech lead on #883): each held section is named in one line, so the row says all of them, not the first six.
    const heldLine = sectionsHeld.length ? `${sectionsHeld.length} section${sectionsHeld.length === 1 ? "" : "s"} held on To review for a person to name (the form prints no heading over their form fields): ${sectionsHeld.join(", ")}` : null;
    row({ row: "7", title: "Sections and questions from the forms' own parts (rules, US$0)", status: !fromForms.length ? "waiting" : sectionsRefused.length || setUpRefused.length || sectionsHeld.length ? "partial" : "done",
      shows: `${sectionsMade.length} sections drafted from ${fromForms.map((c) => c.label).join(", ")}'s forms and approved by the ${approver.name}${sectionsReused.length ? ` (${sectionsReused.length} more already in the library, reused)` : ""}; ${placedFacts.length} facts asked in the section of their form field; ${byHand} form fields no saved answer proposed are filled by hand; ${lines} form lines set from IRCC's words (Sample, Unconfirmed: expert)${unchosen.length ? `; ${unchosen.length} chosen section${unchosen.length === 1 ? "" : "s"} unchosen again where a shared placement made ${unchosen.length === 1 ? "it" : "them"} not everyone's (${[...new Set(unchosen.map((x) => /\(on (.*)\)$/.exec(x)?.[1] ?? ""))].join(", ")})` : ""}`,
      why: [...(heldLine ? [heldLine] : []), ...[...sectionsRefused, ...setUpRefused].slice(0, 6)].join(" · ") || null });
    row({ row: "8", title: "Smart questionnaire (SQR) per person, PQR picks, preview by person", status: applied ? "done" : "waiting", shows: "On each combination: the Smart questionnaire (SQR) and Preview tabs, worked out from the forms applied above", why: applied ? null : "No form was applied." });

    await applySampleFormRoles(this.db, workspaceId); // breaker M2: the demo's form roles before any release is made
    // Rows 9–12: release 1 on each combination whose draft passes the validator, through submit, SME sign-off and a
    // different person's approval. A combination the validator refuses stays a draft, with the validator's words.
    const released: string[] = [], blocked: string[] = [];
    for (const c of six.combinations) {
      // An empty combination is never released as "configured": the rules would allow it today (finding for the Lead),
      // but a release with no form says nothing about the configuration.
      if (!(await this.db.combinationForm.count({ where: { combinationId: c.id } }))) { blocked.push(`${c.label}: not submitted, no form is on it yet (the form finder has no saved answer for its canada.ca page, or none was confirmed).`); continue; }
      try {
        await timed("review and release", async () => {
          // G1 (tech lead on #558): the six are Sample, so the seed answers their numbers with Sample entries (passes only in
          // the demo workspace, as a Demo release); a number nobody answered would refuse the submit.
          await seedSampleSources(this.db, c.id);
          const sub = await this.studio.submit(author, c.id, "Submitted by the sample loader (C10.1 checkpoint).");
          const items = (sub.changeSummary as { kind: string; key: string }[]).map((x) => `${x.kind}|${x.key}`);
          if (items.length) await this.studio.signoff(sme, c.id, { items, action: "signed", note: "Signed by the sample loader as the SME (C10.1 checkpoint)." });
          await this.studio.approve(approver, c.id);
        });
        released.push(c.label);
      } catch (e) { blocked.push(`${c.label}: ${said(e)}`); }
    }
    row({ row: "10", title: "Review and release: submit, expert ticks, a different person releases", status: !released.length ? "waiting" : blocked.length ? "partial" : "done", shows: released.length ? `Release 1 of ${released.join(", ")}` : "No combination can be released yet",
      why: blocked.length ? blocked.join(" · ") : null });
    const visitor = released.some((l) => /Visitor visa/.test(l));
    // Row 11 (QA-231, P-67; C10.1 rows 11–12, #1009): the family of four's Sample case opens on the Visitor visa's release 1
    // through the case officer's own steps, answered from the one Sample record, each form's copy made (C7.1), before
    // row 17, so the case is seen staying on its release (api/src/sample-case.ts). Validate is a person's
    // step in Adobe Reader (P-46, P-171): never simulated here, so the read-back waits for a person.
    const fam = visitor && vvId ? await timed("sample family case (rows 11, 12)", () => openSampleFamilyCase(this.db, this.runtime, this.caseForms, vvId)) : null;

    // C10.1 row 9 (Lead 10's ruling (c') on #1009, and its direction of 5 Nov): release 2 waits for row B81, and a waiting
    // row leaves the checkpoint's draft as it is: nothing is set on Visitor visa's draft, and the row says what Submit
    // would refuse, read without writing from the family form IMM 5257 filed Online needs (api/src/checkpoint-words.ts).
    // The steps that set release 2 come with B81 (they stood here at #1009's 4a09bcd86).
    const onlineFamily = FAMILY_FORM_BY_CHANNEL.online.form;
    // Every PDF edition, as the validator reads them; a form that cannot be read is said on the row, it never stops the load.
    const wouldRefuse = !visitor ? null : await (async () => {
      const editions = await this.db.formEdition.findMany({ where: { workspaceId, form: { formKey: onlineFamily }, channel: "PDF" }, select: { id: true } });
      return editions.length ? (await Promise.all(editions.map((ed) => this.forms.optionMapProblemsIfFiled(ed.id)))).flat() : null;
    })().catch((e) => { console.error(`[demo] row 9 could not read ${onlineFamily}:`, e); return null; });
    row({ row: "9", title: "Channels for release 2 (Mixed: IMM 5257 Online, so IMM 5645 as the family information form; IMM 5476 PDF upload, signed by hand and scanned)", status: "waiting", shows: "The channel route and the signed-scan lines are built (Forms tab)",
      why: visitor ? releaseTwoWords({ application: FORM_SETUP["vv.single"].application, form: onlineFamily }, wouldRefuse) : "Waits for the Visitor visa's release 1: its channels change for release 2." });
    const rowEleven = !!fam?.caseId && fam.people === 4 && fam.births === 4 && fam.fromRecord > 0;
    row({ row: "11", title: "A family case on release 1", status: !fam ? "waiting" : rowEleven ? "done" : "partial",
      shows: fam?.caseId ? `Case ${SAMPLE_CASE.reference} on release ${fam.release}: ${fam.people} people (principal applicant, travelling spouse, a child under 18, a child 18 or over; Sample names); ${fam.fromRecord} answers from the Sample record and ${fam.madeUp} made up (Sample: the second child's name and both children's dates of birth)${fam.notTaken ? `; ${fam.notTaken} of the record's facts not asked by this release or not on its lists` : ""}; ${fam.copies.length} form cop${fam.copies.length === 1 ? "y" : "ies"} made` : "The case area is built (Demo › Open the case area)",
      why: !fam ? "Waits for the Visitor visa's release 1 (a case runs on a release)." : [...fam.refused, ...(rowEleven ? [] : [`${fam.births} of the 4 people have a date of birth on the case.`])].join(" · ") || null });
    // Row 12: a copy generated for each applicant; the read-back needs a person's Validate in Adobe Reader (P-46, P-171).
    const allFilled = !!fam && fam.applicants > 0 && fam.imm5257 === fam.applicants;
    row({ row: "12", title: "IMM 5257 filled as a PDF and read back equal", status: allFilled ? "partial" : "waiting",
      shows: fam?.imm5257 ? `IMM 5257 generated for ${fam.imm5257} of ${fam.applicants} applicants on release 1 (C7.1)` : "The fill is built (C7.1)",
      why: allFilled ? ["Validate each copy in Adobe Reader and upload the validated copy on the case's Forms tab: the checkpoint cannot press Validate (P-46, P-171), so the read-back waits for a person.", ...(fam?.copiesRefused.length ? [`Other forms' copies not made: ${fam.copiesRefused.slice(0, 4).join(" · ")}`] : [])].join(" ") : !fam ? "Waits for the Visitor visa's release 1 (a case runs on a release)." : [...fam.refused, ...fam.copiesRefused].join(" · ") || "IMM 5257 was not generated for every applicant." });
    // Row 17 (QA-207): the current IMM 5476 arrives through the intake on no combination, as a person sends a new edition:
    // the intake holds it (C2.4), and its comparison and impact wait on To review (C9.1; saved AI comparison, #781). The
    // Visitor visa's form finder may already have held it (its replay attaches the page's forms): then this send answers
    // "already waiting", and the row reads the one held item either way (review m4).
    let held17: string | null = null, why17: string | null = null;
    if (row17) {
      const item = (JSON.parse(readFileSync(join(SOLUTION, "official-sources", "ircc", "manifest.json"), "utf8")).items as { file: string; path: string }[]).find((i) => i.file === ROW17.current);
      const r = item ? (await timed("new edition held (row 17)", () => this.intake.intake(author, [{ originalname: item.file, buffer: readFileSync(join(OFFICIAL, item.path)) }], undefined, "SAMPLE"))).results[0] : null;
      const heldNow = await this.db.intakeItem.findFirst({ where: { workspaceId, outcome: "new_edition_held", status: "HELD", code: "IMM 5476" }, select: { editionLabel: true } });
      if (heldNow) held17 = heldNow.editionLabel ?? ROW17.currentLabel; else why17 = `${ROW17.currentLabel} was not held as a new edition: ${r?.message ?? "its official file is not in the manifest"}`;
    }
    const users = row17 ? (await this.db.combinationForm.findMany({ where: { workspaceId, lineageKey: "IMM 5476", status: { not: "RETIRED" } }, select: { combinationId: true }, distinct: ["combinationId"] })).length : 0;
    row({ row: "17", title: "New edition: IMM 5476 2021 → 11-2025 comparison and impact", status: !row17 ? "waiting" : held17 ? "done" : "partial",
      shows: held17 ? `${held17} held as a new edition over the library's ${ROW17.previousLabel}, which ${users} combination${users === 1 ? " files" : "s file"}: its comparison and impact are on To review (saved AI comparison, US$0); canada.ca names 11-2025 the current edition` : "The comparison and impact are built (C9.1, its saved AI comparison #781)",
      why: !row17 ? `Waits for a saved field map of ${ROW17.previousLabel} (the paid runner's; tech lead, 4 Nov): the library then files the 2021 edition and holds 11-2025 as the new one.` : why17 });
    rows.sort((a, b) => Number(a.row) - Number(b.row));
    const count = (s: CheckpointRow["status"]) => rows.filter((r) => r.status === s).length;
    await this.audit.log(workspaceId, actor.id, "loaded", "configured checkpoint", null, `${actor.name} loaded the configured checkpoint in ${((Date.now() - t0) / 1000).toFixed(1)} s: ${count("done")} rows done, ${count("partial")} partly, ${count("waiting")} waiting, ${count("not built yet")} not built yet`);
    return { ...six, sample: "configured", seconds: (Date.now() - t0) / 1000, checkpoint: rows, released, timings, log };
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
    this.ai.forgetQueue(); // queued AI steps of this workspace must not start; running ones find their rows gone and stop
    const before = { scope: await this.scope(workspaceId), preserved: this.preserved() };
    const t0 = Date.now();
    const ws = { workspaceId };
    await this.db.$transaction(async (tx) => {
      // Children first; every table is scoped to the demo workspace id.
      await tx.case.deleteMany({ where: ws }); await tx.party.deleteMany({ where: ws }); // runtime lane (R1): cases (with their pins and participants), then people with their answers and rows
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
