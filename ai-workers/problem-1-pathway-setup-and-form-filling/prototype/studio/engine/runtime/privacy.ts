// C6.16 Adult privacy and "Send to …" (screens lane, B138; concept BR-1..BR-10; founder P-412): the pure rules. Who
// may get their own link (adults only), whose values a viewer may read (the stored setting, never an age), who may send
// to which address, the code as typed, a link's state and its words, and progress counted on the server. No I/O; every
// refusal says why in words. Ages are Sample; legal points Unconfirmed: no counsel.
import { MINOR } from "../../contracts/runtime.ts";
import { LINK_RULES, LINK_WORDS, type PersonLinkState, type ProgressOnly } from "../../contracts/person-link.ts";
import { ageOn } from "./case.ts";

/** Who is looking: case staff, the case's client (the principal), or an adult on their own link. */
export type Viewer = { kind: "staff" } | { kind: "client" } | { kind: "link"; subjectId: string };
export type PrivacyPerson = { subjectId: string; role: string; keepPrivate: boolean };

/** BR-2, BR-7, SA-1B-269 rules 2 and 10: whether this viewer may not read this person's values. Staff always read;
 *  the principal reads everyone's except a person whose stored setting is on; a link session reads its own person and
 *  the application's (shared, read-only), nobody else's. Reads only the stored setting, never an age. */
export function privateFrom(viewer: Viewer, p: PrivacyPerson): boolean {
  if (viewer.kind === "staff") return false;
  if (viewer.kind === "link") return p.subjectId !== viewer.subjectId && p.role !== "case";
  return p.keepPrivate;
}

export type AdultCheck = { ok: true; age: number } | { ok: false; code: "principal" | "no_birth_date" | "minor"; why: string };
/** BR-1 (AG07-D23): an adult on the case (18 or over today from their recorded date of birth; the age is Sample,
 *  Unconfirmed: no counsel) other than the principal and the application may get their own link or the staff tick. */
export function adultCheck(p: { role: string; label: string }, birth: unknown, today: Date): AdultCheck {
  if (p.role === "principal" || p.role === "case") return { ok: false, code: "principal", why: "The principal answers on their own family link." };
  const age = ageOn(birth, today);
  if (age === null) return { ok: false, code: "no_birth_date", why: `${p.label}'s date of birth is not answered yet (or is not a real past date): answer it first, then ${p.label} can get their own link.` };
  if (age < MINOR.underAge) return { ok: false, code: "minor", why: `${p.label} is under ${MINOR.underAge}: a child's answers stay with the family, so there is no own link and no privacy tick (the age is Sample; Unconfirmed: no counsel).` };
  return { ok: true, age };
}

