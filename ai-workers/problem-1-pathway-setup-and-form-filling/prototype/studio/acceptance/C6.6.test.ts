// C6.6 Declared answers fill the forms at once, marked by who gave them (row B150; P-242, P-411; QA-301, QA-302, QA-303).
// P-242: "A client's own typed answer is Declared and fills the form at once." P-411 (founder, 7 Nov): (1) the
// principal's answer for an adult spouse or adult child fills that person's forms at once as Declared, marked "answered
// by the principal for <name>"; the adult sees and confirms it before signing; (2) a case officer's typed or corrected
// answer fills at once, marked "entered by staff", and stays on the Confirm list; a correction never empties a filled
// box. Before (P-72, P-78): only confirmed facts filled; the principal's own answer read "Counts as confirmed".
// Each step reads a real copy the app writes (the filler's request, form_instance.result_json), never the draft alone.
// A value read from a document stays a proposal until "Confirm & use" (C6.5's pack, L-SA7) and is not tested here.
// Runs on the configured checkpoint (P-322), loaded here on a blank copy through the Demo menu's own route when it is not
// there yet. Sample people, no real names; US$0, no model call. Words on screen at 1440 and 1024 px (QA-301).
//   zsh studio/tools/isolated.sh accept 4440 start && tsx studio/acceptance/C6.6.test.ts 4440 xr_studio_accept
import { AUTHOR, CLIENT, PORT, agent, answer, call, generateCopy, main, ok, openCase, sql, yearsAgo } from "./lib/m3.ts";
import { walker } from "./lib/browser.ts";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** The repository root: a copy's path is kept relative to it (api/src/fill-case.ts ROOT). */
const REPO = join(import.meta.dirname, "..", "..", "..", "..", "..");

const SCH1 = "IMM 5257 SCH1", NAME = "person.family_name", GIVEN = "person.given_names";
type A = { id: string; status: string; confirmed: boolean; why: string; mark?: string; fills?: boolean } | null;
type Q = { subjectId: string; fact: string; label: string; answer: A };
type Form = { form: string; subject_id: string; draft: { written_now: number; mapped: number }; readiness: { missing: { fact: string; reason: string }[] } };

async function checkpoint() {
  const released = () => sql("select count(*) from config_release r join combination c on c.id=r.combination_id where c.combination_key='vv.single'") !== "0";
  if (!released()) {
    await call("POST", "/demo/reset", { confirm: "RESET" }, AUTHOR);
    const l = await call("POST", "/demo/load", { sample: "configured" }, AUTHOR);
    ok("setup: Demo › Load the configured checkpoint", l.status === 201 || l.status === 200, l.status);
  }
  const vv = sql("select id from combination where combination_key='vv.single'");
  ok("setup: Visitors › Visitor visa is released on the checkpoint", released() && !!vv);
  if (!vv) process.exit(2);
  return vv;
}

const questionOf = async (caseId: string, subject: string, fact: string): Promise<Q | undefined> =>
  ((await agent(caseId))?.sections ?? []).flatMap((s: { questions: Q[] }) => s.questions).find((q: Q) => q.subjectId === subject && q.fact === fact);
const formOf = async (caseId: string, form: string, subject: string): Promise<Form | undefined> =>
  ((await call("GET", `/runtime/cases/${caseId}/forms`)).body?.forms ?? []).find((f: Form) => f.form === form && f.subject_id === subject);
/** A real copy of the form: what the filler was asked to write into each form field (the copy's request file beside the
 *  PDF, as check_runtime_r1d.ts reads it), by fact, and why a form field was not written. */
async function written(caseId: string, form: string, subject: string): Promise<{ id: string | null; of: (fact: string) => string; why: (fact: string) => string }> {
  const id = await generateCopy(caseId, form, subject);
  const raw = id ? sql(`select json_build_object('path', path, 'result', result_json)::text from form_instance where id='${id}' and status='GENERATED'`) : null;
  const row = raw ? JSON.parse(raw) as { path: string; result: { boxes: { box: string; fact: string | null; result: string; why?: string | null; row?: number | null }[] } } : null;
  const request = row ? join(REPO, row.path.replace(/\.pdf$/, ".request.json")) : "";
  const values = (row && existsSync(request) ? JSON.parse(readFileSync(request, "utf8")).values : {}) as Record<string, string>;
  const own = (fact: string) => row?.result.boxes.find((b) => b.fact === fact && (b.row === null || b.row === undefined || b.row === 0));
  return { id: row ? id : null, of: (fact) => (own(fact)?.result === "written" ? values[own(fact)!.box] ?? "" : ""), why: (fact) => own(fact)?.why ?? own(fact)?.result ?? "(no form field)" };
}

