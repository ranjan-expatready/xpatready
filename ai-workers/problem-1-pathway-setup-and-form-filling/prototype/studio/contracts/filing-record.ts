// C8.2 filing record (runtime lane, M3-F; AG-7-95): the request shapes, shared by the API and any screen (STANDARDS:
// contract first, zod). Pure.
import { z } from "zod";

/** PUT /api/runtime/filings/:id/application-number: `value` null or blank clears it; `before` is the number read (null
 *  when there was none): a different number now is a 409 and nothing is overwritten. */
export const SetApplicationNumber = z.object({
  value: z.string({ error: "Send the application number as text, or null to clear it." }).max(200, "That is too long to be an application number.").nullable(),
  before: z.string({ error: "Send \"before\": the number you read, or null when there was none." }).max(200, "That is too long to be an application number.").nullable(),
});
export type SetApplicationNumber = z.infer<typeof SetApplicationNumber>;
