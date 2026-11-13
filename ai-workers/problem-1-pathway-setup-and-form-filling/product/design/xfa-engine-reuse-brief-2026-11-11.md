# XFA engine reuse: brief for the new Lead (founder ask A16, 11 Nov 12:0x IST; row B170)

**The founder's words (typed to Lead 12 (series 2)):** the team shared its XFA code; "I want this code to be used across my product wherever it is making sense ... I don't want it to be rebuilt ... I want it to be reused"; "don't overfit it, over engineer it, or force fit it"; "come up with a rational reason what we use, what we did not use"; any question goes to the founder at once; run it as a parallel lane that merges into the product; then a report the founder sends back to the team ("out of your code, this is being reused"). Named features: open the PDF in a browser, encrypted forms, validate in the browser, and "many other features".

## What arrived (read-only; looked at by Lead 12, nothing run)
`XFA-share-for-Ranjan_2026-11-11.zip` (113 MB) in the repository root, git-ignored (`*.zip`). Never commit it or anything from it (push guard, AGENTS rule 1); its README asks that its branches are never pushed without the team lead's OK.
* `ERv2-xfa-full.bundle` (59 MB): git bundle of the team's repository with local branches `feat/xfa-viewer` and `feat/xfa-engine`; the engine is `packages/xfa-engine/`.
* `XFA-Gov-Form-Viewer-Spec_v1.0_2026-10-18.md`: officers open, fill, validate and save IRCC XFA forms in the browser without Adobe; a shared engine runs the form's own scripts in the browser (live) and on the server (authoritative validate and generate); IMM 1295 and IMM 5257 first, more forms as data.
* `plans/`: PDF layer (object parser, xref and object streams, **AESV2 security handler**, XFA packet extraction, **incremental writer**, Adobe round trip), engine runtime (XML DOM, template model, merge, SOM resolver, sandbox, event engine, **validate and payload**, datasets write-back), viewer (layout, pagination, fonts, widgets, worker protocol, isolation proof, toolbar, end-to-end and accessibility checks), plus owner decisions and open questions.
* `test-forms-and-adobe-checks/`: 24 IRCC blank forms, filled and Adobe round-trip outputs (IMM 1295, IMM 5257), and HTML renders (blank, filled, validated incl. the barcode page).

## Where it may meet our product (to be proven, not assumed)
| Our need today | Their part | Why it may help |
|---|---|---|
| C7.2 (Partial): barcodes need Adobe to draw the page, then a screenshot decode | runtime "validate and payload" (runs the form's own `BC.genValue`) | barcode payloads computed and compared with no Adobe, on every copy, in CI |
| Validate only in Adobe (QA-165 lists empty mandatory boxes beforehand) | runtime validate + event engine | the form's own Validate result before download |
| Our append-only writer (`p1/e5_roundtrip.py`, studio fill) | PDF layer: AESV2 handler, incremental writer | maybe nothing: ours is proven (DocMDP + UR3 verify, Adobe passes); reuse only if it removes code or a gap |
| No in-app view of the filled form | viewer (render, widgets, worker) | case officer sees and edits the real form in the browser |
| Screenshots for packs and qa | render dump (HTML per page) | form pages checkable without Acrobat |

## Who thinks, who builds (founder, 12:1x IST, typed to Lead 12)
**One Fable session does the intelligent work**: the analysis, what to pick up from the team's XFA code and what not, best practices, and the plan for the most quality at the most speed, covering planning, briefs, software engineering, DevOps, development method, milestone capabilities and UI decisions. It does not simply follow the Lead: **the Fable session and the Lead challenge each other** (each states its case with evidence; disagreements go to the founder one at a time with both recommendations). P-455 (5) holds: Fable plans, challenges and reviews read-only; it never builds or reviews code. Builds and code reviews stay on Opus (P-303). The founder may keep that Fable session running as the standing planner for this work.

## The lane (one row, B170; the new Lead starts it in a founder-typed turn)
1. **Analysis, read-only, first PR = a report only** (`design/xfa-reuse-analysis-<date>.md`): clone the bundle into a scratch folder outside the repository (or `code/xfa-share-2026-11-11/`, read-only per AGENTS rule 3); inventory what exists and what is proven (tests, Adobe round trips) versus planned; map each part to our capabilities (C7.1, C7.2, C7.3, C10.2, QA-165) and to our code; for each part one verdict: **reuse as is / reuse with a thin adapter / not now (why)**, with the cost, the risk and the number it moves (C7.2 to Works, Adobe steps removed, lines deleted on our side). Licence and ownership checked (it is the team's code: fine to reuse, but confirm nothing third-party blocks it). New technology only through `STANDARDS.md` §1.
2. **Founder questions** at once, one at a time with a recommendation (e.g. browser viewer now or after the Bake; TypeScript engine replacing parts of the Python writer or beside it).
3. **Adoption rows**, each one small PR from `origin/main`, Opus review, label on Approve (rules unchanged). Likely first: barcode payload check with the engine (closes the C7.2 gap without Adobe), then in-browser validate before download, then the viewer if the founder agrees. No combination key or form number in engine code (P-319); forms stay data (P-449).
4. **Report for the team** (`design/xfa-reuse-report-<date>.md`, plain words, no personal names): what we reused, where, what it replaced or added, what we did not use and why, numbers before and after, and anything we found in their code worth telling them.

Legal: whether IRCC accepts barcodes generated outside Adobe is **Unconfirmed: no counsel**; Adobe Validate stays the proof for Paper copies (P-442) until the founder rules otherwise.
