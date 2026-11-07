// C7.6 part 1 checks (runtime lane, M3-A3; r5c BR-9, BR-21; L-SA3 under P-315, P-237, P-238; P-144, P-151, P-155): the pure
// "Ready to file" rules of engine/runtime/readiness.ts on Visitor visa shaped inputs (IMM 5257 on PDF upload, IMM 5476
// signed by hand and scanned, IMM 5707). Each rule has a passing and a failing case; a property checks that no input
// is ready while anything blocks or warns unpassed, that only a barcode form without its Validate blocks (P-237), and that no words carry a percentage. No database, no server, no model call (US$0).
//   tsx studio/tests/check_c76_readiness.ts
import fc from "fast-check";
import { BLOCK_CODES, cannotPass, isCritical, dayOf, filingReadiness, passKeys, passProblem, signatureNeeded, WARN_CODES, type Channel, type FilingInput, type FormItem, type Signature, type WarnCode } from "../engine/runtime/readiness.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const TODAY = "2026-11-01";
const clean = { ready: true, missing: [] };
/** A Visitor visa filing with everything done: no block, no warning. */
const i5257 = (o: Partial<FormItem> = {}): FormItem => ({ item: "i-5257", form: "IMM 5257", subject: "s-P", person: "Sample Client A", channel: "PDF_UPLOAD", readiness: clean, needsValidate: true, validatedCurrent: true, signature: "TYPED_NAME", signed: false, edition: { label: "IMM 5257 (10-2024)", superseded: false, acceptedUntil: null }, ...o });
const i5476 = (o: Partial<FormItem> = {}): FormItem => ({ item: "i-5476", form: "IMM 5476", subject: "s-P", person: "Sample Client A", channel: "PDF_UPLOAD", readiness: clean, needsValidate: false, validatedCurrent: false, signature: "HAND_SCANNED", signed: true, signers: ["Sample Client A"], ...o });
const done = (o: Partial<FilingInput> = {}): FilingInput => ({ filing: "f-1", forms: [i5257(), i5476()], documents: [{ item: "d-pass", label: "Passport", subject: "s-P", person: "Sample Client A", required: true, received: true }], reviewed: true, today: TODAY, ...o });
const codes = (x: { code: string }[]) => x.map((l) => l.code);
/** P-315 (P-237, P-238): the former blocks, now CRITICAL warnings passed with a reason. */
const crit = (x: { warns: { severity: string; code: string; owes: string; words: string; key: string; item?: string }[] }) => x.warns.filter((w) => w.severity === "critical");
const missingDoc = { documents: [{ item: "d-pass", label: "Passport", subject: "s-P", person: "Sample Client A", required: true, received: false }] };
/** A pass as the route will store it: the keys of the open lines of its code when it is written (passKeys). */
const pass = (x: FilingInput, code: WarnCode, reason = "Uploaded in the portal directly (Sample)", key?: string) => ({ code, keys: passKeys(filingReadiness(x), code, key), reason, by: "user-O", at: "2026-11-01T10:00:00Z" });

// Baseline.
let r = filingReadiness(done());
ok("C7.6 baseline pass: a filing with every fact confirmed, the validated copy read back, IMM 5476 signed and scanned, reviewed: ready, nothing open", r.ready && !r.blocks.length && !r.warns.length && !Object.keys(r.owes).length, r);

// P-71 missing facts, by who owes them.
r = filingReadiness(done({ forms: [i5257({ readiness: { ready: false, missing: [{ fact: "person.passport_number", label: "Passport number", about: "Sample Client A", reason: "not answered" }, { fact: "case.purpose", label: "Purpose of visit", about: "Case", reason: "not confirmed" }] }, owesFact: { "person.passport_number": "client" } }), i5476()] }));
ok("C7.6 P-71 fail: an unanswered and an unconfirmed fact on IMM 5257 are a CRITICAL warning \"missing facts\" (P-238), one line per owner (client, staff)", !r.ready && crit(r).filter((b) => b.code === "missing_facts").map((b) => b.owes).sort().join() === "client,staff" && crit(r).some((b) => b.code === "missing_facts" && /IMM 5257 for Sample Client A/.test(b.words) && /Passport number/.test(b.words)), crit(r));
ok("C7.6 P-71 pass: owes counts add up to the open lines", Object.values(r.owes).reduce((a, b) => a + (b ?? 0), 0) === r.blocks.length + r.warns.length, r.owes);
r = filingReadiness(done({ forms: [i5257({ readiness: { ready: false, missing: [{ fact: "person.date_of_birth", label: "Date of birth", about: "Sample Client A", reason: "needs a fix" }] } }), i5476()] }));
ok("C7.6 QA-122 fail: a fact with a problem is a CRITICAL warning \"fact_problem\" naming the form and the question, not as missing", codes(crit(r)).join() === "fact_problem" && /IMM 5257/.test(crit(r)[0].words) && /Date of birth/.test(crit(r)[0].words), crit(r));
r = filingReadiness(done({ openChecks: [{ fact: "person.passport_number", label: "Passport number", subject: "s-P", person: "Sample Client A" }] }));
ok("C7.6 BR-7 fail: an open check (answer and document differ) is a CRITICAL warning (P-238)", codes(crit(r)).join() === "open_check" && !r.ready, crit(r));

