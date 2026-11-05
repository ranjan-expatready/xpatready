// P-165 (backlog B49, the guard P-153 asks for): every "Stand-in" chip on screen has its row in product/STAND-INS.md, and
// every row with the status Stand-in whose screen is built carries a chip. Reads the register and the web source; no
// server, no database. A passing and a failing case per rule, then the repository as it is.
//   tsx studio/tests/check_stand_ins.ts
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
const STUDIO = join(import.meta.dirname, "..");
const REGISTER = join(STUDIO, "..", "..", "product", "STAND-INS.md");

/** Stand-in rows with no chip yet, each with why: its screen is not built, or another lane owns the page and adds the
 *  chip there. A row leaves this list in the change that adds its chip; the check fails while a listed row has a chip,
 *  so the list cannot go stale. */
const NOT_ON_SCREEN_YET: Record<string, string> = {
  "SI-14": "case documents: the runtime lane's page adds the chip", "SI-15": "client list and case shell: the runtime lane's page adds the chip", "SI-16": "case page frame: the runtime lane's page adds the chip",
};

/** The register's rows: id → status ("Stand-in", "Deferred", "Consumed"). */
export function registerRows(md: string) {
  const rows = new Map<string, string>();
  for (const line of md.split("\n")) {
    const cells = line.split("|").map((c) => c.trim());
    if (/^SI-\d+$/.test(cells[1] ?? "")) rows.set(cells[1], (cells[5] ?? "").replace(/\*/g, "").trim());
  }
  return rows;
}

/** The chips in the web source: each `<StandIn id="SI-n"` or a raw `data-stand-in="SI-n"`, with its file. */
export function chipsIn(files: { file: string; text: string }[]) {
  const out: { id: string; file: string }[] = [];
  for (const f of files) for (const m of f.text.matchAll(/(?:<StandIn\b[^>]*?\bid=|data-stand-in=)\{?["'`](SI-\d+)["'`]/g)) out.push({ id: m[1], file: f.file });
  return out;
}

/** What is wrong, in plain words; empty when chips and rows match. */
export function mismatches(rows: Map<string, string>, chips: { id: string; file: string }[], notYet: Record<string, string>) {
  const out: string[] = [];
  const chipIds = new Set(chips.map((c) => c.id));
  for (const c of chips) {
    if (!rows.has(c.id)) out.push(`${c.file}: a chip names ${c.id}, which has no row in STAND-INS.md`);
    else if (rows.get(c.id) !== "Stand-in") out.push(`${c.file}: a chip names ${c.id}, whose row is ${rows.get(c.id)}, not Stand-in`);
  }
  for (const [id, status] of rows) if (status === "Stand-in" && !chipIds.has(id) && !notYet[id]) out.push(`${id} is a Stand-in row with no chip on screen`);
  for (const [id, item] of Object.entries(notYet)) {
    if (rows.get(id) !== "Stand-in") out.push(`${id} (${item}) is listed as not on screen yet but is not a Stand-in row`);
    else if (chipIds.has(id)) out.push(`${id} (${item}) has a chip now: take it off the not-on-screen-yet list`);
  }
  return out;
}

const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(n) ? [p] : []; });

// --- the rules on small inputs
const rows = new Map([["SI-1", "Stand-in"], ["SI-2", "Deferred"]]);
ok("P-165 pass: a chip whose row is a Stand-in row, and every Stand-in row with a chip, match", mismatches(rows, [{ id: "SI-1", file: "a.tsx" }], {}).length === 0);
ok("P-165 fail: a chip with no row in the register is refused", mismatches(rows, [{ id: "SI-1", file: "a.tsx" }, { id: "SI-7", file: "b.tsx" }], {}).some((x) => /SI-7, which has no row/.test(x)));
ok("P-165 fail: a chip on a Deferred row is refused (nothing stands in there)", mismatches(rows, [{ id: "SI-1", file: "a.tsx" }, { id: "SI-2", file: "b.tsx" }], {}).some((x) => /SI-2, whose row is Deferred/.test(x)));
ok("P-165 fail: a Stand-in row with no chip is refused", mismatches(rows, [], {}).some((x) => /SI-1 is a Stand-in row with no chip/.test(x)));
ok("P-165 pass: a Stand-in row whose screen is not built yet needs no chip", mismatches(rows, [], { "SI-1": "M3 page" }).length === 0);
ok("P-165 fail: a not-built-yet row that has a chip, or is not a Stand-in row, is refused", mismatches(rows, [{ id: "SI-1", file: "a.tsx" }], { "SI-1": "M3 page" }).some((x) => /has a chip now/.test(x)) && mismatches(rows, [{ id: "SI-1", file: "a.tsx" }], { "SI-2": "x" }).some((x) => /not a Stand-in row/.test(x)));
ok("P-165 pass: chips are found as the component and as a raw attribute", chipsIn([{ file: "a.tsx", text: `<StandIn id="SI-3" today="x" later="y" /> <span data-stand-in="SI-4">` }]).map((c) => c.id).join() === "SI-3,SI-4");
ok("P-165 pass: the register's rows are read with their status", registerRows("| # | a |\n|---|---|\n| SI-6 | **AI** | x | y | Stand-in | z | P |\n| SI-2 | s | x | y | Deferred | z | P |").get("SI-6") === "Stand-in");

// --- the repository as it is
const real = registerRows(readFileSync(REGISTER, "utf8"));
const chips = chipsIn(walk(join(STUDIO, "web", "src")).filter((f) => !f.endsWith("stand-in.tsx")).map((f) => ({ file: f.slice(STUDIO.length + 1), text: readFileSync(f, "utf8") })));
const wrong = mismatches(real, chips, NOT_ON_SCREEN_YET);
ok(`P-165: STAND-INS.md (${real.size} rows) and the chips on screen (${chips.length}) match`, real.size > 0 && wrong.length === 0, wrong);

console.log(`\n${pass} PASS · ${fail} FAIL`);
process.exit(fail ? 1 : 0);
