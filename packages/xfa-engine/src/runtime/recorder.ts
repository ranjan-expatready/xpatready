import { XfaScriptError, type ScriptLocation } from '../script/errors.js';
import type { HostRequestRecord, MessageRecord, NoteRecord, UnsupportedRecord } from './options.js';

/** Bookkeeping charged per entry on top of its text, so a flood of empty entries is bounded in bytes too. */
const ENTRY_OVERHEAD_BYTES = 64;

type RecorderName = 'message box' | 'focus' | 'console' | 'unsupported-member' | 'note' | 'host request';

/**
 * What the form asked of its host, in order. Every list is capped (`maxEntries`, an FD-38 ceiling): a script that
 * floods a recorder ends the run with a typed `SCRIPT_LIMIT` (`output`) instead of growing memory.
 */
export class Recorder {
  readonly messages: MessageRecord[] = [];
  readonly requests: HostRequestRecord[] = [];
  readonly focus: string[] = [];
  readonly console: string[] = [];
  readonly unsupported: UnsupportedRecord[] = [];
  readonly notes: NoteRecord[] = [];
  readonly #noted = new Set<string>();
  readonly #maxEntries: number;
  readonly #maxBytes: number;
  #bytes = 0;
  readonly #locate: () => ScriptLocation | undefined;

  /** `locate` says where the running script is; it is only called when a ceiling is hit, to name the culprit. */
  constructor(maxEntries: number, maxBytes: number, locate: () => ScriptLocation | undefined) {
    this.#maxEntries = maxEntries;
    this.#maxBytes = maxBytes;
    this.#locate = locate;
  }

  addMessage(record: MessageRecord): void {
    this.#push(this.messages, record, 'message box', record.text.length + record.title.length + record.nodeSom.length + record.event.length);
  }

  addRequest(record: HostRequestRecord): void {
    const text = record.kind === 'print' ? '' : record.kind === 'launchURL' ? record.url : record.question + record.title + record.default + record.label;
    this.#push(this.requests, record, 'host request', text.length + record.nodeSom.length + record.event.length);
  }

  addFocus(som: string): void {
    this.#push(this.focus, som, 'focus', som.length);
  }

  addConsole(line: string): void {
    this.#push(this.console, line, 'console', line.length);
  }

  addUnsupported(record: UnsupportedRecord): void {
    this.#push(this.unsupported, record, 'unsupported-member', record.class.length + record.member.length);
  }

  /** Records a note once per (class, member): a script that repeats the same write cannot flood the list. */
  addNote(record: NoteRecord): void {
    const key = `${record.class}\u0000${record.member}`;
    if (this.#noted.has(key)) return;
    this.#push(this.notes, record, 'note', record.class.length + record.member.length);
    this.#noted.add(key);
  }

  #push<T>(list: T[], item: T, name: RecorderName, chars: number): void {
    const bytes = this.#bytes + 2 * chars + ENTRY_OVERHEAD_BYTES;
    if (list.length >= this.#maxEntries || bytes > this.#maxBytes) {
      const where = this.#locate();
      const why = list.length >= this.#maxEntries ? `more than ${this.#maxEntries} ${name} records` : `more than ${this.#maxBytes} bytes of recorded output (${name})`;
      throw new XfaScriptError('SCRIPT_LIMIT', `${why} in one form run`, {
        limit: 'output',
        ...(where === undefined ? {} : { location: where }),
      });
    }
    this.#bytes = bytes;
    list.push(item);
  }
}
