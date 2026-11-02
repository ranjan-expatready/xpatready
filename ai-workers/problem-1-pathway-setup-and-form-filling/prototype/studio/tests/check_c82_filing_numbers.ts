// C8.2 filing record, slice 1 (runtime lane): the application-number rules of engine/runtime/filing-record.ts, each with a
// passing and a failing case, on the team's own AG-7-95 examples (Sample pattern, samples/filing-numbers.json). No
// database (US$0).
//   tsx studio/tests/check_c82_filing_numbers.ts
import { readFileSync } from "node:fs";
import { checkApplicationNumber, duplicateWarning, normaliseNumber, type NumberRule } from "../engine/runtime/filing-record.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const rule = (JSON.parse(readFileSync(new URL("../samples/filing-numbers.json", import.meta.url), "utf8")) as { basis: string; applicationNumber: NumberRule }).applicationNumber;
const basis = (JSON.parse(readFileSync(new URL("../samples/filing-numbers.json", import.meta.url), "utf8")) as { basis: string }).basis;
const v = (raw: string | null) => checkApplicationNumber(raw, rule);

ok("C8.2 AG-7-95 r1: stored upper-case with spaces and hyphens removed (w123456789 → W123456789)", normaliseNumber(" w12-345 6789 ") === "W123456789" && JSON.stringify(v("w123456789")) === JSON.stringify({ value: "W123456789" }));
ok("C8.2 AG-7-95 r1: two letters and 8 digits is accepted (EP12345678)", JSON.stringify(v("EP12345678")) === JSON.stringify({ value: "EP12345678" }));
ok("C8.2 AG-7-95 r1 (fail): a form code, 7 digits or 10 digits is refused with the shape and an example", ["IMM5476", "W1234567", "AB1234567890", "123456789"].every((x) => "error" in v(x) && /W123456789/.test((v(x) as { error: string }).error)));
ok("C8.2 (breaker m5) fail: letters of another script are refused, never upper-cased into plain ones (ſ, ı, ﬀ, fullwidth)", ["ſ123456789", "ı123456789", "ﬀ12345678", "Ｗ123456789"].every((x) => "error" in v(x)));
ok("C8.2 (breaker m4): a valid number padded with spaces is taken; more than 20 characters of it is refused", JSON.stringify(v("  W12345678" + " ".repeat(50))) === JSON.stringify({ value: "W12345678" }) && "error" in v("W" + "1".repeat(25)));
ok("C8.2: nothing, null or blanks clears the number", JSON.stringify(v(null)) === JSON.stringify({ value: null }) && JSON.stringify(v("   ")) === JSON.stringify({ value: null }));
ok("C8.2 AG-7-95 r4: the same number on another filing names its case (a warning, never a refusal)", duplicateWarning([{ reference: "C-1" }, { reference: "C-1" }]) === "Already on case C-1.");
ok("C8.2 AG-7-95 r4 (fail): no other filing, no warning", duplicateWarning([]) === null);
ok("C8.2 (AGENTS rule 4): the pattern is labelled Sample, from the team's requirement, not IRCC", /^Sample: the team's requirement AG-07/.test(basis));
summary();
