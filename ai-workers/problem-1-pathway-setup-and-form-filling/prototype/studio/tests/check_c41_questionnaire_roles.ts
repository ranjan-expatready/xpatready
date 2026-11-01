// C4.1 (P-130, P-174, P-216 (2)): the SQR is built per person role from the facts the forms and documents need — each
// applying role has its own questions, no role has a gap, no fact a form needs is asked of nobody, a fact a document
// supplies is not asked, and every section header is the library's one title in words. The checks moved here from
// acceptance/C4.1.test.ts so the batch runs them on the suites' fixture (Work permit, wp.family); the acceptance test
// runs the same on Visitor visa once it has questions (C4.11). Rules only (US$0).
//   zsh studio/tools/isolated.sh runtime_c41q 4433 start && tsx studio/tests/check_c41_questionnaire_roles.ts 4433 xr_studio_runtime_c41q
import { execFileSync } from "node:child_process";

const PORT = Number(process.argv[2] ?? 4480), DB = process.argv[3] ?? "xr_studio_runtime_c41q";
let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 240)}` : ""}`); };
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: any = null; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

(async () => {
  const served = (await call("GET", "/session")).body?.workspace?.id;
  const inDb = (() => { try { return sql(`select id from workspace where id='${served}'`); } catch { return ""; } })();
  if (!served || !inDb) { console.error(`STOP  the database ${DB} is not the one the server on port ${PORT} uses. Pass the copy's database: tsx <check> ${PORT} xr_studio_<name>.`); process.exit(2); }
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const l = await call("POST", "/demo/load", {});
  if (l.status >= 300) { console.error("STOP  the sample did not load", l.body); process.exit(2); }
  const wp = sql(`select id from combination where combination_key='wp.family'`);
  const q = (await call("GET", `/combinations/${wp}/workspace?tab=questionnaires`)).body;
  const roles = q?.questionnaire?.roles ?? [];
  const applying = (q?.people?.lines ?? []).filter((x: any) => x.applies).map((x: any) => x.role);
  ok("C4.1 pass: each applying person role has its own questions", applying.length >= 2 && applying.every((r: string) => (roles.find((x: any) => x.role === r)?.questions ?? 0) > 0), roles.map((r: any) => `${r.role}:${r.questions}`));
  ok("C4.1 pass: no role has a gap (every fact a form needs is asked or comes from a document or the case officer)", roles.length > 0 && roles.every((r: any) => r.gaps === 0));
  const nobody = ((await call("GET", `/combinations/${wp}`)).body?.draft?.problems ?? []).filter((p: any) => /nobody is asked for it/.test(p.message));
  ok("C4.1 pass: no fact a form needs is asked of nobody, for any role", nobody.length === 0, { count: nobody.length });
  const sections = q?.questionnaire?.sections ?? [];
  ok("C4.1 pass: every section header is a title in words, never a system key", sections.length > 0 && sections.every((x: any) => !!x.title && !/^[a-z0-9]+(_[a-z0-9]+)+$/.test(x.title) && x.title !== x.id), sections.map((x: any) => x.title).slice(0, 6));
  const lib = new Map<string, string>(sql(`select distinct on (section_key) section_key || '|' || title from logical_section order by section_key, version desc`).split("\n").map((s) => s.split("|") as [string, string]));
  ok("C4.1 pass (P-216 (2)): each section shows the library's one title", sections.every((x: any) => lib.get(x.id) === x.title), sections.filter((x: any) => lib.get(x.id) !== x.title).map((x: any) => `${x.id}:${x.title}`).slice(0, 3));
  const pv = (await call("GET", `/combinations/${wp}/workspace?tab=preview&person=principal`)).body?.preview;
  const fromDocs = (pv?.sets?.sqr?.fromDocuments ?? []).flatMap((d: any) => d.facts);
  const asked = new Set((pv?.questionnaire?.sections ?? []).flatMap((s: any) => (s.questions ?? []).flatMap((x: any) => [x.label, x.meaning])));
  ok("C4.1 pass: a fact the passport supplies is not asked of the principal", fromDocs.length > 0 && asked.size > 0 && !fromDocs.some((f: string) => asked.has(f)), fromDocs.slice(0, 3));
  console.log(`${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})();
