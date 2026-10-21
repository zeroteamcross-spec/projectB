import { carsResource } from "../../../resources/carsResource.js";
import { imagesResource } from "../../../resources/imagesResource.js";
import { inspectionsResource } from "../../../resources/inspectionsResource.js";
import { isApiFetchFailure } from "../../../core/apiClient.js";

const NETWORK_FAILURE_MESSAGE = "Koneksi bermasalah. Periksa internet, lalu coba muat ulang.";
const SERVER_FAILURE_MESSAGE = "Server sedang bermasalah. Coba muat ulang beberapa saat lagi.";
const REQUEST_FAILURE_MESSAGE = "Pratinjau belum dapat dimuat. Coba muat ulang atau kembali ke daftar mobil.";

export async function loadSellerCarPreview(carId, {
  signal,
  archived = false,
  cars = carsResource,
  images = imagesResource,
  inspections = inspectionsResource,
} = {}) {
  let car;

  try {
    car = archived
      ? await findArchivedSellerCar(carId, signal, cars)
      : await cars.sellerDetail(carId, { signal });
  } catch (error) {
    if (!archived && Number(error?.status) === 404) {
      return notFoundResult();
    }

    return failureResult(error);
  }

  if (!car) {
    return archived
      ? notFoundResult()
      : failureResult({ code: "missing_car_payload" });
  }

  let carImages;
  try {
    carImages = await images.listByCar(carId, { signal });
  } catch (error) {
    return failureResult(error);
  }

  const hasInspectionSummary = ["partial", "completed"].includes(
    String(car.inspection_summary_status ?? "").toLowerCase(),
  );
  let inspection = null;
  if (car.listing_status === "published" && hasInspectionSummary) {
    try {
      inspection = await inspections.byCar(carId, { signal });
    } catch (error) {
      // A missing report is a genuine absence; connection and server failures
      // remain failures so the UI does not present them as an empty report.
      if (Number(error?.status) !== 404) {
        return failureResult(error);
      }
    }
  }

  if (!Array.isArray(carImages)) {
    return failureResult({ code: "invalid_images_payload" });
  }

  return {
    status: "ready",
    detail: {
      car,
      images: carImages,
      inspection,
    },
  };
}

async function findArchivedSellerCar(carId, signal, cars) {
  const limit = 100;
  for (let page = 1; ; page += 1) {
    const result = await cars.sellerList({ listing_status: "archived", page, limit }, { signal });
    const match = result.cars.find((car) => String(car.id) === String(carId));
    if (match) {
      return match;
    }
    if (page * limit >= Number(result.meta?.total ?? 0)) {
      return null;
    }
  }
}

function notFoundResult() {
  return { status: "not_found" };
}

function failureResult(error) {
  const status = Number(error?.status ?? 0);
  let code = "request";
  let message = REQUEST_FAILURE_MESSAGE;

  if (error?.code === "missing_car_payload" || error?.code === "invalid_images_payload") {
    code = "invalid_response";
  } else if (
    isApiFetchFailure(error)
    && error?.name !== "AbortError"
  ) {
    code = "network";
    message = NETWORK_FAILURE_MESSAGE;
  } else if (status >= 500) {
    code = "server";
    message = SERVER_FAILURE_MESSAGE;
  }

  return {
    status: "error",
    code,
    message,
  };
}
