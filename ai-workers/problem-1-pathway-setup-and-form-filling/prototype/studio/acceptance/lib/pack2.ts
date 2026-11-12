// Pack 2 helpers (P-220, Day 0: AI drafting, questionnaires and release). Shared by acceptance/C*.test.ts of this pack:
// the isolated copy check, the sample load, the combination ids and the review queue's items. US$0: AI steps are asked
// only in "replay" (saved real runs) or "rules" mode; a test never asks "live", and the copy is started without any
// STUDIO_*_LIVE switch. Every immigration value a test checks comes from an official file (cited in
// product/compliance-trace.md, Pack 2) or is labelled Sample.
// The sample is the six a person loads from the Demo menu; a 4th argument names another combination (a fixture key loads
// the suites' older fixture instead).
//   zsh studio/tools/isolated.sh accept 4440 start && tsx studio/acceptance/<id>.test.ts 4440 xr_studio_accept [combination key]
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { client, recorder, type Res } from "../../tests/runtime/api.ts";
import { OWN_YES_NO, OWN_YES_NO_NEAR } from "../../api/src/own-yes-no.ts"; // B52: the application form's Yes/No form fields, in its words
import { sourceEveryNumber } from "../../tests/fixtures/source-every-number.cjs"; // G1 (C5.4, P-279): a release needs every number sourced
import { FAMILY_FORM_BY_CHANNEL, FORM_SETUP } from "../../api/src/form-setup.ts"; // B71: the one table of IRCC's words per combination (P-319)

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

/** BK-16 (Hand-over 3 on #1632): a combination's entry in samples/conditional-filings.json, read as the configured
 *  checkpoint's step 085 reads it (that step imports the loader's Nest services, so it is read here, not imported). */
