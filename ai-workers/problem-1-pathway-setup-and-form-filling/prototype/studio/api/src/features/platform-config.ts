// PF-24: the platform configuration and secret box. Reading the configuration here, when main.ts loads the feature files
// (before Nest starts or the port opens), makes a missing or invalid required setting stop the start-up with its name
// and never its value (config/settings.ts ConfigRefused). No route: nothing here is ever returned to a screen.
import type { Feature } from "../features.ts";
import { PlatformConfigService } from "../platform/config/service.ts";
import { platformConfig } from "../platform/config/settings.ts";

platformConfig();

export default { providers: [PlatformConfigService] } satisfies Feature;
