/**
 * The native string and RegExp guard, spliced into the prelude next to the array guard. QuickJS polls its interrupt in
 * bytecode only, so a native builtin that loops for hours cannot be stopped by the run deadline. Probing the pinned engine
 * found these loops, all of which this layer bounds BEFORE the native runs, by an exact measure of the work and a typed
 * `SCRIPT_LIMIT` (the same fatal, uncatchable path as the array guard: `B.limit`):
 *
 * - substring search, cost (positions x needle length): `indexOf`, `lastIndexOf`, `includes`, and the string forms of
 *   `split`, `replace`, `replaceAll` (limit `string-work`, ceiling `stringSearchWork`);
 * - RegExp exec, cost (source length x input length). The matcher polls the interrupt per backtrack, not per literal
 *   character, so catastrophic backtracking is stopped by the deadline, but a long literal source delays the stop by
 *   seconds to minutes. Every match path (`test`, `exec`, `match`, `matchAll`, `search`, `replace`, `replaceAll`, `split`,
 *   and the `Symbol.*` methods called directly) can reach the builtin matcher, and a guest can null or shadow `exec`
 *   (the spec then falls back to the builtin), so the bound sits at the seven ENTRY points (`exec`, `test`, `Symbol.match`,
 *   `matchAll`, `replace`, `search`, `split`), installed non-writable and non-configurable, with the source read through the
 *   engine's own `source` getter (limit `string-work`). `String.prototype.match`/`replace`/... never leave a RegExp argument
 *   to the native's dispatch: the Symbol method is read once and, if the guest removed it, the guarded one is used;
 * - RegExp compile, quadratic in the number of alternatives and not interruptible: the source is capped when the guest
 *   builds one (the `RegExp` constructor, `compile`, and the string forms of `match`, `matchAll`, `search`, which make the
 *   engine compile the string; limit `regexp-source`, ceiling `regexpSourceChars`);
 * - `normalize` and `localeCompare` (which normalizes both operands): canonical reordering of a run of combining marks is
 *   quadratic, so the length of a string that holds any non-ASCII character is capped (limit `string-length`, ceiling
 *   `normalizeChars`); an all-ASCII string cannot hold a combining mark and normalizes in linear time, so it is not capped.
 *
 * How a guest cannot get around it: each wrapper replaces the prototype property before any guest code exists, and the
 * native lives only in the wrapper's closure, so there is no path to it (`Reflect.apply`, `Function.prototype.call`,
 * `bind` and a re-fetch from the prototype all reach the wrapper). The receiver and the pattern are coerced to strings
 * ONCE, here, and the native is handed those strings, so what was measured is what is searched (a `toString` that answers
 * differently the second time gains nothing, and runs only once). Where the native would dispatch on an object's
 * `Symbol.split`/`replace`/`match`/`matchAll`/`search` method, the wrapper reads it once and calls it itself. Nothing
 * here reads a guest property before it has been captured except that dispatch and the coercions the native would have done.
 *
 * Differences from the bare engine, both outside anything an ES3 form does: an object with a `Symbol.match` method that is
 * not a RegExp is not treated as one by `includes`, and `replaceAll`/`matchAll` do not check the `g` flag of a non-RegExp
 * object that supplies its own `Symbol.replace`/`Symbol.matchAll`.
 *
 * Authoring rules as for the prelude (ES5, no template literals), except `new.target` in the `RegExp` wrapper, which is how
 * a function tells `new RegExp(...)` from `RegExp(...)` and honours a subclass. Inherits `B`, `cfg`, `g`, `defineProperty`,
 * `getDescriptor`, `reflectApply` and `StringFn` from the prelude.
 */
