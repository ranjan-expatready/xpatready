// Setup for qa's C6.5 / QA-322 walk (not under test): one Visitor visa family case on the configured checkpoint, and a
// synthetic passport (Sample, coded lines reading SAMPLED) uploaded to Client A's passport line by the officer, as the
// pack does (C6.5-1). Nothing is read, typed or confirmed here: that is walked by screens. US$0, no model call.
const L = await import(process.env.LIB!);
const F = await import(process.env.FIX!);
await L.main("c65 walk case (qa)", "one family case and a passport upload", async () => {
  const c = await L.openCase(L.needVisitorVisa(), L.FAMILY);
  const P = c.subjects["Sample Client A"];
  const lines = (await L.call("GET", `/runtime/cases/${c.id}/checklist`, undefined, L.OFFICER)).body?.people?.find((x: { subject: string }) => x.subject === P)?.lines ?? [];
  const passLine = lines.find((x: { label: string }) => /passport/i.test(x.label))?.id;
  const doc = { surname: "SAMPLED", given: "CLIENT A", number: "SAMPLEP12", nationality: "IND", dob: L.FAMILY[0].dob, sex: "X", expiry: L.FIXED.expiry };
  const u = await F.upload(L.PORT, `/runtime/checklist-lines/${passLine}/documents`, F.passportPdf(doc), "sample-passport.pdf", L.OFFICER);
  console.log("CASE", c.id, "client A", P, "upload", u.status, u.body?.document?.id);
});
