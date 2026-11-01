// Types for speed_budget.cjs (P-184), so the TypeScript checks that use it type-check.
/** reason: why a busy machine is not judged when it is not the load (a GitHub-hosted CI machine). */
export interface Machine { load: number; cores: number; busy: boolean; reason?: string }
export function machine(env?: Record<string, string | undefined>): Machine;
export function speed(label: string, within: unknown, detail: unknown, env?: Machine): { label: string; ok: boolean; detail: string };
