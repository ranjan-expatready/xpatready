import { z } from 'zod';
import { invalidArgument, limitExceeded } from './errors.js';
import { MAX_ITEMS_PER_LIST } from './limits.js';
import type { FormNode } from './node.js';
import { readText, writeRaw } from './value.js';

const itemText = z.union([z.string(), z.number()]).transform(String);

interface Blocks {
  readonly display: FormNode | undefined;
  readonly save: FormNode | undefined;
}

function blocksOf(field: FormNode): Blocks {
  const all = field.childrenOfClass('items');
  return { display: all.find((b) => b.attr('save') !== '1'), save: all.find((b) => b.attr('save') === '1') };
}

const textsOf = (block: FormNode | undefined): string[] => (block === undefined ? [] : block.children.map((c) => c.plainText));

/** The labels shown and the values stored, index-aligned. A field with one list uses it for both. */
export function lists(field: FormNode): { readonly labels: string[]; readonly values: string[] } {
  const { display, save } = blocksOf(field);
  const values = textsOf(save);
  const labels = display === undefined ? values : textsOf(display);
  return { labels, values: save === undefined ? labels : values };
}

/**
 * Item nodes taken out of a list by `clearItems` or by a `remerge` refill, kept for the next item of that list. Every node
 * registers in the form for good, so without reuse each remerge of a 4,000-entry list of values would spend 8,000 nodes of
 * the budget and a loop of remerges (the Clear button) would exhaust it.
 */
const spare = new WeakMap<FormNode, FormNode[]>();

/** Takes the items `drop` selects out of the block in one pass and keeps them for reuse, last released = first reused. */
function releaseWhere(block: FormNode, drop: (item: FormNode) => boolean): void {
  const taken = block.removeNodesWhere(drop);
  if (taken.length === 0) return;
  const kept = spare.get(block);
  if (kept === undefined) spare.set(block, taken);
  else for (const item of taken) kept.push(item);
}

function appendText(block: FormNode, text: string, generated = false): void {
  if (block.children.length >= MAX_ITEMS_PER_LIST) throw limitExceeded(`a choice list may hold at most ${MAX_ITEMS_PER_LIST} items`);
  const node = spare.get(block)?.pop() ?? block.dom.createNode('text', '');
  node.setPlainText(text);
  node.markGenerated(generated);
  block.appendNode(node);
}

function createBlock(field: FormNode, save: boolean, fill: readonly string[]): FormNode {
  const block = field.dom.createNode('items', '');
  if (save) {
    block.setAttr('save', '1');
    block.setAttr('presence', 'hidden');
  }
  field.appendNode(block);
  for (const text of fill) appendText(block, text);
  return block;
}

/** Makes sure the field has both a display list and a save list, creating the missing one filled to match so the two stay aligned. */
function ensureBlocks(field: FormNode): { display: FormNode; save: FormNode } {
  const { display, save } = blocksOf(field);
  const shown = display ?? createBlock(field, false, textsOf(save));
  const stored = save ?? createBlock(field, true, textsOf(shown));
  return { display: shown, save: stored };
}

/** `clearItems()`: removes every item from every list, keeping the lists. */
export function clearItems(field: FormNode): void {
  field.assertWritable();
  for (const block of field.childrenOfClass('items')) releaseWhere(block, () => true);
}

/** `addItem(display, save?)`: appends to the display list and the save list (the save value defaults to the display text). */
export function addItem(field: FormNode, display: unknown, save?: unknown): void {
  field.assertWritable();
  const shown = itemText.safeParse(display);
  const stored = save === undefined ? undefined : itemText.safeParse(save);
  if (!shown.success || (stored !== undefined && !stored.success)) throw invalidArgument('addItem needs a display text and an optional save text (strings or numbers)');
  const { display: displayBlock, save: saveBlock } = ensureBlocks(field);
  appendText(displayBlock, shown.data);
  appendText(saveBlock, stored?.success === true ? stored.data : shown.data);
}

/** Appends bound items (labels with values) to both lists. */
export function appendBound(field: FormNode, pairs: readonly (readonly [label: string, value: string])[]): void {
  if (pairs.length === 0) return;
  const { display, save } = ensureBlocks(field);
  for (const [label, value] of pairs) {
    appendText(display, label, true);
    appendText(save, value, true);
  }
}

/** Removes the items a `bindItems` filled in (not the written or scripted ones), ready for the lists to be filled again. */
export function clearGenerated(field: FormNode): void {
  for (const block of field.childrenOfClass('items')) releaseWhere(block, (item) => item.isGenerated);
}

/** The index of the item holding the value, -1 when the value is null (no selection, even if the first entry is a blank item) or not listed. */
export function selectedIndex(field: FormNode): number {
  const current = readText(field);
  return current === null ? -1 : lists(field).values.indexOf(current);
}

export function setSelectedIndex(field: FormNode, input: unknown): void {
  const index = z.number().safeParse(input);
  const { values } = lists(field);
  if (!index.success || !Number.isInteger(index.data) || index.data < -1 || index.data >= values.length) {
    throw invalidArgument(`selectedIndex must be an integer from -1 to ${values.length - 1}`);
  }
  writeRaw(field, index.data === -1 ? null : (values[index.data] ?? null));
}

/** `boundItem(display)`: the save value of the first item with that label; the text itself when no item has it. */
export function boundItem(field: FormNode, display: unknown): string {
  const text = itemText.safeParse(display);
  if (!text.success) throw invalidArgument('boundItem needs a display text');
  const { labels, values } = lists(field);
  const at = labels.indexOf(text.data);
  return at >= 0 ? (values[at] ?? text.data) : text.data;
}
