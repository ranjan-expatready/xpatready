// P5 offline checks: MRZ check digits, transformations, document association, reconciliation, review decisions,
// approval withdrawal, and the reader's guard and isolation. No network, no model call, no paid path.
//   node tests/check_p5_engine.ts
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as E from "../p5/engine.ts";
import { checkDigit, makeTd3, parseTd3 } from "../p5/reader/mrz.ts";
import { runTransform, parseAddress } from "../p5/transforms.ts";
import { admitDoc, readerCanary, screenText } from "../p5/reader/guard.ts";

const P = join(import.meta.dirname, "..");
let pass = 0, fail = 0;
const ok = (name: string, cond: boolean, detail = "") => { cond ? pass++ : fail++; console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`); };
const throws = (f: () => unknown) => { try { f(); return false; } catch { return true; } };

// MRZ (ICAO Doc 9303 Part 3 §4.9; specimen document number L898902C3 has check digit 6)
ok("check digit of the ICAO specimen document number", checkDigit("L898902C3") === 6);
const [l1, l2] = makeTd3({ state: "UTO", surname: "ERIKSSON", given: "ANNA MARIA", number: "L898902C3", nationality: "UTO", dob: "1974-08-12", sex: "F", expiry: "2012-04-15" });
const t = parseTd3(l1, l2)!;
ok("TD3 lines round-trip with every check digit passing", t.all_checks_pass && t.surname === "ERIKSSON" && t.given === "ANNA MARIA" && t.dob === "1974-08-12", `${l2}`);
const bad = l2.slice(0, 13) + "740821" + l2.slice(19);
ok("a changed date of birth without its check digit fails", !parseTd3(l1, bad)!.checks.dob);

// Transformations
const sexBox = { ui: "choiceList", options_resolved: [["", ""], ["F Female", "Female"], ["M Male", "Male"]] as [string, string][] };
const cBox = { ui: "choiceList", options_resolved: [["", ""], ["India", "205"], ["Canada", "511"]] as [string, string][] };
const pBox = { ui: "choiceList", options_resolved: [["ON", "06"], ["BC", "11"]] as [string, string][] };
ok("date parts", (runTransform("date:MM", "1990-04-12", {}) as any).value === "04" && (runTransform("date:YYYY", "1990-04-12", {}) as any).value === "1990");
ok("sex letter to the form's own code", (runTransform("code_list:imm1295.sex (Female|Male|Unknown|Unspecified)", "F", sexBox) as any).value === "Female");
ok("ICAO country code to the form's country code", (runTransform("code_list:imm1295.citizenship", "IND", cBox) as any).value === "205");
ok("province letters to the form's code", (runTransform("address_part:province; code_list:imm1295.province (09|11|07)", "100 Example Street, Toronto, ON M5V 1A1", pBox) as any).value === "06");
ok("a value longer than the box goes to the hand route, never truncated", (runTransform("as_is (max 10 chars)", "Software engineer", {}) as any).hand === true);
ok("an unknown step goes to the hand route", (runTransform("derive:Y if A equals B, else N", "x", {}) as any).hand === true);
ok("yes/no code", (runTransform("yes_no_code:Y/N", false, {}) as any).value === "N");
ok("one-line Canadian address parsed", JSON.stringify(parseAddress("25 Sample Avenue, Vancouver, BC V6B 1A1")) === JSON.stringify({ street_number: "25", street_name: "Sample Avenue", province: "BC", postal_code: "V6B 1A1", country: "Canada", city: "Vancouver" }));

// Association and reconciliation on a fresh case
const R = E.loadRelease();
const people: E.Person[] = [{ id: "a", role: "principal", label: "A" }, { id: "b", role: "partner", label: "B" }, { id: "k", role: "child", label: "K" }];
const c = E.newCase("t", R, people, "agent");
const src = { kind: "lead" as const, by: "client" };
E.propose(c, "person.family_name", "a", "EXAMPLE", src); E.propose(c, "person.given_names", "a", "CLIENTA", src); E.propose(c, "person.date_of_birth", "a", "1990-12-04", src);
E.propose(c, "person.family_name", "b", "EXAMPLEP", src); E.propose(c, "person.given_names", "b", "PARTNER", src);
const out = (fam: string, giv: string, dob: string | null) => ({ document: { kind_seen: "passport", matches_claimed_kind: true, readable: "yes", issues: [] }, people_seen: [], internal_conflicts: [], fields: [{ fact: "person.family_name", status: "proposed", value: fam }, { fact: "person.given_names", status: "proposed", value: giv }, ...(dob ? [{ fact: "person.date_of_birth", status: "proposed", value: dob }] : [])] });
ok("name match with a different date of birth is ambiguous", E.associate(c, out("EXAMPLE", "CLIENTA", "1990-04-12")).association === "ambiguous");
ok("a unique name match without a date to compare is matched", E.associate(c, out("EXAMPLEP", "PARTNER", null)).about === "b");
ok("a document uploaded for one person but about another is the wrong person", E.associate(c, out("EXAMPLEP", "PARTNER", null), "a").association === "wrong_person");
const doc = (id: string, date: string | null): E.DocRecord => ({ doc_id: id, sha256: id, file: id, original_name: id, media_type: "", uploaded_by: "client", uploaded_at: "", batch: 1, claimed_type: "job_offer", kind_seen: "job_offer", about: "b", association: "matched", processing: "read", status: "Received", letter_date: date });
const offer = (start: string) => ({ document: { kind_seen: "job_offer" }, internal_conflicts: [], fields: [{ fact: "person.intended_employment_start_date", status: "proposed", value: start, page: 1, where: "row" }] });
const d1 = doc("d1", "2026-10-05"); c.documents.push(d1);
ok("first evidence is new", E.reconcile(c, R, d1, offer("2027-02-01"), 1)[0].kind === "new");
const d2 = doc("d2", "2026-10-05"); c.documents.push(d2);
ok("the same value from another document corroborates", E.reconcile(c, R, d2, offer("2027-02-01"), 1)[0].kind === "corroborates");
const d3 = doc("d3", "2026-10-19"); c.documents.push(d3);
const ch = E.reconcile(c, R, d3, offer("2027-03-01"), 2)[0];
ok("a newer version of the same document is a change, not an overwrite", ch.kind === "changed" && E.current(c, "person.intended_employment_start_date", "b")!.value === "2027-02-01");
const d4 = doc("d4", null); c.documents.push(d4);
const cf = E.reconcile(c, R, d4, offer("2027-05-05"), 2)[0];
ok("a different value from an undated document is a conflict", cf.kind === "conflict");
ok("bulk confirm refuses a conflict", E.decide(c, R, [cf.id], "confirm", "agent").refused.length === 1);
// approvals: a change withdraws only the affected form/person
E.verify(c, R, "person.intended_job_title", "a", "Software engineer", { kind: "staff", by: "agent" }, "agent");
E.verify(c, R, "person.intended_job_title", "b", "Early childhood educator", { kind: "staff", by: "agent" }, "agent");
E.approve(c, R, "IMM 1295", "a", "consultant"); E.approve(c, R, "IMM 1295", "b", "consultant");
E.verify(c, R, "person.intended_job_title", "b", "Teacher", { kind: "staff", by: "agent" }, "agent");
ok("a changed fact withdraws only the approval whose values it changes", c.approvals.find((x) => x.person === "b")!.status === "withdrawn" && c.approvals.find((x) => x.person === "a")!.status === "approved");
ok("history kept: the earlier verified value is superseded, not deleted", c.facts.some((f) => f.fact === "person.intended_job_title" && f.about === "b" && f.status === "superseded" && f.value === "Early childhood educator"));

// Reader guard and isolation (AIW-D271)
const manifest = JSON.parse(readFileSync(join(P, "p5", "reader", "docs", "manifest.json"), "utf8"));
const d1m = manifest.items[0];
ok("an allowlisted synthetic document is admitted", admitDoc(d1m.file, d1m.sha256).sha256 === d1m.sha256);
ok("a document with another hash is refused", throws(() => admitDoc(d1m.file, "0".repeat(64))));
ok("a file outside the synthetic folder is refused", throws(() => admitDoc("../../p1/e5-family-values.json", "0".repeat(64))));
const tmp = mkdtempSync(join(tmpdir(), "p5t-")); copyFileSync(join(P, "p5", "reader", "docs", d1m.file), join(tmp, "x.png"));
ok("a file not on the allowlist is refused even with matching bytes", throws(() => admitDoc(join(tmp, "x.png"), d1m.sha256)));
const can = readerCanary();
ok("the screen covers the reader key, the case answers and the family values", can.key_values.includes("Z1234567") && can.family_values.includes("client.a@example.com") && can.family_values.includes("EXAMPLEP"));
ok("maker text naming a key value is refused", throws(() => screenText([{ name: "t", text: "the passport number is Z1234567" }], can)));
ok("maker text without values passes", !throws(() => screenText([{ name: "t", text: readFileSync(join(P, "p5", "reader", "prompts", "reader.v1.md"), "utf8") }], can)));
const direct = spawnSync(process.execPath, [join(P, "p5", "reader", "read.ts"), "--job", "reader-c1-comparison", "--run-id", "x", "--caller", "live"], { encoding: "utf8" });
ok("the reader process refuses to start outside the guarded launch path", direct.status === 2 && /not an isolated reader process/.test(direct.stdout), direct.stdout.trim().slice(0, 120));
// C7.7 (G25): an inverted yes/no box ("has any children" written as "hide child rows").
const INV = "derive_inverse:1 when the subject has no child records (hides child rows), 0 when any child exists";
{ const y = runTransform(INV, true, {}), n = runTransform(INV, false, {}), w = runTransform(INV, "No", {});
  ok("C7.7 pass: derive_inverse writes 0 when the fact is Yes and 1 when it is No (yes/no words too)", y.ok && y.value === "0" && n.ok && n.value === "1" && w.ok && w.value === "1"); }
{ const x = runTransform(INV, "two", {}), e = runTransform(INV, undefined, {});
  ok("C7.7 fail: derive_inverse on a value that is not yes/no goes by hand with its reason; a missing fact stays blank", !x.ok && "hand" in x && /yes\/no/.test(x.reason) && !e.ok && "blank" in e); }
// C7.7 (G25, the tech lead's ruling on #1317): release 2's drafted IMM 5645 map ticks each child's "accompany to Canada"
// Yes box with "check_if_yes:1/0" and its No box with "check_if_no:1/0": the first code when the answer is that one, the
// second otherwise. Only a yes/no value (yes/no words too); anything else by hand; a missing answer stays blank.
{ const yT = runTransform("check_if_yes:1/0", true, {}), yF = runTransform("check_if_yes:1/0", false, {}), nT = runTransform("check_if_no:1/0", true, {}), nF = runTransform("check_if_no:1/0", false, {}), w = runTransform("check_if_no:1/0", "No", {});
  ok("C7.7-16 pass (G25): check_if_yes:1/0 ticks the Yes box on Yes only, check_if_no:1/0 the No box on No only (yes/no words too)", yT.ok && yT.value === "1" && yF.ok && yF.value === "0" && nT.ok && nT.value === "0" && nF.ok && nF.value === "1" && w.ok && w.value === "1", JSON.stringify([yT, yF, nT, nF, w].map((o) => o.ok ? o.value : o.reason))); }
{ const x = runTransform("check_if_yes:1/0", "maybe", {}), e = runTransform("check_if_no:1/0", undefined, {}), u = runTransform("check_if_perhaps:1/0", true, {});
  ok("C7.7-16 fail (G25): check_if_yes/no on a value that is not yes/no goes by hand with its reason, a missing answer stays blank, and any other check_if_ word is still not executable", !x.ok && "hand" in x && /yes\/no/.test(x.reason) && !e.ok && "blank" in e && !u.ok && "hand" in u && /not in the executable set/.test(u.reason)); }
{ const cc = runTransform("phone:country_code_digits", { country_code: "+1", number: "416 555 0100" }, {}), nn = runTransform("phone:area_code_and_number", { country_code: "1", number: "416 555 0100" }, {});
  const none = runTransform("phone:area_code_and_number", { country_code: "1" }, {}), ctry = runTransform("country_name_text (max 255 characters)", "Canada", {}), long = runTransform("country_name_text (max 3 characters)", "Canada", {});
  ok("C7.7 pass (review M2): IMM 5476's phone boxes take the calling code's and the number's digits; a country name with its length limit is written", cc.ok && cc.value === "1" && nn.ok && nn.value === "4165550100" && ctry.ok && ctry.value === "Canada");
  ok("C7.7 fail (review M2): a phone with no number leaves that box blank; a country name longer than its box goes by hand (never truncated)", !none.ok && "blank" in none && !long.ok && "hand" in long); }
console.log(`${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
