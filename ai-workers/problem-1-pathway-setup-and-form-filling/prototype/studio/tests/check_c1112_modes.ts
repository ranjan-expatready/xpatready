// C11.12 filing modes, PR 1 (P-135, P-233; concept r2 BR-1…BR-8): the rules a save of "Who can be in this application"
// must pass, the words and warnings, the release check and the "What a case gets" plan. Each rule has a passing and a
// failing case. Pure: no database, no server, no model call (US$0). Modes and fees are Sample until the immigration
// expert confirms.
//   tsx studio/tests/check_c1112_modes.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { checkPeople } from "../engine/people.ts";
import { FILING_NOT_SET_BLOCKS, releaseModes, filingNotSet, filingOf, filingPlan, filingProblems, filingWarnings, filingWords, modeSent, previewFilings } from "../engine/filing-modes.ts";
import { missingItems } from "../engine/programs.ts";
import { defaultModeOf, deriveFilings, eachFilesOwnOf, FEE_TABLE, hasFeeRules } from "../engine/runtime/filings.ts";
import { PeopleLine, type LineMode } from "../contracts/workspace.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const roles = JSON.parse(readFileSync(join(import.meta.dirname, "..", "samples", "person-roles.json"), "utf8")).roles
  .map((r: { key: string; label: string; takesPartInCase: boolean; mayBeApplicant: boolean }) => ({ ...r, retired: false }));
type In = { role: string; min: number; max: number; applies: boolean; filingMode?: unknown; filing?: unknown; label?: string; preview?: number };
const P: In = { role: "principal", min: 1, max: 1, applies: true, filingMode: "files_own" };
const run = (list: In[], strict = true) => checkPeople(list as never, roles, strict);
const first = (list: In[], strict = true) => run(list, strict).errors[0]?.message ?? "";
const line = (list: In[], role: string, strict = true) => run(list, strict).lines.find((l) => l.role === role);

