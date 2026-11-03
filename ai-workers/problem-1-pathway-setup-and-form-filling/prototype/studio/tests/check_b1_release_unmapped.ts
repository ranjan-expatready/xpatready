// V3 B1 (Critical, #682; tech-lead ruling P-297 (3)): release and opening a case read "a form with no field map" the same
// way. Release refuses a combination with a data form that has no PDF form field map, naming each such form (as it refuses
// the "condition in words" forms); opening a case keeps refusing such a release. Before: release listed it as a warning
// and released a combination no firm could open a case on. A passing and a failing case each; the Visitor visa from Reset
// to the six (the Demo menu), and the fully set-up Visitor visa (setup_visitor_visa.ts, every form mapped). Rules only,
// no model call (US$0).
//   COPY_PREFIX=screens zsh studio/tools/isolated.sh screens_b1 4442 start && tsx studio/tests/check_b1_release_unmapped.ts 4442 xr_studio_screens_b1
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { client, recorder } from "./runtime/api.ts";
import { NO_FIELD_MAP, setupChecklistOf, type SetupInput } from "../engine/setup-checklist.ts";

const PORT = Number(process.argv[2] ?? 4442), DB = process.argv[3] ?? "xr_studio_screens_b1";
const { call, sql } = client(PORT, DB);
const { ok, summary } = recorder();
const AUTHOR = "user-A", OFFICER = "user-O", CLIENT = "user-P";
const run = Date.now().toString(36);
type Problem = { level?: string; where: string; item: string; message: string };
const words = (r: { body: any }) => String(r.body?.detail ?? r.body?.message ?? ""); // eslint-disable-line @typescript-eslint/no-explicit-any
/** The data forms of a combination's draft with no PDF form field map that has entries (the case gate's reading). */
const unmappedOf = async (id: string) => {
  const s = (await call("GET", `/combinations/${id}/config`)).body?.snapshot as { forms: { form_number: string; form_kind?: string }[]; field_maps: { form_number: string; channel?: string; entries: unknown[] }[] };
  return s.forms.filter((f) => (f.form_kind ?? "data_form") === "data_form" && !s.field_maps.some((m) => m.form_number === f.form_number && m.channel !== "ONLINE" && m.entries.length)).map((f) => f.form_number).sort();
};
/** The refusals for a form with no field map (draft problems carry a level; a refused submit's errors[] are all blocking). */
const unmappedErrors = (ps: Problem[]) => ps.filter((p) => (p.level ?? "error") === "error" && p.where === "Forms" && p.message.includes("No form fields mapped yet:"));
const releases = (id: string) => Number(sql(`select count(*) from config_release where combination_id='${id}'`));
const openCase = (id: string, ref: string) => call("POST", "/runtime/cases", { combinationId: id, reference: `${ref}-${run}`, clientActor: CLIENT, principal: { displayName: "Sample Client B1" } }, OFFICER);

