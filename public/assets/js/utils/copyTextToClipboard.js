export async function copyTextToClipboard(value, {
  clipboard = globalThis.navigator?.clipboard,
  documentRef = globalThis.document,
} = {}) {
  const text = String(value ?? "");

  if (clipboard?.writeText) {
    try {
      await clipboard.writeText(text);
      return true;
    } catch {
      // Clipboard permissions can reject even when the API is present.
      // Fall through to the user-gesture-compatible document copy path.
    }
  }

  if (!documentRef?.body || typeof documentRef.execCommand !== "function") {
    return false;
  }

  const helper = documentRef.createElement("textarea");
  helper.value = text;
  helper.setAttribute("readonly", "");
  helper.style.position = "fixed";
  helper.style.opacity = "0";
  documentRef.body.append(helper);
  try {
    helper.select();
    return Boolean(documentRef.execCommand("copy"));
  } catch {
    return false;
  } finally {
    helper.remove();
  }
}