// BR-1 one filing mode per family role, from the three choices
ok("C11.12 BR-1 pass: principal, spouse and child Files own save", run([P, { role: "spouse_or_partner", min: 0, max: 1, applies: true, filingMode: "files_own" }, { role: "child", min: 0, max: 4, applies: true, filingMode: "files_own" }]).errors.length === 0);
ok("C11.12 BR-1 fail: an unknown mode is refused in words", /choose Files own application, On the principal's application or Declared only/.test(first([P, { role: "child", min: 0, max: 4, applies: true, filingMode: "sometimes" }])));
ok("C11.12 BR-1 fail: the API contract refuses an unknown mode with the same words", (() => { const r = PeopleLine.safeParse({ role: "child", min: 0, max: 1, applies: true, filingMode: "sometimes" }); return !r.success && /Files own application/.test(r.error.issues[0].message); })());
ok("C11.12 BR-1 pass: the acceptance pack's names are read as the line modes", modeSent({ filing: "on_principal_applying" }) === "on_principal" && modeSent({ filing: "own_application" }) === "files_own" && modeSent({ filingMode: "declared_only", filing: "own_application" }) === "declared_only");

// BR-2 the principal files their own
ok("C11.12 BR-2 pass: the principal with no mode or Files own saves", run([{ ...P, filingMode: undefined }]).errors.length === 0 && run([P]).errors.length === 0);
ok("C11.12 BR-2 fail: the principal On the principal's is refused", /principal applicant always files their own/.test(first([{ ...P, filingMode: "on_principal" }])));
ok("C11.12 BR-2 fail: the principal Declared only is refused", /principal applicant always files their own/.test(first([{ ...P, filingMode: "declared_only" }])));

// BR-3 not family: no applicant mode (strict refuses; stored lines and older callers drop it, challenge B1)
const rep = (m?: string): In => ({ role: "representative", min: 0, max: 1, applies: false, filingMode: m });
ok("C11.12 BR-3 fail: the editor's save of a Representative with Declared only is refused in words", first([P, rep("declared_only")]) === "Representative takes part in the case but files no application.");
ok("C11.12 BR-3 pass: the sample loader's Representative with Files own is kept, its mode dropped", run([P, rep("files_own")], false).errors.length === 0 && line([P, rep("files_own")], "representative", false)?.filingMode === undefined);
ok("C11.12 BR-3 pass: a Representative with no mode saves and files nothing", run([P, rep()]).errors.length === 0 && filingWords({ role: "representative", applies: false }, false, true, "Visitor visa").filingWords === "Files nothing");

// BR-4 co-filing: only a never-applicant role, one line, 1 to 1
const sponsor = (min = 1, max = 1, m = "co_files"): In => ({ role: "sponsor", min, max, applies: false, filingMode: m });
ok("C11.12 BR-4 pass: Sponsor 1 to 1 co-files", run([P, sponsor()]).errors.length === 0 && line([P, sponsor()], "sponsor")?.filingMode === "co_files" && line([P, sponsor()], "sponsor")?.applies === false);
ok("C11.12 BR-4 fail: Sponsor 0 to 2 co-files is refused in words", first([P, sponsor(0, 2)]) === "One sponsor co-files: set how many to 1 to 1.");
ok("C11.12 BR-4 fail: a role that may be an applicant cannot co-file", /Only a person who is never an applicant/.test(first([P, { role: "child", min: 0, max: 1, applies: false, filingMode: "co_files" }])));
ok("C11.12 BR-4 pass: a Sponsor with no mode files nothing (one filing: C11.12.test.ts:66–72)", previewFilings([{ ...P, preview: 1 }, { role: "sponsor", min: 1, max: 1, applies: false }] as never, "Spouse sponsorship", false).filings.length === 1);

// BR-5 the mode decides "applicant"
ok("C11.12 BR-5 pass: Files own and On the principal's are applicants; Declared only is not", line([P, { role: "child", min: 0, max: 1, applies: false, filingMode: "on_principal" }], "child", false)?.applies === true && line([P, { role: "child", min: 0, max: 1, applies: false, filingMode: "declared_only" }], "child")?.applies === false);
ok("C11.12 BR-5 fail: applicant ticked with Declared only is refused in words", first([P, { role: "child", min: 0, max: 1, applies: true, filingMode: "declared_only" }]) === "Declared only means not accompanying: choose another filing or untick applicant.");
ok("C11.12 BR-5 pass (m6): a line saved before C11.12 (no mode) keeps its stored tick", line([P, { role: "child", min: 0, max: 1, applies: false }], "child")?.applies === false && line([P, { role: "child", min: 0, max: 1, applies: true }], "child")?.applies === true);

// BR-6 the plan: on the principal's and declared only share the principal's filing; files own not travelling files nothing
const person = (subject: string, role: string, travelling = true) => ({ subject, role, label: subject, travelling });
const modes = (m: Record<string, LineMode>) => (role: string) => (role === "principal" ? "files_own" : m[role]);
const ee = filingPlan([person("a", "principal"), person("b", "spouse_or_partner"), person("c", "child"), person("d", "child", false)], modes({ spouse_or_partner: "on_principal", child: "on_principal" }));
ok("C11.12 BR-6 pass: Express Entry: one filing, 4 on it, the child not travelling declared only", ee.filings.length === 1 && ee.filings[0].applicants.length === 4 && ee.filings[0].applicants[3].mode === "declared_only" && ee.filings[0].id === "filing-a");
const vv = filingPlan([person("a", "principal"), person("b", "child", false)], modes({ child: "files_own" }));
ok("C11.12 BR-6 fail: Files own and not travelling gets no filing (and is said why)", vv.filings.length === 1 && vv.notFiling[0]?.person.subject === "b" && /no filing/.test(vv.notFiling[0].why));
ok("C11.12 BR-6 pass: one mapping helper for the stored views", filingOf("files_own") === "own" && filingOf("on_principal") === "principal" && filingOf("declared_only") === "principal" && filingOf("co_files") === "co_filed" && filingOf(null) === "none");

// BR-7 warn, don't block; the release check needs a mode on every applicant role
ok("C11.12 BR-7 pass: Visitor visa child On the principal's warns with the guide's words", filingWarnings(eachFilesOwnOf("vv.single"), [{ role: "child", label: "Child", filingMode: "on_principal" }])[0] === "Child: On the principal's application. Check this: Guide 5256 says family members complete their own application forms.");
// M3-S1 (P-425): which combinations warn, and IRCC's words with their source, are the fee table's data, never code.
ok("M3-S1 pass: BR-7's words come from the fee table with their source (Guide 5256, its own words, a date read)", eachFilesOwnOf("vv.single") === FEE_TABLE.combinations["vv.single"].each_files_own?.says && FEE_TABLE.combinations["vv.single"].each_files_own?.source.quote === "Family members must complete their own application forms." && /^\d{4}-\d{2}-\d{2}$/.test(FEE_TABLE.combinations["vv.single"].each_files_own?.source.read ?? ""));
ok("M3-S1 fail: a combination whose row says nothing warns about nothing; neither does an inherited name", eachFilesOwnOf("fs.spouse") === null && eachFilesOwnOf("wp.lmia_inside") === null && eachFilesOwnOf("constructor") === null && filingWarnings(null, [{ role: "child", filingMode: "on_principal" }]).length === 0);
ok("C11.12 BR-7 pass (m5): Declared only on Visitor visa warns too; Express Entry does not", filingWarnings(eachFilesOwnOf("vv.single"), [{ role: "child", filingMode: "declared_only" }]).length === 1 && filingWarnings(eachFilesOwnOf("pnp.express_entry"), [{ role: "child", filingMode: "on_principal" }]).length === 0);
ok("C11.12 BR-7 fail: an applicant role with no mode is missing before a new release", filingNotSet([P, { role: "child", label: "Child", min: 0, max: 4 }], roles).join() === "Child");
ok("C11.12 BR-7 pass: the principal, a representative and a role at most 0 need no mode", filingNotSet([{ ...P, filingMode: undefined }, rep(), { role: "child", min: 0, max: 0 }], roles).length === 0);
ok("C11.12 BR-7 fail (PR 3): with the Filing column on the screen, a role with no mode blocks a new release (error); switched off it is a warning", FILING_NOT_SET_BLOCKS && filingProblems([P, { role: "child", label: "Child", min: 0, max: 4 }], roles)[0]?.level === "error" && filingProblems([P, { role: "child", label: "Child", min: 0, max: 4 }], roles, false)[0]?.level === "warning" &&  filingProblems([P, { role: "child", label: "Child", min: 0, max: 4 }], roles)[0]?.item === "Filing for Child");
const missing = missingItems({ forms: [{ form_number: "IMM 5257", form_kind: "document" }], field_maps: [], sections: [], placements: [], canonical_fields: [], derived_fields: [], rules: [], checks: [], document_requirements: [] } as never, [], [{ level: "error", where: "People", item: "Filing for Child", message: "x" }]);
ok("C11.12 BR-7 fail: the missing list names it: 'Filing for Child: not set'", missing.some((m) => m.code === "filing_not_set" && /Filing for Child: not set/.test(m.text)) && !missing.some((m) => m.code === "rule_problem"), missing);
const waiting = missingItems({ forms: [], field_maps: [], sections: [], placements: [], canonical_fields: [], derived_fields: [], rules: [], checks: [], document_requirements: [] } as never, [], [{ level: "error", where: "People", item: "Filing for Child", message: "x" }], { exists: true, forms: 0, sources: 0, draftable: 0, fromLibrary: [], running: null, proposals: [] });
ok("C11.12 (Lead check item 1, review on #500 m1) pass: while a setup step waits (Find forms), 'Filing not set' names that step, so the row has one next step", waiting.some((m) => m.code === "filing_not_set") && waiting.every((m) => m.step === "Find forms"), waiting.map((m) => [m.code, m.step]));
ok("C11.12 (review on #500 m1) fail: with no step waiting, it names its own step", missing.find((m) => m.code === "filing_not_set")?.step === "Set the filing", missing.map((m) => [m.code, m.step]));

// BR-8 nothing is lost on an edit (the editor's paths are browser-checked in PR 3); the save keeps the mode it read
ok("C11.12 BR-8 pass: a save keeps each line's mode", run([P, { role: "child", min: 0, max: 4, applies: true, filingMode: "on_principal" }], false).lines.find((l) => l.role === "child")?.filingMode === "on_principal");
const sample = JSON.parse(readFileSync(join(import.meta.dirname, "..", "samples", "wave1.json"), "utf8"));
const lists = JSON.stringify(sample).match(/"participants":\[[^\]]*\]/g) ?? [];
ok("C11.12 BR-8 pass: every family line of the Demo sample (wave1.json) has a filing mode", lists.length === 6 && lists.every((l) => (JSON.parse(l.slice(15)) as In[]).every((p) => p.role === "representative" || p.filingMode)));

