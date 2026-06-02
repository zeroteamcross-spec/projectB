import { EmptyState } from "../primitives/emptyState.js";
import { CarSummaryCard } from "../../modules/buyer/components/carSummaryCard.js";
import { tw } from "../theme/tailwindClasses.js";

export function CarGridSection({ cars = [], onOpenDetail = null } = {}) {
  if (!cars.length) {
    return EmptyState({
      title: "Katalog belum tersedia",
      description: "Mobil published akan muncul di sini.",
    });
  }

  const grid = document.createElement("div");
  grid.className = tw.surface.responsiveGrid;
  cars.forEach((car) => grid.append(CarSummaryCard({ car, onOpenDetail })));
  return grid;
}
