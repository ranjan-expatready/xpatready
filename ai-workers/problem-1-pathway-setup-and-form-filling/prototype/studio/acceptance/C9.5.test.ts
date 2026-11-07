// C9.5 Adopt a published update on an open case (B145; concept screens/B145/concept.md §6 steps C9.5-1…14, challenge.md
// M7). On the configured checkpoint: the Sample family case on Visitor visa release 1 while release 2 is out (IMM 5257
// Online, the family form replaced, IMM 5476 signed by hand and scanned). The pack makes its own finished items through
// product routes (a validated copy read back, a signed scan by C8.1, reviews by C7.6, an upload by C6.4, a recorded
// filing by C8.2) and its own later Sample release through the author's routes (a form's field map changed, a document
// line removed, a field's answer type changed: acceptance/lib/sample-release.ts), so every group it asserts is non-empty
// or the step FAILS, never skips (P-319: forms picked by state at run time, never a fixed number). AI off, US$0.
// Runs on a FRESH isolated copy (the checkpoint loads its own configuration):
//   zsh studio/tools/isolated.sh accept 4440 start && tsx studio/acceptance/C9.5.test.ts 4440 xr_studio_accept
import { createHash } from "node:crypto";
import { AUTHOR, CLIENT, OFFICER, call, firms, generateCopy, itemsOf, main, ok, openCase, prepare, readinessOf, readyToFile, sendFile, signByHand, sql, until, yearsAgo, inDays } from "./lib/m3.ts";
import { sampleRelease } from "./lib/sample-release.ts";

type Line = { id: string; what: string; who: string; why: string; form?: string; subject?: string };
type Effects = Record<"fill_again" | "filed_another_way" | "no_longer_required" | "withdrawn" | "kept_out_of_date", Line[]> & { unchanged: { count: number } };
type View = { current: { version: number; label: string; revision: number }; target: { version: number; label: string } | null; changes: Record<string, { what: string; who: string[]; before: string; after: string; kind: string }[]>;
  effects: Effects; touched: { filing: string; words: string[] }[]; refused: { code: string; reason: string } | null; last_move: { effects: Effects } | null };
const n = (q: string) => Number(sql(q) ?? -1);
const ru = async (id: string, actor = OFFICER) => call("GET", `/runtime/cases/${id}/release-update`, undefined, actor);
const view = async (id: string) => (await ru(id)).body as View;
const move = (id: string, b: Record<string, unknown>, actor = OFFICER) => call("POST", `/runtime/cases/${id}/release-update`, b, actor);
const words = (r: { body: { detail?: string } | null }) => String(r.body?.detail ?? "");
const pins = (id: string) => n(`select count(*) from pack_work_pin where case_id='${id}'`);
const has = (ls: Line[] | undefined, re: RegExp, who?: string) => (ls ?? []).some((l) => re.test(l.what) && (!who || l.who === who));
const pdf = (label: string) => Buffer.from(`%PDF-1.4\n% SYNTHETIC SPECIMEN: ${label} (Sample)\n%%EOF\n`, "latin1");

