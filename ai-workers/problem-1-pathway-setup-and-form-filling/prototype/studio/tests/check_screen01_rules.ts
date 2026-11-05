// Screen 01 pure rules (no database, no browser, no AI): name comparison (BR-6), the startable check and status (BR-8),
// counts (BR-10), freshness (BR-11), the one next action (BR-13) and the status view (P-49: Needs work / Live, status
// sort, "Live" wording), with a passing and a failing case each and
// property checks on name comparison. Uses a real released snapshot for the "everything present" case.
//   tsx studio/tests/check_screen01_rules.ts
import fc from "fast-check";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CreateCombinationBody, CreateNodeBody, labelProblem, normalizeLabel, problemFromZod, sharedStep } from "../contracts/programs.ts";
import { checkedOf, compareEditions, compareStatus, editionMonth, isLive, missingItems, needsWork, newestEdition, nextActionOf, rowCounts, setupActionOf, statusOf, STATUS_TEXT, type SetupState } from "../engine/programs.ts";
import { validate } from "../engine/validate.ts";
import { CatalogueQuery } from "../contracts/programs.ts";
import type { Snapshot } from "../engine/snapshot.ts";

let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 180)}` : ""}`); };

// ---------------------------------------------------------------- BR-6 names
ok("BR-6 pass: case, spaces and punctuation are ignored", normalizeLabel("  Open  WORK-permit ") === normalizeLabel("open work permit"));
ok("BR-6 fail: a different name stays different", normalizeLabel("Open work permit") !== normalizeLabel("Open work permits"));
ok("BR-6: no fuzzy matching (one letter apart is a different name)", normalizeLabel("Visitor visa") !== normalizeLabel("Visiter visa"));
fc.assert(fc.property(fc.string(), (s) => normalizeLabel(normalizeLabel(s)) === normalizeLabel(s)), { numRuns: 500 });
fc.assert(fc.property(fc.string(), fc.constantFrom(" ", "  ", "-", "/", ".", "\t"), (s, junk) => normalizeLabel(`${junk}${s.toUpperCase()}${junk}`) === normalizeLabel(s.toLowerCase()) || /[İıſK]/u.test(s)), { numRuns: 500 });
ok("BR-6 property: comparing is idempotent and blind to case and spacing (1,000 random names)", true);
ok("contract: an empty name is refused before it reaches the database", !CreateNodeBody.safeParse({ kind: "PROGRAM", parentKey: "individual", label: "   " }).success);
ok("contract: a name is trimmed and its spaces collapsed", CreateNodeBody.parse({ kind: "STREAM", parentKey: "p", label: "  Study   permit " }).label === "Study permit");
ok("contract: only program, category or sub-category can be added (never a pathway)", !CreateNodeBody.safeParse({ kind: "PATHWAY", parentKey: "x", label: "Other" }).success);
ok("contract: a combination needs at least one allowed location when locations are given", !CreateCombinationBody.safeParse({ nodeKey: "x", allowedLocations: [] }).success);

