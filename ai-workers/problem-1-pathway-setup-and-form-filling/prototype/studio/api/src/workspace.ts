// S5 Combination workspace (runtime lane, W1-08, P-123), slice 1: GET /api/combinations/:id/workspace?tab= answers the
// Forms, Questionnaires and Preview tabs in one request each; "Who can be in this application" is saved and undone here
// (M4); the shared library's person roles are read here (M3, GET /api/library/roles; adding a role is S6's). Overview,
// Documents and Review read the combination page's existing reads. Preview reads the draft (or the latest release)
// through the runtime's own caseView (engine/runtime/preview.ts).
import { Body, Controller, Get, Headers, HttpStatus, Inject, Injectable, Param, Patch, Post, Query } from "@nestjs/common";
import { buildSnapshot, buildSnapshots, type Snapshot } from "../../engine/snapshot.ts";
import { newestEdition, pdfMapInUse } from "../../engine/programs.ts";
import { questionnairesView } from "../../engine/runtime/questionnaires.ts";
import { previewFamily } from "../../engine/runtime/preview.ts";
import { aliasOf, appliesOf, filingWarnings, filingWords, isLineMode, previewFilings } from "../../engine/filing-modes.ts";
import { defaultModeOf, eachFilesOwnOf, hasFeeRules } from "../../engine/runtime/filings.ts";
import { wordsOnly } from "../../engine/render.ts";
import { choiceEditionsOf } from "../../engine/options.ts";
import { acceptsOf, allowedChannels, channelProblems, filingKind, filingMethod, lineOf, notAcceptedWords, notNeededWords, signatureOf } from "../../engine/channels.ts";
import { ACCOUNT_WORDS, CHANNEL_WORDS, throughAccount, CHANNELS, SIGNATURE_FITS, SIGNATURE_WORDS, type Channel } from "../../contracts/forms.ts";
import { type AddsFiling, type LineMode, answeredBy, irccWords, ourWords, signedByLabel, tabOf, type LastFormChange, type RemovedForm, type FamilyKey, type OnlyIf, type PeopleView, type QuestionnairesView, type WorkspaceFormLine, type WorkspaceView } from "../../contracts/workspace.ts";
import { actorOf, Db, fail, readerOf, type Actor } from "./core.ts";
import { FormProgressService } from "./form-progress.ts";
import { chipOf, type FormStepChip } from "../../contracts/form-progress.ts";
import { Studio } from "./studio.ts";
import { PeopleFromGuide } from "./people-ai.ts";
import { removedInDraft, removedLines } from "../../contracts/counts.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Q = { tab?: string; family?: string; person?: string; tweaks?: string; release?: string; role?: string };
type SnapForm = { form_number: string; title: string; form_kind?: string; who: string; status: string; condition: unknown; condition_plain?: string | null; source_quote?: string | null; origin?: string; channel?: Channel; min_age?: number; signed_by?: string; copies?: number };