// BR-9 1: out of date; a required signature.
r = filingReadiness(done({ forms: [i5257(), i5476({ outOfDate: { fact: "Representative of record", since: "2026-11-01T09:00:00Z" } })] }));
ok("C7.6 BR-9 1 fail: a signed item whose facts changed after it is out of date, a CRITICAL warning (P-237), naming the fact and date", codes(crit(r)).join() === "out_of_date" && /Representative of record/.test(crit(r)[0].words) && /2026-11-01/.test(crit(r)[0].words), crit(r));
r = filingReadiness(done({ forms: [i5257(), i5476({ signed: false })] }));
ok("C7.6 BR-9 1 fail (P-136): IMM 5476 signed by hand and scanned, no scan: a CRITICAL \"missing signature\" (P-237), owed by the client, naming the signer", codes(crit(r)).join() === "missing_signature" && crit(r)[0].owes === "client" && /IMM 5476/.test(crit(r)[0].words) && /scan/.test(crit(r)[0].words), crit(r));
r = filingReadiness(done({ forms: [i5257({ signature: "TYPED_NAME", signed: false }), i5476()] }));
ok("C7.6 BR-9 1 pass: a typed name is no signature to wait for (IMM 5257 typed)", r.ready, crit(r));
r = filingReadiness(done({ forms: [i5257(), i5476({ signature: "PEN", signed: false, channel: "PAPER" })] }));
ok("C7.6 BR-9 1 fail: a line signed in pen with no signature warns CRITICAL too", codes(crit(r)).join() === "missing_signature" && /in pen/.test(crit(r)[0].words), crit(r));

// S1 (SA-1B-102 rule 3, AG16-60): a line whose signature is not set needs one; only "No signature" (signedBy none) means none.
// A new line has the schema's defaults: signature NONE (prisma combination_form @default(NONE)) and no signedBy.
const fresh = (o: Partial<FormItem> = {}) => i5476({ form: "IMM 5707", item: "i-5707", signature: "NONE", signed: false, signers: undefined, ...o });
r = filingReadiness(done({ forms: [i5257(), fresh()] }));
ok("S1 fail: a new PDF upload line (method not set, no signedBy) is never filed unsigned: \"missing signature\", saying how it is signed is not set", !r.ready && codes(crit(r)).join() === "missing_signature" && /IMM 5707/.test(crit(r)[0].words) && /not set/.test(crit(r)[0].words) && signatureNeeded({ channel: "PDF_UPLOAD", signature: "NONE" }), crit(r));
r = filingReadiness(done({ forms: [i5257(), fresh({ channel: "PAPER" })] }));
ok("S1 fail: the same on Paper", !r.ready && codes(crit(r)).join() === "missing_signature");
r = filingReadiness(done({ forms: [i5257(), fresh()] }));
ok("S1 review m3 pass: a signature whose method is not set is owed by staff (they set how it is signed); a named hand signature stays the client's", crit(r)[0]?.owes === "staff" && crit(filingReadiness(done({ forms: [i5257(), i5476({ signed: false })] })))[0]?.owes === "client", crit(r).map((b) => b.owes));
r = filingReadiness(done({ forms: [i5257(), fresh({ signedBy: "none" })] }));
ok("S1 pass: \"No signature\" chosen on the line (signedBy none) needs none", r.ready && !signatureNeeded({ channel: "PDF_UPLOAD", signature: "NONE", signedBy: "none" }), crit(r));
r = filingReadiness(done({ forms: [i5257(), fresh({ signed: true })] }));
ok("S1 pass: once signed, the unset line is ready", r.ready, crit(r));
r = filingReadiness(done({ forms: [i5257(), fresh({ channel: "ONLINE" })] }));
ok("S1 pass: an Online line with no method is signed in the portal at submission: not waited for", r.ready && !signatureNeeded({ channel: "ONLINE", signature: "NONE" }), crit(r));
ok("S1 pass: a hand or pen signature the line names is waited for even with signedBy none (duplicate beats a miss)", signatureNeeded({ channel: "PDF_UPLOAD", signature: "HAND_SCANNED", signedBy: "none" }) && signatureNeeded({ channel: "PAPER", signature: "PEN", signedBy: "none" }) && !signatureNeeded({ channel: "PDF_UPLOAD", signature: "TYPED_NAME" }));
try {
  fc.assert(fc.property(fc.constantFrom<Channel>("PDF_UPLOAD", "PAPER"), fc.constantFrom<string | null | undefined>(undefined, null, "person", "parent_for_minor", "principal_for_family", "person_and_representative"),
    (channel, signedBy) => !filingReadiness(done({ forms: [i5257(), fresh({ channel, signedBy })] })).ready), { numRuns: 200 });
  ok("S1 property: an unsigned PDF upload or Paper line whose method is not set is never ready, whoever signs it (unless \"No signature\")", true);
} catch (e) { ok("S1 property: an unsigned PDF upload or Paper line whose method is not set is never ready, whoever signs it (unless \"No signature\")", false, (e as Error).message.split("\n")[0]); }

