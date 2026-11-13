// Firm, users and case team (C6.11, M3-11, BR-20; stand-ins SI-9 and SI-15): pure rules, no database. The firms and
// their users are seeded Sample data (samples/firms.json); the team's AG-01 owns firm setup and users and AG-07
// CaseTeamMember the case team, and plug in here later in the same shape. Words (P-154): the representative is licensed
// and named on IMM 5476; a case officer prepares the case; firm admin is a duty (assignment). Every name, licence body
// and number is Sample. Legal points: Unconfirmed: no counsel.

export type Duty = "case" | "represent" | "firm_admin";
export type Licence = { body: string; category: string; number: string };
export type FirmUser = { id: string; name: string; duties: Duty[]; licence: Licence | null; family_name?: string; given_names?: string; email?: string };
export type Office = { unit?: string | null; street_number?: string | null; street_name?: string | null; city?: string | null; province_state?: string | null; postal_code?: string | null; country?: string | null; phone?: { country_code: string; number: string; extension?: string } | null;
  /** B107: the office's fax, when it has one (IMM 5476 question 7 prints a fax box; its gate writes it only then). */
  fax?: { country_code: string; number: string } | null };
export type Firm = { key: string; name: string; solo: boolean; defaultRepresentative?: string; office?: Office; users: FirmUser[] };
export type TeamRole = "LEAD_REPRESENTATIVE" | "OFFICER";
export type Member = { userId: string; role: TeamRole; assignedBy: string; assignedAt: Date; endedAt: Date | null; endedBy: string | null; endReason: string | null };

export const firmOf = (firms: Firm[], userId: string) => firms.find((f) => f.users.some((u) => u.id === userId)) ?? null;
export const userIn = (firm: Firm, userId: string) => firm.users.find((u) => u.id === userId) ?? null;

/** Why this user cannot be the representative of record (null: they can). Licensed means the represent duty and a
 *  licence with a body and number (IMM 5476 names both). */
export function cannotRepresent(firm: Firm, userId: string): string | null {
  const u = userIn(firm, userId);
  if (!u) return "That person is not in your firm.";
  if (!u.duties.includes("represent") || !u.licence?.number || !u.licence.body) return `${u.name} is not a licensed representative, so cannot be the representative of record.`;
  return null;
}

/** Why this user cannot be a case officer on the firm's case (null: they can). */
export function cannotBeOfficer(firm: Firm, userId: string): string | null {
  const u = userIn(firm, userId);
  if (!u) return "That person is not in your firm.";
  if (!u.duties.includes("case")) return `${u.name} does not work on cases.`;
  return null;
}

/** The team a new case opens with. Asked for: each must pass the rules. Not asked: the firm's default representative (else its only one), and the firm's case officers who are not representatives (a solo firm: its one person is both). */
export function openingTeam(firm: Firm, asked: { representative?: string; caseOfficers?: string[] }): { representative: string; officers: string[] } | { field: "representative" | "caseOfficers"; message: string } {
  let representative = asked.representative ?? firm.defaultRepresentative;
  if (!representative) {
    const licensed = firm.users.filter((u) => !cannotRepresent(firm, u.id));
    if (licensed.length !== 1) return { field: "representative", message: licensed.length ? "Choose the representative of record: your firm has more than one representative." : "Your firm has no licensed representative, so a case cannot open yet." };
    representative = licensed[0].id;
  }
  const notRep = cannotRepresent(firm, representative);
  if (notRep) return { field: "representative", message: notRep };
  let officers = asked.caseOfficers ? [...new Set(asked.caseOfficers)] : firm.users.filter((u) => u.duties.includes("case") && !u.duties.includes("represent")).map((u) => u.id);
  if (!officers.length) officers = [representative];
  for (const o of officers) { const why = cannotBeOfficer(firm, o); if (why) return { field: "caseOfficers", message: why }; }
  return { representative, officers };
}

/** Who may assign and reassign the case team: a firm admin of the case's own firm. */
export function cannotAssign(firm: Firm, actorId: string): string | null {
  const u = userIn(firm, actorId);
  if (!u) return "Only your own firm's cases can be changed.";
  if (!u.duties.includes("firm_admin")) return `Only the firm admin assigns the case team; ${u.name} works on the case.`;
  return null;
}

export const current = (members: Member[]) => members.filter((m) => !m.endedAt);
export const representativeOf = (members: Member[]) => current(members).find((m) => m.role === "LEAD_REPRESENTATIVE") ?? null;

