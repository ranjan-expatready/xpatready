import { describe, expect, it } from 'vitest';
import { formChecksum } from '../checksum.js';

const enc = (text: string): Uint8Array => new TextEncoder().encode(text);

/**
 * Golden values from an independent implementation of the same canonicalisation (a line-by-line port of the open-source
 * reader's SAX checksum), which reproduces the `checksum` attribute the viewer wrote on two real saved files. Each case
 * pins one rule of the canonical form: what is kept verbatim, what is converted, what whitespace is dropped.
 */
const GOLDEN: readonly (readonly [label: string, parts: readonly string[], expected: string])[] = [
  ['elements, an attribute and text', ['<a><b x="1">t</b></a>'], 'DdUEbP074abEFXVHbnu2Fq0y738='],
  [
    'the newline-before-">" style of a saved packet',
    ['<template xmlns="http://www.xfa.org/schema/xfa-template/2.8/"\n><subform name="form1"\n><field name="A"\n/></subform\n></template\n>'],
    'elK4s4/vHOJihv/M9Txm+RftdOY=',
  ],
  [
    'entities: quot and apos are converted, amp lt gt and numeric references are kept as written',
    ['<a t="&quot;q&quot; &apos;s&apos; &amp; &lt; &gt; &#65;">x &amp; y &lt; z &quot;w&quot; &apos;v&apos; &#x41; &gt;</a>'],
    'vOV4FGovbyR9THsdbqwRYI4lV0c=',
  ],
  ['whitespace-only text before a start tag is dropped, before an end tag it is kept', ['<a>\n  <b>  </b>\n  <c/>\n</a>\n'], 'evPn6Utq3ybqamZe2vtM9KVE8hE='],
  [
    'processing instructions and comments',
    ['<?xml version="1.0" encoding="UTF-8"?>\n<a><?templateDesigner expand 1?><!-- note - here --><b/></a>'],
    'FZTFMULUvPwr2I4dWar643GqjyA=',
  ],
  ['a CDATA section', ['<a><![CDATA[x < y && "z"]]></a>'], 'DVV+Tm2Y0Mz4m7mseLTvEFgV5Ec='],
  ['UTF-8 text outside ASCII', ['<a n="Zoë">名前 😀</a>'], 'Or0SRhCrv4J8FTZPqCRf4Hkw72c='],
  ["single-quoted attributes and spaces around '='", ["<a x='1' y = \"2\"/>"], 'CRmoZvebvRcdH1GJR1YLlm4zb7o='],
  [
    'two packets, template then datasets, into one digest',
    ['<template><subform name="f"/></template>', '<xfa:datasets xmlns:xfa="http://www.xfa.org/schema/xfa-data/1.0/"><xfa:data><f><v>1</v></f></xfa:data></xfa:datasets>'],
    '4miSjI0EqeFh53w34rGNShOTjCc=',
  ],
];

describe('formChecksum: the form packet checksum (SHA-1 of the canonicalised template and datasets packets, Base64)', () => {
  it.each(GOLDEN)('%s', (_label, parts, expected) => {
    expect(formChecksum(parts.map(enc))).toBe(expected);
  });

  it('is 28 characters of Base64 (a 20-byte digest), deterministic, and depends on every packet and on their order', () => {
    const a = enc('<template><subform name="f"/></template>');
    const b = enc('<xfa:datasets><xfa:data/></xfa:datasets>');
    const sum = formChecksum([a, b]);
    expect(sum).toMatch(/^[A-Za-z0-9+/]{27}=$/);
    expect(formChecksum([a, b])).toBe(sum);
    expect(formChecksum([b, a])).not.toBe(sum);
    expect(formChecksum([a, enc('<xfa:datasets><xfa:data><x/></xfa:data></xfa:datasets>')])).not.toBe(sum);
  });

  it('reads a packet larger than one read block (32 KiB) the same as the reference', () => {
    const big = `<a>${'<b x="&quot;1&quot;">text &amp; more</b>\n'.repeat(4000)}</a>`;
    expect(formChecksum([enc(big)])).toBe('Awd+eLiQXCttfZO5xciLIUKMpAk=');
  });
});
