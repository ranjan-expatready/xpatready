// P5 entry (D30, P3P4-R1-M1): the next draft of the release lineage. Takes the latest release (c1-v2, which carries
// the P4 service-language change) and applies exactly the reviewed D30 re-scope from p2/field-review.c1.json with the
// assembler's own function, so the draft configuration (p2/config/c1-draft-1-live-r2.json) and the release lineage
// get the same change. The result is reviewed and released in P3 like any change (only changed items reopen).
//   node p5/make_d30_draft.ts      writes p5/drafts/c1-draft-3.json and p5/drafts/c1-draft-3.change.json
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { applyRescope } from "../p2/assemble.ts";

const PROTOTYPE = join(import.meta.dirname, "..");
const FROM = "c1-v2";
const base = JSON.parse(readFileSync(join(PROTOTYPE, "p3", "releases", FROM, "configuration.json"), "utf8"));
const review = JSON.parse(readFileSync(join(PROTOTYPE, "p2", "field-review.c1.json"), "utf8"));
const draft = structuredClone(base);
draft.status = "draft";
draft.configuration_version = "c1-draft-3";
const results = (review.rescopes ?? []).map((rs: any) => ({ reason: rs.reason, citations: rs.citations, kept_case_wide: rs.kept_case_wide, ...applyRescope(draft, rs) }));
if (results.some((r: any) => r.missing.length)) throw new Error(`re-scope ids missing from ${FROM}: ${results.flatMap((r: any) => r.missing).join(", ")}`);
const note = { from_release: FROM, change: "D30 re-scope (field review, official citations)", results, purpose: "P5 entry: distinct principal and partner job values before any IMM 1295 is filled" };
mkdirSync(join(PROTOTYPE, "p5", "drafts"), { recursive: true });
writeFileSync(join(PROTOTYPE, "p5", "drafts", "c1-draft-3.json"), JSON.stringify(draft, null, 1) + "\n");
writeFileSync(join(PROTOTYPE, "p5", "drafts", "c1-draft-3.change.json"), JSON.stringify(note, null, 1) + "\n");
console.log(JSON.stringify({ moved: results.flatMap((r: any) => r.moved).length, conditions: results.reduce((a: number, r: any) => a + r.conditions, 0) }));
