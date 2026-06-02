import { Badge } from "../../../ui/primitives/badge.js";
import { Card } from "../../../ui/composites/card.js";
import { DataTable } from "../../../ui/composites/dataTable.js";
import { EmptyState } from "../../../ui/primitives/emptyState.js";
import { Button } from "../../../ui/primitives/button.js";
import { formatCurrency } from "../../../utils/formatCurrency.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { tw } from "../../../theme/tailwindClasses.js";
import { adminDashboardService } from "../services/adminDashboardService.js";

export function AdminDashboardQueuesPanel({
  pendingUsers = [],
  cars = [],
  onOpenUsers = null,
  onOpenPending = null,
} = {}) {
  const section = document.createElement("section");
  section.id = "adm_dashboard_queues_section";
  section.hidden = true;
  section.setAttribute("aria-hidden", "true");
  section.className = "hidden";
  section.append(
    pendingApprovalsCard(pendingUsers, onOpenPending ?? onOpenUsers),
    carsSummaryCard(cars, onOpenUsers),
  );
  return section;
}

function pendingApprovalsCard(users, onClick) {
  const card = Card([], { variant: "raised" });
  card.id = "adm_dashboard_pending_card";
  card.className = "grid gap-4 rounded-[1.6rem] border border-amber-100/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.9),rgba(255,251,235,0.72))] p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_26px_70px_rgba(15,23,42,0.12)]";
  card.append(sectionHeader("Pending approvals", "Seller yang masih menunggu verifikasi admin.", onClick, "Buka user management", "bell", "adm_dashboard_pending_open_button"));

  if (!users.length) {
    card.append(EmptyState({
      title: "Tidak ada seller pending",
      description: "Approval seller saat ini sudah bersih.",
    }));
    return card;
  }

  card.append(pendingTable(users.slice(0, 6)));
  return card;
}

function carsSummaryCard(cars, onClick) {
  const card = Card([], { variant: "raised" });
  card.id = "adm_dashboard_cars_card";
  card.className = "grid gap-4 rounded-[1.6rem] border border-emerald-100/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.9),rgba(236,253,245,0.72))] p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_26px_70px_rgba(15,23,42,0.12)]";
  card.append(sectionHeader("Cars snapshot", "Ringkasan listing mobil terbaru untuk screening awal admin.", onClick, "Masuk user management", "car", "adm_dashboard_cars_open_button"));

  if (!cars.length) {
    card.append(EmptyState({
      title: "Belum ada mobil",
      description: "Tidak ada listing mobil yang masuk ke snapshot admin.",
    }));
    return card;
  }

  card.append(carsTable(cars.slice(0, 6)));
  return card;
}

function pendingTable(users) {
  const icon = document.createElement("span");
  icon.className = "grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,#f59e0b,#f97316)] text-white shadow-[0_14px_34px_rgba(245,158,11,0.22)]";
  icon.append(createIcon("bell", { className: "h-4 w-4" }));
  return DataTable({
    shellId: "adm_dashboard_pending_table_card",
    title: "Pending approvals",
    subtitle: `${users.length} seller perlu screening cepat`,
    icon,
    columns: [
      { label: "Seller", render: (user) => textBlock("font-bold text-gray-950", user.name || user.email || `User #${user.id}`) },
      { label: "Kontak", render: (user) => textBlock("text-gray-600", `${user.email || "-"} | ${user.phone_number || "-"}`) },
      { label: "Status", render: (user) => Badge({ label: user.account_status || "pending", variant: "warning" }) },
    ],
    rows: users,
    mobileMode: "disclosure",
    emptyTitle: "Tidak ada seller pending",
    emptyDescription: "Approval seller saat ini sudah bersih.",
    mobileCardTitle: (user) => user.name || user.email || `User #${user.id}`,
    mobileCardSubtitle: (user) => user.showroom?.name || user.email || "-",
    mobileCardBadges: (user) => [Badge({ label: user.account_status || "pending", variant: "warning" })],
    mobilePrimaryFields: (user) => [
      { label: "Email", value: user.email || "-" },
      { label: "Telepon", value: user.phone_number || "-" },
    ],
    mobileDisclosureFields: (user) => [
      { label: "Status", value: user.account_status || "pending" },
      { label: "Showroom", value: user.showroom?.name || "-" },
    ],
    mobileCardId: (user, index) => `adm_dashboard_pending_user_${user.id ?? index + 1}_row`,
    tableMinWidth: "min-w-[560px]",
    rowClassName: () => "bg-white/55",
    getRowKey: (user) => user.id,
    shellClassName: "border-amber-100/80",
  });
}

