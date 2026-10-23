// Assembles a draft configuration from named run records (rules, no AI), for a partial pipeline such as the
// field maps alone (the first live model-quality slice). Same assembler as the full pipeline.
//   node p2/assemble_runs.ts <label> [--review p2/field-review.c1.json] [--repairs p2/repairs.c1.json] <run file> [<run file> ...]
// v2 (20 Oct 2026): without --review it only detects and lists field-review items; the v1 configurations are kept
// (p2/assemble.v1.ts reproduces them) and their labels are refused here.
import { resolve } from "node:path";
import { assemble } from "./assemble.ts";

const argv = process.argv.slice(2);
const opt = (n: string) => { const i = argv.indexOf(`--${n}`); if (i < 0) return null; const v = argv[i + 1]; argv.splice(i, 2); return resolve(v); };
const review = opt("review"), repairs = opt("repairs");
const [label, ...files] = argv;
if (!label || !/^[a-z0-9-]+$/.test(label) || !files.length) { console.log("usage: assemble_runs.ts <label> [--review f] [--repairs f] <run file>..."); process.exit(2); }
const r = assemble(label, files.map((f) => resolve(f)), { review, repairs });
console.log(JSON.stringify(r));
process.exit(r.valid ? 0 : 1);
