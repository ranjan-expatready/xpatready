# Founder asks of 26 Oct, one line each (where each lives and where it stands)

Kept by the Lead with `WAVE-1.md` and the progress page `design/end-to-end-progress.html` (same statuses). Checked 27 Oct.
Status words as above, plus **Decided** (in DECISIONS, nothing to build) and **Open** (needs the founder). A new agent reads `WAVE-1.md` first, then this.

**Scope and way of working**
| # | Ask | Where | Status |
|---|---|---|---|
| A1 | Whole journey first without the extension, actor by actor (content publisher → expert → AI → case officer → client → extension) | P-101, `WAVE-1.md` | Decided |
| A2 | Remove all Chrome-extension work now; keep it for later | P-102, W1-02 | Merged; visible on :4400 since 27 Oct |
| A3 | Forms come in only as PDFs; filling = PDF now, online through the extension later | P-102, P-113 | Decided |
| A4 | Agent picks per form: online, PDF or both; the back end knows what each form allows and refuses the impossible | P-114 (route per application, channel per form × route, "also make a PDF copy") | Decided; data in W1-06, screen in W4 |
| A5 | Decisions written so every /lead picks them up | `WAVE-1.md` + P-101–P-116 | Done |
| A6 | Grill the founder first; options before building | 26 Oct grilling (R-115–R-120); rule below | Done; every concept still offers 2–3 options |
| A7 | Simplify skills, rules and workflow for the new scope | W1-01 | Done |
| A8 | One ordered list to track | `WAVE-1.md`, this file, progress page `design/end-to-end-progress.html` | Done |

**Immigration programs and Structure**
| # | Ask | Where | Status |
|---|---|---|---|
| B1 | "Individual" → "Retail" (individuals and families) | P-104; Structure page; Programs page in slice 3 | Partial: Structure and API say Retail; Programs page still "Individual"; the :4400 demo data keeps its old name until Load sample (W1-11) |
| B2 | Modern filled tabs | P-115 | Built on Structure (merge pending); Programs in slice 3 |
| B3 | Menu and title "Immigration programs" | P-115, W1-04 | Slice 3, not built |
| B4 | Programs screen redesign: no row of filter tabs, full five-part trail, clear status, all combinations shown, search and New combination placed | P-115 design D, W1-04 | Slice 3, not built (next after the 1+2 merge) |
| B5 | Masters for Pathway type › Pathway › Program › Category › Sub-category: where they live, add by hand, see the links | P-104, W1-03 Structure page | Merged 27 Oct; on :4400 |
| B6 | Corporate empty except one Sample; only the 5 Retail combinations | P-106, P-108, P-112 | Partial: :4400 reset 27 Oct (founder OK) and the P-112 structure typed in (5 Retail + 1 Corporate, no forms yet); Load sample with their PDFs is W1-11 |

**New combination**
| # | Ask | Where | Status |
|---|---|---|---|
| C1 | Choose Rules, AI or Rules then AI, each explained | P-105, W1-05 | Slice 4, not built |
| C2 | Tooltips in plain words on every control | rule below | Built on Structure; every later slice |
| C3 | "Linked to / Next step of / Supported by": explain or remove | P-106 (removed; the link moves to the case) | Slice 4, not built |
| C4 | Show what is mandatory and why Create is disabled | W1-05 concept: light "Required" marks, sub-category "Required here" only when it applies, the disabled button says what is missing | Slice 4, not built |
| C5 | "Will be created as …" line: keep or drop | W1-05 concept: kept, renamed "You are opening" (the one place the full trail is confirmed) | Slice 4 |

**Combination workspace (Overview · Sources and forms · Configuration · Preview)**
| # | Ask | Where | Status |
|---|---|---|---|
| D1 | Forms added in one place, picked only from the library | P-103, P-118 Q2, W1-06 + W1-08 | Decided 27 Oct; S5 walkthrough |
| D2 | Remove "Add an online form" and "Portal: no portal yet" | W1-02 | Done (checked on :4400) |
| D3 | Remove "Filing: no forms yet", "Add form" on Overview, "Attach sample file" | P-118 Q2/Q3/Q5, W1-08 | Decided 27 Oct; S5 walkthrough |
| D4 | Explain "People in this combination"; drop Released versions / Recent steps if not needed | P-119 ("Who can be in this application", in Configuration), P-118 Q5 | Decided 27 Oct; S5 walkthrough |
| D5 | Configuration (who fills, when) and Preview simplified | W1-08 (runtime S2 work reused) | Concept, not built |
| D6 | Mark a form as fillable online, PDF or both | P-114, W1-06 | Concept, not built |