// BR-10 fees never guessed; the preview's words
const pv = previewFilings([{ ...P, label: "Principal applicant" }, { role: "child", label: "Child", min: 0, max: 4, preview: 2, applies: true, filingMode: "on_principal" }] as never, "Provincial nominee", false);
ok("C11.12 BR-10 pass (M3-S1 words): a combination with no fee rule says no fee line is set, never CAD 0", pv.filings[0].fee === "No fee lines in the fee table for Provincial nominee yet, so no fee is charged; nothing is guessed." && !/CAD 0/.test(JSON.stringify(pv)));
// M3-S1: a co-filed application's own fees in the editor's words and preview: its own when a line reaches it, else none.
const coWords = filingWords({ role: "sponsor", filingMode: "co_files", applies: false }, false, true, "Spouse sponsorship");
const coPv = previewFilings([P, sponsor()] as never, "Spouse sponsorship", true);
ok("M3-S1 pass: with fees worked out, the co-filing line and its preview filing say it pays its own application's fees", coWords.fees === "Pays its own application's fees, on this filing (Sample amounts)." && coPv.filings.find((f) => f.kind === "co_filed")?.fee === coWords.fees);
ok("M3-S1 review M1 (BR-4): the built-in mode a line falls back to is never co_files (a never-applicant line saved without a mode files nothing); applicant roles keep theirs", defaultModeOf("fs.spouse", "sponsor") === undefined && defaultModeOf("fs.spouse", "child") === "on_principal" && defaultModeOf("vv.single", "child") === "files_own");
ok("M3-S1 fail: hasFeeRules is false when no fee line reaches a co-filing role (a table without a sponsor line), true for the shipped spouse sponsorship row", hasFeeRules("vv.single", ["sponsor"]) === false && hasFeeRules("vv.single") === true && hasFeeRules("fs.spouse", ["sponsor"]) === true && filingWords({ role: "sponsor", filingMode: "co_files", applies: false }, false, false, "Visitor visa").fees === "No fee lines in the fee table for Visitor visa yet, so no fee is charged; nothing is guessed.");
ok("C11.12 preview pass: on the principal's: '1 filing', 3 people on it", pv.gets === "1 filing" && pv.filings[0].people === 3 && pv.filings[0].roles.join() === "principal,child");
const co = previewFilings([P, sponsor()] as never, "Spouse sponsorship", false);
ok("C11.12 preview pass: a co-filed sponsorship is a second filing that cannot be split", co.filings.length === 2 && co.submissions[0].splittable === false && /sent together/.test(co.gets), co.gets);
ok("C11.12 preview fail: no principal → 'Add the principal applicant to see what a case gets.'", previewFilings([{ role: "child", min: 0, max: 1, applies: true, filingMode: "files_own" }], "x", true).gets === "Add the principal applicant to see what a case gets.");

