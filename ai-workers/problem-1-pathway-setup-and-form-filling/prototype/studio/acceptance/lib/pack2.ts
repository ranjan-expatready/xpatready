// Pack 2 helpers (P-220, Day 0: AI drafting, questionnaires and release). Shared by acceptance/C*.test.ts of this pack:
// the isolated copy check, the sample load, the combination ids and the review queue's items. US$0: AI steps are asked
// only in "replay" (saved real runs) or "rules" mode; a test never asks "live", and the copy is started without any
// STUDIO_*_LIVE switch. Every immigration value a test checks comes from an official file (cited in
// product/compliance-trace.md, Pack 2) or is labelled Sample.
// The sample is the six a person loads from the Demo menu; a 4th argument names another combination (a fixture key loads
// the suites' older fixture instead).
//   zsh studio/tools/isolated.sh accept 4440 start && tsx studio/acceptance/<id>.test.ts 4440 xr_studio_accept [combination key]
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { client, recorder, type Res } from "../../tests/runtime/api.ts";
import { sourceEveryNumber } from "../../tests/fixtures/source-every-number.cjs"; // G1 (C5.4, P-279): a release needs every number sourced

export const AUTHOR = "user-A", APPROVER = "user-B", REVIEWER = "user-C";
/** The official checklist and instructions the Visitor visa sample carries (official-sources/ircc, committed, P-83). */
export const VV_CHECKLIST = "imm5484e.pdf"; // Document checklist for a temporary resident visa, IMM 5484 (05-2026)

/** Visitor visa's people for these tests (Sample counts): the principal, a spouse or partner and children who each
 *  apply on their own forms (G5256: "Family members must complete their own application forms"), and a representative
 *  who never applies. */
export const VV_PEOPLE = [
  { role: "principal", min: 1, max: 1, applies: true },
  { role: "spouse_or_partner", min: 0, max: 1, applies: true },
  { role: "child", min: 0, max: 4, applies: true },
  { role: "representative", min: 0, max: 1, applies: false },
];

