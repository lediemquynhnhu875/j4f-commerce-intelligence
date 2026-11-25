-- Additive indexes for recent work pages and paged saved-analysis choices.
CREATE INDEX IF NOT EXISTS sellens_actions_updated_id ON improvement_actions(updated_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS sellens_analyses_time_id ON product_analyses(analyzed_at DESC,id DESC);
