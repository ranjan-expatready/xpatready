// qa's own probe of C6.5's tick rule (L-SA9, P-243) on main 967388518, 9 Nov. Written by qa from P-243 and #1374's description, not from the builder's check.
// Passport by rules only, no model call, US$0. No priced button, no live read. Args: <port> <db>
const L = await import(process.env.LIB!);
const F = await import(process.env.LIB!.replace("m3.ts", "fixtures.ts"));
const { call, sql, ok, main, OFFICER, FAMILY, FIXED, PORT } = L;
type P = { id: string; fact: string; value: unknown; review?: string; source?: { document?: string } };
const IDENTITY = ["person.date_of_birth", "person.passport_number", "person.passport_expiry_date"];
await main("C6.5 ticks (qa)", "Confirm & use refuses until each value needing a look is ticked", async () => {
  const vv = L.needVisitorVisa();
  const c = await L.openCase(vv, FAMILY);
  const A = c.subjects["Sample Client A"], S = c.subjects["Sample Spouse A"];
  const spend0 = sql("select count(*) from ai_batch");
  const v = await L.agent(c.id);
  const section = v?.sections?.find((s: { subjectId: string; questions: { fact: string }[] }) => s.subjectId === A && s.questions.some((q) => q.fact === "person.passport_number"))?.section;
  const lineOf = async (who: string) => ((await call("GET", `/runtime/cases/${c.id}/checklist`, undefined, OFFICER)).body?.people?.find((x: { subject: string }) => x.subject === who)?.lines ?? []).find((x: { label: string }) => /passport/i.test(x.label))?.id;
  const base = { nationality: "IND", sex: "X" as const, expiry: FIXED.expiry };
  const up = async (who: string, doc: Record<string, unknown>, bad: boolean, name: string) => F.upload(PORT, `/runtime/checklist-lines/${await lineOf(who)}/documents`, F.passportPdf(doc, bad), name, OFFICER);
  const read = async (who: string) => { await call("POST", `/runtime/cases/${c.id}/sections/${section}/fill-from-documents`, { subjectId: who }, OFFICER); return ((await call("GET", `/runtime/cases/${c.id}/proposals?subject=${who}`, undefined, OFFICER)).body?.proposals ?? []) as P[]; };
  const confirm = (doc: string, who: string, checked?: unknown) => call("POST", `/runtime/cases/${c.id}/documents/${doc}/confirm-and-use`, checked === undefined ? { subjectId: who } : { subjectId: who, checked }, OFFICER);
  const answers = (who: string) => sql(`select count(*) from client_canonical_answer where subject_id='${who}' and superseded_by_id is null and source_json->>'channel'='document_read'`);
  const locked = (doc: string) => sql(`select count(*) from document_review where document_id='${doc}' and confirmed_by is not null`);
  const missing = (r: { body?: { missing?: { fact: string }[] } }) => (r.body?.missing ?? []).map((x) => x.fact).sort();

  // Client A: a good passport. Number, date of birth and expiry collapsed; the rest expanded.
  const ua = await up(A, { surname: "SAMPLED", given: "CLIENT A", number: "SAMPLEP12", dob: FAMILY[0].dob!, ...base }, false, "qa-passport-a.pdf");
  const docA = ua.body?.document?.id as string;
  const pa = (await read(A)).filter((x) => x.source?.document === docA);
  // Run 1 expected every expanded value to need a tick. The server's own rule (needsLook) leaves out values it cannot write: the coded line's country codes are "choose the country by hand".
  const HAND = ["person.citizenship", "person.passport_country_of_issue"];
  const expA = pa.filter((x) => x.review === "expanded" && !HAND.includes(x.fact)), colA = pa.filter((x) => x.review === "collapsed");
  console.log("A " + JSON.stringify(pa.map((x) => [x.fact, x.review, x.value])));
  ok("a good passport: number, date of birth and expiry are collapsed, every other value expanded", JSON.stringify(colA.map((x) => x.fact).sort()) === JSON.stringify([...IDENTITY].sort()) && expA.length === 3 && HAND.every((f) => pa.find((x) => x.fact === f)?.review === "expanded"), pa.map((x) => [x.fact, x.review]));

  let r = await confirm(docA, A);
  console.log("no ticks " + r.status + " " + JSON.stringify(r.body));
  ok("no ticks at all: refused 422 not_checked, naming each expanded value", r.status === 422 && /not_checked/.test(JSON.stringify(r.body)) && JSON.stringify(missing(r)) === JSON.stringify(expA.map((x) => x.fact).sort()), { status: r.status, missing: missing(r) });
  ok("no ticks at all: nothing written and the document stays open for review", answers(A) === "0" && locked(docA) === "0", { answers: answers(A), locked: locked(docA) });
  ok("no ticks at all: the message is in plain words and says nothing was written", /Nothing was written/.test(String(r.body?.detail)) && !/person\./.test(String(r.body?.detail)), r.body?.detail);

  r = await confirm(docA, A, [expA[0].id]);
  console.log("one tick " + r.status + " " + JSON.stringify(r.body?.missing));
  ok("one tick of several: still refused, and the ticked value is not named", r.status === 422 && !missing(r).includes(expA[0].fact) && missing(r).length === expA.length - 1, { status: r.status, missing: missing(r) });
  ok("one tick of several: nothing written", answers(A) === "0" && locked(docA) === "0");

  r = await confirm(docA, A, colA.map((x) => x.id));
  console.log("collapsed only " + r.status + " " + JSON.stringify(r.body?.missing));
  ok("ticking only the collapsed values does not stand in for the expanded ones", r.status === 422 && missing(r).length === expA.length, { status: r.status, missing: missing(r) });

  r = await confirm(docA, A, [...expA.map((x) => x.id), "00000000-0000-4000-8000-000000000001"]);
  console.log("unknown id " + r.status + " " + JSON.stringify(r.body));
  ok("a tick naming an unknown value: refused, nothing written", r.status === 422 && /not_this_document/.test(JSON.stringify(r.body)) && answers(A) === "0" && locked(docA) === "0", { status: r.status });

  r = await confirm(docA, A, "everything");
  console.log("not a list " + r.status);
  ok("a tick list that is not a list: refused as bad input (400), nothing written", r.status === 400 && answers(A) === "0", r.status);

  // The spouse: a bad check digit. Nothing may be collapsed, so date of birth and expiry need ticks too.
  const us = await up(S, { surname: "SAMPLES", given: "SPOUSE A", number: "SAMPLES34", dob: FAMILY[1].dob!, ...base }, true, "qa-passport-s.pdf");
  const docS = us.body?.document?.id as string;
  const ps = (await read(S)).filter((x) => x.source?.document === docS);
  console.log("S " + JSON.stringify(ps.map((x) => [x.fact, x.review, x.value])));
  ok("a failed check digit: no value is collapsed", ps.length > 0 && ps.every((x) => x.review === "expanded"), ps.map((x) => [x.fact, x.review]));
  r = await confirm(docA, A, [...expA.map((x) => x.id), ps[0].id]);
  ok("a tick naming another person's value: refused, nothing written", r.status === 422 && /not_this_document/.test(JSON.stringify(r.body)) && answers(A) === "0", { status: r.status, body: r.body });
  const noDates = ps.filter((x) => !["person.date_of_birth", "person.passport_expiry_date"].includes(x.fact));
  r = await confirm(docS, S, noDates.map((x) => x.id));
  console.log("spouse no dates " + r.status + " " + JSON.stringify(r.body?.missing));
  ok("a failed check digit: date of birth and expiry must be ticked as well", r.status === 422 && JSON.stringify(missing(r)) === JSON.stringify(["person.date_of_birth", "person.passport_expiry_date"]), { status: r.status, missing: missing(r) });

  // Now done properly: expanded ticks only, collapsed values go through untouched.
  r = await confirm(docA, A, expA.map((x) => x.id));
  console.log("every expanded " + r.status + " " + JSON.stringify(r.body));
  ok("every expanded value ticked: accepted, collapsed values need no tick", r.status === 200 && IDENTITY.every((f) => [...(r.body?.used ?? []), ...(r.body?.agreed ?? [])].includes(f)) && HAND.every((f) => (r.body?.left ?? []).some((x: { fact: string }) => x.fact === f)), { status: r.status, used: r.body?.used });
  const row = sql(`select status || '|' || coalesce(verified_by,'') from client_canonical_answer where subject_id='${A}' and canonical_field_key='person.passport_number' and superseded_by_id is null`);
  ok("the value is written Verified, by the officer, from the document", row === `VERIFIED|${OFFICER}`, row);
  r = await confirm(docA, A, expA.map((x) => x.id));
  ok("a second Confirm & use on the same document: refused 409 already_confirmed", r.status === 409 && /already_confirmed/.test(JSON.stringify(r.body)), r.status);
  ok("no model was called", sql("select count(*) from ai_batch") === spend0);
});
