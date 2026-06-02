import { profileResource } from "../../resources/profileResource.js";
import { ProfilePage } from "./pages/profilePage.js";

export const profileRoutes = [
  {
    name: "profile.me",
    path: "/profile",
    shell: "app",
    authRequired: true,
    page: ProfilePage,
    workingStateKey: "profilePage",
    preload: {
      working: [
        {
          key: "profile",
          loader: ({ signal }) => profileResource.me({ signal }).catch(() => null),
        },
      ],
    },
  },
];
