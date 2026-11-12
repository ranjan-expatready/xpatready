// Setup for qa's C7.3 gate A walk on 12 Nov (not under test; 9 Nov's walk_c73_setup.mts plus QA-395/QA-396's data): a
// principal and a spouse on Visitor visa. The principal has one post-secondary education entry and one previous residence
// that IMM 5257 Q8 A counts (United States, 3 to 1 years ago); the spouse has one previous residence in the family's own
// country (India), which Q8 A does not count. Every fact answered and confirmed; reviewed; every warning passed; no answer
// sheet section ticked (the ticks are the walk's). Underneath: the PDF copy's own PCRIndicator / EducationIndicator per person,
// read back with the proven E5 reader (as tests/check_qa395_q8a_counts.ts), printed for the walk to compare. US$0, no AI.
//   LIB=<studio>/acceptance/lib/m3.ts STUDIO=<studio> tsx walk_c73_setup.mts <port> <db>
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const L = await import(process.env.LIB!);
const { call, main, firms, yearsAgo, agent, confirmAll, generateCopy, copyBytes, CLIENT } = L;
const STUDIO = process.env.STUDIO!, ROOT = join(STUDIO, "..", "..", "..", "..");
function pdfValues(pdf: Buffer): Record<string, string> {
  if (!pdf.length) return {};
  const dir = mkdtempSync(join(tmpdir(), "qa73-")), file = join(dir, "copy.pdf");
  try {
    writeFileSync(file, pdf);
    const code = "import sys, json; sys.path.insert(0, sys.argv[1]); import e5_roundtrip as E, xml.etree.ElementTree as ET\n"
      + "r = E.open_reader(open(sys.argv[2], 'rb').read()); d = E.data_root(ET.fromstring(E.xfa_streams(r)['datasets'].get_object().get_data()))\n"
      + "print(json.dumps({p: v for p, v in E.leaves(d) if v}))";
    return JSON.parse(execFileSync(join(ROOT, ".tools", "solution-1-prototype", ".venv", "bin", "python"), ["-I", "-c", code, join(STUDIO, "..", "p1"), file], { encoding: "utf8" }).trim().split("\n").pop()!);
  } catch (e) { console.log("pdf read failed", String(e).slice(0, 200)); return {}; } finally { rmSync(dir, { recursive: true, force: true }); }
}
await main("walk C7.3 (qa setup, 12 Nov)", "principal Yes / spouse No on Q8 A, IMM 5257 Online, every warning passed", async () => {
  const vv = L.needVisitorVisa(); const f = await firms(); const officer = f.officer ?? "user-O";
  const PN = "Sample Client W", SN = "Sample Spouse W";
  const c = await L.openCase(vv, [{ role: "principal", name: PN, dob: yearsAgo(36) }, { role: "spouse_or_partner", name: SN, dob: yearsAgo(34) }], { representative: f.rep, caseOfficers: [officer] });
  const P = c.subjects[PN], S = c.subjects[SN];
  const secs = ((await agent(c.id))?.sections ?? []) as { subjectId: string; section: string; questions: { fact: string }[] }[];
  const groupOf = (subject: string, fact: string) => secs.find((x) => x.subjectId === subject && x.questions.some((q) => q.fact === fact))?.section;
  for (const [who, fact] of [[P, "person.education_school_name"], [P, "person.previous_residence_country"], [S, "person.previous_residence_country"]] as const) {
    const g = groupOf(who, fact); const r = g ? await call("POST", `/runtime/cases/${c.id}/groups/${who}/rows`, { group: g }, officer) : null;
    console.log(`row ${who === P ? PN : SN} ${fact}: ${r?.status}`);
  }
  let p = (await L.prepare(c.id, officer)).p;
  const exp = await L.expectedFor(c.id);
  let moved = "release line";
  for (const [name, who] of [[PN, P], [SN, S]] as const) {
    const mine = exp?.[name]; const online = mine?.forms.find((l: { online?: boolean }) => l.online), app = mine?.forms.find((l: { barcode?: boolean }) => l.barcode)?.form;
    if (!online && app) { const it = L.itemsOf(p, who, app)[0]; const r = await call("PATCH", `/runtime/items/${it?.id}/channel`, { channel: "ONLINE", version: p?.version }, officer); moved = `moved ${app} to ONLINE: ${r.status}`; p = (await L.prepare(c.id, officer)).p; }
  }
  console.log("fillEverything:", await L.fillEverything(c.id));
  type Row = { row: string; answer: { id: string; value?: unknown } | null };
  const qOf = async (who: string, fact: string) => (((await agent(c.id))?.sections ?? []) as { questions: { subjectId: string; fact: string; rows: Row[] }[] }[]).flatMap((x) => x.questions).find((q) => q.subjectId === who && q.fact === fact);
  const setEntry = async (who: string, country: string, from: string, to: string) => {
    for (const [fact, value] of [["person.previous_residence_country", country], ["person.previous_residence_from", from], ["person.previous_residence_to", to]] as const) {
      const r = (await qOf(who, fact))?.rows[0];
      const res = await call("PUT", `/runtime/cases/${c.id}/answers/${who}/${fact}`, { value, expectedId: r?.answer?.id ?? null, row: r?.row }, CLIENT);
      if (res.status >= 300) console.log(`note: ${fact}=${value}: ${res.status} ${JSON.stringify(res.body).slice(0, 200)}`);
    }
    await confirmAll(c.id, who);
  };
  await setEntry(P, "United States", yearsAgo(3), yearsAgo(1));
  await setEntry(S, "India", "2015-01-01", "2015-01-01");
  const view = async () => (await L.prepare(c.id, officer)).p;
  const v = await view(); const fid = v?.filings[0]?.id ?? "";
  for (const i of (v?.items ?? []).filter((x: { kind: string; state: string }) => x.kind === "form" && !["ready", "done"].includes(x.state))) {
    const mine = Object.values(exp ?? {}).flatMap((e: any) => e.forms);
    if (i.channel === "PDF_UPLOAD" && mine.some((l: { form: string; barcode?: boolean }) => l.form === i.form && l.barcode)) await L.validateRoundTrip(c.id, i.form!, i.subject);
    if (i.signature === "HAND_SCANNED") await L.signByHand(c.id, i.id, i.form!, i.subject);
  }
  // Every filing of the submission (one per person): the submission is recorded only once every filing is Ready to file.
  let warns: unknown[] = [];
  for (const g of (v?.filings ?? []) as { id: string }[]) {
    await call("POST", `/runtime/filings/${g.id}/review`, { note: "Reviewed (Sample)", facts_hash: L.readinessOf(await view(), g.id)?.facts_hash }, f.rep ?? "");
    const ws = L.readinessOf(await view(), g.id)?.warns ?? []; warns = warns.concat(ws);
    for (const l of ws) await call("POST", `/runtime/filings/${g.id}/warnings/${l.code}/pass`, { reason: "Passed for the walk (Sample)", key: l.key }, officer);
  }
  const fin = await view(); const after = L.readinessOf(fin, fid);
  console.log("FILINGS " + (fin?.filings ?? []).map((g: { id: string }) => `${g.id}:${JSON.stringify(L.readinessOf(fin, g.id)?.warns?.length ?? null)}open/${L.readinessOf(fin, g.id)?.blocks?.length ?? null}blocks`).join(" "));
  for (const [name, who] of [[PN, P], [SN, S]] as const) {
    const item = L.itemsOf(fin, who, "IMM 5257").find((i: { channel: string }) => i.channel === "ONLINE") ?? L.itemsOf(fin, who, "IMM 5257")[0];
    const copyId = await generateCopy(c.id, "IMM 5257", who);
    const vals = copyId ? pdfValues(await copyBytes(copyId)) : {};
    const pick = (re: RegExp) => Object.entries(vals).find(([k]) => re.test(k))?.[1];
    console.log(`PERSON ${name} SUBJECT ${who} ITEM ${item?.id} channel ${item?.channel} state ${item?.state} PDF PCRIndicator=${pick(/PCRIndicator/)} EducationIndicator=${pick(/EducationIndicator/)} (copy ${copyId}, ${Object.keys(vals).length} values)`);
  }
  console.log(`CASE ${c.id} FILING ${fid} OFFICER ${officer} REP ${f.rep} (${moved}) warnings_before ${warns.length} open_after ${(after?.warns ?? []).length} blocks_after ${(after?.blocks ?? []).length}`);
});