// Review M1 of PR 1, PR 2 form: the case engine now handles every mode; only a mode that cannot hold is dropped
const rm = releaseModes([{ role: "principal", filingMode: "files_own", applies: true }, { role: "spouse_or_partner", filingMode: "on_principal", applies: true }, { role: "child", filingMode: "declared_only", applies: false }, { role: "sponsor", filingMode: "co_files", applies: false }, { role: "representative", filingMode: "files_own", applies: false }]);
ok("C11.12 PR 2 pass: the case reads all four modes from the release", rm.get("principal") === "files_own" && rm.get("spouse_or_partner") === "on_principal" && rm.get("child") === "declared_only" && rm.get("sponsor") === "co_files");
ok("C11.12 PR 2 fail (B1): a Representative's stored Files own never reaches the case", !rm.has("representative"));
const caseVv = deriveFilings("vv.single", [{ subjectId: "a", role: "principal", label: "A", applies: true }, { subjectId: "k", role: "child", label: "K", applies: true }], undefined, { modes: rm as never });
ok("C11.12 PR 2 pass: every filing mode the engine writes is one the widened database check holds", caseVv.derived && caseVv.filings.every((f) => ["files_own", "co_filed"].includes(f.mode)) && caseVv.filings.every((f) => f.applicants.every((a) => ["applying", "declared_only"].includes(a.mode))));
// Review M2: the preview follows the case's built-in default for a line with no mode
const noMode = previewFilings([{ ...P }, { role: "child", label: "Child", min: 0, max: 4, preview: 1, applies: true }] as never, "Visitor visa", true, (role) => defaultModeOf("vv.single", role));
ok("C11.12 review M2 pass: Visitor visa child with no mode → the preview gives the child a filing, as the case does", noMode.filings.length === 2 && noMode.gets === "2 filings in one submission", noMode.gets);
ok("C11.12 review M2 fail: with no default (another combination) the line files nothing in the preview, and the release check names it", previewFilings([{ ...P }, { role: "child", min: 0, max: 4, preview: 1, applies: true }] as never, "x", false, (role) => defaultModeOf("pnp.express_entry", role)).filings.length === 1 && filingNotSet([P, { role: "child", min: 0, max: 4 }], roles).length === 1);
// Review m1: the alias and the field must agree
ok("C11.12 review m1 fail: filingMode and filing that disagree are refused", first([P, { role: "child", min: 0, max: 1, applies: true, filingMode: "files_own", filing: "on_principal_applying" }]) === "Filing: send one choice (filingMode and filing disagree).");
ok("C11.12 review m1 pass: filingMode and filing that agree are accepted", run([P, { role: "child", min: 0, max: 1, applies: true, filingMode: "on_principal", filing: "on_principal_applying" }]).errors.length === 0);

