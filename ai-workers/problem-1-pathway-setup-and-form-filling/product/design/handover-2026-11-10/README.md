# Pathway Configurator Handover (10 Nov 2026)

The page written for the co-founder: the verdict, how the product works, what is left in M3, the M4 plan, and a folded appendix (capability map, test script, score evidence, delivery pipeline).

* Status of the numbers: `main` at `66e74115e`, 10 Nov 2026 10:06 IST.
* All immigration content on the page is **Sample**. Legal points are "Unconfirmed: no counsel".
* Published privately by the founder as a claude.ai artifact; sharing is done from that page's Share menu.

## Files

| File | What it is |
|---|---|
| `pathway-configurator-handover.html` | The built page, as published. It is the page body only (no doctype or `<meta charset>`), because the artifact host adds those. |
| `img/` | The five real screenshots the page shows (sample data). |
| `src/head.html`, `src/main.html`, `src/appendix.html` | The hand-written parts: styles, the three main screens, the appendix. |
| `build.py` | Joins the parts and fills the capability table and grid from `qa/CAPABILITIES.md`, and draws Figure 2. |

## Rebuild

From this folder:

```bash
python3 build.py ../../qa/CAPABILITIES.md src pathway-configurator-handover.html
```

The capability table and the step grid follow `CAPABILITIES.md`. Every other number (366 facts, 1,728 boxes, the reuse chart, the family case, the M3 meter, the scores) is written by hand in `src/main.html` and `src/appendix.html`, so a rebuild on a newer `main` needs those re-counted and edited too.

To look at the built page locally, serve this folder and open it through a wrapper that starts with `<!doctype html><meta charset="utf-8">`; without the charset line some characters show wrongly.

## What is not proven (also on the page)

* Time to configure a pathway has not been measured; the reuse figures are counts, not hours.
* The M4 ranges are the analyst's estimates, not the team's.
* The comparison with the team's build is a medium-depth scan of the 28 Oct code capture.
* Market claims are vendor claims from a web search on 10 Nov 2026, not hands-on tests.
* The pathway order in the reuse chart is the analyst's; another order changes each row, not the total.
