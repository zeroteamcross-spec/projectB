import { GoogleLoginChooserPage } from "./pages/googleLoginChooserPage.js";
import { GoogleLoginCompletePage } from "./pages/googleLoginCompletePage.js";
import { GoogleLoginPage } from "./pages/googleLoginPage.js";
import { RoleSpecificLoginPage } from "./pages/roleSpecificLoginPage.js";
import { googleLoginService } from "./services/googleLoginService.js";
import { roleSpecificLoginService } from "./services/roleSpecificLoginService.js";

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
  page: () => GoogleLoginPage({ roleSlug: config.slug }),
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
