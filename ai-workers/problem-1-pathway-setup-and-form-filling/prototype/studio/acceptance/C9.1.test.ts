// Acceptance C9.1 (P-220, pack 3): a new edition of a form: field-by-field comparison and AI impact on components and
// combinations, then release (P-32, P-38 in decisions/; Screen 02 concept BR-12; DEMO.md row 17: IMM 5476 2021 → 11-2025
// on both combinations; team SA-1B-26 "a new edition never touches a row", SA-1B-33 "AI may … diff a new edition against
// the existing map; a person approves before publishing", SA-1-32 "published editions and maps never change").
// Status today: Not built in qa's table. On main: the held new edition, the box-by-box comparison with no AI
// (GET /intake/held/:id/impact) and accept as draft maps (POST …/impact/accept). Missing and tested here: the impact on
// sections, document types, rules and checks; AI for the new and reworded boxes only, started on a click (P-138; saved
// answers replay at US$0); the edition going out with a release while open cases stay on theirs (P-67); and To review
// saying "New edition: review impact" with the combinations it touches. Part 1 runs on an empty library (as check_screen02_slice2.ts); part 2
// needs the configured checkpoint (C10.1) to hold IMM 5476 2021 on both combinations with 11-2025 held (DEMO.md row 17).
// No live AI (US$0).
//   zsh studio/tools/isolated.sh accept 4440 start && tsx studio/acceptance/C9.1.test.ts 4440 xr_studio_accept
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { LEDGER_DIR } from "../../p2/policy.ts";
import { client, recorder } from "../tests/runtime/api.ts";

const PORT = Number(process.argv[2] ?? 4440), DB = process.argv[3] ?? "xr_studio_accept";
const { call, sql } = client(PORT, DB);
const { ok, summary } = recorder();
const OFFICIAL = join(import.meta.dirname, "..", "..", "..", "official-sources", "ircc");
const n = (q: string) => Number(sql(q) || 0);
const words = (r: { body: any }) => String(r.body?.detail ?? r.body?.message ?? ""); // eslint-disable-line @typescript-eslint/no-explicit-any
const intake = async (dir: string, name: string, actor = "user-A") => {
  const fd = new FormData(); fd.append("files", new Blob([new Uint8Array(readFileSync(join(OFFICIAL, dir, name)))]), name);
  const r = await fetch(`http://127.0.0.1:${PORT}/api/intake`, { method: "POST", headers: { "x-actor": actor }, body: fd });
  return (await r.json().catch(() => ({})))?.results?.[0];
};
// QA-90: the one shared spend ledger; not there yet = nothing spent.
const ledger = () => { const f = join(LEDGER_DIR, "spend.jsonl"); return existsSync(f) ? readFileSync(f, "utf8").length : 0; };
/** The live switch as the server reports it (the finder's free cost plan, P-175); null when there is no combination to ask. */
const liveOn = async () => { const c = sql(`select id from combination where retired_at is null limit 1`); if (!c) return null; return (await call("POST", `/combinations/${c}/forms/find/plan`, { mode: "live" })).body?.live?.on ?? null; };
const spent = () => n(`select count(*) from drafting_job where mode = 'LIVE'`) + n(`select count(*) from ai_batch where mode = 'LIVE'`);

