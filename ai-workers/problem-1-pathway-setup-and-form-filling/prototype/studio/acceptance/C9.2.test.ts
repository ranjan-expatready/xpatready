// C9.2 A changed fact marks signed, uploaded or submitted items out of date and never changes them (M3-F; r5c BR-12;
// P-65, P-136, P-168 block 1, P-171 (1)). Built for single copies in R1d (tests/runtime/check_runtime_r1d.ts: out of
// date and stale after a change); new here on the case's items: the item's state, the words (fact, old and new value,
// date), the block on "Ready to file", Undo, the scope (only items that use the fact, the spouse's facts on the
// principal's IMM 5707), and the representative change on a signed IMM 5476 (BR-20).
// Breadth (BR-3, "Copies, not live links", #1051; QA-306, founder 8 Nov): a change to a copied employer fact on the worker's
// case marks the worker's items that read it out of date, and never changes them (C1.3). Steps C9.2-12 to -18, on the
// configured checkpoint's With an LMIA – inside Canada release (qa's probe, 11/11, #1322).
//   tsx studio/acceptance/C9.2.test.ts 4440 xr_studio_accept
import { createHash } from "node:crypto";
import { OFFICER, call, confirmAll, copyBytes, firms, fillEverything, filingOf, itemsOf, main, needVisitorVisa, ok, openCase, prepare, readinessOf, sql, validateRoundTrip, yearsAgo, answer, signByHand, expectedFor } from "./lib/m3.ts";

const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");

