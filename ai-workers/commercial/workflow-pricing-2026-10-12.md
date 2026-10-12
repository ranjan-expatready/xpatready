# Workflow pricing: the billable prepared file, usage and warnings, the SA-3 and SA-4 check, and how the numbers are set

**Date:** 12 Oct 2026. **Author:** commercial-strategist (maker) for the Lead. **Status:** draft for the adversarial checker and the Lead. Nothing here changes `../../commercial/plan.md`, `model.xlsx`, any other Workstream 2 file or any team document on its own (README §2 D4; README §0 rule 12a). **Implements:** AIW-D111 (the founder, 12 Oct 2026), with the founder's answers AIW-D114 (unit once per application), AIW-D115 (every plan includes the AI team) and AIW-D116 (discounts on the plan price only), read with AIW-D60 (superseded in part by D111), AIW-D92 (four classes; no "AI price"), AIW-D94 (no counsel, no consultant conversations, nothing waits on validation) and AIW-D106 (simplest complete design, proportionate safeguards through the existing product).

**Sources.** Team documents from the newest snapshot only: `sources/drive-snapshot-2026-10-11/02-functional-requirements/super-admin/SA-03-subscription-plans-and-entitlements_v2.17_2026-10-10.md` ("SA-03 v2.17") and `SA-04-saas-billing_v2.17_2026-10-10.md` ("SA-04 v2.17"); L-numbers are lines in those files. Founder Decisions Log v1.5 (`01-techno-functional/07-Founder-Decisions-Log.md`). Our own: `../requirements/AW-01-firm-ai-assistants_v0.1.md` (document version 0.7), the change notes in `../requirements/change-notes/`, `price-card.md`, `ai-value-map-2026-10-12.md`, `../research/rules-and-ai-positioning-2026-10.md`, `../../commercial/plan.md` v1.1. One web source, cited where used.

**Labels.** **Evidenced** = a cited requirement, decision or published source says it. **Proposal** = our suggestion, not decided. **Assumption** = a stated guess with its reason. **Unknown** = nobody has the answer. **[I]** = our own inference or arithmetic. Legal points are the Lead's guidance: "Unconfirmed: no counsel (AIW-D94)". No personal names (README rule 10): worked examples use "Firm A", "the case officer", "the Owner".

**Boundary.** Billing, plans, invoices and the payment processor are the team's subject (Workstream 1). This file states what AIW-D111 needs from them and where their documents conflict; it writes **no change note** to SA-03 or SA-04 and designs no billing mechanics (11 Oct scope lesson; README rule 11). What it does define is the billable unit and the records that feed it, because the unit is produced by our Case Officer's AI (AW-1-75).

---

## Summary (10 lines)

1. **The unit (AIW-D114):** a billable prepared file is counted **once per application**, at one event: the case officer's acceptance of the Case Officer's AI readiness report for that application (AG-7-93). In AG-07 an application is a **filing** (AG-7-45; a simple case has one filing, and a different program is a new case, §3.0). Re-runs on the same application never count again, so retries, duplicates and re-work after our own errors cannot consume units, and nobody has to judge whose error it was.
2. **It counts only if the AI team did the work:** a file whose AI steps fell back to the manual path because of a provider error, a safety check, a spend cap or an Expat Ready stop is not billable. Abandoned, failed, rejected and duplicate runs never reach the counting event.
3. **This closes our open question F3** (how many days before a re-run counts again): no window is needed (Proposal).
4. **Usage is shown where the firm already looks:** the billing screen (SA-4 §3.13), the readiness report itself, and the firm's AI reports (AG-14-39). Warnings go at 80 % of the allowance and when it is used up, before any paid extra file, through the billing notices SA-4 already keeps.
5. **No new setting:** an Owner who does not want extra files upgrades (applies at once, SA4-D24) or switches the Case Officer's AI off (AW-1-125). Both already exist.
6. **SA-3 and SA-4 do not fit as written.** SA-4-44 and SA-4-1 (one monthly and one yearly price only) leave no place for an overage price; SA-3 allows "Four limits only" with hard or warn modes, and its downgrade check would block a move to a lower plan over a monthly count. SA-3 itself anticipates the fix: "a new metered metric is a new row and a fixed mode".
7. **Eighteen team changes** are listed in §3.3, from a fifth "metered" plan quantity to a usage line on the invoice and the subscription terms.
8. **Numbers:** the overage price sits between a floor set by total cost to serve and a ceiling set by measured benefit; the allowance is set near the measured typical month. CAD 25–40 stays illustrative. The product's own records measure both sides; nothing waits on outside validation (AIW-D94).
9. **Wording:** "workflow pricing", "prepared files", "extra prepared files". Never "AI price", "AI credits", "pay per AI". Proposed additions go to the one say / never-say home (positioning file §(c)2).
10. **Strongest objection:** "An allowance is rationing and I still check every file." It stands until review minutes are measured (gap G2 in the value map).

---

## Plain words used below

- **Readiness report:** the one item per application (filing) that lists every value, source, finding and client-facing send when a file reaches "ready for review", built by rules (AW-1-72), with at most one AI-written summary paragraph (AW-1-73).
- **Acceptance:** the case officer accepting that report; it is also the submission for internal review, "one act, recorded once" (AG-7-93, CN-AG-07 change 3).
- **Allowance:** the number of prepared files a plan includes each month.
- **Extra prepared files (overage):** prepared files above the allowance in a month, each charged at the plan's overage price. On screens we say "extra prepared files", not "overage".
- **Manual path:** what happens when an AI step does not run: the person does that step by hand (AW1-BR-16; AG-11-71).
- **Run record:** the Case Officer's AI's own record of one job on one case (`PersonaRun`, AW-01 §7).
- **Application:** the product's own application record. In AG-07 v2.7 a **case** is "one application, for one destination and program" (§3.0, L309–311) and "holds one or more **filings** — each one application to one authority with its own pack row, questionnaire, checklist, forms, fees, deadlines and decision" (AG-7-45, L671; §3.0, L317). So the billable unit is one **filing** (`filingId`). A simple case has one filing; a multi-level route (for example a provincial nomination, then the federal application) has two filings in one case; a different program (for example a work permit, then permanent residence) is a new case with its own filing (§3.0, L311).

---

## 1. The billable prepared file, defined exactly

### 1.0 What an application is, confirmed against AG-07 (AIW-D114)

- **The record.** The application is the **filing** (AG-7-45): "Every filing-owned record SHALL carry its `filingId`". AG-07 also says "where this document says 'the case', it applies per filing when a case has several" (§3.0, L317).
- **How the readiness report attaches.** AG-7-93 (CN-AG-07 change 3, our wording) attaches acceptance to "a readiness report prepared for the case". Under L317 that reads per filing when a case has several, but the requirement does not say so explicitly. **Our knock-on (Proposal):** the `READINESS_REPORT` item (AG-11-112, CN-AG-11 change 6) and the run's usage record carry the `filingId`, and AG-7-93's wording says "for the case, or for each filing when it has several". This is our subject (CN-AG-07, CN-AG-11), not a team change.
- **Re-runs.** Any re-run on the same filing is never billed (AIW-D114).

### 1.1 The one event that counts

**Proposal (amends our AW-1-75).** A prepared file is counted when, and only when, all of the following are true at the moment the acceptance is recorded:

| # | Condition | Record that shows it (cited) |
|---|---|---|
| C1 | A case officer **accepts a readiness report for one application (filing)** under `agent/case:review-submit`. This is the single counting event. | AG-7-93 (CN-AG-07 change 3): "that acceptance SHALL be the case's submit-for-internal-review (§3.6): one act, recorded once"; the approval item of kind `READINESS_REPORT` (AG-11-112, CN-AG-11 change 6) and its audit entry |
| C2 | The report was **prepared by the Case Officer's AI**: the item carries a `personaRunId` whose run is a Case run of the Case Officer's AI. A report a person prepared by hand never counts. | `ApprovalItem.personaRunId` (AW-01 §7 changed-fields table, AG-11-112); `PersonaRun.personaKey` CASE, `runType` CASE (AW-01 §7) |
| C3 | **No earlier prepared file has been counted on the same application (filing).** Each application is billable at most once (AIW-D114). | `PersonaRun.usage.preparedFileCounted` (AW-01 §7) on every earlier run with the same `scopeRef` and `filingId`; Proposal: a unique count per firm and filing (see 1.5 for the record) |
| C4 | **Every AI step the run attempted for this case finished with a usable result** (or the document itself was unreadable). See 1.2 for the exact test. | `AiRunLog` rows of the run (`personaRunId`, `actionId`, `outcome`; AG-11 v1.12 §7 as amended by CN-AG-11 changes 7, 11, 14); `PersonaRun.pauseReasons[]` |
| C5 | The firm's subscription is **not in Trial and not on a $0 Internal plan** for the *charge*. The file is still counted and shown in those states; it is never charged as an extra file (see 1.4). | Subscription status `TRIAL` (SA-4-11, SA-04 v2.17 L448); Internal plans "receive no invoices" (SA-4-46, L499) |

