// PF-4 routes (contracts §1.2 API as changed by §7). Each declares its access (keys.ts); the platform guard does the rest.
// Accepting an invitation is PF-4b's (POST /api/public/invitations/:token/accept), as is the step-up route. Nest's
// decorators are applied as calls below the class (keys.ts says why); each route's line reads as its @ form would.
import { Body, Controller, Get, HttpCode, Inject, Param, Patch, Post, Put, Req } from "@nestjs/common";
import { AnyStaff, PermissionKeys, StaffSignIn, decorate, staffOf, type StaffContext } from "./keys.ts";
import { PlatformIdentity } from "./service.ts";

type R = { platform?: StaffContext };
type B = Record<string, unknown>;

export class PlatformIdentityController {
  constructor(private readonly id: PlatformIdentity) {}
  /** The local stand-in's sign-in: refused unless PLATFORM_IDENTITY=local (which is refused in test and production). */
  local(b: B) { return this.id.localSignIn(b ?? {}); }
  /** Who am I: roles, permission keys and the duties derived from them (represent, case, firm_admin). */
  me(r: R) { return this.id.me(staffOf(r)); }
  invite(r: R, b: B) { return this.id.invite(staffOf(r), b ?? {}); }
  invitations(r: R) { return this.id.invitations(staffOf(r)); }
  resend(r: R, id: string, b: B) { return this.id.resend(staffOf(r), id, b ?? {}); }
  revoke(r: R, id: string) { return this.id.revoke(staffOf(r), id); }
  roles(r: R, id: string, b: B) { return this.id.changeRoles(staffOf(r), id, b ?? {}); }
  deactivate(r: R, id: string, b: B) { return this.id.deactivate(staffOf(r), id, b ?? {}); }
  reactivate(r: R, id: string, b: B) { return this.id.reactivate(staffOf(r), id, b ?? {}); }
  /** A licence record: a person's own without a key; anyone's with agent/firm-credential:manage (checked in the service). */
  credential(r: R, id: string, b: B) { return this.id.saveCredential(staffOf(r), id, b ?? {}); }
}

const C = PlatformIdentityController;
Controller("api/platform")(C);
Inject(PlatformIdentity)(C, undefined, 0);
decorate(C, "local", [Post("session/local"), HttpCode(200), StaffSignIn("the sign-in door: there is no session yet")], [Body()]);
decorate(C, "me", [Get("me"), AnyStaff("a person's own identity")], [Req()]);
decorate(C, "invite", [Post("staff/invitations"), PermissionKeys("agent/staff:manage")], [Req(), Body()]);
decorate(C, "invitations", [Get("staff/invitations"), PermissionKeys("agent/staff:manage")], [Req()]);
decorate(C, "resend", [Post("staff/invitations/:id/resend"), HttpCode(200), PermissionKeys("agent/staff:manage")], [Req(), Param("id"), Body()]);
decorate(C, "revoke", [Post("staff/invitations/:id/revoke"), HttpCode(200), PermissionKeys("agent/staff:manage")], [Req(), Param("id")]);
decorate(C, "roles", [Patch("staff/:id/roles"), PermissionKeys("agent/role:assign")], [Req(), Param("id"), Body()]);
decorate(C, "deactivate", [Post("staff/:id/deactivate"), HttpCode(200), PermissionKeys("agent/staff:manage")], [Req(), Param("id"), Body()]);
decorate(C, "reactivate", [Post("staff/:id/reactivate"), HttpCode(200), PermissionKeys("agent/staff:manage")], [Req(), Param("id"), Body()]);
decorate(C, "credential", [Put("staff/:id/credential"), AnyStaff("a person's own licence record; another's needs agent/firm-credential:manage")], [Req(), Param("id"), Body()]);
