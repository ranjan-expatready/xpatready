// F1 forms channels contract (forms lane, P-61, P-65, P-107), shared by the API, the engine and the web app: the filing
// channels and their plain words, and the request shapes of the channel, answer-list, option-map and merge endpoints
// (STANDARDS §6: contract first, zod). W1-02 (P-102): the portal list, capture and screen-map shapes are parked with the
// browser extension on branch lead/parked-extension-2026-10-26.
import { z } from "zod";

export const CHANNELS = ["PDF_UPLOAD", "ONLINE", "SIGNED_PDF_UPLOAD"] as const;
export type Channel = (typeof CHANNELS)[number];
export const CHANNEL_WORDS: Record<Channel, string> = { PDF_UPLOAD: "PDF upload", ONLINE: "Online", SIGNED_PDF_UPLOAD: "Signed PDF upload" };
/** Worked out from the channel, never stored (challenge point 4; immigration expert to confirm per form). */
export const SIGNATURE_WORDS: Record<Channel, string> = {
  ONLINE: "The client signs the declaration in the portal",
  SIGNED_PDF_UPLOAD: "Printed, signed by hand, scanned and uploaded",
  PDF_UPLOAD: "No signature in the file",
};
/** P-102, P-107: Online stays selectable per line; the product fills it only once the browser extension returns. */
export const ONLINE_LATER = "Needs the browser extension (later wave)";

export const SetChannel = z.object({ channel: z.enum(CHANNELS, { message: "Choose PDF upload, Online or Signed PDF upload." }), from: z.enum(CHANNELS).optional() });
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
  { key: "for_post", label: "For the post applied for" },
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

export const NewMerge = z.object({ keep: z.string().trim(), merge: z.string().trim(), reason: z.string().trim().min(10, "Say why the two fields mean the same.").max(1000) });
export const DecideMerge = z.object({ note: z.string().trim().max(1000).optional() });
