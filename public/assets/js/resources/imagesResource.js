import { ApiError, apiClient } from "../core/apiClient.js";

export const imagesResource = {
  async listByCar(carId, options = {}) {
    const response = await apiClient.get(`/cars/${encodeURIComponent(carId)}/images`, options);
    return response.data?.images ?? [];
  },

  async upload(carId, file, { isCover = false } = {}, options = {}) {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("is_cover", isCover ? "1" : "0");

    const response = await apiClient.post(`/cars/${encodeURIComponent(carId)}/images`, formData, options);
    return response.data?.image ?? null;
  },

  async uploadWithProgress(carId, file, { isCover = false, onProgress = null } = {}) {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("is_cover", isCover ? "1" : "0");

    const response = await xhrRequest({
      method: "POST",
      path: `/cars/${encodeURIComponent(carId)}/images`,
      body: formData,
      onProgress,
    });

    return response.data?.image ?? null;
  },

  async setCover(carId, imageId, options = {}) {
    const response = await apiClient.patch(`/cars/${encodeURIComponent(carId)}/images/${encodeURIComponent(imageId)}/cover`, {}, options);
    return response.data?.image ?? null;
  },

  async reorder(carId, items = [], options = {}) {
    const response = await apiClient.patch(`/cars/${encodeURIComponent(carId)}/images/reorder`, { items }, options);
    return response.data?.images ?? [];
  },

  async delete(carId, imageId, options = {}) {
    const response = await apiClient.delete(`/cars/${encodeURIComponent(carId)}/images/${encodeURIComponent(imageId)}`, options);
    return response.data?.image ?? null;
  },
};

function xhrRequest({ method = "GET", path = "", body = null, onProgress = null } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, apiClient.url(path), true);
    xhr.setRequestHeader("Accept", "application/json");

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || typeof onProgress !== "function") {
        return;
      }
      onProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      let payload = null;
      try {
        payload = parsePayload(xhr.responseText, xhr.status);
      } catch (error) {
        reject(error);
        return;
      }
      if (!payload || !apiClient.isStandardPayload(payload)) {
        reject(new ApiError("Invalid API response contract.", payload, xhr.status));
        return;
      }
      if (xhr.status < 200 || xhr.status >= 300 || payload.success === false) {
        reject(new ApiError(payload.message || "Request failed", payload, xhr.status));
        return;
      }
      resolve(payload);
    };

    xhr.onerror = () => reject(new ApiError("Upload request failed.", null, xhr.status || 0));
    xhr.onabort = () => reject(new ApiError("Upload dibatalkan.", null, xhr.status || 0));
    xhr.send(body);
  });
}

function parsePayload(text, status) {
  if (!text) {
    return {
      success: status >= 200 && status < 300,
      message: status >= 200 && status < 300 ? "OK" : "Request failed",
      data: null,
      meta: {},
      errors: [],
    };
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new ApiError("Response is not valid JSON.", { raw: text }, status);
  }
}
