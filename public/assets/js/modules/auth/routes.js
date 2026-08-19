import { GoogleLoginChooserPage } from "./pages/googleLoginChooserPage.js";
import { GoogleLoginCompletePage } from "./pages/googleLoginCompletePage.js";
import { GoogleLoginPage } from "./pages/googleLoginPage.js";
import { RoleSpecificLoginPage } from "./pages/roleSpecificLoginPage.js";
import { googleLoginService } from "./services/googleLoginService.js";
import { roleSpecificLoginService } from "./services/roleSpecificLoginService.js";
import { getLastViewedPublicContextPath, publicContextPathFromRedirect } from "../../utils/lastViewedPublicContext.js";

const roleLoginRoutes = roleSpecificLoginService.routes().map((config) => ({
  name: `auth.login.${config.slug}`,
  path: `/login/${config.slug}`,
  shell: "public",
  role: "public",
  page: () => RoleSpecificLoginPage({ roleSlug: config.slug }),
  workingStateKey: null,
}));

const googleLoginRoutes = googleLoginService.routes().map((config) => ({
  name: `auth.google-login.${config.slug}`,
  path: `/google-login/${config.slug}`,
  shell: "public",
  role: "public",
  // Buyer arrives here with no slug of its own in the route pattern (unlike
  // the showroom-scoped /s/:slug/login route), but the actual URL usually
  // still carries one: the guard that bounces an unauthenticated visitor
  // here always appends ?from=<the page they were trying to reach>, and
  // that path is showroom- or marketing-scoped whenever the visitor was
  // anywhere under one (not just its bare root -- car detail, checkout, any
  // buyer-only page). publicContextPathFromRedirect() reads that first, and
  // returns the right kind of link (showroom catalog vs. marketing landing);
  // getLastViewedPublicContextPath() (localStorage, tracks whichever of the
  // two was viewed most recently) only fills the remaining gap where `from`
  // itself isn't scoped to either.
  page: (context) => GoogleLoginPage({
    roleSlug: config.slug,
    ...(config.slug === "buyer" ? (() => {
      const path = publicContextPathFromRedirect(context?.query?.from) || getLastViewedPublicContextPath();
      return path ? { footerLink: { label: "Kembali ke Katalog", path } } : {};
    })() : {}),
  }),
  workingStateKey: null,
}));

export const authRoutes = [
  ...roleLoginRoutes,
  {
    name: "auth.google-login",
    path: "/google-login",
    shell: "public",
    role: "public",
    page: () => GoogleLoginChooserPage(),
    workingStateKey: null,
  },
  ...googleLoginRoutes,
  {
    name: "auth.google-login.complete",
    path: "/google-login/complete",
    shell: "public",
    role: "public",
    page: () => GoogleLoginCompletePage(),
    workingStateKey: null,
  },
];
