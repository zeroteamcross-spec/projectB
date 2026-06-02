import { EmptyState } from "../primitives/emptyState.js";

export function DataTable({
  shellId = "",
  title = "",
  subtitle = "",
  icon = null,
  columns = [],
  rows = [],
  loading = false,
  emptyTitle = "Data tabel belum tersedia",
  emptyDescription = "",
  mobileMode = "stack",
  mobilePrimaryFields = null,
  mobileDisclosureFields = null,
  mobileDisclosureButtonLabel = "Lihat detail",
  mobileDisclosureCloseLabel = "Sembunyikan",
  mobileCardTitle = null,
  mobileCardSubtitle = null,
  mobileCardBadges = null,
  mobileCardFields = null,
  mobileCardActions = null,
  mobileCardId = null,
  tableMinWidth = "min-w-[960px]",
  shellClassName = "",
  headClassName = "",
  scrollClassName = "",
  tableClassName = "",
  rowClassName = null,
  getRowKey = null,
  pagination = null,
} = {}) {
  const shell = document.createElement("section");
  if (shellId) {
    shell.id = shellId;
  }
  shell.className = [
    "overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/86 shadow-[0_22px_70px_rgba(15,23,42,0.09)] backdrop-blur-xl",
    shellClassName,
  ].filter(Boolean).join(" ");

  if (title || subtitle || icon) {
    const head = document.createElement("div");
    head.className = [
      "flex flex-col gap-4 border-b border-[var(--pb-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(255,247,237,0.76))] px-4 py-4 sm:px-5",
      headClassName,
    ].filter(Boolean).join(" ");

    const top = document.createElement("div");
    top.className = "flex flex-col gap-3";

    const titleWrap = document.createElement("div");
    titleWrap.className = "flex min-w-0 items-center gap-3";
    if (icon) {
      titleWrap.append(icon);
    }
    titleWrap.append(textWrap(title, subtitle));
    top.append(titleWrap);

    head.append(top);
    shell.append(head);
  }

  if (loading) {
    shell.append(createTableLoadingState(columns.length || 4));
    return shell;
  }

  if (!rows.length) {
    const empty = EmptyState({
      title: emptyTitle,
      description: emptyDescription,
    });
    empty.classList.add("m-4");
    shell.append(empty);
    return shell;
  }

  const mobile = document.createElement("div");
  if (mobileMode === "stack") {
    mobile.className = "grid gap-3 p-3 md:hidden";
    rows.forEach((row, index) => {
      mobile.append(createMobileCard({
        row,
        rowKey: getRowKey?.(row) ?? index,
        title: mobileCardTitle?.(row) ?? "",
        subtitle: mobileCardSubtitle?.(row) ?? "",
        badges: mobileCardBadges?.(row) ?? [],
        fields: mobileCardFields?.(row) ?? [],
        actions: mobileCardActions?.(row) ?? null,
        id: mobileCardId?.(row) ?? "",
      }));
    });
  } else if (mobileMode === "disclosure") {
    mobile.className = "grid gap-3 p-3 md:hidden";
    rows.forEach((row, index) => {
      mobile.append(createMobileDisclosureRow({
        rowKey: getRowKey?.(row) ?? index,
        title: mobileCardTitle?.(row) ?? "",
        subtitle: mobileCardSubtitle?.(row) ?? "",
        badges: mobileCardBadges?.(row) ?? [],
        primaryFields: mobilePrimaryFields?.(row) ?? [],
        disclosureFields: mobileDisclosureFields?.(row) ?? [],
        actions: mobileCardActions?.(row) ?? null,
        id: mobileCardId?.(row) ?? "",
        buttonLabel: mobileDisclosureButtonLabel,
        closeLabel: mobileDisclosureCloseLabel,
      }));
    });
  } else {
    mobile.className = "grid gap-2 border-b border-[var(--pb-border)] bg-white/72 px-3 py-3 md:hidden";
    mobile.append(
      textNode("p", "text-[11px] font-black uppercase tracking-[0.14em] text-gray-500", "Geser tabel untuk melihat semua kolom"),
    );
  }

  const desktop = document.createElement("div");
  desktop.className = mobileMode === "stack"
    ? (`hidden md:block ${scrollClassName}`.trim() || "hidden md:block")
    : (scrollClassName.trim() || "");
  desktop.classList.add("overflow-x-auto");

  const table = document.createElement("table");
  table.className = [
    "w-full border-collapse text-left text-sm",
    tableMinWidth,
    tableClassName,
  ].filter(Boolean).join(" ");

  table.append(createTableHead(columns), createTableBody({
    columns,
    rows,
    rowClassName,
    getRowKey,
  }));

  desktop.append(table);
  shell.append(mobile, desktop);

  if (pagination) {
    const paginationWrap = document.createElement("div");
    paginationWrap.className = "border-t border-[var(--pb-border)] bg-[linear-gradient(180deg,rgba(255,249,245,0.96),rgba(255,255,255,0.96))] px-3 py-3 sm:px-4 sm:py-4";
    paginationWrap.append(pagination);
    shell.append(paginationWrap);
  }

  return shell;
}

