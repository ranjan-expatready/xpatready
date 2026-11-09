// C8.3 gate A setup (not under test): a represented Visitor visa family case (principal and spouse) on the configured
// checkpoint, every fact answered and confirmed, each barcode form's validated copy read back, as the C8.3 pack and
// tests/runtime/setup_c83_walk.ts do, and stopped there: nothing is sent for review. The review itself is walked by
// screens (walk_c83.cjs). Prints one JSON line. No model call (US$0).
//   cd studio && node_modules/.bin/tsx --tsconfig api/tsconfig.json <this file> <port> <db>
import { call, expectedFor, fillEverything, firms, itemsOf, needVisitorVisa, openCase, prepare, validateRoundTrip, yearsAgo } from "../../../../../prototype/studio/acceptance/lib/m3.ts";
const vv = needVisitorVisa();
const f = await firms();
const officer = f.officer ?? "user-O", rep = f.rep ?? "user-R";
const c = await openCase(vv, [{ role: "principal", name: "Sample Client A", dob: yearsAgo(40) }, { role: "spouse_or_partner", name: "Sample Spouse A", dob: yearsAgo(38) }], { representative: rep, caseOfficers: [officer] });
const P = c.subjects["Sample Client A"], S = c.subjects["Sample Spouse A"];
await fillEverything(c.id);
const exp = await expectedFor(c.id);
const barcodeOf = (name: string) => [...(exp?.[name]?.forms ?? []), ...(exp?.[name]?.waiting ?? [])].find((l) => l.barcode);
for (const [subj, name] of [[P, "Sample Client A"], [S, "Sample Spouse A"]] as const) {
  const bc = barcodeOf(name);
  if (bc?.channel === "ONLINE") { const q = (await prepare(c.id, officer)).p; await call("PATCH", `/runtime/items/${itemsOf(q, subj, bc.form)[0]?.id}/channel`, { channel: "PAPER", reason: "Cannot apply online: accommodation (Sample)", version: q?.version }, officer); }
  if (bc) await validateRoundTrip(c.id, bc.form, subj);
}
const p = (await prepare(c.id, officer)).p;
console.log(JSON.stringify({ caseId: c.id, officer, rep, P, S, fP: p?.filings.find((x) => x.applicants[0]?.subject === P)?.id, fS: p?.filings.find((x) => x.applicants[0]?.subject === S)?.id, barcodeP: barcodeOf("Sample Client A")?.form, barcodeS: barcodeOf("Sample Spouse A")?.form }));
process.exit(0);