/** IMM 5476's representative part, filled from the representative of record (the shared library's canonical facts).
 *  The category key is the library's; the licensing province applies to lawyers and notaries only. Sample values. */
export function representativeFacts(firm: Firm, members: Member[]): Record<string, string | null> | null {
  const rep = representativeOf(members), u = rep ? userIn(firm, rep.userId) : null;
  if (!u?.licence) return null;
  return {
    "representative.representative_category": u.licence.category,
    "representative.membership_id": u.licence.number,
    "representative.licensing_province": null,
  };
}

/** C7.7 (G25): the representative of record's contact facts on IMM 5476 (name, e-mail, the firm's office address and
 *  phone), from the firm record, keyed by the library's person facts. A case has no representative participant: these
 *  facts are about "representative" (the renderer's own key for that role) and count as confirmed, because the firm
 *  record, not the client, is their source. A missing value is left out (asked as before). Sample values. */
export const REPRESENTATIVE = "representative", FIRM_RECORD = "firm_record";
/** B107: the office's country as the form prints it ("canada" → "Canada"); a free-text answer, as the library's country
 *  question on the configured checkpoint has no list. */
export const countryName = (c: string | null | undefined) => (c ? c.trim().replace(/(^|[\s-])\p{Ll}/gu, (x) => x.toUpperCase()) : c);
/** QA-289: the firm's office phone as a person reads it ("+1 4165550100"), for a release whose questions read the telephone
 *  as text; a value that is not the firm record's phone object is left as it is. */
export function phoneText(phone: unknown): unknown {
  if (!phone || typeof phone !== "object") return phone;
  const p = phone as { country_code?: unknown; number?: unknown; extension?: unknown };
  const number = String(p.number ?? "").trim();
  if (!number) return null;
  const cc = String(p.country_code ?? "").replace(/^\+/, "").trim(), ext = String(p.extension ?? "").trim();
  return `${cc ? `+${cc} ` : ""}${number}${ext ? ` ext. ${ext}` : ""}`;
}

/** BK-23 (#1695 C4): the firm record's phone facts on IMM 5476 (11-2021)'s question 7, the number and the fax. Where the
 *  release's question reads one as a phone (case.ts shapeOf: some form of the release writes it part by part), it goes on
 *  as the phone itself (country code and number); else as the text it always was (the number, and its extension). */
export const FIRM_PHONE_FACTS = ["person.phone_number", "person.fax_number"] as const;
/** BK-23: the firm record's phone as the text an IMM 5476 box that writes its value as it is has always held: the number
 *  (area code included) and its extension in words, never the country code (its own box) and never "[object Object]". A
 *  value that is not a phone object is left as it is. */
export function phoneInOneBox(phone: unknown): unknown {
  if (!phone || typeof phone !== "object" || Array.isArray(phone)) return phone;
  const p = phone as { number?: unknown; extension?: unknown };
  const number = String(p.number ?? "").trim(), ext = String(p.extension ?? "").trim();
  return number ? `${number}${ext ? ` ext. ${ext}` : ""}` : null;
}
/** BK-23: whether a form field's steps write the value as it is (as_is, with or without a stated length), so a phone
 *  goes in as phoneInOneBox's text; a step that reads a phone's parts (phone_part, phone:, a country code test) never. */
export const writesAsIs = (transform: string | null | undefined) => String(transform ?? "as_is").split(/;|->/).map((x) => x.trim()).filter(Boolean)
  .every((x) => /^as_is(?: \(max \d+ char(?:s|acters)\))?$/.test(x) || /^max(?:_chars:| )\d+(?: char(?:s|acters))?$/.test(x));

/** IMM 5476's representative block from the firm record. QA-289: the office phone goes on in the shape the release's
 *  question reads: its parts (country code, number) where a form writes the phone part by part (`phoneParts`, the
 *  questionnaire's phone kind, case.ts shapeOf); required, so no caller can forget it (review m1); else as text a person can read, never the parts object shown as "[object Object]".
 *  BK-23 (#1695 C4): `phoneParts` may instead say, fact by fact, whether the release reads it as a phone; then
 *  person.telephone_number, person.phone_number and person.fax_number each go on in their own question's shape (a
 *  boolean keeps QA-289's rule: person.telephone_number only). */
