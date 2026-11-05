// QA-221 (C4.1, C10.1; the tech lead's ruling C, 4 Nov; AGENTS rule 4): offline checks of the engine's age gate (no
// database, no browser, no AI) on a hand-made snapshot. A form line for "the principal applicant, a spouse or partner, and
// each dependent child 18 or older" (contracts/resolver.ts principal_partner_adult_children; IMM 5257 SCH1 (09-2023)
// p. 1: "The principal applicant, his or her spouse or common-law partner, if applicable, and all dependent children aged
// 18 years or older … must complete their own copy of this form.") gates dependent children only; "each applicant, from
// 18" (IMM 5707's and IMM 5645's lines) gates every person as before. Its facts follow: a person a form does not apply to
// is not asked them. Sample ages; US$0.
//   tsx studio/tests/check_qa221_who_age.ts
import { kkey, render, type Known, type Person } from "../engine/render.ts";
import type { Snapshot } from "../engine/snapshot.ts";
import { validate } from "../engine/validate.ts";

let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 240)}` : ""}`); };

const line = (form: string, who: string) => ({ form_number: form, title: form, who, status: "always", condition: null, min_age: 18 });
const snap = {
  contract_version: "combination-config/v0", combination: { key: "t", label: "t", program: "p", pathway: null, participants: [], source_basis: "SOURCE_BACKED", basis_note: null }, mode: "draft",
  canonical_fields: [{ id: "person.date_of_birth", meaning: "Date of birth", value_type: "date" }, { id: "person.employment_history", meaning: "Employment history", value_type: "text" }, { id: "person.mother_name", meaning: "Mother's name", value_type: "text" }],
  sections: [{ id: "background", title: "Background" }],
  placements: ["person.date_of_birth", "person.employment_history", "person.mother_name"].map((fact) => ({ lineage: fact, fact, section_id: "background", repeats: "per_person", collected_from: "client_questionnaire" })),
  forms: [line("SCH1", "principal_partner_adult_children"), line("FAMILY", "each_applicant")],
  field_maps: [
    { form_number: "SCH1", form_edition: "SCH1 (09-2023)", entries: [{ data_path: "a", outcome: "mapped", person: "form_subject", fact: "person.employment_history" }] },
    { form_number: "FAMILY", form_edition: "FAMILY (01-2023)", entries: [{ data_path: "b", outcome: "mapped", person: "form_subject", fact: "person.mother_name" }] },
  ],
  document_requirements: [], document_types: [], rules: [], derived_fields: [], checks: [], row_versions: {},
} as unknown as Snapshot;

const today = new Date("2026-11-04T00:00:00Z");
const p = (id: string, role: string): Person => ({ id, role, label: id, applies: true });
const read = (people: Person[], ages: Record<string, number>) => {
  const known: Known = new Map(Object.entries(ages).map(([id, age]) => [kkey(id, "person.date_of_birth"), { value: `${2026 - age}-01-15`, status: "confirmed" as const, source: "Sample" }]));
  const r = render(snap, people, known, { today });
  const applies = (form: string, id: string) => r.forms.find((f) => f.form === form && f.person === id)?.applies;
  const asks = (id: string, fact: string) => r.coverage.some((c) => c.applies !== false && c.boxes.some((b) => b.about === id && b.fact === fact));
  return { r, applies, asks };
};

const family = [p("principal", "principal"), p("spouse", "spouse_or_partner"), p("child-1", "child"), p("child-2", "child")];
const a = read(family, { principal: 40, spouse: 38, "child-1": 10, "child-2": 19 });
ok("QA-221 fail: a dependent child under 18 (10) does not fill SCH1 and is not asked its facts", a.applies("SCH1", "child-1") === false && !a.asks("child-1", "person.employment_history"));
ok("QA-221 pass: a dependent child of 18 or older (19) fills SCH1 and is asked its facts", a.applies("SCH1", "child-2") === true && a.asks("child-2", "person.employment_history"));
ok("QA-221 pass: the principal and a spouse or partner fill SCH1", a.applies("SCH1", "principal") === true && a.applies("SCH1", "spouse") === true);
const young = read([p("principal", "principal"), p("spouse", "spouse_or_partner")], { principal: 16, spouse: 17 });
ok("QA-221 pass: a principal applicant under 18 (16) and a spouse under 18 (17) still fill SCH1 (the form names them at any age)", young.applies("SCH1", "principal") === true && young.applies("SCH1", "spouse") === true && young.asks("principal", "person.employment_history"));
ok("QA-221 (unchanged): 'each applicant, from 18' still gates every person: a child of 10, a principal of 16 and a spouse of 17 do not fill it; adults and a child of 19 do", a.applies("FAMILY", "child-1") === false && a.applies("FAMILY", "child-2") === true && a.applies("FAMILY", "principal") === true && young.applies("FAMILY", "principal") === false && young.applies("FAMILY", "spouse") === false);
const none = read(family, {});
ok("QA-221: with no dates of birth, only the children cannot be told for SCH1 (their date of birth is asked); the principal and spouse fill it", none.applies("SCH1", "principal") === true && none.applies("SCH1", "spouse") === true && none.applies("SCH1", "child-1") === "cannot_tell" && none.applies("FAMILY", "principal") === "cannot_tell");
const why = (r: ReturnType<typeof read>["r"], id: string) => r.forms.find((f) => f.form === "SCH1" && f.person === id)?.why ?? "";
ok("QA-221 words: the reason names the age for a child only", /for a dependent child, from age 18/.test(why(a.r, "child-1")) && /at any age for the principal applicant and a spouse or partner/.test(why(a.r, "principal")), [why(a.r, "child-1"), why(a.r, "principal")]);
// The release check's words: a line whose age decides it needs a date of birth asked, said for whom it decides.
const noBirth = { ...snap, placements: (snap.placements as { fact: string }[]).filter((x) => x.fact !== "person.date_of_birth") } as unknown as Snapshot;
const msg = validate(noBirth, [{ key: "person.employment_history", valueType: "text" }, { key: "person.mother_name", valueType: "text" }], []).find((x) => x.item === "SCH1" && /date of birth/.test(x.message))?.message ?? "";
ok("QA-221 words: with no date of birth asked, release says SCH1's age decides it for each child", /from age 18 for a dependent child, so each child's date of birth decides it/.test(msg), msg.slice(0, 200));

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
