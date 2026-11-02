// C11.12 filing modes (P-135, P-233; concept r2 `product/screens/C11.12-filing-modes/concept.md`): how each kind of
// person's application goes to IRCC, the words the editor and the release check use, and the plan of filings a case
// gets from them (one plan for the "What a case gets" preview and, from PR 2, the case's own filings). Pure: no I/O.
import { ALIAS_OF, FILING_ALIAS, LINE_MODES, type FilingWords, type LineMode, type PreviewFiling } from "../contracts/workspace.ts";

export const isLineMode = (m: unknown): m is LineMode => typeof m === "string" && (LINE_MODES as readonly string[]).includes(m);
/** The three choices of a role that may be an applicant (BR-1). */
export const APPLICANT_MODES: readonly LineMode[] = ["files_own", "on_principal", "declared_only"];

/** A line's mode as sent: `filingMode`, else the acceptance pack's `filing` name; null/undefined when none is sent.
 *  An unknown value is returned as it is, so the rules can refuse it in words (BR-1). */
export function modeSent(p: { filingMode?: unknown; filing?: unknown }): unknown {
  if (p.filingMode !== undefined && p.filingMode !== null) return p.filingMode;
  if (p.filing !== undefined && p.filing !== null) return (FILING_ALIAS as Record<string, LineMode>)[String(p.filing)] ?? p.filing;
  return p.filingMode ?? p.filing;
}
/** The acceptance pack's name for a line mode (null for co_files and none). */
export const aliasOf = (m: LineMode | null | undefined) => (m ? ALIAS_OF[m] ?? null : null);

/** One mapping for both stored views (concept §6, m2): what a line mode gives the person on a case. */
export function filingOf(m: LineMode | null | undefined): "own" | "principal" | "co_filed" | "none" {
  return m === "files_own" ? "own" : m === "on_principal" || m === "declared_only" ? "principal" : m === "co_files" ? "co_filed" : "none";
}

/** BR-5: with a mode, the mode says whether the person is an applicant; without one (a line saved before C11.12) the
 *  stored tick is kept (m6). */
export const appliesOf = (m: LineMode | null | undefined, stored: boolean) => (m ? m === "files_own" || m === "on_principal" : stored);

/** BR-7 (Q3, P-233 (3)): a combination whose IRCC guide says each family member applies on their own. A mode that puts
 *  family on the principal's application there is saved with this warning, never refused (no program-type field). */
const EACH_FILES_OWN: Record<string, string> = {
  // Guide 5256 (Visitor visa, outside Canada): "Family members must complete their own application forms" (2026-03-31;
  // compliance-trace IRCC-P2-02).
  "vv.single": "Guide 5256 says family members complete their own application forms.",
};
export function filingWarnings(combinationKey: string, lines: { role: string; label?: string; filingMode?: LineMode | null }[]): string[] {
  const says = EACH_FILES_OWN[combinationKey];
  if (!says) return [];
  return lines.filter((l) => l.role !== "principal" && (l.filingMode === "on_principal" || l.filingMode === "declared_only"))
    .map((l) => `${l.label ?? l.role}: ${l.filingMode === "on_principal" ? "On the principal's application" : "Declared only"}. Check this: ${says}`);
}

type RoleFacts = { key: string; label: string; mayBeApplicant: boolean };
/** BR-7 release check: the roles that may be applicants, can be on a case and have no filing mode. The principal always
 *  files their own (BR-2), so it needs none. Stored lines saved before C11.12 have no mode: a new release asks for it. */
export function filingNotSet(lines: { role: string; label?: string; min?: number; max: number; applies?: boolean; filingMode?: unknown }[], roles: RoleFacts[]): string[] {
  return lines.filter((l) => l.role !== "principal" && l.max > 0 && roles.find((r) => r.key === l.role)?.mayBeApplicant && !isLineMode(l.filingMode))
    .map((l) => l.label || roles.find((r) => r.key === l.role)?.label || l.role);
}
export const filingNotSetWords = "Not set: choose how this person's application goes to IRCC (Forms › Who can be in this application).";
/** Switched off until the editor can set a mode (PR 3 of C11.12): until then a missing mode is a warning, so no draft
 *  saved before C11.12 becomes unreleasable with no way to fix it on the screen ("unfinished work merges switched off"). */