export function DataTablePagination({
  page = 1,
  totalPages = 1,
  totalItems = null,
  perPage = null,
  pageSizeOptions = [10, 20, 50, 100],
  itemLabel = "item",
  onChange = null,
  onPerPageChange = null,
  onJump = null,
  buttonIds = {},
  inputIds = {},
} = {}) {
  if (!Number.isFinite(totalItems) || !Number.isFinite(perPage)) {
    return null;
  }

  const wrap = document.createElement("div");
  wrap.className = "grid gap-3 rounded-[1.35rem] border border-orange-100/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(255,247,237,0.90),rgba(239,246,255,0.82))] p-3 shadow-sm sm:p-4";

  const meta = document.createElement("div");
  meta.className = "grid gap-1";
  meta.append(
    textNode("p", "text-[11px] font-black uppercase tracking-[0.16em] text-gray-500", "Pagination"),
    textNode("p", "text-sm font-semibold text-gray-700", buildPaginationLabel({ page, totalPages, totalItems, perPage, itemLabel })),
  );

  const top = document.createElement("div");
  top.className = "flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between";

  const tools = document.createElement("div");
  tools.className = "flex flex-wrap items-center gap-2";
  const sizeLabel = textNode("label", "inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-500", "Rows");
  const sizeSelect = document.createElement("select");
  sizeSelect.className = "min-h-10 rounded-full border border-[var(--pb-border)] bg-white px-3 text-sm font-semibold text-gray-700 shadow-sm";
  if (inputIds.perPage) {
    sizeSelect.id = inputIds.perPage;
  }
  pageSizeOptions.forEach((option) => {
    const node = document.createElement("option");
    node.value = String(option);
    node.textContent = String(option);
    node.selected = Number(option) === Number(perPage);
    sizeSelect.append(node);
  });
  sizeSelect.addEventListener("change", () => onPerPageChange?.(Number(sizeSelect.value)));
  sizeLabel.append(sizeSelect);
  tools.append(sizeLabel, createPaginationSummaryPill(page, totalPages));
  top.append(meta, tools);

  const controls = document.createElement("div");
  controls.className = "flex flex-wrap items-center gap-2";

  const previous = createPaginationButton({
    label: "Previous",
    disabled: page <= 1,
    onClick: () => onChange?.(page - 1),
    id: buttonIds.previous ?? "",
  });

  const pagePill = createPaginationSummaryPill(page, totalPages);

  buildPageWindow({ page, totalPages }).forEach((item) => {
    if (item === "...") {
      controls.append(textNode("span", "px-1 text-sm font-bold text-gray-400", "..."));
      return;
    }
    const pageButton = createPaginationButton({
      label: String(item),
      disabled: Number(item) === Number(page),
      onClick: () => onChange?.(Number(item)),
      id: typeof buttonIds.page === "function"
        ? buttonIds.page(Number(item), Number(item) === Number(page))
        : "",
    });
    pageButton.className = `inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border px-3 text-sm font-semibold shadow-sm transition ${
      Number(item) === Number(page)
        ? "border-transparent bg-[linear-gradient(135deg,var(--pb-btn-primary-from),var(--pb-btn-primary-to))] text-white"
        : "border-[var(--pb-border-strong)] bg-white/82 text-gray-700 hover:-translate-y-0.5 hover:bg-white"
    }`;
    pageButton.disabled = Number(item) === Number(page);
    controls.append(pageButton);
  });

  const next = createPaginationButton({
    label: "Next",
    disabled: page >= totalPages,
    onClick: () => onChange?.(page + 1),
    id: buttonIds.next ?? "",
  });

  const jumpWrap = document.createElement("div");
  jumpWrap.className = "flex flex-wrap items-center gap-2";
  const jumpLabel = textNode("label", "inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-500", "Jump");
  const jumpInput = document.createElement("input");
  jumpInput.type = "number";
  jumpInput.min = "1";
  jumpInput.max = String(Math.max(1, totalPages));
  jumpInput.value = String(page);
  jumpInput.className = "min-h-10 w-20 rounded-full border border-[var(--pb-border)] bg-white px-3 text-sm font-semibold text-gray-700 shadow-sm";
  if (inputIds.jump) {
    jumpInput.id = inputIds.jump;
  }
  const jumpButton = createPaginationButton({
    label: "Go",
    disabled: totalPages <= 1,
    onClick: () => onJump?.(clampPage(Number(jumpInput.value), totalPages)),
    id: buttonIds.jump ?? "",
  });
  jumpLabel.append(jumpInput);
  jumpWrap.append(jumpLabel, jumpButton);

  controls.prepend(previous);
  controls.append(pagePill, next);
  wrap.append(top, controls, jumpWrap);
  return wrap;
}

