// BK-19 (C7.2, P-46, QA-315; review M1, M2, M4 on #1679): the upload door's barcode rule through the product's routes.
// A Visitor visa case whose barcode form (IMM 5257) is filed on Paper, every fact confirmed. A pass and a fail per rule:
// * Lock: a copy whose read-back does not count (the form's flag, no barcode) is refused, in the barcode check's words;
//   the same copy with its barcodes read and matching locks.
// * Kept once (QA-128): the same not-counting file sent again, and twice at once, adds no row ("already read back").
// * Sent again after another file (review M1): good, then stale, then good again: the last is read back and counts.
// * A row read back before BK-19 (no barcode check) never counts, says so, and the same file sent again counts.
// * Stamp (QA-345): after a send back that changed a fact, round 2's approval stamps no file; a read-back that does not
//   count leaves it so; one that counts stamps it.
// The validated files are SYNTHETIC (tools/simulate_validate.py). No model call (US$0).
//   zsh studio/tools/isolated.sh rt_bk19a 4436 start && tsx studio/tests/runtime/setup_visitor_visa.ts 4436 xr_studio_rt_bk19a && tsx studio/acceptance/lib/setup_vv_m3.ts 4436 xr_studio_rt_bk19a && tsx studio/tests/check_bk19_upload_api.ts 4436 xr_studio_rt_bk19a
import { adobeValidated, agent, answer, asValidated, call, confirmAll, copyBytes, expectedFor, fillEverything, firms, generateCopy, itemsOf, main, needVisitorVisa, ok, openCase, prepare, sendFile, sql, yearsAgo } from "../acceptance/lib/m3.ts";

