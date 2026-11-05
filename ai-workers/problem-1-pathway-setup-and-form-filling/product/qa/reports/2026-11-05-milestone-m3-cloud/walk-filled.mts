// qa M3 (cloud, 5 Nov): one principal-only Visitor visa case on the CHECKPOINT copy with every question answered and
// confirmed by the packs' own helper (API, not screens: about 380 answers), so the 1440 px walk can read Stages 5-7.
// Run from prototype/: tsx <this file> <port> <db>. Prints JSON.
import { fillEverything, firms, needVisitorVisa, openCase, prepare, yearsAgo } from "../../../../prototype/studio/acceptance/lib/m3.ts";
const vv = needVisitorVisa();
const f = await firms();
const officer = f.officer ?? "user-O";
const solo = await openCase(vv, [{ role: "principal", name: "Sample Client A", dob: yearsAgo(40) }], { representative: f.rep, caseOfficers: [officer] }, "QA-M3-SOLO-1");
const filled = await fillEverything(solo.id);
const p = (await prepare(solo.id, officer)).p;
console.log(JSON.stringify({ solo: solo.id, filled, officer, rep: f.rep, readiness: p?.readiness, filings: p?.filings?.map((x: any) => ({ status: x.status, blocks: x.blocks, warnings: x.warnings })) }, null, 1));
process.exit(0);
