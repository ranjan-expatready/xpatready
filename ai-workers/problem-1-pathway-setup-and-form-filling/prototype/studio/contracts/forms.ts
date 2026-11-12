// F1 forms channels contract (forms lane, P-61, P-65, P-107; W1-10 slice 1: P-143 four channels and a signature value), shared by the API, the engine and the web app: the filing
// channels and their plain words, and the request shapes of the channel, answer-list, option-map and merge endpoints
// (STANDARDS §6: contract first, zod). W1-02 (P-102): the portal list, capture and screen-map shapes are parked with the
// browser extension on branch lead/parked-extension-2026-10-26.
import { z } from "zod";

/** P-143 (W1-10 slice 1): the four ways a form line is filed. Sample until the immigration expert confirms per form. */
export const CHANNELS = ["ONLINE", "PDF_UPLOAD", "PAPER", "NOT_NEEDED"] as const;
// F1 forms channels contract (forms lane, P-61, P-62, P-66), shared by the API, the engine and later the web app: the
// portal list, the filing channels and their plain words, and the request shapes of the capture, channel, answer-list
// and merge endpoints (STANDARDS §6: contract first, zod). The capture record itself is the JSON contract
// contracts/portal-capture.v1.schema.json, which the browser extension (F2) will send unchanged.

/** The representative portals a filing goes through (P-61 facts, IRCC and ESDC pages, 23 Oct). Sample until the
 *  immigration expert confirms which program is filed where. P-98: the proof of concept proves the APR Portal only, so
 *  it comes first and is the default; the others stay listed but are not proven now. */
export const PORTALS = [
  { key: "apr_portal", label: "APR Portal (Authorized Paid Representatives)", owner: "IRCC" },
  { key: "ircc_portal", label: "IRCC Portal", owner: "IRCC" },
  { key: "rep_pr_portal", label: "Representative Permanent Residence Portal", owner: "IRCC" },
  { key: "lmia_online", label: "LMIA Online", owner: "ESDC" },
] as const;
export const PORTAL_KEYS = PORTALS.map((p) => p.key) as [string, ...string[]];
/** P-98: the portal a new online form or capture starts on when nothing else is chosen. */
export const DEFAULT_PORTAL = "apr_portal";
export const portalLabel = (key: string | null | undefined) => PORTALS.find((p) => p.key === key)?.label ?? key ?? "no portal";

/** F3 plan D1: the decisions an online version's screen map holds about its page inputs. A row with any other outcome
 *  (such as `asked_differently`, a decision about a whole PDF section) is never a page input. */
export const SCREEN_MAP_OUTCOMES = ["mapped", "not_a_fact", "person_answers_on_screen", "unresolved"] as const;
/** F3 plan D1: the outcome and the data path prefix of "asked differently online" (a PDF section the portal asks in
 *  another way); a page element id can never start with "@". */
export const ASKED_DIFFERENTLY = { outcome: "asked_differently", prefix: "@asked-differently:" } as const;
export const AskedDifferently = z.object({ group: z.string().trim().min(1).max(80), reason: z.string().trim().min(3).max(300) }).strict();

export type Channel = (typeof CHANNELS)[number];
export const CHANNEL_WORDS: Record<Channel, string> = { ONLINE: "Online", PDF_UPLOAD: "PDF upload", PAPER: "Paper", NOT_NEEDED: "Not needed" };
/** What each channel means for the person filing (P-143, research filing_channels.md). */
export const CHANNEL_MEANS: Record<Channel, string> = {
  ONLINE: "Typed into the IRCC account's own screens from the answer sheet",
  PDF_UPLOAD: "IRCC's PDF filled, validated, saved and uploaded into the online application",
  PAPER: "IRCC's PDF filled, validated with its barcode page, printed, signed in pen and mailed",
  NOT_NEEDED: "The IRCC account asks these questions itself: nothing to file",
};
/** P-143: how a line is signed, its own value per line (never worked out from the channel any more). */
export const SIGNATURES = ["TYPED_NAME", "HAND_SCANNED", "PEN", "NONE"] as const;
export type Signature = (typeof SIGNATURES)[number];
export const SIGNATURE_WORDS: Record<Signature, string> = { TYPED_NAME: "Typed name", HAND_SCANNED: "Signed by hand and scanned", PEN: "Signed in pen", NONE: "No signature" };
/** C-2: the signatures that fit each channel. Paper is signed in pen; signed in pen only on paper; signed by hand and
 *  scanned only on a PDF upload; Not needed has none; Online has none or a typed name (the portal's own declaration is
 *  the portal's, not ours to record). The first is the default for a new line. */
