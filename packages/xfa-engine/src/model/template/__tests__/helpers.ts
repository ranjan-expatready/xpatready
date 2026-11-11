import { expect } from 'vitest';
import { XfaPdfError, type XfaPdfErrorCode } from '../../../pdf/errors.js';
import { assertSupported, buildTemplateModel, loadTemplate, parseTemplate, type TemplateModel, type TemplateNode } from '../index.js';
import { parseXml } from '../../../xml/parse.js';

export const NS28 = 'http://www.xfa.org/schema/xfa-template/2.8/';

/** A template packet whose root subform is `form1` and whose body is `body`. */
export function tpl(body: string, ns: string = NS28): string {
  return `<?xml version="1.0" encoding="UTF-8"?><template xmlns="${ns}"><subform name="form1">${body}</subform></template>`;
}

/** Parses and builds without the feature gate, so a test can reach constructs the gate refuses. */
export function modelOf(xml: string): TemplateModel {
  return buildTemplateModel(parseXml(xml));
}

export function must<T>(value: T | null | undefined, what = 'value'): T {
  if (value === null || value === undefined) throw new Error(`expected ${what} to exist`);
  return value;
}

export function nodeNamed(model: TemplateModel, className: string, name: string): TemplateNode {
  return must(
    model.nodes.find((n) => n.className === className && n.name === name),
    `${className} "${name}"`,
  );
}

export function firstOfClass(model: TemplateModel, className: string): TemplateNode {
  return must(
    model.nodes.find((n) => n.className === className),
    `a ${className} node`,
  );
}

export function caught(fn: () => unknown): unknown {
  try {
    fn();
  } catch (e) {
    return e;
  }
  return undefined;
}

/** Asserts `fn` throws an XfaPdfError of `code` (never a RangeError/TypeError/hang) and returns it. */
export function expectXfa(fn: () => unknown, code: XfaPdfErrorCode, match?: RegExp): XfaPdfError {
  const e = caught(fn);
  expect(e, 'must throw a typed XfaPdfError').toBeInstanceOf(XfaPdfError);
  const err = e as XfaPdfError;
  expect(err.code).toBe(code);
  if (match !== undefined) expect(err.message).toMatch(match);
  return err;
}

export { assertSupported, buildTemplateModel, loadTemplate, parseTemplate };
