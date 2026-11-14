// BK-26 (BK-24 follow-up F1; P-170, P-319, P-425): a list the form's own script fills from another box's answer is
// resolved from the official file's own datasets, keyed by the box it depends on. IMM 1294's question 1 d (the study's
// city) is filled by its province's script, `setDDLFromLOV(CityTown.CityTown, "CityList." + this.formattedValue+".City[*]")`;
// prototype/p1/xfa_inventory.py `lists` reads every such list into <form>.lists.json beside the inventory (no AI, US$0),
// and the value step (engine/form-values.ts, p5/transforms.ts dependentChoices) writes the city's code from the list for
// the province the copy writes. A city not in that province's list is refused in words, never written; with no province
// written, or no lists file, the box stays named for a person. The step texts are the saved AI answer's own and the
// sample loader's correction (samples/review-corrections.json); the boxes are the forms' own field lists. Sample people.
// No server, no database, US$0.
//   tsx studio/tests/check_bk26_dependent_lists.ts
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { dependentChoices, runTransform, type DependentList } from "../../p5/transforms.ts";
import { formValues, type BoxResult, type Inventory, type InventoryBox } from "../engine/form-values.ts";
import { dependentListsFor } from "../engine/field-format.ts";

let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 400)}` : ""}`); };
const STUDIO = join(import.meta.dirname, ".."), PROTO = join(STUDIO, ".."), ROOT = join(PROTO, "..", "..", "..");
const invFile = (form: string) => `prototype/p1/inventory/${form}.inventory.json`;
const inventory = (form: string): Inventory => ({ ...(JSON.parse(readFileSync(join(PROTO, "p1", "inventory", `${form}.inventory.json`), "utf8")) as Inventory), dependent_lists: dependentListsFor(invFile(form)) });
const CORRECTIONS = JSON.parse(readFileSync(join(STUDIO, "samples", "review-corrections.json"), "utf8")) as { boxes: { edition: string; box: string; proposed: string | null; key: string; transform: string }[] };

