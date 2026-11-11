// BK-14 (Bake plan row 36; lifts stand-in SI-6's "Visitor visa forms only"; P-319, P-425, P-449): the independent AI review
// on a Study permit (outside Canada) case, through the product's routes only, with no code made for it: the configured
// checkpoint releases the Study permit (Demo › Load the configured checkpoint, US$0); a case is opened and filled; its
// application form's run card is read from the case's release (its edition, its official text, what each box prints),
// Saved is not offered before a review of these values is recorded and Live stays off (409, nothing changed); then a
// MADE-UP saved review of exactly this sheet (written by this file into the copy's own folder, labelled test_fixture,
// never in p2/runs, never committed, never counted; tests/fixtures/c75-made-up-run.ts) replays into the case's findings on
// that form. Each rule with a passing and a failing case. No live call: STUDIO_*_LIVE is never set (P-175), US$0.
//   zsh studio/tools/isolated.sh rt_bk14 4491 start STUDIO_MADE_UP_REVIEW_RUNS=1 && tsx --tsconfig studio/api/tsconfig.json studio/tests/runtime/check_bk14_sp_review_api.ts 4491 xr_studio_rt_bk14
import * as m3 from "../../acceptance/lib/m3.ts";
import { answersFor, inputsOf, writeMadeUp, type Plan } from "../fixtures/c75-made-up-run.ts";
import { printedEditionParts } from "../../engine/rounds.ts";

