// C7.6 part 1 checks (runtime lane, M3-A3; r5c BR-9, BR-21; P-71, P-136, P-144, P-151, P-155, P-168): the pure
// "Ready to file" rules of engine/runtime/readiness.ts on Visitor visa shaped inputs (IMM 5257 on PDF upload, IMM 5476
// signed by hand and scanned, IMM 5707). Each rule has a passing and a failing case; a property checks that no input
// is ready while anything blocks, and that no words carry a percentage. No database, no server, no model call (US$0).
//   tsx studio/tests/check_c76_readiness.ts
import fc from "fast-check";
import { BLOCK_CODES, cannotPass, dayOf, filingReadiness, passKeys, passProblem, WARN_CODES, type Channel, type FilingInput, type FormItem, type Signature, type WarnCode } from "../engine/runtime/readiness.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const TODAY = "2026-11-01";
const clean = { ready: true, missing: [] };
/** A Visitor visa filing with everything done: no block, no warning. */
const i5257 = (o: Partial<FormItem> = {}): FormItem => ({ item: "i-5257", form: "IMM 5257", subject: "s-P", person: "Sample Client A", channel: "PDF_UPLOAD", readiness: clean, needsValidate: true, validatedCurrent: true, signature: "TYPED_NAME", signed: false, edition: { label: "IMM 5257 (10-2024)", superseded: false, acceptedUntil: null }, ...o });
const i5476 = (o: Partial<FormItem> = {}): FormItem => ({ item: "i-5476", form: "IMM 5476", subject: "s-P", person: "Sample Client A", channel: "PDF_UPLOAD", readiness: clean, needsValidate: false, validatedCurrent: false, signature: "HAND_SCANNED", signed: true, signers: ["Sample Client A"], ...o });
const done = (o: Partial<FilingInput> = {}): FilingInput => ({ filing: "f-1", forms: [i5257(), i5476()], documents: [{ item: "d-pass", label: "Passport", subject: "s-P", person: "Sample Client A", required: true, received: true }], reviewed: true, today: TODAY, ...o });
const codes = (x: { code: string }[]) => x.map((l) => l.code);
const missingDoc = { documents: [{ item: "d-pass", label: "Passport", subject: "s-P", person: "Sample Client A", required: true, received: false }] };
/** A pass as the route will store it: the keys of the open lines of its code when it is written (passKeys). */
const pass = (x: FilingInput, code: WarnCode, reason = "Uploaded in the portal directly (Sample)", key?: string) => ({ code, keys: passKeys(filingReadiness(x), code, key), reason, by: "user-O", at: "2026-11-01T10:00:00Z" });

// Baseline.
let r = filingReadiness(done());
ok("C7.6 baseline pass: a filing with every fact confirmed, the validated copy read back, IMM 5476 signed and scanned, reviewed: ready, nothing open", r.ready && !r.blocks.length && !r.warns.length && !Object.keys(r.owes).length, r);

// P-71 missing facts, by who owes them.
r = filingReadiness(done({ forms: [i5257({ readiness: { ready: false, missing: [{ fact: "person.passport_number", label: "Passport number", about: "Sample Client A", reason: "not answered" }, { fact: "case.purpose", label: "Purpose of visit", about: "Case", reason: "not confirmed" }] }, owesFact: { "person.passport_number": "client" } }), i5476()] }));
ok("C7.6 P-71 fail: an unanswered and an unconfirmed fact on IMM 5257 block with \"missing facts\", one line per owner (client, staff)", !r.ready && r.blocks.filter((b) => b.code === "missing_facts").map((b) => b.owes).sort().join() === "client,staff" && r.blocks.some((b) => b.code === "missing_facts" && /IMM 5257 for Sample Client A/.test(b.words) && /Passport number/.test(b.words)), r.blocks);
ok("C7.6 P-71 pass: owes counts add up to the open lines", Object.values(r.owes).reduce((a, b) => a + (b ?? 0), 0) === r.blocks.length + r.warns.length, r.owes);
r = filingReadiness(done({ forms: [i5257({ readiness: { ready: false, missing: [{ fact: "person.date_of_birth", label: "Date of birth", about: "Sample Client A", reason: "needs a fix" }] } }), i5476()] }));
ok("C7.6 QA-122 fail: a fact with a problem blocks as \"fact_problem\" naming the form and the question, not as missing", codes(r.blocks).join() === "fact_problem" && /IMM 5257/.test(r.blocks[0].words) && /Date of birth/.test(r.blocks[0].words), r.blocks);
r = filingReadiness(done({ openChecks: [{ fact: "person.passport_number", label: "Passport number", subject: "s-P", person: "Sample Client A" }] }));
ok("C7.6 BR-7 fail: an open check (answer and document differ) blocks", codes(r.blocks).join() === "open_check" && !r.ready, r.blocks);

