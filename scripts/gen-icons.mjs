// Generates the PWA icons (no dependencies): the plasma background with a frosted-glass tile and a
// white check, matching the app's design. Run: node scripts/gen-icons.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

// Colours/feel match the app's plasma background (src/shaders/plasma.frag + ShaderBackground.tsx).
const COLORS = [[0.086, 0.043, 0.043], [0.761, 0.251, 0.165], [0.957, 0.616, 0.216], [1.0, 0.91, 0.761]];
const P = { scale: 1.5, intensity: 0.48, contrast: 0.92, brightness: -0.5, hue: 3.04, vignette: 0.45, seed: 7, drift: 0.16 };
const T = Number(process.env.ICON_T ?? 2.2); // shader time to freeze; pick a frame that looks good
const GRAIN = 0; // the app has grain; on an icon it is barely visible but makes the PNGs ~5x bigger

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
/** RGBA pixels in, RGB PNG out, Paeth-filtered rows (much smaller for smooth gradients). */
function png(size, px) {
  const stride = size * 3;
  const rgb = Buffer.alloc(stride * size);
  for (let i = 0, j = 0; i < px.length; i += 4, j += 3) { rgb[j] = px[i]; rgb[j + 1] = px[i + 1]; rgb[j + 2] = px[i + 2]; }
  const raw = Buffer.alloc((stride + 1) * size);
  const paeth = (a, b, c) => { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; };
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 4; // Paeth
    for (let x = 0; x < stride; x++) {
      const cur = rgb[y * stride + x];
      const a = x >= 3 ? rgb[y * stride + x - 3] : 0;
      const b = y > 0 ? rgb[(y - 1) * stride + x] : 0;
      const c = x >= 3 && y > 0 ? rgb[(y - 1) * stride + x - 3] : 0;
      raw[y * (stride + 1) + 1 + x] = (cur - paeth(a, b, c)) & 0xff;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}

const sdRoundRect = (x, y, cx, cy, half, r) => {
  const qx = Math.abs(x - cx) - half + r, qy = Math.abs(y - cy) - half + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
};
const sdSegment = (x, y, ax, ay, bx, by) => {
  const pax = x - ax, pay = y - ay, bax = bx - ax, bay = by - ay;
  const h = Math.max(0, Math.min(1, (pax * bax + pay * bay) / (bax * bax + bay * bay)));
  return Math.hypot(pax - bax * h, pay - bay * h);
};
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (e0, e1, x) => { const t = clamp01((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
const lerp3 = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const fract = (v) => v - Math.floor(v);

// ---- CPU port of the plasma shader (no cursor, OKLab off) ----
function palette(x) {
  const n = COLORS.length - 1, f = clamp01(x) * n;
  let col = COLORS[0];
  for (let i = 0; i < n; i++) col = lerp3(col, COLORS[i + 1], smooth(0, 1, clamp01(f - i)));
  return col;
}
function shade(px, py) {
  const k = 2 + P.intensity * 6, t = T * 0.86;
  const v = Math.sin(px * k + t) + Math.sin(py * k * 0.8 - t * 0.7)
    + Math.sin((px + py) * k * 0.6 + t * 0.5) + Math.sin(Math.hypot(px, py) * k * 1.2 - t);
  return palette(0.5 + 0.5 * Math.sin(v + P.seed));
}
function post([r, g, b], u, v) {
  [r, g, b] = [r, g, b].map((c) => (c - 0.5) * P.contrast + 0.5);
  // YIQ hue rotation, same matrices as the shader.
  const Y = 0.299 * r + 0.587 * g + 0.114 * b, I = 0.596 * r - 0.274 * g - 0.322 * b, Q = 0.211 * r - 0.523 * g + 0.312 * b;
  const ca = Math.cos(P.hue), sa = Math.sin(P.hue), I2 = I * ca - Q * sa, Q2 = I * sa + Q * ca;
  r = Y + 0.956 * I2 + 0.621 * Q2; g = Y - 0.272 * I2 - 0.647 * Q2; b = Y - 1.106 * I2 + 1.703 * Q2;
  const vig = 1 - P.vignette * smooth(0.35, 1, Math.hypot(u - 0.5, v - 0.5) * Math.SQRT2);
  return [r, g, b].map((c) => (c + P.brightness) * vig);
}
function grainHash(x, y) {
  let a = fract(x * 0.1031), b = fract(y * 0.1031), c = fract(x * 0.1031);
  const d = a * (b + 33.33) + b * (c + 33.33) + c * (a + 33.33);
  a += d; b += d; c += d;
  return fract((a + b) * c);
}
/** Plasma colour at pixel (x, y) of an s×s icon; `blur` > 0 averages taps for the frosted tile. */
function plasma(x, y, s, blur = 0) {
  const toP = (X, Y) => [((X - s / 2) / s) * P.scale + P.drift * Math.sin(T * 0.86 * 0.31), ((s / 2 - Y) / s) * P.scale + P.drift * Math.cos(T * 0.86 * 0.23)];
  let col = [0, 0, 0], n = 0;
  const taps = blur ? [-1, 0, 1] : [0];
  for (const dx of taps) for (const dy of taps) {
    const [px, py] = toP(x + dx * blur * s, y + dy * blur * s);
    col = col.map((c, i) => c + shade(px, py)[i]); n++;
  }
  return post(col.map((c) => c / n), x / s, y / s);
}

/** tileScale: fraction of the canvas the glass tile covers (smaller for the maskable safe zone). */
function render(size, tileScale) {
  const px = Buffer.alloc(size * size * 4);
  const s = size, c = s / 2;
  const half = (s * tileScale) / 2, r = half * 0.42;
  const k = half / 0.5 / s;
  const pts = [[0.3, 0.52], [0.44, 0.66], [0.71, 0.37]].map(([x, y]) => [c + (x - 0.5) * s * k, c + (y - 0.5) * s * k]);
  const w = s * 0.05 * k;
  const TINT = [14 / 255, 16 / 255, 22 / 255];
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const X = x + 0.5, Y = y + 0.5;
    const dt = sdRoundRect(X, Y, c, c, half, r);
    const inTile = clamp01(0.5 - dt);
    let col = plasma(X, Y, s);
    // Soft drop shadow below the tile.
    const sh = sdRoundRect(X, Y - s * 0.02, c, c, half, r);
    col = col.map((v) => v * (1 - 0.35 * (1 - smooth(0, s * 0.06, sh)) * (1 - inTile)));
    if (inTile > 0) {
      // Frosted glass: blurred plasma, dark tint, diagonal sheen, bright rim and top lip.
      let g = plasma(X, Y, s, 0.035);
      g = lerp3(g, TINT, 0.32);
      const diag = clamp01(((X - (c - half)) + (Y - (c - half))) / (4 * half));
      const sheen = 0.16 - 0.13 * smooth(0, 0.45, diag) + 0.03 * smooth(0.45, 1, diag);
      g = g.map((v) => v + (1 - v) * sheen);
      const rim = 1 - smooth(0, s * 0.012, -dt);
      const lip = rim * smooth(c + half * 0.2, c - half, Y);
      g = g.map((v) => v + (1 - v) * (0.18 * rim + 0.35 * lip));
      col = lerp3(col, g, inTile);
    }
    // White check with a soft sky-blue glow.
    const dc = Math.min(sdSegment(X, Y, ...pts[0], ...pts[1]), sdSegment(X, Y, ...pts[1], ...pts[2])) - w;
    const glow = (1 - smooth(0, s * 0.07, dc)) * 0.45;
    col = lerp3(col, [0.3, 0.76, 1], glow * inTile);
    col = lerp3(col, [1, 1, 1], clamp01(0.5 - dc));
    const gr = (grainHash(X + P.seed * 17, Y + P.seed * 31) - 0.5) * GRAIN;
    const i = (y * s + x) * 4;
    px[i] = Math.round(clamp01(col[0] + gr) * 255); px[i + 1] = Math.round(clamp01(col[1] + gr) * 255);
    px[i + 2] = Math.round(clamp01(col[2] + gr) * 255); px[i + 3] = 255;
  }
  return png(s, px);
}

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-192.png', render(192, 0.7));
writeFileSync('public/icons/icon-512.png', render(512, 0.7));
writeFileSync('public/icons/icon-maskable-512.png', render(512, 0.54));
// Favicon: a vector approximation (blue glow on near-black, glass tile, white check).
writeFileSync('public/icons/icon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><radialGradient id="b" cx="30%" cy="25%" r="90%"><stop offset="0" stop-color="#3a5cff"/><stop offset=".45" stop-color="#1230b8"/><stop offset="1" stop-color="#05060a"/></radialGradient><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".32"/><stop offset=".5" stop-color="#fff" stop-opacity=".08"/><stop offset="1" stop-color="#fff" stop-opacity=".14"/></linearGradient></defs><rect width="64" height="64" rx="14" fill="url(#b)"/><rect x="10" y="10" width="44" height="44" rx="16" fill="#0e1016" fill-opacity=".35"/><rect x="10.5" y="10.5" width="43" height="43" rx="15.5" fill="url(#g)" stroke="#fff" stroke-opacity=".35"/><path d="M22 33l7 7 13-14" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>`);
console.log('icons written');