// ---------------------------------------------------------------- BR-8 startable check and status
// A real released row snapshot: the reviewed work-permit release as the studio stores it (exported from an isolated
// database after Load sample inputs; tests/fixtures/screen01-work-permit-release.json).
const c1 = JSON.parse(readFileSync(join(import.meta.dirname, "fixtures", "screen01-work-permit-release.json"), "utf8"));
const people = [{ role: "principal", label: "Principal applicant", min: 1, max: 1 }, { role: "spouse_or_partner", label: "Spouse or partner", min: 0, max: 1 }, { role: "child", label: "Child", min: 0, max: 4, applies: false }, { role: "representative", label: "Representative", min: 0, max: 1 }];
const full = { ...c1, forms: c1.forms, field_maps: c1.field_maps, sections: c1.sections, placements: c1.placements, document_requirements: c1.document_requirements } as Snapshot;
const empty = { ...full, forms: [], field_maps: [], sections: [], placements: [], document_requirements: [], rules: [] } as Snapshot;
let m = missingItems(full, people, []);
ok("BR-8 pass: the reviewed work-permit release passes the startable check", m.length === 0, m);
ok("BR-8: a released row that passes is Ready", statusOf(true, m) === "READY");
m = missingItems(empty, people, []);
ok("BR-8 fail: no forms is missing", m.some((x) => x.code === "no_forms"), m.map((x) => x.text));
ok("F2: no questions is one line naming every role that files, with its next step", m.filter((x) => x.code === "role_without_questions").length === 1 && m.some((x) => x.text === "No questions yet for Principal applicant, Spouse or partner. Next step: Add questions (Configuration › Questions and sections)."), m.map((x) => x.text));
// B78 (P-294, Lead 13): BR-8 reads the one list Preview and a case show. A fact a form reads is asked though its section is
// not chosen; a person with no questions at all is still refused, with the same code.
const noQuestionsLine = (x: Snapshot) => missingItems(x, people, []).some((i) => i.code === "role_without_questions");
ok("B78 pass: a person's question a form reads, its section not chosen, is a question: no \"No questions yet\"", !noQuestionsLine({ ...full, sections: [] } as Snapshot));
// The real release, its forms filed and read for the Principal only, with no rule, document line or form condition asking the Spouse anything.
const onlyPrincipalForms = { ...full, sections: [], rules: [], document_requirements: [], forms: full.forms.map((f: object) => ({ ...f, who: "principal_applicant", condition: null })), field_maps: (full.field_maps as { entries: { person?: string | null }[] }[]).map((m) => ({ ...m, entries: m.entries.filter((e) => e.person !== "subject_spouse_or_partner") })) } as unknown as Snapshot;
ok("B78 fail (m18, every role): a Principal-and-Spouse release whose forms read only the Principal stays Not ready, naming the Spouse alone", missingItems(onlyPrincipalForms, people, []).some((i) => i.code === "role_without_questions" && /^No questions yet for Spouse or partner\./.test(i.text)), missingItems(onlyPrincipalForms, people, []).map((i) => i.text));
ok("B78 pass (m18): the same release with each applicant's forms names no role", !noQuestionsLine({ ...full, sections: [] } as Snapshot));
ok("B78 fail: a person with no questions at all (nothing placed) is refused with role_without_questions", noQuestionsLine({ ...full, sections: [], placements: [] } as Snapshot));
ok("B78 fail: questions about the application only (a chosen section, no form reading a person's fact) are no question for a person", noQuestionsLine({ ...full, field_maps: [], sections: [{ id: "about_it" }], placements: [{ section_id: "about_it", repeats: "once_per_case", fact: "case.school_name" }] } as unknown as Snapshot));
ok("F2: every missing item says what to do next", m.length > 0 && m.every((x) => /Next step: /.test(x.text)), m.map((x) => x.text));
ok("BR-8: a released row that fails is Not ready, never Ready", statusOf(true, m) === "NOT_READY");
ok("BR-8: a row never released is In setup, whatever it holds", statusOf(false, []) === "IN_SETUP" && statusOf(false, m) === "IN_SETUP");
const noMap = { ...full, field_maps: full.field_maps.filter((x: any) => x.form_number !== "IMM 1295") } as Snapshot;
m = missingItems(noMap, people, []);
ok("BR-8 fail: a form without a current edition with mapped form fields is missing", m.some((x) => x.code === "form_without_edition" && /IMM 1295/.test(x.text)), m.map((x) => x.text));
m = missingItems(full, people, [{ level: "error", where: "Rules", item: "R-01", message: "reads person.x, which is not in the library" }, { level: "warning", where: "Forms", item: "-", message: "w" }]);
ok("BR-8 fail: a rule that does not resolve is missing (warnings are not)", m.length === 1 && m[0].code === "rule_problem", m.map((x) => x.text));
ok("BR-8: checklists (document kind) need no field map", missingItems({ ...full, forms: [...full.forms, { form_number: "IMM 9999", form_kind: "document" }] } as Snapshot, people, []).length === 0);

