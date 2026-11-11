import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseXml } from '../../xml/parse.js';
import type { XfaPdf } from '../../xfa-pdf.js';
import { files } from './text-corpus.js';

/**
 * The subjects of the tests that use the Acrobat-saved copies as an oracle (W02-T08 pagination, W02-T09 layout scripts): the
 * blank forms of `XFA_CORPUS_DIR` and the copies Acrobat saved in `XFA_ACROBAT_DIR`. A missing directory or copy is NOT
 * EXECUTED (the import throws), never a skip.
 */
const corpusDir = process.env.XFA_CORPUS_DIR;
if (corpusDir === undefined || corpusDir === '') throw new Error('NOT EXECUTED: XFA_CORPUS_DIR unset (point it at the directory of the blank forms, .superpowers/xfa-corpus)');
const acrobatDir = process.env.XFA_ACROBAT_DIR;
if (acrobatDir === undefined || acrobatDir === '') throw new Error('NOT EXECUTED: XFA_ACROBAT_DIR unset (point it at the directory of Acrobat-saved copies, .superpowers/xfa-acrobat)');
const acrobatFiles = new Set(readdirSync(acrobatDir).filter((f) => f.toLowerCase().endsWith('.pdf')));

export interface Subject {
  readonly label: string;
  readonly path: string;
  /** Opened with the saved state restored, as the form's own load does; the blank forms are opened blank. */
  readonly kind: 'blank' | 'filled' | 'validated';
}

/** The Acrobat copies that exist (a known name that is missing is NOT EXECUTED for that copy, never a pass). */
const ACROBAT: readonly { readonly file: string; readonly kind: 'filled' | 'validated' }[] = [
  { file: 'imm5257-filled-acrobat-saved.pdf', kind: 'filled' },
  { file: 'imm5257-adobe-validated.pdf', kind: 'validated' },
  { file: 'imm1295-adobe-validated.pdf', kind: 'validated' },
];
for (const entry of ACROBAT) if (!acrobatFiles.has(entry.file)) throw new Error(`NOT EXECUTED: ${entry.file} is not in XFA_ACROBAT_DIR (${acrobatDir})`);

export const SUBJECTS: readonly Subject[] = [
  ...files.map((file): Subject => ({ label: file, path: join(corpusDir, file), kind: 'blank' })),
  ...ACROBAT.map((entry): Subject => ({ label: entry.file, path: join(acrobatDir, entry.file), kind: entry.kind })),
];

/** The `pageArea` instances the saved `form` packet lists (document order), counted from the packet text alone. */
export function packetPageAreas(pdf: XfaPdf): string[] {
  const packet = pdf.packets.find((p) => p.name === 'form');
  if (packet === undefined) throw new Error('the PDF has no form packet');
  const doc = parseXml(packet.text());
  const out: string[] = [];
  const nodes = doc.getElementsByTagName('pageArea');
  for (let i = 0; i < nodes.length; i += 1) out.push(nodes.item(i)?.getAttribute('name') ?? '');
  return out;
}
