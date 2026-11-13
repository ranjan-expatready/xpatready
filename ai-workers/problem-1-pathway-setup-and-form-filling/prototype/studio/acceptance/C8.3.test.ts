// C8.3 Representative review (screens lane, B144; P-406, P-412, P-155 (1); concept screens/B144/concept.md r2 §6,
// items 1-16, and P-412's one-click re-approve of only the changed forms, 17-18). The case officer sends filings for
// review; the representative of record opens each, ticks its checklist, approves it (each form stamped: its facts and
// its file) or sends it back with reasons; round 2 shows only what changed; a later fact change withdraws a form's
// approval and the representative re-approves only the changed forms in one click; only the representative of record
// decides; the C7.6 route is a one-step round. On the checkpoint (the Visitor visa family, as C8.2). The forms are the
// case's own lines (expectedFor, row C1), never a form number written here. Program review items: Sample, Unconfirmed:
// expert (samples/review-items.json). Legal points: Unconfirmed: no counsel. No model call (US$0).
//   tsx studio/acceptance/C8.3.test.ts 4441 xr_studio_b144
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AUTHOR, CLIENT, OFFICER, agent, answer, call, confirmAll, expectedFor, fillEverything, firms, itemsOf, main, needVisitorVisa, ok, openCase, prepare, readinessOf, readyToFile, sql, validateRoundTrip, yearsAgo } from "./lib/m3.ts";

type Form = { item: string; form: string; person: string; channel: string; waits: boolean; state: string; state_words: string; withdrawn_words: string | null; file: { kind: string; sha256: string | null }; stamp: { file_kind: string; file_sha256: string | null } | null; live_hash: string | null; changes: { label: string; was: unknown; now: unknown; typed_by: string | null; typed_by_name: string | null }[] };
type Row = { filing: string; filing_round: number; status: string; opened: { by: string } | null; decided: { kind: string | null; confirmed_unticked: string[] | null } | null; forms: Form[]; checks: { key: string; source: string; wording: string; live: Record<string, unknown> | null }[]; unticked: number; changed: number; withdrawn: string[]; reapprovable: boolean };
type Round = { id: string; number: number; kind: string; can_decide: boolean; read_only_words: string | null; filings: Row[] };
const ITEMS = (JSON.parse(readFileSync(join(import.meta.dirname, "..", "samples", "review-items.json"), "utf8")) as { combinations: Record<string, { key: string }[]> }).combinations;
const READ_ONLY = "Only the representative of record approves or sends back. You can read this review.";

