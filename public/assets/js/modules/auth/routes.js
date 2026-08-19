import { GoogleLoginChooserPage } from "./pages/googleLoginChooserPage.js";
import { GoogleLoginCompletePage } from "./pages/googleLoginCompletePage.js";
import { GoogleLoginPage } from "./pages/googleLoginPage.js";
import { RoleSpecificLoginPage } from "./pages/roleSpecificLoginPage.js";
import { googleLoginService } from "./services/googleLoginService.js";
import { roleSpecificLoginService } from "./services/roleSpecificLoginService.js";
import { getLastViewedShowroomPath, showroomPathFromRedirect } from "../../utils/lastViewedShowroom.js";

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
  // that path is showroom-scoped whenever the visitor was anywhere under a
  // showroom (not just its bare catalog root -- car detail, checkout, any
  // buyer-only page). showroomPathFromRedirect() reads that first;
  // getLastViewedShowroomPath() (localStorage) only fills the remaining gap
  // where `from` itself isn't showroom-scoped.
  page: (context) => GoogleLoginPage({
    roleSlug: config.slug,
    ...(config.slug === "buyer" ? (() => {
      const path = showroomPathFromRedirect(context?.query?.from) || getLastViewedShowroomPath();
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