// ---------------------------------------------------------------- BR-10 counts
const k = rowCounts(full, people);
const selected = new Set(full.sections.map((x: any) => x.id));
const asked = full.placements.filter((p: any) => selected.has(p.section_id) && !p.rule_only);
const once = asked.filter((p: any) => p.repeats === "once_per_case" || p.fact.startsWith("case.")).length;
ok("BR-10 pass: questions = per-person questions × roles that file + questions asked once", k.questions === (asked.length - once) * 2 + once, { k, asked: asked.length, once });
ok("BR-10: documents split into always and only-if, adding up", k.documents === k.documentsAlways + k.documentsIf && k.documents === full.document_requirements.length, k);
ok("BR-10 fail: a role that does not file (child on others' forms) and the representative are not counted", rowCounts(full, people.slice(0, 1)).questions === (asked.length - once) + once);

// ---------------------------------------------------------------- BR-11 freshness
const now = new Date("2026-10-21T00:00:00Z");
let ck = checkedOf([new Date("2026-10-19T12:00:00Z"), new Date("2026-03-01T00:00:00Z")], now);
ok("BR-11 pass: the oldest source date counts; next review 12 months later", ck?.at.startsWith("2026-03-01") === true && ck?.nextReview.startsWith("2027-03-01") === true && !ck!.overdue, ck);
ck = checkedOf([new Date("2025-09-01T00:00:00Z")], now);
ok("BR-11 fail: past the next review date it is overdue", ck?.overdue === true, ck);
ok("BR-11: no sources means not checked", checkedOf([], now) === null);

// ---------------------------------------------------------------- BR-13 one next action
const base = { exists: true, status: "IN_SETUP" as const, forms: 1, sources: 0, draftable: 0, fromLibrary: [] as string[], running: null as string | null, proposals: [] as { job: string }[], changes: 0, missing: [] as any[] };
ok("BR-13: not started → Start setup", nextActionOf({ ...base, exists: false })?.kind === "start");
ok("BR-13: AI running → View AI progress (nothing else)", nextActionOf({ ...base, running: "b1", draftable: 2 })?.kind === "view_progress");
ok("BR-13: proposals waiting → Review AI proposals", nextActionOf({ ...base, proposals: [{ job: "j" }], draftable: 1 })?.kind === "review_proposals");
ok("BR-13: forms already mapped in the library → add them, no AI", nextActionOf({ ...base, fromLibrary: ["IMM 5707"], draftable: 1 })?.kind === "add_from_library");
ok("BR-13 pass: an approved form to draft → Draft setup with AI (the row's one AI place)", nextActionOf({ ...base, draftable: 1 })?.kind === "draft_ai");
ok("BR-13 fail: nothing to draft → no AI action offered", nextActionOf({ ...base, forms: 0 })?.kind === "add_forms");
ok("BR-13: released and missing items → See what is missing", nextActionOf({ ...base, status: "NOT_READY", missing: [{ code: "no_forms", step: "Add sources", text: "x" }] })?.kind === "see_missing");
ok("BR-13: unreleased changes and nothing missing → Review and release", nextActionOf({ ...base, changes: 3 })?.kind === "release");
ok("BR-13: Ready and nothing changed → no action", nextActionOf({ ...base, status: "READY" }) === null);

ok("P-32: a new edition held for impact review → See new edition (before Review and release)", nextActionOf({ ...base, status: "READY", held: 1, changes: 2 })?.kind === "see_new_edition");
ok("P-32: setup steps still come first on a row in setup", nextActionOf({ ...base, held: 1, draftable: 1 })?.kind === "draft_ai");

