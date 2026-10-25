// Screen 03 S1 (BR-7, Lead 25 Oct): the needed-fact coverage of every combination in a running copy, draft and latest
// release, so the Sample data is fixed before S2 makes a gap block release. Read-only; no AI (US$0).
//   tsx studio/tools/coverage-report.ts <port>
import { coverageGaps } from "../engine/coverage.ts";
const BASE = `http://localhost:${process.argv[2] ?? "4431"}/api`;
const get = async (p: string) => { const r = await fetch(`${BASE}${p}`, { headers: { "x-actor": "user-A" } }); return r.ok ? r.json() : null; };
type Row = { combinationId?: string | null; label: string };
const rows: Row[] = [];
for (const pw of ["INDIVIDUAL", "CORPORATE"]) rows.push(...(((await get(`/catalogue?pw=${pw}&f=all`)) as { rows?: Row[] } | null)?.rows ?? []));
let total = 0;
const seen = new Set<string>();
for (const r of rows) {
  const id = r.combinationId; if (!id || seen.has(id)) continue; seen.add(id);
  for (const mode of ["draft", "published"] as const) {
    const cfg = await get(`/combinations/${id}/config?mode=${mode}`); if (!cfg?.snapshot?.forms?.length) continue;
    const gaps = coverageGaps(cfg.snapshot); total += gaps.length;
    console.log(`${r.label} (${mode}${cfg.release ? ` v${cfg.release.version}` : ""}): ${gaps.length} gap${gaps.length === 1 ? "" : "s"}`);
    for (const g of gaps) console.log(`  - ${g.role} · ${g.fact} · ${g.forms.join(", ")} (${g.boxes} form fields) · ${g.why}`);
  }
}
console.log(`\n${total} gaps in total`);
