// QA-165's last two (tech lead, Lead 35, on #1363) through the API on the configured checkpoint, US$0, live AI off, no SQL
// write. IMM 5257's Passport Question 5 (Taiwan PIN) and Question 6 (National Israeli passport) are each asked as their own
// question, in the form's words, only when the passport's country or territory of issue is the one the form's own script
// names (CR 330212: 203 "TWN (Taiwan)", 206 "ISR (Israel)"; samples/own-yes-no.json askedWhen, step 230):
//   T1 an Indian passport: neither question is shown, neither form field is written or waited on, the form is ready.
//   T2 a Taiwanese passport: the Taiwan question is shown (not the Israel one) and readiness waits on its answer (a fact to
//      answer, no longer "no question asks it yet"); answered and confirmed, the form field is written and the form is ready.
//   T3 an Israeli passport: the Israel question is shown, the Taiwan one hidden again (its answer kept and not used, so its
//      form field is not written); answered, the form is ready.
//   T4 the released map of each form field carries the form script's own words about when it is filled (so its question's
//      condition was confirmed on it from the form, B86), and taking the ask back (Undo) returns it to nothing filling it,
//      with the words it had before (none).
//   zsh studio/tools/isolated.sh qa165_tw 4452 start && tsx studio/tests/check_qa165_taiwan_israel_api.ts 4452 xr_studio_qa165_tw
import { readFileSync } from "node:fs";
import { request } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CLIENT, OFFICER, PORT, agent, answer, call, confirmAll, fillEverything, needVisitorVisa, ok, openCase, rec, sql, yearsAgo } from "../acceptance/lib/m3.ts";
import { OWN_YES_NO } from "../api/src/own-yes-no.ts";

const PASSPORT = "form1[0].Page2[0].MaritalStatus[0].SectionA[0].Passport[0]";
const TAIWAN = `${PASSPORT}.TaiwanPIN[0]`, ISRAEL = `${PASSPORT}.IsraelPassportIndicator[0]`;
const STUDIO = join(dirname(fileURLToPath(import.meta.url)), "..");
const meaningOf = (box: string) => OWN_YES_NO["vv.single"].boxes.find((b) => b.dataPath === box)!.meaning;
/** Demo › Load the configured checkpoint, as the author (node:http: the load outlasts fetch's header wait). */
const post = (path: string, body: unknown, ms: number) => new Promise<number>((done) => {
  const data = JSON.stringify(body);
  const rq = request({ host: "127.0.0.1", port: PORT, path: `/api${path}`, method: "POST", timeout: ms, headers: { "content-type": "application/json", "x-actor": "user-A", "content-length": Buffer.byteLength(data) } }, (r) => { r.resume(); r.on("end", () => done(r.statusCode ?? 0)); });
  rq.on("timeout", () => rq.destroy()); rq.on("error", () => done(0)); rq.end(data);
});
type Q = { subjectId: string; fact: string; meaning: string; value_type: string; hidden: boolean; fills: { form: string }[]; answer: { value: unknown } | null };
type Missing = { fact: string; label: string; reason: string; why?: string };
type FormRow = { form: string; subject_id: string; readiness: { ready: boolean; missing: Missing[] }; fields_open: { box: string; reason: string }[] };

