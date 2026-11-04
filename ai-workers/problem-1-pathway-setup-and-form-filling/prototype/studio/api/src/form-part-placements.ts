// QA-144 (P-158, P-120; tech lead on #798): a rules step, no AI, US$0. Each fact a combination's forms need and nobody is
// asked for (engine/coverage.ts, engine/validate.ts) is placed in the library section that groups its form box, as the author, through the
// same placeField a person uses. The sections are the C3.4 rules pass's (api/src/form-masters.ts): each accepted section
// proposal names the boxes of one form edition it groups. A box no section names takes the section of the nearest named
// box on the same form (the longest shared data path). Who fills it: the client's questionnaire; how often: once per case
// for a case fact, per row for a list row about the form's own subject, per person otherwise. No section is selected: a
// question whose fact a form or a rule reads already goes out with the release, and only to whom it applies. The words are the library field's own. A
// screen button calls the same step later (its own row); the configured checkpoint calls it now (api/src/demo.ts).
import { coverageGaps } from "../../engine/coverage.ts";
import { buildSnapshot } from "../../engine/snapshot.ts";
import type { Actor, Db } from "./core.ts";
import { MASTERS_STEP } from "./form-masters.ts";
import type { Studio } from "./studio.ts";

export type PlacedFromParts = { placed: { fact: string; section: string; repeats: string }[]; noSection: string[]; refused: string[] };

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
  // A form's sections may come from another edition of it than the map being read: only a box with exactly the same path
  // takes a section from there (review m3); the nearest-box fallback stays within the edition's own parts.
  const formOf = (edition: string) => edition.replace(/\s*\([^)]*\)\s*$/, "");
  const sectionOf = (edition: string, path: string) => {
    const own = groups.get(edition) ?? [];
    const hit = own.find((x) => x.boxes.includes(path)) ?? [...groups.entries()].filter(([e]) => e !== edition && formOf(e) === formOf(edition)).flatMap(([, x]) => x).find((x) => x.boxes.includes(path));
    if (hit) return hit.section;
    let best: { section: string; n: number } | null = null;
    for (const x of own) for (const b of x.boxes) { const n = shared(b, path); if (!best || n > best.n) best = { section: x.section, n }; }
    return best?.section ?? null;
  };
  // One choice per fact, read from all its boxes (review M3), never from whichever comes first:
  // * its section: a box about the form's own subject first (so the applicant's name sits in their personal details, not
  //   in the spouse's part of "Marital status"), a box outside a list row next, then the form order;
  // * how often: once per case for a case fact; per row only when the fact sits in a list row about the form's own subject
  //   (previous residences, education); a list of people (IMM 5707's children) is per person.
  type Entry = { data_path: string; outcome: string; fact?: string | null; row?: number | null; person?: string | null };
  const boxes = new Map<string, { edition: string; e: Entry; order: number }[]>();
  let order = 0;
  for (const m of snapshot.field_maps as { form_edition: string; channel?: string; entries: Entry[] }[]) {
    if (m.channel === "ONLINE") continue;
    for (const e of m.entries) if (e.outcome === "mapped" && e.fact && gaps.has(e.fact)) boxes.set(e.fact, [...(boxes.get(e.fact) ?? []), { edition: m.form_edition, e, order: order++ }]);
  }
  const SUBJECT = "form_subject";
  const rank = (x: { e: Entry; order: number }) => (x.e.person === SUBJECT ? 0 : 2) + (x.e.row == null ? 0 : 1) + x.order / 1e6;
  const out: PlacedFromParts = { placed: [], noSection: [], refused: [] };
  for (const [fact, list] of boxes) {
    const pick = [...list].sort((a, b) => rank(a) - rank(b)).map((x) => sectionOf(x.edition, x.e.data_path)).find(Boolean);
    if (!pick) { out.noSection.push(fact); continue; }
    const repeats = fact.startsWith("case.") ? "once_per_case" : list.some((x) => x.e.row != null && x.e.person === SUBJECT) ? "per_row" : "per_person";
    try { await studio.placeField(author, fact, { sectionKey: pick, collectedFrom: "client_questionnaire", repeats, tier: "case" }); out.placed.push({ fact, section: pick, repeats }); }
    catch (err) { out.refused.push(`${fact}: ${String((err as Error).message).slice(0, 200)}`); }
  }
  // No section is selected (review M2): a placement whose fact a form or a condition reads already travels with the
  // release (engine/snapshot.ts placements: "used"), and a selected section would ask every one of its questions of
  // everyone, a toddler included.
  return out;
}
