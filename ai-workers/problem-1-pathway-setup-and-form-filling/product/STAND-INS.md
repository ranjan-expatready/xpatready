# Stand-ins — what our product borrows, fakes for now, or hands to another module (P-165)

Owner: the Lead. **One sheet for the founder and the team:** every place where our build stands in for something another module owns (the team's AG and SA epics), and every item moved out of our scope, with where it comes from, so nothing is dropped and nobody builds it twice.

**On screen:** each stand-in shows a small **"Stand-in"** chip; its tooltip says, in plain words, what it does today and which module replaces it (for example "Today: our own checks. Later: the team's AG-03 Qualifier adds scores and cut-offs"). The chip carries `data-stand-in="SI-n"`. **Guard (to build, P-153):** a check fails when a chip has no row here, or a "Stand-in" row has no chip.

**Statuses:** *Stand-in* (built by us to the owner's shape; the owner's module plugs in) · *Deferred* (not built; stays with the owner, listed so it is not lost) · *Consumed* (the owner's module is plugged in; the row stays as history).

| # | What the person sees | What we build today | Owned by (the team's source) | Status | Plugs in or comes back | Decided |
|---|---|---|---|---|---|---|
| SI-1 | **Eligibility page** (M3-8): per person and program, the outcome with the missing facts, ranked, override with a reason | An adapter that fills **AG-03's result shape exactly** (four outcomes incl. "below cut-off", score, breakdown, missing fields, pack version, override) from our own gates; today three outcomes and no score. The page shows score and cut-off whenever a result carries them | AG-03 Pathway Assessment (Qualifier) §3.3, §3.9; AG-3-10–16, AG-3-33; the team's code already has 7 calculators (CRS, FSW-67, OINP, AAIP, SINP, BCPNP, MPNP), Canada-hardcoded, which AG-03 rebuilds pack-driven (§12) | Stand-in | When the team's AG-03 engine is available: it fills the same shape, no page change | P-164 (1) |
| SI-2 | **Scores, breakdown, cut-off bands, what-if advice** | Not built; the page has the places for them | AG-03 §3.4–3.6, AG-3-17–24 (pack grid rule-sets, CLB conversion, recommendations) | Deferred | With AG-03 (SI-1) | P-164 (1) |
| SI-3 | **Country pack publishing** (versioned eligibility rules per country) | Our release pin on each combination | AG-03 §3.2, AG-3-5–9 | Deferred | With AG-03 | P-164 (4) |
| SI-4 | **Client-facing assessment summary and PDF** | Not built | AG-03 §3.11, AG-3-38 | Deferred | After M3, with AG-03 | P-164 (4) |
| SI-5 | **Firm-wide list of out-of-date assessments** | Not built (each case shows its own "out of date") | AG-03 AG-3-40 (stale-assessments view) | Deferred | After M3 | P-164 (4) |
| SI-6 | **AI form review** (M3-9) | Rules cross-checks on every form (US$0); the AI review reads any form the case's release names with its official text (BK-14, P-483: no form family in code); one paid trial recorded (IMM 5257, about US$1), Saved replays only a review recorded for that form edition and those values; severities Sample | AG-11 Automation (AI Doers, AG11-D4), AG-07 case core | Stand-in | Severities confirmed by the immigration expert; each further paid trial with the founder's Go | P-164 (2), P-483 |
| SI-7 | **"Needs you" routing and escalation** of findings to the right person | Findings feed the representative's review drawer only | AG-11 (AG11-D2, AG11-D7; AG16-22 escalation) | Deferred | After M3 | P-164 (4) |
| SI-8 | **Plan-based gating, the ExpatReady AI pause, retention rules** | Not built | AG-11 (AG16-20 pause; plan gating and retention per AG-11) | Deferred | After M3 | P-164 (4) |
| SI-9 | **Firm, users and case team** (M3-11): representative of record with licence, case officers, assignment with history, change of representative → new IMM 5476 | A **Sample minimum**: one Sample firm (a representative and a case officer) and one Sample solo firm | AG-01 Firm setup and onboarding (users, duties); AG-07 `CaseTeamMember` (LEAD_REPRESENTATIVE · OFFICER · REVIEWER) | Stand-in | When AG-01 and AG-07's team model are available; we consume their shape | P-164 (3) |
| SI-10 | **Employer case link** (M3-7) and the one **Corporate Sample** combination | One Sample employer combination and a read-only link from the worker's case | AG-17 Corporate cases and LMIA | Stand-in | With AG-17 | P-148, M3 concept |
| SI-11 | **Firms adopting a release, platform roll-back** | Our author side (draft, review, approve, release) and the release pin each case reads, shaped to SA-1 | SA-1 content pack container (adoption, pinning, roll-back) | Stand-in | When SA-1's container is available | P-169 |
| SI-12 | **Letter templates, holiday calendars, deficiency library** | Not built | SA-1 pack content (SA-1-68–74); feed AG-10, the Minder, AG-07 | Deferred | With the team's modules | P-169 |
| SI-13 | **AI switch, provider terms, plan gating** | Our run screen only (steps, cost first, Stop, caps) | AG-11 (AG11-D13, D15), AG-16 (AG16-33, 34), SA-3, SA-8 | Deferred | With AG-11 and SA-3 | P-167 (share below half) |
| SI-14 | **Document storage, requests, versions, scan, file status** | A thin stand-in for the demo; our checklist rules and reader are ours | AG-09 Document management | Stand-in | When AG-09 is available | P-169 |
| SI-15 | **Client list, case shell, case team and stages** | A thin stand-in shaped like AG-07; filings, groups, waits and the release pin are ours | AG-07 Case core and delivery (ch.1–3) | Stand-in | When AG-07 is available | P-169 |
| SI-16 | **Case page frame and its other tabs** (notes, tasks, timeline, messages, billing) | Our M3 tabs (facts to filing) in a simple frame | AG-07 screens | Stand-in | Our tabs plug into AG-07's frame | P-169 |
| SI-17 | **Deadlines and reminders after filing** | The filing record is ours; no deadline engine | AG-11 Minder, AG-07 ch.7–9 | Deferred | With the Minder | P-167 (share below half) |
| SI-18 | **Withdraw a submitted application** | Our filing record shows the state; no withdrawal request built (C8.4) | AG-07 case lifecycle (with close and reopen) | Deferred | With the team's case lifecycle | P-406 (1) |
| SI-19 | **Representative's stored signature on their own boxes** | Signed by hand and scanned (C8.1); no stored signature (C8.5) | The team's user accounts and security (SA-1B-30, SA1B-D106); Unconfirmed: no counsel | Deferred | With the team's accounts | P-406 (3) |

## Rules
1. A new stand-in or deferral gets a row here **the same day** it is decided, with its source in the team's documents (newest `sources/drive-snapshot-*`, read, never guessed).
2. A builder who builds a stand-in adds its chip and tooltip; the Lead check refuses a stand-in without one.
3. A row is never deleted: when the owner's module plugs in, its status becomes *Consumed* with the date.
4. Legal and immigration values inside a stand-in stay Sample until the immigration expert confirms (AGENTS rule 4).
