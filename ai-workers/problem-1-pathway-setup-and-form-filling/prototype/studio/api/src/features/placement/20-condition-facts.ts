// B82 (tech lead's ruling on #1058): a fact only a document line's condition reads, placed beside the fact it is about.
import { conditionFactsToAsk } from "../../../../engine/coverage.ts";
import type { PlacementPass } from "./_parts.ts";

export default {
  async run({ db, studio, author, workspaceId, snapshot, out }) {
    // B82 (tech lead's ruling on #1058): a fact only a document line's condition reads has no form field to group it. It is
    // asked beside the fact it is about, as a fact only a rule reads is (features/checkpoint/combination/210-rule-facts-beside.ts), so the line can reach a person.
    // No form reads it, so it stays off the question list a paid run replays on (api/src/pqr-drafts.ts questionList).
    const conditionFacts = conditionFactsToAsk(snapshot);
    if (conditionFacts.length) {
      const at = ["person.sex", "person.gender", "person.date_of_birth"];
      const near = await db.sectionQuestion.findMany({ where: { workspaceId, canonicalFieldKey: { in: at }, status: { in: ["DRAFT", "PUBLISHED"] } }, orderBy: [{ version: "desc" }, { sectionKey: "asc" }], select: { canonicalFieldKey: true, sectionKey: true } });
      const beside = at.map((k) => near.find((x) => x.canonicalFieldKey === k)).find(Boolean)?.sectionKey;
      for (const { fact } of conditionFacts) {
        if (!beside) { out.noSection.push(fact); continue; }
        const repeats = fact.startsWith("case.") ? "once_per_case" : "per_person";
        try { await studio.placeField(author, fact, { sectionKey: beside, collectedFrom: "client_questionnaire", repeats, tier: "case" }); out.placed.push({ fact, section: beside, repeats }); }
        catch (err) { out.refused.push(`${fact}: ${String((err as Error).message).slice(0, 200)}`); }
      }
    }
  },
} satisfies PlacementPass;
