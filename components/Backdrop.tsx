import { memo } from "react";

// Authentic Indian Kirana & Farmer Market watercolor background with Paytm QR Stall, Shaniwar Wada & Gateway of India.
export const Backdrop = memo(function Backdrop() {
  return (
    <div
      className="backdrop"
      style={{
        backgroundImage: "url('/kirana-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center bottom",
        backgroundRepeat: "no-repeat",
        opacity: 0.95,
      }}
      aria-hidden="true"
    />
  );
});
