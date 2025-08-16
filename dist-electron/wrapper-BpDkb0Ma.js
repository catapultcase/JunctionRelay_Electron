import ot from "events";
import $t from "https";
import at from "http";
import Bt from "net";
import Rt from "tls";
import Le from "crypto";
import X from "stream";
import Dt from "url";
import Ut from "zlib";
import It from "buffer";
function Z(s) {
  return s && s.__esModule && Object.prototype.hasOwnProperty.call(s, "default") ? s.default : s;
}
function lt(s) {
  if (s.__esModule) return s;
  var e = s.default;
  if (typeof e == "function") {
    var t = function r() {
      return this instanceof r ? Reflect.construct(e, arguments, this.constructor) : e.apply(this, arguments);
    };
    t.prototype = e.prototype;
  } else t = {};
  return Object.defineProperty(t, "__esModule", { value: !0 }), Object.keys(s).forEach(function(r) {
    var i = Object.getOwnPropertyDescriptor(s, r);
    Object.defineProperty(t, r, i.get ? i : {
      enumerable: !0,
      get: function() {
        return s[r];
      }
    });
  }), t;
}
var oe = { exports: {} };
const ft = ["nodebuffer", "arraybuffer", "fragments"], ht = typeof Blob < "u";
ht && ft.push("blob");
var L = {
  BINARY_TYPES: ft,
  EMPTY_BUFFER: Buffer.alloc(0),
  GUID: "258EAFA5-E914-47DA-95CA-C5AB0DC85B11",
  hasBlob: ht,
  kForOnEventAttribute: Symbol("kIsForOnEventAttribute"),
  kListener: Symbol("kListener"),
  kStatusCode: Symbol("status-code"),
  kWebSocket: Symbol("websocket"),
  NOOP: () => {
  }
};
const Mt = {}, Wt = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: Mt
}, Symbol.toStringTag, { value: "Module" })), At = /* @__PURE__ */ lt(Wt);
var Ft, jt;
const { EMPTY_BUFFER: Gt } = L, Oe = Buffer[Symbol.species];
function Vt(s, e) {
  if (s.length === 0) return Gt;
  if (s.length === 1) return s[0];
  const t = Buffer.allocUnsafe(e);
  let r = 0;
  for (let i = 0; i < s.length; i++) {
    const n = s[i];
    t.set(n, r), r += n.length;
  }
  return r < e ? new Oe(t.buffer, t.byteOffset, r) : t;
}
function ct(s, e, t, r, i) {
  for (let n = 0; n < i; n++)
    t[r + n] = s[n] ^ e[n & 3];
}
function ut(s, e) {
  for (let t = 0; t < s.length; t++)
    s[t] ^= e[t & 3];
}
function zt(s) {
  return s.length === s.buffer.byteLength ? s.buffer : s.buffer.slice(s.byteOffset, s.byteOffset + s.length);
}
function ke(s) {
  if (ke.readOnly = !0, Buffer.isBuffer(s)) return s;
  let e;
  return s instanceof ArrayBuffer ? e = new Oe(s) : ArrayBuffer.isView(s) ? e = new Oe(s.buffer, s.byteOffset, s.byteLength) : (e = Buffer.from(s), ke.readOnly = !1), e;
}
oe.exports = {
  concat: Vt,
  mask: ct,
  toArrayBuffer: zt,
  toBuffer: ke,
  unmask: ut
};
if (!process.env.WS_NO_BUFFER_UTIL)
  try {
    const s = At;
    jt = oe.exports.mask = function(e, t, r, i, n) {
      n < 48 ? ct(e, t, r, i, n) : s.mask(e, t, r, i, n);
    }, Ft = oe.exports.unmask = function(e, t) {
      e.length < 32 ? ut(e, t) : s.unmask(e, t);
    };
  } catch {
  }
var he = oe.exports;
const Re = Symbol("kDone"), me = Symbol("kRun");
let qt = class {
  /**
   * Creates a new `Limiter`.
   *
   * @param {Number} [concurrency=Infinity] The maximum number of jobs allowed
   *     to run concurrently
   */
  constructor(e) {
    this[Re] = () => {
      this.pending--, this[me]();
    }, this.concurrency = e || 1 / 0, this.jobs = [], this.pending = 0;
  }
  /**
   * Adds a job to the queue.
   *
   * @param {Function} job The job to run
   * @public
   */
  add(e) {
    this.jobs.push(e), this[me]();
  }
  /**
   * Removes a job from the queue and runs it if possible.
   *
   * @private
   */
  [me]() {
    if (this.pending !== this.concurrency && this.jobs.length) {
      const e = this.jobs.shift();
      this.pending++, e(this[Re]);
    }
  }
};
var Ht = qt;
const z = Ut, De = he, Yt = Ht, { kStatusCode: dt } = L, Kt = Buffer[Symbol.species], Xt = Buffer.from([0, 0, 255, 255]), ae = Symbol("permessage-deflate"), O = Symbol("total-length"), W = Symbol("callback"), T = Symbol("buffers"), F = Symbol("error");
let J, Zt = class {
  /**
   * Creates a PerMessageDeflate instance.
   *
   * @param {Object} [options] Configuration options
   * @param {(Boolean|Number)} [options.clientMaxWindowBits] Advertise support
   *     for, or request, a custom client window size
   * @param {Boolean} [options.clientNoContextTakeover=false] Advertise/
   *     acknowledge disabling of client context takeover
   * @param {Number} [options.concurrencyLimit=10] The number of concurrent
   *     calls to zlib
   * @param {(Boolean|Number)} [options.serverMaxWindowBits] Request/confirm the
   *     use of a custom server window size
   * @param {Boolean} [options.serverNoContextTakeover=false] Request/accept
   *     disabling of server context takeover
   * @param {Number} [options.threshold=1024] Size (in bytes) below which
   *     messages should not be compressed if context takeover is disabled
   * @param {Object} [options.zlibDeflateOptions] Options to pass to zlib on
   *     deflate
   * @param {Object} [options.zlibInflateOptions] Options to pass to zlib on
   *     inflate
   * @param {Boolean} [isServer=false] Create the instance in either server or
   *     client mode
   * @param {Number} [maxPayload=0] The maximum allowed message length
   */
  constructor(e, t, r) {
    if (this._maxPayload = r | 0, this._options = e || {}, this._threshold = this._options.threshold !== void 0 ? this._options.threshold : 1024, this._isServer = !!t, this._deflate = null, this._inflate = null, this.params = null, !J) {
      const i = this._options.concurrencyLimit !== void 0 ? this._options.concurrencyLimit : 10;
      J = new Yt(i);
    }
  }
  /**
   * @type {String}
   */
  static get extensionName() {
    return "permessage-deflate";
  }
  /**
   * Create an extension negotiation offer.
   *
   * @return {Object} Extension parameters
   * @public
   */
  offer() {
    const e = {};
    return this._options.serverNoContextTakeover && (e.server_no_context_takeover = !0), this._options.clientNoContextTakeover && (e.client_no_context_takeover = !0), this._options.serverMaxWindowBits && (e.server_max_window_bits = this._options.serverMaxWindowBits), this._options.clientMaxWindowBits ? e.client_max_window_bits = this._options.clientMaxWindowBits : this._options.clientMaxWindowBits == null && (e.client_max_window_bits = !0), e;
  }
  /**
   * Accept an extension negotiation offer/response.
   *
   * @param {Array} configurations The extension negotiation offers/reponse
   * @return {Object} Accepted configuration
   * @public
   */
  accept(e) {
    return e = this.normalizeParams(e), this.params = this._isServer ? this.acceptAsServer(e) : this.acceptAsClient(e), this.params;
  }
  /**
   * Releases all resources used by the extension.
   *
   * @public
   */
  cleanup() {
    if (this._inflate && (this._inflate.close(), this._inflate = null), this._deflate) {
      const e = this._deflate[W];
      this._deflate.close(), this._deflate = null, e && e(
        new Error(
          "The deflate stream was closed while data was being processed"
        )
      );
    }
  }
  /**
   *  Accept an extension negotiation offer.
   *
   * @param {Array} offers The extension negotiation offers
   * @return {Object} Accepted configuration
   * @private
   */
  acceptAsServer(e) {
    const t = this._options, r = e.find((i) => !(t.serverNoContextTakeover === !1 && i.server_no_context_takeover || i.server_max_window_bits && (t.serverMaxWindowBits === !1 || typeof t.serverMaxWindowBits == "number" && t.serverMaxWindowBits > i.server_max_window_bits) || typeof t.clientMaxWindowBits == "number" && !i.client_max_window_bits));
    if (!r)
      throw new Error("None of the extension offers can be accepted");
    return t.serverNoContextTakeover && (r.server_no_context_takeover = !0), t.clientNoContextTakeover && (r.client_no_context_takeover = !0), typeof t.serverMaxWindowBits == "number" && (r.server_max_window_bits = t.serverMaxWindowBits), typeof t.clientMaxWindowBits == "number" ? r.client_max_window_bits = t.clientMaxWindowBits : (r.client_max_window_bits === !0 || t.clientMaxWindowBits === !1) && delete r.client_max_window_bits, r;
  }
  /**
   * Accept the extension negotiation response.
   *
   * @param {Array} response The extension negotiation response
   * @return {Object} Accepted configuration
   * @private
   */
  acceptAsClient(e) {
    const t = e[0];
    if (this._options.clientNoContextTakeover === !1 && t.client_no_context_takeover)
      throw new Error('Unexpected parameter "client_no_context_takeover"');
    if (!t.client_max_window_bits)
      typeof this._options.clientMaxWindowBits == "number" && (t.client_max_window_bits = this._options.clientMaxWindowBits);
    else if (this._options.clientMaxWindowBits === !1 || typeof this._options.clientMaxWindowBits == "number" && t.client_max_window_bits > this._options.clientMaxWindowBits)
      throw new Error(
        'Unexpected or invalid parameter "client_max_window_bits"'
      );
    return t;
  }
  /**
   * Normalize parameters.
   *
   * @param {Array} configurations The extension negotiation offers/reponse
   * @return {Array} The offers/response with normalized parameters
   * @private
   */
  normalizeParams(e) {
    return e.forEach((t) => {
      Object.keys(t).forEach((r) => {
        let i = t[r];
        if (i.length > 1)
          throw new Error(`Parameter "${r}" must have only a single value`);
        if (i = i[0], r === "client_max_window_bits") {
          if (i !== !0) {
            const n = +i;
            if (!Number.isInteger(n) || n < 8 || n > 15)
              throw new TypeError(
                `Invalid value for parameter "${r}": ${i}`
              );
            i = n;
          } else if (!this._isServer)
            throw new TypeError(
              `Invalid value for parameter "${r}": ${i}`
            );
        } else if (r === "server_max_window_bits") {
          const n = +i;
          if (!Number.isInteger(n) || n < 8 || n > 15)
            throw new TypeError(
              `Invalid value for parameter "${r}": ${i}`
            );
          i = n;
        } else if (r === "client_no_context_takeover" || r === "server_no_context_takeover") {
          if (i !== !0)
            throw new TypeError(
              `Invalid value for parameter "${r}": ${i}`
            );
        } else
          throw new Error(`Unknown parameter "${r}"`);
        t[r] = i;
      });
    }), e;
  }
  /**
   * Decompress data. Concurrency limited.
   *
   * @param {Buffer} data Compressed data
   * @param {Boolean} fin Specifies whether or not this is the last fragment
   * @param {Function} callback Callback
   * @public
   */
  decompress(e, t, r) {
    J.add((i) => {
      this._decompress(e, t, (n, o) => {
        i(), r(n, o);
      });
    });
  }
  /**
   * Compress data. Concurrency limited.
   *
   * @param {(Buffer|String)} data Data to compress
   * @param {Boolean} fin Specifies whether or not this is the last fragment
   * @param {Function} callback Callback
   * @public
   */
  compress(e, t, r) {
    J.add((i) => {
      this._compress(e, t, (n, o) => {
        i(), r(n, o);
      });
    });
  }
  /**
   * Decompress data.
   *
   * @param {Buffer} data Compressed data
   * @param {Boolean} fin Specifies whether or not this is the last fragment
   * @param {Function} callback Callback
   * @private
   */
  _decompress(e, t, r) {
    const i = this._isServer ? "client" : "server";
    if (!this._inflate) {
      const n = `${i}_max_window_bits`, o = typeof this.params[n] != "number" ? z.Z_DEFAULT_WINDOWBITS : this.params[n];
      this._inflate = z.createInflateRaw({
        ...this._options.zlibInflateOptions,
        windowBits: o
      }), this._inflate[ae] = this, this._inflate[O] = 0, this._inflate[T] = [], this._inflate.on("error", Jt), this._inflate.on("data", _t);
    }
    this._inflate[W] = r, this._inflate.write(e), t && this._inflate.write(Xt), this._inflate.flush(() => {
      const n = this._inflate[F];
      if (n) {
        this._inflate.close(), this._inflate = null, r(n);
        return;
      }
      const o = De.concat(
        this._inflate[T],
        this._inflate[O]
      );
      this._inflate._readableState.endEmitted ? (this._inflate.close(), this._inflate = null) : (this._inflate[O] = 0, this._inflate[T] = [], t && this.params[`${i}_no_context_takeover`] && this._inflate.reset()), r(null, o);
    });
  }
  /**
   * Compress data.
   *
   * @param {(Buffer|String)} data Data to compress
   * @param {Boolean} fin Specifies whether or not this is the last fragment
   * @param {Function} callback Callback
   * @private
   */
  _compress(e, t, r) {
    const i = this._isServer ? "server" : "client";
    if (!this._deflate) {
      const n = `${i}_max_window_bits`, o = typeof this.params[n] != "number" ? z.Z_DEFAULT_WINDOWBITS : this.params[n];
      this._deflate = z.createDeflateRaw({
        ...this._options.zlibDeflateOptions,
        windowBits: o
      }), this._deflate[O] = 0, this._deflate[T] = [], this._deflate.on("data", Qt);
    }
    this._deflate[W] = r, this._deflate.write(e), this._deflate.flush(z.Z_SYNC_FLUSH, () => {
      if (!this._deflate)
        return;
      let n = De.concat(
        this._deflate[T],
        this._deflate[O]
      );
      t && (n = new Kt(n.buffer, n.byteOffset, n.length - 4)), this._deflate[W] = null, this._deflate[O] = 0, this._deflate[T] = [], t && this.params[`${i}_no_context_takeover`] && this._deflate.reset(), r(null, n);
    });
  }
};
var ce = Zt;
function Qt(s) {
  this[T].push(s), this[O] += s.length;
}
function _t(s) {
  if (this[O] += s.length, this[ae]._maxPayload < 1 || this[O] <= this[ae]._maxPayload) {
    this[T].push(s);
    return;
  }
  this[F] = new RangeError("Max payload size exceeded"), this[F].code = "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH", this[F][dt] = 1009, this.removeListener("data", _t), this.reset();
}
function Jt(s) {
  if (this[ae]._inflate = null, this[F]) {
    this[W](this[F]);
    return;
  }
  s[dt] = 1007, this[W](s);
}
var le = { exports: {} };
const es = {}, ts = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: es
}, Symbol.toStringTag, { value: "Module" })), ss = /* @__PURE__ */ lt(ts);
var Ue;
const { isUtf8: Ie } = It, { hasBlob: rs } = L, is = [
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  // 0 - 15
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  // 16 - 31
  0,
  1,
  0,
  1,
  1,
  1,
  1,
  1,
  0,
  0,
  1,
  1,
  0,
  1,
  1,
  0,
  // 32 - 47
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  0,
  0,
  0,
  0,
  0,
  0,
  // 48 - 63
  0,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  // 64 - 79
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  0,
  0,
  0,
  1,
  1,
  // 80 - 95
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  // 96 - 111
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  0,
  1,
  0,
  1,
  0
  // 112 - 127
];
function ns(s) {
  return s >= 1e3 && s <= 1014 && s !== 1004 && s !== 1005 && s !== 1006 || s >= 3e3 && s <= 4999;
}
function Te(s) {
  const e = s.length;
  let t = 0;
  for (; t < e; )
    if (!(s[t] & 128))
      t++;
    else if ((s[t] & 224) === 192) {
      if (t + 1 === e || (s[t + 1] & 192) !== 128 || (s[t] & 254) === 192)
        return !1;
      t += 2;
    } else if ((s[t] & 240) === 224) {
      if (t + 2 >= e || (s[t + 1] & 192) !== 128 || (s[t + 2] & 192) !== 128 || s[t] === 224 && (s[t + 1] & 224) === 128 || // Overlong
      s[t] === 237 && (s[t + 1] & 224) === 160)
        return !1;
      t += 3;
    } else if ((s[t] & 248) === 240) {
      if (t + 3 >= e || (s[t + 1] & 192) !== 128 || (s[t + 2] & 192) !== 128 || (s[t + 3] & 192) !== 128 || s[t] === 240 && (s[t + 1] & 240) === 128 || // Overlong
      s[t] === 244 && s[t + 1] > 143 || s[t] > 244)
        return !1;
      t += 4;
    } else
      return !1;
  return !0;
}
function os(s) {
  return rs && typeof s == "object" && typeof s.arrayBuffer == "function" && typeof s.type == "string" && typeof s.stream == "function" && (s[Symbol.toStringTag] === "Blob" || s[Symbol.toStringTag] === "File");
}
le.exports = {
  isBlob: os,
  isValidStatusCode: ns,
  isValidUTF8: Te,
  tokenChars: is
};
if (Ie)
  Ue = le.exports.isValidUTF8 = function(s) {
    return s.length < 24 ? Te(s) : Ie(s);
  };
