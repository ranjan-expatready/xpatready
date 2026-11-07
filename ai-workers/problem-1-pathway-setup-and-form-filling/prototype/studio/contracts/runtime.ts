// Runtime contract (runtime lane, R1 thin slice, P-67): request shapes of the case, people, answer, row and confirm
// endpoints, shared by the API and later the web renderer (STANDARDS §6: contract first, zod). Answer values follow the
// shapes the PDF filler already reads (p5/transforms.ts Address and Phone), so a stored answer is written unchanged.
import { z } from "zod";

/** A case role is a person role key of the shared library (S5, M3: no list in code). The runtime accepts a role only
 *  when the case's pinned release lists it in "Who can be in this application", within its maximum. */
export type CaseRole = string;

/** P-72 and P-78 (founder, 23 Oct: confirmed by who answered): a person's own answers and the principal's answers for a
 *  minor child count as confirmed; the principal's answers for an adult show "answered by the principal" and become
 *  confirmed when that adult confirms on their own link (not built in R1a) or the officer presses "Confirm section".
 *  The age and the fact it is read from are Sample until the immigration expert confirms them. Unconfirmed: no counsel. */
export const MINOR = { birthDateField: "person.date_of_birth", underAge: 18 } as const;

/** Text a person types: no NUL or other control characters (PostgreSQL refuses NUL; a refusal must be a 400, not a 500). */
/** Invisible characters a person never means to type (break report m1–m4): C0 and C1 controls, DEL, zero-width marks
 *  (not the emoji joiner), line and paragraph separators, bidi overrides and isolates, the byte-order mark. Tab, line
 *  feed and carriage return stay allowed in answers (long text). */
export const INVISIBLE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u200b\u200e\u200f\u2028-\u202e\u2066-\u2069\ufeff]/;
/** Half of a surrogate pair on its own: not a character; PostgreSQL refuses it (a 500 before, break report m1). */
export const LONE = /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/;
const clean = (x: string) => !INVISIBLE.test(x) && !/[\t\n\r]/.test(x) && !LONE.test(x);
const text = (missing: string, min: number, max: number) => z.string({ message: missing }).trim().min(min, missing).max(max, `Keep it to ${max} characters.`).refine(clean, "Remove the control or invisible characters from this text.");
/** An idempotency key: visible ASCII only, so it is stored and compared exactly. */
const idemKey = z.string({ message: "An idempotency key is text." }).trim().min(8, "An idempotency key has at least 8 characters.").max(128, "An idempotency key has at most 128 characters.").regex(/^[\x21-\x7e]+$/, "An idempotency key is letters, digits and punctuation, without spaces.");

export const NewCase = z.object({
  combinationId: z.string({ message: "Choose a released combination." }).uuid("Choose a released combination."),
  reference: text("Give the case a reference of at least 3 characters.", 3, 80),
  /** The simulated client login that answers the questionnaire. */
  clientActor: text("Name the client who answers the questionnaire.", 1, 40),
  principal: z.object({ displayName: text("Give the principal applicant a display name.", 2, 120) }, { message: "Name the principal applicant." }),
  /** C6.11 (BR-20): the representative of record, a licensed user of the opener's firm. Left out: the firm's only
   *  representative (a firm with more than one must choose). */
  representative: z.string({ message: "Choose the representative of record." }).trim().regex(/^user-[A-Za-z0-9]{1,8}$/, "Choose the representative of record.").optional(),
  /** C6.11: the case officers, users of the opener's firm with the case duty. Left out: the firm's case officers who are
   *  not representatives (in a solo firm, its one person). */
  caseOfficers: z.array(z.string().trim().regex(/^user-[A-Za-z0-9]{1,8}$/, "Choose case officers from your firm."), { message: "Choose case officers from your firm." }).min(1, "Choose at least one case officer.").max(5, "A case has at most 5 case officers.").optional(),
  idempotencyKey: idemKey.optional(),
});

