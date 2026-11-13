# BK-18 (QA-448) — the walk before review (P-352)

A person's journey at 1440 px in a real browser, on a **fresh** isolated copy built from this branch (the walk loads the
configured checkpoint itself and builds both of its own cases, so it starts from nothing), live AI off, US$0.

```
zsh prototype/studio/tools/isolated.sh screens_record 4441 start
node product/screens/BK-18/walk.cjs 4441 product/screens/BK-18/screenshots
```

**exit 0 · 10 of 10 passed** (13 Nov, after the reviewer's and breaker's findings were fixed):

| # | what a person does | what happens |
|---|---|---|
| 0–1 | Cases → **Open a case** → the Study permit's released combination, a name, a reference → **Open case** | the case opens with the dialog's **default team**: Case officer (Sample) on it, Representative (Sample) of record — walk 1's step S8 set-up (`02-open-a-case`) |
| 2 | the Representative, who opened it and did the work: **Send for review** → **Approve** | the dialog **asks for the statement** first: "I prepared and reviewed this filing myself", in the server's own words, before anything is recorded (`06-approve-asks-the-statement`) |
| 3–4 | back on the case: Ready to file | `Prepared by · Reviewed by: **Self-reviewed by Representative (Sample) (licence R000000)**, Nov 13, 2026, 12:08 p.m.` — the Case officer, who did nothing, is not named (`08-ready-to-file-record`) |
| 5 | on to C8.2 | "Record the submission" is on the page under **Submission to IRCC**; on this bare case it waits, and Ready to file says why in words (the barcode copy is the one hard stop, P-237, P-238) |
| 6–7a | a second case the walk builds: the **Case officer** opens it and types the facts (through the route the Agent view uses), the **Representative** sends it for review and approves it on the screens | the Representative is **not** refused as a second person — sending work another person prepared is not preparing it (review M1) |
| 7 | that case's Ready to file | `Prepared by · Reviewed by: **Case officer (Sample) · reviewed by Representative (Sample) (licence R000000)**, …` — both named, never a self-review (`10-record-two-people`) |
| 8 | — | no script error during the walk |

Nothing stopped the walk. The two refused requests a person meets on the way (400: the statement is asked for; 409:
Ready to file while CRITICAL lines are open) are the server answering, and the screen says both in words.

Before the fix, step 3 read `Prepared by · Reviewed by: Case officer (Sample) · Representative (Sample) (licence
R000000), …` on the same journey, and step 2 never asked for the statement.
