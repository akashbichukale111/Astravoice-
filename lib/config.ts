// Single place for environment-driven settings (Paytm Sandbox, Sarvam AI, Gemini, Currency, Timezone).

export type AppConfig = {
  paytmMid: string;
  paytmMerchantKey: string;
  paytmApiBase: string;
  paytmUpiVpa: string;
  sarvamApiKey: string;
  sarvamSpeaker: string;
  geminiModel: string;
  geminiFallbackModel: string;
  defaultCurrency: string;
  demoFxUsdEur: number;
  sellerName: string;
  demoMode: boolean;
  timezone: string;
};

export function getConfig(): AppConfig {
  return {
    paytmMid: process.env.PAYTM_MID || "DIY12386817555501617",
    paytmMerchantKey: process.env.PAYTM_MERCHANT_KEY || "bKMfNxPPf_QdZppa",
    paytmApiBase: process.env.PAYTM_API_BASE || "https://securegw-stage.paytm.in",
    paytmUpiVpa: process.env.PAYTM_UPI_VPA || "astravoice.kirana@paytm",
    sarvamApiKey: process.env.SARVAM_API_KEY || "",
    sarvamSpeaker: process.env.SARVAM_DEFAULT_SPEAKER || "meera",
    geminiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    geminiFallbackModel: process.env.GEMINI_FALLBACK_MODEL || "gemini-2.0-flash",
    defaultCurrency: process.env.DEFAULT_CURRENCY || "INR",
    demoFxUsdEur: Number(process.env.DEMO_FX_USD_EUR || "1"),
    sellerName: process.env.SELLER_NAME || "AstraVoice (Merchant & Sales Teammate)",
    demoMode: process.env.DEMO_MODE !== "false",
    timezone: process.env.STALL_TIMEZONE || "Asia/Kolkata",
  };
}
