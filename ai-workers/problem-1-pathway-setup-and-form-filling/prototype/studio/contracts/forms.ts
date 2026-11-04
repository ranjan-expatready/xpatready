// F1 forms channels contract (forms lane, P-61, P-65, P-107; W1-10 slice 1: P-143 four channels and a signature value), shared by the API, the engine and the web app: the filing
// channels and their plain words, and the request shapes of the channel, answer-list, option-map and merge endpoints
// (STANDARDS §6: contract first, zod). W1-02 (P-102): the portal list, capture and screen-map shapes are parked with the
// browser extension on branch lead/parked-extension-2026-10-26.
import { z } from "zod";

/** P-143 (W1-10 slice 1): the four ways a form line is filed. Sample until the immigration expert confirms per form. */
export const CHANNELS = ["ONLINE", "PDF_UPLOAD", "PAPER", "NOT_NEEDED"] as const;
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
/** P-171 (3), Lead's answer to plan §8 Q5: on Express Entry (the IRCC secure account) IMM 5669 and IMM 5406 are Online lines
 *  with the answer sheet only: no PDF copy, so nobody mistakes the paper PDF for something to file. Elsewhere P-145 holds. */
export const ANSWER_SHEET_ONLY: Record<string, readonly string[]> = { IRCC_SECURE_ACCOUNT: ["IMM 5669", "IMM 5406"] };
export const answerSheetOnly = (form: string, account: string | null | undefined) => !!account && (ANSWER_SHEET_ONLY[account] ?? []).includes(form);
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
export const NewAlias = z.object({ alias: z.string().trim().min(2).max(200) });
export const NewAnswerList = z.object({
  key: z.string().trim().regex(/^[a-z][a-z0-9_]{1,60}$/, "A list key in lower case, for example sex or marital_status."),
  label: z.string().trim().min(2).max(120),
  values: z.array(z.object({ key: z.string().trim().regex(/^[a-z][a-z0-9_]{0,60}$/, "Value keys are lower case, for example another_gender."), label: z.string().trim().min(1).max(120) })).min(2, "An answer list has at least two values."),
});
export const LinkAnswerList = z.object({ list: z.string().trim() });
/** A person sets one form field's option map: value key → the form's code; codes no value fills are listed as unused. */
export const SetOptionMap = z.object({ dataPath: z.string().trim().min(1, "Name the form field."), map: z.record(z.string(), z.string()), unused: z.array(z.string()).default([]) });
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
