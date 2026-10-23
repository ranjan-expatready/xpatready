// Scorer v2 (20 Oct 2026; answers P2-M1, applies D11, D19, D20; v2.1 answers P2-R2-M1, whole-sequence transforms). Scores one assembled P2 draft configuration
// against the corrected keys (expected/*.v2.json) and tests/p2-acceptance.v2.json. Runs OUTSIDE the drafting
// process (it reads expected/). No AI call. The original results stay reproducible with tests/score_p2.v1.ts.
//   node tests/score_p2.ts p2/config/c1-draft-1-live.json     writes p2/scores/v2/<name>.score.json
// Every example ends PASS, FAIL or NOT_EVALUABLE with the evidence; nothing is inferred as passing.
// What changed from v1 (P2-M1): v1 learned which draft fact means which key fact by majority over the very
// boxes it scored, and compared transforms by class; a global family/given-name swap and a day-month swap left
// 42/42. v2 aligns facts through a reviewed alias table decided from each field's DEFINITION (meaning text),
// never from boxes (expected/fact-aliases-c1.json), and checks the exact transformation the key states (date
// format, every code, inversion). A definition not in the table is unreviewed and never counts as correct.
import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { evaluate, type PredicateNode } from "../contracts/rules.ts";

const P = join(import.meta.dirname, "..");
const read = (f: string) => JSON.parse(readFileSync(join(P, f), "utf8"));
export type Verdict = "PASS" | "FAIL" | "NOT_EVALUABLE";
type Entry = { data_path: string; outcome: string; person?: string; fact?: string; row?: number; transform?: string; unresolved_reason?: string };
export type Alias = { key_fact: string; draft_id: string; meaning: string; decision: "same" | "same_inverse" | "different" | "uncertain" };
export type ScoreOptions = { key?: any; aliases?: Alias[]; combination?: any; acceptance?: any; runsDir?: string };
const normMeaning = (m: string) => m.replace(/\s+/g, " ").trim().replace(/\.$/, "").toLowerCase();
const defaults = (): Required<Omit<ScoreOptions, "runsDir">> & { runsDir: string } => ({
  key: read("expected/slice-1-field-map.v2.json"), aliases: read("expected/fact-aliases-c1.json").entries,
  combination: read("expected/combination-1.v2.json"), acceptance: read("tests/p2-acceptance.v2.json"), runsDir: join(P, "p2", "runs"),
});

/** The exact transformation the key states (key v2 `expect`), checked against the draft's transform text.
 *  P2-R2-M1 (Codex 15:36Z): the WHOLE sequence is validated, not one step picked out of it. A transform is
 *  split into steps at top-level ';' and '->' (never inside brackets). The supported sequence is: any number of
 *  record-selection steps ("select:current relationship"), then exactly one core step in the key's exact form,
 *  then nothing, except that a code list may carry one note on an option the list lacks ("this list has no
 *  Conjugal option: ... flagged for review"). Any other step is unsupported and fails; a step that would change
 *  the value (truncate, substring, initials, case change, rounding and the like) fails wherever it appears. */
const codePairsOf = (inner: string): Record<string, string> => {
  const o: Record<string, string> = {};
  for (const part of inner.split(",")) {
    // A draft may add a note after a pair ("Unknown=8; this list has no Conjugal option"): the pair ends at ';'.
    const m = part.split(";")[0].split("=").map((x) => x.trim());
    if (m.length !== 2 || !m[0] || !m[1]) continue;
    const [a, b] = /^[0-9]+$/.test(m[0]) ? [m[1], m[0]] : [m[0], m[1]];
    if (/^[0-9]+$/.test(b)) o[a.toLowerCase().replace(/\s+/g, " ")] = b;
  }
  return o;
};
/** The first bracketed group of a step and what follows it, brackets balanced. */
function bracket(step: string): { head: string; inner: string; tail: string } | null {
  const i = step.indexOf("(");
  if (i < 0) return null;
  let depth = 0;
  for (let j = i; j < step.length; j++) {
    if (step[j] === "(") depth++;
    else if (step[j] === ")" && --depth === 0) return { head: step.slice(0, i).trim(), inner: step.slice(i + 1, j), tail: step.slice(j + 1).trim() };
  }
  return null;
}
export function transformSteps(t: string): string[] {
  const out: string[] = [];
  let depth = 0, cur = "";
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth = Math.max(0, depth - 1);
    if (depth === 0 && (ch === ";" || (ch === "-" && t[i + 1] === ">"))) { out.push(cur.trim()); cur = ""; if (ch === "-") i++; continue; }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}
