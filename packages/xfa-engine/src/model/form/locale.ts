import { XfaPdfError } from '../../pdf/errors.js';
import { safeText } from '../../pdf/safe-text.js';
import type { TemplateModel, TemplateNode } from '../template/index.js';
import { diagnosticPath } from '../template/path.js';

/** True when any clause of a picture source is a number or date clause (the categories whose symbols depend on the locale). */
function usesLocaleSymbols(source: string): boolean {
  return source.split('|').some((clause) => clause.startsWith('num{') || clause.startsWith('date{'));
}

/** The locale in force for a container: its own `locale`, else the nearest ancestor's; undefined when none is written. */
function localeOf(owner: TemplateNode): string | undefined {
  for (let node: TemplateNode | null = owner; node !== null; node = node.parent) {
    const written = node.attr('locale')?.trim();
    if (written !== undefined && written !== '') return written;
  }
  return undefined;
}

const isEnglish = (locale: string): boolean => {
  const lower = locale.toLowerCase();
  return lower === 'en' || lower.startsWith('en_') || lower.startsWith('en-');
};

/**
 * Refuses (fail closed) a template whose number or date picture belongs to a field in a locale other than English: the
 * engine formats with English symbols only (`,` grouping, `.` decimal point, `$`), so another locale would show
 * numbers and dates wrongly rather than visibly fail. A picture's owner is the container that holds its `ui`, `format`,
 * `bind` or `validate`; a container with no locale of its own takes the nearest ancestor's, and none at all is accepted.
 */
export function assertSupportedLocales(model: TemplateModel): void {
  for (const node of model.nodes) {
    if (node.className !== 'picture' || !usesLocaleSymbols(node.content.trim())) continue;
    const owner = node.parent?.parent;
    if (owner === null || owner === undefined) continue;
    const locale = localeOf(owner);
    if (locale !== undefined && !isEnglish(locale)) {
      throw new XfaPdfError('UNSUPPORTED_FEATURE', `Unsupported XFA feature: locale "${safeText(locale)}" for a number or date picture at ${diagnosticPath(owner)}`);
    }
  }
}
