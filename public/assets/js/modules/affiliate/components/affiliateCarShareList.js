import { Card } from "../../../ui/composites/card.js";
import { Button } from "../../../ui/primitives/button.js";
import { EmptyState } from "../../../ui/primitives/emptyState.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { formatCurrency } from "../../../utils/formatCurrency.js";
import { tw } from "../../../theme/tailwindClasses.js";
import { affiliateCarsService } from "../services/affiliateCarsService.js";

export function AffiliateCarShareList({
  affiliate = null,
  cars = [],
  copyingId = null,
  onCopyLink = null,
} = {}) {
  if (!cars.length) {
    return EmptyState({
      title: "Belum ada mobil untuk dibagikan",
      description: "Mobil yang sudah dipublikasikan showroom akan muncul di sini lengkap dengan link share-nya.",
    });
  }

  const section = document.createElement("section");
  section.id = "aff_car_share_list_section";
  section.className = "grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3";

  cars.forEach((car) => {
    const card = Card();
    card.id = `aff_car_share_card_${car.id}_section`;
    card.classList.add("grid", "min-w-0", "gap-3", "overflow-hidden", "p-4");

    const title = document.createElement("p");
    title.className = "break-words text-xs font-black text-gray-950";
    title.textContent = affiliateCarsService.carTitle(car);

    const price = document.createElement("p");
    price.className = `text-xs font-bold ${tw.text.subtle}`;
    price.textContent = formatCurrency(car.price_discount || car.price_cash || 0);

    const urlWrap = document.createElement("div");
    urlWrap.className = `grid min-w-0 gap-1 ${tw.surface.inset}`;
    const urlLabel = document.createElement("p");
    urlLabel.className = "text-[10px] font-semibold text-gray-500";
    urlLabel.textContent = "Link share";
    const urlValue = document.createElement("p");
    urlValue.className = "break-all text-[11px] text-gray-700";
    urlValue.textContent = affiliateCarsService.shareUrl(affiliate, car.id) || "Link belum tersedia.";
    urlWrap.append(urlLabel, urlValue);

    const actions = document.createElement("div");
    actions.className = "flex flex-wrap gap-2 pt-1";

    const copying = copyingId === car.id;
    const copyButton = Button({
      label: copying ? "Menyalin..." : "Copy Link",
      variant: "secondary",
      disabled: copying,
      onClick: () => onCopyLink?.(car),
    });
    copyButton.id = `aff_car_share_copy_button_${car.id}`;
    copyButton.prepend(createIcon("link", { className: "h-4 w-4" }));

    const waUrl = affiliateCarsService.whatsappShareUrl(affiliate, car);
    const waButton = Button({
      label: "Bagikan WhatsApp",
      variant: "netral",
      disabled: !waUrl,
      onClick: () => window.open(waUrl, "_blank", "noopener,noreferrer"),
    });
    waButton.id = `aff_car_share_whatsapp_button_${car.id}`;
    waButton.prepend(createIcon("message", { className: "h-4 w-4" }));

    actions.append(copyButton, waButton);

    card.append(title, price, urlWrap, actions);
    section.append(card);
  });

  return section;
}
