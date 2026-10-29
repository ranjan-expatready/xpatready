*Outside review by Devin. These are observations with evidence to be revalidated, not instructions. Claude Code verifies each and decides freely; DECISIONS.md wins. My justification is included per finding so the Lead can confirm or reject quickly.*

Devin walked the backbone journey like a person on :4490 (own copy xr_studio_devin_x1) on origin/main 56f04113: Reset → structure added → combination created via the old /new page → IMM 5257 uploaded and in the library → duplicate and older-edition uploads. US$0. Screenshots: COPY `devin-review/2026-10-29-backbone/01–15`.

## For the founder
1. Upload result cards on the Forms page pile up forever — no way to close them (your observation, confirmed: minor).
2. A form added by mistake can never be deleted — only retired, because an upload approved against canada.ca counts as an "approved file". Worth your call.
3. The combination's "Upload an IRCC PDF below" shows nothing below; "Find them with AI above" points at a button that is not there yet.
4. Duplicate detection works correctly: same file renamed is recognised ("Already in the library"), older edition is held aside — the file's fingerprint decides, not its name.
5. Small copy/design mismatches (role name, decision numbers on screen, fonts) — listed below for the screens lane.

## Benchmark
- Dismissible run results (toast/collapse), one clear way in per action, no dead-end copy.
- Names/labels match the built-in masters; no internal codes on the main path.
- Lifecycle words consistent with P-116; every masters row offers the right action for its state.

## Findings
| id | type | severity | steps | expected | actual | evidence | suggested lane |
|---|---|---|---|---|---|---|---|
| DV-bb-1 | UX | Minor | Forms → Upload PDF twice | Each "Reading an uploaded PDF" card can be dismissed or collapses to one line (Linear/Stripe pattern: transient result, not permanent stack) | Cards stack at top forever; no close/collapse; older runs keep a full green card each | shots 14,15 | screens |
| DV-bb-2 | Ambiguity | Minor | Upload IMM 5257 (auto-approved vs canada.ca) → row actions | A never-released, unused form can be Deleted per P-116 state A — or the concept deliberately protects every approved file | Row offers only Retire; nothing can remove a form uploaded by mistake, ever. Justification: P-116 protects approved files, but auto-approval makes every upload permanent — plausible intent, worth a founder line | shot 14; lifecycle.ts formUses | Lead → founder |
| DV-bb-3 | UX | Minor | Combination → Add a form from the library (empty library) | Copy describes a control that exists | "Upload an IRCC PDF below." — nothing below; only "Open the Form library" | shot 11 | runtime |
| DV-bb-4 | Gap | Minor | Combination → Forms tab, empty | The named next action exists | "Find them with AI above" — no finder control on main until S3 (start setup) merges; new combinations cannot reach the finder | shot 10 | Lead (S3 dependency) |
| DV-bb-5 | Design | Minor | Forms list row | Same typeface family/weight per row | Form number "IMM 5257" in a different (mono) style than title/cells | shot 14 | forms |
| DV-bb-6 | Copy | Minor | (a) Workspace header lists "Dependent child" — built-in role is "Child". (b) Reset dialog "0 rows remain" — 6 roles are kept. (c) Program structure footer shows "(P-95)" on the main path, against PRODUCT §4 | Labels match masters; no decision numbers/IDs on main path | three mismatches | shots 04,05,10 | screens / runtime |

## Not findings (verified good)
- Reset keeps the two Pathway types + six built-in person roles (API check); dialog explains kept items with fingerprints.
- Add pop-up: Enter accepts new names (QA-56 path), per-field duplicate/spelling checks, "You are adding …" preview — good.
- Upload identity: rules read code+edition from file content; renamed file → "Already in the library"; older edition → held with clear explanation + To review link (the held item correctly lands on To review, "1 waiting").
- "No AI call was made · US$0" labels are honest on the upload runs.
- Old /new page (with "Describe it") still serves start on main — already superseded by P-125/S3, not a new finding; the whole page is to be removed when S3 merges.
