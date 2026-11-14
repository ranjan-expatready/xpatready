// QA-144 (review M2, R2-m1): a section is chosen on a combination only when every applying person answers all of it anyway.
// After every placement (placeFromFormParts, and the checkpoint's fact only a rule reads), the chosen sections are checked
// again.
import { FILING } from "../../../../contracts/resolver.ts";
import { previewRender } from "../../../../engine/coverage.ts";
import { roleOf } from "../../../../engine/resolver.ts";
import { buildSnapshot } from "../../../../engine/snapshot.ts";
import type { Actor, Db } from "../../core.ts";
import type { Studio } from "../../studio.ts";
import type { PlacedFromParts } from "./_parts.ts";

/** R2-m1: checks again every section chosen on a combination, and on any other combination that chose one of the sections
 *  just placed into (`touched`), and unchooses one that no longer qualifies (everyoneAnswers); on this combination it
 *  also chooses a touched section that now does. Exported for a placement made outside placeFromFormParts (the
 *  checkpoint's fact only a rule reads, review R1-m4). */
export async function keepChosenEveryones(db: Db, studio: Studio, author: Actor, combinationId: string, touched: Set<string>, out: Pick<PlacedFromParts, "refused" | "selected" | "unselected">, onlyTouched = false) {
  const { workspaceId } = await db.combination.findUniqueOrThrow({ where: { id: combinationId }, select: { workspaceId: true } });
  const live = await db.sectionQuestion.findMany({ where: { workspaceId: workspaceId, status: { not: "RETIRED" } }, select: { sectionKey: true, canonicalFieldKey: true } });
  const others = await db.sqrSectionSelection.findMany({ where: { sectionKey: { in: [...touched] }, workspaceId: workspaceId, combinationId: { not: combinationId }, combination: { retiredAt: null } }, select: { combinationId: true } });
  // Each unchosen section is reported with its combination's own label, from one source (review R2-m2).
  const nameOf = new Map((await db.combination.findMany({ where: { id: { in: [combinationId, ...others.map((x) => x.combinationId)] } }, select: { id: true, label: true } })).map((x) => [x.id, x.label]));
  for (const id of [combinationId, ...new Set(others.map((x) => x.combinationId))]) {
    const qualifies = await everyoneAnswers(db, workspaceId, id, live);
    const chosen = new Set((await db.sqrSectionSelection.findMany({ where: { combinationId: id }, select: { sectionKey: true } })).map((x) => x.sectionKey));
    // P-598: a late placement (onlyTouched) checks again only the sections it placed into, on this combination too.
    for (const sec of id === combinationId && !onlyTouched ? chosen : [...chosen].filter((s) => touched.has(s))) {
      if (qualifies(sec)) continue;
      try { await studio.selectSection(author, id, sec, false); out.unselected.push(`${sec} (on ${nameOf.get(id)})`); } catch (err) { out.refused.push(`unchoose section ${sec}: ${String((err as Error).message).slice(0, 200)}`); }
    }
    if (id !== combinationId) continue;
    for (const sec of touched) {
      if (chosen.has(sec) || !qualifies(sec)) continue;
      try { await studio.selectSection(author, combinationId, sec, true); out.selected.push(sec); } catch (err) { out.refused.push(`section ${sec}: ${String((err as Error).message).slice(0, 200)}`); }
    }
  }
}

/** Whether every applying person of a combination answers all of a section anyway (review M2, R2-M1): every question in
 *  it is a case fact a form that surely applies reads for the application, or a fact such a form reads for every
 *  applying person role. Read from the combination's draft as it is now. */
async function everyoneAnswers(db: Db, workspaceId: string, combinationId: string, live: { sectionKey: string; canonicalFieldKey: string }[]) {
  const after = (await buildSnapshot(db, workspaceId, combinationId, "draft")).snapshot;
  const { people, r } = previewRender(after);
  const applying = new Set(people.filter((x) => x.role && x.role !== "representative" && x.applies !== false).map((x) => x.role!));
  const readFor = new Map<string, Set<string>>();
  // Only a form that surely applies with no answer given counts (review R2-M1): a conditional form, or a form from an age
  // on, may not, so its facts never make a section "everyone answers".
  for (const f of r.coverage) if (f.applies === true) for (const bx of f.boxes) if (bx.fact && bx.about) (readFor.get(bx.fact) ?? readFor.set(bx.fact, new Set()).get(bx.fact)!).add(bx.about === FILING ? FILING : roleOf(people, bx.about));
  const everyone = (fact: string) => fact.startsWith("case.") ? !!readFor.get(fact)?.has(FILING) : [...applying].every((role) => readFor.get(fact)?.has(role));
  return (sectionKey: string) => live.filter((q) => q.sectionKey === sectionKey).every((q) => everyone(q.canonicalFieldKey));
}
