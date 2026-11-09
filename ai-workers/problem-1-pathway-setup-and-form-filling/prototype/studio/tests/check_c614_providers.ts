// C6.14 checks (row B136, runtime lane; concept product/screens/B136/concept.md BR-2 to BR-6): engine/runtime/case-checklist.ts
// gives a line asked once for the couple ("couple_once") or once for the application ("case") its providers: the document
// type's default roles matched among everyone on the case, nobody under 18 or of unknown age, else the person the item is
// for; per-person lines never get providers. Each rule has a passing and a failing case. A synthetic release with a
// made-up combination key (no combination key is read by the rule, P-425). No database, no server, no model call (US$0).
// Roles are Sample until the immigration expert confirms.
//   tsx studio/tests/check_c614_providers.ts
import { candidatesOf, caseChecklist, chosenProviders, mayProvide, NEVER_PROVIDES, providersFor, SHARED_WHO, type CaseChecklist } from "../engine/runtime/case-checklist.ts";
import type { Known } from "../engine/render.ts";
import type { Snapshot } from "../engine/snapshot.ts";
import type { Participant } from "../engine/runtime/case.ts";
import { FEE_TABLE } from "../engine/runtime/filings.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const TODAY = new Date("2026-11-09T12:00:00Z"), ON = "2026-11-09";
// A combination whose checklist is derived (data, samples/fee-table.json), whichever it is: the rule never reads its key.
const COMBO = Object.entries(FEE_TABLE.combinations).find(([, c]) => c.checklist)?.[0] ?? "";
const req = (lineage: string, type: string, who: string) => ({ lineage, document_type: type, document_type_key: type, who, provided_by: "client", base_or_conditional: "base", condition: null, condition_plain: null, source_quote: null });
const snap = (roles: Record<string, string[]>) => ({
  combination: { key: COMBO }, canonical_fields: [{ id: "person.date_of_birth", value_type: "date" }], field_maps: [], derived_fields: [], placements: [], checks: [],
  document_types: [{ key: "marriage", name: "Marriage certificate" }, { key: "funds", name: "Proof of funds" }, { key: "passport", name: "Passport" }].map((t) => (roles[t.key] ? { ...t, default_provider_roles: roles[t.key] } : t)),
  document_requirements: [req("marriage:couple", "marriage", "couple_once"), req("funds:case", "funds", "case"), req("passport:each", "passport", "each_applicant")],
}) as unknown as Snapshot;
const P = (id: string, role: Participant["role"], applies = true): Participant => ({ subjectId: id, role, label: `Client ${id}`, applies });
const known = (pairs: Record<string, unknown>): Known => new Map(Object.entries(pairs).map(([k, value]) => [k, { value, status: "answered" as const, source: "test" }]));
type D = Extract<CaseChecklist, { derived: true }>;
const lines = (r: D, doc: string) => r.people.flatMap((p) => p.lines.filter((l) => l.document.key === doc).map((l) => ({ ...l, on: p.subject })));
const ids = (xs: { subject: string }[] | undefined) => (xs ?? []).map((x) => x.subject).join(",");
const adults = known({ "A|person.date_of_birth": "1985-01-01", "B|person.date_of_birth": "1987-01-01", "C|person.date_of_birth": "2016-01-01", "D|person.date_of_birth": "1960-05-05" });
const family = [P("case", "case"), P("A", "principal"), P("B", "spouse_or_partner"), P("C", "child"), P("D", "sponsor", false)];
const run = (roles: Record<string, string[]>, ps = family, k = adults) => caseChecklist(snap(roles), COMBO, ps, k, TODAY) as D;

