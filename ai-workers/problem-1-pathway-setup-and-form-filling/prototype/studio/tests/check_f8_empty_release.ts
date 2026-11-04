// F8 (X1a, found by the runtime builder in #113): a combination with no form and no document line is never submitted,
// signed off or released. A release problem (not a validator one, review f8 M1) blocks submit and approve, in words that name the fix; adding a form or a
// document line takes it away; a combination with lines never shows it. On an isolated copy with the sample loaded. No
// browser, no model call (US$0). G5 (C5.1, P-248, 4 Nov; amends P-207): one document line and no form is no longer
// enough; a release needs a form line too (FORM_LINE_WORDS). The whole rule is in acceptance/C5.1.test.ts.
//   zsh studio/tools/isolated.sh screens_f8 4448 start && tsx studio/tests/check_f8_empty_release.ts 4448 xr_studio_screens_f8
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { contentProblems, emptyProblem, EMPTY_WORDS, FORM_LINE_WORDS } from "../api/src/studio.ts";
import { problemWords } from "../contracts/programs.ts";

const PORT = Number(process.argv[2] ?? 4448), DB = process.argv[3] ?? "xr_studio_screens_f8";
const log: any[] = []; let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; log.push({ name, ok: !!c, detail }); console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 220)}` : ""}`); };
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: any = null; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const words = (r: { body: any }) => String(r.body?.detail ?? r.body?.message ?? "");
const EMPTY = /Nothing to release yet: no form is set up on this combination and it has no documents/;

(async () => {
  const served = (await call("GET", "/session")).body?.workspace?.id;
  const inDb = (() => { try { return sql(`select id from workspace where id='${served}'`); } catch { return ""; } })();
  if (!served || !inDb) { console.error(`STOP  the database ${DB} is not the one the server on port ${PORT} uses. Pass the copy's database: tsx <check> ${PORT} xr_studio_<name>.`); process.exit(2); }
  if (!(await call("GET", "/demo/status")).body?.loaded) { const l = await call("POST", "/demo/load", {}); if (l.status >= 300) { console.error("STOP  the sample did not load", l.body); process.exit(2); } }

  // ---------------------------------------------------------------- the rule itself
  const errs = (forms: number, docs: number) => emptyProblem({ forms: Array(forms).fill({}), document_requirements: Array(docs).fill({}) } as any);
  ok("F8 fail (rule): no form and no document line is one release-blocking error", errs(0, 0).length === 1 && errs(0, 0)[0].level === "error" && errs(0, 0)[0].message === EMPTY_WORDS);
  ok("F8 pass (rule): one document line and no form is not 'nothing to release'", errs(0, 1).length === 0);
  ok("F8 pass (rule): one form and no document line is not 'nothing to release'", errs(1, 0).length === 0);
  // G5 (P-248): P-207's "documents only is enough" is gone. The same draft now gets the form-line line, never F8's too.
  const all = (forms: object[], docs: number) => contentProblems({ forms, document_requirements: Array(docs).fill({}) } as any);
  ok("G5 fail (rule, P-248): one document line and no form now holds the release, in the form-line words only", all([], 1).length === 1 && all([], 1)[0].level === "error" && all([], 1)[0].message === FORM_LINE_WORDS);
  ok("G5 pass (rule): nothing at all is F8's one line, never the form-line line as well", all([], 0).length === 1 && all([], 0)[0].message === EMPTY_WORDS);
  ok("G5 pass (rule): one form line and one document line hold nothing", all([{ form_kind: "data_form" }], 1).length === 0);
  ok("F8 (words): the error is said without an item prefix", problemWords({ level: "error", where: "Forms", item: "", message: "Nothing to release yet: x" }) === "Nothing to release yet: x" && problemWords({ level: "error", where: "Forms", item: "IMM 1", message: "y" }) === "IMM 1: y");

  // ---------------------------------------------------------------- through the API
  const vv = sql("select id from combination where combination_key='vv.single'");
  ok("setup: Visitor visa has no form line and no document line", !!vv && sql(`select count(*) from combination_form where combination_id='${vv}'`) === "0" && sql(`select count(*) from document_requirement where combination_id='${vv}'`) === "0");
  const probs = (await call("GET", `/combinations/${vv}`)).body.draft.problems as any[];
  ok("F8 fail: its draft lists the error 'Nothing to release yet', naming the fix", probs.some((p) => p.level === "error" && EMPTY.test(p.message) && /Find forms/.test(p.message)), probs.map((p) => p.message).slice(0, 3));
  // Review f8 M1: the Overview's missing list keeps saying "No forms yet" once, with its own step, and gains no filing line.
  const row = (await call("GET", `/combinations/${vv}/summary`)).body.row;
  const missing = (row?.missing ?? []) as { code: string; text: string }[];
  ok("F8 (M1): the Overview's missing list says 'no forms' once and has no filing line or 'Nothing to release' line", missing.filter((m) => m.code === "no_forms").length === 1 && !missing.some((m) => m.code === "filing_problem" || EMPTY.test(m.text)), missing.map((m) => `${m.code}: ${m.text.slice(0, 60)}`));
  let r = await call("POST", `/combinations/${vv}/submit`, {});
  ok("F8 fail: sending it for review is refused, in words", r.status === 400 && EMPTY.test(words(r)) && !/^: /.test(words(r).split("before submitting: ")[1] ?? ""), words(r));
  r = await call("POST", `/combinations/${vv}/approve`, {}, "user-B");
  ok("F8 fail: approving it is refused (409), in words", r.status === 409 && EMPTY.test(words(r)), words(r));
  ok("F8 fail: nothing was released", sql(`select count(*) from config_release where combination_id='${vv}'`) === "0");

  r = await call("POST", `/combinations/${vv}/forms`, { formKey: "IMM 5257" });
  const after = (await call("GET", `/combinations/${vv}`)).body.draft.problems as any[];
  ok("F8 pass: once a form is added the 'nothing to release' error is gone", r.status < 300 && !after.some((p) => EMPTY.test(p.message)), { status: r.status, body: r.status >= 300 ? words(r) : undefined });

  const wp = sql("select id from combination where combination_key='wp.family'");
  const wpProbs = (await call("GET", `/combinations/${wp}`)).body.draft.problems as any[];
  ok("F8 pass: the work-permit combination (forms and documents) never shows it", !wpProbs.some((p) => EMPTY.test(p.message)));

  const out = join(import.meta.dirname, "..", "var", "suites"); mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "check_f8_empty_release.json"), JSON.stringify({ at: new Date().toISOString(), pass, fail, log }, null, 1));
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  unexpected", e); process.exit(1); });
