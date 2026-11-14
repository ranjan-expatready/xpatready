# Founder's Progress Board (P-591)
`index.html` shows only what `data.json` holds; `data.json` is generated, never committed (public repository, P-539).
**Refresh:** `python3 product/tools/cockpit-data.py --out "$TMPDIR/cockpit/data.json" --lead-input "$TMPDIR/cockpit/lead-input.json"` (Bash `allowed_domains` api.github.com), then publish `data.json` beside `index.html` (artifact `files`). About 45 s warm; the first run classifies ~900 merged PRs (~3 min).
**Costs:** GitHub reads only, US$0. `tools/flow-measure.py` (~10 min, ~3,000 API calls) reruns only when its cached answer is over 6 h old (`--flow-max-age-h`) and 3,500 calls are left this hour.
**Cache:** `<out folder>/cache/` (app-code verdicts per PR, finished days' CI runs, Works per CAPABILITIES.md version, flow-measure answer); delete it to rebuild.
**Hand-kept:** `plan.json` (dates, committed or forecast, each with its decision), `risks.json`, `architecture.json` (Module column to boxes), `learnings.json`. Edit those, never the page.
**Lead input** (optional; without it the page says "Lead input missing"; `idle_min`, `restarts`, `nudges` per session):
`{"as_of":"2026-11-14T13:00:00+05:30","weekly_pct":48,"weekly_resets":"2026-11-20T04:30:00+05:30","burn_pct_per_h":1.5,"paid_usd_today":0,`
`"sessions":[{"name":"FO-1a lane","kind":"cloud","role":"builder","state":"running","row":"FO-1a","pr":1742,"idle_min":20,"restarts":0,"nudges":0}]}`
`kind` is `cloud` or `mac`; `state` `blocked` turns a chip red; `"example": true` marks example data on the page.
