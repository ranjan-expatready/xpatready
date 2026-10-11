# Change note CN-SA-12: Feature Flags and Platform Configuration

| | |
|---|---|
| **Document changed** | SA-12 Feature Flags & Platform Configuration, version 2.7, dated 2026-10-08 |
| **File (11 Oct 2026 snapshot; unchanged since 9 Oct)** | `sources/drive-snapshot-2026-10-11/02-functional-requirements/super-admin/SA-12-feature-flags-and-platform-configuration_v2.7_2026-10-08.md` |
| **Date of this note** | 11 Oct 2026 (third round: pause reason cited; spend caps never pause waiting items) |
| **Status** | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| **Changes** | 4 |

**How to read this note.** Each numbered change has five parts:
1. What it changes, by ID, section and line of the snapshot.
2. The current words, quoted exactly.
3. The proposed words, in SA-12's own style.
4. Why: the founder's decision (`ai-workers/decisions.md`, AIW-D*n*), the improvement (`ai-workers/design/ws2-improvements.md`, IMP-*n*) or the proposals row (`ai-workers/proposals.md`).
5. What else must change.

What each AI assistant does when stopped is specified in AW-01 and AW-02, which cite these IDs.

**Plain words used here.**
- *Kill switch*: SA-12's emergency brake that forces a feature off for every firm at once.
- *Needs you*: the firm's inbox where anything prepared without a person present waits for a person to approve, edit or reject.
- *Platform setting*: one typed, versioned value in SA-12's registry, with per-plan and per-firm overrides (SA-12-17).
- *Pilot safeguards setting*: one platform setting, on from the start, that keeps the founder's pilot safeguards in force. It is switched off only by a recorded founder decision (change 3). Requirements name this setting instead of saying "during the pilot", because the product can check a setting but cannot check a period.

**This note is the one home of** the AI spend caps, the values of the founder's approve-all safeguards (AIW-D57) and the *pilot safeguards* setting (SA-12-33; `00-step3-plan.md`, "Pilot safeguard values, one home"). Other notes and AW files cite SA-12-33 and restate no value. **It is not the home of the pause reasons:** the four reasons an AI-prepared item is paused, in one PAUSED state, live in CN-AG-11 item 6; this note cites `PLATFORM_STOP` from there.

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
>   - (c) **nothing covered by the flag is sent while it is tripped**; every item already waiting in Needs you is paused with the reason **`PLATFORM_STOP`** (CN-AG-11 item 6, AG-11-112 (e)), stays visible, marked "AI paused by Expat Ready on <date>: <reason>", and may be withdrawn with the recall action (SA-12-32). This is an exception to SA-12-9's hide-or-refuse for this flag family;
>   - (d) on untrip, paused runs resume from where they stopped, and the `PLATFORM_STOP` reason clears; an item with no other pause reason **re-renders as stale and needs a fresh approval** before anything is sent (AG-11-112 (e));
>   - (e) the firm's Owner sees a banner, and the stop and its reason show beside the firm's own AI switch (AG-16-35);
>   - (f) the product's own deadline and expiry reminders (SA-3-35; the Minder has no AI) and the Practice expert's rule-built answers, which work with AI off, are never affected; only the Practice expert's summary line sits behind an AI flag.
>
>   The firm's own AI switch and the per-assistant firm switches sit below these flags; a platform stop always wins (SA-12-4).

§3.4, after the kill-switch paragraph, add: "For the AI flags (SA-12-31) the kill-switch pauses AI work and holds every waiting proposal unsent but visible, paused with the reason `PLATFORM_STOP` (CN-AG-11 item 6); a separate recall withdraws them (SA-12-32), and on untrip each needs a fresh approval."

**(4) Why.**
- **The team's pending knock-on.** AG-11 v1.12 lists this as pending (§0.2, L56: "| **SA-12** | Platform kill switch for the AI Doers | Pending |").
- **IMP-8** asks for "the SA-12 switches: one for all four AI Doers and one per AI Worker, each an emergency stop at platform level with a mandatory reason".
- **The one stop rule.** The Step 3 shared rule fixes the behaviour: "a stop pauses runs and delegations; nothing sends while stopped; waiting items can be withdrawn with the recall action (SA-12-32); on release every waiting item re-renders stale and needs fresh approval. A delegation ends only when its person ends it or is deactivated or suspended" (`00-step3-plan.md`, emergency stop). It replaces the first version's "end running assistant runs" and "approvable" wording (review S3a m-7).
- **One home for the pause reasons.** CN-AG-11 item 6 holds the four reasons in one PAUSED state, among them "`PLATFORM_STOP` (Expat Ready's emergency stop for all four AI Doers or for that assistant, SA-12-31)", and calls itself "the one home of the four reasons" (`00-step3-plan.md`, "One word, *paused*"). This note cites the reason and does not define it.
- **No one stops another person's delegation.** The kill switch pauses every run under a flag; it is not a key that ends any person's delegation (`00-step3-plan.md`, "No one stops another person's delegation").
- **Prior art.** Doc 2 v1.4 already numbers a pause-hook contract SA-12-29 to SA-12-31 (L5453): "`pause` parks queued work retaining payload+order, checkpoints executing runs, withholds scheduled sends … nothing is deleted". The module file SA-12 v2.7 is current (rule 11), so its numbering stands and Doc 2's contract is cited as the mechanism, not as a live ID (review S3a m-10).
- **Relied on by the behaviour documents.**
  - The Support assistant's start condition: "The persona's own flag is on and not kill-switched … one flag per persona is IMP-8 (Proposal)" (`support-and-account-assistant.md` §1).
  - The Pack author's assistant: kill switch under `system/flag:kill` (`pack-authors-assistant.md` §4).
  - The Case, Intake and Firm documents measure "items withdrawn (IMP-8)" (§6 of each).
