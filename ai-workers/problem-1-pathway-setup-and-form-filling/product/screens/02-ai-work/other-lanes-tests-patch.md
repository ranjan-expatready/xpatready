# Proposed patch for two other lanes' tests (Screen 02 FIX, review Must 3, BR-7)

**Why.** Must 3 closes the BR-7 bypass. Accepting a proposal that makes a **new** shared field, while the library has one that could fit (score ≥ 0.55), now needs a reason, the same as the new-field form (`api/src/sources.ts`, `decideChecked`). In the replayed IMM 5257 answer one proposal is like that: `person.alternate_telephone_number`, 64 % like `person.telephone_number`. Three suites accept every leftover proposal with no note, so their apply stops at "1 proposal is still undecided":
* forms lane: `check_forms_channels.ts`, `check_forms_slice2.ts`
* runtime lane: `runtime/setup_visitor_visa.ts`, the R1 chain's setup (after the one-off patch of 25 Oct 08:30)

**The patch.** The blind accept loops pass a note: one argument per line, nothing else. The screens lane does not edit other lanes' files. It applied this locally only, to prove the full suite run, and reverted it before committing.

**Proved locally on this branch:**
* `check_forms_channels.ts` 106/106 and `check_forms_slice2.ts` 53/53 with the patch. Without it, 7 and 2 FAIL (the setup apply is refused).
* With the patch, the runtime chain runs: see the full-suite table in the hand-back. Without it, `setup_visitor_visa.ts` stops at 4.3.

**Asked of the Lead:** apply it with the merge (one-off, like the runtime setup patch), or route each part to its lane.

