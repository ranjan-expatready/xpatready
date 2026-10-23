# Quality dimensions — how screens and milestones are scored

Score 1–5 per dimension with test or user evidence. The bar behind each dimension: D1–D7 → `STANDARDS.md`; D8–D13, D17, D20 → `EXPERIENCE.md`; D14–D16, D18 → `STANDARDS.md` §1, §7, §9; D19 → `PRODUCT.md` §1.
Scale: 1 Broken (wrong result or data at risk) · 2 Major gaps (happy path only) · 3 Works, clumsy · 4 Good, minor fixes · 5 Excellent for the proof. Score only what evidence demonstrates (P-26). Report per-screen and per-milestone scores separately from whole-product readiness. Do not average away a weak dimension. A milestone cannot pass with a required dimension below 4/5 or an open critical/high finding; fix it and repeat the affected checks. Mark unbuilt or untested work “Not yet evidenced,” not a projected score. Label evidence maker, independent reviewer, browser/script, and founder/user walkthrough.

**Primary product test:** does this solve a real user pain clearly and make the next step feel easier or meaningfully better? User friendliness, user capability, the end-to-end flow and a useful “wow” outcome are first priority across every dimension. “Wow” means a concrete, user-validated benefit (less effort, fewer errors, clearer decisions, faster completion or a newly possible task), never decoration alone. D20 is a non-compensating gate: D20 and D17 must each reach 4/5 before milestone acceptance.

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

## Delivery — can the team pick it up easily?
| # | Dimension | Question | Test |
|---|---|---|---|
| D14 | Looks like the team's product | Same layout, colours, components and words as the existing screens? | Team tokens and components; team model and field names |
| D15 | Speed | Quick with the sample data? | First view under 1 s with the sample programs; no request per row |
| D16 | Testability | Are the rules the proof relies on tested? | Each business rule the proof uses has a passing and a failing test; suites rerun on the exact commit by someone other than the maker; code coverage of `api/src` and `engine/` at or above the qa floor (c8, P-69); screenshots for every screen |

## Added dimensions — user understanding and complete proof
| # | Dimension | Question | Test |
|---|---|---|---|
| D17 | First-use intuitiveness | Can an intended user complete the common task without coaching? | Unaided task walkthrough; record completion, wrong turns and help needed |
| D18 | Information provenance | Can the user understand where important information came from and what to do with it? | Trace sampled facts, rules, AI proposals, status and next action to source/evidence and decision history |
| D19 | End-to-end capability closure | Does the product complete the promised user outcome across screens? | Reset and complete configure → release → case → client answers → checked PDF/answer sheet, including reuse and new-edition proof |
| D20 | User pain solved and meaningful “wow” | Does the experience remove a real pain and give the user a clear, valuable improvement? | Observe intended users completing a realistic task; compare effort, errors, time, confidence or previously impossible outcome with their current workaround; record user feedback and the evidence for the benefit |

## Journey score out of 10 (skill `journey-test`, P-64)
Ten criteria, each 0, ½ or 1 with a screenshot or test as evidence: task completed · next step obvious · plain words · feedback and state · correct data · error recovery · accessibility and screen sizes · speed · visual quality · trust and sources. **Pass = 8 or more with no criterion at 0** (8 ≈ every mapped dimension at 4/5); 10 = world-class. It adds to D1–D20, never replaces them; D17 and D20 still need the founder's or an intended user's unaided walk. One score per check, given by the reviewer agent (or the qa lane on `main`); builders run the journeys unscored, the Lead verifies the evidence (P-68).
