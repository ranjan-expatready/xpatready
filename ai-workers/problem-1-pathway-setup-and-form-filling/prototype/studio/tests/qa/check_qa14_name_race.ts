// QA-14 (Bug, Major, C1.2; BR-6 unique name within a parent): two people (or two tabs) creating the same category at the
// same moment must end with one category. Today the duplicate check runs before the insert and the key gets a "-2"
// suffix, so both can succeed: "Cat 2" stored twice (individual.visitors.cat_2 and cat_2-2). Also seen as the red check
// "two people creating the same category at once" in tests/check_grounding_db.ts (28/29 on main 65826022).
// FAILS today (most runs); PASSES once same-parent names are unique in the database (normalised name), not only in code.
//   zsh studio/tools/isolated.sh qa_race 4479 start && tsx studio/tests/qa/check_qa14_name_race.ts 4479 xr_studio_qa_race
import { execFileSync, spawn } from "node:child_process";
const PORT = Number(process.argv[2] ?? 4479), DB = process.argv[3] ?? "xr_studio_qa_race";
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const post = (body: unknown) => fetch(`http://localhost:${PORT}/api/program-nodes`, { method: "POST", headers: { "x-actor": "user-A", "content-type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.status);
const stamp = Date.now().toString(36);
const parent = `race_${stamp}`;
console.log(`setup: program ${await post({ kind: "PROGRAM", label: `Race ${stamp}`, parentKey: "individual" })}`);
const parentKey = sql(`select program_node_key from program_def where label='Race ${stamp}'`);
const statuses: number[][] = [];
// Separate processes, four at once per name (two tabs and a double click), twenty names: the race is timing-dependent.
const curl = (label: string) => new Promise<number>((res) => { const c = spawn("curl", ["-s", "-o", "/dev/null", "-w", "%{http_code}", "-X", "POST", "-H", "x-actor: user-A", "-H", "content-type: application/json", "-d", JSON.stringify({ kind: "STREAM", label, parentKey }), `http://localhost:${PORT}/api/program-nodes`]); let o = ""; c.stdout.on("data", (d) => (o += d)); c.on("close", () => res(Number(o))); });
for (let n = 1; n <= 20; n++) statuses.push(await Promise.all([0, 1, 2, 3].map(() => curl(`Category ${n}`))));
const dupes = sql(`select coalesce(string_agg(label || ' x' || n, ', '), '') from (select label, count(*) n from program_def where parent_node_key='${parentKey}' group by label having count(*) > 1) d`);
const ok = !dupes && statuses.every((s) => s.filter((x) => x === 201).length === 1);
console.log(`${ok ? "PASS" : "FAIL"}  QA-14: twenty names, each created four times at once, leave one category per name — ${dupes || "no duplicates"}; statuses ${JSON.stringify(statuses)}`);
void parent;
process.exit(ok ? 0 : 1);
