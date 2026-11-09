// C7.10 readiness figure checks (runtime lane, row B143; AG-7-27, BR-30; founder P-406 (2)): the pure rules of
// engine/runtime/readiness-figure.ts on C7.6-shaped inputs. A passing and a failing case per rule (concept BR-1 to BR-8);
// properties check that the figure is 100 exactly when C7.6 says Ready, that the state follows C7.6's lines, and that
// C7.6's own result is left as it was. No database, no server, no model call (US$0).
//   tsx studio/tests/check_c710_figure.ts
import fc from "fast-check";
import { filingReadiness, passKeys, type Channel, type FilingInput, type FormItem, type Signature, type WarnCode } from "../engine/runtime/readiness.ts";
import { FIGURE_RULE, lowestOf, readinessFigure, type ClosedFinding, type Figure } from "../engine/runtime/readiness-figure.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const TODAY = "2026-11-01";
const clean = { ready: true, missing: [] };
const formA = (o: Partial<FormItem> = {}): FormItem => ({ item: "i-a", form: "Form A (Sample)", subject: "s-P", person: "Sample Client A", channel: "PDF_UPLOAD", readiness: clean, needsValidate: true, validatedCurrent: true, signature: "TYPED_NAME", signed: false, edition: { label: "A (Sample)", superseded: false, acceptedUntil: null }, ...o });
const formB = (o: Partial<FormItem> = {}): FormItem => ({ item: "i-b", form: "Form B (Sample)", subject: "s-P", person: "Sample Client A", channel: "PDF_UPLOAD", readiness: clean, needsValidate: false, validatedCurrent: false, signature: "HAND_SCANNED", signed: true, signers: ["Sample Client A"], ...o });
const passport = (received = true) => ({ item: "d-pass", label: "Passport", subject: "s-P", person: "Sample Client A", required: true, received });
const done = (o: Partial<FilingInput> = {}): FilingInput => ({ filing: "f-1", forms: [formA(), formB()], documents: [passport()], reviewed: true, today: TODAY, ...o });
const fig = (x: FilingInput) => readinessFigure(x, filingReadiness(x));
const kinds = (f: Figure) => f.items.map((i) => `${i.kind}:${i.done ? "done" : "open"}`).join(",");
const pass = (x: FilingInput, code: WarnCode, reason = "Client confirmed by phone today (Sample)") => ({ code, keys: passKeys(filingReadiness(x), code), reason, by: "user-O", at: "2026-11-01T10:00:00Z" });
const missing = (fact: string, reason: "not answered" | "needs a fix" = "not answered") => ({ ready: false, missing: [{ fact, label: fact, about: "Sample Client A", reason }] });

// BR-1 State.
let f = fig(done());
ok("C7.10 BR-1 pass: a filing with nothing open is Ready at 100, 5 of 5 (two forms, the passport, the facts, the review)", f.state === "ready" && f.score === 100 && f.done === 5 && f.countable === 5 && kinds(f) === "form:done,form:done,document:done,facts:done,review:done", f);
f = fig(done({ reviewed: false }));
ok("C7.10 BR-1 fail: an open CRITICAL warning (no representative's review) is Not ready, 4 of 5 = 80", f.state === "not_ready" && f.score === 80 && f.done === 4, f);
f = fig(done({ forms: [formA({ validatedCurrent: false }), formB()] }));
ok("C7.10 BR-1 fail: a block (a barcode form with no validated copy) is Not ready, the form not done", f.state === "not_ready" && f.items.find((i) => i.key === "form|i-a")?.done === false && f.score === 80, f);
f = fig(done({ documents: [passport(false)] }));
ok("C7.10 BR-1 pass: only a plain warning open (a missing document) is Attention, not Not ready", f.state === "attention" && f.score === 80 && f.items.find((i) => i.kind === "document")?.done === false, f);

