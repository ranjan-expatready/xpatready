// "Who can be in this application" (S5, P-119, challenge M3/M4): the rules a save must pass, read against the shared
// library's person roles (one list for the editor, the validator and the runtime; no role list in code). Pure.
import { FILING_CHOICE, type LineMode, type PeopleLine, type PersonRoleView } from "../contracts/workspace.ts";
import { appliesOf, isLineMode, modeSent } from "./filing-modes.ts";
import { rolesNamedBy as named } from "./resolver.ts";

export type PeopleError = { field: string; message: string };
type Role = Pick<PersonRoleView, "key" | "label" | "takesPartInCase" | "mayBeApplicant" | "retired">;

/** The principal applicant is the one role every case has (P-119: exactly one). */
export const PRINCIPAL = "principal";
/** BR-4 (C11.12 concept): the role whose line may co-file, a person who takes part in a case and never applies (the
 *  sponsor). One rule for the studio's save and the fee engine (engine/runtime/filings.ts, M3-S1). */
export const CO_FILING_ROLE = "sponsor";

/** Field errors for a list of people. strict (the S5 editor): an applicant tick on a role that may not be an applicant
 *  is refused; not strict (older callers: New combination, the sample loader) it is set to "not an applicant". */
export function checkPeople(list: PeopleLine[], roles: Role[], strict = true): { errors: PeopleError[]; lines: (PeopleLine & { label: string })[] } {
  const errors: PeopleError[] = [];
  const byKey = new Map(roles.map((r) => [r.key, r]));
  const seen = new Set<string>();
  let coFilers = 0;
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
    // C11.12 (P-135, P-233) BR-1…BR-5: one filing mode per role, read from filingMode (or the acceptance pack's `filing`).
    const name = p.label?.trim() || r?.label || p.role;
    const sent = modeSent(p);
    let mode: LineMode | null = null;
    // Review m1: the pack's alias and the field must not disagree (the alias goes when C11.12.test.ts is renamed).
    if (p.filingMode != null && p.filing != null && modeSent({ filing: p.filing }) !== p.filingMode) errors.push({ field: at("filingMode"), message: "Filing: send one choice (filingMode and filing disagree)." });
    else if (sent != null && !isLineMode(sent)) errors.push({ field: at("filingMode"), message: FILING_CHOICE }); // BR-1
    else if (isLineMode(sent)) mode = sent;
    if (p.role === PRINCIPAL && mode && mode !== "files_own") errors.push({ field: at("filingMode"), message: "The principal applicant always files their own application." }); // BR-2
    if (mode && mode !== "co_files" && r && !r.mayBeApplicant) { // BR-3: strict refuses; stored lines and older callers drop it (B1)
      if (strict) errors.push({ field: at("filingMode"), message: `${r.label} takes part in the case but files no application.` });
      mode = null;
    }
    if (mode === "co_files") { // BR-4
      if (p.role !== CO_FILING_ROLE && !r?.mayBeApplicant && p.role !== PRINCIPAL) errors.push({ field: at("filingMode"), message: `${name} takes part in the case but files no application: only the sponsor files the sponsorship.` });
      else if (r?.mayBeApplicant || p.role === PRINCIPAL) errors.push({ field: at("filingMode"), message: `${name} may be an applicant: choose Files own application, On the principal's application or Declared only. Only a person who is never an applicant (a sponsor) files the sponsorship.` });
      else if (p.min !== 1 || p.max !== 1) errors.push({ field: at("max"), message: `One ${name.toLowerCase()} co-files: set how many to 1 to 1.` });
      if (coFilers++) errors.push({ field: at("filingMode"), message: "Only one person files the sponsorship: keep one co-filing line." });
    }
    // BR-5: a mode decides "applicant"; an explicit tick that contradicts Declared only is refused on the editor's save.
    if (strict && mode === "declared_only" && p.applies) errors.push({ field: at("applies"), message: "Declared only means not accompanying: choose another filing or untick applicant." });
    let applies = appliesOf(mode, p.applies);
    if (applies && r && !r.mayBeApplicant) { if (strict) errors.push({ field: at("applies"), message: `${r.label} is never an applicant: they take part in the case but file no application of their own.` }); applies = false; }
    const { filing: _alias, filingMode: _sent, ...rest } = p;
    return { ...rest, applies, ...(mode ? { filingMode: mode } : {}), label: name }; // Lead check L7: a typed label is kept
  });
  if (!list.some((p) => p.role === PRINCIPAL)) errors.push({ field: "participants", message: "Add the principal applicant: every case has exactly one." });
  return { errors, lines };
}

/** X2b (BR-C1 "the line's person is not in that application"): the roles a line's "who" needs in a combination
 *  (removing one of them leaves the line with nobody). SH3: the one table is the resolver's (contracts/resolver.ts R10). */
export const rolesNamedBy = (who: string): string[] => named(who);

/** Form lines that name a person this save removes (or sets to at most 0): the save asks first (M4). */
export function linesNamingRemoved(before: { role: string; max: number }[], after: { role: string; max: number }[], lines: { form: string; who: string }[]) {
  const kept = new Set(after.filter((p) => p.max > 0).map((p) => p.role));
  const removed = before.filter((p) => p.max > 0 && !kept.has(p.role)).map((p) => p.role);
  return lines.filter((l) => named(l.who).some((r) => removed.includes(r))).map((l) => ({ ...l, roles: named(l.who).filter((r) => removed.includes(r)) }));
}

type GuideLine = { role: string; min: number; max: number; applies: boolean; quote: string; why: string | null };
/** QA-84 (Who can be › AI now): the provider's structured outputs refuse numeric limits in a schema, so how many
 *  (0 to 9, the least no more than the most) is checked here after the answer is read. A line outside them is dropped
 *  with its reason, never clamped. */
export const COUNT_LIMIT = 9;
export function checkCounts<T extends GuideLine>(a: { people: T[] }): { kept: T[]; dropped: { role: string; why: string }[] } {
  const ok = (n: unknown) => Number.isInteger(n) && (n as number) >= 0 && (n as number) <= COUNT_LIMIT;
  const kept: T[] = [], dropped: { role: string; why: string }[] = [];
  for (const p of a.people ?? []) {
    if (ok(p.min) && ok(p.max) && p.min <= p.max) kept.push(p);
    else dropped.push({ role: p.role, why: `AI gave how many as ${p.min} to ${p.max}: it must be a whole number from 0 to ${COUNT_LIMIT}, the least no more than the most. Not proposed.` });
  }
  return { kept, dropped };
}
/** QA-88 (runtime part): what a person reads when Who can be's AI step cannot run: plain words, never the provider's
 *  or the launcher's own text (that goes to the server log). */
export const AI_FAILED = {
  refused: "The guarded AI route refused this job before any call, so nothing was spent. Use rules only, or ask the Lead to check the AI settings.",
  notRun: "The AI service did not answer this time, so nothing was proposed. Try again later, or use rules only.",
  unusable: "The AI answered, but not in the agreed shape, so nothing was proposed.",
} as const;
