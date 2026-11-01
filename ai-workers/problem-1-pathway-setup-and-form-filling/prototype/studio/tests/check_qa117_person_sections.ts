// QA-117 (qa after-merge 30 Oct, 5f6c8deb): Questionnaires › Spouse or partner listed "Application details · 0 questions
// for Spouse or partner": a section that asks another person (or the application, with the principal) showed as an empty
// section of this person. Now a person sees the sections that ask them, plus the chosen sections that ask nobody at all
// (P-174: the section choice decides which empty sections show; that is where one is removed). Through the API on every
// combination of the loaded sample, a pass and a fail. No model call (US$0).
//   zsh studio/tools/isolated.sh runtime_qa117 4431 start && tsx studio/tests/check_qa117_person_sections.ts 4431 xr_studio_runtime_qa117
import { execFileSync } from "node:child_process";

const PORT = Number(process.argv[2] ?? 4431), DB = process.argv[3] ?? "xr_studio_runtime_qa117";
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 260)}` : ""}`); };
const call = async (method: string, path: string, body?: unknown) => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": "user-A", "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, body: await r.json().catch(() => null) };
};
type Sec = { id: string; title: string; questions: unknown[] };
const view = async (id: string, role: string) => (await call("GET", `/combinations/${id}/workspace?tab=questionnaires&role=${role}`)).body?.questionnaire as { role: string; roles: { role: string }[]; sections: Sec[] };

(async () => {
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const l = await call("POST", "/demo/load", {});
  if (l.status >= 300) { console.error("STOP  the sample did not load", l.body); process.exit(2); }
  const combos = sql("select id || '|' || label from combination where retired_at is null order by label").split("\n").filter(Boolean).map((x) => { const [id, ...l] = x.split("|"); return { id, label: l.join("|") }; });
  const bad: string[] = []; let people = 0, asked = 0;
  for (const c of combos) {
    const first = await view(c.id, "principal");
    if (!first) continue;
    const per = new Map<string, Sec[]>();
    for (const r of first.roles) { const v = await view(c.id, r.role); if (v?.role === r.role) per.set(r.role, v.sections); }
    const asks = new Set([...per.values()].flatMap((ss) => ss.filter((s) => s.questions.length).map((s) => s.id)));
    for (const [role, ss] of per) {
      people++;
      for (const s of ss) if (!s.questions.length && asks.has(s.id)) bad.push(`${c.label} · ${role} · ${s.title}`);
      asked += ss.filter((s) => s.questions.length).length;
    }
  }
  ok("C4.10 QA-117 pass: no person lists a section that asks someone else as '0 questions' for them", people > 0 && bad.length === 0, bad.slice(0, 6));
  ok("C4.10 QA-117 fail-guard: the sections that do ask a person are all still listed for them", asked > 0, { people, asked });

  // A chosen section that asks nobody still shows for every person (it is removed there, P-174 / QA-93). Neither sample
  // has one and the library takes no free add (P-158), so the test places one library section with no questions.
  const lmia = combos.find((c) => /With an LMIA/.test(c.label))!;
  sql(`insert into logical_section (id, workspace_id, section_key, version, status, title, meaning, display_order, client_only, origin, updated_by, updated_at) select gen_random_uuid(), workspace_id, 'qa117_empty', 1, 'PUBLISHED', 'Sample: a section with no questions', 'Test only (QA-117).', 99, false, 'HUMAN', 'user-A', now() from combination where id='${lmia.id}'`);
  const sel = await call("POST", `/combinations/${lmia.id}/sections/qa117_empty`, {});
  const roles = (await view(lmia.id, "principal")).roles.map((r) => r.role);
  const secs = (await Promise.all(roles.map((role) => view(lmia.id, role)))).map((v) => v.sections.find((s) => s.id === "qa117_empty"));
  ok("C4.10 QA-117 / P-174 pass: a chosen section that asks nobody still shows, empty, for every person (where it is removed)", sel.status < 300 && roles.length > 1 && secs.every((s) => s && !s.questions.length), { status: sel.status, roles, shown: secs.map((s) => !!s) });
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
