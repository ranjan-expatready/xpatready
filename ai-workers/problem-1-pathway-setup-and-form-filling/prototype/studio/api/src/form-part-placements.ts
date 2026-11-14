// QA-144 (P-158, P-120; tech lead on #798): a rules step, no AI, US$0. Each fact a combination's forms need and nobody is
// asked for (engine/coverage.ts, engine/validate.ts) is placed in the library section that groups its form box, as the author, through the
// same placeField a person uses. The sections are the C3.4 rules pass's (api/src/form-masters.ts): each accepted section
// proposal names the boxes of one form edition it groups. A box no section names takes the section of the nearest named
// box on the same form (the longest shared data path). Who fills it: the client's questionnaire; how often: once per case
// for a case fact, per row for a list row about the form's own subject, per person otherwise. A section is chosen on the
// combination only when every applying person answers all of it anyway (see the end). The words are the library field's own.
// QA-144 part 1 (P-318 (6), P-322): the Smart questionnaire tab's step runs it for a person (POST
// /api/combinations/:id/place-from-form-parts, below); the configured checkpoint calls the same function
// (features/checkpoint/combination/200-place-from-parts.ts, 130-release-two.ts).
// B120 (P-376 (3)): the passes are one file each in api/src/features/placement/ (10-form-boxes, 20-condition-facts),
// run in their number order; the chosen-sections check stays last (features/placement/_chosen-sections.ts).
import { Controller, Headers, HttpCode, HttpStatus, Inject, Param, Post } from "@nestjs/common";
import { join } from "node:path";
import { buildSnapshot } from "../../engine/snapshot.ts";
import { actorOf, Audit, Db, fail, need, Workspace, type Actor } from "./core.ts";
import { FEATURES_DIR, featureSteps } from "./features.ts";
import { keepChosenEveryones } from "./features/placement/_chosen-sections.ts";
import type { PlacedFromParts, PlacementPass } from "./features/placement/_parts.ts";
import { Studio } from "./studio.ts";

export type { PlacedFromParts };
export { keepChosenEveryones };
/** Read once at start-up, so a bad pass file stops it with its name. */
const PASSES = await featureSteps<PlacementPass>(join(FEATURES_DIR, "placement"));

/** `leaveOut` (BK-16, P-496; the configured checkpoint's loader only, never the screen's step): forms whose boxes and line
 *  this run reads as if not yet on the combination, so a form the loader places in a later pass (a source marked "later"
 *  in samples/wave1.json) does not put its questions in the shared library before every combination's own forms. */
/** `onlyPlacedInto` (P-598; the configured checkpoint's loader only, after release 1): check again only the sections this
 *  run places into, on this combination as on the others, so a late placement never re-judges a choice it did not touch. */
export async function placeFromFormParts(db: Db, studio: Studio, author: Actor, combinationId: string, leaveOut: ReadonlySet<string> = new Set(), onlyPlacedInto = false): Promise<PlacedFromParts> {
  const c = await db.combination.findUniqueOrThrow({ where: { id: combinationId }, select: { workspaceId: true } });
  const built = (await buildSnapshot(db, c.workspaceId, combinationId, "draft")).snapshot;
  const kept = (x: { form_number?: string }) => !leaveOut.has(x.form_number ?? "");
  const snapshot = leaveOut.size ? { ...built, forms: built.forms.filter(kept), field_maps: built.field_maps.filter(kept) } : built;
  const out: PlacedFromParts = { placed: [], noSection: [], refused: [], selected: [], unselected: [] };
  for (const pass of PASSES) await pass.run({ db, studio, author, combinationId, workspaceId: c.workspaceId, snapshot, out });
  // A section is chosen on the combination (so the author can order it: C4.1 Move up / Move down) only when choosing it
  // asks nobody anything a form does not already ask (review M2): every question in it, from the shared library, is a
  // case fact or a fact some form reads for every applying person role. Any other section stays unchosen: its questions
  // still go out where a form or a rule reads their fact (engine/snapshot.ts "used"), and only to whom it applies.
  // R2-m1 (QA-144 slice 2): the library's sections are shared, so a placement here can put a question into a section
  // another combination (or this one, earlier) has chosen. Every section chosen on this combination, and on any other
  // combination that chose a section placed into now, is checked again, and one that no longer qualifies is unchosen.
  await keepChosenEveryones(db, studio, author, combinationId, new Set(out.placed.map((x) => x.section)), out, onlyPlacedInto);
  return out;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** One run at a time per combination: a second press while one runs is refused, never placed twice. */
const running = new Set<string>();

@Controller("api")
export class FormPartPlacementsController {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Studio) private readonly studio: Studio, @Inject(Workspace) private readonly ws: Workspace, @Inject(Audit) private readonly audit: Audit) {}

  /** The Smart questionnaire tab's "Ask them in their form's sections" (rules, no AI, US$0): the author only, on a live
   *  combination of this workspace. What it placed, what no section groups and what a rule refused come back in words. */
  @Post("combinations/:id/place-from-form-parts") @HttpCode(200)
  async place(@Headers("x-actor") a: string | undefined, @Param("id") id: string) {
    const author = actorOf(a);
    need(author, "author");
    const workspaceId = await this.ws.id();
    const c = UUID.test(id) ? await this.db.combination.findUnique({ where: { id }, select: { workspaceId: true, label: true, combinationKey: true, retiredAt: true } }) : null;
    if (!c || c.workspaceId !== workspaceId) fail("That combination does not exist (it may have been removed by a reset).", HttpStatus.NOT_FOUND);
    if (c!.retiredAt) fail(`"${c!.label}" is retired: nothing is placed on it.`, HttpStatus.CONFLICT);
    if (running.has(id)) fail("This step is already running on this combination: wait for it to finish.", HttpStatus.CONFLICT);
    running.add(id);
    try {
      const out = await placeFromFormParts(this.db, this.studio, author, id);
      const sections = new Set(out.placed.map((x) => x.section)).size;
      // Review m3: a press that changes nothing writes no history line (as studio.ts does for a no-op).
      if (out.placed.length || out.selected.length || out.unselected.length || out.refused.length || out.noSection.length) await this.audit.log(workspaceId, author.id, "ran", "placement step", c!.combinationKey, `${author.name} asked ${out.placed.length} answer${out.placed.length === 1 ? "" : "s"} of "${c!.label}" in the sections of their form fields (${sections} section${sections === 1 ? "" : "s"}; rules, US$0)${out.noSection.length ? `; ${out.noSection.length} with no section that groups their form field` : ""}${out.unselected.length ? `; ${out.unselected.length} section${out.unselected.length === 1 ? "" : "s"} no longer chosen (not every person answers ${out.unselected.length === 1 ? "it" : "them"} now)` : ""}${out.refused.length ? `; ${out.refused.length} refused by a rule` : ""}`, { placed: out.placed.length, noSection: out.noSection, refused: out.refused, selected: out.selected, unselected: out.unselected }, id);
      return { ...out, sections };
    } finally { running.delete(id); }
  }
}