/** C6.11 (BR-20, SI-9): the firm admin changes the representative of record, with a reason kept in the history; a new
 *  representative asks for a new IMM 5476 (BR-12). */
const teamUser = z.string({ message: "Choose a person of your firm." }).trim().regex(/^user-[A-Za-z0-9]{1,8}$/, "Choose a person of your firm.");
/** A reason a person reads in the history: some letters or digits, not only marks or filler characters (break m1). */
const reason = (missing: string) => text(missing, 5, 300).refine((x) => /[\p{L}\p{N}]/u.test(x.replace(/[\u115f\u1160\u3164\uffa0]/g, "")), missing);
/** expectedRepresentative: the representative the person saw; a change made meanwhile by someone else is refused (break m4). */
export const ChangeRepresentative = z.object({ userId: teamUser, reason: reason("Say why the representative changes (at least 5 characters)."), expectedRepresentative: teamUser.nullable().optional() });
export const AddCaseOfficer = z.object({ userId: teamUser });
export const EndCaseOfficer = z.object({ reason: reason("Say why this case officer leaves the case (at least 5 characters).") });

export const NewPerson = z.object({
  role: z.string({ message: "Choose who the person is (a person the release lists)." }).trim().regex(/^[a-z][a-z0-9_]{1,40}$/, "Choose who the person is (a person the release lists).").refine((r) => r !== "principal", "The case already has its principal applicant."),
  displayName: text("Give the person a display name.", 2, 120),
  applies: z.boolean({ message: "Say whether the person is travelling (true or false)." }).default(true),
  /** The same key again answers with the person already added (a double press adds one person, QA-28). */
  idempotencyKey: idemKey.optional(),
});
export const UpdatePerson = z.object({ applies: z.boolean({ message: "Say whether the person is travelling (true or false)." }) });

/** Answer values stay small and flat: the largest real value (an address) is a few hundred characters. */
export const VALUE_LIMITS = { chars: 4000, depth: 3 } as const;
/** Any text in the value holds a control character other than tab, line feed or carriage return (QA-25). */
const bad = (x: string) => INVISIBLE.test(x) || LONE.test(x);
const hasControl = (v: unknown, d = 0): boolean => d <= VALUE_LIMITS.depth + 1 && (typeof v === "string" ? bad(v) : !!v && typeof v === "object" && Object.entries(v as Record<string, unknown>).some(([k, x]) => bad(k) || hasControl(x, d + 1)));
/** JSON length that never overflows the stack on a hostile, very deep value (that value is refused for its depth). */
const jsonLength = (v: unknown) => { try { return (JSON.stringify(v) ?? "").length; } catch { return Infinity; } };
const tooDeep = (v: unknown, d = 0): boolean => d > VALUE_LIMITS.depth || (!!v && typeof v === "object" && Object.values(v as Record<string, unknown>).some((x) => tooDeep(x, d + 1)));

/** One answer. expectedId is the id of the current answer the person saw (null when there was none): a different
 *  current answer means someone else changed it first (409 with the newer value). Invalid values are saved and flagged;
 *  validation never blocks saving (P-47). */
export const PutAnswer = z.object({
  value: z.unknown()
    .refine((v) => v !== undefined && v !== null && v !== "", "Give a value (to remove an answer, remove its row or leave it unanswered).")
    .refine((v) => !tooDeep(v), `An answer is at most ${VALUE_LIMITS.depth} levels deep.`)
    .refine((v) => jsonLength(v) <= VALUE_LIMITS.chars, `An answer is at most ${VALUE_LIMITS.chars} characters.`)
    .refine((v) => !hasControl(v), "Remove the control characters from this answer (invisible characters pasted with the text)."),
  expectedId: z.string({ message: "Send the id of the answer you saw, or null when there was none." }).uuid("Send the id of the answer you saw, or null when there was none.").nullable(),
  row: z.string().uuid("Name the row by its id.").optional(),
});

