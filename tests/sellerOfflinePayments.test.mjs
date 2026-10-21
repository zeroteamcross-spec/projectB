import assert from "node:assert/strict";
import test from "node:test";
import { authStore } from "../public/assets/js/state/authStore.js";
import { appStore } from "../public/assets/js/state/store.js";
import { sellerTransactionService } from "../public/assets/js/modules/seller/services/sellerTransactionService.js";
import {
  markOfflineBookedCarSoldLocally,
  OFFLINE_BOOKING_REFRESH_WARNING,
  preserveOfflineBookedCarStatus,
  showOfflineBookingRefreshWarning,
} from "../public/assets/js/modules/seller/pages/carsPage.js";
import {
  readOfflineBookingFields,
  readOfflinePaymentFields,
} from "../public/assets/js/modules/seller/components/sellerOfflinePaymentFields.js";

function fields(values = {}) {
  const formData = new FormData();
  Object.entries(values).forEach(([key, value]) => formData.set(key, value));
  return formData;
}

test("offline booking payload requires buyer contact and exact Booking Fee", () => {
  const form = fields({
    buyer_name: "  Rina Putri  ",
    buyer_phone_number: "081234567890",
    buyer_email: "",
    buyer_username: "rina.putri",
    buyer_password: "rahasia123",
    payment_amount: "2500000",
    paid_at: "2026-10-20T10:30",
    note: "Pembayaran diterima di showroom.",
  });

  assert.deepEqual(readOfflineBookingFields(form, { id: 41, dp_amount: 2500000 }), {
    car_id: 41,
    buyer_name: "Rina Putri",
    buyer_phone_number: "081234567890",
    buyer_username: "rina.putri",
    buyer_password: "rahasia123",
    payment_amount: 2500000,
    paid_at: "2026-10-20T10:30",
    note: "Pembayaran diterima di showroom.",
  });

  assert.throws(
    () => readOfflineBookingFields(fields({
      buyer_name: "Rina",
      buyer_username: "rina",
      buyer_password: "rahasia123",
      payment_amount: "2500000",
      paid_at: "2026-10-20T10:30",
    }), { id: 41, dp_amount: 2500000 }),
    /nomor telepon atau email buyer/i,
  );
  assert.throws(
    () => readOfflineBookingFields(fields({
      buyer_name: "Rina",
      buyer_phone_number: "081234567890",
      buyer_username: "rina",
      buyer_password: "rahasia123",
      payment_amount: "2499999",
      paid_at: "2026-10-20T10:30",
    }), { id: 41, dp_amount: 2500000 }),
    /sama persis dengan Booking Fee/i,
  );
});

test("offline payment form payload trims note and rejects invalid values", () => {
  assert.deepEqual(readOfflinePaymentFields(fields({
    payment_amount: "1000000",
    paid_at: "2026-10-20T09:15",
    note: "  Transfer tunai diterima.  ",
  }), 1000000), {
    payment_amount: 1000000,
    paid_at: "2026-10-20T09:15",
    note: "Transfer tunai diterima.",
  });

  assert.throws(() => readOfflinePaymentFields(fields({
    payment_amount: "1000001",
    paid_at: "2026-10-20T09:15",
  }), 1000000), /sama persis dengan Booking Fee/i);
  assert.throws(() => readOfflinePaymentFields(fields({
    payment_amount: "1000000",
    paid_at: "",
  }), 1000000), /tanggal dan waktu pembayaran/i);
});

test("offline actions are visible only to the owning showroom on eligible records", () => {
  const previous = {
    document: globalThis.document,
    input: globalThis.HTMLInputElement,
    textarea: globalThis.HTMLTextAreaElement,
  };
  globalThis.document = { activeElement: null, getElementById: () => null };
  globalThis.HTMLInputElement = class HTMLInputElement {};
  globalThis.HTMLTextAreaElement = class HTMLTextAreaElement {};

  try {
    // The code's owner rule is a seller account matching seller_user_id.
    authStore.setContext({ user: { id: 17, role: "seller" } });
    assert.equal(sellerTransactionService.canCreateOfflineBooking({
      seller_user_id: 17,
      listing_status: "published",
    }), true);
    assert.equal(sellerTransactionService.canCreateOfflineBooking({
      seller_user_id: 17,
      listing_status: "sold",
    }), false);

    const pending = {
      seller_user_id: 17,
      payment_type: "dp",
      transaction_status: "pending_payment",
      payment_method: "bca_va",
    };
    assert.equal(sellerTransactionService.canRecordOfflinePayment(pending), true);
    assert.equal(sellerTransactionService.canRecordOfflinePayment({
      ...pending,
      transaction_status: "dp_paid",
    }), false);
    assert.equal(sellerTransactionService.canRecordOfflinePayment({
      ...pending,
      payment_method: "manual_transfer",
      manual_transfer: { proof_path: "/proof.jpg" },
    }), false);

    authStore.setContext({ user: { id: 18, role: "seller" } });
    assert.equal(sellerTransactionService.canCreateOfflineBooking({
      seller_user_id: 17,
      listing_status: "published",
    }), false);
    assert.equal(sellerTransactionService.canRecordOfflinePayment(pending), false);
    authStore.setContext({ user: { id: 17, role: "seller_staff" } });
    assert.equal(sellerTransactionService.canCreateOfflineBooking({
      seller_user_id: 17,
      listing_status: "published",
    }), false);
    assert.equal(sellerTransactionService.canRecordOfflinePayment(pending), false);
  } finally {
    authStore.setContext({ user: null });
    if (previous.document === undefined) delete globalThis.document;
    else globalThis.document = previous.document;
    if (previous.input === undefined) delete globalThis.HTMLInputElement;
    else globalThis.HTMLInputElement = previous.input;
    if (previous.textarea === undefined) delete globalThis.HTMLTextAreaElement;
    else globalThis.HTMLTextAreaElement = previous.textarea;
  }
});

