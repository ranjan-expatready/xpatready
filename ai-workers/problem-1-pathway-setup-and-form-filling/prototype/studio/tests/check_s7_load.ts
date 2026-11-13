// S7 steps 2–4 and 6 (P-148, P-108, P-120/P-121, P-138; C11.7): Load sample brings only the six agreed combinations with
// P-112's names, their official files through the form intake, the form finder replayed (US$0) and each form's saved AI
// field-map answer replayed through the one door as waiting proposals. Nothing is released and no library row is written
// by the load; no live AI call is made. The older sample stays as the suites' fixture (POST /demo/load with no sample).
//   zsh studio/tools/isolated.sh runtime_s7 4435 start && tsx studio/tests/check_s7_load.ts 4435 xr_studio_runtime_s7
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { LEDGER_DIR } from "../../p2/policy.ts";
// QA-90: the one shared spend ledger (p2/policy.ts LEDGER_DIR); not there yet = nothing spent.
const ledger = () => { const f = join(LEDGER_DIR, "spend.jsonl"); return existsSync(f) ? readFileSync(f, "utf8").length : 0; };
const SOLUTION = join(import.meta.dirname, "..", "..", "..");

const PORT = Number(process.argv[2] ?? 4435), DB = process.argv[3] ?? "xr_studio_runtime_s7";
let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const call = async (method: string, path: string, body?: unknown) => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": "user-A", "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, body: await r.json().catch(() => null) };
};
const n = (q: string) => Number(sql(q));

/** P-112's six (P-148): the trail of each combination, Pathway first. */
const SIX = [
  "Temporary residence › Visitors › Visitor visa",
  "Temporary residence › Study permits › Study permit › Outside Canada",
  "Temporary residence › Work permits › Employer-specific work permit › With an LMIA – inside Canada",
  "Permanent residence › Provincial nominees › Express Entry stream",
  "Permanent residence › Family sponsorship › Spouse or common-law partner",
  "Temporary residence › Labour market impact assessment › High-wage position",
];
/** The sample file's own check (step 2): exactly the six trails, no other combination (a Super visa among them). */
type Node = { label: string; setup?: unknown; subcategories?: Node[] };
const trailsOf = (f: { pathways: { key: string; label: string }[]; programs: { pathway: string; label: string; categories: Node[] }[] }) =>
  f.programs.flatMap((p) => { const pw = f.pathways.find((x) => x.key === p.pathway)!.label; return p.categories.flatMap((c) => [...(c.setup ? [`${pw} › ${p.label} › ${c.label}`] : []), ...(c.subcategories ?? []).filter((s) => s.setup).map((s) => `${pw} › ${p.label} › ${c.label} › ${s.label}`)]); });
const sampleOk = (f: Parameters<typeof trailsOf>[0]) => { const t = trailsOf(f); return t.length === SIX.length && SIX.every((x) => t.includes(x)) && !t.some((x) => /super visa/i.test(x)); };