```diff
diff --git a/ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tests/check_forms_channels.ts b/ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tests/check_forms_channels.ts
index 1454a73..87eb5aa 100644
--- a/ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tests/check_forms_channels.ts
+++ b/ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tests/check_forms_channels.ts
@@ -103,7 +103,7 @@ const capture = async (screens: string[], title = "Application for a visitor vis
   const jobId = r.body?.id;
   await until(async () => (await call("GET", `/jobs/${jobId}`)).body?.status === "COMPLETED");
   await call("POST", `/jobs/${jobId}/accept-clean`, { outcome: "REUSE" }); await call("POST", `/jobs/${jobId}/accept-clean`, { outcome: "NEW" });
-  for (const i of (await call("GET", `/jobs/${jobId}`)).body.items.filter((x: { decision: string }) => x.decision === "PENDING")) await call("POST", `/jobs/${jobId}/items/${i.id}`, { decision: "ACCEPTED" });
+  for (const i of (await call("GET", `/jobs/${jobId}`)).body.items.filter((x: { decision: string }) => x.decision === "PENDING")) await call("POST", `/jobs/${jobId}/items/${i.id}`, { decision: "ACCEPTED", note: "Test: a different meaning from the library field that could fit (BR-7)." });
   r = await call("POST", `/jobs/${jobId}/apply`, {});
   const pdfMapped = Number(sql("select count(*) from form_field_map m join form_edition e on e.id=m.form_edition_id where e.edition_label like 'IMM 5257 (%' and m.outcome='mapped'"));
   ok("setup: IMM 5257's PDF field map comes from the saved real AI draft (replayed, no model call)", r.status === 201 && pdfMapped > 100 && sql("select count(*) from drafting_job where mode='LIVE'") === "0", { applied: r.status, mapped: pdfMapped });
diff --git a/ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tests/check_forms_slice2.ts b/ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tests/check_forms_slice2.ts
index 44872ce..dab9061 100644
--- a/ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tests/check_forms_slice2.ts
+++ b/ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tests/check_forms_slice2.ts
@@ -174,7 +174,7 @@ const readJson = (rel: string) => JSON.parse(readFileSync(join(PROTOTYPE, "..",
   r = await call("POST", `/attachments/${replayAtt}/draft`, { mode: "replay" });
   const rep = await finished(r.body.id);
   await call("POST", `/jobs/${rep.id}/accept-clean`, { outcome: "REUSE" }); await call("POST", `/jobs/${rep.id}/accept-clean`, { outcome: "NEW" });
-  for (const i of (await call("GET", `/jobs/${rep.id}`)).body.items.filter((x: { decision: string }) => x.decision === "PENDING")) await call("POST", `/jobs/${rep.id}/items/${i.id}`, { decision: "ACCEPTED" });
+  for (const i of (await call("GET", `/jobs/${rep.id}`)).body.items.filter((x: { decision: string }) => x.decision === "PENDING")) await call("POST", `/jobs/${rep.id}/items/${i.id}`, { decision: "ACCEPTED", note: "Test: a different meaning from the library field that could fit (BR-7)." });
   r = await call("POST", `/jobs/${rep.id}/apply`, {});
   ok("setup: IMM 5257's field map is in the library from the saved real answer (replayed, US$0)", r.status === 201, r.body?.message);
   // The library's IMM 5257 map stands in for an earlier edition (the official list holds one edition of each form).
@@ -205,7 +205,7 @@ const readJson = (rel: string) => JSON.parse(readFileSync(join(PROTOTYPE, "..",
   const env = readJson(reusedJob.runFile);
   ok("A4 reuse run: completed without any AI call or cost, the record labelled as reuse (not AI), compared with the library for a person", reusedJob.status === "COMPLETED" && reusedJob.costUsd === 0 && /without AI \(US\$0\)/.test(reusedJob.message) && env.caller === "reuse" && !/AI-drafted/.test(env.label) && reusedJob.items.length > 0, reusedJob.message);
   await call("POST", `/jobs/${reusedJob.id}/accept-clean`, { outcome: "REUSE" }); await call("POST", `/jobs/${reusedJob.id}/accept-clean`, { outcome: "NEW" });
-  for (const i of (await call("GET", `/jobs/${reusedJob.id}`)).body.items.filter((x: { decision: string }) => x.decision === "PENDING")) await call("POST", `/jobs/${reusedJob.id}/items/${i.id}`, { decision: "ACCEPTED" });
+  for (const i of (await call("GET", `/jobs/${reusedJob.id}`)).body.items.filter((x: { decision: string }) => x.decision === "PENDING")) await call("POST", `/jobs/${reusedJob.id}/items/${i.id}`, { decision: "ACCEPTED", note: "Test: a different meaning from the library field that could fit (BR-7)." });
   r = await call("POST", `/jobs/${reusedJob.id}/apply`, {});
   const origins = sql("select string_agg(distinct origin::text, ',') from form_field_map m join form_edition e on e.id = m.form_edition_id where e.edition_label = 'IMM 5257 (09-2023)'");
   ok("A4 reuse apply: the reused form fields enter the library as code matches (origin CODE_MATCH, 'as released in IMM 5257 (01-2020)'), never as AI", r.status === 201 && origins === "CODE_MATCH" && sql("select count(*) from form_field_map m join form_edition e on e.id = m.form_edition_id where e.edition_label = 'IMM 5257 (09-2023)' and m.evidence_quote like '%as released in IMM 5257 (01-2020)%'") !== "0", { status: r.status, origins });
diff --git a/ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tests/runtime/setup_visitor_visa.ts b/ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tests/runtime/setup_visitor_visa.ts
index d097c0f..ba44b00 100644
--- a/ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tests/runtime/setup_visitor_visa.ts
+++ b/ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tests/runtime/setup_visitor_visa.ts
@@ -140,7 +140,7 @@ async function main() {
   await call("POST", `/jobs/${jobId}/accept-clean`, { outcome: "REUSE" }, AUTHOR);
   await call("POST", `/jobs/${jobId}/accept-clean`, { outcome: "NEW" }, AUTHOR);
   for (const i of (await call("GET", `/jobs/${jobId}`)).body.items.filter((x: { decision: string }) => x.decision === "PENDING")) {
-    const d = CHANGED[i.proposedKey] ? { decision: "CHANGED", key: CHANGED[i.proposedKey] } : { decision: "ACCEPTED" };
+    const d = CHANGED[i.proposedKey] ? { decision: "CHANGED", key: CHANGED[i.proposedKey] } : { decision: "ACCEPTED", note: "As on 21 Oct: a different meaning from the library field that could fit (BR-7)." };
     const x = await call("POST", `/jobs/${jobId}/items/${i.id}`, d, AUTHOR);
     if (x.status >= 300) ok(`4.3 decision on ${i.proposedKey}`, false, x.body);
   }
```