type ConditionalFiling = { role: string; addsFiling: Record<string, unknown>; fact: { fact: string; label: string; meaning: string; valueType: string; question: string; collectedFrom?: string; helpText?: string } };
export function conditionalFiling(combinationKey: string): ConditionalFiling | null {
  const all = JSON.parse(readFileSync(join(import.meta.dirname, "..", "..", "samples", "conditional-filings.json"), "utf8")) as Record<string, ConditionalFiling | string>;
  const spec = all[combinationKey];
  return spec && typeof spec === "object" ? spec : null;
}

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
  async function questionsBySteps(comboId: string, o: { place?: boolean; applyOnly?: boolean } = {}) {
    const out = { accepted: 0, applied: 0, ownYesNo: 0, byHand: 0, sections: 0, reused: 0, held: 0, approved: 0, placed: 0, refused: [] as string[], retried: [] as string[] };
    const ids = (q: string) => sql(q).split("\n").filter(Boolean);
    const say = (what: string, r: Res) => { if (r.status >= 300) out.refused.push(`${what}: ${r.status} ${words(r).slice(0, 160)}`); return r.status < 300; };
    // Review m6: only what the author's own steps put on To review, never another person's waiting change.
    const approveAll = async () => { for (const c of ids(`select id from library_change where status='WAITING' and proposed_by='${AUTHOR}' order by proposed_at`)) if (say("approve", await call("POST", `/library/changes/${c}/approve`, { note: "Approved by a test as the second person (QA-144 part 1 setup)." }, APPROVER))) out.approved++; };
    // B71 (P-319, AGENTS rule 4), as the configured checkpoint does: a form IRCC's own words name for the combination with
    // no line yet is added from the Form library first (the Forms tab's "Add a form from the Form library"), so the steps
    // below give it its file and map; its rule is set once the maps have put its fields in the library. The words come
    // from the one table of them per combination (api/src/form-setup.ts FORM_SETUP, the checkpoint's own).
    const setup = FORM_SETUP[sql(`select combination_key from combination where id = '${comboId}'`)];
    const newest = `f.version = (select max(v.version) from combination_form v where v.combination_id = f.combination_id and v.lineage_key = f.lineage_key)`;
    const lineForms = () => new Set(ids(`select g.form_key from combination_form f join gov_form_def g on g.id = f.gov_form_def_id where f.combination_id = '${comboId}' and ${newest} and f.status <> 'RETIRED'`));
    const filed = setup ? sql(`select f.channel from combination_form f join gov_form_def g on g.id = f.gov_form_def_id where f.combination_id = '${comboId}' and g.form_key = '${setup.application}' and ${newest} limit 1`) : "";
    // QA-144 slice 4: no family form by channel when the setup names its own among its rules (Express Entry's IMM 5406).
    const family = setup?.family ? FAMILY_FORM_BY_CHANNEL[filed === "ONLINE" ? "online" : "paper"] : null;
    if (setup) { const has = lineForms(); for (const form of [...setup.rules.filter((r) => !r.retire).map((r) => r.form), ...(family ? [family.form] : [])].filter((f) => !has.has(f))) say(`add ${form}`, await call("POST", `/combinations/${comboId}/forms`, { formKey: form }, AUTHOR)); }
    // B71: a form line of this combination whose form has no field map and no file here (IRM 0002 on Visitor visa of the six)
    // gets its official file through the form intake's sample door (the same intake an upload takes, as the configured
    // checkpoint does; no screen calls this door) and its saved field-map answer replayed (US$0); never a live run: with
    // no saved answer it is said and left.
    const manifest = JSON.parse(readFileSync(join(import.meta.dirname, "..", "..", "..", "..", "official-sources", "ircc", "manifest.json"), "utf8")).items as { file: string; edition?: string; path?: string }[];
    for (const ed of ids(`select distinct e.edition_label from combination_form f join gov_form_def g on g.id = f.gov_form_def_id join form_edition e on e.gov_form_def_id = g.id and e.channel = 'PDF' where f.combination_id = '${comboId}' and f.status <> 'RETIRED' and f.version = (select max(v.version) from combination_form v where v.combination_id = f.combination_id and v.lineage_key = f.lineage_key) and g.form_kind = 'data_form' and not exists (select 1 from form_field_map m join form_edition x on x.id = m.form_edition_id where x.gov_form_def_id = g.id) and not exists (select 1 from source_attachment a where a.combination_id = '${comboId}' and (a.edition = e.edition_label or a.edition like g.form_key || ' (%')) order by 1`)) {
      const item = manifest.find((i) => i.edition === ed && (i.path ?? "").startsWith("forms/"));
      if (!item) { out.refused.push(`attach ${ed}: no official file of that edition`); continue; }
      const up = await call("POST", `/combinations/${comboId}/attachments/sample`, { officialFile: item.file }, AUTHOR);
      const att = up.body?.attachmentId as string | undefined;
      if (!say(`attach ${item.file}`, up) || !att) continue;
      if (up.body?.attachmentStatus === "RECOGNISED") say(`read ${item.file}`, await call("POST", `/attachments/${att}/read`, {}, AUTHOR));
      const scope = { kind: "source", ids: [att] };
      const plan = await call("POST", "/ai/plan", { scope, mode: "REPLAY" }, AUTHOR);
      if (!(plan.body?.targets ?? []).some((t: { action: string }) => t.action === "reuse_saved_output")) { out.refused.push(`replay ${item.file}: no saved answer (nothing run)`); continue; }
      const run = await call("POST", "/ai/batches", { scope, mode: "REPLAY", idempotencyKey: `pack-b71-${att}`, planSha256: plan.body.plan_sha256 }, AUTHOR);
      if (!say(`replay ${item.file}`, run)) continue;
      const done = await until(async () => ["COMPLETED", "APPLIED", "FAILED"].includes(sql(`select status from drafting_job where attachment_id = '${att}' and kind = 'field_map' order by started_at desc limit 1`)), 180_000);
      if (!done) out.refused.push(`replay ${item.file}: not finished in 180 s`);
    }
    // B74: the first map applied decides the library's fields and labels, and a saved AI answer replays only on the exact
    // question list, so maps started in the same millisecond take a fixed order (a form before its schedule, by file name).
    for (const j of ids(`select j.id from drafting_job j join source_attachment a on a.id=j.attachment_id where j.combination_id='${comboId}' and j.kind='field_map' and j.status='COMPLETED' order by j.started_at, a.file_name desc`)) {
      await call("POST", `/jobs/${j}/recompare`, {}, AUTHOR); // a draft compared with an older library is compared again first (refused when it is current)
      for (const it of ids(`select id from proposal_item where run_id='${j}' and status='waiting' order by identity_key`)) if (say("accept", await call("POST", `/jobs/${j}/items/${it}`, { decision: "ACCEPTED", note: "Accepted by a test as the saved AI answer proposed it (QA-144 part 1 setup)." }, AUTHOR))) out.accepted++;
      // A busy machine can still run past the apply's room (503, nothing written): pressed again once.
      let applied = await call("POST", `/jobs/${j}/apply`, {}, AUTHOR);
      if (applied.status >= 500) { out.retried.push(j); applied = await call("POST", `/jobs/${j}/apply`, {}, AUTHOR); }
      if (say("apply", applied)) out.applied++;
    }
    if (o.applyOnly) { await approveAll(); return out; } // B83: a walk asks the Yes/No form fields on the screen next, then calls this again
    // B52: on To review › Form fields the author asks the application form's Yes/No form fields worked out from other
    // answers as their own questions, in the form's words (api/src/own-yes-no.ts), the library's field of the same
    // name when it has one.
    const own = OWN_YES_NO[sql(`select combination_key from combination where id='${comboId}'`)];
    const ed = own?.boxes.length ? sql(`select e.id from form_edition e join gov_form_def d on d.id=e.gov_form_def_id where d.form_key='${own.application}' and e.channel='PDF' order by e.edition_label desc limit 1`) : "";
    const asked = new Set<string>(ed ? ((await call("GET", `/editions/${ed}/form-fields/own-questions`, undefined, AUTHOR)).body?.fields ?? []).filter((f: { asked: boolean }) => f.asked).map((f: { dataPath: string }) => f.dataPath) : []);
    // B116 (#1123, option (a)): a box the table asks on the configured checkpoint only is not asked on the six.
    for (const y of (own?.boxes ?? []).filter((x) => ed && !asked.has(x.dataPath) && !x.checkpointOnly)) {
      const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, "");
      const same = sql("select canonical_field_key || '|' || coalesce(label, '') from canonical_field where value_type = 'yes_no' and group_key = 'person' and status in ('DRAFT', 'PUBLISHED')").split("\n").map((l) => l.split("|")).find(([, l]) => l && norm(l) === norm(y.label))?.[0];
      if (say(`ask "${y.label}" as its own question`, await call("POST", `/editions/${ed}/form-fields/own-question`, { dataPath: y.dataPath, reason: "Asked as its own question by a test, in the form's words (B52 setup)", ...(same ? { field: same } : { label: y.label, meaning: y.meaning, nearReason: OWN_YES_NO_NEAR }) }, AUTHOR))) out.ownYesNo++;
    }
    // BK-16 (Hand-over 3 on #1632), as the configured checkpoint's step 085 does (api/src/features/checkpoint/
    // 085-conditional-filings.ts): the combination's samples/conditional-filings.json entry. The author saves the line's
    // rule on "Who can be in this application", adds the fact it reads (C3.6) for that rule, accepts it and a second person
    // approves it, before the form rules below read the fact; it is asked per person once the sections are placed (below).
    const filing = conditionalFiling(sql(`select combination_key from combination where id = '${comboId}'`));
    if (filing) {
      const before = JSON.parse(sql(`select participants::text from combination where id = '${comboId}'`) || "[]") as { role: string }[];
      const f = filing.fact;
      if (!before.some((l) => l.role === filing.role)) out.refused.push(`conditional filing: no "${filing.role}" line in Who can be in this application`);
      else if (say(`the filing the ${filing.role} line adds`, await call("PATCH", `/combinations/${comboId}/people`, { version: Number(sql(`select participants_version from combination where id = '${comboId}'`)), participants: before.map((l) => (l.role === filing.role ? { ...l, addsFiling: filing.addsFiling } : l)), confirmRemove: true }, AUTHOR))
        && sql(`select count(*) from canonical_field where canonical_field_key = '${f.fact}' and status in ('DRAFT', 'PUBLISHED')`) === "0") {
        const added = await call("POST", `/combinations/${comboId}/rule-facts`, { fact: f.fact, rule: `adds_filing.${filing.role}`, label: f.label, meaning: f.meaning, valueType: f.valueType }, AUTHOR);
        if (say(`rule fact ${f.fact}`, added) && added.body?.proposalId) say("accept the rule fact", await call("POST", "/review/proposals/decide", { ids: [added.body.proposalId], action: "accept", reason: "Accepted by a test: the fact a filing a line adds reads (samples/conditional-filings.json; Sample, Unconfirmed: expert; M3-S2)." }, AUTHOR));
        await approveAll();
      }
    }
    // B71 (P-319, AGENTS rule 4): with the maps applied, the author sets each form line as IRCC's own words set it, on the
    // Forms tab's own routes: a rule in words becomes its rule; the family information form follows how the application
    // form is filed and the other one is taken off; a fact only a rule reads is added for its rule (C3.6) and approved by a
    // second person. Sample, "Unconfirmed: expert".
    if (setup) {
      const set = async (form: string, body: object) => say(`set ${form}`, await call("PATCH", `/combinations/${comboId}/forms/${encodeURIComponent(form)}`, body, AUTHOR));
      for (const r of setup.rules) {
        if (!(await set(r.form, r.retire ? { retire: true } : r.condition ? { attachMode: "ANSWER_CONDITIONAL", condition: r.condition, minAge: r.minAge, ...(r.who ? { who: r.who } : {}) } : { attachMode: "COMBINATION_MANDATORY", minAge: r.minAge, ...(r.who ? { who: r.who } : {}) }))) continue;
        // C6.11 (review round 3 m1): a conditional line keeps its minimum age too, as the checkpoint loader does (IMM 5476: a
        // child from 18, VV-R10).
        // B79b: a form IRCC's words say is filled in its portal is set Online on the Forms tab's channel route.
        if (r.channel) say(`channel ${r.form}`, await call("PATCH", `/combinations/${comboId}/forms/${encodeURIComponent(r.form)}/channel`, { channel: r.channel }, AUTHOR));
      }
      if (family) { await set(family.form, { attachMode: "COMBINATION_MANDATORY", minAge: 18 }); if (lineForms().has(family.other)) await set(family.other, { retire: true }); }
      // QA-227: each fact only a rule reads (IRM 0002's, IMM 5476's, …); one another combination added already is read as it is.
      for (const rf of setup.ruleFacts ?? []) {
        if (sql(`select count(*) from canonical_field where canonical_field_key = '${rf.fact}' and status in ('DRAFT', 'PUBLISHED')`) !== "0") continue;
        const added = await call("POST", `/combinations/${comboId}/rule-facts`, { fact: rf.fact, rule: rf.rule, label: rf.label, meaning: rf.meaning, valueType: rf.valueType }, AUTHOR);
        if (say(`rule fact ${rf.fact}`, added) && added.body?.proposalId) say("accept the rule fact", await call("POST", "/review/proposals/decide", { ids: [added.body.proposalId], action: "accept", reason: `Accepted by a test: the fact ${rf.rule}'s rule reads (${rf.cite}; Sample).` }, AUTHOR));
        await approveAll();
      }
    }
    // P-214 (tech lead on #883): a form field the saved AI answer left with no decision is filled by hand, decided by the
    // author on the Form library's field map (its own route), as the configured checkpoint's loader does (demo.ts,
    // BY_HAND_REASON); never "not a fact", so an applicant's answer is never dropped. Only PDF editions of this
    // combination's own forms; without it the validator refuses Submit (IMM 5707, IMM 5409 on Visitor visa of the six).
    for (const [ed, path] of ids(`select e.id || E'\\t' || m.data_path from form_field_map m join form_edition e on e.id = m.form_edition_id where m.outcome = 'unresolved' and m.status = 'DRAFT' and e.channel = 'PDF' and e.gov_form_def_id in (select gov_form_def_id from combination_form where combination_id = '${comboId}' and status <> 'RETIRED') order by e.id, m.data_path`).map((x) => x.split("\t")))
      if (say("decide a form field by hand", await call("POST", `/editions/${ed}/form-fields/decision`, { dataPath: path, decision: "by_hand", reason: "Not proposed by the saved AI answer, so a test marks it filled by hand on the PDF until a person maps it (QA-144 part 1 setup; Sample)." }, AUTHOR))) out.byHand++;
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
    // B71: a fact only a rule reads is asked beside the fact it is about (as the checkpoint asks IRM 0002's).
    for (const rf of FORM_SETUP[sql(`select combination_key from combination where id = '${comboId}'`)]?.ruleFacts ?? []) {
      // QA-227: a fact another combination asked already keeps its one placement (the library's questions are shared).
      if (sql(`select count(*) from section_question where canonical_field_key = '${rf.fact}' and status <> 'RETIRED'`) !== "0") continue;
      const at = rf.beside ?? ["person.sex", "person.gender", "person.date_of_birth"]; // as the checkpoint (demo.ts) places it
      const sec = at.map((k) => sql(`select section_key from section_question where canonical_field_key = '${k}' order by version desc limit 1`)).find(Boolean);
      if (sec) say(`place ${rf.fact}`, await call("POST", `/library/fields/${encodeURIComponent(rf.fact)}/placement`, { sectionKey: sec, collectedFrom: "client_questionnaire", repeats: rf.fact.startsWith("case.") ? "once_per_case" : "per_person", tier: "case" }, AUTHOR));
      else out.refused.push(`${rf.fact}: none of ${at.join(", ")} is asked in a section`);
    }
    // BK-16, as step 085: the conditional filing's fact is asked once per person, by whom the data names, in a section
    // this combination asks and no other does (QA-227), rule only (asked of each person the rule decides).
    const cf = filing?.fact;
    if (cf && sql(`select count(*) from canonical_field where canonical_field_key = '${cf.fact}' and status in ('DRAFT', 'PUBLISHED')`) !== "0" && sql(`select count(*) from section_question where canonical_field_key = '${cf.fact}' and status <> 'RETIRED'`) === "0") {
      const own = sql(`select s.section_key from sqr_section_selection s where s.combination_id = '${comboId}' and not exists (select 1 from sqr_section_selection o where o.combination_id <> '${comboId}' and o.section_key = s.section_key) order by s.section_order limit 1`);
      if (own) say(`place ${cf.fact}`, await call("POST", `/library/fields/${encodeURIComponent(cf.fact)}/placement`, { sectionKey: own, collectedFrom: cf.collectedFrom ?? "staff_working_view", repeats: "per_person", tier: "case", questionText: cf.question, ...(cf.helpText ? { helpText: cf.helpText } : {}), ruleOnly: true }, AUTHOR));
      else out.refused.push(`${cf.fact}: no section is asked by this combination alone`);
    }
    await approveAll();
    return out;
  }
  /** C4.5 (P-322): a combination of the six gets its document lines the way people give them, US$0: on the Documents
   *  tab the author drafts each document checklist from its saved reading (Saved, never Live), accepts its Ready lines
   *  and new document types on To review, and a second person approves the new library items. Lines for a person to
   *  decide (visa office words) stay waiting, and the facts only they read (B82). Then the Smart questionnaire tab's step
   *  asks the facts the kept lines' conditions read, so those lines can reach a person. Test setup only; the product never calls it. */
  async function documentsBySteps(comboId: string) {
    const out = { drafted: 0, accepted: 0, approved: 0, refused: [] as string[] };
    const ids = (q: string) => sql(q).split("\n").filter(Boolean);
    const say = (what: string, r: Res) => { if (r.status >= 300) out.refused.push(`${what}: ${r.status} ${words(r).slice(0, 160)}`); return r.status < 300; };
    for (const a of ids(`select id from source_attachment where combination_id='${comboId}' and kind='Document checklist' order by created_at`)) if (say("draft the checklist", await call("POST", `/attachments/${a}/draft-checklist`, { mode: "replay" }, AUTHOR))) out.drafted++;
    // The library's new document types first (a line lands only on a type the library holds), the facts the lines'
    // conditions read (B82, QA-233: release refuses a line whose fact the library lacks), then the lines.
    for (const kind of ["document_type", "field", "requirement_line"]) {
      const ready = ids(`select p.id from proposal_item p join drafting_job j on j.id=p.run_id where j.combination_id='${comboId}' and j.kind='checklist_draft' and p.kind='${kind}' and p.status='waiting' order by p.created_at, p.identity_key`);
      const v = await queued(comboId), lib = (await call("GET", "/review/proposals")).body?.groups ?? [];
      const bands = new Map<string, string>(v.map((x: any) => [x.id, x.band]));
      for (const g of lib as any[]) { const b = (await call("GET", `/review/proposals?group=${encodeURIComponent(g.id)}`)).body?.group?.bands ?? {}; for (const x of [...(b.ready ?? []), ...(b.check ?? []), ...(b.decide ?? [])]) bands.set(x.id, x.band); }
      for (const p of ready.filter((x) => bands.get(x) !== "decide")) if (say(`accept a ${kind}`, await call("POST", "/review/proposals/decide", { ids: [p], action: "accept", reason: "Accepted by a test as the saved reading proposed it (C4.5 setup)." }, AUTHOR))) out.accepted++;
    }
    for (const c of ids(`select id from library_change where status='WAITING' and proposed_by='${AUTHOR}' order by proposed_at`)) if (say("approve", await call("POST", `/library/changes/${c}/approve`, { note: "Approved by a test as the second person (C4.5 setup)." }, APPROVER))) out.approved++;
    say("ask the facts the lines' conditions read", await call("POST", `/combinations/${comboId}/place-from-form-parts`, {}, AUTHOR));
    return out;
  }
  /** C4.5 (P-322, P-319): the facts each document type of a combination's checklist supplies, as a person sets them in
   *  the library, US$0: the author proposes each type's facts from samples/document-supplies.json (each with its
   *  official words) and a second person approves it on To review. Only types this combination's checklist names. */
  async function suppliesBySteps(comboId: string) {
    const out = { proposed: 0, approved: 0, refused: [] as string[] };
    const sample = JSON.parse(readFileSync(join(import.meta.dirname, "..", "..", "samples", "document-supplies.json"), "utf8")) as { document_types: { documentType: string; reason: string; facts: unknown[] }[] };
    const named = new Set(sql(`select distinct document_type_key from document_requirement where combination_id='${comboId}' and status <> 'RETIRED'`).split("\n").filter(Boolean));
    for (const t of sample.document_types.filter((x) => named.has(x.documentType))) {
      const r = await call("POST", `/library/document-types/${encodeURIComponent(t.documentType)}/supplies`, { facts: t.facts, reason: t.reason }, AUTHOR);
      if (r.status >= 300) { out.refused.push(`propose ${t.documentType}: ${r.status} ${words(r).slice(0, 160)}`); continue; }
      out.proposed++;
      const a = await call("POST", `/library/changes/${r.body?.id ?? sql(`select id from library_change where kind='document_supplies' and key='${t.documentType}' and status='WAITING'`)}/approve`, { note: "Approved by a test as the second person (C4.5 setup)." }, APPROVER);
      if (a.status < 300) out.approved++; else out.refused.push(`approve ${t.documentType}: ${a.status} ${words(a).slice(0, 160)}`);
    }
    return out;
  }
  /** B72 (P-340, P-318 (6), C3.6): on the six a combination has no rule until a person adds one. The author adds each
   *  Sample rule of studio/samples/sample-rules.json for this combination through the author's own route, once (not when
   *  the draft has a rule already). Test setup only, labelled as the sample loader's words. Returns how many it added. */
  async function ruleBySteps(comboId: string) {
    const key = sql(`select combination_key from combination where id='${comboId}'`);
    if (sql(`select count(*) from predicate where combination_id='${comboId}' and status <> 'RETIRED'`) !== "0") return 0;
    const rules = (JSON.parse(readFileSync(join(import.meta.dirname, "..", "..", "samples", "sample-rules.json"), "utf8")) as { rules: { combination: string; condition: unknown; whenPlain: string; thenPlain: string; forWhom: string; sourceQuote: string }[] }).rules.filter((r) => r.combination === key);
    let added = 0;
    for (const r of rules) {
      const x = await call("POST", `/combinations/${comboId}/rules`, { condition: r.condition, whenPlain: r.whenPlain, thenPlain: r.thenPlain, forWhom: r.forWhom, sourceQuote: r.sourceQuote }, AUTHOR);
      if (x.status < 300) added++; else console.log(`SETUP the Sample rule "${r.thenPlain.slice(0, 60)}" was refused: ${x.status} ${words(x).slice(0, 200)}`);
    }
    console.log(`SETUP ${added} Sample rule(s) added by the author's route (samples/sample-rules.json)`);
    return added;
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
  return { PORT, DB, call, sql, until, ok, wait, words, ready, needQuestions, questionsBySteps, ruleBySteps, documentsBySteps, suppliesBySteps, key, combo, attachment, queued, people, spent, sourceGate, done };
}

/** Runs a test body, turning an unexpected throw into a failure (exit 1) rather than a pass. */
export const run = (body: () => Promise<void>) => body().catch((e) => { console.error("FAIL  unexpected", e); process.exit(1); });
