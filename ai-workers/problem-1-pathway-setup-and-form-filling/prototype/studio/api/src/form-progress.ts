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

  async progress(actor: Actor, combinationId: string, raw: string): Promise<FormProgress> {
    const workspaceId = await this.ws.id();
    const code = normaliseCode(raw);
    if (!code || code.length > 40) throw problem(400, "Not a form number", "Give a form number, such as IMM 5257.");
    const combo = /^[0-9a-f-]{36}$/i.test(combinationId) ? await this.db.combination.findFirst({ where: { id: combinationId, workspaceId }, select: { id: true } }) : null;
    if (!combo) throw problem(404, "No such combination", "This combination does not exist (it may have been deleted).");
    const lines = effective(await this.db.combinationForm.findMany({ where: { workspaceId, combinationId, lineageKey: code }, select: { lineageKey: true, version: true, status: true } }), (l) => l.lineageKey, "draft");
    // On this combination: a form line, or (before its setup) the form's PDF attached to it, as the Forms tab lists it.
    const shas = (await this.db.formEdition.findMany({ where: { workspaceId, form: { formKey: code }, sha256: { not: null } }, select: { sha256: true } })).map((e) => e.sha256!);
    const attached = shas.length ? await this.db.sourceAttachment.findFirst({ where: { combinationId, sha256: { in: shas } }, select: { id: true } }) : null;
    const line = lines.some((l) => l.status !== "RETIRED") || attached ? "present" as const : "none" as const;
    // The library's current approved edition, as Shared library › Forms shows it (one rule, FormLibrary.list).
    const row = ((await this.lib.list({ q: code }, actor.id)).rows as { code: string; edition: string | null; fingerprint: string | null }[]).find((r) => r.code === code);
    if (!row) throw problem(404, "Not in the library", `${code} is not in the library.`);
    const ed = row.edition ? await this.db.formEdition.findUnique({ where: { workspaceId_editionLabel: { workspaceId, editionLabel: row.edition } }, select: { id: true } }) : null;
    const maps = ed ? effective(await this.db.formFieldMap.findMany({ where: { formEditionId: ed.id }, select: { dataPath: true, version: true, status: true, outcome: true } }), (m) => m.dataPath, "draft").filter((m) => m.status !== "RETIRED") : [];
    // The newest field-map draft of this combination's copy of that file (a stub pass proves the path only: not a draft).
    const att = row.fingerprint ? await this.db.sourceAttachment.findFirst({ where: { combinationId, sha256: row.fingerprint }, select: { id: true } }) ?? attached : attached;
    const job = att ? await this.db.draftingJob.findFirst({ where: { attachmentId: att.id, kind: { in: ["field_map", "reuse_map"] }, mode: { not: "STUB" } }, orderBy: { startedAt: "desc" }, select: { status: true } }) : null;
    const draft = !job ? "none" as const : ["QUEUED", "RUNNING"].includes(job.status) ? "running" as const : job.status === "COMPLETED" ? "done" as const : "stopped" as const;
    const items = (await this.queue.items(actor)).filter((i) => i.forms.includes(code));
    const problems = (((await this.studio.combination(combinationId)) as { draft: { problems: { where: string; item: string; level: "error" | "warning"; message: string }[] } }).draft.problems)
      .filter((p) => p.where === "Forms" && p.item === code).map((p) => ({ level: p.level, message: p.message }));
    return formProgress({ form: code, combinationId, line, edition: row.edition, mapped: maps.length, unresolved: maps.filter((m) => m.outcome === "unresolved").length, draft, items, problems, canAuthor: (actor.duties as readonly string[]).includes("author") });
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