function carsTable(cars) {
  const icon = document.createElement("span");
  icon.className = "grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,#10b981,#14b8a6)] text-white shadow-[0_14px_34px_rgba(16,185,129,0.22)]";
  icon.append(createIcon("car", { className: "h-4 w-4" }));
  return DataTable({
    shellId: "adm_dashboard_cars_table_card",
    title: "Cars snapshot",
    subtitle: `${cars.length} listing terbaru untuk screening awal`,
    icon,
    columns: [
      { label: "Mobil", render: (car) => textBlock("font-bold text-gray-950", `${car.brand_name || "-"} ${car.model_name || ""}`.trim()) },
      { label: "Lokasi", render: (car) => textBlock("text-gray-600", `${car.location_name || "-"} | ${car.transmission || "-"}`) },
      { label: "Harga", render: (car) => textBlock("font-semibold text-gray-950", formatCurrency(car.price_discount || car.price_cash || car.price_credit)) },
      { label: "Status", render: (car) => {
        const meta = adminDashboardService.carStatusMeta(car.listing_status);
        return Badge({ label: meta.label, variant: meta.variant });
      } },
    ],
    rows: cars,
    mobileMode: "disclosure",
    emptyTitle: "Belum ada mobil",
    emptyDescription: "Tidak ada listing mobil yang masuk ke snapshot admin.",
    mobileCardTitle: (car) => `${car.brand_name || "-"} ${car.model_name || ""}`.trim(),
    mobileCardSubtitle: (car) => car.location_name || "-",
    mobileCardBadges: (car) => {
      const meta = adminDashboardService.carStatusMeta(car.listing_status);
      return [Badge({ label: meta.label, variant: meta.variant })];
    },
    mobilePrimaryFields: (car) => [
      { label: "Harga", value: formatCurrency(car.price_discount || car.price_cash || car.price_credit) },
      { label: "Lokasi", value: car.location_name || "-" },
    ],
    mobileDisclosureFields: (car) => [
      { label: "Transmisi", value: car.transmission || "-" },
      { label: "Status", value: adminDashboardService.carStatusMeta(car.listing_status).label },
    ],
    mobileCardId: (car, index) => `adm_dashboard_car_${car.id ?? index + 1}_row`,
    tableMinWidth: "min-w-[640px]",
    rowClassName: () => "bg-white/55",
    getRowKey: (car) => car.id,
    shellClassName: "border-emerald-100/80",
  });
}

function sectionHeader(title, description, onClick, buttonLabel, iconName, buttonId) {
  const wrap = document.createElement("div");
  wrap.className = "flex flex-col gap-3 md:flex-row md:items-start md:justify-between";

  const iconWrap = document.createElement("div");
  iconWrap.className = "grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-orange-700 shadow-sm";
  iconWrap.append(createIcon(iconName, { className: "h-5 w-5" }));

  const copy = document.createElement("div");
  copy.className = "grid gap-1";
  copy.append(
    textBlock("text-base font-black text-gray-950", title),
    textBlock(`text-sm ${tw.text.muted}`, description),
  );

  const titleGroup = document.createElement("div");
  titleGroup.className = "flex min-w-0 items-start gap-3";
  titleGroup.append(iconWrap, copy);

  wrap.append(titleGroup);

  if (onClick) {
    const button = Button({
      label: buttonLabel,
      variant: "secondary",
      onClick,
    });
    button.id = buttonId;
    wrap.append(button);
  }

  return wrap;
}

function textBlock(className, text) {
  const node = document.createElement("p");
  node.className = className;
  node.textContent = text;
  return node;
}
