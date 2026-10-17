-- Additive media columns for the explicitly requested real image/video display.
-- Source CSVs hold no media URLs; these are filled from the live Tiki product API
-- by scripts/import-media.ts and are display assets, not snapshot evidence.
ALTER TABLE products
 ADD COLUMN video_url text,
 ADD COLUMN image_urls jsonb,
 ADD COLUMN media_source_json jsonb;

ALTER TABLE products ADD CONSTRAINT products_image_urls_array
 CHECK (image_urls IS NULL OR jsonb_typeof(image_urls)='array');
ALTER TABLE products ADD CONSTRAINT products_media_source_object
 CHECK (media_source_json IS NULL OR jsonb_typeof(media_source_json)='object');
