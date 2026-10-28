// S5 Combination workspace slice 3 (runtime lane, W1-08, P-123; Lead Go 28 Oct after S4 merged): the combination's forms
// come from the form finder (the forms lane's endpoints), IRCC guides are linked to their combinations as sources (Lead
// decision on S4's open point), and the Forms tab's line removes are "Remove from this combination" with the one Undo of
// the page (P-116 amended: the forms lane's POST …/forms/undo). A passing and a failing case per rule, on an isolated
// copy with the sample loaded. Finder runs replay the committed AI answers (US$0); no model call.
//   zsh studio/tools/isolated.sh runtime_s5f 4436 start && tsx studio/tests/check_s5_slice3.ts 4436 xr_studio_runtime_s5f
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { changeWords } from "../contracts/workspace.ts";

const PORT = Number(process.argv[2] ?? 4436), DB = process.argv[3] ?? "xr_studio_runtime_s5f";
const log: any[] = []; let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; log.push({ name, ok: !!c, detail }); console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 220)}` : ""}`); };
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: any = null; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const settle = async (id: string) => { let r = { status: 0, body: null as any }; for (let i = 0; i < 240; i++) { r = await call("GET", `/runs/${id}`); if (!["queued", "running", "stopping"].includes(r.body?.status)) return r; await new Promise((x) => setTimeout(x, 250)); } return r; };
const find = async (c: string, key: string, extra: Record<string, unknown> = {}) => {
  const plan = (await call("POST", `/combinations/${c}/forms/find/plan`, { mode: "replay", ...extra })).body;
  const run = await call("POST", `/combinations/${c}/forms/find`, { mode: "replay", ...extra, planSha256: plan.plan_sha256, idempotencyKey: key });
  return { plan, run, done: run.body?.id ? await settle(run.body.id) : null };
};

