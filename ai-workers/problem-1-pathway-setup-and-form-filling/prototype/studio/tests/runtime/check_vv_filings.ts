// C6.12 checks (M3-B, runtime lane): engine/runtime/filings.ts derives a Visitor visa case's filings, submission group and
// fee lines from its people. Each rule has a passing and a failing case; one property over many households. No database,
// no server, no model call (US$0). Amounts are Sample until the immigration expert confirms (P-171).
//   tsx studio/tests/runtime/check_vv_filings.ts
import fc from "fast-check";
import { BIOMETRICS_FEE_SOURCE, deriveFilings, familyFee, FEE_TABLE } from "../../engine/runtime/filings.ts";
import type { CaseFilings } from "../../contracts/runtime.ts";
import type { Participant } from "../../engine/runtime/case.ts";
import { recorder } from "./api.ts";
// B164 (P-425): the Visitor visa's fee line is read from the fee table here; the engine names no program.
const VISITOR_FEE_SOURCE = FEE_TABLE.lines.find((l) => l.key === "visitor_visa")!.source;

const { ok, summary } = recorder();
const person = (i: number, role: Participant["role"], applies = true): Participant => ({ subjectId: `s-${i}`, role, label: `Client ${String.fromCharCode(65 + i)}`, applies });
const family = (n: number) => [person(0, "principal"), ...(n > 1 ? [person(1, "spouse_or_partner")] : []), ...Array.from({ length: Math.max(0, n - 2) }, (_, i) => person(i + 2, "child"))];
const caseRow: Participant = { subjectId: "s-case", role: "case", label: "Case", applies: true };
type D = Extract<CaseFilings, { derived: true }>;
const d = (people: Participant[], key = "vv.single") => deriveFilings(key, people) as D;
const total = (r: D, k: string) => r.groups[0]?.totals.find((f) => f.line === k);
const lines = (r: D, k: string) => r.fees.filter((f) => f.line === k);
const sum = (r: D, k?: string) => r.fees.filter((f) => !k || f.line === k).reduce((s, f) => s + f.amount_cents, 0);

