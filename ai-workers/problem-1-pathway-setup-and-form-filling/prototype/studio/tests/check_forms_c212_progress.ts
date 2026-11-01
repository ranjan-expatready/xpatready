// F2 C2.12 slice 2 (forms lane; the agreed F3 plan §5–§7 and BR-3–BR-5, PDF only since P-102): one form's guided path on
// one combination, GET /combinations/:id/forms/:code/progress. The pure rule (engine/form-progress.ts) with a pass and a
// fail per rule, then the API on the sample: the path and To review name the same next step for the same person (plan
// D3). US$0 (one saved AI answer replayed, no model call).
//   zsh studio/tools/isolated.sh forms_c212p 4453 start && tsx studio/tests/check_forms_c212_progress.ts 4453 xr_studio_forms_c212p
import { execFileSync } from "node:child_process";
import { formProgress, type ProgressFacts } from "../engine/form-progress.ts";
import type { QueueItem } from "../contracts/review-queue.ts";

const PORT = Number(process.argv[2] ?? 4453), DB = process.argv[3] ?? "xr_studio_forms_c212p";
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
type R = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely
const call = async (method: string, path: string, body?: unknown, actor: string | null = "user-A"): Promise<R> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { ...(actor ? { "x-actor": actor } : {}), "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();

const base: ProgressFacts = { form: "IMM 5257", combinationId: "c1", line: "present", edition: "IMM 5257 (09-2023)", mapped: 0, unresolved: 0, draft: "none", items: [], problems: [], canAuthor: true };
const item = (kind: QueueItem["kind"], state: QueueItem["state"], extra: Partial<QueueItem> = {}): QueueItem => ({ id: `${kind}:1`, kind, title: "t", what: `${kind} words`, state, waiting_on: state === "waiting" ? "A content publisher decides each proposal." : null, by: null, at: "2026-10-31T00:00:00Z", cost_usd: null, next: state === "needs" ? { label: `Do the ${kind}`, href: `/x/${kind}`, note: null } : null, forms: ["IMM 5257"], ...extra });
const st = (p: ReturnType<typeof formProgress>, k: string) => p.steps.find((s) => s.key === k)!;

(async () => {
  // ── BR-3 step 1: read and added
  ok("C2.12 BR-3 pass: on the combination with a usable PDF: step 1 done", st(formProgress({ ...base }), "attach").state === "done");
  ok("C2.12 BR-3 fail: on the combination but no usable PDF: step 1 is the author's (Find again or upload)", st(formProgress({ ...base, edition: null }), "attach").state === "needs_you" && st(formProgress({ ...base, edition: null }), "attach").next?.label === "Find again or upload its PDF");
  ok("C2.12 BR-3 fail: its PDF held for a second person: step 1 waits on someone else, with who", (() => { const s = st(formProgress({ ...base, edition: null, items: [item("held_file", "waiting", { waiting_on: "x" })] }), "attach"); return s.state === "waiting_others" && /second person/.test(s.who ?? ""); })());
  ok("C2.12 BR-3 fail: not on the combination: step 1 not started, offering Add it from the library", (() => { const s = st(formProgress({ ...base, line: "none" }), "attach"); return s.state === "not_started" && s.next?.label === "Add it from the library"; })());
  // ── BR-4: steps 1–2 are the author's; anyone else is told who acts, never offered a step they cannot take
  ok("C2.12 BR-4 fail: a person without the author duty is never offered Draft with AI; step 2 says the author does it", (() => { const s = st(formProgress({ ...base, canAuthor: false }), "map"); return s.state === "waiting_others" && s.next === null && /configuration author/.test(s.who ?? ""); })());
  ok("C2.12 BR-4 pass: the author is offered Draft with AI or add from the library on step 2", st(formProgress({ ...base }), "map").next?.label === "Draft with AI or add from the library");
  // ── BR-3 step 2: field map drafted
  ok("C2.12 BR-3 pass: a stored field map or a finished AI draft: step 2 done", st(formProgress({ ...base, mapped: 12 }), "map").state === "done" && st(formProgress({ ...base, draft: "done" }), "map").state === "done");
  ok("C2.12 BR-3 fail: a draft running: step 2 running (never 'needs you')", st(formProgress({ ...base, draft: "running" }), "map").state === "running");
  ok("C2.12 BR-3 fail: a draft that stopped says so and offers drafting again", /stopped before it finished/.test(st(formProgress({ ...base, draft: "stopped" }), "map").words));
  // ── BR-3 steps 3–5 from To review (D3: the same item gives the same next step)
  const rv = formProgress({ ...base, mapped: 12, items: [item("ai_proposals", "needs")] });
  ok("C2.12 D3 pass: step 3 takes its next step from the To review item (same label and link)", st(rv, "review").state === "needs_you" && st(rv, "review").next?.label === "Do the ai_proposals" && st(rv, "review").next?.href === "/x/ai_proposals");
  const wt = formProgress({ ...base, mapped: 12, items: [item("ai_proposals", "waiting")] });
  ok("C2.12 D3 fail: a To review item waiting on someone else: step 3 waits, says who, offers nothing", st(wt, "review").state === "waiting_others" && st(wt, "review").next === null && /content publisher/.test(st(wt, "review").who ?? ""));
  ok("C2.12 BR-3 pass: form fields with no decision and no item yet: step 3 needs you with the count", (() => { const s = st(formProgress({ ...base, mapped: 12, unresolved: 3 }), "review"); return s.state === "needs_you" && s.count === 3; })());
  ok("C2.12 BR-3 pass: a new shared field waiting: step 4 waits; a held new edition: step 5 waits", st(formProgress({ ...base, mapped: 12, items: [item("library_change", "waiting")] }), "fields").state === "waiting_others" && st(formProgress({ ...base, mapped: 12, items: [item("new_edition", "waiting")] }), "second_person").state === "waiting_others");
  ok("C2.12 BR-3 fail: an item of another kind never fills step 4 (a held file is step 5's)", st(formProgress({ ...base, mapped: 12, items: [item("held_file", "waiting")] }), "fields").state === "done");
  // ── BR-3 step 6: complete
  ok("C2.12 BR-3 pass: drafted, nothing open and no problem for the form: step 6 done, current null, nothing left", (() => { const p = formProgress({ ...base, mapped: 12 }); return st(p, "complete").state === "done" && p.current === null && p.whats_left.length === 0 && p.next_for_you === null; })());
  ok("C2.12 BR-3 fail: a validator problem for the form: step 6 needs you, with the problem's words and Review and release", (() => { const s = st(formProgress({ ...base, mapped: 12, problems: [{ level: "error", message: "Turn the condition into a rule." }] }), "complete"); return s.state === "needs_you" && /Turn the condition/.test(s.words) && s.next?.href === "/c/c1/review"; })());
  // ── BR-4 resume: current is the first unfinished step; the person's next can be a later step while the current one waits
  const br4 = formProgress({ ...base, mapped: 12, items: [item("ai_proposals", "waiting"), item("held_file", "needs")] });
  ok("C2.12 BR-4 pass: the current step waits on someone else; the person's next is a later step they can take", br4.current === "review" && br4.next_for_you?.step === "second_person");
  ok("C2.12 BR-4 fail: what's left lists every step not done, with who acts", br4.whats_left.map((w) => w.step).join() === "review,second_person,complete" && br4.whats_left[0].who !== null);

  // ── Review (514f0d8d): the rules it found without a failing test
  ok("C2.12 BR-3 pass (review M3): undecided form fields on To review (form_fields) fill step 3", st(formProgress({ ...base, mapped: 12, items: [item("form_fields", "needs")] }), "review").next?.label === "Do the form_fields");
  ok("C2.12 D3 fail (review m1): two step-3 items lead with To review's first (needs, then oldest), not the list's order", st(formProgress({ ...base, mapped: 12, items: [item("ai_proposals", "needs", { id: "a", at: "2026-10-31T10:00:00Z" }), item("form_fields", "needs", { id: "b", at: "2026-10-30T10:00:00Z" })] }), "review").next?.label === "Do the form_fields");
  ok("C2.12 BR-14 fail (review M2b): a form not on the combination: nothing after step 1 has started, even with a library field map", (() => { const p = formProgress({ ...base, line: "none", mapped: 53 }); return p.steps.slice(1).every((x) => x.state === "not_started" && x.next === null) && p.next_for_you?.step === "attach"; })());
  ok("C2.12 BR-10 pass (review m3): a warning does not keep the field map from complete (it is said); an error does", st(formProgress({ ...base, mapped: 12, problems: [{ level: "warning", message: "A list purpose note." }] }), "complete").state === "done" && /A list purpose note/.test(st(formProgress({ ...base, mapped: 12, problems: [{ level: "warning", message: "A list purpose note." }] }), "complete").words) && st(formProgress({ ...base, mapped: 12, problems: [{ level: "error", message: "E" }] }), "complete").state === "needs_you");
  ok("C2.12 BR-5 pass: each line of what's left links where it is done, when the person can do it", br4.whats_left.find((w) => w.step === "second_person")?.href === "/x/held_file");

  // ── The API on the sample (US$0): one saved AI answer replayed on the Super visa's IMM 5257.
  await call("POST", "/demo/reset", { confirm: "RESET" });
  await call("POST", "/demo/load");
  const sv = sql("select id from combination where combination_key like '%super_visa%' limit 1");
  const path = `/combinations/${sv}/forms/${encodeURIComponent("IMM 5257")}/progress`;
  let r = await call("GET", path);
  ok("C2.12 API pass: before any draft, the author's path: step 1 done (its PDF is attached), current step 2 with Draft with AI", r.status === 200 && r.body.steps[0].state === "done" && r.body.current === "map" && r.body.next_for_you?.step === "map", r.body);
  // Review M3: the server reads the author duty itself: the content reviewer is told who drafts, never offered it.
  const asC = (await call("GET", path, undefined, "user-C")).body;
  ok("C2.12 BR-4 fail (review M3, API): the content reviewer is told the configuration author drafts; no Draft with AI", asC.steps[1].state === "waiting_others" && asC.steps[1].next === null && asC.next_for_you === null, asC.steps[1]);
  const att = ((await call("GET", `/combinations/${sv}/attachments`)).body as { id: string; edition?: string }[]).find((a) => /IMM 5257 \(/.test(a.edition ?? ""))!;
  // Review M3: a stub pass proves the path only: it is not a field-map draft.
  // Test input (a finished stub step written straight to the table: running the stub pass rewrites tracked p2 files).
  sql(`insert into drafting_job (id, workspace_id, combination_id, attachment_id, kind, mode, status, started_by, finished_at) select gen_random_uuid(), workspace_id, combination_id, id, 'field_map', 'STUB', 'COMPLETED', 'user-A', now() from source_attachment where id = '${att.id}'`);
  ok("C2.12 BR-3 fail (review M3, API): after a stub pass the field map is still not drafted (step 2 the author's)", (await call("GET", path)).body.steps[1].state === "needs_you");
  const saved = (((await call("GET", `/attachments/${att.id}/draft-options`)).body.saved_runs ?? []) as { valid: boolean; file: string }[]).find((x) => x.valid)!;
  await call("POST", `/attachments/${att.id}/draft`, { mode: "replay", runFile: saved.file });
  for (let i = 0; i < 150; i++) { r = await call("GET", path, undefined, "user-C"); if (r.body?.steps?.[1]?.state === "done") break; await new Promise((x) => setTimeout(x, 400)); }
  const queue = (await call("GET", `/review-queue?filter=all&form=${encodeURIComponent("IMM 5257")}`, undefined, "user-C")).body.items as QueueItem[];
  const mine = queue.find((i) => i.state === "needs" && ["ai_proposals", "proposals", "form_fields"].includes(i.kind));
  const s3 = r.body.steps[2];
  ok("C2.12 D3 pass (API): after the draft, step 2 done and step 3's next step is To review's for the same person (label and link)", r.body.steps[1].state === "done" && !!mine && s3.state === "needs_you" && s3.next?.label === mine!.next!.label && s3.next?.href === mine!.next!.href, { s3, mine: mine?.next });
  const author = (await call("GET", path)).body;
  ok("C2.12 API pass: the same path read by another person names their own step or who acts (never a step they cannot take)", author.steps.every((s: { state: string; next: unknown; who: string | null }) => s.state !== "waiting_others" || (s.next === null && !!s.who)));
  // Review M3: another form's To review items never move this form's path (IMM 5707 on the same combination).
  const p5707 = (await call("GET", `/combinations/${sv}/forms/${encodeURIComponent("IMM 5707")}/progress`, undefined, "user-C")).body;
  ok("C2.12 D2 fail (review M3, API): IMM 5257's AI proposals are not IMM 5707's step 3", p5707.steps?.[2]?.next?.href !== s3.next?.href, p5707.steps?.[2]);
  // Review M1, M2a, M3 on the released sample combination (With an LMIA).
  const lmia = sql("select id from combination where label = 'With an LMIA' limit 1");
  const lmiaProblems = ((await call("GET", `/combinations/${lmia}`)).body.draft.problems as { where: string; item: string; message: string }[]).filter((p) => p.where === "Forms");
  const lmiaForms = sql(`select distinct lineage_key from combination_form where combination_id = '${lmia}' and status <> 'RETIRED'`).split("\n").filter(Boolean);
  let leaked = "", phantom = "";
  for (const code of lmiaForms) {
    const pg = (await call("GET", `/combinations/${lmia}/forms/${encodeURIComponent(code)}/progress`)).body;
    const q = (await call("GET", `/review-queue?filter=all&form=${encodeURIComponent(code)}`)).body.items as QueueItem[];
    // M1: step 3 needs you only when To review has an item for it.
    if (pg.steps?.[2]?.state === "needs_you" && !q.some((i) => ["ai_proposals", "proposals", "form_fields"].includes(i.kind))) phantom += `${code} `;
    // M3: step 6 says only this form's problems.
    const others = lmiaProblems.filter((p) => p.item !== code && !lmiaProblems.some((x) => x.item === code && x.message === p.message));
    if (others.some((p) => (pg.steps?.[5]?.words ?? "").includes(p.message))) leaked += `${code} `;
  }
  ok("C2.12 D3 fail (review M1, API): no form on With an LMIA gets a step-3 'needs you' that To review does not list (carried undecided fields are step 6's warning)", lmiaForms.length >= 5 && !phantom, phantom);
  ok("C2.12 fail (review M3, API): step 6 says only its own form's problems", !leaked, leaked);
  const gone = lmiaForms[0], gv = Number(sql(`select max(version) from combination_form where combination_id = '${lmia}' and lineage_key = '${gone}'`));
  await call("DELETE", `/combinations/${lmia}/forms/${encodeURIComponent(gone)}`, { version: gv });
  const afterRm = (await call("GET", `/combinations/${lmia}/forms/${encodeURIComponent(gone)}/progress`)).body;
  ok("C2.12 BR-3 fail (review M2a, API): a form removed from the combination reads not on it (before: its attached PDF kept it there)", afterRm.steps?.[0]?.state === "not_started" && afterRm.steps.slice(1).every((x: { state: string }) => x.state === "not_started"), afterRm.steps?.[0]);
  ok("C2.12 API (review m5): a combination id in capitals is the same combination", (await call("GET", `/combinations/${sv.toUpperCase()}/forms/${encodeURIComponent("IMM 5257")}/progress`)).status === 200);
  // A form only attached (not yet a line) whose field map the library already has: step 2 is Add from library, never "set up".
  const p5707b = (await call("GET", `/combinations/${sv}/forms/${encodeURIComponent("IMM 5707")}/progress`)).body;
  ok("C2.12 BR-3 fail (attached, not a line): a library field map is not this combination's: step 2 is Add from library and the form is not 'all done'", p5707b.steps?.[1]?.state === "needs_you" && p5707b.steps[1].next?.label === "Add from library" && p5707b.current === "map", p5707b.steps?.[1]);
  // ── refusals
  ok("C2.12 API fail: a form not in the library is 404 in words", (await call("GET", `/combinations/${sv}/forms/${encodeURIComponent("IMM 9999")}/progress`)).status === 404);
  ok("C2.12 API fail: an unknown combination is 404 in words", (await call("GET", `/combinations/00000000-0000-0000-0000-000000000000/forms/${encodeURIComponent("IMM 5257")}/progress`)).status === 404 && (await call("GET", `/combinations/not-an-id/forms/${encodeURIComponent("IMM 5257")}/progress`)).status === 404);
  ok("C2.12 API fail: nobody named is 401", (await call("GET", path, undefined, null)).status === 401);
  ok("C2.12 API fail: an over-long form number is 400 in words", (await call("GET", `/combinations/${sv}/forms/${"x".repeat(41)}/progress`)).status === 400);
  ok("C2.12 API: the number in any spelling the library accepts (imm5257)", (await call("GET", `/combinations/${sv}/forms/imm5257/progress`)).body?.form === "IMM 5257");
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`FAIL  the check stopped: ${(e as Error).stack}`); process.exit(1); });
