# PF-5s — fresh challenge of concept r1 (independent challenger, 14 Nov 2026)

Read: `concept.md` r1, `design/board.html` r1; rows PF-3, PF-5 and the notes Rev 8, Rev 8.2 (`../../design/lead-b-rows-2026-11-14.md`); contracts §0, §1.1, §7 "§1.1 Firms and plans" (`../../design/platform-and-front-office-contracts-2026-11-14.md`); traces t1, t2; sibling `../pf-6-staff/`; SA-04 v2.22 (SA4-D7, D11, D12, D29); skill screen-concept part B. Outside facts read 14 Nov 2026 from the services' own pages: Stripe `docs.stripe.com/payments/checkout/free-trials`, `/tax/checkout/page`, `/tax/subscriptions`; AWS `docs.aws.amazon.com/cognito/latest/developerguide/signing-up-users-in-your-app.html`. `ai-workers/tools/freshness.sh` could not run in this copy (no `code/` folder): team sources not re-dated here, **Unverified** for freshness. The service choices (P-566 (2)) are not reopened; objections are about how the concept uses them. Nothing here adds scope.

## Verdict
**Build after these changes.** The journey, the words, the "status from our record, never the redirect" rule and the hold page are right and match contracts §7. One thing stops the build as drawn: the business address was moved out of sign-up into the Firm profile, but nothing makes a firm give it before it pays, and on Payment hold the profile is closed (402), so a firm whose trial ended cannot give the address its first invoice needs. Five more points change a rule or a screen. The rest is wording.

Counts: **1 Blocker, 6 Majors, 9 Minors.**

## Objections

### Blocker

**B1 — The address-for-tax rule has no place where it is enforced, and on hold it cannot be met at all.** *Needed for the proof.*
* **What breaks:** BR-7 puts the business address in the Firm profile, "needed before your first invoice", and BR-2 / G8 say Checkout never asks for it. Nothing in BR-8, BR-10 or BR-12 stops "Manage plan and billing", "Update card or pay" or "Add a card and pay" while the address is missing. And Payment hold allows "billing endpoints and the data download only, everything else 402" (contracts §7 §1.1): `PUT /api/platform/firm/profile` is not a billing endpoint, so on hold the Firm profile page is the hold page.
* **Example:** an Owner signs up, never opens Firm profile, the trial ends → hold. The hold page offers "Add a card and pay" → Stripe's billing page → card added → the first invoice cannot be finalised (no tax location) → no paid invoice → hold never ends. The Owner goes to Firm profile to add the address: hold page again. Dead end, with the 90-day deletion clock running (G11). During the trial the same firm can add a card with no address and fails at the first charge instead.
* **Evidence (Fact, high):** Stripe, `/tax/subscriptions`: "Your customer must have a valid tax location in order to enable automatic tax on their subscription"; when the invoice's tax status is `requires_location_inputs`, "Stripe can't calculate the taxes, can't finalise the invoice, and can't collect the payment." Stripe, `/tax/checkout/page`: "If Checkout needs additional location information to calculate tax, it collects the required billing details" (so with tax on and no saved address, Checkout **will** ask, against G8; with tax off at trial start, it must be switched on later, which needs the address). Contracts §7: tax gate "no paying-firm invoice until Stripe Tax and the firm's address are set". **Judgment (high):** the fake `BillingPort` will not show this unless it is told to; the browser journey in §6 fills the profile first and passes.
* **Fix (no new scope; the same record and the same `BillingPort` call as G8):** (1) the address is asked **in the billing step**: every button that opens Stripe to add a card or pay first opens the Business address panel when the address is missing ("Before you add a card: your business address. We use it to work out tax."), Owner and Admin, then goes on to Stripe; (2) that save is a **billing** route (for example `PUT /api/platform/billing/address`, writing the same `platform_firm` columns and the Stripe customer), so it works on hold; the Firm profile shows and edits the same value; (3) BR-12 test: a held firm with no address reaches Active through hold page → address → pay; (4) the fake adapter refuses a first invoice with no address (so CI sees what Stripe does); (5) PF-5's step 0 confirms at Stripe whether the trial Checkout runs with automatic tax off and tax is switched on once the address exists, and records the page and date. Correct BR-7's "never asked again by Checkout" to what step 0 finds.

