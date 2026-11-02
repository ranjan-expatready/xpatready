// G1 (C5.4, P-240; concept screens/G1-source-register/concept.md v2): the pure engine part of "a release is refused
// while a published number has no source entry or 'None published – set by ExpatReady'". Which numbers a release
// publishes (BR-1), their address by meaning (BR-2), records that already cite (BR-4, fee lines), one canonical value
// (BR-5) and the refusal words (BR-6, BR-8). Each rule has a passing and a failing case, on the real reviewed
// work-permit release (p3/releases/c1-v3, shaped as the sample load imports it for "With an LMIA") and on small
// hand-made snapshots. Pure: no database, no server, no model call (US$0).
//   tsx studio/tests/check_g1_source_register.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { slug } from "../engine/import.ts";
import { canonicalValue, publishedNumbers, sourceProblems, type FeeLineInput, type PublishedNumber, type SourceEntry, type WalkedSnapshot } from "../engine/source-register.ts";
import { FEE_TABLE } from "../engine/runtime/filings.ts";
import { WHERE_STEP } from "../engine/setup-checklist.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const STUDIO = join(import.meta.dirname, "..");
const PROTO = join(STUDIO, "..");

// ---------------------------------------------------------------- the real work-permit release as Release 1 holds it
// The same shaping as engine/import.ts (rule keys R-01…, document lineage `<slug>:<who>`, form-native checks left with
// the field map, a check's message = its plain condition + the user action) and api/src/demo.ts (the "With an LMIA"
// row leaves out the document lines samples/programs.json names). No database: the shape engine/snapshot.ts builds.
type Cfg = { forms: { form_number: string; who: string; status: string; condition?: unknown }[]; document_requirements: { document_type: string; who: string; status: string; condition?: unknown }[];
  rules: { when?: unknown; then: string; for_whom: string }[]; checks: { id: string; group: string; applies_to?: string | null; condition?: unknown; condition_plain?: string | null; user_action?: string | null; source_quote?: string | null }[] };
const config = JSON.parse(readFileSync(join(PROTO, "p3", "releases", "c1-v3", "configuration.json"), "utf8")) as Cfg;
type SampleNode = { setup?: { key: string; import?: string; drop_documents?: { document_type: string }[] }; [k: string]: unknown };
const imported: SampleNode["setup"][] = [];
const findSetups = (n: unknown): void => { if (Array.isArray(n)) n.forEach(findSetups); else if (n && typeof n === "object") { const s = (n as SampleNode).setup; if (s?.import === "release") imported.push(s); Object.values(n).forEach(findSetups); } };
findSetups(JSON.parse(readFileSync(join(STUDIO, "samples", "programs.json"), "utf8")));
const lmia = imported.find((s) => s?.key === "wp.family")!;
const drop = new Set((lmia.drop_documents ?? []).map((d) => d.document_type));
const reqs = config.document_requirements.filter((d) => d.status !== "dismissed" && !drop.has(d.document_type));
const release: WalkedSnapshot = {
  combination: { key: lmia.key },
  forms: config.forms.filter((f) => f.status !== "dismissed").map((f) => ({ form_number: f.form_number, condition: f.condition ?? null })),
  document_requirements: reqs.map((d, i) => ({ lineage: `${slug(d.document_type)}:${d.who}`.slice(0, 120) + (reqs.findIndex((x) => slug(x.document_type) === slug(d.document_type) && x.who === d.who) === i ? "" : `:${i}`), document_type: d.document_type, condition: d.condition ?? null })),
  placements: [], // the release's placements carry no condition (import.ts writes none)
  rules: config.rules.map((r, i) => ({ id: `R-${String(i + 1).padStart(2, "0")}`, when: r.when, then: r.then })),
  checks: config.checks.filter((c) => c.group !== "form_native").map((c) => ({ id: c.id, group: c.group, applies_to: c.applies_to ?? null, condition: c.condition, message: [c.condition_plain, c.user_action].filter(Boolean).join(" ").slice(0, 900) || null, source_quote: c.source_quote ?? null })),
};
const nums = publishedNumbers(release);
const items = new Set(nums.map((n) => n.key));
const tally = (list: PublishedNumber[]) => Object.entries(list.reduce<Record<string, number>>((m, n) => ({ ...m, [n.value]: (m[n.value] ?? 0) + 1 }), {})).sort((a, b) => Number(b[0]) - Number(a[0])).map(([v, c]) => `${v}×${c}`).join(" ");
const imm5707 = nums.filter((n) => n.key === "wp.family/form:IMM 5707");