const { call, sql, ok } = m3;
const AUTHOR = "user-A";
const words = (r: { body: any }) => String(r.body?.detail ?? r.body?.message ?? ""); // eslint-disable-line @typescript-eslint/no-explicit-any -- API bodies are read loosely in checks
(async () => {
  let sp = sql("select id from combination where combination_key='sp.outside'");
  if (!sp) {
    const l = await call("POST", "/demo/load", { sample: "configured" }, AUTHOR);
    if (l.status >= 300) { console.error("STOP  the configured checkpoint did not load", l.status, words(l)); process.exit(2); }
    sp = sql("select id from combination where combination_key='sp.outside'");
  }
  if (!sp) { console.error("STOP  no Study permit release on this copy"); process.exit(2); }
  // The Study permit's application form, as its release names it (never assumed here): the form its field maps print
  // that the release's form setup names first. Read from the released snapshot itself.
  const maps = JSON.parse(sql(`select (snapshot->'field_maps')::text from config_release where combination_id='${sp}' order by version desc limit 1`) ?? "[]") as { form_number: string; form_edition: string | null; inventory_file: string | null }[];
  const spend0 = sql("select count(*) from ai_batch");

  const c = await m3.openCase(sp, [{ role: "principal", name: "Sample Student S14", dob: m3.FIXED.dob }]);
  const P = c.subjects["Sample Student S14"];
  ok("setup: a Study permit case is opened, filled and confirmed by the case officer", !!c.id && !!P && await m3.fillEverything(c.id), { case: c.id });
  await m3.confirmAll(c.id, P); await m3.confirmAll(c.id, c.caseSubject);

  const forms = ((await call("GET", `/runtime/cases/${c.id}/forms`)).body?.forms ?? []) as { form: string; subject_id: string; draft: { written_now: number } }[];
  const mine = forms.filter((f) => f.subject_id === P && f.draft.written_now > 0).map((f) => f.form);
  const form = mine.find((f) => maps.some((m) => m.form_number === f && m.inventory_file)) ?? "";
  const map = maps.find((m) => m.form_number === form)!;
  ok("pass: the person's filled forms on this Study permit case include one its release maps with its official text", !!form && !!map?.form_edition, { mine, maps: maps.map((m) => m.form_number) });

  // ── the run card: chosen from the case's release, cost first, Saved not yet, Live off ──
  const r0 = await call("POST", `/runtime/cases/${c.id}/review-runs/plan`, { forms: [form], subject: P });
  const p0 = r0.body as Plan & { stand_in: string; stand_in_words: string; live_allowed: boolean; replay_available: boolean };
  ok(`pass (BK-14): the run card of the Study permit's ${form} reads its edition from the case's release, with what each box prints`,
    r0.status === 200 && p0.forms[0].form === form && p0.forms[0].edition === map.form_edition && p0.forms[0].lines.length > 0 && p0.forms[0].sheet.startsWith("prototype/p2/review-sheets/"), { status: r0.status, body: r0.body?.forms?.[0] ? { ...r0.body.forms[0], lines: r0.body.forms[0].lines.length } : r0.body });
  ok("pass: cost first; Saved not offered before a review of these values is recorded; Live off; the stand-in names no form family",
    p0.estimate.live_usd > 0 && p0.estimate.replay_usd === 0 && p0.replay_available === false && p0.live_allowed === false && p0.stand_in === "SI-6" && !/Visitor visa|forms only/.test(p0.stand_in_words), { est: p0.estimate, words: p0.stand_in_words });
  const findings = () => Number(sql(`select count(*) from review_finding where case_id='${c.id}' and source='ai'`) ?? -1);
  const rr = await call("POST", `/runtime/cases/${c.id}/review-runs`, { forms: [form], subject: P, mode: "replay", planSha256: p0.plan_sha256 });
  ok("fail: Saved with no recorded review of these values is refused (409), nothing added, US$0", rr.status === 409 && /No saved review/.test(String(rr.body?.title ?? "")) && findings() === 0, { status: rr.status, body: rr.body?.title });
  const rl = await call("POST", `/runtime/cases/${c.id}/review-runs`, { forms: [form], subject: P, mode: "live", planSha256: p0.plan_sha256 });
  ok("fail: Live is refused while live AI is off (409), nothing added, no AI batch", rl.status === 409 && rl.body?.title === "Live is off" && findings() === 0 && sql("select count(*) from ai_batch") === spend0, { status: rl.status, body: rl.body?.title });
  const other = maps.find((m) => !mine.includes(m.form_number))?.form_number ?? "IMM 0000";
  const rx = await call("POST", `/runtime/cases/${c.id}/review-runs/plan`, { forms: [other], subject: P });
  ok("fail: a form that is not this person's on the case is refused in words (422)", rx.status === 422 && /is not one of .*forms on this case/.test(words(rx)), { status: rx.status, words: words(rx) });

  // ── a made-up saved review of exactly this sheet replays into the case's findings on that form ──
  const ed = printedEditionParts(map.form_edition!)!;
  const { a, draft, check } = answersFor(p0);
  writeMadeUp(`bk14${process.pid}`, inputsOf(p0, map.inventory_file!.replace(/^.*\//, "")), draft, check, ed);
  const r1 = await call("POST", `/runtime/cases/${c.id}/review-runs/plan`, { forms: [form], subject: P });
  ok("pass: with a review of these values recorded (made up here, said on the card), Saved is offered", r1.status === 200 && r1.body?.replay_available === true && r1.body?.made_up === true, { status: r1.status, why: r1.body?.replay_why });
  const run = await call("POST", `/runtime/cases/${c.id}/review-runs`, { forms: [form], subject: P, mode: "replay", planSha256: r1.body?.plan_sha256 });
  const rows = JSON.parse(sql(`select coalesce(json_agg(json_build_object('form', form, 'field', field, 'agreement', agreement, 'replayed', replayed)), '[]')::text from review_finding where case_id='${c.id}' and source='ai'`) ?? "[]") as { form: string; field: string; agreement: string; replayed: boolean }[];
  ok(`pass (BK-14): the Saved review of the Study permit's ${form} adds its findings to that form, Replayed, High where both rounds agree, US$0`,
    run.status === 201 && run.body?.cost_usd === 0 && run.body?.forms?.[0]?.from === "replay" && run.body?.added === 2 && rows.length === 2 && rows.every((x) => x.form === form && x.replayed) && rows.some((x) => x.field === a.fact && x.agreement === "high"), { status: run.status, body: run.body?.note ?? run.body, rows });
  ok("pass: no AI batch and no spend from any of it (US$0)", sql("select count(*) from ai_batch") === spend0);
  process.exitCode = m3.rec.summary() ? 1 : 0;
})();
