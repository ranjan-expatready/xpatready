// C6.16 Adult privacy and "Send to …" (screens lane, B138; concept §6 C6.16-1..12, BR-1..BR-10; challenge B1, M1-M6,
// m1-m7; founder P-412). Runs on a FRESH case per run (openCase: Client A, an adult spouse, a child of 19, a child of 10,
// and one more child whose date of birth is not answered, for BR-1's "no date of birth" line); the checkpoint's Sample
// family case is never touched. Every step fails, never skips. The demo inbox (stand-in SI-20) stands in for email.
// Consent wording: Unconfirmed: no counsel. No model call (US$0).
//   zsh studio/tools/isolated.sh accept 4445 start --ttl 60
//   tsx studio/tests/runtime/setup_visitor_visa.ts 4445 xr_studio_accept && tsx studio/acceptance/lib/setup_vv_m3.ts 4445 xr_studio_accept
//   tsx studio/acceptance/C6.16.test.ts 4445 xr_studio_accept
// Run it on a fresh copy, or wait a minute between runs: a run makes about 20 code tries and the limit is 30 a minute
// per network address, so a second run within the minute is refused with 429 (by design, BR-4).
import { request } from "node:http";
import { AUTHOR, CLIENT, OFFICER, PORT, agent, answer, call, main, needVisitorVisa, ok, openCase, run, sendFile, sql, yearsAgo, type Person } from "./lib/m3.ts";

type R = { status: number; body: any; headers: Record<string, string | string[] | undefined> }; // eslint-disable-line @typescript-eslint/no-explicit-any -- responses read loosely, as in the other packs
/** A call to /api/link/* (or anywhere) with a Bearer session and no x-actor, unless one is given (to prove it is refused). */
const lcall = (method: string, path: string, body?: unknown, bearer?: string | null, actor?: string): Promise<R> => new Promise((resolve) => {
  const data = body === undefined ? undefined : Buffer.from(JSON.stringify(body));
  const headers: Record<string, string | number> = { "content-type": "application/json", ...(data ? { "content-length": data.length } : {}) };
  if (bearer) headers.authorization = `Bearer ${bearer}`;
  if (actor) headers["x-actor"] = actor;
  const req = request({ host: "127.0.0.1", port: PORT, path: `/api${path}`, method, headers, agent: false }, (res) => {
    const chunks: Buffer[] = []; res.on("data", (c: Buffer) => chunks.push(c));
    res.on("end", () => { const t = Buffer.concat(chunks).toString("utf8"); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ } resolve({ status: res.statusCode ?? 0, body: j, headers: res.headers }); });
  });
  req.on("error", (e) => resolve({ status: 0, body: { detail: e.message }, headers: {} })); if (data) req.write(data); req.end();
});
type Msg = { kind: string; body: string; link: string | null };
const inbox = async (address: string): Promise<Msg[]> => (await lcall("GET", `/demo/inbox?address=${encodeURIComponent(address)}`)).body?.messages ?? [];
const tokenIn = (m: Msg[]) => /#t=([A-Za-z0-9_-]{43})/.exec(m.find((x) => x.kind === "link")?.link ?? "")?.[1] ?? "";
const codeIn = (m: Msg[]) => (/code is (\d{3}) (\d{3})/.exec(m.find((x) => x.kind === "code")?.body ?? "") ?? []).slice(1).join("");
type Q = { subjectId: string; fact: string; value_type: string; collected_from: string; section: string; group: string | null; options: { key: string }[] | null; answer: { id: string; value: unknown; confirmed: boolean; channel: string; by: string; why: string; mark?: string } | null; hidden: boolean };
const qs = (v: { sections?: { questions: Q[] }[] } | undefined) => (v?.sections ?? []).flatMap((s) => s.questions);
/** A multipart upload as Client A, with form fields beside the file (C6.5's document with no checklist line). */
const upload = async (path: string, fields: Record<string, string>): Promise<{ status: number; body: any }> => { // eslint-disable-line @typescript-eslint/no-explicit-any -- read loosely
  const fd = new FormData(); for (const [k, v] of Object.entries(fields)) fd.append(k, v); fd.append("file", new Blob([new Uint8Array(Buffer.from("%PDF-1.4\n% Sample\n%%EOF\n", "latin1"))]), "sample.pdf");
  const res = await fetch(`http://127.0.0.1:${PORT}/api${path}`, { method: "POST", headers: { "x-actor": CLIENT }, body: fd }).catch(() => null);
  return { status: res?.status ?? 0, body: await res?.json().catch(() => null) };
};
const sqr = async (caseId: string) => (await call("GET", `/runtime/cases/${caseId}/questionnaire`, undefined, CLIENT)).body;

