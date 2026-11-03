// C7.5 part 1 (runtime lane, M3-E; BR-19): the rules cross-checks of engine/runtime/cross-checks.ts, each rule with a
// passing and a failing case, plus the fingerprint (same facts → same key; a changed fact → a new key) and the silence
// on a missing fact. Sample values only. No database (US$0).
//   tsx studio/tests/check_c75_cross_checks.ts
import fc from "fast-check";
import { crossChecks, dayWords, fingerprintOf, RULES, type Fact, type Who } from "../engine/runtime/cross-checks.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const people: Who[] = [{ subject: "S-case", role: "case", label: "The application" }, { subject: "S-a", role: "principal", label: "Sample Client A" }, { subject: "S-b", role: "child", label: "Sample Child A1" }];
const base: Fact[] = [
  { subject: "S-case", field: "case.intended_stay_from", value: "2030-03-01" }, { subject: "S-case", field: "case.intended_stay_to", value: "2030-04-15" },
  { subject: "S-a", field: "person.date_of_birth", value: "1986-04-13" }, { subject: "S-a", field: "person.passport_expiry_date", value: "2035-06-30" },
  { subject: "S-b", field: "person.date_of_birth", value: "2016-01-01" }, { subject: "S-b", field: "person.passport_expiry_date", value: "2031-01-01" },
];
const set = (facts: Fact[], subject: string, field: string, value: unknown) => [...facts.filter((x) => !(x.subject === subject && x.field === field)), { subject, field, value }];
const run = (facts: Fact[]) => crossChecks(facts, people);

ok("C7.5 rules: agreeing facts give no finding", run(base).length === 0, run(base));

// passport_expires_before_stay_ends
let h = run(set(base, "S-a", "person.passport_expiry_date", "2030-03-20"));
ok("C7.5 passport before the visit ends, fail case: one MAJOR on Client A's passport expiry, quoting both dates", h.length === 1 && h[0].rule === "passport_expires_before_stay_ends" && h[0].severity === "MAJOR" && h[0].subject === "S-a" && h[0].field === "person.passport_expiry_date" && h[0].quote === "Sample Client A's passport expires on Mar 20, 2030, before the visit ends on Apr 15, 2030.", h);
ok("C7.5 passport before the visit ends, pass case: expiring on the visit's last day is fine", run(set(base, "S-a", "person.passport_expiry_date", "2030-04-15")).length === 0);
ok("C7.5 passport before the visit ends: each person checked on their own (only the child's passport)", (h = run(set(base, "S-b", "person.passport_expiry_date", "2030-04-01"))).length === 1 && h[0].subject === "S-b" && h[0].quote.startsWith("Sample Child A1"), h);

// stay_ends_before_it_starts
h = run(set(base, "S-case", "case.intended_stay_to", "2030-02-01"));
ok("C7.5 visit ends before it starts, fail case: one MAJOR on the case's end date (and the passports, now fine, say nothing)", h.length === 1 && h[0].rule === "stay_ends_before_it_starts" && h[0].subject === "S-case" && h[0].field === "case.intended_stay_to", h);
ok("C7.5 visit ends before it starts, pass case: a one-day visit is fine", run(set(base, "S-case", "case.intended_stay_to", "2030-03-01")).length === 0);

// passport_expires_before_birth
h = run(set(base, "S-a", "person.passport_expiry_date", "1980-01-01"));
ok("C7.5 passport expires before birth, fail case: named (with the visit rule, both on Client A)", h.some((x) => x.rule === "passport_expires_before_birth" && x.subject === "S-a") && h.every((x) => x.subject === "S-a"), h);
ok("C7.5 passport expires before birth, pass case: the day after birth is not this rule", !run(set(base, "S-a", "person.passport_expiry_date", "1986-04-14")).some((x) => x.rule === "passport_expires_before_birth"));

// national_id_issued_before_birth and national_id_expires_before_issue
const id = set(set(base, "S-a", "person.national_id_issue_date", "2010-05-01"), "S-a", "person.national_id_expiry_date", "2020-05-01");
ok("C7.5 national ID rules, pass case: issued after birth, expires after issue", run(id).length === 0, run(id));
h = run(set(id, "S-a", "person.national_id_issue_date", "1980-01-01"));
ok("C7.5 national ID issued before birth, fail case: one MAJOR on the issue date", h.length === 1 && h[0].rule === "national_id_issued_before_birth" && h[0].field === "person.national_id_issue_date", h);
h = run(set(id, "S-a", "person.national_id_expiry_date", "2010-05-01"));
ok("C7.5 national ID expires before issue, fail case: expiring the day it was issued is named", h.length === 1 && h[0].rule === "national_id_expires_before_issue" && h[0].field === "person.national_id_expiry_date", h);

