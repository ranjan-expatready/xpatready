// PF-19a: the consent store (ConsentPort, ports/consent.ts), injectable as CONSENT_PORT. No route: FO-2 records consent at
// capture and PF-19b asks the gate at send time, both through the port.
import type { Feature } from "../features.ts";
import { CONSENT_PORT, consentStore } from "../platform/messages/consent/index.ts";
export default { providers: [{ provide: CONSENT_PORT, useValue: consentStore }] } satisfies Feature;
