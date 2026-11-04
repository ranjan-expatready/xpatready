// C9.2 Out of date (runtime lane, M3-F; r5c BR-12; P-65, P-136, P-168 block 1, P-171 (1)): a finished item (a validated
// copy read back, a form signed by hand and scanned, a section entered in the portal) is never changed when a fact it
// read changes; it is marked Out of date with the fact, the old and the new value and the date, in words (concept r5c
// l. 62: "… is out of date: date of marriage changed on 29 Oct. Prepare it again or undo the change before filing.").
// Pure: the API passes what the item read then and what the case says now. No model call (US$0).
import type { FormFact } from "./forms.ts";

/** One fact that reads differently now from when the item was made: whose, which, the value then and now, and when. */
/** `confirmed`: false when the new value is saved but not confirmed yet (so the form does not read it). */
export type FactChange = { fact: string; about: string; label: string; person: string; was: unknown; now: unknown; confirmed: boolean; at: string | null };
/** What the API knows to word a change: the question's words, a person's label, when the current answer was saved, and
 *  (optional) the newest value saved for a fact the form no longer reads because it is not confirmed. */
export type ChangeWords = { label: (fact: string) => string; person: (about: string) => string; at: (about: string, fact: string) => string | null; saved?: (about: string, fact: string) => unknown };

const subjectOf = (about: string) => about.split("/")[0];
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** The facts whose value differs between what an item read (`then`) and today (`now`), one line per person and fact
 *  (a fact written in several form fields is one change). A fact no longer read is a change to "no answer", or to its
 *  newest saved value marked not confirmed yet. Representative facts (from the firm record) are about "representative". */
export function factChanges(then: Pick<FormFact, "fact" | "about" | "row" | "value">[], now: Pick<FormFact, "fact" | "about" | "row" | "value">[], words: ChangeWords): FactChange[] {
  const key = (f: { fact: string; about: string; row: number | null }) => `${subjectOf(f.about)}|${f.fact}|${f.row ?? ""}`;
  const a = new Map(then.map((f) => [key(f), f])), b = new Map(now.map((f) => [key(f), f]));
  const out = new Map<string, FactChange>();
  for (const k of [...new Set([...a.keys(), ...b.keys()])]) {
    const x = a.get(k), y = b.get(k), f = (y ?? x)!;
    if (x && y && same(x.value, y.value)) continue;
    const about = subjectOf(f.about), id = `${about}|${f.fact}`;
    if (out.has(id)) continue;
    const pending = !y ? words.saved?.(about, f.fact) ?? null : null;
    out.set(id, { fact: f.fact, about, label: words.label(f.fact), person: words.person(about), was: x?.value ?? null, now: y ? y.value : pending, confirmed: !!y || pending === null, at: words.at(about, f.fact) });
  }
  return [...out.values()].sort((p, q) => p.person.localeCompare(q.person) || p.label.localeCompare(q.label));
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "4 Nov 2026" (the date in Toronto, the database's zone, as the rest of the case view). */
export function dayWords(at: string | Date | null): string | null {
  if (!at) return null;
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return null;
  const [y, m, day] = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit" }).format(d).split("-").map(Number);
  return `${day} ${MONTHS[m - 1]} ${y}`;
}

/** A value as a person reads it: text in quotes, Yes or No, a date as written, an address or a phone joined, nothing as
 *  "no answer". Long values are cut at 60 characters. */
export function valueWords(v: unknown): string {
  if (v === null || v === undefined || v === "") return "no answer";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number") return String(v);
  const text = typeof v === "string" ? v : Array.isArray(v) ? v.map((x) => (typeof x === "object" ? Object.values(x ?? {}).join(" ") : String(x))).join(", ")
    : Object.values(v as Record<string, unknown>).filter((x) => x !== null && x !== undefined && x !== "").map(String).join(" ");
  const cut = text.length > 60 ? `${text.slice(0, 59)}…` : text;
  return `"${cut}"`;
}

/** One change in words: "family name of Sample Client A changed from "SAMPLE" to "SAMPLEDZ" on 4 Nov 2026". */
export function changeWords(c: FactChange): string {
  const when = dayWords(c.at);
  return `${c.label.charAt(0).toLowerCase()}${c.label.slice(1)} of ${c.person} changed from ${valueWords(c.was)} to ${valueWords(c.now)}${c.confirmed ? "" : " (not confirmed yet)"}${when ? ` on ${when}` : ""}`;
}

/** What went out of date, and what the person does next (BR-12: never changed; prepare again or undo). */
export type FinishedKind = "validated_copy" | "signed_scan" | "entered";
const WHAT: Record<FinishedKind, (form: string, at: string | null) => string> = {
  validated_copy: (form, at) => `The validated copy of ${form}${at ? ` read back ${at}` : ""} is out of date`,
  signed_scan: (form, at) => `The signed ${form}${at ? ` (scan in ${at})` : ""} is out of date`,
  entered: (form, at) => `${form} as entered in the portal${at ? ` (${at})` : ""} is out of date`,
};
const NEXT: Record<FinishedKind, (form: string) => string> = {
  validated_copy: (form) => `Make a new copy of ${form}, validate it and read it back, or undo the change before filing.`,
  signed_scan: (form) => `A new signed ${form} is needed: print the new copy, have it signed and upload the scan, or undo the change before filing.`,
  entered: () => "Enter the new answers in the portal and tick the section again, or undo the change before filing.",
};

/** The item's reason (the contract's `reason`): what is out of date, each change with its old and new value and date,
 *  and the next step (`next` replaces it, as a Paper line's own steps do). At most three changes are spelt out; the rest
 *  are counted. */
export function outOfDateReason(kind: FinishedKind, form: string, finishedAt: string | Date | null, changes: FactChange[], extra: string[] = [], next?: string): string {
  const lines = [...extra, ...changes.slice(0, 3).map(changeWords)];
  const more = changes.length > 3 ? `, and ${changes.length - 3} more change${changes.length - 3 === 1 ? "" : "s"}` : "";
  const what = lines.length ? `: ${lines.join("; ")}${more}.` : ": a fact it reads changed since.";
  return `${WHAT[kind](form, dayWords(finishedAt))}${what} ${next ?? NEXT[kind](form)}`;
}

/** BR-20: the representative of record changed since a signed IMM 5476 was printed (it names the earlier one). */
export function representativeWords(earlier: string | null, now: string | null, at: string | Date | null): string {
  const when = dayWords(at);
  return `the representative of record changed${earlier && now ? ` from ${earlier} to ${now}` : ""}${when ? ` on ${when}` : ""}`;
}

/** The earlier value Undo restores (C9.2): walking back from the current answer, the newest earlier answer whose value
 *  differs from it (a confirmation of the same value is not a change). Null when there is nothing to undo. */
export function undoTarget<T extends { id: string; value: unknown }>(current: T, earlier: T[]): T | null {
  return earlier.find((x) => x.id !== current.id && !same(x.value, current.value)) ?? null;
}
