import { carsResource } from "../../../resources/carsResource.js";
import { sellerAffiliateService } from "../../seller/services/sellerAffiliateService.js";

export const affiliateCarsService = {
  async listSellerCars(affiliate = null, options = {}) {
    const sellerUserId = Number(affiliate?.seller_user_id ?? 0);

    if (!sellerUserId) {
      return { cars: [], meta: {} };
    }

    return carsResource.list({
      seller_user_id: sellerUserId,
      listing_status: "published",
      limit: 100,
    }, options);
  },

  shareUrl(affiliate = null, carId = "") {
    return sellerAffiliateService.carLandingUrl(affiliate?.referral_code ?? "", carId);
  },

  whatsappShareUrl(affiliate = null, car = null) {
    const url = this.shareUrl(affiliate, car?.id ?? "");

    if (!url) {
      return "";
    }

    const title = carTitle(car);
    const text = `Halo, cek unit ${title} ini${url ? `: ${url}` : ""}`;

    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  },

  carTitle,
};

function carTitle(car = null) {
  return [car?.brand_name, car?.model_name, car?.sub_model_name].filter(Boolean).join(" ") || "Mobil";
}
