// C6.15 Document substitute sets (row B137; requirement row B3; SA-1B-19, SA-1B-20; P-406). In the library a document
// type holds named sets, "any one of" (member 1 the standard, the others alternatives in order, each with "when
// acceptable" words) or "all of"; the first set is "Standard". A combination's line picks its set (none: Standard); on a
// case any member of that set meets the line: any one of, one member's file; all of, every member's. Visitor visa's
// "Proof of financial support" on the configured checkpoint. The sets, their members and their words are Sample
// (Unconfirmed: expert; AGENTS rule 4): they show the mechanism, not what IRCC accepts. No AI (US$0).
// Needs first (else it stops with exit 2, "Setup missing"): Demo › Load the configured checkpoint on a fresh copy, or
//   zsh studio/tools/isolated.sh accept 4440 start
//   tsx studio/tests/runtime/setup_visitor_visa.ts 4440 xr_studio_accept
//   tsx studio/acceptance/lib/setup_vv_m3.ts 4440 xr_studio_accept      (exits 1 on its own known gaps; fine)
//   tsx studio/acceptance/C6.15.test.ts 4440 xr_studio_accept
import { APPROVER, AUTHOR, CLIENT, REVIEWER, call, main, needVisitorVisa, ok, openCase, OFFICER, run, sendFile, sql, yearsAgo } from "./lib/m3.ts";

const FUNDS = "proof_of_financial_support";
const LETTER = `Letter of support from a host in Canada (Sample ${run})`, HOST_BANK = `Host's bank statements (Sample ${run})`;
type Member = { key: string; name: string; standard: boolean; when_client: string | null };
type Line = { id: string; label: string; state: string; version: number; document: { key: string }; set: { name: string; mode: string; members: Member[]; words: string } | null;
  set_status: { met: boolean; words: string; missing: { name: string }[] } | null; documents: { id: string; current: boolean; member?: { key: string; name: string } }[] };
type Checklist = { people: { subject: string; lines: Line[] }[] };
const pdf = (what: string) => Buffer.from(`%PDF-1.4\n% SYNTHETIC SPECIMEN: ${what} (Sample)\n%%EOF\n`, "latin1");
const words = (r: { body: any }) => String(r.body?.detail ?? r.body?.message ?? JSON.stringify(r.body ?? "")).slice(0, 220); // eslint-disable-line @typescript-eslint/no-explicit-any -- responses read loosely

/** A new library document type through the product's own path (C3.6): named while adding a line, accepted by a second
 *  person on To review › Proposals, then its library ADD by a second person. No line is kept. Returns the type's key. */
async function newType(vv: string, name: string): Promise<string | null> {
  const r = await call("POST", `/combinations/${vv}/requirements`, { documentTypeName: name, proves: `Sample for C6.15 (${name})`, appliesToRoles: "each_applicant", attachMode: "COMBINATION_MANDATORY" }, AUTHOR);
  if (r.status !== 202 || !r.body?.proposalId) return null;
  const d = await call("POST", "/review/proposals/decide", { ids: [r.body.proposalId], action: "accept" }, REVIEWER);
  if (d.status >= 300) return null;
  const key = sql(`select document_type_key from document_type where name = '${name.replace(/'/g, "''")}' order by version desc limit 1`) || null;
  // The new type is a library ADD that a second person approves on To review before a release may use it.
  const add = sql(`select id from library_change where kind = 'document_type' and key = '${key}' and status = 'WAITING' limit 1`);
  if (add && (await call("POST", `/library/changes/${add}/approve`, { note: "C6.15 pack: second person (new type)." }, APPROVER)).status >= 300) return null;
  return key;
}
/** Submit, the expert's sign-off and approval: the combination's next release. Returns its version or the refusal. */
async function release(vv: string, note: string): Promise<{ version: number | null; why: string }> {
  const s = await call("POST", `/combinations/${vv}/submit`, { note }, AUTHOR);
  if (s.status >= 300) return { version: null, why: ((s.body?.errors ?? []) as { message?: string }[]).map((e) => e.message).join(" | ").slice(0, 400) || words(s) };
  const sub = (await call("GET", `/combinations/${vv}/review`, undefined, REVIEWER)).body?.submission;
  await call("POST", `/combinations/${vv}/signoff`, { items: (sub?.changeSummary ?? sub?.change_summary ?? []).filter((x: { needs_sme?: boolean }) => x.needs_sme !== false).map((x: { kind: string; key: string }) => `${x.kind}|${x.key}`), action: "signed" }, REVIEWER);
  const a = await call("POST", `/combinations/${vv}/approve`, undefined, APPROVER);
  return a.status < 300 ? { version: Number(a.body?.version ?? 0) || null, why: "" } : { version: null, why: words(a) };
}

