// B52: the application form's Yes/No form fields worked out from other answers, each asked as its own question in the
// form's words (To review › Form fields), with the library's field of the same name when it has one. The form-field
// step is the one a person takes there, as the same service (no extra provider). QA-165: each box's "followUps" (the details
// the form asks only after a Yes) get their condition in 230-own-yes-no-follow-ups.ts, once the placement step (200) asked them.
import { normalizeLabel } from "../../../../../contracts/programs.ts";
import { OwnQuestions } from "../../../own-question.ts";
import { OWN_YES_NO_NEAR, OWN_YES_NO_REASON, type OwnYesNo } from "../../../own-yes-no.ts";
import { type CombinationContext, type CombinationStep, formSetup } from "../080-form-setup.ts";
import type { CheckpointContext } from "../_context.ts";

/** The setup's Yes/No form fields asked as their own questions (`boxes`, from samples/own-yes-no.json), as the author on
 *  To review › Form fields. Exported for release 1 (110), which asks the "later" ones (P-598) after the other releases. */
export async function askOwnYesNo(ctx: CheckpointContext, setup: NonNullable<CombinationContext["setup"]>, boxes: OwnYesNo[]) {
  const { db, workspaceId } = ctx;
  for (const y of boxes) {
    const ed = await db.formEdition.findFirst({ where: { workspaceId, channel: "PDF", form: { formKey: y.form ?? setup.application } }, orderBy: { editionLabel: "desc" }, select: { id: true } });
    const yesNo = await db.canonicalField.findMany({ where: { workspaceId, status: { in: ["DRAFT", "PUBLISHED"] }, valueType: "yes_no", groupKey: "person" }, select: { canonicalFieldKey: true, label: true } });
    // Review M1 on #1272 (QA-318): a field the table names (the same question another form already asks) is that field.
    if (y.field && !yesNo.some((f) => f.canonicalFieldKey === y.field)) { formSetup(ctx).refused.push(`${y.label}: the library has no Yes/No field ${y.field} about the person, so it is not asked twice under a new one`); continue; }
    const same = y.field ? { canonicalFieldKey: y.field } : yesNo.find((f) => f.label && normalizeLabel(f.label) === normalizeLabel(y.label));
    try { if (!ed) throw new Error(`${y.form ?? setup.application} has no PDF edition in the library`); await new OwnQuestions(db, ctx.audit).ask(ctx.author, ed.id, { dataPath: y.dataPath, reason: OWN_YES_NO_REASON, ...(same ? { field: same.canonicalFieldKey } : { label: y.label, meaning: y.meaning, nearReason: OWN_YES_NO_NEAR }), ...(y.question ? { question: y.question } : {}), ...(y.person ? { person: y.person } : {}) }); } catch (e) { formSetup(ctx).refused.push(`${y.label}: ${ctx.said(e)}`); }
  }
}

export default {
  async run(ctx, cc) {
    const { setup } = cc;
    if (!setup) return;
    // P-598: a "later" box is asked by release 1 (110), after every other combination's release, never here.
    await askOwnYesNo(ctx, setup, (setup.ownYesNo ?? []).filter((y) => !y.later));
  },
} satisfies CombinationStep;
