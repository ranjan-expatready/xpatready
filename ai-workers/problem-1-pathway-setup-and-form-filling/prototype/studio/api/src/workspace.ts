// S5 Combination workspace (runtime lane, W1-08, P-123), slice 1: GET /api/combinations/:id/workspace?tab= answers the
// Forms, Questionnaires and Preview tabs in one request each; "Who can be in this application" is saved and undone here
// (M4); the shared library's person roles are read here (M3, GET /api/library/roles; adding a role is S6's). Overview,
// Documents and Review read the combination page's existing reads. Preview reads the draft (or the latest release)
// through the runtime's own caseView (engine/runtime/preview.ts).
import { Body, Controller, Get, Headers, HttpStatus, Inject, Injectable, Param, Patch, Post, Query } from "@nestjs/common";
import { buildSnapshot, buildSnapshots, type Snapshot } from "../../engine/snapshot.ts";
import { questionnairesView } from "../../engine/runtime/questionnaires.ts";
import { previewFamily } from "../../engine/runtime/preview.ts";
import { wordsOnly } from "../../engine/render.ts";
import { acceptedChannels, acceptsOf, channelProblems, filingKind, filingMethod, signatureOf } from "../../engine/channels.ts";
import { CHANNEL_WORDS, CHANNELS, type Channel } from "../../contracts/forms.ts";
import { answeredBy, irccWords, ourWords, signedByLabel, tabOf, type LastFormChange, type RemovedForm, type FamilyKey, type OnlyIf, type PeopleView, type QuestionnairesView, type WorkspaceFormLine, type WorkspaceView } from "../../contracts/workspace.ts";
import { actorOf, Db, fail, readerOf } from "./core.ts";
import { Studio } from "./studio.ts";
import { PeopleFromGuide } from "./people-ai.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Q = { tab?: string; family?: string; person?: string; tweaks?: string; release?: string; role?: string };
type SnapForm = { form_number: string; title: string; form_kind?: string; who: string; status: string; condition: unknown; condition_plain?: string | null; source_quote?: string | null; origin?: string; channel?: Channel; min_age?: number; signed_by?: string };

