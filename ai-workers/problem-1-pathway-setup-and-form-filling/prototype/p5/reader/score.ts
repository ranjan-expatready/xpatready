// Scores reader outputs against the Lead's independent key (expected/reader-c1.json) for the bounded comparison
// (AIW-D271): exact values, right person/meaning, unsupported confident answers, unresolved handling, consistency
// across repeats, correction effort, time and cost. Never used by a reader; reads the key only here.
//   node p5/reader/score.ts [ai run file ...]      local reader is run fresh on the same trials
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readLocal } from "./local.ts";

const P = join(import.meta.dirname, "..", "..");
const key = JSON.parse(readFileSync(join(P, "expected", "reader-c1.json"), "utf8"));
const doc = (id: string) => key.documents.find((d: any) => d.id === id);
const N = (v: unknown) => String(v ?? "").toUpperCase().replace(/[.,]/g, "").replace(/\s+/g, " ").trim();
const ALIAS: Record<string, string> = { IND: "INDIA", INDIAN: "INDIA", FEMALE: "F", MALE: "M" };
const eq = (a: unknown, b: unknown) => { const x = N(a), y = N(b); return x === y || (ALIAS[x] ?? x) === (ALIAS[y] ?? y); };
const RIGHT_ABOUT: Record<string, RegExp> = { passport: /holder|applicant|person|owner/i, job_offer: /employee|addressed|candidate|offer|applicant|recipient|employer/i, birth_certificate: /child|mother|father/i };

export function scoreTrial(t: any, out: any) {
  const d = doc(t.doc), exp = d.fields as Record<string, string>;
  const r = { trial: t.id, doc: t.doc, claimed: t.claimed_type, kind_ok: false, exact: 0, expected: 0, wrong: [] as string[], missing: [] as string[], unsupported_confident: [] as string[], wrong_person_or_meaning: [] as string[], conflicts_flagged: 0, correctly_unresolved: false, corrections: 0 };
  if (!out) { r.missing = Object.keys(exp); r.corrections = r.missing.length; r.expected = r.missing.length; return r; }
  const expectKind = t.claimed_type === "passport" && d.kind !== "passport" ? "job_offer" : d.kind;
  r.kind_ok = out.document.kind_seen === expectKind || (t.doc === "D6" && ["cannot_tell", "passport"].includes(out.document.kind_seen));
  const proposed = (out.fields ?? []).filter((f: any) => f.status === "proposed" && f.value != null);
  if (t.id === "T8" || t.doc === "D6") {
    // wrong type or unreadable: any proposed value is unsupported
    r.unsupported_confident = proposed.filter((f: any) => f.confidence !== "low").map((f: any) => `${f.fact}=${f.value}`);
    r.correctly_unresolved = r.unsupported_confident.length === 0 && (t.id === "T8" ? out.document.matches_claimed_kind === false : out.document.readable !== "yes");
    r.corrections = r.unsupported_confident.length;
    return r;
  }
  for (const [fact, v] of Object.entries(exp)) {
    r.expected++;
    const f = proposed.find((x: any) => x.fact === fact);
    if (!f) { r.missing.push(fact); r.corrections++; continue; }
    if (eq(f.value, v)) r.exact++;
    else { r.wrong.push(`${fact}: ${f.value} (expected ${v})`); r.corrections++; if (f.confidence !== "low") r.unsupported_confident.push(`${fact}=${f.value}`); }
    if (f.about && !RIGHT_ABOUT[d.kind].test(f.about)) r.wrong_person_or_meaning.push(`${fact} about "${f.about}"`);
  }
  // distractor values proposed for the wrong meaning (a signer's title, a letter date, a superseded date)
  for (const dv of Object.values(d.distractors ?? {}) as string[]) for (const f of proposed) if (eq(f.value, dv) && !Object.values(exp).some((v) => eq(v, dv))) r.wrong_person_or_meaning.push(`${f.fact}=${f.value} (a distractor)`);
  if (t.doc === "D7") {
    const dob = (out.fields ?? []).find((x: any) => x.fact === "person.date_of_birth");
    const flagged = (out.internal_conflicts ?? []).some((k: any) => k.fact === "person.date_of_birth");
    r.conflicts_flagged = flagged ? 1 : 0;
    r.correctly_unresolved = flagged && (!dob || dob.status === "unresolved");
    if (dob?.status === "proposed") { r.unsupported_confident.push(`person.date_of_birth=${dob.value} despite the internal conflict`); r.corrections++; }
  }
  return r;
}

