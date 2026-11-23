import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const sw = fs.readFileSync('dist/sw.js', 'utf8');
const files = JSON.parse(sw.match(/^const FILES=(.*);$/m)[1]);
const bytes = files.reduce((n, f) => n + fs.statSync('dist' + f).size, 0);
assert.ok(files.includes('/assets/athlete-v6.glb'));
assert.ok(files.includes('/assets/gym-v4-room.glb'));
for (const old of ['v2', 'v3', 'v4', 'v5'])
  assert.ok(!files.includes(`/assets/athlete-${old}.glb`));
const manifest = JSON.parse(fs.readFileSync('dist/manifest.webmanifest', 'utf8'));
assert.equal(manifest.display, 'standalone');
assert.ok(manifest.icons.length >= 2);
for (const icon of manifest.icons)
  assert.ok(fs.existsSync('dist/' + icon.src.replace(/^\//, '')));
const portrait = JSON.parse(fs.readFileSync('public/assets/portrait-v6.json', 'utf8'));
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
assert.equal(hash(fs.readFileSync('dist/assets/athlete-v6.glb')), portrait.sha256);
let licensedSourceFiles = 0;
for (const base of ['assets/sources/makehuman-system-v3', 'assets/sources/makehuman-clothing-v4']) {
  const provenance = JSON.parse(fs.readFileSync(`${base}/provenance.json`, 'utf8'));
  for (const file of provenance.files) {
    const data = fs.readFileSync(`${base}/${file.path}`);
    assert.equal(data.length, file.bytes, file.path);
    assert.equal(hash(data), file.sha256, file.path);
    licensedSourceFiles++;
  }
}
const report = {
  status: 'pass',
  files: files.length,
  totalBytes: bytes,
  cacheVersion: sw.match(/const CACHE=PREFIX\+"([^"]+)"/)[1],
  manifest: manifest.name,
  portrait,
  licensedSourceFiles,
  limits: [
    'Build and provenance validation, not a physical phone offline test.',
    'The 3D JavaScript chunk remains approximately 1 MB before gzip.',
    'Browser play and responsive viewport checks are documented separately in report.md.',
  ],
};
fs.writeFileSync('docs/qa/decisions-v6/build-report.json', JSON.stringify(report, null, 2) + '\n');
const readme = fs.readFileSync('README.md', 'utf8');
fs.writeFileSync('README.md', readme.replace(/最初に約[0-9.]+MBをキャッシュします。/, `最初に約${(bytes / 1e6).toFixed(1)}MBをキャッシュします。`));
console.log(JSON.stringify({ status: report.status, files: report.files, totalBytes: bytes, licensedSourceFiles }));
