// C7.3 (runtime lane; P-319, P-322): a form edition's own parts as the configuration held them when the case's release
// was released, for the answer sheet's layout: the sections the C3.4 rules pass proposed for that edition
// (api/src/form-masters.ts), each grouping the form fields under one printed heading. Released means frozen (STANDARDS
// §3.7; review M3 on #1075): a part proposed after the release is not on its cases, and a decision made after it counts
// as not made yet, so a later To review decision never changes a released case's sheet. A part decided by then
// (accepted, or named by an edit on To review: review M2) is titled by the release's own section titles (snapshot
// `sections` and `section_titles`), else by its proposal's name; a part still waiting then (no printed heading, B78)
// keeps its proposal's name as it was then (an edit's `work.beforeEdit`) and says it is not named yet; a part rejected by then groups nothing. Read only: this lane
// never writes these rows. No form number here: the edition comes from the case's release.
import type { FormPart } from "../../engine/runtime/answer-sheet.ts";
import type { Db } from "./core.ts";

type Payload = { kind?: string; label?: unknown; fieldKeys?: unknown };
/** The decisions that name a part (To review: accept, or an edit that names it). */
const NAMED = new Set(["accepted", "edited"]);

/** The parts of each edition asked for as they stood at `releasedAt`, in the order they were proposed (the caller puts
 *  them in the form's order). `titles`: the release's own section titles, by library key. */
export async function formPartsOf(db: Db, workspaceId: string, editions: string[], releasedAt: Date, titles: Map<string, string>): Promise<Map<string, FormPart[]>> {
  const out = new Map<string, FormPart[]>();
  const wanted = [...new Set(editions.filter(Boolean))];
  if (!wanted.length) return out;
  const rows = await db.proposalItem.findMany({
    where: { workspaceId, kind: "section", formEdition: { in: wanted }, createdAt: { lte: releasedAt } },
    select: { id: true, formEdition: true, status: true, decidedKey: true, decidedAt: true, payload: true, work: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  for (const r of rows) {
    // As it stood at the release: a decision taken after it is not taken yet.
    const later = !(r.decidedAt && r.decidedAt <= releasedAt), status = later ? "waiting" : r.status;
    if (status !== "waiting" && !NAMED.has(status)) continue; // rejected by then: groups nothing
    // An edit after the release rewrote the proposal; its name and form fields as released are the copy kept before it.
    const before = later ? ((r.work ?? {}) as { beforeEdit?: Payload }).beforeEdit : undefined;
    const p = (before ?? r.payload ?? {}) as Payload;
    const fieldKeys = Array.isArray(p.fieldKeys) ? p.fieldKeys.filter((k): k is string => typeof k === "string") : [];
    if (!fieldKeys.length || !r.formEdition) continue;
    const named = NAMED.has(status) && !!r.decidedKey;
    const key = named ? r.decidedKey! : `part_${r.id.slice(0, 8)}`;
    const label = typeof p.label === "string" && p.label.trim() ? p.label.trim() : "A part of the form with no name yet";
    const title = (named ? titles.get(key) : null) ?? label;
    const list = out.get(r.formEdition) ?? [];
    // One part per key: a part proposed again by a later run (the same section) is kept once, its form fields merged.
    const same = list.find((x) => x.key === key);
    if (same) same.fieldKeys = [...new Set([...same.fieldKeys, ...fieldKeys])];
    else list.push({ key, title, named, fieldKeys });
    out.set(r.formEdition, list);
  }
  return out;
}
