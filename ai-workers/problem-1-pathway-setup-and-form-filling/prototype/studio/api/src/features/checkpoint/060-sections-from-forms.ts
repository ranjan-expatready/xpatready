// C10.1 row 7 (QA-144 slice 1): sections from each form's own parts, by the C3.4 rules pass (no AI, US$0), accepted by
// the author on To review; the approver approves them with the other new items in row 5 (070). Row 7 itself is said
// once each combination's questions, form fields and form rules are set up (080, 090).
import { stateOf } from "../../features.ts";
import { FormMasters } from "../../form-masters.ts";
import { FORM_SETUP } from "../../form-setup.ts";
import { decide } from "../../proposals.ts";
import { type HeldSectionName, namedReason, nameOfHeld, readHeldSectionNames } from "../../section-names.ts";
import type { CheckpointContext, CheckpointStep } from "./_context.ts";
import { LATER_BY_KEY } from "./040-field-map-review.ts";
import { familyForm } from "./_family-form.ts";

/** QA-144 slices 1–4 (tech lead on #798; B79): the combinations the configured checkpoint sets up from their forms' own
 *  parts are the ones the form setup table holds (P-319: no combination key here). The others follow, one slice each. */
const SET_UP_FROM_FORMS = new Set(Object.keys(FORM_SETUP));

export const sections = stateOf(() => ({
  /** The six's combinations set up from their forms (SET_UP_FROM_FORMS), in the six's order. */
  fromForms: [] as { id: string; label: string; files: number }[],
  made: [] as string[], reused: [] as string[], refused: [] as string[],
  /** QA-206: sections the forms print no heading over, left waiting on To review for a person to name. */
  held: [] as string[],
  /** B78: sections named by the name a person gives them (samples/section-names.json), through the same edit. */
  namedByPerson: [] as HeldSectionName[],
  /** BK-16 (P-496): sections the form prints a heading over that a person renamed (samples/section-names.json), so a later
   *  source's part does not join another combination's section of that printed name. */
  renamedByPerson: [] as HeldSectionName[],
  /** The marital status list IMM 5409's rule reads (ruling 3), once accepted; the first combination's form lines link it
   *  to the shared field and clear it (combination/110). */
  maritalList: null as string | null,
  heldNames: null as ReturnType<typeof readHeldSectionNames> | null,
}));

/** The sections of some of a combination's forms, drafted from their own parts by the rules pass and accepted one at a
 *  time (C10.1 row 9, 130, runs it again for the family information form release 2 files). */
