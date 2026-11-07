// C8.2 filing record, slice 1 (runtime lane): the application-number rules of engine/runtime/filing-record.ts, each with a
// passing and a failing case, on the team's own AG-7-95 examples (Sample pattern, samples/filing-numbers.json). No
// database (US$0).
//   tsx studio/tests/check_c82_filing_numbers.ts
import { readFileSync } from "node:fs";
import { checkApplicationNumber, duplicateWarning, normaliseNumber, type NumberRule } from "../engine/runtime/filing-record.ts";
import fc from "fast-check";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const rule = (JSON.parse(readFileSync(new URL("../samples/filing-numbers.json", import.meta.url), "utf8")) as { basis: string; applicationNumber: NumberRule }).applicationNumber;
const basis = (JSON.parse(readFileSync(new URL("../samples/filing-numbers.json", import.meta.url), "utf8")) as { basis: string }).basis;
const v = (raw: string | null) => checkApplicationNumber(raw, rule);

ok("C8.2 AG-7-95 r1: stored upper-case with spaces and hyphens removed (w123456789 → W123456789)", normaliseNumber(" w12-345 6789 ") === "W123456789" && JSON.stringify(v("w123456789")) === JSON.stringify({ value: "W123456789" }));
ok("C8.2 AG-7-95 r1: two letters and 8 digits is accepted (EP12345678)", JSON.stringify(v("EP12345678")) === JSON.stringify({ value: "EP12345678" }));
ok("C8.2 AG-7-95 r1 (fail): a form code, 7 digits or 10 digits is refused with the shape and an example", ["IMM5476", "W1234567", "AB1234567890", "123456789"].every((x) => "error" in v(x) && /W123456789/.test((v(x) as { error: string }).error)));
ok("C8.2 (breaker m5) fail: letters of another script are refused, never upper-cased into plain ones (ſ, ı, ﬀ, fullwidth)", ["ſ123456789", "ı123456789", "ﬀ12345678", "Ｗ123456789"].every((x) => "error" in v(x)));
ok("C8.2 (breaker m4): a valid number padded with spaces is taken; a longer run of digits than the pattern allows is refused by the pattern", JSON.stringify(v("  W12345678" + " ".repeat(50))) === JSON.stringify({ value: "W12345678" }) && "error" in v("W" + "1".repeat(25)));
// STANDARDS §7 [M] (engine changed): property-based checks over generated numbers, as Devin asked on #553.
const letter = fc.constantFrom(..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"), digit = fc.constantFrom(..."0123456789"), sep = fc.constantFrom("", " ", "-", "  ", " - ", "\t");
const valid = fc.tuple(fc.array(letter, { minLength: 1, maxLength: 2 }), fc.array(digit, { minLength: 8, maxLength: 9 })).map(([l, d]) => l.join("") + d.join(""));
const noisy = (n: string, seps: string[], lower: boolean[]) => [...n].map((ch, i) => (lower[i] ? ch.toLowerCase() : ch) + seps[i % seps.length]).join("");
ok("C8.2 (breaker R2-m1): hyphens and dashes pasted from a PDF (‐ ‑ – — − and the soft hyphen) are removed like the keyboard hyphen", ["W12\u2010345\u20116789", "W12\u2013345\u20146789", "W12\u2212345\u00AD6789"].every((x) => JSON.stringify(v(x)) === JSON.stringify({ value: "W123456789" })));
ok("C8.2 property: every valid number, written in any case with spaces, tabs or hyphens anywhere, is taken and stored as the bare upper-case number", (() => { try { fc.assert(fc.property(valid, fc.array(sep, { minLength: 1, maxLength: 11 }), fc.array(fc.boolean(), { minLength: 11, maxLength: 11 }), (n, seps, lower) => JSON.stringify(v(noisy(n, seps, lower))) === JSON.stringify({ value: n })), { numRuns: 500 }); return true; } catch { return false; } })());
ok("C8.2 property (fail): a valid number with any non-ASCII character inside is always refused, never quietly changed", (() => { try { fc.assert(fc.property(valid, fc.nat(10), fc.string({ unit: "grapheme", minLength: 1, maxLength: 1 }).filter((c) => /[^\x00-\x7F]/.test(c) && !/^[\s\u2010-\u2015\u2212\u00AD]$/u.test(c)), (n, at, ch) => "error" in v(n.slice(0, at) + ch + n.slice(at))), { numRuns: 500 }); return true; } catch { return false; } })());
ok("C8.2 property: whatever is taken is upper-case ASCII that matches the pattern (nothing else is ever stored)", (() => { try { fc.assert(fc.property(fc.string({ maxLength: 30 }), (x) => { const r = v(x); return "error" in r || r.value === null || (/^[\x21-\x7E]+$/.test(r.value) && r.value === r.value.toUpperCase() && new RegExp(rule.pattern).test(r.value)); }), { numRuns: 1000 }); return true; } catch { return false; } })());
ok("C8.2: nothing, null or blanks clears the number", JSON.stringify(v(null)) === JSON.stringify({ value: null }) && JSON.stringify(v("   ")) === JSON.stringify({ value: null }));
ok("C8.2 AG-7-95 r4: the same number on another filing names its case (a warning, never a refusal)", duplicateWarning([{ reference: "C-1" }, { reference: "C-1" }]) === "Already on case C-1.");
ok("C8.2 AG-7-95 r4 (fail): no other filing, no warning", duplicateWarning([]) === null);
ok("C8.2 (AGENTS rule 4): the pattern is labelled Sample, from the team's requirement, not IRCC", /^Sample: the team's requirement AG-07/.test(basis));
process.exitCode = summary() ? 1 : 0; // B160: a red line fails the suite (run-suites.sh judges the exit code; before, it always exited 0)
