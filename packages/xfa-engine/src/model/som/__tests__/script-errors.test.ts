import { describe, expect, it } from 'vitest';
import { XfaPdfError } from '../../../pdf/errors.js';
import { XfaFormError } from '../../form/index.js';
import { build, expectForm, textField } from '../../form/__tests__/helpers.js';
import { parseSom, resolveNode, resolveNodes } from '../index.js';

describe('SOM text supplied by a script fails as a catchable XfaFormError (F6)', () => {
  const { dom } = build(textField('F'));

  it.each(['$', '$record.x', 'a[-1]', 'a..b', '!x', '.a', 'a[x]', 'a b'])(
    'resolveNode and resolveNodes refuse "%s" with an INVALID_ARGUMENT XfaFormError that names the unsupported grammar (it was a plain XfaPdfError, the load-time class)',
    (expression) => {
      const one = expectForm(() => resolveNode(dom.root, expression), 'INVALID_ARGUMENT', /SOM expression/);
      expect(one.constructor, 'the form error class, not the plain load-time XfaPdfError').toBe(XfaFormError);
      expectForm(() => resolveNodes(dom.root, expression), 'INVALID_ARGUMENT');
    },
  );

  it('the parser itself stays an UNSUPPORTED_FEATURE XfaPdfError, because the load-time gate depends on it', () => {
    let thrown: unknown;
    try {
      parseSom('$record.x');
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(XfaPdfError);
    expect((thrown as XfaPdfError).code).toBe('UNSUPPORTED_FEATURE');
    expect(thrown).not.toBeInstanceOf(XfaFormError);
  });
});
