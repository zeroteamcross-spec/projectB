import assert from "node:assert/strict";
import test from "node:test";

import {
  PUBLIC_LOCATION_FILTER_INITIAL_CITY_COUNT,
  publicLocationFilterView,
  togglePublicLocationSelection,
} from "../public/assets/js/modules/public/components/publicLocationFilterState.js";

const cities = [
  "Bandung", "Bekasi", "Bogor", "Depok", "Jakarta Barat", "Jakarta Pusat",
  "Jakarta Selatan", "Jakarta Timur", "Jakarta Utara", "Semarang", "Surabaya", "Tangerang",
];

test("catalog location filter renders exactly the first eight cities by default", () => {
  const view = publicLocationFilterView(cities);

  assert.equal(PUBLIC_LOCATION_FILTER_INITIAL_CITY_COUNT, 8);
  assert.deepEqual(view.cities, cities.slice(0, 8));
  assert.equal(view.cities.length, 8);
  assert.equal(view.hasMore, true);
});

test("city search exposes matching options without requiring show-all", () => {
  const view = publicLocationFilterView(cities, { query: "surabaya" });

  assert.deepEqual(view.matches, ["Surabaya"]);
  assert.deepEqual(view.cities, ["Surabaya"]);
  assert.equal(view.hasMore, false);
});

test("show-all reveals every matching city as a rendered option", () => {
  const view = publicLocationFilterView(cities, { expanded: true });

  assert.deepEqual(view.cities, cities);
  assert.equal(view.cities.length, cities.length);
  assert.equal(view.hasMore, false);
});

test("selection is restricted to rendered city options and toggles selected values", () => {
  const initial = publicLocationFilterView(cities);
  assert.equal(initial.cities.includes("Surabaya"), false);
  assert.deepEqual(togglePublicLocationSelection([], "Surabaya", initial.cities), []);

  const selected = togglePublicLocationSelection([], "Bogor", initial.cities);
  assert.deepEqual(selected, ["Bogor"]);
  assert.equal(initial.cities.includes("Bogor"), true);

  const visibleWithSelection = publicLocationFilterView(cities, { selected });
  assert.equal(visibleWithSelection.cities.length, 8);
  assert.equal(visibleWithSelection.cities.includes("Bogor"), true);
  assert.deepEqual(togglePublicLocationSelection(selected, "Bogor", visibleWithSelection.cities), []);
});