// BR-9 2 (P-144): barcode forms on PDF upload or Paper.
r = filingReadiness(done({ forms: [i5257({ validatedCurrent: false }), i5476()] }));
ok("C7.6 BR-9 2 fail (P-144, VV-R18): IMM 5257 on PDF upload with no validated copy read back blocks", codes(r.blocks).join() === "barcode_not_validated" && /IMM 5257/.test(r.blocks[0].words), r.blocks);
r = filingReadiness(done({ forms: [i5257({ validatedCurrent: false, channel: "PAPER" }), i5476()] }));
ok("C7.6 BR-9 2 fail: the same on Paper", codes(r.blocks).join() === "barcode_not_validated");
r = filingReadiness(done({ forms: [i5257({ validatedCurrent: false, channel: "ONLINE" }), i5476()] }));
ok("C7.6 BR-9 2 pass: Online has no Validate (typed into the portal): no barcode block", !codes(r.blocks).includes("barcode_not_validated"), r.blocks);
r = filingReadiness(done({ forms: [i5257(), i5476({ validatedCurrent: false })] }));
ok("C7.6 BR-9 2 pass: a form without a barcode (IMM 5476) needs no validated copy", r.ready, crit(r));
r = filingReadiness(done({ forms: [i5257({ channel: "NOT_NEEDED", validatedCurrent: false, readiness: { ready: false, missing: [{ fact: "x", label: "X", about: "A", reason: "not answered" }] } }), i5476()] }));
ok("C7.6 BR-8 pass: a Not needed line (the portal asks it itself) blocks nothing", r.ready, crit(r));

// BR-9 3 (P-151): editions and fees.
r = filingReadiness(done({ forms: [i5257({ edition: { label: "IMM 5257 (06-2023)", superseded: true, acceptedUntil: "2026-11-11" } }), i5476()] }));
ok("C7.6 BR-9 3 pass (P-151): before the accepted-until date a superseded edition only warns, with \"Adopt update\"", !crit(r).length && codes(r.warns).join() === "edition_superseded" && /Adopt update/.test(r.warns[0].words) && !r.ready, r);
r = filingReadiness(done({ forms: [i5257({ edition: { label: "IMM 5257 (06-2023)", superseded: true, acceptedUntil: "2026-10-31" } }), i5476()] }));
ok("C7.6 BR-9 3 fail (P-151, P-237): after the accepted-until date it is a CRITICAL warning, not also \"Adopt update\", and no block", codes(r.warns).join() === "edition_expired" && r.warns[0].severity === "critical" && !r.blocks.length && !r.ready, r);
r = filingReadiness(done({ forms: [i5257({ edition: { label: "IMM 5257 (06-2023)", superseded: true, acceptedUntil: TODAY } }), i5476()] }));
ok("C7.6 BR-9 3 pass: on the accepted-until date itself it is still accepted (warns)", !crit(r).length && codes(r.warns).join() === "edition_superseded");
r = filingReadiness(done({ fees: [{ line: "Visitor visa fee (Sample)", acceptedUntil: "2026-10-01" }] }));
ok("C7.6 BR-9 3 fail: a fee past its valid-until date is a CRITICAL warning (P-237)", codes(crit(r)).join() === "edition_expired" && /Fee/.test(crit(r)[0].words));
r = filingReadiness(done({ fees: [{ line: "Visitor visa fee (Sample)", acceptedUntil: null }] }));
ok("C7.6 BR-9 3 pass: a fee with no end date blocks nothing", r.ready);

