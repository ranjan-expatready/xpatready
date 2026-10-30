// QA-90 (7): one spend ledger shared by every copy. Two processes reserve at the same moment into one scratch ledger:
// both entries land in the one file, and the cap counts both (the second is refused when the two together pass it).
// Also: where the ledger lives (P2_LEDGER_DIR, absolute only; unset = the main copy's .tools/p2-ledger on the Mac, else the
// project's own folder as before). US$0.
// Run: tsx --tsconfig studio/api/tsconfig.json tests/check_p2_shared_ledger.ts
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SpendLedger } from "../p2/ledger.ts";
import { ledgerDirFrom, PROTOTYPE } from "../p2/policy.ts";
import { unionOfLedgers } from "../p2/tools/seed-shared-ledger.ts";

const results: [string, boolean][] = [];
const t = (name: string, pass: boolean) => results.push([name, pass]);

// One reserving process: waits for the agreed moment, then reserves once against a US$1 experiment cap.
const scratch = mkdtempSync(join(tmpdir(), "p2-shared-"));
const child = join(scratch, "reserve-one.ts");
writeFileSync(child, `import { SpendLedger } from ${JSON.stringify(join(PROTOTYPE, "p2", "ledger.ts"))};
const [dir, run, worst, at] = process.argv.slice(2);
while (Date.now() < Number(at)) { /* start together */ }
try { new SpendLedger(dir, 1).reserve(run, 1, Number(worst), 5, "stub"); console.log("reserved"); } catch (e) { console.log("refused: " + (e as Error).message); }
`);
const TSX = join(PROTOTYPE, "node_modules", ".bin", "tsx");
const one = (dir: string, run: string, worst: number, at: number) => new Promise<string>((res) => {
  const p = spawn(TSX, [child, dir, run, String(worst), String(at)], { env: { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "" } });
  let out = ""; p.stdout.on("data", (d) => (out += d)); p.stderr.on("data", (d) => (out += d)); p.on("close", () => res(out.trim()));
});
const together = async (dir: string, worst: number) => { const at = Date.now() + 2_500; return Promise.all([one(dir, "copy-a", worst, at), one(dir, "copy-b", worst, at)]); };
const lines = (dir: string) => readFileSync(join(dir, "spend.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));

// Pass: two reservations that fit together both land in the one file and both count.
const fit = mkdtempSync(join(tmpdir(), "p2-shared-fit-"));
const a = await together(fit, 0.4);
t("C11.8 QA-90 pass: two processes reserving at once both land in the one shared file, and the cap counts both (US$0.80)",
  a.every((x) => x === "reserved") && lines(fit).filter((l) => l.type === "reserve").length === 2 && Math.abs(new SpendLedger(fit, 1).committed() - 0.8) < 1e-9);
// Fail: two that pass the cap together: exactly one is refused, nothing past the cap is written.
const over = mkdtempSync(join(tmpdir(), "p2-shared-over-"));
const b = await together(over, 0.6);
t("C11.8 QA-90 fail: two at once that together pass the US$1 cap: one reserved, the other refused at the experiment cap",
  b.filter((x) => x === "reserved").length === 1 && b.filter((x) => /^refused: experiment cap US\$1/.test(x)).length === 1 && lines(over).length === 1 && new SpendLedger(over, 1).committed() <= 1);
// Ten at once on a tight cap (the lock under load): never more than the cap.
const many = mkdtempSync(join(tmpdir(), "p2-shared-many-"));
const at = Date.now() + 3_000;
const c = await Promise.all(Array.from({ length: 10 }, (_, i) => one(many, `copy-${i}`, 0.3, at)));
t("C11.8 QA-90 fail: ten processes at once on a US$1 cap: exactly three reserved (US$0.90), seven refused", c.filter((x) => x === "reserved").length === 3 && lines(many).length === 3);

// Where the ledger lives.
// A made-up main copy with .tools and a lane copy whose .git file points into it, and a copy with neither (CI, cloud).
const fake = mkdtempSync(join(tmpdir(), "p2-where-")), main = join(fake, "main"), lane = join(main, ".claude", "worktrees", "forms-x"), bare = join(fake, "bare");
mkdirSync(join(main, ".git", "worktrees", "forms-x"), { recursive: true }); mkdirSync(join(main, ".tools")); mkdirSync(lane, { recursive: true }); mkdirSync(bare);
writeFileSync(join(lane, ".git"), `gitdir: ${join(main, ".git", "worktrees", "forms-x")}\n`);
t("C11.8 QA-90 pass: unset, the main copy and a lane copy both find the main copy's .tools/p2-ledger (the Mac: one ledger)",
  ledgerDirFrom(undefined, main) === join(main, ".tools", "p2-ledger") && ledgerDirFrom("", lane) === join(main, ".tools", "p2-ledger"));
t("C11.8 QA-90 fail: unset, a copy with no .tools in its main copy keeps the project's own p2/ledger (CI, cloud)", ledgerDirFrom(undefined, bare) === join(PROTOTYPE, "p2", "ledger"));
t("C11.8 QA-90 pass: an absolute P2_LEDGER_DIR is the ledger", ledgerDirFrom("/Users/x/.tools/p2-ledger") === "/Users/x/.tools/p2-ledger");
const refused = (v: string) => { try { ledgerDirFrom(v); return false; } catch (e) { return /absolute/.test((e as Error).message); } };
t("C11.8 QA-90 fail: a relative or dotted P2_LEDGER_DIR is refused", refused("p2-ledger") && refused("/Users/x/../y") && refused("./ledger"));

// The seed (QA-90 (5)): the union of every copy's ledger counts each attempt once and keeps a later correction.
const r1 = { type: "reserve", id: "r#1", run_id: "r", attempt: 1, worst_usd: 0.5, at: "2026-10-20T19:05:27.000Z" };
const s1 = { type: "settle", id: "r#1", actual_usd: 0.5, outcome: "error_counted_at_worst_case", at: "2026-10-20T19:05:28.000Z" };
const fix = { type: "settle", id: "r#1", actual_usd: 0, outcome: "corrected_unbilled", at: "2026-10-20T19:06:38.000Z" };
const r2 = { type: "reserve", id: "q#1", run_id: "q", attempt: 1, worst_usd: 0.25, caller: "paid", at: "2026-10-29T04:50:39.000Z" };
const jl = (...xs: object[]) => xs.map((x) => JSON.stringify(x)).join("\n") + "\n";
const seedDir = mkdtempSync(join(tmpdir(), "p2-seed-"));
writeFileSync(join(seedDir, "spend.jsonl"), unionOfLedgers([jl(r1, s1, fix), jl(r1, s1, fix), jl(r1, s1, fix, r2)]).join("\n") + "\n");
t("C11.8 QA-90 pass: the seed's union keeps one copy of the lines every copy shares and adds each copy's own (US$0.25)",
  lines(seedDir).length === 4 && Math.abs(new SpendLedger(seedDir).committed() - 0.25) < 1e-9);
t("C11.8 QA-90 fail: a correction (a second settle with the same id) is never dropped as a duplicate, and stays after the first",
  lines(seedDir).filter((l) => l.id === "r#1" && l.type === "settle").map((l) => l.actual_usd).join() === "0.5,0");

for (const [n, p] of results) console.log(`${p ? "PASS" : "FAIL"}  ${n}`);
const failed = results.filter(([, p]) => !p).length;
if (failed) console.log(JSON.stringify({ a, b, c }));
console.log(`${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
