// C8.3 gate A setup, part 2 (not under test: C7.x and C8.1 work outside the review): after the review was walked by
// screens, the files a real officer makes outside this product's screens: each barcode form validated in Adobe and its
// copy read back (validateRoundTrip, simulated), and each hand-signed form printed, signed and scanned (signByHand), as
// readyToFile does, but WITHOUT readyToFile's C7.6 review route and without passing any warning: the review stays the
// one walked by screens, and the warnings are passed by screen in walk stage 6. Prints one JSON line. US$0.
//   cd studio && node_modules/.bin/tsx --tsconfig api/tsconfig.json <this file> <port> <db> <caseId> <officer>
import { call, expectedFor, prepare, signByHand, validateRoundTrip } from "../../../../../prototype/studio/acceptance/lib/m3.ts";
const [caseId, officer] = [process.argv[4], process.argv[5]];
const exp = await expectedFor(caseId);
const p = (await prepare(caseId, officer)).p;
const done: string[] = [];
const names = new Map((p?.filings ?? []).flatMap((f) => f.applicants.map((a: { subject: string; name?: string; display_name?: string }) => [a.subject, a.name ?? a.display_name ?? ""])));
for (const i of (p?.items ?? []).filter((x) => x.kind === "form" && !["ready", "done"].includes(x.state))) {
  const isBarcode = exp ? Object.values(exp).some((e) => [...(e.forms ?? []), ...(e.waiting ?? [])].some((l) => l.form === i.form && l.barcode)) : i.form === "IMM 5257";
  if (isBarcode) { await validateRoundTrip(caseId, i.form!, i.subject); done.push(`validated ${i.form} ${i.subject.slice(0, 8)}`); }
  if (i.signature === "HAND_SCANNED") { await signByHand(caseId, i.id, i.form!, i.subject); done.push(`signed ${i.form} ${i.subject.slice(0, 8)}`); }
}
void call; void names;
console.log(JSON.stringify({ done }));
process.exit(0);
