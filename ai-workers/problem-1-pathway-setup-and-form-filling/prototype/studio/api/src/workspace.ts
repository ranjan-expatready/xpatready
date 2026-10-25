// Screen 03, the combination workspace (runtime lane, slice S1): GET /api/combinations/:id/workspace?tab= answers one
// tab view in one request (concept §6). Overview and Forms read the same services the combination page always read
// (Studio.combination, Programs.summary) so nothing is worked out twice; Preview by person reads the draft (or the
// latest release) through the runtime's caseView (engine/runtime/preview.ts, BR-15).
import { Controller, Get, HttpStatus, Inject, Injectable, Param, Query } from "@nestjs/common";
import { buildSnapshot, type Snapshot } from "../../engine/snapshot.ts";
import { previewFamily } from "../../engine/runtime/preview.ts";
import { signedByLabel, tabOf, type FamilyKey, type WorkspaceFormLine, type WorkspaceView } from "../../contracts/workspace.ts";
import { Db, fail } from "./core.ts";
import { Programs } from "./programs.ts";
import { Studio } from "./studio.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Q = { tab?: string; family?: string; person?: string; mode?: string; tweaks?: string; release?: string };

@Injectable()
export class WorkspaceViews {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Studio) private readonly studio: Studio, @Inject(Programs) private readonly programs: Programs) {}

  async view(id: string, q: Q): Promise<WorkspaceView> {
    if (!UUID.test(id)) fail("That combination does not exist.", HttpStatus.NOT_FOUND);
    const c = await this.db.combination.findUnique({ where: { id } });
    if (!c) fail("That combination does not exist (it may have been removed by a reset).", HttpStatus.NOT_FOUND);
    const asked = String(q.tab ?? "overview").slice(0, 40), tab = tabOf(asked);
    if (tab === "overview") return { tab, asked, view: (await this.studio.combination(id)) as never, summary: await this.programs.summary(id) };
    if (tab === "forms") return { tab, asked, ...(await this.forms(id)) };
    if (tab === "preview") return { tab, asked, ...(await this.preview(id, c!.workspaceId, q)) };
    return { tab, asked };
  }

  /** The Forms tab: Screen 01's summary (channels, filing method, portal, problems) plus each line's own fields. */
  private async forms(id: string): Promise<{ summary: Awaited<ReturnType<Programs["summary"]>>; lines: WorkspaceFormLine[] }> {
    const summary = await this.programs.summary(id);
    const rows = await this.db.combinationForm.findMany({ where: { combinationId: id }, orderBy: { version: "desc" } });
    const newest = new Map<string, (typeof rows)[number]>();
    for (const r of rows) if (!newest.has(r.lineageKey)) newest.set(r.lineageKey, r);
    // The revision token is the newest row's save time, the one Studio.saveForm compares (a stale save is a 409).
    const lines = summary.forms.flatMap((f) => {
      const r = newest.get(f.code);
      if (!r) return [];
      return [{ ...f, line: r.lineageKey, copies: r.copies, minAge: r.minAge, signedBy: r.signedBy, signedByLabel: signedByLabel(r.signedBy), revision: r.updatedAt.toISOString(), version: r.version, status: r.status }];
    });
    return { summary, lines };
  }

  /** Preview by person: an unsaved case of a Sample family, read by caseView (never saved, never a real person). */
  private async preview(id: string, workspaceId: string, q: Q) {
    let snapshot: Snapshot, label: string;
    if (q.release === "1") {
      const r = await this.db.configRelease.findFirst({ where: { combinationId: id }, orderBy: { version: "desc" } });
      if (!r) fail("This combination has no released version yet; preview the draft instead.", HttpStatus.NOT_FOUND);
      snapshot = r!.snapshot as unknown as Snapshot; label = `Released version ${r!.version}`;
    } else { snapshot = (await buildSnapshot(this.db, workspaceId, id, "draft")).snapshot; label = "Draft preview (not released)"; }
    if (!snapshot.forms.length) return { preview: null, empty: "Once forms and questions exist, choose a Sample family to see each person's questionnaire, documents and forms exactly as a case gets them." };
    let tweaks: Record<string, boolean> = {};
    try { const t = q.tweaks ? JSON.parse(q.tweaks) : {}; if (t && typeof t === "object" && !Array.isArray(t)) tweaks = t; } catch { fail("The preview's answers could not be read; reload the tab.", HttpStatus.BAD_REQUEST); }
    return { preview: previewFamily(snapshot, (q.family ?? "family1") as FamilyKey, q.person ?? "principal", q.mode === "agent" ? "agent" : "sqr", tweaks, new Date(), label), empty: null };
  }
}

@Controller("api")
export class WorkspaceController {
  constructor(@Inject(WorkspaceViews) private readonly w: WorkspaceViews) {}
  @Get("combinations/:id/workspace") view(@Param("id") id: string, @Query() q: Q) { return this.w.view(id, q); }
}
