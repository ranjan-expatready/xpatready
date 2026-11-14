// PF-0p (rows rev 16): the staff context a service takes. Exactly PF-4's shape (api/src/platform/identity/keys.ts
// `StaffContext` on PR #1744; copied, never imported: ports import only zod). PF-4's guard builds it on every staff route
// (req.platform); services take it as an argument, so a row can be written and tested before PF-4 is on main.
import { z } from "zod";
import { FirmId } from "./audit.ts";

/** PF-4's duty words (keys.ts DUTY_KEYS): `represent` holds the three sign-off keys, `case` works on cases, `firm_admin`
 *  runs the firm's staff. Derived from keys by PF-4; a fake states them. */
export const Duty = z.enum(["represent", "case", "firm_admin"]);
export type Duty = z.infer<typeof Duty>;

export const StaffContext = z.strictObject({
  staffId: z.string().min(1),
  firmId: FirmId,
  firmKey: z.string().min(1),
  /** Role names (PlatformRole: OWNER, ADMIN, CASE_MANAGER, CASE_OFFICER, BILLING_FINANCE, READ_ONLY). */
  roles: z.array(z.string()),
  /** The person's agent/* permission keys (the sum of their roles). */
  keys: z.array(z.string()),
  duties: z.array(Duty),
  /** When the person last proved who they are (seconds since 1970, the token's auth_time): step-up checks read it. */
  authTime: z.number(),
  via: z.enum(["local", "cognito"]),
});
export type StaffContext = { staffId: string; firmId: string; firmKey: string; roles: string[]; keys: string[]; duties: Duty[]; authTime: number; via: "local" | "cognito" };

/** The Sample firm and Owner a fake uses unless told otherwise (fixed ids, so tests are repeatable). */
export const FAKE_FIRM_ID = "00000000-0000-4000-8000-0000000f0001";
export const FAKE_STAFF_ID = "00000000-0000-4000-8000-0000000f0101";

/** A valid StaffContext for tests: the Sample firm's Owner with no keys, signed in now through the local stand-in;
 *  `partial` replaces any field (and is checked, so a fake can never hold a shape the guard would not give). */
export function fakeStaff(partial: Partial<StaffContext> = {}): StaffContext {
  return StaffContext.parse({
    staffId: FAKE_STAFF_ID, firmId: FAKE_FIRM_ID, firmKey: "sample-firm", roles: ["OWNER"], keys: [], duties: [],
    authTime: Math.floor(Date.now() / 1000), via: "local", ...partial,
  });
}

/** The audit actor word of a staff member (PF-4's actorWord). */
export const staffActor = (ctx: Pick<StaffContext, "staffId">) => `staff:${ctx.staffId}`;
