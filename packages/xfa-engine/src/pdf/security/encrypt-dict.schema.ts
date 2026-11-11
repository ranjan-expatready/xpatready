import { z } from 'zod';
import { XfaPdfError } from '../errors.js';
import { safeText } from '../safe-text.js';
import { isPdfName, isPdfRef, isPdfString, type PdfDict, type PdfValue } from '../types.js';

const bytes32 = z.instanceof(Uint8Array).refine((b) => b.length === 32);

/**
 * The only /Encrypt dictionary this engine decrypts: Standard handler V4/R4, 128-bit, AESV2 for both
 * streams, strings and embedded files (ISO 32000-1 §7.6.5). Anything else that changes how bytes are protected
 * (another crypt filter, a different /EFF) is rejected rather than half-supported. Unknown top-level keys are
 * tolerated: they do not alter decryption and producers add private ones.
 */
export const encryptDictSchema = z.looseObject({
  Filter: z.literal('Standard'),
  V: z.literal(4),
  R: z.literal(4),
  Length: z.literal(128).default(128),
  // Strict: a second crypt filter next to StdCF is never silently ignored (it could be what some streams use).
  CF: z.strictObject({
    StdCF: z.object({
      CFM: z.literal('AESV2'),
      Length: z.union([z.literal(16), z.literal(128)]).optional(),
    }),
  }),
  StmF: z.literal('StdCF'),
  StrF: z.literal('StdCF'),
  // Embedded-file streams (the XFA packets of a real form are /Type /EmbeddedFile). Absent means StmF.
  EFF: z.literal('StdCF').optional(),
  O: bytes32,
  U: bytes32,
  // Signed 32-bit by spec; some producers write the unsigned form of the same bits.
  P: z.number().int().min(-2147483648).max(4294967295),
  EncryptMetadata: z.boolean().default(true),
});

export type EncryptDict = z.infer<typeof encryptDictSchema>;

/** Names become strings, strings become bytes, dictionaries plain objects; references stay unresolvable on purpose. */
function normalise(v: PdfValue): unknown {
  if (isPdfName(v)) return v.value;
  if (isPdfString(v)) return v.bytes;
  if (isPdfRef(v)) return undefined;
  if (Array.isArray(v)) return v.map(normalise);
  if (v instanceof Map) return Object.fromEntries([...v].map(([k, e]) => [k, normalise(e)]));
  return v;
}

/** Validates a raw /Encrypt dictionary. Failure is UNSUPPORTED_SECURITY naming the key, never its value. */
export function parseEncryptDict(dict: PdfDict): EncryptDict {
  const parsed = encryptDictSchema.safeParse(normalise(dict));
  if (parsed.success) return parsed.data;
  const path = parsed.error.issues[0]?.path.map(String).join('.') ?? '';
  throw new XfaPdfError('UNSUPPORTED_SECURITY', `Unsupported or invalid /Encrypt dictionary: key /${safeText(path || 'Encrypt')}`);
}