export function representativeContact(firm: Firm, members: Member[], phoneParts: boolean | ((fact: string) => boolean)): Record<string, unknown> | null {
  const rep = representativeOf(members), u = rep ? userIn(firm, rep.userId) : null;
  if (!u) return null;
  const o = firm.office ?? {};
  const isPhone = (fact: string) => (typeof phoneParts === "function" ? phoneParts(fact) : fact === "person.telephone_number" && phoneParts);
  const asPhone = (p: { country_code?: string; number?: string } | null | undefined) => (p?.number ? p : undefined);
  const all: Record<string, unknown> = {
    "person.family_name": u.family_name, "person.given_names": u.given_names, "person.email_address": u.email,
    "person.mailing_address_unit": o.unit, "person.mailing_address_street_number": o.street_number, "person.mailing_address_street_name": o.street_name,
    "person.mailing_address_city": o.city, "person.mailing_address_province_state": o.province_state, "person.mailing_address_postal_code": o.postal_code,
    "person.mailing_address_country": o.country, "person.telephone_number": isPhone("person.telephone_number") ? o.phone : phoneText(o.phone),
    // B107 (QA-300): IMM 5476's question 7 ("Your representative's contact information") under the keys the configured
    // checkpoint's map reads. The tech lead's ruling on #1072 kept them off until IMM 5475's designated individual was no
    // longer read as "representative": its part 5 and 6 are now filled by hand (samples/form-field-gates.json, IRCC: "someone
    // who will not act as your representative"), and a form that does not name the representative of record never reads the
    // firm record (QA-296, namesRepresentative below).
    "person.address_apt_unit": o.unit, "person.address_street_number": o.street_number, "person.address_street_name": o.street_name,
    "person.address_city": o.city, "person.address_province_state": o.province_state, "person.address_postal_code": o.postal_code,
    "person.address_country": countryName(o.country), "person.email": u.email,
    "person.phone_country_code": o.phone?.country_code?.replace(/^\+/, "") || undefined, "person.phone_number": isPhone("person.phone_number") ? asPhone(o.phone) : phoneInOneBox(o.phone) ?? undefined,
    "person.fax_country_code": o.fax?.country_code?.replace(/^\+/, "") || undefined, "person.fax_number": isPhone("person.fax_number") ? asPhone(o.fax) : o.fax?.number || undefined,
  };
  // The names are the same keys on IMM 5475 and IMM 5476, so they are kept off a form that does not name the
  // representative of record by the form (QA-296, namesRepresentative below).
  return Object.fromEntries(Object.entries(all).filter(([, v]) => v !== undefined && v !== null && v !== ""));
}

/** QA-296 (C6.11, C7.7): whether a form names the representative of record: one of its form fields reads one of the
 *  library's representative.* facts (the licence part) about the person "representative", as IMM 5476 does. The firm
 *  record fills only such a form. A form that reads only a name or contact about "representative" names someone else
 *  (on the configured checkpoint, IMM 5475's designated individual: IRCC's "someone who will not act as your
 *  representative"), so the firm record's facts never reach it and the tab never says they fill it. Read from the
 *  form's map, never its number (P-319); the Prepare item's tag (api/src/case-prepare.ts, break M3) asks the same of the
 *  form's confirmed facts instead (review nit). */
export function namesRepresentative(entries: { outcome?: string; fact?: string | null; person?: string | null }[]): boolean {
  return entries.some((e) => e.outcome === "mapped" && e.person === REPRESENTATIVE && !!e.fact?.startsWith("representative."));
}
/** The forms of a release that name the representative of record (namesRepresentative), by form number. */
export function formsNamingRepresentative(fieldMaps: unknown): Set<string> {
  const maps = (fieldMaps ?? []) as { form_number: string; entries?: Parameters<typeof namesRepresentative>[0] }[];
  return new Set(maps.filter((m) => namesRepresentative(m.entries ?? [])).map((m) => m.form_number));
}
/** A known fact the firm record gives about the representative (runtime.ts state: channel "firm_record"); `key` is the
 *  renderer's "about|fact[|row]". */
export const firmRecordFact = (key: string, source: string | undefined) => key.startsWith(`${REPRESENTATIVE}|`) && !!source?.startsWith(`${FIRM_RECORD} `);

/** The library's option key for a licence body (IMM 5476 Section B: CICC, a provincial or territorial law society, the
 *  Chambre des notaires du Québec); a body it does not know gives none, so the question stays asked (break m6). */
