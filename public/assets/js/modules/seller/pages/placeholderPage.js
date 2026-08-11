import { createPageLifecycle } from "../../../core/lifecycle.js";
import { Card } from "../../../ui/composites/card.js";
import { SectionHeader } from "../../../ui/composites/sectionHeader.js";
import { Button } from "../../../ui/primitives/button.js";
import { tw } from "../../../ui/theme/tailwindClasses.js";

export function SellerPlaceholderPage({ title = "Showroom", description = "" } = {}) {
  let root = null;

  return createPageLifecycle({
    mount({ router }) {
      root = document.createElement("div");
      render(root, router, title, description);
      return root;
    },
    hydrate({ router }) {
      render(root, router, title, description);
    },
  });
}

function render(root, router, title, description) {
  if (!root) {
    return;
  }

  const heading = document.createElement("h2");
  heading.className = tw.text.sectionTitle;
  heading.textContent = "Fondasi route sudah siap";

  const text = document.createElement("p");
  text.className = `mt-2 text-xs ${tw.text.muted}`;
  text.textContent = "Halaman ini disiapkan sebagai entry point showroom berikutnya tanpa membangun seluruh modul showroom sekaligus.";

  const content = document.createElement("div");
  content.append(heading, text);

  root.replaceChildren(
    SectionHeader({
      title,
      description,
      action: Button({ label: "Kembali ke dashboard", variant: "secondary", onClick: () => router?.navigate("/seller") }),
    }),
    Card(content)
  );
}
