// C7.1 acceptance, QA-415 (P-486, P-489): each person's "Type of application" on IMM 5476 and IMM 5645 is their own,
// worked out from their own filing, never one answer for the whole case. IRCC: IMM 5645 "must be completed by each
// person, 18 years of age or older, applying for a Temporary Resident Visa, a study or work permit outside Canada" and
// names "Type of application: Visitor Worker Student Other"; IMM 5476 asks "The type of application you have submitted"
// and each adult dependant completes their own copy (samples/application-kinds.json, with pages and dates). Read back
// from the generated files: a Study permit family (the student and the child Student, the spouse, whose filing is a work
// permit, Worker) and a Visitor visa family (Visitor on every adult's IMM 5645, nothing by hand). Runs on the configured
// checkpoint (Demo › Load; on any other data the pack resets its copy and loads the checkpoint itself, about 2 minutes);
// Sample people; no model call (US$0).
//   zsh studio/tools/isolated.sh accept 4440 start && tsx --tsconfig studio/api/tsconfig.json studio/acceptance/C7.1-application-type.test.ts 4440 xr_studio_accept
import { answer, call, confirmAll, main, ok, openCase } from "./lib/m3.ts";
import { at, ensureCheckpoint, needStudyPermit, readCopy, STUDIES, STUDY_FAMILY, studyFamily, ticked, visitorFamily } from "./lib/application-type.ts";

const APPLICATION = "SectionA[0].application[0]";
// A by-hand line names its question (`label`), the fact when it has one: the kind of application's, by either.
const kindLines = (c: { byHand: { fact?: string; label?: string }[] } | null) => (c?.byHand ?? []).filter((b) => /application_type/.test(b.fact ?? "") || /application type|type of application|kind of application/i.test(b.label ?? "")).length;

