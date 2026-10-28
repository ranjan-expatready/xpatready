# Filing channels for IRCC forms: research and recommendation (29 Oct 2026)

For P-140's open point. Builds on, without repeating: `screens/M3-prepare-application/research-agent-view.md` §1–2, `ircc_filing_units.md` §1, `agent_filing_ux.md`, P-61, P-113, P-122, P-135–P-137, P-140 (P-114 superseded by P-122, `history/STATE-log.md`). Code: `studio/api/src/filing.ts` (`channelsFrom`: PDF · ONLINE · PDF_OR_ONLINE), `studio/engine/channels.ts` (`acceptedChannels` maps these to PDF upload · Online · Signed PDF upload). Evidence: `prototype/evidence-lane/E1/*/STATUS.md`, `E1/form-editions-check.md`. canada.ca read live 29 Oct (page dates given). All per-form and per-program values are **Sample until the immigration expert confirms**; what a representative may lawfully do is **Unconfirmed: no counsel**.

## 1. The founder's understanding, checked
| Founder's point | Verdict | Evidence |
|---|---|---|
| A form can be filed only as a PDF: uploaded, or printed, signed and mailed | **True, but these are two different channels, not one.** Uploaded: Validate, "Do not print", the name and security answer sign it. Paper: print with barcodes, "Sign and date … in pen", barcode page on top | Help Centre 1523 (2026-09-28) |
| Some forms are online only, in the portal's own screens | **True.** IMM 0008, 5669, 5406, 5562 are digital forms in the PR Portal ("You'll fill out these forms directly in the portal"); in the IRCC Portal IMM 5257 is not needed | PNP non-Express Entry documents (2026-06-05); IMM 5257 page (2026-10-06) |
| Some forms both ways, and we want both for one form | **IRCC offers both editions, but the account decides which one; nobody files one form twice.** IMM 0008: "a digital version in the Permanent Residence Portal" and "a PDF version for paper applications" (same on IMM 5406, 5669). Our "both" can only mean: file online **and** keep an auto-filled PDF copy, not for filing (P-122) | IMM 0008 page (2026-09-11), IMM 5406 (2026-06-03), IMM 5669 (2025-06-26) |
| Mixed: online application, with auto-filled PDFs downloaded and then uploaded into it | **True, and it is the normal case** for every APR Portal and PR Portal filing. It is not a channel: it is the filing's method, worked out from its lines (`filingMethod` already says "Online + PDF uploads") | PNP documents page lists three groups: portal forms; PDFs uploaded unsigned (IMM 0008 Schedule 4, IMM 0199); PDFs "Print, fill out and sign … by hand" then uploaded (IMM 5604, 5409, 5476) |

Two more points, both in scope:
* **Citizenship by a representative is paper only**: "If you want your representative to complete and submit your application for you, apply on paper" (citizenship: apply, 2026-04-21). Our code has no Paper value (`channelsFrom` returns null on paper lines).
* **Signing is separate from filing.** IMM 1344 is uploaded, "Do not print", and a typed name "is considered to be a digital signature" (2026-09-18); IMM 5532 is typed-signed after print to PDF (2026-01-08); IMM 5476 in a portal accepts typed, DocuSign or scanned signatures, outside one a hand signature (2025-12-12).

## 2. (a) Recommended channel values
Two separate fields per form line: **channel** (how IRCC receives it) and **signature** (from the form edition and the channel, never typed by us).

| Channel | Means, in plain words | Example |
|---|---|---|
| **Online (portal screens)** | The portal asks the questions itself; there is no file. The officer types answers from our answer sheet | IMM 0008 in the PR Portal (spousal, PNP base) |
| **PDF upload** | We fill IRCC's PDF; it is validated in Adobe where it has a Validate button; the file is uploaded to the online application | IMM 1295 in the APR Portal |
| **Paper** | We fill and validate the PDF; it is printed with its barcode page, signed in pen and mailed in one envelope | CIT 0002 citizenship by a representative (Sample: form name to confirm) |
| **Not needed** | The account replaces the form; the line stays visible, greyed, with the reason | IMM 5257 when the filing goes through the IRCC Portal |