/** "None apply" for a repeating group (Lead, break M3, P-71/P-72): true when no entry applies to the person, false to
 *  say entries apply after all. expectedId: the group answer the person saw (null when none), as for an answer. */
export const NoneApply = z.object({
  noneApply: z.boolean({ message: "Say whether none apply (true) or entries apply (false)." }),
  expectedId: z.string({ message: "Send the id of the answer you saw, or null when there was none." }).uuid("Send the id of the answer you saw, or null when there was none.").nullable(),
});
export const NewRow = z.object({ group: z.string({ message: "Name the repeating group (its section)." }).trim().min(1, "Name the repeating group (its section).").max(80) });
/** "Confirm section" vouches for what the officer saw: the ids of the answers shown. Any answer that changed or arrived
 *  since is refused with 409 and listed, never confirmed unseen (STANDARDS §4). */
export const ConfirmSection = z.object({
  subjectId: z.string({ message: "Choose whose section to confirm." }).uuid("Choose whose section to confirm."),
  seen: z.array(z.string().uuid("Each reviewed answer is named by its id, as the questionnaire view gives it."), { message: "Send the ids of the answers you reviewed." }).max(500, "Send at most 500 reviewed answer ids; confirm a long section in parts."),
});

export const Address = z.object({ po_box: z.string().optional(), apt_unit: z.string().optional(), street_number: z.string().optional(), street_name: z.string().optional(), city: z.string().optional(), district: z.string().optional(), province: z.string().optional(), postal_code: z.string().optional(), country: z.string().optional() });
export const Phone = z.object({ type: z.string().optional(), country_code: z.string().optional(), number: z.string().optional(), extension: z.string().optional() });

/** Words shown for an answer's confirmation (P-72). */
export const CONFIRM_WORDS = {
  officer: "Confirmed by the officer",
  client_own: "Counts as confirmed: the client's own answer",
  waits: "Waits for the officer's \"Confirm section\"",
  by_principal: "Answered by the principal for an adult: confirmed once that person confirms on their own link or the officer presses \"Confirm section\"",
} as const;

/** The questionnaire view (GET /api/runtime/cases/:id/questionnaire): what the engine computes and the web renderer
 *  reads, one shape for both (engine/runtime/case.ts caseView returns it). */
/** answered: who first gave the answer, when this version is the officer's confirmation of it (review M4). */
export type ViewAnswer = { id: string; value: unknown; status: "DECLARED" | "VERIFIED"; channel: string; by: string; at: string; answered: { channel: string; by: string; at: string } | null; problems: string[]; confirmed: boolean; why: string };
export type ViewQuestion = {
  subjectId: string; about_label: string; fact: string; label: string; meaning: string; value_type: string;
  shape: { maxLength: number; datePrecision: "day" | "month"; phone: boolean; money: boolean; choices: string[] | null };
  section: string; section_title: string; collected_from: string; required: boolean; hidden: boolean; why: string;
  /** The repeating group (its section) when the question is asked per row; capacity is the rows the forms hold. */
  group: string | null; capacity: number | null;
  answer: ViewAnswer | null;
  rows: { row: string; index: number; fits: boolean; answer: ViewAnswer | null }[];
  options: { key: string; label: string }[] | null; note: string | null;
  /** Country names offered while typing a country that has no answer list yet (the release's country list). */
  countries: string[] | null;
  /** Each form this fact fills, for whom (subject: the person's id, so two people with one name never mix) and how many form fields. */
  fills: { form: string; person: string; subject: string; boxes: number }[];
};
/** A repeating group's own answer: "none apply" (value true) or "entries apply" (false), confirmed like an answer. */
export type ViewGroup = { required: boolean; client: boolean; rows: number; none_apply: (ViewAnswer & { value: boolean }) | null };
export type ViewSection = { subjectId: string; about_label: string; section: string; title: string; questions: ViewQuestion[]; answered: number; confirmed: number; invalid: number; missing: string[];
  /** When the section is a repeating group: its rows and its "none apply" answer (null otherwise). */
  group: ViewGroup | null;
  /** P-47 tier 2 (C4.4 part 2): the section's error summary, GOV.UK pattern, each line linked to its field. */
  problems: SectionProblem[] };
