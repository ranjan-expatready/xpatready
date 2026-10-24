// The portal capture record's identity and its "no answer" check (P-66), shared by the Studio (studio/engine/capture.ts)
// and the guarded drafting path (p2/guard.ts admits an approved screen inventory only when its fingerprint is this one).
// Pure functions; reads only the capture contract next to this file.
import { Ajv } from "ajv";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { canonical, sha256 } from "./rules.ts";

export type CaptureOption = { code: string; label: string };
export type CaptureInput = { id: string; label: string; type: string; required: boolean; order: number; group?: string; part?: "YYYY" | "MM" | "DD"; help?: string; max_length?: number; min_length?: number; pattern?: string; options?: CaptureOption[] };
export type CaptureScreen = { key: string; order: number; title: string; source: { way: string; file: string; sha256: string }; inputs: CaptureInput[] };
export type CaptureRecord = { contract: "portal-capture/v1"; portal: string; form: string; title: string; application_type?: string | null; way: string; screens: CaptureScreen[] };

const check = new Ajv({ allErrors: true, strict: false }).compile(JSON.parse(readFileSync(join(import.meta.dirname, "portal-capture.v1.schema.json"), "utf8")));
/** The contract's own errors (shape only); empty when the record meets it. */
export function captureSchemaErrors(r: unknown) { return check(r) ? [] : [...(check.errors ?? [])]; }

const ANSWER_KEYS = new Set(["value", "values", "answer", "answers", "selected", "checked", "default", "default_value", "entered"]);
/** Every place a record carries something that looks like an answer (defence in depth beside the contract). */
export function noAnswers(x: unknown, path = ""): string[] {
  if (Array.isArray(x)) return x.flatMap((v, i) => noAnswers(v, `${path}[${i}]`));
  if (!x || typeof x !== "object") return [];
  return Object.entries(x).flatMap(([k, v]) => (ANSWER_KEYS.has(k.toLowerCase()) ? [`${path}.${k}`] : noAnswers(v, `${path}.${k}`)));
}

const norm = (s: string | undefined) => (s ?? "").replace(/\s+/g, " ").trim();
type Json = Parameters<typeof canonical>[0];
/** What the fingerprint covers: the structure a person fills, in order. Not the source files, ways or dates. */
export function structure(r: CaptureRecord): Json {
  return { portal: r.portal, form: r.form, screens: [...r.screens].sort((a, b) => a.order - b.order).map((s) => ({ title: norm(s.title), inputs: [...s.inputs].sort((a, b) => a.order - b.order).map((i) => ({
    id: i.id, label: norm(i.label), type: i.type, required: i.required, group: norm(i.group) || null, part: i.part ?? null, help: norm(i.help) || null, max_length: i.max_length ?? null, pattern: i.pattern ?? null,
    ...(i.min_length != null ? { min_length: i.min_length } : {}), options: (i.options ?? []).map((o) => [o.code, norm(o.label)]) })) })) };
}
export const fingerprint = (r: CaptureRecord) => sha256(canonical(structure(r)));