/** An email address as stored: trimmed, lower case, one @ with a dot after it; null when it is not one. */
export function normalAddress(x: string): string | null {
  const a = x.trim().toLowerCase();
  if (a.length < 3 || a.length > 254 || /[\s<>()[\]\\,;:"]/.test(a)) return null;
  return /^[^@]+@[^@]+\.[^@.]+$/.test(a) ? a : null;
}
/** "partner@example.com" → "p•••@example.com": the only form history and screens show (BR-9). */
export function maskAddress(a: string): string {
  const [user, domain] = a.split("@");
  return `${(user ?? "").slice(0, 1)}•••@${domain ?? ""}`;
}
/** The code as typed (GOV.UK): spaces, hyphens and dashes are allowed; null when it is not 6 digits after that. */
export function normalCode(x: string): string | null {
  const c = x.replace(/[\s\-‐-―−]/g, "");
  return /^\d{6}$/.test(c) ? c : null;
}

export type SendRefusal = { status: 403 | 409; why: string };
/** BR-3 (challenge B1, P-412): the principal sends or resends only while the person has not accepted any link, or after
 *  that only to the kept address (the one they accepted on); a new address after acceptance is staff only. An address
 *  another person on the case already uses is refused for everyone. */
export function sendRefusal(i: { sender: "client" | "staff"; label: string; address: string; kept: string | null; others: string[] }): SendRefusal | null {
  if (i.others.includes(i.address)) return { status: 409, why: `This address is already used for someone else on this case. Use ${i.label}'s own address.` };
  if (i.sender === "client" && i.kept && i.kept !== i.address) return { status: 403, why: `${i.label} already uses ${maskAddress(i.kept)}. Ask the firm to send to a new address.` };
  return null;
}

export type LinkRow = { sentAt: Date; expiresAt: Date; acceptedAt: Date | null; voidedAt: Date | null; voidWhy: string | null; newerSentAt?: Date | null };
/** A link's state: what happened to it last (a dead link stays dead; expiry only counts while it is not voided). */
export function linkState(l: LinkRow, now: Date): PersonLinkState["state"] {
  if (l.voidedAt) return l.voidWhy === "taken_back" ? "taken_back" : l.voidWhy === "locked" ? "locked" : "superseded";
  if (l.expiresAt.getTime() <= now.getTime()) return "expired";
  return l.acceptedAt ? "accepted" : "sent";
}
/** "9 Nov" (the day the screens show; UTC). */
export const dayOf = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
/** BR-10, challenge m2: why a link no longer works, naming no person; null while it works. */
export function deadWords(l: LinkRow, now: Date): string | null {
  switch (linkState(l, now)) {
    case "taken_back": return `This link was taken back on ${dayOf(l.voidedAt!)}. Ask whoever sent it for a new one.`;
    case "superseded": return `This link was replaced by a newer one${l.newerSentAt ? ` sent on ${dayOf(l.newerSentAt)}` : ""}. Use the newest email.`;
    case "locked": return LINK_WORDS.locked;
    case "expired": return `This link expired on ${dayOf(l.expiresAt)}. Ask whoever sent it for a new one.`;
    default: return null;
  }
}

/** BR-4: a code typed against the link's current code. "none": no code was sent (or it was used); "expired": after 15
 *  minutes (not a wrong try); "wrong" counts towards the five that void the link. */
export function codeCheck(l: { codeHash: string | null; codeExpiresAt: Date | null }, typedHash: string, now: Date): "right" | "wrong" | "expired" | "none" {
  if (!l.codeHash || !l.codeExpiresAt) return "none";
  if (l.codeExpiresAt.getTime() <= now.getTime()) return "expired";
  return l.codeHash === typedHash ? "right" : "wrong";
}
/** The words for a wrong code: tries left, or the lock. */
export const wrongWords = (wrongTries: number) => wrongTries >= LINK_RULES.wrongTries ? LINK_WORDS.locked : `That code is not right. You have ${LINK_RULES.wrongTries - wrongTries} ${LINK_RULES.wrongTries - wrongTries === 1 ? "try" : "tries"} left.`;
/** BR-4: the limits on sending codes (per email address, in the window) and on typing them (per network address and
 *  for the whole server, per minute). The words when over; null when within. */
export function overLimit(k: { kind: "code_sent"; sentToAddress: number } | { kind: "code_try"; fromNetwork: number; onServer: number }): string | null {
  if (k.kind === "code_sent") return k.sentToAddress > LINK_RULES.codesPerAddress ? `Too many codes were sent to this address in the last ${LINK_RULES.codesWindowMinutes} minutes. Wait, then press Send me a code again.` : null;
  if (k.fromNetwork > LINK_RULES.triesPerNetwork) return "Too many codes were tried from your network in the last minute. Wait a minute, then try again.";
  return k.onServer > LINK_RULES.triesPerServer ? "Too many codes are being tried right now. Wait a minute, then try again." : null;
}

/** The parts of a questionnaire section progress reads (engine/runtime/case.ts caseView). */
export type ProgressSection = { answered: number; missing: string[]; invalid: number; questions: { required: boolean; hidden: boolean; answer: { at: string } | null; rows: { answer: { at: string } | null }[] }[]; group: { required: boolean } | null };
/** BR-7 (challenge m3): progress counted on the server, never per device: a part is done when nothing required is missing
 *  and no answer needs a fix; a part with nothing required counts as done and is counted as optional too. */
export function progressOf(sections: ProgressSection[]): ProgressOnly {
  const optional = sections.filter((s) => !s.group?.required && !s.questions.some((q) => q.required && !q.hidden)).length;
  const done = sections.filter((s) => s.missing.length === 0 && s.invalid === 0).length;
  const times = sections.flatMap((s) => s.questions.flatMap((q) => [q.answer?.at, ...q.rows.map((r) => r.answer?.at)])).filter((x): x is string => !!x).sort();
  return { done, asked: sections.length, optional, saved_at: times.at(-1) ?? null };
}
/** The progress line the principal reads ("4 of 7 parts done (2 optional) · last saved 9 Nov"). */
export const progressWords = (p: ProgressOnly) => `${p.done} of ${p.asked} part${p.asked === 1 ? "" : "s"} done${p.optional ? ` (${p.optional} optional)` : ""}${p.saved_at ? ` · last saved ${dayOf(new Date(p.saved_at))}` : ""}`;

/** BR-3, layout §4: the officer's line for one adult, in words. */
export function officerWords(i: { label: string; principal: string; adult: boolean; keepPrivate: boolean; privateAt: Date | null; link: (LinkRow & { masked: string; givenBy: string }) | null; acceptedOn: { masked: string; givenBy: string } | null; now: Date }): string {
  const proven = i.acceptedOn ? ` · answered on the link sent to ${i.acceptedOn.masked} (address given by ${i.acceptedOn.givenBy})` : "";
  if (!i.link) return i.keepPrivate ? `Kept private from ${i.principal} since ${dayOf(i.privateAt!)}${proven}` : i.adult ? `Answers by ${i.principal}` : `Answered by ${i.principal}`;
  const st = linkState(i.link, i.now);
  if (st === "accepted") return `With ${i.label} since ${dayOf(i.link.acceptedAt!)} · private from ${i.principal}${proven}`;
  if (st === "sent") return `Link sent ${dayOf(i.link.sentAt)} to ${i.link.masked} (address given by ${i.link.givenBy})${i.keepPrivate ? ` · private from ${i.principal}` : ` · answers by ${i.principal} until ${i.label} opens it`}`;
  const what = st === "taken_back" ? `Taken back ${dayOf(i.link.voidedAt!)}` : st === "locked" ? `Locked after ${LINK_RULES.wrongTries} wrong codes` : st === "expired" ? `Link expired ${dayOf(i.link.expiresAt)}` : "Link replaced";
  return `${what}${i.keepPrivate ? ` · still private from ${i.principal}` : ` · answers by ${i.principal}`}${proven}`;
}

/** B128, B155: the person a part belongs to: a relative's key (`<person>/parent_1`, `<person>/sibling`) is that person's. */
export const ownerOf = (about: string) => about.split("/")[0];