/** One line of a section's error summary: an answer's problem (kind "field") or a section check that fired (kind "check"). */
export type SectionProblem = { kind: "field" | "check"; field: string; subjectId: string; row: string | null; label: string; message: string; check?: string };
/** A section check the case's answers trigger (RT-7, release data): a warning on the person's answers. It never blocks
 *  saving (P-71); a section check (group "section_check", severity warn or block) blocks "ready to file" for the forms the checked
 *  fact fills (P-47 tier 2, C4.4 part 2); every other group only warns (P-168). fact and section place it on the question it concerns; null when the check names no one question. */
export type ViewCheck = { id: string; severity: string; group?: string; message: string; subjectId: string; about_label: string; fact: string | null; section: string | null; illustrative: boolean };
export type QuestionnaireView = {
  mode: "sqr" | "agent"; sections: ViewSection[]; checks: ViewCheck[]; forms: { form: string; person: string; applies: boolean | string }[];
  /** Only when the view skips facts a document supplies (Preview, P-130): per person and document, the facts it fills. */
  from_documents?: { subjectId: string; document: string; facts: string[] }[];
  summary: { not_asked: number; questions: number; answered: number; confirmed: number; missing: number };
};

// ------------------------------------------------------------------ R1d: form copies (plan §8 RT-13…RT-17)
/** "Generate a copy": a new copy each time the officer asks (never on its own); the same key again answers with it. */
export const GenerateCopy = z.object({ idempotencyKey: idemKey.optional() });
/** A copy is locked when its validated copy was uploaded back or it was filed; a locked copy never changes (P-65 d). */
export const LOCK_KINDS = { validated_copy_uploaded: "Validated copy uploaded back", filed: "Filed" } as const;
export const LockCopy = z.object({ kind: z.enum(["validated_copy_uploaded", "filed"], { message: "Say how the copy was locked: validated copy uploaded back, or filed." }) });

/** One copy as the agent view shows it: its state, whether today's confirmed facts differ from those it read (out of
 *  date; on a locked copy: stale), and what changed. */
export type FormCopy = {
  id: string; status: "QUEUED" | "RUNNING" | "GENERATED" | "FAILED"; created_at: string; created_by: string; finished_at: string | null; error: string | null;
  locked: { kind: keyof typeof LOCK_KINDS; at: string; by: string } | null; out_of_date: boolean; stale: boolean; changed: string[];
  counts: { written: number; by_hand: number; not_on_form?: number; blank: number; not_written: number; by_a_person: number } | null; intact: boolean | null; person_steps: string[];
  /** P-145 (C7.7): a copy of a form the case's release files Online: IRCC's own PDF ("ircc_pdf") filled from the same
   *  confirmed facts, marked "Copy, not for filing", never locked, filed or counted. */
  copy_not_for_filing: boolean; source: "ircc_pdf";
  /** Form fields the officer writes by hand in Adobe, each with its question and why (review M3). */
  by_hand: { label: string; why: string }[];
  /** B81: answers the form prints no choice for (a person marked them on the form's choices step): nothing is written. */
  not_on_form?: { label: string; person: string | null; why: string }[];
  /** The copy's file is on disk and unchanged; false: it cannot be handed over (break m1). */
  file_ok: boolean;
  /** C-9, C-10 (P-144, P-171 (1)): the newest validated copy read back for this copy; current: the form's facts are
   *  unchanged since; otherwise "Out of date: validate again" (kept as history, never deleted). */
  validated: { at: string; by: string; current: boolean; words: string; read_back: { written: number; equal: number } } | null;
  /** QA-285: with no current validated copy here, the words saying its validated file is kept elsewhere (the checkpoint's
   *  Sample, validated and read back on the Mac) while the form's facts are the ones validated; never counted as validated. */
  validated_elsewhere?: string | null;
};
/** One form for one person on the case: what a copy made now would write (the draft), whether it can be filed (P-71),
 *  and every copy made, newest first. */
