/**
 * The guest `Date` layer (plan decision D9), spliced into the prelude in place of a plain clock wrapper. It makes the
 * guest `Date` a function of two injected values and nothing else: the clock (`B.now`) and the zone (`cfg.zone`, plus
 * `B.tz` for a zone whose offset changes). The process timezone never reaches a script.
 *
 * What it replaces on `Date.prototype`: the local getters (`getFullYear` ... `getTimezoneOffset`, `getYear`), the local
 * setters (`setFullYear` ... `setYear`) and the string forms (`toString`, `toDateString`, `toTimeString`, `toLocale*`).
 * Each one converts the instant to wall-clock fields with the zone offset, then uses the engine's own UTC getters and
 * setters on a scratch date, so range, rollover and `NaN` rules stay the engine's. The constructor reads
 * `new Date(y, m, d, ...)` as local time in the zone, `new Date(string)` and `Date.parse` read a local-form string in
 * the zone, and `Date()` prints the injected "now". `getUTC*`, `getTime`, `toISOString`, `Date.UTC` are untouched.
 *
 * Local to UTC (a wall-clock reading that daylight saving makes ambiguous): a time that happens twice takes the first
 * occurrence, a time that does not exist is read with the offset from before the switch (ECMAScript's rule).
 *
 * String parsing: a string is taken as absolute (and parsed by the engine as it is) when it is a date-only ISO form (UTC
 * by the language), ends in `Z` or in a numeric offset that follows a time of day (`hh:mm`), or names GMT, UTC, UT or a North American zone abbreviation. Any
 * other string is local time: the engine is asked to read it as UTC (by appending `Z`, else ` GMT`), which yields its
 * wall-clock fields without the process zone, and those fields are then placed in the zone. A string with some other
 * zone word is therefore read as local; the real forms parse no strings.
 *
 * Authoring rules as for the prelude: ES5, no template literals, natives captured first and called through
 * `reflectApply`, so a script that replaces `Date.prototype.getUTCDate` or `RegExp.prototype.exec` cannot redirect them.
 * Inherits `B`, `cfg`, `g`, `OrigDate`, `defineProperty`, `reflectApply`, `NumberFn`, `StringFn` and `floor` from the prelude.
 */
