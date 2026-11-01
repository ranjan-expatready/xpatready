// C6.12 checks (M3-B, runtime lane): engine/runtime/filings.ts derives a Visitor visa case's filings, submission group and
// fee lines from its people. Each rule has a passing and a failing case; one property over many households. No database,
// no server, no model call (US$0). Amounts are Sample until the immigration expert confirms (P-171).
//   tsx studio/tests/runtime/check_vv_filings.ts
import fc from "fast-check";
import { deriveFilings, familyFee, FEE_LIST, type Derived } from "../../engine/runtime/filings.ts";
import type { Participant } from "../../engine/runtime/case.ts";
import { recorder } from "./api.ts";

const { ok, summary } = recorder();
const person = (i: number, role: Participant["role"], applies = true): Participant => ({ subjectId: `s-${i}`, role, label: `Client ${String.fromCharCode(65 + i)}`, applies });
const family = (n: number) => [person(0, "principal"), ...(n > 1 ? [person(1, "spouse_or_partner")] : []), ...Array.from({ length: Math.max(0, n - 2) }, (_, i) => person(i + 2, "child"))];
const caseRow: Participant = { subjectId: "s-case", role: "case", label: "Case", applies: true };
const d = (people: Participant[], key = "vv.single") => deriveFilings(key, people) as Extract<Derived, { derived: true }>;
const fee = (r: ReturnType<typeof d>, k: string) => r.groups[0]?.fees.find((f) => f.key === k);

