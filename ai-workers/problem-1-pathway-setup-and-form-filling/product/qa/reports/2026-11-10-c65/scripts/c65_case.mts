// Setup for qa's C6.5 gate A walk (not under test): one Visitor visa family case on the configured checkpoint, as the
// pack opens it (lib/m3.ts openCase), and the synthetic Sample files written to OUT for the walk to upload by screens:
// the pack's own proof of funds and marriage certificate (fixed bytes: their saved AI reads replay by checksum, US$0),
// a passport for Client A, and a Sample birth certificate for the child. Nothing is uploaded, read or confirmed here.
import { writeFileSync } from "node:fs";
const L = await import(process.env.LIB!);
const F = await import(process.env.FIX!);
const out = process.env.OUT!;
await L.main("c65 gate A case (qa)", "one family case and the Sample files", async () => {
  const c = await L.openCase(L.needVisitorVisa(), L.FAMILY);
  writeFileSync(`${out}/sample-funds.pdf`, F.fundsPdf());
  writeFileSync(`${out}/sample-marriage.pdf`, F.marriagePdf());
  writeFileSync(`${out}/sample-passport.pdf`, F.passportPdf({ surname: "SAMPLED", given: "CLIENT A", number: "SAMPLEP12", nationality: "IND", dob: L.FAMILY[0].dob, sex: "X", expiry: L.FIXED.expiry }));
  writeFileSync(`${out}/sample-birth-certificate.pdf`, F.textPdf(["SYNTHETIC SPECIMEN - MADE-UP TEST DOCUMENT - NOT VALID", "BIRTH CERTIFICATE (Sample)", "Name of child: SAMPLED CHILD A", `Date of birth: ${L.FAMILY[2]?.dob ?? "2016-05-01"}`, "Place of birth: Sample City"]));
  console.log("CASE", c.id, "SUBJECTS", JSON.stringify(c.subjects), "CASESUBJECT", c.caseSubject, "FAMILY", JSON.stringify(L.FAMILY));
});
