// Acceptance C10.1 (P-220, pack 3): the founder resets to blank or loads the configured checkpoint and sees DEMO.md rows
// 1–10 and 17 plus the thin family case (rows 11–12) with one Sample family (P-108, DEMO.md "Checkpoints" 2). Status
// today: Not built on main. PR #113 promises POST /demo/load {"sample":"configured"} answering one row per DEMO.md
// mechanism, with rows 9, 11 and 12 "waiting" and 7 and 17 "not built yet" (its suite check_c10_1_configured.ts).
// Part A is what #113 promises; part B is the checkpoint as DEMO.md defines it ("A and B released (A release 1 all PDF;
// A release 2 mixed) … the thin family case on release 1 with IMM 5257 filled") and stays red after #113 until the
// rows it waits on are built. No live AI (US$0): AI in a checkpoint is saved answers replayed (DEMO.md).
//   zsh studio/tools/isolated.sh accept 4448 start && tsx studio/acceptance/C10.1.test.ts 4448 xr_studio_accept
import { client, recorder } from "../tests/runtime/api.ts";

const PORT = Number(process.argv[2] ?? 4448), DB = process.argv[3] ?? "xr_studio_accept";
const { call, sql } = client(PORT, DB);
const { ok, summary } = recorder();
const n = (q: string) => Number(sql(q) || 0);
type Row = { row: string; title: string; status: string; shows: string; why: string | null };
const GATE = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "17"];
const AUTHOR = "user-A", SME = "user-C", APPROVER = "user-B";