// Review M1: timestamps are read as their day; a value that is not a date is refused, never ignored.
r = filingReadiness(done({ forms: [i5257({ edition: { label: "IMM 5257 (06-2023)", superseded: true, acceptedUntil: "2026-10-01T00:00:00.000Z" } }), i5476()] }));
ok("C7.6 M1 fail: an accepted-until timestamp in the past is a CRITICAL warning (not \"Adopt update\")", codes(crit(r)).join() === "edition_expired", r);
r = filingReadiness(done({ forms: [i5257({ edition: { label: "IMM 5257 (06-2023)", superseded: true, acceptedUntil: `${TODAY}T00:00:00.000Z` } }), i5476()] }));
ok("C7.6 M1 pass: a timestamp on the accepted-until day itself still only warns", !crit(r).length && codes(r.warns).join() === "edition_superseded", r);
r = filingReadiness(done({ fees: [{ line: "Visitor visa fee (Sample)", acceptedUntil: "2026-10-01T12:00:00Z" }] }));
ok("C7.6 M1 fail: an expired fee given as a timestamp warns CRITICAL (it never disappears)", codes(crit(r)).join() === "edition_expired");
let threw = ""; try { filingReadiness(done({ fees: [{ line: "Visitor visa fee (Sample)", acceptedUntil: "1 Oct 2026" }] })); } catch (e) { threw = (e as Error).message; }
ok("C7.6 M1 fail: a date that is not YYYY-MM-DD is refused with its name, never ignored", /not a date/.test(threw) && /Visitor visa fee/.test(threw), threw);
let threw2 = ""; try { dayOf("2026-02-30", "a date"); } catch (e) { threw2 = (e as Error).message; }
ok("C7.6 r2 m4 fail: an impossible day (30 February) is refused", /not a date/.test(threw2), threw2);
r = filingReadiness(done({ forms: [i5257(), i5476({ outOfDate: { fact: "Passport number", since: "2026-10-31T22:00:00Z" } })] }));
ok("C7.6 r2 m5 pass: the out-of-date mark's time is shown as its day", /changed on 2026-10-31 /.test(crit(r)[0]?.words ?? ""), crit(r));
ok("C7.6 M1 pass: dayOf reads a date, a timestamp and null", dayOf("2026-11-01", "d") === "2026-11-01" && dayOf("2026-11-01T23:59:00+05:30", "d") === "2026-11-01" && dayOf(null, "d") === null);
// Review M4 (P-151 (1)): a fee no longer current warns before its date.
r = filingReadiness(done({ fees: [{ line: "Visitor visa fee (Sample)", superseded: true, acceptedUntil: "2026-12-01" }] }));
ok("C7.6 M4 pass: a superseded fee before its valid-until date warns with \"Adopt update\"", !crit(r).length && codes(r.warns).join() === "edition_superseded" && /Fee/.test(r.warns[0].words) && /Adopt update/.test(r.warns[0].words), r.warns);
r = filingReadiness(done({ forms: [i5257(), i5476({ signed: false, signerOwes: "representative" })] }));
ok("C7.6 signature pass: a missing signature is owed by whoever signs it (the representative's part of IMM 5476)", crit(r)[0]?.owes === "representative", crit(r));
r = filingReadiness(done({ reviewed: false, documents: missingDoc.documents }));
ok("C7.6 words pass: every block says it unblocks \"Ready to file and Record\"; every warning says it is passed with a reason or fixed", r.blocks.every((b) => b.unblocks === "Ready to file and Record") && r.warns.every((w) => /passed with a reason/.test(w.unblocks)));

// BR-9 4 (P-155, BR-21): the representative's review.
r = filingReadiness(done({ reviewed: false }));
ok("C7.6 BR-9 4 fail (P-155): the representative's review not done is a CRITICAL warning (P-237), owed by the representative", codes(crit(r)).join() === "representative_review" && crit(r)[0].owes === "representative" && r.owes.representative === 1, r);
// B149 (P-342, P-408): any firm staff may pass this warning with a reason, so its words say what happens; they never
// promise "Nothing reaches IRCC unreviewed" beside a "Pass with a reason" that lets it through.
ok("B149 C7.6 pass (P-342): the review warning says passing it needs a reason, kept in the history", crit(r)[0].words === "CRITICAL: The representative of record has not reviewed this filing. Passing it needs a reason, which is kept in the history.", crit(r)[0].words);
ok("B149 C7.6 fail: no readiness line says \"Nothing reaches IRCC unreviewed\"", ![...r.blocks, ...r.warns].some((l) => /Nothing reaches IRCC unreviewed/i.test(l.words)), crit(r)[0].words);