// 1. The lists file is the official file's own reading: read again from the PDF, it is the same text (a stale file FAILs).
const PY = join(ROOT, ".tools", "solution-1-prototype", ".venv", "bin", "python");
for (const form of ["imm0008e", "imm1294e", "imm1295e", "imm5710e"]) {
  const file = join(PROTO, "p1", "inventory", `${form}.lists.json`);
  if (!existsSync(PY)) { console.log(`WAIT  BK-26: ${form}.lists.json read again from the official file: the prototype's Python is not set up here`); continue; }
  const again = execFileSync(PY, ["-I", "-c", `import importlib.util,sys;s=importlib.util.spec_from_file_location("x",sys.argv[1]);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);sys.stdout.write(m.lists_json(m.dependent_lists(sys.argv[2])))`, join(PROTO, "p1", "xfa_inventory.py"), `${form}.pdf`], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
  ok(`BK-26: ${form}.lists.json is what the official file's own script and datasets say (read again, same text)`, again === readFileSync(file, "utf8"));
}

// 2. What the reader found on IMM 1294: the city box, the province box it depends on, the form's own words, every list.
const CITY = "form1[0].Page3[0].DetailsOfStudy[0].PurposeRow1[0].CityTown[0].CityTown[0]", PROV = "form1[0].Page3[0].DetailsOfStudy[0].PurposeRow1[0].ProvinceState[0].Prov[0]";
const inv1294 = inventory("imm1294e"), dep = inv1294.dependent_lists?.[CITY];
const entries = dep ? Object.values(dep.lists).reduce((n, l) => n + l.length, 0) : 0;
ok(`BK-26: IMM 1294's city (question 1 d) is the form's own list by its province: ${dep?.quote}; ${dep ? Object.keys(dep.lists).length : 0} provinces and territories, ${entries} cities with codes`,
  dep?.depends_on === PROV && dep.key === "label" && /CityList\./.test(dep.quote ?? "") && Object.keys(dep.lists).length === 13 && entries === 4503 && dep.lists.ON?.some(([l, c]) => l === "Toronto" && c === "3812"), dep && { ...dep, lists: undefined });
ok("BK-26: only boxes with no list of their own are dependent (the province box keeps its own list)",
  Object.keys(inv1294.dependent_lists ?? {}).every((p) => { const b = inv1294.fields.find((f) => f.data_path === p); return b?.ui === "choiceList" && !(b.options_resolved ?? []).length; }) && !!inv1294.fields.find((f) => f.data_path === PROV)?.options_resolved?.length);

// 3. The fill: the saved AI answer's province step and the sample loader's city step, the city box listed first.
const provStep = "address_part:province then code_list:imm1294.province (AB=09, BC=11, MB=07, NB=04, NL=01, NS=03, NT=10, NU=64, ON=06, PE=02, QC=05, SK=08, YT=12)";
const cityFix = CORRECTIONS.boxes.find((b) => b.edition === "IMM 1294 (06-2026)" && b.box === CITY);
ok("BK-26: the sample loader maps IMM 1294's city, which the saved AI answer left unresolved, to the school's address (data, not code)", cityFix?.proposed === null && cityFix.key === "case.school_address" && /^address_part:city then code_list:/.test(cityFix.transform), cityFix);
const row = (box: string, value: unknown, transform: string) => ({ box, caption: box, fact: "case.school_address", meaning: null, about: "case", about_label: "The case", row: null, coverage: "confirmed fact" as const, detail: "", value, transform });
const fill = (school: unknown, inv: Inventory, provinceToo = true) => {
  const rows = [row(CITY, school, cityFix?.transform ?? "address_part:city then code_list:imm1294.city"), ...(provinceToo ? [row(PROV, school, provStep)] : [])];
  const out = formValues({ canonical_fields: [] } as never, { entries: rows.map((b) => ({ data_path: b.box, fact: b.fact, transform: b.transform })) }, inv, rows);
  return { values: out.values, city: out.boxes.find((b: BoxResult) => b.box === CITY)! };
};
const SCHOOL = { street_number: "200", street_name: "SAMPLE AVENUE", city: "TORONTO", province: "ON", postal_code: "M5V 0B2", country: "Canada" };
const a = fill(SCHOOL, inv1294);
ok(`BK-26 pass: the student's IMM 1294 writes the province (${a.values[PROV]}) and the city's own code (${a.values[CITY]}, Toronto in ON's list)`, a.values[PROV] === "06" && a.values[CITY] === "3812" && a.city.result === "written", a);
const b = fill({ ...SCHOOL, city: "MONTREAL" }, inv1294);
ok(`BK-26 fail: a city not in the province's list is refused in words, never written (${b.city.result}: ${b.city.why})`,
  b.city.result === "not on this form" && !(CITY in b.values) && /"MONTREAL" is not in the form's own list of choices for "Province" ON/.test(b.city.why ?? "") && /nothing is written/.test(b.city.why ?? ""), b);
ok("BK-26 pass: the same city is written for the province whose list has it (Montreal is in QC's list)", (() => { const q = fill({ ...SCHOOL, city: "MONTREAL", province: "QC" }, inv1294); return q.values[PROV] === "05" && /^\d+$/.test(q.values[CITY] ?? "") && q.values[CITY] === inv1294.dependent_lists?.[CITY]?.lists.QC?.find(([l]) => l === "Montreal")?.[1]; })());
const c = fill(SCHOOL, inv1294, false);
ok(`BK-26 fail: with no province written the city is left to a person, named (${c.city.why})`, c.city.result === "by hand" && !(CITY in c.values) && /"Province"/.test(c.city.why ?? ""), c.city);
const d = fill({ ...SCHOOL, province: "ZZ" }, inv1294);
ok("BK-26 fail: a province the form's list does not have writes neither box (never a guess)", !(PROV in d.values) && !(CITY in d.values) && d.city.result === "by hand", d);
const e = fill(SCHOOL, { ...inv1294, dependent_lists: null });
ok(`BK-26: without the form's lists file the city stays named for a person, as before (${e.city.why})`, e.city.result === "by hand" && /dependent list/.test(e.city.why ?? "") && !(CITY in e.values), e.city);

// 4. Generic: any other dependent list of the Study permit's forms resolves the same way (IMM 1295's intended location).
const inv1295 = inventory("imm1295e");
const deps1295 = Object.entries(inv1295.dependent_lists ?? {});
const [city95, dep95] = deps1295[0] ?? [];
const r95 = (value: unknown, t: string, box: string) => ({ ...row(box, value, t), fact: "person.intended_location" });
const out95 = dep95 ? formValues({ canonical_fields: [] } as never, { entries: [] }, inv1295, [r95("Vancouver", "code_list:imm1295.city", city95), r95("BC", "code_list:imm1295.province", dep95.depends_on)]) : null;
ok(`BK-26 pass: IMM 1295's dependent list (${dep95?.caption} by ${dep95?.depends_on_caption}) resolves the same way: BC ${out95?.values[dep95?.depends_on ?? ""]}, Vancouver ${out95?.values[city95 ?? ""]}`,
  deps1295.length === 1 && out95?.values[dep95!.depends_on] === "11" && out95?.values[city95!] === dep95!.lists.BC?.find(([l]) => l === "Vancouver")?.[1]);
const SIX = ["imm1294e", "imm1295e", "imm5257e", "imm5476e", "imm5707e", "imm5645e"].filter((f) => existsSync(join(PROTO, "p1", "inventory", `${f}.inventory.json`)));
const unresolved = SIX.flatMap((f) => { const inv = inventory(f); return inv.fields.filter((x: InventoryBox & { options_from?: unknown }) => x.data_path && x.ui === "choiceList" && !(x.options_resolved ?? []).length && !x.options && !inv.dependent_lists?.[x.data_path]).map((x) => `${f} ${x.data_path}`); });
ok(`BK-26: every list box of ${SIX.join(", ")} has its own choices or a dependent list read from its file (none left unread)`, unresolved.length === 0, unresolved);

// 5. The filler's own rule (pure), both keys: the list chosen by the other box's label or code; refused, never guessed.
const tiny: DependentList = { depends_on: "p", depends_on_caption: "*Region", key: "code", list: "L.{}.I", lists: { "7": [["", ""], ["Alpha", "71"]] } };
const pick = dependentChoices(tiny, { options_resolved: [["North", "7"]] }, "7");
ok("BK-26 pass: a list keyed by the other box's code is read by that code (the empty item dropped)", "options" in pick && pick.options.length === 1 && pick.options[0][1] === "71" && /"Region" 7/.test(pick.scope), pick);
const box = "options" in pick ? { options_resolved: pick.options, options_scope: pick.scope } : {};
const hit = runTransform("code_list:x", "Alpha", box), miss = runTransform("code_list:x", "Beta", box);
ok("BK-26 fail: on a dependent list a value outside it is refused (no hand-off, no write); a value in it gives its code", hit.ok && hit.value === "71" && !miss.ok && "refused" in miss, { hit, miss });
const none = dependentChoices({ ...tiny, key: "label" }, { options_resolved: [["North", "7"]] }, "8");
ok("BK-26 fail: a value the other box's list does not have picks no list: a person decides", "why" in none, none);

console.log(`\nBK-26: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