export const FILING_NOT_SET_BLOCKS = false;
/** The release check's lines (BR-7): one per role with no mode; an error once FILING_NOT_SET_BLOCKS is on. */
export function filingProblems(lines: Parameters<typeof filingNotSet>[0], roles: RoleFacts[], blocks = FILING_NOT_SET_BLOCKS) {
  return filingNotSet(lines, roles).map((label) => ({ level: blocks ? "error" as const : "warning" as const, where: "People", item: `Filing for ${label}`, message: filingNotSetWords }));
}

/** The P-119 card sentence (questionnaires.tsx TIPS.card), word for word, and the filing tip (concept §5). */
export const APPLICANT_TIP = "Each person marked as applicant gets their own forms, questions and documents.";
export const FILING_TIP = "How this person's application goes to IRCC. Files own application: their own application, number and fee. On the principal's application: one application for the family; forms and fees repeat per person on it. Declared only: named on the principal's application but not accompanying; no fee.";
export const notWorkedOut = (combination: string) => `Fees not worked out yet for ${combination}; nothing is guessed.`;

/** The read-only words of a line (concept §4, §5). `feesKnown`: the combination has fee rules (Sample amounts). */
export function filingWords(l: { role: string; filingMode?: LineMode | null; applies: boolean }, mayBeApplicant: boolean, feesKnown: boolean, combination: string): FilingWords {
  const m = l.role === "principal" ? (l.filingMode ?? "files_own") : l.filingMode ?? null;
  const fee = (known: string) => (feesKnown ? known : notWorkedOut(combination));
  const tip = l.applies || m === "files_own" || m === "on_principal" ? `${APPLICANT_TIP} ${FILING_TIP}` : mayBeApplicant ? FILING_TIP : null;
  if (!mayBeApplicant) return m === "co_files"
    ? { filingWords: "Files the sponsorship (sent with the principal's application)", ifNotTravelling: null, fees: notWorkedOut(combination), tip: "A co-filed application: always sent with the principal's application, never on its own." }
    : { filingWords: "Files nothing", ifNotTravelling: null, fees: null, tip: null };
  if (m === "files_own") return { filingWords: "Files own application", ifNotTravelling: l.role === "principal" ? null : "If not travelling: no filing", fees: fee("Pays their own fees; family maximums apply within one submission (Sample amounts)."), tip };
  if (m === "on_principal") return { filingWords: "On the principal's application", ifNotTravelling: "If not travelling: declared only, no fee", fees: fee("Fees repeat per person on the principal's application (Sample amounts)."), tip };
  if (m === "declared_only") return { filingWords: "Declared only (not accompanying)", ifNotTravelling: "Starts as not travelling: declared only, no fee; if travelling, on the principal's application", fees: "No fee while declared only.", tip };
  return { filingWords: "Filing not set", ifNotTravelling: null, fees: null, tip };
}

// ------------------------------------------------------------------ the plan of filings (preview; the case from PR 2)

export type PlanPerson = { subject: string; role: string; label: string; travelling: boolean };
export type PlannedFiling = { id: string; owner: PlanPerson; kind: "own" | "family" | "co_filed"; applicants: { person: PlanPerson; mode: "applying" | "declared_only" }[] };
/** Who goes on which filing (BR-4, BR-6): Files own → their own filing when travelling, none when not; On the
 *  principal's and Declared only → on the principal's filing, applying when travelling, declared only when not; co_files
 *  → a co-filed filing sent with the principal's; no mode → files nothing. Keyed by the owner, so ids hold steady. */
