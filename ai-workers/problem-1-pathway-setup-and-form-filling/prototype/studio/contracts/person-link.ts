// C6.16 Adult privacy and "Send to …" (screens lane, B138; concept BR-1..BR-10, P-412): the request shapes and the
// answers of the runtime routes that send, resend and take back an adult's own link and tick "Keep private from the
// principal", and of the separate /api/link/* routes the adult uses on that link. Shared by the API and the web
// (STANDARDS §6: contract first, zod). The words a person reads live here once, so the API and the screens agree.
// Consent wording: Unconfirmed: no counsel (SA-1B-269 rule 10: counsel confirms it).
import { z } from "zod";
import { INVISIBLE, LONE } from "./runtime.ts";

const clean = (x: string) => !INVISIBLE.test(x) && !/[\t\n\r]/.test(x) && !LONE.test(x);
const idemKey = z.string().trim().min(8, "An idempotency key has at least 8 characters.").max(128, "An idempotency key has at most 128 characters.").regex(/^[\x21-\x7e]+$/, "An idempotency key is letters, digits and punctuation, without spaces.");
/** A reason a person reads in the history: some letters or digits (as the case team's reasons). */
const reason = (missing: string) => z.string({ message: missing }).trim().min(5, missing).max(300, "Keep it to 300 characters.").refine(clean, "Remove the control or invisible characters from this text.").refine((x) => /[\p{L}\p{N}]/u.test(x), missing);

/** Send or resend to an adult on the case (the principal or case staff). Without an address: Resend, to the address of
 *  the person's newest link (for the principal after acceptance, the kept address). */
export const SendLink = z.object({
  address: z.string({ message: "Enter their email address." }).trim().min(1, "Enter their email address.").max(254, "An email address has at most 254 characters.").optional(),
  idempotencyKey: idemKey.optional(),
});
/** Take back: case staff say why (kept in the history); the principal may leave it out. */
export const TakeBack = z.object({ reason: reason("Say why the link is taken back (at least 5 characters).").optional() });
/** The team's tick "Keep private from the principal", by case staff, with a reason (AG-7-107, Q71). */
export const KeepPrivate = z.object({ reason: reason("Say why this person's answers are kept private (at least 5 characters).") });

/** The token travels in the link's fragment and is sent in a POST body, never in a URL (BR-4, challenge m1). */
const token = z.string({ message: "This link does not work. Ask whoever sent it for a new one." }).trim().regex(/^[A-Za-z0-9_-]{43}$/, "This link does not work. Ask whoever sent it for a new one.");
export const LinkToken = z.object({ token });
/** The 6-digit code as the person typed it: spaces, hyphens and dashes are allowed (GOV.UK "Confirm a phone number"). */
export const LinkCode = z.object({ token, code: z.string({ message: "Enter the 6-digit code from the email." }).max(40, "Enter the 6-digit code from the email.") });

/** The limits (product choices, not immigration values): OWASP and GOV.UK patterns, as the removed pairing. */
export const LINK_RULES = { codeMinutes: 15, wrongTries: 5, linkDays: 14, sessionHours: 8, codesPerAddress: 6, codesWindowMinutes: 15, triesPerNetwork: 30, triesPerServer: 120 } as const;

/** Words (one place for the API and the screens). Dead-link words never name a person (challenge m2). */
export const LINK_WORDS = {
  unknown: "This link does not work. Ask whoever sent it for a new one.",
  locked: "Too many wrong codes. This link no longer works. Ask whoever sent it for a new one.",
  sessionEnded: "Your session on this link has ended. Open the link from your email again and ask for a new code.",
  /** BR-6 (Unconfirmed: no counsel). */
  consent: "Your answers go to the firm handling this application. The person who started it will see how far you have got, not your answers. The firm can change this.",
  consentNote: "Unconfirmed: no counsel",
  /** The principal's dialog (layout §4). */
  dialog: (who: string) => `${who} gets a link and a code by email. Once they open it, you will see how far they have got, not their answers.`,
  dialogTip: "Your partner answers their own questions. You keep seeing how far they have got.",
  takeBack: (who: string) => `${who}'s link stops working now. Their answers stay private.`,
  xActor: "This page works only from the link in your email: it does not use the Studio's simulated people.",
  linkOnly: "A person's own link reaches only their own questions, never the firm's or the client's pages.",
} as const;

/** One person's link as a screen shows it. state: none (never sent) · sent · accepted · expired · taken_back ·
 *  superseded · locked. The token and the code are never in it. */
export type PersonLinkState = {
  state: "sent" | "accepted" | "expired" | "taken_back" | "superseded" | "locked";
  email_masked: string; given_by: string; sent_at: string; accepted_at: string | null; expires_at: string;
  /** Why it no longer works, naming no person; null while it works. */
  why: string | null;
};
export type PrivacySetting = { on: boolean; at: string | null; by: string | null; why: string | null };
/** Progress only, counted on the server (challenge m3): a part is done when nothing required is missing or invalid. */
export type ProgressOnly = { done: number; asked: number; optional: number; saved_at: string | null };
/** GET /runtime/cases/:id/people/privacy: one line per person on the case (not the application itself). */
export type PersonPrivacy = {
  subject_id: string; label: string; role: string;
  /** BR-1: an adult may get their own link; otherwise why not (no date of birth, under 18, the principal). */
  adult: boolean; why_not: string | null;
  private: PrivacySetting; link: PersonLinkState | null;
  /** The address the person accepted on, masked: the only one the principal may resend to (BR-3). */
  kept_masked: string | null;
  progress: ProgressOnly | null;
  /** The officer's line in words ("With Partner since 9 Nov · private from Client A"). */
  words: string;
  /** What this viewer may do now (the server checks again on every request). */
  can: { send: boolean; resend_kept: boolean; send_new: boolean; take_back: boolean; tick: boolean };
};
export type PeoplePrivacy = { case_id: string; principal: string; people: PersonPrivacy[] };

/** POST /api/link/open: what a link shows before its code (nothing is sent by opening it). */
export type LinkOpened = { state: "live"; email_masked: string; accepted: boolean } | { state: "dead"; why: string };
/** POST /api/link/code: the session (Bearer token for sessionStorage) and where it reaches. */
export type LinkSession = { session: string; expires_at: string; case_id: string; subject_id: string; consent_needed: boolean };
