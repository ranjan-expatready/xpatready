// F2 C2.4 (forms lane; CAPABILITIES C2.4 "Partial": the approved newer edition was not tested): the intake's two rules
// for a form already in the library, through the API and the database, a passing and a failing case each, on an
// isolated copy. Official IRCC PDFs only (official-sources/ircc, checksums on the approved list): IMM 5476 11-2021 and
// the current IMM 5476. NO model call (US$0).
//   BR-1 the same file again says "Already in the library": nothing duplicated, attached to a combination at most once.
//   BR-2 the same code with a newer edition is held for impact review: not added, not attached, no AI, listed on To review.
//        An older edition is kept aside, never held for review; a held file sent again stays one held item.
//   zsh studio/tools/isolated.sh forms_c24 4451 start && tsx studio/tests/check_forms_c24_same_and_new.ts 4451 xr_studio_forms_c24
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const PORT = Number(process.argv[2] ?? 4451), DB = process.argv[3] ?? "xr_studio_forms_c24";
const IRCC = join(import.meta.dirname, "..", "..", "..", "official-sources", "ircc");
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely, as in the other API checks
const call = async (method: string, path: string, body?: unknown, actor = "user-A"): Promise<Res> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
};
type Out = { outcome: string; message: string; code: string | null; edition: string | null };
const intake = async (dir: string, name: string, combinationId?: string): Promise<Out> => {
  const fd = new FormData(); fd.append("files", new Blob([new Uint8Array(readFileSync(join(IRCC, dir, name)))]), name); if (combinationId) fd.append("combinationId", combinationId);
  const r = await fetch(`http://localhost:${PORT}/api/intake`, { method: "POST", headers: { "x-actor": "user-A" }, body: fd });
  const j = await r.json(); if (!j.results?.[0]) throw new Error(`intake gave no result: ${r.status} ${JSON.stringify(j).slice(0, 300)}`);
  return j.results[0];
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const editions = () => Number(sql("select count(*) from form_edition e join gov_form_def d on d.id=e.gov_form_def_id where d.form_key='IMM 5476'"));
const attached = (combo: string) => Number(sql(`select count(*) from source_attachment where combination_id='${combo}' and edition like 'IMM 5476%'`));
const jobs = () => Number(sql("select count(*) from drafting_job"));
const heldItems = (outcome: string) => Number(sql(`select count(*) from intake_item where code='IMM 5476' and status='HELD' and outcome='${outcome}'`));
/** To review items asking for an impact review of IMM 5476 (an older edition is listed too, as "See the older edition"). */
const onReview = async () => ((await call("GET", "/review-queue?filter=all")).body.items as { kind: string; forms: string[]; what: string; next: { label: string } | null }[])
  .filter((i) => i.kind === "new_edition" && i.forms.includes("IMM 5476") && /^A newer edition/.test(i.what)).length;

(async () => {
  // ── Part 1, an empty library (reset): the 2021 IMM 5476, the same file again, then the current one (newer).
  const reset = await call("POST", "/demo/reset", { confirm: "RESET" });
  if (reset.status >= 300) throw new Error(`reset failed: ${reset.status}`);
  const jobs0 = jobs();
  let r = await intake("previous-editions", "imm5476e-2021.pdf");
  if (r.outcome !== "added") throw new Error(`setup: the 2021 IMM 5476 was not added: ${r.outcome} ${r.message}`);
  ok("setup: IMM 5476 11-2021 is the library's one edition", editions() === 1, editions());

  // BR-1: the same file again.
  r = await intake("previous-editions", "imm5476e-2021.pdf");
  ok("C2.4 BR-1 pass: the same file again says it is already in the library", r.outcome === "in_library" && /^Already in the library: IMM 5476/.test(r.message), r);
  ok("C2.4 BR-1 pass: nothing duplicated (still one edition, nothing held)", editions() === 1 && Number(sql("select count(*) from intake_item where code='IMM 5476' and status='HELD'")) === 0, editions());
  const other = await intake("forms", "imm5257e.pdf");
  ok("C2.4 BR-1 fail case: another form's file is not 'already in the library'", other.outcome !== "in_library" && !/Already in the library/.test(other.message) && other.code === "IMM 5257", other);

  // BR-2: the same code, a newer edition.
  r = await intake("forms", "imm5476e.pdf");
  ok("C2.4 BR-2 pass: the current IMM 5476 is held as a new edition for impact review", r.outcome === "new_edition_held" && /impact review needed/.test(r.message) && /newer than the library's IMM 5476 \(11-2021\)/.test(r.message), r);
  ok("C2.4 BR-2 pass: held means not added to the library and no AI step", editions() === 1 && jobs() === jobs0, { editions: editions(), jobs: jobs() - jobs0 });
  ok("C2.4 BR-2 pass: one held item, listed on To review as a new edition", heldItems("new_edition_held") === 1 && (await onReview()) === 1, { held: heldItems("new_edition_held"), onReview: await onReview() });
  r = await intake("forms", "imm5476e.pdf");
  ok("C2.4 BR-2 pass: the held file sent again stays one held item, and says it waits for a person", r.outcome === "new_edition_held" && /^Already waiting for a person/.test(r.message) && heldItems("new_edition_held") === 1, r);

  // ── Part 2, the sample (its library holds the current IMM 5476, 11-2025) and its Super visa combination.
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const load = await call("POST", "/demo/load");
  if (load.status !== 201) throw new Error(`sample load failed: ${load.status}`);
  const sv = sql("select id from combination where combination_key = 'sv.super_visa' limit 1");
  if (!sv) throw new Error("no Super visa combination in the sample");
  const before = attached(sv);
  r = await intake("forms", "imm5476e.pdf", sv);
  const once = attached(sv);
  const r2 = await intake("forms", "imm5476e.pdf", sv);
  ok("C2.4 BR-1 pass: on a combination, the same file twice is in the library and attached once", r.outcome === "in_library" && r2.outcome === "in_library" && once === Math.max(before, 1) && attached(sv) === once, { r: r.outcome, r2: r2.outcome, before, once, now: attached(sv) });
  const jobs1 = jobs(), att1 = attached(sv);
  const held1 = heldItems("new_edition_held"), review1 = await onReview();
  r = await intake("previous-editions", "imm5476e-2021.pdf", sv);
  ok("C2.4 BR-2 fail case: an older edition is 'not used', not held for impact review", r.outcome === "older_edition_held" && /^Older edition: not used/.test(r.message) && heldItems("new_edition_held") === held1 && (await onReview()) === review1, { outcome: r.outcome, held: heldItems("new_edition_held") - held1, review: (await onReview()) - review1 });
  ok("C2.4 BR-2 fail case: the older edition is not added, not attached and starts no AI step", editions() === 1 && attached(sv) === att1 && jobs() === jobs1, { editions: editions(), attached: attached(sv) - att1, jobs: jobs() - jobs1 });

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
