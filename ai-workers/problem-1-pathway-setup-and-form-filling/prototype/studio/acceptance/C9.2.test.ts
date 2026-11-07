// C9.2 A changed fact marks signed, uploaded or submitted items out of date and never changes them (M3-F; r5c BR-12;
// P-65, P-136, P-168 block 1, P-171 (1)). Built for single copies in R1d (tests/runtime/check_runtime_r1d.ts: out of
// date and stale after a change); new here on the case's items: the item's state, the words (fact, old and new value,
// date), the block on "Ready to file", Undo, the scope (only items that use the fact, the spouse's facts on the
// principal's IMM 5707), and the representative change on a signed IMM 5476 (BR-20).
// Breadth, after Visitor visa: an employer-case change reaching the worker's items (C1.3).
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
    console.log(`NOTE  ${form} is ${from} on the release: the principal's filed ${to === "PAPER" ? "on Paper with an accommodation reason (founder Q3)" : "Online"} (${sw.status})`);
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
  ok(`C9.2-2 pass: ${BC} validated and read back, ${HS} signed scan in (setup)`, !!copy && !!scanSha);

  await answer(c.id, P, "person.family_name", "SAMPLEDZ"); await confirmAll(c.id, P); // entered by the officer from the passport, then confirmed (P-72)
  p = (await prepare(c.id, officer)).p;
  const it = itemsOf(p, P, BC)[0];
  ok(`C9.2-3 pass: the uploaded ${BC} is Out of date, naming the fact, the old and new value and the date`, it?.state === "out_of_date" && /family name/i.test(it?.reason ?? "") && /SAMPLEDZ/.test(it?.reason ?? "") && /\d{1,2} \w{3}|\d{4}-\d{2}-\d{2}/.test(it?.reason ?? ""), it?.reason);
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
  ok(`C9.2-6 pass: the signed ${HS} that prints the family name is Out of date too`, itemsOf(p, P, HS)[0]?.state === "out_of_date");
  ok(`C9.2-7 pass (scope): the spouse's own ${BC} does not use the principal's family name and stays as it was`, itemsOf(p, S, BC).length === 1 && itemsOf(p, S, BC)[0]?.state !== "out_of_date" && itemsOf(p, S, HS).length === 1 && itemsOf(p, S, HS)[0]?.state === "ready", itemsOf(p, S).filter((i) => i.kind === "form").map((i) => [i.form, i.state]));
  const r = await call("POST", `/runtime/cases/${c.id}/changes/undo`, { subjectId: P, fact: "person.family_name" }, officer);
  p = (await prepare(c.id, officer)).p;
  ok("C9.2-8 pass: Undo of the change restores the earlier value; the items are no longer out of date", r.status === 200 && itemsOf(p, P, BC)[0]?.state !== "out_of_date" && itemsOf(p, P, HS)[0]?.state !== "out_of_date", r.status);

  // The spouse's facts reach the principal's family form (IMM 5707 or IMM 5645: section A lists the spouse, VV-R07).
  const i5707 = itemsOf(p, P, FAM)[0];
  const sheet = (await call("GET", `/runtime/items/${i5707?.id}/answer-sheet`, undefined, officer)).body;
  await call("POST", `/runtime/items/${i5707?.id}/screens/${sheet?.sections?.[0]?.key}/entered`, { version: sheet?.sections?.[0]?.version }, officer); // C7.3's tick sends the section's version
  await answer(c.id, S, "person.date_of_birth", yearsAgo(37)); await confirmAll(c.id, S);
  p = (await prepare(c.id, officer)).p;
  ok(`C9.2-9 pass: changing the spouse's date of birth marks the principal's entered ${FAM} section out of date`, itemsOf(p, P, FAM)[0]?.state === "out_of_date");

  // Representative change on a signed IMM 5476 (BR-20).
  const team = (await call("GET", `/runtime/cases/${c.id}/team`, undefined, f.admin)).body;
  const newRep = f.rep2; // the Sample firm's second representative (FQ-9)
  // Builder (C9.2 PR): the call renamed to C6.11's built route (M3-CONTRACT "Builds already open": PUT …/team/representative).
  await call("PUT", `/runtime/cases/${c.id}/team/representative`, { userId: newRep, reason: "Representative leaves the firm (Sample)", expectedRepresentative: team?.representative?.id }, f.admin);
  p = (await prepare(c.id, officer)).p;
  ok(`C9.2-10 pass: a new representative of record marks the signed ${HS} out of date and asks for a new one`, itemsOf(p, P, HS).some((i) => i.state === "out_of_date") && itemsOf(p, P, HS).some((i) => i.state === "to_do"), itemsOf(p, P, HS).map((i) => i.state));
  ok("C9.2-11 pass (data): an answer is never changed in place: the old value stays on record", Number(sql(`select count(*) from client_canonical_answer where subject_id='${P}' and canonical_field_key='person.family_name'`) ?? 0) >= 3);
});
