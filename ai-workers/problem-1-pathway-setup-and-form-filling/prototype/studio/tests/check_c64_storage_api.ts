// C6.4 storage slice (M3-C, runtime lane; SI-14) and QA-149: requesting a document, uploading it, Not applicable with a
// reason, and the states after Not requested, on the Visitor visa of acceptance pack 4 (setup_visitor_visa.ts, then
// acceptance/lib/setup_vv_m3.ts, both run here when the copy has no letter-of-authorization line yet). QA-149: a question
// that decides a line stays on the case once answered, so a child's "travelling alone" can be changed back. Each rule has
// a passing and a failing case. No model call (US$0). Values Sample until the immigration expert confirms.
//   zsh studio/tools/isolated.sh runtime_c64s 4438 start && tsx studio/tests/check_c64_storage_api.ts 4438 xr_studio_runtime_c64s
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { AUTHOR, CLIENT, CLIENT_B, FAMILY, OFFICER, PORT, DB, answer, call, main, ok, openCase, sql } from "../acceptance/lib/m3.ts";

type Doc = { id: string; current: boolean; sha256: string; size_bytes: number; media_type: string };
type Line = { id: string; version: number; derived_id: string; label: string; state: string; reason: string; required: boolean; kept: boolean; state_reason: string | null; documents: Doc[] };
type P = { subject: string; lines: Line[]; waiting: Line[]; not_needed: Line[] };
const studio = join(import.meta.dirname, "..");
const MAX = 20 * 1024 * 1024, LETTER = /authori[sz]ation/i, TRAVEL = "person.travels_with"; // R3: the letter follows "travels with" (alone) on a child under 18

const hasLetter = () => sql("select count(*) from canonical_field where canonical_field_key='person.travels_with'") !== "0" && sql("select count(*) from document_type where document_type_key='letter_of_authorization_for_a_minor'") === "1";
if (!hasLetter()) for (const f of ["tests/runtime/setup_visitor_visa.ts", "acceptance/lib/setup_vv_m3.ts"])
  try { execFileSync(join(studio, "node_modules", ".bin", "tsx"), ["--tsconfig", join(studio, "api", "tsconfig.json"), join(studio, f), String(PORT), DB], { stdio: ["ignore", "ignore", "inherit"], timeout: 900_000 }); }
  catch { /* the setups exit 1 on their own known gaps (pack 4 S2w, S7, S7a); what this check needs is asked below */ }

