// qa lane, /qa after-merge on main 06a8fc30 (28 Oct, PR #65): the finder's filing rule `channelsFrom` (api/src/filing.ts),
// which both AI answers and Load sample's fixtures pass (P-122, P-123; Lead check 28 Oct: a paper or mail line is never a
// PDF upload; filling a form in on a computer says nothing about how it is filed). IRCC-style lines, Sample wording.
// Fails mark findings. No server, no database, no model call (US$0).
//   tsx studio/tests/qa/check_qa_s4_filing.ts
import { channelsFrom, filingWhy } from "../../api/src/filing.ts";

let pass = 0, fail = 0;
const step = (name: string, ok: boolean, detail?: unknown) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail)}` : ""}`); };
const is = (line: string, want: string | null, label: string) => { const got = channelsFrom(line); step(`${label}: "${line.slice(0, 90)}" → ${want ?? "Not set yet"}`, got === want, { got, why: filingWhy(line) }); };

// Lead check rules (should hold today).
is("Upload this form along with your online application.", "PDF", "C11.11 upload into an online application is a PDF upload");
is("Paper applications: print this form, sign it and send it with your application.", null, "Lead check: a paper line alone is never a PDF upload");
is("Mail the completed form to the address in the guide.", null, "Lead check: a mail line is never a PDF upload");
is("Download and fill out the form on a computer.", null, "Lead check: filling in on a computer says nothing about filing");
is("IMM 5257 (PDF, 1.2 MB)", null, "review round 7: a size label is not a filing line");
is("Apply online through your IRCC secure account portal.", "ONLINE", "an online-only line is Online");
// Lines a real canada.ca page could carry, where the simple word test may read the wrong value (findings when they fail).
is("Do not upload this form. Bring it to your interview.", null, "QA-61 a negated upload ('Do not upload') is not a PDF upload");
is("If you apply on paper, mail this form. If you apply online, upload it with your application.", "PDF", "QA-61 'apply online … upload it' is a PDF upload into the online application, not filing Online");
is("You don't need to upload this form if you apply online.", null, "QA-61 'don't need to upload' is not a PDF upload");

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
