// QA-275 (C4.6, STANDARDS: an artifact's record matches its file): two fills of one form and person in the same minute
// each keep their own file. Before, Preview's fill named its file by the minute in UTC, so the second fill overwrote the
// first and the first artifact row then served the later bytes. Here: a draft fill and a release fill of IMM 1295 for the
// principal, then a second draft fill, all inside one minute; each row has its own path, its file on disk has the hash the
// row recorded, and each download is the bytes of its own fill. An earlier fill's link (a minute-named file, as made
// before this change) still downloads. No browser, no AI, US$0.
//   zsh studio/tools/isolated.sh qa275 4475 start && tsx studio/tests/check_qa275_fill_files.ts 4475 xr_studio_qa275
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const PORT = Number(process.argv[2]), DB = process.argv[3];
if (!PORT || !/^xr_studio_(?!demo)/.test(DB ?? "")) { console.error("usage: <port> <isolated database>"); process.exit(2); }
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely, as in the other API checks
const call = async (method: string, path: string, body?: unknown, actor = "user-A"): Promise<Res> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "content-type": "application/json", "x-actor": actor }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let parsed: unknown = t; try { parsed = JSON.parse(t); } catch { /* words */ }
  return { status: r.status, body: parsed };
};
const download = async (id: string) => { const r = await fetch(`http://localhost:${PORT}/api/artifacts/${id}/file`, { headers: { "x-actor": "user-A" } }); return { status: r.status, bytes: Buffer.from(await r.arrayBuffer()), name: r.headers.get("content-disposition") ?? "" }; };
const sql = (q: string) => execFileSync("psql", ["-h", "127.0.0.1", "-p", "54329", "-U", "xr_studio", "-d", DB, "-Atc", q], { encoding: "utf8" }).trim();
const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");
// The copy's root (isolated.sh: var/isolated-<name>); an artifact's path is relative to the repository root.
const ROOT = join(import.meta.dirname, "..", "..", "..", "..", "..");

const load = await call("POST", "/demo/load");
if (load.status >= 300) { console.error("STOP  the fixture did not load", load.body); process.exit(2); }
const wp = sql("select id from combination where combination_key = 'wp.family' and retired_at is null limit 1");
const fill = (mode: "draft" | "release") => call("POST", `/combinations/${wp}/fill`, { form: "IMM 1295", person: "principal", mode });

// All three fills inside one minute: start early in a minute (a fill takes a few seconds), so the old minute name was shared.
const sec = new Date().getUTCSeconds();
if (sec > 25) await new Promise((r) => setTimeout(r, (61 - sec) * 1000));
const minute = new Date().toISOString().slice(0, 16);
const fills = [await fill("draft"), await fill("release"), await fill("draft")];
const same = new Date().toISOString().slice(0, 16) === minute;
ok("QA-275 (setup): three fills of IMM 1295 for the principal (draft, release, draft) each made a filled PDF, inside one minute", fills.every((f) => f.status === 201 && f.body?.artifact_id && f.body?.report?.intact === true) && same, { statuses: fills.map((f) => f.status), same, minute });
const ids = fills.map((f) => String(f.body?.artifact_id ?? ""));
const rows = ids.map((id) => { const [path, stored, mode] = (id ? sql(`select path || '|' || sha256 || '|' || (detail->>'mode') from generated_artifact where id = '${id}'`) : "||").split("|"); return { id, path, stored, mode }; });

ok("QA-275 fail (C4.6): three fills in the same minute are three artifact rows with three different files", new Set(rows.map((r) => r.path)).size === 3 && rows.every((r) => r.path), rows.map((r) => r.path));
ok("QA-275 pass: each file is named by its own artifact row's id", rows.every((r) => r.id && r.path.endsWith(`-${r.id}.pdf`)), rows.map((r) => r.path));
ok("QA-275 fail (STANDARDS: a record matches its file): every row's file on disk still has the hash the row recorded", rows.every((r) => r.path && existsSync(join(ROOT, r.path)) && sha(readFileSync(join(ROOT, r.path))) === r.stored), rows.map((r) => ({ path: r.path, stored: r.stored.slice(0, 12), on_disk: r.path && existsSync(join(ROOT, r.path)) ? sha(readFileSync(join(ROOT, r.path))).slice(0, 12) : null })));
const got = await Promise.all(ids.map(download));
ok("QA-275 fail (C4.6): each download is the bytes of its own fill (its recorded sha256), the release row is never served the draft's file", got.every((g, i) => g.status === 200 && sha(g.bytes) === rows[i].stored), got.map((g, i) => ({ status: g.status, served: sha(g.bytes).slice(0, 12), stored: rows[i].stored.slice(0, 12), mode: rows[i].mode })));
ok("QA-275 pass: the draft fill and the release fill really differ (so the check above can tell them apart)", rows[0].mode === "draft" && rows[1].mode === "release" && rows[0].stored !== rows[1].stored, rows.map((r) => ({ mode: r.mode, sha: r.stored.slice(0, 12) })));
ok("QA-275 pass: each fill's report file is its own (detail.report_file named like its PDF)", rows.every((r, i) => { const rf = sql(`select detail->>'report_file' from generated_artifact where id = '${ids[i]}'`); return rf === r.path.split("/").pop()!.replace(/\.pdf$/, ".report.json") && existsSync(join(ROOT, r.path.replace(/\.pdf$/, ".report.json"))); }));

// An earlier fill keeps its link: a row made before this change points at a minute-named file; it still downloads as it was.
const legacyId = randomUUID(), legacyPath = rows[0].path.replace(/-[0-9a-f-]{36}\.pdf$/, "").replace(/T\d{6}$/, (t) => t.slice(0, 5)) + ".pdf";
copyFileSync(join(ROOT, rows[0].path), join(ROOT, legacyPath));
sql(`insert into generated_artifact (id, workspace_id, kind, path, sha256, created_by, detail) select '${legacyId}', workspace_id, kind, '${legacyPath}', sha256, created_by, detail from generated_artifact where id = '${ids[0]}'`);
const old = await download(legacyId);
ok("QA-275 pass: an earlier fill's link (a minute-named file, as made before) still downloads its own bytes", /-principal-\d{4}-\d\d-\d\dT\d{4}\.pdf$/.test(legacyPath) && old.status === 200 && sha(old.bytes) === rows[0].stored, { legacyPath, status: old.status });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
