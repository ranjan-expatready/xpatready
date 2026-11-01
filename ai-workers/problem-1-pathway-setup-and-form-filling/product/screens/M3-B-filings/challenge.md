# M3-B C6.12 · where the API differs from the r5c contract line, and why (review M2)

The r5c contract (`screens/M3-agent-view/concept-draft.md` §"New") is one read, `GET cases/:id/prepare`. This slice serves only its filings, groups and fees part, at `GET /api/runtime/cases/:id/filings`. M3-E's prepare read can include it unchanged. Types: `contracts/runtime.ts` `CaseFilings`.

| r5c | Here | Why |
|---|---|---|
| `filings[{id, combination, applicants[{subject, role, mode}], group, waitsFor?, status, number?}]` | the same names; `applicants[]` also carries `label`; `mode` per filing (`files_own`) | Names follow the contract. `waitsFor` is absent: there is no waiting filing on the Visitor visa. |
| `groups[{id, kind, filings, splittable}]` | the same, plus `label`, `why`, `totals[]` and `total_cents` | The totals show the family maximum and its source (P-170) once per group, not once per filing. |
| `fees[{filing, payer, line, amount, exempt}]` | the same, with `amount_cents` (whole cents, CAD) and `label` and `why` | The unit sits in the name, so nobody reads 100 as cents or as dollars. |
| `version` | a hash of what was derived | A later write (split, record) can refuse a stale read. |
| none | `not_filing[]`, `basis`, `why`, `derived` | Each says why a person has no fee, what the amounts rest on, why there is nothing to show, and that other combinations are not guessed. |

**Left for the tech lead (break report M2):** `Runtime.reach` compares the pin's hash with the release row's stored hash, but never re-hashes the snapshot, and `config_release` has no trigger that freezes it. This route now checks that the snapshot names the case's own combination (409 otherwise), which covers fees. My recommendation: a frozen-release trigger, like `runtime_pin_frozen`, through the migration gate.