// Challenge M1: an open CRITICAL review finding (a plain warning in C7.6) reads Not ready; a MAJOR one reads Attention.
f = fig(done({ findings: [{ id: "g-c", severity: "CRITICAL", words: "The passport number differs from the passport (Sample)" }] }));
ok("C7.10 BR-1 (M1) fail: an open CRITICAL finding is Not ready, though C7.6 lists it as a plain warning", f.state === "not_ready" && filingReadiness(done({ findings: [{ id: "g-c", severity: "CRITICAL", words: "x (Sample)" }] })).warns.every((w) => w.severity === "warning"), f);
f = fig(done({ findings: [{ id: "g-m", severity: "MAJOR", words: "A spelling differs (Sample)" }] }));
ok("C7.10 BR-1 (M1) pass: an open MAJOR finding alone is Attention", f.state === "attention", f);

// BR-2 Countable items.
f = fig(done({ forms: [formA(), formB(), formB({ item: "i-c", form: "Form C (Sample)", channel: "NOT_NEEDED", signed: false })] }));
ok("C7.10 BR-2 pass: a \"Not needed\" line is left out of both sides (still 5 items)", f.countable === 5 && !f.items.some((i) => i.label.startsWith("Form C")), f.items);
f = fig(done({ documents: [passport(), { item: "d-opt", label: "Travel history (Sample)", subject: "s-P", person: "Sample Client A", required: false, received: false }] }));
ok("C7.10 BR-2 pass: a document that is not required (or not applicable) is not counted", f.countable === 5 && f.score === 100, f.items);
f = fig(done({ forms: [], documents: [] }));
ok("C7.10 BR-2 fail: a filing with no forms has no facts item; the review still counts", kinds(f) === "review:done" && f.score === 100, f);
f = fig(done({ findings: [{ id: "g1", severity: "MINOR", words: "A spelling differs (Sample)" }] }));
ok("C7.10 BR-2 fail: a review finding standing is its own item, not done (5 of 6 = 83), Attention", f.countable === 6 && f.score === 83 && f.state === "attention" && f.items.some((i) => i.kind === "check" && !i.done), f.items);
f = fig(done({ fees: [{ line: "Fee (Sample)", amount: "CAD 1 (Sample)", acceptedUntil: "2026-10-01" }] }));
ok("C7.10 BR-2 fail: a fee line past its accepted-until date is its own item, Not ready (CRITICAL)", f.countable === 6 && f.state === "not_ready" && f.score === 83, f.items);

// BR-3 Done.
{ const x = done({ forms: [formA({ readiness: missing("person.passport_number") }), formB()] });
  f = fig(x);
  ok("C7.10 BR-3 fail: a missing fact holds both its form and the facts item (3 of 5 = 60)", f.score === 60 && f.items.find((i) => i.key === "form|i-a")?.done === false && f.items.find((i) => i.kind === "facts")?.done === false, f.items);
  const y = { ...x, passes: [pass(x, "missing_facts")] };
  f = fig(y);
  ok("C7.10 BR-3 pass: passed with a reason, the line counts as done (BR-30 rule 5): 100, Ready, \"2 passed with a reason\" (the form and the facts, both marked passed)", f.score === 100 && f.state === "ready" && f.passed === 2 && f.items.filter((i) => i.passed).map((i) => i.kind).sort().join() === "facts,form", f); }
{ const x = done({ openChecks: [{ fact: "person.date_of_birth", label: "Date of birth", subject: "s-P", person: "Sample Client A" }] });
  f = fig(x);
  ok("C7.10 BR-3 fail: an open check (answer and document differ) holds the facts item, not a form", f.items.find((i) => i.kind === "facts")?.done === false && f.items.filter((i) => i.kind === "form").every((i) => i.done) && f.score === 80, f.items); }
