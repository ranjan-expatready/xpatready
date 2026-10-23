# Quality dimensions — how every screen is scored

Score 1–5 per dimension with the test as evidence. **Handover gate:** no dimension below 3; each family averages 4 or more.
Scale: 1 Broken (wrong result or data at risk) · 2 Major gaps (happy path only) · 3 Works, clumsy · 4 Good, minor fixes · 5 Production-grade (team can lift it as is).

## Solution — is it right, and does it stay right?
| # | Dimension | Question | Test |
|---|---|---|---|
| D1 | Requirement fit | Does it do what SA-01B and the founder's decisions say? | Every business rule maps to a behavior and a test |
| D2 | Data integrity | Can wrong or duplicate data get in? | Duplicates, wrong parent level and concurrent saves refused by the server |
| D3 | Reuse and normalisation | Is every field, section and document defined once and reused? | A second form reuses existing fields; no near-duplicates in the library |
| D4 | Rule integrity | Do dependent questions and document rules always resolve? | No unreachable question, no hidden field a form needs, no rule that can never be true |
| D5 | Stability and recovery | Does it survive reload, double click, failure and reset? | Repeat launch refused; a failed step retries alone; no edit lost |
| D6 | Freshness and governance | Do we know when content was checked and who changed it? | Checked and next-review dates on every item; history shows who, when, AI or person |
| D7 | AI trust | Is AI output visible, explained and reversible? | Every AI item shows its source; accept, edit or reject; never released by itself |

## Experience — can a content publisher or RCIC use it without help?
| # | Dimension | Question | Test |
|---|---|---|---|
| D8 | Orientation | Do I always know where I am and what this belongs to? | Full path on every screen; a new user names a row's program in under 5 s |
| D9 | Flow of information | Is the next step obvious and the path short? | Each status has one next action; create, attach forms and start AI in 6 clicks or fewer |
| D10 | Language and guidance | Plain words, tooltips, teaching empty states? | No hashes, IDs or jargon on the main path; every status and icon has a tooltip |
| D11 | Feedback and state | Are saved, unsaved, running and failed always visible? | Draft bar, save confirmation, progress, errors on the field that caused them |
| D12 | Visual quality | Does it look like ExpatReady and read cleanly? | Team tokens and components; one row of tabs; aligned tables; dense but readable |
| D13 | Accessibility and responsive | Keyboard, contrast, zoom, smaller screens? | Keyboard-only walkthrough; 4.5:1 contrast; works at 1024 px and 200% zoom |

## Delivery — can the team retrofit it quickly?
| # | Dimension | Question | Test |
|---|---|---|---|
| D14 | Retrofit readiness | Can the team lift it into ERv2 cheaply? | Same model and field names as the team schema; team components and tokens; typed contracts |
| D15 | Performance at scale | Fast with 100 programs and 400 combinations? | First view under 1 s; filter under 200 ms; no request per row |
| D16 | Testability | Is every rule a test? | Each business rule has a passing and a failing test; screenshots for every screen |
