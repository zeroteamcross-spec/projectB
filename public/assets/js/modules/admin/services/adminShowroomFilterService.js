import { appStore } from "../../../state/store.js";
import { adminCarsBackgroundLoader } from "./adminCarsBackgroundLoader.js";

export const adminShowroomFilterService = {
  ensure() {
    return adminCarsBackgroundLoader.ensure({ batchLimit: 100 });
  },

  options(records = []) {
    const cachedCars = appStore.get("snapshot.admin.cars.data", null)?.cars ?? [];
    const byId = new Map();

    [...cachedCars, ...records].forEach((record) => {
      const showroomId = record?.showroom_id ?? record?.showroom?.id;
      if (showroomId === null || showroomId === undefined || showroomId === "") {
        return;
      }

      const id = String(showroomId);
      const name = String(record?.showroom_name ?? record?.showroom?.name ?? "").trim();
      const current = byId.get(id);
      if (!current || (!current.name && name)) {
        byId.set(id, { id, name: name || `Showroom #${id}` });
      }
    });

    return [...byId.values()].sort((left, right) => left.name.localeCompare(right.name, "id-ID") || left.id.localeCompare(right.id));
  },
};
