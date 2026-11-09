// C7.9 (row B142 = L-SA8; P-242; SA-1B-1 rule 9): "Must verify before filing" on a library field. Shared by the API and
// the web app. The author proposes the flag on or off with a reason; only the immigration expert approves it.
import { z } from "zod";

export const MUST_VERIFY_KIND = "field_must_verify", MUST_VERIFY_ACTION = "SET_MUST_VERIFY";
const clean = (s: string) => s.normalize("NFC").replace(/[\p{Cf}ᅟᅠㅤﾠ]/gu, "").replace(/\s+/g, " ").trim();
/** POST /library/fields/:key/must-verify. */
export const MustVerifyBody = z.object({
  on: z.boolean({ error: "Say whether the field must be verified before filing (true or false)." }),
  reason: z.string({ error: "Write at least 5 letters or digits: why, for every combination." }).transform(clean)
    .refine((s) => s.replace(/[^\p{L}\p{N}]/gu, "").length >= 5, "Write at least 5 letters or digits: why, for every combination.").refine((s) => s.length <= 300, "Keep the reason under 300 characters."),
}).strict();
