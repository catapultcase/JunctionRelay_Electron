import { c as J } from "./_commonjsHelpers-DaMA6jEr.js";
import Ye from "os";
import Ae from "events";
import rn from "buffer";
import tn from "dgram";
var te = {}, oe = {}, le = {};
Object.defineProperty(le, "__esModule", { value: !0 });
le.default = cn;
const xe = /[A-Z]/g;
function Fe(i) {
  return i.toLowerCase();
}
function cn(i, t) {
  const d = i.replace(xe, Fe), a = t.replace(xe, Fe);
  return d === a;
}
var de = {}, ae = {};
Object.defineProperty(ae, "__esModule", { value: !0 });
ae.DnsTxt = void 0;
class Ke {
  constructor(t = {}) {
    this.binary = t ? t.binary : !1;
  }
  encode(t = {}) {
    return Object.entries(t).map(([d, a]) => {
      let o = `${d}=${a}`;
      return Buffer.from(o);
    });
  }
  decode(t) {
    var d = {};
    try {
      let o = t.toString().split(/=(.+)/), l = o[0], E = o[1];
      d[l] = E;
    } catch {
    }
    return d;
  }
  decodeAll(t) {
    return t.filter((d) => d.length > 1).map((d) => this.decode(d)).reduce((d, a) => {
      var o = d;
      let [l] = Object.keys(a), [E] = Object.values(a);
      return o[l] = E, o;
    }, {});
  }
}
ae.DnsTxt = Ke;
ae.default = Ke;
var ce = {};
Object.defineProperty(ce, "__esModule", { value: !0 });
ce.toType = ce.toString = void 0;
const ke = (i) => "_" + i, dn = (i) => ["name", "protocol", "subtype"].includes(i), an = (i) => {
  let t = {
    name: i.name,
    protocol: i.protocol,
    subtype: i.subtype
  };
  return Object.entries(t).filter(([a, o]) => dn(a) && o !== void 0).reduce((a, [o, l]) => {
    switch (typeof l) {
      case "object":
        l.map((E) => a.push(ke(E)));
        break;
      default:
        a.push(ke(l));
        break;
    }
    return a;
  }, []).join(".");
};
ce.toString = an;
const sn = (i) => {
  let t = i.split("."), d;
  for (let a in t)
    t[a][0] === "_" && (t[a] = t[a].slice(1));
  return t.includes("sub") && (d = t.shift(), t.shift()), {
    name: t.shift(),
    protocol: t.shift() || null,
    subtype: d
  };
};
ce.toType = sn;
var He = J && J.__importDefault || function(i) {
  return i && i.__esModule ? i : { default: i };
};
Object.defineProperty(de, "__esModule", { value: !0 });
de.Service = void 0;
const qe = He(Ye), on = He(ae), ln = Ae, un = ce, Ee = ".local";
class Xe extends ln.EventEmitter {
  constructor(t) {
    if (super(), this.probe = !0, this.published = !1, this.activated = !1, this.destroyed = !1, this.txtService = new on.default(), !t.name)
      throw new Error("ServiceConfig requires `name` property to be set");
    if (!t.type)
      throw new Error("ServiceConfig requires `type` property to be set");
    if (!t.port)
      throw new Error("ServiceConfig requires `port` property to be set");
    this.name = t.name.split(".").join("-"), this.protocol = t.protocol || "tcp", this.type = (0, un.toString)({ name: t.type, protocol: this.protocol }), this.port = t.port, this.host = t.host || qe.default.hostname(), this.fqdn = `${this.name}.${this.type}${Ee}`, this.txt = t.txt, this.subtypes = t.subtypes, this.disableIPv6 = !!t.disableIPv6;
  }
  records() {
    var t = [this.RecordPTR(this), this.RecordSRV(this), this.RecordTXT(this)];
    for (let a of this.subtypes || [])
      t.push(this.RecordSubtypePTR(this, a));
    let d = Object.values(qe.default.networkInterfaces());
    for (let a of d) {
      let o = a;
      for (let l of o)
        if (!(l.internal || l.mac === "00:00:00:00:00:00"))
          switch (l.family) {
            case "IPv4":
              t.push(this.RecordA(this, l.address));
              break;
            case "IPv6":
              if (this.disableIPv6)
                break;
              t.push(this.RecordAAAA(this, l.address));
              break;
          }
    }
    return t;
  }
  RecordPTR(t) {
    return {
      name: `${t.type}${Ee}`,
      type: "PTR",
      ttl: 28800,
      data: t.fqdn
    };
  }
  RecordSubtypePTR(t, d) {
    return {
      name: `_${d}._sub.${t.type}${Ee}`,
      type: "PTR",
      ttl: 28800,
      data: `${t.name}.${t.type}${Ee}`
    };
  }
  RecordSRV(t) {
    return {
      name: t.fqdn,
      type: "SRV",
      ttl: 120,
      data: {
        port: t.port,
        target: t.host
      }
    };
  }
  RecordTXT(t) {
    return {
      name: t.fqdn,
      type: "TXT",
      ttl: 4500,
      data: this.txtService.encode(t.txt)
    };
  }
  RecordA(t, d) {
    return {
      name: t.host,
      type: "A",
      ttl: 120,
      data: d
    };
  }
  RecordAAAA(t, d) {
    return {
      name: t.host,
      type: "AAAA",
      ttl: 120,
      data: d
    };
  }
}
de.Service = Xe;
de.default = Xe;
var Ve = J && J.__importDefault || function(i) {
  return i && i.__esModule ? i : { default: i };
};
Object.defineProperty(oe, "__esModule", { value: !0 });
oe.Registry = void 0;
const hn = Ve(le), we = Ve(de), yn = 60 * 60 * 1e3, gn = 3, En = function() {
};
class ze {
  constructor(t) {
    this.services = [], this.server = t;
  }
  publish(t) {
    function d(l, E, I) {
      l.activated || (l.activated = !0, E.services.push(l), l instanceof we.default && (I != null && I.probe ? E.probe(E.server.mdns, l, (m) => {
        if (m) {
          l.stop !== void 0 && l.stop(), console.log(new Error("Service name is already in use on the network"));
          return;
        }
        E.announce(E.server, l);
      }) : E.announce(E.server, l)));
    }
    function a(l, E, I) {
      if (I || (I = En), !l.activated || !(l instanceof we.default))
        return process.nextTick(I);
      E.teardown(E.server, l, I);
      const m = E.services.indexOf(l);
      m !== -1 && E.services.splice(m, 1);
    }
    const o = new we.default(t);
    return o.start = d.bind(null, o, this), o.stop = a.bind(null, o, this), o.start({ probe: t.probe !== !1 }), o;
  }
  unpublishAll(t) {
    this.teardown(this.server, this.services, t), this.services = [];
  }
  destroy() {
    this.services.map((t) => t.destroyed = !0);
  }
  probe(t, d, a) {
    var o = !1, l = 0, E;
    const I = () => {
      !d.activated || d.destroyed || t.query(d.fqdn, "ANY", function() {
        o = !0, E = setTimeout(++l < 3 ? I : P, 250), E.unref();
      });
    }, m = (g) => {
      o && (g.answers.some(O) || g.additionals.some(O)) && P(!0);
    }, O = (g) => (0, hn.default)(g.name, d.fqdn), P = (g) => {
      t.removeListener("response", m), clearTimeout(E), a(!!g);
    };
    t.on("response", m), setTimeout(I, Math.random() * 250);
  }
  announce(t, d) {
    var a = 1e3, o = d.records();
    t.register(o);
    const l = () => {
      !d.activated || d.destroyed || t.mdns.respond(o, function() {
        d.published || (d.activated = !0, d.published = !0, d.emit("up")), a = a * gn, a < yn && !d.destroyed && setTimeout(l, a).unref();
      });
    };
    l();
  }
  teardown(t, d, a) {
    Array.isArray(d) || (d = [d]), d = d.filter((l) => l.activated);
    var o = d.flatMap(function(l) {
      l.activated = !1;
      var E = l.records();
      return E.forEach((I) => {
        I.ttl = 0;
      }), E;
    });
    if (o.length === 0)
      return a && process.nextTick(a);
    t.unregister(o), t.mdns.respond(o, function() {
      d.forEach(function(l) {
        l.published = !1;
      }), typeof a == "function" && a.apply(null, arguments);
    });
  }
}
oe.Registry = ze;
oe.default = ze;
var ue = {}, Ge = {}, Te = {};
Te.toString = function(i) {
  switch (i) {
    case 1:
      return "A";
    case 10:
      return "NULL";
    case 28:
      return "AAAA";
    case 18:
      return "AFSDB";
    case 42:
      return "APL";
    case 257:
      return "CAA";
    case 60:
      return "CDNSKEY";
    case 59:
      return "CDS";
    case 37:
      return "CERT";
    case 5:
      return "CNAME";
    case 49:
      return "DHCID";
    case 32769:
      return "DLV";
    case 39:
      return "DNAME";
    case 48:
      return "DNSKEY";
    case 43:
      return "DS";
    case 55:
      return "HIP";
    case 13:
      return "HINFO";
    case 45:
      return "IPSECKEY";
    case 25:
      return "KEY";
    case 36:
      return "KX";
    case 29:
      return "LOC";
    case 15:
      return "MX";
    case 35:
      return "NAPTR";
    case 2:
      return "NS";
    case 47:
      return "NSEC";
    case 50:
      return "NSEC3";
    case 51:
      return "NSEC3PARAM";
    case 12:
      return "PTR";
    case 46:
      return "RRSIG";
    case 17:
      return "RP";
    case 24:
      return "SIG";
    case 6:
      return "SOA";
    case 99:
      return "SPF";
    case 33:
      return "SRV";
    case 44:
      return "SSHFP";
    case 32768:
      return "TA";
    case 249:
      return "TKEY";
    case 52:
      return "TLSA";
    case 250:
      return "TSIG";
    case 16:
      return "TXT";
    case 252:
      return "AXFR";
    case 251:
      return "IXFR";
    case 41:
      return "OPT";
    case 255:
      return "ANY";
  }
  return "UNKNOWN_" + i;
};
Te.toType = function(i) {
  switch (i.toUpperCase()) {
    case "A":
      return 1;
    case "NULL":
      return 10;
    case "AAAA":
      return 28;
    case "AFSDB":
      return 18;
    case "APL":
      return 42;
    case "CAA":
      return 257;
    case "CDNSKEY":
      return 60;
    case "CDS":
      return 59;
    case "CERT":
      return 37;
    case "CNAME":
      return 5;
    case "DHCID":
      return 49;
    case "DLV":
      return 32769;
    case "DNAME":
      return 39;
    case "DNSKEY":
      return 48;
    case "DS":
      return 43;
    case "HIP":
      return 55;
    case "HINFO":
      return 13;
    case "IPSECKEY":
      return 45;
    case "KEY":
      return 25;
    case "KX":
      return 36;
    case "LOC":
      return 29;
    case "MX":
      return 15;
    case "NAPTR":
      return 35;
    case "NS":
      return 2;
    case "NSEC":
      return 47;
    case "NSEC3":
      return 50;
    case "NSEC3PARAM":
      return 51;
    case "PTR":
      return 12;
    case "RRSIG":
      return 46;
    case "RP":
      return 17;
    case "SIG":
      return 24;
    case "SOA":
      return 6;
    case "SPF":
      return 99;
    case "SRV":
      return 33;
    case "SSHFP":
      return 44;
    case "TA":
      return 32768;
    case "TKEY":
      return 249;
    case "TLSA":
      return 52;
    case "TSIG":
      return 250;
    case "TXT":
      return 16;
    case "AXFR":
      return 252;
    case "IXFR":
      return 251;
    case "OPT":
      return 41;
    case "ANY":
      return 255;
    case "*":
      return 255;
  }
  return i.toUpperCase().startsWith("UNKNOWN_") ? parseInt(i.slice(8)) : 0;
};
var Be = {};
Be.toString = function(i) {
  switch (i) {
    case 0:
      return "NOERROR";
    case 1:
      return "FORMERR";
    case 2:
      return "SERVFAIL";
    case 3:
      return "NXDOMAIN";
    case 4:
      return "NOTIMP";
    case 5:
      return "REFUSED";
    case 6:
      return "YXDOMAIN";
    case 7:
      return "YXRRSET";
    case 8:
      return "NXRRSET";
    case 9:
      return "NOTAUTH";
    case 10:
      return "NOTZONE";
    case 11:
      return "RCODE_11";
    case 12:
      return "RCODE_12";
    case 13:
      return "RCODE_13";
    case 14:
      return "RCODE_14";
    case 15:
      return "RCODE_15";
  }
  return "RCODE_" + i;
};
Be.toRcode = function(i) {
  switch (i.toUpperCase()) {
    case "NOERROR":
      return 0;
    case "FORMERR":
      return 1;
    case "SERVFAIL":
      return 2;
    case "NXDOMAIN":
      return 3;
    case "NOTIMP":
      return 4;
    case "REFUSED":
      return 5;
    case "YXDOMAIN":
      return 6;
    case "YXRRSET":
      return 7;
    case "NXRRSET":
      return 8;
    case "NOTAUTH":
      return 9;
    case "NOTZONE":
      return 10;
    case "RCODE_11":
      return 11;
    case "RCODE_12":
      return 12;
    case "RCODE_13":
      return 13;
    case "RCODE_14":
      return 14;
    case "RCODE_15":
      return 15;
  }
  return 0;
};
var Re = {};
Re.toString = function(i) {
  switch (i) {
    case 0:
      return "QUERY";
    case 1:
      return "IQUERY";
    case 2:
      return "STATUS";
    case 3:
      return "OPCODE_3";
    case 4:
      return "NOTIFY";
    case 5:
      return "UPDATE";
    case 6:
      return "OPCODE_6";
    case 7:
      return "OPCODE_7";
    case 8:
      return "OPCODE_8";
    case 9:
      return "OPCODE_9";
    case 10:
      return "OPCODE_10";
    case 11:
      return "OPCODE_11";
    case 12:
      return "OPCODE_12";
    case 13:
      return "OPCODE_13";
    case 14:
      return "OPCODE_14";
    case 15:
      return "OPCODE_15";
  }
  return "OPCODE_" + i;
};
Re.toOpcode = function(i) {
  switch (i.toUpperCase()) {
    case "QUERY":
      return 0;
    case "IQUERY":
      return 1;
    case "STATUS":
      return 2;
    case "OPCODE_3":
      return 3;
    case "NOTIFY":
      return 4;
    case "UPDATE":
      return 5;
    case "OPCODE_6":
      return 6;
    case "OPCODE_7":
      return 7;
    case "OPCODE_8":
      return 8;
    case "OPCODE_9":
      return 9;
    case "OPCODE_10":
      return 10;
    case "OPCODE_11":
      return 11;
    case "OPCODE_12":
      return 12;
    case "OPCODE_13":
      return 13;
    case "OPCODE_14":
      return 14;
    case "OPCODE_15":
      return 15;
  }
  return 0;
};
var Ce = {};
Ce.toString = function(i) {
  switch (i) {
    case 1:
      return "IN";
    case 2:
      return "CS";
    case 3:
      return "CH";
    case 4:
      return "HS";
    case 255:
      return "ANY";
  }
  return "UNKNOWN_" + i;
};
Ce.toClass = function(i) {
  switch (i.toUpperCase()) {
    case "IN":
      return 1;
    case "CS":
      return 2;
    case "CH":
      return 3;
    case "HS":
      return 4;
    case "ANY":
      return 255;
  }
  return 0;
};
var De = {};
De.toString = function(i) {
  switch (i) {
    case 1:
      return "LLQ";
    case 2:
      return "UL";
    case 3:
      return "NSID";
    case 5:
      return "DAU";
    case 6:
      return "DHU";
    case 7:
      return "N3U";
    case 8:
      return "CLIENT_SUBNET";
    case 9:
      return "EXPIRE";
    case 10:
      return "COOKIE";
    case 11:
      return "TCP_KEEPALIVE";
    case 12:
      return "PADDING";
    case 13:
      return "CHAIN";
    case 14:
      return "KEY_TAG";
    case 26946:
      return "DEVICEID";
  }
  return i < 0 ? null : `OPTION_${i}`;
};
De.toCode = function(i) {
  if (typeof i == "number")
    return i;
  if (!i)
    return -1;
  switch (i.toUpperCase()) {
    case "OPTION_0":
      return 0;
    case "LLQ":
      return 1;
    case "UL":
      return 2;
    case "NSID":
      return 3;
    case "OPTION_4":
      return 4;
    case "DAU":
      return 5;
    case "DHU":
      return 6;
    case "N3U":
      return 7;
    case "CLIENT_SUBNET":
      return 8;
    case "EXPIRE":
      return 9;
    case "COOKIE":
      return 10;
    case "TCP_KEEPALIVE":
      return 11;
    case "PADDING":
      return 12;
    case "CHAIN":
      return 13;
    case "KEY_TAG":
      return 14;
    case "DEVICEID":
      return 26946;
    case "OPTION_65535":
      return 65535;
  }
  const t = i.match(/_(\d+)$/);
  return t ? parseInt(t[1], 10) : -1;
};
var Qe = { exports: {} };
(function(i, t) {
  var d = function(a) {
    Object.defineProperty(a, "__esModule", {
      value: !0
    }), a.decode = u, a.encode = A, a.familyOf = U, a.name = void 0, a.sizeOf = g, a.v6 = a.v4 = void 0;
    const o = /^(\d{1,3}\.){3,3}\d{1,3}$/, l = 4, E = /^(::)?(((\d{1,3}\.){3}(\d{1,3}){1})?([0-9a-f]){0,4}:{0,2}){1,8}(::)?$/i, I = 16, m = {
      name: "v4",
      size: l,
      isFormat: (h) => o.test(h),
      encode(h, p, y) {
        y = ~~y, p = p || new Uint8Array(y + l);
        const w = h.length;
        let _ = 0;
        for (let B = 0; B < w; ) {
          const R = h.charCodeAt(B++);
          R === 46 ? (p[y++] = _, _ = 0) : _ = _ * 10 + (R - 48);
        }
        return p[y] = _, p;
      },
      decode(h, p) {
        return p = ~~p, `${h[p++]}.${h[p++]}.${h[p++]}.${h[p]}`;
      }
    };
    a.v4 = m;
    const O = {
      name: "v6",
      size: I,
      isFormat: (h) => h.length > 0 && E.test(h),
      encode(h, p, y) {
        y = ~~y;
        let w = y + I, _ = -1, B = 0, R = 0, $ = !0, N = !1;
        p = p || new Uint8Array(y + I);
        for (let H = 0; H < h.length; H++) {
          let Y = h.charCodeAt(H);
          Y === 58 ? ($ ? _ !== -1 ? (y < w && (p[y] = 0), y < w - 1 && (p[y + 1] = 0), y += 2) : y < w && (_ = y) : (N === !0 ? (y < w && (p[y] = R), y++) : (y < w && (p[y] = B >> 8), y < w - 1 && (p[y + 1] = B & 255), y += 2), B = 0, R = 0), $ = !0, N = !1) : Y === 46 ? (y < w && (p[y] = R), y++, R = 0, B = 0, $ = !1, N = !0) : ($ = !1, Y >= 97 ? Y -= 87 : Y >= 65 ? Y -= 55 : (Y -= 48, R = R * 10 + Y), B = (B << 4) + Y);
        }
        if ($ === !1)
          N === !0 ? (y < w && (p[y] = R), y++) : (y < w && (p[y] = B >> 8), y < w - 1 && (p[y + 1] = B & 255), y += 2);
        else if (_ === 0)
          y < w && (p[y] = 0), y < w - 1 && (p[y + 1] = 0), y += 2;
        else if (_ !== -1) {
          y += 2;
          for (let H = Math.min(y - 1, w - 1); H >= _ + 2; H--)
            p[H] = p[H - 2];
          p[_] = 0, p[_ + 1] = 0, _ = y;
        }
        if (_ !== y && _ !== -1)
          for (y > w - 2 && (y = w - 2); w > _; )
            p[--w] = y < w && y > _ ? p[--y] : 0;
        else
          for (; y < w; )
            p[y++] = 0;
        return p;
      },
      decode(h, p) {
        p = ~~p;
        let y = "";
        for (let w = 0; w < I; w += 2)
          w !== 0 && (y += ":"), y += (h[p + w] << 8 | h[p + w + 1]).toString(16);
        return y.replace(/(^|:)0(:0)*:0(:|$)/, "$1::$3").replace(/:{3,4}/, "::");
      }
    };
    a.v6 = O;
    const P = "ip";
    a.name = P;
    function g(h) {
      if (m.isFormat(h)) return m.size;
      if (O.isFormat(h)) return O.size;
      throw Error(`Invalid ip address: ${h}`);
    }
    function U(h) {
      return g(h) === m.size ? 1 : 2;
    }
    function A(h, p, y) {
      y = ~~y;
      const w = g(h);
      return typeof p == "function" && (p = p(y + w)), w === m.size ? m.encode(h, p, y) : O.encode(h, p, y);
    }
    function u(h, p, y) {
      if (p = ~~p, y = y || h.length - p, y === m.size)
        return m.decode(h, p, y);
      if (y === O.size)
        return O.decode(h, p, y);
      throw Error(`Invalid buffer size needs to be ${m.size} for v4 or ${O.size} for v6.`);
    }
    return "default" in a ? a.default : a;
  }({});
  i.exports = d;
})(Qe);
var pn = Qe.exports;
(function(i) {
  const t = rn.Buffer, d = Te, a = Be, o = Re, l = Ce, E = De, I = pn, m = 0, O = 32768, P = 32768, g = ~P, U = 32768, A = ~U, u = i.name = {};
  u.encode = function(r, e, n, { mail: c = !1 } = {}) {
    e || (e = t.alloc(u.encodingLength(r))), n || (n = 0);
    const s = n, v = r.replace(/^\.|\.$/gm, "");
    if (v.length) {
      let S = [];
      if (c) {
        let L = "";
        v.split(".").forEach((T) => {
          T.endsWith("\\") ? L += (L.length ? "." : "") + T.slice(0, -1) : S.length === 0 && L.length ? S.push(L + "." + T) : S.push(T);
        });
      } else
        S = v.split(".");
      for (let L = 0; L < S.length; L++) {
        const T = e.write(S[L], n + 1);
        e[n] = T, n += T + 1;
      }
    }
    return e[n++] = 0, u.encode.bytes = n - s, e;
  }, u.encode.bytes = 0, u.decode = function(r, e, { mail: n = !1 } = {}) {
    e || (e = 0);
    const c = [];
    let s = e, v = 0, S = 0, L = !1;
    for (; ; ) {
      if (e >= r.length)
        throw new Error("Cannot decode name (buffer overflow)");
      const T = r[e++];
      if (S += L ? 0 : 1, T === 0)
        break;
      if (T & 192)
        if ((T & 192) === 192) {
          if (e + 1 > r.length)
            throw new Error("Cannot decode name (buffer overflow)");
          const M = r.readUInt16BE(e - 1) - 49152;
          if (M >= s)
            throw new Error("Cannot decode name (bad pointer)");
          e = M, s = M, S += L ? 0 : 1, L = !0;
        } else
          throw new Error("Cannot decode name (bad label)");
      else {
        if (e + T > r.length)
          throw new Error("Cannot decode name (buffer overflow)");
        if (v += T + 1, v > 254)
          throw new Error("Cannot decode name (name too long)");
        let M = r.toString("utf-8", e, e + T);
        n && (M = M.replace(/\./g, "\\.")), c.push(M), e += T, S += L ? 0 : T;
      }
    }
    return u.decode.bytes = S, c.length === 0 ? "." : c.join(".");
  }, u.decode.bytes = 0, u.encodingLength = function(r) {
    return r === "." || r === ".." ? 1 : t.byteLength(r.replace(/^\.|\.$/gm, "")) + 2;
  };
  const h = {};
  h.encode = function(r, e, n) {
    e || (e = t.alloc(h.encodingLength(r))), n || (n = 0);
    const c = e.write(r, n + 1);
    return e[n] = c, h.encode.bytes = c + 1, e;
  }, h.encode.bytes = 0, h.decode = function(r, e) {
    e || (e = 0);
    const n = r[e], c = r.toString("utf-8", e + 1, e + 1 + n);
    return h.decode.bytes = n + 1, c;
  }, h.decode.bytes = 0, h.encodingLength = function(r) {
    return t.byteLength(r) + 1;
  };
  const p = {};
  p.encode = function(r, e, n) {
    e || (e = p.encodingLength(r)), n || (n = 0);
    const c = (r.flags || 0) & 32767, s = r.type === "response" ? O : m;
    return e.writeUInt16BE(r.id || 0, n), e.writeUInt16BE(c | s, n + 2), e.writeUInt16BE(r.questions.length, n + 4), e.writeUInt16BE(r.answers.length, n + 6), e.writeUInt16BE(r.authorities.length, n + 8), e.writeUInt16BE(r.additionals.length, n + 10), e;
  }, p.encode.bytes = 12, p.decode = function(r, e) {
    if (e || (e = 0), r.length < 12) throw new Error("Header must be 12 bytes");
    const n = r.readUInt16BE(e + 2);
    return {
      id: r.readUInt16BE(e),
      type: n & O ? "response" : "query",
      flags: n & 32767,
      flag_qr: (n >> 15 & 1) === 1,
      opcode: o.toString(n >> 11 & 15),
      flag_aa: (n >> 10 & 1) === 1,
      flag_tc: (n >> 9 & 1) === 1,
      flag_rd: (n >> 8 & 1) === 1,
      flag_ra: (n >> 7 & 1) === 1,
      flag_z: (n >> 6 & 1) === 1,
      flag_ad: (n >> 5 & 1) === 1,
      flag_cd: (n >> 4 & 1) === 1,
      rcode: a.toString(n & 15),
      questions: new Array(r.readUInt16BE(e + 4)),
      answers: new Array(r.readUInt16BE(e + 6)),
      authorities: new Array(r.readUInt16BE(e + 8)),
      additionals: new Array(r.readUInt16BE(e + 10))
    };
  }, p.decode.bytes = 12, p.encodingLength = function() {
    return 12;
  };
  const y = i.unknown = {};
  y.encode = function(r, e, n) {
    return e || (e = t.alloc(y.encodingLength(r))), n || (n = 0), e.writeUInt16BE(r.length, n), r.copy(e, n + 2), y.encode.bytes = r.length + 2, e;
  }, y.encode.bytes = 0, y.decode = function(r, e) {
    e || (e = 0);
    const n = r.readUInt16BE(e), c = r.slice(e + 2, e + 2 + n);
    return y.decode.bytes = n + 2, c;
  }, y.decode.bytes = 0, y.encodingLength = function(r) {
    return r.length + 2;
  };
  const w = i.ns = {};
  w.encode = function(r, e, n) {
    return e || (e = t.alloc(w.encodingLength(r))), n || (n = 0), u.encode(r, e, n + 2), e.writeUInt16BE(u.encode.bytes, n), w.encode.bytes = u.encode.bytes + 2, e;
  }, w.encode.bytes = 0, w.decode = function(r, e) {
    e || (e = 0);
    const n = r.readUInt16BE(e), c = u.decode(r, e + 2);
    return w.decode.bytes = n + 2, c;
  }, w.decode.bytes = 0, w.encodingLength = function(r) {
    return u.encodingLength(r) + 2;
  };
  const _ = i.soa = {};
  _.encode = function(r, e, n) {
    e || (e = t.alloc(_.encodingLength(r))), n || (n = 0);
    const c = n;
    return n += 2, u.encode(r.mname, e, n), n += u.encode.bytes, u.encode(r.rname, e, n, { mail: !0 }), n += u.encode.bytes, e.writeUInt32BE(r.serial || 0, n), n += 4, e.writeUInt32BE(r.refresh || 0, n), n += 4, e.writeUInt32BE(r.retry || 0, n), n += 4, e.writeUInt32BE(r.expire || 0, n), n += 4, e.writeUInt32BE(r.minimum || 0, n), n += 4, e.writeUInt16BE(n - c - 2, c), _.encode.bytes = n - c, e;
  }, _.encode.bytes = 0, _.decode = function(r, e) {
    e || (e = 0);
    const n = e, c = {};
    return e += 2, c.mname = u.decode(r, e), e += u.decode.bytes, c.rname = u.decode(r, e, { mail: !0 }), e += u.decode.bytes, c.serial = r.readUInt32BE(e), e += 4, c.refresh = r.readUInt32BE(e), e += 4, c.retry = r.readUInt32BE(e), e += 4, c.expire = r.readUInt32BE(e), e += 4, c.minimum = r.readUInt32BE(e), e += 4, _.decode.bytes = e - n, c;
  }, _.decode.bytes = 0, _.encodingLength = function(r) {
    return 22 + u.encodingLength(r.mname) + u.encodingLength(r.rname);
  };
  const B = i.txt = {};
  B.encode = function(r, e, n) {
    Array.isArray(r) || (r = [r]);
    for (let s = 0; s < r.length; s++)
      if (typeof r[s] == "string" && (r[s] = t.from(r[s])), !t.isBuffer(r[s]))
        throw new Error("Must be a Buffer");
    e || (e = t.alloc(B.encodingLength(r))), n || (n = 0);
    const c = n;
    return n += 2, r.forEach(function(s) {
      e[n++] = s.length, s.copy(e, n, 0, s.length), n += s.length;
    }), e.writeUInt16BE(n - c - 2, c), B.encode.bytes = n - c, e;
  }, B.encode.bytes = 0, B.decode = function(r, e) {
    e || (e = 0);
    const n = e;
    let c = r.readUInt16BE(e);
    e += 2;
    let s = [];
    for (; c > 0; ) {
      const v = r[e++];
      if (--c, c < v)
        throw new Error("Buffer overflow");
      s.push(r.slice(e, e + v)), e += v, c -= v;
    }
    return B.decode.bytes = e - n, s;
  }, B.decode.bytes = 0, B.encodingLength = function(r) {
    Array.isArray(r) || (r = [r]);
    let e = 2;
    return r.forEach(function(n) {
      typeof n == "string" ? e += t.byteLength(n) + 1 : e += n.length + 1;
    }), e;
  };
  const R = i.null = {};
  R.encode = function(r, e, n) {
    e || (e = t.alloc(R.encodingLength(r))), n || (n = 0), typeof r == "string" && (r = t.from(r)), r || (r = t.alloc(0));
    const c = n;
    n += 2;
    const s = r.length;
    return r.copy(e, n, 0, s), n += s, e.writeUInt16BE(n - c - 2, c), R.encode.bytes = n - c, e;
  }, R.encode.bytes = 0, R.decode = function(r, e) {
    e || (e = 0);
    const n = e, c = r.readUInt16BE(e);
    e += 2;
    const s = r.slice(e, e + c);
    return e += c, R.decode.bytes = e - n, s;
  }, R.decode.bytes = 0, R.encodingLength = function(r) {
    return r ? (t.isBuffer(r) ? r.length : t.byteLength(r)) + 2 : 2;
  };
  const $ = i.hinfo = {};
  $.encode = function(r, e, n) {
    e || (e = t.alloc($.encodingLength(r))), n || (n = 0);
    const c = n;
    return n += 2, h.encode(r.cpu, e, n), n += h.encode.bytes, h.encode(r.os, e, n), n += h.encode.bytes, e.writeUInt16BE(n - c - 2, c), $.encode.bytes = n - c, e;
  }, $.encode.bytes = 0, $.decode = function(r, e) {
    e || (e = 0);
    const n = e, c = {};
    return e += 2, c.cpu = h.decode(r, e), e += h.decode.bytes, c.os = h.decode(r, e), e += h.decode.bytes, $.decode.bytes = e - n, c;
  }, $.decode.bytes = 0, $.encodingLength = function(r) {
    return h.encodingLength(r.cpu) + h.encodingLength(r.os) + 2;
  };
  const N = i.ptr = {}, H = i.cname = N, Y = i.dname = N;
  N.encode = function(r, e, n) {
    return e || (e = t.alloc(N.encodingLength(r))), n || (n = 0), u.encode(r, e, n + 2), e.writeUInt16BE(u.encode.bytes, n), N.encode.bytes = u.encode.bytes + 2, e;
  }, N.encode.bytes = 0, N.decode = function(r, e) {
    e || (e = 0);
    const n = u.decode(r, e + 2);
    return N.decode.bytes = u.decode.bytes + 2, n;
  }, N.decode.bytes = 0, N.encodingLength = function(r) {
    return u.encodingLength(r) + 2;
  };
  const b = i.srv = {};
  b.encode = function(r, e, n) {
    e || (e = t.alloc(b.encodingLength(r))), n || (n = 0), e.writeUInt16BE(r.priority || 0, n + 2), e.writeUInt16BE(r.weight || 0, n + 4), e.writeUInt16BE(r.port || 0, n + 6), u.encode(r.target, e, n + 8);
    const c = u.encode.bytes + 6;
    return e.writeUInt16BE(c, n), b.encode.bytes = c + 2, e;
  }, b.encode.bytes = 0, b.decode = function(r, e) {
    e || (e = 0);
    const n = r.readUInt16BE(e), c = {};
    return c.priority = r.readUInt16BE(e + 2), c.weight = r.readUInt16BE(e + 4), c.port = r.readUInt16BE(e + 6), c.target = u.decode(r, e + 8), b.decode.bytes = n + 2, c;
  }, b.decode.bytes = 0, b.encodingLength = function(r) {
    return 8 + u.encodingLength(r.target);
  };
  const k = i.caa = {};
  k.ISSUER_CRITICAL = 128, k.encode = function(r, e, n) {
    const c = k.encodingLength(r);
    return e || (e = t.alloc(k.encodingLength(r))), n || (n = 0), r.issuerCritical && (r.flags = k.ISSUER_CRITICAL), e.writeUInt16BE(c - 2, n), n += 2, e.writeUInt8(r.flags || 0, n), n += 1, h.encode(r.tag, e, n), n += h.encode.bytes, e.write(r.value, n), n += t.byteLength(r.value), k.encode.bytes = c, e;
  }, k.encode.bytes = 0, k.decode = function(r, e) {
    e || (e = 0);
    const n = r.readUInt16BE(e);
    e += 2;
    const c = e, s = {};
    return s.flags = r.readUInt8(e), e += 1, s.tag = h.decode(r, e), e += h.decode.bytes, s.value = r.toString("utf-8", e, c + n), s.issuerCritical = !!(s.flags & k.ISSUER_CRITICAL), k.decode.bytes = n + 2, s;
  }, k.decode.bytes = 0, k.encodingLength = function(r) {
    return h.encodingLength(r.tag) + h.encodingLength(r.value) + 2;
  };
  const ne = i.mx = {};
  ne.encode = function(r, e, n) {
    e || (e = t.alloc(ne.encodingLength(r))), n || (n = 0);
    const c = n;
    return n += 2, e.writeUInt16BE(r.preference || 0, n), n += 2, u.encode(r.exchange, e, n), n += u.encode.bytes, e.writeUInt16BE(n - c - 2, c), ne.encode.bytes = n - c, e;
  }, ne.encode.bytes = 0, ne.decode = function(r, e) {
    e || (e = 0);
    const n = e, c = {};
    return e += 2, c.preference = r.readUInt16BE(e), e += 2, c.exchange = u.decode(r, e), e += u.decode.bytes, ne.decode.bytes = e - n, c;
  }, ne.encodingLength = function(r) {
    return 4 + u.encodingLength(r.exchange);
  };
  const f = i.a = {};
  f.encode = function(r, e, n) {
    return e || (e = t.alloc(f.encodingLength(r))), n || (n = 0), e.writeUInt16BE(4, n), n += 2, I.v4.encode(r, e, n), f.encode.bytes = 6, e;
  }, f.encode.bytes = 0, f.decode = function(r, e) {
    e || (e = 0), e += 2;
    const n = I.v4.decode(r, e);
    return f.decode.bytes = 6, n;
  }, f.decode.bytes = 0, f.encodingLength = function() {
    return 6;
  };
  const ee = i.aaaa = {};
  ee.encode = function(r, e, n) {
    return e || (e = t.alloc(ee.encodingLength(r))), n || (n = 0), e.writeUInt16BE(16, n), n += 2, I.v6.encode(r, e, n), ee.encode.bytes = 18, e;
  }, ee.encode.bytes = 0, ee.decode = function(r, e) {
    e || (e = 0), e += 2;
    const n = I.v6.decode(r, e);
    return ee.decode.bytes = 18, n;
  }, ee.decode.bytes = 0, ee.encodingLength = function() {
    return 18;
  };
  const F = i.option = {};
  F.encode = function(r, e, n) {
    e || (e = t.alloc(F.encodingLength(r))), n || (n = 0);
    const c = n, s = E.toCode(r.code);
    if (e.writeUInt16BE(s, n), n += 2, r.data)
      e.writeUInt16BE(r.data.length, n), n += 2, r.data.copy(e, n), n += r.data.length;
    else
      switch (s) {
        case 8:
          const v = r.sourcePrefixLength || 0, S = r.family || I.familyOf(r.ip), L = I.encode(r.ip, t.alloc), T = Math.ceil(v / 8);
          e.writeUInt16BE(T + 4, n), n += 2, e.writeUInt16BE(S, n), n += 2, e.writeUInt8(v, n++), e.writeUInt8(r.scopePrefixLength || 0, n++), L.copy(e, n, 0, T), n += T;
          break;
        case 11:
          r.timeout ? (e.writeUInt16BE(2, n), n += 2, e.writeUInt16BE(r.timeout, n), n += 2) : (e.writeUInt16BE(0, n), n += 2);
          break;
        case 12:
          const M = r.length || 0;
          e.writeUInt16BE(M, n), n += 2, e.fill(0, n, n + M), n += M;
          break;
        case 14:
          const ve = r.tags.length * 2;
          e.writeUInt16BE(ve, n), n += 2;
          for (const nn of r.tags)
            e.writeUInt16BE(nn, n), n += 2;
          break;
        default:
          throw new Error(`Unknown roption code: ${r.code}`);
      }
    return F.encode.bytes = n - c, e;
  }, F.encode.bytes = 0, F.decode = function(r, e) {
    e || (e = 0);
    const n = {};
    n.code = r.readUInt16BE(e), n.type = E.toString(n.code), e += 2;
    const c = r.readUInt16BE(e);
    switch (e += 2, n.data = r.slice(e, e + c), n.code) {
      case 8:
        n.family = r.readUInt16BE(e), e += 2, n.sourcePrefixLength = r.readUInt8(e++), n.scopePrefixLength = r.readUInt8(e++);
        const s = t.alloc(n.family === 1 ? 4 : 16);
        r.copy(s, 0, e, e + c - 4), n.ip = I.decode(s);
        break;
      case 11:
        c > 0 && (n.timeout = r.readUInt16BE(e), e += 2);
        break;
      case 14:
        n.tags = [];
        for (let v = 0; v < c; v += 2)
          n.tags.push(r.readUInt16BE(e)), e += 2;
    }
    return F.decode.bytes = c + 4, n;
  }, F.decode.bytes = 0, F.encodingLength = function(r) {
    if (r.data)
      return r.data.length + 4;
    switch (E.toCode(r.code)) {
      case 8:
        const n = r.sourcePrefixLength || 0;
        return Math.ceil(n / 8) + 8;
      case 11:
        return typeof r.timeout == "number" ? 6 : 4;
      case 12:
        return r.length + 4;
      case 14:
        return 4 + r.tags.length * 2;
    }
    throw new Error(`Unknown roption code: ${r.code}`);
  };
  const q = i.opt = {};
  q.encode = function(r, e, n) {
    e || (e = t.alloc(q.encodingLength(r))), n || (n = 0);
    const c = n, s = ie(r, F);
    return e.writeUInt16BE(s, n), n = se(r, F, e, n + 2), q.encode.bytes = n - c, e;
  }, q.encode.bytes = 0, q.decode = function(r, e) {
    e || (e = 0);
    const n = e, c = [];
    let s = r.readUInt16BE(e);
    e += 2;
    let v = 0;
    for (; s > 0; )
      c[v++] = F.decode(r, e), e += F.decode.bytes, s -= F.decode.bytes;
    return q.decode.bytes = e - n, c;
  }, q.decode.bytes = 0, q.encodingLength = function(r) {
    return 2 + ie(r || [], F);
  };
  const x = i.dnskey = {};
  x.PROTOCOL_DNSSEC = 3, x.ZONE_KEY = 128, x.SECURE_ENTRYPOINT = 32768, x.encode = function(r, e, n) {
    e || (e = t.alloc(x.encodingLength(r))), n || (n = 0);
    const c = n, s = r.key;
    if (!t.isBuffer(s))
      throw new Error("Key must be a Buffer");
    return n += 2, e.writeUInt16BE(r.flags, n), n += 2, e.writeUInt8(x.PROTOCOL_DNSSEC, n), n += 1, e.writeUInt8(r.algorithm, n), n += 1, s.copy(e, n, 0, s.length), n += s.length, x.encode.bytes = n - c, e.writeUInt16BE(x.encode.bytes - 2, c), e;
  }, x.encode.bytes = 0, x.decode = function(r, e) {
    e || (e = 0);
    const n = e;
    var c = {}, s = r.readUInt16BE(e);
    if (e += 2, c.flags = r.readUInt16BE(e), e += 2, r.readUInt8(e) !== x.PROTOCOL_DNSSEC)
      throw new Error("Protocol must be 3");
    return e += 1, c.algorithm = r.readUInt8(e), e += 1, c.key = r.slice(e, n + s + 2), e += c.key.length, x.decode.bytes = e - n, c;
  }, x.decode.bytes = 0, x.encodingLength = function(r) {
    return 6 + t.byteLength(r.key);
  };
  const X = i.rrsig = {};
  X.encode = function(r, e, n) {
    e || (e = t.alloc(X.encodingLength(r))), n || (n = 0);
    const c = n, s = r.signature;
    if (!t.isBuffer(s))
      throw new Error("Signature must be a Buffer");
    return n += 2, e.writeUInt16BE(d.toType(r.typeCovered), n), n += 2, e.writeUInt8(r.algorithm, n), n += 1, e.writeUInt8(r.labels, n), n += 1, e.writeUInt32BE(r.originalTTL, n), n += 4, e.writeUInt32BE(r.expiration, n), n += 4, e.writeUInt32BE(r.inception, n), n += 4, e.writeUInt16BE(r.keyTag, n), n += 2, u.encode(r.signersName, e, n), n += u.encode.bytes, s.copy(e, n, 0, s.length), n += s.length, X.encode.bytes = n - c, e.writeUInt16BE(X.encode.bytes - 2, c), e;
  }, X.encode.bytes = 0, X.decode = function(r, e) {
    e || (e = 0);
    const n = e;
    var c = {}, s = r.readUInt16BE(e);
    return e += 2, c.typeCovered = d.toString(r.readUInt16BE(e)), e += 2, c.algorithm = r.readUInt8(e), e += 1, c.labels = r.readUInt8(e), e += 1, c.originalTTL = r.readUInt32BE(e), e += 4, c.expiration = r.readUInt32BE(e), e += 4, c.inception = r.readUInt32BE(e), e += 4, c.keyTag = r.readUInt16BE(e), e += 2, c.signersName = u.decode(r, e), e += u.decode.bytes, c.signature = r.slice(e, n + s + 2), e += c.signature.length, X.decode.bytes = e - n, c;
  }, X.decode.bytes = 0, X.encodingLength = function(r) {
    return 20 + u.encodingLength(r.signersName) + t.byteLength(r.signature);
  };
  const V = i.rp = {};
  V.encode = function(r, e, n) {
    e || (e = t.alloc(V.encodingLength(r))), n || (n = 0);
    const c = n;
    return n += 2, u.encode(r.mbox || ".", e, n, { mail: !0 }), n += u.encode.bytes, u.encode(r.txt || ".", e, n), n += u.encode.bytes, V.encode.bytes = n - c, e.writeUInt16BE(V.encode.bytes - 2, c), e;
  }, V.encode.bytes = 0, V.decode = function(r, e) {
    e || (e = 0);
    const n = e, c = {};
    return e += 2, c.mbox = u.decode(r, e, { mail: !0 }) || ".", e += u.decode.bytes, c.txt = u.decode(r, e) || ".", e += u.decode.bytes, V.decode.bytes = e - n, c;
  }, V.decode.bytes = 0, V.encodingLength = function(r) {
    return 2 + u.encodingLength(r.mbox || ".") + u.encodingLength(r.txt || ".");
  };
  const C = {};
  C.encode = function(r, e, n) {
    e || (e = t.alloc(C.encodingLength(r))), n || (n = 0);
    const c = n;
    for (var s = [], v = 0; v < r.length; v++) {
      var S = d.toType(r[v]);
      s[S >> 8] === void 0 && (s[S >> 8] = []), s[S >> 8][S >> 3 & 31] |= 1 << 7 - (S & 7);
    }
    for (v = 0; v < s.length; v++)
      if (s[v] !== void 0) {
        var L = t.from(s[v]);
        e.writeUInt8(v, n), n += 1, e.writeUInt8(L.length, n), n += 1, L.copy(e, n), n += L.length;
      }
    return C.encode.bytes = n - c, e;
  }, C.encode.bytes = 0, C.decode = function(r, e, n) {
    e || (e = 0);
    const c = e;
    for (var s = []; e - c < n; ) {
      var v = r.readUInt8(e);
      e += 1;
      var S = r.readUInt8(e);
      e += 1;
      for (var L = 0; L < S; L++)
        for (var T = r.readUInt8(e + L), M = 0; M < 8; M++)
          if (T & 1 << 7 - M) {
            var ve = d.toString(v << 8 | L << 3 | M);
            s.push(ve);
          }
      e += S;
    }
    return C.decode.bytes = e - c, s;
  }, C.decode.bytes = 0, C.encodingLength = function(r) {
    for (var e = [], n = 0; n < r.length; n++) {
      var c = d.toType(r[n]);
      e[c >> 8] = Math.max(e[c >> 8] || 0, c & 255);
    }
    var s = 0;
    for (n = 0; n < e.length; n++)
      e[n] !== void 0 && (s += 2 + Math.ceil((e[n] + 1) / 8));
    return s;
  };
  const z = i.nsec = {};
  z.encode = function(r, e, n) {
    e || (e = t.alloc(z.encodingLength(r))), n || (n = 0);
    const c = n;
    return n += 2, u.encode(r.nextDomain, e, n), n += u.encode.bytes, C.encode(r.rrtypes, e, n), n += C.encode.bytes, z.encode.bytes = n - c, e.writeUInt16BE(z.encode.bytes - 2, c), e;
  }, z.encode.bytes = 0, z.decode = function(r, e) {
    e || (e = 0);
    const n = e;
    var c = {}, s = r.readUInt16BE(e);
    return e += 2, c.nextDomain = u.decode(r, e), e += u.decode.bytes, c.rrtypes = C.decode(r, e, s - (e - n)), e += C.decode.bytes, z.decode.bytes = e - n, c;
  }, z.decode.bytes = 0, z.encodingLength = function(r) {
    return 2 + u.encodingLength(r.nextDomain) + C.encodingLength(r.rrtypes);
  };
  const G = i.nsec3 = {};
  G.encode = function(r, e, n) {
    e || (e = t.alloc(G.encodingLength(r))), n || (n = 0);
    const c = n, s = r.salt;
    if (!t.isBuffer(s))
      throw new Error("salt must be a Buffer");
    const v = r.nextDomain;
    if (!t.isBuffer(v))
      throw new Error("nextDomain must be a Buffer");
    return n += 2, e.writeUInt8(r.algorithm, n), n += 1, e.writeUInt8(r.flags, n), n += 1, e.writeUInt16BE(r.iterations, n), n += 2, e.writeUInt8(s.length, n), n += 1, s.copy(e, n, 0, s.length), n += s.length, e.writeUInt8(v.length, n), n += 1, v.copy(e, n, 0, v.length), n += v.length, C.encode(r.rrtypes, e, n), n += C.encode.bytes, G.encode.bytes = n - c, e.writeUInt16BE(G.encode.bytes - 2, c), e;
  }, G.encode.bytes = 0, G.decode = function(r, e) {
    e || (e = 0);
    const n = e;
    var c = {}, s = r.readUInt16BE(e);
    e += 2, c.algorithm = r.readUInt8(e), e += 1, c.flags = r.readUInt8(e), e += 1, c.iterations = r.readUInt16BE(e), e += 2;
    const v = r.readUInt8(e);
    e += 1, c.salt = r.slice(e, e + v), e += v;
    const S = r.readUInt8(e);
    return e += 1, c.nextDomain = r.slice(e, e + S), e += S, c.rrtypes = C.decode(r, e, s - (e - n)), e += C.decode.bytes, G.decode.bytes = e - n, c;
  }, G.decode.bytes = 0, G.encodingLength = function(r) {
    return 8 + r.salt.length + r.nextDomain.length + C.encodingLength(r.rrtypes);
  };
  const Q = i.ds = {};
  Q.encode = function(r, e, n) {
    e || (e = t.alloc(Q.encodingLength(r))), n || (n = 0);
    const c = n, s = r.digest;
    if (!t.isBuffer(s))
      throw new Error("Digest must be a Buffer");
    return n += 2, e.writeUInt16BE(r.keyTag, n), n += 2, e.writeUInt8(r.algorithm, n), n += 1, e.writeUInt8(r.digestType, n), n += 1, s.copy(e, n, 0, s.length), n += s.length, Q.encode.bytes = n - c, e.writeUInt16BE(Q.encode.bytes - 2, c), e;
  }, Q.encode.bytes = 0, Q.decode = function(r, e) {
    e || (e = 0);
    const n = e;
    var c = {}, s = r.readUInt16BE(e);
    return e += 2, c.keyTag = r.readUInt16BE(e), e += 2, c.algorithm = r.readUInt8(e), e += 1, c.digestType = r.readUInt8(e), e += 1, c.digest = r.slice(e, n + s + 2), e += c.digest.length, Q.decode.bytes = e - n, c;
  }, Q.decode.bytes = 0, Q.encodingLength = function(r) {
    return 6 + t.byteLength(r.digest);
  };
  const j = i.sshfp = {};
  j.getFingerprintLengthForHashType = function(e) {
    switch (e) {
      case 1:
        return 20;
      case 2:
        return 32;
    }
  }, j.encode = function(e, n, c) {
    n || (n = t.alloc(j.encodingLength(e))), c || (c = 0);
    const s = c;
    c += 2, n[c] = e.algorithm, c += 1, n[c] = e.hash, c += 1;
    const v = t.from(e.fingerprint.toUpperCase(), "hex");
    if (v.length !== j.getFingerprintLengthForHashType(e.hash))
      throw new Error("Invalid fingerprint length");
    return v.copy(n, c), c += v.byteLength, j.encode.bytes = c - s, n.writeUInt16BE(j.encode.bytes - 2, s), n;
  }, j.encode.bytes = 0, j.decode = function(e, n) {
    n || (n = 0);
    const c = n, s = {};
    n += 2, s.algorithm = e[n], n += 1, s.hash = e[n], n += 1;
    const v = j.getFingerprintLengthForHashType(s.hash);
    return s.fingerprint = e.slice(n, n + v).toString("hex").toUpperCase(), n += v, j.decode.bytes = n - c, s;
  }, j.decode.bytes = 0, j.encodingLength = function(r) {
    return 4 + t.from(r.fingerprint, "hex").byteLength;
  };
  const W = i.naptr = {};
  W.encode = function(r, e, n) {
    e || (e = t.alloc(W.encodingLength(r))), n || (n = 0);
    const c = n;
    return n += 2, e.writeUInt16BE(r.order || 0, n), n += 2, e.writeUInt16BE(r.preference || 0, n), n += 2, h.encode(r.flags, e, n), n += h.encode.bytes, h.encode(r.services, e, n), n += h.encode.bytes, h.encode(r.regexp, e, n), n += h.encode.bytes, u.encode(r.replacement, e, n), n += u.encode.bytes, W.encode.bytes = n - c, e.writeUInt16BE(W.encode.bytes - 2, c), e;
  }, W.encode.bytes = 0, W.decode = function(r, e) {
    e || (e = 0);
    const n = e, c = {};
    return e += 2, c.order = r.readUInt16BE(e), e += 2, c.preference = r.readUInt16BE(e), e += 2, c.flags = h.decode(r, e), e += h.decode.bytes, c.services = h.decode(r, e), e += h.decode.bytes, c.regexp = h.decode(r, e), e += h.decode.bytes, c.replacement = u.decode(r, e), e += u.decode.bytes, W.decode.bytes = e - n, c;
  }, W.decode.bytes = 0, W.encodingLength = function(r) {
    return h.encodingLength(r.flags) + h.encodingLength(r.services) + h.encodingLength(r.regexp) + u.encodingLength(r.replacement) + 6;
  };
  const Z = i.tlsa = {};
  Z.encode = function(r, e, n) {
    e || (e = t.alloc(Z.encodingLength(r))), n || (n = 0);
    const c = n, s = r.certificate;
    if (!t.isBuffer(s))
      throw new Error("Certificate must be a Buffer");
    return n += 2, e.writeUInt8(r.usage, n), n += 1, e.writeUInt8(r.selector, n), n += 1, e.writeUInt8(r.matchingType, n), n += 1, s.copy(e, n, 0, s.length), n += s.length, Z.encode.bytes = n - c, e.writeUInt16BE(Z.encode.bytes - 2, c), e;
  }, Z.encode.bytes = 0, Z.decode = function(r, e) {
    e || (e = 0);
    const n = e, c = {}, s = r.readUInt16BE(e);
    return e += 2, c.usage = r.readUInt8(e), e += 1, c.selector = r.readUInt8(e), e += 1, c.matchingType = r.readUInt8(e), e += 1, c.certificate = r.slice(e, n + s + 2), e += c.certificate.length, Z.decode.bytes = e - n, c;
  }, Z.decode.bytes = 0, Z.encodingLength = function(r) {
    return 5 + t.byteLength(r.certificate);
  };
  const Ie = i.record = function(r) {
    switch (r.toUpperCase()) {
      case "A":
        return f;
      case "PTR":
        return N;
      case "CNAME":
        return H;
      case "DNAME":
        return Y;
      case "TXT":
        return B;
      case "NULL":
        return R;
      case "AAAA":
        return ee;
      case "SRV":
        return b;
      case "HINFO":
        return $;
      case "CAA":
        return k;
      case "NS":
        return w;
      case "SOA":
        return _;
      case "MX":
        return ne;
      case "OPT":
        return q;
      case "DNSKEY":
        return x;
      case "RRSIG":
        return X;
      case "RP":
        return V;
      case "NSEC":
        return z;
      case "NSEC3":
        return G;
      case "SSHFP":
        return j;
      case "DS":
        return Q;
      case "NAPTR":
        return W;
      case "TLSA":
        return Z;
    }
    return y;
  }, D = i.answer = {};
  D.encode = function(r, e, n) {
    e || (e = t.alloc(D.encodingLength(r))), n || (n = 0);
    const c = n;
    if (u.encode(r.name, e, n), n += u.encode.bytes, e.writeUInt16BE(d.toType(r.type), n), r.type.toUpperCase() === "OPT") {
      if (r.name !== ".")
        throw new Error("OPT name must be root.");
      e.writeUInt16BE(r.udpPayloadSize || 4096, n + 2), e.writeUInt8(r.extendedRcode || 0, n + 4), e.writeUInt8(r.ednsVersion || 0, n + 5), e.writeUInt16BE(r.flags || 0, n + 6), n += 8, q.encode(r.options || [], e, n), n += q.encode.bytes;
    } else {
      let s = l.toClass(r.class === void 0 ? "IN" : r.class);
      r.flush && (s |= P), e.writeUInt16BE(s, n + 2), e.writeUInt32BE(r.ttl || 0, n + 4), n += 8;
      const v = Ie(r.type);
      v.encode(r.data, e, n), n += v.encode.bytes;
    }
    return D.encode.bytes = n - c, e;
  }, D.encode.bytes = 0, D.decode = function(r, e) {
    e || (e = 0);
    const n = {}, c = e;
    if (n.name = u.decode(r, e), e += u.decode.bytes, n.type = d.toString(r.readUInt16BE(e)), n.type === "OPT")
      n.udpPayloadSize = r.readUInt16BE(e + 2), n.extendedRcode = r.readUInt8(e + 4), n.ednsVersion = r.readUInt8(e + 5), n.flags = r.readUInt16BE(e + 6), n.flag_do = (n.flags >> 15 & 1) === 1, n.options = q.decode(r, e + 8), e += 8 + q.decode.bytes;
    else {
      const s = r.readUInt16BE(e + 2);
      n.ttl = r.readUInt32BE(e + 4), n.class = l.toString(s & g), n.flush = !!(s & P);
      const v = Ie(n.type);
      n.data = v.decode(r, e + 8), e += 8 + v.decode.bytes;
    }
    return D.decode.bytes = e - c, n;
  }, D.decode.bytes = 0, D.encodingLength = function(r) {
    const e = r.data !== null && r.data !== void 0 ? r.data : r.options;
    return u.encodingLength(r.name) + 8 + Ie(r.type).encodingLength(e);
  };
  const K = i.question = {};
  K.encode = function(r, e, n) {
    e || (e = t.alloc(K.encodingLength(r))), n || (n = 0);
    const c = n;
    return u.encode(r.name, e, n), n += u.encode.bytes, e.writeUInt16BE(d.toType(r.type), n), n += 2, e.writeUInt16BE(l.toClass(r.class === void 0 ? "IN" : r.class), n), n += 2, K.encode.bytes = n - c, r;
  }, K.encode.bytes = 0, K.decode = function(r, e) {
    e || (e = 0);
    const n = e, c = {};
    return c.name = u.decode(r, e), e += u.decode.bytes, c.type = d.toString(r.readUInt16BE(e)), e += 2, c.class = l.toString(r.readUInt16BE(e)), e += 2, !!(c.class & U) && (c.class &= A), K.decode.bytes = e - n, c;
  }, K.decode.bytes = 0, K.encodingLength = function(r) {
    return u.encodingLength(r.name) + 4;
  }, i.AUTHORITATIVE_ANSWER = 1024, i.TRUNCATED_RESPONSE = 512, i.RECURSION_DESIRED = 256, i.RECURSION_AVAILABLE = 128, i.AUTHENTIC_DATA = 32, i.CHECKING_DISABLED = 16, i.DNSSEC_OK = 32768, i.encode = function(r, e, n) {
    const c = !e;
    c && (e = t.alloc(i.encodingLength(r))), n || (n = 0);
    const s = n;
    return r.questions || (r.questions = []), r.answers || (r.answers = []), r.authorities || (r.authorities = []), r.additionals || (r.additionals = []), p.encode(r, e, n), n += p.encode.bytes, n = se(r.questions, K, e, n), n = se(r.answers, D, e, n), n = se(r.authorities, D, e, n), n = se(r.additionals, D, e, n), i.encode.bytes = n - s, c && i.encode.bytes !== e.length ? e.slice(0, i.encode.bytes) : e;
  }, i.encode.bytes = 0, i.decode = function(r, e) {
    e || (e = 0);
    const n = e, c = p.decode(r, e);
    return e += p.decode.bytes, e = ge(c.questions, K, r, e), e = ge(c.answers, D, r, e), e = ge(c.authorities, D, r, e), e = ge(c.additionals, D, r, e), i.decode.bytes = e - n, c;
  }, i.decode.bytes = 0, i.encodingLength = function(r) {
    return p.encodingLength(r) + ie(r.questions || [], K) + ie(r.answers || [], D) + ie(r.authorities || [], D) + ie(r.additionals || [], D);
  }, i.streamEncode = function(r) {
    const e = i.encode(r), n = t.alloc(2);
    n.writeUInt16BE(e.byteLength);
    const c = t.concat([n, e]);
    return i.streamEncode.bytes = c.byteLength, c;
  }, i.streamEncode.bytes = 0, i.streamDecode = function(r) {
    const e = r.readUInt16BE(0);
    if (r.byteLength < e + 2)
      return null;
    const n = i.decode(r.slice(2));
    return i.streamDecode.bytes = i.decode.bytes, n;
  }, i.streamDecode.bytes = 0;
  function ie(r, e) {
    let n = 0;
    for (let c = 0; c < r.length; c++) n += e.encodingLength(r[c]);
    return n;
  }
  function se(r, e, n, c) {
    for (let s = 0; s < r.length; s++)
      e.encode(r[s], n, c), c += e.encode.bytes;
    return c;
  }
  function ge(r, e, n, c) {
    for (let s = 0; s < r.length; s++)
      r[s] = e.decode(n, c), c += e.decode.bytes;
    return c;
  }
})(Ge);
var We = _n;
process.nextTick(Un, 42);
var mn = In;
function In(i) {
  var t = a;
  return d;
  function d(o) {
    t(o || wn);
  }
  function a(o) {
    var l = [o];
    t = E, i(I);
    function E(m) {
      l.push(m);
    }
    function I(m) {
      var O = arguments;
      for (t = vn(m) ? a : P; l.length; ) P(l.shift());
      function P(g) {
        We(On, g, O);
      }
    }
  }
}
function vn(i) {
  return Object.prototype.toString.call(i) === "[object Error]";
}
function wn() {
}
function On(i, t) {
  i.apply(null, t);
}
function Un(i) {
  i === 42 && (We = process.nextTick);
}
function _n(i, t, d) {
  process.nextTick(function() {
    i(t, d);
  });
}
var Oe = Ge, Sn = tn, Ln = mn, An = Ae, Se = Ye, Ue = function() {
}, Tn = function(i) {
  i || (i = {});
  var t = new An.EventEmitter(), d = typeof i.port == "number" ? i.port : 5353, a = i.type || "udp4", o = i.ip || i.host || (a === "udp4" ? "224.0.0.251" : null), l = { address: o, port: d }, E = {}, I = !1, m = null;
  if (a === "udp6" && (!o || !i.interface))
    throw new Error("For IPv6 multicast you must specify `ip` and `interface`");
  var O = i.socket || Sn.createSocket({
    type: a,
    reuseAddr: i.reuseAddr !== !1,
    toString: function() {
      return a;
    }
  });
  O.on("error", function(g) {
    g.code === "EACCES" || g.code === "EADDRINUSE" ? t.emit("error", g) : t.emit("warning", g);
  }), O.on("message", function(g, U) {
    try {
      g = Oe.decode(g);
    } catch (A) {
      t.emit("warning", A);
      return;
    }
    t.emit("packet", g, U), g.type === "query" && t.emit("query", g, U), g.type === "response" && t.emit("response", g, U);
  }), O.on("listening", function() {
    d || (d = l.port = O.address().port), i.multicast !== !1 && (t.update(), m = setInterval(t.update, 5e3), O.setMulticastTTL(i.ttl || 255), O.setMulticastLoopback(i.loopback !== !1));
  });
  var P = Ln(function(g) {
    if (!d || i.bind === !1) return g(null);
    O.once("error", g), O.bind(d, i.bind || i.interface, function() {
      O.removeListener("error", g), g(null);
    });
  });
  return P(function(g) {
    if (g) return t.emit("error", g);
    t.emit("ready");
  }), t.send = function(g, U, A) {
    if (typeof U == "function") return t.send(g, null, U);
    A || (A = Ue), U ? !U.host && !U.address && (U.address = l.address) : U = l, P(u);
    function u(h) {
      if (I) return A();
      if (h) return A(h);
      var p = Oe.encode(g);
      O.send(p, 0, p.length, U.port, U.address || U.host, A);
    }
  }, t.response = t.respond = function(g, U, A) {
    Array.isArray(g) && (g = { answers: g }), g.type = "response", g.flags = (g.flags || 0) | Oe.AUTHORITATIVE_ANSWER, t.send(g, U, A);
  }, t.query = function(g, U, A, u) {
    if (typeof U == "function") return t.query(g, null, null, U);
    if (typeof U == "object" && U && U.port) return t.query(g, null, U, A);
    if (typeof A == "function") return t.query(g, U, null, A);
    u || (u = Ue), typeof g == "string" && (g = [{ name: g, type: U || "ANY" }]), Array.isArray(g) && (g = { type: "query", questions: g }), g.type = "query", t.send(g, A, u);
  }, t.destroy = function(g) {
    if (g || (g = Ue), I) return process.nextTick(g);
    I = !0, clearInterval(m);
    for (var U in E)
      try {
        O.dropMembership(o, U);
      } catch {
      }
    E = {}, O.close(g);
  }, t.update = function() {
    for (var g = i.interface ? [].concat(i.interface) : Rn(), U = !1, A = 0; A < g.length; A++) {
      var u = g[A];
      if (!E[u])
        try {
          O.addMembership(o, u), E[u] = !0, U = !0;
        } catch (h) {
          t.emit("warning", h);
        }
    }
    if (U) {
      if (O.setMulticastInterface)
        try {
          O.setMulticastInterface(i.interface || Bn());
        } catch (h) {
          t.emit("warning", h);
        }
      t.emit("networkInterface");
    }
  }, t;
};
function Bn() {
  for (var i = Se.networkInterfaces(), t = Object.keys(i), d = 0; d < t.length; d++)
    for (var a = i[t[d]], o = 0; o < a.length; o++) {
      var l = a[o];
      if (Ze(l.family) && !l.internal)
        return Se.platform() === "darwin" && t[d] === "en0" ? l.address : "0.0.0.0";
    }
  return "127.0.0.1";
}
function Rn() {
  for (var i = Se.networkInterfaces(), t = Object.keys(i), d = [], a = 0; a < t.length; a++)
    for (var o = i[t[a]], l = 0; l < o.length; l++) {
      var E = o[l];
      if (Ze(E.family)) {
        d.push(E.address);
        break;
      }
    }
  return d;
}
function Ze(i) {
  return i === 4 || i === "IPv4";
}
var Cn = function i(t, d) {
  if (t === d) return !0;
  if (t && d && typeof t == "object" && typeof d == "object") {
    if (t.constructor !== d.constructor) return !1;
    var a, o, l;
    if (Array.isArray(t)) {
      if (a = t.length, a != d.length) return !1;
      for (o = a; o-- !== 0; )
        if (!i(t[o], d[o])) return !1;
      return !0;
    }
    if (t instanceof Map && d instanceof Map) {
      if (t.size !== d.size) return !1;
      for (o of t.entries())
        if (!d.has(o[0])) return !1;
      for (o of t.entries())
        if (!i(o[1], d.get(o[0]))) return !1;
      return !0;
    }
    if (t instanceof Set && d instanceof Set) {
      if (t.size !== d.size) return !1;
      for (o of t.entries())
        if (!d.has(o[0])) return !1;
      return !0;
    }
    if (ArrayBuffer.isView(t) && ArrayBuffer.isView(d)) {
      if (a = t.length, a != d.length) return !1;
      for (o = a; o-- !== 0; )
        if (t[o] !== d[o]) return !1;
      return !0;
    }
    if (t.constructor === RegExp) return t.source === d.source && t.flags === d.flags;
    if (t.valueOf !== Object.prototype.valueOf) return t.valueOf() === d.valueOf();
    if (t.toString !== Object.prototype.toString) return t.toString() === d.toString();
    if (l = Object.keys(t), a = l.length, a !== Object.keys(d).length) return !1;
    for (o = a; o-- !== 0; )
      if (!Object.prototype.hasOwnProperty.call(d, l[o])) return !1;
    for (o = a; o-- !== 0; ) {
      var E = l[o];
      if (!i(t[E], d[E])) return !1;
    }
    return !0;
  }
  return t !== t && d !== d;
}, Pe = J && J.__importDefault || function(i) {
  return i && i.__esModule ? i : { default: i };
};
Object.defineProperty(ue, "__esModule", { value: !0 });
ue.Server = void 0;
const Dn = Pe(Tn), Pn = Pe(Cn), Nn = Pe(le);
class Je {
  constructor(t, d) {
    this.registry = {}, this.mdns = (0, Dn.default)(t), this.mdns.setMaxListeners(0), this.mdns.on("query", this.respondToQuery.bind(this)), this.errorCallback = d ?? function(a) {
      throw a;
    };
  }
  register(t) {
    const d = (a) => {
      var o = this.registry[a.type];
      if (!o)
        o = this.registry[a.type] = [];
      else if (o.some(this.isDuplicateRecord(a)))
        return;
      o.push(a);
    };
    Array.isArray(t) ? t.forEach(d) : d(t);
  }
  unregister(t) {
    const d = (a) => {
      let o = a.type;
      o in this.registry && (this.registry[o] = this.registry[o].filter((l) => l.name !== a.name));
    };
    Array.isArray(t) ? t.forEach(d) : d(t);
  }
  respondToQuery(t) {
    let d = this;
    t.questions.forEach((a) => {
      var o = a.type, l = a.name, E = o === "ANY" ? Object.keys(d.registry).map(d.recordsFor.bind(d, l)).flat(1) : d.recordsFor(l, o);
      if (E.length !== 0) {
        var I = [];
        o !== "ANY" && (E.forEach((m) => {
          m.type === "PTR" && (I = I.concat(d.recordsFor(m.data, "SRV")).concat(d.recordsFor(m.data, "TXT")));
        }), I.filter(function(m) {
          return m.type === "SRV";
        }).map(function(m) {
          return m.data.target;
        }).filter(this.unique()).forEach(function(m) {
          I = I.concat(d.recordsFor(m, "A")).concat(d.recordsFor(m, "AAAA"));
        })), d.mdns.respond({ answers: E, additionals: I }, (m) => {
          m && this.errorCallback(m);
        });
      }
    });
  }
  recordsFor(t, d) {
    return d in this.registry ? this.registry[d].filter((a) => {
      var o = ~t.indexOf(".") ? a.name : a.name.split(".")[0];
      return (0, Nn.default)(o, t);
    }) : [];
  }
  isDuplicateRecord(t) {
    return (d) => t.type === d.type && t.name === d.name && (0, Pn.default)(t.data, d.data);
  }
  unique() {
    var t = [];
    return (d) => ~t.indexOf(d) ? !1 : (t.push(d), !0);
  }
}
ue.Server = Je;
ue.default = Je;
var he = {}, Ne = {};
Object.defineProperty(Ne, "__esModule", { value: !0 });
Ne.default = (i, t) => {
  if (t === void 0)
    return !0;
  let d = i.txt, a = Object.entries(t).map(([o, l]) => {
    let E = d[o];
    return !(E === void 0 || l != E);
  });
  return a.length == 0 ? !0 : !a.includes(!1);
};
var Me = {};
Object.defineProperty(Me, "__esModule", { value: !0 });
Me.default = (i) => Object.keys(i).filter((t) => !t.includes("binary")).reduce((t, d) => Object.assign(t, { [d]: i[d] }), {});
var $e = {};
Object.defineProperty($e, "__esModule", { value: !0 });
$e.default = Mn;
function Mn(i, t) {
  if (i === void 0 || t === void 0)
    return !1;
  let d = Object.keys(i), a = Object.keys(t);
  if (d.length != a.length)
    return !1;
  for (let o of d)
    if (i[o] != t[o])
      return !1;
  return !0;
}
var ye = J && J.__importDefault || function(i) {
  return i && i.__esModule ? i : { default: i };
};
Object.defineProperty(he, "__esModule", { value: !0 });
he.Browser = void 0;
const $n = ye(ae), re = ye(le), xn = Ae, _e = ce, je = ye(Ne), Fn = ye(Me), kn = ye($e), be = ".local", qn = "_services._dns-sd._udp" + be;
class pe extends xn.EventEmitter {
  constructor(t, d, a) {
    if (super(), this.onresponse = void 0, this.serviceMap = {}, this.wildcard = !1, this._services = [], typeof d == "function")
      return new pe(t, null, d);
    this.mdns = t, this.txt = new $n.default(d !== null && d.txt != null ? d.txt : void 0), d === null || d.type === void 0 ? (this.name = qn, this.wildcard = !0) : (this.name = (0, _e.toString)({ name: d.type, protocol: d.protocol || "tcp" }) + be, d.name && (this.name = d.name + "." + this.name), this.wildcard = !1), d != null && d.txt !== void 0 && (this.txtQuery = (0, Fn.default)(d.txt)), a && this.on("up", a), this.start();
  }
  start() {
    if (!(this.onresponse || this.name === void 0)) {
      var t = this, d = {};
      this.wildcard || (d[this.name] = !0), this.onresponse = (a, o) => {
        t.wildcard && a.answers.forEach((l) => {
          l.type !== "PTR" || l.name !== t.name || l.name in d || (d[l.data] = !0, t.mdns.query(l.data, "PTR"));
        }), Object.keys(d).forEach(function(l) {
          t.goodbyes(l, a).forEach(t.removeService.bind(t));
          var E = t.buildServicesFor(l, a, t.txt, o);
          E.length !== 0 && E.forEach((I) => {
            if (t.serviceMap[I.fqdn]) {
              t.updateService(I);
              return;
            }
            t.addService(I);
          });
        });
      }, this.mdns.on("response", this.onresponse), this.update();
    }
  }
  stop() {
    this.onresponse && (this.mdns.removeListener("response", this.onresponse), this.onresponse = void 0);
  }
  update() {
    this.mdns.query(this.name, "PTR");
  }
  get services() {
    return this._services;
  }
  addService(t) {
    (0, je.default)(t, this.txtQuery) !== !1 && (this._services.push(t), this.serviceMap[t.fqdn] = !0, this.emit("up", t));
  }
  updateService(t) {
    var d;
    if (!(0, kn.default)(t.txt, ((d = this._services.find((a) => (0, re.default)(a.fqdn, t.fqdn))) === null || d === void 0 ? void 0 : d.txt) || {})) {
      if (!(0, je.default)(t, this.txtQuery)) {
        this.removeService(t.fqdn);
        return;
      }
      this._services = this._services.map(function(a) {
        return (0, re.default)(a.fqdn, t.fqdn) ? t : a;
      }), this.emit("txt-update", t);
    }
  }
  removeService(t) {
    var d, a;
    this._services.some(function(o, l) {
      if ((0, re.default)(o.fqdn, t))
        return d = o, a = l, !0;
    }), !(!d || a === void 0) && (this._services.splice(a, 1), delete this.serviceMap[t], this.emit("down", d));
  }
  goodbyes(t, d) {
    return d.answers.concat(d.additionals).filter((a) => a.type === "PTR" && a.ttl === 0 && (0, re.default)(a.name, t)).map((a) => a.data);
  }
  buildServicesFor(t, d, a, o) {
    var l = d.answers.concat(d.additionals).filter((E) => E.ttl > 0);
    return l.filter((E) => E.type === "PTR" && (0, re.default)(E.name, t)).map((E) => {
      const I = {
        addresses: [],
        subtypes: []
      };
      if (l.filter((m) => m.type === "PTR" && (0, re.default)(m.data, E.data) && m.name.includes("._sub")).forEach((m) => {
        const O = (0, _e.toType)(m.name);
        I.subtypes.push(O.subtype);
      }), l.filter((m) => (m.type === "SRV" || m.type === "TXT") && (0, re.default)(m.name, E.data)).forEach((m) => {
        if (m.type === "SRV") {
          var O = m.name.split("."), P = O[0], g = (0, _e.toType)(O.slice(1, -1).join("."));
          I.name = P, I.fqdn = m.name, I.host = m.data.target, I.referer = o, I.port = m.data.port, I.type = g.name, I.protocol = g.protocol;
        } else m.type === "TXT" && (I.rawTxt = m.data, I.txt = this.txt.decodeAll(m.data));
      }), !!I.name)
        return l.filter((m) => (m.type === "A" || m.type === "AAAA") && (0, re.default)(m.name, I.host)).forEach((m) => I.addresses.push(m.data)), I;
    }).filter((E) => !!E);
  }
}
he.Browser = pe;
he.default = pe;
var me = J && J.__importDefault || function(i) {
  return i && i.__esModule ? i : { default: i };
};
Object.defineProperty(te, "__esModule", { value: !0 });
te.Browser = te.Service = en = te.Bonjour = void 0;
const jn = me(oe), Yn = me(ue), Le = me(he);
te.Browser = Le.default;
const Kn = me(de);
te.Service = Kn.default;
class fe {
  constructor(t = {}, d) {
    this.server = new Yn.default(t, d), this.registry = new jn.default(this.server);
  }
  publish(t) {
    return this.registry.publish(t);
  }
  unpublishAll(t) {
    return this.registry.unpublishAll(t);
  }
  find(t = null, d) {
    return new Le.default(this.server.mdns, t, d);
  }
  findOne(t = null, d = 1e4, a) {
    const o = new Le.default(this.server.mdns, t);
    var l;
    return o.once("up", (E) => {
      l !== void 0 && clearTimeout(l), o.stop(), a && a(E);
    }), l = setTimeout(() => {
      o.stop(), a && a(null);
    }, d), o;
  }
  destroy(t) {
    this.registry.destroy(), this.server.mdns.destroy(t);
  }
}
var en = te.Bonjour = fe;
te.default = fe;
const Qn = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  get Bonjour() {
    return en;
  }
}, Symbol.toStringTag, { value: "Module" }));
export {
  Qn as i
};