// Review M2 of PR 3: only the sponsor co-files
ok("C11.12 BR-4 fail (PR 3): a Representative set to Files the sponsorship is refused in words", first([P, { role: "representative", min: 1, max: 1, applies: false, filingMode: "co_files" }]) === "Representative takes part in the case but files no application: only the sponsor files the sponsorship.");
// Devin review on #478: the preview's split rule is the case's (a spouse's own filing may leave a sponsorship's group)
const coSp = previewFilings([P, { role: "spouse_or_partner", min: 0, max: 1, applies: true, filingMode: "files_own" }, sponsor()] as never, "Spouse sponsorship", false);
ok("C11.12 preview pass: principal + spouse's own filing + sponsorship → splittable (the spouse may leave), as the case says", coSp.filings.length === 3 && coSp.submissions[0].splittable === true);
const caseCoSp = deriveFilings("fs.spouse", [{ subjectId: "a", role: "principal", label: "A", applies: true }, { subjectId: "s", role: "spouse_or_partner", label: "S", applies: true }, { subjectId: "p", role: "sponsor", label: "P", applies: false }], undefined, { modes: new Map([["spouse_or_partner", "files_own"], ["sponsor", "co_files"]]) as never });
ok("C11.12 preview fail guard: the preview and the case agree on splittable for the same people", caseCoSp.derived && caseCoSp.groups[0].splittable === coSp.submissions[0].splittable && co.submissions[0].splittable === false);

process.exit(summary() ? 1 : 0);
