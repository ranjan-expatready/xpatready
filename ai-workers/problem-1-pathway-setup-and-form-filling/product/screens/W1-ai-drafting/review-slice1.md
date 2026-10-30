# Review: W1-10 slice 1, filing channels (forms lane), stage CHECK

Reviewer: independent (skill screen-review, backend path P-68); did not build it. Branch `claude/forms-slice1-finish`, HEAD d42414a6 (4d0f5382 CHECK note landed during the review; the builder's uncommitted `finder.ts` C-12 change is not reviewed). Concept: `plan-slice1-channels.md` §3 C-1…C-12, §5, §7, §8a, §9. Isolated copy `fx_rev` on :4480, fake launcher, US$0 (one live-mode find was started by a mis-aimed click in my walk; the fake launcher answered it, `drafting_job` cost sum 0). Journey report: `journey-test-reviewer-2026-10-29.md`.

## Verdict: Ship after fixes
The slice's core holds: the four channels and the signature value, C-2 fit, C-3/C-4 per account on save and at release, the migration, C-8 old-spelling reading, C-5 "propose, never write", C-9/C-10 enforced on the server, C-11 as a release warning, QA-98 reserves per step. Server roles hold (author-only, 403 for approver, officer, client; 401 for nobody); concurrent saves on one line give 200 + 409. Two Musts below: a finder proposal that can never be approved, and an IRCC account that only the sample can set.

**Journey score: 7.5 / 10 (fails: pass is 8, no criterion at 0).** Table in the journey report.

## Dimensions (D17, D20 simulated only)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 7 | C-1…C-11 built; C-3/C-4 need an account, settable only by Load sample or raw API (M2); C-12 records unused in the sample library (S3); C-9 "blocks Ready to file" is a lock block, the pill still says Ready to file (S2) |
| D2 Data integrity | 7 | Claimed writes (`from`/`fromSignature`), DB checks on account, basis and Not needed; but a finder change with Not needed + any account is created and can never apply (M1) |
| D3 Reuse | 9 | One words source (`contracts/forms.ts`); `allowedChannels` shared by save, view and release |
| D4 Rule integrity | 8 | C-2/C-3/C-4 pass and fail tested; `filingKind` drops Paper when all three channels are present (S1) |
| D5 Stability | 7 | Race 200/409 on PUBLISHED and DRAFT lines; the stuck change in M1 has no recovery but Return |
| D6 Governance | 8 | Audit lines on channel, signature, account; accepts change says before → after with reason |
| D7 AI trust | 8 | Ready/Check with both readings and quote; nothing written directly; v1 runs labelled "Saved before channels" |
| D8 Orientation | 9 | "IRCC account: Filed through the PR Portal" read-only beside Filing |
| D9 Flow | 7 | Refused ways greyed with a reason each; a Not needed refusal says "record it for this combination's IRCC account" when no screen sets one (M2) |
| D10 Language | 7 | Library tip still says "a PDF upload, an online form in the portal, or either" (S4); "Nothing was deleted" on an accepts approval (M1) |
| D11 Feedback | 8 | Not needed line greyed with the reason; stale Not needed after an account change shows a note, not a silent change |
| D12 Visual | 8 | Team components; at 1024 px the Forms table scrolls inside its card (Signature off-view), page itself has no sideways scroll |
| D13 Accessibility | 9 | axe 0 on Forms tab (3 states), library drawer, accepts form, change page; 1024, 720 (200 %), 400 px no page scroll; keyboard ArrowDown changes "Filed as" and keeps focus |
| D14 Team look | 8 | Same S5 table and drawer patterns |
| D15 Speed | 8 | Forms tab 0.4–1.2 s, library 0.3–2.0 s under heavy machine load |
| D16 Testability | 8 | Pass and fail tests for C-1…C-11, migration 9 checks, browser check 25/25 (rerun by me on :4480); no test for M1, S1 (3-channel kind) |
| D17 First use | simulated only | |
| D18 Provenance | 8 | Basis per record (Sample, founder, AI), quote or "Set by a person" |
| D19 Closure | 6 | Publisher-created combination cannot reach C-3 per-account or C-4 Not needed without the API (M2) |
| D20 Pain/wow | simulated only | |

## Findings
**Must**
- **M1 (Blocker for that path) Finder proposes "Not needed, any account"; approval always fails with wrong words.** `find-forms-output.v2.schema.json` allows `NOT_NEEDED` with `ANY`; `api/src/filing.ts:79` and `api/src/finder.ts:469-473` create the change; `api/src/lifecycle.ts:372` upsert then breaks `form_edition_accept_not_needed_check`. Reproduced on :4480: approve → 409 "Nothing was deleted: the database refused it", change stays WAITING forever. Fix: in `channelProposal`/`proposeChannel`, Not needed with no named account is listed (or Check with the account required), never a change; schema or prompt names the account; one pass and one fail test in `check_forms_s4_finder.ts`.
- **M2 (P-33) The combination's IRCC account has no screen.** `PATCH /combinations/:id/account` (`api/src/forms.ts:117`) has no web use (graph: `webUse:false`); only Load sample (`finder.ts:757`) and tests set it. A publisher's own combination stays "not set", so C-3 per account and C-4 Not needed can never be reached, while the refusal tells them to record it "for this combination's IRCC account". Fix: the account set where the combination is set up (P-137: fixed by the combination; read-only on the Forms tab), or Lead decides it stays sample-only and the refusal words say so.

**Should**
- **S1 Filing kind drops Paper.** `engine/channels.ts:104`: Online + PDF + Paper reads "Mixed: online and PDF" (seen on With an LMIA: IMM 1295 Paper, IMM 5707 Online). Fix: name all three; add the 3-channel case to `check_forms_channels.ts` C-7.
- **S2 C-9 wording.** `web/src/runtime/forms.tsx:126` shows "Ready to file" for a barcode form with no current validated copy; the lock is refused (server `fill-case.ts` lock route, good), but P-144/C-9 say it blocks Ready to file. Fix: the pill follows `needs_validate && !validated.current`.
- **S3 C-12 not reachable in the sample.** IMM 5669/5406 are not in the sample library, so the founder records never apply; nothing applies them when the forms are added later (fillSample runs only at Load). Builder's uncommitted change words it; the record still never lands. Lead: accept as sample limit or apply on edition add.
- **S4 Old words.** `web/src/pages/library-forms.tsx:42` ACCEPTS_TIP lists only PDF/online/either; add Paper and Not needed per account.
- **S5 (Minor) Race on finder proposals.** `finder.ts:471-473` has no after-insert guard (form-library.ts proposeAccepts has one): two finds attaching the same form at once can leave two WAITING accepts changes.
- **S6 (Minor) Find dialog** `web/src/pages/workspace/finder.tsx:87`: "Use the application page already chosen (no AI round)" gets a "rules" pill; it is neither.
- **S7 (Minor)** `setAccount` has no claim token (two authors, last write wins); `validated_copy` FK is ON DELETE CASCADE though C-10 says kept as history.

Declared, not re-raised: barcode not decoded (`barcode_checked:false`, §9 a), `BARCODE_FORMS` fixed list.

## Not checked
Full suite set (CI is the check); a real screen reader; an intended user's unaided walk (D17, D20 stay with the founder); the runtime case Forms panel by browser (code read only); live AI (US$0).
