// C2.4 (Partial) — Same file again → "already in the library"; same code with a newer edition → held for impact review,
// and once a person accepts the impact review the newer edition becomes the one in use, with the older one kept aside.
// Decisions: P-32, P-38 (impact review, nothing changes until a person accepts), P-103 (number + edition + checksum),
// P-123 (Replace edition). Missing per CAPABILITIES: "approved newer edition not producible without a manifest change"
// (the accept route POST /intake/held/:id/impact/accept now exists; this file pins its contract).
// Official IRCC files only: IMM 5476 11-2021 (previous-editions/) and the current IMM 5476 11-2025 (forms/). No model
// call (US$0); the comparison is field by field without AI. Builds on tests/check_forms_c24_same_and_new.ts.
//   zsh tools/isolated.sh acc_b2 4565 start && ./node_modules/.bin/tsx acceptance/C2.4.test.ts 4565 xr_studio_acc_b2
// Expected today (main 931cb99a, run 1 Nov 2026 on an isolated copy, US$0): 21 pass, 1 fail — failing: AT-9 fail case
// (after the newer edition is accepted, the 11-2021 file sent again says "Already in the library: IMM 5476 (11-2021).
// Nothing duplicated" instead of saying it is an older edition that is not used), because the intake matches the old
// file's checksum before it compares editions. The rest of the approved-newer-edition path (accept, 409 race and stale
// count, roles, older edition kept, combination draft moves, published config unchanged) already works: CAPABILITIES'
// "not producible" note is out of date.
// Exit: 0 all pass · 1 a check failed · 2 setup missing or refused (demo port or database, copy not reachable, sample).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { checkCopy, guard, sqlFor, stop } from "./lib/pack1.ts";

