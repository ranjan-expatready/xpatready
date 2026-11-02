// C3.4 AI step (forms; P-149 (5), P-158, P-134, P-175, P-227): a form edition's checks and document types, and a guide's
// checks, drafted by two AI rounds, Live or Saved. Proves with NO model call (US$0):
//   E  the rules over the rounds (engine/masters-ai.ts): the source's own words, the 11 operators over its own boxes or
//      answers, two or three examples that hold, Ready only when both rounds agree, an identity document never read by AI;
//   L  Live with the live switch off is refused at US$0 before anything runs, and no job is written (P-175);
//   S  Saved with nothing recorded is refused in plain words at US$0; Saved with a recorded run (launcher-shaped, made
//      from the real launcher's stub pass of the committed job) replays both rounds into To review at US$0, once per
//      edition: IMM 5257's sections and answer lists (rules) with its checks and document types (AI); guide 5256's checks;
//      a recorded run under another edition's key is never used.
// Files it writes (simulated runs, stub runs) are removed after; the committed stub passes and canary digest are restored.
//   zsh studio/tools/isolated.sh forms_c34ai 4454 start && tsx studio/tests/check_forms_c34_ai.ts 4454 xr_studio_forms_c34ai
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PORT = Number(process.argv[2] ?? 4454), DB = process.argv[3] ?? "xr_studio_forms_c34ai";
process.env.DATABASE_URL = `postgresql://xr_studio@127.0.0.1:54329/${DB}`; // before the app's modules are loaded (core.ts reads it once)
const STUDIO = join(import.meta.dirname, ".."), PROTOTYPE = join(STUDIO, ".."), ROOT = join(PROTOTYPE, "..", "..", "..");
const P2 = join(PROTOTYPE, "p2"), RUNS = join(P2, "runs");
const log: unknown[] = []; let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; log.push({ name, ok: !!c, detail }); console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 260)}` : ""}`); };
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: any = null; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("psql", [process.env.DATABASE_URL!, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
// As the PA check (break M2): simulated live runs are stamped 1 Jan 2000 (never outrank a real run) and tagged (gitignored).
const FAKE = "-live-20000101t000000000z-pacheck", MINE = `${FAKE}${process.pid}x`;
const written: string[] = [], kept = new Map<string, Buffer | null>();
const keep = (f: string) => { if (!kept.has(f)) kept.set(f, existsSync(f) ? readFileSync(f) : null); };
const cleanUp = () => { for (const f of written) rmSync(f, { force: true }); for (const [f, b] of kept) { if (b === null) rmSync(f, { force: true }); else writeFileSync(f, b); } };
for (const [sig, code] of [["SIGINT", 130], ["SIGTERM", 143]] as const) process.on(sig, () => { cleanUp(); process.exit(code); });

// The two answers a recorded run carries: IMM 5257's own printed words and boxes; guide 5256's own sentence.
const CHOICE = "form1[0].Page3[0].PageWrapper[0].BackgroundInfo3[0].Choice[0]", DETAILS = "form1[0].Page3[0].PageWrapper[0].BackgroundInfo3[0].details[0]";
const PASSPORT = "form1[0].Page2[0].MaritalStatus[0].SectionA[0].Passport[0].PassportNum[0].PassportNum[0]";
const formCheck = { sentence: "When a criminal offence is declared, its details are given", reads: [CHOICE, DETAILS], subject_kind: "PRINCIPAL",
  tree_json: JSON.stringify({ op: "or", args: [{ op: "neq", field: CHOICE, value: "Yes" }, { op: "exists", field: DETAILS }] }), quote: "If you answered “yes” to question 3a) above, please provide details.",
  examples: [{ facts_json: JSON.stringify({ [CHOICE]: "No" }), expected: true }, { facts_json: JSON.stringify({ [CHOICE]: "Yes" }), expected: false }, { facts_json: JSON.stringify({ [CHOICE]: "Yes", [DETAILS]: "A fine in 2015" }), expected: true }] };
const passport = { name: "Passport", proves: "identity and nationality", category: "identity", supplies: [PASSPORT], reader: "coded_lines", identity_document: true, quote: "Passport number" };
const FORM_ANSWER = { checks: [formCheck], document_types: [passport], unresolved: [{ passage: "Dates of previous marriage", reason: "two dates compared: not in the 11 operators" }] };
const guideCheck = { group: "official_rule", sentence: "The passport number is given as shown on the passport", reads: ["Passport number"], subject_kind: "PRINCIPAL", tree_json: JSON.stringify({ op: "exists", field: "passport_number" }),
  severity: "block", needs_calculation: null, quote: "Type your valid passport or travel document number exactly as shown on the document.",
  examples: [{ facts_json: JSON.stringify({ passport_number: "AB123456" }), expected: true }, { facts_json: JSON.stringify({}), expected: false }] };
const GUIDE_ANSWER = { checks: [guideCheck], unresolved: [] };

(async () => {
  // ---------------------------------------------------------------- E: the rules over the rounds (pure, no server)
  const m = await import("../engine/masters-ai.ts");
  const inv = JSON.parse(readFileSync(join(PROTOTYPE, "p1", "inventory", "imm5257e.inventory.json"), "utf8")) as { fields: { data_path?: string; caption?: string; heading?: string; presence?: string }[] };
  const boxes = inv.fields.filter((f) => f.data_path && !/invisible|hidden/i.test(String(f.presence ?? ""))).map((f) => ({ path: f.data_path!, words: [f.caption, f.heading].filter(Boolean).join(" \n ") }));
  const FS = { file: "imm5257e.pdf", sha256: "0".repeat(64), edition: "IMM 5257 (09-2023)", printed: "IMM 5257 (09-2023)", boxes };
  const r = (output: any, from: "replay" | "live" = "replay") => ({ output, from, runFile: "prototype/p2/runs/x.json", costUsd: 0 });
  const both = (a: any, b: any = a) => m.formMastersFromRounds({ draft: r(a), check: r(b) }, FS, { runId: "00000000-0000-4000-8000-000000000001" });
  let e = both(FORM_ANSWER);
  const fc = e.items.find((x) => x.kind === "form_check"), dt = e.items.find((x) => x.kind === "document_type");
  ok("C3.4 E pass: both rounds give the same form check: Ready, agreed, its 3 examples run and hold, unconfirmed until the expert", fc?.confidence === "ready" && fc?.agreement === "agreed" && (fc?.payload as any).examples.length === 3 && (fc?.payload as any).examples.every((x: any) => x.confirmedBy === null) && fc?.rules.every((x) => x.passed), fc);
  ok("C3.4 E pass: the passport is proposed as a document type read by its coded lines, never by AI (P-134), resting on the form's printed words", dt?.confidence === "ready" && (dt?.payload as any).readerKind === "coded_lines" && (dt?.payload as any).identityDocument === true && dt?.source?.quote === "Passport number", dt?.payload);
  ok("C3.4 E pass: what the AI could not express is kept as unresolved, never dropped silently", e.unresolved.length === 1 && e.dropped.length === 0, e.unresolved);
  const bad = (patch: any) => both({ ...FORM_ANSWER, checks: [{ ...formCheck, ...patch }], document_types: [] });
  e = bad({ quote: "If you answered yes, please give us everything." });
  ok("C3.4 E fail: a check whose words are not printed on the form is not proposed, with the reason (M1)", !e.items.length && /not printed on IMM 5257/.test(e.dropped[0]?.why ?? ""), e.dropped[0]);
  e = bad({ reads: [CHOICE, "form1[0].Barcodes[0].PaperFormsBarcode1[0]"] });
  ok("C3.4 E fail: a check that reads a box not visible on this edition is not proposed (M2)", !e.items.length && /not a visible box/.test(e.dropped[0]?.why ?? ""), e.dropped[0]);
  e = bad({ reads: [CHOICE] });
  ok("C3.4 E fail: a check whose condition reads a box it does not name is not proposed (M2)", !e.items.length && /does not name/.test(e.dropped[0]?.why ?? ""), e.dropped[0]);
  e = bad({ tree_json: JSON.stringify({ op: "between", field: CHOICE, value: 1 }) });
  ok("C3.4 E fail: a condition outside the 11 operators is not proposed (M2)", !e.items.length && /11 operators/.test(e.dropped[0]?.why ?? ""), e.dropped[0]);
  e = bad({ examples: [formCheck.examples[0]] });
  ok("C3.4 E fail: a check with fewer than two worked examples is not proposed (P-149 (5), M3)", !e.items.length && /fewer than two/.test(e.dropped[0]?.why ?? ""), e.dropped[0]);
  e = bad({ examples: [formCheck.examples[0], { ...formCheck.examples[1], expected: true }] });
  ok("C3.4 E fail: an example that its condition answers otherwise makes the check Check, naming the example (M3)", e.items[0]?.confidence === "check" && /Example 2/.test(e.items[0]?.reason ?? ""), e.items[0]?.reason);
  e = both(FORM_ANSWER, { ...FORM_ANSWER, checks: [{ ...formCheck, tree_json: JSON.stringify({ op: "exists", field: DETAILS }), examples: [{ facts_json: JSON.stringify({ [DETAILS]: "x" }), expected: true }, { facts_json: "{}", expected: false }] }] });
  const differ = e.items.find((x) => x.kind === "form_check");
  ok("C3.4 E fail: the same boxes with another condition is Check, both readings kept (M4)", differ?.agreement === "differ" && differ?.confidence === "check" && !!differ?.rounds.draft && !!differ?.rounds.check, differ?.agreement);
  e = both(FORM_ANSWER, { checks: [], document_types: [], unresolved: [] });
  ok("C3.4 E fail: an item only one round gives is Decide (M4)", e.items.length === 2 && e.items.every((x) => x.confidence === "decide" && x.agreement === "one_round" && x.rounds.check === null), e.items.map((x) => x.confidence));
  e = both({ ...FORM_ANSWER, checks: [], document_types: [{ ...passport, reader: "letter_or_record" }] });
  ok("C3.4 E fail: an identity document the AI would read is set to a person's reading and flagged Check (P-134, M5)", (e.items[0]?.payload as any)?.readerKind === "person_only" && e.items[0]?.confidence === "check" && e.items[0]?.rules.some((x) => x.rule === "identity_not_read_by_ai" && !x.passed), e.items[0]?.payload);
  ok("C3.4 E fail: an answer of the wrong shape is never used (shape check)", !m.formShapeOk({ checks: [{ sentence: "x" }], document_types: [], unresolved: [] }) && m.formShapeOk(FORM_ANSWER) && m.guideShapeOk(GUIDE_ANSWER) && !m.guideShapeOk(FORM_ANSWER));
  const guideText = String(JSON.parse(readFileSync(join(PROTOTYPE, "p1", "inventory", "guide-5256.text.inventory.json"), "utf8")).text);
  const GS = { file: "prototype/p1/inventory/guide-5256.text.inventory.json", sha256: "0".repeat(64), text: guideText, code: "Guide 5256" };
  const g = (a: any, facts: { key: string; names: string[] }[], b: any = a) => m.guideMastersFromRounds({ draft: r(a), check: r(b) }, GS, facts, { runId: "00000000-0000-4000-8000-000000000001", combinationId: "00000000-0000-4000-8000-000000000002" });
  let ge = g(GUIDE_ANSWER, [{ key: "person.passport_number", names: ["Passport number"] }]);
  ok("C3.4 E pass: a guide check over a library question reads its key, Ready when both rounds agree, on the combination", ge.items[0]?.kind === "form_check" && ge.items[0]?.confidence === "ready" && (ge.items[0]?.payload as any).reads[0] === "person.passport_number" && ge.items[0]?.landsOn === "combination" && JSON.stringify((ge.items[0]?.payload as any).examples[0].facts) === JSON.stringify({ "person.passport_number": "AB123456" }), ge.items[0]?.payload);
  ge = g(GUIDE_ANSWER, []);
  ok("C3.4 E fail: a guide check over an answer that is not a library question is Decide, saying which (M6)", ge.items[0]?.confidence === "decide" && /"Passport number" is not a question/.test(ge.items[0]?.reason ?? ""), ge.items[0]?.reason);
  ge = g({ checks: [{ ...guideCheck, quote: "Passports must be valid for six months." }], unresolved: [] }, []);
  ok("C3.4 E fail: a guide check whose sentence is not in the guide is not proposed (M1)", !ge.items.length && /not in Guide 5256's text/.test(ge.dropped[0]?.why ?? ""), ge.dropped[0]);
  ge = g({ checks: [{ ...guideCheck, needs_calculation: "days from the application date to the passport expiry date" }], unresolved: [] }, [{ key: "person.passport_number", names: ["Passport number"] }]);
  ok("C3.4 E fail: a guide check that needs a calculation is kept for a person as Decide, never dropped (M6)", ge.items[0]?.confidence === "decide" && /calculation/.test(ge.items[0]?.reason ?? ""), ge.items[0]?.reason);
  const cross = { ...guideCheck, group: "cross_record", reads: ["Passport number", "Family name"], tree_json: JSON.stringify({ op: "and", args: [{ op: "exists", field: "passport_number" }, { op: "exists", field: "family_name" }] }),
    examples: [{ facts_json: JSON.stringify({ passport_number: "A", family_name: "B" }), expected: true }, { facts_json: JSON.stringify({ family_name: "B" }), expected: false }] };
  ge = g({ checks: [cross], unresolved: [] }, [{ key: "person.passport_number", names: ["Passport number"] }, { key: "person.family_name", names: ["Family name"] }]);
  ok("C3.4 E pass: a guide check over two answers is a cross-answer check that only warns (contract), even when the AI said block", ge.items[0]?.kind === "cross_check" && (ge.items[0]?.payload as any).severity === "warn" && (ge.items[0]?.payload as any).reads.length === 2, ge.items[0]?.payload);

  // ---------------------------------------------------------------- server: Live off, Saved
  const served = (await call("GET", "/session")).body?.workspace?.id;
  const inDb = (() => { try { return sql(`select id from workspace where id='${served}'`); } catch { return ""; } })();
  if (!served || !inDb) { console.error(`STOP  the database ${DB} is not the one the server on port ${PORT} uses. Pass the copy's database: tsx <check> ${PORT} xr_studio_<name>.`); process.exit(2); }
  const reset = await call("POST", "/demo/reset-to-six", { confirm: "RESET" });
  if (reset.status >= 300) { console.error("STOP  Reset to the six did not finish", reset.body); process.exit(2); }
  const att = (file: string) => sql(`select a.id from source_attachment a join combination c on c.id=a.combination_id where c.combination_key='vv.single' and a.file_name='${file}'`);
  const form = att("imm5257e.pdf"), guide = att("guide-5256.html"), vv = sql(`select id from combination where combination_key='vv.single'`);
  const jobs = () => Number(sql(`select count(*) from drafting_job where kind='masters_edition'`));
  const spent = () => Number(sql("select coalesce(sum(cost_usd),0) from drafting_job") || 0);
  const { LEDGER_DIR } = await import("../../p2/policy.ts");
  const { SpendLedger } = await import("../../p2/ledger.ts");
  const ledger0 = new SpendLedger(LEDGER_DIR).committed(), jobs0 = jobs(), spent0 = spent();

  let x = await call("POST", `/attachments/${form}/draft-masters`, { mode: "live" });
  ok("C3.4 L fail: Live with the live switch off is refused at US$0 (P-175), and no job is started", x.status === 409 && /Live is not open yet/.test(x.body?.detail ?? "") && jobs() === jobs0, x.body?.detail);
  x = await call("POST", `/attachments/${form}/draft-masters/plan`, { mode: "live" });
  ok("C3.4 L fail: the Live plan is refused too while the switch is off", x.status === 409, x.status);
  x = await call("POST", `/attachments/${form}/draft-masters`, { mode: "replay" });
  ok("C3.4 S fail: Saved with nothing recorded says so in plain words, US$0, no job", x.status === 409 && /No saved AI answer drafts this form edition/.test(x.body?.detail ?? "") && jobs() === jobs0, x.body?.detail);
  x = await call("POST", `/attachments/${att("imm5484e.pdf")}/draft-masters`, { mode: "replay" });
  ok("C3.4 S fail: a checklist is refused (it is drafted into document requirements)", x.status === 400 && /checklist/.test(x.body?.message ?? x.body?.detail ?? ""), x.body);
  x = await call("POST", `/attachments/${form}/draft-masters`, { mode: "draft" });
  ok("C3.4 S fail: a mode other than rules, Saved or Live is refused", x.status === 400, x.status);
  x = await call("POST", `/attachments/${form}/draft-masters`, { mode: "replay" }, "user-C");
  ok("C3.4 S fail: only an author drafts (a viewer is refused)", x.status === 403, x.status);

  // Recorded runs: the real launcher's stub pass of each committed job, turned into the live record a paid run leaves.
  const tool = await import("../tools/track-a-jobs.ts");
  const derived = (await tool.deriveJobs()).filter((d) => d.row === "C3.4");
  ok("C3.4 J pass: four committed C3.4 jobs, byte for byte the jobs the app's live rounds write now (IMM 5257 by its edition key, guide 5256 by Visitor visa)", derived.length === 4 && derived.every((d) => readFileSync(join(P2, "jobs", `${d.job.job_id}.json`), "utf8") === tool.jobText(d.job))
    && derived.filter((d) => d.job.combination === "edition:IMM 5257:09-2023" && d.job.known?.form_edition === "IMM 5257 (09-2023)").length === 2 && derived.filter((d) => d.job.combination === "vv.single").length === 2, derived.map((d) => d.job.job_id));
  let worst = 0;
  for (const d of derived) { const c = tool.costsOf(d.job); worst += c.worst_usd; ok(`C3.4 W pass: ${d.label}: worst US$${c.worst_usd.toFixed(2)} fits its budget US$${c.budget_usd.toFixed(2)} and the US$5 run cap; usual ~US$${c.usual_usd.toFixed(2)}`, c.fits_budget && c.under_run_cap && c.usual_usd > 0 && c.usual_usd < c.worst_usd, c); }
  ok(`C3.4 W pass: the four C3.4 runs together: worst US$${worst.toFixed(2)}, within the US$5.80 the PR states`, worst > 0 && worst <= 5.80, worst);
  const scratch = join(STUDIO, "var", `c34-check-ledger-${process.pid}`); mkdirSync(scratch, { recursive: true });
  keep(join(P2, "screening", "canary-digest.json"));
  const record = (jobId: string, answer: unknown, edition?: string) => {
    keep(join(RUNS, "stub-pass", `${jobId}.json`));
    const s = spawnSync(process.execPath, [join(P2, "launch.ts"), "--job", jobId, "--stub"], { cwd: ROOT, encoding: "utf8", timeout: 120_000, env: { ...process.env, P2_LEDGER_DIR: scratch } });
    const out = JSON.parse(s.stdout.trim().split("\n").pop() ?? "{}");
    if (out.run_file) written.push(out.run_file);
    const rec = JSON.parse(readFileSync(out.run_file, "utf8"));
    rec.caller = "live"; rec.raw_output = JSON.stringify(answer);
    rec.drafting_run.output_sha256 = rec.launch_evidence.output_sha256 = createHash("sha256").update(rec.raw_output).digest("hex");
    if (edition) rec.drafting_run.inputs.combination = edition;
    const f = join(RUNS, `${jobId}${MINE}${Math.random().toString(36).slice(2, 8)}.json`);
    writeFileSync(f, JSON.stringify(rec, null, 1) + "\n"); written.push(f);
    return f;
  };
  const [fd, fk, gd, gk] = derived.map((d) => d.job.job_id);
  // S fail first: the same answers recorded under another edition's key are never replayed for IMM 5257 (09-2023).
  const wrong = [record(fd, FORM_ANSWER, "edition:IMM 5257:01-2020"), record(fk, FORM_ANSWER, "edition:IMM 5257:01-2020")];
  x = await call("POST", `/attachments/${form}/draft-masters`, { mode: "replay" });
  ok("C3.4 S fail: Saved never uses a recorded run of another edition (refused, US$0)", x.status === 409 && jobs() === jobs0, x.body?.detail);
  for (const f of wrong) rmSync(f, { force: true });
  record(fd, FORM_ANSWER); record(fk, FORM_ANSWER); record(gd, GUIDE_ANSWER); record(gk, GUIDE_ANSWER);
  rmSync(scratch, { recursive: true, force: true });

  const plan = await call("POST", `/attachments/${form}/draft-masters/plan`, { mode: "replay" });
  ok("C3.4 S pass: the Saved plan finds both rounds of one recorded run, US$0", plan.status === 200 && plan.body?.saved?.available === true && plan.body?.saved?.files?.length === 2 && plan.body?.totals?.worst_usd === 0, plan.body?.saved);
  x = await call("POST", `/attachments/${form}/draft-masters`, { mode: "replay" });
  const again = await call("POST", `/attachments/${form}/draft-masters`, { mode: "replay" });
  ok("C3.4 S pass: Saved replays IMM 5257's recorded run into To review at US$0 (sections and answer lists by rules, checks and document types by AI)", x.status === 201 && x.body?.status === "COMPLETED" && x.body?.from === "replay" && x.body?.usd === 0 && x.body?.proposals > 2 && x.body?.group === "edition:IMM 5257 (09-2023)", { status: x.status, note: x.body?.message });
  ok("C3.4 S pass: a second click returns the edition's one draft (P-138), nothing added", again.status === 201 && again.body?.id === x.body?.id && again.body?.proposals === 0, again.body?.id);
  const q = await call("GET", `/review/proposals?group=${encodeURIComponent("edition:IMM 5257 (09-2023)")}`);
  const bands = q.body?.group?.bands ?? {}, items: any[] = [...(bands.ready ?? []), ...(bands.check ?? []), ...(bands.decide ?? [])];
  const kinds = Object.fromEntries(["section", "answer_list", "form_check", "document_type"].map((k) => [k, items.filter((i) => i.kind === k).length]));
  ok("C3.4 S pass: the edition's group in the one queue holds sections, answer lists, form checks and a document type", Object.values(kinds).every((n) => n > 0), kinds);
  const check = items.find((i) => i.kind === "form_check");
  ok("C3.4 S pass: the form check rests on IMM 5257 with its printed words found, Ready (both rounds agree), its examples unconfirmed, Sample", check?.band === "ready" && check?.source?.quote_found === true && /imm5257/i.test(check?.source?.file ?? "") && check?.basis === "SAMPLE" && (check?.readings?.draft?.payload?.examples ?? []).length === 3, check);
  ok("C3.4 S pass: the whole Saved draft spent US$0 (jobs and the shared ledger)", spent() === spent0 && new SpendLedger(LEDGER_DIR).committed() === ledger0, { spent: spent(), ledger: new SpendLedger(LEDGER_DIR).committed() });
  x = await call("POST", `/attachments/${form}/draft-masters`, { mode: "rules" });
  ok("C3.4 S pass: the rules pass after the AI draft returns the edition's one draft (no second set of sections)", x.status === 201 && x.body?.proposals === 0, x.body?.proposals);

  x = await call("POST", `/attachments/${guide}/draft-masters`, { mode: "replay" });
  const fromGuide = (await call("GET", `/review/proposals?group=${encodeURIComponent(`combination:${vv}`)}`)).body?.group?.bands ?? {};
  const gi: any[] = [...(fromGuide.ready ?? []), ...(fromGuide.check ?? []), ...(fromGuide.decide ?? [])].filter((i) => ["form_check", "cross_check"].includes(i.kind) && /5256/.test(i.source?.file ?? ""));
  ok("C3.4 S pass: Saved on Visitor visa's guide 5256 proposes its checks on the combination, resting on the guide's sentence, US$0", x.status === 201 && x.body?.usd === 0 && gi.length === 1 && gi[0].source?.quote_found === true, { status: x.status, n: gi.length, note: x.body?.message });
  ok("C3.4 S pass: the guide's Saved draft spent US$0", spent() === spent0 && new SpendLedger(LEDGER_DIR).committed() === ledger0);
})().catch((e) => { console.error("FAIL  unexpected", e); fail++; }).finally(() => {
  cleanUp();
  const out = join(STUDIO, "var", "suites"); mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "check_forms_c34_ai.json"), JSON.stringify({ at: new Date().toISOString(), pass, fail, log }, null, 1));
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
});
