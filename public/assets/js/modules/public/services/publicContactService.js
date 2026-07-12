import { showToast } from "../../../ui/primitives/toast.js";
import { publicContextService } from "./publicContextService.js";

export const publicContactService = {
  openWhatsAppConsultation(car = null) {
    const target = publicContextService.resolveWhatsAppTarget(car);

    if (!target.phone) {
      showToast("Nomor WhatsApp belum tersedia untuk context ini.", { type: "info" });
      return;
    }

    const title = [car?.brand_name, car?.model_name, car?.sub_model_name].filter(Boolean).join(" ") || "mobil ini";
    const source = whatsappSourceLabel(target.label);
    const message = encodeURIComponent(`Halo, saya ingin konsultasi untuk ${title} ${source}.`);
    window.open(`https://wa.me/${normalizePhone(target.phone)}?text=${message}`, "_blank", "noopener,noreferrer");
  },
};

function whatsappSourceLabel(label = "") {
  const value = String(label ?? "").toLowerCase();

  if (value.includes("showroom")) {
    return "via showroom";
  }

  if (value.includes("affiliate") || value.includes("marketing")) {
    return "via affiliate";
  }

  return "dari katalog";
}

function normalizePhone(value) {
  return String(value).replace(/[^\d]/g, "").replace(/^0/, "62");
}
