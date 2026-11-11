import { describe, expect, it } from 'vitest';
import { XfaPdfError } from '../../pdf/errors.js';
import { XfaAnswerRequiredError } from '../errors.js';
import type { MessageBoxCall } from '../options.js';
import { loaded, makeRuntime, onEvent, textField, thrown } from './helpers.js';

const CHOICE = 'this.rawValue = String(xfa.host.messageBox("Sure?", "Confirm", 2, 1));';

describe('ANSWER_REQUIRED: a host that has no answer yet (messageBoxResult returns null)', () => {
  it('aborts the run with a typed error that carries the box, distinct from a script failure, and records nothing', async () => {
    const seen: MessageBoxCall[] = [];
    const rt = await loaded(textField('f', onEvent('click', CHOICE)), { options: { messageBoxResult: (call) => (seen.push(call), null) } });
    const error = thrown(() => rt.event('f', 'click'));
    expect(error).toBeInstanceOf(XfaAnswerRequiredError);
    expect(error).toBeInstanceOf(XfaPdfError);
    expect(error).toMatchObject({ code: 'ANSWER_REQUIRED', call: { text: 'Sure?', title: 'Confirm', icon: 2, buttons: 1 } });
    expect(seen).toEqual([{ text: 'Sure?', title: 'Confirm', icon: 2, buttons: 1 }]);
    expect(rt.messages).toEqual([]);
    expect(rt.state).toBe('aborted');
    expect(thrown(() => rt.setValue('f', 'x'))).toMatchObject({ code: 'RUN_ABORTED' });
  });

  it('is not absorbed by a try/catch in the form script', async () => {
    const body = textField('f', onEvent('click', `try { ${CHOICE} } catch (e) { this.rawValue = "swallowed"; }`));
    const rt = await loaded(body, { options: { messageBoxResult: () => null } });
    expect(thrown(() => rt.event('f', 'click'))).toMatchObject({ code: 'ANSWER_REQUIRED' });
    expect(rt.state).toBe('aborted');
  });

  it('surfaces unchanged when the box is raised by a handler another handler runs (execEvent), and while the form loads', async () => {
    const nested = `${textField('a', onEvent('click', 'b.execEvent("click");'))}${textField('b', onEvent('click', CHOICE))}`;
    const rt = await loaded(nested, { options: { messageBoxResult: () => null } });
    expect(thrown(() => rt.event('a', 'click'))).toMatchObject({ code: 'ANSWER_REQUIRED', call: { text: 'Sure?' } });
    const early = await makeRuntime(textField('f', onEvent('initialize', CHOICE)), { options: { messageBoxResult: () => null } });
    expect(thrown(() => early.load())).toMatchObject({ code: 'ANSWER_REQUIRED' });
  });

  it('lets the host answer some boxes and not others: the numbers it gives reach the script, a null stops the run at that box', async () => {
    const body = textField('f', onEvent('click', 'this.rawValue = String(xfa.host.messageBox("Only text")) + "," + String(xfa.host.messageBox("Q", "T", 2, 3));'));
    const answers = (call: MessageBoxCall): number | null => (call.buttons === 0 ? 1 : null);
    const rt = await loaded(body, { options: { messageBoxResult: answers } });
    const error = thrown(() => rt.event('f', 'click'));
    expect(error).toMatchObject({ code: 'ANSWER_REQUIRED', call: { text: 'Q', buttons: 3 } });
    const answered = await loaded(body, { options: { messageBoxResult: (call) => (call.buttons === 0 ? 1 : 4) } });
    answered.event('f', 'click');
    expect(answered.getValue('f')).toBe('1,4');
    expect(answered.messages.map((m) => m.result)).toEqual([1, 4]);
  });

  it('keeps a number the host gives as before: a non-integer is still a bug in the host, not an answer', async () => {
    const rt = await loaded(textField('f', onEvent('click', CHOICE)), { options: { messageBoxResult: () => 1.5 } });
    expect(thrown(() => rt.event('f', 'click'))).toBeInstanceOf(Error);
    expect(rt.state).toBe('aborted');
  });
});
