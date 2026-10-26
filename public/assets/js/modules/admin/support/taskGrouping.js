const GROUP_DEFINITIONS = [
  {
    key: "account-access",
    label: "Akun & Akses",
    numbers: [1, 44],
    keywords: ["akses", "login", "google", "akun"],
  },
  {
    key: "showroom-inspection",
    label: "Inspeksi Showroom",
    numbers: [2, 20, 21, 22, 31, 33, 36, 39],
    keywords: ["inspeksi", "inspection", "paten"],
  },
  {
    key: "notifications",
    label: "Notifikasi",
    numbers: [3, 17, 47],
    keywords: ["notifikasi", "notification"],
  },
  {
    key: "admin-master-data",
    label: "Master Data Admin",
    numbers: [4, 6, 7, 9, 13, 52, 54],
    keywords: ["master brand", "master lokasi", "master data", "master location"],
  },
  {
    key: "buyer-transactions",
    label: "Buyer & Transaksi",
    numbers: [5, 45, 46, 48, 49, 53],
    keywords: ["buyer", "transaksi", "booking", "pembayaran transaksi"],
  },
  {
    key: "admin-configuration",
    label: "Admin & Konfigurasi",
    numbers: [8, 11, 12, 15, 50],
    keywords: ["admin", "dashboard", "konfigurasi", "slider"],
  },
  {
    key: "showroom-subscription",
    label: "Langganan & Pembayaran Showroom",
    numbers: [10, 14, 16, 19],
    keywords: ["langganan", "subscription", "paket showroom", "virtual account"],
  },
  {
    key: "showroom-registration",
    label: "Pendaftaran Showroom",
    numbers: [18, 24, 28, 43, 59],
    keywords: ["daftar showroom", "pendaftaran showroom", "registrasi showroom", "slug showroom"],
  },
  {
    key: "marketing",
    label: "Marketing & Komisi",
    numbers: [23, 25, 38, 55],
    keywords: ["marketing", "affiliate", "komisi", "prospek"],
  },
  {
    key: "landing-legal",
    label: "Landing & Legal",
    numbers: [26, 27, 40, 41, 42, 57, 58],
    keywords: ["landingpage", "landing page", "syarat", "privasi", "header", "favicon"],
  },
  {
    key: "cars-catalog",
    label: "Mobil & Katalog",
    numbers: [29, 30, 32, 34, 35, 37, 51, 56],
    keywords: ["mobil", "katalog", "listing", "foto mobil", "lokasi katalog"],
  },
];

const GROUP_BY_NUMBER = new Map(
  GROUP_DEFINITIONS.flatMap((definition) => definition.numbers.map((number) => [number, definition]))
);

export function groupTasks(tasks = []) {
  const groups = [];
  const groupsByKey = new Map();

  tasks.forEach((task) => {
    const definition = definitionForTask(task);
    let group = groupsByKey.get(definition.key);

    if (!group) {
      group = {
        key: definition.key,
        label: definition.label,
        tasks: [],
      };
      groupsByKey.set(group.key, group);
      groups.push(group);
    }

    group.tasks.push(task);
  });

  return groups.map((group) => ({
    ...group,
    total: group.tasks.length,
    pending: group.tasks.filter((task) => (task.work_status || "pending") === "pending").length,
    done: group.tasks.filter((task) => task.work_status === "done").length,
    sip: group.tasks.filter((task) => task.status === "sip").length,
  }));
}

export function taskGroupFor(task = {}) {
  const definition = definitionForTask(task);
  return { key: definition.key, label: definition.label };
}

function definitionForTask(task) {
  const taskNumber = extractRequestNumber(task.task_key);
  const explicit = taskNumber ? GROUP_BY_NUMBER.get(taskNumber) : null;
  if (explicit) {
    return explicit;
  }

  const searchable = normalize(`${task.task_key || ""} ${task.title || ""} ${task.description || ""}`);
  return GROUP_DEFINITIONS.find((definition) => definition.keywords.some((keyword) => searchable.includes(normalize(keyword))))
    || { key: "other", label: "Lainnya" };
}

function extractRequestNumber(taskKey) {
  const match = String(taskKey || "").match(/(?:^|-)request-(\d+)(?:-|$)/i);
  return match ? Number(match[1]) : null;
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
