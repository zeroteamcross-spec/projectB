import assert from "node:assert/strict";
import test from "node:test";
import { adminMasterService } from "../public/assets/js/modules/admin/services/adminMasterService.js";
import { sellerCarLocationOptions } from "../public/assets/js/modules/seller/components/sellerCarForm.js";
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

test("seller car location labels include the province but retain the city value", () => {
  const options = sellerCarLocationOptions([
    { id: "city_surabaya", name: "Surabaya", province_name: "Jawa Timur", status: "active" },
    { id: "city_unknown_province", name: "Kota Contoh", province_name: "", status: "active" },
    { id: "city_inactive", name: "Kota Nonaktif", province_name: "Jawa Barat", status: "inactive" },
  ], "Surabaya");

  assert.deepEqual(options, [
    { value: "", label: "Pilih kota" },
    { value: "Surabaya", label: "Surabaya, Jawa Timur" },
    { value: "Kota Contoh", label: "Kota Contoh" },
  ]);
  assert.equal(options.find((option) => option.label === "Surabaya, Jawa Timur")?.value, "Surabaya");
});
