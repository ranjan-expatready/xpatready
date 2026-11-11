import type { BoxIssue } from '../box/types.js';
import { MAX_ISSUES, MAX_SHORT_TEXT_CHARS } from '../limits.js';

const clip = (text: string): string => (text.length > MAX_SHORT_TEXT_CHARS ? text.slice(0, MAX_SHORT_TEXT_CHARS) : text);

/**
 * The tree's `issues`: the sources in priority order, de-duplicated by (som, feature), at most `MAX_ISSUES`. When anything
 * was lost (the cap, or issues a source itself had to drop) the last entry says how many, so a reader never mistakes a full
 * list for a complete one.
 */
export function mergeIssues(sources: readonly (readonly BoxIssue[])[], droppedBySources: number): BoxIssue[] {
  const seen = new Set<string>();
  const kept: BoxIssue[] = [];
  let overflow = 0;
  for (const source of sources) {
    for (const issue of source) {
      const entry = { som: clip(issue.som), feature: clip(issue.feature === '' ? '(no description)' : issue.feature) };
      const key = `${entry.som}\u0000${entry.feature}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (kept.length < MAX_ISSUES) kept.push(entry);
      else overflow += 1;
    }
  }
  let lost = overflow + droppedBySources;
  if (lost === 0) return kept;
  // The summary takes the last slot: the entry it displaces is one more that was not kept.
  if (kept.length >= MAX_ISSUES) {
    kept.pop();
    lost += 1;
  }
  kept.push({ som: '', feature: `${lost} further issue(s) were not kept` });
  return kept;
}