export function licensingBodyKey(body: string): string | null {
  const b = body.trim().toLowerCase();
  if (/^cicc\b|college of immigration and citizenship consultants/.test(b)) return "cicc";
  if (/law society|barreau/.test(b)) return "law_society";
  if (/notaires|notaries/.test(b)) return "chambre_notaires_quebec";
  return null;
}

/** C6.11 (VV-R10, QA-152): IMM 5476's licence part and firm name from the representative of record, keyed by the
 *  library's representative facts: the category, the membership ID, the licensing body (the library's option key, "cicc"
 *  for CICC) and the name of the firm. Never typed per case or per applicant. A value the record lacks is left out
 *  (asked as before). Sample values. */
export function representativeLicence(firm: Firm, members: Member[]): Record<string, string> | null {
  const rep = representativeOf(members), u = rep ? userIn(firm, rep.userId) : null;
  if (!u) return null;
  const all: Record<string, string | undefined> = {
    "representative.representative_category": u.licence?.category, "representative.membership_id": u.licence?.number,
    "representative.licensing_body": u.licence?.body ? licensingBodyKey(u.licence.body) ?? undefined : undefined,
    "representative.organization_name": firm.name,
  };
  return Object.fromEntries(Object.entries(all).filter((e): e is [string, string] => !!e[1]));
}

/** C6.11 (QA-227's question on its PR): the case has a representative of record, so "Uses a representative" (the
 *  fact IMM 5476's rule reads, case-level) is Yes from the firm record, never left unanswered. */
export const USES_REPRESENTATIVE = "case.uses_representative";

/** A value with its object keys in the order PostgreSQL's jsonb returns them (shorter keys first, then by bytes), so a
 *  firm-record value compares equal to the same value read back from a stored copy (review B1: the phone object). */
export function inStoredOrder(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(inStoredOrder);
  if (!v || typeof v !== "object") return v;
  const keys = Object.keys(v).sort((a, b) => Buffer.byteLength(a) - Buffer.byteLength(b) || Buffer.compare(Buffer.from(a), Buffer.from(b)));
  return Object.fromEntries(keys.map((k) => [k, inStoredOrder((v as Record<string, unknown>)[k])]));
}

/** The same facts as confirmed answers about the representative (channel "firm_record", by the representative of
 *  record), so the case view, readiness and the filler read them like any other confirmed fact. Never stored. */
export function representativeAnswers(firm: Firm, members: Member[], caseSubjectId: string | undefined, phoneParts: boolean | ((fact: string) => boolean)): { id: string; subjectId: string; field: string; rowKey: null; value: unknown; status: "VERIFIED"; channel: string; actor: string; at: string; origin: null }[] {
  const rep = representativeOf(members), facts = representativeContact(firm, members, phoneParts);
  if (!rep || !facts) return [];
  const answer = (subjectId: string, field: string, value: unknown) => ({ id: `${FIRM_RECORD}:${rep.userId}:${field}`, subjectId, field, rowKey: null, value: inStoredOrder(value), status: "VERIFIED" as const, channel: FIRM_RECORD, actor: rep.userId, at: rep.assignedAt.toISOString(), origin: null });
  return [
    ...Object.entries({ ...facts, ...representativeLicence(firm, members) }).map(([field, value]) => answer(REPRESENTATIVE, field, value)),
    ...(caseSubjectId ? [answer(caseSubjectId, USES_REPRESENTATIVE, true)] : []),
  ];
}

/** BR-20: a change of representative of record asks for a new IMM 5476, and the one signed with the earlier
 *  representative is out of date (BR-12). Until IMM 5476 copies follow the case team (rest of C6.11), the case says so
 *  from the change onwards. */
export function imm5476(members: Member[]): { new_needed: boolean; since: Date | null; earlier: string | null } {
  const reps = members.filter((m) => m.role === "LEAD_REPRESENTATIVE").sort((a, b) => a.assignedAt.getTime() - b.assignedAt.getTime());
  const now = representativeOf(members);
  if (!now || reps.length < 2) return { new_needed: false, since: null, earlier: null };
  const earlier = [...reps].reverse().find((m) => m.endedAt && m.userId !== now.userId) ?? null;
  return earlier ? { new_needed: true, since: now.assignedAt, earlier: earlier.userId } : { new_needed: false, since: null, earlier: null };
}