@Injectable()
export class WorkspaceViews {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Studio) private readonly studio: Studio, @Inject(FormProgressService) private readonly progress: FormProgressService) {}

  async view(id: string, q: Q, actor?: Actor): Promise<WorkspaceView> {
    const c = await this.combination(id);
    const asked = String(q.tab ?? "overview").slice(0, 40), tab = tabOf(asked);
    // C1: Before forms holds the people card (P-161 (2)); C2.12 slice 3: each form's step chip (one read for the tab).
    if (tab === "forms") { const f = await this.forms(id, c.workspaceId); return { tab, asked, people: await this.people(id, c.workspaceId), ...f, ...(actor ? { progress: await this.chips(actor, id, c.workspaceId, f.lines) } : {}) }; }
    if (tab === "questionnaires") return { tab, asked, people: await this.people(id, c.workspaceId), ...(await this.questionnaires(id, c.workspaceId, q.role)) };
    if (tab === "preview") return { tab, asked, ...(await this.preview(id, c.workspaceId, q)) };
    return { tab, asked };
  }

  private async combination(id: string) {
    if (!UUID.test(id)) fail("That combination does not exist.", HttpStatus.NOT_FOUND);
    const c = await this.db.combination.findUnique({ where: { id } });
    if (!c) fail("That combination does not exist (it may have been removed by a reset).", HttpStatus.NOT_FOUND);
    return c!;
  }

  /** F2 C2.12 slice 3 (forms lane, review 28b3bba3 Major 1): every form's step chip, worked out once for the tab view
   *  (FormProgressService.forCombination): the data-form lines and the forms attached but not set up yet. */
  private async chips(actor: Actor, id: string, workspaceId: string, lines: WorkspaceFormLine[]): Promise<Record<string, FormStepChip>> {
    const files = await this.db.sourceAttachment.findMany({ where: { combinationId: id, kind: "Form" }, select: { sha256: true } });
    const attached = files.length ? (await this.db.formEdition.findMany({ where: { workspaceId, sha256: { in: files.map((f) => f.sha256) } }, select: { form: { select: { formKey: true, formKind: true } } } })).filter((e) => e.form.formKind !== "document").map((e) => e.form.formKey) : [];
    const codes = [...lines.filter((l) => !l.document).map((l) => l.code), ...attached];
    return Object.fromEntries([...(await this.progress.forCombination(actor, id, codes))].map(([code, p]) => [code, chipOf(p)]));
  }

  /** The Forms tab: each line of the draft with its settings, what IRCC accepts and its revision token. */
  private async forms(id: string, workspaceId: string): Promise<{ lines: WorkspaceFormLine[]; filing: string; filingDetail: string; account: string | null; accountKey: string | null; problems: { level: "error" | "warning"; item: string; message: string }[]; removed: RemovedForm[]; removedEver: string[]; fromLibrary: string[]; lastChange: LastFormChange | null }> {
    const { snapshot } = await buildSnapshot(this.db, workspaceId, id, "draft");
    const accepts = await acceptsOf(this.db, workspaceId);
    const revisions = await this.studio.revisions(id);
    const maps = snapshot.field_maps as { form_number: string; form_edition: string; channel?: string; entries: { outcome: string }[] }[];
    const rows = await this.db.combinationForm.findMany({ where: { combinationId: id }, orderBy: { version: "desc" } });
    const status = new Map<string, string>(), version = new Map<string, number>();
    for (const r of rows) if (!status.has(r.lineageKey)) { status.set(r.lineageKey, r.status); version.set(r.lineageKey, r.version); }
    // QA-103: each line's current library edition (one read for the tab), so a line with no field map yet still names its file.
    const defs = await this.db.govFormDef.findMany({ where: { workspaceId, formKey: { in: (snapshot.forms as SnapForm[]).map((f) => f.form_number) } }, select: { formKey: true, editions: { select: { id: true, editionLabel: true, channel: true, sha256: true } } } });
    const libraryEdition = new Map(defs.map((d) => [d.formKey, newestEdition(d.editions.filter((e) => e.channel !== "ONLINE" && e.sha256))?.editionLabel ?? null]));
    const editionIdOf = new Map(defs.flatMap((d) => d.editions.filter((e) => e.channel !== "ONLINE").map((e) => [`${d.formKey}|${e.editionLabel}`, e.id] as const)));
    const lines = (snapshot.forms as SnapForm[]).map((f): WorkspaceFormLine => {
      // P-32: a PDF line shows the edition in use, the one a case fills (pdfMapInUse); an Online line its newest online map, as before.
      const map = (lineOf(f).channel === "ONLINE" ? undefined : pdfMapInUse(maps, f.form_number)) ?? maps.filter((m) => m.form_number === f.form_number).at(-1);
      const { channel, signature } = lineOf(f), account = snapshot.combination.portal ?? null;
      const { channels: accepted, record } = allowedChannels(accepts.get(f.form_number), account);
      const onlyIf: OnlyIf = f.status !== "conditional" ? { kind: "always" } : wordsOnly(f) ? { kind: "words_only", words: f.condition_plain ?? "" } : { kind: "rule", words: f.condition_plain ?? "" };
      return {
        line: f.form_number, code: f.form_number, title: f.title, document: (f.form_kind ?? "data_form") === "document", edition: map?.form_edition ?? null, libraryEdition: libraryEdition.get(f.form_number) ?? null, choiceEditions: choiceEditionsOf(maps, f.form_number, map?.form_edition, (e) => editionIdOf.get(`${f.form_number}|${e}`)),
        boxes: map ? map.entries.filter((e) => e.outcome === "mapped").length : 0, who: f.who, minAge: f.min_age ?? null, copies: f.copies ?? 1, onlyIf, condition: f.condition ?? null,
        channel, channelWords: CHANNEL_WORDS[channel], signature: (f.form_kind ?? "data_form") === "document" ? null : signatureOf(signature), signatureKind: signature,
        // P-143 (C-2): the signatures that fit the line's channel; C-3, C-4: each channel, offered or refused with its reason.
        signatures: SIGNATURE_FITS[channel].map((k) => ({ kind: k, words: SIGNATURE_WORDS[k] })),
        channelOptions: CHANNELS.map((c) => ({ channel: c, words: CHANNEL_WORDS[c], ok: accepted.includes(c), why: accepted.includes(c) ? null : c === "NOT_NEEDED" ? notNeededWords(f.form_number, account) : notAcceptedWords(f.form_number, c, record!) })),
        // Lead check L4: what IRCC accepts comes from the Form library (S4) for the current edition; only when nothing is
        // recorded is every way offered, as Sample.
        accepted, acceptedBasis: record ? `From the Form library: what IRCC accepts for this edition${record.account === "ANY" ? "" : ` ${throughAccount(record.account)}`}` : "Sample: the Form library does not record what IRCC accepts for this form yet",
        signedBy: f.signed_by ?? null, signedByLabel: signedByLabel(f.signed_by), origin: f.origin ?? "HUMAN", quote: irccWords(f.source_quote), added: ourWords(f.source_quote),
        revision: revisions[`form:${f.form_number}`] ?? "", status: status.get(f.form_number) ?? "DRAFT", version: version.get(f.form_number) ?? 1,
      };
    });
    // C1.6: the short words ("PDF only", "Mixed: online and PDF") and, on hover, the line-by-line detail.
    // The filing problems come in the same answer as the lines and the filing words, so they never disagree on screen.
    const problems = channelProblems(snapshot, accepts).map((x) => ({ level: x.level === "error" ? "error" as const : "warning" as const, item: x.item, message: x.message }));
    // P-116 (drift check 8): a form removed since the last release can be put back (Undo) while the draft is open; adding
    // it again from the library restores the same line (api/src/form-lines.ts addFormLine).
    const rel = await this.db.configRelease.findFirst({ where: { combinationId: id }, orderBy: { version: "desc" }, select: { releasedAt: true, snapshot: true } });
    const since = rel?.releasedAt;
    // UX-A part 1 (re-break N2): removed in this draft = removed and still in the latest release (contracts/counts.ts).
    const gone = removedInDraft(rows, rel ? ((rel.snapshot as { forms?: { form_number: string }[] } | null)?.forms ?? []).map((f) => f.form_number) : null);
    const goneEver = removedLines(rows).map((r) => r.lineageKey); // break 2: removed before a release too
    const titles = new Map((await this.db.govFormDef.findMany({ where: { id: { in: gone.map((r) => r.govFormDefId) } }, select: { id: true, displayName: true } })).map((f) => [f.id, f.displayName]));
    const removed = gone.map((r): RemovedForm => ({ code: r.lineageKey, title: titles.get(r.govFormDefId) ?? "", at: r.updatedAt.toISOString() }));
    // Drift check 5: an attached form whose file the library has already matched is added from the library, no AI; the
    // same rule as the page's next step (api/src/programs.ts fromLibrary), so the row and the header name one step.
    const files = await this.db.sourceAttachment.findMany({ where: { combinationId: id, kind: "Form", recognised: true }, select: { id: true, sha256: true } });
    const matched = new Set((await this.db.formEdition.findMany({ where: { workspaceId, sha256: { in: files.map((f) => f.sha256) }, maps: { some: {} } }, select: { sha256: true } })).map((e) => e.sha256));
    // Slice 3 (P-116 amended, one Undo for the page): the newest change on this combination's forms that Undo can still
    // reverse (the forms lane's POST …/forms/undo takes its id, so a change someone made since is never undone blind).
    // QA-69: nothing to undo once a release came after it (the Undo bar is not offered; the API refuses it too).
    const last = await this.db.formLineAction.findFirst({ where: { combinationId: id, undoneAt: null, ...(since ? { at: { gt: since } } : {}) }, orderBy: { at: "desc" } });
    const lastChange: LastFormChange | null = last ? { id: last.id, action: last.action as LastFormChange["action"], codes: ((last.detail as { codes?: string[] })?.codes ?? []), by: last.by, at: last.at.toISOString() } : null;
    const portal = snapshot.combination.portal ?? null;
    return { lines, filing: filingKind(snapshot.forms as SnapForm[]), filingDetail: filingMethod(snapshot.forms as SnapForm[]), account: portal ? ACCOUNT_WORDS[portal as "ANY"] ?? portal : null, accountKey: portal, problems, removed, removedEver: goneEver, fromLibrary: files.filter((f) => matched.has(f.sha256)).map((f) => f.id), lastChange };
  }

  /** Questionnaires (slice 2): one person role's questions as a case asks them, with coverage; the library sections the
   *  combination can still add; where-used counts every combination's draft (a shared question changes everywhere). */
  private async questionnaires(id: string, workspaceId: string, role?: string): Promise<{ questionnaire: QuestionnairesView | null; available: { key: string; title: string }[] }> {
    const snapshot = (await buildSnapshot(this.db, workspaceId, id, "draft")).snapshot;
    const sections = await this.db.logicalSection.findMany({ where: { workspaceId, status: { not: "RETIRED" } }, orderBy: [{ displayOrder: "asc" }, { version: "desc" }] });
    const chosen = new Set((snapshot.sections as { id: string }[]).map((x) => x.id)), seen = new Set<string>();
    const available = sections.filter((x) => !chosen.has(x.sectionKey) && !seen.has(x.sectionKey) && seen.add(x.sectionKey)).map((x) => ({ key: x.sectionKey, title: x.title }));
    if (!snapshot.forms.length && !snapshot.sections.length) return { questionnaire: null, available };
    const comps = await this.db.combination.findMany({ where: { workspaceId }, select: { id: true } });
    const snaps = await buildSnapshots(this.db, workspaceId, comps.map((x) => x.id), "draft");
    const whereUsed = new Map<string, number>();
    for (const x of snaps.values()) for (const f of x.snapshot.canonical_fields as { id: string }[]) whereUsed.set(f.id, (whereUsed.get(f.id) ?? 0) + 1);
    // QA-172: the library's titles (newest version of each section), for a question placed in a section not chosen here.
    // Every version, retired too (review m1, Devin on #722): a retired section's placed questions stay asked, so it keeps
    // its newest title, as library-sources.ts nameOf reads it.
    const libraryTitles = new Map<string, string>(); for (const x of await this.db.logicalSection.findMany({ where: { workspaceId }, orderBy: { version: "desc" }, select: { sectionKey: true, title: true } })) if (!libraryTitles.has(x.sectionKey)) libraryTitles.set(x.sectionKey, x.title);
    return { questionnaire: questionnairesView(snapshot, role, whereUsed, new Date(), libraryTitles), available };
  }

  /** "Who can be in this application" with the roles to pick from and whether Undo is offered. */
  async people(id: string, workspaceId: string): Promise<PeopleView> {
    const c = await this.db.combination.findUniqueOrThrow({ where: { id } });
    const roles = await this.studio.personRoles(workspaceId);
    const state = await this.studio.peopleState(id);
    type Stored = { role: string; label?: string; min: number; max: number; applies?: boolean; preview?: number; filingMode?: unknown; quote?: string | null; origin?: "HUMAN" | "AI_PROPOSAL" | "SAMPLE"; addsFiling?: AddsFiling | null };
    // M3-S1: worked out only when a fee line also reaches each co-filed application (as the case's own filings do).
    const coFilers = (c.participants as Stored[]).filter((p) => p.filingMode === "co_files").map((p) => p.role);
    const feesKnown = hasFeeRules(c.combinationKey, coFilers);
    const lines = (c.participants as Stored[]).map((p) => {
      const r = roles.find((x) => x.key === p.role);
      // C11.12 BR-3 (B1): a mode stored on a role that is never an applicant (earlier setup runs) is dropped on read.
      const stored = isLineMode(p.filingMode) ? p.filingMode : null;
      const filingMode = stored && !!r?.mayBeApplicant === (stored !== "co_files") ? stored : null;
      const applies = appliesOf(filingMode, p.applies !== false) && !!r?.mayBeApplicant;
      return { role: p.role, label: p.label ?? r?.label ?? p.role, roleLabel: r?.label ?? p.role, meaning: r?.meaning ?? "", min: p.min, max: p.max, applies, preview: p.preview, filingMode, filing: aliasOf(filingMode),
        ...filingWords({ role: p.role, filingMode, applies }, !!r?.mayBeApplicant, feesKnown, c.label), quote: p.quote ?? null, origin: p.origin, mayBeApplicant: !!r?.mayBeApplicant, answeredBy: answeredBy(p.role), addsFiling: p.addsFiling ?? null }; // M3-S2: kept, so a save keeps it
    });
    // C11.12 "What a case gets": the plan of filings for one case of each line's preview count (concept §4).
    const plan = previewFilings(lines, c.label, feesKnown, (role) => defaultModeOf(c.combinationKey, role));
    const defaults = Object.fromEntries(roles.map((r) => [r.key, defaultModeOf(c.combinationKey, r.key)]).filter(([, m]) => !!m)) as Record<string, LineMode>;
    const eachFilesOwn = eachFilesOwnOf(c.combinationKey);
    return { ...state, lines, roles, warnings: filingWarnings(eachFilesOwn, lines), ...plan, combinationKey: c.combinationKey, combinationLabel: c.label, feesKnown, defaults, eachFilesOwn };
  }

  /** Preview: an unsaved case of one Sample family, read by caseView (never saved, never a real person). */
  private async preview(id: string, workspaceId: string, q: Q) {
    let snapshot: Snapshot, label: string;
    if (q.release === "1") {
      const r = await this.db.configRelease.findFirst({ where: { combinationId: id }, orderBy: { version: "desc" } });
      if (!r) fail("This combination has no released version yet; preview the draft instead.", HttpStatus.NOT_FOUND);
      snapshot = r!.snapshot as unknown as Snapshot; label = `Released version ${r!.version}`;
    } else { snapshot = (await buildSnapshot(this.db, workspaceId, id, "draft")).snapshot; label = "Draft (not released)"; }
    if (!snapshot.forms.length) return { preview: null, empty: "Nothing to preview yet: once this combination has forms, choose a Sample family to see each person's questions, documents and forms exactly as a case gets them." };
    let tweaks: Record<string, boolean> = {};
    try { const t = q.tweaks ? JSON.parse(q.tweaks) : {}; if (t && typeof t === "object" && !Array.isArray(t)) tweaks = t; } catch { fail("The preview's answers could not be read; reload the tab.", HttpStatus.BAD_REQUEST); }
    return { preview: previewFamily(snapshot, (q.family ?? "") as FamilyKey, q.person ?? "principal", tweaks, new Date(), label), empty: null };
  }
}

