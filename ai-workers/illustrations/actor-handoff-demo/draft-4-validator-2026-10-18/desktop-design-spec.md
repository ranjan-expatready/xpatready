# Desktop presentation: selected correction method

18 October 2026 · Proposed visual treatment for Claude to implement within the existing Solution 1 format. This is an artifact-design specification, not new product behaviour. Read the paired validator report for confirmed findings and latest founder directions.

## The choice

| Option | Benefit | Cost | Choice |
|---|---|---|---|
| Refine current bands/cards, technical views and local detail pane | Preserves familiar content and interaction; directly fixes spacing, hierarchy and connectors | Requires deliberate row/column composition rather than a few colours | **Selected** |
| Replace the map with a large requirements matrix | Regular rows, easy tabular comparison | Changes the approved presentation and weakens the journey | Do not use for the main map; keep supporting matrices where useful |
| Stretch all cards to equal height / shrink fonts | Quick cosmetic uniformity | Creates blank interiors or makes reading harder | Reject |
| Change diagram tool or build a new presentation platform | More freedom in theory | Unnecessary rebuild and preservation risk | Reject |

## 1. Information hierarchy and space

- Keep the business map first in importance, technical BPMN underneath, details local and on demand. Retain all three bands and their stage IDs.
- Reduce the introduction's visual weight: concise problem, a few connected answer statements, compact example identity facts. Preserve the detailed explanation in the current relevant panels; no blanket word-cut target.
- Use compact term/definition pairs. Put the representative's long permission/payment explanation in the existing role details; keep a short accurate definition in the quick key. Avoid a four-column row whose longest cell determines a large empty second row.
- Make phase/card headings share a baseline, with consistent title space within each comparable row. Place role side tags consistently after or below actor names, not a mixture. Keep action verbs and labels at the same visual level.
- Rebalance the stage-card widths; reduce the dedicated end column to a compact attached completion/handoff strip. Use a shared compact entry region for A/B rather than a tall pair of entry cards setting the height of the whole first case row. Same nodes and flow; this is layout, not a new process.
- Align comparable sections using deliberate grid areas or shared row tracks where they actually apply. Allow different content lengths and omit inapplicable fields. Do not create a blank “Decision” panel on every stage just to equalise height.
- Keep the overview's actor actions short and specific. Repeated full explanations already available in a panel can move there, with the change recorded. All actor identities, authority and important outcomes remain visible or one click away.
- At 1440/1920, use the extra desktop width selectively for the map plus a readable details region. Keep narrative prose around 65–85 characters per line where practical. Do not turn every paragraph into a full-screen line or stretch diagrams to change their font scale.
- Treat 960px as a constrained desktop reading pane. Reflow stages deliberately without a large detached end island. No phone-first redesign, new phone features or mobile-only score penalty.

## 2. Typography and content rhythm

Use the existing system sans-serif family. Establish one small scale rather than many near-identical styles:

| Element | Treatment |
|---|---|
| Page title | Clear, restrained; about 28–30px |
| Band/section heading | About 18–20px, semibold/bold |
| Card heading | About 15–16px; consistent line-height and header alignment |
| Functional body | Around 14–15px with 1.4–1.5 line-height; avoid shrinking text to fit |
| Section/actor-side label | Smaller but readable, consistent weight/tracking; reserve uppercase for a few true labels |
| Diagram labels | Keep the approved primary/secondary hierarchy under D242; solve crowded geometry rather than further shrinking or globally zooming |

Use a short spacing scale such as 4 / 8 / 12 / 16 / 24px. Pick one card padding, one label-to-content gap and one table-cell rhythm. Use bold for a decision/state/action, not nearly every phrase. Align continuation lines under the text, not under the bullet or number. A long list gets a quieter marker and readable spacing, not a large decorative chevron.

## 3. Restrained colour and formal visual accents

Proposed starting palette, to be checked on the actual surfaces before use:

| Role | Suggested colour |
|---|---|
| Canvas | Soft neutral `#F7F8F6` |
| Surface | White `#FFFFFF` |
| Primary text | Charcoal `#25313B` |
| Secondary text | Slate `#52606D` |
| Hairline borders | Neutral `#D9DEE3` |
| Setup accent / pale wash | Muted navy `#3B5673` / `#EFF3F7` |
| Case accent / pale wash | Muted green `#3F6B59` / `#F0F5F1` |
| Change accent / pale wash | Muted ochre `#876343` / `#F7F2EB` |

This is a coherent starting treatment, not a mandatory brand replacement. Use any existing confirmed brand constraints first. No claim has been made that this new palette already passes contrast checks.

- Keep most text neutral. Use role colour in a small left stroke, name or badge; avoid a rainbow of saturated task text and heavy outlines competing with phase colours.
- Use fine separators, a slim phase bar, a small source/state badge, a subtle selected-card background and restrained border radii. Do not underline plain text to decorate it; underline actual links or use a fine divider below a heading.
- Preserve the eye and a clear hover/focus/selected treatment. One neat outline/accent is sufficient; no need for multiple bright rings or a permanent glow. Keyboard focus must remain unmistakable.
- Do not reuse red/amber/green as ornamental phase colours. Review state always has a text label, reason and required action. Decorative green does not mean approved.
- Keep dark mode legible and subdued using the same roles and comparable hierarchy. The light document is the primary reading reference; do not spend this pass reinventing the dark-theme architecture.
- Avoid gradients, glass effects, illustrations, emoji, bouncing highlights and arbitrary new icons. The desired “life” comes from proportion, clear emphasis and consistent small accents.