await main("C7.1 application type", "Each person's type of application, from their own filing (QA-415)", async () => {
  await ensureCheckpoint(); // Gate B runs this pack on the six: it loads the checkpoint itself
  const sp = await studyFamily();
  const [a, s, k] = ["Sample Student A", "Sample Spouse B", "Sample Child B"];
  const filings = ((await call("GET", `/runtime/cases/${sp.c.id}/filings`, undefined, sp.c.officer)).body?.filings ?? []) as { label: string; owner?: { subject: string } }[];
  const label = (n: string) => filings.find((f) => f.owner?.subject === sp.c.subjects[n])?.label ?? "";
  ok("C7.1-AT-1 setup: the Study permit family's filings are the student's study permit, the spouse's work permit and the child's study permit", /^Study permit \(outside Canada\): /.test(label(a)) && /^Work permit: /.test(label(s)) && /^Study permit: /.test(label(k)), [a, s, k].map(label));
  const r5476 = { a: await readCopy(sp, "IMM 5476", a), s: await readCopy(sp, "IMM 5476", s), k: await readCopy(sp, "IMM 5476", k) };
  ok("C7.1-AT-2 pass: the student's IMM 5476 says Student, read back from the file", at(r5476.a?.values, APPLICATION) === "Student", at(r5476.a?.values, APPLICATION));
  ok("C7.1-AT-3 pass: the spouse's IMM 5476 says Worker (their own work permit), never the student's Student", at(r5476.s?.values, APPLICATION) === "Worker", at(r5476.s?.values, APPLICATION));
  ok("C7.1-AT-4 pass: the child's IMM 5476 says Student (the study permit their own answer adds)", at(r5476.k?.values, APPLICATION) === "Student", at(r5476.k?.values, APPLICATION));
  ok("C7.1-AT-5 fail: no IMM 5476 of the family leaves its type of application by hand", [r5476.a, r5476.s, r5476.k].every((c) => !!c && kindLines(c) === 0), [r5476.a, r5476.s, r5476.k].map((c) => c?.byHand));
  // IMM 5645 where the release gives it to this family (the Study permit's family information form may be IMM 5707).
  const r5645 = { a: await readCopy(sp, "IMM 5645", a), s: await readCopy(sp, "IMM 5645", s) };
  if (r5645.a || r5645.s) ok("C7.1-AT-6 pass: on IMM 5645 the student ticks Student only and the spouse Worker only", (!r5645.a || ticked(r5645.a.values).join() === "Student") && (!r5645.s || ticked(r5645.s.values).join() === "Worker"), { a: ticked(r5645.a?.values), s: ticked(r5645.s?.values) });
  else console.log("NOTE  C7.1-AT-6: this release gives the Study permit family no IMM 5645 (its family information form is IMM 5707): IMM 5476 above carries the check.");

  // The kind follows the filing, both ways: the child answered No to "6 months or more" files a visitor visa, so their
  // IMM 5476 says Visitor, never the Student it said before nor the family's Student.
  await answer(sp.c.id, sp.c.subjects[k], STUDIES, false);
  await confirmAll(sp.c.id, sp.c.subjects[k]);
  const after = ((await call("GET", `/runtime/cases/${sp.c.id}/filings`, undefined, sp.c.officer)).body?.filings ?? []) as { label: string; owner?: { subject: string } }[];
  // The Student copy made before is now out of date, and it names what changed in the form's words (never the key).
  const before = (await call("GET", `/runtime/form-copies/${r5476.k?.id}`, undefined, sp.c.officer)).body as { out_of_date?: boolean; changed?: string[] } | null;
  ok("C7.1-AT-13 fail: the child's earlier copy is out of date, naming the change by the form's caption, never a field key", before?.out_of_date === true && (before.changed ?? []).some((c) => /^Type of application/.test(c)) && !(before.changed ?? []).some((c) => /application_type/.test(c)), before?.changed);
  const kNo = await readCopy(sp, "IMM 5476", k);
  ok("C7.1-AT-10 fail: answered No, the child's filing becomes a visitor visa and their IMM 5476 says Visitor (never Student)", /^Visitor visa: /.test(after.find((f) => f.owner?.subject === sp.c.subjects[k])?.label ?? "") && at(kNo?.values, APPLICATION) === "Visitor", { filing: after.find((f) => f.owner?.subject === sp.c.subjects[k])?.label, written: at(kNo?.values, APPLICATION) });

  // Review M1 (#1620): before the child's "6 months or more" is answered, which application they make is not known: their
  // IMM 5476 copy says so as a by-hand line with the reason (on the copy and on Ready to file), never a blank in silence.
  const open = await openCase(needStudyPermit(), STUDY_FAMILY);
  const waitFam = { c: open, forms: (await call("GET", `/runtime/cases/${open.id}/forms`, undefined, open.officer)).body?.forms ?? [] };
  // Review M3 (#1620): the forms card never asks for a fix to an answer nobody gives (no "needs a fix" or "Enter text").
  type Missing = { fact?: string; reason?: string; why?: string };
  const kForms = (waitFam.forms as unknown as { form: string; subject_id: string; readiness?: { missing?: Missing[] } }[]).filter((x) => x.subject_id === open.subjects[k]);
  const kindMissing = kForms.flatMap((x) => (x.readiness?.missing ?? []).filter((m) => /application_type/.test(m.fact ?? "")));
  ok("C7.1-AT-12 fail: the child's forms list no answer to fix for the kind of application (nobody is asked it)", kForms.length > 0 && !kindMissing.some((m) => /fix|problem|Enter text/i.test(`${m.reason} ${m.why}`)), kindMissing);
  const kWait = await readCopy(waitFam, "IMM 5476", k);
  const line = (kWait?.byHand ?? []).find((b) => /waits for an answer/.test(b.why ?? ""));
  ok("C7.1-AT-11 fail: the child's kind not known yet: their IMM 5476 lists the type of application by hand, named by the form's caption (m7) and naming the question it waits for (nothing written)", !!line && /6 months or more/.test(line.why ?? "") && /^Type of application/.test(line.label ?? "") && !at(kWait?.values, APPLICATION), { byHand: kWait?.byHand, written: at(kWait?.values, APPLICATION) });

  const vv = await visitorFamily();
  const adults = ["Sample Client A", "Sample Spouse A"];
  const v5645 = await Promise.all(adults.map((n) => readCopy(vv, "IMM 5645", n)));
  ok("C7.1-AT-7 pass: on Visitor visa every adult's IMM 5645 ticks Visitor, and only Visitor, read back from the file", v5645.every((c) => !!c && ticked(c.values).join() === "Visitor"), v5645.map((c) => ticked(c?.values)));
  ok("C7.1-AT-8 fail: no adult's IMM 5645 has a by-hand line for its type of application (QA-415 b: four per adult before)", v5645.every((c) => !!c && kindLines(c) === 0), v5645.map((c) => c?.byHand));
  const v5476 = await Promise.all(adults.map((n) => readCopy(vv, "IMM 5476", n)));
  ok("C7.1-AT-9 pass: every adult's IMM 5476 says Visitor", v5476.every((c) => at(c?.values, APPLICATION) === "Visitor"), v5476.map((c) => at(c?.values, APPLICATION)));
});
