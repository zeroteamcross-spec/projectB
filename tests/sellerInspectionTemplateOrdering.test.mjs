import assert from "node:assert/strict";
import test from "node:test";
import {
  groupInspectionTemplates,
  nextInspectionItemOrder,
  sortInspectionTemplates,
} from "../public/assets/js/modules/seller/inspectionTemplateOrdering.js";

const sectionOrder = ["road_test", "exterior", "interior"];

test("master items are grouped by section and ordered only within each section", () => {
  const items = [
    { id: 1, category_name: "exterior", item_name: "Lampu", sort_order: 10 },
    { id: 2, category_name: "road_test", item_name: "Rem", sort_order: 20 },
    { id: 3, category_name: "road_test", item_name: "Akselerasi", sort_order: 10 },
    { id: 4, category_name: "exterior", item_name: "Cat", sort_order: 5 },
  ];

  const sorted = sortInspectionTemplates(items, sectionOrder);
  const groups = groupInspectionTemplates(sorted);

  assert.deepEqual(groups.map(([section]) => section), ["road_test", "exterior"]);
  assert.deepEqual(groups.map(([, sectionItems]) => sectionItems.map(({ id }) => id)), [
    [3, 2],
    [4, 1],
  ]);
  assert.deepEqual(items.map(({ id }) => id), [1, 2, 3, 4], "sorting must not mutate API data");
});

test("new item ordering starts after the highest item in its selected section", () => {
  const items = [
    { id: 1, category_name: "road_test", sort_order: 80 },
    { id: 2, category_name: "exterior", sort_order: 20 },
    { id: 3, category_name: "exterior", sort_order: 50 },
  ];

  assert.equal(nextInspectionItemOrder(items, "exterior"), 60);
  assert.equal(nextInspectionItemOrder(items, "road_test"), 90);
  assert.equal(nextInspectionItemOrder(items, "interior"), 10);
});

test("same-section sort ties are deterministic and unknown sections remain grouped", () => {
  const sorted = sortInspectionTemplates([
    { id: 9, category_name: "custom_section", sort_order: 1 },
    { id: 8, category_name: "custom_section", sort_order: 1 },
  ], sectionOrder);

  assert.deepEqual(sorted.map(({ id }) => id), [8, 9]);
  assert.deepEqual(groupInspectionTemplates(sorted).map(([section]) => section), ["custom_section"]);
});
