// QA-144 (P-158, P-120; tech lead on #798): a rules step, no AI, US$0. Each fact a combination's forms need and nobody is
// asked for (engine/coverage.ts, engine/validate.ts) is placed in the library section that groups its form box, as the author, through the
// same placeField a person uses. The sections are the C3.4 rules pass's (api/src/form-masters.ts): each accepted section
// proposal names the boxes of one form edition it groups. A box no section names takes the section of the nearest named
// box on the same form (the longest shared data path). Who fills it: the client's questionnaire; how often: once per case
// for a case fact, per row for a box in a list row, per person otherwise. The words are the library field's own. A
// screen button calls the same step later (its own row); the configured checkpoint calls it now (api/src/demo.ts).
import { coverageGaps } from "../../engine/coverage.ts";
import { buildSnapshot } from "../../engine/snapshot.ts";
import type { Actor, Db } from "./core.ts";
import { MASTERS_STEP } from "./form-masters.ts";
import type { Studio } from "./studio.ts";

export type PlacedFromParts = { placed: { fact: string; section: string; repeats: string }[]; noSection: string[]; refused: string[]; selected: string[] };

const shared = (a: string, b: string) => { let n = 0; while (n < a.length && n < b.length && a[n] === b[n]) n++; return n; };

export async function placeFromFormParts(db: Db, studio: Studio, author: Actor, combinationId: string): Promise<PlacedFromParts> {
  const c = await db.combination.findUniqueOrThrow({ where: { id: combinationId }, select: { workspaceId: true } });
  const { snapshot } = await buildSnapshot(db, c.workspaceId, combinationId, "draft");
  // What to place: every fact a coverage gap names, and every other mapped fact asked of nobody that no document type
  // supplies (the validator's own two readings: engine/coverage.ts and engine/validate.ts "unplaced").
  const placedNow = new Set((snapshot.placements as { fact: string }[]).map((p) => p.fact));
  const docFacts = new Set(((snapshot.document_types ?? []) as { supplies_facts?: string[] }[]).flatMap((t) => t.supplies_facts ?? []));
  const gaps = new Set(coverageGaps(snapshot).map((g) => g.fact));
  for (const m of snapshot.field_maps as { entries: { outcome: string; fact?: string | null }[] }[]) for (const e of m.entries) if (e.outcome === "mapped" && e.fact && !placedNow.has(e.fact) && !docFacts.has(e.fact)) gaps.add(e.fact);
  // The accepted section proposals of this combination's rules passes: edition → [section key, the boxes it groups].
  const runs = (await db.draftingJob.findMany({ where: { combinationId, kind: MASTERS_STEP }, select: { id: true } })).map((j) => j.id);
  const groups = new Map<string, { section: string; boxes: string[] }[]>();
  // A proposal rejected (or still waiting) because the library already holds a section of that name reuses that
  // section, as its card says ("reuse that item").
  const byTitle = new Map((await db.logicalSection.findMany({ where: { workspaceId: c.workspaceId, status: { not: "RETIRED" } }, select: { sectionKey: true, title: true } })).map((x) => [x.title.trim().toLowerCase(), x.sectionKey]));
  for (const p of await db.proposalItem.findMany({ where: { runId: { in: runs }, kind: "section", status: { in: ["accepted", "waiting", "rejected"] } }, orderBy: { createdAt: "asc" } })) {
    const pay = p.payload as { fieldKeys?: string[]; label?: string };
    const section = p.status === "accepted" ? p.decidedKey : byTitle.get(String(pay.label ?? "").trim().toLowerCase());
    if (!section) continue;
    groups.set(p.formEdition ?? "", [...(groups.get(p.formEdition ?? "") ?? []), { section, boxes: pay.fieldKeys ?? [] }]);
  }
  // A form's sections may come from another edition of it than the map being read (its box paths stay the same).
  const formOf = (edition: string) => edition.replace(/\s*\([^)]*\)\s*$/, "");
  const sectionOf = (edition: string, path: string) => {
    const g = groups.get(edition) ?? [...groups.entries()].filter(([e]) => formOf(e) === formOf(edition)).flatMap(([, x]) => x);
    const own = g.find((x) => x.boxes.includes(path));
    if (own) return own.section;
    let best: { section: string; n: number } | null = null;
    for (const x of g) for (const b of x.boxes) { const n = shared(b, path); if (!best || n > best.n) best = { section: x.section, n }; }
    return best?.section ?? null;
  };
  const out: PlacedFromParts = { placed: [], noSection: [], refused: [], selected: [] };
  const done = new Set<string>();
  for (const m of snapshot.field_maps as { form_edition: string; channel?: string; entries: { data_path: string; outcome: string; fact?: string | null; row?: number | null }[] }[]) {
    if (m.channel === "ONLINE") continue;
    for (const e of m.entries) {
      if (e.outcome !== "mapped" || !e.fact || !gaps.has(e.fact) || done.has(e.fact)) continue;
      const section = sectionOf(m.form_edition, e.data_path);
      if (!section) { if (!out.noSection.includes(e.fact)) out.noSection.push(e.fact); continue; }
      done.add(e.fact);
      const repeats = e.fact.startsWith("case.") ? "once_per_case" : e.row != null ? "per_row" : "per_person";
      try { await studio.placeField(author, e.fact, { sectionKey: section, collectedFrom: "client_questionnaire", repeats, tier: "case" }); out.placed.push({ fact: e.fact, section, repeats }); }
      catch (err) { out.refused.push(`${e.fact}: ${String((err as Error).message).slice(0, 200)}`); }
    }
  }
  // A fact placed is asked only in a section the combination uses: select each section that now holds one.
  const used = new Set((await db.sqrSectionSelection.findMany({ where: { combinationId }, select: { sectionKey: true } })).map((x) => x.sectionKey));
  for (const s of [...new Set(out.placed.map((p) => p.section))]) {
    if (used.has(s)) continue;
    try { await studio.selectSection(author, combinationId, s, true); out.selected.push(s); } catch (err) { out.refused.push(`section ${s}: ${String((err as Error).message).slice(0, 200)}`); }
  }
  return out;
}
