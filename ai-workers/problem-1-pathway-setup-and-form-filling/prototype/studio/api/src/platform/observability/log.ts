// PF-23 (NFR5-14: "structured JSON logs with correlationId + tenantId + PII redaction at the logger"; BR-16): the one
// logger. NestJS's ConsoleLogger in its JSON mode, behind LogPort, so every line the server writes is one JSON object:
//   { time, level, event, correlationId (in a request), firmId (when the request's StaffContext names one), …fields }
// and every field passes the redaction step (redact.ts) first. Nest's own messages, the app's console calls (hook.ts)
// and the request lines all come here. Metric and alert lines (metrics.ts) are written here too, as CloudWatch's
// embedded metric format, so one log stream carries both. Never throws: a line that cannot be written becomes a
// short "log_failed" line.
import { AsyncLocalStorage } from "node:async_hooks";
import { ConsoleLogger, type LogLevel } from "@nestjs/common";
import { framesOf, redact, redactText, safeError } from "./redact.ts";

export type Fields = Record<string, unknown>;
export type Level = "info" | "warn" | "error" | "debug";

export interface LogPort {
  info(event: string, fields?: Fields): void;
  warn(event: string, fields?: Fields): void;
  /** `err` is reduced to its class, code and frames (never its message). */
  error(event: string, err?: unknown, fields?: Fields): void;
}

/** Where lines go: standard output and error by default; a test passes a capturing sink. */
export type Sink = (line: string, stream: "stdout" | "stderr") => void;
export const stdSink: Sink = (line, stream) => { process[stream].write(`${line}\n`); };

/** What a request contributes to every line written while it runs (hook.ts sets it). */
export type RequestScope = { correlationId: string; firmId: () => string | undefined };
export const requestScope = new AsyncLocalStorage<RequestScope>();

const OWN = new Set(["time", "level", "event", "correlationId", "firmId"]);

export class JsonLog extends ConsoleLogger {
  constructor(private readonly sink: Sink = stdSink, nestLevels: LogLevel[] = ["error", "warn"]) {
    super({ json: true, colors: false, compact: true, logLevels: nestLevels });
  }

  /** One structured line; fields are redacted, the line's own keys (time, level, correlation, firm) are never overwritten. */
  write(level: Level, event: string, fields: Fields = {}) {
    try {
      const safe = redact(fields) as Fields;
      for (const k of OWN) delete safe[k];
      this.emit({ ...this.stamp(level, event), ...safe });
    } catch { this.fallback(level, event); }
  }

  /** A line built by this module's own code from ids, route patterns and numbers (metric and alert lines): written as
   *  it is, with the line's own keys added. Callers outside observability use write(). */
  trusted(level: Level, event: string, obj: Fields) {
    try { const st = this.stamp(level, event); this.emit({ ...st, ...obj, ...st }); } catch { this.fallback(level, event); } // the line's own keys first and never overwritten
  }

  // Nest's JSON mode calls this for its own messages (and for ConsoleLogger's log/error/warn with Nest's arguments).
  protected override printAsJson(message: unknown, o: { context?: string; logLevel: LogLevel; writeStreamType?: "stdout" | "stderr"; errorStack?: unknown }) {
    const level: Level = o.logLevel === "error" || o.logLevel === "fatal" ? "error" : o.logLevel === "warn" ? "warn" : o.logLevel === "debug" || o.logLevel === "verbose" ? "debug" : "info";
    const fields: Fields = { context: typeof o.context === "string" ? redactText(o.context) : undefined };
    if (message instanceof Error) fields.error = safeError(message);
    // An error message with a stack is usually the error's own message, which can quote any value: frames only.
    else if (level === "error" && o.errorStack !== undefined) fields.message = "[not logged: an error's message]";
    else fields.message = message;
    if (o.errorStack !== undefined) fields.frames = framesOf(o.errorStack);
    this.write(level, "nest", fields);
  }

  private stamp(level: Level, event: string): Fields {
    const scope = requestScope.getStore();
    let firmId: string | undefined;
    try { firmId = scope?.firmId(); } catch { firmId = undefined; }
    return { time: new Date().toISOString(), level, event: /^[a-z][a-z0-9_]{0,60}$/.test(event) ? event : "message", ...(scope ? { correlationId: scope.correlationId } : {}), ...(firmId ? { firmId } : {}) };
  }

  private emit(obj: Fields) {
    const level = obj.level;
    this.sink(JSON.stringify(obj), level === "error" || level === "warn" ? "stderr" : "stdout");
  }

  private fallback(level: Level, event: string) {
    try { this.sink(JSON.stringify({ time: new Date().toISOString(), level, event: "log_failed", for: /^[a-z][a-z0-9_]{0,60}$/.test(event) ? event : "message" }), "stderr"); } catch { /* nowhere left to write */ }
  }
}

let current = new JsonLog();
/** The process's logger (hook.ts installs the server's; a test may install a capturing one). */
export const log = (): JsonLog => current;
export function useLog(l: JsonLog): JsonLog { const was = current; current = l; return was; }

/** LogPort for the app's own code: lines go to the process's logger, redacted. */
export const logPort: LogPort = {
  info: (event, fields) => current.write("info", event, fields),
  warn: (event, fields) => current.write("warn", event, fields),
  error: (event, err, fields) => current.write("error", event, { ...fields, ...(err !== undefined ? { error: safeError(err) } : {}) }),
};
