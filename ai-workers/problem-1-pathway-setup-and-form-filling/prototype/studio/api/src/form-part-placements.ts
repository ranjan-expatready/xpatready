// QA-144 (P-158, P-120; tech lead on #798): a rules step, no AI, US$0. Each fact a combination's forms need and nobody is
// asked for (engine/coverage.ts, engine/validate.ts) is placed in the library section that groups its form box, as the author, through the
// same placeField a person uses. The sections are the C3.4 rules pass's (api/src/form-masters.ts): each accepted section
// proposal names the boxes of one form edition it groups. A box no section names takes the section of the nearest named
// box on the same form (the longest shared data path). Who fills it: the client's questionnaire; how often: once per case
// for a case fact, per row for a list row about the form's own subject, per person otherwise. A section is chosen on the
// combination only when every applying person answers all of it anyway (see the end). The words are the library field's own.
// QA-144 part 1 (P-318 (6), P-322): the Smart questionnaire tab's step runs it for a person (POST
// /api/combinations/:id/place-from-form-parts, below); the configured checkpoint calls the same function (api/src/demo.ts).
import { Controller, Headers, HttpCode, HttpStatus, Inject, Param, Post } from "@nestjs/common";
import { coverageGaps, previewRender } from "../../engine/coverage.ts";
import { isFilingFact, roleOf } from "../../engine/resolver.ts";
import { FILING } from "../../contracts/resolver.ts";
import { buildSnapshot } from "../../engine/snapshot.ts";
import { actorOf, Audit, Db, fail, need, Workspace, type Actor } from "./core.ts";
import { MASTERS_STEP } from "./form-masters.ts";
import { Studio } from "./studio.ts";

export type PlacedFromParts = { placed: { fact: string; section: string; repeats: string }[]; noSection: string[]; refused: string[]; selected: string[]; unselected: string[] };

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
  // The accepted section proposals of the rules passes: edition → [section key, the boxes it groups]. A rules pass is one
  // per edition in the workspace (P-138), so an edition another combination's pass read counts here too (QA-144 slice 2:
  // With an LMIA files the Visitor visa's IMM 5707, 5409, 5476 and 5475); only this combination's editions are looked up.
  const jobs = await db.draftingJob.findMany({ where: { workspaceId: c.workspaceId, kind: MASTERS_STEP }, select: { id: true, attachmentId: true } });
  const runs = jobs.map((j) => j.id);
  // The edition a rules pass read, by its file's checksum: the attachment may label one file differently from the
  // library edition the map is filed under (IMM 5475: "12-2022" from its canada.ca folder, "05-2021" in the library).
  const shaOf = new Map((await db.sourceAttachment.findMany({ where: { id: { in: jobs.map((j) => j.attachmentId!).filter(Boolean) } }, select: { id: true, sha256: true } })).map((a) => [a.id, a.sha256]));
  // A PDF edition only, in a fixed order, so a checksum two editions might share gives the same label every time (review R2-m3).
  const labelOf = new Map((await db.formEdition.findMany({ where: { workspaceId: c.workspaceId, channel: "PDF", sha256: { in: [...shaOf.values()].filter((x): x is string => !!x) } }, orderBy: { editionLabel: "desc" }, select: { sha256: true, editionLabel: true } })).map((e) => [e.sha256, e.editionLabel]));
  const editionOfRun = new Map(jobs.map((j) => [j.id, labelOf.get(shaOf.get(j.attachmentId ?? "") ?? "") ?? null]));
  const groups = new Map<string, { section: string; boxes: string[] }[]>();
  // A proposal rejected (or still waiting) because the library already holds a section of that name reuses that
  // section, as its card says ("reuse that item").
  const byTitle = new Map((await db.logicalSection.findMany({ where: { workspaceId: c.workspaceId, status: { not: "RETIRED" } }, select: { sectionKey: true, title: true } })).map((x) => [x.title.trim().toLowerCase(), x.sectionKey]));
  // B78 (review M1): a section a person named (the naming edit on To review) landed under its key, as an accepted one did.
  // In a fixed order (QA-206 on #883): one draft's proposals share an instant, and the nearest-box fallback below keeps the
  // first of equally near sections, so the order must not depend on how the database returns ties.
  for (const p of await db.proposalItem.findMany({ where: { runId: { in: runs }, kind: "section", status: { in: ["accepted", "edited", "waiting", "rejected"] } }, orderBy: [{ createdAt: "asc" }, { identityKey: "asc" }, { id: "asc" }] })) {
    const pay = p.payload as { fieldKeys?: string[]; label?: string };
    const section = p.status === "accepted" || p.status === "edited" ? p.decidedKey : byTitle.get(String(pay.label ?? "").trim().toLowerCase());
    if (!section) continue;
    const ed = editionOfRun.get(p.runId ?? "") ?? p.formEdition ?? "";
    groups.set(ed, [...(groups.get(ed) ?? []), { section, boxes: pay.fieldKeys ?? [] }]);
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
  const out: PlacedFromParts = { placed: [], noSection: [], refused: [], selected: [], unselected: [] };
  for (const [fact, list] of boxes) {
    const repeats = fact.startsWith("case.") ? "once_per_case" : list.some((x) => x.e.row != null && x.e.person === SUBJECT) ? "per_row" : "per_person";
    // A fact asked per row sits with its row's other facts (review R2-m2): its section comes from a list-row box.
    const from = repeats === "per_row" ? list.filter((x) => x.e.row != null && x.e.person === SUBJECT) : list;
    const pick = [...from].sort((a, b) => rank(a) - rank(b)).map((x) => sectionOf(x.edition, x.e.data_path)).find(Boolean);
    if (!pick) { out.noSection.push(fact); continue; }
    try { await studio.placeField(author, fact, { sectionKey: pick, collectedFrom: "client_questionnaire", repeats, tier: "case" }); out.placed.push({ fact, section: pick, repeats }); }
    catch (err) { out.refused.push(`${fact}: ${String((err as Error).message).slice(0, 200)}`); }
  }
  // A section is chosen on the combination (so the author can order it: C4.1 Move up / Move down) only when choosing it
  // asks nobody anything a form does not already ask (review M2): every question in it, from the shared library, is a
  // case fact or a fact some form reads for every applying person role. Any other section stays unchosen: its questions
  // still go out where a form or a rule reads their fact (engine/snapshot.ts "used"), and only to whom it applies.
  // R2-m1 (QA-144 slice 2): the library's sections are shared, so a placement here can put a question into a section
  // another combination (or this one, earlier) has chosen. Every section chosen on this combination, and on any other
  // combination that chose a section placed into now, is checked again, and one that no longer qualifies is unchosen.
  await keepChosenEveryones(db, studio, author, combinationId, new Set(out.placed.map((x) => x.section)), out);
  return out;
}

