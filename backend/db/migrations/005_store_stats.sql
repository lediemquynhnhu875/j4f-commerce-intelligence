-- Backfill and install triggers under the same migration transaction.
LOCK TABLE stores, products, product_analyses, improvement_actions IN SHARE ROW EXCLUSIVE MODE;

CREATE TABLE store_stats (
  store_id bigint PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
  product_count integer NOT NULL DEFAULT 0 CHECK (product_count >= 0),
  saved_analysis_count integer NOT NULL DEFAULT 0 CHECK (saved_analysis_count >= 0),
  analyzed_product_count integer NOT NULL DEFAULT 0 CHECK (analyzed_product_count >= 0),
  reference_product_count integer NOT NULL DEFAULT 0 CHECK (reference_product_count >= 0),
  review_product_count integer NOT NULL DEFAULT 0 CHECK (review_product_count >= 0),
  ml_product_count integer NOT NULL DEFAULT 0 CHECK (ml_product_count >= 0),
  open_suggestion_count integer NOT NULL DEFAULT 0 CHECK (open_suggestion_count >= 0),
  in_progress_count integer NOT NULL DEFAULT 0 CHECK (in_progress_count >= 0),
  pending_review_count integer NOT NULL DEFAULT 0 CHECK (pending_review_count >= 0),
  proposed_count integer NOT NULL DEFAULT 0 CHECK (proposed_count >= 0),
  category_counts jsonb NOT NULL DEFAULT '{}',
  status_counts jsonb NOT NULL DEFAULT '{}',
  legacy_status_counts jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

-- One replaceable projection per analyzed product. Original rows remain append-only.
CREATE TABLE store_current_analysis (
  product_id bigint PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  store_id bigint NOT NULL REFERENCES store_stats(store_id) ON DELETE CASCADE,
  analysis_id bigint NOT NULL UNIQUE,
  analyzed_at timestamptz NOT NULL,
  status varchar(60) NOT NULL,
  is_ml boolean NOT NULL,
  has_reference boolean NOT NULL,
  priority_score numeric(12,6),
  open_count integer NOT NULL CHECK (open_count >= 0),
  in_progress_count integer NOT NULL CHECK (in_progress_count >= 0),
  proposed_count integer NOT NULL CHECK (proposed_count >= 0)
);
CREATE INDEX store_stats_most_products ON store_stats(product_count DESC, store_id);
CREATE INDEX store_stats_fewest_products ON store_stats(product_count, store_id);
CREATE INDEX store_current_analysis_time ON store_current_analysis(store_id, analyzed_at DESC);
CREATE INDEX store_current_analysis_priority ON store_current_analysis
  (store_id, coalesce(priority_score, -1) DESC, analysis_id) WHERE open_count > 0;

INSERT INTO store_stats(store_id) SELECT id FROM stores;
INSERT INTO store_current_analysis
SELECT latest.product_id, latest.store_id, latest.id, latest.analyzed_at, latest.status,
  latest.status_schema_version='ml_v2', latest.reference_sold IS NOT NULL, latest.priority_score,
  coalesce(w.open_count, 0), coalesce(w.in_progress_count, 0), coalesce(w.proposed_count, 0)
FROM (
  SELECT DISTINCT ON (a.product_id) a.product_id, p.store_id, a.id,
    a.analyzed_at, a.status, a.status_schema_version, a.reference_sold, a.priority_score
  FROM product_analyses a JOIN products p ON p.id=a.product_id
  ORDER BY a.product_id, a.analyzed_at DESC, a.id DESC
) latest LEFT JOIN (
  SELECT analysis_id, count(*)::int AS open_count,
    count(*) FILTER (WHERE status='in_progress')::int AS in_progress_count,
    count(*) FILTER (WHERE status='proposed')::int AS proposed_count
  FROM improvement_actions WHERE status IN ('proposed', 'accepted', 'in_progress')
  GROUP BY analysis_id
) w ON w.analysis_id=latest.id;

WITH product_categories AS (
  SELECT store_id, coalesce(category_id::text,'none') AS category, count(*)::int AS n
  FROM products GROUP BY store_id, category_id
), counts AS (
  SELECT store_id, sum(n)::int AS total, jsonb_object_agg(category,n) AS categories
  FROM product_categories GROUP BY store_id
)
UPDATE store_stats s SET product_count=c.total, category_counts=c.categories
FROM counts c WHERE s.store_id=c.store_id;

WITH counts AS (
  SELECT store_id, count(*)::int AS analyzed,
    count(*) FILTER (WHERE has_reference)::int AS referenced,
    count(*) FILTER (WHERE open_count>0)::int AS review,
    count(*) FILTER (WHERE is_ml)::int AS ml,
    sum(open_count)::int AS open_count, sum(in_progress_count)::int AS in_progress,
    sum(proposed_count)::int AS pending_review
  FROM store_current_analysis GROUP BY store_id
), statuses AS (
  SELECT store_id,jsonb_object_agg(status,n) AS status_counts
  FROM (SELECT store_id,status,count(*)::int AS n FROM store_current_analysis GROUP BY store_id,status) g
  GROUP BY store_id
)
UPDATE store_stats s SET analyzed_product_count=c.analyzed, reference_product_count=c.referenced,
  review_product_count=c.review, ml_product_count=c.ml, open_suggestion_count=c.open_count,
  in_progress_count=c.in_progress, pending_review_count=c.pending_review, status_counts=t.status_counts
FROM counts c JOIN statuses t USING(store_id) WHERE s.store_id=c.store_id;

WITH analysis_status AS (
  SELECT p.store_id,a.status,a.status_schema_version,count(*)::int AS n
  FROM product_analyses a JOIN products p ON p.id=a.product_id
  GROUP BY p.store_id,a.status,a.status_schema_version
), counts AS (
  SELECT store_id,sum(n)::int AS total,
    coalesce(jsonb_object_agg(status,n) FILTER (WHERE status_schema_version='legacy_v1'),'{}') AS legacy
  FROM analysis_status GROUP BY store_id
)
UPDATE store_stats s SET saved_analysis_count=c.total,legacy_status_counts=c.legacy
FROM counts c WHERE s.store_id=c.store_id;

UPDATE store_stats s SET proposed_count=w.n FROM (
  SELECT p.store_id,count(*)::int AS n FROM improvement_actions w
  JOIN product_analyses a ON a.id=w.analysis_id JOIN products p ON p.id=a.product_id
  WHERE w.status='proposed' GROUP BY p.store_id
) w WHERE s.store_id=w.store_id;

CREATE FUNCTION sellens_change_counter(counts jsonb, counter_key text, change_by integer)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE next_count integer;
BEGIN
  IF counter_key IS NULL OR change_by=0 THEN RETURN counts; END IF;
  next_count := coalesce((counts->>counter_key)::int,0)+change_by;
  IF next_count<0 THEN RAISE EXCEPTION 'Store counter cannot be negative'; END IF;
  IF next_count=0 THEN RETURN counts-counter_key; END IF;
  RETURN jsonb_set(counts, ARRAY[counter_key], to_jsonb(next_count));
END $$;

CREATE FUNCTION sellens_init_store_stats() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO store_stats(store_id) VALUES(NEW.id);
  RETURN NULL;
END $$;
CREATE TRIGGER init_store_stats AFTER INSERT ON stores
FOR EACH ROW EXECUTE FUNCTION sellens_init_store_stats();

CREATE FUNCTION sellens_track_product_stats() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  scope_id bigint;
  old_category text;
  new_category text;
BEGIN
  IF TG_OP='UPDATE' AND OLD.category_id IS NOT DISTINCT FROM NEW.category_id THEN
    RETURN NULL;
  END IF;
  IF TG_OP<>'INSERT' THEN
    scope_id := OLD.store_id;
    old_category := coalesce(OLD.category_id::text,'none');
  END IF;
  IF TG_OP<>'DELETE' THEN
    scope_id := NEW.store_id;
    new_category := coalesce(NEW.category_id::text,'none');
  END IF;
  UPDATE store_stats SET
    product_count=product_count+(TG_OP='INSERT')::int-(TG_OP='DELETE')::int,
    category_counts=sellens_change_counter(sellens_change_counter(category_counts,old_category,-1),new_category,1),
    updated_at=clock_timestamp()
  WHERE store_id=scope_id;
  RETURN NULL;
END $$;
CREATE TRIGGER track_product_stats AFTER INSERT OR UPDATE OF category_id OR DELETE ON products
FOR EACH ROW EXECUTE FUNCTION sellens_track_product_stats();

CREATE FUNCTION sellens_track_analysis_stats() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  source_row product_analyses%ROWTYPE;
  latest_row product_analyses%ROWTYPE;
  before_stats store_current_analysis%ROWTYPE;
  after_stats store_current_analysis%ROWTYPE;
  scope_id bigint;
  count_change integer;
  legacy_key text;
BEGIN
  IF TG_OP='INSERT' THEN
    source_row := NEW;
    count_change := 1;
  ELSE
    source_row := OLD;
    count_change := -1;
  END IF;
  SELECT store_id INTO STRICT scope_id FROM products WHERE id=source_row.product_id;
  -- Serialize the projection and its counters for writes in this store.
  PERFORM 1 FROM store_stats WHERE store_id=scope_id FOR NO KEY UPDATE;
  SELECT * INTO before_stats FROM store_current_analysis WHERE product_id=source_row.product_id;
  IF source_row.status_schema_version='legacy_v1' THEN legacy_key := source_row.status; END IF;

  IF (TG_OP='INSERT' AND before_stats.analysis_id IS NOT NULL AND
    (source_row.analyzed_at, source_row.id) < (before_stats.analyzed_at, before_stats.analysis_id))
    OR (TG_OP='DELETE' AND before_stats.analysis_id IS DISTINCT FROM source_row.id) THEN
    UPDATE store_stats SET saved_analysis_count=saved_analysis_count+count_change,
      legacy_status_counts=sellens_change_counter(legacy_status_counts,legacy_key,count_change),
      updated_at=clock_timestamp()
    WHERE store_id=scope_id;
    RETURN NULL;
  END IF;

  IF TG_OP='INSERT' THEN
    latest_row := source_row;
  ELSE
    SELECT * INTO latest_row FROM product_analyses
    WHERE product_id=source_row.product_id ORDER BY analyzed_at DESC,id DESC LIMIT 1;
  END IF;
  DELETE FROM store_current_analysis WHERE product_id=source_row.product_id;
  IF latest_row.id IS NOT NULL THEN
    INSERT INTO store_current_analysis
    SELECT latest_row.product_id,scope_id,latest_row.id,latest_row.analyzed_at,latest_row.status,
      latest_row.status_schema_version='ml_v2',latest_row.reference_sold IS NOT NULL,latest_row.priority_score,
      count(*)::int, count(*) FILTER (WHERE status='in_progress')::int,
      count(*) FILTER (WHERE status='proposed')::int
    FROM improvement_actions
    WHERE analysis_id=latest_row.id AND status IN ('proposed','accepted','in_progress')
    RETURNING * INTO after_stats;
  END IF;

  UPDATE store_stats SET
    saved_analysis_count=saved_analysis_count+count_change,
    analyzed_product_count=analyzed_product_count+(after_stats.analysis_id IS NOT NULL)::int-(before_stats.analysis_id IS NOT NULL)::int,
    reference_product_count=reference_product_count+coalesce(after_stats.has_reference::int,0)-coalesce(before_stats.has_reference::int,0),
    review_product_count=review_product_count+coalesce((after_stats.open_count>0)::int,0)-coalesce((before_stats.open_count>0)::int,0),
    ml_product_count=ml_product_count+coalesce(after_stats.is_ml::int,0)-coalesce(before_stats.is_ml::int,0),
    open_suggestion_count=open_suggestion_count+coalesce(after_stats.open_count,0)-coalesce(before_stats.open_count,0),
    in_progress_count=store_stats.in_progress_count+coalesce(after_stats.in_progress_count,0)-coalesce(before_stats.in_progress_count,0),
    pending_review_count=pending_review_count+coalesce(after_stats.proposed_count,0)-coalesce(before_stats.proposed_count,0),
    status_counts=sellens_change_counter(sellens_change_counter(status_counts,before_stats.status,-1),after_stats.status,1),
    legacy_status_counts=sellens_change_counter(legacy_status_counts,legacy_key,count_change),
    updated_at=clock_timestamp()
  WHERE store_id=scope_id;
  RETURN NULL;
END $$;
CREATE TRIGGER track_analysis_stats AFTER INSERT OR DELETE ON product_analyses
FOR EACH ROW EXECUTE FUNCTION sellens_track_analysis_stats();

CREATE FUNCTION sellens_track_action_stats() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  scope_id bigint;
  saved_id bigint;
  old_status text;
  new_status text;
  proposed_delta integer;
  progress_delta integer;
  open_delta integer;
  next_open integer;
  review_delta integer := 0;
BEGIN
  IF TG_OP<>'INSERT' THEN old_status := OLD.status; saved_id := OLD.analysis_id; END IF;
  IF TG_OP<>'DELETE' THEN new_status := NEW.status; saved_id := NEW.analysis_id; END IF;
  proposed_delta := coalesce((new_status='proposed')::int,0)-coalesce((old_status='proposed')::int,0);
  progress_delta := coalesce((new_status='in_progress')::int,0)-coalesce((old_status='in_progress')::int,0);
  open_delta := coalesce((new_status IN ('proposed','accepted','in_progress'))::int,0)
    -coalesce((old_status IN ('proposed','accepted','in_progress'))::int,0);
  IF proposed_delta=0 AND progress_delta=0 AND open_delta=0 THEN RETURN NULL; END IF;

  SELECT p.store_id INTO STRICT scope_id FROM products p
  JOIN product_analyses a ON a.product_id=p.id WHERE a.id=saved_id;
  PERFORM 1 FROM store_stats WHERE store_id=scope_id FOR NO KEY UPDATE;
  UPDATE store_current_analysis SET open_count=open_count+open_delta,
    in_progress_count=in_progress_count+progress_delta, proposed_count=proposed_count+proposed_delta
  WHERE analysis_id=saved_id RETURNING open_count INTO next_open;
  IF FOUND THEN
    review_delta := (next_open>0)::int-(next_open-open_delta>0)::int;
  ELSE
    progress_delta := 0;
    open_delta := 0;
  END IF;
  UPDATE store_stats SET
    proposed_count=proposed_count+proposed_delta,
    open_suggestion_count=open_suggestion_count+open_delta,
    in_progress_count=in_progress_count+progress_delta,
    pending_review_count=pending_review_count+CASE WHEN next_open IS NULL THEN 0 ELSE proposed_delta END,
    review_product_count=review_product_count+review_delta,
    updated_at=clock_timestamp()
  WHERE store_id=scope_id;
  RETURN NULL;
END $$;
CREATE TRIGGER track_action_stats AFTER INSERT OR UPDATE OF status OR DELETE ON improvement_actions
FOR EACH ROW EXECUTE FUNCTION sellens_track_action_stats();
