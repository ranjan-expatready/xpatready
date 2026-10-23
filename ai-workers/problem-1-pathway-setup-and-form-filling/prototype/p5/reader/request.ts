// The one request builder of the reader path. Deterministic: the same template, document-type profiles, claimed
// kind and document give the same request bytes. Maker-written text: the template and the profiles (fact ids and the
// release's own meanings), both screened. The document goes first, then the instruction (Anthropic vision guidance:
// images before text).
import { createHash } from "node:crypto";
import type { AdmittedDoc } from "./guard.ts";

export type ReaderJob = {
  job_id: string; template: string; output_schema: string;
  settings: { provider_route: string; model: string; max_attempts: number; budget_usd: number; max_output_tokens: number; timeout_ms: number; effort: string };
  trials: { id: string; file: string; sha256: string; claimed_type: string }[];
};
export type ReaderRequest = { content: any[]; text: string; output_schema: Record<string, unknown> };

export function instruction(template: string, docTypes: any, claimed: string): string {
  const kinds = Object.entries(docTypes.kinds as Record<string, any>).filter(([k]) => claimed === "unknown" || k === claimed);
  const facts = kinds.map(([k, v]) => `- ${k} (${v.label}):\n${v.facts.map((f: any) => `  - ${f.fact}: ${f.meaning} [about: ${f.about}]`).join("\n")}`).join("\n");
  const formats = Object.entries(docTypes.formats as Record<string, string>).map(([k, v]) => `${k}: ${v}`).join("; ");
  return template.replace("{{CLAIMED}}", claimed === "unknown" ? "not stated (classify it)" : claimed).replace("{{FORMATS}}", formats).replace("{{FACTS}}", facts);
}

export function buildReaderRequest(template: string, schema: Record<string, unknown>, docTypes: any, claimed: string, doc: AdmittedDoc): ReaderRequest {
  const data = doc.bytes.toString("base64");
  const block = doc.media_type === "application/pdf"
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data } }
    : { type: "image", source: { type: "base64", media_type: doc.media_type, data } };
  const text = instruction(template, docTypes, claimed);
  return { content: [block, { type: "text", text }], text, output_schema: schema };
}

export const readerRequestSha = (r: ReaderRequest) => createHash("sha256").update(JSON.stringify(r)).digest("hex");
