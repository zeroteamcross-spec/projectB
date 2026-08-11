import { Card } from "../../../ui/composites/card.js";
import { EmptyState } from "../../../ui/primitives/emptyState.js";
import { formatDate } from "../../../utils/formatDate.js";
import { tw } from "../../../theme/tailwindClasses.js";

export function AffiliateClickList({ clicks = [] } = {}) {
  if (!clicks.length) {
    return EmptyState({
      title: "Belum ada click tercatat",
      description: "Saat landing marketing mulai diakses, activity click akan muncul di daftar ini.",
    });
  }

  const section = document.createElement("section");
  section.className = "grid min-w-0 gap-3";

  clicks.forEach((click) => {
    const card = Card();
    card.classList.add("grid", "min-w-0", "gap-3", "overflow-hidden");

    const top = document.createElement("div");
    top.className = "flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between";

    const copy = document.createElement("div");
    copy.className = "grid min-w-0 gap-1";
    copy.append(
      textBlock("font-semibold text-gray-950", click.sourceLabel),
      textBlock(`text-xs ${tw.text.muted}`, `${click.targetLabel} | slug ${click.slugLabel}`),
    );

    const date = document.createElement("p");
    date.className = "text-xs font-medium text-gray-500";
    date.textContent = formatDate(click.clicked_at || click.created_at);

    top.append(copy, date);

    const urlWrap = document.createElement("div");
    urlWrap.className = `grid min-w-0 gap-1 ${tw.surface.inset}`;
    urlWrap.append(
      textBlock("text-[10px] font-semibold text-gray-500", "Landing URL"),
      textBlock("break-all text-xs text-gray-700", click.landing_url || "Landing URL belum tersedia."),
    );

    card.append(top, urlWrap);
    section.append(card);
  });

  return section;
}

function textBlock(className, text) {
  const node = document.createElement("p");
  node.className = `${className} break-words`;
  node.textContent = text;
  return node;
}