// BR-1: each person who applies files their own application.
{
  const r = d([caseRow, ...family(3)]);
  ok("C6.12 BR-1: three visitors applying → three filings, each their own, in one submission group", r.filings.length === 3 && r.filings.every((f) => f.mode === "files_own" && f.group === "group-1") && r.groups.length === 1 && new Set(r.filings.map((f) => f.subjectId)).size === 3, JSON.stringify(r.filings.map((f) => f.person)));
  ok("C6.12 BR-1: the case itself is never a filing", !r.filings.some((f) => f.role === "case") && !r.notFiling.some((f) => f.role === "case"));
  ok("C6.12 BR-1: each filing has its own application-number box, empty until recorded", r.filings.every((f) => f.applicationNumber === null));
  const odd = d([person(0, "principal"), { ...person(1, "child"), role: "representative" as Participant["role"] }]);
  ok("C6.12 BR-1 (fail): a role with no visitor filing gets none and says why", odd.filings.length === 1 && odd.notFiling.length === 1 && /no filing for the role "representative"/.test(odd.notFiling[0].why), JSON.stringify(odd.notFiling));
}
// Not applying → no filing and no fee.
{
  const r = d([person(0, "principal"), person(1, "spouse_or_partner", false), person(2, "child")]);
  ok("C6.12: a person not applying has no filing and no fee, and the reason is shown", r.filings.length === 2 && r.notFiling.length === 1 && r.notFiling[0].subjectId === "s-1" && /no filing and no fee/.test(r.notFiling[0].why) && fee(r, "visitor_visa")!.totalCents === 200_00);
  const all = d([person(0, "principal"), person(1, "spouse_or_partner"), person(2, "child")]);
  ok("C6.12 (fail): the same household all applying pays for three", fee(all, "visitor_visa")!.totalCents === 300_00 && all.notFiling.length === 0);
  const none = d([person(0, "principal", false)]);
  ok("C6.12: nobody applying → no filing, no group, no fee", none.filings.length === 0 && none.groups.length === 0);
}
// Visitor visa fee: CAD 100 per person, CAD 500 for a family of 5 or more at the same time and place.
{
  const six = fee(d(family(6)), "visitor_visa")!;
  ok("C6.12 fee: six visitors together pay the family maximum CAD 500, not CAD 600", six.totalCents === 500_00 && six.listCents === 600_00 && six.capApplied && /family maximum CAD 500 applies instead of 6 × CAD 100 = CAD 600/.test(six.why), six.why);
  const five = fee(d(family(5)), "visitor_visa")!;
  ok("C6.12 fee: five visitors pay CAD 500, which is the maximum (no saving to claim)", five.totalCents === 500_00 && !five.capApplied);
  const four = fee(d(family(4)), "visitor_visa")!;
  ok("C6.12 fee (fail): four visitors are not a family of 5: CAD 400, and the cap is named as not reached", four.totalCents === 400_00 && !four.capApplied && /starts at 5 people/.test(four.why), four.why);
  const one = fee(d(family(1)), "visitor_visa")!;
  ok("C6.12 fee: one visitor pays CAD 100", one.totalCents === 100_00);
}
// Biometrics: CAD 85 per person, CAD 170 for a family of 2 or more.
{
  ok("C6.12 biometrics: one person CAD 85", fee(d(family(1)), "biometrics")!.totalCents === 85_00);
  const three = fee(d(family(3)), "biometrics")!;
  ok("C6.12 biometrics: three people together pay CAD 170, not CAD 255", three.totalCents === 170_00 && three.capApplied && three.listCents === 255_00);
  const two = fee(d(family(2)), "biometrics")!;
  ok("C6.12 biometrics (fail): two people CAD 170 equals 2 × CAD 85, so no cap is claimed", two.totalCents === 170_00 && !two.capApplied);
  const r = d(family(6));
  ok("C6.12: the group total adds the capped lines (CAD 500 + CAD 170 = CAD 670)", r.groups[0].totalCents === 670_00);
  ok("C6.12: each filing lists its own per-person lines (CAD 100 and CAD 85)", r.filings.every((f) => f.fees.map((x) => x.amountCents).join() === "10000,8500"));
}
// Every fee line carries its official source (P-170).
{
  const r = d(family(2));
  ok("C6.12 P-170: every fee line names the page, the URL, IRCC's words and the date read", r.groups[0].fees.every((f) => f.source === FEE_LIST && /^https:\/\/ircc\.canada\.ca\//.test(f.source.url) && /same time and place/.test(f.source.quote) && /^\d{4}-\d{2}-\d{2}$/.test(f.source.read)) && /Sample until the immigration expert confirms/.test(r.basis));
}
// Only the Visitor visa is derived in this slice; nothing is guessed for others.
{
  const other = deriveFilings("ee.pnp", family(3));
  ok("C6.12 (fail): another combination is not derived yet and says so, with no filings or fees", other.derived === false && /not derived yet/.test(other.why) && !("filings" in other));
  ok("C6.12: the Visitor visa is derived", deriveFilings("vv.single", family(2)).derived === true);
}
// Property: on any household, the group fee is never above either the per-person total or (from familyFrom) the maximum,
// one filing per applying person, and people not applying never add a cent.
try {
  fc.assert(fc.property(fc.array(fc.record({ role: fc.constantFrom("spouse_or_partner", "child"), applies: fc.boolean() }), { maxLength: 12 }), fc.boolean(), (rest, principalApplies) => {
    const people = [person(0, "principal", principalApplies), ...rest.map((x, i) => person(i + 1, x.role as Participant["role"], x.applies))];
    const r = d(people), n = people.filter((p) => p.applies).length;
    if (r.filings.length !== n || r.filings.length + r.notFiling.length !== people.length) return false;
    for (const f of r.groups[0]?.fees ?? []) {
      if (f.people !== n || f.totalCents > f.listCents) return false;
      if (n >= f.familyFrom && f.totalCents > f.familyMaxCents) return false;
      if (f.totalCents !== Math.min(f.listCents, n >= f.familyFrom ? f.familyMaxCents : Infinity)) return false;
    }
    return n > 0 || r.groups.length === 0;
  }), { numRuns: 400 });
  ok("C6.12 property: 400 households: one filing per applying person, fees within the family maximums", true);
} catch (e) { ok("C6.12 property: 400 households: one filing per applying person, fees within the family maximums", false, String((e as Error).message).slice(0, 400)); }
ok("C6.12 familyFee: zero people pay nothing", familyFee({ key: "visitor_visa", label: "x", perPersonCents: 100_00, familyMaxCents: 500_00, familyFrom: 5, source: FEE_LIST }, 0).totalCents === 0);

process.exitCode = summary() ? 1 : 0;
