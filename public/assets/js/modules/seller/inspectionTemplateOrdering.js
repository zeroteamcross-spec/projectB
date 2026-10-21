export function sortInspectionTemplates(templates, sectionOrder = []) {
  const sectionRanks = new Map(sectionOrder.map((section, index) => [section, index]));

  return [...templates].sort((left, right) => {
    const leftSection = String(left.category_name ?? "general");
    const rightSection = String(right.category_name ?? "general");
    const sectionRank = (sectionRanks.get(leftSection) ?? sectionOrder.length)
      - (sectionRanks.get(rightSection) ?? sectionOrder.length);

    if (sectionRank) return sectionRank;
    if (leftSection !== rightSection) return leftSection < rightSection ? -1 : 1;

    return Number(left.sort_order ?? 0) - Number(right.sort_order ?? 0)
      || Number(left.id ?? 0) - Number(right.id ?? 0);
  });
}

export function groupInspectionTemplates(templates) {
  const groups = new Map();

  templates.forEach((template) => {
    const section = String(template.category_name ?? "general");
    if (!groups.has(section)) groups.set(section, []);
    groups.get(section).push(template);
  });

  return Array.from(groups.entries());
}

export function nextInspectionItemOrder(templates, section) {
  const highest = templates.reduce((max, template) => {
    if (String(template.category_name ?? "general") !== section) return max;
    return Math.max(max, Number(template.sort_order ?? 0));
  }, 0);

  return highest + 10;
}
