// Types for tests/fixtures/source-every-number.cjs (G1 test scaffolding: answers every held number through the API).
type Call = (method: string, path: string, body?: unknown, actor?: string) => Promise<{ status: number; body: unknown }>;
export function sourceEveryNumber(api: number | string | Call, combinationId: string, mode?: { cite?: boolean; actor?: string }): Promise<{ written: number; numbers: number; held_back: number }>;
export function releaseThroughSteps(api: number | string | Call, combinationId: string, who?: { author: string; sme: string; approver: string }): Promise<{ version: number; pack: number; sha256: string; published: Record<string, number>; library: unknown[] }>;
