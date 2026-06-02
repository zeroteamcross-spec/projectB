export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);

  Object.entries(attrs).forEach(([key, value]) => {
    if (key === "className") {
      node.className = value;
    } else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value !== false && value !== null && value !== undefined) {
      node.setAttribute(key, value === true ? "" : value);
    }
  });

  const list = Array.isArray(children) ? children : [children];
  list.forEach((child) => {
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  });

  return node;
}