else if (!process.env.WS_NO_UTF_8_VALIDATE)
  try {
    const s = ss;
    Ue = le.exports.isValidUTF8 = function(e) {
      return e.length < 32 ? Te(e) : s(e);
    };
  } catch {
  }
var Q = le.exports;
const { Writable: as } = X, Me = ce, {
  BINARY_TYPES: ls,
  EMPTY_BUFFER: We,
  kStatusCode: fs,
  kWebSocket: hs
} = L, { concat: ge, toArrayBuffer: cs, unmask: us } = he, { isValidStatusCode: ds, isValidUTF8: Ae } = Q, ee = Buffer[Symbol.species], v = 0, Fe = 1, je = 2, Ge = 3, ye = 4, Se = 5, te = 6;
let _s = class extends as {
  /**
   * Creates a Receiver instance.
   *
   * @param {Object} [options] Options object
   * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
   *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
   *     multiple times in the same tick
   * @param {String} [options.binaryType=nodebuffer] The type for binary data
   * @param {Object} [options.extensions] An object containing the negotiated
   *     extensions
   * @param {Boolean} [options.isServer=false] Specifies whether to operate in
   *     client or server mode
   * @param {Number} [options.maxPayload=0] The maximum allowed message length
   * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
   *     not to skip UTF-8 validation for text and close messages
   */
  constructor(e = {}) {
    super(), this._allowSynchronousEvents = e.allowSynchronousEvents !== void 0 ? e.allowSynchronousEvents : !0, this._binaryType = e.binaryType || ls[0], this._extensions = e.extensions || {}, this._isServer = !!e.isServer, this._maxPayload = e.maxPayload | 0, this._skipUTF8Validation = !!e.skipUTF8Validation, this[hs] = void 0, this._bufferedBytes = 0, this._buffers = [], this._compressed = !1, this._payloadLength = 0, this._mask = void 0, this._fragmented = 0, this._masked = !1, this._fin = !1, this._opcode = 0, this._totalPayloadLength = 0, this._messageLength = 0, this._fragments = [], this._errored = !1, this._loop = !1, this._state = v;
  }
  /**
   * Implements `Writable.prototype._write()`.
   *
   * @param {Buffer} chunk The chunk of data to write
   * @param {String} encoding The character encoding of `chunk`
   * @param {Function} cb Callback
   * @private
   */
  _write(e, t, r) {
    if (this._opcode === 8 && this._state == v) return r();
    this._bufferedBytes += e.length, this._buffers.push(e), this.startLoop(r);
  }
  /**
   * Consumes `n` bytes from the buffered data.
   *
   * @param {Number} n The number of bytes to consume
   * @return {Buffer} The consumed bytes
   * @private
   */
  consume(e) {
    if (this._bufferedBytes -= e, e === this._buffers[0].length) return this._buffers.shift();
    if (e < this._buffers[0].length) {
      const r = this._buffers[0];
      return this._buffers[0] = new ee(
        r.buffer,
        r.byteOffset + e,
        r.length - e
      ), new ee(r.buffer, r.byteOffset, e);
    }
    const t = Buffer.allocUnsafe(e);
    do {
      const r = this._buffers[0], i = t.length - e;
      e >= r.length ? t.set(this._buffers.shift(), i) : (t.set(new Uint8Array(r.buffer, r.byteOffset, e), i), this._buffers[0] = new ee(
        r.buffer,
        r.byteOffset + e,
        r.length - e
      )), e -= r.length;
    } while (e > 0);
    return t;
  }
  /**
   * Starts the parsing loop.
   *
   * @param {Function} cb Callback
   * @private
   */
  startLoop(e) {
    this._loop = !0;
    do
      switch (this._state) {
        case v:
          this.getInfo(e);
          break;
        case Fe:
          this.getPayloadLength16(e);
          break;
        case je:
          this.getPayloadLength64(e);
          break;
        case Ge:
          this.getMask();
          break;
        case ye:
          this.getData(e);
          break;
        case Se:
        case te:
          this._loop = !1;
          return;
      }
    while (this._loop);
    this._errored || e();
  }
  /**
   * Reads the first two bytes of a frame.
   *
   * @param {Function} cb Callback
   * @private
   */
  getInfo(e) {
    if (this._bufferedBytes < 2) {
      this._loop = !1;
      return;
    }
    const t = this.consume(2);
    if (t[0] & 48) {
      const i = this.createError(
        RangeError,
        "RSV2 and RSV3 must be clear",
        !0,
        1002,
        "WS_ERR_UNEXPECTED_RSV_2_3"
      );
      e(i);
      return;
    }
    const r = (t[0] & 64) === 64;
    if (r && !this._extensions[Me.extensionName]) {
      const i = this.createError(
        RangeError,
        "RSV1 must be clear",
        !0,
        1002,
        "WS_ERR_UNEXPECTED_RSV_1"
      );
      e(i);
      return;
    }
    if (this._fin = (t[0] & 128) === 128, this._opcode = t[0] & 15, this._payloadLength = t[1] & 127, this._opcode === 0) {
      if (r) {
        const i = this.createError(
          RangeError,
          "RSV1 must be clear",
          !0,
          1002,
          "WS_ERR_UNEXPECTED_RSV_1"
        );
        e(i);
        return;
      }
      if (!this._fragmented) {
        const i = this.createError(
          RangeError,
          "invalid opcode 0",
          !0,
          1002,
          "WS_ERR_INVALID_OPCODE"
        );
        e(i);
        return;
      }
      this._opcode = this._fragmented;
    } else if (this._opcode === 1 || this._opcode === 2) {
      if (this._fragmented) {
        const i = this.createError(
          RangeError,
          `invalid opcode ${this._opcode}`,
          !0,
          1002,
          "WS_ERR_INVALID_OPCODE"
        );
        e(i);
        return;
      }
      this._compressed = r;
    } else if (this._opcode > 7 && this._opcode < 11) {
      if (!this._fin) {
        const i = this.createError(
          RangeError,
          "FIN must be set",
          !0,
          1002,
          "WS_ERR_EXPECTED_FIN"
        );
        e(i);
        return;
      }
      if (r) {
        const i = this.createError(
          RangeError,
          "RSV1 must be clear",
          !0,
          1002,
          "WS_ERR_UNEXPECTED_RSV_1"
        );
        e(i);
        return;
      }
      if (this._payloadLength > 125 || this._opcode === 8 && this._payloadLength === 1) {
        const i = this.createError(
          RangeError,
          `invalid payload length ${this._payloadLength}`,
          !0,
          1002,
          "WS_ERR_INVALID_CONTROL_PAYLOAD_LENGTH"
        );
        e(i);
        return;
      }
    } else {
      const i = this.createError(
        RangeError,
        `invalid opcode ${this._opcode}`,
        !0,
        1002,
        "WS_ERR_INVALID_OPCODE"
      );
      e(i);
      return;
    }
    if (!this._fin && !this._fragmented && (this._fragmented = this._opcode), this._masked = (t[1] & 128) === 128, this._isServer) {
      if (!this._masked) {
        const i = this.createError(
          RangeError,
          "MASK must be set",
          !0,
          1002,
          "WS_ERR_EXPECTED_MASK"
        );
        e(i);
        return;
      }
    } else if (this._masked) {
      const i = this.createError(
        RangeError,
        "MASK must be clear",
        !0,
        1002,
        "WS_ERR_UNEXPECTED_MASK"
      );
      e(i);
      return;
    }
    this._payloadLength === 126 ? this._state = Fe : this._payloadLength === 127 ? this._state = je : this.haveLength(e);
  }
  /**
   * Gets extended payload length (7+16).
   *
   * @param {Function} cb Callback
   * @private
   */
  getPayloadLength16(e) {
    if (this._bufferedBytes < 2) {
      this._loop = !1;
      return;
    }
    this._payloadLength = this.consume(2).readUInt16BE(0), this.haveLength(e);
  }
  /**
   * Gets extended payload length (7+64).
   *
   * @param {Function} cb Callback
   * @private
   */
  getPayloadLength64(e) {
    if (this._bufferedBytes < 8) {
      this._loop = !1;
      return;
    }
    const t = this.consume(8), r = t.readUInt32BE(0);
    if (r > Math.pow(2, 21) - 1) {
      const i = this.createError(
        RangeError,
        "Unsupported WebSocket frame: payload length > 2^53 - 1",
        !1,
        1009,
        "WS_ERR_UNSUPPORTED_DATA_PAYLOAD_LENGTH"
      );
      e(i);
      return;
    }
    this._payloadLength = r * Math.pow(2, 32) + t.readUInt32BE(4), this.haveLength(e);
  }
  /**
   * Payload length has been read.
   *
   * @param {Function} cb Callback
   * @private
   */
  haveLength(e) {
    if (this._payloadLength && this._opcode < 8 && (this._totalPayloadLength += this._payloadLength, this._totalPayloadLength > this._maxPayload && this._maxPayload > 0)) {
      const t = this.createError(
        RangeError,
        "Max payload size exceeded",
        !1,
        1009,
        "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
      );
      e(t);
      return;
    }
    this._masked ? this._state = Ge : this._state = ye;
  }
  /**
   * Reads mask bytes.
   *
   * @private
   */
  getMask() {
    if (this._bufferedBytes < 4) {
      this._loop = !1;
      return;
    }
    this._mask = this.consume(4), this._state = ye;
  }
  /**
   * Reads data bytes.
   *
   * @param {Function} cb Callback
   * @private
   */
  getData(e) {
    let t = We;
    if (this._payloadLength) {
      if (this._bufferedBytes < this._payloadLength) {
        this._loop = !1;
        return;
      }
      t = this.consume(this._payloadLength), this._masked && this._mask[0] | this._mask[1] | this._mask[2] | this._mask[3] && us(t, this._mask);
    }
    if (this._opcode > 7) {
      this.controlMessage(t, e);
      return;
    }
    if (this._compressed) {
      this._state = Se, this.decompress(t, e);
      return;
    }
    t.length && (this._messageLength = this._totalPayloadLength, this._fragments.push(t)), this.dataMessage(e);
  }
  /**
   * Decompresses data.
   *
   * @param {Buffer} data Compressed data
   * @param {Function} cb Callback
   * @private
   */
  decompress(e, t) {
    this._extensions[Me.extensionName].decompress(e, this._fin, (i, n) => {
      if (i) return t(i);
      if (n.length) {
        if (this._messageLength += n.length, this._messageLength > this._maxPayload && this._maxPayload > 0) {
          const o = this.createError(
            RangeError,
            "Max payload size exceeded",
            !1,
            1009,
            "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
          );
          t(o);
          return;
        }
        this._fragments.push(n);
      }
      this.dataMessage(t), this._state === v && this.startLoop(t);
    });
  }
  /**
   * Handles a data message.
   *
   * @param {Function} cb Callback
   * @private
   */
  dataMessage(e) {
    if (!this._fin) {
      this._state = v;
      return;
    }
    const t = this._messageLength, r = this._fragments;
    if (this._totalPayloadLength = 0, this._messageLength = 0, this._fragmented = 0, this._fragments = [], this._opcode === 2) {
      let i;
      this._binaryType === "nodebuffer" ? i = ge(r, t) : this._binaryType === "arraybuffer" ? i = cs(ge(r, t)) : this._binaryType === "blob" ? i = new Blob(r) : i = r, this._allowSynchronousEvents ? (this.emit("message", i, !0), this._state = v) : (this._state = te, setImmediate(() => {
        this.emit("message", i, !0), this._state = v, this.startLoop(e);
      }));
    } else {
      const i = ge(r, t);
      if (!this._skipUTF8Validation && !Ae(i)) {
        const n = this.createError(
          Error,
          "invalid UTF-8 sequence",
          !0,
          1007,
          "WS_ERR_INVALID_UTF8"
        );
        e(n);
        return;
      }
      this._state === Se || this._allowSynchronousEvents ? (this.emit("message", i, !1), this._state = v) : (this._state = te, setImmediate(() => {
        this.emit("message", i, !1), this._state = v, this.startLoop(e);
      }));
    }
  }
  /**
   * Handles a control message.
   *
   * @param {Buffer} data Data to handle
   * @return {(Error|RangeError|undefined)} A possible error
   * @private
   */
  controlMessage(e, t) {
    if (this._opcode === 8) {
      if (e.length === 0)
        this._loop = !1, this.emit("conclude", 1005, We), this.end();
      else {
        const r = e.readUInt16BE(0);
        if (!ds(r)) {
          const n = this.createError(
            RangeError,
            `invalid status code ${r}`,
            !0,
            1002,
            "WS_ERR_INVALID_CLOSE_CODE"
          );
          t(n);
          return;
        }
        const i = new ee(
          e.buffer,
          e.byteOffset + 2,
          e.length - 2
        );
        if (!this._skipUTF8Validation && !Ae(i)) {
          const n = this.createError(
            Error,
            "invalid UTF-8 sequence",
            !0,
            1007,
            "WS_ERR_INVALID_UTF8"
          );
          t(n);
          return;
        }
        this._loop = !1, this.emit("conclude", r, i), this.end();
      }
      this._state = v;
      return;
    }
    this._allowSynchronousEvents ? (this.emit(this._opcode === 9 ? "ping" : "pong", e), this._state = v) : (this._state = te, setImmediate(() => {
      this.emit(this._opcode === 9 ? "ping" : "pong", e), this._state = v, this.startLoop(t);
    }));
  }
  /**
   * Builds an error object.
   *
   * @param {function(new:Error|RangeError)} ErrorCtor The error constructor
   * @param {String} message The error message
   * @param {Boolean} prefix Specifies whether or not to add a default prefix to
   *     `message`
   * @param {Number} statusCode The status code
   * @param {String} errorCode The exposed error code
   * @return {(Error|RangeError)} The error
   * @private
   */
  createError(e, t, r, i, n) {
    this._loop = !1, this._errored = !0;
    const o = new e(
      r ? `Invalid WebSocket frame: ${t}` : t
    );
    return Error.captureStackTrace(o, this.createError), o.code = n, o[fs] = i, o;
  }
};
var pt = _s;
const Br = /* @__PURE__ */ Z(pt), { Duplex: Rr } = X, { randomFillSync: ps } = Le, Ve = ce, { EMPTY_BUFFER: ms, kWebSocket: gs, NOOP: ys } = L, { isBlob: I, isValidStatusCode: Ss } = Q, { mask: ze, toBuffer: N } = he, x = Symbol("kByteLength"), Es = Buffer.alloc(4), ie = 8 * 1024;
let P, M = ie;
const b = 0, vs = 1, xs = 2;
let bs = class B {
  /**
   * Creates a Sender instance.
   *
   * @param {Duplex} socket The connection socket
   * @param {Object} [extensions] An object containing the negotiated extensions
   * @param {Function} [generateMask] The function used to generate the masking
   *     key
   */
  constructor(e, t, r) {
    this._extensions = t || {}, r && (this._generateMask = r, this._maskBuffer = Buffer.alloc(4)), this._socket = e, this._firstFragment = !0, this._compress = !1, this._bufferedBytes = 0, this._queue = [], this._state = b, this.onerror = ys, this[gs] = void 0;
  }
  /**
   * Frames a piece of data according to the HyBi WebSocket protocol.
   *
   * @param {(Buffer|String)} data The data to frame
   * @param {Object} options Options object
   * @param {Boolean} [options.fin=false] Specifies whether or not to set the
   *     FIN bit
   * @param {Function} [options.generateMask] The function used to generate the
   *     masking key
   * @param {Boolean} [options.mask=false] Specifies whether or not to mask
   *     `data`
   * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
   *     key
   * @param {Number} options.opcode The opcode
   * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
   *     modified
   * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
   *     RSV1 bit
   * @return {(Buffer|String)[]} The framed data
   * @public
   */
  static frame(e, t) {
    let r, i = !1, n = 2, o = !1;
    t.mask && (r = t.maskBuffer || Es, t.generateMask ? t.generateMask(r) : (M === ie && (P === void 0 && (P = Buffer.alloc(ie)), ps(P, 0, ie), M = 0), r[0] = P[M++], r[1] = P[M++], r[2] = P[M++], r[3] = P[M++]), o = (r[0] | r[1] | r[2] | r[3]) === 0, n = 6);
    let l;
    typeof e == "string" ? (!t.mask || o) && t[x] !== void 0 ? l = t[x] : (e = Buffer.from(e), l = e.length) : (l = e.length, i = t.mask && t.readOnly && !o);
    let f = l;
    l >= 65536 ? (n += 8, f = 127) : l > 125 && (n += 2, f = 126);
    const a = Buffer.allocUnsafe(i ? l + n : n);
    return a[0] = t.fin ? t.opcode | 128 : t.opcode, t.rsv1 && (a[0] |= 64), a[1] = f, f === 126 ? a.writeUInt16BE(l, 2) : f === 127 && (a[2] = a[3] = 0, a.writeUIntBE(l, 4, 6)), t.mask ? (a[1] |= 128, a[n - 4] = r[0], a[n - 3] = r[1], a[n - 2] = r[2], a[n - 1] = r[3], o ? [a, e] : i ? (ze(e, r, a, n, l), [a]) : (ze(e, r, e, 0, l), [a, e])) : [a, e];
  }
  /**
   * Sends a close message to the other peer.
   *
   * @param {Number} [code] The status code component of the body
   * @param {(String|Buffer)} [data] The message component of the body
   * @param {Boolean} [mask=false] Specifies whether or not to mask the message
   * @param {Function} [cb] Callback
   * @public
   */
  close(e, t, r, i) {
    let n;
    if (e === void 0)
      n = ms;
    else {
      if (typeof e != "number" || !Ss(e))
        throw new TypeError("First argument must be a valid error code number");
      if (t === void 0 || !t.length)
        n = Buffer.allocUnsafe(2), n.writeUInt16BE(e, 0);
      else {
        const l = Buffer.byteLength(t);
        if (l > 123)
          throw new RangeError("The message must not be greater than 123 bytes");
        n = Buffer.allocUnsafe(2 + l), n.writeUInt16BE(e, 0), typeof t == "string" ? n.write(t, 2) : n.set(t, 2);
      }
    }
    const o = {
      [x]: n.length,
      fin: !0,
      generateMask: this._generateMask,
      mask: r,
      maskBuffer: this._maskBuffer,
      opcode: 8,
      readOnly: !1,
      rsv1: !1
    };
    this._state !== b ? this.enqueue([this.dispatch, n, !1, o, i]) : this.sendFrame(B.frame(n, o), i);
  }
  /**
   * Sends a ping message to the other peer.
   *
   * @param {*} data The message to send
   * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
   * @param {Function} [cb] Callback
   * @public
   */
  ping(e, t, r) {
    let i, n;
    if (typeof e == "string" ? (i = Buffer.byteLength(e), n = !1) : I(e) ? (i = e.size, n = !1) : (e = N(e), i = e.length, n = N.readOnly), i > 125)
      throw new RangeError("The data size must not be greater than 125 bytes");
    const o = {
      [x]: i,
      fin: !0,
      generateMask: this._generateMask,
      mask: t,
      maskBuffer: this._maskBuffer,
      opcode: 9,
      readOnly: n,
      rsv1: !1
    };
    I(e) ? this._state !== b ? this.enqueue([this.getBlobData, e, !1, o, r]) : this.getBlobData(e, !1, o, r) : this._state !== b ? this.enqueue([this.dispatch, e, !1, o, r]) : this.sendFrame(B.frame(e, o), r);
  }
  /**
   * Sends a pong message to the other peer.
   *
   * @param {*} data The message to send
   * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
   * @param {Function} [cb] Callback
   * @public
   */
  pong(e, t, r) {
    let i, n;
    if (typeof e == "string" ? (i = Buffer.byteLength(e), n = !1) : I(e) ? (i = e.size, n = !1) : (e = N(e), i = e.length, n = N.readOnly), i > 125)
      throw new RangeError("The data size must not be greater than 125 bytes");
    const o = {
      [x]: i,
      fin: !0,
      generateMask: this._generateMask,
      mask: t,
      maskBuffer: this._maskBuffer,
      opcode: 10,
      readOnly: n,
      rsv1: !1
    };
    I(e) ? this._state !== b ? this.enqueue([this.getBlobData, e, !1, o, r]) : this.getBlobData(e, !1, o, r) : this._state !== b ? this.enqueue([this.dispatch, e, !1, o, r]) : this.sendFrame(B.frame(e, o), r);
  }
  /**
   * Sends a data message to the other peer.
   *
   * @param {*} data The message to send
   * @param {Object} options Options object
   * @param {Boolean} [options.binary=false] Specifies whether `data` is binary
   *     or text
   * @param {Boolean} [options.compress=false] Specifies whether or not to
   *     compress `data`
   * @param {Boolean} [options.fin=false] Specifies whether the fragment is the
   *     last one
   * @param {Boolean} [options.mask=false] Specifies whether or not to mask
   *     `data`
   * @param {Function} [cb] Callback
   * @public
   */
  send(e, t, r) {
    const i = this._extensions[Ve.extensionName];
    let n = t.binary ? 2 : 1, o = t.compress, l, f;
    typeof e == "string" ? (l = Buffer.byteLength(e), f = !1) : I(e) ? (l = e.size, f = !1) : (e = N(e), l = e.length, f = N.readOnly), this._firstFragment ? (this._firstFragment = !1, o && i && i.params[i._isServer ? "server_no_context_takeover" : "client_no_context_takeover"] && (o = l >= i._threshold), this._compress = o) : (o = !1, n = 0), t.fin && (this._firstFragment = !0);
    const a = {
      [x]: l,
      fin: t.fin,
      generateMask: this._generateMask,
      mask: t.mask,
      maskBuffer: this._maskBuffer,
      opcode: n,
      readOnly: f,
      rsv1: o
    };
    I(e) ? this._state !== b ? this.enqueue([this.getBlobData, e, this._compress, a, r]) : this.getBlobData(e, this._compress, a, r) : this._state !== b ? this.enqueue([this.dispatch, e, this._compress, a, r]) : this.dispatch(e, this._compress, a, r);
  }
  /**
   * Gets the contents of a blob as binary data.
   *
   * @param {Blob} blob The blob
   * @param {Boolean} [compress=false] Specifies whether or not to compress
   *     the data
   * @param {Object} options Options object
   * @param {Boolean} [options.fin=false] Specifies whether or not to set the
   *     FIN bit
   * @param {Function} [options.generateMask] The function used to generate the
   *     masking key
   * @param {Boolean} [options.mask=false] Specifies whether or not to mask
   *     `data`
   * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
   *     key
   * @param {Number} options.opcode The opcode
   * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
   *     modified
   * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
   *     RSV1 bit
   * @param {Function} [cb] Callback
   * @private
   */
  getBlobData(e, t, r, i) {
    this._bufferedBytes += r[x], this._state = xs, e.arrayBuffer().then((n) => {
      if (this._socket.destroyed) {
        const l = new Error(
          "The socket was closed while the blob was being read"
        );
        process.nextTick(Ce, this, l, i);
        return;
      }
      this._bufferedBytes -= r[x];
      const o = N(n);
      t ? this.dispatch(o, t, r, i) : (this._state = b, this.sendFrame(B.frame(o, r), i), this.dequeue());
    }).catch((n) => {
      process.nextTick(ws, this, n, i);
    });
  }
  /**
   * Dispatches a message.
   *
   * @param {(Buffer|String)} data The message to send
   * @param {Boolean} [compress=false] Specifies whether or not to compress
   *     `data`
   * @param {Object} options Options object
   * @param {Boolean} [options.fin=false] Specifies whether or not to set the
   *     FIN bit
   * @param {Function} [options.generateMask] The function used to generate the
   *     masking key
   * @param {Boolean} [options.mask=false] Specifies whether or not to mask
   *     `data`
   * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
   *     key
   * @param {Number} options.opcode The opcode
   * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
   *     modified
   * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
   *     RSV1 bit
   * @param {Function} [cb] Callback
   * @private
   */
  dispatch(e, t, r, i) {
    if (!t) {
      this.sendFrame(B.frame(e, r), i);
      return;
    }
    const n = this._extensions[Ve.extensionName];
    this._bufferedBytes += r[x], this._state = vs, n.compress(e, r.fin, (o, l) => {
      if (this._socket.destroyed) {
        const f = new Error(
          "The socket was closed while data was being compressed"
        );
        Ce(this, f, i);
        return;
      }
      this._bufferedBytes -= r[x], this._state = b, r.readOnly = !1, this.sendFrame(B.frame(l, r), i), this.dequeue();
    });
  }
  /**
   * Executes queued send operations.
   *
   * @private
   */
  dequeue() {
    for (; this._state === b && this._queue.length; ) {
      const e = this._queue.shift();
      this._bufferedBytes -= e[3][x], Reflect.apply(e[0], this, e.slice(1));
    }
  }
  /**
   * Enqueues a send operation.
   *
   * @param {Array} params Send operation parameters.
   * @private
   */
  enqueue(e) {
    this._bufferedBytes += e[3][x], this._queue.push(e);
  }
  /**
   * Sends a frame.
   *
   * @param {(Buffer | String)[]} list The frame to send
   * @param {Function} [cb] Callback
   * @private
   */
  sendFrame(e, t) {
    e.length === 2 ? (this._socket.cork(), this._socket.write(e[0]), this._socket.write(e[1], t), this._socket.uncork()) : this._socket.write(e[0], t);
  }
};
var mt = bs;
function Ce(s, e, t) {
  typeof t == "function" && t(e);
  for (let r = 0; r < s._queue.length; r++) {
    const i = s._queue[r], n = i[i.length - 1];
    typeof n == "function" && n(e);
  }
}
function ws(s, e, t) {
  Ce(s, e, t), s.onerror(e);
}
const Dr = /* @__PURE__ */ Z(mt), { kForOnEventAttribute: q, kListener: Ee } = L, qe = Symbol("kCode"), He = Symbol("kData"), Ye = Symbol("kError"), Ke = Symbol("kMessage"), Xe = Symbol("kReason"), A = Symbol("kTarget"), Ze = Symbol("kType"), Qe = Symbol("kWasClean");
class j {
  /**
   * Create a new `Event`.
   *
   * @param {String} type The name of the event
   * @throws {TypeError} If the `type` argument is not specified
   */
  constructor(e) {
    this[A] = null, this[Ze] = e;
  }
  /**
   * @type {*}
   */
  get target() {
    return this[A];
  }
  /**
   * @type {String}
   */
  get type() {
    return this[Ze];
  }
}
Object.defineProperty(j.prototype, "target", { enumerable: !0 });
Object.defineProperty(j.prototype, "type", { enumerable: !0 });
class ue extends j {
  /**
   * Create a new `CloseEvent`.
   *
   * @param {String} type The name of the event
   * @param {Object} [options] A dictionary object that allows for setting
   *     attributes via object members of the same name
   * @param {Number} [options.code=0] The status code explaining why the
   *     connection was closed
   * @param {String} [options.reason=''] A human-readable string explaining why
   *     the connection was closed
   * @param {Boolean} [options.wasClean=false] Indicates whether or not the
   *     connection was cleanly closed
   */
  constructor(e, t = {}) {
    super(e), this[qe] = t.code === void 0 ? 0 : t.code, this[Xe] = t.reason === void 0 ? "" : t.reason, this[Qe] = t.wasClean === void 0 ? !1 : t.wasClean;
  }
  /**
   * @type {Number}
   */
  get code() {
    return this[qe];
  }
  /**
   * @type {String}
   */
  get reason() {
    return this[Xe];
  }
  /**
   * @type {Boolean}
   */
  get wasClean() {
    return this[Qe];
  }
}
Object.defineProperty(ue.prototype, "code", { enumerable: !0 });
Object.defineProperty(ue.prototype, "reason", { enumerable: !0 });
Object.defineProperty(ue.prototype, "wasClean", { enumerable: !0 });
class Ne extends j {
  /**
   * Create a new `ErrorEvent`.
   *
   * @param {String} type The name of the event
   * @param {Object} [options] A dictionary object that allows for setting
   *     attributes via object members of the same name
   * @param {*} [options.error=null] The error that generated this event
   * @param {String} [options.message=''] The error message
   */
  constructor(e, t = {}) {
    super(e), this[Ye] = t.error === void 0 ? null : t.error, this[Ke] = t.message === void 0 ? "" : t.message;
  }
  /**
   * @type {*}
   */
  get error() {
    return this[Ye];
  }
  /**
   * @type {String}
   */
  get message() {
    return this[Ke];
  }
}
Object.defineProperty(Ne.prototype, "error", { enumerable: !0 });
Object.defineProperty(Ne.prototype, "message", { enumerable: !0 });
class gt extends j {
  /**
   * Create a new `MessageEvent`.
   *
   * @param {String} type The name of the event
   * @param {Object} [options] A dictionary object that allows for setting
   *     attributes via object members of the same name
   * @param {*} [options.data=null] The message content
   */
  constructor(e, t = {}) {
    super(e), this[He] = t.data === void 0 ? null : t.data;
  }
  /**
   * @type {*}
   */
  get data() {
    return this[He];
  }
}
Object.defineProperty(gt.prototype, "data", { enumerable: !0 });
const Os = {
  /**
   * Register an event listener.
   *
   * @param {String} type A string representing the event type to listen for
   * @param {(Function|Object)} handler The listener to add
   * @param {Object} [options] An options object specifies characteristics about
   *     the event listener
   * @param {Boolean} [options.once=false] A `Boolean` indicating that the
   *     listener should be invoked at most once after being added. If `true`,
   *     the listener would be automatically removed when invoked.
   * @public
   */
  addEventListener(s, e, t = {}) {
    for (const i of this.listeners(s))
      if (!t[q] && i[Ee] === e && !i[q])
        return;
    let r;
    if (s === "message")
      r = function(n, o) {
        const l = new gt("message", {
          data: o ? n : n.toString()
        });
        l[A] = this, se(e, this, l);
      };
    else if (s === "close")
      r = function(n, o) {
        const l = new ue("close", {
          code: n,
          reason: o.toString(),
          wasClean: this._closeFrameReceived && this._closeFrameSent
        });
        l[A] = this, se(e, this, l);
      };
    else if (s === "error")
      r = function(n) {
        const o = new Ne("error", {
          error: n,
          message: n.message
        });
        o[A] = this, se(e, this, o);
      };
    else if (s === "open")
      r = function() {
        const n = new j("open");
        n[A] = this, se(e, this, n);
      };
    else
      return;
    r[q] = !!t[q], r[Ee] = e, t.once ? this.once(s, r) : this.on(s, r);
  },
  /**
   * Remove an event listener.
   *
   * @param {String} type A string representing the event type to remove
   * @param {(Function|Object)} handler The listener to remove
   * @public
   */
  removeEventListener(s, e) {
    for (const t of this.listeners(s))
      if (t[Ee] === e && !t[q]) {
        this.removeListener(s, t);
        break;
      }
  }
};
var ks = {
  EventTarget: Os
};
function se(s, e, t) {
  typeof s == "object" && s.handleEvent ? s.handleEvent.call(s, t) : s.call(e, t);
}
const { tokenChars: H } = Q;
function w(s, e, t) {
  s[e] === void 0 ? s[e] = [t] : s[e].push(t);
}
function Ts(s) {
  const e = /* @__PURE__ */ Object.create(null);
  let t = /* @__PURE__ */ Object.create(null), r = !1, i = !1, n = !1, o, l, f = -1, a = -1, h = -1, c = 0;
  for (; c < s.length; c++)
    if (a = s.charCodeAt(c), o === void 0)
      if (h === -1 && H[a] === 1)
        f === -1 && (f = c);
      else if (c !== 0 && (a === 32 || a === 9))
        h === -1 && f !== -1 && (h = c);
      else if (a === 59 || a === 44) {
        if (f === -1)
          throw new SyntaxError(`Unexpected character at index ${c}`);
        h === -1 && (h = c);
        const g = s.slice(f, h);
        a === 44 ? (w(e, g, t), t = /* @__PURE__ */ Object.create(null)) : o = g, f = h = -1;
      } else
        throw new SyntaxError(`Unexpected character at index ${c}`);
    else if (l === void 0)
      if (h === -1 && H[a] === 1)
        f === -1 && (f = c);
      else if (a === 32 || a === 9)
        h === -1 && f !== -1 && (h = c);
      else if (a === 59 || a === 44) {
        if (f === -1)
          throw new SyntaxError(`Unexpected character at index ${c}`);
        h === -1 && (h = c), w(t, s.slice(f, h), !0), a === 44 && (w(e, o, t), t = /* @__PURE__ */ Object.create(null), o = void 0), f = h = -1;
      } else if (a === 61 && f !== -1 && h === -1)
        l = s.slice(f, c), f = h = -1;
      else
        throw new SyntaxError(`Unexpected character at index ${c}`);
    else if (i) {
      if (H[a] !== 1)
        throw new SyntaxError(`Unexpected character at index ${c}`);
      f === -1 ? f = c : r || (r = !0), i = !1;
    } else if (n)
      if (H[a] === 1)
        f === -1 && (f = c);
      else if (a === 34 && f !== -1)
        n = !1, h = c;
      else if (a === 92)
        i = !0;
      else
        throw new SyntaxError(`Unexpected character at index ${c}`);
    else if (a === 34 && s.charCodeAt(c - 1) === 61)
      n = !0;
    else if (h === -1 && H[a] === 1)
      f === -1 && (f = c);
    else if (f !== -1 && (a === 32 || a === 9))
      h === -1 && (h = c);
    else if (a === 59 || a === 44) {
      if (f === -1)
        throw new SyntaxError(`Unexpected character at index ${c}`);
      h === -1 && (h = c);
      let g = s.slice(f, h);
      r && (g = g.replace(/\\/g, ""), r = !1), w(t, l, g), a === 44 && (w(e, o, t), t = /* @__PURE__ */ Object.create(null), o = void 0), l = void 0, f = h = -1;
    } else
      throw new SyntaxError(`Unexpected character at index ${c}`);
  if (f === -1 || n || a === 32 || a === 9)
    throw new SyntaxError("Unexpected end of input");
  h === -1 && (h = c);
  const d = s.slice(f, h);
  return o === void 0 ? w(e, d, t) : (l === void 0 ? w(t, d, !0) : r ? w(t, l, d.replace(/\\/g, "")) : w(t, l, d), w(e, o, t)), e;
}
function Cs(s) {
  return Object.keys(s).map((e) => {
    let t = s[e];
    return Array.isArray(t) || (t = [t]), t.map((r) => [e].concat(
      Object.keys(r).map((i) => {
        let n = r[i];
        return Array.isArray(n) || (n = [n]), n.map((o) => o === !0 ? i : `${i}=${o}`).join("; ");
      })
    ).join("; ")).join(", ");
  }).join(", ");
}
var yt = { format: Cs, parse: Ts };
const Ls = ot, Ns = $t, Ps = at, St = Bt, $s = Rt, { randomBytes: Bs, createHash: Rs } = Le, { Duplex: Ur, Readable: Ir } = X, { URL: ve } = Dt, C = ce, Ds = pt, Us = mt, { isBlob: Is } = Q, {
  BINARY_TYPES: Je,
  EMPTY_BUFFER: re,
  GUID: Ms,
  kForOnEventAttribute: xe,
  kListener: Ws,
  kStatusCode: As,
  kWebSocket: y,
  NOOP: Et
} = L, {
  EventTarget: { addEventListener: Fs, removeEventListener: js }
} = ks, { format: Gs, parse: Vs } = yt, { toBuffer: zs } = he, qs = 30 * 1e3, vt = Symbol("kAborted"), be = [8, 13], k = ["CONNECTING", "OPEN", "CLOSING", "CLOSED"], Hs = /^[!#$%&'*+\-.0-9A-Z^_`|a-z~]+$/;
let p = class _ extends Ls {
  /**
   * Create a new `WebSocket`.
   *
   * @param {(String|URL)} address The URL to which to connect
   * @param {(String|String[])} [protocols] The subprotocols
   * @param {Object} [options] Connection options
   */
  constructor(e, t, r) {
    super(), this._binaryType = Je[0], this._closeCode = 1006, this._closeFrameReceived = !1, this._closeFrameSent = !1, this._closeMessage = re, this._closeTimer = null, this._errorEmitted = !1, this._extensions = {}, this._paused = !1, this._protocol = "", this._readyState = _.CONNECTING, this._receiver = null, this._sender = null, this._socket = null, e !== null ? (this._bufferedAmount = 0, this._isServer = !1, this._redirects = 0, t === void 0 ? t = [] : Array.isArray(t) || (typeof t == "object" && t !== null ? (r = t, t = []) : t = [t]), bt(this, e, t, r)) : (this._autoPong = r.autoPong, this._isServer = !0);
  }
  /**
   * For historical reasons, the custom "nodebuffer" type is used by the default
   * instead of "blob".
   *
   * @type {String}
   */
  get binaryType() {
    return this._binaryType;
  }
  set binaryType(e) {
    Je.includes(e) && (this._binaryType = e, this._receiver && (this._receiver._binaryType = e));
  }
  /**
   * @type {Number}
   */
  get bufferedAmount() {
    return this._socket ? this._socket._writableState.length + this._sender._bufferedBytes : this._bufferedAmount;
  }
  /**
   * @type {String}
   */
  get extensions() {
    return Object.keys(this._extensions).join();
  }
  /**
   * @type {Boolean}
   */
  get isPaused() {
    return this._paused;
  }
  /**
   * @type {Function}
   */
  /* istanbul ignore next */
  get onclose() {
    return null;
  }
  /**
   * @type {Function}
   */
  /* istanbul ignore next */
  get onerror() {
    return null;
  }
  /**
   * @type {Function}
   */
  /* istanbul ignore next */
  get onopen() {
    return null;
  }
  /**
   * @type {Function}
   */
  /* istanbul ignore next */
  get onmessage() {
    return null;
  }
  /**
   * @type {String}
   */
  get protocol() {
    return this._protocol;
  }
  /**
   * @type {Number}
   */
  get readyState() {
    return this._readyState;
  }
  /**
   * @type {String}
   */
  get url() {
    return this._url;
  }
  /**
   * Set up the socket and the internal resources.
   *
   * @param {Duplex} socket The network socket between the server and client
   * @param {Buffer} head The first packet of the upgraded stream
   * @param {Object} options Options object
   * @param {Boolean} [options.allowSynchronousEvents=false] Specifies whether
   *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
   *     multiple times in the same tick
   * @param {Function} [options.generateMask] The function used to generate the
   *     masking key
   * @param {Number} [options.maxPayload=0] The maximum allowed message size
   * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
   *     not to skip UTF-8 validation for text and close messages
   * @private
   */
  setSocket(e, t, r) {
    const i = new Ds({
      allowSynchronousEvents: r.allowSynchronousEvents,
      binaryType: this.binaryType,
      extensions: this._extensions,
      isServer: this._isServer,
      maxPayload: r.maxPayload,
      skipUTF8Validation: r.skipUTF8Validation
    }), n = new Us(e, this._extensions, r.generateMask);
    this._receiver = i, this._sender = n, this._socket = e, i[y] = this, n[y] = this, e[y] = this, i.on("conclude", Xs), i.on("drain", Zs), i.on("error", Qs), i.on("message", Js), i.on("ping", er), i.on("pong", tr), n.onerror = sr, e.setTimeout && e.setTimeout(0), e.setNoDelay && e.setNoDelay(), t.length > 0 && e.unshift(t), e.on("close", kt), e.on("data", de), e.on("end", Tt), e.on("error", Ct), this._readyState = _.OPEN, this.emit("open");
  }
  /**
   * Emit the `'close'` event.
   *
   * @private
   */
  emitClose() {
    if (!this._socket) {
      this._readyState = _.CLOSED, this.emit("close", this._closeCode, this._closeMessage);
      return;
    }
    this._extensions[C.extensionName] && this._extensions[C.extensionName].cleanup(), this._receiver.removeAllListeners(), this._readyState = _.CLOSED, this.emit("close", this._closeCode, this._closeMessage);
  }
  /**
   * Start a closing handshake.
   *
   *          +----------+   +-----------+   +----------+
   *     - - -|ws.close()|-->|close frame|-->|ws.close()|- - -
   *    |     +----------+   +-----------+   +----------+     |
   *          +----------+   +-----------+         |
   * CLOSING  |ws.close()|<--|close frame|<--+-----+       CLOSING
   *          +----------+   +-----------+   |
   *    |           |                        |   +---+        |
   *                +------------------------+-->|fin| - - - -
   *    |         +---+                      |   +---+
   *     - - - - -|fin|<---------------------+
   *              +---+
   *
   * @param {Number} [code] Status code explaining why the connection is closing
   * @param {(String|Buffer)} [data] The reason why the connection is
   *     closing
   * @public
   */
  close(e, t) {
    if (this.readyState !== _.CLOSED) {
      if (this.readyState === _.CONNECTING) {
        E(this, this._req, "WebSocket was closed before the connection was established");
        return;
      }
      if (this.readyState === _.CLOSING) {
        this._closeFrameSent && (this._closeFrameReceived || this._receiver._writableState.errorEmitted) && this._socket.end();
        return;
      }
      this._readyState = _.CLOSING, this._sender.close(e, t, !this._isServer, (r) => {
        r || (this._closeFrameSent = !0, (this._closeFrameReceived || this._receiver._writableState.errorEmitted) && this._socket.end());
      }), Ot(this);
    }
  }
  /**
   * Pause the socket.
   *
   * @public
   */
  pause() {
    this.readyState === _.CONNECTING || this.readyState === _.CLOSED || (this._paused = !0, this._socket.pause());
  }
  /**
   * Send a ping.
   *
   * @param {*} [data] The data to send
   * @param {Boolean} [mask] Indicates whether or not to mask `data`
   * @param {Function} [cb] Callback which is executed when the ping is sent
   * @public
   */
  ping(e, t, r) {
    if (this.readyState === _.CONNECTING)
      throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
    if (typeof e == "function" ? (r = e, e = t = void 0) : typeof t == "function" && (r = t, t = void 0), typeof e == "number" && (e = e.toString()), this.readyState !== _.OPEN) {
      we(this, e, r);
      return;
    }
    t === void 0 && (t = !this._isServer), this._sender.ping(e || re, t, r);
  }
  /**
   * Send a pong.
   *
   * @param {*} [data] The data to send
   * @param {Boolean} [mask] Indicates whether or not to mask `data`
   * @param {Function} [cb] Callback which is executed when the pong is sent
   * @public
   */
  pong(e, t, r) {
    if (this.readyState === _.CONNECTING)
      throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
    if (typeof e == "function" ? (r = e, e = t = void 0) : typeof t == "function" && (r = t, t = void 0), typeof e == "number" && (e = e.toString()), this.readyState !== _.OPEN) {
      we(this, e, r);
      return;
    }
    t === void 0 && (t = !this._isServer), this._sender.pong(e || re, t, r);
  }
  /**
   * Resume the socket.
   *
   * @public
   */
  resume() {
    this.readyState === _.CONNECTING || this.readyState === _.CLOSED || (this._paused = !1, this._receiver._writableState.needDrain || this._socket.resume());
  }
  /**
   * Send a data message.
   *
   * @param {*} data The message to send
   * @param {Object} [options] Options object
   * @param {Boolean} [options.binary] Specifies whether `data` is binary or
   *     text
   * @param {Boolean} [options.compress] Specifies whether or not to compress
   *     `data`
   * @param {Boolean} [options.fin=true] Specifies whether the fragment is the
   *     last one
   * @param {Boolean} [options.mask] Specifies whether or not to mask `data`
   * @param {Function} [cb] Callback which is executed when data is written out
   * @public
   */
  send(e, t, r) {
    if (this.readyState === _.CONNECTING)
      throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
    if (typeof t == "function" && (r = t, t = {}), typeof e == "number" && (e = e.toString()), this.readyState !== _.OPEN) {
      we(this, e, r);
      return;
    }
    const i = {
      binary: typeof e != "string",
      mask: !this._isServer,
      compress: !0,
      fin: !0,
      ...t
    };
    this._extensions[C.extensionName] || (i.compress = !1), this._sender.send(e || re, i, r);
  }
  /**
   * Forcibly close the connection.
   *
   * @public
   */
  terminate() {
    if (this.readyState !== _.CLOSED) {
      if (this.readyState === _.CONNECTING) {
        E(this, this._req, "WebSocket was closed before the connection was established");
        return;
      }
      this._socket && (this._readyState = _.CLOSING, this._socket.destroy());
    }
  }
};
Object.defineProperty(p, "CONNECTING", {
  enumerable: !0,
  value: k.indexOf("CONNECTING")
});
Object.defineProperty(p.prototype, "CONNECTING", {
  enumerable: !0,
  value: k.indexOf("CONNECTING")
});
Object.defineProperty(p, "OPEN", {
  enumerable: !0,
  value: k.indexOf("OPEN")
});
Object.defineProperty(p.prototype, "OPEN", {
  enumerable: !0,
  value: k.indexOf("OPEN")
});
Object.defineProperty(p, "CLOSING", {
  enumerable: !0,
  value: k.indexOf("CLOSING")
});
Object.defineProperty(p.prototype, "CLOSING", {
  enumerable: !0,
  value: k.indexOf("CLOSING")
});
Object.defineProperty(p, "CLOSED", {
  enumerable: !0,
  value: k.indexOf("CLOSED")
});
Object.defineProperty(p.prototype, "CLOSED", {
  enumerable: !0,
  value: k.indexOf("CLOSED")
});
[
  "binaryType",
  "bufferedAmount",
  "extensions",
  "isPaused",
  "protocol",
  "readyState",
  "url"
].forEach((s) => {
  Object.defineProperty(p.prototype, s, { enumerable: !0 });
});
["open", "error", "close", "message"].forEach((s) => {
  Object.defineProperty(p.prototype, `on${s}`, {
    enumerable: !0,
    get() {
      for (const e of this.listeners(s))
        if (e[xe]) return e[Ws];
      return null;
    },
    set(e) {
      for (const t of this.listeners(s))
        if (t[xe]) {
          this.removeListener(s, t);
          break;
        }
      typeof e == "function" && this.addEventListener(s, e, {
        [xe]: !0
      });
    }
  });
});
p.prototype.addEventListener = Fs;
p.prototype.removeEventListener = js;
var xt = p;
function bt(s, e, t, r) {
  const i = {
    allowSynchronousEvents: !0,
    autoPong: !0,
    protocolVersion: be[1],
    maxPayload: 104857600,
    skipUTF8Validation: !1,
    perMessageDeflate: !0,
    followRedirects: !1,
    maxRedirects: 10,
    ...r,
    socketPath: void 0,
    hostname: void 0,
    protocol: void 0,
    timeout: void 0,
    method: "GET",
    host: void 0,
    path: void 0,
    port: void 0
  };
  if (s._autoPong = i.autoPong, !be.includes(i.protocolVersion))
    throw new RangeError(
      `Unsupported protocol version: ${i.protocolVersion} (supported versions: ${be.join(", ")})`
    );
  let n;
  if (e instanceof ve)
    n = e;
  else
    try {
      n = new ve(e);
    } catch {
      throw new SyntaxError(`Invalid URL: ${e}`);
    }
  n.protocol === "http:" ? n.protocol = "ws:" : n.protocol === "https:" && (n.protocol = "wss:"), s._url = n.href;
  const o = n.protocol === "wss:", l = n.protocol === "ws+unix:";
  let f;
  if (n.protocol !== "ws:" && !o && !l ? f = `The URL's protocol must be one of "ws:", "wss:", "http:", "https:", or "ws+unix:"` : l && !n.pathname ? f = "The URL's pathname is empty" : n.hash && (f = "The URL contains a fragment identifier"), f) {
    const u = new SyntaxError(f);
    if (s._redirects === 0)
      throw u;
    ne(s, u);
    return;
  }
  const a = o ? 443 : 80, h = Bs(16).toString("base64"), c = o ? Ns.request : Ps.request, d = /* @__PURE__ */ new Set();
  let g;
  if (i.createConnection = i.createConnection || (o ? Ks : Ys), i.defaultPort = i.defaultPort || a, i.port = n.port || a, i.host = n.hostname.startsWith("[") ? n.hostname.slice(1, -1) : n.hostname, i.headers = {
    ...i.headers,
    "Sec-WebSocket-Version": i.protocolVersion,
    "Sec-WebSocket-Key": h,
    Connection: "Upgrade",
    Upgrade: "websocket"
  }, i.path = n.pathname + n.search, i.timeout = i.handshakeTimeout, i.perMessageDeflate && (g = new C(
    i.perMessageDeflate !== !0 ? i.perMessageDeflate : {},
    !1,
    i.maxPayload
  ), i.headers["Sec-WebSocket-Extensions"] = Gs({
    [C.extensionName]: g.offer()
  })), t.length) {
    for (const u of t) {
      if (typeof u != "string" || !Hs.test(u) || d.has(u))
        throw new SyntaxError(
          "An invalid or duplicated subprotocol was specified"
        );
      d.add(u);
    }
    i.headers["Sec-WebSocket-Protocol"] = t.join(",");
  }
  if (i.origin && (i.protocolVersion < 13 ? i.headers["Sec-WebSocket-Origin"] = i.origin : i.headers.Origin = i.origin), (n.username || n.password) && (i.auth = `${n.username}:${n.password}`), l) {
    const u = i.path.split(":");
    i.socketPath = u[0], i.path = u[1];
  }
  let m;
  if (i.followRedirects) {
    if (s._redirects === 0) {
      s._originalIpc = l, s._originalSecure = o, s._originalHostOrSocketPath = l ? i.socketPath : n.host;
      const u = r && r.headers;
      if (r = { ...r, headers: {} }, u)
        for (const [S, D] of Object.entries(u))
          r.headers[S.toLowerCase()] = D;
    } else if (s.listenerCount("redirect") === 0) {
      const u = l ? s._originalIpc ? i.socketPath === s._originalHostOrSocketPath : !1 : s._originalIpc ? !1 : n.host === s._originalHostOrSocketPath;
      (!u || s._originalSecure && !o) && (delete i.headers.authorization, delete i.headers.cookie, u || delete i.headers.host, i.auth = void 0);
    }
    i.auth && !r.headers.authorization && (r.headers.authorization = "Basic " + Buffer.from(i.auth).toString("base64")), m = s._req = c(i), s._redirects && s.emit("redirect", s.url, m);
  } else
    m = s._req = c(i);
  i.timeout && m.on("timeout", () => {
    E(s, m, "Opening handshake has timed out");
  }), m.on("error", (u) => {
    m === null || m[vt] || (m = s._req = null, ne(s, u));
  }), m.on("response", (u) => {
    const S = u.headers.location, D = u.statusCode;
    if (S && i.followRedirects && D >= 300 && D < 400) {
      if (++s._redirects > i.maxRedirects) {
        E(s, m, "Maximum redirects exceeded");
        return;
      }
      m.abort();
      let G;
      try {
        G = new ve(S, e);
      } catch {
        const U = new SyntaxError(`Invalid URL: ${S}`);
        ne(s, U);
        return;
      }
      bt(s, G, t, r);
    } else s.emit("unexpected-response", m, u) || E(
      s,
      m,
      `Unexpected server response: ${u.statusCode}`
    );
  }), m.on("upgrade", (u, S, D) => {
    if (s.emit("upgrade", u), s.readyState !== p.CONNECTING) return;
    m = s._req = null;
    const G = u.headers.upgrade;
    if (G === void 0 || G.toLowerCase() !== "websocket") {
      E(s, S, "Invalid Upgrade header");
      return;
    }
    const Pe = Rs("sha1").update(h + Ms).digest("base64");
    if (u.headers["sec-websocket-accept"] !== Pe) {
      E(s, S, "Invalid Sec-WebSocket-Accept header");
      return;
    }
    const U = u.headers["sec-websocket-protocol"];
    let V;
    if (U !== void 0 ? d.size ? d.has(U) || (V = "Server sent an invalid subprotocol") : V = "Server sent a subprotocol but none was requested" : d.size && (V = "Server sent no subprotocol"), V) {
      E(s, S, V);
      return;
    }
    U && (s._protocol = U);
    const $e = u.headers["sec-websocket-extensions"];
    if ($e !== void 0) {
      if (!g) {
        E(s, S, "Server sent a Sec-WebSocket-Extensions header but no extension was requested");
        return;
      }
      let _e;
      try {
        _e = Vs($e);
      } catch {
        E(s, S, "Invalid Sec-WebSocket-Extensions header");
        return;
      }
      const Be = Object.keys(_e);
      if (Be.length !== 1 || Be[0] !== C.extensionName) {
        E(s, S, "Server indicated an extension that was not requested");
        return;
      }
      try {
        g.accept(_e[C.extensionName]);
      } catch {
        E(s, S, "Invalid Sec-WebSocket-Extensions header");
        return;
      }
      s._extensions[C.extensionName] = g;
    }
    s.setSocket(S, D, {
      allowSynchronousEvents: i.allowSynchronousEvents,
      generateMask: i.generateMask,
      maxPayload: i.maxPayload,
      skipUTF8Validation: i.skipUTF8Validation
    });
  }), i.finishRequest ? i.finishRequest(m, s) : m.end();
}
function ne(s, e) {
  s._readyState = p.CLOSING, s._errorEmitted = !0, s.emit("error", e), s.emitClose();
}
function Ys(s) {
  return s.path = s.socketPath, St.connect(s);
}
function Ks(s) {
  return s.path = void 0, !s.servername && s.servername !== "" && (s.servername = St.isIP(s.host) ? "" : s.host), $s.connect(s);
}
function E(s, e, t) {
  s._readyState = p.CLOSING;
  const r = new Error(t);
  Error.captureStackTrace(r, E), e.setHeader ? (e[vt] = !0, e.abort(), e.socket && !e.socket.destroyed && e.socket.destroy(), process.nextTick(ne, s, r)) : (e.destroy(r), e.once("error", s.emit.bind(s, "error")), e.once("close", s.emitClose.bind(s)));
}
function we(s, e, t) {
  if (e) {
    const r = Is(e) ? e.size : zs(e).length;
    s._socket ? s._sender._bufferedBytes += r : s._bufferedAmount += r;
  }
  if (t) {
    const r = new Error(
      `WebSocket is not open: readyState ${s.readyState} (${k[s.readyState]})`
    );
    process.nextTick(t, r);
  }
}
function Xs(s, e) {
  const t = this[y];
  t._closeFrameReceived = !0, t._closeMessage = e, t._closeCode = s, t._socket[y] !== void 0 && (t._socket.removeListener("data", de), process.nextTick(wt, t._socket), s === 1005 ? t.close() : t.close(s, e));
}
function Zs() {
  const s = this[y];
  s.isPaused || s._socket.resume();
}
function Qs(s) {
  const e = this[y];
  e._socket[y] !== void 0 && (e._socket.removeListener("data", de), process.nextTick(wt, e._socket), e.close(s[As])), e._errorEmitted || (e._errorEmitted = !0, e.emit("error", s));
}
function et() {
  this[y].emitClose();
}
function Js(s, e) {
  this[y].emit("message", s, e);
}
function er(s) {
  const e = this[y];
  e._autoPong && e.pong(s, !this._isServer, Et), e.emit("ping", s);
}
function tr(s) {
  this[y].emit("pong", s);
}
function wt(s) {
  s.resume();
}
function sr(s) {
  const e = this[y];
  e.readyState !== p.CLOSED && (e.readyState === p.OPEN && (e._readyState = p.CLOSING, Ot(e)), this._socket.end(), e._errorEmitted || (e._errorEmitted = !0, e.emit("error", s)));
}
function Ot(s) {
  s._closeTimer = setTimeout(
    s._socket.destroy.bind(s._socket),
    qs
  );
}
function kt() {
  const s = this[y];
  this.removeListener("close", kt), this.removeListener("data", de), this.removeListener("end", Tt), s._readyState = p.CLOSING;
  let e;
  !this._readableState.endEmitted && !s._closeFrameReceived && !s._receiver._writableState.errorEmitted && (e = s._socket.read()) !== null && s._receiver.write(e), s._receiver.end(), this[y] = void 0, clearTimeout(s._closeTimer), s._receiver._writableState.finished || s._receiver._writableState.errorEmitted ? s.emitClose() : (s._receiver.on("error", et), s._receiver.on("finish", et));
}
function de(s) {
  this[y]._receiver.write(s) || this.pause();
}
function Tt() {
  const s = this[y];
  s._readyState = p.CLOSING, s._receiver.end(), this.end();
}
function Ct() {
  const s = this[y];
  this.removeListener("error", Ct), this.on("error", Et), s && (s._readyState = p.CLOSING, this.destroy());
}
const Mr = /* @__PURE__ */ Z(xt), { Duplex: rr } = X;
function tt(s) {
  s.emit("close");
}
function ir() {
  !this.destroyed && this._writableState.finished && this.destroy();
}
function Lt(s) {
  this.removeListener("error", Lt), this.destroy(), this.listenerCount("error") === 0 && this.emit("error", s);
}
function nr(s, e) {
  let t = !0;
  const r = new rr({
    ...e,
    autoDestroy: !1,
    emitClose: !1,
    objectMode: !1,
    writableObjectMode: !1
  });
  return s.on("message", function(n, o) {
    const l = !o && r._readableState.objectMode ? n.toString() : n;
    r.push(l) || s.pause();
  }), s.once("error", function(n) {
    r.destroyed || (t = !1, r.destroy(n));
  }), s.once("close", function() {
    r.destroyed || r.push(null);
  }), r._destroy = function(i, n) {
    if (s.readyState === s.CLOSED) {
      n(i), process.nextTick(tt, r);
      return;
    }
    let o = !1;
    s.once("error", function(f) {
      o = !0, n(f);
    }), s.once("close", function() {
      o || n(i), process.nextTick(tt, r);
    }), t && s.terminate();
  }, r._final = function(i) {
    if (s.readyState === s.CONNECTING) {
      s.once("open", function() {
        r._final(i);
      });
      return;
    }
    s._socket !== null && (s._socket._writableState.finished ? (i(), r._readableState.endEmitted && r.destroy()) : (s._socket.once("finish", function() {
      i();
    }), s.close()));
  }, r._read = function() {
    s.isPaused && s.resume();
  }, r._write = function(i, n, o) {
    if (s.readyState === s.CONNECTING) {
      s.once("open", function() {
        r._write(i, n, o);
      });
      return;
    }
    s.send(i, o);
  }, r.on("end", ir), r.on("error", Lt), r;
}
var or = nr;
const Wr = /* @__PURE__ */ Z(or), { tokenChars: ar } = Q;
function lr(s) {
  const e = /* @__PURE__ */ new Set();
  let t = -1, r = -1, i = 0;
  for (i; i < s.length; i++) {
    const o = s.charCodeAt(i);
    if (r === -1 && ar[o] === 1)
      t === -1 && (t = i);
    else if (i !== 0 && (o === 32 || o === 9))
      r === -1 && t !== -1 && (r = i);
    else if (o === 44) {
      if (t === -1)
        throw new SyntaxError(`Unexpected character at index ${i}`);
      r === -1 && (r = i);
      const l = s.slice(t, r);
      if (e.has(l))
        throw new SyntaxError(`The "${l}" subprotocol is duplicated`);
      e.add(l), t = r = -1;
    } else
      throw new SyntaxError(`Unexpected character at index ${i}`);
  }
  if (t === -1 || r !== -1)
    throw new SyntaxError("Unexpected end of input");
  const n = s.slice(t, i);
  if (e.has(n))
    throw new SyntaxError(`The "${n}" subprotocol is duplicated`);
  return e.add(n), e;
}
var fr = { parse: lr };
const hr = ot, fe = at, { Duplex: Ar } = X, { createHash: cr } = Le, st = yt, $ = ce, ur = fr, dr = xt, { GUID: _r, kWebSocket: pr } = L, mr = /^[+/0-9A-Za-z]{22}==$/, rt = 0, it = 1, Nt = 2;
class gr extends hr {
  /**
   * Create a `WebSocketServer` instance.
   *
   * @param {Object} options Configuration options
   * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
   *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
   *     multiple times in the same tick
   * @param {Boolean} [options.autoPong=true] Specifies whether or not to
   *     automatically send a pong in response to a ping
   * @param {Number} [options.backlog=511] The maximum length of the queue of
   *     pending connections
   * @param {Boolean} [options.clientTracking=true] Specifies whether or not to
   *     track clients
   * @param {Function} [options.handleProtocols] A hook to handle protocols
   * @param {String} [options.host] The hostname where to bind the server
   * @param {Number} [options.maxPayload=104857600] The maximum allowed message
   *     size
   * @param {Boolean} [options.noServer=false] Enable no server mode
   * @param {String} [options.path] Accept only connections matching this path
   * @param {(Boolean|Object)} [options.perMessageDeflate=false] Enable/disable
   *     permessage-deflate
   * @param {Number} [options.port] The port where to bind the server
   * @param {(http.Server|https.Server)} [options.server] A pre-created HTTP/S
   *     server to use
   * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
   *     not to skip UTF-8 validation for text and close messages
   * @param {Function} [options.verifyClient] A hook to reject connections
   * @param {Function} [options.WebSocket=WebSocket] Specifies the `WebSocket`
   *     class to use. It must be the `WebSocket` class or class that extends it
   * @param {Function} [callback] A listener for the `listening` event
   */
  constructor(e, t) {
    if (super(), e = {
      allowSynchronousEvents: !0,
      autoPong: !0,
      maxPayload: 100 * 1024 * 1024,
      skipUTF8Validation: !1,
      perMessageDeflate: !1,
      handleProtocols: null,
      clientTracking: !0,
      verifyClient: null,
      noServer: !1,
      backlog: null,
      // use default (511 as implemented in net.js)
      server: null,
      host: null,
      path: null,
      port: null,
      WebSocket: dr,
      ...e
    }, e.port == null && !e.server && !e.noServer || e.port != null && (e.server || e.noServer) || e.server && e.noServer)
      throw new TypeError(
        'One and only one of the "port", "server", or "noServer" options must be specified'
      );
    if (e.port != null ? (this._server = fe.createServer((r, i) => {
      const n = fe.STATUS_CODES[426];
      i.writeHead(426, {
        "Content-Length": n.length,
        "Content-Type": "text/plain"
      }), i.end(n);
    }), this._server.listen(
      e.port,
      e.host,
      e.backlog,
      t
    )) : e.server && (this._server = e.server), this._server) {
      const r = this.emit.bind(this, "connection");
      this._removeListeners = Sr(this._server, {
        listening: this.emit.bind(this, "listening"),
        error: this.emit.bind(this, "error"),
        upgrade: (i, n, o) => {
          this.handleUpgrade(i, n, o, r);
        }
      });
    }
    e.perMessageDeflate === !0 && (e.perMessageDeflate = {}), e.clientTracking && (this.clients = /* @__PURE__ */ new Set(), this._shouldEmitClose = !1), this.options = e, this._state = rt;
  }
  /**
   * Returns the bound address, the address family name, and port of the server
   * as reported by the operating system if listening on an IP socket.
   * If the server is listening on a pipe or UNIX domain socket, the name is
   * returned as a string.
   *
   * @return {(Object|String|null)} The address of the server
   * @public
   */
  address() {
    if (this.options.noServer)
      throw new Error('The server is operating in "noServer" mode');
    return this._server ? this._server.address() : null;
  }
  /**
   * Stop the server from accepting new connections and emit the `'close'` event
   * when all existing connections are closed.
   *
   * @param {Function} [cb] A one-time listener for the `'close'` event
   * @public
   */
  close(e) {
    if (this._state === Nt) {
      e && this.once("close", () => {
        e(new Error("The server is not running"));
      }), process.nextTick(Y, this);
      return;
    }
    if (e && this.once("close", e), this._state !== it)
      if (this._state = it, this.options.noServer || this.options.server)
        this._server && (this._removeListeners(), this._removeListeners = this._server = null), this.clients ? this.clients.size ? this._shouldEmitClose = !0 : process.nextTick(Y, this) : process.nextTick(Y, this);
      else {
        const t = this._server;
        this._removeListeners(), this._removeListeners = this._server = null, t.close(() => {
          Y(this);
        });
      }
  }
  /**
   * See if a given request should be handled by this server instance.
   *
   * @param {http.IncomingMessage} req Request object to inspect
   * @return {Boolean} `true` if the request is valid, else `false`
   * @public
   */
  shouldHandle(e) {
    if (this.options.path) {
      const t = e.url.indexOf("?");
      if ((t !== -1 ? e.url.slice(0, t) : e.url) !== this.options.path) return !1;
    }
    return !0;
  }
  /**
   * Handle a HTTP Upgrade request.
   *
   * @param {http.IncomingMessage} req The request object
   * @param {Duplex} socket The network socket between the server and client
   * @param {Buffer} head The first packet of the upgraded stream
   * @param {Function} cb Callback
   * @public
   */
  handleUpgrade(e, t, r, i) {
    t.on("error", nt);
    const n = e.headers["sec-websocket-key"], o = e.headers.upgrade, l = +e.headers["sec-websocket-version"];
    if (e.method !== "GET") {
      R(this, e, t, 405, "Invalid HTTP method");
      return;
    }
    if (o === void 0 || o.toLowerCase() !== "websocket") {
      R(this, e, t, 400, "Invalid Upgrade header");
      return;
    }
    if (n === void 0 || !mr.test(n)) {
      R(this, e, t, 400, "Missing or invalid Sec-WebSocket-Key header");
      return;
    }
    if (l !== 13 && l !== 8) {
      R(this, e, t, 400, "Missing or invalid Sec-WebSocket-Version header", {
        "Sec-WebSocket-Version": "13, 8"
      });
      return;
    }
    if (!this.shouldHandle(e)) {
      K(t, 400);
      return;
    }
    const f = e.headers["sec-websocket-protocol"];
    let a = /* @__PURE__ */ new Set();
    if (f !== void 0)
      try {
        a = ur.parse(f);
      } catch {
        R(this, e, t, 400, "Invalid Sec-WebSocket-Protocol header");
        return;
      }
    const h = e.headers["sec-websocket-extensions"], c = {};
    if (this.options.perMessageDeflate && h !== void 0) {
      const d = new $(
        this.options.perMessageDeflate,
        !0,
        this.options.maxPayload
      );
      try {
        const g = st.parse(h);
        g[$.extensionName] && (d.accept(g[$.extensionName]), c[$.extensionName] = d);
      } catch {
        R(this, e, t, 400, "Invalid or unacceptable Sec-WebSocket-Extensions header");
        return;
      }
    }
    if (this.options.verifyClient) {
      const d = {
        origin: e.headers[`${l === 8 ? "sec-websocket-origin" : "origin"}`],
        secure: !!(e.socket.authorized || e.socket.encrypted),
        req: e
      };
      if (this.options.verifyClient.length === 2) {
        this.options.verifyClient(d, (g, m, u, S) => {
          if (!g)
            return K(t, m || 401, u, S);
          this.completeUpgrade(
            c,
            n,
            a,
            e,
            t,
            r,
            i
          );
        });
        return;
      }
      if (!this.options.verifyClient(d)) return K(t, 401);
    }
    this.completeUpgrade(c, n, a, e, t, r, i);
  }
  /**
   * Upgrade the connection to WebSocket.
   *
   * @param {Object} extensions The accepted extensions
   * @param {String} key The value of the `Sec-WebSocket-Key` header
   * @param {Set} protocols The subprotocols
   * @param {http.IncomingMessage} req The request object
   * @param {Duplex} socket The network socket between the server and client
   * @param {Buffer} head The first packet of the upgraded stream
   * @param {Function} cb Callback
   * @throws {Error} If called more than once with the same socket
   * @private
   */
  completeUpgrade(e, t, r, i, n, o, l) {
    if (!n.readable || !n.writable) return n.destroy();
    if (n[pr])
      throw new Error(
        "server.handleUpgrade() was called more than once with the same socket, possibly due to a misconfiguration"
      );
    if (this._state > rt) return K(n, 503);
    const a = [
      "HTTP/1.1 101 Switching Protocols",
      "Upgrade: websocket",
      "Connection: Upgrade",
      `Sec-WebSocket-Accept: ${cr("sha1").update(t + _r).digest("base64")}`
    ], h = new this.options.WebSocket(null, void 0, this.options);
    if (r.size) {
      const c = this.options.handleProtocols ? this.options.handleProtocols(r, i) : r.values().next().value;
      c && (a.push(`Sec-WebSocket-Protocol: ${c}`), h._protocol = c);
    }
    if (e[$.extensionName]) {
      const c = e[$.extensionName].params, d = st.format({
        [$.extensionName]: [c]
      });
      a.push(`Sec-WebSocket-Extensions: ${d}`), h._extensions = e;
    }
    this.emit("headers", a, i), n.write(a.concat(`\r
`).join(`\r
`)), n.removeListener("error", nt), h.setSocket(n, o, {
      allowSynchronousEvents: this.options.allowSynchronousEvents,
      maxPayload: this.options.maxPayload,
      skipUTF8Validation: this.options.skipUTF8Validation
    }), this.clients && (this.clients.add(h), h.on("close", () => {
      this.clients.delete(h), this._shouldEmitClose && !this.clients.size && process.nextTick(Y, this);
    })), l(h, i);
  }
}
var yr = gr;
function Sr(s, e) {
  for (const t of Object.keys(e)) s.on(t, e[t]);
  return function() {
    for (const r of Object.keys(e))
      s.removeListener(r, e[r]);
  };
}
function Y(s) {
  s._state = Nt, s.emit("close");
}
function nt() {
  this.destroy();
}
function K(s, e, t, r) {
  t = t || fe.STATUS_CODES[e], r = {
    Connection: "close",
    "Content-Type": "text/html",
    "Content-Length": Buffer.byteLength(t),
    ...r
  }, s.once("finish", s.destroy), s.end(
    `HTTP/1.1 ${e} ${fe.STATUS_CODES[e]}\r
` + Object.keys(r).map((i) => `${i}: ${r[i]}`).join(`\r
`) + `\r
\r
` + t
  );
}
function R(s, e, t, r, i, n) {
  if (s.listenerCount("wsClientError")) {
    const o = new Error(i);
    Error.captureStackTrace(o, R), s.emit("wsClientError", o, t, e);
  } else
    K(t, r, i, n);
}
const Fr = /* @__PURE__ */ Z(yr);
export {
  Br as Receiver,
  Dr as Sender,
  Mr as WebSocket,
  Fr as WebSocketServer,
  Wr as createWebSocketStream,
  Mr as default
};
