// Shared data shapes for AstraVoice (Merchant & Sales Teammate)

export type PaymentMode = "paypal_qr" | "paypal_later" | "cash";
export type SupportedLanguage = "mr-IN" | "hi-IN" | "en-IN";

export type SpokenForms = { one: string; many: string; short: string };

export type SaleItem = {
  sku: string;
  name: string;
  brand?: string;
  unit?: string;
  qty: number;
  unit_price: number;
  spoken?: SpokenForms;
};

export type Sale = {
  items: SaleItem[];
  currency: string; // INR by default
  total: number;
  payment_mode: PaymentMode;
  payer_email?: string;
  payer_name?: string;
};

export type CatalogItem = {
  sku: string;
  name: string;
  brand?: string;
  unit?: string;
  aliases: string[];
  price: number; // INR base price
  spoken?: SpokenForms;
  paypal_product_id?: string;
  category?: "tea" | "mandi" | "kirana" | "pharmacy" | "hardware" | "services" | string;
};

export type InvoiceStatus =
  | "DRAFT" | "SENT" | "UNPAID" | "PAYMENT_PENDING" | "PAID" | "MARKED_AS_PAID"
  | "CANCELLED" | "REFUNDED" | "PARTIALLY_PAID" | "MARKED_AS_REFUNDED" | "PARTIALLY_REFUNDED" | "SCHEDULED";

export type LedgerRow = {
  invoice_id: string;
  time: string;
  items: { name: string; brand?: string; qty: number; unit_price: number }[];
  total: number;
  currency: string;
  method: "PAYPAL" | "CASH"; // PAYPAL represents Paytm UPI QR in compatible schema
  status: InvoiceStatus;
  payer?: string;
  curated?: boolean;
  later?: boolean;
  payer_email?: string;
  switch_code?: "00" | "U30" | "U66";
  checksum_hash?: string;
  settlement_state?: "SETTLED" | "PENDING_SWITCH_U30" | "KAVACH_RESCUED";
};

export type CreatedInvoice = {
  invoice_id: string;
  payer_url: string;
  total: number;
  currency: string;
};
