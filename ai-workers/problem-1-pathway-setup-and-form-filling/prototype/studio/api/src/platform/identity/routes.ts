// PF-4 routes (contracts §1.2 API as changed by §7). Each declares its access (keys.ts); the platform guard does the rest.
// Accepting an invitation is PF-4b's (POST /api/public/invitations/:token/accept), as is the step-up route.
import { Body, Controller, Get, HttpCode, Inject, Param, Patch, Post, Put, Req } from "@nestjs/common";
import { z } from "zod";
import { notInFirm } from "../firm-scope.ts";
import { list, parseInput, strict } from "../http/input.ts";
import { AnyStaff, PermissionKeys, StaffSignIn, staffOf, type StaffContext } from "./keys.ts";
import { PlatformIdentity, UUID } from "./service.ts";

type R = { platform?: StaffContext };
type B = Record<string, unknown>;

// PF-28 part 2a (R1.10): every body here is read through the one input rule (http/input.ts): an unknown field, a wrong type
// or a missing field is refused 422 with the field named, before any record is looked up. The texts are not trimmed here:
// the service's own rules (emailOf, reasonOf, displayNameOf, textOf) read spaces and invisible characters and keep their
// codes and words. The bounds are outer limits only; the business limits (a reason's 200 characters) stay in the service.
const str = (max: number) => z.string().max(max);
const reason = str(2000).nullable().optional();
const roles = list(str(40), 12);
export const IdentityInput = {
  local: strict({ firmKey: str(100), email: str(320).optional(), actorId: str(200).optional(), secondStep: z.boolean().optional() }),
  invite: strict({ email: str(320), roles, reason, displayName: str(2000).nullable().optional() }),
  // Each row is checked and flagged on its own row by batchRowsOf (PF-4c), so a bad row is a row flag, not a refusal here.
  batch: strict({ rows: z.unknown().optional() }),
  resend: strict({ reason }),
  roles: strict({ roles, reason }),
  reason: strict({ reason: str(2000) }),
  credential: strict({ representativeType: str(400), licensingBody: str(400), licenceNumber: str(400) }),
};
/** A staff or invitation id in the path: a uuid, or the one not-found, before the body is read (PF-28: a bad id is 404,
 *  never 422). Not http/input.ts's idParam: these keep the service's own not-found words ("No such staff member."), so a
 *  malformed id and another firm's id answer byte for byte the same (DW4). */
const idOf = (what: "staff member" | "invitation") => (id: string) => (UUID.test(id) ? id : notInFirm(what));
const staffId = idOf("staff member"), invitationId = idOf("invitation");

@Controller("api/platform")
export class PlatformIdentityController {
  constructor(@Inject(PlatformIdentity) private readonly id: PlatformIdentity) {}

  /** The local stand-in's sign-in: refused unless PLATFORM_IDENTITY=local (which is refused in test and production). */
  @Post("session/local") @HttpCode(200) @StaffSignIn("the sign-in door: there is no session yet")
  local(@Body() b: B) { return this.id.localSignIn(parseInput(IdentityInput.local, b)); }

  /** Who am I: roles, permission keys and the duties derived from them (represent, case, firm_admin). */
  @Get("me") @AnyStaff("a person's own identity")
  me(@Req() r: R) { return this.id.me(staffOf(r)); }

  @Post("staff/invitations") @PermissionKeys("agent/staff:manage")
  invite(@Req() r: R, @Body() b: B) { return this.id.invite(staffOf(r), parseInput(IdentityInput.invite, b)); }

  /** PF-4c part 1 (AG-1-69): one form of 1-20 rows, one invitation per row; flagged rows or too few seats send nothing. */
  @Post("staff/invitations/batch") @PermissionKeys("agent/staff:manage")
  inviteBatch(@Req() r: R, @Body() b: B) { return this.id.inviteBatch(staffOf(r), parseInput(IdentityInput.batch, b ?? {})); }

  @Get("staff/invitations") @PermissionKeys("agent/staff:manage")
  invitations(@Req() r: R) { return this.id.invitations(staffOf(r)); }

  @Post("staff/invitations/:id/resend") @HttpCode(200) @PermissionKeys("agent/staff:manage")
  resend(@Req() r: R, @Param("id") id: string, @Body() b: B) { return this.id.resend(staffOf(r), invitationId(id), parseInput(IdentityInput.resend, b ?? {})); }   // no body at all is {} (review m2)

  @Post("staff/invitations/:id/revoke") @HttpCode(200) @PermissionKeys("agent/staff:manage")
  revoke(@Req() r: R, @Param("id") id: string) { return this.id.revoke(staffOf(r), id); }

  @Patch("staff/:id/roles") @PermissionKeys("agent/role:assign")
  roles(@Req() r: R, @Param("id") id: string, @Body() b: B) { return this.id.changeRoles(staffOf(r), staffId(id), parseInput(IdentityInput.roles, b)); }

  @Post("staff/:id/deactivate") @HttpCode(200) @PermissionKeys("agent/staff:manage")
  deactivate(@Req() r: R, @Param("id") id: string, @Body() b: B) { return this.id.deactivate(staffOf(r), staffId(id), parseInput(IdentityInput.reason, b)); }

  @Post("staff/:id/reactivate") @HttpCode(200) @PermissionKeys("agent/staff:manage")
  reactivate(@Req() r: R, @Param("id") id: string, @Body() b: B) { return this.id.reactivate(staffOf(r), staffId(id), parseInput(IdentityInput.reason, b)); }

  /** A licence record: a person's own without a key; anyone's with agent/firm-credential:manage (checked in the service). */
  @Put("staff/:id/credential") @AnyStaff("a person's own licence record; another's needs agent/firm-credential:manage")
  credential(@Req() r: R, @Param("id") id: string, @Body() b: B) { return this.id.saveCredential(staffOf(r), staffId(id), parseInput(IdentityInput.credential, b)); }
}