// ---------------------------------------------------------------- BR-1 which numbers
ok("C5.4 BR-1 pass: the work-permit release publishes 19 numbers on 17 items (18×5, 90×5, 30×4, 5×4, 1×1)", nums.length === 19 && items.size === 17 && tally(nums) === "90×5 30×4 18×5 5×4 1×1", { numbers: nums.length, items: items.size, tally: tally(nums) });
ok("C5.4 BR-1 pass: the IMM 5707 form line's own two 18s are listed (kind rule, the combination in the key), not only the rule's", imm5707.length === 2 && imm5707.every((n) => n.kind === "rule" && n.value === "18" && n.where === "Forms") && nums.some((n) => n.key === "wp.family/R-01" && n.value === "18"), imm5707.map((n) => n.address));
ok("C5.4 BR-1 pass: the two Venezuelan document lines' 5 years are listed under Documents, keyed by lineage", nums.filter((n) => n.where === "Documents" && n.value === "5" && /^wp\.family\/doc:letter_of_explanation_/.test(n.key)).length === 2);
ok("C5.4 BR-1 fail: 0 in a comparison, yes/no values and answer-list codes are never listed (OR_PASSPORT_EXPIRED's lt 0; eq '01'; eq true)",
  !nums.some((n) => n.value === "0") && !nums.some((n) => n.key.endsWith("/OR_PASSPORT_EXPIRED") || n.key.endsWith("/CR_STATUS_CITIZEN_BUT_RESIDENCE_DIFFERS") || n.key.endsWith("/CR_LANGUAGE_ANSWERS_MATCH")) && !nums.some((n) => n.address.startsWith("person.travelling_alone_to_canada")));
const withDates = publishedNumbers(release, { dates: true });
ok("C5.4 BR-1 fail: dates are left out by default (founder question open); with dates on, the 8 cut-off and in-force dates join (7 June 2019 ×6, 1 November 2024 ×2)",
  !nums.some((n) => /^\d{4}-/.test(n.value)) && withDates.length === 27 && withDates.filter((n) => n.value === "2019-06-07").length === 6 && withDates.filter((n) => n.value === "2024-11-01").length === 2, { withDates: withDates.length });
const small: WalkedSnapshot = {
  combination: { key: "vv.single" },
  forms: [{ form_number: "IMM 5257", min_age: 18, condition: null }],
  placements: [{ lineage: "q.funds", fact: "case.funds_cad", question_text: "How much money do you have for the trip?", condition: { op: "gte", field: "case.trip_days", value: 30 } }],
  eligibility: { gates: [{ key: "vv.funds", label: "Enough money for the stay", condition: { subjectKind: "CASE", op: "gte", field: "case.funds_cad", value: 13757 } }] },
  checks: [{ id: "DV_POLICE", group: "document_validity", applies_to: "police_certificate", message: "Issued no more than 6 months before.", source_quote: null, condition: { op: "issued_within_months", months: 6, before: "case.application_date", cite: {} } }],
};
const sm = publishedNumbers(small);
ok("C5.4 BR-1 pass: \"From age\" is a threshold, a gate and a question condition are walked, a validity rule's months are listed",
  sm.some((n) => n.kind === "threshold" && n.address === "min_age" && n.value === "18" && n.key === "vv.single/form:IMM 5257")
  && sm.some((n) => n.key === "vv.single/gate:vv.funds" && n.where === "Eligibility" && n.value === "13757")
  && sm.some((n) => n.key === "vv.single/question:q.funds" && n.where === "Questions" && n.value === "30")
  && sm.some((n) => n.key === "vv.single/DV_POLICE" && n.address === "months" && !n.sourced_by), sm.map((n) => `${n.kind} ${n.key} ${n.address}`));