// P-209 (breaker m4): a person on the case who is not travelling gets no visit rule, still the identity-date rules.
const notTravelling = (who: string) => people.map((x) => x.subject === who ? { ...x, applies: false } : x);
h = crossChecks(set(set(base, "S-b", "person.passport_expiry_date", "2030-04-01"), "S-b", "person.national_id_issue_date", "2000-01-01"), notTravelling("S-b"));
ok("C7.5 P-209: a person not travelling gets no passport-before-visit finding, but the identity-date rule still runs", !h.some((x) => x.rule === "passport_expires_before_stay_ends") && h.some((x) => x.rule === "national_id_issued_before_birth" && x.subject === "S-b"), h.map((x) => x.rule));
ok("C7.5 P-209 fail case: the same person travelling does get the passport finding", run(set(base, "S-b", "person.passport_expiry_date", "2030-04-01")).some((x) => x.rule === "passport_expires_before_stay_ends" && x.subject === "S-b"));

// Silence on a missing or unreadable fact: the completeness check's job, never a guess.
ok("C7.5 a missing fact makes its rule silent (no visit end date: no passport finding)", run(set(base, "S-a", "person.passport_expiry_date", "2030-03-20").filter((x) => x.field !== "case.intended_stay_to")).length === 0);
ok("C7.5 a fact that is not a date makes its rule silent (null, a month, text, an impossible day)", ["2030-03", "soon", null, "2030-02-30", "2030-13-01", 20300320].every((v) => run(set(base, "S-a", "person.passport_expiry_date", v)).length === 0));
ok("C7.5 the case subject never gets a person rule, a person never the visit rule", run(set(set(base, "S-case", "person.passport_expiry_date", "1900-01-01"), "S-a", "case.intended_stay_to", "1900-01-01")).length === 0);

// Fingerprint: the same facts give the same key whatever their order; a changed compared fact gives a new key.
const a = run(set(base, "S-a", "person.passport_expiry_date", "2030-03-20"))[0], b = run([...set(base, "S-a", "person.passport_expiry_date", "2030-03-20")].reverse())[0];
const moved = run(set(set(base, "S-a", "person.passport_expiry_date", "2030-03-20"), "S-case", "case.intended_stay_to", "2030-04-20"))[0];
ok("C7.5 fingerprint: same facts in another order → the same key; the visit's end moved → a new key", a.fingerprint === b.fingerprint && a.fingerprint !== moved.fingerprint && fingerprintOf(a.rule, a.subject, { ...a.facts }) === a.fingerprint);
ok("C7.5 dayWords: dates read as on the case page (en-CA), never shifted by a time zone", dayWords("2030-01-01") === "Jan 1, 2030" && dayWords("2030-12-31") === "Dec 31, 2030", dayWords("2030-01-01"));
ok("C7.5 every rule has its words (the tooltip) and a Sample severity from the team's list", RULES.every((r) => r.words.length > 10 && ["CRITICAL", "MAJOR", "MINOR", "INFO"].includes(r.severity)));

// Property (STANDARDS §7): for any two valid dates, the visit rule fires exactly when the passport expires first.
const day = fc.integer({ min: 0, max: 20_000 }).map((n) => new Date(Date.UTC(2000, 0, 1) + n * 86_400_000).toISOString().slice(0, 10));
let prop = true;
try { fc.assert(fc.property(day, day, (exp, end) => run(set(set(base, "S-a", "person.passport_expiry_date", exp), "S-case", "case.intended_stay_to", end)).some((x) => x.rule === "passport_expires_before_stay_ends" && x.subject === "S-a") === (exp < end)), { numRuns: 300 }); } catch (e) { prop = false; console.log((e as Error).message.split("\n")[0]); }
ok("C7.5 property: the passport rule fires exactly when the passport expires before the visit's last day (300 random pairs)", prop);

process.exitCode = summary() ? 1 : 0;
