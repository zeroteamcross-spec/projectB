import { GoogleLoginChooserPage } from "./pages/googleLoginChooserPage.js";
import { GoogleLoginCompletePage } from "./pages/googleLoginCompletePage.js";
import { GoogleLoginPage } from "./pages/googleLoginPage.js";
import { RoleSpecificLoginPage } from "./pages/roleSpecificLoginPage.js";
import { googleLoginService } from "./services/googleLoginService.js";
import { roleSpecificLoginService } from "./services/roleSpecificLoginService.js";
import { getLastViewedShowroomPath } from "../../utils/lastViewedShowroom.js";

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
  // Buyer arrives here with no slug of its own (unlike the showroom-scoped
  // /s/:slug/login route) whenever they reached this page from somewhere
  // that isn't a showroom catalog anymore -- the plain landing page, a
  // bookmark, a fresh tab. getLastViewedShowroomPath() recalls whichever
  // showroom they were actually last browsing, if any, so there's still a
  // way back instead of stranding them on the generic login screen.
  page: () => GoogleLoginPage({
    roleSlug: config.slug,
    ...(config.slug === "buyer" ? (() => {
      const path = getLastViewedShowroomPath();
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
