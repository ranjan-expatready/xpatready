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
import { statesValue, canonicalValue, entryOf, frozenSources, numberState, publishedNumbers, SAMPLE_LOADER, sourceChanges, sourceProblems, statesInDigits, type FeeLineInput, type PublishedNumber, type SourceEntry, type WalkedSnapshot } from "../engine/source-register.ts";
import { problemWords } from "../contracts/programs.ts";
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
const nums = publishedNumbers(release, { dates: false }); // numbers only: the counts below; dates (on by default, P-279) are checked apart
const items = new Set(nums.map((n) => n.key));
const tally = (list: PublishedNumber[]) => Object.entries(list.reduce<Record<string, number>>((m, n) => ({ ...m, [n.value]: (m[n.value] ?? 0) + 1 }), {})).sort((a, b) => Number(b[0]) - Number(a[0])).map(([v, c]) => `${v}×${c}`).join(" ");
const imm5707 = nums.filter((n) => n.key === "wp.family/form:IMM 5707");

// ---------------------------------------------------------------- BR-1 which numbers
ok("C5.4 BR-1 pass: the work-permit release publishes 19 numbers on 17 items (18×5, 90×5, 30×4, 5×4, 1×1)", nums.length === 19 && items.size === 17 && tally(nums) === "90×5 30×4 18×5 5×4 1×1", { numbers: nums.length, items: items.size, tally: tally(nums) });
ok("C5.4 BR-1 pass: the IMM 5707 form line's own two 18s are listed (kind rule, the combination in the key), not only the rule's", imm5707.length === 2 && imm5707.every((n) => n.kind === "rule" && n.value === "18" && n.where === "Forms") && nums.some((n) => n.key === "wp.family/R-01" && n.value === "18"), imm5707.map((n) => n.address));
ok("C5.4 BR-1 pass: the two Venezuelan document lines' 5 years are listed under Documents, keyed by lineage", nums.filter((n) => n.where === "Documents" && n.value === "5" && /^wp\.family\/doc:letter_of_explanation_/.test(n.key)).length === 2);
ok("C5.4 BR-1 fail: 0 in a comparison, yes/no values and answer-list codes are never listed (OR_PASSPORT_EXPIRED's lt 0; eq '01'; eq true)",
  !nums.some((n) => n.value === "0") && !nums.some((n) => n.key.endsWith("/OR_PASSPORT_EXPIRED") || n.key.endsWith("/CR_STATUS_CITIZEN_BUT_RESIDENCE_DIFFERS") || n.key.endsWith("/CR_LANGUAGE_ANSWERS_MATCH")) && !nums.some((n) => n.address.startsWith("person.travelling_alone_to_canada")));
