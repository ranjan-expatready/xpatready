// C3.1 (P-162): each shared field's format comes from its source (the official form's PDF box and its own validation
// script, read without AI by prototype/p1/xfa_formats.py) and a fixed set of checks in code enforces it: in the library
// (GET /library/fields, /library/fields/:key, /library/fields/:key/format, POST …/format-check) and on every case
// answer (engine/runtime/case.ts checkValue). A passing and a failing case per rule. Isolated copy, sample inputs, no
// browser, NO model call (US$0).
//   zsh studio/tools/isolated.sh forms_c31 4451 start && tsx studio/tests/check_forms_c31_formats.ts 4451
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { checkFormat, fieldFormat, FORMAT_CHECK_IDS, FORMAT_CHECKS, formatWords } from "../engine/field-format.ts";
import { checkValue } from "../engine/runtime/case.ts";
import type { Snapshot } from "../engine/snapshot.ts";

const PORT = Number(process.argv[2] ?? 4451);
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely, as in the other API checks
const call = async (method: string, path: string, body?: unknown, actor = "user-A"): Promise<Res> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
};
const INV = join(import.meta.dirname, "..", "..", "p1", "inventory");
const inv1295 = "prototype/p1/inventory/imm1295e.inventory.json";
const UCI = "form1[0].Page1[0].PersonalDetails[0].UCIClientID[0]";
const PASSPORT = "form1[0].Page2[0].MaritalStatus[0].SectionA[0].Passport[0].PassportNum[0].PassportNum[0]";
const POSTAL = "form1[0].Page2[0].ContactInformation[0].contact[0].AddressRow2[0].PostalCode[0].PostalCode[0]";

