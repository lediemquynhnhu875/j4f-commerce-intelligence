import {
  sampleGroups,
  sampledStatuses,
  selectSample,
  sourceProductSchema,
  type SourceProduct,
} from "./ml-sample";

/**
 * A second bounded import that brings the demo catalog close to the real status
 * distribution of the scored corpus.
 *
 * The first import was stratified at 25 products per status, which shows
 * "insufficient_data" at 25% against 12.3% in the corpus. This batch adds 125
 * products chosen so the combined catalog matches the corpus within 0.2
 * percentage points per status.
 *
 * Selection is a pure function of the snapshot: it excludes exactly the products
 * the first import selects, so rerunning it produces the same 125 products and
 * the same selection hash regardless of what is already in the database.
 */

export const batchRunKey = "ml-v2-proportional-125-v1";

/** Corpus status counts from the snapshot metadata, used only to derive targets. */
export const corpusStatusCounts: Record<string, number> = {
  performing_well: 18176,
  difficult_to_sell: 12380,
  untapped_potential: 5892,
  insufficient_data: 5128,
};

/** Products already held per status before this batch, from the first import. */
const alreadyHeld = 25;

/** How many of each status this batch adds. */
export const batchTargets: Record<string, number> = {
  performing_well: 73,
  difficult_to_sell: 42,
  untapped_potential: 7,
  insufficient_data: 3,
};

export const batchSize = Object.values(batchTargets).reduce((a, b) => a + b, 0);

/**
 * Spreads a status target across the five product groups as evenly as possible,
 * so every existing category keeps gaining products.
 */
export function spread(total: number, buckets: number): number[] {
  const base = Math.floor(total / buckets);
  const remainder = total % buckets;
  return Array.from({ length: buckets }, (_, index) => base + (index < remainder ? 1 : 0));
}

/** Recomputes the resulting share per status, for the run manifest. */
export function resultingDistribution() {
  const corpusTotal = Object.values(corpusStatusCounts).reduce((a, b) => a + b, 0);
  const catalogTotal = sampledStatuses.length * alreadyHeld + batchSize;
  return Object.fromEntries(
    sampledStatuses.map((status) => {
      const held = alreadyHeld + (batchTargets[status] ?? 0);
      return [status, {
        products: held,
        catalog_share: Number((held / catalogTotal).toFixed(4)),
        corpus_share: Number((corpusStatusCounts[status] / corpusTotal).toFixed(4)),
      }];
    }),
  );
}

export function selectBatch(rows: Record<string, unknown>[]): SourceProduct[] {
  // Exactly the products the first import takes, derived from the snapshot alone.
  const firstImport = new Set(selectSample(rows).map((p) => p.product_id));
  const selected: SourceProduct[] = [];
  const taken = new Set<string>();

  for (const status of sampledStatuses) {
    const target = batchTargets[status] ?? 0;
    if (target === 0) continue;
    const perGroup = spread(target, sampleGroups.length);
    for (const [index, group] of sampleGroups.entries()) {
      const wanted = perGroup[index];
      if (wanted === 0) continue;
      const candidates = rows
        .filter(
          (p) =>
            p.product_type === group.type &&
            p.status === status &&
            p.valid_for_model === true &&
            typeof p.price === "number" &&
            p.price > 0 &&
            p.selected_raw_source_index !== null &&
            typeof p.product_id === "string" &&
            !firstImport.has(p.product_id) &&
            !taken.has(p.product_id),
        )
        .sort((a, b) =>
          String(a.product_id).localeCompare(String(b.product_id), "en", { numeric: true }),
        );
      if (candidates.length < wanted)
        throw new Error(`Insufficient batch candidates for ${group.code}/${status}`);
      for (const candidate of candidates.slice(0, wanted)) {
        taken.add(String(candidate.product_id));
        selected.push(sourceProductSchema.parse(candidate));
      }
    }
  }

  if (selected.length !== batchSize) throw new Error("Batch selection size mismatch");
  if (new Set(selected.map((p) => p.product_id)).size !== selected.length)
    throw new Error("Duplicate product in batch selection");
  return selected;
}