export const SIGNATURE_FITS: Record<Channel, readonly Signature[]> = {
  ONLINE: ["NONE", "TYPED_NAME"], PDF_UPLOAD: ["NONE", "HAND_SCANNED", "TYPED_NAME"], PAPER: ["PEN"], NOT_NEEDED: ["NONE"],
};
export const signatureFits = (c: Channel, s: Signature) => SIGNATURE_FITS[c].includes(s);
/** The words when a signature does not fit its channel (on save and at release). */
export const signatureMisfitWords = (form: string, c: Channel, s: Signature) =>
  `${form}: "${SIGNATURE_WORDS[s]}" does not fit a line filed as ${CHANNEL_WORDS[c]}. ${c === "ONLINE" ? "An" : "A"} ${CHANNEL_WORDS[c]} line is ${SIGNATURE_FITS[c].map((x) => SIGNATURE_WORDS[x].toLowerCase()).join(" or ")}.`;
/** P-143, plan §8 Q1: the IRCC accounts a filing goes through (Sample until the immigration expert confirms). Names as
 *  canada.ca uses them, read 29 Oct (immigration-facts-2026-10-29.md rows 5c–5f): the IRCC secure account (work
 *  permits inside Canada, Express Entry), the PR Portal (spouse or partner sponsorship), LMIA Online (ESDC's employer
 *  account); the IRCC Portal and the APR Portal (authorized paid representatives) from the same research notes; PAPER is
 *  "no account: paper filing". ANY is only for what IRCC accepts: "for every account". */
export const IRCC_ACCOUNTS = ["IRCC_SECURE_ACCOUNT", "PR_PORTAL", "IRCC_PORTAL", "APR_PORTAL", "LMIA_ONLINE", "PAPER"] as const;
export type IrccAccount = (typeof IRCC_ACCOUNTS)[number];
export const ACCOUNT_WORDS: Record<IrccAccount | "ANY", string> = {
  IRCC_SECURE_ACCOUNT: "IRCC secure account", PR_PORTAL: "PR Portal", IRCC_PORTAL: "IRCC Portal", APR_PORTAL: "APR Portal", LMIA_ONLINE: "LMIA Online (ESDC)",
  PAPER: "No account (paper filing)", ANY: "Any account",
};
/** Break m6: the account inside a sentence. "No account (paper filing)" is not an account to go "through". */
export const throughAccount = (a: string) => (a === "PAPER" ? "on paper, with no IRCC account" : `through the ${ACCOUNT_WORDS[a as "ANY"] ?? a}`);
export const accountSubject = (a: string) => (a === "PAPER" ? "paper filing (no IRCC account)" : `the ${ACCOUNT_WORDS[a as "ANY"] ?? a}`);
/** C1.6 (P-61, P-143): a line's channel in words, an Online line with its portal: the IRCC account the combination files
 *  through ("Online · IRCC secure account"), or that none is set yet. Read by the Programs row and the combination page. */
export const channelWithPortal = (c: Channel, account: string | null | undefined) =>
  c !== "ONLINE" ? CHANNEL_WORDS[c] : !account ? "Online · IRCC account not set" : account === "PAPER" ? "Online · no IRCC account (paper filing)" : `Online · ${ACCOUNT_WORDS[account as IrccAccount] ?? account}`;
/** C1.6: a combination's form lines grouped by channel, in the contract's order, for "each form's channel" on one row. */
export const channelGroups = (lines: { code: string; channel?: string | null; document?: boolean }[], account: string | null | undefined) =>
  CHANNELS.map((c) => ({ channel: c, words: channelWithPortal(c, account), forms: lines.filter((l) => !l.document && l.channel === c).map((l) => l.code) })).filter((g) => g.forms.length);
/** P-144 (C-9): barcode forms: filed by PDF upload or on paper, each needs a current validated copy read back into the case
 *  before it is ready to file (IRCC returns it unprocessed otherwise). From P-144's examples and the evidence lane's barcode
 *  evidence (E1 imm5257, imm0008; P1 IMM 1295); IMM 5707 and IMM 5409 make no barcode (Help Centre 1523, read 29 Oct). */