// Warnings and passes (AG-07 BR-26).
r = filingReadiness(done({ documents: [{ item: "d-pass", label: "Passport", subject: "s-P", person: "Sample Client A", required: true, received: false }] }));
ok("C7.6 warn fail: a missing document only warns (client), and the filing is not ready until it is passed", !r.blocks.length && codes(r.warns).join() === "missing_document" && r.warns[0].owes === "client" && !r.ready, r);
r = filingReadiness(done({ ...missingDoc, passes: [pass(done(missingDoc), "missing_document")] }));
ok("C7.6 warn pass: passed with a written reason, the warning moves to \"passed\" (who, when, why) and the filing is ready", r.ready && !r.warns.length && r.passed.length === 1 && r.passed[0].reason.includes("portal") && r.passed[0].by === "user-O", r);
r = filingReadiness(done({ ...missingDoc, passes: [pass(done(missingDoc), "missing_document", "ok")] }));
ok("C7.6 warn fail: a pass whose reason is too short does not count", !r.ready && codes(r.warns).join() === "missing_document");
r = filingReadiness(done({ ...missingDoc, passes: [pass(done(missingDoc), "missing_document", "Uploaded in the portal (Sample)", "d-other")] }));
ok("C7.6 warn fail: a pass for another item does not cover this one", !r.ready && r.warns.length === 1);
// Review M3: a pass covers what it named when written; a document that goes missing later needs its own pass.
const twoDocs = { documents: [...missingDoc.documents, { item: "d-photo", label: "Photo", subject: "s-P", person: "Sample Client A", required: true, received: false }] };
r = filingReadiness(done({ ...twoDocs, passes: [pass(done(missingDoc), "missing_document")] }));
ok("C7.6 M3 fail: a pass written while only the passport was missing does not cover the photo that went missing later", !r.ready && r.warns.length === 1 && r.warns[0].item === "d-photo" && r.passed.length === 1, r.warns);
const twoFindings = { findings: [{ id: "g1", severity: "CRITICAL" as const, form: "IMM 5257", words: "Name differs from the passport (Sample)" }, { id: "g2", severity: "MINOR" as const, form: "IMM 5257", words: "Phone format (Sample)" }] };
r = filingReadiness(done({ ...twoFindings, passes: [pass(done(twoFindings), "finding", "Phone format is IRCC's own (Sample)", "finding|g2")] }));
ok("C7.6 M3 pass and fail: a pass of one finding (by its key) covers that finding only; the CRITICAL one stays open", !r.ready && r.warns.length === 1 && r.warns[0].key === "finding|g1" && r.passed.map((x) => x.key).join() === "finding|g2", r);
r = filingReadiness(done({ reviewed: false, ...missingDoc, passes: [pass(done(missingDoc), "missing_document")] }));
ok("C7.6 P-315 pass kept: passing the missing document leaves the review's CRITICAL warning open (each line needs its own pass)", !r.ready && codes(crit(r)).join() === "representative_review");
r = filingReadiness(done({ forms: [i5257({ validatedCurrent: false }), i5476()], ...missingDoc, passes: [pass(done(missingDoc), "missing_document")] }));
ok("C7.6 P-237 block kept: passing every warning never clears the barcode block", !r.ready && codes(r.blocks).join() === "barcode_not_validated" && !r.warns.length);
r = filingReadiness(done({ findings: [{ id: "g1", severity: "CRITICAL", form: "IMM 5257", words: "Name differs from the passport (Sample)" }] }));
ok("C7.6 C7.5-8 fail: an AI or rules finding, even CRITICAL, only warns", !r.blocks.length && codes(r.warns).join() === "finding" && /CRITICAL/.test(r.warns[0].words));
r = filingReadiness(done({ forms: [i5257({ channel: "ONLINE", copyStale: true, enteredOutOfDate: ["Personal details"] }), i5476()] }));
ok("C7.6 warn fail: on an Online line a stale PDF copy and an entered section out of date warn", codes(r.warns).sort().join() === "copy_stale,entered_out_of_date" && !r.blocks.length, r.warns);
const online = (secs: string[]) => [i5257({ channel: "ONLINE", enteredOutOfDate: secs }), i5476()];
r = filingReadiness(done({ forms: online(["Personal details", "Travel history"]), passes: [pass(done({ forms: online(["Personal details"]) }), "entered_out_of_date")] }));
ok("C7.6 r2 m2 fail: a pass for one entered section does not cover another that went out of date later", !r.ready && r.warns.length === 1 && /Travel history/.test(r.warns[0].words) && r.passed.length === 1, r.warns);
const noItem = (labels: string[]) => ({ documents: labels.map((label) => ({ label, subject: "s-P", person: "Sample Client A", required: true, received: false })) });
r = filingReadiness(done({ ...noItem(["Passport", "Photo"]), passes: [pass(done(noItem(["Passport"])), "missing_document")] }));
ok("C7.6 r2 m1 fail: documents without an item id are keyed by their label, so passing the passport leaves the photo open", !r.ready && r.warns.length === 1 && /Photo/.test(r.warns[0].words), r.warns);
r = filingReadiness(done({ forms: [i5257({ readiness: { ready: false, missing: [{ fact: "a", label: "A", about: "x", reason: "not answered" }, { fact: "b", label: "B", about: "x", reason: "needs a fix" }, { fact: "c", label: "C", about: "x", reason: "needs a fix" }] } }), i5476()] }));
ok("C7.6 r2 m3 pass: every line keeps the form item's own id in item (the prepare view links by it); keys tell lines apart", crit(r).every((b) => b.item === "i-5257") && new Set(crit(r).map((b) => b.key)).size === crit(r).length && crit(r).length === 3, crit(r).map((b) => [b.item, b.key]));
r = filingReadiness(done({ forms: [i5257({ copyStale: true }), i5476()] }));
ok("C7.6 warn pass: a PDF upload line has no \"PDF copy\" warning (its own copy is checked by Validate)", r.ready);

