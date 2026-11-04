// C9.2 Undo a changed fact and Out of date items (runtime lane, M3-F; r5c BR-12, BR-20; P-65, P-136): through the API on
// an isolated copy with the pack's own setup. (1) Who may undo (the case officer only: a client and a configuration person
// get 403) and what is refused in words (no such person or fact, a list entry, nothing to undo, a stale read). (2) Undo
// is append-only: the earlier value comes back as a new row, its confirmation with it; a second Undo puts the change
// back. (3) A signed IMM 5476 out of date: the signed one is listed Out of date and a new one To do; printing a new copy
// starts its signing steps again with the signed scan kept, and a print with nothing changed is still refused. Sample
// data, no model call (US$0). acceptance/C9.2.test.ts proves the rest of the row.
// It runs the pack's own setup on its copy first when the copy has no release 2 of Visitor visa yet.
//   zsh studio/tools/isolated.sh rt_c92 4439 start && tsx studio/tests/check_c92_undo_api.ts 4439 xr_studio_rt_c92
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { AUTHOR, CLIENT, DB, OFFICER, PORT, agent, answer, call, confirmAll, fillEverything, firms, generateCopy, itemsOf, needVisitorVisa, openCase, prepare, signByHand, sql, validateRoundTrip, yearsAgo } from "../acceptance/lib/m3.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const releases = () => { try { return Number(sql(`select coalesce(max(r.version), 0) from config_release r join combination c on c.id = r.combination_id where c.combination_key = 'vv.single'`)); } catch { return 0; } };
const studio = join(import.meta.dirname, ".."), tsx = join(studio, "node_modules", ".bin", "tsx");
const setup = (file: string) => spawnSync(tsx, ["--tsconfig", join(studio, "api", "tsconfig.json"), join(studio, file), String(PORT), DB], { cwd: join(studio, ".."), stdio: "ignore", timeout: 900_000 });
if (releases() < 1) setup("tests/runtime/setup_visitor_visa.ts");
if (releases() < 2) setup("acceptance/lib/setup_vv_m3.ts"); // its own red lines (other rows' S2w, S7a) do not stop it
ok("setup: the copy has Visitor visa release 2 (the pack's setup)", releases() >= 2, releases());
const vv = needVisitorVisa();
const f = await firms();
const officer = f.officer ?? OFFICER;

const c = await openCase(vv, [{ role: "principal", name: "Sample Client U", dob: yearsAgo(41) }], { representative: f.rep, caseOfficers: [officer] });
const P = c.subjects["Sample Client U"];
await fillEverything(c.id);
const undo = (body: unknown, actor = officer) => call("POST", `/runtime/cases/${c.id}/changes/undo`, body, actor);
const FN = "person.family_name";
const current = () => sql(`select value_json #>> '{}' from client_canonical_answer where subject_id='${P}' and canonical_field_key='${FN}' and superseded_by_id is null`);
const rowsOf = () => Number(sql(`select count(*) from client_canonical_answer where subject_id='${P}' and canonical_field_key='${FN}'`));

// (1) Who and what.
ok("C9.2 undo (fail): a client cannot undo (staff route)", (await undo({ subjectId: P, fact: FN }, CLIENT)).status === 403);
ok("C9.2 undo (fail): a configuration person cannot undo", (await undo({ subjectId: P, fact: FN }, AUTHOR)).status === 403);
const bad = await undo({ fact: FN });
ok("C9.2 undo (fail): no person named → 400 naming subjectId", bad.status === 400 && JSON.stringify(bad.body).includes("subjectId"), bad.body);
ok("C9.2 undo (fail): a person not on this case → 404", (await undo({ subjectId: "00000000-0000-4000-8000-000000000000", fact: FN })).status === 404);
ok("C9.2 undo (fail): a fact the release does not ask → 404", (await undo({ subjectId: P, fact: "person.not_a_fact" })).status === 404);
ok("C9.2 undo (fail): an entry in a list is changed in its own row → 422", (await undo({ subjectId: P, fact: "person.education_from_date" })).status === 422);
const before = current(), n0 = rowsOf();
const none = await undo({ subjectId: P, fact: FN });
ok("C9.2 undo (fail): an answer never changed has nothing to undo → 409 in words, nothing written", none.status === 409 && /nothing to undo/.test(none.body?.detail ?? "") && rowsOf() === n0, none.body?.detail);

