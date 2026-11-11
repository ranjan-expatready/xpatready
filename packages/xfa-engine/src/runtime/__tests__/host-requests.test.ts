import { describe, expect, it } from 'vitest';
import { XfaScriptError } from '../../script/index.js';
import { XfaAnswerRequiredError } from '../errors.js';
import type { MessageBoxCall } from '../options.js';
import { loaded, makeRuntime, NEUTRAL_HOST, onEvent, textField, thrown } from './helpers.js';

const SOM = 'xfa[0].form[0].form1[0].f[0]';

/** One field whose click script is `body`, plus a second field the script can write, so "no effect on the form" is observable. */
const withClick = (body: string): string => `${textField('f', onEvent('click', body))}${textField('other')}`;

describe('E8: requests with no effect on the form are recorded, never done (xfa.host.print, app.launchURL, app.response)', () => {
  it('print with no arguments records the defaults, names the event and node, returns undefined and changes nothing', async () => {
    const rt = await loaded(withClick('this.rawValue = typeof xfa.host.print();'));
    const before = rt.saveDatasets();
    rt.event('f', 'click');
    expect(rt.requests).toEqual([
      { kind: 'print', ui: true, start: 0, end: -1, noCancelDialog: true, shrinkToFit: true, asImage: true, reverse: false, annotations: true, event: 'click', nodeSom: SOM },
    ]);
    // The only change is what the script itself wrote; the request moved no data, raised no box and asked for no focus.
    expect(rt.getValue('f')).toBe('undefined');
    expect(rt.getValue('other')).toBeNull();
    expect(rt.saveDatasets()).not.toBe(before);
    expect(rt.messages).toEqual([]);
    expect(rt.focus).toEqual([]);
    expect(rt.unsupported).toEqual([]);
  });

  it('print records the eight arguments in the XFA host order: flags by truthiness, a negative or absent end meaning the last page', async () => {
    const rt = await loaded(withClick('xfa.host.print(false, 2.9, 5, 0, 0, 0, "yes", false); xfa.host.print(true, -3, -1); xfa.host.print(undefined, "x", NaN);'));
    rt.event('f', 'click');
    expect(rt.requests).toMatchObject([
      { kind: 'print', ui: false, start: 2, end: 5, noCancelDialog: false, shrinkToFit: false, asImage: false, reverse: true, annotations: false },
      { kind: 'print', ui: true, start: 0, end: -1, noCancelDialog: true, shrinkToFit: true, asImage: true, annotations: true },
      { kind: 'print', ui: true, start: 0, end: -1 },
    ]);
  });

  it('the canonical Designer call passes page numbers as strings: print(1, "0", "0", 0, 1, 0, 0, 0) is the first page only; numeric strings and numbers mean the same page', async () => {
    const rt = await loaded(withClick('xfa.host.print(1, "0", "0", 0, 1, 0, 0, 0); xfa.host.print(1, " 2 ", 3); xfa.host.print(1, "2", "");'));
    rt.event('f', 'click');
    expect(rt.requests).toMatchObject([
      { kind: 'print', ui: true, start: 0, end: 0, noCancelDialog: false, shrinkToFit: true, asImage: false, reverse: false, annotations: false },
      { kind: 'print', start: 2, end: 3 },
      { kind: 'print', start: 2, end: 2 },
    ]);
  });

  it('the page range follows Acrobat\'s Doc.print convention: no page numbers is every page, only a start is that page alone, a negative end is the last page', async () => {
    const rt = await loaded(withClick('xfa.host.print(); xfa.host.print(1, 4); xfa.host.print(1, 4, 7); xfa.host.print(1, "1", -1); xfa.host.print(1, undefined, 6);'));
    rt.event('f', 'click');
    expect(rt.requests.map((r) => (r.kind === 'print' ? [r.start, r.end] : []))).toEqual([[0, -1], [4, 4], [4, 7], [1, -1], [0, 6]]);
  });

  it('a print request leaves the form exactly as an event that asks for nothing would: same data, same recorded output', async () => {
    const printing = await loaded(withClick('xfa.host.print();'));
    const quiet = await loaded(withClick('var unused = 1;'));
    printing.event('f', 'click');
    quiet.event('f', 'click');
    expect(printing.saveDatasets()).toBe(quiet.saveDatasets());
    expect(printing.messages).toEqual(quiet.messages);
    expect(printing.focus).toEqual(quiet.focus);
    expect(printing.requests).toHaveLength(1);
    expect(quiet.requests).toEqual([]);
  });

  it('launchURL records the URL and the new-frame flag and returns undefined; nothing is opened or fetched', async () => {
    const rt = await loaded(withClick('this.rawValue = String(app.launchURL("https://example.invalid/page?a=1", true)); app.launchURL(42);'));
    rt.event('f', 'click');
    expect(rt.requests).toEqual([
      { kind: 'launchURL', url: 'https://example.invalid/page?a=1', newFrame: true, event: 'click', nodeSom: SOM },
      { kind: 'launchURL', url: '42', newFrame: false, event: 'click', nodeSom: SOM },
    ]);
    expect(rt.getValue('f')).toBe('undefined');
  });

  it('response records the question, title, default, password flag and label; the script is told the user cancelled (null)', async () => {
    const rt = await loaded(withClick('var r = app.response("Your name?", "Ask", "Pat", true, "Name:"); this.rawValue = r === null ? "cancelled" : "answered"; app.response("Only a question");'));
    rt.event('f', 'click');
    expect(rt.getValue('f')).toBe('cancelled');
    expect(rt.requests).toEqual([
      { kind: 'response', question: 'Your name?', title: 'Ask', default: 'Pat', password: true, label: 'Name:', event: 'click', nodeSom: SOM },
      { kind: 'response', question: 'Only a question', title: '', default: '', password: false, label: '', event: 'click', nodeSom: SOM },
    ]);
    expect(rt.messages).toEqual([]);
  });

  it('requests are recorded in call order across the three kinds, and a request made while the form loads is recorded with the load event', async () => {
    const rt = await makeRuntime(textField('f', onEvent('initialize', 'xfa.host.print(); app.launchURL("x"); app.response("q");')));
    rt.load();
    expect(rt.requests.map((r) => r.kind)).toEqual(['print', 'launchURL', 'response']);
    expect(rt.requests.map((r) => r.event)).toEqual(['initialize', 'initialize', 'initialize']);
  });

  it('strict mode: the four members are modelled, so none is an unsupported member', async () => {
    const rt = await loaded(withClick('xfa.host.print(); app.launchURL("x"); app.response("q"); app.alert("m"); this.rawValue = app.viewerType;'));
    rt.event('f', 'click');
    expect(rt.unsupported).toEqual([]);
  });

  it('requests are capped like every recorder: a script that floods print ends the run with the typed output limit', async () => {
    const rt = await makeRuntime(textField('f', onEvent('initialize', 'for (var i = 0; i < 10; i++) { xfa.host.print(); }')), { options: { limits: { maxRecordedEntries: 3 } } });
    const error = thrown(() => rt.load());
    expect(error).toBeInstanceOf(XfaScriptError);
    expect((error as XfaScriptError).limit).toBe('output');
    expect(rt.requests).toHaveLength(3);
  });

  it('a long URL or question is clipped to the recorded-text ceiling', async () => {
    const rt = await loaded(withClick('var s = new Array(70001).join("x"); app.launchURL(s); app.response(s);'));
    rt.event('f', 'click');
    expect(rt.requests.map((r) => (r.kind === 'launchURL' ? r.url.length : r.kind === 'response' ? r.question.length : 0))).toEqual([65_536, 65_536]);
  });

  it('a request is not a state change: a fresh run that replays the same inputs ends with the same data', async () => {
    const run = async () => {
      const rt = await loaded(withClick('xfa.host.print(); other.rawValue = "kept";'));
      rt.event('f', 'click');
      return rt.saveDatasets();
    };
    expect(await run()).toBe(await run());
  });
});