(async () => {
  // ── Part A: what PR #113 promises ──
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const wrong = await call("POST", "/demo/load", { sample: "configured-everything" });
  ok("C10.1 fail: an unknown checkpoint name is refused with words naming \"configured\", nothing loaded", wrong.status === 400 && /configured/.test(wrong.body?.message ?? "") && n(`select count(*) from combination`) === 0, { status: wrong.status, message: wrong.body?.message });
  if (n(`select count(*) from combination`) > 0) await call("POST", "/demo/reset", { confirm: "RESET" });

  const l = await call("POST", "/demo/load", { sample: "configured" });
  ok("C10.1: the configured checkpoint loads (2xx) and answers its checkpoint rows", l.status < 300 && Array.isArray(l.body?.checkpoint), { status: l.status, message: l.body?.message });
  const rows: Row[] = Array.isArray(l.body?.checkpoint) ? l.body.checkpoint : [];
  const r = (id: string) => rows.find((x) => x.row === id);
  ok("C10.1: one row per DEMO.md mechanism of the M2 gate (1–12 and 17), each saying what it shows", rows.length === GATE.length && GATE.every((id) => (r(id)?.title.length ?? 0) > 10 && (r(id)?.shows.length ?? 0) > 5), rows.map((x) => `${x.row} ${x.status}`));
  ok("C10.1: a row that is not done says why for a person (no field codes, no error names)", rows.length > 0 && rows.filter((x) => x.status !== "done").every((x) => (x.why || x.shows).length > 20 && !/Error|undefined|null|prisma|\[0\]/i.test(x.why || x.shows)));
  ok("C10.1 row 1: the six's official files are read through the form intake (code, edition, checksum)", n(`select count(*) from source_attachment`) > 30 && n(`select count(*) from form_edition where sha256 is null`) === 0);
  ok("C10.1 rows 3–4 (P-138): saved AI answers replayed (REPLAY), and every replayed proposal decided by a named person with a reason", n(`select count(*) from drafting_job where mode = 'REPLAY'`) > 0 && n(`select count(*) from proposal_item where run_id is not null and status = 'waiting'`) === 0 && n(`select count(*) from proposal_item where choice is not null and (decided_by is null or coalesce(decision_reason, '') = '')`) === 0 && n(`select count(*) from proposal_item where choice is not null`) > 0);
  ok("C10.1 row 5 fail (P-80, two people): no library item is approved by the person who proposed it", n(`select count(*) from library_change`) > 0 && n(`select count(*) from library_change where decided_by = proposed_by`) === 0 && n(`select count(*) from library_change where status = 'WAITING'`) === 0);
  ok("C10.1 row 10 fail: every release went through submit by the author, SME sign-off and approval by a different person", n(`select count(*) from config_release where approver_id = author_id or approver_id is null`) === 0 && n(`select count(*) from config_release r where not exists (select 1 from combination_form f where f.combination_id = r.combination_id)`) === 0);
  ok("C10.1 (R-143, P-175): no live AI call, US$0", n(`select count(*) from drafting_job where mode = 'LIVE'`) === 0 && n(`select count(*) from ai_batch where mode = 'LIVE'`) === 0 && (l.body?.cost_usd ?? -1) === 0);

  // ── Part B: the checkpoint as DEMO.md defines it (beyond #113) ──
  const vv = sql(`select id from combination where label = 'Visitor visa' and retired_at is null limit 1`);
  const lmia = sql(`select id from combination where label like 'With an LMIA%' and retired_at is null limit 1`);
  const releasesOf = (c: string) => c ? sql(`select version || '§' || snapshot::text from config_release where combination_id = '${c}' order by version`).split("\n").filter(Boolean) : [];
  const vvRel = releasesOf(vv);
  // Snapshot forms carry "channel" only when it is not PDF upload (engine/snapshot.ts).
  const channelsOf = (snap: string) => { try { return (JSON.parse(snap.slice(snap.indexOf("§") + 1)).forms as { channel?: string }[]).map((f) => f.channel ?? "PDF_UPLOAD"); } catch { return []; } };
  ok("C10.1 part B (DEMO.md checkpoint 2): Visitor visa (A) has release 1 with every form line PDF upload", vvRel.length >= 1 && channelsOf(vvRel[0]).length > 0 && channelsOf(vvRel[0]).every((c) => c === "PDF_UPLOAD"), vvRel.map(channelsOf));
  ok("C10.1 part B (DEMO.md row 9): Visitor visa release 2 is mixed (an Online or Signed PDF upload line beside PDF upload lines)", vvRel.length >= 2 && new Set(channelsOf(vvRel[1])).size >= 2, vvRel.slice(1).map(channelsOf));
  ok("C10.1 part B (DEMO.md checkpoint 2, row 10): With an LMIA (B) is released too (its reuse of A's facts, row 18, is C10.2's checkpoint 3)", releasesOf(lmia).length >= 1, releasesOf(lmia).length);
  ok("C10.1 part B (DEMO.md row 10): each release is approved by the Approver after the SME's sign-off, never by the author", n(`select count(*) from config_release where approver_id <> '${APPROVER}'`) === 0 && n(`select count(*) from config_release`) >= 3 && n(`select count(*) from review_signoff where actor_id = '${SME}'`) >= 1 && n(`select count(*) from review_submission where submitted_by = '${AUTHOR}' and status = 'APPROVED'`) >= 3);
  // Row 11: the thin family case, one Sample family of four (DEMO.md "The story").
  const vvCase = vv ? sql(`select id from runtime_case where combination_id = '${vv}' order by created_at limit 1`) : "";
  ok("C10.1 part B (DEMO.md row 11): a family case on Visitor visa release 1 exists, with four people (applicant, spouse, a child under 18, a child 18 or over)", vvCase !== "" && n(`select count(*) from case_participant where case_id = '${vvCase}' and applies`) === 4);
  ok("C10.1 part B (DEMO.md row 11): the case's answers come from the one Sample family and every name is labelled Sample", vvCase !== "" && n(`select count(*) from client_canonical_answer where workspace_id = (select workspace_id from runtime_case where id = '${vvCase}')`) > 0 && n(`select count(*) from answer_subject s join case_participant p on p.subject_id = s.id where p.case_id = '${vvCase}' and s.label !~* 'sample|client a'`) === 0);
  // Row 12: IMM 5257 filled for the case on release 1, with its barcodes read back (C7.1, C7.2).
  ok("C10.1 part B (DEMO.md row 12): IMM 5257 is filled for each applicant of the case, on release 1", vvCase !== "" && n(`select count(*) from form_instance where case_id = '${vvCase}' and form_number = 'IMM 5257' and status not in ('FAILED', 'ERROR')`) >= 1 && n(`select count(*) from form_instance i join config_release r on r.id = i.config_release_id where i.case_id = '${vvCase}' and r.version = 1`) >= 1);
  ok("C10.1 part B (rows 7, 9, 11, 12, 17): every row of the gate except the Parked row 2 (P-102) is done", rows.length === GATE.length && rows.filter((x) => x.row !== "2").every((x) => x.status === "done") && /parked/i.test(`${r("2")?.status} ${r("2")?.shows}`), rows.filter((x) => x.status !== "done").map((x) => `${x.row} ${x.status}`));

  const again = await call("POST", "/demo/load", { sample: "configured" });
  ok("C10.1 fail: loading the checkpoint twice is refused (Reset first), nothing doubled", again.status === 409 && n(`select count(*) from combination`) === 6, again.body?.message);
  // Checkpoint 1: Reset to blank.
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const left = ["combination", "proposal_item", "library_change", "canonical_field", "config_release", "review_submission", "drafting_job", "source_attachment", "runtime_case", "form_instance"].map((t) => [t, n(`select count(*) from ${t}`)] as const).filter(([, c]) => c);
  ok("C10.1 checkpoint 1: Reset after the checkpoint returns to a blank workspace (no configuration or case row left)", !left.length, left);
  process.exit(summary() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
