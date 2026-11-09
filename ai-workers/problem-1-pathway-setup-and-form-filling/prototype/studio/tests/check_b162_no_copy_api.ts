// B162 (the tech lead's answer 3 on #1331; review M1 and M2 on #1344): Ready to file is refused in words while a form
// filed as a PDF has no copy made for filing, through the API on an isolated copy with the pack's own setup (the fixture:
// IMM 5257 a barcode PDF upload, IMM 5707 Online, IMM 5476 a PDF upload signed by hand). M2: the server half itself is
// tested (no copy shows the CRITICAL line and Ready is refused; a generated copy clears it); a copy older than today's
// facts keeps the line (breaker M1). M1: a release move that does
// not touch IMM 5476 never brings the line back (C9.5 BR-4: work keeps its standing), because a copy for filing made on
// any release of the case counts. Sample data, live AI off, no model call (US$0). It publishes one later Sample release
// of Visitor visa on its copy (acceptance/lib/sample-release.ts), so it runs on its own copy.
//   zsh studio/tools/isolated.sh rt_b162 4437 start && tsx studio/tests/check_b162_no_copy_api.ts 4437 xr_studio_rt_b162
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { DB, PORT, answer, call, fillEverything, filingOf, generateCopy, needVisitorVisa, openCase, prepare, readinessOf, sql, yearsAgo } from "../acceptance/lib/m3.ts";
import { sampleRelease } from "../acceptance/lib/sample-release.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const releases = () => { try { return Number(sql(`select coalesce(max(r.version), 0) from config_release r join combination c on c.id = r.combination_id where c.combination_key = 'vv.single'`)); } catch { return 0; } };
const studio = join(import.meta.dirname, ".."), tsx = join(studio, "node_modules", ".bin", "tsx");
const setup = (file: string) => spawnSync(tsx, ["--tsconfig", join(studio, "api", "tsconfig.json"), join(studio, file), String(PORT), DB], { cwd: join(studio, ".."), stdio: "ignore", timeout: 900_000 });
if (releases() < 1) setup("tests/runtime/setup_visitor_visa.ts");
if (releases() < 2) setup("acceptance/lib/setup_vv_m3.ts");
ok("setup: the copy has Visitor visa release 2 (the pack's setup)", releases() >= 2, releases());
const vv = needVisitorVisa();
const c = await openCase(vv, [{ role: "principal", name: "Sample Client N", dob: yearsAgo(42) }]);
const P = c.subjects["Sample Client N"];
await fillEverything(c.id);
let p = (await prepare(c.id, c.officer)).p;
const fid = filingOf(p, P)?.id ?? "";
const noCopy = (q: typeof p) => (readinessOf(q, fid)?.warns ?? []).filter((w) => w.code === "no_copy");
const item = (q: typeof p, form: string) => (q?.items ?? []).find((i) => i.subject === P && i.form === form);
let lines = noCopy(p);
const i5476 = item(p, "IMM 5476");
ok("B162 fail (M2): before any copy, IMM 5476 (a PDF upload, signed by hand) has a CRITICAL \"no copy made for filing\" line naming the form and the person; the barcode IMM 5257 and the Online IMM 5707 have none",
  !!i5476 && lines.length === 1 && lines[0].item === i5476.id && lines[0].severity === "critical" && /^CRITICAL: IMM 5476 for Sample Client N has no copy made for filing yet/.test(lines[0].words), lines);
let r = await call("POST", `/runtime/filings/${fid}/ready`, {}, c.officer);
ok("B162 fail (M2): Ready to file is refused (409), and the refusal lists the \"no copy\" line", r.status === 409 && JSON.stringify(r.body ?? {}).includes("no_copy"), { status: r.status, warns: (r.body?.warns ?? []).map((w: { code: string }) => w.code) });
const copy = await generateCopy(c.id, "IMM 5476", P);
p = (await prepare(c.id, c.officer)).p;
ok("B162 pass (M2): once its copy is generated, IMM 5476's \"no copy\" line is gone", !!copy && noCopy(p).length === 0, noCopy(p));
// Breaker M1 on #1344: a fact the copy reads changes after it was made: the copy is older than today's facts, so the
// line comes back asking for a new copy; a new copy clears it.
const put = await answer(c.id, P, "person.family_name", "SAMPLE-CHANGED", c.officer);
p = (await prepare(c.id, c.officer)).p;
lines = noCopy(p);
ok("B162 fail (breaker M1): after a fact the copy reads changes, IMM 5476's copy is older than today's facts: a CRITICAL line asks for a new copy", put.status === 200 && lines.length === 1 && /older than today's facts/.test(lines[0].words) && /Generate a new copy/.test(lines[0].words), { put: put.status, lines });
const again = await generateCopy(c.id, "IMM 5476", P);
p = (await prepare(c.id, c.officer)).p;
ok("B162 pass (breaker M1): a new copy for today's facts clears it", !!again && noCopy(p).length === 0, noCopy(p));
// M1: a later Sample release that changes IMM 5257's form fields only; the case moves to it.
const next = await sampleRelease(vv, { map: "IMM 5257" });
const rev = Number(sql(`select max(revision) from pack_work_pin where case_id='${c.id}'`) ?? 0);
r = await call("POST", `/runtime/cases/${c.id}/release-update`, { target_version: next.version, from_revision: rev, reason: "B162 check (Sample)" }, c.officer);
p = (await prepare(c.id, c.officer)).p;
const moved = Number(sql(`select max(revision) from pack_work_pin where case_id='${c.id}'`) ?? 0) > rev;
ok("B162 pass (review M1): after a move to a release that does not touch IMM 5476, its copy still counts: no \"no copy\" line comes back", !!next.version && r.status < 300 && moved && noCopy(p).length === 0, { release: next.version, move: r.status, moved, lines: noCopy(p) });
process.exitCode = summary() ? 1 : 0;
