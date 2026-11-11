# Encrypted PDF fixtures (W01-T03)

Generated ONCE with qpdf 12.3.2 (an implementation independent of this package) from a hand-written
builder PDF. They are committed; tests never run qpdf. Regenerating changes `/ID`, `/U` and the file key,
so after regenerating update `src/pdf/security/__tests__/vectors.ts` from the commands below.

| File | Encryption | Object streams | Used for |
|---|---|---|---|
| `aesv2-sample.pdf` | V4/R4 AESV2, empty user password | yes | decryption (A1), tampered `/U`, `/R 6` |
| `aesv2-cleartext-metadata.pdf` | as above plus `/EncryptMetadata false` | yes | 0xFFFFFFFF key suffix, cleartext `/Metadata` |
| `rc4-sample.pdf` | V2/R3 RC4-128 | no | `UNSUPPORTED_SECURITY` (A2) |

`build-pdf.ts` and `build-encrypted-pdf.ts` are test-only PDF assemblers, not fixtures.

## Regeneration

Builder PDF (`builder.pdf`, written to a temp dir OUTSIDE the repo; python3):

```python
import zlib
flate = zlib.compress(b"FlatePlain: the quick brown fox jumps over the lazy dog. 0123456789 " * 3)
objs = {}
objs[1] = b"<</Type/Catalog/Pages 2 0 R/Custom 4 0 R/Metadata 7 0 R/Streams[5 0 R 6 0 R]>>"
objs[2] = b"<</Type/Pages/Kids[3 0 R]/Count 1>>"
objs[3] = b"<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]/Resources<<>>>>"
objs[4] = b"<</Marker(Literal secret string in a dictionary)/Hex<486578206d61726b6572>>>"
objs[5] = b"<</Filter/FlateDecode/Note(String in a stream dictionary)/Length %d>>\nstream\n" % len(flate) + flate + b"\nendstream"
raw = b"RawPlain: an unfiltered stream body."
objs[6] = b"<</Length %d>>\nstream\n" % len(raw) + raw + b"\nendstream"
meta=b"<x:xmpmeta>Metadata plaintext</x:xmpmeta>"
objs[7]=b"<</Type/Metadata/Subtype/XML/Length %d>>\nstream\n"%len(meta)+meta+b"\nendstream"
out = bytearray(b"%PDF-1.7\n%\xe2\xe3\xcf\xd3\n"); offs={}
for n,b in objs.items():
    offs[n]=len(out); out += b"%d 0 obj\n"%n + b + b"\nendobj\n"
x=len(out); out += b"xref\n0 8\n0000000000 65535 f \n"
for n in range(1,8): out += b"%010d 00000 n \n"%offs[n]
out += b"trailer\n<</Size 8/Root 1 0 R>>\nstartxref\n%d\n%%%%EOF\n"%x
open("builder.pdf","wb").write(out)
```

```bash
qpdf --object-streams=generate --stream-data=preserve --encrypt "" owner-test 128 --use-aes=y -- builder.pdf aesv2-sample.pdf
qpdf --object-streams=generate --stream-data=preserve --encrypt "" owner-test 128 --use-aes=y --cleartext-metadata -- builder.pdf aesv2-cleartext-metadata.pdf
qpdf --allow-weak-crypto --object-streams=disable --stream-data=preserve --encrypt "" owner-test 128 --use-aes=n -- builder.pdf rc4-sample.pdf
# vectors for vectors.ts:
qpdf --show-encryption --show-encryption-key aesv2-sample.pdf          # file key
strings -a aesv2-sample.pdf | grep -E '/U <|/ID \['                    # /U and /ID (also /O, /P)
```

`--stream-data=preserve` keeps object 5 Flate and object 6 unfiltered; objects 1-4 become members of an
object stream. Object numbers differ from the builder after qpdf renumbers; tests find objects by content.

## Known plaintexts (builder objects; read back through `/Root`)

| Where | Plaintext |
|---|---|
| `/Root /Custom /Marker` (literal string, inside the object stream) | `Literal secret string in a dictionary` |
| `/Root /Custom /Hex` (hex string, inside the object stream) | `Hex marker` |
| Flate stream, dictionary `/Note` (string in a top-level stream dictionary) | `String in a stream dictionary` |
| Flate stream, decoded | `FlatePlain: the quick brown fox jumps over the lazy dog. 0123456789 ` repeated 3 times |
| Unfiltered stream | `RawPlain: an unfiltered stream body.` |
| `/Metadata` stream | `<x:xmpmeta>Metadata plaintext</x:xmpmeta>` |

## Documented deviations from strict ISO 32000-1 §7.6

- A ciphertext of exactly 16 bytes (an IV with no data block) decrypts to zero bytes instead of being rejected. Acrobat-written signature dictionaries carry such strings (`/Reference [...] /DigestValue`); qpdf reads them as empty. Lengths 1–15, 17–31 and non-multiples of 16 remain `MALFORMED`.
- Streams using `/Filter /Crypt` (§7.6.5) are rejected with `UNSUPPORTED_SECURITY`, including an Acrobat `/Metadata` stream using `/Crypt /Identity`.
- The `Contents` string of a signature dictionary (`/Type /Sig`, `/Type /DocTimeStamp`, or any dictionary with `/ByteRange`) is never decrypted (§7.6.1).

# Form-data fixtures (W02-T07, owner decision O-2)

`form-data/<form code>.synthetic.json` holds FICTITIOUS values for one corpus form, keyed by the SOM path (from the root
subform) of the field each fills. An agent wrote them by reading the form's own validators (`validateForm`, `val`, `util`,
`utilDates`) and running Validate until it completed; no real person, no real client data, no PDF other than the two blank
corpus forms was opened. Free text starts with `TEST` (family name `TESTPERSON`), addresses are invented, the e-mail is on
`example.com`, the telephone number is on 555, the passport number is `TEST12345`; everything else is a code from the form's own
lists. `src/__tests__/form-data-fixtures.test.ts` fails on any value that is not obviously fake.

`form-data/<form code>.pack.json` is the form's Pack descriptor: the node names the engine needs (Validate button, validated
flag, first-missing-field variable, barcode container) as data. The engine names no form.

`form-data/apply.ts` fills a loaded form like a user: `setValue`, a click for a check box switched on (only a field whose widget is a
check button is clicked), and `exit` (on the selected radio button for an exclusion group), because the forms build dependent
lists and derived fields (a province's city list, the age) from those events. Radio buttons are not clicked: their handlers
reach members the engine does not model. Fixture values assume the
injected clock lies between 2026 and 2030: some dates must be "today or later" (stays, employment) and the passport must not have
expired. Hand-edit a value only after running the form's Validate on it (`pnpm test:corpus`).