export function filingPlan(people: PlanPerson[], modeOf: (role: string) => LineMode | null | undefined): { filings: PlannedFiling[]; notFiling: { person: PlanPerson; why: string }[] } {
  const filings: PlannedFiling[] = [], notFiling: { person: PlanPerson; why: string }[] = [];
  const principal = people.find((p) => p.role === "principal");
  const main: PlannedFiling | null = principal ? { id: `filing-${principal.subject}`, owner: principal, kind: "own", applicants: [{ person: principal, mode: "applying" }] } : null;
  if (main) filings.push(main);
  for (const p of people) {
    if (p === principal) continue;
    const to = filingOf(modeOf(p.role));
    if (to === "own") { if (p.travelling) filings.push({ id: `filing-${p.subject}`, owner: p, kind: "own", applicants: [{ person: p, mode: "applying" }] }); else notFiling.push({ person: p, why: "Not travelling (not applying on this case): no filing and no fee." }); }
    else if (to === "principal") { if (main) { main.applicants.push({ person: p, mode: p.travelling ? "applying" : "declared_only" }); main.kind = "family"; } else notFiling.push({ person: p, why: "No principal applicant on this case yet, so there is no application to be on." }); }
    else if (to === "co_filed") filings.push({ id: `filing-${p.subject}`, owner: p, kind: "co_filed", applicants: [] });
    else notFiling.push({ person: p, why: "Takes part in the case but files no application." });
  }
  return { filings, notFiling };
}

const n = (k: number, one: string, many = `${one}s`) => `${k} ${k === 1 ? one : many}`;
/** "What a case gets" (concept §4): the plan for one case of each line's preview count, in words. The same plan the
 *  case's filings use, so the two never disagree (m4). */
export function previewFilings(lines: { role: string; label?: string; min: number; max: number; preview?: number; applies: boolean; filingMode?: LineMode | null }[], combination: string, feesKnown: boolean) {
  const people: PlanPerson[] = [];
  for (const l of lines) {
    const count = l.role === "principal" ? 1 : Math.max(l.min, Math.min(l.max, l.preview ?? (l.min || 1)));
    for (let k = 1; k <= count; k++) people.push({ subject: `${l.role}-${k}`, role: l.role, label: count > 1 ? `${l.label ?? l.role} ${k}` : l.label ?? l.role, travelling: l.filingMode !== "declared_only" });
  }
  const modeOf = (role: string) => { const l = lines.find((x) => x.role === role); return role === "principal" ? "files_own" : l?.filingMode ?? null; };
  const { filings } = filingPlan(people, modeOf);
  if (!filings.length || !people.some((p) => p.role === "principal")) return { filings: [] as PreviewFiling[], submissions: [] as { filings: string[]; splittable: boolean; words: string }[], gets: "Add the principal applicant to see what a case gets." };
  const out: PreviewFiling[] = filings.map((f) => {
    const declared = f.applicants.filter((a) => a.mode === "declared_only").length, paying = f.applicants.length - declared;
    const fee = f.kind === "co_filed" || !feesKnown ? notWorkedOut(combination) : `Fees for ${n(paying, "person", "people")} on this filing${declared ? `; ${declared} declared only, no fee` : ""} (Sample amounts; family maximums within one submission).`;
    const words = f.kind === "co_filed" ? `${f.owner.label}: the sponsorship (cannot be sent alone)` : `${f.owner.label}'s application${f.applicants.length > 1 ? ` (${n(f.applicants.length, "person", "people")}${declared ? `, ${declared} declared only` : ""})` : ""}`;
    return { id: f.id, principal: f.owner.role, roles: [...new Set([f.owner, ...f.applicants.map((a) => a.person)].map((p) => p.role))], kind: f.kind, people: f.applicants.length, declaredOnly: declared, fee, words };
  });
  const coFiled = out.some((f) => f.kind === "co_filed");
  const together = out.length === 1 ? "1 filing" : coFiled ? `${n(out.length, "filing")} sent together: ${out.map((f) => f.words).join(" + ")}` : `${n(out.length, "filing")} in one submission`;
  return { filings: out, submissions: [{ filings: out.map((f) => f.id), splittable: out.length > 1 && !coFiled, words: together }], gets: together };
}
