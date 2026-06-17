const ROLE_HOSTS = Object.freeze({
  admin: "admin.garasi-mobil.com",
  buyer: "garasi-mobil.com",
  seller: "showroom.garasi-mobil.com",
  affiliate: "marketing.garasi-mobil.com",
});

const PRODUCTION_HOSTS = new Set(Object.values(ROLE_HOSTS));

export function bindDomainRouteGuard({ locationRef = window.location, windowRef = window } = {}) {
  enforceDomainRoute({ locationRef });

  const onHashChange = () => enforceDomainRoute({ locationRef });
  windowRef.addEventListener("hashchange", onHashChange);

  return () => windowRef.removeEventListener("hashchange", onHashChange);
}

export function enforceDomainRoute({ locationRef = window.location } = {}) {
  const currentHost = normalizeHost(locationRef.hostname || locationRef.host);

  if (!PRODUCTION_HOSTS.has(currentHost)) {
    return false;
  }

  const targetRole = roleForHashPath(hashPath(locationRef.hash));
  const targetHost = targetRole ? ROLE_HOSTS[targetRole] : null;

  if (!targetHost || targetHost === currentHost) {
    return false;
  }

  locationRef.replace(`${locationRef.protocol}//${targetHost}${locationRef.pathname}${locationRef.search}${locationRef.hash}`);
  return true;
}

function roleForHashPath(path) {
  if (path === "/admin" || path.startsWith("/admin/") || path === "/super-admin" || path.startsWith("/super-admin/")) {
    return "admin";
  }

  if (path === "/seller" || path.startsWith("/seller/")) {
    return "seller";
  }

  if (path === "/affiliate" || path.startsWith("/affiliate/") || path === "/login/affiliate") {
    return "affiliate";
  }

  if (path === "/buyer" || path.startsWith("/buyer/")) {
    return "buyer";
  }

  if (path.startsWith("/google-login/") || path.startsWith("/login/")) {
    return loginRoleForPath(path);
  }

  return null;
}

function loginRoleForPath(path) {
  const slug = path.split("/")[2] || "";

  if (slug === "admin") {
    return "admin";
  }

  if (slug === "seller") {
    return "seller";
  }

  if (slug === "affiliate") {
    return "affiliate";
  }

  if (slug === "buyer") {
    return "buyer";
  }

  return null;
}

function hashPath(hash) {
  const cleanHash = String(hash || "").replace(/^#/, "") || "/";
  const [path] = cleanHash.split("?");
  const normalized = `/${String(path || "/").replace(/^\/?/, "")}`;

  return normalized === "/" ? "/" : normalized.replace(/\/$/, "");
}

function normalizeHost(host) {
  return String(host || "").toLowerCase().split(":", 1)[0];
}
