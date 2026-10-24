# Screen 01 — review (reviewer agent, 23 Oct, closing FIX pass, second CHECK)

Round 1 of this pass is at `c0e8ff98` (git history). Earlier rounds are at `9f3bbf77` and before.

**Commit reviewed:** `8d020757` on `claude/screens-01-fix-c3010a`. **Verdict: Ship after fixes.** 2 Must, 5 Should. **Journey score 8/10, a pass at the bar** (`journey-test-reviewer-2026-10-23-r2.md`).

**How I checked:** I read the build notes ("Fixes…", "CHECK → FIX…", "Extension (P-74)"), round 1, the break report, CAPABILITIES C1.6/C1.7/C2.7/C2.10/C3.10, P-61/62/63/66/74 and the diff `c0e8ff98..8d020757`. Walks ran on :4440 (`xr_studio_screens_rv`), suites and probes on fresh :4441 copies (`_rv2`–`_rv9`); all are now stopped and dropped. Model calls were refused, so there was no paid AI.

**Suites (outputs in my scratchpad, not the repo):** rules **63/63** · API **130/130** · channels **29/29** · release race **7/7 rounds safe** · browser **133/134 twice** (Should 3).

**Mutations** (a scratch copy of `api/`): reverting the re-add restore → API "CHECK must 2" FAILS; dropping `need(author)` from `setChannel` → channels "only an author sets a channel" FAILS. Ignoring `draftFrom` could not be isolated (the capture step does not finish in the scratch copy), so it is not counted.

## Round 1 items and breaker findings: checked
| Item | Result | Evidence |
|---|---|---|
| Must 1 QA-9 committed | **Fixed** | The three files are in `8d020757` (Layout v2 `/new`, `/program-nodes`). I did not rerun the scale suite |
| Must 2 / m6 re-add resets the line | **Fixed** | Walked on Live "With an LMIA": remove IMM 5409, then re-add it from "+ Add form". It comes back as "couple once · Needed once per couple…", draft changes return to the earlier count, v2 is deleted and v1 PUBLISHED stands. The mutation is caught |
| Should 1 / M4 removed-form state | **Fixed** | The Overview shows it as an attached source with the add step, and "+ Add form" offers Add |
| Should 2 gate in `approve` | **Fixed** | `studio.ts:528-531` calls `releaseGate`; plain BR-14 words |
| Should 3 changed-after-submission | **Fixed** | Tested in the API suite (130) |
| Should 4 P2002 in the transaction | **Fixed** | `createMany … skipDuplicates`, conditional update/delete (`form-lines.ts:39-49`) |
| Should 5 browser Back | **Fixed** | Back → `?sel=…super_visa`, row highlighted and focused |
| Breaker M1 release race | **Fixed** | 0–60 ms: 409 (refused or rolled back); 120–250 ms: the change stays DRAFT; never published unreviewed |
| Breaker M2 / M3 | **Fixed** | Per-person `/draft` (`programs.ts:241-246`); WHO list check (`form-lines.ts:28`) |

## Extension (P-74): checked
| Capability | Result |
|---|---|
| C1.6 | **Partly met.** The row and panel show the filing method; "Filed as" per line for the author (read-only for others); signatures in words; draft change only. The words break (Must 2) |
| C1.7 | **Partly met.** Portal picker with Sample portals labelled; "(default)" per line; "Use the default for N" only on click; channel problems "Blocks release". A portal change is not reviewed (Must 1) |
| C2.7 | **Met, with one defect.** Saved pages read; answers refused with reason; "Awaiting a second person"; self-approval 403; approved → "+ Add" makes an Online line. The orphan capture is Should 1 |
| C2.10 | **Met.** Sources tab, per form: "Reads the PDF version (…) first, then the IRCC Portal screens for what differs"; the choice changes words and drafting; words only for the approver |
| C3.10 | **Met.** No "box" on 24 pages, tabs and both panels |

## Issues
**Must 1: a portal change bypasses review and is released unlisted.**
* Cause: `setPortal` (`api/src/forms.ts:441-446`) edits `combination.portal_key` in place. `diff()` leaves `portal` out of its row-details meta (`engine/validate.ts:152`), yet the snapshot carries it (`engine/snapshot.ts:141`).
* Evidence: on a fresh Live row the draft count went 0 → 0 after a portal change. Walked: Release 2 of "With an LMIA" published `portal = ircc_portal`, while the review list showed only the 2 channel changes and the SME signed without seeing it. This breaks STANDARDS §3.7/§3.8 and BR-14.
* **Fix:** add `portal` to the diff (a "Filing" change, counted and listed). Test: a portal change on a Live row is 1 draft change and is held until reviewed.

**Must 2: the filing method is a broken sentence on the Programs row and the panel** (`engine/channels.ts:34`, shown by `api/src/programs.ts:156`, `web/src/pages/programs.tsx:243`, `web/src/components/channels.tsx:30`).
* It shows "PDF only; plus signed pdf upload when Needed when the applicant uses an authorized representative, …": lower-case "pdf", "when Needed when", and the full condition text. The row grows from 44 px to 102 px (EXPERIENCE §2, §5). C1.6 names the values "PDF only · Online only · Mixed".
* **Fix:** show the short method on the row and panel. Leave the per-line detail to "Filed as" or a tooltip. Add a rule test with a conditional line on another channel.

