// Run by tests/check_p2_guard.ts inside a process started with isolatedNodeArgs(): tries to read each path
// given and prints, per path, "read" or the error code. Reads only; prints no file content.
import { readFileSync } from "node:fs";

const probe = (f: string) => { try { readFileSync(f); return "read"; } catch (e) { return (e as NodeJS.ErrnoException).code ?? "error"; } };
console.log(JSON.stringify(Object.fromEntries(process.argv.slice(2).map((f) => [f, probe(f)]))));
