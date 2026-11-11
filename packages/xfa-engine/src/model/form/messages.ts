import { z } from 'zod';
import { invalidArgument, invalidOperation, limitExceeded } from './errors.js';
import { parseAttributeValue } from './attributes.js';
import { MAX_VALUE_CHARS } from './limits.js';
import type { FormNode } from './node.js';

/** `validate.<name>` of a container (nullTest, formatTest, scriptTest) with the XFA default when nothing is written. */
export function validateAttr(owner: FormNode, name: string): string {
  return owner.property('validate')?.attr(name) ?? (name === 'formatTest' ? 'warning' : name === 'scriptTest' ? 'error' : 'disabled');
}

export function setValidateAttr(owner: FormNode, name: string, input: unknown): void {
  const text = parseAttributeValue('validate', name, input);
  const validate = owner.property('validate');
  if (validate === undefined) throw invalidOperation(`${owner.className} has no validate property`);
  validate.setAttr(name, text);
}

function messageTextNode(validate: FormNode, name: string): FormNode | undefined {
  for (const message of validate.childrenOfClass('message')) {
    const found = message.childrenOfClass('text').find((t) => t.name === name);
    if (found !== undefined) return found;
  }
  return undefined;
}

/** The text of `validate/message/text[name]` of a container ("" when none): `scriptTest` is `validationMessage`, `formatTest` is `formatMessage`, `nullTest` is `mandatoryMessage`. */
export function messageText(owner: FormNode, name: string): string {
  const validate = owner.property('validate');
  return validate === undefined ? '' : (messageTextNode(validate, name)?.plainText ?? '');
}

export function setMessageText(owner: FormNode, name: string, input: unknown): void {
  const given = z.string().safeParse(input);
  if (!given.success) throw invalidArgument('a message must be set to a string');
  if (given.data.length > MAX_VALUE_CHARS) throw limitExceeded(`a message may hold at most ${MAX_VALUE_CHARS} characters`);
  const validate = owner.property('validate');
  if (validate === undefined) throw invalidOperation(`${owner.className} has no validate property`);
  let text = messageTextNode(validate, name);
  if (text === undefined) {
    let message = validate.childrenOfClass('message')[0];
    if (message === undefined) {
      message = owner.dom.createNode('message', '');
      validate.appendNode(message);
    }
    text = owner.dom.createNode('text', name);
    message.appendNode(text);
  }
  text.setPlainText(given.data);
}
