import assert from "node:assert/strict";
import test from "node:test";
import { adminMasterService } from "../public/assets/js/modules/admin/services/adminMasterService.js";
import { sellerRoutes } from "../public/assets/js/modules/seller/routes.js";

test("seller cars route refreshes Master Lokasi for its create/edit form", async () => {
  const route = sellerRoutes.find((item) => item.name === "seller.cars");
  const locationLoader = route?.preload?.working?.find((item) => item.key === "masterLocation")?.loader;

  assert.equal(typeof locationLoader, "function", "seller.cars must preload Master Lokasi");

  const originalGetLocationMaster = adminMasterService.getLocationMaster;
  const signal = new AbortController().signal;
  const latestMaster = {
    data: {
      cities: [{ id: "city_new", name: "Kota Master Terbaru", status: "active" }],
    },
  };
  let receivedOptions = null;

  adminMasterService.getLocationMaster = async (options) => {
    receivedOptions = options;
    return latestMaster;
  };

  try {
    const result = await locationLoader({ signal });
    assert.equal(result, latestMaster, "the fresh master response should populate route working state");
    assert.equal(receivedOptions?.signal, signal, "route cancellation should reach the API request");
  } finally {
    adminMasterService.getLocationMaster = originalGetLocationMaster;
  }
});
