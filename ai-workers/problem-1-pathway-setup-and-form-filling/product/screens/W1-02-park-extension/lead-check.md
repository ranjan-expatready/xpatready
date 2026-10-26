# W1-02 Park the browser extension — Lead check (26 Oct)

Commits d575150 → e6c16b8 → 0f54908 on `claude/forms-park-ext-0266c0`. Decision P-102; code kept on `lead/parked-extension-2026-10-26`.

* **Scope met.** Capture, pairing, online fill, the APR twin and screen maps, the Extension page, "Add an online form", portal choice, drafting sources, capture and screen-map review pages and their queue kinds are gone from app, API, tests, seed and demo. Every PDF path kept: intake, held files, second-person approval, AI field mapping with its second-draft guard, field maps, validator, PDF fill. Online stays a per-line choice with a later-wave warning (P-114 replaces it with the route model in W1-06/W4).
* **Independent checks.** Review: Ship after fixes, 8.5/10, 0 Must, 1 Major (Preview offered Fill PDF on an Online line). Break: 0 Blocker, 2 Major (older data: a form with no PDF edition releasable; older releases losing their fingerprint, empty submission releasable). All fixed with tests (w102_fix 20/20 and 26 suites green, US$0).
* **Lead FIX (done, 0f54908).** About 122 test-run by-products under `prototype/p2/` taken back to main's versions; one `.gitignore` line stops new stub records.
* **Lead calls.** Dormant extension tables stay until W6 (no migration now). C1.7, C2.10, C2.11, C3.9 and DEMO rows 2 and 13 marked parked. "Portal sheet" wording in case fill goes to W4 (P-113 answer sheet).
* **Capability or scaffolding.** Removal only; nothing new shown to a firm except the later-wave note on Online lines (Capability, P-114).
* **Merge.** Into `lead/2026-10-26-g` (PR #39); merged to main on green CI suites for the exact head. Then `/qa after-merge` (PDF path only) and screens slice 1 starts.