ok("C7.6 pass rules (P-237): the barcode block cannot be passed, in people's words (no internal key); a warning code can, CRITICAL ones too; an unknown code is refused", /validated copy/.test(cannotPass("barcode_not_validated") ?? "") && !/barcode_not_validated|nope/.test(`${cannotPass("barcode_not_validated")}${cannotPass("nope")}`) && cannotPass("missing_document") === null && cannotPass("representative_review") === null && cannotPass("missing_facts") === null && !!cannotPass("nope"));
ok("C7.6 pass rules: a reason of fewer than 5 characters, or none, is refused; a written one is accepted", !!passProblem("") && !!passProblem(undefined) && !!passProblem("abc") && !!passProblem("   ab   ") && passProblem("Passport uploaded in the portal (Sample)") === null && passProblem(`  ${"x".repeat(299)}  `) === null && !!passProblem("x".repeat(301)));

// Order: blocks and warnings are listed by who owes them (You · Representative · Client …).
r = filingReadiness(done({ reviewed: false, forms: [i5257({ validatedCurrent: false }), i5476({ signed: false })] }));
ok("C7.6 order pass: the block (staff), then the CRITICAL warnings by who owes them: the representative, then the client", [...r.blocks, ...r.warns].map((b) => b.owes).join() === "staff,representative,client", [...r.blocks, ...r.warns].map((b) => b.code));

// Properties: never ready with a block; no percentage anywhere; every line has words and a known code.
// Review r4 A: a missing today is refused, never read as "not expired" (P-151, never fail open).
{ const x = done({ forms: [i5257({ edition: { label: "IMM 5257 (06-2023)", superseded: false, acceptedUntil: "2026-10-01" } }), i5476()] }); delete (x as { today?: string }).today;
  let threw = false; try { filingReadiness(x); } catch { threw = true; }
  ok("C7.6 r4 A fail: with no today an expired edition is not passed as ready (refused)", threw); }
// Review r4 B: a pass on one edition or fee amount never covers a later, different one (AG-07 BR-26).
{ const ed = (label: string) => done({ forms: [i5257({ edition: { label, superseded: true, acceptedUntil: "2026-12-31" } }), i5476()] });
  const a = filingReadiness(ed("IMM 5257 (01-2024)")), keys = passKeys(a, "edition_superseded");
  const passes = [{ code: "edition_superseded" as WarnCode, keys, reason: "Client files this week", by: "user-a", at: "2026-11-01" }];
  ok("C7.6 r4 B pass: the passed edition is covered", filingReadiness({ ...ed("IMM 5257 (01-2024)"), passes }).warns.length === 0);
  ok("C7.6 r4 B fail: a newer superseded edition is open again, not covered by the old pass", codes(filingReadiness({ ...ed("IMM 5257 (06-2026)"), passes }).warns).join() === "edition_superseded");
  const fee = (amount: string) => done({ fees: [{ line: "Visitor visa fee (Sample)", amount, superseded: true, acceptedUntil: "2026-12-01" }] });
  const fk = passKeys(filingReadiness(fee("CAD 100")), "edition_superseded"), fp = [{ ...passes[0], keys: fk }];
  ok("C7.6 r4 B fail: a pass on one fee amount does not cover the next amount", filingReadiness({ ...fee("CAD 100"), passes: fp }).warns.length === 0 && codes(filingReadiness({ ...fee("CAD 120"), passes: fp }).warns).join() === "edition_superseded"); }
// Review r4 m2/m3: the reason follows the contract's rule; two open checks on one person have their own keys.
ok("C7.6 r4 m2 fail: a reason of only marks, or over 300 characters, is refused", !!passProblem(".....") && !!passProblem("a".repeat(301)) && passProblem("Client files this week") === null);
{ const r2 = filingReadiness(done({ openChecks: [{ fact: "dob", label: "Date of birth", subject: "s-P", person: "A" }, { fact: "name", label: "Name", subject: "s-P", person: "A" }] }));
  const k = crit(r2).filter((b) => b.code === "open_check").map((b) => b.key); ok("C7.6 r4 m3: two open checks on one person have distinct keys", k.length === 2 && k[0] !== k[1], k); }

