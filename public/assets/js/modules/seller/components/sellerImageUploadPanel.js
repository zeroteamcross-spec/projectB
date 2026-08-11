import { Card } from "../../../ui/composites/card.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { tw } from "../../../ui/theme/tailwindClasses.js";

export function SellerImageUploadPanel({
  uploading = false,
  error = "",
  onFilesChange = null,
} = {}) {
  const section = document.createElement("section");
  section.id = "slri_upload_section";
  section.className = "min-w-0";
  section.setAttribute("data-ds", "seller.images.upload");

  const form = document.createElement("form");
  form.className = "grid gap-4";
  form.id = "slri_upload_form_section";

  const copyPanel = document.createElement("section");
  copyPanel.id = "slri_upload_dropzone_section";
  copyPanel.className = "grid min-w-0 content-start gap-4 rounded-[var(--pb-radius-xl)] border border-dashed border-[color-mix(in_srgb,var(--pb-brand-primary)_34%,white)] bg-[color-mix(in_srgb,var(--pb-brand-primary)_7%,white)] p-4";

  const titleRow = document.createElement("div");
  titleRow.className = "flex min-w-0 items-start gap-3";
  const iconWrap = document.createElement("span");
  iconWrap.className = "grid h-11 w-11 shrink-0 place-items-center rounded-[var(--pb-radius-xl)] bg-white text-[var(--pb-brand-secondary)] shadow-[var(--pb-shadow-soft)]";
  iconWrap.append(createIcon("upload", { className: "h-5 w-5" }));
  const titleCopy = document.createElement("div");
  titleCopy.className = "min-w-0";
  const title = document.createElement("h2");
  title.className = tw.text.sectionTitle;
  title.textContent = "Upload gambar";
  const helper = document.createElement("p");
  helper.className = `mt-1 text-xs leading-6 ${tw.text.muted}`;
  helper.textContent = "Pilih satu atau beberapa foto mobil. JPG, PNG, atau WebP sampai 5 MB per gambar.";
  titleCopy.append(title, helper);
  titleRow.append(iconWrap, titleCopy);

  const errorNode = document.createElement("p");
  errorNode.className = "rounded-lg border border-[color-mix(in_srgb,var(--pb-danger)_26%,white)] bg-[color-mix(in_srgb,var(--pb-danger)_8%,white)] px-3 py-2 text-xs font-medium text-[color-mix(in_srgb,var(--pb-danger)_84%,black)]";
  errorNode.textContent = error;
  errorNode.hidden = !error;

  const label = document.createElement("label");
  label.className = `${tw.form.label} rounded-[var(--pb-radius-xl)] border border-white/80 bg-white/80 p-3 shadow-[var(--pb-shadow-soft)]`;
  label.append(document.createTextNode("Pilih gambar"));
  const input = document.createElement("input");
  input.id = "slri_upload_image_input";
  input.name = "image";
  input.type = "file";
  input.accept = "image/*";
  input.multiple = true;
  input.className = `${tw.form.control} max-h-none cursor-pointer file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--pb-btn-secondary-bg)] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[var(--pb-btn-secondary-text)]`;
  input.addEventListener("change", () => {
    onFilesChange?.(input.files ?? []);
    input.value = "";
  });
  label.append(input);

  const checklist = document.createElement("section");
  checklist.id = "slri_upload_guidance_section";
  checklist.className = "grid gap-2 text-xs text-[var(--pb-text-strong)]";
  checklist.append(
    guidanceItem("camera", "Gunakan foto eksterior/interior yang terang."),
    guidanceItem("star", "Tandai salah satu foto sebagai cover bila perlu."),
    guidanceItem("image", "Thumbnail dan status upload tampil per file.")
  );

  copyPanel.append(titleRow, errorNode, label, checklist);

  form.append(copyPanel);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
  });

  section.append(Card(form, { className: "p-3 md:p-4" }));
  return section;
}

function guidanceItem(icon, text) {
  const item = document.createElement("div");
  item.className = "flex min-w-0 items-center gap-2";
  item.append(createIcon(icon, { className: "h-4 w-4 shrink-0 text-[var(--pb-brand-secondary)]" }), document.createTextNode(text));
  return item;
}
