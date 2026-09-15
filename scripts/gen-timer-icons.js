// One-off icon generator for timer.html's home-screen icon — reuses the onlymakkus brand
// colors (ink/blaze/paper) instead of a generic palette. Pure Node (zlib + hand-rolled PNG
// encoder), no image-library dependency. Run once: node scripts-gen-timer-icons.js
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const BG = [18, 18, 20];        // --bg (Split-Second)
const ACCENT = [255, 69, 58];   // --accent
const ACCENT_DIM = [208, 31, 24]; // --accent-text (light-mode), used here as a deeper shade
const FG = [242, 240, 236];     // --ink (Split-Second's dark-mode text/paper equivalent)

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[n] = c >>> 0;
    }
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0); ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; ihdrData[9] = 6; ihdrData[10] = 0; ihdrData[11] = 0; ihdrData[12] = 0;
  const ihdr = chunk('IHDR', ihdrData);
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = chunk('IDAT', zlib.deflateSync(raw, { level: 9 }));
  const iend = chunk('IEND', Buffer.alloc(0));
  return Buffer.concat([sig, ihdr, idat, iend]);
}
function makeCanvas(size) { return { size, buf: Buffer.alloc(size * size * 4) }; }
function setPx(c, x, y, [r, g, b], a = 255) {
  if (x < 0 || y < 0 || x >= c.size || y >= c.size) return;
  const i = (y * c.size + x) * 4;
  if (a >= 255) { c.buf[i] = r; c.buf[i + 1] = g; c.buf[i + 2] = b; c.buf[i + 3] = 255; }
  else {
    const ea = a / 255;
    c.buf[i] = Math.round(r * ea + c.buf[i] * (1 - ea));
    c.buf[i + 1] = Math.round(g * ea + c.buf[i + 1] * (1 - ea));
    c.buf[i + 2] = Math.round(b * ea + c.buf[i + 2] * (1 - ea));
    c.buf[i + 3] = 255;
  }
}
function fillBg(c, color) { for (let y = 0; y < c.size; y++) for (let x = 0; x < c.size; x++) setPx(c, x, y, color); }
function drawRing(c, cx, cy, rOuter, rInner, color) {
  const SS = 4;
  for (let y = 0; y < c.size; y++) for (let x = 0; x < c.size; x++) {
    let hits = 0;
    for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
      const px = x + (sx + .5) / SS, py = y + (sy + .5) / SS;
      const d = Math.hypot(px - cx, py - cy);
      if (d <= rOuter && d >= rInner) hits++;
    }
    if (hits > 0) setPx(c, x, y, color, Math.round(hits / (SS * SS) * 255));
  }
}
function drawDisc(c, cx, cy, r, color) {
  const SS = 4;
  for (let y = 0; y < c.size; y++) for (let x = 0; x < c.size; x++) {
    let hits = 0;
    for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
      const px = x + (sx + .5) / SS, py = y + (sy + .5) / SS;
      if (Math.hypot(px - cx, py - cy) <= r) hits++;
    }
    if (hits > 0) setPx(c, x, y, color, Math.round(hits / (SS * SS) * 255));
  }
}
function drawThickLine(c, x1, y1, x2, y2, w, color) {
  const SS = 3;
  const minX = Math.floor(Math.min(x1, x2) - w), maxX = Math.ceil(Math.max(x1, x2) + w);
  const minY = Math.floor(Math.min(y1, y2) - w), maxY = Math.ceil(Math.max(y1, y2) + w);
  const dx = x2 - x1, dy = y2 - y1, lenSq = dx * dx + dy * dy || 1;
  for (let y = Math.max(0, minY); y < Math.min(c.size, maxY); y++) {
    for (let x = Math.max(0, minX); x < Math.min(c.size, maxX); x++) {
      let hits = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const px = x + (sx + .5) / SS, py = y + (sy + .5) / SS;
        let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));
        const cxp = x1 + t * dx, cyp = y1 + t * dy;
        if (Math.hypot(px - cxp, py - cyp) <= w / 2) hits++;
      }
      if (hits > 0) setPx(c, x, y, color, Math.round(hits / (SS * SS) * 255));
    }
  }
}
function buildIcon(size, { padding = 0.09 } = {}) {
  const c = makeCanvas(size);
  fillBg(c, BG);
  const cx = size / 2, cy = size / 2 + size * 0.02;
  const rOuter = size * (0.5 - padding);
  const ringW = size * 0.075;
  const crownW = size * 0.14, crownH = size * 0.07;
  const crownY = cy - rOuter - ringW / 2 - crownH * 0.55;
  for (let y = -crownH / 2; y <= crownH / 2; y++)
    for (let x = -crownW / 2; x <= crownW / 2; x++)
      setPx(c, Math.round(cx + x), Math.round(crownY + y), ACCENT_DIM);
  drawRing(c, cx, cy, rOuter, rOuter - ringW, ACCENT);
  const tickLen = size * 0.06;
  [-1, 1].forEach(sign => {
    const ang = Math.PI * 0.25;
    const bx = cx + sign * Math.cos(ang) * (rOuter + ringW * 0.1);
    const by = cy - Math.sin(ang) * (rOuter + ringW * 0.1);
    const ex = cx + sign * Math.cos(ang) * (rOuter + ringW * 0.1 + tickLen);
    const ey = cy - Math.sin(ang) * (rOuter + ringW * 0.1 + tickLen);
    drawThickLine(c, bx, by, ex, ey, ringW * 0.55, ACCENT_DIM);
  });
  drawDisc(c, cx, cy, size * 0.025, FG);
  const handAngle = -Math.PI / 2 + Math.PI * 0.55;
  drawThickLine(c, cx, cy, cx + Math.cos(handAngle) * rOuter * 0.62, cy + Math.sin(handAngle) * rOuter * 0.62, size * 0.045, FG);
  const hand2Angle = -Math.PI / 2 - Math.PI * 0.35;
  drawThickLine(c, cx, cy, cx + Math.cos(hand2Angle) * rOuter * 0.4, cy + Math.sin(hand2Angle) * rOuter * 0.4, size * 0.045, FG);
  return encodePNG(size, size, c.buf);
}

const outDir = path.join(__dirname, '..', 'icons');
fs.mkdirSync(outDir, { recursive: true });
const specs = [
  ['timer-icon-192.png', 192, 0.09],
  ['timer-icon-512.png', 512, 0.09],
  ['timer-icon-maskable-512.png', 512, 0.20],
  ['timer-apple-touch-icon.png', 180, 0.09],
  ['timer-favicon-32.png', 32, 0.09],
];
for (const [name, size, padding] of specs) {
  const png = buildIcon(size, { padding });
  fs.writeFileSync(path.join(outDir, name), png);
  console.log('wrote', name, png.length, 'bytes');
}
