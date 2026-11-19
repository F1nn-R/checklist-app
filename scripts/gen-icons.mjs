// Generates the PWA icons (no dependencies). Run: node scripts/gen-icons.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BG = [0x0f, 0x11, 0x15];
const TILE = [0x6c, 0x8c, 0xff];
const CHECK = [0x0b, 0x0d, 0x12];

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
function png(size, px) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
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
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

/** tileScale: fraction of the canvas the rounded tile covers (smaller for maskable safe zone). */
function render(size, tileScale, fullBleedBg) {
  const px = Buffer.alloc(size * size * 4);
  const s = size;
  const half = (s * tileScale) / 2, c = s / 2, r = half * 0.42;
  const k = half / 0.5 / s; // scale check relative to tile
  const pts = [[0.3, 0.52], [0.44, 0.66], [0.71, 0.37]].map(([x, y]) => [c + (x - 0.5) * s * k, c + (y - 0.5) * s * k]);
  const w = s * 0.055 * k;
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const X = x + 0.5, Y = y + 0.5;
    let col = BG, a = fullBleedBg ? 1 : 0;
    const dt = sdRoundRect(X, Y, c, c, half, r);
    const tA = Math.max(0, Math.min(1, 0.5 - dt));
    if (tA > 0) { col = fullBleedBg ? mix(BG, TILE, tA) : TILE; a = fullBleedBg ? 1 : tA; }
    const dc = Math.min(sdSegment(X, Y, ...pts[0], ...pts[1]), sdSegment(X, Y, ...pts[1], ...pts[2])) - w;
    const cA = Math.max(0, Math.min(1, 0.5 - dc));
    if (cA > 0) col = mix(col, CHECK, cA);
    const i = (y * s + x) * 4;
    px[i] = col[0]; px[i + 1] = col[1]; px[i + 2] = col[2]; px[i + 3] = Math.round(a * 255);
  }
  return png(s, px);
}

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-192.png', render(192, 0.84, true));
writeFileSync('public/icons/icon-512.png', render(512, 0.84, true));
writeFileSync('public/icons/icon-maskable-512.png', render(512, 0.62, true));
writeFileSync('public/icons/icon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="4" y="4" width="56" height="56" rx="20" fill="#6c8cff"/><path d="M20 33.5l9 9L46 24" fill="none" stroke="#0b0d12" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`);
console.log('icons written');
