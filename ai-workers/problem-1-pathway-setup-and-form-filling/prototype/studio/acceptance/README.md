# Acceptance tests, written before the build (P-220)

Each open capability in `product/qa/CAPABILITIES.md` gets its acceptance tests here **before** anyone builds it: `<capability-id>.test.ts` checks the API and the data underneath and **fails today**; `journeys/J<n>-<name>.md` gives the click-through steps with an expected result at each step, which the builder turns into a browser check. Each IRCC business rule a test relies on has a row in `product/compliance-trace.md` (rule → canada.ca page, quote, date → test → capability).

* **Not run by `product/tools/run-suites.sh` or the merge batches:** these tests are red on purpose. The builder who makes a capability work **moves its test into the suites** (`tests/…`) in the PR that makes it pass, and names the capability ID in the PR's first line.
* **How to run one** (an isolated copy, never the demo; US$0, no live AI):
  ```
  zsh studio/tools/isolated.sh accept 4440 start
  tsx studio/<setup the test names> 4440 xr_studio_accept
  tsx studio/acceptance/<capability-id>.test.ts 4440 xr_studio_accept
  ```
  Exit code 0 = all pass, 1 = a failure, 2 = setup missing.
* **Written by** the Day-0 test writers (four packs), each attacked by a fresh challenger before any builder starts. A builder who finds a test wrong says so in the PR (or `screens/<item>/challenge.md`) with evidence; the tech lead changes it, never silently.
* **Values** (fees, forms, document rules) come from canada.ca with page, quote and date, or are labelled Sample; legal points are "Unconfirmed: no counsel".
* **Helpers:** reuse `tests/runtime/api.ts` (`client`, `recorder`) and the setup scripts in `tests/`; shared acceptance helpers live in `acceptance/lib/`.
