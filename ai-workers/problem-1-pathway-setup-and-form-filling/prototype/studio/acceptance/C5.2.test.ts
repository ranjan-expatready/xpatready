// C5.2 acceptance (qa/CAPABILITIES.md C5.2; QA-1 Critical, closed; BR-14): "The shared Release page cannot bypass
// submission or expert sign-off." The shared release (Review and release, POST /pack/release) and the combination's own
// release (POST /combinations/:id/approve) both refuse a draft that was not submitted, that changed after it was
// submitted, that was returned, or whose expert (SME duty) changes are not all signed; the shared draft says why the row is
// held back, in words; nothing is released and nobody is recorded as its submitter. Once submitted and signed, the shared
// release goes through, by a person other than the one who changed or submitted it (BR-14). Written 3 Nov (F6, P-290)
// from the row: until then C5.2 had only the qa check tests/qa/check_qa1_release_bypass.ts (7 checks, the suites'
// fixture). The source gate (P-279) is answered "None published" (test words) through the API before Submit, as the
// suites do. API only, rules only, no model call (US$0); every value is Sample.
// Runs on Visitor visa of the six after its release 1 (tests/runtime/setup_visitor_visa.ts): the shared Release page
// can only hold back a change to something already released or ready to release. Without that setup it stops with exit 2.
//   zsh studio/tools/isolated.sh accept 4475 start
//   tsx studio/tests/runtime/setup_visitor_visa.ts 4475 xr_studio_accept
//   tsx studio/acceptance/C5.2.test.ts 4475 xr_studio_accept
import { sourceEveryNumber } from "../tests/fixtures/source-every-number.cjs";
import { APPROVER, AUTHOR, REVIEWER, pack2, run } from "./lib/pack2.ts";

const T = pack2("C5.2");
const { call, sql, ok, words } = T;

