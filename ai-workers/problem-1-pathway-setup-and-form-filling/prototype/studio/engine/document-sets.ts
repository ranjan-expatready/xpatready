// C6.15 (row B137; SA-1B-19, SA-1B-20): which set of a document type a line uses, and whether a person's documents meet
// it. Pure: no database. The release carries each type's sets with their members named (engine/snapshot.ts), so a case
// reads only its pinned release. A type with no set is its own only member (SA-1B-19 rule 5); a line that names a set
// its type does not have is unresolved, and the release check says so in words (SA-1B-20 rule 3).
import { MODE_WORDS, STANDARD, type SetMode, type StoredSet } from "../contracts/document-sets.ts";

/** A set as the release carries it (document_types[].sets). */
export type SnapSet = { name: string; mode: SetMode; members: { key: string; name: string; when_client: string | null; when_staff: string | null }[] };
/** The set a checklist line uses: its members in order (any one of: the first is the standard), and the line's words. */
export type LineSet = { name: string; mode: SetMode; members: { key: string; name: string; standard: boolean; when_client: string | null; when_staff: string | null }[]; words: string };

/** The release's copy of a type's stored sets, each member named from the library (a name it cannot find stays its key). */
export function snapSets(raw: unknown, nameOf: (key: string) => string | undefined): SnapSet[] | undefined {
  const sets = Array.isArray(raw) ? (raw as StoredSet[]) : [];
  if (!sets.length) return undefined;
  return sets.map((s) => ({ name: s.name, mode: s.mode, members: s.members.map((m) => ({ key: m.key, name: nameOf(m.key) ?? m.key, when_client: m.whenClient ?? null, when_staff: m.whenStaff ?? m.whenClient ?? null })) }));
}

const list = (xs: string[], and: string) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} ${and} ${xs[xs.length - 1]}`);
/** "Any one of: Birth certificate (the standard), Baptism record or School record." · "All of: Bank letter and Bank statements." */
export function setWords(s: Pick<LineSet, "mode" | "members">): string {
  const names = s.members.map((m, i) => (s.mode === "any_one" && i === 0 && s.members.length > 1 ? `${m.name} (the standard)` : m.name));
  return `${MODE_WORDS[s.mode]}: ${list(names, s.mode === "any_one" ? "or" : "and")}.`;
}

/** The set a line uses. `set` is null when the type has no set and the line names none or "Standard" (its own only
 *  member, as before C6.15); `problem` when the line names a set the type does not have. */
export function lineSet(type: { key: string; name: string; sets?: SnapSet[] | null } | undefined, setName: string | null | undefined, lineName: string): { set: LineSet | null; problem: string | null } {
  const want = (setName ?? "").trim() || STANDARD;
  const sets = type?.sets ?? [];
  const found = sets.find((s) => s.name.toLowerCase() === want.toLowerCase());
  if (!found) return want === STANDARD ? { set: null, problem: null } : { set: null, problem: `Line "${lineName}" names set "${want}", which does not exist.` };
  const members = found.members.map((m, i) => ({ ...m, standard: found.mode === "any_one" && i === 0 }));
  return { set: { name: found.name, mode: found.mode, members, words: setWords({ mode: found.mode, members }) }, problem: null };
}

/** Whether the member types a person has a current file of meet the set (any one: one of them; all of: every one), and
 *  which members are still to come. A line with no set is met by its own type. */
export function setMet(set: LineSet | null, ownKey: string, have: Set<string>): { met: boolean; got: string[]; missing: string[] } {
  if (!set) return { met: have.has(ownKey), got: have.has(ownKey) ? [ownKey] : [], missing: have.has(ownKey) ? [] : [ownKey] };
  const got = set.members.filter((m) => have.has(m.key)).map((m) => m.key), missing = set.members.filter((m) => !have.has(m.key)).map((m) => m.key);
  return { met: set.mode === "any_one" ? got.length > 0 : missing.length === 0, got, missing };
}

/** The document types whose files count on a line: its set's members, and its own type (a file sent before the type had
 *  sets is kept and shown, never dropped). */
export const lineKeys = (l: { document: { key: string }; set: LineSet | null }) => [...new Set([l.document.key, ...(l.set?.members.map((m) => m.key) ?? [])])];
/** C6.15 (SA-1B-19 rule 1): any one of: one member's file meets the line; all of: every member's. */
export type SetStatus = { met: boolean; got: { key: string; name: string }[]; missing: { key: string; name: string }[]; words: string };
/** Whether the files of these types meet the line's set, in words ("1 of 2 received; still to come: Bank statements"). */
export function setStatus(l: { document: { key: string }; set: LineSet | null }, have: Set<string>): SetStatus | null {
  if (!l.set) return null;
  const r = setMet(l.set, l.document.key, have), name = (k: string) => l.set!.members.find((m) => m.key === k)?.name ?? k;
  const got = r.got.map((k) => ({ key: k, name: name(k) })), missing = r.missing.map((k) => ({ key: k, name: name(k) }));
  const words = l.set.mode === "any_one"
    ? (r.met ? `Met by ${got.map((x) => x.name).join(" and ")} (any one of the set counts).` : `Any one of the set meets it: ${l.set.members.map((m) => m.name).join(", ")}.`)
    : (r.met ? `All ${l.set.members.length} received.` : `${got.length} of ${l.set.members.length} received; still to come: ${missing.map((x) => x.name).join(", ")}.`);
  return { met: r.met, got, missing, words };
}
/** Which member of the line's set a file is: "member" names its document type key; left out, it is the line's own type
 *  when that is a member. A line with no set takes only its own type. A refusal says it in words. */
export function pickMember(line: { document: { key: string; name: string }; set: LineSet | null; label: string }, raw: unknown): { key: string; name: string } | { problem: string } {
  const want = typeof raw === "string" ? raw.trim() : raw === undefined || raw === null ? "" : null;
  if (want === null) return { problem: "Say which document this file is as text (\"member\"), or leave it out. Nothing was stored." };
  if (!line.set) return want && want !== line.document.key ? { problem: `${line.label} has no substitute set: a file on it is ${line.label}. Nothing was stored.` } : { key: line.document.key, name: line.document.name };
  const names = line.set.members.map((m) => m.name).join(", ");
  const key = want || (line.set.members.some((m) => m.key === line.document.key) ? line.document.key : "");
  if (!key) return { problem: `Say which of the set's documents this file is: ${names}. Nothing was stored.` };
  const m = line.set.members.find((x) => x.key === key);
  return m ? { key: m.key, name: m.name } : { problem: `That document is not in the set this line uses (${line.set.name}): send one of ${names}. Nothing was stored.` };
}
