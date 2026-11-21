// PF-15 part 1a: plan limits. StorageWatch (api/src/platform/entitlements/storage.ts) measures each firm's storage, keeps
// its storage-over mark, sends the day-one emails and runs the daily measure on PF-14's runner. The seats limit is read
// by identity's seat check through PgEntitlements in its own transaction; the uploads go through EntitledFiles, bound in
// front-office-retainers.ts.
// PF-15c (brief PF-15.md "After part 2"): the case limits. Runtime.createCase checks the active individual or corporate
// cases through PgEntitlements made on its own transaction (in place of CS-C1b's allow-all fake); a firm with no live
// plan is refused with 409 PLAN_LIMIT_REACHED and its sentence, never a 500.
// PF-15 part 1b: PlanBookings (a booked move to another plan; SA-3-58..61) and its daily apply on PF-14's runner. PF-16's
// change-plan route calls it.
import type { Feature } from "../features.ts";
import { Db } from "../core.ts";
import { LocalFiles } from "../front-office/files.ts";
import { PgEntitlements } from "../platform/entitlements/limits.ts";
import { StorageWatch } from "../platform/entitlements/storage.ts";
import { PlanBookings } from "../platform/entitlements/plan-booking.ts";
import { PgCaseCount } from "../case-count.ts";
import { PlatformClock } from "../platform/identity/port.ts";
import { MAIL_PORT } from "../platform/identity/session/mail.ts";
import { PlatformJobs } from "../platform/jobs/platform-jobs.ts";
import { Runtime } from "../runtime.ts";
import type { MailPort } from "../../../ports/mail.ts";

/** PF-15c: the token of the provider that binds the case limits (resolved at start-up; holds nothing). */
export const CASE_LIMITS_BOUND = Symbol("CASE_LIMITS_BOUND");

export default {
  providers: [
    { provide: StorageWatch, useFactory: async (db: Db, clock: PlatformClock, mail: MailPort | undefined, jobs: PlatformJobs) => {
      const watch = new StorageWatch({ db, files: new LocalFiles(), mail: mail ?? null, now: () => clock.now() });
      await watch.register(jobs);
      return watch;
    }, inject: [Db, PlatformClock, { token: MAIL_PORT, optional: true }, PlatformJobs] },
    { provide: PlanBookings, useFactory: async (db: Db, clock: PlatformClock, jobs: PlatformJobs) => {
      const bookings = new PlanBookings({ db, now: () => clock.now(), files: new LocalFiles(), cases: (firmKey) => new PgCaseCount(db, firmKey) });
      await bookings.register(jobs);
      return bookings;
    }, inject: [Db, PlatformClock, PlatformJobs] },
    { provide: CASE_LIMITS_BOUND, useFactory: (runtime: Runtime, clock: PlatformClock) => {
      runtime.useEntitlements((tx) => new PgEntitlements(tx, () => clock.now()));
      return true;
    }, inject: [Runtime, PlatformClock] },
  ],
} satisfies Feature;
