// C7.3 (runtime lane; P-319, P-322): a form edition's own parts as the configuration holds them, for the answer sheet's
// layout: the sections the C3.4 rules pass proposed for that edition (api/src/form-masters.ts), each grouping the form
// fields under one printed heading. An accepted part is titled by the library section it became (its current title, so
// a part a person named or renamed shows that name); a part still waiting on To review (no printed heading, B78) keeps
// its placeholder name and says it is not named yet; a rejected part groups nothing. Read only: this lane never writes
// these rows. No form number here: the edition comes from the case's release.
import type { FormPart } from "../../engine/runtime/answer-sheet.ts";
import type { Db } from "./core.ts";

type Payload = { kind?: string; label?: unknown; fieldKeys?: unknown };

/** The parts of each edition asked for, in the order they were proposed (the caller puts them in the form's order). */
export async function formPartsOf(db: Db, workspaceId: string, editions: string[]): Promise<Map<string, FormPart[]>> {
  const out = new Map<string, FormPart[]>();
  const wanted = [...new Set(editions.filter(Boolean))];
  if (!wanted.length) return out;
  const rows = await db.proposalItem.findMany({
    where: { workspaceId, kind: "section", formEdition: { in: wanted }, status: { in: ["accepted", "waiting"] } },
    select: { id: true, formEdition: true, status: true, decidedKey: true, payload: true, createdAt: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  const keys = [...new Set(rows.map((r) => r.decidedKey).filter((k): k is string => !!k))];
  const sections = keys.length
    ? await db.logicalSection.findMany({ where: { workspaceId, sectionKey: { in: keys } }, select: { sectionKey: true, title: true, version: true, status: true }, orderBy: { version: "desc" } })
    : [];
  const titleOf = new Map<string, string>();
  for (const s of sections) if (!titleOf.has(s.sectionKey) && String(s.status) !== "RETIRED") titleOf.set(s.sectionKey, s.title);
  for (const r of rows) {
    const p = (r.payload ?? {}) as Payload;
    const fieldKeys = Array.isArray(p.fieldKeys) ? p.fieldKeys.filter((k): k is string => typeof k === "string") : [];
    if (!fieldKeys.length || !r.formEdition) continue;
    const named = r.status === "accepted";
    const key = named && r.decidedKey ? r.decidedKey : `part_${r.id.slice(0, 8)}`;
    const title = (named && r.decidedKey ? titleOf.get(r.decidedKey) : null) ?? (typeof p.label === "string" && p.label.trim() ? p.label.trim() : "A part of the form with no name yet");
    const list = out.get(r.formEdition) ?? [];
    // One part per key: a part proposed again by a later run (the same section) is kept once, its first form fields first.
    const same = list.find((x) => x.key === key);
    if (same) same.fieldKeys = [...new Set([...same.fieldKeys, ...fieldKeys])];
    else list.push({ key, title, named, fieldKeys });
    out.set(r.formEdition, list);
  }
  return out;
}