(async () => {
  // ── Part 1: Reset to the six (the Demo menu). The Visitor visa as loaded has data forms with no form field map.
  const reset = await call("POST", "/demo/reset-to-six", { confirm: "RESET" }, AUTHOR);
  if (reset.status >= 300) { console.error(`STOP  Reset to the six refused: ${reset.status} ${words(reset)}`); process.exit(2); }
  const six = sql("select id from combination where combination_key='vv.single'");
  if (!six) { console.error("STOP  no Visitor visa (vv.single) after Reset to the six"); process.exit(2); }
  const missing = await unmappedOf(six);
  ok("B1 setup: after Reset to the six, the Visitor visa has data forms with no form field map", missing.length > 0, missing);
  const draft = (await call("GET", `/combinations/${six}`)).body?.draft?.problems as Problem[];
  const listed = unmappedErrors(draft ?? []);
  ok("B1 fail: Review and release lists each form with no field map as an error that blocks (not a warning), one per form, named by the form", listed.map((p) => p.item).sort().join() === missing.join() && !(draft ?? []).some((p) => p.level === "warning" && /field map/i.test(p.message)), { missing, listed: listed.map((p) => `${p.item}: ${p.message}`) });
  const rel0 = releases(six);
  const sub = await call("POST", `/combinations/${six}/submit`, { note: "B1: release with forms that have no field map" }, AUTHOR);
  const subErrors = unmappedErrors((sub.body?.errors ?? []) as Problem[]);
  ok("B1 fail: submitting for release is refused, and the refusal names exactly the forms with no field map", sub.status === 400 && subErrors.map((p) => p.item).sort().join() === missing.join() && releases(six) === rel0, { status: sub.status, named: subErrors.map((p) => p.item), words: words(sub).slice(0, 200) });
  // Review of 3b17711d (Major 1): one cause, one missing line. The forms with no field map are the "No form fields mapped
  // yet" line; the "cannot be filed as set" line counts only what else is wrong (the "condition in words" forms).
  type Row = { combinationId?: string; missing?: { code: string; text: string }[] };
  const rowsOf = (o: unknown): Row[] => Array.isArray(o) ? o.flatMap(rowsOf) : o && typeof o === "object" ? [...((o as Row).combinationId === six && (o as Row).missing ? [o as Row] : []), ...Object.values(o).flatMap(rowsOf)] : [];
  const lines = rowsOf((await call("GET", "/catalogue", undefined, AUTHOR)).body)[0]?.missing ?? [];
  const mapLines = lines.filter((m) => /No form fields mapped yet/.test(m.text));
  ok("B1 Major 1: the forms with no field map are one missing line naming them all, never also a \"cannot be filed\" line", mapLines.length === 1 && mapLines[0].code === "form_without_edition" && missing.every((f) => mapLines[0].text.includes(f)), lines.map((m) => `${m.code}: ${m.text.slice(0, 120)}`));
  const none = await openCase(six, "B1-SIX");
  ok("B1 fail: opening a case on a combination that was never released is still refused", none.status >= 400, none.status);

  // ── Part 2: the fully set-up Visitor visa (every form mapped): released, and a case opens on it.
  const reset2 = await call("POST", "/demo/reset", { confirm: "RESET" }, AUTHOR);
  if (reset2.status >= 300) { console.error(`STOP  reset refused: ${reset2.status}`); process.exit(2); }
  const studio = join(import.meta.dirname, "..");
  execFileSync(join(studio, "node_modules", ".bin", "tsx"), ["--tsconfig", join(studio, "api", "tsconfig.json"), join(studio, "tests", "runtime", "setup_visitor_visa.ts"), String(PORT), DB], { stdio: ["ignore", "ignore", "inherit"], timeout: 600_000 });
  const vv = sql("select id from combination where combination_key='vv.single'");
  ok("B1 pass: with every form mapped, the Visitor visa releases (setup_visitor_visa.ts, no error left)", !!vv && releases(vv) === 1 && (await unmappedOf(vv)).length === 0, { releases: vv ? releases(vv) : null });
  const opened = await openCase(vv, "B1-VV");
  ok("B1 pass: the officer opens a case on that release", opened.status < 300 && !!opened.body?.id, { status: opened.status, words: words(opened).slice(0, 200) });

  // ── Part 3: a form with no field map added to its draft blocks the next release by name; release 1 keeps working.
  // Fixture (the copy's own database): IMM 5475's field map is taken out, standing in for a form whose map has not been
  // drafted yet (the full sample maps every form; the six map theirs from saved drafts).
  const F = "IMM 5475";
  sql(`delete from form_field_map where form_edition_id in (select e.id from form_edition e join gov_form_def d on d.id = e.gov_form_def_id where d.form_key = '${F}')`);
  const add = await call("POST", `/combinations/${vv}/forms`, { formKey: F }, AUTHOR);
  ok(`B1 setup: ${F}, with no form field map, is added to the Visitor visa's draft`, add.status < 300 && (await unmappedOf(vv)).join() === F, { status: add.status, words: words(add).slice(0, 200), unmapped: await unmappedOf(vv) });
  const sub2 = await call("POST", `/combinations/${vv}/submit`, { note: "B1: one unmapped form" }, AUTHOR);
  const named2 = unmappedErrors((sub2.body?.errors ?? []) as Problem[]);
  ok(`B1 fail: the next release is refused naming only ${F}, in words; no release 2`, sub2.status === 400 && named2.map((p) => p.item).join() === F && words(sub2).includes(F) && releases(vv) === 1, { status: sub2.status, named: named2.map((p) => p.item), words: words(sub2).slice(0, 200) });
  // Opus review M1: the Release page (GET /draft, the approver) holds the row and names the form, never only "not submitted".
  const page = (await call("GET", "/draft", undefined, "user-B")).body as { rows?: { combinationId?: string; id?: string; label?: string; held?: boolean; why?: string | null }[] };
  const row = (page.rows ?? []).find((r) => (r.combinationId ?? r.id) === vv) ?? (page.rows ?? []).find((r) => /Visitor visa/.test(r.label ?? ""));
  ok(`B1 Opus M1 fail: the Release page holds the Visitor visa back naming ${F}, with the step to map or remove it`, !!row?.held && (row?.why ?? "").includes(F) && /Map its form fields|map its form fields/.test(row?.why ?? "") && !/Not submitted for review/.test(row?.why ?? ""), row);
  const still = await openCase(vv, "B1-VV2");
  ok("B1 pass: cases still open on release 1 while the draft waits for its map", still.status < 300 && !!still.body?.id, { status: still.status, words: words(still).slice(0, 200) });
  const del = await call("DELETE", `/combinations/${vv}/forms/${encodeURIComponent(F)}`, undefined, AUTHOR);
  const draft3 = (await call("GET", `/combinations/${vv}`)).body?.draft?.problems as Problem[];
  ok("B1 pass: with that form taken out of the draft again, no form-map error is left", del.status < 300 && unmappedErrors(draft3 ?? []).length === 0, { status: del.status, words: words(del).slice(0, 200) });

  // ── Review of 3b17711d (Major 2): the setup checklist counts a form with no field map once ("Map 1 form"), not again as a
  // form problem. The same input without the tag counts it twice (the fail case: what the error alone would do).
  const input = (code?: string): SetupInput => ({ combinationId: "b1", retired: false, release: null, pages: { state: "no_record" }, people: { roles: 1, applicants: 1, saved: true, tier: "expert" },
    forms: { lines: 1, fromLibrary: 0, draftable: 0, unmapped: 1, sources: 0 }, proposals: {}, documents: { lines: 0, rolesWithout: 0 }, questions: 0, held: 0, running: null, changes: 1, review: { stage: "submit", submittedBy: null, authors: [] },
    problems: [{ level: "error", where: "Forms", item: "IMM 5475", message: "No form fields mapped yet for IMM 5475: …", ...(code ? { code } : {}) }] } as SetupInput);
  const formsOpen = (c: ReturnType<typeof setupChecklistOf>) => (c.steps.find((x) => x.key === "forms")?.open ?? []).map((i) => `${i.kind}:${i.count}`);
  const tagged = formsOpen(setupChecklistOf(input(NO_FIELD_MAP))), untagged = formsOpen(setupChecklistOf(input()));
  ok("B1 Major 2 pass: Forms says \"Map 1 form\" once and no form problem for the same form", tagged.includes("map_forms:1") && !tagged.some((k) => k.startsWith("fix_problems")), tagged);
  ok("B1 Major 2 fail: without the tag the same form would be counted twice (Map 1 form and Fix 1 problem)", untagged.includes("map_forms:1") && untagged.includes("fix_problems:1"), untagged);

  process.exit(summary() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
