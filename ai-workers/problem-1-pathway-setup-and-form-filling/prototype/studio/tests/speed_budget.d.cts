// Types for speed_budget.cjs (P-184), so the TypeScript checks that use it type-check.
export interface Machine { load: number; cores: number; busy: boolean }
export function machine(): Machine;
export function speed(label: string, within: unknown, detail: unknown, env?: Machine): { label: string; ok: boolean; detail: string };
