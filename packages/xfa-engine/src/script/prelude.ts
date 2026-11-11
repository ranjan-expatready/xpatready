import { STRING_GUARD_SOURCE } from './prelude-strings.js';
import { DATE_LAYER_SOURCE } from './prelude-zone.js';

/**
 * The guest prelude: a fixed ES5 program evaluated first in every fresh QuickJS context. It is the only code that
 * ever holds the bridge functions (they live in its closure, not on `globalThis`), and it builds the objects form
 * scripts see:
 *
 * - `xfa` (root node), `app`, `console`: `Proxy` wrappers whose get/set/call traps cross the bridge as JSON text.
 *   Nodes are identified by host-assigned ids kept in closures and in `WeakMap`s a script cannot reach; a script can
 *   neither read nor forge an id. The global `Proxy` is removed afterwards, so a script cannot put a trap in front of
 *   an array or a length.
 * - `Date`: rebuilt on the injected clock and zone (`prelude-zone.ts`); the original constructor is unreachable.
 * - Native array builtins and iterator creators: wrapped so a huge sparse array or array-like cannot start a loop
 *   QuickJS has no way to interrupt.
 * - Native string and RegExp builtins (substring search, RegExp exec and compile, `normalize`, `localeCompare`): wrapped
 *   the same way, bounded by the work they would do (`prelude-strings.ts`).
 *
 * Everything the prelude needs from the language is captured into locals first and invoked through
 * `Reflect.apply` or plain calls, never through a method lookup on a built-in prototype a script could replace.
 *
 * It returns one function, `exec(code, thisNodeJson, asGlobal)`, which runs a form script and returns a JSON
 * envelope: `{ ok: true, value }` or `{ ok: false, error: { name, message, stack, internal } }`. A thrown value is
 * reduced to its own data properties; no getter, `toString` or Proxy trap of the thrown object is ever run.
 * Scripts run through an indirect-eval runner created in global scope, so the prelude's locals (including the
 * bridge) are not visible to them.
 *
 * Evaluated as `(function (B, CFG) { ... })`; the host calls it once with the bridge-function object and a JSON
 * config `{ xfa: { id, cls }, arrayLength, valueDepth, zone: { fixed, offsetMs } }`.
 *
 * Authoring rules: ES5 syntax, no template literals (this file embeds the source with `String.raw`).
 */