@Injectable()
export class WorkspaceViews {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Studio) private readonly studio: Studio) {}

  async view(id: string, q: Q): Promise<WorkspaceView> {
    const c = await this.combination(id);
    const asked = String(q.tab ?? "overview").slice(0, 40), tab = tabOf(asked);
    if (tab === "forms") return { tab, asked, people: await this.people(id, c.workspaceId), ...(await this.forms(id, c.workspaceId)) }; // C1: Before forms holds the people card (P-161 (2))
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

  /** The Forms tab: each line of the draft with its settings, what IRCC accepts and its revision token. */
  private async forms(id: string, workspaceId: string): Promise<{ lines: WorkspaceFormLine[]; filing: string; filingDetail: string; problems: { level: "error" | "warning"; item: string; message: string }[]; removed: RemovedForm[]; fromLibrary: string[]; lastChange: LastFormChange | null }> {
    const { snapshot } = await buildSnapshot(this.db, workspaceId, id, "draft");
    const accepts = await acceptsOf(this.db, workspaceId);
    const revisions = await this.studio.revisions(id);
    const maps = snapshot.field_maps as { form_number: string; form_edition: string; entries: { outcome: string }[] }[];
    const rows = await this.db.combinationForm.findMany({ where: { combinationId: id }, orderBy: { version: "desc" } });
    const status = new Map<string, string>(), version = new Map<string, number>();
    for (const r of rows) if (!status.has(r.lineageKey)) { status.set(r.lineageKey, r.status); version.set(r.lineageKey, r.version); }
    const lines = (snapshot.forms as SnapForm[]).map((f): WorkspaceFormLine => {
      const map = maps.filter((m) => m.form_number === f.form_number).at(-1);
      const channel = f.channel ?? "PDF_UPLOAD";
      const onlyIf: OnlyIf = f.status !== "conditional" ? { kind: "always" } : wordsOnly(f) ? { kind: "words_only", words: f.condition_plain ?? "" } : { kind: "rule", words: f.condition_plain ?? "" };
      return {
        line: f.form_number, code: f.form_number, title: f.title, document: (f.form_kind ?? "data_form") === "document", edition: map?.form_edition ?? null,
        boxes: map ? map.entries.filter((e) => e.outcome === "mapped").length : 0, who: f.who, minAge: f.min_age ?? null, onlyIf, condition: f.condition ?? null,
        channel, channelWords: CHANNEL_WORDS[channel], signature: (f.form_kind ?? "data_form") === "document" ? null : signatureOf(channel),
        // Lead check L4: what IRCC accepts comes from the Form library (S4) for the current edition; only when nothing is
        // recorded is every way offered, as Sample.
        accepted: acceptedChannels(accepts.get(f.form_number)) ?? [...CHANNELS], acceptedBasis: acceptedChannels(accepts.get(f.form_number)) ? "From the Form library: what IRCC accepts for this edition" : "Sample: the Form library does not record what IRCC accepts for this form yet",
        signedBy: f.signed_by ?? null, signedByLabel: signedByLabel(f.signed_by), origin: f.origin ?? "HUMAN", quote: irccWords(f.source_quote), added: ourWords(f.source_quote),
        revision: revisions[`form:${f.form_number}`] ?? "", status: status.get(f.form_number) ?? "DRAFT", version: version.get(f.form_number) ?? 1,
      };
    });
    // C1.6: the short words ("PDF only", "Mixed: online and PDF") and, on hover, the line-by-line detail.
    // The filing problems come in the same answer as the lines and the filing words, so they never disagree on screen.
    const problems = channelProblems(snapshot, accepts).map((x) => ({ level: x.level === "error" ? "error" as const : "warning" as const, item: x.item, message: x.message }));
    // P-116 (drift check 8): a form removed since the last release can be put back (Undo) while the draft is open; adding
    // it again from the library restores the same line (api/src/form-lines.ts addFormLine).
    const since = (await this.db.configRelease.findFirst({ where: { combinationId: id }, orderBy: { version: "desc" }, select: { releasedAt: true } }))?.releasedAt;
    const newest = new Map<string, (typeof rows)[number]>();
    for (const r of rows) if (!newest.has(r.lineageKey)) newest.set(r.lineageKey, r);
    const gone = [...newest.values()].filter((r) => r.status === "RETIRED" && (!since || r.updatedAt > since));
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
    return { lines, filing: filingKind(snapshot.forms as SnapForm[]), filingDetail: filingMethod(snapshot.forms as SnapForm[]), problems, removed, fromLibrary: files.filter((f) => matched.has(f.sha256)).map((f) => f.id), lastChange };
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
    return { questionnaire: questionnairesView(snapshot, role, whereUsed), available };
  }

  /** "Who can be in this application" with the roles to pick from and whether Undo is offered. */
  async people(id: string, workspaceId: string): Promise<PeopleView> {
    const c = await this.db.combination.findUniqueOrThrow({ where: { id } });
    const roles = await this.studio.personRoles(workspaceId);
    const state = await this.studio.peopleState(id);
    type Stored = { role: string; label?: string; min: number; max: number; applies?: boolean; preview?: number; quote?: string | null; origin?: "HUMAN" | "AI_PROPOSAL" | "SAMPLE" };
    const lines = (c.participants as Stored[]).map((p) => {
      const r = roles.find((x) => x.key === p.role);
      return { role: p.role, label: p.label ?? r?.label ?? p.role, roleLabel: r?.label ?? p.role, meaning: r?.meaning ?? "", min: p.min, max: p.max, applies: p.applies !== false, preview: p.preview, quote: p.quote ?? null, origin: p.origin, mayBeApplicant: !!r?.mayBeApplicant, answeredBy: answeredBy(p.role) };
    });
    return { ...state, lines, roles };
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
  @Post("combinations/:id/people/propose") propose(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.g.propose(actorOf(a), id, b); }
  // Break m8: reads need a configuration person in x-actor (readerOf), like the catalogue.
  @Get("combinations/:id/workspace") view(@Headers("x-actor") a: H, @Param("id") id: string, @Query() q: Q) { readerOf(a); return this.w.view(id, q); }
  @Patch("combinations/:id/people") savePeople(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.s.savePeople(actorOf(a), id, b); }
  @Post("combinations/:id/people/undo") undoPeople(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.s.undoPeople(actorOf(a), id, b); }
  @Get("library/roles") roles(@Headers("x-actor") a: H) { readerOf(a); return this.s.personRoles(); }
}
