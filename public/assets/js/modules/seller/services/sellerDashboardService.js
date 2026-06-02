export const sellerDashboardService = {
  summarize({ showroom = null, cars = [], transactions = [] } = {}) {
    const publishedCars = cars.filter((car) => car.listing_status === "published").length;
    const draftCars = cars.filter((car) => car.listing_status !== "published").length;
    const completedInspection = cars.filter((car) => car.inspection_summary_status === "completed").length;
    const pendingTransactions = transactions.filter((transaction) => {
      const status = transaction.status ?? transaction.transaction_status;
      return ["pending_payment", "dp_paid"].includes(status);
    }).length;

    return {
      showroomName: showroom?.name ?? "Showroom belum dilengkapi",
      showroomReady: Boolean(showroom?.name && showroom?.phone_number),
      totalCars: cars.length,
      publishedCars,
      draftCars,
      completedInspection,
      pendingTransactions,
      totalTransactions: transactions.length,
    };
  },
};
