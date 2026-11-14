// PF-24: the real SecretBoxPort adapter (ports/secret-box.ts). AES-256-GCM by node:crypto, no new package.
//  * Key ring from the loader (PLATFORM_SECRET_BOX_KEYS, PLATFORM_SECRET_BOX_KEY_VERSION; config/settings.ts): new
//    values use the current version; older versions stay readable until the re-encrypt job (reencrypt.ts) has moved
//    every value and the engineer removes them (deploy/RUNBOOK-secrets.md).
//  * Each firm gets its own key, derived from the version's key by HKDF-SHA256 with the firm id: a value sealed for
//    firm A is decrypted with a key firm B's values never use. The owner (firm, person, purpose) and the version are also
//    the GCM additional data, so a value moved to another owner's row, or relabelled to another version, is refused.
//  * Stored as `sb1.v<version>.<iv>.<tag>.<ciphertext>` (base64url; 12-byte random iv, 16-byte tag).
// Until X-27 (per-firm KMS keys, NFR5-05) this key ring covers connection tokens; it is not for Restricted fields.
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { SecretOwner, SecretRefused, sealedVersion, type SecretBoxPort } from "../../../../ports/secret-box.ts";
import type { SecretBoxKeys } from "../config/settings.ts";

const SCHEME = "sb1", MAX_PLAIN = 8192;
const aad = (v: number, o: SecretOwner) => Buffer.from(JSON.stringify([SCHEME, v, o.firmId, o.personId ?? null, o.purpose]), "utf8");
const B64URL = /^[A-Za-z0-9_-]*$/;

export function aesGcmSecretBox(ring: SecretBoxKeys): SecretBoxPort {
  const masters = new Map<number, Buffer>();
  for (const [v, k] of ring.keys) {
    const b = Buffer.from(k.reveal(), "base64");
    if (b.length !== 32) throw new SecretRefused("NOT_CONFIGURED", `Secret-box key version ${v} is not 32 bytes.`);
    masters.set(v, b);
  }
  if (!masters.has(ring.current)) throw new SecretRefused("NOT_CONFIGURED", `Secret-box key version ${ring.current} is not in the key ring.`);
  const firmKey = (v: number, firmId: string) => {
    const m = masters.get(v);
    if (!m) throw new SecretRefused("KEY_RETIRED", `Key version ${v} is no longer held on this server; the value cannot be read.`);
    return Buffer.from(hkdfSync("sha256", m, Buffer.from(`expat-ready secret-box ${SCHEME}`), Buffer.from(`firm:${firmId}`), 32));
  };
  const owner = (o: SecretOwner) => {
    const r = SecretOwner.safeParse(o);
    if (!r.success) throw new SecretRefused("TAMPERED_OR_OTHER_OWNER", "The owner is not valid (firmId and purpose are required).");
    return r.data;
  };

  const box: SecretBoxPort = {
    currentVersion: () => ring.current,
    seal(o, plain) {
      const w = owner(o);
      if (typeof plain !== "string" || !plain.length || plain.length > MAX_PLAIN) throw new SecretRefused("NOT_SEALED", `A credential is 1 to ${MAX_PLAIN} characters.`);
      const v = ring.current, iv = randomBytes(12);
      const c = createCipheriv("aes-256-gcm", firmKey(v, w.firmId), iv, { authTagLength: 16 });
      c.setAAD(aad(v, w));
      const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
      return `${SCHEME}.v${v}.${iv.toString("base64url")}.${c.getAuthTag().toString("base64url")}.${ct.toString("base64url")}`;
    },
    open(o, sealed) {
      const w = owner(o);
      const parts = typeof sealed === "string" ? sealed.split(".") : [];
      if (parts.length !== 5 || parts[0] !== SCHEME || !parts.slice(2).every((p) => B64URL.test(p))) throw new SecretRefused("NOT_SEALED", "Not a value this secret box sealed.");
      const v = sealedVersion(sealed);
      const iv = Buffer.from(parts[2], "base64url"), tag = Buffer.from(parts[3], "base64url"), ct = Buffer.from(parts[4], "base64url");
      if (iv.length !== 12 || tag.length !== 16 || !ct.length) throw new SecretRefused("TAMPERED_OR_OTHER_OWNER", "The sealed value was changed or belongs to another owner.");
      const key = firmKey(v, w.firmId);
      try {
        const d = createDecipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
        d.setAAD(aad(v, w));
        d.setAuthTag(tag);
        return Buffer.concat([d.update(ct), d.final()]).toString("utf8");
      } catch {
        throw new SecretRefused("TAMPERED_OR_OTHER_OWNER", "The sealed value was changed or belongs to another owner.");
      }
    },
    versionOf: sealedVersion,
    reseal(o, sealed) {
      const plain = box.open(o, sealed);   // always opened first: a tampered value is refused, never passed on as current
      return sealedVersion(sealed) === ring.current ? sealed : box.seal(o, plain);
    },
  };
  return box;
}