**Form library and the forms**
| # | Ask | Where | Status |
|---|---|---|---|
| E1 | AI adds a combination's forms; a person may add one; no duplicates (number + edition + checksum); IRCC's own columns; "find missing forms" | P-103, W1-06 form finder | Concept draft written; not built |
| E2 | Delete old forms; fresh official copies only for the 5 combinations | W1-12, W1-11 | Forms identified on canada.ca (Sample, expert confirms); PDFs not downloaded yet |

**Shared library and AI**
| # | Ask | Where | Status |
|---|---|---|---|
| F1 | Reset empties fields, sections, document types, forms, checks | P-108, W1-11 | Not started |
| F2 | Load sample = only the 5 combinations and their PDFs; masters arrive as AI proposals | P-108, W1-11 | Not started |
| F3 | Setup order combination → forms → fields; missing masters listed | W1-09, P-120 | Decided 27 Oct; S6 walkthrough |
| F4 | A person adding a field gets an AI duplicate check | P-120 (one Add in plain words: rules, then AI "did you mean", system name built for you) | Decided 27 Oct; S6 walkthrough |
| F5 | How masters are made: AI drafts them from the PDFs | P-120, W1-10 | Decided 27 Oct (AI drafts when a form or checklist enters); not built |
| F6 | AI clearly visible and working everywhere it is designed; never looks stuck; Stop | P-110, P-121 (two rounds), W1-07; W3 | Concept draft written; S4 walkthrough |

**Later actors**
| # | Ask | Where | Status |
|---|---|---|---|
| G1 | Agent view: how IRCC's portals let a representative fill online and PDF | m3 research `screens/M3-prepare-application/research-agent-view.md`, P-113, P-114 | Research done; screen in W4 |
| G2 | Author, SQR per person role, review by person | runtime S2 branch (not merged), W1-08, W2 | Built on a branch; reused when W1-08 is agreed |
| G3 | Open case, confirm section by section, prepare and record the filing | W4 | Concept research |
| G4 | Case officer, then prospect, PQR, SQR, sign | W4, W5 | Not started |
| G5 | Extension last, for online fill | W6 | Parked |
| G6 | End-to-end map redrawn on today's decisions | W1-14 | Not started (after W1-03–W1-09 concepts are agreed) |

**Not yet decided (Lead raised them; the founder decides when the concept comes)**
| # | Gap | Goes to |
|---|---|---|
| H1 | Bulk approve for AI proposals | **Decided 27 Oct: P-121** (two AI rounds; select all within a filter; High only; rules re-check each item; no demo bypass) |
| H2 | "Signed as" per form (wet signature and scan, typed, portal declaration) | W4 |
| H3 | Filing prerequisites on the route (representative authorised, fee paid) | W4 |
| H4 | GitHub Actions blocked by account billing; the Lead runs suites locally meanwhile | founder |
| H5 | Lead PRs #28 (roles audit) and #30 (archive non-POC folders) open since 25 Oct | founder |
| H6 | Should AI draft the Structure itself, or only propose one name? Fields and sections: how added | **Decided 27 Oct: P-118 Q1** (check only; branch drafting waits for W3) **and P-120** (AI from the form + one Add) |
| H7 | Structure layout. Founder's idea (27 Oct): Pathway cards on top; a click opens the tree under that Pathway. Lead: yes, and use the same entry on Immigration programs (cards open the setup cards), so both pages share one visual language | S1 board, then S2; founder to confirm on the board |


## Grilling round 1: answered 27 Oct (P-118–P-121)
Q2 Structure AI: check only (as recommended) · Q3 forms enter only through the library (as recommended) · Q4 guides and checklists in the library (as recommended) · Q5 "Who can be in this application", in Configuration (founder asked how the engine uses it first; P-119) · Q6 Overview reports only (as recommended) · Q7 masters: AI drafts when a form or checklist enters + one Add in plain words, no technical names (founder pushed for one simple way; scored 18/20; P-120) · Q8 bulk: two AI rounds + rules, select all within a filter, High only, no demo bypass (founder asked for production behaviour; P-121) · Q9 queue S1–S8 kept.
All answers are built into `design/walkthrough-s3-s7.html` (S3–S7, marked OK or Change by the founder). Next round (after the marks): the Sources and forms tab name and the PDF / online / both choice per picked form; Configuration "who fills it, when"; Preview simplified.
