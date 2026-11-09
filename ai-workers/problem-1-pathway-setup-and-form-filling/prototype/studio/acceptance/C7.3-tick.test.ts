// C7.3 "Entered in the portal" per section, by the API (P-401: the per-screen tick moved here from C8.1, still required;
// QA-323: the sheet asked for a tick it had no control for). Next to C7.3.test.ts (steps 1-13, untouched), on a case of
// its own (one principal, Sample Client T). Rules, each with a pass and a fail:
//   R1 a tick saves who and when (the audit line too); only staff who prepare the filing tick (client, configuration
//      author 403);
//   R2 taking a tick off needs a reason; the tick is kept as history, the reason in the audit line and on the sheet;
//   R3 every write carries what was read: a changed section (version) or tick (entered_at) is a 409 in words, nothing
//      changed; there is no tick to take off a section not ticked;
//   R4 an answer changed after a tick clears it (the section is out of date and still to tick) and the sheet says why,
//      each answer then and now (stale, as C9.2 does for signed items);
//   R5 the item moves To do → Done when every section is ticked, and its words count what is still to tick
//      ("n of N sections still to tick"), the number the sheet itself gives.
// Which form is Online comes from row C1's expectedFor (the case's release), else the application form is filed Online on
// the case (C11.6), as C7.3.test.ts does: no form number written here (P-319). Synthetic data only; US$0.
//   zsh studio/tools/isolated.sh accept 4440 start
//   tsx studio/acceptance/C7.3-tick.test.ts 4440 xr_studio_accept
import { AUTHOR, CLIENT, OFFICER, answer, call, confirmAll, fillEverything, itemsOf, main, ok, prepare, sql } from "./lib/m3.ts";
import { onlineItemOf } from "./lib/c73.ts";

type Answer = { fact: string; subject: string; value: unknown; copy_text: string };
type Section = { key: string; title: string; version: string; entered: { at: string; by: string } | null; out_of_date: boolean; answers: Answer[]; waiting: unknown[]; changes?: { label: string; person: string; was: string | null; now: string | null }[]; unticked?: { at: string; by: string; reason: string } | null };
type Sheet = { sections: Section[] };

