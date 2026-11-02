// C6.9 part 1 (M3-D, concept screens/C6.9/concept.md BR-1…BR-6 and BR-2a): eligibility gates as data on a combination's
// draft, frozen into its release as snapshot.eligibility. A pass and a fail per rule: first the pure rules
// (engine/eligibility-gates.ts), then the routes on an isolated copy. When the copy has no Visitor visa release the check
// makes one (tests/runtime/setup_visitor_visa.ts), then runs the M3 setup (acceptance/lib/setup_vv_m3.ts) and holds its
// S7 and S8 lines (that file as a whole waits for S5 and S7a); otherwise it reads the gates' version it finds. No browser,
// no model call (US$0).
//   zsh studio/tools/isolated.sh runtime_c69 4433 start && tsx studio/tests/check_c69_gates.ts 4433 xr_studio_runtime_c69
import { checkGates, DEFAULT_DISCLAIMER, eligibilityChanges, gateFacts, gateProblems, PER_PERSON, snapshotEligibility } from "../engine/eligibility-gates.ts";
import { snapshotHash, type Snapshot } from "../engine/snapshot.ts";
import { diff } from "../engine/validate.ts";
import { execFileSync, spawnSync } from "node:child_process";
import { join } from "node:path";
import { client, recorder } from "./runtime/api.ts";

const PORT = Number(process.argv[2] ?? 4433), DB = process.argv[3] ?? "xr_studio_runtime_c69";
const { call } = client(PORT, DB);
/** As tests/runtime/api.ts sql, with room for whole release snapshots (about 1 MB each). */
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 28 }).trim();
const { ok, summary } = recorder();
const AUTHOR = "user-A", REVIEWER = "user-C", APPROVER = "user-B", CLIENT = "user-P";

// S7's own body (acceptance/lib/setup_vv_m3.ts): no root subjectKind.
const GATES = [
  { key: "vv.travel_document", label: "Passport number and expiry date answered (Sample)", condition: { op: "and", args: [{ op: "exists", field: "person.passport_number" }, { op: "exists", field: "person.passport_expiry_date" }] } },
  { key: "vv.no_convictions", label: "Answered no to the criminal history question (Sample)", condition: { op: "eq", field: "person.criminal_history", value: false }, whenNotMet: "needs_review" },
];
const JUDGEMENT = ["Has enough money for the stay", "Is in good health", "Ties that will take the person back home", "Will leave Canada at the end of the visit"];
const fieldErrors = (b: { errors?: { field: string; message: string }[] }) => (b?.errors ?? []).map((e) => e.field);