export const DATE_LAYER_SOURCE: string = String.raw`function installClock() {
    var proto = OrigDate.prototype;
    var zone = cfg.zone;
    var DAY = 86400000;
    var MINUTE = 60000;
    var DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var nativeGetTime = proto.getTime;
    var nativeSetTime = proto.setTime;
    var nativeUTC = OrigDate.UTC;
    var nativeParse = OrigDate.parse;
    var rxExec = RegExp.prototype.exec;
    var DATE_ONLY = /^[+-]?\d{4,6}(?:-\d\d(?:-\d\d)?)?$/;
    var ENDS_WITH_OFFSET = /(?:[zZ]|\d\d:\d\d(?::\d\d(?:\.\d+)?)?\s*[+-]\d\d(?::?\d\d)?)\s*$/;
    var NAMES_A_ZONE = /\b(?:GMT|UTC|UT|[ECMP][SD]T)\b/i;

    function offsetAt(t) { return zone.fixed ? zone.offsetMs : B.tz(t); }
    function matches(rx, text) { return reflectApply(rxExec, rx, [text]) !== null; }
    function pad(n, width) {
      var s = StringFn(n < 0 ? 0 - n : n);
      while (s.length < width) { s = '0' + s; }
      return s;
    }

    // A wall-clock reading (milliseconds, as if it were UTC) to the instant it names in the zone.
    function localToUtc(w) {
      if (w !== w) { return NaN; }
      if (zone.fixed) { return w - zone.offsetMs; }
      var before = offsetAt(w - DAY);
      var after = offsetAt(w + DAY);
      var offsets = before === after ? [before] : [before, after];
      var best = NaN;
      for (var i = 0; i < offsets.length; i++) {
        var u = w - offsets[i];
        if (offsetAt(u) === offsets[i] && (best !== best || u < best)) { best = u; }
      }
      return best === best ? best : w - before;
    }

    // A scratch Date holding the wall-clock fields of the instant 'd' in the zone; null when 'd' is invalid.
    function wallOf(d) {
      var t = reflectApply(nativeGetTime, d, []);
      return t === t ? new OrigDate(t + offsetAt(t)) : null;
    }

    function parseInZone(text) {
      if (matches(DATE_ONLY, text) || matches(ENDS_WITH_OFFSET, text) || matches(NAMES_A_ZONE, text)) {
        return reflectApply(nativeParse, undefined, [text]);
      }
      // No zone in the text: have the engine read its wall-clock fields as UTC (so the process zone cannot matter), then place them in the zone.
      var wall = reflectApply(nativeParse, undefined, [text + 'Z']);
      if (wall !== wall) { wall = reflectApply(nativeParse, undefined, [text + ' GMT']); }
      return localToUtc(wall);
    }

    function put(name, fn, length) {
      defineProperty(fn, 'name', { value: name, configurable: true });
      defineProperty(fn, 'length', { value: length, configurable: true });
      defineProperty(proto, name, { value: fn, writable: true, configurable: true, enumerable: false });
    }

    function localGetter(name, utcName, shift) {
      var utcGet = proto[utcName];
      put(name, function () {
        var w = wallOf(this);
        return w === null ? NaN : reflectApply(utcGet, w, []) - shift;
      }, 0);
    }
    localGetter('getFullYear', 'getUTCFullYear', 0);
    localGetter('getYear', 'getUTCFullYear', 1900);
    localGetter('getMonth', 'getUTCMonth', 0);
    localGetter('getDate', 'getUTCDate', 0);
    localGetter('getDay', 'getUTCDay', 0);
    localGetter('getHours', 'getUTCHours', 0);
    localGetter('getMinutes', 'getUTCMinutes', 0);
    localGetter('getSeconds', 'getUTCSeconds', 0);
    localGetter('getMilliseconds', 'getUTCMilliseconds', 0);
    put('getTimezoneOffset', function () {
      var t = reflectApply(nativeGetTime, this, []);
      return t === t ? (t - (t + offsetAt(t))) / MINUTE : NaN;
    }, 0);

    function localSetter(name, utcName, length) {
      var utcSet = proto[utcName];
      put(name, function () {
        var w = wallOf(this);
        if (w === null) { w = new OrigDate(name === 'setFullYear' ? 0 : NaN); }
        reflectApply(utcSet, w, arguments);
        var wall = reflectApply(nativeGetTime, w, []);
        return reflectApply(nativeSetTime, this, [localToUtc(wall)]);
      }, length);
    }
    localSetter('setMilliseconds', 'setUTCMilliseconds', 1);
    localSetter('setSeconds', 'setUTCSeconds', 2);
    localSetter('setMinutes', 'setUTCMinutes', 3);
    localSetter('setHours', 'setUTCHours', 4);
    localSetter('setDate', 'setUTCDate', 1);
    localSetter('setMonth', 'setUTCMonth', 2);
    localSetter('setFullYear', 'setUTCFullYear', 3);
    var setFullYear = proto.setFullYear;
    put('setYear', function (year) {
      var n = NumberFn(year);
      var whole = n < 0 ? 0 - floor(0 - n) : floor(n);
      return reflectApply(setFullYear, this, [whole >= 0 && whole <= 99 ? 1900 + whole : n]);
    }, 1);

    // ---- string forms: the engine's own shapes, with the zone's wall-clock fields -------------------------------------
    var getUtc = {
      year: proto.getUTCFullYear, month: proto.getUTCMonth, date: proto.getUTCDate, day: proto.getUTCDay,
      hours: proto.getUTCHours, minutes: proto.getUTCMinutes, seconds: proto.getUTCSeconds
    };
    function fields(d) {
      var w = wallOf(d);
      if (w === null) { return null; }
      var t = reflectApply(nativeGetTime, d, []);
      return {
        year: reflectApply(getUtc.year, w, []), month: reflectApply(getUtc.month, w, []), date: reflectApply(getUtc.date, w, []),
        day: reflectApply(getUtc.day, w, []), hours: reflectApply(getUtc.hours, w, []), minutes: reflectApply(getUtc.minutes, w, []),
        seconds: reflectApply(getUtc.seconds, w, []), offset: offsetAt(t)
      };
    }
    function yearText(y) { return y < 0 ? '-' + pad(y, 4) : pad(y, 4); }
    function dateText(f) { return DAY_NAMES[f.day] + ' ' + MONTH_NAMES[f.month] + ' ' + pad(f.date, 2) + ' ' + yearText(f.year); }
    function clockText(f) { return pad(f.hours, 2) + ':' + pad(f.minutes, 2) + ':' + pad(f.seconds, 2); }
    function zoneText(f) {
      var minutes = floor((f.offset < 0 ? 0 - f.offset : f.offset) / MINUTE);
      return 'GMT' + (f.offset < 0 ? '-' : '+') + pad(floor(minutes / 60), 2) + pad(minutes % 60, 2);
    }
    function localDateText(f) { return pad(f.month + 1, 2) + '/' + pad(f.date, 2) + '/' + yearText(f.year); }
    function localTimeText(f) { return pad(f.hours % 12 === 0 ? 12 : f.hours % 12, 2) + ':' + pad(f.minutes, 2) + ':' + pad(f.seconds, 2) + (f.hours < 12 ? ' AM' : ' PM'); }
    function stringForm(name, render) {
      put(name, function () {
        var f = fields(this);
        return f === null ? 'Invalid Date' : render(f);
      }, 0);
    }
    stringForm('toString', function (f) { return dateText(f) + ' ' + clockText(f) + ' ' + zoneText(f); });
    var zonedToString = proto.toString;
    stringForm('toDateString', dateText);
    stringForm('toTimeString', function (f) { return clockText(f) + ' ' + zoneText(f); });
    stringForm('toLocaleString', function (f) { return localDateText(f) + ', ' + localTimeText(f); });
    stringForm('toLocaleDateString', localDateText);
    stringForm('toLocaleTimeString', localTimeText);

    // ---- the constructor --------------------------------------------------------------------------------------------------
    function InjectedDate(a, b, c, d, e, f, h) {
      if (!(this instanceof InjectedDate)) { return reflectApply(zonedToString, new OrigDate(B.now()), []); }
      switch (arguments.length) {
        case 0: return new OrigDate(B.now());
        case 1: return new OrigDate(typeof a === 'string' ? parseInZone(a) : a);
        default: return new OrigDate(localToUtc(reflectApply(nativeUTC, undefined, arguments)));
      }
    }
    InjectedDate.prototype = proto;
    InjectedDate.now = function () { return B.now(); };
    InjectedDate.UTC = OrigDate.UTC;
    InjectedDate.parse = function parse(text) { return parseInZone(StringFn(text)); };
    defineProperty(InjectedDate, 'name', { value: 'Date', configurable: true });
    defineProperty(InjectedDate, 'length', { value: 7, configurable: true });
    defineProperty(proto, 'constructor', { value: InjectedDate, writable: true, configurable: true, enumerable: false });
    defineProperty(g, 'Date', { value: InjectedDate, writable: false, configurable: false, enumerable: false });
  }`;