f = fig(done({ forms: [formA({ item: undefined }), formB({ item: undefined, signed: false })] }));
ok("C7.10 BR-3 fail: a form line with no item id still lands on its own form (by its key)", f.items.find((i) => i.label.startsWith("Form B"))?.done === false && f.items.find((i) => i.label.startsWith("Form A"))?.done === true && f.score === 80, f.items);
f = fig(done({ documents: [{ ...passport(false), item: undefined }] }));
ok("C7.10 BR-3 fail: a document line with no item id still lands on its document", f.items.find((i) => i.kind === "document")?.done === false && f.countable === 5, f.items);

// Challenge M3: a finding closed in Review findings stays counted: done, and passed when closed with a reason.
{ const closed: ClosedFinding[] = [{ id: "g-w", state: "waived", words: "CRITICAL finding (waived with a reason in Review findings): name order (Sample)" }, { id: "g-r", state: "resolved", words: "MAJOR finding (resolved: the facts now agree): x (Sample)" }];
  const x = done(), g = readinessFigure(x, filingReadiness(x), closed);
  ok("C7.10 BR-3 (M3) pass: a waived finding and a resolved one stay two done items (7 of 7 = 100); only the waived one counts as passed with a reason", g.countable === 7 && g.score === 100 && g.passed === 1 && g.state === "ready" && g.items.filter((i) => i.kind === "check").map((i) => i.passed).join() === "true,false", g);
  const g0 = fig(x);
  ok("C7.10 BR-3 (M3) fail: without them the same filing counts 5 items and 0 passed (they would vanish)", g0.countable === 5 && g0.passed === 0, g0); }
// Challenge m5: "passed" counts items done by a pass, not lines: one pass over two owners' missing facts on one form.
{ const x = done({ forms: [formA({ readiness: { ready: false, missing: [{ fact: "a", label: "A", about: "x", reason: "not answered" }, { fact: "b", label: "B", about: "x", reason: "not answered" }] }, owesFact: { a: "client", b: "staff" } }), formB()] });
  const y = { ...x, passes: [pass(x, "missing_facts")] }, g = fig(y);
  ok("C7.10 BR-3 (m5) pass: two passed lines on one form and the facts read as 2 items passed (the form and the facts), against 5 of 5 done", filingReadiness(y).passed.length === 2 && g.passed === 2 && g.done === 5, g); }
// Challenge m7: a form that cannot start yet says so in its label.
f = fig(done({ forms: [formA(), formB({ readiness: { ready: false, missing: [{ fact: "applies:Form B (Sample)", label: "whether Form B applies", about: "x", reason: "not answered" }] } })] }));
ok("C7.10 BR-2 (m7) fail: a form whose use waits for an answer is counted, not done, and its label says it waits", /waits for an answer/.test(f.items.find((i) => i.key === "form|i-b")?.label ?? "") && f.items.find((i) => i.key === "form|i-b")?.done === false, f.items);

// BR-4 Figure, rounded down.
{ const many = Array.from({ length: 198 }, (_, i) => formB({ item: `i-${i}`, form: `Form ${i} (Sample)` }));
  f = fig(done({ forms: [...many.slice(0, 196), formB({ item: "i-x", form: "Form X (Sample)", signed: false })], documents: [] }));
  ok("C7.10 BR-4 fail: one item open of 199 (197 forms, the facts, the review) reads 99, never 100 (rounded down: 198 / 199 = 99.5)", f.countable === 199 && f.done === 198 && f.score === 99, { done: f.done, countable: f.countable, score: f.score }); }
f = fig(done({ reviewed: false, documents: [passport(false)] }));
ok("C7.10 BR-4 pass: 3 of 5 = 60 exactly", f.score === 60, f);

