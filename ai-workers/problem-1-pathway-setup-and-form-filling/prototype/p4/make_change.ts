// P4 change test, step 1: a new draft that differs from release c1-v1 in ONE configuration setting.
// The service language moves from the case tier to the prospect tier, so it should be asked once in the PQR
// and pre-filled in the SQR. In the product such a change arrives as a re-draft or a chosen proposal and is
// reviewed in P3 (5.1); here it is written directly, labelled as the P4 test change.
//   node p4/make_change.ts      writes p4/drafts/c1-draft-2.json and prints the one difference
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PROTOTYPE = join(import.meta.dirname, "..");
const FACT = "case.service_language", FROM = "case", TO = "prospect";
const v1 = JSON.parse(readFileSync(join(PROTOTYPE, "p3", "releases", "c1-v1", "configuration.json"), "utf8"));
const draft = structuredClone(v1);
draft.status = "draft";
draft.configuration_version = "c1-draft-2";
const p = draft.placements.find((x: any) => x.fact === FACT);
if (!p || p.tier !== FROM) throw new Error(`expected ${FACT} in tier ${FROM} in c1-v1`);
p.tier = TO;
const note = { from_release: "c1-v1", changed: [`placements[${FACT}].tier: ${FROM} -> ${TO}`], purpose: "P4 acceptance: a configuration change changes the views with no code change" };
mkdirSync(join(PROTOTYPE, "p4", "drafts"), { recursive: true });
writeFileSync(join(PROTOTYPE, "p4", "drafts", "c1-draft-2.json"), JSON.stringify(draft, null, 1) + "\n");
writeFileSync(join(PROTOTYPE, "p4", "drafts", "c1-draft-2.change.json"), JSON.stringify(note, null, 1) + "\n"); // kept outside the configuration
console.log(JSON.stringify(note));