ok("setup: a combination whose checklist is derived exists in the fee table (data)", !!COMBO, COMBO);
// BR-2: shared lines are once; per-person lines get no providers.
let r = run({ marriage: ["principal", "spouse_or_partner"], passport: ["principal"] });
let m = lines(r, "marriage"), f = lines(r, "funds"), pp = lines(r, "passport");
ok("BR-2 pass: \"once for the couple\" is one item (on the spouse) and \"once for the application\" one item (on the principal), each marked shared", m.length === 1 && m[0].on === "B" && m[0].shared === "couple" && f.length === 1 && f[0].on === "A" && f[0].shared === "application", [m.map((x) => x.on), f.map((x) => x.on)]);
ok("BR-2 fail: a per-person line keeps one line per applicant (three: the sponsor is not applying) and no providers, even when its type has roles", pp.length === 3 && pp.every((x) => x.shared === null && x.providers.length === 0 && x.providers_rule === null), pp.map((x) => [x.on, x.providers.length]));
ok("BR-2: the shared kinds are the two \"once\" choices only (data of the rule, no combination key)", Object.keys(SHARED_WHO).sort().join() === "case,couple_once");
// BR-3: matching by role among everyone on the case, in the type's order.
ok("BR-3 pass: roles in order: principal then spouse", ids(m[0].providers) === "A,B" && m[0].providers_rule === "type_roles", ids(m[0].providers));
r = run({ marriage: ["spouse_or_partner", "principal"] });
ok("BR-3 pass: the type's order decides who is named first", ids(lines(r, "marriage")[0].providers) === "B,A");
r = run({ funds: ["sponsor"] });
ok("BR-3 pass (SA1B-D73(a)): a person not applying (the sponsor) is matched and named as such", ids(lines(r, "funds")[0].providers) === "D" && /not applying, still on the case/.test(lines(r, "funds")[0].providers[0].why));
r = run({ funds: ["sponsor"] }, family.filter((p) => p.role !== "sponsor"));
ok("BR-3 fail → BR-5: a role nobody on the case holds matches nobody; the person the item is for provides it", ids(lines(r, "funds")[0].providers) === "A" && lines(r, "funds")[0].providers_rule === "first_applicant" && /can provide it by the document type's roles/.test(lines(r, "funds")[0].providers_words ?? ""), lines(r, "funds")[0].providers_words);
// BR-4: nobody under 18, nobody of unknown age.
r = run({ marriage: ["child", "spouse_or_partner"] });
ok("BR-4 fail: a child of 10 listed first is skipped, with why; the spouse is named", ids(lines(r, "marriage")[0].providers) === "B" && /is 10 on 2026-11-09/.test(lines(r, "marriage")[0].providers_words ?? ""), lines(r, "marriage")[0].providers_words);
r = run({ marriage: ["child"] }, family, known({ "A|person.date_of_birth": "1985-01-01", "B|person.date_of_birth": "1987-01-01", "C|person.date_of_birth": "2008-11-09" }));
ok("BR-4 pass: a child who is 18 today is named", ids(lines(r, "marriage")[0].providers) === "C");
r = run({ marriage: ["child"] }, family, known({ "A|person.date_of_birth": "1985-01-01", "B|person.date_of_birth": "1987-01-01", "C|person.date_of_birth": "2008-11-10" }));
ok("BR-4 fail: a child who turns 18 tomorrow is not named (age on the day it is read, not the application date)", ids(lines(r, "marriage")[0].providers) === "B" && lines(r, "marriage")[0].providers_rule === "first_applicant");
r = run({ marriage: ["principal", "spouse_or_partner"] }, family, known({ "B|person.date_of_birth": "1987-01-01" }));
ok("BR-4 fail (AG-7-15 r6): a principal with no date of birth cannot be checked, so is not named", ids(lines(r, "marriage")[0].providers) === "B" && /cannot be checked/.test(lines(r, "marriage")[0].providers_words ?? ""));
ok("BR-4: mayProvide refuses unknown age and under 18, accepts 18", !mayProvide({ id: "x", role: "principal", label: "X", applies: true, age: null }, ON).ok && !mayProvide({ id: "x", role: "principal", label: "X", applies: true, age: 17 }, ON).ok && mayProvide({ id: "x", role: "child", label: "X", applies: true, age: 18 }, ON).ok);
// BR-5: fallback.
r = run({});
ok("BR-5 pass: no roles on the type: the person the item is for provides it, and the words say the type names none", ids(lines(r, "marriage")[0].providers) === "B" && lines(r, "marriage")[0].providers_rule === "first_applicant" && /names no provider/.test(lines(r, "marriage")[0].providers_words ?? ""));
ok("BR-5 fail: a shared item is never left without a provider", providersFor(["sponsor"], "A", candidatesOf(family.filter((p) => p.role !== "sponsor"), adults, ON), ON).providers.length === 1);
// BR-1 (the representative never provides) at the case's side too.
ok("BR-1: the representative is never a candidate on the case", NEVER_PROVIDES.has("representative") && !candidatesOf([...family, P("R", "representative")], adults, ON).some((c) => c.id === "R"));
// BR-6: the officer's choice, checked again on every read.
const cands = candidatesOf(family, adults, ON);
let ch = chosenProviders(["A"], cands, ON);
ok("BR-6 pass: a chosen adult on the case is kept", ids(ch.providers) === "A" && ch.dropped.length === 0 && ch.providers[0].why === "Chosen by the case officer.");
ch = chosenProviders(["C", "Z", "A", "A"], cands, ON);
ok("BR-6 fail: a chosen child and a person no longer on the case are dropped (named), the same person counts once", ids(ch.providers) === "A" && ch.dropped.length === 2 && ch.dropped.some((x) => /is 10/.test(x)) && ch.dropped.includes("a person no longer on the case"), ch);
process.exitCode = summary() ? 1 : 0;
