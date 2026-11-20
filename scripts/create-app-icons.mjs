import fs from "node:fs";
import zlib from "node:zlib";
// Original geometric BL monogram; no downloaded logo, font or artwork.
const root = new URL("../public/icons/", import.meta.url);
fs.mkdirSync(root, { recursive: true });
const forest = [23, 59, 44],
  lime = [214, 244, 123];
const table = Array.from({ length: 256 }, (_, n) => {
  for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
function chunk(type, data) {
  const label = Buffer.from(type),
    all = Buffer.concat([label, data]);
  let c = 0xffffffff;
  for (const n of all) c = table[(c ^ n) & 255] ^ (c >>> 8);
  const out = Buffer.alloc(data.length + 12);
  out.writeUInt32BE(data.length, 0);
  all.copy(out, 4);
  out.writeUInt32BE((c ^ 0xffffffff) >>> 0, out.length - 4);
  return out;
}
function rect(x, y, a, b, c, d) {
  return x >= a && x < c && y >= b && y < d;
}
function mark(x, y) {
  const b =
    rect(x, y, 112, 138, 232, 178) ||
    rect(x, y, 112, 138, 154, 374) ||
    rect(x, y, 112, 236, 239, 276) ||
    rect(x, y, 112, 334, 239, 374) ||
    rect(x, y, 208, 160, 250, 250) ||
    rect(x, y, 214, 260, 256, 350);
  const l = rect(x, y, 290, 138, 332, 374) || rect(x, y, 290, 334, 402, 374);
  return b || l;
}
function icon(size) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      let on = 0;
      for (const dx of [0.25, 0.75])
        for (const dy of [0.25, 0.75])
          on += mark(((x + dx) / size) * 512, ((y + dy) / size) * 512) ? 1 : 0;
      const offset = y * (size * 3 + 1) + 1 + x * 3;
      for (let ch = 0; ch < 3; ch++)
        raw[offset + ch] = Math.round(
          forest[ch] + ((lime[ch] - forest[ch]) * on) / 4,
        );
    }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
for (const [name, size] of [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["icon-maskable-512.png", 512],
  ["apple-touch-icon.png", 180],
])
  fs.writeFileSync(new URL(name, root), icon(size));
console.log("Created four original BULK LIFE app icons");