export type CaseForm = {
  form: string; title: string; subject_id: string; person: string; draft: { written_now: number; mapped: number; unconfirmed: number };
  readiness: Readiness; copies: FormCopy[];
  /** The evidence lane's fill trial for this form passed (P-65 (a)); until it does a copy is "Checked copy, not for filing". */
  trial_passed: boolean;
  /** S2 (SA-1B-174): why the filling is not proven for this edition and field map, in words; null when it is. */
  trial_why?: string | null;
  /** The form no longer applies to this person (for example marked not travelling); its copies stay listed (break M4). */
  applies: boolean;
  /** P-143: the line's channel; P-145: a form filed Online gets a "Copy, not for filing" (never locked or filed). */
  channel: string; for_filing: boolean;
  /** C-9 (P-144): a barcode form filed by PDF upload or on paper needs a current validated copy before it is filed. */
  needs_validate: boolean;
  /** QA-165 part 2 (P-237, P-238): each mandatory field of IRCC's form that a copy made now would leave empty, with why
   *  ("needs an answer", "no question asks it yet", "fill it in Adobe", "filled by hand"); listed before the file is
   *  offered. It does not block "ready to file": P-237 stops only a barcode form whose own Validate fails, and P-238 makes
   *  missing facts a warning passed with a reason (L-SA3); the form's own Validate in Adobe asks for each. */
  fields_open: { box: string; label: string; reason: string; why: string }[];
};
/** QA-40: a form this case's release files Online: no PDF copy is made here, but the officer still sees it and for
 *  whom (P-113: an answer sheet in the portal's order; the browser extension fills it in a later wave). */
/** P-145, P-171 (3): whether a PDF copy (not for filing) is offered beside the answer sheet, and why not when it is not. */
export type CaseOnlineForm = { form: string; title: string; people: string[]; pdf_copy: boolean; why_no_copy: string | null };
/** QA-40 (P-114, W1-02): how a case names a form filed Online, in the same words as the configuration's channel. */
export const ONLINE_LATER_WAVE = "Online (later wave)";

/** V3 B1 (runtime side, P-297 (3)): each not retired combination's newest release as the "Open a case" dialog offers it,
 *  read with the same startable check that opening a case runs (api/src/runtime.ts), so the dialog never offers a release
 *  the server then refuses. `why` is the case officer's plain sentence (no field keys, no author's steps); the items
 *  themselves are the authors' to fix in Immigration programs. */
export type OpenableRelease = { combination_id: string; combination: string; version: number; startable: boolean; items: number; why: string | null };
/** The one sentence a case officer reads when a release is not ready for cases (the dialog and the 409 say the same). */
export const notReadyForCases = (label: string, items: number) => `"${label}" is not ready for new cases: ${items === 1 ? "1 item" : `${items} items`} to fix in Immigration programs, by the people who set it up. Cases already open are not affected.`;
/** QA-38 (P-67): a new case opens on its combination's newest release (api/src/runtime.ts takes the highest version),
 *  so the New case list names that one per combination, whatever order the release list comes in. */
export function newestReleases<T extends { combination_id: string; version: number }>(rows: T[]): T[] {
  const newest = new Map<string, T>();
  for (const r of rows) { const had = newest.get(r.combination_id); if (!had || r.version > had.version) newest.set(r.combination_id, r); }
  return [...newest.values()];
}
/** P-71: what blocks filing one form for one person. missing: a required fact not answered, answered but not confirmed,
 *  or a section check that fired on a fact it reads (fact "check:<id>", label the check's words, P-47 tier 2);
 *  or confirmed with a problem (it would be written wrong); and a required repeating group with no entries unless
 *  "none apply" is confirmed for it (Lead, break M3), named by its section (fact "group:<section>"). */
