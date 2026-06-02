import { StatCard } from "../../../ui/composites/statCard.js";
import { tw } from "../../../ui/theme/tailwindClasses.js";

export function BuyerSummaryPanel({ cars = [], transactions = [] } = {}) {
  const grid = document.createElement("div");
  grid.className = tw.surface.responsiveGrid;
  grid.append(
    StatCard({ label: "Mobil tersedia", value: cars.length }),
    StatCard({ label: "Transaksi terbaru", value: transactions.length })
  );
  return grid;
}
