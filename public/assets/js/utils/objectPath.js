export function getByPath(source, path, fallback = null) {
  return String(path)
    .split(".")
    .filter(Boolean)
    .reduce((value, key) => {
      if (value && Object.prototype.hasOwnProperty.call(value, key)) {
        return value[key];
      }

      return fallback;
    }, source);
}

export function setByPath(target, path, value) {
  const keys = String(path).split(".").filter(Boolean);
  let cursor = target;

  keys.slice(0, -1).forEach((key) => {
    if (!cursor[key] || typeof cursor[key] !== "object") {
      cursor[key] = {};
    }

    cursor = cursor[key];
  });

  cursor[keys[keys.length - 1]] = value;
  return target;
}
