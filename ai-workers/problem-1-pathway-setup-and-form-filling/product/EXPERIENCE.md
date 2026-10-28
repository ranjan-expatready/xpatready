# Experience standards — the bar for UX and UI

[M] must, [S] should. References are the bar: Nielsen's 10 usability heuristics, WCAG 2.2 AA, Microsoft's Human–AI interaction (HAX) guidelines, Carbon and PatternFly data/tree-table guidance, plain-language content design. The team's style guide (`code/ERv2-frontend@<newest>/docs/style-guide/`) wins on look.

## 0. Principle (founder, 21 Oct, P-37)
* [M] **Persona first, proven patterns, nothing extra.** For each persona (content publisher, approver, case officer, client) use the best proven pattern from leading products (list + detail panel, task-first "Needs you" views, bulk accept with side-by-side review, ⌘K search, progressive disclosure); simple and effective; no novelty for its own sake and no over-engineering. Every screen is seen and agreed in the clickable journey before it is built (P-36).
* [M] **Modern by default, information first (founder, 27 Oct).** Wherever a screen is built, choose the modern, sleek element over the plain one (cards, inline status, side panels, clear empty states, calm motion), but put scalability, ease of use and the quality and ease of information gathering first, with the look alongside, never instead. Anything complex gets a helpful explanation where it is used (a rich tooltip, an inline hint or a short "how it works" panel) so anyone can use it unaided. Neither over-engineered nor under-engineered: the right amount for the persona and the task.

## 1. Look
* [M] **Coherent look, free layouts** (`design/TEAM-PATTERNS.md`, P-48): ExpatReady brand kit, tokens, type scale and the team's components keep one look; each screen's layout and flow follow its capability; the team's style guide is a reference, not a template.
* [M] **Visual system (founder, 27 Oct, R-125; `screens/W1-visual-system/`):** one calm colour per level (Pathway slate, Program teal, Category navy bold, Sub-category navy) used alike in trees, trails, cards and lists (P-128: in the Program structure Tree, names stay in text colour and the level colour marks only the dot and number), never a status colour; a thin accent stripe per Pathway; shared Trail, LevelMark, StatusChip, SetupBar, NextStep and Pathway band; the trail keeps Category › Sub-category together and may wrap to a second line (amends "one line" below for trails). Every screen from S3 on uses it.
* [M] Team tokens only (colour, type, spacing, radius); Inter for UI text, Proxima Nova headings; 14 px UI text, 12/16/18/24 steps; no one-off values.
* [M] The current Studio shell: logo, "Product Studio · Pathway Configurator", scoped left menu (`PRODUCT.md` §3), page title + one-line description, white tables on light grey.
* [M] Status by shape and text, never colour alone; one primary action per area; modern, quiet, dense-but-readable (36–44 px rows; long text one line with full text on hover).
* [M] Demo chrome visually separate and listed as not for porting.

## 2. Behaviour
1. [M] **Know where you are:** path on every page below the catalogue.
2. [M] **One row of tabs at most;** deeper structure uses sections, a lines list, a tree, or a drawer.
3. [M] **Edit in a drawer or dialog;** the page keeps its scroll, filters, selection and expansion.
4. [M] **Preview beside the editor** wherever configuration changes what a person sees.
5. [M] **One next action per status;** statuses are calculated.
6. [M] **AI in one place per record,** labelled by its next step; AI items marked, with evidence; Accept / Edit / Reject singly and in bulk (HAX: show what AI did and why; support correction).
7. [M] **Reasons everywhere** ("Asked because Marital status is Married"); counts say what they count.
8. [M] **Prevent errors** before messaging them: pick from lists, duplicate check before save, in-page confirmation for destructive actions, undo where possible.
9. [M] **Warn, don't block,** except release checks and the form's own Validate.
10. [M] **Tooltips** on every status, icon-only button and number that needs context; errors say what happened and how to fix it, on the field.
11. [M] **Freshness visible:** when sources were last checked; overdue in orange.
12. [M] **Accessible:** real buttons/links/labels, visible focus, keyboard path for every task, 4.5:1 contrast, 1024 px and 200 % zoom work.

## 3. Screen patterns (choose one; do not invent)
| Pattern | Use for | Shape |
|---|---|---|
| Catalogue | many records (Programs) | workspace switch, filter chips, tree table with indentation, one program open by default, side panel on select |
| Workspace | one record in depth (a combination) | header with path + status + next action; lines on the left, live preview on the right |
| Library list | masters | search + facets + table with "used in" and origin; drawer: Definition · Rules/Checks · Where used · History |
| Side panel | summary + quick actions | 480–560 px drawer, sections not tabs, link to the full workspace |
| Dialog / wizard | creating something that must be right first time | ≤3 steps, master pickers, duplicate catch, "will be created as" |
| Source + proposals | reviewing AI work | source page left, proposals right, selection highlighted in both |
| Change set | review and release | every change grouped, before/after, AI or person, impact, expert confirmations; approver ≠ author |

## 4. States every screen draws [M]
Empty (teaches the first action) · loading (skeletons) · normal · long content (long names) · needs work (exactly what is missing, linked) · running (real progress, no invented percentages) · error (on the field, with the fix) · read-only (released or no permission) · conflict (someone else saved: reload or merge). Reduced motion respected.

## 5. Copy
[M] Plain words from `PRODUCT.md` §4; front-load labels; no hashes, IDs, decision numbers, model names or file paths on the main path ("Details" drawer for admins); empty states and tooltips written in the concept.