// BR-5 Case: the lowest state and the lowest figure, each naming its filing.
{ const a: Figure = { ...fig(done()), filing: "f-a" }, b = { ...fig(done({ reviewed: false })), filing: "f-b" }, c = { ...fig(done({ documents: [passport(false)], findings: [{ id: "g", severity: "MAJOR", words: "x (Sample)" }] })), filing: "f-c" };
  const low = lowestOf([a, b, c]);
  ok("C7.10 BR-5 pass: Ready 100, Not ready 80, Attention 66 → the case shows Not ready (f-b) and 66 (f-c)", low?.state === "not_ready" && low.state_filing === "f-b" && low.score === 66 && low.score_filing === "f-c" && c.score === 66 && c.state === "attention", { low, b: [b.state, b.score], c: [c.state, c.score] });
  ok("C7.10 BR-5 pass: one filing → its own; ties → the first", JSON.stringify(lowestOf([a])) === JSON.stringify({ state: "ready", state_filing: "f-a", score: 100, score_filing: "f-a" }) && lowestOf([b, { ...b, filing: "f-b2" }])?.state_filing === "f-b");
  ok("C7.10 BR-5 fail: no filings → no case figure", lowestOf([]) === null);
  // Challenge M2: a filing recorded as submitted never holds the case's lowest; all submitted → no case figure.
  const low2 = lowestOf([a, { ...b, submitted: true }]);
  ok("C7.10 BR-5 (M2) fail: a submitted filing at Not ready 80 is left out: the case reads the open filing's Ready 100", low2?.state === "ready" && low2.score === 100 && low2.state_filing === "f-a", low2);
  ok("C7.10 BR-5 (M2) pass: every filing submitted → no case figure", lowestOf([{ ...a, submitted: true }, { ...b, submitted: true }]) === null); }

// BR-7 Rule shown; BR-8 C7.6 unchanged; a figure for the wrong filing is refused.
f = fig(done());
ok("C7.10 BR-7 pass: the rule in words travels with every figure and names what is not counted here", f.rule === FIGURE_RULE && /rounded down/.test(f.rule) && /passed with a reason, or a finding closed with a reason, counts as done/.test(f.rule) && /retainer/.test(f.rule) && f.items.every((i) => i.label.length > 3));
{ const x = done({ reviewed: false }), r = filingReadiness(x), before = JSON.stringify(r);
  readinessFigure(x, r);
  ok("C7.10 BR-8 pass: working out the figure leaves C7.6's result as it was (no field added, no \"%\")", JSON.stringify(r) === before && !/%/.test(before) && !("figure" in r)); }
{ let threw = false; try { readinessFigure(done({ filing: "f-2" }), filingReadiness(done())); } catch { threw = true; }
  ok("C7.10 BR-8 fail: a C7.6 result for another filing is refused, never mixed", threw); }

