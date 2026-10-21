import assert from "node:assert/strict";
import test from "node:test";
import { ApiClient, isApiFetchFailure } from "../public/assets/js/core/apiClient.js";
import { loadSellerCarPreview } from "../public/assets/js/modules/seller/services/sellerCarPreviewService.js";

const publishedCar = {
  id: 41,
  listing_status: "published",
  inspection_summary_status: "completed",
};

function resources({ car = publishedCar, carError = null, images = [], imageError = null, inspection = { id: 9 }, inspectionError = null, archivedListError = null } = {}) {
  return {
    cars: {
      async sellerDetail() {
        if (carError) throw carError;
        return car;
      },
      async sellerList() {
        if (archivedListError) throw archivedListError;
        return { cars: [], meta: { total: 0 } };
      },
    },
    images: {
      async listByCar() {
        if (imageError) throw imageError;
        return images;
      },
    },
    inspections: {
      async byCar() {
        if (inspectionError) throw inspectionError;
        return inspection;
      },
    },
  };
}

test("only an explicit missing car response is classified as not found", async () => {
  const result = await loadSellerCarPreview("41", {
    ...resources({ carError: Object.assign(new Error("not found"), { status: 404 }) }),
  });

  assert.deepEqual(result, { status: "not_found" });
});

test("a TypeError rejected by fetch is a retryable network error, not not-found", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new TypeError("Failed to fetch");
  };

  let result;
  try {
    result = await loadSellerCarPreview("41");
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(result.status, "error");
  assert.equal(result.code, "network");
  assert.match(result.message, /Koneksi bermasalah/);
});

test("a frozen fetch rejection is wrapped and recognized without mutating the original", async () => {
  const originalFetch = globalThis.fetch;
  const fetchError = Object.freeze(new TypeError("Failed to fetch"));
  globalThis.fetch = async () => {
    throw fetchError;
  };

  let result;
  try {
    result = await loadSellerCarPreview("41", {
      cars: { sellerDetail: (id, options) => new ApiClient().get(`cars/${id}`, options) },
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(result.code, "network");
  assert.equal(Object.isFrozen(fetchError), true);
  assert.equal(Object.hasOwn(fetchError, "apiFetchFailure"), false);
  assert.equal(isApiFetchFailure(fetchError), false);
});

test("reusing a fetch rejection in a non-fetch path does not preserve network classification", async () => {
  const originalFetch = globalThis.fetch;
  const fetchError = new TypeError("Failed to fetch");
  globalThis.fetch = async () => {
    throw fetchError;
  };

  let wrappedError;
  try {
    await new ApiClient().get("cars/41");
  } catch (error) {
    wrappedError = error;
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(isApiFetchFailure(wrappedError), true);
  assert.equal(wrappedError.cause, fetchError);
  assert.equal(Object.hasOwn(fetchError, "apiFetchFailure"), false);

  const result = await loadSellerCarPreview("41", {
    ...resources({ carError: fetchError }),
  });
  assert.equal(result.code, "request");
});

test("HTTP and response-processing errors are not classified as fetch failures", async () => {
  const originalFetch = globalThis.fetch;
  const client = new ApiClient();
  const loadPreviewThroughClient = () => loadSellerCarPreview("41", {
    cars: { sellerDetail: (id, options) => client.get(`cars/${id}`, options) },
  });

  try {
    globalThis.fetch = async () => ({
      ok: false,
      status: 503,
      text: async () => JSON.stringify({
        success: false,
        message: "Service unavailable",
        data: null,
        meta: {},
        errors: [],
      }),
    });
    await assert.rejects(client.get("cars/41"), (error) => {
      assert.equal(isApiFetchFailure(error), false);
      assert.equal(error.status, 503);
      return true;
    });
    const httpResult = await loadPreviewThroughClient();
    assert.equal(httpResult.code, "server");

    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      text: async () => {
        throw new TypeError("Response body processing failed");
      },
    });
    await assert.rejects(client.get("cars/41"), (error) => {
      assert.equal(isApiFetchFailure(error), false);
      assert.equal(error.name, "TypeError");
      return true;
    });
    const processingResult = await loadPreviewThroughClient();
    assert.equal(processingResult.code, "request");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("a processing TypeError is not mislabeled as a network outage", async () => {
  const result = await loadSellerCarPreview("41", {
    ...resources({ carError: new TypeError("Unexpected response processing error") }),
  });

  assert.equal(result.status, "error");
  assert.equal(result.code, "request");
  assert.doesNotMatch(result.message, /Koneksi bermasalah/);
});

test("server failure loading the car is distinct from a missing car", async () => {
  const result = await loadSellerCarPreview("41", {
    ...resources({ carError: Object.assign(new Error("server error"), { status: 503 }) }),
  });

  assert.equal(result.status, "error");
  assert.equal(result.code, "server");
  assert.match(result.message, /Server sedang bermasalah/);
});

test("unexpected client exceptions are not mislabeled as network outages", async () => {
  const result = await loadSellerCarPreview("41", {
    ...resources({ carError: new Error("unexpected client error") }),
  });

  assert.equal(result.status, "error");
  assert.equal(result.code, "request");
});

test("an empty successful car payload is treated as an invalid response, not a true 404", async () => {
  const result = await loadSellerCarPreview("41", {
    ...resources({ car: null }),
  });

  assert.equal(result.status, "error");
  assert.equal(result.code, "invalid_response");
});

test("image API failure is not silently converted to an empty gallery", async () => {
  const result = await loadSellerCarPreview("41", {
    ...resources({ imageError: Object.assign(new Error("unavailable"), { status: 503 }) }),
  });

  assert.equal(result.status, "error");
  assert.equal(result.code, "server");
  assert.equal("detail" in result, false);
});

test("inspection API failure is not silently converted to an empty inspection", async () => {
  const result = await loadSellerCarPreview("41", {
    ...resources({ inspectionError: Object.assign(new Error("unavailable"), { status: 502 }) }),
  });

  assert.equal(result.status, "error");
  assert.equal(result.code, "server");
  assert.equal("detail" in result, false);
});

test("a genuinely missing inspection report remains an absent optional report", async () => {
  const result = await loadSellerCarPreview("41", {
    ...resources({ inspectionError: Object.assign(new Error("not found"), { status: 404 }) }),
  });

  assert.equal(result.status, "ready");
  assert.equal(result.detail.inspection, null);
});

test("an archived listing request failure is not classified as a missing vehicle", async () => {
  const result = await loadSellerCarPreview("41", {
    archived: true,
    ...resources({ archivedListError: Object.assign(new Error("unavailable"), { status: 503 }) }),
  });

  assert.equal(result.status, "error");
  assert.equal(result.code, "server");
});

test("a successfully searched archived list with no matching vehicle is not-found", async () => {
  const result = await loadSellerCarPreview("41", {
    archived: true,
    ...resources(),
  });

  assert.deepEqual(result, { status: "not_found" });
});

test("successful preview preserves visible images and inspection data", async () => {
  const photo = { id: 6, url: "/car.jpg" };
  const report = { id: 10, status: "published" };
  const result = await loadSellerCarPreview("41", {
    ...resources({ images: [photo], inspection: report }),
  });

  assert.equal(result.status, "ready");
  assert.equal(result.detail.car, publishedCar);
  assert.deepEqual(result.detail.images, [photo]);
  assert.equal(result.detail.inspection, report);
});
