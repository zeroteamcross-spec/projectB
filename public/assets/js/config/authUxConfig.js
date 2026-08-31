export const authUxConfig = Object.freeze({
  googleLoginDefaultEnabled: true,
  showLegacyLoginLinks: false,
});

export function googleLoginPathForRole(role = "buyer") {
  const slugByRole = {
    buyer: "buyer",
    seller: "seller",
    admin: "admin",
    affiliate_admin: "affiliate",
    affiliate: "affiliate",
    public: "buyer",
  };

  return `/google-login/${slugByRole[role] ?? "buyer"}`;
}

export function defaultLoginPath(role = "buyer") {
  return authUxConfig.googleLoginDefaultEnabled ? googleLoginPathForRole(role) : "/auth";
}

export function defaultLoginHash(role = null) {
  if (authUxConfig.googleLoginDefaultEnabled && role === null) {
    return "/google-login";
  }

  return defaultLoginPath(role ?? "buyer");
}