const withDates = publishedNumbers(release);
ok("C5.4 BR-1 pass (founder, P-279): dates count by default: the 8 cut-off and in-force dates join (7 June 2019 ×6, 1 November 2024 ×2), 27 in all; dates: false leaves numbers only",
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
ok("C5.4 BR-5 fail: a different number (13757.5) is a different value; a date stays its ISO text", canonicalValue("13757.5") !== "13757" && sourceProblems([gate], [{ kind: "rule", key: gate.key, address: gate.address, value: "13757.5", none_published: { reason: "ExpatReady's own working figure" } }]).length === 1 && canonicalValue("2019-06-07T00:00:00Z") === "2019-06-07");

// ---------------------------------------------------------------- BR-6, BR-8 refused, naming each, in §5's words
const missing = sourceProblems(nums, []);
const rw90 = nums.find((n) => n.key === "wp.family/RW_PASSPORT_EXPIRY_90")!;
ok("C5.4 BR-6 pass: with every number cited or None published, nothing is refused", sourceProblems(nums, nums.map((n, i) => ({ kind: n.kind, key: n.key, address: n.address, value: Number(n.value), ...(i % 2 ? { cited: cite } : { none_published: { reason: "ExpatReady's warning lead time" } }) }))).length === 0);
ok("C5.4 BR-6 fail: with no entries all 19 are refused, each named, in the concept's exact words",
  missing.length === 19 && missing.every((p) => p.level === "error" && p.state === "missing")
  && missing.some((p) => problemWords(p) === "Form IMM 5707: Age years: at least 18 has no source entry. Add the official source, or mark 'None published – set by ExpatReady'." && p.where === "Forms" && p.key === "wp.family/form:IMM 5707" && p.item === "IMM 5707"),
  missing.filter((p) => p.where === "Forms").map(problemWords));
const changed = sourceProblems([{ ...rw90, value: "60" }], [{ kind: rw90.kind, key: rw90.key, address: rw90.address, value: 90, none_published: { reason: "ExpatReady's warning lead time" } }]);
ok("C5.4 BR-6 fail: an entry written for 90 while the number is now 60 is refused with the \"Changed\" sentence",
  changed.length === 1 && changed[0].state === "changed" && problemWords(changed[0]) === `${rw90.item_words}: the source was written for 90; the number is now 60. Check the source again, or mark 'None published – set by ExpatReady'.`, changed[0]?.message);
ok("C5.4 BR-6 fail: an entry for another combination's key does not source this one (keys carry the combination)", sourceProblems([rw90], [{ kind: rw90.kind, key: "wp.single/RW_PASSPORT_EXPIRY_90", address: rw90.address, value: 90, none_published: { reason: "ExpatReady's warning lead time" } }]).length === 1);

// ---------------------------------------------------------------- BR-4 records that already cite (fee lines, validity)
const fees = publishedNumbers({ combination: { key: "vv.single" } }, { feeLines: FEE_TABLE.lines as FeeLineInput[] });
ok("C5.4 BR-4 pass: every fee-table line's numbers are listed as kind fee and count as sourced (page, URL, quote, date read): none refused",
  fees.length >= 6 && fees.every((n) => n.kind === "fee" && n.sourced_by === "fee_table") && sourceProblems(fees, []).length === 0 && fees.some((n) => n.key === "vv.single/fee:visitor_visa" && n.address === "per_person_cad" && n.value === "100"), tally(fees));
const unsourced = publishedNumbers({ combination: { key: "vv.single" } }, { feeLines: [{ key: "app_fee", label: "Application fee", per_person_cad: 155, source: { page: "IRCC fee list", url: "https://ircc.canada.ca/english/information/fees/fees.asp", quote: "", read: "2026-11-02" } }] });
ok("C5.4 BR-4 fail: a fixture fee line whose source has no quote is refused, named (engine level only: CI refuses it in the table)", sourceProblems(unsourced, []).map(problemWords).join() === "Application fee: Per person (CAD): 155 has no source entry. Add the official source, or mark 'None published – set by ExpatReady'.");
const usable: WalkedSnapshot = { ...small, canonical_fields: [{ id: "case.application_date" }], document_types: [{ key: "police_certificate" }], checks: [{ ...small.checks![0], source_quote: "issued no more than 6 months before", condition: { op: "issued_within_months", months: 6, before: "case.application_date", cite: { page: "Guide 5256", url: "https://www.canada.ca/guide-5256", read: "2026-10-19" } } }] };
const dv = publishedNumbers(usable).find((n) => n.address === "months")!;
ok("C5.4 BR-4 pass: a usable document validity rule's months count through its own cite; the same rule without its cite is refused (m5)", dv.sourced_by === "validity_cite" && sourceProblems([dv], []).length === 0 && sourceProblems(sm.filter((n) => n.address === "months"), []).length === 1);

// Devin on #558: a stale register entry never blocks a number its own record now cites (6 months registered, then the
// rule gains its cite and becomes 12 months); without the cite the same stale entry is still refused as changed.
const twelve: WalkedSnapshot = { ...usable, checks: [{ ...usable.checks![0], source_quote: "issued no more than 12 months before", condition: { ...(usable.checks![0] as { condition: object }).condition, months: 12 } }] } as WalkedSnapshot;
const dv12 = publishedNumbers(twelve).find((n) => n.address === "months")!;
const stale = [{ kind: dv12.kind, key: dv12.key, address: "months", value: "6", cited: { url: "https://www.canada.ca/guide-5256", quote: "issued no more than 6 months before", date: "2026-10-19" } }];
ok("C5.4 BR-4 pass (Devin on #558): a validity rule that cites its own 12 months is not refused by its old 6-month register entry", dv12.value === "12" && dv12.sourced_by === "validity_cite" && sourceProblems([dv12], stale).length === 0, sourceProblems([dv12], stale));
const dv12bare = { ...dv12, sourced_by: undefined };
ok("C5.4 BR-6 fail (Devin on #558): without its own cite, the same stale 6-month entry still refuses the 12 as changed", sourceProblems([dv12bare], stale).length === 1 && sourceProblems([dv12bare], stale)[0].state === "changed");

// Review on #558 (MJ-1 and the surviving mutants): numeric text on an ordering operator, a number under "not", a number
// compared with eq, and k counting every leaf of the same field and operator (0s included).
const edge: WalkedSnapshot = { combination: { key: "t.edge" }, rules: [
  { id: "R-T1", when: { op: "gte", field: "person.age_years", value: "18" }, then: "Text eighteen", for_whom: "principal" },
  { id: "R-T2", when: { op: "not", arg: { op: "lt", field: "case.trip_days", value: 7 } }, then: "Not under seven", for_whom: "case" },
  { id: "R-T3", when: { op: "eq", field: "case.children", value: 3 }, then: "Three children", for_whom: "case" },
  { id: "R-T4", when: { op: "and", args: [{ op: "gte", field: "case.funds_cad", value: 0 }, { op: "gte", field: "case.funds_cad", value: 5000 }] }, then: "Funds", for_whom: "case" },
  { id: "R-T5", when: { op: "eq", field: "person.status", value: "18" }, then: "An answer code", for_whom: "principal" },
] } as unknown as WalkedSnapshot;
const en = publishedNumbers(edge);
const at = (key: string) => en.filter((n) => n.key === `t.edge/${key}`);
ok("C5.4 BR-1 fail (review MJ-1 on #558): \"18\" stored as text on gte is a published number, refused without a source", at("R-T1").length === 1 && at("R-T1")[0].value === "18" && sourceProblems(at("R-T1"), []).length === 1, en.map((n) => `${n.key} ${n.address} ${n.value}`));
ok("C5.4 BR-1 pass (review on #558): text on eq is an answer code, never a number", at("R-T5").length === 0);
ok("C5.4 BR-1 fail (review on #558): a number under \"not\" is walked", at("R-T2").length === 1 && at("R-T2")[0].value === "7");
ok("C5.4 BR-1 fail (review on #558): a number compared with eq counts", at("R-T3").length === 1 && at("R-T3")[0].address === "case.children|eq|1");
ok("C5.4 BR-2 fail (review on #558): k counts every leaf of the same field and operator, 0 included, so the 5000 is the second", at("R-T4").length === 1 && at("R-T4")[0].address === "case.funds_cad|gte|2", at("R-T4").map((n) => n.address));

// ---------------------------------------------------------------- PR 2a: Sample entries, validity digits, frozen sources
// Tech lead's condition on Decision 1 (#558) and the reviewer's MJ-1 on #569: a Sample entry (no citation, not None
// published) passes only in the demo workspace; anywhere else it is refused, said as Sample.
const sampleEntry: SourceEntry = { kind: rw90.kind, key: rw90.key, address: rw90.address, value: "90", sample: true };
ok("C5.4 Decision 1 pass: a number whose entry is Sample passes in the demo workspace", sourceProblems([rw90], [sampleEntry], { demo: true }).length === 0 && numberState(rw90, sampleEntry, true).state === "sample");
const outside = sourceProblems([rw90], [sampleEntry]);
ok("C5.4 Decision 1 fail: the same Sample entry outside the demo workspace is refused, named, in words that say Sample",
  outside.length === 1 && outside[0].state === "sample" && problemWords(outside[0]) === `${rw90.item_words}: Passport days until expiry: at most 90 has only a Sample source, which passes only in the demo workspace as a Demo release. Add the official source, or mark 'None published – set by ExpatReady'.`, outside.map(problemWords));
ok("C5.4 Decision 1 fail: a number with no entry is refused in the demo workspace too", sourceProblems([rw90], [], { demo: true }).length === 1);
ok("C5.4 BR-3 fail: \"None published\" with a reason under 10 characters is no answer", sourceProblems([rw90], [{ ...sampleEntry, sample: false, none_published: { reason: "short" } }]).length === 1);
const quoteSix = { ...usable, checks: [{ ...usable.checks![0], source_quote: "issued no more than six months before" }] } as WalkedSnapshot;
ok("C5.4 decision 4 fail (#558, build note 10): a usable validity rule whose quote says its months in words, not digits, is listed as needing a source",
  publishedNumbers(quoteSix).find((n) => n.address === "months")!.sourced_by === undefined && sourceProblems(publishedNumbers(quoteSix).filter((n) => n.address === "months"), []).length === 1);
ok("C5.4 M4 pass: statesInDigits finds 18 in \"aged 18 years\" and 1 November 2024 written \"November 1, 2024\"", statesInDigits("aged 18 years or older", "18") && statesInDigits("submitted on or after November 1, 2024", "2024-11-01") && statesInDigits("from 1 November 2024", "2024-11-01") && statesInDigits("5 years past", "5"));
ok("C5.4 M4 fail: statesInDigits does not find 18 in 180, 5 in 5487 or 5.5, one in \"one year\", or 7 June 2019 in a quote without it", !statesInDigits("within 180 days", "18") && !statesInDigits("guide 5487", "5") && !statesInDigits("5.5 years", "5") && !statesInDigits("at least one year", "1") && !statesInDigits("If your passport is expired", "2019-06-07"));
const frozen = frozenSources([rw90], [sampleEntry, { kind: "rule", key: "wp.family/R-99", address: "x|gte|1", value: 3, none_published: { reason: "No longer used anywhere" } }]);
ok("C5.4 BR-9 pass: only entries answering a published number are frozen, in one canonical shape, read back the same",
  frozen.length === 1 && frozen[0].sample === true && frozen[0].value === "90" && !("version" in frozen[0]) && sourceProblems([rw90], frozen.map(entryOf), { demo: true }).length === 0, frozen);

const withSrc = (sources: ReturnType<typeof frozenSources>) => ({ ...release, sources });
const reordered = frozen.map((f) => Object.fromEntries(Object.entries(f).reverse())) as typeof frozen;
ok("C5.4 BR-9 pass: the same sources read back with their keys reordered (jsonb) are no change; none on either side, none listed", sourceChanges(withSrc(frozen), withSrc(reordered)).length === 0 && sourceChanges(release, release).length === 0);
const one = sourceChanges(withSrc([]), withSrc(frozenSources([rw90], [{ kind: rw90.kind, key: rw90.key, address: rw90.address, value: 90, none_published: { reason: "ExpatReady's warning lead time" } }])));
ok("C5.4 BR-9 fail: one entry added is one Source change, for the expert, in words (item, number, answer)", one.length === 1 && one[0].kind === "Source" && one[0].change === "added" && one[0].needs_sme && one[0].label.endsWith("Passport days until expiry: at most 90: None published – set by ExpatReady"), one);
ok("C5.4 m7 pass: the sample load's entries carry the sample loader's id, the same as api/src/lifecycle.ts SAMPLE_CREATOR", new RegExp(`SAMPLE_CREATOR = "${SAMPLE_LOADER}"`).test(readFileSync(join(STUDIO, "api", "src", "lifecycle.ts"), "utf8")));

const r37 = publishedNumbers(release).find((n) => n.key === "wp.family/R-37")!;
ok("C5.4 m6 pass (QA-82): an item whose own words name a field code reads its short name instead (R-37's \"then\")", !!r37 && !/person\.[a-z_]/.test(r37.item_words) && /Venezuelan extended passport expiry/.test(r37.item_words), r37?.item_words);

// Devin on #587: a citation's words state this number (digits, or words from one to ninety-nine), never another.
ok("C5.4 BR-3 pass (Devin on #587): digits, English words and IRCC's date forms state the number", statesValue("at least 18 years of age", "18") && statesValue("valid for five years", "5") && statesValue("within ninety days", "90") && statesValue("Twenty-one days", "21") && statesValue("on or after November 1, 2024", "2024-11-01"));
ok("C5.4 BR-3 fail (Devin on #587): words for another number never state this one (21 for 18; 180 for 18; \"fifty\" for 5)", !statesValue("Applicants must be at least 21 years old", "18") && !statesValue("within 180 days", "18") && !statesValue("fifty days", "5") && !statesValue("", "18")
  // Devin on #587 (second round): never part of a bigger written number
  && !statesValue("within twenty-one days", "20") && !statesValue("within twenty one days", "20") && !statesValue("five hundred dollars", "5") && !statesValue("twenty-five years", "5") && !statesValue("one hundred and five days", "5") && statesValue("within twenty days, or five years", "5") && statesValue("within twenty days", "20")
  // Devin on #587 (third round): a range's bounds are both stated; "and" joins a compound only after hundred
  && statesValue("between two and five years", "5") && statesValue("between two and five years", "2") && !statesValue("one hundred and five days", "5"));

// ---------------------------------------------------------------- M1 kept outside validate(), pure
const src = readFileSync(join(STUDIO, "engine", "source-register.ts"), "utf8");
ok("C5.4 M1 pass: source-register.ts reads no file or database and only takes validate.ts's Problem type", !/node:fs|@prisma|fetch\(/.test(src) && !/^import \{[^}]*\} from "\.\/validate\.ts"/m.test(src) && /^import type \{ Change, Problem \} from "\.\/validate\.ts"/m.test(src));
const validateSrc = readFileSync(join(STUDIO, "engine", "validate.ts"), "utf8");
ok("C5.4 M1 fail: validate.ts does not call the source gate (a released snapshot is never re-judged); it takes only the Source change lines (BR-9)", !/sourceProblems|publishedNumbers|numberState/.test(validateSrc) && /^import \{ sourceChanges \} from "\.\/source-register\.ts";/m.test(validateSrc));

process.exit(summary() ? 1 : 0);
