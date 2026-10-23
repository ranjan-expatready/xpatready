// FROZEN v1 (20 Oct 2026, before P2-M1): byte-identical logic to the scorer that produced the original P2 results;
// kept to reproduce them. Superseded for new scoring by tests/score_p2.ts (v2). Do not edit.
// Scores one assembled P2 draft configuration against the answer keys and the acceptance examples in
// tests/p2-acceptance.json. Runs OUTSIDE the drafting process (it reads expected/). No AI call.
//   node tests/score_p2.ts p2/config/c1-draft-1-live.json     writes p2/scores/<name>.score.json
// Every example ends PASS, FAIL or NOT_EVALUABLE with the evidence; nothing is inferred as passing.
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { evaluate, type PredicateNode } from "../contracts/rules.ts";

const P = join(import.meta.dirname, "..");
const read = (f: string) => JSON.parse(readFileSync(join(P, f), "utf8"));
export type Verdict = "PASS" | "FAIL" | "NOT_EVALUABLE";
type Entry = { data_path: string; outcome: string; person?: string; fact?: string; row?: number; transform?: string; unresolved_reason?: string };

// ---- Field maps: relative person -> case person, per form subject (scenario of the slice key).
const OTHER: Record<string, string> = { "client-a": "partner", partner: "client-a" };
function casePerson(rel: string | undefined, subject: string, dataPath: string): string | undefined {
  switch (rel) {
    case "form_subject": return subject;
    case "subject_spouse_or_partner": return OTHER[subject];
    case "subject_parent_1": case "subject_parent_2": return `${subject}.mother|${subject}.father`;
    case "subject_child": return "child";
    default: return rel === undefined ? undefined : `${rel}@${dataPath.includes("Parent") ? "parent" : ""}`;
  }
}
const expectedOutcome = (k: { fact: string; rule: string }) => (/must be reported unresolved|unresolved in the scenario/.test(k.rule) ? "unresolved" : "mapped");
function transformClass(rule: string): string {
  if (/no code list|free text/i.test(rule)) return "text"; // "country name as text (free text field, no code list)"
  if (/code list|yes_no_code|LOV/i.test(rule)) return "code";
  if (/YYYY|date/i.test(rule)) return "date";
  if (/ticked|derived|"I do not/i.test(rule)) return "derived";
  return "text";
}
function draftClass(t: string | undefined): string {
  const s = (t ?? "").toLowerCase();
  if (/code|yes_no/.test(s)) return "code";
  if (/date|yyyy/.test(s)) return "date";
  if (/deriv|\bcount\b|count_|exists|no_children|has_/.test(s)) return "derived"; // not "country" (found on the first live run)
  return "text";
}

export function scoreFieldMaps(config: any, key = read("expected/slice-1-field-map.json")) {
  const mapFor = (form: string) => config.field_maps.find((m: any) => String(m.form_edition).startsWith(form + " "));
  // Fact alignment (key fact -> draft fact) by majority over the key's boxes, across all instances.
  const votes = new Map<string, Map<string, number>>();
  for (const inst of key.instances) {
    const m = mapFor(inst.form); if (!m) continue;
    for (const k of inst.entries) {
      const d: Entry | undefined = m.entries.find((e: Entry) => e.data_path === k.data_path && (e.row ?? 0) === 0);
      if (d?.outcome !== "mapped" || !d.fact) continue;
      const v = votes.get(k.fact) ?? new Map(); v.set(d.fact, (v.get(d.fact) ?? 0) + 1); votes.set(k.fact, v);
    }
  }
  const align = new Map<string, string>();
  for (const [kf, v] of votes) align.set(kf, [...v].sort((a, b) => b[1] - a[1])[0][0]);
  const sharedBy = new Map<string, string[]>();
  for (const [kf, df] of align) sharedBy.set(df, [...(sharedBy.get(df) ?? []), kf]);
  const merged = [...sharedBy].filter(([, ks]) => ks.length > 1).map(([df, ks]) => ({ draft_fact: df, key_facts: ks }));

  const instances = key.instances.map((inst: any) => {
    const m = mapFor(inst.form);
    const rows: any[] = [];
    for (const k of inst.entries) {
      const d: Entry | undefined = m?.entries.find((e: Entry) => e.data_path === k.data_path && (e.row ?? 0) === 0);
      const exp = expectedOutcome(k);
      const person = casePerson(d?.person, inst.subject, k.data_path);
      const r = {
        data_path: k.data_path, key_person: k.person, key_fact: k.fact, draft_outcome: d?.outcome ?? "missing", draft_person: d?.person, draft_fact: d?.fact, draft_row: d?.row, draft_transform: d?.transform,
        outcome_ok: d?.outcome === exp,
        // wrong person = drafted as mapped to someone else; a box the draft did not map is an outcome miss, counted there
        person_ok: exp !== "mapped" || d?.outcome !== "mapped" || person === k.person,
        fact_ok: exp !== "mapped" || (!!d?.fact && align.get(k.fact) === d.fact && (sharedBy.get(d.fact)?.length ?? 0) === 1),
        row_ok: exp !== "mapped" || (d?.row ?? 0) === 0,
        transform_ok: exp !== "mapped" || transformClass(k.rule) === draftClass(d?.transform),
        invented: exp === "unresolved" && d?.outcome === "mapped",
      };
      rows.push({ ...r, all_ok: r.outcome_ok && r.person_ok && r.fact_ok && r.row_ok && r.transform_ok });
    }
    const n = (f: string) => rows.filter((r) => r[f]).length;
    // Parent blocks: each block one parent role, the two blocks different.
    const block = (b: string) => new Set(rows.filter((r) => r.data_path.includes(`.${b}[0].`) && r.draft_outcome === "mapped").map((r) => r.draft_person));
    const p1 = block("Parent1"), p2 = block("Parent2");
    const parentsOk = inst.form !== "IMM 5707" || (p1.size === 1 && p2.size === 1 && [...p1][0] !== [...p2][0] && [...p1, ...p2].every((p) => /parent/.test(String(p))));
    return { form: inst.form, subject: inst.subject, entries: rows.length, outcome_ok: n("outcome_ok"), person_ok: n("person_ok"), fact_ok: n("fact_ok"), row_ok: n("row_ok"), transform_ok: n("transform_ok"), all_ok: n("all_ok"), invented: n("invented"),
      wrong_person: rows.filter((r) => !r.person_ok).map((r) => ({ box: r.data_path, key: r.key_person, draft: r.draft_person })), parent_blocks_ok: parentsOk, missing: rows.filter((r) => r.draft_outcome === "missing").length, rows };
  });
  return { alignment: Object.fromEntries(align), merged_meanings: merged, instances };
}

// ---- Requirements against combination-1.json; pre-registered matchers (written before any live run).
const FORMS: Record<string, { match: RegExp; status: string[]; who: string[] }> = {
  "IMM 1295": { match: /^IMM ?1295$/i, status: ["always"], who: ["each_applicant"] },
  "IMM 5707": { match: /^IMM ?5707$/i, status: ["conditional", "always"], who: ["each_adult_18_plus", "each_applicant", "each_person"] },
  "IMM 5409": { match: /^IMM ?5409$/i, status: ["conditional"], who: ["couple_once", "principal_applicant", "spouse_or_partner"] },
  "IMM 5476": { match: /^IMM ?5476$/i, status: ["conditional"], who: ["each_applicant", "principal_applicant"] },
  "IMM 5475": { match: /^IMM ?5475$/i, status: ["conditional"], who: ["each_applicant", "principal_applicant", "each_person"] },
  "IMM 5257 SCH1": { match: /^IMM ?5257 ?(SCH(EDULE)? ?1|B1)$/i, status: ["conditional"], who: ["each_applicant", "principal_applicant", "each_person"] },
};
const DOCS: Record<string, { match: RegExp; base: string }> = {
  "Passport information page": { match: /passport/i, base: "base" },
  "Marriage certificate": { match: /marriage/i, base: "conditional" },
  "Children's birth certificates": { match: /birth certificate/i, base: "conditional" },
  "Proof of payment": { match: /payment|fee/i, base: "base" },
};
const OFFICER = /officer (may|might|can) (request|ask)|may (also )?(be )?request|additional documents may|may be required/i;

export function score(config: any) {
  const fm = scoreFieldMaps(config);
  const unresolved: { reason: string; item: string }[] = config.unresolved ?? [];
  const has = (re: RegExp) => unresolved.filter((u) => re.test(u.reason));
  const forms: any[] = config.forms ?? [], docs: any[] = config.document_requirements ?? [], rules: any[] = config.rules ?? [];
  const checks: any[] = config.checks ?? [], placements: any[] = config.placements ?? [];
  const R: Record<string, { verdict: Verdict; evidence: unknown }> = {};
  const set = (m: string, ok: boolean | null, evidence: unknown) => (R[m] = { verdict: ok === null ? "NOT_EVALUABLE" : ok ? "PASS" : "FAIL", evidence });
  const fmEmpty = !config.field_maps?.length || fm.instances.every((i: any) => i.missing === i.entries);

  // Field maps
  const cov = has(/has no map entry|not in the form's inventory|entries for one box/);
  set("fm_coverage", config.field_maps?.length ? cov.length === 0 : null, { problems: cov.length, per_form: config.structure?.boxes_per_form });
  const wrong = fm.instances.flatMap((i: any) => i.wrong_person);
  set("fm_wrong_person", fmEmpty ? null : wrong.length === 0, { wrong_person: wrong.length, items: wrong.slice(0, 20) });
  const dob = fm.alignment["person.date_of_birth"];
  const dobPersons = new Set(fm.instances.flatMap((i: any) => i.rows.filter((r: any) => r.key_fact === "person.date_of_birth" && r.draft_fact === dob).map((r: any) => `${i.subject}:${r.key_person}`)));
  set("fm_one_meaning", fmEmpty ? null : !!dob && fm.merged_meanings.length === 0 && dobPersons.size >= 5, { date_of_birth_field: dob, used_for: [...dobPersons], merged_meanings: fm.merged_meanings });
  set("fm_parent_blocks", fmEmpty ? null : fm.instances.every((i: any) => i.parent_blocks_ok), fm.instances.map((i: any) => ({ form: i.form, subject: i.subject, ok: i.parent_blocks_ok })));
  const invented = fm.instances.reduce((a: number, i: any) => a + i.invented, 0);
  set("fm_invented", fmEmpty ? null : invented === 0, { invented });
  const childRows = fm.instances.flatMap((i: any) => i.rows.filter((r: any) => r.key_person === "child" && r.draft_outcome === "mapped"));
  set("fm_rows", fmEmpty ? null : childRows.length > 0 && childRows.every((r: any) => (r.draft_row ?? 0) === 0), { child_entries: childRows.length });
  const ms = fm.instances.flatMap((i: any) => i.rows.filter((r: any) => r.key_fact === "person.marital_status" && /IMM_5707|form1/.test(r.data_path) && (r.key_person === i.subject)).map((r: any) => ({ form: i.form, transform: r.draft_transform })));
  const codeOk = (f: string, code: string) => ms.some((x: any) => x.form === f && /code/i.test(x.transform ?? "") && new RegExp(`(^|[^0-9])${code}([^0-9]|$)`).test(x.transform ?? ""));
  set("fm_codes", fmEmpty ? null : codeOk("IMM 5707", "1") && codeOk("IMM 1295", "03"), { marital_status_transforms: ms });
  set("fm_accuracy", fmEmpty ? null : true, fm.instances.map(({ rows: _r, wrong_person: _w, ...i }: any) => i));
  const q = has(/evidence quote not found/);
  const mappedCount = (config.field_maps ?? []).reduce((a: number, m: any) => a + m.entries.filter((e: Entry) => e.outcome === "mapped").length, 0);
  set("fm_quotes", mappedCount ? q.length === 0 : null, { mapped_entries: mappedCount, not_found: q.length, items: q.slice(0, 10) });

  // Requirements
  const cond = has(/^condition/);
  set("rq_conditions_valid", forms.length || rules.length ? cond.length === 0 : null, { problems: cond.length, items: cond.slice(0, 10) });
  const formRes = Object.entries(FORMS).map(([name, x]) => {
    const f = forms.find((y) => x.match.test(String(y.form_number).trim()));
    return { form: name, found: !!f, status: f?.status, who: f?.who, ok: !!f && x.status.includes(f.status) && x.who.includes(f.who) };
  });
  set("rq_forms", forms.length ? formRes.every((f) => f.ok) : null, formRes);
  set("rq_age_rule", ...ageRule(config, forms, fm.alignment));
  const docRes = Object.entries(DOCS).map(([name, x]) => {
    const d = docs.filter((y) => x.match.test(String(y.document_type)) && y.status === "requirement_line");
    return { document: name, found: d.length > 0, base_or_conditional: d.map((y) => y.base_or_conditional), ok: d.some((y) => y.base_or_conditional === x.base) };
  });
  set("rq_documents", docs.length ? docRes.every((d) => d.ok) : null, docRes);
  const officer = [...forms, ...docs, ...rules].filter((x) => OFFICER.test(String(x.source_quote ?? "")));
  const notTask = officer.filter((x) => !["officer_task", "task"].includes(x.status ?? x.kind));
  set("rq_officer_tasks", officer.length ? notTask.length === 0 : null, { officer_passages: officer.length, not_tasks: notTask.map((x) => x.source_quote) });
  const ifApp = [...forms, ...docs].filter((x) => /if applicable/i.test(String(x.source_quote ?? "")));
  const ifBad = ifApp.filter((x) => !((x.status === "conditional" || x.base_or_conditional === "conditional") && x.condition));
  set("rq_if_applicable", ifApp.length ? ifBad.length === 0 : null, { if_applicable_items: ifApp.length, not_conditional: ifBad.map((x) => x.form_number ?? x.document_type) });

  // Sections
  const unplaced = has(/has no placement/);
  set("sc_all_placed", placements.length ? unplaced.length === 0 : null, { unplaced: unplaced.length, items: unplaced.slice(0, 10) });
  const m5476 = config.field_maps?.find((m: any) => String(m.form_edition).startsWith("IMM 5476 "));
  const repFacts = new Set<string>((m5476?.entries ?? []).filter((e: Entry) => /membership|ICCRCMember/i.test(e.data_path) && e.outcome === "mapped").map((e: Entry) => e.fact!));
  const repPlaced = placements.filter((p) => repFacts.has(p.fact));
  set("sc_rep_licence", repFacts.size && placements.length ? repPlaced.length === repFacts.size && repPlaced.every((p) => ["staff_working_view", "profile_record"].includes(p.collected_from)) : null, { facts: [...repFacts], placements: repPlaced.map((p) => ({ fact: p.fact, collected_from: p.collected_from })) });
  const dup = placements.map((p) => p.fact).filter((f, i, a) => a.indexOf(f) !== i);
  set("sc_settings", placements.length ? dup.length === 0 && placements.every((p) => p.tier && p.collected_from && typeof p.client_visible === "boolean") : null, { duplicates: dup });

  // Checks
  const ai = checks.filter((c) => c.made_by === "ai_draft");
  // An expiry check is one named for expiry or one whose condition reads a days-until derived field; a check
  // that only lists an expiry date among the facts a document must show is not one (found on the first live run).
  const daysFields = new Set((config.derived_fields ?? []).filter((d: any) => d.calculation === "days_until").map((d: any) => d.id));
  const reads = (n: any): string[] => (n ? [n.field, ...(n.args ?? []).flatMap(reads), ...reads(n.arg)].filter(Boolean) : []);
  // Cross-record date-order checks (issue date after expiry date) are consistency checks, which W1 3.8's own
  // example lets block; they are not document-expiry warnings (found on the first full live run).
  const expiry = ai.filter((c) => c.group !== "cross_record" && (/expir/i.test(c.id) || reads(c.condition).some((f) => daysFields.has(f))));
  set("ck_expiry_warns", ai.length ? expiry.length > 0 && expiry.every((c) => ["warn", "advise", "sme_pending"].includes(c.severity)) : null, expiry.map((c) => ({ id: c.id, severity: c.severity })));
  const gap = ai.filter((c) => /gap/i.test(`${c.id} ${c.condition_plain ?? ""} ${c.applies_to}`) && /employ|work|history/i.test(`${c.id} ${c.condition_plain ?? ""} ${c.applies_to} ${(c.inputs ?? []).join(" ")}`));
  set("ck_history_gap", ai.length ? gap.length > 0 && gap.every((c) => c.severity === "warn") : null, gap.map((c) => ({ id: c.id, severity: c.severity })));
  const inexpr = ai.filter((c) => c.expressible === false);
  set("ck_no_invented_values", ai.length ? inexpr.every((c) => !!c.gap_reason) : null, { sme_pending: ai.filter((c) => c.severity === "sme_pending").length, inexpressible: inexpr.length, for_review: ai.filter((c) => c.severity === "sme_pending").map((c) => c.id) });
  const fn = checks.filter((c) => c.group === "form_native");
  set("ck_form_native", fn.length ? fn.filter((c) => c.id.startsWith("fn-option:")).every((c) => c.severity === "block") && fn.filter((c) => c.id.startsWith("fn-length:")).every((c) => c.severity === "warn") : null, { option_checks: fn.filter((c) => c.id.startsWith("fn-option:")).length, length_checks: fn.filter((c) => c.id.startsWith("fn-length:")).length });

  const acceptance = read("tests/p2-acceptance.json").examples.map((e: any) => ({ id: e.id, slice: e.slice, requirements: e.requirements.map((r: any) => r.id), ...(R[e.measure] ?? { verdict: "NOT_EVALUABLE", evidence: "no measure" }) }));
  const count = (v: Verdict) => acceptance.filter((a: any) => a.verdict === v).length;
  return { configuration_version: config.configuration_version, summary: { PASS: count("PASS"), FAIL: count("FAIL"), NOT_EVALUABLE: count("NOT_EVALUABLE") }, acceptance, field_maps: fm };
}

/** P2-RQ-03: the drafted IMM 5707 condition on the made-up family, fields translated through the alignment. */
function ageRule(config: any, forms: any[], align: Record<string, string>): [boolean | null, unknown] {
  const f = forms.find((y) => /^IMM ?5707$/i.test(String(y.form_number).trim()));
  if (!f) return [null, "IMM 5707 not in the draft"];
  if (!f.condition) return [f.who === "each_adult_18_plus" ? null : false, { note: "no structured condition; 'who' carries the age rule", who: f.who }];
  const derived = (config.derived_fields ?? []).filter((d: any) => d.executable);
  const dobField = align["person.date_of_birth"];
  const reference = "2026-10-20";
  // The made-up family (36, 35, 9) never meets the boundary, so two boundary people are added: 18 exactly on
  // the reference date (yes) and one day short of 18 (no). Test values, not family values.
  const people = [...(read("expected/combination-1.json").scenario.people as { id: string; date_of_birth: string; adult: boolean }[]),
    { id: "boundary: 18 on the reference date", date_of_birth: "2008-10-20", adult: true },
    { id: "boundary: 18 tomorrow", date_of_birth: "2008-10-21", adult: false }];
  const facts = (dob?: string) => {
    const o: Record<string, unknown> = {};
    for (const d of derived) { for (const i of d.inputs) if (i === dobField && dob) o[i] = dob; o[d.reference] = reference; }
    if (dobField && dob) o[dobField] = dob;
    return o;
  };
  try {
    const tree = (({ subjectKind: _s, ...n }) => n)(f.condition) as PredicateNode;
    const res = people.map((p) => ({ person: p.id, expected: p.adult, got: evaluate(tree, facts(p.date_of_birth), derived).result }));
    const missing = evaluate(tree, facts(undefined), derived);
    const ok = res.every((r) => r.got === r.expected) && missing.result === "cannot_tell";
    return [ok, { date_of_birth_field: dobField, reference_date: reference, results: res, missing_date_of_birth: missing }];
  } catch (e) { return [false, { error: (e as Error).message }]; }
}

if (import.meta.main) {
  const file = process.argv[2];
  if (!file) { console.log("usage: score_p2.ts <config.json>"); process.exit(2); }
  const config = JSON.parse(readFileSync(file, "utf8"));
  const s = score(config);
  mkdirSync(join(P, "p2", "scores"), { recursive: true });
  const out = join(P, "p2", "scores", basename(file).replace(/\.json$/, ".score.json"));
  writeFileSync(out, JSON.stringify(s, null, 1) + "\n");
  for (const a of s.acceptance) console.log(`${a.verdict.padEnd(13)} ${a.id}  ${a.requirements.join(", ")}`);
  console.log(JSON.stringify(s.summary), "->", out);
}
