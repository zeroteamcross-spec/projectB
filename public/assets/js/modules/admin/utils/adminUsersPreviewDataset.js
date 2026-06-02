const PREVIEW_PENDING_SELLER_COUNT = 160;
const PREVIEW_USER_ID_START = 940000;

export function buildAdminUsersPreviewDataset({ users = [], pendingUsers = [] } = {}) {
  const sellerPendingCount = users.filter((user) => isPendingSeller(user)).length;
  if (sellerPendingCount >= PREVIEW_PENDING_SELLER_COUNT) {
    return { users, pendingUsers };
  }

  const previewUsers = createPreviewPendingSellers(PREVIEW_PENDING_SELLER_COUNT - sellerPendingCount, users);
  const previewPendingUsers = previewUsers.filter((user) => isPendingSeller(user));

  return {
    users: [...users, ...previewUsers],
    pendingUsers: [...pendingUsers, ...previewPendingUsers],
  };
}

function createPreviewPendingSellers(count, users) {
  const reservedIds = new Set(users.map((user) => Number(user?.id)).filter(Number.isFinite));
  const items = [];

  for (let index = 0; index < count; index += 1) {
    const id = nextPreviewId(reservedIds, index);
    const day = String((index % 28) + 1).padStart(2, "0");
    const month = String(((index % 9) + 1)).padStart(2, "0");
    items.push({
      id,
      name: `Preview Seller ${index + 1}`,
      email: `preview-seller-${index + 1}@belimobil.test`,
      phone_number: `0812${String(7000000 + index).padStart(7, "0")}`,
      role: "seller",
      account_status: "pending",
      is_approved: false,
      created_at: `2026-${month}-${day}T08:00:00+07:00`,
      updated_at: `2026-${month}-${day}T10:30:00+07:00`,
      address: `Koridor preview seller ${index + 1}`,
      showroom: {
        name: `Preview Showroom ${index + 1}`,
      },
      is_preview_seed: true,
    });
  }

  return items;
}

function nextPreviewId(reservedIds, index) {
  let candidate = PREVIEW_USER_ID_START + index;
  while (reservedIds.has(candidate)) {
    candidate += 1;
  }
  reservedIds.add(candidate);
  return candidate;
}

function isPendingSeller(user) {
  return user?.role === "seller" && ((user?.account_status ?? "") === "pending" || !user?.is_approved);
}