type Q = { subjectId: string; fact: string; value_type: string; hidden: boolean; group: string | null; fills: { form: string }[]; answer: { value?: unknown } | null };
await main("BK-19", "C7.2: the upload door's barcode rule through the routes", async () => {
  const vv = needVisitorVisa(), f = await firms(), officer = f.officer ?? "user-O", rep = f.rep ?? "user-R";
  const c = await openCase(vv, [{ role: "principal", name: "Sample Client B", dob: yearsAgo(40) }], { representative: rep, caseOfficers: [officer] });
  const P = c.subjects["Sample Client B"], FORM = "IMM 5257";
  await fillEverything(c.id);
  let q0 = (await prepare(c.id, officer)).p;
  const item = itemsOf(q0, P, FORM)[0];
  if (item?.channel !== "PAPER") await call("PATCH", `/runtime/items/${item?.id}/channel`, { channel: "PAPER", reason: "Cannot apply online: accommodation (Sample)", version: q0?.version }, officer);
  q0 = (await prepare(c.id, officer)).p;
  ok("C7.2 BK-19 setup: IMM 5257 on Paper for the principal, every fact confirmed", itemsOf(q0, P, FORM)[0]?.channel === "PAPER" && !!(await expectedFor(c.id)));
  const send = async (copy: string, bytes: Buffer) => sendFile(`/runtime/form-copies/${copy}/validated`, bytes, "IMM5257-validated.pdf", officer);
  const rows = (copy: string) => Number(sql(`select count(*) from validated_copy where form_instance_id='${copy}'`));
  const view = async (copy: string) => (await call("GET", `/runtime/form-copies/${copy}`, undefined, officer)).body;

  // Lock: refused while the read-back does not count; locks once it does.
  const a = (await generateCopy(c.id, FORM, P))!;
  const madeA = await copyBytes(a, officer), flagOnly = asValidated(madeA);
  const up1 = await send(a, flagOnly);
  const lk1 = await call("POST", `/runtime/form-copies/${a}/lock`, { kind: "printed" }, officer);
  ok("C7.2 BK-19 fail (lock): a copy whose read-back holds no barcode is not locked for filing (409), in the barcode check's words", up1.status === 201 && lk1.status === 409 && /does not count as validated: 0 of the 5 barcodes are in this file/.test(lk1.body?.detail ?? "") && sql(`select locked_at is null from form_instance where id='${a}'`) === "t", lk1.body?.detail);

  // Kept once (QA-128): the same not-counting file again, and twice at once.
  const again = await send(a, flagOnly);
  const both = await Promise.all([send(a, flagOnly), send(a, flagOnly)]);
  ok("C7.2 BK-19 fail (QA-128, review M2): the same file that does not count, sent again and twice at once, adds no row; the answer says it is already read back and why it does not count", rows(a) === 1 && again.status === 409 && both.every((x) => x.status === 409) && /already read back .* does not count as validated: 0 of the 5 barcodes/.test(again.body?.detail ?? ""), { rows: rows(a), again: again.status, both: both.map((x) => x.status), words: again.body?.detail });

  // Sent again after another file (review M1): good, stale, good.
  const good = adobeValidated(madeA), stale = asValidated(madeA, "Yes", true, "barcodes-stale");
  const g1 = await send(a, good), s1 = await send(a, stale), g2 = await send(a, good);
  const after = await view(a);
  ok("C7.2 BK-19 pass (review M1): a good file, then one with stale barcodes, then the good file again: the last is read back (201) and the copy counts as validated", g1.status === 201 && g1.body?.copy?.validated?.current === true && s1.status === 201 && s1.body?.copy?.validated?.current === false && g2.status === 201 && after?.validated?.current === true, { g1: g1.status, s1: [s1.status, s1.body?.copy?.validated?.current], g2: [g2.status, g2.body?.detail], now: after?.validated?.current });
  const lk2 = await call("POST", `/runtime/form-copies/${a}/lock`, { kind: "printed" }, officer);
  ok("C7.2 BK-19 pass (lock): with its barcodes read and matching, the copy locks as printed", lk2.status < 300 && sql(`select locked_at is not null from form_instance where id='${a}'`) === "t", { status: lk2.status, words: lk2.body?.detail });
  const dup = await send(a, good);
  ok("C7.2 BK-19 fail (QA-128): the good file sent once more is already read back (409), nothing added", dup.status === 409 && /already read back and kept/.test(dup.body?.detail ?? ""), dup.body?.detail);

  // A row read back before BK-19 (no barcode check): never counts, says so; the same file again is read and counts.
  const b = (await generateCopy(c.id, FORM, P))!;
  const goodB = adobeValidated(await copyBytes(b, officer));
  await send(b, goodB);
  sql(`update validated_copy set read_back = read_back - 'barcodes' where form_instance_id='${b}'`);
  const old = await view(b);
  ok("C7.2 BK-19 fail (old row): a validated copy read back before BK-19 (no barcode check) does not count, and says to send the file again", old?.validated?.current === false && /Read back before its barcodes were checked: send the file you validated in Adobe again/.test(old?.validated?.words ?? "") && old?.validated?.barcodes === null, old?.validated);
  const re = await send(b, goodB);
  ok("C7.2 BK-19 pass (old row): the same file sent again is read back with its barcodes (201) and counts", re.status === 201 && re.body?.copy?.validated?.current === true && re.body?.copy?.validated?.barcodes?.matched === true, { status: re.status, words: re.body?.detail });

  // Stamp (QA-345, C8.3): round 2's approval stamps no file after a send back; only a read-back that counts stamps it.
  const fP = (await prepare(c.id, officer)).p?.filings[0]?.id;
  const hashes = async (r: string) => Object.fromEntries((((await call("GET", `/runtime/reviews/${r}`, undefined, rep)).body?.filings?.[0]?.forms ?? []) as { item: string; live_hash: string | null }[]).map((x) => [x.item, x.live_hash ?? "waits"]));
  const r1 = (await call("POST", `/runtime/cases/${c.id}/reviews`, { filings: [fP] }, officer)).body?.id as string;
  await call("POST", `/runtime/reviews/${r1}/open`, { filing: fP }, rep);
  await call("POST", `/runtime/reviews/${r1}/decision`, { filing: fP, verdict: "send_back", form_hashes: await hashes(r1), reasons: [{ text: `${FORM}: the city of birth does not match the passport (Sample).` }] }, rep);
  const q = (((await agent(c.id))?.sections ?? []) as { questions: Q[] }[]).flatMap((s) => s.questions).find((x) => x.subjectId === P && !x.hidden && !x.group && x.value_type === "text" && x.fills.length > 0 && x.fills.every((y) => y.form === FORM) && typeof x.answer?.value === "string");
  if (q) { await answer(c.id, P, q.fact, `${String(q.answer?.value)}VILLE`, officer); await confirmAll(c.id, P); }
  const r2 = (await call("POST", `/runtime/cases/${c.id}/reviews`, { filings: [fP] }, officer)).body?.id as string;
  await call("POST", `/runtime/reviews/${r2}/open`, { filing: fP }, rep);
  const dec = await call("POST", `/runtime/reviews/${r2}/decision`, { filing: fP, verdict: "approve", form_hashes: await hashes(r2), confirm_unticked: true }, rep);
  const kind = () => sql(`select stamp_file_kind from review_round_form where round_id='${r2}' and form_number='${FORM}'`);
  const kindBefore = kind();
  const d = (await generateCopy(c.id, FORM, P))!;
  const madeD = await copyBytes(d, officer);
  const notCounting = await send(d, asValidated(madeD));
  ok("C7.2 BK-19 fail (stamp, QA-345): after round 2's approval that stamped no file, a read-back that does not count (no barcode) stamps nothing", !!q && dec.status === 200 && kindBefore === "none" && notCounting.status === 201 && kind() === "none", { fact: q?.fact, dec: dec.status, kindBefore, upload: notCounting.status, kindAfter: kind() });
  const counting = await send(d, adobeValidated(madeD));
  ok("C7.2 BK-19 pass (stamp, QA-345): the read-back that counts stamps the approval with that file", counting.status === 201 && kind() === "validated_copy" && sql(`select stamp_file_sha256 from review_round_form where round_id='${r2}' and form_number='${FORM}'`) === sql(`select sha256 from validated_copy where form_instance_id='${d}' order by read_at desc limit 1`), { upload: counting.status, kind: kind() });
});