(async () => {
  // ─────────────────── The source: every inventoried form has its formats read from the form itself
  const invs = readdirSync(INV).filter((f) => /^imm.*\.inventory\.json$/.test(f) && !f.includes(".text."));
  const formats = invs.map((f) => ({ f, j: (() => { try { return JSON.parse(readFileSync(join(INV, f.replace(".inventory.json", ".formats.json")), "utf8")); } catch { return null; } })() }));
  ok("C3.1 P-162 pass: every inventoried form has its formats read from the official file (same checksum as its inventory)", formats.every(({ f, j }) => j && j.sha256 === JSON.parse(readFileSync(join(INV, f), "utf8")).summary.sha256), formats.filter((x) => !x.j).map((x) => x.f));
  const box = formats.find((x) => x.f === "imm1295e.inventory.json")!.j.boxes[UCI];
  ok("C3.1 P-162 pass: the UCI box carries the PDF's maximum length and the form's own check, quoted", box?.max_chars === 10 && box.checks?.[0]?.function === "validateUCI" && box.checks[0].quote[0]?.text === "The correct format is: Numeric characters", box);

  // ─────────────────── The fixed set: a format is one of the checks in code
  ok("C3.1 P-153 pass: the format checks are a fixed set in code, each with its words and its test", FORMAT_CHECK_IDS.length >= 15 && FORMAT_CHECK_IDS.every((k) => typeof FORMAT_CHECKS[k].test === "function" && typeof FORMAT_CHECKS[k].words === "function"), FORMAT_CHECK_IDS);
  const unknown = fieldFormat([{ form: "IMM 1295 (09-2023)", inventoryFile: inv1295, dataPath: "form1[0].Page3[0].DetailsOfWork[0].LMIA[0]", caption: "LMIA" }]);
  const lmiaPath = Object.entries(formats.find((x) => x.f === "imm1295e.inventory.json")!.j.boxes as Record<string, { checks?: { function: string }[] }>).find(([, b]) => b.checks?.some((c) => c.function === "validateLMIAandExemptionCode"))?.[0];
  const lmia = lmiaPath ? fieldFormat([{ form: "IMM 1295 (09-2023)", inventoryFile: inv1295, dataPath: lmiaPath, caption: "LMIA" }]) : unknown;
  ok("C3.1 P-153 fail: a form check with no fixed check in code is shown as not checked, never claimed as enforced", !!lmiaPath && lmia.not_checked.some((n) => n.function === "validateLMIAandExemptionCode" && /LMIA No\./.test(n.quote ?? "")) && !lmia.rules.some((r) => r.sources.some((s) => /LMIA No\./.test(s.quote ?? ""))), lmia);

  // ─────────────────── Engine: a field's format and its checks, from its boxes
  const uci = fieldFormat([{ form: "IMM 1295 (09-2023)", inventoryFile: inv1295, dataPath: UCI, caption: "UCI", transform: "as_is (max 10 chars)" }]);
  ok("C3.1 P-162 pass: the UCI field's format is digits only, at most 10, each with its form box and quote", formatWords(uci) === "At most 10 characters · Digits only" && uci.rules.every((r) => r.sources[0].form === "IMM 1295 (09-2023)" && r.sources[0].box === "UCI" && !!r.sources[0].quote), uci.rules);
  ok("C3.1 P-162 pass: a UCI of digits passes", checkFormat(uci, "12345678").length === 0);
  ok("C3.1 P-162 fail: a UCI with letters is refused in plain words", checkFormat(uci, "12AB5678")[0] === "Use digits only (0 to 9), no letters, spaces or signs.", checkFormat(uci, "12AB5678"));
  ok("C3.1 P-162 fail: a UCI longer than the box is refused", /Keep it to 10 characters/.test(checkFormat(uci, "12345678901")[0] ?? ""), checkFormat(uci, "12345678901"));
  const pp = fieldFormat([{ form: "IMM 1295", inventoryFile: inv1295, dataPath: PASSPORT, caption: "*Passport number", transform: "as_is" }]);
  ok("C3.1 P-162 pass: a passport number of letters and digits passes", checkFormat(pp, "AB1234567").length === 0, formatWords(pp));
  ok("C3.1 P-162 fail: a passport number with signs is refused", checkFormat(pp, "AB-123#").some((m) => /letters and digits only/.test(m)), checkFormat(pp, "AB-123#"));
  const pc = fieldFormat([{ form: "IMM 1295", inventoryFile: inv1295, dataPath: POSTAL, caption: "Postal code", transform: "address_part:postal_code (max 10 chars)" }]);
  ok("C3.1 P-162 pass: a Canadian postal code in an address in Canada passes; a US ZIP in the USA passes", checkFormat(pc, { street_name: "Main", city: "Ottawa", country: "Canada", postal_code: "K1A 0B1" }).length === 0 && checkFormat(pc, { city: "Boston", country: "USA", postal_code: "02110-1234" }).length === 0, formatWords(pc));
  ok("C3.1 P-162 fail: a postal code not in its country's format is refused (by the address's country)", checkFormat(pc, { city: "Ottawa", country: "Canada", postal_code: "12345" })[0] === "A Canadian postal code looks like A1A 1A1." && checkFormat(pc, { city: "Boston", country: "USA", postal_code: "K1A0B1" }).length === 1);
  const none = fieldFormat([{ form: "IMM 9999", inventoryFile: null, dataPath: "x[0]", caption: "X" }]);
  ok("C3.1 P-162 fail: a field whose form was not read says so (read false, no rules), never an invented format", none.read === false && none.rules.length === 0 && formatWords(none) === null);
  const fromMap = fieldFormat([{ form: "IMM 9999", inventoryFile: null, dataPath: "x[0]", caption: "X", transform: "as_is (max 30 chars)" }]);
  ok("C3.1 P-162 pass: without a read file, the field map's own box limit still counts, sourced to the field map", fromMap.rules.length === 1 && fromMap.rules[0].check === "max_length" && fromMap.rules[0].sources[0].from === "field_map", fromMap.rules);

  // ─────────────────── Enforced on every case answer (engine/runtime/case.ts)
  const snap = { canonical_fields: [{ id: "person.uci", value_type: "text" }], field_maps: [{ form_edition: "IMM 1295 (09-2023)", inventory_file: inv1295, entries: [{ data_path: UCI, caption: "UCI", outcome: "mapped", fact: "person.uci", transform: "as_is (max 10 chars)" }] }] } as unknown as Snapshot;
  ok("C3.1 P-162 pass: a case answer in the form's format passes the runtime check", checkValue(snap, "person.uci", "1234567890").length === 0, checkValue(snap, "person.uci", "1234567890"));
  ok("C3.1 P-162 fail: a case answer against the form's format is refused by the runtime check", checkValue(snap, "person.uci", "UCI-12").includes("Use digits only (0 to 9), no letters, spaces or signs."), checkValue(snap, "person.uci", "UCI-12"));

  // ─────────────────── The library, through the API
  const loaded = await call("POST", "/demo/load");
  ok("setup: the sample inputs load", loaded.status === 201, loaded.body?.message);
  let r = await call("GET", "/library/fields/person.uci/format");
  ok("C3.1 P-162 pass: GET …/format gives the UCI field's rules, each sourced to a form box and quoted", r.status === 200 && r.body.rules.some((x: { check: string; sources: { quote: string | null; from: string }[] }) => x.check === "digits_only" && x.sources.some((s) => s.from === "form_script" && s.quote === "The correct format is: Numeric characters")) && r.body.rules.some((x: { check: string }) => x.check === "max_length"), r.body);
  r = await call("GET", "/library/fields/person.no_such_field/format");
  ok("C3.1 fail: the format of a field not in the library is 404 in words", r.status === 404 && /not in the shared library/.test(JSON.stringify(r.body)), r.body);
  r = await call("POST", "/library/fields/person.uci/format-check", { value: "12345678" });
  ok("C3.1 P-162 pass: format-check accepts a UCI in the form's format", r.status === 201 && r.body.ok === true && r.body.problems.length === 0, r.body);
  r = await call("POST", "/library/fields/person.uci/format-check", { value: "12AB5678" });
  ok("C3.1 P-162 fail: format-check refuses a UCI with letters, in plain words", r.status === 201 && r.body.ok === false && r.body.problems[0] === "Use digits only (0 to 9), no letters, spaces or signs.", r.body);
  r = await call("POST", "/library/fields/person.uci/format-check", {});
  ok("C3.1 fail: format-check without a value is 400 in words", r.status === 400 && /Give the value/.test(JSON.stringify(r.body)), r.body);
  const fields = (await call("GET", "/library/fields")).body as { key: string; forms: string[]; format: { text: string | null; state: string } }[];
  const uciRow = fields.find((f) => f.key === "person.uci");
  ok("C3.1 P-162 pass: every Fields row carries a format or the reason it has none (never blank)", fields.length > 100 && fields.every((f) => f.format && (f.format.text || ["none_on_form", "not_read", "no_form"].includes(f.format.state))), fields.find((f) => !f.format));
  ok("C3.1 P-162 pass: the UCI row shows its format in words", uciRow?.format.state === "read" && /Digits only/.test(uciRow.format.text ?? ""), uciRow?.format);
  ok("C3.1 P-162 fail: a field on no form says so, not an invented format", fields.filter((f) => !f.forms.length).every((f) => f.format.state === "no_form" && f.format.text === null), fields.find((f) => !f.forms.length && f.format.state !== "no_form"));
  r = await call("GET", "/library/fields/person.uci");
  ok("C3.1 P-162 pass: the field page's data carries the full format with sources", r.status === 200 && r.body.format?.rules?.length >= 2 && r.body.format.read === true, r.body.format);

  console.log(`\n${pass} passed, ${fail} failed (C3.1 field formats; US$0)`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
