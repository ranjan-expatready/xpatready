// C1.6 (Partial) — Each form line has a filing channel and each combination a filing method: four channels Online · PDF
// upload · Paper · Not needed, the signature as its own value, what IRCC accepts recorded per form edition and per IRCC
// account; the channel is proposed by the form finder's two AI rounds with IRCC's quoted line and confirmed by a second
// person as a "What IRCC accepts" change; the Programs card shows the filing method as a tag (PDF only · Online only ·
// Mixed, P-208). Decisions: P-61, P-62, P-140, P-143, P-208 (P-144 barcode forms, P-145 copies are C1.8's, not here).
// CAPABILITIES says "the contract still has three channels": out of date — contracts/forms.ts has the four and the
// signature. The rule "a Paper line is signed in pen" (AT-3) is P-143's, Sample until the immigration expert confirms.
// AT-10's US$0 route (proposal, named here): every saved real finder answer predates channels, so the check plants a
// Sample two-round finder answer for Visitor visa made with today's prompts (find-forms.v2 and its checker), each form
// carrying the channel Online through the IRCC secure account with Guide 5256's line "Most people must apply online."
// (canada.ca, recorded copy 27 Oct; IRCC-F04) — the same mechanism as C11.16 (a saved answer under the combination's
// key in p2/runs, removed at the end and on Ctrl-C). The channel values are Sample, not IRCC's word on each form.
// Sample combinations are found by their structure trail (acceptance/lib/pack1.ts): P-112's names, else today's keys.
// API and data level only (the screen parts are journeys J1/J2). US$0: the finder runs on saved answers (replay).
//   zsh tools/isolated.sh acc_b4 4567 start && ./node_modules/.bin/tsx acceptance/C1.6.test.ts 4567 xr_studio_acc_b4
// Expected today (main 931cb99a, run 1 Nov 2026 on an isolated copy, US$0): 23 pass, 0 fail — AT-10 passes on the
// planted Sample two-round answer: the finder's channel proposal is built. What is missing is a real saved two-round
// answer with channels (a founder-approved live run); until then the capability rests on Sample input.
// Exit: 0 all pass · 1 a check failed · 2 setup missing or refused (demo port or database, copy not reachable, sample).
import { channelProposal } from "../api/src/filing.ts";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { checkCopy, guard, needCombo, PLANT_MARK, plantRun, RUNS, sqlFor, stop } from "./lib/pack1.ts";

const PORT = Number(process.argv[2] ?? 4567), DB = process.argv[3] ?? "xr_studio_acc_b4";
guard(PORT, DB); // before anything reads the database or calls the copy (never the demo)
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
type R = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely
const call = async (method: string, path: string, body?: unknown, actor: string | null = "user-A"): Promise<R> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { ...(actor ? { "x-actor": actor } : {}), "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
};
const sql = sqlFor(DB);
const words = (b: any) => `${b?.detail ?? ""} ${b?.message ?? ""}`; // eslint-disable-line @typescript-eslint/no-explicit-any
const spend = () => sql("select coalesce(sum(cost_usd),0) from drafting_job");
type Line = { form: string; channel: string; signature_kind: string; channel_words: string };
const lineOf = async (combo: string, form: string) => ((await call("GET", `/combinations/${combo}/channels`)).body.lines as Line[]).find((l) => l.form === form);
const cardFiling = async (label: string) => { let f: string | null | undefined; const walk = (o: any) => { if (o && typeof o === "object") { if (o.label === label && "filing" in o && f === undefined) f = o.filing; for (const v of Object.values(o)) walk(v); } }; walk((await call("GET", "/catalogue")).body); return f; }; // eslint-disable-line @typescript-eslint/no-explicit-any