function createTableHead(columns) {
  const thead = document.createElement("thead");
  thead.className = "bg-gray-50/80 text-[11px] font-black uppercase tracking-[0.14em] text-gray-500";

  const row = document.createElement("tr");
  columns.forEach((column) => {
    const th = document.createElement("th");
    th.className = column.headerClassName ?? "border-b border-[var(--pb-border)] px-4 py-3";
    th.textContent = column.label;
    row.append(th);
  });

  thead.append(row);
  return thead;
}

function createTableBody({ columns, rows, rowClassName, getRowKey }) {
  const tbody = document.createElement("tbody");

  rows.forEach((row, index) => {
    const tr = document.createElement("tr");
    const classes = typeof rowClassName === "function"
      ? rowClassName(row, index)
      : rowClassName;
    tr.className = [
      "group border-b border-[var(--pb-border)] transition duration-150 last:border-b-0 hover:bg-orange-50/45",
      classes || "bg-white/55",
    ].filter(Boolean).join(" ");

    const rowKey = getRowKey?.(row) ?? index;
    tr.dataset.rowKey = String(rowKey);

    columns.forEach((column) => {
      const td = document.createElement("td");
      td.className = column.cellClassName ?? "px-4 py-4 align-top";
      const content = column.render ? column.render(row, index) : row[column.key] ?? "";
      td.append(content instanceof Node ? content : document.createTextNode(String(content)));
      tr.append(td);
    });

    tbody.append(tr);
  });

  return tbody;
}

