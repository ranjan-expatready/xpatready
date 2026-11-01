// C9.2 A changed fact marks signed, uploaded or submitted items out of date and never changes them (M3-F; r5c BR-12;
// P-65, P-136, P-168 block 1, P-171 (1)). Built for single copies in R1d (tests/runtime/check_runtime_r1d.ts: out of
// date and stale after a change); new here on the case's items: the item's state, the words (fact, old and new value,
// date), the block on "Ready to file", Undo, the scope (only items that use the fact, the spouse's facts on the
// principal's IMM 5707), and the representative change on a signed IMM 5476 (BR-20).
// Breadth, after Visitor visa: an employer-case change reaching the worker's items (C1.3).
//   tsx studio/acceptance/C9.2.test.ts 4440 xr_studio_accept
import { createHash } from "node:crypto";
import { OFFICER, call, confirmAll, copyBytes, firms, fillEverything, filingOf, generateCopy, itemsOf, main, needVisitorVisa, ok, openCase, prepare, readinessOf, sendFile, signedScan, sql, validateRoundTrip, yearsAgo, answer } from "./lib/m3.ts";

const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");

await main("C9.2", "Changed facts mark finished items out of date (Visitor visa)", async () => {
  const vv = needVisitorVisa();
  const f = await firms();
  const officer = f.officer ?? OFFICER;
  const c = await openCase(vv, [{ role: "principal", name: "Sample Client A", dob: yearsAgo(40) }, { role: "spouse_or_partner", name: "Sample Spouse A", dob: yearsAgo(38) }], { representative: f.rep, caseOfficers: [officer] });
  const [P, S] = [c.subjects["Sample Client A"], c.subjects["Sample Spouse A"]];
  await fillEverything(c.id);
  let p = (await prepare(c.id, officer)).p;
  ok("C9.2-1 pass: before anything is generated, a fact change only recomputes drafts: nothing out of date", (await answer(c.id, P, "person.given_names", "CLIENT A")).status < 300 && (await confirmAll(c.id, P), !(itemsOf((await prepare(c.id, officer)).p, P).some((i) => i.state === "out_of_date"))));

  const copy = await validateRoundTrip(c.id, "IMM 5257", P);
  const i5476 = itemsOf(p, P, "IMM 5476")[0];
  await generateCopy(c.id, "IMM 5476", P);
  await sendFile(`/runtime/items/${i5476?.id}/signed-scan`, signedScan("IMM 5476"), "imm5476-signed.pdf", officer);
  const before = sha(await copyBytes(copy ?? "")), scanSha = sql(`select sha256 from signed_scan where item_id='${i5476?.id}'`);
  ok("C9.2-2 pass: IMM 5257 validated and read back, IMM 5476 signed scan in (setup)", !!copy && !!scanSha);

  await answer(c.id, P, "person.family_name", "SAMPLEDZ"); await confirmAll(c.id, P);
  p = (await prepare(c.id, officer)).p;
  const it = itemsOf(p, P, "IMM 5257")[0];
  ok("C9.2-3 pass: the uploaded IMM 5257 is Out of date, naming the fact, the old and new value and the date", it?.state === "out_of_date" && /family name/i.test(it?.reason ?? "") && /SAMPLEDZ/.test(it?.reason ?? "") && /\d{1,2} \w{3}|\d{4}-\d{2}-\d{2}/.test(it?.reason ?? ""), it?.reason);
  ok("C9.2-4 pass: the validated copy itself is never changed (same bytes); the signed scan keeps its checksum", sha(await copyBytes(copy ?? "")) === before && sql(`select sha256 from signed_scan where item_id='${i5476?.id}'`) === scanSha);
  ok("C9.2-5 fail (P-136, P-168): an out-of-date uploaded or signed item blocks Ready to file", (readinessOf(p, filingOf(p, P)?.id)?.blocks ?? []).some((b) => b.code === "out_of_date" && /IMM 5257/.test(b.words)));
  ok("C9.2-6 pass: the signed IMM 5476 that prints the family name is Out of date too", itemsOf(p, P, "IMM 5476")[0]?.state === "out_of_date");
  ok("C9.2-7 pass (scope): the spouse's own IMM 5257 does not use the principal's family name and stays as it was", itemsOf(p, S, "IMM 5257")[0]?.state !== "out_of_date");
  const r = await call("POST", `/runtime/cases/${c.id}/changes/undo`, { subjectId: P, fact: "person.family_name" }, officer);
  p = (await prepare(c.id, officer)).p;
  ok("C9.2-8 pass: Undo of the change restores the earlier value; the items are no longer out of date", r.status === 200 && itemsOf(p, P, "IMM 5257")[0]?.state !== "out_of_date" && itemsOf(p, P, "IMM 5476")[0]?.state !== "out_of_date", r.status);

  // The spouse's facts reach the principal's IMM 5707 (section A lists the spouse, VV-R07).
  const i5707 = itemsOf(p, P, "IMM 5707")[0];
  const sheet = (await call("GET", `/runtime/items/${i5707?.id}/answer-sheet`, undefined, officer)).body;
  await call("POST", `/runtime/items/${i5707?.id}/screens/${sheet?.sections?.[0]?.key}/entered`, {}, officer);
  await answer(c.id, S, "person.date_of_birth", yearsAgo(37)); await confirmAll(c.id, S);
  p = (await prepare(c.id, officer)).p;
  ok("C9.2-9 pass: changing the spouse's date of birth marks the principal's entered IMM 5707 section out of date", itemsOf(p, P, "IMM 5707")[0]?.state === "out_of_date");

  // Representative change on a signed IMM 5476 (BR-20).
  const team = (await call("GET", `/runtime/cases/${c.id}/team`, undefined, f.admin)).body;
  const newRep = f.firm?.users.find((u) => u.duties.includes("representative") && u.actor !== f.rep)?.actor ?? f.soloRep;
  await call("PUT", `/runtime/cases/${c.id}/team`, { representative: newRep, reason: "Representative leaves the firm (Sample)", version: team?.version }, f.admin);
  p = (await prepare(c.id, officer)).p;
  ok("C9.2-10 pass: a new representative of record marks the signed IMM 5476 out of date and asks for a new one", itemsOf(p, P, "IMM 5476").some((i) => i.state === "out_of_date") && itemsOf(p, P, "IMM 5476").some((i) => i.state === "to_do"), itemsOf(p, P, "IMM 5476").map((i) => i.state));
  ok("C9.2-11 pass (data): an answer is never changed in place: the old value stays on record", Number(sql(`select count(*) from client_canonical_answer where subject_id='${P}' and canonical_field_key='person.family_name'`) ?? 0) >= 3);
});
