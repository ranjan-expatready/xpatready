// The 100-program usability exercise (D279/D283/D285): an ISOLATED copy (tools/isolated.sh scale 4401) gets the five
// meaningful sample programs plus 100 clearly labelled SYNTHETIC programs with 1–6 categories each, some with
// sub-categories. Structure, rows, requirements, submissions and releases go through the normal API services as the
// simulated author / SME reviewer / approver. Two shortcuts are labelled: form lines are inserted directly in SQL
// (attaching 300 copies of official PDFs would only bloat the copy), and a few rows get an injected invalid condition
// so the catalogue has real "draft problem" states to find. No immigration content is claimed for synthetic rows.
//   zsh studio/tools/isolated.sh scale 4401 start && tsx studio/tests/fixtures/scale_100.ts 4401
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PORT = Number(process.argv[2] ?? 4401), DB = "xr_studio_scale";
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const call = async (method: string, path: string, body?: unknown, actor = "user-A", retry = true): Promise<any> => {
  let r: Response;
  try { r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) }); }
  catch (e) { if (retry && /ECONNRESET|fetch failed/.test(String((e as any)?.cause?.code ?? e))) return call(method, path, body, actor, false); throw e; } // an idle keep-alive socket closed by the server
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error(`${method} ${path} → ${r.status} ${j?.message ?? ""}`);
  return j;
};
const AREAS = ["Work permits", "Study permits", "Visitors", "Family sponsorship", "Economic immigration", "Citizenship", "Refugee protection", "Business immigration", "Caregivers", "Agri-food"];
const CATS = ["Standard application", "Renewal", "Extension", "Priority stream", "Regional pilot", "Bridging application"];
const SUBS = ["Variant A", "Variant B"];
const FORMS = ["IMM 5707", "IMM 5476", "IMM 5475", "IMM 1295", "IMM 5409", "IMM 5488"];

