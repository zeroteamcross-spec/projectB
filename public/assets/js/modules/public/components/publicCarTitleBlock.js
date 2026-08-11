import { Badge } from "../../../ui/primitives/badge.js";
import { getListingStatusMeta } from "../../../utils/transactionStatus.js";

export function PublicCarTitleBlock({ car } = {}) {
  const section = document.createElement("section");
  section.className = "grid gap-4 rounded-[28px] border border-[var(--pb-card-border)] bg-white/95 p-5 shadow-card backdrop-blur";

  const statusRow = document.createElement("div");
  statusRow.className = "flex flex-wrap items-center gap-2";
  const listingMeta = getListingStatusMeta(car?.listing_status ?? "draft");
  statusRow.append(Badge({
    label: listingMeta.label,
    variant: listingMeta.variant,
  }));

  if (car?.stock !== null && car?.stock !== undefined) {
    statusRow.append(Badge({ label: `Stok ${car.stock}`, variant: "info" }));
  }

  const eyebrow = document.createElement("span");
  eyebrow.className = "text-[10px] font-semibold uppercase tracking-normal text-[var(--pb-brand-secondary)]";
  eyebrow.textContent = "Detail mobil";

  const title = document.createElement("h1");
  title.className = "text-xl font-bold tracking-normal text-gray-950 xsm:text-1xl";
  title.textContent = [car?.brand_name, car?.model_name, car?.sub_model_name].filter(Boolean).join(" ") || `Mobil #${car?.id ?? "-"}`;

  const meta = document.createElement("p");
  meta.className = "text-xs leading-7 text-gray-600";
  meta.textContent = [car?.year ? `Tahun ${car.year}` : "", car?.primary_color, car?.location_name].filter(Boolean).join(" | ") || "Lokasi dan warna belum tersedia";

  const micro = document.createElement("div");
  micro.className = "grid gap-2 sm:grid-cols-3";
  micro.append(
    metaItem("Transmisi", normalizeLabel(car?.transmission ?? "-")),
    metaItem("Kilometer", car?.mileage_km ? `${Number(car.mileage_km).toLocaleString("id-ID")} km` : "-"),
    metaItem("Kursi", car?.seat_count ? `${car.seat_count} kursi` : "-"),
  );

  section.append(eyebrow, statusRow, title, meta, micro);
  const video = youtubeVideo(car?.youtube_url);
  if (video) {
    section.append(video);
  }
  return section;
}

function metaItem(label, value) {
  const node = document.createElement("div");
  node.className = "rounded-2xl bg-gray-50 px-3 py-3";

  const caption = document.createElement("p");
  caption.className = "text-[10px] font-medium uppercase tracking-normal text-gray-500";
  caption.textContent = label;

  const content = document.createElement("p");
  content.className = "mt-1 text-xs font-semibold text-gray-900";
  content.textContent = value;

  node.append(caption, content);
  return node;
}

function normalizeLabel(value) {
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function youtubeVideo(url) {
  const embedUrl = youtubeEmbedUrl(url);
  if (!embedUrl) {
    return null;
  }

  const frameWrap = document.createElement("section");
  frameWrap.className = "mt-1 overflow-hidden rounded-2xl bg-black shadow-sm";

  const iframe = document.createElement("iframe");
  iframe.className = "aspect-video w-full";
  iframe.src = embedUrl;
  iframe.title = "Video YouTube mobil";
  iframe.loading = "lazy";
  iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
  iframe.allowFullscreen = true;
  iframe.referrerPolicy = "strict-origin-when-cross-origin";

  frameWrap.append(iframe);
  return frameWrap;
}

function youtubeEmbedUrl(url) {
  const value = String(url ?? "").trim();
  if (!value) {
    return "";
  }

  try {
    const parsed = new URL(value);
    const host = parsed.hostname.replace(/^www\./, "");
    let videoId = "";

    if (host === "youtu.be") {
      videoId = parsed.pathname.split("/").filter(Boolean)[0] ?? "";
    } else if (host === "youtube.com" || host === "m.youtube.com") {
      if (parsed.pathname === "/watch") {
        videoId = parsed.searchParams.get("v") ?? "";
      } else if (parsed.pathname.startsWith("/embed/") || parsed.pathname.startsWith("/shorts/")) {
        videoId = parsed.pathname.split("/").filter(Boolean)[1] ?? "";
      }
    }

    return /^[A-Za-z0-9_-]{11}$/.test(videoId) ? `https://www.youtube.com/embed/${videoId}` : "";
  } catch (error) {
    return "";
  }
}
