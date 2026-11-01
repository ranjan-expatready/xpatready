// F2 C2.12 slice 2 (forms lane; the agreed F3 plan §5–§7, PDF only since P-102): GET /combinations/:id/forms/:code/progress,
// one form's guided path on one combination: its six steps, the current one, the asking person's next step and what is
// left. Read only; calculated on every read (plan D5) from the To review items (one source with To review, plan D3), the
// library's Forms list, the field map, the newest AI draft and the validator's Forms problems. US$0, no AI.
import { Controller, Get, Headers, HttpException, HttpStatus, Inject, Injectable, Param } from "@nestjs/common";
import { normaliseCode } from "../../contracts/form-library.ts";
import type { FormProgress } from "../../contracts/form-progress.ts";
import { formProgress } from "../../engine/form-progress.ts";
import { effective } from "../../engine/snapshot.ts";
import { actorOf, Db, Workspace, type Actor } from "./core.ts";
import { FormLibrary } from "./form-library.ts";
import { ReviewQueueService } from "./review-queue.ts";
import { Studio } from "./studio.ts";

const problem = (status: number, title: string, detail: string) => new HttpException({ type: `https://expatready.local/problems/${status}`, title, status, detail }, status);

@Injectable()
export class FormProgressService {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Workspace) private readonly ws: Workspace, @Inject(ReviewQueueService) private readonly queue: ReviewQueueService,
    @Inject(FormLibrary) private readonly lib: FormLibrary, @Inject(Studio) private readonly studio: Studio) {}

  async progress(actor: Actor, rawId: string, raw: string): Promise<FormProgress> {
    const workspaceId = await this.ws.id();
    const code = normaliseCode(raw);
    if (!code || code.length > 40) throw problem(400, "Not a form number", "Give a form number, such as IMM 5257.");
    // Review (514f0d8d) m5: an id in capitals is the same combination (ids are stored in lower case).
    const combinationId = rawId.toLowerCase();
    const combo = /^[0-9a-f-]{36}$/.test(combinationId) ? await this.db.combination.findFirst({ where: { id: combinationId, workspaceId }, select: { id: true } }) : null;
    if (!combo) throw problem(404, "No such combination", "This combination does not exist (it may have been deleted).");
    // Review M4: the library's current approved edition of this one form (the Forms list's rule, FormLibrary.currentOf).
    const current = await this.lib.currentOf(code);
    if (current === undefined) throw problem(404, "Not in the library", `${code} is not in the library.`);
    // Review M2a: on this combination = its form line as the draft has it now; only a form with no line history yet counts
    // its attached PDF (before its setup, as the Forms tab lists it), so a removed line reads not on the combination.
    const history = await this.db.combinationForm.findMany({ where: { workspaceId, combinationId, lineageKey: code }, select: { lineageKey: true, version: true, status: true } });
    const shas = (await this.db.formEdition.findMany({ where: { workspaceId, form: { formKey: code }, sha256: { not: null } }, select: { sha256: true } })).map((e) => e.sha256!);
    const attached = shas.length ? await this.db.sourceAttachment.findFirst({ where: { combinationId, sha256: { in: shas } }, select: { id: true } }) : null;
    const line = history.length ? (effective(history, (l) => l.lineageKey, "draft").some((l) => l.status !== "RETIRED") ? "present" as const : "none" as const) : attached ? "present" as const : "none" as const;
    const ed = current ? await this.db.formEdition.findUnique({ where: { workspaceId_editionLabel: { workspaceId, editionLabel: current.edition } }, select: { id: true } }) : null;
    const maps = ed ? effective(await this.db.formFieldMap.findMany({ where: { formEditionId: ed.id }, select: { dataPath: true, version: true, status: true, outcome: true } }), (m) => m.dataPath, "draft").filter((m) => m.status !== "RETIRED") : [];
    // The newest field-map draft of this combination's copy of that file (a stub pass proves the path only: not a draft).
    const att = current ? await this.db.sourceAttachment.findFirst({ where: { combinationId, sha256: current.sha256 }, select: { id: true } }) ?? attached : attached;
    const job = att ? await this.db.draftingJob.findFirst({ where: { attachmentId: att.id, kind: { in: ["field_map", "reuse_map"] }, mode: { not: "STUB" } }, orderBy: { startedAt: "desc" }, select: { status: true } }) : null;
    const draft = !job ? "none" as const : ["QUEUED", "RUNNING"].includes(job.status) ? "running" as const : job.status === "COMPLETED" ? "done" as const : "stopped" as const;
    let items = (await this.queue.items(actor)).filter((i) => i.forms.includes(code));
    // Review m2: step 4 is new shared fields: a library change of another kind (what IRCC accepts, a library form's
    // lifecycle, who fills) is not part of this form's field map, so it is not a step of its path.
    const changeIds = items.filter((i) => i.id.startsWith("change:")).map((i) => i.id.slice(7));
    const fieldChanges = new Set(changeIds.length ? (await this.db.libraryChange.findMany({ where: { id: { in: changeIds }, kind: "field" }, select: { id: true } })).map((c) => c.id) : []);
    items = items.filter((i) => !i.id.startsWith("change:") || fieldChanges.has(i.id.slice(7)));
    const problems = (((await this.studio.combination(combinationId)) as { draft: { problems: { where: string; item: string; level: "error" | "warning"; message: string }[] } }).draft.problems)
      .filter((p) => p.where === "Forms" && p.item === code).map((p) => ({ level: p.level, message: p.message }));
    // Review M1: form fields with no decision count only while they are in a draft (To review lists those, K1); ones carried
    // from an earlier release are the validator's warning on step 6 ("decide them when this edition is drafted again").
    return formProgress({ form: code, combinationId, line, edition: current?.edition ?? null, mapped: maps.filter((m) => m.outcome !== "unresolved").length,
      unresolved: maps.filter((m) => m.outcome === "unresolved" && m.status === "DRAFT").length, draft, items, problems, canAuthor: (actor.duties as readonly string[]).includes("author") });
  }
}

@Controller("api")
export class FormProgressController {
  constructor(@Inject(FormProgressService) private readonly s: FormProgressService) {}
  @Get("combinations/:id/forms/:code/progress") get(@Headers("x-actor") a: string | undefined, @Param("id") id: string, @Param("code") code: string) {
    if (!a) throw new HttpException({ type: "https://expatready.local/problems/401", title: "Choose who you are", status: HttpStatus.UNAUTHORIZED, detail: "Choose a person first." }, HttpStatus.UNAUTHORIZED);
    return this.s.progress(actorOf(a), id, code);
  }
}
