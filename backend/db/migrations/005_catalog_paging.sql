-- Additive indexes for owner-scoped pages and deterministic latest-analysis lookup.
CREATE INDEX IF NOT EXISTS sellens_products_store_id ON products(store_id,id);
CREATE INDEX IF NOT EXISTS sellens_analyses_latest ON product_analyses(product_id,analyzed_at DESC,id DESC);