(async () => {
  const served = (await call("GET", "/session")).body?.workspace?.id;
  const inDb = (() => { try { return sql(`select id from workspace where id='${served}'`); } catch { return ""; } })();
  if (!served || !inDb) { console.error(`STOP  the database ${DB} is not the one the server on port ${PORT} uses. Pass the copy's database: tsx <check> ${PORT} xr_studio_<name>.`); process.exit(2); }
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const l = await call("POST", "/demo/load", {});
  if (l.status >= 300) { console.error("STOP  the sample did not load", l.body); process.exit(2); }
  const vv = sql(`select id from combination where combination_key='vv.single'`), lm = sql(`select id from combination where combination_key='lm.high_wage'`), sv = sql(`select id from combination where combination_key='sv.super_visa'`);
  const view = async (c: string) => (await call("GET", `/combinations/${c}/workspace?tab=forms`)).body;

  // ---------------------------------------------------------------- IRCC guides as sources (Lead decision on S4's open point)
  const guideOf = (c: string) => sql(`select string_agg(a.edition, ',') from source_attachment a where a.combination_id='${c}' and a.kind='Instructions' and a.sha256 in (select e.sha256 from form_edition e join gov_form_def d on d.id=e.gov_form_def_id where d.form_kind='guide')`);
  ok("C11.15 guides pass: Load sample links each sample combination's IRCC guide to it as a source (Visitor visa and Super visa read Guide 5256)", /^Guide 5256/.test(guideOf(vv)) && /^Guide 5256/.test(guideOf(sv)), { vv: guideOf(vv), sv: guideOf(sv) });
  ok("C11.15 guides fail: a combination with no guide in the sample (With an LMIA) gets no guide source", guideOf(lm) === "", guideOf(lm));
  const lib = (await call("GET", "/library/forms/list?type=guide")).body;
  const g5256 = (lib.rows ?? []).find((r: any) => r.code === "Guide 5256");
  ok("C11.15 guides pass: the Form library counts the combinations that read Guide 5256 (no longer \"Not used\")", !!g5256 && g5256.used_by.some((u: any) => u.id === vv) && g5256.used_by.some((u: any) => u.id === sv), g5256?.used_by?.map((u: any) => u.label));
  // Visitor visa already had the guide page among its sample sources (the same file): it is not linked twice.
  ok("C11.15 guides fail-guard: a guide the combination already has as a source (the same file) is not linked twice", Number(sql(`select count(*) from source_attachment where combination_id='${vv}' and sha256 in (select e.sha256 from form_edition e join gov_form_def d on d.id=e.gov_form_def_id where d.form_key='Guide 5256')`)) === 1);
  const atts = (await call("GET", `/combinations/${sv}`)).body.attachments as any[];
  ok("C11.15 guides: Super visa's Forms tab lists the guide among its sources (read by AI, never filed)", atts.some((a) => a.kind === "Instructions" && /^Guide 5256/.test(a.edition ?? "") && /never filed/.test(a.statusDetail ?? "")), atts.filter((a) => a.kind !== "Form").map((a) => `${a.edition}: ${a.statusDetail}`));

  // ---------------------------------------------------------------- forms from the finder (M2)
  let v = await view(vv);
  ok("setup: Visitor visa starts with no form line and nothing to undo", v.lines.length === 0 && v.lastChange === null, { lines: v.lines.length, last: v.lastChange });
  ok("C11.15 fail: a case officer cannot start a find (403)", (await call("POST", `/combinations/${vv}/forms/find`, { mode: "replay", planSha256: "0".repeat(64), idempotencyKey: "s5-officer-find" }, "user-O")).status === 403);
  const f1 = await find(vv, `s5f-${Date.now()}`);
  ok("C11.15 plan pass: the plan says its steps and costs US$0 when it replays saved answers", f1.plan?.totals?.worst_usd === 0 && f1.plan.steps?.length > 2, f1.plan?.totals);
  ok("C11.15 run pass: the find runs and ends (saved AI answers, US$0)", f1.done?.body?.status === "done" || f1.done?.body?.status === "done_with_problems", { status: f1.done?.body?.status, usd: f1.done?.body?.usd });
  v = await view(vv);
  const picked = v.lines.filter((x: any) => x.origin === "AI_FOUND");
  ok("C11.15 pass: the forms AI picked are lines of the combination, marked AI_FOUND with IRCC's words", picked.length > 0 && picked.some((x: any) => x.code === "IMM 5257") && picked.every((x: any) => !!x.quote), picked.map((x: any) => `${x.code}: ${(x.quote ?? "").slice(0, 40)}`));
  const latest = (await call("GET", `/combinations/${vv}/forms/find/latest`)).body;
  ok("C11.15: the latest find names a state for every form (attached ones are the lines)", latest.forms.length >= picked.length && latest.forms.filter((x: any) => x.state === "ATTACHED" || x.state === "DOWNLOADED_ATTACHED").every((x: any) => v.lines.some((y: any) => y.code === x.code)), latest.forms.map((x: any) => `${x.code}:${x.state}`));
  ok("C11.15 guides: the find read the guide and keeps one source for it (no duplicate)", Number(sql(`select count(*) from source_attachment where combination_id='${vv}' and sha256 in (select e.sha256 from form_edition e join gov_form_def d on d.id=e.gov_form_def_id where d.form_key='Guide 5256')`)) === 1);
  ok("P-116: the find is the last change on the page, said in words, with its id for Undo", v.lastChange?.action === "finder_attach" && changeWords(v.lastChange).startsWith("AI attached"), v.lastChange);
  const fl = await find(lm, `s5f-lm-${Date.now()}`);
  ok("C11.15 fail: a combination with no saved AI answer attaches nothing at US$0 (it says so; no line is made up)", (await view(lm)).lines.every((x: any) => x.origin !== "AI_FOUND") && (fl.done?.body?.usd?.spent ?? 0) === 0, { status: fl.done?.body?.status, message: fl.done?.body?.message });

  // ---------------------------------------------------------------- Remove from this combination + the one Undo (P-116)
  const L = v.lines.find((x: any) => x.code === "IMM 5257") ?? v.lines[0];
  let r = await call("DELETE", `/combinations/${vv}/forms/${encodeURIComponent(L.code)}`, { version: L.version + 5 });
  ok("P-116 fail: a remove sent with an old version is refused 409 in words (someone changed the line)", r.status === 409, r.body?.detail);
  ok("P-116 roles: a case officer cannot remove a form (403)", (await call("DELETE", `/combinations/${vv}/forms/${encodeURIComponent(L.code)}`, { version: L.version }, "user-O")).status === 403);
  r = await call("DELETE", `/combinations/${vv}/forms/${encodeURIComponent(L.code)}`, { version: L.version });
  v = await view(vv);
  ok("P-116 pass: Remove from this combination takes the line off, lists it under Removed in this draft, and it stays in the library", r.status < 300 && r.body?.in_library === true && !v.lines.some((x: any) => x.code === L.code) && v.removed.some((x: any) => x.code === L.code), r.body);
  ok("P-116: the removal is the last change, named for the Undo bar", v.lastChange?.action === "remove" && changeWords(v.lastChange) === `Removed ${L.code}`, v.lastChange);
  const f2 = await find(vv, `s5f-again-${Date.now()}`);
  const after = (await call("GET", `/combinations/${vv}/forms/find/latest`)).body;
  ok("C11.15 M2c pass: Find again never re-attaches a form a person removed; it shows as Removed by a person", !(await view(vv)).lines.some((x: any) => x.code === L.code) && after.forms.some((x: any) => x.code === L.code && x.state === "REMOVED_BY_PERSON"), { status: f2.done?.body?.status, states: after.forms.map((x: any) => `${x.code}:${x.state}`) });
  r = await call("POST", `/combinations/${vv}/forms`, { formKey: L.code });
  v = await view(vv);
  ok("P-116 Add back pass: a removed form is put back by hand from its row (the same line)", r.status < 300 && v.lines.some((x: any) => x.code === L.code) && !v.removed.some((x: any) => x.code === L.code), r.body);
  // The one Undo: the last change (the Add back) is reversed exactly; an old change id is refused.
  const stale = (await call("POST", `/combinations/${vv}/forms/undo`, { changeId: "00000000-0000-4000-8000-000000000000" })).status;
  ok("P-116 Undo fail: an Undo for a change that is no longer the last one is refused 409 (never undone blind)", stale === 409, stale);
  r = await call("POST", `/combinations/${vv}/forms/undo`, { changeId: v.lastChange.id });
  v = await view(vv);
  ok("P-116 Undo pass: Undo reverses the last change (the Add back), so the form is removed again", r.status < 300 && !v.lines.some((x: any) => x.code === L.code) && v.removed.some((x: any) => x.code === L.code), r.body);
  r = await call("POST", `/combinations/${vv}/forms/undo`, { changeId: v.lastChange.id });
  v = await view(vv);
  ok("P-116 Undo pass: Undo again reverses the removal; the line is back as it was", r.status < 300 && v.lines.some((x: any) => x.code === L.code && x.origin === L.origin && x.who === L.who), r.body);

  const out = join(import.meta.dirname, "..", "var", "suites"); mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "check_s5_slice3.json"), JSON.stringify({ at: new Date().toISOString(), pass, fail, log }, null, 1));
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  unexpected", e); process.exit(1); });
