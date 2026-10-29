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
| SI-6 | **AI form review** (M3-9) | Rules cross-checks on every form (US$0); the AI review live on the Visitor visa forms only (IMM 5257, 5707, 5476; one trial about US$1), saved results replayed elsewhere | AG-11 Automation (AI Doers, AG11-D4), AG-07 case core | Stand-in | Other form families one at a time, each with its own tests | P-164 (2) |
| SI-7 | **"Needs you" routing and escalation** of findings to the right person | Findings feed the representative's review drawer only | AG-11 (AG11-D2, AG11-D7; AG16-22 escalation) | Deferred | After M3 | P-164 (4) |
| SI-8 | **Plan-based gating, the ExpatReady AI pause, retention rules** | Not built | AG-11 (AG16-20 pause; plan gating and retention per AG-11) | Deferred | After M3 | P-164 (4) |
| SI-9 | **Firm, users and case team** (M3-11): representative of record with licence, case officers, assignment with history, change of representative → new IMM 5476 | A **Sample minimum**: one Sample firm (a representative and a case officer) and one Sample solo firm | AG-01 Firm setup and onboarding (users, duties); AG-07 `CaseTeamMember` (LEAD_REPRESENTATIVE · OFFICER · REVIEWER) | Stand-in | When AG-01 and AG-07's team model are available; we consume their shape | P-164 (3) |
| SI-10 | **Employer case link** (M3-7) and the one **Corporate Sample** combination | One Sample employer combination and a read-only link from the worker's case | AG-17 Corporate cases and LMIA | Stand-in | With AG-17 | P-148, M3 concept |

## Rules
1. A new stand-in or deferral gets a row here **the same day** it is decided, with its source in the team's documents (newest `sources/drive-snapshot-*`, read, never guessed).
2. A builder who builds a stand-in adds its chip and tooltip; the Lead check refuses a stand-in without one.
3. A row is never deleted: when the owner's module plugs in, its status becomes *Consumed* with the date.
4. Legal and immigration values inside a stand-in stay Sample until the immigration expert confirms (AGENTS rule 4).
