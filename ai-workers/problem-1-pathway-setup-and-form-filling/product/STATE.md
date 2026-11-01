# State — one page (rewritten by the tech lead, P-188; the history is git)

updated: 2026-11-01 19:05 UTC (overnight Lead hand-over to a fresh Lead, founder's ask) · milestone: **M2 — Super Admin configuration**, plus the Visitor visa M3 path · how we work: **`WAY-OF-WORKING.md` (lean model, P-224)** · row owners: top of `BACKLOG.md`

## Start here (fresh `/lead`)
1. Founder's first message: "Resume from STATE. Run builders and qa in the cloud, one fresh session per row. Process frozen until 15 Nov."
2. Read `WAY-OF-WORKING.md` (merged in #347), then this page. Run `/usage` in the first hour to see where the plan goes (token analysis: session notes, factory-recommendation-2026-11-01).
3. Start builders **in the cloud**, one fresh session per row, under yourself; size by the measures (add while batch failures < 10% and approved→merged < 1 h). One qa in the cloud. The Mac runs only the Lead and the :4400 demo.
4. Watch with event monitors and one 20-minute check; no minute-level sweeps. Hand over at about 250k tokens.

## Progress (from `progress.sh` on main, 1 Nov 19:00 UTC; qa has not yet scored tonight's merges)
M2 30/56 Works · R1 6/8 · M3 1/16. qa-2's #353 (queued) moves C1.5, C3.1, C3.13, C11.16 to Works. Merged tonight and awaiting qa: C3.12 (#313), C3.6 (#329), C6.11 (#330), C11.1 (#339), C3.1 (#316), C3.13 (#318), C11.16 (#326).

## Open PRs and their next step (every branch pushed; Handover comments on each)
| PR | Row | State | Next step |
|---|---|---|---|
| #353 | qa after-merge | queued | merges itself |
| #340 | C11.10 | queued | merges itself |
| #349 | C2.12 | approved | re-label once its GitHub check is green |
| #319 | C4.11 part 1 | approved; main merged in | check green → re-label; then parts 2a/2b/3 (local commits listed in its Handover) as one PR; part 3 = option (a) on #319 |
| #325 | C6.4 (+ holders fix) | needs reviewer on current head | reviewer → label. Carries old #283 (C6.12 filings and fees) |
| #356 | C6.12 /prepare + C11.6 | draft, approved r2, **migration read: OK**, DIRTY | after #325 merges: merge main, run-suites --changed, ready, label |
| #358 | C7.3 answer sheet | draft, approved r3, **migration read: OK** | merges **after #356** (one migration at a time) |
| #357 | C7.7 part 1 | draft, 15/18 | build the two agreed fixes: IMM 5476 representative block from the firm record; `person.has_children` derived + `derive_inverse` in `p5/transforms.ts`; 18th check waits on C7.6 readiness |
| #350 | C7.6 part 1 readiness engine | open | review → label; #357's last check needs it |
| #336 | C4.4 parts 1+2 (carries #321) | approved, DIRTY | merge main (likely `api/src/main.ts` module list), checks, label; then C6.9 |
| #331 | C11.9 | round-3 fixes, no Approve yet | reviewer → label |
| #351 | C3.3 | open | review → label |
| #344 | C11.13 | open | review → label |
| #345 | C3.4 (part, draft) | draft | finish the row (one PR) |
| #348 | C4.1 (replaces #195) | draft | reviewer → label (section order already on main via #284) |
| #347 | lean rules (P-224) | **merged** | — |

## Visitor visa path order
C6.11 ✓ merged → C6.12 + C6.4 (#325) → /prepare + C11.6 (#356) → C7.3 (#358) · C7.6 (#350) → C7.7 (#357) → C8.1 signing → C8.2 filing record → C9.2 → C10.2 demo story. Parallel: C6.5 (reads documents; after #325), C6.9 (eligibility; B3c's next).

## Known issues to fix first
* **`api/src/main.ts` module list** conflicts whenever two PRs add a controller (4 conflicts on 1 Nov). Fix: each feature registers its module in its own file (or a generated list) so PRs stop touching one line.
* **GitHub job slots:** every PR now runs 4 shards; a free account runs about 20 jobs at once, so batches can wait behind PR checks. With fewer builders it is fine; if not, run PR checks on 2 shards.
* **Schema drift on main** (`DROP canonical_field_name`), raised in #356's Questions.
* `check_forms_c31_formats.ts` is quarantined (#333): take it out of `QUARANTINE` now that #316 is merged.
* **Batch b489cc2d79 (#353 + #340) failed** on `check_forms_c36_rule_facts_browser.cjs` "after Propose, focus lands on the row's To review link" (C3.6, merged in #329): either #340 (C11.10) changes that page's focus, or the check is timing-sensitive. Mergify is splitting the batch; if #340 alone fails it, #340's owner fixes it; if it fails on main too, quarantine with a fix row.
* Measure batch failures for 24 h after #337 (was 37% of finished batches since 31 Oct).

## Decisions waiting for the founder
* Sonnet 5.5 trial (two builders): both reached a PR; slower to a finished PR than Opus builders; small sample — decide after more rows.
* Moving the nightly full run to GitHub (free now).

## Resources (1 Nov 19:00 UTC)
Disk 11 GB free (alarm under 10 GB; 1.9 GB of old snapshots moved to `~/Archive`); weekly plan about 64% (resets 5 Nov). Repository is public; Mergify Open Source plan; 3 batches at once (#341); every PR runs its suites on GitHub (#337).

## Lessons of the night (detail: the session notes folder, files overnight-lead-log and factory-recommendation-2026-11-01)
Verify numbers before advising (a fresh verifier found 5 wrong claims) · archive sessions by exact name, never by position · a long, often-woken Lead session is the biggest token sink · the queue, not building, was the bottleneck (81–85% of PR time) · builders run in the cloud, never on the Mac.