export async function sectionsFrom(ctx: CheckpointContext, c: { id: string }, forms: { id: string; fileName: string; edition: string | null }[], o: { lists?: boolean } = {}) {
  const { db, audit, workspaceId, author, said } = ctx;
  const s = sections(ctx);
  const heldNames = s.heldNames!;
  for (const a of forms) { try { await ctx.get(FormMasters).draft(author, a.id, { mode: "rules" }); } catch (e) { s.refused.push(`${a.fileName}: ${said(e)}`); } }
  // Only these forms' own rules runs (review m2 on #1009: release 2 reads IMM 5645's, never release 1's leftovers).
  const runs = (await db.draftingJob.findMany({ where: { combinationId: c.id, kind: "masters_edition", attachmentId: { in: forms.map((f) => f.id) } }, select: { id: true } })).map((j) => j.id);
  // The sections, and the marital status list IMM 5409's rule reads (ruling 3); the other answer lists stay on To review.
  const take = (await db.proposalItem.findMany({ where: { runId: { in: runs }, status: "waiting", kind: { in: ["section", "answer_list"] } }, orderBy: [{ createdAt: "asc" }, { identityKey: "asc" }], select: { id: true, kind: true, payload: true, work: true, reason: true, formEdition: true } }))
    .filter((p) => p.kind === "section" || (o.lists !== false && (p.payload as { label?: string }).label === "Marital status"));
  // One at a time, as on its own page: a rules item is not Ready, so it is never accepted in a batch.
  for (const p of take) {
    // QA-206 (tech lead on #883; AGENTS rule 4: Sample, never guessed): a section the rules pass holds for a name is
    // named only by print, through the same naming edit a person uses: with the heading that edition prints over it
    // (another part prints it too). With no printed heading it takes the name a person gives it (B78); with none of
    // those either it stays waiting on To review and is listed as refused.
    const held = p.kind === "section" ? (p.work as { unnamed?: boolean; heading?: string; printed?: string } | null) : null;
    // BK-16 (P-496): an entry of samples/section-names.json also names a section the form prints a heading over (a person
    // renames it there), so a later source's part never joins, by its printed name, a section other combinations chose.
    const given = p.kind === "section" ? nameOfHeld(heldNames, p.formEdition, (p.payload as { fieldKeys?: string[] }).fieldKeys?.[0]) : null;
    if (held?.unnamed && !held.heading && !given) { s.held.push((p.payload as { label?: string }).label ?? "section"); continue; }
    try {
      const landed = (await decide(db, audit, author, workspaceId, [p.id], given
        ? { action: "edit", payload: { ...(p.payload as object), label: given.name }, reason: namedReason(given) }
        : held?.unnamed
        ? { action: "edit", payload: { ...(p.payload as object), label: held.heading }, reason: `Named by the sample loader from the heading the form prints over it, "${held.printed ?? held.heading}" (Sample); rename it on Shared library if a person words it better.` }
        : { action: "accept", reason: "Accepted by the sample loader: drafted from the form's own parts (rules, US$0); rename it on Shared library if a person words it better." })).items[0] as { landedAs?: string; joined?: boolean } | undefined;
      if (given) (held?.unnamed && !held.heading ? s.namedByPerson : s.renamedByPerson).push(given);
      // A name the library already holds lands on that section, so it is reused, not added.
      if (p.kind === "section") (landed?.joined ? s.reused : s.made).push(landed?.landedAs ?? ""); else s.maritalList ??= landed?.landedAs ?? null;
    } catch (e) {
      // The card's own words: a section the library already holds is rejected here and that section reused (the
      // placement step reads its boxes into it).
      const same = /already in the library as (\S+?)[ )]/.exec(said(e))?.[1];
      if (!same) { s.refused.push(`${(p.payload as { label?: string }).label ?? p.kind}: ${said(e)}`); continue; }
      await decide(db, audit, author, workspaceId, [p.id], { action: "reject", reason: `The library already holds this ${p.kind === "section" ? "section" : "list"} (${same}): reused, not added again.` });
      if (p.kind === "section") s.reused.push(same);
    }
  }
}

export default {
  async run(ctx) {
    const s = sections(ctx);
    s.fromForms = ctx.six.combinations.filter((c) => SET_UP_FROM_FORMS.has(ctx.keyOf.get(c.id) ?? ""));
    s.heldNames = readHeldSectionNames();
    await ctx.timed("sections from the forms' parts (rules)", async () => {
      const later: { c: (typeof s.fromForms)[number]; forms: { id: string; fileName: string; edition: string | null }[] }[] = [];
      for (const c of s.fromForms) {
        // The family information form the channel takes off (FAMILY_FORM_BY_CHANNEL) gives no sections (review m2).
        const notFiled = (await familyForm(ctx.db, c.id, ctx.keyOf.get(c.id)))?.other ?? null;
        const forms = (await ctx.db.sourceAttachment.findMany({ where: { combinationId: c.id, kind: "Form" }, orderBy: { createdAt: "asc" }, select: { id: true, fileName: true, edition: true } }))
          .filter((a) => !notFiled || !(a.edition ?? "").startsWith(`${notFiled} (`));
        // BK-16 (P-496): a source the combination marks "later" (samples/wave1.json) gives its sections after every
        // combination's own, so the shared sections the others' forms make are made first and never regrouped by it.
        const held = LATER_BY_KEY.get(ctx.keyOf.get(c.id) ?? "");
        await sectionsFrom(ctx, c, forms.filter((a) => !held?.has(a.fileName)));
        const hold = forms.filter((a) => held?.has(a.fileName));
        if (hold.length) later.push({ c, forms: hold });
      }
      for (const x of later) await sectionsFrom(ctx, x.c, x.forms);
    });
  },
} satisfies CheckpointStep;
