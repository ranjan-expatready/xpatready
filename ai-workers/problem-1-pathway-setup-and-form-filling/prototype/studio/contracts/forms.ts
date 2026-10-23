// F1 forms channels contract (forms lane, P-61, P-62, P-66), shared by the API, the engine and later the web app: the
// portal list, the filing channels and their plain words, and the request shapes of the capture, channel, answer-list
// and merge endpoints (STANDARDS §6: contract first, zod). The capture record itself is the JSON contract
// contracts/portal-capture.v1.schema.json, which the browser extension (F2) will send unchanged.
import { z } from "zod";

/** The representative portals a filing goes through (P-61 facts, IRCC and ESDC pages, 23 Oct). Sample until the
 *  immigration expert confirms which program is filed where. */
export const PORTALS = [
  { key: "ircc_portal", label: "IRCC Portal", owner: "IRCC" },
  { key: "apr_portal", label: "Authorized Paid Representatives Portal", owner: "IRCC" },
  { key: "rep_pr_portal", label: "Representative Permanent Residence Portal", owner: "IRCC" },
  { key: "lmia_online", label: "LMIA Online", owner: "ESDC" },
] as const;
export const PORTAL_KEYS = PORTALS.map((p) => p.key) as [string, ...string[]];
export const portalLabel = (key: string | null | undefined) => PORTALS.find((p) => p.key === key)?.label ?? key ?? "no portal";

export const CHANNELS = ["PDF_UPLOAD", "ONLINE", "SIGNED_PDF_UPLOAD"] as const;
export type Channel = (typeof CHANNELS)[number];
export const CHANNEL_WORDS: Record<Channel, string> = { PDF_UPLOAD: "PDF upload", ONLINE: "Online", SIGNED_PDF_UPLOAD: "Signed PDF upload" };
/** Worked out from the channel, never stored (challenge point 4; immigration expert to confirm per form). */
export const SIGNATURE_WORDS: Record<Channel, string> = {
  ONLINE: "The client signs the declaration in the portal",
  SIGNED_PDF_UPLOAD: "Printed, signed by hand, scanned and uploaded",
  PDF_UPLOAD: "No signature in the file",
};

/** How long an approved online version stays current before it must be checked again (Sample, P-61 §5). */
export const RECHECK_DAYS = 180;
export const CAPTURE_CONTRACT = "portal-capture/v1";
export const CAPTURE_WAYS = ["saved_page", "template", "extension", "screenshots"] as const;

export const NewCapture = z.object({
  portal: z.enum(PORTAL_KEYS, { message: "Choose one of the portals." }),
  form: z.string().trim().regex(/^[A-Z][A-Z0-9 -]{1,30}$/, "A form code in capitals, for example IMM 5257 or EE PROFILE."),
  title: z.string().trim().min(3, "Give the form's title as the portal shows it.").max(200),
  applicationType: z.string().trim().max(200).optional(),
});
export const ReturnCapture = z.object({ note: z.string().trim().min(5, "Say what is wrong, so the person who captured it can fix it.").max(1000) });
export const SetPortal = z.object({ portal: z.enum(PORTAL_KEYS).nullable() });
export const SetChannel = z.object({ channel: z.enum(CHANNELS, { message: "Choose PDF upload, Online or Signed PDF upload." }) });
export const AcceptScreenMap = z.object({ inputs: z.array(z.string()).optional() });
export const NewAlias = z.object({ alias: z.string().trim().min(2).max(200) });
export const NewAnswerList = z.object({
  key: z.string().trim().regex(/^[a-z][a-z0-9_]{1,60}$/, "A list key in lower case, for example sex or marital_status."),
  label: z.string().trim().min(2).max(120),
  values: z.array(z.object({ key: z.string().trim().regex(/^[a-z][a-z0-9_]{0,60}$/, "Value keys are lower case, for example another_gender."), label: z.string().trim().min(1).max(120) })).min(2, "An answer list has at least two values."),
});
export const LinkAnswerList = z.object({ list: z.string().trim() });
/** A person sets one form field's option map: value key → the form's code; codes no value fills are listed as unused. */
export const SetOptionMap = z.object({ map: z.record(z.string(), z.string()), unused: z.array(z.string()).default([]) });
export const NewMerge = z.object({ keep: z.string().trim(), merge: z.string().trim(), reason: z.string().trim().min(10, "Say why the two fields mean the same.").max(1000) });
export const DecideMerge = z.object({ note: z.string().trim().max(1000).optional() });