The count belongs to the **usage month** in which the acceptance is recorded (the audit entry's time). Proposal: usage months run from the subscription's billing day, monthly, for monthly and yearly plans alike, so a yearly firm also has a monthly allowance; unused allowance does not carry over (simplest; it matches the shape of the nearest competitor, "plans … sized by applications per month (10 / 25 / 55). Extra application CAD 29", Visto, vendor claim, `price-card.md` page 2).

**Why acceptance, and why once per application [I].**
- It is the moment the firm says the AI team's work is usable: the officer submits the file for review on the strength of it (AG-7-93). Nothing earlier (a run starting, a model call, a draft) is a finished piece of work.
- It is already "recorded once" by the team's own rule (AG-7-93), so a double click or a repeated request cannot create two counts.
- **Once per application** (AIW-D114) means a re-run on the same application is never billed, whatever caused it. That removes every argument about retries, duplicates and "whose error was it". It also closes AW-01 §13 F3 ("within how many days a re-run on the same case is not a new prepared file") with no window to set.
- **Several applications, several units.** A case with two filings (for example a provincial nomination, then the federal application) counts twice, once per filing; a new program is a new case and counts again (AIW-D114).
- **What we give up:** genuine second preparations of the same application (for example after the client changes everything) are not billed. A re-application is a new case and a new application (AG-7-13, *re-application of* link; SA-03 v2.17 §3.2, L294), so it counts once.

### 1.2 What never counts, and how the records show it

The founder's list (AIW-D111: "system retries, failed runs and corrections of our errors must not consume additional units") plus the cases named in the brief.

| Never counts | Why it cannot reach the count | How the existing records recognise it |
|---|---|---|
| **System retries** (a model call or an automation step tried again) | Counting is tied to acceptance per application, not to calls or runs | Repeated `AiRunLog` rows for the same `runId` and `actionId`; `AutomationRun` attempts (AG-11-34). None is an acceptance |
| **Failed runs** | A run that stops never produces an accepted report | `PersonaRun.state` STOPPED with `stopReason`; runs parked on the dead-letter pattern (AG-11-27, AW-1-54) |
| **Provider outages** | Condition C4: if any AI step for the case ended on the manual path because the provider failed, the file is not billable even if a person finished it and accepted the report | The **last** `AiRunLog` row for a given run and `actionId` has outcome `PROVIDER_ERROR` (no later `OK` for the same action). A transient error that a retry fixed does not void the file |
| **Expat Ready stops** (emergency stop, provider record withdrawn) | Condition C4 | `PersonaRun.pauseReasons[]` held `PLATFORM_STOP` or `PROVIDER_RECORD_WITHDRAWN` during the run (AW-1-11; CN-AG-11 change 6; AW-1-56) |
| **Our safety check dropped an AI output** | Condition C4: the AI's output was unusable, which is our error | `AiRunLog.outcome` `DROPPED_FAILED_CHECK` (CN-AG-11 change 11; AW-1-113) as the last row for that action |
| **A spend cap stopped an AI step** (Expat Ready's platform cap or the firm's own stricter cap) | Condition C4: the person did that step by hand (AW1-BR-16) | **Gap:** no `AiRunLog` outcome records a call skipped for a cap; the expert's question record has `SKIPPED_CAP` but a run does not. Knock-on K7 (our subject, CN-AG-11) |
| **Duplicate runs** (two runs on the same application, a double trigger) | Condition C3: only the first accepted report on an application counts; the double-run guard already skips repeated acts | `PersonaRun.guardSkips[]` (`actGuardKey`, `matchedRunId`; AW-01 §7; AG-11-114); C3's check on earlier runs with the same `scopeRef` |
| **Abandoned jobs** (case withdrawn or closed, client paused, retainer ended, delegation ended, item never decided) | No acceptance happens | Case run "Ends or stops when … client paused; case closed or withdrawn; retainer ended" (AW-01 §6, run-type table); readiness item cancelled with `DELEGATION_ENDED` (CN-AG-11 change 6) or still waiting |
| **A rejected report** | Rejection is not acceptance | Item status `REJECTED` with `rejectReason` (AG-11 v1.12 §7); "Given the officer rejects it, Then nothing is counted" (US-53) |
| **Corrections of our own errors** (re-work after the reviewer or the officer finds an AI mistake) | Condition C3: the re-run is on an application already counted | See 1.3 |
| **A file prepared without the Case Officer's AI** | Condition C2 | No `personaRunId` on the item; "no prepared-file count or persona run exists" (AW-01 US on the seeded chase, L694) |

**Not voiding (Proposal, with reasons):**
- `UNREADABLE` (the client's scan cannot be read): the document's fault, not ours; the person handles that one document.
- The firm itself switching AI or the Case Officer's AI off during a run: it pauses the run (AW-1-11, AW-1-125) and the steps resume when switched back on; nothing fell back because of us. [I] A firm gains nothing by switching off to avoid a count, because the count comes from acceptance.

### 1.3 How a correction-caused re-run is recognised (for reporting, not for billing)

Because no re-run on a counted case is ever billed, billing never depends on telling the cause apart. The product should still recognise correction-caused re-runs, so the firm's usage view can show "re-runs: 2, not charged" and so Expat Ready can measure quality (value map c.3). From existing records:

A run is a **re-run** if an earlier run on the same application (`scopeRef` and `filingId`) has `preparedFileCounted` true. It is **correction-caused** if, between that earlier acceptance and the new run's start, any of these is recorded:
1. **The reviewer rejected the review round** "back to in-process with reasons" (AG-07 v2.7 §3.6, L498, quoted in CN-AG-07 change 3);
2. **A value from the accepted report was corrected**: a new value version on a field the report listed, which makes dependent drafts stale and refreshes them (AG-11-61; AIW-D100 point 5; `valueVersionsUsed[]`, CN-AG-11 change 16);
3. **A finding was raised on the accepted file** by the reviewer or the Checker (AG-07 v2.7 §3.6; AG-7-61);
4. **Readiness lines were rejected with a reason** on the earlier report ("reject with reason", AW-1-72).

Whether the error was the AI's, the firm's or the client's stays in the free-text reasons. **Unknown** whether rejection reasons are coded anywhere; a coded reason would sharpen the quality measure but is **not needed for billing**, so it is not requested here.

**No credit-back of the first unit (Proposal).** The founder's words are "must not consume *additional* units". The first unit stays. A file wrongly counted (for example a counting fault) is put right through the existing refund exception for "billing error" with a credit note (SA-4-49, SA-4-62); no new mechanism.

### 1.4 Edge cases

| Situation | Rule (Proposal unless cited) |
|---|---|
| Trial (SA-4 §3.8) | Files are counted and shown against the plan's allowance; **no extra file is charged in Trial**, because a trial has no charge until it ends (SA-4-30). Model cost in a long trial (up to 90 days, SA-4-80) is bounded by the spend caps (SA-12-33(c), CN-SA-12 change 3) |
| $0 Internal plan | Counted and shown; never charged ("receives no invoices", SA-4-46) |
| Upgrade in the month | The higher plan's allowance applies to the current usage month from the moment the upgrade takes effect (at once, SA4-D24); files already counted stay counted; no proration of the allowance |
| Move to a lower plan | Its allowance applies from the renewal when the move takes effect (SA-3-60); the month's count never blocks the move (team change T5) |
| Case passed to another case officer | Still the same application: C3 applies; the new officer's run is never a second unit |
| Change of stream (old file closes, a linked new file opens) | A new case with its own filing is a new application, so it counts once when its report is accepted (AIW-D114; AG-7-53 *stream changed* link). *Superseded:* the earlier "not a new unit" reading (12 Oct, before AIW-D114) |
| Case withdrawn after the count | The unit stays: the work was done |
| Acceptance by someone other than the delegating officer | AW-1-75 names the delegating officer. **Unknown** whether another holder of `agent/case:review-submit` can accept the item; if so, the acceptance still counts once (the work is the same) |
| Acceptance undone | **Unknown** whether AG-07 allows a submission for review to be withdrawn. If it does, the count stays (the next acceptance on the same application is a re-run) |

### 1.5 The record that holds the count (a need for the team)

The count must be one row per firm and application (filing), linked to the run, the acceptance and the usage month, and later to the invoice line. Our run record already carries `usage.preparedFileCounted` (AW-01 §7, `PersonaRun`); the billing side needs a usage record per firm per usage month (team change T7). Proposal for our side: add to `PersonaRun.usage` the reason a file was not counted (`notCountedReason`: RE_RUN / MANUAL_PATH_PROVIDER / SAFETY_DROP / CAP / PLATFORM_STOP / NOT_ACCEPTED) so the firm's view can show it (knock-on K3).

---

## 2. How usage is shown, and the warning before any paid extra file

**Principle (AIW-D106 point 4):** reuse screens, records and notices that exist; add one line where a firm already looks; no new approval and no new setting.

### 2.1 Where the firm sees its usage

| Place (existing) | What is added (Proposal) | Who sees it |
|---|---|---|
| **The firm's billing screen** (SA-4 §3.13, SA-4-54; "always on, in every plan (SA-3-35)") | Under "Plan and price": *"Prepared files this month: 7 of 10 included. Extra prepared files so far: 0 (CAD [price] each). Month resets on [date]."* Below it, a link to the list of this month's counted files and of files not counted, with the reason (1.2) | Owner and Admin (both already see plan and price, SA4-D23). Invoices stay Owner only |
| **The readiness report**, at the moment of acceptance | One line for the officer: *"Accepting submits this file for review. It will be prepared file 8 of 10 included this month."* Once the allowance is used: *"… prepared file 11; your plan includes 10, so this is an extra prepared file at CAD [price]."* Re-runs read: *"Already counted on this case; not counted again."* | The accepting officer |
| **The firm's AI reports** (AG-14-39, CN-AG-14 change 2) | Prepared files per month, re-runs not charged and files not counted with reasons, as firm-wide figures (never per person, AG-11-49) | Holders of `agent/report:view.all` |
| **Expat Ready's per-firm panel** (SA-3-20, SA-03 v2.17 L490) and platform analytics (CN-SA-09) | The firm's usage month against its allowance; across firms, aggregated | Support, account managers, Billing |

### 2.2 The warnings

| When | What | Channel (existing) | Recipients |
|---|---|---|---|
| The month's count reaches **80 % of the allowance** | *"Your firm has used 8 of the 10 prepared files in your plan this month. Extra prepared files cost CAD [price] each. To include more, change plan; to stop extra files, switch off the Case Officer's AI under Advanced."* | A billing notice of a new type, sent once per usage month (`BillingNotice` "prevents duplicates", SA-04 v2.17 §7 L624), plus the in-app banner pattern the team already uses for trials (SA-4-82) | Billing email, Owner and Admins (the recipients SA4-D8 uses for money notices that need action) |
| The allowance is **used up** (the next accepted file would be the first paid extra one) | *"Your plan's 10 prepared files for this month are used. From the next one, each is an extra prepared file at CAD [price], charged on [date]."* | Same; plus the line on the readiness report at acceptance (2.1) | Same |
| The end of a usage month with extra files | The count and amount appear on the billing screen; the invoice line follows (2.3) | Billing screen; invoice email (SA-4-53) | Owner and billing email |

**Why warning, not consent (Proposal).** AIW-D111 says "warn before paid overage begins". A consent step per file would add an approval for one concern, which AIW-D106 point 4 rules out, and the firm already has two controls: the Owner can **upgrade** (applies at once, SA4-D24; the price difference is shown before confirming, SA-4-68) or **switch the Case Officer's AI off** under Advanced (AW-1-125, "which the Owner sets, audited"). The warning names both.

**The model-cost cap must not stop paid work (knock-on K6).** The platform's per-firm monthly spend cap stops new model calls at 100 % (SA-12-33(c), CN-SA-12 change 3). Under workflow pricing a firm in a busy month is paying for its extra files; a cap sized to the plan alone would stop the work it is paying for. The cap's value should be set from total cost to serve at the allowance plus a realistic number of extra files, and its purpose kept to runaway protection (the per-run cap, AW-1-54).

### 2.3 The invoice line

Each usage month with extra prepared files produces one line: *"Extra prepared files, [month]: 4 × CAD [price] (plan includes 10; 14 prepared)."* Plain words, no "AI" (§5). Tax follows the invoice's existing rules (SA-4-51). How the line reaches the processor is the team's (team change T10).

---

## 3. Compatibility with SA-3 and SA-4, clause by clause

**Reading rule.** AIW-D111 says: "identify any required team changes rather than assuming overage already fits SA-4-44". Billing is the team's subject, so each conflict below is stated for the team with the change it needs; no change note is written (README rule 11; brief).

**Founder-level background.** FD-18 already shapes pricing as "Per-seat tiers by firm size … plus metered add-ons for consumption rails (e-sign envelopes, SMS, storage overage)" (Founder Decisions Log v1.5, L54). The team's SA4-D1 then chose "**Add-ons are not sold** in Release 1" (SA-04 v2.17 L42), and the business plan records the tension: "FD-18 includes add-ons; SA-04 says none. The founder decides" (`plan.md` v1.1 §3). AIW-D111 is that decision for prepared files: metered usage inside the plan, not an add-on.

### 3.1 SA-03 Subscription Plans and Entitlements, v2.17

| # | Clause (ID, line) | Exact words | Verdict | Team change needed |
|---|---|---|---|---|
| S3-1 | SA3-D6 (L52); SA-3-42 (L518) | "A firm gets **exactly what its plan includes**. No per-firm exceptions and no custom plans per deal." | **Fits.** The allowance and overage price are the same for every firm on a plan | None. No per-firm top-ups: the only ways above the allowance are extra files or a higher plan |
| S3-2 | SA3-D14 (L74); SA-3-4 (L464) | "**Four limits only:** staff seats, active individual cases, active corporate cases, document storage." | **Conflicts.** The prepared-file allowance is a fifth quantity on the plan | **T1.** Add a fifth plan quantity, *prepared files per usage month*, per plan version |
| S3-3 | SA3-D15 (L75); SA-3-5 (L465); SA-3-39 (L515); BR-5 | "**Limit modes are fixed for the whole platform** … seats, active individual cases and active corporate cases are hard … storage is warn" | **Conflicts.** The allowance must never refuse anything; it counts and charges | **T2.** Add a third fixed mode, *metered*: the action is never refused; the count is kept per usage month; the count above the quantity is billed at the plan's overage price |
| S3-4 | §11 Scalability (L757) | "**Limits as rows:** a new metered metric is a new row and a fixed mode, not a plan schema change." | **Fits; the team anticipated this.** | T1 and T2 follow this pattern |
| S3-5 | SA-3-6 (L466) | "Every limited action is checked on the server at the moment of the action … No limit may be stored but unenforced." | **Needs wording.** A metered quantity is counted, not refused | **T3.** State that for a metered metric, "enforced" means counted exactly once per event and billed, never refused |
| S3-6 | SA-3-7 (L467); §7 `UsageCounter` (L613) | "A `UsageCounterService` maintains per-(firm, metric) counts, updated on create and delete/deactivate"; `UsageCounter` "firmId, metric, currentValue, updatedAt" | **Gap.** The counter holds a current value; a metered metric needs a count per usage month that resets, fed by one event (AG-7-93 acceptance meeting §1.1) and never decreased by deletion | **T4.** A per-month count for the metered metric, written once per application (filing) from the counting event (§1.1, §1.5; AIW-D114) |
| S3-7 | SA-3-54 (L534) | "the higher one MUST have every feature that is on for the lower one and, for every metric, a limit at least as high" | **Fits.** Higher plans get an allowance at least as high | None |
| S3-8 | SA3-D8 (L54); SA-3-43 (L523) | "**additions** take effect immediately; **removals** take effect at each firm's first renewal at least **30 days** after approval" | **Fits.** Raising an allowance applies at once; lowering it waits for renewal with notice | None. Consequence for setting values in §4.5 |
| S3-9 | SA-3-58 (L540); SA3-D17 (L77) | "`checkDowngrade(firm, targetPlan)` returns every limit on which the firm's current usage is over the target plan's limit … SA-4 MUST NOT book a move to a lower plan … while any conflict remains" | **Conflicts.** A busy month's prepared-file count would block an Owner from moving down | **T5.** Exclude metered metrics from the downgrade check |
| S3-10 | SA-3-59 (L541) | "every limit check for the firm uses the lower of the current and the target plan's limit" from booking | **Conflicts in effect.** Applying the lower allowance from booking would charge extra files before the firm has moved | **T5** (same change): metered metrics keep the current plan's allowance until the move takes effect |
| S3-11 | SA-3-20 (L490); §3.7 (L390–395) | "an **over-limit firms list** … and (b) per firm: usage vs limit and mode per metric" | **Fits, with one row.** A firm using extra files is not "over limit" | **T6.** The per-firm panel shows the metered metric's month count and allowance; the over-limit list does not list metered metrics |
| S3-12 | §3.3 catalogue row 30 (L345); AW-1-57 | "AI Doers (Reader, Sorter, Drafter, Checker — one switch, AG-16-35) | extra · Company settings … | Sellable — locked off until the provider terms are recorded (AG11-D13)" | **Fits as configuration, with a reading.** AIW-D111 says "subscription plans with the AI team included". *Decided by AIW-D115:* every plan sold includes the AI team. Then row 30 is placed on every plan at launch configuration ("the product owners place features on each plan when the launch plans are configured", L312) and keeps its lock until the provider record exists | **T6a (configuration, not a document change; AIW-D115).** Row 30 on every Active Public plan; every plan carries an allowance above zero, higher plans a larger one |
| S3-13 | SA-3-35 (L511) | "the Minder's standard deadline and expiry reminders … always on" | **Fits.** The product's deadline watching is never priced (AIW-D37) | None |
| S3-14 | SA-3-34 (L510); SA3-D16 (L76) | "An excluded feature is always shown to the firm **locked**, with an upgrade prompt naming the lowest plan on the ladder that includes it." | **Fits as a pattern.** The 80 % and used-up warnings name the next plan up with its allowance | None beyond T11 |
| S3-15 | SA-3-41 seats (L517), with CN-SA-03 change 2 | "An AI assistant's delegation is not a user and never counts as a seat" (proposed by us) | **Fits.** Workflow pricing tracks files, not seats | None |

### 3.2 SA-04 SaaS Billing, v2.17

| # | Clause (ID, line) | Exact words | Verdict | Team change needed |
|---|---|---|---|---|
| S4-1 | **SA-4-44** (L497); SA4-D1 (L42); §3.1a (L286); BR-18 (L570) | "Nothing is sold outside a plan: there are no add-on prices in Release 1." | **Conflicts in substance.** Read literally, an overage price set *on the plan* is not "sold outside a plan". But the team removed every per-use price ("Withdrawn in v2.1: … add-on prices", §7 L626), so no per-use charge exists to hang it on. AIW-D111 forbids assuming it fits | **T8.** Keep SA-4-44 for add-ons and add: "A plan's prepared-file allowance and its overage price are part of the plan, not an add-on (AIW-D111)." |
| S4-2 | §0.1 deferral row (L104) | "Add-ons (e.g. SMS, WhatsApp sold separately) | SA4-D1, SA3-D6 | A capability needs per-use pricing; review together with SA-3's deferred per-firm exceptions" | **The reopen condition has occurred** for prepared files ("A capability needs per-use pricing") | **T8** (same): split the row; prepared-file overage leaves the deferral list; SMS and WhatsApp add-ons stay deferred |
| S4-3 | **SA-4-1** (L434); SA3-X2 | "Each plan has exactly one monthly and one yearly price, in the platform currency (CAD for Release 1). A third price, or a price in another currency, is refused." | **Conflicts.** An overage price is a third price | **T9.** A plan with an allowance also has one overage price per extra prepared file, in CAD |
| S4-4 | SA-4-75 (L528) | "each plan's monthly price MUST be higher than the monthly price of the plan below it" | **Silent on overage.** | **T9** (same): Proposal: a higher plan's overage price is never higher than the plan below's (an upgrade never makes extra files dearer) |
| S4-5 | SA-4-2 (L435) | "Prices are pushed to the payment processor automatically when they take effect" | **Fits as a pattern.** | **T10.** The overage price is pushed the same way, as a usage price on the processor |
| S4-6 | SA4-D5; SA-4-48 (L501) | "A price change on a plan with firms is a request approved by an Owner … each existing firm moves to it at its first renewal at least 30 days after approval" | **Fits.** Covers the overage price too | State that SA-4-48 covers the overage price (part of T9) |
| S4-7 | §3.4 (L308) | "The processor charges the card at each renewal and produces the **invoice and receipt**" | **Gap.** Extra files are known only after the usage month; they are charged in arrears. For monthly plans that fits the next renewal invoice; for yearly plans a renewal is a year away | **T10.** Charge extra files monthly in arrears for every plan. **Unknown** whether the processor can bill a monthly usage price on a yearly subscription; the processor documents usage meters and metered prices ("meters attach to prices", Stripe, *Usage-based billing*, https://docs.stripe.com/get-started/use-cases/usage-based-billing, accessed 12 Oct 2026) but we found no page confirming mixed intervals. The team proves it in test mode with test clocks, as SA4-X12 already requires for plan changes |
| S4-8 | SA-4-16 (L455); §7 `Invoice` (L615) | "lines (plan, discount, each tax)" | **Conflicts.** No usage line | **T11.** Add a usage line (count, included, extra, unit price) to `Invoice` lines and to SA-4-16 |
| S4-9 | SA-4-61 (L514); SA4-D14 | "a description (plan and billing period); the price; any discount" | **Gap.** | **T11** (same): the description also states the extra prepared files and their unit price; wording per §5 |
| S4-10 | §3.3; SA-4-11 (L448) | "Each firm has one current subscription with: plan, billing period, price, discount, status …" | **Gap.** No usage record | **T7.** A usage record per firm per usage month: allowance, count, extra count, unit price, invoice reference; written from the counting event (§1.1) |
| S4-11 | SA4-D24; SA-4-29 (L474) | "A change that **increases what the firm pays now** takes effect at once … a change that **keeps it the same or reduces it** takes effect at the next renewal" | **Fits.** | State the allowance rule on upgrade and downgrade (§1.4) in §3.7 (part of T12) |
| S4-12 | SA4-D28; **SA-4-76** (L529) | "A move to a lower plan … MUST NOT be booked while SA-3's downgrade check reports any limit the firm is over on the lower plan" | **Conflicts** (as S3-9) | **T5** |
| S4-13 | SA-4-43 (L496); SA4-D30; BR-18 | "Discounts appear on invoices and in the billing screen and never change entitlements." | **Silent.** Does a discount apply to extra files? | **T13 (AIW-D116).** Discounts apply to the plan price only, never to extra prepared files (extra files track cost to serve; founding-firm offers are on the plan, `plan.md` §3). Includes 100 % free months (SA-4-87) |
| S4-14 | §3.8; SA-4-30 (L475) | "A plan's trial days start the firm in Trial with full access and no card." | **Silent.** | **T12.** In Trial, prepared files are counted and shown; no extra file is charged (§1.4) |
| S4-15 | SA-4-46 (L499) | "a firm on it is never asked for a card, receives no invoices and has no overdue timeline" | **Fits.** Internal plans never pay extra files | None |
| S4-16 | §3.5; SA-4-20, SA-4-21 (L461–462) | "A failed charge sets the subscription to Overdue …" | **Fits.** A failed charge for extra files follows the same 14-day timeline | None |
| S4-17 | SA-4-53 (L506); §7 `BillingNotice` (L624) | `type` "(failure, reminder-7, reminder-12, hold, trial-7, trial-3, trial-1, trial-ended, trial-extended, card-expiring, price-change, invoice, refund …)" "— prevents duplicates" | **Gap.** | **T14.** Two notice types: allowance at 80 % and allowance used; once per usage month; recipients billing email, Owner and Admins (§2.2) |
| S4-18 | SA-4-54 (L507); §3.13 (L414–427) | "Plan and price: current plan, monthly or yearly, price, discount (and when it ends), tax shown separately." | **Gap.** | **T15.** The usage line and the list of counted and not-counted files (§2.1), visible to Owner and Admin |
| S4-19 | SA-4-88 (L547); SA4-D31 | "the plans on offer are shown side by side with price and limits" | **Fits as a pattern.** | **T16.** Show each plan's allowance and overage price beside its price |
| S4-20 | SA-4-65 (L518) | "The subscription terms, invoices, receipts and credit notes are bilingual for every firm, with the French text first." | **Gap in content.** | **T17.** The terms state the billable unit (§1), the allowance, the overage price, monthly reset with no carry-over, no charge in Trial, and that wrong counts are refunded with a credit note (SA-4-49). Legal wording: Unconfirmed: no counsel (AIW-D94) |
| S4-21 | SA-4-49 (L502); SA-4-62 (L515) | "can refund all or part of a charge (double charge, billing error, goodwill) with a reason, audited" | **Fits.** A wrongly counted file is a billing error | None |
| S4-22 | SA-4-37 (L486); SA4-X5 | "SA-4 records subscriptions, prices, discounts, invoices and refunds from day one so that revenue figures can be computed by SA-9" | **Gap.** | **T18.** Usage records are kept from day one too; SA-9 revenue separates plan revenue from extra-file revenue |
| S4-23 | §0.3 Release 1 priorities (L136–154) | Slices SA-04.00 to SA-04.14 | **Gap.** No slice for usage and extra files | **T18** (same): add a usage-and-extra-files slice, Must now (full agreed scope in Release 1, AIW-D82; the team sets the priority) |
| S4-24 | §12 v2.17 note (L790); L796 | "no usage counts"; "**Add-on prices** (`components/set-addon-price-dialog.tsx:26-27` — free-typed capability key …) → Remove (SA-4-44)" | **Fits.** The add-on dialog stays removed: the overage price is a price on a plan (T9), not a free-typed capability | None (for the team's build tracker) |
| S4-25 | SA4-D2; SA-4-45 | "Firms pay by card only, through the payment processor." | **Fits.** | None |
| S4-26 | SA-4-39 (L490) | "Every money action is audited …" | **Fits.** Count corrections and refunds of wrong counts are money actions | None |

**An observation for the per-firm against per-seat decision [I].** SA-4 as written prices a *plan*, with exactly one monthly price (SA-4-1) and seats as a limit (SA3-D14). A price "per seat" (the website's "Practice at CAD 199 per seat per month billed annually (249 monthly)", `../../commercial/research/R1-competitors-and-pricing-2026-10-07.md` L130, via `price-card.md` page 1) would itself need an SA-4 change (a quantity on the subscription). That belongs to the founder's open decision (`plan.md` §8 action 3, due 30 Oct), not to AIW-D111; it is noted because it changes T9's wording.

### 3.3 The team changes, in one list (for the founder to pass on; we write no change note)

1. **T1 (SA-03):** a fifth plan quantity, *prepared files per usage month*, per plan version (amends SA3-D14, SA-3-4).
2. **T2 (SA-03):** a third fixed mode, *metered*: never refused, counted per usage month, billed above the quantity (amends SA3-D15, SA-3-5, SA-3-39, BR-5; uses §11 "a new metered metric is a new row and a fixed mode").
3. **T3 (SA-03):** SA-3-6 reads "counted exactly once per event and billed" for a metered metric.
4. **T4 (SA-03):** a per-month count for the metered metric, written once per application (filing) from the counting event (SA-3-7, `UsageCounter`; AIW-D114).
5. **T5 (SA-03, SA-04):** metered metrics are excluded from the downgrade check and from the "lower of the two plans" rule (SA-3-58, SA-3-59, SA3-D17, SA-4-76).
6. **T6 (SA-03):** the per-firm panel shows the month's count against the allowance; metered metrics are not on the over-limit list (SA-3-20). **T6a (configuration):** row 30 on every plan sold, each with an allowance above zero (AIW-D115).
7. **T7 (SA-04):** a usage record per firm per usage month (allowance, count, extra count, unit price, invoice reference), each counted file identified by its application (`filingId`).
8. **T8 (SA-04):** SA-4-44 and SA4-D1 say the allowance and overage price are part of the plan, not an add-on; the §0.1 add-ons row is split (prepared files leave it; SMS and WhatsApp stay).
9. **T9 (SA-04):** a plan with an allowance has one overage price per extra prepared file in CAD (amends SA-4-1); SA-4-48 covers it; a higher plan's overage price is never higher than the plan below (beside SA-4-75).
10. **T10 (SA-04, SA-08 rail):** the overage price is pushed to the processor as a usage price; extra files are charged monthly in arrears on every plan; mixed monthly usage on yearly plans is proven in test mode with test clocks (as SA4-X12).
11. **T11 (SA-04):** the invoice gains a usage line and its description (SA-4-16, SA-4-61, §7 `Invoice`).
12. **T12 (SA-04):** §3.7 and §3.8 state the allowance on upgrade (at once), on a move down (at renewal), and in Trial (counted, never charged).
13. **T13 (SA-04):** discounts, including the founding-firm discount, annual prepayment and 100 % free months, apply to the plan price only (SA-4-43, SA4-D30; AIW-D116).
14. **T14 (SA-04):** two billing notice types, allowance at 80 % and allowance used, once per usage month, to billing email, Owner and Admins (SA-4-53, `BillingNotice`).
15. **T15 (SA-04):** the billing screen shows the usage line and the counted and not-counted files (SA-4-54, §3.13).
16. **T16 (SA-04):** plan display shows allowance and overage price beside the price (SA-4-88).
17. **T17 (SA-04):** the subscription terms state the unit (one prepared file per application, AIW-D114), allowance, overage price, monthly reset, Trial rule and refund of wrong counts (SA-4-65).
18. **T18 (SA-04, SA-09):** usage recorded from day one; revenue split plan against extra files (SA-4-37, SA4-X5); a usage-and-extra-files slice in §0.3.

Two needs carried from earlier work, unchanged and still open: **G2**, the first and last time an approval item is opened, firm-wide only (value map c.6), without which the benefit side of §4 cannot be measured; and the AG-07 answer on whether a submission for review can be withdrawn (§1.4, Unknown).

---

## 4. How allowances and prices are set: total cost to serve and measured benefit

**Rules.** No willingness to pay is invented. No outside validation is a gate (AIW-D94). CAD 25–40 stays illustrative (AIW-D111). Every figure below is from the value map or the price card and is labelled as there.

### 4.1 Total cost to serve, per prepared file and per firm

| Part | Figure | Status | Source |
|---|---|---|---|
| The Case Officer's AI's own model calls, typical file | about **CAD 0.18** | [I], inputs Assumption | value map summary item 4 |
| Product AI reading the same case (Reader, Checker, Sorter), typical file | about **CAD 1.54** (of 1.72) | [I], inputs Assumption | value map summary item 4 and row 7; carried by the base plan whether or not the teammate runs ("never metered or counted to an assistant", AW-1-15) |
| Model cost, typical file, Canada route | about **CAD 1.72** | [I] | value map (b) "How to read the columns" and open item 5 |
| Model cost, high case | not computed on the Canada route; **CAD 14.38** on the mid-tier model | Assumption, ranged | `price-card.md` page 1, from `provider-and-cost.md` §3.4 |
| Evaluation-set upkeep, instruction versions, AI incident handling | **Unknown** | — | `provider-and-cost.md` §3.5, via price card page 1: "all Unknown until the pilot" |
| Pack upkeep (shared by every plan, not AI-specific) | "20 to 40 specialist hours a month" | Assumption | value map row 9 |
| Run-log and approval-record storage | **Unknown** | — | `provider-and-cost.md` §3.5 |
| Support per firm | **Unknown** per firm; part-time help to about 70 live firms | Assumption | value map row 10, `plan.md` §5 |
| Payment processing on extra-file charges | **Unknown** (not sourced here) | — | — |
| **The firm's own review time** (not our cost, but the firm's) | about CAD 9 to 14 per 20 minutes | Evidenced wage rates; minutes Unknown | price card page 1 (Job Bank medians, accessed 9 Oct 2026) |

**What follows [I].**
- The **marginal** cost of one more prepared file is mostly model cost: about CAD 1.72 typical, with a long tail. Most of it is product AI that the plan carries anyway (AW-1-15).
- The **fixed** AI costs (evaluation sets, versions, incidents) do not grow per file; they belong in the plan price, as the moat file already proposes: "Put the cost of the moat in the base plan, not in an AI price" (moat file §4.5 item 1, via value map (b)).
- The plan's own **active-case limit** (SA3-D14, hard) bounds how many cases a firm can have open, and so bounds the product-AI reading cost a plan can generate [I].

### 4.2 Measured customer benefit

Benefit per prepared file = (person minutes saved in preparation − extra minutes spent reviewing) × the loaded wage of the person who would otherwise do it (value map c.7). The thresholds a price must clear, as arithmetic, not a claim (value map c.7, [I]):

| Price per extra prepared file | Net assistant minutes needed | Net consultant minutes needed |
|---|---|---|
| CAD 25 | about 44 | about 28 |
| CAD 30 | about 52 | about 34 |
| CAD 40 | about 70 | about 45 |

**How it is measured, from the product's own records (value map §(c), not restated):** files with no teammate, files in shadow and files with a live teammate, side by side in the same firm and month (c.1 to c.3); person acts per file (AG-13-68 modes); logged time where firms log it (AG-13-67); review minutes once G2 exists. **Where the first numbers come from:** the driving tests on made-up files (AIW-D83), Expat Ready's own use, and pilot firm one if the founder agrees (value map item 8; `NEXT.md` interview question 3). None of these is an outside validation.

### 4.3 The rule for the numbers (Proposal)

1. **Overage price floor (cost).** At least the high-percentile measured cost to serve per file, divided by (1 − the target margin). On the price card's own margin rule ("model cost is under about 15% of the file price at typical volume", page 1), a typical model cost of CAD 1.72 gives a floor of about **CAD 11.50** [I: 1.72 ÷ 0.15]. The high tail is handled by the per-run cap (AW-1-54), not by the price.
2. **Overage price ceiling (benefit).** Below the median measured net benefit per file, so that a firm paying for an extra file is better off than doing it by hand. Where in the corridor the price sits is the founder's positioning choice, not a calculation ("the price per prepared file is a positioning choice, not a cost-plus sum", price card page 1).
3. **Allowance (cost and usage).** Near the measured typical month for firms on that plan, so that the plan price is what most firms pay and extra files are the busy-month exception [I]. At full use, the allowance's model cost plus the plan's fixed AI costs must leave the plan's target margin. The typical month is **Unknown**: "about 10 prepared files per firm per month" is "**Assumption, no source**" (positioning file §(c)4; value map U10).
4. **Ladder.** Higher plans get a larger allowance (SA-3-54) and an overage price no higher than the plan below (T9).

### 4.4 Illustration only (Assumption throughout)

Practice at CAD 229 a month per firm (the plan's default, `plan.md` §3), allowance 10, extra files at CAD 30 (inside the illustrative CAD 25–40):

| Prepared files in the month | Firm pays | Our typical model cost for the files [I] | Note |
|---|---|---|---|
| 5 | CAD 229 | about CAD 8.60 | Slow month; pays for unused allowance (the objection in §6) |
| 10 | CAD 229 | about CAD 17.20 (7.5 % of the plan) | Allowance used; warnings sent at 8 and 10 |
| 14 | CAD 229 + 4 × 30 = **CAD 349** | about CAD 24.10 | Extra files charged monthly in arrears |

On the website's per-seat base (CAD 199 per seat, billed annually), a three-seat firm starts at CAD 597 before any extra file (price card page 1). Under per-seat pricing the allowance should still belong to the **plan tier**, not to each seat: files track caseload, not headcount (price card page 3, "revenue tracks caseload, not seats") [I]. Either way, AIW-D111 does not need the per-firm against per-seat decision to be taken first; T9's wording does (§3.2 observation).

### 4.5 Setting the launch values, given how SA-3 and SA-4 change prices

[I] from the team's own rules: changes that favour the firm apply **at once** (a raised allowance is an addition, SA-3-43; an upgrade, SA4-D24); changes against the firm wait for the **first renewal at least 30 days after approval** (a lowered allowance, SA-3-43; any price change for existing firms, SA-4-48). For a **yearly** firm that can mean up to a year. So launch values set too generously cost Expat Ready for up to a year per yearly firm; values set too tightly can be corrected the same day. Proposal: the founder sets the launch allowance near the Assumption median and the overage price in the lower half of the corridor in 4.3, and raises the allowance as soon as the records show the typical month is higher. Review the values when each plan has three full usage months of records (Proposal; the number is a choice, not a validation gate).

### 4.6 The pricing models compared (short; the detail stays in `price-card.md` and the value map)

| Model | Tracks | Can the product bill it from existing records? | Why not chosen, or why chosen |
|---|---|---|---|
| Per-seat AI add-on | Headcount | Seats yes | Charges people for AI that is not a person; works against caseload pricing (value map "Pricing models"); SA-4-44 |
| Per AI teammate per month (price card option c) | Firms | Yes (AW-1-125 switch) | A flat fee carries the high-volume tail; "feature" framing (price card page 3) |
| Per completed file only (price card option a) | Caseload | Yes (AW-1-75) | Every file is a new charge; reads as rationing; doubles the bill for a busy firm (price card page 2) |
| Per task or message | Activity | Possible | No unit a consultant values (value map) |
| **Allowance in the plan plus clearly priced extra files (hybrid; option b, extended)** | Plan tier, then caseload | Yes, with T1 to T18 | **Chosen by the founder (AIW-D111).** Predictable for most months, a per-file revenue line for busy ones, and the investor story keeps revenue tracking caseload |

---

## 5. Wording: "workflow pricing" and the pricing never-say list

**Where the list lives.** The say / never-say list has one home, `../research/rules-and-ai-positioning-2026-10.md` §(c)2, read with `../research/ai-in-regulated-work-2026-10.md` §7 (AIW-D106 note (d)). The rows below are **proposed additions for the Lead to merge there**; this file is not a second list. Every use is the Lead's guidance, Unconfirmed: no counsel (AIW-D94).

**The name.** "**Workflow pricing**" (AIW-D111). In one sentence for buyers (Proposal): *"Workflow pricing: every plan includes your AI team and a set number of prepared files a month; in a busy month, extra prepared files are CAD [price] each, and we tell you before the first one."* Investor material uses only the high-level line in §7.

| Say (Proposal) | Never say | Why |
|---|---|---|
| "workflow pricing"; "your plan includes your AI team" | "AI price", "AI fee", "AI surcharge", "AI add-on" | AIW-D92, D111: the prepared file is mostly rules work (AW-1-71, AW-1-72), AI only in parts (AW-1-73); and the AI team is in the plan, not sold beside it (SA-4-44 as amended by T8) |
| "prepared files", "extra prepared files" | "AI files", "per AI file", "AI-prepared files" as a price unit, "AI usage", "AI credits", "AI tokens", "pay per AI" | The unit is a finished piece of work, not AI consumption; tokens and credits make the firm think about our cost, not its benefit |
| "counted once per application, when your case officer accepts the readiness report" | "pay per approval", "pay when the file is approved", "pay only for approved files" | Acceptance is the submission for internal review (AG-7-93), not a licensed person's approval or the government's decision |
| "retries, failures, our own errors and re-runs on the same application are never counted" | "pay only for results", "pay only when it works", "pay for outcomes" | An accepted file is not a promise that the file is correct or will succeed; implying an outcome guarantee is a performance claim with no test behind it (Competition Act s. 74.01(1)(b), positioning file §(b)1.1) |
| "we warn you at 80 % and before your first extra file" | "unlimited AI", "unlimited prepared files" | There is an allowance |
| "included in your plan" | "free AI" | The AI team is paid for by the plan price |
| "the product's deadline watching" (never priced) | any price on rules, accuracy, "Canada", deadline watching | AIW-D37; moat file §4.5 item 5, via positioning file §(c)2 rule 9 |
| On the invoice: "Extra prepared files, [month]: n × CAD [price]" | "Overage fee", "AI usage charge", "penalty" | Plain words (README rule 4b); "overage" stays an internal word |
| Hours or "faster" only once measured (value map open item 4) | "saves you X hours", "pays for itself" | Nothing is measured yet (value map summary item 1) |

---

## 6. The strongest objection

*"An allowance is rationing. In a slow month I pay for files I did not use; in a busy month you charge me again for something my licensed person still checks, and you cannot tell me how long that check takes."*

It is fair. What answers it today, honestly:
- **Rationing:** the allowance is set near the typical month and raised at once when the records show more (4.5); firms are warned before any extra file and can upgrade or switch the teammate off (2.2).
- **Paying for unused files:** true, as with any plan; the deadline watching and the product AI are in the plan whatever the month (AIW-D37; AW-1-15). This half of the objection does not go away.
- **"I still check everything":** the review time is not recorded until the team adds G2; until it is measured, no saving is claimed (§5) and the overage price stays in the lower half of the corridor (4.5).
- **Competitors include AI for less:** vendor claims of "CAD 15 a case or CAD 29 a month" (value map, strongest objection) are cheaper headline numbers; the difference we can show is the counted, reviewable file and the record behind it, not a lower price.

Our own objection to the design: **once per application leaves money on the table** when an application genuinely needs a second preparation. We accept it, because it makes the unit impossible to dispute and removes the F3 window (§1.1).

---

## 7. Investor line (high level only; the detail is this file)

"Workflow pricing: every plan includes the AI team and a monthly allowance of prepared files; busy months pay a clear price per extra file. Revenue grows with the firm's caseload, not its headcount." No saving, accuracy or conversion figure is attached until measured (value map (d)).

---

## 8. Knock-ons in our own files, for the Lead (status updated 12 Oct; unmarked rows are still open)

| # | File and place | What is stale or needed |
|---|---|---|
| K1 | `../requirements/AW-01-firm-ai-assistants_v0.1.md` **AW-1-75** | Replace "whether a re-run on the same case within a set number of days counts again is open (§13 F3)" with the rule of §1.1 (counted once per application, AIW-D114; C1 to C5) and §1.2 (not counted when an AI step ended on the manual path for a reason on our side); cite AIW-D111 |
| K2 | AW-01 **AW-1-55** | "the Case assistant's prepared-file count (AW-1-75) SHALL be the costed unit" becomes "the billable unit under workflow pricing (AIW-D111)"; cost per prepared file is reported against total cost to serve (§4.1) |
| K3 | AW-01 §7 `PersonaRun.usage` | Add `notCountedReason` (§1.5) and a link to the usage month; **US-53** gains the re-run, provider-error, safety-drop and cap cases; new user stories for the readiness-report line (§2.1) |
| K4 | AW-01 §13 **F3** and **A9**; **AW1-D27**; **AW-1-57** ("Pricing per assistant is §13 A9") | F3 closed by §1.1 (no window); A9 closed by AIW-D111 (only the prepared file is metered; the other teammates are in the plan); AW1-D27's "pricing per assistant is decided after the pilot" superseded |
| K5 | `../requirements/change-notes/CN-AG-07.md` change 3, knock-ons | "whether a prepared-file meter ticks on this acceptance is decided after the Step 5 conversations (AIW-D60), so no plan change is made now" is stale: it ticks on the first acceptance per application (AIW-D111, D114); AG-7-93 also gains the per-filing wording (§1.0) |
| K6 | `CN-SA-12.md` change 3, SA-12-33(c); AW-1-54 | The per-firm monthly spend cap must not stop paid extra files: set it from total cost to serve at the allowance plus realistic extra files (§2.2) **Appended to `proposals.md` as a Lead proposal (12 Oct).** |
| K7 | `CN-AG-11.md` (`AiRunLog` outcomes) | Record a model call skipped for a spend cap (for example outcome `SKIPPED_CAP`), so §1.2 can recognise it; our subject (README rule 11) |
| K8 | `CN-SA-03.md` header ("Not changed. SA-4-44 and plan prices (AIW-D60)"; "AI usage and spend caps are not plan limits") and `CN-SA-04.md` header ("Not changed. SA-4-44 stands: the charge unit is decided in Step 5 (AIW-D60)") | Both stale. Proposal: replace each with a pointer to this file §3 ("the team changes for workflow pricing, AIW-D111, are listed for the team in `ai-workers/commercial/workflow-pricing-2026-10-12.md` §3.3; billing is the team's subject, so no change is proposed here"). No new change rows (brief; README rule 11) |
| K9 | `CN-SA-09.md` change 1 | Add, aggregated across firms: share of firms using extra files per month and files not counted by reason |
| K10 | `price-card.md` | Page 1 unit definition (IMP-18's "re-run … within N days") and "meter silently during the pilot" (IMP-18 (d)) superseded; SA-04 and SA-03 cited at v2.14 should be v2.17; the "ten conversations" framing dropped by AIW-D94; options (a) and (c) become "considered, not chosen (AIW-D111)"; the five "AI price" phrasings reworded (§5) **Applied 12 Oct (superseded banner, unit, options marked, wording).** |
| K11 | `ai-value-map-2026-10-12.md` | Plain-word "Prepared file" points to §1 here; row 1 "How it is priced" and the pricing-models table read AIW-D111; (e) U2's "two order forms side by side" becomes one shape with recorded extra-file incidence; open item 7 answered by AIW-D111; the six "AI price" phrasings reworded **Applied 12 Oct (prepared file, row 1, U2, pricing table, items 7 and 8 answered, wording).** |
| K12 | `../research/rules-and-ai-positioning-2026-10.md` §(c)1 "Priced in" column ("the AI price being tested", "pending the ten conversations, AIW-D60"); §(c)2; §(c)4 revenue table | Column reads "Workflow pricing: plan allowance and extra prepared files (AIW-D111)"; merge §5's rows into §(c)2; §(c)4 options (a)/(b) become the chosen shape **§(c)2 rows applied 12 Oct; §(c)1 "Priced in" column and §(c)4 table still for the Lead.** |
| K13 | `../research/ai-moat-and-positioning-2026-10.md` §4.5 and other files using "AI price" (`field-scan.md`, `ai-coverage-vs-competitors-2026-10.md`, `provider-and-cost.md`, `design/workers/catalogue.md`) | Sweep for "AI price" as our own wording (competitor quotes stay as quoted); a text search found 41 occurrences in 15 non-archive files, most in competitor descriptions and checks |
| K14 | `../../commercial/plan.md` §3 row "Not at launch: Add-ons" and §8 action 3; `model.xlsx` | For the Lead's merge into `commercial/`: a row "Workflow pricing: plans include the AI team with a monthly prepared-file allowance and a per-file price for extra files (AIW-D111); values set from total cost to serve and measured benefit"; an AI input block in `model.xlsx` (allowance per plan, overage price, files per firm per month, model cost per file) |
| K15 | `../PROGRESS.md` Step 5 row; `../NEXT.md` interview item 2 ("SA-3/SA-4 compatibility check owed") | Mark the check done (this file); the per-firm against per-seat decision (`plan.md` §8 action 3) stays the founder's |

---

## 9. Proposals and questions for the Lead (for `../proposals.md`; this maker has no edit tool for shared files)

1. ~~Decision (founder): may a prepared file be counted once per case, ever?~~ **Decided: AIW-D114** (once per application; re-runs on the same application never billed).
2. ~~Decision (founder): does every plan sold include the AI team?~~ **Decided: AIW-D115** (every plan; higher plans a larger allowance).
3. ~~Decision (founder): do discounts apply to the plan price only?~~ **Decided: AIW-D116** (plan price only; extra files always at list price).
4. **Rule:** no pricing text, internal or external, uses "AI price", "AI credits" or "pay per AI"; the unit is "prepared file" (§5), merged into the positioning file §(c)2.
5. **Plan:** the platform per-firm spend cap value is set from total cost to serve, after the allowance and overage price are set (K6). *Appended to `proposals.md` as a Lead proposal, 12 Oct.*

**Status after the founder's answers (12 Oct):** no founder question in this file is open. **Agent log lines for `../PROGRESS.md`** (this maker cannot append without an edit tool; the Lead appends):
- `| 12 Oct 2026 | commercial-strategist (maker) | Started: AIW-D111 workflow pricing, unit definition and SA-3/SA-4 compatibility |`
- `| 12 Oct 2026 | commercial-strategist (maker) | Done: commercial/workflow-pricing-2026-10-12.md (unit once per case at AG-7-93 acceptance; usage and warnings via billing screen and notices; 18 team changes T1–T18; 15 knock-ons K1–K15) |`
