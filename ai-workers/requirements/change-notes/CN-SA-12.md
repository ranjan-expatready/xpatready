# Change note CN-SA-12: Feature Flags and Platform Configuration

| | |
|---|---|
| **Document changed** | SA-12 Feature Flags & Platform Configuration, version 2.7, dated 2026-10-08 |
| **File (11 Oct 2026 snapshot; unchanged since 9 Oct)** | `sources/drive-snapshot-2026-10-11/02-functional-requirements/super-admin/SA-12-feature-flags-and-platform-configuration_v2.7_2026-10-08.md` |
| **Date of this note** | 11 Oct 2026 (fourth round, after re-check S3a-c: the *founder safeguards* setting and its parts; switch-off by SA-12's Owner-only pattern; platform-wide cap) |
| **Status** | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| **Changes** | 4 |

**How to read this note.** Each numbered change has five parts:
1. What it changes, by ID, section and line of the snapshot.
2. The current words, quoted exactly.
3. The proposed words, in SA-12's own style.
4. Why: the founder's decision (`ai-workers/decisions.md`, AIW-D*n*), the improvement (`ai-workers/design/ws2-improvements.md`, IMP-*n*) or the proposals row (`ai-workers/proposals.md`).
5. What else must change.

What each AI assistant does when stopped is specified in AW-01 and AW-02, which cite these IDs. Sibling Workstream 2 files that are in a fix round (the CN-AG notes, AW-01, AW-02) are cited by change and line, without quotation marks (`00-step3-plan.md`, "Quoting a file in a fix round").

**Plain words used here.**
- *Kill switch*: SA-12's emergency brake that forces a feature off for every firm at once.
- *Needs you*: the firm's inbox where anything prepared without a person present waits for a person to approve, edit or reject.
- *Platform setting*: one typed, versioned value in SA-12's registry, with per-plan and per-firm overrides (SA-12-17).
- *Founder safeguards setting*: one platform setting with two parts, each on from the first deployment, that keeps the founder's safeguards in force: the approve-all part (AIW-D57) and the second-person part (AIW-D59). Each part ends only by a recorded founder decision naming that part (change 3). Requirements name this setting instead of saying "during the pilot", because the product can check a setting but cannot check a period.

**This note is the one home of** the AI spend caps (the platform-wide cap included), the values of the founder's approve-all safeguards (AIW-D57) and the *founder safeguards* setting (SA-12-33; `00-step3-plan.md`, "Pilot safeguard values, one home"). Other notes and AW files cite SA-12-33 and restate no value. **It is not the home of the pause reasons:** the four reasons an AI-prepared item is paused, in one PAUSED state, live in CN-AG-11 change 6; this note cites `PLATFORM_STOP` from there.

**Phasing.** The shared 99-Phasing-and-Glossary v2.18 puts SA-12's "Dedicated flag catalog, other firm overrides" in the second phase (L42). Release 1 does not launch without the AI assistants (AIW-D66), so the AI stops of change 1 need the catalogue in Release 1. That phasing row is the team's to change (not written here).

---

## 1. AI emergency stops: one for the four AI Doers, one per AI assistant; a stop pauses, it never ends a delegation

**(1) What it changes.** A new requirement after SA-12-30 (the document's last, L404–L410); §3.4 "Kill-switch (the emergency brake)" (L235); the `FeatureFlag` catalogue seed (SA-12-1, L342).

**(2) Current words.**

L361:
> - **SA-12-12:** A `killSwitchEligible` flag can be tripped at PLATFORM scope, forcing OFF below all other scopes (precedence 0), with a **mandatory reason**; tripping invalidates cache, audits, notifies the Platform Owner, and pauses in-flight feature work *(changed v2.5 — AG17-D69: for a flag covering client records the kill-switch makes existing records read-only and never pauses reminders; SA-12-30)*. Untripping is a separate audited action. Kill actions require `system/flag:kill`.

L354 (extract):
> - **SA-12-9:** A feature executes only when **entitlement (SA-3) AND flag (SA-12)** both pass, evaluated entitlement-first. Entitlement-deny → `403 FEATURE_NOT_ENTITLED` (commercial/upsell). Flag-deny → `FEATURE_DISABLED` / hidden (operational).

SA-12 names no AI flag anywhere.

**(3) Proposed words.**

New requirement:
> **AI emergency stops** *(added — AG-11 §0.2 SA-12 row; IMP-8)*
> - **SA-12-31:** The catalogue holds `killSwitchEligible` flags for AI: **one for the four AI Doers together** (Reader, Sorter, Writer, Checker) and **one for each AI assistant** (the five firm assistants and Expat Ready's two platform assistants); the team names the keys. Tripping an AI flag (SA-12-12, mandatory reason) does the following:
>   - (a) new AI work covered by the flag stops at once, and queued AI jobs are paused, not deleted;
>   - (b) running assistant runs **pause at the next safe point, never in the middle of a send**; the delegations they run under are **not ended**;
>   - (c) **nothing covered by the flag is sent while it is tripped**; every item already waiting in Needs you is paused with the reason **`PLATFORM_STOP`** (CN-AG-11 change 6, AG-11-112 (e)), stays visible, marked "AI paused by Expat Ready on <date>: <reason>", and may be withdrawn with the recall action (SA-12-32). This is an exception to SA-12-9's hide-or-refuse for this flag family;
>   - (d) on untrip, paused runs resume from where they stopped, and the `PLATFORM_STOP` reason clears; an item with no other pause reason **re-renders as stale and needs a fresh approval** before anything is sent (AG-11-112 (e));
>   - (e) the firm's Owner sees a banner, and the stop and its reason show beside the firm's own AI switch (AG-16-35);
>   - (f) the product's own deadline and expiry reminders (SA-3-35; the Minder has no AI) and the Practice expert's rule-built answers, which work with AI off, are never affected; only the Practice expert's summary line sits behind an AI flag.
>
>   The firm's own AI switch and the per-assistant firm switches sit below these flags; a platform stop always wins (SA-12-4).

§3.4, after the kill-switch paragraph, add: "For the AI flags (SA-12-31) the kill-switch pauses AI work and holds every waiting proposal unsent but visible, paused with the reason `PLATFORM_STOP`; a separate recall withdraws them (SA-12-32), and on untrip each needs a fresh approval."

**(4) Why.**
- **The team's pending knock-on.** AG-11 v1.12 lists this as pending (§0.2, L56: "| **SA-12** | Platform kill switch for the AI Doers | Pending |").
- **IMP-8** asks for "the SA-12 switches: one for all four AI Doers and one per AI Worker, each an emergency stop at platform level with a mandatory reason".
- **The one stop rule.** The Step 3 shared rule fixes the behaviour: "a stop pauses runs and delegations; nothing sends while stopped; waiting items can be withdrawn with the recall action (SA-12-32); on release every waiting item re-renders stale and needs fresh approval. A delegation ends only when its person ends it or is deactivated or suspended" (`00-step3-plan.md`, emergency stop). It replaces the first version's "end running assistant runs" and "approvable" wording (review S3a m-7).
- **One home for the pause reasons.** CN-AG-11 change 6 holds the four reasons in one PAUSED state, `PLATFORM_STOP` among them (CN-AG-11 L127), and is their one home (`00-step3-plan.md`, "One word, *paused*"). This note cites the reason and does not define it.
- **No one stops another person's delegation.** The kill switch pauses every run under a flag; it is not a key that ends any person's delegation (`00-step3-plan.md`, "No one stops another person's delegation").
- **Prior art.** Doc 2 v1.4 already numbers a pause-hook contract SA-12-29 to SA-12-31 (L5453): "`pause` parks queued work retaining payload+order, checkpoints executing runs, withholds scheduled sends … nothing is deleted". The module file SA-12 v2.7 is current (rule 11), so its numbering stands and Doc 2's contract is cited as the mechanism, not as a live ID (review S3a m-10).
- **Relied on by the behaviour documents.**
  - The Support assistant's start condition: "The persona's own flag is on and not kill-switched … one flag per persona is IMP-8 (Proposal)" (`support-and-account-assistant.md` §1).
  - The Pack author's assistant: kill switch under `system/flag:kill` (`pack-authors-assistant.md` §4).
  - The Case, Intake and Firm documents measure "items withdrawn (IMP-8)" (§6 of each).
- **Point (f)** follows AIW-D37 (the deadline watch "is the product's own Minder … never as AI") and AIW-D54 item 10 ("the expert's answers work with AI off").

**(5) Knock-ons.**
- AG-11 change 6 (`PLATFORM_STOP`, AG-11-112) and the §0.2 SA-12 row (CN-AG-11).
- AG-16-35 and AG-16 §13 Q7 and Q9 (CN-AG-16).
- SA-07 Appendix A row L741 (CN-SA-07 change 1).
- SA-08 SA-8-50 (withdrawing the provider record pauses waiting items with its own reason, `PROVIDER_RECORD_WITHDRAWN`; CN-SA-08 change 2).
- AW-01 AW-1-56 pauses runs at the next safe point and does not end delegations (the change note wins; `00-step3-plan.md`, "One home per rule").

---

## 2. The recall action and its permission

**(1) What it changes.** A new requirement SA-12-32; §10 permission table (L559–L569) and its role-mapping paragraph (L571).

**(2) Current words.**

L564:
> | `system/flag:kill` | Trip/untrip a PLATFORM kill-switch | **High (all firms)** |

L571 (extract):
> Platform Engineer holds toggle/rollout, config-manage (operational settings), maintenance, and kill (kill possibly gated by an extra confirmation, Q3).

**(3) Proposed words.**

New requirement:
> - **SA-12-32:** A separate, audited platform action, **"Withdraw AI proposals"**, exists for a safety recall. It:
>   - withdraws chosen waiting AI-prepared items (by firm, assistant, AI Doer or date range);
>   - records a reason and audits each withdrawn item;
>   - tells the item's owner it was withdrawn and why.
>
>   It never touches anything a person has already approved. It requires `system/ai-recall:withdraw`.

§10, a row below `system/flag:kill`:
> | `system/ai-recall:withdraw` *(new; name for the team)* | Withdraw waiting AI-prepared items for a safety recall (SA-12-32), with reason; audited per item | **High (all firms)** |

Role mapping gains: "The AI recall key is held by the Platform Owner; whether the Platform Engineer also holds it is the team's call, recorded in SA-07 Appendix A."

**(4) Why.**
- IMP-8(c): the recall is "a separate platform action … audited per item".
- The Step 3 emergency-stop rule names the recall action SA-12-32.
- SA-12's own rule that permissions are "split by **blast radius** (viewing ≠ toggling ≠ killing ≠ maintenance)" (L557).
- The Platform Owner "holds everything plus the confirmation authority on the most dangerous switches" (L571).

**(5) Knock-ons.** SA-07 Appendix A (CN-SA-07 change 1). SA-06 catalogue (CN-SA-06 change 4).

---

## 3. The AI settings: the *founder safeguards* setting and its parts, the approve-all safeguard values and the spend caps

**(1) What it changes.** §3.6 "Categories (initial)" (L274); SA-12-27 (L392); §10 role-mapping paragraph (L571); a new requirement SA-12-33.

**(2) Current words.**

L274:
> **Categories (initial):** upload limits (max bytes, MIME allowlist), session/auth (session timeout, token TTLs that are safe to expose), platform defaults (default locale/currency/timezone fallbacks — *not* a firm's own settings, the platform fallback), branding defaults (platform name, support email, default theme tokens), system params (pagination caps, queue concurrency hints), and the rate-limit config (3.9).

L370:
> - **SA-12-17:** The platform maintains a `PlatformSetting` registry: typed (int/bool/string/enum/json/duration/bytes), **schema-validated** on write (no manual validation chains), scoped (PLATFORM default with per-plan/per-firm overrides), and **environment-aware** (dev/staging/prod values).

L392 (extract):
> - **SA-12-27:** The registry marks a group of settings as **security settings**: approved staff email domains, invite-link validity, step-up window, password rules and auto-logout values. Only an Owner may change them. A Platform engineer can view them but cannot change them; the change is refused with a clear message and the refusal is audited.

L571 (extract, first sentence):
> **Role mapping (Section 2):** *(changed v2.1 — SA7-D54)* Config-manage excludes the security settings of SA-12-27, which only an Owner may change.

**(3) Proposed words.**

L274 gains: "AI settings (the founder safeguards setting, the approve-all safeguard values and the AI spend caps, SA-12-33)."

New requirement:
> - **SA-12-33:** *(new — AIW-D57, AIW-D59, AIW-D62; IMP-36)* The registry (SA-12-17) holds three groups of AI settings:
>   - **(a) The founder safeguards setting** (the team names the key). It has two parts, each **on** from the first deployment:
>     - the **approve-all part** (AIW-D57): keeps the approve-all safeguards of (b) in force;
>     - the **second-person part** (AIW-D59): keeps SA-4-89 in force.
>
>     Each part is switched off only by the Platform Owner, recording as the change reason the reference of the founder's decision that names that part (SA-12-25). Like the security settings of SA-12-27, the setting is outside config-manage: a Platform engineer can view it but cannot change it; the change is refused with a clear message and the refusal is audited. No separate key exists for it.
>
>     While the **approve-all part** is on:
>     - a per-firm value of (b) **may only tighten** the platform default (a higher confidence level, a larger hidden share, a lower alarm level), and a value that would loosen it is refused on write;
>     - no approve-all safeguard can be switched off, at platform, plan or firm level. A value that would switch one off is refused on write: no low-confidence values opened first, no value hidden for the approver to fill, or the agreement alarm off.
>
>     When the founder's recorded decision ends a part, the firm's own settings govern what that part covered.
>   - **(b) The approve-all safeguard values** (AIW-D57): the confidence level below which a value is opened first; the share of values hidden for the approver to fill (at least one value on every approve-all); and the level and time window of the agreement alarm.
>   - **(c) The AI spend caps** *(Proposal — IMP-36)*:
>     - per firm per month: a warning at 80 %; at 100 % new model calls stop and the manual path applies (AG-11-71);
>     - per Practice expert user per day;
>     - per assistant run: a runaway run is stopped and parked for a person, from day one;
>     - **platform-wide per month, for Expat Ready's own assistant calls**: a warning to the Platform Owner at 80 %; at 100 % the platform assistants make no new model calls and their people work by hand.
>
>     **Reaching a cap stops new model calls only.** It never pauses, cancels or withdraws an item already waiting in Needs you: that item stays approvable, because approving it makes no model call (CN-AG-11 change 6). Spend caps never stop the product's own non-AI work. A per-firm cap may be set lower than the platform default, never higher.
>
>   The values in (b) and (c) are platform defaults, set by the team before the first production deployment. A change to a spend-cap default needs a recorded founder decision (AIW-D62). Every change is audited with a reason (SA-12-25). The firm's own settings screen shows these values read-only, together with any tightening the firm has chosen (AG-16, CN-AG-16).

SA-12-27 gains: "*(changed — SA-12-33)* The founder safeguards setting of SA-12-33 is changed under the same rule: only an Owner, and only with the founder's decision reference recorded."

Role mapping (L571), first sentence, becomes: "Config-manage excludes the security settings of SA-12-27 and the founder safeguards setting of SA-12-33, which only an Owner may change."

**(4) Why.**
- **One home.** The Lead's call of 11 Oct (re-check S3c-b N-7), `00-step3-plan.md`, "Pilot safeguard values, one home": the approve-all safeguards and spend caps are platform settings in SA-12-33 (the plan line as corrected on 11 Oct: the safeguards are tighten-only while their part is on; the caps are tighten-only at all times and are not a founder safeguard); CN-AG-16 shows them read-only and restates no value. The platform-wide cap for Expat Ready's own assistant calls has its home here too (`00-step3-plan.md`, "AW-02 calls" (a)); AW-02 points to it.
- **The name and the parts.** `00-step3-plan.md`, "The *founder safeguards* setting": the setting once called *pilot safeguards* is renamed, because AIW-D57 has no pilot limit while AIW-D59 is "for the pilot; reviewed after it"; each part ends only by a recorded founder decision naming that part.
- **Tighten-only, and after.** `00-step3-plan.md`, "Tighten-only and the founder safeguards": "while a part of the founder safeguards setting is on, firms may tighten its values and never loosen them; when the founder's recorded decision ends a part, firm settings govern it." CN-AG-16 follows this note (re-check S3a-c m-13).
- **Who switches it off.** `00-step3-plan.md`, "Who switches it off (S3a-c N-2)": SA-12's existing Owner-only settings pattern (SA-12-27; L571), with the founder's decision reference recorded; no new key; the Platform engineer's `system/platform-config:manage` does not reach it. SA-12-27 already holds this pattern for the security settings (quoted above).
- **A setting, not a period.** `00-step3-plan.md`, "No 'during the pilot' in a requirement". The earlier sentence about values set "before the pilot" and changed "after it" now names a product event (the first production deployment) and a recorded decision (re-check S3a-c m-11).
- **Caps never pause waiting items.** `00-step3-plan.md`, "Spend caps never pause waiting items": "reaching a cap stops new model calls only, then the manual path; items already waiting in Needs you are unaffected (a cost control, not a safety stop)". CN-AG-11 change 6's halt table says the same (CN-AG-11 L145).
- **The safeguards.** AIW-D57 ("Adopt all three"): "low-confidence values opened first; a few values hidden for the approver to fill, match rate recorded; an alarm when a person's agreement rate climbs suddenly. Provisional until counsel." No number is set here; AW-01 §13 names the values to be set (AW-01 L1249).
- **The second person.** AIW-D59 ("Yes, for the pilot"): "A second Expat Ready person confirms any account or plan change the Support assistant proposes, during the pilot; reviewed after it."
- **Spend caps are not plan limits.** SA-03 v2.17 limits plans to four limits (SA3-D14, L74: "**Four limits only:** staff seats, active individual cases, active corporate cases, document storage."). AG-11 v1.12 records the same: "volumes are not plan limits (SA3-D14)" (§0.2, L57). SA3-D14 is a later team decision than IMP-36, which was only a proposal. So the first version's "cap rows in SA-03" is withdrawn (CN-SA-03), and the caps go to the platform registry.
- **IMP-36:** "per firm per month (a warning at 80 %, a hard stop at 100 %, then the manual path, AG-11-71), per co-pilot user per day, per worker run". All of group (c) rests on IMP-36, so the requirement itself carries the **Proposal** label (re-check S3a-c m-11). A firm setting a lower cap is part of that Proposal.
- **AIW-D62:** spend caps are decided after the pilot, "with today's defaults meanwhile". AW-01 §13 A1 records that no model-spend cap exists today, so defaults are set before the first production deployment.
- **The per-run stop from day one** follows review S3a m-11.

**(5) Knock-ons.**
- AG-11 change 6 (the spend-cap row of its halt table) (CN-AG-11).
- AG-16 (CN-AG-16): the firm screen shows (b) and (c) read-only with the firm's tightening and restates no value; after a part ends, the firm's settings govern it.
- SA-04 SA-4-89 (CN-SA-04 change 3), SA-07 L351 and the Appendix A row (CN-SA-07 changes 1 and 3) and SA-01B (CN-SA-01B change 6) cite the founder safeguards setting.
- SA-06 catalogue: no key for the switch-off (CN-SA-06 change 4).
- AW-01 and AW-02 cite SA-12-33 for the safeguard values, the caps and the platform-wide cap.
- SA-09 shows spend against the caps (CN-SA-09).

---

## 4. Document control

**(1) What it changes.** The document-control table (L4–L13).

**(2) Current words.** The last row is v2.7 of 2026-10-08.

**(3) Proposed words.** A version row: "| 2.8 | *(date placed)* | Workstream 2 change note CN-SA-12 applied: AI emergency stops that pause, with the `PLATFORM_STOP` reason of AG-11 (SA-12-31); the AI recall action and key (SA-12-32); the founder safeguards setting with its approve-all and second-person parts, Owner-only like the security settings (SA-12-27); approve-all safeguard values that a firm may tighten but never loosen while their part is on; AI spend caps including a platform-wide cap, which never pause waiting items (SA-12-33). | IMP-8, IMP-36; AIW-D57, AIW-D59, AIW-D62 |".

**(4) Why.** Review S3a m-20(c).

**(5) Knock-ons.** None.
