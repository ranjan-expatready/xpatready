// Row C3 (M3 sprint plan, #1167): a person's channel choice decides "for filing" (the Validate round trip on release 2).
// On the configured checkpoint, release 2 of Visitor visa files IMM 5257 Online, so before this row no case could hold a
// validated copy: the Paper line said "Ask the Lead". The founder's ruling Q3 (6 Nov): a case officer may switch one
// person's IMM 5257 to Paper only with a written accommodation reason; that copy goes through Validate. Sample until the
// immigration expert confirms. Each rule here with a passing and a failing case. Sample data, US$0, no model call.
//   zsh studio/tools/isolated.sh rtc3 4431 start, then Demo › Reset and Demo › Load the configured checkpoint as the author
//   tsx studio/tests/runtime/check_c3_paper_validate.ts 4431 xr_studio_rtc3
import { CLIENT, answer, call, sql, confirmAll, fillEverything, filingOf, firms, generateCopy, copyBytes, sendFile, adobeValidated, itemsOf, main, needVisitorVisa, ok, openCase, prepare, readinessOf, yearsAgo } from "../../acceptance/lib/m3.ts";

const REASON = "The client cannot use the IRCC account: an accommodation (Sample)";
const codes = (x: { code: string }[] | undefined) => (x ?? []).map((b) => b.code);
const copyOf = async (id: string | null, actor: string) => (await call("GET", `/runtime/form-copies/${id}`, undefined, actor)).body;
const sendValidated = async (id: string | null, actor: string) => (await sendFile(`/runtime/form-copies/${id}/validated`, adobeValidated(await copyBytes(id ?? "", actor)), "IMM5257-validated.pdf", actor));