export const BARCODE_FORMS = ["IMM 5257", "IMM 0008", "IMM 1344", "IMM 1295"] as const;
export const isBarcodeForm = (form: string) => (BARCODE_FORMS as readonly string[]).includes(form);
/** P-171 (3) and M3-S5: which forms are answer-sheet only (no PDF copy) is the Form library's record of what IRCC accepts
 *  per account, never a list here: engine/channels.ts answerSheetOnly. */
/** P-145: the words on a PDF copy of a form filed Online. */
export const NOT_FOR_FILING = "Copy, not for filing";
/** P-102, P-107 (P-114: the channel follows the filing route): Online stays selectable per line; the product fills it only once the browser extension returns. */
export const ONLINE_LATER = "Needs the browser extension (later wave)";

/** C-1: a line's channel and signature. The old spelling "Signed PDF upload" is refused with its new name. */
const channelError = (iss: { input?: unknown }) => (iss.input === "SIGNED_PDF_UPLOAD"
  ? "Signed PDF upload is now PDF upload, signed by hand and scanned: choose PDF upload and that signature."
  : "Choose Online, PDF upload, Paper or Not needed.");
export const SetChannel = z.object({
  channel: z.enum(CHANNELS, { error: channelError }),
  signature: z.enum(SIGNATURES, { error: "Choose typed name, signed by hand and scanned, signed in pen, or no signature." }).optional(),
  from: z.enum(CHANNELS, { error: channelError }).optional(),
  // Break m6: the signature the person saw, refused in words like the others.
  fromSignature: z.enum(SIGNATURES, { error: "Say which signature you changed it from: typed name, signed by hand and scanned, signed in pen, or no signature." }).optional(),
});
/** Plan §8 Q1: the IRCC account a combination files through (null: not set, every channel offered as Sample). */
const accountError = { error: `Choose one of: ${IRCC_ACCOUNTS.map((a) => ACCOUNT_WORDS[a]).join(", ")}.` };
/** Review M2 / break M3: `from` is the account the person saw (null: not set), so two saves at once cannot both win. */
export const SetAccount = z.object({
  account: z.enum(IRCC_ACCOUNTS, accountError).nullable(),
  from: z.enum(IRCC_ACCOUNTS, { error: (iss) => (iss.input === undefined ? "Say which IRCC account you changed it from (null when it was not set)." : accountError.error) }).nullable(),
});

/** How long an approved online version stays current before it must be checked again (Sample, P-61 §5). */
export const RECHECK_DAYS = 180;
export const CAPTURE_CONTRACT = "portal-capture/v1";
export const CAPTURE_WAYS = ["saved_page", "template", "extension", "screenshots"] as const;
/** Upload and size limits of a capture (break m5): the API and its messages read the same numbers. */
export const CAPTURE_LIMITS = { files: 30, fileMb: 10, screens: 200 } as const;