await main("C6.6", "Declared answers fill the forms at once, marked by who gave them (P-242, P-411)", async () => {
  const vv = await checkpoint();
  const c = await openCase(vv, [{ role: "principal", name: "Sample Client A", dob: yearsAgo(40) }, { role: "spouse_or_partner", name: "Sample Spouse A", dob: yearsAgo(38) }]);
  const P = c.subjects["Sample Client A"], S = c.subjects["Sample Spouse A"], officer = c.officer;
  ok("setup: a Visitor visa case with the principal and an adult spouse", !!P && !!S, c.body);
  ok("setup: IMM 5257 Schedule 1 applies to both adults on the checkpoint", !!(await formOf(c.id, SCH1, P)) && !!(await formOf(c.id, SCH1, S)));

  // 1. The principal's own typed answer (P-242, QA-301, QA-302).
  await answer(c.id, P, NAME, "DECLAREDFAM", CLIENT);
  await answer(c.id, P, GIVEN, "DECLAREDGIVEN", CLIENT);
  const own = (await questionOf(c.id, P, NAME))?.answer;
  ok("C6.6-1 pass (P-242, QA-301): the principal's own typed answer is Declared, marked \"Declared\", never \"Counts as confirmed\"", own?.status === "DECLARED" && own.mark === "declared" && /^Declared: the client's own answer/.test(own.why) && !/Counts as confirmed/.test(own.why), own);
  ok("C6.6-1b pass (P-72 kept): the principal's own answer needs no officer confirmation (it is not on the Confirm list)", own?.confirmed === true, own);
  let copy = await written(c.id, SCH1, P);
  ok("C6.6-2 pass (QA-302): a copy of IMM 5257 Schedule 1 writes the principal's own family name and given names at once", !!copy.id && copy.of(NAME) === "DECLAREDFAM" && copy.of(GIVEN) === "DECLAREDGIVEN", { family: copy.why(NAME), given: copy.why(GIVEN) });

  // 2. The principal's answer for an adult spouse (P-411 (1)).
  await answer(c.id, S, NAME, "SPOUSEFAM", CLIENT);
  const forSpouse = (await questionOf(c.id, S, NAME))?.answer;
  ok("C6.6-3 pass (P-411 (1)): the principal's answer for the adult spouse is Declared, marked \"Answered by the principal for Sample Spouse A\"", forSpouse?.status === "DECLARED" && forSpouse.mark === "by_principal" && /^Answered by the principal for Sample Spouse A: declared/.test(forSpouse.why), forSpouse);
  copy = await written(c.id, SCH1, S);
  ok("C6.6-4 pass (P-411 (1), QA-303): the spouse's copy of Schedule 1 writes it at once", !!copy.id && copy.of(NAME) === "SPOUSEFAM", copy.why(NAME));
  const spouseForm = await formOf(c.id, SCH1, S);
  ok("C6.6-5 fail (P-411 (1)): the adult confirms it before signing: it is not confirmed, and the spouse's form lists it \"not confirmed\" before filing", forSpouse?.confirmed === false && !!spouseForm?.readiness.missing.some((m) => m.fact === NAME && m.reason === "not confirmed"), spouseForm?.readiness.missing);

  // 3. An answer the case officer types (P-411 (2)).
  await answer(c.id, S, GIVEN, "STAFFGIVEN", officer);
  const typed = (await questionOf(c.id, S, GIVEN))?.answer;
  ok("C6.6-6 pass (P-411 (2)): an officer-typed answer is Declared, marked \"entered by staff\"", typed?.status === "DECLARED" && typed.mark === "by_staff" && /entered by staff/.test(typed.why), typed);
  copy = await written(c.id, SCH1, S);
  ok("C6.6-7 pass (P-411 (2), QA-302): the officer-typed answer is written to the spouse's Schedule 1 at once", !!copy.id && copy.of(GIVEN) === "STAFFGIVEN", copy.why(GIVEN));
  ok("C6.6-8 fail (P-411 (2)): it stays on the Confirm list: not confirmed, and listed \"not confirmed\" before filing", typed?.confirmed === false && !!(await formOf(c.id, SCH1, S))?.readiness.missing.some((m) => m.fact === GIVEN && m.reason === "not confirmed"));

  // 4. The officer corrects the principal's own answer (P-411 (2): a correction never empties a filled box).
  const before = (await formOf(c.id, SCH1, P))?.draft.written_now ?? -1;
  const fix = await answer(c.id, P, NAME, "OFFICERFAM", officer);
  const corrected = (await questionOf(c.id, P, NAME))?.answer;
  ok("C6.6-9 pass (P-411 (2)): the officer's correction is saved and marked \"entered by staff\", on the Confirm list", fix.status < 300 && corrected?.mark === "by_staff" && corrected.confirmed === false, { status: fix.status, corrected });
  copy = await written(c.id, SCH1, P);
  ok("C6.6-10 pass (P-411 (2), QA-303): the correction never empties the box: a new copy writes the corrected family name", !!copy.id && copy.of(NAME) === "OFFICERFAM" && copy.of(GIVEN) === "DECLAREDGIVEN", { family: copy.why(NAME), given: copy.why(GIVEN) });
  ok("C6.6-11 pass (P-411 (2)): the draft writes as many form fields after the correction as before", (await formOf(c.id, SCH1, P))?.draft.written_now === before && before > 0, before);

  // 5. Still never written: an answer that fails its own check (QA-122), whoever typed it.
  const bad = await answer(c.id, S, "person.date_of_birth", "1988-02-31", officer);
  copy = await written(c.id, SCH1, S);
  ok("C6.6-12 fail (QA-122): a declared date of birth that is not a real date is saved and flagged, but never written", bad.status < 300 && !!copy.id && copy.of("person.date_of_birth") === "" && /not written|problem|real date/i.test(copy.why("person.date_of_birth")), { status: bad.status, why: copy.why("person.date_of_birth") });

  // 6. The words a person reads (QA-301), at 1440 and 1024 px.
  const w = await walker(`http://127.0.0.1:${PORT}`);
  try {
    for (const width of [1440, 1024]) {
      const p = await w.open(officer, width);
      await p.goto(`/cases/${c.id}`); await w.settle(p, "the case page");
      const page = await w.text(p);
      ok(`C6.6-13 pass (QA-301) ${width} px: Prepare application reads "filled from declared and confirmed answers", never "confirmed answers only"`, /filled from declared and confirmed answers/.test(page) && !/confirmed answers only/.test(page));
      ok(`C6.6-14 pass (QA-301) ${width} px: each form says "Declared or confirmed answers for N of M form fields"`, /Declared or confirmed answers for \d+ of \d+ form fields/.test(page) && !/\bConfirmed answers for \d+/.test(page));
      await p.getByRole("tab", { name: /^Sample Spouse A/ }).click(); await w.settle(p, "the spouse's tab");
      const spouse = await w.text(p);
      ok(`C6.6-15 pass (P-411) ${width} px: the spouse's answers read "Answered by the principal for Sample Spouse A" and "Entered by staff · to confirm"`, /Answered by the principal for Sample Spouse A/.test(spouse) && /Entered by staff · to confirm/.test(spouse));
      await p.getByRole("tab", { name: /^Sample Client A/ }).click(); await w.settle(p, "the principal's tab");
      const principal = await w.text(p);
      ok(`C6.6-16 pass (QA-301) ${width} px: the principal's own answer reads "Declared", and no answer reads "Counts as confirmed"`, /\bDeclared\b/.test(principal) && !/Counts as confirmed/.test(`${principal}\n${spouse}`));
      ok(`C6.6-17 ${width} px: no sideways scroll on the Agent view`, !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
      await p.context().close();
    }
    ok("C6.6: no page error on these screens", w.errors.length === 0, w.errors);
  } finally { await w.close(); }
});