// ---------------------------------------------------------------- Lead check item 1: one next step on the page
// The page's missing list, the page header and the Programs row read the same setup state, so the first missing line
// names the row's next step in its words, whenever a setup step is waiting (property over every setup state).
const setupOf = (o: Partial<SetupState>): SetupState => ({ exists: true, forms: 0, sources: 0, draftable: 0, fromLibrary: [], running: null, proposals: [], ...o });
const visitor = setupOf({ forms: 2, sources: 2, draftable: 0, fromLibrary: ["IMM 5707"] });
m = missingItems(empty, people, [], visitor);
const head = nextActionOf({ ...visitor, status: "IN_SETUP", changes: 0, missing: m });
ok("item 1 pass: Visitor visa — header \"Add 1 form from the library\" = first missing line's step; sources and set-up forms counted apart",
  head?.label === "Add 1 form from the library" && m[0].step === head.label && m[0].text === "2 forms attached as sources, 0 set up." && m.every((x) => x.step === head.label), m.map((x) => x.text));
ok("item 1 fail: the old contradiction (\"No forms yet … Add sources\" while forms are attached) is gone", !m.some((x) => /No forms yet|Add sources|Find forms/.test(x.text)), m.map((x) => x.text));
m = missingItems(empty, people, [], setupOf({}));
ok("item 1 / S3 fix 2: nothing attached → \"No forms yet\" and Find forms (the finder offer), the same as the header", m[0].text === "No forms yet." && sharedStep(m) === "Find forms" && nextActionOf({ ...setupOf({}), status: "IN_SETUP", changes: 0, missing: m })?.label === m[0].step, m.map((x) => x.text));
fc.assert(fc.property(fc.nat(4), fc.nat(3), fc.nat(3), fc.boolean(), fc.nat(5), fc.boolean(), (sources, lib, draftable, running, proposals, released) => {
  const st = setupOf({ forms: sources, sources, draftable, fromLibrary: Array.from({ length: lib }, (_, i) => `IMM ${i}`), running: running ? "b" : null, proposals: proposals ? [{ job: "j", n: proposals }] : [] });
  const miss = missingItems(empty, people, [], st);
  const status = statusOf(released, miss);
  const a = nextActionOf({ ...st, status, changes: 0, missing: miss });
  const pending = setupActionOf(st);
  // A waiting setup step is the header and every setup line's step; otherwise the header points at the list.
  // The step is said once: shared by every line → no line repeats it; otherwise each line says its own.
  const once = sharedStep(miss) ? miss.every((x) => !/Next step/.test(x.text)) : miss.every((x) => x.text.endsWith(".") && (miss.length === 1 || /Next step: /.test(x.text)));
  return once && (pending ? a?.label === pending.label && miss[0].step === a.label : a?.kind === "see_missing" && miss.every((x) => x.step && /Next step: /.test(x.text)));
}), { numRuns: 400 });
ok("item 1 property: header step = first missing line's step on every setup state, else See N missing (400 runs)", true);

// ---------------------------------------------------------------- Lead note 23 Oct: the next step is said once
m = missingItems(empty, people, [], visitor);
ok("step once pass: every line shares the step → the lines carry only causes and the step is named once (sharedStep)", m.length > 1 && sharedStep(m) === "Add 1 form from the library" && m.every((x) => !/Next step/.test(x.text)), m.map((x) => x.text));
m = missingItems(empty, people, []);
ok("step once fail: lines with different steps each keep their own (nothing is merged away)", sharedStep(m) === null && m.length === 2 && m.every((x) => /Next step: /.test(x.text)) && new Set(m.map((x) => x.step)).size === 2, m.map((x) => x.text));
ok("step once: a single line keeps its step in the sentence (nothing to repeat)", sharedStep([{ step: "Find forms" }]) === null && missingItems({ ...empty, sections: full.sections, placements: full.placements } as Snapshot, people, [], setupOf({})).every((x) => /Next step: Find forms\./.test(x.text)));

// ---------------------------------------------------------------- round 3: invisible characters never make a twin
ok("round 3 fail: a name with an invisible character is the same name (no look-alike twin)", normalizeLabel("Super\u2060 visa") === normalizeLabel("Super visa") && normalizeLabel("Super\u3164visa") === normalizeLabel("Supervisa") && CreateNodeBody.parse({ kind: "PROGRAM", parentKey: "individual", label: "Super\u200d visa" }).label === "Super visa");
ok("round 3 pass: visible letters of any script still count", normalizeLabel("किसान") !== normalizeLabel("कसन") && normalizeLabel("İstanbul") !== "");

