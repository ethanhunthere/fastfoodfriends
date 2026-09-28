# Product photo attributions

Every image shipped under `public/menu/` is derived from the artwork supplied by
the restaurant in `foodimages/` (added 2026-09-28). These are the shop's own
product photographs: they are used here with the owner's permission, and they
replace the earlier Wikimedia Commons set (hamburger-me-qyfte, tost, fanta and
uje-natyral are no longer on the menu at all).

Delivery layout: one master per item in `assets-src/menu/`, baked by
`scripts/bake-images.cjs` into 240 / 480 / 960 px AVIF + WebP tiers under
`public/menu/v3/`, with `lib/image-dims.ts` regenerated from the same run.

| Item | Supplied file | Native size | Processing |
| --- | --- | --- | --- |
| hamburger-tradicional | `normalburger.png` | 415x350 | none - delivered pre-cut, alpha used as-is |
| hamburger-mish-pule | `chickenburger.png` | 360x360 | none - delivered pre-cut, alpha used as-is |
| hotdog | `hotdog.png` | 740x416 | background removed (rembg u2net, 1px erode + 0.6px edge blur) |
| pomfrit | `fires.png` | 350x350 | none - delivered pre-cut, alpha used as-is |
| coca-cola | `cola.png` | 800x800 | background removed (rembg u2net, 1px erode + 0.6px edge blur) |
| jogurt | `jogurt.png` | 1560x1500 | none - delivered pre-cut, alpha used as-is |
| ajran | `ajran.png` | 860x827 | none - delivered pre-cut, alpha used as-is |
| uje-rugove | `ujerugove.png` | 225x225 | background removed (rembg u2net, 1px erode + 0.6px edge blur) |

## Notes

- `hotdog.png`, `cola.png` and `ujerugove.png` arrived as flat RGB files on a
  white backdrop (the other five arrived with alpha). Only the backdrop was
  removed, mechanically, via `scripts/isolate_batch.py` with the settings in
  `scripts/isolate-spec.json`. The artwork itself was not rescaled, retouched or
  recoloured.
- Several labels are third-party trademarks (Coca-Cola, drena, Rugove). They
  appear because the shop sells those products; the marks stay with their owners.
- `uje-rugove` has the smallest source (225x225 -> 69x217 cutout). That is fine
  at card size but it should not be promoted to hero scale without new artwork.
- 2026-09-28 - supersedes the previous Wikimedia-derived attributions. The old
  `jogurt` provenance caveat is resolved: the shipped master now comes from the
  supplied `jogurt.png` (drena cup), not from an unrecorded Dukat photo.
