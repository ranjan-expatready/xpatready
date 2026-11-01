// QA-145 (C11.7; AGENTS rule 1, a clean clone): Demo › Load sample (the six, and the configured checkpoint) and Reset
// leave the repository's own form inventories and AI job files unchanged. qa saw Load sample write 9
// prototype/p1/inventory/*.inventory.json and 12 prototype/p2/jobs/studio-fieldmap-*.json files at 61f561d7; on later
// main it writes none. This check keeps it so: every file under those two folders is listed with its size, change time
// and checksum before and after, and any new, changed or removed file fails. Only these two folders are compared: the
// stub-pass runs and canary digest under p2/runs and p2/screening are written by other suites (QA-145's second part).
// No AI (US$0).
//   zsh studio/tools/isolated.sh runtime_qa145 4433 start && tsx studio/tests/check_qa145_clean_clone.ts 4433
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.argv[2] ?? 4433);
const PROTOTYPE = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const WATCHED = [join(PROTOTYPE, "p1", "inventory"), join(PROTOTYPE, "p2", "jobs")];
let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 400)}` : ""}`); };
const call = async (method: string, path: string, body?: unknown) => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": "user-A", "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, body: await r.json().catch(() => null) };
};
/** Every file under the watched folders: path → size, change time and checksum. */
const snapshot = () => {
  const out = new Map<string, string>();
  const walk = (d: string) => { if (!existsSync(d)) return; for (const e of readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name); if (e.isDirectory()) walk(p); else { const s = statSync(p); out.set(p.slice(PROTOTYPE.length + 1), `${s.size}|${s.mtimeMs}|${createHash("sha256").update(readFileSync(p)).digest("hex")}`); } } };
  for (const d of WATCHED) walk(d);
  return out;
};
/** New, changed and removed files between two snapshots. */
const diff = (a: Map<string, string>, b: Map<string, string>) => ({
  added: [...b.keys()].filter((k) => !a.has(k)), changed: [...b.keys()].filter((k) => a.has(k) && a.get(k) !== b.get(k)), removed: [...a.keys()].filter((k) => !b.has(k)),
});
const clean = (d: ReturnType<typeof diff>) => d.added.length + d.changed.length + d.removed.length === 0;

(async () => {
  const before = snapshot();
  if (before.size === 0) { console.error("STOP  no committed inventories or job files found under", WATCHED); process.exit(2); }
  const r0 = await call("POST", "/demo/reset", { confirm: "RESET" });
  if (r0.status >= 300) { console.error("STOP  reset failed", r0.body); process.exit(2); }
  let d = diff(before, snapshot());
  ok("QA-145 pass: Reset leaves the repository's inventories and AI job files unchanged", clean(d), d);

  const six = await call("POST", "/demo/load", { sample: "six" });
  ok("QA-145: Load sample (the six) loads", six.status < 300 && six.body?.sample === "six", six.status);
  d = diff(before, snapshot());
  ok("QA-145 fail-guard: Load sample (the six) writes no file into prototype/p1/inventory or prototype/p2/jobs", clean(d), d);

  await call("POST", "/demo/reset", { confirm: "RESET" });
  const conf = await call("POST", "/demo/load", { sample: "configured" });
  ok("QA-145: the configured checkpoint loads", conf.status < 300 && conf.body?.sample === "configured", conf.status);
  d = diff(before, snapshot());
  ok("QA-145 fail-guard: the configured checkpoint writes no file into prototype/p1/inventory or prototype/p2/jobs", clean(d), d);

  await call("POST", "/demo/reset", { confirm: "RESET" });
  d = diff(before, snapshot());
  ok("QA-145 pass: after the loads and a last Reset the two folders are exactly as committed", clean(d), d);
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exitCode = fail ? 1 : 0;
})().catch((e) => { console.error(e); process.exit(1); });