(async () => {
  // Never call a paid route on a copy whose live switch is on (QA-100, P-175): stop before anything.
  if (!sql(`select id from combination limit 1`)) await call("POST", "/demo/load", {});
  if ((await liveOn()) !== false) { console.error("STOP  this copy's live AI switch is on (or cannot be read): run on an isolated copy started without it"); process.exit(2); }
  const ledgerBefore = ledger();
  // ── Part 1: an empty library holding the 2021 IMM 5476; the current one arrives ──
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const first = await intake("previous-editions", "imm5476e-2021.pdf");
  const held = await intake("forms", "imm5476e.pdf");
  ok("C9.1 (C2.4, on main): the newer edition is held, not added, attached or used", first?.outcome === "added" && held?.outcome === "new_edition_held", [first?.outcome, held?.outcome]);
  const id = sql(`select id from intake_item where outcome = 'new_edition_held' and status = 'HELD' limit 1`);
  const imp = id ? (await call("GET", `/intake/held/${id}/impact`)).body : null;
  ok("C9.1 BR-12 (on main): compared box by box without AI; unchanged + reworded + new = the new edition's boxes; removed listed", imp?.ai?.used === false && imp.counts.form_fields > 0 && imp.counts.unchanged + imp.counts.reworded + imp.counts.new === imp.counts.form_fields && Number.isInteger(imp.counts.removed), imp?.counts);
  ok("C9.1 P-32: the impact lists what the removed and reworded boxes touch beyond fields: sections, document types, rules and checks (each a list)", imp && ["sections", "document_types", "rules", "checks"].every((k) => Array.isArray(imp.components?.[k])), imp ? Object.keys(imp) : null);
  // P-138: a saved AI answer for this edition replays at US$0 (labelled replay); otherwise "Draft with AI (about US$x · at most
  // US$y)" is offered and runs only on a click. Either way, opening the review starts nothing. (Question for the tech lead:
  // is a saved answer for IMM 5476 11-2025 recorded? Part 2 assumes the configured checkpoint replays one.)
  const offer = imp?.ai?.offer ?? imp?.ai?.draft;
  const saved = imp?.ai?.saved === true;
  ok("C9.1 P-138: opening the review starts no AI; AI for the new and reworded boxes only is either a saved answer (replay, US$0) or offered with its cost in words", imp && n(`select count(*) from drafting_job`) === 0 && (saved || (typeof offer?.boxes === "number" && offer.boxes === imp.counts.reworded + imp.counts.new && /US\$/.test(String(offer?.words ?? offer?.label ?? "")))), imp?.ai ?? null);
  if (!saved) {
    const run = id ? await call("POST", `/intake/held/${id}/impact/draft`, {}) : { status: 0, body: null };
    ok("C9.1 P-175 fail: without the live switch the paid AI run is refused in plain words, US$0, nothing proposed", run.status >= 400 && run.status !== 404 && /live|founder|switch|approved/i.test(words(run)) && spent() === 0 && ledger() === ledgerBefore, { status: run.status, words: words(run) });
  }
  // P-151 (1) and IRCC-P3-01: IRCC accepts the previous IMM 5476 until 12 March 2026, which has passed (read 1 Nov 2026).
  ok("C9.1 P-151: the review gives IRCC's accepted-until date for the previous edition (2026-03-12, from the IMM 5476 page) and says it has passed, so cases on it cannot be ready to file", imp?.previous_accepted_until === "2026-03-12" && /passed|no longer accepted/i.test(String(imp?.previous_accepted_words ?? "")), { until: imp?.previous_accepted_until, words: imp?.previous_accepted_words });

  // ── Part 2: the configured checkpoint (DEMO.md row 17) ──
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const l = await call("POST", "/demo/load", { sample: "configured" });
  const id2 = sql(`select i.id from intake_item i where i.outcome = 'new_edition_held' and i.status = 'HELD' and i.code = 'IMM 5476' limit 1`);
  ok("C9.1 row 17: the configured checkpoint holds IMM 5476 11-2025 as a new edition over the 2021 edition the library uses", l.status < 300 && id2 !== "" && n(`select count(*) from form_edition e join gov_form_def g on g.id = e.gov_form_def_id where g.form_key = 'IMM 5476' and e.edition_label like '%2021%'`) === 1, { load: l.status, held: id2 });
  const imp2 = id2 ? (await call("GET", `/intake/held/${id2}/impact`)).body : null;
  const combos = (imp2?.combinations ?? []).map((c: { label: string }) => c.label);
  ok("C9.1 P-32: the impact names every combination that uses IMM 5476 (Visitor visa and With an LMIA)", combos.includes("Visitor visa") && combos.some((c: string) => /With an LMIA/.test(c)), combos);
  const items = imp2 ? ["sections", "document_types", "rules", "checks"].flatMap((k) => (imp2.components?.[k] ?? []).map((x: { why?: string; combination?: string }) => ({ k, ...x }))) : [];
  ok("C9.1 P-32: each component touched says why in words (which box changed) and in which combination", items.length > 0 && items.every((x: { why?: string; combination?: string }) => (x.why ?? "").length > 10 && !!x.combination), items.slice(0, 3));
  ok("C9.1 row 17: the edition's AI answers for the reworded and new boxes are replayed (REPLAY, US$0) as proposals waiting for a person", n(`select count(*) from proposal_item where form_edition like '%IMM 5476%' and status = 'waiting'`) > 0 && n(`select count(*) from drafting_job where mode = 'REPLAY' and kind = 'field_map'`) > 0 && spent() === 0);
  const q = await call("GET", "/review-queue");
  const items2 = (Array.isArray(q.body) ? q.body : (q.body?.items ?? q.body?.rows ?? [])) as { kind: string; forms?: string[]; combinations?: unknown[] }[];
  const ne = items2.find((x) => x.kind === "new_edition" && (x.forms ?? []).includes("IMM 5476"));
  ok("C9.1 BR-12: To review lists \"New edition: review impact\" for IMM 5476 with the combinations it touches", ne !== undefined && JSON.stringify((ne as Record<string, unknown>).combinations ?? (ne as Record<string, unknown>).combination ?? []).includes("Visitor visa"), ne ?? q.status);
  // Accepting changes nothing released until a person releases; open cases stay on their release (P-67, SA-1-32).
  const vv = sql(`select id from combination where label = 'Visitor visa' limit 1`);
  const relBefore = vv ? sql(`select coalesce(max(version), 0) || '§' || coalesce(max(sha256), '') from config_release where combination_id = '${vv}'`) : "";
  const caseRel = sql(`select i.config_release_id from form_instance i join runtime_case c on c.id = i.case_id where c.combination_id = '${vv || "00000000-0000-0000-0000-000000000000"}' limit 1`);
  const acc = id2 ? await call("POST", `/intake/held/${id2}/impact/accept`, { expected: imp2?.counts?.form_fields }) : { status: 0, body: null };
  ok("C9.1 SA-1-32 pass: accepting the impact changes no released configuration (same release, same hash)", acc.status >= 200 && acc.status < 300 && (vv ? sql(`select coalesce(max(version), 0) || '§' || coalesce(max(sha256), '') from config_release where combination_id = '${vv}'`) : "x") === relBefore, { status: acc.status, words: words(acc) });
  const sub = vv ? await call("POST", `/combinations/${vv}/submit`, {}) : { status: 0, body: null };
  ok("C9.1 fail (K1, check_screen02_slice2.ts): a release with the new edition's boxes still undecided is refused, naming the boxes in words (no raw form-field path)", sub.status === 409 && /IMM 5476/.test(words(sub)) && !/\[0\]/.test(words(sub)), { status: sub.status, words: words(sub).slice(0, 200) });
  ok("C9.1 P-67: the family case stays on its release while the new edition waits", caseRel !== "" && sql(`select i.config_release_id from form_instance i join runtime_case c on c.id = i.case_id where c.combination_id = '${vv}' limit 1`) === caseRel);
  ok("C9.1 (R-143): no live AI call at any step, US$0, the spend ledger unchanged", spent() === 0 && ledger() === ledgerBefore);
  process.exit(summary() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
