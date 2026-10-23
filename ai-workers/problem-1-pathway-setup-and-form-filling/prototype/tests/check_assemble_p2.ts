// Tests assembler v2 (P2-M2, D12, D20; v2.1 P2-R2-M2 split dependents) on the preserved live run records. No AI call; assembly writes only
// p2/config/c1-draft-1-<label>.json files under new labels (the v1 configurations are evidence and are refused).
//   node tests/check_assemble_p2.ts
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { assemble, formNativeConsistency } from "../p2/assemble.ts";
import { assemble as assembleV1 } from "../p2/assemble.v1.ts";

const P = join(import.meta.dirname, "..");
const results: [string, boolean][] = [];
const t = (name: string, pass: boolean) => results.push([name, pass]);
const sha = (f: string) => createHash("sha256").update(readFileSync(f)).digest("hex");
const original = join(P, "p2", "config", "c1-draft-1-live.json");
const runs = (JSON.parse(readFileSync(original, "utf8")).drafting_run_ids as string[]).map((r) => join(P, "p2", "runs", `${r}.json`));

// 0. The original stays reproducible, and v2 never overwrites it.
const before = sha(original);
assembleV1("live", runs);
t("v1 assembler reproduces the original live configuration byte for byte (5075783c…96a7)", sha(original) === before && before.startsWith("5075783c"));
let refused = "";
try { assemble("live", runs); } catch (e) { refused = (e as Error).message; }
t("v2 assembler refuses a v1 label (the original configuration is evidence)", /would overwrite a v1 configuration/.test(refused) && sha(original) === before);

// 1. Detection without a review: the reviewer's case and the one-id-two-meanings case are listed, never silent.
const det = JSON.parse(readFileSync(assemble("live-r2-detect", runs).file, "utf8"));
const fr0 = det.structure.field_review;
t("detection lists the reviewer's case: person.place_of_birth_country and person.country_of_birth (same meaning, two ids)", fr0.unreviewed_similar.some((x: any) => x.ids.includes("person.place_of_birth_country") && x.ids.includes("person.country_of_birth")));
t("detection lists person.occupation, defined as a history period by IMM 1295 and as present occupation by IMM 5707", fr0.unreviewed_same_id.some((x: any) => x.id === "person.occupation"));
t("... each listed item is an unresolved item a person decides", det.unresolved.filter((u: any) => /field review/.test(u.reason)).length === fr0.unreviewed_same_id.length + fr0.unreviewed_similar.length);

