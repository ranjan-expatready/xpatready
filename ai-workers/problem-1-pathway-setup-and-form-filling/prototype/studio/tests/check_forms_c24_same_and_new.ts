// F2 C2.4 (forms lane; CAPABILITIES C2.4 "Partial": the approved newer edition was not tested): the intake's two rules
// for a form already in the library, through the API and the database, a passing and a failing case each, on an
// isolated copy. Official IRCC PDFs only (official-sources/ircc, checksums on the approved list): IMM 5476 11-2021 and
// the current IMM 5476. NO model call (US$0).
//   BR-1 the same file again says "Already in the library": nothing duplicated, attached to a combination at most once.
//   BR-2 the same code with a newer edition is held for impact review: not added, not attached, no AI, listed on To review.
//        An older edition is kept aside, never held for review; a held file sent again stays one held item.
//   The Upload PDF card (Form library) says what a held edition waits for and links to its step: Review impact for a newer
//   one, its To review item for an older one, never "Record the IRCC page" (review of 6c940174, Major 2).
//   Not here: the same edition from a different file ("Held for a person") needs a non-official file, and an unapproved
//   file is held for source verification first; both are covered by the intake's own checks (check_screen01_*).
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
const node = async (level: string, label: string, parentKey: string | null, extra: Record<string, unknown> = {}) => {
  const r = await call("POST", "/structure/nodes", { pathwayType: "INDIVIDUAL", level, label, parentKey, ...extra });
  if (r.status !== 201) throw new Error(`setup: ${level} ${label} was not added: ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
  return r.body.key as string;
};
/** The Form library's Upload PDF run for one official file, followed to its end (the card reads GET /runs/:id). */
const uploadRun = async (dir: string, name: string) => {
  const fd = new FormData(); fd.append("files", new Blob([new Uint8Array(readFileSync(join(IRCC, dir, name)))], { type: "application/pdf" }), name);
  const u = await fetch(`http://localhost:${PORT}/api/library/forms/upload`, { method: "POST", headers: { "x-actor": "user-A" }, body: fd });
  const id = ((await u.json()) as { runId?: string }).runId;
  if (!id) throw new Error(`Upload PDF gave no run: ${u.status}`);
  for (let i = 0; i < 240; i++) { const r = await call("GET", `/runs/${id}`); if (!["queued", "running", "stopping"].includes(r.body?.status)) return r.body; await new Promise((res) => setTimeout(res, 250)); }
  throw new Error(`the Upload PDF run ${id} did not end in 60 s`);
};
const onReview = async () => ((await call("GET", "/review-queue?filter=all")).body.items as { kind: string; forms: string[]; what: string; next: { label: string } | null }[])
  .filter((i) => i.kind === "new_edition" && i.forms.includes("IMM 5476") && /^A newer edition/.test(i.what)).length;

(async () => {
  // The database this check reads is the one the server uses (as check_w1_structure does).
  const served = (await call("GET", "/session")).body?.workspace?.id;
  const inDb = (() => { try { return sql(`select id from workspace where id='${served}'`); } catch { return ""; } })();
  if (!served || !inDb) { console.error(`STOP  the database ${DB} is not the one the server on port ${PORT} uses. Pass the copy's database: tsx <check> ${PORT} xr_studio_<name>.`); process.exit(2); }

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

  // A combination of its own (pathway → program → category), with the 2021 edition attached.
  const tr = await node("pathway", "Temporary residence C24", null);
  const vis = await node("program", "Visitors C24", tr);
  const cat = await node("category", "Visitor visa C24", vis, { allowedLocations: ["outside_canada"] });
  const made = await call("POST", "/combinations", { nodeKey: cat });
  const combo = made.body?.combination?.id ?? sql(`select id from combination where combination_key like '%${cat.split(".").pop()}%' limit 1`);
  if (!combo) throw new Error(`setup: no combination for ${cat}: ${made.status} ${JSON.stringify(made.body).slice(0, 200)}`);
  r = await intake("previous-editions", "imm5476e-2021.pdf", combo);
  ok("setup: on its own combination the 2021 file is in the library and attached once", r.outcome === "in_library" && attached(combo) === 1, { outcome: r.outcome, attached: attached(combo) });

  // BR-2: the same code, a newer edition, uploaded on that combination.
  r = await intake("forms", "imm5476e.pdf", combo);
  ok("C2.4 BR-2 pass: the current IMM 5476 is held as a new edition for impact review", r.outcome === "new_edition_held" && /impact review needed/.test(r.message) && /newer than the library's IMM 5476 \(11-2021\)/.test(r.message), r);
  ok("C2.4 BR-2 pass: held means not added to the library, not attached to the combination, and no AI step", editions() === 1 && attached(combo) === 1 && Number(sql(`select count(*) from source_attachment where combination_id='${combo}' and edition like 'IMM 5476 (11-2025)%'`)) === 0 && jobs() === jobs0, { editions: editions(), attached: attached(combo), jobs: jobs() - jobs0 });
  ok("C2.4 BR-2 pass: one held item, listed on To review as a new edition", heldItems("new_edition_held") === 1 && (await onReview()) === 1, { held: heldItems("new_edition_held"), onReview: await onReview() });
  r = await intake("forms", "imm5476e.pdf");
  ok("C2.4 BR-2 pass: the held file sent again stays one held item, and says it waits for a person", r.outcome === "new_edition_held" && /^Already waiting for a person/.test(r.message) && heldItems("new_edition_held") === 1, r);
  // The Upload PDF card for the newer edition: its words and its next step are the impact review's.
  const heldId = sql("select id from intake_item where code='IMM 5476' and status='HELD' and outcome='new_edition_held' limit 1");
  let run = await uploadRun("forms", "imm5476e.pdf");
  ok("C2.4 BR-2 pass: the Upload PDF card says the new edition waits for its impact review and links to Review impact", /^Held as a new edition: nothing changes until a person reviews its impact/.test(run.message ?? "") && run.error?.next?.label === "Review impact" && run.error?.next?.href === `/review/edition/${heldId}`, { message: run.message, next: run.error?.next });
  ok("C2.4 BR-2 fail case: the card never sends a new edition to source verification ('Record the IRCC page')", !/record the IRCC page/i.test(`${run.message} ${run.error?.next?.label}`) && !/\/review\/held\//.test(run.error?.next?.href ?? ""), run.error?.next);

  // ── Part 2, the sample (its library holds the current IMM 5476, 11-2025) and its Super visa combination.
  const reset2 = await call("POST", "/demo/reset", { confirm: "RESET" });
  if (reset2.status >= 300) throw new Error(`second reset failed: ${reset2.status}`);
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
  run = await uploadRun("previous-editions", "imm5476e-2021.pdf");
  ok("C2.4 BR-2 fail case: the Upload PDF card says an older edition is kept aside and links to To review, not to Review impact or source verification", /^Kept aside as an older edition: it is not used/.test(run.message ?? "") && run.error?.next?.label === "See it on To review" && run.error?.next?.href === "/review", { message: run.message, next: run.error?.next });

  // ── Part 3 (C2.4 AT-9, re-test of 3 Nov): once a newer edition is accepted, the older file sent again is never shown as
  // the one in the library: "Older edition: not used", naming the edition in use, not attached, nothing for a person.
  if ((await call("POST", "/demo/reset", { confirm: "RESET" })).status >= 300) throw new Error("third reset failed");
  r = await intake("previous-editions", "imm5476e-2021.pdf");
  if (r.outcome !== "added") throw new Error(`setup: the 2021 IMM 5476 was not added: ${r.outcome} ${r.message}`);
  const tr3 = await node("pathway", "Temporary residence C24", null);
  const vis3 = await node("program", "Visitors C24", tr3);
  const cat3 = await node("category", "Visitor visa C24", vis3, { allowedLocations: ["outside_canada"] });
  const made3 = await call("POST", "/combinations", { nodeKey: cat3 });
  const combo3: string = made3.body?.combination?.id ?? sql(`select id from combination where combination_key like '%${cat3.split(".").pop()}%' limit 1`);
  if (!combo3) throw new Error(`setup: no combination for ${cat3}`);
  r = await intake("forms", "imm5476e.pdf");
  const held3 = sql("select id from intake_item where code='IMM 5476' and status='HELD' and outcome='new_edition_held' limit 1");
  const imp = await call("GET", `/intake/held/${held3}/impact`);
  const acc = await call("POST", `/intake/held/${held3}/impact/accept`, { expected: imp.body?.counts?.form_fields });
  if (acc.status !== 201) throw new Error(`setup: the newer edition was not accepted: ${acc.status} ${JSON.stringify(acc.body).slice(0, 200)}`);
  const jobs3 = jobs(), att3 = attached(combo3), items3 = Number(sql("select count(*) from intake_item where code='IMM 5476' and status='HELD'")), review3 = (await call("GET", "/review-queue?filter=all")).body.items.length;
  r = await intake("previous-editions", "imm5476e-2021.pdf", combo3);
  ok("C2.4 AT-9 fail case: the 11-2021 file after 11-2025 was accepted is 'Older edition: not used' naming the edition in use, never 'Already in the library'", r.outcome === "older_in_library" && /^Older edition: not used\. IMM 5476 \(11-2021\) is kept in the library only as an older edition; the library uses IMM 5476 \(11-2025\)\./.test(r.message) && !/Already in the library/.test(r.message), r);
  ok("C2.4 AT-9 fail case: that older file is not attached to the combination, nothing is held or added to To review, no AI step", attached(combo3) === att3 && Number(sql("select count(*) from intake_item where code='IMM 5476' and status='HELD'")) === items3 && (await call("GET", "/review-queue?filter=all")).body.items.length === review3 && editions() === 2 && jobs() === jobs3, { attached: attached(combo3) - att3, review: review3 });
  r = await intake("forms", "imm5476e.pdf", combo3);
  ok("C2.4 AT-9 pass: the edition in use (11-2025) sent again is still 'Already in the library'", r.outcome === "in_library" && /^Already in the library: IMM 5476 \(11-2025\)/.test(r.message), r);
  run = await uploadRun("previous-editions", "imm5476e-2021.pdf");
  ok("C2.4 AT-9 fail case: the Upload PDF card says the older file is in the library only as an older edition, not used", run.status === "done" && /^In the library only as an older edition: it is not used\./.test(run.message ?? ""), { status: run.status, message: run.message });

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
