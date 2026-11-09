// C7.5 saved paid review: the pack's case on whatever data this copy holds, and its run card (runtime lane, for the tech
// lead's paid run, P-295, P-422). It builds the case exactly as acceptance/C7.5.test.ts builds it up to its run card
// (tests/fixtures/c75-made-up-run.ts packLikeCase: Sample Client A, the pack's FIXED values), reads the run card of IMM 5257
// and prints what a paid run would read and cost, and the one request that would start it. It sends nothing to any model
// and spends nothing: a plan reads files. With --expect <12 hex> it exits 1 unless the sheet's checksum starts with it.
//   tsx --tsconfig studio/api/tsconfig.json studio/tools/c75-pack-case.ts <port> <db> [--expect 3a2acc10d135]
import * as m3 from "../acceptance/lib/m3.ts";
import { packLikeCase } from "../tests/fixtures/c75-made-up-run.ts";

const expect = (() => { const i = process.argv.indexOf("--expect"); return i > 0 ? process.argv[i + 1] : null; })();
const { c, P } = await packLikeCase();
const r = await m3.call("POST", `/runtime/cases/${c.id}/review-runs/plan`, { forms: ["IMM 5257"], subject: P });
if (r.status !== 200) { console.log(JSON.stringify({ error: r.status, body: r.body })); process.exit(1); }
const p = r.body, f = p.forms[0];
console.log(JSON.stringify({
  case: c.id, subject: P, form: f.edition, form_fields: f.boxes, sheet: f.sheet, sheet_sha256: f.sheet_sha256,
  saved_available: f.saved.available, saved_files: f.saved.files, live_allowed: p.live_allowed,
  estimate: p.estimate, plan_sha256: p.plan_sha256,
  live_request: `curl -s -X POST http://127.0.0.1:${m3.PORT}/api/runtime/cases/${c.id}/review-runs -H 'content-type: application/json' -H 'x-actor: user-O' -d '{"forms":["IMM 5257"],"subject":"${P}","mode":"live","planSha256":"${p.plan_sha256}"}'`,
}, null, 1));
if (expect && !String(f.sheet_sha256).startsWith(expect)) { console.log(`the sheet is ${String(f.sheet_sha256).slice(0, 12)}, not the expected ${expect}: stop, nothing was run`); process.exit(1); }
