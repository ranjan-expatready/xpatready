// F2 C2.12 slice 2 (forms lane; the agreed F3 plan §5–§7, PDF only since P-102): GET /combinations/:id/forms/:code/progress,
// one form's guided path on one combination: its six steps, the current one, the asking person's next step and what is
// left. Read only; calculated on every read (plan D5) from the To review items (one source with To review, plan D3), the
// library's Forms list, the field map, the newest AI draft and the validator's Forms problems. US$0, no AI.
import { Controller, Get, Headers, HttpException, HttpStatus, Inject, Injectable, Param } from "@nestjs/common";
import { normaliseCode } from "../../contracts/form-library.ts";
import type { FormProgress } from "../../contracts/form-progress.ts";
import { formProgress } from "../../engine/form-progress.ts";
import { effective } from "../../engine/snapshot.ts";
import { waitsForMap } from "../../engine/setup-checklist.ts";
import { actorOf, Db, Workspace, type Actor } from "./core.ts";
import { FormLibrary } from "./form-library.ts";
import { ReviewQueueService } from "./review-queue.ts";
import { Ai } from "./ai.ts";
import { Studio } from "./studio.ts";

const problem = (status: number, title: string, detail: string) => new HttpException({ type: `https://expatready.local/problems/${status}`, title, status, detail }, status);