// BR-9 1: out of date; a required signature.
r = filingReadiness(done({ forms: [i5257(), i5476({ outOfDate: { fact: "Representative of record", since: "2026-11-01T09:00:00Z" } })] }));
ok("C7.6 BR-9 1 fail: a signed item whose facts changed after it is out of date and blocks, naming the fact and date", codes(r.blocks).join() === "out_of_date" && /Representative of record/.test(r.blocks[0].words) && /2026-11-01/.test(r.blocks[0].words), r.blocks);
r = filingReadiness(done({ forms: [i5257(), i5476({ signed: false })] }));
ok("C7.6 BR-9 1 fail (P-136): IMM 5476 signed by hand and scanned, no scan: \"missing signature\", owed by the client, naming the signer", codes(r.blocks).join() === "missing_signature" && r.blocks[0].owes === "client" && /IMM 5476/.test(r.blocks[0].words) && /scan/.test(r.blocks[0].words), r.blocks);
r = filingReadiness(done({ forms: [i5257({ signature: "TYPED_NAME", signed: false }), i5476()] }));
ok("C7.6 BR-9 1 pass: a typed name is no signature to wait for (IMM 5257 typed)", r.ready, r.blocks);
r = filingReadiness(done({ forms: [i5257(), i5476({ signature: "PEN", signed: false, channel: "PAPER" })] }));
ok("C7.6 BR-9 1 fail: a line signed in pen with no signature blocks too", codes(r.blocks).join() === "missing_signature" && /in pen/.test(r.blocks[0].words), r.blocks);

// BR-9 2 (P-144): barcode forms on PDF upload or Paper.
r = filingReadiness(done({ forms: [i5257({ validatedCurrent: false }), i5476()] }));
ok("C7.6 BR-9 2 fail (P-144, VV-R18): IMM 5257 on PDF upload with no validated copy read back blocks", codes(r.blocks).join() === "barcode_not_validated" && /IMM 5257/.test(r.blocks[0].words), r.blocks);
r = filingReadiness(done({ forms: [i5257({ validatedCurrent: false, channel: "PAPER" }), i5476()] }));
ok("C7.6 BR-9 2 fail: the same on Paper", codes(r.blocks).join() === "barcode_not_validated");
r = filingReadiness(done({ forms: [i5257({ validatedCurrent: false, channel: "ONLINE" }), i5476()] }));
ok("C7.6 BR-9 2 pass: Online has no Validate (typed into the portal): no barcode block", !codes(r.blocks).includes("barcode_not_validated"), r.blocks);
r = filingReadiness(done({ forms: [i5257(), i5476({ validatedCurrent: false })] }));
ok("C7.6 BR-9 2 pass: a form without a barcode (IMM 5476) needs no validated copy", r.ready, r.blocks);
r = filingReadiness(done({ forms: [i5257({ channel: "NOT_NEEDED", validatedCurrent: false, readiness: { ready: false, missing: [{ fact: "x", label: "X", about: "A", reason: "not answered" }] } }), i5476()] }));
ok("C7.6 BR-8 pass: a Not needed line (the portal asks it itself) blocks nothing", r.ready, r.blocks);

