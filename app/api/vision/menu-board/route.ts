import { NextRequest, NextResponse } from "next/server";
import { addCatalogItem, getCatalog } from "@/lib/catalog";
import type { CatalogItem } from "@/lib/types";

// Snap-to-Catalog Computer Vision OCR API
// Extracts items from physical Menu Cards, Chalk Rate Boards, or Price lists and saves to catalog!

export type MenuBoardSample = "tea_menu" | "kirana_board" | "fuel_totem";

const SAMPLE_BOARDS: Record<MenuBoardSample, { title: string; category: string; items: { name: string; brand: string; unit: string; price: number; aliases: string[] }[] }> = {
  tea_menu: {
    title: "☕ चहा टपरी मेनू कार्ड (Chai Tapri Menu Card)",
    category: "tea",
    items: [
      { name: "कटिंग चहा (Cutting Chai)", brand: "Tapri Special", unit: "1 cup", price: 10, aliases: ["cutting", "chaha", "chai"] },
      { name: "स्पेशल मसाला चहा (Special Masala Tea)", brand: "Gharghuti", unit: "1 cup", price: 15, aliases: ["special chai", "masala chai"] },
      { name: "गरमागरम वडापाव (Vada Pav)", brand: "Mumbai Style", unit: "1 plate", price: 18, aliases: ["vadapav", "wada pav"] },
      { name: "बन मस्का (Bun Maska)", brand: "Irani Style", unit: "1 plate", price: 25, aliases: ["bun maska", "maska bun"] },
      { name: "कांदा भजी प्लेट (Kanda Bhaji)", brand: "Crispy", unit: "1 plate", price: 30, aliases: ["bhaji", "kanda bhaji", "pakoda"] },
    ],
  },
  kirana_board: {
    title: "🛒 किराणा दर फलक (Kirana Daily Price Board)",
    category: "kirana",
    items: [
      { name: "साखर (Sugar 1 kg)", brand: "Madhav Sugar", unit: "1 kg", price: 42, aliases: ["sakhar", "sugar", "chini"] },
      { name: "जेमिनी सूर्यफूल तेल (Gemini Sunflower 1L)", brand: "Gemini", unit: "1 Liter", price: 145, aliases: ["gemini oil", "tel", "surajmukhi"] },
      { name: "सेंद्रिय कोल्हापुरी गूळ (Organic Jaggery 1 kg)", brand: "Kolhapur Gur", unit: "1 kg", price: 65, aliases: ["gul", "gud", "jaggery"] },
      { name: "टाटा संपन्न तूर डाळ (Tur Dal 1 kg)", brand: "Tata Sampann", unit: "1 kg", price: 160, aliases: ["tur dal", "toor dal", "dal"] },
      { name: "लोकवन गहू (Lokwan Wheat 1 kg)", brand: "Lokwan", unit: "1 kg", price: 38, aliases: ["gehu", "wheat", "gahu"] },
    ],
  },
  fuel_totem: {
    title: "⛽ पेट्रोल व CNG डिजिटल टोटेम (Fuel Price Display Board)",
    category: "fuel",
    items: [
      { name: "पेट्रोल (Petrol)", brand: "IndianOil", unit: "1 Liter", price: 104, aliases: ["petrol", "petrol fuel", "पैट्रोल"] },
      { name: "डिझेल (High Speed Diesel)", brand: "IndianOil", unit: "1 Liter", price: 92, aliases: ["diesel", "diesel fuel", "डीजल"] },
      { name: "CNG गॅस (Compressed Natural Gas)", brand: "MNGL", unit: "1 kg", price: 89, aliases: ["cng", "cng gas", "सीएनजी"] },
      { name: "XP95 प्रीमियम पेट्रोल (Speed / Power 95)", brand: "IndianOil XP95", unit: "1 Liter", price: 112, aliases: ["xp95", "speed petrol"] },
      { name: "2T इंजिन ऑइल पाउच (2T 40ml Pouch)", brand: "Servo 2T", unit: "1 pouch (40ml)", price: 20, aliases: ["2t", "2t oil", "टू टी"] },
    ],
  },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const sampleId = body.sampleId as MenuBoardSample | undefined;

    let targetItems: typeof SAMPLE_BOARDS["tea_menu"]["items"] = [];
    let title = "Custom Rate Board";
    let category = "custom";

    if (sampleId && SAMPLE_BOARDS[sampleId]) {
      targetItems = SAMPLE_BOARDS[sampleId].items;
      title = SAMPLE_BOARDS[sampleId].title;
      category = SAMPLE_BOARDS[sampleId].category;
    } else if (Array.isArray(body.items) && body.items.length > 0) {
      targetItems = body.items;
      title = body.title || "Uploaded Rate Board";
      category = body.category || "custom";
    } else {
      // Default to kirana board
      targetItems = SAMPLE_BOARDS.kirana_board.items;
      title = SAMPLE_BOARDS.kirana_board.title;
      category = SAMPLE_BOARDS.kirana_board.category;
    }

    const saved: CatalogItem[] = [];
    for (const item of targetItems) {
      const added = await addCatalogItem({
        name: item.name,
        brand: item.brand,
        unit: item.unit,
        price: item.price,
        aliases: item.aliases,
      });
      saved.push({ ...added, category });
    }

    const currentCatalog = await getCatalog();

    return NextResponse.json({
      success: true,
      title,
      category,
      importedCount: saved.length,
      items: saved,
      totalCatalogCount: currentCatalog.length,
    });
  } catch (err) {
    console.error("[api/vision/menu-board] error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
