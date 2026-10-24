# F1 slice 2b: break report (screen-breaker, 24 Oct)

Scope: slice 2b items only (F5 page fields, F6 oath block, QA-15 any-case codes, D3 reuse of a waiting draft). Commit 130cea5, branch `claude/forms-f1-check-f6e7f2`, cloud clone.
How: I ran `python -I p5/fill.py` on copies in a scratch folder (official files untouched). I compared every object in the original and the output, both decrypted, using pypdf. I rendered page 1 with `pdftoppm`. The API ran on an isolated copy on :4455 (`xr_studio_forms_bk`), started with `ANTHROPIC_BASE_URL=http://127.0.0.1:9` and no key. Every LIVE request sent `confirmWorstUsd: 0.001`, so any start that was not a reuse was refused. AI spend: US$0, no model call. The server is stopped.
Studio = `prototype/studio/`. Paths are relative to `ai-workers/problem-1-pathway-setup-and-form-filling/prototype/`.

## Blocker
None.

## Major
**M1. F5 says a value is "shown outside Adobe" when the page draws `?` in its place.**
- Did: filled IMM 5409 page fields with `राम कुमार 王小明` (partner), `Ñúñez Øster Łódź` (place), `ٱلْعَرَبِيَّة` and `😀 emoji`.
- Expected: the value appears on the page, or the report says it does not (`not_set`, `shown_outside_adobe: false`).
- Actual: the appearance streams contain `(??? ????? ???)`, `?ód?`, `(? emoji)`, and the Arabic is drawn as `?????????????`. The render confirms it (scratch: `/tmp/claude-0/-home-user-xpatready/223ee369-3076-5579-abd2-a079eb85ee70/scratchpad/bk/imm5409-hostile-page1.png`). Yet the report says `read_back_equal 9/9`, `shown_outside_adobe: true`, `intact: true`. pypdf's warning ("characters not supported by font encoding … text corruption") goes only to stderr, and the API ignores stderr.
- Cause: the read-back checks the field's `/V` and that an `/AP /N` exists. It never checks what the appearance draws (`p5/page_fields.py:110-133`, `:133`; `p5/fill.py:43,48`). The field font is CourierNewPSMT with a single-byte encoding. Any letter outside WinAnsi is lost: Ł, ź, ő, ş, ğ, ă, Vietnamese letters, any non-Latin script.
- Impact: on IMM 5409, a statutory declaration, a viewer or upload checker without XFA shows a wrong partner name, and the product reports it as fine.

**M2. F5 cuts off long or multi-line text on the page and still reports it as shown.**
- Did: wrote 400 words into Section 4 `TextField2`. This is the free-text "what other documentary evidence…" box: multiline, `max_chars` none, mappable (it has a `data_path` in `p1/inventory/imm5409e.inventory.json`). Also wrote `line1\nline2` into a single-line box.
- Expected: the full text shows, or the report says it does not.
- Actual: pypdf's appearance never wraps. The multiline box shows a single line ending "…word wor"; the other three lines of the box stay empty. The single-line box shows only `line1`. The report still says `shown_outside_adobe: true`, `intact: true`.
- Same cause as M1: the read-back compares `/V` only (`p5/page_fields.py:88,133`). Any real answer longer than about 95 characters is cut off outside Adobe.