describe('E8: app.alert is a message box', () => {
  it('records the message with its icon, button type and title (messageBox argument order is text, title, icon, buttons) and returns OK (1)', async () => {
    const rt = await loaded(withClick('this.rawValue = String(app.alert("Check the date", 3, 1, "Title"));'));
    rt.event('f', 'click');
    expect(rt.getValue('f')).toBe('1');
    expect(rt.messages).toEqual([{ text: 'Check the date', title: 'Title', icon: 3, buttons: 1, result: 1, event: 'click', nodeSom: SOM }]);
    expect(rt.requests).toEqual([]);
  });

  it('is answered by the caller exactly like xfa.host.messageBox, and an unanswered choice box stops the run with ANSWER_REQUIRED', async () => {
    const body = withClick('this.rawValue = String(app.alert("Q", 2, 2));');
    const answered = await loaded(body, { options: { messageBoxResult: (call) => (call.buttons === 2 ? 4 : 1) } });
    answered.event('f', 'click');
    expect(answered.getValue('f')).toBe('4');
    const seen: MessageBoxCall[] = [];
    const unanswered = await loaded(body, { options: { messageBoxResult: (call) => (seen.push(call), null) } });
    expect(thrown(() => unanswered.event('f', 'click'))).toBeInstanceOf(XfaAnswerRequiredError);
    expect(seen).toEqual([{ text: 'Q', title: '', icon: 2, buttons: 2 }]);
    expect(unanswered.messages).toEqual([]);
  });

  it('a button type outside 0 to 3 is OK only, and an empty message shows nothing and returns 0', async () => {
    const rt = await loaded(withClick('this.rawValue = [app.alert("a", 0, 9), app.alert("", 0, 0), app.alert(null)].join(",");'));
    rt.event('f', 'click');
    expect(rt.getValue('f')).toBe('1,0,0');
    expect(rt.messages).toHaveLength(1);
    expect(rt.messages[0]).toMatchObject({ text: 'a', buttons: 0 });
  });

  it('an object argument (Acrobat named parameters) cannot cross the script bridge: the script gets a catchable TypeError, not a crash', async () => {
    const rt = await loaded(withClick('try { app.alert({ cMsg: "x" }); this.rawValue = "shown"; } catch (e) { this.rawValue = "caught"; }'));
    rt.event('f', 'click');
    expect(rt.getValue('f')).toBe('caught');
    expect(rt.messages).toEqual([]);
  });
});

describe('E8: app.viewerType is the host identity', () => {
  it('reads the appType the deployment injected, and cannot be set', async () => {
    const rt = await loaded(withClick('this.rawValue = app.viewerType; try { app.viewerType = "Other"; } catch (e) { this.rawValue = this.rawValue + ":refused"; }'));
    rt.event('f', 'click');
    expect(rt.getValue('f')).toBe(`${NEUTRAL_HOST.appType}:refused`);
  });

  it('follows another identity', async () => {
    const rt = await loaded(withClick('this.rawValue = app.viewerType;'), { options: { host: { ...NEUTRAL_HOST, appType: 'OtherApp' } } });
    rt.event('f', 'click');
    expect(rt.getValue('f')).toBe('OtherApp');
  });
});
