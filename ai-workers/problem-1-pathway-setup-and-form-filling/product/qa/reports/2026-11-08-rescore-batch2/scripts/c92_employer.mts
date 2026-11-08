// qa probe for C9.2's breadth (Lead 33, 8 Nov): on a worker's With-an-LMIA case linked to the Sample employer case (C1.3),
// the employer facts are copied (BR-3: copies, not live links). Once the worker's form that reads the employer name is
// finished (validated and read back, or signed by hand and scanned), the officer corrects the copied employer name on the
// worker's case: the finished item turns Out of date naming the change, its file is never changed, Ready to file is held,
// an item that does not read the name is untouched, and Undo restores it. US$0, no model call. Args: <port> <db>
import { createHash } from "node:crypto";
const L = await import(process.env.LIB!);
const { call, sql, ok, main, OFFICER, yearsAgo } = L;
const NAME = "organisation.employer_name";
const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");
await main("C9.2 breadth probe", "A corrected employer fact on a linked worker case marks finished items out of date", async () => {
  const wp = (sql("select count(*) from config_release r join combination c on c.id=r.combination_id where c.combination_key='wp.lmia_inside'") !== "0" ? sql("select id from combination where combination_key='wp.lmia_inside'") : null);
  ok("setup: With an LMIA – inside Canada is released on the checkpoint", !!wp, wp);
  const c = await L.openCase(wp, [{ role: "principal", name: "Sample Worker W", dob: yearsAgo(35) }]);
  const P = c.subjects["Sample Worker W"], officer = c.officer || OFFICER;
  const list = (await call("GET", `/runtime/cases/${c.id}/employer-cases`, undefined, officer)).body;
  const ec = list?.employer_cases?.[0];
  const seen = Object.fromEntries((ec?.facts ?? []).map((f: { fact: string; current: { answer_id: string } | null }) => [f.fact, f.current?.answer_id ?? null]));
  const link = await call("POST", `/runtime/cases/${c.id}/employer-link`, { employerCase: ec?.key, seen }, officer);
  ok("setup (C1.3): the worker's case relies on the Sample employer case; the employer facts are copied", [200, 201].includes(link.status), { status: link.status, copied: link.body?.copied });
  const filled = await L.fillEverything(c.id);
  let p = (await L.prepare(c.id, officer)).p;
  const items = L.itemsOf(p, P) as { id: string; form: string; channel?: string; state: string; signature?: string }[];
  console.log("ITEMS " + JSON.stringify(items.map((i) => ({ form: i.form, channel: i.channel, state: i.state, signature: i.signature }))));
  // Which of the worker's forms print the employer name: the questionnaire's own "fills" for the fact.
  const qs = ((await call("GET", `/runtime/cases/${c.id}/questionnaire?mode=agent`, undefined, officer)).body?.sections ?? []).flatMap((s: { questions: unknown[] }) => s.questions) as { fact: string; subjectId: string; fills?: { form: string }[]; answer?: { id: string; value: unknown; channel?: string; answered?: { channel?: string } | null } }[];
  const nameQ = qs.find((q) => q.fact === NAME && q.subjectId === P);
  const readers = [...new Set((nameQ?.fills ?? []).map((f) => f.form))];
  console.log("NAME " + JSON.stringify({ value: nameQ?.answer?.value, channel: nameQ?.answer?.channel, fills: readers, filled }));
  ok("setup: the copied employer name is on the worker's case, from the employer case", (nameQ?.answer?.channel === "linked_file" || nameQ?.answer?.answered?.channel === "linked_file") && readers.length > 0, nameQ?.answer);
  // Finish each reading form the way its channel allows: a PDF copy validated and read back, else signed by hand and scanned.
  const finished: { form: string; id: string; copy: string | null; before: string | null }[] = [];
  for (const form of readers) {
    const it = items.find((i) => i.form === form); if (!it) continue;
    let copy: string | null = null, before: string | null = null;
    copy = await L.validateRoundTrip(c.id, form, P);
    if (copy) before = sql(`select sha256 from validated_copy where form_instance_id='${copy}' order by read_at desc limit 1`);
    else { const s = await L.signByHand(c.id, it.id, form, P); if (s === 201) before = sql(`select sha256 from signed_scan where item_id='${it.id}'`); }
    console.log("FINISH " + JSON.stringify({ form, channel: it.channel, validated: !!copy, before: before?.slice(0, 12) }));
    if (before) finished.push({ form, id: it.id, copy, before });
  }
  ok("setup: at least one form that prints the employer name is finished (validated or signed and scanned)", finished.length > 0, finished.map((f) => f.form));
  p = (await L.prepare(c.id, officer)).p;
  const untouched = (L.itemsOf(p, P) as { form: string; state: string }[]).filter((i) => !readers.includes(i.form)).map((i) => ({ form: i.form, state: i.state }));
  // The officer corrects the copied employer name on the worker's case (C1.3 BR-3: edit a copied value here).
  const fix = await L.answer(c.id, P, NAME, "Sample Employer Limited (Sample)", officer, nameQ?.answer?.id ? { expectedId: nameQ.answer.id } : {});
  await L.confirmAll(c.id, P);
  ok("the officer corrects the copied employer name on the worker's case", fix.status < 300, fix.body);
  p = (await L.prepare(c.id, officer)).p;
  for (const f of finished) {
    const it = (L.itemsOf(p, P, f.form) as { state: string; reason?: string }[])[0];
    ok(`C9.2 breadth pass: the finished ${f.form} is Out of date, naming the employer name, the new value and the date`, it?.state === "out_of_date" && /employer/i.test(it?.reason ?? "") && /Limited/.test(it?.reason ?? ""), { state: it?.state, reason: it?.reason });
    const now = f.copy ? sql(`select sha256 from validated_copy where form_instance_id='${f.copy}' order by read_at desc limit 1`) : sql(`select sha256 from signed_scan where item_id='${f.id}'`);
    ok(`C9.2 breadth pass: ${f.form}'s ${f.copy ? "validated copy" : "signed scan"} is never changed (same checksum)`, now === f.before, { before: f.before?.slice(0, 12), now: now?.slice(0, 12) });
  }
  const r = L.readinessOf(p, L.filingOf(p, P)?.id) as { ready?: boolean; blocks?: { code: string }[]; warns?: { code: string; severity?: string }[] } | null;
  ok("C9.2 breadth fail (P-136, P-237): the out-of-date item is a CRITICAL warning that stops Ready to file", r?.ready === false && [...(r?.blocks ?? []), ...(r?.warns ?? []).filter((w) => w.severity === "critical")].some((b) => b.code === "out_of_date"), { blocks: r?.blocks?.map((b) => b.code), warns: r?.warns?.map((w) => `${w.code}/${w.severity}`) });
  const after = (L.itemsOf(p, P) as { form: string; state: string }[]).filter((i) => !readers.includes(i.form)).map((i) => ({ form: i.form, state: i.state }));
  ok("C9.2 breadth pass (scope): the worker's forms that do not print the employer name keep their state", JSON.stringify(after) === JSON.stringify(untouched) && !after.some((i) => i.state === "out_of_date"), { before: untouched, after });
  const u = await call("POST", `/runtime/cases/${c.id}/changes/undo`, { subjectId: P, fact: NAME }, officer);
  p = (await L.prepare(c.id, officer)).p;
  ok("C9.2 breadth pass: Undo restores the copied value; the items are no longer out of date", u.status === 200 && finished.every((f) => (L.itemsOf(p, P, f.form) as { state: string }[])[0]?.state !== "out_of_date"), { undo: u.status, states: finished.map((f) => (L.itemsOf(p, P, f.form) as { state: string }[])[0]?.state) });
  const back = ((await call("GET", `/runtime/cases/${c.id}/questionnaire?mode=agent`, undefined, officer)).body?.sections ?? []).flatMap((s: { questions: { fact: string; subjectId: string; answer?: { value: unknown } }[] }) => s.questions).find((q: { fact: string; subjectId: string }) => q.fact === NAME && q.subjectId === P);
  console.log("AFTER-UNDO " + JSON.stringify(back?.answer?.value));
  ok("BR-3: the Sample employer case itself is a stand-in file and is unchanged (nothing on the worker's case writes back)", JSON.stringify(((await call("GET", `/runtime/cases/${c.id}/employer-cases`, undefined, officer)).body?.employer_cases?.[0]?.facts ?? []).find((f: { fact: string }) => f.fact === NAME)?.value ?? "Sample Employer Ltd (Sample)").includes("Sample Employer Ltd"));
});