(async () => {
  // ── The rule itself (no server): the finder proposes, a person confirms (P-140, C-5).
  const q = "You must apply online through your IRCC secure account.", onPage = (x: string) => x === q;
  const both = channelProposal({ value: "ONLINE", account: "IRCC_SECURE_ACCOUNT", quote: q }, { value: "ONLINE", account: "IRCC_SECURE_ACCOUNT", quote: q }, q, onPage);
  ok("C1.6 AT-1 [IRCC-F04] pass: both AI rounds name Online through the same account with IRCC's line on the page → Ready (still for a second person)", both.outcome === "ready" && both.channels.join() === "ONLINE", both);
  const differ = channelProposal({ value: "ONLINE", account: "IRCC_SECURE_ACCOUNT", quote: q }, { value: "PDF_UPLOAD", account: "IRCC_SECURE_ACCOUNT", quote: q }, q, onPage);
  ok("C1.6 AT-1 fail case: the rounds differ → Check, with both readings kept", differ.outcome === "check" && /two rounds differ/.test(differ.why ?? ""), differ);
  const offPage = channelProposal({ value: "PAPER", account: "PAPER", quote: "Mail it to us." }, { value: "PAPER", account: "PAPER", quote: "Mail it to us." }, q, onPage);
  ok("C1.6 AT-1 [IRCC-F04] fail case: a quote that is not on IRCC's page proposes nothing (listed for a person)", offPage.outcome === "listed", offPage);

  // ── The copy and the sample.
  await checkCopy(PORT, DB);
  if ((await call("POST", "/demo/reset", { confirm: "RESET" })).status >= 300) stop("demo reset refused");
  if ((await call("POST", "/demo/load")).status !== 201) stop("the sample did not load");
  const wp = await needCombo(PORT, DB, "lmia_work_permit"), vv = await needCombo(PORT, DB, "visitor_visa");
  const spend0 = spend();

  // ── Four channels and the signature per line (P-143).
  const ch = (await call("GET", `/combinations/${wp}/channels`)).body as { filing_method: string; lines: Line[] };
  ok("C1.6 AT-2 pass: every line of With an LMIA has one of the four channels and its own signature value", ch.lines.length >= 5 && ch.lines.every((l) => ["ONLINE", "PDF_UPLOAD", "PAPER", "NOT_NEEDED"].includes(l.channel) && ["TYPED_NAME", "HAND_SCANNED", "PEN", "NONE"].includes(l.signature_kind)) && typeof ch.filing_method === "string", ch.lines.map((l) => [l.form, l.channel, l.signature_kind]));
  const s0 = await lineOf(wp, "IMM 5409");
  if (!s0) stop("With an LMIA has no IMM 5409 line");
  const paper = await call("PATCH", `/combinations/${wp}/forms/${encodeURIComponent("IMM 5409")}/channel`, { channel: "PAPER", signature: "PEN", from: s0!.channel, fromSignature: s0!.signature_kind });
  ok("C1.6 AT-3 pass: the author files IMM 5409 on Paper, signed in pen", paper.status === 200 && (await lineOf(wp, "IMM 5409"))?.channel === "PAPER" && (await lineOf(wp, "IMM 5409"))?.signature_kind === "PEN", paper.status);
  const misfit = await call("PATCH", `/combinations/${wp}/forms/${encodeURIComponent("IMM 5409")}/channel`, { channel: "PAPER", signature: "TYPED_NAME", from: "PAPER", fromSignature: "PEN" });
  ok("C1.6 AT-3 fail case: a typed name on a Paper line is 400 'does not fit'; the line keeps signed in pen", misfit.status === 400 && /does not fit a line filed as Paper/.test(words(misfit.body)) && (await lineOf(wp, "IMM 5409"))?.signature_kind === "PEN", misfit);
  const oldName = await call("PATCH", `/combinations/${wp}/forms/${encodeURIComponent("IMM 5409")}/channel`, { channel: "SIGNED_PDF_UPLOAD" });
  ok("C1.6 AT-4 fail case: the old 'Signed PDF upload' is refused with its new name (PDF upload, signed by hand and scanned)", oldName.status === 400 && /PDF upload, signed by hand and scanned/.test(words(oldName.body)), oldName);
  const stale = await call("PATCH", `/combinations/${wp}/forms/${encodeURIComponent("IMM 5409")}/channel`, { channel: "ONLINE", from: "PDF_UPLOAD" });
  ok("C1.6 AT-5 fail case: a choice made on an older view (from PDF upload, now Paper) is 409 and not saved", stale.status === 409 && /while you were choosing/.test(words(stale.body)) && (await lineOf(wp, "IMM 5409"))?.channel === "PAPER", stale);
  // C11.11 (QA-101): no route makes a checklist a form line any more (the sample's IMM 5488 is a source), so the check plants
  // one kept from before (test input, SQL, Sample) and removes it after.
  sql(`insert into combination_form select (jsonb_populate_record(null::combination_form, to_jsonb(cf) || jsonb_build_object('id', gen_random_uuid(), 'lineage_key', 'IMM 5488', 'gov_form_def_id', (select id from gov_form_def d where d.form_key='IMM 5488' and d.workspace_id=cf.workspace_id), 'version', 1, 'status', 'DRAFT', 'supersedes_id', null))).* from combination_form cf where cf.combination_id='${wp}' and cf.lineage_key='IMM 5707' order by cf.version desc limit 1`);
  const chk = await call("PATCH", `/combinations/${wp}/forms/${encodeURIComponent("IMM 5488")}/channel`, { channel: "PAPER", signature: "PEN" });
  sql(`delete from combination_form where combination_id='${wp}' and lineage_key='IMM 5488'`);
  ok("C1.6 AT-6 [IRCC-F06] fail case: a checklist line gets no channel (400 'it is not filed')", chk.status === 400 && /checklist: it is not filed/.test(words(chk.body)), chk);
  const asB = await call("PATCH", `/combinations/${wp}/forms/${encodeURIComponent("IMM 5409")}/channel`, { channel: "PDF_UPLOAD", from: "PAPER" }, "user-B");
  const asP = await call("PATCH", `/combinations/${wp}/forms/${encodeURIComponent("IMM 5409")}/channel`, { channel: "PDF_UPLOAD", from: "PAPER" }, "user-P");
  const asNone = await call("PATCH", `/combinations/${wp}/forms/${encodeURIComponent("IMM 5409")}/channel`, { channel: "PDF_UPLOAD", from: "PAPER" }, null);
  ok("C1.6 AT-7 roles: approver and client 403, nobody 401; the line stays Paper", asB.status === 403 && asP.status === 403 && asNone.status === 401 && (await lineOf(wp, "IMM 5409"))?.channel === "PAPER", [asB.status, asP.status, asNone.status]);

  // ── Filing method on the combination and the Programs card tag (P-208).
  const fm = (await call("GET", `/combinations/${wp}/channels`)).body.filing_method as string;
  const tagMixed = await cardFiling("With an LMIA");
  ok("C1.6 AT-8 pass: PDF upload lines plus one Paper line: the filing method and the Programs card tag say Mixed (card starts with 'Mixed')", /paper/i.test(fm) && typeof tagMixed === "string" && tagMixed.startsWith("Mixed"), { fm, tagMixed });
  await call("PATCH", `/combinations/${wp}/forms/${encodeURIComponent("IMM 5409")}/channel`, { channel: "PDF_UPLOAD", signature: "NONE", from: "PAPER", fromSignature: "PEN" });
  const tagPdf = await cardFiling("With an LMIA");
  ok("C1.6 AT-8 fail case: back to PDF upload only, the card tag is 'PDF only', not Mixed", tagPdf === "PDF only", tagPdf);
  const tags = new Set<string>(); const walk = (o: any) => { if (o && typeof o === "object") { if ("filing" in o && typeof o.filing === "string") tags.add(o.filing); for (const v of Object.values(o)) walk(v); } }; walk((await call("GET", "/catalogue")).body); // eslint-disable-line @typescript-eslint/no-explicit-any
  ok("C1.6 AT-8 pass: every card's tag is one of P-208's PDF only · Online only · Mixed… (or none when there are no forms)", [...tags].every((t) => /^(PDF only|Online only|Mixed\b)/.test(t)), [...tags]);

  // ── What IRCC accepts, per edition and per IRCC account, confirmed by a second person (P-140, P-143).
  const notNeededAny = await call("POST", `/library/forms/${encodeURIComponent("IMM 5409")}/accepts`, { account: "ANY", channels: ["NOT_NEEDED"], reason: "Acceptance test (Sample)." });
  ok("C1.6 AT-9 [IRCC-F04] fail case: Not needed for every account is 400 in words (it is said for one account)", notNeededAny.status === 400 && /one IRCC account/.test(JSON.stringify(notNeededAny.body)), notNeededAny);
  const noLine = await call("POST", `/library/forms/${encodeURIComponent("IMM 5409")}/accepts`, { account: "IRCC_SECURE_ACCOUNT", channels: ["PDF_UPLOAD"] });
  ok("C1.6 AT-9 fail case: no canada.ca line and no reason is 400 'Paste the canada.ca line … or say why'", noLine.status === 400 && /canada.ca line/.test(JSON.stringify(noLine.body)), noLine);
  const quote = "Sample quote for the acceptance test: upload the completed form to your account.";
  const prop = await call("POST", `/library/forms/${encodeURIComponent("IMM 5409")}/accepts`, { account: "IRCC_SECURE_ACCOUNT", channels: ["PDF_UPLOAD"], quote });
  const row = async () => ((await call("GET", "/library/forms/list?q=5409")).body.rows as { code: string; accepts_accounts: { account: string; channels: string[] }[]; accepts_waiting: boolean }[]).find((r) => r.code === "IMM 5409");
  const before = await row();
  ok("C1.6 AT-9 pass: the author's proposal waits for a second person; the library does not change yet", (prop.status === 201 || prop.status === 200) && prop.body.status === "WAITING" && before?.accepts_waiting === true && !(before?.accepts_accounts ?? []).some((a) => a.account === "IRCC_SECURE_ACCOUNT"), { prop: prop.body, before });
  const self = await call("POST", `/library/changes/${prop.body.id}/approve`, {});
  ok("C1.6 AT-9 fail case: the proposer cannot approve their own change (4xx); still waiting", self.status >= 400 && self.status < 500 && sql(`select status from library_change where id='${prop.body.id}'`) === "WAITING", self);
  const appr = await call("POST", `/library/changes/${prop.body.id}/approve`, {}, "user-B");
  const after = await row();
  ok("C1.6 AT-9 [IRCC-F04] pass: the second person approves: IMM 5409's current edition records PDF upload through the IRCC secure account", appr.status < 300 && (after?.accepts_accounts ?? []).some((a) => a.account === "IRCC_SECURE_ACCOUNT" && a.channels.join() === "PDF_UPLOAD"), { appr: appr.status, after: after?.accepts_accounts });
  const ed = sql("select e.edition_label from form_edition_accept a join form_edition e on e.id=a.form_edition_id join gov_form_def d on d.id=e.gov_form_def_id where d.form_key='IMM 5409' and a.account='IRCC_SECURE_ACCOUNT'");
  ok("C1.6 AT-9 pass: the record belongs to the form's current edition (IMM 5409 (01-2023))", ed === "IMM 5409 (01-2023)", ed);
  // The account's record now limits the line: on a combination filed through the IRCC secure account, Paper is refused.
  const acc0 = (await call("GET", `/combinations/${wp}/channels`)).body.account ?? null;
  const setAcc = await call("PATCH", `/combinations/${wp}/account`, { account: "IRCC_SECURE_ACCOUNT", from: acc0 });
  const notAccepted = await call("PATCH", `/combinations/${wp}/forms/${encodeURIComponent("IMM 5409")}/channel`, { channel: "PAPER", signature: "PEN", from: "PDF_UPLOAD" });
  ok("C1.6 AT-9 [IRCC-F04] fail case: through the IRCC secure account, a channel IRCC does not accept for IMM 5409 (Paper) is refused in words", setAcc.status < 300 && notAccepted.status === 400 && (await lineOf(wp, "IMM 5409"))?.channel === "PDF_UPLOAD", { setAcc: setAcc.status, notAccepted });

  // ── The finder proposes each form's channel from its two AI rounds (P-140), replayed at US$0.
  // Test input (Sample, see the header): a two-round finder answer for Visitor visa with today's prompts and a channel per form.
  const vvKey = sql(`select combination_key from combination where id='${vv}'`); // the key a saved finder answer is replayed for
  if (!vvKey) stop("Visitor visa has no combination key");
  const PROMPTS = join(RUNS, "..", "prompts"), shaOf = (f: string) => createHash("sha256").update(readFileSync(join(PROMPTS, f))).digest("hex");
  const QUOTE = "Most people must apply online.";
  const SAVED = ["studio-finder-forms-individual-visitors-visitor-visa-live-20261027t072426546z-4d8a0d.json", "studio-finder-forms-check-individual-visitors-visitor-visa-live-20261027t072500006z-a569fb.json"];
  SAVED.forEach((f, i) => {
    const r = JSON.parse(readFileSync(join(RUNS, f), "utf8"));
    const out = JSON.parse(r.raw_output);
    for (const form of out.forms) form.channel = /^IMM 5256$|^Guide/.test(form.code) ? null : { value: "ONLINE", account: "IRCC_SECURE_ACCOUNT", quote: QUOTE };
    r.raw_output = JSON.stringify(out); r.drafting_run.inputs.combination = vvKey;
    r.launch_evidence = { ...r.launch_evidence, template_sha256: shaOf(i ? "find-forms-check.v2.md" : "find-forms.v2.md"), schema_file: "find-forms-output.v2.schema.json", schema_sha256: shaOf("find-forms-output.v2.schema.json") };
    plantRun(`studio-finder-forms${i ? "-check" : ""}-pk1c16-live-20261101t00000000${i}z-${PLANT_MARK}.json`, r);
  });
  const plan = await call("POST", `/combinations/${vv}/forms/find/plan`, { mode: "replay" });
  if (plan.status >= 300 || !plan.body?.plan_sha256) stop(`the finder plan (replay) failed: ${plan.status}`);
  const run = await call("POST", `/combinations/${vv}/forms/find`, { mode: "replay", planSha256: plan.body.plan_sha256, idempotencyKey: `acc-c16-${Date.now()}` });
  let view: any = run.body; // eslint-disable-line @typescript-eslint/no-explicit-any
  for (let i = 0; i < 150 && ["RUNNING", "QUEUED"].includes(view?.status); i++) { await new Promise((r) => setTimeout(r, 400)); view = (await call("GET", `/combinations/${vv}/forms/find`)).body; }
  const found = sql(`select distinct cf.lineage_key from combination_form cf join gov_form_def d on d.id=cf.gov_form_def_id where cf.combination_id='${vv}' and cf.origin='AI_FOUND' and d.form_kind='data_form'`).split("\n").filter(Boolean);
  ok("setup: the finder (saved answers, US$0) attached Visitor visa's forms", found.length >= 3 && Number(spend()) === Number(spend0), { status: view?.status, found });
  const waitingOrRecorded = found.filter((code) => sql(`select count(*) from library_change where kind='form_accepts' and key='${code}' and status in ('WAITING','APPROVED') and (matches->>'source')='finder'`) !== "0"
    || sql(`select count(*) from form_edition_accept a join form_edition e on e.id=a.form_edition_id join gov_form_def d on d.id=e.gov_form_def_id where d.form_key='${code}'`) !== "0");
  ok("C1.6 AT-10 [IRCC-F04] pass: each form the finder attached (planted two-round answer, Sample) has a channel proposed from both AI rounds with IRCC's line, waiting for a second person (or already recorded in the library)", found.length > 0 && waitingOrRecorded.length === found.length, { found, proposed: waitingOrRecorded, finder_says: (view?.result?.channels ?? view?.channels ?? []).slice?.(0, 2) });
  ok("C1.6 AT-11 US$0: nothing in this file spent money", Number(spend()) === Number(spend0), [spend0, spend()]);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`FAIL  the check stopped: ${(e as Error).stack}`); process.exit(1); });
