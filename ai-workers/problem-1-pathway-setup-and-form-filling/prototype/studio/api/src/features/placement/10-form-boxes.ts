// QA-144 (P-158, P-120; tech lead on #798): each fact a combination's forms need and nobody is asked for
// (engine/coverage.ts, engine/validate.ts) is placed in the library section that groups its form box, as the author,
// through the same placeField a person uses. The sections are the C3.4 rules pass's (api/src/form-masters.ts): each
// accepted section proposal names the boxes of one form edition it groups. A box no section names takes the section of
// the nearest named box on the same form (the longest shared data path). Who fills it: the client's questionnaire; how
// often: once per case for a case fact, per row for a list row about the form's own subject, per person otherwise.
import { formGapFacts } from "../../../../engine/coverage.ts";
import { MASTERS_STEP } from "../../form-masters.ts";
import type { PlacementPass } from "./_parts.ts";

const shared = (a: string, b: string) => { let n = 0; while (n < a.length && n < b.length && a[n] === b[n]) n++; return n; };

export default {
  async run({ db, studio, author, workspaceId, snapshot, out }) {
    const gaps = formGapFacts(snapshot); // what to place (engine/coverage.ts)
    // The accepted section proposals of the rules passes: edition → [section key, the boxes it groups]. A rules pass is one
    // per edition in the workspace (P-138), so an edition another combination's pass read counts here too (QA-144 slice 2:
    // With an LMIA files the Visitor visa's IMM 5707, 5409, 5476 and 5475); only this combination's editions are looked up.
    const jobs = await db.draftingJob.findMany({ where: { workspaceId, kind: MASTERS_STEP }, select: { id: true, attachmentId: true } });
    const runs = jobs.map((j) => j.id);
    // The edition a rules pass read, by its file's checksum: the attachment may label one file differently from the
    // library edition the map is filed under (IMM 5475: "12-2022" from its canada.ca folder, "05-2021" in the library).
    const shaOf = new Map((await db.sourceAttachment.findMany({ where: { id: { in: jobs.map((j) => j.attachmentId!).filter(Boolean) } }, select: { id: true, sha256: true } })).map((a) => [a.id, a.sha256]));
    // A PDF edition only, in a fixed order, so a checksum two editions might share gives the same label every time (review R2-m3).
    const labelOf = new Map((await db.formEdition.findMany({ where: { workspaceId, channel: "PDF", sha256: { in: [...shaOf.values()].filter((x): x is string => !!x) } }, orderBy: { editionLabel: "desc" }, select: { sha256: true, editionLabel: true } })).map((e) => [e.sha256, e.editionLabel]));
    const editionOfRun = new Map(jobs.map((j) => [j.id, labelOf.get(shaOf.get(j.attachmentId ?? "") ?? "") ?? null]));
    const groups = new Map<string, { section: string; boxes: string[] }[]>();
    // A proposal rejected (or still waiting) because the library already holds a section of that name reuses that
    // section, as its card says ("reuse that item").
    const byTitle = new Map((await db.logicalSection.findMany({ where: { workspaceId, status: { not: "RETIRED" } }, select: { sectionKey: true, title: true } })).map((x) => [x.title.trim().toLowerCase(), x.sectionKey]));
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
    for (const [fact, list] of boxes) {
      const repeats = fact.startsWith("case.") ? "once_per_case" : list.some((x) => x.e.row != null && x.e.person === SUBJECT) ? "per_row" : "per_person";
      // A fact asked per row sits with its row's other facts (review R2-m2): its section comes from a list-row box.
      const from = repeats === "per_row" ? list.filter((x) => x.e.row != null && x.e.person === SUBJECT) : list;
      const pick = [...from].sort((a, b) => rank(a) - rank(b)).map((x) => sectionOf(x.edition, x.e.data_path)).find(Boolean);
      if (!pick) { out.noSection.push(fact); continue; }
      try { await studio.placeField(author, fact, { sectionKey: pick, collectedFrom: "client_questionnaire", repeats, tier: "case" }); out.placed.push({ fact, section: pick, repeats }); }
      catch (err) { out.refused.push(`${fact}: ${String((err as Error).message).slice(0, 200)}`); }
    }
  },
} satisfies PlacementPass;
