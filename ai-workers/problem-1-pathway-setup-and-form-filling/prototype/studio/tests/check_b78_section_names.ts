// B78 (C10.1 row 7; P-319; AGENTS.md rule 4): the names a person gives the sections no printed heading was read over. Each
// entry is one held section, marked printed (the form's own words) or sample (Unconfirmed: expert); a section with no entry
// stays waiting; a placeholder is never a name. The real load is proved by check_qa144_vv_release.ts.
//   tsx studio/tests/check_b78_section_names.ts
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { heldSectionNames, namedReason, nameOfHeld, readHeldSectionNames, type HeldSectionName } from "../api/src/section-names.ts";

let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
const refused = (f: () => unknown) => { try { f(); return false; } catch { return true; } };
const entry: HeldSectionName = { form: "Form A (01-2026)", first_field: "a.b", name: "Your visit", printed: "YOUR VISIT", page: 2, basis: "printed" };

const names = readHeldSectionNames();
const raw = (JSON.parse(readFileSync(join(import.meta.dirname, "..", "samples", "section-names.json"), "utf8")) as { sections: HeldSectionName[] }).sections;
// BK-16 PR 2 (P-496, review M2): 59 → 65. IMM 1295 (09-2023), the Study permit spouse's work permit application, joins the
// configured checkpoint; five of its sections print no heading the rules pass reads, and its headed "Details of intended
// work in Canada" part takes a Sample name of its own so it never joins With an LMIA's section of that name.
ok("B78 pass: the sample file names the 65 sections, one entry each (29 from B78, 30 from B79b: IMM 5532 and IMM 5604, Family sponsorship; 6 from BK-16: IMM 1295)", names.size === 65 && raw.length === 65, { size: names.size });
ok("B78 pass: every entry says where its words come from, with the printed words and the page", raw.every((s) => ["printed", "sample"].includes(s.basis) && s.printed.trim().length > 1 && s.page >= 1));
// B79b (review round 2, Major 1; AGENTS rule 4): a "printed" name quotes words the form really prints, read from its
// official XFA template by prototype/p1/xfa_texts.py (<form>.texts.json beside the inventory), never the PDF's internal
// part names: IMM 5604's office box sits in a part called forCICUseOnly, but the form prints "FOR OFFICE USE ONLY".
const SOL = join(import.meta.dirname, "..", "..", "..");
const official = new Map((JSON.parse(readFileSync(join(SOL, "official-sources", "ircc", "manifest.json"), "utf8")).items as { file: string; edition: string; sha256: string; path: string; is_pdf?: boolean }[]).filter((i) => i.is_pdf).map((i) => [i.edition, i]));
const flat = (t: string) => t.replace(/\s+/g, " ").trim().toLowerCase();
const printedOf = (edition: string): string[] | null => {
  const item = official.get(edition);
  const file = item && join(SOL, "prototype", "p1", "inventory", item.file.replace(/\.pdf$/, ".texts.json"));
  if (!item || !file || !existsSync(file)) return null;
  const t = JSON.parse(readFileSync(file, "utf8")) as { edition: string; sha256: string; texts: string[] };
  const pdf = join(SOL, "official-sources", "ircc", item.path);
  // Read from today's official file: the manifest's checksum, and the committed PDF's own bytes when present.
  return t.edition === edition && t.sha256 === item.sha256 && (!existsSync(pdf) || createHash("sha256").update(readFileSync(pdf)).digest("hex") === item.sha256) ? t.texts.map(flat) : null;
};
const unprinted = raw.filter((s) => s.basis === "printed" && !(printedOf(s.form) ?? []).some((t) => t.includes(flat(s.printed))));
ok("B79b pass: every printed name's words are printed on its form (its XFA template's own texts, today's file)", raw.some((s) => s.basis === "printed") && unprinted.length === 0, unprinted.map((s) => `${s.form}: ${s.printed}`));
ok("B79b fail: words only a PDF part name holds are not the form's print (IMM 5604's forCICUseOnly prints FOR OFFICE USE ONLY)", (printedOf("IMM 5604 (02-2023)") ?? []).some((t) => t.includes("for office use only")) && !(printedOf("IMM 5604 (02-2023)") ?? ["for cic use only"]).some((t) => t.includes("for cic use only")));
ok("B78 fail-guard: no name is a placeholder or the PDF's internal part name", raw.every((s) => !/unnamed|table\d|wrapper|^five$|^seven$/i.test(s.name)));
ok("B78 pass: a held section with an entry takes its name", nameOfHeld(heldSectionNames({ sections: [entry] }), entry.form, entry.first_field)?.name === "Your visit");
ok("B78 fail: another first form field or another edition has no name, so it stays waiting", nameOfHeld(heldSectionNames({ sections: [entry] }), entry.form, "a.c") === null && nameOfHeld(heldSectionNames({ sections: [entry] }), "Form A (02-2026)", entry.first_field) === null);
ok("B78 fail: a section with no form edition or no form field stays waiting", nameOfHeld(names, null, "a.b") === null && nameOfHeld(names, entry.form, undefined) === null);
ok("B78 fail: a placeholder, an empty name, an unmarked basis or the same section twice is refused", refused(() => heldSectionNames({ sections: [{ ...entry, name: "Unnamed section 1 of Form A" }] })) && refused(() => heldSectionNames({ sections: [{ ...entry, name: " " }] })) && refused(() => heldSectionNames({ sections: [{ ...entry, basis: "guess" as "sample" }] })) && refused(() => heldSectionNames({ sections: [entry, entry] })));
ok("B78 AGENTS rule 4: a printed name quotes the form and page and is marked Sample", /"YOUR VISIT" \(Form A \(01-2026\), page 2\) \(Sample\)/.test(namedReason(entry)));
ok("B78 AGENTS rule 4: a person's wording is marked Sample, Unconfirmed: expert", /\(Sample, Unconfirmed: expert\)/.test(namedReason({ ...entry, basis: "sample" })) && !/Unconfirmed/.test(namedReason(entry)));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
