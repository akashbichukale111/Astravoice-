# 🚀 AstraVoice (Merchant & Sales Teammate) — Engine 1 of AstraShield

**Paytm Build for India AI Hackathon — Track 3: Autonomous AI Teammates (Team ASTRA)**

AstraVoice is the merchant-facing voice commerce and 60 FPS AG Grid ledger engine of **AstraShield**. A Kirana merchant or farmer-market seller speaks naturally in **Marathi, Hindi, or English** (e.g., *"१ किलो साखर, २ वाघबकरी चहा पावडर पुडे, २ किलो गूळ आणि १ जेमिनी तेल पुडा"*), and AstraVoice:

1. **Matches Custom Brand & Unit Prices (`[+ Add/Edit Kirana Catalog]`):** Looks up exact saved brand prices (₹42 Sugar + 2×₹110 Wagh Bakri Tea + 2×₹65 Kolhapur Jaggery + ₹145 Gemini Oil = **₹537.00**).
2. **Generates Paytm Dynamic UPI QR & `x-checksum` (HMAC SHA-256):** Renders an instant Paytm Dynamic QR with a 1-click **`[⚡ Simulate Paytm Sandbox Payment (₹537)]`** button and **`[⚠️ Simulate Bank U30 Timeout]`** chaos test button for judges.
3. **Speaks Marathi/Hindi Soundbox Confirmation via Sarvam AI (`bulbul:v1` TTS & `saaras:v1` STT):** Announces *"पेटीएम अस्त्रा-शील्ड वर ₹537 प्राप्त झाले!"* with automatic browser Web Speech fallback.
4. **Powers `[🎙️ Ask Astra — बोलून हिशोब पहा]` on the 60 FPS AG Grid (`/ledger`):** Includes voice & 1-click judge chips for item-level rollups (*"आज जेमिनी तेल आणि साखरेची किती विक्री झाली?"* -> ₹1,664), stuck payment isolation (*"आजचे अडकलेले पेमेंट्स दाखवा"* -> `-₹537 Variance`), and 1-click **Engine 2 (AstraKavach 3-Way Courtroom)** settlement recovery.

---

## ⚡ Quick Start (1-Minute Setup)

```bash
npm install
cp .env.example .env.local
# Add your SARVAM_API_KEY and PAYTM_MID / PAYTM_MERCHANT_KEY in .env.local (works out-of-the-box in Demo Sandbox mode even before keys are pasted!)
npm run dev
```

Open **http://localhost:3000** in your browser.