(async () => {
  const t0 = Date.now();
  await call("POST", "/demo/load");
  const ws = sql("select id from workspace limit 1");
  const formDef = new Map(sql("select form_key||'|'||id from gov_form_def").split("\n").filter(Boolean).map((l) => l.split("|") as [string, string]));
  const rows: { id: string; key: string; n: number }[] = [];
  for (let i = 1; i <= 100; i++) {
    const n = String(i).padStart(3, "0");
    const pathway = i % 10 < 7 ? "individual" : "corporate";
    const area = AREAS[i % AREAS.length];
    const label = i === 42 ? `Synthetic ${n} · ${area}: an intentionally very long program name used to check wrapping, truncation and readable layout at narrow widths` : `Synthetic ${n} · ${area}`;
    const prog = await call("POST", "/programs", { kind: "PROGRAM", label, parentKey: pathway, key: `${pathway}.synthetic_${n}`, sourceBasis: "ILLUSTRATIVE", description: "SYNTHETIC program for the 100-program usability exercise; no immigration content." });
    const cats = 1 + ((i * 7) % 6);
    for (let c = 0; c < cats; c++) {
      const cat = await call("POST", "/programs", { kind: "STREAM", label: CATS[c], parentKey: prog.programNodeKey, key: `${prog.programNodeKey}.c${c + 1}`, allowedLocations: c % 2 ? ["inside_canada", "outside_canada"] : ["outside_canada"], sourceBasis: "ILLUSTRATIVE" });
      const leaves = i % 7 === 0 && c === 0 ? await Promise.all(SUBS.map((s, k) => call("POST", "/programs", { kind: "CATEGORY", label: s, parentKey: cat.programNodeKey, key: `${cat.programNodeKey}.s${k + 1}`, sourceBasis: "ILLUSTRATIVE" }))) : [cat];
      for (const leaf of leaves) {
        const row = await call("POST", "/combinations", { programKey: leaf.programNodeKey, key: `syn.${n}.${leaf.programNodeKey.split(".").slice(-1)[0]}${leaf === cat ? "" : `.${c + 1}`}`, participants: [{ role: "principal", label: "Principal applicant", min: 1, max: 1 }, { role: "spouse_or_partner", label: "Spouse or partner", min: 0, max: 1, preview: (i + c) % 2 }], sourceBasis: "ILLUSTRATIVE", basisNote: "SYNTHETIC row (100-program exercise): structure and states only; no immigration content." });
        rows.push({ id: row.id, key: row.combinationKey, n: rows.length });
      }
    }
  }
  // Form lines (labelled shortcut): 1–3 library forms per synthetic row, as draft lines.
  for (const r of rows) {
    const picks = [...new Set([FORMS[r.n % FORMS.length], FORMS[(r.n * 5 + 1) % FORMS.length], ...(r.n % 3 ? [] : [FORMS[(r.n + 2) % FORMS.length]])])].filter((f) => formDef.has(f));
    for (const f of picks) sql(`insert into combination_form (id, workspace_id, combination_id, gov_form_def_id, lineage_key, who, attach_mode, version, status, origin, updated_by, source_quote) values (gen_random_uuid(), '${ws}', '${r.id}', '${formDef.get(f)}', '${f}', 'each_applicant', 'COMBINATION_MANDATORY', 1, 'DRAFT', 'HUMAN', 'user-A', 'SYNTHETIC form line (fixture shortcut)')`);
  }
  // States through the normal services: a base requirement on every row; every third row released (author submits,
  // SME signs, approver releases); every ninth released row then gets a draft change; every eleventh other row waits
  // in review; every thirteenth row gets an injected invalid condition (a labelled draft problem).
  let released = 0, drafted = 0, inReview = 0, problems = 0;
  for (const r of rows) {
    await call("POST", `/combinations/${r.id}/requirements`, { newTypeName: "Passport (synthetic)", attachMode: "COMBINATION_MANDATORY", appliesToRoles: "each_applicant", sourceQuote: "SYNTHETIC" });
    if (r.n % 3 === 0) {
      await call("POST", `/combinations/${r.id}/submit`, {});
      const sub = await call("GET", `/combinations/${r.id}/review`);
      const sme = sub.submission.changeSummary.filter((x: any) => x.needs_sme).map((x: any) => `${x.kind}|${x.key}`);
      if (sme.length) await call("POST", `/combinations/${r.id}/signoff`, { items: sme, action: "signed" }, "user-C");
      await call("POST", `/combinations/${r.id}/approve`, {}, "user-B"); released++;
      if (r.n % 9 === 0) { await call("POST", `/combinations/${r.id}/requirements`, { newTypeName: "Bank statement (synthetic)", attachMode: "COMBINATION_MANDATORY", appliesToRoles: "principal_applicant", sourceQuote: "SYNTHETIC" }); drafted++; }
    } else if (r.n % 11 === 0) { await call("POST", `/combinations/${r.id}/submit`, {}); inReview++; }
    if (r.n % 13 === 0) { sql(`update document_requirement set attach_mode='ANSWER_CONDITIONAL', predicate_json='{"op":"eq","field":"person.synthetic_missing_field","value":true}'::jsonb, condition_plain='SYNTHETIC injected defect' where combination_id='${r.id}' and status='DRAFT' and id=(select id from document_requirement where combination_id='${r.id}' and status='DRAFT' limit 1)`); problems++; }
  }
  const cat = await call("GET", "/catalogue");
  const summary = { at: new Date().toISOString(), seconds: Math.round((Date.now() - t0) / 1000), programs: cat.totals.programs, rows: cat.totals.combinations, synthetic_programs: 100, synthetic_rows: rows.length, released, draft_changes_after_release: drafted, in_review: inReview, injected_problems: problems, catalogue_server_ms: cat.timing_ms, payload_bytes: JSON.stringify(cat).length };
  const out = join(import.meta.dirname, "..", "..", "evidence", "scale-100"); mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "fixture-summary.json"), JSON.stringify(summary, null, 1));
  console.log(JSON.stringify(summary, null, 1));
})().catch((e) => { console.error(e); process.exit(1); });