// ------------------------------------------------------------------ pure rules
const types = new Map([["person.passport_number", "text"], ["person.passport_expiry_date", "date"], ["person.criminal_history", "yes_no"], ["case.travel_purpose", "code"]]);
const none = new Set<string>();
{
  const g = checkGates({ gates: GATES, judgement: JUDGEMENT }, types, none);
  ok("C6.9 BR-2 pass: gates over person.passport_* and person.criminal_history are accepted", g.errors.length === 0, g.errors);
  ok("C6.9 BR-2a pass: a condition with no root subjectKind is stored with PERSON", g.gates.every((x) => x.condition.subjectKind === "PERSON"), g.gates.map((x) => x.condition.subjectKind));
  const kind = checkGates({ gates: [{ ...GATES[1], condition: { ...GATES[1].condition, subjectKind: "CASE" } }], judgement: [] }, types, none);
  ok("C6.9 BR-2a fail: a root subjectKind other than PERSON is refused on the field: \"Eligibility is checked per person\"", kind.errors.length === 1 && kind.errors[0].field === "gates.0.condition" && kind.errors[0].message.startsWith(PER_PERSON), kind.errors);
  const caseFact = checkGates({ gates: [{ key: "x.case", label: "Case fact", condition: { op: "exists", field: "case.travel_purpose" } }], judgement: [] }, types, none);
  ok("C6.9 BR-2a pass: a case.* fact still reads through a PERSON gate (render.ts factsOf gives each person the case's facts)", caseFact.errors.length === 0, caseFact.errors);
  const bad = checkGates({ gates: [
    { key: "a.none", label: "No rule" },
    { key: "a.unknown", label: "Unknown fact", condition: { op: "exists", field: "person.no_such_fact" } },
    { key: "a.none", label: "Duplicate key", condition: { op: "exists", field: "person.passport_number" } },
    { key: "a.label", label: "  ", condition: { op: "exists", field: "person.passport_number" } },
    { key: "a.broken", label: "Not a node", condition: { op: "maybe", field: "person.passport_number" } },
  ], judgement: ["", "x".repeat(121), "x".repeat(120)], disclaimer: "x".repeat(20) }, types, none);
  const f = bad.errors.map((e) => e.field);
  ok("C6.9 BR-2 fail: no condition → refused on gates.0.condition", f.includes("gates.0.condition"), bad.errors[0]);
  ok("C6.9 BR-2 fail: a gate reading an unknown fact → refused on gates.1.condition", bad.errors.some((e) => e.field === "gates.1.condition" && /person\.no_such_fact/.test(e.message)), f);
  ok("C6.9 BR-2 fail: a duplicate key → refused on gates.2.key", f.includes("gates.2.key"), f);
  ok("C6.9 BR-2 fail: an empty label → refused on gates.3.label", f.includes("gates.3.label"), f);
  ok("C6.9 BR-2 fail: a condition checkCondition rejects → refused on gates.4.condition", f.includes("gates.4.condition"), f);
  ok("C6.9 BR-2 fail: a judgement line empty or over 120 characters → refused on its field (120 is fine)", f.includes("judgement.0") && f.includes("judgement.1") && !f.includes("judgement.2"), f.filter((x) => x.startsWith("judgement")));
  ok("C6.9 BR-2 fail: a disclaimer of 20 characters → refused on disclaimer", f.includes("disclaimer"), f);
  const longer = checkGates({ gates: [], judgement: ["Has enough money for the stay"], disclaimer: "x".repeat(21) }, types, none);
  ok("C6.9 BR-2 pass: a disclaimer of 21 characters is kept", !longer.errors.length && longer.disclaimer === "x".repeat(21), longer.errors);
}
{
  const stored = { gates: checkGates({ gates: GATES, judgement: JUDGEMENT }, types, none).gates, judgement: JUDGEMENT, disclaimer: null, version: 1, by: AUTHOR, at: "" };
  const e = snapshotEligibility(stored);
  ok("C6.9 BR-1 pass: the release copy holds { gates, judgement, disclaimer } only (no version, no author)", !!e && JSON.stringify(Object.keys(e).sort()) === JSON.stringify(["disclaimer", "gates", "judgement"]) && e.gates.length === 2 && e.judgement.length === 4, e && Object.keys(e));
  ok("C6.9 BR-1 fail: none set (null, or no gate and no judgement line) → no snapshot.eligibility, so the fingerprint is kept", snapshotEligibility(null) === undefined && snapshotEligibility({ gates: [], judgement: [], disclaimer: "a disclaimer long enough", version: 2 }) === undefined);
  ok("C6.9 BR-6 pass: no disclaimer given → the Sample default is written into the snapshot", e?.disclaimer === DEFAULT_DISCLAIMER);
  ok("C6.9 BR-6 pass: a disclaimer given is the one released", snapshotEligibility({ ...stored, disclaimer: "The firm's own words, long enough." })?.disclaimer === "The firm's own words, long enough.");

  const placed = new Set(["person.passport_number", "person.passport_expiry_date", "person.criminal_history"]);
  const words = (x: string) => `"${x}"`;
  ok("C6.9 BR-5 pass: gate facts placed and read by a form box or rule pass the release check", gateProblems(e, placed, placed, types, none, words).length === 0, gateProblems(e, placed, placed, types, none, words));
  const read = new Set(["person.passport_number", "person.passport_expiry_date"]);
  const p = gateProblems(e, placed, read, types, none, words);
  ok("C6.9 BR-5 fail: a gate fact placed but read by nothing → an error naming the fact (\"This gate reads …, which no case of this application is asked\")", p.length === 1 && p[0].level === "error" && p[0].item === "vv.no_convictions" && /This gate reads "person\.criminal_history", which no case of this application is asked/.test(p[0].message), p);
  ok("C6.9 BR-5 fail: a gate fact not placed at all → an error", gateProblems(e, new Set(["person.criminal_history"]), placed, types, none, words).some((x) => /passport_number/.test(x.message)));
  const derivedGate = snapshotEligibility({ gates: [{ key: "x.derived", label: "Reads a worked-out value", condition: { op: "gte", field: "person.nomination_days_until_expiry", value: 1, subjectKind: "PERSON" } }], judgement: [], disclaimer: null });
  const pd = gateProblems(derivedGate, placed, placed, types, new Set(["person.nomination_days_until_expiry"]), words);
  ok("C6.9 BR-5 fail: a gate on a derived (worked-out) fact → a release error in plain words, never a silent pass", pd.length === 1 && pd[0].level === "error" && /worked out/.test(pd[0].message), pd);
  ok("C6.9 BR-5 fail: a gate on a fact the library no longer has → a release error", gateProblems(snapshotEligibility({ gates: [{ key: "x.gone", label: "Gone", condition: { op: "exists", field: "person.gone_fact", subjectKind: "PERSON" } }], judgement: [], disclaimer: null }), placed, placed, types, none, words).length >= 1);
  const lone = checkGates({ gates: [], judgement: [], disclaimer: "A disclaimer of the firm's own, long enough." }, types, none);
  ok("C6.9 BR-6 fail: a disclaimer with no gate and no judgement line is refused on the field (never dropped silently)", lone.errors.length === 1 && lone.errors[0].field === "disclaimer", lone.errors);
  // Break report M1 (b), (c) and minors m1, m2, m3, m5, m6 on e3a01067: refused at save, on the field.
  const one = (gate: Record<string, unknown>, extra: Record<string, unknown> = {}) => checkGates({ gates: [{ key: "x.g", label: "A gate (Sample)", ...gate }], judgement: [], ...extra }, types, none).errors;
  ok("C6.9 BR-2 fail (break M1b): a yes/no fact compared with the text \"false\" → refused on the field", one({ condition: { op: "eq", field: "person.criminal_history", value: "false" } }).some((x) => x.field === "gates.0.condition" && /true or false/.test(x.message)));
  ok("C6.9 BR-2 fail (break M1b): a yes/no fact in [\"maybe\"] → refused on the field", one({ condition: { op: "in", field: "person.criminal_history", value: ["maybe"] } }).some((x) => x.field === "gates.0.condition"));
  ok("C6.9 BR-2 fail (break M1b): a date fact compared with a number → refused", one({ condition: { op: "eq", field: "person.passport_expiry_date", value: 20350630 } }).some((x) => x.field === "gates.0.condition"));
  ok("C6.9 BR-2 pass (break M1b): a yes/no fact compared with false, a date with YYYY-MM-DD, a code with text", !one({ condition: { op: "eq", field: "person.criminal_history", value: false } }).length && !one({ condition: { op: "gte", field: "person.passport_expiry_date", value: "2030-01-01" } }).length && !one({ condition: { op: "in", field: "case.travel_purpose", value: ["tourism"] } }).length);
  ok("C6.9 BR-2 fail (break M1c): an \"and\" asking one fact to equal two values → refused as a rule that can never be true", one({ condition: { op: "and", args: [{ op: "eq", field: "person.criminal_history", value: true }, { op: "eq", field: "person.criminal_history", value: false }] } }).some((x) => x.field === "gates.0.condition" && /never be true/.test(x.message)));
  ok("C6.9 BR-2 fail (break m1): a NUL or a lone surrogate in a label, a line or the disclaimer → 400 on its field", one({ label: "Pass\u0000port", condition: GATES[0].condition }).some((x) => x.field === "gates.0.label") && one({ condition: GATES[0].condition }, { judgement: ["money\ud800"] }).some((x) => x.field === "judgement.0") && one({ condition: GATES[0].condition }, { disclaimer: "Indicative only and nothing more.\u0000" }).some((x) => x.field === "disclaimer"));
  let deep: Record<string, unknown> = { op: "exists", field: "person.passport_number" }; for (let i = 0; i < 1000; i++) deep = { op: "not", arg: deep };
  ok("C6.9 BR-2 fail (break m2): a condition nested 1000 deep → 400 on the field (no stack overflow)", (() => { try { return one({ condition: deep }).some((x) => x.field === "gates.0.condition" && /deep/.test(x.message)); } catch { return false; } })());
  ok("C6.9 BR-2 fail (break m3): a disclaimer over 2,000 characters → refused; 2,000 is kept", one({ condition: GATES[0].condition }, { disclaimer: "x".repeat(2001) }).some((x) => x.field === "disclaimer") && !one({ condition: GATES[0].condition }, { disclaimer: "x".repeat(2000) }).length);
  ok("C6.9 BR-2 fail (break m5): a label of zero-width characters, a line of combining marks, a label with BEL/ANSI, a line break or a bidi override → refused", one({ label: "\u200b\u200b", condition: GATES[0].condition }).length > 0 && one({ condition: GATES[0].condition }, { judgement: ["\u0301\u0301\u0301"] }).length > 0 && one({ label: "Pass\u0007\u001b[31mport", condition: GATES[0].condition }).length > 0 && one({ label: "Pass\nport", condition: GATES[0].condition }).length > 0 && one({ label: "\u202eSample tropssap", condition: GATES[0].condition }).length > 0);
  ok("C6.9 BR-2 pass (break m6): \"Passport \" and 100 emoji are 109 characters (209 UTF-16 units), within the 160-character label", !one({ label: "Passport " + "\u{1F6C2}".repeat(100), condition: GATES[0].condition }).length);
  const dupes = checkGates({ gates: [{ key: "x.a", label: "Passport answered", condition: GATES[0].condition }, { key: "x.b", label: "passport  ANSWERED ", condition: GATES[1].condition }], judgement: ["Is in good health", "is in good health ", "IS IN GOOD HEALTH"] }, types, none).errors.map((x) => x.field);
  ok("C6.9 BR-2 fail (break m6): two gates with the same label, or the same judgement line twice (ignoring case and spaces) → refused", dupes.includes("gates.1.label") && dupes.includes("judgement.1") && dupes.includes("judgement.2"), dupes);
  const askedHow = [{ fact: "person.passport_number" }, { fact: "person.passport_expiry_date" }, { fact: "person.criminal_history", condition: { op: "eq", field: "person.passport_number", value: "x", subjectKind: "EACH_APPLICANT" }, condition_effect: "SHOW", condition_plain: "only after a yes (Sample)" }];
  const pa = gateProblems(e, placed, placed, types, none, words, askedHow);
  ok("C6.9 BR-5 fail (break M1a): a gate fact asked only under a condition → a release error naming the condition", pa.length === 1 && pa[0].item === "vv.no_convictions" && /asked only when "only after a yes \(Sample\)"/.test(pa[0].message), pa);
  const po = gateProblems(e, placed, placed, types, none, words, [{ fact: "person.passport_number", condition_effect: "OPTIONAL" }]);
  ok("C6.9 BR-5 fail (break M1a): a gate fact asked as optional → a release error", po.length === 1 && /optional/.test(po[0].message), po);
  ok("C6.9 BR-5 pass (break M1a): gate facts asked of everyone, with no condition, pass", gateProblems(e, placed, placed, types, none, words, askedHow.slice(0, 2).concat([{ fact: "person.criminal_history" }])).length === 0);
  ok("C6.9 BR-5: the gate facts are listed once each, in gate order", JSON.stringify(gateFacts(e)) === JSON.stringify(["person.passport_number", "person.passport_expiry_date", "person.criminal_history"]), gateFacts(e));

  const first = eligibilityChanges(undefined, e);
  ok("C6.9 BR-4 pass: a first release lists one Eligibility line per gate, one for Officer's judgement and one for Disclaimer, each needing the SME", first.length === 4 && first.every((x) => x.kind === "Eligibility" && x.needs_sme && x.change === "added") && first.map((x) => x.key).join(",") === "vv.travel_document,vv.no_convictions,officers_judgement,disclaimer", first);
  const moved = eligibilityChanges(e, { ...e!, gates: [{ ...e!.gates[0], label: "Relabelled (Sample)" }], judgement: JUDGEMENT.slice(0, 3) });
  const was = moved.find((x) => x.key === "vv.travel_document")?.label ?? "";
  ok("C6.9 BR-4 pass: a changed gate's line shows the old and the new label", was.includes(e!.gates[0].label) && was.includes("→ Relabelled (Sample)"), was);
  const rule = eligibilityChanges(e, { ...e!, gates: [{ ...e!.gates[0], condition: { op: "exists", field: "person.passport_number", subjectKind: "PERSON" } }, e!.gates[1]] }).find((x) => x.key === "vv.travel_document")?.label ?? "";
  ok("C6.9 BR-4 pass: a gate whose rule changed says \"rule changed\"", /rule changed/.test(rule), rule);
  const valued = eligibilityChanges(e, { ...e!, gates: [e!.gates[0], { ...e!.gates[1], condition: { op: "eq", field: "person.criminal_history", value: true, subjectKind: "PERSON" } }] }).find((x) => x.key === "vv.no_convictions")?.label ?? "";
  ok("C6.9 BR-4 pass (break M1): a changed rule is shown in words with its value, so the expert sees what is signed", /person\.criminal_history is true/.test(valued) && /was: person\.criminal_history is false/.test(valued), valued);
  const order = eligibilityChanges(e, { ...e!, gates: [e!.gates[1], e!.gates[0]] });
  ok("C6.9 BR-4 pass (break m4): a reorder of the gates alone is a change-summary line \"Gates reordered\"", order.length === 1 && order[0].key === "gate_order" && /Gates reordered/.test(order[0].label), order);
  ok("C6.9 BR-4 pass: a changed gate, a removed gate and changed judgement lines are each named", moved.some((x) => x.key === "vv.travel_document" && x.change === "changed") && moved.some((x) => x.key === "vv.no_convictions" && x.change === "removed") && moved.some((x) => x.key === "officers_judgement" && x.change === "changed") && !moved.some((x) => x.key === "disclaimer"), moved);
  ok("C6.9 BR-4 fail: the same gates again → no Eligibility line", eligibilityChanges(e, JSON.parse(JSON.stringify(e))).length === 0);
  // diff() carries them, and no "Configuration: eligibility changed" catch-all line doubles them.
  const base = { contract_version: "combination-config/v0", combination: { key: "k", label: "l", program: "p", pathway: null, participants: [], source_basis: "SOURCE_BACKED", basis_note: null }, mode: "draft", canonical_fields: [], sections: [], placements: [], forms: [], field_maps: [], document_requirements: [], document_types: [], rules: [], derived_fields: [], checks: [], row_versions: {} } as unknown as Snapshot;
  const d = diff(base, { ...base, eligibility: e });
  ok("C6.9 BR-4 pass: diff() lists the Eligibility lines and nothing else for a gates-only change", d.length === 4 && d.every((x) => x.kind === "Eligibility"), d.map((x) => `${x.kind}|${x.key}`));
  ok("C6.9 BR-1 pass: snapshot.eligibility is part of the fingerprint, so a gates change is a draft change to review", snapshotHash(base) === snapshotHash(JSON.parse(JSON.stringify(base))) && snapshotHash(base) !== snapshotHash({ ...base, eligibility: e }));
}