await main("C6.16", "Adult privacy and Send to …", async () => {
  const vv = needVisitorVisa();
  const FAMILY: Person[] = [
    { role: "principal", name: "Sample Client A", dob: yearsAgo(40) },
    { role: "spouse_or_partner", name: "Sample Partner", dob: yearsAgo(38) },
    { role: "child", name: "Sample Child 19", dob: yearsAgo(19) },
    { role: "child", name: "Sample Child 10", dob: yearsAgo(10) },
    { role: "child", name: "Sample Child no date", dob: null },
  ];
  const c = await openCase(vv, FAMILY);
  const id = c.id, P = c.subjects["Sample Client A"], S = c.subjects["Sample Partner"], C19 = c.subjects["Sample Child 19"], C10 = c.subjects["Sample Child 10"], CX = c.subjects["Sample Child no date"];
  const officer = c.officer;
  ok("C6.16-0 pass: a fresh case opens with Client A, Partner, a child of 19, a child of 10 and a child with no date of birth", !!id && !!P && !!S && !!C19 && !!C10 && !!CX, c.body?.detail);
  const pA = `partner.${run}@example.com`, pB = `partner.new.${run}@example.com`, own = `client.a.${run}@example.com`, c19 = `child19.${run}@example.com`;
  const SECRET = `PARTNER-PRIVATE-${run}`;
  const privacy = async (actor = CLIENT) => (await call("GET", `/runtime/cases/${id}/people/privacy`, undefined, actor));
  const line = async (subject: string, actor = CLIENT) => (await privacy(actor)).body?.people?.find((p: { subject_id: string }) => p.subject_id === subject);

  // ---- 1: Client A answers one Partner question, then sends to Partner; the inbox holds link and code, the API neither.
  const before = qs(await sqr(id));
  const pq = before.find((q) => q.subjectId === S && !q.answer && !q.group && !q.hidden && q.value_type === "text") ?? before.find((q) => q.subjectId === S && !q.answer && !q.group && !q.hidden && !!q.options?.length);
  const pqValue = pq?.options?.length ? pq.options[0].key : "SAMPLE-BY-CLIENT-A";
  const r1a = pq ? await call("PUT", `/runtime/cases/${id}/answers/${S}/${pq.fact}`, { value: pqValue, expectedId: null }, CLIENT) : { status: 0, body: null };
  const r1 = await call("POST", `/runtime/cases/${id}/people/${S}/link`, { address: pA }, CLIENT);
  const m1 = await inbox(pA), t1 = tokenIn(m1);
  ok("C6.16-1 pass: Client A answers a Partner question, then sends to Partner; the demo inbox holds the link", r1a.status === 200 && [200, 201].includes(r1.status) && r1.body?.link?.state === "sent" && r1.body?.link?.email_masked === `p•••@example.com` && !!t1, { answer: r1a.status, send: r1.status, link: r1.body?.link, messages: m1.length });
  ok("C6.16-1 pass: the send answers neither the token nor a code; the link's token is in its fragment", !!t1 && !JSON.stringify(r1.body).includes(t1) && !/\b\d{6}\b/.test(JSON.stringify(r1.body?.link ?? {})) && /\/link#t=/.test(m1[0]?.link ?? ""));
  const o1 = await lcall("POST", "/link/open", { token: t1 });
  ok("C6.16-1 pass: opening the link sends nothing (no code message) and shows the masked address; no referrer", o1.status === 200 && o1.body?.state === "live" && o1.body?.email_masked === "p•••@example.com" && !(await inbox(pA)).some((m) => m.kind === "code") && o1.headers["referrer-policy"] === "no-referrer", o1.body);
  const s1 = await lcall("POST", "/link/code/send", { token: t1 });
  const code1 = codeIn(await inbox(pA));
  ok("C6.16-1 pass: Send me a code puts a 6-digit code in the inbox; the API answers it masked, never the code", s1.status === 200 && /^\d{6}$/.test(code1) && !JSON.stringify(s1.body).includes(code1), s1.body);

  // ---- 2: five wrong codes void the link, in words.
  const wrong = code1 === "000000" ? "111111" : "000000";
  const w: R[] = [];
  for (let i = 0; i < 5; i++) w.push(await lcall("POST", "/link/code", { token: t1, code: wrong }));
  ok("C6.16-2 fail: a wrong code says how many tries are left", w[0].status === 400 && w[0].body?.errors?.[0]?.field === "code" && /4 tries left/.test(w[0].body?.detail ?? "") && /1 try left/.test(w[3].body?.detail ?? ""), w.slice(0, 4).map((x) => x.body?.detail));
  ok("C6.16-2 fail: the fifth wrong code voids the link: \"Too many wrong codes …\", and the right code no longer works", w[4].status === 410 && /Too many wrong codes/.test(w[4].body?.detail ?? "") && (await lcall("POST", "/link/code", { token: t1, code: code1 })).status === 410 && sql(`select void_why from person_link where case_id='${id}' and subject_id='${S}' order by sent_at limit 1`) === "locked", w[4].body);
  const o2 = await lcall("POST", "/link/open", { token: t1 });
  ok("C6.16-2 fail: the locked link explains itself without naming anyone; its messages are gone", o2.body?.state === "dead" && /Too many wrong codes/.test(o2.body?.why ?? "") && !/Client|Partner/.test(o2.body?.why ?? "") && (await inbox(pA)).length === 0, o2.body);

  // ---- 3: Client A sends again (not accepted yet: any address); the right code switches privacy on; the session reaches only Partner.
  await call("POST", `/runtime/cases/${id}/people/${S}/link`, { address: pA }, CLIENT);
  const t2 = tokenIn(await inbox(pA));
  await lcall("POST", "/link/code/send", { token: t2 });
  const code2 = codeIn(await inbox(pA));
  ok("C6.16-3 pass (data): before the right code, Partner's answers are not private (a mistyped address never locks Client A out)", sql(`select keep_private from case_participant where subject_id='${S}'`) === "f");
  const [v1, v2] = await Promise.all([lcall("POST", "/link/code", { token: t2, code: `${code2.slice(0, 3)} ${code2.slice(3)}` }), lcall("POST", "/link/code", { token: t2, code: `${code2.slice(0, 3)}-${code2.slice(3)}` })]);
  const wins = [v1, v2].filter((x) => x.status === 200), lost = [v1, v2].filter((x) => x.status !== 200);
  ok("C6.16-3 fail (race): the same right code sent twice at the same moment gives one session; the other is refused in words", wins.length === 1 && lost.length === 1 && lost[0].status === 409 && /just used/.test(lost[0].body?.detail ?? "") && sql(`select count(*) from person_link_session s join person_link l on l.id=s.link_id where l.subject_id='${S}'`) === "1", [v1.status, v2.status, lost[0]?.body?.detail]);
  const sess = wins[0]?.body?.session as string;
  ok("C6.16-3 pass: the right code (typed with a space or a dash) gives a session for this case and this person; privacy is now stored on", !!sess && wins[0].body?.case_id === id && wins[0].body?.subject_id === S && wins[0].body?.consent_needed === true && sql(`select keep_private::text || '|' || private_by from case_participant where subject_id='${S}'`) === `true|person:${S}`, wins[0]?.body);
  ok("C6.16-3 fail (break M4): after the first right code the demo inbox holds no link or code for Partner (nothing to mint a new code from)", (await inbox(pA)).length === 0, (await inbox(pA)).map((m) => m.kind));
  const asClient = await lcall("GET", `/demo/inbox?address=${encodeURIComponent(pA)}`, undefined, null, CLIENT);
  ok("C6.16-3 fail (break M4): Client A's own persona cannot open anyone's demo inbox (403)", asClient.status === 403 && /mailbox/.test(asClient.body?.detail ?? ""), [asClient.status, asClient.body?.detail]);
  const pre = await lcall("GET", `/link/cases/${id}/people/${S}/questionnaire`, undefined, sess);
  const me = await lcall("GET", "/link/me", undefined, sess);
  ok("C6.16-3 fail: no questions before the consent card; the card's words are marked Unconfirmed: no counsel", pre.status === 403 && /Read who sees your answers first/.test(pre.body?.detail ?? "") && /will see how far you have got, not your answers/.test(me.body?.consent ?? "") && me.body?.consent_note === "Unconfirmed: no counsel", { pre: pre.status, me: me.body });
  await lcall("POST", "/link/consent", {}, sess);
  const lv = await lcall("GET", `/link/cases/${id}/people/${S}/questionnaire`, undefined, sess);
  const lsubs = new Set((lv.body?.sections ?? []).map((x: { subjectId: string }) => x.subjectId));
  // B128: the parts about Partner's own parents (`<Partner>/parent_1`) are Partner's to answer too.
  ok("C6.16-3 pass: the session reads only Partner's parts (with their parents') and the application's", lv.status === 200 && lsubs.has(S) && [...lsubs].every((x) => x === S || x.startsWith(`${S}/`) || x === c.caseSubject) && ![...lsubs].some((x) => x.startsWith(P) || x.startsWith(C19)), [...lsubs]);
  const parentQ = qs(lv.body).find((q) => q.subjectId.startsWith(`${S}/`) && !q.answer && !q.group && !q.hidden && q.value_type === "text");
  const parentPut = parentQ ? await lcall("PUT", `/link/cases/${id}/people/${parentQ.subjectId}/answers/${parentQ.fact}`, { value: `${SECRET}-parent`, expectedId: null }, sess) : { status: 0, body: null };
  ok("C6.16-3 pass: Partner answers a question about their own parent on the link", !!parentQ && parentPut.status === 200, [parentQ?.subjectId, parentPut.status, parentPut.body?.detail]);
  const lq = qs(lv.body).find((q) => q.subjectId === S && q.fact !== pq?.fact && !q.answer && !q.group && !q.hidden && q.value_type === "text");
  const lput = lq ? await lcall("PUT", `/link/cases/${id}/people/${S}/answers/${lq.fact}`, { value: SECRET, expectedId: null }, sess) : { status: 0, body: null };
  const caseQ = qs(lv.body).find((q) => q.subjectId === c.caseSubject && !q.group);
  const shared = caseQ ? await lcall("PUT", `/link/cases/${id}/people/${c.caseSubject}/answers/${caseQ.fact}`, { value: "X", expectedId: caseQ.answer?.id ?? null }, sess) : { status: 0, body: null };
  ok("C6.16-3 pass: Partner saves their own answer on the link (their own channel)", lput.status === 200 && sql(`select source_json->>'channel' || '|' || (source_json->>'actor') from client_canonical_answer where subject_id='${S}' and canonical_field_key='${lq?.fact}' and superseded_by_id is null`) === `own_link|person:${S}`, lput.body?.detail ?? lput.status);
  ok("C6.16-3 fail: the application's shared answers are read-only on the link (403)", !!caseQ && shared.status === 403 && /own questions only/.test(shared.body?.detail ?? ""), shared.body?.detail);

  // ---- 4: Client A sees progress only; every write on Partner is refused; no body carries Partner's value.
  const v4 = await sqr(id);
  const pp = (v4?.private_people ?? []).find((x: { subject_id: string }) => x.subject_id === S);
  ok("C6.16-4 pass: Client A's questionnaire shows Partner's progress only (parts done of parts asked, counted on the server)", !(v4?.sections ?? []).some((x: { subjectId: string }) => x.subjectId === S) && !!pp && pp.progress.asked > 0 && pp.progress.done >= 0 && !!pp.progress.saved_at, pp);
  const lineP = await line(S);
  ok("C6.16-4 pass (review m1): the progress Client A's questionnaire shows and the privacy list's are the same count", !!lineP?.progress && !!pp && lineP.progress.done === pp.progress.done && lineP.progress.asked === pp.progress.asked, [lineP?.progress, pp?.progress]);
  ok("C6.16-4 fail: nothing Client A reads carries Partner's private answer (questionnaire, Prospect questionnaire, privacy list)", !JSON.stringify(v4).includes(SECRET) && !JSON.stringify((await call("GET", `/runtime/cases/${id}/questionnaire?mode=pqr`, undefined, CLIENT)).body).includes(SECRET) && !JSON.stringify((await privacy()).body).includes(SECRET) && !(v4?.checks ?? []).some((x: { subjectId: string }) => x.subjectId === S));
  const ag = await agent(id);
  const curId = qs(ag).find((q) => q.subjectId === S && q.fact === lq?.fact)?.answer?.id ?? null;
  const put4 = await call("PUT", `/runtime/cases/${id}/answers/${S}/${lq?.fact}`, { value: "Changed by Client A", expectedId: null }, CLIENT);
  ok("C6.16-4 fail: Client A's PUT on a Partner answer is 403, and the refusal (once a 409 with the current value) never carries it", put4.status === 403 && !JSON.stringify(put4.body).includes(SECRET) && /private to them and the firm/.test(put4.body?.detail ?? "") && !!curId, put4.body);
  const groupQ = qs(ag).find((q) => q.subjectId === S && !!q.group);
  const na = groupQ ? await call("PUT", `/runtime/cases/${id}/groups/${S}/${groupQ.group}/none-apply`, { noneApply: true, expectedId: null }, CLIENT) : { status: 0, body: null };
  const addR = groupQ ? await call("POST", `/runtime/cases/${id}/groups/${S}/rows`, { group: groupQ.group }, CLIENT) : { status: 0, body: null };
  const staffRow = groupQ ? await call("POST", `/runtime/cases/${id}/groups/${S}/rows`, { group: groupQ.group }, officer) : { status: 0, body: null };
  const delR = staffRow.body?.row ? await call("DELETE", `/runtime/cases/${id}/groups/${S}/rows/${staffRow.body.row}`, undefined, CLIENT) : { status: 0, body: null };
  ok("C6.16-4 fail: Client A's none-apply, add row and remove row on Partner are each 403", !!groupQ && na.status === 403 && addR.status === 403 && delR.status === 403, [groupQ?.group, na.status, addR.status, staffRow.status, delR.status]);
  const lines = (await call("GET", `/runtime/cases/${id}/checklist`, undefined, officer)).body?.people?.find((p: { subject: string }) => p.subject === S)?.lines ?? [];
  const lineId: string | undefined = lines[0]?.id;
  const up = lineId ? await sendFile(`/runtime/checklist-lines/${lineId}/documents`, Buffer.from("%PDF-1.4\n% Sample\n%%EOF\n", "latin1"), "sample.pdf", CLIENT) : { status: 0, body: null };
  const caseDoc = await upload(`/runtime/cases/${id}/documents`, { subjectId: S, documentType: "letter_of_invitation" });
  ok("C6.16-4 fail: Client A's upload of a document with no checklist line for Partner is 403", caseDoc.status === 403 && /private to them and the firm/.test(caseDoc.body?.detail ?? ""), [caseDoc.status, caseDoc.body?.detail]);
  const parentPutA = parentQ ? await call("PUT", `/runtime/cases/${id}/answers/${parentQ.subjectId}/${parentQ.fact}`, { value: "Changed by Client A", expectedId: null }, CLIENT) : { status: 0, body: null };
  ok("C6.16-4 fail: Client A's PUT about Partner's parent is 403, and Client A's questionnaire has no part about Partner's parents", parentPutA.status === 403 && !JSON.stringify(parentPutA.body).includes(SECRET) && !(v4?.sections ?? []).some((x: { subjectId: string }) => x.subjectId.startsWith(`${S}/`)), [parentPutA.status]);
  const reconf = curId ? await call("POST", `/runtime/cases/${id}/answers/${curId}/reconfirm`, {}, CLIENT) : { status: 0, body: null };
  ok("C6.16-4 fail: Client A's re-confirm of a Partner answer is 403 before anything is read (never a 409 with its value)", reconf.status === 403 && !JSON.stringify(reconf.body).includes(SECRET), [reconf.status, reconf.body?.detail]);
  ok("C6.16-4 fail: Client A's upload to Partner's document line is 403 (nothing stored)", !!lineId && up.status === 403 && sql(`select count(*) from case_document where subject_id='${S}'`) === "0", [lineId, up.status, up.body?.detail]);

  // ---- 5: staff always see and edit.
  const offQ = qs(ag).find((q) => q.subjectId === S && q.fact === lq?.fact);
  const put5 = await call("PUT", `/runtime/cases/${id}/answers/${S}/${lq?.fact}`, { value: `${SECRET}-officer`, expectedId: offQ?.answer?.id ?? null }, officer);
  ok("C6.16-5 pass: the case officer reads Partner's private answer and edits it", offQ?.answer?.value === SECRET && put5.status === 200, [offQ?.answer?.value, put5.status]);
  ok("C6.16-5 pass: the officer's people list says what the code proves and who gave the address", /With Sample Partner since .* · private from Client A · answered on the link sent to p•••@example\.com \(address given by Client A\)/.test((await line(S, officer))?.words ?? ""), (await line(S, officer))?.words);

  // ---- 6: Partner confirms Client A's earlier answer: the same value saved again on the link becomes their own.
  const lv6 = (await lcall("GET", `/link/cases/${id}/people/${S}/questionnaire`, undefined, sess)).body;
  const byA = qs(lv6).find((q) => q.subjectId === S && q.fact === pq?.fact)?.answer;
  ok("C6.16-6 pass: on the link, Client A's earlier answer shows \"answered by\" Client A and is not yet confirmed", !!byA && byA.by === CLIENT && byA.channel === "questionnaire" && !byA.confirmed && byA.mark === "by_principal" && /^Answered by the principal for Sample Partner/.test(byA.why), byA);
  const conf = await lcall("PUT", `/link/cases/${id}/people/${S}/answers/${pq?.fact}`, { value: byA?.value, expectedId: byA?.id ?? null }, sess);
  const after6 = qs((await lcall("GET", `/link/cases/${id}/people/${S}/questionnaire`, undefined, sess)).body).find((q) => q.subjectId === S && q.fact === pq?.fact)?.answer;
  ok("C6.16-6 pass: Confirm saves the same value on the link: a new answer of Partner's own, confirmed", conf.status === 200 && after6?.channel === "own_link" && after6?.confirmed === true && JSON.stringify(after6?.value) === JSON.stringify(byA?.value) && after6?.id !== byA?.id, after6);
  const stale = await lcall("PUT", `/link/cases/${id}/people/${S}/answers/${pq?.fact}`, { value: byA?.value, expectedId: byA?.id ?? null }, sess);
  ok("C6.16-6 fail: a Confirm from an older view is refused (409), never saved twice", stale.status === 409, stale.status);

  // ---- 7: take back: link and session dead, said why; Client A still progress only and no edits.
  // A question Client A could answer for an adult whose setting is off (a client field), so only the privacy rule refuses it.
  const emptyQ = qs(await agent(id)).find((q) => q.subjectId === S && !q.answer && !q.group && !q.hidden && q.collected_from === "client_questionnaire" && q.value_type === "text");
  const tb = await call("DELETE", `/runtime/cases/${id}/people/${S}/link`, {}, CLIENT);
  const dead = await lcall("GET", "/link/me", undefined, sess);
  const o7 = await lcall("POST", "/link/open", { token: t2 });
  ok("C6.16-7 pass: Client A takes the link back: the session ends at once and says why, naming no one", tb.status === 200 && tb.body?.link?.state === "taken_back" && dead.status === 401 && /taken back on/.test(dead.body?.detail ?? "") && o7.body?.state === "dead" && /This link was taken back on .*Ask whoever sent it for a new one\./.test(o7.body?.why ?? "") && !/Client|Partner/.test(o7.body?.why ?? ""), [tb.status, dead.body?.detail, o7.body]);
  const v7 = await sqr(id);
  const put7 = emptyQ ? await call("PUT", `/runtime/cases/${id}/answers/${S}/${emptyQ.fact}`, { value: "SAMPLE", expectedId: null }, CLIENT) : { status: 0, body: null };
  ok("C6.16-7 fail: after take back privacy stays on: Client A sees progress only, and a PUT on an empty Partner question is 403", sql(`select keep_private from case_participant where subject_id='${S}'`) === "t" && !(v7?.sections ?? []).some((x: { subjectId: string }) => x.subjectId === S) && !!emptyQ && put7.status === 403, [emptyQ?.fact, put7.status]);
  const tb2 = await call("DELETE", `/runtime/cases/${id}/people/${S}/link`, { reason: "Sample" }, officer);
  ok("C6.16-7 fail: nothing left to take back is refused in words (409)", tb2.status === 409 && /no working link/.test(tb2.body?.detail ?? ""), tb2.body?.detail);

  // ---- 8: resend to the kept address supersedes; a new address by Client A is refused; staff may.
  const r8a = await call("POST", `/runtime/cases/${id}/people/${S}/link`, { address: pA.toUpperCase() }, CLIENT);
  const t3 = tokenIn(await inbox(pA));
  const r8b = await call("POST", `/runtime/cases/${id}/people/${S}/link`, {}, CLIENT); // Resend: no address, the kept one
  const t4 = tokenIn(await inbox(pA));
  const o8 = await lcall("POST", "/link/open", { token: t3 });
  ok("C6.16-8 pass: Client A resends to the kept address; a second resend replaces the first, which says so", [200, 201].includes(r8a.status) && [200, 201].includes(r8b.status) && t3 !== t4 && o8.body?.state === "dead" && /replaced by a newer one sent on .*Use the newest email\./.test(o8.body?.why ?? "") && (await lcall("POST", "/link/open", { token: t4 })).body?.state === "live", [r8a.status, r8b.status, o8.body]);
  const r8c = await call("POST", `/runtime/cases/${id}/people/${S}/link`, { address: own }, CLIENT);
  ok("C6.16-8 fail (B1): Client A may not send Partner's link to a new address (403, in words); the live link is untouched", r8c.status === 403 && r8c.body?.detail === "Sample Partner already uses p•••@example.com. Ask the firm to send to a new address." && (await lcall("POST", "/link/open", { token: t4 })).body?.state === "live", r8c.body?.detail);
  const r8d = await call("POST", `/runtime/cases/${id}/people/${S}/link`, { address: pB }, officer);
  ok("C6.16-8 pass: case staff send Partner's link to a new address", [200, 201].includes(r8d.status) && r8d.body?.link?.email_masked === "p•••@example.com" && !!tokenIn(await inbox(pB)) && (await lcall("POST", "/link/open", { token: t4 })).body?.state === "dead", r8d.body?.link);
  const r8e = await call("POST", `/runtime/cases/${id}/people/${S}/link`, {}, CLIENT);
  ok("C6.16-8 pass (break m3): after staff sent to a new address, Client A's Resend (no address) goes to the kept address", [200, 201].includes(r8e.status) && sql(`select address from person_link where subject_id='${S}' and voided_at is null`) === pA, [r8e.status, r8e.body?.detail]);
  await call("POST", `/runtime/cases/${id}/people/${S}/link`, { address: pB }, officer); // back to the staff's new address for step 10
  const nul = await call("POST", `/runtime/cases/${id}/people/${S}/link`, { address: "p\u0000@example.com" }, officer);
  ok("C6.16-8 fail (review m3): a control character in the address is refused on the field (400), never a 404", nul.status === 400 && nul.body?.errors?.[0]?.field === "address", [nul.status, nul.body?.detail]);
  const key = `c616-${run}-key`;
  const [k1, k2] = await Promise.all([call("POST", `/runtime/cases/${id}/people/${C19}/link`, { address: c19, idempotencyKey: key }, officer), call("POST", `/runtime/cases/${id}/people/${C19}/link`, { address: c19, idempotencyKey: key }, officer)]);
  ok("C6.16-8 fail (race): the same Send pressed twice at once sends one link", [k1, k2].every((x) => [200, 201].includes(x.status)) && sql(`select count(*) from person_link where subject_id='${C19}'`) === "1", [k1.status, k2.status, k1.body?.detail, k2.body?.detail]);
  const dup = await call("POST", `/runtime/cases/${id}/people/${S}/link`, { address: c19 }, officer);
  ok("C6.16-8 fail: an address another person on the case uses is refused (409)", dup.status === 409 && /someone else on this case/.test(dup.body?.detail ?? ""), dup.body?.detail);
  const many = await Promise.all([1, 2, 3].map(() => call("POST", `/runtime/cases/${id}/people/${S}/link`, { address: pB }, officer)));
  ok("C6.16-8 fail (race): three resends at the same moment leave exactly one working link, each answered in words (never a 500)", many.every((x) => [200, 201, 409].includes(x.status)) && sql(`select count(*) from person_link where subject_id='${S}' and voided_at is null`) === "1", many.map((x) => x.status));
  const second = sql(`insert into person_link (id, workspace_id, case_id, subject_id, address, address_masked, address_given_by, token_hash, sent_by, expires_at) select gen_random_uuid(), workspace_id, case_id, subject_id, 'x.${run}@example.com', 'x•••@example.com', 'user-O', md5(random()::text) || md5(random()::text), 'user-O', now() + interval '1 day' from person_link where subject_id='${S}' and voided_at is null returning 1`);
  ok("C6.16-8 fail (data): the database refuses a second working link for one person (the race guard under the row lock)", second === null && sql(`select count(*) from person_link where subject_id='${S}' and voided_at is null`) === "1", second);

  // ---- 9: adults only; who may tick.
  const m9 = await call("POST", `/runtime/cases/${id}/people/${C10}/link`, { address: `child10.${run}@example.com` }, CLIENT);
  const n9 = await call("POST", `/runtime/cases/${id}/people/${CX}/link`, { address: `childx.${run}@example.com` }, CLIENT);
  ok("C6.16-9 fail: Send to a child of 10 is 409 (under 18, Sample) and to a person with no date of birth 409, each saying why", m9.status === 409 && /under 18/.test(m9.body?.detail ?? "") && n9.status === 409 && /date of birth is not answered yet/.test(n9.body?.detail ?? ""), [m9.body?.detail, n9.body?.detail]);
  const l10 = await line(C10), lx = await line(CX);
  ok("C6.16-9 pass: the privacy list offers no Send for the minor or the person without a date of birth, and says why", l10?.adult === false && l10?.can?.send === false && /under 18/.test(l10?.why_not ?? "") && lx?.can?.send === false && /not answered yet/.test(lx?.why_not ?? ""), [l10?.why_not, lx?.why_not]);
  const tickA = await call("PUT", `/runtime/cases/${id}/people/${C19}/private`, { reason: "Asked by the child (Sample)" }, CLIENT);
  const tickNo = await call("PUT", `/runtime/cases/${id}/people/${C19}/private`, {}, officer);
  const tickMin = await call("PUT", `/runtime/cases/${id}/people/${C10}/private`, { reason: "Asked (Sample)" }, officer);
  const tickOk = await call("PUT", `/runtime/cases/${id}/people/${C19}/private`, { reason: "Asked by the child (Sample)" }, officer);
  ok("C6.16-9 fail: the tick is staff's (Client A 403), needs a reason (400), and there is none for a minor (409)", tickA.status === 403 && tickNo.status === 400 && tickMin.status === 409, [tickA.status, tickNo.status, tickMin.status]);
  ok("C6.16-9 pass: staff tick \"Keep private from the principal\" for the child of 19, with a reason; Client A then sees progress only", tickOk.status === 200 && tickOk.body?.private?.on === true && !((await sqr(id))?.sections ?? []).some((x: { subjectId: string }) => x.subjectId === C19), tickOk.body?.private);
  const c19A = await line(C19), c19O = await line(C19, officer);
  ok("C6.16-9 fail (break M1): Client A reads that the child of 19 is private, never the staff's reason or who ticked it; staff read both", c19A?.private?.on === true && c19A?.private?.why === null && c19A?.private?.by === null && !JSON.stringify((await privacy()).body).includes("Asked by the child") && c19O?.private?.why === "Asked by the child (Sample)", [c19A?.private, c19O?.private?.why]);
  ok("C6.16-9 fail (data): the stored setting never switches off (the database refuses it)", sql(`update case_participant set keep_private=false where subject_id='${S}' returning 1`) === null && sql(`select keep_private from case_participant where subject_id='${S}'`) === "t");
  const cfg = await privacy(AUTHOR), other = await privacy("user-S");
  ok("C6.16-9 fail: a configuration person (403) and another firm (404) reach no one's privacy", cfg.status === 403 && other.status === 404, [cfg.status, other.status]);

  // ---- 10: a link session is its own sign-in, scoped to its case and person.
  const t5 = tokenIn(await inbox(pB));
  await lcall("POST", "/link/code/send", { token: t5 });
  const sess2 = (await lcall("POST", "/link/code", { token: t5, code: codeIn(await inbox(pB)) })).body?.session as string;
  await lcall("POST", "/link/consent", {}, sess2);
  const x1 = await lcall("GET", `/link/cases/${id}/people/${S}/questionnaire`, undefined, sess2, CLIENT);
  const c2 = await openCase(vv, [FAMILY[0]]);
  const x2 = await lcall("GET", `/link/cases/${c2.id}/people/${S}/questionnaire`, undefined, sess2);
  const x3 = await lcall("GET", `/link/cases/${id}/people/${P}/questionnaire`, undefined, sess2);
  const x4 = await lcall("PUT", `/link/cases/${id}/people/${C19}/answers/${lq?.fact}`, { value: "X", expectedId: null }, sess2);
  const x5 = await lcall("GET", `/runtime/cases/${id}/questionnaire?mode=agent`, undefined, sess2);
  const x6 = await lcall("GET", `/runtime/cases/${id}/questionnaire`, undefined, sess2);
  ok("C6.16-10 pass: the new session (staff's new address) reads Partner's parts", !!sess2 && (await lcall("GET", `/link/cases/${id}/people/${S}/questionnaire`, undefined, sess2)).status === 200);
  ok("C6.16-10 fail: a session with x-actor is 400; another case 404; another person 403 (read and write); staff and client routes 403", x1.status === 400 && x2.status === 404 && x3.status === 403 && x4.status === 403 && x5.status === 403 && x6.status === 403, [x1.status, x2.status, x3.status, x4.status, x5.status, x6.status]);
  ok("C6.16-10 fail: no session, or a made-up one, is 401 in words", (await lcall("GET", "/link/me")).status === 401 && /has ended/.test((await lcall("GET", "/link/me", undefined, "A".repeat(43))).body?.detail ?? ""));

  // ---- 11: expired code and expired link explained; an unknown link names nothing; limits.
  const t19 = tokenIn(await inbox(c19));
  await lcall("POST", "/link/code/send", { token: t19 });
  const code19 = codeIn(await inbox(c19));
  sql(`update person_link set code_expires_at = now() - interval '1 minute' where subject_id='${C19}' and voided_at is null`);
  const e11 = await lcall("POST", "/link/code", { token: t19, code: code19 });
  ok("C6.16-11 fail: an expired code is explained (15 minutes) and is not counted as a wrong try", e11.status === 400 && /has expired: a code works for 15 minutes/.test(e11.body?.detail ?? "") && sql(`select wrong_tries from person_link where subject_id='${C19}' and voided_at is null`) === "0", e11.body?.detail);
  const unk = await lcall("POST", "/link/open", { token: "B".repeat(43) });
  ok("C6.16-11 fail: an unknown link names no case and no person", unk.status === 404 && unk.body?.detail === "This link does not work. Ask whoever sent it for a new one." && !JSON.stringify(unk.body).includes(id), unk.body);
  sql(`update person_link set expires_at = now() - interval '1 day' where subject_id='${C19}' and voided_at is null`);
  const ex = await lcall("POST", "/link/open", { token: t19 });
  ok("C6.16-11 fail: an expired link says so", ex.body?.state === "dead" && /This link expired on/.test(ex.body?.why ?? "") && (await lcall("POST", "/link/code/send", { token: t19 })).status === 410, ex.body);
  const lim: number[] = [];
  const t6 = (await call("POST", `/runtime/cases/${id}/people/${C19}/link`, { address: c19 }, officer)).status ? tokenIn(await inbox(c19)) : "";
  for (let i = 0; i < 8; i++) lim.push((await lcall("POST", "/link/code/send", { token: t6 })).status);
  ok("C6.16-11 fail: codes sent to one address are limited (429 in words after the limit)", lim.includes(200) && lim.at(-1) === 429, lim);
  const burst = await Promise.all([1, 2, 3, 4, 5].map((i) => lcall("POST", "/link/code", { token: t6, code: String(100000 + i) })));
  ok("C6.16-11 fail (race): five wrong codes at the same moment are all counted and lock the link", burst.some((x) => x.status === 410) && sql(`select wrong_tries::text || '|' || coalesce(void_why, '') from person_link where token_hash = encode(sha256('${t6}'::bytea), 'hex')`) === "5|locked", burst.map((x) => x.status));

  // ---- 13: after Make principal (C6.13) the client stays "the principal" for privacy; a person who is no longer an adult
  // cannot accept; two people never share an address. A second fresh case: Client A, Partner, a child of 22.
  const c3 = await openCase(vv, [FAMILY[0], FAMILY[1], { role: "child", name: "Sample Child 22", dob: yearsAgo(22) }]);
  const A3 = c3.subjects["Sample Client A"], S3 = c3.subjects["Sample Partner"], K3 = c3.subjects["Sample Child 22"];
  const same = `same.${run}@example.com`;
  const [sa, sb] = await Promise.all([call("POST", `/runtime/cases/${c3.id}/people/${S3}/link`, { address: same }, officer), call("POST", `/runtime/cases/${c3.id}/people/${K3}/link`, { address: same }, officer)]);
  ok("C6.16-13 fail (race, break m1): one address sent to two people at the same moment: one is sent, the other refused in words", [sa, sb].filter((x) => [200, 201].includes(x.status)).length === 1 && [sa, sb].some((x) => x.status === 409 && /someone else on this case/.test(x.body?.detail ?? "")), [sa.status, sb.status]);
  const k22 = `child22.${run}@example.com`;
  await call("POST", `/runtime/cases/${c3.id}/people/${K3}/link`, { address: k22 }, CLIENT);
  const tk = tokenIn(await inbox(k22));
  await answer(c3.id, K3, "person.date_of_birth", yearsAgo(12)); // the officer corrects the date of birth: now 12
  const ck = await lcall("POST", "/link/code/send", { token: tk });
  const ok22 = await lcall("POST", "/link/open", { token: tk });
  ok("C6.16-13 fail (break M2): a link sent to someone who is now under 18 sends no code and dies, saying why without naming anyone; privacy stays off", ck.status === 410 && /cannot have their own link/.test(ck.body?.detail ?? "") && ok22.body?.state === "dead" && sql(`select void_why from person_link where subject_id='${K3}' order by sent_at desc limit 1`) === "not_adult" && sql(`select keep_private from case_participant where subject_id='${K3}'`) === "f", [ck.status, ck.body?.detail, ok22.body]);
  const pv = await call("POST", `/runtime/cases/${c3.id}/filing-changes`, { kind: "make_principal", subject: S3, preview: true }, c3.officer);
  const mp = await call("POST", `/runtime/cases/${c3.id}/filing-changes`, { kind: "make_principal", subject: S3, basis: pv.body?.basis, reason: "The spouse holds the job offer (Sample)" }, c3.officer);
  ok("C6.16-13 pass (setup): Make principal on Partner (C6.13): Partner is the principal by role, Client A the spouse", mp.status === 200 && sql(`select role from case_participant where subject_id='${S3}'`) === "principal" && sql(`select role from case_participant where subject_id='${A3}'`) === "spouse_or_partner", [pv.status, mp.status, mp.body?.detail]);
  const priv3 = (await call("GET", `/runtime/cases/${c3.id}/people/privacy`, undefined, CLIENT)).body?.people ?? [];
  const lA = priv3.find((x: { subject_id: string }) => x.subject_id === A3), lS = priv3.find((x: { subject_id: string }) => x.subject_id === S3);
  const selfSend = await call("POST", `/runtime/cases/${c3.id}/people/${A3}/link`, { address: own }, CLIENT);
  const selfTick = await call("PUT", `/runtime/cases/${c3.id}/people/${A3}/private`, { reason: "Sample reason" }, c3.officer);
  ok("C6.16-13 fail (review M1, break M3): after Make principal the case's client gets no Send and no tick (409 in words), and is never private", lA?.can?.send === false && lA?.can?.tick === false && /answers on their own family link/.test(lA?.why_not ?? "") && selfSend.status === 409 && selfTick.status === 409 && sql(`select keep_private from case_participant where subject_id='${A3}'`) === "f", [lA?.can, lA?.why_not, selfSend.status, selfTick.status]);
  const toS3 = await call("POST", `/runtime/cases/${c3.id}/people/${S3}/link`, { address: `partner3.${run}@example.com` }, CLIENT);
  ok("C6.16-13 pass (review M1): the new principal by role is an adult the client answers for, so Send to them is offered and works", lS?.adult === true && lS?.can?.send === true && [200, 201].includes(toS3.status), [lS?.adult, lS?.why_not, toS3.status, toS3.body?.detail]);

  // A GET writes nothing (B145 lesson): the privacy list, the link's questionnaire and the inbox leave every table as it was.
  const counts = () => sql(`select (select count(*) from audit_event) || '|' || (select count(*) from person_link_try) || '|' || (select count(*) from demo_message) || '|' || (select count(*) from person_link_session)`);
  const c0 = counts();
  await privacy(); await privacy(officer); await inbox(pB); await lcall("GET", `/link/cases/${id}/people/${S}/questionnaire`, undefined, sess2); await lcall("GET", "/link/me", undefined, sess2); await sqr(id);
  ok("C6.16-12 fail (data): reading the privacy list, the inbox, the link's questionnaire and Client A's questionnaire writes nothing", !!c0 && counts() === c0, [c0, counts()]);

  // ---- 12: history: who and when, masked address only; never a token, a code or the address itself.
  const hist = sql(`select string_agg(action || ':' || actor || ':' || summary, E'\\n') from audit_event where entity='person link' and summary like '%${id.slice(0, 8)}%'`) ?? "";
  const actions = new Set(hist.split("\n").map((l) => l.split(":")[0]));
  ok("C6.16-12 pass: the history holds send, resend, code sent, wrong code, lockout, accepted, kept private, consent and take back, each with who", ["sent", "resent", "code sent", "wrong code", "locked", "accepted", "kept private", "consent", "took back"].every((a) => actions.has(a)), [...actions]);
  const secrets = [t1, t2, t3, t4, t5, t19, code1, code2, code19, pA, pB, c19, SECRET].filter(Boolean);
  const all = sql(`select string_agg(coalesce(summary,'') || coalesce(detail::text,''), ' ') from audit_event`) ?? "";
  ok("C6.16-12 fail: no history line carries a token, a code, a full address or a private answer", secrets.every((x) => !all.includes(x)) && /p•••@example\.com/.test(hist), secrets.filter((x) => all.includes(x)).length);
  ok("C6.16-12 pass (data): tokens and codes are stored only as sha256", sql(`select count(*) from person_link where case_id='${id}' and (char_length(token_hash) <> 64 or token_hash in ('${t1}','${t2}'))`) === "0");
});
void OFFICER;
