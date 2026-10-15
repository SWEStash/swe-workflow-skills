#!/usr/bin/env node
// Generate the per-role plugin icons (assets/plugin-icons/<role>.svg + .png).
//
//   node scripts/build-icons.mjs
//
// Dev-only: rendering needs `rsvg-convert` (librsvg). The PNGs are committed, and
// build-plugins.mjs copies each one into plugins/<role>/.claude-plugin/icon.png,
// where Anthropic's plugin directory reads the listing icon (square PNG, 512 to
// 2048 px). The directory takes the icon only on a plugin's first submission, so
// changing one here later does not change a live listing.

import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { inflateSync, deflateSync, constants as zlibConst } from "node:zlib";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "assets", "plugin-icons");
const SIZE = 1024;
const BG = "#10161c"; // sampled from the project logo
const FG = "#7df9df";

// Each glyph is drawn in a 300x300 box, stroked in FG. `dot` marks filled circles.
const dot = (x, y, r = 11) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${FG}" stroke="none"/>`;
const node = (x, y, r = 20) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${BG}"/>`;

const GLYPHS = {
  ai: `<path d="M130 50 Q140 150 240 160 Q140 170 130 270 Q120 170 20 160 Q120 150 130 50Z"/>
       <path d="M240 15 Q244 56 285 60 Q244 64 240 105 Q236 64 195 60 Q236 56 240 15Z"/>`,
  architect: `<path d="M150 35 L280 100 L150 165 L20 100Z"/>
       <path d="M20 160 L150 225 L280 160"/><path d="M20 215 L150 280 L280 215"/>`,
  backend: [30, 115, 200]
    .map((y) => `<rect x="20" y="${y}" width="260" height="70" rx="16"/>${dot(65, y + 35)}<path d="M150 ${y + 35} H240"/>`)
    .join(""),
  data: `<ellipse cx="150" cy="60" rx="110" ry="35"/><path d="M40 60 V240 M260 60 V240"/>
       <path d="M40 150 A110 35 0 0 0 260 150"/><path d="M40 240 A110 35 0 0 0 260 240"/>`,
  "data-scientist": `<path d="M30 20 V270 H285"/><path d="M70 235 L270 55" stroke-width="12" stroke-dasharray="4 26"/>
       ${dot(85, 205, 14)}${dot(130, 185, 14)}${dot(165, 140, 14)}${dot(215, 120, 14)}${dot(250, 70, 14)}`,
  designer: `<path d="M150 20 L250 140 L190 275 H110 L50 140Z"/><path d="M150 20 V150"/>
       <circle cx="150" cy="172" r="22"/><path d="M110 235 H190"/>`,
  devops: `<path d="M150 150 C110 85 25 85 25 150 C25 215 110 215 150 150 C190 85 275 85 275 150 C275 215 190 215 150 150Z"/>`,
  em: `<circle cx="150" cy="95" r="40"/><path d="M80 255 Q80 165 150 165 Q220 165 220 255"/>
       <circle cx="55" cy="125" r="28"/><path d="M10 240 Q10 185 55 185"/>
       <circle cx="245" cy="125" r="28"/><path d="M290 240 Q290 185 245 185"/>`,
  frontend: `<rect x="10" y="30" width="280" height="240" rx="24"/><path d="M10 90 H290"/>
       ${dot(45, 60, 9)}${dot(80, 60, 9)}${dot(115, 60, 9)}
       <path d="M110 140 L80 177 L110 214 M190 140 L220 177 L190 214 M165 130 L135 224"/>`,
  ml: (() => {
    const l1 = [[40, 85], [40, 215]], l2 = [[150, 40], [150, 150], [150, 260]], l3 = [[260, 150]];
    const edges = [...l1.flatMap((a) => l2.map((b) => [a, b])), ...l2.flatMap((a) => l3.map((b) => [a, b]))];
    return edges.map(([a, b]) => `<path d="M${a[0]} ${a[1]} L${b[0]} ${b[1]}" stroke-width="12"/>`).join("") +
      [...l1, ...l2, ...l3].map(([x, y]) => node(x, y, 24)).join("");
  })(),
  mobile: `<rect x="70" y="10" width="160" height="280" rx="30"/><path d="M125 42 H175"/>${dot(150, 250, 13)}`,
  pm: [60, 150, 240]
    .map((y) => `<path d="M20 ${y} L45 ${y + 25} L90 ${y - 25}"/><path d="M135 ${y} H280"/>`)
    .join(""),
  qa: `<circle cx="125" cy="125" r="100"/><path d="M198 198 L278 278"/><path d="M78 125 L113 160 L175 95"/>`,
  security: `<path d="M150 15 L270 60 V140 C270 215 215 260 150 285 C85 260 30 215 30 140 V60Z"/>
       <circle cx="150" cy="130" r="28"/><path d="M150 158 V205"/>`,
  strategy: `<circle cx="140" cy="160" r="120"/><circle cx="140" cy="160" r="72"/>${dot(140, 160, 26)}
       <path d="M140 160 L270 30 M215 30 H270 V85"/>`,
};

