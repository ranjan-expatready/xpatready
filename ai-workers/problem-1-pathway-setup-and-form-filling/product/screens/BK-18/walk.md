# BK-18 (QA-448) — the walk before the first review (P-352)

A person's journey at 1440 px in a real browser, on a fresh isolated copy built from this branch
(`zsh prototype/studio/tools/isolated.sh screens_record 4441 start`), live AI off, US$0.

```
node product/screens/BK-18/walk.cjs 4441 product/screens/BK-18/screenshots
```

**exit 0 · 8 of 8 passed** (13 Nov, head `6289dadf` plus this commit's notes):

| # | what a person does | what happens |
|---|---|---|
| 0–1 | Cases → **Open a case** → the Study permit's released combination, a name, a reference → **Open case** | the case opens with the dialog's **default team**: Case officer (Sample) on it, Representative (Sample) of record — walk 1's step S8 set-up (`02-open-a-case`) |
| 2 | the Representative, who opened it and did the work: **Send for review** → **Approve** | the dialog **asks for the statement** first: "I prepared and reviewed this filing myself", in the server's own words, before anything is recorded (`06-approve-asks-the-statement`) |
| 3–4 | back on the case: Ready to file | `Prepared by · Reviewed by: **Self-reviewed by Representative (Sample) (licence R000000)**, Nov 13, 2026, 11:13 a.m.` — the Case officer, who did nothing, is not named (`08-ready-to-file-record`) |
| 5 | on to C8.2 | "Record the submission" is on the page under **Submission to IRCC**; on this bare case it waits, and Ready to file says why in words (the barcode copy is the one hard stop, P-237, P-238) |
| 6 | a case two people really worked on (the Case officer prepared it, the Representative reviewed it, submission recorded) | `Prepared by · Reviewed by: **Case officer (Sample) · Representative (Sample) (licence R000000)**, …` — both named, never a self-review (`10-record-two-people`) |
| 7 | — | no script error during the walk |

Nothing stopped the walk. The two refused requests a person meets on the way (400: the statement is
asked for; 409: Ready to file while CRITICAL lines are open) are the server answering, and the screen
says both in words.

Before the fix, step 3 read `Prepared by · Reviewed by: Case officer (Sample) · Representative (Sample)
(licence R000000), …` on the same journey, and step 2 never asked for the statement.
