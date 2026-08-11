import { affiliateDashboardResource } from "../../../resources/affiliateDashboardResource.js";

export const affiliateActivityService = {
  list(params = {}, options = {}) {
    return affiliateDashboardResource.clicks(params, options);
  },

  summary(payload = null) {
    const summary = payload?.summary ?? {};
    const clicks = payload?.clicks ?? [];

    return {
      totalClicks: Number(summary.total_clicks ?? clicks.length ?? 0),
      todayClicks: Number(summary.today_clicks ?? 0),
      topLandingUrl: summary.top_landing_url ?? "",
      topLandingClicks: Number(summary.top_landing_clicks ?? 0),
    };
  },

  summaryCards(payload = null) {
    const summary = this.summary(payload);
    const topLanding = summary.topLandingUrl ? parseLanding(summary.topLandingUrl) : null;

    return [
      {
        key: "total",
        label: "Total clicks",
        value: String(summary.totalClicks),
        helper: summary.totalClicks > 0 ? "Aktivitas click sudah mulai tercatat." : "Belum ada click tercatat.",
      },
      {
        key: "today",
        label: "Clicks hari ini",
        value: String(summary.todayClicks),
        helper: summary.todayClicks > 0 ? "Traffic hari ini sudah masuk ke log marketing." : "Belum ada click baru hari ini.",
      },
      {
        key: "top",
        label: "Landing paling aktif",
        value: topLanding?.label || "-",
        helper: summary.topLandingClicks > 0 ? `${summary.topLandingClicks} click pada route ini.` : "Belum ada landing dominan.",
      },
    ];
  },

  normalizedClicks(payload = null) {
    const clicks = payload?.clicks ?? [];

    return clicks.map((click) => {
      const parsed = parseLanding(click.landing_url);

      return {
        ...click,
        sourceLabel: parsed.sourceLabel,
        targetLabel: parsed.targetLabel,
        slugLabel: parsed.slugLabel,
      };
    });
  },
};

function parseLanding(url = "") {
  if (!url) {
    return {
      label: "-",
      sourceLabel: "Source belum tersedia",
      targetLabel: "Target belum tersedia",
      slugLabel: "-",
    };
  }

  const hash = String(url).split("#")[1] ?? "";
  const path = hash.startsWith("/") ? hash : `/${hash}`;
  const normalized = path.split("?")[0];
  const segments = normalized.split("/").filter(Boolean);
  const slug = segments[0] === "af" ? segments[1] ?? "" : "";

  if (segments[0] === "af" && segments.length === 2) {
    return {
      label: "Landing katalog",
      sourceLabel: "Landing marketing",
      targetLabel: "Katalog showroom",
      slugLabel: slug || "-",
    };
  }

  if (segments[0] === "af" && segments[2] === "cars" && segments[3]) {
    return {
      label: `Detail mobil #${segments[3]}`,
      sourceLabel: "Detail mobil marketing",
      targetLabel: `Mobil #${segments[3]}`,
      slugLabel: slug || "-",
    };
  }

  if (segments[0] === "af" && segments[2] === "transactions" && segments[3] === "new") {
    return {
      label: "Entry transaksi",
      sourceLabel: "Transaction entry marketing",
      targetLabel: "Flow transaksi",
      slugLabel: slug || "-",
    };
  }

  return {
    label: normalized || url,
    sourceLabel: "Context marketing",
    targetLabel: "Target belum dipetakan",
    slugLabel: slug || "-",
  };
}
