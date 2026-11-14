// PF-4 routes (contracts §1.2 API as changed by §7). Each declares its access (keys.ts); the platform guard does the rest.
// Accepting an invitation is PF-4b's (POST /api/public/invitations/:token/accept), as is the step-up route.
import { Body, Controller, Get, HttpCode, Inject, Param, Patch, Post, Put, Req } from "@nestjs/common";
import { AnyStaff, PermissionKeys, StaffSignIn, staffOf, type StaffContext } from "./keys.ts";
import { PlatformIdentity } from "./service.ts";

type R = { platform?: StaffContext };
type B = Record<string, unknown>;

@Controller("api/platform")
export class PlatformIdentityController {
  constructor(@Inject(PlatformIdentity) private readonly id: PlatformIdentity) {}

  /** The local stand-in's sign-in: refused unless PLATFORM_IDENTITY=local (which is refused in test and production). */
  @Post("session/local") @HttpCode(200) @StaffSignIn("the sign-in door: there is no session yet")
  local(@Body() b: B) { return this.id.localSignIn(b ?? {}); }

  /** Who am I: roles, permission keys and the duties derived from them (represent, case, firm_admin). */
  @Get("me") @AnyStaff("a person's own identity")
  me(@Req() r: R) { return this.id.me(staffOf(r)); }

  @Post("staff/invitations") @PermissionKeys("agent/staff:manage")
  invite(@Req() r: R, @Body() b: B) { return this.id.invite(staffOf(r), b ?? {}); }

  @Get("staff/invitations") @PermissionKeys("agent/staff:manage")
  invitations(@Req() r: R) { return this.id.invitations(staffOf(r)); }

  @Post("staff/invitations/:id/resend") @HttpCode(200) @PermissionKeys("agent/staff:manage")
  resend(@Req() r: R, @Param("id") id: string) { return this.id.resend(staffOf(r), id); }

  @Post("staff/invitations/:id/revoke") @HttpCode(200) @PermissionKeys("agent/staff:manage")
  revoke(@Req() r: R, @Param("id") id: string) { return this.id.revoke(staffOf(r), id); }

  @Patch("staff/:id/roles") @PermissionKeys("agent/role:assign")
  roles(@Req() r: R, @Param("id") id: string, @Body() b: B) { return this.id.changeRoles(staffOf(r), id, b ?? {}); }

  @Post("staff/:id/deactivate") @HttpCode(200) @PermissionKeys("agent/staff:manage")
  deactivate(@Req() r: R, @Param("id") id: string, @Body() b: B) { return this.id.deactivate(staffOf(r), id, b ?? {}); }

  @Post("staff/:id/reactivate") @HttpCode(200) @PermissionKeys("agent/staff:manage")
  reactivate(@Req() r: R, @Param("id") id: string, @Body() b: B) { return this.id.reactivate(staffOf(r), id, b ?? {}); }

  /** A licence record: a person's own without a key; anyone's with agent/firm-credential:manage (checked in the service). */
  @Put("staff/:id/credential") @AnyStaff("a person's own licence record; another's needs agent/firm-credential:manage")
  credential(@Req() r: R, @Param("id") id: string, @Body() b: B) { return this.id.saveCredential(staffOf(r), id, b ?? {}); }
}
