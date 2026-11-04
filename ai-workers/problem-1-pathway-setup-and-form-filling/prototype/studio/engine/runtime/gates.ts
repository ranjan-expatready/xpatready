// QA-165 (C7.2, P-62): the Yes/No question a fact is asked under (its "gate"). IMM 5257 asks "Have you ever used any
// other name…?", "Do you have a national identity document?" and "Are you a lawful permanent resident of the United
// States…?" before the details; a confirmed No writes the form's Yes/No as No (engine/runtime/forms.ts
// markNothingRecorded), and the gate question fills that box (engine/runtime/case.ts caseView). Pure: no database.

/** A placement as the release carries it (engine/snapshot.ts): its fact, its condition and the condition's effect. */
export type GatePlacement = { fact: string; condition?: unknown; condition_effect?: string | null };

/** The gate of a fact: its placement's condition is "<gate> is Yes" and makes it required or shown only then. Null for
 *  a fact asked on its own, or whose condition is anything else. */
export function gateOf(placements: GatePlacement[], fact: string): string | null {
  const p = placements.find((x) => x.fact === fact);
  const c = p?.condition as { op?: string; field?: unknown; value?: unknown } | null | undefined;
  if (!c || c.op !== "eq" || c.value !== true || typeof c.field !== "string") return null;
  const effect = p!.condition_effect ?? "SHOW";
  return effect === "REQUIRE" || effect === "SHOW" ? c.field : null;
}
