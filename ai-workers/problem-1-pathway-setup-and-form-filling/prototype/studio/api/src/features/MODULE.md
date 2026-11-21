---
paths:
  - "ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/api/src/features/**"
---
# Module card: api-features (P-615)
The registration seam: one file per feature, and the step folders of growing runs. Read this before editing these files; update it in the same PR when an entry point, invariant, table or test below changes (or say `Card unchanged: <reason>` in the PR body).

**Purpose.** Each `features/<name>.ts` registers a controller or service (`{ controllers, providers } satisfies Feature`); `checkpoint/NNN-*.ts` are the steps of Demo › Load the configured checkpoint; `checkpoint/combination/` runs once per combination set up from its forms; `placement/` the steps of `placeFromFormParts`. Full rules: `README.md` here.
**Owner area.** every lane adds files here (Unconfirmed: no lane map in code).
**Entry points.** `registerFeatures` and `featureSteps` (`../features.ts`); `CheckpointStep` (`checkpoint/_context.ts`); `placement/_parts.ts`.

**Invariants (set by).**
- A new controller or service is registered here, never in `main.ts`; files load in file-name order (P-214).
- A step's number is its order; two files with one number, a step without `run`, or a misnamed file stops start-up (B120, P-376 (3)).
- `_<name>.ts` is a helper; a step folder holds `.ts` files only.
- State a later step reads belongs to the step that makes it (`stateOf`); services come from `ctx.get(Service)`.
- A step is a plain object; no `try` around another step's work.
- A reviewed release is never edited: "later" own questions are asked by release 1, after every other combination (P-598, P-496).
- The firm's own facts are the case officer's, never the client's (P-486, QA-403).
- A refused line is named in `refused`, never dropped silently (P-444).
- `platform-firm-walls.ts` (PF-12) runs every handler in its request's firm scope, and stops the start-up when the API's database role could pass the firm walls.
- `case-firm-door.ts` (CS-W3) is a guard that only tags a case-side request with its firm (`setRequestFirm`); it loads before PF-4's guard and must stay correct in either order.

**Tables.** through the services it registers: sectionQuestion, canonicalField, formEdition, libraryChange, proposalItem, combinationForm, sourceAttachment, formFieldMap.
**Tests.** `tests/check_features_registry.ts`, `tests/check_pf12_walls.ts`, `tests/check_b104_checkpoint.ts`, `tests/check_checkpoint_review_order.ts`, `tests/check_checkpoint_sheet_stable.ts`, `tests/check_c73_parts_checkpoint.ts`.
**Row lists (P-712).** Never hand-edit this card's frozen `Tests.`, `Tables.` or `Entry points.` line: put your row's items in `MODULE.rows/<ROW>.md` next to it (one file per row; `module-cards.py` fails the PR otherwise).

**Do not.**
- Edit another feature's step or a shared constructor to add yours; add a numbered file.
- Reuse a step number, or wrap another step in `try`.
- Name a combination or form number in a step (P-319).