function createMobileCard({ rowKey, title, subtitle, badges, fields, actions, id = "" }) {
  const card = document.createElement("section");
  if (id) {
    card.id = id;
  }
  card.className = "grid gap-4 rounded-[1.5rem] border border-white/80 bg-white/88 p-4 shadow-sm";
  card.dataset.rowKey = String(rowKey);

  const top = document.createElement("div");
  top.className = "grid gap-3";

  const copy = document.createElement("div");
  copy.className = "grid gap-1";
  copy.append(
    textNode("p", "break-words text-base font-black text-gray-950", title),
    textNode("p", "break-words text-sm text-gray-500", subtitle),
  );
  top.append(copy);

  if (Array.isArray(badges) && badges.length) {
    const badgeWrap = document.createElement("div");
    badgeWrap.className = "flex flex-wrap gap-2";
    badges.filter(Boolean).forEach((badge) => badgeWrap.append(badge));
    top.append(badgeWrap);
  }

  card.append(top);

  if (Array.isArray(fields) && fields.length) {
    const facts = document.createElement("div");
    facts.className = "grid gap-2 rounded-[1.25rem] border border-white/80 bg-[var(--pb-surface-inset)] p-3";
    fields.forEach(({ label, value }) => {
      const row = document.createElement("div");
      row.className = "grid gap-1";
      row.append(
        textNode("p", "text-[11px] font-black uppercase tracking-[0.14em] text-gray-500", label),
        value instanceof Node ? value : textNode("p", "break-words text-sm font-semibold text-gray-900", value ?? "-"),
      );
      facts.append(row);
    });
    card.append(facts);
  }

  if (actions) {
    const actionWrap = document.createElement("div");
    actionWrap.className = "flex flex-wrap gap-2";
    if (Array.isArray(actions)) {
      actions.filter(Boolean).forEach((action) => actionWrap.append(action));
    } else {
      actionWrap.append(actions);
    }
    card.append(actionWrap);
  }

  return card;
}

function createMobileDisclosureRow({
  rowKey,
  title,
  subtitle,
  badges,
  primaryFields,
  disclosureFields,
  actions,
  id = "",
  buttonLabel,
  closeLabel,
}) {
  const row = document.createElement("section");
  if (id) {
    row.id = id;
  }
  row.className = "grid gap-3 rounded-[1.5rem] border border-white/80 bg-white/90 p-4 shadow-sm";
  row.dataset.rowKey = String(rowKey);

  const top = document.createElement("div");
  top.className = "grid gap-2";
  top.append(
    textNode("p", "break-words text-base font-black text-gray-950", title),
    textNode("p", "break-words text-sm text-gray-500", subtitle),
  );
  if (Array.isArray(badges) && badges.length) {
    const badgeWrap = document.createElement("div");
    badgeWrap.className = "flex flex-wrap gap-2";
    badges.filter(Boolean).forEach((badge) => badgeWrap.append(badge));
    top.append(badgeWrap);
  }

  const primary = document.createElement("div");
  primary.className = "grid gap-2 rounded-[1.25rem] border border-white/80 bg-[var(--pb-surface-inset)] p-3";
  primaryFields.forEach(({ label, value }) => {
    const item = document.createElement("div");
    item.className = "flex items-start justify-between gap-3";
    item.append(
      textNode("p", "text-[11px] font-black uppercase tracking-[0.14em] text-gray-500", label),
      value instanceof Node ? value : textNode("p", "break-words text-sm font-semibold text-gray-900 text-right", value ?? "-"),
    );
    primary.append(item);
  });

  const disclosure = document.createElement("details");
  disclosure.className = "rounded-[1.25rem] border border-dashed border-[var(--pb-border)] bg-white/70";
  const summary = document.createElement("summary");
  summary.className = "flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 text-sm font-semibold text-gray-700";
  summary.append(
    textNode("span", "inline-flex items-center gap-2", buttonLabel),
    disclosureIcon(),
  );
  disclosure.append(summary);

  const disclosureBody = document.createElement("div");
  disclosureBody.className = "grid gap-2 border-t border-[var(--pb-border)] px-3 py-3";
  disclosureFields.forEach(({ label, value }) => {
    const item = document.createElement("div");
    item.className = "grid gap-1";
    item.append(
      textNode("p", "text-[11px] font-black uppercase tracking-[0.14em] text-gray-500", label),
      value instanceof Node ? value : textNode("p", "break-words text-sm font-semibold text-gray-900", value ?? "-"),
    );
    disclosureBody.append(item);
  });
  disclosureBody.append(textNode("p", "text-xs font-semibold text-gray-500", closeLabel));
  disclosure.append(disclosureBody);

  row.append(top, primary, disclosure);

  if (actions) {
    const actionWrap = document.createElement("div");
    actionWrap.className = "flex flex-wrap gap-2";
    if (Array.isArray(actions)) {
      actions.filter(Boolean).forEach((action) => actionWrap.append(action));
    } else {
      actionWrap.append(actions);
    }
    row.append(actionWrap);
  }

  return row;
}