test("confirmed offline booking keeps the local car sold if refresh fails", () => {
  const previousState = appStore.getState();
  const previous = {
    document: globalThis.document,
    input: globalThis.HTMLInputElement,
    textarea: globalThis.HTMLTextAreaElement,
    window: globalThis.window,
  };
  const storage = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key),
    },
  };
  globalThis.document = { activeElement: null, getElementById: () => null };
  globalThis.HTMLInputElement = class HTMLInputElement {};
  globalThis.HTMLTextAreaElement = class HTMLTextAreaElement {};

  try {
    authStore.setContext({ user: { id: 17, role: "seller" } });
    const car = { id: 41, seller_user_id: 17, listing_status: "published", dp_amount: 2500000 };
    appStore.patchState("working.sellerCars.cars", {
      data: { cars: [car], meta: { total: 1 } },
      hydratedAt: Date.now(),
    }, "test:offline-booking-cars");
    appStore.patchState("snapshot.seller.cars", {
      data: { cars: [car], meta: { total: 1 } },
      hydratedAt: Date.now(),
    }, "test:offline-booking-snapshot");

    markOfflineBookedCarSoldLocally(car);
    const localCar = appStore.get("working.sellerCars.cars.data.cars", []).find((item) => item.id === 41);
    assert.equal(localCar.listing_status, "sold");
    assert.equal(sellerTransactionService.canCreateOfflineBooking(localCar), false);

    const staleRefresh = preserveOfflineBookedCarStatus({
      cars: [{ ...car, listing_status: "published" }],
      meta: { total: 1 },
    }, car);
    assert.equal(staleRefresh.cars[0].listing_status, "sold");

    showOfflineBookingRefreshWarning();
    assert.equal(appStore.get("runtime.sellerCars.notice", ""), OFFLINE_BOOKING_REFRESH_WARNING);
  } finally {
    appStore.setState(previousState, "test:restore-app-state");
    if (previous.document === undefined) delete globalThis.document;
    else globalThis.document = previous.document;
    if (previous.input === undefined) delete globalThis.HTMLInputElement;
    else globalThis.HTMLInputElement = previous.input;
    if (previous.textarea === undefined) delete globalThis.HTMLTextAreaElement;
    else globalThis.HTMLTextAreaElement = previous.textarea;
    if (previous.window === undefined) delete globalThis.window;
    else globalThis.window = previous.window;
  }
});

test("offline booking and payment use the agreed API routes and payloads", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, init) => {
    requests.push({ url: String(url), init });
    const id = requests.length;
    return new Response(JSON.stringify({
      success: true,
      message: "OK",
      data: { transaction: { id } },
      meta: {},
      errors: [],
    }), { status: 200, headers: { "content-type": "application/json" } });
  };

  try {
    const bookingPayload = {
      car_id: 41,
      buyer_name: "Rina Putri",
      buyer_phone_number: "081234567890",
      buyer_username: "rina.putri",
      buyer_password: "rahasia123",
      payment_amount: 2500000,
      paid_at: "2026-10-20T10:30",
    };
    const booking = await sellerTransactionService.createOfflineBooking(bookingPayload);
    const payment = await sellerTransactionService.recordOfflinePayment(58, {
      payment_amount: 1000000,
      paid_at: "2026-10-20T10:30",
      note: "Diterima di showroom.",
    });

    assert.deepEqual(booking, { id: 1 });
    assert.deepEqual(payment, { id: 2 });
    assert.equal(requests[0].url, "/api/transactions/offline-bookings");
    assert.equal(requests[1].url, "/api/transactions/58/offline-payment");
    assert.deepEqual(JSON.parse(requests[0].init.body), bookingPayload);
    assert.deepEqual(JSON.parse(requests[1].init.body), {
      payment_amount: 1000000,
      paid_at: "2026-10-20T10:30",
      note: "Diterima di showroom.",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