await main("C3", "A person's channel choice decides \"for filing\" — checkpoint checks", async () => {
  const vv = needVisitorVisa(), f = await firms();
  const officer = f.officer!;
  const c = await openCase(vv, [{ role: "principal", name: "Sample Client A", dob: yearsAgo(40) }, { role: "spouse_or_partner", name: "Sample Spouse A", dob: yearsAgo(38) }], { representative: f.rep, caseOfficers: [officer] });
  const [P, S] = [c.subjects["Sample Client A"], c.subjects["Sample Spouse A"]];
  await fillEverything(c.id);
  let p = (await prepare(c.id, officer)).p;
  const item = itemsOf(p, P, "IMM 5257")[0], fid = filingOf(p, P)?.id;
  ok("C3 setup: on the checkpoint's release IMM 5257 is an Online line for both people", item?.channel === "ONLINE" && itemsOf(p, S, "IMM 5257")[0]?.channel === "ONLINE", [item?.channel, itemsOf(p, S, "IMM 5257")[0]?.channel]);
  ok("C3 pass: a line left Online has no Validate block (nothing to validate)", !codes(readinessOf(p, fid)?.blocks).includes("barcode_not_validated"), codes(readinessOf(p, fid)?.blocks));

  // Q3: Paper only with a written accommodation reason; the case officer, as before (who may switch is unchanged).
  let r = await call("PATCH", `/runtime/items/${item?.id}/channel`, { channel: "PAPER", version: p?.version }, officer);
  ok("C3 fail (Q3): Paper without a reason is refused (400, the reason field)", r.status === 400 && r.body?.errors?.[0]?.field === "reason", [r.status, r.body?.errors?.[0]?.field, r.body?.detail]);
  r = await call("PATCH", `/runtime/items/${item?.id}/channel`, { channel: "PAPER", reason: REASON, version: p?.version }, CLIENT);
  ok("C3 fail: a client cannot switch it (403)", r.status === 403, r.status);
  r = await call("PATCH", `/runtime/items/${item?.id}/channel`, { channel: "PAPER", reason: REASON, version: p?.version }, officer);
  ok("C3 pass (Q3): with the accommodation reason the case officer's switch to Paper is saved", r.status === 200, [r.status, r.body?.detail]);
  p = (await prepare(c.id, officer)).p;
  const paper = itemsOf(p, P, "IMM 5257")[0], spouse = itemsOf(p, S, "IMM 5257")[0];
  ok("C3 pass: only that person's IMM 5257 moved; the spouse's stays Online", paper?.channel === "PAPER" && spouse?.channel === "ONLINE", [paper?.channel, spouse?.channel]);

  // The engine (engine/runtime/prepare.ts paperLine): a Paper line a person chose is for filing, so it shows its steps.
  ok("C3 pass (row C3): the Paper line shows its steps, Validate first, and never \"Ask the Lead\"", paper?.state === "to_do" && paper?.steps?.[0]?.key === "validate" && !/Ask the Lead|not for filing/i.test(paper?.reason ?? "") && /Validate/.test(paper?.reason ?? ""), paper?.reason);
  let rd = readinessOf(p, fid);
  ok("C3 fail (C7.6-6, P-144): with no validated copy read back, IMM 5257 on Paper is the one block on Ready to file", codes(rd?.blocks).join() === "barcode_not_validated" && /IMM 5257/.test(rd?.blocks[0]?.words ?? ""), codes(rd?.blocks));

  // The copy (api/src/fill-case.ts): made for filing, validated and read back.
  const made = await generateCopy(c.id, "IMM 5257", P);
  const copy = await copyOf(made, officer);
  ok("C3 pass: the Paper copy is made for filing (not stamped \"Copy, not for filing\")", copy?.status === "GENERATED" && copy?.copy_not_for_filing === false, [copy?.status, copy?.copy_not_for_filing, copy?.error]);
  r = await sendValidated(made, officer);
  ok("C3 pass (C7.6-10): its validated copy is read back (201)", r.status === 201, [r.status, r.body?.detail]);
  p = (await prepare(c.id, officer)).p; rd = readinessOf(p, fid);
  const done = itemsOf(p, P, "IMM 5257")[0];
  ok("C3 pass (C7.6-12): the Validate block is gone; the line is In progress, naming the validated copy", !codes(rd?.blocks).includes("barcode_not_validated") && done?.state === "in_progress" && done?.validated?.copy === made && done?.validated?.current === true, { blocks: codes(rd?.blocks), state: done?.state, validated: done?.validated });

  // A line left Online still gives "Copy, not for filing" and nothing to validate.
  const sc = await generateCopy(c.id, "IMM 5257", S);
  ok("C3 pass: the spouse's IMM 5257, left Online, is still stamped \"Copy, not for filing\"", (await copyOf(sc, officer))?.copy_not_for_filing === true);
  r = await sendValidated(sc, officer);
  ok("C3 fail: a copy of a line left Online cannot be validated (409)", r.status === 409, [r.status, r.body?.detail]);

  // C9.2: a fact on it changes after the read-back: the Paper line is Out of date, naming the fact.
  await answer(c.id, P, "person.family_name", "SAMPLEDZ"); await confirmAll(c.id, P);
  p = (await prepare(c.id, officer)).p;
  const old = itemsOf(p, P, "IMM 5257")[0];
  ok("C3 pass (C9.2): after a change of family name the validated copy reads Out of date, naming the fact", old?.state === "out_of_date" && /family name/i.test(old?.reason ?? "") && old?.validated?.current === false, old?.reason);
  ok("C3 fail (C9.2): the out-of-date validated copy blocks Ready to file again", codes(readinessOf(p, fid)?.blocks).includes("barcode_not_validated"), codes(readinessOf(p, fid)?.blocks));

  // A copy made while the line was Online is stamped "Copy, not for filing" for good: switching to Paper afterwards
  // never makes that copy a filing copy, so it is not validated; a new copy is.
  const d = await openCase(vv, [{ role: "principal", name: "Sample Client B", dob: yearsAgo(35) }], { representative: f.rep, caseOfficers: [officer] });
  const B = d.subjects["Sample Client B"];
  await fillEverything(d.id);
  const early = await generateCopy(d.id, "IMM 5257", B);
  let q = (await prepare(d.id, officer)).p;
  r = await call("PATCH", `/runtime/items/${itemsOf(q, B, "IMM 5257")[0]?.id}/channel`, { channel: "PAPER", reason: REASON, version: q?.version }, officer);
  r = await sendValidated(early, officer);
  ok("C3 fail: a copy stamped \"Copy, not for filing\" (made while Online) is not validated after the switch (409, names a new copy)", r.status === 409 && /new copy/i.test(r.body?.detail ?? ""), [r.status, r.body?.detail]);
  // Review m1: a passing read-back kept for that stamped copy before Validate refused it (main's 201; one SQL write stands
  // for it, as no route can write it any more) never counts for readiness either.
  const kept = sql(`insert into validated_copy (id, workspace_id, form_instance_id, path, sha256, facts_hash, read_back, read_by) select gen_random_uuid(), f.workspace_id, f.id, 'var/sample-kept-before-c3.pdf', repeat('0', 64), a.input_hash, '{"ok":true,"validation":{"passed":true}}'::jsonb, '${officer}' from form_instance f join answer_snapshot a on a.id = f.snapshot_id where f.id = '${early}' returning id`);
  q = (await prepare(d.id, officer)).p;
  const bl = itemsOf(q, B, "IMM 5257")[0];
  ok("C3 fail (review m1): a kept read-back of the stamped copy does not count: the Paper line names no validated copy", !!kept && bl?.state === "to_do" && bl?.validated === null, { kept, state: bl?.state, validated: bl?.validated });
  ok("C3 fail: that refused read-back leaves the Validate block in place", codes(readinessOf(q, filingOf(q, B)?.id)?.blocks).includes("barcode_not_validated"), codes(readinessOf(q, filingOf(q, B)?.id)?.blocks));
  const fresh = await generateCopy(d.id, "IMM 5257", B);
  r = await sendValidated(fresh, officer);
  ok("C3 pass: a new copy made after the switch is validated and read back (201)", (await copyOf(fresh, officer))?.copy_not_for_filing === false && r.status === 201, [r.status, r.body?.detail]);

  // Row C3 names PDF upload too (inside what IRCC accepts on the account; no reason needed): the same round trip.
  const u = await openCase(vv, [{ role: "principal", name: "Sample Client U", dob: yearsAgo(33) }], { representative: f.rep, caseOfficers: [officer] });
  const U = u.subjects["Sample Client U"];
  await fillEverything(u.id);
  let w = (await prepare(u.id, officer)).p;
  r = await call("PATCH", `/runtime/items/${itemsOf(w, U, "IMM 5257")[0]?.id}/channel`, { channel: "PDF_UPLOAD", version: w?.version }, officer);
  w = (await prepare(u.id, officer)).p;
  ok("C3 fail (PDF upload): moved to PDF upload, IMM 5257 with no validated copy is the Validate block", r.status === 200 && codes(readinessOf(w, filingOf(w, U)?.id)?.blocks).includes("barcode_not_validated"), [r.status, codes(readinessOf(w, filingOf(w, U)?.id)?.blocks)]);
  const up = await generateCopy(u.id, "IMM 5257", U);
  r = await sendValidated(up, officer);
  w = (await prepare(u.id, officer)).p;
  ok("C3 pass (PDF upload): its copy is for filing, its validated copy reads back (201) and the block is gone", (await copyOf(up, officer))?.copy_not_for_filing === false && r.status === 201 && !codes(readinessOf(w, filingOf(w, U)?.id)?.blocks).includes("barcode_not_validated"), [r.status, codes(readinessOf(w, filingOf(w, U)?.id)?.blocks)]);
});