type H = string | undefined;
@Controller("api")
export class WorkspaceController {
  constructor(@Inject(WorkspaceViews) private readonly w: WorkspaceViews, @Inject(Studio) private readonly s: Studio, @Inject(PeopleFromGuide) private readonly g: PeopleFromGuide) {}
  // Slice 3: "Who can be" filled from the guide: the plan (cost first), then the proposal (never saved by itself).
  @Post("combinations/:id/people/propose/plan") peoplePlan(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { readerOf(a); return this.g.plan(id, b); }
  @Get("combinations/:id/people/runs/:runId") peopleRun(@Headers("x-actor") a: H, @Param("id") id: string, @Param("runId") r: string) { readerOf(a); return this.g.result(id, r); } // QA-91
  @Post("combinations/:id/people/propose") propose(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.g.propose(actorOf(a), id, b); }
  // Break m8: reads need a configuration person in x-actor (readerOf), like the catalogue.
  @Get("combinations/:id/workspace") view(@Headers("x-actor") a: H, @Param("id") id: string, @Query() q: Q) { return this.w.view(id, q, readerOf(a)); }
  @Patch("combinations/:id/people") savePeople(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.s.savePeople(actorOf(a), id, b); }
  @Post("combinations/:id/people/undo") undoPeople(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.s.undoPeople(actorOf(a), id, b); }
  @Get("library/roles") roles(@Headers("x-actor") a: H) { readerOf(a); return this.s.personRoles(); }
}
