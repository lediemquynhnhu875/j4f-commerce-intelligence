// Stable status colors: never derive them from row order or chart position.
export const analysisStatusColors: Record<string, string> = {
  positive_feedback_low_sales: "#946200",
  low_rating_low_sales: "#c62828",
  performing_well: "#15803d",
  untapped_potential: "#7c3aed",
  difficult_to_sell: "#2563eb",
  insufficient_data: "#475569",
  positive_feedback_below_reference: "#c2410c",
  low_rating_below_reference: "#be185d",
  at_or_above_reference: "#0f766e",
  zero_sales_needs_investigation: "#a21caf",
  zero_sales_no_priority_signal: "#0e7490",
  monitor_gap: "#4338ca",
  below_reference_insufficient_reviews: "#854d0e",
  undecided: "#4d7c0f",
  insufficient_basis: "#71665e",
  no_analysis: "#52525b",
};

export const actionStatusColors: Record<string, string> = {
  proposed: "#b45309",
  accepted: "#0369a1",
  in_progress: "#9333ea",
  completed: "#047857",
  rejected: "#b91c1c",
  cancelled: "#52647b",
};

export function analysisColor(status?: string | null) {
  return analysisStatusColors[status ?? "no_analysis"] ?? "#374151";
}

export function actionColor(status: string) {
  return actionStatusColors[status] ?? "#334155";
}