@Injectable()
export class FormProgressService {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Workspace) private readonly ws: Workspace, @Inject(ReviewQueueService) private readonly queue: ReviewQueueService,
    @Inject(FormLibrary) private readonly lib: FormLibrary, @Inject(Studio) private readonly studio: Studio, @Inject(Ai) private readonly ai: Ai) {}

  async progress(actor: Actor, rawId: string, raw: string): Promise<FormProgress> {
    const workspaceId = await this.ws.id();
    const code = normaliseCode(raw);
    if (!code || code.length > 40) throw problem(400, "Not a form number", "Give a form number, such as IMM 5257.");
    // Review (514f0d8d) m5: an id in capitals is the same combination (ids are stored in lower case).
    const combinationId = rawId.toLowerCase();
    const combo = /^[0-9a-f-]{36}$/.test(combinationId) ? await this.db.combination.findFirst({ where: { id: combinationId, workspaceId }, select: { id: true } }) : null;
    if (!combo) throw problem(404, "No such combination", "This combination does not exist (it may have been deleted).");
    const one = (await this.forCombination(actor, combinationId, [code])).get(code);
    if (!one) throw problem(404, "Not in the library", `${code} is not in the library.`);
    return one;
  }

  /** Slice 3 (review 28b3bba3 Major 1; concept §4/§6, STANDARDS §5 "one request per screen view, not per row"): the path of
   *  several forms of one combination, from one set of reads for the whole combination (the queue, the validator, the
   *  library, the lines, the files, the field maps and the drafts each once). A form not in the library has no entry. */
  async forCombination(actor: Actor, combinationId: string, wanted: string[]): Promise<Map<string, FormProgress>> {
    const workspaceId = await this.ws.id();
    const codes = [...new Set(wanted)];
    const out = new Map<string, FormProgress>();
    if (!codes.length) return out;
    // Review M4: the library's current approved edition of each form (the Forms list's rule).
    const current = await this.lib.currentOfMany(codes);
    const known = codes.filter((c) => current.has(c));
    if (!known.length) return out;
    const [history, editions, atts, queueItems, combo] = await Promise.all([
      this.db.combinationForm.findMany({ where: { workspaceId, combinationId, lineageKey: { in: known } }, select: { lineageKey: true, version: true, status: true } }),
      this.db.formEdition.findMany({ where: { workspaceId, form: { formKey: { in: known } }, sha256: { not: null } }, select: { id: true, sha256: true, editionLabel: true, form: { select: { formKey: true } } } }),
      this.db.sourceAttachment.findMany({ where: { combinationId }, select: { id: true, sha256: true }, orderBy: { id: "asc" } }),
      this.queue.items(actor),
      this.studio.combination(combinationId) as Promise<{ draft: { problems: { where: string; item: string; level: "error" | "warning"; message: string }[] } }>,
    ]);
    const edId = new Map(editions.map((e) => [e.editionLabel, e.id]));
    const curIds = known.map((c) => current.get(c)).filter((x): x is { edition: string; sha256: string } => !!x).map((x) => edId.get(x.edition)).filter((x): x is string => !!x);
    const mapRows = curIds.length ? await this.db.formFieldMap.findMany({ where: { formEditionId: { in: curIds } }, select: { formEditionId: true, dataPath: true, version: true, status: true, outcome: true } }) : [];
    // Each form's file on this combination: the current edition's copy, else any copy of one of its editions.
    const attOf = new Map<string, { id: string; sha256: string }>(), attachedOf = new Map<string, { id: string; sha256: string }>();
    for (const code of known) {
      const shas = new Set(editions.filter((e) => e.form.formKey === code).map((e) => e.sha256!));
      const any = atts.find((a) => shas.has(a.sha256)), cur = current.get(code);
      if (any) attachedOf.set(code, any);
      const mine = (cur ? atts.find((a) => a.sha256 === cur.sha256) : undefined) ?? any;
      if (mine) attOf.set(code, mine);
    }
    // The newest field-map draft of each file (a stub pass proves the path only: not a draft).
    const jobs = attOf.size ? await this.db.draftingJob.findMany({ where: { attachmentId: { in: [...attOf.values()].map((a) => a.id) }, kind: { in: ["field_map", "reuse_map"] }, mode: { not: "STUB" } }, orderBy: { startedAt: "desc" }, select: { attachmentId: true, status: true } }) : [];
    // Review Major 2 (F3 D4): the same file being mapped in another combination.
    const elsewhere = await this.ai.mappingIndex(workspaceId, [...attOf.values()].map((a) => a.sha256));
    // Review m2: step 4 is new shared fields only (a library change of another kind is not part of a field map).
    const changeIds = queueItems.filter((i) => i.id.startsWith("change:")).map((i) => i.id.slice(7));
    const fieldChanges = new Set(changeIds.length ? (await this.db.libraryChange.findMany({ where: { id: { in: changeIds }, kind: "field" }, select: { id: true } })).map((c) => c.id) : []);
    const items = queueItems.filter((i) => !i.id.startsWith("change:") || fieldChanges.has(i.id.slice(7)));
    const canAuthor = (actor.duties as readonly string[]).includes("author");
    for (const code of known) {
      const cur = current.get(code) ?? null;
      // Review M2a: on this combination = its form line as the draft has it now; only a form with no line history yet counts
      // its attached PDF (before its setup, as the Forms tab lists it), so a removed line reads not on the combination.
      const h = history.filter((l) => l.lineageKey === code);
      const line = h.length ? (effective(h, (l) => l.lineageKey, "draft").some((l) => l.status !== "RETIRED") ? "present" as const : "none" as const) : attachedOf.has(code) ? "attached" as const : "none" as const;
      const id = cur ? edId.get(cur.edition) : undefined;
      const maps = id ? effective(mapRows.filter((m) => m.formEditionId === id), (m) => m.dataPath, "draft").filter((m) => m.status !== "RETIRED") : [];
      const att = attOf.get(code);
      const job = att ? jobs.find((j) => j.attachmentId === att.id) : undefined;
      const draft = !job ? "none" as const : ["QUEUED", "RUNNING"].includes(job.status) ? "running" as const : job.status === "COMPLETED" ? "done" as const : "stopped" as const;
      // V3 B1 review (minor): "No field map yet" is this row's own state already, so the release error is not repeated here.
      const problems = combo.draft.problems.filter((p) => p.where === "Forms" && p.item === code && !waitsForMap(p)).map((p) => ({ level: p.level, message: p.message }));
      // Review M1: form fields with no decision count only while they are in a draft (To review lists those, K1).
      out.set(code, formProgress({ form: code, combinationId, line, edition: cur?.edition ?? null, mapped: maps.filter((m) => m.outcome !== "unresolved").length,
        unresolved: maps.filter((m) => m.outcome === "unresolved" && m.status === "DRAFT").length, carried: maps.filter((m) => m.outcome === "unresolved" && m.status !== "DRAFT").length, draft, items: items.filter((i) => i.forms.includes(code)), problems, canAuthor,
        elsewhere: att ? elsewhere(att.sha256, att.id) : null }));
    }
    return out;
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
