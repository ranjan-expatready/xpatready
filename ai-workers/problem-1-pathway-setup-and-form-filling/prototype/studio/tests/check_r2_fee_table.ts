// R2 (P-230 (7)): fees live in a dated data table (samples/fee-table.json), never in code; filing modes and the
// checklist's combinations are data too, so another combination is a data edit. Visitor visa totals stay what they were
// in code before (CAD 100 each, CAD 500 for 5 or more; biometrics CAD 85, CAD 170 for 2 or more, none under 14 or over
// 79). C6.12 step 24 adds the study permit, work permit, open work permit holder and visitor extension lines. Each rule has a pass and a fail. Pure: no server, no database; US$0.
//   tsx studio/tests/check_r2_fee_table.ts
import { ageCheck, deriveFilings, FEE_BASES, FEE_TABLE, feeRule, rulesFrom, type FeeTable } from "../engine/runtime/filings.ts";
import { DERIVED_FOR } from "../engine/runtime/case-checklist.ts";
import type { Participant } from "../engine/runtime/case.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const person = (id: string, role: Participant["role"]): Participant => ({ subjectId: id, role, label: id, applies: true });
const family = (adults: number, children: number): Participant[] => [{ subjectId: "case", role: "case", label: "The application", applies: true },
  person("P", "principal"), ...(adults > 1 ? [person("S", "spouse_or_partner")] : []), ...Array.from({ length: children }, (_, i) => person(`C${i}`, "child"))];
type Derived = Extract<ReturnType<typeof deriveFilings>, { derived: true }>;
const total = (r: ReturnType<typeof deriveFilings>, line: string) => (r as Derived).groups.flatMap((g) => g.totals).filter((t) => t.line === line).reduce((s, t) => s + t.total_cents, 0);

// ── Visitor visa totals unchanged (the values formerly in engine/runtime/filings.ts:44-45)
const one = deriveFilings("vv.single", family(1, 0)), five = deriveFilings("vv.single", family(2, 3)), two = deriveFilings("vv.single", family(2, 0));
ok("R2: Visitor visa, one person: CAD 100 + biometrics CAD 85 (as in code before)", total(one, "visitor_visa") === 100_00 && total(one, "biometrics") === 85_00, [total(one, "visitor_visa"), total(one, "biometrics")]);
ok("R2: Visitor visa, two people: CAD 200 + biometrics family maximum CAD 170", total(two, "visitor_visa") === 200_00 && total(two, "biometrics") === 170_00, [total(two, "visitor_visa"), total(two, "biometrics")]);
ok("R2: Visitor visa, five people: family maximums CAD 500 + CAD 170", total(five, "visitor_visa") === 500_00 && total(five, "biometrics") === 170_00, [total(five, "visitor_visa"), total(five, "biometrics")]);
const bio = feeRule("vv.single", "biometrics");
ok("R2: biometrics keeps its ages (none under 14 or over 79) and IRCC's words for them", bio?.exempt?.underAge === 14 && bio?.exempt?.overAge === 79 && /under the age of 14/.test(bio?.exempt?.source.quote ?? ""));
ok("R2 P-230: every fee line says \"Researched (source, date): may change\" with its page and date", FEE_TABLE.lines.every((l) => l.status === `Researched (${l.source.page}, ${l.source.read}): may change`), FEE_TABLE.lines.map((l) => l.status));
ok("R2: the basis names the ages from the table, not from code (none under 14 or over 79)", /none under 14 or over 79/.test((deriveFilings("vv.single", family(1, 0), undefined, { ages: new Map([["P", 30]]) }) as Derived).basis));
const younger: FeeTable = { ...FEE_TABLE, lines: FEE_TABLE.lines.map((l) => (l.key === "biometrics" ? { ...l, exempt: { ...l.exempt!, under_age: 12 } } : l)) };
ok("R2 fail: an edited age in the table changes the words and who pays (a 13-year-old pays when the limit is 12)", /none under 12/.test((deriveFilings("vv.single", family(1, 0), (k) => rulesFrom(younger, k), { ages: new Map([["P", 30]]) }) as Derived).basis)
  && total(deriveFilings("vv.single", [...family(1, 0), person("C0", "child")], (k) => rulesFrom(younger, k), { ages: new Map([["P", 30], ["C0", 13]]) }), "biometrics") === 170_00
  && total(deriveFilings("vv.single", [...family(1, 0), person("C0", "child")], undefined, { ages: new Map([["P", 30], ["C0", 13]]) }), "biometrics") === 85_00);
