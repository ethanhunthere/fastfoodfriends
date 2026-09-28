/**
 * Converts transparent PNG cutouts into the shipped WebP masters that
 * scripts/bake-images.cjs then turns into the responsive v2 tiers.
 *
 * Usage: node scripts/make-masters.cjs [item-id ...]
 *   No ids = every cutout in assets/cutouts.
 *
 * Masters keep the longest side at MAX px (matching the existing set) so the
 * 720px tier can be built without upscaling.
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'assets', 'cutouts');
const OUT = path.join(__dirname, '..', 'assets-src', 'menu');
const MAX = 800;

const only = process.argv.slice(2);

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const ids = fs
    .readdirSync(SRC)
    .filter((f) => f.endsWith('.png'))
    .map((f) => f.replace(/\.png$/, ''))
    .filter((id) => !only.length || only.includes(id));
  if (!ids.length) {
    console.error('no cutouts matched');
    process.exit(1);
  }
  for (const id of ids) {
    const buf = await sharp(path.join(SRC, `${id}.png`))
      .resize(MAX, MAX, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 92, effort: 6, alphaQuality: 100 })
      .toBuffer();
    const m = await sharp(buf).metadata();
    fs.writeFileSync(path.join(OUT, `${id}.webp`), buf);
    console.log(`${id}: ${m.width}x${m.height} ${(buf.length / 1024).toFixed(0)}KB`);
  }
  console.log(`DONE ${ids.length} master(s) -> assets-src/menu`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
