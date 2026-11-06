// A fact only a rule reads is asked beside the fact it is about (IRM 0002's, beside the person's sex or gender as the
// forms read it, else their date of birth; IMM 5646's, beside the date of birth).
import { FORM_SETUP } from "../../../form-setup.ts";
import { keepChosenEveryones } from "../../../form-part-placements.ts";
import { Studio } from "../../../studio.ts";
import { type CombinationStep, formSetup } from "../080-form-setup.ts";
import { placed } from "./_placed.ts";

export default {
  async run(ctx, cc) {
    const { db, workspaceId, author, said } = ctx;
    const out = formSetup(ctx), p = placed(cc).p!, studio = ctx.get(Studio);
    for (const rf of FORM_SETUP[cc.key ?? ""]?.ruleFacts ?? []) {
      // QA-227: a fact another combination asked already keeps its one placement (the library's questions are shared).
      if (await db.sectionQuestion.count({ where: { workspaceId, canonicalFieldKey: rf.fact, status: { not: "RETIRED" } } })) continue;
      const at = rf.beside ?? ["person.sex", "person.gender", "person.date_of_birth"];
      const near = await db.sectionQuestion.findMany({ where: { workspaceId, canonicalFieldKey: { in: at } }, select: { canonicalFieldKey: true, sectionKey: true } });
      const beside = at.map((k) => near.find((x) => x.canonicalFieldKey === k)).find(Boolean);
      // R2-m1 after it too (review R1-m4): its section may be a chosen one, and only a conditional form reads the fact.
      if (beside) { try { await studio.placeField(author, rf.fact, { sectionKey: beside.sectionKey, collectedFrom: "client_questionnaire", repeats: rf.fact.startsWith("case.") ? "once_per_case" : "per_person", tier: "case" }); out.placedFacts.push(rf.fact); await keepChosenEveryones(db, studio, author, cc.c.id, new Set([beside.sectionKey]), p); } catch (e) { out.refused.push(`${rf.fact}: ${said(e)}`); } }
      else out.refused.push(`${rf.fact}: none of ${at.join(", ")} is asked in a section`);
    }
  },
} satisfies CombinationStep;