export const NewCapture = z.object({
  portal: z.enum(PORTAL_KEYS, { message: "Choose one of the portals." }),
  // QA-15: any case and the usual separators ("imm 5257", "IMM-5257", "imm_5257"); the API stores it as the library
  // writes it (capitals, one space), so it is the same form.
  form: z.string().trim().regex(/^[A-Za-z][A-Za-z0-9 _-]{1,30}$/, "A form code starts with a letter, for example IMM 5257 or EE PROFILE."),
  title: z.string().trim().min(3, "Give the form's title as the portal shows it.").max(200),
  applicationType: z.string().trim().max(200).optional(),
  /** Screen 01 "Add an online form" (C2.7): the combination it is added from; the online version stays a library one. */
  combinationId: z.string().uuid("Choose an existing combination.").optional(),
  /** F2: "extension" for a capture made screen by screen in the browser extension (it adds to the current version, Q2). */
  way: z.enum(["saved_page", "extension"], { error: "A capture is made from saved pages (or the template) or with the browser extension." }).optional(),
});
export const ReturnCapture = z.object({ note: z.string().trim().min(5, "Say what is wrong, so the person who captured it can fix it.").max(1000) });
export const AbandonCapture = z.object({ note: z.string().trim().max(1000).optional() });
/** "from": the value the person's screen showed; a save made from an out-of-date screen is refused (STANDARDS §4). */
export const SetPortal = z.object({ portal: z.enum(PORTAL_KEYS).nullable(), from: z.enum(PORTAL_KEYS).nullable().optional() });
/** Which source drafting reads for a form (P-62 §1, C2.10): the PDF version first by default, or the online screens alone. */
export const DRAFT_FROM = ["PDF_FIRST", "ONLINE_ONLY"] as const;
export type DraftFrom = (typeof DRAFT_FROM)[number];
export const DRAFT_FROM_WORDS: Record<DraftFrom, string> = { PDF_FIRST: "PDF version first, then the online screens for what differs", ONLINE_ONLY: "Online screens only (the PDF version is not reused)" };
export const SetDraftFrom = z.object({ draftFrom: z.enum(DRAFT_FROM, { message: "Choose PDF version first or online screens only." }), from: z.enum(DRAFT_FROM).optional() });
/** "Use the default" for the lines whose default is Online (C1.7): each with the channel the screen showed. */
export const UseDefaults = z.object({ lines: z.array(z.object({ line: z.string().min(1), from: z.enum(CHANNELS) })).min(1, "Choose at least one form.") });
/** A capture's status in a combination's words (C2.7): what the author sees on the combination page. */
export const CAPTURE_STATUS_WORDS: Record<string, string> = { OPEN: "Being captured: add the remaining screens, then finish", HELD: "Awaiting a second person", RETURNED: "Returned to the author", APPROVED: "Approved: an online version in the library", IN_LIBRARY: "Already in the library (identical screens)", ABANDONED: "Abandoned" };
export const AcceptScreenMap = z.object({ inputs: z.array(z.string()).optional() });
/** A person maps one online input: to a shared field (for a person), or as "not a fact" with the reason. */
export const ResolveInput = z.object({
  input: z.string().trim().min(1, "Name the input (its element id)."),
  fact: z.string().trim().regex(/^[a-z][a-z0-9_]*\.[a-z0-9_.]+$/, "A shared field id, for example person.place_of_birth_city.").optional(),
  person: z.string().trim().regex(/^[a-z][a-z0-9_]{1,40}$/).optional(),
  notAFact: z.literal(true).optional(),
  /** F2c (Q3, BR-9): a declaration or background question the representative answers on the portal themself; the
   *  extension never fills it. Set by the immigration expert role (SME duty), approved by a second person with the map. */
  answerOnScreen: z.literal(true).optional(),
  reason: z.string().trim().min(5, "Say why it is not a fact.").max(500).optional(),
}).refine((b) => [!!b.fact, !!b.notAFact, !!b.answerOnScreen].filter(Boolean).length === 1, { message: "Map it to a shared field (fact), mark it not a fact (notAFact), or mark it answered on screen (answerOnScreen): one of the three.", path: ["fact"] })
  .refine((b) => !(b.notAFact || b.answerOnScreen) || !!b.reason, { message: "Say why.", path: ["reason"] });
export const NewAlias = z.object({ alias: z.string().trim().min(2).max(200) });
export const NewAnswerList = z.object({
  key: z.string().trim().regex(/^[a-z][a-z0-9_]{1,60}$/, "A list key in lower case, for example sex or marital_status."),
  label: z.string().trim().min(2).max(120),
  values: z.array(z.object({ key: z.string().trim().regex(/^[a-z][a-z0-9_]{0,60}$/, "Value keys are lower case, for example another_gender."), label: z.string().trim().min(1).max(120) })).min(2, "An answer list has at least two values."),
});
export const LinkAnswerList = z.object({ list: z.string().trim() });
/** A person sets one form field's option map: value key → the form's code; codes no value fills are listed as unused;
 *  values the form prints no choice for are marked notOnForm, so filling refuses them in words (B81). */
export const SetOptionMap = z.object({ dataPath: z.string().trim().min(1, "Name the form field."), map: z.record(z.string(), z.string()), unused: z.array(z.string()).default([]), notOnForm: z.array(z.string()).default([]), baseRevision: z.string().optional() });
/** B81: the same choices saved on several form fields that print the same choices and read the same answer list. */
export const SetOptionMaps = z.object({ dataPaths: z.array(z.string().trim().min(1)).min(1, "Name the form fields.").max(2000), map: z.record(z.string(), z.string()), notOnForm: z.array(z.string()).default([]), baseRevision: z.string().min(1, "Say which choices you opened: read them again, then save.") });
/** B81: the option-map step of one PDF edition as a person reads it: form fields that print the same choices and read
 *  the same answer list are one group. `code` is what is saved, or (saved false) what the rules suggest from the form's
 *  own words, nothing saved until a person saves. */
