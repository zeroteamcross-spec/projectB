import assert from "node:assert/strict";
import test from "node:test";
import { queueSaveBlocker } from "../public/assets/js/modules/seller/components/sellerImageUploadQueueModal.js";

const queue = (...statuses) => statuses.map((status) => ({ status }));

test("Simpan is available only when the remaining queue is empty or fully uploaded", () => {
  assert.equal(queueSaveBlocker([]), "");
  assert.equal(queueSaveBlocker(queue("success", "success")), "");
  assert.match(queueSaveBlocker(queue("success", "queued")), /Mulai Upload/);
  assert.match(queueSaveBlocker(queue("ready")), /Mulai Upload/);
  assert.match(queueSaveBlocker(queue("failed")), /Upload Ulang yang gagal/);
  assert.match(queueSaveBlocker(queue("invalid")), /Hapus file tidak valid/);
  assert.match(queueSaveBlocker(queue("editing")), /Selesaikan atau hapus/);
  assert.match(queueSaveBlocker(queue("success"), true), /Tunggu upload selesai/);
});

test("mixed unresolved items give each relevant next step", () => {
  const message = queueSaveBlocker(queue("success", "queued", "failed", "invalid"));
  assert.match(message, /Mulai Upload/);
  assert.match(message, /Upload Ulang yang gagal/);
  assert.match(message, /Hapus file tidak valid/);
});
