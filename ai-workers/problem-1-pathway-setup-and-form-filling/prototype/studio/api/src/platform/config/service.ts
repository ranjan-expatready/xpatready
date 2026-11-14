// PF-24: the Nest provider other platform and front-office services inject to read the configuration and get the secret
// box. Registered by api/src/features/platform-config.ts, which also reads the configuration at start-up, so a missing
// required setting stops the server before it listens.
import { Injectable } from "@nestjs/common";
import { SecretRefused, type SecretBoxPort } from "../../../../ports/secret-box.ts";
import { aesGcmSecretBox } from "../secret-box/aes-gcm.ts";
import { platformConfig, type PlatformConfig } from "./settings.ts";

@Injectable()
export class PlatformConfigService {
  readonly config: PlatformConfig = platformConfig();
  private box: SecretBoxPort | null = null;

  /** The secret box; refused (NOT_CONFIGURED) on a local server with no key ring, saying which settings to supply. */
  secretBox(): SecretBoxPort {
    const ring = this.config.secretBox;
    if (!ring) throw new SecretRefused("NOT_CONFIGURED", "No secret-box key on this server: set PLATFORM_SECRET_BOX_KEYS and PLATFORM_SECRET_BOX_KEY_VERSION (deploy/RUNBOOK-secrets.md).");
    return (this.box ??= aesGcmSecretBox(ring));
  }
}