**Should 1: a refused "Add an online form" leaves an orphan capture.**
* `channels.tsx:128-136` creates the capture before the screens pass. When no screen is added, it stays OPEN and is listed as "Being captured: add the remaining screens, then finish". No screen can finish or abandon it, and each retry adds another one.
* **Fix:** abandon it when nothing was added (`POST /captures/:id/abandon`), or offer Continue/Abandon on the row.

**Should 2: an Online line's missing items give the wrong cause and step** (`engine/programs.ts:62`, `:69`). They read "1 rule does not resolve (…no screen map yet…). Next step: fix it on the Configuration tab" and "No form fields mapped yet for IMM 5257. Next step: Add 1 form from the library" (journey `J2-3`). **Fix:** make channel problems their own missing item, with a step the person can take ("Change how it is filed" / map its screens).

**Should 3: the online-form panel keeps a stale portal** (`channels.tsx:114-115`). Opened right after a portal change, it preselects the old portal and never corrects it, because the state is set once and the effect fills only an empty value. Reproduced (APR → LMIA Online shows APR at 0–3 s). The browser suite step "portal chosen" failed 2/2 for me, though the evidence says 134/134. **Fix:** follow `sum.portal` until the user touches the field, and wait for the refetch in the suite.

**Should 4: [M] standards not met in the new code.**
* Migration `20261023210000` has no recorded rollback (§5), and `portal_capture.combination_id` has no foreign key (§3.4).
* The API accepts a channel (200) and a drafting source on a checklist while the UI says "Checklist (not filed)" (§3.4).
* Channel, portal and drafting-source saves carry no revision, so a stale save overwrites silently (§4; parallel saves are safe: 409 + 200).
* **Fix:** add the rollback, the foreign key, refuse on checklists, and send `baseRevision`.

**Should 5: small UI issues.**
* "Use the default for N forms" sends N sequential PATCHes and can apply only part (`channels.tsx:78`). The edited line jumps to the top of the Forms table (the summary orders by version, `programs.ts:453`; sort by code). The `w-auto` portal select makes the page 13 px wide at 400 px.

## [M] standards (met unless listed)
**Not met:** Should 4. Deny by default: no or unknown `x-actor` still acts as the author, also on the new PATCHes (left to the Lead in round 1). EXPERIENCE §5: the Review tab's fingerprint and keys (Screen 03, as before). §1 type scale: the `text-[12.5px]` hint and new `text-[13px]` notes (`channels.tsx:40,64,101`).

**Met:** Problem Details with field errors (e.g. capture code in capitals); server duty checks (approver/SME → 403 on channel, portal, capture and drafting source); upload checks (answers refused, nothing kept); axe 0 on the combination page, both panels, the Sources tab, the approver view and the list at 512 px; keyboard path to "Filed as" with a 3 px focus ring; no sideways scroll at 1024 px or 200 %; one request per view (summary 94 ms; it makes one `defaultChannelFor` query per line, small).

**Scaffolding (P-33):** sample load and capture approval used the API. Approval is Screen 02, so it is not a finding here. Everything else used the product's screens.

## D1–D20 (1–5; independent reviewer, browser/script)
| D | Score and evidence |
|---|---|
| D1 Requirement fit | 4: all round-1 items fixed; C2.10 and C3.10 met, C2.7 met with Should 1; C1.6 and C1.7 partly met (Musts) |
| D2 Data integrity | 3: versioned lines, safe races and an exact restore; the portal is edited in place and released unreviewed (Must 1); no foreign key or revision on the new writes |
| D3 Reuse | 4: one `addFormLine`, one `releaseGate`/`gateOf`, the F1 engine reused; the drafting source belongs to the library form |
| D4 Rule integrity | 3: the gate holds on both routes; a portal change escapes the diff that feeds review |
| D5 Stability and recovery | 4: race rollback, Back restored, reload holds; orphan capture after a refusal |
| D6 Freshness and governance | 3: audit lines for channel, portal and drafting source; the portal change skips review and sign-off |
| D7 AI trust | 4: unchanged; AI steps marked; drafting source stated per form; no AI run (QA-8) |
| D8 Orientation | 4: path, Back highlight, Forms panel clear |
| D9 Flow | 3: the online-line missing items point to the wrong step; dead-end "Being captured" row |
| D10 Language | 3: C3.10 clean and the channel words are good; the filing sentence is broken (Must 2); "rule does not resolve" for a filing problem |
| D11 Feedback and state | 4: toasts, per-file results, "Awaiting a second person", "(default)", "Blocks release" |
| D12 Visual quality | 3: rows grow to 102 px from the filing sentence; very wide portal select; off-scale 13 px notes |
| D13 Accessibility | 4: axe 0, keyboard, focus ring, 1024 px and 200 %; 400 px 13 px overflow; no real screen reader |
| D14 Team look | 4: team controls (Select, Panel, Pill, Table); demo chrome separate |
| D15 Speed | 4: first view 122–265 ms, filter 25 ms, channel save 90 ms, online form 826 ms |
| D16 Testability | 4: suites green by a non-maker except one flaky step; 2 of 2 isolated mutations caught; no test covers portal-in-review |
| D17 First-use | Simulated only. The founder's walk is pending |
| D18 Provenance | 4: Sample portals labelled, capture approval state, drafting source per form, release by and when |
| D19 End-to-end | Not yet evidenced beyond configure → release |
| D20 Pain and wow | Simulated only |

## What I could not check
Capture review on a screen (Screen 02); AI drafting (QA-8); PDF downloads (QA-4); a real screen reader; a headed walk (I used headless Chrome and screenshots); a rerun of the scale suite; c8 coverage; the drafting-source mutation (scratch environment).