function createTableLoadingState(columnCount) {
  const wrap = document.createElement("div");
  wrap.className = "grid gap-3 p-4";

  for (let index = 0; index < 4; index += 1) {
    const row = document.createElement("div");
    row.className = "grid gap-3 rounded-[1.25rem] border border-white/80 bg-white/75 p-4 shadow-sm";
    row.style.gridTemplateColumns = `repeat(${Math.max(2, Math.min(columnCount, 5))}, minmax(0, 1fr))`;

    for (let cellIndex = 0; cellIndex < Math.max(2, Math.min(columnCount, 5)); cellIndex += 1) {
      const cell = document.createElement("span");
      cell.className = "h-4 animate-pulse rounded-full bg-[linear-gradient(90deg,rgba(226,232,240,0.95),rgba(255,255,255,0.96),rgba(226,232,240,0.95))]";
      row.append(cell);
    }

    wrap.append(row);
  }

  return wrap;
}

function createPaginationButton({ label, disabled, onClick, id = "" }) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "inline-flex min-h-10 items-center justify-center rounded-full border border-[var(--pb-border-strong)] bg-white/82 px-4 text-sm font-semibold text-gray-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:opacity-45";
  button.disabled = disabled;
  button.textContent = label;
  if (id) {
    button.id = id;
  }
  if (onClick) {
    button.addEventListener("click", onClick);
  }
  return button;
}

function createPaginationSummaryPill(page, totalPages) {
  const pill = document.createElement("span");
  pill.className = "inline-flex min-h-10 items-center rounded-full border border-[var(--pb-border)] bg-white px-4 text-sm font-bold text-gray-700 shadow-sm";
  pill.textContent = `Page ${page} / ${totalPages}`;
  return pill;
}

function buildPaginationLabel({ page, totalPages, totalItems, perPage, itemLabel }) {
  if (Number.isFinite(totalItems) && Number.isFinite(perPage) && perPage > 0) {
    const from = ((page - 1) * perPage) + 1;
    const to = Math.min(page * perPage, totalItems);
    return `${from}-${to} dari ${totalItems} ${itemLabel}`;
  }

  return `Halaman ${page} dari ${totalPages}`;
}

function buildPageWindow({ page, totalPages }) {
  const current = Math.max(1, Number(page || 1));
  const total = Math.max(1, Number(totalPages || 1));
  if (total <= 8) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const edgeCount = 2;
  const siblingCount = 1;
  const items = [];
  const leftEdgeEnd = Math.min(edgeCount, total);
  const rightEdgeStart = Math.max(total - edgeCount + 1, 1);
  const middleStart = Math.max(current - siblingCount, leftEdgeEnd + 1);
  const middleEnd = Math.min(current + siblingCount, rightEdgeStart - 1);

  for (let index = 1; index <= leftEdgeEnd; index += 1) {
    items.push(index);
  }

  if (middleStart > leftEdgeEnd + 1) {
    items.push("...");
  }

  for (let index = middleStart; index <= middleEnd; index += 1) {
    items.push(index);
  }

  if (middleEnd < rightEdgeStart - 1) {
    items.push("...");
  }

  for (let index = rightEdgeStart; index <= total; index += 1) {
    if (!items.includes(index)) {
      items.push(index);
    }
  }

  return items;
}

function clampPage(page, totalPages) {
  if (!Number.isFinite(page)) {
    return 1;
  }

  return Math.max(1, Math.min(totalPages, Math.trunc(page)));
}

function disclosureIcon() {
  const icon = document.createElement("i");
  icon.className = "fa-solid fa-chevron-down text-xs text-gray-500";
  icon.setAttribute("aria-hidden", "true");
  return icon;
}

function textWrap(title, subtitle) {
  const wrap = document.createElement("div");
  wrap.className = "grid min-w-0 gap-0.5";
  wrap.append(
    textNode("p", "text-base font-black text-gray-950", title),
    textNode("p", "text-sm text-gray-500", subtitle),
  );
  return wrap;
}

function textNode(tagName, className, text) {
  const node = document.createElement(tagName);
  node.className = className;
  node.textContent = text ?? "";
  return node;
}
