// C3.1 (P-162): each shared field's format comes from its source (the official form's PDF box and its own validation
// script, read without AI by prototype/p1/xfa_formats.py) and a fixed set of checks in code enforces it: in the library
// (GET /library/fields, /library/fields/:key, /library/fields/:key/format, POST …/format-check) and on every case
// answer (engine/runtime/case.ts checkValue). A passing and a failing case per rule. Isolated copy, sample inputs, no
// browser, NO model call (US$0).
//   zsh studio/tools/isolated.sh forms_c31 4451 start && tsx studio/tests/check_forms_c31_formats.ts 4451
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { checkForFunction, checkFormat, fieldFormat, FORMAT_CHECK_IDS, FORMAT_CHECKS, formatWords } from "../engine/field-format.ts";
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

  // ─────────────────── Review M4: every fixed check has a passing and a failing case (removing one fails here)
  const T = new Date("2026-11-01T12:00:00Z");
  const CASES: Record<string, { params?: Record<string, unknown>; ctx?: Record<string, unknown>; good: string; bad: string }> = {
    max_length: { params: { n: 5 }, good: "abcde", bad: "abcdef" },
    min_length: { params: { n: 5 }, good: "Cook.", bad: "Cook" },
    digits_only: { good: "0123", bad: "01a3" },
    digits_and_spaces: { good: "613 555 0100", bad: "613-555-0100" },
    digits_exact: { params: { n: 4 }, good: "0100", bad: "100" },
    area_code: { good: "613", bad: "113" },
    letters_digits: { good: "AB 12345", bad: "AB-12345" },
    letters_digits_no_space: { good: "AB12345", bad: "AB 12345" },
    english_french: { good: "Rue de l'Église, 3e étage", bad: "Calle Peñón" },
    name_characters: { good: "O'Brien-Lefèvre", bad: "O\u2019Brien" },
    place_characters: { good: "Saint-Jean-sur-Richelieu", bad: "Zürich (CH)" },
    email: { good: "a.b_c@example.ca", bad: "a+b@example.ca" },
    postal_code: { ctx: { country: "Canada" }, good: "K1A-0B1", bad: "K1A 0B" },
    month: { good: "2019-06", bad: "2019-13" },
    day: { good: "2019-06-30", bad: "2019-06-32" },
    year_from_1900: { params: { max: "this_year" }, good: "1990-01-01", bad: "1899-12-31" },
    not_future: { good: "2026-11", bad: "2026-12" },
    date_after: { params: { than: "today" }, good: "2027-01-01", bad: "2026-10-31" },
    whole_number: { good: "2500", bad: "2500.50" },
    date_pattern: { good: "2019-06-30", bad: "30/06/2019" },
  };
  ok("C3.1 M4: every fixed check has a case here", FORMAT_CHECK_IDS.every((k) => CASES[k]), FORMAT_CHECK_IDS.filter((k) => !CASES[k]));
  for (const k of FORMAT_CHECK_IDS) {
    const c = CASES[k]; if (!c) continue;
    const f = { rules: [{ check: k, params: c.params ?? {}, words: "", part: null, part_words: null, sources: [] }], not_checked: [], read: true } as never;
    ok(`C3.1 ${k} pass: "${c.good}"`, checkFormat(f, c.good, { today: T, ...c.ctx }).length === 0, checkFormat(f, c.good, { today: T, ...c.ctx }));
    ok(`C3.1 ${k} fail: "${c.bad}" refused in words`, checkFormat(f, c.bad, { today: T, ...c.ctx }).length === 1, checkFormat(f, c.bad, { today: T, ...c.ctx }));
  }
  ok("C3.1 M3 fail: a curly apostrophe is refused with the way out (type ')", /Type the apostrophe as '/.test(checkFormat({ rules: [{ check: "name_characters", params: {}, words: "", part: null, part_words: null, sources: [] }], not_checked: [], read: true } as never, "O\u2019Brien")[0] ?? ""));

  // ─────────────────── Review M4: each form validation function maps to the check its own words describe
  const EXPECT: Record<string, string | null> = {
    validateUCI: "digits_only", validatePassportNum: "letters_digits", validateUSCIS: "letters_digits_no_space", validatePostalCodeBasedOnCountry: "postal_code",
    validateEmail: "email", validateOpenText: "english_french", validateName: "name_characters", validatePOBText: "place_characters", validateDigits: "digits_only",
    validateIntlNum: "digits_and_spaces", validateAreaCode: "area_code", validatePhoneNAN: "digits_exact", validateDOBMM: "month", validateEduMonth: "month", validateDOBDD: "day",
    validateDOBYYYY: "year_from_1900", validateEduFromYear: "year_from_1900", validateEduToYear: "year_from_1900", validateEduDateInPresentOrPast: "not_future", validateFunds: "whole_number",
    validateJobDescription: "min_length", validateDropDown: "type",
  };
  const fns = new Map<string, string>(); for (const { j } of formats) for (const b of Object.values((j?.boxes ?? {}) as Record<string, { checks?: { function: string; quote: { text: string }[] }[] }>)) for (const c of b.checks ?? []) if (!fns.has(c.function)) fns.set(c.function, c.quote.map((q) => q.text).join(" "));
  for (const [fn, want] of Object.entries(EXPECT)) {
    const got = checkForFunction(fn);
    ok(`C3.1 mapping: ${fn} → ${want}${fns.has(fn) ? ` (the form says "${fns.get(fn)?.slice(0, 70)}")` : ""}`, (got === "type" ? "type" : got?.check ?? null) === want, got);
  }
  ok("C3.1 mapping fail: a validation function with no check (validateLMIAandExemptionCode) maps to nothing", checkForFunction("validateLMIAandExemptionCode") === null);
  ok("C3.1 mapping: a date order with today is enforced; with another date of the form it is not claimed", checkForFunction("validateDate", [">", "utilDates.getToday("]) && (checkForFunction("validateDate", [">", "utilDates.getToday("]) as { params: { than: string } }).params.than === "today" && (checkForFunction("validateDate", [">=", "FromDate.rawValue"]) as { params: { than: string } }).params.than === "other_date");

  // ─────────────────── Review M1, M2: "select …;" transforms, phone pieces and whole answers
  const b1295 = formats.find((x) => x.f === "imm1295e.inventory.json")!.j.boxes as Record<string, { checks?: { function: string }[] }>;
  const boxBy = (fn: string) => Object.entries(b1295).find(([, b]) => b.checks?.some((c) => c.function === fn))![0];
  const phone = fieldFormat([["validateAreaCode", "nanp_area_code (3 digits)"], ["validatePhoneNAN", "nanp_subscriber (4 digits)"], ["validateIntlNum", "national_number_without_country_code (max 20 chars)"]].map(([fn, t]) => ({ form: "IMM 1295 (09-2023)", inventoryFile: inv1295, dataPath: boxBy(fn), caption: "Phone", transform: `select primary phone; phone_part:${t}` })), "phone");
  ok("C3.1 M1 pass: a \"select primary phone;\" transform is read by its part (the national number is the answer's number)", phone.rules.some((r) => r.part === "number") && phone.rules.every((r) => r.part === "number"), phone.rules.map((r) => `${r.part}:${r.check}`));
  ok("C3.1 M2 fail: rules on pieces the answer does not store (area code, line number) are listed as not checked, with why", phone.not_checked.some((n) => /area code/.test(n.why)) && phone.not_checked.every((n) => !!n.why), phone.not_checked);
  ok("C3.1 M1 pass: a real phone answer passes its format", checkFormat(phone, { type: "cell", country_code: "1", number: "613 555 0100" }).length === 0, checkFormat(phone, { type: "cell", country_code: "1", number: "613 555 0100" }));
  ok("C3.1 M1 fail: a phone number with letters is refused", checkFormat(phone, { country_code: "1", number: "613 CALL ME" }).length === 1, checkFormat(phone, { country_code: "1", number: "613 CALL ME" }));
  const addr = fieldFormat([{ form: "IMM 1295", inventoryFile: null, dataPath: "x[0]", caption: "Address", transform: "address_single_line (max 60 chars)" }], "address");
  ok("C3.1 M2 fail: a rule on a whole address written as one line is listed as not checked, never shown as checked", addr.rules.length === 0 && addr.not_checked.length === 1 && /whole address/.test(addr.not_checked[0].why), addr);

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
  ok("setup: the sample inputs load (or are already loaded on this copy)", loaded.status === 201 || loaded.status === 409, loaded.body?.message);
  let r = await call("GET", "/library/fields/person.uci/format");
  ok("C3.1 P-162 pass: GET …/format gives the UCI field's rules, each sourced to a form box and quoted", r.status === 200 && r.body.rules.some((x: { check: string; sources: { quote: string | null; from: string }[] }) => x.check === "digits_only" && x.sources.some((s) => s.from === "form_script" && s.quote === "The correct format is: Numeric characters")) && r.body.rules.some((x: { check: string }) => x.check === "max_length"), r.body);
  r = await call("GET", "/library/fields/person.no_such_field/format");
  ok("C3.1 fail: the format of a field not in the library is 404 in words", r.status === 404 && /not in the shared library/.test(JSON.stringify(r.body)), r.body);
  r = await call("POST", "/library/fields/person.uci/format-check", { value: "12345678" });
  ok("C3.1 P-162 pass: format-check accepts a UCI in the form's format", r.status === 201 && r.body.ok === true && r.body.problems.length === 0, r.body);
  r = await call("POST", "/library/fields/person.uci/format-check", { value: "12AB5678" });
  ok("C3.1 P-162 fail: format-check refuses a UCI with letters, in plain words", r.status === 201 && r.body.ok === false && r.body.problems[0] === "Use digits only (0 to 9), no letters, spaces or signs.", r.body);
  r = await call("POST", "/library/fields/person.uci/format-check", { value: "1" }, "user-Z");
  ok("C3.1 m4 fail: format-check needs a known person (401), as the other library calls do", r.status === 401, r.status);
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
