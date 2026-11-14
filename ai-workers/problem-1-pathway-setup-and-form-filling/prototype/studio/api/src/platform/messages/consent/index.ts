// PF-19a: the consent store the API uses. CONSENT_PORT is its Nest token (api/src/features/platform-consent.ts); code
// outside Nest (seeds, tests, jobs) imports `consentStore`. Audit goes to audit_event through PF-0p's interim adapter
// (AUD-1 swaps the adapter behind the port; nothing here changes).
import { auditEvent } from "../../audit/audit-event.ts";
import { ConsentStore } from "./consent-store.ts";

export const CONSENT_PORT = Symbol.for("platform.ConsentPort");
export const consentStore = new ConsentStore(auditEvent);
export { ConsentStore };