export function pack2(id: string) {
  const PORT = Number(process.argv[2] ?? 4440), DB = process.argv[3] ?? "xr_studio_accept";
  const { call, sql, until } = client(PORT, DB);
  const { ok, log, summary } = recorder();
  const words = (r: Res) => String(r.body?.detail ?? r.body?.message ?? r.body?.title ?? "");
  /** The combination a test runs on: its default, or the 4th argument. */
  const key = (fallback: string) => process.argv[4] ?? fallback;
  /** Keys of the suites' older fixture (no body on /demo/load). A person never sees it; a test uses it only when it is
   *  named as the 4th argument, as a stand-in while the six have no questions or releases yet. */
  const FIXTURE = new Set(["wp.family", "fs.outside", "sv.super_visa", "sp.student"]);
  /** Stops with exit 2 when the server on PORT is not using DB, then loads the sample a person loads from the Demo menu
   *  (the six, `{sample:"six"}`, samples/wave1.json) — or the suites' fixture when a fixture key is named. */
  async function ready() {
    const served = (await call("GET", "/session")).body?.workspace?.id;
    const inDb = (() => { try { return sql(`select id from workspace where id='${served}'`); } catch { return ""; } })();
    if (!served || !inDb) { console.error(`STOP  the database ${DB} is not the one the server on port ${PORT} uses. Pass the copy's database: tsx <test> ${PORT} xr_studio_<name>.`); process.exit(2); }
    if (!(await call("GET", "/demo/status")).body?.loaded) {
      const l = await call("POST", "/demo/load", FIXTURE.has(process.argv[4] ?? "") ? {} : { sample: "six" }, AUTHOR);
      if (l.status >= 300) { console.error("STOP  the sample did not load", l.body); process.exit(2); }
    }
  }
  /** Exit 2 ("setup missing", not a failure) when the combination has no questions yet: on the six that needs J3 / C4.11
   *  first (its field maps accepted). Says how to run it meanwhile on the suites' fixture. */
  async function needQuestions(comboId: string, fallback = "wp.family") {
    const asked = async () => ((await call("GET", `/combinations/${comboId}/workspace?tab=questionnaires`)).body?.questionnaire?.roles ?? []).some((r: any) => r.questions > 0);
    if (await asked()) return;
    // QA-144 part 1 (P-322): on the six the questions come from people's own steps, done here through the API as the
    // screens do them, never written directly.
    const steps = await questionsBySteps(comboId);
    console.log(`SETUP questions through the people's steps: ${JSON.stringify(steps).slice(0, 400)}`);
    if (await asked()) return;
    console.error(`STOP  setup missing: this combination has no questions yet, even after its forms' steps (${JSON.stringify(steps).slice(0, 300)}). Meanwhile: tsx <test> ${PORT} ${DB} ${fallback} on a fresh copy.`);
    process.exit(2);
  }
  /** QA-144 part 1 (P-318 (6), P-322): a combination of the six gets its questions the way people give them, each step
   *  through the screen's own API, US$0: on the Forms tab the author accepts each saved field-map proposal and applies
   *  the draft; the approver (a second person) approves the new library items; the author drafts sections from each
   *  form's own parts (rules) and accepts them one at a time on To review (a section the library holds already is
   *  rejected and reused, as its card says); the approver approves them; then the Smart questionnaire tab's "Ask them
   *  in their form's sections". Test setup only, labelled as the sample loader's words; the product never calls it. */
  async function questionsBySteps(comboId: string, o: { place?: boolean } = {}) {
    const out = { accepted: 0, applied: 0, sections: 0, reused: 0, held: 0, approved: 0, placed: 0, refused: [] as string[], retried: [] as string[] };
    const ids = (q: string) => sql(q).split("\n").filter(Boolean);
    const say = (what: string, r: Res) => { if (r.status >= 300) out.refused.push(`${what}: ${r.status} ${words(r).slice(0, 160)}`); return r.status < 300; };
    // Review m6: only what the author's own steps put on To review, never another person's waiting change.
    const approveAll = async () => { for (const c of ids(`select id from library_change where status='WAITING' and proposed_by='${AUTHOR}' order by proposed_at`)) if (say("approve", await call("POST", `/library/changes/${c}/approve`, { note: "Approved by a test as the second person (QA-144 part 1 setup)." }, APPROVER))) out.approved++; };
    for (const j of ids(`select id from drafting_job where combination_id='${comboId}' and kind='field_map' and status='COMPLETED' order by started_at`)) {
      await call("POST", `/jobs/${j}/recompare`, {}, AUTHOR); // a draft compared with an older library is compared again first (refused when it is current)
      for (const it of ids(`select id from proposal_item where run_id='${j}' and status='waiting' order by identity_key`)) if (say("accept", await call("POST", `/jobs/${j}/items/${it}`, { decision: "ACCEPTED", note: "Accepted by a test as the saved AI answer proposed it (QA-144 part 1 setup)." }, AUTHOR))) out.accepted++;
      // A busy machine can still run past the apply's room (503, nothing written): pressed again once.
      let applied = await call("POST", `/jobs/${j}/apply`, {}, AUTHOR);
      if (applied.status >= 500) { out.retried.push(j); applied = await call("POST", `/jobs/${j}/apply`, {}, AUTHOR); }
      if (say("apply", applied)) out.applied++;
    }
    await approveAll();
    for (const a of ids(`select id from source_attachment where combination_id='${comboId}' and kind='Form' order by created_at`)) say("sections from the form's parts", await call("POST", `/attachments/${a}/draft-masters`, { mode: "rules" }, AUTHOR));
    for (const p of ids(`select p.id from proposal_item p join drafting_job j on j.id=p.run_id where j.combination_id='${comboId}' and j.kind='masters_edition' and p.kind='section' and p.status='waiting' order by p.created_at, p.identity_key`)) {
      // QA-206 (tech lead on #883), as the configured checkpoint's loader does: a section held for a name is named only by the
      // heading its form prints over it (the naming edit a person uses); with none it stays waiting for a person.
      const held = JSON.parse(sql(`select coalesce(work, '{}'::jsonb)::text from proposal_item where id = '${p}'`) || "{}") as { unnamed?: boolean; heading?: string };
      if (held.unnamed && !held.heading) { out.held++; continue; }
      const payload = held.unnamed ? JSON.parse(sql(`select payload::text from proposal_item where id = '${p}'`)) : null;
      const r = await call("POST", "/review/proposals/decide", held.unnamed
        ? { ids: [p], action: "edit", payload: { ...payload, label: held.heading }, reason: `Named by a test from the heading the form prints over it, "${held.heading}" (QA-144 part 1 setup).` }
        : { ids: [p], action: "accept", reason: "Accepted by a test: drafted from the form's own parts (rules, US$0; QA-144 part 1 setup)." }, AUTHOR);
      if (r.status < 300) { out.sections++; continue; }
      const same = /already in the library as (\S+?)[ )]/.exec(words(r))?.[1];
      if (same && say("reject a section held already", await call("POST", "/review/proposals/decide", { ids: [p], action: "reject", reason: `The library already holds this section (${same}): reused, not added again.` }, AUTHOR))) out.reused++;
      else say("accept a section", r);
    }
    await approveAll();
    if (o.place === false) return out; // the walk presses the Smart questionnaire tab's step itself
    const placed = await call("POST", `/combinations/${comboId}/place-from-form-parts`, {}, AUTHOR);
    if (say("place", placed)) out.placed = placed.body?.placed?.length ?? 0;
    await approveAll();
    return out;
  }
  const combo = (key: string) => sql(`select id from combination where combination_key='${key}'`);
  const attachment = (comboId: string, file: string) => sql(`select id from source_attachment where combination_id='${comboId}' and lower(file_name) like lower('%${file}') order by created_at limit 1`);
  /** Every waiting proposal of a combination's own group in the one review queue (all three bands). */
  async function queued(comboId: string) {
    const v = await call("GET", `/review/proposals?group=${encodeURIComponent(`combination:${comboId}`)}`);
    if (v.status !== 200) return [] as any[];
    const b = v.body?.group?.bands ?? {};
    return [...(b.ready ?? []), ...(b.check ?? []), ...(b.decide ?? [])] as any[];
  }
  /** Sets "Who can be in this application" through the Questionnaires tab's route (counts Sample; IMM 5257 is completed
   *  by each person applying, G5256, trace IRCC-P2-02 and P2-03). Returns the save's response. */
  async function people(comboId: string, participants = VV_PEOPLE) {
    const v = (await call("GET", `/combinations/${comboId}/workspace?tab=questionnaires`)).body?.people?.version ?? 0;
    return call("PATCH", `/combinations/${comboId}/people`, { version: v, participants, confirmRemove: true }, AUTHOR);
  }
  /** The spend ledger's total before and after: a pack-2 test must never spend (US$0). */
  const spent = () => Number(sql("select coalesce(sum(cost_usd),0) from drafting_job") || 0);
  /** A check that waits on an input another lane records (e.g. a Saved AI result, P-227): printed as WAIT with what it
   *  waits on, never counted as passed. With no failure, done() then exits 2 ("setup missing"), as needQuestions does. */
  const waits: { name: string; on: string }[] = [];
  const wait = (name: string, on: string) => { waits.push({ name, on }); console.log(`WAIT  ${name} — waits on ${on}`); };
  /** P-279 (the G1 source gate, C5.4, P-240): Submit and release are refused while a number the draft publishes (a
   *  cut-off or in-force date counts) has no source entry or "None published". Before a pack submits, it checks that
   *  refusal in words when numbers are held back, then answers each one through the API as the author would on the
   *  Source panel: "None published", test words, never a real source (tests/fixtures/source-every-number.cjs, as the
   *  suites do). Outside the demo workspace a Sample entry does not pass (P-279), so none is written. */
  async function sourceGate(comboId: string) {
    const held = Number((await call("GET", `/combinations/${comboId}/sources`)).body?.counts?.held_back ?? 0);
    if (held > 0) {
      const r = await call("POST", `/combinations/${comboId}/submit`, { note: `${id}: before its sources (P-279)` }, AUTHOR);
      ok(`${id} fail (P-279): Submit is refused while ${held} number${held === 1 ? " has" : "s have"} no source entry, in words`, r.status >= 400 && /no source entry/.test(words(r)), r.status < 300 ? r.status : words(r).slice(0, 160));
    } else console.log(`NOTE  ${id}: the source gate holds back no number on this combination (the P-279 refusal is not exercised here)`);
    const s = await sourceEveryNumber(PORT, comboId, { actor: AUTHOR });
    ok("setup (P-279): every number the draft publishes has a source answer before Submit", s.held_back === 0, s);
  }
  function done() {
    const out = join(import.meta.dirname, "..", "..", "var", "acceptance"); mkdirSync(out, { recursive: true });
    const fail = log.filter((x) => !x.ok).length;
    writeFileSync(join(out, `${id}.json`), JSON.stringify({ at: new Date().toISOString(), pass: log.length - fail, fail, waits, log }, null, 1));
    summary();
    if (waits.length) console.log(`${waits.length} waiting (not passed): ${waits.map((w) => w.on).filter((x, i, a) => a.indexOf(x) === i).join("; ")}`);
    process.exit(fail ? 1 : waits.length ? 2 : 0);
  }
  return { PORT, DB, call, sql, until, ok, wait, words, ready, needQuestions, questionsBySteps, key, combo, attachment, queued, people, spent, sourceGate, done };
}

/** Runs a test body, turning an unexpected throw into a failure (exit 1) rather than a pass. */
export const run = (body: () => Promise<void>) => body().catch((e) => { console.error("FAIL  unexpected", e); process.exit(1); });
