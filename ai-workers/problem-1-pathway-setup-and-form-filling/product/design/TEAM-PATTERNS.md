# Team patterns — a reference for a coherent look, not a template (P-48, as clarified)

**How to use this:** the brand kit, tokens, type scale and the team's components keep the product looking like one product. **Layouts are not copied:** each screen's layout and flow follow the capability that screen proves, and patterns evolve as we learn across the product. When a screen needs something different, do it and note why; nothing here forces a layout.

Source: the team's style guide `code/ERv2-frontend@<newest>/docs/style-guide/` (read 21 Oct from `@5ccd9fa-2026-10-20`; the GitHub repos are not reachable from the Lead's session — the builder re-checks the newest local snapshot). `forms.md` and `tables.md` there are binding for the team; we follow them too.

## Good defaults to reuse (use the team's component when it fits the job; never re-create one that exists)
| Area | Team rule |
|---|---|
| Brand | `BrandLogo` (Blue #0862C5 on light, white on dark; symbol under 140 px); never Electric Blue or Orange as text |
| Type | Proxima Nova for headings (self-hosted in `public/fonts`), Inter for everything else; sizes only 12 / 14 / 16 / 18 / 20 / 24 px; 14 px default UI text; no 13 / 13.5 / 15 px |
| Page | `PageScaffold` + one page card (`PageCardFrame`); breadcrumb lives in the app header (`crumbs`); title, one muted subtitle, actions on the right with the primary last; inline `stats` |
| List | `FilterLayout`: search + at most two primary filters + active-filter chips; secondary filters collapse; filter state in the URL; table never inside a card; 44 px rows; identifier first, status near the end, actions last |
| Detail | Read-and-act = right-anchored panel (Dialog `variant="panel"` / `Sheet`) with pinned header (title + status badge), scrolling body, pinned footer (Cancel left, primary right); several views = tabbed detail page with tabs in the route, first tab Overview, stable tab set, one or two words per tab |
| Overlays | Any pane that collects a value is a right panel, never a centred modal; centred modal only for a yes/no confirm (`ConfirmActionDialog`); no stacked overlays |
| Forms | Errors on the field that caused them (`FormField` error, `aria-describedby`), every error at once, never colour alone |
| Feedback | `toast({variant})` — success / error / alert / info with icons, 5 s, one per action, never the only copy of a required action; persistent conditions inline as `Finding` |
| States | Loading skeleton + `sr-only` status; `ErrorState` with a real Retry; 403 as `NoAccessState`; `EmptyState` wording differs for "nothing yet" and "nothing matches" |
| Words | Sentence case everywhere (no ALL CAPS headers); buttons verb + object; field errors say how to fix; plain, calm, no blame |

## Where we already chose differently (examples, not a closed list)
| Ours | Team today | Why |
|---|---|---|
| Programs as a flat list, one row per combination, breadcrumb path, sorted Program › Category › Sub-category | Hierarchy page with tree / pane layout | The job is "find a combination and act"; a flat sorted list is faster and searchable; the tree stays for editing structure later |
| "Needs you" default view with counts on the filter | Status filters, no default work view | Task-first landing for the Super Admin |
| Undo on toasts for reversible actions (bulk accept, fact changes) | Toasts without Undo | AI and bulk actions need a fast way back |
| One AI line (source · confidence High/Medium/Low · cost) wherever AI acts | No AI pattern yet | Human–AI guidelines; trust and cost visible |
| Fact edits show where they landed ("updated in 4 places …") | n/a | One fact fills many forms |

## Checklist (Lead at DESIGN, builder at BUILD, checker at CHECK)
Team component exists? → use it · type sizes from the scale · sentence case · panel not modal for anything with a field · error on the field · toast variant + page reflects the change · empty state wording right · breadcrumb in the header, not in the page body.
