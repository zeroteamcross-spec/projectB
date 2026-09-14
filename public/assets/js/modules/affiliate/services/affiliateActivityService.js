import { affiliateDashboardResource } from "../../../resources/affiliateDashboardResource.js";
import { publicReservedRoutePrefixes } from "../../../core/publicReservedRouteWords.js";

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

  // landing_url yang benar-benar tersimpan adalah URL absolut biasa
  // ("https://carlynk.id/{showroom}/{marketing}/cars/9"), BUKAN URL dengan
  // fragment hash -- fungsi ini dulu selalu membaca String(url).split("#")[1],
  // yang untuk URL absolut manapun selalu kosong. Akibatnya parsing di bawah
  // TIDAK PERNAH cocok untuk data nyata (bukan cuma untuk skema baru), dan
  // "Target belum dipetakan" muncul untuk semua click tanpa kecuali. Kalau
  // ada fragment hash (format lama, kalau-kalau masih ada di data historis),
  // itu tetap dipakai; kalau tidak ada, pathname URL itu sendiri yang dibaca.
  const hashFragment = String(url).split("#")[1] ?? "";
  let pathname = "";
  if (hashFragment) {
    pathname = hashFragment.startsWith("/") ? hashFragment : `/${hashFragment}`;
  } else {
    try {
      pathname = new URL(url, window.location.origin).pathname;
    } catch {
      pathname = String(url).startsWith("/") ? String(url) : `/${url}`;
    }
  }
  const normalized = pathname.split("?")[0];
  const segments = normalized.split("/").filter(Boolean);

  // Skema URL lama, "/af/:slug/..." -- link lama yang mungkin masih beredar
  // tetap harus terbaca benar.
  const isLegacyAfScheme = segments[0] === "af";
  // Skema baru, "/{showroom-slug}/{marketing-slug}/..." -- showroom hidup
  // langsung di root sejak URL disederhanakan (lihat routes.js modul public),
  // jadi satu-satunya penanda "ini bukan rute sistem" adalah segmen pertamanya
  // BUKAN kata cadangan (sama seperti publicShell.js mendeteksi halaman
  // showroom). Fungsi ini dulu cuma mengenali skema lama, jadi SEMUA click
  // dari link marketing yang sudah dipindah ke skema baru selalu jatuh ke
  // fallback "Target belum dipetakan" -- padahal slug-nya ada di URL.
  const isNewScheme = ! isLegacyAfScheme
    && segments.length >= 2
    && ! publicReservedRoutePrefixes.includes(segments[0]);

  if (! isLegacyAfScheme && ! isNewScheme) {
    return {
      label: normalized || url,
      sourceLabel: "Context marketing",
      targetLabel: "Target belum dipetakan",
      slugLabel: "-",
    };
  }

  // Kedua skema punya bentuk segmen yang sama persis dari posisi ini:
  // [0]=showroom-slug-atau-"af", [1]=slug marketing, [2]="cars"/"transactions", [3]=id/"new".
  const slug = segments[1] ?? "";

  if (segments.length === 2) {
    return {
      label: "Landing katalog",
      sourceLabel: "Landing marketing",
      targetLabel: "Katalog showroom",
      slugLabel: slug || "-",
    };
  }

  if (segments[2] === "cars" && segments[3]) {
    return {
      label: `Detail mobil #${segments[3]}`,
      sourceLabel: "Detail mobil marketing",
      targetLabel: `Mobil #${segments[3]}`,
      slugLabel: slug || "-",
    };
  }

  if (segments[2] === "transactions" && segments[3] === "new") {
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
