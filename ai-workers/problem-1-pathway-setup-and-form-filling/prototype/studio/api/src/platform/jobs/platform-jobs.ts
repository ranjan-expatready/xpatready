// PF-14: the one job runner of the app. A Nest provider: other modules inject `PlatformJobs` (a JobPort) and register
// their handlers in onModuleInit with `jobs.handle(name, fn)`; the worker starts once the app has started
// (onApplicationBootstrap, after every onModuleInit) and stops cleanly when the app closes (app.close(), or SIGTERM /
// SIGINT: stop.sh sends SIGTERM). On stop, no new job is fetched, a running handler gets up to 8 s to finish (STOP_LIMIT_MS; restart-api.sh and isolated.sh wait 10 s), and the
// pool closes; then the signal's default action (exit) runs as before.
import { Injectable, type OnApplicationBootstrap, type OnApplicationShutdown } from "@nestjs/common";
import type { JobHandler, JobOptions, JobPayload, JobPort } from "../../../../ports/jobs.ts";
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

  handle(name: string, handler: JobHandler) { return this.runner.handle(name, handler); }
  enqueue(name: string, payload: JobPayload, opts: JobOptions) { return this.runner.enqueue(name, payload, opts); }
  schedule(name: string, at: Date, payload: JobPayload, opts: JobOptions) { return this.runner.schedule(name, at, payload, opts); }
  cancel(key: string) { return this.runner.cancel(key); }
  recurring(name: string, cron: string, zone: string) { return this.runner.recurring(name, cron, zone); }
  deadLetters(limit?: number): Promise<DeadLetter[]> { return this.runner.deadLetters(limit); }
}
