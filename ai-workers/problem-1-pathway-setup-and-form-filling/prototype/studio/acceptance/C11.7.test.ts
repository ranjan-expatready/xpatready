// Acceptance C11.7 (P-220, pack 3): Reset empties all configuration, the shared library included; Load sample adds only
// the six agreed combinations (P-108, P-112, P-148) with their official PDFs through the form intake, and the rest as
// replayed AI proposals waiting for a person (US$0). Status: Partial (qa, 1 Nov); PR #113 (merged) built
// POST /demo/load {"sample":"six"} (suites check_s7_reset.ts, check_s7_load.ts), so most of part A passes on main and guards it;
// part B is the rest of the capability row (P-109 as amended by P-112: the Provincial nominee combination is the IRCC
// permanent-residence application) and stays red after #113 until a builder adds it. No live AI (US$0).
//   zsh studio/tools/isolated.sh accept 4448 start && tsx studio/acceptance/C11.7.test.ts 4448 xr_studio_accept
import { client, recorder } from "../tests/runtime/api.ts";

const PORT = Number(process.argv[2] ?? 4448), DB = process.argv[3] ?? "xr_studio_accept";
const { call, sql } = client(PORT, DB);
const { ok, summary } = recorder();
const n = (q: string) => Number(sql(q) || 0);

/** P-112's six (P-148), Pathway first; Visitor visa has no sub-category, Express Entry stream has none (P-112 amends P-109). */
const SIX = [
  "Temporary residence › Visitors › Visitor visa",
  "Temporary residence › Study permits › Study permit › Outside Canada",
  "Temporary residence › Work permits › Employer-specific work permit › With an LMIA – inside Canada",
  "Permanent residence › Provincial nominees › Express Entry stream",
  "Permanent residence › Family sponsorship › Spouse or common-law partner",
  "Temporary residence › Labour market impact assessment › High-wage position",
];
/** Configuration tables Reset must empty (P-108: structure, combinations, forms, shared fields, sections, document types, checks). */
const CONFIG = ["program_def", "combination", "gov_form_def", "form_edition", "source_attachment", "combination_form", "canonical_field", "logical_section", "section_question", "document_type", "document_requirement", "check_def", "predicate", "derived_field", "answer_list", "proposal_item", "library_change", "config_release", "drafting_job", "ai_batch"];
const trail = (combo: string) => sql(`with recursive up as (select p.id, p.program_node_key, p.parent_node_key, p.label, 0 d from program_def p join combination c on c.program_def_id = p.id where c.id = '${combo}' union all select p.id, p.program_node_key, p.parent_node_key, p.label, d + 1 from program_def p join up on p.program_node_key = up.parent_node_key and p.workspace_id = (select workspace_id from combination where id = '${combo}')) select string_agg(label, ' › ' order by d desc) from up`);

/** The client type (INDIVIDUAL or CORPORATE) of the top node above a combination. */
const rootType = (combo: string) => sql(`with recursive up as (select p.program_node_key, p.parent_node_key, p.client_type, 0 d from program_def p join combination c on c.program_def_id = p.id where c.id = '${combo}' union all select p.program_node_key, p.parent_node_key, p.client_type, d + 1 from program_def p join up on p.program_node_key = up.parent_node_key and p.workspace_id = (select workspace_id from combination where id = '${combo}')) select coalesce(client_type, '-') from up where client_type is not null order by d desc limit 1`);