### Majors

**M1 — The emailed link confirms "by itself" (BR-5, S3b): a mail scanner can confirm the email, not the person.** *Needed for the proof.*
* **What breaks:** business mail systems open links in incoming email to check them. A page that confirms on opening is then confirmed by the scanner. (a) The real person later clicks and reads "This link has expired or was already used." on a first try. (b) Worse: someone signs up with **another person's** work email and their own password; that person's scanner confirms it; the stranger now owns a firm account under an email they do not control, and the real firm gets "You already have an account" for ever. Email verification is the only identity proof this public door has.
* **Evidence:** contracts §7 says the email "links to our page **with the code filled in**", and G12 says the same; only BR-5 and the board's 3b ("Confirming your email…") make it automatic. Link-opening by mail security is common practice (**Fact, high, from general knowledge; no vendor page cited**).
* **Fix:** S3b opens with the code filled in and one button **Confirm my email**; only that press (a POST) confirms and creates the firm. One more click, and the "already used" page stops being a normal first sight. Test: a GET of the link changes nothing.

**M2 — Leaving a no-card hold is not "add a card": the concept's Stripe reading is off by one step.** *Needed for the proof.*
* **Fact (high):** Stripe, `/payments/checkout/free-trials`: "When your customer adds their payment method after the subscription has paused, **you can resume** the same subscription"; customers "resume their paused subscription in the customer portal by selecting **Start subscription**, then adding a payment method." Concept §4b says it "resumes when a card is added".
* **What breaks:** an Owner who adds a card on Stripe's page but does not press Start subscription comes back to "Checking payment…" for ever: card on file, still on hold, no message. The Admin's limited page ("card and paying only", BR-8) may not show Start subscription at all (**Unverified**: check in PF-5 step 0).
* **Fix:** PF-5 states one mechanism and S7 follows it: our hook, on a card added to a held (paused) subscription, resumes it through `BillingPort` (after the request, contracts §0.4), and the hold ends on the paid invoice as now. S7 gains the state "Card saved. Starting your subscription…" and, if no paid invoice after the slow limit, "Your card is saved but payment hasn't gone through. Try again." Test both for Owner and Admin.

**M3 — The hold page promises a data download that no row has built, while the deletion clock runs.** *Needed for the proof (copy and test); the download itself is PF-11, Not built.*
* **What breaks:** §5 hold copy and the board's button say "You can still pay and download your data" (also the pricing answer on S1). G5 says the link appears "once it exists". Until PF-11 the sentence is untrue on every hold page, and a held firm is counting down 90 days to deletion with no way to take its data.
* **Fix:** the download sentence and button show only when the API reports the download is there; until then the hold and pricing copy say only "You can still pay." Record in PF-5/PF-11: no real firm goes live before PF-11 (beside the tax gate). PF-11 is named in Rev 8.2 but is not in the rows' "Shaped next" list: add it there.