// (2) Append-only, both ways.
await answer(c.id, P, FN, "SAMPLEUZ"); await confirmAll(c.id, P);
const seen = sql(`select id from client_canonical_answer where subject_id='${P}' and canonical_field_key='${FN}' and superseded_by_id is null`);
ok("C9.2 undo (fail): a read older than the current answer → 409, nothing written", (await undo({ subjectId: P, fact: FN, expectedId: "00000000-0000-4000-8000-000000000000" })).status === 409 && current() === "SAMPLEUZ");
const n1 = rowsOf(), u1 = await undo({ subjectId: P, fact: FN, expectedId: seen });
ok("C9.2 undo: the earlier value is back, as a new row; the changed one is kept", u1.status === 200 && current() === before && rowsOf() === n1 + 1 && u1.body?.undid?.value === "SAMPLEUZ", u1.body);
const q = (await agent(c.id))?.sections?.flatMap((s: { questions: { subjectId: string; fact: string; answer: { confirmed: boolean } | null }[] }) => s.questions).find((x: { subjectId: string; fact: string }) => x.subjectId === P && x.fact === FN);
ok("C9.2 undo: the restored value keeps its earlier confirmation (it counts for the forms again)", q?.answer?.confirmed === true, q?.answer);
ok("C9.2 undo: the audit names the undo (never the values)", Number(sql(`select count(*) from audit_event where entity='case fact' and summary like '%undid the last change to ${FN}%'`)) >= 1);
const u2 = await undo({ subjectId: P, fact: FN });
ok("C9.2 undo (fail): a second Undo never puts the change back: with nothing further back, 409 and nothing written", u2.status === 409 && current() === before && rowsOf() === n1 + 1, [u2.status, current()]);

// (2b) Devin on #926: Undo restores a value never confirmed, Confirm section confirms it, and a further Undo goes on back
// (to SAMPLE), never redoing the change just undone.
await answer(c.id, P, FN, "SAMPLEUD"); // entered by the officer, not confirmed (DECLARED)
await answer(c.id, P, FN, "SAMPLEUE"); await confirmAll(c.id, P);
const u3 = await undo({ subjectId: P, fact: FN });
ok("setup: Undo puts back SAMPLEUD, never confirmed", u3.status === 200 && current() === "SAMPLEUD" && u3.body?.answer?.status === "DECLARED", u3.body?.answer);
await confirmAll(c.id, P);
const u4 = await undo({ subjectId: P, fact: FN });
ok("C9.2 undo (Devin on #926): after a confirmation of the restored value, Undo goes further back, never redoes SAMPLEUE", u4.status === 200 && current() === before, [u4.status, current()]);

