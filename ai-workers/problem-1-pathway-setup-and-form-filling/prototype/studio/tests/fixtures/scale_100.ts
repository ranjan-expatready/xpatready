// The 100-program usability exercise (D279/D283/D285): an ISOLATED copy (tools/isolated.sh scale 4401) gets the five
// meaningful sample programs plus 100 clearly labelled SYNTHETIC programs with 1–6 categories each, some with
// sub-categories. Structure goes through the Screen 01 Layout v2 API (POST /program-nodes, then POST /combinations
// {nodeKey}; the server chooses every key, so they are read back from its answers); requirements, submissions and
// releases go through the normal services as the simulated author / SME reviewer / approver. Three shortcuts are
// labelled: (1) synthetic nodes and rows are marked ILLUSTRATIVE with a SYNTHETIC note directly in SQL (the API no
// longer takes a source basis from the caller); (2) form lines are inserted directly in SQL (attaching 300 copies of
// official PDFs would only bloat the copy); (3) a few rows get an injected invalid condition so the catalogue has real
// "draft problem" states to find. No immigration content is claimed for synthetic rows.
//   zsh studio/tools/isolated.sh scale 4401 start && tsx studio/tests/fixtures/scale_100.ts 4401 [database, default xr_studio_scale]
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PORT = Number(process.argv[2] ?? 4401), DB = process.argv[3] ?? "xr_studio_scale";
if (!/^xr_studio_[a-z0-9_]+$/.test(DB) || DB === "xr_studio_demo") throw new Error(`refused database name ${DB}: an isolated xr_studio_<name> copy only, never the demo`);
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const call = async (method: string, path: string, body?: unknown, actor = "user-A", tries = 4): Promise<any> => {
  let r: Response;
  try { r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) }); }
  catch (e) { if (tries > 1 && /ECONNRESET|EPIPE|fetch failed/.test(String((e as any)?.cause?.code ?? e))) { await new Promise((ok) => setTimeout(ok, 500)); return call(method, path, body, actor, tries - 1); } throw e; } // idle keep-alive sockets closed by the server (a busy machine: several in a row)
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error(`${method} ${path} → ${r.status} ${j?.detail ?? j?.message ?? ""}`);
  return j;
};
const AREAS = ["Work permits", "Study permits", "Visitors", "Family sponsorship", "Economic immigration", "Citizenship", "Refugee protection", "Business immigration", "Caregivers", "Agri-food"];
const CATS = ["Standard application", "Renewal", "Extension", "Priority stream", "Regional pilot", "Bridging application"];
const SUBS = ["Variant A", "Variant B"];
const FORMS = ["IMM 5707", "IMM 5476", "IMM 5475", "IMM 1295", "IMM 5409", "IMM 5488"];
const q = (s: string) => s.replace(/'/g, "''");

(async () => {
  const t0 = Date.now();
  await call("POST", "/demo/load");
  const ws = sql("select id from workspace limit 1");
  const pathwayKey = Object.fromEntries(sql(`select client_type||'|'||program_node_key from program_def where workspace_id='${ws}' and node_kind='PATHWAY'`).split("\n").filter(Boolean).map((l) => l.split("|") as [string, string]));
  const formDef = new Map(sql(`select form_key||'|'||id from gov_form_def where workspace_id='${ws}'`).split("\n").filter(Boolean).map((l) => l.split("|") as [string, string]));
  const rows: { id: string; key: string; n: number }[] = [];
  const nodeKeys: string[] = [];
  const node = async (kind: "PROGRAM" | "STREAM" | "CATEGORY", parentKey: string, label: string) => { const n = await call("POST", "/program-nodes", { kind, parentKey, label }); nodeKeys.push(n.programNodeKey); return n.programNodeKey as string; };
  for (let i = 1; i <= 100; i++) {
    const n = String(i).padStart(3, "0");
    const pathway = i % 10 < 7 ? "INDIVIDUAL" : "CORPORATE";
    const area = AREAS[i % AREAS.length];
    // Names are at most 120 characters (contracts/programs.ts LABEL_MAX); #42 is the longest allowed, for wrapping checks.
    const label = i === 42 ? `Synthetic ${n} · ${area}: an intentionally long program name used to check wrapping and readable layout at narrow widths` : `Synthetic ${n} · ${area}`;
    const prog = await node("PROGRAM", pathwayKey[pathway], label);
    const cats = 1 + ((i * 7) % 6);
    for (let c = 0; c < cats; c++) {
      const cat = await node("STREAM", prog, CATS[c]);
      const leaves = i % 7 === 0 && c === 0 ? [await node("CATEGORY", cat, SUBS[0]), await node("CATEGORY", cat, SUBS[1])] : [cat];
      for (const leaf of leaves) {
        const r = await call("POST", "/combinations", { nodeKey: leaf, allowedLocations: c % 2 ? ["inside_canada", "outside_canada"] : ["outside_canada"], participants: [{ role: "principal", label: "Principal applicant", min: 1, max: 1, preview: 1 }, { role: "spouse_or_partner", label: "Spouse or partner", min: 0, max: 1, preview: (i + c) % 2 }] });
        rows.push({ id: r.combination.id, key: r.combination.combinationKey, n: rows.length });
      }
    }
  }
  // Shortcut (1), labelled: the synthetic structure says what it is.
  sql(`update program_def set source_basis='ILLUSTRATIVE', description='SYNTHETIC node for the 100-program usability exercise; no immigration content.' where workspace_id='${ws}' and program_node_key in (${nodeKeys.map((k) => `'${q(k)}'`).join(",")})`);
  sql(`update combination set source_basis='ILLUSTRATIVE', basis_note='SYNTHETIC row (100-program exercise): structure and states only; no immigration content.' where id in (${rows.map((r) => `'${r.id}'`).join(",")})`);
  // Shortcut (2), labelled: 1–3 library forms per synthetic row, as draft lines.
  const lines = rows.flatMap((r) => [...new Set([FORMS[r.n % FORMS.length], FORMS[(r.n * 5 + 1) % FORMS.length], ...(r.n % 3 ? [] : [FORMS[(r.n + 2) % FORMS.length]])])].filter((f) => formDef.has(f))
    .map((f) => `(gen_random_uuid(), '${ws}', '${r.id}', '${formDef.get(f)}', '${f}', 'each_applicant', 'COMBINATION_MANDATORY', 1, 'DRAFT', 'HUMAN', 'user-A', 'SYNTHETIC form line (fixture shortcut)')`));
  if (lines.length) sql(`insert into combination_form (id, workspace_id, combination_id, gov_form_def_id, lineage_key, who, attach_mode, version, status, origin, updated_by, source_quote) values ${lines.join(", ")}`); // one statement, not one psql per line
  // States through the normal services: a base requirement on every row; every third row released (author submits,
  // SME signs, approver releases); every ninth released row then gets a draft change; every eleventh other row waits
  // in review; every thirteenth row gets an injected invalid condition (shortcut (3), a labelled draft problem).
  let released = 0, drafted = 0, inReview = 0, problems = 0;
  const refused: string[] = [];
  for (const r of rows) {
    await call("POST", `/combinations/${r.id}/requirements`, { newTypeName: "Passport (synthetic)", attachMode: "COMBINATION_MANDATORY", appliesToRoles: "each_applicant", sourceQuote: "SYNTHETIC" });
    if (r.n % 3 === 0) {
      try {
        await call("POST", `/combinations/${r.id}/submit`, {});
        const sub = await call("GET", `/combinations/${r.id}/review`);
        const sme = sub.submission.changeSummary.filter((x: any) => x.needs_sme).map((x: any) => `${x.kind}|${x.key}`);
        if (sme.length) await call("POST", `/combinations/${r.id}/signoff`, { items: sme, action: "signed" }, "user-C");
        await call("POST", `/combinations/${r.id}/approve`, {}, "user-B"); released++;
      } catch (e) { refused.push(`${r.key}: ${(e as Error).message}`); continue; }
      if (r.n % 9 === 0) { await call("POST", `/combinations/${r.id}/requirements`, { newTypeName: "Bank statement (synthetic)", attachMode: "COMBINATION_MANDATORY", appliesToRoles: "principal_applicant", sourceQuote: "SYNTHETIC" }); drafted++; }
    } else if (r.n % 11 === 0) { await call("POST", `/combinations/${r.id}/submit`, {}); inReview++; }
    if (r.n % 13 === 0) { sql(`update document_requirement set attach_mode='ANSWER_CONDITIONAL', predicate_json='{"op":"eq","field":"person.synthetic_missing_field","value":true}'::jsonb, condition_plain='SYNTHETIC injected defect' where combination_id='${r.id}' and status='DRAFT' and id=(select id from document_requirement where combination_id='${r.id}' and status='DRAFT' limit 1)`); problems++; }
  }
  const [ind, cor] = [await call("GET", "/catalogue?pathway=INDIVIDUAL&filter=all"), await call("GET", "/catalogue?pathway=CORPORATE&filter=all")];
  const summary = { at: new Date().toISOString(), database: DB, seconds: Math.round((Date.now() - t0) / 1000), programs: ind.totals.programs + cor.totals.programs, rows: ind.totals.combinations + cor.totals.combinations,
    synthetic_programs: 100, synthetic_rows: rows.length, released, release_refused: refused.length, release_refused_first: refused.slice(0, 3), draft_changes_after_release: drafted, in_review: inReview, injected_problems: problems,
    counts: { INDIVIDUAL: ind.counts, CORPORATE: cor.counts }, catalogue_server_ms: ind.timing_ms, payload_bytes: JSON.stringify(ind).length };
  const out = join(import.meta.dirname, "..", "..", "evidence", "scale-100"); mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "fixture-summary.json"), JSON.stringify(summary, null, 1));
  console.log(JSON.stringify(summary, null, 1));
})().catch((e) => { console.error(e); process.exit(1); });
