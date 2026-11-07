# Row A3 — review (Claude Opus, independent, read-only), 7 Nov

## Round 1, on 53f3513b

**Verdict: APPROVE.** No Blocker and no Major.
* Confidence high on the code and the cites, medium-high on the live evidence.
* The reviewer re-ran the offline test (23/23). It read the live outputs as committed.

### Checked and found correct
* **`saveSignature`** sends the body the Signature column sends (`web/src/components/channels.tsx:104`).
  * `channelOf` claims on the channel and signature seen, keeps the channel, and refuses a retired or checklist line in
    words.
  * The skip for an already-set value matches the service.
* **The second `lines()` read** changes nothing, because a signer save changes only the revision, and `saveSignature`
  claims on channel and signature.
* **`130-release-two.ts`:**
  * The call sits inside the `try`, after IMM 5476's channel and before submit, and is guarded by `visitor && vvId`.
  * `releaseTwoOf` returns null, never undefined, so the default setup cannot re-apply Stage 1.
  * Release 1 is untouched (A3-L3 is right: a snapshot leaves out a NONE signature).
  * The log line marks refusals with "refused:".
* **`105-stage-one.ts`** behaves exactly as before.
* **Cites:** `imm5645.html` has dcterms.modified 2024-06-21 and both quotes.
  * The typed names start with "Sample, Unconfirmed: expert (FQ-2)".
  * No personal names.
* **Evidence numbers match the committed outputs:**
  * C10.1 28/28 on both;
  * C7.6 `missing_signature` 3 → 1 and 2 → 0;
  * live 15/15, and 12/15 on `main`;
  * walk 6/6, and 3/6 on `main`;
  * 0 steps from pass to fail.

### Findings and what was done (commit after 53f3513b)

| Finding | Severity | Fixed? |
|---|---|---|
| A refused signer or signature went only to the log; row 9 still said done | Minor | Yes. `130-release-two.ts` adds "release 2's own lines not set: …" to row 9's words when there is a refusal. With none, the words are unchanged (`check_c10_1_configured.ts` 48/48). |
| A3-5 could not catch a channel hard-coded as PDF_UPLOAD | Minor | Yes. IMM 5645 is Online in the fake, and the test expects `ONLINE NONE->TYPED_NAME`. |
| The IMM 5645 quote was the end of a sentence about a person with no partner | Nit | Yes. The whole sentence is quoted, with Section B noted. |
| `!line.channel` can never be true (non-null in the schema) | Nit | Yes. Removed, and the port type is now `string`. |
| A3-7's fake refusal text was unrealistic | Nit | Yes. It now uses the service's claim words. |
| Walk 1.4's `/Not set/` reads the whole row; 2.1 reads the option label | Nit | Not changed. The selected-option check carries 1.4, and the case pill shows the release. |

**After the fixes:**
* offline 23/23;
* live `check_b104_checkpoint.ts` 15/15;
* `check_c10_1_configured.ts` 48/48.

The packs and the walk in `README.md` ran on 07a1aca2's step code. The fix commit changes only the refusal words and the
tests, and the cite text.