function total(rows: any[]) {
  const s = (k: string) => rows.reduce((a, r) => a + (Array.isArray(r[k]) ? r[k].length : Number(r[k]) || 0), 0);
  return { exact: s("exact"), expected: s("expected"), wrong: s("wrong"), missing: s("missing"), unsupported_confident: s("unsupported_confident"), wrong_person_or_meaning: s("wrong_person_or_meaning"), kind_ok: rows.filter((r) => r.kind_ok).length, trials: rows.length, failure_cases_handled: rows.filter((r) => ["T6", "T7", "T8"].includes(r.trial) && r.correctly_unresolved).length, corrections: s("corrections") };
}

if (import.meta.main) {
  const docsDir = join(P, "p5", "reader", "docs");
  const local = key.trials.map((t: any) => { const t0 = Date.now(); const o = readLocal(join(docsDir, doc(t.doc).file), t.claimed_type); return { ...scoreTrial(t, o), ms: Date.now() - t0 }; });
  const result: any = { at: new Date().toISOString(), key: "expected/reader-c1.json", local: { reader: "Tesseract 5.5.0 + PDF text layer + rules", rows: local, total: total(local), cost_usd: 0, seconds: Math.round(local.reduce((a: number, r: any) => a + r.ms, 0) / 1000) }, ai_runs: [] as any[] };
  for (const f of process.argv.slice(2)) {
    const rec = JSON.parse(readFileSync(f, "utf8"));
    const rows = key.trials.map((t: any) => scoreTrial(t, rec.results.find((x: any) => x.trial === t.id)?.output));
    result.ai_runs.push({ run: rec.run_id, rows, total: total(rows), cost_usd: rec.usage.cost_usd, seconds: Math.round(rec.usage.duration_ms / 1000) });
  }
  if (result.ai_runs.length > 1) {
    // consistency: the same proposed value for each (trial, fact) across repeats
    const keys = new Set<string>(), same: string[] = [];
    const vals = (run: any) => new Map<string, string>(run.rows.flatMap((r: any) => []));
    void vals;
    for (const f of process.argv.slice(2)) for (const r of JSON.parse(readFileSync(f, "utf8")).results) for (const x of r.output?.fields ?? []) keys.add(`${r.trial}|${x.fact}`);
    const recs = process.argv.slice(2).map((f) => JSON.parse(readFileSync(f, "utf8")));
    for (const k of keys) { const [tr, fa] = k.split("|"); const vs = recs.map((rec) => rec.results.find((x: any) => x.trial === tr)?.output?.fields.find((x: any) => x.fact === fa)); if (vs.every((v) => v && N(v.value) === N(vs[0].value) && v.status === vs[0].status)) same.push(k); }
    result.consistency = { fields: keys.size, identical_across_runs: same.length };
  }
  writeFileSync(join(P, "p5", "reader", "evidence", "comparison-score.json"), JSON.stringify(result, null, 1) + "\n");
  const line = (name: string, t: any) => `${name}: exact ${t.exact}/${t.expected}, wrong ${t.wrong}, missing ${t.missing}, unsupported confident ${t.unsupported_confident}, wrong person/meaning ${t.wrong_person_or_meaning}, kind ${t.kind_ok}/${t.trials}, failure cases handled ${t.failure_cases_handled}/3, corrections ${t.corrections}`;
  console.log(line("local", result.local.total));
  for (const r of result.ai_runs) console.log(line(`ai ${r.run}`, r.total), `cost US$${r.cost_usd.toFixed(3)}`);
  for (const r of local) if (r.wrong.length || r.missing.length || r.unsupported_confident.length || r.wrong_person_or_meaning.length) console.log(`  local ${r.trial}: wrong ${r.wrong.join("; ")} | missing ${r.missing.join(", ")} | unsupported ${r.unsupported_confident.join("; ")} | person/meaning ${r.wrong_person_or_meaning.join("; ")}`);
}
