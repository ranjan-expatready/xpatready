# Break report: PR #833, P-319 family information forms as `gov_form_def.form_role` (head ce36f9cd5)

Breaker pass, 4 Nov. Read the code and ran pure calls only: no copy, server or database (Lead 3's disk pause). US$0.
Probe scripts are outside the repo, in the session scratchpad (`probes/p1.ts` for the body, codes, F09 and fingerprint;
`p2.ts` runs `setRole` against a fake db to test races and a NUL in the reason; `p4.ts` checks the contract with ajv).
Line numbers are at ce36f9cd5.

## Major

**M1. On the shared demo, [IRCC-F09] goes quiet after this merges, and no screen can turn it back on.**
`demo-update.yml` (line 2) applies migrations and keeps the data, with no reset. The migration adds an empty column and
fills nothing in (`migration.sql:5-6`). So every library form has no role, and `studio.ts:236` builds an empty `family`
set. Probe: `missingFamilyForm(["IMM 5257","IMM 5707"], ["IMM 5257"], new Set())` returns `null`; on main the same
package returns `"IMM 5707"`. Any combination whose package lists IMM 5707 while its forms do not can now be released.
On main it is blocked. The diff has no web change: nothing shows a role or sets one. The only ways back are Demo ›
Reset or a raw `POST /library/forms/:code/role`. The same is true of every workspace outside the demo, and of any load
that stops part-way: `demo.ts:95-96` sets the roles only after the load returns, so the error path never sets them.
Expected: the rule keeps working through the upgrade (the demo's roles set when the column arrives, or a visible "no
form is marked family information" warning). Actual: it switches off silently.

**M2. "Load the configured checkpoint" releases the six before the roles exist. Right after the load, every released
combination that has IMM 5707 or IMM 5645 on its forms shows a draft change nobody made.**
`loadClaimed` runs `loadConfigured` first (`demo.ts:95`). That submits, has the SME sign off and releases each of the
six (`demo.ts:417-436`). Only then does `applySampleFormRoles` run (`demo.ts:96`). The intake and finder library forms
are created without a role (`intake.ts:404`, `finder.ts:611,714`). Two consequences:
(a) F09 is never checked for the checkpoint's Release 1. Main checked it.
(b) After the roles are set, the draft snapshot carries `form_role` (`snapshot.ts:200`) and the Release 1 snapshot does
not. Probe: `snapshotHash` with and without `form_role` on the same line gives different hashes. `diff` lists it as
`{kind:"Form", change:"changed", label:"Family Information"}` (`validate.ts:201,217`). So the Visitor visa (its row 9
names IMM 5707 in release 1, `demo.ts:440`) is Live with "Next release" work the moment the load finishes.
The Reset to the six path (no releases) and `importConfiguration` (sets roles before its snapshot, `import.ts:118`)
are fine.

**M3. A reason containing a NUL changes the role and leaves no Activity line; the person gets a 500.**
`FormRoleBody.reason` (`contracts/form-library.ts:44`) is only trimmed and length-checked. Probe p1 shows
`"ok\n\u0000‮evil"` is accepted. `setRole` writes the role first (`form-library.ts:269`), then the Activity line
(`:270`), with no transaction. PostgreSQL refuses 0x00 in `text` and in `jsonb` (22021 / 22P05). Probe p2 uses a fake
db that throws as PG does. Result: role = `family_information`, Activity lines = 0, and the call fails. So an F09
change (cleared or set, for every combination that uses the form) has no record. The bidi mark U+202E is also accepted,
so the Activity text can be reordered. The repo already guards both: `contracts/cost-check.ts:37` ("a character that
cannot be stored") and `api/src/case-prepare.ts:45`. Expected: 400, nothing changed.

**M4. A role change reaches every combination's next release with nothing saying what changed, and with no
immigration expert step (P-149 in practice).**
`setRole` takes effect at once on every draft's release gate (`studio.ts:236`). One author can switch F09 off
workspace-wide by setting IMM 5707's role to null. No second person is asked; new shared fields wait for an approver
(`decideLibraryChange`). On Review, the change shows only as "Form … changed: Family Information" (`validate.ts:217`,
the `x.title` label), with `needs_sme` false (`validate.ts:204`: only Rule, Document requirement, Check or a condition
need the SME). The release approver still approves, so the release gate itself is not bypassed. But they approve a
change that alters an IRCC rule without seeing it, and the expert never signs it.

## Minor

- **m1. Two people at once (probe p2).** Two identical sets give two `changed:true` replies and two Activity lines,
  both "(was no role)". Mark and unmark at once: the unmark reply says `{role:null, changed:false}`, but the final role
  is `family_information`. The cause is an unguarded read-then-write (`form-library.ts:263-269`); an
  `updateMany where formRole = old` with a count check would close it.
- **m2. The sample roles write no Activity line, and they put back a role an author removed.**
  `applySampleFormRoles` (`import.ts:21-24`) fills only where `formRole` is null. After an author unmarks IMM 5707
  (Activity says so), Demo › "Start With an LMIA from its reviewed release" (`demo.ts:138` → `import.ts:118`) marks
  it again with no line. Demo workspace only.
- **m3. Any library kind takes the role.** `setRole` never looks at `formKind`, so `Guide 5256` (normaliseCode maps
  "guide5256" to it) or a checklist can be marked family information. F09 has no effect there: guide links are kind
  "Instructions", not package forms. The data is still wrong, and nothing refuses it.
- **m4. Doc comment moved.** `setRole` was inserted between `listAgain`'s X5 JSDoc and `listAgain`
  (`form-library.ts:255-260`). The X5 text now documents `setRole`, and `listAgain` has no doc comment.

## Tried and held

- **Body (zod, probe p1).** Refused: an unknown role, upper case, `""`, a missing role, extra keys (`.strict()`), an
  array, no body, a reason that is a number, all-space, or 301 characters. Accepted: a reason of exactly 300
  characters (padding is trimmed first), Hindi text, emoji. A `__proto__` key is dropped by JSON.parse and harmless.
- **Codes.** "imm5707", " IMM  5707 " and "IRM0002" normalise correctly. "IMM 5707E" becomes "IMM 5707 E" and gets a
  404 in words. Unknown codes get a 404; retired forms get a 409 before any change. A no-op returns `changed:false`
  with no write.
- **Roles.** `need(actor,"author")` refuses user-B (approver), user-C and every runtime person. A missing or unknown
  `x-actor` gets a 401.
- **Migration.** One nullable column plus `CHECK (form_role IS NULL OR form_role IN ('family_information'))`. It is
  the newest migration (after `20261103230000`). Main's code never reads the column and inserts null, which passes the
  check.
- **Contract (ajv, p4).** `form_role` absent or `family_information` passes; `null`, `""` and other spellings are
  refused. The snapshot never writes null (`snapshot.ts:200`, set only when there is a value).
- **Existing releases.** On the shared demo, after the upgrade, no release shows a false "draft differs": roles are
  null and absent from both drafts and releases. (M2 is the configured load only.)
- **Library vs snapshot.** For a draft, F09 (library, `studio.ts:236`) and the validator's family wording (snapshot,
  `validate.ts:78`) come from the same rows. F09 runs on drafts only, so a release keeps its own role and nothing at
  run time reads it (no runtime or web reader). A role removed after a release shows as a draft "Form changed" line
  (see M4) and never changes the pinned release.
- **A library form with no edition.** It counts by its `formKey` exactly as main's list did. A package attachment with
  no edition gives "" and asks for nothing, as on main.
- **P-318 (6), IMM 5645 vs IMM 5707 by channel.** Either one still fills the line, as on main, so nothing regressed.
  One role cannot say which channel needs which form, so (6) will need its own field later.
