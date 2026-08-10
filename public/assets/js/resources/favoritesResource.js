import { apiClient } from "../core/apiClient.js";

export const favoritesResource = {
  async list(options = {}) {
    const response = await apiClient.get("/favorites", options);
    return normalizeFavoritesPayload(response.data);
  },

  async add(carId, options = {}) {
    const response = await apiClient.post("/favorites", { car_id: carId }, options);
    return normalizeFavoritesPayload(response.data);
  },

  async remove(carId, options = {}) {
    const response = await apiClient.delete(`/favorites/${encodeURIComponent(carId)}`, options);
    return normalizeFavoritesPayload(response.data);
  },
};

function normalizeFavoritesPayload(data) {
  return {
    cars: Array.isArray(data?.cars) ? data.cars : [],
    carIds: Array.isArray(data?.car_ids) ? data.car_ids.map((id) => Number(id)) : [],
    total: Number(data?.total ?? 0),
  };
}
