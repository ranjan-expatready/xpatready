import type { Document } from '@xmldom/xmldom';
import { parseXml, type ParseXmlOptions } from '../../xml/parse.js';
import { buildTemplateModel, type TemplateModel } from './build.js';
import { assertSupported } from './gate.js';

export { isBareSomReference } from './bare-som.js';
export { buildTemplateModel, type TemplateModel } from './build.js';
export { assertSupported } from './gate.js';
export { attrWithDefault, getElement, getProperty } from './implicit.js';
export { TemplateNode, UI_WIDGET_CLASSES, isContainer } from './node.js';
export { diagnosticPath } from './path.js';
export {
  FORMCALC_CONTENT_TYPE,
  JAVASCRIPT_CONTENT_TYPE,
  calculateOf,
  effectiveContentType,
  eventsOf,
  looksLikeMarkup,
  scriptOf,
  variablesOf,
  type CalculateView,
  type EventView,
  type Manifest,
  type RunAt,
  type ScriptKind,
  type ScriptObject,
  type ScriptView,
  type TemplateVariables,
  type TextVariable,
} from './scripts.js';
export { bindItemsOf, bindOf, itemsOf, pictureOf, validateOf, valueContentOf, type BindItemsView, type BindView, type ItemsView, type ValidateView, type ValueContent } from './views.js';

/** Parses template text into the model without applying the feature gate. XML errors keep their `MALFORMED_XML` / `UNSUPPORTED_FEATURE` codes. */
export function parseTemplate(xml: string, options?: ParseXmlOptions): TemplateModel {
  const doc: Document = parseXml(xml, options);
  return buildTemplateModel(doc);
}

/** Parses template text, builds the model and refuses what the engine does not support (`assertSupported`). */
export function loadTemplate(xml: string, options?: ParseXmlOptions): TemplateModel {
  const model = parseTemplate(xml, options);
  assertSupported(model);
  return model;
}