// ---------------------------------------------------------------- round 2: filing problems are their own missing line
{
  const withOnline = { ...full, forms: full.forms.map((f: any, i: number) => (i === 0 ? { ...f, channel: "ONLINE" } : f)) } as Snapshot;
  const probs = [{ level: "error" as const, where: "Forms", item: (full.forms[0] as any).form_number, message: "is filed Online, but this combination has no portal yet: choose the portal it is filed through." }];
  const mm = missingItems(withOnline, people, probs);
  ok("round 2 pass: an Online line's problem is one \"cannot be filed as set\" line with its own step", mm.length === 1 && mm[0].code === "filing_problem" && mm[0].step === "Change how it is filed", mm.map((x) => x.text));
  ok("round 2 fail: it is not reported as unmapped PDF form fields or as a rule that does not resolve", !mm.some((x) => x.code === "form_without_edition" || x.code === "rule_problem"));
}

// ---------------------------------------------------------------- QA-6, QA-7 the name rules, one place for server and page
ok("QA-6 fail: a name of symbols only is refused in plain words (it has nothing to compare or key)", !CreateNodeBody.safeParse({ kind: "PROGRAM", parentKey: "individual", label: "!!!" }).success && labelProblem("!!!") === "Use letters or digits in the name, not only punctuation.");
ok("QA-6 pass: letters in any script, digits and punctuation around them are kept", ["Résidence temporaire", "Visa d'été — 日本語", "H-1B", "2027"].every((x) => labelProblem(x) === null && CreateNodeBody.safeParse({ kind: "PROGRAM", parentKey: "individual", label: x }).success));
const longName = CreateNodeBody.safeParse({ kind: "PROGRAM", parentKey: "individual", label: "A".repeat(60) + " " + "B".repeat(70) });
ok("QA-7: a name over 120 characters is refused on its level's field with the message the page shows", !longName.success && problemFromZod(longName.error).errors?.[0]?.field === "label" && problemFromZod(longName.error).errors?.[0]?.message === "Keep the name under 120 characters." && labelProblem("A".repeat(121)) === "Keep the name under 120 characters.");
ok("QA-7 pass: exactly 120 characters is accepted", labelProblem("A".repeat(120)) === null);
ok("break m2 pass: names that differ only in vowel signs (Hindi, Thai) are different names", normalizeLabel("किसान वीज़ा") !== normalizeLabel("कसान वज़ा") && normalizeLabel("วีซ่า") !== normalizeLabel("วซา"));
ok("break m2 fail: a name of combining marks only is refused; direction controls are removed before storing", labelProblem("\u0301\u0301") !== null && CreateNodeBody.parse({ kind: "PROGRAM", parentKey: "individual", label: "BR \u202Easiv" }).label === "BR asiv");

// ---------------------------------------------------------------- Lead check item 3: only this combination's warnings
const lib = [{ key: "person.x", valueType: "text" }];
const derivedRows = [{ id: "person.unused_calc", calculation: "other" }, { id: "person.used_calc", calculation: "other" }];
const bare = { ...empty, checks: [], derived_fields: [{ id: "person.unused_calc", calculation: "other", inputs: [] }, { id: "person.used_calc", calculation: "other", inputs: [] }] } as Snapshot;
ok("item 3 pass: a combination with no setup has no warnings (no library-wide derived warnings, no duplicate of the missing list)", validate(bare, lib, derivedRows).length === 0, validate(bare, lib, derivedRows));
const reading = { ...bare, rules: [{ id: "R-1", when: { field: "person.used_calc", op: "eq", value: true } }] } as Snapshot;
const w = validate(reading, lib, derivedRows).filter((p) => p.where === "Derived fields");
ok("item 3 fail: a derived definition this combination reads still warns, and only that one", w.length === 1 && w[0].item === "person.used_calc", w);