// P-315 (L-SA3; P-237, P-238): a CRITICAL warning is passed like any warning, with a reason, and the filing can then be
// marked ready; a pass written for two missing facts never covers a third that goes missing later.
{ const gaps = (facts: string[]) => done({ reviewed: false, forms: [i5257({ readiness: { ready: false, missing: facts.map((f) => ({ fact: f, label: f, about: "Sample Client A", reason: "not answered" as const })) } }), i5476()] });
  const x = gaps(["person.a", "person.b"]), rr = filingReadiness(x);
  const passes = [pass(x, "missing_facts", "Client confirms by phone today (Sample)"), pass(x, "representative_review", "Representative away; senior officer read it (Sample)")];
  const after = filingReadiness({ ...x, passes });
  ok("C7.6 P-315 pass: missing facts and no review are CRITICAL warnings, never blocks; passed with reasons, the filing is ready", !rr.blocks.length && codes(crit(rr)).sort().join() === "missing_facts,representative_review" && after.ready && after.passed.length === 2 && after.passed.every((p) => p.severity === "critical"), after);
  const later = filingReadiness({ ...gaps(["person.a", "person.b", "person.c"]), passes });
  ok("C7.6 P-315 fail: a pass for two missing facts does not cover a third that went missing later", !later.ready && codes(later.warns).join() === "missing_facts" && /3 facts/.test(later.warns[0].words), later.warns); }
r = filingReadiness(done({ reviewed: false, forms: [i5257({ readiness: { ready: false, missing: [{ fact: "x", label: "X", about: "A", reason: "not answered" }] } }), i5476({ signed: false, outOfDate: { fact: "Passport number", since: "2026-10-30" } })], openChecks: [{ fact: "dob", label: "Date of birth", subject: "s-P", person: "A" }], fees: [{ line: "Fee (Sample)", acceptedUntil: "2026-10-01" }] }));
ok("C7.6 P-315 pass: every former block is a CRITICAL warning whose words say CRITICAL; nothing blocks (the barcode copy is in)", !r.blocks.length && codes(crit(r)).sort().join() === "edition_expired,missing_facts,missing_signature,open_check,out_of_date,representative_review" && crit(r).every((w) => /^CRITICAL: /.test(w.words)) && r.warns.filter((w) => w.severity !== "critical").length === 0, r);

// Break B2 (#861): a review made before the facts changed, or by an earlier representative, no longer counts; the warning
// says so, and a pass written for "not reviewed" does not cover "reviewed before a change".
{ const x = done({ reviewed: false, reviewedBefore: "2026-10-30T10:00:00Z" }), rr = filingReadiness(x);
  ok("C7.6 B2 fail: a review made before the facts changed reopens the CRITICAL review warning, naming its day", codes(crit(rr)).join() === "representative_review" && /2026-10-30/.test(crit(rr)[0].words) && /again/.test(crit(rr)[0].words), rr.warns);
  const p0 = pass(done({ reviewed: false }), "representative_review", "Representative away; senior officer read it (Sample)");
  ok("C7.6 B2 fail: a pass for \"not reviewed\" does not cover \"reviewed before a change\"", !filingReadiness({ ...x, passes: [p0] }).ready); }
// Break B5 (#861): hidden characters do not count towards a reason's 5 characters.
ok("C7.6 B5 fail: one letter followed by joiners, soft hyphens, tags or blanks is not a reason", ["a\u2060\u2060\u2060\u2060\u2060", "a\u200d\u200d\u200d\u200d", "a\u00ad\u00ad\u00ad\u00ad", "a\u034f\u034f\u034f\u034f", "a\u180e\u180e\u180e\u180e", "a\u2800\u2800\u2800\u2800", "a\u{e0041}\u{e0041}\u{e0041}\u{e0041}"].every((r) => !!passProblem(r)) && passProblem("नमस्ते दुनिया") === null && passProblem("Клиент подтвердил") === null);
ok("C7.6 B5 round 2 fail: a letter with stacked accents is one character; a reason with a word joiner, soft hyphen or tag inside is refused; the joiners scripts need stay", !!passProblem("a\u0301\u0301\u0301\u0301\u0301") && !!passProblem("Client\u2060 confirms") && !!passProblem("Client con\u00adfirms") && !!passProblem("Client confirms\u{e0041}") && passProblem("क्\u200dष ठीक है") === null);

const form = fc.record({ needsValidate: fc.boolean(), validatedCurrent: fc.boolean(), signed: fc.boolean(), channel: fc.constantFrom<Channel>("ONLINE", "PDF_UPLOAD", "PAPER", "NOT_NEEDED"), signature: fc.constantFrom<Signature>("TYPED_NAME", "HAND_SCANNED", "PEN", "NONE"), reason: fc.constantFrom<null | "not answered" | "not confirmed" | "needs a fix">(null, "not answered", "not confirmed", "needs a fix"), until: fc.constantFrom(null, "2026-10-31", "2026-11-01", "2026-12-01"), superseded: fc.boolean(), stale: fc.boolean() });
const input = (fs: { needsValidate: boolean; validatedCurrent: boolean; signed: boolean; channel: Channel; signature: Signature; reason: null | "not answered" | "not confirmed" | "needs a fix"; until: string | null; superseded: boolean; stale: boolean }[], reviewed: boolean, docMissing: boolean): FilingInput => ({ filing: "f", reviewed, today: TODAY, documents: [{ label: "Passport", subject: "s", person: "Sample Client A", required: true, received: !docMissing }],
    forms: fs.map((f, i) => ({ item: `i${i}`, form: `IMM ${5257 + i}`, subject: "s", person: "Sample Client A", channel: f.channel, signature: f.signature, signed: f.signed, needsValidate: f.needsValidate, validatedCurrent: f.validatedCurrent, copyStale: f.stale,
      readiness: f.reason ? { ready: false, missing: [{ fact: "x", label: "X", about: "A", reason: f.reason }] } : clean, edition: { label: "E", superseded: f.superseded, acceptedUntil: f.until } })) });
