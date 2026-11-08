// QA-165 (#1318 review M1, M2, M3) through the API on the configured checkpoint, US$0, live AI off, no SQL write:
//   R4 (M1) a field IRCC's field list marks required but whose own form script requires it only for some answers (IMM 5257's
//      Taiwan PIN and Israel passport boxes, by the passport's country of issue; samples/form-script-requirements.json) holds
//      readiness back only when that answer is given: an Indian passport lists neither, a Taiwanese passport the Taiwan PIN.
//   R5 (M3) GET …/forms and the case's prepare view (Ready to file) read the same readiness (formReadinessOf, which locking a
//      copy also calls): the same form fields, on both.
//   R6 (M2) a mandatory box left empty never makes locking a dead end: the lock is refused for its own reasons (the form's
//      trial, Validate), never as "facts to answer"; the card counts facts and empty form fields apart.
//   zsh studio/tools/isolated.sh qa165_paths 4452 start && tsx studio/tests/check_qa165_readiness_paths_api.ts 4452 xr_studio_qa165_paths
import { request } from "node:http";
import { CLIENT, OFFICER, PORT, agent, answer, call, confirmAll, fillEverything, needVisitorVisa, ok, openCase, prepare, rec, yearsAgo } from "../acceptance/lib/m3.ts";


const TAIWAN = "form1[0].Page2[0].MaritalStatus[0].SectionA[0].Passport[0].TaiwanPIN[0]", ISRAEL = "form1[0].Page2[0].MaritalStatus[0].SectionA[0].Passport[0].IsraelPassportIndicator[0]";
/** Demo › Load the configured checkpoint, as the author (node:http: the load outlasts fetch's header wait). */
const post = (path: string, body: unknown, ms: number) => new Promise<number>((done) => {
  const data = JSON.stringify(body);
  const rq = request({ host: "127.0.0.1", port: PORT, path: `/api${path}`, method: "POST", timeout: ms, headers: { "content-type": "application/json", "x-actor": "user-A", "content-length": Buffer.byteLength(data) } }, (r) => { r.resume(); r.on("end", () => done(r.statusCode ?? 0)); });
  rq.on("timeout", () => rq.destroy()); rq.on("error", () => done(0)); rq.end(data);
});
type Missing = { fact: string; label: string; reason: string; why?: string };
type FormRow = { form: string; subject_id: string; readiness: { ready: boolean; missing: Missing[] }; fields_open: { box: string }[] };

(async () => {
  if (await post("/demo/reset", { confirm: "RESET" }, 300_000) >= 300 || await post("/demo/load", { sample: "configured" }, 1_200_000) >= 300) { console.error("STOP  the configured checkpoint did not load"); process.exit(2); }
  const c = await openCase(needVisitorVisa(), [{ role: "principal", name: "Sample Client P", dob: yearsAgo(40) }]);
  const P = c.subjects["Sample Client P"];
  await fillEverything(c.id); // the Sample family's answers: an Indian passport (samples/sample-family-imm5257.json)
  const forms = async () => ((await call("GET", `/runtime/cases/${c.id}/forms`, undefined, OFFICER)).body.forms as FormRow[]).find((f) => f.form === "IMM 5257" && f.subject_id === P)!;
  const boxes = (f: FormRow) => f.readiness.missing.filter((m) => m.reason === "left empty on the form").map((m) => m.fact.replace(/^box:/, ""));
  const country = (await agent(c.id)).sections.flatMap((s: { questions: { subjectId: string; fact: string; answer: { value: unknown } | null }[] }) => s.questions).find((q: { subjectId: string; fact: string }) => q.subjectId === P && q.fact === "person.passport_country_of_issue")?.answer?.value;
  let f = await forms();
  ok("C7.2 R4 pass (#1318 M1): an Indian passport: IMM 5257's script requires neither the Taiwan PIN nor the Israel passport box, so readiness lists neither", country === "IND" && !boxes(f).includes(TAIWAN) && !boxes(f).includes(ISRAEL) && !f.fields_open.some((o) => o.box === TAIWAN || o.box === ISRAEL), { country, missing: f.readiness.missing });
  ok("C7.2 R4 pass: with every fact answered and confirmed, the principal's IMM 5257 is ready (no mandatory box left empty)", f.readiness.ready === true, f.readiness.missing);
  const card = { facts: f.readiness.missing.filter((m) => m.reason !== "left empty on the form").length };
  ok("C7.2 R4 pass: so no fact is waited for either", card.facts === 0, card);

  // A Taiwanese passport (ISO "TWN", as the family's "IND"): the form's code 203, so its script requires the Taiwan PIN box,
  // which nothing fills yet.
  const r = await answer(c.id, P, "person.passport_country_of_issue", "TWN", CLIENT);
  await confirmAll(c.id, P);
  f = await forms();
  ok("C7.2 R4 fail (#1318 M1): a Taiwanese passport: the Taiwan PIN box is required and empty, so readiness lists it (not the Israel box), with why", r.status < 300 && !f.readiness.ready && boxes(f).includes(TAIWAN) && !boxes(f).includes(ISRAEL) && f.readiness.missing.some((m) => /Taiwan PIN/.test(m.label) && /^no question asks it yet: /.test(m.why ?? "")), { status: r.status, missing: f.readiness.missing });

  // R5: the prepare view's Ready to file names the same form field, from the same readiness.
  const { p } = await prepare(c.id);
  const lines = (p?.readiness ?? []).flatMap((x) => x.warns).filter((w) => w.code === "missing_facts" && /IMM 5257 for Sample Client P: .*form field.*would be left empty/.test(w.words));
  ok("C7.6 R5 pass (#1318 M3): Ready to file names the Taiwan PIN box on IMM 5257's CRITICAL line, as GET …/forms does", lines.length === 1 && /Taiwan PIN/.test(lines[0].words) && !/Israel/.test(lines[0].words), lines.map((w) => w.words));

  // R6: the lock is never a dead end over a box left empty.
  const g = await call("POST", `/runtime/cases/${c.id}/forms/IMM%205257/${P}/generate`, { idempotencyKey: `qa165p-${Date.now()}` }, OFFICER);
  const copy = String(g.body?.copy?.id ?? g.body?.id ?? "");
  for (let i = 0; i < 90; i++) { const st = (await call("GET", `/runtime/form-copies/${copy}`, undefined, OFFICER)).body?.status; if (st === "GENERATED" || st === "FAILED") break; await new Promise((x) => setTimeout(x, 1000)); }
  const lock = await call("POST", `/runtime/form-copies/${copy}/lock`, { kind: "validated_copy_uploaded" }, OFFICER);
  const said = String(lock.body?.detail ?? lock.body?.message ?? "");
  ok("C7.2 R6 pass (#1318 M2): locking the copy is not refused as \"facts to answer\" over the empty Taiwan PIN box (it is said on the card and on Ready to file)", !/facts? to answer or confirm/.test(said), { status: lock.status, said });
  process.exitCode = rec.summary() ? 1 : 0;
})().catch((e) => { console.error(e); process.exit(1); });
