// C6.13 (B135; P-406 (1); concept screens/B135/concept.md r2, challenge.md): filing changes while preparing, pure rules.
// Make principal swaps the principal with the spouse or partner; Remove filing stops a person's own application (they stay
// on the case, not travelling) and Add filing back undoes it. What each change does to the other filings is worked out by
// running the same derivation as Prepare application (engine/runtime/filings.ts deriveFilings) on the people as they are
// now and as they would be, and comparing the two (BR-4, M7): nothing here is a second copy of the fee or filing rules.
// AG-07 AG-7-45 rule 9 (Make principal, Remove filing, "Make someone else principal first", "shows a warning and never
// blocks"); AG-7-4 rules 1-3. BK-9 (P-448): the same on every pathway, people on the principal's application included
// (a shared filing): what moves is worked out by the derivation, never refused for the combination. No database, no
// clock. Checks: tests/runtime/check_filing_changes.ts, tests/check_bk9_shared_filing.ts.
import { createHash } from "node:crypto";
import type { CaseFilings, FeeLine } from "../../contracts/runtime.ts";
import type { Participant } from "./case.ts";

export const CHANGE_KINDS = ["make_principal", "remove_filing", "add_back"] as const;
export type ChangeKind = (typeof CHANGE_KINDS)[number];
/** One stored change (table filing_change): who became principal (`subject`) and who was (`other`), or whose filing. */
export type StoredChange = { kind: ChangeKind | "travelling_flag"; subject: string; other: string | null; at: string };
export type Refusal = { status: 404 | 409 | 422; words: string };
/** The release's filing mode per role, as the case reads it (C11.12 releaseModes; a role absent files nothing). */
export type ModeOf = (role: string) => string | null | undefined;

const SPOUSE = "spouse_or_partner";
const name = (p: Participant | undefined) => p?.label ?? "this person";

/** BR-3b (the Blocker): the client is the person who answers the questionnaire. It stays the same person whatever the
 *  roles become: the principal when the case opened, i.e. the former principal of the case's first Make principal. */
export function clientPersonOf(people: Participant[], changes: StoredChange[]): string | undefined {
  const first = [...changes].filter((c) => c.kind === "make_principal" && c.other).sort((a, b) => a.at.localeCompare(b.at))[0];
  return first?.other ?? people.find((p) => p.role === "principal")?.subjectId;
}

/** The people with `client` set (case.ts confirmation reads it instead of the principal role). */
export const withClient = (people: Participant[], client: string | undefined): Participant[] =>
  people.map((p) => (p.role === "case" ? p : { ...p, client: p.subjectId === client }));

/** BK-9: an application the release sends together with the principal's (co-filed) is never removed on its own. */
const CO_FILED = "co_files";

/** The people as they would be after the change, or the refusal in words (BR-0 to BR-3, BR-7). `recorded` names a filing
 *  of the case already recorded as submitted (BR-7: then nothing on the case changes). */
export function applyChange(kind: ChangeKind, subject: string, people: Participant[], o: { modeOf: ModeOf; combination: string; recorded: { name: string; on: string; number: string } | null }): { after: Participant[]; other: string | null } | Refusal {
  const me = people.find((p) => p.subjectId === subject && p.role !== "case");
  if (!me) return { status: 404, words: "No such person on this case." };
  if (o.recorded) return { status: 409, words: `${o.recorded.name}'s application was recorded as submitted to IRCC on ${o.recorded.on} (${o.recorded.number}), so the people and filings of this case are not changed here. Taking back a submitted application is done in the case's lifecycle (not built here).` };
  const principal = people.find((p) => p.role === "principal");
  if (kind === "make_principal") {
    if (me.role === "principal") return { status: 422, words: `${name(me)} is already the principal applicant.` };
    if (me.role !== SPOUSE) return { status: 422, words: `${name(me)} is a ${me.role === "child" ? "child" : me.role.replace(/_/g, " ")} of the principal: only the spouse or partner can swap with the principal. To make ${name(me)} the principal applicant, open a case for them.` };
    if (!me.applies) return { status: 422, words: `Add ${name(me)}'s filing back first: the principal always files their own application.` };
    if (!principal) return { status: 422, words: "This case has no principal applicant to swap with." };
    return { other: principal.subjectId, after: people.map((p) => (p.subjectId === me.subjectId ? { ...p, role: "principal" } : p.subjectId === principal.subjectId ? { ...p, role: SPOUSE } : p)) as Participant[] };
  }
  if (me.role === "principal") return { status: 422, words: "Make someone else principal first: the principal applicant's filing is never removed." };
  // Review M2: before the travelling checks, as a co-filer is stored not travelling (it files, but does not travel).
  if (o.modeOf(me.role) === CO_FILED) return { status: 422, words: `${name(me)}'s application is sent together with the principal's application: it is neither removed nor added back on its own.` };
  if (kind === "remove_filing") {
    if (!me.applies) return { status: 422, words: `${name(me)} has no filing: they are not travelling.` };
    return { other: null, after: people.map((p) => (p.subjectId === me.subjectId ? { ...p, applies: false } : p)) };
  }
  if (me.applies) return { status: 422, words: `${name(me)} already has a filing.` };
  return { other: null, after: people.map((p) => (p.subjectId === me.subjectId ? { ...p, applies: true } : p)) };
}