// BR-9 3 (P-151): editions and fees.
r = filingReadiness(done({ forms: [i5257({ edition: { label: "IMM 5257 (06-2023)", superseded: true, acceptedUntil: "2026-11-11" } }), i5476()] }));
ok("C7.6 BR-9 3 pass (P-151): before the accepted-until date a superseded edition only warns, with \"Adopt update\"", !r.blocks.length && codes(r.warns).join() === "edition_superseded" && /Adopt update/.test(r.warns[0].words) && !r.ready, r);
r = filingReadiness(done({ forms: [i5257({ edition: { label: "IMM 5257 (06-2023)", superseded: true, acceptedUntil: "2026-10-31" } }), i5476()] }));
ok("C7.6 BR-9 3 fail (P-151): after the accepted-until date it blocks, and is not also a warning", codes(r.blocks).join() === "edition_expired" && !r.warns.length, r);
r = filingReadiness(done({ forms: [i5257({ edition: { label: "IMM 5257 (06-2023)", superseded: true, acceptedUntil: TODAY } }), i5476()] }));
ok("C7.6 BR-9 3 pass: on the accepted-until date itself it is still accepted (warns)", !r.blocks.length && codes(r.warns).join() === "edition_superseded");
r = filingReadiness(done({ fees: [{ line: "Visitor visa fee (Sample)", acceptedUntil: "2026-10-01" }] }));
ok("C7.6 BR-9 3 fail: a fee past its valid-until date blocks", codes(r.blocks).join() === "edition_expired" && /Fee/.test(r.blocks[0].words));
r = filingReadiness(done({ fees: [{ line: "Visitor visa fee (Sample)", acceptedUntil: null }] }));
ok("C7.6 BR-9 3 pass: a fee with no end date blocks nothing", r.ready);

// Review M1: timestamps are read as their day; a value that is not a date is refused, never ignored.
r = filingReadiness(done({ forms: [i5257({ edition: { label: "IMM 5257 (06-2023)", superseded: true, acceptedUntil: "2026-10-01T00:00:00.000Z" } }), i5476()] }));
ok("C7.6 M1 fail: an accepted-until timestamp in the past blocks (not a silent warning)", codes(r.blocks).join() === "edition_expired", r);
r = filingReadiness(done({ forms: [i5257({ edition: { label: "IMM 5257 (06-2023)", superseded: true, acceptedUntil: `${TODAY}T00:00:00.000Z` } }), i5476()] }));
ok("C7.6 M1 pass: a timestamp on the accepted-until day itself still only warns", !r.blocks.length && codes(r.warns).join() === "edition_superseded", r);
r = filingReadiness(done({ fees: [{ line: "Visitor visa fee (Sample)", acceptedUntil: "2026-10-01T12:00:00Z" }] }));
ok("C7.6 M1 fail: an expired fee given as a timestamp blocks (it never disappears)", codes(r.blocks).join() === "edition_expired");
let threw = ""; try { filingReadiness(done({ fees: [{ line: "Visitor visa fee (Sample)", acceptedUntil: "1 Oct 2026" }] })); } catch (e) { threw = (e as Error).message; }
ok("C7.6 M1 fail: a date that is not YYYY-MM-DD is refused with its name, never ignored", /not a date/.test(threw) && /Visitor visa fee/.test(threw), threw);
let threw2 = ""; try { dayOf("2026-02-30", "a date"); } catch (e) { threw2 = (e as Error).message; }
ok("C7.6 r2 m4 fail: an impossible day (30 February) is refused", /not a date/.test(threw2), threw2);
r = filingReadiness(done({ forms: [i5257(), i5476({ outOfDate: { fact: "Passport number", since: "2026-10-31T22:00:00Z" } })] }));
ok("C7.6 r2 m5 pass: the out-of-date mark's time is shown as its day", /changed on 2026-10-31 /.test(r.blocks[0]?.words ?? ""), r.blocks);
ok("C7.6 M1 pass: dayOf reads a date, a timestamp and null", dayOf("2026-11-01", "d") === "2026-11-01" && dayOf("2026-11-01T23:59:00+05:30", "d") === "2026-11-01" && dayOf(null, "d") === null);
// Review M4 (P-151 (1)): a fee no longer current warns before its date.
r = filingReadiness(done({ fees: [{ line: "Visitor visa fee (Sample)", superseded: true, acceptedUntil: "2026-12-01" }] }));
ok("C7.6 M4 pass: a superseded fee before its valid-until date warns with \"Adopt update\"", !r.blocks.length && codes(r.warns).join() === "edition_superseded" && /Fee/.test(r.warns[0].words) && /Adopt update/.test(r.warns[0].words), r.warns);
r = filingReadiness(done({ forms: [i5257(), i5476({ signed: false, signerOwes: "representative" })] }));
ok("C7.6 signature pass: a missing signature is owed by whoever signs it (the representative's part of IMM 5476)", r.blocks[0]?.owes === "representative", r.blocks);
r = filingReadiness(done({ reviewed: false, documents: missingDoc.documents }));
ok("C7.6 words pass: every block says it unblocks \"Ready to file and Record\"; every warning says it is passed with a reason or fixed", r.blocks.every((b) => b.unblocks === "Ready to file and Record") && r.warns.every((w) => /passed with a reason/.test(w.unblocks)));