// 2. Reviewed reconciliation.
const r = assemble("live-r2", runs, { review: join(P, "p2", "field-review.c1.json"), repairs: join(P, "p2", "repairs.c1.json") });
const c = JSON.parse(readFileSync(r.file, "utf8"));
const fr = c.structure.field_review;
t("the reconciled configuration meets the combination-config contract", r.valid === true);
const body = JSON.stringify({ ...c, unresolved: [], structure: {}, canonical_fields: c.canonical_fields.map(({ aliases: _a, ...f }: any) => f) });
const mergedAway = (JSON.parse(readFileSync(join(P, "p2", "field-review.c1.json"), "utf8")).merges as any[]).map((m) => m.from);
t(`no reference to any of the ${mergedAway.length} merged-away ids remains (maps, placements, conditions, checks, calculations)`, mergedAway.every((id) => !body.includes(`"${id}"`)) && fr.merges_applied.length === mergedAway.length);
const boxes = (form: string, re: RegExp) => c.field_maps.find((m: any) => m.form_edition.startsWith(form)).entries.filter((e: any) => re.test(e.data_path) && e.outcome === "mapped");
const cob1295 = boxes("IMM 1295", /PlaceBirthCountry/), cob5707 = boxes("IMM 5707", /Applicant\[0\].*COB/);
t("IMM 1295 PlaceBirthCountry and IMM 5707's applicant COB now read the one field person.country_of_birth", cob1295.length === 1 && cob5707.length === 1 && cob1295[0].fact === "person.country_of_birth" && cob5707[0].fact === "person.country_of_birth");
t("... each keeps its own form-specific transform (IMM 1295 code list, IMM 5707 country name as text)", /^code_list:imm1295/.test(cob1295[0].transform) && cob5707[0].transform === "country_name_text");
const cobPlacements = c.placements.filter((p: any) => p.fact === "person.country_of_birth");
t("person.country_of_birth is placed once, so the questionnaire asks it once", cobPlacements.length === 1 && !c.placements.some((p: any) => p.fact === "person.place_of_birth_country"));
// One stored value for the principal fills both forms (a test value, not a family value).
const stored: Record<string, string> = { "client-a:person.country_of_birth": "TESTLAND" };
const filled = [...cob1295, ...cob5707].map((e: any) => ({ box: e.data_path, value: stored[`client-a:${e.fact}`], transform: e.transform }));
t("one birth-country value for Client A fills IMM 1295 and IMM 5707 (asked once, each form's transform applied at fill time)", filled.length === 2 && filled.every((f) => f.value === "TESTLAND"));
const occ1295 = c.field_maps.find((m: any) => m.form_edition.startsWith("IMM 1295")).entries.filter((e: any) => /OccupationRow[0-9]\[0\]\.Occupation\[0\]/.test(e.data_path) && e.outcome === "mapped");
const occ5707 = boxes("IMM 5707", /Occupation\[0\]$/);
const occField = c.canonical_fields.find((f: any) => f.id === "person.occupation");
t("split by meaning: IMM 1295's history rows use person.employment_activity; IMM 5707's present-occupation boxes keep person.occupation, now defined as present occupation",
  occ1295.length === 3 && occ1295.every((e: any) => e.fact === "person.employment_activity") && occ5707.length === 5 && occ5707.every((e: any) => e.fact === "person.occupation") && /present occupation/i.test(occField.meaning) && !occField.proposed_by.some((x: string) => x.startsWith("c1-fieldmap-imm1295-")));
// P2-R2-M2 (Codex 15:36Z): the split moves every dependent reference by scope, not just the map entries.
const fnOcc = c.checks.filter((x: any) => x.group === "form_native" && /OccupationRow[1-3]\[0\]\.Occupation\[0\]\.Occupation\[0\]$/.test(x.applies_to));
t("P2-R2-M2 exact case: the four IMM 1295 occupation-history box checks (one required, three length) read person.employment_activity, like their boxes",
  fnOcc.length === 4 && fnOcc.filter((x: any) => x.id.startsWith("fn-required:")).length === 1 && fnOcc.filter((x: any) => x.id.startsWith("fn-length:")).length === 3 && fnOcc.every((x: any) => x.inputs.length === 1 && x.inputs[0] === "person.employment_activity"));
const gap = c.checks.find((x: any) => x.id === "RW_EMPLOYMENT_HISTORY_GAP");
t("... and the drafted employment-history gap check, whose source is the IMM 1295 run, reads the history meaning too", gap.inputs.includes("person.employment_activity") && !gap.inputs.includes("person.occupation") && /c1-fieldmap-imm1295-/.test(gap.source_file));
const occRefs = (() => { const out: string[] = []; const walk = (n: any, path: string) => { if (Array.isArray(n)) n.forEach((v, i) => walk(v, `${path}[${i}]`)); else if (n && typeof n === "object") for (const [k, v] of Object.entries(n)) walk(v, `${path}.${k}`); else if (n === "person.occupation") out.push(path); }; walk({ field_maps: c.field_maps, checks: c.checks, placements: c.placements, forms: c.forms, rules: c.rules, derived_fields: c.derived_fields, document_requirements: c.document_requirements, sections: c.sections }, ""); return out; })();
t(`present occupation kept separate: the ${occRefs.length} remaining references to person.occupation are IMM 5707's five present-occupation boxes and the field's one placement`,
  occRefs.length === 6 && occRefs.filter((p) => p.startsWith(".field_maps")).length === 5 && occRefs.every((p) => !p.startsWith(".field_maps") || p.startsWith(`.field_maps[${c.field_maps.findIndex((m: any) => m.form_edition.startsWith("IMM 5707"))}]`)) && occRefs.filter((p) => p.startsWith(".placements")).length === 1);