(async () => {
  // ── Part A: what PR #113 promises ──
  await call("POST", "/demo/load", {}); // the suites' fixture, so Reset has something to empty
  const r = await call("POST", "/demo/reset", { confirm: "RESET" });
  const left = CONFIG.map((t) => [t, n(`select count(*) from ${t}`)] as const).filter(([, c]) => c > 0);
  ok("C11.7 pass (P-108): Reset empties every configuration table, the shared library included", r.status < 300 && left.length === 0, left);
  ok("C11.7 (P-108, 27 Oct): Reset keeps exactly the six built-in person roles (P-108 lists them) and nothing else of the old workspace", n(`select count(*) from person_role where built_in`) === 6 && n(`select count(*) from person_role where not built_in`) === 0);
  const noConfirm = await call("POST", "/demo/reset", {});
  ok("C11.7 fail: Reset without typing RESET is refused in words", noConfirm.status === 400 && /RESET/.test(noConfirm.body?.message ?? ""), noConfirm.body?.message);

  const wrong = await call("POST", "/demo/load", { sample: "everything" });
  ok("C11.7 fail: an unknown sample name is refused with words, and nothing is loaded", wrong.status === 400 && n(`select count(*) from combination`) === 0, { status: wrong.status, message: wrong.body?.message });
  if (n(`select count(*) from combination`) > 0) await call("POST", "/demo/reset", { confirm: "RESET" });

  const l = await call("POST", "/demo/load", { sample: "six" });
  ok("C11.7: Load sample \"six\" answers 2xx and lists the six combinations it made", l.status < 300 && Array.isArray(l.body?.combinations) && l.body.combinations.length === 6, { status: l.status, message: l.body?.message });
  const combos = sql(`select id from combination where retired_at is null`).split("\n").filter(Boolean);
  const trails = combos.map(trail);
  ok("C11.7 pass (P-148, P-112): exactly the six combinations, with P-112's names", combos.length === 6 && SIX.every((t) => trails.includes(t)), trails);
  ok("C11.7 fail (P-148): no Super visa and no seventh combination", !trails.some((t) => /super visa/i.test(t)) && combos.length <= 6, trails.filter((t) => !SIX.includes(t)));
  const types = combos.map(rootType);
  ok("C11.7 (P-106, P-148): five Retail (Individual) combinations and one Corporate", types.filter((t) => t === "INDIVIDUAL").length === 5 && types.filter((t) => t === "CORPORATE").length === 1, types);
  // #113: a file with no saved copy is listed in the load's missing[] with the intake's reason (EMP5626 on High-wage position, P-113).
  const missing = (Array.isArray(l.body?.missing) ? l.body.missing : []) as { combination?: string; code?: string; why?: string }[];
  const noFile = combos.filter((c) => !n(`select count(*) from source_attachment where combination_id = '${c}'`));
  ok("C11.7 (P-108): every combination has its official PDFs in the library through the form intake (code, edition, checksum), or each file it lacks is listed with the reason", combos.length > 0 && noFile.every((c) => missing.some((m) => m.combination && trail(c).endsWith(m.combination.split(" › ").at(-1)!) && (m.why ?? "").length > 20)) && n(`select count(*) from form_edition where sha256 is null or edition_label is null`) === 0, { noFile: noFile.map(trail), missing });
  ok("C11.7 (P-108): the load writes no shared field, section or document type itself: they wait as AI proposals for a person", n(`select count(*) from canonical_field where origin <> 'AI_PROPOSAL' or status <> 'DRAFT'`) === 0 && n(`select count(*) from logical_section`) === 0 && n(`select count(*) from document_type`) === 0 && n(`select count(*) from proposal_item where status = 'waiting'`) > 0, { fields: n(`select count(*) from canonical_field`), waiting: n(`select count(*) from proposal_item where status = 'waiting'`) });
  ok("C11.7 (P-108): nothing is released by the load", n(`select count(*) from config_release`) === 0);
  ok("C11.7 (P-138, P-175): the AI answers are replays (mode REPLAY), no live run, US$0", n(`select count(*) from drafting_job where mode = 'REPLAY'`) > 0 && n(`select count(*) from drafting_job where mode = 'LIVE'`) === 0 && n(`select count(*) from ai_batch where mode = 'LIVE'`) === 0 && Number(sql(`select coalesce(sum(cost_usd), 0) from drafting_job`)) === 0 && (l.body?.cost_usd ?? 0) === 0);
  const vvParts = sql(`select participants::text from combination where label = 'Visitor visa' limit 1`);
  ok("C11.7 (P-209, QA-143): on the Visitor visa the principal reads \"Principal applicant\"; the spouse keeps \"(travelling)\"", /"label": ?"Principal applicant"/.test(vvParts) && /\(travelling\)/.test(vvParts), vvParts.slice(0, 200));
  const denied = await Promise.all([call("POST", "/demo/reset", { confirm: "RESET" }, "user-O"), call("POST", "/demo/load", { sample: "six" }, "user-P")]);
  ok("C11.7 fail: a case officer or a client cannot reset or load (403), nothing changed", denied.every((d) => d.status === 403) && n(`select count(*) from combination`) === 6, denied.map((d) => d.status));
  const again = await call("POST", "/demo/load", { sample: "six" });
  ok("C11.7 fail: loading twice is refused (Reset first), nothing doubled", again.status === 409 && n(`select count(*) from combination`) === 6, again.body?.message);

  // ── Part B: the rest of the capability row (not in #113) ──
  const pnp = combos.find((c) => /Express Entry stream$/.test(trail(c)));
  const pnpForms = pnp ? sql(`select string_agg(g.form_key, ',' order by g.form_key) from combination_form f join gov_form_def g on g.id = f.gov_form_def_id where f.combination_id = '${pnp}'`) : "";
  // P-109 (amended by P-112): the IRCC permanent-residence application, from its paper twins. C11.7 intake: the
  // library keys the DEP form "IMM 0008 DEP", as canada.ca numbers it (engine/canada.ts normaliseCode); compared without spaces. P-171 (3): IMM 5669 and IMM 5406 are Online lines.
  ok("C11.7 part B (P-109, P-112): the Provincial nominee combination is the IRCC PR application: IMM 0008, IMM 5669, IMM 5406, IMM 0008DEP and IMM 5476 come from their paper twins", ["IMM 0008", "IMM 5669", "IMM 5406", "IMM 0008DEP", "IMM 5476"].every((f) => pnpForms.split(",").some((x) => x.replace(/\s+/g, "").toUpperCase() === f.replace(/\s+/g, ""))), pnpForms);
  ok("C11.7 part B (P-109): the provincial nomination certificate is a required document on the Provincial nominee combination", pnp !== undefined && n(`select count(*) from document_requirement d left join document_type t on t.document_type_key = d.document_type_key and t.workspace_id = d.workspace_id where d.combination_id = '${pnp}' and d.is_required and (coalesce(t.name, d.document_type_key) ilike '%nominat%')`) >= 1);
  ok("C11.7 part B (P-171 (3), Sample): on the Provincial nominee combination IMM 5669 and IMM 5406 are Online lines (answer sheet, no PDF)", pnp !== undefined && n(`select count(*) from combination_form f join gov_form_def g on g.id = f.gov_form_def_id where f.combination_id = '${pnp}' and g.form_key in ('IMM 5669', 'IMM 5406') and f.channel = 'ONLINE'`) === 2);

  ok("C11.7 part B (P-109): Ontario's own nomination application stays out (only IRCC forms on the Provincial nominee combination)", pnp !== undefined && n(`select count(*) from combination_form f join gov_form_def g on g.id = f.gov_form_def_id where f.combination_id = '${pnp}' and (g.form_key !~ '^IMM' or g.display_name ~* 'ontario|OINP')`) === 0, pnpForms);
  // Two loads at once load once (demo.ts: one load at a time).
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const [c1, c2] = await Promise.all([call("POST", "/demo/load", { sample: "six" }), new Promise<Awaited<ReturnType<typeof call>>>((res) => setTimeout(() => res(call("POST", "/demo/load", { sample: "six" })), 200))]);
  ok("C11.7 fail: a second load sent while the first runs is refused (409), and the six are loaded once", c1.status < 300 && c2.status === 409 && n(`select count(*) from combination`) === 6, [c1.status, c2.status]);
  // Reset after the load returns to blank again.
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const after = CONFIG.map((t) => [t, n(`select count(*) from ${t}`)] as const).filter(([, c]) => c > 0);
  ok("C11.7: Reset after Load sample returns to a blank workspace", after.length === 0, after);
  process.exit(summary() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
