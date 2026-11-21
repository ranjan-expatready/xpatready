// PF-4b routes: the session (platform guard; each declares its access, keys.ts) and the public invitation door (open
// on core.ts's read guard; a 256-bit token is the only key; never cached, never sent on as a referrer).
import { Body, Controller, Get, Header, HttpCode, Inject, Param, Post, Req } from "@nestjs/common";
import { z } from "zod";
import { OpenRead } from "../../../core.ts";
import { parseInput, strict } from "../../http/input.ts";
import { AnyStaff, PermissionKeys, StaffSignIn, staffOf, type StaffContext } from "../keys.ts";
import { PlatformSession } from "./service.ts";

type R = { platform?: StaffContext };
/** PF-28 part 2a (R1.10): the sign-in code, through the one input rule (an unknown field, a wrong type or no code: 422). */
export const CallbackInput = strict({ code: z.string() });   // its length is the service's check: an over-long code is "used or expired" (review m4); the body limit bounds it

@Controller("api/platform")
export class PlatformSessionController {
  constructor(@Inject(PlatformSession) private readonly s: PlatformSession) {}
  @Post("session/callback") @HttpCode(200) @Header("Cache-Control", "no-store") @StaffSignIn("the sign-in code is the proof: there is no session yet")
  callback(@Body() b: unknown) { return this.s.callback(parseInput(CallbackInput, b).code); }
  @Post("session/sign-out") @HttpCode(200) @AnyStaff("a person ends their own session")
  signOut(@Req() r: R) { return this.s.signOut(staffOf(r)); }
  @Post("staff/:id/sign-out-everywhere") @HttpCode(200) @PermissionKeys("agent/staff:manage")
  signOutEverywhere(@Req() r: R, @Param("id") id: string) { return this.s.signOutEverywhere(staffOf(r), id); }
  @Post("staff/:id/reset-two-step") @HttpCode(200) @PermissionKeys("agent/staff:manage")
  resetTwoStep(@Req() r: R, @Param("id") id: string) { return this.s.resetTwoStep(staffOf(r), id); }
}

@OpenRead("the invitation link itself: the token is the only key (PF-4b, BR-4)")
@Controller("api/public/invitations")
export class PublicInvitationController {
  constructor(@Inject(PlatformSession) private readonly s: PlatformSession) {}
  @Get(":token") @Header("Cache-Control", "no-store") @Header("Referrer-Policy", "no-referrer")
  state(@Param("token") token: string) { return this.s.invitationState(token); }
  @Post(":token/accept") @HttpCode(200) @Header("Cache-Control", "no-store") @Header("Referrer-Policy", "no-referrer")
  accept(@Param("token") token: string) { return this.s.accept(token); }
}
