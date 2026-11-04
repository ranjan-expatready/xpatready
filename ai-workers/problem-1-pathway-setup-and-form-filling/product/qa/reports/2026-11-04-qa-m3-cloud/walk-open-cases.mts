// qa M3 walk setup: two cases on the fixture (one blank family, one filled principal), printed as JSON.
// Run from prototype/: tsx <this file> <port> <db>, on a copy prepared by setup_visitor_visa.ts + setup_vv_m3.ts; then node walk-1440.cjs <out dir> (reads cases.json next to it).
import { FAMILY, fillEverything, firms, needVisitorVisa, openCase, prepare, yearsAgo } from "../../../../prototype/studio/acceptance/lib/m3.ts";
const vv = needVisitorVisa();
const f = await firms();
const officer = f.officer ?? "user-O";
const fam = await openCase(vv, FAMILY, { representative: f.rep, caseOfficers: [officer] });
const solo = await openCase(vv, [{ role: "principal", name: "Sample Client A", dob: yearsAgo(40) }], { representative: f.rep, caseOfficers: [officer] });
const filled = await fillEverything(solo.id);
const p = (await prepare(solo.id, officer)).p;
console.log(JSON.stringify({ family: fam.id, solo: solo.id, filled, officer, rep: f.rep, readiness: p?.readiness }, null, 1));
process.exit(0);