const cad = (cents: number) => `CAD ${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;
/** What one person's filing pays per fee line, in words ("covered by the family maximum" for an exempt capped line). */
function lineWords(l: FeeLine | undefined): string {
  if (!l) return "none";
  if ((l as { waiting?: string }).waiting) return "waits for the date of birth";
  if (l.exempt) return /family/i.test(l.why) ? "covered by the family maximum" : "none (exempt)";
  return cad(l.amount_cents);
}
const payable = (f: CaseFilings) => (f.derived ? f.fees.filter((l) => !l.exempt && !(l as { waiting?: string }).waiting).reduce((s, l) => s + l.amount_cents, 0) : 0);

/** `on` (BK-9): the owner's name when the person has no application of their own here, only a place on someone's
 *  shared one (before or after the change), so the line is never called "their filing". */
export type FilingChangeLine = { person: string; label: string; words: string[]; on?: string };
/** BR-4, BR-5: per person (by name), what changes between the derivation now and after: their filing starting or
 *  stopping, applicants joining or leaving, and each fee line's amount. A person whose filing changes is a dependant
 *  named in the warning. `extra` adds words per person (items, Ready to file, a minor's signer: the API's part). */
export function diffFilings(before: CaseFilings, after: CaseFilings, people: Participant[], extra: Map<string, string[]> = new Map()): { lines: FilingChangeLine[]; totals: { before_cents: number; after_cents: number } } {
  const out: FilingChangeLine[] = [];
  const label = (s: string) => people.find((p) => p.subjectId === s)?.label ?? "someone";
  const owners = (f: CaseFilings) => new Map((f.derived ? f.filings : []).filter((x) => x.owner).map((x) => [x.owner!.subject, x]));
  const b = owners(before), a = owners(after);
  // BK-9: a shared application whose owner changes (Make principal on a family on the principal's application) is one
  // application that moves: the old owner is on the new owner's application, and the new owner was on the old one's.
  const movedTo = new Map<string, string>();
  for (const [from, fb] of b) if (!a.has(from)) for (const [to, fa] of a) if (!b.has(to) && fb.applicants.some((x) => x.subject === to) && fa.applicants.some((x) => x.subject === from)) movedTo.set(from, to);
  const movedFrom = new Map([...movedTo].map(([f, t]) => [t, f]));
  for (const p of people.filter((x) => x.role !== "case")) {
    const s = p.subjectId, words: string[] = [];
    let fb = b.get(s);
    const fa = a.get(s);
    if (movedTo.has(s)) words.push(`Now on ${label(movedTo.get(s)!)}'s application (the same application, its items and fees kept)`);
    else if (movedFrom.has(s)) { words.push(`The family's application is now ${p.label}'s (the same application, its items and fees kept)`); fb = b.get(movedFrom.get(s)!); }
    else if (fb && !fa) words.push("Their own filing stops (not travelling)");
    else if (!fb && fa) words.push("Their own filing starts again (the same filing and items as before)");
    if (fb && fa) {
      const ab = new Set(fb.applicants.map((x) => x.subject)), aa = new Set(fa.applicants.map((x) => x.subject));
      for (const x of aa) if (!ab.has(x)) words.push(`${label(x)} joins this filing`);
      for (const x of ab) if (!aa.has(x)) words.push(`${label(x)} leaves this filing`);
      // BK-9 (C11.12): on a shared application a person not travelling stays on it, declared only; said either way.
      for (const x of fa.applicants) { const was = fb.applicants.find((y) => y.subject === x.subject); if (was && was.mode !== x.mode) words.push(x.mode === "declared_only" ? `${label(x.subject)} is declared on this filing only (not travelling)` : `${label(x.subject)} applies on this filing again`); }
      const lines = new Set([...(before.derived ? before.fees : []), ...(after.derived ? after.fees : [])].filter((l) => l.person === s).map((l) => l.line));
      for (const line of lines) {
        const lb = before.derived ? before.fees.find((l) => l.person === s && l.line === line) : undefined;
        const la = after.derived ? after.fees.find((l) => l.person === s && l.line === line) : undefined;
        const wb = lineWords(lb), wa = lineWords(la);
        if (wb !== wa) words.push(`${(la ?? lb)!.label}: ${wb} → ${wa}`);
      }
    }
    words.push(...(extra.get(s) ?? []));
    const onOwner = movedTo.get(s) ?? (!b.has(s) && !a.has(s) ? [...a.values(), ...b.values()].find((x) => x.applicants.some((y) => y.subject === s))?.owner?.subject : undefined);
    if (words.length) out.push({ person: s, label: p.label, words, ...(onOwner ? { on: label(onOwner) } : {}) });
  }
  return { lines: out, totals: { before_cents: payable(before), after_cents: payable(after) } };
}

/** BR-8 (m3): the basis is the fingerprint of the preview's own result, so a change in people, roles, ages, groups or
 *  fees between the preview and the apply is refused, never applied under a stale warning. */
export const basisOf = (preview: unknown) => createHash("sha256").update(JSON.stringify(preview)).digest("hex");
