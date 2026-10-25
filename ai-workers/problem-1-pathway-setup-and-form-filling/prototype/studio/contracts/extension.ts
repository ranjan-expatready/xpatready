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
