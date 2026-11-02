// UX-A part 1 (P-273; UX baseline 2 Nov, finding 1; EXPERIENCE §2.7 "counts say what they count"): one definition and
// one fixed label per count, shared by the API, the web app and the checks. Before, Visitor visa showed 4, 6, 2 and 0
// forms on one page (a tab badge counting setup items, the Forms tab counting attached forms, the Overview counting
// set-up lines) and LMIA 426 questions on the Overview against 377 on the Questionnaires chips. Every screen that shows
// one of these counts takes its number from the one computation named here and its words from the function here.
//
// * Forms on a combination: its form lines (set up) plus the forms attached to it that are not set up yet, each form
//   once (api/src/programs.ts rows(): `leaf.forms`, the same list the Programs card draws). Words: "8 forms", or
//   "2 forms · 0 set up" while some wait.
// * Questions: per person role, every question in that person's questionnaire, each once per section, hidden ones
//   included (engine/runtime/question-count.ts; the Questionnaires chips and footer, the Preview's person chips). The
//   combination's count is their sum, each person role counted once (the Overview tile and the setup strip).
// * Form facts: every answer the forms need, one per fact and person role (api/src/fact-sources.ts). The application's
//   own facts go with the principal applicant, who answers them, and are named in brackets.
// * A tab badge counts open setup items ("4 to do") or release-blocking problems ("1 to fix"), never forms.
// Pure.

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Forms on a combination: `total` (lines and attached forms not set up yet, each once) and `setUp` (lines). */
export type FormsCount = { total: number; setUp: number };
export function formsWords(c: FormsCount): string {
  return c.setUp >= c.total ? plural(c.total, "form") : `${plural(c.total, "form")} · ${c.setUp} set up`;
}

/** A form removed in this draft (its newest line retired since the last release, P-116: Undo is offered) is neither
 *  set up nor waiting to be set up, even while its file stays attached: the Forms tab lists it under "Removed in this
 *  draft" and no count includes it. One rule for the API's count (programs.ts) and the tab's list (workspace.ts).
 *  `rows`: the combination's form line versions, newest first. */
export function removedInDraft<T extends { lineageKey: string; status: string }>(rows: T[], released: Iterable<string> | null | undefined): T[] {
  // Re-break N2: a removal is "in this draft" when the latest release still has the form (or nothing is released yet),
  // the same test as the Review tab's draft changes; never by the line's date, which Undo rewrites.
  const inRelease = released ? new Set(released) : null;
  return removedLines(rows).filter((r) => !inRelease || inRelease.has(r.lineageKey));
}
/** Break 2: every form whose newest line is removed, in this draft or before an earlier release. None is "attached and
 *  waiting to be set up" again because its file stays attached; adding it from the library brings its line back. */
export function removedLines<T extends { lineageKey: string; status: string }>(rows: T[]): T[] {
  const newest = new Map<string, T>();
  for (const r of rows) if (!newest.has(r.lineageKey)) newest.set(r.lineageKey, r);
  return [...newest.values()].filter((r) => r.status === "RETIRED");
}
/** Break 3: the attached forms not set up yet, one per form number: Form files whose number is neither a line nor a
 *  removed form. A file is a "Form" only when it is on the official list or a second person approved it in the product
 *  (P-80, stored with recognised = false; re-break N1); an unknown file is another kind (api/src/sources.ts). The API's
 *  count (programs.ts) and the Forms tab's rows (sources.tsx pendingForms) use it. */
export function attachedNotSetUp<A extends { kind: string; edition?: string | null; officialFile?: string | null; id?: string; createdAt?: Date | string }>(attachments: A[], taken: Iterable<string>): A[] {
  const skip = new Set(taken), by = new Map<string, A>();
  const at = (a: A) => (a.createdAt ? new Date(a.createdAt).getTime() : 0);
  for (const a of attachments) {
    // One per form number; a file with no edition read yet is its own form (re-review N1: never merged into one "").
    const code = (a.edition ?? a.officialFile ?? a.id ?? "").split(" (")[0];
    if (a.kind !== "Form" || skip.has(code)) continue;
    // Devin review: the newest attachment of a form stands for it (as the Forms tab's attachmentFor), so an older,
    // unmapped edition never hides a newer one the library already maps. Ties: the later in the list.
    const had = by.get(code);
    if (!had || at(a) >= at(had)) by.set(code, a);
  }
  return [...by.values()];
}

/** Questions for one person role, or for the whole combination (each person role counted). */
export const questionsWords = (n: number) => plural(n, "question");
export type RoleQuestions = { role: string; label: string; questions: number };
/** "Principal applicant 143 · Spouse or partner 110 · …": the per-person counts the total is the sum of. */
export const perPersonWords = (roles: { label: string; questions: number }[]) => roles.map((r) => `${r.label} ${r.questions}`).join(" · ");

/** Form facts (one per fact and person role). */
export const factsWords = (n: number) => plural(n, "form fact");
/** The role key the fact sources use for the application's own facts (who(s, "case") = "The application"). */
export const APPLICATION_ROLE = "case";
/** Per person: the application's facts join the principal applicant's, said in brackets, so the Questionnaires tab and
 *  the Draft questions and documents dialog give each person the same number. The total is unchanged. */
export function factsByPerson(roles: { role: string; label: string; facts: number }[]): { role: string; label: string; facts: number; application: number }[] {
  const app = roles.find((r) => r.role === APPLICATION_ROLE)?.facts ?? 0;
  const out = roles.filter((r) => r.role !== APPLICATION_ROLE).map((r) => ({ ...r, application: r.role === "principal" ? app : 0, facts: r.facts + (r.role === "principal" ? app : 0) }));
  if (app && !out.some((r) => r.role === "principal")) out.push({ role: APPLICATION_ROLE, label: "The application", facts: app, application: 0 });
  return out.sort((a, b) => b.facts - a.facts || a.role.localeCompare(b.role));
}
/** The fact-source rows a person's count is made of: their role's, and the application's for the principal applicant
 *  (the same rule as factsByPerson, so the Questionnaires line and the dialog never differ). */
export function personFactRows<T extends { role: string }>(rows: T[], role: string): T[] {
  return rows.filter((f) => f.role === role || (role === "principal" && f.role === APPLICATION_ROLE));
}
/** "120 form facts (22 of them once for the application)". */
export const personFactsWords = (facts: number, application: number) => `${factsWords(facts)}${application ? ` (${application} of them once for the application)` : ""}`;

/** Tab badges: what the number counts, in its visible text (WCAG 2.5.3: the tab's name starts with what is shown). */
export const toDoWords = (n: number) => `${n} to do`;
export const toFixWords = (n: number) => `${n} to fix`;