const PORT = Number(process.argv[2] ?? 4565), DB = process.argv[3] ?? "xr_studio_acc_b2";
guard(PORT, DB); // before anything reads the database or calls the copy (never the demo)
const IRCC = join(import.meta.dirname, "..", "..", "..", "official-sources", "ircc");
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
type R = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely
const call = async (method: string, path: string, body?: unknown, actor: string | null = "user-A"): Promise<R> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { ...(actor ? { "x-actor": actor } : {}), "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
};
const sql = sqlFor(DB);
const words = (b: any) => `${b?.detail ?? ""} ${b?.message ?? ""}`; // eslint-disable-line @typescript-eslint/no-explicit-any
type Out = { outcome: string; message: string; code: string | null; edition: string | null };
const intake = async (dir: string, name: string, combinationId?: string): Promise<Out> => {
  const fd = new FormData(); fd.append("files", new Blob([new Uint8Array(readFileSync(join(IRCC, dir, name)))]), name); if (combinationId) fd.append("combinationId", combinationId);
  const r = await fetch(`http://localhost:${PORT}/api/intake`, { method: "POST", headers: { "x-actor": "user-A" }, body: fd });
  const j = await r.json(); if (!j.results?.[0]) throw new Error(`intake gave no result: ${r.status} ${JSON.stringify(j).slice(0, 300)}`);
  return j.results[0];
};
const editions = () => sql("select e.edition_label from form_edition e join gov_form_def d on d.id=e.gov_form_def_id where d.form_key='IMM 5476' order by 1").split("\n").filter(Boolean);
const jobs = () => Number(sql("select count(*) from drafting_job"));
const spend = () => sql("select coalesce(sum(cost_usd),0) from drafting_job");
const node = async (level: string, label: string, parentKey: string | null, extra: Record<string, unknown> = {}) => {
  const r = await call("POST", "/structure/nodes", { pathwayType: "INDIVIDUAL", level, label, parentKey, ...extra });
  if (r.status !== 201) stop(`setup: ${level} ${label} was not added: ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
  return r.body.key as string;
};

(async () => {
  await checkCopy(PORT, DB);
  if ((await call("POST", "/demo/reset", { confirm: "RESET" })).status >= 300) stop("demo reset refused");
  const jobs0 = jobs(), spend0 = spend();

  // ── An empty library: the 2021 IMM 5476 comes in; a combination of its own uses it.
  let r = await intake("previous-editions", "imm5476e-2021.pdf");
  if (r.outcome !== "added") stop(`setup: the 2021 IMM 5476 was not added: ${r.outcome} ${r.message}`);
  const tr = await node("pathway", "Temporary residence AT", null);
  const vis = await node("program", "Visitors AT", tr);
  const cat = await node("category", "Visitor visa AT", vis, { allowedLocations: ["outside_canada"] });
  const made = await call("POST", "/combinations", { nodeKey: cat });
  const combo: string = made.body?.combination?.id ?? sql(`select id from combination where combination_key like '%${cat.split(".").pop()}%' limit 1`);
  if (!combo) stop(`setup: no combination for ${cat}`);
  const line = await call("POST", `/combinations/${combo}/forms`, { formKey: "IMM 5476" });
  if (line.status !== 201) stop(`setup: IMM 5476 was not added to the combination: ${line.status} ${JSON.stringify(line.body).slice(0, 200)}`);

  // ── BR-1: the same file again.
  r = await intake("previous-editions", "imm5476e-2021.pdf");
  ok("C2.4 AT-1 [IRCC-F03] pass: the same file again says 'Already in the library: IMM 5476 (11-2021)'", r.outcome === "in_library" && /^Already in the library: IMM 5476 \(11-2021\)/.test(r.message), r);
  ok("C2.4 AT-1 fail case: nothing duplicated, nothing held, no AI step", editions().length === 1 && sql("select count(*) from intake_item where code='IMM 5476' and status='HELD'") === "0" && jobs() === jobs0, editions());
  const other = await intake("forms", "imm5257e.pdf");
  ok("C2.4 AT-2 fail case: another form's file is never 'already in the library' (IMM 5257 is added as itself)", other.outcome !== "in_library" && other.code === "IMM 5257", other);

  // ── BR-2: the same code, a newer edition: held for impact review.
  r = await intake("forms", "imm5476e.pdf", combo);
  ok("C2.4 AT-3 [IRCC-F02] pass: the current IMM 5476 (11-2025) is held as a new edition for impact review", r.outcome === "new_edition_held" && /impact review/.test(r.message) && r.edition === "IMM 5476 (11-2025)", r);
  ok("C2.4 AT-3 fail case: held means not in the library yet, no AI step", editions().join() === "IMM 5476 (11-2021)" && jobs() === jobs0, editions());
  const held = sql("select id from intake_item where code='IMM 5476' and status='HELD' and outcome='new_edition_held' limit 1");
  if (!held) stop("setup: no held new edition");

  // ── The impact review (no AI, US$0).
  const imp = await call("GET", `/intake/held/${held}/impact`);
  ok("C2.4 AT-4 pass: the impact review compares 11-2025 with 11-2021 form field by form field, with no AI and US$0", imp.status === 200 && imp.body.edition === "IMM 5476 (11-2025)" && imp.body.library_edition === "IMM 5476 (11-2021)" && imp.body.counts.form_fields > 0 && imp.body.ai?.used === false && imp.body.ai?.cost_usd === 0, imp.body?.counts);
  const sumParts = imp.body.counts.unchanged + imp.body.counts.reworded + imp.body.counts.new;
  ok("C2.4 AT-4 pass: its counts add up (unchanged + reworded + new = form fields of the new edition)", sumParts === imp.body.counts.form_fields, imp.body.counts);
  ok("C2.4 AT-4 pass: it names every combination the change touches (this combination uses IMM 5476)", (imp.body.combinations ?? []).some((c: { id: string }) => c.id === combo), imp.body.combinations);
  const n = imp.body.counts.form_fields as number;

  // ── Refusals before acceptance: data unchanged each time.
  const asApprover = await call("POST", `/intake/held/${held}/impact/accept`, { expected: n }, "user-B");
  const asClient = await call("POST", `/intake/held/${held}/impact/accept`, { expected: n }, "user-P");
  const asNobody = await call("POST", `/intake/held/${held}/impact/accept`, { expected: n }, null);
  ok("C2.4 AT-5 roles: approver and client are 403, nobody named is 401; the edition stays held", asApprover.status === 403 && asClient.status === 403 && asNobody.status === 401 && editions().length === 1, [asApprover.status, asClient.status, asNobody.status]);
  const noCount = await call("POST", `/intake/held/${held}/impact/accept`, {});
  ok("C2.4 AT-6 fail case: accepting without saying how many form fields were reviewed is 400 in words", noCount.status === 400 && /number of form fields you reviewed/.test(words(noCount.body)) && editions().length === 1, noCount);
  const stale = await call("POST", `/intake/held/${held}/impact/accept`, { expected: n - 1 });
  ok("C2.4 AT-6 fail case: a comparison that changed since it was opened is 409 'Look at it again'; still held", stale.status === 409 && /Look at it again/.test(words(stale.body)) && editions().length === 1, stale);

  // ── The approved newer edition (the missing path).
  const acc = await call("POST", `/intake/held/${held}/impact/accept`, { expected: n });
  ok("C2.4 AT-7 [IRCC-F02] pass: the author accepts the impact review: IMM 5476 (11-2025) joins the library", acc.status === 201 && acc.body.edition === "IMM 5476 (11-2025)" && editions().includes("IMM 5476 (11-2025)"), acc);
  ok("C2.4 AT-7 pass: unchanged form fields carry their map, the rest is left for a person (counts add up), no AI", acc.body.carried + acc.body.for_a_person === n && acc.body.carried <= imp.body.counts.unchanged && jobs() === jobs0, { acc: acc.body, counts: imp.body.counts });
  ok("C2.4 AT-7 pass: the held item is done and the change is recorded in the history", sql(`select status from intake_item where id='${held}'`) === "DONE" && sql("select count(*) from audit_event where action='accepted' and entity='new edition' and entity_key='IMM 5476'") === "1", sql(`select status from intake_item where id='${held}'`));
  const twice = await call("POST", `/intake/held/${held}/impact/accept`, { expected: n });
  ok("C2.4 AT-8 fail case: accepting again (or a second person at the same moment) is 409 in words; still one 11-2025 edition", twice.status === 409 && editions().filter((e) => e === "IMM 5476 (11-2025)").length === 1, twice);
  const lib = ((await call("GET", "/library/forms/list?q=5476")).body.rows as { code: string; edition: string; older_editions: { label: string }[] }[]).find((x) => x.code === "IMM 5476");
  ok("C2.4 AT-8 [IRCC-F02] pass: the Forms list shows 11-2025 as the edition and keeps 11-2021 as an older edition", lib?.edition === "IMM 5476 (11-2025)" && (lib?.older_editions ?? []).some((o) => o.label === "IMM 5476 (11-2021)"), lib);
  r = await intake("forms", "imm5476e.pdf");
  ok("C2.4 AT-9 pass: the accepted 11-2025 file sent again is 'Already in the library'", r.outcome === "in_library" && /Already in the library: IMM 5476 \(11-2025\)/.test(r.message), r);
  r = await intake("previous-editions", "imm5476e-2021.pdf");
  ok("C2.4 AT-9 [IRCC-F02] fail case: the 11-2021 file sent after 11-2025 was accepted is said to be an older edition that is not used (never plain 'Already in the library')", /older edition/i.test(r.message) && !/^Already in the library/.test(r.message), r);
  const cfg = JSON.stringify((await call("GET", `/combinations/${combo}/config`)).body ?? "");
  ok("C2.4 AT-10 [IRCC-F02] pass: the combination that used IMM 5476 now names IMM 5476 (11-2025) in its draft, and not 11-2021", cfg.includes("IMM 5476 (11-2025)") && !cfg.includes("IMM 5476 (11-2021)"), cfg.match(/.{80}IMM 5476 \(\d\d-\d{4}\).{80}/g)?.slice(0, 2));
  const pub = JSON.stringify((await call("GET", `/combinations/${combo}/config?mode=published`)).body ?? "");
  ok("C2.4 AT-10 fail case: nothing reaches firms until release (the published config does not name 11-2025)", !pub.includes("IMM 5476 (11-2025)"), pub.slice(0, 200));

  // ── A refused accept of something that is not a held new edition.
  const notHeld = await call("POST", `/intake/held/00000000-0000-0000-0000-000000000000/impact/accept`, { expected: 1 });
  ok("C2.4 AT-11 fail case: an unknown held edition is 404 in words", notHeld.status === 404 && /does not exist/.test(words(notHeld.body)), notHeld);
  ok("C2.4 AT-12 US$0: no AI step and no spend in this file", jobs() === jobs0 && spend() === spend0, { jobs: jobs() - jobs0, spend: [spend0, spend()] });
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`FAIL  the check stopped: ${(e as Error).stack}`); process.exit(1); });