// Corner brackets framing the tile, as in the project logo.
function brackets() {
  const a = 150, b = SIZE - a, len = 200, r = 90;
  return [
    `M${a} ${a + len} V${a + r} Q${a} ${a} ${a + r} ${a} H${a + len}`,
    `M${b - len} ${a} H${b - r} Q${b} ${a} ${b} ${a + r} V${a + len}`,
    `M${a} ${b - len} V${b - r} Q${a} ${b} ${a + r} ${b} H${a + len}`,
    `M${b - len} ${b} H${b - r} Q${b} ${b} ${b} ${b - r} V${b - len}`,
  ].map((d) => `<path d="${d}" stroke-width="28"/>`).join("");
}

export function iconSvg(role) {
  const glyph = GLYPHS[role];
  if (!glyph) throw new Error(`no icon glyph for role '${role}'`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="9" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="${SIZE}" height="${SIZE}" fill="${BG}"/>
  <g filter="url(#glow)" fill="none" stroke="${FG}" stroke-width="22" stroke-linecap="round" stroke-linejoin="round">
    ${brackets()}
    <rect x="262" y="262" width="500" height="500" rx="72"/>
    <g transform="translate(332 332) scale(1.2)" stroke-width="20">${glyph}</g>
  </g>
</svg>
`;
}

// The directory's scanner screens an image's printable byte runs as text, and
// compressed pixel data can spell a fetch-and-run idiom by chance (an `iEX` in the
// ml icon was flagged). Re-deflate the image data until no run matches.
const RISKY = /iex|irm|curl|wget|bash/i;

function printableRuns(buf) {
  return buf.toString("latin1").match(/[\x20-\x7e]{3,}/g) ?? [];
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4), crc = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  crc.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "latin1"), data])));
  return Buffer.concat([len, Buffer.from(type, "latin1"), data, crc]);
}

function scrubPng(file) {
  const png = readFileSync(file);
  if (!printableRuns(png).some((r) => RISKY.test(r))) return;
  const head = [], idat = [];
  let tail = null;
  for (let off = 8; off < png.length; ) {
    const len = png.readUInt32BE(off), type = png.toString("latin1", off + 4, off + 8);
    const whole = png.subarray(off, off + 12 + len);
    if (type === "IDAT") idat.push(png.subarray(off + 8, off + 8 + len));
    else if (type === "IEND") tail = whole;
    else if (!idat.length) head.push(whole);
    off += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  for (const strategy of [zlibConst.Z_DEFAULT_STRATEGY, zlibConst.Z_FILTERED, zlibConst.Z_RLE]) {
    for (let level = 9; level >= 1; level--) {
      const out = Buffer.concat([png.subarray(0, 8), ...head, chunk("IDAT", deflateSync(raw, { level, strategy })), tail]);
      if (!printableRuns(out).some((r) => RISKY.test(r))) return writeFileSync(file, out);
    }
  }
  throw new Error(`${file}: no compression setting avoids a risky byte run`);
}

const roles = Object.keys(JSON.parse(readFileSync(join(ROOT, "roles.json"), "utf-8")).roles);
mkdirSync(OUT, { recursive: true });
for (const role of roles) {
  const svg = join(OUT, `${role}.svg`);
  writeFileSync(svg, iconSvg(role));
  execFileSync("rsvg-convert", ["-w", String(SIZE), "-h", String(SIZE), "-o", join(OUT, `${role}.png`), svg]);
  scrubPng(join(OUT, `${role}.png`));
}
console.log(`Rendered ${roles.length} icons into assets/plugin-icons/`);