const occSplit = fr.splits_applied.find((x: any) => x.id === "person.occupation");
t("the split log names each moved dependent check (5) and lists nothing unscoped for occupation", occSplit.dependent_checks_moved.length === 5 && occSplit.references_listed_for_review.length === 0);
const cons = formNativeConsistency(c);
t(`invariant: every form-native check reads exactly its box's fact (${cons.checked} checks, 0 mismatches), recorded in the configuration`, cons.checked > 200 && cons.mismatches.length === 0 && fr.dependent_consistency.mismatches.length === 0 && fr.dependent_consistency.form_native_checks_checked === cons.checked);
const broken = structuredClone(c); broken.checks.find((x: any) => x.id === fnOcc[0].id).inputs = ["person.occupation"];
const bc = formNativeConsistency(broken);
t("negative: a box check left on the old meaning (the v2.0 defect) is caught by the invariant", bc.mismatches.length === 1 && bc.mismatches[0].box_fact === "person.employment_activity");
const rcSplit = fr.splits_applied.find((x: any) => x.id === "person.residence_country");
t("references no box or source run ties to one meaning keep the old id and are listed for a person (residence country: 2 checks, 2 calculations)",
  rcSplit.references_listed_for_review.length === 4 && c.unresolved.some((u: any) => u.item === "person.residence_country / person.current_residence_country" && /cannot be tied to one meaning/.test(u.reason)) && rcSplit.dependent_checks_kept.length === 4);
