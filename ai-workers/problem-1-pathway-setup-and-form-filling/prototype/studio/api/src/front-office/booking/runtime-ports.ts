// FO-3: the ports the running app gives the booking service, until each real adapter is on main. Audit is real (PF-0p's
// interim AuditPort over audit_event); the clock is the system's. Interim, each named for the row that replaces it:
//   * jobs: PF-0p's fakeJobs on a clock that follows the system clock every 30 s (in-process; lost on restart) until
//     PF-14's pg-boss adapter;
//   * mail: PF-0p's fakeMail (kept in memory, nothing leaves the machine) until PF-4b's sending adapter;
//   * arrival: fakeArrival (people kept in memory) until FO-2 implements ArrivalPort in api/src/front-office/sales/.
import { fakeArrival } from "../../../../ports/arrival.ts";
import { FakeClock, systemClock } from "../../../../ports/clock.ts";
import { fakeJobs } from "../../../../ports/jobs.ts";
import { fakeMail } from "../../../../ports/mail.ts";
import { auditEvent } from "../../platform/audit/audit-event.ts";
import type { BookingPorts } from "./service.ts";

export function runtimeBookingPorts(): BookingPorts {
  const jobClock = new FakeClock(systemClock.now());
  setInterval(() => { void jobClock.set(systemClock.now()); }, 30_000).unref();
  return {
    audit: auditEvent, clock: systemClock, jobs: fakeJobs(jobClock), mail: fakeMail(), arrival: fakeArrival(),
    publicBaseUrl: process.env.STUDIO_PUBLIC_URL ?? `http://localhost:${process.env.STUDIO_PORT ?? 4400}`,
  };
}