Not channels, kept as their own words:
* **PDF copy, not for filing**: an extra deliverable on an Online line (P-122): the same facts written into the PDF edition, for the file, the client or a later paper fallback. Never counted as filed.
* **Signature** (per form edition): *None* (IMM 0199) · *Typed name in the PDF* (IMM 1344, 5532) · *Signed by hand, scanned, uploaded* (IMM 5409, 5604) · *E-signed by the client in the portal* (PR Portal digital forms) · *Representative's declaration at submission* (APR Portal validated forms) · *Pen on paper* (Paper). Today's "Signed PDF upload" becomes PDF upload + "Signed by hand, scanned".

## 3. (b) What IRCC accepts, per form edition and per account
The library's "What IRCC accepts" must be **per edition × account**, not per edition (P-113 already says "per portal"): IMM 5257 and IMM 0008 change channel with the account.

| Form (edition we hold) | APR Portal | IRCC Portal | PR Portal | Paper | Validate / barcodes (E1) | Signature |
|---|---|---|---|---|---|---|
| IMM 5257 visitor visa (09-2023) | PDF upload | Not needed | — | Paper | Yes / 5 barcodes, passes from our file alone | Representative at submission; pen on paper |
| IMM 1295 work outside (06-2018 label) | PDF upload | — | — | Paper | Yes / 5, passes alone | As above |
| IMM 1294, 5709, 5710, 5708 (study, extensions) | PDF upload | — | — | Paper (exceptions only) | Not tested | As above |
| IMM 5645 / IMM 5707 family information | PDF upload | Checklist upload | — | Paper | 5707: no barcodes, passes | Typed or hand (Sample) |
| IMM 0008 generic (05-2026) | Express Entry: Online (profile) | — | Online | Paper | Yes / 10, passes after one person step | Client e-signs (PR Portal); pen on paper |
| IMM 5669 Schedule A (05-2021) | Express Entry: unclear, see Q-E1 | — | Online | Paper | No barcodes; writer gap (no data part) | Client types name in the portal |
| IMM 5406 family (05-2026) | Express Entry: unclear, see Q-E1 | — | Online | Paper | Not tested | Portal "Complete and return" |
| IMM 5562 travels | unclear | — | Online | Paper | Not tested | Portal |
| IMM 1344 sponsorship (09-2024) | — | — | PDF upload | Paper | Yes / 5, passes only after typed signatures and a phone click | Typed names: sponsor, co-signer, applicant |
| IMM 5532 relationship | — | — | PDF upload | Paper | Not tested | Typed names after print to PDF |
| IMM 0008 Sch 4, IMM 0199 | — | — | PDF upload | Paper | Not tested | None |
| IMM 5409 common-law | PDF upload | PDF upload | PDF upload | Paper | Validate, no barcodes; oath block is a person step | By hand, both partners, before an official |
| IMM 5604 non-accompanying parent | PDF upload | PDF upload | PDF upload | Paper | Not tested | By hand, third party |
| IMM 5476 representative (11-2025) | PDF upload | PDF upload | PDF upload | Paper | Not tested | Client and representative; typed or scanned in a portal, hand outside |
| CIT 0002 adult citizenship | — | — | — | **Paper only** (by a representative) | Not tested | Pen |

## 4. (c) Default and alternatives per combination
Portal fixed by the combination (P-137). Default is first; alternatives only inside the table above.

| Combination | Portal | Default per form | Allowed alternatives |
|---|---|---|---|
| Visitor visa | APR Portal | IMM 5257, 5645/5707: PDF upload; 5476: PDF upload, signed by hand or typed | Paper only on an accessibility exception ("You must apply online", visitor visa page 2026-08-28) |
| Super visa | IRCC Portal (`ircc_filing_units` 1b) | Portal questions: Online; IMM 5257: Not needed; uploads as above | Online + PDF copy of IMM 5257, not for filing |
| Study / work outside Canada | APR Portal | IMM 1294 / 1295 and family forms: PDF upload | Paper (exceptions) |
| Study / work / visitor extensions inside | APR Portal | IMM 5709 / 5710 / 5708: PDF upload | Paper (exceptions) |
| Express Entry eAPR (incl. PNP enhanced) | APR Portal | Profile and IMM 0008 content: Online; 5476, 5409, 5604: PDF upload, signed | IMM 5669 / 5406: Online or PDF upload, open (Q-E1). Online + PDF copy |
| PNP base, other PR | PR Portal | 0008, 5669, 5406, 5562: Online; Sch 4, 0199: PDF upload unsigned; 5409, 5604, 5476: PDF upload signed by hand | Online + PDF copy; Paper only on alternate-format request |
| Spousal, parents and grandparents | PR Portal | Digital four: Online; IMM 1344, 5532: PDF upload with typed names; 5476 ×2 (sponsor and principal applicant): PDF upload signed | Online + PDF copy; Paper only on request ("braille, large print or paper", spouse: how to apply, 2026-09-11) |
| Citizenship | Paper (representative) | CIT 0002 and others: Paper | None. Online is the client's own account; outside our filing |