t("each box check has its own inputs list: the required and length checks of one box are each logged when moved", occSplit.dependent_checks_moved.filter((id: string) => /OccupationRow1\[/.test(id)).length === 2);
t("provenance paths are relative to the solution folder (P2-R2-m2): no absolute path in the configuration", fr.review_file === "prototype/p2/field-review.c1.json" && c.structure.repairs.file === "prototype/p2/repairs.c1.json" && !/"\/(Users|private|tmp|var)\//.test(readFileSync(r.file, "utf8")));
t("split by time meaning: IMM 5409's 'country where the person currently lives' is person.current_residence_country", boxes("IMM 5409", /Info\[0\]\.Country/).every((e: any) => e.fact === "person.current_residence_country"));
t("distinct meanings are kept: mailing and residential addresses, cohabitation and relationship start", ["person.mailing_address", "person.residential_address", "relationship.cohabitation_start_date", "relationship.start_date"].every((id) => c.canonical_fields.some((f: any) => f.id === id)));
t("uncertain matches are flagged, not merged: cohabitation vs relationship start; e-mail and telephone placed differently by person", ["relationship.cohabitation_start_date / relationship.start_date", "person.email / person.email_address", "person.telephone_number / person.phone_number"].every((i) => c.unresolved.some((u: any) => u.item === i && /flag/.test(u.reason))));
t("every merge and split carries its reason and the count of references rewritten", fr.merges_applied.every((m: any) => m.references_rewritten > 0) && fr.splits_applied.length === 2 && fr.references_rewritten > 0);
t("after review no same-id conflict is left unreviewed", fr.unreviewed_same_id.length === 0);

// D30 (P3P4-R1-M1, Codex 17:57:23Z): the job offer, intended work, permit type and caregiver details are each
// applicant's own; service language, country where applying and the marriage date stay case-wide.
const rsa = fr.rescopes_applied?.[0];
const d30 = JSON.parse(readFileSync(join(P, "p2", "field-review.c1.json"), "utf8")).rescopes[0];
t(`D30: all ${Object.keys(d30.ids).length} re-scoped ids moved (facts and calculations), with references rewritten`, rsa?.moved.length === Object.keys(d30.ids).length && rsa.moved.every((m: any) => m.references_rewritten > 0));
const body30 = JSON.stringify({ ...c, unresolved: [], structure: {} });
t("D30: no reference to a re-scoped case id remains anywhere", Object.keys(d30.ids).every((id) => !body30.includes(`"${id}"`)));
const jobBox = c.field_maps.find((m: any) => m.form_edition.startsWith("IMM 1295")).entries.find((e: any) => e.data_path.endsWith("jobTitle[0]"));
t("D30: IMM 1295 'Job title' reads person.intended_job_title, placed per person", jobBox.fact === "person.intended_job_title" && c.placements.find((p: any) => p.fact === "person.intended_job_title").repeats === "per_person");
const caseConds = [...c.document_requirements.map((x: any) => x.condition), ...c.rules.map((x: any) => x.when), ...c.checks.map((x: any) => x.condition)].filter((r: any) => r && typeof r === "object" && JSON.stringify(r).match(/"person\.(work_permit_type|is_employer_specific_work_permit|intended_|lmia_or_offer_number|caregiver_)/));
t(`D30: every condition reading a re-scoped fact is evaluated for each applicant (${caseConds.length}; ${rsa?.conditions_now_each_applicant} changed from CASE)`, caseConds.length > 0 && caseConds.every((r: any) => r.subjectKind !== "CASE") && rsa.conditions_now_each_applicant > 0);
t("D30: service language, country where applying and the marriage date stay once per case", ["case.service_language", "case.country_where_applying", "relationship.start_date"].every((f) => c.placements.find((p: any) => p.fact === f)?.repeats === "once_per_case") && d30.kept_case_wide.length === 3);
const norm30 = (x: string) => x.replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ");
const inv1295 = JSON.stringify(JSON.parse(readFileSync(join(P, "p1", "inventory", "imm1295e.inventory.json"), "utf8")).fields.map((f: any) => [f.caption, f.heading]));
const guide = norm30(readFileSync(join(P, "..", "official-sources", "ircc", "instructions", "guide-5487.html"), "utf8"));
t("D30: every citation quote occurs in its official file (IMM 1295 captions from the hash-checked P1 inventory; guide 5487 text)", d30.citations.every((q: any) => q.file.endsWith("imm1295e.pdf") ? inv1295.replace(/\s+/g, " ").includes(q.quote) : guide.includes(q.quote)));

// 3. D12: package edition, internal template identifier and file hash kept side by side.
const m1295 = c.field_maps.find((m: any) => m.form_edition.startsWith("IMM 1295"));
const em = m1295.edition_metadata;
t("D12: IMM 1295 keeps package edition 09-2023, internal identifier IMM1295_06-2018 and the SHA-256, none rewritten", em.package_edition === "IMM 1295 (09-2023)" && em.internal_template_identifiers.includes("IMM1295_06-2018") && em.artifact_sha256 === m1295.form_sha256 && em.model_read_edition === "IMM 1295 (06-2018)" && m1295.form_edition === "IMM 1295 (09-2023)");
t("D12: every field map carries the three as separate metadata", c.field_maps.every((m: any) => m.edition_metadata?.package_edition && m.edition_metadata.artifact_sha256 === m.form_sha256 && Array.isArray(m.edition_metadata.internal_template_identifiers)));

// 4. D20: a listed content repair, with before and after.
const rep = c.structure.repairs.applied;
const f1295 = c.forms.find((f: any) => f.form_number === "IMM 1295");
t("D20: IMM 1295 'who' repaired from principal_applicant to each_applicant, listed with reason and both citations", f1295.who === "each_applicant" && f1295.repaired_by === "R-D20" && rep.length === 1 && rep[0].before.who === "principal_applicant" && rep[0].citation.length === 2);
t("... and the detection-only assembly (model output) still says principal_applicant", det.forms.find((f: any) => f.form_number === "IMM 1295").who === "principal_applicant");

for (const [n, p] of results) console.log(`${p ? "PASS" : "FAIL"}  ${n}`);
const failed = results.filter(([, p]) => !p).length;
console.log(`${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
