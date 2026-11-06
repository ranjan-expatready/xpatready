// QA-289 (row A7 of the M3 sprint plan; C6.11, C7.7): the firm's office phone reaches a case as a phone, never as an
// object. samples/firms.json holds the office phone as parts (country code, number); IMM 5476's representative block
// reads it as person.telephone_number. Where the release's forms write the phone part by part (a "phone_part" transform,
// the questionnaire's phone kind) the parts go on as they are; where they read it whole (text), it goes on as a number a
// person can read ("+1 4165550100"), never the parts object that the case page shows as "[object Object]" and a text box
// would be filled with. Each rule with a passing and a failing case. Pure: no server, no database. Sample data, US$0.
//   tsx studio/tests/runtime/check_qa289_rep_phone.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as team from "../../engine/runtime/team.ts";
import type { Firm, Member } from "../../engine/runtime/team.ts";
import { shapeOf } from "../../engine/runtime/case.ts";

const results: boolean[] = [];
const ok = (name: string, pass: boolean, detail: unknown = "") => { results.push(pass); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail === "" ? "" : ` — ${JSON.stringify(detail)}`}`); };

const FIRMS = (JSON.parse(readFileSync(join(import.meta.dirname, "..", "..", "samples", "firms.json"), "utf8")) as { firms: Firm[] }).firms;
const firm = FIRMS.find((f) => f.key === "sample-firm")!;
const REP = firm.users.find((u) => (u as { duties: string[] }).duties.includes("represent"))!.id;
const one: Member[] = [{ userId: REP, role: "LEAD_REPRESENTATIVE", assignedBy: REP, assignedAt: new Date(Date.UTC(2026, 10, 6, 10)), endedAt: null, endedBy: null, endReason: null }];
const PHONE = "person.telephone_number";
// Read through the module, so the same check runs (and fails in words) on code without this row's change.
const phoneText = (v: unknown): unknown => { const f = (team as { phoneText?: (x: unknown) => unknown }).phoneText; return f ? f(v) : "(no phoneText)"; };
const representativeContact = team.representativeContact as (f: Firm, m: Member[], parts?: boolean) => Record<string, unknown> | null;
const representativeAnswers = team.representativeAnswers as (f: Firm, m: Member[], c?: string, parts?: boolean) => ReturnType<typeof team.representativeAnswers>;
const office = (firm as { office?: { phone?: { country_code?: string; number?: string } } }).office?.phone;

// The office phone in samples/firms.json is held as parts (the cause qa named): the check reads it, never assumes it.
ok("QA-289 setup: the Sample firm's office phone is held as parts (country code and number)", !!office && typeof office === "object" && !!office.number && !!office.country_code, office);

// phoneText: the parts as a number a person reads.
ok("QA-289 pass: the office phone as text reads \"+<country code> <number>\"", phoneText(office) === `+${office?.country_code} ${office?.number}`, phoneText(office));
ok("QA-289 pass: an extension is kept in words", phoneText({ country_code: "1", number: "4165550100", extension: "12" }) === "+1 4165550100 ext. 12");
ok("QA-289 fail: no number gives no phone (left out, so the question stays asked), never \"+1 \"", phoneText({ country_code: "1", number: "" }) === null);
ok("QA-289 fail: a value already text is left as it is", phoneText("+1 4165550100") === "+1 4165550100");

// representativeContact: text for a release that reads the phone whole, parts for one that writes it part by part.
const asText = representativeContact(firm, one, false)?.[PHONE];
const asParts = representativeContact(firm, one, true)?.[PHONE];
ok("QA-289 fail (the bug): a release that reads the phone as text never gets the parts object", typeof asText === "string" && !String(asText).includes("[object Object]"), asText);
ok("QA-289 pass: a release that reads the phone as text gets a number a person can read", asText === `+${office?.country_code} ${office?.number}`, asText);
ok("QA-289 pass: a release whose form writes the phone part by part still gets the parts (C7.7, as before)", typeof asParts === "object" && (asParts as { number?: string }).number === office?.number, asParts);
ok("QA-289 pass: with no shape said, the parts stay (every caller before this row)", JSON.stringify(representativeContact(firm, one)?.[PHONE]) === JSON.stringify(asParts));

// representativeAnswers (what the case reads, runtime.ts state): the same answer, from the firm record.
const ans = (parts: boolean) => representativeAnswers(firm, one, undefined, parts).find((a) => a.field === PHONE);
ok("QA-289 pass: the case's firm-record answer for the representative's phone is text on a text release", typeof ans(false)?.value === "string" && ans(false)?.channel === "firm_record", ans(false)?.value);
ok("QA-289 pass: and parts on a part-by-part release", typeof ans(true)?.value === "object", ans(true)?.value);

// shapeOf decides which: the release's own maps (a "phone_part" transform), as the questionnaire shows its phone kind.
const snap = (transform: string | null) => ({ field_maps: [{ form: "IMM 5476", channel: "PDF", entries: [{ fact: PHONE, transform, outcome: "mapped", data_path: "IMM_5476[0].Page1[0].SectionB[0].question7[0]" }] }], canonical_fields: [{ id: PHONE, value_type: "text" }] });
ok("QA-289 pass: a map that writes the phone part by part makes it a phone (parts)", shapeOf(snap("phone_part:national_number") as never, PHONE).phone === true);
ok("QA-289 fail: a map that reads it whole (text) does not (text)", shapeOf(snap(null) as never, PHONE).phone === false && shapeOf(snap("max 20 characters") as never, PHONE).phone === false);

const passed = results.filter(Boolean).length;
console.log(`\n${passed}/${results.length} passed`);
process.exitCode = passed === results.length ? 0 : 1;