await main("C7.3", "\"Entered in the portal\" per section: tick, untick with a reason, stale, Done (API; US$0)", async () => {
  const got = await onlineItemOf("Sample Client T");
  if (!got) { console.log("STOP  setup: no Online form item for the principal (expectedFor, C11.6)"); process.exit(2); }
  const { caseId, subject: P, itemId, form } = got;
  console.log(`      set-up: ${form} is the principal's Online form`);
  await fillEverything(caseId);
  const read = async (actor = OFFICER) => { const r = await call("GET", `/runtime/items/${itemId}/answer-sheet`, undefined, actor); return { r, s: r.status === 200 ? (r.body as Sheet) : null }; };
  const tick = (key: string, body: unknown, actor = OFFICER) => call("POST", `/runtime/items/${itemId}/screens/${key}/entered`, body, actor);
  const untick = (key: string, body: unknown, actor = OFFICER) => call("POST", `/runtime/items/${itemId}/screens/${key}/unentered`, body, actor);
  const current = () => sql(`select count(*) from entered_section where item_id='${itemId}' and superseded_at is null`);
  const itemNow = async () => itemsOf((await prepare(caseId)).p, P, form)[0] as unknown as { state: string; reason?: string } | undefined;
  let { s } = await read();
  const first = s?.sections.find((x) => x.answers.length) ?? s?.sections[0];
  if (!s || !first) { console.log("STOP  setup: the answer sheet has no section"); process.exit(2); }
  const K = first.key;

  // R1: who may tick, and what a tick saves.
  const byAuthor = await tick(K, { version: first.version }, AUTHOR), byClient = await tick(K, { version: first.version }, CLIENT);
  ok("C7.3-20 fail (R1): a configuration author and a client cannot tick \"Entered in the portal\" (403 each), nothing saved", byAuthor.status === 403 && byClient.status === 403 && current() === "0", { author: byAuthor.status, client: byClient.status, rows: current() });
  const t = await tick(K, { version: first.version });
  ({ s } = await read());
  const audit = sql(`select summary from audit_event where action='entered' and entity='item' and entity_key='${itemId}' order by at desc limit 1`) ?? "";
  ok("C7.3-21 pass (R1): the case officer ticks a section; the sheet shows who and when, and the audit line names the section", t.status === 201 && s?.sections.find((x) => x.key === K)?.entered?.by === OFFICER && audit.includes(first.title) && /as entered in the portal/.test(audit), { status: t.status, entered: s?.sections.find((x) => x.key === K)?.entered, audit });

  // R3: a stale version is refused in words.
  const stale = await tick(s!.sections.find((x) => x.key !== K)?.key ?? K, { version: "not-the-version-read" });
  ok("C7.3-22 fail (R3): a tick sent with a version that is not the section's now is refused (409) in plain words, nothing saved", stale.status === 409 && /changed since you read the sheet/.test(stale.body?.detail ?? "") && current() === "1", { status: stale.status, detail: stale.body?.detail, rows: current() });

  // R2: taking the tick off needs a reason.
  const sec = () => s!.sections.find((x) => x.key === K)!;
  const noReason = await untick(K, { version: sec().version, entered_at: sec().entered?.at }), blank = await untick(K, { version: sec().version, entered_at: sec().entered?.at, reason: "   " });
  ok("C7.3-23 fail (R2): taking a tick off with no reason, or a blank one, is refused on the reason field (400), the tick kept", noReason.status === 400 && blank.status === 400 && [noReason, blank].every((r) => JSON.stringify(r.body).includes("Say why the tick comes off")) && current() === "1", { statuses: [noReason.status, blank.status], body: noReason.body?.errors, rows: current() });
  const authorOff = await untick(K, { version: sec().version, entered_at: sec().entered?.at, reason: "Typed by mistake" }, AUTHOR), clientOff = await untick(K, { version: sec().version, entered_at: sec().entered?.at, reason: "Typed by mistake" }, CLIENT);
  ok("C7.3-24 fail (R2): a configuration author and a client cannot take a tick off (403 each), the tick kept", authorOff.status === 403 && clientOff.status === 403 && current() === "1", { author: authorOff.status, client: clientOff.status });
  const staleOff = await untick(K, { version: sec().version, entered_at: "2000-01-01T00:00:00.000Z", reason: "Typed by mistake" });
  ok("C7.3-25 fail (R3): taking a tick off that changed since it was read (another tick) is refused (409) in plain words, the tick kept", staleOff.status === 409 && /ticked again since you read the sheet/.test(staleOff.body?.detail ?? "") && current() === "1", { status: staleOff.status, detail: staleOff.body?.detail });
  const REASON = "Not typed in the portal yet: ticked by mistake (Sample)";
  const off = await untick(K, { version: sec().version, entered_at: sec().entered?.at, reason: REASON });
  ({ s } = await read());
  const offAudit = sql(`select summary || chr(9) || (detail->>'reason') from audit_event where action='unentered' and entity_key='${itemId}' order by at desc limit 1`) ?? "";
  const history = sql(`select count(*) from entered_section where item_id='${itemId}' and section_key='${K}' and superseded_at is not null`);
  ok("C7.3-26 pass (R2): the officer takes the tick off with a reason; the section is not ticked, shows who took it off and why, the old tick is kept as history and the audit line holds the reason", off.status === 200 && !sec().entered && sec().unticked?.by === OFFICER && sec().unticked?.reason === REASON && offAudit.includes(first.title) && offAudit.endsWith(`\t${REASON}`) && history === "1" && current() === "0", { status: off.status, unticked: sec().unticked, audit: offAudit, history });
  const again = await untick(K, { version: sec().version, reason: REASON });
  ok("C7.3-27 fail (R3): there is no tick to take off a section not ticked (409, in words)", again.status === 409 && /is not ticked/.test(again.body?.detail ?? ""), { status: again.status, detail: again.body?.detail });

  // R5: To do until every section is ticked; the words count what is left, as the sheet does.
  for (const x of s!.sections.filter((y) => y.key !== K)) await tick(x.key, { version: x.version });
  ({ s } = await read());
  let it = await itemNow();
  const left = s!.sections.filter((x) => !x.entered || x.out_of_date).length, n = s!.sections.length;
  ok(`C7.3-28 fail (R5): with one section of ${n} not ticked, the item stays To do and its words say "1 of ${n} sections still to tick", the count the sheet gives`, it?.state === "to_do" && left === 1 && (it?.reason ?? "").includes(`1 of ${n} section${n === 1 ? "" : "s"} still to tick`) && (it?.reason ?? "").includes(first.title), { state: it?.state, reason: it?.reason, left });
  await tick(K, { version: sec().version });
  ({ s } = await read());
  it = await itemNow();
  ok("C7.3-29 pass (R5): once every section is ticked (every answer confirmed and current), the item reads Done", it?.state === "done" && s!.sections.every((x) => x.entered && !x.out_of_date), { state: it?.state, reason: it?.reason });

  // R4: a changed answer clears the tick and says why.
  const name = sec().answers.find((x) => x.fact === "person.family_name" && x.subject === P);
  ok("C7.3-30 fail (R4): a ticked section whose answers did not change is not out of date and lists no change", !sec().out_of_date && !(sec().changes ?? []).length && !!name, { out_of_date: sec().out_of_date, changes: sec().changes });
  await answer(caseId, P, "person.family_name", "SAMPLETK"); await confirmAll(caseId, P);
  ({ s } = await read());
  it = await itemNow();
  const ch = (sec().changes ?? []).find((x) => x.was === name?.copy_text && x.now === "SAMPLETK");
  ok("C7.3-31 pass (R4): a changed answer in a ticked section clears its tick: out of date, still to tick, the item no longer Done, and the sheet says which answer changed (was, now)", sec().out_of_date && !!ch && it?.state !== "done" && s!.sections.filter((x) => !x.entered || x.out_of_date).length === 1, { out_of_date: sec().out_of_date, changes: sec().changes, state: it?.state });
});