// ---------------------------------------------------------------- P-49 status view (Live as founder finding F1)
const act = { kind: "release" as const, label: "Review and release" };
ok("P-49 pass: released, startable, nothing to do → Live, not Needs work", isLive({ status: "READY" }) && !needsWork({ status: "READY", nextAction: null }));
ok("F1: Live with a next step (draft changes, held edition, AI proposals) → in both Live and Needs work", isLive({ status: "READY" }) && needsWork({ status: "READY", nextAction: act }));
ok("F1 fail: In setup or Not ready is never Live, always Needs work", !isLive({ status: "IN_SETUP" }) && !isLive({ status: "NOT_READY" }) && needsWork({ status: "IN_SETUP", nextAction: null }) && needsWork({ status: "NOT_READY", nextAction: null }));
fc.assert(fc.property(fc.constantFrom("IN_SETUP", "NOT_READY", "READY"), fc.boolean(), (status, hasStep) => { const r = { status: status as any, nextAction: hasStep ? act : null }; return isLive(r) === (status === "READY") && (needsWork(r) || isLive(r)) && needsWork(r) === (status !== "READY" || hasStep); }), { numRuns: 300 });
ok("F1: Live is exactly the rows showing Live; every row is Live or Needs work (property, 300 runs)", true);
ok("P-49, P-180, UX-A part 3: \"Ready\" is shown as \"Live\", In setup as \"In progress\"", STATUS_TEXT.READY === "Live" && STATUS_TEXT.IN_SETUP === "In progress" && STATUS_TEXT.NOT_READY === "Not ready");
const sorted = (["READY", "IN_SETUP", "NOT_READY", "READY"] as const).map((status) => ({ status })).sort(compareStatus).map((x) => x.status);
ok("P-49 pass: status sort is Not ready, In setup, Live", sorted.join() === "NOT_READY,IN_SETUP,READY,READY", sorted);
ok("P-49 fail: an unknown sort or filter is refused by the contract", !CatalogueQuery.safeParse({ sort: "name" }).success && !CatalogueQuery.safeParse({ filter: "ready_soon" }).success && CatalogueQuery.safeParse({ filter: "live", sort: "-status" }).success);
// ---------------------------------------------------------------- edition order (review #5)
ok("#5 pass: editions are ordered by the printed month and year, not as text", compareEditions({ editionLabel: "IMM 5476 (12-2021)" }, { editionLabel: "IMM 5476 (11-2025)" }) < 0 && "IMM 5476 (12-2021)".localeCompare("IMM 5476 (11-2025)") > 0);
ok("#5: the newest of several editions is the latest printed date", newestEdition([{ editionLabel: "IMM 5257 (09-2023)" }, { editionLabel: "IMM 5257 (12-2019)" }, { editionLabel: "IMM 5257 (06-2024)" }])?.editionLabel === "IMM 5257 (06-2024)");
ok("#5 fail: a label without a readable date sorts oldest", editionMonth("IMM 5257") === -1 && newestEdition([{ editionLabel: "IMM 5257" }, { editionLabel: "IMM 5257 (01-2001)" }])?.editionLabel === "IMM 5257 (01-2001)");
ok("#5: the same printed month is broken by the published date", compareEditions({ editionLabel: "X (05-2021)", published: "2021-05-02" }, { editionLabel: "X (05-2021)", published: "2021-06-30" }) < 0);
ok("m4: a search longer than 120 characters is cut, never refused", CatalogueQuery.parse({ q: "a".repeat(130) }).q.length === 120);
ok("BR-11: a date that does not parse is ignored, not a crash (hand-fetched manifest note)", checkedOf([new Date("2026-10-21T12:32:12Z (by hand)"), new Date("2026-10-19T00:00:00Z")], new Date("2026-10-21"))?.at.slice(0, 10) === "2026-10-19" && checkedOf([new Date("nonsense")], new Date()) === null);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