// Properties on random filings (forms of every kind, documents, checks, findings, fees, passes).
const form = fc.record({ item: fc.boolean(), needsValidate: fc.boolean(), validatedCurrent: fc.boolean(), signed: fc.boolean(), channel: fc.constantFrom<Channel>("ONLINE", "PDF_UPLOAD", "PAPER", "NOT_NEEDED"), signature: fc.constantFrom<Signature>("TYPED_NAME", "HAND_SCANNED", "PEN", "NONE"), reason: fc.constantFrom<null | "not answered" | "not confirmed" | "needs a fix">(null, "not answered", "not confirmed", "needs a fix"), until: fc.constantFrom(null, "2026-10-31", "2026-12-01"), superseded: fc.boolean(), stale: fc.boolean() });
const world = fc.record({ forms: fc.array(form, { maxLength: 4 }), reviewed: fc.boolean(), docs: fc.array(fc.record({ item: fc.boolean(), required: fc.boolean(), received: fc.boolean() }), { maxLength: 3 }), checks: fc.nat({ max: 2 }), findings: fc.array(fc.constantFrom("CRITICAL" as const, "MAJOR" as const, "MINOR" as const, "INFO" as const), { maxLength: 2 }), feeExpired: fc.boolean(), passSome: fc.array(fc.boolean(), { minLength: 12, maxLength: 12 }) });
type W = typeof world extends fc.Arbitrary<infer T> ? T : never;
const build = (w: W): FilingInput => {
  const x: FilingInput = { filing: "f", reviewed: w.reviewed, today: TODAY,
    forms: w.forms.map((g, i) => ({ item: g.item ? `i${i}` : undefined, form: `Form ${i} (Sample)`, subject: "s", person: "Sample Client A", channel: g.channel, signature: g.signature, signed: g.signed, needsValidate: g.needsValidate, validatedCurrent: g.validatedCurrent, copyStale: g.stale,
      readiness: g.reason ? { ready: false, missing: [{ fact: `x${i}`, label: `X${i}`, about: "A", reason: g.reason }] } : clean, edition: { label: `E${i}`, superseded: g.superseded, acceptedUntil: g.until } })),
    documents: w.docs.map((d, i) => ({ item: d.item ? `d${i}` : undefined, label: `Document ${i} (Sample)`, subject: "s", person: "Sample Client A", required: d.required, received: d.received })),
    openChecks: Array.from({ length: w.checks }, (_, i) => ({ fact: `c${i}`, label: `C${i}`, subject: "s", person: "Sample Client A" })),
    findings: w.findings.map((sev, i) => ({ id: `g${i}`, severity: sev, words: `Finding ${i} (Sample)` })),
    fees: w.feeExpired ? [{ line: "Fee (Sample)", amount: "CAD 1 (Sample)", acceptedUntil: "2026-10-01" }] : [] };
  // Pass a random share of the open warning lines, one pass per line, as the route would store them.
  const r0 = filingReadiness(x);
  x.passes = r0.warns.filter((_, i) => w.passSome[i % 12]).map((l) => ({ code: l.code, keys: [l.key], reason: "Passed for the check (Sample)", by: "user-O", at: "2026-11-01T10:00:00Z" }));
  return x;
};
const prop = (name: string, p: (x: FilingInput) => boolean) => {
  try { fc.assert(fc.property(world, (w) => p(build(w))), { numRuns: 600 }); ok(name, true); }
  catch (e) { ok(name, false, (e as Error).message.split("\n").slice(0, 4).join(" ")); }
};
prop("C7.10 property: the figure is 100 exactly when C7.6 says Ready, and the state is Ready exactly then", (x) => { const r = filingReadiness(x), g = readinessFigure(x, r); return (g.score === 100) === r.ready && (g.state === "ready") === r.ready; });
prop("C7.10 property: Not ready exactly when a block, an open CRITICAL warning or an open CRITICAL finding stands; Attention exactly when only plain warnings are open", (x) => { const r = filingReadiness(x), g = readinessFigure(x, r); const critF = new Set((x.findings ?? []).filter((g0) => g0.severity === "CRITICAL").map((g0) => `finding|${g0.id}`)); const crit = r.blocks.length > 0 || r.warns.some((w) => w.severity === "critical" || (w.code === "finding" && critF.has(w.item ?? ""))); return (g.state === "not_ready") === crit && (g.state === "attention") === (!crit && r.warns.length > 0); });
prop("C7.10 property: the figure is done ÷ countable × 100 rounded down, 0 to 100, and every open line leaves at least one item not done", (x) => { const r = filingReadiness(x), g = readinessFigure(x, r); return g.countable >= 1 && g.done === g.items.filter((i) => i.done).length && g.countable === g.items.length && g.score === Math.floor((g.done * 100) / g.countable) && g.score >= 0 && g.score <= 100 && (r.blocks.length + r.warns.length === 0 || g.done < g.countable) && g.passed === g.items.filter((i) => i.passed && i.done).length && g.passed <= g.done; });
prop("C7.10 property: C7.6's result is never changed by working out the figure", (x) => { const r = filingReadiness(x), s = JSON.stringify(r); readinessFigure(x, r); return JSON.stringify(r) === s; });
process.exitCode = summary() ? 1 : 0;
