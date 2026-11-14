// PF-4 (contracts §1.2, §7): staff sign-in, roles and permission keys behind IdentityPort; the one guard of
// /api/platform/* and /api/front-office/* (APP_GUARD, after core.ts's own) and its routes.
import { APP_GUARD } from "@nestjs/core";
import type { Feature } from "../features.ts";
import { PlatformGuard } from "../platform/identity/guard.ts";
import { PlatformClock } from "../platform/identity/port.ts";
import { PlatformIdentityController } from "../platform/identity/routes.ts";
import { IDENTITY_PORT, PlatformIdentity, identityPortFromConfig } from "../platform/identity/service.ts";
export default {
  controllers: [PlatformIdentityController],
  providers: [PlatformClock, { provide: IDENTITY_PORT, useFactory: identityPortFromConfig, inject: [PlatformClock] }, PlatformIdentity, PlatformGuard, { provide: APP_GUARD, useExisting: PlatformGuard }],
} satisfies Feature;