**M4 — Invited sign-up (S8) never shows or sets a plan, but the next step needs one.** *Needed for the proof.*
* **What breaks:** S8 has email, password, firm name, country, terms; BR-13 then goes "BR-6 from Checkout on", which needs plan and period. `platform_signup_link` carries "one email and country" (PF-3), no plan. The firm starts a trial on a plan it never saw (G3's silent default).
* **Fix:** S8 carries the same Plan line as S2 (default Sample Team, monthly, with Change). No table change.

**M5 — Three rules disagree on who may edit the Firm profile, and the summary line asks people who cannot act.** *Needed for the proof.* BR-7 and G9: Admin edits the operating name. §6: "profile edit Owner". Board: "Only the Owner can change the firm profile." S5's line "Add your business address before then" with its button shows to everyone. **Fix:** one rule in all three places (G9 is the decided one; after B1 the address is Owner and Admin, because SA-4-67 lets an Admin pay); the next-step line shows only to those who can do it; others see no call to act.

**M6 — The trial line ignores a card already on file, and no page tells the firm the price it will pay.** *Needed for the proof.*
* **What breaks:** BR-10's line is fixed: "Add a card before then to keep access." G4 returns "card on file", but no rule uses it. A firm that added its card on day 2 is told for 12 more days to add a card. S6 shows the plan but never the amount or the first charge date.
* **Fix:** BR-10 has two states: no card (as written) and card on file ("Card saved. First payment of $149 + tax on 28 Nov 2026." from our record, Sample). Same switch on the home line and in the 7/3/1-day reminders (no "add a card" email to a firm that has one). Switch Stripe's own trial-reminder email off so the firm does not get two (Stripe, same page: optional setting).

### Minors
* **m1 Pricing must say tax is extra.** *Needed for the proof.* SA4-D7: prices are shown before tax, "$199 CAD + applicable taxes". S1 and S2 show "$149 per month, CAD". Add "+ applicable taxes" (wording Unconfirmed: no counsel).
* **m2 S1 has three filled buttons** (one per plan). P-473: one filled blue button. Fill one (the plan carried or the middle one, Sample), outline the others; the Lead picks.
* **m3 S4a "Continue to Stripe" contradicts BR-5** ("Taking you to start your trial…" → Checkout). It is one click more with nothing to decide. Keep the automatic move with the line of text; the button shows only if the redirect fails ("We couldn't open Stripe. Try again.").
* **m4 The address on S3 is masked** ("o•••@…"), so "Wrong email? Start again" cannot work: the visitor cannot see the typo. Show the address as typed (held in the page, not read back from us). BR-4 already says "naming the address".
* **m5 Missing states on S3:** wrong code ("That code isn't right. Check the email and try again."), too many tries (the provider's limit), and "no email after a few minutes: check spam". The last matters because a trapped or too-fast submit shows S3 and sends nothing (BR-2): test the minimum fill time with a password manager's autofill so a real firm is never trapped.
* **m6 Password typed twice within minutes** (S2, then "Sign in to continue"). It follows from P-567 and the provider's pages; say why on the return page: "Sign in with the password you just chose. You'll also set up two-step sign-in." The password rules on S2 come from the pool's set policy, not typed into the page.
* **m7 S2 "Change" plan** must change the plan in place (a small picker) and keep what was typed; a trip back to S1 loses the form (BIC-01).
* **m8 S8 dead-link page** tells a person who already used the link and left Stripe early to "Ask us for a new one". Add "Already set up? Sign in" (as BR-5 has), and say how to ask (reply to the invitation email).
* **m9 Tidy:** the header still lists "Stripe pricing table" among the services (G1 dropped it); §6 reads the seat line from `GET /api/platform/staff`, which needs `agent/staff:manage` (use G4's read only); S7 shows two buttons on the hold page and a banner button beside a page primary: one filled each.

## What is sound
* Sign-up before Checkout with our own pricing page: the quoted Stripe limitation is real, and G1 is the right call.
* One answer for known and unknown emails (BR-4, G7); no firm before confirmation; resume, never a second firm (BR-6). Cognito fact checked: "The code or link is valid for 24 hours" (AWS page above), so BR-5's 24 hours is the provider's own figure.
* Status only from our record after the hook (BR-9), with waiting and slow states. This is the part most products get wrong.
* Hold as a page inside the frame with Plan and billing reachable; the requirement's words for statuses; the Owner/Admin split on billing (SA-4-28, -67); overdue as the one orange "needs you".
* Stripe's own pages for card, plan change, cancel and invoices: no card field of ours anywhere. Country fixed with the reason shown. Five inputs on the public form.
* §6b names the fake "Test checkout" and "Test billing page" as scaffolding, labelled, with the real pages checked only on the Mac. That is honest; B1 (4) and M2 only ask the fake to refuse what Stripe refuses.

## Back-end plan (element → record → API → rule → test)
| Element | Record | API | Rule | Test (pass / fail) |
|---|---|---|---|---|
| S1 plan cards | `platform_plan` + Stripe prices | `GET /api/public/plans` | active plans only; price before tax (m1) | three cards / a retired plan is absent |
| S2 submit | provider user (unconfirmed); `platform_terms_acceptance` ×3 | `POST /api/public/signup` | terms required; trap answers the same; password never stored | acceptance rows written / unticked refused at the field; autofill not trapped (m5) |
| S3 / S3b confirm | `platform_firm` `PROVISIONING`, Owner `platform_staff`, Stripe customer | `POST /api/public/signup/verify` | only a POST confirms (M1); single use, 24 h | button press creates one firm / GET changes nothing; second use → the "already used" page |
| S4 trial start | `platform_subscription` `TRIAL` on the hook | Checkout from verify; `POST /api/platform/billing/checkout` to resume | status from the hook only; the Stripe customer is passed so the email is fixed | return without the hook stays "Starting…" / replay → one firm |
| S5 profile | `platform_firm` fields | `GET|PUT /api/platform/firm/profile` | one edit rule (M5); version check on save | Admin edits operating name / Admin on legal name refused |
| Address before paying (B1) | same `platform_firm` address + Stripe customer | billing-scoped save (allowed on hold) | no hand-off to Stripe to pay without it | held firm with no address reaches Active / fake refuses an invoice with no address |
| S6 summary | `platform_subscription`, seat count | `GET /api/platform/billing` | card-on-file switches the trial line (M6); amount and next date shown | no card → "Add a card" / card → "First payment…" |
| S6, S7 buttons | Stripe portal session | `POST /api/platform/billing/portal` | Owner full; Admin card and pay; others none | Admin cannot reach plan change / other staff 403 |
| S7 hold exit | `platform_subscription` `PAYMENT_HOLD → ACTIVE` | `POST /api/hooks/stripe` + resume through `BillingPort` (M2) | ends only on a paid invoice | card added then resumed and paid → Active / card added, unpaid → still hold with the message |
| S7 hold guard | firm state | API guard | billing, address save, sign-out and the frame's own "who am I" read answer; all else 402 | case route 402 / Plan and billing 200 |
| S7 download line | (PF-11) | billing read says whether it exists | shown only when it exists (M3) | absent before PF-11 / present after |
| S8 invited | `platform_signup_link` | `GET|POST /api/public/signup/:token` | plan line shown (M4); single use | signs up once with a plan / used link → page with Sign in |
| S9 emails | sent-once marks | `MailPort` | reminders follow card-on-file (M6); Stripe's own reminder off | one email each (clock injected) / none to a firm with a card |

## Questions for the founder
None. Every point above is settled by the services' own documentation, the team's requirement or P-566, and falls to the Lead under P-566 (3). The one place a preference could hide (which plan button is filled on the pricing page, m2) is Sample until prices are set.

## Lead response
Lead B (2), 14 Nov. **All accepted; no founder question.** Folded into concept r2 §7b (binding) and PF-5 rows rev 8.3. B1: the address moves into the billing step through a billing route that works on hold. M1: confirm by POST only. M2: resume on card added, two S7 states. M3: download shown only when PF-11 exists; no real firm live before PF-11. M4: plan line on S8. M5: one profile rule (address Owner or Admin). M6: card-on-file trial line and reminders, Stripe's own reminder off. m1-m9 folded as written (m2: the middle plan filled).

## Agreement
Lead B (2) approves concept r2 after this challenge (P-223 (4)), 14 Nov. The founder's look follows; his changes become follow-up rows.

## Build discoveries
