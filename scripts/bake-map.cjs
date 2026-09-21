/**
 * Bakes the local neighbourhood map for the contact page.
 *
 * The runtime previously pointed at staticmap.openstreetmap.de, a service that
 * has since been retired, so the image 404'd on every visit. Raw OSM tiles are
 * instead stitched once at build time and committed as static WebP files —
 * the page then loads the map from its own origin: no third-party request,
 * no API key, and no layout shift.
 *
 * Regenerate after changing RESTAURANT.geo in lib/restaurant.ts:
 *   node scripts/bake-map.cjs
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const LAT = 42.6629;
const LON = 20.3016;
const ZOOM = 16;

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'public', 'location');

// Output geometry: a 2:1 banner, delivered at 1x and 2x. The master canvas is
// 1440x720, so nine tiles across and five down cover the crop with margin.
const MASTER_W = 1440;
const MASTER_H = 720;
const TILES_X = 9;
const TILES_Y = 5;

const TILE = 256;
const UA = 'FastFoodFriends/1.0 (local map asset bake)';

function tileXY(lat, lon, zoom) {
  const n = 2 ** zoom;
  const x = ((lon + 180) / 360) * n;
  const y = ((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2) * n;
  return { x, y, tileX: Math.floor(x), tileY: Math.floor(y) };
}

async function fetchTile(z, x, y) {
  const url = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`tile ${z}/${x}/${y} -> HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });

  const { x, y, tileX, tileY } = tileXY(LAT, LON, ZOOM);
  const originX = tileX - Math.floor(TILES_X / 2);
  const originY = tileY - Math.floor(TILES_Y / 2);

  // Where the venue sits inside the mosaic, then the crop that centres it.
  const pinX = (x - originX) * TILE;
  const pinY = (y - originY) * TILE;
  const left = Math.max(0, Math.min(TILES_X * TILE - MASTER_W, Math.round(pinX - MASTER_W / 2)));
  const top = Math.max(0, Math.min(TILES_Y * TILE - MASTER_H, Math.round(pinY - MASTER_H / 2)));

  const composite = [];
  for (let row = 0; row < TILES_Y; row += 1) {
    for (let col = 0; col < TILES_X; col += 1) {
      const buf = await fetchTile(ZOOM, originX + col, originY + row);
      composite.push({ input: buf, left: col * TILE, top: row * TILE });
    }
  }

  const mosaic = sharp({
    create: {
      width: TILES_X * TILE,
      height: TILES_Y * TILE,
      channels: 3,
      background: { r: 242, g: 239, b: 233 },
    },
  }).composite(composite);

  const master = await mosaic.png().toBuffer();
  const cropped = sharp(master).extract({ left, top, width: MASTER_W, height: MASTER_H });

  const half = await cropped.clone().resize(720, 360).webp({ quality: 80, effort: 5 }).toBuffer();
  const full = await cropped.clone().resize(MASTER_W, MASTER_H).webp({ quality: 74, effort: 5 }).toBuffer();

  fs.writeFileSync(path.join(OUT, 'peja-720.webp'), half);
  fs.writeFileSync(path.join(OUT, 'peja-1440.webp'), full);

  // The pin is drawn in the UI (CSS overlay) rather than burned into the image,
  // so the map stays useful if the venue ever moves: only coordinates change.
  const pin = {
    x: (pinX - left) / MASTER_W,
    y: (pinY - top) / MASTER_H,
    zoom: ZOOM,
    lat: LAT,
    lon: LON,
  };
  fs.writeFileSync(
    path.join(ROOT, 'lib', 'map-pin.json'),
    `${JSON.stringify(pin, null, 2)}\n`,
  );

  console.log(`map baked: 720x360 ${(half.length / 1024).toFixed(1)}KB, 1440x720 ${(full.length / 1024).toFixed(1)}KB`);
  console.log(`pin at ${(pin.x * 100).toFixed(2)}% / ${(pin.y * 100).toFixed(2)}% (zoom ${ZOOM})`);
})();