export type Readiness = { ready: boolean; missing: { fact: string; label: string; about: string; reason: "not answered" | "not confirmed" | "needs a fix" | "a check fired";
  /** B107: whose fact it is (the question's subject: a person's id, the case's, or "representative"), so who owes it is told by its own subject. */
  subject?: string }[] };
/** QA-76: the role labels a part can carry when no person stands behind it ("The application", "The representative"),
 *  written in the middle of a sentence ("About the representative", "for the representative"); a person's own name,
 *  even one starting with "The", is kept as it is. */
export const ROLE_PART_LABELS = new Set(["The application", "The representative"]);
export const inSentence = (label: string) => (ROLE_PART_LABELS.has(label) ? label.replace(/^The /, "the ") : label);
/** How a required repeating group with no entries is named where it blocks filing. */
export const groupLabel = (title: string) => `Entries in "${title}": add them, or say none apply`;

/** Which forms an answer fills, short enough for a household (Lead, R1d early look): one line per form, the person named
 *  when there is one, else how many people ("IMM 5257 for 6 people"); with counts, the form fields it fills (P-63). */
export function fillsText(fills: { form: string; person: string; subject?: string; boxes: number }[], counts = false): string {
  const byForm = new Map<string, { person: string; boxes: number }[]>();
  for (const f of fills) byForm.set(f.form, [...(byForm.get(f.form) ?? []), f]);
  return [...byForm].map(([form, list]) => {
    const n = list.reduce((s, x) => s + x.boxes, 0), fields = counts ? ` (${n} form field${n === 1 ? "" : "s"})` : "";
    return `${form} for ${list.length === 1 ? list[0].person : `${list.length} people`}${fields}`;
  }).join(", ");
}

/** Why a copy cannot be locked yet (P-71, Lead R1d early look): the same words in the API and on the button. */
export const notReady = (n: number) => `${n} fact${n === 1 ? "" : "s"} to answer or confirm before filing: do that, then generate a new copy.`;

/** C6.12 (M3-B; M3 case view r5c §"New", BR-1, BR-16, BR-18): a case's filings, submission groups and fee lines, derived
 *  on each read from the pinned release and the case's people (engine/runtime/filings.ts). Money in whole cents, CAD. */
export type FeeSource = { page: string; url: string; quote: string; quote_kind: "IRCC's words" | "summary of the Lead-checked record"; read: string; checked: string };
export type FilingApplicant = { subject: string; label: string; role: string; mode: "applying" | "declared_only" };
/** C11.12: `mode` co_filed is a sponsorship (always in the principal's submission, never split); on_principal is kept
 *  for rows stored before C11.12 and written by no code. `owner`: whose filing it is (its subject). */
export type CaseFiling = { id: string; combination: string; label: string; mode: "files_own" | "on_principal" | "co_filed"; owner?: { subject: string; label: string; role: string }; applicants: FilingApplicant[]; group: string;
  status: "NOT_STARTED"; number: string | null };
export type SubmissionGroup = { id: string; kind: "family" | "separate"; label: string; filings: string[]; splittable: boolean; why: string;
  totals: { line: string; label: string; people: number; per_person_cents: number; list_cents: number; family_max_cents: number; family_from: number; total_cents: number; cap_applied: boolean; why: string; source: FeeSource }[];
  /** C11.12 BR-10: null when the combination's fees are not worked out (never CAD 0). */
  total_cents: number | null };