await main("C9.5", "Adopt a published update on an open case (Visitor visa)", async () => {
  // ---------------------------------------------------------------- the checkpoint
  await call("POST", "/demo/reset", { confirm: "RESET" }, AUTHOR);
  const load = await call("POST", "/demo/load", { sample: "configured" }, AUTHOR);
  const vv = sql("select id from combination where combination_key='vv.single'") ?? "";
  const r1 = sql(`select id from config_release where combination_id='${vv}' and version=1`) ?? "", r2v = n(`select coalesce(max(version), 0) from config_release where combination_id='${vv}'`);
  const fam = sql(`select k.id from runtime_case k join pack_work_pin w on w.case_id=k.id where w.config_release_id='${r1}' order by k.created_at limit 1`) ?? "";
  ok("setup: the configured checkpoint loads the family case on Visitor visa release 1 while release 2 is out (fails, never skips, when either is missing)", load.status < 300 && !!fam && r2v >= 2, { load: load.status, fam, newest: r2v });
  if (!fam || r2v < 2) return;
  const f = await firms();
  const caseView = (await call("GET", `/runtime/cases/${fam}`, undefined, OFFICER)).body as { people: { subject_id: string; role: string; label: string }[] };
  const person = (role: string, adult?: boolean) => caseView.people.find((p) => p.role === role && (adult === undefined || /18 or over/.test(p.label) === adult));
  const [P, S, C1, C2] = [person("principal"), person("spouse_or_partner"), person("child", false), person("child", true)];
  ok("setup: the family's four people are on the case (principal, spouse, a child under 18, a child 18 or over)", !!(P && S && C1 && C2), caseView.people.map((p) => p.label));
  if (!P || !S || !C1 || !C2) return;

  // Work of its own on release 1, through the product's routes (challenge M7): Client A's IMM 5257 filled (a PDF upload on
  // release 1; its validated file is kept on the Mac in this checkpoint, QA-285, so the finished items are made on the
  // later stage: a signed scan, reviews, an upload), and the representative's review of Client A's filing.
  const draft5257 = await generateCopy(fam, "IMM 5257", P.subject_id);
  const vSha = draft5257 ? sql(`select sha256 from form_instance where id='${draft5257}'`) : null;
  let p = (await prepare(fam)).p;
  const filingOfP = p?.filings.find((x) => x.applicants.some((a) => a.subject === P.subject_id))?.id ?? "";
  const rev = await call("POST", `/runtime/filings/${filingOfP}/review`, { note: "Reviewed (Sample)", facts_hash: readinessOf(p, filingOfP)?.facts_hash }, f.rep ?? "");
  ok("setup: Client A's IMM 5257 filled on release 1, and the representative reviewed Client A's filing", !!draft5257 && !!vSha && rev.status < 300, { draft5257, review: rev.status, words: words(rev) });

  // ---------------------------------------------------------------- C9.5-1, -2: the list, computed, writing nothing
  await prepare(fam);
  const counts = () => ["pack_work_pin", "form_instance", "filing_review", "readiness_pass", "checklist_line", "case_document", "filing"].map((t) => `${t}:${n(`select count(*) from ${t}`)}`).join(",") + `,moved:${n(`select count(*) from audit_event where action='moved_release'`)}`;
  const before = counts();
  let v = await view(fam);
  const after = counts();
  const formLines = v?.changes?.forms ?? [];
  ok("C9.5-1 pass: the list names the forms release 2 changes for this case, with the people and old → new (IMM 5257 now Online, for Client A among others), and writes nothing (row counts equal)",
    before === after && !!v?.target && v.current.revision === 1 && formLines.length > 0 && formLines.some((l) => /^IMM 5257 ·/.test(l.what) && /Online/.test(l.after) && l.who.includes(P.label)) && formLines.every((l) => l.who.length > 0 && !!l.before && !!l.after), { before, after, forms: formLines.map((l) => `${l.what.slice(0, 14)}|${l.after}`) });
  const e = v?.effects;
  const ids = e ? [...e.fill_again, ...e.filed_another_way, ...e.no_longer_required, ...e.withdrawn, ...e.kept_out_of_date].map((l) => l.id) : [];
  ok("C9.5-2 pass: the work already done is sorted per BR-4: filed another way now (Client A's IMM 5257 copy among them), no longer required (the replaced family form's copies), the review withdrawn on Client A's filing; each non-empty, each item in one group",
    (e?.filed_another_way ?? []).some((l) => l.id === draft5257) && (e?.no_longer_required.length ?? 0) > 0 && (e?.withdrawn ?? []).some((l) => l.id === filingOfP) && new Set(ids).size === ids.length,
    e ? Object.fromEntries(Object.entries(e).map(([k, x]) => [k, Array.isArray(x) ? x.length : x])) : null);
  const warn = readinessOf((await prepare(fam)).p, filingOfP)?.warns.find((w) => w.code === "release_update");
  ok("C9.5-2 pass (BR-8): Ready to file warns on a filing the release touches, naming what it touches and the release, passable (a warning, never a block)", !!warn && warn.severity === "warning" && new RegExp(`${v!.target!.label}.*IMM 5257`).test(warn.words) && /Release 1/.test(warn.words), warn?.words);

  // ---------------------------------------------------------------- C9.5-3, -4, -5: refusals, nothing changed
  const body = { target_version: v!.target!.version, from_revision: 1, reason: "Adopting the current release" };
  let r = await move(fam, { target_version: body.target_version, from_revision: 1 });
  ok("C9.5-3 fail: a move without a reason is refused on its field (400), nothing changed", r.status === 400 && (r.body?.errors ?? []).some((x: { field: string }) => x.field === "reason") && pins(fam) === 1, { status: r.status, words: words(r) });
  const forbidden = [await ru(fam, CLIENT), await move(fam, body, CLIENT), await ru(fam, AUTHOR), await move(fam, body, AUTHOR)].map((x) => x.status);
  const other = [await ru(fam, f.soloRep ?? "user-S"), await move(fam, body, f.soloRep ?? "user-S")].map((x) => x.status);
  ok("C9.5-4 fail: the client and configuration people get 403 (list and move); another firm's staff 404; nothing changed", forbidden.every((s) => s === 403) && other.every((s) => s === 404) && pins(fam) === 1, { forbidden, other });
  const staleRev = await move(fam, { ...body, from_revision: 2 }), staleTarget = await move(fam, { ...body, target_version: body.target_version + 1 });
  ok("C9.5-5 fail: a move from a stale read (another revision or release) is refused 409 \"read the list again\", nothing changed", [staleRev, staleTarget].every((x) => x.status === 409 && /read the list again/i.test(words(x))) && pins(fam) === 1, [words(staleRev), words(staleTarget)]);

  // ---------------------------------------------------------------- C9.5-13, -6: Fill racing the move, then the move
  const fillsBefore = n(`select count(*) from form_instance where case_id='${fam}'`);
  const race = await Promise.all([move(fam, body), ...[[P, "IMM 5475"], [S, "IMM 5475"], [P, "IRM 0002"]].map(([who, form]) => call("POST", `/runtime/cases/${fam}/forms/${encodeURIComponent(form as string)}/${(who as { subject_id: string }).subject_id}/generate`, { idempotencyKey: `c95race${String(form).replace(/\W/g, "")}${(who as { role: string }).role}${Date.now()}` }, OFFICER))]);
  await until(async () => n(`select count(*) from form_instance where case_id='${fam}' and status in ('QUEUED','RUNNING')`) === 0, 120_000);
  let moved = race[0];
  if (moved.status === 409 && moved.body?.code === "fill_running") moved = await move(fam, body); // the fills came first: the move waited for them
  const pin2 = sql(`select config_release_id || '|' || pinned_at from pack_work_pin where case_id='${fam}' and revision=2`) ?? "";
  const [r2, pinnedAt] = pin2.split("|");
  const lateOnOld = n(`select count(*) from form_instance where case_id='${fam}' and config_release_id='${r1}' and created_at > '${pinnedAt}'`);
  ok("C9.5-13 pass (race, challenge M2): Fill pressed while the case moves answers 409 or makes its copy on the new release, never a copy on release 1 after the move",
    !!pinnedAt && lateOnOld === 0 && race.slice(1).every((x) => x.status === 409 || x.status < 300) && n(`select count(*) from form_instance where case_id='${fam}'`) >= fillsBefore, { move: race[0].status, fills: race.slice(1).map((x) => x.status), lateOnOld });
  const caseNow = (await call("GET", `/runtime/cases/${fam}`, undefined, OFFICER)).body;
  ok("C9.5-6 pass: the move writes pin revision 2 on release 2 with the reason; revision 1 is kept as it was; the case reads release 2",
    moved.status === 200 && moved.body?.revision === 2 && pins(fam) === 2 && sql(`select config_release_id from pack_work_pin where case_id='${fam}' and revision=1`) === r1 && r2 !== r1
    && sql(`select reason from pack_work_pin where case_id='${fam}' and revision=2`) === body.reason && caseNow?.pin?.revision === 2 && caseNow?.pin?.release_version === body.target_version && /^Moved to /.test(moved.body?.words ?? ""), { status: moved.status, words: moved.body?.words ?? words(moved) });
  p = (await prepare(fam)).p;
  const i5257 = itemsOf(p, P.subject_id, "IMM 5257")[0] as { channel?: string; release_note?: string } | undefined;
  const rdP = readinessOf(p, filingOfP);
  ok("C9.5-6 pass (BR-6): Prepare reads release 2: Client A's IMM 5257 is filed Online now and says the copy made on release 1 is kept and not filed; the Prepare groups list what the move did",
    i5257?.channel === "ONLINE" && /Filed another way now/.test(i5257?.release_note ?? "") && ((await view(fam)).last_move?.effects.filed_another_way.length ?? 0) > 0, i5257);
  ok("C9.5-8 pass (BR-6, challenge M5): the representative's review of Client A's filing is withdrawn by the move (the C7.6 line is back, naming the move), with the facts unchanged", !rdP?.reviewed && (rdP?.warns ?? []).some((w) => w.code === "representative_review" && /moved to/i.test(w.words)), rdP?.warns.filter((w) => w.code === "representative_review").map((w) => w.words));
  ok("C9.5-7 pass (part 1): the IMM 5257 copy made on release 1 is never changed by the move (same checksum, still on release 1)", !!vSha && sql(`select sha256 || '|' || config_release_id from form_instance where id='${draft5257}'`) === `${vSha}|${r1}`);

  // ---------------------------------------------------------------- stage 2: work on release 2, then a later Sample release
  const i5476 = itemsOf(p, P.subject_id, "IMM 5476")[0];
  const scanStatus = await signByHand(fam, i5476?.id, "IMM 5476", P.subject_id); // C8.1, on release 2 (signed by hand and scanned)
  const scanSha = sql(`select sha256 from signed_scan where item_id='${i5476?.id}' order by uploaded_at desc limit 1`);
  const fillS = await generateCopy(fam, "IMM 5476", S.subject_id); // Fill on the new release (a draft on release 2)
  const cl = (await call("GET", `/runtime/cases/${fam}/checklist`, undefined, OFFICER)).body as { people: { subject: string; lines: { id: string; document: { key: string }; version: number; documents: { sha256: string }[]; reason: string }[] }[] };
  const marriage = cl?.people?.find((x) => x.subject === S.subject_id)?.lines.find((l) => l.document.key === "marriage_certificate_copy");
  const up = marriage ? await sendFile(`/runtime/checklist-lines/${marriage.id}/documents`, pdf("marriage certificate"), "marriage-certificate.pdf", OFFICER) : { status: 0, body: null };
  const upSha = up.body?.document?.sha256 ?? null;
  p = (await prepare(fam)).p;
  const filingOf = (who: { subject_id: string }) => p?.filings.find((x) => x.applicants.some((a) => a.subject === who.subject_id))?.id ?? "";
  const [fS, fC1] = [filingOf(S), filingOf(C1)];
  const reviews = [];
  for (const fl of [fS, fC1]) reviews.push((await call("POST", `/runtime/filings/${fl}/review`, { note: "Reviewed (Sample)", facts_hash: readinessOf((await prepare(fam)).p, fl)?.facts_hash }, f.rep ?? "")).status);
  ok("setup (stage 2): on release 2, Client A's IMM 5476 signed by hand and scanned (C8.1), the spouse's IMM 5476 filled again (a copy on release 2), the spouse's marriage certificate uploaded (C6.4), the spouse's and the young child's filings reviewed (C7.6)",
    scanStatus === 201 && !!scanSha && !!fillS && sql(`select config_release_id from form_instance where id='${fillS}'`) === r2 && up.status === 201 && !!upSha && reviews.every((s) => s < 300), { scanStatus, fillS, upload: up.status, reviews });
  // A one-person case on release 2 recorded as submitted (C8.2), for C9.5-10.
  const x = await openCase(vv, [{ role: "principal", name: "Sample Client R", dob: yearsAgo(41) }], { representative: f.rep, caseOfficers: [f.officer ?? OFFICER] });
  const xReady = await readyToFile(x.id, f.rep);
  const xp = (await prepare(x.id)).p;
  const rec = await call("PATCH", `/runtime/groups/${xp?.groups[0]?.id}/record`, { filings: [{ filing: xp?.filings[0]?.id, our_reference: "SAMPLE-C95", submitted_on: inDays(0), application_number: "V300000095", fee_receipt: "SAMPLE-RECEIPT" }], ucis: [{ subject: x.subjects["Sample Client R"], uci: "9595-9595" }], version: xp?.version }, f.officer ?? OFFICER);
  ok("setup (stage 2): a second case on release 2, Ready to file and recorded as submitted (C8.2)", xReady.length === 1 && rec.status < 300 && n(`select count(*) from filing_record where case_id='${x.id}'`) === 1, { ready: xReady.length, record: rec.status, words: words(rec) });
  const three = await sampleRelease(vv, { map: "IMM 5476", removeLine: "marriage_certificate_copy:couple_once", typeOf: { field: "organisation.name", to: "date" } });
  ok("setup (stage 2): a later Sample release made through the author's routes: IMM 5476's form fields filled differently, the marriage certificate line removed, the organisation's name now a date", !!three.version, three.steps);
  if (!three.version) return;

  // ---------------------------------------------------------------- C9.5-2 (to fill again), -8, -10, -11 on the later release
  v = await view(fam);
  const e3 = v?.effects;
  ok("C9.5-2 pass (later release): a draft of a form whose map changed is to fill again (the spouse's IMM 5476 made on release 2); Client A's signed IMM 5476 stays, marked out of date; the uploaded marriage certificate is no longer required; each non-empty",
    (e3?.fill_again ?? []).some((l) => l.id === fillS) && has(e3?.kept_out_of_date, /^IMM 5476 signed scan$/, P.label) && has(e3?.no_longer_required, /marriage certificate/i, S.label), e3 ? Object.fromEntries(Object.entries(e3).map(([k, y]) => [k, Array.isArray(y) ? y.map((l) => `${l.what}|${l.who}`) : y])) : null);
  const touchedIds = (v?.touched ?? []).map((t) => t.filing);
  const rd = (await prepare(fam)).p;
  ok("C9.5-8 pass (BR-8, challenge M6): only touched filings carry the release warning: the spouse's does, the young child's (no IMM 5476, no marriage certificate) does not; the spouse's review is listed as withdrawn, the child's is not",
    touchedIds.includes(fS) && !touchedIds.includes(fC1) && (readinessOf(rd, fS)?.warns ?? []).some((w) => w.code === "release_update") && !(readinessOf(rd, fC1)?.warns ?? []).some((w) => w.code === "release_update")
    && (e3?.withdrawn ?? []).some((l) => l.id === fS) && !(e3?.withdrawn ?? []).some((l) => l.id === fC1), { race: race.map((y) => y.status), touched: touchedIds, fS, fC1, withdrawn: e3?.withdrawn.map((l) => l.what), reviewed: [fS, fC1].map((fl) => !!(readinessOf(rd, fl) as { reviewed?: unknown } | null)?.reviewed) });
  const xv = (await ru(x.id)).body as View, xPins = pins(x.id);
  const xr = await move(x.id, { target_version: three.version, from_revision: 1, reason: "Adopting the current release" });
  ok("C9.5-10 fail: a case with a filing recorded as submitted cannot move: 409 naming the person and the release it stays on; nothing changed", xv?.refused?.code === "recorded" && xr.status === 409 && /recorded as submitted/.test(words(xr)) && /Sample Client R/.test(words(xr)) && pins(x.id) === xPins && xPins === 1, words(xr));
  const tm = await move(fam, { target_version: three.version, from_revision: 2, reason: "Adopting the current release" });
  ok("C9.5-11 fail: an answer that no longer fits its field's type refuses the move (409), naming the answer and the person; nothing changed", tm.status === 409 && tm.body?.code === "type_mismatch" && /organi[sz]ation/i.test(words(tm)) && [P, S].some((w) => words(tm).includes(`${w.label}'s answer`)) && pins(fam) === 2, words(tm));
  // The officer changes the two answers to a value that fits both releases (Sample), then moves.
  const fixed: number[] = [];
  for (const who of [P, S]) {
    const put = (actor: string, extra: Record<string, unknown> = {}) => call("PUT", `/runtime/cases/${fam}/answers/${who.subject_id}/organisation.name`, { value: "2015-01-01", expectedId: sql(`select id from client_canonical_answer where subject_id='${who.subject_id}' and canonical_field_key='organisation.name' and row_key is null and superseded_by_id is null`) || null, ...extra }, actor);
    let a = await put(who === P ? CLIENT : OFFICER, who === P ? {} : { onBehalfOf: who.subject_id, reason: "Entered from the person's signed form (Sample)" });
    if (a.status >= 300) a = await put(OFFICER);
    fixed.push(a.status);
  }
  const third = await move(fam, { target_version: three.version, from_revision: 2, reason: "Adopting the current release" });
  ok("setup (stage 2): with the answers changed, the case moves to the later release (revision 3)", third.status === 200 && third.body?.revision === 3, { status: third.status, fixed, words: words(third) || third.body?.words });

  // ---------------------------------------------------------------- C9.5-7, -8, -9, -12, -14 after the second move
  p = (await prepare(fam)).p;
  const signedRec = itemsOf(p, P.subject_id, "IMM 5476").find((i) => (i as { record?: string }).record === "signed_scan") as { state: string; reason?: string; changes?: unknown[] } | undefined;
  ok("C9.5-7 pass (BR-6, challenge M4): Client A's signed IMM 5476 is never changed (same checksum) and reads out of date because of the release, naming both releases, with no fact lines and no Undo; a new signed copy is asked for",
    !!scanSha && sql(`select sha256 from signed_scan where item_id='${i5476?.id}' order by uploaded_at desc limit 1`) === scanSha && signedRec?.state === "out_of_date" && /because of the release/.test(signedRec?.reason ?? "")
    && /Release \d+/.test(signedRec?.reason ?? "") && !(signedRec?.changes ?? []).length && itemsOf(p, P.subject_id, "IMM 5476").some((i) => i.state === "to_do"), signedRec);
  const [rS, rC1] = [readinessOf(p, fS), readinessOf(p, fC1)];
  ok("C9.5-8 pass (BR-6, challenge M5): after the move the spouse's review is withdrawn (the C7.6 line is back there), and the young child's filing, untouched, keeps its review with no pass and no release warning",
    !rS?.reviewed && (rS?.warns ?? []).some((w) => w.code === "representative_review") && !!(rC1 as { reviewed?: unknown } | null)?.reviewed && !(rC1?.warns ?? []).some((w) => ["representative_review", "release_update"].includes(w.code)) && !(rC1?.passed ?? []).some((w) => w.code === "representative_review"), { spouse: rS?.warns.map((w) => w.code), child: rC1?.warns.map((w) => w.code) });
  const cl2 = (await call("GET", `/runtime/cases/${fam}/checklist`, undefined, OFFICER)).body as typeof cl;
  const kept = cl2?.people?.find((y) => y.subject === S.subject_id)?.lines.find((l) => l.document.key === "marriage_certificate_copy");
  ok("C9.5-9 pass (BR-6): the removed document line reads \"No longer required\" on the spouse's list, its upload kept (same checksum)", !!kept && /No longer required/.test(kept.reason) && (kept.documents ?? []).some((d) => d.sha256 === upSha), kept ? { reason: kept.reason, docs: kept.documents.length } : null);
  const newest = (await ru(fam)).body as View, again = await move(fam, { target_version: three.version, from_revision: 3, reason: "Adopting the current release" });
  ok("C9.5-12 fail: on the newest release there is nothing to move to: no target (no notice), and a move is refused 409; nothing changed", newest?.target === null && again.status === 409 && again.body?.code === "newest" && pins(fam) === 3, { target: newest?.target, status: again.status });
  const audit = (sql(`select summary from audit_event where action='moved_release' and entity_key='${fam}' order by at`) ?? "").split("\n").filter(Boolean);
  ok("C9.5-14 pass: each move is one audit line (who, from and to, with the pin revisions; \"reason given\", the reason itself kept on the pin)", audit.length === 2 && audit.every((a) => /moved case .* from Release \d+ \(pin revision \d\) to Release \d+ \(pin revision \d\)/.test(a) && !/Adopting the current release/.test(a)), audit);
  ok("C9.5 (US$0): no model call at any step", n("select count(*) from ai_batch where mode = 'LIVE'") <= 0 && n("select count(*) from drafting_job where mode = 'LIVE'") <= 0);
});
