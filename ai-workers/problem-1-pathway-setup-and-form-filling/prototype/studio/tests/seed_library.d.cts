// Types for tests/seed_library.cjs (test setup only: writes a library item as a source would; P-158).
type Sql = (q: string) => string;
export function seedField(sql: Sql, item: { key: string; meaning: string; valueType?: string; source?: string; actor?: string; review?: boolean }): string;
export function seedSection(sql: Sql, item: { title: string; meaning?: string | null; actor?: string; review?: boolean }): string;
export function seedAnswerList(sql: Sql, item: { key: string; label: string; values: { key: string; label: string }[]; actor?: string }): string;
