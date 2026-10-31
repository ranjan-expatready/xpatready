// S4 Form library and form finder contract, slice 1 (W1-06, P-123; challenge.md M2–M7, m1–m6). Shared by the API and the
// web app; requests are parsed with these schemas on the server and refusals are RFC 9457 Problem Details.
import { z } from "zod";
import { CHANNEL_WORDS, CHANNELS, IRCC_ACCOUNTS, type Channel } from "./forms.ts";

/** How the finder decides which forms apply: AI read live (paid, cost shown first), saved AI answers replayed (US$0), or
 *  rules only (forms printed on the page are listed, none attached: AI did not decide). */
export const FINDER_MODES = ["live", "replay", "rules"] as const;
export type FinderMode = (typeof FINDER_MODES)[number];

const code = z.string().trim().regex(/^(IMM|IRM|CIT|PPTC|EMP) *[0-9]{3,5}( *(SCH *[0-9]+[A-Z]?|DEP|[A-Z]))?$/i, "A form number looks like IMM 5257.").transform((s) => normaliseCode(s));
/** "imm5257", "IMM  5257 sch1" → "IMM 5257", "IMM 5257 SCH1" (one spelling everywhere). */
export function normaliseCode(s: string): string {
  const m = /^(IMM|IRM|CIT|PPTC|EMP)\s*([0-9]{3,5})\s*(SCH\s*([0-9]+[A-Z]?)|DEP|[A-Z])?$/i.exec(s.trim());
  // Round 2 major 2: anything else keeps its own spelling (only spaces tidied), so "Guide 5256" is found; "guide5256" too.
  if (!m) { const g = /^guide\s*([0-9]{3,5})$/i.exec(s.trim()); return g ? `Guide ${g[1]}` : s.trim().replace(/\s+/g, " "); }
  const tail = m[3] ? (m[4] ? ` SCH${m[4].toUpperCase()}` : ` ${m[3].toUpperCase()}`) : "";
  return `${m[1].toUpperCase()} ${m[2]}${tail}`;
}

/** POST /combinations/:id/forms/find/plan and …/find: one finder run for a combination. pageUrl is "Choose the guide"
 *  (a canada.ca application or guide page a person picked); only limits the run to some forms ("Find again" on one). */
export const FinderBody = z.object({
  mode: z.enum(FINDER_MODES, { message: "Choose how to find the forms: live AI, saved AI answers or rules only." }),
  pageUrl: z.string().trim().url("Paste the address of a canada.ca application or guide page.").optional(),
  only: z.array(code).max(30).optional(),
});
export const FinderLaunchBody = FinderBody.extend({
  planSha256: z.string().regex(/^[0-9a-f]{64}$/, "Look at the plan first: its fingerprint is missing."),
  idempotencyKey: z.string().trim().min(8).max(120),
  /** P-179: a person's Continue past a cost limit (POST /ai/overrides), used once by this launch. */
  overrideId: z.string().trim().min(1).max(80).optional(),
});

/** POST /combinations/:id/forms: attach a library form by hand. */
export const AttachBody = z.object({ formKey: code, who: z.string().optional() });

/** GET /library/forms?type&usedBy&status&q — the one lean list (P-123): filters, never groups. */
export const LIBRARY_TYPES = ["form", "guide", "checklist"] as const;
export const LIBRARY_STATUSES = ["ready", "needs_ok", "newer_file", "no_file", "retired"] as const;
export const LibraryQuery = z.object({
  type: z.enum(LIBRARY_TYPES).optional(),
  usedBy: z.string().uuid().optional(),
  status: z.enum(LIBRARY_STATUSES).optional(),
  q: z.string().trim().max(80).optional(),
  /** "picker": S5's "Add a form from the library" — usable forms only (no retired form, no form still waiting). */
  for: z.enum(["picker"]).optional(),
});

/** DELETE …/forms/:code and POST …/forms/:code/replace: the line version the person saw (409 when stale; S5 ask). */
export const LineVersionBody = z.object({ version: z.number().int().min(1).optional() });
/** POST …/forms/undo: the change the person saw as "last" (409 when someone made a newer one; S5 ask). */
export const UndoBody = z.object({ changeId: z.string().uuid().optional() });

/** C11.18 as amended by P-143 (W1-10 slice 1, C-3): what IRCC accepts for a form, per IRCC account (or ANY: every
 *  account), set by a person with the canada.ca line it comes from, or a reason. Not needed only for a named account (C-4). */
export const ACCEPTS_ACCOUNTS = [...IRCC_ACCOUNTS, "ANY"] as const;
export const acceptsWords = (channels: readonly string[] | null | undefined) => (channels?.length ? channels.map((c) => CHANNEL_WORDS[c as Channel] ?? c).join(" · ") : "Not set yet");
export const AcceptsBody = z.object({
  account: z.enum(ACCEPTS_ACCOUNTS, { error: "Choose the IRCC account this is for, or any account." }).default("ANY"),
  channels: z.array(z.enum(CHANNELS, { error: "Choose from Online, PDF upload, Paper and Not needed." }), { error: "Choose what IRCC accepts: Online, PDF upload, Paper, or Not needed." })
    .min(1, "Choose at least one way IRCC accepts.").max(4).refine((x) => new Set(x).size === x.length, "Each way once."),
  quote: z.string().trim().min(8, "Paste the canada.ca line (at least 8 characters), or give a reason instead.").max(400, "Paste only IRCC's sentence (at most 400 characters), not the whole page.").optional(),
  reason: z.string().trim().min(3, "Say why (3 to 300 characters).").max(300, "Say why (3 to 300 characters).").optional(),
}).refine((b) => !!b.quote || !!b.reason, { message: "Paste the canada.ca line this comes from, or say why.", path: ["quote"] })
  .refine((b) => b.account !== "ANY" || !b.channels.includes("NOT_NEEDED"), { message: "Not needed is said for one IRCC account (the account that asks it itself), never for every account.", path: ["channels"] })
  // Break M6: no account means paper filing, so the only way IRCC can accept a form "through" it is on paper.
  .refine((b) => b.account !== "PAPER" || (b.channels.length === 1 && b.channels[0] === "PAPER"), { message: "No account (paper filing) files only on paper: choose Paper, or choose the IRCC account that accepts it another way.", path: ["channels"] })
  .refine((b) => !b.channels.includes("NOT_NEEDED") || b.channels.length === 1, { message: "Not needed stands alone: the account asks the form itself, so it is not also filed another way.", path: ["channels"] });

/** POST /library/forms/:code/retire|restore and DELETE /library/forms/:code: the P-116 lifecycle, a second person approves. */
export const LifecycleReasonBody = z.object({ reason: z.string().trim().min(3, "Say why (3 to 300 characters).").max(300, "Say why (3 to 300 characters).") });