export const PRELUDE_SOURCE: string = String.raw`(function (B, CFG) {
  'use strict';
  var g = globalThis;
  var JSONparse = JSON.parse;
  var JSONstringify = JSON.stringify;
  var cfg = JSONparse(CFG);
  var reflectApply = Reflect.apply;
  var isArray = Array.isArray;
  var objToString = Object.prototype.toString;
  var defineProperty = Object.defineProperty;
  var getDescriptor = Object.getOwnPropertyDescriptor;
  var getProto = Object.getPrototypeOf;
  var createObject = Object.create;
  var ProxyCtor = Proxy;
  var NumberFn = Number;
  var StringFn = String;
  var isFiniteFn = isFinite;
  var floor = Math.floor;
  var ErrorCtor = Error;
  var TypeErrorCtor = TypeError;
  var InternalErrorProto = InternalError.prototype;
  var SymbolIterator = Symbol.iterator;
  var strSlice = String.prototype.slice;
  var boolValueOf = Boolean.prototype.valueOf;
  var OrigDate = Date;
  var ArrayCtor = Array;
  var ArrayProto = Array.prototype;
  var evalFn = eval;
  var mapGet = Map.prototype.get;
  var mapSet = Map.prototype.set;
  var weakGet = WeakMap.prototype.get;
  var weakSet = WeakMap.prototype.set;
  var weakSetAdd = WeakSet.prototype.add;
  var weakSetHas = WeakSet.prototype.has;

  var wrappers = new Map();
  var refs = new WeakMap();
  var lists = new WeakSet();
  var methodKinds = createObject(null);
  var hostMethodKinds = createObject(null);
  var UNDEF = { $t: 'undef' };

  function refOf(value) { return reflectApply(weakGet, refs, [value]); }
  function clip(text, max) { return text.length > max ? reflectApply(strSlice, text, [0, max]) : text; }
  function tagOf(v) { return v !== null && typeof v === 'object' && !isArray(v) ? v.$t : undefined; }

  function rpc(name, args) {
    return JSONparse(B[name](JSONstringify(args)));
  }

  function unsupported(cls, member) {
    // In strict mode this call throws on the host side (fatal, uncatchable by the script); otherwise it only records.
    rpc('log', ['unsupported', { 'class': cls, member: member }]);
    return undefined;
  }

  function dec(w) {
    if (w === null || typeof w !== 'object') { return w; }
    if (isArray(w)) {
      var out = [];
      for (var i = 0; i < w.length; i++) { out[i] = dec(w[i]); }
      return out;
    }
    switch (w.$t) {
      case 'undef': return undefined;
      case 'num': return NumberFn(w.v);
      case 'node': return wrap(w.id, w.cls, undefined);
      case 'nodes': return makeList(w.nodes);
    }
    throw new TypeErrorCtor('unexpected bridge value');
  }

  function enc(v, depth) {
    switch (typeof v) {
      case 'string':
      case 'boolean':
        return v;
      case 'number':
        return isFiniteFn(v) ? v : { $t: 'num', v: StringFn(v) };
      case 'undefined':
        return UNDEF;
      case 'object':
        if (v === null) { return null; }
        var ref = refOf(v);
        if (ref !== undefined) { return { $t: 'node', id: ref.id, cls: ref.cls }; }
        if (reflectApply(weakSetHas, lists, [v])) { return encodeList(v); }
        if (isArray(v)) {
          if (depth >= cfg.valueDepth) { throw new TypeErrorCtor('value is nested too deeply to pass to the host'); }
          var out = [];
          for (var i = 0; i < v.length; i++) { out[i] = enc(v[i], depth + 1); }
          return out;
        }
        var kind = reflectApply(objToString, v, []);
        if (kind === '[object String]') { return StringFn(v); }
        if (kind === '[object Number]') { return enc(NumberFn(v), depth); }
        if (kind === '[object Boolean]') { return reflectApply(boolValueOf, v, []); }
        throw new TypeErrorCtor('value cannot be passed to the host (' + kind + ')');
      default:
        throw new TypeErrorCtor('value cannot be passed to the host (' + typeof v + ')');
    }
  }

  // A list is rebuilt from its entries on every send: each must still be a node wrapper this prelude made, so editing
  // an entry cannot mint an id, and no hidden property holds ids to tamper with.
  function encodeList(list) {
    var nodes = [];
    for (var i = 0; i < list.length; i++) {
      var ref = refOf(list[i]);
      if (ref === undefined) { throw new TypeErrorCtor('node list entry ' + i + ' is not a node'); }
      nodes[i] = { id: ref.id, cls: ref.cls };
    }
    return { $t: 'nodes', nodes: nodes };
  }

  function settle(reply, cls, member) {
    switch (tagOf(reply)) {
      case 'unsupported': return unsupported(cls, member);
      case 'error': throw new ErrorCtor(StringFn(reply.message));
    }
    return dec(reply);
  }

  function encodeArgs(list) {
    var out = [];
    for (var i = 0; i < list.length; i++) { out[i] = enc(list[i], 0); }
    return out;
  }

  function method(ref, name) {
    return function () {
      return settle(rpc('call', [ref.id, name, encodeArgs(arguments)]), ref.cls, name);
    };
  }

  function resolver(ref, many) {
    return function (expression) {
      return settle(rpc('resolve', [ref.id, StringFn(expression), many]), ref.cls, many ? 'resolveNodes' : 'resolveNode');
    };
  }

  function wrap(id, cls, hostObj) {
    var cached = reflectApply(mapGet, wrappers, [id]);
    if (cached !== undefined) { return cached; }
    var ref = { id: id, cls: cls };
    var proxy = new ProxyCtor({}, {
      get: function (target, prop) {
        if (typeof prop !== 'string') { return undefined; }
        if (hostObj !== undefined && prop === 'host') { return hostObj; }
        if (prop === 'resolveNode') { return resolver(ref, false); }
        if (prop === 'resolveNodes') { return resolver(ref, true); }
        if (prop === 'toString') { return function () { return '[object ' + ref.cls + ']'; }; }
        if (prop === 'valueOf' || prop === 'toJSON') { return undefined; }
        if (methodKinds[ref.cls + '.' + prop] === true) { return method(ref, prop); }
        var reply = rpc('get', [ref.id, prop]);
        if (tagOf(reply) === 'fn') {
          methodKinds[ref.cls + '.' + prop] = true;
          return method(ref, prop);
        }
        return settle(reply, ref.cls, prop);
      },
      set: function (target, prop, value) {
        if (typeof prop !== 'string') { return true; }
        settle(rpc('set', [ref.id, prop, enc(value, 0)]), ref.cls, prop);
        return true;
      }
    });
    reflectApply(mapSet, wrappers, [id, proxy]);
    reflectApply(weakSet, refs, [proxy, ref]);
    return proxy;
  }

  function makeList(nodeRefs) {
    var list = {};
    var nodes = [];
    for (var i = 0; i < nodeRefs.length; i++) {
      nodes[i] = wrap(nodeRefs[i].id, nodeRefs[i].cls, undefined);
      list[i] = nodes[i];
    }
    defineProperty(list, 'length', { value: nodeRefs.length });
    defineProperty(list, 'item', {
      value: function (index) {
        var at = floor(NumberFn(index));
        return at >= 0 && at < nodes.length ? nodes[at] : null;
      }
    });
    reflectApply(weakSetAdd, lists, [list]);
    return list;
  }

  function hostMethod(prefix, name) {
    var member = prefix + '.' + name;
    return function () {
      return settle(rpc('host', ['call', member, encodeArgs(arguments)]), prefix, name);
    };
  }

  function hostObject(prefix) {
    return new ProxyCtor({}, {
      get: function (target, prop) {
        if (typeof prop !== 'string') { return undefined; }
        if (prop === 'toString') { return function () { return '[object ' + prefix + ']'; }; }
        if (prop === 'valueOf' || prop === 'toJSON') { return undefined; }
        var member = prefix + '.' + prop;
        if (hostMethodKinds[member] === true) { return hostMethod(prefix, prop); }
        var reply = rpc('host', ['get', member, []]);
        if (tagOf(reply) === 'fn') {
          hostMethodKinds[member] = true;
          return hostMethod(prefix, prop);
        }
        return settle(reply, prefix, prop);
      },
      set: function (target, prop, value) {
        if (typeof prop !== 'string') { return true; }
        settle(rpc('host', ['set', prefix + '.' + prop, [enc(value, 0)]]), prefix, prop);
        return true;
      }
    });
  }

  ${DATE_LAYER_SOURCE}

  // ---- native-loop guard -------------------------------------------------------------------------------------------
  // QuickJS checks its interrupt flag only in bytecode, so a native builtin looping over a billion-element array can
  // never be stopped by the deadline. The length is read without running guest code (own/inherited data properties
  // only; no Proxy exists to lie), coerced as the engine would, and anything over the cap, or whose length cannot be
  // determined without running guest code, ends the run.
  var cap = cfg.arrayLength;

  function lengthValue(v) {
    switch (typeof v) {
      case 'number': return v;
      case 'string': return NumberFn(v);
      case 'boolean': return v ? 1 : 0;
      case 'object': return v === null ? 0 : Infinity;
      case 'function': return Infinity;
      default: return 0;
    }
  }

  function lengthOf(target) {
    if (target === null || target === undefined) { return 0; }
    var kind = typeof target;
    if (kind === 'string') { return target.length; }
    if (kind !== 'object' && kind !== 'function') { return 0; }
    if (isArray(target)) { return target.length; }
    var o = target;
    for (var hops = 0; o !== null && o !== undefined; hops++) {
      if (hops >= 64) { return Infinity; }
      var d = getDescriptor(o, 'length');
      if (d !== undefined) { return 'value' in d ? lengthValue(d.value) : Infinity; }
      o = getProto(o);
    }
    return 0;
  }

  function guardNative(original, spread) {
    return function () {
      if (lengthOf(this) > cap) { B.limit('array-length'); }
      if (spread) {
        for (var i = 0; i < arguments.length; i++) {
          var arg = arguments[i];
          if (typeof arg === 'object' && arg !== null && lengthOf(arg) > cap) { B.limit('array-length'); }
        }
      }
      return reflectApply(original, this, arguments);
    };
  }

  function installArrayGuards() {
    var names = ['join', 'toString', 'toLocaleString', 'indexOf', 'lastIndexOf', 'includes', 'reverse', 'sort', 'slice',
      'splice', 'concat', 'forEach', 'map', 'filter', 'some', 'every', 'reduce', 'reduceRight', 'fill', 'copyWithin',
      'flat', 'flatMap', 'find', 'findIndex', 'findLast', 'findLastIndex', 'shift', 'unshift', 'at', 'with',
      'toReversed', 'toSorted', 'toSpliced', 'keys', 'entries'];
    function put(target, name, fn) {
      defineProperty(target, name, { value: fn, writable: true, configurable: true, enumerable: false });
    }
    for (var i = 0; i < names.length; i++) {
      var original = ArrayProto[names[i]];
      if (typeof original === 'function') { put(ArrayProto, names[i], guardNative(original, names[i] === 'concat')); }
    }
    // for-of, spread, new Set(array), Array.from(array) and friends all reach an array through values()/@@iterator.
    var values = guardNative(ArrayProto.values, false);
    put(ArrayProto, 'values', values);
    put(ArrayProto, SymbolIterator, values);
    var from = ArrayCtor.from;
    put(ArrayCtor, 'from', function (items) {
      if (typeof items === 'object' && items !== null && lengthOf(items) > cap) { B.limit('array-length'); }
      return reflectApply(from, this, arguments);
    });
  }

  ${STRING_GUARD_SOURCE}

  // ---- script runner -----------------------------------------------------------------------------------------------
  function inherits(value, proto) {
    var o = getProto(value);
    for (var hops = 0; o !== null && hops < 64; hops++) {
      if (o === proto) { return true; }
      o = getProto(o);
    }
    return false;
  }

  function dataString(obj, key) {
    var o = obj;
    for (var hops = 0; o !== null && o !== undefined && hops < 16; hops++) {
      var d = getDescriptor(o, key);
      if (d !== undefined) { return 'value' in d && typeof d.value === 'string' ? d.value : undefined; }
      o = getProto(o);
    }
    return undefined;
  }

  // Reads a thrown value without running any of its code: own and inherited DATA properties only.
  function describe(thrown) {
    var info = { name: 'Error', message: '', stack: '', internal: false };
    try {
      var kind = typeof thrown;
      if (kind === 'string') {
        info.message = clip(thrown, 2000);
      } else if (kind === 'number' || kind === 'boolean') {
        info.message = StringFn(thrown);
      } else if (thrown !== null && (kind === 'object' || kind === 'function')) {
        var name = dataString(thrown, 'name');
        var message = dataString(thrown, 'message');
        var stack = dataString(thrown, 'stack');
        if (name !== undefined) { info.name = clip(name, 64); }
        if (message !== undefined) { info.message = clip(message, 2000); }
        if (stack !== undefined) { info.stack = clip(stack, 4000); }
        info.internal = inherits(thrown, InternalErrorProto);
      }
    } catch (ignored) {
      info.message = 'error description unavailable';
    }
    return info;
  }

  function encodeResult(value) {
    try { return enc(value, 0); } catch (ignored) { return UNDEF; }
  }

  installClock();
  installArrayGuards();
  installStringGuards();
  var xfaRoot = wrap(cfg.xfa.id, cfg.xfa.cls, hostObject('host'));
  function lockGlobal(name, value) {
    defineProperty(g, name, { value: value, writable: false, configurable: false, enumerable: false });
  }
  lockGlobal('xfa', xfaRoot);
  lockGlobal('app', hostObject('app'));
  lockGlobal('console', hostObject('console'));
  lockGlobal('eval', evalFn);
  // Nothing in an ES3 form needs Proxy, and without it a script cannot put a trap in front of an array or its length.
  // InternalError stays reachable only through an engine error the script already caught.
  delete g.Proxy;
  delete g.InternalError;

  // Created by indirect eval, i.e. in global scope, and given the real eval as a parameter: the runner's direct eval
  // cannot see this closure or the bridge, and replacing the global eval cannot redirect it.
  var run = reflectApply(evalFn, undefined, ['(function (eval) { return function xfaRun(c) { return eval(c); }; })'])(evalFn);

  return function exec(code, thisJson, asGlobal) {
    try {
      var result;
      if (asGlobal) {
        result = reflectApply(evalFn, undefined, [code]);
      } else {
        var r = thisJson === '' ? undefined : JSONparse(thisJson);
        result = reflectApply(run, r === undefined ? undefined : wrap(r.id, r.cls, undefined), [code]);
      }
      return JSONstringify({ ok: true, value: encodeResult(result) });
    } catch (thrown) {
      B.headroom();
      return JSONstringify({ ok: false, error: describe(thrown) });
    }
  };
})`;