- **Point (f)** follows AIW-D37 (the deadline watch "is the product's own Minder … never as AI") and AIW-D54 item 10 ("the expert's answers work with AI off").

**(5) Knock-ons.**
- AG-11 item 6 (`PLATFORM_STOP`, AG-11-112) and the §0.2 SA-12 row (CN-AG-11).
- AG-16-35 and AG-16 §13 Q7 and Q9 (CN-AG-16).
- SA-07 Appendix A row L741 (CN-SA-07 change 1).
- SA-08 SA-8-50 (withdrawing the provider record pauses waiting items with its own reason, `PROVIDER_RECORD_WITHDRAWN`; CN-SA-08 change 2, CN-AG-11 item 6).
- AW-01 AW-1-56 reads "pause … at the next safe point" in place of "end running delegations" (the change note wins; `00-step3-plan.md`, "One home per rule").

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

## 3. The AI settings: the *pilot safeguards* setting, the approve-all safeguard values and the spend caps, as platform settings a firm may tighten but never loosen

**(1) What it changes.** §3.6 "Categories (initial)" (L274); §10 role-mapping paragraph (L571); a new requirement SA-12-33.

**(2) Current words.**

L274:
> **Categories (initial):** upload limits (max bytes, MIME allowlist), session/auth (session timeout, token TTLs that are safe to expose), platform defaults (default locale/currency/timezone fallbacks — *not* a firm's own settings, the platform fallback), branding defaults (platform name, support email, default theme tokens), system params (pagination caps, queue concurrency hints), and the rate-limit config (3.9).

L370:
> - **SA-12-17:** The platform maintains a `PlatformSetting` registry: typed (int/bool/string/enum/json/duration/bytes), **schema-validated** on write (no manual validation chains), scoped (PLATFORM default with per-plan/per-firm overrides), and **environment-aware** (dev/staging/prod values).

**(3) Proposed words.**

L274 gains: "AI settings (the pilot safeguards setting, the approve-all safeguard values and the AI spend caps, SA-12-33)."

New requirement:
> - **SA-12-33:** *(new — AIW-D57, AIW-D59, AIW-D62; IMP-36)* The registry (SA-12-17) holds three groups of AI settings:
>   - **(a) The pilot safeguards setting** (a yes/no setting; the team names the key). It is **on** from the first deployment. Only the Platform Owner can switch it off, and only by recording, as the change reason, the reference of the founder's decision that ends it (SA-12-25). While it is on:
>     - the values in (b) and (c) are locked: a per-firm value **may only tighten** the platform default (a higher confidence level, a larger hidden share, a lower alarm level or a lower cap), and a value that would loosen it is refused on write;
>     - no approve-all safeguard in (b) can be switched off, at platform, plan or firm level. A value that would switch one off is refused on write: no low-confidence values opened first, no value hidden for the approver to fill, or the agreement alarm off;
>     - a plan or billing-period change proposed by the Support and account assistant needs a second person's confirmation (SA-4-89).
>   - **(b) The approve-all safeguard values** (AIW-D57): the confidence level below which a value is opened first; the share of values hidden for the approver to fill (at least one value on every approve-all); and the level and time window of the agreement alarm.
>   - **(c) The AI spend caps:** per firm per month (warning at 80 %; at 100 % new model calls stop and the manual path applies, AG-11-71); per Practice expert user per day; and per assistant run (a runaway run is stopped and parked for a person, from day one). **Reaching a cap stops new model calls only.** It never pauses, cancels or withdraws an item already waiting in Needs you: that item stays approvable, because approving it makes no model call (CN-AG-11 item 6). Spend caps never stop the product's own non-AI work.
>
>   The values in (b) and (c) are platform defaults. The pilot values are set by the team before the pilot; spend caps are changed after it on the founder's decision (AIW-D62). Every change is audited with a reason (SA-12-25). The firm's own settings screen shows these values read-only, together with any tightening the firm has chosen (AG-16, CN-AG-16).

Role mapping (L571) gains: "Switching the pilot safeguards setting off is reserved to the Platform Owner (SA-12-33)."

**(4) Why.**
- **One home.** The Lead's call of 11 Oct (re-check S3c-b N-7), recorded in `00-step3-plan.md`: "the founder's approve-all safeguards (AIW-D57) and spend caps are platform settings in CN-SA-12 (SA-12-33), locked by the *pilot safeguards* setting; a firm may tighten them, never loosen them. CN-AG-16 shows them read-only with the firm's tightening and restates no value." The tighten-only rule sits under the setting because that is what locks the values, and AW-01 tests it that way ("A firm tries to raise a cap or lower a safeguard while the pilot safeguards setting is on → refused; only tightening is saved").
- **A setting, not a period.** `00-step3-plan.md`, "No 'during the pilot' in a requirement": "a requirement names a platform setting the product can check, the *pilot safeguards* setting, on from the start and switched off only by a recorded founder decision (AIW-D57, D59)". This replaces this note's earlier "During the pilot, no setting can switch off …" (re-check S3a-b m-4).
- **Caps never pause waiting items.** The Lead's call of 11 Oct, `00-step3-plan.md`, "Spend caps never pause waiting items": "reaching a cap stops new model calls only, then the manual path; items already waiting in Needs you are unaffected (a cost control, not a safety stop). CN-AG-11 item 6 carries it". CN-AG-11 item 6's halt table matches: "the cap stops new model calls and parks a runaway run for a person (SA-12-33); approving an item already waiting makes no model call, so it stays `PENDING`".
- **The safeguards.** AIW-D57 ("Adopt all three"): "low-confidence values opened first; a few values hidden for the approver to fill, match rate recorded; an alarm when a person's agreement rate climbs suddenly. Provisional until counsel." The names of the values follow AW-01 §13 T7 ("confidence threshold, holdout share, alarm level and window"). No number is set here.
- **What "switched off" means.** AW-02 AW-2-77 states the same floors: "low-confidence first, at least one hidden value per accept-all, the always-on agreement alarm … settings may only raise values above those floors". This note becomes their one home, so AW-2-77 cites SA-12-33 (listed for the Lead).
- **The second person.** AIW-D59 ("Yes, for the pilot"): "A second Expat Ready person confirms any account or plan change the Support assistant proposes, during the pilot; reviewed after it."
- **Owner only.** SA-12's Platform Owner "holds everything plus the confirmation authority on the most dangerous switches" (L571); `system/platform-config:manage` is also held by the Platform Engineer (L566, L571), so the switch-off is narrowed to the Owner.
- **Spend caps are not plan limits.** SA-03 v2.17 limits plans to four limits (SA3-D14, L74: "**Four limits only:** staff seats, active individual cases, active corporate cases, document storage."). AG-11 v1.12 records the same: "volumes are not plan limits (SA3-D14)" (§0.2, L57). SA3-D14 is a later team decision than IMP-36, which was only a proposal. So the first version's "cap rows in SA-03" is withdrawn (CN-SA-03), and the caps go to the platform registry.
- **IMP-36:** "per firm per month (a warning at 80 %, a hard stop at 100 %, then the manual path, AG-11-71), per co-pilot user per day, per worker run". The placement of the caps in the registry is **Proposal — not approved** (IMP-36 is an improvement, not a founder decision).
- **AIW-D62:** spend caps are decided after the pilot, "with today's defaults meanwhile". AW-01 §13 A1 records that no model-spend cap exists today, so the pilot values are set before the pilot.
- **AW-02 already places them under SA-12's key:** its §10 table E gives `system/platform-config:manage` "Spend-cap values; safeguard values above the floors (AW-2-29, AW-2-57, AW-2-77)".
- **The per-run stop from day one** follows review S3a m-11.

**(5) Knock-ons.**
- AG-11 item 6 (the spend-cap row of its halt table) (CN-AG-11).
- AG-16 (CN-AG-16): the firm screen shows (b) and (c) read-only with the firm's tightening and restates no value.
- SA-04 SA-4-89 (CN-SA-04 change 3), SA-07 L351 (CN-SA-07 change 3) and SA-01B (CN-SA-01B change 6) cite the pilot safeguards setting.
- AW-01 AW-1-33 and AW-1-54 cite SA-12-33.
- AW-02 AW-2-29, AW-2-57 and AW-2-77 cite SA-12-33; AW-2-77's "during the pilot" reads "while the pilot safeguards setting is on" (listed for the Lead).
- SA-09 shows spend against the caps (CN-SA-09).

---

## 4. Document control

**(1) What it changes.** The document-control table (L4–L13).

**(2) Current words.** The last row is v2.7 of 2026-10-08.

**(3) Proposed words.** A version row: "| 2.8 | *(date placed)* | Workstream 2 change note CN-SA-12 applied: AI emergency stops that pause, with the `PLATFORM_STOP` reason of AG-11 (SA-12-31); the AI recall action and key (SA-12-32); the pilot safeguards setting, the approve-all safeguard values and AI spend caps as platform settings that a firm may tighten but never loosen while the setting is on, and caps that never pause waiting items (SA-12-33). | IMP-8, IMP-36; AIW-D57, AIW-D59, AIW-D62 |".

**(4) Why.** Review S3a m-20(c).

**(5) Knock-ons.** None.