await main("C8.3", "Representative review: rounds, stamps, changed since review (Visitor visa)", async () => {
  const vv = needVisitorVisa();
  const f = await firms();
  const officer = f.officer ?? OFFICER, rep = f.rep ?? "user-R";
  const c = await openCase(vv, [{ role: "principal", name: "Sample Client A", dob: yearsAgo(40) }, { role: "spouse_or_partner", name: "Sample Spouse A", dob: yearsAgo(38) }], { representative: rep, caseOfficers: [officer] });
  const [P, S] = [c.subjects["Sample Client A"], c.subjects["Sample Spouse A"]];
  await fillEverything(c.id);
  // Row C4 (as C7.6): a barcode form the release files Online makes no copy for filing; the officer switches it to Paper
  // for each person with an accommodation reason (founder Q3, P-380; Sample) so its validated copy can be read back.
  const exp = await expectedFor(c.id);
  const lines = (name: string) => [...(exp?.[name]?.forms ?? []), ...(exp?.[name]?.waiting ?? [])];
  const BC = lines("Sample Client A").find((l) => l.barcode);
  for (const [subj, name] of [[P, "Sample Client A"], [S, "Sample Spouse A"]] as const) {
    const bc = lines(name).find((l) => l.barcode);
    if (bc?.channel === "ONLINE") { const q = (await prepare(c.id, officer)).p; await call("PATCH", `/runtime/items/${itemsOf(q, subj, bc.form)[0]?.id}/channel`, { channel: "PAPER", reason: "Cannot apply online: accommodation (Sample)", version: q?.version }, officer); }
    if (bc) await validateRoundTrip(c.id, bc.form, subj);
  }
  let p = (await prepare(c.id, officer)).p;
  const fP = p?.filings.find((x) => x.applicants[0]?.subject === P)?.id, fS = p?.filings.find((x) => x.applicants[0]?.subject === S)?.id;
  const read = async (id: string | undefined, actor = rep): Promise<{ status: number; r: Round | null }> => { const x = await call("GET", `/runtime/reviews/${id}`, undefined, actor); return { status: x.status, r: x.status === 200 ? x.body as Round : null }; };
  const rowOf = (r: Round | null, filing: string | undefined) => r?.filings.find((x) => x.filing === filing) ?? null;
  const hashes = (row: Row | null) => Object.fromEntries((row?.forms ?? []).map((x) => [x.item, x.live_hash ?? "waits"]));

  // 1 Send two filings
  let res = await call("POST", `/runtime/cases/${c.id}/reviews`, { filings: [fP, fS] }, officer);
  const r1 = res.body?.id as string | undefined;
  const formsN = Number(sql(`select count(*) from review_round_form where round_id='${r1}'`) ?? -1);
  const expectedForms = Number(sql(`select count(*) from filing_item where case_id='${c.id}' and kind='form' and active and filing_id in ('${fP}','${fS}')`) ?? -2);
  const online = sql(`select count(*) from review_round_form where round_id='${r1}' and file_kind='none' and snapshot_id is not null`);
  ok("C8.3-1 pass (BR-1, B2): one send of 2 filings → one round, two filing rows Sent, a frozen stamp (own snapshot, facts hash, file) per form, an Online form with no copy frozen too",
    res.status === 201 && sql(`select count(*) from review_round where case_id='${c.id}'`) === "1" && sql(`select string_agg(status, ',' order by status) from review_round_filing where round_id='${r1}'`) === "sent,sent"
      && formsN > 0 && formsN === expectedForms && sql(`select count(*) from review_round_form where round_id='${r1}' and file_kind<>'waits' and (snapshot_id is null or facts_hash is null)`) === "0" && Number(online ?? 0) >= 1,
    { status: res.status, body: res.body, forms: formsN, expectedForms, online });

  // 2, 3 Refusals of a send
  res = await call("POST", `/runtime/cases/${c.id}/reviews`, { filings: [] }, officer);
  ok("C8.3-2 fail (BR-1): none ticked → 400 on the filings field", res.status === 400 && JSON.stringify(res.body).includes("filings"), res.body);
  res = await call("POST", `/runtime/cases/${c.id}/reviews`, { filings: [fP] }, officer);
  ok("C8.3-3 fail (BR-1): a filing already in an open round → 409 naming it", res.status === 409 && /Sample Client A/.test(res.body?.detail ?? ""), res.body);

  // 4 Open: only the representative's POST moves it
  const offOpen = await call("POST", `/runtime/reviews/${r1}/open`, { filing: fP }, officer);
  const g1 = await read(r1, rep), g2 = await read(r1, officer);
  const before = sql(`select string_agg(status, ',') from review_round_filing where round_id='${r1}'`);
  const opened = await call("POST", `/runtime/reviews/${r1}/open`, { filing: fP }, rep);
  ok("C8.3-4 pass (BR-3, m1): the officer's open (403) and any GET change nothing; the representative's POST open → Under review with who",
    offOpen.status === 403 && g1.status === 200 && g2.status === 200 && before === "sent,sent" && opened.status === 200 && opened.body?.status === "under_review" && sql(`select opened_by from review_round_filing where round_id='${r1}' and filing_id='${fP}'`) === rep,
    { off: offOpen.status, before, opened: opened.body });

  // 5 The checklist
  let r = (await read(r1)).r;
  const comb = sql(`select combination_key from filing where id='${fP}'`) ?? "";
  const keys = rowOf(r, fP)?.checks.map((k) => k.key) ?? [];
  ok("C8.3-5 pass (BR-2): the checklist is the default items (with their live state), the program's items for the filing's combination (Sample), and the confirmations with who",
    keys.includes("default:no_critical") && keys.includes("default:documents") && (ITEMS[comb] ?? []).length > 0 && (ITEMS[comb] ?? []).every((x) => keys.includes(`program:${x.key}`)) && keys.includes("confirmations")
      && rowOf(r, fP)?.checks.find((k) => k.key === "default:documents")?.live !== null && /by /.test(rowOf(r, fP)?.checks.find((k) => k.key === "confirmations")?.wording ?? ""),
    rowOf(r, fP)?.checks.map((k) => [k.key, k.wording, k.live]));

  // 6 Send back without reasons
  res = await call("POST", `/runtime/reviews/${r1}/decision`, { filing: fP, verdict: "send_back", form_hashes: hashes(rowOf(r, fP)), reasons: [] }, rep);
  ok("C8.3-6 fail (BR-5): send back without reasons → 400", res.status === 400 && JSON.stringify(res.body).includes("reasons"), res.body);

  // 12 A stale hash at decision → 409, nothing stamped (before any approval)
  await call("POST", `/runtime/reviews/${r1}/open`, { filing: fS }, rep);
  r = (await read(r1)).r;
  const staleHashes = { ...hashes(rowOf(r, fS)), [rowOf(r, fS)?.forms.find((x) => !x.waits)?.item ?? "x"]: "0".repeat(64) };
  res = await call("POST", `/runtime/reviews/${r1}/decision`, { filing: fS, verdict: "approve", form_hashes: staleHashes, confirm_unticked: true }, rep);
  ok("C8.3-12 fail (BR-4, M4): a stale facts hash at decision → 409 \"Changed while you were reading: reload\", nothing stamped",
    res.status === 409 && /Changed while you were reading/.test(res.body?.detail ?? "") && sql(`select count(*) from review_round_form where round_id='${r1}' and stamped_at is not null`) === "0" && sql(`select status from review_round_filing where round_id='${r1}' and filing_id='${fS}'`) === "under_review", res.body);

  // 8 Unticked items need one confirmation
  res = await call("POST", `/runtime/reviews/${r1}/decision`, { filing: fS, verdict: "approve", form_hashes: hashes(rowOf(r, fS)) }, rep);
  const no = res;
  await call("POST", `/runtime/reviews/${r1}/checks`, { filing: fS, item: "default:no_critical", ticked: true }, rep);
  res = await call("POST", `/runtime/reviews/${r1}/decision`, { filing: fS, verdict: "approve", form_hashes: hashes(rowOf(r, fS)), confirm_unticked: true }, rep);
  ok("C8.3-8 pass (BR-4, r6): approving with unticked items needs the one confirmation (400 without, in the concept's words; 200 with), recorded",
    no.status === 400 && /checklist items? (is|are) not ticked\. Approve anyway\? This is recorded\./.test(no.body?.detail ?? "") && res.status === 200
      && Number(sql(`select jsonb_array_length(confirmed_unticked) from review_round_filing where round_id='${r1}' and filing_id='${fS}'`) ?? 0) >= 1 && !(sql(`select confirmed_unticked::text from review_round_filing where round_id='${r1}' and filing_id='${fS}'`) ?? "").includes("default:no_critical"),
    { without: no.body?.detail, with: [res.status, res.body?.detail] });

  // 9 The stamps and C7.6's line
  const bcS = lines("Sample Spouse A").find((l) => l.barcode)?.form;
  const bcItem = itemsOf((await prepare(c.id, officer)).p, S, bcS).find((i) => i.kind === "form")?.id;
  p = (await prepare(c.id, officer)).p;
  const vSha = sql(`select v.sha256 from validated_copy v join form_instance i on i.id=v.form_instance_id where i.case_id='${c.id}' and i.subject_id='${S}' and i.form_number='${bcS}' order by v.read_at desc limit 1`);
  ok(`C8.3-9 pass (BR-4, B2): approve stamps every form (${bcS}'s file is its validated copy read back) and writes filing_review; C7.6's review line closes`,
    !!bcS && sql(`select stamp_file_kind || '|' || stamp_file_sha256 from review_round_form where round_id='${r1}' and item_id='${bcItem}'`) === `validated_copy|${vSha}`
      && sql(`select count(*) from review_round_form where round_id='${r1}' and filing_id='${fS}' and file_kind<>'waits' and stamped_at is null`) === "0"
      && sql(`select count(*) from filing_review where filing_id='${fS}'`) === "1" && !(readinessOf(p, fS)?.warns ?? []).some((w) => w.code === "representative_review"),
    { stamp: sql(`select stamp_file_kind || '|' || coalesce(stamp_file_sha256,'') from review_round_form where round_id='${r1}' and item_id='${bcItem}'`), vSha, warns: (readinessOf(p, fS)?.warns ?? []).map((w) => w.code) });

  // 7 Send back one filing, approve the other, in the same round
  const fixItem = rowOf(r, fP)?.forms.find((x) => x.form === BC?.form)?.item;
  res = await call("POST", `/runtime/reviews/${r1}/decision`, { filing: fP, verdict: "send_back", form_hashes: hashes(rowOf(r, fP)), reasons: [{ text: `${BC?.form}: a date does not match the passport (Sample).`, item: fixItem }] }, rep);
  const st1 = sql(`select string_agg(filing_id || '=' || status, ',' order by status) from review_round_filing where round_id='${r1}'`);
  // The officer fixes a fact only the barcode form reads, then sends round 2.
  type Q = { subjectId: string; fact: string; value_type: string; collected_from: string; hidden: boolean; group: string | null; required: boolean; fills: { form: string }[]; answer: { value?: unknown } | null };
  // CI gate B on the configured checkpoint (#1247, run 42566736094): there every fact is collected in the client
  // questionnaire, so the fact is picked from the data whoever collects it (P-319): a text fact only the barcode form
  // reads, answered as text; one the staff collect comes first. Staff may enter any fact (agent view), so the case
  // officer (or, at -13, the representative) types the change, whose typist the steps then check.
  const onlyOn = async (subject: string, form: string | undefined, caseId = c.id) => { const qs = (((await agent(caseId))?.sections ?? []) as { questions: Q[] }[]).flatMap((s) => s.questions)
    .filter((q) => q.subjectId === subject && !q.hidden && !q.group && q.value_type === "text" && q.fills.length > 0 && q.fills.every((x) => x.form === form) && typeof q.answer?.value === "string");
    return qs.find((q) => q.collected_from !== "client_questionnaire") ?? qs[0]; };
  const qP = await onlyOn(P, BC?.form);
  if (qP) { await answer(c.id, P, qP.fact, `${String(qP.answer?.value)} B`, officer); await confirmAll(c.id, P); }
  res = await call("POST", `/runtime/cases/${c.id}/reviews`, { filings: [fP] }, officer);
  const r2 = res.body?.id as string | undefined;
  ok("C8.3-7 pass (BR-5, B1): one filing sent back and the other approved in the same round (a status per filing); the next send of the first is its round 2",
    st1 === [`${fS}=approved`, `${fP}=sent_back`].sort((a, b) => a.split("=")[1].localeCompare(b.split("=")[1])).join(",") && res.status === 201 && sql(`select filing_round from review_round_filing where round_id='${r2}' and filing_id='${fP}'`) === "2",
    { st1, send2: [res.status, res.body?.detail], fact: qP?.fact });

  // 11 Round 2 lists only the changed forms, before → after, with who typed it
  await call("POST", `/runtime/reviews/${r2}/open`, { filing: fP }, rep);
  let g = (await read(r2)).r;
  const changedForms = (rowOf(g, fP)?.forms ?? []).filter((x) => x.state === "changed_since_review");
  ok("C8.3-11 pass (BR-6, m4): round 2 marks only the changed form \"Changed since review\", with before → after and the person who typed the new value",
    !!qP && changedForms.length === 1 && changedForms[0].form === BC?.form && changedForms[0].changes.length >= 1 && changedForms[0].changes.some((x) => x.was === qP.answer?.value && x.now === `${String(qP.answer?.value)} B` && x.typed_by === officer)
      && rowOf(g, fP)?.changed === 1,
    rowOf(g, fP)?.forms.map((x) => [x.form, x.state, x.changes.map((y) => [y.label, y.was, y.now, y.typed_by])]));

  // 13 A fact changed by the representative → approve needs the statement or a send back (C7.6's rule: 409 on this firm)
  if (qP) { await answer(c.id, P, qP.fact, `${String(qP.answer?.value)} C`, rep); await confirmAll(c.id, P); }
  g = (await read(r2)).r;
  res = await call("POST", `/runtime/reviews/${r2}/decision`, { filing: fP, verdict: "approve", form_hashes: hashes(rowOf(g, fP)), confirm_unticked: true, self: true }, rep);
  const back = await call("POST", `/runtime/reviews/${r2}/decision`, { filing: fP, verdict: "send_back", form_hashes: hashes(rowOf(g, fP)), reasons: [{ text: "I changed a value myself: the officer checks it (Sample)." }] }, rep);
  ok("C8.3-13 fail (BR-8, M3): after the representative typed a fact on the filing, approve is refused as a second person's (409, on a firm with another officer); a send back is taken",
    res.status === 409 && /second person/.test(res.body?.detail ?? "") && back.status === 200, { approve: [res.status, res.body?.detail], back: [back.status, back.body?.detail] });

  // 10 A fact change after approval withdraws only that form's approval; C7.6's line reopens
  const qS = await onlyOn(S, bcS);
  if (qS) { await answer(c.id, S, qS.fact, `${String(qS.answer?.value)} D`, officer); await confirmAll(c.id, S); }
  g = (await read(r1)).r;
  const sForms = rowOf(g, fS)?.forms ?? [];
  const wd = sForms.find((x) => x.item === bcItem);
  p = (await prepare(c.id, officer)).p;
  ok("C8.3-10 pass (BR-7, P-412 F1): a fact change → that form shows \"Approval withdrawn\" naming the fact and who typed it; the other forms keep their stamp; C7.6's review line reopens",
    !!qS && wd?.state === "approval_withdrawn" && /^Approval withdrawn: .+ changed by Case officer/.test(wd.withdrawn_words ?? "") && sForms.filter((x) => x.item !== bcItem && !x.waits).every((x) => x.state === "approved") && sForms.filter((x) => !x.waits).length > 1
      && (readinessOf(p, fS)?.warns ?? []).some((w) => w.code === "representative_review"),
    { forms: sForms.map((x) => [x.form, x.state, x.withdrawn_words]), warns: (readinessOf(p, fS)?.warns ?? []).map((w) => w.code) });

  // 17, 18 P-412: the change-only view and the one-click re-approve
  const rowS = rowOf(g, fS);
  const offRe = await call("POST", `/runtime/reviews/${r1}/reapprove`, { filing: fS, form_hashes: hashes(rowS) }, officer);
  const staleRe = await call("POST", `/runtime/reviews/${r1}/reapprove`, { filing: fS, form_hashes: { ...hashes(rowS), [bcItem ?? "x"]: "0".repeat(64) } }, rep);
  ok("C8.3-17 fail (P-412 F2, M4): the re-approve is the representative of record's only (the officer: 403) and of the facts on the page (a stale hash: 409)",
    offRe.status === 403 && offRe.body?.detail === READ_ONLY && staleRe.status === 409, { officer: offRe.status, stale: staleRe.status });
  const stampsBefore = sql(`select string_agg(item_id || '=' || stamp_snapshot_id, ',' order by item_id) from review_round_form where round_id='${r1}' and filing_id='${fS}' and stamped_at is not null`);
  res = await call("POST", `/runtime/reviews/${r1}/reapprove`, { filing: fS, form_hashes: hashes(rowS) }, rep);
  const r3 = res.body?.round?.id as string | undefined;
  const stampsAfter = sql(`select string_agg(item_id || '=' || stamp_snapshot_id, ',' order by item_id) from review_round_form where round_id='${r3}' and stamped_at is not null`);
  const keep = (stampsBefore ?? "").split(",").filter((x) => !x.startsWith(`${bcItem}=`)), now3 = (stampsAfter ?? "").split(",");
  p = (await prepare(c.id, officer)).p;
  const again = await call("POST", `/runtime/reviews/${r3}/reapprove`, { filing: fS, form_hashes: hashes(rowOf((await read(r3)).r, fS)) }, rep);
  ok("C8.3-18 pass (P-412 F1): the representative sees only the changed form and re-approves it in one click: a new round, approved at once; the unchanged forms keep their stamp, only the changed one is stamped anew; C7.6's line closes; a second click finds nothing changed (409)",
    rowS?.reapprovable === true && rowS.withdrawn.join() === bcItem && res.status === 200 && (res.body?.reapproved ?? []).join() === bcItem && sql(`select kind from review_round where id='${r3}'`) === "reapprove"
      && keep.every((x) => now3.includes(x)) && !now3.includes((stampsBefore ?? "").split(",").find((x) => x.startsWith(`${bcItem}=`)) ?? "-") && !(readinessOf(p, fS)?.warns ?? []).some((w) => w.code === "representative_review") && again.status === 409,
    { status: res.status, body: res.body?.detail ?? res.body?.reapproved, keep, now3, again: again.status });

  // 13b (review M2): a fact the representative types BETWEEN rounds (after the send back, before the next send) still
  // makes them an author of the next round: its base is the previous round's frozen snapshot, not its own send.
  if (qP) { await answer(c.id, P, qP.fact, `${String(qP.answer?.value)} E`, rep); await confirmAll(c.id, P); }
  // 14 The permission matrix (BR-9)
  await call("POST", `/runtime/cases/${c.id}/reviews`, { filings: [fP] }, officer);
  const r4 = sql(`select r.id from review_round r join review_round_filing f on f.round_id=r.id where f.filing_id='${fP}' and f.status='sent'`) ?? "";
  g = (await read(r4)).r;
  const m: Record<string, number> = {};
  m.officerTick = (await call("POST", `/runtime/reviews/${r4}/checks`, { filing: fP, item: "default:no_critical", ticked: true }, officer)).status;
  m.repTickBeforeOpen = (await call("POST", `/runtime/reviews/${r4}/checks`, { filing: fP, item: "default:no_critical", ticked: true }, rep)).status; // break m3: 409
  await call("POST", `/runtime/reviews/${r4}/open`, { filing: fP }, rep);
  const between = await call("POST", `/runtime/reviews/${r4}/decision`, { filing: fP, verdict: "approve", form_hashes: hashes(rowOf(g, fP)), confirm_unticked: true, self: true }, rep);
  ok("C8.3-13b fail (BR-8, review M2): a fact the representative typed between rounds (after the send back, before the next send) is still theirs: approve is refused as a second person's (409), never \"Reviewed\"",
    !!qP && between.status === 409 && /second person/.test(between.body?.detail ?? "") && sql(`select count(*) from review_round_filing where round_id='${r4}' and status='approved'`) === "0", [between.status, between.body?.detail, qP?.fact, rowOf(g, fP)?.forms.map((x) => [x.form, x.state, x.changes.map((y) => [y.label, y.was, y.now, y.typed_by])])]);
  m.nowNotSolo = (await call("POST", `/runtime/cases/${c.id}/reviews`, { filings: [fS], now: true }, rep)).status; // review m2: 400
  m.officerApprove = (await call("POST", `/runtime/reviews/${r4}/decision`, { filing: fP, verdict: "approve", form_hashes: hashes(rowOf(g, fP)), confirm_unticked: true }, officer)).status;
  m.officerBack = (await call("POST", `/runtime/reviews/${r4}/decision`, { filing: fP, verdict: "send_back", form_hashes: hashes(rowOf(g, fP)), reasons: [{ text: "Not mine to send back (Sample)" }] }, officer)).status;
  m.configRead = (await call("GET", `/runtime/reviews/${r4}`, undefined, AUTHOR)).status;
  m.configSend = (await call("POST", `/runtime/cases/${c.id}/reviews`, { filings: [fS] }, AUTHOR)).status;
  m.clientRead = (await call("GET", `/runtime/reviews/${r4}`, undefined, CLIENT)).status;
  m.clientSend = (await call("POST", `/runtime/cases/${c.id}/reviews`, { filings: [fS] }, CLIENT)).status;
  const solo = f.soloRep ?? "user-S";
  for (const [k, path, body] of [["otherFirmRead", `/runtime/reviews/${r4}`, undefined], ["otherFirmOpen", `/runtime/reviews/${r4}/open`, { filing: fP }], ["otherFirmCheck", `/runtime/reviews/${r4}/checks`, { filing: fP, item: "default:no_critical", ticked: true }],
    ["otherFirmDecide", `/runtime/reviews/${r4}/decision`, { filing: fP, verdict: "approve", form_hashes: {} }], ["otherFirmReapprove", `/runtime/reviews/${r4}/reapprove`, { filing: fP }], ["otherFirmSend", `/runtime/cases/${c.id}/reviews`, { filings: [fP] }], ["otherFirmList", `/runtime/cases/${c.id}/reviews`, undefined]] as const)
    m[k] = (await call(body === undefined && !k.endsWith("Open") ? "GET" : "POST", path, body, solo)).status;
  m.tryUpdate = sql(`update review_round set kind='send' where id='${r1}' returning id`) === null ? 1 : 0; // the trigger refuses (BR-10)
  // A former representative: the representative of record changes; the earlier one's decision is refused and the stamps read "the representative of record changed".
  const moved = await call("PUT", `/runtime/cases/${c.id}/team/representative`, { userId: f.rep2, reason: "Holiday cover (Sample)", expectedRepresentative: rep }, f.admin ?? rep);
  m.formerDecide = (await call("POST", `/runtime/reviews/${r4}/decision`, { filing: fP, verdict: "send_back", form_hashes: hashes(rowOf(g, fP)), reasons: [{ text: "Former representative (Sample)" }] }, rep)).status;
  const gs = (await read(r3, f.rep2 ?? rep)).r;
  const repWords = rowOf(gs, fS)?.forms.filter((x) => !x.waits).every((x) => x.state === "approval_withdrawn" && x.withdrawn_words === "Approval withdrawn: the representative of record changed.");
  // Break M1: the new representative of record re-approves in one click (F2's holiday cover): the firm record's facts
  // that changed with the representative are nobody's typing, so not "You changed a fact".
  const newRep = await call("POST", `/runtime/reviews/${r3}/reapprove`, { filing: fS, form_hashes: hashes(rowOf(gs, fS)) }, f.rep2 ?? rep);
  ok("C8.3-14c pass (break M1): after a change of representative the new representative of record re-approves in one click (200, Reviewed); the former representative's ticks are not carried (break m2)",
    newRep.status === 200 && newRep.body?.kind === "reviewed" && sql(`select count(*) from review_check where round_filing_id=(select id from review_round_filing where round_id='${newRep.body?.round?.id}') and ticked_by is not null`) === "0", [newRep.status, newRep.body?.detail]);
  // Break m6: the triggers refuse an approved row inserted into a send round, and a check added under a decided row.
  const anyRound = sql(`select id from review_round where case_id='${c.id}' and kind='send' limit 1`), decidedRow = sql(`select id from review_round_filing where round_id='${r1}' and status='sent_back' limit 1`);
  m.insertApproved = sql(`insert into review_round_filing (id, workspace_id, case_id, round_id, filing_id, filing_round, status, opened_by, opened_at, decided_by, decided_at, representative, review_kind, filing_review_id) select gen_random_uuid(), workspace_id, case_id, '${anyRound}', '${fP}', 99, 'approved', 'x', now(), 'x', now(), 'x', 'reviewed', (select id from filing_review limit 1) from review_round where id='${anyRound}' returning id`) === null ? 1 : 0;
  m.insertCheck = sql(`insert into review_check (id, workspace_id, case_id, round_filing_id, item_key, source, wording) select gen_random_uuid(), workspace_id, case_id, id, 'forged', 'default', 'Forged item' from review_round_filing where id='${decidedRow}' returning id`) === null ? 1 : 0;
  // A removed filing (C6.13): its send is refused (409).
  const pv = await call("POST", `/runtime/cases/${c.id}/filing-changes`, { kind: "remove_filing", subject: S, preview: true }, officer);
  await call("POST", `/runtime/cases/${c.id}/filing-changes`, { kind: "remove_filing", subject: S, basis: pv.body?.basis, reason: "Not travelling now (Sample)" }, officer);
  m.removedSend = (await call("POST", `/runtime/cases/${c.id}/reviews`, { filings: [fS] }, officer)).status;
  ok("C8.3-14 fail (BR-9, F2, M7): the officer ticking, approving or sending back 403; configuration 403; a client 403; another firm 404 on every route; a former representative 403 (the stamps read \"the representative of record changed\"); a removed filing 409; the database refuses changing a round",
    m.officerTick === 403 && m.officerApprove === 403 && m.officerBack === 403 && m.configRead === 403 && m.configSend === 403 && m.clientRead === 403 && m.clientSend === 403
      && ["otherFirmRead", "otherFirmOpen", "otherFirmCheck", "otherFirmDecide", "otherFirmReapprove", "otherFirmSend", "otherFirmList"].every((k) => m[k] === 404) && moved.status === 200 && m.formerDecide === 403 && !!repWords && m.removedSend === 409 && m.tryUpdate === 1 && m.repTickBeforeOpen === 409 && m.nowNotSolo === 400 && m.insertApproved === 1 && m.insertCheck === 1, { m, moved: moved.status, repWords });

  // 14 (cont.) Self-review on a solo firm: "Review now" sends and opens in one step; without the statement 400, with it 200
  const sc = await openCase(vv, [{ role: "principal", name: "Sample Client S", dob: yearsAgo(41) }], { representative: solo, caseOfficers: [solo] });
  const sp = (await prepare(sc.id, solo)).p, sf = sp?.filings[0]?.id;
  res = await call("POST", `/runtime/cases/${sc.id}/reviews`, { filings: [sf], now: true }, solo);
  const rs = res.body?.id as string | undefined, gsolo = (await read(rs, solo)).r;
  const noSelf = await call("POST", `/runtime/reviews/${rs}/decision`, { filing: sf, verdict: "approve", form_hashes: hashes(rowOf(gsolo, sf)), confirm_unticked: true }, solo);
  const withSelf = await call("POST", `/runtime/reviews/${rs}/decision`, { filing: sf, verdict: "approve", form_hashes: hashes(rowOf(gsolo, sf)), confirm_unticked: true, self: true }, solo);
  // Prepared with another officer on a firm that is not solo: 409 (C7.6's rule). BK-18 (QA-448, P-525 (1); as C7.6's
  // N4): being named on the case team is not work, so both people really work on it before it is sent — the officer
  // and the representative each type a fact — and the refusal stands on what the case holds, not on a team row.
  const pc = await openCase(vv, [{ role: "principal", name: "Sample Client T", dob: yearsAgo(42) }], { representative: rep, caseOfficers: [officer, rep] });
  const pT = pc.subjects["Sample Client T"];
  const worked = [(await answer(pc.id, pT, "person.passport_number", "ZX9999992", officer)).status, (await answer(pc.id, pT, "person.family_name", "Sample T", rep)).status];
  const pp = (await prepare(pc.id, officer)).p, pf = pp?.filings[0]?.id;
  const rp = (await call("POST", `/runtime/cases/${pc.id}/reviews`, { filings: [pf] }, officer)).body?.id as string | undefined;
  await call("POST", `/runtime/reviews/${rp}/open`, { filing: pf }, rep);
  const prep = await call("POST", `/runtime/reviews/${rp}/decision`, { filing: pf, verdict: "approve", form_hashes: hashes(rowOf((await read(rp)).r, pf)), confirm_unticked: true, self: true }, rep);
  ok("C8.3-14b fail (BR-8, BR-9): on a solo firm \"Review now\" opens at once; self-review without the statement 400, with it 200 (Self-reviewed); prepared with another officer on a firm that is not solo 409",
    res.status === 201 && gsolo?.kind === "review_now" && rowOf(gsolo, sf)?.status === "under_review" && noSelf.status === 400 && withSelf.status === 200 && withSelf.body?.kind === "self_reviewed"
      && worked.every((x) => x < 300) && prep.status === 409 && /second person/.test(prep.body?.detail ?? ""),
    { send: res.status, kind: gsolo?.kind, noSelf: [noSelf.status, noSelf.body?.detail], withSelf: [withSelf.status, withSelf.body?.detail], worked, prep: [prep.status, prep.body?.detail] });

  // 19 Break B1: a send back withdraws the earlier approval (C7.6's line reopens; C8.2's "Reviewed by" reads nothing)
  const before19 = readinessOf((await prepare(sc.id, solo)).p, sf);
  const r19 = (await call("POST", `/runtime/cases/${sc.id}/reviews`, { filings: [sf] }, solo)).body?.id as string | undefined;
  const mid19 = readinessOf((await prepare(sc.id, solo)).p, sf);
  await call("POST", `/runtime/reviews/${r19}/open`, { filing: sf }, solo);
  const back19 = await call("POST", `/runtime/reviews/${r19}/decision`, { filing: sf, verdict: "send_back", form_hashes: hashes(rowOf((await read(r19, solo)).r, sf)), reasons: [{ text: "Not right yet: check the passport page (Sample)." }] }, solo);
  const after19 = readinessOf((await prepare(sc.id, solo)).p, sf) as { reviewed?: unknown; warns: { code: string }[] } | null;
  ok("C8.3-19 fail (break B1): approved, then sent again and sent back: the earlier approval no longer counts (C7.6's review line open, \"reviewed\" empty, so C8.2 records no \"Reviewed by\")",
    !!(before19 as { reviewed?: unknown } | null)?.reviewed && !(mid19 as { reviewed?: unknown } | null)?.reviewed && back19.status === 200 && !after19?.reviewed && (after19?.warns ?? []).some((w) => w.code === "representative_review"),
    { before: !!(before19 as { reviewed?: unknown } | null)?.reviewed, back: back19.status, after: after19?.reviewed, warns: (after19?.warns ?? []).map((w) => w.code) });

  // 20 Review M3 and m6: a relative's fact is named as the relative's, and an answer shows its words, never its key
  const famRead = (await read(r1)).r;
  const facts = (famRead?.filings ?? []).flatMap((x) => x.forms.flatMap((y) => (y as unknown as { facts: { person: string; value: unknown; value_words: string | null }[] }).facts));
  ok("C8.3-20 pass (review M3, m6): on the forms, relatives' facts carry the relative's own words (\"…'s parent 1\"), and no answer is shown as a raw key",
    facts.some((x) => /'s /.test(x.person)) && !facts.some((x) => typeof x.value === "string" && /^[a-z]+(_[a-z]+)+$/.test(x.value) && (x.value_words ?? x.value) === x.value),
    { relatives: facts.filter((x) => /'s /.test(x.person)).slice(0, 3), raw: facts.filter((x) => typeof x.value === "string" && /^[a-z]+(_[a-z]+)+$/.test(x.value)).slice(0, 3) });

  // 21 Break M3: a send and the C7.6 route at the same moment never leave a filing reviewed while it is in an open round
  const rc = await openCase(vv, [{ role: "principal", name: "Sample Client R", dob: yearsAgo(37) }], { representative: rep, caseOfficers: [officer] });
  const rf = (await prepare(rc.id, officer)).p?.filings[0]?.id;
  const outcomes: string[] = [];
  for (let i = 0; i < 4; i++) {
    const fh = readinessOf((await prepare(rc.id, officer)).p, rf)?.facts_hash;
    const [a, b2] = await Promise.all([call("POST", `/runtime/filings/${rf}/review`, { facts_hash: fh }, rep), call("POST", `/runtime/cases/${rc.id}/reviews`, { filings: [rf] }, officer)]);
    outcomes.push(`${a.status}/${b2.status}`);
    const open = sql(`select round_id from review_round_filing where filing_id='${rf}' and status in ('sent','under_review')`);
    if (open) { await call("POST", `/runtime/reviews/${open}/open`, { filing: rf }, rep); await call("POST", `/runtime/reviews/${open}/decision`, { filing: rf, verdict: "send_back", form_hashes: hashes(rowOf((await read(open)).r, rf)), reasons: [{ text: "Closing the race round (Sample)." }] }, rep); }
  }
  // Invariant: no one-step approval was written while an older round of the filing was open (sent before it, decided after).
  const bad = sql(`select count(*) from review_round_filing a join review_round ra on ra.id=a.round_id join review_round_filing b on b.filing_id=a.filing_id join review_round rb on rb.id=b.round_id where a.filing_id='${rf}' and ra.kind='one_step' and b.filing_round < a.filing_round and rb.sent_at <= a.decided_at and (b.decided_at is null or b.decided_at > a.decided_at)`);
  ok("C8.3-21 fail (break M3): the C7.6 route racing a send: when the send wins, the route answers 409 and writes nothing (never reviewed while sent)",
    bad === "0" && outcomes.every((o) => /^(200|409)\/(201|409)$/.test(o)), { outcomes, bad });

  // 15 The C7.6 route is a one-step round; readyToFile still works
  const oc = await openCase(vv, [{ role: "principal", name: "Sample Client U", dob: yearsAgo(39) }], { representative: rep, caseOfficers: [officer] });
  const done = await readyToFile(oc.id, rep);
  const of = done[0];
  ok("C8.3-15 pass (M1): the C7.6 review route makes a one-step round (sent, opened, approved, every form stamped) and readyToFile still reaches Ready to file",
    done.length === 1 && sql(`select count(*) from review_round r join review_round_filing f on f.round_id=r.id where r.case_id='${oc.id}' and r.kind='one_step' and f.status='approved' and f.filing_review_id is not null`) === "1"
      && sql(`select count(*) from review_round_form where filing_id='${of}' and file_kind<>'waits' and stamped_at is null`) === "0" && Number(sql(`select count(*) from review_round_form where filing_id='${of}'`) ?? 0) > 0,
    { done, rounds: sql(`select string_agg(kind, ',') from review_round where case_id='${oc.id}'`) });

  // 22, 23 QA-345 (the tech lead's ruling (a), 9 Nov 18:35 IST): an approval stamps the file it approved. A send back
  // changes a fact only the barcode form reads, so round 2's approval finds no file for its facts (stamped "none"); the
  // validated copy read back next is stamped to it, with an audit line. A validated copy that counts for filing but was
  // never stamped (kept before this fix, inserted here as that code left it) withdraws the approval until re-approved.
  const qc = await openCase(vv, [{ role: "principal", name: "Sample Client Q", dob: yearsAgo(41) }], { representative: rep, caseOfficers: [officer] });
  const Q = qc.subjects["Sample Client Q"];
  await fillEverything(qc.id);
  const qbc = [...((await expectedFor(qc.id))?.["Sample Client Q"]?.forms ?? []), ...((await expectedFor(qc.id))?.["Sample Client Q"]?.waiting ?? [])].find((l) => l.barcode);
  if (qbc?.channel === "ONLINE") { const q = (await prepare(qc.id, officer)).p; await call("PATCH", `/runtime/items/${itemsOf(q, Q, qbc.form)[0]?.id}/channel`, { channel: "PAPER", reason: "Cannot apply online: accommodation (Sample)", version: q?.version }, officer); }
  if (qbc) await validateRoundTrip(qc.id, qbc.form, Q);
  const fQ = (await prepare(qc.id, officer)).p?.filings[0]?.id, qItem = itemsOf((await prepare(qc.id, officer)).p, Q, qbc?.form).find((i) => i.kind === "form")?.id;
  const qRound = async (verdict: "approve" | "send_back") => {
    const id = (await call("POST", `/runtime/cases/${qc.id}/reviews`, { filings: [fQ] }, officer)).body?.id as string;
    await call("POST", `/runtime/reviews/${id}/open`, { filing: fQ }, rep);
    const d = await call("POST", `/runtime/reviews/${id}/decision`, { filing: fQ, verdict, form_hashes: hashes(rowOf((await read(id)).r, fQ)), confirm_unticked: true, reasons: verdict === "send_back" ? [{ text: `${qbc?.form}: the city of birth does not match the passport (Sample).` }] : undefined }, rep);
    return { id, status: d.status };
  };
  // A prefix keeps the value valid (an e-mail stays an e-mail), so each bump changes what the form writes.
  const bump = async (tag: string) => { const q = await onlyOn(Q, qbc?.form, qc.id); if (q) { await answer(qc.id, Q, q.fact, `${tag}${String(q.answer?.value)}`, officer); await confirmAll(qc.id, Q); } return !!q; };
  await qRound("send_back");
  const bumped = await bump("q");
  const q2 = await qRound("approve");
  const kindAt = sql(`select stamp_file_kind from review_round_form where round_id='${q2.id}' and item_id='${qItem}'`);
  if (qbc) await validateRoundTrip(qc.id, qbc.form, Q);
  const vShaQ = sql(`select v.sha256 from validated_copy v join form_instance fi on fi.id=v.form_instance_id where fi.case_id='${qc.id}' and fi.subject_id='${Q}' and fi.form_number='${qbc?.form}' order by v.read_at desc limit 1`);
  const qf = rowOf((await read(q2.id)).r, fQ)?.forms.find((x) => x.item === qItem);
  p = (await prepare(qc.id, officer)).p;
  ok("C8.3-22 pass (QA-345, ruling (a)): after a send back that changed a barcode form's fact, round 2's approval stamped no file; the validated copy read back next is stamped to it (once, with an audit line), the form stays \"Approved, still current\" with that file, and C7.6 counts the review",
    !!qbc && bumped && q2.status === 200 && kindAt === "none" && sql(`select stamp_file_kind || '|' || stamp_file_sha256 from review_round_form where round_id='${q2.id}' and item_id='${qItem}'`) === `validated_copy|${vShaQ}`
      && qf?.state === "approved" && qf.stamp?.file_sha256 === vShaQ && sql(`select count(*) from audit_event where action='review_stamp_file' and entity_key='${q2.id}'`) === "1" && !!readinessOf(p, fQ)?.reviewed
      // Review m6: the database refuses every other move of a written stamp (to another file, back to none, with another column).
      && [`stamp_file_sha256='${"0".repeat(64)}'`, `stamp_file_kind='none', stamp_file_sha256=null`, `stamped_by='user-O'`].every((set) => sql(`update review_round_form set ${set} where round_id='${q2.id}' and item_id='${qItem}' returning id`) === null),
    { bc: qbc?.form, bumped, q2: q2.status, kindAt, stamp: qf?.stamp, vShaQ, state: qf?.state, reviewed: readinessOf(p, fQ)?.reviewed ?? null });
  // 23 (review M1): a second validated copy of the same facts read back after that is filed instead; the approval did not
  // stamp it, so it is withdrawn and asked again, on the Review page and on C7.6's line, until the one-click re-approve.
  if (qbc) await validateRoundTrip(qc.id, qbc.form, Q);
  const v2 = sql(`select v.sha256 from validated_copy v join form_instance fi on fi.id=v.form_instance_id where fi.case_id='${qc.id}' and fi.subject_id='${Q}' and fi.form_number='${qbc?.form}' order by v.read_at desc limit 1`);
  const w = rowOf((await read(q2.id)).r, fQ);
  const wf = w?.forms.find((x) => x.item === qItem);
  p = (await prepare(qc.id, officer)).p;
  const line = (readinessOf(p, fQ)?.warns ?? []).find((x) => x.code === "representative_review")?.words ?? "";
  const rq = await call("POST", `/runtime/reviews/${q2.id}/reapprove`, { filing: fQ, form_hashes: hashes(w) }, rep);
  p = (await prepare(qc.id, officer)).p;
  ok("C8.3-23 fail (QA-345, ruling (a); review M1): a second validated copy of the same facts read back after the stamp is filed without it → \"Approval withdrawn\" in words, C7.6's line in its own words; the one-click re-approve stamps that file",
    !!v2 && v2 !== vShaQ && wf?.state === "approval_withdrawn" && wf.withdrawn_words === "Approval withdrawn: the validated copy read back since is not the file this approval stamped. Re-approve to stamp the file that is filed."
      && w?.reapprovable === true && /A validated copy was read back after this filing was reviewed on .+, and the review did not stamp it\./.test(line)
      && rq.status === 200 && sql(`select stamp_file_kind || '|' || stamp_file_sha256 from review_round_form where round_id='${rq.body?.round?.id}' and item_id='${qItem}'`) === `validated_copy|${v2}` && !!readinessOf(p, fQ)?.reviewed,
    { rq: rq.status, detail: rq.body?.detail, reviewed: !!readinessOf(p, fQ)?.reviewed, line, reapprovable: w?.reapprovable, state: wf?.state, v2 });

  console.log("NOTE  C8.3-16 (screen walk at 1440 px): tests/check_c83_review_browser.cjs <port> <db> <shots dir>");
});
