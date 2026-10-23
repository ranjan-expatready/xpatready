# Bugs — open only (the qa lane writes this file; the Lead's lane assignments reach it through the qa lane's "From the Lead" note; closed after a qa retest)

Severity: **Blocker** (data at risk or the proof cannot run) · **Critical** (a capability gives a wrong result) · **Major** (works with a real gap or misleading message) · **Minor**. Closed bugs move to `history/`. Each bug gets a replayable check in `prototype/studio/tests/qa/`.

| # | Severity | Capability | Found on | What happens (steps → expected → actual) | Evidence | Lane | Status |
|---|---|---|---|---|---|---|---|
| QA-1 | Critical | C5.2 | main eeea376f (Lead audit) | Shared Release page → release a draft → expected: refused until submitted and the expert ticked → actual: released; the first author is recorded as submitter | `prototype/studio/api/src/studio.ts:527-547`, `web/src/pages/release.tsx:23` | screens | Open: next FIX pass |
| QA-2 | Major | C3.3 | main eeea376f (Lead audit) | Run `check_ai_drafting` → expected pass → actual 31 pass, 2 fail, crash (expects exactly 4 saved IMM 1344 runs; 6 exist) | audit 23 Oct | forms | Fix uncommitted on the forms branch |
| QA-3 | Minor | — | main (Lead check 23 Oct) | Restart script stops every app copy, not only its own port | `screens/01-programs-catalogue/lead-check.md` finding 1 | screens | Open: next FIX pass |
