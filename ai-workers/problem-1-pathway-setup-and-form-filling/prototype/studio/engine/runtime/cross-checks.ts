// C7.5 part 1 (runtime lane, M3-E; r5c BR-19; AG-11-70, AG-11-71): the rules cross-checks of the Review page. US$0, no
// model call: each rule reads a case's current facts and says, in the team's words, what disagrees, quoting both facts.
// A rule only speaks when every fact it compares is answered; it never guesses a missing one. Severities are Sample (the
// immigration expert confirms; an ASSUMPTIONS row is proposed to the tech lead in the C7.5 part 1 PR). Pure (P-249): no database, no clock beyond the facts given.
// The finding's life (Open → Acknowledged → Resolved, Waived, Dismissed) is api/src/findings.ts; here only "what the
// rules see now", with a fingerprint that changes when a compared fact changes (a dismissed finding stays dismissed for
// the same facts; a changed fact is a new finding).

export type Severity = "CRITICAL" | "MAJOR" | "MINOR" | "INFO";
export const SEVERITIES: readonly Severity[] = ["CRITICAL", "MAJOR", "MINOR", "INFO"];

/** One current fact: the person (answer subject) it is about, its key and value (dates as YYYY-MM-DD text). */
export type Fact = { subject: string; field: string; value: unknown };
/** The people the checks run for: the case subject holds case facts (the visit's dates); persons hold their own.
 *  `applies: false` is a person on the case who is not travelling (P-209): the visit rules are not run for them. */
export type Who = { subject: string; role: string; label: string; applies?: boolean };

export type Hit = {
  rule: string; subject: string; field: string; severity: Severity;
  /** The finding in plain words, quoting the facts it compares (AG-11-70: every finding quotes its source and field). */
  quote: string;
  /** Every fact the rule compared, so the fingerprint changes when any of them does. */
  facts: Record<string, string>;
  fingerprint: string;
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;
/** A real calendar day (2030-02-30 is not one), else null. */
const date = (v: unknown): string | null => { if (typeof v !== "string" || !DATE.test(v)) return null; const t = Date.parse(`${v}T00:00:00Z`); return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === v ? v : null; };
/** "2030-03-20" → "Mar 20, 2030": the words a person reads (en-CA, as the case page; UTC so the day never shifts). */
export const dayWords = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-CA", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

type Rule = { key: string; severity: Severity; field: string; words: string; /** compares a person's facts with the visit */ visit?: true;
  run: (f: (subject: string, field: string) => unknown, who: Who, caseSubject: string) => { quote: string; facts: Record<string, string> } | null };

/** The rules, in the order the Review page lists them. `words` is the rule as a person reads it (the tooltip). */
export const RULES: readonly Rule[] = [
  { key: "passport_expires_before_stay_ends", severity: "MAJOR", field: "person.passport_expiry_date", visit: true,
    words: "The passport must still be valid on the last day of the visit.",
    run: (f, who, cs) => {
      if (who.role === "case") return null;
      const exp = date(f(who.subject, "person.passport_expiry_date")), end = date(f(cs, "case.intended_stay_to"));
      return exp && end && exp < end ? { quote: `${who.label}'s passport expires on ${dayWords(exp)}, before the visit ends on ${dayWords(end)}.`, facts: { "person.passport_expiry_date": exp, "case.intended_stay_to": end } } : null;
    } },
  { key: "stay_ends_before_it_starts", severity: "MAJOR", field: "case.intended_stay_to",
    words: "The visit must end on or after the day it starts.",
    run: (f, who, cs) => {
      if (who.role !== "case") return null;
      const from = date(f(cs, "case.intended_stay_from")), to = date(f(cs, "case.intended_stay_to"));
      return from && to && to < from ? { quote: `The visit ends on ${dayWords(to)}, before it starts on ${dayWords(from)}.`, facts: { "case.intended_stay_from": from, "case.intended_stay_to": to } } : null;
    } },
  { key: "passport_expires_before_birth", severity: "MAJOR", field: "person.passport_expiry_date",
    words: "A passport cannot expire before its holder was born.",
    run: (f, who) => {
      if (who.role === "case") return null;
      const exp = date(f(who.subject, "person.passport_expiry_date")), dob = date(f(who.subject, "person.date_of_birth"));
      return exp && dob && exp <= dob ? { quote: `${who.label}'s passport expires on ${dayWords(exp)}, on or before their date of birth, ${dayWords(dob)}.`, facts: { "person.passport_expiry_date": exp, "person.date_of_birth": dob } } : null;
    } },
  { key: "national_id_issued_before_birth", severity: "MAJOR", field: "person.national_id_issue_date",
    words: "A national identity document cannot be issued before its holder was born.",
    run: (f, who) => {
      if (who.role === "case") return null;
      const iss = date(f(who.subject, "person.national_id_issue_date")), dob = date(f(who.subject, "person.date_of_birth"));
      return iss && dob && iss < dob ? { quote: `${who.label}'s national identity document was issued on ${dayWords(iss)}, before their date of birth, ${dayWords(dob)}.`, facts: { "person.national_id_issue_date": iss, "person.date_of_birth": dob } } : null;
    } },
  { key: "national_id_expires_before_issue", severity: "MAJOR", field: "person.national_id_expiry_date",
    words: "A national identity document must expire after the day it was issued.",
    run: (f, who) => {
      if (who.role === "case") return null;
      const iss = date(f(who.subject, "person.national_id_issue_date")), exp = date(f(who.subject, "person.national_id_expiry_date"));
      return iss && exp && exp <= iss ? { quote: `${who.label}'s national identity document expires on ${dayWords(exp)}, on or before the day it was issued, ${dayWords(iss)}.`, facts: { "person.national_id_issue_date": iss, "person.national_id_expiry_date": exp } } : null;
    } },
];

/** A stable key for "this rule, this person, these facts": the same facts give the same key whatever their order. */
export const fingerprintOf = (rule: string, subject: string, facts: Record<string, string>) =>
  [rule, subject, ...Object.keys(facts).sort().map((k) => `${k}=${facts[k]}`)].join("|");

/** What the rules see now on a case: one hit per rule and person whose facts disagree. A fact that is not answered
 *  (or not a date) makes its rule silent: a missing fact is the completeness check's job, not a finding. */
export function crossChecks(facts: Fact[], people: Who[]): Hit[] {
  const byKey = new Map(facts.filter((x) => x.value !== null && x.value !== undefined).map((x) => [`${x.subject}|${x.field}`, x.value]));
  const f = (subject: string, field: string) => byKey.get(`${subject}|${field}`);
  const caseSubject = people.find((p) => p.role === "case")?.subject ?? "";
  const hits: Hit[] = [];
  for (const rule of RULES) for (const who of people) {
    if (rule.visit && who.applies === false) continue;
    const r = rule.run(f, who, caseSubject);
    if (r) hits.push({ rule: rule.key, subject: who.subject, field: rule.field, severity: rule.severity, quote: r.quote, facts: r.facts, fingerprint: fingerprintOf(rule.key, who.subject, r.facts) });
  }
  return hits;
}

export const ruleWords = (key: string) => RULES.find((r) => r.key === key)?.words ?? null;
