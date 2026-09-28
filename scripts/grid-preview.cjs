/**
 * Overlays a fractional measuring grid on a candidate crop of a raw source, so
 * isolation crop boxes can be chosen by reading fractions instead of guessing.
 *
 * Usage: node scripts/grid-preview.cjs <item-id> <left> <top> <right> <bottom>
 *   e.g. node scripts/grid-preview.cjs uje-rugove 0.26 0.04 0.78 0.94
 *
 * Writes /tmp/grid-<item-id>.jpg
 */
const sharp = require('sharp');

const [id, l, t, r, b] = process.argv.slice(2);
if (!id || l === undefined) {
  console.error('usage: node scripts/grid-preview.cjs <item-id> <left> <top> <right> <bottom>');
  process.exit(2);
}
const SRC = `/home/f0id/Downloads/fastfoodfriends/assets/raw_sources/${id}.jpg`;
const OUT = `/tmp/grid-${id}.jpg`;

(async () => {
  const m = await sharp(SRC).metadata();
  const nums = [l, t, r, b].map(Number);
  const [cl, ct, cr, cb] = nums.every((v) => !Number.isNaN(v)) ? nums : [0, 0, 1, 1];
  const box = {
    left: Math.round(cl * m.width),
    top: Math.round(ct * m.height),
    width: Math.round((cr - cl) * m.width),
    height: Math.round((cb - ct) * m.height),
  };
  const cropBuf = await sharp(SRC).extract(box).resize(460, null, { fit: 'inside' }).jpeg().toBuffer();
  const cm = await sharp(cropBuf).metadata();
  const w = cm.width;
  const h = cm.height;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">`;
  svg += '<g stroke="#ff00ff" stroke-width="1.2" stroke-dasharray="5 4" opacity="0.8">';
  for (let i = 1; i < 10; i++) {
    const x = Math.round((w * i) / 10);
    svg += `<line x1="${x}" y1="0" x2="${x}" y2="${h}"/>`;
  }
  for (let j = 1; j < 10; j++) {
    const y = Math.round((h * j) / 10);
    svg += `<line x1="0" y1="${y}" x2="${w}" y2="${y}"/>`;
  }
  svg += '</g><g font-family="monospace" font-size="14" fill="#ff00ff">';
  for (let i = 1; i < 10; i++) {
    const x = Math.round((w * i) / 10);
    svg += `<text x="${x + 2}" y="15">${(i / 10).toFixed(1)}</text>`;
  }
  for (let j = 1; j < 10; j++) {
    const y = Math.round((h * j) / 10);
    svg += `<text x="2" y="${Math.max(14, y - 4)}">${(j / 10).toFixed(1)}</text>`;
  }
  svg += '</g></svg>';

  await sharp(cropBuf)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .jpeg({ quality: 80 })
    .toFile(OUT);
  console.log(`${id}: raw ${m.width}x${m.height} crop-box ${JSON.stringify(box)} -> ${OUT}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
