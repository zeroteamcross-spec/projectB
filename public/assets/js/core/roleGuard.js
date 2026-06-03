import { defaultLoginPath, googleLoginPathForRole } from "../config/authUxConfig.js";

const PUBLIC_ROLE = "public";
const DEFAULT_HOME_BY_ROLE = {
  public: "/",
  buyer: "/buyer",
  seller: "/seller",
  admin: "/admin",
  affiliate_admin: "/affiliate",
};

export function createRoleGuard({ auth } = {}) {
  return function resolveRoleGuard({ route, location }) {
    if (!route) {
      return allow(route);
    }

    if (route.authRequired) {
      const currentRole = auth?.role?.() ?? PUBLIC_ROLE;
      const isAuthenticated = auth?.isAuthenticated?.() ?? false;

      if (!isAuthenticated || currentRole === PUBLIC_ROLE) {
        return unauthenticatedRedirect({
          route,
          location,
          requiredRole: route.role ?? currentRole ?? PUBLIC_ROLE,
        });
      }

      return allow(route);
    }

    const requiredRole = route.role ?? PUBLIC_ROLE;

    if (requiredRole === PUBLIC_ROLE) {
      return allow(route);
    }

    const currentRole = auth?.role?.() ?? PUBLIC_ROLE;
    const isAuthenticated = auth?.isAuthenticated?.() ?? false;

    if (!isAuthenticated || currentRole === PUBLIC_ROLE) {
      return unauthenticatedRedirect({
        route,
        location,
        requiredRole,
      });
    }

    if (currentRole !== requiredRole) {
      return redirect({
        route,
        currentRole,
        requiredRole,
        fromPath: location.path,
      });
    }

    return allow(route);
  };
}

function allow(route) {
  return {
    type: "allow",
    route,
  };
}

function unauthenticatedRedirect({ route, location, requiredRole }) {
  return {
    type: "redirect",
    path: authLandingPath(requiredRole, location.path),
    meta: {
      requiredRole,
      blockedRouteName: route.name,
      blockedPath: location.path,
      reason: "unauthenticated",
    },
  };
}

function redirect({ route, currentRole, requiredRole, fromPath }) {
  return {
    type: "redirect",
    path: homeForRole(currentRole),
    meta: {
      currentRole,
      requiredRole,
      blockedRouteName: route.name,
      blockedPath: fromPath,
      reason: "role-mismatch",
      message: mismatchMessage(currentRole, requiredRole),
    },
  };
}

function mismatchMessage(currentRole, requiredRole) {
  return `Akun ${roleLabel(currentRole)} tidak dapat membuka area ${roleLabel(requiredRole)}.`;
}

function roleLabel(role) {
  const labels = {
    public: "publik",
    buyer: "buyer",
    seller: "seller",
    admin: "admin",
    affiliate_admin: "affiliate admin",
  };

  return labels[role] ?? role;
}

function homeForRole(role) {
  return DEFAULT_HOME_BY_ROLE[role] ?? DEFAULT_HOME_BY_ROLE.public;
}

function authLandingPath(requiredRole, fromPath) {
  const path = requiredRole === PUBLIC_ROLE ? defaultLoginPath("buyer") : googleLoginPathForRole(requiredRole);
  const query = new URLSearchParams();
  query.set("from", fromPath);
  return `${path}?${query.toString()}`;
}
