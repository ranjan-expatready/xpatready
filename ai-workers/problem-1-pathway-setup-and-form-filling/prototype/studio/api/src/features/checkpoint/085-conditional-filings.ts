// M3-S2 (P-380, P-425, Bake plan row 18): a filing a "Who can be in this application" line adds when its rule holds on
// the person's own answers (samples/conditional-filings.json; Sample, cited word for word, Unconfirmed: expert), set on
// each combination's draft after its form setup (080) and before row 7 (090) and release 1 (110), through the screens' own services: the author saves the line's rule
// through the save the Questionnaires tab uses (Studio.savePeople; no screen builds the rule yet: Not built, a screens row), adds the fact it reads (C3.6: a fact a rule needs), the content
// reviewer accepts it and the Approver approves it into the library, and the author asks it per person in a section only
// this combination asks (so no other combination's questionnaire changes). A step refused takes the rule back, so the
// release is never refused over it, and is named on row 7 (formSetup().refused), never dropped. No model call (US$0).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { STUDIO } from "../../core.ts";
import { decide } from "../../proposals.ts";
import { RuleFacts } from "../../rule-facts.ts";
import { Screen02 } from "../../screen02.ts";
import { Studio } from "../../studio.ts";
import type { CheckpointStep } from "./_context.ts";
import { formSetup } from "./080-form-setup.ts";

export const CONDITIONAL_FILINGS = join(STUDIO, "samples", "conditional-filings.json");
/** BK-16 (P-491; QA-418): who answers the fact (`collectedFrom`, the client or the case officer, default the officer as
 *  before) and its "Why we ask" (`helpText`) are data, in the words the client reads; the officer confirms as usual. */
type Spec = { role: string; addsFiling: Record<string, unknown>; fact: { fact: string; label: string; meaning: string; valueType: string; question: string; collectedFrom?: string; helpText?: string } };
type Line = { role: string; addsFiling?: unknown; [k: string]: unknown };

export default {
  async run(ctx) {
    const { db, workspaceId, author, sme, approver } = ctx;
    const refused = formSetup(ctx).refused;
    let all: Record<string, Spec | string>;
    try { all = JSON.parse(readFileSync(CONDITIONAL_FILINGS, "utf8")); }
    catch (e) { refused.push(`samples/conditional-filings.json could not be read, so no filing a line adds was set: ${(e as Error).message.slice(0, 200)}`); return; }
    const studio = ctx.get(Studio), ruleFacts = ctx.get(RuleFacts), library = ctx.get(Screen02);
    const people = async (id: string) => (await db.combination.findUniqueOrThrow({ where: { id }, select: { participants: true, participantsVersion: true } }));
    const save = async (id: string, lines: Line[]) => studio.savePeople(author, id, { participants: lines, version: (await people(id)).participantsVersion, confirmRemove: true });
    for (const c of ctx.six.combinations) {
      const key = ctx.keyOf.get(c.id), spec = key ? all[key] : undefined;
      if (!spec || typeof spec !== "object") continue;
      const before = (await people(c.id)).participants as Line[];
      if (!before.some((l) => l.role === spec.role)) { refused.push(`${c.label}: no "${spec.role}" line in Who can be in this application, so the filing it adds was not set`); continue; }
      const f = spec.fact, rule = `adds_filing.${spec.role}`;
      try {
        await ctx.timed("filing a line adds (M3-S2)", async () => {
          await save(c.id, before.map((l) => (l.role === spec.role ? { ...l, addsFiling: spec.addsFiling } : l)));
          if (!(await db.canonicalField.count({ where: { workspaceId, canonicalFieldKey: f.fact, status: { in: ["DRAFT", "PUBLISHED"] } } }))) {
            const { proposalId } = await ruleFacts.add(author, c.id, { fact: f.fact, rule, label: f.label, meaning: f.meaning, valueType: f.valueType });
            await decide(db, ctx.audit, sme, workspaceId, [proposalId], { action: "accept", reason: "Accepted by the sample loader: the fact a filing a line adds reads (Sample, Unconfirmed: expert; M3-S2)." });
            for (const ch of await db.libraryChange.findMany({ where: { workspaceId, status: "WAITING", kind: "field", key: f.fact }, select: { id: true } }))
              await library.decideLibraryChange(approver, ch.id, "approve", "Approved by the sample loader as the second person (M3-S2, the fact a filing a line adds reads).");
          }
          if (!(await db.canonicalField.count({ where: { workspaceId, canonicalFieldKey: f.fact, status: { in: ["DRAFT", "PUBLISHED"] } } }))) throw new Error(`${f.fact} did not reach the library`);
          // Asked once per person, by whoever the data names (the case officer unless it says the client; BK-16, QA-418), in a
          // section this combination asks and no other does (QA-227: the library's questions are shared, so a section another
          // combination asks would put the question on its cases too).
          if (!(await db.sectionQuestion.count({ where: { workspaceId, canonicalFieldKey: f.fact, status: { not: "RETIRED" } } }))) {
            const others = new Set((await db.sqrSectionSelection.findMany({ where: { workspaceId, combinationId: { not: c.id } }, select: { sectionKey: true } })).map((s) => s.sectionKey));
            const own = (await db.sqrSectionSelection.findMany({ where: { combinationId: c.id }, orderBy: { sectionOrder: "asc" }, select: { sectionKey: true } })).find((s) => !others.has(s.sectionKey));
            if (!own) throw new Error("no section is asked by this combination alone, so the question would reach other combinations' cases");
            // Rule only (CI on #1513: QA-144, B78): a question in a section the row selects is otherwise asked of every
            // applicant, the principal too, though only the child's line rule reads it; rule only, it is asked of each
            // person the rule decides (engine/render.ts deciders), so Preview and the case ask the same people.
            await studio.placeField(author, f.fact, { sectionKey: own.sectionKey, collectedFrom: f.collectedFrom ?? "staff_working_view", repeats: "per_person", tier: "case", questionText: f.question, ...(f.helpText ? { helpText: f.helpText } : {}), ruleOnly: true });
          }
        });
        ctx.log.push(`  ${key}: ${spec.role.replace(/_/g, " ")} line adds "${String(spec.addsFiling.filing)}" when its rule holds (${f.fact} asked per person; samples/conditional-filings.json; Sample, Unconfirmed: expert)`);
      } catch (e) {
        refused.push(`${c.label}: the filing the ${spec.role.replace(/_/g, " ")} line adds was taken back: ${ctx.said(e)}`);
        try { await save(c.id, ((await people(c.id)).participants as Line[]).map((l) => { if (l.role !== spec.role) return l; const { addsFiling: _a, ...rest } = l; return rest as Line; })); } catch (e2) { refused.push(`${c.label}: taking the rule back was refused: ${ctx.said(e2)}`); }
      }
    }
  },
} satisfies CheckpointStep;
