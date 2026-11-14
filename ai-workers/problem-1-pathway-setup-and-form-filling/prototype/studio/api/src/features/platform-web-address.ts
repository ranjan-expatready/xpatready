// PF-25: each firm's own web address — host routing for <address>.expatready.com and <address>.localhost, and the public
// availability and suggestion routes (api/src/platform/web-address/).
import type { Feature } from "../features.ts";
import { WebAddressController, WebAddressHostRouting, webAddressesProvider } from "../platform/web-address/routes.ts";
export default { controllers: [WebAddressController], providers: [webAddressesProvider, WebAddressHostRouting] } satisfies Feature;
