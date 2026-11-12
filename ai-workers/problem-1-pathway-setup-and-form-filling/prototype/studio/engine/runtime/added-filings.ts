// M3-S2 (P-380, P-425; Bake plan row 18): a conditional extra filing, by configuration, on any pathway. A "Who can be in
// this application" line may carry `addsFiling` (contracts/workspace.ts AddsFiling): a filing its person adds when the
// line's rule holds on that person's own answers (an accompanying child who will study: their own study permit
// application). The release carries the line as it was approved; this reads it with the case's answers, and
// engine/runtime/filings.ts deriveFilings files and prices it. No combination, form or program is named here.
// Pure: no database, no clock (the answers are read by the caller); tests/runtime/check_added_filings.ts.
import { lineCondition, type Known } from "../render.ts";
import type { Snapshot } from "../snapshot.ts";
import type { Participant } from "./case.ts";

type Line = { role: string; addsFiling?: { filing?: unknown; condition?: unknown; conditionPlain?: unknown; fee?: unknown } | null };
/** The rules of a release's lines that add a filing, keyed `adds_filing.<role>`, for the rules a fact can be added for
 *  (C3.6, api/src/rule-facts.ts rulesOf) and the facts that travel with the release. */
export function addedFilingRules(s: Pick<Snapshot, "combination">): { key: string; filing: string; plain: string; tree: unknown }[] {
  return ((s.combination?.participants ?? []) as Line[]).filter((l) => l?.addsFiling?.condition && typeof l.addsFiling.condition === "object")
    .map((l) => ({ key: `adds_filing.${l.role}`, filing: `${typeof l.addsFiling!.filing === "string" ? l.addsFiling!.filing : "filing"} (${l.role.replace(/_/g, " ")})`, plain: typeof l.addsFiling!.conditionPlain === "string" ? l.addsFiling!.conditionPlain : "", tree: l.addsFiling!.condition }));
}
/** Per person (subject id), the filing their line adds now, with the fee line that charges it. A rule not yet answered
 *  (cannot tell) adds nothing until it is answered: the question stays open on the questionnaire, and the person is
 *  returned with `waits` (the rule in words) so their filing and its fees wait too (BK-15 break M2, BR-10: which
 *  application they make decides what they pay, never guessed). Only a person who applies on the case adds one (a person
 *  not travelling files nothing). */
export type AddedFiling = { filing: string; fee?: string | string[]; waits?: string };
export function addedFilings(s: Snapshot, known: Known, people: Participant[]): Map<string, AddedFiling> {
  const out = new Map<string, AddedFiling>();
  const lines = ((s.combination?.participants ?? []) as Line[]).filter((l) => l && typeof l.addsFiling?.filing === "string" && l.addsFiling.condition && typeof l.addsFiling.condition === "object");
  if (!lines.length) return out;
  const persons = people.filter((p) => p.role !== "case").map((p) => ({ id: p.subjectId, role: p.role as never, label: p.label, applies: p.applies }));
  for (const p of people) {
    const l = lines.find((x) => x.role === p.role);
    if (!l || !p.applies || p.role === "case") continue;
    const a = l.addsFiling!;
    const holds = lineCondition(s, known, persons, p.subjectId, a.condition as { subjectKind?: string }).applies;
    if (holds === false) continue;
    out.set(p.subjectId, { filing: a.filing as string, ...(holds !== true ? { waits: typeof a.conditionPlain === "string" && a.conditionPlain.trim() ? a.conditionPlain.trim() : "the rule that adds it" } : {}), ...(typeof a.fee === "string" || (Array.isArray(a.fee) && a.fee.every((k) => typeof k === "string")) ? { fee: a.fee as string | string[] } : {}) });
  }
  return out;
}