// BR-9 4 (P-155, BR-21): the representative's review.
r = filingReadiness(done({ reviewed: false }));
ok("C7.6 BR-9 4 fail (P-155): the representative's review not done blocks, owed by the representative", codes(r.blocks).join() === "representative_review" && r.blocks[0].owes === "representative" && r.owes.representative === 1, r);

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
ok("C7.6 warn pass, block kept: passing every warning never clears a block", !r.ready && codes(r.blocks).join() === "representative_review");
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
ok("C7.6 r2 m3 pass: every line keeps the form item's own id in item (the prepare view links by it); keys tell lines apart", r.blocks.every((b) => b.item === "i-5257") && new Set(r.blocks.map((b) => b.key)).size === r.blocks.length && r.blocks.length === 3, r.blocks.map((b) => [b.item, b.key]));
r = filingReadiness(done({ forms: [i5257({ copyStale: true }), i5476()] }));
ok("C7.6 warn pass: a PDF upload line has no \"PDF copy\" warning (its own copy is checked by Validate)", r.ready);

ok("C7.6 pass rules: a block code cannot be passed, in people's words (no internal key); a warning code can; an unknown code is refused", /representative's review/.test(cannotPass("representative_review") ?? "") && !/representative_review|nope/.test(`${cannotPass("representative_review")}${cannotPass("nope")}`) && cannotPass("missing_document") === null && !!cannotPass("nope"));
ok("C7.6 pass rules: a reason of fewer than 5 characters, or none, is refused; a written one is accepted", !!passProblem("") && !!passProblem(undefined) && !!passProblem("abc") && !!passProblem("   ab   ") && passProblem("Passport uploaded in the portal (Sample)") === null && passProblem(`  ${"x".repeat(499)}  `) === null && !!passProblem("x".repeat(501)));

// Order: blocks and warnings are listed by who owes them (You · Representative · Client …).
r = filingReadiness(done({ reviewed: false, forms: [i5257({ validatedCurrent: false }), i5476({ signed: false })] }));
ok("C7.6 order pass: blocks are grouped by who owes them, staff first, then the representative, then the client", r.blocks.map((b) => b.owes).join() === "staff,representative,client", r.blocks.map((b) => b.code));

// Properties: never ready with a block; no percentage anywhere; every line has words and a known code.
const form = fc.record({ needsValidate: fc.boolean(), validatedCurrent: fc.boolean(), signed: fc.boolean(), channel: fc.constantFrom<Channel>("ONLINE", "PDF_UPLOAD", "PAPER", "NOT_NEEDED"), signature: fc.constantFrom<Signature>("TYPED_NAME", "HAND_SCANNED", "PEN", "NONE"), reason: fc.constantFrom<null | "not answered" | "not confirmed" | "needs a fix">(null, "not answered", "not confirmed", "needs a fix"), until: fc.constantFrom(null, "2026-10-31", "2026-11-01", "2026-12-01"), superseded: fc.boolean(), stale: fc.boolean() });
const input = (fs: { needsValidate: boolean; validatedCurrent: boolean; signed: boolean; channel: Channel; signature: Signature; reason: null | "not answered" | "not confirmed" | "needs a fix"; until: string | null; superseded: boolean; stale: boolean }[], reviewed: boolean, docMissing: boolean): FilingInput => ({ filing: "f", reviewed, today: TODAY, documents: [{ label: "Passport", subject: "s", person: "Sample Client A", required: true, received: !docMissing }],
    forms: fs.map((f, i) => ({ item: `i${i}`, form: `IMM ${5257 + i}`, subject: "s", person: "Sample Client A", channel: f.channel, signature: f.signature, signed: f.signed, needsValidate: f.needsValidate, validatedCurrent: f.validatedCurrent, copyStale: f.stale,
      readiness: f.reason ? { ready: false, missing: [{ fact: "x", label: "X", about: "A", reason: f.reason }] } : clean, edition: { label: "E", superseded: f.superseded, acceptedUntil: f.until } })) });
// A form that needs anything at all (a fact, a signature, a validated copy, a newer edition) never lets the filing be ready.
const needsWork = (f: { channel: Channel; reason: unknown; signature: Signature; signed: boolean; needsValidate: boolean; validatedCurrent: boolean; until: string | null; superseded: boolean; stale: boolean }) => f.channel !== "NOT_NEEDED"
  && (!!f.reason || ((f.signature === "HAND_SCANNED" || f.signature === "PEN") && !f.signed) || (f.needsValidate && f.channel !== "ONLINE" && !f.validatedCurrent) || f.superseded || (!!f.until && TODAY > f.until) || (f.channel === "ONLINE" && f.stale));
try { fc.assert(fc.property(fc.array(form, { maxLength: 4 }), fc.boolean(), fc.boolean(), (fs, reviewed, docMissing) => filingReadiness(input(fs, reviewed, docMissing)).ready === (reviewed && !docMissing && !fs.some(needsWork))), { numRuns: 600 }); ok("C7.6 property: ready exactly when reviewed, the passport is in and no form needs anything (an independent statement of the rules)", true); }
catch (e) { ok("C7.6 property: ready exactly when reviewed, the passport is in and no form needs anything (an independent statement of the rules)", false, (e as Error).message.split("\n").slice(0, 3).join(" ")); }
const prop = (name: string, p: (r: ReturnType<typeof filingReadiness>) => boolean) => {
  try { fc.assert(fc.property(fc.array(form, { maxLength: 4 }), fc.boolean(), fc.boolean(), (fs, reviewed, docMissing) => p(filingReadiness(input(fs, reviewed, docMissing)))), { numRuns: 400 }); ok(name, true); }
  catch (e) { ok(name, false, (e as Error).message.split("\n").slice(0, 3).join(" ")); }
};
prop("C7.6 property: a filing is never ready while it has a block or an unpassed warning", (x) => x.ready === (x.blocks.length === 0 && x.warns.length === 0));
prop("C7.6 property: never a percentage; every line has words, a known code and an owner", (x) => !/%/.test(JSON.stringify(x)) && [...x.blocks, ...x.warns].every((l) => l.words.length > 10 && !!l.owes && ([...BLOCK_CODES, ...WARN_CODES] as string[]).includes(l.code)));
prop("C7.6 property: owes counts add up to the open lines", (x) => Object.values(x.owes).reduce((a, b) => a + (b ?? 0), 0) === x.blocks.length + x.warns.length);

process.exitCode = summary() ? 1 : 0;