ok("R2 P-170: every fee line in the table cites a page, a URL, words and a date read", FEE_TABLE.lines.every((l) => l.source.page && /^https:\/\//.test(l.source.url) && l.source.quote.length > 10 && /^\d{4}-\d{2}-\d{2}$/.test(l.source.read)) && /^\d{4}-\d{2}-\d{2}$/.test(FEE_TABLE.as_of));

const viaData = (key: string, people: Participant[], table: FeeTable) => deriveFilings(key, people, (k) => rulesFrom(table, k));
// ── P-247: every line carries its basis; the cap is the "family_maximum" basis, not code
ok("R2 P-247: every fee line has a basis (per application, per person by role, per position, family maximum)", FEE_TABLE.lines.every((l) => FEE_BASES.includes(l.basis)), FEE_TABLE.lines.map((l) => `${l.key}:${l.basis}`));
ok("R2 P-247: the Visitor visa and biometrics lines are on the family maximum basis, with their cap in the table", ["visitor_visa", "biometrics"].every((k) => { const l = FEE_TABLE.lines.find((x) => x.key === k)!; return l.basis === "family_maximum" && !!l.family_max; }));
const six = family(2, 4);
ok("R2 P-247: the case total applies the family maximum: six people pay CAD 500 (not 600) + CAD 170", total(deriveFilings("vv.single", six), "visitor_visa") === 500_00 && total(deriveFilings("vv.single", six), "biometrics") === 170_00, [total(deriveFilings("vv.single", six), "visitor_visa"), total(deriveFilings("vv.single", six), "biometrics")]);
const noCap: FeeTable = { ...FEE_TABLE, lines: FEE_TABLE.lines.map((l) => (l.key === "visitor_visa" ? { ...l, basis: "per_person_by_role" as const, roles: ["principal", "spouse_or_partner", "child"] } : l)) };
ok("R2 P-247 fail: the same line on the per-person basis is never capped: six people pay CAD 600", total(viaData("vv.single", six, noCap), "visitor_visa") === 600_00, total(viaData("vv.single", six, noCap), "visitor_visa"));
const broken = (edit: Partial<FeeTable["lines"][number]>): FeeTable => ({ ...FEE_TABLE, lines: FEE_TABLE.lines.map((l) => (l.key === "visitor_visa" ? { ...l, ...edit } : l)) });
ok("R2 P-247 fail: a line on a basis not worked out (per position), a family maximum without its cap, or a per-role line naming no role is not derived, never guessed",
  rulesFrom(broken({ basis: "per_position" }), "vv.single") === undefined && rulesFrom(broken({ family_max: null }), "vv.single") === undefined && rulesFrom(broken({ basis: "per_person_by_role", roles: [] }), "vv.single") === undefined);

// ── A fee change is a data edit (no code): the same engine, an edited table
const edited: FeeTable = { ...FEE_TABLE, lines: FEE_TABLE.lines.map((l) => (l.key === "visitor_visa" ? { ...l, per_person_cad: 120, family_max: { cad: 600, from_people: 5 } } : l)) };
ok("R2: a changed amount in the table changes the fee (one person CAD 120, five capped at CAD 600)", total(viaData("vv.single", family(1, 0), edited), "visitor_visa") === 120_00 && total(viaData("vv.single", family(2, 3), edited), "visitor_visa") === 600_00);
ok("R2 fail: the shipped table is untouched by that edit (CAD 100 still)", total(deriveFilings("vv.single", family(1, 0)), "visitor_visa") === 100_00);

// ── Another combination is a data edit: spouse sponsorship's lines apply only to their roles
const spouse: FeeTable = { ...FEE_TABLE, combinations: { ...FEE_TABLE.combinations, "fs.spouse": { label: "Spouse sponsorship", lines: ["spouse_sponsorship", "spouse_dependent_child"], modes: { principal: "files_own", child: "files_own" } } } };
const sp = viaData("fs.spouse", [...family(1, 2)], spouse) as Derived;
const linesOf = (who: string) => sp.fees.filter((f) => f.payer === who).map((f) => `${f.line}:${f.amount_cents}`).sort();
ok("R2: spouse sponsorship from data only: the principal pays CAD 1,260, each dependent child CAD 180, no visitor or biometrics line", sp.derived && linesOf("P").join() === "spouse_sponsorship:126000" && linesOf("C0").join() === "spouse_dependent_child:18000" && !sp.fees.some((f) => /visitor|biometrics/.test(f.line)), { P: linesOf("P"), C0: linesOf("C0") });
ok("R2 fail: a role the table gives no filing (the spouse here) files nothing and pays nothing, and says why", sp.not_filing.length === 0 && !(viaData("fs.spouse", family(2, 0), spouse) as Derived).fees.some((f) => f.payer === "S") && (viaData("fs.spouse", family(2, 0), spouse) as Derived).not_filing.some((n) => n.subject === "S"));
ok("R2 fail: a combination not in the table is not derived and says so; an inherited name is never a combination", deriveFilings("fs.spouse", family(1, 0)).derived === false && /not derived yet/.test((deriveFilings("fs.spouse", family(1, 0)) as { why: string }).why) && rulesFrom(FEE_TABLE, "constructor") === undefined && rulesFrom(FEE_TABLE, "__proto__") === undefined);
ok("R2: spouse and PNP fee lines are in the table, cited, ready for their combinations (data edit)", ["spouse_sponsorship", "spouse_dependent_child", "pr_adult", "pr_dependent_child"].every((k) => FEE_TABLE.lines.some((l) => l.key === k && l.per_person_cad > 0)));

// ── C6.12 step 24: study permit, work permit, open work permit holder and visitor extension lines (IRCC fee list, page
// date 2026-09-21, read 3 Nov 2026; compliance-trace FEE-R01…R04). Each is charged to every person applying, none capped.
const OTHER: [string, number, RegExp][] = [["study_permit", 150_00, /^Study permit \(including extensions\) – per person 150\.00$/], ["work_permit", 155_00, /^Work permit \(including extensions\) – per person 155\.00$/],
  ["open_work_permit_holder", 100_00, /^Open work permit holder 100\.00$/], ["visitor_extension", 100_00, /^Extend your stay as a visitor – per person 100\.00$/]];
const usingLine = (key: string, table: FeeTable = FEE_TABLE): FeeTable => ({ ...table, combinations: { ...table.combinations, "t.one": { label: "Test", lines: [key], modes: { principal: "files_own", spouse_or_partner: "files_own", child: "files_own" } } } });
for (const [key, cents, quote] of OTHER) {
  const l = FEE_TABLE.lines.find((x) => x.key === key);
  ok(`C6.12-24 ${key}: CAD ${cents / 100} per person on IRCC's fee list, quoted word for word with its date read, per person by role for every applicant role, no family maximum`,
    !!l && Math.round(l.per_person_cad * 100) === cents && quote.test(l.source.quote) && l.source.url === "https://ircc.canada.ca/english/information/fees/fees.asp" && l.source.read === "2026-11-03" && l.basis === "per_person_by_role" && JSON.stringify(l.roles) === JSON.stringify(["principal", "spouse_or_partner", "child"]) && !l.family_max && !l.exempt, l);
  const sixPay = total(viaData("t.one", six, usingLine(key)), key), onePays = total(viaData("t.one", family(1, 0), usingLine(key)), key);
  ok(`C6.12-24 ${key} pass: one person pays CAD ${cents / 100}; six people applying together pay six times that (never capped)`, onePays === cents && sixPay === 6 * cents, [onePays, sixPay]);
  const capped: FeeTable = { ...FEE_TABLE, lines: FEE_TABLE.lines.map((x) => (x.key === key ? { ...x, family_max: { cad: 1, from_people: 2 } } : x)) };
  ok(`C6.12-24 ${key} fail: a family maximum written on the line by mistake is not applied (the basis is per person: only family_maximum caps)`, total(viaData("t.one", six, usingLine(key, capped)), key) === 6 * cents);
}
ok("C6.12-24 fail: no shipped combination uses these lines yet (their combinations come with their releases); Visitor visa's lines are unchanged", Object.values(FEE_TABLE.combinations).every((c) => !c.lines.some((k) => OTHER.some(([o]) => o === k))) && JSON.stringify(FEE_TABLE.combinations["vv.single"].lines) === JSON.stringify(["visitor_visa", "biometrics"]));
ok("C6.12-24: the open work permit holder line says its \"per holder\" reading is Sample (IRCC's row gives no \"per person\") and cites Help Centre 176 for \"paid with the work permit fee\"; the work permit line says the performing-artist group maximum is not modelled", /qnum=176.*at the same time that you pay the work permit fee/.test(FEE_TABLE.lines.find((x) => x.key === "open_work_permit_holder")?.source.checked ?? "") && /our reading \(Sample/.test(FEE_TABLE.lines.find((x) => x.key === "open_work_permit_holder")?.source.checked ?? "") && /performing artists only, not a family maximum, and is not modelled/.test(FEE_TABLE.lines.find((x) => x.key === "work_permit")?.source.checked ?? ""));

// ── outside check on #455: per application counts applications; an uncapped line names no cap; the basis names its own table
const perApp: FeeTable = { ...FEE_TABLE, as_of: "2027-01-01", read: "2027-01-02", lines: [...FEE_TABLE.lines, { key: "app_fee", label: "Application fee", status: "Researched (test, 2027-01-02): may change", basis: "per_application", per_person_cad: 100, source: FEE_TABLE.lines[0].source }],
  combinations: { "t.app": { label: "Test", lines: ["app_fee"], modes: { principal: "files_own", child: "on_principal" } } } };
const app = viaData("t.app", family(1, 1), perApp) as Derived;
ok("R2 (outside check #455 r1) fail: a child on the principal's application is not charged the per-application fee again: CAD 100 once", total(app, "app_fee") === 100_00 && app.fees.filter((f) => f.line === "app_fee" && f.amount_cents > 0).length === 1, app.fees.map((f) => `${f.payer}:${f.amount_cents}`));
// C11.12 (BR-6): a child on the principal's application has no filing of their own, so it cannot leave the group; a
// child who files their own application and is split out pays its own per-application fee (r4), and two own filings
// split out together are two applications (r5, restated in the C11.12 model on the merge of #478).
const ownKids: FeeTable = { ...perApp, combinations: { "t.app": { label: "Test", lines: ["app_fee"], modes: { principal: "files_own", child: "files_own" } } } };
const split = deriveFilings("t.app", family(1, 1), (k) => rulesFrom(ownKids, k), { groupOf: (subj) => (subj === "C0" ? "group-split" : "group-family") }) as Derived;
ok("R2 (outside check #455 r4) fail: a child's own filing split out of the principal's group pays its own per-application fee (CAD 100 + CAD 100)", total(split, "app_fee") === 200_00 && split.groups.every((g) => g.totals.some((t) => t.line === "app_fee" && t.total_cents === 100_00)), split.groups.map((g) => g.totals.map((t) => t.total_cents)));
const onP = deriveFilings("t.app", family(1, 1), (k) => rulesFrom(perApp, k), { groupOf: (subj) => (subj === "C0" ? "group-split" : "group-family") }) as Derived;
ok("R2 + C11.12 fail: a child on the principal's application stays on it (no filing to split): one group, CAD 100 once", onP.groups.length === 1 && total(onP, "app_fee") === 100_00 && onP.filings.length === 1 && onP.filings[0].applicants.length === 2, onP.groups.map((g) => [g.id, g.totals.map((t) => t.total_cents)]));
const twoDeps = deriveFilings("t.app", family(1, 2), (k) => rulesFrom(ownKids, k), { groupOf: (subj) => (subj.startsWith("C") ? "group-split" : "group-family") }) as Derived;
ok("R2 (outside check #455 r5, C11.12 model) fail: two own filings split out together are two applications: CAD 200 there, CAD 300 in all", twoDeps.groups.find((g) => g.id === "group-split")?.totals.find((t) => t.line === "app_fee")?.total_cents === 200_00 && total(twoDeps, "app_fee") === 300_00, twoDeps.groups.map((g) => [g.id, g.totals.map((t) => t.total_cents)]));
const covered = deriveFilings("t.app", family(1, 2), (k) => rulesFrom(perApp, k)) as Derived;
ok("R2 + C11.12: the per-application line is one line on the principal's filing, its words say whom it covers", covered.fees.filter((f) => f.line === "app_fee").length === 1 && covered.fees[0].payer === "P" && /covering the 3 people applying on it/.test(covered.fees[0].why), covered.fees.map((f) => f.why));
ok("R2 (outside check #455 r2) fail: an uncapped line's words name no family maximum", app.groups[0].totals.every((t) => !/the family maximum|CAD 0\b|starts at/.test(t.why)) && /no family maximum/.test(app.groups[0].totals[0].why), app.groups[0].totals.map((t) => t.why));
ok("R2 (outside check #455 r3) fail: the basis names the table that priced the fees (as of 2027-01-01), not the shipped one", /as of 2027-01-01, read 2027-01-02/.test(app.basis) && /as of 2026-09-21/.test((deriveFilings("vv.single", family(1, 0)) as Derived).basis), app.basis.slice(0, 120));

// ── Break r1 (money): a badly edited table is refused (not derived), never priced wrong
const vvWith = (edit: (t: FeeTable) => FeeTable) => rulesFrom(edit(structuredClone(FEE_TABLE)), "vv.single");
const lineEdit = (e: Record<string, unknown>) => (t: FeeTable) => ({ ...t, lines: t.lines.map((l) => (l.key === "visitor_visa" ? { ...l, ...e } as typeof l : l)) });
const bad: [string, (t: FeeTable) => FeeTable][] = [
  ["a missing amount", lineEdit({ per_person_cad: undefined })], ["an amount as text", lineEdit({ per_person_cad: "1,260" })], ["a negative amount", lineEdit({ per_person_cad: -100 })],
  ["a line listed twice", (t) => ({ ...t, combinations: { ...t.combinations, "vv.single": { ...t.combinations["vv.single"], lines: ["visitor_visa", "visitor_visa", "biometrics"] } } })],
  ["two lines with one key", (t) => ({ ...t, lines: [...t.lines, { ...t.lines[0] }] })],
  ["a combination with no lines", (t) => ({ ...t, combinations: { ...t.combinations, "vv.single": { ...t.combinations["vv.single"], lines: [] } } })],
  ["an empty roles list", lineEdit({ roles: [] })], ["roles as text", lineEdit({ roles: "principal" })],
  ["a cap with no amount", lineEdit({ family_max: { from_people: 5 } })], ["a cap of zero", lineEdit({ family_max: { cad: 0, from_people: 5 } })], ["a cap from zero people", lineEdit({ family_max: { cad: 500, from_people: 0 } })],
  ["a sub-cent amount", lineEdit({ per_person_cad: 0.001 })], ["a sub-cent cap", lineEdit({ family_max: { cad: 0.001, from_people: 5 } })], ["a cap just above zero", lineEdit({ family_max: { cad: 0.000000001, from_people: 5 } })], ["an amount just above a whole cent", lineEdit({ per_person_cad: 100.000000001 })],
  ["an exemption without ages", (t) => ({ ...t, lines: t.lines.map((l) => (l.key === "biometrics" ? { ...l, exempt: { source: l.exempt!.source } } as typeof l : l)) })],
  // Break on #500 (M1, m1, m2): each of these was priced in silence (or threw) before.
  ["a role the library does not know (\"spouse\")", lineEdit({ basis: "per_person_by_role", roles: ["principal", "spouse", "child"] })], ["a role nobody has", lineEdit({ roles: ["nobody"] })],
  ["a role that never applies (the sponsor)", lineEdit({ basis: "per_person_by_role", roles: ["sponsor"] })],
  ["swapped age limits", (t) => ({ ...t, lines: t.lines.map((l) => (l.key === "biometrics" ? { ...l, exempt: { ...l.exempt!, under_age: 80, over_age: 14 } } : l)) })],
  ["negative age limits", (t) => ({ ...t, lines: t.lines.map((l) => (l.key === "biometrics" ? { ...l, exempt: { ...l.exempt!, under_age: -5, over_age: -1 } } : l)) })],
  ["a line without its source", lineEdit({ source: undefined })], ["a line without its words", lineEdit({ label: undefined })],
  ["a table mode on a role the library does not know", (t) => ({ ...t, combinations: { ...t.combinations, "vv.single": { ...t.combinations["vv.single"], modes: { ...t.combinations["vv.single"].modes, chlid: "files_own" } } } })],
  ["a spouse that co-files", (t) => ({ ...t, combinations: { ...t.combinations, "vv.single": { ...t.combinations["vv.single"], modes: { ...t.combinations["vv.single"].modes, spouse_or_partner: "co_files" } } } })],
  ["a representative with a filing", (t) => ({ ...t, combinations: { ...t.combinations, "vv.single": { ...t.combinations["vv.single"], modes: { ...t.combinations["vv.single"].modes, representative: "co_files" } } } })],
];
for (const [what, edit] of bad) ok(`R2 (break r1) fail: ${what} makes the Visitor visa not derived, never a wrong total`, vvWith(edit) === undefined);
ok("R2 (break r1): the shipped table passes the same checks (Visitor visa derived)", vvWith((t) => t) !== undefined);
ok("R2 (break on #500 m1) fail: a table with no combinations is not derived, and nothing throws", (() => { try { return rulesFrom({ ...FEE_TABLE, combinations: undefined } as unknown as FeeTable, "vv.single") === undefined; } catch { return false; } })());
const appAged: FeeTable = { ...perApp, lines: perApp.lines.map((l) => (l.key === "app_fee" ? { ...l, exempt: FEE_TABLE.lines.find((x) => x.key === "biometrics")!.exempt } : l)) };
ok("R2 (break on #500 m3) fail: an age exemption on a per-application line is refused (the owner's age would decide for everyone on it)", rulesFrom(appAged, "t.app") === undefined && rulesFrom(perApp, "t.app") !== undefined);
// Break on #500 M2: a sponsorship combination added to the table with the sample's modes (the sponsor co-files) is not
// priced from the table: no basis reaches the sponsor, so the sponsorship fee would land on the sponsored person.
const fsOut: FeeTable = { ...FEE_TABLE, combinations: { ...FEE_TABLE.combinations, "fs.outside": { label: "Spouse sponsorship (outside Canada)", lines: ["spouse_sponsorship", "spouse_dependent_child"], modes: { principal: "files_own", sponsor: "co_files", child: "on_principal" } } } };
ok("R2 + C11.12 (break on #500 M2) fail: a table combination whose sponsor co-files is not derived from the table, never charged to the sponsored person", rulesFrom(fsOut, "fs.outside") === undefined);
const fsRel = deriveFilings("fs.outside", [...family(1, 1), person("SP", "sponsor")], (k) => rulesFrom(fsOut, k), { modes: new Map([["sponsor", "co_files"], ["child", "on_principal"]]), label: "Spouse sponsorship" }) as Derived;
ok("R2 + C11.12 (break on #500 M2) pass: its filings still come from the release (the sponsorship co-filed), with no amount and words that say so", fsRel.derived && fsRel.fees.length === 0 && fsRel.fees_worked_out === false && fsRel.filings.some((f) => f.mode === "co_filed") && fsRel.groups.every((g) => g.total_cents === null) && /not worked out yet/.test(fsRel.fees_why ?? ""), { fees: fsRel.fees.length, why: fsRel.fees_why });
// Review on #500 M1: R2's own spouse table (principal and child only) with the release bringing a co-filing sponsor:
// the sponsored principal is never charged the sponsorship fee, and no line says otherwise.
const spRel = deriveFilings("fs.spouse", [...family(1, 1), person("SP", "sponsor")], (k) => rulesFrom(spouse, k), { modes: new Map([["sponsor", "co_files"]]) }) as Derived;
ok("R2 + C11.12 (review on #500 M1) fail: a release that adds a co-filing sponsor to a priced table combination charges no one (never CAD 1,260 on the sponsored person)", spRel.derived && spRel.fees.length === 0 && spRel.fees_worked_out === false && spRel.groups.every((g) => g.total_cents === null), spRel.fees.map((f) => `${f.payer}:${f.line}:${f.amount_cents}`));
ok("R2 + C11.12 (review on #500 M1) pass: the same table without a sponsor on the case still prices from data", (viaData("fs.spouse", family(1, 1), spouse) as Derived).fees.some((f) => f.payer === "P" && f.amount_cents === 126000));
// Review on #500 m2: a per-application line limited to roles, and the covering count leaves out declared-only people.
const appRoles: FeeTable = { ...perApp, lines: perApp.lines.map((l) => (l.key === "app_fee" ? { ...l, roles: ["child"] } : l)), combinations: { "t.app": { label: "Test", lines: ["app_fee"], modes: { principal: "files_own", child: "files_own" } } } };
const ar = viaData("t.app", family(1, 2), appRoles) as Derived;
ok("R2 + C11.12 (review on #500 m2) fail: a per-application line limited to children is charged on the children's applications only", ar.fees.filter((f) => f.line === "app_fee").map((f) => f.payer).sort().join() === "C0,C1" && total(ar, "app_fee") === 200_00, ar.fees.map((f) => `${f.payer}:${f.amount_cents}`));
const declTab: FeeTable = { ...perApp, combinations: { "t.app": { label: "Test", lines: ["app_fee"], modes: { principal: "files_own", child: "on_principal", spouse_or_partner: "declared_only" } } } };
const decl = deriveFilings("t.app", [...family(2, 1)].map((p) => (p.subjectId === "S" ? { ...p, applies: false } : p)), (k) => rulesFrom(declTab, k)) as Derived;
ok("R2 + C11.12 (review on #500 m2) fail: the per-application words count the people applying, never a declared-only person", decl.fees.length === 1 && /covering the 2 people applying on it/.test(decl.fees[0].why) && decl.filings[0].applicants.length === 3, decl.fees.map((f) => f.why));
const allDeps: FeeTable = { ...perApp, combinations: { "t.app": { label: "Test", lines: ["app_fee"], modes: { principal: "on_principal", child: "on_principal" } } } };
ok("R2 (break r1 B16, C11.12 BR-2) fail: a table putting the principal on another's application is refused: not derived, never guessed", deriveFilings("t.app", family(1, 2), (k) => rulesFrom(allDeps, k)).derived === false && rulesFrom(allDeps, "t.app") === undefined);
const misspelt: FeeTable = { ...perApp, combinations: { "t.app": { label: "Test", lines: ["app_fee"], modes: { principal: "files_own", child: "on_principal_typo" as never } } } };
ok("R2 + C11.12 fail: a mode the engine does not know is refused (not derived)", rulesFrom(misspelt, "t.app") === undefined);
const awayP = deriveFilings("t.app", [{ subjectId: "case", role: "case", label: "The application", applies: true }, { ...person("P", "principal"), applies: false }, person("C0", "child"), person("C1", "child")], (k) => rulesFrom(perApp, k)) as Derived;
ok("R2 (B16) + C11.12 fail: the principal not applying, the children on their application have no application to be on: no filing, no fee, each says why", awayP.derived && awayP.filings.length === 0 && awayP.fees.length === 0 && ["C0", "C1"].every((c) => awayP.not_filing.some((n) => n.subject === c && /No principal applicant/.test(n.why))), awayP.not_filing);
const r12 = rulesFrom(younger, "vv.single")!.fees.find((f) => f.key === "biometrics")!;
const why12 = (ageCheck(r12, 10) as { why: string }).why;
ok("R2 (review r1 m6) fail: an edited age speaks with the table's limit and the source's own words, never a made-up IRCC quote", /^Under 12:/.test(why12) && why12.includes(`"${r12.exempt!.source.quote}"`) && !/the age of 12/.test(why12), why12);

// ── The checklist's combinations are data
ok("R2: the checklist is worked out for the combinations the table marks (Visitor visa today)", DERIVED_FOR.has("vv.single"));
ok("R2 fail: a combination the table does not mark has no checklist yet", !DERIVED_FOR.has("fs.spouse") && !DERIVED_FOR.has("pnp.express_entry") && [...DERIVED_FOR].every((k) => FEE_TABLE.combinations[k]?.checklist === true));
process.exitCode = summary() ? 1 : 0;