// A form that needs anything at all (a fact, a signature, a validated copy, a newer edition) never lets the filing be ready.
const needsWork = (f: { channel: Channel; reason: unknown; signature: Signature; signed: boolean; needsValidate: boolean; validatedCurrent: boolean; until: string | null; superseded: boolean; stale: boolean }) => f.channel !== "NOT_NEEDED"
  && (!!f.reason || ((f.signature === "HAND_SCANNED" || f.signature === "PEN") && !f.signed) || (f.signature === "NONE" && (f.channel === "PDF_UPLOAD" || f.channel === "PAPER") && !f.signed) || (f.needsValidate && f.channel !== "ONLINE" && !f.validatedCurrent) || f.superseded || (!!f.until && TODAY > f.until) || (f.channel === "ONLINE" && f.stale));
try { fc.assert(fc.property(fc.array(form, { maxLength: 4 }), fc.boolean(), fc.boolean(), (fs, reviewed, docMissing) => filingReadiness(input(fs, reviewed, docMissing)).ready === (reviewed && !docMissing && !fs.some(needsWork))), { numRuns: 600 }); ok("C7.6 property: ready exactly when reviewed, the passport is in and no form needs anything (an independent statement of the rules)", true); }
catch (e) { ok("C7.6 property: ready exactly when reviewed, the passport is in and no form needs anything (an independent statement of the rules)", false, (e as Error).message.split("\n").slice(0, 3).join(" ")); }
const prop = (name: string, p: (r: ReturnType<typeof filingReadiness>) => boolean) => {
  try { fc.assert(fc.property(fc.array(form, { maxLength: 4 }), fc.boolean(), fc.boolean(), (fs, reviewed, docMissing) => p(filingReadiness(input(fs, reviewed, docMissing)))), { numRuns: 400 }); ok(name, true); }
  catch (e) { ok(name, false, (e as Error).message.split("\n").slice(0, 3).join(" ")); }
};
prop("C7.6 property: a filing is never ready while it has a block or an unpassed warning", (x) => x.ready === (x.blocks.length === 0 && x.warns.length === 0));
prop("C7.6 property: never a percentage; every line has words, a known code and an owner", (x) => !/%/.test(JSON.stringify(x)) && [...x.blocks, ...x.warns].every((l) => l.words.length > 10 && !!l.owes && ([...BLOCK_CODES, ...WARN_CODES] as string[]).includes(l.code)));
prop("C7.6 property (P-237): the only block is a barcode form without its validated copy; every former block is CRITICAL", (x) => x.blocks.every((b) => b.code === "barcode_not_validated" && b.severity === "block") && x.warns.every((w) => w.severity === (isCritical(w.code) ? "critical" : "warning")));
prop("C7.6 property: owes counts add up to the open lines", (x) => Object.values(x.owes).reduce((a, b) => a + (b ?? 0), 0) === x.blocks.length + x.warns.length);


// C9.2 (bot review on #926): an out-of-date mark's pass covers only the changes it was given for.
{
  const mark = (key: string) => i5476({ outOfDate: { fact: "Family name", since: "2026-11-01T09:00:00Z", key } });
  const r1 = filingReadiness(done({ forms: [i5257(), mark("k1")] }));
  const w1 = r1.warns.find((w) => w.code === "out_of_date");
  const passed = [{ code: "out_of_date", keys: [w1!.key], reason: "The copy filed is the one the representative checked (Sample)", by: "user-R", at: "2026-11-01T10:00:00Z" }];
  const same = filingReadiness(done({ forms: [i5257(), mark("k1")], passes: passed as never }));
  const later = filingReadiness(done({ forms: [i5257(), mark("k2")], passes: passed as never }));
  ok("C9.2 (bot review on #926): a pass of an out-of-date mark holds while its changes are the same", !same.warns.some((w) => w.code === "out_of_date"), same.warns.map((w) => w.code));
  ok("C9.2 (bot review on #926, fail): a later change on the same day is a new out-of-date line, not covered by the old pass", later.warns.some((w) => w.code === "out_of_date") && w1!.key !== later.warns.find((w) => w.code === "out_of_date")!.key, later.warns.map((w) => w.key));
}
process.exitCode = summary() ? 1 : 0;
