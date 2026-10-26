// F2 browser extension contract (forms lane; plan §6; P-66, P-90), shared by the API and the extension: one portal
// screen as the extension reads it (structure only), and the requests of the capture endpoints. Zod, strict: a key the
// contract does not name (a "value", an "answer") is refused, never ignored (BR-1).
import { z } from "zod";
import RULES from "./portal-reader-rules.json" with { type: "json" };

const text = (max: number) => z.string().max(max);
export const ExtensionOption = z.object({ code: text(300), label: text(1000) }).strict();
export const ExtensionInput = z.object({
  id: z.string().min(1).max(300).regex(/^[^@\s]+$/, "An input is named by the page's own element id or name."),
  label: text(1000), type: z.enum(RULES.types as [string, ...string[]]), required: z.boolean(), order: z.number().int().min(1),
  group: text(1000).optional(), part: z.enum(["YYYY", "MM", "DD"]).optional(), help: text(4000).optional(),
  max_length: z.number().int().min(1).max(100000).optional(), min_length: z.number().int().min(0).max(100000).optional(), pattern: text(1000).optional(),
  options: z.array(ExtensionOption).max(1000).optional(),
}).strict();
/** One screen, as extension/src/reader.ts reads it from the open page. */
export const ExtensionScreen = z.object({ title: z.string().trim().min(1, "The screen has no heading.").max(300), inputs: z.array(ExtensionInput).min(1, "No questions on this screen.").max(RULES.max_inputs) }).strict();
export type ExtensionScreen = z.infer<typeof ExtensionScreen>;
export const AddExtensionScreen = z.object({ screen: ExtensionScreen, revision: z.number().int().min(0, "Send the capture's revision you were shown.") }).strict();

// ─── F2b: pairing and sessions (Lead decision Q1; plan §7 XT-1…XT-3; challenge M7)
/** The extension's public key (manifest "key"): it fixes the extension's id, so the API can name the one origin it
 *  answers and the one extension a token is bound to. The private key was never kept (an unpacked or managed install
 *  needs none); a store listing (team, M3) gets its own id, set with STUDIO_EXTENSION_ID (api/src/extension.ts). */
export const EXTENSION_PUBLIC_KEY = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEApy5qbK2+9ydQGaawucAd8zmZ09yi20vJ/zO5qP+QFV6IGvGrbehQK56E/rsjB8eZ2IOY1sOU8qkdn6AmBPHrY32RQnCVfT0FkTQzMuavHh/4peIp3F+gjUMeaza9WqNdfhhVwn/80iwPIU2gXPfy3URmoXpBoQM90J6mDA1zpREASlHy8gzGA38eSLhzczzcctQ6mh/1Mh647pXcPAt/SbEMaatlEVbfJlNa4xto8R9JOFAldv5Kw7LLS1WKeY5VQIa4FM0yiG05vy69XZBATJuitELSfpC3j6xHiCFMoeCBeFjcruy1JOCxwR5Ya3UMUC8M2BXwkjsUO4Ci4ZoN7QIDAQAB";
/** Sample. wrongTries: wrong codes against one code before it stops working; selector: the characters that find a code;
 *  triesPerAddress / triesPerServer: tries to exchange a code in one minute (generous: an office typing codes never
 *  reaches them; a client sweeping codes does). */
export const PAIRING = { codeMinutes: 5, sessionHours: 8, openCodes: 5, wrongTries: 5, selector: 3, triesPerAddress: 60, triesPerServer: 600 } as const;
/** No 0/O, 1/I/L: a code is read off one screen and typed into another. */
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const MODES = ["capture", "fill"] as const;
export const NewPairing = z.object({}).strict();
export const NewSession = z.object({
  code: z.string({ error: "Enter the 8-character code the Studio shows." }).trim().toUpperCase().regex(new RegExp(`^[${CODE_ALPHABET}]{8}$`), "Enter the 8-character code the Studio shows."),
  extensionId: z.string({ error: "The extension did not say who it is." }).regex(/^[a-p]{32}$/, "The extension did not say who it is."),
}).strict();
export const NewExtensionCapture = z.object({
  portal: z.string(), form: z.string(), title: z.string(), applicationType: z.string().optional(), combinationId: z.string().optional(),
}).strict();

// ─── F2c: fill one screen (plan §7 BR-6…BR-13; challenge M2, M3, M5, M7)
/** The screen open now, read by the extension (structure only; its live labels are never stored). */
export const FillPlanRequest = z.object({ screen: ExtensionScreen }).strict();
