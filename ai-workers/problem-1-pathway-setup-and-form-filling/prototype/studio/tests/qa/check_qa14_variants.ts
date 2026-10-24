// QA-14 follow-up (C1.2; BR-6 "same name ignoring case, spaces and punctuation"): the database uniqueness added on main
// (migration 20261024090000) must hold for spelling variants sent at the same moment, at category and sub-category level,
// and the refusal must say why in plain words. Variants: case, double spaces, a hyphen, an underscore, a trailing dot.
// PASSES when each round stores exactly one row and every refusal is 409 with a message naming the existing name.
// Its own isolated copy (qa ports, xr_studio_qa_*); no browser, no model call.
//   zsh studio/tools/isolated.sh qa_race 4479 start && tsx studio/tests/qa/check_qa14_variants.ts 4479 xr_studio_qa_race
import { execFileSync, spawn } from "node:child_process";
const PORT = Number(process.argv[2] ?? 4479), DB = process.argv[3] ?? "xr_studio_qa_race";
const PSQL = ["/opt/homebrew/opt/postgresql@18/bin/psql", "/usr/local/bin/psql"].find((p) => { try { execFileSync(p, ["--version"]); return true; } catch { return false; } })!;
const sql = (q: string) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const curl = (body: unknown) => new Promise<{ status: number; text: string }>((res) => {
  const c = spawn("curl", ["-s", "-w", "\n%{http_code}", "-X", "POST", "-H", "x-actor: user-A", "-H", "content-type: application/json", "-d", JSON.stringify(body), `http://localhost:${PORT}/api/program-nodes`]);
  let o = ""; c.stdout.on("data", (d) => (o += d)); c.on("close", () => { const i = o.lastIndexOf("\n"); res({ status: Number(o.slice(i + 1)), text: o.slice(0, i) }); });
});
const stamp = Date.now().toString(36);
await curl({ kind: "PROGRAM", label: `Variant ${stamp}`, parentKey: "individual" });
const programKey = sql(`select program_node_key from program_def where label='Variant ${stamp}'`);
await curl({ kind: "STREAM", label: "Parent category", parentKey: programKey });
const catKey = sql(`select program_node_key from program_def where parent_node_key='${programKey}' and label='Parent category'`);
const variants = (n: number) => [`Open Work Permit ${n}`, `open  work-permit ${n}`, `OPEN_WORK_PERMIT ${n}`, `Open work permit ${n}.`];
let fails = 0;
for (const [level, kind, parentKey] of [["category", "STREAM", programKey], ["sub-category", "CATEGORY", catKey]] as const) {
  for (let n = 1; n <= 10; n++) {
    const rs = await Promise.all(variants(n).map((label) => curl({ kind, label, parentKey })));
    const created = rs.filter((r) => r.status === 201).length;
    const refused = rs.filter((r) => r.status === 409);
    const rows = Number(sql(`select count(*) from program_def where parent_node_key='${parentKey}' and name_key='openworkpermit${n}'`));
    const plain = refused.every((r) => /already|exists|same name/i.test(r.text) && !/prisma|constraint|unique index|P2002/i.test(r.text));
    const ok = created === 1 && refused.length === 3 && rows === 1 && plain;
    if (!ok) fails++;
    if (!ok || n === 1) console.log(`${ok ? "PASS" : "FAIL"}  ${level} round ${n}: statuses ${rs.map((r) => r.status).join(",")}, rows ${rows}; a refusal reads: ${refused[0]?.text.slice(0, 200) ?? "(none)"}`);
  }
}
console.log(`${fails ? "FAIL" : "PASS"}  QA-14 variants: ${20 - fails}/20 rounds stored one name and refused the rest in plain words`);
process.exit(fails ? 1 : 0);
