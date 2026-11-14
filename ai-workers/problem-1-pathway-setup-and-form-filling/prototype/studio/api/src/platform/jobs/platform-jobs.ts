// PF-14: the one job runner of the app. A Nest provider: other modules inject `PlatformJobs` (a JobPort) and register
// their handlers in onModuleInit with `jobs.handle(name, fn)`; the worker starts once the app has started
// (onApplicationBootstrap, after every onModuleInit) and stops cleanly when the app closes (app.close(), or SIGTERM /
// SIGINT: stop.sh sends SIGTERM). On stop, no new job is fetched, a running handler gets up to 10 s to finish, and the
// pool closes; then the signal's default action (exit) runs as before.
import { Injectable, type OnApplicationBootstrap, type OnApplicationShutdown } from "@nestjs/common";
import type { JobHandler, JobPort } from "../../../../ports/jobs.ts";
import { DATABASE_URL } from "../../core.ts";
import { PgBossJobs, type DeadLetter } from "./pgboss-jobs.ts";

const SIGNALS = ["SIGTERM", "SIGINT"] as const;

@Injectable()
export class PlatformJobs implements JobPort, OnApplicationBootstrap, OnApplicationShutdown {
  readonly runner = new PgBossJobs({ connectionString: DATABASE_URL });
  #onSignal = (signal: NodeJS.Signals) => {
    for (const s of SIGNALS) process.removeListener(s, this.#onSignal);
    void this.runner.stop().catch((e) => console.error(`jobs: stop: ${(e as Error).message}`)).finally(() => process.kill(process.pid, signal));
  };

  async onApplicationBootstrap() {
    await this.runner.start();
    for (const s of SIGNALS) process.once(s, this.#onSignal);
  }

  async onApplicationShutdown() {
    for (const s of SIGNALS) process.removeListener(s, this.#onSignal);
    await this.runner.stop();
  }

  handle<P>(name: string, handler: JobHandler<P>) { this.runner.handle(name, handler); }
  enqueue<P>(name: string, payload: P, opts: { key: string; firmId: string }) { return this.runner.enqueue(name, payload, opts); }
  schedule<P>(name: string, at: Date, payload: P, opts: { key: string; firmId: string }) { return this.runner.schedule(name, at, payload, opts); }
  cancel(key: string) { return this.runner.cancel(key); }
  recurring(name: string, cron: string, zone: string) { return this.runner.recurring(name, cron, zone); }
  deadLetters(limit?: number): Promise<DeadLetter[]> { return this.runner.deadLetters(limit); }
}
