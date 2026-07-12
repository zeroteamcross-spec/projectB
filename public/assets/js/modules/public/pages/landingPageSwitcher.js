import { currentLandingPageName, resolveLandingPageOption } from "../landingPageRegistry.js";

export function LandingPageSwitcher() {
  let activePage = null;
  let activeName = "";

  const ensurePage = () => {
    const nextName = currentLandingPageName();
    if (activePage && activeName === nextName) {
      return activePage;
    }

    activePage?.dispose?.();
    const option = resolveLandingPageOption(nextName);
    activeName = option.name;
    activePage = option.page();
    return activePage;
  };

  return {
    async bootstrap(context) {
      await ensurePage()?.bootstrap?.(contextForSelectedPage(context));
    },
    mount(context) {
      return ensurePage()?.mount?.(contextForSelectedPage(context));
    },
    hydrate(context) {
      return ensurePage()?.hydrate?.(contextForSelectedPage(context));
    },
    bindEvents(context) {
      return ensurePage()?.bindEvents?.(contextForSelectedPage(context));
    },
    unmount(context) {
      return activePage?.unmount?.(contextForSelectedPage(context));
    },
    dispose(context) {
      const selectedContext = contextForSelectedPage(context);
      activePage?.dispose?.(selectedContext);
      activePage = null;
      activeName = "";
    },
  };
}

function contextForSelectedPage(context = {}) {
  const option = resolveLandingPageOption(currentLandingPageName());
  return {
    ...context,
    name: option.name,
    path: option.path,
    route: {
      ...(context.route ?? {}),
      name: option.name,
      path: option.path,
      shell: "public",
      role: "public",
      workingStateKey: option.name === "public.catalog-alias" ? "publicCatalog" : null,
    },
  };
}