export type OptionMapGroup = {
  list: string; list_label: string | null; fact: string; revision: string;
  form_fields: { data_path: string; caption: string | null; person: string | null; row: number | null; part: string | null }[];
  choices: { code: string; label: string }[]; saved: boolean;
  /** printed: the choices that could be this value (never marked); asks_more: two or more do, so a person neither marks
   *  nor picks here and the immigration expert decides. */
  values: { key: string; label: string; code: string | null; not_on_form: boolean; printed: string[]; asks_more: boolean }[]; problems: string[];
};
/** combinations: who files this form, since the choices are saved on the edition. */
export type OptionMapsView = { edition: string; edition_id: string; combinations: string[]; groups: OptionMapGroup[] };
/** F1-P (Screen 02 Q3, SA-1B-11, 12, 27): what a list on a form holds, and what happens when the case has more rows
 *  than the form has room for. Words are Sample until the immigration expert confirms them. Never a silent cut. */
export const LIST_PURPOSES = [
  { key: "current", label: "Current" },
  // S9 (SA-1B-10 rule 1, SA-1B-11 rule 1, spec fix 2 Nov): "for post" is the list entry tagged "send post here", the
  // mailing address, never the job applied for. The key keeps the spec's words ("the entry marked for post").
  { key: "for_post", label: "Mailing address (tagged \"send post here\")" },
  { key: "all", label: "All" },
  { key: "latest", label: "Latest" },
  { key: "date_range", label: "In a date range" },
] as const;
export const LIST_PURPOSE_KEYS = LIST_PURPOSES.map((p) => p.key) as unknown as [string, ...string[]];
export const LIST_OVERFLOWS = [
  { key: "extra_sheet", label: "Continue on an extra sheet" },
  { key: "flag_officer", label: "Flag for the officer" },
] as const;
export const LIST_OVERFLOW_KEYS = LIST_OVERFLOWS.map((p) => p.key) as unknown as [string, ...string[]];
export const SetListPurpose = z.object({
  dataPath: z.string({ error: "Name the form field." }).trim().min(1, "Name the form field."),
  kind: z.enum(LIST_PURPOSE_KEYS, { error: `Choose what the list holds: ${LIST_PURPOSES.map((p) => p.label).join(", ")}.` }),
  overflow: z.enum(LIST_OVERFLOW_KEYS, { error: "Choose what happens when there are more rows than the form has room for: continue on an extra sheet, or flag for the officer." }),
});
export type ListPurpose = { kind: string; overflow: string };

// G-CORE B2 (BR-3): `expected` is the fingerprint of the preview "What this change touches" the person confirmed.
export const NewMerge = z.object({ keep: z.string().trim(), merge: z.string().trim(), reason: z.string().trim().min(10, "Say why the two fields mean the same.").max(1000), expected: z.string().max(64).nullish() });
export const DecideMerge = z.object({ note: z.string().trim().max(1000).optional(), expected: z.string().max(64).nullish() });
/** The guarded screen_map job for an online version's open inputs (F1 slice 2): STUB proves the path at US$0; LIVE
 *  is a paid call and repeats the worst case the person saw (to the cent), so nothing is spent unseen. */
// QA-27: each field says in plain words what it needs, for a missing value and a wrong kind of value alike (zod's own
// "expected number, received string" never reaches a person).
export const DraftLeftovers = z.object({
  combinationId: z.string({ error: "Name the combination this is drafted for." }).uuid("Name the combination this is drafted for."),
  mode: z.enum(["STUB", "LIVE"], { error: "Choose STUB or LIVE: STUB runs no AI (US$0), LIVE is a paid AI call." }),
  confirmWorstUsd: z.number({ error: "Send the worst case you were shown as a number of US dollars, for example 0.42." }).nonnegative("The worst case is never below US$0: send the amount you were shown.").optional(),
});
export const AcceptAiProposals = z.object({
  jobId: z.string({ error: "Name the screen-map draft (its job id)." }).uuid("Name the screen-map draft (its job id)."),
  inputs: z.array(z.string({ error: "Name each input by its id, for example birthCity." }), { error: "List the inputs to accept, for example [\"birthCity\"]; leave it out to accept every proposal." }).optional(),
});