ok("C5.4 BR-1 pass: every number's place is a `where` the setup checklist routes (no new literal)", [...nums, ...sm].every((n) => WHERE_STEP[n.where]));

// ---------------------------------------------------------------- BR-2 address by meaning
ok("C5.4 BR-2 pass: the IMM 5707 18s are addressed by field, operator and order, never by JSON position", imm5707.map((n) => n.address).sort().join() === "person.age_years|gte|1,person.age_years|lt|1" && imm5707.every((n) => n.hint.startsWith("forms[")));
const form5707 = release.forms!.find((f) => f.form_number === "IMM 5707")!;
const cite = { url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/guide-5487.html", page: "Guide 5487", quote: "18 years of age or older", date: "2026-10-19" };
const entriesFor = (list: PublishedNumber[]): SourceEntry[] => list.map((n) => ({ kind: n.kind, key: n.key, address: n.address, value: n.value, cited: cite }));
const inserted: WalkedSnapshot = { ...release, forms: release.forms!.map((f) => (f === form5707 ? { ...f, condition: { subjectKind: "EACH_APPLICANT", op: "and", args: [{ op: "exists", field: "person.passport_number" }, { op: "gt", field: "person.dependants_count", value: 0 }, f.condition] } } : f)) };
const after = publishedNumbers(inserted).filter((n) => n.key === "wp.family/form:IMM 5707");
ok("C5.4 BR-2 pass: a clause inserted before IMM 5707's first 18 (the tree wrapped in \"and\") keeps both addresses, so their entries are still found",
  after.length === 2 && sourceProblems(after, entriesFor(imm5707)).length === 0 && after[0].hint !== imm5707[0].hint, after.map((n) => `${n.address} @ ${n.hint}`));
const toGt = JSON.parse(JSON.stringify(form5707.condition).replace('"op":"gte","field":"person.age_years"', '"op":"gt","field":"person.age_years"'));
const moved = publishedNumbers({ combination: release.combination, forms: [{ form_number: "IMM 5707", condition: toGt }] });
const movedProblems = sourceProblems(moved, entriesFor(imm5707));
ok("C5.4 BR-2 fail: changing gte to gt lists that 18 again as having no source (the other 18 keeps its entry)", movedProblems.length === 1 && movedProblems[0].address === "person.age_years|gt|1" && movedProblems[0].state === "missing", movedProblems.map((p) => p.message));

// ---------------------------------------------------------------- BR-5 one canonical value
const gate = sm.find((n) => n.key === "vv.single/gate:vv.funds")!;
ok("C5.4 BR-5 pass: an entry written as \"13757.0\" (or \" 13757 \") is the same value as 13757, not stale",
  canonicalValue("13757.0") === "13757" && canonicalValue(13757) === "13757" && sourceProblems([gate], [{ kind: "rule", key: gate.key, address: gate.address, value: " 13757.0 ", none_published: { reason: "ExpatReady's own working figure for the demo" } }]).length === 0);
ok("C5.4 BR-5 fail: a different number (13757.5) is a different value; a date stays its ISO text", canonicalValue("13757.5") !== "13757" && sourceProblems([gate], [{ kind: "rule", key: gate.key, address: gate.address, value: "13757.5", none_published: true }]).length === 1 && canonicalValue("2019-06-07T00:00:00Z") === "2019-06-07");

// ---------------------------------------------------------------- BR-6, BR-8 refused, naming each, in §5's words
const missing = sourceProblems(nums, []);
const rw90 = nums.find((n) => n.key === "wp.family/RW_PASSPORT_EXPIRY_90")!;
ok("C5.4 BR-6 pass: with every number cited or None published, nothing is refused", sourceProblems(nums, nums.map((n, i) => ({ kind: n.kind, key: n.key, address: n.address, value: Number(n.value), ...(i % 2 ? { cited: cite } : { none_published: { reason: "ExpatReady's warning lead time" } }) }))).length === 0);
ok("C5.4 BR-6 fail: with no entries all 19 are refused, each named, in the concept's exact words",
  missing.length === 19 && missing.every((p) => p.level === "error" && p.state === "missing")
  && missing.some((p) => p.message === "Form IMM 5707: Age years: at least 18 has no source entry. Add the official source, or mark 'None published – set by ExpatReady'." && p.where === "Forms" && p.item === "wp.family/form:IMM 5707"),
  missing.filter((p) => p.where === "Forms").map((p) => p.message));
const changed = sourceProblems([{ ...rw90, value: "60" }], [{ kind: rw90.kind, key: rw90.key, address: rw90.address, value: 90, none_published: { reason: "ExpatReady's warning lead time" } }]);
ok("C5.4 BR-6 fail: an entry written for 90 while the number is now 60 is refused with the \"Changed\" sentence",
  changed.length === 1 && changed[0].state === "changed" && changed[0].message === `${rw90.item_words}: the source was written for 90; the number is now 60. Check the source again, or mark 'None published – set by ExpatReady'.`, changed[0]?.message);
ok("C5.4 BR-6 fail: an entry for another combination's key does not source this one (keys carry the combination)", sourceProblems([rw90], [{ kind: rw90.kind, key: "wp.single/RW_PASSPORT_EXPIRY_90", address: rw90.address, value: 90, none_published: true }]).length === 1);

// ---------------------------------------------------------------- BR-4 records that already cite (fee lines, validity)
const fees = publishedNumbers({ combination: { key: "vv.single" } }, { feeLines: FEE_TABLE.lines as FeeLineInput[] });
ok("C5.4 BR-4 pass: every fee-table line's numbers are listed as kind fee and count as sourced (page, URL, quote, date read): none refused",
  fees.length >= 6 && fees.every((n) => n.kind === "fee" && n.sourced_by === "fee_table") && sourceProblems(fees, []).length === 0 && fees.some((n) => n.key === "vv.single/fee:visitor_visa" && n.address === "per_person_cad" && n.value === "100"), tally(fees));
const unsourced = publishedNumbers({ combination: { key: "vv.single" } }, { feeLines: [{ key: "app_fee", label: "Application fee", per_person_cad: 155, source: { page: "IRCC fee list", url: "https://ircc.canada.ca/english/information/fees/fees.asp", quote: "", read: "2026-11-02" } }] });
ok("C5.4 BR-4 fail: a fixture fee line whose source has no quote is refused, named (engine level only: CI refuses it in the table)", sourceProblems(unsourced, []).map((p) => p.message).join() === "Application fee: Per person (CAD): 155 has no source entry. Add the official source, or mark 'None published – set by ExpatReady'.");
const usable: WalkedSnapshot = { ...small, canonical_fields: [{ id: "case.application_date" }], document_types: [{ key: "police_certificate" }], checks: [{ ...small.checks![0], source_quote: "issued no more than 6 months before", condition: { op: "issued_within_months", months: 6, before: "case.application_date", cite: { page: "Guide 5256", url: "https://www.canada.ca/guide-5256", read: "2026-10-19" } } }] };
const dv = publishedNumbers(usable).find((n) => n.address === "months")!;
ok("C5.4 BR-4 pass: a usable document validity rule's months count through its own cite; the same rule without its cite is refused (m5)", dv.sourced_by === "validity_cite" && sourceProblems([dv], []).length === 0 && sourceProblems(sm.filter((n) => n.address === "months"), []).length === 1);

// ---------------------------------------------------------------- M1 kept outside validate(), pure
const src = readFileSync(join(STUDIO, "engine", "source-register.ts"), "utf8");
ok("C5.4 M1 pass: source-register.ts reads no file or database and only takes validate.ts's Problem type", !/node:fs|@prisma|fetch\(/.test(src) && !/^import \{[^}]*\} from "\.\/validate\.ts"/m.test(src) && /^import type \{ Problem \} from "\.\/validate\.ts"/m.test(src));
ok("C5.4 M1 fail: validate.ts does not call the source gate (a released snapshot is never re-judged)", !/source-register|sourceProblems/.test(readFileSync(join(STUDIO, "engine", "validate.ts"), "utf8")));

process.exit(summary() ? 1 : 0);