export const STRING_GUARD_SOURCE: string = String.raw`function installStringGuards() {
    var searchCap = cfg.stringSearchWork;
    var sourceCap = cfg.regexpSourceChars;
    var normalizeCap = cfg.normalizeChars;
    var StringProto = StringFn.prototype;
    var RegExpOrig = RegExp;
    var RegExpProto = RegExpOrig.prototype;
    var reflectConstruct = Reflect.construct;
    var ownKeys = Reflect.ownKeys;
    var sourceGet = getDescriptor(RegExpProto, 'source').get;
    var globalGet = getDescriptor(RegExpProto, 'global').get;
    var flagsGet = getDescriptor(RegExpProto, 'flags').get;
    var execOrig = RegExpProto.exec;
    var compileOrig = RegExpProto.compile;

    function put(target, name, fn) {
      defineProperty(target, name, { value: fn, writable: true, configurable: true, enumerable: false });
    }
    function mirror(fn, original) {
      defineProperty(fn, 'name', { value: original.name, configurable: true });
      defineProperty(fn, 'length', { value: original.length, configurable: true });
      return fn;
    }
    // ToString of a receiver or argument, exactly once. Symbols never reach here: the native rejects them.
    function textOf(v) { return typeof v === 'string' ? v : StringFn(v); }
    function isObject(v) { return v !== null && (typeof v === 'object' || typeof v === 'function'); }
    function unusable(self) { return self === null || self === undefined || typeof self === 'symbol'; }
    // A genuine RegExp: only the engine's own getter accepts one (a toStringTag or a Symbol.match proves nothing).
    function isRegExpObject(v) {
      try { reflectApply(sourceGet, v, []); return true; } catch (ignored) { return false; }
    }
    function searchWork(haystack, needle) {
      var positions = haystack.length - needle.length + 1;
      return positions > 0 ? positions * needle.length : 0;
    }
    function checkSearch(haystack, needle) {
      if (searchWork(haystack, needle) > searchCap) { B.limit('string-work'); }
    }
    function checkSource(source) {
      if (source.length > sourceCap) { B.limit('regexp-source'); }
    }

    // indexOf, lastIndexOf, includes: the receiver and the needle are measured, then handed over as strings.
    function guardSearch(original, rejectsRegExp) {
      return mirror(function (needle, position) {
        var self = this;
        if (unusable(self)) { return reflectApply(original, self, [needle, position]); }
        var text = textOf(self);
        if (typeof needle === 'symbol' || (rejectsRegExp && isObject(needle) && isRegExpObject(needle))) {
          return reflectApply(original, text, [needle, position]);
        }
        var pattern = textOf(needle);
        checkSearch(text, pattern);
        return reflectApply(original, text, [pattern, position]);
      }, original);
    }

    // split, replace, replaceAll (text patterns), match, matchAll, search (the pattern is compiled as a RegExp source).
    // A RegExp argument is never left to the native's own dispatch: that reads the Symbol method off the object, and a guest
    // that nulls it makes the native fall back to searching for the RegExp's text, or to its builtin matcher, unbounded. The
    // method is read once here and, when absent, replaced by the guarded prototype method.
    var entries = {};
    function guardPattern(original, symbol, compiled, name, needsGlobal) {
      return mirror(function (pattern, extra) {
        var self = this;
        if (unusable(self) || typeof pattern === 'symbol') { return reflectApply(original, self, [pattern, extra]); }
        if (isObject(pattern)) {
          var real = isRegExpObject(pattern);
          var handler = pattern[symbol];
          if (real) {
            if (needsGlobal && !reflectApply(globalGet, pattern, [])) { throw new TypeErrorCtor(name + ' must be called with a global RegExp'); }
            if (handler === undefined || handler === null) { handler = entries[name]; }
            return reflectApply(handler, pattern, [self, extra]);
          }
          if (handler !== undefined && handler !== null) { return reflectApply(handler, pattern, [self, extra]); }
        }
        if (pattern === undefined || pattern === null) { return reflectApply(original, self, [pattern, extra]); }
        var source = textOf(pattern);
        if (compiled) {
          checkSource(source);
          return reflectApply(original, self, [source, extra]);
        }
        var text = textOf(self);
        checkSearch(text, source);
        return reflectApply(original, text, [source, extra]);
      }, original);
    }

    // normalize, localeCompare: quadratic on a run of combining marks, which are never ASCII, so a long non-ASCII string is
    // refused and a long ASCII one (linear) is not.
    var NON_ASCII = /[^\x00-\x7f]/;
    function tooLongToNormalize(text) {
      return text.length > normalizeCap && reflectApply(execOrig, NON_ASCII, [text]) !== null;
    }
    function guardNormalize(original) {
      return mirror(function (form) {
        var self = this;
        if (unusable(self)) { return reflectApply(original, self, [form]); }
        var text = textOf(self);
        if (tooLongToNormalize(text)) { B.limit('string-length'); }
        return reflectApply(original, text, [form]);
      }, original);
    }
    function guardCompare(original) {
      return mirror(function (that, locales, options) {
        var self = this;
        if (unusable(self)) { return reflectApply(original, self, [that, locales, options]); }
        var text = textOf(self);
        if (tooLongToNormalize(text)) { B.limit('string-length'); }
        if (typeof that === 'symbol') { return reflectApply(original, text, [that, locales, options]); }
        var other = textOf(that);
        if (tooLongToNormalize(other)) { B.limit('string-length'); }
        return reflectApply(original, text, [other, locales, options]);
      }, original);
    }

    var plain = ['indexOf', 'lastIndexOf', 'includes'];
    for (var i = 0; i < plain.length; i++) {
      put(StringProto, plain[i], guardSearch(StringProto[plain[i]], plain[i] === 'includes'));
    }
    put(StringProto, 'split', guardPattern(StringProto.split, Symbol.split, false, 'split', false));
    put(StringProto, 'replace', guardPattern(StringProto.replace, Symbol.replace, false, 'replace', false));
    put(StringProto, 'replaceAll', guardPattern(StringProto.replaceAll, Symbol.replace, false, 'replace', true));
    put(StringProto, 'match', guardPattern(StringProto.match, Symbol.match, true, 'match', false));
    put(StringProto, 'matchAll', guardPattern(StringProto.matchAll, Symbol.matchAll, true, 'matchAll', true));
    put(StringProto, 'search', guardPattern(StringProto.search, Symbol.search, true, 'search', false));
    put(StringProto, 'normalize', guardNormalize(StringProto.normalize));
    put(StringProto, 'localeCompare', guardCompare(StringProto.localeCompare));

    // The seven RegExp match entry points each measure source x input BEFORE the native runs. Relying on exec alone is not
    // enough: when 'exec' is not callable the spec falls back to the builtin matcher, so a guest that nulls it on an instance
    // would reach the native unbounded. The input is coerced once and handed over as a string. [Symbol.split] and
    // [Symbol.matchAll] build a second RegExp through the object's 'constructor', which a guest can point anywhere, so
    // they run on a fresh copy made by the real constructor, whose lookups no guest property can reach.
    function lock(target, key, fn) {
      defineProperty(target, key, { value: fn, writable: false, configurable: false, enumerable: false });
    }
    function guardEntry(original, copies) {
      return mirror(function (input, extra) {
        var rx = this;
        var source = reflectApply(sourceGet, rx, []);
        if (typeof input === 'symbol') { return reflectApply(original, rx, [input, extra]); }
        var text = textOf(input);
        if (source.length * text.length > searchCap) { B.limit('string-work'); }
        if (copies) {
          var copy = reflectConstruct(RegExpOrig, [source, reflectApply(flagsGet, rx, [])]);
          copy.lastIndex = rx.lastIndex;
          return reflectApply(original, copy, [text, extra]);
        }
        return reflectApply(original, rx, [text, extra]);
      }, original);
    }
    lock(RegExpProto, 'exec', guardEntry(execOrig, false));
    lock(RegExpProto, 'test', guardEntry(RegExpProto.test, false));
    entries.match = guardEntry(RegExpProto[Symbol.match], false);
    entries.replace = guardEntry(RegExpProto[Symbol.replace], false);
    entries.search = guardEntry(RegExpProto[Symbol.search], false);
    entries.split = guardEntry(RegExpProto[Symbol.split], true);
    entries.matchAll = guardEntry(RegExpProto[Symbol.matchAll], true);
    lock(RegExpProto, Symbol.match, entries.match);
    lock(RegExpProto, Symbol.replace, entries.replace);
    lock(RegExpProto, Symbol.search, entries.search);
    lock(RegExpProto, Symbol.split, entries.split);
    lock(RegExpProto, Symbol.matchAll, entries.matchAll);

    // A source is measured as the engine would read it: a RegExp passes (it was compiled already), anything else by its string.
    function sourceOf(pattern) {
      if (pattern === undefined || pattern === null || typeof pattern === 'symbol') { return pattern; }
      if (isObject(pattern) && isRegExpObject(pattern)) { return pattern; }
      var text = textOf(pattern);
      checkSource(text);
      return text;
    }
    if (typeof compileOrig === 'function') {
      put(RegExpProto, 'compile', mirror(function (pattern, flags) {
        return reflectApply(compileOrig, this, [sourceOf(pattern), flags]);
      }, compileOrig));
    }
    function RegExpGuard(pattern, flags) {
      var source = sourceOf(pattern);
      if (new.target === undefined) {
        // RegExp(re) hands back re itself when it is a RegExp made by this constructor and no flags are given.
        if (flags === undefined && isObject(pattern) && isRegExpObject(pattern) && pattern.constructor === RegExpGuard) { return pattern; }
        return reflectApply(RegExpOrig, undefined, [source, flags]);
      }
      return reflectConstruct(RegExpOrig, [source, flags], new.target);
    }
    mirror(RegExpGuard, RegExpOrig);
    var keys = ownKeys(RegExpOrig);
    for (var k = 0; k < keys.length; k++) {
      if (keys[k] !== 'length' && keys[k] !== 'name' && keys[k] !== 'prototype') {
        var d = getDescriptor(RegExpOrig, keys[k]);
        d.configurable = false;
        defineProperty(RegExpGuard, keys[k], d);
      }
    }
    defineProperty(RegExpGuard, 'prototype', { value: RegExpProto, writable: false, configurable: false, enumerable: false });
    lock(RegExpProto, 'constructor', RegExpGuard);
    put(g, 'RegExp', RegExpGuard);
  }`;
