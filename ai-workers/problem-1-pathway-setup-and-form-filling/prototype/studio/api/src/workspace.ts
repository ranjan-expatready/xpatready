// S5 Combination workspace (runtime lane, W1-08, P-123), slice 1: GET /api/combinations/:id/workspace?tab= answers the
// Forms, Questionnaires and Preview tabs in one request each; "Who can be in this application" is saved and undone here
// (M4); the shared library's person roles are read here (M3, GET /api/library/roles; adding a role is S6's). Overview,
// Documents and Review read the combination page's existing reads. Preview reads the draft (or the latest release)
// through the runtime's own caseView (engine/runtime/preview.ts).
import { Body, Controller, Get, Headers, HttpStatus, Inject, Injectable, Param, Patch, Post, Query } from "@nestjs/common";
import { buildSnapshot, type Snapshot } from "../../engine/snapshot.ts";
import { previewFamily } from "../../engine/runtime/preview.ts";
import { wordsOnly } from "../../engine/render.ts";
import { channelProblems, filingKind, filingMethod, signatureOf } from "../../engine/channels.ts";
import { CHANNEL_WORDS, CHANNELS, type Channel } from "../../contracts/forms.ts";
import { answeredBy, signedByLabel, tabOf, type FamilyKey, type OnlyIf, type PeopleView, type WorkspaceFormLine, type WorkspaceView } from "../../contracts/workspace.ts";
import { actorOf, Db, fail } from "./core.ts";
import { Studio } from "./studio.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Q = { tab?: string; family?: string; person?: string; tweaks?: string; release?: string };
type SnapForm = { form_number: string; title: string; form_kind?: string; who: string; status: string; condition: unknown; condition_plain?: string | null; source_quote?: string | null; origin?: string; channel?: Channel; min_age?: number; signed_by?: string };

@Injectable()
export class WorkspaceViews {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Studio) private readonly studio: Studio) {}

  async view(id: string, q: Q): Promise<WorkspaceView> {
    const c = await this.combination(id);
    const asked = String(q.tab ?? "overview").slice(0, 40), tab = tabOf(asked);
    if (tab === "forms") return { tab, asked, ...(await this.forms(id, c.workspaceId)) };
    if (tab === "questionnaires") return { tab, asked, people: await this.people(id, c.workspaceId) };
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
  private async forms(id: string, workspaceId: string): Promise<{ lines: WorkspaceFormLine[]; filing: string; filingDetail: string; problems: { level: "error" | "warning"; item: string; message: string }[] }> {
    const { snapshot } = await buildSnapshot(this.db, workspaceId, id, "draft");
    const revisions = await this.studio.revisions(id);
    const maps = snapshot.field_maps as { form_number: string; form_edition: string; entries: { outcome: string }[] }[];
    const rows = await this.db.combinationForm.findMany({ where: { combinationId: id }, orderBy: { version: "desc" } });
    const status = new Map<string, string>();
    for (const r of rows) if (!status.has(r.lineageKey)) status.set(r.lineageKey, r.status);
    const lines = (snapshot.forms as SnapForm[]).map((f): WorkspaceFormLine => {
      const map = maps.filter((m) => m.form_number === f.form_number).at(-1);
      const channel = f.channel ?? "PDF_UPLOAD";
      const onlyIf: OnlyIf = f.status !== "conditional" ? { kind: "always" } : wordsOnly(f) ? { kind: "words_only", words: f.condition_plain ?? "" } : { kind: "rule", words: f.condition_plain ?? "" };
      return {
        line: f.form_number, code: f.form_number, title: f.title, document: (f.form_kind ?? "data_form") === "document", edition: map?.form_edition ?? null,
        boxes: map ? map.entries.filter((e) => e.outcome === "mapped").length : 0, who: f.who, minAge: f.min_age ?? null, onlyIf, condition: f.condition ?? null,
        channel, channelWords: CHANNEL_WORDS[channel], signature: (f.form_kind ?? "data_form") === "document" ? null : signatureOf(channel),
        // What IRCC accepts comes from the Form library (forms lane, S4); until it records it, every way is offered as Sample.
        accepted: [...CHANNELS], acceptedBasis: "Sample: the Form library does not record what IRCC accepts for this form yet",
        signedBy: f.signed_by ?? null, signedByLabel: signedByLabel(f.signed_by), origin: f.origin ?? "HUMAN", quote: f.source_quote ?? null,
        revision: revisions[`form:${f.form_number}`] ?? "", status: status.get(f.form_number) ?? "DRAFT",
      };
    });
    // C1.6: the short words ("PDF only", "Mixed: online and PDF") and, on hover, the line-by-line detail.
    // The filing problems come in the same answer as the lines and the filing words, so they never disagree on screen.
    const problems = channelProblems(snapshot).map((x) => ({ level: x.level === "error" ? "error" as const : "warning" as const, item: x.item, message: x.message }));
    return { lines, filing: filingKind(snapshot.forms as SnapForm[]), filingDetail: filingMethod(snapshot.forms as SnapForm[]), problems };
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
  constructor(@Inject(WorkspaceViews) private readonly w: WorkspaceViews, @Inject(Studio) private readonly s: Studio) {}
  @Get("combinations/:id/workspace") view(@Param("id") id: string, @Query() q: Q) { return this.w.view(id, q); }
  @Patch("combinations/:id/people") savePeople(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.s.savePeople(actorOf(a), id, b); }
  @Post("combinations/:id/people/undo") undoPeople(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.s.undoPeople(actorOf(a), id, b); }
  @Get("library/roles") roles() { return this.s.personRoles(); }
}
