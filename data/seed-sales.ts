// Curated Kirana & Market Sales History for AstraVoice (Merchant & Sales Teammate)
export type SeedSale = { items: [sku: string, qty: number][]; method: "PAYPAL" | "CASH"; pendingSwitch?: boolean };

export const SEED_TODAY: SeedSale[] = [
  { items: [["sugar-1kg", 1], ["tea-waghbakri-250g", 2], ["jaggery-kolhapur-1kg", 2], ["oil-gemini-1l", 1]], method: "PAYPAL", pendingSwitch: true }, // ₹537 hero case!
  { items: [["oil-gemini-1l", 4], ["sugar-1kg", 5]], method: "PAYPAL" }, // ₹790
  { items: [["atta-aashirvaad-5kg", 2], ["tur-dal-1kg", 1]], method: "PAYPAL" }, // ₹640
  { items: [["oil-gemini-1l", 3], ["sugar-1kg", 6]], method: "CASH" }, // ₹687
  { items: [["rice-indrayani-1kg", 4], ["jaggery-kolhapur-1kg", 2]], method: "PAYPAL" }, // ₹430
  { items: [["tea-waghbakri-250g", 3], ["biscuit-parleg", 4]], method: "CASH" }, // ₹450
];

export const SEED_LAST_SATURDAY: SeedSale[] = [
  { items: [["sugar-1kg", 4], ["oil-gemini-1l", 2]], method: "PAYPAL" },
  { items: [["tea-waghbakri-250g", 3]], method: "CASH" },
  { items: [["atta-aashirvaad-5kg", 2]], method: "PAYPAL" },
  { items: [["jaggery-kolhapur-1kg", 3], ["rice-indrayani-1kg", 2]], method: "PAYPAL" },
];

export const SEED_PAY_LATER = { sku: "atta-aashirvaad-5kg", qty: 1, name: "Ramesh Dada" };
