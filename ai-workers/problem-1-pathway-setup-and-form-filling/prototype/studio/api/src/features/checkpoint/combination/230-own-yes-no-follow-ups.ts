// QA-165 (C7.2, C7.3; diagnosis on #1256, section A cause 1): each Yes/No form field asked as its own question (140) leads to
// details the form asks only after a Yes ("followUps" in samples/own-yes-no.json). Once the placement step (200) has asked
// them, each gets the question condition "show only when <the Yes/No question> is Yes", through Questionnaires › the
// question's condition (Studio.placeField, the screen's own service), so a No hides them and the form's Yes/No is written N
// (engine/runtime/forms.ts markNothingRecorded, gateOf). Runs after 200 because 140 comes before any detail is placed.
// A follow-up the form does not tie to the box (followUpGround) is refused, never conditioned (AGENTS rule 4).
// The library's questions are shared, so every form that reads a detail, in every combination, must fill it under the same
// condition, or the release refuses ("Hiding a value a form reads", engine/validate.ts). Each such form field is confirmed
// through B86's door (api/src/form-field-condition.ts, To review › Form fields: the author proposes, a second person
// approves; the field's own words, "Only when … = Y", are what is confirmed), or asked as its deciding question (B88) when
// it is a worked-out Yes/No. Done for this combination, and for any set up before the combination that conditions them.
import { FormFieldConditions } from "../../../form-field-condition.ts";
import { OWN_YES_NO, followUpGround, yesGate } from "../../../own-yes-no.ts";
import { Screen02 } from "../../../screen02.ts";
import { Studio } from "../../../studio.ts";
import { sections } from "../060-sections-from-forms.ts";
import { type CombinationStep, formSetup } from "../080-form-setup.ts";
import type { CheckpointContext } from "../_context.ts";

type Ctx = CheckpointContext;
const placementOf = async (db: Ctx["db"], workspaceId: string, fact: string) =>
  (await db.sectionQuestion.findMany({ where: { workspaceId, lineageKey: fact, status: { in: ["DRAFT", "PUBLISHED"] } }, orderBy: { version: "desc" } }))
    .sort((a, b) => (a.status === "DRAFT" ? -1 : 0) - (b.status === "DRAFT" ? -1 : 0))[0] ?? null;
/** Every detail any combination's data names, wherever its Yes/No question is. */
const ALL_FOLLOW_UPS = [...new Set(Object.values(OWN_YES_NO).flatMap((c) => c.boxes.flatMap((b) => b.followUps ?? [])))];

/** Each form field of one combination that reads a conditioned detail holds the same condition (B86) or asks its deciding
 *  question (B88), proposed by the author and approved by the approver. A field already doing so is left as it is. */
async function confirmReaders(ctx: Ctx, combinationId: string) {
  const { db, workspaceId, author, approver, said } = ctx, out = formSetup(ctx), door = ctx.get(FormFieldConditions), library = ctx.get(Screen02);
  for (const fact of ALL_FOLLOW_UPS) {
    const p = await placementOf(db, workspaceId, fact);
    if (!p?.predicateJson || p.conditionEffect !== "SHOW") continue;
    const q = await door.list(combinationId, fact).catch(() => null); // this combination's forms do not read it: nothing to hold
    for (const r of q?.rows ?? []) {
      if (r.state === "confirmed" || r.state === "asked") continue;
      // Review m2 on #1318: the door's own warning (the field's words name another question) is a person's call, never the loader's.
      if (r.warning) { out.refused.push(`${r.form} ${r.caption || r.data_path}: ${r.warning} Left for a person on To review › Form fields.`); continue; }
      const ask = !r.can_confirm && r.can_ask;
      if (!r.can_confirm && !ask) { out.refused.push(`${r.form} ${r.caption || r.data_path}: cannot hold "${q!.sentence}" (${r.why ?? r.state}), so it is left for a person on To review › Form fields`); continue; }
      try {
        const ch = await door.propose(author, { combinationId, fact, formEditionId: r.form_edition_id, dataPath: r.data_path, ...(ask ? { ask: true } : {}), reason: "QA-165: the form asks this only after a Yes; its own words say so (Sample, Unconfirmed: expert)" });
        await library.decideLibraryChange(approver, ch.id, "approve", "Approved by the sample loader as the second person: the form field's own words say the same (QA-165; Sample, Unconfirmed: expert).");
      } catch (e) { out.refused.push(`${r.form} ${r.caption || r.data_path}: ${said(e)}`); }
    }
  }
}

export default {
  async run(ctx, cc) {
    const { setup } = cc;
    const boxes = (setup?.ownYesNo ?? []).filter((y) => y.followUps?.length);
    const { db, workspaceId, author, said } = ctx, out = formSetup(ctx), studio = ctx.get(Studio);
    if (setup && boxes.length) {
      const ed = await db.formEdition.findFirst({ where: { workspaceId, channel: "PDF", form: { formKey: setup.application } }, orderBy: { editionLabel: "desc" }, select: { id: true } });
      const rows = ed ? await db.formFieldMap.findMany({ where: { workspaceId, formEditionId: ed.id, status: { in: ["DRAFT", "PUBLISHED"] } }, orderBy: { version: "desc" }, select: { dataPath: true, canonicalFieldKey: true, transform: true, evidenceQuote: true } }) : [];
      if (!ed) out.refused.push(`${setup.application}: no PDF edition, so no Yes/No question's details are conditioned`);
      const entries = [...new Map(rows.map((r) => [r.dataPath, { data_path: r.dataPath, fact: r.canonicalFieldKey, transform: r.transform, quote: r.evidenceQuote }])).values()];
      for (const y of ed ? boxes : []) {
        const box = entries.find((e) => e.data_path === y.dataPath), gate = box?.fact;
        if (!box || !gate) { out.refused.push(`${y.label}: its form field asks no question yet, so its details stay unconditioned`); continue; }
        // The form's own question, as its map quotes it (P-170), for the condition's words.
        const words = (box.quote ?? "").replace(/\s+\?$/, "?").trim() || y.question || y.label;
        for (const fact of y.followUps ?? []) {
          if (!followUpGround(box, entries, fact)) { out.refused.push(`${fact}: ${setup.application} does not ask it after "${words}" (not in the box's step or block)`); continue; }
          const p = await placementOf(db, workspaceId, fact);
          if (!p) { out.refused.push(`${fact}: not asked in the library, so it takes no condition`); continue; }
          const condition = yesGate(gate);
          if (JSON.stringify(p.predicateJson) === JSON.stringify(condition) && p.conditionEffect === "SHOW") continue; // already so
          try {
            await studio.placeField(author, fact, { sectionKey: p.sectionKey, collectedFrom: p.collectedFrom, repeats: p.repeats, tier: p.tier, questionText: p.questionText ?? undefined, helpText: p.helpText ?? undefined, ruleOnly: p.ruleOnly,
              condition, conditionEffect: "SHOW", conditionPlain: `Asked only when "${words}" is Yes` });
          } catch (e) { out.refused.push(`${fact}: ${said(e)}`); }
        }
      }
      // The combinations set up before this one already ran this step, before any detail was conditioned.
      const all = sections(ctx).fromForms, at = all.findIndex((c) => c.id === cc.c.id);
      for (const c of all.slice(0, Math.max(0, at))) await confirmReaders(ctx, c.id);
    }
    await confirmReaders(ctx, cc.c.id);
  },
} satisfies CombinationStep;
