const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const DIR = '/home/f0id/Downloads/fastfoodfriends/assets/cutouts';
const OUT = '/tmp/contact';
fs.mkdirSync(OUT, { recursive: true });

const ITEMS = [
  'hamburger-tradicional', 'hamburger-mish-pule',
  'hotdog', 'pomfrit',
  'coca-cola', 'jogurt', 'ajran', 'uje-rugove',
];

(async () => {
  const CELL = 300;
  const COLS = 4;
  const rows = Math.ceil(ITEMS.length / COLS);

  for (const [name, bg] of [['light', { r: 245, g: 245, b: 245, alpha: 1 }], ['dark', { r: 18, g: 18, b: 18, alpha: 1 }]]) {
    const composites = [];
    for (let i = 0; i < ITEMS.length; i++) {
      const id = ITEMS[i];
      const file = path.join(DIR, id + '.png');
      if (!fs.existsSync(file)) continue;
      const buf = await sharp(file)
        .resize(CELL - 24, CELL - 24, { fit: 'inside', withoutEnlargement: true })
        .png()
        .toBuffer();
      const m = await sharp(buf).metadata();
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const left = col * CELL + Math.floor((CELL - m.width) / 2);
      const top = row * CELL + Math.floor((CELL - m.height) / 2);
      composites.push({ input: buf, left, top });
    }
    const sheet = sharp({
      create: {
        width: COLS * CELL,
        height: rows * CELL,
        channels: 4,
        background: bg,
      },
    }).composite(composites);
    const out = path.join(OUT, `sheet-${name}.png`);
    await sheet.png().toFile(out);
    console.log('Wrote', out);
  }
})().catch(e => { console.error(e); process.exit(1); });
