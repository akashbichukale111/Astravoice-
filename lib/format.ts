export function formatMoney(amount: number, currency: string = "INR"): string {
  const cur = currency === "USD" || currency === "EUR" ? currency : "INR";
  return new Intl.NumberFormat(cur === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency: cur,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}

/** The Books header line: "3 paid sales · ₹3,004" */
export function paidSalesHeader(count: number, total: number): string {
  return `${count} paid ${count === 1 ? "sale" : "sales"} · ${formatMoney(total, "INR")}`;
}

export function formatElapsed(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  if (total < 60) return `${total} s`;
  return `${Math.floor(total / 60)} min ${total % 60} s`;
}

export function saidToDoneRow(saidAt?: number, doneAt?: number): string | null {
  if (saidAt === undefined || doneAt === undefined || doneAt < saidAt) return null;
  return `said → done ${formatElapsed((doneAt - saidAt) / 1000)} (Paytm Dynamic QR verified)`;
}
