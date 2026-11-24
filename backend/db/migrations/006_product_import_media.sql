-- Keep fresh databases consistent with the deployed catalog's media columns.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS image_urls jsonb,
  ADD COLUMN IF NOT EXISTS video_url text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'products'::regclass AND conname = 'products_image_urls_array'
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_image_urls_array
      CHECK (image_urls IS NULL OR jsonb_typeof(image_urls) = 'array');
  END IF;
END;
$$;
