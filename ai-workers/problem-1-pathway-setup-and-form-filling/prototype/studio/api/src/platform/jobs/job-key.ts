// PF-14: a job's key becomes its pg-boss id, so the same key can never queue a second job of the same name: the
// second insert meets the first row's primary key (pg-boss's job table is keyed (name, id); its insert is ON CONFLICT
// DO NOTHING and answers null). The id is a name-based UUID (RFC 9562 §5.5, version 5: SHA-1 of a fixed namespace and
// the key), so every process derives the same id from the same key with nothing stored.
import { createHash } from "node:crypto";

// Our own namespace (a random version-4 UUID chosen once for PF-14; never change it, or every key maps anew).
const NAMESPACE = "da985b69-dca5-4a1e-9e3e-b0d74eb7795b";
const nsBytes = Buffer.from(NAMESPACE.replace(/-/g, ""), "hex");

/** The job id of a key: the same key always gives the same id, two keys never (short of a SHA-1 collision). */
export function jobIdOf(key: string): string {
  const h = createHash("sha1").update(nsBytes).update(key, "utf8").digest();
  h[6] = (h[6] & 0x0f) | 0x50; // version 5
  h[8] = (h[8] & 0x3f) | 0x80; // RFC 9562 variant
  const x = h.subarray(0, 16).toString("hex");
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20, 32)}`;
}
