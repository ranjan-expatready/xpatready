// S2 (SA-1B-174, P-65 (a); forms lane): a form's fill trial counts for one form edition (the official file's SHA-256)
// and, when recorded, one field map version; a new edition or a changed map is "Checked copy, not for filing" until its
// own trial passes. The register samples/fill-trials.json is checked against the official manifest and the evidence
// lane's records. A passing and a failing case per rule. No server, no database, no model call (US$0).
//   tsx studio/tests/check_s2_fill_trials.ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { mapVersion, readTrials, trialFor, verdictPasses, type EditionMap, type TrialRecord } from "../api/src/fill-trials.ts";

let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
const SOLUTION = join(import.meta.dirname, "..", "..", "..");
const manifest = (JSON.parse(readFileSync(join(SOLUTION, "official-sources", "ircc", "manifest.json"), "utf8")) as { items: { path: string; edition?: string; sha256: string }[] }).items;
const trials = readTrials();
const sha = (form: string) => trials.find((t) => t.form === form)!.form_sha256;
const entries = [{ data_path: "form1[0].FamilyName[0]", fact: "person.family_name", outcome: "mapped", person: "form_subject", row: null, transform: "as_is" }, { data_path: "form1[0].DOB[0]", fact: "person.date_of_birth", outcome: "mapped", person: "form_subject", row: null, transform: "date_ymd" }];
const map = (form: string, s: string | null, e = entries): EditionMap => ({ form_number: form, form_edition: `${form} (Sample)`, form_sha256: s, entries: e });

// ─────────────── the register: each record is an edition of the official manifest and has its evidence record
ok("S2 pass: every recorded trial names an edition of the official manifest by its SHA-256, and its evidence record exists and quotes that checksum", trials.length >= 6 && trials.every((t) => {
  const m = manifest.find((i) => i.sha256 === t.form_sha256 && i.path.startsWith("forms/"));
  const file = join(SOLUTION, t.status_file);
  const text = existsSync(file) ? readFileSync(file, "utf8") : "";
  return !!m && m.edition === t.edition && text.includes(t.form_sha256.slice(0, 8)) && text.includes(t.form_sha256.slice(-4));
}), trials.map((t) => t.form));
ok("S2 pass: the E1 trials ran P1's values through p5/fill.py, so none claims a studio map version (map_version null)", trials.every((t) => t.map_version === null));

// ─────────────── per edition
ok("S2 pass: IMM 1295's recorded edition, whose trial passed, is fileable", trialFor(map("IMM 1295", sha("IMM 1295"))).passed);
const newer = trialFor(map("IMM 1295", "f".repeat(64)));
ok("S2 fail (SA-1B-174): a new edition of IMM 1295 is \"Checked copy, not for filing\" until its own trial passes, said in words", !newer.passed && /no fill trial is recorded for edition/.test(newer.why ?? ""), newer);
const old5257 = trialFor(map("IMM 5257", manifest.find((i) => i.path === "previous-editions/imm5257e-pre-2023.pdf")!.sha256));
const sameLabel = trialFor({ ...map("IMM 1295", "e".repeat(64)), form_edition: "IMM 1295 (09-2023)" });
ok("S2 fail (review minor 2): another file under the same printed edition is not proven, and the words say the file differs", !sameLabel.passed && /is not the file the fill trial ran on/.test(sameLabel.why ?? ""), sameLabel);
ok("S2 fail: IMM 5257's earlier edition never inherits the 09-2023 edition's pass", !old5257.passed && trialFor(map("IMM 5257", sha("IMM 5257"))).passed, old5257);
ok("S2 fail: a copy whose edition is not known is never fileable", !trialFor(map("IMM 1295", null)).passed && /edition is not known/.test(trialFor(map("IMM 1295", null)).why ?? ""));
const i1344 = trialFor(map("IMM 1344", sha("IMM 1344")));
ok("P-65 (a) fail: IMM 1344's trial passes in Adobe only, not from the product's file, so it is not fileable", !i1344.passed && /did not pass from the product's file/.test(i1344.why ?? ""), i1344);
ok("P-65 (a) fail: a form with no trial at all is not fileable", !trialFor(map("IMM 9999", "a".repeat(64))).passed);

// ─────────────── per map version (a trial recorded from now on)
const status = trials.find((t) => t.form === "IMM 1295")!.status_file;
const reg: TrialRecord[] = [{ form: "IMM 7777", edition: "IMM 7777 (Sample)", form_sha256: "b".repeat(64), map_version: mapVersion(entries), status_file: status, recorded_on: "2026-11-02" }];
ok("S2 pass: a trial recorded with its map version counts while the map is unchanged", trialFor(map("IMM 7777", "b".repeat(64)), reg).passed);
const changed = trialFor(map("IMM 7777", "b".repeat(64), [{ ...entries[0], fact: "person.surname" }, entries[1]]), reg);
ok("S2 fail (SA-1B-174): once a mapped box changes, that trial no longer counts and the words say the map changed", !changed.passed && /earlier version of its field map/.test(changed.why ?? ""), changed);
ok("S2 pass: bookkeeping (captions, confidence, the AI's quote, item versions, entry order) does not change the map version", mapVersion([{ ...entries[1], caption: "Date of birth", confidence: "high" } as never, { ...entries[0], item_version: 7 } as never]) === mapVersion(entries));
ok("S2 fail: what a box writes (transform, person, row, condition, option map, outcome, its form field) changes the map version", ["transform", "person", "row", "condition", "option_map", "outcome", "data_path"].every((k) => mapVersion([{ ...entries[0], [k]: "x" }, entries[1]]) !== mapVersion(entries)));
ok("P-65 (a): the verdict rule reads \"Passes …\" and \"The product's part passes …\", never \"… does not pass …\"", verdictPasses("## Verdict\n**Passes from the product's file alone.**") && verdictPasses("## Verdict\n**The product's part passes. Validate needs one step.**") && !verdictPasses("## Verdict\n**Passes in Adobe; does not pass from the product's file alone.**") && !verdictPasses("no verdict"));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