(async () => {
  const file = JSON.parse(readFileSync(join(import.meta.dirname, "..", "samples", "wave1.json"), "utf8"));
  ok("C11.7 pass (P-148, P-112): samples/wave1.json holds exactly the six combinations, with P-112's names", sampleOk(file), trailsOf(file));
  const seventh = structuredClone(file);
  seventh.programs[0].categories.push({ key: "visitors.super_visa", label: "Super visa", locations: ["outside_canada"], setup: { key: "sv.super_visa" } });
  ok("C11.7 fail: a seventh combination (a Super visa) is refused by the check", !sampleOk(seventh), trailsOf(seventh).length);
  // QA-143 (P-209): the Demo menu loads this file, so the principal is never the bare "Applicant" here (#275 renamed
  // only samples/programs.json); "(travelling)" stays on the spouse and child.
  const labels = JSON.stringify(file).match(/"role":"[a-z_]+","label":"[^"]*"/g) ?? [];
  ok("C11.12 QA-143 fail: no participant in samples/wave1.json is labelled the bare \"Applicant\"", labels.length >= 6 && !labels.some((l) => /"label":"Applicant"/.test(l)), labels.filter((l) => /"Applicant"/.test(l)));
  ok("C11.12 QA-143 pass (P-209): Visitor visa's principal reads \"Principal applicant\" and its spouse keeps \"(travelling)\"", /"role":"principal","label":"Principal applicant"[^\]]*"role":"spouse_or_partner","label":"Spouse or partner \(travelling\)"/.test(JSON.stringify(file.programs.find((p: { categories: { key: string }[] }) => p.categories.some((c) => c.key === "visitors.visitor_visa")))), null);

  await call("POST", "/demo/reset", { confirm: "RESET" });
  const wrong = await call("POST", "/demo/load", { sample: "everything" });
  ok("C11.7 fail: an unknown sample name is refused with words, nothing loaded", wrong.status === 400 && n(`select count(*) from combination`) === 0, wrong.body?.message);

  const ledgerBefore = ledger();
  const l = await call("POST", "/demo/load", { sample: "six" });
  if (l.status >= 300) { console.error("STOP  the six did not load", l.body); process.exit(2); }
  const ws = sql(`select id from workspace limit 1`);
  const combos = sql(`select label from combination where workspace_id='${ws}' order by label`).split("\n");
  ok("C11.7: Load sample makes six combinations, five Retail and one Corporate", combos.length === 6 && l.body.combinations.length === 6 && n(`select count(*) from program_def where workspace_id='${ws}' and node_kind='PATHWAY'`) === 3, combos);
  ok("C11.7: the combinations' trails are P-112's names", SIX.every((t) => l.body.combinations.some((c: any) => t.endsWith(c.label))), l.body.combinations.map((c: any) => c.label));
  const files = n(`select count(*) from source_attachment where workspace_id='${ws}'`);
  const want = l.body.combinations.reduce((a: number, c: any) => a + c.files, 0);
  const held = l.body.missing.filter((m: any) => m.code !== "EMP5626");
  const short = l.body.combinations.map((c: any) => [c.label, c.files, n(`select count(*) from source_attachment where combination_id='${c.id}'`)]).filter(([, w, h]: any) => w !== h);
  ok("C11.7: every official file arrives through the form intake on its combination, or is shown with the intake's reason", want + held.length === 45 && /* 45: IMM 5562 left out of fs.spouse (P-230 Q9: no IRCC checklist names it); BK-16 PR 2 (P-490) adds IMM 1295 to the Study permit's sources */ files === want && !short.length && held.every((m: any) => m.why.length > 20) && n(`select count(*) from source_attachment where workspace_id='${ws}' and uploaded_via='SAMPLE'`) === files, { want, files, short, held: held.map((m: any) => m.code) });
  // P-230 (Researched, PR #413 Q3, Q9): spouse sponsorship has the Sponsor on the case (never an applicant); IMM 5562 is held.
  const fsSpouse = JSON.parse(sql(`select participants from combination where workspace_id='${ws}' and combination_key='fs.spouse'`) || "[]");
  const sponsor = fsSpouse.find((x: any) => x.role === "sponsor");
  ok("P-230 pass: spouse sponsorship lists the Sponsor (one, exactly), after the sponsored person", !!sponsor && sponsor.label === "Sponsor" && sponsor.min === 1 && sponsor.max === 1 && fsSpouse[0]?.role === "principal", fsSpouse.map((x: any) => x.role));
  ok("P-230 fail: IMM 5562 is not attached to spouse sponsorship (no IRCC checklist names it)", n(`select count(*) from source_attachment a join combination c on c.id = a.combination_id where c.combination_key='fs.spouse' and a.file_name ilike 'imm5562%'`) === 0);
  ok("C11.7: a file with no saved copy is shown as Not found · Upload PDF, never hidden (EMP5626 on the LMIA)", l.body.missing.some((m: any) => m.code === "EMP5626" && /High-wage/.test(m.combination)) && l.body.log.some((x: string) => /Not found · Upload PDF: EMP5626/.test(x)), l.body.missing);
  // P-120/P-121: no shortcut past the rules. Nothing released, nothing in the library until people accept and approve.
  ok("P-108 pass: no release and no library field is written by Load sample", n(`select count(*) from config_release where workspace_id='${ws}'`) === 0 && n(`select count(*) from pack_version where workspace_id='${ws}'`) === 0 && n(`select count(*) from canonical_field where workspace_id='${ws}'`) === 0, { fields: n(`select count(*) from canonical_field where workspace_id='${ws}'`) });
  const waiting = n(`select count(*) from proposal_item where workspace_id='${ws}' and status='waiting' and origin='ai'`);
  ok("C11.7 (P-149): saved AI field-map answers are replayed through the one door as waiting proposals, origin ai", l.body.drafts.replayed >= 3 && waiting > 0 && waiting === l.body.drafts.proposals_waiting, l.body.drafts);
  ok("C11.7: replayed drafts are recorded as saved answers (mode replay, US$0)", n(`select count(*) from drafting_job where workspace_id='${ws}' and kind='field_map' and mode='REPLAY' and status='COMPLETED'`) === l.body.drafts.replayed, l.body.drafts.status);
  // R-146, QA-163, the C11.8 live run (#746) and the C11.7 result (3 Nov): seventeen forms have a whole-form saved answer
  // (IMM 5669 and IMM 0008 DEP since the C11.7 paid runs) and IMM 5645 its four saved parts, which Saved uses
  // (check_forms_saved_parts.ts), so no form waits. A saved run lost or no longer matching its job puts its form on the
  // list and lowers the count, so this fails; the missing-part case is in check_forms_saved_parts.ts.
  ok("P-138: every form of the six has a saved AI answer, so none waits for Draft with AI (IMM 5645 replays from its four saved parts)", JSON.stringify(l.body.drafts.waiting_for_draft_with_ai) === "[]" && l.body.drafts.replayed === 19 /* BK-16 PR 2 (P-490): 18, and IMM 1295's saved answer on the Study permit */, l.body.drafts);
  // The form finder, replayed per combination from its recorded canada.ca page.
  const vv = l.body.finder.find((f: any) => /Visitor visa/.test(f.combination));
  ok("C11.7: the form finder is replayed on the Visitor visa (saved AI answers, US$0) and picks its forms", ["COMPLETED", "PARTIAL"].includes(vv?.status) && n(`select count(*) from ai_batch where workspace_id='${ws}' and operation='find_forms' and mode='REPLAY'`) === 5, l.body.finder);
  ok("C11.7: a combination without a saved finder answer stops with the reason, for a person (no live call)", l.body.finder.filter((f: any) => !/Visitor visa/.test(f.combination)).every((f: any) => f.status !== "COMPLETED" || f.message), l.body.finder.map((f: any) => f.status));
  ok("C11.7 (Lead R-143): Load sample makes no live AI call: no live run, US$0, the spend ledger unchanged", n(`select count(*) from ai_batch where workspace_id='${ws}' and mode='LIVE'`) === 0 && n(`select count(*) from drafting_job where workspace_id='${ws}' and mode='LIVE'`) === 0 && Number(sql(`select coalesce(sum(cost_usd),0) from drafting_job where workspace_id='${ws}'`)) === 0 && l.body.cost_usd === 0 && ledger() === ledgerBefore);
  const again = await call("POST", "/demo/load", { sample: "six" });
  ok("C11.7 fail: loading twice is refused (Reset first), nothing doubled", again.status === 409 && n(`select count(*) from combination where workspace_id='${ws}'`) === 6, again.body?.message);

  // Step 6: the suites' fixture stays, never in the menu.
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const s = await call("POST", "/demo/load");
  ok("Step 6: the suites' fixture (no sample named) still loads the older sample with its reviewed work-permit release", s.status < 300 && n(`select count(*) from config_release`) === 1 && n(`select count(*) from combination where label='Super visa'`) === 1, s.status);
  // QA-115: the With an LMIA sample's words agree with its document lines (Copy of LMIA, Job offer letter, LMIA-exempt lines).
  const lmia = sql(`select description from combination where combination_key='wp.family'`);
  // Lead 30 Oct: trimmed. A With an LMIA sub-category lists no LMIA-exempt line; each kept line keeps its IRCC sentence (P-170).
  const rows = sql(`select coalesce(t.name, d.document_type_key) || '§' || coalesce(d.condition_plain, '') || '§' || coalesce(d.source_file, '') || '§' || regexp_replace(coalesce(d.source_quote, ''), '\\s+', ' ', 'g') from document_requirement d join combination c on c.id=d.combination_id left join document_type t on t.document_type_key=d.document_type_key and t.workspace_id=d.workspace_id where c.combination_key='wp.family'`).split("\n").filter(Boolean).map((x) => { const [name, cond, file, quote] = x.split("§"); return { name, cond, file, quote }; });
  const exempt = rows.filter((r) => /LMIA-exempt|exempt from an LMIA|IMM 5802|R204\(c\)|post-graduation|program of study/i.test(`${r.name} ${r.cond}`));
  ok("C4.5 QA-115 pass: With an LMIA lists the LMIA lines (Copy of LMIA, Job offer letter) and no LMIA-exempt or post-graduation line", rows.some((r) => /Copy of LMIA/.test(r.name)) && rows.some((r) => /Job offer letter/.test(r.name)) && exempt.length === 0, exempt.map((r) => r.name));
  const norm = (s: string) => s.toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();
  const unbacked = rows.filter((r) => {
    try { const inv = JSON.parse(readFileSync(join(SOLUTION, r.file), "utf8")); return !/^https:\/\/(www|ircc)\.canada\.ca\//.test(inv.summary?.url ?? "") || !r.quote || !norm(String(inv.text)).includes(norm(r.quote).slice(0, 80)); } catch { return true; }
  });
  ok("C4.5 QA-115 / P-170: every kept line is backed by the IRCC page it comes from (an IRCC address on canada.ca, its sentence found in that page's text)", rows.length > 0 && unbacked.length === 0, unbacked.map((r) => `${r.name} ← ${r.file}`));
  ok("C4.5 QA-115: the note says what the sample shows, and that LMIA-exempt lines are left out", /Copy of LMIA/.test(lmia) && /LMIA-exempt jobs and the post-graduation work permit are left out/.test(lmia) && !/not configured yet/.test(lmia), lmia);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
