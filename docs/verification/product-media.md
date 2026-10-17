# Real Product Media Verification

Date: 2026-10-17. Owner: requesting contributor, Claude-assisted.
Branch: `feature/catalog-media-display`. Scope: the directly requested display of
real product images and video for the 100 imported sample products.
This completes no original feature acceptance task; no checklist item was checked.

## What was changed

| Area | Change |
| --- | --- |
| Database | Additive migration `003_product_media.sql`: nullable `video_url`, `image_urls` (jsonb array), `media_source_json` (jsonb object) on `products`, with type guards |
| Backend | `scripts/import-media.ts` and `npm run import:media`; product DTOs expose the new columns through the existing `SELECT *` |
| Frontend | `components/products/product-media.tsx` (`ProductThumb`, `ProductGallery`), used in the connected catalog table and analysis detail; `Product` type, image host config and styles |
| Data | Ignored `data/external/tiki_media_sample.json`, fetched from the public Tiki product API |

## Source and limitations

The six 2023 source CSVs contain `number_of_images` and `has_video` but no media
URLs at all. The URLs therefore come from the public Tiki product API fetched on
2026-10-17 and describe each listing as it exists today, not at snapshot time.
They are display assets: snapshot `has_video` and `number_of_images` stay
canonical, and no analysis, status or suggestion reads the live media.

The URLs are external CDN links and are not archived locally, so they may break
at any time. The UI falls back to the existing placeholder tile on any load error.

## Results

| Measure | Value |
| --- | --- |
| Sample products matched in the database | 100 of 100 |
| Products with a stored image URL | 92 |
| Products with a video URL | 3 |
| Delisted listings (HTTP 404), media left null | 8 |
| Seed products left untouched | 10 of 10 |

Consistency with the snapshot: the API product id matched the source product id
for all 92 resolved products, and `has_video` agreed for 92 of 92. Live image
counts differ for 33 of 92 because listings changed since 2023; snapshot values
were kept and not overwritten.

## Checks run

| Check | Command | Result |
| --- | --- | --- |
| Migration | `npm run db:migrate` | `003_product_media: applied`; 001/002 already applied, unchanged |
| Import dry run | `npm run import:media` | 100 records, 100 matched, 0 unmatched |
| Import apply | `npm run import:media -- --apply` | `rows_changed: 100` |
| Import idempotence | `npm run import:media -- --apply` (rerun) | `rows_changed: 0` |
| Backend typecheck | `npm run typecheck` | passed |
| Backend unit tests | `npm test` | 8 passed, 0 failed |
| Backend build | `npm run build` | passed |
| Frontend typecheck | `npx tsc --noEmit` | passed |
| Frontend lint | `npm run lint` | passed, no warnings |
| Frontend build | `npm run build` | passed |
| API field check | authenticated `GET /api/v1/products` over all pages | 110 products; 92 `thumbnail_url`, 3 `video_url`, 100 `image_urls`, 100 `media_source_json`, 8 `resolved: false`; 10 seed products carry no media |
| Browser, new | `npx playwright test -c playwright.connected.config.ts media.spec.ts` | 1 passed |
| Browser, regression | `npx playwright test -c playwright.connected.config.ts ml-sample.spec.ts` | 1 passed |
| Media URL availability | HEAD request per URL during the offline fetch | 92 of 92 images and 3 of 3 videos returned HTTP 200 |

The new browser test asserts the decoded bitmap (`naturalWidth > 0`), not just the
`src` attribute, so a broken CDN link fails it. It also covers switching gallery
images, the visible video element and the placeholder fallback with its stated
reason for a delisted listing.

## Not verified

- `tests/connected/sellens.spec.ts` was **not** run. It creates and deletes
  products and suspends an account in the shared Neon database, and it does not
  cover this change. The catalog table it exercises is covered by the two tests above.
- No human acceptance, design review or production-readiness claim.
- Media for the remaining 41,476 snapshot products was not fetched.
- External CDN assets are not archived; long-term availability is unverified.
- Model serving remains unimplemented and unaffected.
