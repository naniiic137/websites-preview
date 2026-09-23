/* Minimal QR Code generator (byte mode, ECC L/M, versions 1–10).
   Follows ISO/IEC 18004 — structure modelled on Project Nayuki's reference
   implementation (MIT). Runs fully offline; no dependencies. */
(function (global) {
  'use strict';

  var ECC = { L: { idx: 0, bits: 1 }, M: { idx: 1, bits: 0 } };
  // [ecl][version] tables, index 0 unused
  var ECC_PER_BLOCK = [
    [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18],
    [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26]
  ];
  var NUM_BLOCKS = [
    [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4],
    [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5]
  ];

  function rawDataModules(ver) {
    var r = (16 * ver + 128) * ver + 64;
    if (ver >= 2) {
      var na = Math.floor(ver / 7) + 2;
      r -= (25 * na - 10) * na - 55;
      if (ver >= 7) r -= 36;
    }
    return r;
  }
  function dataCodewords(ver, e) {
    return Math.floor(rawDataModules(ver) / 8) - ECC_PER_BLOCK[e][ver] * NUM_BLOCKS[e][ver];
  }

  // GF(256) arithmetic, poly 0x11D
  function gfMul(x, y) {
    var z = 0;
    for (var i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11D);
      z ^= ((y >>> i) & 1) * x;
    }
    return z & 0xFF;
  }
  function rsDivisor(degree) {
    var res = [];
    for (var i = 0; i < degree - 1; i++) res.push(0);
    res.push(1);
    var root = 1;
    for (i = 0; i < degree; i++) {
      for (var j = 0; j < res.length; j++) {
        res[j] = gfMul(res[j], root);
        if (j + 1 < res.length) res[j] ^= res[j + 1];
      }
      root = gfMul(root, 0x02);
    }
    return res;
  }
  function rsRemainder(data, div) {
    var res = div.map(function () { return 0; });
    data.forEach(function (b) {
      var f = b ^ res.shift();
      res.push(0);
      for (var i = 0; i < div.length; i++) res[i] ^= gfMul(div[i], f);
    });
    return res;
  }

  function utf8(str) {
    var out = [], s = unescape(encodeURIComponent(str));
    for (var i = 0; i < s.length; i++) out.push(s.charCodeAt(i));
    return out;
  }

  function encode(text, level, forceMask) {
    var e = ECC[level || 'M'] || ECC.M;
    var bytes = utf8(text);
    var ver, cap;
    for (ver = 1; ver <= 10; ver++) {
      cap = dataCodewords(ver, e.idx) * 8;
      var ccBits = ver <= 9 ? 8 : 16;
      if (4 + ccBits + bytes.length * 8 <= cap) break;
    }
    if (ver > 10) throw new Error('QR: text too long');

    // Bit stream
    var bits = [];
    function put(val, len) { for (var i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); }
    put(4, 4);
    put(bytes.length, ver <= 9 ? 8 : 16);
    bytes.forEach(function (b) { put(b, 8); });
    put(0, Math.min(4, cap - bits.length));
    put(0, (8 - bits.length % 8) % 8);
    for (var pad = 0xEC; bits.length < cap; pad ^= 0xEC ^ 0x11) put(pad, 8);
    var data = [];
    for (var i = 0; i < bits.length; i += 8) {
      var v = 0;
      for (var k = 0; k < 8; k++) v = (v << 1) | bits[i + k];
      data.push(v);
    }

    // Error correction + interleave
    var nb = NUM_BLOCKS[e.idx][ver], eccLen = ECC_PER_BLOCK[e.idx][ver];
    var rawCw = Math.floor(rawDataModules(ver) / 8);
    var nShort = nb - rawCw % nb, shortLen = Math.floor(rawCw / nb);
    var div = rsDivisor(eccLen), blocks = [], pos = 0;
    for (i = 0; i < nb; i++) {
      var dat = data.slice(pos, pos + shortLen - eccLen + (i < nShort ? 0 : 1));
      pos += dat.length;
      var ecc = rsRemainder(dat, div);
      if (i < nShort) dat.push(0);
      blocks.push(dat.concat(ecc));
    }
    var cw = [];
    for (i = 0; i < blocks[0].length; i++) {
      for (var j = 0; j < blocks.length; j++) {
        if (i !== shortLen - eccLen || j >= nShort) cw.push(blocks[j][i]);
      }
    }

    // Matrix
    var size = ver * 4 + 17;
    var mod = [], fn = [];
    for (i = 0; i < size; i++) { mod.push(new Array(size).fill(false)); fn.push(new Array(size).fill(false)); }
    function setF(x, y, d) { mod[y][x] = d; fn[y][x] = true; }

    for (i = 0; i < size; i++) { setF(6, i, i % 2 === 0); setF(i, 6, i % 2 === 0); }
    function finder(cx, cy) {
      for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) {
        var d = Math.max(Math.abs(dx), Math.abs(dy)), x = cx + dx, y = cy + dy;
        if (x >= 0 && x < size && y >= 0 && y < size) setF(x, y, d !== 2 && d !== 4);
      }
    }
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);

    var align = [];
    if (ver > 1) {
      var na = Math.floor(ver / 7) + 2;
      var step = Math.ceil((ver * 4 + 4) / (na * 2 - 2)) * 2;
      align = [6];
      for (var p = size - 7; align.length < na; p -= step) align.splice(1, 0, p);
    }
    for (i = 0; i < align.length; i++) for (j = 0; j < align.length; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === align.length - 1) || (i === align.length - 1 && j === 0)) continue;
      for (var ay = -2; ay <= 2; ay++) for (var ax = -2; ax <= 2; ax++)
        setF(align[i] + ax, align[j] + ay, Math.max(Math.abs(ax), Math.abs(ay)) !== 1);
    }

    function drawFormat(mask) {
      var d = (e.bits << 3) | mask, r = d;
      for (var i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
      var b = ((d << 10) | r) ^ 0x5412;
      function bit(n) { return ((b >>> n) & 1) !== 0; }
      for (i = 0; i <= 5; i++) setF(8, i, bit(i));
      setF(8, 7, bit(6)); setF(8, 8, bit(7)); setF(7, 8, bit(8));
      for (i = 9; i < 15; i++) setF(14 - i, 8, bit(i));
      for (i = 0; i < 8; i++) setF(size - 1 - i, 8, bit(i));
      for (i = 8; i < 15; i++) setF(8, size - 15 + i, bit(i));
      setF(8, size - 8, true);
    }
    drawFormat(0); // reserve

    if (ver >= 7) {
      var r = ver;
      for (i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1F25);
      var vb = (ver << 12) | r;
      for (i = 0; i < 18; i++) {
        var bt = ((vb >>> i) & 1) !== 0, a = size - 11 + i % 3, bb = Math.floor(i / 3);
        setF(a, bb, bt); setF(bb, a, bt);
      }
    }

    // Place codewords in zigzag
    var bi = 0;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < size; vert++) {
        for (j = 0; j < 2; j++) {
          var x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - vert : vert;
          if (!fn[y][x] && bi < cw.length * 8) {
            mod[y][x] = ((cw[bi >>> 3] >>> (7 - (bi & 7))) & 1) !== 0;
            bi++;
          }
        }
      }
    }

    function maskFn(m, x, y) {
      switch (m) {
        case 0: return (x + y) % 2 === 0;
        case 1: return y % 2 === 0;
        case 2: return x % 3 === 0;
        case 3: return (x + y) % 3 === 0;
        case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
        case 5: return x * y % 2 + x * y % 3 === 0;
        case 6: return (x * y % 2 + x * y % 3) % 2 === 0;
        default: return ((x + y) % 2 + x * y % 3) % 2 === 0;
      }
    }
    function applyMask(m) {
      for (var y = 0; y < size; y++) for (var x = 0; x < size; x++)
        if (!fn[y][x] && maskFn(m, x, y)) mod[y][x] = !mod[y][x];
    }
    // Simplified penalty (runs, 2x2 blocks, balance) to choose a good mask
    function penalty() {
      var s = 0, dark = 0, x, y;
      for (y = 0; y < size; y++) {
        var runX = 1, runY = 1;
        for (x = 0; x < size; x++) {
          if (mod[y][x]) dark++;
          if (x > 0) {
            if (mod[y][x] === mod[y][x - 1]) { runX++; if (runX === 5) s += 3; else if (runX > 5) s++; } else runX = 1;
            if (mod[x][y] === mod[x - 1][y]) { runY++; if (runY === 5) s += 3; else if (runY > 5) s++; } else runY = 1;
          }
          if (x < size - 1 && y < size - 1) {
            var c = mod[y][x];
            if (c === mod[y][x + 1] && c === mod[y + 1][x] && c === mod[y + 1][x + 1]) s += 3;
          }
        }
      }
      var total = size * size;
      s += Math.floor(Math.abs(dark * 20 - total * 10) / total) * 10;
      return s;
    }
    var best = 0, bestScore = Infinity;
    for (var m = 0; m < 8; m++) {
      applyMask(m); drawFormat(m);
      var sc = penalty();
      if (sc < bestScore) { bestScore = sc; best = m; }
      applyMask(m);
    }
    if (forceMask >= 0 && forceMask < 8) best = forceMask;
    applyMask(best); drawFormat(best);
    return { size: size, version: ver, mask: best, modules: mod };
  }

  function toSVG(text, opts) {
    opts = opts || {};
    var q = encode(text, opts.level || 'M'), border = opts.border == null ? 4 : opts.border;
    var n = q.size + border * 2, path = '';
    for (var y = 0; y < q.size; y++) for (var x = 0; x < q.size; x++)
      if (q.modules[y][x]) path += 'M' + (x + border) + ',' + (y + border) + 'h1v1h-1z';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + n + ' ' + n + '" shape-rendering="crispEdges" aria-hidden="true">' +
      '<rect width="100%" height="100%" fill="' + (opts.light || '#fff') + '"/>' +
      '<path d="' + path + '" fill="' + (opts.dark || '#000') + '"/></svg>';
  }

  global.QR = { encode: encode, toSVG: toSVG };
})(typeof window !== 'undefined' ? window : globalThis);
