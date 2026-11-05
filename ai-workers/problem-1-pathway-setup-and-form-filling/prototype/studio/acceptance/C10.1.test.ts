// Acceptance C10.1 (P-220, pack 3): the founder resets to blank or loads the configured checkpoint and sees DEMO.md rows
// 1–10 and 17 plus the thin family case (rows 11–12) with one Sample family (P-108, DEMO.md "Checkpoints" 2). Status:
// Partial (qa, 1 Nov); PR #113 (merged) built POST /demo/load {"sample":"configured"} answering one row per DEMO.md
// mechanism (its suite check_c10_1_configured.ts), so part A passes on main today and guards it; part B is the checkpoint as DEMO.md defines it ("A and B released (A release 1 all PDF;
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

  // Two loads at once load once (demo.ts: one load at a time).
  const [l, l2] = await Promise.all([call("POST", "/demo/load", { sample: "configured" }), new Promise<Awaited<ReturnType<typeof call>>>((res) => setTimeout(() => res(call("POST", "/demo/load", { sample: "configured" })), 200))]);
  ok("C10.1 fail: a second load sent while the first runs is refused (409), and only one checkpoint is loaded", l2.status === 409 && n(`select count(*) from combination`) === 6, { second: l2.status });
  ok("C10.1: the configured checkpoint loads (2xx) and answers its checkpoint rows", l.status < 300 && Array.isArray(l.body?.checkpoint), { status: l.status, message: l.body?.message });
  const rows: Row[] = Array.isArray(l.body?.checkpoint) ? l.body.checkpoint : [];
  const r = (id: string) => rows.find((x) => x.row === id);
  ok("C10.1: one row per DEMO.md mechanism of the M2 gate (1–12 and 17), each saying what it shows", rows.length === GATE.length && GATE.every((id) => (r(id)?.title.length ?? 0) > 10 && (r(id)?.shows.length ?? 0) > 5), rows.map((x) => `${x.row} ${x.status}`));
  ok("C10.1: a row that is not done (other than the Parked row 2, status out) says why for a person (no field codes, no error names)", rows.length > 0 && rows.filter((x) => !["done", "out"].includes(x.status)).every((x) => (x.why || x.shows).length > 20 && !/Error|undefined|null|prisma|\[0\]/i.test(x.why || x.shows)));
  ok("C10.1 row 1: the six's official files are read through the form intake (code, edition, checksum)", n(`select count(*) from source_attachment`) > 30 && n(`select count(*) from form_edition where sha256 is null`) === 0);
  ok("C10.1 row 1 (P-80): an off-list file was held, then approved by a second person (not its uploader)", n(`select count(*) from approved_source where approved_by <> uploaded_by`) >= 1 && n(`select count(*) from approved_source where approved_by = uploaded_by`) === 0, n(`select count(*) from approved_source`));
  // QA-144 slice 1: the rules pass's other answer lists stay on To review for a person; only replayed proposals are counted.
  ok("C10.1 rows 3–4 (P-138): saved AI answers replayed (REPLAY), and every replayed proposal decided by a named person with a reason", n(`select count(*) from drafting_job where mode = 'REPLAY'`) > 0 && n(`select count(*) from proposal_item p join drafting_job j on j.id = p.run_id where j.mode = 'REPLAY' and p.status = 'waiting'`) === 0 && n(`select count(*) from proposal_item where choice is not null and (decided_by is null or coalesce(decision_reason, '') = '')`) === 0 && n(`select count(*) from proposal_item where choice is not null`) > 0);
  ok("C10.1 row 5 fail (P-80, two people): no library item is approved by the person who proposed it", n(`select count(*) from library_change`) > 0 && n(`select count(*) from library_change where decided_by = proposed_by`) === 0 && n(`select count(*) from library_change where status = 'WAITING'`) === 0);
  ok("C10.1 row 10: at least one combination is released, and every release went through submit by the author, SME sign-off and approval by a different person", n(`select count(*) from config_release`) >= 1 && n(`select count(*) from config_release where approver_id = author_id or approver_id is null`) === 0 && n(`select count(*) from config_release r where not exists (select 1 from combination_form f where f.combination_id = r.combination_id)`) === 0);
  ok("C10.1 (R-143, P-175): no live AI call, US$0", n(`select count(*) from drafting_job where mode = 'LIVE'`) === 0 && n(`select count(*) from ai_batch where mode = 'LIVE'`) === 0 && (l.body?.cost_usd ?? -1) === 0);

  // ── Part B: the checkpoint as DEMO.md defines it (beyond #113) ──
  const vv = sql(`select id from combination where label = 'Visitor visa' and retired_at is null limit 1`);
  const lmia = sql(`select id from combination where label like 'With an LMIA%' and retired_at is null limit 1`);
  const releasesOf = (c: string) => c ? sql(`select version || '§' || snapshot::text from config_release where combination_id = '${c}' order by version`).split("\n").filter(Boolean) : [];
  const vvRel = releasesOf(vv);
  // Snapshot forms carry "channel" only when it is not PDF upload (engine/snapshot.ts).
  const channelsOf = (snap: string) => { try { return (JSON.parse(snap.slice(snap.indexOf("§") + 1)).forms as { channel?: string }[]).map((f) => f.channel ?? "PDF_UPLOAD"); } catch { return []; } };
  ok("C10.1 part B (DEMO.md checkpoint 2): Visitor visa (A) has release 1 with every form line PDF upload", vvRel.length >= 1 && channelsOf(vvRel[0]).length > 0 && channelsOf(vvRel[0]).every((c) => c === "PDF_UPLOAD"), vvRel.map(channelsOf));
  const formsOf = (rel: string | undefined) => { try { return JSON.parse(rel!.slice(rel!.indexOf("§") + 1)).forms as { form_number: string; channel?: string; signature?: string }[]; } catch { return []; } };
  const r2 = formsOf(vvRel[1]), f2 = (code: string) => r2.find((f) => f.form_number === code);
  // Tech lead on #798 (IRCC-P2-04a): filed online, the family information form is IMM 5645, not IMM 5707.
  ok("C10.1 part B (DEMO.md row 9, P-143): Visitor visa release 2: IMM 5257 Online, so IMM 5645 (not IMM 5707), IMM 5476 PDF upload signed by hand and scanned", f2("IMM 5257")?.channel === "ONLINE" && !!f2("IMM 5645") && !f2("IMM 5707") && (f2("IMM 5476")?.channel ?? "PDF_UPLOAD") === "PDF_UPLOAD" && f2("IMM 5476")?.signature === "HAND_SCANNED", r2.map((f) => `${f.form_number}:${f.channel ?? "PDF_UPLOAD"}:${f.signature ?? "NONE"}`));
  // Labelled B10 so a PR can name this step alone to gate B ("Capabilities: C10.1 (steps B10)"; QA-144 slice 2).
  ok("C10.1 B10 part B (DEMO.md checkpoint 2, row 10): With an LMIA (B) is released too (its reuse of A's facts, row 18, is C10.2's checkpoint 3)", releasesOf(lmia).length >= 1, releasesOf(lmia).length);
  // Labelled S10 so a PR can name this step alone to gate B ("Capabilities: C10.1 (steps S10)"; QA-144 slice 3): the study
  // permit (outside Canada) is set up from its forms and released by the checkpoint through the product's own duties.
  const sp = sql(`select id from combination where combination_key = 'sp.outside' and retired_at is null limit 1`);
  ok("C10.1 S10 row 10: the Study permit (outside Canada) has release 1, submitted by the author and approved by the Approver after the SME's sign-off", releasesOf(sp).length >= 1
    && n(`select count(*) from config_release where combination_id = '${sp}' and submitter_id = '${AUTHOR}' and approver_id = '${APPROVER}'`) >= 1 && n(`select count(*) from review_signoff where actor_id = '${SME}'`) >= 1, releasesOf(sp).length);
  // Labelled E10 so a PR can name this step alone to gate B ("Capabilities: C10.1 (steps E10)"; QA-144 slice 4, B79a):
  // Express Entry set up from its forms; Submit refuses it for no form field without a decision and no fact nobody is
  // asked (219 on main 86b721eac). E10b is its release: it waits on a ruling for IMM 0008 DEP, which prints no "Unknown"
  // marital status (#1050).
  const ee = sql(`select id from combination where combination_key = 'pnp.express_entry' and retired_at is null limit 1`);
  const eeWhy = (r("10")?.why ?? "").split(" · ").filter((x) => x.startsWith("Provincial nominees › Express Entry stream: ")).join(" · ");
  // Review m1 (#1050): the whole refusal, not row 10's first three problems: Submit asked again (it writes nothing when
  // it refuses; a released combination is not asked).
  const eeErrors = ee && !releasesOf(ee).length ? (((await call("POST", `/combinations/${ee}/submit`, { note: "C10.1 E10: what Submit still says" }, AUTHOR)).body?.errors ?? []) as { message: string }[]) : [];
  const undecided = eeErrors.filter((e) => /form fields? ha(s|ve) no decision|nobody is asked for it/.test(e.message));
  ok("C10.1 E10 row 7 and 10: Express Entry is set up from its forms, and Submit refuses it for no form field without a decision and no fact nobody is asked", !!ee && /Provincial nominees › Express Entry stream/.test(r("7")?.shows ?? "")
    && (releasesOf(ee).length >= 1 || (eeErrors.length > 0 && undecided.length === 0)), { refusals: eeErrors.length, undecided: undecided.length, first: (undecided[0] ?? eeErrors[0])?.message?.slice(0, 200) });
  ok("C10.1 E10b row 10: Express Entry has release 1, submitted by the author and approved by the Approver", releasesOf(ee).length >= 1 && n(`select count(*) from config_release where combination_id = '${ee}' and submitter_id = '${AUTHOR}' and approver_id = '${APPROVER}'`) >= 1, eeWhy.slice(0, 300));
  ok("C10.1 part B (DEMO.md row 10): each release is approved by the Approver after the SME's sign-off, never by the author", n(`select count(*) from config_release where approver_id <> '${APPROVER}'`) === 0 && n(`select count(*) from config_release`) >= 3 && n(`select count(*) from review_signoff where actor_id = '${SME}'`) >= 1 && n(`select count(*) from review_submission where submitted_by = '${AUTHOR}' and status = 'APPROVED'`) >= 3);
  // Row 11: the thin family case, one Sample family of four (DEMO.md "The story").
  const vvCase = vv ? sql(`select id from runtime_case where combination_id = '${vv}' order by created_at limit 1`) : "";
  const roles = vvCase ? sql(`select p.role || '§' || coalesce((select a.value_json #>> '{}' from client_canonical_answer a where a.subject_id = p.subject_id and a.canonical_field_key = 'person.date_of_birth' and a.superseded_by_id is null limit 1), '') from case_participant p where p.case_id = '${vvCase}' and p.applies order by p."order"`).split("\n").filter(Boolean).map((x) => x.split("§")) : [];
  const ageAt = (dob: string) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob); if (!m) return null; const t = new Date("2026-11-01"); let a = t.getUTCFullYear() - Number(m[1]); if (t.getUTCMonth() + 1 < Number(m[2]) || (t.getUTCMonth() + 1 === Number(m[2]) && t.getUTCDate() < Number(m[3]))) a--; return a; };
  const kids = roles.filter(([r]) => r === "child").map(([, d]) => ageAt(d));
  ok("C10.1 part B (DEMO.md row 11): a family case on Visitor visa release 1: principal applicant, travelling spouse, a child under 18 and a child 18 or over", roles.length === 4 && roles.filter(([r]) => r === "principal").length === 1 && roles.filter(([r]) => r === "spouse_or_partner").length === 1 && kids.length === 2 && kids.some((a) => a !== null && a < 18) && kids.some((a) => a !== null && a >= 18), roles);
  ok("C10.1 part B (DEMO.md row 11): the case's answers come from the one Sample family and every name is labelled Sample", vvCase !== "" && n(`select count(*) from client_canonical_answer where workspace_id = (select workspace_id from runtime_case where id = '${vvCase}')`) > 0 && n(`select count(*) from answer_subject s join case_participant p on p.subject_id = s.id where p.case_id = '${vvCase}' and s.label !~* 'sample|client a'`) === 0);
  // Row 12: IMM 5257 filled for the case on release 1, with its barcodes read back (C7.1, C7.2).
  const applicants = vvCase ? n(`select count(*) from case_participant where case_id = '${vvCase}' and applies and role in ('principal', 'spouse_or_partner', 'child')`) : 0;
  const filled = vvCase ? n(`select count(distinct i.subject_id) from form_instance i join config_release r on r.id = i.config_release_id where i.case_id = '${vvCase}' and i.form_number = 'IMM 5257' and i.status = 'GENERATED' and r.version = 1`) : 0;
  const readBack = vvCase ? n(`select count(*) from validated_copy v join form_instance i on i.id = v.form_instance_id where i.case_id = '${vvCase}' and i.form_number = 'IMM 5257' and v.read_back is not null`) : 0;
  ok("C10.1 part B (DEMO.md row 12, C7.1): IMM 5257 is generated for each applicant of the case, on release 1", applicants === 4 && filled === applicants, { applicants, filled });
  ok("C10.1 part B (DEMO.md row 12, C7.2): each IMM 5257 copy has a validated copy read back (Validate, P-171)", filled > 0 && readBack >= filled, { filled, readBack });
  ok("C10.1 part B (rows 7, 9, 11, 12, 17): every row of the gate except the Parked row 2 (P-102) is done", rows.length === GATE.length && rows.filter((x) => x.row !== "2").every((x) => x.status === "done") && (r("2")?.status === "out" || /parked/i.test(`${r("2")?.status} ${r("2")?.shows}`)), rows.filter((x) => x.status !== "done").map((x) => `${x.row} ${x.status}`));

  // Who may load and reset: the author only (demo.ts need(actor, "author")); case people and clients are refused.
  const denied = await Promise.all([call("POST", "/demo/load", { sample: "configured" }, "user-O"), call("POST", "/demo/reset", { confirm: "RESET" }, "user-P"), call("POST", "/demo/reset", { confirm: "RESET" }, "user-B")]);
  ok("C10.1 fail: a case officer, a client or the Approver cannot load or reset (403), nothing changed", denied.every((d) => d.status === 403) && n(`select count(*) from combination`) === 6, denied.map((d) => d.status));
  const again = await call("POST", "/demo/load", { sample: "configured" });
  ok("C10.1 fail: loading the checkpoint twice is refused (Reset first), nothing doubled", again.status === 409 && n(`select count(*) from combination`) === 6, again.body?.message);
  // Checkpoint 1: Reset to blank.
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const left = ["combination", "proposal_item", "library_change", "canonical_field", "config_release", "review_submission", "drafting_job", "source_attachment", "runtime_case", "form_instance"].map((t) => [t, n(`select count(*) from ${t}`)] as const).filter(([, c]) => c);
  ok("C10.1 checkpoint 1: Reset after the checkpoint returns to a blank workspace (no configuration or case row left)", !left.length, left);
  process.exit(summary() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
