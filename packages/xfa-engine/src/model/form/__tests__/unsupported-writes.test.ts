import { describe, expect, it } from 'vitest';
import { build, find, must, textField } from './helpers.js';

describe('writes that would have no effect are unsupported, not silently ok (F11)', () => {
  const body = `<variables><script name="LOV">&lt;LOV/&gt;</script></variables>${textField('F', '<format><picture>text{99}</picture></format><event activity="click"><script>x</script></event>')}`;

  it('assigning picture.value reports unsupported (the format is compiled from the template, so the write changed nothing) while reading still works', () => {
    const { dom } = build(body);
    const picture = find(dom, 'picture', '');
    expect(dom.set(picture, 'value', 'text{9}')).toBe('unsupported');
    expect(dom.get(picture, 'value')).toEqual({ kind: 'value', value: 'text{99}' });
  });

  it('assigning the text of an event script reports unsupported (scripts run from the template), but a script object kept in variables is a string the form may rewrite', () => {
    const { dom } = build(body);
    const event = find(dom, 'event', '');
    const script = must(event.children.find((c) => c.className === 'script'));
    expect(dom.set(script, 'value', 'y')).toBe('unsupported');
    const variable = must(find(dom, 'variables', '').children.find((c) => c.name === 'LOV'));
    expect(dom.set(variable, 'value', 'rewritten')).toBe('ok');
    expect(dom.get(variable, 'value')).toEqual({ kind: 'value', value: 'rewritten' });
  });

  it('assigning the value of a text node still works', () => {
    const { dom } = build(textField('F', '<caption><value><text>Label</text></value></caption>'));
    const text = find(dom, 'text', '');
    expect(dom.set(text, 'value', 'New')).toBe('ok');
  });
});