/** `waiting`: the fact the line waits for (not counted until answered, G15); `source`: an exemption's own IRCC page. */
/** `person`: whose fee line it is (C11.12: several people share the principal's filing; `payer` is who pays it). */
export type FeeLine = { filing: string; person: string; payer: string; line: string; label: string; amount_cents: number; exempt: boolean; why: string; waiting?: string; source?: FeeSource };
export type NotFiling = { subject: string; label: string; role: string; why: string };
export type CaseFilings =
  | { derived: true; combination: string; label: string; filings: CaseFiling[]; groups: SubmissionGroup[]; fees: FeeLine[]; not_filing: NotFiling[]; currency: "CAD";
      /** C11.12 BR-10: false when the combination has no fee rule; then there are no fee lines and `fees_why` says so (never CAD 0). */
      fees_worked_out: boolean; fees_why: string | null; basis: string; why: string | null; version: string }
  | { derived: false; combination: string; why: string };

/** G13 (QA-140): a release in the same words in the studio and on a case: "Release N", N being the content pack release
 *  the studio shows (else the combination's released version). */
export const releaseLabel = (r: { version: number; packVersion?: { version: number } | null }) => `Release ${r.packVersion?.version ?? r.version}`;

// ------------------------------------------------------------------ C9.5 adopt a newer release (B145)

/** C9.5 (BR-5): move a case to the newest release of its combination: the release and pin revision the person read, and
 *  one reason (pre-filled "Adopting the current release", 3 to 500 characters). */
export const RELEASE_MOVE_REASON = "Adopting the current release";
export const ReleaseMove = z.object({
  target_version: z.number({ message: "Send the release you read (Read the list again)." }).int().positive(),
  from_revision: z.number({ message: "Send the pin revision you read (Read the list again)." }).int().positive(),
  reason: text("Say why this case moves to the new release (at least 3 characters).", 3, 500).refine((x) => /[\p{L}\p{N}]/u.test(x), "Say why this case moves to the new release, in words."),
});
export type ReleaseChangeLine = { what: string; kind: string; who: string[]; before: string; after: string };
/** `fillable`: Fill (a new copy on the new release) is the next step for this line. */
export type ReleaseEffectLine = { id: string; what: string; who: string; why: string; form?: string; subject?: string; fillable?: boolean };
/** GET /runtime/cases/:id/release-update (computed, writes nothing). `target` null: the case is on the newest release. */
export type ReleaseUpdate = {
  case_id: string;
  current: { version: number; label: string; revision: number; pinned_at: string };
  target: { version: number; label: string; released_at: string; demo: boolean } | null;
  combination: string;
  changes: { forms: ReleaseChangeLine[]; documents: ReleaseChangeLine[]; questions: ReleaseChangeLine[]; eligibility: ReleaseChangeLine[] };
  fees: string;
  effects: { fill_again: ReleaseEffectLine[]; filed_another_way: ReleaseEffectLine[]; no_longer_required: ReleaseEffectLine[]; withdrawn: ReleaseEffectLine[]; kept_out_of_date: ReleaseEffectLine[]; unchanged: { count: number; words: string } };
  /** Filings the difference touches, with what it touches (the Ready to file warning reads the same). */
  touched: { filing: string; label: string; words: string[] }[];
  refused: { code: string; reason: string; item?: string } | null;
  /** Whether this person may move the case (case staff of its firm); the list is shown either way. */
  can_move: boolean;
  reason_default: string;
};
/** After a move (pin revision 2 on): what it did to the work made before it that still waits (Prepare's groups). */
export type ReleaseLastMove = { from: { version: number; label: string; revision: number }; to: { version: number; label: string; revision: number }; at: string; reason: string | null; effects: ReleaseUpdate["effects"] };
/** POST …/release-update: the new pin and what the move did, for the toast. */
export type ReleaseMoved = { case_id: string; revision: number; version: number; label: string; from: { version: number; label: string; revision: number };
  counts: { fill_again: number; filed_another_way: number; no_longer_required: number; withdrawn: number; kept_out_of_date: number }; words: string };