await main("C9.2", "Changed facts mark finished items out of date (Visitor visa)", async () => {
  const vv = needVisitorVisa();
  const f = await firms();
  const officer = f.officer ?? OFFICER;
  const c = await openCase(vv, [{ role: "principal", name: "Sample Client A", dob: yearsAgo(40) }, { role: "spouse_or_partner", name: "Sample Spouse A", dob: yearsAgo(38) }], { representative: f.rep, caseOfficers: [officer] });
  const [P, S] = [c.subjects["Sample Client A"], c.subjects["Sample Spouse A"]];
  // Row C4 (P-319, R1): the forms are the case's own lines from C1's expectedLines, never a form number written here: the
  // barcode form (IMM 5257), the form signed by hand and scanned (IMM 5476, a line that applies on the firm record's
  // "uses a representative"), the family form (IMM 5707 on the fixture, IMM 5645 on release 2).
  const ex = (await expectedFor(c.id))?.["Sample Client A"], lines = [...(ex?.forms ?? []), ...(ex?.waiting ?? [])];
  const BCL = lines.find((l) => l.barcode), FL = lines.find((l) => l.family), BC = BCL?.form ?? "", HS = lines.find((l) => l.handSigned)?.form ?? "", FAM = FL?.form ?? "";
  // Row C4: where release 2 files the barcode form Online (no copy for filing, so no Validate round trip), the case
  // officer switches the principal's to Paper with a written accommodation reason, under the founder's ruling Q3 (P-380;
  // Sample until the immigration expert confirms; Unconfirmed: no counsel). Where it files the family form as a PDF upload
  // (no answer sheet to tick "entered"), the officer files the principal's Online, within what the item accepts (C11.6).
  // On the fixture both lines already are so and nothing is changed.
  const fileAs = async (form: string, from: string | undefined, to: "PAPER" | "ONLINE") => {
    if (!form || !from || from === to || (to === "PAPER" && from !== "ONLINE")) return;
    const q = (await prepare(c.id, officer)).p;
    const reason = to === "PAPER" ? "Cannot apply online: accommodation (Sample)" : "Filed Online for this person (Sample)";
    const sw = await call("PATCH", `/runtime/items/${itemsOf(q, P, form)[0]?.id}/channel`, { channel: to, reason, version: q?.version }, officer);
    console.log(`NOTE  ${form} is ${from} on the release: the principal's ${sw.status === 200 ? `filed ${to === "PAPER" ? "on Paper with an accommodation reason (founder Q3)" : "Online"}` : "switch was refused"} (${sw.status})`);
  };
  await fileAs(BC, BCL?.channel, "PAPER");
  await fileAs(FAM, FL?.channel, "ONLINE");
  await fillEverything(c.id);
  let p = (await prepare(c.id, officer)).p;
  // Builder (C9.2 PR): the Visitor visa release has the case officer enter names from the passport ("The officer enters
  // this fact from a document or record": a client's PUT is 403), so the officer changes them and confirms the section;
  // the rules each step checks are unchanged.
  const changed = (await answer(c.id, P, "person.given_names", "CLIENT A")).status; await confirmAll(c.id, P);
  ok("C9.2-1 pass: before anything is generated, a fact change only recomputes drafts: nothing out of date", changed < 300 && itemsOf((await prepare(c.id, officer)).p, P).length > 0 && !itemsOf((await prepare(c.id, officer)).p, P).some((i) => i.state === "out_of_date"), changed);

  const copy = await validateRoundTrip(c.id, BC, P);
  const i5476 = itemsOf(p, P, HS)[0];
  await signByHand(c.id, i5476?.id, HS, P); // print → signed → scan, in order (C8.1-3)
  // Builder (C9.2 PR, review S4): the spouse's IMM 5476 signed too, so -7's scope has a finished item that does not read
  // the principal's family name (the spouse's IMM 5257 is never finished here, and it does read the principal's name).
  const s5476 = itemsOf(p, S, HS)[0];
  await signByHand(c.id, s5476?.id, HS, S);
  const copyFile = await copyBytes(copy ?? "", officer), before = sha(copyFile), scanSha = sql(`select sha256 from signed_scan where item_id='${i5476?.id}'`);
  ok(`C9.2-2 pass: ${BC} validated and read back, ${HS} signed scan in (setup)`, !!BC && !!HS && !!copy && !!scanSha);

  await answer(c.id, P, "person.family_name", "SAMPLEDZ"); await confirmAll(c.id, P); // entered by the officer from the passport, then confirmed (P-72)
  p = (await prepare(c.id, officer)).p;
  const it = itemsOf(p, P, BC)[0];
  ok(`C9.2-3 pass: the uploaded ${BC} is Out of date, naming the fact, the old and new value and the date`, !!BC && it?.state === "out_of_date" && /family name/i.test(it?.reason ?? "") && /SAMPLEDZ/.test(it?.reason ?? "") && /\d{1,2} \w{3}|\d{4}-\d{2}-\d{2}/.test(it?.reason ?? ""), it?.reason);
  // Builder (C9.2 PR, asked of the tech lead on the PR): GET …/file serves the validated file only while it is current and
  // the generated original once a fact changed (C-10, fill-case.ts `file`), so its bytes differ by design. The validated
  // file kept is checked instead: its stored checksum (append-only row; the server checks the file against it on every
  // read) is still the one of the bytes served before the change.
  const validatedSha = sql(`select sha256 from validated_copy where form_instance_id='${copy}' order by read_at desc limit 1`);
  ok("C9.2-4 pass: the validated copy itself is never changed (same bytes); the signed scan keeps its checksum", copyFile.length > 0 && !!scanSha && validatedSha === before && sql(`select count(*) from validated_copy where form_instance_id='${copy}'`) === "1" && sql(`select sha256 from signed_scan where item_id='${i5476?.id}'`) === scanSha, { validatedSha, before });
  // Builder (C9.2 PR, after C7.6 #861 merged): under P-237 the former block is a CRITICAL warning (C7.6 puts
  // "out_of_date" in `warns` with severity "critical"; design row C9.2: "the pack's 'blocks' wording becomes a CRITICAL
  // warning"), and the filing is not Ready to file while it is open. The rule (P-136: it stops Ready to file) is kept.
  const ready5 = readinessOf(p, filingOf(p, P)?.id) as { ready?: boolean; built?: boolean; blocks?: { code: string; words: string }[]; warns?: { code: string; words: string; severity?: string }[] } | null;
  ok("C9.2-5 fail (P-136, P-168, P-237): an out-of-date uploaded or signed item is a CRITICAL warning that stops Ready to file", ready5?.ready === false && [...(ready5?.blocks ?? []), ...(ready5?.warns ?? []).filter((w) => w.severity === "critical")].some((b) => b.code === "out_of_date" && !!BC && b.words.includes(BC)), (ready5?.warns ?? []).filter((w) => w.code === "out_of_date").map((w) => w.words));
  ok(`C9.2-6 pass: the signed ${HS} that prints the family name is Out of date too`, !!HS && itemsOf(p, P, HS)[0]?.state === "out_of_date");
  ok(`C9.2-7 pass (scope): the spouse's own ${BC} does not use the principal's family name and stays as it was`, itemsOf(p, S, BC).length === 1 && itemsOf(p, S, BC)[0]?.state !== "out_of_date" && itemsOf(p, S, HS).length === 1 && itemsOf(p, S, HS)[0]?.state === "ready", itemsOf(p, S).filter((i) => i.kind === "form").map((i) => [i.form, i.state]));
  const r = await call("POST", `/runtime/cases/${c.id}/changes/undo`, { subjectId: P, fact: "person.family_name" }, officer);
  p = (await prepare(c.id, officer)).p;
  ok("C9.2-8 pass: Undo of the change restores the earlier value; the items are no longer out of date", !!BC && !!HS && r.status === 200 && itemsOf(p, P, BC)[0]?.state !== "out_of_date" && itemsOf(p, P, HS)[0]?.state !== "out_of_date", r.status);

  // The spouse's facts reach the principal's family form (IMM 5707 or IMM 5645: section A lists the spouse, VV-R07).
  const i5707 = itemsOf(p, P, FAM)[0];
  const sheet = (await call("GET", `/runtime/items/${i5707?.id}/answer-sheet`, undefined, officer)).body;
  await call("POST", `/runtime/items/${i5707?.id}/screens/${sheet?.sections?.[0]?.key}/entered`, { version: sheet?.sections?.[0]?.version }, officer); // C7.3's tick sends the section's version
  await answer(c.id, S, "person.date_of_birth", yearsAgo(37)); await confirmAll(c.id, S);
  p = (await prepare(c.id, officer)).p;
  ok(`C9.2-9 pass: changing the spouse's date of birth marks the principal's entered ${FAM} section out of date`, !!FAM && itemsOf(p, P, FAM)[0]?.state === "out_of_date");

  // Representative change on a signed IMM 5476 (BR-20).
  const team = (await call("GET", `/runtime/cases/${c.id}/team`, undefined, f.admin)).body;
  const newRep = f.rep2; // the Sample firm's second representative (FQ-9)
  // Builder (C9.2 PR): the call renamed to C6.11's built route (M3-CONTRACT "Builds already open": PUT …/team/representative).
  await call("PUT", `/runtime/cases/${c.id}/team/representative`, { userId: newRep, reason: "Representative leaves the firm (Sample)", expectedRepresentative: team?.representative?.id }, f.admin);
  p = (await prepare(c.id, officer)).p;
  ok(`C9.2-10 pass: a new representative of record marks the signed ${HS} out of date and asks for a new one`, !!HS && itemsOf(p, P, HS).some((i) => i.state === "out_of_date") && itemsOf(p, P, HS).some((i) => i.state === "to_do"), itemsOf(p, P, HS).map((i) => i.state));
  ok("C9.2-11 pass (data): an answer is never changed in place: the old value stays on record", Number(sql(`select count(*) from client_canonical_answer where subject_id='${P}' and canonical_field_key='person.family_name'`) ?? 0) >= 3);

  // ------------------------------------------------------------------ Breadth (BR-3, QA-306): a copied employer fact
  // On the configured checkpoint's With an LMIA – inside Canada release: a worker's case linked to the Sample employer case
  // (C1.3) copies the employer facts in. Once the worker's form that prints the employer name is validated and read back,
  // the officer corrects the copied name on the worker's case. The forms are the case's own (the questionnaire's "fills"
  // for the fact and the case's items, row C4), never a form number written here.
  const NAME = "organisation.employer_name", NEW_NAME = "Sample Employer Limited (Sample)";
  const wp = sql("select c.id from combination c where c.combination_key='wp.lmia_inside' and exists (select 1 from config_release r where r.combination_id=c.id)");
  ok("C9.2-12 setup: With an LMIA – inside Canada is released (the configured checkpoint)", !!wp, wp);
  if (!wp) return;
  const w = await openCase(wp, [{ role: "principal", name: "Sample Worker W", dob: yearsAgo(35) }]);
  const W = w.subjects["Sample Worker W"], wOfficer = w.officer || officer;
  const ec = (await call("GET", `/runtime/cases/${w.id}/employer-cases`, undefined, wOfficer)).body?.employer_cases?.[0];
  const seen = Object.fromEntries(((ec?.facts ?? []) as { fact: string; current: { answer_id: string } | null }[]).map((x) => [x.fact, x.current?.answer_id ?? null]));
  const link = await call("POST", `/runtime/cases/${w.id}/employer-link`, { employerCase: ec?.key, seen }, wOfficer);
  await fillEverything(w.id);
  const nameQ = async () => ((await call("GET", `/runtime/cases/${w.id}/questionnaire?mode=agent`, undefined, wOfficer)).body?.sections ?? [])
    .flatMap((x: { questions: unknown[] }) => x.questions).find((q: { fact: string; subjectId: string }) => q.fact === NAME && q.subjectId === W) as { fills?: { form: string }[]; answer?: { id: string; value: unknown; channel?: string; answered?: { channel?: string } | null } } | undefined;
  const q0 = await nameQ(), copied = q0?.answer?.value;
  const readers = [...new Set((q0?.fills ?? []).map((x) => x.form))];
  let wp0 = (await prepare(w.id, wOfficer)).p;
  const others = itemsOf(wp0, W).filter((i) => i.kind === "form" && !readers.includes(i.form ?? "")).map((i) => ({ form: i.form, state: i.state }));
  const EF = readers.find((f) => itemsOf(wp0, W, f).length > 0) ?? "";
  ok(`C9.2-12 setup (C1.3): the worker's case relies on the Sample employer case; the employer name is copied in and printed by ${EF || "a form"}; other forms (${others.map((o) => o.form).join(", ")}) do not print it`,
    [200, 201].includes(link.status) && (link.body?.copied ?? []).includes(NAME) && (q0?.answer?.channel === "linked_file" || q0?.answer?.answered?.channel === "linked_file") && !!EF && others.length > 0, { link: link.status, copied: link.body?.copied, value: copied, readers, others });
  const ecopy = EF ? await validateRoundTrip(w.id, EF, W) : null;
  const ebefore = ecopy ? sql(`select sha256 from validated_copy where form_instance_id='${ecopy}' order by read_at desc limit 1`) : null;
  ok(`C9.2-13 setup: the worker's ${EF} is validated and read back`, !!ecopy && !!ebefore, ecopy);
  wp0 = (await prepare(w.id, wOfficer)).p;
  const othersBefore = itemsOf(wp0, W).filter((i) => i.kind === "form" && !readers.includes(i.form ?? "")).map((i) => ({ form: i.form, state: i.state }));
  const fix = await answer(w.id, W, NAME, NEW_NAME, wOfficer); await confirmAll(w.id, W);
  let wq = (await prepare(w.id, wOfficer)).p;
  const eit = itemsOf(wq, W, EF)[0];
  ok(`C9.2-14 pass (BR-3): the officer corrects the copied employer name on the worker's case; the validated ${EF} is Out of date, naming the fact, the old and new value and the date`,
    fix.status < 300 && eit?.state === "out_of_date" && /employer/i.test(eit?.reason ?? "") && (eit?.reason ?? "").includes(String(copied)) && (eit?.reason ?? "").includes(NEW_NAME) && /\d{1,2} \w{3} \d{4}|\d{4}-\d{2}-\d{2}/.test(eit?.reason ?? ""), { fix: fix.status, state: eit?.state, reason: eit?.reason });
  const eafter = ecopy ? sql(`select sha256 from validated_copy where form_instance_id='${ecopy}' order by read_at desc limit 1`) : null;
  ok(`C9.2-15 pass (BR-3: never changes them): ${EF}'s validated copy keeps its checksum (one append-only row)`, !!ebefore && eafter === ebefore && sql(`select count(*) from validated_copy where form_instance_id='${ecopy}'`) === "1", { before: ebefore?.slice(0, 12), now: eafter?.slice(0, 12) });
  const wr = readinessOf(wq, filingOf(wq, W)?.id) as { ready?: boolean; blocks?: { code: string; words: string }[]; warns?: { code: string; words: string; severity?: string }[] } | null;
  ok(`C9.2-16 fail (P-136, P-237): the out-of-date ${EF} is a CRITICAL warning that holds Ready to file`, wr?.ready === false && [...(wr?.blocks ?? []), ...(wr?.warns ?? []).filter((x) => x.severity === "critical")].some((b) => b.code === "out_of_date" && b.words.includes(EF)), (wr?.warns ?? []).filter((x) => x.code === "out_of_date").map((x) => `${x.severity}: ${x.words}`));
  const othersAfter = itemsOf(wq, W).filter((i) => i.kind === "form" && !readers.includes(i.form ?? "")).map((i) => ({ form: i.form, state: i.state }));
  ok(`C9.2-17 pass (scope): the worker's ${othersBefore.map((o) => o.form).join(" and ")}, which do not print the employer name, are untouched`, othersBefore.length > 0 && JSON.stringify(othersAfter) === JSON.stringify(othersBefore) && !othersAfter.some((i) => i.state === "out_of_date"), { before: othersBefore, after: othersAfter });
  const wu = await call("POST", `/runtime/cases/${w.id}/changes/undo`, { subjectId: W, fact: NAME }, wOfficer);
  wq = (await prepare(w.id, wOfficer)).p;
  const back = (await nameQ())?.answer?.value;
  ok(`C9.2-18 pass: Undo restores the copied employer name; ${EF} is no longer out of date`, wu.status === 200 && JSON.stringify(back) === JSON.stringify(copied) && itemsOf(wq, W, EF)[0]?.state !== "out_of_date", { undo: wu.status, back, state: itemsOf(wq, W, EF)[0]?.state });
});
