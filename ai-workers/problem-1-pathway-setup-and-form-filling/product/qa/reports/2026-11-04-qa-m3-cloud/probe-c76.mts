// qa M3 probes of C7.6 Ready to file (independent of the pack). Run from prototype/: tsx <this file> <port> <db>
// on a copy prepared by setup_visitor_visa.ts + setup_vv_m3.ts. Prints one PASS/FAIL line per probe.
import { answer, call, fillEverything, filingOf, firms, needVisitorVisa, openCase, prepare, readinessOf, signByHand, validateRoundTrip, yearsAgo, agent } from "../../../../prototype/studio/acceptance/lib/m3.ts";
const out: string[] = []; let fails = 0;
const ok = (label: string, cond: boolean, got?: unknown) => { if (!cond) fails++; out.push(`${cond ? "PASS" : "FAIL"}  ${label}${cond ? "" : " — " + JSON.stringify(got)?.slice(0, 300)}`); };
const vv = needVisitorVisa(); const f = await firms(); const officer = f.officer ?? "user-O"; const rep = f.rep ?? "user-R";
const c = await openCase(vv, [{ role: "principal", name: "Sample Client Z", dob: yearsAgo(35) }], { representative: rep, caseOfficers: [officer] });
const P = c.subjects["Sample Client Z"];
let p = (await prepare(c.id, officer)).p; const fid = filingOf(p, P)!.id;
const rd = () => prepare(c.id, officer).then((x) => readinessOf(x.p, fid));
let r0 = await rd();
ok("P1 a blank case: missing facts is a CRITICAL warning, the only block is IMM 5257's Validate", !!r0 && r0.warns.some((w: any) => w.code === "missing_facts" && w.severity === "critical") && r0.blocks.every((b: any) => b.code === "barcode_not_validated"), r0);
ok("P2 no percentage anywhere in readiness", !/%/.test(JSON.stringify(r0)), r0);
// Wrong roles and odd input on the pass route
let r = await call("POST", `/runtime/filings/${fid}/warnings/missing_facts/pass`, { reason: "   " }, officer);
ok("P3 a reason of spaces only is refused (400) in words", r.status === 400 && typeof r.body?.detail === "string", [r.status, r.body?.detail]);
r = await call("POST", `/runtime/filings/${fid}/warnings/missing_facts/pass`, { reason: "x".repeat(20000) }, officer);
ok("P4 a 20 000-character reason is refused (400/413/422) or stored whole, never a 500", r.status !== 500, [r.status, r.body?.detail]);
r = await call("POST", `/runtime/filings/${fid}/warnings/missing_facts/pass`, { reason: "ok" }, "user-S");
ok("P5 a solo firm's representative (another firm) cannot pass a warning (403/404)", [403, 404].includes(r.status), [r.status, r.body?.detail]);
r = await call("POST", `/runtime/filings/${fid}/warnings/missing_facts/pass`, { reason: "ok" }, "user-P");
ok("P6 the client cannot pass a warning (403)", r.status === 403, [r.status, r.body?.detail]);
r = await call("POST", `/runtime/filings/00000000-0000-0000-0000-000000000000/ready`, {}, officer);
ok("P7 an unknown filing answers 404 in words", r.status === 404 && !/Cannot POST/.test(r.body?.detail ?? ""), [r.status, r.body?.detail]);
r = await call("POST", `/runtime/filings/${fid}/warnings/no_such_code/pass`, { reason: "ok" }, officer);
ok("P8 an unknown warning code is refused (404/409/400) in words, not a 500", [400, 404, 409].includes(r.status), [r.status, r.body?.detail]);
r = await call("POST", `/runtime/filings/${fid}/warnings/barcode_not_validated/pass`, { reason: "I validated it myself" }, officer);
ok("P9 the barcode block cannot be passed (409)", r.status === 409, [r.status, r.body?.detail]);
// Two passes of the same warning at once: one recorded
const [a, b] = await Promise.all([1, 2].map((n) => call("POST", `/runtime/filings/${fid}/warnings/missing_facts/pass`, { reason: `Client sends the rest by email (Sample) ${n}` }, officer)));
const rr = await rd();
const passedMf = [...new Set((rr?.passed ?? []).filter((x: any) => x.code === "missing_facts").map((x: any) => JSON.stringify([x.by ?? x.passed_by, x.at ?? x.passed_at, x.reason])))];
ok("P10 two passes of one warning at once: one succeeds, the other 409, one pass recorded", [a.status, b.status].sort().join() === "200,409" || [a.status, b.status].sort().join() === "201,409", { statuses: [a.status, b.status], passed: passedMf.length });
ok("P10b one pass of missing_facts is recorded (readiness lists each line it covers, all with one who/when/reason)", passedMf.length === 1, passedMf);
// Fill, validate, sign, review, pass all, ready
await fillEverything(c.id); p = (await prepare(c.id, officer)).p;
for (const i of (p?.items ?? []).filter((x) => x.kind === "form")) {
  if (i.form === "IMM 5257" && i.channel === "PDF_UPLOAD") await validateRoundTrip(c.id, i.form, i.subject);
  if (i.signature === "HAND_SCANNED") await signByHand(c.id, i.id, i.form!, i.subject);
}
let x = await rd();
r = await call("POST", `/runtime/filings/${fid}/review`, { facts_hash: x?.facts_hash, note: "Revisé (exemple) — 審查済み" }, rep);
ok("P12 the representative of record reviews with a non-English note (200/201)", [200, 201].includes(r.status), [r.status, r.body?.detail]);
x = await rd();
for (const w of x?.warns ?? []) await call("POST", `/runtime/filings/${fid}/warnings/${w.code}/pass`, { reason: "Le client apporte le passeport (exemple)" }, officer);
const [g1, g2] = await Promise.all([1, 2].map(() => call("POST", `/runtime/filings/${fid}/ready`, {}, officer)));
ok("P13 Ready to file clicked twice at once: both answer 200 or one 409, never a 500", ![g1.status, g2.status].includes(500) && [g1.status, g2.status].includes(200), [g1.status, g2.status, g1.body?.detail, g2.body?.detail]);
p = (await prepare(c.id, officer)).p;
ok("P14 the filing reads ready_to_file", (filingOf(p, P)?.status ?? "").toLowerCase() === "ready_to_file", filingOf(p, P)?.status);
// Change a fact after Ready to file: the filing goes back
const v = await agent(c.id);
const qs = (v?.sections ?? []).flatMap((s: any) => (s.questions ?? []).map((q: any) => ({ ...q, subjectId: s.subjectId })));
const q = qs.find((q: any) => q.subjectId === P && /family_name|surname/.test(q.fact) && q.answer);
const ch = q ? await answer(c.id, P, q.fact, "Changed-Name", officer, { expectedId: q.answer.id }) : { status: 0 };
p = (await prepare(c.id, officer)).p; const after = readinessOf(p, fid);
ok("P15 a fact changed after Ready to file takes the filing back (not ready_to_file) and asks again", ch.status === 200 && (filingOf(p, P)?.status ?? "").toLowerCase() !== "ready_to_file" && after?.ready === false, { change: ch.status, fact: q?.fact, status: filingOf(p, P)?.status, ready: after?.ready, blocks: after?.blocks?.map((b: any) => b.code), warns: after?.warns?.map((w: any) => w.code) });
const rv = (after as any)?.reviewed;
ok("P16 after the change the representative's review no longer counts (facts changed)", !rv || rv === false || rv?.current === false || (after?.warns ?? []).some((w: any) => w.code === "representative_review"), { reviewed: rv, warns: after?.warns?.map((w: any) => w.code) });
console.log(out.join("\n")); console.log(`${out.length - fails}/${out.length} passed`); process.exit(fails ? 1 : 0);
