// C1.3 + C11.5 (P-106, SI-10): GET /runtime/cases/:id/employer-cases, POST /runtime/cases/:id/employer-link.
import type { Feature } from "../features.ts";
import { EmployerLinks, EmployerLinksController } from "../employer-link.ts";
export default { controllers: [EmployerLinksController], providers: [EmployerLinks] } satisfies Feature;