## 4. Symbols and connections

| Family | Keep / refine |
|---|---|
| New / existing client | Under case initiation use **4A · New-client intake** and **4B · Existing-client new service**, optionally with different muted tints. Preserve qualification before shared case creation and stable internal IDs. Both can retain a start cue. Text/letter distinguishes the route; colour is secondary |
| Stage numbers | Keep 1–12; consistent circle size, title alignment and spacing. Do not confuse stage numbers with detailed activity IDs |
| Eye | Keep in a consistent hit area/location, with accessible name, tooltip, focus and selected state |
| Decision cue | Keep question + named outcomes; attach the mark to its heading. Avoid an isolated glyph that looks like an unexplained bullet |
| Wait / repeat / per filing | Keep meaning and tooltip. Use the same size/baseline and an adjacent plain label; don't decorate unrelated paragraphs with these marks |
| End / handoff | Distinguish ending this view from closing a filing/case. Stage 9 should explicitly hand off to After decision and show next-route continuation; state the closure condition separately. No “decision → End” visual shortcut |
| Arrow | One clear source and destination, complete-word caption, consistent arrowhead/weight. Anchor to card header/handoff row rather than an arbitrary top border; route wraparounds deliberately |
| BPMN | Preserve technical meanings and the approved legend. A start ring and end ring are semantic elements, not arbitrary colour dots. Keep visible text explaining relevant business outcomes and tooltips for unfamiliar marks |
| Records / message endpoints | Preserve proper data-store/message symbols. Do not delete legitimate endpoint circles merely because they resemble dots. Investigate truly unattached decoration separately |

“Published” must remain a whole word; do not allow “pub-lished” on the change rail. A source change, a published correction and a case's adoption are distinct handoffs.

## 5. Tables and detail pane

- Preserve useful tables and example matrices; no evidence supports calling every current desktop table broken. Use deliberate column widths, consistent vertical alignment, readable padding and subtle headers/rules.
- Very wide actor-by-view tables are reference material, not the main walkthrough. Keep access to every cell/activity without making readers scan a tall mostly empty grid to understand the journey.
- A narrow three-column stage story in a 460px pane needs either a wider desktop pane or a clear per-actor row treatment. Keep Who → Action → Result visible; do not rely on long words being crushed into narrow columns.
- Keep selected stage/activity visible alongside details. Do not improve the pane by covering the user's point of reference. Retain Back, Escape, focus return, scroll restoration and per-panel example state.
- Merge genuinely repeated “In one line” summaries and repeated action prose. Move code/build evidence into the existing appropriate disclosure where it helps reading; do not hide unbuilt status or proposal status.

## 6. Evidence of completion

Capture a small, named evidence set rather than a large unreviewed folder. At 960, 1280, 1440 and 1920 desktop widths, inspect the full map, terms/roles, representative table, every changed BPMN view and representative detail panels. Use both themes for contrast/regression checks; no further phone work is requested.

For each D1–D7 provide before/after location and the actual observation: aligned title and content labels; less unexplained row dead space; words not split; handoff marker attached and unambiguous; no text collision; no table clipping; readable pane without selected-card occlusion; keyboard paths preserved. Do not claim zero white space or impose equal card heights. Inspect the images—capture count and zero geometry collisions are insufficient.

Keep normal breathing room. The goal is intentional space, a clear reading order and consistent hierarchy, not maximum information density.

## Founder refinements during the review

Use a parent case-initiation heading with 4A new-client intake / 4B existing-client new service, preserving qualification and identity resolution before shared case creation. Stable IDs need not change. The paired functional-content method explains the exact boundary.

For **human task marks**, use three product-side colour families, not six new actor colours: muted navy for Super Admin (content publisher, proposed Immigration SME, second-person approver), muted teal for firm staff (agent, lead representative), muted plum for client/family. Keep each role name and permission boundary. AI/platform and the external government are separate. These are proposed visual values, not new roles or entitlements.

Implement the smallest useful cue: reuse current marks and lane labels, with one compact key in the existing diagram header when helpful. Show participating sides only. Do not put legends into connector space or add a full legend to every lane. If lane labels and the adjacent key already identify the side, omit extra repeated badges. A lighter/darker treatment plus A/B labels can distinguish the two business entry routes without introducing another full colour system.

[W3C: Use of color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html) supports keeping equivalent text/shape cues; [Consistent identification](https://www.w3.org/WAI/WCAG22/Understanding/consistent-identification.html) supports predictable repeated controls. Apply these as review principles, not a claim of full WCAG conformance. Verify actual contrast, task-mark legibility, legend wrapping, arrow/label clearance, keyboard focus and the eye/panel behaviour. If a proposed cue causes clutter or a regression, reduce or omit that cue; retain the clear role label.
