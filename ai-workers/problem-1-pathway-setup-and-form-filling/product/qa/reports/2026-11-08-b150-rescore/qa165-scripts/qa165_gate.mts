// qa lane, QA-165 run 3: after the client answers No to the three gates, are the follow-ups still asked and still needed?
// Reads the client's own questionnaire, the officer's view and the IMM 5257 readiness, before anything else is answered. US$0.
const L = await import(process.env.LIB!);
const { call, needVisitorVisa, openCase, agent, answer, yearsAgo, OFFICER, CLIENT } = L;
const vv = needVisitorVisa();
const c = await openCase(vv, [{ role: "principal", name: "Sample Client A", dob: yearsAgo(40) }]);
const P = c.subjects["Sample Client A"];
const RX = /other_name|otherwise_used|national_id|us_permanent|green_card/;
const pick = (v: any) => (v?.sections ?? []).flatMap((s: any) => (s.questions ?? []).map((q: any) => ({ ...q, section: s.title }))).filter((q: any) => q.subjectId === P && RX.test(q.fact)).map((q: any) => ({ fact: q.fact, required: q.required, hidden: q.hidden, answer: q.answer?.value ?? null }));
const missing = async () => { const f = ((await call("GET", `/runtime/cases/${c.id}/forms`, undefined, OFFICER)).body?.forms ?? []).find((x: any) => x.form === "IMM 5257" && x.subject_id === P); const m = f?.readiness?.missing ?? []; return { ready: f?.readiness?.ready, missing: m.length, gate_related: m.filter((x: any) => RX.test(JSON.stringify(x))).map((x: any) => JSON.stringify(x).slice(0, 160)) }; };
console.log("before: readiness", JSON.stringify(await missing()));
for (const f of ["person.has_used_other_name", "person.has_national_id", "person.us_permanent_resident"]) console.log("client answers No", f, (await answer(c.id, P, f, false, CLIENT)).status);
const cv = (await call("GET", `/runtime/cases/${c.id}/questionnaire`, undefined, CLIENT));
console.log("client view", cv.status, JSON.stringify(pick(cv.body)));
console.log("officer view", JSON.stringify(pick(await agent(c.id))));
console.log("after: readiness", JSON.stringify(await missing()));
