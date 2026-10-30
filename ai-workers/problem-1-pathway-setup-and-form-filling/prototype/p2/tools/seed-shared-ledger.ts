// QA-90 (5): seeds the one shared spend ledger from every copy's own. Reads spend.jsonl of the main copy and of every
// lane copy under .claude/worktrees, plus the shared ledger itself, and writes their union in time order, an identical
// line kept once (not by entry type and id: a correction is a second settle line with the same id, Lead 21 Oct). Prints
// the US$ committed per copy before and the shared total after. The used launch and reader tickets are copied the same
// way (file names are unique). Safe to run again: a second run adds only what is new. Run it once more right before the
// QA-90 merge reaches the main copy (the merge stops tracking each copy's own spend.jsonl).
// Usage (Mac): P2_LEDGER_DIR=<main copy>/.tools/p2-ledger tsx p2/tools/seed-shared-ledger.ts
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { SpendLedger } from "../ledger.ts";
import { LEDGER_DIR, PROTOTYPE } from "../policy.ts";

/** The union of several spend.jsonl texts: an identical line kept once, in time order (stable, so lines with the same time
 *  keep the order they were read in and a later settle of the same id still wins). */
export function unionOfLedgers(texts: string[]): string[] {
  const seen = new Map<string, { at?: string }>();
  for (const t of texts) for (const l of t.split("\n").filter(Boolean)) { const k = JSON.stringify(JSON.parse(l)); if (!seen.has(k)) seen.set(k, JSON.parse(l)); }
  return [...seen.entries()].sort(([, a], [, b]) => (a.at ?? "~").localeCompare(b.at ?? "~")).map(([k]) => k);
}

if (import.meta.main) {
  if (!process.env.P2_LEDGER_DIR) { console.error("refused: set P2_LEDGER_DIR to the shared ledger folder (the main copy's .tools/p2-ledger)"); process.exit(2); }
  const MAIN = dirname(execFileSync("git", ["-C", PROTOTYPE, "rev-parse", "--path-format=absolute", "--git-common-dir"], { encoding: "utf8" }).trim());
  const IN_COPY = relative(execFileSync("git", ["-C", PROTOTYPE, "rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim(), join(PROTOTYPE, "p2", "ledger"));
  const wt = join(MAIN, ".claude", "worktrees");
  const copies = [MAIN, ...(existsSync(wt) ? readdirSync(wt).map((d) => join(wt, d)) : [])].map((c) => join(c, IN_COPY)).filter((d) => d !== LEDGER_DIR && existsSync(d));

  const read = (dir: string): string => existsSync(join(dir, "spend.jsonl")) ? readFileSync(join(dir, "spend.jsonl"), "utf8") : "";
  const usd = (dir: string) => existsSync(join(dir, "spend.jsonl")) ? new SpendLedger(dir).committed() : 0;

  const texts = [read(LEDGER_DIR)];
  const before = read(LEDGER_DIR).split("\n").filter(Boolean).length;
  for (const dir of copies) {
    console.log(`before: US$${usd(dir).toFixed(4)} committed in ${relative(MAIN, dir) || dir}`);
    texts.push(read(dir));
    for (const sub of ["used-launch-tickets", "used-reader-tickets"]) {
      if (!existsSync(join(dir, sub))) continue;
      mkdirSync(join(LEDGER_DIR, sub), { recursive: true });
      for (const f of readdirSync(join(dir, sub))) if (!existsSync(join(LEDGER_DIR, sub, f))) copyFileSync(join(dir, sub, f), join(LEDGER_DIR, sub, f));
    }
  }
  const all = unionOfLedgers(texts);
  mkdirSync(LEDGER_DIR, { recursive: true });
  const tmp = join(LEDGER_DIR, `spend.jsonl.seed-${process.pid}`);
  writeFileSync(tmp, all.join("\n") + (all.length ? "\n" : ""));
  renameSync(tmp, join(LEDGER_DIR, "spend.jsonl"));
  console.log(`after: US$${usd(LEDGER_DIR).toFixed(4)} committed in the shared ledger ${LEDGER_DIR} (${all.length} lines, ${all.length - before} added)`);
}
