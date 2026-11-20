import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";
const url =
  "https://files.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip";
const catalog =
  "https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html";
const range = async (a, b) => {
  const r = await fetch(url, { headers: { Range: `bytes=${a}-${b}` } });
  if (r.status !== 206) throw Error(`Expected range response: ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
};
const tail = await range(280737770 - 131072, 280737769),
  entries = [];
for (let p = 0; p < tail.length - 46; p++) {
  if (tail.readUInt32LE(p) !== 0x02014b50) continue;
  const n = tail.readUInt16LE(p + 28),
    e = tail.readUInt16LE(p + 30),
    c = tail.readUInt16LE(p + 32);
  entries.push({
    name: tail.toString("utf8", p + 46, p + 46 + n),
    compressed: tail.readUInt32LE(p + 20),
    offset: tail.readUInt32LE(p + 42),
    method: tail.readUInt16LE(p + 10),
  });
  p += 45 + n + e + c;
}
const chosen = entries.filter(
  (x) =>
    /^(skins\/young_asian_male|hair\/short02|clothes\/shoes02)\//.test(
      x.name,
    ) && !x.name.endsWith("/"),
);
const root = path.resolve("assets/sources/makehuman-system-v3");
fs.mkdirSync(root, { recursive: true });
const files = [];
for (const x of chosen) {
  const h = await range(x.offset, x.offset + 29);
  const begin = x.offset + 30 + h.readUInt16LE(26) + h.readUInt16LE(28);
  const packed = await range(begin, begin + x.compressed - 1);
  const data = x.method === 8 ? zlib.inflateRawSync(packed) : packed;
  const file = path.resolve(root, x.name);
  if (!file.startsWith(root + path.sep)) throw Error("Invalid asset path");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
  files.push({
    path: x.name,
    bytes: data.length,
    sha256: crypto.createHash("sha256").update(data).digest("hex"),
  });
  console.log(x.name, data.length);
}
fs.writeFileSync(
  path.join(root, "provenance.json"),
  JSON.stringify(
    {
      author: "makehuman_system / MakeHuman Community",
      license: "CC0-1.0",
      catalog,
      url,
      archiveBytes: 280737770,
      archiveLastModified: "2024-04-14",
      retrieved: "2026-11-20",
      files,
    },
    null,
    2,
  ),
);
fs.copyFileSync(
  "assets/sources/makehuman/LICENSE.ASSETS.md",
  path.join(root, "LICENSE.CC0.md"),
);