// (3) A signed IMM 5476 out of date, signed again.
let p = (await prepare(c.id, officer)).p;
const item = itemsOf(p, P, "IMM 5476")[0];
ok("setup: IMM 5476 signed by hand and its scan in", (await signByHand(c.id, item?.id, "IMM 5476", P)) === 201);
const again0 = await call("POST", `/runtime/items/${item?.id}/sign-steps/print`, { copy: await generateCopy(c.id, "IMM 5476", P) }, officer);
ok("C9.2 re-sign (fail): with nothing changed, a second print is still refused", again0.status === 409 && /already done/.test(again0.body?.detail ?? ""), again0.body?.detail);
await answer(c.id, P, FN, "SAMPLEUY"); await confirmAll(c.id, P);
p = (await prepare(c.id, officer)).p;
const both = itemsOf(p, P, "IMM 5476") as { id: string; state: string; item?: string; record?: string; reason?: string; changes?: { fact: string; undo: boolean }[] }[];
const old = both.find((x) => x.state === "out_of_date"), fresh = both.find((x) => x.state === "to_do");
ok("C9.2 signed: the signed one is listed Out of date (its scan's own id, the item named), with the change to undo", !!old && old.record === "signed_scan" && old.item === item?.id && old.id !== item?.id && /family name/i.test(old.reason ?? "") && !!old.changes?.some((x) => x.fact === FN && x.undo), old);
const ch = old?.changes?.find((x) => x.fact === FN) as { expected_id?: string; restores?: unknown } | undefined;
ok("C9.2 changes (review M1, M2): a change says what Undo puts back and the answer it was read from", ch?.restores === "SAMPLE" && ch?.expected_id === sql(`select id from client_canonical_answer where subject_id='${P}' and canonical_field_key='${FN}' and superseded_by_id is null`), ch);
ok("C9.2 signed: the item asks for a new signed one (To do), keeping its own id", fresh?.id === item?.id && /A new signed IMM 5476 is needed/.test(fresh?.reason ?? ""), fresh);
const reprint = await call("POST", `/runtime/items/${item?.id}/sign-steps/print`, { copy: await generateCopy(c.id, "IMM 5476", P) }, officer);
const steps = reprint.body?.sign_steps as { key: string; done: unknown }[] | undefined;
ok("C9.2 re-sign: printing the new copy starts the signing steps again (print done, signed not yet)", reprint.status === 200 && !!steps?.find((s) => s.key === "print")?.done && !steps?.find((s) => s.key === "signed")?.done, reprint.body?.detail ?? steps);
ok("C9.2 re-sign: the earlier signed scan and steps are kept (append-only, superseded)", Number(sql(`select count(*) from signed_scan where item_id='${item?.id}'`)) === 1 && Number(sql(`select count(*) from sign_step where item_id='${item?.id}' and superseded_at is not null`)) === 3);
p = (await prepare(c.id, officer)).p;
ok("C9.2 re-sign: the item is no longer out of date once a new copy is printed", itemsOf(p, P, "IMM 5476").length === 1 && itemsOf(p, P, "IMM 5476")[0].state !== "out_of_date", itemsOf(p, P, "IMM 5476").map((x) => x.state));

// (4) CI on #926 (check_runtime_r1c): a case-level fact ("about" "case" in a copy's facts) read by a finished item. The
// view answers (200), and the change names the case's own subject (an id), never "case".
type Qv = { subjectId: string; fact: string; value_type: string; options: { key: string }[] | null; fills: { form: string }[]; answer: { id: string; value: unknown } | null };
const caseQ = ((await agent(c.id))?.sections ?? []).flatMap((s: { questions: Qv[] }) => s.questions)
  .find((x: Qv) => x.fact.startsWith("case.") && x.answer && x.fills.some((y) => y.form === "IMM 5257") && ["text", "number"].includes(x.value_type) && !x.options?.length) as Qv | undefined;
ok("setup: IMM 5257 reads a case-level fact answered on this case", !!caseQ, caseQ?.fact);
ok("setup: IMM 5257 validated and read back", !!(await validateRoundTrip(c.id, "IMM 5257", P)));
await answer(c.id, caseQ!.subjectId, caseQ!.fact, caseQ!.value_type === "number" ? "7777" : "SAMPLE CASE CHANGE"); await confirmAll(c.id, caseQ!.subjectId);
const pc = await prepare(c.id, officer);
const ci = itemsOf(pc.p, P, "IMM 5257")[0] as { state?: string; changes?: { subject: string; fact: string; undo: boolean }[] } | undefined;
const cc = ci?.changes?.find((x) => x.fact === caseQ!.fact);
ok("C9.2 changes (CI on #926): a case-level fact's change is listed on the case's own subject and the view answers", pc.res.status === 200 && ci?.state === "out_of_date" && cc?.subject === caseQ!.subjectId && cc?.undo === true, { status: pc.res.status, state: ci?.state, cc });
ok("C9.2 undo: a case-level fact is undone on the case's own subject", (await undo({ subjectId: caseQ!.subjectId, fact: caseQ!.fact })).status === 200);

process.exitCode = summary() ? 1 : 0;
