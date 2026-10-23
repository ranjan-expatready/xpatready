// Break M1 (CHECK, 23 Oct): a release must publish exactly the reviewed snapshot. The approver releases while the author
// saves an expert change at several delays; whatever the timing, no row may end up PUBLISHED that is not in the release
// (the release is refused before, rolled back during, or the change stays DRAFT for the next review). Isolated copy
// with the sample loaded by this check; no browser, no model call.
//   zsh studio/tools/isolated.sh screens_race 4447 start && tsx studio/tests/check_screen01_release_race.ts 4447 xr_studio_screens_race
import { execFileSync } from "node:child_process";
const PORT = Number(process.argv[2] ?? 4447), DB = process.argv[3] ?? "xr_studio_screens_race";
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => { const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) }); return { status: r.status, body: await r.json().catch(() => null) }; };
(async () => {
  await call("POST", "/demo/load");
  const id = sql("select c.id from combination c join program_def p on p.id=c.program_def_id where p.program_node_key='individual.work_permits.employer_specific.with_lmia'");
  let bad = 0;
  for (const delay of [0, 5, 15, 30, 60, 120, 250]) {
    await call("POST", `/combinations/${id}/requirements`, { newTypeName: `Race base ${delay}`, attachMode: "COMBINATION_MANDATORY", appliesToRoles: "principal_applicant" });
    await call("POST", `/combinations/${id}/submit`, {});
    const sme = ((await call("GET", `/combinations/${id}/review`)).body.submission?.changeSummary ?? []).filter((x: any) => x.needs_sme).map((x: any) => `${x.kind}|${x.key}`);
    await call("POST", `/combinations/${id}/signoff`, { items: sme, action: "signed" }, "user-C");
    const d = (await call("GET", "/draft", undefined, "user-B")).body;
    const rel = call("POST", "/pack/release", { expectedChanges: d.changes }, "user-B");
    await new Promise((r) => setTimeout(r, delay));
    const late = call("POST", `/combinations/${id}/requirements`, { newTypeName: `Race late ${delay}`, attachMode: "COMBINATION_MANDATORY", appliesToRoles: "principal_applicant" });
    const [a, b] = await Promise.all([rel, late]);
    const published = sql(`select coalesce(string_agg(lineage_key, ','), '') from document_requirement where combination_id='${id}' and status='PUBLISHED'`).split(",").filter(Boolean);
    const snap = sql(`select snapshot::text from config_release where combination_id='${id}' order by version desc limit 1`);
    const missing = published.filter((l) => !snap.includes(`"lineage": "${l}"`) && !snap.includes(`"lineage":"${l}"`));
    const lateStatus = sql(`select string_agg(status::text, ',') from document_requirement where combination_id='${id}' and document_type_key in (select document_type_key from document_type where name='Race late ${delay}')`);
    if (missing.length) bad++;
    console.log(`delay ${delay}ms: release ${a.status}${a.status >= 400 ? ` (${String(a.body?.detail ?? a.body?.message).slice(0, 90)})` : ""} · late add ${b.status} → ${lateStatus} · published not in the release: ${missing.length ? missing.join(",") : "none"}`);
    // tidy: drop the late change so the next round starts from a reviewed draft
    sql(`delete from document_requirement where combination_id='${id}' and status='DRAFT'`);
  }
  console.log(bad ? `FAIL ${bad} round(s) published an unreviewed row` : "PASS no round published an unreviewed row");
  process.exit(bad ? 1 : 0);
})();
