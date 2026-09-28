/**
 * Banyak page.js men-subscribe appStore lalu melakukan full re-render
 * (root.replaceChildren(...)) pada SETIAP patchState, termasuk yang berasal
 * dari state lain sama sekali (mis. app.release dari polling versi, atau
 * ui.toasts dari notifikasi). Re-render itu menghancurkan & membuat ulang
 * elemen DOM, termasuk input yang sedang difokus user -- makanya fokus &
 * kursor hilang di tengah mengetik. StateEngine.emit() adalah satu-satunya
 * titik yang dilewati semua listener itu, jadi fokus di-capture di sana
 * (generik untuk semua page, bukan per-halaman).
 */
export function captureFocus(root = document) {
  const active = root.activeElement;
  const isTextLike = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement;
  if (!isTextLike || !active.id) {
    return () => {};
  }

  const id = active.id;
  let selectionStart = null;
  let selectionEnd = null;
  try {
    selectionStart = active.selectionStart;
    selectionEnd = active.selectionEnd;
  } catch {
    // Beberapa tipe input (number, email, dll di browser tertentu) melempar
    // saat selectionStart/End diakses -- abaikan, fokus tetap direstore.
  }

  return function restoreFocus() {
    if (active.isConnected) {
      // Elemen lama masih ada di DOM -- tidak ada listener yang me-replace-nya,
      // tidak perlu apa-apa.
      return;
    }

    const next = document.getElementById(id);
    const isNextTextLike = next instanceof HTMLInputElement || next instanceof HTMLTextAreaElement;
    if (!isNextTextLike) {
      return;
    }

    next.focus({ preventScroll: true });
    if (selectionStart !== null && selectionEnd !== null) {
      try {
        next.setSelectionRange(selectionStart, selectionEnd);
      } catch {
        // sama seperti di atas -- tipe input yang tidak mendukung selection range.
      }
    }
  };
}
