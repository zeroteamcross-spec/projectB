export const PUBLIC_LOCATION_FILTER_INITIAL_CITY_COUNT = 8;

export function publicLocationFilterView(locations, {
  query = "",
  expanded = false,
  selected = [],
} = {}) {
  const allCities = [...new Set((Array.isArray(locations) ? locations : [])
    .map((city) => String(city ?? "").trim())
    .filter(Boolean))];
  const normalizedQuery = String(query ?? "").trim().toLocaleLowerCase("id-ID");
  const matches = normalizedQuery
    ? allCities.filter((city) => city.toLocaleLowerCase("id-ID").includes(normalizedQuery))
    : allCities;

  if (expanded) {
    return { matches, cities: matches, hasMore: false };
  }

  const limit = PUBLIC_LOCATION_FILTER_INITIAL_CITY_COUNT;
  const selectedMatches = [...new Set((Array.isArray(selected) ? selected : [])
    .map((city) => String(city ?? "").trim())
    .filter((city) => city && matches.includes(city)))].slice(0, limit);
  const selectedSet = new Set(selectedMatches);
  const remaining = matches.filter((city) => !selectedSet.has(city));
  const cities = [...selectedMatches, ...remaining.slice(0, Math.max(0, limit - selectedMatches.length))];

  return { matches, cities, hasMore: matches.length > cities.length };
}

export function togglePublicLocationSelection(selected, city, visibleCities = []) {
  const value = String(city ?? "");
  if (!value || !visibleCities.includes(value)) return [...(Array.isArray(selected) ? selected : [])];

  const next = new Set((Array.isArray(selected) ? selected : []).map(String).filter(Boolean));
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return [...next];
}