// BR-1: each person who applies files their own application.
{
  const r = d([caseRow, ...family(3)]);
  ok("C6.12 BR-1: three visitors applying → three filings, each their own, in one submission group", r.filings.length === 3 && r.filings.every((f) => f.mode === "files_own" && f.group === "group-family" && f.applicants.length === 1 && f.applicants[0].mode === "applying") && r.groups.length === 1 && new Set(r.filings.map((f) => f.applicants[0].subject)).size === 3, JSON.stringify(r.filings.map((f) => f.label)));
  ok("C6.12 BR-1: the case itself is never a filing", !r.filings.some((f) => f.applicants[0].role === "case") && !r.not_filing.some((f) => f.role === "case"));
  ok("C6.12 BR-1: each filing has its own application-number box, empty until recorded, and starts Not started", r.filings.every((f) => f.number === null && f.status === "NOT_STARTED" && f.combination === "vv.single"));
  const odd = d([person(0, "principal"), { ...person(1, "child"), role: "representative" as Participant["role"] }]);
  ok("C6.12 BR-1 (fail): a role with no visitor filing gets none and says why", odd.filings.length === 1 && odd.not_filing.length === 1 && /no filing is set for a representative/.test(odd.not_filing[0].why), JSON.stringify(odd.not_filing));
  const built = d([person(0, "principal"), { ...person(1, "child"), role: "constructor" as Participant["role"] }, { ...person(2, "child"), role: "toString" as Participant["role"] }]);
  ok("C6.12 BR-1 (fail): role names that are built-in object names are not filings (break m3)", built.filings.length === 1 && built.not_filing.length === 2);
  const a = d(family(4)), b = d([person(0, "principal"), person(1, "spouse_or_partner", false), person(2, "child"), person(3, "child")]);
  ok("C6.12 (break m1): a filing keeps its id when someone else stops travelling", a.filings.find((f) => f.applicants[0].subject === "s-2")!.id === b.filings.find((f) => f.applicants[0].subject === "s-2")!.id && !b.filings.some((f) => f.id === "filing-s-1"));
}
// BR-16: one family submission group; splittable once there are two or more.
{
  ok("C6.12 BR-16: two or more filings are one family group that may be split", d(family(2)).groups[0].splittable === true && d(family(2)).groups[0].kind === "family");
  ok("C6.12 BR-16 (fail): one filing alone has nothing to split", d(family(1)).groups[0].splittable === false);
}
// Not applying → no filing and no fee.
{
  const r = d([person(0, "principal"), person(1, "spouse_or_partner", false), person(2, "child")]);
  ok("C6.12: a person not applying has no filing and no fee, and the reason is shown", r.filings.length === 2 && r.not_filing.length === 1 && r.not_filing[0].subject === "s-1" && /no filing and no fee/.test(r.not_filing[0].why) && total(r, "visitor_visa")!.total_cents === 200_00 && !r.fees.some((f) => f.filing === "filing-s-1"));
  const all = d([person(0, "principal"), person(1, "spouse_or_partner"), person(2, "child")]);
  ok("C6.12 (fail): the same household all applying pays for three", total(all, "visitor_visa")!.total_cents === 300_00 && all.not_filing.length === 0);
  const none = d([person(0, "principal", false)]);
  ok("C6.12 (break m4): nobody applying → no filing, no group, no fee, and the reason says so", none.filings.length === 0 && none.groups.length === 0 && none.fees.length === 0 && /Nobody on this case is applying/.test(none.why ?? ""));
  ok("C6.12: with people applying there is no such reason", d(family(1)).why === null);
}
// Visitor visa fee: CAD 100 per person, CAD 500 for a family of 5 or more at the same time and place.
{
  const six = total(d(family(6)), "visitor_visa")!;
  ok("C6.12 fee: six visitors together pay the family maximum CAD 500, not CAD 600", six.total_cents === 500_00 && six.list_cents === 600_00 && six.cap_applied && /family maximum CAD 500 applies instead of 6 × CAD 100 = CAD 600/.test(six.why), six.why);
  const five = total(d(family(5)), "visitor_visa")!;
  ok("C6.12 fee: five visitors pay CAD 500, which is the maximum (no saving to claim)", five.total_cents === 500_00 && !five.cap_applied);
  const four = total(d(family(4)), "visitor_visa")!;
  ok("C6.12 fee (fail): four visitors are not a family of 5: CAD 400, and the cap is named as not reached", four.total_cents === 400_00 && !four.cap_applied && /starts at 5 people/.test(four.why), four.why);
  ok("C6.12 fee: one visitor pays CAD 100", total(d(family(1)), "visitor_visa")!.total_cents === 100_00);
}
// Biometrics: CAD 85 per person, CAD 170 for a family of 2 or more.
{
  ok("C6.12 biometrics: one person CAD 85", total(d(family(1)), "biometrics")!.total_cents === 85_00);
  const three = total(d(family(3)), "biometrics")!;
  ok("C6.12 biometrics: three people together pay CAD 170, not CAD 255", three.total_cents === 170_00 && three.cap_applied && three.list_cents === 255_00);
  const two = total(d(family(2)), "biometrics")!;
  ok("C6.12 biometrics (fail): two people CAD 170 equals 2 × CAD 85, so no cap is claimed", two.total_cents === 170_00 && !two.cap_applied);
  ok("C6.12: the group total adds the capped lines (CAD 500 + CAD 170 = CAD 670)", d(family(6)).groups[0].total_cents === 670_00);
}
// BR-18: fee lines per filing: a capped line on the principal's filing, the others exempt; they add up to the group's total.
{
  const r = d(family(6)), vv = lines(r, "visitor_visa");
  ok("C6.12 BR-18 (review M1): with the cap, the principal's filing carries CAD 500 and the other five are exempt at CAD 0", vv.length === 6 && vv.find((f) => f.filing === "filing-s-0")!.amount_cents === 500_00 && vv.filter((f) => f.exempt).length === 5 && vv.filter((f) => f.exempt).every((f) => f.amount_cents === 0 && f.payer === "s-0" && /Covered by the family maximum, paid by Client A on Client A's filing/.test(f.why)));
  ok("C6.12 BR-18 (review M1): the filings' lines add up to the group total (CAD 670)", sum(r) === r.groups[0].total_cents && sum(r) === 670_00, sum(r));
  const four = d(family(4));
  ok("C6.12 BR-18 (fail): without the visitor cap, each filing pays its own CAD 100, nobody exempt", lines(four, "visitor_visa").every((f) => f.amount_cents === 100_00 && !f.exempt && f.payer === f.filing.replace("filing-", "")));
  const noPrincipal = d([person(0, "principal", false), person(1, "spouse_or_partner"), person(2, "child")]);
  ok("C6.12 BR-18: when the principal is not applying, the first filing carries the capped biometrics", lines(noPrincipal, "biometrics").find((f) => !f.exempt)!.filing === "filing-s-1" && sum(noPrincipal, "biometrics") === 170_00);
}
// Every fee line carries its official source (P-170), and says which part is IRCC's words.
{
  const r = d(family(2));
  ok("C6.12 P-170: every total names the page, the URL, the words and the date read", r.groups[0].totals.every((t) => /^https:\/\/ircc\.canada\.ca\//.test(t.source.url) && t.source.quote.length > 10 && /^\d{4}-\d{2}-\d{2}$/.test(t.source.read)) && /Sample until the immigration expert confirms/.test(r.basis));
  ok("C6.12 P-170 (review m2): IRCC's own words are marked as such, the record's summary as a summary", VISITOR_FEE_SOURCE.quote_kind === "IRCC's words" && /same time and place/.test(VISITOR_FEE_SOURCE.quote) && BIOMETRICS_FEE_SOURCE.quote_kind === "summary of the Lead-checked record");
  ok("C6.12 (review m2): the basis says biometrics exemptions are not checked yet", /Biometrics exemptions .* not checked yet/.test(r.basis));
}
// Only the Visitor visa is derived in this slice; nothing is guessed for others.
{
  const other = deriveFilings("ee.pnp", family(3));
  ok("C6.12 (fail): another combination is not derived yet and says so, with no filings or fees, in plain words", other.derived === false && /not derived yet/.test(other.why) && !("filings" in other) && !/C6\.12/.test(other.why));
  for (const k of ["constructor", "toString", "__proto__"]) ok(`C6.12 (break m3): the key "${k}" is not derived, never a crash`, deriveFilings(k, family(1)).derived === false);
  ok("C6.12: the Visitor visa is derived", deriveFilings("vv.single", family(2)).derived === true);
  ok("C6.12: the version changes when the people change and stays the same otherwise", d(family(2)).version === d(family(2)).version && d(family(2)).version !== d(family(3)).version);
}
// C11.12 (P-233; concept r2 BR-6, BR-10, challenge M2, M3): people on the principal's filing, fees per person, co-filing.
{
  const modes = (m: Record<string, string>) => ({ modes: new Map(Object.entries(m)) as never });
  const vvChild = deriveFilings("vv.single", family(4), undefined, modes({ child: "on_principal" })) as D;
  const main = vvChild.filings.find((f) => f.owner?.role === "principal")!;
  ok("C11.12 M2 pass: Visitor visa children On the principal's: 3 filings become 2, the visa fee still counts 4 people", vvChild.filings.length === 2 && main.applicants.length === 3 && total(vvChild, "visitor_visa")?.people === 4 && lines(vvChild, "visitor_visa").length === 4, vvChild.groups[0]?.totals);
  ok("C11.12 M2 pass: each person on a filing has their own fee line; below the cap each is paid by the person", lines(vvChild, "biometrics").filter((f) => f.filing === main.id).length === 3 && lines(vvChild, "visitor_visa").filter((f) => f.filing === main.id).map((f) => f.payer).sort().join() === main.applicants.map((a) => a.subject).sort().join());
  const withAges = deriveFilings("vv.single", family(4), undefined, { ...modes({ child: "on_principal" }), ages: new Map([["s-0", 40], ["s-1", 40], ["s-2", 10], ["s-3", 15]]) }) as D;
  ok("C11.12 M2 fail: a 10-year-old on the principal's filing is exempt from biometrics (the age is the person's, never applicants[0]'s)", withAges.fees.find((f) => f.line === "biometrics" && f.payer === "s-2")?.exempt === true && total(withAges, "biometrics")?.people === 3);
  const ee = [person(0, "principal"), person(1, "spouse_or_partner"), person(2, "child"), person(3, "child", false)];
  const pnp = deriveFilings("pnp.express_entry", ee, undefined, { ...modes({ spouse_or_partner: "on_principal", child: "on_principal" }), label: "Express Entry stream" }) as D;
  ok("C11.12 BR-6 pass: Express Entry (Sample modes): 1 filing, 4 applicants, the last declared only", pnp.derived && pnp.filings.length === 1 && pnp.filings[0].applicants.length === 4 && pnp.filings[0].applicants[3].mode === "declared_only");
  ok("C11.12 BR-10 pass (M3-S1 words): no fee rule → no fee line and words that say none is set, never CAD 0", pnp.fees.length === 0 && pnp.fees_worked_out === false && pnp.fees_why === "No fee lines in the fee table for Express Entry stream yet, so no fee is charged; nothing is guessed." && !/CAD 0/.test(JSON.stringify(pnp)));
  ok("C11.12 BR-10 fail: a declared-only person on a combination with fees gets no fee line", (() => { const x = deriveFilings("vv.single", [person(0, "principal"), person(1, "child", false)], undefined, modes({ child: "declared_only" })) as D; return x.filings[0].applicants[1]?.mode === "declared_only" && !x.fees.some((f) => f.payer === "s-1"); })());
  const fs = deriveFilings("fs.spouse", [person(0, "principal"), person(1, "child"), person(4, "sponsor")], undefined, { ...modes({ child: "on_principal", sponsor: "co_files" }), label: "Spouse sponsorship" }) as D;
  ok("C11.12 BR-4 pass: Spouse sponsorship → 2 filings (PR + sponsorship) in one group, splittable false", fs.filings.length === 2 && fs.filings.some((f) => f.mode === "co_filed" && f.owner?.role === "sponsor") && fs.groups.length === 1 && fs.groups[0].splittable === false);
  const fsSplit = deriveFilings("fs.spouse", [person(0, "principal"), person(4, "sponsor")], undefined, { ...modes({ sponsor: "co_files" }), groupOf: (x) => (x === "s-4" ? "g-own" : "g-fam") }) as D;
  ok("C11.12 BR-4 fail: a co-filed sponsorship never lands in a group of its own (it follows the principal's)", fsSplit.groups.length === 1 && fsSplit.groups[0].id === "g-fam");
  // Review M1 (PR 2): a capped line on the principal's filing says whose it is (person) apart from who pays it.
  const capped = deriveFilings("vv.single", family(6), undefined, modes({ child: "on_principal" })) as D;
  const kid = capped.fees.find((f) => f.line === "biometrics" && f.person === "s-3");
  ok("C11.12 review M1 pass: a covered line names its person and the payer apart", !!kid && kid.payer === "s-0" && kid.filing === "filing-s-0" && /paid by Client A on Client A's filing/.test(kid.why), kid);
  ok("C11.12 review M1 fail: every applicant on a filing has exactly one line per fee, keyed by person (never two for the principal)", capped.fees.filter((f) => f.line === "visitor_visa").map((f) => f.person).sort().join() === ["s-0", "s-1", "s-2", "s-3", "s-4", "s-5"].join());
  // Review M2: no total where fees are not worked out
  ok("C11.12 review M2 pass: a group with no fee rule has total null, never 0", pnp.groups.every((g) => g.total_cents === null && g.totals.length === 0));
  ok("C11.12 review M2 fail: a group with fee rules keeps its number", typeof vvChild.groups[0].total_cents === "number" && vvChild.groups[0].total_cents! > 0);
  // Break m3: a sponsorship on a combination whose other fees are worked out says its own are not
  const vvSp = deriveFilings("vv.single", [person(0, "principal"), person(4, "sponsor")], undefined, modes({ sponsor: "co_files" })) as D;
  // Review on #500 M1, by the data since M3-S1: the Visitor visa row has no line naming the sponsor, so the co-filed
  // application's fees are unknown and no line is charged; the filings stand, the total is null and the words say why.
  ok("C11.12 break m3 (review on #500 M1; M3-S1) pass: a co-filed application no fee line reaches: no fee line, total null, and the words name it", vvSp.fees_worked_out === false && vvSp.fees.length === 0 && vvSp.groups.every((g) => g.total_cents === null) && /no fee line for Client E's co-filed application/.test(vvSp.fees_why ?? "") && vvSp.filings.some((f) => f.mode === "co_filed"), { why: vvSp.fees_why, totals: vvSp.groups.map((g) => g.total_cents) });
  // M3-S1: the shipped spouse sponsorship row: the sponsor's co-filed application carries its own fee.
  const fsPriced = deriveFilings("fs.spouse", [person(0, "principal"), person(1, "child"), person(4, "sponsor")]) as D;
  const fsCo = fsPriced.filings.find((f) => f.mode === "co_filed");
  ok("M3-S1 pass: a co-filed sponsorship carries its own fee line on its own filing, paid by the sponsor (CAD 660), beside the principal's CAD 600 and the child's CAD 180", fsPriced.fees_worked_out === true && fsPriced.fees.filter((f) => f.filing === fsCo?.id).map((f) => `${f.line}:${f.payer}:${f.amount_cents}`).join() === "spouse_sponsorship:s-4:66000" && fsPriced.groups[0].total_cents === 144000, fsPriced.fees.map((f) => `${f.filing}:${f.line}:${f.amount_cents}`));
  const fsSpouse = deriveFilings("fs.spouse", [person(0, "principal"), person(1, "spouse_or_partner"), person(4, "sponsor")], undefined, modes({ spouse_or_partner: "files_own", sponsor: "co_files" })) as D;
  ok("C11.12 review n1 pass: beside a sponsorship, a group with another own filing stays splittable (that filing may leave)", fsSpouse.groups[0].splittable === true && fsSpouse.filings.length === 3);
  ok("C11.12 review n1 fail: the principal and the sponsorship alone are not splittable", fs.groups[0].splittable === false);
  const wpSplit = deriveFilings("wp.family", family(2), undefined, { ...modes({ spouse_or_partner: "files_own" }), groupOf: (x) => (x === "s-1" ? "g-own" : "g-fam"), groupKind: (g) => (g === "g-own" ? "separate" : "family") }) as D;
  ok("C11.12 break round 2: a split group with no fee rule says nothing about family maximums", wpSplit.groups.find((g) => g.id === "g-own")?.why === "Split out with a reason: sent on its own.");
  ok("C11.12 BR-4 pass: a sponsor with no mode files nothing (1 filing, C11.12.test.ts:66–72; a combination with no table row, so no table mode stands in)", (deriveFilings("fs.parent_test", [person(0, "principal"), person(4, "sponsor")], undefined, modes({ principal: "files_own", sponsor: null as never })) as D).filings.length === 1);
}
// The threshold decides on its own (review m3): a made-up rule where per-person × people is above the maximum below the threshold.
{
  const rule = { key: "t", label: "Test fee", perPersonCents: 100_00, familyMaxCents: 150_00, familyFrom: 3, source: VISITOR_FEE_SOURCE };
  ok("C6.12 threshold (fail): two people below the threshold pay CAD 200 although it is above the CAD 150 maximum", familyFee(rule, 2).total_cents === 200_00 && !familyFee(rule, 2).cap_applied);
  ok("C6.12 threshold: three people reach it and pay CAD 150", familyFee(rule, 3).total_cents === 150_00 && familyFee(rule, 3).cap_applied);
  ok("C6.12 familyFee: zero people pay nothing", familyFee(rule, 0).total_cents === 0);
}
// Property: on any household, fees within the maximums, one filing per applying person, lines add up to the group total.
try {
  fc.assert(fc.property(fc.array(fc.record({ role: fc.constantFrom("spouse_or_partner", "child"), applies: fc.boolean() }), { maxLength: 12 }), fc.boolean(), (rest, principalApplies) => {
    const people = [person(0, "principal", principalApplies), ...rest.map((x, i) => person(i + 1, x.role as Participant["role"], x.applies))];
    const r = d(people), n = people.filter((p) => p.applies).length;
    if (r.filings.length !== n || r.filings.length + r.not_filing.length !== people.length) return false;
    for (const f of r.groups[0]?.totals ?? []) {
      if (f.people !== n || f.total_cents > f.list_cents) return false;
      if (f.total_cents !== Math.min(f.list_cents, n >= f.family_from ? f.family_max_cents : Infinity)) return false;
      if (sum(r, f.line) !== f.total_cents) return false;
    }
    return n > 0 ? r.fees.length === n * 2 : r.groups.length === 0 && r.fees.length === 0;
  }), { numRuns: 400 });
  ok("C6.12 property: 400 households: one filing per applying person, fees within the maximums, lines add up", true);
} catch (e) { ok("C6.12 property: 400 households: one filing per applying person, fees within the maximums, lines add up", false, String((e as Error).message).slice(0, 400)); }

// C11.12 review m2: the same property with the release's modes drawn at random: fee lines are one per applying person
// (keyed by person), declared-only people have none, and every group's lines add up to its totals.
try {
  fc.assert(fc.property(fc.array(fc.record({ role: fc.constantFrom("spouse_or_partner", "child"), applies: fc.boolean() }), { maxLength: 10 }),
    fc.constantFrom("files_own", "on_principal", "declared_only"), fc.constantFrom("files_own", "on_principal", "declared_only"), (rest, spouseMode, childMode) => {
    const people = [person(0, "principal"), ...rest.map((x, i) => person(i + 1, x.role as Participant["role"], x.applies))];
    const r = deriveFilings("vv.single", people, undefined, { modes: new Map([["spouse_or_partner", spouseMode], ["child", childMode]]) as never }) as D;
    // Whatever the mode, a travelling person applies (on their own filing or the principal's); the principal always does.
    const applying = people.filter((p) => p.role === "principal" || p.applies);
    const onFilings = r.filings.flatMap((f) => f.applicants.filter((a) => a.mode === "applying").map((a) => a.subject));
    if (onFilings.sort().join() !== applying.map((p) => p.subjectId).sort().join()) return false;
    for (const line of ["visitor_visa", "biometrics"]) {
      if (r.fees.filter((f) => f.line === line).map((f) => f.person).sort().join() !== onFilings.join()) return false;
      if (r.groups.reduce((t, g) => t + (g.totals.find((x) => x.line === line)?.total_cents ?? 0), 0) !== sum(r, line)) return false;
    }
    const declared = r.filings.flatMap((f) => f.applicants.filter((a) => a.mode === "declared_only").map((a) => a.subject));
    return declared.every((s) => !r.fees.some((f) => f.person === s));
  }), { numRuns: 300 });
  ok("C11.12 property: 300 households with random modes: one fee line per applying person, none for declared only, lines add up", true);
} catch (e) { ok("C11.12 property: 300 households with random modes: one fee line per applying person, none for declared only, lines add up", false, String((e as Error).message).slice(0, 400)); }

process.exitCode = summary() ? 1 : 0;
