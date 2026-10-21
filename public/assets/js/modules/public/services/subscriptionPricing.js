/** Shared public-package rules for landing cards and showroom registration. */
export function activeSubscriptionPlans(plans = []) {
  return (Array.isArray(plans) ? plans : [])
    .filter((plan) => (plan?.status ?? "active") === "active")
    .sort((left, right) => Number(left?.price ?? 0) - Number(right?.price ?? 0));
}

export function selectedSubscriptionPlan(plans = [], requestedName = "") {
  const requested = String(requestedName ?? "").trim().toLocaleLowerCase("id-ID");
  if (!requested) {
    return null;
  }

  return activeSubscriptionPlans(plans).find((plan) =>
    String(plan?.name ?? "").trim().toLocaleLowerCase("id-ID") === requested
  ) ?? null;
}

export function registrationPackageUrl(path, plan) {
  const base = String(path ?? "");
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}paket=${encodeURIComponent(String(plan?.name ?? ""))}`;
}
