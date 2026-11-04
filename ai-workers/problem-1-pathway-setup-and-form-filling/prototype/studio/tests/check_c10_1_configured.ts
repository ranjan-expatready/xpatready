// C10.1 the configured checkpoint (DEMO.md "Checkpoints" 2; plan screens/W1-reset-and-sample/c10.1-plan.md): Load sample
// six, then each DEMO.md row through the screens' services by the people who hold each duty. One check per row, and the
// rules it must not get round: the author never approves their own library items or release, an off-list copy is
// approved by a second person (X9a) and an older edition is never used, a held file whose edition cannot be read is never approved, an empty combination is never released, rows 7 and 17 say "not built yet"
// in plain words, no form waits for a paid run (IMM 5645 replays from its saved parts), no live AI call, Reset returns to blank. US$0.
//   zsh studio/tools/isolated.sh runtime_c101 4431 start && tsx studio/tests/check_c10_1_configured.ts 4431 xr_studio_runtime_c101
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { LEDGER_DIR } from "../../p2/policy.ts";

const PORT = Number(process.argv[2] ?? 4431), DB = process.argv[3] ?? "xr_studio_runtime_c101";
let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const n = (q: string) => Number(sql(q));
const call = async (method: string, path: string, body?: unknown) => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": "user-A", "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, body: await r.json().catch(() => null) };
};
// QA-90: the one shared spend ledger (p2/policy.ts LEDGER_DIR); not there yet = nothing spent.
const ledger = () => { const f = join(LEDGER_DIR, "spend.jsonl"); return existsSync(f) ? readFileSync(f, "utf8").length : 0; };
type Row = { row: string; title: string; status: string; shows: string; why: string | null };

