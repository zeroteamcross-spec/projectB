export { Button } from "../ui/primitives/button.js";
export { Badge } from "../ui/primitives/badge.js";
export { EmptyState } from "../ui/primitives/emptyState.js";
export { Skeleton } from "../ui/primitives/skeleton.js";
export { openModal, closeModal, bindModal } from "../ui/primitives/modal.js";
export { showToast, bindToastContainer } from "../ui/primitives/toast.js";

export function fieldValue(form, name) {
  return new FormData(form).get(name);
}

export function formToObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

export function setFormErrors(form, errors = {}) {
  form.querySelectorAll("[data-error-for]").forEach((node) => {
    node.textContent = errors[node.dataset.errorFor] ?? "";
  });
}