## Minor
- **m1. A choice value with no option of its own can turn on another option's widget, despite "never guessed".** IMM 5409 radios have `/Opt ['1','2']` with on-states `/0`, `/1`. A value of `"0"` is not in `/Opt`, so the code falls back to on-state `/0`. It turns on the widget for option "1" (Yes) and writes it to the file. The read-back then catches the mismatch (`mismatches: [{wrote "0", read "1"}]`, `intact: false`), but the page now shows Yes. `p5/page_fields.py:75`: the fallback to an on-state name should not apply when the field has `/Opt`. IMM 5476 radios (`/Opt '1'…'5'`, states `/0…/4`) have the same flaw. This is low-risk in the API because option-map codes are '1'/'2'.
- **m2. The form kind is guessed from the request, not from the file.** IMM 5409 (static, 30+ text fields) with only unknown page-field names comes back as `form_kind: "dynamic"`, `without_page_field: 0`, `intact: true`. That hides a stale inventory, for example an edition whose fields were renamed. The reverse also happens: IMM 1295 or 1344 with a page field named `form1[0].SignatureField1[0]` comes back as `"static"`, with "page field type /Sig is not written". `p5/fill.py:44,46`. The API cannot send the `/Sig` name today, because the inventory gives it no `data_path`.
- **m3. Page fields ignore `/MaxLen`.** On IMM 5476, `unit[0]` has `/MaxLen 10`. I wrote `12345678901234`: it was stored and drawn, and the report is all green (`intact: true`, shown). The XFA `max_chars` 10 is not enforced either: no `max_chars` check in `studio/api/src/fill.ts` or `studio/engine/`. `p5/page_fields.py:68-89`.
- **m4. Very long single-line text is centred out of view.** I wrote 3000 characters into `Info.Province`. The appearance starts at `-7122.24 Td`, so the box shows a slice from the middle of the value, still "shown". Same root cause as M2, rarer in practice.
- **m5. QA-15: a trailing separator leaves a trailing space in the stored code.** Through the API: `ee_profile_` → `"EE PROFILE "`, `A_` → `"A "`, `zz--` → `"ZZ "`. For a code not in the library, this is a second spelling of the same form. Once its definition exists, `compact()` matching would keep that spelling. Cause: `formCode` trims before replacing separators (`studio/api/src/forms.ts:52`). Also, `imm5257_1`, newly allowed by the underscore, becomes `IMM5257 1`/`IMM 5257 1`. That is not the library's `IMM 5257 SCH1`, so Schedule 1 typed under its file name starts a separate form.
- **m6. D3 can crash on a narrow race.** The second `waitingDraft` runs after the transaction, without the lock, and its result is asserted non-null with `!` (`studio/api/src/forms.ts:497`). It is reached only when a draft finished while the start waited for the lock (`:489`). If an accept lands between commit and `:497`, `reuseDraft(actor, null)` throws a TypeError, giving a 500 instead of the plain words. No money is spent. I found this by reading the code; I could not trigger it with 20 starts racing one accept. The check under the lock also uses the open inputs read before the lock (`first.leftovers`, `:489`), not `plan`.
- **m7. Every reuse writes an audit line.** 12 simultaneous LIVE starts left 12 "reused" history lines for one draft. Nothing is wrong, but the history gets noisy.

## What held
- **Only the intended objects change.** IMM 5409 with the 18 sample values: 25 objects changed and 12 were added. The changed ones are the datasets stream (obj 8), plus `/V`, `/AS` and `/AP` on exactly the written fields and their radio widgets. The 12 added objects are the text appearances. `/AcroForm` was not touched (no NeedAppearances). The original bytes are kept and `/UR3` verifies.
- **Appended objects are encrypted.** No plaintext value or `Tx BMC` appears in the appended bytes. `/Encrypt` and `/Info` are in the appended XRef trailer. Poppler decrypts the file and shows the values (0 syntax errors).
- **Escaping is correct.** `A (B) \ C ) ( \\ end` is escaped and drawn exactly; Latin-1 accents (`ÉLODIE-O'NEIL`, `Ñúñez Øster`) draw correctly.
- **Bad choice values are refused.** Values `3`, `Off`, empty and `Yes` on a radio go to `not_set`, and the file is not shown.
- **Dynamic forms are untouched.** On IMM 1295, 5707, 1344 and 0008, only the datasets stream changed (object diff), no page field was set, and DocMDP and UR3 verify. IMM 5707 and 0008 report "dynamic".
- **F5 through the API works on IMM 5476 (static).** wp.family principal: 16/16 page fields, read back, shown, intact. The render shows the values. IMM 5707 and 5475 come back "dynamic".
- **F6 rule.** Run on all 13 inventories, it finds exactly the 10 IMM 5409 Section 5 boxes and nothing on 1295, 1344, 5257, 5257_1, 5475, 5476, 5488, 5707 or the text inventories. The only other matches on oath words are "Privacy Commissioner" link buttons, and those are excluded. `fill.ts` decides the oath before checking coverage, so a confirmed fact mapped to an oath box is never written. I could not test this through the API: IMM 5409 "does not apply" to any person in the demo draft.
- **QA-15.** `imm 5257_`, `IMM5257`, `i-m-m 5257` and `imm 52 57` all resolve to the library's `IMM 5257`. `IMM 1295` stays `IMM 1295`. No code collapsed into a different library form's code.
- **D3, concurrent starts.** With a waiting draft, 12 simultaneous LIVE starts all returned the same job with `reused: true`. No new job was created and no confirmation was needed.
- **D3, wrong actors.** A reviewer-only actor gets 403 and an unknown actor gets 401, even when a reuse would apply.
- **D3, old job without `sent_inputs`.** It falls back to the inputs that have proposals, so other open inputs are refused with 409 and the plain words.
- **D3, accept racing 20 starts.** The first starts were reused; after the accept, the rest got the worst-case 409. There were no 500s and no new job; the job ended `APPLIED`.
- **D3, stubs.** A stub draft has no proposals, so it is never reused.
- **No path to a paid call.** I found no way for D3 to reach a paid call that pays again for waiting proposals. The only paths go through the confirmed worst case, after nothing is waiting or after a refusal.
- **Live-call guard.** While I had `ANTHROPIC_BASE_URL` pointed away from the Anthropic API, the stub pass refused to run ("points away from the Anthropic API").