/** R2-m1: checks again every section chosen on a combination, and on any other combination that chose one of the sections
 *  just placed into (`touched`), and unchooses one that no longer qualifies (everyoneAnswers); on this combination it
 *  also chooses a touched section that now does. Exported for a placement made outside placeFromFormParts (the
 *  checkpoint's fact only a rule reads, review R1-m4). */
export async function keepChosenEveryones(db: Db, studio: Studio, author: Actor, combinationId: string, touched: Set<string>, out: Pick<PlacedFromParts, "refused" | "selected" | "unselected">) {
  const { workspaceId } = await db.combination.findUniqueOrThrow({ where: { id: combinationId }, select: { workspaceId: true } });
  const live = await db.sectionQuestion.findMany({ where: { workspaceId: workspaceId, status: { not: "RETIRED" } }, select: { sectionKey: true, canonicalFieldKey: true, repeats: true } });
  const others = await db.sqrSectionSelection.findMany({ where: { sectionKey: { in: [...touched] }, workspaceId: workspaceId, combinationId: { not: combinationId }, combination: { retiredAt: null } }, select: { combinationId: true } });
  // Each unchosen section is reported with its combination's own label, from one source (review R2-m2).
  const nameOf = new Map((await db.combination.findMany({ where: { id: { in: [combinationId, ...others.map((x) => x.combinationId)] } }, select: { id: true, label: true } })).map((x) => [x.id, x.label]));
  for (const id of [combinationId, ...new Set(others.map((x) => x.combinationId))]) {
    const qualifies = await everyoneAnswers(db, workspaceId, id, live);
    const chosen = new Set((await db.sqrSectionSelection.findMany({ where: { combinationId: id }, select: { sectionKey: true } })).map((x) => x.sectionKey));
    for (const sec of id === combinationId ? chosen : [...chosen].filter((s) => touched.has(s))) {
      if (qualifies(sec)) continue;
      try { await studio.selectSection(author, id, sec, false); out.unselected.push(`${sec} (on ${nameOf.get(id)})`); } catch (err) { out.refused.push(`unchoose section ${sec}: ${String((err as Error).message).slice(0, 200)}`); }
    }
    if (id !== combinationId) continue;
    for (const sec of touched) {
      if (chosen.has(sec) || !qualifies(sec)) continue;
      try { await studio.selectSection(author, combinationId, sec, true); out.selected.push(sec); } catch (err) { out.refused.push(`section ${sec}: ${String((err as Error).message).slice(0, 200)}`); }
    }
    // B78 (review M3): BR-8 opens a case only when a chosen section asks each person something (engine/programs.ts). Its
    // person facts may already sit in sections another combination's run placed them in, which this run did not touch, and
    // then only sections about the application are chosen here: the first section everyone answers anyway is chosen too.
    const nowChosen = new Set((await db.sqrSectionSelection.findMany({ where: { combinationId }, select: { sectionKey: true } })).map((x) => x.sectionKey));
    const asksEachPerson = (sec: string) => live.some((q) => q.sectionKey === sec && !isFilingFact(q.canonicalFieldKey, q));
    if (![...nowChosen].some(asksEachPerson)) {
      const sec = [...new Set(live.map((q) => q.sectionKey))].sort().find((x) => asksEachPerson(x) && qualifies(x));
      if (sec) { try { await studio.selectSection(author, combinationId, sec, true); out.selected.push(sec); } catch (err) { out.refused.push(`section ${sec}: ${String((err as Error).message).slice(0, 200)}`); } }
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