// ------------------------------------------------------------------ the routes, on an isolated copy
(async () => {
  const served = (await call("GET", "/session").catch(() => ({ status: 0, body: null }))).body?.workspace?.id;
  const ours = (() => { try { return !!served && !!sql(`select id from workspace where id='${served}'`); } catch { return false; } })();
  if (!ours) { console.log(`\nSTOP  the server on port ${PORT} does not use ${DB}: pass the copy's port and database.`); process.exit(2); }
  const released = () => sql("select count(*) from config_release r join combination k on k.id = r.combination_id where k.combination_key='vv.single'");
  if (released() === "0") {
    const studio = join(import.meta.dirname, "..");
    const tsx = (file: string) => spawnSync(join(studio, "node_modules", ".bin", "tsx"), ["--tsconfig", join(studio, "api", "tsconfig.json"), join(studio, file), String(PORT), DB], { encoding: "utf8", timeout: 600_000, maxBuffer: 1 << 26 });
    ok("setup: the Visitor visa released on this copy (setup_visitor_visa.ts)", tsx("tests/runtime/setup_visitor_visa.ts").status === 0 && released() === "1", released());
    const m3 = tsx("acceptance/lib/setup_vv_m3.ts").stdout ?? "";
    const line = (re: RegExp) => m3.split("\n").find((l) => re.test(l)) ?? "(no line)";
    ok("C6.9 BR-1, BR-2a: setup S7 passes (2 gates, 4 officer's judgement lines saved on the draft, no subjectKind sent)", /^PASS {2}S7 \(M3-8\)/.test(line(/S7 \(M3-8\)/)), line(/S7 \(M3-8\)/));
    ok("C6.9 BR-4: setup S8 passes (submitted, signed off by the content reviewer, release 2 approved by a second person)", ["S8 submitted", "S8 signed off", "S8 release 2"].every((k) => line(new RegExp(k)).startsWith("PASS")), ["S8 submitted", "S8 signed off", "S8 release 2"].map((k) => line(new RegExp(k)).slice(0, 60)));
    const r2 = JSON.parse(sql("select coalesce((select snapshot->'eligibility' from config_release r join combination k on k.id = r.combination_id where k.combination_key='vv.single' and r.version = 2), 'null')"));
    ok("C6.9 BR-1, BR-6: after S8, release 2's snapshot holds S7's gates (stored with PERSON), its 4 judgement lines and the Sample disclaimer", JSON.stringify(r2?.gates?.map((g: { key: string; label: string; condition: { subjectKind?: string } }) => [g.key, g.label, g.condition.subjectKind])) === JSON.stringify(GATES.map((g) => [g.key, g.label, "PERSON"])) && r2?.judgement?.length === 4 && r2?.disclaimer === DEFAULT_DISCLAIMER, r2 && { gates: r2.gates?.length, judgement: r2.judgement?.length });
  }
  let vv = "";
  try { vv = sql("select id from combination where combination_key='vv.single'"); } catch { vv = ""; }
  if (!vv) { console.log(`\nSTOP  no Visitor visa on port ${PORT} (${DB}): run tests/runtime/setup_visitor_visa.ts ${PORT} ${DB} first.`); process.exit(summary() ? 1 : 2); }
  const releases = () => JSON.parse(sql(`select coalesce(json_agg(json_build_object('version', version, 'sha256', sha256, 'snapshot', snapshot) order by version), '[]') from config_release where combination_id='${vv}'`)) as { version: number; sha256: string; snapshot: Snapshot }[];
  const other = sql("select c.id from combination c join config_release r on r.combination_id=c.id where c.combination_key<>'vv.single' limit 1");
  const otherDraft = other ? (await call("GET", `/combinations/${other}`, undefined, AUTHOR)).body?.draft?.sha256 : null;

  const r1 = releases()[0];
  ok("C6.9 BR-1 fail: an older release (1) has no eligibility, and its fingerprint still matches its stored snapshot", !!r1 && r1.snapshot.eligibility === undefined && snapshotHash(r1.snapshot) === r1.sha256, r1 && { version: r1.version });

  // Refusals (BR-2, BR-2a, contract §6).
  const url = `/combinations/${vv}/eligibility-gates`;
  let r = await call("PUT", url, { gates: GATES, judgement: JUDGEMENT }, CLIENT);
  ok("C6.9 BR-1 fail: a client cannot save gates (403)", r.status === 403, r.status);
  r = await call("PUT", url, { gates: GATES, judgement: JUDGEMENT }, REVIEWER);
  ok("C6.9 BR-1 fail: a person without the author duty cannot save gates (403)", r.status === 403, r.status);
  r = await call("PUT", "/combinations/00000000-0000-0000-0000-000000000000/eligibility-gates", { gates: GATES, judgement: JUDGEMENT }, AUTHOR);
  ok("C6.9 BR-1 fail: an unknown combination → 404", r.status === 404, r.status);
  r = await call("PUT", url, { gates: [{ key: "vv.x", label: "No rule (Sample)" }, { key: "vv.y", label: "Unknown (Sample)", condition: { op: "exists", field: "person.no_such_fact" } }], judgement: [""], disclaimer: "too short" }, AUTHOR);
  ok("C6.9 BR-2 fail: no condition, an unknown fact, an empty line and a short disclaimer → 400 Problem Details on each field", r.status === 400 && r.body?.type && ["gates.0.condition", "gates.1.condition", "judgement.0", "disclaimer"].every((x) => fieldErrors(r.body).includes(x)), r.body);
  r = await call("PUT", url, { gates: [{ ...GATES[1], condition: { ...GATES[1].condition, subjectKind: "CASE" } }], judgement: [] }, AUTHOR);
  ok("C6.9 BR-2a fail: subjectKind CASE → 400 \"Eligibility is checked per person\" on the field", r.status === 400 && fieldErrors(r.body).includes("gates.0.condition") && /Eligibility is checked per person/.test(r.body?.detail ?? ""), r.body);

  // BR-3: the first save needs no version; a later save without the current version, or with an old one, is a 409.
  let v = Number((await call("GET", `/combinations/${vv}/eligibility-gates`, undefined, AUTHOR)).body?.version ?? 0);
  if (v === 0) {
    r = await call("PUT", url, { gates: GATES, judgement: JUDGEMENT }, AUTHOR);
    ok("C6.9 BR-3 pass: the first save needs no version (S7's body) → 200, version 1", r.status === 200 && r.body?.version === 1, r.body);
    v = 1;
  } else ok("C6.9 BR-3 pass: S7 saved first without a version (found at version " + v + ")", v >= 1);
  r = await call("PUT", url, { gates: GATES, judgement: JUDGEMENT }, AUTHOR);
  ok("C6.9 BR-3 fail: a later save without the version → 409 naming who saved last", r.status === 409 && /Configuration author saved these eligibility gates/.test(r.body?.detail ?? ""), r.body?.detail ?? r.status);
  r = await call("PUT", url, { gates: GATES, judgement: JUDGEMENT, version: v - 1 }, AUTHOR);
  ok("C6.9 BR-3 fail: a save with an old version → 409", r.status === 409, r.status);
  const audits = Number(sql(`select count(*) from audit_event where combination_id='${vv}' and entity='eligibility'`));
  const relabel = [{ ...GATES[0], label: "Passport number and expiry date answered (Sample, C6.9 check)" }, GATES[1]];
  r = await call("PUT", url, { gates: relabel, judgement: JUDGEMENT, version: v }, AUTHOR);
  ok("C6.9 BR-3 pass: a save with the current version → 200 and the next version", r.status === 200 && r.body?.version === v + 1 && r.body?.savedBy === "Configuration author", r.body);
  ok("C6.9 BR-2a pass: the stored gates carry subjectKind PERSON", (r.body?.gates ?? []).length === 2 && r.body.gates.every((g: { condition: { subjectKind?: string } }) => g.condition.subjectKind === "PERSON"));
  const audit = JSON.parse(sql(`select detail from audit_event where combination_id='${vv}' and entity='eligibility' order by at desc limit 1`) || "null");
  ok("C6.9 BR-3 pass: each save writes one audit row holding the list before it", Number(sql(`select count(*) from audit_event where combination_id='${vv}' and entity='eligibility'`)) === audits + 1 && audit?.before?.version === v && audit?.after?.version === v + 1, audit && { before: audit.before?.version, after: audit.after?.version });
  v++;
  const race = await Promise.all([0, 1, 2, 3].map(() => call("PUT", url, { gates: relabel, judgement: JUDGEMENT, version: v }, AUTHOR)));
  ok("C6.9 BR-3 fail: four saves at once on the same version → exactly one 200, the other three 409", race.filter((x) => x.status === 200).length === 1 && race.filter((x) => x.status === 409).length === 3, race.map((x) => x.status));
  v++;
  const spare = sql("select id from combination where combination_key<>'vv.single' and retired_at is null order by combination_key limit 1");
  if (spare) {
    sql(`update combination set retired_at = now() where id='${spare}'`); // test-only: stands in for a retire released on Structure
    r = await call("PUT", `/combinations/${spare}/eligibility-gates`, { gates: GATES, judgement: JUDGEMENT }, AUTHOR);
    sql(`update combination set retired_at = null where id='${spare}'`);
    ok("C6.9 BR-1 fail: a retired combination's gates are not changed (409, \"is retired\")", r.status === 409 && /is retired/.test(r.body?.detail ?? ""), r.body?.detail ?? r.status);
  }
  r = await call("PUT", url, { gates: [], judgement: [], disclaimer: "A disclaimer of the firm's own, long enough.", version: v }, AUTHOR);
  ok("C6.9 BR-6 fail: a disclaimer with no gate and no judgement line → 400 on disclaimer", r.status === 400 && fieldErrors(r.body).includes("disclaimer"), r.body?.detail ?? r.status);
  r = await call("PUT", url, { gates: [GATES[0], { ...GATES[1], condition: { op: "eq", field: "person.criminal_history", value: "false" } }], judgement: JUDGEMENT, version: v }, AUTHOR);
  ok("C6.9 BR-2 fail (break M1b): the text \"false\" on a yes/no fact → 400 on gates.1.condition", r.status === 400 && fieldErrors(r.body).includes("gates.1.condition"), r.body?.detail ?? r.status);
  r = await call("PUT", url, { gates: [{ ...GATES[0], label: "Pass\u0000port" }, GATES[1]], judgement: ["money\ud800"], version: v }, AUTHOR);
  ok("C6.9 BR-2 fail (break m1): a NUL in a label and a lone surrogate in a line → 400 on the fields, never a 500", r.status === 400 && ["gates.0.label", "judgement.0"].every((x) => fieldErrors(r.body).includes(x)), r.body?.detail ?? r.status);
  let nest: Record<string, unknown> = { op: "exists", field: "person.passport_number" }; for (let i = 0; i < 1000; i++) nest = { op: "not", arg: nest };
  r = await call("PUT", url, { gates: [{ ...GATES[0], condition: nest }], judgement: JUDGEMENT, version: v }, AUTHOR);
  ok("C6.9 BR-2 fail (break m2): a condition 1000 deep → 400 on the field, never a 500", r.status === 400 && fieldErrors(r.body).includes("gates.0.condition"), r.status);
  r = await call("PUT", url, { gates: [relabel[1], relabel[0]], judgement: JUDGEMENT, version: v }, AUTHOR);
  const reordered = ((await call("GET", `/combinations/${vv}`, undefined, AUTHOR)).body?.draft?.changes ?? []) as { kind: string; key: string; label: string }[];
  ok("C6.9 BR-4 pass (break m4): a reorder of the gates is a draft change \"Gates reordered\" for review", r.status === 200 && reordered.some((x) => x.kind === "Eligibility" && x.key === "gate_order"), reordered.filter((x) => x.kind === "Eligibility"));
  if (r.status === 200) v++;
  r = await call("PUT", url, { gates: relabel, judgement: JUDGEMENT, version: v }, AUTHOR);
  if (r.status === 200) v++;
  const got = (await call("GET", url, undefined, AUTHOR)).body;
  ok("C6.9 BR-1 pass: GET answers the draft's gates and what the newest release carries", got?.version === v && got?.gates?.[0]?.label === relabel[0].label && (got.released === null || Array.isArray(got.released?.gates)), { version: got?.version, released: got?.released?.release ?? null });
  ok("C6.9 BR-1 fail: a client cannot read the gates (403)", (await call("GET", url, undefined, CLIENT)).status === 403);

  // BR-5: a gate that reads a fact no case of Visitor visa is asked blocks submit.
  const placedNow = new Set(((await call("GET", `/combinations/${vv}/config`, undefined, AUTHOR)).body?.snapshot?.placements ?? []).map((p: { fact: string }) => p.fact));
  const unasked = sql("select canonical_field_key from canonical_field where canonical_field_key like 'person.%' and status<>'RETIRED' order by canonical_field_key").split("\n").find((k) => k && !placedNow.has(k));
  const derivedKey = sql("select derived_key from derived_field order by derived_key").split("\n").find((k) => k.startsWith("person.") && !placedNow.has(k));
  r = await call("PUT", url, { gates: [...relabel, ...(derivedKey ? [{ key: "vv.derived", label: "Reads a worked-out value (C6.9 check)", condition: { op: "exists", field: derivedKey } }] : []), { key: "vv.unasked", label: "Reads a fact nobody is asked (C6.9 check)", condition: { op: "exists", field: unasked } }, { key: "vv.hidden", label: "Reads a question shown only after a yes (C6.9 check)", condition: { op: "exists", field: "person.criminal_history_details" } }, { key: "vv.optional", label: "Reads an optional question (C6.9 check)", condition: { op: "exists", field: "person.uci" } }], judgement: JUDGEMENT, version: v }, AUTHOR);
  ok("C6.9 BR-5: a gate on a library fact nobody is asked is saved (the release check judges it)", r.status === 200, r.body?.detail ?? r.status);
  v++;
  const probs = ((await call("GET", `/combinations/${vv}`, undefined, AUTHOR)).body?.draft?.problems ?? []) as { level: string; where: string; item: string; message: string }[];
  const p5 = probs.find((x) => x.where === "Eligibility" && x.item === "vv.unasked");
  ok("C6.9 BR-5 fail: the release check names it as an error: \"This gate reads …, which no case of this application is asked\"", p5?.level === "error" && /This gate reads .*which no case of this application is asked/.test(p5.message), p5 ?? probs.filter((x) => x.where === "Eligibility"));
  r = await call("POST", `/combinations/${vv}/submit`, { note: "C6.9 check: must be refused" }, AUTHOR);
  ok("C6.9 BR-5 fail: submit is refused while that gate stands", r.status === 400 && /gate reads/.test(r.body?.message ?? r.body?.detail ?? ""), r.body?.message ?? r.body?.detail ?? r.status);
  const pd = probs.find((x) => x.where === "Eligibility" && x.item === "vv.derived");
  ok(`C6.9 BR-5 fail: a gate on a derived fact (${derivedKey}) is a release error naming it as worked out`, !!derivedKey && pd?.level === "error" && /worked out/.test(pd.message), pd ?? derivedKey);
  const ph = probs.find((x) => x.where === "Eligibility" && x.item === "vv.hidden"), po = probs.find((x) => x.where === "Eligibility" && x.item === "vv.optional");
  ok("C6.9 BR-5 fail (break M1a): a gate on a question asked only under a condition (criminal history details) is a release error", ph?.level === "error" && /asked only when/.test(ph.message), ph ?? null);
  ok("C6.9 BR-5 fail (break M1a): a gate on an optional question (UCI) is a release error", po?.level === "error" && /optional/.test(po.message), po ?? null);
  ok("C6.9 BR-5 pass: the Visitor visa gate facts (placed, read by IMM 5257) raise no release problem", !probs.some((x) => x.where === "Eligibility" && !["vv.unasked", "vv.derived", "vv.hidden", "vv.optional"].includes(x.item)), probs.filter((x) => x.where === "Eligibility"));
  r = await call("PUT", url, { gates: relabel, judgement: JUDGEMENT, version: v }, AUTHOR);
  v++;

  // BR-4: review lines; an unsigned gate line blocks approval; signed, the release freezes them (BR-1, BR-6).
  for (const c of (await call("GET", "/library/changes?status=WAITING", undefined, REVIEWER)).body ?? []) await call("POST", `/library/changes/${c.id}/approve`, {}, REVIEWER);
  r = await call("POST", `/combinations/${vv}/submit`, { note: "C6.9 check: a relabelled gate (Sample)" }, AUTHOR);
  ok("C6.9 BR-4 pass: a gates change is submitted for review", r.status < 300, r.body?.message ?? r.body?.detail ?? r.status);
  const sub = (await call("GET", `/combinations/${vv}/review`, undefined, REVIEWER)).body?.submission;
  const lines = (sub?.changeSummary ?? sub?.change_summary ?? []) as { kind: string; key: string; change: string; needs_sme: boolean }[];
  const elig = lines.filter((x) => x.kind === "Eligibility");
  ok("C6.9 BR-4 pass: the change summary lists the changed gate as an Eligibility line needing the SME", elig.some((x) => x.key === "vv.travel_document" && x.needs_sme), lines.map((x) => `${x.kind}|${x.key}|${x.change}`));
  const others = lines.filter((x) => x.kind !== "Eligibility").map((x) => `${x.kind}|${x.key}`);
  if (others.length) await call("POST", `/combinations/${vv}/signoff`, { items: others, action: "signed" }, REVIEWER);
  r = await call("POST", `/combinations/${vv}/approve`, undefined, APPROVER);
  ok("C6.9 BR-4 fail: unsigned Eligibility lines block approval", r.status >= 400 && /sign-off/.test(r.body?.message ?? r.body?.detail ?? ""), r.body?.message ?? r.body?.detail ?? r.status);
  await call("POST", `/combinations/${vv}/signoff`, { items: elig.map((x) => `${x.kind}|${x.key}`), action: "signed" }, REVIEWER);
  r = await call("POST", `/combinations/${vv}/approve`, undefined, APPROVER);
  ok("C6.9 BR-4 pass: signed off, a second person approves", r.status < 300, r.body?.message ?? r.body?.detail ?? r.status);
  const all = releases(), last = all[all.length - 1];
  ok("C6.9 BR-1 pass: the new release's snapshot holds eligibility { gates, judgement, disclaimer }, frozen", last?.snapshot.eligibility?.gates?.[0]?.label === relabel[0].label && last.snapshot.eligibility.judgement.length === 4 && snapshotHash(last.snapshot) === last.sha256, last && { version: last.version, keys: Object.keys(last.snapshot.eligibility ?? {}) });
  ok("C6.9 BR-6 pass: no disclaimer was saved, so the release carries the Sample default", last?.snapshot.eligibility?.disclaimer === DEFAULT_DISCLAIMER);
  ok("C6.9 BR-5 pass: the gate facts travel with the release (their words in canonical_fields)", ["person.passport_number", "person.passport_expiry_date", "person.criminal_history"].every((f) => last?.snapshot.canonical_fields.some((x: { id: string }) => x.id === f)));
  ok("C6.9 BR-1 pass: every earlier release keeps its fingerprint", all.every((x) => snapshotHash(x.snapshot) === x.sha256), all.map((x) => x.version));
  if (other) {
    const after = (await call("GET", `/combinations/${other}`, undefined, AUTHOR)).body?.draft;
    const rel = JSON.parse(sql(`select json_build_object('sha256', sha256, 'snapshot', snapshot) from config_release where combination_id='${other}' order by version desc limit 1`));
    ok("C6.9 BR-1 fail: another combination's draft fingerprint is unchanged, and its release still matches its snapshot", after?.sha256 === otherDraft && snapshotHash(rel.snapshot) === rel.sha256 && rel.snapshot.eligibility === undefined, { before: otherDraft, after: after?.sha256 });
  } else ok("C6.9 BR-1: another released combination to compare (none on this copy)", true);
  process.exit(summary() ? 1 : 0);
})();