## 5. (d) What the product does per channel
| Channel | Steps on the deliverable (P-122) |
|---|---|
| Online | Answer sheet in portal screen order (answer, Copy, source) → "Entered" per screen, freezing its answers → "Client e-signed in the portal" (PR) or "Representative declaration" (APR). Extension later (P-102) |
| PDF upload | Fill from confirmed facts → our Check (never "Validated", P-46) → Download → Validate in Adobe → person steps (typed names on IMM 1344, oath on 5409) → upload the validated copy back → Read back → "Uploaded to IRCC". Never printed |
| PDF upload, signed by hand | As above to Read back → Print → Signed (who: `signedBy`) → Scan received → Uploaded |
| Paper | As above to Read back → Print with barcode page → Signed in pen → barcode page on top → Mailed |
| Not needed | No steps; reason shown |
| PDF copy, not for filing | Fill → Check → Download, named "copy, not for filing"; never counted |

## 6. (e) Rules the engine applies
At release (errors): a line's channel must be one IRCC accepts for the edition **on the combination's portal** (today's `notAcceptedWords`, extended to the portal; no record = all offered, Sample); Paper only on a Paper combination or on a line marked "exception" with a reason; Not needed only where the library says the portal replaces the form; the signature is derived from edition × channel. "What IRCC accepts" comes from the finder with IRCC's quoted line, `channelsFrom` flags contradictions, a second person confirms (P-140).

On the case (P-136): **blocks** an Entered, Uploaded or Signed item made stale by a later fact change, and a missing required signature step. **Recommended third blocker** (Q2): a barcode form on PDF upload or Paper without a validated copy read back; IRCC returns such a package "without being processed" (IMM 0008 page). **Warns**: AI findings, missing documents, a stale PDF copy, an Online line the extension cannot fill yet.

## 7. (f) Recommendation
Adopt four channels (**Online · PDF upload · Paper · Not needed**), a derived **signature** per line, and "PDF copy, not for filing" as an optional extra deliverable on Online lines; record "What IRCC accepts" per edition × account; migrate "Signed PDF upload" to PDF upload + "Signed by hand, scanned". "Both" is the library saying an edition exists in two forms; "online plus uploaded PDFs" is the derived filing method: nobody picks either. This follows IRCC's own split, covers citizenship, and keeps one channel per filed form.

Founder questions (one at a time, recommendation first):
1. **Make the signature its own field and add Paper and Not needed as channels?** Recommended yes: IMM 1344's typed-name signature and citizenship's paper route do not fit today's three values.
2. **Should a barcode form without a validated, read-back copy block "Ready to file"** (a third blocker, narrow amendment to P-136)? Recommended yes, for PDF upload and Paper only.
3. **Is "PDF copy, not for filing" offered on every Online line, or only where IRCC has a PDF edition?** Recommended only where a PDF edition exists (IMM 0008, 5669, 5406, 5257), since the copy is written into IRCC's own PDF.

For the immigration expert:
* **Q-E1 Express Entry**: are IMM 5669 and 5406 digital forms in the eAPR (P-113) or uploaded PDFs (the founder's brief)? The public page (2026-10-16) names only IMM 5476 and 5409 as uploads; the checklist is behind sign-in. P-113 stands until answered.
* Super visa in the IRCC Portal: is IMM 5257 "Not needed"? Citizenship: which forms, and is paper the only representative route?
* IMM 1344 and 5532: the client types their own names before Validate (E1 F2): confirm the order.

## 8. Limits
Portals and their personalised checklists sit behind sign-in and were not seen. Page wording is summarised by a reading tool: check it on the page before quoting it in the product.