(async () => {
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const before = ledger();
  const wrong = await call("POST", "/demo/load", { sample: "configured-everything" });
  ok("C10.1 fail: an unknown checkpoint name is refused with words, nothing loaded", wrong.status === 400 && /"configured"/.test(wrong.body?.message ?? "") && n(`select count(*) from combination`) === 0, wrong.body?.message);

  const l = await call("POST", "/demo/load", { sample: "configured" });
  if (l.status >= 300) { console.error("STOP  the configured checkpoint did not load", l.body); process.exit(2); }
  const rows = l.body.checkpoint as Row[];
  const r = (id: string) => rows.find((x) => x.row === id)!;
  console.log(`      loaded in ${l.body.seconds.toFixed(1)} s; timings ${JSON.stringify(l.body.timings)}`);
  ok("C10.1: the checkpoint answers one row per DEMO.md mechanism in the M2 gate (1–12 and 17), each with what it shows", ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "17"].every((id) => rows.some((x) => x.row === id && x.title.length > 10 && x.shows.length > 5)) && rows.length === 13, rows.map((x) => `${x.row} ${x.status}`));
  ok("C10.1: every row that is not done says why for a person (no field codes, no error names)", rows.filter((x) => ["partial", "waiting"].includes(x.status)).every((x) => (x.why ?? "").length > 20 && !/Error|undefined|null|prisma/i.test(x.why!)), rows.filter((x) => x.status !== "done").map((x) => x.why?.slice(0, 60)));

  // Row 1: the six's files through the intake; a held file whose edition cannot be read is never approved.
  ok("C10.1 row 1: the six's official files are read through the form intake (code, edition, checksum)", /official files read/.test(r("1").shows) && n(`select count(*) from source_attachment`) > 30, r("1").shows);
  // Row 1 (X9a): an off-list copy of IMM 5476 (11-2021) with a readable edition, held, its IRCC page recorded by the
  // uploader, approved by a second person; the files whose edition cannot be read stay held and are never approved.
  const copy = sql(`select sha256 || '|' || created_by || '|' || coalesce(ircc_page, '') || '|' || coalesce(edition_label, '') from intake_item where file_name = 'imm5476e-2021-from-email.pdf' and reason like 'Approved as a source by %' and status = 'DONE'`).split("|");
  const manifestHas = (hash: string) => (JSON.parse(readFileSync(join(import.meta.dirname, "..", "..", "..", "official-sources", "ircc", "manifest.json"), "utf8")).items as { sha256?: string }[]).some((i) => i.sha256 === hash);
  ok("C10.1 row 1 / X9a pass: an off-list copy of IMM 5476 (11-2021) was held, its IRCC page recorded by the author, and approved by the Approver (user-B)", r("1").status === "done" && copy[1] === "user-A" && /canada\.ca\/.*imm5476\.html$/.test(copy[2] ?? "") && copy[3] === "IMM 5476 (11-2021)"
    && n(`select count(*) from approved_source where sha256 = '${copy[0]}' and uploaded_by = 'user-A' and approved_by = 'user-B'`) === 1 && /approved by Approver/.test(r("1").shows), { shows: r("1").shows, copy });
  ok("C10.1 row 1 / X9a fail-guard: the copy really is off-list (its checksum is on no approved list) and is a different file from the official 2021 one", !!copy[0] && !manifestHas(copy[0]), copy[0]);
  ok("C10.1 row 1 / X9a fail: approved or not, an edition older than the library's is never used (set aside by the Approver, not in the library, nothing left on To review)", n(`select count(*) from form_edition where edition_label = 'IMM 5476 (11-2021)'`) === 0 && n(`select count(*) from intake_item where sha256 = '${copy[0]}' and status = 'HELD'`) === 0 && n(`select count(*) from intake_item where sha256 = '${copy[0]}' and outcome = 'refused' and reason like 'Set aside by Approver: %'`) === 1 && /set it aside: not used/.test(r("1").shows), r("1").shows);
  // #300 m4: the trail says the older edition was set aside (not used), never that an approved source was "rejected as a source".
  const trail = sql(`select action || '§' || summary from audit_event where entity = 'held file' and summary like '%IMM 5476 (11-2021)%' order by at`).split("\n").filter(Boolean);
  ok("C10.1 row 1 / m4 pass: after the approval, the audit trail reads \"set aside … (an edition not used)\" by the Approver", trail.some((l) => /^set aside§Approver set aside IMM 5476 \(11-2021\) \(an edition not used\)/.test(l)), trail);
  ok("C10.1 row 1 / m4 fail: the trail never says the approved copy was \"rejected … as a source\"", trail.length > 0 && !trail.some((l) => /^rejected§|rejected IMM 5476 \(11-2021\) as a source/.test(l)), trail);
  ok("C10.1 row 1 fail: a held file whose edition cannot be read stays held and is not approved (Break M4); the only approved file is the copy", n(`select count(*) from intake_item where status = 'HELD' and outcome = 'held'`) === Number(/(\d+) official files? stays?/.exec(r("1").why ?? "")?.[1] ?? 0) && n(`select count(*) from approved_source`) === 1, r("1").why);
  // Rows 3–4: saved answers replayed (US$0), decided by the author with a reason, one edit and one return kept visible.
  const jobs = n(`select count(*) from drafting_job where kind = 'field_map' and mode = 'REPLAY'`);
  // R-146, QA-163, the C11.8 live run (#746) and the C11.7 result (3 Nov): eighteen saved answers replay (IMM 5532's re-run,
  // the Visitor visa's IMM 5257, IMM 5669 and IMM 0008 DEP since the C11.7 paid runs; check_queue_tx.ts), IMM 5645's from its
  // four saved parts (check_forms_saved_parts.ts), so no form waits and row 3 is done. A lost or mismatched replay lowers
  // jobs and makes the row partial with the form named, so both sides fail.
  ok("C10.1 row 3: every saved AI field-map answer is replayed (US$0, the eighteen forms, IMM 5645 by its four saved parts); no form waits for the paid run", jobs === 18 && r("3").status === "done" && r("3").shows.startsWith(`${jobs} saved`) && r("3").why == null, r("3"));
  ok("C10.1 row 4: the author decides every replayed proposal with a reason, one edited and one returned, and the drafts are applied", n(`select count(*) from proposal_item where run_id is not null and status = 'waiting'`) === 0 && n(`select count(*) from proposal_item where choice = 'RETURNED' and decision_reason like 'Returned by the sample loader%'`) === 1 && n(`select count(*) from proposal_item where decision_reason like 'Edited by the sample loader%'`) === 1 && n(`select count(*) from drafting_job where kind = 'field_map' and status = 'APPLIED'`) === jobs, r("4").shows);
  ok("C10.1 row 4 fail: no proposal is decided without a person's name and reason", n(`select count(*) from proposal_item where choice is not null and (decided_by is null or coalesce(decision_reason, '') = '')`) === 0);
  // Row 5: every new library item approved by a second person, never by the author who accepted it.
  ok("C10.1 row 5: every new library item is approved by the Approver (user-B)", n(`select count(*) from library_change where status = 'WAITING'`) === 0 && n(`select count(*) from library_change`) > 0 && /approved by the Approver, not by the author/.test(r("5").shows), r("5").shows);
  ok("C10.1 row 5 fail: no library item is approved by the person who proposed it", n(`select count(*) from library_change where decided_by = proposed_by`) === 0);
  ok("C10.1 rows 6 and 8: Reset and the Smart questionnaire (SQR) and Preview tabs are named as built", r("6").status === "done" && r("8").status === "done");
  ok("C10.1 rows 7 and 17: not built yet, said in plain words (their lanes' functions are not on main)", r("7").status === "not built yet" && r("17").status === "not built yet" && /^Not built yet: /.test(r("7").shows) && /^Not built yet: /.test(r("17").shows), [r("7").shows, r("17").shows]);
  // Row 10: release through submit, SME sign-off and a different person; the validator's refusals said, empty never released.
  const released = sql(`select c.label || '§' || r.version || '§' || p.approver_id from config_release r join combination c on c.id = r.combination_id join pack_version p on p.id = r.pack_version_id`).split("\n").filter(Boolean);
  ok("C10.1 row 10: any release goes through submit by the author, SME sign-off by user-C and approval by user-B", released.every((x) => x.endsWith("§user-B")) && n(`select count(*) from review_submission where status = 'APPROVED' and submitted_by = 'user-A'`) === released.length && (released.length === 0 || n(`select count(*) from review_signoff where actor_id = 'user-C' and action = 'signed'`) > 0), released);
  // P-319 (review of #833, M2): the demo's form roles are set before the checkpoint releases, so each release's draft is
  // its release right after the load: no "Form changed" line nobody made.
  const releasedIds = sql("select distinct combination_id from config_release").split("\n").filter(Boolean);
  const drifted: string[] = [];
  for (const id of releasedIds) if ((await call("GET", `/combinations/${id}/review`)).body?.draft?.matches_release !== true) drifted.push(id);
  ok("C10.1 row 10 (P-319): every configured release's draft matches its release right after the load", drifted.length === 0, { released: releasedIds.length, drifted }); // none released (a blocked checkpoint) has nothing to drift
  ok("C10.1 row 10 fail: a combination with no form is never released as configured", n(`select count(*) from config_release r where not exists (select 1 from combination_form f where f.combination_id = r.combination_id)`) === 0 && /no form is on it yet/.test(r("10").why ?? ""), r("10").why?.slice(0, 200));
  ok("C10.1 row 10 / X9a: the validator's K1 words name a form field by its own caption, never its PDF path (IMM_5707[0].page1[0]…)", /\(K1\)/.test(r("10").why ?? "") && !/[A-Za-z0-9_]+\[\d+\]\./.test(r("10").why ?? "") && /for example "/.test(r("10").why ?? ""), r("10").why?.slice(0, 200));
  ok("C10.1 row 10 / X9a fail-guard: some undecided form fields here do have a raw path and no caption, so the words above are chosen, not lucky", n(`select count(*) from form_field_map where outcome = 'unresolved' and data_path ~ '\\[0\\]\\.' and coalesce(btrim(caption), '') = ''`) > 0);
  ok("C10.1 row 10 fail: a combination the validator refuses stays a draft and its row gives the validator's words", n(`select count(*) from config_release r join combination c on c.id = r.combination_id where c.label = 'Visitor visa'`) === 0 && /Visitor visa: Fix \d+ problems? before submitting/.test(r("10").why ?? ""), r("10").why?.slice(0, 200));
  // Rows 9, 11, 12: wait for release 1 of the Visitor visa and for the paid IMM 5257 run.
  ok("C10.1 rows 9, 11, 12: wait for the Visitor visa's release 1 and the paid IMM 5257 run, said for a person", ["9", "11", "12"].every((id) => r(id).status === "waiting") && /IMM 5257 has no saved field-map answer/.test(r("12").why ?? "") && n(`select count(*) from runtime_case`) === 0, ["9", "11", "12"].map((id) => r(id).why?.slice(0, 80)));
  ok("C10.1 (R-143): no live AI call, US$0, the spend ledger unchanged", ledger() === before && n(`select count(*) from drafting_job where mode = 'LIVE'`) === 0 && n(`select count(*) from ai_batch where mode = 'LIVE'`) === 0 && l.body.cost_usd === 0);
  ok("C10.1: the load reports its time step by step", ["form intake (read code, edition, checksum)", "form read (form fields)", "field-map review and apply", "review and release"].every((k) => typeof l.body.timings[k] === "number"), l.body.timings);
  const again = await call("POST", "/demo/load", { sample: "configured" });
  ok("C10.1 fail: loading the checkpoint twice is refused (Reset first), nothing doubled", again.status === 409 && n(`select count(*) from combination`) === 6, again.body?.message);
  // Row 6: Reset returns to blank.
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const left = ["combination", "proposal_item", "library_change", "canonical_field", "config_release", "review_submission", "drafting_job", "source_attachment"].map((t) => [t, n(`select count(*) from ${t}`)] as const).filter(([, c]) => c);
  ok("C10.1 row 6: Reset after the checkpoint returns to a blank workspace (no configuration row left)", !left.length, left);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