await main("C6.4 storage", "request, upload, Not applicable, kept lines; QA-149", async () => {
  ok("setup: the Visitor visa with pack 4's document lines is released on this copy", hasLetter());
  const c = await openCase(sql("select id from combination where combination_key='vv.single'")!, FAMILY);
  const A = c.subjects["Sample Client A"], S = c.subjects["Sample Spouse A"], K1 = c.subjects["Sample Child A1"];
  await answer(c.id, c.caseSubject, "case.application_date", new Date().toISOString().slice(0, 10), OFFICER); // ages for the under-18 lines (R3)
  const list = async (actor = OFFICER) => { const r = await call("GET", `/runtime/cases/${c.id}/checklist`, undefined, actor); return (r.body?.people ?? []) as P[]; };
  const of = (ps: P[], s: string) => ps.find((x) => x.subject === s)!;
  const line = (ps: P[], s: string, re: RegExp) => of(ps, s)?.lines.find((x) => re.test(x.label));
  const asked = async (mode: string, actor: string) => ((await call("GET", `/runtime/cases/${c.id}/questionnaire?mode=${mode}`, undefined, actor)).body?.sections ?? [])
    .some((x: { subjectId: string; questions: { fact: string }[] }) => x.subjectId === K1 && x.questions.some((q) => q.fact === TRAVEL));
  const up = async (lineId: string, files: { name: string; bytes: Uint8Array<ArrayBuffer>; field?: string }[], actor = OFFICER, extra: Record<string, string> = {}) => {
    const fd = new FormData(); for (const [k, v] of Object.entries(extra)) fd.append(k, v); for (const f of files) fd.append(f.field ?? "file", new Blob([f.bytes]), f.name);
    const res = await fetch(`http://127.0.0.1:${PORT}/api/runtime/checklist-lines/${lineId}/documents`, { method: "POST", headers: { "x-actor": actor }, body: fd });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  const pdf = (n: string) => new TextEncoder().encode(`%PDF-1.4\n% Sample synthetic document ${n}\n`);
  const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);

  // QA-149: the deciding question stays on the case once answered.
  ok("QA-149 fail (before): unanswered, the child's \"travelling alone\" is asked (it decides the letter line)", await asked("agent", OFFICER));
  let r = await answer(c.id, K1, TRAVEL, "alone", CLIENT);
  ok("QA-149 pass: after yes, the officer's Agent view still asks it, so it can be corrected", r.status < 300 && await asked("agent", OFFICER), r.status);
  ok("QA-149 pass: after yes, the client's questionnaire still asks it", await asked("sqr", CLIENT));
  let ps = await list();
  const letter = line(ps, K1, LETTER);
  ok("C6.4 pass: yes adds the letter line, Not requested, with a stored id (not the derived one)", !!letter && letter.state === "not_requested" && letter.id !== letter.derived_id && /^[0-9a-f-]{36}$/.test(letter.id), letter);
  r = await answer(c.id, K1, TRAVEL, "both_parents", CLIENT);
  ps = await list();
  ok("QA-149 pass: the change back to no is saved and the line goes (nothing requested, so nothing kept)", r.status < 300 && !line(ps, K1, LETTER), r.body?.detail ?? r.status);
  r = await call("PUT", `/runtime/cases/${c.id}/answers/${K1}/${TRAVEL}`, { value: "alone", expectedId: null }, CLIENT);
  ok("QA-149 fail: a change sent without the id of the answer seen is still refused (409)", r.status === 409, r.status);

  // Rows: one per person x document, written once.
  const ids = (x: P[]) => x.flatMap((p) => p.lines.map((l) => l.id)).sort().join();
  const before = Number(sql(`select count(*) from checklist_line where case_id='${c.id}'`));
  ps = await list();
  ok("C6.4 pass (data): reading again writes no new rows and keeps the ids", Number(sql(`select count(*) from checklist_line where case_id='${c.id}'`)) === before && ids(ps) === ids(await list()), before);

  // Request.
  const pass = line(ps, A, /passport/i)!;
  ok("C6.4 fail: a configuration person cannot request (403)", (await call("POST", `/runtime/checklist-lines/${pass.id}/request`, {}, AUTHOR)).status === 403);
  ok("C6.4 fail: another client cannot request (403 or 404)", [403, 404].includes((await call("POST", `/runtime/checklist-lines/${pass.id}/request`, {}, CLIENT_B)).status));
  ok("C6.4 fail: another firm's officer cannot reach the line (404, BR-20)", (await call("POST", `/runtime/checklist-lines/${pass.id}/request`, {}, "user-S")).status === 404);
  ok("C6.4 fail: an unknown or malformed line id is not found (404)", (await call("POST", `/runtime/checklist-lines/00000000-0000-4000-8000-000000000000/request`, {}, OFFICER)).status === 404 && (await call("POST", `/runtime/checklist-lines/${pass.derived_id}/request`, {}, OFFICER)).status === 404);
  r = await call("POST", `/runtime/checklist-lines/${pass.id}/request`, {}, OFFICER);
  const again = await call("POST", `/runtime/checklist-lines/${pass.id}/request`, {}, OFFICER);
  ok("C6.4 fail: asking again from an old view of the line (version 1, now 2) is told it changed (409), not 200", (await call("POST", `/runtime/checklist-lines/${pass.id}/request`, { version: pass.version }, OFFICER)).status === 409);
  const neg = await call("POST", `/runtime/checklist-lines/${pass.id}/request`, { version: -1 }, OFFICER);
  ok("C6.4 fail: a version that is not a whole number from 0 is refused in plain words (400)", neg.status === 400 && /whole number from 0/.test(JSON.stringify(neg.body)), neg.body);
  ok("C6.4 pass: an empty or null version is \"not sent\" (200), never read as 0", (await call("POST", `/runtime/checklist-lines/${pass.id}/request`, { version: "" }, OFFICER)).status === 200 && (await call("POST", `/runtime/checklist-lines/${pass.id}/request`, { version: null }, OFFICER)).status === 200);
  ok("C6.4 pass: requesting twice is one request (200, Requested, one audit line)", r.status === 200 && again.status === 200 && again.body?.state === "requested" && sql(`select count(*) from audit_event where entity_key='${pass.id}' and action='requested'`) === "1", again.body);

  // Upload.
  let u = await up(pass.id, [{ name: "../../etc/<b>passport</b>.txt", bytes: new TextEncoder().encode("not a document") }]);
  ok("C6.4 fail: a file that is not a PDF, JPEG or PNG by its bytes is refused (415), nothing stored", u.status === 415 && sql(`select count(*) from case_document where subject_id='${A}'`) === "0", u.status);
  u = await up(pass.id, [{ name: "empty.pdf", bytes: new Uint8Array() }]);
  ok("C6.4 fail: an empty file is refused (400)", u.status === 400, u.status);
  u = await up(pass.id, [{ name: "a.pdf", bytes: pdf("a") }, { name: "b.pdf", bytes: pdf("b") }]);
  ok("C6.4 fail: two files at once are refused in this route's words (413, \"one file\"), nothing stored", u.status === 413 && /one file/i.test(String(u.body?.detail)) && sql(`select count(*) from case_document where subject_id='${A}'`) === "0", u.body);
  const big = new Uint8Array(MAX + 1); big.set(pdf("big"));
  u = await up(pass.id, [{ name: "big.pdf", bytes: big }]);
  ok("C6.4 fail: a file over 20 MB is refused in this route's words (413, \"20 MB\"), nothing stored", u.status === 413 && /20 MB/.test(String(u.body?.detail)) && !/25 MB/.test(String(u.body?.detail)) && sql(`select count(*) from case_document where subject_id='${A}'`) === "0", u.body);
  ok("C6.4 fail: a configuration person cannot upload (403); another firm's officer cannot reach the line (404)", (await up(pass.id, [{ name: "a.pdf", bytes: pdf("a") }], AUTHOR)).status === 403 && (await up(pass.id, [{ name: "a.pdf", bytes: pdf("a") }], "user-S")).status === 404);
  u = await up(pass.id, [{ name: "a.pdf", bytes: pdf("a") }], OFFICER, { version: "0" });
  ok("C6.4 fail: an upload from an old view of the line (version 0) is refused (409), nothing stored", u.status === 409 && sql(`select count(*) from case_document where subject_id='${A}'`) === "0", u.body);
  u = await up(pass.id, [{ name: "a.pdf", bytes: pdf("a"), field: "upload" }]);
  ok("C6.4 fail: a file in another field than \"file\" is refused (400)", u.status === 400, u.status);
  u = await up(pass.id, [{ name: "passport.pdf", bytes: pdf("x") }], CLIENT_B);
  ok("C6.4 fail: another client cannot upload on this case (404)", u.status === 404, u.status);
  u = await up(pass.id, [{ name: "../dir/passport<1>.pdf", bytes: pdf("1") }], CLIENT);
  const d1 = u.body?.document as Doc | undefined;
  const path = sql(`select path from case_document where id='${d1?.id}'`) ?? "";
  // The copy's working files are under studio/var (isolated-<name>, its name prefixed per lane): found by the row's path.
  const abs = execFileSync("find", [join(studio, "var"), "-path", `*/workspaces/demo/${path}`], { encoding: "utf8" }).trim().split("\n")[0];
  ok("C6.4 pass: the case's client uploads the requested file: Received, stored as the person's, its name cleaned", u.status === 201 && u.body?.state === "received" && sql(`select subject_id from case_document where id='${d1?.id}'`) === A && sql(`select file_name from case_document where id='${d1?.id}'`) === "passport1.pdf", u.body);
  ok("C6.4 pass (data): the file on disk has the stored checksum and is named by the row id", !!abs && existsSync(abs) && path.endsWith(`${d1?.id}.pdf`) && createHash("sha256").update(readFileSync(abs)).digest("hex") === d1?.sha256, abs);
  u = await up(pass.id, [{ name: "passport-new.png", bytes: PNG }]);
  ps = await list();
  const docs = line(ps, A, /passport/i)!.documents;
  ok("C6.4 pass: a new passport (PNG) keeps the old one as history: two documents, the new one current", u.status === 201 && docs.length === 2 && docs.filter((d) => d.current).map((d) => d.id).join() === u.body?.document?.id && docs.find((d) => !d.current)?.id === d1?.id, docs);
  const exact = new Uint8Array(MAX); exact.set(pdf("exact"));
  u = await up(pass.id.toUpperCase(), [{ name: "Паспорт-护照-\u202Egpj.pdf", bytes: exact }]);
  ok("C6.4 pass: a file of exactly 20 MB is taken, on the line id in capitals, its name kept as typed (UTF-8) without the right-to-left control", u.status === 201 && u.body?.document?.size_bytes === MAX && sql(`select file_name from case_document where id='${u.body?.document?.id}'`) === "Паспорт-护照-gpj.pdf", u.status === 201 ? sql(`select file_name from case_document where id='${u.body?.document?.id}'`) : u.body);
  const onDisk = Number(execFileSync("find", [join(studio, "var"), "-path", `*/workspaces/demo/people/${A}/documents/*`, "-type", "f"], { encoding: "utf8" }).trim().split("\n").filter(Boolean).length);
  ok("C6.4 pass (data): refused uploads leave no file: files on disk = document rows", onDisk === Number(sql(`select count(*) from case_document where subject_id='${A}'`)), onDisk);
  r = await call("POST", `/runtime/checklist-lines/${pass.id}/request`, {}, OFFICER);
  ok("C6.4 fail: a received line cannot be requested again (409, still Received)", r.status === 409 && line(await list(), A, /passport/i)!.state === "received", r.status);

  // Not applicable.
  const sp = line(ps, S, /passport/i)!;
  for (const [b, why] of [[{}, "no reason"], [{ reason: "   " }, "only spaces"], [{ reason: "\u200B\u200B" }, "only zero-width spaces"], [{ reason: "x".repeat(501) }, "over 500 characters"]] as const) {
    r = await call("POST", `/runtime/checklist-lines/${sp.id}/not-applicable`, b, OFFICER);
    ok(`C6.4 fail: Not applicable with ${why} is refused on the field (400)`, r.status === 400 && /reason/i.test(JSON.stringify(r.body)), r.status);
  }
  r = await call("POST", `/runtime/checklist-lines/${sp.id}/not-applicable`, { reason: "Sample", version: sp.version + 1 }, OFFICER);
  ok("C6.4 fail: Not applicable from a view of another version is refused (409), the line unchanged", r.status === 409 && sql(`select state from checklist_line where id='${sp.id}'`) === "not_requested", r.body);
  ok("C6.4 fail: a client cannot mark Not applicable (403)", (await call("POST", `/runtime/checklist-lines/${sp.id}/not-applicable`, { reason: "Sample" }, CLIENT)).status === 403);
  r = await call("POST", `/runtime/checklist-lines/${sp.id}/not-applicable`, { reason: "  Sample: officer's test  ", version: sp.version }, OFFICER);
  ok("C6.4 pass: Not applicable with a reason (trimmed), sent with the version seen; the line stays on the list with it, not required", r.status === 200 && r.body?.state === "not_applicable" && r.body?.required === false && line(await list(), S, /passport/i)?.state_reason === "Sample: officer's test", r.body);
  u = await up(sp.id, [{ name: "p.pdf", bytes: pdf("s") }]);
  ok("C6.4 fail: uploading on a Not applicable line is refused (409), nothing stored", u.status === 409 && sql(`select count(*) from case_document where subject_id='${S}'`) === "0", u.status);
  r = await call("POST", `/runtime/checklist-lines/${sp.id}/request`, {}, OFFICER);
  ok("C6.4 pass: a Not applicable line can be requested again (Requested, reason cleared)", r.status === 200 && r.body?.state === "requested" && r.body?.state_reason === null, r.body);
  ok("C6.4 fail (data): the database refuses Not applicable without a reason", sql(`update checklist_line set state='not_applicable', state_reason=null where id='${sp.id}' returning id`) === null);

  // Kept lines: acted on, they stay when the answers no longer call for them.
  ps = await list(); // the change to yes above was refused, so the letter is not on the list
  await answer(c.id, K1, TRAVEL, "alone", CLIENT);
  const kl = line(await list(), K1, LETTER)!;
  ok("C6.4 pass: the letter line comes back with the same id it had before", kl?.id === letter?.id, [kl?.id, letter?.id]);
  await call("POST", `/runtime/checklist-lines/${kl.id}/request`, {}, OFFICER);
  await answer(c.id, K1, TRAVEL, "both_parents", CLIENT);
  const kept = line(await list(), K1, LETTER);
  ok("C6.4 pass: a requested line the answers no longer call for stays on the list, kept, not required, saying why", !!kept && kept.kept && !kept.required && kept.state === "requested" && /Kept on the list/.test(kept.reason), kept);
  const ps2 = await list();
  ok("C6.4 pass: a kept line is not listed twice (not also under Not needed)", !of(ps2, K1).not_needed.some((x) => LETTER.test(x.label)));
  // A line nobody acted on and the answers took away cannot be acted on.
  const k2 = c.subjects["Sample Child A2"];
  await answer(c.id, k2, TRAVEL, "alone", CLIENT);
  const l2 = line(await list(), k2, LETTER)!;
  await answer(c.id, k2, TRAVEL, "both_parents", CLIENT);
  r = await call("POST", `/runtime/checklist-lines/${l2.id}/request`, {}, OFFICER);
  ok("C6.4 fail: a line the answers took away and nobody acted on cannot be requested (409, words)", r.status === 409 && /not on .* list now/i.test(String(r.body?.detail)), r.body);
  // Break m4: the same request at the same moment (a double click) is one request, never a false conflict.
  const pp = line(await list(), A, /financial support/i)!;
  const all = await Promise.all(Array.from({ length: 6 }, () => call("POST", `/runtime/checklist-lines/${pp.id}/request`, {}, OFFICER)));
  ok("C6.4 pass: six identical requests at once all answer 200 Requested", all.every((x) => x.status === 200 && x.body?.state === "requested"), all.map((x) => x.status));
  // Break M1: a person marked not travelling keeps the lines acted on for them.
  r = await call("PATCH", `/runtime/cases/${c.id}/people/${S}`, { applies: false }, OFFICER);
  const sk = line(await list(), S, /passport/i);
  ok("C6.4 pass: the spouse marked not travelling keeps their requested passport line, kept, saying why", r.status < 300 && !!sk && sk.kept && sk.state === "requested" && /not travelling/i.test(sk.reason), [r.status, sk]);
  ok("C6.4 pass: the kept line of a person not travelling can still be acted on (Not applicable, 200)", (await call("POST", `/runtime/checklist-lines/${sk?.id}/not-applicable`, { reason: "Sample: not travelling" }, OFFICER)).status === 200);
  ok("C6.4 fail: the checklist stays the officer's: the client reads 403 or 404", [403, 404].includes((await call("GET", `/runtime/cases/${c.id}/checklist`, undefined, CLIENT)).status));
});
