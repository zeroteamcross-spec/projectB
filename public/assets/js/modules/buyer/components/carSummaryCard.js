import { Badge } from "../../../ui/primitives/badge.js";
import { Button } from "../../../ui/primitives/button.js";
import { Card } from "../../../ui/composites/card.js";
import { tw } from "../../../theme/tailwindClasses.js";
import { formatCurrency } from "../../../utils/formatCurrency.js";
import { getListingLockStatus } from "../../../utils/transactionStatus.js";

export function CarSummaryCard({ car, onOpenDetail = null } = {}) {
  const lock = getListingLockStatus({ car });
  const title = document.createElement("strong");
  title.className = "block text-base font-bold tracking-normal text-gray-950";
  title.textContent = [car.brand_name, car.model_name, car.sub_model_name].filter(Boolean).join(" ");

  const price = document.createElement("p");
  price.className = `text-lg font-semibold ${tw.text.price}`;
  price.textContent = formatCurrency(car.price_discount ?? car.price_cash ?? car.price_credit);

  const meta = document.createElement("p");
  meta.className = `text-sm ${tw.text.muted}`;
  meta.textContent = [car.location_name, car.transmission, car.mileage_km ? `${car.mileage_km} km` : null]
    .filter(Boolean)
    .join(" | ");

  const action = Button({
    label: lock.locked ? lock.label : "Lihat detail",
    variant: "secondary",
    disabled: lock.locked,
    onClick: lock.locked ? null : () => onOpenDetail?.(car),
  });

  return Card([
    Badge({ label: lock.label, variant: lock.variant }),
    title,
    price,
    meta,
    action,
  ]);
}