(async () => {
  if (await post("/demo/reset", { confirm: "RESET" }, 300_000) >= 300 || await post("/demo/load", { sample: "configured" }, 1_200_000) >= 300) { console.error("STOP  the configured checkpoint did not load"); process.exit(2); }
  const c = await openCase(needVisitorVisa(), [{ role: "principal", name: "Sample Client P", dob: yearsAgo(40) }]);
  const P = c.subjects["Sample Client P"];
  await fillEverything(c.id); // the Sample family's answers: an Indian passport (samples/sample-family-imm5257.json)
  const qs = async () => ((await agent(c.id)).sections as { questions: Q[] }[]).flatMap((s) => s.questions).filter((q) => q.subjectId === P);
  const forms = async () => ((await call("GET", `/runtime/cases/${c.id}/forms`, undefined, OFFICER)).body.forms as FormRow[]).find((f) => f.form === "IMM 5257" && f.subject_id === P)!;
  const qOf = (all: Q[], box: string) => all.find((q) => q.meaning === meaningOf(box));
  const hidden = (q: Q | undefined) => !q || q.hidden; // a hidden question is left off the list or marked hidden
  const waits = (f: FormRow, fact: string | undefined) => !!fact && f.readiness.missing.some((m) => m.fact === fact && m.reason !== "left empty on the form");
  // Left empty with nothing to answer (a form field "needs an answer" points at its question, which is being waited on).
  const empty = (f: FormRow, box: string) => f.readiness.missing.some((m) => m.fact === `box:${box}`) || f.fields_open.some((o) => o.box === box && o.reason !== "needs an answer");
  const asksFor = (f: FormRow, box: string) => f.fields_open.some((o) => o.box === box && o.reason === "needs an answer");
  // What a copy made now writes (IMM 5257 is filed Online here, so its copy is "not for filing" but filled from the same
  // confirmed facts, P-145): its request file's values, read only (as check_c72_imm5257_fill.ts reads them).
  let n = 0;
  const written = async () => {
    const g = await call("POST", `/runtime/cases/${c.id}/forms/IMM%205257/${P}/generate`, { idempotencyKey: `qa165tw-${Date.now()}-${n++}` }, OFFICER);
    const copy = String(g.body?.copy?.id ?? g.body?.id ?? "");
    for (let i = 0; i < 120; i++) { const st = (await call("GET", `/runtime/form-copies/${copy}`, undefined, OFFICER)).body?.status; if (st === "GENERATED" || st === "FAILED") break; await new Promise((x) => setTimeout(x, 1000)); }
    const path = sql(`select path from form_instance where id = '${copy}'`);
    return path ? (JSON.parse(readFileSync(join(STUDIO, "..", "..", "..", "..", path.replace(/\.pdf$/, ".request.json")), "utf8")).values as Record<string, string>) : {};
  };

  // T1: an Indian passport.
  let all = await qs(), tw = qOf(all, TAIWAN), il = qOf(all, ISRAEL), f = await forms();
  const country = all.find((q) => q.fact === "person.passport_country_of_issue")?.answer?.value;
  let v = await written();
  ok("C7.2 T1 pass: an Indian passport shows neither question, and IMM 5257 is ready with neither form field written or waited on", country === "IND" && hidden(tw) && hidden(il) && f.readiness.ready && !empty(f, TAIWAN) && !empty(f, ISRAEL) && !waits(f, tw?.fact) && !waits(f, il?.fact) && !v[TAIWAN] && !v[ISRAEL], { country, hidden: [hidden(tw), hidden(il)], missing: f.readiness.missing, written: [v[TAIWAN] ?? null, v[ISRAEL] ?? null] });

  // T2: a Taiwanese passport (ISO "TWN", the form's code 203).
  await answer(c.id, P, "person.passport_country_of_issue", "TWN", CLIENT); await confirmAll(c.id, P);
  all = await qs(); tw = qOf(all, TAIWAN); il = qOf(all, ISRAEL); f = await forms();
  ok("C7.2 T2 setup: the Taiwan question is its own Yes/No library field, read by IMM 5257's Taiwan PIN form field", !!tw && tw.value_type === "yes_no" && tw.fact !== "person.passport_country_of_issue" && tw.fills.some((x) => x.form === "IMM 5257"), tw && { fact: tw.fact, type: tw.value_type, fills: tw.fills });
  ok("C7.2 T2 fail: a Taiwanese passport shows the Taiwan question (not the Israel one), and readiness waits on its answer (its form field \"needs an answer\"), not on an empty form field", !hidden(tw) && hidden(il) && !f.readiness.ready && waits(f, tw?.fact) && asksFor(f, TAIWAN) && !empty(f, TAIWAN) && !empty(f, ISRAEL), { hidden: [hidden(tw), hidden(il)], missing: f.readiness.missing });
  const a = await answer(c.id, P, tw?.fact ?? "", true, CLIENT); await confirmAll(c.id, P);
  f = await forms();
  v = await written();
  ok("C7.2 T2 pass: answered Yes and confirmed, the Taiwan form field is written Y (the form's own Yes code) and IMM 5257 is ready", a.status < 300 && f.readiness.ready && !empty(f, TAIWAN) && v[TAIWAN] === "Y" && !v[ISRAEL], { status: a.status, missing: f.readiness.missing, written: [v[TAIWAN] ?? null, v[ISRAEL] ?? null] });

  // T3: an Israeli passport (ISO "ISR", the form's code 206): the Taiwan answer is kept and not used.
  await answer(c.id, P, "person.passport_country_of_issue", "ISR", CLIENT); await confirmAll(c.id, P);
  all = await qs(); tw = qOf(all, TAIWAN); il = qOf(all, ISRAEL); f = await forms();
  ok("C7.2 T3 setup: the Israel question is its own Yes/No library field, read by IMM 5257's Israel passport form field", !!il && il.value_type === "yes_no" && il.fact !== tw?.fact && il.fills.some((x) => x.form === "IMM 5257"), il && { fact: il.fact, type: il.value_type });
  ok("C7.2 T3 fail: an Israeli passport shows the Israel question, hides the Taiwan one again, and waits on the Israel answer", hidden(tw) && !hidden(il) && !f.readiness.ready && waits(f, il?.fact) && !waits(f, tw?.fact) && !empty(f, TAIWAN), { hidden: [hidden(tw), hidden(il)], missing: f.readiness.missing });
  const b = await answer(c.id, P, il?.fact ?? "", false, CLIENT); await confirmAll(c.id, P);
  f = await forms();
  v = await written();
  ok("C7.2 T3 pass: answered No and confirmed, the Israel form field is written N and IMM 5257 is ready; the hidden Taiwan answer is kept, not written or waited on", b.status < 300 && f.readiness.ready && !empty(f, ISRAEL) && !empty(f, TAIWAN) && v[ISRAEL] === "N" && !v[TAIWAN], { status: b.status, missing: f.readiness.missing, written: [v[TAIWAN] ?? null, v[ISRAEL] ?? null] });
  // T4: the map's words, and Undo (the last step: it changes the configuration).
  const ed = sql(`select id from form_edition where edition_label = 'IMM 5257 (09-2023)' and channel = 'PDF'`);
  const row = (box: string, status: string) => sql(`select outcome || '|' || coalesce(condition, '') || '|' || coalesce(condition_rule::text, '') from form_field_map where form_edition_id = '${ed}' and data_path = '${box}' and status = '${status}' order by version desc limit 1`) ?? "";
  const [twOut, twWords, twRule] = row(TAIWAN, "PUBLISHED").split("|"), [ilOut, ilWords] = row(ISRAEL, "PUBLISHED").split("|");
  ok("C7.2 T4 pass: each released map carries the script's words (the country form field and the form's own choice) and holds its question's condition", twOut === "mapped" && twWords === 'Only when CountryofIssue[0] holds 203 ("TWN (Taiwan)"): the form\'s own script requires it only then.' && /"value": "TWN"/.test(twRule ?? "") && ilOut === "mapped" && /holds 206 \("ISR \(Israel\)"\)/.test(ilWords ?? ""), { taiwan: row(TAIWAN, "PUBLISHED"), israel: row(ISRAEL, "PUBLISHED") });
  const undo = await call("POST", `/editions/${ed}/form-fields/own-question/undo`, { dataPath: TAIWAN }, "user-A");
  const [dOut, dWords] = row(TAIWAN, "DRAFT").split("|");
  // Before step 140's ask the row had no decision ("unresolved"); a B86 condition approved on it is a second person's own
  // decision and stays (Undo never rolls back another door's change, review M1 on B116).
  ok("C7.2 T4 fail: taken back (Undo), the Taiwan form field returns to nothing filling it, with no words about when it is filled, as before the ask", undo.status < 300 && (dOut === "unresolved" || dOut === "by_hand") && dWords === "", { status: undo.status, draft: row(TAIWAN, "DRAFT") });
  process.exitCode = rec.summary() ? 1 : 0;
})().catch((e) => { console.error(e); process.exit(1); });
