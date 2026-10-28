// "Who can be in this application" (S5, P-119, challenge M3/M4): the rules a save must pass, read against the shared
// library's person roles (one list for the editor, the validator and the runtime; no role list in code). Pure.
import type { PeopleLine, PersonRoleView } from "../contracts/workspace.ts";

export type PeopleError = { field: string; message: string };
type Role = Pick<PersonRoleView, "key" | "label" | "takesPartInCase" | "mayBeApplicant" | "retired">;

/** The principal applicant is the one role every case has (P-119: exactly one). */
export const PRINCIPAL = "principal";

/** Field errors for a list of people. strict (the S5 editor): an applicant tick on a role that may not be an applicant
 *  is refused; not strict (older callers: New combination, the sample loader) it is set to "not an applicant". */
export function checkPeople(list: PeopleLine[], roles: Role[], strict = true): { errors: PeopleError[]; lines: (PeopleLine & { label: string })[] } {
  const errors: PeopleError[] = [];
  const byKey = new Map(roles.map((r) => [r.key, r]));
  const seen = new Set<string>();
  const lines = list.map((p, i) => {
    const at = (f: string) => `participants[${i}].${f}`;
    const r = byKey.get(p.role);
    if (!r) errors.push({ field: at("role"), message: `"${p.role}" is not a person role in the shared library: choose one from the list.` });
    else if (r.retired) errors.push({ field: at("role"), message: `${r.label} is retired in the shared library: choose another person.` });
    else if (!r.takesPartInCase) errors.push({ field: at("role"), message: `${r.label} is described on forms only and never joins a case, so it cannot be in the application.` });
    if (seen.has(p.role)) errors.push({ field: at("role"), message: `${r?.label ?? p.role} is listed twice: keep one line and set how many.` });
    seen.add(p.role);
    if (p.max < p.min) errors.push({ field: at("max"), message: `${r?.label ?? p.role}: the most cannot be fewer than the fewest (${p.min}).` });
    if (p.role === PRINCIPAL && (p.min !== 1 || p.max !== 1)) errors.push({ field: at("min"), message: "There is exactly one principal applicant on every case." });
    if (p.role === PRINCIPAL && !p.applies) errors.push({ field: at("applies"), message: "The principal applicant always files their own application." });
    let applies = p.applies;
    if (applies && r && !r.mayBeApplicant) { if (strict) errors.push({ field: at("applies"), message: `${r.label} is never an applicant: they take part in the case but file no application of their own.` }); applies = false; }
    return { ...p, applies, label: p.label?.trim() || r?.label || p.role }; // Lead check L7: a typed label is kept
  });
  if (!list.some((p) => p.role === PRINCIPAL)) errors.push({ field: "participants", message: "Add the principal applicant: every case has exactly one." });
  return { errors, lines };
}

/** The roles a form line's "who fills it" names by role (removing one of them leaves the line with nobody). */
const NAMES: Record<string, string[]> = { spouse_or_partner: ["spouse_or_partner"], couple_once: ["spouse_or_partner"], each_dependent_child: ["child"], representative: ["representative"], sponsor: ["sponsor"] };

/** Form lines that name a person this save removes (or sets to at most 0): the save asks first (M4). */
export function linesNamingRemoved(before: { role: string; max: number }[], after: { role: string; max: number }[], lines: { form: string; who: string }[]) {
  const kept = new Set(after.filter((p) => p.max > 0).map((p) => p.role));
  const removed = before.filter((p) => p.max > 0 && !kept.has(p.role)).map((p) => p.role);
  return lines.filter((l) => (NAMES[l.who] ?? []).some((r) => removed.includes(r))).map((l) => ({ ...l, roles: (NAMES[l.who] ?? []).filter((r) => removed.includes(r)) }));
}