await main("C6.15", "Document substitute sets: any one of / all of; the combination picks its set; any valid member meets the line", async () => {
  const vv = needVisitorVisa();
  const line = sql(`select lineage_key from document_requirement where combination_id = '${vv}' and document_type_key = '${FUNDS}' and status <> 'RETIRED' order by version desc limit 1`);
  if (!line) { console.log("Setup missing: Visitor visa has no Proof of financial support line (load the configured checkpoint)."); process.exit(2); }
  const letter = await newType(vv, LETTER), hostBank = await newType(vv, HOST_BANK);
  ok("C6.15-0 setup: two new library document types through the product's own path (named, then accepted by a second person)", !!letter && !!hostBank, { letter, hostBank });
  if (!letter || !hostBank) return;
  const WHEN = "Someone in Canada pays for your stay and writes to say so (Sample).";
  const STAFF = "A host in Canada covers the stay (Sample).";
  const standard = { name: "Standard", mode: "any_one", members: [{ key: FUNDS }, { key: letter, whenClient: WHEN, whenStaff: STAFF }] };
  const sponsored = { name: "Sponsor-funded", mode: "all_together", members: [{ key: letter }, { key: hostBank }] };

  // SA-1B-19 rule 6: the publish checks refuse, with the member named.
  let r = await call("POST", `/library/document-types/${FUNDS}/sets`, { sets: [{ ...standard, members: [{ key: FUNDS }, { key: letter }] }], reason: "C6.15 pack: an alternative without words." }, AUTHOR);
  ok("C6.15-1 fail (SA-1B-19 r3, r6): an alternative with no client wording is refused, naming it", r.status === 400 && words(r).includes(`Add the client wording for ${LETTER}.`), words(r));
  r = await call("POST", `/library/document-types/${FUNDS}/sets`, { sets: [sponsored], reason: "C6.15 pack: first set not Standard." }, AUTHOR);
  ok("C6.15-2 fail (SA-1B-19 r1): the first set must be named Standard", r.status === 400 && /first set is named "Standard"/.test(words(r)), words(r));
  r = await call("POST", `/library/document-types/${FUNDS}/sets`, { sets: [standard, { ...sponsored, members: [{ key: letter, whenClient: WHEN }, { key: hostBank }] }], reason: "C6.15 pack: words in an all-of set." }, AUTHOR);
  ok("C6.15-3 fail (SA-1B-152 r2): an \"All of\" set has no alternatives, so no \"when acceptable\" words", r.status === 400 && /every member is needed/.test(words(r)), words(r));
  r = await call("POST", `/library/document-types/${FUNDS}/sets`, { sets: [standard, sponsored], reason: "C6.15 pack: the examples of SA-1B-20 rule 5 (Sample)." }, CLIENT);
  ok("C6.15-4 fail: someone without the author duty cannot propose sets", r.status === 403, r.status);

  // Proposed, then approved by a second person (never the proposer), then released with the next release.
  r = await call("POST", `/library/document-types/${FUNDS}/sets`, { sets: [standard, sponsored], reason: "C6.15 pack: the examples of SA-1B-20 rule 5 (Sample)." }, AUTHOR);
  const id = r.body?.id;
  ok("C6.15-5 pass (SA-1B-19 r1-r3): the author proposes \"Standard\" (any one of: the proof, or the host's letter when acceptable) and \"Sponsor-funded\" (all of: the letter and the host's statements); it waits", r.status < 300 && sql(`select status from library_change where id = '${id}'`) === "WAITING", r.status >= 300 ? words(r) : r.body?.label);
  const seen = (await call("GET", `/library/changes/${id}`, undefined, APPROVER)).body;
  ok("C6.15-5b pass (break F2, F4): the second person reads staff's words too, and the change's heading says what it does in words", seen?.sets?.after?.[0]?.members?.[1]?.when_staff === STAFF && seen?.action_word === "Change" && seen?.kind_word === "a document's substitute sets", { staff: seen?.sets?.after?.[0]?.members?.[1]?.when_staff, action: seen?.action_word });
  r = await call("POST", `/library/changes/${id}/approve`, { note: "C6.15 pack: the proposer approves." }, AUTHOR);
  ok("C6.15-6 fail: the proposer cannot approve their own change", r.status === 403, r.status);
  r = await call("POST", `/library/changes/${id}/approve`, { note: "C6.15 pack: second person." }, APPROVER);
  const draft = sql(`select status || '|' || coalesce(jsonb_array_length(sets)::text, '0') from document_type where document_type_key = '${FUNDS}' order by version desc limit 1`);
  ok("C6.15-7 pass: at approval the type's draft carries both sets", r.status < 300 && draft === "DRAFT|2", { status: r.status, draft, why: r.status >= 300 ? words(r) : undefined });
  const lib = (await call("GET", `/library/document-types/${FUNDS}/sets`, undefined, AUTHOR)).body;
  ok("C6.15-8 pass: the library shows the sets with members named, the standard first, the alternative's words", lib?.sets?.[0]?.members?.[0]?.standard === true && lib.sets[0].members[1]?.name === LETTER && lib.sets[0].members[1].when_client === WHEN && lib.sets[1]?.mode_words === "All of", lib?.sets);

  // SA-1B-20: the line picks a set; a name the type lacks is refused.
  r = await call("PUT", `/combinations/${vv}/requirements/${encodeURIComponent(line)}/set`, { setName: "Sponsor funded, typo" }, AUTHOR);
  ok("C6.15-9 fail (SA-1B-20 r3): a line cannot pick a set its type does not have; the refusal lists its sets", r.status === 400 && /has no set named "Sponsor funded, typo"/.test(words(r)) && words(r).includes("Sponsor-funded"), words(r));
  const one = await release(vv, "C6.15 pack: substitute sets (Standard)");
  ok("C6.15-10 pass: the next release goes out with the sets", !!one.version, one);
  if (!one.version) return;
  const rel = JSON.parse(sql(`select snapshot::text from config_release where combination_id = '${vv}' and version = ${one.version}`) || "{}");
  const relType = (rel.document_types ?? []).find((t: { key: string }) => t.key === FUNDS);
  ok("C6.15-11 pass: the release carries the type's sets with members named, and the change is released", relType?.sets?.length === 2 && relType.sets[1].members.map((m: { name: string }) => m.name).join("|") === `${LETTER}|${HOST_BANK}` && sql(`select status from library_change where id = '${id}'`) === "RELEASED", relType?.sets);

  // On a case: no pick → Standard, any one of; the alternative alone meets the line.
  const c = await openCase(vv, [{ role: "principal", name: "Sample Client A", dob: yearsAgo(40) }]);
  const P = c.subjects["Sample Client A"];
  const get = async (caseId: string, subject: string) => ((await call("GET", `/runtime/cases/${caseId}/checklist`, undefined, c.officer)).body as Checklist)?.people?.find((p) => p.subject === subject)?.lines.find((l) => l.document.key === FUNDS);
  let l = await get(c.id, P);
  ok("C6.15-12 pass (SA-1B-20 r1, SA-1B-19 r2): with no pick the line uses Standard: any one of, the proof first as the standard, then the letter with its words", l?.set?.name === "Standard" && l.set.mode === "any_one" && l.set.members[0]?.standard && l.set.members[1]?.name === LETTER && l.set.members[1].when_client === WHEN && /^Any one of: /.test(l.set.words), l?.set);
  r = await sendFile(`/runtime/checklist-lines/${l?.id}/documents`, pdf("a stranger's letter"), "x.pdf", c.officer);
  const fdOther = new FormData(); fdOther.append("member", hostBank); fdOther.append("file", new Blob([new Uint8Array(pdf("host statements"))]), "host.pdf");
  const other = await fetch(`http://127.0.0.1:${process.argv[2] ?? 4440}/api/runtime/checklist-lines/${l?.id}/documents`, { method: "POST", headers: { "x-actor": c.officer }, body: fdOther }).then(async (x) => ({ status: x.status, body: await x.json().catch(() => null) }));
  ok("C6.15-13 fail: a file as a document outside the line's set is refused, naming the set's members; nothing is stored", other.status === 400 && words(other).includes(LETTER) && !sql(`select id from case_document where subject_id = '${P}' and document_type = '${hostBank}'`), { status: other.status, why: words(other) });
  const up = async (lineId: string | undefined, member: string, what: string) => {
    const fd = new FormData(); fd.append("member", member); fd.append("file", new Blob([new Uint8Array(pdf(what))]), `${what}.pdf`);
    return fetch(`http://127.0.0.1:${process.argv[2] ?? 4440}/api/runtime/checklist-lines/${lineId}/documents`, { method: "POST", headers: { "x-actor": c.officer }, body: fd }).then(async (x) => ({ status: x.status, body: await x.json().catch(() => null) }));
  };
  // The upload without "member" is the line's own type (a member of Standard): received at once.
  l = await get(c.id, P);
  ok("C6.15-14 pass: a file sent without saying which is the line's own type, the standard: the line is Received", r.status < 300 && l?.state === "received" && l.set_status?.met === true, { status: r.status, state: l?.state, why: r.status >= 300 ? words(r) : undefined });
  const c2 = await openCase(vv, [{ role: "principal", name: "Sample Client B", dob: yearsAgo(35) }]);
  const P2 = c2.subjects["Sample Client B"];
  l = await get(c2.id, P2);
  r = await up(l?.id, letter, "host letter");
  l = await get(c2.id, P2);
  ok("C6.15-15 pass (SA-1B-19 r1): any one of: the alternative alone (the host's letter) meets the line; the file is named as that member", r.status < 300 && l?.state === "received" && l.set_status?.met === true && l.documents.some((d) => d.current && d.member?.name === LETTER), { state: l?.state, status: l?.set_status, docs: l?.documents.map((d) => d.member) });

  // The combination picks "Sponsor-funded" (all of): one member is not enough; both are.
  const rev = sql(`select to_char(updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') from document_requirement where combination_id = '${vv}' and lineage_key = '${line}' order by version desc limit 1`);
  r = await call("PUT", `/combinations/${vv}/requirements/${encodeURIComponent(line)}/set`, { setName: "Sponsor-funded", baseRevision: rev }, OFFICER);
  ok("C6.15-16 fail: a case officer cannot change the set a line picks (the author's duty)", r.status === 403, r.status);
  r = await call("PUT", `/combinations/${vv}/requirements/${encodeURIComponent(line)}/set`, { setName: "Sponsor-funded", baseRevision: rev }, AUTHOR);
  ok("C6.15-17 pass (SA-1B-20 r1): the author makes Visitor visa's line pick \"Sponsor-funded\" on the draft", r.status < 300 && r.body?.set_name === "Sponsor-funded", r.status >= 300 ? words(r) : r.body);
  const two = await release(vv, "C6.15 pack: the line picks Sponsor-funded");
  ok("C6.15-18 pass: the next release goes out with the line's pick", !!two.version && two.version > one.version, two);
  if (!two.version) return;
  l = await get(c2.id, P2);
  ok("C6.15-19 pass (SA-1B-20 r4): a case pinned to the earlier release keeps its set (Standard)", l?.set?.name === "Standard", l?.set?.name);
  const c3 = await openCase(vv, [{ role: "principal", name: "Sample Client C", dob: yearsAgo(45) }]);
  const P3 = c3.subjects["Sample Client C"];
  l = await get(c3.id, P3);
  ok("C6.15-20 pass (SA-1B-19 r1): a new case uses \"Sponsor-funded\": all of the letter and the host's statements", l?.set?.name === "Sponsor-funded" && l.set.mode === "all_together" && l.set.members.length === 2 && /^All of: /.test(l.set.words) && l.state === "not_requested", l?.set);
  r = await up(l?.id, letter, "host letter");
  l = await get(c3.id, P3);
  ok("C6.15-21 fail (SA-1B-19 r1): all of: one member alone does not meet the line; it stays Requested and says what is still to come", r.status < 300 && l?.state === "requested" && l.set_status?.met === false && l.set_status.missing.map((m) => m.name).join() === HOST_BANK && l.set_status.words.includes(`still to come: ${HOST_BANK}`), { state: l?.state, status: l?.set_status });
  const ready = (await call("GET", `/runtime/cases/${c3.id}/prepare`, undefined, c3.officer)).body;
  const missing = JSON.stringify(ready?.readiness ?? []);
  ok("C6.15-22 fail: Ready to file still names the line as not received", /financial support[^"]*not received/i.test(missing), missing.slice(0, 200));
  r = await up(l?.id, hostBank, "host statements");
  l = await get(c3.id, P3);
  ok("C6.15-23 pass (SA-1B-19 r1): with every member's file the line is Received", r.status < 300 && l?.state === "received" && l.set_status?.met === true && l.documents.filter((d) => d.current).length === 2, { state: l?.state, status: l?.set_status });
  // Break F3: a set member is used by every line naming its type, so the library says so (it is not retired unseen).
  const used = (await call("GET", `/library/document-types/${hostBank}/uses`, undefined, AUTHOR)).body;
  ok("C6.15-25 pass (break F3): the member's uses name Visitor visa (it is used through the set)", JSON.stringify(used ?? {}).includes(vv) || /Visitor visa/.test(JSON.stringify(used ?? {})), JSON.stringify(used).slice(0, 200));
  // Break F1: a file of a type that is its own line and a member of the set counts on both lines.
  const PASSPORT = sql(`select document_type_key from document_requirement where combination_id = '${vv}' and document_type_key like 'passport%' and status <> 'RETIRED' order by version desc limit 1`);
  r = await call("POST", `/library/document-types/${FUNDS}/sets`, { sets: [standard, { ...sponsored, members: [...sponsored.members, { key: PASSPORT }] }], reason: "C6.15 pack: the passport too (break F1, Sample)." }, AUTHOR);
  const id3 = r.body?.id;
  r = id3 ? await call("POST", `/library/changes/${id3}/approve`, { note: "C6.15 pack: second person." }, APPROVER) : r;
  const three = await release(vv, "C6.15 pack: Sponsor-funded with the passport");
  const c4 = await openCase(vv, [{ role: "principal", name: "Sample Client D", dob: yearsAgo(50) }]);
  const P4 = c4.subjects["Sample Client D"];
  const passLine = async () => ((await call("GET", `/runtime/cases/${c4.id}/checklist`, undefined, c4.officer)).body as Checklist)?.people?.find((p) => p.subject === P4)?.lines.find((x) => x.document.key === PASSPORT);
  l = await get(c4.id, P4);
  await up(l?.id, letter, "host letter"); await up(l?.id, hostBank, "host statements");
  const pl = await passLine();
  const fd = new FormData(); fd.append("file", new Blob([new Uint8Array(pdf("passport"))]), "passport.pdf");
  r = await fetch(`http://127.0.0.1:${process.argv[2] ?? 4440}/api/runtime/checklist-lines/${pl?.id}/documents`, { method: "POST", headers: { "x-actor": c.officer }, body: fd }).then(async (x) => ({ status: x.status, body: await x.json().catch(() => null) }));
  l = await get(c4.id, P4);
  ok("C6.15-26 pass (break F1): the passport sent on its own line also completes the all-of line: it says all received and is Received (never \"all received\" while Requested)", !!three.version && r.status < 300 && l?.set_status?.met === true && l.state === "received", { release: three, status: r.status, state: l?.state, set: l?.set_status });
  const audit = sql(`select summary from audit_event where entity = 'case document' and summary like '%${HOST_BANK.replace(/'/g, "''")}%' order by at desc limit 1`) ?? "";
  ok("C6.15-24 pass: the upload's history line names the member and the line it counts for", audit.includes(`in the set for`), audit);
});
