# UX rules — checked on every screen

1. **The team's look.** Team tokens, type scale, spacing, table, form, empty/loading/error patterns (`code/ERv2-frontend@*/docs/style-guide/`). Match the current Studio shell (PRODUCT.md §3).
2. **Scoped left menu.** Only this prototype's screens, with the exact names in PRODUCT.md §4. Highlight the current item; nothing else added.
3. **User words only.** PRODUCT.md §5. No hashes, run IDs, decision codes, file paths, model names, "replay", "guarded", "composition" on the main path; those go in a "Details" drawer.
4. **Always know where you are.** Breadcrumb or path on every page below the catalogue: Individual › Work permits › Open work permit › Spouse of a skilled worker.
5. **One row of tabs at most.** Deeper structure uses sections, a lines list, or a drawer — never tabs inside tabs.
6. **Edit in a drawer or dialog;** the page underneath stays put and keeps its scroll, filters and selection.
7. **Preview beside the editor** wherever configuration changes what a person sees.
8. **One next action per status.** A status chip is calculated and always comes with the button that moves it forward.
9. **AI in one place per record,** labelled by its next step; AI items carry an "AI" mark that opens the source evidence; Accept / Edit / Reject per item and in bulk.
10. **Reasons everywhere:** "Asked because Marital status is Married". Counts say what they count: "18 documents · 6 always · 12 if".
11. **Warn, don't block,** except the release checks SA-01B names and the form's own Validate.
12. **Tooltips** on every status, icon-only button, abbreviation and number that needs context; written in plain words (concept.md lists them).
13. **Freshness visible:** when sources were last checked; overdue review in orange.
14. **Dense but readable:** 14 px UI text, 36–44 px rows, long text truncated to one line with full text on hover/expand; tables scroll inside their own box.
15. **Accessible:** real buttons and links, labels on inputs, visible focus, 4.5:1 contrast, keyboard path for every task, works at 1024 px and 200 % zoom.
16. **Demo chrome is separate** and never ported (PRODUCT.md §3).
