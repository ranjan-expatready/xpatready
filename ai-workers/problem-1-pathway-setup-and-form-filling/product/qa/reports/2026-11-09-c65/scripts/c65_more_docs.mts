// Setup for qa's reader-coverage look (Lead 1's ruling on #1439; not under test): on the walked case, upload a Sample
// proof of financial support (a printed statement with a table) and a Sample marriage certificate for Client A to
// their checklist lines, by the officer, as the pack uploads the passport. Nothing is read here. US$0.
const L = await import(process.env.LIB!);
const F = await import(process.env.FIX!);
await L.main("c65 more docs (qa)", "proof of funds and marriage certificate uploads", async () => {
  const id = "250dc899-794b-445b-93bf-f15b558a9522", P = "307a2676-0626-40ba-b3ef-57846852b3f9";
  const lines = (await L.call("GET", `/runtime/cases/${id}/checklist`, undefined, L.OFFICER)).body?.people?.find((x: { subject: string }) => x.subject === P)?.lines ?? [];
  const docs: [string, string[]][] = [
    ["proof_of_financial_support", ["SAMPLE BANK (Sample, not a real bank)", "Account statement for SAMPLED CLIENT A", "Date        Description        Balance CAD", "2026-10-01  Opening balance    12,500.00", "2026-10-31  Closing balance    14,200.00", "Funds available: CAD 14,200.00"]],
    ["marriage_certificate_copy", ["MARRIAGE CERTIFICATE (Sample)", "This certifies that SAMPLED CLIENT A and SAMPLES SPOUSE A", "were married on 14 June 2019 at Sample City."]],
  ];
  for (const [type, text] of docs) {
    const line = lines.find((x: { document_type: string }) => x.document_type === type)?.id;
    const u = line ? await F.upload(L.PORT, `/runtime/checklist-lines/${line}/documents`, F.textPdf(text), `sample-${type}.pdf`, L.OFFICER) : { status: "no line" };
    console.log(type, "line", line ?? "none", "upload", u.status);
  }
});