const SELECT = /^select[: ]\s*\S/i;
export const DESTRUCTIVE = /\b(truncat\w*|substr\w*|slice|left\s*\(|right\s*\(|first\s+\d+|last\s+\d+|abbreviat\w*|initials?|mask\w*|strip\w*|remove\w*|drop\w*|replace\w*|round\w*|pad\w*|upper\w*|lower\w*|hash\w*|redact\w*|shorten\w*|limit:|max_len\w*)\b/i;
const isOptionNote = (n: string) => /\b(no|only)\b[^.;:]*\boptions?\b/i.test(n) && !DESTRUCTIVE.test(n) && !/^[a-z_]+:/i.test(n);
const NO_CHILDREN = /^(derive_inverse|derive):\s*1 when the subject has no (recorded )?child(ren| records)(,\s*(else 0|0 when any child exists))?$/i;
const withoutComments = (step: string) => step.replace(/\s*\([^()]*\)/g, "").trim();

export function transformExact(expect: any, t: string | undefined, decision?: string): { ok: boolean; why?: string } {
  const s = (t ?? "").trim();
  if (!expect?.kind) return { ok: true };
  const no = (why: string) => ({ ok: false, why: `${why}; got '${s}'` });
  const all = transformSteps(s);
  if (all.some((x) => !x)) return no("an empty transformation step");
  let i = 0;
  while (i < all.length - 1 && SELECT.test(all[i])) i++;
  const selects = all.slice(0, i), core = all[i], after = all.slice(i + 1);
  if (core === undefined || SELECT.test(core)) return no("a record selection without a transformation");
  const bad = [...selects, core, ...after].find((x) => DESTRUCTIVE.test(expect.kind === "code_list" ? (bracket(x)?.head ?? x) + " " + (bracket(x)?.tail ?? "") : x));
  if (bad) return no(`a step that would change the value ('${bad}')`);
  // Only a code list may carry one trailing note, and only about an option the list lacks.
  const notes = expect.kind === "code_list" ? after : [];
  if (after.length && !(notes.length === 1 && isOptionNote(notes[0]))) return no(`unsupported step '${after[0]}' after the ${expect.kind} step`);
  switch (expect.kind) {
    case "text_as_is": return /^as_is( \(max \d+ chars\))?$/.test(core) ? { ok: true } : no("expected the text unchanged");
    case "date":
      // A compound transform may select first ("select:current relationship; date:YYYY-MM-DD", found in trial 1):
      // then exactly one date step, in exactly the key's format, and nothing after it.
      return core === `date:${expect.format}` ? { ok: true } : no(`expected date:${expect.format}`);
    case "country_name_text": return /^country_name(_text)?$/.test(core) ? { ok: true } : no("expected the country's name as text");
    case "address_single_line": return /^address_(single_line|single_text|one_line_text|one_line)$/.test(core) ? { ok: true } : no("expected the address on one line");
    case "yes_no_code": {
      const m = core.match(/^yes_no_code:(\d+)\/(\d+)$/), b = bracket(core);
      const pairs = m ? { yes: m[1], no: m[2] } : b && /^yes_no_code$/.test(b.head) && !b.tail ? codePairsOf(b.inner) : {} as Record<string, string>;
      return pairs.yes === expect.codes.yes && pairs.no === expect.codes.no ? { ok: true } : no(`expected YES=${expect.codes.yes}, NO=${expect.codes.no}`);
    }
    case "code_list": {
      const b = bracket(core);
      if (!b || !/^code_list:[A-Za-z0-9_.]+$/.test(b.head)) return no("expected a code list with its codes");
      // A note may also follow the list after a full stop ("...Unknown=8). This list has no Conjugal option ...").
      if (b.tail && !(after.length === 0 && /^\.\s*/.test(b.tail) && isOptionNote(b.tail.replace(/^\.\s*/, "")))) return no(`unsupported text '${b.tail}' after the code list`);
      const got = codePairsOf(b.inner);
      const wrong = Object.entries(expect.codes as Record<string, string>).filter(([l, c]) => got[l] !== c);
      return wrong.length ? no(`codes differ or are not stated: ${wrong.map(([l, c]) => `${l}=${c} (draft ${got[l] ?? "none"})`).join(", ")}`) : { ok: true };
    }
    case "derived_no_children": {
      // A has-children field must be inverted; a field that itself means 'has no children' is written as is.
      const c = withoutComments(core);
      if (decision === "same_inverse") return NO_CHILDREN.test(c) ? { ok: true } : no("expected 1 when the subject has no children (the inverse of has-children)");
      return NO_CHILDREN.test(c) || /^(derive:1 when true(,\s*else 0)?|as_is|checkbox:1)$/i.test(c) ? { ok: true } : no("expected 1 when the 'no children' fact is true");
    }
    case "date_part": return core === `date_part:${expect.part}` ? { ok: true } : no(`expected date_part:${expect.part}`);
    default: return no(`no exact check for the key's '${expect.kind}' transformation`);
  }
}

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

export function scoreFieldMaps(config: any, opts: ScoreOptions = {}) {
  const o = { ...defaults(), ...opts };
  const key = o.key;
  const mapFor = (form: string) => config.field_maps.find((m: any) => String(m.form_edition).startsWith(form + " "));
  // Each draft fact's definition: the assembled configuration's (what the product would use), and the one in
  // the run that drafted the map (the model's own words), so an assembly defect is told apart from a model one.
  const assembled = new Map<string, string>((config.canonical_fields ?? []).map((f: any) => [f.id, normMeaning(f.meaning)]));
  const runLocal = new Map<string, Map<string, string>>();
  for (const m of config.field_maps ?? []) {
    const f = join(o.runsDir, `${m.drafting_run_id}.json`);
    if (!m.drafting_run_id || !existsSync(f)) continue;
    try { runLocal.set(m.drafting_run_id, new Map(JSON.parse(JSON.parse(readFileSync(f, "utf8")).raw_output).canonical_fields.map((x: any) => [x.id, normMeaning(x.meaning)]))); } catch { /* not a field-map run */ }
  }
  const aliasOf = (keyFact: string, id: string | undefined, meaning: string | undefined) =>
    !id || meaning === undefined ? "missing" : (o.aliases.find((x) => x.key_fact === keyFact && x.draft_id === id && x.meaning === meaning)?.decision ?? "unreviewed");
  const factOk = (d: string) => d === "same" || d === "same_inverse";

  const instances = key.instances.map((inst: any) => {
    const m = mapFor(inst.form);
    const rows: any[] = [];
    for (const k of inst.entries) {
      const d: Entry | undefined = m?.entries.find((e: Entry) => e.data_path === k.data_path && (e.row ?? 0) === 0);
      const exp = k.expected_outcome ?? expectedOutcome(k);
      const person = casePerson(d?.person, inst.subject, k.data_path);
      const decision = aliasOf(k.fact, d?.fact, d?.fact ? assembled.get(d.fact) : undefined);
      // Run-local: the definition in the run that drafted this map; for a field merged by the review, the run's
      // definition of the id it used before the merge (recorded in the canonical field's aliases).
      const rl = runLocal.get(m?.drafting_run_id);
      const merged = (config.canonical_fields ?? []).find((f: any) => f.id === d?.fact)?.aliases?.map((x: any) => x.id) ?? [];
      const rlId = d?.fact ? [d.fact, ...merged].find((x) => rl?.has(x)) : undefined;
      const decisionRun = aliasOf(k.fact, rlId, rlId ? rl!.get(rlId) : undefined);
      const tx = exp === "mapped" ? transformExact(k.expect, d?.transform, decision) : { ok: true };
      // D11: a relationship-owned fact has no person scope in the mapping contract; a named dependency.
      const dependency = exp === "mapped" && k.owner === "relationship" && d?.outcome === "mapped" && !/relationship|couple/.test(String(d.person))
        ? `relationship-owned fact drafted for '${d.person}': the mapping contract cannot name the couple's relationship record; resolved in the case from either form subject (D11)` : null;
      const r = {
        data_path: k.data_path, key_person: k.person, key_fact: k.fact, draft_outcome: d?.outcome ?? "missing", draft_person: d?.person, draft_fact: d?.fact, draft_row: d?.row, draft_transform: d?.transform,
        outcome_ok: d?.outcome === exp,
        // wrong person = drafted as mapped to someone else; a box the draft did not map is an outcome miss, counted there
        person_ok: exp !== "mapped" || d?.outcome !== "mapped" || dependency !== null || person === k.person || (k.owner === "relationship" && /relationship|couple/.test(String(d?.person))),
        fact_decision: exp === "mapped" ? decision : null, fact_decision_run_local: exp === "mapped" ? decisionRun : null,
        fact_ok: exp !== "mapped" || factOk(decision),
        fact_ok_run_local: exp !== "mapped" || factOk(decisionRun),
        row_ok: exp !== "mapped" || (d?.row ?? 0) === 0,
        transform_ok: tx.ok, transform_why: tx.ok ? null : tx.why,
        invented: exp === "unresolved" && d?.outcome === "mapped",
        dependency,
      };
      rows.push({ ...r, all_ok: r.outcome_ok && r.person_ok && r.fact_ok && r.row_ok && r.transform_ok && !dependency });
    }
    const n = (f: string) => rows.filter((r) => r[f]).length;
    // Parent blocks: each block one parent role, the two blocks different.
    const block = (b: string) => new Set(rows.filter((r) => r.data_path.includes(`.${b}[0].`) && r.draft_outcome === "mapped").map((r) => r.draft_person));
    const p1 = block("Parent1"), p2 = block("Parent2");
    const parentsOk = inst.form !== "IMM 5707" || (p1.size === 1 && p2.size === 1 && [...p1][0] !== [...p2][0] && [...p1, ...p2].every((p) => /parent/.test(String(p))));
    return { form: inst.form, subject: inst.subject, entries: rows.length, outcome_ok: n("outcome_ok"), person_ok: n("person_ok"), fact_ok: n("fact_ok"), fact_ok_run_local: n("fact_ok_run_local"), row_ok: n("row_ok"), transform_ok: n("transform_ok"), all_ok: n("all_ok"), invented: n("invented"),
      dependencies: rows.filter((r) => r.dependency).map((r) => ({ box: r.data_path, why: r.dependency })),
      fact_problems: rows.filter((r) => !r.fact_ok).map((r) => ({ box: r.data_path, key: r.key_fact, draft: r.draft_fact, decision: r.fact_decision, run_local: r.fact_decision_run_local })),
      transform_problems: rows.filter((r) => !r.transform_ok).map((r) => ({ box: r.data_path, why: r.transform_why })),
      wrong_person: rows.filter((r) => !r.person_ok).map((r) => ({ box: r.data_path, key: r.key_person, draft: r.draft_person })), parent_blocks_ok: parentsOk, missing: rows.filter((r) => r.draft_outcome === "missing").length, rows };
  });
  // Alignment (reported): for each key fact, the draft facts drafted on its boxes and accepted by the table.
  const align: Record<string, string[]> = {};
  const draftedFor = new Map<string, Set<string>>();
  for (const i of instances) for (const r of i.rows) if (r.draft_outcome === "mapped" && r.draft_fact) {
    if (r.fact_ok) (align[r.key_fact] ??= []).includes(r.draft_fact) || align[r.key_fact].push(r.draft_fact);
    (draftedFor.get(r.draft_fact) ?? draftedFor.set(r.draft_fact, new Set()).get(r.draft_fact)!).add(r.key_fact);
  }
  // A draft field drafted on the boxes of two different key facts merges meanings (P2-FM-03).
  const merged = [...draftedFor].filter(([, ks]) => ks.size > 1).map(([df, ks]) => ({ draft_fact: df, key_facts: [...ks] }));
  return { alignment: align, merged_meanings: merged, instances };
}

// ---- Requirements against combination-1.json; pre-registered matchers (written before any live run).
const FORMS: Record<string, { match: RegExp; status: string[]; who: string[] }> = {
  "IMM 1295": { match: /^IMM ?1295$/i, status: ["always"], who: ["each_applicant", "each_work_permit_applicant"] },
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

export function score(config: any, opts: ScoreOptions = {}) {
  const o = { ...defaults(), ...opts };
  const fm = scoreFieldMaps(config, o);
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
  const dobs = fm.alignment["person.date_of_birth"] ?? [];
  const dob = dobs.length === 1 ? dobs[0] : undefined;
  const dobPersons = new Set(fm.instances.flatMap((i: any) => i.rows.filter((r: any) => r.key_fact === "person.date_of_birth" && r.draft_fact === dob && r.fact_ok).map((r: any) => `${i.subject}:${r.key_person}`)));
  set("fm_one_meaning", fmEmpty ? null : !!dob && fm.merged_meanings.length === 0 && dobPersons.size >= 5, { date_of_birth_fields: dobs, used_for: [...dobPersons], merged_meanings: fm.merged_meanings });
  set("fm_parent_blocks", fmEmpty ? null : fm.instances.every((i: any) => i.parent_blocks_ok), fm.instances.map((i: any) => ({ form: i.form, subject: i.subject, ok: i.parent_blocks_ok })));
  const invented = fm.instances.reduce((a: number, i: any) => a + i.invented, 0);
  set("fm_invented", fmEmpty ? null : invented === 0, { invented });
  const childRows = fm.instances.flatMap((i: any) => i.rows.filter((r: any) => r.key_person === "child" && r.draft_outcome === "mapped"));
  set("fm_rows", fmEmpty ? null : childRows.length > 0 && childRows.every((r: any) => (r.draft_row ?? 0) === 0), { child_entries: childRows.length });
  const ms = fm.instances.flatMap((i: any) => i.rows.filter((r: any) => r.key_fact === "person.marital_status" && /IMM_5707|form1/.test(r.data_path) && (r.key_person === i.subject)).map((r: any) => ({ form: i.form, transform: r.draft_transform })));
  // Exact codes from the key (P2-M1): every code of each form's list, not just 'names a code list'.
  const msRows = fm.instances.flatMap((i: any) => i.rows.filter((r: any) => r.key_fact === "person.marital_status").map((r: any) => ({ form: i.form, subject: i.subject, box: r.data_path, transform: r.draft_transform, ok: r.transform_ok, why: r.transform_why })));
  set("fm_codes", fmEmpty ? null : msRows.some((x: any) => x.form === "IMM 5707") && msRows.some((x: any) => x.form === "IMM 1295") && msRows.every((x: any) => x.ok), { marital_status_transforms: msRows });
  // P2-M1: a bar. Every key entry right on outcome, person, fact (by meaning), row and exact transform; named dependencies listed.
  const errors = fm.instances.reduce((a: number, i: any) => a + i.rows.filter((r: any) => !(r.outcome_ok && r.person_ok && r.fact_ok && r.row_ok && r.transform_ok)).length, 0);
  set("fm_accuracy", fmEmpty ? null : errors === 0, { entries_with_errors: errors, dependencies: fm.instances.flatMap((i: any) => i.dependencies), per_instance: fm.instances.map(({ rows: _r, wrong_person: _w, ...i }: any) => i) });
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
  // D20: IMM 1295's 'who' must cover every scenario application that uses it (Client A and the partner).
  const apps = (o.combination.scenario?.applications ?? []).filter((a: any) => a.uses_form === "IMM 1295").map((a: any) => a.person);
  const f1295 = formRes.find((f) => f.form === "IMM 1295");
  const covers = (who: string | undefined, person: string) => who === "each_applicant" || who === "each_work_permit_applicant" || (who === "principal_applicant" && person === "client-a");
  const scenarioOk = !f1295?.found || apps.every((p: string) => covers(f1295.who, p));
  set("rq_forms", forms.length ? formRes.every((f) => f.ok) && scenarioOk : null, { forms: formRes, imm1295_applications: apps, imm1295_covers_each: scenarioOk });
  set("rq_age_rule", ...ageRule(config, forms, o));
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

  const acceptance = o.acceptance.examples.map((e: any) => ({ id: e.id, slice: e.slice, requirements: e.requirements.map((r: any) => r.id), ...(R[e.measure] ?? { verdict: "NOT_EVALUABLE", evidence: "no measure" }) }));
  const count = (v: Verdict) => acceptance.filter((a: any) => a.verdict === v).length;
  return { configuration_version: config.configuration_version, summary: { PASS: count("PASS"), FAIL: count("FAIL"), NOT_EVALUABLE: count("NOT_EVALUABLE") }, acceptance, field_maps: fm };
}

/** P2-RQ-03 (D19): the drafted IMM 5707 condition on the eight cases of combination-1.v2, fields translated through
 *  the reviewed alias table (date of birth, travelling alone). Test values, not family values. */
function ageRule(config: any, forms: any[], o: ReturnType<typeof defaults>): [boolean | null, unknown] {
  const f = forms.find((y) => /^IMM ?5707$/i.test(String(y.form_number).trim()));
  if (!f) return [null, "IMM 5707 not in the draft"];
  if (!f.condition) return [f.who === "each_adult_18_plus" ? null : false, { note: "no structured condition; 'who' carries the age rule", who: f.who }];
  const derived = (config.derived_fields ?? []).filter((d: any) => d.executable);
  const fieldFor = (keyFact: string) => (config.canonical_fields ?? []).find((c: any) => o.aliases.some((a) => a.key_fact === keyFact && a.draft_id === c.id && a.meaning === normMeaning(c.meaning) && a.decision === "same"))?.id;
  const dobField = fieldFor("person.date_of_birth"), aloneField = fieldFor("person.travelling_alone_to_canada");
  const reference = "2026-10-20";
  const cases = (o.combination.expected_forms.find((x: any) => x.form === "IMM 5707").cases as any[]).map((c) => ({ ...c, date_of_birth: c.date_of_birth === undefined ? `${2026 - c.age_on_reference}-04-12` : c.date_of_birth }));
  const facts = (dob: string | null, alone: boolean | null) => {
    const x: Record<string, unknown> = {};
    // Only a case-level reference date is the test's reference date; a derived field whose reference is a person
    // fact (one draft measures passport issue from the date of birth) must not overwrite that fact. Scorer defect
    // found by the D19 missing-date-of-birth case on the live draft, 20 Oct 2026 (v1 had it, masked by the absent travel answer).
    for (const d of derived) { for (const i of d.inputs) if (i === dobField && dob) x[i] = dob; if (String(d.reference).startsWith("case.")) x[d.reference] = reference; }
    if (dobField && dob) x[dobField] = dob;
    if (aloneField && alone !== null) x[aloneField] = alone;
    return x;
  };
  try {
    const tree = (({ subjectKind: _s, ...n }) => n)(f.condition) as PredicateNode;
    const res = cases.map((c) => ({ case: c.case, expected: c.expected, got: evaluate(tree, facts(c.date_of_birth, c.travelling_alone), derived).result }));
    return [res.every((r) => r.got === r.expected), { date_of_birth_field: dobField, travelling_alone_field: aloneField, reference_date: reference, results: res }];
  } catch (e) { return [false, { error: (e as Error).message }]; }
}

if (import.meta.main) {
  const file = process.argv[2];
  if (!file) { console.log("usage: score_p2.ts <config.json>"); process.exit(2); }
  const config = JSON.parse(readFileSync(file, "utf8"));
  const s = { scorer: "v2", keys: { field_map: "expected/slice-1-field-map.v2.json", combination: "expected/combination-1.v2.json", aliases: "expected/fact-aliases-c1.json", acceptance: "tests/p2-acceptance.v2.json" }, ...score(config) };
  mkdirSync(join(P, "p2", "scores", "v2"), { recursive: true });
  const out = join(P, "p2", "scores", "v2", basename(file).replace(/\.json$/, ".score.json"));
  writeFileSync(out, JSON.stringify(s, null, 1) + "\n");
  for (const a of s.acceptance) console.log(`${a.verdict.padEnd(13)} ${a.id}  ${a.requirements.join(", ")}`);
  console.log(JSON.stringify(s.summary), "->", out);
}
