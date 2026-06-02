import { StatCard } from "../composites/statCard.js";
import { tw } from "../theme/tailwindClasses.js";

export function AffiliateMetricsSection({ metrics = {} } = {}) {
  const grid = document.createElement("div");
  grid.className = tw.surface.responsiveGrid;
  grid.append(
    StatCard({ label: "Klik", value: metrics.total_clicks ?? 0 }),
    StatCard({ label: "Transaksi", value: metrics.total_transactions ?? 0 }),
    StatCard({ label: "Komisi", value: metrics.total_commission ?? 0 })
  );
  return grid;
}
