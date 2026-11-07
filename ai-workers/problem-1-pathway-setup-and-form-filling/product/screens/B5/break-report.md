# B5 Fees on the case page: break report (breaker, 7 Nov 2026; money run, P-278)

**Commit:** 163bd3338 on `claude/hopeful-faraday-hqhzg9`. **Copy:** isolated `brk_b5` on :4446 (never :4400), configured
checkpoint (reset, then load as `user-A`, 95 s). Stopped at the end. Live AI off, US$0, no priced button pressed.
**Scope (P-26):** concept §3 BR-1 to BR-8 and §4 layout. Not findings: paying, firm fees, a fee receipt per line, the
split button, the `basis` field (Q2), no thousands separator ("CAD 1025": a Minor the concept left on purpose), nobody
applying.
**Method:** throwaway scripts outside the repo, using `acceptance/lib/m3.ts` (openCase, answer, prepare, call). An
independent pricer (CAD 100 a person, capped at CAD 500 from 5 people; CAD 85 a person, capped at CAD 170 from 2; no
biometrics under 14 or over 79) checked every group's `total_cents` and its rows' sum. A Playwright check compared every
row, amount, reason, totals line, basis, submission total and case total on the page with `/prepare`, read in the same
run, at 1440 and 1024 px and at 200 % zoom of each (720 and 512 CSS px). axe (WCAG 2.2 A/AA) ran on the panel.
Paths: `S/` = `prototype/studio/`.

## Blockers
None.

## Majors
None.

## Minors
**m1. "Not counted yet" spills over the Why text at 1024 px and 200 % zoom.** I opened a case with a child who has no date
of birth and viewed it at 512 CSS px. Expected: the amount cell wraps or widens. Actual: the cell is 71 px wide and its
text needs 98 px, so it reads "Not countedWaits for …" over the reason. Cause: the Amount column is fixed at 16 %
(`S/web/src/runtime/fees.tsx:66`) and the cell does not wrap (`:84`). It is fine at 1440 px with 200 % zoom (720 px) and at
1024 and 1440 px without zoom. Screenshot (scratch, not in the repo): `wait-512.png`. Severity: Minor (a money cell that
cannot be read cleanly at 200 %; axe does not see it).

**m2. A line's total reads as final while one of its people waits.** Case: principal (40), child with no date of birth,
spouse (39). The submission total reads "Total so far: CAD 470 · 1 fee not counted yet" (good). The line just above it
reads "Biometrics fee: CAD 85 · … 1 × CAD 85 = CAD 85" with no "so far", although it becomes CAD 170 once the child is
14 or older (measured: CAD 285 → CAD 285 + 85 when answered 15). This is challenge M2 one level down
(`fees.tsx:101`). Severity: Minor (the bold total underneath does say "so far").

**m3. A second tab's change does not reach an open page, and nothing says the total is old.** Tab 1 showed "Total for
the case: CAD 555 · 3 submissions". In tab 2 (the same save the questionnaire makes) the child's date of birth was
changed to age 10, and `/prepare` then gave CAD 470. Tab 1 still showed CAD 555 after 6 s and a focus event, with no notice.
It showed CAD 470 only after a reload or after going to Cases and back. Cause: `refetchOnWindowFocus: false` for the
whole app (`S/web/src/lib/api.ts:29`). The concept only promises a re-price "on the next read", so this meets the
concept, but the page can show a wrong case total with no sign. In the same tab, adding a person (by keyboard, through
"Add child") re-priced the block at once (CAD 370 → "Total so far: CAD 470"). Severity: Minor.

**m4. Every split-out submission has the same name, so the fee tables cannot be told apart by ear.** A case split until
each filing is alone has 6 tables whose hidden caption is "Fees for One submission" (`fees.tsx:65`, from the group label at
`S/engine/runtime/filings.ts:249`), under 6 headings that also read "One submission". Only the filing row inside each
table names the person. Severity: Minor (axe passes; the money is right).

**m5. BR-4 is tested only on a stub, although the checkpoint reaches it.** Concept §6 says "BR-4 … cannot be reached on
the checkpoint" (challenge m4 flagged this). Two cases opened on the checkpoint both answer `fees_worked_out: false`:
fs.spouse (a principal, a sponsor and a declared-only child) and sp.outside. The page renders both correctly: "Fees",
then the server's `fees_why` once, with no CAD and no total. But `S/tests/check_c612_fees_browser.ts:171-175` checks BR-4
only on a served stub. Severity: Minor (test evidence, not behaviour).

## What held
* **Amounts against /prepare and the fee table.** No difference in any state measured. Every row's amount and reason,
  each totals line ("label: CAD n", the `why`, the basis), each submission total and the case total matched the API.
  The API matched the independent pricer in all 13 group states, from a family of 6 through to 6 separate submissions.
* **The family maximum.** 6 people: the CAD 500 maximum applies. 5 people: "5 × CAD 100 = CAD 500, not above the family
  maximum" (not shown as applied). Biometrics capped at 3 to 5 payers; exactly 2 payers = 2 × CAD 85, not capped. The
  basis "Per person, with a family maximum of CAD n from n people" appears only on totals lines, never on a person's row.
* **Splits.** Case total CAD 670 → 855 → 855 → 940 → 1025 → 1025 as each filing was split out until all were alone; each
  split group was priced alone. A child-only group shows biometrics CAD 0 ("Under 14"). More splits: "nothing to split"
  (409), including splitting the principal out of a group of one. Two splits fired at once from one read gave 200 and 409.
  A reload fired during a split showed the API's state, and so did Back.
* **Date of birth.** None → "Not counted yet" with no CAD in the row, and "Total so far". Age 15 → capped. 13 years 364
  days → Under 14, CAD 0. 14 today → pays. 79 → pays. 80 → "Over 79". A date in the future, 2010-02-30 and "2010-05" are
  saved with a problem and keep the line waiting (never charged or exempted by guess). "" and null → 400. A stale
  `expectedId` → 409.
* **Trip and limits.** Taking someone off the trip removes their lines and lists them once ("…: no fee. Not travelling
  …"); putting them back restores them. A split survives off-and-back. Limits are held: at most 4 children and 1 spouse
  (422); 6 people is the maximum.
* **Roles.** `/prepare` and `/split`: `user-P` and `user-Q` → 403, `user-A`, `user-B` and `user-C` → 403, the solo firm → 404,
  no actor → 401. On the page the client sees no fee block and no CAD. A configuration actor opening `/cases/:id` is
  switched to the case officer before any read. The client's own reads carry no money.
* **Text.** Names of 120 characters with no break, Arabic, and Japanese with `<b>`, `&amp;` and an emoji: the text is
  escaped and wraps inside the block. A right-to-left override character is refused. Names over 120 characters → 400.
* **Sizes, keyboard, axe.** No sideways scroll from the block at 1440 or 1024 px, or at 200 % of either (the 200 %
  sideways scroll on the long-name case comes from another panel, outside B5). The keyboard stops in the block only on
  the source links, each with a 2 px focus outline. No duplicate ids. axe found 0 violations in the waiting, all-split,
  not-worked-out and 512 px states. `/prepare` takes 0.2 to 0.7 s for 6 people in 6 groups.
* **BR-7, BR-8.** Each source once; the page date reads "page date 2026-03-30", never "read". The basis sentence appears
  once. There is no button in the block.

**Count:** 0 Blockers, 0 Majors, 5 Minors.
