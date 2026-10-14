-- PROPOSAL ONLY. Run after 002 and explicit owner/store/product assignment.
-- Do not run this stage before API create/seed paths supply products.store_id.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.products WHERE store_id IS NULL) THEN
        RAISE EXCEPTION 'Products remain unassigned; explicitly map all products to stores first';
    END IF;
END;
$$;
ALTER TABLE public.products ALTER COLUMN store_id SET NOT NULL;
COMMIT;
