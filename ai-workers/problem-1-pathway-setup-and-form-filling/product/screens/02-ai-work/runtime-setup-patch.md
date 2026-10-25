# Proposed change to the runtime lane's setup (`prototype/studio/tests/runtime/setup_visitor_visa.ts`)

**Why:** Screen 02 slice 2 adds two agreed rules (challenge points 2 and 3, Lead response 25 Oct).
* **K1:** a form field of an edition applied in this draft needs a decision before submit.
* **B1:** a new shared field is approved by a second person before any release carries it.

The R1a setup applies the IMM 5257 draft (14 form fields left undecided, 38 new shared fields) and then submits and releases. With the new rules its submit is refused, so `check_runtime_r1a/r1c/r1d` fail at setup (run-suites, 25 Oct). The screens lane does not edit the runtime lane's files. This is the proposed patch, applied locally only to prove the runtime suites pass with it.

**Patch:** insert just before the 4.5 acceptance check (the line `const o = (await call("GET", `/combinations/${vv}`)).body;` above `const problems = …`):
```ts
  // Screen 02 slice 2 (K1, B1): every form field of the applied draft has a decision (here "not a fact": the thin slice
  // fills only mapped fields), and a second person approves the new shared fields before any release carries them.
  for (const j of ((await call("GET", `/combinations/${vv}`)).body.jobs ?? []).filter((x: { kind: string; status: string }) => x.kind === "field_map" && x.status === "APPLIED")) {
    const ff = (await call("GET", `/jobs/${j.id}/form-fields`)).body;
    for (const f of ff.fields.filter((x: { outcome: string }) => x.outcome === "unresolved")) await call("POST", `/editions/${ff.edition.id}/form-fields/decision`, { dataPath: f.dataPath, decision: "not_a_fact", reason: "Not filled from case facts in the thin slice (Sample)." }, AUTHOR);
  }
  for (const c of (await call("GET", "/library/changes?status=WAITING")).body) await call("POST", `/library/changes/${c.id}/approve`, {}, REVIEWER);
```

**Proved locally (25 Oct, not committed):** with the patch, setup 13/13, check_runtime_r1c 120/120, check_runtime_r1d 63/63, check_runtime_r1a 99/99; without it the setup's 4.5 acceptance fails ("IMM 5257: 14 form fields have no decision in this draft").