run(async () => {
  await T.ready();
  const vv = T.combo(T.key("vv.single"));
  const releases = () => Number(sql(`select count(*) from config_release where combination_id='${vv}'`) || 0);
  if (!vv || releases() < 1) {
    console.error(`STOP  setup missing: Visitor visa has no release 1 yet. Run first: tsx studio/tests/runtime/setup_visitor_visa.ts ${T.PORT} ${T.DB}`);
    process.exit(2);
  }
  const r0 = releases();
  const newRelease = () => sql(`select coalesce(string_agg(version || ':' || coalesce(submitter_id, '-') || ':' || coalesce(approver_id, '-'), ','), '') from config_release where combination_id='${vv}' and version > ${r0}`);
  const row = async (actor = APPROVER) => ((await call("GET", "/draft", undefined, actor)).body?.rows ?? []).find((x: any) => x.combinationId === vv);
  const shared = async (actor = APPROVER) => {
    const d = (await call("GET", "/draft", undefined, actor)).body;
    return call("POST", "/pack/release", { expectedChanges: d?.changes ?? 0 }, actor);
  };

  // ---------------------------------------------------------------- a change that needs the expert's sign-off
  const types = ((await call("GET", "/library/document-types")).body ?? []) as any[];
  const have = new Set((((await call("GET", `/combinations/${vv}/config?mode=draft`)).body?.snapshot?.document_requirements ?? []) as any[]).map((q) => q.document_type_key));
  const type = types.find((t) => !have.has(t.documentTypeKey));
  let r = await call("POST", `/combinations/${vv}/requirements`, { documentTypeKey: type?.documentTypeKey, attachMode: "COMBINATION_MANDATORY", appliesToRoles: "principal_applicant" }, AUTHOR);
  ok("setup: the author adds a document requirement to Visitor visa's draft (a change that needs the SME duty)", r.status < 300, words(r) || type?.documentTypeKey);
  const sources = await sourceEveryNumber(T.PORT, vv, { actor: AUTHOR }); // P-279: the release's numbers need a source answer
  ok("setup (P-279): every number the draft publishes has a source answer", sources.held_back === 0, sources);

  // ---------------------------------------------------------------- 1. never submitted
  let held = await row();
  ok("C5.2 pass: the shared draft lists Visitor visa and holds it back, saying it is not submitted yet (in words)", !!held?.held && /submit/i.test(String(held?.why)), held?.why ?? held);
  r = await shared();
  ok("C5.2 fail: the shared release refuses a draft that was never submitted (409, in words)", r.status === 409 && words(r).length > 10, { status: r.status, detail: words(r).slice(0, 200) });
  r = await call("POST", `/combinations/${vv}/approve`, {}, APPROVER);
  ok("C5.2 fail: the combination's own release refuses it too (409, names the missing submission)", r.status === 409 && /submit/i.test(words(r)), words(r).slice(0, 200));
  ok("C5.2 data: no new release exists and nobody is recorded as its submitter", newRelease() === "" && releases() === r0, newRelease() || "none");

  // ---------------------------------------------------------------- 2. submitted, the expert's change not signed
  r = await call("POST", `/combinations/${vv}/submit`, { note: "C5.2 acceptance: a requirement added" }, AUTHOR);
  ok("setup: the author submits the combination for its one review", r.status < 300, words(r));
  const changes = ((await call("GET", `/combinations/${vv}/review`, undefined, REVIEWER)).body?.submission?.changeSummary ?? []) as any[];
  const sme = changes.filter((c) => c.needs_sme), plain = changes.filter((c) => !c.needs_sme);
  ok("setup: the submission holds at least one change that needs the SME duty", sme.length > 0, changes.map((c) => `${c.kind}|${c.key}|sme=${c.needs_sme}`).slice(0, 5));
  if (plain.length) {
    r = await call("POST", `/combinations/${vv}/signoff`, { items: plain.map((c) => `${c.kind}|${c.key}`), action: "signed" }, APPROVER); // the approver holds the review duty only
    ok("setup: the second person signs the changes that need only the review duty", r.status < 300, words(r));
  }
  held = await row();
  ok("C5.2 pass: submitted but unsigned, the row is still held back, saying the expert's sign-off is missing (in words)", !!held?.held && /sign|SME|expert/i.test(String(held?.why)), held?.why ?? held);
  r = await shared();
  ok("C5.2 fail: the shared release refuses a submitted draft whose expert changes are unsigned (409)", r.status === 409, { status: r.status, detail: words(r).slice(0, 200) });
  r = await call("POST", `/combinations/${vv}/approve`, {}, APPROVER);
  ok("C5.2 fail: the combination's own release refuses it too (409, names the sign-off)", r.status === 409 && /sign|SME|expert/i.test(words(r)), words(r).slice(0, 200));
  r = await call("POST", `/combinations/${vv}/signoff`, { items: sme.map((c) => `${c.kind}|${c.key}`), action: "signed" }, APPROVER);
  ok("C5.2 fail: a person without the SME duty cannot sign the expert's change (403)", r.status === 403, { status: r.status, detail: words(r) });
  r = await call("POST", `/combinations/${vv}/signoff`, { items: sme.map((c) => `${c.kind}|${c.key}`), action: "signed" }, AUTHOR);
  ok("C5.2 fail: the person who submitted cannot sign their own submission (403 or 400, in words)", r.status >= 400 && r.status < 500 && words(r).length > 10, { status: r.status, detail: words(r) });
  ok("C5.2 data: still no new release", newRelease() === "" && releases() === r0, newRelease() || "none");

  // ---------------------------------------------------------------- 3. changed after it was submitted (signed or not)
  r = await call("POST", `/combinations/${vv}/signoff`, { items: sme.map((c) => `${c.kind}|${c.key}`), action: "signed" }, REVIEWER);
  ok("setup: the content reviewer (SME duty) signs the expert's change", r.status < 300, words(r));
  const other = types.find((t) => !have.has(t.documentTypeKey) && t.documentTypeKey !== type?.documentTypeKey);
  r = await call("POST", `/combinations/${vv}/requirements`, { documentTypeKey: other?.documentTypeKey, attachMode: "COMBINATION_MANDATORY", appliesToRoles: "principal_applicant" }, AUTHOR);
  ok("setup: the author changes the draft again after it was submitted and signed", r.status < 300, words(r) || other?.documentTypeKey);
  await sourceEveryNumber(T.PORT, vv, { actor: AUTHOR });
  held = await row();
  ok("C5.2 pass: a draft changed after its submission is held back again, saying it changed (in words)", !!held?.held && /changed|since|submit/i.test(String(held?.why)), held?.why ?? held);
  r = await shared();
  ok("C5.2 fail: the shared release refuses a draft that changed after it was signed (409)", r.status === 409, { status: r.status, detail: words(r).slice(0, 200) });
  r = await call("POST", `/combinations/${vv}/approve`, {}, APPROVER);
  ok("C5.2 fail: the combination's own release refuses it too (409)", r.status === 409, words(r).slice(0, 200));
  ok("C5.2 data: still no new release", releases() === r0 && newRelease() === "", newRelease() || "none");

  // ---------------------------------------------------------------- 4. returned by the expert
  r = await call("POST", `/combinations/${vv}/submit`, { note: "C5.2 acceptance: resubmitted" }, AUTHOR);
  ok("setup: the author submits the new draft", r.status < 300, words(r));
  const changes2 = ((await call("GET", `/combinations/${vv}/review`, undefined, REVIEWER)).body?.submission?.changeSummary ?? []) as any[];
  const sme2 = changes2.filter((c) => c.needs_sme);
  r = await call("POST", `/combinations/${vv}/signoff`, { items: [`${sme2[0]?.kind}|${sme2[0]?.key}`], action: "returned", note: "C5.2 acceptance: returned to the author (Sample)" }, REVIEWER);
  ok("setup: the content reviewer returns one expert change to the author", r.status < 300, words(r));
  held = await row();
  ok("C5.2 pass: a returned submission is held back (in words)", !!held?.held && String(held?.why ?? "").length > 10, held?.why ?? held);
  r = await shared();
  ok("C5.2 fail: the shared release refuses a returned submission (409)", r.status === 409, { status: r.status, detail: words(r).slice(0, 200) });
  ok("C5.2 data: still no new release", newRelease() === "", newRelease() || "none");

  // ---------------------------------------------------------------- 5. submitted and every line signed: it goes through
  r = await call("POST", `/combinations/${vv}/submit`, { note: "C5.2 acceptance: corrected and resubmitted" }, AUTHOR);
  ok("setup: the author resubmits", r.status < 300, words(r));
  const changes3 = ((await call("GET", `/combinations/${vv}/review`, undefined, REVIEWER)).body?.submission?.changeSummary ?? []) as any[];
  for (const c of changes3) await call("POST", `/combinations/${vv}/signoff`, { items: [`${c.kind}|${c.key}`], action: "signed" }, REVIEWER); // the content reviewer holds both duties (review, sme)
  held = await row();
  ok("C5.2 pass: submitted and fully signed, the shared draft no longer holds the row back for the approver", !!held && !held.held, held?.why ?? held);
  r = await shared(AUTHOR);
  ok("C5.2 fail: the author (no approve duty) cannot release from the shared page (403)", r.status === 403, { status: r.status, detail: words(r) });
  const d = (await call("GET", "/draft", undefined, APPROVER)).body;
  r = await call("POST", "/pack/release", { expectedChanges: (d?.changes ?? 0) + 1 }, APPROVER);
  ok("C5.2 fail: a release from a stale page (the count of changes moved) is refused (409, in words)", r.status === 409 && /changed|changes/i.test(words(r)), words(r));
  r = await shared(APPROVER);
  ok("C5.2 pass: the approver releases it from the shared Release page", r.status < 300, { status: r.status, detail: words(r).slice(0, 200) });
  const rel = newRelease();
  ok("C5.2 data: one new release, recorded with the author as submitter and the approver as approver (BR-14)", rel.split(",").filter(Boolean).length === 1 && rel.endsWith(`:${AUTHOR}:${APPROVER}`), rel);
  held = await row();
  ok("C5.2 pass: after the release the row is no longer in the shared draft", !held, held ?? "gone");
  T.done();
});
