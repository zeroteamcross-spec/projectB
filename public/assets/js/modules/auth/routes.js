import { RoleSpecificLoginPage } from "./pages/roleSpecificLoginPage.js";
import { roleSpecificLoginService } from "./services/roleSpecificLoginService.js";

export const authRoutes = roleSpecificLoginService.routes().map((config) => ({
  name: `auth.login.${config.slug}`,
  path: `/login/${config.slug}`,
  shell: "public",
  role: "public",
  page: () => RoleSpecificLoginPage({ roleSlug: config.slug }),
  workingStateKey: null,
}));
